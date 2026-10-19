// Exact logos for code scenes: a declared logo's real vector marks (its official logo file on Wikimedia Commons, as
// Wikidata names it, and its compact symbol from Simple Icons, CC0), turned into the same shapes a scene draws
// (react-scene elements), so <Mark id="m80" …/> places the real shape, which a scene can recolour, tilt and layer in
// its style. Pure: parsing and the lookups' URLs (src/marks.mjs fetches them; scene.mjs draws).

/** A logo as shapes: its box (w × h, from the SVG's viewBox) and the elements inside it. */

/** A declared logo's marks: its official logo and, where there is one, its compact symbol (Simple Icons). */

/** Episode-side: each declared logo's marks, or just its name when none was found (it's set as a wordmark). */

export const MARK_LIMITS = { bytes: 300_000, elements: 400, pathChars: 150_000, depth: 24 };

/** Simple Icons slugs to try for a name and domain ("Adobe Photoshop", "adobe.com" → adobephotoshop, adobe). */
export function markSlugs(name, domain) {
  const slug = (s) => s.toLowerCase().replace(/\.$/, '').replace(/\+/g, 'plus').replace(/\./g, 'dot').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  const stem = domain ? domain.replace(/\.[a-z]{2,24}$/, '').split('.').pop() ?? '' : '';
  return [...new Set([slug(name), slug(name.replace(/\s+(inc|corp|corporation|company|co|ltd|llc)\.?$/i, '')), slug(stem)].filter(s => s.length >= 2))];
}
export const simpleIconUrl = (slug) => `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`;
/** Wikidata's entity for an English Wikipedia title, with its claims (P154 is its logo image on Commons). */
export const wikidataUrl = (name) => `https://www.wikidata.org/w/api.php?${new URLSearchParams({ action: 'wbgetentities', sites: 'enwiki', titles: name.replace(/ /g, '_'), props: 'claims', format: 'json', redirects: 'yes' })}`;
/** The logo file an entity names (its preferred P154, else its first), as Commons' original-file URL; only SVGs. */
export function wikidataLogoSvg(entities) {
  const all = Object.values((entities)?.entities ?? {});
  for (const e of all) {
    const claims = (e.claims?.P154 ?? []).filter(c => c.rank !== 'deprecated');
    const file = [...claims.filter(c => c.rank === 'preferred'), ...claims].map(c => c.mainsnak?.datavalue?.value).find((v) => typeof v === 'string' && /\.svg$/i.test(v));
    if (file) return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}`;
  }
  return null;
}
/**
 * A declared logo's marks, looked up with `fetchText` (the route's safe fetch, or a dev machine's own): its official
 * logo (the SVG file Wikidata names for it) and its compact symbol (Simple Icons, by name then domain). Each is null
 * when not found; `fetchText` answers a body or null.
 */
export async function lookupMarks(id, name, domain, fetchText) {
  const official = (async () => {
    let file = null;
    try { const json = await fetchText(wikidataUrl(name), 'json'); file = json ? wikidataLogoSvg(JSON.parse(json)) : null; } catch { file = null; }
    const svg = file ? await fetchText(file, 'svg') : null;
    return svg ? svgToMark(svg, name, id) : null;
  })();
  const symbol = (async () => {
    for (const slug of markSlugs(name, domain)) {
      const svg = await fetchText(simpleIconUrl(slug), 'svg');
      const mark = svg ? svgToMark(svg, name, `${id}s`) : null;
      if (mark) return mark;
    }
    return null;
  })();
  const [mark, sym] = await Promise.all([official, symbol]);
  return { mark, symbol: sym };
}

// ---------------------------------------------------------------- SVG → shapes

const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const CONTAINERS = new Set(['svg', 'g', 'a', 'switch']);
const PAINT = new Set(['linearGradient', 'radialGradient', 'stop', 'clipPath', 'defs']);
// SVG attribute → scene prop (camelCase, as a scene writes it).
const ATTRS = {
  d: 'd', x: 'x', y: 'y', width: 'width', height: 'height', rx: 'rx', ry: 'ry', cx: 'cx', cy: 'cy', r: 'r', fx: 'fx', fy: 'fy',
  x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2', points: 'points', transform: 'transform', offset: 'offset', id: 'id',
  fill: 'fill', stroke: 'stroke', 'stroke-width': 'strokeWidth', opacity: 'opacity', 'fill-opacity': 'fillOpacity', 'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'stroke-miterlimit': 'strokeMiterlimit',
  'stop-color': 'stopColor', 'stop-opacity': 'stopOpacity', gradientUnits: 'gradientUnits', gradientTransform: 'gradientTransform', 'clip-path': 'clipPath', spreadMethod: 'spreadMethod',
};
// What a child inherits from its group, as SVG does (resolved here, so the painter needn't).
const INHERITED = ['fill', 'stroke', 'strokeWidth', 'fillRule', 'fillOpacity', 'strokeOpacity', 'strokeLinecap', 'strokeLinejoin'];

const decode = (s) => s.replace(/&(amp|lt|gt|quot|apos|#x?[0-9a-f]+);/gi, (_, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[e.toLowerCase()]));
function attributes(raw) {
  const out = {};
  for (const m of raw.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1]] = decode(m[3] ?? m[4] ?? '');
  return out;
}
/** `.a,.b{fill:#fff;stroke:none}` rules from a <style>, by class name. */
function cssRules(css) {
  const rules = new Map();
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decl = declarations(m[2]);
    for (const sel of m[1].split(',').map(s => s.trim())) if (/^\.[\w-]+$/.test(sel)) rules.set(sel.slice(1), { ...rules.get(sel.slice(1)), ...decl });
  }
  return rules;
}
function declarations(style) {
  const out = {};
  for (const part of style.split(';')) {
    const i = part.indexOf(':');
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}
const number = (v) => (/^-?[\d.]+(e-?\d+)?(px)?$/i.test(v.trim()) ? Number.parseFloat(v) : null);

/**
 * An SVG file's drawing as scene shapes: its paths and basic shapes with their fills, strokes, transforms, gradients and
 * clip paths, group styles pushed down onto each shape and `<style>` classes applied. Ids are prefixed with `prefix`
 * so two logos in one scene never share a gradient. Text, images, filters, masks and scripts are left out. Null when
 * there's nothing to draw or it's over MARK_LIMITS.
 */
export function svgToMark(svg, name, prefix) {
  if (svg.length > MARK_LIMITS.bytes) return null;
  const text = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const classes = cssRules([...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n'));
  const body = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  const root = { tag: 'root', props: {}, children: [], skip: false, inherit: { fill: '#000000' } };
  const stack = [root];
  let box = null;
  let count = 0, chars = 0;
  for (const m of body.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g)) {
    const [, closing, rawTag, rawAttrs, self] = m;
    const tag = rawTag.includes(':') ? `ns:${rawTag}` : rawTag;
    const parent = stack[stack.length - 1];
    if (closing) { if (stack.length > 1 && parent.tag === tag) stack.pop(); continue; }
    const a = attributes(rawAttrs);
    if (tag === 'svg' && !box) {
      const vb = (a.viewBox ?? '').trim().split(/[\s,]+/).map(Number);
      const w = number(a.width ?? ''), h = number(a.height ?? '');
      box = vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0 ? { x: vb[0], y: vb[1], w: vb[2], h: vb[3] } : w && h ? { x: 0, y: 0, w, h } : null;
    }
    // Everything a shape is styled by: its attributes, then its classes, then its own style="" (CSS wins).
    const css = { ...Object.fromEntries((a.class ?? '').split(/\s+/).filter(Boolean).flatMap(c => Object.entries(classes.get(c) ?? {}))), ...declarations(a.style ?? '') };
    const props = {};
    for (const [k, v] of Object.entries({ ...a, ...css })) {
      const prop = ATTRS[k];
      if (!prop) continue;
      const n = ['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'fx', 'fy', 'x1', 'y1', 'x2', 'y2', 'strokeWidth', 'opacity', 'fillOpacity', 'strokeOpacity', 'stopOpacity', 'strokeMiterlimit'].includes(prop) ? number(v) : null;
      props[prop] = n ?? v;
    }
    for (const k of ['id']) if (typeof props[k] === 'string') props[k] = `${prefix}-${props[k]}`;
    for (const k of ['fill', 'stroke', 'clipPath']) if (typeof props[k] === 'string') props[k] = String(props[k]).replace(/url\(\s*['"]?#([^'")]+)['"]?\s*\)/, (_, id) => `url(#${prefix}-${id})`);
    if (props.display === 'none' || a.display === 'none' || css.display === 'none' || a.visibility === 'hidden') { if (!self) stack.push({ tag, props, children: [], skip: true, inherit: parent.inherit }); continue; }
    const known = SHAPES.has(tag) || CONTAINERS.has(tag) || PAINT.has(tag);
    const skip = parent.skip || !known;
    const inherit = { ...parent.inherit };
    for (const k of INHERITED) if (props[k] !== undefined && props[k] !== 'inherit') inherit[k] = props[k];
    let node = null;
    if (!skip && tag !== 'svg') {
      if (++count > MARK_LIMITS.elements || stack.length > MARK_LIMITS.depth) return null;
      if (SHAPES.has(tag)) {
        const own = { ...props };
        // A shape in a clipPath is only its outline; elsewhere it takes its group's paint.
        if (!stack.some(s => s.tag === 'clipPath')) for (const k of INHERITED) if (own[k] === undefined || own[k] === 'inherit') { if (inherit[k] !== undefined) own[k] = inherit[k]; }
        chars += String(own.d ?? own.points ?? '').length;
        if (chars > MARK_LIMITS.pathChars) return null;
        node = { tag, props: own, children: [] };
      } else {
        const own = {};
        for (const k of ['transform', 'opacity', 'id', 'clipPath', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits', 'gradientTransform', 'spreadMethod', 'offset', 'stopColor', 'stopOpacity']) if (props[k] !== undefined) own[k] = props[k];
        node = { tag: CONTAINERS.has(tag) ? 'g' : tag, props: own, children: [] };
      }
      parent.children.push(node);
    }
    // The root <svg> adds no group: its shapes are the mark's own.
    if (!self) stack.push({ tag, props, children: node ? node.children : tag === 'svg' ? parent.children : [], skip: skip && tag !== 'svg', inherit });
  }
  const drawn = (nodes) => nodes.some(n => SHAPES.has(n.tag) || (n.tag === 'g' && drawn(n.children)));
  if (!box || !drawn(root.children)) return null;
  const nodes = box.x || box.y ? [{ tag: 'g', props: { transform: `translate(${-box.x} ${-box.y})` }, children: root.children }] : root.children;
  return { name, w: box.w, h: box.h, nodes };
}

/**
 * The mark drawn centred on (x, y), fitted into a size × size box; with `fill`, every painted shape in that one colour
 * (a monochrome mark in the scene's ink or accent). Shapes for a scene to place (scene.mjs <Mark/>).
 */
export function placeMark(mark, x, y, size, fill) {
  const k = size / Math.max(mark.w, mark.h);
  const recolor = (nodes) => nodes.map(n => {
    if (n.tag === 'clipPath' || n.tag === 'linearGradient' || n.tag === 'radialGradient') return n;
    const props = { ...n.props };
    if (SHAPES.has(n.tag)) {
      if (props.fill !== undefined && props.fill !== 'none') props.fill = fill;
      if (props.stroke !== undefined && props.stroke !== 'none') props.stroke = fill;
    }
    return { ...n, props, children: recolor(n.children) };
  });
  return { tag: 'g', props: { transform: `translate(${x - (mark.w * k) / 2} ${y - (mark.h * k) / 2}) scale(${k})` }, children: fill ? recolor(mark.nodes) : mark.nodes };
}

// ---------------------------------------------------------------- declared logos

/** Logo ids the writer may declare in a styled episode's "logos" (src/marks.mjs looks each one up). */
export const LOGO_IDS = Array.from({ length: 10 }, (_, i) => `m8${i}`);
const DOMAIN = /^(?=.{3,100}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
const NAME = /^[\p{L}\p{N} .&+'’-]{2,60}$/u;

/**
 * The episode's declared logos, kept only when well formed: an m80–m89 id, a name (letters, digits, spaces and simple
 * punctuation) and a plain domain (no scheme, path, port or IP address), each id once.
 * @returns {{ id: string, name: string, domain: string }[]}
 */
export function declaredLogos(episode) {
  const seen = new Set();
  return (Array.isArray(episode?.logos) ? episode.logos : []).flatMap(raw => {
    const l = raw && typeof raw === 'object' ? raw : {};
    const id = typeof l.id === 'string' ? l.id : '';
    const name = typeof l.name === 'string' ? l.name.replace(/\s+/g, ' ').trim() : '';
    const domain = typeof l.domain === 'string' ? l.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') : '';
    if (!LOGO_IDS.includes(id) || seen.has(id) || !NAME.test(name) || !DOMAIN.test(domain)) return [];
    seen.add(id);
    return [{ id, name, domain }];
  });
}
