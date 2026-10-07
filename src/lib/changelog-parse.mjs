/**
 * Readers for the two shapes a changelog arrives in.
 *
 * No XML or HTML dependency: feeds here are machine-generated and well-formed,
 * and the JSON-LD path is real JSON. Both readers are deliberately narrow — they
 * pull title, body, date and link, and ignore everything else — because the
 * output is a news entry with exactly those fields.
 */

import { extractLinks } from './changelog-links.mjs';

const stripCdata = (s) => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ')
  // The typographic entities a prose changelog actually uses. Without these a
  // body reaches data.ts reading "we&#x2019;re gonna" — Midjourney's feed
  // encodes every apostrophe that way.
  .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
  .replace(/&rdquo;/g, '”').replace(/&ldquo;/g, '“')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
  .replace(/&hellip;/g, '…')
  // Hex numeric entities, not just decimal — &#x2019; is as common as &#8217;.
  .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&amp;/g, '&'); // last, so &amp;lt; doesn't become <

/** Markup to readable prose. Bodies arrive as HTML even inside feeds. */
export const htmlToText = (html) => decodeEntities(
  String(html || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
).replace(/\s+/g, ' ').trim();

/**
 * Feeds commonly suffix every title with the site's own name — "… | Webflow
 * Updates". On the publisher's page that disambiguates; in a feed of many
 * products it is the same eleven characters on every row.
 */
export const stripSiteSuffix = (title) => String(title || '')
  .replace(/\s*[|\u2013\u2014-]\s*[^|\u2013\u2014-]{0,40}(updates|changelog|release notes|blog|news)\s*$/i, '')
  .trim();

const tag = (xml, name) => {
  // Namespaced variants (content:encoded, dc:date) and attributes on the tag.
  const m = xml.match(new RegExp(`<(?:[a-zA-Z0-9]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${name}>`, 'i'));
  return m ? stripCdata(m[1]).trim() : '';
};

const attr = (xml, name, key) => {
  const m = xml.match(new RegExp(`<(?:[a-zA-Z0-9]+:)?${name}[^>]*\\s${key}=["']([^"']+)["']`, 'i'));
  return m ? m[1] : '';
};

const toIsoDate = (raw) => {
  if (!raw) return '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

/** Atom <entry> and RSS <item> in one pass — the field names differ, the shape doesn't. */
/**
 * The first real image in a chunk of entry HTML. htmlToText throws images away,
 * so without this a changelog-ingested entry reaches the generator with no
 * media at all and its post renders as a wall of text.
 *
 * Skips the things a changelog page decorates itself with rather than
 * illustrates an entry with: tracking pixels, avatars, icons, logos, badges.
 */
const JUNK_IMAGE = /(avatar|favicon|logo|icon|badge|emoji|spacer|pixel|track|1x1|sprite)/i;
export function firstImage(html, baseUrl = '') {
  for (const m of String(html || '').matchAll(/<img\b[^>]*>/gi)) {
    const tagText = m[0];
    const src = (/\bsrc=["']([^"']+)["']/i.exec(tagText) || [])[1]
      || (/\bdata-src=["']([^"']+)["']/i.exec(tagText) || [])[1]
      || (/\bsrcset=["']([^"'\s,]+)/i.exec(tagText) || [])[1];
    if (!src || src.startsWith('data:') || JUNK_IMAGE.test(src)) continue;
    const w = Number((/\bwidth=["']?(\d+)/i.exec(tagText) || [])[1] || 0);
    if (w && w < 200) continue;
    try { return new URL(src, baseUrl || undefined).toString(); } catch { return src; }
  }
  return '';
}

export function parseFeed(xml) {
  const blocks = [
    ...String(xml).matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
    ...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
  ].map(m => m[1]);

  return blocks.map((b) => {
    // media:content (Squarespace, WordPress) wraps a media:title, which the
    // plain `content` lookup would otherwise read as the body: drop it first.
    const text = b.replace(/<media:content\b[\s\S]*?<\/media:content>/gi, '');
    const rawBody = tag(text, 'encoded') || tag(text, 'content') || tag(text, 'description') || tag(text, 'summary');
    const title = stripSiteSuffix(htmlToText(tag(b, 'title')));
    const body = htmlToText(rawBody);
    const date = toIsoDate(tag(b, 'updated') || tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'date'));
    // Atom puts the URL on the link element's href; RSS puts it in the text.
    const url = attr(b, 'link', 'href') || tag(b, 'link') || '';
    // Feeds carry the entry's art inline, or hang it off an enclosure.
    const image = firstImage(rawBody, url)
      || attr(b, 'enclosure', 'url')
      || attr(b, 'media:content', 'url')
      || attr(b, 'media:thumbnail', 'url')
      || '';
    // `html` keeps the body's markup for readers that split one item into several.
    // `links` keeps the entry's outbound links, which htmlToText drops: the
    // "read more" page among them is where the detail and the media live.
    return { title, body, date, url, image, html: rawBody, links: extractLinks(rawBody, url) };
  }).filter(e => e.title);
}

/**
 * schema.org Article / BlogPosting / NewsArticle objects embedded in a page.
 *
 * Chosen over reading the DOM because it is what the site itself declares each
 * item to be, with a real published date — the thing heading-and-date scraping
 * gets wrong first when a layout changes.
 */
export function parseJsonLd(html) {
  const out = [];
  const ARTICLE = new Set(['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'Report']);

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const types = [].concat(node['@type'] || []);
    if (types.some(t => ARTICLE.has(t))) {
      const title = stripSiteSuffix(htmlToText(node.headline || node.name || ''));
      const body = htmlToText(node.description || node.articleBody || '');
      const date = toIsoDate(node.datePublished || node.dateCreated || node.dateModified || '');
      const url = typeof node.url === 'string' ? node.url : (node.mainEntityOfPage?.['@id'] || '');
      if (title) out.push({ title, body, date, url });
    }
    // Feeds of items live under itemListElement / hasPart / blogPost.
    for (const key of ['itemListElement', 'hasPart', 'blogPost', 'item', '@graph', 'mainEntity']) {
      if (node[key]) visit(node[key]);
    }
  };

  for (const m of String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(m[1].trim())); } catch { /* one malformed block shouldn't lose the rest */ }
  }
  return out;
}

/** Feed URLs a page advertises, for --discover. */
export function findFeedLinks(html, baseUrl) {
  const out = new Set();
  for (const m of String(html).matchAll(/<link[^>]+>/gi)) {
    const t = m[0];
    if (!/rel=["'][^"']*alternate/i.test(t)) continue;
    if (!/type=["']application\/(rss|atom)\+xml["']/i.test(t)) continue;
    const href = t.match(/href=["']([^"']+)["']/i);
    if (href) { try { out.add(new URL(href[1], baseUrl).toString()); } catch { /* skip */ } }
  }
  return [...out];
}

/**
 * Entries pulled out of a framework's embedded route payload.
 *
 * Sites that ship no feed still ship their data: Next puts it in __NEXT_DATA__
 * or in the streamed self.__next_f chunks, Remix in __remixContext. That
 * payload is the same JSON the page renders from, so reading it is closer to
 * reading an API than to scraping — it survives restyling, which selector-based
 * scraping does not.
 *
 * The walk looks for objects carrying both a title-ish and a date-ish field.
 * That shape is what a changelog entry is, whatever the site calls its keys.
 */

/**
 * Flatten a rich-text value to plain prose.
 *
 * Payload bodies are not always strings. Suno's are Sanity Portable Text — an
 * array of blocks whose words live in children[].text — and reading only
 * strings skipped them entirely, which is how eight Suno entries were written
 * with the headline duplicated into the body.
 */
const flattenRichText = (node, depth = 0) => {
  if (depth > 8 || node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(n => flattenRichText(n, depth + 1)).filter(Boolean).join(' ');
  if (typeof node !== 'object') return '';
  if (typeof node.text === 'string') return node.text;
  if (node.children) return flattenRichText(node.children, depth + 1);
  return '';
};

const TITLE_KEYS = ['title', 'headline', 'name', 'heading', 'label'];
const DATE_KEYS = ['date', 'publishedAt', 'published_at', 'publishDate', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'datePublished', 'time', 'timestamp'];
const BODY_KEYS = ['body', 'description', 'excerpt', 'summary', 'content', 'subtitle', 'text'];
const URL_KEYS = ['url', 'href', 'link', 'permalink'];
const IMAGE_KEYS = ['image', 'imageUrl', 'coverImage', 'cover', 'thumbnail', 'thumbnailUrl', 'featuredImage', 'ogImage', 'banner', 'hero'];

const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

const looksLikeDate = (s) => {
  if (!s) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return true;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= 2015 && y <= 2100;
};

/** Every JSON blob a page has embedded, however the framework smuggled it in. */
function embeddedJsonBlobs(html) {
  const blobs = [];
  const push = (raw) => { try { blobs.push(JSON.parse(raw)); } catch { /* partial chunk */ } };

  for (const m of String(html).matchAll(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi)) push(m[1]);
  for (const m of String(html).matchAll(/window\.__remixContext\s*=\s*([\s\S]*?);?\s*<\/script>/gi)) push(m[1]);
  for (const m of String(html).matchAll(/__remixContext\s*=\s*(\{[\s\S]*?\});\s*(?:__remixManifest|<\/script>)/gi)) push(m[1]);

  // Next's streamed chunks: self.__next_f.push([1,"...escaped json..."]).
  // The payload is a JS string literal, so it is unescaped before parsing, and
  // it is a *fragment* of JSON — the objects inside it are recovered by
  // scanning for balanced braces rather than by parsing the whole thing.
  const chunks = [];
  for (const m of String(html).matchAll(/self\.__next_f\.push\(\[\d+\s*,\s*"([\s\S]*?)"\]\)/g)) {
    try { chunks.push(JSON.parse(`"${m[1]}"`)); } catch { /* skip */ }
  }
  if (chunks.length) {
    const joined = chunks.join('');
    for (let i = 0; i < joined.length; i++) {
      if (joined[i] !== '{') continue;
      let depth = 0, inStr = false, esc = false, end = -1;
      for (let j = i; j < joined.length && j < i + 200000; j++) {
        const c = joined[j];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { end = j; break; } }
      }
      if (end > i) {
        const slice = joined.slice(i, end + 1);
        if (/"(title|headline|name)"\s*:/.test(slice)) push(slice);
        i = end; // don't rescan the interior
      }
    }
  }
  return blobs;
}

export function parseEmbeddedPayload(html, baseUrl) {
  const out = [];
  const seen = new Set();

  const visit = (node, depth = 0, parent = null) => {
    if (!node || typeof node !== 'object' || depth > 12) return;
    if (Array.isArray(node)) { node.forEach(n => visit(n, depth + 1, parent)); return; }

    const title = pick(node, TITLE_KEYS);
    const rawDate = pick(node, DATE_KEYS);
    if (title && title.length > 3 && title.length < 200 && looksLikeDate(rawDate)) {
      const d = new Date(rawDate);
      const date = Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
      let url = pick(node, URL_KEYS);
      // Absolute or rooted only — a bare identifier resolved against the origin
      // invents a page that does not exist.
      if (url && !/^(https?:\/\/|\/)/.test(url)) url = '';
      if (url && baseUrl) { try { url = new URL(url, baseUrl).toString(); } catch { url = ''; } }
      const key = `${title}|${date}`;
      if (date && seen.has(key)) {
        // The same post often appears twice in a payload — a bare listing
        // (title, date, slug) and the full document (tags, body). Keep the
        // first and fill what it lacks from the later one.
        const kept = out.find(e => `${e.title}|${e.date}` === key);
        if (kept) {
          const tagSource = [node, parent].find(n => n && (Array.isArray(n.tags) || Array.isArray(n.categories)));
          const rawTags = tagSource ? (tagSource.tags || tagSource.categories) : [];
          const tags = rawTags.map(t => typeof t === 'string' ? t : (t && (t.label || t.name || t.title)) || '').filter(Boolean);
          if (!kept.tags?.length && tags.length) kept.tags = tags;
          if (!kept.body) { const b = pick(node, BODY_KEYS); if (b) kept.body = htmlToText(b); }
          if (!kept.url && url) kept.url = url;
        }
      } else if (date) {
        seen.add(key);
        let body = pick(node, BODY_KEYS);
        if (!body) {
          for (const k of BODY_KEYS) {
            if (node[k] != null && typeof node[k] !== 'string') {
              body = flattenRichText(node[k]);
              if (body) break;
            }
          }
        }
        // A slug on its own is not a URL, but a source that knows its post
        // path (`linkBase`) can build one from it.
        const rawSlug = node.slug;
        const slug = typeof rawSlug === 'string' ? rawSlug : (rawSlug && typeof rawSlug.current === 'string' ? rawSlug.current : '');
        // Tags/categories, as strings or objects with a label, so a source can
        // keep only one kind of post (Harvey's blog tags releases "Product").
        // Sanity-style documents keep the post's fields under `body` and its
        // tags on the parent, so look one level up too.
        const tagSource = [node, parent].find(n => n && (Array.isArray(n.tags) || Array.isArray(n.categories)));
        const rawTags = tagSource ? (tagSource.tags || tagSource.categories) : [];
        const tags = rawTags.map(t => typeof t === 'string' ? t : (t && (t.label || t.name || t.title)) || '').filter(Boolean);
        out.push({ title: htmlToText(title), body: htmlToText(body), date, url, slug, tags });
      }
    }
    for (const v of Object.values(node)) visit(v, depth + 1, node);
  };

  for (const blob of embeddedJsonBlobs(html)) visit(blob);
  return out;
}
