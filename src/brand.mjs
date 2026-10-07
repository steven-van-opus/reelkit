import path from 'path';
import { fileURLToPath } from 'url';
import { GlobalFonts } from '@napi-rs/canvas';
import { BRAND, brandDir } from './brandpack.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// Brand colours come from the brand pack's palette. Scenes read every one of
// these keys, so a pack must define them all.
const BRAND_COLOURS = ['ink', 'chalk', 'pink', 'pinkStart', 'pinkEnd', 'pinkDeep', 'rose', 'blush'];
const missing = BRAND_COLOURS.filter(k => !BRAND.palette[k]);
if (missing.length) throw new Error(`${path.relative(process.cwd(), path.join(brandDir, 'brand.json'))}: palette is missing ${missing.join(', ')}`);

// The neutrals and paper stock below are the engine's own; a pack's palette
// may still override them.
export const C = {
  panel: '#1B1C22',
  divider: '#33343D',
  mute: '#646474',
  muteDark: '#B9BAC6',
  line: '#DEDEE6',
  // Paper stock used for the diorama sets — warm off-whites read as card
  // stock on camera, pure #FFF reads as a screen.
  paperWarm: '#F7F1EC',
  paperCool: '#EEEDF2',
  kraft: '#E9D9C4',
  tape: '#F3E6CF',
  ...BRAND.palette,
};

// Safe areas for Instagram/TikTok 9:16: the top ~120px carries the app's own
// header and the bottom ~330px the caption, username and audio row; the right
// edge carries like/comment/share buttons.
export const SAFE = {
  top: 150,
  bottom: H - 340,
  left: 70,
  right: W - 150,
};

// Layout bands shared by every scene.
export const BAND = {
  headerY: 236,       // centre line of the taped beat label
  stageTop: 330,      // diorama content lives between stageTop and stageBottom
  stageBottom: 1420,
  floorY: 1330,       // where the set's floor/desk meets the wall
  captionY: 1500,     // centre line of the spoken-word caption chips
};

const FONT_FILES = {
  400: 'Inter-Regular.ttf',
  500: 'Inter-Medium.ttf',
  600: 'Inter-SemiBold.ttf',
  700: 'Inter-Bold.ttf',
  800: 'Inter-ExtraBold.ttf',
  900: 'Inter-Black.ttf',
};

// Inter Display — the site's --ct-font-display — for headlines. Registered as
// 'd500' / 'd600' / 'd700', so font('d600', 72) picks Inter Display SemiBold.
const DISPLAY_FILES = {
  d500: 'InterDisplay-Medium.ttf',
  d600: 'InterDisplay-SemiBold.ttf',
  d700: 'InterDisplay-Bold.ttf',
  d800: 'InterDisplay-ExtraBold.ttf',
  d900: 'InterDisplay-Black.ttf',
};

let registered = false;
export function registerFonts() {
  if (registered) return;
  for (const [weight, file] of Object.entries({ ...FONT_FILES, ...DISPLAY_FILES })) {
    GlobalFonts.registerFromPath(path.join(ROOT, 'assets/fonts', file), `Inter${weight}`);
  }
  registered = true;
}

// font(900, 64) → '64px Inter900'; font('d600', 64) → Inter Display SemiBold.
// In the studio theme, display sizes (≥ 34px) switch to Inter Display and the
// heavy paper weights relax toward the site's medium/semibold headings.
// Plain Inter is cut for small UI text and turns airy when large. On a 1080p
// reel anything from 22px up reads as display type, so it uses Inter Display,
// as the site does for headings. Paper keeps its heavy weights; studio relaxes
// them toward the site's medium headings.
const DISPLAY_MIN = 22;
function face(weight, size) {
  if (typeof weight === 'string') return weight;
  if (!isStudio()) return size >= DISPLAY_MIN && weight >= 500 ? `d${Math.min(900, Math.round(weight / 100) * 100)}` : weight;
  if (size >= DISPLAY_MIN) return weight >= 900 ? 'd700' : weight >= 700 ? 'd600' : 'd500';
  return weight >= 800 ? 700 : weight;
}
export const font = (weight, size) => `${Math.round(size)}px Inter${face(weight, size)}`;

// Visual theme. 'paper' (default) is the hand-made cut-paper look: grain, torn
// edges, tape, warm paper sets, stop-motion. 'studio' (REELS_THEME=studio)
// follows the site's design system: clean cards, Inter Display, smooth motion.
// `texture` keeps the cut-paper material (grain, fibres, lit edges, warm paper
// shadows) under the studio design language; REELS_TEXTURE=0 renders it flat.
export const THEME = { material: process.env.REELS_THEME || 'paper', texture: process.env.REELS_TEXTURE !== '0' };
export const isStudio = () => THEME.material === 'studio';

// Studio surfaces, after the site: light (#FAFAFC), muted (#F5F5F5), pearl and
// lavender tints, ink (#101014) and the brand pink. `motif` is the BrandBackdrop
// variant drawn behind the scene.
export const STUDIO_SETS = {
  light: { wall: '#FAFAFC', wallDeep: '#F1F1F5', floor: '#EDEDF2', floorEdge: '#DEDEE6', ink: C.ink, motif: 'mark', tone: 'neutral' },
  muted: { wall: '#F5F5F5', wallDeep: '#ECECEF', floor: '#E6E6EB', floorEdge: '#D6D6DE', ink: C.ink, motif: 'tiles', tone: 'neutral' },
  pearl: { wall: '#FFF5FB', wallDeep: '#FFEAF5', floor: '#FFE0F0', floorEdge: '#FFC9E3', ink: C.ink, motif: 'orbits', tone: 'pink' },
  lavender: { wall: '#FFE9F7', wallDeep: '#FFD9F0', floor: '#FFCFEA', floorEdge: '#FFB8DD', ink: C.ink, motif: 'mark', tone: 'pink' },
  ink: { wall: '#16161C', wallDeep: '#101014', floor: '#1B1C22', floorEdge: '#33343D', ink: C.chalk, motif: 'orbits', tone: 'light' },
  pink: { wall: '#FF338A', wallDeep: '#FF2387', floor: '#E81C7A', floorEdge: '#C9156A', ink: C.chalk, motif: 'mark', tone: 'light' },
};
// Scripts written against the paper sets keep working.
export const SET_ALIASES = { rose: 'pearl', chalk: 'light', sky: 'muted', mint: 'lavender', night: 'ink', pink: 'pink' };

// Background "sets" — each beat picks one so consecutive beats feel like
// different spots in the same paper world.
export const PAPER_SETS = {
  rose: { wall: '#FFE4F1', wallDeep: '#FFC9E3', floor: '#F6B3D3', floorEdge: '#E98DBA', ink: C.ink },
  chalk: { wall: '#F6F0EA', wallDeep: '#EADFD5', floor: '#DCC8B6', floorEdge: '#C7AE98', ink: C.ink },
  night: { wall: '#1E1E26', wallDeep: '#15151B', floor: '#2A2A34', floorEdge: '#3A3A47', ink: C.chalk },
  pink: { wall: '#FF4F9C', wallDeep: '#F0257F', floor: '#D81570', floorEdge: '#B5105D', ink: C.chalk },
  // Every paper set stays warm: 'sky' (muted) is sand-kraft, 'mint' (lavender) a blush lilac.
  sky: { wall: '#F1E4D1', wallDeep: '#E6D2B8', floor: '#D2B593', floorEdge: '#BC9C78', ink: C.ink },
  mint: { wall: '#F0E3F2', wallDeep: '#E4D1E8', floor: '#F2C3DA', floorEdge: '#E3A2C3', ink: C.ink },
};

// What each set name looks like in the paper theme (for the script writer).
export const PAPER_SET_LOOKS = {
  pearl: 'pink paper with printed stripes',
  light: 'warm cream card with printed dots',
  muted: 'sand-coloured kraft with soft stripes',
  lavender: 'blush-lilac paper with soft stripes',
  ink: 'night: near-black paper with a paper window, stars and a pink moon',
  pink: 'hot-pink stage backdrop (the CTA)',
};

// The PAPER_SETS key a set name resolves to in the paper theme
// ('pearl' → 'rose', 'ink' → 'night', 'rose' → 'rose').
export function paperSetKey(name) {
  if (PAPER_SETS[name]) return name;
  return Object.keys(SET_ALIASES).find(k => SET_ALIASES[k] === name && PAPER_SETS[k]) || 'rose';
}

// SETS[name] resolves either vocabulary for the active theme.
export const SETS = new Proxy({}, {
  get(_, name) {
    if (typeof name !== 'string') return undefined;
    if (isStudio()) return STUDIO_SETS[name] || STUDIO_SETS[SET_ALIASES[name]];
    return PAPER_SETS[name] || PAPER_SETS[Object.keys(SET_ALIASES).find(k => SET_ALIASES[k] === name && PAPER_SETS[k])];
  },
  has(_, name) { return name in STUDIO_SETS || name in SET_ALIASES || name in PAPER_SETS; },
  ownKeys() { return [...new Set([...Object.keys(STUDIO_SETS), ...Object.keys(SET_ALIASES)])]; },
  getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; },
});
