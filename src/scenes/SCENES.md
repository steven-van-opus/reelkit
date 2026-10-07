# Scene contract

A reel is a list of **beats**. Each beat names a `scene` type, and the renderer
calls that scene's `draw(s)` once per frame while the beat is on screen. Scenes
draw the diorama between the taped label (top) and the caption chips (bottom);
the renderer owns the background set, camera push-in, the paper-slide transition,
the label and the captions.

## Module shape

`src/scenes/<type>.mjs`, auto-registered by `index.mjs`:

```js
export default {
  type: 'stat',
  describe: 'One sentence the script writer reads to decide when to use it.',
  props: { value: 'string ≤ 6 chars …', label: '…' },   // human-readable prop spec
  draw(s) { … },
};
```

## The `s` object

| field | meaning |
|---|---|
| `ctx` | 2D canvas context, 1080×1920, camera transform already applied |
| `t` | seconds since the beat started (smooth, 30 fps) |
| `ts` | `t` stepped to 15 fps — use for paper motion so it feels stop-motion |
| `dur` | beat length in seconds |
| `props` | the beat's `props` object (always an object) |
| `beat`, `episode`, `index`, `count` | raw script data |
| `set`, `setName` | background set; `s.set.ink` is the readable ink colour on that wall |
| `accent` | `episode.subject.accent` (topic colour) or brand pink |
| `words` | `[{ text, start, end }]` spoken words, times local to the beat (pinned to the voice's real pauses by `src/align.mjs`) |
| `voStart`, `voEnd` | when speech starts/ends inside the beat |
| `wordTime(str)` | local time the first word containing `str` is spoken, else `null` — sync reveals to the voice. `str` is normalised like the words, so `"8:1"` finds the spoken `8:1.` |
| `enter(delay, dur)` | 0→1 pop with overshoot starting at `delay`; returns 0 before |
| `spring(delay, opts)` | damped spring 0→1 |
| `kit(opts)` | draw Kit the mascot (merges `beat.mascot` defaults) |
| `media(id)` | source media item (`'m03'`): `{ kind, img, width, height, duration, frameAt(t), caption, alt, url }` or `null` |
| `mediaFrame(id, offset)` | the image to draw now — the current video frame (plays from beat start + `offset`) or the still |

## Look: paper (default) and studio

The default theme is **paper** — the hand-made cut-paper diorama: grain, torn edges, tape, warm paper
sets, stop-motion on twos. Scenes that exist in both looks live in `paper/<type>.mjs` and
`studio/<type>.mjs` behind a `<type>.mjs` wrapper that picks by `isStudio()`. In paper, real media
(screenshots, generated images, video) appears as **taped photo prints** — white border, slight
tilt, tape at the corners, boil — never as clean UI cards.

### The studio theme (REELS_THEME=studio)

The studio theme (`REELS_THEME=studio`, `brand.mjs`) follows the
Creators Toolbox site's design system, and the primitives already render it:
`paper()`/`card()` draw site cards (flat fill, hairline border, soft two-layer
shadow — no grain), `tornRectPath()` becomes a 16px-radius card, `tape()` draws
nothing, motion is smooth 30 fps, `font()` maps display sizes to **Inter
Display** with tight tracking. Build in that language:

- Surfaces white `#FFFFFF` / `#FAFAFC` / `#F5F5F5`, radius 16 (cards) or 8 (controls),
  hairline borders, ink `#101014` text, muted `#646474` secondary text.
- Pink (brand gradient) is for accents only: the brand pixel, one highlight,
  the active caption word, a key number. Primary actions are ink, not pink.
- Icons: `lucideIcon()` from `icons.mjs` (the site's lucide set) — or `fx.icon()`,
  which maps to lucide.
- Real products: `logoTile(ctx, cx, cy, size, { toolId })` from `logos.mjs` — the
  site's tool-logo tile. Look up ids/names with `allTools()` / `toolInfo()`.
- Brand: `brandPixel()` (app icon), `drawMark()` (C + sparkle), `drawLockup()` (full logo),
  backdrops `backdropMark/Orbits/Tiles()` — all in `brandmark.mjs`. Never hand-draw the logo.
- No paper props in studio scenes: no strings, cork boards, sticky notes, tape,
  stamps, torn edges, offset double shadows, potted plants.

## Visual truth: show the real thing

When a beat talks about something you can *see* — an image model's output, an
edit, a UI, an app screen, a video feature — show the **real media from the
sources** (collected into `episodes/<id>/media/`, listed in `media.json`) in a
stylized house frame. Drawn stand-ins (abstract mock UIs, drawn landscapes) are
only for things that have no visual source. Media is referenced by id in props.

## Rules

- **Deterministic.** No `Math.random`, `Date.now` or wall-clock reads. Use
  `rng(seed)` / `noise1(seed, step)` from `util.mjs`.
- **Material.** Every object is card stock: draw it with `paper()`, `card()`,
  `disc()`, `tape()` from `paper.mjs` and props from `fx.mjs`. No flat vector
  shapes without the paper treatment, no gradients except the brand pink.
- **Layout.** Keep content inside x 70–1010 and y 330–1420. The floor line is
  `BAND.floorY` (1330); Kit stands on it. Leave y 1440–1560 clear for captions.
- **Readable.** Body text ≥ 34px, headline text ≥ 56px, ink on light paper or
  chalk on dark. Use `fitSize`/`fitWrapped` — text must never overflow its card.
- **Motion.** Things arrive in the first ~0.8s with `enter()`/`spring()`, staggered
  ~0.12s apart, and something should keep moving for the whole beat (Kit's idle,
  a pulse, a typing caret). Reveal items in sync with the voice via `wordTime()`
  or by spreading them across `voStart…voEnd`.
- **Brand.** Palette from `brand.mjs` (`C.ink`, `C.chalk`, `C.pink`, `C.blush`,
  `C.rose`). `s.accent` may tint one detail per scene. Kit is the only character.
  Never draw third-party logos or characters; show a product by its **name in
  text** on a paper card.
- **Robust.** Missing or over-long props must still render sensibly (fall back,
  truncate with `fitWrapped`, cap list lengths).

## Catalog (props each scene accepts)

| type | use for | props |
|---|---|---|
| `hook` | beat 1, the news itself | `kicker` ≤16 ("JUST SHIPPED"), `title` ≤28 (product/feature), `by` ≤28 ("from Google"), `media` (optional, the hero print, shown whole), `fit` 'contain' \| 'cover' (optional, default 'contain'; 'cover' crops up to 25%) |
| `product` | what it is | `name` ≤24, `tagline` ≤60, `chips` string[≤3] each ≤18, `icon` (fx icon name, optional) |
| `stat` | one headline number | `value` ≤6 ("4K", "16", "$0"), `label` ≤32, `note` ≤40 (optional) |
| `steps` | how it works / what you can do | `items` string[2–4] each ≤36 |
| `where` | where it's available / who supports it | `title` ≤24 (optional, e.g. "Live on"), `items` string[2–5] each ≤22 |
| `compare` | before vs after, old vs new | `before` {`label` ≤16, `text` ≤40}, `after` {`label` ≤16, `text` ≤40}, `verdict` ≤28 (optional) |
| `prompt` | type a prompt, get a result | `prompt` ≤80, `result` 'image' \| 'ui' \| 'code' \| 'text', `caption` ≤30 (optional) |
| `phone` | mobile / remote / notifications | `app` ≤18, `title` ≤26, `rows` [{`text` ≤26, `status` 'running'\|'done'\|'waiting'}] 2–4, `notification` ≤44 (optional) |
| `cta` | always the last beat | `keyword` one uppercase word ≤10, `line` ≤32 (both set from the house CTA in src/cta.mjs; the line is fit-sized in the bubble) |
| `media` | one real image/video from the sources, big | `media` id, `frame` 'card' \| 'browser' \| 'phone' (default 'card'), `caption` ≤32 (optional), `url` (optional, browser bar), `focus` [x,y,w,h] 0–1 (optional slow push toward a region) |
| `gallery` | several real outputs/examples | `media` id[2–4], `labels` string[] each ≤18 (optional, same order) |
| `beforeafter` | an edit / transformation | `before` id, `after` id, `prompt` ≤80 (optional, the instruction shown as a chip), `beforeLabel`/`afterLabel` ≤12 (default "Before"/"After") |
| `zoom` | a detail (legible text, fine detail, a small UI element) | `media` id, `focus` [x,y,w,h] 0–1 of the image, `caption` ≤32 (optional), `cue` (optional word/phrase from the vo, e.g. "Keep this": the glass lands as it's said) |
| `screenshot` | the product page/UI in a browser frame | `media` id or `toolId` or `image`, `caption` ≤32, `url` (optional) |

Media-aware props on existing scenes: `prompt.media` (show this real result
instead of drawn art), `product.media` (real screenshot inside the window),
`hook.logo` (toolId for the logo tile on the sign — defaults to the episode
tool), `where.items` entries may be strings or `{ text, logo }` (toolId; names
that match a data.ts tool get their logo automatically).

Beat-level: `"logos": ["slack"]` pins product logos into the caption chips
(products named in the VO are detected automatically); `"logos": false` turns that off.

## Beat fields

```json
{
  "label": "≤ 34 chars, the taped header, ALL CAPS on screen",
  "vo": "What the narrator says, written for the ear. ≤ 24 words.",
  "speak": "optional pronunciation variant, same sentence count (\"two point one\")",
  "set": "light | muted | pearl | lavender | ink | pink   (old names rose/chalk/sky/mint/night still work)",
     // in the paper look: pearl = pink striped paper, light = warm cream dotted card,
     // muted = sand kraft with soft stripes, lavender = blush-lilac paper,
     // ink = night (near-black, paper window + moon), pink = hot-pink stage (the CTA)
  "scene": "a type from the catalog",
  "props": { },
  "mascot": { "pose": "idle|wave|point|cheer|hold|think|shrug|walk|type", "face": "smile|happy|wow|wink|focus|grin" }
}
```

Test a scene in isolation: write `episodes/_test-<type>/episode.json` with a
couple of beats using it, then `node src/render.mjs episodes/_test-<type> --stills`
(no voice needed — the renderer fakes timing) and open `stills.png`. Use
`--frame <seconds>` for a single full-size frame.
