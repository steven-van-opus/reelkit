// The brand mark, lockups and app icon from the brand pack, plus the site's
// decorative backdrops, on canvas. Backdrops mirror the Creators Toolbox
// BrandBackdrop component ('mark' | 'orbits' | 'tiles').
import fs from 'fs';
import path from 'path';
import { Path2D } from '@napi-rs/canvas';
import { C } from './brand.mjs';
import { asset } from './brandpack.mjs';

// The mark's outlined paths come from the pack's mark.svg so the reels never
// drift from the logo: <path id="mark"> (the C) and an optional
// <path id="sparkle">, in the coordinates of the svg's viewBox.
const markFile = asset('mark');
const markSvg = fs.readFileSync(markFile, 'utf8');
const pathById = id => (markSvg.match(new RegExp(`<path\\b[^>]*\\bid="${id}"[^>]*>`)) || [])[0]?.match(/\sd="([^"]+)"/)?.[1] || null;
export const BRAND_C_PATH = pathById('mark');
export const BRAND_SPARKLE_PATH = pathById('sparkle');
if (!BRAND_C_PATH) throw new Error(`${path.relative(process.cwd(), markFile)} needs a <path id="mark" d="…">`);

const C_PATH = new Path2D(BRAND_C_PATH);
const SPARKLE_PATH = BRAND_SPARKLE_PATH ? new Path2D(BRAND_SPARKLE_PATH) : null;
// Bounding box of the mark in its source coordinates: mark.svg's viewBox.
const MARK = (() => {
  const v = (markSvg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/) || [])[1]?.trim().split(/[\s,]+/).map(Number);
  if (!v || v.length !== 4 || v.some(n => !Number.isFinite(n))) throw new Error(`${path.relative(process.cwd(), markFile)} needs a viewBox="x y w h" on its <svg>`);
  return { x: v[0], y: v[1], w: v[2], h: v[3] };
})();

export function brandGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, C.pinkStart);
  g.addColorStop(1, C.pinkEnd);
  return g;
}

// The C + sparkle mark, `height` px tall, top-left at (x, y).
// fill: 'pink' (brand gradient), a colour, or null; stroke: colour or null.
export function drawMark(ctx, x, y, height, { fill = 'pink', stroke = null, strokeWidth = 1.5, alpha = 1, sparkle = true } = {}) {
  const s = height / MARK.h;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-MARK.x, -MARK.y);
  if (fill) {
    ctx.fillStyle = fill === 'pink' ? brandGradient(ctx, 110, 380, 390, 680) : fill;
    ctx.fill(C_PATH);
    if (sparkle && SPARKLE_PATH) ctx.fill(SPARKLE_PATH);
  }
  if (stroke) {
    ctx.lineWidth = strokeWidth / s;
    ctx.strokeStyle = stroke;
    ctx.stroke(C_PATH);
    if (sparkle && SPARKLE_PATH) ctx.stroke(SPARKLE_PATH);
  }
  ctx.restore();
}

export const markWidth = height => (height / MARK.h) * MARK.w;

// The brand "pixel": a rounded square in the brand gradient with the C in chalk
// (as in the favicon / app icon). Centred at (cx, cy).
export function brandPixel(ctx, cx, cy, size, { tile = 'pink', mark = C.chalk } = {}) {
  if (appIcon) {
    ctx.drawImage(appIcon, cx - size / 2, cy - size / 2, size, size);
    return;
  }
  const r = size * 0.13636 * 1.6;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - size / 2, cy - size / 2, size, size, r);
  ctx.fillStyle = tile === 'pink' ? brandGradient(ctx, cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2) : tile;
  ctx.fill();
  ctx.restore();
  // The C alone (bbox x 110–387, y 383–695), optically centred: nudged right
  // because its open side reads lighter.
  const h = size * 0.56;
  const s = h / 312;
  ctx.save();
  ctx.translate(cx + size * 0.035, cy);
  ctx.scale(s, s);
  ctx.translate(-248.5, -539);
  ctx.fillStyle = mark;
  ctx.fill(C_PATH);
  ctx.restore();
}

// ---------------------------------------------------------------- backdrops

// tone: 'neutral' (#777781) | 'pink' (#FF2A88) | 'light' (chalk, for dark/pink surfaces)
const TONES = { neutral: '#777781', pink: '#FF2A88', light: '#FFFFFF' };

// variant 'mark': the outlined C + sparkle, large, rotated −10°, fading in
// toward the outside (BrandBackdrop's mask-image: linear-gradient(120deg …)).
export function backdropMark(ctx, { x, y, height, tone = 'neutral', rot = -0.1745, strength = 1 }) {
  const color = TONES[tone] || tone;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  drawMark(ctx, 0, 0, height, { fill: color, alpha: 0.055 * strength });
  drawMark(ctx, 0, 0, height, { fill: null, stroke: color, alpha: 0.2 * strength, strokeWidth: 2 });
  ctx.restore();
}

// variant 'orbits': concentric circles.
export function backdropOrbits(ctx, { x, y, radii = [100, 145, 190, 235], scale = 1, tone = 'neutral', strength = 1, width = 2 }) {
  ctx.save();
  ctx.strokeStyle = TONES[tone] || tone;
  ctx.globalAlpha *= 0.15 * strength;
  ctx.lineWidth = width;
  for (const r of radii) {
    ctx.beginPath();
    ctx.arc(x, y, r * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// variant 'tiles': two rotated rounded tiles with an ↗ arrow.
export function backdropTiles(ctx, { x, y, scale = 1, tone = 'neutral', strength = 1 }) {
  const color = TONES[tone] || tone;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(56, 42);
  ctx.translate(120, 96);
  ctx.rotate(-18 * Math.PI / 180);
  ctx.translate(-120, -96);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 / scale;
  for (const [rx, ry, fa, sa] of [[0, 0, 0.03, 0.1], [52, 35, 0.055, 0.13]]) {
    ctx.beginPath();
    ctx.roundRect(rx, ry, 186, 166, 24);
    ctx.globalAlpha = fa * strength;
    ctx.fill();
    ctx.globalAlpha = sa * strength;
    ctx.stroke();
  }
  ctx.globalAlpha = 0.24 * strength;
  ctx.lineWidth = 3 / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D('M118 94h44v44m0-44-54 54'));
  ctx.restore();
}

// ---------------------------------------------------------------- lockups

// The pack's horizontal lockups (brand.json assets), loaded once before rendering.
//   'color' — assets.lockup: full-colour mark + wordmark (light surfaces)
//   'white' — assets.lockupWhite: all-white lockup (dark or brand-colour surfaces)
const LOCKUP_SVGS = Object.fromEntries(Object.entries({ color: asset('lockup'), white: asset('lockupWhite') }).map(([kind, file]) => {
  const svg = fs.readFileSync(file, 'utf8');
  const box = (svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/) || [])[1]?.trim().split(/[\s,]+/).map(Number);
  if (!box || box.length !== 4 || !(box[2] > 0 && box[3] > 0)) throw new Error(`${path.relative(process.cwd(), file)} needs a viewBox="x y w h" on its <svg>`);
  return [kind, { svg, w: box[2], h: box[3] }];
}));
const lockups = {};

// Width / height of a lockup, so a layout can size it before prepareBrand().
export const lockupAspect = (kind = 'color') => LOCKUP_SVGS[kind].w / LOCKUP_SVGS[kind].h;

let appIcon = null;

export async function prepareBrand() {
  if (Object.keys(lockups).length) return;
  const { loadImage } = await import('@napi-rs/canvas');
  // The official app icon (assets.icon), e.g. the site's favicon: the mark on
  // a soft brand-colour card. Rendered with resvg so its gradient survives.
  const { Resvg } = await import('@resvg/resvg-js');
  const iconSvg = fs.readFileSync(asset('icon'));
  appIcon = await loadImage(new Resvg(iconSvg, { fitTo: { mode: 'width', value: 512 } }).render().asPng());
  for (const [kind, { svg, w, h }] of Object.entries(LOCKUP_SVGS)) {
    // Rasterise at 4× so the lockup stays crisp when drawn large; an svg
    // without width/height gets them.
    const size = `width="${w * 4}" height="${h * 4}"`;
    let sized = svg.replace(/<svg([^>]*?)\swidth="[^"]*"\s+height="[^"]*"/, `<svg$1 ${size}`);
    if (sized === svg) sized = svg.replace(/<svg\b[^>]*>/, tag => tag.replace(/\s(width|height)="[^"]*"/g, '').replace(/^<svg\b/, `<svg ${size}`));
    lockups[kind] = await loadImage(Buffer.from(sized));
  }
}

// Draw the horizontal lockup `height` px tall with its left edge at x (or
// centred on x with align 'center'). Returns the drawn width.
export function drawLockup(ctx, x, y, height, { kind = 'color', align = 'left', alpha = 1 } = {}) {
  const img = lockups[kind];
  if (!img) return 0;
  const w = (img.width / img.height) * height;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(img, align === 'center' ? x - w / 2 : x, y, w, height);
  ctx.restore();
  return w;
}
