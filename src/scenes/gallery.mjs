// Gallery beat: 2–4 real outputs from the sources dealt onto a tidy grid of
// site cards, one by one in time with the voice. Each card flies up from below
// and lands in its slot; the newest is lifted with a brand-pink ring while
// Kit points at it, then Kit cheers once the set is complete. Slots are a
// bento sized to the items' shapes, and every item is cover-fit so mixed
// aspect ratios read as one set.
//
// In the paper look (the default) the same items are photo prints dealt onto
// the wall like a pinned collage instead — see drawPaper().
import { C, BAND, isStudio } from '../brand.mjs';
import { fitSize, measure } from '../paper.mjs';
import { pill } from '../fx.mjs';
import { lucideIcon } from '../icons.mjs';
import { clamp, lerp, ease, luminance, rng, boil, onTwos } from '../util.mjs';
import media, { mediaCard, glowBehind, isPinkWall, photoPrint, printTape, printBorder, captionBand } from './media.mjs';

const X0 = 84, Y0 = 392, GW = 912, GAP = 20;   // inset so a lifted card stays inside x 70–1010
const BOTTOM = 1162;        // Kit stands below the grid
const RADIUS = 24, INSET = 10;
const KX = 190, KY = BAND.floorY + 50, KS = 0.62;   // Kit's arms stay inside x ≥ 70

const STOP = new Set(['with', 'your', 'that', 'this', 'from', 'into', 'them', 'they', 'what', 'when', 'will', 'have', 'just', 'more', 'then', 'than', 'been', 'were', 'about', 'while']);

// Slots [x, y, w, h] for n cards. `wide` when most items are landscape.
function slots(n, wide) {
  const H = BOTTOM - Y0, half = (GW - GAP) / 2;
  if (n === 2 && wide) {
    // Two 16:9 cards on a diagonal.
    const w = 660, h = Math.round((H - GAP) / 2);
    return [[X0, Y0, w, h], [X0 + GW - w, Y0 + h + GAP, w, h]];
  }
  if (n === 2) {
    // Two tall cards side by side, the second dropped a step.
    const h = H - 52;
    return [[X0, Y0, half, h], [X0 + half + GAP, Y0 + 52, half, h]];
  }
  if (n === 3 && wide) {
    // A wide hero on top, two below.
    const top = 430;
    return [[X0, Y0, GW, top], [X0, Y0 + top + GAP, half, H - top - GAP], [X0 + half + GAP, Y0 + top + GAP, half, H - top - GAP]];
  }
  if (n === 3) {
    // A tall hero on the left, two stacked on the right.
    const lw = 530, rw = GW - lw - GAP, rh = (H - GAP) / 2;
    return [[X0, Y0, lw, H], [X0 + lw + GAP, Y0, rw, rh], [X0 + lw + GAP, Y0 + rh + GAP, rw, rh]];
  }
  const rh = (H - GAP) / 2;
  return [[X0, Y0, half, rh], [X0 + half + GAP, Y0, half, rh], [X0, Y0 + rh + GAP, half, rh], [X0 + half + GAP, Y0 + rh + GAP, half, rh]];
}

// Local time the first meaningful word of `str` is spoken, else null.
function spokenAt(s, str) {
  for (const w of String(str || '').toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 4 || STOP.has(w)) continue;
    const tt = s.wordTime(w);
    if (tt !== null) return tt;
  }
  return null;
}

// Cards land spread across the voice-over (the last a little past its middle,
// so the full set stays up a while), snapping to a label's spoken word when
// it's said within SNAP of its slot — as late as LAST_HOLD before the cut.
const SNAP = 1.8, LAST_HOLD = 0.6;
function revealTimes(s, n, labels) {
  const vs = s.words.length ? s.words[0].start : s.voStart;
  const ve = s.words.length ? s.words[s.words.length - 1].end : s.voEnd;
  const first = clamp(vs - 0.1, 0.12, 0.5);
  const last = Math.max(first + 0.3 * (n - 1), Math.min(lerp(vs, ve, 0.55), s.dur - 1.3));
  const latest = Math.max(first + 0.3 * (n - 1), s.dur - LAST_HOLD);
  const at = [];
  for (let i = 0; i < n; i++) {
    const even = n === 1 ? first : lerp(first, last, i / (n - 1));
    const spoken = i ? spokenAt(s, labels[i]) : null;
    const want = spoken !== null && Math.abs(spoken - 0.15 - even) < SNAP ? Math.min(spoken - 0.15, latest) : even;
    at.push(i ? Math.max(at[i - 1] + 0.3, want) : want);
  }
  return at;
}

// Faint empty slot waiting for its card.
function ghostSlot(ctx, [x, y, w, h], alpha, darkWall) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, RADIUS);
  ctx.fillStyle = darkWall ? 'rgba(255,255,255,0.05)' : 'rgba(16,16,20,0.035)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.setLineDash([10, 9]);
  ctx.strokeStyle = darkWall ? 'rgba(255,255,255,0.16)' : 'rgba(16,16,20,0.12)';
  ctx.stroke();
  ctx.restore();
  lucideIcon(ctx, 'Image', x + w / 2, y + h / 2, 52, { color: darkWall ? 'rgba(255,255,255,0.22)' : 'rgba(16,16,20,0.16)', stroke: 1.75 });
}

// Clips get a small play badge in the top-right corner (a progress bar would
// fight the label chip on a small card).
function playBadge(ctx, [x, y, w], p) {
  if (p <= 0) return;
  const r = 26, bx = x + w - INSET - 14 - r, by = y + INSET + 14 + r;
  ctx.save();
  ctx.globalAlpha *= clamp(p);
  ctx.shadowColor = 'rgba(16,16,20,0.22)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();
  lucideIcon(ctx, 'Play', bx + 2, by, 26, { color: C.ink, fill: C.ink, stroke: 2 });
}

// White label chip, ink text, in the card's bottom-left corner.
function labelChip(ctx, [x, y, w, h], str, p) {
  if (!str || p <= 0) return;
  const maxW = w - INSET * 2 - 28 - 44;
  const size = fitSize(ctx, str, 700, maxW, 34, 26);
  let out = str;
  while (out.length > 2 && measure(ctx, out, 700, size) > maxW) out = `${out.slice(0, -2).trimEnd()}…`;
  const ph = size + 26;
  const lx = x + INSET + 14, ly = y + h - INSET - 14 - ph / 2;
  ctx.save();
  ctx.translate(lx, ly);
  ctx.scale(lerp(0.85, 1, p), lerp(0.85, 1, p));
  ctx.globalAlpha *= clamp(p * 1.5);
  pill(ctx, 0, 0, out, { fill: '#FFFFFF', size, weight: 700, padX: 22, h: ph, lift: 1.2, align: 'left' });
  ctx.restore();
}

export default {
  type: 'gallery',
  describe: 'Several real outputs/examples from the sources (2–4 images or clips) dealt onto the wall one by one with the voice — taped photo prints in a pinned collage (paper look) or a tidy grid of cards (studio) — newest on top, optional labels. Use for "look what it makes" beats.',
  props: {
    media: 'media ids from media.json, 2–4, e.g. ["m02", "m03", "m04"] — revealed in this order',
    labels: 'optional string[] each ≤ 18 chars, same order — written on each print / a chip on each card ("Product shot", "Poster")',
  },
  draw(s) {
    if (!isStudio()) return drawPaper(s);
    const { ctx, t, props } = s;
    const ids = (Array.isArray(props.media) ? props.media : [props.media]).filter(x => typeof x === 'string' && x).slice(0, 4);
    const labels = (Array.isArray(props.labels) ? props.labels : []).map(l => String(l ?? '').trim());
    // One item is just a media beat.
    if (ids.length < 2) return media.draw({ ...s, props: { media: ids[0], caption: labels[0] || '' } });

    const n = ids.length;
    const items = ids.map(id => s.media(id));
    // Majority shape decides the bento; missing items count as landscape.
    const wideCount = items.filter(m => !m || m.width / m.height >= 1.15).length;
    const rects = slots(n, wideCount * 2 >= n);
    const at = revealTimes(s, n, labels);
    const darkWall = luminance(s.set.wall) < 0.08, pinkWall = isPinkWall(s.set);

    // Highlight: the newest card holds it until the next one lands.
    const hl = at.map((a, i) => {
      const up = ease.outCubic(clamp((t - a - 0.15) / 0.3));
      const down = i < n - 1 ? ease.outCubic(clamp((t - at[i + 1] - 0.1) / 0.3)) : 0;
      return up * (1 - down);
    });
    const newest = at.reduce((k, a, i) => (t >= a ? i : k), 0);

    // One shared bloom behind the whole set, growing in with the first card.
    glowBehind(ctx, X0, Y0, GW, BOTTOM - Y0, { set: s.set, strength: 0.9 * ease.outCubic(clamp((t - at[0]) / 0.6)) });

    // Waiting slots, then landed cards (newest on top).
    const ghost = ease.outCubic(clamp(t / 0.3));
    rects.forEach((r, i) => { if (t < at[i] + 0.25) ghostSlot(ctx, r, ghost * (1 - clamp((t - at[i]) / 0.25)), darkWall); });
    const order = [...rects.keys()].filter(i => t >= at[i]).sort((a, b) => (a === newest) - (b === newest) || at[a] - at[b]);
    for (const i of order) {
      const [x, y, w, h] = rects[i];
      const m = items[i];
      const e = s.spring(at[i], { freq: 1.7, damp: 0.6 });
      const dir = x + w / 2 > 540 ? 1 : -1;
      const lift = hl[i];
      const cx = x + w / 2, cy = y + h / 2;
      ctx.save();
      ctx.translate(cx + (1 - e) * 90 * dir, cy + (1 - e) * 420 - lift * 10);
      ctx.rotate((1 - e) * 0.12 * dir);
      const sc = (0.86 + 0.14 * e) * (1 + 0.02 * lift);
      ctx.scale(sc, sc);
      ctx.globalAlpha *= clamp(e * 2.5);
      ctx.translate(-cx, -cy);
      // Slow push-in from the moment it lands; videos start playing then too.
      const zoom = 1 + 0.06 * ease.inOutQuad(clamp((t - at[i] - 0.3) / 5));
      mediaCard(ctx, x, y, w, h, {
        img: m ? s.mediaFrame(ids[i], at[i]) : null,
        radius: RADIUS, inset: INSET, lift: 0.7 + lift * 0.7, ring: lift, ringColor: pinkWall ? C.ink : null, zoom,
      });
      const chip = ease.outBack(clamp((t - at[i] - 0.3) / 0.35), 1.6);
      if (m?.kind === 'video') playBadge(ctx, rects[i], chip);
      labelChip(ctx, rects[i], labels[i], chip);
      ctx.restore();
    }

    // Kit tracks the newest card, then cheers when the set is complete.
    const mascot = s.beat.mascot || {};
    const aim = i => ({ x: rects[i][0] + rects[i][2] * 0.4, y: rects[i][1] + rects[i][3] * 0.7 });
    const from = aim(Math.max(0, newest - 1)), to = aim(newest);
    const swing = newest > 0 ? ease.inOutCubic(clamp((t - at[newest]) / 0.35)) : 1;
    const done = t > at[n - 1] + 1.1;
    s.kit({
      x: KX, y: KY, s: KS,
      pose: t < at[0] + 0.2 ? 'idle' : mascot.pose || (done ? 'cheer' : 'point'),
      face: done ? mascot.face || 'happy' : 'wow',
      pointAt: { x: lerp(from.x, to.x, swing), y: lerp(from.y, to.y, swing) },
      look: 0.6,
      dark: darkWall,
    });
  },
};

// ---------------------------------------------------------------- paper

const LABEL_SIZE = 36;   // one line on the print's bottom border, shrinks to 30 then truncates

// Paper gallery: each item is a photo print dealt onto the wall in time with
// the voice — it flies in spinning from below, slaps onto its spot in the
// collage (spring on twos) and gets taped down; later prints land on top of
// earlier ones. Prints keep roughly their own shape inside the bento slot,
// lean alternately left and right and overlap a little, like a pinned
// collage. Labels are written on a print's bottom border. Kit points at the
// newest print and cheers once the set is complete.
function drawPaper(s) {
  const { ctx, t, props } = s;
  const ids = (Array.isArray(props.media) ? props.media : [props.media]).filter(x => typeof x === 'string' && x).slice(0, 4);
  const labels = (Array.isArray(props.labels) ? props.labels : []).map(l => String(l ?? '').trim());
  if (ids.length < 2) return media.draw({ ...s, props: { media: ids[0], caption: labels[0] || '' } });

  const n = ids.length;
  const items = ids.map(id => s.media(id));
  const wideCount = items.filter(m => !m || m.width / m.height >= 1.15).length;
  const rects = slots(n, wideCount * 2 >= n);
  const at = revealTimes(s, n, labels);
  const darkWall = luminance(s.set.wall) < 0.08;
  const newest = at.reduce((k, a, i) => (t >= a ? i : k), 0);
  const prints = rects.map((r, i) => collagePrint(ctx, r, items[i], labels[i], `gal-${s.index}-${i}-${ids[i]}`, i));

  // Dealt in order, so each new print lands on top of the ones before it.
  for (let i = 0; i < n; i++) {
    if (t < at[i]) continue;
    const P = prints[i];
    const m = items[i];
    const e = s.spring(at[i], { freq: 1.6, damp: 0.52 });
    const dir = P.cx > 540 ? 1 : -1;
    const bo = boil(P.seed, t, 0.9);
    // The newest print sits a touch proud of the wall until the next lands.
    const proud = i === newest ? 1 - clamp((t - (at[i + 1] ?? Infinity)) / 0.3) : 0;
    ctx.save();
    ctx.translate(P.cx + (1 - e) * 260 * dir + bo.dx, P.cy + (1 - e) * 560 + bo.dy);
    ctx.rotate(P.rot + (1 - e) * 0.55 * dir + bo.rot);
    ctx.scale(1 + (1 - e) * 0.18 + proud * 0.015, 1 + (1 - e) * 0.18 + proud * 0.015);
    ctx.globalAlpha *= clamp(e * 2.5);
    const zoom = 1 + 0.06 * ease.inOutQuad(clamp((onTwos(t) - at[i] - 0.3) / 5));
    photoPrint(ctx, -P.w / 2, -P.h / 2, P.w, P.h, {
      img: m ? s.mediaFrame(ids[i], at[i]) : null, border: P.border, bottom: P.bottom,
      lift: 1.3 + proud * 0.8 + clamp(1 - e) * 3, zoom, video: m?.kind === 'video',
      caption: labels[i], captionSize: LABEL_SIZE, captionReveal: clamp((onTwos(t) - at[i] - 0.35) / 0.4),
    });
    printTape(ctx, -P.w / 2, -P.h / 2, P.w, P.h, { seed: P.seed, k: s.enter(at[i] + 0.3, 0.25), scale: 0.9 });
    ctx.restore();
  }

  // Kit tracks the newest print, then cheers when the set is complete.
  const mascot = s.beat.mascot || {};
  const aim = i => ({ x: prints[i].cx - prints[i].w * 0.1, y: prints[i].cy + prints[i].h * 0.2 });
  const from = aim(Math.max(0, newest - 1)), to = aim(newest);
  const swing = newest > 0 ? ease.inOutCubic(clamp((onTwos(t) - at[newest]) / 0.35)) : 1;
  const done = t > at[n - 1] + 1.1;
  s.kit({
    x: KX, y: KY, s: KS,
    pose: t < at[0] + 0.2 ? 'idle' : mascot.pose || (done ? 'cheer' : 'point'),
    face: done ? mascot.face || 'happy' : 'wow',
    pointAt: { x: lerp(from.x, to.x, swing), y: lerp(from.y, to.y, swing) },
    look: 0.6,
    dark: darkWall,
  });
}

// A print for bento slot [x, y, w, h]: roughly the item's own shape (within
// ~15% of the slot's — a collage crops a little), leaning alternately left
// and right by 2–4° (wide prints lean less) and sized so that, tilted, it
// overlaps its neighbours only at the very edges and never hides a label.
function collagePrint(ctx, [x, y, w, h], m, label, seed, i) {
  const r = rng(seed);
  const slotAr = w / h;
  const ar = m ? clamp(m.width / m.height, slotAr * 0.85, slotAr * 1.18) : slotAr;
  const b = printBorder(w, h);
  const bottom = label ? captionBand(b, LABEL_SIZE) : b;
  const sign = i % 2 ? 1 : -1;
  const lean = (w > 600 ? 0.022 : 0.035) + r() * (w > 600 ? 0.016 : 0.025);
  const sin = Math.sin(lean);
  const mw = w - h * sin * 0.9, mh = h - w * sin * 0.9;
  let pw = mw, ph = (pw - 2 * b) / ar + b + bottom;
  if (ph > mh) { ph = mh; pw = (ph - b - bottom) * ar + 2 * b; }
  return {
    seed, border: b, bottom, w: Math.round(pw), h: Math.round(ph),
    cx: x + w / 2 + (r() - 0.5) * Math.max(0, w - pw) * 0.8, cy: y + h / 2 + (r() - 0.5) * Math.max(0, h - ph) * 0.8,
    rot: sign * lean,
  };
}
