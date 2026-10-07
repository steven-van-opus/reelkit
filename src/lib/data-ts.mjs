// Shared reader for the catalog literal in data.ts.
//
// data.ts is a TypeScript module with React icon references in it, so it can't
// be imported from plain Node without pulling in the whole front-end. Both the
// prerenderer and the API catalog build read it as text instead, walking the
// ALL_TOOLS array literal with a quote-aware bracket matcher.

import { isReferoStylesClone } from './refero-styles-guard.mjs';

export const CATEGORY_TO_ROUTE = {
  'Layout': 'tools', 'Typography': 'tools', 'Texture': 'tools', 'Color': 'tools',
  'Image': 'tools', '3D': 'tools', 'Generator': 'tools', 'Calculator': 'tools',
  'Video': 'tools', 'Education': 'quizzes', 'Web Design': 'tools', 'Audio': 'tools',
  'Graphic Design': 'tools', 'Tool': 'tools',
  'Marketing': 'tools',
  'Game': 'games', 'Course': 'courses', 'Resource': 'resources',
  'Community': 'communities', 'Deal': 'deals', 'App': 'apps',
};

// End index (exclusive) of the comment starting at `i`, or -1 if there isn't
// one there. Comments have to be skipped rather than scanned: an apostrophe in
// prose — "the site's own palette" — reads as an opening quote to the matcher
// below, which then swallows the rest of the file as one string. That is not
// hypothetical. It happened, and the catalog silently fell from 790 entries to
// 110 with a clean exit code, so every listing after the comment lost its
// static page, its OG tags and its sitemap row.
function commentEnd(source, i) {
  if (source[i] !== '/') return -1;
  if (source[i + 1] === '/') {
    const nl = source.indexOf('\n', i + 2);
    return nl < 0 ? source.length : nl;
  }
  if (source[i + 1] === '*') {
    const close = source.indexOf('*/', i + 2);
    return close < 0 ? source.length : close + 2;
  }
  return -1;
}

// Walk source from an opening bracket/brace, ignoring quoted strings and
// comments, and return the inner text plus the index of the matching closer.
export function extractBalanced(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let inSingle = false, inDouble = false, escape = false;
  for (let i = openIndex; i < source.length; i++) {
    const c = source[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && (inSingle || inDouble)) { escape = true; continue; }
    if (!inSingle && !inDouble) {
      const skip = commentEnd(source, i);
      if (skip >= 0) { i = skip - 1; continue; }
    }
    if (c === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (c === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (inSingle || inDouble) continue;
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) return { end: i, text: source.slice(openIndex + 1, i) };
    }
  }
  return null;
}

// Top-level `{ ... }` objects inside a comma-separated array body.
export function extractTopLevelObjects(arrayBody) {
  const objects = [];
  let depth = 0;
  let objStart = -1;
  let inSingle = false, inDouble = false, escape = false;
  for (let i = 0; i < arrayBody.length; i++) {
    const c = arrayBody[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && (inSingle || inDouble)) { escape = true; continue; }
    if (!inSingle && !inDouble) {
      const skip = commentEnd(arrayBody, i);
      if (skip >= 0) { i = skip - 1; continue; }
    }
    if (c === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (c === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (inSingle || inDouble) continue;
    if (c === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) {
        objects.push(arrayBody.slice(objStart, i + 1));
        objStart = -1;
      }
    }
  }
  return objects;
}

export function extractAllToolsObjects(dataTs) {
  // ALL_TOOLS is no longer an array literal: retiring the internal tools turned
  // it into `CATALOG.filter(t => !RETIRED_INTERNAL_TOOL_IDS.has(t.id))`, so the
  // literal to parse is CATALOG and the retired ids must be filtered here too.
  // Anchoring on ALL_TOOLS in that shape found no `[` on the assignment and
  // latched onto whatever array came next in the file — the parser returned
  // zero tools and the build wrote an empty catalog without failing.
  const catalogStart = dataTs.indexOf('const CATALOG');
  const start = catalogStart >= 0 ? catalogStart : dataTs.indexOf('export const ALL_TOOLS');
  if (start < 0) return [];
  // Skip the `Tool[]` type annotation and find the actual array literal.
  const assign = dataTs.indexOf('=', start);
  const arrStart = dataTs.indexOf('[', assign);
  if (arrStart < 0) return [];
  const arr = extractBalanced(dataTs, arrStart, '[', ']');
  if (!arr) return [];
  const objects = extractTopLevelObjects(arr.text);
  if (catalogStart < 0) return objects;

  // Retired ids are gone entirely; unlisted ids keep their page but leave every
  // listing, so both are held out of the list this returns. Unlisted entries
  // come back from extractUnlistedToolsObjects for the page pass alone.
  const excluded = new Set([...idSet(dataTs, 'RETIRED_INTERNAL_TOOL_IDS'), ...idSet(dataTs, 'UNLISTED_TOOL_IDS')]);
  if (excluded.size === 0) return objects;
  return objects.filter((obj) => {
    const idm = obj.match(/\bid:\s*'((?:[^'\\]|\\.)*)'/);
    return !idm || !excluded.has(idm[1]);
  });
}

/** The ids inside `NAME = new Set<string>([...])` in data.ts. */
export function idSet(dataTs, name) {
  const out = new Set();
  const m = dataTs.match(new RegExp(`${name}\\s*=\\s*new Set<string>\\(\\[([\\s\\S]*?)\\]\\)`));
  if (m) for (const id of m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) out.add(id[1]);
  return out;
}

/** `LEGACY_TOOL_IDS` in data.ts: old id → current id. */
export function legacyToolIds(dataTs) {
  const out = {};
  const m = dataTs.match(/LEGACY_TOOL_IDS[^=]*=\s*\{([\s\S]*?)\};/);
  if (m) for (const pair of m[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) out[pair[1]] = pair[2];
  return out;
}

/**
 * The unlisted entries only: still real listings with a page of their own,
 * kept out of extractAllToolsObjects so nothing lists them.
 */
export function extractUnlistedToolsObjects(dataTs) {
  const unlisted = idSet(dataTs, 'UNLISTED_TOOL_IDS');
  const retired = idSet(dataTs, 'RETIRED_INTERNAL_TOOL_IDS');
  if (unlisted.size === 0) return [];
  const catalogStart = dataTs.indexOf('const CATALOG');
  if (catalogStart < 0) return [];
  const assign = dataTs.indexOf('=', catalogStart);
  const arrStart = dataTs.indexOf('[', assign);
  const arr = extractBalanced(dataTs, arrStart, '[', ']');
  if (!arr) return [];
  return extractTopLevelObjects(arr.text).filter((obj) => {
    const idm = obj.match(/\bid:\s*'((?:[^'\\]|\\.)*)'/);
    return idm && unlisted.has(idm[1]) && !retired.has(idm[1]);
  });
}

// --- Object field reading --------------------------------------------------
//
// Entries in data.ts are hand-written and inconsistently formatted: most put
// one field per line, a few pack a whole listing onto one line, and several
// keys repeat inside nested structures (`title` inside a linkPreview, `image`
// inside a news item). Anchoring on line breaks misses the packed entries and
// anchoring on the key alone reads the nested copy, so scan for keys at the
// object's own depth instead.

/** Map of key -> index of the first character of its value, depth 1 only. */
export function topLevelKeys(objectText) {
  const keys = new Map();
  const IDENT = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:/;
  let depth = 0;
  let inSingle = false, inDouble = false, inTemplate = false, escape = false;
  for (let i = 0; i < objectText.length; i++) {
    const c = objectText[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && (inSingle || inDouble || inTemplate)) { escape = true; continue; }
    if (!inSingle && !inDouble && !inTemplate) {
      // Same reason as extractBalanced: an entry's own comment can carry an
      // apostrophe, and paperlab's does.
      const skip = commentEnd(objectText, i);
      if (skip >= 0) { i = skip - 1; continue; }
    }
    if (c === "'" && !inDouble && !inTemplate) { inSingle = !inSingle; continue; }
    if (c === '"' && !inSingle && !inTemplate) { inDouble = !inDouble; continue; }
    if (c === '`' && !inSingle && !inDouble) { inTemplate = !inTemplate; continue; }
    if (inSingle || inDouble || inTemplate) continue;
    if (c === '{' || c === '[') { depth++; continue; }
    if (c === '}' || c === ']') { depth--; continue; }
    if (depth !== 1) continue;
    const prev = objectText[i - 1];
    if (prev !== undefined && !/[\s,{]/.test(prev)) continue;
    const m = IDENT.exec(objectText.slice(i, i + 64));
    if (!m) continue;
    // Match JavaScript object literals: a later duplicate replaces the earlier
    // value. Otherwise API/static builds can show an obsolete thumbnail while
    // the client correctly renders the replacement.
    keys.set(m[1], i + m[0].length);
    i += m[0].length - 1;
  }
  return keys;
}

const unescape = (s) => s.replace(/\\(['"`])/g, '$1').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

function readStringAt(text, start) {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) i++;
  const quote = text[i];
  if (quote !== "'" && quote !== '"' && quote !== '`') return undefined;
  let out = '';
  let escape = false;
  for (i += 1; i < text.length; i++) {
    const c = text[i];
    if (escape) { out += '\\' + c; escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === quote) return unescape(out);
    out += c;
  }
  return undefined;
}

function readNumberAt(text, start) {
  const m = /^\s*(-?[0-9][0-9_]*(?:\.[0-9]+)?)/.exec(text.slice(start, start + 40));
  return m ? Number(m[1].replace(/_/g, '')) : undefined;
}

function readBoolAt(text, start) {
  const m = /^\s*(true|false)/.exec(text.slice(start, start + 16));
  return m ? m[1] === 'true' : undefined;
}

function readBracketAt(text, start, open, close) {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) i++;
  if (text[i] !== open) return undefined;
  return extractBalanced(text, i, open, close);
}

function readStringArrayAt(text, start) {
  const arr = readBracketAt(text, start, '[', ']');
  if (!arr) return undefined;
  const items = [];
  let i = 0;
  while (i < arr.text.length) {
    const c = arr.text[i];
    if (c === "'" || c === '"' || c === '`') {
      const value = readStringAt(arr.text, i);
      if (value !== undefined) {
        items.push(value);
        // Skip past the closing quote of the string just read.
        let j = i + 1, escape = false;
        for (; j < arr.text.length; j++) {
          if (escape) { escape = false; continue; }
          if (arr.text[j] === '\\') { escape = true; continue; }
          if (arr.text[j] === c) break;
        }
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return items;
}

/** Read one object literal's scalar fields by name. */
export function readFields(objectText) {
  const keys = topLevelKeys(objectText);
  return {
    has: (key) => keys.has(key),
    str: (key) => (keys.has(key) ? readStringAt(objectText, keys.get(key)) : undefined),
    num: (key) => (keys.has(key) ? readNumberAt(objectText, keys.get(key)) : undefined),
    bool: (key) => (keys.has(key) ? readBoolAt(objectText, keys.get(key)) : undefined),
    strArray: (key) => (keys.has(key) ? readStringArrayAt(objectText, keys.get(key)) : undefined),
    array: (key) => (keys.has(key) ? readBracketAt(objectText, keys.get(key), '[', ']') : undefined),
    object: (key) => (keys.has(key) ? readBracketAt(objectText, keys.get(key), '{', '}') : undefined),
  };
}

export function parseNewsItemObjects(newsInner) {
  return extractTopLevelObjects(newsInner).map((itemText) => {
    const f = readFields(itemText);
    const title = f.str('title');
    if (!title) return null;
    const item = {
      title,
      body: f.str('body') || '',
      tweetId: f.str('tweetId'),
      date: f.str('date'),
      // The changelog fetcher writes a flat url on every entry it lands, but
      // this parser only surfaced linkPreview.url — so the generator's and
      // prerenderer's source links were always empty for fetched entries.
      url: f.str('url'),
      relatedTools: f.strArray('relatedTools') || [],
    };

    const preview = f.object('linkPreview');
    if (preview) {
      const p = readFields(`{${preview.text}}`);
      const url = p.str('url');
      if (url) {
        item.sourceUrl = url;
        item.sourceTitle = p.str('title');
        item.sourceImage = p.str('image') || undefined;
      }
    }

    // `event: { type, amount, currency, round, valuation, investors }` on an
    // item overrides whatever the classifier infers from the prose.
    const override = f.object('event');
    if (override) {
      const e = readFields(`{${override.text}}`);
      const built = {
        type: e.str('type'),
        currency: e.str('currency'),
        round: e.str('round'),
        amount: e.num('amount'),
        valuation: e.num('valuation'),
        investors: e.strArray('investors'),
      };
      for (const key of Object.keys(built)) if (built[key] === undefined) delete built[key];
      if (Object.keys(built).length) item.event = built;
    }

    const image = f.str('image');
    if (image) item.image = image;
    return item;
  }).filter(Boolean);
}

export function parseToolNewsFromDataTs(dataTs) {
  const newsByTool = {};
  for (const block of extractAllToolsObjects(dataTs)) {
    const f = readFields(block);
    const id = f.str('id');
    if (!id) continue;
    const news = f.array('news');
    if (!news) continue;
    const items = parseNewsItemObjects(news.text);
    if (items.length) newsByTool[id] = items;
  }
  return newsByTool;
}

function parseFaqs(f) {
  const faqs = f.array('faqs');
  if (!faqs) return [];
  return extractTopLevelObjects(faqs.text).map((objectText) => {
    const q = readFields(objectText);
    const question = q.str('question');
    const answer = q.str('answer');
    return question && answer ? { question, answer } : null;
  }).filter(Boolean);
}

/**
 * Read every listing out of data.ts with the fields the API serves.
 * Returns plain objects — no React, no icons.
 */
export function parseCatalogFromDataTs(dataTs) {
  const out = [];
  for (const block of extractAllToolsObjects(dataTs)) {
    const f = readFields(block);
    const id = f.str('id');
    const title = f.str('title');
    if (!id || !title) continue;
    const url = f.str('url');
    const domain = f.str('displayDomain');
    // One Refero Styles listing only — clones for styles.refero.design
    // must not re-enter the generated catalog / API / llms / sitemaps.
    if (isReferoStylesClone({ id, title, url, domain, displayDomain: domain })) continue;
    const category = f.str('category');
    const news = f.array('news');
    out.push({
      id,
      title,
      description: f.str('description'),
      longDescription: f.str('longDescription'),
      category,
      subcategory: f.str('toolCategory') || f.str('resourceCategory') || f.str('appCategory') || f.str('gameCategory')
        || f.str('courseCategory') || f.str('communityCategory') || f.str('dealCategory'),
      toolCategory: f.str('toolCategory'),
      route: CATEGORY_TO_ROUTE[category] || 'tools',
      status: f.str('status'),
      price: f.str('price'),
      popularity: f.num('popularity'),
      isExternal: f.bool('isExternal') ?? false,
      url,
      domain,
      country: f.str('country'),
      logo: f.str('logo'),
      image: f.str('image'),
      themeColor: f.str('themeColor'),
      launchedAt: f.str('launchedAt'),
      tags: f.strArray('tags') || [],
      personas: f.strArray('personas') || [],
      features: f.strArray('features') || [],
      faqs: parseFaqs(f),
      news: news ? parseNewsItemObjects(news.text) : [],
    });
  }
  return out;
}
