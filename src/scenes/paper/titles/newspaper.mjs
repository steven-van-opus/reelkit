// Newspaper clipping: a torn piece of newsprint taped to the wall. Our own
// masthead ("<brand name> Daily", small caps) and dateline sit between
// rules, the kicker is a pink all-caps overline, the title a huge, tight,
// condensed-feel headline with a pink highlighter swipe behind one word, and
// the by-line is the deck. Any room left becomes greeked body copy in ruled
// columns; a halftone screen and ink wear make it read as print.
import { createCanvas } from '@napi-rs/canvas';
import { C } from '../../../brand.mjs';
import { paper, tornRectPath, text, measure, tape, grainCanvas } from '../../../paper.mjs';
import { rng, clamp, boil, mix, ease } from '../../../util.mjs';
import { drawMark, markWidth } from '../../../brandmark.mjs';
import { BRAND } from '../../../brandpack.mjs';
import { slapIn, logoSticker } from '../product.mjs';

const MASTHEAD = `${BRAND.name} Daily`;

const NEWS = mix(C.chalk, C.kraft, 0.34);      // newsprint
const FIBRE = mix(C.chalk, C.kraft, 0.08);     // the torn edge's lighter fibres
const GREY = mix(C.ink, C.chalk, 0.22);        // deck
const SX = 0.84;                               // horizontal squeeze: condensed feel
const LH = 0.88;                               // headline leading

// ---------------------------------------------------------------- textures

const patterns = new WeakMap();
function pattern(ctx, key, make) {
  let byCtx = patterns.get(ctx);
  if (!byCtx) patterns.set(ctx, (byCtx = {}));
  if (!byCtx[key]) byCtx[key] = ctx.createPattern(make(), 'repeat');
  return byCtx[key];
}
let dotTile = null;
// A 45° halftone screen: one dot per cell, offset every other row.
const halftone = ctx => pattern(ctx, 'dots', () => {
  if (dotTile) return dotTile;
  const S = 10;
  dotTile = createCanvas(S, S);
  const g = dotTile.getContext('2d');
  g.fillStyle = C.ink;
  for (const [x, y] of [[0, 0], [S, 0], [0, S], [S, S], [S / 2, S / 2]]) {
    g.beginPath();
    g.arc(x, y, 1.35, 0, Math.PI * 2);
    g.fill();
  }
  return dotTile;
});
const wear = ctx => pattern(ctx, 'wear', () => grainCanvas('dark'));

// ---------------------------------------------------------------- type

// The masthead as small caps: capitals full size, the rest as
// capitals at 78%, all on one baseline. Returns the width; draws when `draw`.
function smallCaps(ctx, str, x, y, size, { weight = 800, color = C.ink, tracking = 2, draw = true } = {}) {
  const runs = [];
  for (const ch of str) {
    const big = ch !== ch.toLowerCase();
    const last = runs[runs.length - 1];
    if (last && last.big === big) last.s += ch.toUpperCase();
    else runs.push({ s: ch.toUpperCase(), big });
  }
  const sz = r => (r.big ? size : size * 0.78);
  const widths = runs.map(r => measure(ctx, r.s, weight, sz(r), tracking) + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  if (draw) {
    let cx = x - total / 2;
    runs.forEach((r, i) => {
      text(ctx, r.s, cx, y, { weight, size: sz(r), color, align: 'left', baseline: 'alphabetic', tracking });
      cx += widths[i];
    });
  }
  return total;
}

const headTrack = size => -0.035 * size;
const wordW = (ctx, str, size) => measure(ctx, str, 900, size, headTrack(size)) * SX;
// A headline line word by word: tight letters, but an honest word space.
function layoutLine(ctx, line, size) {
  const words = [];
  let x = 0;
  line.split(' ').forEach((w, i) => {
    if (i) x += size * 0.24 * SX;
    const ww = wordW(ctx, w, size);
    words.push({ w, x, ww });
    x += ww;
  });
  return { words, width: x };
}
const headW = (ctx, line, size) => layoutLine(ctx, line, size).width;

// Split words into n lines so the widest line is as narrow as possible.
function bestSplit(ctx, words, n) {
  if (n === 1) return [words.join(' ')];
  let best = null, bestW = Infinity;
  const rec = (start, left, acc) => {
    if (left === 1) {
      const lines = [...acc, words.slice(start).join(' ')];
      const w = Math.max(...lines.map(l => headW(ctx, l, 100)));
      if (w < bestW) { bestW = w; best = lines; }
      return;
    }
    for (let i = start + 1; i <= words.length - left + 1; i++) rec(i, left - 1, [...acc, words.slice(start, i).join(' ')]);
  };
  rec(0, n, []);
  return best;
}

// The biggest headline (1–3 lines) that fits innerW × budget.
function fitHeadline(ctx, title, innerW, budget, maxSize, minSize) {
  const words = String(title).split(/\s+/).filter(Boolean);
  let best = { size: 0, lines: [words.join(' ')] };
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    const lines = bestSplit(ctx, words, n);
    const per100 = Math.max(...lines.map(l => headW(ctx, l, 100)));
    const size = Math.floor(Math.min(maxSize, (innerW / per100) * 100, budget / (n * LH + 0.12)));
    // A line more has to earn its keep: ≥ 8% bigger type.
    if (size > best.size * (n > 1 ? 1.08 : 1)) best = { size, lines };
  }
  // Never below the floor unless that is the only way to fit.
  return best.size ? best : { size: minSize, lines: best.lines };
}

// Which word gets the highlighter: the version number, else the last word.
function highlightWord(title) {
  const words = String(title).split(/\s+/).filter(Boolean);
  const i = words.findIndex(w => /\d/.test(w));
  return i >= 0 ? i : words.length - 1;
}

// Deck copy starts with a capital ("from Google" → "From Google").
const deckCase = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

function dateline(date) {
  const d = new Date(`${date || '2026-01-01'}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
}

// ---------------------------------------------------------------- draw

function draw(ctx, s, { cx, top, bottom: limit = 1010, title, kicker, by, toolId, maxW = 900 }) {
  const roomy = limit - top > 500;
  const w = Math.min(maxW, 900);
  const pad = roomy ? 46 : 40;
  const innerW = w - pad * 2;
  const room = limit - top - 24;

  // Fixed rows (heights include their gaps).
  const mast = roomy ? 46 : 36, mastH = mast * 1.25;
  const dateSize = roomy ? 21 : 18, dateH = dateSize + 20;
  const kickSize = roomy ? 40 : 32, kickH = kicker ? kickSize * 1.45 : 0;
  const deckSize = roomy ? 42 : 34, deckH = by ? deckSize * 1.45 : 0;
  const padTop = roomy ? 22 : 16, padBot = roomy ? 24 : 20;
  const fixed = padTop + mastH + 14 + dateH + 12 + kickH + deckH + padBot;

  const head = fitHeadline(ctx, title, innerW, room - fixed - (roomy ? 36 : 0), roomy ? 196 : 150, 56);
  const hs = head.size, headH = head.lines.length * hs * LH + hs * 0.12;
  const left = room - fixed - headH;
  const bodyH = left >= 34 ? Math.min(left, roomy ? 230 : 120) : 0;
  const h = Math.round(fixed + headH + bodyH);
  const cy = top + 6 + (limit - top - 12) / 2;

  const sl = slapIn(s, 0.06, 0.36);
  if (!sl) return { bottom: cy + h / 2 };
  const b = boil('news-clip', s.t, 0.7);
  const x0 = -w / 2, y0 = -h / 2;
  const clip = c => tornRectPath(c, x0, y0, w, h, { seed: `news-${title}`, rough: 4, step: 11 });

  ctx.save();
  ctx.globalAlpha *= sl.alpha;
  ctx.translate(cx + b.dx, cy + b.dy);
  ctx.rotate(-0.022 + sl.rot + b.rot);
  ctx.scale(sl.scale, sl.scale);

  // Torn newsprint: a lighter fibre fringe under the printed sheet.
  paper(ctx, c => tornRectPath(c, x0 - 6, y0 - 5, w + 12, h + 10, { seed: `news-fibre-${title}`, rough: 6, step: 8 }), { fill: FIBRE, lift: 1.8 + sl.lift, rim: 0.3 });
  paper(ctx, clip, { fill: NEWS, lift: 0, rim: 0.5 });

  ctx.save();
  ctx.beginPath();
  clip(ctx);
  ctx.clip();
  // Halftone screen, heavier toward the bottom-right like an uneven press run.
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = halftone(ctx);
  ctx.fillRect(x0, y0, w, h);
  // A tint that grows toward the bottom-right corner, dot by dot.
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = C.ink;
  const reach = Math.min(360, h * 0.7), step = 10;
  for (let gy = y0 + h - reach; gy < y0 + h + step; gy += step) {
    for (let gx = x0 + w - reach; gx < x0 + w + step; gx += step) {
      const ox = ((gy / step) & 1) * step / 2;
      const d = 1 - Math.hypot(x0 + w - gx - ox, y0 + h - gy) / reach;
      if (d <= 0) continue;
      ctx.beginPath();
      ctx.arc(gx + ox, gy, 3.4 * d, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const fade = ctx.createLinearGradient(x0 + w * 0.3, y0 + h * 0.2, x0 + w, y0 + h);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalAlpha = 1;

  let y = y0 + padTop;
  const xl = x0 + pad, xr = x0 + w - pad;

  // Masthead: our mark + "<brand name> Daily" in small caps.
  const markH = mast * 0.82, gap = mast * 0.32;
  const mw = smallCaps(ctx, MASTHEAD, 0, 0, mast, { weight: 900, tracking: 3, draw: false });
  const mastTotal = markWidth(markH) + gap + mw;
  const mastBase = y + mast * 0.95;
  drawMark(ctx, -mastTotal / 2, mastBase - markH * 0.92, markH, { fill: C.pink });
  smallCaps(ctx, MASTHEAD, -mastTotal / 2 + markWidth(markH) + gap + mw / 2, mastBase, mast, { weight: 900, tracking: 3, color: C.ink });
  y += mastH;

  // Rules and dateline.
  const rule = (yy, lw) => { ctx.fillStyle = C.ink; ctx.fillRect(xl, yy, innerW, lw); };
  rule(y, 5);
  rule(y + 9, 1.5);
  y += 14;
  const dl = dateline(s.episode?.date);
  text(ctx, dl, xl, y + dateH / 2, { weight: 800, size: dateSize, color: C.ink, align: 'left', tracking: 1.5 });
  const right = 'TOOLS · NEWS · RESOURCES';
  if (measure(ctx, dl, 800, dateSize, 1.5) + measure(ctx, right, 800, dateSize, 1.5) + 40 < innerW) {
    text(ctx, right, xr, y + dateH / 2, { weight: 800, size: dateSize, color: C.ink, align: 'right', tracking: 1.5 });
  }
  y += dateH;
  rule(y, 1.5);
  y += 12;

  // Kicker overline: a pink block bullet + tracked caps.
  if (kicker) {
    const ky = y + kickH / 2 + 2;
    const sq = kickSize * 0.56;
    ctx.fillStyle = C.pink;
    ctx.fillRect(xl, ky - sq / 2 - 1, sq, sq);
    text(ctx, kicker.toUpperCase(), xl + sq + 14, ky, { weight: 900, size: kickSize, color: C.pink, align: 'left', tracking: 3 });
    y += kickH;
  }

  // Headline, with the highlighter swiped on behind one word.
  const hiWord = highlightWord(title);
  const hiP = ease.outCubic(clamp((s.ts - 0.52) / 0.28));
  let wi = 0;
  const lineBoxes = [];
  head.lines.forEach((line, li) => {
    const ly = y + hs * LH * (li + 0.5) + hs * 0.04;
    const lay = layoutLine(ctx, line, hs);
    lineBoxes.push({ y: ly, end: xl + lay.width });
    const k = hiWord - wi;
    if (hiP > 0 && k >= 0 && k < lay.words.length) {
      const word = lay.words[k];
      const hx0 = xl + word.x - hs * 0.07;
      const hx1 = xl + word.x + word.ww + hs * 0.09;
      const r = rng(`hi-${title}`);
      const yA = ly - hs * 0.06, yB = ly + hs * 0.36;
      const xe = hx0 + (hx1 - hx0) * hiP;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = mix(C.pink, C.blush, 0.35);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(hx0 + r() * 8, yA + (r() - 0.5) * 6);
      ctx.lineTo(xe, yA - 4 + (r() - 0.5) * 4);
      ctx.lineTo(xe + hs * 0.04, (yA + yB) / 2);
      ctx.lineTo(xe - 2, yB + 3);
      ctx.lineTo(hx0 - 4, yB + (r() - 0.5) * 8);
      ctx.lineTo(hx0 - hs * 0.03, (yA + yB) / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const word of lay.words) {
      ctx.save();
      ctx.translate(xl + word.x, ly);
      ctx.scale(SX, 1);
      text(ctx, word.w, 0, 0, { weight: 900, size: hs, color: C.ink, align: 'left', tracking: headTrack(hs) });
      ctx.restore();
    }
    wi += lay.words.length;
  });
  y += headH;

  // Deck.
  if (by) {
    text(ctx, deckCase(by), xl, y + deckH / 2 - 2, { weight: 700, size: deckSize, color: GREY, align: 'left' });
    y += deckH;
  }

  // Body copy: greeked lines in ruled columns, running off the torn edge.
  if (bodyH) {
    rule(y + 4, 1.5);
    const cols = roomy ? 3 : 2, cg = 34;
    const cw = (innerW - cg * (cols - 1)) / cols;
    const r = rng(`body-${title}`);
    for (let ci = 0; ci < cols; ci++) {
      const bx = xl + ci * (cw + cg);
      if (ci) { ctx.fillStyle = 'rgba(16,16,20,0.22)'; ctx.fillRect(bx - cg / 2, y + 20, 1.5, bodyH); }
      for (let ry = y + 22, n = 0; ry < y + bodyH + 30; ry += 18, n++) {
        const para = r() < 0.14;
        const end = bx + (para ? cw * (0.3 + r() * 0.4) : cw);
        ctx.fillStyle = 'rgba(16,16,20,0.2)';
        for (let wx = bx; wx < end - 10;) {
          const ww = Math.min(end - wx, 18 + r() * 62);
          ctx.fillRect(wx, ry, ww, 6);
          wx += ww + 9;
        }
      }
    }
  }

  // Ink wear and press unevenness over everything printed.
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = fade;
  ctx.fillRect(x0, y0, w, h);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = wear(ctx);
  ctx.fillRect(x0, y0, w, h);
  ctx.restore();

  // Taped to the wall: two corners, pressed on once the clipping lands.
  const tIn = clamp((s.ts - 0.34) / 0.12);
  if (tIn > 0) {
    tape(ctx, x0 + 24, y0 + 10, 118 * tIn, 38, -0.72, { seed: 'news-tape-a', alpha: 0.8 });
    tape(ctx, x0 + w - 28, y0 + h - 10, 118 * tIn, 38, -0.68, { seed: 'news-tape-b', alpha: 0.8 });
    if (!toolId) tape(ctx, x0 + w - 24, y0 + 10, 118 * tIn, 38, 0.7, { seed: 'news-tape-c', alpha: 0.8 });
  }

  // The product's logo sticker, stuck beside the shortest headline line (never
  // on the type); with no room there, over the clipping's top-right corner.
  if (toolId) {
    const ls = slapIn(s, 0.72, 0.32);
    if (ls) {
      const size = Math.round(clamp(hs * 0.9, 104, 136));
      const free = lineBoxes.map(l => ({ ...l, room: xr - l.end }));
      const spot = free.filter(l => l.room >= size + 30).sort((a, b) => b.room - a.room)[0];
      const lx = spot ? xr - size / 2 + 4 : x0 + w - 30;
      const lyy = spot ? spot.y - hs * 0.04 : y0 + 4;
      ctx.save();
      ctx.globalAlpha *= ls.alpha;
      ctx.translate(lx, lyy);
      ctx.rotate(0.1 + ls.rot);
      ctx.scale(ls.scale, ls.scale);
      logoSticker(ctx, size, { toolId, lift: 1.4 + ls.lift * 0.5, taped: true, seed: 'news-logo', tapeIn: clamp((s.ts - 0.86) / 0.12) });
      ctx.restore();
    }
  }
  ctx.restore();
  return { bottom: cy + h / 2 };
}

export default { name: 'newspaper', label: 'Newspaper clipping', draw };
