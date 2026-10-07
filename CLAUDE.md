# reelkit

reelkit makes narrated 9:16 reels (1080×1920, 30 fps, 20–32 s) from a link or
a catalog news story. Claude writes the script; everything else is local code:
source media collection, TTS, a generated soundtrack, and canvas frames piped
into ffmpeg. To make a reel, use the `make-reel` skill. To add a scene type,
use `new-scene`.

## Pipeline

`src/run.mjs` chains the steps; `--from <step>` resumes at any of them.

```
pick → seed → media → write → validate → voice → mix → render → stills → cover → caption
```

| Step | Module | Writes |
| --- | --- | --- |
| pick | `src/pick-news.mjs` (`--auto`, `--news`) or `src/new.mjs` (`--url`) | a candidate |
| seed | `seedEpisode()` in `src/write-script.mjs` | `episodes/<date>-<slug>/episode.json` |
| media | `src/media.mjs` | `media/`, `media.json`, `media/contact.jpg` |
| write | `src/write-script.mjs` (`claude -p`) | the full `episode.json` |
| validate | `src/validate.mjs` | errors and warnings |
| voice | `src/tts.mjs`, then `src/align.mjs` | `vo.wav`, `voice.json` |
| mix | `src/audio.mjs` | `mix.wav` |
| render | `src/render.mjs` + `src/scenes/` | `reel.mp4` |
| stills, cover, caption | `render.mjs --stills`, `src/thumbnail.mjs`, `run.mjs` | `stills.png`, `cover.png`, `caption.txt` |

## Where things live

- `src/scenes/SCENES.md`: the script contract. Beat fields, the scene catalog
  and every prop limit. `validate.mjs` parses its table.
- `src/scenes/<type>.mjs`: one scene per file, auto-registered by
  `src/scenes/index.mjs`. Scenes with two looks wrap `paper/<type>.mjs` and
  `studio/<type>.mjs`.
- `src/write-script.mjs`: the writer's style guide and prompt.
- `src/catalog.mjs`: the only module that knows where products come from
  (`catalog/tools.json`, `REELKIT_SITE`, `catalog/local.json`).
- `src/brandpack.mjs`: the only module that knows where brand config comes
  from (`brands/<name>/brand.json`, `REELKIT_BRAND`).
- `src/cta.mjs`: applies the brand pack's house CTA to every episode.
- `src/brand.mjs`: palette, fonts, frame size, safe areas, layout bands, theme.
- `src/pronounce.mjs`: what the narrator says for words TTS misreads.
- `voices/`: Python tools for the house voice and Whisper alignment.
- `docs/ARCHITECTURE.md`, `docs/VOICE.md`, `brands/README.md`: the details.

## Rules

- **Pure code rendering.** Frames are drawn on `@napi-rs/canvas` and piped to
  ffmpeg. No Remotion, no video framework, no AI video or image models, no
  stock footage.
- **Deterministic.** No `Math.random`, `Date.now` or wall-clock reads in
  anything that draws a frame. Use `rng()` / `noise1()` from `src/util.mjs`.
  The same episode renders the same pixels every time.
- **Real source media only.** Scenes show media collected from the sources into
  `media/` and referenced by id from `media.json`. Never invent a media id or a
  media URL, and never bypass a provider's embedding restrictions. If no media
  backs a line, use a drawn scene or change the line.
- **Every claim is sourced.** Each fact in the voiceover, labels, props and
  caption has an entry in `sources[]` with the page that states it. Don't add
  a claim you can't point to.
- **One take.** The beats' `vo` (minus the CTA beat) must join back into
  `script` word for word. If you edit a `vo`, edit `script` to match.
- **The house CTA comes from the brand pack.** `src/cta.mjs` appends it from
  `brand.json`; don't write or edit a CTA beat by hand. `"cta": { "house": false }`
  opts one episode out.
- **Never commit secrets or third-party media.** `.env`, `media/`, `reel.mp4`,
  audio and `voice.json` are gitignored. Commit only `episode.json`,
  `media.json`, `stills.png`, `cover.png` and `caption.txt`.
- **Keep the look.** When you change drawing code (scenes, `paper.mjs`,
  `fx.mjs`, `overlay.mjs`, `brand*.mjs`, `mascot.mjs`), render the same frames
  before and after (`npm run render -- episodes/<id> --frame <t> --out …`) and
  compare them. Anything that isn't the point of the change must stay
  identical.
- **Test beds** live in `episodes/_test-*/` (gitignored). Delete scratch
  renders when you're done.
- Match the surrounding code: ESM, 2-space indent, short comments that say
  why. Copy is US English, sentence case, no hype.

## Commands

```sh
npm run doctor                                         # what's installed, which voice/model will be used
npm run setup [-- --voice | -- --check]                # tools + npm install (+ house voice)
npm run reel -- --url <https://…> [--brief "…"] [--date YYYY-MM-DD]
npm run reel -- --news "<title or url substring>" [--brief "…"]
npm run reel -- --auto [--count 1] [--days 3] [--pick-only]
npm run reel -- --episode episodes/<id> [--from <step>] [--no-render | --no-video] [--force]
npm run pick [-- --days 7 --top 20 --json]
npm run write -- --episode episodes/<id> --prompt      # print the writer prompt, no Claude call
npm run validate -- episodes/<id>
npm run render -- episodes/<id> --stills | --frame <seconds> [--cover] [--out file.png]
npm run serve                                          # viewer at http://localhost:4310
npm run catalog:sync -- /path/to/Creators-Toolbox
```
