# reelkit

reelkit turns a product link or a news story into a narrated 9:16 reel
(1080×1920, 30 fps, 20–32 s). It reads the source, collects the real images and
video the vendor published, has Claude write and fact-check a spoken script,
voices it, scores it and draws every frame in code. There's no video model,
no stock footage and no render service: canvas frames go straight into ffmpeg.
You get a reel to review, tweak and post, with a cover, a caption and a source
for every claim.

## Quickstart

```sh
git clone <this repo> reelkit && cd reelkit
npm run setup                 # on Apple Silicon: npm run setup -- --voice (house voice)
claude                        # then say: make a reel about https://…
```

The `make-reel` skill (`.claude/skills/make-reel/`) walks Claude Code through
the run: preflight, a draft with stills, review, fixes and the final render.

## How it works

```
 link, catalog news or --auto
   │
 seed ── episodes/<date>-<slug>/episode.json (id, date, source, subject)
 media ── the sources' images and video → media/, media.json, media/contact.jpg
 write ── Claude reads the sources and looks at the media, writes one spoken
   │      take, cuts it into beats, picks a scene per beat, lists every claim
 validate ── the script follows src/scenes/SCENES.md
 voice ── vo.wav + word timings (voice.json), aligned to the audio
 mix ── generated music and SFX under the voice → mix.wav (−14 LUFS)
 render ── every frame drawn on canvas → ffmpeg → reel.mp4
 stills · cover · caption ── review sheet, poster, post copy
```

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) has the full picture.

## CLI

| Command | What it does |
| --- | --- |
| `npm run reel -- --url <https://…> [--brief "…"] [--date YYYY-MM-DD]` | Make a reel from any link. `--brief` is the angle and what to stress; the writer gets it as producer notes. |
| `npm run reel -- --news "<title or url substring>"` | Make a reel about one story in the catalog's news. Also takes `--brief`. |
| `npm run reel -- --auto [--count 1] [--days 3]` | Make reels for the best recent catalog news. `--pick-only` prints the picks and stops. |
| `npm run reel -- --episode episodes/<id> [--from <step>]` | Re-run an existing episode. Without `--from` it re-voices and re-renders, behind the validation check. With `--from write --brief "…"` it rewrites with a new brief. |
| `… --no-video` | Everything except `reel.mp4`: stills, cover and caption for a quick review. |
| `… --no-render` | Stop after voice and mix, to check the duration. |
| `… --force` | Render even if the script fails validation. |
| `npm run pick` | Rank recent catalog news (`-- --days 7 --top 20`, `-- --json`). |
| `npm run serve` | The local viewer at http://localhost:4310. |
| `npm run doctor` | What's installed, and which voice and Claude model a reel will use. |
| `npm run setup` | Check tools and install dependencies (`-- --voice`, `-- --check`). |
| `npm run catalog:sync -- /path/to/Creators-Toolbox` | Refresh `catalog/tools.json` from a site checkout. |

Steps, by the names `--from` takes:

```
pick → seed → media → write → validate → voice → mix → render → stills → cover → caption
```

`--from media` collects media again and rewrites the script, `--from write`
rewrites with the media already there, `--from render` only redraws.

Single steps, for working on one part:

```sh
npm run write -- --episode episodes/<id> --prompt   # print the writer's exact prompt, no Claude call
npm run validate -- episodes/<id>                   # exits 1 on contract errors
npm run voice -- episodes/<id>                      # vo.wav + voice.json
npm run mix -- episodes/<id> [--stems]              # mix.wav (and stems/ with --stems)
npm run render -- episodes/<id> --stills            # stills.png only
npm run render -- episodes/<id> --frame 3.2         # one full-size frame at 3.2 s
```

## Outputs

Each reel gets a folder, `episodes/<date>-<slug>/`.

| File | What it is | Committed |
| --- | --- | --- |
| `episode.json` | The script: beats, scenes, props, sources, post copy | Yes |
| `media.json` | What each media id is and the page it came from | Yes |
| `stills.png` | One frame per beat, for review | Yes |
| `cover.png` | The reel's cover poster. Set it as the cover when you post. | Yes |
| `caption.txt` | Post caption, hashtags and source links, ready to paste | Yes |
| `cover-grid.png` | Preview of the cover's 3:4 profile-grid crop | No |
| `reel.mp4` | The finished reel | No |
| `vo.wav`, `voice.json` | The voiceover and its word timings | No |
| `mix.wav` | Voice, music and SFX, mastered | No |
| `media/` | Collected third-party images and video, plus `contact.jpg` | No |

Third-party media is never committed. On a fresh clone, `--from media` collects
it again.

## Voice

| Voice | Where it runs | Cost | Setup |
| --- | --- | --- | --- |
| House voice (Kokoro Heart × Qwen3-TTS) | Locally, Apple Silicon only | Free | `npm run setup -- --voice` (about 3 GB) |
| Kokoro | Locally on CPU, any machine | Free | None. The model downloads on first use. Without `--voice` there's no Whisper alignment, so caption and lip-sync timing is estimated. |
| ElevenLabs | ElevenLabs API | Paid per character | `ELEVENLABS_API_KEY` in `.env` |

A reel uses the house voice when it's installed, then ElevenLabs if a key is
set, then Kokoro. `REELS_VOICE=kokoro` (or `elevenlabs`, `qwen-locked`, `say`)
picks one explicitly. `npm run doctor` shows which one you'll get and why.
[docs/VOICE.md](docs/VOICE.md) covers pronunciation, alignment and lip sync.

## Viewer and lip-sync tuner

`npm run serve` starts a viewer at http://localhost:4310 with every episode's
reel, stills, cover and caption. It polls, so new renders show up without a
reload. Test folders (`episodes/_test-*`) sort last.

The **Lip-sync tuner** (linked from the viewer, `/viewer/sync.html`) plays a
reel with a slider that shifts the voice against the mascot's mouth. **Save**
writes the lead to `lipsync.json` for every future render; **Re-render this
reel** bakes it in.

## Brand packs

Name, handle, site, mascot name, colours, logos and the closing call to action
come from a brand pack in `brands/`. `REELKIT_BRAND=<name>` picks one; the
default is `creators-toolbox`. [brands/README.md](brands/README.md) shows how
to make your own.

The house CTA ("Comment TOOLBOX and we'll send you…") is a promise. Before you
post it, set up a comment-to-DM automation on the account (ManyChat, for
example) that replies to the keyword.

## Settings

Copy `.env.example` to `.env` for the ElevenLabs key. Everything else is an
environment variable, listed with defaults in `.env.example`. The common ones:

| Variable | Effect |
| --- | --- |
| `REELS_VOICE` | Narrator: `qwen-locked`, `elevenlabs`, `kokoro` or `say` (macOS) |
| `REELS_THEME` | `paper` (default, cut paper) or `studio` (the site's clean design system) |
| `REELS_HOOK` | Paper hook title style, e.g. `strips` (default), `letters`, `newspaper` |
| `REELKIT_BRAND` | Brand pack folder name or path |
| `REELS_MODEL` | Claude model for the writer (default `opus`) |
| `REELS_MEDIA_MAX` | Most media items collected per reel (default 12) |
| `REELKIT_SITE` | Read the catalog live from a Creators Toolbox checkout |

## In GitHub Actions

**Actions → Make a reel → Run workflow** (`.github/workflows/reel.yml`) makes
one reel from a `url`, with an optional `brief` and a `voice` choice (auto,
elevenlabs, kokoro). It needs a `CLAUDE_CODE_OAUTH_TOKEN` or
`ANTHROPIC_API_KEY` secret, plus `ELEVENLABS_API_KEY` for ElevenLabs. The
episode's files are uploaded as a workflow artifact; nothing is committed. To
keep a script, copy its `episode.json`, `media.json`, `stills.png`,
`cover.png` and `caption.txt` into `episodes/<id>/` and open a PR.

## Requirements

- **Node 20+** (22+ recommended) and **ffmpeg** with ffprobe. Required.
- **Claude Code**, logged in. Writes the scripts.
- **Google Chrome**, or `CHROME_PATH`. Captures pages that render client-side.
- **yt-dlp**. Downloads video embedded in source pages.
- **uv**, on Apple Silicon, for the house voice.

`npm run setup -- --check` lists what's missing, with the install command.

## Costs

One `claude -p` call per reel (Opus, with WebFetch and Read), plus up to two
short retries when the script fails validation. Measured runs cost about
$0.35–0.75 at API list price, depending on how much media the writer reviews
and whether it needs a retry. With a Claude subscription it draws on that instead. ElevenLabs bills
per character. Everything else (media, house voice, Kokoro, music, rendering)
is local and free.

## Troubleshooting

**Certificate errors behind a corporate proxy.** Node doesn't read the system
keychain. Export your company's root CA as a PEM file and set
`NODE_EXTRA_CA_CERTS=/path/to/ca.pem`. The Python voice tools use the system
store through `truststore`, and `setup.sh --voice` sets `UV_SYSTEM_CERTS=1` for
uv.

**Page captures fail or come back blank.** Chrome isn't where reelkit looks.
Install Google Chrome, or set `CHROME_PATH` to Chrome or Chromium (required on
Linux). Captures are best effort; the run carries on without them.

**No video in a reel about a video feature.** yt-dlp is missing.
`brew install yt-dlp` (or `pip install yt-dlp`), then
`npm run reel -- --episode episodes/<id> --from media`.

**The write step fails right away.** Claude Code isn't installed or isn't
logged in. Run `claude` once and log in, then `npm run doctor`. `CLAUDE_CLI`
points at another binary.

**The reel runs outside 20–32 s.** Tighten the script (`--from write` with a
sharper `--brief`) or edit the beats by hand, then re-run from voice.
