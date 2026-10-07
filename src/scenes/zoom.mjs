// Zoom: one real image (or video) in a site card. It lands whole, a pink focus
// frame draws itself around the detail while the rest dims, then the camera
// pushes in until the detail fills the card — the card reshapes to the
// detail's proportions on the way so small text ends up big enough to read.
// An optional caption pill lands with the push and Kit points at the detail.
//
// Paper look (default): one big taped photo print. A pink marker loop rings
// the detail, then a paper magnifying glass (chunky ink handle, pink collar,
// chalk rim) slides over it and its lens shows that region magnified 2–3×;
// an optional caption slaps on as a torn label. Kit points at the glass.
// The glass is sized so the whole focus box fits in the lens (2–3×, dropping
// toward 1.3× for a wide box), and with props.cue it lands as the voice says
// that word or phrase.
import { W, C, BAND, isStudio } from '../brand.mjs';
import { paper, disc, roundRectPath, tornRectPath, text, measure, tape, withT, pinkGradient, grainCanvas } from '../paper.mjs';
import { pill, icon } from '../fx.mjs';
import { lucideIcon } from '../icons.mjs';
import { drawSet } from '../backgrounds.mjs';
import { clamp, lerp, ease, rng, boil, onTwos } from '../util.mjs';

const PAD = 14, CARD_R = 18, BOX_R = 10;       // the card and its image box
const MAX_BW = 872, MAX_BH = 700, CY = 752;    // box limits; the card stays centred on CY
const FILL = 0.88;                             // share of the box the detail fills after the push
const MAX_UPSCALE = 3.2;                       // screen px per image px — past this, pixels go soft
const MIN_PUSH = 1.3;                          // even a big focus region gets a real push
const KIT = { x: 190, y: BAND.floorY + 50, s: 0.64 };
const CAPTION_X = 612;                         // right of Kit
const DEFAULT_FOCUS = [0.3, 0.3, 0.4, 0.4];

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

// Single-line fit with an ellipsis fallback.
function fitOne(ctx, str, weight, maxW, maxSize, minSize) {
  let size = maxSize;
  while (size > minSize && measure(ctx, str, weight, size) > maxW) size -= 2;
  let s = str;
  while (s.length > 1 && measure(ctx, s, weight, size) > maxW) s = `${s.slice(0, -2).trimEnd()}…`;
  return { size, str: s };
}

// focus as [x, y, w, h] in 0–1 of the image (also { x, y, w, h }, or pixel
// boxes, which are normalised); anything unusable falls back to the middle.
function readFocus(f, item) {
  let a = Array.isArray(f) ? f : f && typeof f === 'object' ? [f.x, f.y, f.w ?? f.width, f.h ?? f.height] : null;
  if (!a || a.length < 4 || a.slice(0, 4).some(v => !Number.isFinite(Number(v)))) return DEFAULT_FOCUS;
  a = a.slice(0, 4).map(Number);
  if (a.some(v => v > 1) && item?.width && item?.height) a = [a[0] / item.width, a[1] / item.height, a[2] / item.width, a[3] / item.height];
  const w = clamp(a[2], 0.04, 1), h = clamp(a[3], 0.04, 1);
  return [clamp(a[0], 0, 1 - w), clamp(a[1], 0, 1 - h), w, h];
}

// Largest box of this aspect inside MAX_BW × MAX_BH.
function fitBox(aspect) {
  let w = MAX_BW, h = w / aspect;
  if (h > MAX_BH) { h = MAX_BH; w = h * aspect; }
  return { w, h };
}

// ---------------------------------------------------------------- camera

// The push, worked out once: the box starts at the image's shape (whole
// image, contain-fit) and ends at the detail's shape, with the detail filling
// FILL of it. iw/ih are image pixels; k is screen px per image px.
function plan(item, focus) {
  const iw = item.width, ih = item.height;
  const b0 = fitBox(clamp(iw / ih, 0.5, 2.6));
  const [fx, fy, fw, fh] = focus;
  const fpw = fw * iw, fph = fh * ih;
  const b1 = fitBox(clamp(fpw / fph, 0.75, 1.5));
  const k0 = Math.min(b0.w / iw, b0.h / ih);
  let k1 = Math.min((b1.w * FILL) / fpw, (b1.h * FILL) / fph, MAX_UPSCALE);
  k1 = Math.max(k1, k0 * MIN_PUSH, Math.max(b1.w / iw, b1.h / ih));
  return { iw, ih, b0, b1, k0, k1, c1: { x: (fx + fw / 2) * iw, y: (fy + fh / 2) * ih }, focus };
}

// Camera at push progress e (0..1, eased) plus a slow extra drift after it.
function viewAt(P, e, drift = 0) {
  const bw = lerp(P.b0.w, P.b1.w, e), bh = lerp(P.b0.h, P.b1.h, e);
  const contain = Math.min(bw / P.iw, bh / P.ih), cover = Math.max(bw / P.iw, bh / P.ih);
  // Scale grows geometrically (an even-feeling push); never shows past the
  // image edge once the push is under way.
  let k = P.k0 * Math.pow(P.k1 / P.k0, e);
  k = Math.max(k, lerp(contain, cover, e)) * (1 + drift);
  // Centre moves so the detail approaches like a true zoom toward it.
  const w = P.k1 > P.k0 * 1.001 ? clamp((1 - P.k0 / k) / (1 - P.k0 / P.k1)) : e;
  let cx = lerp(P.iw / 2, P.c1.x, w), cy = lerp(P.ih / 2, P.c1.y, w);
  const hx = bw / (2 * k), hy = bh / (2 * k);
  cx = hx * 2 >= P.iw ? P.iw / 2 : clamp(cx, hx, P.iw - hx);
  cy = hy * 2 >= P.ih ? P.ih / 2 : clamp(cy, hy, P.ih - hy);
  return { bw, bh, k, cx, cy };
}

// Local time the voice says `phrase` ("Keep this"): the first run of spoken
// words that starts with its words (prefix match per word), else null.
function phraseTime(s, phrase) {
  const norm = w => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const want = String(phrase || '').split(/\s+/).map(norm).filter(Boolean);
  if (!want.length) return null;
  const got = s.words.map(w => norm(w.text));
  for (let i = 0; i + want.length <= got.length; i++) {
    if (want.every((w, k) => got[i + k].startsWith(w))) return s.words[i].start;
  }
  return null;
}

function timeline(s) {
  const pushDur = clamp((s.dur - 0.7) * 0.45, 0.9, 1.5);
  // With a cue the push lands on the word; otherwise it starts at 0.7s.
  const cue = phraseTime(s, s.props.cue);
  const pushAt = cue != null ? clamp(cue - pushDur, 0.7, Math.max(0.7, s.dur - pushDur - 0.6)) : 0.7;
  return { rectAt: 0.35, pushAt, pushDur, land: pushAt + pushDur };
}

// ---------------------------------------------------------------- drawing

function focusFrame(s, box, r, tl) {
  const { ctx, t } = s;
  const a = clamp((t - tl.rectAt) / 0.3);
  if (a <= 0) return;
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, box.x, box.y, box.w, box.h, BOX_R);
  ctx.clip();
  // Dim everything but the detail.
  ctx.beginPath();
  ctx.rect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
  roundRectPath(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.fillStyle = `rgba(16,16,20,${0.28 * a})`;
  ctx.fill('evenodd');
  // The frame draws itself on, then breathes very slightly.
  const draw = ease.outCubic(clamp((t - tl.rectAt) / 0.45));
  const per = 2 * (r.w + r.h);
  ctx.setLineDash([per * draw, per]);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  roundRectPath(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = C.pink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Magnifier badge pinned to the frame's top-right corner (kept on the card).
  const b = s.spring(tl.rectAt + 0.25, { freq: 2, damp: 0.55 });
  if (b <= 0) return;
  const bx = clamp(r.x + r.w, box.x + 34, box.x + box.w - 34), by = clamp(r.y, box.y + 34, box.y + box.h - 34);
  pivot(ctx, bx, by, { scale: b, alpha: clamp(b * 2) }, () => {
    disc(ctx, bx, by, 30, { fill: '#FFFFFF', lift: 1.2 });
    lucideIcon(ctx, 'ZoomIn', bx, by, 30, { color: C.ink, stroke: 2.3 });
  });
}

// Stand-in for a missing media item.
function placeholder(ctx, box) {
  ctx.fillStyle = '#F1F1F5';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  lucideIcon(ctx, 'ImageOff', box.x + box.w / 2, box.y + box.h / 2, 72, { color: C.mute, stroke: 1.8 });
}

function caption(s, str, cardBottom, tl) {
  const { ctx } = s;
  const c = s.spring(tl.land - 0.15, { freq: 2, damp: 0.55 });
  if (c <= 0) return;
  const fit = fitOne(ctx, str, 700, 600, 36, 34);
  const y = cardBottom + 56;
  // Ink pill on light walls, white on dark ones (an ink pill vanishes on ink).
  const dark = s.set.ink === C.chalk;
  pivot(ctx, CAPTION_X, y, { scale: 0.85 + 0.15 * c, alpha: clamp(c * 2), dy: (1 - c) * 24 }, () => {
    pill(ctx, CAPTION_X, y, fit.str, { fill: dark ? '#FFFFFF' : C.ink, color: dark ? C.ink : C.chalk, size: fit.size, weight: 700, padX: 30, h: 70, lift: 1.4 });
  });
}

function kit(s, target, tl) {
  const { t } = s;
  const m = s.beat.mascot || {};
  const sx = KIT.x + 99 * KIT.s, sy = KIT.y - 128 * KIT.s;
  const pointAngle = clamp(Math.atan2(target.y - sy, target.x - sx), -1.45, -0.25);
  let face = m.face && m.face !== 'happy' ? m.face : 'focus';
  if (t >= tl.land - 0.15) face = t < tl.land + 0.6 ? 'wow' : m.face || 'happy';
  s.kit({ x: KIT.x, y: KIT.y, s: KIT.s, pose: 'point', face, look: 0.5, flip: false, pointAngle, dark: s.set.ink === C.chalk });
}

// ================================================================ paper look

const ZP = { maxW: 860, maxH: 660, cy: 790, top: 368, bottom: 1176 }; // print image box limits and band
const ZKIT = { x: 200, y: BAND.floorY + 50, s: 0.72 };
const LENS_MIN = 170, LENS_MAX = 260, RIM = 28;
const LENS_BOX = { left: 66, right: 1014, top: 340, bottom: 1404 };      // the glass stays on stage
const CAP = { x: 600, maxW: 620 };

// A faint paper grain over the photo so it reads as printed, not on a screen.
const photoGrain = new WeakMap();
function grainFor(ctx) {
  let p = photoGrain.get(ctx);
  if (!p) photoGrain.set(ctx, (p = ctx.createPattern(grainCanvas('light'), 'repeat')));
  return p;
}

// Where everything sits: the print (image box + chalk border ~5%), its tilt,
// the detail's centre on screen, and the glass's size, power and rest spot.
function paperPlan(s, item, focus) {
  const aspect = clamp(item?.width && item?.height ? item.width / item.height : 1.6, 0.5, 2.6);
  let bw = ZP.maxW, bh = bw / aspect;
  if (bh > ZP.maxH) { bh = ZP.maxH; bw = bh * aspect; }
  const b = Math.round(clamp(Math.max(bw, bh) * 0.045, 20, 36));
  const pw = bw + b * 2, ph = bh + b * 2;
  const cy = clamp(ZP.cy, ZP.top + ph / 2, ZP.bottom - ph / 2);
  const r = rng(`zoom-${s.index}-${s.props.media}`);
  const rot = (r() < 0.5 ? -1 : 1) * (0.026 + r() * 0.016); // ≈ 1.5–2.4°, text stays legible

  // Image px → print-local px (cover-fit, as drawCover does).
  const iw = item?.width || bw, ih = item?.height || bh;
  const k = Math.max(bw / iw, bh / ih);
  const ox = -bw / 2 + (bw - iw * k) / 2, oy = -bh / 2 + (bh - ih * k) / 2;
  const [fx, fy, fw, fh] = focus;
  const fwS = fw * iw * k, fhS = fh * ih * k;
  const lx = ox + (fx + fw / 2) * iw * k, ly = oy + (fy + fh / 2) * ih * k;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const F = { x: W / 2 + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };

  // The lens is sized so the detail fills most of it at 2–3×. A detail too
  // big for the biggest lens at 2× gets less power (down to 1.3×) rather
  // than being clipped by the rim — the whole box always shows.
  const hyp = Math.max(24, Math.hypot(fwS, fhS));
  const R = clamp((hyp * 3) / (2 * 0.92), LENS_MIN, LENS_MAX);
  const M = clamp(Math.min((2 * R * 0.92) / hyp, Math.max(2, 3.4 / k)), 1.3, 3);
  const pad = R + RIM;
  const T = { x: clamp(F.x, LENS_BOX.left + pad, LENS_BOX.right - pad), y: clamp(F.y, LENS_BOX.top + pad, LENS_BOX.bottom - pad) };

  // The caption's torn label hangs off the print's bottom edge, right of Kit.
  const cap = captionFit(s.ctx, String(s.props.caption || '').trim(), cy + ph / 2 + 8);

  // Handle direction and caption spot, picked together: the handle stays on
  // stage and clear of Kit, and neither the handle nor the lens sits on the
  // caption. Earlier angles (down-right first) and a centred caption win ties.
  const HL = Math.round(R * 0.8 + 50);
  const from = pad + 30, reach = from + 52 + HL;
  const capXs = cap ? [...new Set([CAP.x, 220 + cap.w / 2, 1010 - cap.w / 2].map(x => clamp(x, 220 + cap.w / 2, 1010 - cap.w / 2)))] : [null];
  const score = (a, cx) => {
    let pen = 0;
    const onCap = (x, y, m) => cap && Math.abs(x - cx) < cap.w / 2 + m && Math.abs(y - cap.y) < cap.h / 2 + m;
    for (let i = 0; i <= 4; i++) {
      const d = lerp(from, reach, i / 4), x = T.x + Math.cos(a) * d, y = T.y + Math.sin(a) * d;
      pen += (Math.max(0, 60 - x) + Math.max(0, x - 1020) + Math.max(0, 340 - y) + Math.max(0, y - 1420)) * (i === 4 ? 3 : 1);
      pen += Math.max(0, 190 - Math.hypot(x - ZKIT.x, y - (ZKIT.y - 120))) * 2;
      if (onCap(x, y, 30)) pen += 120;
    }
    if (cap) {
      const dx = Math.max(0, Math.abs(T.x - cx) - cap.w / 2), dy = Math.max(0, Math.abs(T.y - cap.y) - cap.h / 2);
      pen += Math.max(0, pad + 12 - Math.hypot(dx, dy)) * 1.5;
    }
    return -pen;
  };
  let best = null;
  [0.82, 0.3, 1.25, -0.35, 2.32, -0.9, 2.84, -2.3].forEach((a, ai) => capXs.forEach((cx, ci) => {
    const sc = score(a, cx) - ai * 12 - ci * 6;
    if (!best || sc > best.sc) best = { sc, a, cx };
  }));
  const angle = best.a;
  if (cap) cap.x = best.cx;

  return { bw, bh, b, pw, ph, cy, rot, iw, ih, k, ox, oy, fwS, fhS, lx, ly, F, R, M, T, HL, angle, cap, img: !!item };
}

// The print, centred on (0, 0) in its own tilted space.
function drawPrint(ctx, P, img) {
  const x = -P.pw / 2, y = -P.ph / 2, ix = -P.bw / 2, iy = -P.bh / 2;
  paper(ctx, c => roundRectPath(c, x, y, P.pw, P.ph, 4), { fill: C.chalk, lift: 1.8, rim: 0.7 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, P.bw, P.bh);
  ctx.clip();
  if (img) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, P.ox, P.oy, P.iw * P.k, P.ih * P.k);
  } else {
    ctx.fillStyle = '#E6E1E9';
    ctx.fillRect(ix, iy, P.bw, P.bh);
    icon(ctx, 'image', 0, 0, 96, C.mute);
  }
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = grainFor(ctx);
  ctx.fillRect(ix, iy, P.bw, P.bh);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(16,16,20,0.16)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ix, iy, P.bw, P.bh);
  ctx.restore();
  tape(ctx, x + 26, y + 10, 128, 40, -0.7, { seed: 'zm-t1', alpha: 0.8 });
  tape(ctx, -x - 26, y + 10, 128, 40, 0.7, { seed: 'zm-t2', alpha: 0.8 });
}

// Hand-drawn pink marker loop around the detail (print-local), drawn to p.
function markerLoop(ctx, P, p, alpha) {
  if (p <= 0 || alpha <= 0) return;
  const rx = P.fwS / 2 + 22, ry = P.fhS / 2 + 18;
  const r = rng('zm-loop');
  const wob = Array.from({ length: 9 }, () => (r() - 0.5) * 0.08);
  const turns = 1.12 * p, n = Math.max(2, Math.round(64 * turns));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = C.pink;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * turns, a = -2.3 + u * Math.PI * 2;
    const k = 1 + wob[Math.floor(u * 8) % 9] + u * 0.06;
    const x = P.lx + Math.cos(a) * rx * k, y = P.ly + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// The magnifying glass at (L), lens showing the world magnified M× about C.
function magnifier(s, P, L, C0, { angle, scale, drawWorld }) {
  const { ctx } = s;
  const R = P.R * scale, dark = s.set.ink === C.chalk;
  // Handle: pink collar, then the chunky ink grip.
  withT(ctx, { x: L.x, y: L.y, rot: angle, scale }, () => {
    const r0 = P.R + RIM - 8;
    paper(ctx, c => roundRectPath(c, r0, -27, 52, 54, 10), { fill: pinkGradient(ctx, r0, -27, r0 + 52, 27), lift: 1.2, rim: 0.7 });
    paper(ctx, c => roundRectPath(c, r0 + 44, -25, P.HL, 50, 25), {
      fill: C.ink, lift: 1.8, rim: 0.8, ...(dark ? { stroke: 'rgba(250,250,252,0.7)', strokeWidth: 3 } : {}),
    });
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath();
    roundRectPath(ctx, r0 + 60, -15, P.HL - 40, 9, 4.5);
    ctx.fill();
  });
  // Lens: the world, magnified.
  ctx.save();
  ctx.beginPath();
  ctx.arc(L.x, L.y, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.save();
  ctx.translate(L.x, L.y);
  ctx.scale(P.M, P.M);
  ctx.translate(-C0.x, -C0.y);
  drawWorld();
  ctx.restore();
  // Glass: a darker inner edge and a white glint.
  ctx.strokeStyle = 'rgba(16,16,20,0.16)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(L.x, L.y, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineCap = 'round';
  ctx.lineWidth = R * 0.08;
  ctx.beginPath();
  ctx.arc(L.x, L.y, R * 0.76, -2.55, -1.75);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(L.x + Math.cos(-1.5) * R * 0.76, L.y + Math.sin(-1.5) * R * 0.76, R * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Chalk rim with an ink edge.
  const rr = R + RIM * scale;
  paper(ctx, c => {
    c.arc(L.x, L.y, rr, 0, Math.PI * 2);
    c.moveTo(L.x + R, L.y);
    c.arc(L.x, L.y, R, 0, Math.PI * 2, true);
  }, { fill: C.chalk, lift: 1.8, rim: 0.7, stroke: C.ink, strokeWidth: 5 });
}

// Caption on a torn label: Inter 800, sentence case, ≥ 34px; null when empty.
function captionFit(ctx, str, y) {
  if (!str) return null;
  let size = 42;
  while (size > 34 && measure(ctx, str, 800, size) > CAP.maxW) size -= 2;
  let out = str;
  while (out.length > 1 && measure(ctx, out, 800, size) > CAP.maxW) out = `${out.slice(0, -2).trimEnd()}…`;
  const w = measure(ctx, out, 800, size) + 56, h = size + 34;
  return { str: out, size, w, h, x: clamp(CAP.x, 70 + w / 2 + 150, 1010 - w / 2), y };
}

function captionLabel(s, cap, at) {
  const { ctx } = s;
  const e = s.enter(at, 0.32);
  if (!cap || e <= 0) return;
  const { w, h } = cap;
  const dark = s.set.ink === C.chalk;
  const b = boil('zm-cap', s.t, 0.8);
  withT(ctx, { x: cap.x + b.dx, y: cap.y + b.dy, rot: -0.03 + b.rot + (1 - e) * 0.1, scale: lerp(1.35, 1, e), alpha: clamp(e * 4) }, () => {
    paper(ctx, c => tornRectPath(c, -w / 2, -h / 2, w, h, { seed: 'zm-cap', rough: 3.5, step: 10 }), { fill: dark ? C.chalk : C.ink, lift: 1.3, rim: 0.5 });
    text(ctx, cap.str, 0, 2, { weight: 800, size: cap.size, color: dark ? C.ink : C.chalk });
  });
}

function drawPaper(s) {
  const { ctx, t, props } = s;
  const ts = onTwos(t);
  const item = s.media(props.media);
  const img = s.mediaFrame(props.media);
  const P = paperPlan(s, item && img ? item : null, readFocus(props.focus, item));

  // The glass sets off ~1s in, or lands as the voice says props.cue.
  const cue = phraseTime(s, props.cue);
  const mAt = cue != null ? clamp(cue - 0.55, 0.8, Math.max(0.8, s.dur - 1.6)) : clamp(s.dur * 0.22, 0.8, 1.3);
  const land = mAt + 0.55;

  // ---- the print slaps onto the wall
  const pIn = s.enter(0.06, 0.42);
  const pb = boil('zm-print', t, 1);
  const pT = { x: W / 2 + pb.dx, y: P.cy + pb.dy, rot: P.rot + pb.rot + (1 - pIn) * -0.1, scale: lerp(1.2, 1, pIn) };
  const world = () => {
    drawSet(ctx, s.beat.set || 'rose');
    withT(ctx, pT, () => drawPrint(ctx, P, img));
  };
  if (pIn > 0) {
    withT(ctx, { ...pT, alpha: clamp(pIn * 3) }, () => {
      drawPrint(ctx, P, img);
      markerLoop(ctx, P, ease.outCubic(clamp((ts - 0.45) / 0.4)), 1 - clamp((ts - land + 0.25) / 0.3));
    });
  }

  // ---- the magnifying glass slides in from the right and settles on the detail
  const e = s.spring(mAt, { freq: 1.25, damp: 0.62 });
  let L = null;
  if (e > 0) {
    const S = { x: P.T.x + 560, y: P.T.y + 140 };
    const hover = clamp((ts - land) / 0.4);
    L = {
      x: lerp(S.x, P.T.x, e) + Math.sin(ts * 1.3) * 5 * hover,
      y: lerp(S.y, P.T.y, e) + Math.cos(ts * 1.1) * 4 * hover,
    };
    const C0 = { x: L.x + (P.F.x - P.T.x) * clamp(e), y: L.y + (P.F.y - P.T.y) * clamp(e) };
    const angle = P.angle + (1 - clamp(e)) * 0.35 + Math.sin(ts * 1.7) * 0.03;
    magnifier(s, P, L, C0, { angle, scale: lerp(0.8, 1, clamp(e * 1.4)), drawWorld: world });
  }

  captionLabel(s, P.cap, land - 0.05);

  // ---- Kit eyes the print, then points at the glass
  const m = s.beat.mascot || {};
  const target = L || { x: P.F.x, y: P.F.y };
  const sx = ZKIT.x + 99 * ZKIT.s, sy = ZKIT.y - 128 * ZKIT.s;
  const pointAngle = clamp(Math.atan2(target.y - sy, target.x - sx), -1.45, -0.25);
  let face = m.face && m.face !== 'happy' ? m.face : 'focus';
  if (t >= land - 0.1) face = t < land + 0.6 ? 'wow' : m.face || 'happy';
  s.kit({ x: ZKIT.x, y: ZKIT.y, s: ZKIT.s, pose: 'point', face, look: 0.5, flip: false, pointAngle });
}

// ---------------------------------------------------------------- scene

export default {
  type: 'zoom',
  describe: 'A detail in real media: the image (or video) lands whole in a card, a pink focus frame outlines one region, then the camera pushes in until that region fills the card. Use for legible text, fine detail or a small UI element the VO points out.',
  props: {
    media: 'media id of the image or video',
    focus: '[x, y, w, h] 0–1 of the image — the region to push into. Keep it tight (w ≤ ~0.3 of a full screenshot) so its text ends up readable',
    caption: 'string ≤ 32 chars (optional) — a pill under the card that lands with the push',
    cue: 'optional word or short phrase from the vo ("Keep this") — the glass/push lands as it is spoken; default ~1s in',
  },
  draw(s) {
    if (!isStudio()) return drawPaper(s);
    const { ctx, t, props } = s;
    const item = s.media(props.media);
    const img = s.mediaFrame(props.media);
    const tl = timeline(s);
    const P = item && img ? plan(item, readFocus(props.focus, item)) : null;

    // Push progress, then a slow drift so the frame never freezes.
    const e = ease.inOutCubic(clamp((t - tl.pushAt) / tl.pushDur));
    const drift = 0.035 * ease.inOutQuad(clamp((t - tl.land) / Math.max(1, s.dur - tl.land)));
    const v = P ? viewAt(P, e, drift) : { bw: 760, bh: 475 };
    const box = { x: (W - v.bw) / 2, y: CY - v.bh / 2, w: v.bw, h: v.bh };
    const card = { x: box.x - PAD, y: box.y - PAD, w: box.w + PAD * 2, h: box.h + PAD * 2 };
    // Where the detail sits on screen right now.
    const r = P
      ? { x: box.x + box.w / 2 + (P.focus[0] * P.iw - v.cx) * v.k, y: box.y + box.h / 2 + (P.focus[1] * P.ih - v.cy) * v.k, w: P.focus[2] * P.iw * v.k, h: P.focus[3] * P.ih * v.k }
      : null;

    const a = s.spring(0.05, { freq: 1.6, damp: 0.6 });
    if (a > 0) {
      pivot(ctx, W / 2, CY, { scale: 0.94 + 0.06 * a, alpha: clamp(a * 1.6), dy: (1 - a) * 120 }, () => {
        paper(ctx, c => roundRectPath(c, card.x, card.y, card.w, card.h, CARD_R), { fill: '#FFFFFF', lift: 2.2 });
        ctx.save();
        ctx.beginPath();
        roundRectPath(ctx, box.x, box.y, box.w, box.h, BOX_R);
        ctx.clip();
        if (P) {
          ctx.fillStyle = '#F5F5F5';
          ctx.fillRect(box.x, box.y, box.w, box.h);
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, box.x + box.w / 2 - v.cx * v.k, box.y + box.h / 2 - v.cy * v.k, P.iw * v.k, P.ih * v.k);
        } else placeholder(ctx, box);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = 'rgba(16,16,20,0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        roundRectPath(ctx, box.x, box.y, box.w, box.h, BOX_R);
        ctx.stroke();
        ctx.restore();
        if (r) focusFrame(s, box, r, tl);
      });
    }

    const cap = String(props.caption || '').trim();
    if (cap) {
      // Placed under the card's final size so it doesn't ride the reshape.
      const end = P ? viewAt(P, 1) : v;
      caption(s, cap, CY + end.bh / 2 + PAD, tl);
    }

    kit(s, r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : { x: W / 2, y: CY }, tl);
  },
};
