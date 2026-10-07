// Pennant bunting: the title on triangular paper flags strung across the wall
// on a sagging (catenary) string between two push pins — pink, chalk, ink and
// blush card with grain and a folded-over top band. Short titles (≤ 12
// characters) get one capital LETTER per flag; longer ones one WORD per flag,
// each flag sized to its word so the whole title reads at one type size.
// Either way the title can wrap onto a second or third string when that makes
// it bigger. The string pulls taut, the flags unfurl over it one after another
// and swing to rest (damped, on twos) with a breath of breeze after. The kicker
// is on a kraft shipping tag tied to the end of the string, the by-line on a
// torn strip beside it, and the product's logo sticker pins the string's far
// end to the wall.
import { C } from '../../../brand.mjs';
import { paper, tornRectPath, text, measure, tape } from '../../../paper.mjs';
import { rng, clamp, boil, ease, spring, luminance } from '../../../util.mjs';
import { slapIn, logoSticker } from '../product.mjs';

const GOLD = '#FFC94D';
const LETTER_MAX = 12;
// Flag height / width: the planner picks the proportion that sets the title
// biggest — wide, shallow pennants when height is short, taller ones when
// width is.
const R_WORD = [0.55, 0.68, 0.82, 0.98, 1.15, 1.3];
const R_LETTER = [0.95, 1.08, 1.2, 1.32];
const LOGO = 104;
const TWINE = 'rgba(16,16,20,0.62)';
const TWINE_LIGHT = 'rgba(250,250,252,0.72)';

// Every contiguous way to put `items` on 1..maxRows rows.
function partitions(items, maxRows) {
  const out = [[items]];
  if (maxRows < 2) return out;
  for (let i = 1; i < items.length; i++) {
    for (const rest of partitions(items.slice(i), maxRows - 1)) out.push([items.slice(0, i), ...rest]);
  }
  return out;
}

// The text top sits this far under the string (fold band + breathing room).
const textTop = f => 12 + f * 0.14;

// Flag sizes for title size f. Rows are arrays of words.
function sizeRows(ctx, rows, f, letters, R) {
  // Side margin at the text's foot, so a word never kisses the cut edge.
  const m = letters ? 6 + f * 0.1 : 10 + f * 0.2;
  if (letters) {
    // One width for every flag: the widest capital decides.
    const glyphs = rows.flat().join('').replace(/\s/g, '');
    const gw = Math.max(...[...glyphs].map(ch => measure(ctx, ch, 900, f)));
    const w = Math.max(f * 1.1, gw + 2 * m + (textTop(f) + 0.78 * f) / R);
    return rows.map(words => {
      const items = [];
      words.forEach((word, wi) => {
        if (wi) items.push({ space: true, w: w * 0.42 });
        for (const ch of word) items.push({ label: ch, w, h: w * R });
      });
      return items;
    });
  }
  const raw = rows.map(words => words.map(word => measure(ctx, word, 900, f, -1) + 2 * m + (textTop(f) + 0.82 * f) / R));
  const wmax = Math.max(...raw.flat());
  return rows.map((words, ri) => words.map((word, i) => {
    const w = Math.max(raw[ri][i], wmax * 0.5);
    return { label: word, w, h: w * R };
  }));
}

function rowMetrics(items, sagK = 0.045) {
  const flags = items.filter(it => !it.space);
  const wavg = flags.reduce((a, it) => a + it.w, 0) / flags.length;
  const gap = Math.min(10, wavg * 0.05);
  let flagsW = 0;
  items.forEach((it, i) => { flagsW += it.w + (i ? gap : 0); });
  const end = 16;
  const span = flagsW + 2 * end;
  const sag = clamp(span * sagK, 12, 40);
  const hmax = Math.max(...flags.map(it => it.h));
  return { items, gap, end, flagsW, span, sag, height: sag + hmax + 10 };
}

const ROW_GAP = 22;

// Best rows and size: the largest title size whose rows fit the box.
// Best rows and size: the largest title size whose rows fit the box. The band
// under the bunting (tag + by-line) sits below the flag tips when there is
// room, or — when that buys a clearly bigger title — overlaps the flags'
// empty lower halves, always clear of the words.
function plan(ctx, title, letters, boxW, boxH, bandH, logoRoom, sagK) {
  const words = String(title).split(/\s+/).filter(Boolean);
  const cands = partitions(words, Math.min(3, words.length));
  const best = { below: null, over: null };
  for (const rows of cands) {
    // A lone word on its own string looks dropped: word rows hold two or
    // more — except a short tail ("2.1", "Pro") on the last string, or a
    // two-word title.
    if (!letters && rows.length > 1 && words.length > 2
      && rows.some((r, i) => r.length < 2 && !(i === rows.length - 1 && r[0].length <= 4))) continue;
    for (const R of letters ? R_LETTER : R_WORD) {
      for (const mode of ['below', 'over']) {
        const fits = f => {
          const sized = sizeRows(ctx, rows, f, letters, R).map(r => rowMetrics(r, sagK));
          const h = sized.reduce((a, r) => a + r.height, 0) + ROW_GAP * (sized.length - 1);
          if (!sized.every((r, ri) => r.span + (ri === 0 ? logoRoom : 0) <= boxW)) return null;
          const last = sized[sized.length - 1];
          const textFoot = h - last.height + last.sag + textTop(f) + 1.0 * f + 16;
          const block = mode === 'below' ? h + bandH : Math.max(h, textFoot + bandH);
          return block <= boxH ? { rows: sized, h, block, bandAt: mode === 'below' ? h : block - bandH } : null;
        };
        let lo = 24, hi = letters ? 128 : 124;
        if (!fits(lo)) continue;
        for (let k = 0; k < 14; k++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) lo = mid; else hi = mid;
        }
        const f = Math.floor(lo);
        // Fewer strings win ties.
        const score = f / (1 + 0.12 * (rows.length - 1));
        if (!best[mode] || score > best[mode].score + 0.5) best[mode] = { f, score, R, mode, ...fits(f) };
      }
    }
  }
  if (!best.below) return best.over;
  if (!best.over || !bandH) return best.below;
  return best.over.score > best.below.score * 1.08 ? best.over : best.below;
}

// A normalised catenary between two pins at the same height: 0 at the ends,
// `sag` in the middle.
function catenary(x0, x1, y0, sag) {
  const k = 1.3, ck = Math.cosh(k) - 1;
  const xm = (x0 + x1) / 2, half = (x1 - x0) / 2;
  return x => {
    const u = clamp((x - xm) / half, -1, 1);
    return y0 + sag * (1 - (Math.cosh(k * u) - 1) / ck);
  };
}

function flagPath(c, w, h, seed) {
  const r = rng(seed);
  const top = -5;
  c.moveTo(-w / 2, top);
  c.lineTo(w / 2, top);
  // Scissor-cut sides: straight-ish with a hand wobble.
  for (let i = 1; i < 4; i++) { const u = i / 4; c.lineTo(w / 2 * (1 - u) + (r() - 0.5) * 2, top + (h - top) * u + (r() - 0.5) * 2); }
  c.lineTo(0, h);
  for (let i = 3; i > 0; i--) { const u = i / 4; c.lineTo(-w / 2 * (1 - u) + (r() - 0.5) * 2, top + (h - top) * u + (r() - 0.5) * 2); }
  c.closePath();
}

function drawFlag(ctx, it, fill, f, letters, seed, lift) {
  const { w, h } = it;
  paper(ctx, c => flagPath(c, w, h, seed), { fill, lift: 0.9 + lift, rim: 0.6 });
  // The top folds over the string: a darker band and a lit crease.
  const fb = clamp(h * 0.06, 8, 15);
  ctx.save();
  ctx.beginPath();
  flagPath(ctx, w, h, seed);
  ctx.clip();
  ctx.fillStyle = luminance(fill) < 0.2 ? 'rgba(255,255,255,0.07)' : 'rgba(60,20,30,0.09)';
  ctx.fillRect(-w / 2 - 4, -8, w + 8, fb + 8);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(-w / 2 - 4, fb, w + 8, 2);
  ctx.fillStyle = 'rgba(40,10,20,0.10)';
  ctx.fillRect(-w / 2 - 4, fb - 1.5, w + 8, 1.5);
  ctx.restore();
  const ink = luminance(fill) < 0.35 ? C.chalk : C.ink;
  const y = textTop(f) + f * 0.38;
  text(ctx, it.label, 0, y, { weight: 900, size: f, color: ink, tracking: letters ? 0 : -1 });
}

function pin(ctx, x, y, color) {
  ctx.save();
  ctx.shadowColor = 'rgba(44,8,28,0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(x - 4, y - 4, 4, 0, Math.PI * 2);
  ctx.fill();
}

function twine(ctx, pts, color = TWINE) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(44,8,28,0.2)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

// Kraft shipping tag, hung from its hole at the origin.
// `compact` (little height to spare): one line, a little smaller.
function tagSize(ctx, kicker, compact) {
  const lines = compact ? [String(kicker).toUpperCase().trim()] : kickerLines(kicker);
  const size = compact ? 28 : 31;
  const w = Math.max(150, ...lines.map(l => measure(ctx, l, 900, size, 2))) + 52;
  const top = -20, textY = 26, lh = size * 1.15;
  return { lines, size, w, top, textY, lh, h: -top + textY + lines.length * lh + 14 };
}
function kickerLines(kicker) {
  const str = String(kicker).toUpperCase().trim();
  const words = str.split(/\s+/);
  if (str.length <= 9 || words.length < 2) return [str];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const l = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const sc = Math.max(l[0].length, l[1].length);
    if (!best || sc < best.sc) best = { sc, l };
  }
  return best.l;
}
function drawTag(ctx, tg, wall) {
  const { w, h, lines, size, top, textY, lh } = tg;
  const ch = 24;
  const build = c => {
    c.moveTo(-w / 2 + ch, top);
    c.lineTo(w / 2 - ch, top);
    c.lineTo(w / 2, top + ch);
    c.lineTo(w / 2, top + h);
    c.lineTo(-w / 2, top + h);
    c.lineTo(-w / 2, top + ch);
    c.closePath();
  };
  paper(ctx, build, { fill: C.kraft, lift: 1.2, rim: 0.7 });
  // Reinforcing ring and the punched hole (showing the wall).
  ctx.fillStyle = C.pink;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wall;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16,16,20,0.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  lines.forEach((l, i) => text(ctx, l, 0, textY + lh * (i + 0.5) + 2, { weight: 900, size, color: C.ink, tracking: 2 }));
}

export default {
  name: 'bunting',
  label: 'Pennant bunting',
  draw(ctx, s, { cx, top, bottom: limit = 1010, title, kicker, by, toolId, maxW = 900 }) {
    title = String(title || '').trim();
    // Without a print, stay above Kit's spot (centre stage below 1000).
    if (limit <= 1010) limit = Math.min(limit, 996);
    if (!title) return { bottom: top };
    const letters = title.length <= LETTER_MAX;
    const shown = letters ? title.toUpperCase() : title;
    const wall = s.set.wall || C.chalk;
    // Pink flags vanish on the pink set and ink ones at night: gold stands in.
    const dark = luminance(s.set.wall || C.chalk) < 0.2;
    const fills = [s.setName === 'pink' ? GOLD : C.pink, C.chalk, dark ? GOLD : C.ink, C.blush];
    const cord = dark ? TWINE_LIGHT : TWINE;

    // Under the bunting: the kicker tag (left) and the by-line strip.
    const tight = limit - top < 480;
    const tg = kicker ? tagSize(ctx, kicker, tight) : null;
    const bySize = 38, byW = by ? measure(ctx, by, 700, bySize) + 52 : 0;
    const bandH = tg || by ? Math.max(tg ? tg.h + 4 : 0, by ? 64 : 0) + 26 : 0;

    // Bunting runs wall to wall, wider than a print above it.
    const reach = Math.max(maxW, 900) / 2 + 36;
    const spanL = Math.max(54, cx - reach), spanR = Math.min(1026, cx + reach);
    // The logo sticker pinning the first string sits inside the safe zone.
    const logoPin = 903;
    const logoRoom = toolId ? Math.max(0, spanR - logoPin) : 0;
    const P = plan(ctx, shown, letters, spanR - spanL, limit - top - 8, bandH, logoRoom, tight ? 0.03 : 0.045);
    if (!P) return { bottom: top };
    const f = P.f;
    let y = top + 8 + Math.max(0, (limit - top - 8 - P.block) / 2);
    const bandY = y + P.bandAt;

    // Strings go up first and pull taut as the flags take their weight.
    const taut = s.ts < 0.04 ? 0 : spring(s.ts - 0.04, { freq: 1.6, damp: 0.5 });
    let n = 0;
    const nFlags = P.rows.reduce((a, row) => a + row.items.filter(it => !it.space).length, 0);
    const step = letters ? Math.min(0.06, 0.6 / nFlags) : 0.12;
    const rowsDrawn = [];
    P.rows.forEach((row, ri) => {
      let x0 = cx - row.span / 2;
      // Leave room on the right for the logo sticker pinning the first string.
      if (ri === 0 && toolId) x0 = Math.max(spanL, Math.min(x0, logoPin - row.span));
      const x1 = x0 + row.span;
      const pinY = y + 4;
      const sag = row.sag * (1 + 0.8 * (1 - taut));
      const cat = catenary(x0, x1, pinY, sag);
      rowsDrawn.push({ x0, x1, pinY });
      if (taut > 0) {
        const pts = [];
        for (let i = 0; i <= 40; i++) { const x = x0 + (x1 - x0) * i / 40; pts.push([x, cat(x)]); }
        twine(ctx, pts, cord);
      }
      let x = x0 + row.end;
      row.items.forEach((it, i) => {
        if (i) x += row.gap;
        if (it.space) { x += it.w; return; }
        const a = x, b = x + it.w;
        x = b;
        const idx = n++;
        const at = 0.1 + idx * step;
        const p = clamp((s.ts - at) / 0.24);
        if (p <= 0) return;
        const ya = cat(a), yb = cat(b);
        const since = Math.max(0, s.ts - at);
        const swing = 0.15 * Math.exp(-3.2 * since) * Math.sin(9.5 * since + 0.4) + 0.012 * Math.sin(1.7 * s.ts + idx * 0.9);
        const bo = boil(`bunt-${idx}`, s.t, 0.7);
        ctx.save();
        ctx.translate((a + b) / 2 + bo.dx, (ya + yb) / 2 + bo.dy);
        ctx.rotate(Math.atan2(yb - ya, b - a) + swing + bo.rot);
        ctx.scale(1, Math.max(0.05, ease.outBack(p, 2)));
        drawFlag(ctx, it, fills[idx % fills.length], f, letters, `bunt-${title}-${idx}`, (1 - p) * 1.5);
        ctx.restore();
      });
      // Push pins over the string ends (the logo sticker lands over the first right one).
      if (taut > 0) {
        pin(ctx, x0, pinY, C.ink === s.set.ink ? C.ink : C.chalk);
        pin(ctx, x1, pinY, C.ink === s.set.ink ? C.ink : C.chalk);
      }
      y += row.height + ROW_GAP;
    });
    y -= ROW_GAP;
    const landed = 0.1 + nFlags * step + 0.12;

    // The logo sticker pins the first string's right end to the wall.
    if (toolId) {
      const ls = slapIn(s, Math.min(0.7, landed - 0.1), 0.3);
      const r0 = rowsDrawn[0];
      if (ls) {
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(r0.x1 + LOGO * 0.22, r0.pinY - LOGO * 0.12);
        ctx.rotate(0.1 + ls.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, LOGO, { toolId, lift: 1.4, taped: true, seed: 'bunting-logo', tapeIn: 1 });
        ctx.restore();
      }
    }

    // Kicker tag on the loose end of a string, hanging below the bunting: the
    // lowest string whose left end it can hang from without its cord crossing
    // a string below (a short, inset last row is skipped).
    let last = rowsDrawn[rowsDrawn.length - 1];
    let tagRight = cx - 9999;
    if (tg) {
      const reachOf = row => Math.max(row.x0 + 6, 66 + tg.w / 2) + tg.w / 2 + 24;
      for (let i = rowsDrawn.length - 1; i > 0; i--) {
        const inset = rowsDrawn[i].x0 > rowsDrawn[i - 1].x0 + 120;
        if (!inset || rowsDrawn.slice(i).some(r => r.x0 < reachOf(rowsDrawn[i - 1]))) break;
        last = rowsDrawn[i - 1];
      }
      const hx = Math.max(last.x0 + 6, 66 + tg.w / 2);
      const hy = bandY + 26 - tg.top;
      tagRight = hx + tg.w / 2;
      const k = slapIn(s, landed, 0.3);
      if (k) {
        const since = Math.max(0, s.ts - landed);
        const sw = 0.14 * Math.exp(-3 * since) * Math.sin(8 * since + 0.6) + 0.015 * Math.sin(1.3 * s.ts + 2);
        const bo = boil('bunt-tag', s.t, 0.8);
        ctx.save();
        ctx.globalAlpha *= k.alpha;
        twine(ctx, [[last.x0, last.pinY], [last.x0 + (hx - last.x0) * 0.35, (last.pinY + hy) / 2 + 6], [hx + bo.dx, hy + bo.dy]], cord);
        ctx.translate(hx + bo.dx, hy + bo.dy);
        ctx.rotate(-0.05 + sw + bo.rot);
        ctx.scale(k.scale, k.scale);
        drawTag(ctx, tg, s.set.wallDeep || wall);
        // The twine loops through the hole and over the top.
        ctx.strokeStyle = cord;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(7, -18, 0, -30);
        ctx.stroke();
        ctx.restore();
      }
    }

    // By-line on a torn chalk strip, clear of the tag.
    if (by) {
      const bl = slapIn(s, landed + 0.12, 0.3);
      if (bl) {
        const bx = Math.min(Math.max(cx + (tg ? 90 : 0), tagRight + 36 + byW / 2), 1000 - byW / 2);
        const byY = bandY + 26 + (tg ? tg.h / 2 : 32);
        ctx.save();
        ctx.globalAlpha *= bl.alpha;
        ctx.translate(bx, byY);
        ctx.rotate(0.025 + bl.rot);
        ctx.scale(bl.scale, bl.scale);
        paper(ctx, c => tornRectPath(c, -byW / 2, -31, byW, 62, { seed: `bunt-by-${by}`, rough: 2.5 }), { fill: C.chalk, lift: 1, rim: 0.5 });
        text(ctx, by, 0, 2, { weight: 700, size: bySize, color: C.ink });
        tape(ctx, byW / 2 - 18, -26, 70, 26, 0.5, { seed: 'bunt-by-tape', alpha: 0.75 });
        ctx.restore();
      }
    }
    return { bottom: Math.max(y, bandY + bandH) };
  },
};
