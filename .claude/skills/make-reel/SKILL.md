---
name: make-reel
description: Make a narrated 9:16 reel (news reel or faceless explainer) with reelkit from a URL, a catalog news story or the best recent news. Use when someone says "make a reel about <url or topic>", "make a video about…", "news reel", "faceless explainer", "turn this link into a reel", or asks to redo, tweak or re-render an existing episode.
---

# Make a reel

You're driving reelkit's pipeline for someone who knows Claude Code but not
this engine. Work in this order: preflight, draft without video, review,
iterate, render, report. Keep them posted in a sentence or two per step; the
pipeline prints each step with its timing.

Read `CLAUDE.md` first if you haven't this session. Its rules apply: real
source media only, every claim sourced, the CTA comes from the brand pack.

## 1. Preflight

```sh
npm run doctor
```

- Exit 0: note which voice and Claude model it reports, and go on.
- Exit 1: something required is missing. Run `npm run setup` (it installs npm
  dependencies and prints the install command for anything else), then
  `npm run doctor` again. Don't install system packages yourself; give the
  person the command doctor printed.
- On Apple Silicon without the house voice, mention that
  `npm run setup -- --voice` installs it (about 3 GB). Don't run it unasked.
- Reels use ElevenLabs only when doctor says so. It's paid per character, so
  say so before a run that will use it.

## 2. Choose the input

| They gave you | Run |
| --- | --- |
| A link (announcement, changelog, product page, blog post) | `npm run reel -- --url <url> --no-video` |
| A topic that's in the catalog's news | `npm run pick -- --news "<words>"` to find it, then `npm run reel -- --news "<title or url substring>" --no-video` |
| "Whatever's new" | `npm run reel -- --auto --pick-only` to show the picks, then `npm run reel -- --auto --no-video` |
| An existing episode folder | skip to step 4 |

Add `--brief "<angle, audience, what to stress or avoid>"` when they told you
what the reel is for ("for designers", "lead with the price", "explain how it
works step by step"). The writer gets it as producer notes. For a faceless
explainer, the brief is where the angle goes. Add `--date YYYY-MM-DD` with
`--url` when the page's publish date is missing or wrong.

The run takes a few minutes (media collection and the Claude call are the slow
parts). It ends by printing the episode folder, `episodes/<date>-<slug>/`.

If it fails:
- **write fails validation after retries**: read the errors, fix `episode.json`
  by hand (step 4), then continue with `--episode`.
- **media found nothing**: the script falls back to drawn scenes. Check the
  source page yourself; a blocked fetch doesn't prove there's no media.
- **`--url` matched the wrong product**: say so and check `catalog/local.json`.

## 3. Review the draft

Read these with the Read tool, all of them:

1. `episodes/<id>/stills.png`: one frame per beat.
2. `episodes/<id>/cover.png`: the cover poster.
3. `episodes/<id>/episode.json`: `script`, `beats`, `sources`, `post`.
4. `episodes/<id>/media/contact.jpg`: every collected media item with its id.
5. `episodes/<id>/caption.txt`.

Check each item and note what fails:

- [ ] **Facts are sourced.** Every number, date, plan, platform and capability
  in `script`, labels, props and the caption has a `sources[]` entry whose
  page states it. When in doubt, open the source URL and check.
- [ ] **It sounds spoken.** `script` reads like a person talking to a friend:
  contractions, "you", connected sentences, no colons, no "New:", no
  noun-phrase fragments, no hype. 60–75 words before the CTA.
- [ ] **Media shows what's said.** Each beat that talks about something
  visible shows the real thing (compare with `contact.jpg`). No banner passed
  off as an output, no mismatched before/after, strongest visual in the first
  two beats.
- [ ] **On-screen text is right.** Labels ≤34 characters, no overflow or
  clipping in the stills, product names spelled right, logos in the caption
  chips belong to the products named.
- [ ] **Hook lands.** Beat 1 names the news and has the best media.
- [ ] **CTA is present.** The last beat is the brand pack's CTA, and the
  caption ends with its line.
- [ ] **Duration.** `voice.json` `duration` is 20–32 s (the run warns if not).

Show the person `stills.png` and `cover.png` (SendUserFile when available) with
a short verdict: what works, what you'd change.

## 4. Iterate

Pick the smallest fix:

| Problem | Fix | Then run |
| --- | --- | --- |
| A prop, set, scene, media id, label or mascot pose | Edit that beat in `episode.json` | `npm run validate -- episodes/<id> && npm run render -- episodes/<id> --stills` |
| A line of voiceover | Edit the beat's `vo` **and** the same words in `script` (they must match word for word) | `npm run reel -- --episode episodes/<id> --no-video` (re-voices) |
| A mispronunciation | Add `speak` to the beat (same sentence count as `vo`), or add the word to `LEXICON` in `src/pronounce.mjs` | `npm run reel -- --episode episodes/<id> --no-video` |
| Wrong angle, weak script, missing facts | Rewrite with a sharper brief | `npm run reel -- --episode episodes/<id> --from write --brief "…" --no-video` |
| Wrong or missing media | Collect again (rewrites the script too, since ids can change) | `npm run reel -- --episode episodes/<id> --from media --no-video` |
| Cover only | Edit `episode.cover` (`title`, `kicker`, `media`) | `npm run reel -- --episode episodes/<id> --from cover` |

Scene names, props and limits are in `src/scenes/SCENES.md`. Read it before
changing a beat's `scene` or props. Never invent a media id: use ids that are
in `media.json`. Don't write a CTA beat; it's added for you.

After each change, Read `stills.png` again and re-check the list. Two or three
rounds is normal; stop when the checklist passes and the person is happy.

## 5. Render

```sh
npm run reel -- --episode episodes/<id> --from render
```

This draws every frame in parallel workers and muxes `mix.wav`, then refreshes
stills, cover and caption. It takes a few minutes. If you changed anything
voiced since the last voice run, use `--episode episodes/<id>` without `--from`
instead so the voice is redone first.

## 6. Open the viewer and report

Start the viewer in the background (it keeps running):

```sh
npm run serve
```

Then tell the person:

- http://localhost:4310 to watch it, and the Lip-sync tuner there if the
  mouth looks early or late.
- The paths: `episodes/<id>/reel.mp4`, `cover.png`, `caption.txt`.
- The duration, the voice used, and anything you weren't able to verify.
- Before posting: set `cover.png` as the reel's cover, paste `caption.txt`,
  and make sure the account's comment-to-DM automation answers the CTA keyword.

Send `reel.mp4` with SendUserFile when it's available.

## Common tweaks

All are environment variables set per command, e.g.
`REELS_THEME=studio npm run reel -- --episode episodes/<id> --from render`.

- **Voice.** `REELS_VOICE=qwen-locked | elevenlabs | kokoro | say`. Default is
  the house voice if installed, else ElevenLabs if `ELEVENLABS_API_KEY` is set
  (env or `.env`), else Kokoro. ElevenLabs voice and model:
  `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL`; list voices with
  `node src/tts.mjs --voices`. An episode can pin its own with
  `"voice": { "engine": "…" }`. Changing voice means re-voicing: run without
  `--from`. See `docs/VOICE.md`.
- **Theme.** `REELS_THEME=paper` (default, cut paper and stop-motion) or
  `studio` (flat white cards in the site's design system). `REELS_TEXTURE=0`
  renders studio without paper texture.
- **Hook style.** For the paper look, `REELS_HOOK=strips` (default), `letters`,
  `print`, `sign`, or one of `src/scenes/paper/titles/` (`newspaper`,
  `bunting`, `label-maker`, `shipping-tag`, `speech-bubble`, `sticky-notes`,
  `ticket`). For one episode, set `props.titleStyle` on the hook beat instead.
- **Lip-sync lead.** How far the mouth leads the voice, in ms, in
  `lipsync.json` (`leadMs`). Tune it by ear in the viewer at
  `/viewer/sync.html`, save, and re-render. It applies to every reel.
- **Brand pack.** `REELKIT_BRAND=<folder in brands/ or a path>`. It changes
  name, handle, site, mascot name, colours, logos and CTA. See
  `brands/README.md`. Re-render from `write` if the pack's CTA or name should
  reach the script and caption.
- **Writer model.** `REELS_MODEL` (default `opus`).
- **Media amount.** `REELS_MEDIA_MAX` (default 12).

## Adding a scene

If no scene fits what a beat needs, use the `new-scene` skill. The contract is
`src/scenes/SCENES.md`.
