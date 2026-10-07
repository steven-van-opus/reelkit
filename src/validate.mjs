// Script checker: does an episode.json follow the contract in
// scenes/SCENES.md? Run it on anything a person or a model wrote before
// spending time on voice and frames.
//
//   node src/validate.mjs episodes/<id> [episodes/<id> …]    exits 1 on errors
//
// The scene catalog comes from two places: the table in SCENES.md (the
// authoritative props contract, including scenes that are planned but not
// built yet) and scenes/index.mjs (what the renderer can actually draw right
// now). A beat naming a planned-but-unbuilt scene is valid — it renders with
// the fallback card until the scene lands — and is reported as a warning.
//
// Media ids in props ('m03') are checked against the episode's media.json,
// the manifest src/media.mjs writes when it collects the sources' images and
// video.
//
// The voiceover is one spoken take (episode.script) cut into beats, so when a
// script is present the beats' vo, minus the closing CTA beat, must join back
// into it word for word. Caption-speak in the vo (colons, "New:", runs of
// short one-sentence beats, lines with no verb) is a warning, not an error.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { STUDIO_SETS, SET_ALIASES } from './brand.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SCENES_MD = path.join(here, 'scenes', 'SCENES.md');

export const LIMITS = {
  beats: [6, 9],         // including the house CTA beat
  takeBeats: [5, 7],     // what the take is cut into, before the CTA beat
  label: 34,
  beatWords: 24,
  totalWords: [60, 95],  // every beat's vo, CTA included
  scriptWords: [60, 75], // the take alone: ~26–32 s once the house CTA is appended
  shortSentence: 10,     // a one-sentence beat this short reads like a caption line
  keyword: 10,
};

// The studio sets, plus the paper-era names scripts may still use (rose →
// pearl, chalk → light, …). Both resolve in brand.mjs.
export const SET_NAMES = Object.keys(STUDIO_SETS);
export const OLD_SET_NAMES = Object.keys(SET_ALIASES).filter(n => !SET_NAMES.includes(n));
export const setName = name => (SET_NAMES.includes(name) ? name : SET_ALIASES[name] || null);
export const POSES = ['idle', 'wave', 'point', 'cheer', 'hold', 'think', 'shrug', 'walk', 'type'];
export const FACES = ['smile', 'happy', 'wow', 'wink', 'focus', 'grin'];

// Words the brand voice never uses. Checked in everything that ends up on
// screen, in the voiceover or in the post caption.
export const HYPE = [
  'game-changer', 'game changer', 'game-changing', 'revolutionary', 'revolutionize', 'insane', 'insanely',
  'mind-blowing', 'mind blowing', 'blow your mind', 'crazy', 'unbelievable', 'groundbreaking', 'jaw-dropping',
  'next-level', 'next level', "you won't believe", 'changes everything', 'killer feature', 'must-have',
];
const HYPE_RE = new RegExp(`\\b(${HYPE.map(w => w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/'/g, "['’]")).join('|')})\\b`, 'i');
const EMOJI_RE = /\p{Extended_Pictographic}/u;

export const words = s => String(s || '').trim().split(/\s+/).filter(Boolean);

// Sentence split that, unlike a plain /[.!?]/ split, keeps "2.1" and "$1.50"
// in one piece. tts.mjs synthesises vo/speak sentence by sentence, so the two
// fields must break into the same number of sentences.
export const sentences = s => String(s || '').match(/(?:\d(?:[.,]\d+)+|[^.!?])+[.!?]*["')\]]*\s*/g)?.map(x => x.trim()).filter(Boolean) || [];

// ---------------------------------------------------------------- catalog

// Split on commas that aren't inside (), [], {} or quotes.
function splitTop(str) {
  const out = [];
  let depth = 0, quote = null, cur = '';
  for (const c of str) {
    if (quote) { if (c === quote) quote = null; cur += c; continue; }
    if (c === '"') { quote = c; cur += c; continue; }
    if ('([{'.includes(c)) depth++;
    if (')]}'.includes(c)) depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const range = str => {
  const m = /(\d+)\s*[–-]\s*(\d+)/.exec(str);
  if (m) return [Number(m[1]), Number(m[2])];
  const le = /≤\s*(\d+)/.exec(str);
  return le ? [0, Number(le[1])] : null;
};

// "(optional …)" and "(default 'card')" both mean the prop can be left out.
const isOptional = str => /optional|\bdefault/i.test(str);

// One prop's spec from its SCENES.md description, e.g.
//   `chips` string[≤3] each ≤18        → { kind: 'strings', count: [0, 3], max: 18 }
//   `rows` [{`text` ≤26, …}] 2–4         → { kind: 'objects', count: [2, 4], fields }
//   `result` 'image' | 'ui' | 'code'      → { kind: 'enum', values }
//   `media` id                            → { kind: 'media' }        one media.json id
//   `media` id[2–4]                       → { kind: 'medias', count: [2, 4] }
//   `focus` [x,y,w,h] 0–1                 → { kind: 'rect' }         a region of the image
function parseSpec(rest, name = '') {
  rest = rest.trim();
  if (rest.startsWith('[{')) {
    const close = rest.lastIndexOf('}]');
    const tail = rest.slice(close + 2);
    return { kind: 'objects', fields: parseProps(rest.slice(2, close)), count: range(tail), optional: isOptional(tail) };
  }
  if (rest.startsWith('{')) {
    const close = rest.lastIndexOf('}');
    const tail = rest.slice(close + 1);
    return { kind: 'object', fields: parseProps(rest.slice(1, close)), optional: isOptional(tail) };
  }
  const ids = /^id\[([^\]]*)\]/.exec(rest);
  if (ids) return { kind: 'medias', count: range(ids[1]), optional: isOptional(rest) };
  if (/^id\b/.test(rest)) return { kind: 'media', optional: isOptional(rest) };
  if (/^\[\s*x\s*,\s*y\s*,\s*w\s*,\s*h\s*\]/.test(rest)) return { kind: 'rect', optional: isOptional(rest) };
  const arr = /string\[([^\]]*)\]/.exec(rest);
  if (arr) {
    const each = /each\s*≤\s*(\d+)/.exec(rest);
    return { kind: 'strings', count: range(arr[1]), max: each ? Number(each[1]) : null, optional: isOptional(rest) };
  }
  const values = [...new Set([...rest.matchAll(/'([^']+)'/g)].map(m => m[1]))];
  if (values.length > 1 && /\|/.test(rest)) return { kind: 'enum', values, optional: isOptional(rest) };
  const max = /≤\s*(\d+)/.exec(rest);
  return {
    kind: /^(toolId|logo)$/.test(name) ? 'tool' : 'string',
    max: max ? Number(max[1]) : null,
    upperWord: /uppercase word/i.test(rest),
    optional: isOptional(rest),
  };
}

// A table cell → { name: spec }. Two notations beyond `name` <spec>:
//   `beforeLabel`/`afterLabel` ≤12        one spec, several names
//   `media` id or `toolId` or `image`     alternatives: each is optional
function parseProps(cell) {
  const props = {};
  for (const piece of splitTop(cell)) {
    const m = /^`(\w+)`((?:\s*\/\s*`\w+`)*)\s*([\s\S]*)$/.exec(piece);
    if (!m) continue;
    const names = [m[1], ...[...m[2].matchAll(/`(\w+)`/g)].map(x => x[1])];
    const alts = [...m[3].matchAll(/\s*\bor\s+`(\w+)`/g)].map(x => x[1]);
    const rest = m[3].replace(/\s*\bor\s+`\w+`/g, '');
    for (const name of names) props[name] = { ...parseSpec(rest, name), desc: m[3].trim() };
    if (alts.length) {
      props[m[1]].optional = true;
      for (const name of alts) props[name] ||= { ...parseSpec('', name), optional: true, desc: `alternative to \`${m[1]}\`` };
    }
  }
  return props;
}

// The prose under the table that adds props to existing scenes, e.g.
//   `prompt.media` (show this real result …), `hook.logo` (toolId …),
//   `where.items` entries may be strings or `{ text, logo }` (toolId; …)
// → [{ type, name, note, fields }]: note is the bracketed remark, fields the
// object form the entries of an existing list prop may also take.
function parseExtras(section) {
  const prose = section.split('\n').filter(l => !/^\s*\|/.test(l)).join(' ');
  const out = [];
  for (const m of prose.matchAll(/`(\w+)\.(\w+)`([^`(]*)(?:`\{([^`]*)\}`)?\s*(?:\(([^)]*)\))?/g)) {
    const note = (m[5] || m[3]).replace(/\s+/g, ' ').trim();
    const fields = m[4] ? m[4].split(',').map(f => f.trim()).filter(Boolean) : null;
    out.push({ type: m[1], name: m[2], note, fields });
  }
  return out;
}

// The catalog table in SCENES.md: type → { use, propsText, props }.
export function parseScenesMd(md = fs.readFileSync(SCENES_MD, 'utf8')) {
  const out = {};
  const section = md.split(/^## Catalog/m)[1]?.split(/^## /m)[0] || '';
  for (const line of section.split('\n')) {
    if (!/^\|\s*`/.test(line)) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map(c => c.trim().replace(/\\\|/g, '|'));
    const type = /`([\w-]+)`/.exec(cells[0])?.[1];
    if (!type) continue;
    out[type] = { use: cells[1], propsText: cells[2], props: parseProps(cells[2]) };
  }
  for (const x of parseExtras(section)) {
    const scene = out[x.type];
    if (!scene) continue;
    const known = scene.props[x.name];
    if (known && x.fields) {
      // where.items: each entry is a string or { text, logo }.
      known.entryFields = x.fields;
      scene.propsText += `; \`${x.name}\` entries may also be { ${x.fields.join(', ')} } (${x.note})`;
    } else if (!known) {
      scene.props[x.name] = { ...parseSpec(x.name === 'media' ? 'id' : '', x.name), optional: true, desc: x.note };
      scene.propsText += `, \`${x.name}\` ${x.name === 'media' ? 'id ' : ''}(optional: ${x.note})`;
    }
  }
  return out;
}

// What scenes/index.mjs registers right now. A scene file another agent is
// halfway through writing can fail to import; that shouldn't stop a check
// against the documented contract, so it degrades to SCENES.md only.
async function registeredCatalog() {
  try {
    const mod = await import(pathToFileURL(path.join(here, 'scenes', 'index.mjs')).href);
    return { list: mod.sceneCatalog(), error: null };
  } catch (e) {
    return { list: [], error: e.message.split('\n')[0] };
  }
}

// A loose spec from a scene module's own human-readable prop string.
function moduleSpec(name, str) {
  str = String(str);
  const isList = /\[\]|string\[|array|list/i.test(str);
  if (/^media$/.test(name) && !isList) return { kind: 'media', optional: true, desc: str };
  return { kind: isList ? 'any' : /^(toolId|logo)$/.test(name) ? 'tool' : 'string', max: isList ? null : Number(/≤\s*(\d+)/.exec(str)?.[1]) || null, optional: isOptional(str), desc: str };
}

// Drawn content a real media item replaces: with props.media set, these props
// may be left out (phone shows the real screen instead of drawn rows).
const MEDIA_STANDS_IN = { phone: ['rows', 'title'] };

// Merged view used by the validator and the script writer: every documented or
// registered scene with its use, props text and parsed prop specs.
export async function sceneSpecs() {
  const md = parseScenesMd();
  const reg = await registeredCatalog();
  const specs = {};
  for (const [type, d] of Object.entries(md)) {
    specs[type] = { type, use: d.use, describe: null, propsText: d.propsText, props: d.props, built: false };
  }
  for (const s of reg.list) {
    if (s.type.startsWith('_')) continue;
    const known = specs[s.type];
    if (known) {
      Object.assign(known, { describe: s.describe || null, built: true });
      // The module may know a prop the table doesn't yet, or call a
      // documented one optional; either only loosens the check.
      for (const [k, v] of Object.entries(s.props || {})) {
        if (!known.props[k]) {
          known.props[k] = moduleSpec(k, v);
          known.propsText += `, \`${k}\` ${v}`;
        } else if (isOptional(String(v))) known.props[k].optional = true;
      }
      continue;
    }
    // Registered but undocumented: derive a loose spec from the module's own
    // human-readable prop strings.
    const props = {};
    for (const [k, v] of Object.entries(s.props || {})) props[k] = moduleSpec(k, v);
    specs[s.type] = {
      type: s.type, use: s.describe || '', describe: s.describe || null, built: true, props,
      propsText: Object.entries(s.props || {}).map(([k, v]) => `\`${k}\` ${v}`).join(', '),
    };
  }
  for (const [type, keys] of Object.entries(MEDIA_STANDS_IN)) {
    if (specs[type]?.props.media) specs[type].propsText += `; with \`media\` set, ${keys.map(k => `\`${k}\``).join(' and ')} may be left out`;
  }
  return { specs, loadError: reg.error };
}

// ---------------------------------------------------------------- media

// The episode's media.json as Map(id → item), or null when there is none.
export function readMedia(dir) {
  const file = path.join(dir, 'media.json');
  if (!fs.existsSync(file)) return null;
  try { return mediaMap(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch (e) { throw new Error(`can't read ${file}: ${e.message}`); }
}

const mediaMap = m => (m instanceof Map ? m : new Map((Array.isArray(m) ? m : m?.items || []).filter(it => it?.id).map(it => [it.id, it])));

// Catalog product ids, for logo props. Null when the catalog can't be read;
// the logo checks are then skipped.
let toolIds;
async function knownTools() {
  if (toolIds !== undefined) return toolIds;
  try { toolIds = new Set((await import('./catalog.mjs')).productIndex().keys()); } catch { toolIds = null; }
  return toolIds;
}

// ---------------------------------------------------------------- checks

// ctx: { errors, warnings, media: Map | null | undefined, tools: Set | null }.
// media undefined means "not known here" and skips the id lookups.
function checkMediaId(where, id, ctx) {
  if (typeof id !== 'string' || !id) { ctx.errors.push(`${where} must be a media id from media.json, e.g. "m01"`); return; }
  if (ctx.media === undefined) return;
  if (!ctx.media?.size) ctx.errors.push(`${where} "${id}": this episode has no media (no media.json), so it can't show real media`);
  else if (!ctx.media.has(id)) ctx.errors.push(`${where} "${id}" isn't in media.json (ids: ${[...ctx.media.keys()].join(', ')})`);
}

function checkTool(where, id, ctx) {
  if (typeof id !== 'string') { ctx.errors.push(`${where} must be a catalog product id`); return; }
  if (ctx.tools && !ctx.tools.has(id)) ctx.warnings.push(`${where} "${id}" isn't a catalog product id; it renders without a logo`);
}

function checkValue(where, value, spec, ctx) {
  const { errors } = ctx;
  if (value === undefined || value === null || value === '') {
    if (!spec.optional) errors.push(`${where} is required`);
    return;
  }
  switch (spec.kind) {
    case 'string': {
      if (typeof value !== 'string') { errors.push(`${where} must be a string`); return; }
      if (spec.max && value.length > spec.max) errors.push(`${where} "${value}" is ${value.length} chars, max ${spec.max}`);
      if (spec.upperWord && !/^[A-Z][A-Z0-9]*$/.test(value)) errors.push(`${where} "${value}" must be ONE uppercase word`);
      break;
    }
    case 'tool':
      checkTool(where, value, ctx);
      break;
    case 'enum':
      if (!spec.values.includes(value)) errors.push(`${where} "${value}" must be one of ${spec.values.join(' | ')}`);
      break;
    case 'strings': {
      if (!Array.isArray(value)) { errors.push(`${where} must be an array of strings`); return; }
      const [lo, hi] = spec.count || [0, Infinity];
      if (value.length < lo || value.length > hi) errors.push(`${where} has ${value.length} items, needs ${lo}–${hi}`);
      value.forEach((v, i) => {
        // where.items: { text, logo } entries are fine too.
        if (spec.entryFields && v && typeof v === 'object' && !Array.isArray(v)) {
          const extra = Object.keys(v).filter(k => !spec.entryFields.includes(k));
          if (extra.length) errors.push(`${where}[${i}] has unknown field(s) ${extra.join(', ')} (allowed: ${spec.entryFields.join(', ')})`);
          if (typeof v.text !== 'string' || !v.text) errors.push(`${where}[${i}].text is required`);
          else if (spec.max && v.text.length > spec.max) errors.push(`${where}[${i}].text "${v.text}" is ${v.text.length} chars, max ${spec.max}`);
          if (v.logo !== undefined) checkTool(`${where}[${i}].logo`, v.logo, ctx);
          return;
        }
        if (typeof v !== 'string') errors.push(`${where}[${i}] must be a string${spec.entryFields ? ` or { ${spec.entryFields.join(', ')} }` : ''}`);
        else if (spec.max && v.length > spec.max) errors.push(`${where}[${i}] "${v}" is ${v.length} chars, max ${spec.max}`);
      });
      break;
    }
    case 'objects': {
      if (!Array.isArray(value)) { errors.push(`${where} must be an array`); return; }
      const [lo, hi] = spec.count || [0, Infinity];
      if (value.length < lo || value.length > hi) errors.push(`${where} has ${value.length} items, needs ${lo}–${hi}`);
      value.forEach((v, i) => checkObject(`${where}[${i}]`, v, spec.fields, ctx));
      break;
    }
    case 'object':
      checkObject(where, value, spec.fields, ctx);
      break;
    case 'media':
      checkMediaId(where, value, ctx);
      break;
    case 'medias': {
      if (!Array.isArray(value)) { errors.push(`${where} must be an array of media ids`); return; }
      const [lo, hi] = spec.count || [1, Infinity];
      if (value.length < lo || value.length > hi) errors.push(`${where} has ${value.length} ids, needs ${lo}–${hi}`);
      if (new Set(value).size !== value.length) errors.push(`${where} repeats a media id`);
      value.forEach((id, i) => checkMediaId(`${where}[${i}]`, id, ctx));
      break;
    }
    case 'rect': {
      const ok = Array.isArray(value) && value.length === 4 && value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1);
      if (!ok) { errors.push(`${where} must be [x, y, w, h]: four numbers from 0 to 1 (fractions of the image)`); return; }
      const [x, y, w, h] = value;
      if (w <= 0 || h <= 0) errors.push(`${where} needs a width and height above 0`);
      else if (x + w > 1.001 || y + h > 1.001) ctx.warnings.push(`${where} [${value.join(', ')}] reaches past the edge of the image`);
      break;
    }
    default:
      break;
  }
}

function checkObject(where, value, fields, ctx) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { ctx.errors.push(`${where} must be an object`); return; }
  for (const [k, spec] of Object.entries(fields)) checkValue(`${where}.${k}`, value[k], spec, ctx);
}

// Every string a viewer reads on screen (label + props), for the emoji and
// hype checks. Media ids, tool ids and focus boxes aren't text.
function screenStrings(beat, spec) {
  const out = [beat.label];
  const walk = v => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  for (const [k, v] of Object.entries(beat.props || {})) {
    if (!['media', 'medias', 'rect', 'tool'].includes(spec?.props?.[k]?.kind)) walk(v);
  }
  return out.filter(Boolean);
}

// Media ids anywhere in a beat's props, for "is every collected item used?".
const propMediaIds = (beat, spec) => Object.entries(beat.props || {}).flatMap(([k, v]) => {
  const kind = spec?.props?.[k]?.kind;
  return kind === 'media' ? [v] : kind === 'medias' && Array.isArray(v) ? v : [];
}).filter(v => typeof v === 'string');

const isUrl = u => typeof u === 'string' && /^https?:\/\/\S+$/.test(u);

// ---------------------------------------------------------------- the take

// The beats the narrator's take is cut into: all of them but a closing CTA
// beat (the house CTA, src/cta.mjs, is appended after the take).
export const takeBeats = beats => (Array.isArray(beats) && beats.at(-1)?.scene === 'cta' ? beats.slice(0, -1) : beats || []);

// Compare the take and the beats as a listener would: spacing and curly vs
// straight quotes don't count, every word and punctuation mark does.
const normTake = s => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// Why the beats don't join into the script, pointing at the first word that
// differs and the beat it's in, so a retry can fix exactly that.
function takeMismatch(script, beats) {
  const want = words(normTake(script));
  const owner = [];
  const got = beats.flatMap((b, i) => words(normTake(b?.vo)).map(w => (owner.push(i + 1), w)));
  let k = 0;
  while (k < want.length && k < got.length && want[k] === got[k]) k++;
  const near = (list, at) => `${at > 3 ? '…' : ''}${list.slice(Math.max(0, at - 3), at + 4).join(' ')}${at + 4 < list.length ? '…' : ''}`;
  const head = "the beats' vo (without the CTA beat) must join into episode.script word for word";
  if (k === got.length) return `${head}, but the beats stop after word ${k}; the script goes on: "${near(want, k)}"`;
  if (k === want.length) return `${head}, but beat ${owner[k]} adds "${near(got, k)}" after the script ends`;
  return `${head}, but they differ at word ${k + 1}, in beat ${owner[k]}: the script says "${near(want, k)}", the beats say "${near(got, k)}"`;
}

// ---------------------------------------------------------------- register

// Soft checks for caption-speak: lines written to be read off a slide rather
// than said to a friend. They warn, never fail, so the heuristics lean towards
// staying quiet: "no verb" only fires when nothing in the line looks like one.

const VERB_WORDS = new Set(('am is are was were be been being do does did has have had can could will would should may might must shall ' +
  'let lets take takes took make makes made get gets got give gives gave keep keeps kept go goes went come comes came ' +
  'need needs want wants mean means help helps become becomes became bring brings brought feel feels seem seems ' +
  'stay stays stop stops start starts happen happens matter matters land lands say says said know knows find finds found ' +
  'work works run runs show shows turn turns add adds ship ships shipped launched released dropped added costs supports includes').split(' '));
const S_CONTRACTIONS = new Set(["it's", "that's", "there's", "here's", "what's", "he's", "she's", "who's", "let's", "where's", "how's", "everything's", "nothing's"]);
const SUBJECTS = new Set(['i', 'you', 'we', 'they', 'he', 'she', 'it', 'who']);
// Determiners and object pronouns: what follows a verb ("upload the", "send you").
const DETERMINERS = new Set('a an the your my our their its his her this these those every each any some'.split(' '));
const OBJECTS = new Set([...DETERMINERS, 'it', 'them', 'me', 'us', 'you', 'him']);
const ADVERBS = new Set(('just now also still finally actually really already automatically instantly officially quietly ' +
  'never always simply even suddenly quickly easily often usually soon then').split(' '));
const NUMBERS = new Set('one two three four five six seven eight nine ten eleven twelve twenty thirty fifty hundred thousand million half'.split(' '));
// Words that open or glue noun-phrase fragments ("New in Figma", "Free for
// every plan", "Up to 14 images"); never taken for a verb.
const NOT_VERB = new Set([...OBJECTS, ...ADVERBS, ...NUMBERS, ...(
  'and or but so nor yet plus than as if when while since because though although whether not no all both ' +
  'of in on at to for from with without by about into onto over under up down out off near via per like unlike ' +
  'after before during until across through between among beyond inside outside more most less least much many few ' +
  'new free available live here there better faster cheaper bigger smaller cleaner same other another next first last ' +
  'unlimited real big small full official public ready early').split(' ')]);
const PARTICLES = new Set(['on', 'off', 'up', 'out', 'down', 'back', 'away']);

const isNumber = w => /^\$?\d/.test(w) || NUMBERS.has(w);
const tokens = vo => words(String(vo).replace(/’/g, "'")).map(raw => {
  const bare = raw.replace(/^[^\p{L}\p{N}$']+|[^\p{L}\p{N}']+$/gu, '');
  return { w: bare.toLowerCase(), name: /^\p{Lu}/u.test(bare), pause: /[,;:.!?)"”—–]$/.test(raw) };
}).filter(t => t.w);

/** Does a voiceover line contain something that works as a verb? */
export function hasVerb(vo) {
  const ts = tokens(vo);
  const open = w => w && !NOT_VERB.has(w) && !isNumber(w);
  return ts.some((t, i) => {
    const prev = ts[i - 1], next = ts[i + 1];
    const joined = next && !t.pause;  // the next word follows without a pause
    if (VERB_WORDS.has(t.w) || S_CONTRACTIONS.has(t.w) || /n't$|'(re|ve|ll|d|m)$/.test(t.w)) return true;
    // "you can", "it now works", but not "for you" / "send it a".
    if (SUBJECTS.has(t.w) && !(prev && /^(for|to|with|from|at|by|about|of)$/.test(prev.w))) {
      let j = i + 1;
      while (ts[j] && ADVERBS.has(ts[j].w) && !ts[j - 1].pause) j++;
      if (ts[j] && !ts[j - 1].pause && open(ts[j].w)) return true;
    }
    // "just shipped", "finally stop tiling" (but "now available" stays a fragment).
    if (ADVERBS.has(t.w) && joined && open(next.w) && !next.name) return true;
    // "to edit".
    if (t.w === 'to' && joined && open(next.w)) return true;
    // Imperatives at the start of a clause: "Upload the original", "turn on".
    const clauseStart = !prev || prev.pause || /^(and|or|but|then|so)$/.test(prev.w);
    if (clauseStart && open(t.w) && joined && (OBJECTS.has(next.w) || PARTICLES.has(next.w))) return true;
    // "show up in", "sign out" (but not "up to" / "out of").
    if (open(t.w) && joined && PARTICLES.has(next.w) && next.w !== 'on' && !/^(to|of)$/.test(ts[i + 2]?.w || '')) return true;
    // "the plan covers ten", "Acme ships a" (but not "ten models a month").
    if (/[^su's]s$/.test(t.w) && open(t.w) && joined && (OBJECTS.has(next.w) || isNumber(next.w)) && prev && open(prev.w)) return true;
    // "the clip updates", "your old files open" (but not "the big news").
    const before = ts[i - 2];
    if (before && DETERMINERS.has(before.w) && !before.pause && !prev.pause && open(prev.w) && open(t.w)
      && (/[^su's]s$/.test(t.w) || /[^su's]s$/.test(prev.w))) return true;
    return false;
  });
}

// A beat that is exactly one complete, short sentence.
const shortSentence = vo => {
  const s = String(vo || '').trim();
  return sentences(s).length === 1 && /[.!?]["')\]”]*$/.test(s) && words(s).length <= LIMITS.shortSentence;
};

/** Caption-speak in the take's beats, as warnings. */
export function registerWarnings(beats) {
  const out = [];
  const take = takeBeats(beats);
  take.forEach((b, i) => {
    const vo = String(b?.vo || '').trim();
    if (!vo) return;
    const at = `beat ${i + 1}`;
    if (/^["“']?new\s*:/i.test(vo)) out.push(`${at}: vo starts with "New:", a caption label; say who shipped what instead ("Acme just shipped …")`);
    else if (/(?<!\d):(?!\d)/.test(vo)) out.push(`${at}: vo "${vo}" has a colon, which reads like a caption; say it as a sentence ("the catch is …", "here's how it works")`);
    if (!hasVerb(vo)) out.push(`${at}: vo "${vo}" has no verb, so it sounds like a caption fragment; fold it into a sentence with the line before or after`);
  });
  // Runs of three or more one-short-sentence beats: list cadence.
  for (let i = 0; i < take.length;) {
    let j = i;
    while (j < take.length && shortSentence(take[j]?.vo)) j++;
    if (j - i >= 3) out.push(`beats ${i + 1}–${j} are each one short sentence (${take.slice(i, j).map(b => `"${String(b.vo).trim()}"`).join(' / ')}), a list cadence; join them into connected sentences with and, so, but or which`);
    i = Math.max(j, i + 1);
  }
  return out;
}


/**
 * Check an episode object against the contract.
 * @param media  the episode's media (media.json object, its items, or a Map);
 *               null = the episode has none; omitted = don't check media ids.
 * @param mediaDir  the episode folder, to check the media files exist.
 * @returns {Promise<{ errors: string[], warnings: string[] }>}
 */
export async function checkEpisode(episode, { specs, media, mediaDir = null } = {}) {
  const errors = [], warnings = [];
  let loadError = null;
  if (!specs) ({ specs, loadError } = await sceneSpecs());
  if (loadError) warnings.push(`scenes/index.mjs failed to load (${loadError}); checked against SCENES.md only`);
  const ctx = { errors, warnings, media: media === undefined ? undefined : media ? mediaMap(media) : null, tools: await knownTools() };

  if (!episode || typeof episode !== 'object') return { errors: ['episode.json is not an object'], warnings };
  const beats = Array.isArray(episode.beats) ? episode.beats : [];
  if (!Array.isArray(episode.beats)) errors.push('beats must be an array');

  // Episode-level fields.
  if (!episode.id) errors.push('id is required');
  if (!episode.date) warnings.push('date is missing');
  if (!episode.subject?.name) errors.push('subject.name is required');
  if (episode.subject?.accent && !/^#[0-9a-f]{6}$/i.test(episode.subject.accent)) errors.push(`subject.accent "${episode.subject.accent}" must be a #RRGGBB hex`);
  if (!episode.source?.url) errors.push('source.url is required');
  else if (!isUrl(episode.source.url)) errors.push(`source.url "${episode.source.url}" is not a URL`);

  const keyword = episode.cta?.keyword;
  if (!keyword) errors.push('cta.keyword is required');
  else if (!new RegExp(`^[A-Z][A-Z0-9]{1,${LIMITS.keyword - 1}}$`).test(keyword)) errors.push(`cta.keyword "${keyword}" must be ONE uppercase word, 2–${LIMITS.keyword} chars`);

  if (!Array.isArray(episode.sources) || episode.sources.length === 0) errors.push('sources must list at least one { claim, url }');
  else episode.sources.forEach((s, i) => {
    if (!s?.claim) errors.push(`sources[${i}].claim is required`);
    if (!isUrl(s?.url)) errors.push(`sources[${i}].url "${s?.url ?? ''}" is not a URL`);
  });

  if (!episode.post?.caption) errors.push('post.caption is required');
  else {
    if (episode.post.caption.length > 2200) errors.push(`post.caption is ${episode.post.caption.length} chars, Instagram allows 2200`);
    if (HYPE_RE.test(episode.post.caption)) errors.push(`post.caption uses hype wording ("${HYPE_RE.exec(episode.post.caption)[1]}")`);
    if (keyword && !episode.post.caption.includes(keyword)) warnings.push(`post.caption never mentions the keyword ${keyword}`);
  }
  if (!Array.isArray(episode.post?.hashtags) || episode.post.hashtags.length === 0) warnings.push('post.hashtags is empty');

  // Beats.
  if (beats.length < LIMITS.beats[0] || beats.length > LIMITS.beats[1]) errors.push(`${beats.length} beats, needs ${LIMITS.beats[0]}–${LIMITS.beats[1]}`);
  if (beats.length && beats[0].scene !== 'hook') errors.push(`beat 1 must use the 'hook' scene (got '${beats[0].scene}')`);
  if (beats.length && beats.at(-1).scene !== 'cta') errors.push(`the last beat must use the 'cta' scene (got '${beats.at(-1).scene}')`);

  let total = 0;
  const unbuilt = new Set(), oldSets = new Set(), shown = new Map(); // media id → beats showing it
  beats.forEach((b, i) => {
    const at = `beat ${i + 1}${b?.scene ? ` (${b.scene})` : ''}`;
    if (!b || typeof b !== 'object') { errors.push(`${at} is not an object`); return; }
    const spec = specs[b.scene];

    // Labels render as written (sentence case), so any case is fine.
    if (!b.label) errors.push(`${at}: label is required`);
    else if (b.label.length > LIMITS.label) errors.push(`${at}: label "${b.label}" is ${b.label.length} chars, max ${LIMITS.label}`);

    const n = words(b.vo).length;
    total += n;
    if (!n) errors.push(`${at}: vo is required`);
    else if (n > LIMITS.beatWords) errors.push(`${at}: vo is ${n} words, max ${LIMITS.beatWords}`);
    if (b.speak !== undefined) {
      const sv = sentences(b.vo).length, ss = sentences(b.speak).length;
      if (sv !== ss) errors.push(`${at}: speak has ${ss} sentence(s) but vo has ${sv}; they must match`);
    }
    if (/https?:\/\/|www\./i.test(b.vo || '')) errors.push(`${at}: vo contains a URL; say the site name instead`);
    if (HYPE_RE.test(b.vo || '')) errors.push(`${at}: vo uses hype wording ("${HYPE_RE.exec(b.vo)[1]}")`);

    for (const str of screenStrings(b, spec)) {
      if (EMOJI_RE.test(str)) errors.push(`${at}: "${str}" contains an emoji; the fonts can't draw them`);
      if (HYPE_RE.test(str)) errors.push(`${at}: "${str}" uses hype wording`);
    }
    if (EMOJI_RE.test(b.vo || '')) errors.push(`${at}: vo contains an emoji (captions can't draw them)`);

    if (!b.set) warnings.push(`${at}: no set, defaults to 'pearl'`);
    else if (!setName(b.set)) errors.push(`${at}: set "${b.set}" must be one of ${SET_NAMES.join(' | ')}`);
    else if (OLD_SET_NAMES.includes(b.set)) oldSets.add(b.set);

    if (b.mascot) {
      if (b.mascot.pose && !POSES.includes(b.mascot.pose)) errors.push(`${at}: mascot.pose "${b.mascot.pose}" must be one of ${POSES.join(' | ')}`);
      if (b.mascot.face && !FACES.includes(b.mascot.face)) errors.push(`${at}: mascot.face "${b.mascot.face}" must be one of ${FACES.join(' | ')}`);
    }

    // Beat-level logos: tool ids pinned into the caption chips, or false.
    if (b.logos !== undefined && b.logos !== false) {
      if (!Array.isArray(b.logos)) errors.push(`${at}: logos must be a list of tool ids or false`);
      else b.logos.forEach((id, k) => checkTool(`${at}: logos[${k}]`, id, ctx));
    }

    if (!b.scene) { errors.push(`${at}: scene is required`); return; }
    if (!spec) { errors.push(`${at}: unknown scene '${b.scene}' (known: ${Object.keys(specs).join(', ')})`); return; }
    if (!spec.built) unbuilt.add(b.scene);
    const props = b.props || {};
    if (typeof props !== 'object' || Array.isArray(props)) { errors.push(`${at}: props must be an object`); return; }
    const standsIn = props.media ? MEDIA_STANDS_IN[b.scene] || [] : [];
    for (const [k, ps] of Object.entries(spec.props)) checkValue(`${at}: props.${k}`, props[k], standsIn.includes(k) ? { ...ps, optional: true } : ps, ctx);
    for (const k of Object.keys(props)) if (!spec.props[k]) warnings.push(`${at}: props.${k} isn't part of the '${b.scene}' scene and will be ignored`);
    if (spec.props.before?.kind === 'media' && props.before && props.before === props.after) {
      errors.push(`${at}: props.before and props.after are both "${props.before}"; a before/after needs two different media ids`);
    }
    for (const id of new Set(propMediaIds(b, spec))) shown.set(id, (shown.get(id) || 0) + 1);
  });

  if (beats.length && (total < LIMITS.totalWords[0] || total > LIMITS.totalWords[1])) {
    errors.push(`voiceover is ${total} words in total, needs ${LIMITS.totalWords[0]}–${LIMITS.totalWords[1]} (~22–32 s)`);
  }

  // The take: one spoken script, cut into the beats before the CTA.
  if (episode.script !== undefined && episode.script !== null) {
    if (typeof episode.script !== 'string' || !episode.script.trim()) errors.push('script must be the spoken take as one string');
    else {
      const cut = takeBeats(beats);
      if (normTake(episode.script) !== normTake(cut.map(b => b?.vo || '').join(' '))) errors.push(takeMismatch(episode.script, cut));
      const n = words(episode.script).length;
      const [lo, hi] = LIMITS.scriptWords;
      if (n < lo || n > hi) warnings.push(`script is ${n} words; aim for ${lo}–${hi} so the reel voices to ~26–32 s with the house CTA`);
    }
  }
  warnings.push(...registerWarnings(beats));

  // The CTA beat and episode.cta must agree, and the line should say the word.
  const last = beats.at(-1);
  if (last?.scene === 'cta' && keyword) {
    if (last.props?.keyword && last.props.keyword !== keyword) errors.push(`last beat props.keyword "${last.props.keyword}" ≠ cta.keyword "${keyword}"`);
    if (!new RegExp(`\\b${keyword}\\b`, 'i').test(last.vo || '')) errors.push(`last beat vo must say the keyword ${keyword}`);
  }
  for (const i of beats.keys()) {
    const a = setName(beats[i - 1]?.set), b = setName(beats[i].set);
    if (i > 0 && b && a === b) warnings.push(`beats ${i} and ${i + 1} share the '${b}' set; alternate sets so cuts read`);
  }
  if (oldSets.size) warnings.push(`paper-era set names still work, but new scripts use the studio names (${[...oldSets].map(n => `${n} → ${SET_ALIASES[n]}`).join(', ')})`);
  if (unbuilt.size) warnings.push(`scene(s) ${[...unbuilt].join(', ')} are documented but not built yet; they render as the fallback card until they land`);

  // Media: files on disk, and a nudge when real visuals go unused.
  if (ctx.media?.size) {
    if (mediaDir) {
      for (const id of shown.keys()) {
        const item = ctx.media.get(id);
        if (item?.file && !fs.existsSync(path.join(mediaDir, item.file))) warnings.push(`media ${id} (${item.file}) is missing on disk; collect media again before rendering`);
      }
    }
    for (const [id, n] of shown) if (n > 2) warnings.push(`media ${id} is on screen in ${n} beats; show each item at most twice`);
    if (!shown.size) warnings.push(`media.json has ${ctx.media.size} item(s) but no beat shows one; when a beat describes something visual, show the real media`);
  }

  return { errors, warnings };
}

/** The list of contract errors for an episode (empty when valid). */
export async function validateEpisode(episode, opts) {
  return (await checkEpisode(episode, opts)).errors;
}

export async function validateDir(dir, opts = {}) {
  const file = path.join(dir, 'episode.json');
  let episode, media;
  try { episode = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return { errors: [`can't read ${file}: ${e.message}`], warnings: [] }; }
  try { media = readMedia(dir); }
  catch (e) { return { errors: [e.message], warnings: [] }; }
  return checkEpisode(episode, { media, mediaDir: dir, ...opts });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (!dirs.length) {
    console.error('usage: node src/validate.mjs episodes/<id> [episodes/<id> …]');
    process.exit(2);
  }
  const { specs, loadError } = await sceneSpecs();
  let bad = 0;
  for (const d of dirs) {
    const dir = path.resolve(d);
    const { errors, warnings } = await validateDir(dir, { specs });
    if (loadError) warnings.unshift(`scenes/index.mjs failed to load (${loadError}); checked against SCENES.md only`);
    console.log(`${errors.length ? 'FAIL' : 'ok  '}  ${path.relative(process.cwd(), dir) || dir}  (${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'})`);
    for (const e of errors) console.log(`  error    ${e}`);
    for (const w of warnings) console.log(`  warning  ${w}`);
    if (errors.length) bad++;
  }
  process.exit(bad ? 1 : 0);
}
