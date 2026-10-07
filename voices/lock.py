#!/usr/bin/env python3
"""Locked narrator voices: design once, then speak every line in that voice.

Qwen3-TTS VoiceDesign invents a voice from a text description, but it does so
again for every line, so a reel drifts between slightly different speakers.
This pins it:

  anchor   VoiceDesign renders one reference passage per described voice
           → voices/anchors/<name>.wav + anchors.json (description, seed, model)
  speak    Qwen3-TTS Base speaks any lines in an anchor's voice
           (ref_audio = that synthetic anchor) → one WAV per line

Anchors are always synthetic — rendered here from a description. There is no
way to point this at a recording of a real person.

  .tts/venv/bin/python voices/lock.py anchor warm "<description>" [--seed 11]
  echo '["Line one.", "Line two."]' | .tts/venv/bin/python voices/lock.py speak warm --out-dir .tmp/x
"""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import sys
import time
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REELS = HERE.parent
os.environ.setdefault("HF_HOME", str(REELS / ".tts" / "hf"))
try:
    # Trust the macOS keychain (corporate proxies with their own root CA), as synth.py does.
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass
ANCHORS = HERE / "anchors"
DESIGN_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-6bit"
BASE_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-6bit"
RATE = 24000

# Varied on purpose — a question, a list, an exclamation — so the anchor
# carries the voice's rises and lifts, not just one flat sentence.
ANCHOR_TEXT = ("Want the short version? Here's what just shipped for creators today, "
               "why it matters, and the one thing worth trying this week. Let's get into it!")

GEN = {"lang_code": "english", "temperature": 0.7, "top_k": 50, "top_p": 1.0, "repetition_penalty": 1.05}


def load(model_id: str):
    from mlx_audio.tts.utils import load_model
    with contextlib.redirect_stdout(sys.stderr):
        return load_model(model_id)


def run(model, text: str, **kw) -> np.ndarray:
    words = len(text.split())
    gen = {**GEN, **kw, "text": text, "max_tokens": 60 + words * 18}
    chunks = []
    with contextlib.redirect_stdout(sys.stderr):
        for r in model.generate(**gen):
            chunks.append(np.asarray(r.audio, dtype=np.float32).reshape(-1))
    audio = np.concatenate(chunks) if chunks else np.zeros(0, np.float32)
    return np.nan_to_num(audio)


def write_wav(path: Path, audio: np.ndarray, rate: int = RATE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())


def median_f0(audio: np.ndarray, rate: int = RATE) -> float:
    """Median pitch of voiced frames (autocorrelation) — a cheap drift check."""
    hop, win = int(rate * 0.02), int(rate * 0.04)
    lo, hi = int(rate / 400), int(rate / 70)
    rms_all = np.sqrt(np.mean(audio ** 2)) + 1e-9
    f0s = []
    for i in range(0, len(audio) - win, hop):
        fr = audio[i:i + win]
        if np.sqrt(np.mean(fr ** 2)) < rms_all * 0.6:
            continue
        fr = fr - fr.mean()
        ac = np.correlate(fr, fr, "full")[win - 1:]
        if ac[0] <= 0:
            continue
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] / ac[0] > 0.45:
            f0s.append(rate / lag)
    return float(np.median(f0s)) if f0s else 0.0


def seed(mx, value: int | None) -> None:
    if value is not None:
        mx.random.seed(value)
        np.random.seed(value)


def cmd_anchor(args) -> None:
    import mlx.core as mx
    meta_file = ANCHORS / "anchors.json"
    meta = json.loads(meta_file.read_text()) if meta_file.exists() else {}
    model = load(DESIGN_MODEL)
    seed(mx, args.seed)
    audio = run(model, ANCHOR_TEXT, instruct=args.description)
    write_wav(ANCHORS / f"{args.name}.wav", audio)
    meta[args.name] = {"description": args.description, "text": ANCHOR_TEXT, "model": DESIGN_MODEL, "seed": args.seed,
                       "seconds": round(len(audio) / RATE, 2), "f0": round(median_f0(audio), 1),
                       "created": time.strftime("%Y-%m-%d"), "synthetic": True}
    ANCHORS.mkdir(parents=True, exist_ok=True)
    meta_file.write_text(json.dumps(meta, indent=2))
    print(json.dumps({"anchor": args.name, **meta[args.name]}))


def cmd_speak(args) -> None:
    import mlx.core as mx
    meta = json.loads((ANCHORS / "anchors.json").read_text())
    if args.name not in meta or not meta[args.name].get("synthetic"):
        sys.exit(f"no synthetic anchor named {args.name!r}; create one with `lock.py anchor`")
    items = json.loads(sys.stdin.read())
    items = items.get("sentences") if isinstance(items, dict) else items
    # Items are strings or {"text", "seed"?, "id"?}. A per-item seed (src/tts.mjs
    # derives it from the text) keeps a line's take identical across re-renders.
    items = [i if isinstance(i, dict) else {"text": i} for i in items]
    model = load(BASE_MODEL)
    out = Path(args.out_dir)
    files, t0 = [], time.time()
    for i, item in enumerate(items):
        text = item["text"]
        seed(mx, item.get("seed", args.seed + i if args.seed is not None else None))
        audio = run(model, text, ref_audio=str(ANCHORS / f"{args.name}.wav"), ref_text=meta[args.name]["text"],
                    temperature=args.temperature)
        path = out / f"{item.get('id') or f'line_{i + 1:02d}'}.wav"
        write_wav(path, audio)
        files.append({"index": i, "text": text, "file": str(path), "seconds": round(len(audio) / RATE, 2),
                      "f0": round(median_f0(audio), 1)})
    secs = sum(f["seconds"] for f in files)
    print(json.dumps({"voice": args.name, "anchorF0": meta[args.name]["f0"], "model": BASE_MODEL,
                      "rtf": round((time.time() - t0) / max(secs, 0.01), 3), "files": files}))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("anchor")
    a.add_argument("name")
    a.add_argument("description")
    a.add_argument("--seed", type=int, default=11)
    s = sub.add_parser("speak")
    s.add_argument("name")
    s.add_argument("--out-dir", required=True)
    s.add_argument("--seed", type=int, default=21)
    s.add_argument("--temperature", type=float, default=0.9, help="higher = livelier delivery")
    args = ap.parse_args()
    {"anchor": cmd_anchor, "speak": cmd_speak}[args.cmd](args)


if __name__ == "__main__":
    main()
