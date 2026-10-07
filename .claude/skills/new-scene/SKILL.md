---
name: new-scene
description: Add a new scene type to reelkit (a new way to draw a beat), or change an existing scene's drawing. Use when someone asks for "a new scene", "a scene that shows…", a new layout or visual for a beat, or when no scene in src/scenes/SCENES.md fits what a reel needs.
---

# Add a scene type

A scene draws one beat, every frame, on a 1080×1920 canvas. The renderer owns
the background set, camera push-in, transitions, the beat label and the
caption chips; the scene draws what's between them.

## 1. Read the contract

Read `src/scenes/SCENES.md` in full: the module shape, the `s` object, the
paper and studio looks, the rules (determinism, layout, readability, motion,
brand) and the catalog table. Then read an existing scene close to what you
need:

- Both looks: `src/scenes/stat.mjs` (the wrapper), `src/scenes/paper/stat.mjs`,
  `src/scenes/studio/stat.mjs`.
- Real media: `src/scenes/media.mjs`, `src/scenes/zoom.mjs`,
  `src/scenes/beforeafter.mjs`.

Check that no existing scene, or a new prop on one, already does the job.
Extending a scene is cheaper than adding one.

## 2. Write it

Every scene needs a paper look (the default) and a studio look
(`REELS_THEME=studio`).

- **Two files and a wrapper** when the looks differ:
  `src/scenes/paper/<type>.mjs` and `src/scenes/studio/<type>.mjs`, each
  default-exporting `{ type, describe, props, draw(s) }`, plus
  `src/scenes/<type>.mjs` that picks between them with `isStudio()` from
  `src/brand.mjs` (copy `src/scenes/stat.mjs`).
- **One file** when a single `draw` handles both, branching on `isStudio()`
  inside: `src/scenes/<type>.mjs`.

`src/scenes/index.mjs` registers every top-level `src/scenes/<type>.mjs`
automatically (files starting with `_` are skipped). There's nothing to add
to an index.

Write `describe` for the script writer: one or two sentences on when to use
the scene. Say "the mascot" or use the existing scenes' wording; the writer's
prompt swaps in the brand pack's mascot name. Write `props` as short human
specs with limits, matching the table.

Rules that bite most often:

- No `Math.random`, `Date.now` or wall-clock reads. Use `rng(seed)` and
  `noise1(seed, step)` from `src/util.mjs`.
- Content inside x 70–1010 and y 330–1420; keep y 1440–1560 clear for
  captions. Use `BAND` and `SAFE` from `src/brand.mjs`.
- Text through `fitSize` / `fitWrapped`; it must never overflow.
- Real media through `s.media(id)` / `s.mediaFrame(id)`, product logos through
  `logoTile()` in `src/logos.mjs`, icons through `lucideIcon()` in
  `src/icons.mjs`, brand artwork through `src/brandmark.mjs`. Palette from `C`
  in `src/brand.mjs`; no hard-coded brand colours.
- Missing or long props still render sensibly.

## 3. Register the props contract

Add a row for the scene to the catalog table in `src/scenes/SCENES.md`, using
the same prop notation (`` `name` ≤24 ``, `` `items` string[2–4] each ≤36 ``,
`` `media` id ``, `` `focus` [x,y,w,h] 0–1 ``, `(optional)`). `validate.mjs`
parses that table for limits, and the writer offers the scene to Claude once
it's registered.

## 4. Test bed

Make `episodes/_test-<type>/episode.json` (gitignored) with two or three beats
that use the scene: one typical, one with the longest allowed props, one with
optional props left out. Add a `media.json` and `media/` (copy from an
existing episode) if the scene shows media. No voice is needed; the renderer
fakes timing.

```sh
npm run validate -- episodes/_test-<type>
npm run render -- episodes/_test-<type> --stills          # paper look → stills.png
cp episodes/_test-<type>/stills.png episodes/_test-<type>/stills-paper.png
REELS_THEME=studio npm run render -- episodes/_test-<type> --stills   # studio look, overwrites stills.png
npm run render -- episodes/_test-<type> --frame 1.2        # one full-size frame → frame-1.2.png
```

Read each PNG and check: nothing clipped or overflowing, text readable,
motion staged (check frames at 0.2 s, 0.8 s and late in the beat), both looks
on-brand. Fix and repeat.

## 5. Check nothing else moved

If you touched shared drawing code (`paper.mjs`, `fx.mjs`, `overlay.mjs`,
`brand*.mjs`, `mascot.mjs`, another scene), render a frame from a real
episode before and after the change and compare the files with `cmp`. They
must be identical unless the change is the point.

## 6. Clean up

Delete `episodes/_test-<type>/` and any scratch PNGs when you're done. Report
the files you added, the SCENES.md row, and the stills you checked.
