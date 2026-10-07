#!/usr/bin/env python3
"""Voice bake-off: the same four lines through every candidate x voice.

  .tts/venv/bin/python voices/bakeoff.py run orpheus      # one candidate, all its voices
  .tts/venv/bin/python voices/bakeoff.py kokoro           # baseline via kokoro-js
  .tts/venv/bin/python voices/bakeoff.py mp3              # rebuild joined MP3s from line WAVs
  .tts/venv/bin/python voices/bakeoff.py qa               # Whisper read-back (intelligibility)
  .tts/venv/bin/python voices/bakeoff.py index            # write voices/index.json

Per take it writes voices/samples/<model>__<voice>/line_0N.wav + run.json, and a
joined listening sample voices/samples/<model>__<voice>.mp3 (0.25 s gaps,
two-pass loudnorm to -16 LUFS, 160 kb/s) so takes compare at equal loudness.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import time
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REELS = HERE.parent
SAMPLES = HERE / "samples"
PY = REELS / ".tts" / "venv" / "bin" / "python"
HUB = REELS / ".tts" / "hf" / "hub"

LINES = [
    "Google's Nano Banana 2.1 is out, and it's much better at putting text in images.",
    "It follows prompts better, and it keeps characters consistent across edits, at the same speed.",
    "On Higgsfield, it takes up to fourteen reference images and outputs up to 4K.",
    "Want daily updates on the latest tools, news, and resources? Comment TOOLBOX.",
]
TARGET_WPM = 175
SEED = 42
GAP = 0.25

CANDIDATES = {
    "kokoro-82m": {
        "model": "onnx-community/Kokoro-82M-v1.0-ONNX (kokoro-js, q8)",
        "repos": [],
        "license": "Apache-2.0",
        "voices": {"af_heart": "Kokoro 82M · Heart (baseline, female)",
                   "am_michael": "Kokoro 82M · Michael (baseline, male)"},
        "notes": "Current engine in src/tts.mjs. Native speed knob, no style control.",
    },
    "orpheus-3b-4bit": {
        "model": "mlx-community/orpheus-3b-0.1-ft-4bit",
        "repos": ["mlx-community/orpheus-3b-0.1-ft-4bit", "mlx-community/snac_24khz"],
        "license": "Llama 3.2 Community License (commercial OK under 700M MAU; credit \"Built with Llama\"); SNAC codec MIT",
        "voices": {"tara": "Orpheus 3B · Tara (warm female)", "leah": "Orpheus 3B · Leah (bright female)",
                   "leo": "Orpheus 3B · Leo (warm male)", "dan": "Orpheus 3B · Dan (casual male)"},
        "notes": "Native US English presets; supports inline <laugh>/<sigh>/<chuckle> tags (unused here).",
    },
    "qwen3-tts-1.7b-6bit": {
        "model": "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-6bit",
        "repos": ["mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-6bit"],
        "license": "Apache-2.0",
        "voices": {"Aiden": "Qwen3-TTS 1.7B · Aiden (sunny male)", "Ryan": "Qwen3-TTS 1.7B · Ryan (energetic male)",
                   "Serena": "Qwen3-TTS 1.7B · Serena (warm female)", "Vivian": "Qwen3-TTS 1.7B · Vivian (bright female)"},
        "notes": "Style set per line with a natural-language instruct (creator voice, brisk). "
                 "Aiden and Ryan are English-native; Serena and Vivian are Chinese-native presets.",
    },
    "voxcpm2-8bit": {
        "model": "mlx-community/VoxCPM2-8bit",
        "repos": ["mlx-community/VoxCPM2-8bit"],
        "license": "Apache-2.0",
        "voices": {"warm-female": "VoxCPM2 · Designed voice (warm female)",
                   "warm-male": "VoxCPM2 · Designed voice (warm male)"},
        "notes": "No presets: a synthetic voice designed from a text description, rendered once "
                 "(voices/refs/) and reused as the reference for every line. 48 kHz output.",
    },
}


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def take_dir(slug, voice):
    return SAMPLES / f"{slug}__{voice.lower()}"


def repo_gb(repo):
    # huggingface_hub 1.x keeps blobs in a shared hub/blobs store, so follow
    # the snapshot symlinks to size one repo.
    d = HUB / f"models--{repo.replace('/', '--')}" / "snapshots"
    if not d.exists():
        return 0.0
    out = subprocess.run(["du", "-skL", str(d)], capture_output=True, text=True).stdout.split()
    return int(out[0]) * 1024 / 1e9 if out else 0.0


def read_wav(path):
    with wave.open(str(path)) as w:
        rate, n = w.getframerate(), w.getnframes()
        data = np.frombuffer(w.readframes(n), dtype="<i2").astype(np.float32) / 32768
    return rate, data


def ffmpeg(*args, capture=False):
    proc = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", *args], capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[-2000:])
    return proc.stderr


def loudnorm_stats(path, extra=""):
    err = ffmpeg("-i", str(path), "-af", f"loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json{extra}", "-f", "null", "-")
    return json.loads(err[err.rindex("{"): err.rindex("}") + 1])


def join_and_encode(wavs, mp3):
    """Concatenate lines with GAP s of silence, loudnorm to -16 LUFS, encode MP3."""
    parts, rate = [], None
    for w in wavs:
        r, data = read_wav(w)
        rate = rate or r
        if r != rate:
            raise ValueError("mixed sample rates in one take")
        parts += [data, np.zeros(int(GAP * rate), np.float32)]
    head, tail = np.zeros(int(0.15 * rate), np.float32), np.zeros(int(0.4 * rate), np.float32)
    joined = np.concatenate([head, *parts[:-1], tail])
    tmp = mp3.with_suffix(".joined.wav")
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(rate)
        w.writeframes((np.clip(joined, -1, 1) * 32767).round().astype("<i2").tobytes())
    # Static gain to -16 LUFS plus a fast peak limiter (-1.5 dBFS) for the few
    # transients the gain pushes over; a second pass trims the limiter's loss.
    # loudnorm's own linear mode falls back to dynamic, which landed ±1 LU off.
    source = float(loudnorm_stats(tmp)["input_i"])
    gain = -16 - source
    for _ in range(3):
        ffmpeg("-i", str(tmp), "-af", f"aresample=48000,volume={gain:.2f}dB,alimiter=limit=0.84:attack=1:release=40:level=false",
               "-ar", "48000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "160k", str(mp3))
        out = float(loudnorm_stats(mp3)["input_i"])
        if abs(out + 16) <= 0.1:
            break
        gain += -16 - out
    tmp.unlink()
    return {"seconds": round(joined.size / rate, 2), "lufs": out, "inputLufs": source}


def time_l(stderr):
    """Parse macOS `/usr/bin/time -l` output."""
    def grab(label):
        m = re.search(rf"(\d+)\s+{label}", stderr)
        return round(int(m.group(1)) / 1e9, 2) if m else None
    return {"maxRssGB": grab("maximum resident set size"), "peakFootprintGB": grab("peak memory footprint")}


def run_candidate(slug, voices=None):
    cand = CANDIDATES[slug]
    for voice in voices or cand["voices"]:
        d = take_dir(slug, voice)
        if d.exists():
            shutil.rmtree(d)
        cmd = ["/usr/bin/time", "-l", str(PY), str(HERE / "synth.py"), "--model", cand["model"], "--voice", voice,
               "--out-dir", str(d), "--rate", "0", "--seed", str(SEED), "--target-wpm", str(TARGET_WPM)]
        log(f"== {slug} / {voice}")
        load_before = os.getloadavg()[0]
        t0 = time.perf_counter()
        proc = subprocess.run(cmd, input=json.dumps(LINES), capture_output=True, text=True)
        wall = time.perf_counter() - t0
        lines = [l for l in proc.stdout.splitlines() if l.startswith("{")]
        result = json.loads(lines[-1]) if lines else {"error": f"no output (exit {proc.returncode})"}
        if "error" in result:
            log(proc.stderr[-3000:])
            raise SystemExit(f"{slug}/{voice} failed: {result['error']}")
        result.update(time_l(proc.stderr), wallSeconds=round(wall, 1),
                      loadAvg=[round(load_before, 1), round(os.getloadavg()[0], 1)],
                      diskGB=round(sum(repo_gb(r) for r in cand["repos"]), 2))
        result["mp3"] = join_and_encode([f["file"] for f in result["files"]], SAMPLES / f"{slug}__{voice.lower()}.mp3")
        (d / "run.json").write_text(json.dumps(result, indent=2))
        log(f"   rtf {result['rtf']}  natural {result['naturalWpm']} wpm -> tempo {result['tempo']}  "
            f"peak {result['peakMemoryGB']} GB (rss {result['maxRssGB']})  {result['warnings'] or ''}")


def run_kokoro():
    for voice in CANDIDATES["kokoro-82m"]["voices"]:
        d = take_dir("kokoro-82m", voice)
        if d.exists():
            shutil.rmtree(d)
        cmd = ["/usr/bin/time", "-l", "node", str(HERE / "kokoro_baseline.mjs"), voice, str(d), str(TARGET_WPM)]
        log(f"== kokoro-82m / {voice}")
        proc = subprocess.run(cmd, input=json.dumps(LINES), capture_output=True, text=True, cwd=REELS)
        lines = [l for l in proc.stdout.splitlines() if l.startswith("{")]
        if proc.returncode or not lines:
            log(proc.stderr[-3000:])
            raise SystemExit(f"kokoro {voice} failed")
        result = json.loads(lines[-1])
        result.update(time_l(proc.stderr), diskGB=0.09)
        result["mp3"] = join_and_encode([f["file"] for f in result["files"]], SAMPLES / f"kokoro-82m__{voice}.mp3")
        (d / "run.json").write_text(json.dumps(result, indent=2))
        log(f"   rtf {result['rtf']}  speed {result['speed']}  wpm {result['wpm']}")


# ---------------------------------------------------------------- read-back QA

NUM = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six",
       "7": "seven", "8": "eight", "9": "nine", "14": "fourteen"}


def norm(text):
    t = text.lower().replace("’", "'")
    t = re.sub(r"(\d+)\.(\d+)", lambda m: f"{m.group(1)} point {m.group(2)}", t)
    t = re.sub(r"\b(\d+)k\b", r"\1 k", t)
    t = re.sub(r"\b\d+\b", lambda m: NUM.get(m.group(0), m.group(0)), t)
    t = re.sub(r"higgs ?field", "higgsfield", t)
    t = re.sub(r"tool ?box", "toolbox", t)
    return re.sub(r"[^a-z0-9' ]+", " ", t).split()


def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev, d[j] = d[j], cur
    return d[len(h)] / max(1, len(r))


def run_qa(asr="mlx-community/whisper-small.en-asr-8bit"):
    sys.path.insert(0, str(HERE))
    import synth  # noqa: F401  (sets HF_HOME and the trust store before the hub loads)
    from mlx_audio.stt import load

    model = load(asr)
    for run_json in sorted(SAMPLES.glob("*/run.json")):
        res = json.loads(run_json.read_text())
        errs, words = 0.0, 0
        for f in res["files"]:
            # mlx-audio's Whisper keeps decoding the padded 30 s window and
            # invents text there, so keep only segments that start in the audio.
            dur = f["seconds"]
            out = model.generate(f["file"], language="en", temperature=0.0, condition_on_previous_text=False)
            f["heard"] = " ".join(s["text"].strip() for s in out.segments if s["start"] < dur - 0.2).strip()
            n = len(norm(f["text"]))
            f["wer"] = round(wer(f["text"], f["heard"]), 3)
            errs += f["wer"] * n
            words += n
        res["wer"] = round(errs / words, 3)
        res["asr"] = asr
        run_json.write_text(json.dumps(res, indent=2))
        log(f"{run_json.parent.name:40s} WER {res['wer']:.3f}")


# ---------------------------------------------------------------- index


def write_index():
    entries = []
    for slug, cand in CANDIDATES.items():
        for voice, label in cand["voices"].items():
            run_json = take_dir(slug, voice) / "run.json"
            if not run_json.exists():
                continue
            r = json.loads(run_json.read_text())
            notes = [cand["notes"]]
            if r.get("warnings"):
                notes.append("Re-takes: " + "; ".join(r["warnings"]))
            bad = [f"line {f['index'] + 1} heard as \"{f['heard']}\"" for f in r["files"] if f.get("wer", 0) > 0.15]
            if bad:
                notes.append("Read-back mismatches: " + "; ".join(bad))
            entries.append({
                "id": f"{slug}__{voice.lower()}",
                "model": cand["model"],
                "voice": voice,
                "label": label,
                "file": f"samples/{slug}__{voice.lower()}.mp3",
                "seconds": r["mp3"]["seconds"],
                "rtf": r["rtf"],
                "license": cand["license"],
                "notes": " ".join(notes),
                "wpm": r.get("wpm"),
                "naturalWpm": r.get("naturalWpm"),
                "tempo": r.get("tempo", r.get("speed")),
                "wer": r.get("wer"),
                "lufs": r["mp3"]["lufs"],
                "peakMemoryGB": r.get("peakMemoryGB"),
                "peakFootprintGB": r.get("peakFootprintGB"),
                "loadSeconds": r.get("loadSeconds"),
                "diskGB": r.get("diskGB"),
                "sampleRate": r.get("sampleRate"),
                "lines": [{"file": os.path.relpath(f["file"], HERE), "seconds": f["seconds"],
                           "heard": f.get("heard")} for f in r["files"]],
            })
    (HERE / "index.json").write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n")
    log(f"wrote {len(entries)} entries to {HERE / 'index.json'}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "index"
    if cmd == "run":
        run_candidate(sys.argv[2], sys.argv[3].split(",") if len(sys.argv) > 3 else None)
    elif cmd == "kokoro":
        run_kokoro()
    elif cmd == "mp3":  # rebuild the joined MP3s from the line WAVs already on disk
        for run_json in sorted(SAMPLES.glob("*/run.json")):
            r = json.loads(run_json.read_text())
            r["mp3"] = join_and_encode([f["file"] for f in r["files"]], SAMPLES / f"{run_json.parent.name}.mp3")
            run_json.write_text(json.dumps(r, indent=2))
            log(run_json.parent.name, r["mp3"])
    elif cmd == "qa":
        run_qa(*sys.argv[2:3])
    elif cmd == "index":
        write_index()
    else:
        raise SystemExit(__doc__)
