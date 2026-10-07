// Before / after: both real images share one big site card. A white divider
// with a round handle sweeps left → right and wipes the AFTER image in over the
// BEFORE one, timed so the change lands as the voice names it. An optional
// prompt chip types the edit instruction in above the card first; "Before" /
// "After" pills sit in the top corners and Kit points at the handle from the
// floor while it moves.
//
// Paper look (default): two taped photo prints. The BEFORE print drops in
// alone; when the voice reaches the change it shuffles up-left and the bigger
// AFTER print slaps down on top of it (tilted the other way, a torn label and
// a pink star sticker), with a hand-cut paper arrow between them. An optional
// prompt is written onto a torn note under a pink tape strip first.
import { W, C, BAND, font, isStudio } from '../brand.mjs';
import { paper, disc, roundRectPath, tornRectPath, fitWrapped, text, measure, tape, withT, pinkGradient, grainCanvas } from '../paper.mjs';
import { pill, icon } from '../fx.mjs';
import { lucideIcon } from '../icons.mjs';
import { drawCover } from '../mediastore.mjs';
import { clamp, lerp, ease, rng, boil, onTwos } from '../util.mjs';

const CARD_W = 900, PAD = 14, CARD_R = 18, BOX_R = 10; // the card and its image box
const TOP = 352, BOTTOM = 1176;                        // chip + card live in this band
const CHIP_GAP = 26;
const CHIP_MAX = 900, CHIP_ICON = 60, CHIP_TEXT_X = 22 + CHIP_ICON + 22, CHIP_PAD_R = 34;
const KIT = { x: 190, y: BAND.floorY + 50, s: 0.64 };
const P0 = 0.06, P1 = 0.9; // handle rest positions, as a fraction of the box width
const SWEEP = 0.9;         // seconds the wipe takes
const HANDLE_R = 40;

// Prompt / label words that name the instruction rather than the change itself.
const GENERIC = new Set([
  'change', 'make', 'turn', 'edit', 'replace', 'into', 'with', 'from', 'this', 'that', 'the', 'and', 'your', 'them',
  'image', 'photo', 'picture', 'add', 'remove', 'give', 'then', 'more', 'less', 'just', 'before', 'after', 'now', 'new',
]);

// Draw `fn` scaled about (cx, cy), keeping absolute coordinates.
function pivot(ctx, cx, cy, { scale = 1, alpha = 1, dx = 0, dy = 0 } = {}, fn) {
  ctx.save();
  ctx.translate(cx + dx, cy + dy);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  fn();
  ctx.restore();
}

// Width of `str` as text() draws it (studio display sizes run tight, which
// paper.measure() leaves out), so the caret sits right after the last glyph.
function drawnWidth(ctx, str, weight, size) {
  ctx.save();
  ctx.font = font(weight, size);
  if (isStudio() && size >= 34) ctx.letterSpacing = `${-0.025 * size}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// Cut a line until it fits, ending in an ellipsis.
function clipLine(ctx, line, weight, size, maxW) {
  if (drawnWidth(ctx, line, weight, size) <= maxW) return line;
  let l = line.replace(/…$/, '');
  while (l.length > 1 && drawnWidth(ctx, `${l}…`, weight, size) > maxW) l = l.slice(0, -1);
  return `${l.trimEnd()}…`;
}

// A short label (≤ 12 chars) that must stay on one line inside its pill.
function shortLabel(v, fallback) {
  const str = String(v ?? '').trim();
  if (!str) return fallback;
  return str.length > 14 ? `${str.slice(0, 13).trimEnd()}…` : str;
}

// ---------------------------------------------------------------- layout

// Prompt chip: ≤ 2 wrapped lines; an over-long prompt ends in an ellipsis.
function chipLayout(ctx, prompt) {
  const maxText = CHIP_MAX - CHIP_TEXT_X - CHIP_PAD_R;
  const fit = fitWrapped(ctx, prompt, 700, maxText, 2, 40, 34);
  const words = prompt.split(/\s+/).filter(Boolean).length;
  const shown = fit.lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (shown < words && fit.lines.length) {
    const last = fit.lines.length - 1;
    let l = fit.lines[last];
    while (l.includes(' ') && measure(ctx, `${l}…`, 700, fit.size) > maxText) l = l.replace(/\s*\S+$/, '');
    fit.lines[last] = `${l}…`;
  }
  const lines = fit.lines.map(l => clipLine(ctx, l, 700, fit.size, maxText));
  const lh = Math.round(fit.size * 1.22);
  const textW = Math.max(...lines.map(l => drawnWidth(ctx, l, 700, fit.size)));
  const w = clamp(CHIP_TEXT_X + textW + 14 + CHIP_PAD_R, 460, CHIP_MAX);
  const h = 96 + (lines.length - 1) * lh;
  return { w, h, x: (W - w) / 2, lines, size: fit.size, lh };
}

// The card takes the BEFORE image's shape (clamped so neither a panorama nor a
// phone shot gets silly); both images are cover-fitted into the same box.
function layout(ctx, s, prompt) {
  const ref = s.media(s.props.before) || s.media(s.props.after);
  const aspect = clamp(ref?.width && ref?.height ? ref.width / ref.height : 1.4, 0.75, 1.4);
  const chip = prompt ? chipLayout(ctx, prompt) : null;
  const chipH = chip ? chip.h + CHIP_GAP : 0;
  const maxBW = CARD_W - PAD * 2, maxBH = BOTTOM - TOP - chipH - PAD * 2;
  let bw = maxBW, bh = bw / aspect;
  if (bh > maxBH) { bh = maxBH; bw = Math.min(maxBW, Math.max(520, bh * aspect)); }
  const cw = bw + PAD * 2, ch = bh + PAD * 2;
  // Chip and card travel as one group, centred in the band.
  const y0 = TOP + Math.max(0, (BOTTOM - TOP - chipH - ch) / 2);
  if (chip) chip.y = y0;
  const card = { x: (W - cw) / 2, y: y0 + chipH, w: cw, h: ch };
  const box = { x: card.x + PAD, y: card.y + PAD, w: bw, h: bh };
  return { chip, card, box };
}

// ---------------------------------------------------------------- timing

// Local time the change is spoken: the first meaningful word of the prompt or
// the after label heard in the VO, else null.
function changeCue(s, prompt, afterLabel) {
  const keys = [...new Set(`${prompt} ${afterLabel}`.toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(w => w.length >= 3 && !GENERIC.has(w)))];
  const times = keys.map(k => (k.length >= 4
    // wordTime() matches substrings, so 3-letter words ("red", "hat") need an exact hit.
    ? s.wordTime(k)
    : s.words.find(w => w.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === k)?.start ?? null));
  const hits = times.filter(v => v != null && v > 0.3);
  return hits.length ? Math.min(...hits) : null;
}

// The wipe lands just after the cue word (or ~40% in); typing compresses to
// fit before it, down to half a second.
function timeline(s, chars, cue) {
  const typeStart = 0.3;
  const natural = chars ? clamp(chars * 0.03, 0.5, 1.5) : 0;
  const lead = chars ? typeStart + 0.25 : 0.95; // the before image is on screen alone at least this long
  const hardMin = lead + (chars ? 0.5 : 0) + SWEEP;
  const softMin = lead + natural + SWEEP;
  // The result is the payoff: it stays fully revealed for at least 1.5s.
  const maxLand = Math.max(hardMin, s.dur - 1.5);
  const land = cue != null
    ? clamp(cue + 0.2, hardMin, maxLand)
    : clamp(Math.max(s.dur * 0.4 + 0.2, softMin), hardMin, maxLand);
  const sweepAt = land - SWEEP;
  const typeDur = chars ? clamp(sweepAt - 0.25 - typeStart, 0.5, natural) : 0;
  return { typeStart, typeDur, sweepAt, land };
}

// Handle position (0..1 of the box width): a small "drag me" nudge while the
// before image waits, the eased sweep, then a slow sway so it never freezes.
function handleAt(t, tl) {
  const hint = u => P0 + 0.022 * (1 - Math.cos(Math.max(0, u - 0.7) * 4.4)) / 2;
  if (t < tl.sweepAt) return { p: hint(t), grab: 0 };
  const u = clamp((t - tl.sweepAt) / SWEEP);
  if (u < 1) return { p: lerp(hint(tl.sweepAt), P1, ease.inOutCubic(u)), grab: Math.sin(u * Math.PI) };
  return { p: P1 - 0.035 * (1 - Math.cos((t - tl.land) * 1.7)) / 2, grab: 0 };
}

// ---------------------------------------------------------------- drawing

function promptChip(s, chip, tl) {
  const { ctx, t } = s;
  const e = s.spring(0, { freq: 1.8, damp: 0.62 });
  if (e <= 0) return;
  const { x, y, w, h, lines, size, lh } = chip;
  pivot(ctx, W / 2, y + h / 2, { scale: 0.95 + 0.05 * e, alpha: clamp(e * 1.8), dy: (1 - e) * 36 }, () => {
    paper(ctx, c => roundRectPath(c, x, y, w, h, 16), { fill: '#FFFFFF', lift: 1.3 });
    // Pink sparkle tile, the site's AI affordance.
    const ix = x + 22, iy = y + (h - CHIP_ICON) / 2;
    paper(ctx, c => roundRectPath(c, ix, iy, CHIP_ICON, CHIP_ICON, 12), { fill: C.rose, lift: 0, border: false });
    lucideIcon(ctx, 'Sparkles', ix + CHIP_ICON / 2, iy + CHIP_ICON / 2, 32 + Math.sin(t * 4) * 1.5, { color: C.pink, stroke: 2.2 });

    // Typed text, revealed across the wrapped lines.
    const total = lines.reduce((n, l) => n + l.length, 0);
    const typed = clamp(Math.floor(((t - tl.typeStart) / Math.max(0.01, tl.typeDur)) * total), 0, total);
    const tx = x + CHIP_TEXT_X, y0 = y + h / 2 - ((lines.length - 1) * lh) / 2 + 1;
    let left = typed, caretX = tx, caretY = y0;
    lines.forEach((l, i) => {
      if (left <= 0) return;
      const part = l.slice(0, left);
      left -= part.length;
      text(ctx, part, tx, y0 + i * lh, { weight: 700, size, color: C.ink, align: 'left' });
      caretX = tx + drawnWidth(ctx, part, 700, size) + 4;
      caretY = y0 + i * lh;
    });
    // Caret: solid while typing, blinking while it waits, gone once the wipe runs.
    const typing = typed > 0 && typed < total;
    if (t < tl.sweepAt && (typing || Math.floor(t * 2.4) % 2 === 0)) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.roundRect(caretX, caretY - size * 0.55, 3.5, size * 1.1, 2);
      ctx.fill();
    }
  });
}

// Stand-in for a missing media item: a quiet tinted panel with an icon.
function placeholder(ctx, box, fill, label) {
  ctx.fillStyle = fill;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  lucideIcon(ctx, 'ImageOff', box.x + box.w / 2, box.y + box.h / 2 - 26, 64, { color: C.mute, stroke: 1.8 });
  text(ctx, label, box.x + box.w / 2, box.y + box.h / 2 + 46, { weight: 600, size: 34, color: C.mute });
}

function images(s, box, divX, tl, labels) {
  const { ctx, t, props } = s;
  // A slow shared push keeps the stills alive without breaking their alignment.
  const zoom = 1.015 + 0.03 * ease.inOutQuad(clamp(t / Math.max(1, s.dur)));
  const before = s.mediaFrame(props.before);
  const after = s.mediaFrame(props.after, tl.sweepAt); // a video plays once it's revealed
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, box.x, box.y, box.w, box.h, BOX_R);
  ctx.clip();
  if (before) drawCover(ctx, before, box.x, box.y, box.w, box.h, { zoom });
  else placeholder(ctx, box, '#ECECEF', labels.before);
  ctx.beginPath();
  ctx.rect(box.x, box.y, Math.max(0, divX - box.x), box.h);
  ctx.clip();
  if (after) drawCover(ctx, after, box.x, box.y, box.w, box.h, { zoom });
  else placeholder(ctx, box, C.rose, labels.after);
  ctx.restore();
}

function cornerPills(s, box, divX, labels) {
  const { ctx } = s;
  const e = s.spring(0.4, { freq: 2, damp: 0.6 });
  if (e <= 0) return;
  const size = 34, h = 58, inset = 18, cy = box.y + inset + h / 2;
  const wOf = str => measure(ctx, str, 700, size) + 44;
  const bw = wOf(labels.before), aw = wOf(labels.after);
  // Each pill fades as the divider covers (before) or uncovers (after) its corner.
  const bLeft = box.x + box.w - inset - bw, aRight = box.x + inset + aw;
  const ba = clamp((bLeft - divX - 14) / 70), aa = clamp((divX - aRight - 14) / 70);
  if (ba > 0) {
    pivot(ctx, box.x + box.w - inset - bw / 2, cy, { scale: 0.8 + 0.2 * e, alpha: clamp(e * 2) * ba }, () => {
      pill(ctx, box.x + box.w - inset, cy, labels.before, { fill: '#FFFFFF', color: C.ink, size, weight: 700, padX: 22, h, lift: 0.8, align: 'right' });
    });
  }
  if (aa > 0) {
    pivot(ctx, box.x + inset + aw / 2, cy, { scale: 0.8 + 0.2 * e, alpha: clamp(e * 2) * aa }, () => {
      pill(ctx, box.x + inset, cy, labels.after, { fill: C.ink, color: C.chalk, size, weight: 700, padX: 22, h, lift: 0.8, align: 'left' });
    });
  }
}

// White divider line and the round drag handle.
function divider(s, box, divX, grab, tl) {
  const { ctx, t } = s;
  const cy = box.y + box.h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(16,16,20,0.28)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(divX - 2, box.y, 4, box.h);
  ctx.restore();

  // A soft pink ping as the wipe lands — the scene's one accent beat.
  const ping = clamp((t - tl.land + 0.1) / 0.7);
  if (ping > 0 && ping < 1) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,43,136,${0.55 * (1 - ping)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(divX, cy, HANDLE_R + 6 + ease.outCubic(ping) * 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const r = HANDLE_R * (1 + 0.08 * grab);
  disc(ctx, divX, cy, r, { fill: '#FFFFFF', lift: 1.4 + grab });
  lucideIcon(ctx, 'ChevronsLeftRight', divX, cy, 38, { color: C.ink, stroke: 2.3 });
}

function kit(s, box, divX, tl) {
  const { t } = s;
  const m = s.beat.mascot || {};
  // Aim from the pointing shoulder at the handle; keep the arm on Kit's side.
  const sx = KIT.x + 99 * KIT.s, sy = KIT.y - 128 * KIT.s;
  const pointAngle = clamp(Math.atan2(box.y + box.h / 2 - sy, divX - sx), -1.45, -0.25);
  let face = m.face && m.face !== 'happy' ? m.face : 'focus';
  if (t >= tl.land - 0.1) face = t < tl.land + 0.6 ? 'wow' : m.face || 'happy';
  s.kit({ x: KIT.x, y: KIT.y, s: KIT.s, pose: 'point', face, look: 0.5, flip: false, pointAngle, dark: s.set.ink === C.chalk });
}

// ================================================================ paper look

// Where the prints live. The right edge leaves room for the AFTER print's
// tilt, its star sticker and the camera push, so it stays clear of the IG
// right rail (≤ 990 on screen).
const PP = { top: 360, bottom: 1296, left: 92, right: 958 };
const PKIT = { x: 200, y: BAND.floorY + 50, s: 0.72 };
const HOLD = 1.6;   // the AFTER print lands at least this long before the cut
const NOTE_MAX = 880, NOTE_PAD = 30, NOTE_ICON = 46, NOTE_GAP = 18;
const PINK_TAPE = '#FF8DBF';
const BEFORE_LABEL = '#E2D3BE'; // kraft-ish stock for the old one

// A photo print for an image box iw × ih: a chalk border ~5% of the print.
function printGeom(iw, ih) {
  const b = Math.round(clamp(Math.max(iw, ih) * 0.05, 18, 34));
  return { iw, ih, b, w: iw + b * 2, h: ih + b * 2 };
}

// A faint paper grain over the photo so it reads as printed, not on a screen.
const photoGrain = new WeakMap();
function grainFor(ctx) {
  let p = photoGrain.get(ctx);
  if (!p) photoGrain.set(ctx, (p = ctx.createPattern(grainCanvas('light'), 'repeat')));
  return p;
}

// The print itself, centred on (0, 0) in the caller's (tilted) space.
function drawPrint(ctx, g, img, { lift = 1.6, missing = '' } = {}) {
  const x = -g.w / 2, y = -g.h / 2, ix = x + g.b, iy = y + g.b;
  paper(ctx, c => roundRectPath(c, x, y, g.w, g.h, 4), { fill: C.chalk, lift, rim: 0.7 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, g.iw, g.ih);
  ctx.clip();
  if (img) {
    ctx.imageSmoothingQuality = 'high';
    drawCover(ctx, img, ix, iy, g.iw, g.ih);
  } else {
    ctx.fillStyle = '#E6E1E9';
    ctx.fillRect(ix, iy, g.iw, g.ih);
    icon(ctx, 'image', 0, -30, 88, C.mute);
    if (missing) text(ctx, missing, 0, 46, { weight: 800, size: 34, color: C.mute });
  }
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = grainFor(ctx);
  ctx.fillRect(ix, iy, g.iw, g.ih);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(16,16,20,0.16)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ix, iy, g.iw, g.ih);
  ctx.restore();
}

// ALL-CAPS word sized for a torn label (≥ 34px; long words end in "…").
function labelFit(ctx, str, maxW, maxSize = 38, minSize = 34) {
  const tr = 1.5;
  let size = maxSize;
  while (size > minSize && measure(ctx, str, 900, size, tr) > maxW) size -= 2;
  let out = str;
  while (out.length > 1 && measure(ctx, out, 900, size, tr) > maxW) out = `${out.slice(0, -2).trimEnd()}…`;
  const tw = measure(ctx, out, 900, size, tr);
  return { size, str: out, w: tw + 46, h: size + 30 };
}

// Torn paper label centred on (0, 0).
function tornLabel(ctx, f, { fill, color, seed }) {
  paper(ctx, c => tornRectPath(c, -f.w / 2, -f.h / 2, f.w, f.h, { seed, rough: 3.5, step: 10 }), { fill, lift: 1.1, rim: 0.5 });
  text(ctx, f.str, 0, 2, { weight: 900, size: f.size, color, tracking: 1.5 });
}

function starPath(c, r, inner = 0.47) {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * inner : r;
    if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  c.closePath();
}

// Pink star sticker with a die-cut white margin, centred on (0, 0).
function starSticker(ctx, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(44,8,28,0.26)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 5;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 16;
  ctx.strokeStyle = C.chalk;
  ctx.fillStyle = C.chalk;
  ctx.beginPath();
  starPath(ctx, r);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  paper(ctx, c => starPath(c, r), { fill: pinkGradient(ctx, -r, -r, r, r), lift: 0, rim: 0.8 });
}

// Hand-cut paper arrow along a bowed curve, cut out to progress p (0..1).
function paperArrow(ctx, x1, y1, x2, y2, { p = 1, bend = 0.3, fill = C.ink, width = 22, head = 58, seed = 'arrow' } = {}) {
  if (p <= 0.02) return;
  const dx = x2 - x1, dy = y2 - y1;
  const mx = (x1 + x2) / 2 - dy * bend, my = (y1 + y2) / 2 + dx * bend;
  const at = u => ({ x: (1 - u) ** 2 * x1 + 2 * (1 - u) * u * mx + u * u * x2, y: (1 - u) ** 2 * y1 + 2 * (1 - u) * u * my + u * u * y2 });
  const N = 28, pts = [], len = [0];
  for (let i = 0; i <= N; i++) pts.push(at((i / N) * p));
  for (let i = 1; i <= N; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = len[N];
  const hl = Math.min(head, total * 0.6);
  let k = N;
  while (k > 1 && total - len[k] < hl * 0.8) k--;
  const base = pts[k], tip = pts[N];
  const ang = Math.atan2(tip.y - base.y, tip.x - base.x);
  const r = rng(seed);
  const left = [], right = [];
  for (let i = 0; i <= k; i++) {
    const a = pts[Math.min(i + 1, N)], b = pts[Math.max(i - 1, 0)];
    const ta = Math.atan2(a.y - b.y, a.x - b.x), nx = -Math.sin(ta), ny = Math.cos(ta);
    const hw = (width / 2) * (0.62 + 0.38 * (i / Math.max(1, k)));
    const jl = (r() - 0.5) * 2.6, jr = (r() - 0.5) * 2.6;
    left.push([pts[i].x + nx * (hw + jl), pts[i].y + ny * (hw + jl)]);
    right.push([pts[i].x - nx * (hw + jr), pts[i].y - ny * (hw + jr)]);
  }
  const hw = hl * 0.6, nx = -Math.sin(ang), ny = Math.cos(ang);
  paper(ctx, c => {
    c.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) c.lineTo(left[i][0], left[i][1]);
    c.lineTo(base.x + nx * hw, base.y + ny * hw);
    c.lineTo(tip.x + Math.cos(ang) * 4, tip.y + Math.sin(ang) * 4);
    c.lineTo(base.x - nx * hw, base.y - ny * hw);
    for (let i = right.length - 1; i >= 0; i--) c.lineTo(right[i][0], right[i][1]);
    c.closePath();
  }, { fill, lift: 1, rim: 0.5 });
}

// Short ink ticks around a print that just landed.
function impact(ctx, cx, cy, w, h, p, color) {
  if (p <= 0 || p >= 1) return;
  const k = ease.outCubic(p);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= 1 - p;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const [ax, ay, a] of [[-1, -1, -2.4], [-1, 0.2, Math.PI], [1, -1, -0.7], [1, 0.2, 0], [0.2, -1, -1.57]]) {
    const ox = cx + (ax * w) / 2 + Math.cos(a) * (14 + k * 24), oy = cy + (ay * h) / 2 + Math.sin(a) * (12 + k * 20);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + Math.cos(a) * 24, oy + Math.sin(a) * 24);
    ctx.stroke();
  }
  ctx.restore();
}

// The torn prompt note: ≤ 2 lines, an over-long prompt ends in an ellipsis.
function noteLayout(ctx, prompt) {
  const maxText = NOTE_MAX - NOTE_PAD * 2 - NOTE_ICON - NOTE_GAP;
  const fit = fitWrapped(ctx, `“${prompt}”`, 700, maxText, 2, 40, 34);
  const lines = fit.lines.map(l => clipLine(ctx, l, 700, fit.size, maxText));
  if (lines.length && /…$/.test(lines[lines.length - 1]) && !/”$/.test(lines[lines.length - 1])) lines[lines.length - 1] += '”';
  const lh = Math.round(fit.size * 1.24);
  const textW = Math.max(...lines.map(l => drawnWidth(ctx, l, 700, fit.size)));
  const w = clamp(NOTE_PAD * 2 + NOTE_ICON + NOTE_GAP + textW + 8, 420, NOTE_MAX);
  const h = 62 + lines.length * lh;
  return { w, h, y: PP.top + 8, lines, size: fit.size, lh };
}

// Both prints' sizes and resting spots. Wide shots stack diagonally (BEFORE
// up-left, AFTER down-right); square and tall ones sit side by side.
function paperLayout(ctx, s, prompt) {
  const asp = m => (m?.width && m?.height ? m.width / m.height : null);
  const mb = s.media(s.props.before), ma = s.media(s.props.after);
  const aA = clamp(asp(ma) ?? asp(mb) ?? 1.4, 0.7, 1.6);
  const aB = clamp(asp(mb) ?? aA, 0.7, 1.6);
  const note = prompt ? noteLayout(ctx, prompt) : null;
  const top = note ? note.y + note.h + 34 : PP.top + 20;
  const H = PP.bottom - top, Wd = PP.right - PP.left;
  const r = rng(`ba-${s.index}-${s.props.before}-${s.props.after}`);
  const rotB = -(0.04 + r() * 0.022), rotA = 0.035 + r() * 0.02; // ≈ 2–3.5°
  const mode = aA >= 1.15 ? 'stack' : 'side';
  const sizes = wA => {
    const hA = wA / aA, sB = 0.8 * Math.sqrt(wA * hA);
    return { gA: printGeom(wA, hA), gB: printGeom(sB * Math.sqrt(aB), sB / Math.sqrt(aB)) };
  };
  let L = null;
  for (let wA = mode === 'stack' ? 660 : 540; wA >= 280 && !L; wA -= 8) {
    const { gA, gB } = sizes(wA);
    if (mode === 'stack') {
      const ov = Math.max(56, gB.h * 0.16);
      const span = gB.h + gA.h - ov;
      if (gA.w > Wd - 150 || gB.w > Wd - 210 || span > H) continue;
      const bTop = top + (H - span) / 2;
      L = { mode, gA, gB, B: { x: PP.left + gB.w / 2 + 6, y: bTop + gB.h / 2 }, A: { x: PP.right - gA.w / 2 - 6, y: bTop + gB.h - ov + gA.h / 2 } };
    } else {
      const drop = Math.max(140, gB.h * 0.3);
      const spanH = Math.max(gB.h + 40, drop + gA.h);
      const ovx = Math.max(40, gB.w + gA.w - Wd);
      if (ovx > gB.w * 0.28 || spanH > H) continue;
      const totalW = gB.w + gA.w - ovx, x0 = PP.left + (Wd - totalW) / 2;
      const bTop = top + (H - spanH) / 2;
      L = { mode, gA, gB, B: { x: x0 + gB.w / 2, y: bTop + gB.h / 2 }, A: { x: x0 + totalW - gA.w / 2, y: bTop + drop + gA.h / 2 } };
    }
  }
  if (!L) {
    const { gA, gB } = sizes(280);
    L = { mode: 'side', gA, gB, B: { x: 300, y: top + gB.h / 2 }, A: { x: 760, y: top + 140 + gA.h / 2 } };
  }
  // Alone, the BEFORE print waits a little bigger in the middle of the stage.
  const soloK = Math.min(1.3, (Wd - 60) / L.gB.w, (H - 80) / L.gB.h);
  L.solo = { x: W / 2, y: top + H * 0.46, k: soloK };
  return { ...L, note, top, rotA, rotB };
}

// The AFTER slaps on as the change is spoken (else ~40% in), but lands no
// later than HOLD before the cut so the payoff is on screen ≥ 1.5s; the
// note's writing compresses to finish before it.
function paperTimeline(s, chars, cue) {
  const writeStart = 0.35;
  const natural = chars ? clamp(chars * 0.035, 0.5, 1.4) : 0;
  const lead = chars ? writeStart + 0.5 + 0.45 : 1.0; // BEFORE alone at least this long
  const latest = Math.max(lead, s.dur - HOLD - 0.28);
  const slap = cue != null ? clamp(cue, lead, latest) : clamp(Math.max(s.dur * 0.4, lead + natural * 0.5), lead, latest);
  const writeDur = chars ? clamp(slap - 0.4 - writeStart, 0.5, natural) : 0;
  return { writeStart, writeDur, moveAt: slap - 0.3, slap, land: slap + 0.28 };
}

function promptNote(s, N, tl) {
  const { ctx, t } = s;
  const e = s.enter(0.05, 0.4);
  if (e <= 0) return;
  const b = boil('ba-note', t, 0.8);
  withT(ctx, { x: W / 2 + b.dx, y: N.y + N.h / 2 + b.dy - (1 - e) * 40, rot: -0.012 + b.rot - (1 - e) * 0.08, scale: 0.85 + 0.15 * e, alpha: clamp(e * 3) }, () => {
    paper(ctx, c => tornRectPath(c, -N.w / 2, -N.h / 2, N.w, N.h, { seed: 'ba-note', rough: 4, step: 12 }), { fill: C.chalk, lift: 1.5, rim: 0.6 });
    const ix = -N.w / 2 + NOTE_PAD + NOTE_ICON / 2;
    icon(ctx, 'sparkle', ix, 0, NOTE_ICON + Math.sin(onTwos(t) * 5) * 3, C.pink);
    // Written in on twos, line by line.
    const total = N.lines.reduce((n, l) => n + l.length, 0);
    let left = clamp(Math.floor(((onTwos(t) - tl.writeStart) / Math.max(0.01, tl.writeDur)) * total), 0, total);
    const tx = ix + NOTE_ICON / 2 + NOTE_GAP, y0 = -((N.lines.length - 1) * N.lh) / 2 + 2;
    N.lines.forEach((l, i) => {
      if (left <= 0) return;
      const part = l.slice(0, left);
      left -= part.length;
      text(ctx, part, tx, y0 + i * N.lh, { weight: 700, size: N.size, color: C.ink, align: 'left' });
    });
    tape(ctx, 0, -N.h / 2 - 2, 200, 44, -0.025, { seed: 'ba-note-tape', color: PINK_TAPE, alpha: 0.8 });
  });
}

function drawPaper(s) {
  const { ctx, t, ts, props } = s;
  const prompt = String(props.prompt || '').replace(/\s+/g, ' ').trim();
  const L = paperLayout(ctx, s, prompt);
  const tl = paperTimeline(s, prompt.length, changeCue(s, prompt, props.afterLabel || ''));
  const ink = s.set.ink;
  const labelB = labelFit(ctx, shortLabel(props.beforeLabel, 'Before').toUpperCase(), Math.min(320, L.gB.w - 70));
  const labelA = labelFit(ctx, shortLabel(props.afterLabel, 'After').toUpperCase(), Math.min(360, L.gA.w - 150));
  // Stacked, the AFTER print covers the BEFORE's bottom-left corner: its
  // label moves up to the top edge (right of the corner tape) unless it fits
  // in the strip the AFTER leaves uncovered.
  const freeB = (L.A.x - L.gA.w / 2) - (L.B.x - L.gB.w / 2) - 30;
  const labelBTop = L.mode === 'stack' && labelB.w + 20 > freeB;
  const labelBPos = labelBTop
    ? { x: -L.gB.w / 2 + 92 + labelB.w / 2, y: -L.gB.h / 2 + 2, rot: -0.04 }
    : { x: -L.gB.w / 2 + 20 + labelB.w / 2, y: L.gB.h / 2 - 4, rot: 0.06 };

  if (L.note) promptNote(s, L.note, tl);

  // ---- BEFORE: drops in alone, shuffles up-left as the AFTER arrives
  const bIn = s.enter(0.12, 0.4);
  const mv = clamp(s.spring(tl.moveAt, { freq: 1.6, damp: 0.62 }), 0, 1.06);
  const hit = clamp((ts - tl.land) / 0.24);
  const jolt = hit > 0 && hit < 1 ? Math.sin(hit * Math.PI * 3) * (1 - hit) * 7 : 0;
  const bb = boil('ba-before', t, 1.1);
  const bx = lerp(L.solo.x, L.B.x, mv), by = lerp(L.solo.y, L.B.y, mv);
  const bk = lerp(L.solo.k, 1, mv);
  if (bIn > 0) {
    withT(ctx, { x: bx + bb.dx, y: by + bb.dy + jolt, rot: lerp(L.rotB * 0.5, L.rotB, mv) + bb.rot + (1 - bIn) * -0.12, scale: bk * lerp(1.22, 1, bIn), alpha: clamp(bIn * 3) }, () => {
      const g = L.gB;
      drawPrint(ctx, g, s.mediaFrame(props.before), { lift: lerp(3.4, 1.4, clamp(bIn)), missing: 'Before' });
      tape(ctx, -g.w / 2 + 22, -g.h / 2 + 10, 116, 38, -0.72, { seed: 'ba-tb1', alpha: 0.8 });
      tape(ctx, g.w / 2 - 22, -g.h / 2 + 10, 116, 38, 0.72, { seed: 'ba-tb2', alpha: 0.8 });
      withT(ctx, labelBPos, () => tornLabel(ctx, labelB, { fill: BEFORE_LABEL, color: C.ink, seed: 'ba-lb' }));
    });
  }

  // ---- hand-cut arrow from the BEFORE to the AFTER
  const ar = ease.outCubic(clamp((ts - tl.slap - 0.3) / 0.4));
  if (ar > 0) {
    const ab = boil('ba-arrow', t, 1);
    const bR = L.B.x + L.gB.w / 2, bT = L.B.y - L.gB.h / 2, aT = L.A.y - L.gA.h / 2;
    const [x1, y1, x2, y2, bend] = L.mode === 'stack'
      ? [bR + 16, L.B.y - L.gB.h * 0.14, L.A.x + L.gA.w * 0.16, aT - 30, -0.32]
      : [bR + 14, bT + Math.min(L.gB.h * 0.18, aT - bT - 40), L.A.x + L.gA.w * 0.08, aT - 30, -0.42];
    paperArrow(ctx, x1 + ab.dx, y1 + ab.dy, x2 + ab.dx, y2 + ab.dy, { p: ar, bend, fill: ink, seed: 'ba-arrow' });
  }

  // ---- AFTER: slaps down on top, tilted the other way
  const aIn = s.enter(tl.slap, 0.28);
  if (aIn > 0) {
    const ab = boil('ba-after', t, 1);
    const g = L.gA;
    const stuck = clamp((ts - tl.land - 0.04) / 0.12);
    withT(ctx, { x: L.A.x + ab.dx, y: L.A.y + ab.dy, rot: L.rotA + ab.rot + (1 - aIn) * 0.16, scale: lerp(1.45, 1, aIn), alpha: clamp(aIn * 4) }, () => {
      drawPrint(ctx, g, s.mediaFrame(props.after, tl.slap), { lift: lerp(4.2, 1.9, clamp(aIn)), missing: 'After' });
      if (stuck > 0) {
        ctx.save();
        ctx.globalAlpha *= stuck;
        tape(ctx, -g.w / 2 + 24, -g.h / 2 + 12, 124, 40, -0.7, { seed: 'ba-ta1', alpha: 0.82 });
        tape(ctx, -g.w / 2 + 26, g.h / 2 - 12, 124, 40, 0.7, { seed: 'ba-ta2', alpha: 0.82 });
        ctx.restore();
      }
      // Its label sits bottom-right, away from Kit's pointing hand.
      withT(ctx, { x: g.w / 2 - 24 - labelA.w / 2, y: g.h / 2 - 2, rot: -0.05 }, () =>
        tornLabel(ctx, labelA, { fill: C.ink, color: C.chalk, seed: 'ba-la' }));
      const st = s.enter(tl.land + 0.22, 0.32);
      if (st > 0) {
        withT(ctx, { x: g.w / 2 - 58, y: -g.h / 2 + 34, scale: st, rot: 0.18 + Math.sin(onTwos(t) * 2.6) * 0.07 }, () => starSticker(ctx, 46));
      }
    });
    impact(ctx, L.A.x, L.A.y, g.w + 24, g.h + 24, clamp((ts - tl.land + 0.04) / 0.32), ink);
  }

  // ---- Kit: studies the BEFORE, then points at the AFTER
  const m = s.beat.mascot || {};
  const target = t < tl.slap ? { x: bx, y: by } : { x: L.A.x - L.gA.w * 0.15, y: L.A.y };
  const sx = PKIT.x + 99 * PKIT.s, sy = PKIT.y - 128 * PKIT.s;
  const pointAngle = clamp(Math.atan2(target.y - sy, target.x - sx), -1.45, -0.25);
  let face = m.face && m.face !== 'happy' ? m.face : 'focus';
  if (t >= tl.slap) face = t < tl.land + 0.6 ? 'wow' : m.face || 'happy';
  s.kit({ x: PKIT.x, y: PKIT.y, s: PKIT.s, pose: 'point', face, look: 0.5, flip: false, pointAngle });
}

// ---------------------------------------------------------------- scene

export default {
  type: 'beforeafter',
  describe: 'An edit / transformation with real media: the BEFORE and AFTER images share one big card and a slider handle wipes the after in over the before as the voice names the change. Optional prompt chip types the edit instruction first. Use when the sources show the actual edit (recolor, inpaint, upscale, restyle).',
  props: {
    before: 'media id of the original image (or video)',
    after: 'media id of the edited result (image or video; a video starts playing as it is revealed)',
    prompt: 'string ≤ 80 chars (optional) — the edit instruction, typed into a chip above the card',
    beforeLabel: 'string ≤ 12 chars (optional, default "Before")',
    afterLabel: 'string ≤ 12 chars (optional, default "After")',
  },
  draw(s) {
    if (!isStudio()) return drawPaper(s);
    const { ctx, t, props } = s;
    const prompt = String(props.prompt || '').replace(/\s+/g, ' ').trim();
    const labels ={ before: shortLabel(props.beforeLabel, 'Before'), after: shortLabel(props.afterLabel, 'After') };
    const L = layout(ctx, s, prompt);
    const tl = timeline(s, prompt.length, changeCue(s, prompt, props.afterLabel || ''));
    const { p, grab } = handleAt(t, tl);
    const divX = L.box.x + p * L.box.w;

    if (L.chip) promptChip(s, L.chip, tl);

    const e = s.spring(0.1, { freq: 1.6, damp: 0.6 });
    if (e > 0) {
      const { card, box } = L;
      pivot(ctx, W / 2, card.y + card.h / 2, { scale: 0.94 + 0.06 * e, alpha: clamp(e * 1.6), dy: (1 - e) * 120 }, () => {
        paper(ctx, c => roundRectPath(c, card.x, card.y, card.w, card.h, CARD_R), { fill: '#FFFFFF', lift: 2.2 });
        images(s, box, divX, tl, labels);
        cornerPills(s, box, divX, labels);
        // Hairline on the image edge so light photos don't bleed into the card.
        ctx.save();
        ctx.strokeStyle = 'rgba(16,16,20,0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        roundRectPath(ctx, box.x, box.y, box.w, box.h, BOX_R);
        ctx.stroke();
        ctx.restore();
        divider(s, box, divX, grab, tl);
      });
    }

    kit(s, L.box, divX, tl);
  },
};
