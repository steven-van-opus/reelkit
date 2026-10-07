// Speech bubble: Kit shouts the news. A big cut-paper speech bubble (a chalk
// card with a hand-torn edge, mounted on a pink backing card) pops out of
// Kit's mouth with an overshoot, its tail curving down to Kit on the floor.
// The title is set huge inside (a version number in pink), the kicker is a
// pink burst sticker on the bubble's top-left corner, the product logo sticker
// is taped to the top-right one and the by-line sits small at the bottom.
// Once up, the bubble breathes (a slight scale pulse, stepped on twos).
//
// Kit stands centred under the bubble when the title fits above y = 1000;
// under a photo print there's less room, so the bubble runs lower, Kit moves
// to the right (the hook does that when the returned bottom is > 1000) and
// the tail swings over to him.
import { W, C, isStudio } from '../../../brand.mjs';
import { paper, text, measure, tape } from '../../../paper.mjs';
import { rng, clamp, boil, spring, luminance } from '../../../util.mjs';
import { slapIn, logoSticker } from '../product.mjs';

// Where the hook stands Kit (hook.mjs: W/2 + 10 centred, W - 190 to the side),
// and a point just above his head for the tail to stop at.
const KIT_CENTRE = { x: W / 2 + 10, tipY: 1084 };
const KIT_SIDE = { x: W - 190, tipY: 1142 };

const N = 2.6;          // superellipse exponent: rounder than a card, squarer than an oval
const LH = 1.0;          // title line height, in ems
const BY = 44, BY_GAP = 18;

const pt = (a, b, th) => {
  const c = Math.cos(th), s = Math.sin(th);
  return [a * Math.sign(c) * Math.abs(c) ** (2 / N), b * Math.sign(s) * Math.abs(s) ** (2 / N)];
};

// The bubble's outline as a closed polygon around (0, 0): a superellipse
// resampled every ~11px, its edge torn (jittered along the normal), with the
// tail spliced in where the outline faces the tip.
function outline(a, b, tip, { seed, baseX = 0, rough = 4.5, baseHalf = 70, bend = 0.18 }) {
  if (isStudio()) rough = 0;
  // Dense, then resampled evenly by arc length.
  const dense = [];
  for (let i = 0; i < 1440; i++) dense.push(pt(a, b, (i / 1440) * Math.PI * 2));
  const even = [dense[0]];
  let acc = 0;
  for (let i = 1; i <= dense.length; i++) {
    const p = dense[i % dense.length], q = dense[i - 1];
    acc += Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (acc >= 11) { if (i < dense.length) even.push(p); acc = 0; }
  }
  const n = even.length;
  // The tail leaves the bottom edge at baseX; its base spans baseHalf either side.
  let at = 0, best = Infinity;
  even.forEach(([x, y], i) => {
    if (y > 0 && Math.abs(x - baseX) < best) { best = Math.abs(x - baseX); at = i; }
  });
  const k = Math.max(2, Math.round(baseHalf / 11));
  const r = rng(seed);
  const tear = ([x, y]) => {
    const len = Math.hypot(x / (a * a), y / (b * b)) || 1;
    const j = (r() - 0.5) * 2 * rough;
    return [x + (x / (a * a) / len) * j, y + (y / (b * b) / len) * j];
  };
  const pts = [];
  // From the far side of the tail all the way round to its near side.
  for (let i = k; i <= n - k; i++) pts.push(tear(even[(at + i) % n]));
  // Tail: two quadratic edges, both bowed the same way so it curls like a horn.
  const b0 = even[(at - k + n) % n], b1 = even[(at + k) % n];
  const edge = (p, q, side) => {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const nx = -(q[1] - p[1]) / len, ny = (q[0] - p[0]) / len;
    const cx = mx + nx * len * bend * side, cy = my + ny * len * bend * side;
    const out = [];
    const steps = Math.max(4, Math.round(len / 14));
    for (let i = 1; i < steps; i++) {
      const u = i / steps, v = 1 - u;
      const x = v * v * p[0] + 2 * v * u * cx + u * u * q[0];
      const y = v * v * p[1] + 2 * v * u * cy + u * u * q[1];
      const j = (r() - 0.5) * 2 * rough * 0.8;
      out.push([x + nx * j, y + ny * j]);
    }
    return out;
  };
  pts.push(b0, ...edge(b0, tip, 1), tip, ...edge(tip, b1, -1), b1);
  return pts;
}

const trace = pts => c => {
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
};

// All contiguous splits of `words` into `n` lines.
function splits(words, n) {
  if (n === 1) return [[words.join(' ')]];
  const out = [];
  for (let i = 1; i <= words.length - n + 1; i++) {
    for (const rest of splits(words.slice(i), n - 1)) out.push([words.slice(0, i).join(' '), ...rest]);
  }
  return out;
}

// Half-width the bubble leaves for text whose block is 2·hh tall (inset by pad).
const PAD_X = 24, PAD_Y = 16;
function roomX(a, b, hh) {
  const v = (hh + PAD_Y) / b;
  return v >= 1 ? 0 : a * (1 - v ** N) ** (1 / N) - PAD_X;
}

// The biggest title that fits the bubble (a, b) above a by-line byH tall, in
// 1–3 lines — one or two big lines beat three slightly bigger ones.
function layoutTitle(ctx, title, a, b, byH, maxSize, minSize = 56) {
  const words = String(title).split(/\s+/).filter(Boolean);
  const widest = (lines, size) => Math.max(...lines.map(l => measure(ctx, l, 900, size)));
  let best = null;
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    for (const lines of splits(words, n)) {
      const w100 = widest(lines, 100);
      let size = maxSize;
      while (size > minSize && (w100 * size) / 200 > roomX(a, b, (n * LH * size + byH) / 2)) size -= 2;
      while (size > minSize && widest(lines, size) / 2 > roomX(a, b, (n * LH * size + byH) / 2)) size -= 2;
      // Keep a version number with its name ("Opus 5.5 / for Chrome").
      const orphan = lines.some((l, i) => i > 0 && /\d/.test(l.split(' ')[0]) && !/\d/.test(lines[i - 1].split(' ').pop()));
      const score = size * (1 - 0.07 * (n - 1)) * (orphan ? 0.88 : 1);
      if (!best || score > best.score) best = { lines, size, score, w: widest(lines, size) };
    }
  }
  return best || { lines: [], size: minSize, w: 0 };
}

// One title line, centred on x, with any word that carries a digit ("2.1") in pink.
function titleLine(ctx, line, x, y, size) {
  const words = line.split(' ');
  if (!words.some(w => /\d/.test(w))) return text(ctx, line, x, y, { weight: 900, size, color: C.ink });
  let left = x - measure(ctx, line, 900, size) / 2;
  words.forEach((w, i) => {
    const seg = i < words.length - 1 ? `${w} ` : w;
    text(ctx, w, left, y, { weight: 900, size, color: /\d/.test(w) ? C.pink : C.ink, align: 'left' });
    left += measure(ctx, seg, 900, size);
  });
}

// A round sticker with a burst edge (many short points, so its text has room).
function sealPath(rad, seed, points = 22, inner = 0.86) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? rad * (inner + (r() - 0.5) * 0.04) : rad * (1 + (r() - 0.5) * 0.05);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return trace(pts);
}

// "JUST SHIPPED" → ['JUST', 'SHIPPED']: two balanced lines when it's long.
function kickerLines(str) {
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length < 2 || str.length <= 7) return [str];
  let best = [str], score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const sc = Math.max(l[0].length, l[1].length);
    if (sc < score) { score = sc; best = l; }
  }
  return best;
}

function kickerBurst(ctx, s, x, y, rad, kicker, at) {
  const k = slapIn(s, at, 0.32);
  if (!k) return;
  const str = kicker.toUpperCase();
  const lines = kickerLines(str);
  const ri = rad * 0.86 - 10;
  let size = 52;
  for (; size > 22; size -= 1) {
    const w = Math.max(...lines.map(l => measure(ctx, l, 900, size, 1)));
    const h = lines.length * size * 1.02;
    if ((w / 2) ** 2 + (h / 2) ** 2 <= ri * ri) break;
  }
  const b = boil('sb-kick', s.t, 1);
  ctx.save();
  ctx.globalAlpha *= k.alpha;
  ctx.translate(x + b.dx, y + b.dy);
  ctx.rotate(-0.16 + k.rot + b.rot * 2);
  ctx.scale(k.scale, k.scale);
  // Die-cut chalk border, then the pink burst printed on it.
  paper(ctx, sealPath(rad + 9, 'sb-kick-rim'), { fill: C.chalk, lift: 1.4 + k.lift * 0.5, rim: 0.6 });
  paper(ctx, sealPath(rad, 'sb-kick'), { fill: C.pink, lift: 0, rim: 0.7 });
  lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * size * 1.02 + size * 0.04, { weight: 900, size, color: C.chalk, tracking: 1 }));
  ctx.restore();
}

// Kit's shout: short tapered ink slivers fanning out either side of his head,
// clear of the tail, throbbing a little on twos.
function shoutLines(ctx, s, x, y, at, fill = C.ink) {
  const p = slapIn(s, at, 0.24);
  if (!p) return;
  const r = rng('sb-shout');
  ctx.save();
  ctx.globalAlpha *= p.alpha;
  for (const side of [-1, 1]) {
    [0.2, 0.55, 0.9].forEach((off, i) => {
      const ang = -Math.PI / 2 + side * (Math.PI / 2 - off + (r() - 0.5) * 0.06);
      const beat = 1 + 0.12 * Math.sin((s.ts * 2.4 + i * 0.33) * Math.PI * 2);
      const r0 = 100 + (1 - p.p) * -30, len = (i === 1 ? 58 : 44) * beat;
      const b = boil(`sb-shout-${side}-${i}`, s.t, 1.2);
      ctx.save();
      ctx.translate(x + Math.cos(ang) * r0 + b.dx, y + Math.sin(ang) * r0 + b.dy);
      ctx.rotate(ang + b.rot * 3);
      paper(ctx, c => {
        c.moveTo(0, -3);
        c.lineTo(len, -7.5);
        c.quadraticCurveTo(len + 7, 0, len, 7.5);
        c.lineTo(0, 3);
        c.closePath();
      }, { fill, lift: 0.5, rim: 0.3 });
      ctx.restore();
    });
  }
  ctx.restore();
}

export default {
  name: 'speech-bubble',
  label: 'Speech bubble',
  draw(ctx, s, { cx, top, bottom, title, kicker, by, toolId, maxW = 900 }) {
    // Room above Kit's head when he stands centred; otherwise he steps aside.
    const centred = Math.min(bottom, 1000) - top >= 430;
    const kit = centred ? KIT_CENTRE : KIT_SIDE;
    const burstR = centred ? 128 : 102;
    const y0 = top + (kicker && centred ? 40 : 12);
    const y1 = centred ? Math.min(bottom, 1000) - 8 : Math.min(bottom - 80, 1100);
    let a = maxW / 2;
    const bx = centred ? cx : cx - 30;
    const bySize = centred ? BY : 34, byGap = centred ? BY_GAP : 12;

    // Title: as big as the tallest bubble allows; the bubble then shrinks to fit it.
    const byH = by ? bySize * 1.15 + byGap : 0;
    const maxB = (y1 - y0) / 2;
    const fit = layoutTitle(ctx, title, a, maxB, byH, centred ? 220 : 150);
    const lh = fit.size * LH;
    const content = fit.lines.length * lh + byH;
    const u = Math.min(0.99, (fit.w / 2 + PAD_X) / a);
    let b = clamp(((content / 2 + PAD_Y) / (1 - u ** N) ** (1 / N)) * 1.03 + 6, Math.min(maxB, 140), maxB);
    // A short title shouldn't leave a long flat pill: a taller, narrower bubble
    // still fits it and reads as a speech bubble.
    const aFor = bb => ((fit.w / 2 + PAD_X) / (1 - Math.min(0.99, (content / 2 + PAD_Y) / bb) ** N) ** (1 / N)) * 1.04;
    while (b < maxB && b < 0.6 * Math.min(a, aFor(b))) b = Math.min(maxB, b + 4);
    a = Math.min(a, Math.max(300, aFor(b)));
    const by0 = (y0 + y1) / 2;
    const tip = [kit.x + (centred ? 0 : -86) - bx, kit.tipY - by0];
    const baseX = centred ? tip[0] - 36 : a * 0.32;

    // Pop out of Kit's mouth (scaled about the tail tip), overshoot, settle;
    // then breathe about the bubble's centre.
    const pop = spring(s.ts - 0.04, { freq: 2.2, damp: 0.6 });
    if (pop <= 0) return { bottom: centred ? Math.min(by0 + b, 1000) : kit.tipY };
    const breath = 1 + 0.012 * Math.sin((s.ts / 1.5) * Math.PI * 2) * clamp((s.ts - 0.7) / 0.4);
    const bo = boil('sb-bubble', s.t, 0.7);
    const seed = `sb-${title}`;
    const front = outline(a, b, tip, { seed, baseX, baseHalf: clamp(a * 0.15, 48, 70) });
    const back = outline(a + 12, b + 12, [tip[0] + 4, tip[1] + 12], { seed: `${seed}-back`, baseX, rough: 5.5, baseHalf: clamp(a * 0.15, 48, 70) + 12 });
    // The backing card is pink, or ink on a hot-pink wall where pink would vanish.
    const wl = luminance(s.set.wall || C.chalk);
    const backing = wl > 0.12 && wl < 0.45 ? C.ink : C.pink;

    ctx.save();
    ctx.globalAlpha *= clamp(pop * 4);
    ctx.translate(bx + tip[0], by0 + tip[1]);
    ctx.scale(pop, pop);
    ctx.rotate((1 - pop) * 0.1);
    ctx.translate(-tip[0], -tip[1]);
    ctx.translate(bo.dx, bo.dy);
    ctx.rotate(bo.rot);
    ctx.scale(breath, breath);

    ctx.save();
    ctx.translate(6, 9);
    paper(ctx, trace(back), { fill: backing, lift: 1.2, rim: 0.6 });
    ctx.restore();
    paper(ctx, trace(front), { fill: C.chalk, lift: 2 + Math.max(0, 1 - pop) * 3, rim: 0.9 });
    tape(ctx, -a * 0.18, -b + 4, 104, 34, -0.07, { seed: 'sb-tape', alpha: 0.78 });

    // Title lines, shouted in one after another; the by-line underneath.
    const blockTop = -content / 2;
    fit.lines.forEach((l, i) => {
      const sl = slapIn(s, 0.16 + i * 0.09, 0.3);
      if (!sl) return;
      ctx.save();
      ctx.globalAlpha *= sl.alpha;
      ctx.translate(0, blockTop + lh * (i + 0.5) + fit.size * 0.03);
      ctx.scale(sl.scale, sl.scale);
      titleLine(ctx, l, 0, 0, fit.size);
      ctx.restore();
    });
    if (by) {
      const bl = slapIn(s, 0.2 + fit.lines.length * 0.09, 0.3);
      if (bl) {
        ctx.save();
        ctx.globalAlpha *= bl.alpha;
        text(ctx, by, 0, blockTop + fit.lines.length * lh + byGap + (bySize * 1.15) / 2, { weight: 700, size: bySize, color: C.mute });
        ctx.restore();
      }
    }
    // Stickers stuck on the bubble's corners (they ride its pop and breath),
    // slid outward until they clear every line of text. The kicker takes the
    // top-left corner; under a print it moves to the bottom-left one so the
    // print stays clear.
    const corner = pt(a, b, -Math.PI * 0.75);
    const rects = fit.lines.map((l, i) => [measure(ctx, l, 900, fit.size) / 2, blockTop + lh * (i + 0.5), fit.size * 0.46]);
    if (by) rects.push([measure(ctx, by, 700, bySize) / 2, blockTop + fit.lines.length * lh + byGap + (bySize * 1.15) / 2, bySize * 0.55]);
    const clear = (x, y, rad, sx, sy) => {
      for (let i = 0; i < 60; i++) {
        const hit = rects.some(([hw, cy, hh]) => {
          const dx = Math.max(0, Math.abs(x) - hw), dy = Math.max(0, Math.abs(y - cy) - hh);
          return dx * dx + dy * dy < rad * rad;
        });
        if (!hit) break;
        x += sx * 6; y += sy * 4;
      }
      return [x, y];
    };
    if (kicker) {
      let [kx, ky] = centred
        ? clear(corner[0] + 18, corner[1] + 14, burstR + 6, -1, -1)
        : clear(corner[0] + 30, -corner[1] - 6, burstR + 6, -1, 1);
      kx = Math.max(burstR + 52 - bx, kx);
      kickerBurst(ctx, s, kx, ky, burstR, kicker, 0.42);
    }
    if (toolId) {
      const ls = slapIn(s, 0.58, 0.32);
      if (ls) {
        const size = centred ? 124 : 108;
        let [lx, ly] = clear(-corner[0] - 10, corner[1] + (centred ? 10 : 30), size * 0.62, 1, -1);
        lx = Math.min(W - 84 - bx, lx);
        const lb = boil('sb-logo', s.t, 0.8);
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(lx + lb.dx, ly + lb.dy);
        ctx.rotate(0.12 + ls.rot + lb.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, size, { toolId, lift: 1.4 + ls.lift * 0.4, taped: true, seed: 'sb-logo', tapeIn: clamp((s.ts - 0.72) / 0.12) });
        ctx.restore();
      }
    }
    ctx.restore();
    if (centred) shoutLines(ctx, s, kit.x, kit.tipY + 76, 0.62, s.set.ink || C.ink);
    // Kit stands centred under a bubble that ends above 1000; to the side otherwise.
    return { bottom: centred ? Math.min(by0 + b, 1000) : kit.tipY };
  },
};
