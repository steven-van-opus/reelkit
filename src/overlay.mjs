// Screen-space overlays that sit above the camera: the taped beat label at the
// top and the spoken-word caption chips at the bottom.
import { W, C, BAND, font, isStudio } from './brand.mjs';
import { paper, tornRectPath, roundRectPath, tape, fitSize, measure, text, pinkGradient } from './paper.mjs';
import { ease, clamp, prog, rng, onTwos } from './util.mjs';
import { brandPixel } from './brandmark.mjs';
import { logoTile } from './logos.mjs';

// ---------------------------------------------------------------- header

function studioHeader(ctx, label, t, { slap = true, dark = false } = {}) {
  const size = fitSize(ctx, label, 'd600', 760, 46, 30);
  const tw = measure(ctx, label, 'd600', size);
  const icon = 60, padX = 22, gap = 18;
  const w = Math.min(W - 100, padX + icon + gap + tw + padX + 8);
  const h = icon + 26;
  const x = (W - w) / 2, y = BAND.headerY - h / 2;
  const p = slap ? ease.outCubic(prog(t, 0, 0.38)) : 1;
  ctx.save();
  ctx.globalAlpha *= p;
  ctx.translate(0, (1 - p) * -26);
  paper(ctx, c => roundRectPath(c, x, y, w, h, 20), { fill: dark ? C.panel : '#FFFFFF', lift: 1.4 });
  brandPixel(ctx, x + padX + icon / 2, BAND.headerY, icon);
  text(ctx, label, x + padX + icon + gap, BAND.headerY + 2, { weight: 'd600', size, color: dark ? C.chalk : C.ink, align: 'left' });
  ctx.restore();
}

// The strip and its tape stay inside the safe zone (x 70–1010): the strip is
// at most HEADER_MAX wide and the tape sits TAPE_IN from its ends.
const HEADER_MAX = 920, TAPE_IN = 40;

// dark: studio's dark-surface header. darkWall: the paper set's wall is near
// black, so the ink strip gets a chalk rim to keep its torn silhouette.
export function drawHeader(ctx, label, t, { slap = true, seed = label, dark = false, darkWall = false } = {}) {
  if (!label) return;
  if (isStudio()) return studioHeader(ctx, label, t, { slap, dark });
  const str = label.toUpperCase();
  const iconW = 58;
  const padX = 34;
  const maxTextW = HEADER_MAX - padX * 2 - iconW - 14;
  // Sized with the tracking and word gaps text() draws.
  let size = 50;
  while (size > 30 && measure(ctx, str, 900, size, 1) > maxTextW) size -= 2;
  const tw = measure(ctx, str, 900, size, 1);
  // Past the smallest size, squeeze the type rather than run off the strip.
  const squeeze = Math.min(1, maxTextW / tw);
  const w = Math.min(HEADER_MAX, tw * squeeze + padX * 2 + iconW + 14);
  const h = size + 46;
  const x = (W - w) / 2;
  const y = BAND.headerY - h / 2;

  const p = slap ? prog(t, 0, 0.32) : 1;
  const sc = slap ? 1 + (1 - ease.outBack(p, 2.4)) * 0.22 : 1;
  const r = rng(seed);
  const rot = (r() - 0.5) * 0.03 + (slap ? (1 - ease.outCubic(p)) * 0.06 : 0);

  ctx.save();
  ctx.translate(W / 2, BAND.headerY);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -BAND.headerY);
  ctx.globalAlpha *= clamp(p * 3);

  paper(ctx, c => tornRectPath(c, x, y, w, h, { seed: `hdr-${seed}`, rough: 4.5, step: 11 }), {
    fill: C.ink, lift: 1.6, rim: 0.4,
    ...(darkWall ? { stroke: 'rgba(250,250,252,0.78)', strokeWidth: 3, shadowColor: 'rgba(255,255,255,0.10)' } : {}),
  });

  // Brand chip: the brand pack's real app icon.
  brandPixel(ctx, x + padX - 6 + iconW / 2, BAND.headerY, iconW);

  const tx = x + padX + iconW + 14;
  ctx.save();
  ctx.translate(tx, 0);
  ctx.scale(squeeze, 1);
  text(ctx, str, 0, BAND.headerY + 2, { weight: 900, size, color: C.chalk, align: 'left', tracking: 1 });
  ctx.restore();

  tape(ctx, x + TAPE_IN, y + 4, 92, 34, -0.42, { seed: `ta-${seed}`, color: '#FF8DBF', alpha: 0.72 });
  tape(ctx, x + w - TAPE_IN, y + h - 4, 92, 34, -0.42, { seed: `tb-${seed}`, color: '#FF8DBF', alpha: 0.72 });
  ctx.restore();
}

// ---------------------------------------------------------------- captions

// Group spoken words into short chunks (≤3 words, break after punctuation).
export function chunkWords(words) {
  const chunks = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const chars = cur.reduce((n, x) => n + x.text.length, 0);
    if (cur.length >= 3 || /[.,!?;:—]$/.test(w.raw || w.text) || chars > 16) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

// Strip edge punctuation from a caption word, but keep quotation marks
// (Comment “TOOLBOX”) and keep them balanced.
const clean = s => {
  const out = s.replace(/^[^\p{L}\p{N}$#@“"]+|[^\p{L}\p{N}%+$#@'”"]+$/gu, '');
  const open = /^[“"]/.test(out), close = /[”"]$/.test(out);
  return open && !close ? `${out}”` : close && !open ? `“${out}` : out;
};

// mentions: Map(wordIndex → { toolId, span }) from mentions.mjs — a mentioned
// product gets its logo tile inside the chip of its first word.
export function drawCaptions(ctx, words, t, { mentions = null } = {}) {
  if (!words?.length) return;
  const chunks = chunkWords(words.map((w, k) => ({ ...w, k })));
  // Active chunk: the last one whose first word has started.
  let idx = -1;
  for (let i = 0; i < chunks.length; i++) if (t >= chunks[i][0].start - 0.04) idx = i;
  if (idx < 0) return;
  const chunk = chunks[idx];
  const chunkEnd = chunks[idx + 1] ? chunks[idx + 1][0].start : chunk[chunk.length - 1].end + 0.6;
  if (t > chunkEnd + 0.05) return;

  const size = 58;
  const padX = 22, gap = 14, h = size + 34;
  const logo = size * 0.9;
  const items = chunk.map(w => ({ w, label: clean(w.text) || w.text, mention: mentions?.get(w.k) || null }));
  const widths = items.map(it => measure(ctx, it.label, 800, size) + padX * 2 + (it.mention ? logo + 12 : 0));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  const scale = total > 900 ? 900 / total : 1;
  let x = W / 2 - (total * scale) / 2;
  const y = BAND.captionY;

  ctx.save();
  items.forEach((it, i) => {
    const w = widths[i] * scale;
    const appear = prog(t, it.w.start - 0.03, 0.16);
    if (appear <= 0) { x += w + gap * scale; return; }
    const active = t >= it.w.start - 0.03 && t < (items[i + 1] ? items[i + 1].w.start - 0.03 : chunkEnd);
    const r = rng(`cap-${it.w.start.toFixed(2)}-${it.label}`);
    const rot = isStudio() ? 0 : (r() - 0.5) * 0.07;
    const pop = isStudio() ? 0.86 + 0.14 * ease.outBack(appear, 1.6) : 0.6 + 0.4 * ease.outBack(appear, 2.2);
    const cx = x + w / 2;
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(rot);
    ctx.scale(pop * scale, pop * scale);
    const bw = widths[i];
    paper(ctx, c => tornRectPath(c, -bw / 2, -h / 2, bw, h, { seed: `cp-${it.label}-${i}`, rough: 2.6, step: 10 }), {
      fill: active ? pinkGradient(ctx, -bw / 2, -h / 2, bw / 2, h / 2) : isStudio() ? '#FFFFFF' : C.chalk,
      lift: active ? 1.4 : 0.9,
      rim: 0.7,
    });
    if (it.mention) {
      logoTile(ctx, -bw / 2 + padX - 6 + logo / 2, 0, logo, { toolId: it.mention.toolId, shadow: false, radius: logo * 0.26 });
      text(ctx, it.label, -bw / 2 + padX + logo + 6, 3, { weight: 800, size, color: active ? C.chalk : C.ink, align: 'left' });
    } else {
      text(ctx, it.label, 0, 3, { weight: 800, size, color: active ? C.chalk : C.ink });
    }
    ctx.restore();
    x += w + gap * scale;
  });
  ctx.restore();
}
