// News picker: reads every product's news[] from the catalog and ranks what would
// make a good reel for creators — launches, GA, "now available", new models
// and features for design, video, image, audio, agents and coding — over
// patch-version changelogs, SDK bumps, admin/security notes and bug fixes.
//
//   node src/pick-news.mjs                    top 10 from the last 3 days
//   node src/pick-news.mjs --days 7 --top 20
//   node src/pick-news.mjs --news "banana"    only candidates matching a URL or title substring
//   node src/pick-news.mjs --json             machine-readable
//
// One launch is often logged under several tools ("Nano Banana 2.1" under
// gemini, vercel, netlify and higgsfield). Those merge into one candidate with
// every source, and the spread itself counts as signal. Anything an existing
// episodes/*/episode.json already covers is skipped (folders starting with "_"
// are tests and don't count).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { products } from './catalog.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REELS = path.resolve(here, '..');
export const EPISODES = path.join(REELS, 'episodes');

// Below this a candidate isn't worth a reel; --auto makes nothing that day.
export const MIN_SCORE = 10;

// ---------------------------------------------------------------- signals

// [pattern, points, reason]. Title hits count in full, body hits at half.
const LAUNCH = [
  [/\bgenerally available\b|\(GA\)|\bis (now )?GA\b|\bexits? beta\b|\bout of beta\b/i, 5, 'GA'],
  [/\b(launch(es|ed)?|introduc(es|ing|ed)|unveil(s|ed)?|debuts?|announc(es|ed|ing))\b/i, 4, 'launch'],
  [/\bnow (available|live|free|open)\b|\bis (now )?live\b|\bavailable (now|today)\b|\brolling out\b|\brolls? out\b|\byou can now\b/i, 4, 'now available'],
  [/\bnew\b/i, 1, 'new'],
];
const FREE = /\bfree\b|\$0\b/i;

const TOPICS = [
  [/\b(image|images|photo|photos|picture|illustration|art|upscal\w*|4K|resolution|aspect ratio)\b/i, 'image'],
  [/\b(video|videos|film|clip|clips|animat\w*|motion|reel|footage|camera|screen recording\w*)\b/i, 'video'],
  [/\b(design|designer|figma|canvas|font|fonts|typograph\w*|logo|brand|UI|UX|prototyp\w*|layout|3D)\b/i, 'design'],
  [/\b(audio|music|song|songs|album|albums|voice|speech|podcast|sound|dubbing|narrat\w*)\b/i, 'audio'],
  [/\b(agent|agents|model|models|AI|GPT|LLM|assistant|prompt)\b/i, 'AI'],
  [/\b(code|coding|developer|IDE|app builder|website|websites|no-code|vibe cod\w*|pull requests?)\b/i, 'build'],
  [/\b(creator|creators|YouTube|TikTok|Instagram|thumbnail|captions?|social|newsletter|ad|ads)\b/i, 'creator'],
];

const CREATOR_CATEGORIES = new Set(['Video', 'Audio', 'Image', 'Generator', 'Web Design', 'Graphic Design', '3D', 'Typography', 'Color']);
const CREATOR_PERSONAS = /designer|video|creator|editor|artist|musician|writer|marketer|youtuber|podcast/i;

// [pattern, points, reason, where] — where: 't' title only, 'tb' title + body.
const PENALTIES = [
  [/\bv?\d+\.\d+\.\d+\b/, -14, 'patch release', 't'],
  [/\bSDKs?\b|\bclient librar(y|ies)\b|\bnpm\b|\bpip install\b/i, -7, 'SDK release', 't'],
  [/\bsecurity\b|\bsecret scanning\b|\bcode scanning\b|\bvulnerab\w*|\bSSO\b|\bSAML\b|\bSCIM\b|\badmins?\b|\baudit log|\bcompliance\b|\bpermissions?\b|\bbilling\b|\busage metrics\b|\benterprise\b|\bgovernance\b|\bRBAC\b|\borg(anization)? settings\b|\borganizations\b|\bteamspace\b/i, -6, 'admin/security', 't'],
  [/\bfix(es|ed)?\b|\bbugs?\b|\bresolved\b|\bissue (where|with)\b|\bcrash\w*|\bstuck\b|\bregression\b|\bfailures?\b|\brestore\b/i, -9, 'bug fix', 't'],
  [/\bdeprecat\w*|\bdecommission\w*|\bsunset\w*|\bshut(ting)? down\b|\bend of life\b|\bretir(e|es|ed|ing)\b|\bdates? updated\b|\bmaintenance\b|\boutage\b|\bincident\b/i, -8, 'notice, not a launch', 't'],
  [/\bAPI\b|\bAI Gateway\b|\bendpoints?\b|\bwebhooks?\b|\brate limits?\b|\bfallbacks?\b|\bMCP\b|\bschema\b|\bparameters?\b|\bcapabilities\.\w+/i, -3, 'developer plumbing', 't'],
  [/\bpurchase orders?\b|\bsuppliers?\b|\binvoic\w*|\bpayroll\b|\btax(es)?\b|\baccounting\b|\binventory\b|\bmacros?\b|\bfrom Balance\b/i, -4, 'back-office', 't'],
  [/\bmedical\b|\bhealthcare\b|\bclinical\b/i, -3, 'niche vertical', 't'],
];

// "X now available on/in <platform>" — a distributor relaying someone else's
// launch. Fine as an extra source, not as the primary one.
const RELAY = /\b(now )?(available|live) (on|in)\b|\bon AI Gateway\b|\bin AI Gateway\b|\bis live on\b|\bnow on\b/i;
const PLATFORM_WORDS = /^(desktop|mobile|ios|android|mac|macos|windows|linux|web|public|beta|release|version|update|app|v)$/i;
const STOP = new Set('a an and the to of for in on with now is are your you it its new by from at as via into more than our we this that can'.split(' '));

const norm = s => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9.]+/g, ' ').trim();
const tokens = s => norm(s).split(' ').filter(w => w && !STOP.has(w) && w.length > 1);
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const todayUTC = () => process.env.REELS_TODAY || new Date().toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

// Launch keys used to merge the same launch across tools: the last ≤2
// capitalised words before a major.minor version, e.g.
//   "Google’s Gemini Nano Banana 2.1 now available in AI Gateway" → "nano banana 2.1"
// Patch versions (x.y.z) never merge — they're one tool's changelog stream.
function launchKeys(title) {
  const keys = [];
  const re = /((?:[A-Z][\w’'-]*\s+){1,4})v?(\d+(?:\.\d+)?)(?![.\d])/g;
  for (const m of title.matchAll(re)) {
    const nameWords = m[1].trim().split(/\s+/).map(w => w.replace(/[’']s$/, ''));
    const last = nameWords.slice(-2);
    if (last.join('').length < 4) continue;
    keys.push({ key: norm(`${last.join(' ')} ${m[2]}`), display: `${last.join(' ')} ${m[2]}` });
  }
  return keys;
}

// Title is just "<Tool> <version> [Desktop|Mobile|(Public)]" — a release
// notes heading, not news a viewer can picture.
function versionOnly(title, tool) {
  const toolWords = new Set(tokens(tool.title));
  const rest = norm(title.replace(/\(.*?\)/g, ' '))
    .split(' ')
    .filter(w => w && !toolWords.has(w) && !/^v?\d+(\.\d+)*$/.test(w) && !PLATFORM_WORDS.test(w));
  return /\d+\.\d+/.test(title) && rest.length <= 1;
}

function scoreItem(item, tool) {
  const reasons = [];
  let score = 0;
  const add = (pts, why) => { if (pts) { score += pts; reasons.push([pts, why]); } };

  let launch = 0, launchWhy = null;
  for (const [re, pts, why] of LAUNCH) {
    const p = re.test(item.title) ? pts : re.test(item.body) ? pts / 2 : 0;
    if (p > launch) { launch = p; launchWhy = why; }
  }
  add(launch, `${launchWhy} wording`);
  if (FREE.test(item.title)) add(2, 'free');

  const text = `${item.title} ${item.body}`;
  const hit = TOPICS.filter(([re]) => re.test(text)).map(([, name]) => name);
  add(Math.min(4.5, hit.length * 1.5), hit.length ? `${hit.join('/')} topics` : null);

  for (const [re, pts, why, where] of PENALTIES) {
    if (re.test(item.title) || (where === 'tb' && re.test(item.body))) add(pts, why);
  }
  if (versionOnly(item.title, tool) && !/\d+\.\d+\.\d+/.test(item.title)) add(-7, 'version-only title');

  // Concrete numbers make beats ("4K", "14 images", "$15") — reels live on them.
  const nums = (item.body.match(/\$\d[\d,.]*|\b\d+(?:\.\d+)?\s?(?:K|k|%|x|p|fps|s|seconds|minutes|images|languages|characters)\b|\b\d{2,}\b/g) || []).length;
  add(Math.min(2, nums * 0.4), nums ? 'concrete numbers' : null);
  if (item.body.length >= 200) add(1, 'detailed source');
  if (/(^|\/\/)(x|twitter)\.com\//.test(item.url || '')) add(-1, 'tweet-only source');
  return { score, reasons };
}

// ---------------------------------------------------------------- produced

// Everything existing episodes already cover. A changelog page URL shared by
// many news items (Gemini's single changelog page) only counts together with
// the news title, or one Gemini reel would block every later Gemini launch.
// A seed episode.json with no beats yet (a run that stopped before the script
// was written) doesn't count, so the story is picked again next time.
export function producedIndex(dir = EPISODES) {
  const idx = { urls: [], names: new Set(), titles: new Set() };
  if (!fs.existsSync(dir)) return idx;
  for (const id of fs.readdirSync(dir)) {
    if (id.startsWith('_') || id.startsWith('.')) continue;
    const file = path.join(dir, id, 'episode.json');
    if (!fs.existsSync(file)) continue;
    try {
      const ep = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!ep.beats?.length) continue;
      if (ep.subject?.name) idx.names.add(norm(ep.subject.name));
      if (ep.source?.newsTitle) idx.titles.add(norm(ep.source.newsTitle));
      for (const u of [ep.source?.url, ...(ep.source?.extraUrls || [])].filter(Boolean)) {
        idx.urls.push({ url: u, title: norm(ep.source?.newsTitle) });
      }
    } catch { /* a half-written episode.json doesn't block anything */ }
  }
  return idx;
}

function alreadyProduced(c, idx, urlCount) {
  if (idx.names.has(norm(c.name))) return `subject "${c.name}" already has an episode`;
  for (const it of c.items) {
    if (idx.titles.has(norm(it.title))) return `"${it.title}" already has an episode`;
    for (const p of idx.urls) {
      if (p.url !== it.url) continue;
      if ((urlCount.get(it.url) || 0) <= 1 || p.title === norm(it.title)) return `${it.url} already has an episode`;
    }
  }
  return null;
}

// ---------------------------------------------------------------- pick

/**
 * Ranked reel candidates from the last `days` days.
 * @returns {{ candidates: object[], skipped: object[], since: string, today: string, items: number }}
 */
export function pickNews({ days = 3, today = todayUTC(), filter = null, includeProduced = false, catalog = null } = {}) {
  catalog ||= products();
  const since = addDays(today, -days);
  const byId = new Map(catalog.map(t => [t.id, t]));

  // Every URL's use count across all news, for the produced check.
  const urlCount = new Map();
  for (const t of catalog) for (const n of t.news) {
    const u = n.url || n.sourceUrl;
    if (u) urlCount.set(u, (urlCount.get(u) || 0) + 1);
  }

  const items = [];
  for (const tool of catalog) {
    for (const n of tool.news) {
      if (!n.date || n.date < since || n.date > today) continue;
      const item = {
        toolId: tool.id,
        title: n.title.trim(),
        body: String(n.body || '').replace(/^\s*:\s*/, '').trim(),
        date: n.date,
        url: n.url || n.sourceUrl || (n.tweetId ? `https://x.com/i/status/${n.tweetId}` : null),
        tweetId: n.tweetId || null,
        relatedTools: n.relatedTools || [],
      };
      Object.assign(item, scoreItem(item, tool));
      item.keys = launchKeys(item.title);
      items.push(item);
    }
  }

  // Union-find merge: shared launch key, or the same normalised title, across
  // different tools.
  const parent = items.map((_, i) => i);
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const join = (a, b) => { parent[find(a)] = find(b); };
  const seen = new Map();
  items.forEach((it, i) => {
    for (const k of [...it.keys.map(k => `k:${k.key}`), `t:${tokens(it.title).join(' ')}`]) {
      if (!seen.has(k)) { seen.set(k, i); continue; }
      const j = seen.get(k);
      if (items[j].toolId !== it.toolId || k.startsWith('k:')) join(i, j);
    }
  });
  const groups = new Map();
  items.forEach((it, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(it);
  });

  const produced = producedIndex();
  const candidates = [], skipped = [];
  for (const group of groups.values()) {
    const tools = [...new Set(group.map(i => i.toolId))].map(id => byId.get(id));
    // Primary: the maker's own note beats a distributor relaying it, then score,
    // then the bigger tool.
    const rank = it => it.score + (RELAY.test(it.title) ? -6 : 0) + (byId.get(it.toolId).popularity || 0) / 20;
    const primary = [...group].sort((a, b) => rank(b) - rank(a))[0];
    const tool = byId.get(primary.toolId);
    const key = group.flatMap(i => i.keys).sort((a, b) => b.display.length - a.display.length)[0];

    const reasons = [...primary.reasons];
    let score = primary.score;
    const add = (pts, why) => { score += pts; reasons.push([pts, why]); };
    const pop = Math.max(...tools.map(t => t.popularity || 0));
    add(Math.max(0, Math.min(6.5, (pop - 60) / 6)), `popularity ${pop}`);
    if (tools.length > 1) add(Math.min(9, (tools.length - 1) * 3), `${tools.length} sources`);
    // Only a platform relaying someone else's launch logged it: the maker's own
    // announcement isn't in the catalog, so the facts are second-hand.
    else if (RELAY.test(primary.title)) add(-3, 'relayed by a platform');
    if (group.length > 1 && tools.length === 1) add(1, `${group.length} notes`);
    if (tools.some(t => CREATOR_CATEGORIES.has(t.toolCategory))) add(2, `${tools.find(t => CREATOR_CATEGORIES.has(t.toolCategory)).toolCategory} tool`);
    if (tools.some(t => (t.personas || []).some(p => CREATOR_PERSONAS.test(p)))) add(1, 'creator personas');
    const latest = group.map(i => i.date).sort().at(-1);
    const age = daysBetween(latest, today);
    add([2.5, 1.5, 0.5][age] || 0, `${age}d old`);

    const c = {
      id: `${primary.toolId}:${norm(primary.title).replace(/\s+/g, '-').slice(0, 60)}`,
      name: key ? key.display : primary.title,
      score: Math.round(score * 10) / 10,
      reasons: reasons.filter(([p, w]) => p && w).sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])),
      date: latest,
      primary: { ...primary, toolTitle: tool.title },
      items: group.sort((a, b) => (a === primary ? -1 : b === primary ? 1 : b.score - a.score)),
      tools: [tool, ...tools.filter(t => t !== tool)].map(t => ({
        id: t.id, title: t.title, category: t.category, toolCategory: t.toolCategory,
        popularity: t.popularity, personas: t.personas, page: t.page,
      })),
      urls: [...new Set(group.map(i => i.url).filter(Boolean))],
    };
    if (filter) {
      const f = filter.toLowerCase();
      if (!group.some(i => (i.url || '').toLowerCase() === f || i.title.toLowerCase().includes(f) || (i.url || '').toLowerCase().includes(f)) && !c.name.toLowerCase().includes(f)) continue;
    }
    const why = alreadyProduced(c, produced, urlCount);
    if (why && !includeProduced) { skipped.push({ ...c, skippedBecause: why }); continue; }
    if (why) c.alreadyProduced = why;
    candidates.push(c);
  }
  candidates.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
  return { candidates, skipped, since, today, items: items.length };
}

/** A product's full catalog entry, `page` included (its creatorstoolbox.com page, if it has one). */
export function toolEntry(id, catalog = null) {
  catalog ||= products();
  const t = catalog.find(x => x.id === id);
  return t ? { ...t } : null;
}

// ---------------------------------------------------------------- cli

export function formatCandidate(c, i) {
  const fmt = ([p, w]) => `${w} (${p > 0 ? '+' : ''}${Math.round(p * 10) / 10})`;
  const others = c.tools.length > 1 ? ` +${c.tools.length - 1} more (${c.tools.slice(1).map(t => t.id).join(', ')})` : '';
  return [
    `${String(i + 1).padStart(2)}. ${c.score.toFixed(1).padStart(5)}  ${c.name}`,
    `           ${c.date} · ${c.primary.toolId}${others}${c.alreadyProduced ? ` · ALREADY PRODUCED: ${c.alreadyProduced}` : ''}`,
    c.name !== c.primary.title ? `           “${c.primary.title}”` : null,
    `           ${c.reasons.map(fmt).join(', ')}`,
    `           ${c.primary.url || '(no url)'}`,
  ].filter(Boolean).join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? true : null; };
  const days = Number(flag('--days') || 3);
  const top = Number(flag('--top') || 10);
  const res = pickNews({
    days, filter: flag('--news') || null, today: flag('--today') || todayUTC(),
    includeProduced: args.includes('--all'),
  });
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...res, candidates: res.candidates.slice(0, top) }, null, 2));
  } else {
    console.log(`Reel candidates · news from ${res.since} to ${res.today} · ${res.items} items → ${res.candidates.length} candidates${res.skipped.length ? `, ${res.skipped.length} already produced` : ''} · min score ${MIN_SCORE}\n`);
    res.candidates.slice(0, top).forEach((c, i) => console.log(`${formatCandidate(c, i)}\n`));
    for (const s of res.skipped) console.log(`  skipped  ${s.name} — ${s.skippedBecause}`);
  }
}
