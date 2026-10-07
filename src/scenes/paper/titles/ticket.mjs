// Ticket stub: a wide chalk admission ticket with a hot-pink stub. The title is
// printed big on the main body between a small "presented by" line (the
// by-line) and ADMIT ONE; the kicker runs up the stub, which is torn off along
// a row of real perforations with notches top and bottom. The short ends are
// scalloped, a serial number is pin-punched into the stub's corner digit by
// digit (the chads fall away), and the ticket sits with a slight curl.
import { C, font } from '../../../brand.mjs';
import { paper, text, measure, tape } from '../../../paper.mjs';
import { rng, clamp, boil, hash, ease } from '../../../util.mjs';
import { slapIn, logoSticker } from '../product.mjs';

const TAU = Math.PI * 2;
const TRACK = -0.022;            // title tracking, in em
const PINK_INK = '#E8197A';      // the pink printed on chalk (a touch deeper than the stub)

// 5×7 dot-matrix digits for the punched serial.
const DIGITS = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};

// ---------------------------------------------------------------- text fit

function lineW(ctx, str, size, weight = 900, trackEm = TRACK) {
  ctx.save();
  ctx.font = font(weight, size);
  ctx.letterSpacing = `${trackEm * size}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// Biggest 1–3 line split of `str` that fits maxW × maxH.
function fitLines(ctx, str, maxW, maxH, { maxSize = 190, minSize = 48, lh = 0.98, weight = 900, trackEm = TRACK, maxLines = 3, penalty = 0.05 } = {}) {
  const words = String(str).split(/\s+/).filter(Boolean);
  const cands = [[words.join(' ')]];
  if (maxLines >= 2) for (let i = 1; i < words.length; i++) cands.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  if (maxLines >= 3) {
    for (let i = 1; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) cands.push([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')]);
    }
  }
  let best = null;
  for (const lines of cands) {
    const unit = Math.max(...lines.map(l => lineW(ctx, l, 100, weight, trackEm))) / 100;
    let size = Math.min(maxSize, Math.floor(maxW / unit), Math.floor(maxH / (lines.length * lh)));
    while (size > minSize && Math.max(...lines.map(l => lineW(ctx, l, size, weight, trackEm))) > maxW) size -= 2;
    size = Math.max(minSize, size);
    const score = size * (1 - penalty * (lines.length - 1));
    if (!best || score > best.score) best = { lines, size, score };
  }
  const widest = Math.max(...best.lines.map(l => lineW(ctx, l, best.size, weight, trackEm)));
  return { ...best, lh, squeeze: Math.min(1, maxW / widest) };
}

// One title line, centred, with any word carrying a digit ("2.1") in pink.
function titleLine(ctx, line, x, y, size, squeeze) {
  ctx.save();
  ctx.font = font(900, size);
  ctx.letterSpacing = `${TRACK * size}px`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const words = line.split(' ');
  const space = ctx.measureText(' ').width;
  const widths = words.map(wd => ctx.measureText(wd).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  ctx.translate(x, y);
  ctx.scale(squeeze, 1);
  let px = -total / 2;
  words.forEach((wd, i) => {
    ctx.fillStyle = /\d/.test(wd) ? PINK_INK : C.ink;
    ctx.fillText(wd, px, 0);
    px += widths[i] + space;
  });
  ctx.restore();
}

// ---------------------------------------------------------------- shapes

// The ticket outline, centred on the origin: scalloped short ends, a notch
// top and bottom at the perforation (x = px), and `holes` punched through
// (reverse winding, so the wall shows through them).
function ticketPath(c, w, h, { px, nr, sr, pitch, holes = [] }) {
  const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2, r = 12;
  const n = Math.max(2, Math.floor((h - 2 * r) / pitch));
  const first = y0 + (h - (n - 1) * pitch) / 2;
  const bites = Array.from({ length: n }, (_, i) => first + i * pitch);
  c.moveTo(x0 + r, y0);
  c.lineTo(px - nr, y0);
  c.arc(px, y0, nr, Math.PI, 0, true);
  c.lineTo(x1 - r, y0);
  c.quadraticCurveTo(x1, y0, x1, y0 + r);
  for (const yc of bites) {
    c.lineTo(x1, yc - sr);
    c.arc(x1, yc, sr, -Math.PI / 2, Math.PI / 2, true);
  }
  c.lineTo(x1, y1 - r);
  c.quadraticCurveTo(x1, y1, x1 - r, y1);
  c.lineTo(px + nr, y1);
  c.arc(px, y1, nr, 0, Math.PI, true);
  c.lineTo(x0 + r, y1);
  c.quadraticCurveTo(x0, y1, x0, y1 - r);
  for (const yc of [...bites].reverse()) {
    c.lineTo(x0, yc + sr);
    c.arc(x0, yc, sr, Math.PI / 2, -Math.PI / 2, true);
  }
  c.lineTo(x0, y0 + r);
  c.quadraticCurveTo(x0, y0, x0 + r, y0);
  c.closePath();
  for (const hl of holes) {
    c.moveTo(hl.x + hl.r, hl.y);
    c.arc(hl.x, hl.y, hl.r, 0, TAU, true);
    c.closePath();
  }
}

function star(ctx, x, y, r, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Hole centres for a punched serial, digit by digit.
function serialHoles(serial, x, y, pitch, r) {
  const out = [];
  [...serial].forEach((d, k) => {
    const rows = DIGITS[d] || DIGITS[0];
    const ox = x + k * pitch * 6.4;
    rows.forEach((row, j) => [...row].forEach((bit, i) => {
      if (bit === '1') out.push({ x: ox + i * pitch, y: y + j * pitch, r, digit: k });
    }));
  });
  return out;
}

// ---------------------------------------------------------------- draw

export default {
  name: 'ticket',
  label: 'Ticket stub',
  draw(ctx, s, { cx, top, bottom: limit = 1010, title, kicker, by, toolId, maxW = 900 }) {
    const ts = s.ts;
    const avail = limit - top;
    const roomy = avail >= 520;
    const w = Math.min(maxW, 940);
    const stubW = Math.round(clamp(w * 0.22, 168, 206));
    const px = w / 2 - stubW;
    const mainW = w - stubW;
    const mainCx = -w / 2 + mainW / 2;
    const rot0 = -0.035;
    const cy = top + avail / 2 - (roomy ? 12 : 0);
    // Roomy tickets stop short of the floor so Kit can cheer front and centre.
    const maxH = Math.min(avail - 36, 640, roomy ? 2 * (992 - cy - Math.abs(Math.sin(rot0)) * w * 0.5) : 1e9);

    // Main body: [presented-by line] TITLE [ADMIT ONE], inside a printed border.
    const padX = roomy ? 64 : 54;
    const bySize = roomy ? 36 : 30, admitSize = roomy ? 27 : 23;
    const padT = roomy ? 38 : 34, padB = roomy ? 34 : 30;
    const byRow = by ? bySize + (roomy ? 22 : 18) : toolId ? 36 : 0;
    const admitRow = admitSize + (roomy ? 26 : 20);
    // The title's last line keeps clear of ADMIT ONE (descenders included).
    const room = maxH - padT - padB - byRow - admitRow;
    const opts = { maxSize: roomy ? 168 : 124, minSize: roomy ? 56 : 46, penalty: roomy ? 0.02 : 0.05 };
    let fit = fitLines(ctx, title, mainW - padX * 2, room, opts);
    if (fit.lines.length * fit.size * fit.lh + fit.size * 0.14 > room) fit = fitLines(ctx, title, mainW - padX * 2, room - fit.size * 0.14, opts);
    const titleH = fit.lines.length * fit.size * fit.lh + fit.size * 0.14;
    const need = padT + byRow + titleH + admitRow + padB;
    const h = Math.round(clamp(need, Math.min(maxH, w * 0.44), maxH));
    const nr = roomy ? 22 : 18, sr = roomy ? 13 : 11, pitch = roomy ? 46 : 40;

    // Stub: the punched serial in its top corner, the kicker up its length.
    const serial = String(hash(`${title}|${s.episode?.date || ''}`) % 10000).padStart(4, '0');
    const sp = roomy ? 5.8 : 5.0, srad = roomy ? 2.5 : 2.2;
    const serialW = sp * 6.4 * 3 + sp * 4;
    const sX = px + stubW / 2 - serialW / 2, sY = -h / 2 + (roomy ? 34 : 26);
    const punch = serialHoles(serial, sX, sY, sp, srad);
    const PUNCH_AT = 0.5, PUNCH_STEP = 0.08;
    const punched = punch.filter(hl => ts >= PUNCH_AT + hl.digit * PUNCH_STEP);
    const perfs = [];
    for (let y = -h / 2 + nr + 12; y <= h / 2 - nr - 12; y += roomy ? 17 : 15) perfs.push({ x: px, y, r: roomy ? 3.6 : 3.2 });
    const shape = { px, nr, sr, pitch, holes: [...perfs, ...punched] };

    // Entrance: slides in from the right with a spin and settles; then the
    // serial is punched and the logo sticker slaps on.
    const sp1 = s.spring(0.04, { freq: 1.5, damp: 0.64 });
    const bottomY = Math.round(cy + h / 2 + Math.abs(Math.sin(rot0)) * w * 0.5 + 8);
    if (sp1 <= 0) return { bottom: bottomY };
    const out = 1 - sp1;
    const b = boil('ticket', s.t, 0.7);
    ctx.save();
    ctx.translate(cx + out * 980 + b.dx, cy - out * 140 + b.dy);
    ctx.rotate(rot0 - out * 0.42 + b.rot);

    // Curl: the ends lift off the wall, so their shadows run longer and softer.
    ctx.save();
    ctx.filter = 'blur(14px)';
    ctx.fillStyle = 'rgba(44,8,28,0.26)';
    for (const [ex, dir] of [[-w / 2 + 70, -1], [w / 2 - 70, 1]]) {
      ctx.beginPath();
      ctx.ellipse(ex + dir * 12, h / 2 + 4, 110, 26, 0, 0, TAU);
      ctx.fill();
    }
    ctx.filter = 'none';
    ctx.restore();

    paper(ctx, c => ticketPath(c, w, h, shape), { fill: C.chalk, lift: 1.6, rim: 0.9 });
    ctx.save();
    ctx.beginPath();
    ticketPath(ctx, w, h, shape);
    ctx.clip();
    // The stub, printed hot pink.
    paper(ctx, c => c.rect(px, -h / 2 - 2, stubW + 4, h + 4), { fill: C.pink, lift: 0, rim: 0 });

    // Security print on the main body: fine blush diagonals.
    const bx0 = -w / 2 + 26, bx1 = px - 22, by0 = -h / 2 + 22, by1 = h / 2 - 22;
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.clip();
    ctx.strokeStyle = C.blush;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    for (let d = -h; d < mainW + h; d += 15) {
      ctx.beginPath();
      ctx.moveTo(bx0 + d, by0);
      ctx.lineTo(bx0 + d - (by1 - by0), by1);
      ctx.stroke();
    }
    ctx.restore();
    // A chalk panel behind the type keeps it crisp over the print.
    ctx.save();
    ctx.fillStyle = C.chalk;
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    ctx.rect(bx0 + 14, by0 + 14, bx1 - bx0 - 28, by1 - by0 - 28);
    ctx.fill();
    ctx.restore();
    // Printed double border.
    ctx.strokeStyle = PINK_INK;
    ctx.lineWidth = 4;
    ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx0 + 9, by0 + 9, bx1 - bx0 - 18, by1 - by0 - 18);

    // Type, centred vertically in the body.
    const block = byRow + titleH + admitRow;
    let y = -h / 2 + padT + Math.max(0, h - padT - padB - block) / 2;
    if (by) {
      // Centred between the logo and the perforation; the flanking rules go
      // first, then the type shrinks, then it's trimmed.
      const room = mainW - 2 * (toolId ? 128 : padX);
      const rules = roomy ? 44 : 30;
      let size = bySize, str = by, bw = measure(ctx, str, 700, size, 1);
      const withRules = bw + 2 * (rules + 16) <= room;
      while (!withRules && size > 22 && bw > room) bw = measure(ctx, str, 700, (size -= 2), 1);
      while (bw > room && str.length > 2) bw = measure(ctx, (str = `${str.slice(0, -2).trimEnd()}…`), 700, size, 1);
      const byY = y + bySize * 0.55;
      text(ctx, str, mainCx, byY, { weight: 700, size, color: PINK_INK, tracking: 1 });
      if (withRules) {
        ctx.save();
        ctx.strokeStyle = PINK_INK;
        ctx.lineWidth = 2.5;
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(mainCx + dir * (bw / 2 + 16), byY + 2);
          ctx.lineTo(mainCx + dir * (bw / 2 + 16 + rules), byY + 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    y += byRow;
    fit.lines.forEach((line, i) => titleLine(ctx, line, mainCx, y + fit.size * fit.lh * (i + 0.5) + fit.size * 0.05, fit.size, fit.squeeze));
    y += titleH;
    const admitY = y + admitRow / 2 + (roomy ? 6 : 4);
    const aw = measure(ctx, 'ADMIT ONE', 800, admitSize, 6);
    text(ctx, 'ADMIT ONE', mainCx, admitY, { weight: 800, size: admitSize, color: C.ink, tracking: 6 });
    for (const dir of [-1, 1]) star(ctx, mainCx + dir * (aw / 2 + 26), admitY - 1, admitSize * 0.42, PINK_INK);

    // Stub: kicker (or ADMIT ONE) running up its length, in chalk.
    {
      const k = (kicker || 'Admit one').toUpperCase();
      const len = h - (sY + h / 2) - sp * 7 - (roomy ? 34 : 24) - (roomy ? 30 : 22);
      const kf = fitLines(ctx, k, len, stubW - (roomy ? 56 : 44), { maxSize: roomy ? 78 : 60, minSize: 28, lh: 1.02, weight: 900, trackEm: 0.04, maxLines: 2, penalty: 0 });
      const kcx = px + stubW / 2, kcy = h / 2 - (roomy ? 30 : 22) - len / 2;
      ctx.save();
      ctx.translate(kcx, kcy);
      ctx.rotate(-Math.PI / 2);
      kf.lines.forEach((line, i) => {
        const ly = (i - (kf.lines.length - 1) / 2) * kf.size * kf.lh + kf.size * 0.04;
        text(ctx, line, 0, ly, { weight: 900, size: kf.size, color: C.chalk, tracking: Math.round(kf.size * 0.04) });
      });
      ctx.restore();
    }
    // Faint fold along the perforation.
    ctx.strokeStyle = 'rgba(16,16,20,0.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 1.5, -h / 2);
    ctx.lineTo(px + 1.5, h / 2);
    ctx.stroke();
    // Curl shading: ends a touch darker, the middle catching the light.
    const shadeG = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    shadeG.addColorStop(0, 'rgba(60,10,35,0.10)');
    shadeG.addColorStop(0.1, 'rgba(60,10,35,0)');
    shadeG.addColorStop(0.45, 'rgba(255,255,255,0.05)');
    shadeG.addColorStop(0.9, 'rgba(60,10,35,0)');
    shadeG.addColorStop(1, 'rgba(60,10,35,0.10)');
    ctx.fillStyle = shadeG;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore(); // ticket clip

    // Punched holes catch a little shadow on their lower lip.
    ctx.save();
    ctx.strokeStyle = 'rgba(16,16,20,0.22)';
    ctx.lineWidth = 1.2;
    for (const hl of [...perfs, ...punched]) {
      ctx.beginPath();
      ctx.arc(hl.x, hl.y, hl.r, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();

    // Chads from each freshly punched digit drop away.
    for (let d = 0; d < 4; d++) {
      const age = ts - (PUNCH_AT + d * PUNCH_STEP);
      if (age < 0 || age > 0.45) continue;
      const r = rng(`chad-${d}`);
      const holes = punch.filter(hl => hl.digit === d);
      for (let i = 0; i < 6; i++) {
        const hl = holes[Math.floor(r() * holes.length)];
        const fall = 1400 * age * age + 60 * age;
        ctx.save();
        ctx.globalAlpha = clamp(1.4 - age * 3);
        ctx.fillStyle = C.pink;
        ctx.beginPath();
        ctx.arc(hl.x + (r() - 0.5) * 40 * age * 4, hl.y + fall + r() * 6, hl.r + 0.4, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    // The product's logo sticker, taped over the main body's top-left corner.
    if (toolId) {
      const ls = slapIn(s, 0.82, 0.3);
      if (ls) {
        const size = roomy ? 112 : 96;
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(-w / 2 + size * 0.5, -h / 2 + size * 0.12);
        ctx.rotate(-0.12 + ls.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, size, { toolId, lift: 1.4 + ls.lift * 0.5, taped: true, seed: 'ticket-logo', tapeIn: 1 });
        ctx.restore();
      }
    }
    // A strip of tape holds the stub end to the wall.
    const ti = clamp((ts - 0.36) / 0.12);
    if (ti > 0) tape(ctx, w / 2 - 22, h / 2 - 34, 96 * ease.outCubic(ti), 34, -0.75, { seed: 'ticket-tape', alpha: 0.78 });

    ctx.restore();
    return { bottom: bottomY };
  },
};
