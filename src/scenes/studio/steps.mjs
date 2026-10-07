// How-it-works beat: 2–4 numbered list cards, like a checklist on the site.
// Dashed placeholders show how many steps are coming; each white card slides
// into its slot as the narrator gets to it, its number on a pink brand-pixel
// tile, and when the next card lands the tile before it turns into a check.
// Kit stands on the floor, pointing at the newest card.
import { W, C, BAND, font } from '../../brand.mjs';
import { paper, roundRectPath, fitWrapped, wrapLines, text, trackingFor } from '../../paper.mjs';
import { brandGradient } from '../../brandmark.mjs';
import { clamp, ease, lerp, prog, spring, luminance } from '../../util.mjs';

const STOP = new Set(['the', 'and', 'with', 'your', 'you', 'for', 'from', 'into', 'that', 'this', 'then', 'them', 'its', 'any', 'all', 'get', 'can']);

// The distinctive words of an item, longest first: what the narrator is likely
// to say when they reach it.
function keyWords(str) {
  return String(str).toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(w => w.length >= 3 && !STOP.has(w))
    .sort((a, b) => b.length - a.length);
}

// When each card lands: on the word that names it if the voiceover says it,
// else evenly spread across the voiceover. The first card always lands at the
// top of the voice so the beat never opens empty.
function revealTimes(s, items, first = 0.2) {
  const a = Math.max(first, s.voStart);
  const b = Math.max(a + 0.6 * items.length, s.voEnd);
  const step = (b - a) / items.length;
  const out = [];
  items.forEach((item, i) => {
    if (i === 0) return out.push(a);
    let at = a + i * step;
    const said = keyWords(item).map(k => s.wordTime(k)).find(x => x != null && x > a && x < b);
    if (said != null) at = said - 0.12;
    out.push(Math.max(at, out[i - 1] + 0.4));
  });
  return { at: out, step };
}

function readItems(props, fallback) {
  let items = props.items;
  if (typeof items === 'string') items = items.split(/\n|;|\|/);
  items = (Array.isArray(items) ? items : []).map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 4);
  return items.length ? items : [fallback || 'Step one'];
}

// Two lines of big type if they fit; an over-long item may take a third line
// at a smaller size rather than shrinking to nothing.
function fitItem(ctx, str, maxW, maxSize, roomy) {
  const two = fitWrapped(ctx, str, 'd600', maxW, 2, maxSize, 40);
  ctx.save();
  ctx.font = font('d600', two.size);
  ctx.letterSpacing = `${trackingFor(two.size)}px`;
  const all = wrapLines(ctx, str, maxW);
  ctx.restore();
  if (all.length <= 2) return two;
  return fitWrapped(ctx, str, 'd600', maxW, roomy ? 3 : 2, 40, 34);
}

// Lucide's Check ("M20 6 9 17l-5-5"), drawn from its short arm so it can be
// stroked on progressively. Centred on the origin in a `size` box.
function check(ctx, size, p, color) {
  if (p <= 0) return;
  const s = size / 24;
  const pts = [[4, 12], [9, 17], [20, 6]];
  const seg = [Math.hypot(5, 5), Math.hypot(11, 11)];
  let left = p * (seg[0] + seg[1]);
  ctx.save();
  ctx.translate(-size / 2, -size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (let i = 0; i < 2 && left > 0; i++) {
    const k = Math.min(1, left / seg[i]);
    ctx.lineTo(lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k));
    left -= seg[i];
  }
  ctx.stroke();
  ctx.restore();
}

// The step number on a brand-pixel tile; `done` (0..1) swaps it for a check.
function numberTile(ctx, x, y, size, num, done) {
  ctx.save();
  ctx.shadowColor = 'rgba(255,43,136,0.28)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.218);
  ctx.fillStyle = brandGradient(ctx, x - size / 2, y - size / 2, x + size / 2, y + size / 2);
  ctx.fill();
  ctx.restore();
  const out = ease.inCubic(clamp(done / 0.35));
  if (out < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - out;
    ctx.translate(x, y);
    ctx.scale(1 - out * 0.4, 1 - out * 0.4);
    text(ctx, String(num), 0, size * 0.03, { weight: 'd600', size: size * 0.52, color: '#FFFFFF' });
    ctx.restore();
  }
  ctx.save();
  ctx.translate(x, y);
  check(ctx, size * 0.6, ease.outCubic(clamp((done - 0.25) / 0.75)), '#FFFFFF');
  ctx.restore();
}

// An empty slot: a dashed outline with the step number waiting in it.
// tone: 'light' (light walls), 'ink' or 'pink'.
function slot(ctx, x, y, w, h, num, tile, tone) {
  const line = { light: 'rgba(16,16,20,0.16)', ink: 'rgba(255,255,255,0.18)', pink: 'rgba(255,255,255,0.42)' }[tone];
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.fillStyle = { light: 'rgba(255,255,255,0.45)', ink: 'rgba(255,255,255,0.04)', pink: 'rgba(255,255,255,0.10)' }[tone];
  ctx.fill();
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = line;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + PAD, y + h / 2 - tile / 2, tile, tile, tile * 0.218);
  ctx.stroke();
  ctx.restore();
  text(ctx, String(num), x + PAD + tile / 2, y + h / 2 + tile * 0.03, { weight: 'd600', size: tile * 0.46, color: line });
}

// Card height, gap, max type size and tile size by count: fewer cards get
// more room and bigger type.
const SIZE = { 1: [210, 0, 72, 92], 2: [190, 36, 66, 88], 3: [172, 28, 60, 82], 4: [152, 22, 52, 74] };
const CW = 840, PAD = 32;

export default {
  type: 'steps',
  describe: 'How it works / what you can do. 2–4 numbered list cards slide into place one by one in sync with the voiceover; each number turns into a check as the next arrives while Kit points at the newest.',
  props: {
    items: 'string[2–4], each ≤ 36 chars — one short action per step, in the order the voiceover says them, e.g. ["Upload a photo", "Pick a style", "Export in 4K"]',
  },
  draw(s) {
    const { ctx, t, props } = s;
    const items = readItems(props, s.beat.label);
    const n = items.length;
    const [ch, gap, maxSize, tile] = SIZE[n];
    const pitch = ch + gap;
    const top = Math.max(380, 740 - (n * pitch - gap) / 2);
    const x = W / 2 - CW / 2 - 10;
    const { at, step } = revealTimes(s, items);
    const lastTick = Math.min(Math.max(at[n - 1] + 0.9, at[n - 1] + step * 0.7), Math.max(s.dur - 0.5, at[n - 1] + 0.5));
    const tickAt = at.map((_, i) => (i < n - 1 ? at[i + 1] + 0.2 : lastTick));
    const lum = luminance(s.set.wall);
    const tone = lum < 0.1 ? 'ink' : lum < 0.5 ? 'pink' : 'light';

    const shown = at.filter(a => t >= a).length;
    const newest = Math.max(0, shown - 1);
    const cardY = i => top + i * pitch;

    // Placeholders fade in with the beat and give way as their card lands.
    items.forEach((_, i) => {
      const fade = clamp(t / 0.25) * (1 - clamp((t - at[i] - 0.05) / 0.2));
      if (fade <= 0) return;
      ctx.save();
      ctx.globalAlpha *= fade;
      slot(ctx, x, cardY(i), CW, ch, i + 1, tile, tone);
      ctx.restore();
    });

    items.forEach((item, i) => {
      const dt = t - at[i];
      if (dt < 0) return;
      const land = spring(dt, { freq: 2.2, damp: 0.62 });
      const isNew = i === newest;
      const float = isNew ? Math.sin(t * 2.4) * 3 : 0;
      const y = cardY(i) + (1 - land) * 46 + float;
      const k = 0.97 + 0.03 * land;
      ctx.save();
      ctx.globalAlpha *= clamp(dt / 0.16);
      ctx.translate(x + CW / 2, y + ch / 2);
      ctx.scale(k, k);
      ctx.translate(-CW / 2, -ch / 2);
      paper(ctx, c => roundRectPath(c, 0, 0, CW, ch, 16), { fill: '#FFFFFF', lift: lerp(3, isNew ? 2.2 : 1.2, clamp(dt / 0.4)) });

      // Number tile pops in just after the card; turns into a check when done.
      const pop = s.enter(at[i] + 0.06, 0.36);
      const done = clamp((t - tickAt[i]) / 0.4);
      const pulse = done > 0 && done < 1 ? 1 + Math.sin(done * Math.PI) * 0.1 : 1;
      if (pop > 0) {
        ctx.save();
        ctx.translate(PAD + tile / 2, ch / 2);
        ctx.scale(pop * pulse, pop * pulse);
        numberTile(ctx, 0, 0, tile, i + 1, done);
        ctx.restore();
      }

      // Item text in ink, eased in from the left.
      const tx = PAD + tile + 30, tw = CW - tx - 36;
      const { size, lines } = fitItem(ctx, item, tw, maxSize, ch > 160);
      const lh = size * 1.1;
      const tp = ease.outCubic(clamp((dt - 0.05) / 0.3));
      ctx.save();
      ctx.globalAlpha *= tp;
      lines.forEach((l, j) => text(ctx, l, tx + (1 - tp) * 16, ch / 2 + (j - (lines.length - 1) / 2) * lh + size * 0.04, { weight: 'd600', size, color: C.ink, align: 'left' }));
      ctx.restore();
      ctx.restore();
    });

    // Kit stands bottom-right, pointing at the newest card; the arm sweeps
    // down the list as cards land.
    const kx = 880, ky = BAND.floorY + 62, ks = 0.88;
    const sweep = ease.inOutCubic(prog(t, at[newest], 0.28));
    const target = i => ({ x: x + CW * 0.5, y: cardY(clamp(i, 0, n - 1)) + ch / 2 });
    const from = target(Math.max(0, newest - 1)), to = target(newest);
    const aim = newest === 0 ? to : { x: lerp(from.x, to.x, sweep), y: lerp(from.y, to.y, sweep) };
    const justTicked = tickAt.some(k => t >= k && t < k + 0.55);
    const justLanded = at.some(k => t >= k && t < k + 0.35);
    s.kit({
      x: kx, y: ky, s: ks, flip: true,
      pose: 'point',
      face: justTicked ? 'happy' : justLanded ? 'wow' : 'smile',
      pointAt: aim,
      look: 0.7,
    });
  },
};
