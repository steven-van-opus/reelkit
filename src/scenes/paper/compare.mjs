// Before vs after: a muted, crumpled "before" card sits alone while Kit shrugs
// at it, gets an X stamped on it and is shoved up out of the way when the voice
// reaches the after part; a chunky arrow draws down to a lifted chalk "after"
// card with a star badge, and an optional verdict pill stamps in at the bottom.
import { C, BAND, font } from '../../brand.mjs';
import { paper, card, roundRectPath, fitWrapped, text, measure, tape, withT } from '../../paper.mjs';
import { arrow, badge, icon, pill, sparkles, confetti, inkOn } from '../../fx.mjs';
import { clamp, lerp, ease, rng, boil, onTwos, rgba, luminance } from '../../util.mjs';

// Card geometry. The before card starts big and centred ("solo"), then moves
// to the top-left slot ("paired") when the after card arrives below it.
const BEFORE = { w: 600, h: 262, solo: { x: 540, y: 735, sc: 1.1, rot: -0.02 }, paired: { x: 392, y: 508, sc: 1, rot: -0.055 } };
const AFTER = { w: 800, h: 330, x: 585, y: 888, rot: 0.022 };
const KIT = { x: 190, s: 0.9 };
const VERDICT = { x: 668, y: 1188, maxW: 560 };

const BEFORE_FILL = '#D9D7DF';
const BEFORE_INK = '#4A4954';
const BEFORE_TAB = '#8B8996';

// Words that usually open the "after" half of a sentence.
const PIVOTS = ['now', 'after', 'today', 'instead', 'but', 'new', 'then'];
const STOP = new Set(['the', 'and', 'for', 'with', 'you', 'your', 'its', "it's", 'was', 'are', 'that', 'this', 'from', 'one', 'all']);
const norm = w => String(w).toLowerCase().replace(/[^\p{L}\p{N}.%$+']/gu, '').replace(/^'+|'+$/g, '');

// Normalise a side: accepts { label, text } or a bare string.
function side(v, fallbackLabel) {
  const o = typeof v === 'string' ? { text: v } : v && typeof v === 'object' ? v : {};
  const label = String(o.label || '').trim();
  const body = String(o.text || '').trim();
  // A side with only a label shows the label as its body under a generic tab.
  if (!body) return { label: fallbackLabel, text: label || fallbackLabel };
  return { label: label || fallbackLabel, text: body };
}

// Local time of the first spoken word (at or after `from`) that matches a
// meaningful word of `strs`, or a pivot word; null when nothing matches.
function cue(s, strs, from, { pivots = [] } = {}) {
  const keys = strs.flatMap(str => String(str || '').split(/\s+/)).map(norm).filter(k => k.length >= 3 && !STOP.has(k));
  for (const w of s.words) {
    if (w.start < from) continue;
    const tx = norm(w.text);
    if (!tx) continue;
    if (pivots.includes(tx)) return w.start;
    if (keys.some(k => tx === k || (k.length >= 5 && tx.startsWith(k.slice(0, -1))) || (tx.length >= 5 && k.startsWith(tx)))) return w.start;
  }
  return null;
}

// fitWrapped, but text that still doesn't fit at minSize ends in "…" instead
// of silently losing words (or a single long word running off the card).
function fitLines(ctx, str, weight, maxW, maxLines, maxSize, minSize) {
  const { size, lines } = fitWrapped(ctx, str, weight, maxW, maxLines, maxSize, minSize);
  ctx.font = font(weight, size);
  const cut = lines.join(' ') !== String(str).split(/\s+/).filter(Boolean).join(' ');
  return {
    size,
    lines: lines.map((l, i) => {
      let line = l, dots = cut && i === lines.length - 1;
      while (line.length > 1 && ctx.measureText(dots ? `${line}…` : line).width > maxW) {
        line = line.slice(0, -1).trimEnd();
        dots = true;
      }
      return dots ? `${line.replace(/[\s,.;:—-]+$/, '')}…` : line;
    }),
  };
}

// Single-line fit with an ellipsis fallback, for tabs and the verdict.
function fitOne(ctx, str, weight, maxW, maxSize, minSize, tracking = 0) {
  let size = maxSize;
  while (size > minSize && measure(ctx, str, weight, size, tracking) > maxW) size -= 2;
  let s = str;
  while (s.length > 1 && measure(ctx, s, weight, size, tracking) > maxW) s = `${s.slice(0, -2).trimEnd()}…`;
  return { size, str: s };
}

// Crumpled-paper treatment: soft light/dark facets and a few creases, each a
// dark fold with a lit edge beside it. Call with the card path clipped.
function crumple(ctx, w, h, seed) {
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const cx = (r() - 0.5) * w, cy = (r() - 0.5) * h, rad = 70 + r() * 120, a0 = r() * Math.PI * 2;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = a0 + (k * Math.PI * 2) / 3 + (r() - 0.5) * 0.8;
      ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.7);
    }
    ctx.closePath();
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.13)' : 'rgba(40,30,60,0.055)';
    ctx.fill();
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 6; i++) {
    const pts = [];
    let x = (r() - 0.5) * w, y = (r() - 0.5) * h, a = r() * Math.PI;
    pts.push([x, y]);
    for (let k = 0; k < 3; k++) {
      const len = 50 + r() * 110;
      a += (r() - 0.5) * 1.1;
      x += Math.cos(a) * len;
      y += Math.sin(a) * len;
      pts.push([x, y]);
    }
    const line = (dx, dy) => {
      ctx.beginPath();
      pts.forEach(([px, py], k) => (k ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy)));
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(30,20,50,0.13)';
    ctx.lineWidth = 2.2;
    line(0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.6;
    line(1.2, 2);
  }
}

// One tapered brush stroke from (ax, ay) to (bx, by) with ragged edges.
function brushPath(ctx, ax, ay, bx, by, width, r) {
  const n = 14, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const left = [], right = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const hw = (width / 2) * (0.62 + 0.38 * Math.pow(Math.sin(Math.PI * u), 0.4)) + (r() - 0.5) * 3;
    const px = ax + dx * u, py = ay + dy * u;
    left.push([px + nx * hw, py + ny * hw]);
    right.push([px - nx * (hw + (r() - 0.5) * 3), py - ny * (hw + (r() - 0.5) * 3)]);
  }
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left.slice(1)) ctx.lineTo(x, y);
  for (const [x, y] of right.reverse()) ctx.lineTo(x, y);
  ctx.closePath();
}

// Rubber-stamped X slammed onto the card: scales down from 1.9× as p goes
// 0 → 1, with speckled ink dropout in the paper colour.
function stampX(ctx, x, y, size, p, { color = C.ink, paperFill = BEFORE_FILL, seed = 'x' } = {}) {
  if (p <= 0) return;
  const k = ease.outCubic(p);
  const r = rng(seed);
  const hs = size / 2, wd = size * 0.24;
  const build = c => {
    brushPath(c, -hs, -hs, hs, hs, wd, r);
    brushPath(c, hs, -hs * 1.02, -hs * 0.96, hs, wd, r);
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.1 + (1 - k) * 0.25);
  ctx.scale(1 + (1 - k) * 0.9, 1 + (1 - k) * 0.9);
  ctx.globalAlpha *= clamp(p * 3) * 0.9;
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = color;
  ctx.fill('nonzero');
  ctx.clip('nonzero');
  const d = rng(`${seed}-dots`);
  ctx.fillStyle = rgba(paperFill, 0.55);
  for (let i = 0; i < 70; i++) {
    ctx.beginPath();
    ctx.arc((d() - 0.5) * size * 1.1, (d() - 0.5) * size * 1.1, 1 + d() * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Short ink ticks radiating from a box that just landed (impact lines).
function impact(ctx, x, y, w, h, p, color) {
  if (p <= 0 || p >= 1) return;
  const k = ease.outCubic(p);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= 1 - p;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const [ax, ay, a] of [[-1, -1, -2.4], [-1, 0, Math.PI], [-1, 1, 2.4], [1, -1, -0.7], [1, 0, 0], [1, 1, 0.7]]) {
    const ox = x + (ax * w) / 2 + Math.cos(a) * (14 + k * 26), oy = y + (ay * h) / 2 + Math.sin(a) * (10 + k * 20);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a) * 22, oy + Math.sin(a) * 22);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBefore(ctx, data, { stamp }) {
  const { w, h } = BEFORE;
  card(ctx, -w / 2, -h / 2, w, h, { torn: true, seed: 'cmp-before', rough: 6, fill: BEFORE_FILL, lift: 0.9, rim: 0.7 });
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 4);
  ctx.clip();
  crumple(ctx, w, h, 'cmp-crumple');
  ctx.restore();

  // Body text, muted.
  const { size, lines } = fitLines(ctx, data.text, 800, w - 90, 3, 54, 36);
  const lh = size * 1.12;
  const ty = 18 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => text(ctx, l, 0, ty + i * lh, { weight: 800, size, color: BEFORE_INK, tracking: -0.5 }));

  // Label tab, slightly askew on the top-left edge.
  const label = data.label.toUpperCase();
  const lf = fitOne(ctx, label, 900, 300, 34, 26, 1);
  withT(ctx, { x: -w / 2 + 40, y: -h / 2 + 4, rot: -0.05 }, () =>
    pill(ctx, 0, 0, lf.str, { fill: BEFORE_TAB, color: C.chalk, size: lf.size, weight: 900, tracking: 1, align: 'left', padX: 22, lift: 0.6 }));

  tape(ctx, w / 2 - 34, -h / 2 + 2, 110, 36, 0.62, { seed: 'cmp-tape-b', alpha: 0.78 });

  stampX(ctx, w / 2 - 92, h / 2 - 70, 150, stamp, { seed: 'cmp-x' });
}

function drawAfter(ctx, data, { t, badgeIn, accent }) {
  const { w, h } = AFTER;
  card(ctx, -w / 2, -h / 2, w, h, { r: 28, fill: C.chalk, lift: 2.8, rim: 1, seed: 'cmp-after' });

  const { size, lines } = fitLines(ctx, data.text, 900, w - 110, 3, 70, 40);
  const lh = size * 1.08;
  const ty = 20 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => text(ctx, l, 0, ty + i * lh, { weight: 900, size, color: C.ink, tracking: -1 }));

  const label = data.label.toUpperCase();
  const lf = fitOne(ctx, label, 900, 420, 38, 28, 1);
  withT(ctx, { x: -w / 2 + 34, y: -h / 2 + 2, rot: -0.04 }, () =>
    pill(ctx, 0, 0, lf.str, { fill: 'pink', size: lf.size, weight: 900, tracking: 1, align: 'left', padX: 24, lift: 1.4 }));

  // Star badge on the top-right corner, in the topic accent.
  if (badgeIn > 0) {
    const pinkish = accent.toUpperCase() === C.pink;
    withT(ctx, { x: w / 2 - 44, y: -h / 2 + 4, scale: badgeIn, rot: Math.sin(onTwos(t) * 2.4) * 0.08 }, () => {
      badge(ctx, 0, 0, 64, [], { fill: pinkish ? 'pink' : accent, rot: 0.1 });
      icon(ctx, 'star', 0, 2, 66, pinkish ? C.chalk : inkOn(accent));
    });
  }
}

export default {
  type: 'compare',
  describe: 'Before vs after / old vs new. A muted, crumpled "before" card gets an X stamped on it, a chunky arrow draws down to a lifted chalk "after" card with a star badge when the voice reaches the after part, and an optional verdict pill stamps in. Kit shrugs, then points and cheers.',
  props: {
    before: '{ label ≤ 16 chars ("Before", "Old way", "GPT-4o"), text ≤ 40 chars — the old state, e.g. "4 hours of manual editing" }',
    after: '{ label ≤ 16 chars ("After", "Now", "Nano Banana 2.1"), text ≤ 40 chars — the new state, e.g. "One click, done in 4 minutes" }',
    verdict: 'string ≤ 28 chars, optional — the takeaway stamped at the bottom, e.g. "Same quality, 60× faster"',
  },
  draw(s) {
    const { ctx, t, ts, props } = s;
    const before = side(props.before, 'Before');
    const after = side(props.after, 'After');
    const verdict = String(props.verdict || '').trim();
    const dark = s.set.ink === C.chalk;

    // Timeline, synced to the voice: the after card lands on the first word of
    // the after half; the X stamps just before; the verdict on its own words.
    const vo0 = s.voStart, vo1 = Math.max(s.voEnd, vo0 + 0.6), span = vo1 - vo0;
    const latest = Math.max(0.8, s.dur - 1.1);
    const heard = cue(s, [after.label, after.text], Math.max(0.6, vo0 + span * 0.2), { pivots: PIVOTS });
    const tAfter = clamp(heard ?? vo0 + span * 0.45, 0.8, latest);
    const tStamp = Math.max(0.45, tAfter - 0.38);
    const tVerdict = verdict
      ? clamp(cue(s, [verdict], tAfter + 0.5) ?? lerp(tAfter, vo1, 0.6), tAfter + 0.6, Math.max(tAfter + 0.6, s.dur - 0.45))
      : Infinity;

    // ---- sparkles behind the after card once it's in
    if (t > tAfter) sparkles(ctx, { x: AFTER.x, y: AFTER.y, t, radius: 520, count: 6, seed: 'cmp-sp', fill: dark ? C.blush : C.chalk });

    // ---- before card: drops in solo, then shoved up-left by the after card
    const bIn = s.enter(0.06, 0.45);
    const mv = clamp(s.spring(tAfter - 0.04, { freq: 1.5, damp: 0.55 }), 0, 1.08);
    const P = BEFORE.solo, Q = BEFORE.paired;
    const bx = lerp(P.x, Q.x, mv), by = lerp(P.y, Q.y, mv);
    const bsc = lerp(P.sc, Q.sc, mv) * bIn;
    // A small jolt when the stamp hits.
    const hit = clamp((ts - tStamp - 0.1) / 0.2);
    const jolt = hit > 0 && hit < 1 ? Math.sin(hit * Math.PI * 3) * (1 - hit) * 8 : 0;
    const bb = boil('cmp-before', t, 1.2);
    if (bIn > 0) {
      withT(ctx, { x: bx + bb.dx, y: by + bb.dy + jolt, rot: lerp(P.rot, Q.rot, mv) + bb.rot + (1 - bIn) * -0.2, scale: bsc }, () =>
        drawBefore(ctx, before, { stamp: clamp((ts - tStamp) / 0.16) }));
    }

    // ---- after card: springs up from below, lifted and floating
    const ap = s.spring(tAfter + 0.1, { freq: 1.7, damp: 0.42 });
    const landed = clamp((ts - tAfter - 0.6) / 0.4);
    const float = Math.sin((ts - tAfter) * Math.PI * 2 * 0.55) * 6 * landed;
    const ab = boil('cmp-after', t, 1);
    const ay = AFTER.y + (1 - ap) * 220 + float + ab.dy;
    if (ap > 0) {
      withT(ctx, {
        x: AFTER.x + ab.dx, y: ay, rot: AFTER.rot + (1 - ap) * 0.14 + ab.rot,
        scale: lerp(0.55, 1, ap), alpha: clamp(ap * 4),
      }, () => drawAfter(ctx, after, { t, badgeIn: s.enter(tAfter + 0.4, 0.35), accent: s.accent }));
      confetti(ctx, { x: AFTER.x + AFTER.w / 2 - 44, y: AFTER.y - AFTER.h / 2, t, at: tAfter + 0.45, seed: 'cmp-conf', count: 16, spread: 0.6 });
    }

    // ---- arrow from the before card's right edge down to the after card
    const ar = ease.outCubic(clamp((ts - tAfter) / 0.42));
    if (ar > 0) {
      const sx = bx + (BEFORE.w / 2 + 26) * Q.sc, sy = by - 30;
      arrow(ctx, sx, sy, 868, AFTER.y - AFTER.h / 2 - 34 + float, { p: ar, fill: s.set.ink, width: 24, head: 58, curve: -0.42 });
    }

    // ---- verdict pill stamps in at the bottom
    if (verdict && t >= tVerdict) {
      const vp = clamp((ts - tVerdict) / 0.18);
      const k = ease.outCubic(vp);
      const fill = s.set.ink;
      const ink = inkOn(fill);
      // [pad | check disc | gap | text | pad]
      const padL = 14, disc = 60, gap = 18, padR = 36;
      const lf = fitOne(ctx, verdict, 900, VERDICT.maxW - padL - disc - gap - padR, 46, 34);
      const pw = padL + disc + gap + measure(ctx, lf.str, 900, lf.size) + padR;
      const ph = lf.size + 46;
      withT(ctx, { x: VERDICT.x, y: VERDICT.y, rot: -0.035 + (1 - k) * 0.12, scale: 1 + (1 - k) * 0.75, alpha: clamp(vp * 3) }, () => {
        paper(ctx, c => roundRectPath(c, -pw / 2, -ph / 2, pw, ph, ph / 2), { fill, lift: 1.6 * k + 0.2, rim: 0.6 });
        const dx = -pw / 2 + padL + disc / 2;
        paper(ctx, c => roundRectPath(c, dx - disc / 2, -disc / 2, disc, disc, disc / 2), { fill: C.pink, lift: 0.3, rim: 0.5 });
        icon(ctx, 'check', dx, 1, 40, C.chalk);
        text(ctx, lf.str, dx + disc / 2 + gap, 2, { weight: 900, size: lf.size, color: ink, align: 'left' });
      });
      impact(ctx, VERDICT.x, VERDICT.y, pw + 20, ph + 10, clamp((ts - tVerdict - 0.16) / 0.3), s.set.ink);
    }

    // ---- Kit: shrugs at the old way, points at the new one, cheers the verdict
    const m = s.beat.mascot || {};
    const react = t >= tAfter;
    const late = t >= (verdict ? tVerdict : tAfter + 1.5);
    const pose = !react ? 'shrug' : m.pose || (late ? 'cheer' : 'point');
    const face = !react ? 'focus' : t < tAfter + 0.45 ? 'wow' : m.face || (pose === 'cheer' ? 'happy' : 'grin');
    s.kit({
      x: KIT.x, y: BAND.floorY + 64, s: KIT.s, pose, face,
      look: react ? 0.7 : 0.45,
      pointAngle: -0.95 + Math.sin(onTwos(t) * 3) * 0.04,
    });
  },
};
