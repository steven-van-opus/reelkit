#!/usr/bin/env python3
"""Word timings for a voiceover whose words we already know.

Whisper (mlx-audio, local) transcribes the WAV with per-word timestamps; the
recognised words are then matched to the script's words with an edit-distance
alignment, so every script word gets the time it was actually spoken. Words
Whisper missed are interpolated between their matched neighbours, and anything
Whisper invents (it hallucinates over silence) is simply never matched.

  echo '{"wav": "episodes/x/vo.wav", "words": ["Comment", "TOOLBOX", ...],
         "spans": [[0.35, 4.1], ...]}' | .tts/venv/bin/python voices/align.py
  → {"words": [{"text", "start", "end", "matched"}...], "matchRate": 0.97}

`spans` (optional) are the speech windows (voStart..voEnd per beat); words
recognised outside every span are ignored.
"""
from __future__ import annotations

import contextlib
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ.setdefault("HF_HOME", str(HERE.parent / ".tts" / "hf"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")
try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:
    pass

ASR_MODEL = "mlx-community/whisper-small.en-asr-8bit"
NUMBERS = {"zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7",
           "eight": "8", "nine": "9", "ten": "10", "eleven": "11", "twelve": "12", "fourteen": "14", "twenty": "20"}


def norm(w: str) -> str:
    w = w.lower().replace("’", "'")
    w = re.sub(r"[^a-z0-9']+", "", w)
    w = re.sub(r"'s$", "", w)
    return NUMBERS.get(w, w)


def similar(a: str, b: str) -> bool:
    if not a or not b:
        return False
    if a == b or a.startswith(b) or b.startswith(a):
        return True
    # Cheap fuzzy match for near-misses ("toolbar" vs "toolbox").
    common = sum(1 for x, y in zip(a, b) if x == y)
    return common >= max(3, int(0.7 * max(len(a), len(b))))


def align(script: list[str], heard: list[dict]) -> list[dict]:
    """Needleman–Wunsch over normalised words; returns script words with times."""
    s = [norm(w) for w in script]
    h = [norm(w["word"]) for w in heard]
    n, m = len(s), len(h)
    gap, mismatch = 1.0, 1.6
    cost = [[0.0] * (m + 1) for _ in range(n + 1)]
    back = [[None] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        cost[i][0], back[i][0] = i * gap, "up"
    for j in range(1, m + 1):
        cost[0][j], back[0][j] = j * gap * 0.5, "left"   # extra heard words are cheap (hallucinations)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            diag = cost[i - 1][j - 1] + (0.0 if similar(s[i - 1], h[j - 1]) else mismatch)
            up = cost[i - 1][j] + gap
            left = cost[i][j - 1] + gap * 0.5
            cost[i][j], back[i][j] = min((diag, "diag"), (up, "up"), (left, "left"))
    out: list[dict | None] = [None] * n
    i, j = n, m
    while i > 0 and j > 0:
        step = back[i][j]
        if step == "diag":
            if similar(s[i - 1], h[j - 1]):
                out[i - 1] = {"start": heard[j - 1]["start"], "end": heard[j - 1]["end"]}
            i, j = i - 1, j - 1
        elif step == "up":
            i -= 1
        else:
            j -= 1
    # Interpolate unmatched words between matched neighbours.
    result = []
    for k, word in enumerate(script):
        if out[k]:
            result.append({"text": word, **out[k], "matched": True})
            continue
        prev_end = next((out[p]["end"] for p in range(k - 1, -1, -1) if out[p]), None)
        next_start = next((out[q]["start"] for q in range(k + 1, n) if out[q]), None)
        result.append({"text": word, "start": prev_end, "end": next_start, "matched": False})
    # Fill gaps evenly across runs of unmatched words.
    k = 0
    while k < n:
        if result[k]["matched"]:
            k += 1
            continue
        run = k
        while run < n and not result[run]["matched"]:
            run += 1
        a = result[k - 1]["end"] if k > 0 else (result[run]["start"] - 0.3 * (run - k) if run < n else 0.0)
        b = result[run]["start"] if run < n else a + 0.3 * (run - k)
        a = a if a is not None else 0.0
        b = b if b is not None else a + 0.3 * (run - k)
        step = (b - a) / max(1, run - k)
        for q in range(k, run):
            result[q]["start"], result[q]["end"] = a + step * (q - k), a + step * (q - k + 1)
        k = run
    return result


def main() -> None:
    req = json.loads(sys.stdin.read())
    from mlx_audio.stt import load
    with contextlib.redirect_stdout(sys.stderr):
        model = load(ASR_MODEL)
        res = model.generate(req["wav"], word_timestamps=True)
    heard = []
    for seg in getattr(res, "segments", None) or []:
        for w in seg.get("words", []) if isinstance(seg, dict) else getattr(seg, "words", []) or []:
            word = w.get("word") if isinstance(w, dict) else getattr(w, "word", "")
            start = w.get("start") if isinstance(w, dict) else getattr(w, "start", None)
            end = w.get("end") if isinstance(w, dict) else getattr(w, "end", None)
            if start is None or end is None:
                continue
            heard.append({"word": word.strip(), "start": float(start), "end": float(end)})
    spans = req.get("spans")
    if spans:
        heard = [w for w in heard if any(a - 0.15 <= (w["start"] + w["end"]) / 2 <= b + 0.15 for a, b in spans)]
    words = align(req["words"], heard)
    rate = sum(1 for w in words if w["matched"]) / max(1, len(words))
    print(json.dumps({"words": words, "matchRate": round(rate, 3), "heard": len(heard)}))


if __name__ == "__main__":
    main()
