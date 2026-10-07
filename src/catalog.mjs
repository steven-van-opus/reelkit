// Products: the tools a reel can be about, with their news, logos and preview
// images. The only module that knows where they come from. Sources, merged in
// this order (later wins per id):
//   1. catalog/tools.json — a trimmed snapshot of the Creators Toolbox catalog
//      (npm run catalog:sync), site images as absolute creatorstoolbox.com URLs
//   2. REELKIT_SITE=/path/to/Creators-Toolbox — that checkout's data.ts and
//      approved logos / previews, read live in place of the snapshot
//   3. catalog/local.json — products added by hand or by `new --url`; an entry
//      with a site product's id overrides just the fields it sets
//
// A product is what the site's parseCatalogFromDataTs() returns (id, title,
// description, category, toolCategory, route, popularity, url, domain, logo,
// image, themeColor, tags, personas, features, news[]) without faqs /
// longDescription, plus logoBg, displayDomain, screenshots[], approvedLogo,
// approvedPreview, news[].media[] and `page` (its creatorstoolbox.com page;
// undefined for local-only products). Image fields may be URLs or site paths:
// load them through resolveImageSrc().
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readSiteCatalog } from './lib/site-catalog.mjs';
import { CATEGORY_TO_ROUTE } from './lib/data-ts.mjs';

export const PRODUCT_SITE = 'https://creatorstoolbox.com';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SNAPSHOT = path.join(ROOT, 'catalog', 'tools.json');
export const LOCAL = path.join(ROOT, 'catalog', 'local.json');
const SITE_DIR = process.env.REELKIT_SITE ? path.resolve(process.env.REELKIT_SITE) : null;

// Stored key order (tools.json, local.json). Unknown keys follow, sorted.
const PRODUCT_KEYS = ['id', 'title', 'description', 'category', 'toolCategory', 'route', 'popularity', 'price', 'url', 'displayDomain',
  'logo', 'logoBg', 'logoFallback', 'approvedLogo', 'image', 'approvedPreview', 'screenshots', 'themeColor', 'tags', 'personas', 'features', 'news'];
const NEWS_KEYS = ['title', 'body', 'date', 'url', 'sourceUrl', 'tweetId', 'relatedTools', 'image', 'sourceImage', 'media'];
const MEDIA_KEYS = ['type', 'url', 'poster', 'alt', 'caption'];
// Derived on load, never stored.
const DERIVED = new Set(['domain', 'page']);

const empty = v => v === undefined || v === null || (Array.isArray(v) && !v.length);
function ordered(obj, keys) {
  const out = {};
  for (const k of [...keys, ...Object.keys(obj).filter(k => !keys.includes(k)).sort()]) {
    if (!DERIVED.has(k) && !empty(obj[k])) out[k] = obj[k];
  }
  return out;
}

/** A product as stored: stable key order, no empty fields (load fills them back). */
export function compactProduct(p) {
  const out = ordered(p, PRODUCT_KEYS);
  if (out.news) out.news = out.news.map(n => {
    const item = ordered(n, NEWS_KEYS);
    if (item.media) item.media = item.media.map(m => ordered(m, MEDIA_KEYS));
    return item;
  });
  return out;
}

// Back to the full shape, so consumers never check for missing arrays.
function normalize(p, onSite) {
  const route = p.route || CATEGORY_TO_ROUTE[p.category] || 'tools';
  return {
    ...p,
    route,
    displayDomain: p.displayDomain ?? p.domain,
    domain: p.domain ?? p.displayDomain,
    approvedLogo: p.approvedLogo || null,
    approvedPreview: p.approvedPreview || null,
    screenshots: p.screenshots || [],
    tags: p.tags || [],
    personas: p.personas || [],
    features: p.features || [],
    news: (p.news || []).map(n => ({ ...n, body: n.body || '', relatedTools: n.relatedTools || [], media: n.media || [] })),
    page: onSite ? `${PRODUCT_SITE}/${route}/${p.id}` : p.page,
  };
}

function readList(file) {
  if (!fs.existsSync(file)) return null;
  try {
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(list)) throw new Error('expected an array of products');
    return list;
  } catch (err) {
    throw new Error(`can't read ${path.relative(process.cwd(), file)}: ${err.message}`);
  }
}

let cache = null;
let index = null;

/** Every product: the site catalog, then local additions. Cached. */
export function products() {
  if (cache) return cache;
  let base;
  if (SITE_DIR) {
    try { base = readSiteCatalog(SITE_DIR, { siteUrl: PRODUCT_SITE }); } catch (err) { throw new Error(`REELKIT_SITE: ${err.message}`); }
  } else {
    base = readList(SNAPSHOT);
    if (!base) {
      console.warn('catalog/tools.json is missing; run `npm run catalog:sync -- /path/to/Creators-Toolbox` to rebuild it');
      base = [];
    }
  }
  // A local entry with a site product's id patches its fields in place (Map.set
  // keeps the position, so a patch never reorders the catalog).
  const raw = new Map();
  for (const p of base) if (p?.id) raw.set(p.id, p);
  const onSite = new Set(raw.keys());
  for (const p of readList(LOCAL) || []) if (p?.id) raw.set(p.id, onSite.has(p.id) ? { ...raw.get(p.id), ...p } : p);
  index = new Map([...raw].map(([id, p]) => [id, normalize(p, onSite.has(id))]));
  cache = [...index.values()];
  return cache;
}

/** id → product. */
export function productIndex() {
  if (!index) products();
  return index;
}

export function product(id) {
  return (id && productIndex().get(id)) || null;
}

/**
 * Add or update a product in catalog/local.json (fields merge into an existing
 * local entry). Returns the product as products() now returns it.
 */
export function addLocalProduct(p) {
  if (!p?.id || !/^[a-z0-9][a-z0-9-]*$/.test(p.id)) throw new Error(`a local product needs a lowercase slug id, got ${JSON.stringify(p?.id)}`);
  if (!p.title) throw new Error(`local product ${p.id} needs a title`);
  const list = readList(LOCAL) || [];
  const i = list.findIndex(x => x?.id === p.id);
  const given = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined));
  const stored = compactProduct({ ...(i >= 0 ? list[i] : {}), ...given });
  if (i >= 0) list[i] = stored;
  else list.push(stored);
  list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  fs.mkdirSync(path.dirname(LOCAL), { recursive: true });
  fs.writeFileSync(LOCAL, `${JSON.stringify(list, null, 2)}\n`);
  cache = index = null;
  return product(p.id);
}

// ---------------------------------------------------------------- domains

// Two-label public suffixes ("co.uk"), so example.co.uk isn't just "co.uk".
const SECOND_LEVEL = /^(co|com|net|org|gov|edu|ac|ltd|plc|ne|or|go|gob|nic)\.[a-z]{2}$/;
// Hosts that give every customer a subdomain: the subdomain is the site.
const HOSTED = new Set(['vercel.app', 'netlify.app', 'github.io', 'gitlab.io', 'pages.dev', 'workers.dev', 'web.app', 'firebaseapp.com',
  'herokuapp.com', 'notion.site', 'framer.website', 'framer.ai', 'framer.app', 'webflow.io', 'substack.com', 'itch.io', 'lovable.app',
  'replit.app', 'carrd.co', 'gitbook.io', 'blogspot.com', 'wordpress.com', 'myshopify.com', 'bubbleapps.io', 'glitch.me', 'surge.sh',
  'fly.dev', 'onrender.com', 'streamlit.app', 'hf.space', 'medium.com', 'tumblr.com', 'wixsite.com', 'beehiiv.com', 'super.site']);
// Hosts where the path is the product (a repo, an app listing, a profile):
// only a product whose own URL is a prefix of the path matches.
const BY_PATH = new Set(['github.com', 'gitlab.com', 'huggingface.co', 'x.com', 'twitter.com', 'youtube.com', 'youtu.be', 'apps.apple.com',
  'play.google.com', 'chromewebstore.google.com', 'chrome.google.com', 'npmjs.com', 'producthunt.com', 'linkedin.com', 'reddit.com',
  'instagram.com', 'tiktok.com', 'threads.net', 'bsky.app', 'behance.net', 'dribbble.com', 'gumroad.com', 'patreon.com', 'codepen.io',
  'codesandbox.io', 'marketplace.visualstudio.com', 'addons.mozilla.org', 'docs.google.com', 'drive.google.com', 'sites.google.com']);

function parseSite(u) {
  if (!u) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `https://${u}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    // Query params that name the thing (Play Store ?id=), not tracking or locale.
    const query = [...url.searchParams].filter(([k]) => !/^(utm_\w+|hl|gl|ref|lang|locale)$/i.test(k));
    return host ? { host, segs: url.pathname.split('/').filter(Boolean).map(s => s.toLowerCase()), query, params: url.searchParams } : null;
  } catch { return null; }
}

/** example.com for docs.example.com; foo.vercel.app stays whole. */
export function registrableDomain(host) {
  const labels = String(host || '').toLowerCase().replace(/^www\./, '').split('.').filter(Boolean);
  const n = SECOND_LEVEL.test(labels.slice(-2).join('.')) ? 3 : 2;
  const reg = labels.slice(-n).join('.');
  return HOSTED.has(reg) && labels.length > n ? labels.slice(-n - 1).join('.') : reg;
}

/**
 * The product a URL belongs to: same registrable domain as its url or
 * displayDomain, preferring the same host, then the domain's own site (for
 * help.example.com), then the longest matching path ("chatgpt.com/maps" over
 * "chatgpt.com"), then popularity. Null when nothing matches or the domain
 * hosts several products and none is clearly this one.
 */
export function productForUrl(url) {
  const target = parseSite(url);
  if (!target) return null;
  const key = registrableDomain(target.host);
  const byPath = BY_PATH.has(target.host);
  const hits = [];
  for (const p of products()) {
    const own = parseSite(p.url);
    const shown = parseSite(p.displayDomain);
    // displayDomain is only the host it shows ("figma.com" on a Figma plugin,
    // "adobe.com" behind an affiliate link): it counts when it's a different
    // site from the url, as a weak match, never to widen the url.
    for (const [site, weak] of [[own, false], [shown && shown.host !== own?.host ? shown : null, true]]) {
      if (!site || registrableDomain(site.host) !== key) continue;
      const prefix = site.segs.length > 0 && site.segs.every((s, i) => target.segs[i] === s);
      // A product that lives at a path elsewhere on the domain isn't this page.
      if (site.segs.length && !prefix) continue;
      // On github.com & co. the path is the product; the platform's own entry
      // only matches its home page.
      if (byPath && (site.host !== target.host || (site.segs.length ? !prefix : target.segs.length > 0))) continue;
      if (byPath && site.query.some(([k, v]) => target.params.get(k) !== v)) continue;
      const score = (weak ? 0 : site.host === target.host ? 100 : site.host === key ? 50 : 0) + site.segs.length;
      hits.push({ p, host: site.host, score });
    }
  }
  if (!hits.length) return null;
  const top = Math.max(...hits.map(h => h.score));
  const tops = hits.filter(h => h.score === top);
  // workspace.google.com with only gemini.google.com and notebooklm.google.com
  // matching by domain: too ambiguous to pick one.
  if (top < 50 && new Set(tops.map(h => h.host)).size > 1) return null;
  // Stable sort: equal popularity keeps catalog order.
  return tops.sort((a, b) => (b.p.popularity || 0) - (a.p.popularity || 0))[0].p;
}

// ---------------------------------------------------------------- images

/**
 * Where to load a product image from: a site path ("/images/…") or a
 * creatorstoolbox.com URL becomes the REELKIT_SITE checkout's file when it
 * has one, else the live site's URL. Anything else is returned as is.
 */
export function resolveImageSrc(src) {
  if (!src) return null;
  src = String(src);
  let sitePath = null;
  if (src.startsWith('/') && !src.startsWith('//')) sitePath = src;
  else if (src.startsWith(`${PRODUCT_SITE}/`)) sitePath = src.slice(PRODUCT_SITE.length);
  if (!sitePath) return src.startsWith('//') ? `https:${src}` : src;
  if (SITE_DIR) {
    const file = path.join(SITE_DIR, 'public', sitePath.split('?')[0]);
    if (fs.existsSync(file)) return file;
  }
  return `${PRODUCT_SITE}${sitePath}`;
}
