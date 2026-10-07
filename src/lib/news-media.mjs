/** Shared media import for generated and hand-authored updates. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { embedUrl, pageMedia } from './changelog-links.mjs';

const exec = promisify(execFile);
const sourceCache = new Map();
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const httpUrl = (s) => {
  try {
    const u = new URL(s);
    return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.href : '';
  } catch { return ''; }
};
export const isVideo = (m) => m?.type === 'video' || m?.type === 'embed';

function cleanMedia(items = []) {
  const seen = new Set();
  return items.flatMap(m => {
    if (!m || !['image', 'photo', 'video', 'gif', 'embed'].includes(m.type)) return [];
    const url = m.type === 'embed' ? embedUrl(m.url) : httpUrl(m.url);
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ ...m, url, ...(m.poster ? { poster: httpUrl(m.poster) } : {}) }];
  });
}

export async function fetchMediaSource(url) {
  if (!httpUrl(url)) return '';
  if (!sourceCache.has(url)) sourceCache.set(url, (async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) return await res.text();
    } catch { /* curl uses the local certificate store when Node cannot */ }
    const { stdout } = await exec('curl', ['--fail', '--silent', '--show-error', '--location',
      '--proto', '=http,https', '--proto-redir', '=http,https', '--max-time', '20', url],
    { maxBuffer: 8 * 1024 * 1024 });
    return stdout;
  })());
  return sourceCache.get(url);
}

/** Explicit media wins. A thumbnail alone does not suppress video discovery.
 * Import one primary source clip by default, not every demo in a long article.
 * Additional editorially selected clips can still be supplied in news.media. */
export async function resolveNewsMedia(news = {}, { sourceUrl, get = fetchMediaSource, warn = console.warn } = {}) {
  const explicit = cleanMedia(Array.isArray(news.media) ? news.media : []);
  if (explicit.some(isVideo)) return explicit;
  const source = httpUrl(sourceUrl || news.linkPreview?.url || news.url);
  if (!source || /(^|\.)(x\.com|twitter\.com)$/.test(new URL(source).hostname)) return explicit;
  try {
    const html = await get(source);
    if (!html) throw new Error('empty response');
    const clip = cleanMedia(pageMedia(html, source, { max: 1 })).find(isVideo);
    return clip ? [clip, ...explicit] : explicit;
  } catch (err) {
    warn(`Source video could not be checked for "${news.title || source}": ${err.message}. Review media before publishing.`);
    return explicit;
  }
}

/** Same markup for the automatic writer and the local upsert path. */
export function mediaBlock(rawItems) {
  const items = cleanMedia(rawItems);
  if (!items.length) return '';
  const one = items.length === 1;
  const box = one ? 'width:100%;border-radius:12px;display:block'
    : 'width:100%;height:100%;border-radius:12px;display:block;object-fit:cover';
  const el = (m) => (m.type === 'photo' || m.type === 'image')
    ? `<img src="${esc(m.url)}" alt="${esc(m.alt || m.caption || '')}" loading="lazy" style="${box}" />`
    : m.type === 'embed'
      ? `<iframe src="${esc(m.url)}" title="${esc(m.caption || m.alt || 'Announcement video')}" loading="lazy" allow="accelerometer; autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen style="${box};aspect-ratio:16/9;border:0"></iframe>`
      : `<video src="${esc(m.url)}"${m.poster ? ` poster="${esc(m.poster)}"` : ''} style="${box}" controls playsinline preload="metadata"${m.type === 'gif' ? ' autoplay loop muted' : ''}></video>`;
  const cap = (m) => m.caption ? `<figcaption style="font-size:12px;line-height:1.4;margin-top:6px">${esc(m.caption)}</figcaption>` : '';
  const overlay = (m) => m.caption ? `<div class="ct-carousel-caption" style="position:absolute;left:0;right:0;bottom:0;padding:18px 12px 8px;font-size:12px;line-height:1.35;color:#ffffff;background:linear-gradient(transparent,rgba(0,0,0,0.7));pointer-events:none">${esc(m.caption)}</div>` : '';
  if (one) return items[0].caption ? `<figure style="margin:0">${el(items[0])}${cap(items[0])}</figure>` : el(items[0]);
  return `<div class="ct-carousel">${items.map(m => `<div class="ct-carousel-item" style="position:relative">${el(m)}${overlay(m)}</div>`).join('')}</div>`;
}

const slugify = (s) => String(s || '').toLowerCase().trim().replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

/** Match the specific update, never blindly use a tool's newest announcement. */
export function matchPostNews(tool, post) {
  const items = (tool.news || []).filter(n => n?.title);
  const candidates = items.filter(n => post.newsTitle ? n.title === post.newsTitle
    : post.id === `newsgen-${tool.id}-${slugify(n.title)}`
      || post.slug === `${slugify(tool.title)}-${slugify(n.title)}`.slice(0, 80)
      || (post.sourceUrl && post.sourceUrl === (n.linkPreview?.url || n.url)));
  return candidates.length === 1 ? candidates[0] : null;
}

/** A rewrite must not silently remove a working embed. New posts discover a
 * video from their matched announcement (or an explicitly supplied source). */
export async function enrichPostMedia(post, { news, previous, get, warn } = {}) {
  if (/<(?:iframe|video)\b/i.test(post.content)) return post.content;
  // A reviewed announcement may link to unrelated videos in its footer. An
  // explicit editorial decision to omit them also replaces a prior bad import.
  if (post.noRelevantSourceVideo) return post.content;
  // Native X widgets own playback of their announcement. A previously saved
  // CDN URL can reject browser requests even when server-side checks succeed.
  // Keep other working videos, but do not restore X's raw clips or rediscover
  // source media when the article already chose the native player.
  const hasTweet = /<div\b[^>]*\sdata-tweet-id\s*=\s*(?:(["'])[1-9]\d*\1|[1-9]\d*)(?=\s|\/?>)/i.test(post.content);
  const keepVideo = m => isVideo(m) && (!hasTweet || !/(^|\.)video\.twimg\.com$/i.test(new URL(m.url).hostname));
  const existing = cleanMedia(pageMedia(previous?.content || '', '', { max: 6 })).filter(keepVideo);
  const curated = cleanMedia(Array.isArray(post.media) ? post.media : []).filter(keepVideo);
  const candidates = curated.length ? curated : existing.length ? existing
    : hasTweet ? [] : await resolveNewsMedia({ ...news, ...(post.media ? { media: post.media } : {}) }, {
      sourceUrl: post.sourceUrl, get, warn,
    });
  const block = mediaBlock(candidates.filter(isVideo));
  if (!block) return post.content;
  const media = `<div style="margin:20px 0">${block}</div>`;
  // Put the player after the introduction, while keeping a single article.
  if (/<\/p>/i.test(post.content)) return post.content.replace(/<\/p>/i, m => m + media);
  if (/<\/article>/i.test(post.content)) return post.content.replace(/<\/article>/i, media + '$&');
  return post.content + media;
}
