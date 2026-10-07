// A reel from any link: reads a launch post, changelog entry or product page
// and turns it into the same candidate shape pick-news makes from the
// catalog's news, so everything after `seed` runs unchanged.
//
//   node src/new.mjs <url> [--brief "angle"] [--date YYYY-MM-DD]   print the candidate JSON
//
// The page's product is the catalog product on the same domain
// (productForUrl), or a new entry in catalog/local.json named after the site.
// Only the page's own words reach the writer as the news body; the writer
// still WebFetches the page itself and cites it for every claim.
//
// Env: REELKIT_FETCH_TIMEOUT_MS (default 20000).
import { spawnSync } from 'child_process';
import { products, product, productForUrl, addLocalProduct, registrableDomain } from './catalog.mjs';
import { htmlToText, stripSiteSuffix, parseJsonLd } from './lib/changelog-parse.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const TIMEOUT_MS = Number(process.env.REELKIT_FETCH_TIMEOUT_MS) || 20_000;
const BODY_CHARS = 1800;

const slug = s => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…` : s || '');
const isoDate = s => {
  const t = Date.parse(s || '');
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
};
const today = () => process.env.REELS_TODAY || new Date().toISOString().slice(0, 10);

// fetch first; curl with the same UA when fetch is refused (some docs and blog
// hosts block Node's TLS fingerprint or loop redirects without cookies).
async function getHtml(url) {
  let why;
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml', 'accept-language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { html: await res.text(), finalUrl: res.url || url };
    why = `HTTP ${res.status}`;
  } catch (e) {
    why = e.name === 'TimeoutError' ? `no response in ${TIMEOUT_MS / 1000}s` : e.message;
  }
  // -b '': an in-memory cookie jar, for hosts that set a cookie and redirect (ai.google.dev).
  const curl = spawnSync('curl', ['-sSL', '-b', '', '--compressed', '--max-time', String(Math.ceil(TIMEOUT_MS / 1000)), '-A', UA,
    '-H', 'accept-language: en-US,en;q=0.9', '-w', '\n%{http_code} %{url_effective}', url], { encoding: 'utf8', maxBuffer: 32 << 20 });
  const tail = curl.stdout?.lastIndexOf('\n') ?? -1;
  const [code, finalUrl] = tail >= 0 ? curl.stdout.slice(tail + 1).split(' ') : [];
  if (curl.status === 0 && /^2/.test(code || '')) return { html: curl.stdout.slice(0, tail), finalUrl: finalUrl || url };
  throw new Error(`couldn't load ${url} (${why}${code && code !== '000' ? `; curl got HTTP ${code}` : ''})`);
}

// <meta property="og:title" content="…"> in either attribute order.
function meta(html, ...names) {
  for (const name of names) {
    for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
      const tag = m[0];
      const key = tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1];
      if (key?.toLowerCase() !== name) continue;
      const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
      const text = htmlToText(content);
      if (text) return text;
    }
  }
  return null;
}

// The article's own words: <article>, else <main>, else <body>, minus the
// site chrome around it.
function mainText(html) {
  const chrome = s => s.replace(/<(nav|header|footer|aside|form|noscript|svg|button)\b[\s\S]*?<\/\1>/gi, ' ');
  for (const tag of ['article', 'main', 'body']) {
    const m = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*)</${tag}>`, 'i'));
    const text = m ? htmlToText(chrome(m[1])) : '';
    if (text.length >= 200 || tag === 'body') return text;
  }
  return '';
}

// "openai.com" → "OpenAI"-ish: the first host label, capitalised.
function prettyHost(host) {
  const base = registrableDomain(host).split('.')[0] || host;
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// "Introducing X | Acme Blog" → "Introducing X" when the tail names the site.
function cleanTitle(title, site) {
  let t = stripSiteSuffix(title || '');
  if (site) {
    const re = new RegExp(`\\s*[|\\u2013\\u2014·:-]\\s*${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^|\\u2013\\u2014·]*$`, 'i');
    const cut = t.replace(re, '').trim();
    if (cut) t = cut;
  }
  // "… | Customers", "… | Blog": a short trailing section name.
  for (let i = 0; i < 2; i++) {
    const m = t.match(/^(.{12,}?)\s+[|·]\s+[^|·]{1,30}$/);
    if (m) t = m[1].trim();
  }
  return t;
}

// A blog on its own domain (github.blog): the product whose catalog news
// comes from that domain, when one clearly does (most of it, 3+ items).
function newsHome(url) {
  const key = registrableDomain(new URL(url).hostname);
  const votes = new Map();
  let total = 0;
  for (const p of products()) {
    for (const n of p.news) {
      let host;
      try { host = new URL(n.url || n.sourceUrl).hostname; } catch { continue; }
      if (registrableDomain(host) !== key) continue;
      votes.set(p, (votes.get(p) || 0) + 1);
      total++;
    }
  }
  const [best, count] = [...votes].sort((a, b) => b[1] - a[1])[0] || [];
  return best && count >= 3 && count / total >= 0.6 ? best : null;
}

// The product a page belongs to: the catalog's, or a local one named after
// the site. A slug that's already another domain's product falls back to the
// host's slug, then a numbered one, so a local entry never patches a site product.
async function productFor(url, { siteName, html }) {
  const found = productForUrl(url) || newsHome(url);
  if (found) return found;
  const { origin, hostname } = new URL(url);
  const key = registrableDomain(hostname);
  let home = { html, finalUrl: url };
  if (new URL(url).pathname.replace(/\/$/, '')) {
    try { home = await getHtml(origin); } catch { /* the article's own tags will do */ }
  }
  const title = siteName || meta(home.html, 'og:site_name', 'application-name') || prettyHost(hostname);
  const sameSite = p => p && [p.url, p.displayDomain].some(u => {
    try { return registrableDomain(new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname) === key; } catch { return false; }
  });
  let id = null;
  for (const base of [slug(title), slug(key.replace(/\./g, '-'))].filter(Boolean)) {
    for (let n = 1; n < 20 && !id; n++) {
      const candidate = n === 1 ? base : `${base}-${n}`;
      const existing = product(candidate);
      // Same site under its own name (a domain productForUrl found ambiguous):
      // use it as is rather than overwrite its fields.
      if (existing && sameSite(existing)) return existing;
      if (!existing) id = candidate;
    }
    if (id) break;
  }
  if (!id) throw new Error(`couldn't find a free product id for ${hostname}`);
  return addLocalProduct({
    id,
    title,
    description: clip(meta(home.html, 'og:description', 'description') || '', 300) || undefined,
    url: origin,
    displayDomain: hostname.replace(/^www\./, ''),
    logo: null,
  });
}

/**
 * A candidate built from known parts: the same shape pickNews returns, with
 * one item. Also rebuilds a URL-made episode's candidate when resuming.
 */
export function buildCandidate({ product: p, toolId, toolTitle, title, body = '', date, url, extraUrls = [], name = null, brief = null }) {
  toolId ||= p?.id;
  toolTitle ||= p?.title || toolId;
  const primary = { toolId, toolTitle, title, body, date, url, tweetId: null, relatedTools: [], score: 0, reasons: [], keys: [] };
  return {
    id: `${toolId}:${slug(title)}`,
    name: name || title,
    score: 0,
    reasons: [],
    date,
    primary,
    items: [primary],
    tools: [{ id: toolId, title: toolTitle, page: p?.page }],
    urls: [...new Set([url, ...extraUrls].filter(Boolean))],
    origin: 'url',
    ...(brief ? { brief } : {}),
  };
}

/**
 * Read a page and return a pick-news-shaped candidate for it.
 * @param date   override the page's published date (YYYY-MM-DD)
 * @param brief  the producer's angle, passed to the writer as notes
 */
export async function candidateFromUrl(url, { brief = null, date = null } = {}) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error(`"${url}" isn't a URL`); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error(`"${url}" isn't an http(s) link`);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`--date must be YYYY-MM-DD, got "${date}"`);

  const { html, finalUrl } = await getHtml(parsed.href);
  const page = new URL(finalUrl);
  page.hash = '';
  const pageUrl = page.href;
  const ld = parseJsonLd(html)[0] || {};
  const siteName = meta(html, 'og:site_name', 'application-name');
  const rawTitle = meta(html, 'og:title', 'twitter:title') || ld.title || htmlToText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const title = cleanTitle(rawTitle, siteName) || prettyHost(page.hostname);
  const description = meta(html, 'og:description', 'twitter:description', 'description') || ld.body || '';
  const text = mainText(html);
  // The description leads: it's the publisher's own summary, and the page
  // text after it often starts with bylines and menus.
  const body = clip([description, text.startsWith(description) ? text.slice(description.length) : text].filter(Boolean).join('\n\n').trim(), BODY_CHARS);
  const published = isoDate(meta(html, 'article:published_time', 'og:published_time', 'datepublished', 'date', 'pubdate'))
    || ld.date || isoDate(html.match(/<time\b[^>]*\bdatetime\s*=\s*["']([^"']+)["']/i)?.[1]);

  const p = await productFor(pageUrl, { siteName, html });
  return buildCandidate({ product: p, title, body, date: date || published || today(), url: pageUrl, brief: brief || null });
}

// ---------------------------------------------------------------- cli

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? null : null; };
  const url = args.find((a, i) => !a.startsWith('--') && !['--brief', '--date'].includes(args[i - 1]));
  if (!url) {
    console.error('usage: node src/new.mjs <url> [--brief "angle"] [--date YYYY-MM-DD]');
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(await candidateFromUrl(url, { brief: flag('--brief'), date: flag('--date') }), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
