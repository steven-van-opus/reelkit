// A 'code' scene: a scene the writer writes as a small React component that returns SVG, run each frame by the JSX
// interpreter (react-scene.mjs: parsed, never eval'd, no browser, network or timers, a budget per frame) and painted
// onto the reel's canvas by paint.mjs. The component gets the scene's clock and the spoken words, so anything can move
// on the word that names it. A styled reel (src/styles/) draws every scene this way on the canvas look
// (src/canvas.mjs), and the validator checks each one here (codeSceneErrors).
import { renderReactScene, sceneSourceElements } from './react-scene.mjs';
import { geoPoint, handTracedPoints, landPath } from './map/kit.mjs';
import { placeMark } from './marks.mjs';
import { CAPTION_BAND, CONTENT_ZONE, FRAME } from './safe-zone.mjs';
import { estimateBeat } from './timing.mjs';

export const CODE_LIMITS = { source: 6000 };
/**
 * A beat's scene code: a code scene's, or the opening's when it draws itself in code (a 'hook' beat with a
 * `source`: its title is still the reel's name, for the cover). Null for any other beat.
 */
export function codeSourceOf(beat) {
  const source = (beat?.props)?.source;
  return (beat?.scene === 'code' || beat?.scene === 'hook') && typeof source === 'string' ? source : null;
}

/**
 * Where a scene's words and pictures go: a stage between a look's label and captions (CODE_STAGE, a scene framed by a
 * look's own set and character), or the canvas look's whole safe content zone (CANVAS_STAGE, every styled reel's).
 * `keepOut`: bands of the frame (y) a look draws its own layer over, where words may pass through but never stay, as
 * under the captions.
 */
export const CODE_STAGE = { left: 70, right: 1010, top: 330, bottom: 1270, width: 1080, height: 1920 };

/** A style's stage: the frame's safe content zone; backgrounds may still run edge to edge. */
export const CANVAS_STAGE = { ...CONTENT_ZONE, width: 1080, height: 1920 };
/** Where a look's character stands beside a scene on CODE_STAGE (the scene's `kit` input). */
export const CODE_KIT = { left: 760, right: 1040, top: 960, bottom: 1270 };
/** SVG elements a code scene may use; anything else (HTML) is not drawn. */
export const CODE_TAGS = new Set('svg g rect circle ellipse line polyline polygon path text tspan image defs linearGradient radialGradient stop clipPath'.split(' '));

/**
 * A scene's inputs: `time`, `duration`, `words` ({ text, start, end }, seconds into the scene), `voStart`, `voEnd`,
 * `colors` (the look's: ink is text on the background, cardInk text on a chalk card), `stage`, and `marks`, the
 * declared logos' exact marks (marks.mjs) for <Mark/>; none while the writer's code is checked.
 */

const norm = (word) => word.toLowerCase().replace(/[^\p{L}\p{N}%$+]/gu, '');

/** An image's reference inside a code scene: asset('m01') answers a data URL that only names the media id. */
export const codeAssetUrl = (id) => `data:image/png;base64,${btoa(`reelkit:${id}`)}`;
export function codeAssetId(url) {
  if (typeof url !== 'string' || !url.startsWith('data:image/png;base64,')) return null;
  try { const m = atob(url.slice(22)).match(/^reelkit:([a-z0-9]{1,8})$/i); return m ? m[1] : null; } catch { return null; }
}
/** The media ids a scene's source names with asset('…'). */
export const codeMediaIds = (source) => [...new Set([...source.matchAll(/asset\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map(m => m[1]))];
/** Host components a code scene can use as elements (pickable as layers like native ones). */
export const CODE_COMPONENTS = ['Mark'];
/** The declared logos a scene's source draws with <Mark id="m80" …/>. */
export const codeMarkIds = (source) => [...new Set([...source.matchAll(/<Mark\b[^>]*?\bid=(?:"|'|\{\s*['"`])(m\d{1,3})/g)].map(m => m[1]))];
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const unit = (v) => Math.max(0, Math.min(1, num(v)));
/** A word a scene cues: at('word'), or at('word', 2) for the second time the line says it. */

/** The words a scene's source cues with at('…'), each with which time it's said (a literal second argument, else 1). */
export const codeCues = (source) => {
  const cues = new Map();
  for (const m of source.matchAll(/\bat\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*(\d{1,3})\s*\))?/g)) {
    const cue = { word: m[1], nth: Math.max(1, Number(m[2] ?? 1)) };
    cues.set(`${cue.word}#${cue.nth}`, cue);
  }
  return [...cues.values()];
};
/** The most words one shot() list cuts on (the rest are ignored). */
const SHOT_CUES = 32;
/**
 * Each shot(…) call in a scene's source: its list of words when it's written literally (shot(['recruiter', 'manager'])),
 * else null (a variable, an expression). None for a source over CODE_LIMITS.source, which never runs: its calls aren't
 * read at all, so a long source sent for review costs no more than one that runs.
 */
function shotCalls(source) {
  if (source.length > CODE_LIMITS.source) return [];
  return [...source.matchAll(/\bshot\(\s*(?:\[([^\]]*)\])?/g)].map(m => {
    const items = (m[1] ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const words = items.map(s => s.match(/^(['"`])([^'"`]+)\1$/)?.[2]);
    return m[1] !== undefined && items.length && words.every(Boolean) ? (words).slice(0, SHOT_CUES) : null;
  });
}
/** The cue lists a scene's source passes to shot([…]), written literally: the shots its checks and review stills follow. */
export const shotCues = (source) => {
  const lists = shotCalls(source).filter((l) => l !== null);
  return [...new Map(lists.map(l => [JSON.stringify(l), l])).values()];
};

/** Where a line says each word a scene cues: the indexes of its words naming it (cueFinder). */

/**
 * Where a line says what a cue names: the words it names exactly, else the words it starts ("free" finds "freedom").
 * Each cue is looked up once (the line normalised once, the first time it's needed), so a scene can cue its words as
 * often as its op budget allows without its host work growing with the line.
 */
export function cueFinder(words) {
  let said = null;
  const known = new Map();
  return needle => {
    const n = norm(String(needle ?? '').split(/\s+/)[0] ?? '');
    const seen = known.get(n);
    if (seen) return seen;
    let found = [];
    if (n) {
      const line = (said ??= words.map(x => norm(x.text)));
      found = line.flatMap((w, i) => (w === n ? [i] : []));
      if (!found.length) found = line.flatMap((w, i) => (w.startsWith(n) ? [i] : []));
    }
    known.set(n, found);
    return found;
  };
}

/**
 * When `needle` is spoken in the scene (seconds; the `nth` time it's said, the first by default), else a moment
 * spread across the line so nothing waits forever.
 */
export function cueTime(words, needle, inputs, fallback = 0.35, nth = 1, find = cueFinder(words)) {
  const w = words[find(needle)[Math.max(1, Math.floor(num(nth) || 1)) - 1] ?? -1];
  return w ? Math.max(0, w.start - 0.08) : inputs.voStart + (inputs.voEnd - inputs.voStart) * fallback;
}

/**
 * When each of a shot list's words is said, in order: each found after the one before it, so a word said twice can be
 * listed twice. A word the line doesn't say there is given a moment spread across the line, never earlier than the last.
 */
export function shotTimes(cues, words, inputs, find = cueFinder(words)) {
  let after = -1, last = 0;
  return cues.map((cue, k) => {
    const i = find(cue).find(j => j > after);
    if (i !== undefined) after = i;
    last = Math.max(last, i !== undefined ? Math.max(0, words[i].start - 0.08) : inputs.voStart + ((inputs.voEnd - inputs.voStart) * (k + 1)) / (cues.length + 1));
    return last;
  });
}

/**
 * shot()'s ease (`p` runs 0 to 1 over this long from each cue), the shortest shot that's checked and reviewed on its
 * own, and the longest line whose shots are followed: a beat's vo is at most 24 words, so a longer one (which no written
 * beat has, only a request built by hand) is checked, reviewed and matched as one shot, and costs no more than one.
 */
export const CODE_SHOT = { ease: 0.35, settle: 0.3, words: 64 };
/** The video's frame rate (reelkit's FPS): the whole-beat checks look at every frame a viewer sees. */
const CHECK_FPS = 30;
/** One shot of a scene: from its cue (none for the first) until the next one's (`next`; none for the last). */

/**
 * A scene's shots: the spans between its shot() cues, its start and its end; one shot for a scene without shot() (or
 * over a line longer than CODE_SHOT.words). A shot too short to settle (the first, when the line opens on its cue) is
 * left out; the last always counts.
 */
export function codeShots(source, inputs) {
  const cuts = new Map(), find = cueFinder(inputs.words);
  if (inputs.words.length <= CODE_SHOT.words) for (const cues of shotCues(source)) shotTimes(cues, inputs.words, inputs, find).forEach((t, k) => { if (t > 0 && t < inputs.duration && !cuts.has(t)) cuts.set(t, cues[k]); });
  const starts = [0, ...[...cuts.keys()].sort((a, b) => a - b)];
  const shots = starts.map((start, k) => ({ start, end: starts[k + 1] ?? inputs.duration, cue: k ? cuts.get(start): null, next: k + 1 < starts.length ? cuts.get(starts[k + 1]): null }));
  return shots.filter((s, k) => k === shots.length - 1 || s.end - s.start >= CODE_SHOT.settle);
}
/** When a shot is checked and shown to the review: its last frame before the next shot's cue, or the scene's end. */
export const settledAt = (shot, duration) => (shot.end >= duration ? duration : Math.max(shot.start, shot.end - 1 / CHECK_FPS));
/** The moments a scene is run at to check it: its start, its middle, each shot's settled end and its end. */
export function codeSamples(source, inputs) {
  return [...new Set([0, inputs.duration / 2, ...codeShots(source, inputs).map(s => settledAt(s, inputs.duration)), inputs.duration])].sort((a, b) => a - b);
}

/** Easing and timing helpers a code scene can call (besides interpolate, ease and Math). */
function helpers(inputs) {
  // The cues' work, once per frame: each word looked up in the line once, and each shot() list's cut times worked out
  // once, however many lists (building another list already costs the scene its own ops), so a scene calling them
  // often costs about what at() does. A scene can't change an array, so one passed again is known by itself.
  const find = cueFinder(inputs.words);
  const cuts = new Map(), lists = new WeakMap();
  const shotTimesOf = (cues) => {
    if (!Array.isArray(cues)) return [];
    const same = lists.get(cues);
    if (same) return same;
    const list = cues.slice(0, SHOT_CUES), key = list.map(c => String(c)).join('\u0000');
    const times = cuts.get(key) ?? shotTimes(list, inputs.words, inputs, find);
    cuts.set(key, times);
    lists.set(cues, times);
    return times;
  };
  return {
    at: ([word, nth]) => cueTime(inputs.words, word, inputs, 0.35, nth, find),
    // shot(['recruiter', 'manager']): `i` how many of these words have been said (0 before the first), `t` seconds
    // since the last of them (since the scene began for i 0), `p` a 0–1 ease over CODE_SHOT.ease from it.
    shot: ([cues]) => {
      const times = shotTimesOf(cues), time = Math.max(0, num(inputs.time));
      const i = times.filter(at => at <= time).length, t = time - (i ? times[i - 1] : 0);
      return { i, t, p: 1 - (1 - Math.min(1, t / CODE_SHOT.ease)) ** 3 };
    },
    clamp: ([v, lo = 0, hi = 1]) => Math.max(num(lo), Math.min(num(hi), num(v))),
    easeOut: ([p]) => 1 - (1 - unit(p)) ** 3,
    easeInOut: ([p]) => { const t = unit(p); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; },
    easeOutBack: ([p]) => { const t = unit(p), c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
    // A damped spring from 0 to 1, `t` seconds after it starts.
    spring: ([t]) => { const x = num(t); return x <= 0 ? 0 : 1 - Math.exp(-6 * x) * Math.cos(9 * x); },
    // [0, 1, … n-1] (n ≤ 64), for building repeated shapes with map.
    range: ([n]) => Array.from({ length: Math.max(0, Math.min(64, Math.floor(num(n)))) }, (_, i) => i),
    // A rectangle's outline with torn paper edges (path data), the same every frame for the same seed.
    torn: ([x, y, w, h, seed = 1]) => tornPath(num(x), num(y), num(w), num(h), num(seed)),
    // The map kit (map/kit.mjs): land('FR', x, y, w, h) a country's outline (path data) fitted in the box, a list of
    // codes or a [west, south, east, north] box as the map with the codes to draw last ('*' every country it shows);
    // geo(lon, lat, …) a point on it.
    land: ([fit, x, y, w, h, draw]) => landPath(fit, num(x), num(y), num(w), num(h), draw),
    geo: ([lon, lat, fit, x, y, w, h]) => geoPoint(num(lon), num(lat), fit, num(x), num(y), num(w), num(h)),
    // <Mark id="m80" x y size fill?/>: a declared logo's exact shape, centred on (x, y) in a size × size box; with fill,
    // in that one colour. Where no exact mark was found, its name is set in its place.
    Mark: ([raw]) => {
      const p = (raw && typeof raw === 'object' ? raw : {});
      const x = typeof p.x === 'number' ? p.x : 540, y = typeof p.y === 'number' ? p.y : 800, size = Math.max(10, Math.min(1400, typeof p.size === 'number' ? p.size : 300));
      const fill = typeof p.fill === 'string' ? p.fill : null;
      const set = inputs.marks?.[String(p.id ?? '')];
      // variant="symbol": the compact symbol (Nvidia's eye, Google's G) where there is one, else the full logo.
      const mark = set && !('missing' in set) ? (p.variant === 'symbol' ? set.symbol ?? set.mark : set.mark ?? set.symbol) : null;
      if (mark) return placeMark(mark, x, y, size, fill);
      if (set) return { tag: 'text', props: { x, y: y + size * 0.12, textAnchor: 'middle', fontSize: Math.max(34, Math.min(160, size * 0.34)), fontWeight: 900, width: size * 1.6, maxLines: 2, fill: fill ?? inputs.colors.ink }, children: [set.name] };
      // Drawn, but this logo's marks never arrived (its lookup failed): nothing, rather than a box in its place.
      if (inputs.marks) return null;
      // Being checked (no marks yet): a stand-in the mark's size, so its room counts.
      return { tag: 'rect', props: { x: x - size / 2, y: y - size / 2, width: size, height: size, fill: fill ?? inputs.colors.accent }, children: [] };
    },
  };
}

/** Torn-paper outline: each edge stepped every ~22 px (at most 256 steps, far past the stage) and nudged in or out by a
 *  seeded 0–7 px. */
export function tornPath(x, y, w, h, seed) {
  let s = (Math.abs(Math.floor(seed * 9973)) % 2147483646) + 1;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pts = [];
  const edge = (x0, y0, x1, y1, nx, ny) => {
    const n = Math.min(256, Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 22)));
    for (let i = 0; i < n; i++) { const k = i / n, j = (r() - 0.5) * 7; pts.push(`${(x0 + (x1 - x0) * k + nx * j).toFixed(1)} ${(y0 + (y1 - y0) * k + ny * j).toFixed(1)}`); }
  };
  edge(x, y, x + w, y, 0, 1); edge(x + w, y, x + w, y + h, 1, 0); edge(x + w, y + h, x, y + h, 0, 1); edge(x, y + h, x, y, 1, 0);
  return `M ${pts.join(' L ')} Z`;
}

const sceneOf = (source, duration) => ({ slug: 'react-scene', version: 1, title: 'code', width: CODE_STAGE.width, height: CODE_STAGE.height, duration: Math.max(1, Math.min(45, duration)), designId: null, source });

/** The scene's element tree at `inputs.time`. Throws the interpreter's message when the source can't run. */
export function runCodeScene(source, inputs, mediaIds = codeMediaIds(source), inspect = false) {
  if (typeof source !== 'string' || source.length > CODE_LIMITS.source) throw new Error(`the code is longer than ${CODE_LIMITS.source} characters`);
  const assets = Object.fromEntries(mediaIds.map(id => [id, codeAssetUrl(id)]));
  const { time, duration, words, voStart, voEnd, colors } = inputs;
  const stage = inputs.stage ?? CODE_STAGE, kit = CODE_KIT;
  return renderReactScene(sceneOf(source, duration), Math.max(0, time) * 60, assets, inspect, {
    props: { time: Math.max(0, time), duration, words, voStart, voEnd, colors, stage, kit },
    helpers: helpers(inputs),
    components: CODE_COMPONENTS,
  });
}

/**
 * One element of a code scene the creator can pick: its outline on the frame (stage px) as the four corners of its
 * box after every transform (rotated, scaled or skewed as drawn), that outline's bounding box, what it shows and its JSX.
 */

const LAYER_CODE_MAX = 1500;

const IDENTITY = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** An SVG transform list (translate, scale, rotate about a point, skewX, skewY, matrix) as one matrix, as code-paint.mjs applies it. */
export function transformMatrix(value) {
  let m = IDENTITY;
  for (const [, fn, args] of String(value ?? '').matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const a = nums(args), rad = (deg) => (deg * Math.PI) / 180;
    if (fn === 'translate') m = mul(m, [1, 0, 0, 1, a[0] || 0, a[1] || 0]);
    else if (fn === 'scale') m = mul(m, [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]);
    else if (fn === 'rotate') {
      const r = rad(a[0] || 0), c = Math.cos(r), s = Math.sin(r);
      if (a.length >= 3) m = mul(mul(mul(m, [1, 0, 0, 1, a[1], a[2]]), [c, s, -s, c, 0, 0]), [1, 0, 0, 1, -a[1], -a[2]]);
      else m = mul(m, [c, s, -s, c, 0, 0]);
    } else if (fn === 'skewX') m = mul(m, [1, 0, Math.tan(rad(a[0] || 0)), 1, 0, 0]);
    else if (fn === 'skewY') m = mul(m, [1, Math.tan(rad(a[0] || 0)), 0, 1, 0, 0]);
    else if (fn === 'matrix' && a.length === 6) m = mul(m, a);
  }
  return m;
}
const corners = (b) => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
const boundsOf = (points) => {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

/**
 * The elements a code scene draws at `inputs.time`, each with its outline as drawn (every transform followed), a
 * short label and its own JSX from the source, so a change can name exactly that element (the chat's layer tags).
 */
export function codeLayers(source, inputs) {
  const tree = runCodeScene(source, inputs, codeMediaIds(source), true);
  const nodes = sceneSourceElements(source, CODE_COMPONENTS);
  const out = new Map();
  // Returns the node's box in its parent's space: its own geometry and its children's, in its own space, then moved by its transform.
  const walk = (n, parent) => {
    if (!n || typeof n !== 'object') return null;
    if (Array.isArray(n)) return n.map(c => walk(c, parent)).reduce((a, b) => union(a, b), null);
    const p = n.props;
    if (['defs', 'clipPath', 'linearGradient', 'radialGradient', 'stop'].includes(n.tag) || Number(p.opacity ?? 1) <= 0.05) return null;
    const own = transformMatrix(p.transform), full = mul(parent, own);
    const geometry = codeExtent({ ...n, props: { ...p, transform: '' }, children: n.tag === 'text' ? n.children : [] });
    const inner = n.tag === 'text' ? null : n.children.map(c => walk(c, full)).reduce((a, b) => union(a, b), null);
    const local = union(geometry, inner);
    if (!local) return null;
    const id = (n).sourceId;
    if (typeof id === 'number' && n.tag !== 'svg' && !out.has(id)) {
      const node = nodes[id];
      const code = node ? source.slice(node.start, node.end) : '';
      // A <Mark/> is named for its logo ("NVIDIA logo"), whatever shapes draw it.
      const markId = node?.openingElement?.name?.name === 'Mark' ? code.match(/\bid=(?:"|'|\{\s*['"`])(m\d{1,3})/)?.[1] : undefined;
      const text = markId ? `${inputs.marks?.[markId]?.name ?? 'the'} logo` : codeContent(n).texts.join(' ');
      const quad = corners(local).map(([x, y]) => apply(full, x, y));
      out.set(id, { id, tag: markId ? 'Mark' : n.tag, label: (text || (n.tag === 'image' ? 'image' : n.tag === 'g' ? 'group' : 'shape')).slice(0, 40), code: code.slice(0, LAYER_CODE_MAX), quad, box: boundsOf(quad), area: Math.abs(local.w * local.h * (full[0] * full[3] - full[1] * full[2])) });
    }
    return boundsOf(corners(local).map(([x, y]) => apply(own, x, y)));
  };
  walk(tree, IDENTITY);
  return [...out.values()].filter(l => l.code && l.box.w > 4 && l.box.h > 4);
}
const union = (a, b) => (!a ? b : !b ? a : { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) });
const inQuad = (q, x, y) => {
  let inside = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
    const [xi, yi] = q[i], [xj, yj] = q[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inside = !inside;
  }
  return inside;
};
/** The layer under a point: the smallest outline containing it (a word over its card, a card over the scene). */
export function layerAt(layers, x, y) {
  return layers.filter(l => inQuad(l.quad, x, y)).sort((a, b) => a.area - b.area)[0] ?? null;
}

/** Text strings and image ids a tree draws (the writer's checks read them). */
export function codeContent(tree) {
  const texts = [], media = [], tags = new Set();
  const walk = (n, inText) => {
    if (n === null || n === undefined) return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(c => walk(c, inText)).join('');
    tags.add(n.tag);
    const id = codeAssetId(n.props.href ?? n.props.xlinkHref);
    if (id) media.push(id);
    const inner = n.children.map(c => walk(c, inText || n.tag === 'text')).join('');
    if (n.tag === 'text' && !inText && inner.trim()) texts.push(inner.replace(/\s+/g, ' ').trim());
    return inner;
  };
  walk(tree, false);
  return { texts, media: [...new Set(media)], tags };
}

/** The numbers in an attribute, read as the painter reads them (code-paint.mjs): exponents too, so 1.2e-16 is a tiny number, not 1.2 and -16. */
const nums = (v) => (String(v ?? '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
/** A transform's first translate(): the offset the extent checks follow. */
const offsetOf = (transform) => { const a = nums(String(transform ?? '').match(/translate\(([^)]*)\)/)?.[1]); return [a[0] || 0, a[1] || 0]; };
/**
 * Below this much opacity (its own times its groups', times its paint's), a shape is a faint grid or haze, not
 * drawing. A gradient counts by its brightest stop, and must show more than `glow` of it: a soft glow is set dressing.
 */
export const CODE_FAINT = { plain: 0.12, glow: 0.3 };

/**
 * A text's width per character, in ems, where it sets no `width`: a proportional face averages about 0.55; a mono face
 * (fontFamily="mono", inherited as the painter inherits it) is the system's, 0.6 em in Menlo and 0.62 in SF Mono.
 */
export const TEXT_EM = { sans: 0.55, mono: 0.62 };
/**
 * Roughly the box a tree draws in, in frame pixels (translate() offsets followed, other transforms ignored): what
 * the checks use to tell a scene that fills the stage from one huddled in a corner. With `content`, only its words and
 * pictures count (the things the label and subtitles must not cover; a decorative shape may bleed). With `drawn`, only
 * what can be seen as drawing counts: a shape at CODE_FAINT or less (a faint background grid, a soft glow) and a
 * background the size of the frame don't make a scene fill the stage.
 */
export function codeExtent(tree, { content = false, drawn = false } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (ax, ay, bx, by) => { if (![ax, ay, bx, by].every(Number.isFinite)) return; x0 = Math.min(x0, ax, bx); y0 = Math.min(y0, ay, by); x1 = Math.max(x1, ax, bx); y1 = Math.max(y1, ay, by); };
  const opacity = (value) => { const o = Number(value ?? 1); return Number.isFinite(o) ? Math.max(0, Math.min(1, o)) : 1; };
  // Each gradient's brightest stop, by id.
  const brightest = new Map();
  const gradients = (n) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(gradients); return; }
    if ((n.tag === 'linearGradient' || n.tag === 'radialGradient') && typeof n.props.id === 'string') {
      const stops = n.children.filter((c) => !!c && typeof c === 'object' && !Array.isArray(c) && c.tag === 'stop');
      brightest.set(n.props.id, Math.max(0, ...stops.map(c => opacity(c.props.stopOpacity))));
    }
    n.children.forEach(gradients);
  };
  if (drawn) gradients(tree);
  // How strongly a paint shows: 0 for none, a plain colour as itself, a gradient by its brightest stop (a soft glow under CODE_FAINT.glow counts as none).
  const strength = (paint, alpha) => {
    if (paint === null || paint === 'none' || paint === 'transparent') return 0;
    const id = String(paint ?? '').match(/^url\(\s*#([^)\s]+)\s*\)$/)?.[1];
    if (!id) return alpha > CODE_FAINT.plain ? 1 : 0;
    return alpha * (brightest.get(id) ?? 1) > CODE_FAINT.glow ? 1 : 0;
  };
  // Seen as drawing: its fill or its stroke shows; text and images count unless they're faded out.
  const seen = (tag, q) => {
    if (tag === 'text' || tag === 'image') return q.alpha > CODE_FAINT.plain;
    const fill = tag !== 'line' && tag !== 'polyline' && strength(q.fill === undefined ? '#000' : q.fill, q.alpha * q.fillOpacity);
    const stroke = q.stroke !== undefined && q.strokeWidth > 0 && strength(q.stroke, q.alpha * q.strokeOpacity);
    return !!(fill || stroke);
  };
  const walk = (n, dx, dy, q) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(c => walk(c, dx, dy, q)); return; }
    const p = n.props;
    if (['defs', 'clipPath', 'linearGradient', 'radialGradient'].includes(n.tag) || Number(p.opacity ?? 1) <= 0) return;
    const [tx, ty] = offsetOf(p.transform), ox = dx + tx, oy = dy + ty;
    const own = {
      alpha: q.alpha * opacity(p.opacity), fill: p.fill ?? q.fill, stroke: p.stroke ?? q.stroke,
      fillOpacity: p.fillOpacity === undefined ? q.fillOpacity : opacity(p.fillOpacity),
      strokeOpacity: p.strokeOpacity === undefined ? q.strokeOpacity : opacity(p.strokeOpacity),
      strokeWidth: p.strokeWidth === undefined ? q.strokeWidth : Number(p.strokeWidth) || 0,
      fontFamily: p.fontFamily ?? q.fontFamily,
    };
    const v = (k) => Number(p[k] ?? 0);
    const box = (ax, ay, bx, by) => {
      // A background the size of the frame is the set, not the scene's drawing.
      if (drawn && Math.abs(bx - ax) >= CODE_STAGE.width * 0.9 && Math.abs(by - ay) >= CODE_STAGE.height * 0.9) return;
      add(ax, ay, bx, by);
    };
    if ((content && n.tag !== 'text' && n.tag !== 'image') || (drawn && n.tag !== 'svg' && n.tag !== 'g' && !seen(n.tag, own))) { /* decoration */ }
    else if (n.tag === 'rect' || n.tag === 'image') box(ox + v('x'), oy + v('y'), ox + v('x') + v('width'), oy + v('y') + v('height'));
    else if (n.tag === 'circle') box(ox + v('cx') - v('r'), oy + v('cy') - v('r'), ox + v('cx') + v('r'), oy + v('cy') + v('r'));
    else if (n.tag === 'ellipse') box(ox + v('cx') - v('rx'), oy + v('cy') - v('ry'), ox + v('cx') + v('rx'), oy + v('cy') + v('ry'));
    else if (n.tag === 'line') add(ox + v('x1'), oy + v('y1'), ox + v('x2'), oy + v('y2'));
    else if (n.tag === 'polygon' || n.tag === 'polyline' || n.tag === 'path') {
      const list = nums(n.tag === 'path' ? String(p.d ?? '').replace(/[a-df-z]/gi, ' ') : p.points);
      const xs = list.filter((_, i) => i % 2 === 0), ys = list.filter((_, i) => i % 2 === 1);
      if (xs.length && ys.length) box(ox + Math.min(...xs), oy + Math.min(...ys), ox + Math.max(...xs), oy + Math.max(...ys));
    } else if (n.tag === 'text') {
      const size = Number(p.fontSize ?? 40), len = codeContent(n).texts.join(' ').length;
      const w = Number(p.width) || len * size * (own.fontFamily === 'mono' ? TEXT_EM.mono : TEXT_EM.sans), x = ox + v('x');
      const left = p.textAnchor === 'middle' ? x - w / 2 : p.textAnchor === 'end' ? x - w : x;
      add(left, oy + v('y') - size, left + w, oy + v('y') + size * 0.3);
    }
    n.children.forEach(c => walk(c, ox, oy, own));
  };
  walk(tree, 0, 0, { alpha: 1, fill: undefined, stroke: undefined, fillOpacity: 1, strokeOpacity: 1, strokeWidth: 1 });
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}
/** A scene's drawing should fill most of the stage: at least this wide and tall at the end of each shot and of its beat. */
export const CODE_FILL = { width: 760, height: 560 };
/** CODE_FILL on a given stage: never more than 90% of it, so a stage shrunk by a look's own layer can still be filled. */
export const fillFor = (s) => ({ width: Math.min(CODE_FILL.width, 0.9 * (s.right - s.left)), height: Math.min(CODE_FILL.height, 0.9 * (s.bottom - s.top)) });
/** The most points a scene may write out by hand for one outline (more is a country or coastline traced from memory). */
export const CODE_TRACED_POINTS = 60;
/** The smallest text a code scene may set: anything smaller can't be read on a phone. */
export const CODE_MIN_TEXT = 34;
const textSizes = (n) => (!n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(textSizes) : [...(n.tag === 'text' || n.tag === 'tspan' ? [Number((n.props).fontSize ?? 40)] : []), ...n.children.flatMap(textSizes)]);

/** Words of a line spread evenly over `duration`: what the layer picker and its edits use where no render timed them. */
export function evenWords(vo, duration) {
  const list = vo.split(/\s+/).filter(Boolean);
  const step = list.length ? (duration * 0.85) / list.length : 0;
  return list.map((text, i) => ({ text, start: 0.15 + i * step, end: 0.15 + (i + 1) * step }));
}

/**
 * Words drawn in the same colour as the shape right behind them, which can't be read (translate() offsets followed,
 * fills inherited from groups). Checked with a dark set's colours, where ink is as light as a chalk card.
 */
export function hiddenTexts(tree) {
  const shapes = [], hidden = [];
  const colour = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
  const walk = (n, dx, dy, fill) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(c => walk(c, dx, dy, fill)); return; }
    const p = n.props;
    if (['defs', 'clipPath', 'linearGradient', 'radialGradient'].includes(n.tag) || Number(p.opacity ?? 1) <= 0.05) return;
    const [tx, ty] = offsetOf(p.transform), ox = dx + tx, oy = dy + ty;
    const own = colour(p.fill) || fill;
    const v = (k) => Number(p[k] ?? 0);
    const box = n.tag === 'rect' ? [v('x'), v('y'), v('x') + v('width'), v('y') + v('height')]
      : n.tag === 'circle' ? [v('cx') - v('r'), v('cy') - v('r'), v('cx') + v('r'), v('cy') + v('r')]
      : n.tag === 'path' || n.tag === 'polygon' ? (() => { const l = nums(n.tag === 'path' ? String(p.d ?? '').replace(/[a-df-z]/gi, ' ') : p.points); const xs = l.filter((_, i) => i % 2 === 0), ys = l.filter((_, i) => i % 2 === 1); return xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : null; })()
      : null;
    if (box && own && own !== 'none') shapes.push({ x0: ox + box[0], y0: oy + box[1], x1: ox + box[2], y1: oy + box[3], fill: own });
    if (n.tag === 'text') {
      const x = ox + v('x'), y = oy + v('y') - Number(p.fontSize ?? 40) * 0.35;
      const under = [...shapes].reverse().find(s => x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1);
      const words = codeContent(n).texts.join(' ');
      if (under && own && under.fill === own && words) hidden.push(words);
      return;
    }
    n.children.forEach(c => walk(c, ox, oy, own));
  };
  walk(tree, 0, 0, '');
  return hidden;
}

/**
 * No flashing (src/styles/best-practices.mjs): a shape covering a tenth of the frame or more may not switch its opacity or
 * its fill's brightness back and forth more than `perSecond` times in any second (WCAG's three-flash limit, for
 * photosensitive viewers). A swing counts when opacity moves by `opacity` or the fill's relative luminance by `luminance`.
 */
export const CODE_FLASH = { perSecond: 3, area: (FRAME.width * FRAME.height) / 10, opacity: 0.25, luminance: 0.1 };
/** On a full-frame stage, words may pass through the captions' band on their way in or out, but not stay this long. */
export const CODE_CAPTION_PASS = 0.4;

/** A fill's colour as relative luminance (0 black, 1 white) and its own alpha; null for a gradient or anything else that isn't a plain colour. */
function paintOf(value) {
  const s = value.trim().toLowerCase();
  const hex = s.match(/^#([\da-f]{3}|[\da-f]{6})$/)?.[1];
  const fn = s.match(/^rgba?\(([^)]*)\)$/);
  const rgba = hex ? (hex.length === 3 ? [...hex].map(c => parseInt(c + c, 16)) : [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)))
    : fn ? nums(fn[1]) : s === 'white' ? [255, 255, 255] : s === 'black' ? [0, 0, 0] : null;
  if (!rgba || rgba.length < 3) return null;
  const [r, g, b] = rgba.map(v => { const c = Math.max(0, Math.min(255, v)) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return { luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b, alpha: rgba.length > 3 ? Math.max(0, Math.min(1, rgba[3])) : 1 };
}

/** An opacity: a number or numeric string, clamped to 0–1; anything else is fully opaque. */
const level = (v) => { const x = Number(v ?? 1); return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 1; };

/** Where two boxes overlap (zero wide or tall when they don't). */
const meet = (a, b) => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) };
};

/**
 * Each shape, image and text a tree draws, as drawn: its box on the frame after every transform and clip path (the
 * part a clip leaves showing), how much of the frame it covers, how opaque it shows (its own and its groups'
 * opacity, its fill's alpha) and how light its fill is. Hidden or clipped away entirely, it isn't drawn. `key` follows
 * the same element from frame to frame (its place in the source, then which copy of it a map made).
 */

export function drawnElements(tree, ink) {
  const out = [], copies = new Map(), clips = new Map();
  // Clip paths by id, wherever they sit in the tree (the painter's collectIds).
  const collect = (n) => {
    if (Array.isArray(n)) n.forEach(collect);
    else if (n && typeof n === 'object') { if (n.tag === 'clipPath' && typeof n.props.id === 'string') clips.set(n.props.id, n.children); n.children.forEach(collect); }
  };
  collect(tree);
  // A clip path on the frame: the box around its shapes (each moved by its own transform) in the element's space, which
  // includes the element's own transform. An empty clip shows nothing; a missing one, as in the painter, clips nothing.
  const clipOf = (value, full) => {
    const shapes = clips.get(String(value ?? '').match(/^url\(\s*#([^)\s]+)\s*\)$/)?.[1] ?? '');
    if (!shapes) return null;
    const boxes = shapes.flat(8).flatMap(c => {
      if (!c || typeof c !== 'object' || Array.isArray(c)) return [];
      const own = codeExtent({ ...c, props: { ...c.props, transform: '', opacity: 1 }, children: [] });
      return own ? [boundsOf(corners(own).map(([x, y]) => apply(transformMatrix(c.props.transform), x, y)))] : [];
    });
    const local = boxes.reduce((a, b) => union(a, b), null);
    return local ? boundsOf(corners(local).map(([x, y]) => apply(full, x, y))) : { x: 0, y: 0, w: 0, h: 0 };
  };
  const walk = (n, parent, alpha, fill, fillOpacity, clip, path, family) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach((c, i) => walk(c, parent, alpha, fill, fillOpacity, clip, `${path}.${i}`, family)); return; }
    const p = n.props, font = p.fontFamily ?? family;
    if (['defs', 'clipPath', 'linearGradient', 'radialGradient', 'stop'].includes(n.tag) || p.display === 'none' || p.visibility === 'hidden') return;
    const full = mul(parent, transformMatrix(p.transform));
    const a = alpha * level(p.opacity), own = typeof p.fill === 'string' ? p.fill : fill, ownOpacity = p.fillOpacity === undefined ? fillOpacity : level(p.fillOpacity);
    const ref = p.clipPath === undefined ? null : clipOf(p.clipPath, full), within = ref && clip ? meet(clip, ref) : ref ?? clip;
    if (n.tag === 'svg' || n.tag === 'g') { n.children.forEach((c, i) => walk(c, full, a, own, ownOpacity, within, `${path}.${i}`, font)); return; }
    // Keyed before anything is skipped, so a map's copies keep their keys while one of them is clipped away.
    const base = n.sourceId !== undefined ? `s${n.sourceId}` : `p${path}`, copy = copies.get(base) ?? 0;
    copies.set(base, copy + 1);
    const local = codeExtent({ ...n, props: { ...p, fontFamily: font, transform: '', opacity: 1 }, children: n.tag === 'text' ? n.children : [] });
    if (!local) return;
    const box = boundsOf(corners(local).map(([x, y]) => apply(full, x, y))), shown = within ? meet(box, within) : box;
    if (within && (shown.w <= 0 || shown.h <= 0)) return;
    const area = Math.abs(local.w * local.h * (full[0] * full[3] - full[1] * full[2]));
    const paint = n.tag === 'image' ? { luminance: null, alpha: 1 } : own === 'none' || own === 'transparent' ? null : paintOf(own) ?? { luminance: null, alpha: 1 };
    out.push({
      key: `${base}#${copy}`, id: n.sourceId, tag: n.tag, box: shown,
      area: within && box.w * box.h > 0 ? area * (shown.w * shown.h) / (box.w * box.h) : area,
      alpha: paint ? a * ownOpacity * paint.alpha : 0, luminance: paint?.luminance ?? null,
      words: n.tag === 'text' ? codeContent(n).texts.join(' ') : '',
    });
  };
  walk(tree, IDENTITY, 1, ink, 1, null, '');
  return out;
}

/** The frames at which a series swings by at least `by` from its last turn (a rise, then a fall, then a rise…). */
function swings(series, by) {
  const turns = [];
  let low = series[0] ?? 0, high = low, rising = null;
  series.forEach((v, f) => {
    low = Math.min(low, v); high = Math.max(high, v);
    if (rising !== true && v - low >= by) { turns.push(f); rising = true; high = v; }
    else if (rising !== false && high - v >= by) { turns.push(f); rising = false; low = v; }
  });
  return turns;
}

/**
 * The best practices code can check across a whole beat, at the video's frame rate (code that fails at a moment the
 * samples missed is caught too): no large shape flashes faster than CODE_FLASH allows, and on a full-frame stage no
 * words sit under the spoken-word captions (CAPTION_BAND) at any moment, not just at the end; nor, on any stage, in a
 * band the look draws its own layer over (the stage's `keepOut`).
 */
function wholeBeatErrors(at, source, inputs, stage) {
  const frames = Math.floor(inputs.duration * CHECK_FPS) + 1, ids = codeMediaIds(source);
  const shapes = new Map();
  // Where words may pass through but not stay: everything from the captions down on a full-frame stage (a look's stage,
  // CODE_STAGE, is drawn inside its own frame, its captions where the look puts them), and each band the look keeps.
  const bands = [...(stage !== CODE_STAGE ? [{ top: CAPTION_BAND.top, bottom: FRAME.height, captions: true }] : []), ...(stage.keepOut ?? []).map(b => ({ top: b.top, bottom: b.bottom, captions: false }))];
  const under = bands.map(() => []);
  for (let f = 0; f < frames; f++) {
    let tree;
    try { tree = runCodeScene(source, { ...inputs, time: f / CHECK_FPS }, ids, true); } catch (error) {
      return [`${at}: the code fails at ${(f / CHECK_FPS).toFixed(1)} s: ${typeof (error)?.message === 'string' ? (error).message : String(error)}`];
    }
    for (const d of drawnElements(tree, inputs.colors.ink)) {
      if (d.tag === 'text') {
        if (d.words && d.alpha > 0.1 && d.box.x + d.box.w > 0 && d.box.x < FRAME.width) bands.forEach((band, k) => { if (d.box.y + d.box.h > band.top && d.box.y < band.bottom) under[k].push({ frame: f, words: d.words, y0: d.box.y, y1: d.box.y + d.box.h }); });
        continue;
      }
      const s = shapes.get(d.key) ?? { id: d.id, tag: d.tag, area: 0, alpha: Array(frames).fill(0), luminance: Array(frames).fill(null) };
      shapes.set(d.key, s);
      s.area = Math.max(s.area, d.area);
      s.alpha[f] = d.alpha;
      s.luminance[f] = d.luminance;
    }
  }
  const errors = [];
  // A flash is two swings (brighter, then darker): more than perSecond flashes is more than twice as many swings in a second.
  const second = (turns, from) => turns.filter(f => f >= from && f < from + CHECK_FPS);
  // How often it flashes there: the swings after the first, over the time they take.
  const rate = (turns) => (turns.length - 1) / 2 / Math.max(1 / CHECK_FPS, (turns.at(-1) - turns[0]) / CHECK_FPS);
  for (const s of shapes.values()) {
    if (s.area < CODE_FLASH.area) continue;
    // Its fill's brightness only while it shows; held through the frames it's hidden.
    let held = s.luminance.find(v => v !== null) ?? 0;
    const light = s.luminance.map((v, f) => (held = v !== null && s.alpha[f] >= CODE_FLASH.opacity ? v : held));
    const turns = [...new Set([...swings(s.alpha, CODE_FLASH.opacity), ...swings(light, CODE_FLASH.luminance)])].sort((a, b) => a - b);
    const from = turns.find(f => second(turns, f).length > CODE_FLASH.perSecond * 2);
    if (from === undefined) continue;
    const node = s.id !== undefined ? sceneSourceElements(source, CODE_COMPONENTS)[s.id] : null;
    const jsx = node ? source.slice(node.start, node.end).replace(/\s+/g, ' ') : `<${s.tag}>`;
    errors.push(`${at}: \`${jsx.length > 60 ? `${jsx.slice(0, 60)}…` : jsx}\` flashes about ${Math.round(rate(second(turns, from)))} times a second from ${(from / CHECK_FPS).toFixed(1)} s (a large shape switching its opacity or colour back and forth); flashing faster than ${CODE_FLASH.perSecond} times a second can trigger seizures in photosensitive viewers, so change it at most ${CODE_FLASH.perSecond} times a second, or move it instead of flashing it`);
    break;
  }
  bands.forEach((band, k) => {
    const list = under[k];
    if (new Set(list.map(u => u.frame)).size < CODE_CAPTION_PASS * CHECK_FPS) return;
    const first = list[0], last = list.at(-1), from = (first.frame / CHECK_FPS).toFixed(1), to = (last.frame / CHECK_FPS).toFixed(1);
    errors.push(band.captions
      ? `${at}: "${first.words.slice(0, 40)}" sits under the spoken-word captions from ${from} s to ${to} s (words reach y ${Math.round(Math.max(...list.map(u => u.y1)))}; the captions are drawn across y ${CAPTION_BAND.top}–${CAPTION_BAND.bottom}); keep every word above y ${stage.bottom} for the whole scene, not just at its end`
      : `${at}: "${first.words.slice(0, 40)}" sits in y ${band.top}–${band.bottom}, where the look draws its own layer over the scene, from ${from} s to ${to} s (words reach y ${Math.round(Math.min(...list.map(u => u.y0)))}–${Math.round(Math.max(...list.map(u => u.y1)))}); keep every word out of that band for the whole scene (they may only pass through it)`);
  });
  return errors;
}

/** A dark set's colours: ink as light as a chalk card, so ink text on a card shows up as hidden. */
const DARK_COLORS = { ink: '#ffffff', cardInk: '#1d1d1f', chalk: '#ffffff', accent: '#ff2e88', pink: '#ff2e88', rose: '#2a2a2e', blush: '#ffc9e3', wall: '#1d1d1f', floor: '#111113' };

export const SAMPLE_COLORS = { ink: '#1d1d1f', cardInk: '#1d1d1f', chalk: '#ffffff', accent: '#ff2e88', pink: '#ff2e88', rose: '#ffe4f1', blush: '#ffc9e3', wall: '#ffe4f1', floor: '#f6b3d3' };

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
const timesSaid = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/**
 * A beat's clock without a voice (timing.mjs estimateBeat, as stills drawn before the voice time it) and the sample
 * colours: what a code scene is checked with.
 */
export function sampleInputs(vo, stage = CODE_STAGE) {
  const { duration, words, voStart, voEnd } = estimateBeat(vo);
  return { duration, words, voStart, voEnd, colors: SAMPLE_COLORS, stage };
}

/**
 * What's wrong with a code beat, for the writer to fix: code that doesn't run (at its start, middle and end, and at the
 * end of each shot), cues that aren't words of its line (or aren't said as often, or in the order, they're cued),
 * images that aren't media, HTML instead of SVG, or nothing drawn; then what code can check of the best practices
 * (src/styles/best-practices.mjs): words inside the stage and big enough to read, a drawing that fills the stage and text
 * that stands out from what's behind it, at the end of the beat and of each of its shots, nothing large flashing, and
 * no words staying under the captions on a full-frame stage or in a band the look keeps (`stage.keepOut`). The beat is
 * timed as it is without a voice (timing.mjs estimateBeat). `run`: { duration, words, voStart, voEnd } to time the
 * scene by instead, when it runs on across more than its own line (`vo` is then all the lines it says).
 */
export function codeSceneErrors(at, source, vo, known, stage = CODE_STAGE, run) {
  if (typeof source !== 'string' || !source.trim()) return [`${at}: a code scene needs \`source\`, the component's code`];
  if (source.length > CODE_LIMITS.source) return [`${at}: the code is ${source.length} characters, max ${CODE_LIMITS.source}; simplify it`];
  const errors = [];
  const said = new Set(vo.split(/\s+/).map(norm).filter(Boolean));
  const find = cueFinder(vo.split(/\s+/).filter(Boolean).map(text => ({ text })));
  const unsaid = new Set();
  for (const { word: cue, nth } of codeCues(source)) {
    if (!said.has(norm(cue.split(/\s+/)[0] ?? '')) && ![...said].some(w => w.startsWith(norm(cue)))) {
      if (!unsaid.has(cue)) errors.push(`${at}: at('${cue}') isn't a word of this beat's vo; cue a word the line says`);
      unsaid.add(cue);
      continue;
    }
    const count = find(cue).length;
    if (nth > 1 && nth > count) errors.push(`${at}: at('${cue}', ${nth}) waits for the ${ORDINALS[nth - 1] ?? `${nth}th`} time the line says "${cue}", but it says it ${timesSaid(count)}; cue a time it's said`);
  }
  // shot()'s words are written out, so its shots can be checked and reviewed (a list in a variable is never followed).
  if (shotCalls(source).includes(null)) errors.push(`${at}: shot() takes its words written out in the call, as in shot(['recruiter', 'manager', 'lead']), never a variable or an expression, so each of its shots can be checked and reviewed; write the list in the call itself`);
  // Each shot() list's words, said in that order (a word listed twice is said twice).
  for (const cues of shotCues(source)) {
    const list = cues.map(c => `'${c}'`).join(', ');
    let after = -1;
    for (const [k, cue] of cues.entries()) {
      const all = find(cue), i = all.find(j => j > after);
      if (i !== undefined) { after = i; continue; }
      errors.push(all.length
        ? `${at}: shot([${list}]) cues "${cue}" after "${cues[k - 1]}", but the line doesn't say it again after that; list the words in the order the line says them (a word said twice can be listed twice)`
        : `${at}: shot([${list}]) cues "${cue}", which isn't a word of this beat's vo; cut each shot on a word the line says`);
      break;
    }
  }
  // Countries and coastlines come from the map kit, never from memory: a long outline written out by hand is a trace,
  // even in a scene that draws with the kit (a river or a coast added from memory to a land() map).
  const traced = handTracedPoints(source);
  if (traced > CODE_TRACED_POINTS) errors.push(`${at}: an outline here is traced by hand with ${traced} points; a country or coastline can't be drawn from memory, so draw it with the map kit: land('FR', x, y, w, h) is France's real outline as path data fitted in that box (ISO codes; a list such as ['FR', 'DE'] fits several on one map, and a last argument draws just one of them on it), and geo(lon, lat, 'FR', x, y, w, h) is a city's [x, y] on the same map; a river along a border is that stretch of the country's outline (land() clipped to it); keep any other hand-drawn path under ${CODE_TRACED_POINTS} points`);
  for (const id of codeMarkIds(source)) if (!/^m8\d$/.test(id) || !known.has(id)) errors.push(`${at}: <Mark id="${id}"/> isn't a declared logo; add it to the episode's top-level "logos" as {"id": "${id}", "name": "<full name, as Wikipedia titles it>", "domain": "<the maker's website>"} (ids m80 to m89)`);
  for (const id of codeMediaIds(source)) {
    if (/^m8\d$/.test(id)) errors.push(`${at}: asset('${id}') is a logo id, which has no picture; place the declared logo with <Mark id="${id}" …/>`);
    else if (!known.has(id)) errors.push(`${at}: asset('${id}') is not a media id from the list`);
  }
  const inputs = run ? { duration: run.duration, words: run.words, voStart: run.voStart, voEnd: run.voEnd, colors: SAMPLE_COLORS, stage } : sampleInputs(vo, stage), { duration } = inputs;
  // Each shot is checked at its settled end, just before the next shot's cue; the last (a scene's only shot, without
  // shot()) at the beat's end, as "by the end". Each kind of problem is reported once, at the first shot it shows in.
  const shots = codeShots(source, inputs);
  const checked = new Map(shots.map((s, k) => {
    const time = settledAt(s, duration);
    return [time, k === shots.length - 1 ? null : `at the end of shot ${k + 1} of ${shots.length} (${time.toFixed(1)} s, just before "${s.next}")`];
  }));
  const fill = fillFor(stage), found = new Set();
  // A band the look keeps right above or below the stage (its own layer, `keepOut`): what runs past that
  // edge runs into it.
  const above = stage.keepOut?.find(b => b.bottom <= stage.top), below = stage.keepOut?.find(b => b.top >= stage.bottom);
  const report = (kind, error) => { if (!found.has(kind)) errors.push(error); found.add(kind); };
  let drew = false;
  for (const time of codeSamples(source, inputs)) {
    try {
      const tree = runCodeScene(source, { ...inputs, time });
      const { texts, media, tags } = codeContent(tree);
      if (checked.has(time)) {
        const when = checked.get(time) ?? null;
        // Only faint shapes drawn: nothing fills the stage (an empty scene is told it draws nothing instead).
        const box = codeExtent(tree, { drawn: true }) ?? (codeExtent(tree) ? { x: 0, y: 0, w: 0, h: 0 } : null);
        const small = Math.min(...textSizes(tree));
        if (small < CODE_MIN_TEXT) report('size', `${at}: ${when ? `${when}, ` : ''}text at fontSize ${small} is too small to read on a phone; use ${CODE_MIN_TEXT} px or more (64–120 for headlines)`);
        const inner = codeExtent(tree, { content: true });
        const out = inner ? [inner.y < stage.top - 12 && (stage === CODE_STAGE ? 'up into the label above it' : above ? `up into y ${above.top}–${above.bottom}, where the look draws its layer` : 'up under the platform’s top bar'), inner.y + inner.h > stage.bottom + 12 && (below ? `down into y ${below.top}–${below.bottom}, where the look draws its layer` : 'down under the captions'), inner.x < stage.left - 40 && 'off the left edge', inner.x + inner.w > stage.right + 40 && (stage === CODE_STAGE ? 'off the right edge' : 'under the platform’s buttons on the right')].filter(Boolean) : [];
        if (out.length) report('stage', `${at}: ${when ?? 'by the end'} it runs ${out.join(' and ')} (its words and pictures reach x ${Math.round(inner.x)}–${Math.round(inner.x + inner.w)}, y ${Math.round(inner.y)}–${Math.round(inner.y + inner.h)}); keep them inside the stage (x ${stage.left}–${stage.right}, y ${stage.top}–${stage.bottom})`);
        if (box && (box.w < fill.width || box.h < fill.height)) report('fill', `${at}: ${when ?? 'by the end'} it fills only ${Math.round(box.w)}×${Math.round(box.h)} px of the ${stage.right - stage.left}×${stage.bottom - stage.top} px stage; design it bigger so it fills the stage (at least ${Math.round(fill.width)}×${Math.round(fill.height)}; a faint background grid, a soft glow or a backdrop the size of the frame doesn't count)`);
      }
      if (texts.length || media.length || [...tags].some(t => t !== 'svg' && t !== 'g' && t !== 'defs')) drew = true;
      const html = [...tags].filter(t => !CODE_TAGS.has(t));
      if (html.length) { errors.push(`${at}: <${html[0]}> isn't drawn; a code scene is SVG only (${[...CODE_TAGS].slice(0, 12).join(', ')}…)`); break; }
    } catch (error) {
      errors.push(`${at}: the code fails at ${time.toFixed(1)} s: ${typeof (error)?.message === 'string' ? (error).message : String(error)}`);
      break;
    }
  }
  if (!drew && !errors.length) errors.push(`${at}: the code draws nothing by the end of the beat`);
  if (!errors.length) {
    for (const [time, when] of [...checked].sort((a, b) => a[0] - b[0])) {
      try {
        const hidden = hiddenTexts(runCodeScene(source, { ...inputs, time, colors: DARK_COLORS }));
        if (hidden.length) { errors.push(`${at}: ${when ? `${when}, ` : ''}"${hidden[0].slice(0, 40)}" is drawn in the same colour as the shape behind it on a dark set; use colors.cardInk for text on a chalk card and colors.ink only on the background`); break; }
      } catch { /* the main run reported it */ }
    }
  }
  if (!errors.length) errors.push(...wholeBeatErrors(at, source, inputs, stage));
  return errors;
}
