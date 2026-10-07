// Real media from an episode's sources (collected into <episode>/media/ with a
// manifest, media.json — see src/media.mjs) made drawable by scenes.
//
//   await prepareMedia(episode, dir, { from, to })   load what beats reference;
//                                                    video frames only for [from, to) seconds
//   mediaItem('m03') → { id, kind, img, width, height, duration, frameAt(t), caption, alt, url, page }
//
// media.json: { items: [{ id, file, kind: 'image' | 'video', width, height,
//   duration?, url, page, alt?, caption? }] }. Beats refer to items by id in
// props: media ('m01' | ['m01', 'm02']), before / after, items[].media.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { loadImage } from '@napi-rs/canvas';

export const VIDEO_FPS = 30;
const MAX_VIDEO_SECONDS = 10;
const MAX_VIDEO_WIDTH = 900;

const items = new Map();   // id → item

export function readManifest(dir) {
  const file = path.join(dir, 'media.json');
  if (!fs.existsSync(file)) return { items: [] };
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(m) ? { items: m } : m;
}

// Media ids a beat refers to.
export function beatMediaIds(beat) {
  const ids = [];
  const p = beat?.props || {};
  const add = v => (Array.isArray(v) ? v.forEach(add) : typeof v === 'string' && /^m\d+/.test(v) && ids.push(v));
  add(p.media); add(p.before); add(p.after); add(p.image?.startsWith?.('m') ? p.image : null);
  (p.items || []).forEach(it => it && typeof it === 'object' && add(it.media));
  return [...new Set(ids)];
}

// Extract (once, cached on disk) a video's frames at VIDEO_FPS.
function videoFrames(dir, entry) {
  const out = path.join(dir, 'media', `${entry.id}-frames`);
  if (!fs.existsSync(path.join(out, 'done'))) {
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dir, entry.file), '-t', String(MAX_VIDEO_SECONDS),
      '-vf', `fps=${VIDEO_FPS},scale='min(${MAX_VIDEO_WIDTH},iw)':-2`, '-q:v', '3', path.join(out, '%04d.jpg')]);
    fs.writeFileSync(path.join(out, 'done'), '');
  }
  return fs.readdirSync(out).filter(f => f.endsWith('.jpg')).sort().map(f => path.join(out, f));
}

// windows: Map(id → [fromSec, toSec]) — which part of each video to load.
export async function prepareMedia(episode, dir, { windows = null } = {}) {
  const manifest = readManifest(dir);
  const byId = new Map(manifest.items.map(it => [it.id, it]));
  const wanted = new Set((episode.beats || []).flatMap(beatMediaIds));
  for (const id of wanted) {
    const entry = byId.get(id);
    if (!entry) { console.warn(`  media ${id} is not in media.json`); continue; }
    const file = path.join(dir, entry.file);
    if (!fs.existsSync(file)) { console.warn(`  media file missing: ${entry.file}`); continue; }
    if (entry.kind === 'video') {
      const files = videoFrames(dir, entry);
      const frames = new Array(files.length).fill(null);
      const [a, b] = windows?.get(id) || [0, files.length / VIDEO_FPS];
      const i0 = Math.max(0, Math.floor(a * VIDEO_FPS) - 2), i1 = Math.min(files.length, Math.ceil(b * VIDEO_FPS) + 2);
      for (let i = i0; i < i1; i++) frames[i] = await loadImage(fs.readFileSync(files[i % files.length]));
      const poster = frames.find(Boolean) || await loadImage(fs.readFileSync(files[0]));
      items.set(id, {
        ...entry, img: poster, width: poster.width, height: poster.height, duration: files.length / VIDEO_FPS,
        // Plays from t = 0 and loops; outside the preloaded window it holds the nearest loaded frame.
        frameAt(t) {
          const n = frames.length;
          let i = ((Math.floor(t * VIDEO_FPS) % n) + n) % n;
          if (frames[i]) return frames[i];
          for (let d = 1; d < n; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; }
          return poster;
        },
      });
    } else {
      const img = await loadImage(fs.readFileSync(file));
      items.set(id, { ...entry, img, width: img.width, height: img.height, frameAt: () => img });
    }
  }
}

export const mediaItem = id => (typeof id === 'string' ? items.get(id) || null : null);

// Cover-fit an image into (x, y, w, h), optionally pushed in (zoom ≥ 1) and
// panned (px, py in −1..1). Clipping is the caller's job.
export function drawCover(ctx, img, x, y, w, h, { zoom = 1, px = 0, py = 0 } = {}) {
  if (!img) return;
  const k = Math.max(w / img.width, h / img.height) * zoom;
  const iw = img.width * k, ih = img.height * k;
  ctx.drawImage(img, x + (w - iw) / 2 - px * (iw - w) / 2, y + (h - ih) / 2 - py * (ih - h) / 2, iw, ih);
}

// Contain-fit (letterboxed) — for screenshots whose edges matter.
export function drawContain(ctx, img, x, y, w, h) {
  if (!img) return;
  const k = Math.min(w / img.width, h / img.height);
  ctx.drawImage(img, x + (w - img.width * k) / 2, y + (h - img.height * k) / 2, img.width * k, img.height * k);
}
