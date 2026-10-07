// "What it is" beat: a big paper app window taped to the wall carries the
// product's logo sticker, name and tagline over the real thing — a source
// media item (props.media, image or video) or else the product's screenshot,
// taped into the window as a photo print — and only when there is nothing real
// to show, an abstract paper mock of its UI (a cursor clicks in, types, hits
// send and result tiles pop in). Feature chips slap onto the wall below one by
// one as they're said, and Kit walks in to point at each.
//
// Also exports the paper media props the other paper scenes share:
// photoPrint() (a taped photo print of a real image/video frame), printSize()
// and logoSticker() (a tool's logo tile on a die-cut chalk sticker).
import { W, C, BAND, font } from '../../brand.mjs';
import { paper, card, roundRectPath, cutCirclePath, fitWrapped, fitSize, text, measure, tape, pinkGradient, grainCanvas } from '../../paper.mjs';
import { appWindow, icon, sparkle, sparkles, inkOn } from '../../fx.mjs';
import { logoTile, toolInfo } from '../../logos.mjs';
import { beatShotSrc, shotImage } from '../../shots.mjs';
import { drawCover } from '../../mediastore.mjs';
import { clamp, lerp, ease, rng, boil, rgba, luminance } from '../../util.mjs';

const ICONS = new Set(['check', 'x', 'bolt', 'image', 'phone', 'cursor', 'sparkle', 'chat', 'code', 'play', 'star', 'layers', 'globe', 'heart', 'arrow', 'lock', 'bell']);

const WIN = { x: 90, y: 366, w: 900, pad: 44, bar: 58 };
const CHIP = { x: 96, y: 1104, step: 82, h: 68, maxW: 560 };
// Kit stands right of the chips; its far (right) arm stays ≤ x 980 on
// screen, clear of the IG right rail, through the camera push.
const KIT = { x: 815, s: 0.9 };

// ---------------------------------------------------------------- prints & stickers

const grainFills = new WeakMap();
function grainFill(ctx) {
  let p = grainFills.get(ctx);
  if (!p) grainFills.set(ctx, (p = ctx.createPattern(grainCanvas('light'), 'repeat')));
  return p;
}

// A print's paper border: ~5% of the print, never hairline-thin or chunky.
const printBorder = (w, h) => Math.round(clamp(0.05 * Math.max(w, h), 14, 34));
// The caption strip an instant photo carries under the picture.
const captionStrip = ih => Math.round(clamp(ih * 0.17, 64, 88));

// The biggest print of an image (aspect `ar`) that fits a maxW × maxH box,
// border and caption strip included. The photo may be cropped toward the box's
// shape by up to `crop` (1.3 = 30%) so a wide box isn't half empty.
// Returns { iw, ih, w, h, b, cap } — photo size, print size, border, strip.
export function printSize(ar, maxW, maxH, { caption = false, crop = 1.3 } = {}) {
  const b = printBorder(maxW, maxH);
  const cap = caption ? captionStrip(maxH * 0.8) : 0;
  const bw = maxW - b * 2, bh = maxH - b * 2 - cap;
  const a = clamp(bw / bh, ar / crop, ar * crop);
  const iw = Math.min(bw, bh * a), ih = iw / a;
  return { iw: Math.round(iw), ih: Math.round(ih), w: Math.round(iw) + b * 2, h: Math.round(ih) + b * 2 + cap, b, cap };
}

// A real image or video frame as a photo print, centred on the origin: chalk
// paper border (thicker at the bottom when it carries a caption, like an
// instant photo), the picture printed onto it with a whisper of grain and a
// gloss glint, and 1–2 pieces of tape. Callers place, tilt and slap it in.
//   size     printSize() result
//   tapes    0, 1 (top centre) or 2 (top corners); tapeIn 0..1 grows them on
//   pan      'top' keeps a screenshot's header in view and scrolls down a touch
export function photoPrint(ctx, img, size, { caption = '', seed = 'print', t = 0, dur = 4, video = false, lift = 2, tapes = 2, tapeIn = 1, pan = 'center', fill = C.chalk } = {}) {
  const { iw, ih, w, h, b, cap } = size;
  const x = -w / 2, y = -h / 2, px = x + b, py = y + b;
  paper(ctx, c => roundRectPath(c, x, y, w, h, 5), { fill, lift, rim: 0.7 });

  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, iw, ih);
  ctx.clip();
  ctx.fillStyle = '#E4E1EA';
  ctx.fillRect(px, py, iw, ih);
  if (img) {
    const u = ease.inOutQuad(clamp(t / Math.max(dur, 1)));
    drawCover(ctx, img, px, py, iw, ih, {
      zoom: video ? 1 : 1.01 + 0.04 * u,
      py: pan === 'top' && !video ? lerp(-1, -0.6, u) : 0,
    });
  }
  // Printed on paper, not glowing on a screen.
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = grainFill(ctx);
  ctx.fillRect(px, py, iw, ih);
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(px + iw * 0.52, py);
  ctx.lineTo(px + iw * 0.74, py);
  ctx.lineTo(px + iw * 0.36, py + ih);
  ctx.lineTo(px + iw * 0.14, py + ih);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(16,16,20,0.14)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, iw, ih);
  ctx.restore();

  if (caption && cap) {
    const strip = b + cap;
    const fit = fitWrapped(ctx, caption, 700, iw - 16, 1, Math.round(Math.min(44, strip * 0.42)), 34);
    text(ctx, fit.lines[0] || '', 0, py + ih + strip / 2 + 2, { weight: 700, size: fit.size, color: C.ink });
  }

  // Video: a little pink play sticker on the picture so it reads as footage.
  if (video) {
    const r = clamp(Math.min(iw, ih) * 0.08, 20, 30);
    const bx = px + iw - r - 14, by = py + ih - r - 14;
    paper(ctx, c => cutCirclePath(c, bx, by, r, { seed: `${seed}-play` }), { fill: pinkGradient(ctx, bx - r, by - r, bx + r, by + r), lift: 0.8, rim: 0.6 });
    icon(ctx, 'play', bx + r * 0.08, by, r * 1.1, C.chalk);
  }

  if (tapes && tapeIn > 0) {
    const r = rng(`${seed}-tape`);
    const tw = clamp(w * 0.2, 74, 130) * tapeIn, th = clamp(w * 0.055, 26, 40);
    if (tapes === 1) tape(ctx, (r() - 0.5) * w * 0.12, y + 4, tw, th, (r() - 0.5) * 0.2, { seed: `${seed}-t1`, alpha: 0.8 });
    else {
      tape(ctx, x + 22, y + 12, tw, th, -0.68 + (r() - 0.5) * 0.16, { seed: `${seed}-t1`, alpha: 0.8 });
      tape(ctx, x + w - 22, y + 12, tw, th, 0.68 + (r() - 0.5) * 0.16, { seed: `${seed}-t2`, alpha: 0.8 });
    }
  }
  return { w, h };
}

// A print's tilt: 2–4° either way, fixed by its seed.
export function printTilt(seed) {
  const r = rng(`${seed}-tilt`);
  return (r() < 0.5 ? -1 : 1) * (0.035 + r() * 0.035);
}

// How a print or sticker slaps onto a surface at `at` (stop-motion, on twos):
// it arrives big and high off the wall, overshoots, lands. null before `at`.
export function slapIn(s, at, dur = 0.4) {
  const p = clamp((s.ts - at) / dur);
  if (p <= 0) return null;
  const e = ease.outBack(p, 1.7);
  return { scale: lerp(1.24, 1, e), rot: (1 - e) * 0.14, alpha: clamp(p * 4), lift: lerp(4.2, 0, ease.outCubic(p)), p };
}

// A tool's logo tile on a die-cut chalk sticker, centred on the origin. Only
// for tools data.ts knows (logoTile falls back to a monogram when the image
// is missing); `taped` adds a strip of tape over the top edge.
export function logoSticker(ctx, size, { toolId, lift = 1.3, taped = false, seed = 'sticker', tapeIn = 1 } = {}) {
  const tool = toolInfo(toolId);
  if (!tool) return false;
  paper(ctx, c => roundRectPath(c, -size / 2, -size / 2, size, size, size * 0.2), { fill: C.chalk, lift, rim: 0.8 });
  const tile = size * 0.76;
  logoTile(ctx, 0, 0, tile, { toolId, name: tool.title, shadow: false });
  // Printed onto the sticker stock.
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, -tile / 2, -tile / 2, tile, tile, tile * 0.24);
  ctx.clip();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = grainFill(ctx);
  ctx.fillRect(-tile / 2, -tile / 2, tile, tile);
  ctx.restore();
  if (taped && tapeIn > 0) {
    const r = rng(`${seed}-tape`);
    tape(ctx, (r() - 0.5) * size * 0.2, -size / 2 + 3, size * 0.66 * tapeIn, Math.max(24, size * 0.22), (r() - 0.5) * 0.36, { seed: `${seed}-tape`, alpha: 0.8 });
  }
  return true;
}

// ---------------------------------------------------------------- text

// Shorten to fit maxW at the current ctx.font, ending in an ellipsis.
function ellipsize(ctx, str, maxW) {
  if (ctx.measureText(str).width <= maxW) return str;
  let s = str;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

// fitWrapped that never overflows: an over-long word or a dropped tail ends in "…".
function fitLines(ctx, str, weight, maxW, maxLines, maxSize, minSize) {
  const { size, lines } = fitWrapped(ctx, str, weight, maxW, maxLines, maxSize, minSize);
  ctx.font = font(weight, size);
  const total = String(str).split(/\s+/).filter(Boolean).length;
  const shown = lines.join(' ').split(/\s+/).filter(Boolean).length;
  const out = lines.map(l => ellipsize(ctx, l, maxW));
  if (shown < total && out.length) out[out.length - 1] = ellipsize(ctx, `${out[out.length - 1]}…`, maxW);
  return { size, lines: out };
}

// ---------------------------------------------------------------- chips

function chipList(raw) {
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr
    .map(c => String(typeof c === 'object' && c ? c.text || c.label || '' : c ?? '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

// Words in a chip that are too common to anchor it to the voice.
const CHIP_STOP = new Set(['the', 'and', 'for', 'with', 'from', 'your', 'you', 'all', 'now', 'new', 'not', 'any', 'one', 'its', 'are', 'was', 'has', 'can']);

// When each chip slaps on: on the spoken word it names if the voice says it
// (the earliest of its words that the voice says, so "beta" or "free" can
// anchor it), otherwise spread across the narration. In order, ≥0.3s apart,
// and never later than a second before the cut (the outgoing paper slide).
// When a matched word breaks the order or the cap, all chips are spread
// evenly across the narration instead.
function chipTimes(s, chips) {
  const w = s.words;
  const vs = w.length ? w[0].start : s.voStart;
  const ve = w.length ? w[w.length - 1].end : s.voEnd;
  const cap = Math.max(0.75, Math.min(ve, s.dur - 1.0));
  const said = chips.map(c => {
    const keys = c.toLowerCase().split(/\s+/).map(x => x.replace(/[^\p{L}\p{N}]/gu, '')).filter(k => k.length >= 3 && !CHIP_STOP.has(k));
    const hits = keys.map(k => s.wordTime(k)).filter(v => v != null && v >= 0.3);
    return hits.length ? Math.min(...hits) - 0.06 : null;
  });
  const lo = Math.max(0.75, vs + 0.3);
  const hi = Math.max(lo + 0.3 * Math.max(0, chips.length - 1), Math.min(ve - 0.6, cap));
  const even = chips.map((_, i) => (chips.length === 1 ? lerp(lo, hi, 0.5) : lerp(lo, hi, i / (chips.length - 1))));
  let prev = -Infinity, ok = true;
  const times = chips.map((_, i) => {
    let at = said[i] ?? even[i];
    at = Math.max(at, 0.75);
    if (at < prev + 0.3) { if (said[i] != null) ok = false; at = prev + 0.3; }
    if (at > cap) ok = false;
    prev = at;
    return at;
  });
  return ok ? times : even.map(at => Math.min(at, cap));
}

function chipMetrics(ctx, str) {
  const maxText = CHIP.maxW - 98;
  const size = fitSize(ctx, str, 800, maxText, 40, 34);
  ctx.font = font(800, size);
  const label = ellipsize(ctx, str, maxText);
  return { label, size, w: measure(ctx, label, 800, size) + 98 };
}

// A pill sticker with a pink check disc, centred on the origin.
function drawChip(ctx, { label, size, w }, fill, seed) {
  const h = CHIP.h;
  paper(ctx, c => roundRectPath(c, -w / 2, -h / 2, w, h, h / 2), { fill, lift: 1.5, rim: 0.7 });
  const dx = -w / 2 + 34;
  paper(ctx, c => cutCirclePath(c, dx, 0, 22, { seed }), { fill: pinkGradient(ctx, dx - 22, -22, dx + 22, 22), lift: 0.3, rim: 0.5 });
  icon(ctx, 'check', dx, 1, 26, C.chalk);
  text(ctx, label, -w / 2 + 70, 2, { weight: 800, size, color: inkOn(fill), align: 'left' });
}

// ---------------------------------------------------------------- UI mock

// Arrow cursor with its tip at the origin: ink with a chalk outline.
function cursorPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 40);
  ctx.lineTo(10, 30);
  ctx.lineTo(18, 47);
  ctx.lineTo(26, 43);
  ctx.lineTo(18, 27);
  ctx.lineTo(31, 27);
  ctx.closePath();
}

function drawCursor(ctx, x, y, press, alpha) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(1 - press * 0.14, 1 - press * 0.14);
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(30,0,20,0.32)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 6 - press * 3;
  cursorPath(ctx);
  ctx.strokeStyle = C.chalk;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.restore();
}

// Abstract product UI inside the window: sidebar, an input that gets typed
// into, a send button, and three result tiles. `m` is the mock's own clock.
function drawMock(ctx, s, { x, y, w, h }, m) {
  if (m <= 0) return;
  const step = (m0, d = 0.3) => {
    const p = clamp((m - m0) / d);
    return p <= 0 ? 0 : p >= 1 ? 1 : ease.outBack(p, 1.7);
  };
  const pulse = (at, d = 0.16) => (m >= at && m < at + d ? Math.sin(((m - at) / d) * Math.PI) : 0);
  const popAbout = (e, px, py, fn) => {
    if (e <= 0) return;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(e, e);
    ctx.translate(-px, -py);
    fn();
    ctx.restore();
  };

  // Recessed work area.
  ctx.save();
  ctx.globalAlpha *= clamp(m / 0.18);
  card(ctx, x, y, w, h, { r: 20, fill: C.paperCool, lift: 0.3, rim: 0.5 });
  ctx.restore();

  // Sidebar: one active row on a lifted chalk tab.
  const side = w >= 560 ? 150 : 0;
  const sx = x + 16;
  if (side) {
    const rows = clamp(Math.floor((h - 20) / 52), 2, 4);
    const bars = [86, 64, 92, 58];
    for (let i = 0; i < rows; i++) {
      const ry = y + 16 + i * 52;
      popAbout(step(0.08 + i * 0.06), sx + side / 2, ry + 20, () => {
        if (i === 0) card(ctx, sx, ry, side, 40, { r: 12, fill: C.chalk, lift: 0.6, rim: 0.6 });
        ctx.fillStyle = i === 0 ? s.accent : rgba(C.ink, 0.18);
        ctx.beginPath();
        ctx.arc(sx + 24, ry + 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(C.ink, i === 0 ? 0.6 : 0.22);
        ctx.beginPath();
        roundRectPath(ctx, sx + 42, ry + 14, bars[i], 12, 6);
        ctx.fill();
      });
    }
  }

  // Input bar with typed "words", caret and a send button.
  const mx0 = sx + side + (side ? 16 : 0), mx1 = x + w - 16, mw = mx1 - mx0;
  const iy = y + 16, ih = 60;
  const bx = mx1 - 34, by = iy + ih / 2;
  const sendAt = 1.45;
  popAbout(step(0.12), mx0 + mw / 2, by, () => {
    card(ctx, mx0, iy, mw, ih, { r: ih / 2, fill: C.chalk, lift: 0.8, rim: 0.6 });
    if (m > 0.58 && m < sendAt + 0.2) {
      ctx.save();
      ctx.strokeStyle = rgba(C.pink, 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      roundRectPath(ctx, mx0 + 3, iy + 3, mw - 6, ih - 6, ih / 2 - 3);
      ctx.stroke();
      ctx.restore();
    }
    const r = rng('product-type');
    const words = [];
    let wx = mx0 + 28;
    while (words.length < 8) {
      const ww = 34 + r() * 72;
      if (wx + ww > bx - 52) break;
      words.push({ x: wx, w: ww });
      wx += ww + 12;
    }
    const n = m < 0.62 ? 0 : clamp(Math.floor((m - 0.62) / 0.085) + 1, 0, words.length);
    ctx.fillStyle = rgba(C.ink, 0.62);
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      roundRectPath(ctx, words[i].x, by - 6, words[i].w, 13, 6.5);
      ctx.fill();
    }
    const typing = n > 0 && n < words.length;
    if (m > 0.58 && (typing || Math.floor(s.t * 2.5) % 2 === 0)) {
      const cx = n ? words[n - 1].x + words[n - 1].w + 6 : mx0 + 28;
      ctx.fillStyle = C.pink;
      ctx.fillRect(cx, by - 16, 4, 32);
    }
    const press = pulse(sendAt);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(1 - press * 0.16, 1 - press * 0.16);
    paper(ctx, c => cutCirclePath(c, 0, 0, 23, { seed: 'product-send' }), { fill: pinkGradient(ctx, -23, -23, 23, 23), lift: 0.8 - press * 0.6, rim: 0.6 });
    icon(ctx, 'arrow', 0, 0, 28, C.chalk);
    ctx.restore();
  });

  // Little sparkle pop when send is clicked.
  const sp = clamp((m - sendAt) / 0.4);
  if (sp > 0 && sp < 1) {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.9;
      const d = 34 + ease.outCubic(sp) * 26;
      sparkle(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d, 11 * Math.sin(sp * Math.PI), { fill: C.pink, lift: 0.3 });
    }
  }

  // Result tiles: dashed placeholders until send, then they pop in.
  const ty = iy + ih + 14, th = y + h - 16 - ty;
  const gap = 14, tw = (mw - gap * 2) / 3;
  const tilesAt = sendAt + 0.1;
  const hoverAt = 2.05;
  if (th >= 56) {
    for (let i = 0; i < 3; i++) {
      const tx = mx0 + i * (tw + gap);
      const pop = step(tilesAt + i * 0.12, 0.32);
      if (pop < 1) {
        ctx.save();
        ctx.globalAlpha *= clamp((m - 0.2 - i * 0.05) / 0.2);
        ctx.fillStyle = rgba(C.ink, 0.04);
        ctx.strokeStyle = rgba(C.ink, 0.16);
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 9]);
        ctx.beginPath();
        roundRectPath(ctx, tx, ty, tw, th, 14);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      const hover = i === 1 ? clamp((m - hoverAt + 0.1) / 0.15) : 0;
      popAbout(pop, tx + tw / 2, ty + th / 2, () => {
        ctx.save();
        ctx.translate(0, -hover * 6);
        drawTile(ctx, s, i, tx, ty, tw, th, m - (tilesAt + i * 0.12), hover);
        ctx.restore();
      });
    }
  }

  // Cursor: drifts in, clicks the input, waits out the typing, hits send,
  // then settles over the middle result and idles there.
  const keys = [
    { m: 0.3, x: x + w - 60, y: y + h - 40 },
    { m: 0.55, x: mx0 + 120, y: by + 8 },
    { m: 0.75, x: mx0 + 120, y: by + 8 },
    { m: 1.05, x: mx0 + mw * 0.55, y: iy + ih + 34 },
    { m: 1.38, x: bx + 4, y: by + 6 },
    { m: 1.75, x: bx + 4, y: by + 6 },
    { m: hoverAt, x: mx0 + tw * 1.5 + gap, y: ty + Math.max(30, th * 0.55) },
  ];
  if (m >= keys[0].m) {
    let k = 0;
    while (k < keys.length - 1 && m >= keys[k + 1].m) k++;
    let cx, cy;
    if (k === keys.length - 1) {
      cx = keys[k].x + Math.sin((m - hoverAt) * 1.6) * 18;
      cy = keys[k].y + Math.sin((m - hoverAt) * 2.3) * 8;
    } else {
      const a = keys[k], b = keys[k + 1];
      const p = ease.inOutCubic(clamp((m - a.m) / (b.m - a.m)));
      cx = lerp(a.x, b.x, p);
      cy = lerp(a.y, b.y, p);
    }
    const press = Math.max(pulse(0.58), pulse(sendAt));
    // Click ripple.
    for (const at of [0.58, sendAt]) {
      const rp = clamp((m - at) / 0.3);
      if (rp > 0 && rp < 1) {
        ctx.save();
        ctx.strokeStyle = rgba(C.pink, 0.8 * (1 - rp));
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 10 + rp * 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    drawCursor(ctx, cx, cy, press, clamp((m - keys[0].m) / 0.12));
  }
}

// One result tile: an image, a doc, or a little bar chart.
function drawTile(ctx, s, i, x, y, w, h, age, hover) {
  const fills = [C.blush, C.chalk, C.chalk];
  card(ctx, x, y, w, h, { r: 14, fill: fills[i], lift: 0.8 + hover * 1.2, rim: 0.6 });
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 14);
  ctx.clip();
  if (i === 0) {
    // Paper landscape with the topic-accent sun.
    const u = Math.min(w, h);
    ctx.fillStyle = s.accent;
    ctx.beginPath();
    ctx.arc(x + w * 0.28, y + h * 0.32, u * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF8DBF';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + h);
    ctx.lineTo(x + w * 0.36, y + h * 0.46);
    ctx.lineTo(x + w * 0.7, y + h);
    ctx.fill();
    ctx.fillStyle = C.pinkDeep;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h);
    ctx.lineTo(x + w * 0.72, y + h * 0.36);
    ctx.lineTo(x + w * 1.08, y + h);
    ctx.fill();
  } else if (i === 1) {
    // Doc: a pink heading and a few lines of "text".
    const pad = Math.min(22, w * 0.12);
    const lh = Math.min(26, (h - pad * 2) / 4);
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    roundRectPath(ctx, x + pad, y + pad, w * 0.42, Math.min(14, lh * 0.6), 6);
    ctx.fill();
    ctx.fillStyle = rgba(C.ink, 0.2);
    [0.82, 0.64, 0.74].forEach((f, k) => {
      const ly = y + pad + lh * (k + 1.2);
      if (ly + 10 > y + h - pad * 0.6) return;
      ctx.beginPath();
      roundRectPath(ctx, x + pad, ly, (w - pad * 2) * f, Math.min(11, lh * 0.45), 5);
      ctx.fill();
    });
  } else {
    // Chart: bars grow in after the tile lands.
    const grow = ease.outCubic(clamp(age / 0.45));
    const hs = [0.36, 0.58, 0.46, 0.82];
    const pad = Math.min(22, w * 0.12);
    const bw = (w - pad * 2) / (hs.length * 1.6);
    hs.forEach((f, k) => {
      const bh = (h - pad * 2) * f * grow;
      const bx = x + pad + k * bw * 1.6 + bw * 0.3;
      ctx.fillStyle = k === hs.length - 1 ? pinkGradient(ctx, bx, y + h - pad - bh, bx + bw, y + h - pad) : rgba(C.ink, 0.78);
      ctx.beginPath();
      roundRectPath(ctx, bx, y + h - pad - bh, bw, bh, Math.min(6, bw / 2));
      ctx.fill();
    });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- media

const domainOf = (u = '') => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

// The real thing in the window's work area: a photo print of it slaps onto the
// recessed panel at `at`, tilted a touch and taped at the top corners. A
// screenshot keeps its top in view and scrolls down slowly; video plays.
function drawShotPrint(ctx, s, img, video, area, at) {
  ctx.save();
  ctx.globalAlpha *= clamp((s.ts - 0.3) / 0.2);
  card(ctx, area.x, area.y, area.w, area.h, { r: 20, fill: C.paperCool, lift: 0.3, rim: 0.5 });
  ctx.restore();
  const sl = slapIn(s, at);
  if (!sl) return;
  const rot = printTilt('product-print') * 0.75;
  // Keep the tilted print's corners inside the panel.
  const sin = Math.abs(Math.sin(rot));
  const size = printSize(img.width / img.height, area.w - 40 - area.h * sin, area.h - 30 - (area.w - 40) * sin * 0.8, { crop: 1.4 });
  const b = boil('product-print', s.t, 0.6);
  ctx.save();
  ctx.globalAlpha *= sl.alpha;
  ctx.translate(area.x + area.w / 2 + b.dx, area.y + area.h / 2 + 4 + b.dy);
  ctx.rotate(rot + sl.rot + b.rot);
  ctx.scale(sl.scale, sl.scale);
  photoPrint(ctx, img, size, {
    seed: 'product-print', t: s.t - at, dur: s.dur, video, lift: 1.6 + sl.lift, pan: 'top',
    tapeIn: clamp((s.ts - at - 0.24) / 0.14),
  });
  ctx.restore();
}

// ---------------------------------------------------------------- scene

export default {
  type: 'product',
  describe: 'What the product is. A big paper app window shows the product logo sticker, name and tagline over the real product (a source media item, else its screenshot) taped in as a photo print — a paper mock of its UI only when there is nothing real; up to 3 feature chips slap on below as they are said, and Kit points at each.',
  props: {
    name: 'string ≤ 24 chars — the product name, e.g. "Nano Banana 2.1"',
    tagline: 'string ≤ 60 chars — what it does in one line, e.g. "Edits photos from a single sentence"',
    chips: 'string[] up to 3, each ≤ 18 chars — key features, e.g. ["Free in Gemini", "4K output"]',
    media: 'optional media id (image or video) of the real product UI/output, shown inside the window — prefer this whenever the sources have one',
    toolId: 'optional data.ts tool id for the logo sticker (defaults to the episode tool)',
    icon: 'optional fx icon name shown in a pink tile when there is no tool logo: check x bolt image phone cursor sparkle chat code play star layers globe heart arrow lock bell',
  },
  draw(s) {
    const { ctx, t, props, episode } = s;
    const name = String(props.name || episode.subject?.name || s.beat.label || 'New tool').trim();
    const tagline = String(props.tagline || '').trim();
    const chips = chipList(props.chips);
    const times = chipTimes(s, chips);
    const iconName = props.icon ? (ICONS.has(props.icon) ? props.icon : 'sparkle') : null;

    // What to show: a source media item, then the product's screenshot; the
    // abstract mock only when neither exists.
    const mediaId = Array.isArray(props.media) ? props.media[0] : props.media;
    const item = s.media(mediaId);
    const revealAt = 0.45;
    const shot = item ? s.mediaFrame(mediaId, revealAt) : shotImage(beatShotSrc(s.beat, episode));
    const toolId = props.toolId || props.logo || episode.source?.toolId || null;
    const tool = toolInfo(toolId);
    const domain = domainOf(item?.page || item?.url || '') || tool?.displayDomain || domainOf(tool?.url || '');

    const winBottom = chips.length ? 1046 : 1150;
    const winH = winBottom - WIN.y;
    const wcx = WIN.x + WIN.w / 2, wcy = WIN.y + winH / 2;
    const cx0 = WIN.x + WIN.pad, cx1 = WIN.x + WIN.w - WIN.pad;

    sparkles(ctx, { x: 930, y: 392, t, radius: 70, count: 3, seed: 'product-sp', fill: s.set.ink === C.chalk ? C.blush : C.chalk });

    // ------------------------------------------------ window
    const we = s.spring(0.02, { freq: 1.6, damp: 0.5 });
    const wb = boil('product-win', t, 0.5);
    ctx.save();
    ctx.globalAlpha *= clamp(we * 3);
    ctx.translate(wcx + wb.dx, wcy + (1 - we) * 180 + wb.dy);
    ctx.rotate(-0.012 + (1 - we) * 0.05 + wb.rot);
    ctx.translate(-wcx, -wcy);

    appWindow(ctx, WIN.x, WIN.y, WIN.w, winH, { lift: 2.4, seed: 'product-win' });
    // Address pill in the title bar: the real domain when there is one.
    const ay = WIN.y + WIN.bar / 2;
    const pw = domain ? clamp(measure(ctx, domain, 600, 22) + 84, 240, 460) : 340;
    paper(ctx, c => roundRectPath(c, wcx - pw / 2, ay - 16, pw, 32, 16), { fill: C.divider, lift: 0, rim: 0, grain: 0.6 });
    icon(ctx, 'lock', wcx - pw / 2 + 24, ay + 1, 17, C.muteDark);
    if (domain) {
      const fit = fitLines(ctx, domain, 600, pw - 66, 1, 22, 22);
      text(ctx, fit.lines[0], wcx - pw / 2 + 44, ay + 1, { weight: 600, size: 22, color: C.muteDark, align: 'left' });
    } else {
      ctx.fillStyle = rgba(C.muteDark, 0.5);
      ctx.beginPath();
      roundRectPath(ctx, wcx - 124, ay - 4, 150, 8, 4);
      ctx.fill();
    }

    // Name row: the product's logo sticker (or a pink icon tile), then the
    // name. With something real to show, name and tagline stack beside the
    // sticker so the print gets the room; otherwise the tagline runs full width.
    const tile = tool || iconName ? (shot ? 112 : 116) : 0;
    const rowTop = WIN.y + WIN.bar + (shot ? 30 : 38);
    const nameX = cx0 + (tile ? tile + (shot ? 28 : 30) : 0);
    let nm;
    if (shot) {
      const one = fitSize(ctx, name, 900, cx1 - nameX, 80, 60);
      nm = measure(ctx, name, 900, one, -1) <= cx1 - nameX ? { size: one, lines: [name] } : fitLines(ctx, name, 900, cx1 - nameX, 2, 62, 46);
    } else nm = fitLines(ctx, name, 900, cx1 - nameX, 2, 100, 52);
    const nlh = nm.size * 1.02;
    const tg = tagline ? fitLines(ctx, tagline, 600, shot ? cx1 - nameX : cx1 - cx0, 2, shot ? 36 : 42, 34) : null;
    const tlh = tg ? tg.size * 1.28 : 0;
    const textH = nm.lines.length * nlh + (shot && tg ? 6 + tg.lines.length * tlh : 0);
    const rowH = Math.max(tile, textH);
    const nameTop = rowTop + (rowH - textH) / 2;

    if (tile) {
      const ie = s.enter(0.24, 0.42);
      if (ie > 0) {
        const tcx = cx0 + tile / 2, tcy = rowTop + rowH / 2;
        const ib = boil('product-icon', t, 0.8);
        ctx.save();
        ctx.translate(tcx + ib.dx, tcy + ib.dy);
        ctx.rotate(-0.05 + (1 - Math.min(ie, 1)) * -0.5 + ib.rot);
        ctx.scale(ie, ie);
        if (tool) logoSticker(ctx, tile, { toolId, lift: 1.4, seed: 'product-logo' });
        else {
          paper(ctx, c => roundRectPath(c, -tile / 2, -tile / 2, tile, tile, 30), { fill: pinkGradient(ctx, -tile / 2, -tile / 2, tile / 2, tile / 2), lift: 1.4, rim: 0.9 });
          icon(ctx, iconName, 0, 0, 66, C.chalk);
        }
        ctx.restore();
      }
    }

    // Each name line rises out of a slot, a beat apart.
    nm.lines.forEach((l, i) => {
      const e = s.enter(0.32 + i * 0.09, 0.42);
      if (e <= 0) return;
      const ly = nameTop + nlh * (i + 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.rect(nameX - 20, ly - nlh * 0.62, cx1 - nameX + 40, nlh * 1.24);
      ctx.clip();
      text(ctx, l, nameX, ly + (1 - e) * nlh * 0.9 + 4, { weight: 900, size: nm.size, color: C.ink, align: 'left', tracking: -1 });
      ctx.restore();
    });

    let y = shot ? nameTop + nm.lines.length * nlh + 6 : rowTop + rowH + 18;
    if (tg) {
      const tx = shot ? nameX : cx0;
      const te = clamp((s.ts - 0.6) / 0.3);
      ctx.save();
      ctx.globalAlpha *= te;
      tg.lines.forEach((l, i) => text(ctx, l, tx, y + tlh * (i + 0.5) + (1 - ease.outCubic(te)) * 18, { weight: 600, size: tg.size, color: C.mute, align: 'left' }));
      ctx.restore();
      y += tg.lines.length * tlh;
    }

    if (shot) {
      // The real thing, as a print taped into the window.
      const top = rowTop + rowH + 24;
      drawShotPrint(ctx, s, shot, item?.kind === 'video', { x: WIN.x + 28, y: top, w: WIN.w - 56, h: winBottom - 28 - top }, revealAt);
    } else {
      // The mock runs on its own clock, squeezed to fit short beats.
      const pace = clamp((s.dur - 1.0) / 3.0, 0.6, 1.0);
      drawMock(ctx, s, { x: cx0, y: y + 26, w: cx1 - cx0, h: winBottom - 36 - (y + 26) }, (s.ts - 0.55) / pace);
    }

    tape(ctx, WIN.x + 34, WIN.y + 6, 110, 38, -0.62, { seed: 'product-ta' });
    tape(ctx, WIN.x + WIN.w - 34, WIN.y + 6, 110, 38, 0.6, { seed: 'product-tb' });
    ctx.restore();

    // ------------------------------------------------ chips
    const chipFill = luminance(s.set.wall) > 0.5 ? C.ink : C.chalk;
    const rots = [-0.035, 0.025, -0.02];
    const offs = [0, 28, 10];
    const chipPts = [];
    chips.forEach((c, i) => {
      const mt = chipMetrics(ctx, c);
      const ccx = CHIP.x + offs[i] + mt.w / 2, ccy = CHIP.y + i * CHIP.step;
      chipPts.push({ x: CHIP.x + offs[i] + mt.w + 24, y: ccy });
      const e = s.enter(times[i], 0.34);
      if (e <= 0) return;
      const cb = boil(`product-chip${i}`, t, 0.7);
      ctx.save();
      ctx.translate(ccx + cb.dx, ccy + cb.dy - (1 - Math.min(e, 1)) * 40);
      ctx.rotate(rots[i] + (1 - Math.min(e, 1)) * (i % 2 ? 0.3 : -0.3) + cb.rot);
      ctx.scale(e, e);
      drawChip(ctx, mt, chipFill, `product-chipdisc${i}`);
      const tx = i % 2 ? mt.w / 2 - 20 : -mt.w / 2 + 20;
      tape(ctx, tx, -CHIP.h / 2 + 2, 52, 22, i % 2 ? 0.7 : -0.7, { seed: `product-chiptape${i}`, alpha: 0.75 });
      ctx.restore();
    });

    // ------------------------------------------------ Kit
    // Kit walks in from the right, then points: first at the window, then at
    // each chip as it lands, with a little hop of delight.
    const km = s.beat.mascot || {};
    const arrive = s.spring(0.1, { freq: 1.4, damp: 0.6 });
    const kx = KIT.x + (1 - arrive) * 380;
    const ky = BAND.floorY + 56;
    // Kit faces left (flipped), so world direction (dx, dy) is local angle
    // atan2(dy, -dx), measured from the pointing shoulder (mascot.mjs proportions).
    const aim = (px, py) => clamp(Math.atan2(py - (ky - 128 * KIT.s), -(px - (kx - 99 * KIT.s))), -1.35, 0.35);
    const aims = [{ at: 0, a: aim(560, winBottom - 60) }, ...chipPts.map((p, i) => ({ at: times[i], a: aim(p.x, p.y) }))];
    let k = 0;
    for (let i = 1; i < aims.length; i++) if (s.ts >= aims[i].at) k = i;
    const turn = k === 0 ? 1 : ease.outBack(clamp((s.ts - aims[k].at) / 0.24), 1.4);
    const pointAngle = lerp(aims[Math.max(0, k - 1)].a, aims[k].a, turn) + Math.sin(s.ts * 3.2) * 0.04;
    const since = k > 0 ? s.ts - aims[k].at : 1;
    const hop = since >= 0 && since < 0.3 ? Math.sin((since / 0.3) * Math.PI) * 12 : 0;
    const walking = (1 - arrive) * 380 > 8;
    s.kit({
      x: kx, y: ky - hop, s: KIT.s, flip: true, look: 0.4, pointAngle,
      pose: walking ? 'walk' : km.pose || 'point',
      face: km.face || (t < 0.7 ? 'wow' : since < 0.4 ? 'happy' : 'smile'),
    });
  },
};
