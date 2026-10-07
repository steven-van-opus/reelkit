// Shipping tag: the title printed on a big kraft luggage tag that drops in on
// a pink-and-chalk baker's-twine string (it runs up and out of frame through a
// punched hole with a chalk reinforcement ring), the by-line typed onto a
// ruled line, and the kicker rubber-stamped onto it in patchy pink ink — the
// stamp's shadow closes in, then it lands with a thump that jolts the tag.
import { createCanvas } from '@napi-rs/canvas';
import { C, font } from '../../../brand.mjs';
import { paper, roundRectPath } from '../../../paper.mjs';
import { rng, clamp, boil, ease } from '../../../util.mjs';
import { slapIn, logoSticker } from '../product.mjs';

const TAU = Math.PI * 2;
const PRINT_INK = '#17121A';            // title ink, a touch warm so it sits on the kraft
const TRACK = -0.022;                   // display tracking, in em

// ---------------------------------------------------------------- title fit

function lineW(ctx, str, size) {
  ctx.save();
  ctx.font = font(900, size);
  ctx.letterSpacing = `${TRACK * size}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// Biggest 1–3 line split of the title that fits maxW × maxH (fewer lines win
// unless more lines are clearly bigger).
function fitTitle(ctx, title, maxW, maxH, { maxSize = 190, minSize = 56, lh = 0.96 } = {}) {
  const words = String(title).split(/\s+/).filter(Boolean);
  const cands = [[words.join(' ')]];
  for (let i = 1; i < words.length; i++) cands.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  for (let i = 1; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) cands.push([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')]);
  }
  let best = null;
  for (const lines of cands) {
    const unit = Math.max(...lines.map(l => lineW(ctx, l, 100))) / 100;
    let size = Math.min(maxSize, Math.floor(maxW / unit), Math.floor(maxH / (lines.length * lh)));
    while (size > minSize && Math.max(...lines.map(l => lineW(ctx, l, size))) > maxW) size -= 2;
    size = Math.max(minSize, size);
    const score = size * (1 - 0.05 * (lines.length - 1));
    if (!best || score > best.score) best = { lines, size, score };
  }
  const widest = Math.max(...best.lines.map(l => lineW(ctx, l, best.size)));
  return { ...best, lh, squeeze: Math.min(1, maxW / widest) };
}

// ---------------------------------------------------------------- shapes

// The tag, centred on the origin: clipped corners on the left (hole) end,
// softly rounded corners on the right. `inset` gives the parallel printed rule;
// `hole` punches the hole (reverse winding, so the wall shows through).
function tagPath(c, w, h, { inset = 0, chamfer = 90, hole = null } = {}) {
  const x0 = -w / 2 + inset, x1 = w / 2 - inset, y0 = -h / 2 + inset, y1 = h / 2 - inset;
  const ch = chamfer - inset * 0.586;
  const r = Math.max(4, 20 - inset);
  c.moveTo(x0 + ch, y0);
  c.lineTo(x1 - r, y0);
  c.quadraticCurveTo(x1, y0, x1, y0 + r);
  c.lineTo(x1, y1 - r);
  c.quadraticCurveTo(x1, y1, x1 - r, y1);
  c.lineTo(x0 + ch, y1);
  c.lineTo(x0, y1 - ch);
  c.lineTo(x0, y0 + ch);
  c.closePath();
  if (hole) {
    c.moveTo(hole.x + hole.r, hole.y);
    c.arc(hole.x, hole.y, hole.r, 0, TAU, true);
    c.closePath();
  }
}

function ringPath(c, x, y, R, r) {
  c.moveTo(x + R, y);
  c.arc(x, y, R, 0, TAU);
  c.closePath();
  c.moveTo(x + r, y);
  c.arc(x, y, r, 0, TAU, true);
  c.closePath();
}

function insideTag(x, y, w, h, chamfer) {
  if (x < -w / 2 || x > w / 2 || y < -h / 2 || y > h / 2) return false;
  const dx = x + w / 2;
  return dx + (y + h / 2) >= chamfer && dx + (h / 2 - y) >= chamfer;
}

// ---------------------------------------------------------------- twine

function quadPts(a, cp, b, n = 28) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    out.push([(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * cp[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * cp[1] + u * u * b[1]]);
  }
  return out;
}

function polyline(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

// Baker's twine: a chalk cord twisted with pink, with a soft shadow on the wall.
function twine(ctx, pts, { width = 8, shadow = true } = {}) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(44,8,28,0.28)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 6;
    ctx.strokeStyle = 'rgba(120,40,80,0.35)';
    ctx.lineWidth = width + 2;
    polyline(ctx, pts);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = C.chalk;
  ctx.lineWidth = width;
  polyline(ctx, pts);
  ctx.stroke();
  // Pink twist: short diagonal strokes every few px along the cord.
  ctx.strokeStyle = C.pink;
  ctx.lineWidth = width * 0.4;
  ctx.lineCap = 'butt';
  const step = width * 1.25;
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (!len) continue;
    const tx = (bx - ax) / len, ty = (by - ay) / len, nx = -ty, ny = tx;
    let d = carry;
    for (; d < len; d += step) {
      const px = ax + tx * d, py = ay + ty * d, hw = width * 0.46;
      ctx.beginPath();
      ctx.moveTo(px - nx * hw - tx * hw * 0.8, py - ny * hw - ty * hw * 0.8);
      ctx.lineTo(px + nx * hw + tx * hw * 0.8, py + ny * hw + ty * hw * 0.8);
      ctx.stroke();
    }
    carry = d - len;
  }
  // A darker rim so the cord holds its edge on pale paper.
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const [qx, qy] = pts[Math.min(pts.length - 1, i + 1)], [px, py] = pts[Math.max(0, i - 1)];
      const l = Math.hypot(qx - px, qy - py) || 1;
      const ox = (-(qy - py) / l) * side * width / 2, oy = ((qx - px) / l) * side * width / 2;
      if (i) ctx.lineTo(x + ox, y + oy); else ctx.moveTo(x + ox, y + oy);
    });
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- stamp

let probe = null;
function stampDims(label, size) {
  probe ||= createCanvas(8, 8).getContext('2d');
  const str = label.toUpperCase();
  const track = size * 0.07;
  probe.font = font(900, size);
  probe.letterSpacing = `${track}px`;
  const tw = probe.measureText(str).width - track;
  const lw = Math.max(5, size * 0.11);
  const padX = size * 0.5, padY = size * 0.34;
  return { str, track, tw, lw, w: Math.ceil(tw + padX * 2 + lw * 2), h: Math.ceil(size * 0.98 + padY * 2 + lw * 2) };
}
// Height of the stamp once it's rotated onto the tag.
const stampSpan = (d, rot) => d.h * Math.cos(rot) + d.w * Math.abs(Math.sin(rot));

// The rubber-stamp impression, rendered once per label/size: double border,
// heavy caps, then distressed — uneven pressure, speckles and dry streaks.
const stampCache = new Map();
function stampImage(label, size) {
  const key = `${label}|${size}`;
  if (stampCache.has(key)) return stampCache.get(key);
  const { str, track, tw, lw, w, h } = stampDims(label, size);
  const m = 12;
  const cv = createCanvas(w + m * 2, h + m * 2);
  const g = cv.getContext('2d');
  g.translate(m, m);
  g.strokeStyle = C.pink;
  g.fillStyle = C.pink;
  g.lineWidth = lw;
  g.beginPath();
  roundRectPath(g, lw / 2, lw / 2, w - lw, h - lw, size * 0.2);
  g.stroke();
  const ins = lw + size * 0.1;
  g.lineWidth = Math.max(2, size * 0.035);
  g.beginPath();
  roundRectPath(g, ins, ins, w - ins * 2, h - ins * 2, size * 0.12);
  g.stroke();
  g.font = font(900, size);
  g.letterSpacing = `${track}px`;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(str, (w - tw) / 2, h / 2 + size * 0.04);

  // Distress.
  const r = rng(`stamp-${key}`);
  g.globalCompositeOperation = 'destination-out';
  // Uneven pressure: one end inked lighter.
  const fade = g.createLinearGradient(0, 0, w, h * 0.4);
  fade.addColorStop(0, 'rgba(0,0,0,0.30)');
  fade.addColorStop(0.45, 'rgba(0,0,0,0.04)');
  fade.addColorStop(1, 'rgba(0,0,0,0.16)');
  g.fillStyle = fade;
  g.fillRect(-m, -m, w + m * 2, h + m * 2);
  // Blotches where the rubber didn't take ink.
  for (let i = 0; i < 9; i++) {
    const x = r() * w, y = r() * h, rad = size * (0.25 + r() * 0.6);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(0,0,0,${0.35 + r() * 0.4})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Speckles.
  g.fillStyle = '#000';
  for (let i = 0; i < Math.round((w * h) / 70); i++) {
    g.globalAlpha = 0.45 + r() * 0.55;
    g.beginPath();
    g.arc(r() * w, r() * h, 0.5 + r() * r() * 2.6, 0, TAU);
    g.fill();
  }
  // Dry streaks, roughly along the stamp.
  g.lineCap = 'round';
  g.strokeStyle = '#000';
  for (let i = 0; i < 16; i++) {
    g.globalAlpha = 0.25 + r() * 0.45;
    g.lineWidth = 0.8 + r() * 2.2;
    const y = r() * h, x = r() * w, len = size * (0.6 + r() * 2.2);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y + (r() - 0.5) * 6);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  const out = { cv, w, h, m };
  stampCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------- printed bits

// Typewritten line: each key lands a little off its neighbours, inked unevenly.
function typedWidth(ctx, str, size) {
  ctx.save();
  ctx.font = font(600, size);
  const w = [...str].reduce((a, ch) => a + ctx.measureText(ch).width + size * 0.03, 0);
  ctx.restore();
  return w;
}

function typed(ctx, str, x, y, size, shown, seed) {
  const r = rng(`typed-${seed}`);
  ctx.save();
  ctx.font = font(600, size);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = PRINT_INK;
  let px = x;
  [...str].forEach((ch, i) => {
    const dy = (r() - 0.5) * 2.4, a = 0.78 + r() * 0.22, heavy = r() < 0.3;
    if (i < shown) {
      ctx.globalAlpha = a;
      ctx.fillText(ch, px, y + dy);
      if (heavy) ctx.fillText(ch, px + 0.7, y + dy + 0.4);
    }
    px += ctx.measureText(ch).width + size * 0.03;
  });
  ctx.restore();
}

// A printed barcode (decoration; bars from the title so it's stable per reel).
function barcode(ctx, x, y, w, h, seed) {
  const r = rng(`bars-${seed}`);
  ctx.save();
  ctx.fillStyle = PRINT_INK;
  ctx.globalAlpha = 0.82;
  let px = x;
  while (px < x + w - 4) {
    const bw = [2, 2, 3, 5, 7][Math.floor(r() * 5)];
    ctx.fillRect(px, y, Math.min(bw, x + w - px), h);
    px += bw + [2, 3, 4, 6][Math.floor(r() * 4)];
  }
  ctx.restore();
}

// ---------------------------------------------------------------- draw

export default {
  name: 'shipping-tag',
  label: 'Shipping tag',
  draw(ctx, s, { cx, top, bottom: limit = 1010, title, kicker, by, toolId, maxW = 900 }) {
    const ts = s.ts;
    const avail = limit - top;
    // Roomy = no print above, the whole stage to fill.
    const roomy = avail >= 520;
    const stampRot = roomy ? -0.09 : -0.07;
    const w = Math.min(maxW, 920);
    const holeR = roomy ? 20 : 17, ringR = roomy ? 46 : 40;
    const chamfer = roomy ? 92 : 72;
    const holeX = -w / 2 + chamfer * 0.55 + ringR + 4;
    const contentL = holeX + ringR + (roomy ? 38 : 30);
    const padR = 46;
    const contentR = w / 2 - padR;
    const contentW = contentR - contentL;
    // Rows. Roomy: the by-line is typed across the top (clear of the logo)
    // and the stamp gets its own bottom row beside a printed barcode.
    // Compact: by-line and stamp share the bottom row so the title stays big,
    // unless the stamp would get too small to read beside it.
    const stampFit = room => {
      let size = roomy ? 64 : 46;
      while (size > 30 && stampDims(kicker, size).w > room) size -= 2;
      return { size, ...stampDims(kicker, size) };
    };
    const byFit = maxW => {
      let size = roomy ? 40 : 34;
      while (size > 24 && typedWidth(ctx, by, size) > maxW) size -= 2;
      return size;
    };
    let stacked = roomy, bySize = 0, stamp = null;
    if (!roomy && by) {
      bySize = byFit(contentW * 0.62);
      const room = contentW - typedWidth(ctx, by, bySize) - 34;
      if (kicker) {
        const shared = stampFit(room);
        if (shared.size >= 38 && shared.w <= room) stamp = shared;
        else stacked = true;
      }
    }
    if (stacked && by) bySize = byFit(contentW - (toolId ? 140 : 0));
    if (kicker && !stamp) stamp = stampFit(contentW * (roomy ? 0.74 : 0.92));
    const padT = roomy ? 38 : 30, padB = roomy ? 34 : 26;
    const topRow = stacked && by ? bySize + (roomy ? 38 : 30) : 0;
    const botRow = stacked
      ? (stamp ? stampSpan(stamp, stampRot) + 14 : 0)
      : Math.max(by ? bySize + 30 : 0, stamp ? stamp.h + (stampSpan(stamp, stampRot) - stamp.h) * 0.5 : 0);
    // With no by-line on a roomy tag the logo needs the top row's clearance.
    const logoGap = toolId && !topRow ? (roomy ? 40 : 30) : 0;
    // Roomy tags stop short of the floor so Kit can cheer front and centre.
    const cy = top + avail / 2 - (roomy ? 12 : 0);
    const rot0 = 0.045;
    const maxH = Math.min(avail - 30, 640, roomy ? 2 * (994 - cy - Math.sin(rot0) * w * 0.5) : 1e9);
    const titleRoom = maxH - padT - padB - topRow - botRow - logoGap - (roomy ? 24 : 12);
    const fit = fitTitle(ctx, title, contentW, titleRoom, { maxSize: roomy ? 180 : 132, minSize: roomy ? 60 : 48 });
    const titleH = fit.lines.length * fit.size * fit.lh;
    const need = padT + topRow + logoGap + titleH + (roomy ? 24 : 12) + botRow + padB;
    const h = Math.round(clamp(need, Math.min(maxH, w * 0.4), maxH));

    // Where the tag rests, and the string's anchor off the left edge of frame
    // (low enough to clear the beat label at the top).
    const hole = { x: holeX, y: 0, r: holeR };
    const restHX = cx + Math.cos(rot0) * holeX, restHY = cy + Math.sin(rot0) * holeX;
    const A = { x: -70, y: Math.max(340, restHY - (roomy ? 360 : 400)) };
    let ux = A.x - restHX, uy = A.y - restHY;
    const ul = Math.hypot(ux, uy);
    ux /= ul; uy /= ul;

    // Entrance: dropped in along the string from off-frame, a damped swing
    // about the hole, then a thump when the stamp lands.
    const drop = s.spring(0.02, { freq: 1.7, damp: 0.5 });
    const bottomY = Math.round(cy + h / 2 + Math.sin(rot0) * w * 0.5 + 6);
    if (drop <= 0) return { bottom: bottomY };
    const fall = 1 - drop;
    const since = Math.max(0, ts - 0.3);
    const swing = 0.075 * Math.exp(-3.4 * since) * Math.sin(since * 9.5) + clamp(fall) * 0.55;
    const STAMP = { down: 0.54, hit: 0.68 };
    const k = ts - STAMP.hit;
    const thump = stamp && k >= 0 ? Math.exp(-k * 11) * Math.cos(k * 34) : 0;
    const b = boil('tag', s.t, 0.7);
    const phi = rot0 + swing + b.rot + thump * 0.006;
    const HX = restHX + ux * fall * 820 + b.dx, HY = restHY + uy * fall * 820 + b.dy + thump * 9;

    ctx.save();
    ctx.translate(HX, HY);
    ctx.rotate(phi);
    ctx.translate(-holeX, 0);

    // The anchor in tag space, and where the string leaves the tag's edge.
    const ax = A.x - HX, ay = A.y - HY;
    const cphi = Math.cos(-phi), sphi = Math.sin(-phi);
    const Al = [cphi * ax - sphi * ay + holeX, sphi * ax + cphi * ay];
    let dx = Al[0] - holeX, dy = Al[1];
    const dl = Math.hypot(dx, dy);
    dx /= dl; dy /= dl;
    let exit = ringR;
    while (exit < 900 && insideTag(holeX + dx * exit, dy * exit, w, h, chamfer)) exit += 4;
    const K = [holeX + dx * (exit + 46), dy * (exit + 46)];
    const nx = -dy, ny = dx;
    const tw = roomy ? 7 : 6;

    // Back strand: through the hole, behind the tag (seen through the hole
    // and past the tag's edge).
    twine(ctx, quadPts([holeX - 4, 4], [holeX + dx * exit * 0.5 + nx * 16, dy * exit * 0.5 + ny * 16], [K[0] + nx * 3, K[1] + ny * 3], 18), { width: tw });

    // The tag.
    paper(ctx, c => tagPath(c, w, h, { chamfer, hole }), { fill: C.kraft, lift: 2 + thump * 1.2, rim: 0.9 });
    ctx.save();
    ctx.beginPath();
    tagPath(ctx, w, h, { chamfer, hole });
    ctx.clip();
    // Printed double rule around the edge and a dashed fold line by the hole.
    ctx.strokeStyle = 'rgba(23,18,26,0.26)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    tagPath(ctx, w, h, { chamfer, inset: 16 });
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    tagPath(ctx, w, h, { chamfer, inset: 24 });
    ctx.stroke();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(23,18,26,0.22)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(contentL - (roomy ? 20 : 16), -h / 2 + 30);
    ctx.lineTo(contentL - (roomy ? 20 : 16), h / 2 - 30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalCompositeOperation = 'multiply';
    const typedShown = n => Math.floor(clamp((ts - 0.3) / 0.42) * n + (ts >= 0.3 ? 1 : 0));
    const rule = (y, x1 = contentR) => {
      ctx.strokeStyle = 'rgba(23,18,26,0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(contentL, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    };

    // Vertical layout: [top row] title [bottom row], centred in the tag.
    const blockH = topRow + logoGap + titleH + (roomy ? 24 : 12) + botRow;
    let y = -h / 2 + padT + Math.max(0, h - padT - padB - blockH) / 2;
    if (topRow) {
      const ruleY = y + bySize + 18;
      rule(ruleY, contentR - (toolId ? 128 : 0));
      typed(ctx, by, contentL + 4, ruleY - 10, bySize, typedShown([...by].length), by);
      y += topRow;
    }
    y += logoGap;

    // Title, printed: multiplied so the kraft's fibres show through the ink.
    ctx.fillStyle = PRINT_INK;
    ctx.globalAlpha = 0.96;
    ctx.font = font(900, fit.size);
    ctx.letterSpacing = `${TRACK * fit.size}px`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    fit.lines.forEach((line, i) => {
      const ly = y + fit.size * fit.lh * (i + 0.5) + fit.size * 0.04;
      ctx.save();
      ctx.translate(contentL - fit.size * 0.03, ly);
      ctx.scale(fit.squeeze, 1);
      ctx.fillText(line, 0, 0);
      ctx.restore();
    });
    ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
    y += titleH + (roomy ? 24 : 12);

    // Bottom row.
    const rowMid = y + botRow / 2;
    if (!stacked && by) {
      const ruleY = rowMid + bySize * 0.5 + 4;
      rule(ruleY);
      typed(ctx, by, contentL + 4, ruleY - 10, bySize, typedShown([...by].length), by);
    }
    let stampAt = null;
    if (stamp) {
      const sx = contentR - stamp.w / 2 + 6;
      stampAt = { x: sx, y: rowMid + (stacked ? 0 : 2), w: stamp.w, h: stamp.h };
      if (stacked && sx - stamp.w / 2 - contentL > 150) {
        const bw = Math.min(230, sx - stamp.w / 2 - contentL - 44);
        barcode(ctx, contentL + 2, rowMid - 34, bw, 56, title);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // The rubber-stamp impression, clipped to the tag (ink only lands on paper).
    if (stamp && ts >= STAMP.hit) {
      const img = stampImage(kicker, stamp.size);
      const sb = boil('stamp', s.t, 0.5);
      ctx.save();
      ctx.translate(stampAt.x + sb.dx * 0.5, stampAt.y + sb.dy * 0.5);
      ctx.rotate(stampRot);
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.94;
      ctx.drawImage(img.cv, -img.w / 2 - img.m, -img.h / 2 - img.m);
      ctx.restore();
    }
    ctx.restore(); // tag clip

    // Reinforcement ring around the hole, then the front strand over it.
    paper(ctx, c => ringPath(c, holeX, 0, ringR, holeR), { fill: C.chalk, lift: 0.5, rim: 0.8 });
    ctx.save();
    ctx.strokeStyle = 'rgba(23,18,26,0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(holeX, 0, ringR - 7, 0, TAU);
    ctx.stroke();
    ctx.restore();
    const sag = Math.min(60, Math.hypot(Al[0] - K[0], Al[1] - K[1]) * 0.06);
    twine(ctx, quadPts([holeX + 2, -holeR * 0.3], [holeX + dx * exit * 0.5 - nx * 10, dy * exit * 0.5 - ny * 10], K, 18), { width: tw });
    twine(ctx, quadPts(K, [(K[0] + Al[0]) / 2 + nx * sag, (K[1] + Al[1]) / 2 + ny * sag], Al, 40), { width: tw });
    // The knot.
    const ka = Math.atan2(dy, dx);
    paper(ctx, c => c.ellipse(K[0], K[1], tw + 2, tw, ka, 0, TAU), { fill: C.chalk, lift: 0.5, rim: 0.5 });
    ctx.save();
    ctx.strokeStyle = C.pink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(K[0], K[1], tw, tw - 2, ka + 0.8, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // The product's logo sticker, taped over the tag's top edge at the right.
    if (toolId) {
      const ls = slapIn(s, 0.9, 0.3);
      if (ls) {
        const size = roomy ? 112 : 96;
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(contentR - size * 0.42, -h / 2 + size * 0.1);
        ctx.rotate(0.12 + ls.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, size, { toolId, lift: 1.4 + ls.lift * 0.5, taped: true, seed: 'tag-logo', tapeIn: 1 });
        ctx.restore();
      }
    }

    // The stamp coming down: its shadow closes in and sharpens over the spot,
    // then on impact a few ink-dash impact marks fly off its ends.
    if (stampAt && ts >= STAMP.down && ts < STAMP.hit) {
      const p = ease.inQuad((ts - STAMP.down) / (STAMP.hit - STAMP.down));
      const sc = 1.3 - 0.28 * p;
      ctx.save();
      ctx.translate(stampAt.x + (1 - p) * 30, stampAt.y + (1 - p) * 40);
      ctx.rotate(stampRot);
      ctx.scale(sc, sc);
      ctx.filter = `blur(${Math.round(18 - 13 * p)}px)`;
      ctx.fillStyle = `rgba(44,8,28,${0.2 + 0.3 * p})`;
      ctx.beginPath();
      roundRectPath(ctx, -stampAt.w / 2, -stampAt.h / 2, stampAt.w, stampAt.h, 16);
      ctx.fill();
      ctx.filter = 'none';
      ctx.restore();
    }
    if (stampAt && ts >= STAMP.hit && ts < STAMP.hit + 0.2) {
      const p = (ts - STAMP.hit) / 0.2;
      const r = rng('stamp-hit');
      ctx.save();
      ctx.translate(stampAt.x, stampAt.y);
      ctx.rotate(stampRot);
      ctx.strokeStyle = C.ink;
      ctx.lineCap = 'round';
      ctx.lineWidth = 7 * (1 - p * 0.6);
      ctx.globalAlpha = 0.85 * (1 - p * 0.7);
      for (const side of [-1, 1]) {
        for (let i = -1; i <= 1; i++) {
          const ang = (side < 0 ? Math.PI : 0) + i * 0.5 + (r() - 0.5) * 0.15;
          const r0 = stampAt.w / 2 + 16 + p * 26, len = (34 + r() * 14) * (1 - p * 0.5);
          const ox = Math.cos(ang), oy = Math.sin(ang) * (stampAt.h / stampAt.w) * 3.2;
          const ol = Math.hypot(ox, oy);
          const sx = side * (stampAt.w / 2 + 10) + (ox / ol) * (r0 - stampAt.w / 2), sy = i * stampAt.h * 0.38 + (oy / ol) * (r0 - stampAt.w / 2);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (ox / ol) * len, sy + (oy / ol) * len);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    ctx.restore();
    return { bottom: bottomY };
  },
};
