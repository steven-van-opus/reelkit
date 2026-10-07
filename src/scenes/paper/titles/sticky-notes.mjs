// Sticky notes: the title stuck up word by word on square sticky notes —
// golden yellow, chalk, blush and one hot-pink accent — sized to their word so
// the whole title reads at one big type size. Each note slaps on flat, then its
// bottom edge curls off the wall (a smile-shaped edge, a sheen and a shadow
// that grows underneath) while the adhesive band along the top stays put. The
// kicker is on a small note torn off the pad, overlapping the first note's
// corner; the by-line is marker-written on the wall underneath, with a pink
// squiggle, and writes itself on left to right.
import { C, font } from '../../../brand.mjs';
import { paper, tornRectPath, text, measure } from '../../../paper.mjs';
import { rng, clamp, boil, ease, luminance } from '../../../util.mjs';
import { slapIn, logoSticker } from '../product.mjs';

const GOLD = '#FFC94D';
// Little words ride on top of the next word's note ("the / Figma").
const MINOR = new Set(['the', 'a', 'an', 'of', 'for', 'to', 'in', 'on', 'by', 'and', '&', 'with', 'vs', 'at', 'from', 'my', 'your', 'our', 'its']);
const BAND = 0.13;            // adhesive band, share of the note side
const PAD_X = 0.08;           // side margin inside a note
const STEP = 0.13;            // entrance stagger between notes (s)

// Title → 1–4 notes: { lead, lines }.
function noteGroups(title) {
  const words = String(title).split(/\s+/).filter(Boolean);
  const groups = [];
  let lead = [];
  for (const w of words) {
    if (MINOR.has(w.toLowerCase()) && lead.length < 2) { lead.push(w); continue; }
    groups.push({ lead: lead.join(' ') || null, words: [w] });
    lead = [];
  }
  if (lead.length) {
    if (groups.length) groups[groups.length - 1].words.push(...lead);
    else groups.push({ lead: null, words: lead });
  }
  const len = g => (g.lead ? g.lead.length * 0.4 : 0) + g.words.join(' ').length;
  while (groups.length > 4) {
    let best = 0;
    for (let i = 1; i < groups.length - 1; i++) if (len(groups[i]) + len(groups[i + 1]) < len(groups[best]) + len(groups[best + 1])) best = i;
    const a = groups[best], b = groups[best + 1];
    groups.splice(best, 2, { lead: a.lead, words: [...a.words, ...(b.lead ? [b.lead] : []), ...b.words] });
  }
  // Two or more words on one note: one short line ("3 Pro") or two
  // balanced ones.
  return groups.map(g => {
    if (g.words.length < 2 || g.words.join(' ').length <= 7) return { lead: g.lead, lines: [g.words.join(' ')] };
    let best = null;
    for (let i = 1; i < g.words.length; i++) {
      const l = [g.words.slice(0, i).join(' '), g.words.slice(i).join(' ')];
      const score = Math.max(l[0].length, l[1].length);
      if (!best || score < best.score) best = { score, l };
    }
    return { lead: g.lead, lines: best.l };
  });
}

const leadSize = f => Math.max(26, Math.round(f * 0.36));

// A note's side and its text box for title size f, as multiples of f
// (measured at 100px).
function noteMetrics(ctx, g) {
  const R = 100;
  const tw = Math.max(...g.lines.map(l => measure(ctx, l, 900, R, -1)), g.lead ? measure(ctx, g.lead.toUpperCase(), 800, leadSize(R), 2) : 0) / R;
  const th = g.lines.length * 1.0 + (g.lead ? 0.5 : 0);
  const k = Math.max(tw / (1 - 2 * PAD_X), th / (1 - BAND - 0.12), 2.3);
  return { k, tw, th };
}

// How the notes sit: `o` overlap between neighbours (negative = a gap) and
// `z` the zig-zag (every other note up/down), both as shares of a mean note.
const PRESETS = [
  { o: -0.07, z: 0.04 },
  { o: 0.04, z: 0.2 },
  { o: 0.12, z: 0.34 },
];

// Rows of notes and the title size that fills the box best. Positions are
// linear in f, so they are planned at f = 1 and scaled.
function layout(ctx, groups, boxW, boxH) {
  const m = groups.map(g => noteMetrics(ctx, g));
  const kmax = Math.max(...m.map(v => v.k));
  // No note much smaller than the biggest, so the set reads as one family.
  m.forEach(v => { v.k = Math.max(v.k, kmax * 0.66); });
  const N = groups.length;
  const mean = m.reduce((a, v) => a + v.k, 0) / N;
  const splits = [[N]];
  if (N >= 3) splits.push([Math.ceil(N / 2), Math.floor(N / 2)]);
  let best = null;
  for (const split of splits) {
    for (const pre of PRESETS) {
      if (split.length > 1 && pre.z > 0.1) continue;
      // Place at f = 1: rows top to bottom, each row centred on x = 0.
      const notes = [];
      let y = 0, i = 0;
      const stagger = split.length > 1 ? 0.3 * mean : 0;
      for (let ri = 0; ri < split.length; ri++) {
        const row = m.slice(i, i + split[ri]);
        const step = -pre.o * mean;
        const rowW = row.reduce((a, v) => a + v.k, 0) + step * (row.length - 1);
        let x = -rowW / 2 + (split.length > 1 ? (ri ? 0.5 : -0.5) * stagger : 0);
        const zs = row.map((_, j) => (row.length > 1 ? (j % 2 ? 1 : -1) * pre.z * mean : 0));
        const top = Math.min(...row.map((v, j) => zs[j] - v.k / 2));
        for (let j = 0; j < row.length; j++) {
          const v = row[j];
          notes.push({ i: i + j, row: ri, S: v.k, x: x + v.k / 2, y: y - top + zs[j], tw: v.tw, th: v.th });
          x += v.k + step;
        }
        const bottom = Math.max(...row.map((v, j) => zs[j] + v.k / 2));
        y += bottom - top + 0.07 * mean;
        i += split[ri];
      }
      const x0 = Math.min(...notes.map(n => n.x - n.S / 2)), x1 = Math.max(...notes.map(n => n.x + n.S / 2));
      const y1 = Math.max(...notes.map(n => n.y + n.S / 2)) * 1.04;
      // A note drawn later may cover an earlier one's corner, never its word.
      // Reading order first; else the raised notes go on top.
      const covers = (a, b) => {
        const cy = a.y + (BAND - 0.06) / 2 * a.S;
        const pad = 0.05 * mean;
        const tx0 = a.x - a.tw / 2 - pad, tx1 = a.x + a.tw / 2 + pad, ty0 = cy - a.th / 2 - pad, ty1 = cy + a.th / 2 + pad;
        return b.x - b.S / 2 < tx1 && b.x + b.S / 2 > tx0 && b.y - b.S / 2 < ty1 && b.y + b.S / 2 > ty0;
      };
      const clashes = order => order.some((a, ai) => order.some((b, bi) => bi > ai && covers(a, b)));
      let order = notes;
      if (clashes(order)) {
        order = [...notes].sort((a, b) => b.y - a.y || a.i - b.i);
        if (clashes(order)) continue;
      }
      const f = Math.min(150, boxW / (x1 - x0), boxH / y1, 470 / kmax);
      const cx = (x0 + x1) / 2;
      notes.forEach(n => { n.x -= cx; });
      if (!best || f > best.f * 1.04) best = { f, notes, order: order.map(n => n.i), h: y1, rows: split.length };
    }
  }
  return best;
}

// A square note centred on the origin; `bow` lifts the bottom corners (curl).
function notePath(c, S, bow) {
  const h = S / 2;
  c.moveTo(-h, -h);
  c.lineTo(h, -h);
  c.lineTo(h, h - bow);
  c.quadraticCurveTo(0, h + bow, -h, h - bow);
  c.closePath();
}

function drawNote(ctx, S, fill, { curl = 1, lift = 0, seed }) {
  const h = S / 2;
  const bow = S * 0.022 * curl;
  // The curled bottom throws a deeper shadow than the stuck-down top.
  ctx.save();
  ctx.shadowColor = `rgba(44, 8, 28, ${0.12 + 0.2 * curl})`;
  ctx.shadowBlur = 10 + 16 * curl + lift * 8;
  ctx.shadowOffsetX = 2 + lift * 2;
  ctx.shadowOffsetY = 4 + 15 * curl + lift * 8;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-h + 10, 0);
  ctx.lineTo(h - 10, 0);
  ctx.lineTo(h + 2, h - bow);
  ctx.quadraticCurveTo(0, h + bow, -h - 2, h - bow);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  paper(ctx, c => notePath(c, S, bow), { fill, lift: 0.35 + lift, rim: 0.5 });
  ctx.save();
  ctx.beginPath();
  notePath(ctx, S, bow);
  ctx.clip();
  // Adhesive band: a touch flatter and darker, with a faint edge.
  ctx.fillStyle = 'rgba(60, 30, 10, 0.045)';
  ctx.fillRect(-h, -h, S, S * BAND);
  ctx.fillStyle = 'rgba(60, 30, 10, 0.07)';
  ctx.fillRect(-h, -h + S * BAND - 1.5, S, 1.5);
  // The curl catches the light, then turns away from it at the very edge.
  const g = ctx.createLinearGradient(0, h - S * 0.34, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.62, `rgba(255,255,255,${0.2 * curl})`);
  g.addColorStop(0.86, 'rgba(255,255,255,0)');
  g.addColorStop(1, `rgba(40,10,20,${0.13 * curl})`);
  ctx.fillStyle = g;
  ctx.fillRect(-h, h - S * 0.34, S, S * 0.36);
  ctx.restore();
}

function noteText(ctx, g, S, f, ink) {
  const ls = leadSize(f);
  const leadH = g.lead ? ls * 1.35 : 0;
  const block = leadH + g.lines.length * f * 1.0;
  const innerTop = -S / 2 + S * BAND, innerBot = S / 2 - S * 0.06;
  let y = (innerTop + innerBot) / 2 - block / 2;
  if (g.lead) {
    text(ctx, g.lead.toUpperCase(), 0, y + ls * 0.55, { weight: 800, size: ls, color: ink, tracking: 2 });
    y += leadH;
  }
  g.lines.forEach((l, i) => text(ctx, l, 0, y + f * (i + 0.5) + f * 0.04, { weight: 900, size: f, color: ink, tracking: -1 }));
}

// Kicker on a small note torn off the pad: crisp adhesive top, torn bottom.
function kickerNote(ctx, kicker, accent) {
  const str = kicker.toUpperCase();
  const size = 32, w = measure(ctx, str, 900, size, 2) + 48, h = 64;
  paper(ctx, c => tornRectPath(c, -w / 2, -h / 2, w, h, { seed: `sticky-kick-${str}`, rough: 4, step: 10, edges: 'br' }), { fill: accent, lift: 1.1, rim: 0.5 });
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h * 0.22);
  ctx.fillStyle = 'rgba(40, 10, 20, 0.06)';
  ctx.fill();
  ctx.restore();
  text(ctx, str, 0, 4, { weight: 900, size, color: luminance(accent) < 0.35 ? C.chalk : C.ink, tracking: 2 });
  return { w, h };
}

// Marker-written by-line: slanted Inter, a pink squiggle, written on from the left.
function byline(ctx, by, x, y, p, ink, size = 44, mark = C.pink) {
  if (p <= 0) return;
  const w = measure(ctx, by, 700, size);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.035);
  ctx.beginPath();
  ctx.rect(-w / 2 - 40, -size, (w + 80) * p, size * 2.4);
  ctx.clip();
  ctx.save();
  ctx.transform(1, 0, -0.2, 1, 0, 0);
  text(ctx, by, 0, 0, { weight: 700, size, color: ink });
  ctx.restore();
  ctx.strokeStyle = mark;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const r = rng(`sticky-by-${by}`);
  const y0 = size * 0.62;
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const px = -w / 2 - 6 + (w + 18) * u;
    const py = y0 + Math.sin(u * Math.PI * 5) * 4 + (r() - 0.5) * 1.5 + u * 3;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

export default {
  name: 'sticky-notes',
  label: 'Sticky notes',
  draw(ctx, s, { cx, top, bottom: limit = 1010, title, kicker, by, toolId, maxW = 900 }) {
    const groups = noteGroups(title);
    if (!groups.length) return { bottom: top };
    const r = rng(`sticky-${title}`);
    const accent = s.setName === 'pink' ? C.ink : C.pink;
    // Tight under a print: the kicker may overlap the print's border a touch.
    const tight = limit - top < 480;
    const kickReserve = kicker ? (tight ? 22 : 40) : 0, byReserve = by ? (tight ? 78 : 96) : 0;
    const boxH = limit - top - kickReserve - byReserve;
    const L = layout(ctx, groups, maxW, boxH);
    const f = Math.floor(L.f);
    const blockH = L.h * f;
    const y0 = top + kickReserve + Math.max(0, (boxH - blockH) / 2);

    // Colours: the version number (or the last word) gets the pink accent.
    let accentAt = groups.findIndex(g => g.lines.some(l => /\d/.test(l)));
    if (accentAt < 0) accentAt = groups.length - 1;
    const cycle = [GOLD, C.chalk, C.blush];
    let ci = 0;
    const fills = groups.map((_, i) => (i === accentAt && groups.length > 1 ? accent : cycle[ci++ % cycle.length]));

    // Hand-placed: a little tilt and nudge each.
    const notes = L.notes.map(n => ({
      ...n, S: n.S * f, x: cx + n.x * f, y: y0 + n.y * f + (r() - 0.5) * 0.03 * n.S * f, rot: (r() - 0.5) * 0.08,
    }));
    let y = y0 + blockH;

    L.order.map(i => notes[i]).forEach(n => {
      const g = groups[n.i];
      const fill = fills[n.i];
      const at = 0.08 + n.i * STEP;
      const sl = slapIn(s, at, 0.3);
      if (!sl) return;
      // Pressed flat on landing, then the bottom edge relaxes into a curl.
      const curl = ease.outCubic(clamp((s.ts - at - 0.26) / 0.24));
      const b = boil(`sticky-${n.i}`, s.t, 0.8);
      ctx.save();
      ctx.globalAlpha *= sl.alpha;
      ctx.translate(n.x + b.dx, n.y + b.dy);
      ctx.rotate(n.rot + sl.rot + b.rot);
      ctx.scale(sl.scale, sl.scale);
      drawNote(ctx, n.S, fill, { curl, lift: sl.lift * 0.4, seed: `sticky-${n.i}` });
      noteText(ctx, g, n.S, f, luminance(fill) < 0.35 ? C.chalk : C.ink);
      ctx.restore();
    });

    // Kicker: a torn-off note over the first note's top-left corner (only
    // its adhesive band — never the word).
    const first = notes[0];
    const landed = 0.08 + groups.length * STEP;
    if (kicker) {
      const k = slapIn(s, landed + 0.02, 0.3);
      if (k) {
        const kw = measure(ctx, kicker.toUpperCase(), 900, 32, 2) + 48;
        const kx = Math.max(cx - maxW / 2 - 20 + kw / 2, first.x - first.S / 2 + kw * 0.32);
        ctx.save();
        ctx.globalAlpha *= k.alpha;
        ctx.translate(kx, first.y - first.S / 2 - 12);
        ctx.rotate(-0.07 + k.rot);
        ctx.scale(k.scale, k.scale);
        kickerNote(ctx, kicker, groups.length > 1 && fills.includes(accent) && accentAt === 0 ? C.ink : accent);
        ctx.restore();
      }
    }

    // Logo sticker: over the top-right corner of the first row's last note,
    // mostly off the note so it never covers the word.
    if (toolId) {
      const ls = slapIn(s, landed + 0.12, 0.3);
      const last = notes.filter(n => n.row === 0).sort((a, b) => b.x - a.x)[0];
      if (ls && last) {
        const size = Math.round(Math.min(124, Math.max(100, last.S * 0.36)));
        const lx = Math.min(950, last.x + last.S / 2 + size * 0.1);
        // Above the note's word, however far in the sticker had to come.
        const textTop = last.y + (BAND - 0.06) / 2 * last.S - (last.th * f) / 2;
        const ly = Math.min(last.y - last.S / 2 - size * 0.12, textTop - 16 - size / 2);
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(lx, ly);
        ctx.rotate(0.12 + ls.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, size, { toolId, lift: 1.4, taped: true, seed: 'sticky-logo', tapeIn: 1 });
        ctx.restore();
      }
    }

    if (by) {
      const p = ease.outQuad(clamp((s.ts - landed - 0.18) / 0.36));
      byline(ctx, by, cx + 20, y + (tight ? 46 : 56), p, s.set.ink, Math.round(Math.max(40, Math.min(52, f * 0.52))), s.setName === 'pink' ? GOLD : C.pink);
      y += byReserve;
    }
    return { bottom: y };
  },
};
