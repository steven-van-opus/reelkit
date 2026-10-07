// Label-maker tape: every word (or short phrase) punched onto its own strip of
// glossy embossed label tape — ink tape, the version number on pink — with
// raised chalk capitals (each glyph bevelled: lit top-left, shadowed
// bottom-right, stress-whitened plastic), a notched cut end, and a gloss
// glint that sweeps across once the strip is pressed on. The strips stick at
// small angles in a loose stack; the kicker is a short yellow tape with raised
// ink letters and the by-line a thin strip of kraft paper tape.
import { createCanvas } from '@napi-rs/canvas';
import { C, font } from '../../../brand.mjs';
import { paper, text, measure, grainCanvas } from '../../../paper.mjs';
import { rng, clamp, boil, mix, shade, rgba, ease, luminance } from '../../../util.mjs';
import { slapIn, logoSticker } from '../product.mjs';

const YELLOW = '#FFC94D';            // the warm accent: kicker tape
const INK_TAPE = '#1A1A21';
const CAP = 0.727;                   // Inter's cap height, em
const RATIO = 0.8;                   // letter size ÷ tape height

// Every way to cut the title's words into 1–4 consecutive strips, skipping
// cuts that leave a lone filler word ("THE") on a strip of its own.
function groupings(title) {
  const words = String(title).toUpperCase().split(/\s+/).filter(Boolean);
  const out = [];
  const rec = (start, acc) => {
    if (start === words.length) { out.push(acc); return; }
    for (let end = start + 1; end <= words.length && acc.length < 4; end++) {
      const g = words.slice(start, end).join(' ');
      if (end - start === 1 && words.length > 1 && g.length <= 3 && !/\d/.test(g)) continue;
      rec(end, [...acc, g]);
    }
  };
  rec(0, []);
  return out.length ? out : [[words.join(' ')]];
}

// ---------------------------------------------------------------- tape geometry

// A strip centred on the origin: one end cut straight (soft corners), the
// other with a small V notch.
function stripPath(ctx, w, h, notch = 'right') {
  const x = -w / 2, y = -h / 2, r = Math.min(5, h * 0.06), n = h * 0.17;
  ctx.moveTo(x + (notch === 'left' ? 0 : r), y);
  if (notch === 'right') {
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - n, y + h / 2);
    ctx.lineTo(x + w, y + h);
  } else {
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  }
  if (notch === 'left') {
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + n, y + h / 2);
    ctx.lineTo(x, y);
  } else {
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
  ctx.closePath();
}

// Punched characters sit in near-even cells, like a label maker's wheel.
function cells(ctx, str, size) {
  ctx.font = font(900, size);
  const track = size * 0.07;
  return [...str].map(ch => {
    const gw = ctx.measureText(ch).width;
    return { ch, gw, cw: ch === ' ' ? size * 0.42 : Math.max(gw, size * (/[.,:'’]/.test(ch) ? 0.3 : 0.5)) + track };
  });
}
const cellsWidth = cs => cs.reduce((a, c) => a + c.cw, 0);

// Size of a strip for `label` at letter size `size`.
function stripSize(ctx, label, size) {
  const h = Math.round(size / RATIO);
  const padX = h * 0.36, notch = h * 0.17;
  return { w: Math.round(cellsWidth(cells(ctx, label, size)) + padX * 2 + notch), h };
}

// ---------------------------------------------------------------- tape artwork (cached)

const cache = new Map();
const M = 10; // canvas margin around the strip

// The finished strip, drawn once into its own canvas: glossy tape plus the
// raised letters. `ink` is the letter colour (chalk on dark tapes).
function stripArt(label, size, fill, ink, notch) {
  const key = `${label}|${size}|${fill}|${ink}|${notch}`;
  if (cache.has(key)) return cache.get(key);
  const probe = createCanvas(8, 8).getContext('2d');
  const { w, h } = stripSize(probe, label, size);
  const cv = createCanvas(w + M * 2, h + M * 2);
  const g = cv.getContext('2d');
  g.translate(M + w / 2, M + h / 2);
  const shape = () => { g.beginPath(); stripPath(g, w, h, notch); };
  const r = rng(`tape-${key}`);

  // Tape body: a vinyl gradient, darker toward the bottom edge.
  shape();
  const body = g.createLinearGradient(0, -h / 2, 0, h / 2);
  body.addColorStop(0, shade(fill, 0.16));
  body.addColorStop(0.18, fill);
  body.addColorStop(0.75, shade(fill, -0.08));
  body.addColorStop(1, shade(fill, -0.3));
  g.fillStyle = body;
  g.fill();
  g.save();
  g.clip();
  // Lengthwise striations of extruded vinyl.
  for (let i = 0; i < Math.round(h / 3); i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    g.fillRect(-w / 2, -h / 2 + r() * h, w, 0.8 + r() * 1.4);
  }
  g.globalAlpha = 0.45;
  g.fillStyle = g.createPattern(grainCanvas(luminance(fill) < 0.3 ? 'dark' : 'light'), 'repeat');
  g.fillRect(-w / 2, -h / 2, w, h);
  g.globalAlpha = 1;
  // Gloss: a soft band over the top third and a crisp specular line.
  const gloss = g.createLinearGradient(0, -h / 2, 0, -h / 2 + h * 0.46);
  gloss.addColorStop(0, 'rgba(255,255,255,0.30)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gloss;
  g.fillRect(-w / 2, -h / 2, w, h * 0.46);
  const spec = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  spec.addColorStop(0, 'rgba(255,255,255,0)');
  spec.addColorStop(0.15, 'rgba(255,255,255,0.55)');
  spec.addColorStop(0.7, 'rgba(255,255,255,0.35)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = spec;
  g.fillRect(-w / 2, -h / 2 + h * 0.09, w, Math.max(1.5, h * 0.018));
  g.restore();

  // Raised letters, glyph by glyph: a stretched-plastic halo, the shadowed
  // bottom-right bevel, the lit top-left bevel, then the face.
  const cs = cells(g, label, size);
  const padX = h * 0.36, nInset = notch === 'left' ? h * 0.17 : 0;
  let x = -w / 2 + padX + nInset;
  const base = size * CAP / 2;
  const u = size / 100;
  const face = g.createLinearGradient(0, -base, 0, base);
  const dark = luminance(fill) < 0.3;
  face.addColorStop(0, dark ? '#FFFFFF' : shade(ink, 0.18));
  face.addColorStop(1, dark ? mix(C.chalk, fill, 0.14) : ink);
  g.font = font(900, size);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  for (const c of cs) {
    const cx = x + c.cw / 2;
    x += c.cw;
    if (c.ch === ' ') continue;
    g.save();
    g.shadowColor = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)';
    g.shadowBlur = 7 * u;
    g.fillStyle = rgba(shade(fill, -0.5), 0.8);
    g.fillText(c.ch, cx + 1.8 * u, base + 2.6 * u);
    g.restore();
    g.fillStyle = dark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.7)';
    g.fillText(c.ch, cx - 1.3 * u, base - 1.7 * u);
    g.fillStyle = face;
    g.fillText(c.ch, cx, base);
  }
  // Stress whitening: faint streaks of the tape colour through the letters.
  g.save();
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < Math.round(h / 9); i++) {
    g.fillStyle = rgba(fill, dark ? 0.06 + r() * 0.09 : 0.06);
    g.fillRect(-w / 2, -base + r() * base * 2, w, 1 + r() * 1.6);
  }
  g.restore();

  // Cut edges: a dark outline and a lit top lip.
  shape();
  g.lineWidth = 1.5;
  g.strokeStyle = rgba(shade(fill, -0.55), 0.55);
  g.stroke();
  g.save();
  shape();
  g.clip();
  g.translate(0, 1.5);
  shape();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(255,255,255,0.28)';
  g.stroke();
  g.restore();

  const art = { cv, w, h };
  cache.set(key, art);
  return art;
}

// Place a strip: slapped on, with a contact shadow and — once it lands — a
// gloss glint that sweeps along it.
function placeStrip(ctx, s, art, { x, y, rot, at, notch, seed }) {
  const sl = slapIn(s, at, 0.3);
  if (!sl) return;
  const b = boil(seed, s.t, 0.8);
  const { cv, w, h } = art;
  ctx.save();
  ctx.globalAlpha *= sl.alpha;
  ctx.translate(x + b.dx, y + b.dy);
  ctx.rotate(rot + sl.rot + b.rot);
  ctx.scale(sl.scale, sl.scale);
  ctx.save();
  const lift = 1.1 + sl.lift;
  ctx.shadowColor = `rgba(44, 8, 28, ${0.2 + lift * 0.05})`;
  ctx.shadowBlur = 4 + lift * 8;
  ctx.shadowOffsetX = lift * 1.5;
  ctx.shadowOffsetY = 2 + lift * 5;
  ctx.drawImage(cv, -w / 2 - M, -h / 2 - M);
  ctx.restore();
  const p = clamp((s.ts - at - 0.3) / 0.36);
  if (p > 0 && p < 1) {
    ctx.save();
    ctx.beginPath();
    stripPath(ctx, w, h, notch);
    ctx.clip();
    const gx = -w / 2 - h + (w + h * 2) * ease.inOutQuad(p);
    const glint = ctx.createLinearGradient(gx - h * 0.5, 0, gx + h * 0.5, 0);
    glint.addColorStop(0, 'rgba(255,255,255,0)');
    glint.addColorStop(0.5, 'rgba(255,255,255,0.32)');
    glint.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glint;
    ctx.transform(1, 0, -0.45, 1, 0, 0);
    ctx.fillRect(gx - h * 0.5, -h / 2, h, h);
    ctx.restore();
  }
  ctx.restore();
}

// Thin kraft paper tape with torn zig-zag ends, for the by-line.
function kraftPath(ctx, w, h, seed) {
  const r = rng(seed);
  const teeth = Math.max(4, Math.round(h / 7));
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  for (let i = 1; i <= teeth; i++) ctx.lineTo(w / 2 + (i % 2 ? 4 + r() * 3 : -r() * 2), -h / 2 + (h * i) / teeth);
  ctx.lineTo(-w / 2, h / 2);
  for (let i = teeth - 1; i >= 0; i--) ctx.lineTo(-w / 2 + (i % 2 ? -4 - r() * 3 : r() * 2), -h / 2 + (h * i) / teeth);
  ctx.closePath();
}

// ---------------------------------------------------------------- draw

function draw(ctx, s, { cx, top, bottom: limit = 1010, title, kicker, by, toolId, maxW = 900 }) {
  const roomy = limit - top > 500;
  const r = rng(`label-${title}`);

  const kSize = roomy ? 40 : 34, kH = kicker ? Math.round(kSize / RATIO) : 0;
  const bySize = roomy ? 38 : 32, byH = by ? Math.round(bySize * 1.45) : 0;
  const gap = roomy ? 12 : 9, gapK = kicker ? (roomy ? 22 : 14) : 0, gapB = by ? (roomy ? 22 : 14) : 0;
  const room = limit - top - 28;

  // The cut into strips with the biggest letters that fit the width and the
  // height; near-ties go to the cut that keeps the version number on its own
  // (pink) strip.
  const sizeFor = ls => {
    const widest = Math.max(...ls.map(l => stripSize(ctx, l, 100).w));
    const tall = (room - kH - gapK - byH - gapB - gap * (ls.length - 1)) / (ls.length / RATIO);
    return Math.floor(Math.min(roomy ? 150 : 108, ((maxW - 70) / widest) * 100, tall));
  };
  const score = ls => sizeFor(ls) * (ls.some(l => /^[\d.]+$/.test(l)) ? 1.06 : 1);
  const lines = groupings(title).sort((a, b) => score(b) - score(a))[0];
  const n = lines.length;
  const size = sizeFor(lines);
  const sh = Math.round(size / RATIO);

  const block = kH + gapK + n * sh + (n - 1) * gap + gapB + byH;
  let y = top + 10 + Math.max(0, (room - block) / 2);
  const accent = lines.findIndex(l => /\d/.test(l));
  const pinkAt = accent >= 0 ? accent : n > 1 ? n - 1 : -1;

  // Strips, staggered left/right of centre.
  const placed = [];
  const kickY = y + kH / 2;
  if (kicker) y += kH + gapK;
  lines.forEach((line, i) => {
    const pink = i === pinkAt;
    const notch = i % 2 ? 'left' : 'right';
    const art = stripArt(line, size, pink ? C.pink : INK_TAPE, C.chalk, notch);
    const sway = n > 1 ? (i % 2 ? 1 : -1) * Math.min(40, (maxW - 60 - art.w) / 2) : 0;
    const x = cx + sway * 0.8;
    const rot = (i % 2 ? 1 : -1) * (0.018 + r() * 0.02);
    placed.push({ x, y: y + sh / 2, w: art.w, art, rot, notch, i });
    y += sh + gap;
  });
  y -= gap;
  placed.forEach(p => placeStrip(ctx, s, p.art, { x: p.x, y: p.y, rot: p.rot, at: 0.06 + p.i * 0.14, notch: p.notch, seed: `lbl${p.i}` }));

  // Kicker: a short yellow tape with raised ink letters, tucked at the stack's
  // top-left.
  let kick = null;
  if (kicker) {
    const art = stripArt(kicker.toUpperCase(), kSize, YELLOW, C.ink, 'right');
    const first = placed[0];
    const kx = Math.max(70 + art.w / 2, Math.min(cx - 40, first.x - first.w / 2 + art.w / 2 - 18));
    kick = { x: kx, y: kickY, w: art.w };
    placeStrip(ctx, s, art, { x: kx, y: kickY, rot: -0.045, at: 0.06 + n * 0.14, notch: 'right', seed: 'lbl-k' });
  }

  // By-line on thin kraft tape, hanging off the right of the stack.
  if (by) {
    const bl = slapIn(s, 0.12 + n * 0.14, 0.3);
    if (bl) {
      const bw = measure(ctx, by, 700, bySize) + 52;
      const last = placed[n - 1];
      // Right of centre but short of the floor's right side, where Kit cheers
      // when the stack runs low.
      const bx = Math.min(last.x + last.w / 2 - bw / 2 + 30, cx + 70);
      const b = boil('lbl-by', s.t, 0.8);
      ctx.save();
      ctx.globalAlpha *= bl.alpha;
      ctx.translate(bx + b.dx, y + gapB + byH / 2 + b.dy);
      ctx.rotate(0.03 + bl.rot + b.rot);
      ctx.scale(bl.scale, bl.scale);
      paper(ctx, c => kraftPath(c, bw, byH, `by-${by}`), { fill: C.kraft, lift: 1 + bl.lift * 0.5, rim: 0.4 });
      text(ctx, by, 0, 2, { weight: 700, size: bySize, color: C.ink });
      ctx.restore();
    }
    y += gapB + byH;
  }

  // The product's logo sticker: beside the strip with the most room (never
  // over a letter); failing that, beside the kicker.
  if (toolId) {
    const ls = slapIn(s, 0.6 + n * 0.08, 0.32);
    if (ls) {
      const lsize = Math.round(clamp(sh * 0.82, 100, 132));
      const spots = placed.map(p => ({ x: p.x + p.w / 2, y: p.y, room: 1010 - (p.x + p.w / 2) }));
      if (kick) spots.push({ x: kick.x + kick.w / 2, y: kick.y, room: 1010 - (kick.x + kick.w / 2), kick: true });
      const spot = spots.filter(o => o.room >= lsize + 30).sort((a, b) => (a.kick ? 1 : 0) - (b.kick ? 1 : 0) || b.room - a.room)[0];
      if (spot) {
        const lx = Math.min(1010 - lsize / 2, spot.x + 26 + lsize / 2 + Math.min(40, (spot.room - lsize - 30) * 0.3));
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(lx, spot.y - 4);
        ctx.rotate(0.11 + ls.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, lsize, { toolId, lift: 1.4 + ls.lift * 0.5, taped: true, seed: 'lbl-logo', tapeIn: clamp((s.ts - 0.78 - n * 0.08) / 0.12) });
        ctx.restore();
      }
    }
  }
  return { bottom: y };
}

export default { name: 'label-maker', label: 'Label-maker tape', draw };
