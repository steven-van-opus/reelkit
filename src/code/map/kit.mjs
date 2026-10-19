// The map kit a code scene draws countries with (scene.mjs land() and geo()). A model can't draw a coastline from
// memory, so a scene names countries by code and the kit fits their real outlines (Natural Earth, built by
// scripts/build-map-kit.mjs) into a box on the stage:
//   land('FR', x, y, w, h)              France's outline as path data, fitted in the box (aspect kept, centred)
//   land(['US', 'CA', 'MX'], x, y, w, h) several on one map, fitted together, as one path
//   land(['US', 'CA'], x, y, w, h, 'CA') only Canada, on the map the two make: a country in its own colour
//   land('FR', x, y, w, h, ['ES', 'DE']) France's map with its neighbours on it, cut off at the box's edges
//   land([-170, 50, -125, 72], x, y, w, h, ['US-AK', 'CA', 'RU'])  a box of longitudes and latitudes (west, south,
//                                        east, north) as the map, with the countries to draw on it, cut to the box
//   land(fit, x, y, w, h, '*')          every country the box shows, on that map: the land under a view, so no
//                                        neighbour in frame is left out as sea (to whole pixels; on a world's worth
//                                        of countries the renderer leaves out the smallest, which are specks there)
//   geo(lon, lat, fit, x, y, w, h)      the point [px, py] on the same map (fit as land's), for cities and arrows
// Countries are projected in Web Mercator, which keeps every country's familiar shape and lets any countries share a
// map; Antarctica, which Mercator can't show, is seen from above the South Pole and drawn on its own. Each country has
// at most 400 points, chosen for it filling the stage: a close-up far inside a big country is coarse.
//
// Only the renderer has the outlines (map/shapes.mjs, about 150 KB): src/canvas.mjs gives them to the kit. Everywhere
// else (the validator's checks of the writer's code) a country is drawn as its box, which is
// exactly where its outline reaches (the points on the box's edges are always kept), so every check that measures a
// scene (on the stage, filling it, text over shapes, flashing) gives the same answer with or without the outlines. A
// country cut off by the box is drawn as the part of its box inside it, which its outline may not fill.
import { parse } from '@babel/parser';
import { MAP_COUNTRIES, MAP_UNIT } from './countries.mjs';

/** The longest path land() returns: the scene interpreter refuses text over 12,000 characters (react-scene.mjs). */
export const MAP_PATH_MAX = 11500;
/** Outline points closer than this, in px, are merged as a country is drawn smaller than its stage fit. */
const MERGE_PX = 0.75;

// The outlines, once the renderer provides them.
let shapes = null;
/** Gives the kit its outlines (map/shapes.mjs, imported by the renderer). */
export function provideMapShapes(value) {
  shapes = value;
}
const outlines = () => shapes;

const RAD = Math.PI / 180;
const WORLD = 360 * MAP_UNIT;
const mercator = (lat) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * RAD) / 2)) / RAD;
const polar = (lon, lat) => [(90 + lat) * Math.sin(lon * RAD) * MAP_UNIT, (90 + lat) * Math.cos(lon * RAD) * MAP_UNIT];
const isPolar = (e) => e.length > 5;

// What a writer might try instead of a code, and the code it means.
const ALIASES = { UK: 'GB', EL: 'GR', KV: 'XK', KOS: 'XK', USA: 'US', UAE: 'AE', ALASKA: 'US-AK', HAWAII: 'US-HI' };
const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '');

/** A country code as the kit keys it ('fr' → 'FR'), or a clear error naming what to write instead. */
function entryOf(value, fn) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const code = raw.toUpperCase();
  const entry = MAP_COUNTRIES[code];
  if (entry) return [code, entry];
  const shown = typeof value === 'string' ? `'${value.slice(0, 40)}'` : String(value).slice(0, 40);
  const alias = ALIASES[code] ?? ALIASES[fold(raw).toUpperCase()];
  const named = !alias && raw.length > 3 ? Object.entries(MAP_COUNTRIES).find(([, e]) => fold(e[4]) === fold(raw)) ?? Object.entries(MAP_COUNTRIES).find(([, e]) => fold(e[4]).startsWith(fold(raw))) : undefined;
  if (alias) throw new Error(`${fn}(${shown}): use '${alias}' (${MAP_COUNTRIES[alias][4]}); the map kit takes ISO 3166 codes`);
  if (named) throw new Error(`${fn}(${shown}): use the country's ISO code, '${named[0]}' for ${named[1][4]}`);
  throw new Error(`${fn}(${shown}) isn't a country the map kit knows; use ISO 3166-1 alpha-2 codes such as 'FR', 'US', 'JP' or 'BR' (far parts have their own: 'US-AK' Alaska, 'US-HI' Hawaii, 'PT-20' the Azores, 'ES-CN' the Canary Islands, 'GF' French Guiana; Kosovo is 'XK', Northern Cyprus 'XC', Somaliland 'XS')`);
}

/** A map: the countries it was fitted to (each moved by a whole turn of longitude to sit next to the first), and its box in grid units. */

const isWindow = (v) => Array.isArray(v) && v.length === 4 && v.every(n => typeof n === 'number' && Number.isFinite(n));
const codesOf = (v, fn) => {
  const list = Array.isArray(v) ? v : [v];
  if (!list.length || list.length > 64) throw new Error(`${fn}() takes a country code ('FR'), a list of codes (['FR', 'DE']) or a box of longitudes and latitudes ([west, south, east, north])`);
  return [...new Set(list.map(c => entryOf(c, fn)[0]))];
};
/** A whole number of turns that moves x nearest to `to` (the map's centre): the Pacific's countries sit together. */
const turn = (x, to) => Math.round((to - x) / WORLD) * WORLD;
const middle = (e) => (e[0] + e[2]) / 2;

function mapOf(fit, fn) {
  if (isWindow(fit)) {
    const [w, s, e0, n] = fit, e = e0 < w ? e0 + 360 : e0;
    if (n <= s || e - w <= 0) throw new Error(`${fn}([west, south, east, north]): the box needs north above south and some width`);
    return { polar: false, box: [w * MAP_UNIT, mercator(s) * MAP_UNIT, e * MAP_UNIT, mercator(n) * MAP_UNIT], center: ((w + e) / 2) * MAP_UNIT, codes: [] };
  }
  const codes = codesOf(fit, fn), first = MAP_COUNTRIES[codes[0]], polarMap = isPolar(first);
  const center = middle(first);
  let box = null;
  for (const code of codes) {
    const e = MAP_COUNTRIES[code];
    if (isPolar(e) !== polarMap) throw new Error(`${fn}(): Antarctica ('AQ') is drawn on its own, seen from above the South Pole; it can't share a map with other countries`);
    const dx = polarMap ? 0 : turn(middle(e), center);
    box = box ? [Math.min(box[0], e[0] + dx), Math.min(box[1], e[1]), Math.max(box[2], e[2] + dx), Math.max(box[3], e[3])] : [e[0] + dx, e[1], e[2] + dx, e[3]];
  }
  return { polar: polarMap, box: box, center, codes };
}

/** The fit of a map into the box x, y, w, h: aspect kept, centred. */
function placement(map, x, y, w, h) {
  const [x0, y0, x1, y1] = map.box, bw = Math.max(1e-9, x1 - x0), bh = Math.max(1e-9, y1 - y0);
  const s = Math.min(Math.max(1, w) / bw, Math.max(1, h) / bh);
  const ox = x + (Math.max(1, w) - bw * s) / 2, oy = y + (Math.max(1, h) - bh * s) / 2;
  return { s, px: (gx) => ox + (gx - x0) * s, py: (gy) => oy + (y1 - gy) * s };
}

// Codes whose land is already inside another code's outline (Natural Earth's Cyprus and Somalia include them), left
// out of '*' so the same land isn't drawn twice.
const WITHIN = new Set(['XC', 'XS']);
/** '*' leaves out a country whose part in view is smaller than this, in px both ways: a speck, not land to see. */
const SPECK_PX = 2;
/** '*': every code whose box shows in the box x, y, w, h on this map (more than a speck of it), in the index's order. */
function codesIn(map, at, [l, t, r, b]) {
  return Object.keys(MAP_COUNTRIES).filter(code => shownSize(code, map, at, [l, t, r, b]) >= SPECK_PX);
}
/** How big a code's box shows in the box on this map, in px (its larger side; 0 when it's out of view or can't share it). */
function shownSize(code, map, at, [l, t, r, b]) {
  const e = MAP_COUNTRIES[code];
  if (WITHIN.has(code) || isPolar(e) !== map.polar) return 0;
  const dx = map.polar ? 0 : turn(middle(e), map.center);
  const w = Math.min(at.px(e[2] + dx), r) - Math.max(at.px(e[0] + dx), l), h = Math.min(at.py(e[1]), b) - Math.max(at.py(e[3]), t);
  return w > 0 && h > 0 ? Math.max(w, h) : 0;
}

/** A coordinate to a tenth of a pixel, or to whole pixels (`step` 1) for '*', which holds many countries in one path. */
const fmt = (v, step = 10) => { const r = Math.round(v * step) / step; return String(r === 0 ? 0 : r); };

// Each code's rings, decoded once: absolute grid units, x and y interleaved.
const decoded = new Map();
function ringsOf(code, text) {
  const known = decoded.get(code);
  if (known) return known;
  const e = MAP_COUNTRIES[code];
  let x = e[0], y = e[1];
  const rings = text.split(' ').map(part => {
    const out = [];
    let i = 0;
    while (i < part.length) {
      for (let axis = 0; axis < 2; axis++) {
        let v = 0, shift = 0, b;
        do { b = part.charCodeAt(i++) - 63; v |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && i < part.length);
        const d = v & 1 ? ~(v >> 1) : v >> 1;
        if (axis) out.push((y += d)); else out.push((x += d));
      }
    }
    return Int32Array.from(out);
  });
  decoded.set(code, rings);
  return rings;
}

/** Sutherland–Hodgman: a ring (x, y interleaved, with a keep flag per point) clipped to a box; points the clip makes are kept. */
function clipRing(xy, keep, [l, t, r, b]) {
  let pts = xy, flags = keep;
  for (const [axis, bound, low] of [[0, l, true], [0, r, false], [1, t, true], [1, b, false]]) {
    const n = pts.length / 2, outPts = [], outFlags = [];
    const inside = (v) => (low ? v >= bound : v <= bound);
    for (let i = 0; i < n; i++) {
      const j = (i + n - 1) % n, cv = pts[2 * i + axis], pv = pts[2 * j + axis];
      if (inside(cv) !== inside(pv)) {
        const k = (bound - pv) / (cv - pv);
        outPts.push(pts[2 * j] + (pts[2 * i] - pts[2 * j]) * k, pts[2 * j + 1] + (pts[2 * i + 1] - pts[2 * j + 1]) * k);
        outFlags.push(true);
      }
      if (inside(cv)) { outPts.push(pts[2 * i], pts[2 * i + 1]); outFlags.push(flags[i]); }
    }
    pts = outPts; flags = outFlags;
    if (!pts.length) break;
  }
  return [pts, flags];
}

/**
 * One code's path on a placed map, clipped to the map's box, merging points closer than `merge` px. The points on its
 * box's edges always stay, so a country inside the box reaches exactly the corners its stand-in draws.
 */
function codePath(code, dx, at, merge, clip, step = 10) {
  const e = MAP_COUNTRIES[code], text = outlines()?.[code];
  const left = at.px(e[0] + dx), right = at.px(e[2] + dx), top = at.py(e[3]), bottom = at.py(e[1]);
  const inside = left >= clip[0] - 0.01 && right <= clip[2] + 0.01 && top >= clip[1] - 0.01 && bottom <= clip[3] + 0.01;
  // Without the outlines (the server's checks): the country's box (the part of it on the map), where its outline reaches.
  if (!text) {
    const [l, t, r, b] = inside ? [left, top, right, bottom] : [Math.max(left, clip[0]), Math.max(top, clip[1]), Math.min(right, clip[2]), Math.min(bottom, clip[3])];
    return l < r && t < b ? `M${fmt(l, step)} ${fmt(b, step)} ${fmt(r, step)} ${fmt(b, step)} ${fmt(r, step)} ${fmt(t, step)} ${fmt(l, step)} ${fmt(t, step)}Z` : '';
  }
  const parts = [];
  for (const ring of ringsOf(code, text)) {
    let xy = [], keep = [];
    for (let k = 0; k < ring.length; k += 2) {
      xy.push(at.px(ring[k] + dx), at.py(ring[k + 1]));
      keep.push(ring[k] === e[0] || ring[k] === e[2] || ring[k + 1] === e[1] || ring[k + 1] === e[3]);
    }
    if (!inside) [xy, keep] = clipRing(xy, keep, clip);
    let lx = Infinity, ly = Infinity, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, holdsEdge = false;
    const pts = [];
    for (let k = 0; k < keep.length; k++) {
      const x = xy[2 * k], y = xy[2 * k + 1];
      holdsEdge ||= keep[k];
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      if (!keep[k] && pts.length && Math.hypot(x - lx, y - ly) < merge) continue;
      pts.push(`${fmt(x, step)} ${fmt(y, step)}`);
      lx = x; ly = y;
    }
    // An island smaller than the merge distance is left out, unless it marks one of the country's edges.
    if (!pts.length || (!holdsEdge && (Math.max(maxX - minX, maxY - minY) < merge || pts.length < 3))) continue;
    parts.push(`M${pts.join(' ')}Z`);
  }
  return parts.join('');
}

/**
 * land(fit, x, y, w, h, draw?): path data for the countries `draw` (by default the map's own; '*' every country the box
 * shows), on the map `fit` placed in the box, clipped to the box: a neighbour drawn on a country's map shows only the
 * part of it the box frames.
 */
export function landPath(fit, x, y, w, h, draw) {
  const map = mapOf(fit, 'land');
  const at = placement(map, x, y, w, h), clip = [x, y, x + Math.max(1, w), y + Math.max(1, h)];
  const codes = draw === undefined || draw === null ? map.codes : draw === '*' ? codesIn(map, at, clip) : codesOf(draw, 'land');
  if (!codes.length && draw !== '*') throw new Error(`land([west, south, east, north], x, y, w, h, codes): a map of longitudes and latitudes needs the countries to draw on it, e.g. land([-10, 35, 30, 60], 70, 300, 940, 900, ['FR', 'DE', 'IT']), or '*' for every country it shows`);
  for (const code of codes) if (isPolar(MAP_COUNTRIES[code]) !== map.polar) throw new Error(`land(): Antarctica ('AQ') is drawn on its own, seen from above the South Pole; it can't share a map with other countries`);
  const key = `${outlines() ? 1 : 0}|${JSON.stringify([fit, x, y, w, h, codes])}`;
  const cached = paths.get(key);
  if (cached !== undefined) return cached;
  let out = '', list = codes;
  const all = draw === '*', step = all ? 1 : 10;
  for (let merge = MERGE_PX, tries = 0; ; merge *= 1.7, tries++) {
    out = list.map(code => codePath(code, map.polar ? 0 : turn(middle(MAP_COUNTRIES[code]), map.center), at, merge, clip, step)).join('');
    if (out.length <= MAP_PATH_MAX) break;
    // '*' on a world's worth of countries: rather than coarsening the big ones past recognition (or refusing the view),
    // the smallest in view go first, a fifth at a time (only the renderer, with the outlines, ever gets here).
    if (all && merge > 15 && list.length > 8) {
      const size = new Map(list.map(c => [c, shownSize(c, map, at, clip)]));
      const cut = [...list].sort((a, b) => size.get(a) - size.get(b))[Math.floor(list.length / 5)];
      list = list.filter(c => size.get(c)> size.get(cut));
      merge /= 1.7; tries--;
      continue;
    }
    if (tries > 12) throw new Error(`land(): ${codes.length} countries are too much outline for one path; draw them in a few land() calls (the same map, a few codes each as its last argument)`);
  }
  if (paths.size >= 64) paths.delete(paths.keys().next().value);
  paths.set(key, out);
  return out;
}
const paths = new Map();

/** geo(lon, lat, fit, x, y, w, h): where a place is, [px, py], on the map land() draws for the same fit and box. */
export function geoPoint(lon, lat, fit, x, y, w, h) {
  const map = mapOf(fit, 'geo'), at = placement(map, x, y, w, h);
  const [gx, gy] = map.polar ? polar(lon, lat) : [lon * MAP_UNIT, mercator(lat) * MAP_UNIT];
  const px = at.px(map.polar ? gx : gx + turn(gx, map.center)), py = at.py(gy);
  return [Math.round(px * 10) / 10, Math.round(py * 10) / 10];
}

/** The map kit's codes and names (for tests and the writer's checks). */
export const mapCodes = () => Object.keys(MAP_COUNTRIES);

/**
 * The most points one outline in a scene's source is traced with by hand, read from the parsed source (comments and
 * JSX text never count): a path's `d` or a polygon's `points` written out as a string (pieces joined with + and
 * template literals count their written-out numbers, never the values put in them), a list of [x, y] pairs or a flat
 * list of numbers. Curves count once per segment (a drawn shape, not a trace). Source that doesn't parse counts 0: the
 * scene's other checks report it.
 */
export function handTracedPoints(source) {
  let program;
  try { program = parse(source, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }).program; } catch { return 0; }
  let most = 0;
  const seen = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const n = node;
    // A string written out, or pieces of one (a + chain's top only: its parts are read with it).
    if (!seen.has(n) && (n.type === 'StringLiteral' || n.type === 'TemplateLiteral' || (n.type === 'BinaryExpression' && n.operator === '+'))) {
      const text = written(n, seen);
      if (text !== null) most = Math.max(most, outlinePoints(text));
    }
    if (n.type === 'ArrayExpression') most = Math.max(most, listPoints(n.elements));
    for (const [k, v] of Object.entries(n)) if (!['loc', 'start', 'end', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'errors'].includes(k) && v && typeof v === 'object') visit(v);
  };
  visit(program);
  return most;
}
/** The parts of a parsed node these counts read. */

/** A string expression's written-out text, each value put in it as `#` (never a number); null when it holds no string. */
function written(node, seen) {
  const n = node;
  seen.add(n);
  if (n.type === 'StringLiteral' || n.type === 'NumericLiteral') return String(n.value);
  if (n.type === 'TemplateLiteral') return (n.quasis ?? []).map(q => q.value.cooked ?? q.value.raw).join(' # ');
  if (n.type === 'BinaryExpression' && n.operator === '+') {
    const a = written(n.left, seen), b = written(n.right, seen);
    return a === null && b === null ? null : `${a ?? ' # '}${b ?? ' # '}`;
  }
  return null;
}
const numberOf = (e) => {
  const n = e;
  return !!n && (n.type === 'NumericLiteral' || (n.type === 'UnaryExpression' && n.operator === '-' && n.argument?.type === 'NumericLiteral'));
};
/** A list written out: [[x, y], …] counts its pairs; a flat list of numbers, half of them (a dozen or more). */
function listPoints(elements) {
  if (elements.length >= 2 && elements.every(e => (e)?.type === 'ArrayExpression' && ((e).elements.length === 2) && (e).elements.every(numberOf))) return elements.length;
  return elements.length >= 12 && elements.every(numberOf) ? Math.floor(elements.length / 2) : 0;
}
const ARITY = { m: 2, l: 2, t: 2, h: 1, v: 1, c: 6, s: 4, q: 4, a: 7 };
function outlinePoints(text) {
  const t = text.trim();
  if (/^[mM][\s\d.,eE+\-#MmLlHhVvCcSsQqTtAaZz]*$/.test(t)) {
    let n = 0;
    for (const seg of t.match(/[A-Za-z][^A-Za-z]*/g) ?? []) {
      const arity = ARITY[seg[0].toLowerCase()];
      // Only a segment's written-out numbers: one with a value put in it is built, not traced.
      if (arity && !seg.includes('#')) n += Math.floor((seg.slice(1).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.length ?? 0) / arity);
    }
    return n;
  }
  return /^-?[\d.]+(?:[\s,]+-?[\d.]+){5 }$/.test(t) ? Math.floor((t.match(/-?\d*\.?\d+/g)?.length ?? 0) / 2) : 0;
}
