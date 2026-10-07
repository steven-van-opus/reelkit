// The reel's cover: a designed poster, not a frame from the video. Instagram
// shows it full-height in the Reels tab but crops the centre 3:4 on the
// profile grid, so everything that matters lives in y 240–1680, and every
// episode uses the same layout so the grid reads as one series:
//
//   kicker tape · the real product image as a tilted photo print with its
//   logo sticker · a big torn-strip headline · Kit pointing at it · the
//   Creators Toolbox lockup
//
//   node src/thumbnail.mjs episodes/<id>   → cover.png (1080×1920) + cover-grid.png (the 3:4 crop)
//
// episode.cover { title, kicker, media } overrides the defaults (the hook's
// title/kicker and the first real image the reel shows).
import fs from 'fs';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';
import { W, H, C, SETS, registerFonts } from './brand.mjs';
import { drawSet } from './backgrounds.mjs';
import { drawMascot } from './mascot.mjs';
import { prepareBrand, drawLockup } from './brandmark.mjs';
import { prepareLogos, toolInfo } from './logos.mjs';
import { prepareMedia, mediaItem, readManifest } from './mediastore.mjs';
import { photoPrint, printSize, logoSticker } from './scenes/paper/product.mjs';
import { titleStrips } from './scenes/paper/hook-titles.mjs';
import { tape } from './paper.mjs';
import { applyHouseCta } from './cta.mjs';

registerFonts();

const GRID = { top: 240, bottom: 1680 };   // the profile grid's 3:4 crop

// The image to feature: cover.media, else the hook's, else the first image any
// beat shows (stills read better than a video's first frame).
function coverMedia(episode, dir) {
  if (episode.cover?.media) return episode.cover.media;
  const kinds = new Map(readManifest(dir).items.map(it => [it.id, it.kind]));
  const ids = episode.beats.flatMap(b => [b.props?.media, b.props?.before, b.props?.after].flat()).filter(id => typeof id === 'string' && kinds.has(id));
  const hook = [episode.beats[0]?.props?.media].flat().find(id => kinds.has(id));
  return hook || ids.find(id => kinds.get(id) === 'image') || ids[0] || null;
}

export async function renderCover(dir) {
  const episode = applyHouseCta(JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8')));
  const hook = episode.beats[0]?.props || {};
  const title = episode.cover?.title || hook.title || episode.subject?.name || '';
  const kicker = episode.cover?.kicker ?? hook.kicker ?? 'Just shipped';
  const toolId = toolInfo(hook.logo || episode.source?.toolId) ? (hook.logo || episode.source?.toolId) : null;
  const mediaId = coverMedia(episode, dir);

  await prepareBrand();
  await prepareLogos({ source: { toolId }, beats: [] });
  if (mediaId) await prepareMedia({ beats: [{ props: { media: mediaId } }] }, dir, { windows: new Map([[mediaId, [0, 0.6]]]) });
  const item = mediaId ? mediaItem(mediaId) : null;
  const img = item ? item.frameAt(0.3) : null;

  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  // A settled scene state for the paper helpers: everything has landed.
  const s = { t: 99, ts: 99, dur: 4, set: SETS.rose, setName: 'rose' };
  drawSet(ctx, 'rose');

  // The real product image, big and tilted, with its logo sticker.
  let printBottom = GRID.top + 70;
  if (img) {
    const size = printSize(img.width / img.height, 820, 560, { crop: 1.25 });
    const cy = GRID.top + 70 + size.h / 2;
    ctx.save();
    ctx.translate(540, cy);
    ctx.rotate(-0.045);
    photoPrint(ctx, img, size, { seed: 'cover-print', t: 0.3, dur: 4, lift: 2.4, tapes: 2, tapeIn: 1 });
    ctx.restore();
    if (toolId) {
      ctx.save();
      ctx.translate(540 + size.w / 2 - 40, cy - size.h / 2 + 34);
      ctx.rotate(0.14);
      logoSticker(ctx, 150, { toolId, lift: 1.8, taped: true, seed: 'cover-logo', tapeIn: 1 });
      ctx.restore();
    }
    printBottom = cy + size.h / 2;
  }

  // The headline: torn strips, left of centre so Kit has room to point at it.
  titleStrips(ctx, s, { cx: 430, top: printBottom + 26, bottom: GRID.bottom - 150, title, kicker, toolId: img ? null : toolId, maxW: 700 });

  // Kit, big and excited, pointing up at the headline.
  drawMascot(ctx, { x: 905, y: GRID.bottom - 50, s: 1.0, t: 0.4, pose: 'point', pointAngle: -2.3, face: 'wow', seed: 'cover-kit' });

  // Series mark: the official lockup on a taped paper tag, bottom left.
  ctx.save();
  ctx.translate(250, GRID.bottom - 96);
  ctx.rotate(-0.03);
  ctx.fillStyle = C.chalk;
  ctx.shadowColor = 'rgba(44,8,28,0.22)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.roundRect(-180, -42, 360, 84, 8);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  drawLockup(ctx, 0, -20, 40, { align: 'center' });
  ctx.restore();
  tape(ctx, 95, GRID.bottom - 136, 70, 26, -0.6, { seed: 'cover-tag-tape' });

  const out = path.join(dir, 'cover.png');
  fs.writeFileSync(out, cv.toBuffer('image/png'));
  // How it looks on the profile grid (centre 3:4).
  const grid = createCanvas(1080, 1440);
  grid.getContext('2d').drawImage(cv, 0, GRID.top, 1080, 1440, 0, 0, 1080, 1440);
  fs.writeFileSync(path.join(dir, 'cover-grid.png'), grid.toBuffer('image/png'));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(await renderCover(path.resolve(process.argv[2] || '.')));
}
