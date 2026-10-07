// Reads products out of a Creators Toolbox checkout: data.ts (with the site's
// own parser, ./data-ts.mjs) plus the approved logo / preview registries. Used
// by src/catalog.mjs when REELKIT_SITE is set and by scripts/sync-catalog.mjs
// to write catalog/tools.json, so both see exactly the same shape.
//
// Site paths ("/images/…") come back as absolute `${siteUrl}/images/…` URLs;
// resolveImageSrc() in catalog.mjs maps them back to the checkout's files.
// Products keep data.ts order: tools that share a title ("Raycast", "AI
// Producer") resolve to whichever comes first, as on the site.
import fs from 'fs';
import path from 'path';
import { extractAllToolsObjects, extractTopLevelObjects, readFields, parseNewsItemObjects, parseCatalogFromDataTs } from './data-ts.mjs';

// Only the first few features reach the writer prompt.
const MAX_FEATURES = 8;

const readJson = (file, fallback) => {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

// One news[] literal → items as parseNewsItemObjects reads them, plus media[]
// (which the site parser drops). Untitled items are skipped there too.
function newsWithMedia(newsText, abs) {
  const out = [];
  for (const text of extractTopLevelObjects(newsText)) {
    const [item] = parseNewsItemObjects(text);
    if (!item) continue;
    const media = readFields(text).array('media');
    out.push({
      title: item.title,
      body: item.body,
      date: item.date,
      url: item.url,
      sourceUrl: item.sourceUrl,
      tweetId: item.tweetId,
      relatedTools: item.relatedTools,
      image: abs(item.image),
      sourceImage: abs(item.sourceImage),
      media: media ? extractTopLevelObjects(media.text).map(m => {
        const g = readFields(m);
        return { type: g.str('type'), url: abs(g.str('url')), poster: abs(g.str('poster')), alt: g.str('alt'), caption: g.str('caption') };
      }).filter(m => m.type && m.url) : [],
    });
  }
  return out;
}

/** Every listed product in a site checkout, in data.ts order. */
export function readSiteCatalog(siteDir, { siteUrl }) {
  const file = path.join(siteDir, 'data.ts');
  if (!fs.existsSync(file)) throw new Error(`${siteDir} has no data.ts; point it at a Creators Toolbox checkout`);
  const dataTs = fs.readFileSync(file, 'utf8');
  const abs = src => (typeof src === 'string' && src.startsWith('/') && !src.startsWith('//') ? `${siteUrl}${src}` : src);

  // Fields parseCatalogFromDataTs doesn't return.
  const extras = new Map();
  for (const obj of extractAllToolsObjects(dataTs)) {
    const f = readFields(obj);
    const id = f.str('id');
    if (!id || extras.has(id)) continue;
    const news = f.array('news');
    extras.set(id, { logoBg: f.str('logoBg'), screenshots: f.strArray('screenshots') || [], news: news ? newsWithMedia(news.text, abs) : [] });
  }

  const logos = readJson(path.join(siteDir, 'services/approved-logos.json'), {});
  const previews = readJson(path.join(siteDir, 'services/approved-previews.json'), {}).previews || {};

  return parseCatalogFromDataTs(dataTs).map(t => {
    const x = extras.get(t.id) || { screenshots: [], news: [] };
    const stored = logos[t.id];
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      toolCategory: t.toolCategory,
      route: t.route,
      popularity: t.popularity,
      price: t.price,
      url: t.url,
      displayDomain: t.domain,
      logo: abs(t.logo),
      logoBg: x.logoBg,
      // The site shows its glyph for these instead of any logo.
      logoFallback: stored?.fallback ? true : undefined,
      // Only stored files count, as on the site (ToolIcon).
      approvedLogo: !stored?.fallback && stored?.src?.startsWith('/images/logos/') ? abs(stored.src) : null,
      image: abs(t.image),
      approvedPreview: abs(previews[t.id]?.url) || null,
      screenshots: x.screenshots.map(abs),
      themeColor: t.themeColor,
      tags: t.tags,
      personas: t.personas,
      features: t.features.slice(0, MAX_FEATURES),
      news: x.news,
    };
  });
}
