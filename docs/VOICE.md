# Voice

How reels get narrated: the engines, how one is picked, how to set them up,
and how the words, captions and the mascot's mouth are kept in time with the
audio.

## Engines

| Engine | `REELS_VOICE` | Runs | Cost | Notes |
| --- | --- | --- | --- | --- |
| House voice | `qwen-locked` | Locally, Apple Silicon (MLX) | Free | Kokoro's Heart timbre with Qwen3-TTS phrasing. The default where it's installed. |
| ElevenLabs | `elevenlabs` | ElevenLabs API | Paid per character | Needs `ELEVENLABS_API_KEY`. Whole-beat synthesis with neighbouring lines as context. |
| Kokoro | `kokoro` | Locally on CPU, any machine | Free | Kokoro-82M (open weights, ONNX, q8). The model downloads on first use. |
| macOS `say` | `say` | Locally, macOS | Free | A last resort for quick timing checks. |

**House voice.** Qwen3-TTS Base speaks each line in the voice of a synthetic
reference clip, `voices/anchors/kokoro-heart.wav` (rendered by Kokoro, not a
recording of anyone). Each line's seed comes from its text, and takes are
cached in `.cache/tts/`, so re-voicing an unchanged line reuses the same take.
`voices/lock.py` does the synthesis; `src/tts.mjs` calls it once per episode.

## Selection order

`voiceEpisode()` in `src/tts.mjs` picks the first that applies:

1. `REELS_VOICE`, if set.
2. The episode's own pin, `"voice": { "engine": "…" }` in `episode.json`.
3. The house voice, if `.tts/venv` and its model are installed.
4. ElevenLabs, if `ELEVENLABS_API_KEY` is set (environment or `./.env`).
5. Kokoro.

`npm run doctor` prints the voice a reel would get and the reason.

## Setup

**House voice** (Apple Silicon only, about 3 GB):

```sh
npm run setup -- --voice
```

This installs Python 3.12 with uv into `.tts/python`, creates `.tts/venv` with
`mlx-audio` and `truststore`, and downloads Qwen3-TTS
(`mlx-community/Qwen3-TTS-12Hz-1.7B-Base-6bit`) and Whisper
(`mlx-community/whisper-small.en-asr-8bit`) into `.tts/hf`. It's safe to
re-run. `.tts/` is gitignored.

**ElevenLabs:**

```sh
cp .env.example .env
# then set ELEVENLABS_API_KEY=… in .env
node src/tts.mjs --voices        # list the voices your key can use
```

`ELEVENLABS_VOICE_ID` picks a voice (default: the first stock voice the
account has, from Jessica, Laura, Sarah, …). `ELEVENLABS_MODEL` pins a model
(default: the newest the account can use, v4 then v3 then multilingual v2).
Only these three variables are read from `.env`; never commit it.

**Kokoro:** nothing to set up. The voice id and speed come from the episode's
`voice` (`af_heart` at 1.06 by default).

Changing the voice means re-voicing:

```sh
REELS_VOICE=kokoro npm run reel -- --episode episodes/<id>
```

## Pronunciation

Scripts are written for the eye ("4K", "Cmd+Enter", "TOOLBOX"); captions show
that, and the narrator gets a speakable version.

- **`speak` on a beat** overrides what's said for that beat while the caption
  keeps `vo`: `"vo": "since October 6th"`, `"speak": "since October sixth"`.
  It needs the same number of sentences as `vo`.
- **`LEXICON` in `src/pronounce.mjs`** respells names every voice gets wrong
  (`Vercel` → `Ver-sell`, `Supabase` → `Soopa-base`, `Cmd+Enter` →
  `Command Enter`). Add to it when a read-back shows a miss.
- **`ACRONYMS`** lists all-caps words that are spelled out (`AI`, `API`,
  `GPT`). Any other all-caps word is read as a word, so `TOOLBOX` doesn't come
  out letter by letter.
- The CTA's `speak` in `brand.json` handles the keyword the same way.

## Word timing and alignment

Captions, `s.wordTime()` reveals and lip sync all depend on knowing when each
word is spoken.

1. **Estimates.** `tts.mjs` spreads each beat's words across its audio by
   syllable weight.
2. **Whisper.** When the house voice environment is installed,
   `voices/align.py` transcribes `vo.wav` with local Whisper and matches the
   recognised words to the script, so each word gets the time it was actually
   said. Below a 75% match it keeps the estimates. `REELS_ALIGN=0` skips it.
3. **Pauses.** `src/align.mjs` then finds the real pauses in `vo.wav` with
   ffmpeg's `silencedetect` and re-times words around them, so the word before
   a pause ends where the silence starts. It runs after every voice step and
   is idempotent: `node src/align.mjs episodes/<id> --dry` shows what would
   move.

ElevenLabs returns its own character alignment, so both passes leave its
timings alone.

## Lip-sync lead

The mascot's mouth should move just ahead of the sound. The lead, in
milliseconds, is `leadMs` in `lipsync.json` at the repo root and applies to
every render.

To tune it:

1. `npm run serve` and open the **Lip-sync tuner** (`/viewer/sync.html`).
2. Pick an episode, play it, and move the slider until the mouth and voice
   feel locked.
3. **Save** writes the new `leadMs`. **Re-render this reel** bakes it in.

Other reels pick it up the next time they render. See
[ARCHITECTURE.md](ARCHITECTURE.md#lip-sync) for how mouth shapes are made.
