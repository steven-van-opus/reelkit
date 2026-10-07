// Title treatments for the paper hook — alternatives to the hanging sign.
//
//   strips   each word (or short phrase) on its own torn strip, staggered and
//            tilted like a cut-out magazine headline; one accent strip in pink
//   letters  every letter its own small paper tile, a tidy ransom-note collage
//   print    the real media as a big photo print with the title on a torn
//            label taped across its bottom edge
//
// Each returns the block's bottom y so the hook can place Kit and confetti.
import { C, font } from '../../brand.mjs';
import { paper, tornRectPath, roundRectPath, text, measure, fitSize, tape } from '../../paper.mjs';
import { rng, clamp, boil } from '../../util.mjs';
import { slapIn, logoSticker } from './product.mjs';

// Split a title into strip lines: words joined while a line stays short, the
// version number kept with its name ("Banana 2.1").
function stripLines(title) {
  const words = String(title).split(/\s+/).filter(Boolean);
  const lines = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length <= 3 && !/\d/.test(w) && words[i + 1] && !/\d/.test(words[i + 1])) { lines.push(`${w} ${words[++i]}`); continue; }
    lines.push(w);
  }
  return lines;
}

function kickerTape(ctx, s, x, y, kicker, delay) {
  const k = slapIn(s, delay, 0.3);
  if (!k || !kicker) return;
  const str = kicker.toUpperCase();
  const size = 34, w = measure(ctx, str, 900, size, 2) + 56, h = 58;
  ctx.save();
  ctx.globalAlpha *= k.alpha;
  ctx.translate(x, y);
  ctx.rotate(-0.07 + k.rot);
  ctx.scale(k.scale, k.scale);
  paper(ctx, c => tornRectPath(c, -w / 2, -h / 2, w, h, { seed: 'kick', rough: 3, edges: 'lr' }), { fill: '#FF5AA5', lift: 1.2, rim: 0.5 });
  text(ctx, str, 0, 2, { weight: 900, size, color: C.chalk, tracking: 2 });
  ctx.restore();
}

// Torn strips: one word per strip, the version number on a pink accent
// strip; sized to the space and centred in [top, bottom]. Returns { bottom }.
export function titleStrips(ctx, s, { cx, top, bottom: limit = 1060, title, kicker, by, toolId, d = 0, maxW = 900 }) {
  const lines = stripLines(title);
  const r = rng(`strips-${title}`);
  const kickH = kicker ? 78 : 0, byH = by ? 82 : 0, gap = 16;
  const room = limit - top - kickH - byH;
  let size = Math.min(210, ...lines.map(l => fitSize(ctx, l, 900, maxW - 150, 210, 70)));
  size = Math.min(size, Math.floor((room - gap * (lines.length - 1)) / (lines.length * 1.1)));
  const h = size * 1.1;
  const block = kickH + lines.length * h + (lines.length - 1) * gap + byH;
  let y = top + Math.max(0, (limit - top - block) / 2);
  if (kicker) kickerTape(ctx, s, cx - 90, y + 30, kicker, 0.5 + d);
  y += kickH;
  const accent = lines.findIndex(l => /\d/.test(l));
  lines.forEach((line, i) => {
    const w = measure(ctx, line, 900, size) + 80;
    const x = cx + (lines.length > 1 ? (i % 2 ? 30 : -30) : 0);
    const sl = slapIn(s, 0.08 + d + i * 0.16, 0.32);
    const b = boil(`strip${i}`, s.t, 0.8);
    const pink = i === accent || (accent < 0 && i === lines.length - 1 && lines.length > 1);
    if (sl) {
      ctx.save();
      ctx.globalAlpha *= sl.alpha;
      ctx.translate(x + b.dx, y + h / 2 + b.dy);
      ctx.rotate((r() - 0.5) * 0.08 + sl.rot + b.rot);
      ctx.scale(sl.scale, sl.scale);
      paper(ctx, c => tornRectPath(c, -w / 2, -h / 2, w, h, { seed: `strip-${i}-${line}`, rough: 5, step: 12 }), {
        fill: pink ? C.pink : C.chalk, lift: 1.6 + sl.lift, rim: 0.8,
      });
      text(ctx, line, 0, size * 0.04, { weight: 900, size, color: pink ? C.chalk : C.ink, tracking: -1 });
      if (i === 0) tape(ctx, -w / 2 + 34, -h / 2 + 6, 90, 32, -0.5, { seed: `st-tape-${i}`, alpha: 0.75 });
      ctx.restore();
    }
    // The product's logo sticker sits beside the first strip, never on the text.
    if (i === 0 && toolId) {
      const ls = slapIn(s, 0.55 + d + lines.length * 0.12, 0.32);
      if (ls) {
        const lx = Math.min(1010 - 70, x + w / 2 + 64);
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(lx, y + h / 2 - 6);
        ctx.rotate(0.12 + ls.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, 120, { toolId, lift: 1.4, taped: true, seed: 'strip-logo', tapeIn: 1 });
        ctx.restore();
      }
    }
    y += h + gap;
  });
  y -= gap;
  if (by) {
    const bl = slapIn(s, 0.3 + d + lines.length * 0.16, 0.3);
    if (bl) {
      const bw = measure(ctx, by, 700, 38) + 48;
      ctx.save();
      ctx.globalAlpha *= bl.alpha;
      ctx.translate(cx + 110, y + 50);
      ctx.rotate(0.03 + bl.rot);
      paper(ctx, c => tornRectPath(c, -bw / 2, -30, bw, 60, { seed: 'by', rough: 2.5 }), { fill: C.kraft, lift: 1, rim: 0.5 });
      text(ctx, by, 0, 2, { weight: 700, size: 38, color: C.ink });
      ctx.restore();
    }
    y += byH;
  }
  return { bottom: y };
}

// Cut-out letters: returns { bottom }.
export function titleLetters(ctx, s, { cx, top, bottom: limit = 1060, title, kicker, by, toolId, d = 0, maxW = 940 }) {
  const lines = stripLines(title);
  const r = rng(`letters-${title}`);
  const fills = [C.chalk, C.pink, C.ink, C.blush, C.chalk, '#FFC94D'];
  // Tile size so the longest line fits the width and all lines fit the height.
  const longest = Math.max(...lines.map(l => l.length));
  const kickH = kicker ? 84 : 0, byH = by ? 64 : 0;
  const tile = Math.min(170, Math.floor((maxW - 40) / (longest * 0.9)), Math.floor((limit - top - kickH - byH) / (lines.length * 1.12)));
  const block = kickH + lines.length * (tile + 14) + byH;
  let y = top + Math.max(0, (limit - top - block) / 2);
  if (kicker) kickerTape(ctx, s, cx, y + 30, kicker, 0.5 + d);
  y += kickH;
  const titleTop = y;
  let n = 0;
  lines.forEach(line => {
    const chars = [...line];
    const widths = chars.map(ch => (ch === ' ' ? tile * 0.35 : ch === '.' ? tile * 0.42 : tile * 0.86));
    const total = widths.reduce((a, b) => a + b, 0);
    let x = cx - total / 2;
    chars.forEach((ch, i) => {
      const w = widths[i];
      if (ch !== ' ') {
        const fill = fills[Math.floor(r() * fills.length)];
        const sl = slapIn(s, 0.06 + d + n * 0.035, 0.26);
        const b = boil(`ltr${n}`, s.t, 1);
        if (sl) {
          ctx.save();
          ctx.globalAlpha *= sl.alpha;
          ctx.translate(x + w / 2 + b.dx, y + tile / 2 + (r() - 0.5) * 10 + b.dy);
          ctx.rotate((r() - 0.5) * 0.2 + sl.rot + b.rot);
          ctx.scale(sl.scale, sl.scale);
          const tw = ch === '.' ? w : w - 6, th = tile;
          paper(ctx, c => tornRectPath(c, -tw / 2, -th / 2, tw, th, { seed: `lt-${n}`, rough: 2.5, step: 9 }), { fill, lift: 1.2, rim: 0.6 });
          const ink = fill === C.ink || fill === C.pink ? C.chalk : C.ink;
          text(ctx, ch, 0, 3, { weight: 900, size: tile * 0.78, color: ink });
          ctx.restore();
        }
        n++;
      }
      x += w;
    });
    y += tile + 12;
  });
  if (toolId) {
    const ls = slapIn(s, 0.2 + d + n * 0.035, 0.3);
    if (ls) {
      ctx.save();
      ctx.globalAlpha *= ls.alpha;
      ctx.translate(Math.min(940, cx + 330), titleTop - 20);
      ctx.rotate(0.12 + ls.rot);
      ctx.scale(ls.scale, ls.scale);
      logoSticker(ctx, 112, { toolId, lift: 1.4, taped: true, seed: 'ltr-logo', tapeIn: 1 });
      ctx.restore();
    }
  }
  if (by) {
    text(ctx, by, cx, y + 26, { weight: 700, size: 38, color: s.set.ink });
    y += 64;
  }
  return { bottom: y };
}

// Title on a torn label taped across the bottom edge of the print.
export function titleOnPrint(ctx, s, { cx, labelY, title, kicker, by, d = 0, maxW = 860 }) {
  const size = fitSize(ctx, title, 900, maxW - 90, 108, 60);
  const w = Math.min(maxW, measure(ctx, title, 900, size) + 90);
  const h = size * 1.25 + (by ? 50 : 0);
  const sl = slapIn(s, 0.22 + d, 0.32);
  if (sl) {
    ctx.save();
    ctx.globalAlpha *= sl.alpha;
    ctx.translate(cx, labelY);
    ctx.rotate(-0.025 + sl.rot);
    ctx.scale(sl.scale, sl.scale);
    paper(ctx, c => tornRectPath(c, -w / 2, -h / 2, w, h, { seed: `print-label-${title}`, rough: 5, step: 12 }), { fill: C.chalk, lift: 2, rim: 0.8 });
    text(ctx, title, 0, by ? -18 : 4, { weight: 900, size, color: C.ink, tracking: -1 });
    if (by) text(ctx, by, 0, h / 2 - 34, { weight: 700, size: 34, color: C.mute });
    tape(ctx, -w / 2 + 20, -h / 2 + 6, 90, 32, -0.6, { seed: 'pl-tape-a', alpha: 0.75 });
    tape(ctx, w / 2 - 20, -h / 2 + 6, 90, 32, 0.6, { seed: 'pl-tape-b', alpha: 0.75 });
    ctx.restore();
  }
  if (kicker) kickerTape(ctx, s, cx - maxW / 2 + 170, labelY - h / 2 - 34, kicker, 0.5 + d);
  return { bottom: labelY + h / 2 };
}
