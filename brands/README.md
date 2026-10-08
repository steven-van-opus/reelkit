# Brand packs

A brand pack is everything that makes a reel yours: the name and handle the
reel speaks for, the site it points to, what the mascot is called, the brand
colours, the logo artwork and the closing call to action. Scenes, motion,
captions and voice are shared by every pack.

Each pack is a folder under `brands/`. `creators-toolbox` is the default.

## Use a pack

Set `REELKIT_BRAND` to the pack's folder name. Every command reads it.

```sh
REELKIT_BRAND=acme npm run reel -- --url https://example.com/launch
REELKIT_BRAND=acme npm run reel -- --episode episodes/<id> --from cover
```

`REELKIT_BRAND` also takes a path (anything with a `/`), relative to where you
run the command, so a pack can live outside this repo:

```sh
REELKIT_BRAND=../acme-brand npm run reel -- --auto
```

The pack is checked when the engine starts. A missing field, a bad colour or an
asset that isn't on disk stops the run with an error that names it.

## Make a pack

1. Copy the default pack:
   ```sh
   cp -R brands/creators-toolbox brands/acme
   ```
2. Replace the artwork in `brands/acme/assets/` (see [Assets](#assets)).
3. Edit `brands/acme/brand.json` (see [brand.json](#brandjson)).
4. Check it on a copy of an existing episode. Folders that start with `_` are
   test folders and are never published:
   ```sh
   mkdir -p episodes/_test-acme
   cp -R episodes/<id>/{episode.json,media.json,media,voice.json,vo.wav} episodes/_test-acme/
   REELKIT_BRAND=acme node src/thumbnail.mjs episodes/_test-acme
   REELKIT_BRAND=acme node src/render.mjs episodes/_test-acme --stills
   ```
   Look at `cover.png` and `stills.png`, especially the last still (the CTA
   beat), then delete `episodes/_test-acme`.

## brand.json

| Field | Example | What it drives |
| --- | --- | --- |
| `name` | `Creators Toolbox` | The writer's style guide and prompt ("You write 9:16 news reels for …"), the newspaper hook's masthead (`<name> Daily`), the studio CTA scene's description |
| `handle` | `creatorstoolbox` | The account that replies "Sent! Check your DMs" in the paper CTA's comment thread |
| `site` | `creatorstoolbox.com` | The URL under the lockup on the CTA sign (paper) and card (studio); the style guide |
| `about` | `a free directory of 1,000+ tools for …` | The clause after the site in the style guide's first sentence. Lowercase, no trailing period |
| `hashtag` | `#creatorstoolbox` | Added to every post's hashtags; the writer is told to include it. Must start with `#` |
| `mascot.name` | `Kit` | What the writer's prompts call the mascot, including in every scene description |
| `mascot.description` | `our pink toolbox mascot` | How the style guide introduces the mascot |
| `palette` | `{ "pink": "#FF2B88", … }` | Brand colours, as `#RRGGBB` (see [Palette](#palette)) |
| `assets` | `{ "lockup": "assets/…svg", … }` | Paths relative to the pack folder (see [Assets](#assets)) |
| `cta` | `{ "keyword": "TOOLBOX", … }` | The house call to action that closes every reel (see [Call to action](#call-to-action)) |

Every field is required. Keep the default pack's wording style: sentence case,
plain US English, no hype.

### Palette

All eight brand colours are required. Scenes read them directly.

| Key | Used for |
| --- | --- |
| `ink` | Text and dark surfaces |
| `chalk` | Light text, paper cards and light surfaces |
| `pink` | The main accent: keywords, highlights, the mascot's details, icons |
| `pinkStart`, `pinkEnd` | The brand gradient: the mascot's body, the active caption chip, the mark, big numbers |
| `pinkDeep` | The mascot's arms and other deep accents |
| `rose`, `blush` | Pale brand tints behind avatars, chips and highlights |

The keys keep their Creators Toolbox names (`pink`, `rose`, …) because the
scenes use them; a blue brand still sets `pink` to its blue. A palette may also
override the engine's neutrals (`panel`, `divider`, `mute`, `muteDark`,
`line`) and paper stock (`paperWarm`, `paperCool`, `kraft`, `tape`), though
you rarely need to.

### Assets

| Key | File | Where it shows |
| --- | --- | --- |
| `lockup` | Horizontal logo, full colour, for light surfaces | The CTA sign or card and the cover's series tag |
| `lockupWhite` | The same lockup in all white, for dark or brand-colour surfaces | Loaded with the lockup; no current scene draws it, but dark layouts should |
| `icon` | Square app icon (the site's favicon) | The chip in every beat header and the reply avatar in the CTA |
| `mark` | The logo mark on its own, as outlined paths | The sticker on the mascot, the newspaper masthead and the studio backdrops |

Requirements:

- All four are SVGs, and each `<svg>` has a `viewBox`. Lockups are rasterised
  at 4× their viewBox size; the icon at 512 px wide.
- `mark.svg` has a `<path id="mark" d="…">` and, optionally, a
  `<path id="sparkle" d="…">` drawn with it. Its `viewBox` is the mark's
  bounding box. The mark is drawn as a flat fill or outline, so only the path
  geometry matters, not its colours.
- Use the publisher's own artwork. Don't redraw or trace a logo.

`assets/palette.json` in the default pack is reference material from the
brand kit. The engine reads colours from `brand.json` only.

### Call to action

Every reel ends with the same ask: comment a keyword and get an auto-DM. The
`cta` object is that ask in each form it takes.

| Field | Example | Notes |
| --- | --- | --- |
| `keyword` | `TOOLBOX` | One word, in capitals, as the CTA scenes show it. Letters and digits only |
| `label` | `Comment “TOOLBOX”, we’ll send it` | The CTA beat's header |
| `vo` | `Comment “TOOLBOX” and we’ll send you …` | What the reel says and the captions show. Quote the keyword with curly quotes |
| `speak` | `Comment, Tool box, and we'll send you …` | How the narrator says it. Spell the keyword the way it should sound, with a pause either side |
| `line` | `and we’ll send you daily drops` | The short line under the keyword in the CTA scene |
| `caption` | `Comment “TOOLBOX” and we’ll send you …` | The last line of every post caption |

"We'll send you" is a promise: the account needs an auto-DM (e.g. ManyChat)
that replies to the keyword. To skip the house ask for one
reel, set `"cta": { "house": false }` in that episode.

## What a pack doesn't change

These still live in code. Change them there if a brand needs it, and expect
every pack to change with them.

- **The mascot's drawing** (`src/mascot.mjs`): a card-stock toolbox whose
  handle is the C. It takes the palette's colours and the pack's mark on its
  sticker, but its shape is the same for every pack. `mascot.name` only renames
  it in prompts.
- **Scene layouts and motion** (`src/scenes/`): what each beat looks like, its
  timing and the fixed copy on screen ("COMMENT", "Sent! Check your DMs").
- **Set colours** (`PAPER_SETS` and `STUDIO_SETS` in `src/brand.mjs`): the
  pink, pearl and lavender walls are fixed hex values, not palette keys, as are
  the backdrop tones in `src/brandmark.mjs` and the tape tint in
  `src/overlay.mjs`.
- **Mark geometry assumptions** (`src/brandmark.mjs`): a mark with any viewBox
  is placed and scaled correctly, but `drawMark()`'s default gradient fill and
  the C that `brandPixel()` draws when the icon isn't loaded are positioned for
  the Creators Toolbox mark. No current scene uses either; a new one that does
  should check them with a non-default pack.
- **Type**: Inter and Inter Display (`assets/fonts`).
- **The writer's house style** (`src/write-script.mjs`): the style guide's
  wording beyond the fields above, including "white cards, hairline borders,
  pink accents" and the accent names.
- **The product catalog** (`catalog/`, `src/catalog.mjs`): a pack changes who
  the reel speaks for, not which products it covers. Product pages still point
  to the catalog's site.
