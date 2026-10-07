# Architecture

How a link becomes a reel: the pipeline, what each module does, the data that
moves between steps, and how frames, lip sync and audio are made.

## Pipeline

```
 --url <link>            --news "<match>"         --auto
   │                         │                      │
 new.mjs                  pick-news.mjs ─────────────┘
   reads the page,          ranks catalog news: launches, GA, new models and
   matches or adds a        features over patch notes, SDK bumps and fixes;
   catalog product          merges one launch logged under several products;
   │                        skips stories an episode already covers
   └──────────┬─────────────┘
              ▼  candidate { primary, items, tools, urls, brief }
 seed ──── episodes/<date>-<slug>/episode.json (id, date, source, subject)
              │
 media ──── media.mjs: the sources' images and video (yt-dlp for embeds,
              │        headless Chrome for client-rendered pages)
              │        → media/mNN.*, media.json, media/contact.jpg
              ▼
 write ──── write-script.mjs: `claude -p` reads the sources (WebFetch) and the
              │        media (Read), writes one spoken take, cuts it into
              │        beats, picks scenes, lists every claim in sources[];
              │        the house CTA is appended; ≤2 retries on validation errors
              ▼
 validate ─ validate.mjs: SCENES.md contract, media ids, the take/beat match
              ▼
 voice ──── tts.mjs → vo.wav + voice.json (word timings)
              │        Whisper alignment (voices/align.py), then align.mjs
              │        pins words to the pauses ffmpeg hears
              ▼
 mix ────── audio.mjs: generated music + SFX, ducked under the voice → mix.wav
              ▼
 render ─── render.mjs: scenes draw each frame on canvas → raw RGBA → ffmpeg
              │        (parallel segment workers) → reel.mp4 with mix.wav
              ▼
 stills ─── render.mjs --stills → stills.png (one frame per beat)
 cover ──── thumbnail.mjs → cover.png + cover-grid.png
 caption ── run.mjs → caption.txt (caption, hashtags, source links)
```

`src/run.mjs` runs the chain and prints each step with its timing.
`--from <step>` resumes an existing episode at any step after seed.

## Module map

### Pipeline

| Module | Role |
| --- | --- |
| `src/run.mjs` | Orchestrator and CLI: inputs, steps, `--from`, GitHub outputs |
| `src/new.mjs` | A URL and optional brief → a candidate; matches or adds a catalog product |
| `src/pick-news.mjs` | Ranks catalog news into candidates; `toolEntry()` lookups |
| `src/media.mjs` | Collects source images and video into `media/`, writes `media.json` and the contact sheet |
| `src/write-script.mjs` | Writer style guide and prompt; seeds episodes; calls `claude -p`; assembles and retries |
| `src/validate.mjs` | Checks an episode against `SCENES.md` and `media.json` |
| `src/tts.mjs` | Voiceover: house voice, ElevenLabs, Kokoro or `say`; word timings; Whisper alignment |
| `src/align.mjs` | Re-times words around the real pauses in `vo.wav` |
| `src/pronounce.mjs` | Display text → speakable text (lexicon, acronyms, numbers) |
| `src/audio.mjs` | Builds and masters `mix.wav`; `src/audio/` holds the music, SFX and DSP |
| `src/render.mjs` | Frame loop, camera, transitions, overlays, ffmpeg encode, stills, single frames |
| `src/thumbnail.mjs` | The cover poster and its 3:4 grid preview |
| `src/serve.mjs` | Local viewer, episode API, lip-sync tuner API |

### Data and brand

| Module | Role |
| --- | --- |
| `src/catalog.mjs` | Products and their news: `catalog/tools.json`, `REELKIT_SITE`, `catalog/local.json` |
| `src/brandpack.mjs` | Loads and checks `brands/<name>/brand.json` (`REELKIT_BRAND`) |
| `src/cta.mjs` | Applies the brand pack's house CTA to every episode it reads |
| `src/brand.mjs` | Palette, fonts, frame size, safe areas, layout bands, theme switch |
| `src/brandmark.mjs` | The pack's mark, lockups and icon on canvas, plus decorative backdrops |
| `src/logos.mjs` | Product logo tiles (approved logo → product logo → favicon), cached in `.cache/logos` |
| `src/shots.mjs` | Product screenshots in one house frame |
| `src/mentions.mjs` | Finds products named in the voiceover for the caption-chip logos |
| `src/mediastore.mjs` | Makes collected media drawable: images and decoded video frames |
| `src/lib/` | Vendored helpers: changelog parsing, news media discovery, the site catalog reader |

### Drawing

| Module | Role |
| --- | --- |
| `src/paper.mjs` | Card-stock primitives: `paper()`, `card()`, `disc()`, `tape()`, text fitting |
| `src/fx.mjs` | Props and effects: confetti, sparkles, stickers, pills, arrows |
| `src/icons.mjs` | Lucide icons on canvas |
| `src/backgrounds.mjs` | Background sets (walls and floors), drawn once and blitted |
| `src/overlay.mjs` | The beat label at the top and the spoken-word caption chips |
| `src/mascot.mjs` | The mascot: poses, faces, mouth shapes |
| `src/lipsync.mjs` | Words → phonemes → mouth shapes per frame |
| `src/util.mjs` | Seeded randomness and other deterministic helpers |

### Scenes

| Path | Role |
| --- | --- |
| `src/scenes/SCENES.md` | The script contract: beat fields, scene catalog, prop limits |
| `src/scenes/index.mjs` | Registers every `src/scenes/<type>.mjs` |
| `src/scenes/<type>.mjs` | One scene each: `hook`, `product`, `stat`, `steps`, `where`, `compare`, `prompt`, `phone`, `cta`, `media`, `gallery`, `beforeafter`, `zoom`, `screenshot` |
| `src/scenes/paper/`, `src/scenes/studio/` | The two looks of scenes that have both, picked by `REELS_THEME` |
| `src/scenes/paper/titles/` | Extra hook title treatments (`REELS_HOOK`, `props.titleStyle`) |
| `src/scenes/_fallback.mjs` | Drawn when a beat names a scene that doesn't exist |

## Data flow

### Candidate

What `pick-news.mjs` and `new.mjs` hand to seed and write:

```js
{
  id, name, score, reasons, date,
  primary: { toolId, toolTitle, title, body, date, url },  // the story
  items: [primary, …],                                     // every news item about it
  tools: [{ id, title, page }],                            // catalog products involved
  urls: [url, …],                                          // source pages
  brief,                                                   // --brief, as producer notes
}
```

### episode.json

The script. Written by Claude, editable by hand, committed. From
`episodes/2026-10-06-figma-agent-ga/episode.json`, trimmed:

```jsonc
{
  "id": "2026-10-06-figma-agent-ga",              // folder name: <date>-<slug>
  "date": "2026-10-06",
  "source": {                                     // where the story came from
    "toolId": "figma",                            // catalog product id
    "newsTitle": "The Figma agent is generally available",
    "url": "https://www.figma.com/release-notes/?title=the-figma-agent-is-generally-available",
    "extraUrls": ["https://help.figma.com/hc/en-us/articles/37998629035799", "…"]
  },
  "subject": { "name": "Figma agent", "maker": "Figma", "accent": "#7C5CFF" },  // accent tints one detail per scene
  "voice": { "id": "af_heart", "speed": 1.06 },  // optional "engine" pins a narrator
  "cta": { "keyword": "TOOLBOX" },                // the house CTA; { "house": false } opts out
  "post": { "caption": "Figma's AI agent just left beta…", "hashtags": ["#figma", "…"] },
  "sources": [                                    // one entry per claim, with the page that states it
    { "claim": "The agent is available on all plans", "url": "https://help.figma.com/hc/en-us/articles/37998629035799" }
  ],
  "script": "Figma's AI agent just left beta, and it's on every plan. Hit Command Enter, …",  // the one spoken take
  "beats": [                                      // the take, cut at breath points
    {
      "label": "Figma's AI agent just left beta", // ≤34 chars, the header on screen
      "vo": "Figma's AI agent just left beta, and it's on every plan.",  // joins back into `script`
      "set": "pearl",                             // background set
      "scene": "hook",                            // a type from SCENES.md
      "props": { "kicker": "Now GA", "title": "The Figma agent", "by": "On every plan", "media": "m14" },
      "mascot": { "pose": "cheer", "face": "wow" }
    },
    {
      "label": "Now it uses AI credits",
      "vo": "but since October 6th it uses AI credits.",
      "speak": "but since October sixth it uses AI credits.",  // what the narrator says, when it differs
      "set": "lavender", "scene": "stat",
      "props": { "value": "Oct 6", "label": "AI credits start counting", "note": "Same budget as Figma Make" },
      "mascot": { "pose": "point", "face": "focus" }
    }
    // … the CTA beat is appended from the brand pack
  ]
}
```

Optional fields: `beat.logos` (product ids for the caption chips, or `false`),
`episode.cover` (`title`, `kicker`, `media` for the cover poster). The full
beat contract and every scene's props are in
[src/scenes/SCENES.md](../src/scenes/SCENES.md).

### media.json

```js
{ items: [{ id: 'm01', file, kind: 'image' | 'video', width, height, duration?, url, page, alt?, caption? }] }
```

Beats refer to items by id. `media/` itself is third-party material and stays
out of git; `media.json` is the record of what each id was and where it came
from.

### voice.json

Written by `tts.mjs`, refined by the alignment passes:

```js
{
  sampleRate: 24000, duration: 30.376,
  voice: { engine: 'qwen-locked', anchor: 'kokoro-heart', … },
  beats: [{ index, start, end, voStart, voEnd, words: [{ text, raw, start, end }] }],
  aligned: { method: 'silencedetect', … },
}
```

Every scene sees its beat's words as `s.words` (times local to the beat) and
can sync to them with `s.wordTime('files')`.

### Frames

`render.mjs` loads the episode, applies the house CTA, reads `voice.json` for
beat timing, preloads logos, screenshots and the media frames the beats use,
then calls each beat's scene `draw(s)` per frame.

## Rendering model

- **Canvas, not a framework.** Each frame is drawn on a 1080×1920
  `@napi-rs/canvas` context: the background set (pre-drawn and blitted), a
  slow camera push-in, the scene, the paper-slide transition, the beat label
  and the caption chips.
- **Raw RGBA into ffmpeg.** Frames are written as raw RGBA to an ffmpeg
  process (`libx264`, CRF 16, `yuv420p`, 30 fps).
- **Parallel segments.** A full render splits the frames across
  `min(8, CPUs − 2)` worker processes (`--workers` overrides). Each encodes its
  own segment into `.segments/`; the segments are concatenated without
  re-encoding and muxed with `mix.wav` (AAC 192k, `+faststart`).
- **Deterministic.** Nothing that draws reads `Math.random`, `Date.now` or the
  clock; randomness comes from `rng(seed)` and `noise1()` in `src/util.mjs`,
  seeded by stable strings. The same episode gives the same pixels, which is
  what makes before/after still comparisons meaningful.
- **Two looks.** `REELS_THEME=paper` (default): grain, torn edges, tape,
  stop-motion on twos (`s.ts`). `REELS_THEME=studio`: the site's flat cards,
  hairline borders and smooth 30 fps motion.
- **Safe areas.** `SAFE` in `src/brand.mjs` keeps content out of the platform
  UI: 150 px at the top, 340 px at the bottom, 70 px on the left and 150 px on
  the right (likes, comments, shares). Scenes draw in y 330–1420 and caption
  chips sit around y 1500. The cover keeps everything that matters in
  y 240–1680 for the profile grid's 3:4 crop.

## Lip sync

`src/lipsync.mjs` gives the mascot a mouth shape for every frame:

1. Words and their times come from `voice.json` (after alignment).
2. Each word becomes phonemes through the CMU pronouncing dictionary, with
   spelling rules for names it doesn't know.
3. Phonemes map to the classic nine-shape mouth set (A–H plus rest), laid
   across the word's time span; one-frame flickers merge away.
4. The voice's loudness per frame gates how wide the open shapes go, so the
   mouth closes on real gaps.
5. The track is shifted so the mouth leads the voice by `leadMs` from
   `lipsync.json`. Set it by ear in the viewer's tuner (`/viewer/sync.html`).

## Audio

`src/audio.mjs` builds `mix.wav` (48 kHz, stereo, 16-bit):

- **Music** (`src/audio/music.mjs`) is synthesised sample by sample, so it's
  royalty-free by construction. Key, tempo and patterns are seeded by the
  episode id; the tempo is nudged so the final chord lands after the last
  word.
- **SFX** (`src/audio/sfx.mjs`) are synthesised too and timed to the picture:
  a swipe on each beat change, a tap when a label lands, a shimmer on the
  hook's confetti, key ticks and a ding on the CTA.
- **Ducking.** The music ducks under the voice like a sidechain.
- **Mastering** (`src/audio/dsp.mjs`): BS.1770 loudness to −14 LUFS
  integrated, with a true-peak limiter ceiling of −1.5 dBTP so the AAC encode
  stays under −1 dBTP.

`npm run mix -- episodes/<id> --stems` also writes `stems/`; `--json` prints
the full level report.

## Related docs

- [VOICE.md](VOICE.md): voice engines, selection, pronunciation, alignment.
- [brands/README.md](../brands/README.md): brand packs.
- [src/scenes/SCENES.md](../src/scenes/SCENES.md): the script and scene contract.
