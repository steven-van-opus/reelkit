// Reusable paper props and effects for scenes: confetti, sparkles, stickers,
// pills, strings, arrows and a small set of hand-cut icons.
import { C, font, isStudio } from './brand.mjs';
import { lucideIcon, hasIcon, ICON_ALIASES } from './icons.mjs';
import { backdropOrbits } from './brandmark.mjs';
import { paper, roundRectPath, cutCirclePath, tornRectPath, text, measure, pinkGradient } from './paper.mjs';
import { rng, onTwos, clamp, ease, rgba, shade, luminance } from './util.mjs';

export const inkOn = bg => (typeof bg === 'string' && luminance(bg) < 0.35 ? C.chalk : C.ink);

// Paper confetti burst from (x, y), fired at `at` seconds. Pieces fly out,
// tumble on twos and fall with gravity.
// Global switches for decoration that a still (the cover) leaves out.
export const FX = { confetti: true };

// dir: the burst's main direction in radians (default straight up); gravity
// pulls every piece down either way.
export function confetti(ctx, { x, y, t, at = 0, seed = 'confetti', count = 26, spread = 1, dir = -Math.PI / 2, speed = 1, colors = [C.pink, C.chalk, C.ink, C.blush, '#FFC94D'] } = {}) {
  if (!FX.confetti) return;
  const dt = onTwos(t) - at;
  if (dt <= 0 || dt > 2.4) return;
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const ang = dir + (r() - 0.5) * Math.PI * 1.5 * spread;
    const v = (700 + r() * 900) * speed;
    const px = x + Math.cos(ang) * v * dt * 0.75;
    const py = y + Math.sin(ang) * v * dt * 0.75 + 900 * dt * dt;
    const rot = r() * 6 + dt * (r() - 0.5) * 14;
    const w = 14 + r() * 16, h = 8 + r() * 12;
    const col = colors[i % colors.length];
    const alpha = clamp(1 - (dt - 1.6) / 0.8);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(1, Math.abs(Math.cos(dt * 6 + i)) * 0.8 + 0.2);
    ctx.fillStyle = col;
    ctx.shadowColor = 'rgba(40,0,20,0.18)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, w / 2.4, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

// Four-point paper sparkle.
export function sparkle(ctx, x, y, size, { fill = C.chalk, rot = 0, lift = 0.6 } = {}) {
  paper(ctx, c => {
    const s = size, k = size * 0.28;
    c.moveTo(x, y - s);
    c.quadraticCurveTo(x + k * 0.4, y - k * 0.4, x + s, y);
    c.quadraticCurveTo(x + k * 0.4, y + k * 0.4, x, y + s);
    c.quadraticCurveTo(x - k * 0.4, y + k * 0.4, x - s, y);
    c.quadraticCurveTo(x - k * 0.4, y - k * 0.4, x, y - s);
    c.closePath();
  }, { fill, lift, rim: 0.4 });
}

// Twinkling sparkles around a point — pass t so they pulse.
export function sparkles(ctx, { x, y, t, radius = 260, count = 5, seed = 'sp', fill = C.chalk }) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, d = radius * (0.6 + r() * 0.5);
    const phase = r() * Math.PI * 2;
    const s = (10 + r() * 14) * (0.65 + 0.35 * Math.sin(onTwos(t) * 5 + phase));
    sparkle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, s, { fill });
  }
}

// Rounded pill with centered text. Returns its width.
export function pill(ctx, x, y, str, { fill = C.ink, color = null, size = 34, weight = 800, padX = 26, h = null, lift = 1, tracking = 0, align = 'center' } = {}) {
  const tw = measure(ctx, str, weight, size, tracking);
  const w = tw + padX * 2;
  const hh = h || size + 28;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const f = fill === 'pink' ? pinkGradient(ctx, x0, y - hh / 2, x0 + w, y + hh / 2) : fill;
  paper(ctx, c => roundRectPath(c, x0, y - hh / 2, w, hh, hh / 2), { fill: f, lift, rim: 0.6 });
  text(ctx, str, x0 + w / 2, y + 2, { weight, size, color: color || (fill === 'pink' ? C.chalk : inkOn(fill)), tracking });
  return w;
}

// Round sticker badge with up to two lines of text.
export function badge(ctx, x, y, rad, lines, { fill = 'pink', color = C.chalk, rot = -0.12, size = null } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const f = fill === 'pink' ? pinkGradient(ctx, -rad, -rad, rad, rad) : fill;
  paper(ctx, c => {
    // Scalloped edge.
    const n = 18;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const rr = i % 2 ? rad : rad * 0.9;
      if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
  }, { fill: f, lift: 1.2, rim: 0.6 });
  const arr = Array.isArray(lines) ? lines : [lines];
  const sz = size || rad * (arr.length > 1 ? 0.42 : 0.55);
  arr.forEach((l, i) => text(ctx, l, 0, (i - (arr.length - 1) / 2) * sz * 1.05 + 2, { weight: 900, size: sz, color }));
  ctx.restore();
}

// A hanging string from (x, top) to (x2, y2).
export function string(ctx, x1, y1, x2, y2, { color = 'rgba(16,16,20,0.55)', width = 3 } = {}) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// Chunky paper arrow from (x1,y1) to (x2,y2), drawn to progress p (0..1).
export function arrow(ctx, x1, y1, x2, y2, { p = 1, fill = C.ink, width = 22, head = 46, curve = 0.25 } = {}) {
  if (p <= 0) return;
  const mx = (x1 + x2) / 2 - (y2 - y1) * curve, my = (y1 + y2) / 2 + (x2 - x1) * curve;
  const pt = u => ({ x: (1 - u) ** 2 * x1 + 2 * (1 - u) * u * mx + u * u * x2, y: (1 - u) ** 2 * y1 + 2 * (1 - u) * u * my + u * u * y2 });
  const end = pt(p), before = pt(Math.max(0, p - 0.04));
  const ang = Math.atan2(end.y - before.y, end.x - before.x);
  ctx.save();
  ctx.shadowColor = 'rgba(40,0,20,0.22)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let u = 0; u <= p - 0.02; u += 0.02) { const q = pt(u); if (u === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
  ctx.stroke();
  ctx.translate(end.x, end.y);
  ctx.rotate(ang);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(head * 0.55, 0);
  ctx.lineTo(-head * 0.45, -head * 0.55);
  ctx.lineTo(-head * 0.45, head * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Comic "pow" burst behind something important.
export function burst(ctx, x, y, rad, { fill = '#FFC94D', points = 14, t = 0, seed = 'burst' } = {}) {
  if (isStudio()) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, rad * 1.1);
    glow.addColorStop(0, 'rgba(255,43,136,0.22)');
    glow.addColorStop(1, 'rgba(255,43,136,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - rad * 1.2, y - rad * 1.2, rad * 2.4, rad * 2.4);
    const pulse = 1 + Math.sin(t * 2.4) * 0.02;
    backdropOrbits(ctx, { x, y, radii: [0.55, 0.75, 0.95].map(k => k * rad * pulse), tone: 'pink', strength: 2.2, width: 2.5 });
    return;
  }
  const r = rng(seed);
  const wob = Math.sin(onTwos(t) * 6) * 0.04;
  paper(ctx, c => {
    for (let i = 0; i <= points * 2; i++) {
      const a = (i / (points * 2)) * Math.PI * 2 + wob;
      const rr = i % 2 ? rad * (0.62 + r() * 0.08) : rad * (0.95 + r() * 0.1);
      if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }, { fill, lift: 1, rim: 0.5 });
}

// ---------------------------------------------------------------- icons
// Simple line icons drawn at (x, y) center, `size` px box.
export function icon(ctx, name, x, y, size = 48, color = C.ink) {
  if (isStudio() && (ICON_ALIASES[name] || hasIcon(name))) {
    lucideIcon(ctx, name, x, y, size * 0.92, { color, stroke: 2 });
    return;
  }
  const s = size / 48;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const P = () => ctx.beginPath();
  switch (name) {
    case 'check': P(); ctx.moveTo(-14, 1); ctx.lineTo(-4, 11); ctx.lineTo(15, -11); ctx.stroke(); break;
    case 'x': P(); ctx.moveTo(-12, -12); ctx.lineTo(12, 12); ctx.moveTo(12, -12); ctx.lineTo(-12, 12); ctx.stroke(); break;
    case 'bolt': P(); ctx.moveTo(4, -20); ctx.lineTo(-11, 3); ctx.lineTo(1, 3); ctx.lineTo(-4, 20); ctx.lineTo(11, -3); ctx.lineTo(-1, -3); ctx.closePath(); ctx.fill(); break;
    case 'image': P(); roundRectPath(ctx, -18, -14, 36, 28, 5); ctx.stroke(); P(); ctx.moveTo(-14, 10); ctx.lineTo(-4, -1); ctx.lineTo(4, 6); ctx.lineTo(9, 1); ctx.lineTo(15, 10); ctx.stroke(); P(); ctx.arc(8, -6, 3.5, 0, Math.PI * 2); ctx.fill(); break;
    case 'phone': P(); roundRectPath(ctx, -11, -20, 22, 40, 6); ctx.stroke(); P(); ctx.arc(0, 13, 2.5, 0, Math.PI * 2); ctx.fill(); break;
    case 'cursor': P(); ctx.moveTo(-10, -16); ctx.lineTo(12, 4); ctx.lineTo(2, 6); ctx.lineTo(8, 17); ctx.lineTo(3, 19); ctx.lineTo(-3, 8); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fill(); break;
    case 'sparkle': P(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(3, -3, 20, 0); ctx.quadraticCurveTo(3, 3, 0, 20); ctx.quadraticCurveTo(-3, 3, -20, 0); ctx.quadraticCurveTo(-3, -3, 0, -20); ctx.fill(); break;
    case 'chat': P(); roundRectPath(ctx, -18, -15, 36, 24, 8); ctx.stroke(); P(); ctx.moveTo(-8, 9); ctx.lineTo(-12, 17); ctx.lineTo(0, 9); ctx.stroke(); break;
    case 'code': P(); ctx.moveTo(-8, -10); ctx.lineTo(-17, 0); ctx.lineTo(-8, 10); ctx.moveTo(8, -10); ctx.lineTo(17, 0); ctx.lineTo(8, 10); ctx.moveTo(3, -14); ctx.lineTo(-3, 14); ctx.stroke(); break;
    case 'play': P(); ctx.moveTo(-9, -14); ctx.lineTo(14, 0); ctx.lineTo(-9, 14); ctx.closePath(); ctx.fill(); break;
    case 'star': P(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 8 : 19; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); break;
    case 'layers': P(); ctx.moveTo(0, -16); ctx.lineTo(18, -6); ctx.lineTo(0, 4); ctx.lineTo(-18, -6); ctx.closePath(); ctx.stroke(); P(); ctx.moveTo(-18, 3); ctx.lineTo(0, 13); ctx.lineTo(18, 3); ctx.stroke(); break;
    case 'globe': P(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke(); P(); ctx.ellipse(0, 0, 7, 17, 0, 0, Math.PI * 2); ctx.moveTo(-17, 0); ctx.lineTo(17, 0); ctx.stroke(); break;
    case 'heart': P(); ctx.moveTo(0, 15); ctx.bezierCurveTo(-24, -2, -12, -22, 0, -9); ctx.bezierCurveTo(12, -22, 24, -2, 0, 15); ctx.fill(); break;
    case 'arrow': P(); ctx.moveTo(-15, 0); ctx.lineTo(13, 0); ctx.moveTo(4, -9); ctx.lineTo(14, 0); ctx.lineTo(4, 9); ctx.stroke(); break;
    case 'lock': P(); roundRectPath(ctx, -14, -3, 28, 21, 4); ctx.fill(); P(); ctx.arc(0, -4, 9, Math.PI, 0); ctx.stroke(); break;
    case 'bell': P(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-12, -16, 0, -16); ctx.quadraticCurveTo(12, -16, 14, 10); ctx.closePath(); ctx.fill(); P(); ctx.arc(0, 14, 4, 0, Math.PI * 2); ctx.fill(); break;
    default: P(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// Paper app window: chalk card with a title bar (three dots + title).
export function appWindow(ctx, x, y, w, h, { title = '', fill = C.chalk, bar = C.ink, lift = 2, seed = 'win', r = 24 } = {}) {
  paper(ctx, c => roundRectPath(c, x, y, w, h, r), { fill, lift, rim: 0.8, seed });
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = bar;
  ctx.fillRect(x, y, w, 58);
  ctx.restore();
  (isStudio() ? ['#DEDEE6', '#DEDEE6', '#DEDEE6'] : ['#FF5F57', '#FEBC2E', '#28C840']).forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + 32 + i * 26, y + 29, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  if (title) text(ctx, title, x + w / 2, y + 30, { weight: 700, size: 24, color: inkOn(bar) });
  return { x, y: y + 58, w, h: h - 58 };
}
