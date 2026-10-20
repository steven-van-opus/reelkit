// The styles: each a skill the writer designs every reel from, not a frame it fills. A styled episode
// (`"style": "<id>"`, `npm run reel -- --url … --style <id>`) is drawn on the full-frame canvas look (src/canvas.mjs),
// which draws only what every reel needs from the style (its background colour, the spoken-word captions in the
// style's treatment, film grain or a vignette, and the closing ask); each scene's code draws everything else on the
// whole 1080 × 1920 frame. The writer gets the style's feel, its identity (what every reel keeps, what each topic
// brings, what is never copied), its reference video and its frame, layered on the best practices every style follows
// (best-practices.mjs: platform safe zones, nothing under the captions, readable sizes, objects that act out the words,
// one material and one motion, a hook on its word and a held payoff, facts from the sources, sets from the topic), and
// the validator checks every scene on the canvas stage (src/code/scene.mjs codeSceneErrors, codeSceneWarnings).
//
// The scene contract for a style (what its reference scenes, and the writer's, may assume):
//   - Coordinates are the frame's own (0–1080 × 0–1920). Backgrounds, textures, rooms and vignettes may run edge to edge.
//   - Words and key visuals stay inside `stage` (CONTENT_ZONE in src/code/safe-zone.mjs: x 60–960, y 250–1280):
//     platform UI covers the edges and the captions are drawn in CAPTION_BAND (y 1300–1470).
//   - `colors` come from the style's palette: `wall` the background, `floor` a deeper tone of it, `ink` text on the
//     background, `chalk` cards and paper, `cardInk` text on chalk, `accent` the primary highlight, `rose` the
//     secondary accent, `blush` a soft tint of the accent (src/canvas.mjs canvasColors).
//   - The same helpers as every code scene (at, clamp, ease*, spring, interpolate, range, torn, <Mark/> for logos,
//     land() and geo() for maps: src/code/map/kit.mjs).
//
// One folder per style, registered by being there: src/styles/<id>/style.mjs default-exports its CanvasStyle (its id
// is the folder's name), usually with its reference video beside it in reference.mjs. Its sound preset is its own
// `sound`, which src/audio/sound.mjs offers under the style's id. A style is named after what it looks like (Lamplit
// diorama, Blueprint HUD, Terminal), never what it's for or whose format it follows. docs/STYLES.md has the steps.

/**
 * How the canvas look draws the spoken words in the style's band (CAPTION_BAND).
 * `kind`: 'line-left' the phrase left-aligned, spoken words full, the word being said in the highlight, the rest
 * dimmed; 'line-center' the same, centred; 'word-chip' one word at a time on a paper chip; 'chips' each word of the
 * phrase on its own chip, the one being said filled with the highlight; 'serif' a quiet centred serif line.
 * `color`, `highlight`, `chip`: palette roles; `dim` the words still to come; `phrase`: at most `max` words or
 * `chars` characters a caption phrase (3 and 22 by default, code/captions.mjs).
 * @typedef {{ kind: 'line-left' | 'line-center' | 'word-chip' | 'chips' | 'serif', font: 'sans' | 'serif' | 'mono',
 *   weight: 500 | 600 | 700 | 800 | 900, size: number, upper: boolean, color: 'ink' | 'chalk' | 'cardInk',
 *   highlight: 'accent' | 'rose' | 'ink' | 'chalk', dim: number, chip?: 'accent' | 'chalk' | 'rose',
 *   phrase?: { max: number, chars: number } }} CaptionTreatment
 */

/**
 * What a style keeps, told apart from what each reel's topic decides (guide.mjs prints it above the reference video).
 * `constant`: what every reel in the style keeps (its characters, finish, overlays, captions, motion, script shape;
 * never a room, a window or another fixed set); `topic`: what is new in every reel (its places, props, costumes,
 * numbers); `never`: what the writer must not copy from the reference video.
 * @typedef {{ constant: string[], topic: string[], never: string[] }} StyleIdentity
 */

/**
 * A style.
 * @typedef {{
 *   id: string,
 *   name: string,
 *   feel: string,
 *   identity: StyleIdentity,
 *   contrast?: { topic: string, title: string, chapters: { label: string, line: string, place: string }[] },
 *   opening: { title: string, line: string, source: string },
 *   examples: { title: string, line: string, source: string }[],
 *   reference?: import('./reference.mjs').ReferenceVideo,
 *   frame: { captions: CaptionTreatment, grain: boolean, vignette: boolean },
 *   palette: { primary: string, accent: string, ink: string, background: string },
 *   sound: import('../audio/sound.mjs').SoundPreset,
 * }} CanvasStyle
 *   `feel`: the visual language, written to the writer (materials, type, colour, layout habits, motion, pacing).
 *   `contrast`: a second reel in the style on another topic, outlined as text for the writer (never drawn).
 *   `opening` and `examples`: scenes to design from for a style without a reference video; a style with one keeps
 *   them only as its first designs. `reference`: a whole reel in the style that a new reel remakes. `sound`: how
 *   reels in it sound (src/audio/sound.mjs SoundPreset), its sound preset under its id.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, CanvasStyle>} Every style folder's, by id (the folder's name), in name order. */
export const STYLES = {};
for (const dir of fs.readdirSync(here, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
  const file = path.join(here, dir, 'style.mjs');
  if (!fs.existsSync(file)) continue;
  const style = (await import(pathToFileURL(file).href)).default;
  if (style?.id !== dir) throw new Error(`styles/${dir}/style.mjs must default-export a style whose id is "${dir}"`);
  STYLES[dir] = style;
}

export const STYLE_IDS = Object.keys(STYLES);

/** The style an id names, or null. */
export const styleOf = id => (typeof id === 'string' && Object.hasOwn(STYLES, id) ? STYLES[id] : null);
