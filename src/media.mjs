// Source-media collector: the real pictures and clips behind an episode's
// claims, gathered from its sources so scenes can show the thing itself
// ("Visual truth" in scenes/SCENES.md) instead of a drawn stand-in.
//
//   node src/media.mjs episodes/<id>             → <id>/media/mNN.*, <id>/media.json, <id>/media/contact.jpg
//   node src/media.mjs episodes/<id> --max 24
//   node src/media.mjs episodes/<id> --dry       list the ranked candidates, download nothing
//
// Where it looks, best first:
//   1. the entry itself on each source page (source.url, source.extraUrls,
//      sources[].url). A changelog that lists many releases is narrowed to
//      this entry — its #anchor, the <article>/<li> its title sits in — so
//      the next release's screenshots stay out.
//   2. catalog news for the same launch (same URL, or the subject's name
//      within a few days): news.media, news.image, linkPreview.image, a
//      tweet, and the clip resolveNewsMedia() finds on the item's own page.
//   3. pages the entry links to on the vendor's own site: the "read more"
//      article (hydrateLinkedArticle) and the docs/product pages it points at,
//      if they name the subject. A page that renders client-side is rendered
//      in headless Chrome first; a poster image whose clip sits next to it on
//      the CDN (…-poster.webp → ….mp4) becomes that clip; a page with no media
//      but a card that draws the feature in HTML (Cursor's "Remote Control"
//      mock) gets that card captured as a screenshot.
//   4. og:image / twitter:image of those pages (site-wide defaults skipped).
//
// Inside a page, pictures are ranked by how much their caption, alt text and
// nearest heading say about the episode's claims (rare words count most), so
// a long docs page gives its "edit an image" example, not its first ten; one
// page fills at most half the list unless nothing else is left.
//
// Images are kept when they are ≥ 480px on the short side (UI screenshots
// ≥ 600px wide pass at 220px) and aren't a near-copy of one already kept —
// the larger copy wins. Videos (direct files, and YouTube / Vimeo / X players
// via yt-dlp) are cut to their first 20 s at ≤ 1080p. Fetches are sequential,
// with timeouts and a browser UA; anything that fails is logged and skipped.
// Re-runs keep every id in media.json and only append.
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { C, font, registerFonts } from './brand.mjs';
import { readManifest } from './mediastore.mjs';
import {
  pageMedia, readArticle, hydrateLinkedArticle, rankLinks, extractLinks, embedUrl, unwrapImageUrl, tokens, overlap,
} from './lib/changelog-links.mjs';
import { fetchMediaSource, resolveNewsMedia } from './lib/news-media.mjs';
import { htmlToText } from './lib/changelog-parse.mjs';
import { products, product } from './catalog.mjs';

const exec = promisify(execFile);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const YTDLP = fs.existsSync('/opt/homebrew/bin/yt-dlp') ? '/opt/homebrew/bin/yt-dlp' : 'yt-dlp';

const CLIP_SECONDS = 20;
const MIN_SHORT = 480;        // px, short side of a photo or render
const UI_SHORT = 220;         // …of a UI screenshot, when it's ≥ UI_LONG wide
const UI_LONG = 600;
const MIN_VIDEO_SHORT = 320;
const MAX_LONG = 4096;        // bigger images are scaled down to this
const MAX_VIDEOS = 6;
const perPage = max => Math.max(6, Math.ceil(max / 2));   // one long docs page fills at most half
const LINKS_PER_PAGE = 3;     // vendor pages followed from each source entry
const NEWS_DAYS = 3;          // a news item this close to the episode is the same launch

// Never content: chrome, people and tracking. (pageMedia already drops these
// for <img>; og images, posters and figure rescues go through it here.)
const JUNK = /(avatar|favicon|\bicons?\b|badge|emoji|spacer|pixel|track(ing)?\b|1x1|sprite|headshot|profile|author|placeholder|qr-?code|country-flags|wallpaper|glow-\d|\/flags?\/)/i;
// Share images every page of a site uses.
const GENERIC_OG = /(default|og-image-default|opengraph-default|site-assets|theming_assets|share-[a-z-]*\d{4})/i;
const AD_HOSTS = /(doubleclick|googlesyndication|google-analytics|googletagmanager|facebook\.com\/tr|analytics|pixel\.)/i;
// Words that say "this is a picture of an interface".
const UI_WORDS = /\b(screen(shot)?s?|ui|app|dashboard|panel|menu|button|click|settings?|prompt|dialog|modal|toolbar|sidebar|canvas|editor|chat|interface|window|tab|attach|upload|library|file|layers?)\b/i;
const UI_PAGES = /(help\.|docs?\.|\/docs?\/|\/help\/|support\.|changelog|release-notes|\/hc\/)/i;
// Site chrome a link can point at; never a page about the launch.
const SKIP_PATH = /\/(login|signin|sign-in|signup|sign-up|register|pricing|plans|terms|privacy|legal|cookies?|account|billing|checkout|download|careers|contact)(\/|$)/i;

const log = (...a) => console.log(...a);
const short = u => String(u || '').replace(/^https?:\/\/(www\.)?/, '').slice(0, 96);
const stripHash = u => String(u || '').replace(/#.*$/, '');
const pause = ms => new Promise(r => setTimeout(r, ms));
const registrable = host => String(host || '').toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');
const hostOf = u => { try { return new URL(u).hostname; } catch { return ''; } };
const escapeRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------- fetching

let work = null;                       // per-run temp folder: cookie jar, downloads
const workDir = () => (work ||= fs.mkdtempSync(path.join(os.tmpdir(), 'ct-media-')));
const lastHit = new Map();             // host → ms of the last request, for politeness

async function polite(url) {
  const host = hostOf(url);
  const wait = (lastHit.get(host) || 0) + 400 - Date.now();
  if (wait > 0) await pause(wait);
  lastHit.set(host, Date.now());
}

// curl with a browser UA and a cookie jar: some docs sites (ai.google.dev)
// bounce through a sign-in probe and only settle once a cookie sticks.
async function curl(url, args = [], { encoding = 'utf8', maxBuffer = 48 << 20 } = {}) {
  await polite(url);
  const jar = path.join(workDir(), 'cookies.txt');
  const { stdout } = await exec('curl', ['--fail', '--silent', '--show-error', '--location', '--compressed',
    '--max-redirs', '12', '--proto', '=http,https', '--proto-redir', '=http,https', '--max-time', '40',
    '-A', UA, '-H', 'accept-language: en-US,en;q=0.9', '-b', jar, '-c', jar, ...args, url], { encoding, maxBuffer });
  return stdout;
}

const pageCache = new Map();
// The page's HTML, or '' when it can't be had. Falls back to the shared
// news-media fetcher (Node fetch, then curl with the system certificates).
function getPage(url) {
  const key = stripHash(url);
  if (!pageCache.has(key)) pageCache.set(key, (async () => {
    try { return await curl(key, ['-H', 'accept: text/html,application/xhtml+xml;q=0.9,*/*;q=0.8']); }
    catch (err) {
      try { return await fetchMediaSource(key); }
      catch { log(`  ! page failed: ${short(key)} (${String(err.message).split('\n')[0].slice(0, 80)})`); return ''; }
    }
  })());
  return pageCache.get(key);
}

// Client-side pages are rendered in headless Chrome over the DevTools
// protocol: load, let it settle, scroll every scroller so lazy media mounts,
// then read the DOM back. (--dump-dom fires before the app has fetched its
// content, and --virtual-time-budget never ends on pages that loop video.)
const SETTLE_JS = `(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const boxes = [document.scrollingElement, ...[...document.querySelectorAll('body *')]
    .filter(e => e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY))].filter(Boolean).slice(0, 4);
  for (const el of boxes) for (let y = 0; y < Math.min(el.scrollHeight, 24000); y += 700) { el.scrollTop = y; await pause(220); }
  for (const v of document.querySelectorAll('video')) { v.preload = 'auto'; try { v.load(); } catch {} }
  await pause(1500);
  // Players and lazy images set their source as a property; write it back so the HTML carries it.
  for (const v of document.querySelectorAll('video')) if (v.currentSrc && !v.currentSrc.startsWith('blob:') && !v.getAttribute('src')) v.setAttribute('src', v.currentSrc);
  for (const i of document.querySelectorAll('img')) if (i.currentSrc && !i.currentSrc.startsWith('data:')) i.setAttribute('src', i.currentSrc);
  return true;
})()`;

const renderCache = new Map();
function renderPage(url) {
  const key = stripHash(url);
  if (!renderCache.has(key)) renderCache.set(key, withPage(key, async ({ evaluate }) => {
    const html = await evaluate('document.documentElement.outerHTML');
    const resources = JSON.parse(await evaluate(`JSON.stringify(performance.getEntriesByType('resource').map(r => r.name))`) || '[]');
    return html ? { html, resources } : null;
  }).catch(err => {
    log(`  ! render failed: ${short(key)} (${String(err.message).split('\n')[0].slice(0, 80)})`);
    return null;
  }));
  return renderCache.get(key);
}

// A section of a page that shows the subject but carries no media file: the
// vendor's own drawn-in-HTML mock of the feature (Cursor's "Remote Control"
// card: desktop window mirrored on a phone). Found by a heading that names the
// subject, widened to the largest block whose only heading is that one, and
// kept when it is mostly picture, not prose. Returns [{ file, heading, width, height }].
const SECTIONS_JS = words => `(async () => {
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const words = ${JSON.stringify(words)};
  const heads = [...document.querySelectorAll('h1,h2,h3,h4')]
    .filter(h => words.every(w => h.textContent.toLowerCase().includes(w))).slice(0, 3);
  const out = [];
  for (const h of heads) {
    let el = h;
    while (el.parentElement && el.parentElement !== document.body
      && el.parentElement.querySelectorAll('h1,h2,h3,h4').length === 1) el = el.parentElement;
    el.scrollIntoView({ block: 'center' });
    await pause(1200);
    const b = el.getBoundingClientRect();
    // Prose is long runs of text in paragraphs, lists, code and tables; a drawn
    // mock is short strings in boxes, whatever its total character count.
    const prose = [...el.querySelectorAll('p,li,pre,td,dd,blockquote')]
      .map(p => p.innerText.trim().length).filter(n => n >= 80).reduce((a, n) => a + n, 0);
    out.push({ x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height,
      heading: h.textContent.replace(/\\s+/g, ' ').trim(), density: prose / Math.max(1, b.width * b.height / 1000) });
  }
  return out;
})()`;

const captureCache = new Map();
function captureSections(url, words) {
  const key = stripHash(url);
  if (!captureCache.has(key)) captureCache.set(key, withPage(key, async ({ send, evaluate }) => {
    const shots = [];
    for (const s of (await evaluate(SECTIONS_JS(words), true)) || []) {
      // A feature card: card-sized (a block as wide or tall as the page is the
      // article itself), and light on prose (≤ 1.5 characters per 1000 px²).
      if (s.w < 400 || s.w > 1200 || s.h < 280 || s.h > 1100 || s.density > 1.5) continue;
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: s.x, y: s.y, width: s.w, height: s.h, scale: 1 } });
      if (!r?.result?.data) continue;
      const file = path.join(workDir(), `${crypto.randomUUID()}.png`);
      fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
      shots.push({ file, heading: s.heading });
    }
    return shots;
  }, { scale: 2 }).catch(err => {
    log(`  ! capture failed: ${short(key)} (${String(err.message).split('\n')[0].slice(0, 80)})`);
    return [];
  }));
  return captureCache.get(key);
}

// Open a page in headless Chrome over the DevTools protocol, let it settle,
// scroll so lazy media mounts, then hand { send, evaluate } to `fn`.
async function withPage(url, fn, { scale = 1 } = {}) {
  if (!fs.existsSync(CHROME)) return null;
  await polite(url);
  const profile = fs.mkdtempSync(path.join(workDir(), 'chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000',
    `--user-agent=${UA}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws = null;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let err = '';
      const timer = setTimeout(() => reject(new Error('Chrome did not start')), 20000);
      chrome.stderr.on('data', d => {
        err += d;
        const m = err.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) { clearTimeout(timer); resolve(m[1]); }
      });
      chrome.on('exit', () => { clearTimeout(timer); reject(new Error('Chrome exited')); });
    });
    const port = new URL(endpoint).port;
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('DevTools socket failed')); });
    let seq = 0;
    const pending = new Map();
    let loaded = null;
    const onLoad = new Promise(r => { loaded = r; });
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      if (msg.method === 'Page.loadEventFired') loaded();
    };
    const send = (method, params = {}) => new Promise(resolve => {
      const id = ++seq;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression, awaitPromise = false) =>
      (await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }))?.result?.result?.value;
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: scale, mobile: false });
    await send('Page.navigate', { url });
    await Promise.race([onLoad, pause(25000)]);
    await pause(4000);
    await Promise.race([evaluate(SETTLE_JS, true), pause(30000)]);
    return await fn({ send, evaluate });
  } finally {
    try { ws?.close(); } catch { /* already closed */ }
    chrome.kill('SIGKILL');
    await pause(200);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

// A page as the collector reads it: static HTML, or the rendered DOM when the
// static HTML is an app shell (next to no text and no media).
async function loadPage(url) {
  const html = await getPage(url);
  const article = readArticle(html, stripHash(url));
  if (html && (article.words >= 80 || pageMedia(html, stripHash(url)).length)) return { url, html, article, rendered: false, resources: [] };
  const r = await renderPage(url);
  if (!r) return { url, html, article, rendered: false, resources: [] };
  log(`  rendered client-side page: ${short(url)}`);
  // Keep the static og image: it is server-rendered, the live DOM may have swapped it.
  const live = readArticle(r.html, stripHash(url));
  return { url, html: r.html, article: { ...live, image: article.image || live.image }, rendered: true, resources: r.resources };
}

// ---------------------------------------------------------------- catalog news

let newsIndex = null;
// Every news item in the catalog, media[] included, tagged with its tool.
function allNews() {
  if (newsIndex) return newsIndex;
  newsIndex = [];
  for (const p of products()) {
    for (const item of p.news) newsIndex.push({ ...item, toolId: p.id });
  }
  return newsIndex;
}

const days = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;

// The news items about this launch, within NEWS_DAYS of the episode: the
// episode's own item, a title that names the subject, or one of the
// episode's pages whose title shares a word with the subject (a changelog URL
// carries every release on it, so the URL alone proves nothing).
function launchNews(episode, pageUrls, aliases) {
  const urls = new Set(pageUrls.map(u => u.replace(/\/$/, '')));
  const full = tokens(episode.subject?.name || '');          // "Figma agent": both words
  const core = tokens(episode.subject?.name || '', aliases); // "agent"
  const date = episode.date || episode.id?.slice(0, 10);
  return allNews().filter(n => {
    if (date && n.date && days(n.date, date) > NEWS_DAYS) return false;
    if (n.title === episode.source?.newsTitle) return true;
    const t = tokens(n.title);
    if (full.size && [...full].every(w => t.has(w))) return true;
    return !!n.url && urls.has(n.url.replace(/\/$/, '')) && [...core].some(w => t.has(w));
  });
}

// ---------------------------------------------------------------- page scoping

// The whole element that starts at `start` (an opening <tag>), by counting
// nested open/close tags of the same name. Headings end at the next heading
// of the same rank or higher.
function elementAt(src, start, tag) {
  tag = tag.toLowerCase();
  const level = /^h([1-6])$/.exec(tag)?.[1];
  if (level) {
    const re = new RegExp(`<h[1-${level}]\\b`, 'gi');
    re.lastIndex = start + 3;
    const next = re.exec(src);
    return src.slice(start, next ? next.index : Math.min(src.length, start + 60000));
  }
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0;
  for (let m; (m = re.exec(src));) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return src.slice(start, m.index + m[0].length);
  }
  return null;
}

// Title text as it sits in markup: words separated by spaces, tags or
// entities, apostrophes in any encoding.
function titlePattern(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean)
    .map(w => escapeRe(w).replace(/['’]/g, "(?:'|’|&#x27;|&#39;|&rsquo;|&apos;)").replace(/&/g, '(?:&|&amp;)'));
  return words.length >= 2 ? new RegExp(words.join('(?:\\s|<[^>]*>|&nbsp;|&#160;)+'), 'gi') : null;
}

// This entry's part of a page that lists many: the element its #anchor names,
// else the <article> / <li> / <section> its title sits in (big enough to be
// more than a table-of-contents line). Null when nothing narrower is found.
export function entrySection(html, pageUrl, titles = []) {
  const src = String(html || '');
  let hash = '';
  try { hash = decodeURIComponent(new URL(pageUrl).hash.slice(1)); } catch { /* no anchor */ }
  if (hash) {
    const m = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\bid=["']${escapeRe(hash)}["']`, 'i').exec(src);
    const el = m && elementAt(src, m.index, m[1]);
    if (el) return el;
  }
  const body = Math.max(0, src.search(/<body\b/i));
  for (const title of titles) {
    const re = titlePattern(title);
    if (!re) continue;
    re.lastIndex = body;
    const hit = re.exec(src);
    if (!hit) continue;
    const end = hit.index + hit[0].length;
    const opens = [...src.slice(Math.max(body, hit.index - 200000), hit.index + 1).matchAll(/<(article|section|li)\b/gi)];
    const offset = Math.max(body, hit.index - 200000);
    for (let i = opens.length - 1; i >= Math.max(0, opens.length - 60); i--) {
      const at = offset + opens[i].index;
      const el = elementAt(src, at, opens[i][1]);
      if (!el || at + el.length < end) continue;
      if (htmlToText(el).length < String(title).length + 80) continue;   // a TOC line, look further out
      return el;
    }
    // Title in a heading with no container: the heading's run.
    const h = [...src.slice(body, hit.index + 1).matchAll(/<h([1-6])\b/gi)].pop();
    if (h) return elementAt(src, body + h.index, `h${h[1]}`);
  }
  return null;
}

// The nearest heading above a URL's first appearance in the markup: the
// "Inpainting" over an inpainting example says what it shows.
function headingBefore(src, url) {
  const i = positionOf(src, url);
  if (i < 0) return '';
  // One-word headings are code tabs and labels ("Python", "REST", "Prompt"),
  // and an app's hidden ones ("Media fallback") are chrome — neither is a topic.
  const heads = [...src.slice(Math.max(0, i - 120000), i).matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
    .map(h => htmlToText(h[1]).replace(/^[#\s]+|[#\s]+$/g, ''))
    .filter(t => t.split(/\s+/).length >= 2 && !/\b(fallback|loading|skip to|cookies?|navigation|menu|sign (in|up)|log in)\b/i.test(t));
  return heads.length ? heads.at(-1).slice(0, 120) : '';
}

// Where a media URL sits in the markup (by file name), or -1: inside an
// <img>/<video>/<source> tag when it is one — a docs page names the same file
// in its code samples first.
function positionOf(src, url) {
  let file = '';
  try { file = new URL(url).pathname.split('/').filter(Boolean).pop() || ''; } catch { return -1; }
  if (file.length < 6) return -1;
  let first = -1;
  for (const probe of new Set([file, encodeURI(file), decodeURIComponent(file)])) {
    for (let i = src.indexOf(probe); i >= 0; i = src.indexOf(probe, i + probe.length)) {
      if (first < 0 || i < first) first = Math.min(first < 0 ? i : first, i);
      const open = src.lastIndexOf('<', i);
      if (open >= 0 && src.indexOf('>', open) > i && /^<(img|video|source|iframe)\b/i.test(src.slice(open, open + 8))) return i;
    }
  }
  return first;
}

// A picture wrapped in a link to another page is that page's thumbnail
// ("related posts", "read next"), not this article's content.
function linkedThumb(src, url, pageUrl) {
  const i = positionOf(src, url);
  if (i < 0) return false;
  const a = src.lastIndexOf('<a ', i);
  if (a < 0 || src.lastIndexOf('</a>', i) > a) return false;
  const href = (/\bhref=["']([^"']+)["']/i.exec(src.slice(a, a + 600)) || [])[1];
  if (!href || href.startsWith('#')) return false;
  try {
    const to = new URL(href.replace(/&amp;/g, '&'), pageUrl);
    if (/\.(jpe?g|png|webp|gif|avif|mp4)$/i.test(to.pathname)) return false;   // a lightbox to itself
    return stripHash(to.href).replace(/\/$/, '') !== stripHash(pageUrl).replace(/\/$/, '');
  } catch { return false; }
}

// Pictures inside a captioned <figure> that pageMedia's name filter drops
// ("logo_example.jpg" on a page about rendering text in logos). A figure with
// a caption is content, whatever the file is called.
function figureImages(region, baseUrl) {
  const out = [];
  for (const f of String(region).matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)) {
    const cap = htmlToText((f[1].match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i) || [])[1] || '');
    if (!cap) continue;
    for (const im of f[1].matchAll(/<img\b([^>]*)>/gi)) {
      const src = (/\bsrc=["']([^"']+)["']/i.exec(im[1]) || [])[1] || (/\bdata-src=["']([^"']+)["']/i.exec(im[1]) || [])[1] || '';
      const url = src && !src.startsWith('data:') ? unwrapImageUrl(src, baseUrl) : '';
      if (!url || /\.svg(\?|$)/i.test(url) || JUNK.test(url.replace(/logo/gi, ''))) continue;
      out.push({ type: 'image', url, alt: htmlToText((/\balt=["']([^"']*)["']/i.exec(im[1]) || [])[1] || ''), caption: cap.slice(0, 160) });
    }
  }
  return out;
}

// X posts embedded in the page (blockquote widgets or links to a status).
function tweetEmbeds(region) {
  const ids = new Set();
  for (const m of String(region).matchAll(/class=["'][^"']*twitter-tweet[^"']*["'][\s\S]{0,4000}?(?:twitter|x)\.com\/\w+\/status\/(\d{6,})/gi)) ids.add(m[1]);
  for (const m of String(region).matchAll(/data-tweet-id=["']?(\d{6,})/gi)) ids.add(m[1]);
  return [...ids].map(id => ({ type: 'embed', url: `https://x.com/i/status/${id}` }));
}

// ---------------------------------------------------------------- urls

// A page's <link rel="canonical">, without its #fragment ('' when absent).
function canonical(html) {
  const m = String(html || '').match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i);
  const href = m && (/\bhref=["']([^"']+)["']/i.exec(m[0]) || [])[1];
  return href ? stripHash(href.replace(/&amp;/g, '&')) : '';
}

// The full-size file behind a resized or proxied image URL.
export function bestImageUrl(raw, baseUrl = '') {
  let url = unwrapImageUrl(raw, baseUrl);
  if (!url) return '';
  let u;
  try { u = new URL(url); } catch { return ''; }
  // Image proxies that carry the original in ?url= (images.higgs.ai, imgix-style resizers).
  const inner = u.searchParams.get('url');
  if (inner && /^https?:\/\//.test(inner) && !u.pathname.match(/\.(jpe?g|png|webp|gif|avif)$/i)) return bestImageUrl(inner);
  if (u.hostname === 'cdn.sanity.io') {
    // …/hash-3840x2160.png?w=528&h=297&fit=crop → the asset at up to MAX_LONG, keeping any crop rect.
    const dims = u.pathname.match(/-(\d+)x(\d+)\.\w+$/);
    const rect = u.searchParams.get('rect');
    const width = rect ? Number(rect.split(',')[2]) : dims ? Number(dims[1]) : 0;
    u.search = '';
    if (rect) u.searchParams.set('rect', rect);
    if (width) u.searchParams.set('w', String(Math.min(width, MAX_LONG)));
    u.searchParams.set('fit', 'max');
  }
  // Cloudinary-style transform segments (…/upload/w_32,h_32,c_fill/…) resize the original.
  u.pathname = u.pathname.replace(/\/upload\/(?:[a-z]{1,3}_[^,/]+,?)+\//, '/upload/');
  // WordPress thumbnails: name-300x200.jpg is name.jpg cut down.
  if (u.pathname.includes('/wp-content/')) u.pathname = u.pathname.replace(/-\d{2,4}x\d{2,4}(\.(?:jpe?g|png|webp))$/i, '$1');
  if (/googleusercontent\.com$/.test(u.hostname)) u.pathname = u.pathname.replace(/=[whs]\d[^/]*$/, '=s0');
  return u.toString();
}

// yt-dlp wants the watch page, not the privacy-mode embed.
function videoPageUrl(embed) {
  const yt = embed.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/watch?v=${yt[1]}`;
  return embed;
}

// A player's title, without downloading it. Null when yt-dlp can't say.
async function videoTitle(embed) {
  try {
    const { stdout } = await exec(YTDLP, ['--skip-download', '--no-warnings', '--no-playlist', '--print', '%(title)s', videoPageUrl(embed)], { timeout: 60000 });
    return stdout.trim().split('\n')[0] || null;
  } catch { return null; }
}

// ---------------------------------------------------------------- relevance

const stem = t => (t.length > 5 ? t.replace(/ing$/, '') : t).replace(/(?<=\w{3})(?<!s)s$/, '');
const stems = set => new Set([...set].map(stem));

// What the episode is about: subject, claims, labels and voiceover — minus the
// product's own names (stemmed too, so "agents" and "Figma's" go with them):
// every picture on the vendor's site says those.
function episodeWords(episode, aliases) {
  const text = [episode.subject?.name, episode.source?.newsTitle,
    ...(episode.sources || []).map(s => s.claim),
    ...(episode.beats || []).flatMap(b => [b.label, b.vo])].filter(Boolean).join(' ');
  const words = stems(tokens(text, aliases));
  for (const a of stems(tokens(aliases.join(' ')))) words.delete(a);
  return words;
}

// The episode's words a candidate's text carries. Only the file name counts
// from the URL: /docs/images/ is on every picture of a page.
function matchedWords(cand, words) {
  let file = '';
  try { file = decodeURIComponent(new URL(cand.url).pathname.split('/').pop()).replace(/\.\w+$/, '').replace(/[-_.]+/g, ' '); } catch { /* none */ }
  const own = stems(tokens([cand.caption, cand.alt, cand.section, file].filter(Boolean).join(' ')));
  return [...own].filter(t => words.has(t));
}

// Relevance points (0–16) for every candidate, each matched word weighted by
// how rare it is among them: on an image model's docs page every picture says
// "image", only one says "text" or "4K".
function scoreRelevance(cands) {
  const df = new Map();
  for (const c of cands) for (const t of c.matched) df.set(t, (df.get(t) || 0) + 1);
  const n = Math.max(2, cands.length);
  for (const c of cands) {
    const weight = c.matched.reduce((sum, t) => sum + Math.log(1 + n / df.get(t)), 0);
    c.rel = Math.round(Math.min(16, weight * 2.5) * 10) / 10;
    c.score += c.rel;
  }
}

// ---------------------------------------------------------------- downloading

function sniff(buf) {
  if (buf.length < 12) return null;
  const hex = buf.subarray(0, 12).toString('hex');
  if (hex.startsWith('89504e47')) return 'png';
  if (hex.startsWith('ffd8ff')) return 'jpg';
  if (hex.startsWith('47494638')) return 'gif';
  if (hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.subarray(4, 12).toString().match(/ftyp(avif|avis|heic|mif1)/)) return 'avif';
  if (buf.subarray(4, 8).toString() === 'ftyp') return 'mp4';
  if (buf.subarray(0, 4).toString('hex') === '1a45dfa3') return 'webm';
  return null;
}

const sha1 = buf => crypto.createHash('sha1').update(buf).digest('hex');

// 16×16 difference hash: near-identical pictures (the same image re-encoded or
// resized) land within a few bits of each other.
function dhash(img) {
  const c = createCanvas(17, 16);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 17, 16);
  g.drawImage(img, 0, 0, 17, 16);
  const d = g.getImageData(0, 0, 17, 16).data;
  const lum = i => d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
  let bits = '';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) bits += lum(y * 17 + x) > lum(y * 17 + x + 1) ? '1' : '0';
  return bits;
}
const hamming = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
const sameShape = (a, b) => Math.abs(a.width / a.height - b.width / b.height) < 0.04 * (a.width / a.height);

async function probe(file) {
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames:format=duration', '-of', 'json', file]);
  const j = JSON.parse(stdout);
  const s = j.streams?.[0] || {};
  return { width: s.width || 0, height: s.height || 0, duration: Number(j.format?.duration) || 0, frames: Number(s.nb_frames) || 0 };
}

async function firstFrame(file) {
  const out = path.join(workDir(), `${crypto.randomUUID()}.jpg`);
  for (const at of ['0.5', '0']) {
    try {
      await exec('ffmpeg', ['-v', 'error', '-y', '-ss', at, '-i', file, '-frames:v', '1', '-q:v', '3', out]);
      if (fs.existsSync(out) && fs.statSync(out).size) return loadImage(fs.readFileSync(out));
    } catch { /* try the very first frame */ }
  }
  return null;
}

// Four frames across a clip: its first frame, then ⅓, ⅔ and near the end.
async function videoMoments(file, duration) {
  const out = [];
  for (const f of [0, 1 / 3, 2 / 3, 0.94]) {
    const jpg = path.join(workDir(), `${crypto.randomUUID()}.jpg`);
    try {
      await exec('ffmpeg', ['-v', 'error', '-y', '-ss', (duration * f).toFixed(2), '-i', file, '-frames:v', '1', '-q:v', '4', '-vf', 'scale=480:-2', jpg]);
      out.push(await loadImage(fs.readFileSync(jpg)));
    } catch { out.push(null); }
  }
  return out;
}

// Any video to H.264 mp4: the first CLIP_SECONDS, short side ≤ 1080, audio kept if present.
async function normalizeVideo(input, out, { headers = [] } = {}) {
  const scale = "scale='if(gt(iw,ih),-2,min(1080,iw))':'if(gt(iw,ih),min(1080,ih),-2)'";
  await exec('ffmpeg', ['-v', 'error', '-y', ...headers, '-t', String(CLIP_SECONDS), '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?', '-vf', scale, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], { maxBuffer: 16 << 20, timeout: 240000 });
}

// Download one candidate into the temp folder. Returns { file, ext, kind,
// width, height, duration?, img, hash, dh, caption? } or a skip reason.
async function download(cand) {
  const base = path.join(workDir(), crypto.randomUUID());
  if (cand.type === 'embed') {
    const { stdout } = await exec(YTDLP, ['--no-playlist', '--quiet', '--no-warnings', '--no-progress',
      '--download-sections', `*0-${CLIP_SECONDS}`, '-f', 'bv*[height<=1080][ext=mp4]+ba/b[ext=mp4]/b',
      '--merge-output-format', 'mp4', '--referer', cand.page, '-o', `${base}.%(ext)s`,
      '--no-simulate', '--print', 'after_move:%(filepath)s\t%(title)s', videoPageUrl(cand.url)], { maxBuffer: 8 << 20, timeout: 300000 });
    const [file, title] = stdout.trim().split('\n').pop().split('\t');
    if (!file || !fs.existsSync(file)) return { skip: 'yt-dlp produced nothing' };
    const out = `${base}-n.mp4`;
    await normalizeVideo(file, out);
    return finishVideo(out, { caption: cand.caption || title });
  }
  if (cand.type === 'video') {
    const out = `${base}.mp4`;
    await polite(cand.url);
    await normalizeVideo(cand.url, out, { headers: ['-user_agent', UA, '-headers', `Referer: ${cand.page}\r\n`] });
    return finishVideo(out, cand);
  }
  // An image file, or a section capture already on disk.
  const raw = cand.type === 'capture' ? cand.file : `${base}.bin`;
  if (cand.type !== 'capture') {
    await curl(cand.url, ['-o', raw, '--max-filesize', '60000000', '-e', cand.page,
      '-H', 'accept: image/webp,image/png,image/jpeg,image/gif,image/*;q=0.5,*/*;q=0.2'], { maxBuffer: 1 << 20 });
  }
  let buf = fs.readFileSync(raw);
  let type = sniff(buf);
  if (!type) return { skip: 'not an image' };
  if (type === 'gif') {
    const info = await probe(raw).catch(() => ({ frames: 1 }));
    if (info.frames > 1) {   // an animated GIF is a clip
      const out = `${base}.mp4`;
      await normalizeVideo(raw, out);
      return finishVideo(out, cand);
    }
  }
  if (type === 'mp4' || type === 'webm') {
    const out = `${base}.mp4`;
    await normalizeVideo(raw, out);
    return finishVideo(out, cand);
  }
  let img = null;
  try { img = await loadImage(buf); } catch { /* not decodable here; convert below */ }
  if (!img) {
    const png = `${base}.png`;
    try { await exec('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-frames:v', '1', png]); buf = fs.readFileSync(png); img = await loadImage(buf); type = 'png'; }
    catch { return { skip: `can't decode ${type}` }; }
  }
  let ext = { jpg: 'jpg', png: 'png', webp: 'webp' }[type] || 'png';
  // Over MAX_LONG (and anything not png/jpg/webp) is re-encoded.
  const long = Math.max(img.width, img.height);
  if (long > MAX_LONG || !['jpg', 'png', 'webp'].includes(type)) {
    const k = Math.min(1, MAX_LONG / long);
    const c = createCanvas(Math.round(img.width * k), Math.round(img.height * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    ext = type === 'png' || type === 'gif' ? 'png' : 'jpg';
    buf = ext === 'png' ? await c.encode('png') : await c.encode('jpeg', 92);
    img = await loadImage(buf);
  }
  const file = `${base}.${ext}`;
  fs.writeFileSync(file, buf);
  return { file, ext, kind: 'image', width: img.width, height: img.height, img, hash: sha1(buf), dh: dhash(img) };
}

async function finishVideo(file, cand) {
  const info = await probe(file);
  if (!info.width || !info.duration) return { skip: 'empty video' };
  const img = await firstFrame(file);
  if (!img) return { skip: 'no frames' };
  return {
    file, ext: 'mp4', kind: 'video', width: info.width, height: info.height, duration: Math.round(info.duration * 100) / 100,
    img, hash: sha1(fs.readFileSync(file)), dh: dhash(img), caption: cand.caption,
  };
}

// Is this picture worth a beat? Size, shape, and what it's called.
function sizeVerdict(got, cand) {
  const s = Math.min(got.width, got.height), l = Math.max(got.width, got.height);
  if (got.kind === 'video') return s >= MIN_VIDEO_SHORT ? null : `video too small (${got.width}×${got.height})`;
  const ui = UI_WORDS.test(`${cand.alt} ${cand.caption} ${cand.section} ${cand.url}`) || UI_PAGES.test(cand.page);
  if (s >= MIN_SHORT) return l / s > 8.5 ? 'banner strip' : null;
  if (ui && s >= UI_SHORT && l >= UI_LONG && l / s <= 4.5) return null;
  return `too small (${got.width}×${got.height})`;
}

// ---------------------------------------------------------------- collecting

// All candidate media for an episode, scored and in the order to try them.
async function gather(episode, { max = 24 } = {}) {
  const source = episode.source || {};
  const tool = source.toolId ? toolDomains(source.toolId) : { title: '', domains: [] };
  const aliases = [episode.subject?.maker, ...(source.toolId ? [source.toolId] : []), ...(tool.title ? [tool.title] : [])].filter(Boolean);
  const pageUrls = [...new Set([source.url, ...(source.extraUrls || []), ...(episode.sources || []).map(s => s.url)]
    .filter(u => /^https?:\/\//.test(u || '')))];
  const news = launchNews(episode, pageUrls, aliases);
  for (const n of news) if (n.url && !pageUrls.some(u => u.replace(/\/$/, '') === n.url.replace(/\/$/, ''))) pageUrls.push(n.url);
  const ownDomains = [...new Set([...pageUrls.map(u => registrable(hostOf(u))), ...(tool.domains || [])])];
  const subject = tokens(episode.subject?.name || source.newsTitle || '', aliases);
  const words = episodeWords(episode, [...aliases, ...String(episode.subject?.name || '').split(/\s+/)]);
  const names = s => { const t = tokens(htmlToText(s), aliases); return subject.size > 0 && [...subject].every(w => t.has(w)); };

  log(`  ${pageUrls.length} source page${pageUrls.length === 1 ? '' : 's'}, ${news.length} catalog news item${news.length === 1 ? '' : 's'} for this launch`);
  const cands = [];
  const add = (c, base) => {
    if (!c?.url) return;
    if (c.type === 'image') c.url = bestImageUrl(c.url, c.page);
    else if (c.type === 'embed' && !/x\.com\/i\/status/.test(c.url)) c.url = embedUrl(c.url) || '';
    if (!c.url || AD_HOSTS.test(c.url)) return;
    if (c.type === 'image' && (/\.svg(\?|$)/i.test(c.url) || (JUNK.test(c.url) && !c.rescued))) return;
    c.matched = matchedWords(c, words);
    const moving = c.type === 'video' || c.type === 'embed';
    c.score = base + (moving ? 15 : 0) - cands.length * 0.001;   // + relevance, once all are in
    cands.push(c);
  };
  // A page that gave nothing: capture its drawn mock of the subject, if it has one.
  const headingNames = html => [...String(html).matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
    .some(h => { const t = htmlToText(h[1]).toLowerCase(); return [...subject].every(w => t.includes(w)); });
  const addCaptures = async (page, base) => {
    if (!subject.size || !headingNames(page.html)) return;
    for (const shot of await captureSections(page.url, [...subject])) {
      const slug = shot.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      add({ type: 'capture', url: `${stripHash(page.url)}#${slug}`, file: shot.file, page: stripHash(page.url),
        alt: '', caption: `The “${shot.heading}” section of ${hostOf(page.url).replace(/^www\./, '')}`, section: shot.heading, sourceKind: 'article' }, base);
      log(`  captured “${shot.heading}” on ${short(page.url)}`);
    }
  };
  const fromPage = (items, page, kind, base, html, extra = {}) => items.forEach(m => add({
    // "image (4).png" as alt text is an upload's file name, not a description.
    type: m.type, url: m.url, page, alt: /\.(png|jpe?g|gif|webp|avif)$/i.test(m.alt || '') ? '' : m.alt || '', caption: m.caption || '', section: html ? headingBefore(html, m.url) : '',
    poster: m.poster, sourceKind: m.type === 'embed' ? 'embed' : kind, rescued: m.rescued, ...extra,
  }, m.mentioned ? base - 30 : base));
  const ogOf = (article, page, base) => {
    if (article.image && !GENERIC_OG.test(article.image) && !JUNK.test(article.image)) {
      add({ type: 'image', url: article.image, page, alt: '', caption: article.title || '', sourceKind: 'og' }, base);
    }
  };
  // Media a rendered app shell exposes is only kept when it names the subject
  // (the page's nav and promos for other products ride along otherwise).
  const aboutSubject = m => {
    let p = '';
    try { p = new URL(m.url).pathname.replace(/[-_/.]+/g, ' '); } catch { /* none */ }
    const t = tokens(`${p} ${m.alt || ''} ${m.caption || ''}`, aliases);
    return [...subject].some(w => t.has(w));
  };
  const mediaOf = (page, region) => {
    const pageUrl = stripHash(page.url);
    const items = [...pageMedia(region, pageUrl, { max: 40 })];
    const seen = new Set(items.map(m => m.url));
    for (const f of figureImages(region, pageUrl)) if (!seen.has(f.url)) items.push({ ...f, rescued: true });
    items.push(...tweetEmbeds(region));
    // A YouTube link in the prose is a pointer to another video, not this page's player.
    for (const m of items) {
      const id = m.type === 'embed' && m.url.match(/embed\/([\w-]{6,})/)?.[1];
      if (id && !new RegExp(`<iframe\\b[^>]*${escapeRe(id)}|<lite-youtube\\b[^>]*${escapeRe(id)}|youtubeId[^\\w]{1,6}${escapeRe(id)}`, 'i').test(region)) m.mentioned = true;
    }
    if (page.rendered) {
      for (const r of page.resources) if (/\.(mp4|webm|mov)(\?|$)/i.test(r)) items.push({ type: 'video', url: r });
      return items.filter(aboutSubject);
    }
    return items.filter(m => m.type !== 'image' || !linkedThumb(region, m.url, pageUrl));
  };

  const followed = new Set(pageUrls.map(stripHash));
  const linked = [];
  const ownPages = new Set();
  for (const url of pageUrls) {
    const page = await loadPage(url);
    if (!page.html) continue;
    const pageNews = news.filter(n => n.url && n.url.replace(/\/$/, '') === url.replace(/\/$/, ''));
    const titles = [...new Set([...pageNews.map(n => n.title), ...(url === source.url ? [source.newsTitle] : [])].filter(Boolean))];
    // The entry's own page (its title is the page's title) is read whole;
    // a page listing many entries is narrowed to this one.
    const ownPage = titles.some(t => overlap(tokens(t, aliases), tokens(page.article.title, aliases)) >= 0.6);
    const section = (!ownPage && (titles.length || new URL(url).hash)) ? entrySection(page.html, url, titles) : null;
    const region = section || page.html;
    if (ownPage) ownPages.add(stripHash(url));
    const found = mediaOf(page, region);
    log(`  ${short(url)}: ${section ? 'entry' : 'page'} → ${found.length} media`);
    const before = cands.length;
    fromPage(found, url, 'article', 60, region);
    if (!section && cands.length === before) await addCaptures(page, 60);
    // A page listing many releases has a share image for the list, not this entry.
    if (!section) ogOf(page.article, url, 30);
    followed.add(canonical(page.html));

    // Linked pages: the "read more" article first, then other vendor pages it
    // points at. Links in the entry itself are the vendor's own pointers for
    // this launch; links on a whole reference page (a help article's sidebar)
    // are followed only when the linked page's title names the subject.
    const fromEntry = !!section || ownPage;
    const entry = { title: titles[0] || source.newsTitle || '', body: htmlToText(region).slice(0, 4000), url, links: extractLinks(region.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, ' '), stripHash(url)) };
    const opts = { aliases, ownDomains, sourceUrls: pageUrls.map(stripHash) };
    const picks = [];
    if (fromEntry) {
      try {
        const best = await hydrateLinkedArticle(entry, { get: getPage, ...opts, maxFetch: 3 });
        if (best?.linkPreview?.url) picks.push({ url: best.linkPreview.url, strict: true });
      } catch { /* fall through to the ranked links */ }
    }
    // rankLinks keeps the likely "read more" links; inside the entry, every
    // other link to the vendor's site counts too ("Learn how", "attach files").
    const ranked = rankLinks(entry, opts);
    const rest = fromEntry ? entry.links.filter(l => !ranked.some(r => r.url === l.url)) : [];
    for (const l of [...ranked, ...rest]) {
      if (picks.filter(p => !followed.has(stripHash(p.url))).length >= LINKS_PER_PAGE) break;
      const lp = new URL(l.url);
      if (!ownDomains.includes(registrable(lp.hostname)) || followed.has(stripHash(l.url))) continue;
      if (lp.pathname === '/' || SKIP_PATH.test(lp.pathname) || /\.(pdf|zip|dmg|exe)$/i.test(lp.pathname)) continue;
      // An index above a source page (/changelog for /changelog/x) lists everything else too.
      if (pageUrls.some(s => { const sp = new URL(s); return sp.hostname === lp.hostname && sp.pathname.startsWith(lp.pathname.replace(/\/$/, '') + '/'); })) continue;
      if (!picks.some(p => stripHash(p.url) === stripHash(l.url))) picks.push({ url: l.url });
    }
    for (const p of picks) {
      if (followed.has(stripHash(p.url))) continue;
      followed.add(stripHash(p.url));
      linked.push({ ...p, fromEntry });
    }
  }

  const titled = page => {
    const h1 = htmlToText((page.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
    return overlap(subject, tokens(`${page.article.title} ${h1}`, aliases)) >= 0.5;
  };
  for (const p of linked) {
    const page = await loadPage(p.url);
    if (!page.html) continue;
    // The same article under another slug (help centres redirect /123 to /123-title).
    const canon = canonical(page.html);
    if (canon && canon !== stripHash(p.url) && followed.has(canon)) { log(`  ${short(p.url)}: same page as a source → skipped`); continue; }
    followed.add(canon);
    const ok = p.strict || (p.fromEntry ? names(page.html) : titled(page));
    if (!ok) { log(`  ${short(p.url)}: linked, not about ${episode.subject?.name} → skipped`); continue; }
    const found = mediaOf(page, page.html);
    log(`  ${short(p.url)}: linked page → ${found.length} media`);
    const before = cands.length;
    fromPage(found, p.url, 'article', 40, page.html, { linked: true });
    if (cands.length === before) await addCaptures(page, 40);
    // Its share image speaks for the page; only worth it when the page is about
    // the subject (its title, or a heading — not a model catalog that lists it).
    if (titled(page) || (p.fromEntry && headingNames(page.html))) ogOf(page.article, p.url, 22);
  }

  for (const n of news) {
    const page = n.url || '';
    fromPage((n.media || []).map(m => ({ ...m, type: m.type === 'photo' ? 'image' : m.type })), page, 'news', 55);
    for (const img of [n.image, n.sourceImage]) if (img) add({ type: 'image', url: img, page, alt: '', caption: n.title, sourceKind: 'news' }, 28);
    if (n.tweetId) add({ type: 'embed', url: `https://x.com/i/status/${n.tweetId}`, page, caption: n.title, sourceKind: 'embed' }, 50);
    // The tested news path: one clip from the item's own page. Changelog
    // indexes are skipped — their first player belongs to another release.
    if (page && ownPages.has(stripHash(page))) {
      const clips = await resolveNewsMedia({ title: n.title, url: page }, { sourceUrl: page, get: getPage, warn: () => {} }).catch(() => []);
      fromPage(clips.filter(m => m.type !== 'image'), page, 'news', 55);
    }
  }

  // A player on a linked page (docs overview, blog sidebar) is often about
  // something else: keep it only when its title names the subject.
  for (const c of cands) {
    if (c.type !== 'embed' || !c.linked) continue;
    const title = await videoTitle(c.url);
    if (title === null) continue;
    if (overlap(subject, tokens(title, aliases)) >= 0.5) { c.caption = title; continue; }
    log(`  video "${title.slice(0, 60)}" on ${short(c.page)} isn't about ${episode.subject?.name} → skipped`);
    c.url = '';
  }

  scoreRelevance(cands.filter(c => c.url));
  // A picture on a linked page with no alt, no caption and nothing in common
  // with the claims (an author portrait, a mood shot) tells the writer nothing.
  for (const c of cands) if (c.linked && c.type === 'image' && !c.alt && !c.caption && !c.rel) c.url = '';

  // Same file twice (a page and its og, a figure and its rescue): keep the best-scored.
  const byUrl = new Map();
  for (const c of cands) if (c.url && (!byUrl.has(c.url) || byUrl.get(c.url).score < c.score)) byUrl.set(c.url, c);
  // At most perPage(max) from one page up front, best first; a page's extras
  // queue behind everyone else's, for when the other sources run dry.
  const counts = new Map();
  const ranked = [...byUrl.values()].sort((a, b) => b.score - a.score);
  for (const c of ranked) {
    const k = stripHash(c.page);
    counts.set(k, (counts.get(k) || 0) + 1);
    c.extra = counts.get(k) > perPage(max);
  }
  return [...ranked.filter(c => !c.extra), ...ranked.filter(c => c.extra)];
}

// A tool's title and the domains its own site lives on (from the catalog).
function toolDomains(toolId) {
  const p = product(toolId);
  if (!p) return { title: '', domains: [] };
  const domains = [p.url, p.displayDomain && `https://${p.displayDomain}`].filter(Boolean).map(u => registrable(hostOf(u)));
  return { title: p.title, domains };
}

// A poster image whose clip sits next to it (…/card-poster.webp → …/card.mp4)
// on the vendor's CDN: the clip is what the page plays on hover.
async function posterClip(cand) {
  const m = cand.url.match(/^(.*)-poster\.(?:webp|jpe?g|png)(\?.*)?$/i);
  if (!m) return null;
  const url = `${m[1]}.mp4`;
  try {
    const head = await curl(url, ['--head', '-e', cand.page]);
    return /content-type:\s*video\//i.test(head) ? url : null;
  } catch { return null; }
}

/**
 * Collect source media for one episode folder. Returns the manifest.
 * Keeps existing ids; new items are appended, best first, up to `max` in all.
 */
export async function collectMedia(dir, { max = 24 } = {}) {
  dir = path.resolve(dir);
  const episode = JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8'));
  const mediaDir = path.join(dir, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  log(`Collecting source media for ${episode.id || path.basename(dir)}`);

  // What we already have, with the fingerprints new candidates are compared to.
  const manifest = readManifest(dir);
  const kept = [];
  for (const it of manifest.items || []) {
    const file = path.join(dir, it.file || '');
    if (!it.file || !fs.existsSync(file)) { log(`  ! ${it.id}: file missing, will refill from ${short(it.url)}`); kept.push({ ...it, missing: true }); continue; }
    try {
      const img = it.kind === 'video' ? await firstFrame(file) : await loadImage(fs.readFileSync(file));
      kept.push({ ...it, hash: sha1(fs.readFileSync(file)), dh: img ? dhash(img) : '' });
    } catch { kept.push({ ...it, hash: '', dh: '' }); }
  }
  const nextId = () => `m${String(Math.max(0, ...kept.map(it => Number(String(it.id).slice(1)) || 0)) + 1).padStart(2, '0')}`;

  const cands = await gather(episode, { max });
  log(`  ${cands.length} candidates; downloading up to ${Math.max(0, max - kept.filter(k => !k.missing).length)} new`);
  const skipped = [];
  let videos = kept.filter(it => it.kind === 'video').length;
  for (const cand of cands) {
    const refill = kept.find(it => it.missing && it.url === cand.url);
    if (!refill && kept.some(it => it.url === cand.url)) continue;
    if (!refill && kept.filter(k => !k.missing).length >= max) break;
    if (cand.type === 'image') {
      const clip = await posterClip(cand);
      if (clip) Object.assign(cand, { type: 'video', url: clip, sourceKind: cand.sourceKind === 'og' ? 'article' : cand.sourceKind });
      if (clip && kept.some(it => it.url === clip)) continue;
    }
    if ((cand.type === 'video' || cand.type === 'embed') && videos >= MAX_VIDEOS) { skipped.push([cand.url, 'video cap reached']); continue; }
    let got;
    try { got = await download(cand); }
    catch (err) { skipped.push([cand.url, String(err.message || err).split('\n')[0].slice(0, 100)]); continue; }
    if (got.skip) { skipped.push([cand.url, got.skip]); continue; }
    const why = sizeVerdict(got, cand);
    if (why) { skipped.push([cand.url, why]); continue; }

    // Exact copy, or the same picture at another size: keep the larger one under the old id.
    const twin = kept.find(it => it.hash && it.hash === got.hash)
      || kept.find(it => it.dh && got.dh && hamming(it.dh, got.dh) <= 12 && sameShape(it, got) && (it.kind === got.kind || got.kind === 'image'));
    if (twin && !refill) {
      if (twin.kind === got.kind && got.width * got.height > twin.width * twin.height * 1.2) {
        fs.rmSync(path.join(dir, twin.file), { force: true });
        fs.rmSync(path.join(mediaDir, `${twin.id}-frames`), { recursive: true, force: true });   // mediastore's frame cache
        twin.file = `media/${twin.id}.${got.ext}`;
        fs.copyFileSync(got.file, path.join(dir, twin.file));
        Object.assign(twin, { url: cand.url, width: got.width, height: got.height, hash: got.hash, dh: got.dh });
        log(`  ↑ ${twin.id}: larger copy ${got.width}×${got.height} from ${short(cand.url)}`);
      } else skipped.push([cand.url, `same as ${twin.id}`]);
      continue;
    }

    const id = refill?.id || nextId();
    const file = `media/${id}.${got.ext}`;
    fs.rmSync(path.join(mediaDir, `${id}-frames`), { recursive: true, force: true });
    fs.copyFileSync(got.file, path.join(dir, file));
    // The page's own words for it: a figcaption or player title, else (with no
    // alt text) the heading it sits under.
    const caption = (got.caption || cand.caption || (cand.alt ? '' : cand.section) || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const item = {
      id, file, kind: got.kind, width: got.width, height: got.height,
      ...(got.kind === 'video' ? { duration: got.duration } : {}),
      url: cand.url, page: cand.page,
      ...(cand.alt ? { alt: cand.alt.slice(0, 200) } : {}),
      ...(caption && caption !== cand.alt ? { caption } : {}),
      sourceKind: cand.sourceKind || 'article',
      hash: got.hash, dh: got.dh,
    };
    if (refill) Object.assign(refill, item, { missing: false });
    else kept.push(item);
    if (got.kind === 'video') videos += 1;
    log(`  + ${id} ${got.kind} ${got.width}×${got.height}${got.duration ? ` ${got.duration}s` : ''}  ${short(cand.url)}`);
  }
  for (const [url, why] of skipped) log(`  - ${why}: ${short(url)}`);

  const items = kept.filter(it => !it.missing).map(({ hash, dh, missing, ...it }) => it)
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  const out = { ...manifest, items };
  fs.writeFileSync(path.join(dir, 'media.json'), JSON.stringify(out, null, 2) + '\n');
  if (items.length) await contactSheet(dir, items, episode);
  else fs.rmSync(path.join(mediaDir, 'contact.jpg'), { force: true });
  log(`  ${items.length} item${items.length === 1 ? '' : 's'} (${items.filter(i => i.kind === 'video').length} video) → ${path.relative(process.cwd(), path.join(dir, 'media.json'))}`);
  if (work) { fs.rmSync(work, { recursive: true, force: true }); work = null; }
  return out;
}

// ---------------------------------------------------------------- contact sheet

const CELL = { w: 440, thumb: 300, label: 70, gap: 16 };

function fitText(g, text, maxW) {
  let s = String(text || '');
  if (g.measureText(s).width <= maxW) return s;
  while (s.length > 1 && g.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// One labelled grid of every item, so a writer can Read a single image and
// choose: id, kind and size on each tile, first frame for videos.
async function contactSheet(dir, items, episode) {
  registerFonts();
  const cols = items.length <= 4 ? Math.max(2, items.length) : 4;
  const rows = Math.ceil(items.length / cols);
  const head = 76;
  const W = cols * CELL.w + (cols + 1) * CELL.gap;
  const H = head + rows * (CELL.thumb + CELL.label + CELL.gap) + CELL.gap;
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#F5F5F5';
  g.fillRect(0, 0, W, H);
  g.fillStyle = C.ink;
  g.font = font(700, 30);
  g.textBaseline = 'middle';
  const nv = items.filter(i => i.kind === 'video').length;
  g.fillText(fitText(g, `${episode.subject?.name || episode.id} · ${items.length - nv} images, ${nv} videos`, W - 2 * CELL.gap), CELL.gap + 4, head / 2 + 4);

  for (const [i, it] of items.entries()) {
    const x = CELL.gap + (i % cols) * (CELL.w + CELL.gap);
    const y = head + Math.floor(i / cols) * (CELL.thumb + CELL.label + CELL.gap);
    g.save();
    g.shadowColor = 'rgba(16,16,20,0.08)'; g.shadowBlur = 12; g.shadowOffsetY = 3;
    roundRect(g, x, y, CELL.w, CELL.thumb + CELL.label, 14);
    g.fillStyle = '#FFFFFF'; g.fill();
    g.restore();
    roundRect(g, x + 0.5, y + 0.5, CELL.w - 1, CELL.thumb + CELL.label - 1, 14);
    g.strokeStyle = C.line; g.lineWidth = 1; g.stroke();

    // Thumbnail, contain-fit on a quiet backing.
    g.save();
    roundRect(g, x + 8, y + 8, CELL.w - 16, CELL.thumb - 8, 8);
    g.clip();
    g.fillStyle = '#EDEDF2';
    g.fillRect(x + 8, y + 8, CELL.w - 16, CELL.thumb - 8);
    const contain = (im, bx, by, bw, bh) => {
      const k = Math.min(bw / im.width, bh / im.height);
      g.drawImage(im, bx + (bw - im.width * k) / 2, by + (bh - im.height * k) / 2, im.width * k, im.height * k);
    };
    const bx = x + 8, by = y + 8, bw = CELL.w - 16, bh = CELL.thumb - 8;
    if (it.kind === 'video') {
      // A clip is four moments, first frame top-left, so an edit or a reveal reads at a glance.
      const frames = await videoMoments(path.join(dir, it.file), Number(it.duration) || 4);
      const fw = (bw - 4) / 2, fh = (bh - 4) / 2;
      frames.forEach((im, k) => im && contain(im, bx + (k % 2) * (fw + 4), by + Math.floor(k / 2) * (fh + 4), fw, fh));
    } else {
      let img = null;
      try { img = await loadImage(fs.readFileSync(path.join(dir, it.file))); } catch { /* blank tile */ }
      if (img) contain(img, bx, by, bw, bh);
    }
    g.restore();
    if (it.kind === 'video') {
      // Play badge in the corner, clear of the frames.
      const cx = x + CELL.w - 34, cy = y + 34;
      g.fillStyle = 'rgba(16,16,20,0.78)';
      g.beginPath(); g.arc(cx, cy, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(cx - 5, cy - 8); g.lineTo(cx + 9, cy); g.lineTo(cx - 5, cy + 8); g.closePath(); g.fill();
    }

    // Label: id · kind · size, then where it came from.
    const ly = y + CELL.thumb + 22;
    g.font = font(700, 24);
    g.fillStyle = C.pink;
    g.fillText(it.id, x + 16, ly);
    const idW = g.measureText(it.id).width;
    g.fillStyle = C.ink;
    g.font = font(600, 20);
    const meta = `${it.kind.toUpperCase()} · ${it.width}×${it.height}${it.duration ? ` · ${Number(it.duration).toFixed(1)}s` : ''} · ${it.sourceKind}`;
    g.fillText(fitText(g, meta, CELL.w - 40 - idW), x + 26 + idW, ly);
    g.font = font(400, 18);
    g.fillStyle = C.mute;
    const from = `${hostOf(it.page).replace(/^www\./, '')}${it.caption || it.alt ? ` · ${it.caption || it.alt}` : ''}`;
    g.fillText(fitText(g, from, CELL.w - 32), x + 16, ly + 30);
  }
  fs.writeFileSync(path.join(dir, 'media', 'contact.jpg'), await c.encode('jpeg', 88));
}

// ---------------------------------------------------------------- cli

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--max');
  const maxAt = args.indexOf('--max');
  if (!dir) {
    console.error('usage: node src/media.mjs episodes/<id> [--max 24] [--dry]');
    process.exit(1);
  }
  if (args.includes('--dry')) {
    // What would be tried, best first, without downloading anything.
    const episode = JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8'));
    for (const c of await gather(episode, { max: maxAt >= 0 ? Number(args[maxAt + 1]) || 24 : 24 })) {
      log(`${c.score.toFixed(1).padStart(6)}  ${c.type.padEnd(5)} ${c.sourceKind.padEnd(7)} rel ${String(c.rel).padEnd(4)} ${short(c.url)}  [${c.matched.join(" ")}]`);
      log(`${' '.repeat(22)}from ${short(c.page)}${c.caption || c.section ? ` · ${(c.caption || c.section).slice(0, 70)}` : ''}`);
    }
    if (work) fs.rmSync(work, { recursive: true, force: true });
  } else {
    await collectMedia(dir, { max: maxAt >= 0 ? Number(args[maxAt + 1]) || 24 : 24 });
  }
}
