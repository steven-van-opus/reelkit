#!/usr/bin/env python3
"""Local neural TTS engine for the reels pipeline (mlx-audio on Apple Silicon).

Loads one model once, then speaks a list of sentences into one mono 16-bit WAV
each. Every model mlx-audio can load works; the ones in PROFILES get tuned
defaults (language, sampling, voice checks, speed handling).

  echo '["First line.", "Second line."]' | .tts/venv/bin/python voices/synth.py \\
      --model mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-6bit --voice Aiden \\
      --out-dir .tmp/tts --target-wpm 175

stdin   JSON: a list of strings, a list of {"text", "id"?} objects, or
        {"sentences": [...]}.
stdout  one JSON object: {model, arch, voice, sampleRate, loadSeconds,
        synthSeconds, rtf, naturalWpm, tempo, wpm, peakMemoryGB,
        files: [{index, id, text, file, seconds, ...}], warnings}.
        Model logs and progress bars go to stderr.

--serve keeps the model warm for a long-running caller (src/tts.mjs): it prints
{"ready": true, ...}, then answers each JSON request line on stdin
({"sentences": [...], "voice"?, "outDir"?, "prefix"?, "speed"?, "targetWpm"?,
"instruct"?, "seed"?, "rate"?}) with one JSON line on stdout.

Voices are presets only. Designed voices (VoxCPM2) are described in text,
rendered once by the model itself, and that synthetic clip pins the voice for
every later line. There is deliberately no way to pass your own reference
audio: this engine never clones a real person's voice.
"""
from __future__ import annotations

import argparse
import contextlib
import inspect
import json
import os
import re
import resource
import subprocess
import sys
import time
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent            # reels/voices
REELS = HERE.parent                                # reels
TTS_HOME = REELS / ".tts"

# Keep every download inside reels/.tts and skip the Xet chunk cache, which
# would otherwise keep a second copy of each model on a tight disk.
os.environ.setdefault("HF_HOME", str(TTS_HOME / "hf"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_XET_CHUNK_CACHE_SIZE_BYTES", "0")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")

try:  # Use the macOS trust store, so TLS-inspecting gateways (WARP) work.
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

import numpy as np  # noqa: E402

SAMPLE_RATES = (24000, 44100, 48000)
DEFAULT_OUT = REELS / ".tmp" / "tts"
REFS_DIR = HERE / "refs"

CREATOR_STYLE = (
    "Warm, confident American creator voice. Upbeat and energetic but relaxed, "
    "brisk conversational pace, clear and friendly, never shouting."
)

# Synthetic narrators for models that design a voice from a description
# instead of shipping presets. The anchor line is what the model speaks once
# to pin the voice; every later sentence reuses that clip as its reference.
DESIGNED_VOICES = {
    "warm-female": (
        "A warm, confident American woman in her late twenties, a tech creator. "
        "Bright, friendly mid-range voice, energetic but relaxed, never shouty."
    ),
    "warm-male": (
        "A warm, confident American man in his early thirties, a tech podcaster. "
        "Clear mid-low voice, upbeat and friendly, never shouty."
    ),
}
ANCHOR_LINE = (
    "Hey, welcome back. This week I found three new tools that save you real time, "
    "and one of them is completely free. Let's get into it."
)

ORPHEUS_VOICES = ["tara", "leah", "jess", "leo", "dan", "mia", "zac", "zoe"]

# Tuned defaults per mlx-audio architecture (the package name of the model
# class). native_speed: the model honours `speed` itself; otherwise speed and
# --target-wpm are applied afterwards with ffmpeg's pitch-preserving atempo.
# max_tokens(words) caps runaway generations.
PROFILES = {
    "qwen3_tts": {
        "gen": {"lang_code": "english", "temperature": 0.9, "top_k": 50, "top_p": 1.0,
                "repetition_penalty": 1.05},
        "instruct": CREATOR_STYLE,
        "max_tokens": lambda words: 60 + words * 18,        # 12.5 tokens per second
    },
    "llama": {  # Orpheus
        "gen": {"temperature": 0.6, "top_p": 0.9, "repetition_penalty": 1.1},
        "max_tokens": lambda words: 300 + words * 110,      # ~86 tokens per second
    },
    "voxcpm2": {
        "gen": {"inference_timesteps": 10, "cfg_value": 2.0},
        "designed": True,
        "max_tokens": lambda words: 150 + words * 30,
    },
    "kokoro": {"gen": {"lang_code": "a"}, "native_speed": True},
    "kitten_tts": {"native_speed": True},
    "chatterbox": {"gen": {"exaggeration": 0.6, "cfg_weight": 0.5}},
}


def log(*parts):
    print(*parts, file=sys.stderr, flush=True)


def words_in(text: str) -> int:
    return len(re.findall(r"\S+", text))


# ---------------------------------------------------------------- audio helpers


def trim(samples: np.ndarray, rate: int, thr: float = 0.012, keep_ms: float = 30) -> np.ndarray:
    """Drop near-silent edges, keeping a few ms of air (matches src/tts.mjs)."""
    loud = np.flatnonzero(np.abs(samples) >= thr)
    if loud.size == 0:
        return samples[:0]
    keep = int(rate * keep_ms / 1000)
    return samples[max(0, loud[0] - keep): min(samples.size, loud[-1] + keep + 1)]


def ffmpeg_process(samples: np.ndarray, rate: int, out_rate: int, tempo: float) -> np.ndarray:
    """Pitch-preserving tempo change and resampling in one ffmpeg pass."""
    filters = []
    if abs(tempo - 1) > 0.005:
        filters.append(f"atempo={tempo:.4f}")
    if out_rate != rate:
        filters.append(f"aresample={out_rate}:filter_size=64:phase_shift=10:cutoff=0.97")
    if not filters or samples.size == 0:
        return samples
    proc = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(rate), "-ac", "1", "-i", "pipe:0",
         "-af", ",".join(filters), "-f", "f32le", "-ac", "1", "pipe:1"],
        input=samples.astype("<f4").tobytes(), capture_output=True, check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr.decode(errors='replace').strip()}")
    return np.frombuffer(proc.stdout, dtype="<f4").copy()


def write_wav(path: Path, samples: np.ndarray, rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(samples, -1, 1) * 32767).round().astype("<i2")
    tmp = path.with_suffix(".part")
    with wave.open(str(tmp), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())
    tmp.replace(path)


def peak_rss_gb() -> float:
    # ru_maxrss is bytes on macOS, kilobytes on Linux.
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return rss / (1e9 if sys.platform == "darwin" else 1e6)


# ---------------------------------------------------------------- engine


class Engine:
    def __init__(self, model_id: str, extra_gen: dict | None = None):
        import mlx.core as mx
        from mlx_audio.tts.utils import load_model

        self.mx = mx
        self.model_id = model_id
        t0 = time.perf_counter()
        with contextlib.redirect_stdout(sys.stderr):
            self.model = load_model(model_id)
        self.load_seconds = time.perf_counter() - t0
        self.arch = type(self.model).__module__.split(".")[3]
        self.profile = PROFILES.get(self.arch, {})
        self.rate = int(self.model.sample_rate)
        self.extra_gen = extra_gen or {}
        params = inspect.signature(self.model.generate).parameters
        self._accepts = None if any(p.kind == p.VAR_KEYWORD for p in params.values()) else set(params)

    # ---- voices

    def voices(self) -> list[str]:
        if self.profile.get("designed"):
            return sorted(DESIGNED_VOICES)
        if hasattr(self.model, "get_supported_speakers"):
            return list(self.model.get_supported_speakers() or [])
        if "orpheus" in self.model_id.lower():
            return ORPHEUS_VOICES
        return []

    def check_voice(self, voice: str | None) -> None:
        known = self.voices()
        if known and (voice or "").lower() not in {v.lower() for v in known}:
            raise ValueError(f"Unknown voice {voice!r} for {self.model_id}. Presets: {', '.join(known)}")

    def designed_ref(self, voice: str, seed: int) -> Path:
        """Render a designed voice's anchor clip once; later lines reuse it."""
        ref = REFS_DIR / f"{self.arch}-{voice}.wav"
        if ref.exists():
            return ref
        log(f"designing voice {voice!r} (one-time) -> {ref}")
        self.mx.random.seed(seed)
        audio = self._run(ANCHOR_LINE, {"instruct": DESIGNED_VOICES[voice]}, words_in(ANCHOR_LINE))
        write_wav(ref, trim(audio, self.rate), self.rate)
        return ref

    # ---- generation

    def _run(self, text: str, kwargs: dict, n_words: int) -> np.ndarray:
        gen = {**self.profile.get("gen", {}), **kwargs, **self.extra_gen, "text": text}
        if "max_tokens" in self.profile and "max_tokens" not in self.extra_gen:
            gen["max_tokens"] = self.profile["max_tokens"](n_words)
        if self._accepts is not None:
            gen = {k: v for k, v in gen.items() if k in self._accepts}
        chunks = []
        with contextlib.redirect_stdout(sys.stderr):
            for result in self.model.generate(**gen):
                chunks.append(np.asarray(result.audio, dtype=np.float32).reshape(-1))
        audio = np.concatenate(chunks) if chunks else np.zeros(0, np.float32)
        return np.nan_to_num(audio, nan=0.0, posinf=0.0, neginf=0.0)

    def synthesize(self, items: list[dict], *, voice: str | None, out_dir: Path, prefix: str = "line",
                   speed: float = 1.0, target_wpm: float | None = None, instruct: str | None = None,
                   seed: int | None = None, rate: int = 24000, retries: int = 2) -> dict:
        mx = self.mx
        self.check_voice(voice)
        if rate not in SAMPLE_RATES and rate != 0:
            raise ValueError(f"rate must be one of {SAMPLE_RATES} or 0 for native")
        out_rate = rate or self.rate
        native_speed = bool(self.profile.get("native_speed"))

        base = {}
        if self.profile.get("designed"):
            base["ref_audio"] = str(self.designed_ref(voice, seed if seed is not None else 7))
        elif voice:
            base["voice"] = voice
        style = instruct if instruct is not None else self.profile.get("instruct")
        if style and not self.profile.get("designed"):
            base["instruct"] = style
        if native_speed:
            base["speed"] = speed

        mx.reset_peak_memory()
        warnings, raw, synth_total = [], [], 0.0
        for i, item in enumerate(items):
            text = item["text"].strip()
            n = max(1, words_in(text))
            audio, attempts, spent = None, 0, 0.0
            for attempts in range(1, retries + 2):
                if seed is not None:
                    mx.random.seed(seed + (attempts - 1) * 1009)
                t0 = time.perf_counter()
                audio = trim(self._run(text, dict(base), n), self.rate)
                spent += time.perf_counter() - t0
                secs = audio.size / self.rate
                wps = n / secs if secs else 0
                # Runaway loops, truncations and silent takes fall outside this band.
                if secs >= 0.3 and 0.9 <= wps <= 6.5:
                    break
                warnings.append(f"line {i}: implausible take ({secs:.2f}s for {n} words), attempt {attempts}")
            synth_total += spent
            raw.append({"index": i, "id": item.get("id"), "text": text, "audio": audio,
                        "words": n, "attempts": attempts, "synthSeconds": round(spent, 3)})
            log(f"  line {i + 1}/{len(items)}: {audio.size / self.rate:.2f}s audio in {spent:.2f}s")

        speech = sum(r["audio"].size for r in raw) / self.rate
        total_words = sum(r["words"] for r in raw)
        natural_wpm = total_words / speech * 60 if speech else 0
        # Post-synthesis tempo. A native-speed model already applied `speed`;
        # --target-wpm measures the batch as spoken and stretches it uniformly.
        tempo = 1.0 if native_speed else speed
        if target_wpm and natural_wpm:
            tempo = min(1.3, max(0.8, target_wpm / natural_wpm))

        files, final_secs = [], 0.0
        for r in raw:
            audio = ffmpeg_process(r["audio"], self.rate, out_rate, tempo)
            name = r["id"] or f"{prefix}_{r['index']:02d}"
            path = (out_dir / f"{name}.wav").resolve()
            write_wav(path, audio, out_rate)
            secs = audio.size / out_rate
            final_secs += secs
            files.append({"index": r["index"], "id": r["id"], "text": r["text"], "file": str(path),
                          "seconds": round(secs, 3), "rawSeconds": round(r["audio"].size / self.rate, 3),
                          "synthSeconds": r["synthSeconds"], "attempts": r["attempts"]})

        return {
            "model": self.model_id, "arch": self.arch, "voice": voice,
            "sampleRate": out_rate, "modelSampleRate": self.rate,
            "loadSeconds": round(self.load_seconds, 2), "synthSeconds": round(synth_total, 2),
            "speechSeconds": round(speech, 3), "audioSeconds": round(final_secs, 3),
            "rtf": round(synth_total / speech, 3) if speech else None,
            "naturalWpm": round(natural_wpm, 1), "tempo": round(tempo, 4),
            "wpm": round(total_words / final_secs * 60, 1) if final_secs else None,
            "peakMemoryGB": round(mx.get_peak_memory() / 1e9, 2), "peakRssGB": round(peak_rss_gb(), 2),
            "instruct": base.get("instruct"), "seed": seed, "files": files, "warnings": warnings,
        }


# ---------------------------------------------------------------- cli


def parse_items(payload) -> list[dict]:
    if isinstance(payload, dict):
        payload = payload.get("sentences", [])
    if not isinstance(payload, list) or not payload:
        raise ValueError("expected a non-empty JSON list of sentences")
    items = []
    for x in payload:
        item = {"text": x} if isinstance(x, str) else dict(x)
        if not str(item.get("text", "")).strip():
            raise ValueError("every sentence needs non-empty text")
        if item.get("id") is not None:
            item["id"] = re.sub(r"[^A-Za-z0-9._-]", "_", str(item["id"]))
        items.append(item)
    return items


def parse_gen(pairs: list[str]) -> dict:
    out = {}
    for pair in pairs or []:
        key, _, value = pair.partition("=")
        try:
            out[key] = json.loads(value)
        except json.JSONDecodeError:
            out[key] = value
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--model", required=True, help="Hugging Face repo id or local path")
    ap.add_argument("--voice", help="preset voice (or designed voice for VoxCPM2)")
    ap.add_argument("--speed", type=float, default=1.0, help="speed multiplier (native, or atempo after)")
    ap.add_argument("--target-wpm", type=float, help="stretch the whole batch uniformly to this pace")
    ap.add_argument("--instruct", help="style instruction (Qwen3-TTS); '' disables the default")
    ap.add_argument("--rate", type=int, default=24000, help="output rate: 24000, 44100, 48000, 0 = native")
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT))
    ap.add_argument("--prefix", default="line", help="file name prefix when items have no id")
    ap.add_argument("--seed", type=int, help="seed for reproducible takes")
    ap.add_argument("--retries", type=int, default=2, help="re-takes for implausible lines")
    ap.add_argument("--gen", action="append", metavar="KEY=VALUE", help="extra model.generate() kwarg")
    ap.add_argument("--list-voices", action="store_true")
    ap.add_argument("--serve", action="store_true", help="JSON-lines server with a warm model")
    args = ap.parse_args()

    real_stdout = sys.stdout

    def emit(obj):
        real_stdout.write(json.dumps(obj) + "\n")
        real_stdout.flush()

    try:
        engine = Engine(args.model, parse_gen(args.gen))
    except Exception as e:  # noqa: BLE001
        emit({"error": f"load failed: {e}"})
        return 2

    if args.list_voices:
        emit({"model": args.model, "arch": engine.arch, "voices": engine.voices()})
        return 0

    defaults = dict(voice=args.voice, out_dir=args.out_dir, prefix=args.prefix, speed=args.speed,
                    target_wpm=args.target_wpm, instruct=args.instruct, seed=args.seed,
                    rate=args.rate, retries=args.retries)
    keymap = {"outDir": "out_dir", "targetWpm": "target_wpm"}

    def run(payload) -> dict:
        opts = dict(defaults)
        if isinstance(payload, dict):
            for k, v in payload.items():
                k = keymap.get(k, k)
                if k in opts:
                    opts[k] = v
        opts["out_dir"] = Path(opts["out_dir"])
        return engine.synthesize(parse_items(payload), **opts)

    if args.serve:
        emit({"ready": True, "model": args.model, "arch": engine.arch, "sampleRate": engine.rate,
              "loadSeconds": round(engine.load_seconds, 2), "voices": engine.voices()})
        for line in sys.stdin:
            if not line.strip():
                continue
            try:
                emit(run(json.loads(line)))
            except Exception as e:  # noqa: BLE001
                emit({"error": str(e)})
        return 0

    try:
        emit(run(json.loads(sys.stdin.read())))
    except Exception as e:  # noqa: BLE001
        emit({"error": str(e)})
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
