// Before vs after, as two site cards: a muted grey "before" card (lucide X in a
// grey circle) sits alone while Kit shrugs at it; when the voice reaches the
// after part it slides up out of the way, its text gets a quiet strike-through,
// a thin ink arrow draws down to a lifted white "after" card with a pink check,
// and an optional verdict pill fades in at the bottom.
import { C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, fitWrapped, text, measure, withT, pinkGradient } from '../../paper.mjs';
import { arrow } from '../../fx.mjs';
import { lucideIcon } from '../../icons.mjs';
import { clamp, lerp, ease, luminance } from '../../util.mjs';

// Card geometry: the before card is offset left and the after card right so
// the arrow has room to curve between them on the right.
const BEFORE = { x: 90, w: 760, disc: 68, solo: { cy: 700, sc: 1.06 } };
const AFTER = { x: 150, w: 840, gap: 110, disc: 88 };
const STAGE = { top: 384, bottom: 1170 };
const KIT = { x: 186, s: 0.88 };
const VERDICT = { cx: 640, maxW: 660, gap: 56 };

// Words that usually open the "after" half of a sentence.
const PIVOTS = ['now', 'after', 'today', 'instead', 'but', 'new', 'then', 'vs', 'versus'];
const STOP = new Set(['the', 'and', 'for', 'with', 'you', 'your', 'its', "it's", 'was', 'are', 'that', 'this', 'from', 'one', 'all']);
const norm = w => String(w).toLowerCase().replace(/[^\p{L}\p{N}.%$+']/gu, '').replace(/^[.']+|[.']+$/g, '');
const keywords = strs => strs.flatMap(str => String(str || '').split(/\s+/)).map(norm).filter(k => k.length >= 3 && !STOP.has(k));

// Normalise a side: accepts { label, text } or a bare string.
function side(v, fallbackLabel) {
  const o = typeof v === 'string' ? { text: v } : v && typeof v === 'object' ? v : {};
  const label = String(o.label || '').trim();
  const body = String(o.text || '').trim();
  // A side with only a label shows the label as its body under a generic tag.
  if (!body) return { label: fallbackLabel, text: label || fallbackLabel };
  return { label: label || fallbackLabel, text: body };
}

// Local time of the first spoken word (at or after `from`) that matches a
// meaningful word of `strs` (skipping words shared with `not`), or a pivot
// word; null when nothing matches.
function cue(s, strs, from, { pivots = [], not = [] } = {}) {
  const skip = new Set(keywords(not));
  const keys = keywords(strs).filter(k => !skip.has(k));
  for (const w of s.words) {
    if (w.start < from) continue;
    const tx = norm(w.text);
    if (!tx) continue;
    if (pivots.includes(tx)) return w.start;
    if (keys.some(k => tx === k || (k.length >= 5 && tx.startsWith(k.slice(0, -1))) || (tx.length >= 5 && k.startsWith(tx)))) return w.start;
  }
  return null;
}

// Shrink-to-fit wrapped text that prefers fewer, bigger lines (a short phrase
// stays on one line instead of breaking at the largest size).
function fitLines(ctx, str, weight, maxW, maxLines, maxSize, minSize) {
  for (let n = 1; n < maxLines; n++) {
    const floor = Math.max(minSize, Math.round(maxSize * 0.74));
    const r = fitWrapped(ctx, str, weight, maxW, n, maxSize, floor);
    if (r.lines.join(' ') === String(str).split(/\s+/).filter(Boolean).join(' ') && r.lines.every(l => measure(ctx, l, weight, r.size) <= maxW)) {
      if (!r.lines.some(l => l.endsWith('…'))) return r;
    }
  }
  return fitWrapped(ctx, str, weight, maxW, maxLines, maxSize, minSize);
}

// Single-line fit with an ellipsis fallback, for labels.
function fitOne(ctx, str, weight, maxW, maxSize, minSize, tracking = 0) {
  let size = maxSize;
  while (size > minSize && measure(ctx, str, weight, size, tracking) > maxW) size -= 2;
  let s = str;
  while (s.length > 1 && measure(ctx, s, weight, size, tracking) > maxW) s = `${s.slice(0, -2).trimEnd()}…`;
  return { size, str: s };
}

// Card layout for one side: [disc | label over text], height from the text.
function layoutSide(ctx, data, { w, disc, maxSize, minSize, label }) {
  const textW = w - 40 - disc - 32 - 44;
  const body = fitLines(ctx, data.text, 'd600', textW, 2, maxSize, minSize);
  const lh = body.size * 1.1;
  const lab = fitOne(ctx, data.label.toUpperCase(), 600, textW, label, 26, 2);
  const h = Math.max(disc + 96, 46 + lab.size + 16 + body.lines.length * lh + 44);
  return { body, lh, lab, h, textX: 40 + disc + 32 };
}

function drawBefore(ctx, data, L, { dark, strike }) {
  const { w } = BEFORE, h = L.h;
  paper(ctx, c => roundRectPath(c, 0, 0, w, h, 16), { fill: dark ? '#26272F' : '#EDEDF2', lift: 0.5 });
  const dcx = 40 + BEFORE.disc / 2, cy = h / 2;
  ctx.fillStyle = dark ? '#3A3B45' : '#DEDEE6';
  ctx.beginPath();
  ctx.arc(dcx, cy, BEFORE.disc / 2, 0, Math.PI * 2);
  ctx.fill();
  lucideIcon(ctx, 'X', dcx, cy, 34, { color: dark ? C.muteDark : C.mute, stroke: 2.6 });

  const muted = dark ? C.muteDark : C.mute;
  const ly = 46 + L.lab.size / 2;
  text(ctx, L.lab.str, L.textX, ly, { weight: 600, size: L.lab.size, color: muted, align: 'left', tracking: 2 });
  const ty = ly + L.lab.size / 2 + 16 + L.lh / 2;
  L.body.lines.forEach((l, i) => {
    const y = ty + i * L.lh;
    text(ctx, l, L.textX, y + 2, { weight: 'd600', size: L.body.size, color: muted, align: 'left' });
    // The old way gets a quiet strike-through, line by line.
    const p = clamp(strike * L.body.lines.length - i);
    if (p > 0) {
      const lw = measure(ctx, l, 'd600', L.body.size);
      ctx.fillStyle = dark ? 'rgba(250,250,252,0.45)' : 'rgba(16,16,20,0.38)';
      ctx.fillRect(L.textX - 4, y + 2, (lw + 8) * ease.inOutQuad(p), 3);
    }
  });
}

function drawAfter(ctx, data, L, { glow }) {
  const { w } = AFTER, h = L.h;
  if (glow > 0) {
    const r = w * 0.7;
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, r);
    g.addColorStop(0, `rgba(255,43,136,${0.2 * glow})`);
    g.addColorStop(1, 'rgba(255,43,136,0)');
    ctx.fillStyle = g;
    ctx.fillRect(w / 2 - r, h / 2 - r, r * 2, r * 2);
  }
  paper(ctx, c => roundRectPath(c, 0, 0, w, h, 16), { fill: '#FFFFFF', lift: 2.6 });
  // Pink hairline ring: the one accent on the card besides the check.
  ctx.save();
  ctx.strokeStyle = pinkGradient(ctx, 0, 0, w, h);
  ctx.globalAlpha *= 0.55;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  roundRectPath(ctx, 1.25, 1.25, w - 2.5, h - 2.5, 15);
  ctx.stroke();
  ctx.restore();

  const dcx = 40 + AFTER.disc / 2, cy = h / 2;
  ctx.fillStyle = pinkGradient(ctx, dcx - AFTER.disc / 2, cy - AFTER.disc / 2, dcx + AFTER.disc / 2, cy + AFTER.disc / 2);
  ctx.beginPath();
  ctx.arc(dcx, cy, AFTER.disc / 2, 0, Math.PI * 2);
  ctx.fill();
  lucideIcon(ctx, 'Check', dcx, cy, 46, { color: '#FFFFFF', stroke: 2.8 });

  const ly = 46 + L.lab.size / 2;
  text(ctx, L.lab.str, L.textX, ly, { weight: 600, size: L.lab.size, color: C.pinkDeep, align: 'left', tracking: 2 });
  const ty = ly + L.lab.size / 2 + 16 + L.lh / 2;
  L.body.lines.forEach((l, i) => text(ctx, l, L.textX, ty + i * L.lh + 2, { weight: 'd600', size: L.body.size, color: C.ink, align: 'left' }));
}

export default {
  type: 'compare',
  describe: 'Before vs after / old vs new. A muted grey "before" card (X) sits alone, then slides up and gets struck through as a thin arrow draws down to a lifted white "after" card with a pink check when the voice reaches the after part; an optional verdict pill fades in. Kit shrugs, then points and cheers (beat.mascot.pose replaces the reaction).',
  props: {
    before: '{ label ≤ 16 chars ("Before", "Old way", "GPT-4o"), text ≤ 40 chars — the old state, e.g. "4 hours of manual editing" }',
    after: '{ label ≤ 16 chars ("After", "Now", "Nano Banana 2.1"), text ≤ 40 chars — the new state, e.g. "One click, done in 4 minutes" }',
    verdict: 'string ≤ 28 chars, optional — the takeaway at the bottom, e.g. "Same quality, 60× faster"',
  },
  draw(s) {
    const { ctx, t, props } = s;
    const before = side(props.before, 'Before');
    const after = side(props.after, 'After');
    const verdict = String(props.verdict || '').trim();
    const dark = luminance(s.set.wall) < 0.1;

    // Timeline, synced to the voice: the after card lands on the first word of
    // the after half; the verdict on its own words.
    const vo0 = s.voStart, vo1 = Math.max(s.voEnd, vo0 + 0.6), span = vo1 - vo0;
    const latest = Math.max(0.8, s.dur - 1.1);
    const heard = cue(s, [after.label, after.text], Math.max(0.6, vo0 + span * 0.2), { pivots: PIVOTS, not: [before.label, before.text] });
    const tAfter = clamp(heard ?? vo0 + span * 0.45, 0.8, latest);
    const tVerdict = verdict
      ? clamp(cue(s, [verdict], tAfter + 0.5) ?? lerp(tAfter, vo1, 0.6), tAfter + 0.6, Math.max(tAfter + 0.6, s.dur - 0.45))
      : Infinity;

    // Layout from the text: before card, gap, after card and the verdict,
    // centred together in the stage above Kit.
    const LB = layoutSide(ctx, before, { w: BEFORE.w, disc: BEFORE.disc, maxSize: 58, minSize: 36, label: 32 });
    const LA = layoutSide(ctx, after, { w: AFTER.w, disc: AFTER.disc, maxSize: 86, minSize: 42, label: 34 });
    // Verdict pill: [pad | disc | gap | text | pad]; a long verdict wraps to two lines.
    const V = { padL: 14, disc: 60, gap: 18, padR: 36 };
    if (verdict) {
      Object.assign(V, fitLines(ctx, verdict, 'd600', VERDICT.maxW - V.padL - V.disc - V.gap - V.padR, 2, 46, 34));
      V.lh = V.size * 1.1;
      V.w = V.padL + V.disc + V.gap + Math.max(...V.lines.map(l => measure(ctx, l, 'd600', V.size))) + V.padR;
      V.h = Math.max(V.disc + 26, V.lines.length * V.lh + 38);
    }
    const total = LB.h + AFTER.gap + LA.h + (verdict ? VERDICT.gap + V.h : 0);
    const beforeTop = Math.max(STAGE.top, (STAGE.top + STAGE.bottom) / 2 - total / 2);
    const afterTop = beforeTop + LB.h + AFTER.gap;
    const afterBottom = afterTop + LA.h;

    // ---- before card: rises in centred, then slides up-left to make room
    const bIn = ease.outCubic(clamp((t - 0.06) / 0.5));
    const mv = ease.inOutCubic(clamp((t - tAfter + 0.05) / 0.5));
    const soloX = 540 - BEFORE.w / 2, soloY = BEFORE.solo.cy - LB.h / 2;
    const bx = lerp(soloX, BEFORE.x, mv), by = lerp(soloY, beforeTop, mv) + (1 - bIn) * 60;
    const bsc = lerp(BEFORE.solo.sc, 1, mv);
    if (bIn > 0) {
      withT(ctx, { x: bx + BEFORE.w / 2, y: by + LB.h / 2, scale: bsc * (0.96 + 0.04 * bIn), alpha: bIn }, () => {
        ctx.translate(-BEFORE.w / 2, -LB.h / 2);
        drawBefore(ctx, before, LB, { dark, strike: clamp((t - tAfter - 0.35) / 0.5) });
      });
    }

    // ---- after card: springs up from below, then floats gently
    const ap = s.spring(tAfter + 0.1, { freq: 1.5, damp: 0.6 });
    const landed = clamp((t - tAfter - 0.7) / 0.5);
    const float = Math.sin((t - tAfter) * Math.PI * 2 * 0.4) * 5 * landed;
    if (ap > 0) {
      withT(ctx, {
        x: AFTER.x + AFTER.w / 2, y: afterTop + LA.h / 2 + (1 - ap) * 160 + float,
        scale: lerp(0.9, 1, Math.min(ap, 1.03)), alpha: clamp(ap * 2.5),
      }, () => {
        ctx.translate(-AFTER.w / 2, -LA.h / 2);
        drawAfter(ctx, after, LA, { glow: clamp(ap) });
      });
    }

    // ---- arrow: a thin ink stroke from under the before card down to the after card
    const ar = ease.inOutCubic(clamp((t - tAfter - 0.2) / 0.5));
    if (ar > 0) {
      const ax = BEFORE.x + BEFORE.w - 70;
      arrow(ctx, ax, beforeTop + LB.h + 16, ax + 60, afterTop - 18 + float, {
        p: ar, fill: dark ? C.chalk : s.set.ink, width: 5, head: 26, curve: -0.35,
      });
    }

    // ---- verdict pill fades up under the after card
    if (verdict && t >= tVerdict) {
      const vp = ease.outCubic(clamp((t - tVerdict) / 0.4));
      const fill = dark ? '#FFFFFF' : C.ink;
      const ink = dark ? C.ink : '#FFFFFF';
      const { size, lines, lh, w: pw, h: ph } = V;
      const vy = afterBottom + VERDICT.gap + ph / 2 + float;
      const vx = Math.min(VERDICT.cx, 990 - pw / 2);
      withT(ctx, { x: vx, y: vy + (1 - vp) * 24, scale: 0.94 + 0.06 * vp, alpha: vp }, () => {
        paper(ctx, c => roundRectPath(c, -pw / 2, -ph / 2, pw, ph, lines.length > 1 ? 30 : ph / 2), { fill, lift: 1.6 });
        const dx = -pw / 2 + V.padL + V.disc / 2 + (lines.length > 1 ? 6 : 0);
        ctx.fillStyle = pinkGradient(ctx, dx - V.disc / 2, -V.disc / 2, dx + V.disc / 2, V.disc / 2);
        ctx.beginPath();
        ctx.arc(dx, 0, V.disc / 2, 0, Math.PI * 2);
        ctx.fill();
        lucideIcon(ctx, 'Sparkles', dx, 0, 30, { color: '#FFFFFF', stroke: 2.2 });
        lines.forEach((l, i) => text(ctx, l, dx + V.disc / 2 + V.gap, 2 + (i - (lines.length - 1) / 2) * lh, { weight: 'd600', size, color: ink, align: 'left' }));
      });
    }

    // ---- Kit: shrugs at the old way, points at the new one, cheers the
    // verdict. beat.mascot pose/face, when set, replace the reaction.
    const m = s.beat.mascot || {};
    const react = t >= tAfter;
    const late = t >= (verdict ? tVerdict + 0.3 : tAfter + 1.5);
    const pose = !react ? 'shrug' : m.pose || (late ? 'cheer' : 'point');
    const face = !react ? 'focus' : t < tAfter + 0.45 ? 'wow' : m.face || (pose === 'cheer' ? 'happy' : 'grin');
    s.kit({
      x: KIT.x, y: BAND.floorY + 62, s: KIT.s, pose, face,
      look: react ? 0.7 : 0.45,
      pointAt: { x: AFTER.x + 120, y: afterTop + LA.h / 2 + float },
    });
  },
};
