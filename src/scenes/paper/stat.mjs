// One headline number. A chalk plaque drops onto the wall on a spring, big
// layered paper digits count up on twos and slam into the final value with a
// paper burst behind, the label is laid down on a torn strip below, an
// optional sticky note gets taped up in the corner, and Kit hops in, points up
// at the number and cheers when it lands.
import { createCanvas } from '@napi-rs/canvas';
import { W, C, BAND, font } from '../../brand.mjs';
import { paper, roundRectPath, tornRectPath, grainCanvas, fitWrapped, text, tape, pinkGradient } from '../../paper.mjs';
import { burst, sparkles, confetti, inkOn } from '../../fx.mjs';
import { clamp, lerp, ease, prog, onTwos, spring, boil, shade, luminance, hexToRgb } from '../../util.mjs';

const CAP = 0.734;       // Inter Black cap height / font size
const UNIT = 0.56;       // "$", "K", "x", "%" sit smaller than the digits
const TRACK = -0.035;    // digits overlap a touch so their die-cut backs stack
const MAX_SIZE = 400;    // ≈ 294px cap height
const PLAQUE_Y = 680;

// ---------------------------------------------------------------- value

// "$1,200+" → { pre: '$', num: '1,200', post: '+' }. Anything that doesn't
// lead with a number (allowing a 1–2 char prefix) is shown as-is, no count —
// and so is a ratio ("8:1", "16x9"): counting it would flash ratios that
// don't exist (2:1, 4:1 …).
function parseValue(v) {
  if (/^\d+(?:\.\d+)?\s*[:x×/]\s*\d+(?:\.\d+)?$/i.test(v)) return { pre: '', num: null, post: v };
  const m = /^(\D{0,2}?)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(v);
  return m ? { pre: m[1], num: m[2], post: m[3] } : { pre: '', num: null, post: v };
}

function formatNum(v, dec, commas) {
  const str = v.toFixed(dec);
  if (!commas) return str;
  const [i, f] = str.split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? `.${f}` : '');
}

// The number shown at `p` (0..1) of the count. Counts up from 0, or down from
// 99 when the target is zero ("$0" reads as a price falling to nothing).
function countAt(num, p) {
  const target = parseFloat(num.replace(/,/g, ''));
  const dec = (num.split('.')[1] || '').length;
  const from = target === 0 ? 99 : 0;
  if (p >= 1 || !isFinite(target)) return num;
  const k = 10 ** dec;
  const v = lerp(from, target, p);
  return formatNum((from < target ? Math.floor(v * k) : Math.ceil(v * k)) / k, dec, num.includes(','));
}

// ---------------------------------------------------------------- glyphs

const sprites = new Map();
const measureCtx = createCanvas(8, 8).getContext('2d');

// One character cut from two sheets of card: a fattened die-cut backing sheet
// and the face glyph lifted on top of it with a contact shadow, both grained
// and rim-lit like everything else from paper.mjs. Cached per char/size/kind.
function glyph(ch, size, kind) {
  const key = `${ch}|${size}|${kind}`;
  if (sprites.has(key)) return sprites.get(key);
  measureCtx.font = font(900, size);
  const m = measureCtx.measureText(ch);
  const cut = Math.max(5, size * 0.04);
  const off = Math.max(3, size * 0.022);
  const pad = Math.ceil(cut + off + size * 0.06);
  const ox = pad + m.actualBoundingBoxLeft;
  const oy = pad + m.actualBoundingBoxAscent;
  const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2);
  const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2);
  const out = { cv: null, ox, oy, adv: m.width };
  if (!ch.trim() || w <= 0 || h <= 0) { sprites.set(key, out); return out; }

  const isNum = kind === 'num';
  const back = isNum ? C.ink : C.pinkDeep;
  const cv = createCanvas(w, h);
  const g = cv.getContext('2d');
  g.font = font(900, size);
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';

  // Backing sheet: the glyph grown by `cut`, nudged down-right.
  g.fillStyle = back;
  g.strokeStyle = back;
  g.lineWidth = cut * 2;
  g.fillText(ch, ox + off * 0.6, oy + off);
  g.strokeText(ch, ox + off * 0.6, oy + off);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.9;
  g.fillStyle = g.createPattern(grainCanvas('dark'), 'repeat');
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';

  // Face sheet, built separately so grain and rim only touch the glyph.
  const fc = createCanvas(w, h);
  const f = fc.getContext('2d');
  f.font = font(900, size);
  f.textBaseline = 'alphabetic';
  f.fillStyle = isNum ? pinkGradient(f, 0, 0, w, h) : C.ink;
  f.fillText(ch, ox, oy);
  f.globalCompositeOperation = 'source-atop';
  f.fillStyle = f.createPattern(grainCanvas(isNum ? 'light' : 'dark'), 'repeat');
  f.fillRect(0, 0, w, h);
  f.lineWidth = Math.max(4, size * 0.014);
  f.strokeStyle = `rgba(255,255,255,${isNum ? 0.38 : 0.2})`;
  f.strokeText(ch, ox + 1.5, oy + 2);
  f.strokeStyle = 'rgba(0,0,0,0.14)';
  f.strokeText(ch, ox - 1.5, oy - 2.5);

  g.save();
  g.shadowColor = 'rgba(30,0,16,0.42)';
  g.shadowBlur = size * 0.035;
  g.shadowOffsetX = size * 0.006;
  g.shadowOffsetY = size * 0.014;
  g.drawImage(fc, 0, 0);
  g.restore();

  out.cv = cv;
  sprites.set(key, out);
  return out;
}

// Lay out the parts of a value at digit size S: [{ ch, kind, size, x, dy }]
// with x relative to the left edge and dy relative to the digit baseline.
function layout({ pre, num, post }, S) {
  const us = Math.round(S * UNIT);
  const items = [];
  const add = (str, kind) => { for (const ch of str) items.push({ ch, kind }); };
  if (num == null) add(post, 'num');
  else { add(pre, 'unit'); add(num, 'num'); add(post, 'unit-post'); }
  let x = 0;
  for (const it of items) {
    it.size = it.kind === 'num' ? S : us;
    const adv = glyph(it.ch, it.size, it.kind === 'num' ? 'num' : 'unit').adv;
    // Prefixes ("$", "#") and a trailing "+" hang from the cap line like a
    // price tag; other units sit on the baseline.
    it.dy = it.kind === 'unit' || (it.kind === 'unit-post' && it.ch === '+') ? -(S - us) * CAP : 0;
    it.x = x;
    x += adv + (it.kind === 'num' ? S * TRACK : S * 0.02);
  }
  const width = x - (items.length && items[items.length - 1].kind === 'num' ? S * TRACK : S * 0.02);
  return { items, width };
}

// Two strip lines split evenly ("BY DEFAULT, / EXCEPT ENTERPRISE", not
// "BY DEFAULT, EXCEPT / ENTERPRISE"): of every word break, the one whose
// longer line is shortest, with a nudge toward breaking after punctuation.
function balanceLines(ctx, str, size, lines, maxW) {
  if (lines.length !== 2 || lines[1].endsWith('…')) return lines;
  const words = str.split(/\s+/).filter(Boolean);
  ctx.save();
  ctx.font = font(900, size);
  let best = lines, bestW = Infinity;
  for (let k = 1; k < words.length; k++) {
    const l = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
    const w = Math.max(...l.map(x => ctx.measureText(x).width)) - (/[,;:]$/.test(words[k - 1]) ? size * 0.8 : 0);
    if (Math.max(...l.map(x => ctx.measureText(x).width)) <= maxW && w < bestW) { best = l; bestW = w; }
  }
  ctx.restore();
  return best;
}

// ---------------------------------------------------------------- props

function stickyNote(ctx, x, y, w, h, fill, seed) {
  // Square note with its bottom-right corner lifting off the wall.
  const fold = 34;
  paper(ctx, c => {
    c.moveTo(x, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w, y + h - fold);
    c.lineTo(x + w - fold, y + h);
    c.lineTo(x, y + h);
    c.closePath();
  }, { fill, lift: 1.3, rim: 0.7 });
  paper(ctx, c => {
    c.moveTo(x + w, y + h - fold);
    c.lineTo(x + w - fold, y + h);
    c.lineTo(x + w - fold - 4, y + h - fold - 6);
    c.closePath();
  }, { fill: shade(fill, -0.14), lift: 0.6, rim: 0.3, shadowColor: 'rgba(44,8,28,0.25)' });
  void seed;
}

export default {
  type: 'stat',
  describe: 'One headline number. Big layered paper digits on a plaque count up and slam in with a burst, the label sits on a torn strip below, an optional sticky note adds context, and Kit points up at it then cheers. Use for a price, a speed-up, a resolution, a count.',
  props: {
    value: 'string ≤ 6 chars, the number itself, e.g. "4K", "16", "$0", "10x", "2.1", "100%" — values that start with a number count up; "$0" counts down',
    label: 'string ≤ 32 chars — what the number means, e.g. "video, straight from text"',
    note: 'string ≤ 40 chars, optional — small print on a sticky note, e.g. "was $20/mo last week"',
  },
  draw(s) {
    const { ctx, t, ts, props } = s;
    const cx = W / 2;
    const dark = s.set.ink === C.chalk;
    const value = String(props.value ?? '').trim().slice(0, 10) || '?';
    const label = String(props.label ?? '').trim();
    const note = String(props.note ?? '').trim();
    const parts = parseValue(value);

    // ---- timing: the number lands when it's spoken (or ~1s in), as late as
    // a second before the cut so the label and note still get read.
    const spoken = s.wordTime(value) ?? (parts.num ? s.wordTime(parts.num) : null);
    const impact = onTwos(clamp((spoken ?? 0.95) + 0.12, 0.85, Math.max(0.85, s.dur - 1.0)));
    const countStart = 0.3;
    const hit = ts >= impact;
    const since = ts - impact;
    // A value that doesn't count up (a ratio, "ON") is stamped on as it's
    // said, glyph by glyph, instead of sitting on the plaque before the voice
    // gets there.
    const stampAt = parts.num == null && impact > 1.1 ? impact - 0.36 : 0.2;

    // ---- fit: size the digits for the widest string the count will show.
    const fromParts = parts.num ? { ...parts, num: countAt(parts.num, 0) } : parts;
    const widthAt = S => Math.max(layout(parts, S).width, layout(fromParts, S).width);
    const maxW = 800;
    let S = MAX_SIZE;
    const w0 = widthAt(S);
    if (w0 > maxW) S = Math.max(120, Math.floor((S * maxW) / w0 / 2) * 2);
    const capH = S * CAP;
    const pw = clamp(widthAt(S) + 170, 600, 940);
    const ph = clamp(capH + 190, 340, 480);

    // ---- plaque drop + thump on impact + idle float.
    // A firm landing: a short overshoot, no big bounce that reads as a re-layout.
    const drop = Math.min(1.04, spring(ts - 0.05, { freq: 1.7, damp: 0.55 }));
    const thump = hit ? Math.exp(-since * 9) * Math.sin(since * 46) * 12 : 0;
    const py = PLAQUE_Y - (1 - drop) * 980 + thump + Math.sin(ts * 1.6) * 4;
    const prot = (1 - drop) * -0.12 + Math.sin(ts * 1.25 + 1) * 0.008 - 0.012;

    // ---- burst behind the plaque, fired on impact.
    const bs = hit ? Math.min(1.06, spring(since, { freq: 2.2, damp: 0.42 })) : 0;
    if (bs > 0) {
      // Its top tips stay below the header strip (y ≥ ~340, pop included).
      const rad = pw * 0.6;
      const sy = Math.min(ph / 2 + 120, PLAQUE_Y - 360) / rad;
      ctx.save();
      ctx.translate(cx, py);
      ctx.scale(bs, bs * sy);
      ctx.rotate(ts * 0.1);
      burst(ctx, 0, 0, rad, { fill: s.set.ink === C.chalk && luminance(s.set.wall) > 0.1 ? C.blush : s.accent, points: 16, t, seed: 'stat-burst' });
      ctx.rotate(Math.PI / 16);
      burst(ctx, 0, 0, rad * 0.86, { fill: dark ? C.chalk : C.ink, points: 16, t: t + 0.3, seed: 'stat-burst2' });
      ctx.restore();
    }
    if (hit) {
      ctx.save();
      ctx.globalAlpha *= clamp(since / 0.3);
      sparkles(ctx, { x: cx, y: py - 20, t, radius: pw * 0.66, count: 7, seed: 'stat-sp', fill: dark ? C.blush : C.chalk });
      ctx.restore();
    }

    // ---- plaque: ink backing card + chalk face, taped to the wall.
    ctx.save();
    ctx.translate(cx, py);
    ctx.rotate(prot);
    paper(ctx, c => roundRectPath(c, -pw / 2 + 16, -ph / 2 + 18, pw, ph, 34), { fill: dark ? C.pinkDeep : C.ink, lift: 2.2, rim: 0.4 });
    paper(ctx, c => roundRectPath(c, -pw / 2, -ph / 2, pw, ph, 34), { fill: C.chalk, lift: 1.4, rim: 1 });
    // Fine ink rule inset from the edge, like a printed ticket.
    ctx.save();
    ctx.strokeStyle = 'rgba(16,16,20,0.16)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    roundRectPath(ctx, -pw / 2 + 24, -ph / 2 + 24, pw - 48, ph - 48, 20);
    ctx.stroke();
    ctx.restore();

    // ---- digits: pop in, count on twos, slam on impact.
    const cp = parts.num ? ease.outCubic(prog(ts, countStart, impact - countStart)) : 1;
    const shown = parts.num ? { ...parts, num: countAt(parts.num, cp) } : parts;
    const { items, width } = layout(shown, S);
    const slam = hit ? 1 + 0.2 * (1 - spring(since, { freq: 3, damp: 0.36 })) : 1;
    const base = capH / 2 + 6;
    ctx.save();
    ctx.scale(slam, slam);
    ctx.shadowColor = 'rgba(44,8,28,0.26)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 9;
    items.forEach((it, i) => {
      const e = s.enter(stampAt + i * (stampAt > 0.2 ? 0.08 : 0.05), 0.32);
      const g = glyph(it.ch, it.size, it.kind === 'num' ? 'num' : 'unit');
      if (e <= 0 || !g.cv) return;
      const b = boil(`stat-d${i}`, t, 1.6);
      const gx = -width / 2 + it.x + b.dx, gy = base + it.dy + b.dy;
      ctx.save();
      ctx.translate(gx + g.adv / 2, gy - capH / 2);
      ctx.rotate(b.rot + (1 - e) * 0.3);
      ctx.scale(e, e);
      ctx.translate(-g.adv / 2, capH / 2);
      ctx.drawImage(g.cv, -g.ox, -g.oy);
      ctx.restore();
    });
    ctx.restore();
    ctx.restore();

    // Tape across the plaque's top corners (drawn unrotated, follows the drop).
    const tp = clamp(drop * 1.2);
    tape(ctx, cx - pw / 2 + 34, py - ph / 2 + 8, 110, 38, -0.62, { seed: 'stat-ta', alpha: 0.78 * tp });
    tape(ctx, cx + pw / 2 - 30, py - ph / 2 + 2, 110, 38, 0.58, { seed: 'stat-tb', alpha: 0.78 * tp });

    // ---- label on a torn strip, laid down left → right after impact.
    let stripBottom = py + ph / 2;
    if (label) {
      const fill = dark ? C.chalk : C.ink;
      const { size, lines: raw } = fitWrapped(ctx, label.toUpperCase(), 900, 760, 2, 60, 38);
      const lines = balanceLines(ctx, label.toUpperCase(), size, raw, 760);
      const lh = size * 1.1;
      const sw = Math.min(900, Math.max(...lines.map(l => (ctx.font = font(900, size), ctx.measureText(l).width))) + 110);
      const sh = lines.length * lh + 44;
      const sy = PLAQUE_Y + ph / 2 - 26;
      stripBottom = sy + sh;
      const lp = ease.outCubic(prog(ts, impact + 0.1, 0.32));
      if (lp > 0) {
        ctx.save();
        ctx.translate(cx, sy + sh / 2);
        ctx.rotate(-0.018 + Math.sin(ts * 1.1) * 0.004);
        ctx.beginPath();
        ctx.rect(-sw / 2 - 30, -sh, (sw + 60) * lp, sh * 2);
        ctx.clip();
        paper(ctx, c => tornRectPath(c, -sw / 2, -sh / 2, sw, sh, { seed: `stat-strip-${label}`, rough: 5, step: 12 }), { fill, lift: 1.8, rim: 0.5 });
        lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * lh + 3, { weight: 900, size, color: inkOn(fill), tracking: 1 }));
        ctx.restore();
        const tk = s.enter(impact + 0.38, 0.25);
        if (tk > 0) {
          tape(ctx, cx - sw / 2 + 8, sy + sh / 2 - 6, 76 * tk, 32, -1.2, { seed: 'stat-tl', alpha: 0.8 });
          tape(ctx, cx + sw / 2 - 8, sy + sh / 2 + 4, 76 * tk, 32, -1.3, { seed: 'stat-tr', alpha: 0.8 });
        }
      }
    }

    // ---- sticky note, slapped onto the wall bottom-right.
    if (note) {
      const nw = 340;
      ctx.font = font(700, 38);
      const { size, lines } = fitWrapped(ctx, note, 700, nw - 60, 4, 40, 34);
      const lh = size * 1.18;
      const nh = Math.max(200, lines.length * lh + 92);
      const nx = 800, ny = clamp(Math.max(stripBottom + 40 + nh / 2, BAND.floorY - 40 - nh / 2), 0, BAND.floorY - 20 - nh / 2);
      const k = s.enter(impact + 0.45, 0.34);
      if (k > 0) {
        // Chalk on pink and lilac walls (a blush note would vanish), blush elsewhere.
        const [wr, wg, wb] = hexToRgb(s.set.wall || '#FFFFFF');
        const nfill = wr > wg + 6 && wb > wg + 6 ? C.chalk : C.blush;
        ctx.save();
        ctx.translate(nx, ny);
        ctx.rotate(0.055 + Math.sin(ts * 2.1) * 0.01);
        ctx.scale(1.35 - 0.35 * k, 1.35 - 0.35 * k);
        ctx.globalAlpha *= clamp(k * 3);
        stickyNote(ctx, -nw / 2, -nh / 2, nw, nh, nfill, 'stat-note');
        lines.forEach((l, i) => text(ctx, l, 0, -nh / 2 + 58 + (i - (lines.length - 1) / 2) * lh + ((nh - 92) / 2), { weight: 700, size, color: C.ink }));
        tape(ctx, 0, -nh / 2 + 2, 120, 40, -0.08, { seed: 'stat-nt', alpha: 0.8 });
        ctx.restore();
      }
    }

    // ---- Kit hops in from the left, points up at the number, cheers on impact.
    const m = s.beat.mascot || {};
    const ks = 0.9, kx = 230, ky = BAND.floorY + 48;
    const hp = prog(ts, 0.12, 0.5);
    const hx = lerp(-200, kx, ease.outCubic(hp));
    const hy = ky - Math.sin(hp * Math.PI) * 90;
    const shoulder = { x: hx + 99 * ks, y: hy - 128 * ks };
    const aim = clamp(Math.atan2(py - shoulder.y, cx - 120 - shoulder.x), -1.45, -0.35);
    const pose = hp < 1 ? 'walk' : m.pose || (hit ? 'cheer' : 'point');
    const face = hit && since < 0.4 ? 'wow' : hit ? m.face || 'happy' : m.face || 'smile';
    s.kit({ x: hx, y: hy, s: ks, pose, face, look: 0.7, pointAngle: aim });

    confetti(ctx, { x: cx, y: py - ph / 2 + 30, t, at: impact, seed: 'stat-conf', count: 26, spread: 1.1 });
  },
};
