// Tool logo tiles, resolved the way the site's ToolIcon does it: the stored,
// approved logo first (public/images/logos), then the tool's own `logo`, then
// Google's favicon service for its domain. Images are fetched once, cached in
// .cache/logos, and must be loaded with prepareLogos() before rendering because
// frames are drawn synchronously.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { loadImage } from '@napi-rs/canvas';
import { ROOT, C, font } from './brand.mjs';
import { luminance } from './util.mjs';

const SITE = path.resolve(ROOT, '..');
const CACHE = path.join(ROOT, '.cache', 'logos');
const images = new Map();   // toolId → Image | null
let toolIndex = null;

// Read tools with the repo's own data.ts parser (scripts/lib/data-ts.mjs).
async function loadTools() {
  if (toolIndex) return toolIndex;
  const { extractAllToolsObjects, readFields } = await import(path.join(SITE, 'scripts/lib/data-ts.mjs'));
  toolIndex = new Map();
  for (const obj of extractAllToolsObjects(fs.readFileSync(path.join(SITE, 'data.ts'), 'utf8'))) {
    const f = readFields(obj);
    const id = f.str('id');
    if (!id || toolIndex.has(id)) continue;
    toolIndex.set(id, {
      id, title: f.str('title'), logo: f.str('logo'), logoBg: f.str('logoBg'),
      displayDomain: f.str('displayDomain'), themeColor: f.str('themeColor'), url: f.str('url'),
      popularity: f.num('popularity'), image: f.str('image'), screenshots: f.strArray('screenshots') || [],
    });
  }
  return toolIndex;
}
await loadTools();
const tools = () => toolIndex;
export const allTools = () => toolIndex;

export function toolInfo(toolId) {
  return tools().get(toolId) || null;
}

export function logoUrl(toolId) {
  const tool = toolInfo(toolId);
  if (!tool) return null;
  let approved = {};
  try { approved = JSON.parse(fs.readFileSync(path.join(SITE, 'services/approved-logos.json'), 'utf8')); } catch {}
  const stored = approved[toolId];
  if (stored?.fallback) return null;
  if (stored?.src?.startsWith('/images/logos/')) return stored.src;
  if (tool.logo) return tool.logo;
  const domain = tool.displayDomain || (tool.url ? new URL(tool.url).hostname : '');
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null;
}

// Load an image from a site path (/images/…), a local file, or a URL (cached).
// SVGs go through resvg first: the canvas library's own SVG loader drops
// gradient fills (Gemini's sparkle came out flat black).
async function decode(buf) {
  const head = buf.subarray(0, 512).toString('utf8').trimStart();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) {
    const { Resvg } = await import('@resvg/resvg-js');
    const png = new Resvg(buf, { fitTo: { mode: 'width', value: 512 }, background: 'rgba(0,0,0,0)' }).render().asPng();
    return loadImage(png);
  }
  return loadImage(buf);
}

export async function loadImageSrc(src) {
  if (src.startsWith('/')) {
    const file = path.join(SITE, 'public', src.split('?')[0]);
    return fs.existsSync(file) ? decode(fs.readFileSync(file)) : null;
  }
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, crypto.createHash('sha1').update(src).digest('hex'));
  if (!fs.existsSync(file)) {
    const res = await fetch(src, { signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'Mozilla/5.0 CreatorsToolboxReels' } });
    if (!res.ok) throw new Error(`${res.status} ${src}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return decode(fs.readFileSync(file));
}

// Every toolId an episode refers to: source.toolId, subject.logo, and any
// beat prop named `logo` / `logos` / items[].logo.
export function logoIdsIn(episode) {
  const ids = new Set([episode.subject?.logo, episode.source?.toolId].filter(Boolean));
  const walk = v => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    for (const [k, x] of Object.entries(v)) {
      if ((k === 'logo' || k === 'toolId') && typeof x === 'string') ids.add(x);
      else if (k === 'logos' && Array.isArray(x)) x.forEach(id => typeof id === 'string' && ids.add(id));
      else walk(x);
    }
  };
  (episode.beats || []).forEach(b => walk(b.props));
  return [...ids];
}

export async function prepareLogos(episode, extraIds = []) {
  for (const id of new Set([...logoIdsIn(episode), ...extraIds])) {
    if (images.has(id)) continue;
    const src = logoUrl(id);
    try {
      images.set(id, src ? await loadImageSrc(src) : null);
    } catch (err) {
      console.warn(`  logo for ${id} unavailable (${err.message}) — using a monogram tile`);
      images.set(id, null);
    }
  }
}

export const logoImage = toolId => images.get(toolId) || null;

// A logo tile like the site's ToolIcon: white (or vendor logoBg) rounded
// square, hairline border, soft shadow, logo inset. Falls back to a monogram on
// a tint of the tool's theme colour. Centred at (cx, cy).
export function logoTile(ctx, cx, cy, size, { toolId = null, name = '', radius = null, shadow = true, border = true } = {}) {
  const tool = toolId ? toolInfo(toolId) : null;
  const img = toolId ? logoImage(toolId) : null;
  const r = radius ?? size * 0.24;
  const x = cx - size / 2, y = cy - size / 2;
  const bg = img ? (tool?.logoBg || '#FFFFFF') : (tool?.themeColor || C.ink);
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(16,16,20,0.16)';
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.06;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, r);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, r);
  ctx.clip();
  if (img) {
    const inset = size * 0.18;
    const box = size - inset * 2;
    const k = Math.min(box / img.width, box / img.height);
    ctx.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k);
  } else {
    const label = (name || tool?.title || toolId || '?').trim();
    ctx.fillStyle = luminance(bg) < 0.4 ? C.chalk : C.ink;
    ctx.font = font('d600', size * 0.46);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label[0].toUpperCase(), cx, cy + size * 0.02);
  }
  ctx.restore();

  if (border) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 0.75, y + 0.75, size - 1.5, size - 1.5, r);
    ctx.strokeStyle = 'rgba(16,16,20,0.10)';
    ctx.lineWidth = Math.max(1.5, size / 60);
    ctx.stroke();
    ctx.restore();
  }
}
