// Media beat: one real image or video from the episode's sources, big — it's
// the star. It rises in on a spring inside a house frame (a site card, the
// browser frame or a phone), settles, then slowly pushes in (toward
// props.focus when given) while videos play. An ink caption pill sits under
// the frame and Kit points at it from the floor corner.
//
// In the paper look (the default) the same media is a taped photo PRINT on the
// wall instead — chalk border, a slight tilt, tape, a lift shadow and the
// stop-motion boil — or a paper app window / paper phone; see drawPaper().
//
// Also exports the framed-media helpers the gallery, screenshot and prompt
// scenes share (site cards for studio, prints/tape/stickers for paper).
import { createCanvas } from '@napi-rs/canvas';
import { W, C, BAND, isStudio } from '../brand.mjs';
import { paper, disc, tape, roundRectPath, tornRectPath, grainCanvas, pinkGradient, fitSize, fitWrapped, text, measure } from '../paper.mjs';
import { pill, icon, appWindow } from '../fx.mjs';
import { lucideIcon } from '../icons.mjs';
import { brandGradient } from '../brandmark.mjs';
import { screenshotFrame } from '../shots.mjs';
import { drawCover } from '../mediastore.mjs';
import { toolInfo, logoTile } from '../logos.mjs';
import { clamp, lerp, ease, luminance, rng, boil, onTwos, hexToRgb } from '../util.mjs';

const FRAMES = ['card', 'browser', 'phone'];
const TOP = 384;            // frames start below the header
const KIT_TOP = 1112;       // a frame wider than the side gap must end above Kit's head
const FLOOR = 1330;         // …otherwise it may run down to the floor line
const SIDE_W = 590;         // widest frame that still leaves Kit room beside it
const KIT_X = 192;          // Kit's floor spot: its arms stay inside the safe zone (x ≥ 70)
const CAPTION_H = 96;       // room reserved under the frame for the caption pill
const BAR = 58;             // screenshotFrame's top bar
const RES = 1.5;            // offscreen supersampling for the browser content

// ---------------------------------------------------------------- helpers

// First media id in a prop that may be a string or an array.
export const firstId = v => (Array.isArray(v) ? v.find(x => typeof x === 'string') : typeof v === 'string' ? v : null) || null;

// A focus box [x, y, w, h] in 0–1 of the image, or null when malformed.
export function readFocus(f) {
  if (!Array.isArray(f) || f.length !== 4 || !f.every(Number.isFinite)) return null;
  const [x, y, w, h] = f.map(v => clamp(v));
  return w > 0.02 && h > 0.02 ? [x, Math.min(y, 1 - h), Math.min(w, 1 - x), h] : null;
}

// Push-in that frames the focus box at ~85% of the frame, kept gentle.
export function focusZoom(img, w, h, focus) {
  if (!img || !focus) return 1.07;
  const k0 = Math.max(w / img.width, h / img.height);
  const z = 0.85 * Math.min(w / (focus[2] * img.width * k0), h / (focus[3] * img.height * k0));
  return clamp(z, 1.1, 1.5);
}

// Cover-fit `img` into (x, y, w, h) at `zoom`, with the frame centre drifting
// from the image centre toward the focus box's centre as `toward` goes 0 → 1.
export function drawMedia(ctx, img, x, y, w, h, { zoom = 1, focus = null, toward = 0 } = {}) {
  if (!img) return;
  const k = Math.max(w / img.width, h / img.height) * zoom;
  const iw = img.width * k, ih = img.height * k;
  const u = focus ? lerp(0.5, focus[0] + focus[2] / 2, toward) : 0.5;
  const v = focus ? lerp(0.5, focus[1] + focus[3] / 2, toward) : 0.5;
  // drawCover pans by px/py in −1..1 of the overflow: solve for the pan that
  // puts image point (u, v) at the frame centre, clamped so the frame stays covered.
  const px = iw - w > 0.5 ? clamp(((2 * u - 1) * iw) / (iw - w), -1, 1) : 0;
  const py = ih - h > 0.5 ? clamp(((2 * v - 1) * ih) / (ih - h), -1, 1) : 0;
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  drawCover(ctx, img, x, y, w, h, { zoom, px, py });
  ctx.restore();
}

// The brand-pink set, where pink accents vanish and need a stand-in.
export const isPinkWall = set => !!set && set.tone === 'light' && luminance(set.wall) > 0.12;

// Soft brand-pink bloom behind a frame (white on the pink set).
export function glowBehind(ctx, x, y, w, h, { set = null, strength = 1 } = {}) {
  const pinkWall = isPinkWall(set);
  const rgb = pinkWall ? '255,255,255' : '255,43,136';
  const a = (pinkWall ? 0.26 : set?.tone === 'light' ? 0.30 : 0.20) * strength;
  const cx = x + w / 2, cy = y + h * 0.58, r = Math.max(w, h) * 0.78;
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

// Two-layer site shadow (a deep soft one and a tight contact one) under a
// rounded shape, filled with `fill`.
function liftedShape(ctx, x, y, w, h, r, { fill = '#FFFFFF', lift = 1 } = {}) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.shadowColor = `rgba(16,16,20,${0.12 + lift * 0.08})`;
  ctx.shadowBlur = 40 + lift * 28;
  ctx.shadowOffsetY = 16 + lift * 16;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.shadowColor = 'rgba(16,16,20,0.10)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fill();
  ctx.restore();
}

function hairline(ctx, x, y, w, h, r, color = 'rgba(16,16,20,0.10)', width = 1.5) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + width / 2, y + width / 2, w - width, h - width, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

// Neutral stand-in when a media id is missing: an image glyph and the label.
function placeholder(ctx, x, y, w, h, label) {
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(x, y, w, h);
  const big = Math.min(w, h) > 360;
  const iconY = label && big ? y + h / 2 - 54 : y + h / 2;
  lucideIcon(ctx, 'Image', x + w / 2, iconY, big ? 76 : 52, { color: '#A9AAB6', stroke: 1.75 });
  if (!label || !big) return;
  const { size, lines } = fitWrapped(ctx, label, 'd600', w - 120, 2, 48, 34);
  lines.forEach((l, i) => text(ctx, l, x + w / 2, y + h / 2 + 30 + size * 0.5 + i * size * 1.08, { weight: 'd600', size, color: C.mute }));
}

// Thin playback bar along the bottom of a playing video.
function progressBar(ctx, x, y, w, h, p) {
  const bw = w - 48, bx = x + 24, by = y + h - 26;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, 6, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(bx, by, Math.max(6, bw * p), 6, 3);
  ctx.fillStyle = brandGradient(ctx, bx, by, bx + bw, by);
  ctx.fill();
  ctx.restore();
}

// A site card holding media: white surface, `radius` corners, hairline border,
// deep soft shadow; the media sits inset with its own rounded corners.
//   ring    0..1 brand-pink outline (the highlighted card in a gallery);
//           ringColor overrides it (ink on the pink set)
//   video   0..1 playback position, draws the progress bar
export function mediaCard(ctx, x, y, w, h, { img = null, radius = 28, inset = 12, lift = 1, ring = 0, ringColor = null, zoom = 1, focus = null, toward = 0, video = null, label = '' } = {}) {
  liftedShape(ctx, x, y, w, h, radius, { lift });
  hairline(ctx, x, y, w, h, radius);
  const ix = x + inset, iy = y + inset, iw = w - inset * 2, ih = h - inset * 2, ir = Math.max(6, radius - inset * 0.75);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(ix, iy, iw, ih, ir);
  ctx.clip();
  if (img) drawMedia(ctx, img, ix, iy, iw, ih, { zoom, focus, toward });
  else placeholder(ctx, ix, iy, iw, ih, label);
  if (img && video !== null) progressBar(ctx, ix, iy, iw, ih, video);
  ctx.restore();
  // Keeps light media from bleeding into the white card.
  if (img) hairline(ctx, ix, iy, iw, ih, ir, 'rgba(16,16,20,0.08)', 1.5);
  if (ring > 0) {
    ctx.save();
    ctx.globalAlpha *= clamp(ring);
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 5, w + 10, h + 10, radius + 5);
    ctx.strokeStyle = ringColor || brandGradient(ctx, x, y, x + w, y + h);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
}

// A clean device: ink bezel, dynamic island, side buttons; the media fills the
// screen. Works upright or on its side (landscape media).
function phoneFrame(ctx, x, y, w, h, { img, zoom, focus, toward, label, video }) {
  const side = w > h;
  const r = Math.min(64, Math.min(w, h) * 0.13), bez = Math.round(Math.min(w, h) * 0.03) + 2;
  // Buttons stick out of the body a few px.
  ctx.fillStyle = '#26272E';
  const btn = (bx, by, bw, bh) => { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.fill(); };
  if (side) {
    btn(x + w * 0.2, y - 5, 70, 8); btn(x + w * 0.2 + 86, y - 5, 70, 8); btn(x + w * 0.68, y + h - 3, 96, 8);
  } else {
    btn(x - 5, y + h * 0.18, 8, 64); btn(x - 5, y + h * 0.18 + 80, 8, 64); btn(x + w - 3, y + h * 0.24, 8, 104);
  }
  liftedShape(ctx, x, y, w, h, r, { fill: C.ink, lift: 1.3 });
  hairline(ctx, x + 2, y + 2, w - 4, h - 4, r - 2, 'rgba(255,255,255,0.16)', 2);
  const sx = x + bez, sy = y + bez, sw = w - bez * 2, sh = h - bez * 2, sr = r - bez;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, sr);
  ctx.clip();
  if (img) drawMedia(ctx, img, sx, sy, sw, sh, { zoom, focus, toward });
  else placeholder(ctx, sx, sy, sw, sh, label);
  // Dynamic island and home indicator.
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  if (side) ctx.roundRect(sx + 18, sy + sh / 2 - sh * 0.15, 32, sh * 0.3, 16);
  else ctx.roundRect(sx + sw / 2 - sw * 0.16, sy + 18, sw * 0.32, 34, 17);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.beginPath();
  if (side) ctx.roundRect(sx + sw / 2 - sw * 0.14, sy + sh - 16, sw * 0.28, 6, 3);
  else ctx.roundRect(sx + sw / 2 - sw * 0.17, sy + sh - 18, sw * 0.34, 7, 3.5);
  ctx.fill();
  if (img && video !== null && side) progressBar(ctx, sx, sy, sw, sh - 18, video);
  ctx.restore();
}

// Browser content is composed offscreen (supersampled) and handed to
// screenshotFrame as its image, so the frame's chrome stays the house one
// while the content can push toward a focus or scroll a tall page.
const offscreen = new Map();
function contentCanvas(w, h) {
  const key = `${w}x${h}`;
  if (!offscreen.has(key)) offscreen.set(key, createCanvas(w, h));
  return offscreen.get(key);
}

export function browserContent(img, w, h, { zoom, focus, toward, scroll }) {
  const cw = Math.round(w * RES), ch = Math.round(h * RES);
  const cv = contentCanvas(cw, ch);
  const g = cv.getContext('2d');
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, cw, ch);
  const fitH = img.height * (cw / img.width);
  if (!focus && fitH > ch * 1.15) {
    // A tall page: fit the width and scroll down it.
    const travel = Math.min(fitH - ch, ch * 1.4);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, -travel * scroll, cw, fitH);
  } else {
    drawMedia(g, img, 0, 0, cw, ch, { zoom, focus, toward });
  }
  return cv;
}

// ---------------------------------------------------------------- layout

// Frame rect for media of aspect `ar`. Each frame is sized two ways — wide
// with Kit standing below it, or narrow with Kit beside it — and the larger
// one wins. Returns { x, y, w, h, kitBelow, side } (side: a phone on its side).
function layout(frame, ar, hasCaption) {
  const cap = hasCaption ? CAPTION_H : 0;
  // Largest w × h within maxW × maxH whose inner area (minus padX/padY) has aspect a.
  const box = (maxW, maxH, a, padX = 0, padY = 0) => {
    let w = maxW, h = (w - padX) / a + padY;
    if (h > maxH) { h = maxH; w = (h - padY) * a + padX; }
    return { w: Math.round(w), h: Math.round(h) };
  };
  const place = ({ w, h }, kitBelow, extra = {}) => {
    const bottom = (kitBelow ? KIT_TOP : FLOOR) - cap;
    // Beside Kit the frame sits a little right of centre, so it and its caption clear him.
    const cx = kitBelow ? W / 2 : Math.min(1010 - w / 2, Math.max(590, 290 + w / 2));
    return { x: Math.round(cx - w / 2), y: Math.round((TOP + bottom - h) / 2), w, h, kitBelow, ...extra };
  };
  const belowH = KIT_TOP - cap - TOP, besideH = FLOOR - cap - TOP;

  if (frame === 'browser') {
    // Always a wide window; anything taller than ~4:3 shows its top and scrolls.
    return place(box(940, belowH, clamp(ar, 1.3, 2.1), 0, BAR), true);
  }
  if (frame === 'phone') {
    if (ar > 1.15) {
      const a = clamp(ar, 1.6, 2.17);
      return place(box(940, belowH, a * 0.985), true, { side: true });
    }
    return place(box(SIDE_W, besideH, clamp(ar, 0.46, 0.7) * 1.02), false, { side: false });
  }
  // Card: the media sits inside a 12px inset, so size the card around it.
  const a = clamp(ar, 0.5, 2.2);
  const wide = box(940, belowH, a, 24, 24);
  const narrow = box(SIDE_W, besideH, a, 24, 24);
  return wide.w * wide.h >= narrow.w * narrow.h ? place(wide, true) : place(narrow, false);
}

// ---------------------------------------------------------------- paper prints
//
// The paper look shows real media as things pinned to the wall: a photo print
// (chalk border, thicker at the bottom like an instant photo when it carries a
// caption), a paper app window or a paper phone — tilted a little, taped,
// lifted off the wall by a soft shadow and boiling on twos. Logos are stuck on
// as chalk stickers, captions are written on the print or on a torn label.

// Border of a print whose outer box is w × h: ~5% of its short side.
export const printBorder = (w, h) => Math.round(clamp(0.05 * Math.min(w, h), 12, 34));

// Bottom border tall enough to carry `lines` caption lines of `size` px.
export const captionBand = (b, size, lines = 1) => Math.round(b * 0.8 + size * (1.7 + (lines - 1) * 1.14));

// Outer size { w, h, border, bottom } of the largest print of image aspect `a`
// that fits maxW × maxH (with a caption band when captionSize > 0).
export function fitPrint(a, maxW, maxH, captionSize = 0, captionLines = 1) {
  let b = printBorder(maxW, maxH), out = null;
  for (let pass = 0; pass < 2; pass++) {
    const bottom = captionSize ? captionBand(b, captionSize, captionLines) : b;
    let w = maxW, h = (w - 2 * b) / a + b + bottom;
    if (h > maxH) { h = maxH; w = (h - b - bottom) * a + 2 * b; }
    out = { w: Math.round(w), h: Math.round(h), border: b, bottom };
    b = printBorder(w, h);
  }
  return out;
}

// The pink paper set, where a pink label would vanish.
export const isPaperPinkWall = set => {
  if (!set?.wall) return false;
  const [r, g] = hexToRgb(set.wall);
  return r > 200 && g < 140;
};

// Paper fibres over a photo so it reads as printed, not on a screen.
const photoGrain = new WeakMap();
function grainOver(ctx, x, y, w, h, alpha) {
  let pat = photoGrain.get(ctx);
  if (!pat) photoGrain.set(ctx, (pat = ctx.createPattern(grainCanvas('light'), 'repeat')));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Blank photo paper with an image glyph and the beat label when media is missing.
function paperPlaceholder(ctx, x, y, w, h, label) {
  ctx.fillStyle = '#ECE5DC';
  ctx.fillRect(x, y, w, h);
  grainOver(ctx, x, y, w, h, 1);
  const big = Math.min(w, h) > 320;
  icon(ctx, 'image', x + w / 2, label && big ? y + h / 2 - 48 : y + h / 2, big ? 92 : 64, '#A89D92');
  if (!label || !big) return;
  const { size, lines } = fitWrapped(ctx, label, 800, w - 100, 2, 46, 34);
  lines.forEach((l, i) => text(ctx, l, x + w / 2, y + h / 2 + 22 + size * 0.5 + i * size * 1.1, { weight: 800, size, color: '#8C8279' }));
}

// Ink paper disc with a chalk play mark: this print is footage.
function playSticker(ctx, cx, cy, r) {
  disc(ctx, cx, cy, r, { fill: C.ink, lift: 0.9, rim: 0.4, seed: 'play-sticker' });
  icon(ctx, 'play', cx + r * 0.1, cy, r * 1.2, C.chalk);
}

// Whether `str` needs a second line on a print border maxW wide.
export const captionLinesFor = (ctx, str, maxW) => (str && measure(ctx, str, 700, 34) > maxW ? 2 : 1);

// Caption written on a print's border (Inter 700, ≤ `lines` lines), shrunk
// then truncated to fit, revealed left to right as `reveal` goes 0 → 1.
function printCaption(ctx, str, cx, cy, maxW, size, lines = 1, reveal = 1) {
  if (!str || reveal <= 0) return;
  const fit = fitWrapped(ctx, str, 700, maxW, lines, size, 32);
  const lh = fit.size * 1.14;
  const tw = Math.max(...fit.lines.map(l => measure(ctx, l, 700, fit.size)));
  ctx.save();
  if (reveal < 1) {
    ctx.beginPath();
    ctx.rect(cx - tw / 2 - 6, cy - fit.lines.length * lh, (tw + 12) * reveal, fit.lines.length * lh * 2);
    ctx.clip();
  }
  fit.lines.forEach((l, i) => text(ctx, l, cx, cy + (i - (fit.lines.length - 1) / 2) * lh, { weight: 700, size: fit.size, color: C.ink }));
  ctx.restore();
}

// A photo print with outer box (x, y, w, h). The media is cover-fit inside
// the border (pushed in / toward `focus`); `develop` 0 → 1 clears it from
// blank instant film; `caption` is written on the bottom border. Returns the
// picture's rect.
export function photoPrint(ctx, x, y, w, h, {
  img = null, border = null, bottom = null, lift = 1.6, zoom = 1, focus = null, toward = 0,
  develop = 1, video = false, label = '', caption = '', captionSize = 40, captionLines = 1, captionReveal = 1,
} = {}) {
  const b = border ?? printBorder(w, h);
  const bot = bottom ?? (caption ? captionBand(b, captionSize, captionLines) : b);
  paper(ctx, c => roundRectPath(c, x, y, w, h, 5), { fill: C.chalk, lift, rim: 0.8, grain: 0.9 });
  const ix = x + b, iy = y + b, iw = w - 2 * b, ih = h - b - bot;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();
  if (img) {
    drawMedia(ctx, img, ix, iy, iw, ih, { zoom, focus, toward });
    if (develop < 1) {
      ctx.fillStyle = `rgba(228,223,214,${1 - ease.inOutQuad(clamp(develop))})`;
      ctx.fillRect(ix, iy, iw, ih);
    }
    grainOver(ctx, ix, iy, iw, ih, 0.7);
  } else {
    paperPlaceholder(ctx, ix, iy, iw, ih, label);
  }
  ctx.restore();
  // Where the emulsion meets the border.
  ctx.save();
  ctx.strokeStyle = 'rgba(16,16,20,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(ix + 1, iy + 1, iw - 2, ih - 2);
  ctx.restore();
  if (img && video && develop >= 0.6) playSticker(ctx, ix + 48, iy + 48, clamp(Math.min(iw, ih) * 0.08, 22, 32));
  if (caption) printCaption(ctx, caption, x + w / 2, y + h - bot / 2 + b * 0.08, w - 2 * b - 24, captionSize, captionLines, captionReveal);
  return { x: ix, y: iy, w: iw, h: ih };
}

// Tape holding something to the wall: 1–2 strips at its corners or along its
// top, picked by `seed` (or `style`: 'corners' | 'top' | 'diagonal' | 'pair' |
// 'left'). `k` 0 → 1 slaps them on. Draw it in the same transform as the print.
export function printTape(ctx, x, y, w, h, { seed = 'print', k = 1, style = null, scale = 1, color = null } = {}) {
  if (k <= 0) return;
  const r = rng(`${seed}-tape`);
  // Masking tape or pink washi, per print.
  const col = color || (r() < 0.45 ? C.blush : C.tape);
  const len = clamp(Math.min(w, h) * 0.22, 84, 132) * scale, th = clamp(36 * scale, 28, 40);
  const pick = style || ['corners', 'top', 'diagonal', 'pair'][Math.floor(r() * 4)];
  const jit = () => (r() - 0.5) * 0.16;
  const strips = {
    corners: [[x + 12, y + 8, -0.7], [x + w - 12, y + 8, 0.7]],
    top: [[x + w * (0.42 + r() * 0.16), y - 2, jit()]],
    diagonal: [[x + 12, y + 8, -0.7], [x + w - 12, y + h - 8, -0.7]],
    pair: [[x + w * 0.24, y - 2, -0.08], [x + w * 0.76, y - 2, 0.07]],
    left: [[x + 12, y + 8, -0.7], [x + w * 0.58, y - 2, 0.04]],
  }[pick] || [];
  strips.forEach(([cx, cy, a], i) => tape(ctx, cx, cy, len * lerp(0.55, 1, clamp(k)), th, a + jit(), { seed: `${seed}-t${i}`, color: col, alpha: 0.86 * clamp(k * 1.6) }));
}

// A tool's logo tile on a small chalk paper square, stuck on like a sticker
// (slightly rotated, a strip of tape across the top). `k` 0 → 1 slaps it on.
export function logoSticker(ctx, cx, cy, size, { toolId, rot = -0.1, k = 1, seed = 'logo' } = {}) {
  if (k <= 0 || !toolId) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot + (1 - k) * 0.25);
  ctx.scale(1 + (1 - k) * 0.45, 1 + (1 - k) * 0.45);
  ctx.globalAlpha *= clamp(k * 3);
  paper(ctx, c => roundRectPath(c, -size / 2, -size / 2, size, size, size * 0.14), { fill: C.chalk, lift: 1.4, rim: 0.8 });
  logoTile(ctx, 0, 0, size * 0.68, { toolId, shadow: false });
  tape(ctx, 0, -size / 2 + 2, size * 0.62, 30, 0.06, { seed: `${seed}-tape`, alpha: 0.8 });
  ctx.restore();
}

// A caption on a torn strip of paper — pink, or ink on the pink set — taped
// on, centred near cx (kept inside minX…maxX). Returns { w, h }.
export function tornLabel(ctx, cx, cy, str, { maxW = 640, size = 42, rot = -0.035, k = 1, set = null, seed = 'label', minX = 70, maxX = 1010 } = {}) {
  if (!str || k <= 0) return null;
  const room = Math.min(maxW, maxX - minX) - 64;
  const { size: sz, lines } = fitWrapped(ctx, str, 800, room, 2, size, 34);
  const tw = Math.max(...lines.map(l => measure(ctx, l, 800, sz)));
  const w = tw + 64, h = lines.length * sz * 1.14 + 36;
  const x = clamp(cx, minX + w / 2, maxX - w / 2);
  ctx.save();
  ctx.translate(x, cy);
  ctx.rotate(rot + (1 - k) * 0.1);
  ctx.scale(1 + (1 - k) * 0.5, 1 + (1 - k) * 0.5);
  ctx.globalAlpha *= clamp(k * 3);
  const fill = isPaperPinkWall(set) ? C.ink : pinkGradient(ctx, -w / 2, -h / 2, w / 2, h / 2);
  paper(ctx, c => tornRectPath(c, -w / 2, -h / 2, w, h, { seed: `${seed}-${str}`, rough: 3.5, step: 11 }), { fill, lift: 1.8, rim: 0.6 });
  lines.forEach((l, i) => text(ctx, l, 0, 3 + (i - (lines.length - 1) / 2) * sz * 1.14, { weight: 800, size: sz, color: C.chalk }));
  tape(ctx, -w / 2 + 10, -h / 2 + 4, 76, 30, -0.7, { seed: `${seed}-tape`, alpha: 0.75 });
  ctx.restore();
  return { w, h };
}

const domainOf = (s = '') => { try { return new URL(s).hostname.replace(/^www\./, ''); } catch { return String(s); } };
export const WINDOW_BAR = 58;   // fx.appWindow's title bar
export const WINDOW_INSET = 12; // chalk margin around the pasted-in content

// A paper app window (fx.appWindow, the domain as its title) with `content`
// (an image or canvas, drawn to fill) pasted in under the bar.
export function paperWindow(ctx, x, y, w, h, { content = null, url = '', label = '', video = false } = {}) {
  let title = domainOf(url);
  if (title.length > 34) title = `${title.slice(0, 33)}…`;
  const inner = appWindow(ctx, x, y, w, h, { title, fill: C.chalk, bar: C.ink, lift: 2.2, r: 22 });
  const m = WINDOW_INSET;
  const ix = inner.x + m, iy = inner.y + m, iw = inner.w - m * 2, ih = inner.h - m * 2;
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, ix, iy, iw, ih, 12);
  ctx.clip();
  if (content) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(content, ix, iy, iw, ih);
    grainOver(ctx, ix, iy, iw, ih, 0.6);
  } else {
    paperPlaceholder(ctx, ix, iy, iw, ih, label);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(16,16,20,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRectPath(ctx, ix + 1, iy + 1, iw - 2, ih - 2, 11);
  ctx.stroke();
  ctx.restore();
  if (content && video) playSticker(ctx, ix + 48, iy + 48, 30);
  return { x: ix, y: iy, w: iw, h: ih };
}

// A phone cut from ink card stock, the media filling its screen. Upright, or
// on its side for landscape media.
function paperPhone(ctx, x, y, w, h, { img, side, zoom, focus, toward, label, video }) {
  const r = Math.min(66, Math.min(w, h) * 0.14), bez = Math.round(Math.min(w, h) * 0.035) + 8;
  paper(ctx, c => roundRectPath(c, x, y, w, h, r), { fill: C.ink, lift: 2.2, rim: 0.7 });
  const sx = x + bez, sy = y + bez, sw = w - bez * 2, sh = h - bez * 2, sr = Math.max(12, r - bez);
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, sx, sy, sw, sh, sr);
  ctx.clip();
  if (img) {
    drawMedia(ctx, img, sx, sy, sw, sh, { zoom, focus, toward });
    grainOver(ctx, sx, sy, sw, sh, 0.6);
  } else {
    paperPlaceholder(ctx, sx, sy, sw, sh, label);
  }
  ctx.restore();
  // Speaker slot cut from the same ink card, and a chalk home bar.
  const slot = side ? [sx + 14, sy + sh / 2 - sh * 0.14, 28, sh * 0.28] : [sx + sw / 2 - sw * 0.15, sy + 16, sw * 0.3, 32];
  paper(ctx, c => roundRectPath(c, ...slot, 14), { fill: C.ink, lift: 0.4, rim: 0.3 });
  ctx.fillStyle = 'rgba(250,250,252,0.85)';
  ctx.beginPath();
  if (side) roundRectPath(ctx, sx + sw / 2 - sw * 0.13, sy + sh - 16, sw * 0.26, 7, 3.5);
  else roundRectPath(ctx, sx + sw / 2 - sw * 0.17, sy + sh - 18, sw * 0.34, 8, 4);
  ctx.fill();
  if (img && video) playSticker(ctx, sx + (side ? 76 : 50), sy + (side ? 48 : 84), 30);
}

// Paper layout: the frame sized two ways — wide above Kit's head, or narrow
// beside him running down toward the floor — and the larger wins. Tilted
// things need slack, and a window/phone caption needs room for its label.
const P_TOP = 400;                                  // frame top (tape pokes up above it)
const P_WIDE = { x0: 90, x1: 990, bottom: 1150 };   // Kit stands below
const P_SIDE = { x0: 296, x1: 1004, bottom: 1300 }; // Kit stands beside
const P_SLACK = 44;                                 // room for the tilt and the boil
const P_LABEL_H = 104;                              // torn caption label under a window/phone
const P_CAPTION = 40;                               // caption size on a print's border

function paperLayout(frame, ar, caption, capLines = 1) {
  const label = caption && frame !== 'card' ? P_LABEL_H : 0;
  const cap = caption && frame === 'card' ? P_CAPTION : 0;
  const room = R => ({ maxW: R.x1 - R.x0 - P_SLACK, maxH: R.bottom - label - P_TOP - P_SLACK });
  const box = (maxW, maxH, a, padX = 0, padY = 0) => {
    let w = maxW, h = (w - padX) / a + padY;
    if (h > maxH) { h = maxH; w = (h - padY) * a + padX; }
    return { w: Math.round(w), h: Math.round(h) };
  };
  const place = (sz, kitBelow, extra = {}) => {
    const R = kitBelow ? P_WIDE : P_SIDE;
    const cx = kitBelow ? W / 2 : Math.min(R.x1 - P_SLACK / 2 - sz.w / 2, Math.max(620, R.x0 + P_SLACK / 2 + sz.w / 2));
    return { x: Math.round(cx - sz.w / 2), y: Math.round((P_TOP + R.bottom - label - sz.h) / 2), ...sz, kitBelow, ...extra };
  };
  const wide = room(P_WIDE), side = room(P_SIDE);
  if (frame === 'browser') {
    const pad = WINDOW_INSET * 2;
    return place(box(wide.maxW, wide.maxH, clamp(ar, 1.3, 2.1), pad, WINDOW_BAR + pad), true);
  }
  if (frame === 'phone') {
    if (ar > 1.15) return place(box(wide.maxW, wide.maxH, clamp(ar, 1.6, 2.17)), true, { side: true });
    return place(box(Math.min(560, side.maxW), side.maxH, clamp(ar, 0.46, 0.7)), false, { side: false });
  }
  const a = clamp(ar, 0.5, 2.2);
  const pw = fitPrint(a, wide.maxW, wide.maxH, cap, capLines), ps = fitPrint(a, side.maxW, side.maxH, cap, capLines);
  return pw.w * pw.h >= ps.w * ps.h ? place(pw, true) : place(ps, false);
}

// Paper media beat: the print (or window / phone) is slapped onto the wall —
// it drops in from nearer the camera at a steeper angle, overshoots into the
// wall and settles on twos — then tape goes on, the caption is written on
// its border and the picture slowly pushes in (toward props.focus).
function drawPaper(s) {
  const { ctx, t, props } = s;
  const id = firstId(props.media);
  const m = s.media(id);
  const img = m ? s.mediaFrame(id) : null;
  const frame = FRAMES.includes(props.frame) ? props.frame : 'card';
  const ar = m ? m.width / m.height : 16 / 10;
  const caption = String(props.caption || '').trim();
  const focus = readFocus(props.focus);
  // A caption too long for one line on a narrow print gets a second line.
  let L = paperLayout(frame, ar, caption);
  const capLines = frame === 'card' ? captionLinesFor(ctx, caption, L.w - 2 * (L.border || 0) - 24) : 1;
  if (capLines > 1) L = paperLayout(frame, ar, caption, capLines);
  const fallbackLabel = s.beat.label || '';
  const video = m?.kind === 'video';
  const seed = `media-${s.index}-${id || 'none'}`;
  const r = rng(seed);
  const lean = frame === 'phone' ? -0.03 : (r() < 0.5 ? -1 : 1) * (0.035 + r() * 0.022);

  const e = s.spring(0.1, { freq: 1.5, damp: 0.5 });
  const bo = boil(seed, t, 1);
  const kb = ease.inOutQuad(clamp((onTwos(t) - 0.7) / Math.max(1.6, s.dur - 0.9)));
  const cx = L.x + L.w / 2, cy = L.y + L.h / 2;
  const lift = 1.6 + clamp(1 - e) * 2.6;

  ctx.save();
  ctx.translate(cx + bo.dx, cy + bo.dy - (1 - e) * 90);
  ctx.rotate(lean * (1 + (1 - e) * 2.2) + bo.rot);
  ctx.scale(1 + (1 - e) * 0.22, 1 + (1 - e) * 0.22);
  ctx.globalAlpha *= clamp(e * 3);
  ctx.translate(-cx, -cy);
  const tapeK = s.enter(0.5, 0.3);
  if (frame === 'browser') {
    const cw = L.w - WINDOW_INSET * 2, ch = L.h - WINDOW_BAR - WINDOW_INSET * 2;
    const tool = toolInfo(s.episode.source?.toolId);
    const url = props.url || m?.page || m?.url || tool?.displayDomain || tool?.url || s.episode.source?.url || '';
    const scroll = ease.inOutCubic(clamp((onTwos(t) - 0.9) / Math.max(1.6, s.dur - 1.5)));
    const zoom = 1 + (focusZoom(img, cw, ch, focus) - 1) * kb;
    const content = img ? browserContent(img, cw, ch, { zoom, focus, toward: kb, scroll }) : null;
    paperWindow(ctx, L.x, L.y, L.w, L.h, { content, url, label: fallbackLabel, video });
    printTape(ctx, L.x, L.y, L.w, L.h, { seed, k: tapeK, style: 'corners' });
  } else if (frame === 'phone') {
    const zoom = 1 + (focusZoom(img, L.w, L.h, focus) - 1) * kb;
    paperPhone(ctx, L.x, L.y, L.w, L.h, { img, side: L.side, zoom, focus, toward: kb, label: fallbackLabel, video });
    printTape(ctx, L.x, L.y, L.w, L.h, { seed, k: tapeK, style: 'top', scale: 1.1 });
  } else {
    const zoom = 1 + (focusZoom(img, L.w - 2 * L.border, L.h - L.border - L.bottom, focus) - 1) * kb;
    photoPrint(ctx, L.x, L.y, L.w, L.h, {
      img, border: L.border, bottom: L.bottom, lift, zoom, focus, toward: kb, video, label: fallbackLabel,
      caption, captionSize: P_CAPTION, captionLines: capLines, captionReveal: clamp((onTwos(t) - 0.55) / 0.45),
    });
    printTape(ctx, L.x, L.y, L.w, L.h, { seed, k: tapeK });
  }
  ctx.restore();

  // A window or phone carries its caption on a torn label underneath.
  if (caption && frame !== 'card') {
    const fcx = L.x + L.w / 2;
    tornLabel(ctx, L.kitBelow ? fcx : Math.max(fcx, 300), L.y + L.h + 60, caption, {
      k: s.enter(0.65, 0.35), set: s.set, seed, size: 40, maxW: 860, minX: L.kitBelow ? 80 : 290, maxX: 1004,
    });
  }

  // Kit at the floor corner: below a wide frame, or beside a tall one.
  const mascot = s.beat.mascot || {};
  const kx = L.kitBelow ? KIT_X : Math.max(KIT_X - 10, Math.min(KIT_X, L.x - 135));
  const aim = { x: L.kitBelow ? L.x + L.w * 0.3 : L.x + 30, y: L.kitBelow ? L.y + L.h - 40 : L.y + L.h * 0.55 };
  s.kit({
    x: kx, y: BAND.floorY + 50, s: 0.7,
    pose: t < 0.45 ? 'idle' : mascot.pose || 'point',
    face: t < 0.8 ? 'wow' : mascot.face || 'happy',
    pointAt: aim, look: 0.6,
    dark: luminance(s.set.wall) < 0.08,
  });
}

// ---------------------------------------------------------------- scene

export default {
  type: 'media',
  describe: 'One real image or video from the sources, shown big — a taped photo print / paper window / paper phone on the wall (paper look) or a clean house frame (studio) — with a slow push-in; videos play. Use whenever the beat talks about something you can see — a model output, an edit, an app screen, a clip.',
  props: {
    media: 'media id from media.json, e.g. "m03"',
    frame: "'card' | 'browser' | 'phone' (default 'card'; phone suits vertical video/app screens, browser suits web pages)",
    caption: 'optional string ≤ 32 chars, under the frame (paper: written on the print\'s bottom border)',
    url: 'optional domain for the browser address bar (defaults to the media source page)',
    focus: 'optional [x, y, w, h] in 0–1 of the image — the slow push-in drifts toward this region',
  },
  draw(s) {
    if (!isStudio()) return drawPaper(s);
    const { ctx, t, props } = s;
    const id = firstId(props.media);
    const m = s.media(id);
    const img = m ? s.mediaFrame(id) : null;
    const frame = FRAMES.includes(props.frame) ? props.frame : 'card';
    const ar = m ? m.width / m.height : 16 / 10;
    const caption = String(props.caption || '').trim();
    const focus = readFocus(props.focus);
    const L = layout(frame, ar, !!caption);
    const fallbackLabel = s.beat.label || '';

    // Entrance: rise + scale on a spring; the overshoot tips it a touch and it
    // settles level (a phone keeps a slight lean).
    const e = s.spring(0.12, { freq: 1.15, damp: 0.6 });
    const rest = frame === 'phone' && !L.side ? -0.022 : 0;
    const rot = (1 - e) * 0.07 + rest;
    const cx = L.x + L.w / 2, cy = L.y + L.h / 2;
    // Ken Burns after it lands, toward the focus when given.
    const kb = ease.inOutQuad(clamp((t - 0.7) / Math.max(1.6, s.dur - 0.9)));
    const contentW = frame === 'card' ? L.w - 24 : L.w, contentH = frame === 'browser' ? L.h - BAR : L.h;
    const zoom = 1 + (focusZoom(img, contentW, contentH, focus) - 1) * kb;
    const video = m?.kind === 'video' && m.duration ? ((Math.max(0, t) % m.duration) / m.duration) : null;

    ctx.save();
    ctx.translate(cx, cy + (1 - e) * 240);
    ctx.rotate(rot);
    ctx.scale(0.86 + 0.14 * e, 0.86 + 0.14 * e);
    ctx.globalAlpha *= clamp(e * 2);
    ctx.translate(-cx, -cy);
    if (frame !== 'browser') glowBehind(ctx, L.x, L.y, L.w, L.h, { set: s.set });
    if (frame === 'browser') {
      const tool = toolInfo(s.episode.source?.toolId);
      const url = props.url || m?.page || m?.url || tool?.displayDomain || tool?.url || s.episode.source?.url || '';
      const scroll = ease.inOutCubic(clamp((t - 0.9) / Math.max(1.6, s.dur - 1.5)));
      const content = img ? browserContent(img, L.w, L.h - BAR, { zoom, focus, toward: kb, scroll }) : null;
      screenshotFrame(ctx, L.x, L.y, L.w, L.h, { img: content, url, t, pan: false, radius: 24, fallbackLabel });
    } else if (frame === 'phone') {
      phoneFrame(ctx, L.x, L.y, L.w, L.h, { img, zoom, focus, toward: kb, label: fallbackLabel, video });
    } else {
      mediaCard(ctx, L.x, L.y, L.w, L.h, { img, zoom, focus, toward: kb, video, label: fallbackLabel });
    }
    ctx.restore();

    if (caption) {
      const c = s.enter(0.6, 0.4);
      if (c > 0) {
        // Centred under the frame; beside Kit it shrinks, then slides right, to keep clear of him.
        const fcx = L.x + L.w / 2, padX = 30;
        const size = fitSize(ctx, caption, 'd600', (L.kitBelow ? 880 : 2 * (fcx - 275)) - padX * 2, 38, 34);
        const pw = measure(ctx, caption, 'd600', size) + padX * 2;
        const pcx = L.kitBelow ? fcx : Math.min(1010 - pw / 2, Math.max(fcx, 275 + pw / 2));
        ctx.save();
        ctx.translate(pcx, L.y + L.h + 58);
        ctx.scale(c, c);
        pill(ctx, 0, 0, caption, { fill: C.ink, size, weight: 'd600', padX, h: 68, lift: 1.4 });
        ctx.restore();
      }
    }

    // Kit at the floor corner: below a wide frame, or beside a tall one.
    const mascot = s.beat.mascot || {};
    const kx = L.kitBelow ? KIT_X : Math.max(KIT_X - 10, Math.min(KIT_X, L.x - 135));
    const aim = { x: L.kitBelow ? L.x + L.w * 0.3 : L.x + 30, y: L.kitBelow ? L.y + L.h - 40 : L.y + L.h * 0.55 };
    s.kit({
      x: kx, y: BAND.floorY + 50, s: 0.7,
      pose: t < 0.45 ? 'idle' : mascot.pose || 'point',
      face: t < 0.8 ? 'wow' : mascot.face || 'happy',
      pointAt: aim, look: 0.6,
      dark: luminance(s.set.wall) < 0.08,
    });
  },
};
