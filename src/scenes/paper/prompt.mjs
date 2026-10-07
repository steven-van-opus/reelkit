// Prompt beat: a paper chat box types the prompt in on twos behind a pink
// caret, the send button presses, a "Generating" chip spins over a dashed
// placeholder, then the result card pops in below it — a paper collage
// picture, an app wireframe, a code editor or a streamed paragraph. Kit types
// at a little kraft desk and cheers when the result lands.
//
// With props.media the result is the REAL output instead: a photo print
// shaped like the media, slapped up and taped down, developing like instant
// film (a video plays from the moment it lands). The drawn collage stays as
// the fallback when there is no media.
import { W, C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, cutCirclePath, tornRectPath, fitWrapped, text, measure, tape, pinkGradient } from '../../paper.mjs';
import { icon, sparkle, sparkles, confetti } from '../../fx.mjs';
import { clamp, lerp, ease, onTwos, boil, rng, rgba, shade, luminance } from '../../util.mjs';
import { photoPrint, printTape, fitPrint } from '../media.mjs';

const KINDS = ['image', 'ui', 'code', 'text'];

const PX = 80, PW = W - 160, PY = 350;            // prompt card
const TEXT_X = PX + 136, TEXT_W = PW - 136 - 128; // typed text column
const RW = 740;                                   // result card width
// Room for a real-media print: centred above Kit's head, or beside him
// running deeper (tilt slack already taken off).
const PRINT = { w: 840, bottom: 1130, besideKit: 380, right: 1000, deep: 1290, slack: 40 };
const KX = 215, KS = 0.86, KY = BAND.floorY + 50; // Kit at the desk

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

// When things happen. Typing starts once the card has landed; the result
// lands a little before the middle of the line so it has time on screen.
function timeline(s, chars) {
  const vs = s.words.length ? s.words[0].start : s.voStart;
  const ve = s.words.length ? s.words[s.words.length - 1].end : s.voEnd;
  const typeStart = 0.35;
  const target = clamp(lerp(vs, ve, 0.45), 1.4, Math.max(1.4, s.dur - 1.5));
  const typeDur = clamp(chars * 0.045, 0.45, Math.max(0.45, target - 0.75 - typeStart));
  const sendAt = typeStart + typeDur + 0.12;
  const resultAt = Math.max(sendAt + 0.6, target);
  return { typeStart, typeDur, sendAt, resultAt };
}

// Wrap the prompt into ≤ 3 lines; an over-long prompt ends in an ellipsis.
function promptLines(ctx, str) {
  const fit = fitWrapped(ctx, str, 700, TEXT_W, 3, 46, 34);
  const words = str.split(/\s+/).filter(Boolean).length;
  const shown = fit.lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (shown < words && fit.lines.length) {
    const last = fit.lines.length - 1;
    let l = fit.lines[last];
    while (l.includes(' ') && measure(ctx, `${l}…`, 700, fit.size) > TEXT_W) l = l.replace(/\s*\S+$/, '');
    fit.lines[last] = `${l}…`;
  }
  return fit;
}

// ---------------------------------------------------------------- prompt card

function promptCard(s, L, tl) {
  const { ctx, t } = s;
  const e = s.enter(0.05, 0.45);
  if (e <= 0) return;
  const ts = onTwos(t);
  const { lines, size, lh, PH } = L;
  const cy = PY + PH / 2;
  const b = boil('prompt-card', t, 0.7);

  pivot(ctx, W / 2, cy, { scale: 0.8 + 0.2 * e, rot: -0.008 + b.rot - (1 - e) * 0.06, alpha: clamp(e * 2.5), dx: b.dx, dy: b.dy + (1 - e) * 50 }, () => {
    paper(ctx, c => roundRectPath(c, PX, PY, PW, PH, 46), { fill: C.chalk, lift: 2.2, rim: 1 });

    // AI chip on the left: pink tile with a twinkling sparkle.
    const ax = PX + 34, ay = cy - 38;
    paper(ctx, c => roundRectPath(c, ax, ay, 76, 76, 22), { fill: pinkGradient(ctx, ax, ay, ax + 76, ay + 76), lift: 0.5, rim: 0.7 });
    icon(ctx, 'sparkle', ax + 38, ay + 38, 42 + Math.sin(ts * 5) * 4, C.chalk);

    // Typed text, revealed on twos across the wrapped lines.
    const total = lines.reduce((n, l) => n + l.length, 0);
    const typed = clamp(Math.floor(((ts - tl.typeStart) / tl.typeDur) * total), 0, total);
    const y0 = cy - ((lines.length - 1) * lh) / 2 + 2;
    let left = typed, caretX = TEXT_X, caretY = y0;
    lines.forEach((l, i) => {
      if (left <= 0) return;
      const part = l.slice(0, left);
      left -= part.length;
      text(ctx, part, TEXT_X, y0 + i * lh, { weight: 700, size, color: C.ink, align: 'left' });
      caretX = TEXT_X + measure(ctx, part, 700, size) + 5;
      caretY = y0 + i * lh;
    });
    if (typed === 0) text(ctx, 'Describe what you want…', TEXT_X + 8, y0, { weight: 500, size, color: C.mute, align: 'left' });

    // Pink caret: solid while typing, blinking while idle, gone once sent.
    const typing = typed > 0 && typed < total;
    if (t < tl.sendAt && (typing || Math.floor(t * 2.6) % 2 === 0)) {
      ctx.fillStyle = C.pink;
      roundRect(ctx, caretX, caretY - size * 0.56, 6, size * 1.12, 3);
    }

    // Send button: grey until the prompt is complete, then pink; it presses
    // at sendAt and shows a spinner while the result generates.
    const bx = PX + PW - 70, by = cy;
    const ready = typed >= total;
    const press = Math.sin(clamp((ts - tl.sendAt) / 0.24) * Math.PI);
    const busy = ts >= tl.sendAt + 0.12 && ts < tl.resultAt;
    pivot(ctx, bx, by, { scale: 1 - 0.18 * press + (ready && ts < tl.sendAt ? Math.sin(ts * 9) * 0.03 : 0) }, () => {
      paper(ctx, c => cutCirclePath(c, bx, by, 46, { seed: 'send' }), {
        fill: ready ? pinkGradient(ctx, bx - 46, by - 46, bx + 46, by + 46) : C.line,
        lift: ready ? 1.4 - press : 0.4,
        rim: 0.7,
      });
      if (busy) {
        ctx.save();
        ctx.strokeStyle = C.chalk;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(bx, by, 17, ts * 7, ts * 7 + Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-Math.PI / 2);
        icon(ctx, 'arrow', 0, 0, 50, ready ? C.chalk : C.mute);
        ctx.restore();
      }
    });

    tape(ctx, PX + 26, PY + 10, 104, 34, -0.6, { seed: 'pr-ta', alpha: 0.78 });
    tape(ctx, PX + PW - 26, PY + 10, 104, 34, 0.6, { seed: 'pr-tb', alpha: 0.78 });
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

// ---------------------------------------------------------------- generating

function generating(s, R, tl) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const a = clamp((ts - tl.sendAt - 0.1) / 0.2) * (1 - clamp((ts - tl.resultAt) / 0.12));
  if (a <= 0) return;
  const dark = s.set.ink === C.chalk;

  // Marching dashed outline where the result will land.
  ctx.save();
  ctx.globalAlpha *= a * 0.5;
  ctx.setLineDash([24, 18]);
  ctx.lineDashOffset = -ts * 70;
  ctx.strokeStyle = s.set.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  roundRectPath(ctx, R.x, R.y, R.w, R.h, 30);
  ctx.stroke();
  ctx.restore();

  const label = 'Generating';
  const tw = measure(ctx, label, 800, 42);
  const w = tw + 176, h = 96;
  const cx = W / 2, cy = R.y + R.h / 2;
  const fill = dark ? C.chalk : C.ink, ink = dark ? C.ink : C.chalk;
  pivot(ctx, cx, cy, { scale: 0.7 + 0.3 * ease.outBack(a, 2), alpha: a, dy: Math.sin(ts * 4) * 4 }, () => {
    paper(ctx, c => roundRectPath(c, cx - w / 2, cy - h / 2, w, h, h / 2), { fill, lift: 1.8, rim: 0.5 });
    ctx.save();
    ctx.translate(cx - w / 2 + 54, cy);
    ctx.rotate(ts * 4);
    sparkle(ctx, 0, 0, 24, { fill: C.pink, lift: 0 });
    ctx.restore();
    text(ctx, label, cx - w / 2 + 94, cy + 2, { weight: 800, size: 42, color: ink, align: 'left' });
    for (let i = 0; i < 3; i++) {
      const hop = Math.max(0, Math.sin(ts * 10 - i * 1.1)) * 9;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(cx - w / 2 + 94 + tw + 16 + i * 17, cy + 12 - hop, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // A couple of sparkles twinkle around the chip while it thinks.
  sparkles(ctx, { x: cx, y: cy, t, radius: 230, count: 4, seed: 'gen-sp', fill: dark ? C.blush : C.chalk });
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
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        paper(ctx, c => {
          c.moveTo(sx + Math.cos(a - 0.12) * sr * 1.25, sy + Math.sin(a - 0.12) * sr * 1.25);
          c.lineTo(sx + Math.cos(a) * sr * 1.75, sy + Math.sin(a) * sr * 1.75);
          c.lineTo(sx + Math.cos(a + 0.12) * sr * 1.25, sy + Math.sin(a + 0.12) * sr * 1.25);
          c.closePath();
        }, { fill: sun, lift: 0.3, rim: 0.3 });
      }
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
  if (hf > 0) hill(ctx, x, y + h * 0.76 + (1 - hf) * h * 0.4, w, h, 18, 1.6, 2.1, HILL_FRONT, 'img-hf');

  // Plinth.
  const px = x + w * 0.4, pw = w * 0.3, ptop = y + h * 0.7;
  const pe = at(0.3, 0.4);
  if (pe > 0) {
    const dy = (1 - pe) * h * 0.5;
    paper(ctx, c => roundRectPath(c, px - pw / 2, ptop + dy, pw, h, 6), { fill: C.chalk, lift: 1.2, rim: 0.9 });
    ctx.fillStyle = rgba(shade(C.paperCool, -0.1), 0.9);
    ctx.fillRect(px + pw / 2 - 24, ptop + dy + 4, 18, h);
    paper(ctx, c => c.ellipse(px, ptop + dy, pw / 2, 14, 0, 0, Math.PI * 2), { fill: C.paperCool, lift: 0.3, rim: 0.6 });
  }

  // Product drops onto the plinth, then hovers.
  const de = at(0.48, 0.45);
  if (de > 0) {
    const u = h * 0.15;
    const hover = 10 + Math.sin(ts * 2.6) * 6;
    const pb = ptop - hover - (1 - de) * h * 0.7;
    // Contact shadow on the plinth top.
    ctx.fillStyle = `rgba(40,0,30,${0.18 * de})`;
    ctx.beginPath();
    ctx.ellipse(px, ptop, u * (0.5 - hover * 0.008), 7, 0, 0, Math.PI * 2);
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

// Paper wireframe of an app screen: nav bar, hero copy, CTA, image block and
// a row of feature cards, assembling piece by piece; a cursor clicks the CTA.
function drawUI(s, b, t0) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const { x, y, w, h } = b;
  const at = (d, dur = 0.35) => s.enter(t0 + d, dur);
  const bar = (bx, by, bw, bh, fill) => { ctx.fillStyle = fill; roundRect(ctx, bx, by, bw, bh, bh / 2); };

  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 18);
  ctx.clip();
  ctx.fillStyle = '#F2EFF5';
  ctx.fillRect(x, y, w, h);

  // Nav bar slides down.
  const ne = at(0, 0.3);
  if (ne > 0) {
    ctx.save();
    ctx.translate(0, -(1 - ne) * 70);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x, y, w, 58);
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.arc(x + 38, y + 29, 13, 0, Math.PI * 2);
    ctx.fill();
    bar(x + 62, y + 23, 86, 12, C.chalk);
    for (let i = 0; i < 3; i++) bar(x + w - 330 + i * 62, y + 24, 46, 10, C.muteDark);
    ctx.fillStyle = pinkGradient(ctx, x + w - 128, y + 13, x + w - 24, y + 45);
    roundRect(ctx, x + w - 128, y + 13, 104, 32, 16);
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
  const click = t0 + 1.45;
  const squish = Math.sin(clamp((ts - click) / 0.2) * Math.PI);
  const ce = at(0.4);
  const ctaY = Math.max(hy + 156, hb - 52), ctaW = 160, ctaH = 52;
  if (ce > 0) {
    pivot(ctx, lx + ctaW / 2, ctaY + ctaH / 2, { scale: ce * (1 - squish * 0.1) }, () => {
      paper(ctx, c => roundRectPath(c, lx, ctaY, ctaW, ctaH, ctaH / 2), { fill: pinkGradient(ctx, lx, ctaY, lx + ctaW, ctaY + ctaH), lift: 1 - squish * 0.7, rim: 0.6 });
      bar(lx + 40, ctaY + 20, 80, 12, C.chalk);
    });
    const oe = at(0.46);
    if (oe > 0) pivot(ctx, lx + ctaW + 82, ctaY + ctaH / 2, { scale: oe }, () => {
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      roundRectPath(ctx, lx + ctaW + 16, ctaY + 2, 132, ctaH - 4, (ctaH - 4) / 2);
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
      paper(ctx, c => roundRectPath(c, ix, hy, iw, ih, 16), { fill: C.blush, lift: 1, rim: 0.7 });
      icon(ctx, 'image', ix + iw / 2, hy + ih / 2, 84, C.pink);
    });
  }

  // Feature cards.
  const fw = (w - 64 - 32) / 3, fy = y + h - 92, fh = 72;
  for (let i = 0; i < 3; i++) {
    const e = at(0.5 + i * 0.08);
    if (e <= 0) continue;
    const fx = x + 32 + i * (fw + 16);
    pivot(ctx, fx + fw / 2, fy + fh / 2, { scale: e, alpha: clamp(e * 3), dy: (1 - e) * 30 }, () => {
      paper(ctx, c => roundRectPath(c, fx, fy, fw, fh, 14), { fill: C.chalk, lift: 0.9, rim: 0.7 });
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.arc(fx + 34, fy + fh / 2, 15, 0, Math.PI * 2);
      ctx.fill();
      bar(fx + 62, fy + 22, fw * 0.5, 11, C.ink);
      bar(fx + 62, fy + 42, fw * 0.36, 9, rgba(C.mute, 0.55));
    });
  }

  // Cursor.
  const ke = clamp((ts - (t0 + 0.85)) / 0.55);
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
function drawCode(s, b, t0) {
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
  const typed = Math.floor(clamp((ts - t0) / 1.3) * total);
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
      cx += measure(ctx, part, 600, size);
    }
    caret = { x: cx + 4, y: ly };
    left -= len + 1;
  });

  if (caret && (typed < total || Math.floor(t * 2.6) % 2 === 0)) {
    ctx.fillStyle = C.pink;
    roundRect(ctx, caret.x, caret.y - 20, 5, 42, 2);
  }

  // Done check.
  const de = s.enter(t0 + 1.4, 0.35);
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

function drawText(s, b, t0) {
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
  let left = clamp((ts - t0 - 0.2) / 1.5) * total;
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
        ctx.fillStyle = rgba(C.blush, 1);
        ctx.fillRect(x + hx0 - 6, ly - 8, hx1 - hx0 + 12, 30);
      }
    }
    bar(x, ly, Math.max(14, shown * lw), 14, '#43434F');
    tip = { x: x + shown * lw, y: ly + 7 };
  });
  if (tip && (left > 0.001 || Math.floor(t * 2.6) % 2 === 0)) {
    ctx.fillStyle = C.pink;
    roundRect(ctx, tip.x + 8, tip.y - 16, 6, 32, 3);
  }
}

const DRAW = { image: drawImage, ui: drawUI, code: drawCode, text: drawText };

// The real output as a photo print: it pops in like the drawn card, then
// develops from blank instant film while the tape goes on.
function mediaPrint(s, R, tl, media) {
  const { ctx, t } = s;
  const e = s.enter(tl.resultAt, 0.5);
  if (e <= 0) return;
  const b = boil('result-print', t, 0.8);
  const develop = clamp((onTwos(t) - tl.resultAt - 0.1) / 0.9);
  pivot(ctx, R.x + R.w / 2, R.y + R.h / 2, { scale: 0.55 + 0.45 * e, rot: R.lean + b.rot + (1 - e) * 0.12, alpha: clamp(e * 3), dx: b.dx, dy: b.dy }, () => {
    photoPrint(ctx, R.x, R.y, R.w, R.h, {
      img: media.img, border: R.border, bottom: R.bottom, lift: 2.2, video: media.video, develop,
      zoom: 1 + 0.04 * ease.inOutQuad(clamp((t - tl.resultAt) / Math.max(1, s.dur - tl.resultAt))),
    });
    printTape(ctx, R.x, R.y, R.w, R.h, { seed: `res-print-${media.id}`, k: s.enter(tl.resultAt + 0.3, 0.25), style: 'corners' });
  });
  poof(ctx, R, t, tl.resultAt);
  confetti(ctx, { x: R.x + R.w / 2, y: R.y + 30, t, at: tl.resultAt + 0.04, seed: 'prompt-conf', count: 20, spread: 0.9 });
}

function resultCard(s, kind, R, tl, media = null) {
  if (media) return mediaPrint(s, R, tl, media);
  const { ctx, t } = s;
  const e = s.enter(tl.resultAt, 0.5);
  if (e <= 0) return;
  const b = boil('result-card', t, 0.8);
  const dark = kind === 'code';
  pivot(ctx, R.x + R.w / 2, R.y + R.h / 2, { scale: 0.55 + 0.45 * e, rot: 0.01 + b.rot + (1 - e) * 0.12, alpha: clamp(e * 3), dx: b.dx, dy: b.dy }, () => {
    paper(ctx, c => roundRectPath(c, R.x, R.y, R.w, R.h, 30), { fill: dark ? C.panel : C.chalk, lift: 2.6, rim: dark ? 0.5 : 1 });
    DRAW[kind](s, { x: R.x + 24, y: R.y + 24, w: R.w - 48, h: R.h - 48 }, tl.resultAt + 0.18);
    tape(ctx, R.x + 30, R.y + 6, 110, 36, -0.55, { seed: 'res-ta', alpha: 0.8 });
    tape(ctx, R.x + R.w - 30, R.y + 6, 110, 36, 0.55, { seed: 'res-tb', alpha: 0.8 });
  });
  poof(ctx, R, t, tl.resultAt);
  confetti(ctx, { x: R.x + R.w / 2, y: R.y + 30, t, at: tl.resultAt + 0.04, seed: 'prompt-conf', count: 20, spread: 0.9 });
}

// Paper sparkles fly out from the card edges as it lands.
function poof(ctx, R, t, at) {
  const dt = onTwos(t) - at;
  if (dt < 0 || dt > 0.6) return;
  const p = ease.outCubic(dt / 0.6);
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  const r = rng('poof');
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + r() * 0.4;
    const d = lerp(0.5, 0.68 + r() * 0.12, p);
    sparkle(ctx, cx + Math.cos(a) * R.w * d, cy + Math.sin(a) * R.h * d, (18 + r() * 14) * (1 - p), { fill: i % 3 ? C.chalk : C.pink, lift: 0.3 });
  }
}

// Caption sticker slapped across the result card's bottom-right corner.
function captionSticker(s, R, tl, str) {
  const { ctx } = s;
  const e = s.enter(tl.resultAt + 0.55, 0.35);
  if (e <= 0) return;
  const { size, lines } = fitWrapped(ctx, str, 900, 470, 2, 44, 34);
  const tw = Math.max(...lines.map(l => measure(ctx, l, 900, size)));
  const w = tw + 64, h = lines.length * size * 1.12 + 38;
  // Kept clear of Kit (a narrow print sits right of him) and inside the frame.
  // On a real-media print it sticks to the bottom border and hangs below,
  // leaving the picture uncovered.
  const cx = clamp(R.x + R.w - w / 2 + 16, 370 + w / 2, 1004 - w / 2);
  const cy = R.bottom ? R.y + R.h - R.bottom * 0.5 + h / 2 : R.y + R.h + 4;
  pivot(ctx, cx, cy, { scale: 1 + (1 - e) * 0.5, rot: -0.045 + (1 - e) * 0.1, alpha: clamp(e * 3) }, () => {
    paper(ctx, c => tornRectPath(c, cx - w / 2, cy - h / 2, w, h, { seed: `cap-${str}`, rough: 3.5, step: 11 }), {
      fill: pinkGradient(ctx, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), lift: 1.8, rim: 0.6,
    });
    lines.forEach((l, i) => text(ctx, l, cx, cy + 3 + (i - (lines.length - 1) / 2) * size * 1.12, { weight: 900, size, color: C.chalk }));
    tape(ctx, cx - w / 2 + 8, cy - h / 2 + 4, 76, 30, -0.7, { seed: 'cap-tape', alpha: 0.75 });
  });
}

// ---------------------------------------------------------------- Kit's desk

// A kraft box with a paper keyboard on top, drawn in front of Kit so it reads
// as Kit typing at a desk. A key lights up pink on every stop-motion step
// while the prompt is typing.
function desk(s, tl) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const top = BAND.floorY + 14, w = 250, h = 74, x = KX - w / 2;
  paper(ctx, c => roundRectPath(c, x, top, w, h, 8), { fill: C.kraft, lift: 1.4, rim: 0.9 });
  ctx.fillStyle = rgba(shade(C.kraft, -0.3), 0.45);
  ctx.fillRect(x + 12, top + 18, w - 24, 4);
  tape(ctx, KX, top + 46, 66, 28, -0.04, { seed: 'desk-tape', color: C.blush, alpha: 0.9 });

  // Keyboard: a slab in slight perspective.
  const kb = top - 22, kf = top + 6, bw = 100, fw = 114;
  paper(ctx, c => {
    c.moveTo(KX - bw, kb);
    c.lineTo(KX + bw, kb);
    c.lineTo(KX + fw, kf);
    c.lineTo(KX - fw, kf);
    c.closePath();
  }, { fill: C.chalk, lift: 0.8, rim: 0.7 });
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
    pose = m.pose || 'cheer';
    face = m.face || 'happy';
    look = 0.5;
  } else if (t >= tl.sendAt) {
    pose = 'think';
    face = 'wow';
    look = 0.6;
  }
  // Pointing aims up and right at the middle of the result card.
  const sx = KX + 99 * KS, sy = KY - 128 * KS;
  const pointAngle = Math.atan2(R.y + R.h * 0.55 - sy, R.x + R.w * 0.45 - sx);
  s.kit({ x: KX, y: KY, s: KS, pose, face, look, pointAngle, flip: false });
}

// Print rect for real media: centred above Kit's head, or (square and tall
// media) shifted right of Kit so it can run deeper — whichever shows it
// bigger. With a caption the print gets an instant-photo bottom border for the
// sticker to sit on. Tilt from the media id.
function printRect(item, ry, hasCaption, id) {
  const ar = clamp(item.width / item.height, 0.45, 2.4);
  const fitIn = (maxW, maxH) => {
    const p = fitPrint(ar, maxW, maxH);
    if (!hasCaption) return p;
    const bottom = Math.round(p.border * 2.2);
    let w = maxW, h = (w - 2 * p.border) / ar + p.border + bottom;
    if (h > maxH) { h = maxH; w = (h - p.border - bottom) * ar + 2 * p.border; }
    return { w: Math.round(w), h: Math.round(h), border: p.border, bottom };
  };
  // The caption sticker hangs below the print: right of Kit when centred,
  // but it needs room above the floor when the print runs deep.
  const a = fitIn(PRINT.w, PRINT.bottom - ry - PRINT.slack);
  const b = fitIn(PRINT.right - PRINT.besideKit - PRINT.slack, PRINT.deep - ry - PRINT.slack - (hasCaption ? 100 : 0));
  const side = b.w * b.h > a.w * a.h * 1.15;
  const p = side ? b : a;
  // Beside Kit a narrow print leans toward the middle of the space right of him.
  const x = side ? Math.max(PRINT.besideKit + PRINT.slack / 2, (W / 2 + (PRINT.besideKit + PRINT.right) / 2) / 2 - p.w / 2) : (W - p.w) / 2;
  const r = rng(`prompt-print-${id}`);
  return { x: Math.round(x), y: ry + PRINT.slack / 2, ...p, lean: (r() < 0.5 ? -1 : 1) * (0.022 + r() * 0.018) };
}

// ---------------------------------------------------------------- scene

export default {
  type: 'prompt',
  describe: 'Type a prompt, get a result. A paper chat box types the prompt, the send button presses, then the result pops in below it — the REAL output as a taped photo print when `media` is set (image or video), else a collage picture, an app wireframe, code or a written paragraph. Kit types at a desk and cheers.',
  props: {
    prompt: 'string ≤ 80 chars — what gets typed, e.g. "A pink sneaker on a marble plinth, golden hour"',
    result: "'image' | 'ui' | 'code' | 'text' — what comes back (the drawn fallback when there is no media)",
    media: 'optional media id of the real result (generated image, edit, video clip) — use it whenever the sources show the output',
    caption: 'string ≤ 30 chars (optional) — sticker on the result, e.g. "Made in 9 seconds"',
  },
  draw(s) {
    const { ctx, props } = s;
    const prompt = String(props.prompt || s.episode.subject?.name || 'Make something great').trim();
    const kind = KINDS.includes(props.result) ? props.result : 'image';
    const caption = props.caption ? String(props.caption).trim() : '';
    const mediaId = Array.isArray(props.media) ? props.media[0] : props.media;
    const item = s.media(mediaId);

    // Layout: the prompt card grows with its text; the result card fills the
    // space down to Kit's head — a real-media print takes the media's shape.
    const fit = promptLines(ctx, prompt);
    const lh = fit.size * 1.24;
    const PH = Math.round(Math.max(150, fit.lines.length * lh + 82));
    const ry = PY + PH + 62;
    const R = item ? printRect(item, ry, !!caption, mediaId) : { x: (W - RW) / 2, y: ry, w: RW, h: clamp(1112 - ry, 400, 500) };
    const tl = timeline(s, fit.lines.join('').length);
    const media = item ? { id: mediaId, img: s.mediaFrame(mediaId, tl.resultAt), video: item.kind === 'video' } : null;

    promptCard(s, { ...fit, lh, PH }, tl);
    generating(s, R, tl);
    kit(s, R, tl);
    desk(s, tl);
    resultCard(s, kind, R, tl, media);
    if (caption) captionSticker(s, R, tl, caption);
  },
};
