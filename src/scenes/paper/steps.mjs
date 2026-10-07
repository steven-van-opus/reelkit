// How-it-works beat: 2–4 numbered paper cards drop onto the wall one at a time,
// each landing as the narrator gets to it. A pink number disc is stuck on each
// card's left edge, and when the next card lands a tick sticker stamps onto the
// one before. Kit stands on the floor, pointing at the newest card.
import { W, C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, cutCirclePath, fitWrapped, text, tape, pinkGradient, withT } from '../../paper.mjs';
import { icon, sparkle, inkOn } from '../../fx.mjs';
import { clamp, ease, lerp, prog, rng, boil, spring } from '../../util.mjs';

const STOP = new Set(['the', 'and', 'with', 'your', 'you', 'for', 'from', 'into', 'that', 'this', 'then', 'them', 'its', 'any', 'all', 'get', 'can']);

// The most distinctive word of an item: what the narrator will say when they
// reach it.
function keyWord(str) {
  const words = String(str).toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(w => w.length >= 3 && !STOP.has(w));
  return words.sort((a, b) => b.length - a.length)[0] || null;
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
    const k = keyWord(item);
    const said = k ? s.wordTime(k) : null;
    if (said != null && said > a && said < b) at = said - 0.12;
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

// Card sizes by count: fewer cards get more room and bigger type.
const SIZE = { 1: [230, 0, 66], 2: [212, 48, 62], 3: [186, 34, 56], 4: [168, 24, 52] };

export default {
  type: 'steps',
  describe: 'How it works / what you can do. 2–4 numbered paper cards stack onto the wall one by one in sync with the voiceover; each gets a tick as the next arrives while Kit points at the newest.',
  props: {
    items: 'string[2–4], each ≤ 36 chars — one short action per step, in the order the voiceover says them, e.g. ["Upload a photo", "Pick a style", "Export in 4K"]',
  },
  draw(s) {
    const { ctx, t, ts, props } = s;
    const items = readItems(props, s.beat.label);
    const n = items.length;
    const [ch, gap, maxSize] = SIZE[n];
    const cw = 800;
    const total = n * ch + (n - 1) * gap;
    const top = Math.max(370, 748 - total / 2);
    const r = rng(`steps-${items.join('|')}`);
    const { at, step } = revealTimes(s, items);
    const lastTick = Math.min(Math.max(at[n - 1] + 0.9, at[n - 1] + step * 0.7), Math.max(s.dur - 0.5, at[n - 1] + 0.5));
    const tickAt = at.map((_, i) => (i < n - 1 ? at[i + 1] + 0.2 : lastTick));

    const cards = items.map((item, i) => ({
      item,
      cx: W / 2 + (i % 2 ? 14 : -14) + (r() - 0.5) * 12,
      cy: top + ch / 2 + i * (ch + gap),
      rot: (r() - 0.5) * 0.032,
      back: (r() < 0.5 ? -1 : 1) * (0.018 + r() * 0.012),
    }));
    const shown = at.filter(a => ts >= a).length;
    const newest = Math.max(0, shown - 1);

    cards.forEach((cd, i) => {
      const dt = ts - at[i];
      if (dt < 0) return;
      const drop = spring(dt, { freq: 2.5, damp: 0.5 });
      const land = ease.outCubic(clamp(dt / 0.24));
      const side = i % 2 ? 1 : -1;
      const b = boil(`step-${i}`, t, 0.8);
      // A stamp landing on the card knocks it down a few px.
      const st = ts - tickAt[i];
      const jolt = st > 0.1 && st < 0.3 ? Math.sin(((st - 0.1) / 0.2) * Math.PI) * 6 : 0;
      const isNew = i === newest;
      const float = isNew ? Math.sin(ts * 2.6) * 3 : 0;

      withT(ctx, {
        x: cd.cx + b.dx,
        y: cd.cy - (1 - drop) * 170 + b.dy + jolt + float,
        rot: cd.rot + (1 - drop) * 0.16 * side + b.rot,
        scale: 1 + (1 - land) * 0.08,
        alpha: clamp(dt / 0.08),
      }, () => {
        // A second sheet peeking out underneath gives the stack depth.
        withT(ctx, { x: 10, y: 12, rot: cd.back }, () => {
          paper(ctx, c => roundRectPath(c, -cw / 2, -ch / 2, cw, ch, 22), { fill: C.blush, lift: 0.8, rim: 0.6 });
        });
        paper(ctx, c => roundRectPath(c, -cw / 2, -ch / 2, cw, ch, 22), {
          fill: C.chalk,
          lift: lerp(3.2, isNew ? 2.1 : 1.3, land),
          rim: 1,
        });
        tape(ctx, cw / 2 - 64, -ch / 2 + 4, 96, 32, 0.32 * side, { seed: `steps-tape-${i}`, alpha: 0.78 });

        // Number disc stuck over the left edge.
        const dr = ch > 180 ? 58 : 52;
        const dx = -cw / 2 + 4;
        paper(ctx, c => cutCirclePath(c, dx, 0, dr, { seed: `steps-n-${i}` }), {
          fill: pinkGradient(ctx, dx - dr, -dr, dx + dr, dr), lift: 1.4, rim: 0.8,
        });
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(dx, 0, dr - 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        text(ctx, String(i + 1), dx, 4, { weight: 900, size: dr * 1.15, color: C.chalk });

        // Item text, bold ink, up to two lines.
        const tx = -cw / 2 + 92, tw = cw - 92 - 74;
        const { size, lines } = fitWrapped(ctx, cd.item, 900, tw, 2, maxSize, 34);
        const lh = size * 1.08;
        lines.forEach((l, k) => text(ctx, l, tx, (k - (lines.length - 1) / 2) * lh + 3, { weight: 900, size, color: C.ink, align: 'left', tracking: -0.5 }));

        // Tick sticker stamps on over the right edge.
        if (st > 0) {
          const hit = clamp(st / 0.11);
          const settle = st > 0.11 ? 1 - 0.12 * Math.exp(-(st - 0.11) * 12) * Math.cos((st - 0.11) * 28) : 1;
          const sc = (st < 0.11 ? lerp(1.9, 1, ease.inQuad(hit)) : settle);
          const kx = cw / 2 - 10, ky = 6, kr = ch > 180 ? 44 : 40;
          withT(ctx, { x: kx, y: ky, rot: lerp(-0.5, -0.14, hit), scale: sc, alpha: clamp(st / 0.04) }, () => {
            paper(ctx, c => cutCirclePath(c, 0, 0, kr, { seed: `steps-tick-${i}` }), { fill: s.accent, lift: lerp(3, 1, hit), rim: 0.7 });
            icon(ctx, 'check', 0, 1, kr * 1.15, inkOn(s.accent));
          });
          // Little paper sparks fly off on impact.
          const sp = prog(st, 0.1, 0.32);
          if (sp > 0 && sp < 1) {
            for (let k = 0; k < 3; k++) {
              const a = -1.9 + k * 0.95;
              const d = kr + 18 + ease.outCubic(sp) * 46;
              sparkle(ctx, kx + Math.cos(a) * d, ky + Math.sin(a) * d, 13 * (1 - sp), { fill: C.pink, lift: 0.3 });
            }
          }
        }
      });
    });

    // Kit stands bottom-right, pointing at the newest card; the arm sweeps
    // down the stack as cards land.
    const m = s.beat.mascot || {};
    const kx = 866, ky = BAND.floorY + 62, ks = 0.86;
    const shoulder = { x: kx - 99 * ks, y: ky - 128 * ks };
    const aim = i => {
      const cd = cards[clamp(i, 0, n - 1)];
      return Math.atan2(cd.cy - shoulder.y, cd.cx - 40 - shoulder.x);
    };
    const sweep = ease.inOutCubic(prog(ts, at[newest], 0.28));
    const world = lerp(aim(newest - 1 < 0 ? 0 : newest - 1), aim(newest), newest === 0 ? 1 : sweep);
    const justStamped = tickAt.some(k => ts >= k && ts < k + 0.55);
    const justLanded = at.some(k => ts >= k && ts < k + 0.35);
    s.kit({
      x: kx, y: ky, s: ks, flip: true,
      pose: m.pose || 'point',
      face: m.face || (justStamped ? 'happy' : justLanded ? 'wow' : 'smile'),
      pointAngle: Math.PI - world,
      look: 0.7,
    });
  },
};
