// Paints a code scene's element tree (scene.mjs: SVG elements from the JSX interpreter, react-scene.mjs) onto a 2D
// canvas, synchronously, in frame pixels: g, rect, circle, ellipse, line, polyline, polygon, path, text (with tspans,
// and the `width` wrap and `maxLines` fit), image (media by id; `rx` rounds it), nested svg, linear and
// radial gradients, clip paths, transforms, opacity, dashes and a `shadow`. Anything else is skipped.
// `env`: { image(id) → drawable | null, font(weight, size, family 'sans'|'serif'|'mono', italic) → CSS font, Path2D, ink,
// backdrop? }.
//
// With `backdrop` (the color the scene is drawn on), every word is kept readable whatever the colors: before a word is
// drawn, the color right behind it is worked out from the backdrop and the shapes already painted there (see-through
// ones blended in), and a word below WCAG contrast with it (4.5:1, or 3:1 from headline size up) is drawn lighter or
// darker, in its own hue, just until it reads. Words over pictures or gradients, and outlined words, are left as written.

const INHERITED = ['fontFamily', 'fontStyle', 'fill', 'stroke', 'strokeWidth', 'fillOpacity', 'strokeOpacity', 'fontSize', 'fontWeight', 'textAnchor', 'dominantBaseline', 'letterSpacing', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray', 'strokeDashoffset', 'lineHeight'];
const camel = name => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/** An element's attributes with its style merged in, camelCased. */
function attrsOf(node) {
  const out = {};
  for (const [k, v] of Object.entries(node.props || {})) if (k !== 'style') out[camel(k)] = v;
  if (node.props?.style && typeof node.props.style === 'object') for (const [k, v] of Object.entries(node.props.style)) out[camel(k)] = v;
  return out;
}

const n = (v, fallback = 0) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  const x = parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : fallback;
};
const numbers = s => (String(s ?? '').match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);

/** SVG transform list → applied to ctx. */
function applyTransform(ctx, value) {
  if (!value || typeof value !== 'string') return;
  for (const [, fn, args] of value.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const a = numbers(args);
    if (fn === 'translate') ctx.translate(a[0] || 0, a[1] || 0);
    else if (fn === 'scale') ctx.scale(a[0] ?? 1, a[1] ?? a[0] ?? 1);
    else if (fn === 'rotate') {
      const r = ((a[0] || 0) * Math.PI) / 180;
      if (a.length >= 3) { ctx.translate(a[1], a[2]); ctx.rotate(r); ctx.translate(-a[1], -a[2]); } else ctx.rotate(r);
    } else if (fn === 'skewX') ctx.transform(1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0);
    else if (fn === 'skewY') ctx.transform(1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0);
    else if (fn === 'matrix' && a.length === 6) ctx.transform(...a);
  }
}

/** Every element with an id (gradients, clip paths), wherever it sits in the tree. */
function collectIds(tree) {
  const ids = new Map();
  const walk = node => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    if (typeof node.props?.id === 'string') ids.set(node.props.id, node);
    node.children?.forEach(walk);
  };
  walk(tree);
  return ids;
}
const refId = v => (typeof v === 'string' ? (v.match(/^url\(\s*#([^)\s]+)\s*\)$/) || [])[1] ?? null : null);

/** The shape's box, for objectBoundingBox gradients. */
function bbox(tag, a, textBox) {
  switch (tag) {
    case 'rect': case 'image': return { x: n(a.x), y: n(a.y), w: n(a.width), h: n(a.height) };
    case 'circle': return { x: n(a.cx) - n(a.r), y: n(a.cy) - n(a.r), w: 2 * n(a.r), h: 2 * n(a.r) };
    case 'ellipse': return { x: n(a.cx) - n(a.rx), y: n(a.cy) - n(a.ry), w: 2 * n(a.rx), h: 2 * n(a.ry) };
    case 'line': return { x: Math.min(n(a.x1), n(a.x2)), y: Math.min(n(a.y1), n(a.y2)), w: Math.abs(n(a.x2) - n(a.x1)) || 1, h: Math.abs(n(a.y2) - n(a.y1)) || 1 };
    case 'polyline': case 'polygon': case 'path': {
      const p = numbers(tag === 'path' ? String(a.d ?? '').replace(/[a-df-z]/gi, ' ') : a.points);
      if (p.length < 2) return null;
      const xs = p.filter((_, i) => i % 2 === 0), ys = p.filter((_, i) => i % 2 === 1);
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x || 1, h: Math.max(...ys) - y || 1 };
    }
    case 'text': return textBox;
    default: return null;
  }
}

const frac = (v, fallback) => {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v);
  return s.endsWith('%') ? parseFloat(s) / 100 : n(v, fallback);
};
/** A fill or stroke value: a colour, or url(#gradient) built for this shape's box. */
function paintOf(ctx, value, tag, a, ids, box) {
  const id = refId(value);
  if (!id) return value;
  const g = ids.get(id);
  if (!g || (g.tag !== 'linearGradient' && g.tag !== 'radialGradient')) return 'transparent';
  const ga = attrsOf(g);
  const user = ga.gradientUnits === 'userSpaceOnUse';
  const b = user ? { x: 0, y: 0, w: 1, h: 1 } : (box ?? bbox(tag, a) ?? { x: 0, y: 0, w: 1080, h: 1920 });
  const X = v => b.x + v * b.w, Y = v => b.y + v * b.h;
  let grad;
  if (g.tag === 'linearGradient') {
    const [x1, y1, x2, y2] = user ? [n(ga.x1), n(ga.y1), n(ga.x2, 1080), n(ga.y2)] : [X(frac(ga.x1, 0)), Y(frac(ga.y1, 0)), X(frac(ga.x2, 1)), Y(frac(ga.y2, 0))];
    // A gradient with no length paints nothing, as a browser's canvas does (@napi-rs/canvas would throw on the fill).
    if (x1 === x2 && y1 === y2) return 'transparent';
    grad = ctx.createLinearGradient(x1, y1, x2, y2);
  } else {
    const cx = user ? n(ga.cx) : X(frac(ga.cx, 0.5)), cy = user ? n(ga.cy) : Y(frac(ga.cy, 0.5));
    const r = user ? n(ga.r, 100) : frac(ga.r, 0.5) * Math.max(b.w, b.h);
    const fx = ga.fx === undefined ? cx : user ? n(ga.fx) : X(frac(ga.fx, 0.5)), fy = ga.fy === undefined ? cy : user ? n(ga.fy) : Y(frac(ga.fy, 0.5));
    grad = ctx.createRadialGradient(fx, fy, 0, cx, cy, Math.max(0.1, r));
  }
  let stops = 0;
  for (const stop of g.children || []) {
    if (!stop || stop.tag !== 'stop') continue;
    const sa = attrsOf(stop);
    try { grad.addColorStop(Math.max(0, Math.min(1, frac(sa.offset, 0))), withAlpha(String(sa.stopColor ?? '#000'), sa.stopOpacity)); stops++; } catch { /* a bad colour */ }
  }
  // Without a stop it's transparent black, as in a browser.
  return stops ? grad : 'transparent';
}

/** A colour with an extra opacity, for gradient stops. */
function withAlpha(color, opacity) {
  if (opacity === undefined || n(opacity, 1) >= 1) return color;
  const o = Math.max(0, n(opacity, 1));
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return color;
  const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${o})`;
}

// ---------------------------------------------------------------- the contrast guard

/** Contrast a word needs against what's behind it: WCAG AA, and AA for large text from headline size (64 px) up. */
export const READABLE = { text: 4.5, headline: 3, headlineSize: 64 };
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };
/** A solid CSS color as [r, g, b, a], or null when it isn't one this can read (a gradient, a name it doesn't know). */
export function rgbaOf(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s];
  const hex = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    const h = hex[1].length <= 4 ? [...hex[1]].map(c => c + c).join('') : hex[1];
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).concat(h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1);
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if (!m) return null;
  const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return [+m[1], +m[2], +m[3], Math.max(0, Math.min(1, alpha))];
}
const lum = ([r, g, b]) => { const f = v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
/** WCAG contrast between two [r, g, b] colors, 1–21. */
export const contrastOf = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const blend = (under, over, t) => under.map((v, i) => (i < 3 ? v + (over[i] - v) * t : 1));
const css = ([r, g, b]) => `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** The text color moved toward black or white (whichever stands further from `behind`) until it has `need` contrast. */
export function readableOn(text, behind, need) {
  if (contrastOf(text, behind) >= need) return null;
  const toward = contrastOf([0, 0, 0], behind) >= contrastOf([255, 255, 255], behind) ? [0, 0, 0] : [255, 255, 255];
  for (let k = 0.05; k < 1; k += 0.05) { const next = blend(text, toward, k); if (contrastOf(next, behind) >= need) return css(next); }
  return css(toward);
}

/** A box in local coordinates, through the canvas's current transform, as a device-space box. */
function deviceBox(ctx, box) {
  const m = ctx.getTransform();
  const xs = [], ys = [];
  for (const [x, y] of [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
/** What the guard knows was painted: a box and its solid color with how opaque it was (null: a picture or gradient). */
function remember(ctx, guard, box, paint, alpha) {
  if (!guard || !box || !ctx.getTransform) return;
  const color = paint === null ? null : rgbaOf(paint);
  if (color && color[3] * alpha < 0.02) return;
  guard.layers.push({ ...deviceBox(ctx, box), color, alpha: color ? color[3] * alpha : 1 });
}
/** The color behind a device point: the backdrop with every layer over it in paint order; null under a picture. */
function behindAt(guard, x, y) {
  let at = guard.backdrop;
  for (const l of guard.layers) {
    if (x < l.x0 || x > l.x1 || y < l.y0 || y > l.y1) continue;
    if (!l.color) at = null;
    else at = l.alpha >= 0.98 ? l.color : at && blend(at, l.color, l.alpha);
  }
  return at;
}
/** The fill a word is drawn in: as written, or as close to it as reads on what's behind it. */
function guardedFill(ctx, guard, text, x, y, fill, size) {
  const own = rgbaOf(fill);
  if (!guard || !own || !ctx.getTransform || !ctx.measureText) return fill;
  const m = ctx.measureText(text);
  const left = x - (m.actualBoundingBoxLeft ?? 0), right = x + (m.actualBoundingBoxRight ?? m.width ?? 0);
  const top = y - (m.actualBoundingBoxAscent ?? size * 0.7), bottom = y + (m.actualBoundingBoxDescent ?? 0);
  const t = ctx.getTransform(), mid = (top + bottom) / 2;
  // The word's left, middle and right at half height: the least readable of them decides.
  let worst = null, low = Infinity;
  for (const px of [left + (right - left) * 0.1, (left + right) / 2, right - (right - left) * 0.1]) {
    const behind = behindAt(guard, t.a * px + t.c * mid + t.e, t.b * px + t.d * mid + t.f);
    if (!behind) return fill;
    const c = contrastOf(own, behind);
    if (c < low) { low = c; worst = behind; }
  }
  return (worst && readableOn(own, worst, size >= READABLE.headlineSize ? READABLE.headline : READABLE.text)) ?? fill;
}

// ---------------------------------------------------------------- caches
// A scene is painted 30 times a second and most of it doesn't change between frames, so the outlines it parses and
// the lines its text breaks into are kept, keyed by everything that decides them. Painting from a kept one draws the
// same pixels: a Path2D is never changed once made, and a layout is a pure function of its key.

/** Shapes' outlines (an SVG path's `d` parses into one), per Path2D class, by tag and geometry. */
const outlines = new WeakMap();
const OUTLINES = { entries: 1500, chars: 2_000_000 };
function keptOutline(env, key, make) {
  let kept = outlines.get(env.Path2D);
  if (!kept) outlines.set(env.Path2D, kept = { map: new Map(), chars: 0 });
  let path = kept.map.get(key);
  if (!path) {
    if (kept.map.size >= OUTLINES.entries || kept.chars + key.length > OUTLINES.chars) { kept.map.clear(); kept.chars = 0; }
    path = make();
    kept.map.set(key, path);
    kept.chars += key.length;
  }
  return path;
}

/**
 * Text layouts (which tokens go on which line, their widths and the shrink factor), per font function, by the
 * tokens' text and font and the box. Measured widths change when a font finishes loading, so a load empties it.
 */
const layouts = new WeakMap();
const LAYOUTS = 600;
let fontLoads = 0, watchingFonts = false;
function layoutsFor(font) {
  if (!watchingFonts) {
    watchingFonts = true;
    const fonts = globalThis.document?.fonts ?? globalThis.fonts;
    fonts?.addEventListener?.('loadingdone', () => { fontLoads++; });
  }
  let kept = layouts.get(font);
  if (!kept || kept.fonts !== fontLoads) layouts.set(font, kept = { fonts: fontLoads, map: new Map() });
  if (kept.map.size >= LAYOUTS) kept.map.clear();
  return kept.map;
}

/** The outline of a basic shape as a Path2D (shapes, and clip paths' children); kept between frames, so never changed. */
function shapePath(env, tag, a) {
  switch (tag) {
    case 'rect': return keptOutline(env, `r${n(a.x)},${n(a.y)},${n(a.width)},${n(a.height)},${n(a.rx ?? a.ry)}`, () => newShapePath(env, tag, a));
    case 'circle': return keptOutline(env, `c${n(a.cx)},${n(a.cy)},${n(a.r)}`, () => newShapePath(env, tag, a));
    case 'ellipse': return keptOutline(env, `e${n(a.cx)},${n(a.cy)},${n(a.rx)},${n(a.ry)}`, () => newShapePath(env, tag, a));
    case 'line': return keptOutline(env, `l${n(a.x1)},${n(a.y1)},${n(a.x2)},${n(a.y2)}`, () => newShapePath(env, tag, a));
    case 'polyline': case 'polygon': return keptOutline(env, `${tag === 'polygon' ? 'g' : 'y'}${String(a.points ?? '')}`, () => newShapePath(env, tag, a));
    case 'path': return typeof a.d === 'string' && a.d.length < 20000 ? keptOutline(env, `p${a.d}`, () => newShapePath(env, tag, a)) : new env.Path2D();
    default: return null;
  }
}
function newShapePath(env, tag, a) {
  const p = new env.Path2D();
  switch (tag) {
    case 'rect': {
      const x = n(a.x), y = n(a.y), w = Math.max(0, n(a.width)), h = Math.max(0, n(a.height));
      const r = Math.min(n(a.rx ?? a.ry), w / 2, h / 2);
      if (r > 0 && p.roundRect) p.roundRect(x, y, w, h, r);
      else p.rect(x, y, w, h);
      return p;
    }
    case 'circle': p.arc(n(a.cx), n(a.cy), Math.max(0, n(a.r)), 0, Math.PI * 2); return p;
    case 'ellipse': p.ellipse(n(a.cx), n(a.cy), Math.max(0, n(a.rx)), Math.max(0, n(a.ry)), 0, 0, Math.PI * 2); return p;
    case 'line': p.moveTo(n(a.x1), n(a.y1)); p.lineTo(n(a.x2), n(a.y2)); return p;
    case 'polyline': case 'polygon': {
      const pts = numbers(a.points);
      for (let i = 0; i + 1 < pts.length; i += 2) (i ? p.lineTo(pts[i], pts[i + 1]) : p.moveTo(pts[i], pts[i + 1]));
      if (tag === 'polygon') p.closePath();
      return p;
    }
    case 'path': return typeof a.d === 'string' && a.d.length < 20000 ? new env.Path2D(a.d) : p;
    default: return null;
  }
}

function applyClip(ctx, env, ids, value) {
  const id = refId(value);
  const clip = id ? ids.get(id) : null;
  if (!clip || clip.tag !== 'clipPath') return;
  const path = new env.Path2D();
  for (const child of clip.children || []) {
    if (!child || typeof child !== 'object' || Array.isArray(child)) continue;
    const ca = attrsOf(child);
    const shape = shapePath(env, child.tag, ca);
    if (!shape) continue;
    const m = new DOMMatrixLike(ca.transform);
    path.addPath(shape, m.value);
  }
  ctx.clip(path);
}
// A transform attribute as a DOMMatrix when the platform has one (clip path children); identity otherwise.
function DOMMatrixLike(transform) {
  const M = globalThis.DOMMatrix;
  if (!M || !transform) return { value: undefined };
  const m = new M();
  for (const [, fn, args] of String(transform).matchAll(/(matrix|translate|scale|rotate)\s*\(([^)]*)\)/g)) {
    const a = numbers(args);
    if (fn === 'translate') m.translateSelf(a[0] || 0, a[1] || 0);
    else if (fn === 'scale') m.scaleSelf(a[0] ?? 1, a[1] ?? a[0] ?? 1);
    else if (fn === 'rotate') { if (a.length >= 3) { m.translateSelf(a[1], a[2]); m.rotateSelf(a[0] || 0); m.translateSelf(-a[1], -a[2]); } else m.rotateSelf(a[0] || 0); }
    else if (fn === 'matrix' && a.length === 6) m.multiplySelf(new M(a));
  }
  return { value: m };
}

function setShadow(ctx, value) {
  if (typeof value !== 'string') return;
  const m = value.match(/^\s*(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)\s+(.+)$/);
  if (!m) return;
  ctx.shadowOffsetX = +m[1]; ctx.shadowOffsetY = +m[2]; ctx.shadowBlur = +m[3]; ctx.shadowColor = m[4].trim();
}

function strokeStyle(ctx, st) {
  ctx.lineWidth = Math.max(0, n(st.strokeWidth, 1));
  ctx.lineCap = ['butt', 'round', 'square'].includes(st.strokeLinecap) ? st.strokeLinecap : 'butt';
  ctx.lineJoin = ['miter', 'round', 'bevel'].includes(st.strokeLinejoin) ? st.strokeLinejoin : 'miter';
  const dash = st.strokeDasharray && st.strokeDasharray !== 'none' ? numbers(st.strokeDasharray).filter(x => x >= 0) : [];
  ctx.setLineDash(dash.length && dash.some(x => x > 0) ? dash : []);
  ctx.lineDashOffset = n(st.strokeDashoffset);
}

function fillAndStroke(ctx, env, path, tag, a, st, ids, box) {
  const fill = st.fill ?? 'none';
  if (fill !== 'none' && fill !== 'transparent' && tag !== 'line') {
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, n(st.fillOpacity, 1)));
    const paint = paintOf(ctx, fill, tag, a, ids, box);
    ctx.fillStyle = paint;
    ctx.fill(path, a.fillRule === 'evenodd' ? 'evenodd' : 'nonzero');
    // The shape's box is worked out only for the contrast guard (a long path's is costly).
    if (env.guard) remember(ctx, env.guard, bbox(tag, a), typeof paint === 'string' ? paint : null, ctx.globalAlpha);
    ctx.restore();
  }
  const stroke = st.stroke;
  if (stroke && stroke !== 'none' && n(st.strokeWidth, 1) > 0) {
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha *= Math.max(0, Math.min(1, n(st.strokeOpacity, 1)));
    ctx.strokeStyle = paintOf(ctx, stroke, tag, a, ids, box);
    strokeStyle(ctx, st);
    ctx.stroke(path);
    ctx.restore();
  }
}

const textOf = node => (node === null || node === undefined || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(textOf).join('') : node.tag === 'tspan' ? textOf(node.children) : '');
const weightOf = (v, fallback = 700) => Math.round(Math.max(100, Math.min(900, n(v === 'bold' ? 700 : v === 'normal' ? 400 : v, fallback))) / 100) * 100;

/** A text element's runs: its strings and tspans (nested ones flattened), each with its own style. */
function runsOf(children, st, out = []) {
  for (const c of children || []) {
    if (c === null || c === undefined || c === false || c === true) continue;
    if (typeof c === 'string' || typeof c === 'number') out.push({ text: String(c), st, a: {} });
    else if (Array.isArray(c)) runsOf(c, st, out);
    else if (c.tag === 'tspan') {
      const a = attrsOf(c);
      const inner = { ...st, ...inherit(a) };
      const first = out.length;
      runsOf(c.children, inner, out);
      if (out[first]) out[first] = { ...out[first], a };
    }
  }
  return out;
}

function drawText(ctx, env, node, a, st, ids) {
  const base = Math.max(4, n(st.fontSize, 40));
  const anchor = st.textAnchor === 'middle' ? 'center' : st.textAnchor === 'end' ? 'right' : 'left';
  const baseline = { middle: 'middle', central: 'middle', hanging: 'top', 'text-before-edge': 'top', 'text-after-edge': 'bottom' }[st.dominantBaseline] ?? 'alphabetic';
  const runs = runsOf(node.children, st);
  if (!runs.length) return;
  ctx.textBaseline = baseline;
  ctx.textAlign = 'left';
  const x = n(a.x), y = n(a.y), width = n(a.width, 0);
  // Tspans placed at their own x/y draw where they say (no wrapping).
  if (!width && runs.some(r => r.a.x !== undefined || r.a.y !== undefined)) {
    let cx = x, cy = y;
    for (const r of runs) {
      if (r.a.x !== undefined) cx = n(r.a.x);
      if (r.a.y !== undefined) cy = n(r.a.y);
      cx += n(r.a.dx); cy += n(r.a.dy);
      const size = Math.max(4, n(r.st.fontSize, base));
      setFont(ctx, env, r.st, size);
      ctx.textAlign = anchor;
      const w = ctx.measureText(r.text).width;
      paintRun(ctx, env, r.text, cx, cy, a, r.st, ids, { x: cx, y: cy - size, w, h: size }, size);
      if (anchor === 'left') cx += w;
    }
    return;
  }
  // Words with their run's style, laid out in lines: wrapped to `width` when set, shrunk until they fit `maxLines`.
  const tokens = [];
  for (const r of runs) {
    r.text.split(/(\n)/).forEach(part => {
      if (part === '\n') { tokens.push({ br: true }); return; }
      for (const m of part.matchAll(/(\s*)(\S+)/g)) tokens.push({ text: m[2], space: m[1].length > 0 || null, st: r.st });
      if (/\s$/.test(part) && tokens.length) tokens.push({ text: '', space: true, st: r.st });
    });
  }
  const maxLines = a.maxLines !== undefined ? Math.max(1, Math.round(n(a.maxLines, 1))) : Infinity;
  let k = 1, lines;
  // The layout depends on the tokens, their fonts and the box only; a frame that repeats them reuses it (caches above).
  const kept = layoutsFor(env.font);
  const key = JSON.stringify([width, maxLines, base, 'letterSpacing' in ctx, tokens.map(t => (t.br ? 0 : [t.text, t.space, weightOf(t.st.fontWeight), n(t.st.fontSize, base), t.st.fontFamily ?? null, t.st.fontStyle ?? null, n(t.st.letterSpacing)]))]);
  const known = kept.get(key);
  const layout = () => {
    lines = [[]];
    let lineW = 0;
    tokens.forEach((t, i) => {
      if (t.br) { lines.push([]); lineW = 0; return; }
      setFont(ctx, env, t.st, n(t.st.fontSize, base) * k);
      const w = ctx.measureText(t.text).width, sp = t.space && lines.at(-1).length ? ctx.measureText(' ').width : 0;
      if (width > 0 && lines.at(-1).length && lineW + sp + w > width) { lines.push([]); lineW = 0; t.lead = 0; }
      else t.lead = sp;
      t.w = w;
      lines.at(-1).push({ ...t, i });
      lineW += t.lead + w;
    });
    lines = lines.filter((l, i) => l.length || i < lines.length - 1);
  };
  if (known) {
    k = known.k;
    lines = known.lines.map(line => line.map(({ i, lead, w }) => ({ ...tokens[i], lead, w })));
  } else {
    layout();
    const fits = () => lines.length <= maxLines && (!width || lines.every(l => l.reduce((w, t) => w + t.lead + t.w, 0) <= width + 0.5));
    while (width > 0 && maxLines !== Infinity && !fits() && k > 0.55) { k -= 0.04; layout(); }
    kept.set(key, { k, lines: lines.map(line => line.map(({ i, lead, w }) => ({ i, lead, w }))) });
  }
  const lh = base * k * n(st.lineHeight, 1.15);
  const top = baseline === 'middle' ? y - ((lines.length - 1) * lh) / 2 : y;
  const widths = lines.map(l => l.reduce((w, t) => w + t.lead + t.w, 0));
  const widest = Math.max(1, ...widths);
  const box = { x: anchor === 'center' ? x - widest / 2 : anchor === 'right' ? x - widest : x, y: top - base * k, w: widest, h: lines.length * lh };
  lines.forEach((line, i) => {
    let cx = anchor === 'center' ? x - widths[i] / 2 : anchor === 'right' ? x - widths[i] : x;
    for (const t of line) {
      cx += t.lead;
      setFont(ctx, env, t.st, n(t.st.fontSize, base) * k);
      paintRun(ctx, env, t.text, cx, top + i * lh, a, t.st, ids, box, n(t.st.fontSize, base) * k);
      cx += t.w;
    }
  });
}
function setFont(ctx, env, st, size) {
  ctx.font = env.font(weightOf(st.fontWeight), Math.max(4, size), st.fontFamily === 'serif' || st.fontFamily === 'mono' ? st.fontFamily : 'sans', st.fontStyle === 'italic');
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${n(st.letterSpacing)}px`;
}

function paintRun(ctx, env, text, x, y, a, st, ids, box, size) {
  if (!text) return;
  const fill = st.fill ?? 'none';
  const outlined = st.stroke && st.stroke !== 'none' && n(st.strokeWidth, 1) > 0;
  if (outlined) {
    ctx.save();
    ctx.strokeStyle = paintOf(ctx, st.stroke, 'text', a, ids, box);
    strokeStyle(ctx, st);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.restore();
  }
  if (fill !== 'none' && fill !== 'transparent') {
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, n(st.fillOpacity, 1)));
    const paint = paintOf(ctx, fill, 'text', a, ids, box);
    ctx.fillStyle = typeof paint === 'string' && !outlined ? guardedFill(ctx, env.guard, text, x, y, paint, size) : paint;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}

function drawImage(ctx, env, a) {
  const img = env.image(a.href ?? a.xlinkHref);
  const x = n(a.x), y = n(a.y), w = n(a.width), h = n(a.height);
  if (!img || w <= 0 || h <= 0) return;
  remember(ctx, env.guard, { x, y, w, h }, null, ctx.globalAlpha);
  const iw = img.width || img.videoWidth || 0, ih = img.height || img.videoHeight || 0;
  if (!iw || !ih) return;
  const par = String(a.preserveAspectRatio ?? 'xMidYMid meet');
  ctx.save();
  const r = n(a.rx, 0);
  if (r > 0) { const p = new env.Path2D(); if (p.roundRect) p.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); else p.rect(x, y, w, h); ctx.clip(p); }
  if (par === 'none') ctx.drawImage(img, x, y, w, h);
  else {
    const k = par.includes('slice') ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
    const dw = iw * k, dh = ih * k;
    if (par.includes('slice')) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  ctx.restore();
}

function inherit(a) {
  const out = {};
  for (const k of INHERITED) if (a[k] !== undefined) out[k] = a[k];
  return out;
}

function draw(ctx, env, node, st, ids, depth) {
  if (depth > 60 || node === null || node === undefined || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const c of node) draw(ctx, env, c, st, ids, depth + 1); return; }
  const { tag } = node;
  if (['defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath'].includes(tag)) return;
  const a = attrsOf(node);
  if (a.display === 'none' || a.visibility === 'hidden') return;
  const opacity = Math.max(0, Math.min(1, n(a.opacity, 1)));
  if (opacity <= 0) return;
  const style = { ...st, ...inherit(a) };
  ctx.save();
  ctx.globalAlpha *= opacity;
  applyTransform(ctx, a.transform);
  if (a.clipPath) applyClip(ctx, env, ids, a.clipPath);
  if (a.shadow) setShadow(ctx, a.shadow);
  switch (tag) {
    case 'svg': {
      if (depth > 0) {
        ctx.translate(n(a.x), n(a.y));
        const vb = numbers(a.viewBox);
        if (vb.length === 4 && vb[2] > 0 && vb[3] > 0 && a.width !== undefined) {
          const k = Math.min(n(a.width) / vb[2], n(a.height, n(a.width)) / vb[3]);
          ctx.scale(k, k);
          ctx.translate(-vb[0], -vb[1]);
        }
      }
      for (const c of node.children) draw(ctx, env, c, style, ids, depth + 1);
      break;
    }
    case 'g':
      for (const c of node.children) draw(ctx, env, c, style, ids, depth + 1);
      break;
    case 'text':
      drawText(ctx, env, node, a, style, ids);
      break;
    case 'image':
      drawImage(ctx, env, a);
      break;
    default: {
      const path = shapePath(env, tag, a);
      if (path) fillAndStroke(ctx, env, path, tag, a, style, ids, null);
    }
  }
  ctx.restore();
}

/** Paints `tree` onto ctx. Throws only for a broken canvas; a bad attribute just draws less. */
export function paintCodeTree(ctx, tree, env) {
  const ids = collectIds(tree);
  // The guard runs for a scene drawn in a look (`backdrop` given; null when it isn't one flat color, so only words over
  // the scene's own shapes are checked), not for a character.
  const guard = 'backdrop' in env && ctx.getTransform ? { backdrop: rgbaOf(env.backdrop), layers: [] } : null;
  draw(ctx, { ...env, guard }, tree, { fill: env.ink || '#000' }, ids, 0);
}
