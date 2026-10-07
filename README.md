# Creators Toolbox news reels

Daily 9:16 news reels (1080×1920, 30 fps, 20–32 s) about tool launches from
`data.ts`, drawn in the Creators Toolbox site's own design language (white
cards, hairline borders, soft shadows, Inter Display, pink as the accent) and
showing the real images and video from the sources, with Kit, the Creators
Toolbox mascot, acting each beat out. Everything is plain code: canvas frames
piped into ffmpeg, with no video framework and no stock footage. The only paid
step is one Claude call that looks at the media and writes and fact-checks the
script.

## How it works

```
 data.ts news[] (~4,700 items across 900+ tools)
        │
        ▼
 pick-news.mjs ── ranks the last N days: launches, GA, "now available", new
        │         models/features for design, video, image, audio, agents, code;
        │         penalises patch versions, SDK bumps, admin/security, bug fixes;
        │         merges one launch logged under several tools; skips stories
        │         an episodes/*/episode.json (with beats) already covers
        ▼
 seed ── episodes/<date>-<slug>/episode.json with id, date, source, subject
        │
 media.mjs ── collects the sources' images and video (yt-dlp for embeds)
        │     → media/ + media.json (id, kind, size, alt, page) + media/contact.jpg
        ▼
 write-script.mjs ── claude -p --model opus reads the source pages (WebFetch),
        │            looks at the contact sheet and media files (Read), writes
        │            ONE spoken take (episode.script), cuts it into beats and
        │            picks their scenes, lists every claim in sources[]; the
        │            house CTA (cta.mjs) is appended; retried ≤2× with the errors
        ▼
 validate.mjs ── beats' vo join back into the script, scenes exist, props within
        │        limits, media ids exist, 6–9 beats, hook…cta, ≤34-char labels,
        │        ≤24 words/beat, 60–95 words; warns on caption-speak
        ▼
 tts.mjs ── Kokoro-82M on CPU (local, free) → vo.wav + word timings (voice.json)
        │
 align.mjs ── pins the word timings to the pauses ffmpeg hears in vo.wav
        │
 audio.mjs ── generated music + SFX, ducked under the voice → mix.wav
        │
 render.mjs ── scenes/*.mjs draw every frame on a 2D canvas → ffmpeg → reel.mp4
        │
        ▼
 episodes/<date>-<slug>/
   episode.json   the script (committed)
   media.json     what each media id is and where it came from (committed)
   stills.png     one frame per beat, for review (committed)
   cover.png      the hook once it has settled (~2.6 s), no caption chips or confetti (committed)
   caption.txt    post caption + hashtags + source links (committed)
   media/         collected images/video, contact.jpg, decoded frames (ignored)
   reel.mp4, vo.wav, mix.wav, voice.json        build outputs (ignored)
```

`run.mjs` chains all of it and prints each step with its timing. The steps, by
the names `--from` takes:

```
pick → seed → media → write → validate → voice → mix → render → stills → cover → caption
```

## Run it locally

Needs Node 24+, ffmpeg on the PATH, the Claude Code CLI logged in (only for
writing scripts) and yt-dlp (only for video embedded in source pages:
`brew install yt-dlp` or `pip install yt-dlp`).

```sh
cd reels
npm ci

npm run pick                                   # ranked candidates, last 3 days, with reasons
npm run pick -- --days 7 --top 20
npm run reel -- --auto                         # the whole chain for the top story
npm run reel -- --auto --count 2 --days 5
npm run reel -- --news "ad multiplier"         # force a topic (URL or title substring, any age ≤30 days)
npm run reel -- --auto --pick-only             # what would it make today?

npm run reel -- --episode episodes/<id>                  # re-voice, re-mix, re-render an existing script
npm run reel -- --episode episodes/<id> --from media     # collect media again and rewrite the script
npm run reel -- --episode episodes/<id> --from write     # rewrite the script with the media already there
npm run reel -- --episode episodes/<id> --from cover     # any step: media, write, validate, voice, mix, render, stills, cover, caption
npm run reel -- --episode episodes/<id> --no-render      # voice + mix only, to check the duration
npm run reel -- --episode episodes/<id> --no-video       # everything except reel.mp4

npm run write -- --news figma --prompt         # print the exact prompt the writer sends, no call
npm run write -- --episode episodes/<id> --prompt   # the same, with that episode's media list
npm run validate -- episodes/<id>              # exits 1 on contract errors
npm run voice -- episodes/<id>
node src/align.mjs episodes/<id>               # caption timing pass (run.mjs does it after voice)
npm run mix -- episodes/<id>
npm run render -- episodes/<id> --stills       # contact sheet only
npm run render -- episodes/<id> --frame 3.2    # one full-size frame
npm run render -- episodes/<id> --frame 2.6 --cover --out cover.png   # a still without chips/confetti
npm run serve                                  # the viewer, below
```

Edit `episode.json` by hand freely: `--episode` re-runs everything after the
writer (behind a validation check; `--force` renders anyway). `REELS_MODEL`
picks another Claude model, `CLAUDE_CLI` another binary, `REELS_MEDIA_MAX`
caps the media collected per story (default 12), `REELS_TODAY=YYYY-MM-DD`
pins the picker's "today" and `REELS_THEME=paper` renders the old look (below).

## Source media and visual truth

A reel about an image model that shows a drawn landscape instead of the
model's actual output is a worse reel. So when a beat talks about something
you can see (an output, an edit, a UI, an app screen, a video feature), it
shows the real thing:

1. **Collect.** After the episode folder is seeded, `src/media.mjs` reads the
   source pages in `episode.json` and saves their images and video into
   `media/`, writes `media.json` (`{ items: [{ id: 'm01', file, kind, width,
   height, duration?, url, page, alt?, caption? }] }`) and draws every item onto
   `media/contact.jpg`, labelled with its id. If `media.mjs` is missing or
   collecting fails, the run carries on and the script uses drawn scenes.
2. **Look.** The writer copies the contact sheet, every image and a four-frame
   strip of each video into Claude's empty working folder and tells it to Read
   them before writing, so it knows what each item really shows. Alt text and
   captions from the pages are hints, not truth.
3. **Show.** The style guide's *Visual truth* rule: use the real media through
   the `media`, `gallery`, `beforeafter`, `zoom` and `screenshot` scenes or the
   `media` prop on `prompt`, `product`, `phone` and `hook`; describe only what
   is visible or stated by the source (a banner isn't an output, a before/after
   must be a real pair); put the strongest visual in the first two beats; never
   invent an id. Drawn stand-ins are for things the sources don't show.
4. **Check.** `validate.mjs` fails a script whose media ids aren't in
   `media.json`, a media scene missing its required props, a `beforeafter`
   with the same id twice, or a `focus` that isn't `[x, y, w, h]` in 0–1. It
   warns when media goes unused or one item is shown more than twice.

`media/` is third-party material and is git-ignored; `media.json` is committed
as the record of what each id was and where it came from. On a fresh clone,
`--from media` collects it again (and rewrites the script, since ids can
change).

## Look: the studio theme

The default `studio` theme follows the site's design system
(`src/styles/brand-tokens.css`, `design-system.css`, `BrandBackdrop.tsx`,
`ToolIcon.tsx`, `ToolboxLogo.tsx`): flat white cards with hairline borders and
soft shadows, 16px radii, Inter Display headlines, lucide icons, the site's
tool-logo tiles for real products, smooth 30 fps motion, and pink only for
accents. Beat backgrounds are the site's surfaces: `light`, `muted`, `pearl`,
`lavender`, `ink` and `pink` (scripts written with the older `rose`, `chalk`,
`sky`, `mint` and `night` still render). Labels render exactly as written, in
sentence case.

`REELS_THEME=paper` switches back to the original papercraft look (grain, torn
edges, tape, stop-motion), e.g. `REELS_THEME=paper npm run render -- episodes/<id> --stills`.

## Viewer

`npm run serve` (`node src/serve.mjs`) serves a local page at
http://localhost:4310 listing every episode folder with its reel, stills,
cover and caption. It polls, so new renders show up without a reload; test
beds (`_test-*`) sort last.

## The script format

`src/scenes/SCENES.md` is the contract: the beat fields, the scene catalog and
every prop limit. An episode looks like:

```json
{
  "id": "2026-10-06-nano-banana-2-1", "date": "2026-10-06",
  "source": { "toolId": "gemini", "newsTitle": "Gemini Nano Banana 2.1 generally available (GA)", "url": "https://…", "extraUrls": [] },
  "subject": { "name": "Nano Banana 2.1", "maker": "Google", "accent": "#FFC94D" },
  "voice": { "id": "af_heart", "speed": 1.06 },
  "cta": { "keyword": "TOOLBOX" },
  "post": { "caption": "…", "hashtags": ["#nanobanana", "#creatorstoolbox"] },
  "sources": [{ "claim": "Generates at 1K, 2K and 4K resolution", "url": "https://…" }],
  "script": "Google just shipped Nano Banana 2.1, and the big upgrade is text you can actually read. …",
  "beats": [
    { "label": "Better text in AI images", "vo": "Google just shipped Nano Banana 2.1, and the big upgrade is text you can actually read.", "set": "pearl", "scene": "hook",
      "props": { "kicker": "Now available", "title": "Nano Banana 2.1", "by": "from Google", "media": "m01" },
      "mascot": { "pose": "cheer", "face": "wow" } },
    { "label": "Edit by describing the change", "vo": "…", "set": "light", "scene": "beforeafter",
      "props": { "before": "m02", "after": "m03", "prompt": "Change the shirt to yellow" },
      "logos": ["higgsfield"], "mascot": { "pose": "point", "face": "happy" } }
  ]
}
```

`logos` (optional, per beat) pins tool logos into the caption chips; products
named in the voiceover get theirs automatically, and `"logos": false` turns
that off. The writer's style guide (the take, register, beats, labels, visual
truth, pronunciation via `speak`, caption shape, sourcing) lives at the top of
`src/write-script.mjs`; the scene catalog it shows Claude is whatever
`scenes/index.mjs` registers at run time, with the limits from `SCENES.md`.

## Writing the voiceover: one take, then the cut

Beats written one at a time come out as captions read aloud ("New: …",
fragments, five sentences with the same shape). So the writer works the way a
creator records a voiceover:

1. **The take.** Claude first writes the whole voiceover as one continuous
   spoken take in `script`: a creator talking to camera to a friend, 60–75
   words, with connected sentences, contractions, "you", varied sentence
   length, and a hook → what you can do → the concrete detail → why it
   matters arc. No colons, no "New:", no noun-phrase fragments, no parallel
   list cadence, no hype. At about 2.8 words a second that's 21–27 s, and the
   house CTA brings the reel to 26–32 s.
2. **The cut.** It then splits the take into 5–7 beats at breath points,
   without changing a word, so a beat can end on a comma and the next can open
   with "and" or "so". Each beat's `vo` is the next piece of the take; `speak`
   follows the same cut.
3. **The visuals.** Only then does it pick each beat's scene and media. If no
   media backs a line, the line changes in the take and is cut again.
4. **The CTA.** Claude doesn't write one: `assemble()` appends the house CTA
   from `src/cta.mjs` (and its caption line), replacing any CTA beat the model
   added anyway.

The style guide shows bad-vs-good register pairs (invented products) and a
fictional episode whose `script` is its beats' `vo` joined. To see the exact
system prompt and prompt without calling Claude:

```sh
npm run write -- --episode episodes/<id> --prompt
```

`validate.mjs` enforces the cut and flags the register:

- **Error:** when `script` is present, the beats' `vo` (minus the closing CTA
  beat), joined with spaces, must equal it word for word (spacing and curly vs
  straight quotes don't count). The error names the first differing word and
  its beat. The writer also rejects a reply with no `script`.
- **Warnings** (never failures): a colon in a `vo` (not `8:1`), a `vo`
  starting with "New:", three or more beats in a row that are each one short
  sentence (≤10 words), a `vo` with no verb (a heuristic that stays quiet when
  unsure), and a `script` outside 60–75 words.

## Add a scene

1. Create `src/scenes/<type>.mjs` default-exporting
   `{ type, describe, props, draw(s) }`. `index.mjs` registers it
   automatically. Copy the shape of `hook.mjs` or `cta.mjs`.
2. Add a row for it to the catalog table in `SCENES.md`, using the same prop
   notation (`` `name` ≤24 ``, `` `items` string[2–4] each ≤36 ``,
   `` `media` id ``, `` `media` id[2–4] ``, `` `focus` [x,y,w,h] 0–1 ``,
   `` `x` (optional) ``). The validator parses that table for limits, and the
   writer offers the scene to Claude once it's registered.
3. Follow the rules in `SCENES.md`: deterministic (no `Math.random`,
   `Date.now`), site-style cards from `paper.mjs`/`fx.mjs`, lucide icons from
   `icons.mjs`, real products via `logoTile()` and real media via
   `s.media(id)` / `s.mediaFrame(id)`, content inside x 70–1010 and y 330–1420,
   Kit is the only character.
4. Make a test bed (`episodes/_test-<type>/episode.json`, ignored by git, with a
   `media.json` + `media/` if the scene shows media), then
   `npm run render -- episodes/_test-<type> --stills` and look at it.

## In CI

`.github/workflows/news-reels.yml` runs daily at 15:00 UTC and on demand
(Actions → News Reels → Run workflow, with `count`, `news` and `days` inputs):

- installs ffmpeg, yt-dlp (pip, for video embedded in source pages),
  `npm ci` in `reels/`, and Claude Code;
- restores the Kokoro model from the Actions cache
  (`reels/node_modules/@huggingface/transformers/.cache`, ~90 MB);
- restores a ledger of earlier episodes' `episode.json` from the Actions cache,
  so pick-news doesn't make the same story twice (source media isn't cached; it
  is collected fresh every run);
- runs `node src/run.mjs --auto` with `CLAUDE_CODE_OAUTH_TOKEN` or
  `ANTHROPIC_API_KEY`, the same secrets `generate-news-blog.yml` uses;
- uploads each new episode's `reel.mp4`, `cover.png`, `caption.txt`,
  `episode.json`, `stills.png`, `media.json` and `contact.jpg` (the media
  contact sheet) as a workflow artifact (kept 30 days) and writes the captions
  to the job summary.

It never commits or pushes. To keep an episode's script in the repo, download
the artifact, copy its `episode.json`, `media.json`, `stills.png`, `cover.png`
and `caption.txt` into `reels/episodes/<id>/`, and open a PR.

## Costs

- **Claude**: one `claude -p` call per reel with Opus, WebFetch and Read, plus
  up to two cheap resumed retries. The first real run (before media) cost $0.34
  at API list price (81 s, 3 turns); reading the contact sheet and a few images
  adds a little on top. With `CLAUDE_CODE_OAUTH_TOKEN` it draws on the Claude
  subscription instead.
- **Everything else is local and free**: media collection, Kokoro TTS
  (Apache-2.0 open weights, CPU), generated music and SFX, canvas rendering,
  ffmpeg. No stock media, no render service.
- **GitHub Actions**: one ubuntu-latest job per day. Rendering is the slow part
  and scales with the runner's cores.

## The house CTA needs a DM auto-responder

Every reel ends with the house CTA from `src/cta.mjs`: "Comment TOOLBOX and
we'll send you the latest tools, news, and resources every day!" The writer
appends it, and voice, mix, render and the pipeline apply it again when they
read an episode, so a script can't drift from it (`"cta": { "house": false }`
opts one episode out). Nothing in this repo sends that DM. Set up a
comment-to-DM automation (for example ManyChat on Instagram) that triggers on
TOOLBOX. Without it, don't post the CTA beat as written.
