/**
 * Follow the "read more" link a changelog entry carries.
 *
 * A release note is often a pointer: "For more information, see our blog
 * post: Claude Fable 5.1 and Mythos 5.1." The entry's own text is two lines,
 * and the page it points at has the detail, the screenshots and the video.
 * Until now the reader threw the link away with the rest of the markup, so the
 * generated post could only restate the two lines, and its only picture was
 * whatever og:image the changelog page itself carried.
 *
 * This module keeps the links, picks the one that is the announcement's own
 * "more information" page, fetches it, checks that it is actually about this
 * entry, and hands back what the post generator can use: the page's title and
 * description (as linkPreview) and its pictures and clips (as media).
 *
 * Nothing here writes prose. The relevance test is a token overlap between the
 * entry and the page's title, and the media list is what the page embeds
 * itself. A page that fails the test, or that turns out to be a sign-in wall,
 * a pricing page or a redirect to the homepage, is dropped and the entry stands
 * on its own text as before.
 */
import { htmlToText } from './changelog-parse.mjs';

/** Words that say "this is where the detail lives", in a link or just before it. */
const CUE = /\b(blog\s*post|blog|announcement|learn\s+more|read\s+more|more\s+(?:information|details|info)|full\s+(?:details|story|post)|see\s+(?:our|the)|read\s+(?:our|the)|find\s+out\s+more|details|docs|documentation|guide|help\s+(?:center|centre)|changelog|release\s+notes|overview|deep\s+dive)\b/i;

/** Hosts a changelog links to that are never the announcement's own page. */
const SKIP_HOST = /(^|\.)(x\.com|twitter\.com|facebook\.com|instagram\.com|linkedin\.com|threads\.net|tiktok\.com|discord\.(gg|com)|reddit\.com|apps\.apple\.com|play\.google\.com|mailchi\.mp|eepurl\.com|t\.co)$/i;
/** Paths that are chrome, not content. */
const SKIP_PATH = /\/(login|signin|sign-in|signup|sign-up|register|pricing|terms|privacy|legal|unsubscribe|cdn-cgi|account|billing|checkout|download)(\/|$|\?)/i;
const SKIP_EXT = /\.(png|jpe?g|gif|webp|svg|mp4|webm|pdf|zip|dmg|exe|css|js)(\?|$)/i;

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'you', 'our', 'are', 'now', 'new', 'more', 'can', 'has', 'have', 'into', 'its', 'via', 'all', 'any', 'out', 'get', 'see', 'use', 'how', 'why', 'what', 'when', 'about', 'introducing', 'announcing', 'launch', 'launches', 'launched', 'launching', 'available', 'availability', 'update', 'updates', 'updated', 'release', 'released', 'releases', 'feature', 'features', 'version', 'just', 'here', 'today', 'world', 'most', 'introduce', 'meet', 'welcome']);

/**
 * Meaningful tokens of a string. Version numbers stay whole ("5.1", "2.0.3"),
 * everything else is a lowercase word of three letters or more that is not a
 * stopword. `aliases` are the product's own names, dropped because every page
 * on the vendor's site mentions the product and that proves nothing.
 */
export function tokens(text, aliases = []) {
  const drop = new Set([...STOP, ...aliases.flatMap(a => String(a || '').toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean)]);
  const out = new Set();
  for (const raw of String(text || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9.]+/)) {
    const t = raw.replace(/^\.+|\.+$/g, '');
    if (!t) continue;
    if (/^\d+(\.\d+)+$/.test(t)) { out.add(t); continue; }
    if (t.length < 3 || drop.has(t)) continue;
    // "5.1" already counted; "v5" and "fable" also survive
    for (const part of t.split('.')) if (part.length >= 3 && !drop.has(part)) out.add(part);
  }
  return out;
}

/** Share of `needle`'s tokens that also appear in `hay`. 0 when needle is empty. */
export function overlap(needle, hay) {
  if (!needle.size) return 0;
  let hit = 0;
  for (const t of needle) if (hay.has(t)) hit += 1;
  return hit / needle.size;
}

const stripHash = (u) => String(u || '').replace(/#.*$/, '').replace(/\/$/, '');
const decode = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

/**
 * Every link in an entry's markup, with the text it carries and the words
 * that precede it. Reads both the HTML a feed or help-centre page carries and
 * the [text](url) form a markdown changelog uses. Relative URLs resolve
 * against `baseUrl`; a link that cannot be resolved is dropped.
 */
export function extractLinks(segment, baseUrl = '') {
  const src = String(segment || '');
  const found = [];
  const push = (index, href, text) => {
    if (!href || /^(#|javascript:|mailto:|tel:)/i.test(href)) return;
    let url;
    try { url = new URL(decode(href), baseUrl || undefined).toString(); } catch { return; }
    if (!/^https?:\/\//i.test(url)) return;
    const before = htmlToText(src.slice(Math.max(0, index - 160), index)).slice(-90);
    found.push({ url, text: htmlToText(text).trim(), context: before });
  };
  for (const m of src.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = (/\bhref=["']([^"']+)["']/i.exec(m[1]) || [])[1];
    push(m.index, href, m[2]);
  }
  for (const m of src.matchAll(/(?<!!)\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g)) {
    push(m.index, m[2], m[1]);
  }
  // Same URL twice (a bolded link inside a link, a repeated CTA) is one link.
  const seen = new Set();
  return found.filter(l => { const k = stripHash(l.url); if (seen.has(k)) return false; seen.add(k); return true; });
}

const registrable = (host) => String(host || '').toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');

/**
 * Rank an entry's links by how likely each is the announcement's own
 * "more information" page. Returns the candidates worth fetching, best first.
 * The score is nothing more than the cues a human reads: what the link says,
 * what the sentence before it says, whether it names the same thing as the
 * entry, and whether it stays on the vendor's own site.
 */
export function rankLinks(entry, { aliases = [], ownDomains = [], sourceUrls = [] } = {}) {
  const links = Array.isArray(entry.links) ? entry.links : [];
  const own = new Set(ownDomains.map(registrable).filter(Boolean));
  const sources = new Set(sourceUrls.map(stripHash).filter(Boolean));
  const titleTokens = tokens(entry.title, aliases);
  const ranked = [];
  links.forEach((l, i) => {
    let host, pathname;
    try { ({ hostname: host, pathname } = new URL(l.url)); } catch { return; }
    if (SKIP_HOST.test(host) || SKIP_PATH.test(pathname) || SKIP_EXT.test(pathname)) return;
    if (sources.has(stripHash(l.url))) return;               // the changelog itself
    if (stripHash(l.url) === stripHash(entry.url)) return;    // this entry's own anchor
    if (pathname === '/' || pathname === '') return;          // the homepage is never the detail
    let score = 0;
    const cueText = `${l.context} ${l.text}`;
    if (CUE.test(cueText)) score += 3;
    const textOverlap = overlap(tokens(l.text, aliases), titleTokens);
    if (textOverlap >= 0.5) score += 2;
    else if (textOverlap > 0) score += 1;
    if (own.has(registrable(host))) score += 1;
    if (i === links.length - 1) score += 1;                   // "see our blog post" closes the entry
    if (score >= 2) ranked.push({ ...l, score });
  });
  return ranked.sort((a, b) => b.score - a.score);
}

const JUNK_MEDIA = /(avatar|favicon|logo|icon|badge|emoji|spacer|pixel|track|1x1|sprite|headshot|profile|author|placeholder|blank\.)/i;

/** A CDN or framework wrapper around an image URL, unwrapped to the image. */
export function unwrapImageUrl(u, baseUrl = '') {
  let url = decode(u);
  const next = url.match(/\/_next\/image\?(?:[^#]*&)?url=([^&]+)/i);
  if (next) { try { url = decodeURIComponent(next[1]); } catch { /* keep */ } }
  const cf = url.match(/\/cdn-cgi\/image\/[^/]+\/(https?:\/\/.+)$/i);
  if (cf) url = cf[1];
  try { return new URL(url, baseUrl || undefined).toString(); } catch { return ''; }
}

/** Only known video players, not arbitrary iframe URLs found in page data. */
export function embedUrl(src) {
  let url;
  try { url = new URL(decode(src)); } catch { return ''; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return '';
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (['youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
    const id = host === 'youtu.be' ? url.pathname.slice(1)
      : url.pathname === '/watch' ? url.searchParams.get('v')
      : url.pathname.match(/^\/embed\/([\w-]+)\/?$/)?.[1];
    if (!/^[\w-]{6,}$/.test(id || '')) return '';
    const start = url.searchParams.get('start');
    return `https://www.youtube-nocookie.com/embed/${id}${/^\d+$/.test(start || '') ? `?start=${start}` : ''}`;
  }
  if (host === 'player.vimeo.com' || host === 'vimeo.com') {
    const match = url.pathname.match(host === 'player.vimeo.com'
      ? /^\/video\/(\d+)\/?$/
      : /^\/(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);
    const id = match?.[1];
    if (!id) return '';
    // Unlisted Vimeo videos require this hash. Strip tracking/autoplay flags,
    // but never strip the access hash (including /ID/HASH share links).
    const hash = url.searchParams.get('h') || match?.[2];
    return `https://player.vimeo.com/video/${id}${/^[a-zA-Z0-9]+$/.test(hash || '') ? `?h=${hash}` : ''}`;
  }
  return '';
}

/** Read data strings, never execute a publisher's scripts. Next.js streams
 * JSON inside quoted JS strings; decode those before looking for CMS fields. */
function serializedVideos(html) {
  const found = [];
  const seenPayloads = new Set();
  const visit = (payload, depth = 0) => {
    if (seenPayloads.has(payload)) return;
    seenPayloads.add(payload);
    for (const m of payload.matchAll(/"(?:videoEmbedUrl|embedUrl)"\s*:\s*("(?:\\.|[^"\\])*")/g)) {
      try {
        const url = embedUrl(JSON.parse(m[1]));
        if (url) found.push({ type: 'embed', url });
      } catch { /* malformed source data is not a video */ }
    }
    if (depth >= 2) return;
    for (const m of payload.matchAll(/"(?:\\.|[^"\\])*"/g)) {
      if (!/videoEmbedUrl|embedUrl/.test(m[0])) continue;
      try {
        const value = JSON.parse(m[0]);
        if (typeof value === 'string' && value !== payload) visit(value, depth + 1);
      } catch { /* not a JSON string */ }
    }
  };
  for (const m of String(html || '').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) visit(m[1]);
  return found;
}

/**
 * The pictures and clips an article page embeds, in page order, capped.
 * Reads the article body where the page marks one (<article>, <main>) so
 * that a site's nav, footer and "related posts" thumbnails stay out of it.
 */
export function pageMedia(html, baseUrl = '', { max = 6, exclude = [] } = {}) {
  const whole = String(html || '').replace(/<(script|style|noscript|svg|nav|header|footer)\b[\s\S]*?<\/\1>/gi, ' ');
  // <main> before <article>: a launch page often marks each subsection as its
  // own <article>, so the first one is a fragment and the clips sit between
  // them. <main> is the whole body; the site chrome was stripped above.
  const region = (() => {
    for (const tag of ['main', 'article']) {
      const m = whole.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (m) return m[1];
    }
    return whole;
  })();
  const out = [];
  const seen = new Set(exclude.map(u => stripHash(u)));
  // Captions: a <figure> pairs its media with a <figcaption>. Read those
  // first so each picture arrives with the words the page put under it;
  // without them a four-up gallery of radar maps is four mystery squares.
  const captions = new Map();
  for (const f of region.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)) {
    const cap = htmlToText((f[1].match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i) || [])[1] || '');
    if (!cap) continue;
    for (const im of f[1].matchAll(/<(?:img|video|source)\b[^>]*\b(?:src|data-src)=["']([^"']+)["']/gi)) {
      const u = unwrapImageUrl(im[1], baseUrl);
      if (u) captions.set(stripHash(u), cap.slice(0, 160));
    }
  }
  const add = (item) => {
    if (!item.url || seen.has(stripHash(item.url))) return;
    if (item.type === 'embed') {
      const existing = out.find(m => m.type === 'embed' && m.url.split('?')[0] === item.url.split('?')[0]);
      if (existing) {
        if (!new URL(existing.url).searchParams.has('h') && new URL(item.url).searchParams.has('h')) existing.url = item.url;
        return;
      }
    }
    seen.add(stripHash(item.url));
    const cap = captions.get(stripHash(item.url));
    out.push(cap ? { ...item, caption: cap } : item);
  };

  // og:video is the page's own pick of a clip; it goes first.
  for (const m of whole.matchAll(/<meta[^>]+property=["']og:video(?::url|:secure_url)?["'][^>]+content=["']([^"']+)["']/gi)) {
    const u = decode(m[1]);
    if (/\.(mp4|webm|m3u8)(\?|$)/i.test(u)) add({ type: 'video', url: u });
    else if (embedUrl(u)) add({ type: 'embed', url: embedUrl(u) });
  }

  // Walk media elements in the order they appear.
  const re = /<video\b([^>]*)>([\s\S]*?)<\/video>|<video\b([^>]*)\/?>|<iframe\b([^>]*)>|<img\b([^>]*)\/?>/gi;
  for (const m of region.matchAll(re)) {
    if (m[1] !== undefined || m[3] !== undefined) {
      const attrs = m[1] ?? m[3];
      const inner = m[2] || '';
      let src = (/\bsrc=["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
      if (!src) {
        const sources = [...inner.matchAll(/<source\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(s => s[1]);
        src = sources.find(s => /\.mp4(\?|$)/i.test(s)) || sources[0] || '';
      }
      if (!src || /^blob:/.test(src)) continue;
      const poster = (/\bposter=["']([^"']+)["']/i.exec(attrs) || [])[1] || '';
      let url = ''; try { url = new URL(decode(src), baseUrl || undefined).toString(); } catch { continue; }
      add({ type: 'video', url, poster: poster ? unwrapImageUrl(poster, baseUrl) : '' });
    } else if (m[4] !== undefined) {
      const src = (/\bsrc=["']([^"']+)["']/i.exec(m[4]) || [])[1] || '';
      const e = embedUrl(src);
      if (e) add({ type: 'embed', url: e });
    } else if (m[5] !== undefined) {
      const attrs = m[5];
      const src = (/\bsrc=["']([^"']+)["']/i.exec(attrs) || [])[1]
        || (/\bdata-src=["']([^"']+)["']/i.exec(attrs) || [])[1]
        || (/\bsrcset=["']([^"'\s,]+)/i.exec(attrs) || [])[1] || '';
      if (!src || src.startsWith('data:')) continue;
      const url = unwrapImageUrl(src, baseUrl);
      if (!url || JUNK_MEDIA.test(url) || /\.svg(\?|$)/i.test(url)) continue;
      const w = Number((/\bwidth=["']?(\d+)/i.exec(attrs) || [])[1] || 0);
      const h = Number((/\bheight=["']?(\d+)/i.exec(attrs) || [])[1] || 0);
      if ((w && w < 200) || (h && h < 120)) continue;
      const alt = htmlToText((/\balt=["']([^"']*)["']/i.exec(attrs) || [])[1] || '');
      if (JUNK_MEDIA.test(alt)) continue;
      add({ type: 'image', url, alt });
    }
  }
  for (const item of serializedVideos(html)) add(item);
  // Players rendered by script leave no <iframe> in the HTML, but the video
  // id is still on the page: Anthropic's site carries it as "youtubeId" in
  // its data, others as <lite-youtube videoid> or a link to the watch page.
  // A crawler sees none of those as a player, but a reader of the post
  // should still get the clip.
  const ytPatterns = [
    // Quotes are often backslash-escaped inside a framework's script payload.
    /\\?"youtubeId\\?"\s*:\s*\\?"([\w-]{6,})\\?"/gi,
    /<lite-youtube\b[^>]*\bvideoid=["']([\w-]{6,})["']/gi,
    /data-youtube-id=["']([\w-]{6,})["']/gi,
    /href=["']https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{6,})/gi,
    /href=["']https?:\/\/youtu\.be\/([\w-]{6,})/gi,
  ];
  // The raw page, not `whole`: the id usually sits in a <script> payload.
  const raw = String(html || '');
  for (const re of ytPatterns) {
    for (const m of raw.matchAll(re)) {
      add({ type: 'embed', url: `https://www.youtube-nocookie.com/embed/${m[1]}` });
    }
  }
  // A page full of screenshots must not use up the cap before its JS-rendered
  // launch video is discovered. Keep page order, but reserve room for clips.
  let imageSlots = Math.max(0, max - out.filter(m => m.type !== 'image').length);
  return out.filter(m => m.type !== 'image' || imageSlots-- > 0).slice(0, max);
}

const meta = (html, names) => {
  for (const n of names) {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']*)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n}["']`, 'i'));
    if (m && m[1].trim()) return decode(m[1]).replace(/\s+/g, ' ').trim();
  }
  return '';
};

/** What a fetched page says it is, plus what it embeds. */
export function readArticle(html, url) {
  const src = String(html || '');
  const title = meta(src, ['og:title', 'twitter:title']) || htmlToText((src.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const description = meta(src, ['og:description', 'description', 'twitter:description']);
  const ogImage = meta(src, ['og:image', 'og:image:secure_url', 'twitter:image']);
  let image = '';
  if (ogImage) { try { image = new URL(ogImage, url).toString(); } catch { image = ''; } }
  const text = htmlToText(src.replace(/<(script|style|noscript|svg|nav|header|footer)\b[\s\S]*?<\/\1>/gi, ' '));
  const media = pageMedia(src, url, { exclude: image ? [image] : [] });
  return { url, title, description, image, media, words: text ? text.split(/\s+/).length : 0 };
}

/**
 * Is this page about this entry? True when the page's title (minus the words
 * every title has) is covered by the entry, or when the link's own text names
 * the page, so a generic "learn more" still resolves. A page with no title, or
 * one that is not an article's length, is a wall or a redirect: not relevant.
 */
export function isRelevant(entry, article, link, { aliases = [] } = {}) {
  if (!article.title) return false;
  if (article.words < 60 && !article.media.length) return false;
  const pageTitle = tokens(article.title, aliases);
  const entryTokens = new Set([...tokens(entry.title, aliases), ...tokens(entry.body, aliases)]);
  if (pageTitle.size && overlap(pageTitle, entryTokens) >= 0.5) return true;
  const linkText = tokens(link?.text || '', aliases);
  if (linkText.size >= 2 && overlap(linkText, pageTitle) >= 0.6) return true;
  const desc = tokens(article.description, aliases);
  if (!pageTitle.size && desc.size && overlap(desc, entryTokens) >= 0.3) return true;
  return false;
}

/**
 * Fetch the entry's best link and, if it is about the entry, return what to
 * store: `{ linkPreview: { url, title, description, image }, media }`. Null
 * when no link qualifies. `get(url)` is the caller's fetcher, so the retry and
 * TLS behaviour of the changelog fetch applies here too.
 */
export async function hydrateLinkedArticle(entry, { get, aliases = [], ownDomains = [], sourceUrls = [], maxFetch = 2 } = {}) {
  const candidates = rankLinks(entry, { aliases, ownDomains, sourceUrls }).slice(0, maxFetch);
  for (const link of candidates) {
    let html = '';
    try { html = await get(link.url); } catch { continue; }
    if (!html) continue;
    const article = readArticle(html, link.url);
    if (!isRelevant(entry, article, link, { aliases })) continue;
    return {
      linkPreview: { url: link.url, title: article.title, description: article.description.slice(0, 300), image: article.image },
      media: article.media,
    };
  }
  return null;
}
