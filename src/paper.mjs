// Papercraft drawing primitives. Every on-screen object is a piece of card
// stock: a filled shape with a soft contact shadow, a fibre-grain overlay and a
// lit top edge. Scenes compose these instead of drawing raw shapes so the
// whole reel shares one material.
import { createCanvas } from '@napi-rs/canvas';
import { C, font, isStudio, THEME } from './brand.mjs';
import { rng, rgba, shade, luminance } from './util.mjs';

// ---------------------------------------------------------------- grain

const grainCache = new Map();

// A tileable 512² texture of paper fibres and speckles, drawn once and reused
// as a pattern. `dark` is for overlaying on deep colours.
export function grainCanvas(kind = 'light') {
  if (grainCache.has(kind)) return grainCache.get(kind);
  const S = 512;
  const cv = createCanvas(S, S);
  const g = cv.getContext('2d');
  const r = rng(`grain-${kind}`);
  const wrap = draw => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.save(); g.translate(ox, oy); draw(); g.restore(); } };
  const tone = kind === 'dark' ? 255 : 60;
  // Speckles.
  for (let i = 0; i < 9000; i++) {
    const a = r() * (kind === 'dark' ? 0.05 : 0.07);
    g.fillStyle = `rgba(${tone},${tone - 10},${tone - 5},${a})`;
    const s = r() * 1.8 + 0.4, x = r() * S, y = r() * S;
    wrap(() => g.fillRect(x, y, s, s));
  }
  // Fibres: short, slightly curved strokes.
  g.lineCap = 'round';
  for (let i = 0; i < 700; i++) {
    const x = r() * S, y = r() * S, len = 6 + r() * 22, ang = r() * Math.PI;
    g.strokeStyle = `rgba(${tone},${tone},${tone},${r() * 0.06})`;
    g.lineWidth = 0.6 + r() * 0.9;
    const qx = x + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 6, qy = y + Math.sin(ang) * len * 0.5 + (r() - 0.5) * 6;
    wrap(() => {
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(qx, qy, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.stroke();
    });
  }
  // Soft mottling so large flat areas are never perfectly flat.
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(${tone},${tone},${tone},${0.025 + r() * 0.02})`);
    grad.addColorStop(1, `rgba(${tone},${tone},${tone},0)`);
    g.fillStyle = grad;
    wrap(() => g.fillRect(x - rad, y - rad, rad * 2, rad * 2));
  }
  grainCache.set(kind, cv);
  return cv;
}

const patternCache = new WeakMap();
function grainPattern(ctx, kind) {
  let byKind = patternCache.get(ctx);
  if (!byKind) patternCache.set(ctx, (byKind = {}));
  if (!byKind[kind]) byKind[kind] = ctx.createPattern(grainCanvas(kind), 'repeat');
  return byKind[kind];
}

// ---------------------------------------------------------------- paths

export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Rectangle whose edges are hand-torn: points every ~12px jittered outward and
// inward. `edges` picks which sides tear ('tblr'); untouched sides stay crisp.
export function tornRectPath(ctx, x, y, w, h, { seed = 'torn', rough = 5, step = 13, edges = 'tblr' } = {}) {
  // Studio: no tearing — a clean card with the site's 16px radius (straight
  // edges where a side was not meant to tear, e.g. a floor's bottom).
  if (isStudio()) {
    if (edges.length < 4) { ctx.rect(x, y, w, h); return; }
    roundRectPath(ctx, x, y, w, h, Math.min(16, h / 2, w / 2));
    return;
  }
  const r = rng(seed);
  const j = on => (on ? (r() - 0.5) * 2 * rough : 0);
  const pts = [];
  const nx = Math.max(2, Math.round(w / step)), ny = Math.max(2, Math.round(h / step));
  for (let i = 0; i <= nx; i++) pts.push([x + (w * i) / nx, y + j(edges.includes('t'))]);
  for (let i = 1; i <= ny; i++) pts.push([x + w + j(edges.includes('r')), y + (h * i) / ny]);
  for (let i = nx - 1; i >= 0; i--) pts.push([x + (w * i) / nx, y + h + j(edges.includes('b'))]);
  for (let i = ny - 1; i >= 1; i--) pts.push([x + j(edges.includes('l')), y + (h * i) / ny]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// Circle with a faint hand-cut wobble.
export function cutCirclePath(ctx, cx, cy, rad, { seed = 'circle', wobble = 1.2 } = {}) {
  if (isStudio()) wobble = 0;
  const r = rng(seed);
  const n = Math.max(24, Math.round(rad / 3));
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = rad + (i === n ? 0 : (r() - 0.5) * 2 * wobble);
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- paper

// Draw a piece of paper. `build(ctx)` appends the outline to the current path.
//   fill      colour or CanvasGradient
//   lift      0..3 — how far above the surface it sits (shadow size)
//   grain     0..1 — fibre overlay strength
//   rim       top-edge highlight strength
export function paper(ctx, build, opts = {}) {
  if (isStudio()) return surface(ctx, build, opts);
  const { fill = C.paperWarm, lift = 1, grain = 1, rim = 1, stroke = null, strokeWidth = 3, shadowColor = null } = opts;
  const isDark = typeof fill === 'string' && luminance(fill) < 0.18;

  if (lift > 0) {
    ctx.save();
    ctx.shadowColor = shadowColor || `rgba(44, 8, 28, ${0.16 + lift * 0.05})`;
    ctx.shadowBlur = 6 + lift * 12;
    ctx.shadowOffsetX = lift * 2;
    ctx.shadowOffsetY = 3 + lift * 7;
    ctx.beginPath();
    build(ctx);
    ctx.fillStyle = typeof fill === 'string' ? fill : C.paperWarm;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  if (grain > 0) {
    ctx.globalAlpha = Math.min(1, grain * (isDark ? 0.9 : 1));
    ctx.fillStyle = grainPattern(ctx, isDark ? 'dark' : 'light');
    ctx.fillRect(-4000, -4000, 8000, 8000);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (rim > 0) {
    // Lit top-left edge and a slightly darker bottom edge read as card thickness.
    ctx.save();
    ctx.beginPath();
    build(ctx);
    ctx.clip();
    ctx.lineWidth = 5;
    ctx.strokeStyle = `rgba(255,255,255,${0.32 * rim})`;
    ctx.translate(1.5, 2);
    ctx.beginPath();
    build(ctx);
    ctx.stroke();
    ctx.translate(-3, -4.5);
    ctx.strokeStyle = `rgba(0,0,0,${0.10 * rim})`;
    ctx.beginPath();
    build(ctx);
    ctx.stroke();
    ctx.restore();
  }

  if (stroke) {
    ctx.save();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    build(ctx);
    ctx.stroke();
    ctx.restore();
  }
}

// Studio material: the site's card shapes and hairline border, printed on
// card stock — paper grain and fibres, a lit top edge and a warm paper shadow
// (THEME.texture), or perfectly flat when texture is off.
function surface(ctx, build, { fill = C.chalk, lift = 1, grain = 1, rim = 1, stroke = null, strokeWidth = 3, shadowColor = null, border = true } = {}) {
  const solid = typeof fill === 'string';
  const dark = solid ? luminance(fill) < 0.25 : true;
  const tex = THEME.texture;
  if (lift > 0) {
    ctx.save();
    ctx.shadowColor = shadowColor || (tex ? `rgba(44,8,28,${0.10 + lift * 0.045})` : `rgba(16,16,20,${0.05 + lift * 0.035})`);
    ctx.shadowBlur = 8 + lift * 15;
    ctx.shadowOffsetX = tex ? lift * 1.5 : 0;
    ctx.shadowOffsetY = 2 + lift * 7;
    ctx.beginPath();
    build(ctx);
    ctx.fillStyle = solid ? fill : C.ink;
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  if (tex && (grain > 0 || rim > 0)) {
    ctx.save();
    ctx.clip();
    if (grain > 0) {
      ctx.globalAlpha = Math.min(1, grain * (dark ? 0.85 : 1));
      ctx.fillStyle = grainPattern(ctx, dark ? 'dark' : 'light');
      ctx.fillRect(-4000, -4000, 8000, 8000);
      ctx.globalAlpha = 1;
    }
    if (rim > 0) {
      // Lit top-left edge and a faintly darker bottom edge: card thickness.
      ctx.lineWidth = 5;
      ctx.strokeStyle = `rgba(255,255,255,${(dark ? 0.12 : 0.55) * rim})`;
      ctx.translate(1.5, 2);
      ctx.beginPath();
      build(ctx);
      ctx.stroke();
      ctx.translate(-3, -4.5);
      ctx.strokeStyle = `rgba(0,0,0,${0.07 * rim})`;
      ctx.beginPath();
      build(ctx);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    build(ctx);
  }
  if (border) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = !solid ? 'rgba(255,255,255,0.22)' : dark ? 'rgba(255,255,255,0.10)' : 'rgba(16,16,20,0.10)';
    ctx.stroke();
  }
  ctx.restore();
  if (stroke) {
    ctx.save();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    build(ctx);
    ctx.stroke();
    ctx.restore();
  }
}

export const card = (ctx, x, y, w, h, opts = {}) =>
  paper(ctx, c => (opts.torn
    ? tornRectPath(c, x, y, w, h, { seed: opts.seed || `${x},${y}`, rough: opts.rough ?? 5, edges: opts.edges })
    : roundRectPath(c, x, y, w, h, opts.r ?? 22)), opts);

export const disc = (ctx, cx, cy, rad, opts = {}) =>
  paper(ctx, c => cutCirclePath(c, cx, cy, rad, { seed: opts.seed || `${cx},${cy}` }), opts);

// Translucent masking tape with zig-zag torn ends.
export function tape(ctx, cx, cy, w, h, angle = 0, { seed = 'tape', color = C.tape, alpha = 0.82 } = {}) {
  if (isStudio()) return;
  const r = rng(seed);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  const teeth = Math.max(4, Math.round(h / 7));
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  for (let i = 1; i <= teeth; i++) ctx.lineTo(w / 2 + (i % 2 ? 4 + r() * 3 : -r() * 2), -h / 2 + (h * i) / teeth);
  ctx.lineTo(-w / 2, h / 2);
  for (let i = teeth - 1; i >= 0; i--) ctx.lineTo(-w / 2 + (i % 2 ? -4 - r() * 3 : r() * 2), -h / 2 + (h * i) / teeth);
  ctx.closePath();
  ctx.shadowColor = 'rgba(40,20,10,0.12)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = rgba(color, alpha);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 0.5;
  ctx.clip();
  ctx.fillStyle = grainPattern(ctx, 'light');
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.restore();
}

// ---------------------------------------------------------------- text

// Studio display type runs tight (-0.025em at ≥ 34px). Drawing and measuring
// must agree, so every text helper goes through this.
export function trackingFor(size, tracking = 0) {
  return isStudio() && size >= 34 && tracking <= 0 ? -0.025 * size : tracking;
}

export function fitSize(ctx, text, weight, maxW, maxSize, minSize = 18) {
  let size = maxSize;
  const prev = ctx.letterSpacing;
  while (size > minSize) {
    ctx.font = font(weight, size);
    ctx.letterSpacing = `${trackingFor(size)}px`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 2;
  }
  ctx.letterSpacing = prev;
  return size;
}

export function wrapLines(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Shrink-to-fit wrapped text: returns { size, lines } that fit maxW × maxLines.
export function fitWrapped(ctx, text, weight, maxW, maxLines, maxSize, minSize = 20) {
  const prev = ctx.letterSpacing;
  try {
    for (let size = maxSize; size >= minSize; size -= 2) {
      ctx.font = font(weight, size);
      ctx.letterSpacing = `${trackingFor(size)}px`;
      const lines = wrapLines(ctx, text, maxW);
      if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= maxW)) return { size, lines };
    }
    // Still too long at the minimum size: keep maxLines and end the last with "…",
    // trimming any word that is wider than the box on its own.
    ctx.font = font(weight, minSize);
    ctx.letterSpacing = `${trackingFor(minSize)}px`;
    const all = wrapLines(ctx, text, maxW);
    const lines = all.slice(0, maxLines);
    const fit = l => {
      let out = l;
      while (out.length > 1 && ctx.measureText(`${out}…`).width > maxW) out = out.slice(0, -1).trimEnd();
      return `${out}…`;
    };
    lines.forEach((l, i) => { if (ctx.measureText(l).width > maxW) lines[i] = fit(l); });
    if (all.length > maxLines) lines[maxLines - 1] = fit(lines[maxLines - 1].replace(/…$/, ''));
    return { size: minSize, lines };
  } finally {
    ctx.letterSpacing = prev;
  }
}

export function text(ctx, str, x, y, { weight = 800, size = 40, color = C.ink, align = 'center', baseline = 'middle', tracking = 0 } = {}) {
  ctx.save();
  ctx.font = font(weight, size);
  ctx.fillStyle = color;
  ctx.textBaseline = baseline;
  // The site's display type runs tight; uppercase labels that ask for positive
  // tracking keep it.
  if (isStudio() && size >= 34 && tracking <= 0) {
    ctx.letterSpacing = `${trackingFor(size)}px`;
    tracking = 0;
  }
  if (!tracking) {
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
  } else {
    // Manual tracking for all-caps labels. With positive tracking the word
    // spaces open up too (WORD_GAP), so a narrow glyph before a space
    // ("2.1 IS") can't close the gap.
    const chars = [...str];
    const widths = trackedWidths(ctx, chars, tracking > 0 ? size : 0);
    const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    ctx.textAlign = 'left';
    chars.forEach((ch, i) => {
      ctx.fillText(ch, cx, y);
      cx += widths[i] + tracking;
    });
  }
  ctx.restore();
}

// Extra word space in manually tracked text, as a share of the font size.
const WORD_GAP = 0.12;
function trackedWidths(ctx, chars, size) {
  return chars.map(ch => ctx.measureText(ch).width + (ch === ' ' ? size * WORD_GAP : 0));
}

export function measure(ctx, str, weight, size, tracking = 0) {
  ctx.save();
  ctx.font = font(weight, size);
  const tr = trackingFor(size, tracking);
  let w;
  if (tr < 0) {
    ctx.letterSpacing = `${tr}px`;
    w = ctx.measureText(str).width;
  } else if (tracking > 0) {
    // Exactly what text() draws: glyph by glyph, tracked, wider word gaps.
    const chars = [...str];
    w = trackedWidths(ctx, chars, size).reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);
  } else {
    w = ctx.measureText(str).width;
  }
  ctx.restore();
  return w;
}

// ---------------------------------------------------------------- transforms

export function withT(ctx, { x = 0, y = 0, rot = 0, scale = 1, sx = 1, sy = 1, alpha = 1 } = {}, fn) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (scale !== 1 || sx !== 1 || sy !== 1) ctx.scale(scale * sx, scale * sy);
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  fn(ctx);
  ctx.restore();
}

export const pinkGradient = (ctx, x0, y0, x1, y1) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, C.pinkStart);
  g.addColorStop(1, C.pinkEnd);
  return g;
};

export { shade };
