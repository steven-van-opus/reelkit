// One headline number, like a stat card on the site. A white card rises onto
// the wall, the number counts up in Inter Display Bold with the brand
// gradient and lands with a small punch while the brand glow and orbit rings
// ripple out behind it. The label follows as a pill under the card, an
// optional note sits on a small white card, and Kit hops in, points at the
// number and cheers when it lands. With a source image or video
// (props.media) — the 4K render, the panorama — the real thing sits on its own
// card under the label, the note as its caption.
import { createCanvas } from '@napi-rs/canvas';
import { W, C, BAND, font } from '../../brand.mjs';
import { paper, roundRectPath, fitWrapped, wrapLines, text, measure, trackingFor } from '../../paper.mjs';
import { burst } from '../../fx.mjs';
import { lucideIcon } from '../../icons.mjs';
import { brandGradient, backdropOrbits } from '../../brandmark.mjs';
import { drawCover } from '../../mediastore.mjs';
import { clamp, lerp, ease, prog, spring, luminance } from '../../util.mjs';

const FACE = 'd700';     // Inter Display Bold
const UNIT = 0.56;       // "$", "K", "x", "%" sit smaller than the digits
const TRACK = -0.04;     // display digits run tight
const MAX_SIZE = 380;    // ≈ 276px cap height
const MEDIA_SIZE = 300;  // smaller digits when a media card shares the stage
const CARD_Y = { note: 640, plain: 680, media: 590 };   // card centre by layout
const PAD = { x: 110, top: 92, bottom: 84 };
const MEDIA = { x: 360, w: 640, inset: 12, r: 24, imgR: 14 };

// ---------------------------------------------------------------- value

// "$1,200+" → { pre: '$', num: '1,200', post: '+' }. Anything that doesn't
// lead with a number (allowing a 1–2 char prefix) is shown as-is, no count.
function parseValue(v) {
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
// 9 when the target is zero ("$0" reads as a price ticking down to nothing).
function countAt(num, p) {
  const target = parseFloat(num.replace(/,/g, ''));
  const dec = (num.split('.')[1] || '').length;
  const from = target === 0 ? 9 : 0;
  if (p >= 1 || !isFinite(target)) return num;
  const k = 10 ** dec;
  const v = lerp(from, target, p);
  return formatNum((from < target ? Math.floor(v * k) : Math.ceil(v * k)) / k, dec, num.includes(','));
}

// When the narrator says the number: the first word carrying exactly that
// number ("16" matches "16x" and "$16," but not "160" or "2016").
function spokenAt(words, num) {
  if (!num) return null;
  const w = words.find(x => (/\d[\d,]*(?:\.\d+)?/.exec(x.text)?.[0] || '').replace(/,$/, '') === num);
  return w ? w.start : null;
}

// ---------------------------------------------------------------- glyphs

const measureCtx = createCanvas(8, 8).getContext('2d');
const advances = new Map();

// Cap height / font size of the display face, measured once.
let capRatio = null;
function cap() {
  if (capRatio == null) {
    measureCtx.font = font(FACE, 400);
    capRatio = measureCtx.measureText('H').actualBoundingBoxAscent / 400;
  }
  return capRatio;
}

function advance(ch, size) {
  const key = `${ch}|${size}`;
  if (!advances.has(key)) {
    measureCtx.font = font(FACE, size);
    advances.set(key, measureCtx.measureText(ch).width);
  }
  return advances.get(key);
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
    // Prefixes ("$", "#") and a trailing "+" hang from the cap line like a
    // price tag; other units sit on the baseline.
    it.dy = it.kind === 'unit' || (it.kind === 'unit-post' && it.ch === '+') ? -(S - us) * cap() : 0;
    it.x = x;
    x += advance(it.ch, it.size) + (it.kind === 'num' ? S * TRACK : S * 0.01);
  }
  const width = x - (items.length && items[items.length - 1].kind === 'num' ? S * TRACK : S * 0.01);
  return { items, width };
}

// ---------------------------------------------------------------- props

// fitWrapped, then narrow the measure while the line count holds so two-line
// labels split evenly instead of leaving one word on the second line.
function balanced(ctx, str, weight, maxW, maxLines, maxSize, minSize) {
  const fit = fitWrapped(ctx, str, weight, maxW, maxLines, maxSize, minSize);
  if (fit.lines.length < 2) return fit;
  ctx.save();
  ctx.font = font(weight, fit.size);
  ctx.letterSpacing = `${trackingFor(fit.size)}px`;
  let best = fit.lines;
  for (let w = maxW - 20; w > maxW * 0.4; w -= 20) {
    const lines = wrapLines(ctx, str, w);
    if (lines.length > fit.lines.length) break;
    best = lines;
  }
  ctx.restore();
  return { size: fit.size, lines: best };
}

// Shorten to fit maxW at weight/size, ending in an ellipsis.
function clipText(ctx, str, weight, size, maxW) {
  if (measure(ctx, str, weight, size) <= maxW) return str;
  let out = str;
  while (out.length > 1 && measure(ctx, `${out}…`, weight, size) > maxW) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

const sentence = str => str.charAt(0).toUpperCase() + str.slice(1);

// The real media on a white card: image cover-fitted with a slow push, an
// optional caption row under it (video plays as-is, no push). Drawn with its
// top-left at (x, y).
function mediaCard(ctx, img, x, y, w, h, caption, t, still = true) {
  const capH = caption ? 64 : 0;
  const ih = h - MEDIA.inset * 2 - capH;
  paper(ctx, c => roundRectPath(c, x, y, w, h, MEDIA.r), { fill: '#FFFFFF', lift: 2.2 });
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + MEDIA.inset, y + MEDIA.inset, w - MEDIA.inset * 2, ih, MEDIA.imgR);
  ctx.clip();
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(x, y, w, h);
  drawCover(ctx, img, x + MEDIA.inset, y + MEDIA.inset, w - MEDIA.inset * 2, ih, { zoom: still ? 1.01 + 0.05 * ease.inOutQuad(clamp(t / 5)) : 1 });
  ctx.restore();
  if (caption) {
    const cy = y + MEDIA.inset + ih + capH / 2;
    lucideIcon(ctx, 'Info', x + MEDIA.inset + 26, cy, 34, { color: C.mute, stroke: 2 });
    text(ctx, caption, x + MEDIA.inset + 56, cy + 2, { weight: 500, size: 34, color: C.ink, align: 'left' });
  }
}

// Orbit rings that ripple out from the card when the number lands.
function ripple(ctx, x, y, r0, since) {
  for (let k = 0; k < 2; k++) {
    const p = clamp((since - k * 0.14) / 0.9);
    if (p <= 0 || p >= 1) continue;
    backdropOrbits(ctx, { x, y, radii: [r0 + ease.outCubic(p) * 260], tone: 'pink', strength: 4 * (1 - p), width: 3 });
  }
}

export default {
  type: 'stat',
  describe: 'One headline number. A clean white stat card: the number counts up in big brand-gradient type and lands with a ripple of orbit rings, the label follows as a pill under it, an optional note sits on a small card, and Kit points up at it then cheers. Use for a price, a speed-up, a resolution, a count.',
  props: {
    value: 'string ≤ 6 chars, the number itself, e.g. "4K", "16", "$0", "10x", "2.1", "100%" — values that start with a number count up; "$0" counts down',
    label: 'string ≤ 32 chars — what the number means, e.g. "video, straight from text"',
    note: 'string ≤ 40 chars, optional — small print on a note card, e.g. "was $20/mo last week"',
    media: 'optional media id — a real output that shows the number (the 4K render, the 8:1 panorama), on a card under the label; the note becomes its caption',
  },
  draw(s) {
    const { ctx, t, props } = s;
    const cx = W / 2;
    // Only the ink wall flips the label pill to white; pink keeps ink.
    const dark = luminance(s.set.wall) < 0.1;
    const value = String(props.value ?? '').trim().slice(0, 10) || '?';
    const label = sentence(String(props.label ?? '').trim());
    const note = String(props.note ?? '').trim();
    const parts = parseValue(value);
    const item = s.media(props.media);
    const img = item ? s.mediaFrame(props.media) : null;
    const cardY = img ? CARD_Y.media : note ? CARD_Y.note : CARD_Y.plain;

    // ---- timing: the number lands when it's spoken (or ~1s in).
    const spoken = spokenAt(s.words, parts.num) ?? s.wordTime(value);
    const impact = clamp((spoken ?? 0.95) + 0.12, 0.85, 1.35);
    const countStart = 0.3;
    const hit = t >= impact;
    const since = t - impact;

    // ---- fit: size the digits for the widest string the count will show.
    const fromParts = parts.num ? { ...parts, num: countAt(parts.num, 0) } : parts;
    const widthAt = S => Math.max(layout(parts, S).width, layout(fromParts, S).width);
    const maxW = 760;
    let S = img ? MEDIA_SIZE : MAX_SIZE;
    const w0 = widthAt(S);
    if (w0 > maxW) S = Math.max(120, Math.floor((S * maxW) / w0 / 2) * 2);
    const capH = S * cap();
    const cw = clamp(widthAt(S) + PAD.x * 2, 620, 940);
    const ch = capH + PAD.top + PAD.bottom;

    // ---- card rises in, settles, then floats; a small thump on impact.
    const rise = spring(t - 0.08, { freq: 1.7, damp: 0.6 });
    const thump = hit ? Math.exp(-since * 9) * Math.sin(since * 40) * 5 : 0;
    const cy = cardY + (1 - rise) * 160 + thump + Math.sin(t * 1.5) * 4;

    // ---- glow + orbit rings behind the card, blooming on impact.
    const bs = hit ? spring(since + 0.04, { freq: 2, damp: 0.5 }) : 0;
    if (bs > 0) {
      burst(ctx, cx, cy, Math.min(cw / 2 + 180, 640) * bs, { t });
      ripple(ctx, cx, cy, cw / 2 - 40, since);
    }

    ctx.save();
    ctx.globalAlpha *= clamp(rise * 1.8);
    ctx.translate(cx, cy);
    ctx.scale(0.94 + 0.06 * rise, 0.94 + 0.06 * rise);
    paper(ctx, c => roundRectPath(c, -cw / 2, -ch / 2, cw, ch, 32), { fill: '#FFFFFF', lift: 2.6 });

    // ---- digits: pop in, count, punch on impact.
    const cp = parts.num ? ease.outCubic(prog(t, countStart, impact - countStart)) : 1;
    const shown = parts.num ? { ...parts, num: countAt(parts.num, cp) } : parts;
    const { items, width } = layout(shown, S);
    const punch = clamp((cw - 60) / layout(parts, S).width - 1, 0.04, 0.12);
    const slam = hit ? 1 + punch * (1 - spring(since, { freq: 3, damp: 0.4 })) : 1;
    const base = capH / 2 + (PAD.top - PAD.bottom) / 2;
    ctx.save();
    ctx.scale(slam, slam);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    items.forEach((it, i) => {
      const e = s.enter(0.26 + i * 0.05, 0.32);
      if (e <= 0) return;
      const gx = -width / 2 + it.x, gy = base + it.dy;
      const adv = advance(it.ch, it.size);
      ctx.save();
      ctx.translate(gx + adv / 2, gy - capH / 2);
      ctx.scale(e, e);
      ctx.translate(-adv / 2, capH / 2);
      ctx.font = font(FACE, it.size);
      // One gradient across the whole number, expressed in this glyph's space.
      ctx.fillStyle = it.kind === 'num' ? brandGradient(ctx, -width / 2 - gx, -capH - gy + base, width / 2 - gx, base - gy) : C.ink;
      ctx.fillText(it.ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
    ctx.restore();

    // ---- label pill under the card, eased up just after impact.
    let bottom = cy + ch / 2;
    if (label) {
      const { size, lines } = balanced(ctx, label, 'd600', 760, 2, 52, 38);
      const lh = size * 1.12;
      const pw = Math.max(...lines.map(l => measure(ctx, l, 'd600', size))) + 76;
      const ph = lines.length * lh + 34;
      const py = cardY + ch / 2 + 28;
      bottom = py + ph;
      const lp = ease.outBack(clamp((t - impact - 0.06) / 0.34), 1.4);
      if (lp > 0) {
        const fill = dark ? '#FFFFFF' : C.ink;
        ctx.save();
        ctx.globalAlpha *= clamp(lp * 2);
        ctx.translate(cx, py + ph / 2 + (1 - lp) * 30);
        paper(ctx, c => roundRectPath(c, -pw / 2, -ph / 2, pw, ph, lines.length > 1 ? 28 : ph / 2), { fill, lift: 1.6 });
        lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * lh + 2, { weight: 'd600', size, color: dark ? C.ink : '#FFFFFF' }));
        ctx.restore();
      }
    }

    // ---- the real media on its own card, between Kit and the right edge.
    if (img) {
      const top = bottom + 30;
      const room = BAND.floorY - 16 - top;
      const caption = note ? clipText(ctx, note, 500, 34, MEDIA.w - MEDIA.inset * 2 - 80) : '';
      const ideal = (MEDIA.w - MEDIA.inset * 2) / (img.width / img.height) + MEDIA.inset * 2 + (caption ? 64 : 0);
      const mh = clamp(ideal, Math.min(260, room), room);
      const k = ease.outBack(clamp((t - Math.min(impact + 0.2, 1.4)) / 0.4), 1.3);
      if (k > 0) {
        ctx.save();
        ctx.globalAlpha *= clamp(k * 2);
        ctx.translate(MEDIA.x + MEDIA.w / 2, top + mh / 2 + (1 - k) * 40 + Math.sin(t * 1.4 + 1) * 2);
        ctx.scale(0.92 + 0.08 * k, 0.92 + 0.08 * k);
        mediaCard(ctx, img, -MEDIA.w / 2, -mh / 2, MEDIA.w, mh, caption, t, item.kind !== 'video');
        ctx.restore();
      }
    }

    // ---- note on a small white card that hugs its text, between Kit and
    // the right edge.
    if (note && !img) {
      const maxW = 600, ic = 40, padX = 32, gap = 18;
      const { size, lines } = balanced(ctx, note, 500, maxW - padX * 2 - ic - gap, 3, 38, 34);
      const lh = size * 1.22;
      const nw = Math.min(maxW, padX * 2 + ic + gap + Math.max(...lines.map(l => measure(ctx, l, 500, size))));
      const nh = Math.max(104, lines.length * lh + 52);
      const nx = 650 - nw / 2;
      const ny = Math.min(bottom + 34, BAND.floorY - 40 - nh);
      const k = ease.outCubic(clamp((t - Math.min(impact + 0.3, 1.45)) / 0.35));
      if (k > 0) {
        ctx.save();
        ctx.globalAlpha *= k;
        ctx.translate(0, (1 - k) * 24 + Math.sin(t * 1.7 + 1) * 2);
        paper(ctx, c => roundRectPath(c, nx, ny, nw, nh, 16), { fill: '#FFFFFF', lift: 1.4 });
        const ty = ny + nh / 2 - ((lines.length - 1) * lh) / 2;
        lucideIcon(ctx, 'Info', nx + padX + ic / 2, ty, ic, { color: C.mute, stroke: 2 });
        lines.forEach((l, i) => text(ctx, l, nx + padX + ic + gap, ty + i * lh + 2, { weight: 500, size, color: C.ink, align: 'left' }));
        ctx.restore();
      }
    }

    // ---- Kit hops in from the left and reacts to the number.
    const ks = 0.9, kx = 200, ky = BAND.floorY + 48;
    const hp = prog(t, 0.12, 0.5);
    const hx = lerp(-200, kx, ease.outCubic(hp));
    const hy = ky - Math.sin(hp * Math.PI) * 70;
    // Default acting (beat.mascot overrides): point while it counts, cheer
    // when it lands, then point back up at it for the rest of the beat.
    const pose = hp < 1 ? 'walk' : hit && since < 1.4 ? 'cheer' : 'point';
    const face = hit && since < 0.4 ? 'wow' : hit ? 'happy' : 'smile';
    s.kit({ x: hx, y: hy, s: ks, pose, face, look: 0.7, pointAt: { x: cx - 60, y: cy } });
  },
};
