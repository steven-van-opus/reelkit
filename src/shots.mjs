// Product screenshots in one house frame. Sources, best first:
//   1. an explicit image on the beat (props.image: "/images/…" or https://…)
//   2. the source news item's own preview image (news[].image / linkPreview.image)
//   3. the site's approved capture of the tool (services/approved-previews.json)
//   4. the tool's thumbnail / first screenshot in data.ts
// Images are loaded by prepareShots() before rendering (frames draw synchronously).
import fs from 'fs';
import path from 'path';
import { ROOT, C, font } from './brand.mjs';
import { allTools, loadImageSrc } from './logos.mjs';
import { lucideIcon } from './icons.mjs';
import { clamp, ease } from './util.mjs';

const SITE = path.resolve(ROOT, '..');
const images = new Map(); // src → Image | null

let newsImages = null;
function newsImageFor(url) {
  if (!url) return null;
  if (!newsImages) {
    newsImages = new Map();
    const src = fs.readFileSync(path.join(SITE, 'data.ts'), 'utf8');
    // News items are one object per line: pull url + image/linkPreview.image.
    for (const line of src.split('\n')) {
      if (!line.includes(' date: ') || !line.includes(" url: '")) continue;
      const u = (line.match(/\burl: '([^']+)'/) || [])[1];
      const img = (line.match(/\bimage: '([^']+)'/) || [])[1] || (line.match(/linkPreview: \{[^}]*?image: '([^']+)'/) || [])[1];
      if (u && img && !newsImages.has(u)) newsImages.set(u, img);
    }
  }
  return newsImages.get(url) || null;
}

let approved = null;
function approvedPreview(toolId) {
  if (!approved) {
    try { approved = JSON.parse(fs.readFileSync(path.join(SITE, 'services/approved-previews.json'), 'utf8')).previews || {}; } catch { approved = {}; }
  }
  return approved[toolId]?.url || null;
}

export function screenshotSrc({ image = null, toolId = null, newsUrl = null } = {}) {
  if (image) return image;
  const tool = toolId ? allTools().get(toolId) : null;
  return newsImageFor(newsUrl) || (toolId && approvedPreview(toolId)) || tool?.image || tool?.screenshots?.[0] || null;
}

// Which screenshot a beat wants, if any: scenes that show one read props.image
// / props.toolId (defaulting to the episode's tool and source news).
export function beatShotSrc(beat, episode) {
  const p = beat.props || {};
  if (!p.image && !p.toolId && !['screenshot', 'product'].includes(beat.scene)) return null;
  const toolId = p.toolId || episode.source?.toolId;
  return screenshotSrc({ image: p.image, toolId, newsUrl: p.toolId ? null : episode.source?.url });
}

export async function prepareShots(episode) {
  for (const beat of episode.beats || []) {
    const src = beatShotSrc(beat, episode);
    if (!src || images.has(src)) continue;
    try {
      images.set(src, await loadImageSrc(src));
    } catch (err) {
      console.warn(`  screenshot unavailable (${err.message})`);
      images.set(src, null);
    }
  }
}

export const shotImage = src => (src ? images.get(src) || null : null);

const domainOf = (s = '') => { try { return new URL(s).hostname.replace(/^www\./, ''); } catch { return s; } };

// Browser-style frame in the site's card language: white surface, 18px radius,
// hairline border, soft shadow, a quiet top bar with a URL pill. The image is
// cover-fitted with a slow push so stills feel alive.
export function screenshotFrame(ctx, x, y, w, h, { img = null, url = '', t = 0, pan = true, radius = 18, glow = true, fallbackLabel = '' } = {}) {
  const bar = 58;
  if (glow) {
    const g = ctx.createRadialGradient(x + w / 2, y + h * 0.6, 10, x + w / 2, y + h * 0.6, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(255,43,136,0.20)');
    g.addColorStop(1, 'rgba(255,43,136,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w * 0.4, y - h * 0.3, w * 1.8, h * 1.6);
  }
  ctx.save();
  ctx.shadowColor = 'rgba(16,16,20,0.20)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 22;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  // Top bar.
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(x, y, w, bar);
  ctx.fillStyle = C.line;
  ctx.fillRect(x, y + bar - 1.5, w, 1.5);
  ['#DEDEE6', '#DEDEE6', '#DEDEE6'].forEach((col, i) => {
    ctx.beginPath();
    ctx.arc(x + 30 + i * 22, y + bar / 2, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  });
  const domain = domainOf(url);
  if (domain) {
    ctx.font = font(500, 22);
    const tw = ctx.measureText(domain).width;
    const pw = Math.min(w - 200, tw + 64), px = x + (w - pw) / 2, py = y + 12;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, bar - 24, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    lucideIcon(ctx, 'Lock', px + 22, y + bar / 2, 16, { color: C.mute, stroke: 2.2 });
    ctx.fillStyle = C.mute;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(domain, px + 38, y + bar / 2 + 1);
  }
  // Content.
  const cy = y + bar, ch = h - bar;
  if (img) {
    const zoom = pan ? 1.04 + 0.05 * ease.inOutQuad(clamp(t / 6)) : 1;
    const k = Math.max(w / img.width, ch / img.height) * zoom;
    const iw = img.width * k, ih = img.height * k;
    const drift = pan ? (iw - w) * 0.5 * ease.inOutQuad(clamp(t / 6)) : (iw - w) / 2;
    ctx.drawImage(img, x - drift, cy, iw, ih);
  } else {
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(x, cy, w, ch);
    ctx.fillStyle = C.mute;
    ctx.font = font('d600', 44);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fallbackLabel, x + w / 2, cy + ch / 2);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, radius);
  ctx.strokeStyle = 'rgba(16,16,20,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
