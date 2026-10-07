// Prompt beat, in the site's language: a white prompt card (pink lucide
// Sparkles, ink send button) types the prompt in behind a pink caret, the
// send button presses, a skeleton card shimmers under a "Generating" chip,
// then the result lands below it. With props.media that result is the REAL
// output from the sources (an image, or a video playing) revealed top-down in
// a clean card; without it, a drawn stand-in (a picture, an app wireframe, a
// code editor or a streamed paragraph). Kit types at a little desk and
// cheers when the result lands.
import { W, C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, cutCirclePath, fitWrapped, text, measure, pinkGradient } from '../../paper.mjs';
import { icon, sparkles } from '../../fx.mjs';
import { lucideIcon } from '../../icons.mjs';
import { drawCover, drawContain } from '../../mediastore.mjs';
import { clamp, lerp, ease, onTwos, rng, rgba, shade, luminance } from '../../util.mjs';

const KINDS = ['image', 'ui', 'code', 'text'];

const PX = 80, PW = W - 160, PY = 352;            // prompt card
const TEXT_X = PX + 112, TEXT_W = PW - 112 - 118; // typed text column
const RW = 760;                                   // drawn result card width
// Real result card bounds: above Kit's head, or beside Kit (x ≥ besideKit) down to `deep`.
const MEDIA_MAX = { w: 900, bottom: 1066, besideKit: 356, right: 990, deep: 1190 };
const KX = 222, KS = 0.92, KY = BAND.floorY + 50; // Kit at the desk

// Draw `fn` scaled/rotated about (cx, cy), keeping absolute coordinates.
function pivot(ctx, cx, cy, { scale = 1, rot = 0, alpha = 1, dx = 0, dy = 0 } = {}, fn) {
  ctx.save();
  ctx.translate(cx + dx, cy + dy);
  if (rot) ctx.rotate(rot);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  fn();
  ctx.restore();
}

// Width of `str` as text() draws it (studio display sizes run tight).
const drawnWidth = (ctx, str, weight, size) => measure(ctx, str, weight, size);

// When things happen. Typing starts once the card has landed; the result
// lands a little before the middle of the line so it has time on screen.
function timeline(s, chars) {
  const vs = s.words.length ? s.words[0].start : s.voStart;
  const ve = s.words.length ? s.words[s.words.length - 1].end : s.voEnd;
  const typeStart = 0.35;
  const target = clamp(lerp(vs, ve, 0.45), 1.4, Math.max(1.4, s.dur - 1.5));
  const typeDur = clamp(chars * 0.04, 0.45, Math.max(0.45, target - 0.75 - typeStart));
  const sendAt = typeStart + typeDur + 0.12;
  const resultAt = Math.max(sendAt + 0.5, target);
  return { typeStart, typeDur, sendAt, resultAt };
}

// Wrap the prompt into ≤ 3 lines; an over-long prompt ends in an ellipsis and
// a single unbreakable word is cut to the column.
function promptLines(ctx, str) {
  const fit = fitWrapped(ctx, str, 600, TEXT_W, 3, 44, 34);
  fit.lines = fit.lines.map(l => clipLine(ctx, l, 600, fit.size, TEXT_W));
  return fit;
}

// Cut a line character by character until it fits, ending in an ellipsis.
function clipLine(ctx, line, weight, size, maxW) {
  if (drawnWidth(ctx, line, weight, size) <= maxW) return line;
  let l = line.replace(/…$/, '');
  while (l.length > 1 && drawnWidth(ctx, `${l}…`, weight, size) > maxW) l = l.slice(0, -1);
  return `${l.trimEnd()}…`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

// ---------------------------------------------------------------- prompt card

function promptCard(s, L, tl) {
  const { ctx, t } = s;
  const e = ease.outCubic(clamp((t - 0.05) / 0.45));
  if (e <= 0) return;
  const { lines, size, lh, PH } = L;
  const cy = PY + PH / 2;

  pivot(ctx, W / 2, cy, { alpha: e, dy: (1 - e) * 40, scale: 0.97 + 0.03 * e }, () => {
    paper(ctx, c => roundRectPath(c, PX, PY, PW, PH, 24), { fill: '#FFFFFF', lift: 2 });

    // The AI mark: pink lucide Sparkles in a pearl disc, twinkling.
    const ax = PX + 58;
    ctx.fillStyle = C.rose;
    ctx.beginPath();
    ctx.arc(ax, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    lucideIcon(ctx, 'Sparkles', ax, cy, 36 + Math.sin(t * 4) * 2, { color: C.pink, stroke: 2.2 });

    // Typed text, revealed across the wrapped lines.
    const total = lines.reduce((n, l) => n + l.length, 0);
    const typed = clamp(Math.floor(((t - tl.typeStart) / tl.typeDur) * total), 0, total);
    const y0 = cy - ((lines.length - 1) * lh) / 2 + 2;
    let left = typed, caretX = TEXT_X, caretY = y0;
    lines.forEach((l, i) => {
      if (left <= 0) return;
      const part = l.slice(0, left);
      left -= part.length;
      text(ctx, part, TEXT_X, y0 + i * lh, { weight: 600, size, color: C.ink, align: 'left' });
      caretX = TEXT_X + drawnWidth(ctx, part, 600, size) + 4;
      caretY = y0 + i * lh;
    });
    if (typed === 0) text(ctx, 'Describe what you want…', TEXT_X, y0, { weight: 500, size, color: rgba(C.mute, 0.8), align: 'left' });

    // Pink caret: solid while typing, blinking while idle, gone once sent.
    const typing = typed > 0 && typed < total;
    if (t < tl.sendAt && (typing || Math.floor(t * 2.6) % 2 === 0)) {
      ctx.fillStyle = C.pink;
      roundRect(ctx, caretX, caretY - size * 0.56, 4, size * 1.12, 2);
    }

    // Send button: grey until the prompt is complete, then ink; it presses at
    // sendAt and shows a spinner while the result generates.
    const bx = PX + PW - 66, by = cy, bs = 72;
    const ready = typed >= total;
    const press = Math.sin(clamp((t - tl.sendAt) / 0.24) * Math.PI);
    const busy = t >= tl.sendAt + 0.12 && t < tl.resultAt;
    pivot(ctx, bx, by, { scale: 1 - 0.12 * press }, () => {
      ctx.fillStyle = ready ? C.ink : '#F1F1F5';
      roundRect(ctx, bx - bs / 2, by - bs / 2, bs, bs, bs / 2);
      if (busy) {
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(bx, by, 15, t * 7, t * 7 + Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();
      } else {
        lucideIcon(ctx, 'ArrowUp', bx, by, 34, { color: ready ? '#FFFFFF' : C.mute, stroke: 2.6 });
      }
    });
  });
}

// ---------------------------------------------------------------- result slot

// Where the result will land: a skeleton card with a slow shimmer, which
// gets a "Generating" chip once sent.
function slot(s, R, tl) {
  const { ctx, t } = s;
  const out = 1 - clamp((t - tl.resultAt) / 0.15);
  const a = ease.outCubic(clamp((t - 0.4) / 0.35)) * out;
  if (a <= 0) return;
  const g = ease.outCubic(clamp((t - tl.sendAt - 0.1) / 0.3)) * out;
  const dark = luminance(s.set.wall) < 0.1;
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;

  ctx.save();
  ctx.globalAlpha *= a * (dark ? 0.5 : 0.85);
  ctx.beginPath();
  roundRectPath(ctx, R.x, R.y, R.w, R.h, 20);
  ctx.fillStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(16,16,20,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.clip();
  // Shimmer: a soft light band sweeping across, faster while generating.
  const u = ((t * (0.5 + g * 0.6)) % 1.6) - 0.3;
  const sx = R.x + u * R.w;
  const sh = ctx.createLinearGradient(sx - 220, 0, sx + 220, 0);
  sh.addColorStop(0, 'rgba(255,255,255,0)');
  sh.addColorStop(0.5, dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,240,250,0.95)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.restore();
  if (g <= 0) return;

  const label = 'Generating';
  const tw = drawnWidth(ctx, label, 600, 38);
  const w = tw + 150, h = 84;
  pivot(ctx, cx, cy, { scale: 0.92 + 0.08 * g, alpha: g, dy: Math.sin(t * 3) * 3 }, () => {
    paper(ctx, c => roundRectPath(c, cx - w / 2, cy - h / 2, w, h, h / 2), { fill: '#FFFFFF', lift: 1.8 });
    ctx.save();
    ctx.translate(cx - w / 2 + 46, cy);
    ctx.rotate(Math.sin(t * 3) * 0.25);
    lucideIcon(ctx, 'Sparkles', 0, 0, 34, { color: C.pink, stroke: 2.2 });
    ctx.restore();
    text(ctx, label, cx - w / 2 + 78, cy + 2, { weight: 600, size: 38, color: C.ink, align: 'left' });
    for (let i = 0; i < 3; i++) {
      const hop = Math.max(0, Math.sin(t * 9 - i * 1.1)) * 6;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(cx - w / 2 + 78 + tw + 14 + i * 14, cy + 10 - hop, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ---------------------------------------------------------------- results

const SKY = '#CFE5FF', HILL_BACK = '#A9E2C6', HILL_FRONT = '#7FCDA8', SUN = '#FFC94D';

// Paper collage picture: sky, sun, drifting clouds, two torn hills and the
// product (a bottle in the accent colour) floating over a paper plinth.
function drawImage(s, b, t0) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const { x, y, w, h } = b;
  const at = (d, dur = 0.4) => s.enter(t0 + d, dur);
  const product = s.accent;
  const sun = luminance(product) > 0.45 ? '#FF8DBF' : SUN;

  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.clip();
  ctx.fillStyle = SKY;
  ctx.fillRect(x, y, w, h);

  // Sun with slowly turning paper rays.
  const se = at(0.18);
  if (se > 0) {
    const sx = x + w * 0.8, sy = y + h * 0.27, sr = h * 0.12;
    pivot(ctx, sx, sy, { scale: se, rot: ts * 0.35 }, () => {
      paper(ctx, c => {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          c.moveTo(sx + Math.cos(a - 0.12) * sr * 1.25, sy + Math.sin(a - 0.12) * sr * 1.25);
          c.lineTo(sx + Math.cos(a) * sr * 1.75, sy + Math.sin(a) * sr * 1.75);
          c.lineTo(sx + Math.cos(a + 0.12) * sr * 1.25, sy + Math.sin(a + 0.12) * sr * 1.25);
          c.closePath();
        }
      }, { fill: sun, lift: 0.3, rim: 0.3 });
      paper(ctx, c => cutCirclePath(c, sx, sy, sr, { seed: 'img-sun' }), { fill: sun, lift: 0.8, rim: 0.8 });
    });
  }

  // Clouds drift across on twos.
  [[0.06, 0.2, 1, 0.3], [0.5, 0.12, 0.75, 0.38]].forEach(([fx, fy, sc, d], i) => {
    const ce = at(d);
    if (ce <= 0) return;
    const cx = x + ((w * fx + ts * 16 * (i ? 0.7 : 1)) % (w + 160)) - 20 + (1 - ce) * (i ? 200 : -200);
    cloud(ctx, cx, y + h * fy + 30, 60 * sc, `img-cloud-${i}`);
  });

  // Hills rise from the bottom edge.
  const hb = at(0.05, 0.45), hf = at(0.12, 0.45);
  if (hb > 0) hill(ctx, x, y + h * 0.6 + (1 - hb) * h * 0.5, w, h, 26, 2.2, 0.4, HILL_BACK, 'img-hb');
  if (hf > 0) {
    const fy = y + h * 0.76 + (1 - hf) * h * 0.4;
    hill(ctx, x, fy, w, h, 18, 1.6, 2.1, HILL_FRONT, 'img-hf');
    // Paper flowers dotted along the front hill.
    [0.08, 0.16, 0.66, 0.78, 0.9].forEach((u, i) => {
      const fx = x + w * u, ffy = fy + 26 + (i % 2) * 18;
      ctx.fillStyle = i % 2 ? C.chalk : C.blush;
      ctx.beginPath();
      ctx.arc(fx, ffy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SUN;
      ctx.beginPath();
      ctx.arc(fx, ffy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Two-tier paper plinth rises from the bottom edge.
  const px = x + w * 0.42, pw = w * 0.3, ptop = y + h * 0.72;
  const pe = at(0.3, 0.4);
  if (pe > 0) {
    const top = ptop + (1 - pe) * h * 0.5;
    paper(ctx, c => roundRectPath(c, px - pw / 2, top, pw, 70, 6), { fill: C.chalk, lift: 1, rim: 0.9 });
    paper(ctx, c => roundRectPath(c, px - pw * 0.64, top + 52, pw * 1.28, h, 8), { fill: C.paperCool, lift: 1.2, rim: 0.9 });
    ctx.fillStyle = rgba(s.accent, 0.85);
    ctx.fillRect(px - pw * 0.64 + 14, top + 72, pw * 1.28 - 28, 6);
  }

  // Product drops onto the plinth, then hovers.
  const de = at(0.48, 0.45);
  if (de > 0) {
    const u = h * 0.2;
    const hover = 10 + Math.sin(ts * 2.6) * 6;
    const pb = ptop - hover - (1 - de) * h * 0.7;
    // Contact shadow on the plinth top.
    ctx.fillStyle = `rgba(40,0,30,${0.18 * de})`;
    ctx.beginPath();
    ctx.ellipse(px, ptop + 6, u * (0.55 - hover * 0.008), 6, 0, 0, Math.PI * 2);
    ctx.fill();
    bottle(ctx, px, pb, u, product);
    sparkles(ctx, { x: px, y: pb - u, t, radius: u * 1.7, count: 4, seed: 'img-sp', fill: C.chalk });
  }
  ctx.restore();

  // Inner frame edge.
  ctx.save();
  ctx.strokeStyle = 'rgba(16,16,20,0.12)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.stroke();
  ctx.restore();
}

function cloud(ctx, cx, cy, r, seed) {
  paper(ctx, c => {
    c.moveTo(cx - r * 1.6, cy + r * 0.45);
    c.arc(cx - r * 0.9, cy + r * 0.05, r * 0.55, Math.PI * 0.75, Math.PI * 1.6);
    c.arc(cx - r * 0.05, cy - r * 0.2, r * 0.75, Math.PI * 1.1, Math.PI * 1.95);
    c.arc(cx + r * 0.95, cy + r * 0.1, r * 0.55, Math.PI * 1.35, Math.PI * 0.2);
    c.lineTo(cx - r * 1.6, cy + r * 0.45);
    c.closePath();
  }, { fill: C.chalk, lift: 0.7, rim: 0.6, seed });
}

function hill(ctx, x, top, w, h, amp, waves, phase, fill, seed) {
  paper(ctx, c => {
    c.moveTo(x - 20, y0(0));
    const n = 24;
    for (let i = 1; i <= n; i++) c.lineTo(x - 20 + ((w + 40) * i) / n, y0(i / n));
    c.lineTo(x + w + 20, top + h);
    c.lineTo(x - 20, top + h);
    c.closePath();
    function y0(u) { return top - Math.sin(u * Math.PI * waves + phase) * amp - Math.sin(u * 31 + phase) * 1.5; }
  }, { fill, lift: 1, rim: 0.8, seed });
}

// A paper bottle: accent body, ink cap, chalk label with a sparkle.
function bottle(ctx, cx, bottom, u, fill) {
  const bw = u * 1.05, bh = u * 1.45;
  paper(ctx, c => roundRectPath(c, cx - u * 0.2, bottom - bh - u * 0.32, u * 0.4, u * 0.4, 6), { fill: shade(fill, -0.12), lift: 0.4, rim: 0.5 });
  paper(ctx, c => roundRectPath(c, cx - u * 0.27, bottom - bh - u * 0.6, u * 0.54, u * 0.32, 8), { fill: C.ink, lift: 0.6, rim: 0.4 });
  paper(ctx, c => roundRectPath(c, cx - bw / 2, bottom - bh, bw, bh, u * 0.24), { fill, lift: 1.4, rim: 1 });
  paper(ctx, c => roundRectPath(c, cx - bw * 0.36, bottom - bh * 0.68, bw * 0.72, bh * 0.4, 8), { fill: C.chalk, lift: 0.3, rim: 0.4 });
  icon(ctx, 'sparkle', cx, bottom - bh * 0.48, u * 0.36, fill);
  // Glint.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.36, bottom - bh * 0.84);
  ctx.lineTo(cx - bw * 0.36, bottom - bh * 0.76);
  ctx.stroke();
  ctx.restore();
}

// Wireframe of an app screen: nav bar, hero copy, an ink CTA, an image block
// and a row of feature cards, assembling piece by piece; a cursor clicks the CTA.
function drawUI(s, b, t0, build) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const { x, y, w, h } = b;
  const at = (d, dur = 0.35) => s.enter(t0 + d, dur);
  const bar = (bx, by, bw, bh, fill) => { ctx.fillStyle = fill; roundRect(ctx, bx, by, bw, bh, bh / 2); };

  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 18);
  ctx.clip();
  ctx.fillStyle = '#FAFAFC';
  ctx.fillRect(x, y, w, h);

  // Nav bar slides down.
  const ne = at(0, 0.3);
  if (ne > 0) {
    ctx.save();
    ctx.translate(0, -(1 - ne) * 70);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, 58);
    ctx.fillStyle = C.line;
    ctx.fillRect(x, y + 57, w, 1.5);
    ctx.fillStyle = C.pink;
    roundRect(ctx, x + 26, y + 17, 24, 24, 6);
    bar(x + 62, y + 23, 86, 12, C.ink);
    for (let i = 0; i < 3; i++) bar(x + w - 330 + i * 62, y + 24, 46, 10, rgba(C.mute, 0.45));
    ctx.fillStyle = C.ink;
    roundRect(ctx, x + w - 128, y + 13, 104, 32, 8);
    ctx.restore();
  }
  ctx.restore();

  const hy = y + 86, hb = y + h - 108;
  const lx = x + 32, cw = w * 0.5 - 40;
  const pieces = [
    [0.1, lx, hy, cw * 0.94, 26, C.ink],
    [0.16, lx, hy + 38, cw * 0.66, 26, C.ink],
    [0.24, lx, hy + 88, cw * 0.96, 11, rgba(C.mute, 0.55)],
    [0.28, lx, hy + 110, cw * 0.88, 11, rgba(C.mute, 0.55)],
    [0.32, lx, hy + 132, cw * 0.6, 11, rgba(C.mute, 0.55)],
  ];
  for (const [d, bx, by, bw, bh, fill] of pieces) {
    const e = at(d);
    if (e > 0) pivot(ctx, bx, by + bh / 2, { scale: e, alpha: clamp(e * 3) }, () => bar(bx, by, bw, bh, fill));
  }

  // CTA buttons; the cursor glides in and clicks the pink one.
  const k = build / 1.5;
  const click = t0 + 1.45 * k;
  const squish = Math.sin(clamp((ts - click) / 0.2) * Math.PI);
  const ce = at(0.4);
  const ctaY = Math.max(hy + 156, hb - 52), ctaW = 160, ctaH = 52;
  if (ce > 0) {
    pivot(ctx, lx + ctaW / 2, ctaY + ctaH / 2, { scale: ce * (1 - squish * 0.1) }, () => {
      paper(ctx, c => roundRectPath(c, lx, ctaY, ctaW, ctaH, 10), { fill: C.ink, lift: 1 - squish * 0.7, rim: 0.6 });
      bar(lx + 40, ctaY + 20, 80, 12, C.chalk);
    });
    const oe = at(0.46);
    if (oe > 0) pivot(ctx, lx + ctaW + 82, ctaY + ctaH / 2, { scale: oe }, () => {
      ctx.save();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      roundRectPath(ctx, lx + ctaW + 16, ctaY + 2, 132, ctaH - 4, 10);
      ctx.stroke();
      ctx.restore();
      bar(lx + ctaW + 50, ctaY + 20, 64, 12, C.ink);
    });
  }

  // Image block.
  const ie = at(0.22, 0.4);
  if (ie > 0) {
    const ix = x + w * 0.54, iw = w * 0.46 - 30, ih = hb - hy + 2;
    pivot(ctx, ix + iw / 2, hy + ih / 2, { scale: ie, rot: (1 - ie) * 0.1 }, () => {
      paper(ctx, c => roundRectPath(c, ix, hy, iw, ih, 12), { fill: C.rose, lift: 0.6, rim: 0.7 });
      lucideIcon(ctx, 'Image', ix + iw / 2, hy + ih / 2, 76, { color: C.pink, stroke: 1.8 });
    });
  }

  // Feature cards.
  const fw = (w - 64 - 32) / 3, fy = y + h - 92, fh = 72;
  for (let i = 0; i < 3; i++) {
    const e = at(0.5 + i * 0.08);
    if (e <= 0) continue;
    const fx = x + 32 + i * (fw + 16);
    pivot(ctx, fx + fw / 2, fy + fh / 2, { scale: e, alpha: clamp(e * 3), dy: (1 - e) * 30 }, () => {
      paper(ctx, c => roundRectPath(c, fx, fy, fw, fh, 12), { fill: '#FFFFFF', lift: 0.7, rim: 0.7 });
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.arc(fx + 34, fy + fh / 2, 15, 0, Math.PI * 2);
      ctx.fill();
      bar(fx + 62, fy + 22, fw * 0.5, 11, C.ink);
      bar(fx + 62, fy + 42, fw * 0.36, 9, rgba(C.mute, 0.55));
    });
  }

  // Cursor.
  const ke = clamp((ts - (t0 + 0.85 * k)) / (0.55 * k));
  if (ke > 0) {
    const k = ease.inOutCubic(ke);
    const cx = lerp(x + w * 0.92, lx + ctaW * 0.62, k) + (ke >= 1 ? Math.sin(ts * 3) * 3 : 0);
    const cy = lerp(y + h + 30, ctaY + ctaH * 0.62, k);
    if (ts >= click) {
      const r = clamp((ts - click) / 0.4);
      ctx.save();
      ctx.globalAlpha *= 1 - r;
      ctx.strokeStyle = C.pink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(lx + ctaW * 0.62, ctaY + ctaH * 0.62, 14 + r * 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = 'rgba(40,0,20,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    icon(ctx, 'cursor', cx + 12, cy + 18, 64 * (1 - squish * 0.1), C.ink);
    ctx.restore();
  }
}

// Syntax colours on the dark editor card.
const KW = '#FF6FAE', STR = '#FFC94D', FN = C.blush, ID = C.chalk, PUNC = C.muteDark;
const CODE = [
  [['// generated for you', C.mute]],
  [['import ', KW], ['{ ai } ', ID], ['from ', KW], ["'kit'", STR]],
  [],
  [['const ', KW], ['app ', ID], ['= ', PUNC], ['ai', FN], ['(prompt)', ID]],
  [['app', ID], ['.', PUNC], ['style', FN], ['(', PUNC], ["'paper'", STR], [')', PUNC]],
  [['await ', KW], ['app', ID], ['.', PUNC], ['ship', FN], ['()', PUNC]],
];

// Dark editor: tab bar, line numbers, code typing in line by line with a pink
// caret and diff bars in the gutter; a pink check pops when it's done.
function drawCode(s, b, t0, build) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const { x, y, w, h } = b;

  // Tab bar.
  ['#3A3B45', '#3A3B45', '#3A3B45'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + 16 + i * 26, y + 22, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#2A2B33';
  roundRect(ctx, x + 96, y, 170, 46, 12);
  ctx.fillStyle = C.pink;
  ctx.beginPath();
  ctx.arc(x + 120, y + 23, 7, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'app.ts', x + 138, y + 24, { weight: 700, size: 30, color: C.muteDark, align: 'left' });
  ctx.fillStyle = C.divider;
  ctx.fillRect(x - 24, y + 58, w + 48, 2);

  const size = 34, lh = Math.min(52, (h - 84) / CODE.length);
  const codeX = x + 64, top = y + 84 + lh / 2;
  const total = CODE.reduce((n, l) => n + l.reduce((m, [str]) => m + str.length, 0) + 1, 0);
  const typed = Math.floor(clamp((ts - t0) / (build * 0.87)) * total);
  let left = typed, caret = null;

  CODE.forEach((line, i) => {
    if (left <= 0) return;
    const ly = top + i * lh;
    const len = line.reduce((m, [str]) => m + str.length, 0);
    const active = left <= len + 1 && typed < total;
    if (active) {
      ctx.fillStyle = 'rgba(255,51,138,0.14)';
      ctx.fillRect(x - 24, ly - lh / 2 + 2, w + 48, lh - 4);
    }
    // Gutter: diff bar + line number.
    ctx.fillStyle = C.pink;
    ctx.fillRect(x - 6, ly - lh / 2 + 6, 6, lh - 12);
    text(ctx, String(i + 1), x + 34, ly + 2, { weight: 600, size: 30, color: C.mute, align: 'right' });
    let cx = codeX, budget = left;
    for (const [str, col] of line) {
      if (budget <= 0) break;
      const part = str.slice(0, budget);
      budget -= part.length;
      text(ctx, part, cx, ly + 2, { weight: 600, size, color: col, align: 'left' });
      cx += drawnWidth(ctx, part, 600, size);
    }
    caret = { x: cx + 4, y: ly };
    left -= len + 1;
  });

  if (caret && (typed < total || Math.floor(t * 2.6) % 2 === 0)) {
    ctx.fillStyle = C.pink;
    roundRect(ctx, caret.x, caret.y - 20, 5, 42, 2);
  }

  // Done check.
  const de = s.enter(t0 + build * 0.93, 0.35);
  if (de > 0) {
    const cx = x + w - 30, cy = y + 22;
    pivot(ctx, cx, cy, { scale: de }, () => {
      paper(ctx, c => cutCirclePath(c, cx, cy, 26, { seed: 'code-ok' }), { fill: pinkGradient(ctx, cx - 26, cy - 26, cx + 26, cy + 26), lift: 1, rim: 0.6 });
      icon(ctx, 'check', cx, cy + 1, 32, C.chalk);
    });
  }
}

// A streamed paragraph: a heading bar, then ink lines growing left to right
// behind a pink caret, one phrase picked out with a blush highlighter.
const TEXT_LINES = [1, 0.93, 0.97, 0.56, null, 0.95, 0.88, 0.7];

function drawText(s, b, t0, build) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const { x, y, w, h } = b;
  const bar = (bx, by, bw, bh, fill) => { ctx.fillStyle = fill; roundRect(ctx, bx, by, bw, bh, bh / 2); };

  const he = s.enter(t0, 0.35);
  if (he > 0) {
    pivot(ctx, x + 36, y + 36, { scale: he }, () => {
      paper(ctx, c => cutCirclePath(c, x + 36, y + 36, 30, { seed: 'txt-ai' }), { fill: pinkGradient(ctx, x + 6, y + 6, x + 66, y + 66), lift: 0.8, rim: 0.6 });
      icon(ctx, 'sparkle', x + 36, y + 36, 34, C.chalk);
    });
    pivot(ctx, x + 86, y + 36, { scale: he, alpha: clamp(he * 3) }, () => bar(x + 86, y + 22, w * 0.52, 28, C.ink));
  }

  const lw = w - 16, gap = Math.min(44, (h - 96) / TEXT_LINES.length);
  const total = TEXT_LINES.reduce((n, f) => n + (f || 0), 0);
  let left = clamp((ts - t0 - 0.15) / build) * total;
  let tip = null;
  TEXT_LINES.forEach((f, i) => {
    if (f === null || left <= 0) return;
    const ly = y + 96 + i * gap;
    const shown = Math.min(f, left);
    left -= shown;
    if (i === 1) {
      // Highlighter behind a phrase.
      const hx0 = 0.32 * lw, hx1 = Math.min(0.74 * lw, shown * lw);
      if (hx1 > hx0) {
        ctx.fillStyle = rgba(C.pink, 0.3);
        ctx.fillRect(x + hx0 - 6, ly - 11, hx1 - hx0 + 12, 36);
      }
    }
    bar(x, ly, Math.max(14, shown * lw), 14, '#4A4A58');
    tip = { x: x + shown * lw, y: ly + 7 };
  });
  if (tip && (left > 0.001 || Math.floor(t * 2.6) % 2 === 0)) {
    ctx.fillStyle = C.pink;
    roundRect(ctx, tip.x + 8, tip.y - 16, 6, 32, 3);
  }
}

const DRAW = { image: drawImage, ui: drawUI, code: drawCode, text: drawText };

// The real output: cover-fitted into the card's inner box (which was sized to
// its shape), revealed top-down behind a soft pink scan line the way an image
// model "develops" a result, then slowly pushed in. Video plays from landing.
function drawMediaResult(s, img, b, at, video) {
  const { ctx, t } = s;
  const p = ease.inOutCubic(clamp((t - at) / 0.7));
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(b.x, b.y, b.w, b.h);
  if (p <= 0) return;
  const ar = img.width / img.height, br = b.w / b.h;
  const revealH = b.h * p;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, revealH);
  ctx.clip();
  if (ar / br > 1.25 || br / ar > 1.25) drawContain(ctx, img, b.x, b.y, b.w, b.h);
  else drawCover(ctx, img, b.x, b.y, b.w, b.h, { zoom: 1 + 0.04 * ease.inOutQuad(clamp((t - at) / Math.max(1, s.dur - at))) });
  ctx.restore();
  if (p < 1) {
    const y = b.y + revealH;
    const g = ctx.createLinearGradient(0, y - 60, 0, y);
    g.addColorStop(0, 'rgba(255,43,136,0)');
    g.addColorStop(1, 'rgba(255,43,136,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x, y - 60, b.w, 60);
    ctx.fillStyle = pinkGradient(ctx, b.x, y, b.x + b.w, y);
    ctx.fillRect(b.x, y - 2, b.w, 3);
  }
  // A small play badge so a video result reads as footage.
  if (video && p >= 1) {
    const e = ease.outCubic(clamp((t - at - 0.7) / 0.3));
    ctx.save();
    ctx.globalAlpha *= e;
    ctx.fillStyle = rgba(C.ink, 0.72);
    ctx.beginPath();
    ctx.arc(b.x + 40, b.y + 40, 24, 0, Math.PI * 2);
    ctx.fill();
    lucideIcon(ctx, 'Play', b.x + 42, b.y + 40, 22, { color: '#FFFFFF', fill: '#FFFFFF', stroke: 2 });
    ctx.restore();
  }
}

function resultCard(s, kind, R, tl, media) {
  const { ctx, t } = s;
  const e = ease.outCubic(clamp((t - tl.resultAt) / 0.45));
  if (e <= 0) return;
  const dark = !media && kind === 'code';
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;

  // Brand glow blooms behind the card as it lands, then settles.
  const bloom = 0.14 + 0.16 * Math.exp(-3 * Math.max(0, t - tl.resultAt - 0.3));
  const gr = Math.max(R.w, R.h) * 0.8;
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, gr);
  glow.addColorStop(0, `rgba(255,43,136,${bloom * e})`);
  glow.addColorStop(1, 'rgba(255,43,136,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);

  pivot(ctx, cx, cy, { scale: 0.94 + 0.06 * e, alpha: e, dy: (1 - e) * 40 }, () => {
    paper(ctx, c => roundRectPath(c, R.x, R.y, R.w, R.h, 22), { fill: dark ? C.panel : '#FFFFFF', lift: 2.6 });
    const b = { x: R.x + 16, y: R.y + 16, w: R.w - 32, h: R.h - 32 };
    if (media) {
      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, b.x, b.y, b.w, b.h, 12);
      ctx.clip();
      drawMediaResult(s, media.img, b, tl.resultAt + 0.1, media.video);
      ctx.restore();
      return;
    }
    // Drawn stand-in, built over ~1.5s (faster when the beat is short).
    const build = clamp(s.dur - tl.resultAt - 0.6, 0.6, 1.5);
    const inner = { x: R.x + 24, y: R.y + 24, w: R.w - 48, h: R.h - 48 };
    DRAW[kind](s, inner, tl.resultAt + 0.18, build);
  });
}

// Caption pill overlapping the result card's bottom edge: ink, with the pink
// sparkle, like a toast.
function captionPill(s, R, tl, str) {
  const { ctx, t } = s;
  const e = ease.outCubic(clamp((t - tl.resultAt - 0.6) / 0.35));
  if (e <= 0) return;
  const maxText = Math.min(620, R.w + 120) - 104;
  const { size, lines } = fitWrapped(ctx, str, 'd600', maxText, 2, 38, 34);
  const lh = size * 1.12;
  const tw = Math.max(...lines.map(l => drawnWidth(ctx, l, 'd600', size)));
  const w = tw + 104, h = Math.max(76, lines.length * lh + 34);
  const cx = clamp(R.x + R.w / 2, 90 + w / 2, 990 - w / 2), cy = R.y + R.h;
  const dark = luminance(s.set.wall) < 0.1;
  pivot(ctx, cx, cy, { alpha: e, dy: (1 - e) * 18, scale: 0.96 + 0.04 * e }, () => {
    paper(ctx, c => roundRectPath(c, cx - w / 2, cy - h / 2, w, h, lines.length > 1 ? 26 : h / 2), { fill: dark ? '#FFFFFF' : C.ink, lift: 1.8 });
    lucideIcon(ctx, 'Sparkles', cx - w / 2 + 44, cy, 30, { color: C.pink, stroke: 2.2 });
    lines.forEach((l, i) => text(ctx, l, cx - w / 2 + 74, cy + 2 + (i - (lines.length - 1) / 2) * lh, {
      weight: 'd600', size, color: dark ? C.ink : '#FFFFFF', align: 'left',
    }));
  });
}

// ---------------------------------------------------------------- Kit's desk

// A white block with a keyboard on top, drawn in front of Kit so it reads as
// Kit typing at a desk. A key lights up pink on every step while typing.
function desk(s, tl) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const top = BAND.floorY + 14, w = 250, h = 74, x = KX - w / 2;
  paper(ctx, c => roundRectPath(c, x, top, w, h, 12), { fill: '#FFFFFF', lift: 1.2 });

  // Keyboard: a slab in slight perspective.
  const kb = top - 22, kf = top + 6, bw = 100, fw = 114;
  paper(ctx, c => {
    c.moveTo(KX - bw, kb);
    c.lineTo(KX + bw, kb);
    c.lineTo(KX + fw, kf);
    c.lineTo(KX - fw, kf);
    c.closePath();
  }, { fill: '#F5F5F5', lift: 0.6 });
  const typing = ts >= tl.typeStart && ts < tl.typeStart + tl.typeDur;
  const hot = typing ? Math.floor(rng(`key-${Math.round(ts * 15)}`)() * 16) : -1;
  for (let row = 0; row < 2; row++) {
    const u = 0.24 + row * 0.42;
    const ky = lerp(kb, kf, u) - 2, hw = lerp(bw, fw, u) - 12;
    for (let k = 0; k < 8; k++) {
      const kw = (hw * 2) / 8;
      ctx.fillStyle = row * 8 + k === hot ? C.pink : C.line;
      roundRect(ctx, KX - hw + k * kw + 2, ky, kw - 5, 8, 2);
    }
  }
}

function kit(s, R, tl) {
  const { t } = s;
  const m = s.beat.mascot || {};
  let pose = 'type', face = 'focus', look = 0.1;
  if (t >= tl.resultAt + 0.1) {
    pose = m.pose && m.pose !== 'type' ? m.pose : 'cheer';
    face = m.face && m.face !== 'focus' ? m.face : 'happy';
    look = 0.5;
  } else if (t >= tl.sendAt) {
    pose = 'think';
    face = 'wow';
    look = 0.6;
  }
  // Pointing aims up and right at the middle of the result card.
  const sx = KX + 99 * KS, sy = KY - 128 * KS;
  const pointAngle = Math.max(-1.0, Math.atan2(R.y + R.h * 0.55 - sy, R.x + R.w * 0.45 - sx));
  s.kit({ x: KX, y: KY, s: KS, pose, face, look, pointAngle, flip: false });
}

// ---------------------------------------------------------------- scene

export default {
  type: 'prompt',
  describe: 'Type a prompt, get a result. A clean prompt box types the prompt, the send button presses, then the result lands below it — the REAL output from the sources when `media` is set (image or video), else a drawn picture, app wireframe, code or paragraph. Kit types at a desk and cheers.',
  props: {
    prompt: 'string ≤ 80 chars — what gets typed, e.g. "A pink sneaker on a marble plinth, golden hour"',
    result: "'image' | 'ui' | 'code' | 'text' — what comes back (the drawn fallback when there is no media)",
    media: 'optional media id of the real result (generated image, edit, video clip) — use it whenever the sources show the output',
    caption: 'string ≤ 30 chars (optional) — pill on the result, e.g. "Made in 9 seconds"',
  },
  draw(s) {
    const { ctx, props } = s;
    const prompt = String(props.prompt || s.episode.subject?.name || 'Make something great').trim();
    const kind = KINDS.includes(props.result) ? props.result : 'image';
    const caption = props.caption ? String(props.caption).trim() : '';
    const mediaId = Array.isArray(props.media) ? props.media[0] : props.media;
    const item = s.media(mediaId);

    // Layout: the prompt card grows with its text; the result card fills the
    // space down to Kit's head — shaped like the real media when there is one.
    const fit = promptLines(ctx, prompt);
    const lh = fit.size * 1.24;
    const PH = Math.round(Math.max(140, fit.lines.length * lh + 76));
    const ry = PY + PH + 52;
    const maxH = MEDIA_MAX.bottom - ry - (caption ? 30 : 0);
    let R;
    if (item) {
      // Two ways to fit the real output: centred above Kit's head, or (for
      // square and tall media) shifted right of Kit so it can run deeper.
      // Whichever shows it bigger wins.
      const ar = item.width / item.height;
      const fitIn = (maxW, maxHH) => {
        let w = maxW, h = (w - 32) / ar + 32;
        if (h > maxHH) { h = maxHH; w = Math.max(380, (h - 32) * ar + 32); }
        return { w, h };
      };
      const a = fitIn(MEDIA_MAX.w, maxH);
      const b = fitIn(MEDIA_MAX.right - MEDIA_MAX.besideKit, MEDIA_MAX.deep - ry - (caption ? 30 : 0));
      R = b.w * b.h > a.w * a.h * 1.15
        ? { x: Math.max(MEDIA_MAX.besideKit, (W - b.w) / 2), y: ry, ...b }
        : { x: (W - a.w) / 2, y: ry, ...a };
    } else {
      R = { x: (W - RW) / 2, y: ry, w: RW, h: clamp(maxH, 380, 500) };
    }
    const tl = timeline(s, fit.lines.join('').length);
    const media = item ? { img: s.mediaFrame(mediaId, tl.resultAt), video: item.kind === 'video' } : null;

    promptCard(s, { ...fit, lh, PH }, tl);
    slot(s, R, tl);
    kit(s, R, tl);
    desk(s, tl);
    resultCard(s, kind, R, tl, media);
    if (caption) captionPill(s, R, tl, caption);
  },
};
