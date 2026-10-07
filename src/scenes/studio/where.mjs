// Where-to-get-it beat, as a site list: an optional section heading ("Live
// on"), then 2–5 white rows, each a product's logo tile and name, sliding in
// one by one as the narrator names them. Items are strings or { text, logo };
// a name that matches a data.ts tool ("Vercel AI Gateway" → Vercel) gets that
// tool's logo, anything else a lucide icon tile. The newest row's check turns
// pink; Kit points at it from the floor and cheers once the list is complete.
import { C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, fitSize, fitWrapped, measure, text } from '../../paper.mjs';
import { lucideIcon } from '../../icons.mjs';
import { logoTile, allTools, toolInfo } from '../../logos.mjs';
import { ALIASES } from '../../mentions.mjs';
import { clamp, ease, lerp, luminance } from '../../util.mjs';

const STOP = new Set(['the', 'and', 'with', 'your', 'you', 'for', 'from', 'into', 'that', 'this', 'app', 'apps', 'all', 'any']);

// The distinctive words of a name, longest first: what the narrator is likely
// to say when they reach it.
function keyWords(str) {
  return String(str).toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(w => w.length >= 2 && !STOP.has(w))
    .sort((a, b) => b.length - a.length);
}

// When each row lands: on the word that names it if the voiceover says it,
// else evenly spread across the voiceover. The first row waits for its word
// only if that comes early, so the list never sits empty for long.
function revealTimes(s, items, first = 0.45) {
  const a = Math.max(first, s.voStart);
  const b = Math.max(a + 0.5 * items.length, s.voEnd);
  const step = (b - a) / items.length;
  const out = [];
  items.forEach((item, i) => {
    let at = a + i * step;
    const said = keyWords(item.text).map(k => s.wordTime(k)).find(x => x != null && x - 0.1 > a && x < b);
    if (said != null && (i > 0 || said < a + 1.6)) at = said - 0.1;
    out.push(i === 0 ? at : Math.max(at, out[i - 1] + 0.32));
  });
  return out;
}

// ---------------------------------------------------------------- items

// Generic words that are never a product on their own ("Pro", "Studio").
const GENERIC = new Set(['free', 'pro', 'plus', 'max', 'team', 'teams', 'beta', 'api', 'web', 'app', 'apps', 'studio', 'mobile',
  'desktop', 'business', 'enterprise', 'premium', 'labs', 'preview', 'ads', 'agent', 'agents', 'remote', 'notes', 'canvas', 'flow']);

let nameIndex = null;
// Lower-cased tool title / alias → toolId.
function names() {
  if (nameIndex) return nameIndex;
  nameIndex = new Map();
  for (const [name, id] of Object.entries(ALIASES)) nameIndex.set(name.toLowerCase(), id);
  for (const tool of allTools().values()) {
    const key = String(tool.title || '').trim().toLowerCase();
    if (key.length >= 3 && !nameIndex.has(key)) nameIndex.set(key, tool.id);
  }
  return nameIndex;
}

// The tool an item names: the whole name ("Higgsfield", "Gemini API"), else
// its longest leading run of words that is one ("Netlify AI Gateway" → Netlify).
export function matchTool(str) {
  const words = String(str).trim().split(/\s+/).filter(Boolean);
  const idx = names();
  for (let n = words.length; n >= 1; n--) {
    const key = words.slice(0, n).join(' ').toLowerCase().replace(/[^\p{L}\p{N}.+\s-]+$/u, '');
    if (n === 1 && (key.length < 4 || GENERIC.has(key))) continue;
    if (idx.has(key)) return idx.get(key);
  }
  return null;
}

// A lucide icon that fits a platform or tier name. Never a brand mark.
const ICONS = [
  [/\b(ios|iphone|ipad|android|mobile|phone|app ?store|play ?store)\b/, 'Smartphone'],
  [/\b(web|browser|chrome|safari|firefox|edge|online|site|extension)\b/, 'Globe'],
  [/\b(api|cli|sdk|terminal|code|vs ?code|github|dev|developers?|npm|gateway)\b/, 'Code'],
  [/\b(chat|messages?|slack|discord|whatsapp|telegram)\b/, 'MessageSquare'],
  [/\b(video|reels|stream|shorts|youtube|tiktok)\b/, 'Play'],
  [/\b(design|photos?|image|canvas)\b/, 'Image'],
  [/\b(mac|macos|windows|desktop|linux|pc|laptop)\b/, 'Monitor'],
  [/\b(\d{3,4}p|4k|8k|hd|resolution)\b/, 'Maximize2'],
  [/\b(ads?|studio|editor)\b/, 'WandSparkles'],
  [/\b(docs|workspace|office|sheets|drive|word|excel|notion)\b/, 'Layers'],
  [/\b(pro|plus|premium|paid|enterprise|business|max|team)\b/, 'Star'],
  [/\b(free|everyone)\b/, 'Gift'],
  [/\b(beta|preview|labs|early)\b/, 'FlaskConical'],
];
const iconFor = (name, i) => ICONS.find(([re]) => re.test(name.toLowerCase()))?.[1] || ['Zap', 'Sparkles', 'Star', 'Check', 'Globe'][i % 5];

// Items as { text, toolId, icon }: strings or { text | name | label, logo | toolId }.
function readItems(props) {
  let raw = props.items;
  if (typeof raw === 'string') raw = raw.split(/\n|,|;|\|/);
  const items = (Array.isArray(raw) ? raw : [])
    .map((x, i) => {
      const o = x && typeof x === 'object' ? x : { text: x };
      const txt = String(o.text ?? o.name ?? o.label ?? '').trim();
      if (!txt) return null;
      const explicit = o.logo || o.toolId;
      const toolId = explicit && toolInfo(explicit) ? explicit : matchTool(txt);
      return { text: txt, toolId, icon: iconFor(txt, i) };
    })
    .filter(Boolean)
    .slice(0, 5);
  return items.length ? items : [{ text: 'Available now', toolId: null, icon: 'Sparkles' }];
}

// Tool ids whose logos a where beat shows (for preloading with the episode).
export const itemToolIds = props => readItems(props || {}).map(it => it.toolId).filter(Boolean);

// ---------------------------------------------------------------- rows

// Row sizes by count: [height, gap, tile, max type size].
const ROWS = { 1: [172, 0, 120, 68], 2: [164, 24, 116, 66], 3: [148, 22, 104, 60], 4: [128, 18, 92, 54], 5: [110, 16, 80, 50] };

const LIST = { x: 100, w: 880, top: 372, bottom: 1110, headGap: 30 };

// Name in one line: shrink to fit, then (only past the 22-char contract) wrap
// to two smaller lines or end in an ellipsis.
function fitName(ctx, str, maxW, maxH, maxSize) {
  const one = fitSize(ctx, str, 'd600', maxW, maxSize, 38);
  if (measure(ctx, str, 'd600', one) <= maxW) return { size: one, lines: [str] };
  const two = fitWrapped(ctx, str, 'd600', maxW, 2, Math.min(42, Math.floor(maxH / 2.1)), 34);
  return two;
}

// An icon tile for a platform that isn't a tool: the logo tile's shape in
// muted grey, with the lucide icon in ink.
function iconTile(ctx, cx, cy, size, name, dark) {
  paper(ctx, c => roundRectPath(c, cx - size / 2, cy - size / 2, size, size, size * 0.24), { fill: dark ? '#26272F' : '#F5F5F5', lift: 0.4 });
  lucideIcon(ctx, name, cx, cy, size * 0.5, { color: dark ? C.chalk : C.ink, stroke: 2 });
}

function drawRow(ctx, row, { e, tileIn, checkIn, hot, dark }) {
  const { x, y, w, h, tile } = row;
  ctx.save();
  ctx.globalAlpha *= clamp(e * 2.2);
  ctx.translate((1 - e) * 70, 0);
  paper(ctx, c => roundRectPath(c, x, y, w, h, 16), { fill: dark ? C.panel : '#FFFFFF', lift: hot ? 1.8 : 1.1 });

  const cy = y + h / 2, tx = x + 26 + tile / 2;
  if (tileIn > 0) {
    ctx.save();
    ctx.translate(tx, cy);
    ctx.scale(tileIn, tileIn);
    if (row.toolId) logoTile(ctx, 0, 0, tile, { toolId: row.toolId, shadow: false });
    else iconTile(ctx, 0, 0, tile, row.icon, dark);
    ctx.restore();
  }

  const nx = x + 26 + tile + 28, lh = row.size * 1.06;
  row.lines.forEach((l, k) => text(ctx, l, nx, cy + 3 + (k - (row.lines.length - 1) / 2) * lh, {
    weight: 'd600', size: row.size, color: dark ? C.chalk : C.ink, align: 'left',
  }));

  // Check on the right: pink on the newest row, quiet grey on the rest.
  if (checkIn > 0) {
    const ccx = x + w - 30 - 26, r = 26 * checkIn;
    ctx.fillStyle = hot ? C.pink : dark ? '#33343D' : '#F1F1F5';
    ctx.beginPath();
    ctx.arc(ccx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    lucideIcon(ctx, 'Check', ccx, cy, 30 * checkIn, { color: hot ? '#FFFFFF' : dark ? C.muteDark : C.mute, stroke: 2.6 });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- scene

export default {
  type: 'where',
  describe: 'Where it is available / who supports it. A clean list with an optional heading; 2–5 rows (product logo + name) slide in one by one as they are named, and Kit points at the newest.',
  props: {
    title: 'string ≤ 24 chars, optional — the heading above the list, e.g. "Live on", "Works with"',
    items: 'array of 2–5 entries, each a string ≤ 22 chars or { text, logo } (logo = data.ts toolId) — platform or product names in the order the voiceover says them, e.g. ["Gemini API", "Vercel AI Gateway", "iOS"]; names matching a tool get its logo automatically',
  },
  draw(s) {
    const { ctx, t, props } = s;
    const items = readItems(props);
    const title = String(props.title || '').trim();
    // Dark rows only on the ink set; the pink set keeps white rows like the site.
    const dark = luminance(s.set.wall) < 0.1;
    const n = items.length;
    const [h, gap, tile, maxSize] = ROWS[n];

    // Heading + rows, centred in the space above Kit.
    const head = title ? fitWrapped(ctx, title, 'd600', LIST.w - 20, 2, 64, 46) : null;
    const headLh = head ? head.size * 1.06 : 0;
    const headH = head ? head.lines.length * headLh + LIST.headGap : 0;
    const total = headH + n * h + (n - 1) * gap;
    const top = Math.max(LIST.top, (LIST.top + LIST.bottom) / 2 - total / 2);
    const nameW = LIST.w - 26 - tile - 28 - 30 - 52 - 22;
    const rows = items.map((it, i) => ({
      ...it, x: LIST.x, y: top + headH + i * (h + gap), w: LIST.w, h, tile,
      ...fitName(ctx, it.text, nameW, h - 24, maxSize),
    }));

    if (head) {
      const he = ease.outCubic(clamp((t - 0.08) / 0.45));
      ctx.save();
      ctx.globalAlpha *= he;
      head.lines.forEach((l, k) => text(ctx, l, LIST.x + 6, top + headLh * (k + 0.5) + (1 - he) * 16, {
        weight: 'd600', size: head.size, color: s.set.ink, align: 'left',
      }));
      ctx.restore();
    }

    const at = revealTimes(s, items);
    const shown = at.filter(a => t >= a).length;
    const newest = Math.max(0, shown - 1);
    rows.forEach((row, i) => {
      const dt = t - at[i];
      if (dt < 0) return;
      drawRow(ctx, row, {
        e: ease.outCubic(clamp(dt / 0.42)),
        tileIn: s.enter(at[i] + 0.08, 0.36),
        checkIn: s.enter(at[i] + 0.22, 0.3),
        hot: i === newest,
        dark,
      });
    });

    // Kit on the floor, bottom left: points at each row as it lands, cheers
    // once the list is complete.
    const m = s.beat.mascot || {};
    const kx = 214, ky = BAND.floorY + 60, ks = 0.86;
    const last = at[at.length - 1];
    const done = t >= last + 0.6;
    const target = rows[newest];
    const pose = m.pose || (done ? 'cheer' : t < at[0] ? 'idle' : 'point');
    const justLanded = at.some(a => t >= a && t < a + 0.35);
    s.kit({
      x: kx, y: ky, s: ks, pose,
      face: m.face || (done ? 'happy' : justLanded ? 'wow' : 'smile'),
      look: 0.5,
      pointAt: { x: lerp(target.x + 60, target.x + 340, 0.3), y: target.y + target.h / 2 },
    });
  },
};
