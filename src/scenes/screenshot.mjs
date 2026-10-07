// A real product screenshot in the house browser frame: a source media item
// (props.media — an image, or a screen recording that plays), else the
// source news item's preview image, the site's approved capture, or the
// tool's thumbnail. The tool's logo tile overlaps the frame's corner like an
// app badge, and Kit points at it from below.
//
// In the paper look (the default) it's a paper app window taped to the wall
// with the screenshot pasted in and the logo stuck on as a sticker — see
// drawPaper().
import { W, C, BAND, isStudio } from '../brand.mjs';
import { beatShotSrc, shotImage, screenshotFrame } from '../shots.mjs';
import { logoTile, toolInfo } from '../logos.mjs';
import { pill } from '../fx.mjs';
import { clamp, ease, rng, boil, onTwos } from '../util.mjs';
import { paperWindow, printTape, logoSticker, tornLabel, browserContent, WINDOW_BAR, WINDOW_INSET } from './media.mjs';

const isMediaId = v => typeof v === 'string' && /^m\d+/.test(v);

export default {
  type: 'screenshot',
  describe: 'Shows the real product: a source media item (screenshot or screen recording), else the news preview image or site capture, in a browser window (a paper app window taped to the wall in the paper look) with the tool logo badge. Use when seeing the actual UI/page sells the point.',
  props: {
    media: 'optional media id of a real screenshot or screen recording from the sources (preferred)',
    toolId: 'optional data.ts tool id for the logo badge and fallback screenshot (defaults to the episode tool and its news image)',
    image: 'optional explicit image path/URL ("/images/…" or https://…)',
    caption: 'optional string ≤ 32 chars, under the frame (a pill, or a torn paper label in the paper look)',
    url: 'optional domain shown in the address bar (defaults to the media page or the tool domain)',
  },
  draw(s) {
    if (!isStudio()) return drawPaper(s);
    const { ctx, t, props, episode, beat } = s;
    // A media id may come in as `media` or (older scripts) as `image`.
    const mediaId = [props.media, props.image].flat().find(isMediaId) || null;
    const item = s.media(mediaId);
    const img = item ? s.mediaFrame(mediaId) : shotImage(beatShotSrc(beat, episode));
    const toolId = props.toolId || episode.source?.toolId;
    const tool = toolInfo(toolId);
    const url = props.url || item?.page || item?.url || tool?.displayDomain || tool?.url || episode.source?.url || '';

    // Frame: shaped to the image (16:10-ish by default) and kept above Kit.
    const fw = 900, fh = img ? Math.min(720, Math.max(480, fw / (img.width / img.height) + 58)) : 600;
    const fx = (W - fw) / 2, fy = 400;
    const e = s.spring(0.05, { freq: 1.5, damp: 0.6 });
    ctx.save();
    ctx.translate(W / 2, fy + fh / 2 + (1 - e) * 200);
    ctx.scale(0.94 + 0.06 * e, 0.94 + 0.06 * e);
    ctx.globalAlpha *= clamp(e * 1.6);
    ctx.translate(-W / 2, -(fy + fh / 2));
    // Brand glow behind the frame (drawn here: screenshotFrame's own glow is
    // clipped to a rectangle that cuts its gradient).
    const gr = 680, gy = fy + fh * 0.6;
    const glow = ctx.createRadialGradient(W / 2, gy, 10, W / 2, gy, gr);
    glow.addColorStop(0, 'rgba(255,43,136,0.20)');
    glow.addColorStop(1, 'rgba(255,43,136,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(W / 2 - gr, gy - gr, gr * 2, gr * 2);
    // Video plays as-is (no pan); stills get the slow push.
    screenshotFrame(ctx, fx, fy, fw, fh, { img, url, t, glow: false, pan: item?.kind !== 'video', fallbackLabel: tool?.title || '' });
    // Logo badge overlapping the top-left corner.
    if (tool) {
      const b = s.enter(0.35, 0.4);
      if (b > 0) {
        ctx.save();
        ctx.translate(fx + 46, fy - 6);
        ctx.scale(b, b);
        logoTile(ctx, 0, 0, 120, { toolId });
        ctx.restore();
      }
    }
    ctx.restore();

    const caption = String(props.caption || '').trim();
    if (caption) {
      const c = s.enter(0.6, 0.35);
      if (c > 0) {
        ctx.save();
        ctx.translate(W / 2 + 110, fy + fh + 30);
        ctx.scale(c, c);
        pill(ctx, 0, 0, caption, { fill: s.set.ink === C.chalk ? '#FFFFFF' : C.ink, size: 36, weight: 600, lift: 1.4 });
        ctx.restore();
      }
    }

    s.kit({ x: 190, y: BAND.floorY + 50, s: 0.8, pose: 'point', pointAngle: -1.0, face: t > 0.6 ? 'happy' : 'smile' });
  },
};

// ---------------------------------------------------------------- paper

// Paper screenshot: a paper app window (title bar, the domain as its title)
// with the screenshot pasted in, slapped onto the wall on twos and taped
// down; the tool's logo is stuck on its top-right corner as a chalk sticker,
// the caption follows on a torn label and Kit points at it from below. Tall
// pages scroll, stills push in slowly, recordings play.
function drawPaper(s) {
  const { ctx, t, props, episode, beat } = s;
  const mediaId = [props.media, props.image].flat().find(isMediaId) || null;
  const item = s.media(mediaId);
  const img = item ? s.mediaFrame(mediaId) : shotImage(beatShotSrc(beat, episode));
  const toolId = props.toolId || episode.source?.toolId;
  const tool = toolInfo(toolId);
  const url = props.url || item?.page || item?.url || tool?.displayDomain || tool?.url || episode.source?.url || '';
  const video = item?.kind === 'video';
  const seed = `shot-${s.index}-${mediaId || toolId || 'none'}`;
  const r = rng(seed);

  // Window shaped to the screenshot (taller pages scroll), kept above Kit.
  const fw = 860, pad = WINDOW_INSET * 2, cw = fw - pad;
  const fh = img ? Math.round(clamp(cw / Math.max(1.2, img.width / img.height) + WINDOW_BAR + pad, 480, 680)) : 600;
  const fx = (W - fw) / 2, fy = 424;
  const ch = fh - WINDOW_BAR - pad;
  const lean = (r() < 0.5 ? -1 : 1) * (0.018 + r() * 0.014);

  const e = s.spring(0.08, { freq: 1.5, damp: 0.5 });
  const bo = boil(seed, t, 1);
  const cx = W / 2, cy = fy + fh / 2;
  ctx.save();
  ctx.translate(cx + bo.dx, cy + bo.dy - (1 - e) * 90);
  ctx.rotate(lean * (1 + (1 - e) * 2.4) + bo.rot);
  ctx.scale(1 + (1 - e) * 0.2, 1 + (1 - e) * 0.2);
  ctx.globalAlpha *= clamp(e * 3);
  ctx.translate(-cx, -cy);
  const push = video ? 0 : ease.inOutQuad(clamp((onTwos(t) - 0.6) / Math.max(1.6, s.dur - 0.8)));
  const scroll = ease.inOutCubic(clamp((onTwos(t) - 0.9) / Math.max(1.6, s.dur - 1.5)));
  const content = img ? browserContent(img, cw, ch, { zoom: 1 + 0.05 * push, focus: null, toward: 0, scroll }) : null;
  paperWindow(ctx, fx, fy, fw, fh, { content, url, label: tool?.title || beat.label || '', video });
  printTape(ctx, fx, fy, fw, fh, { seed, k: s.enter(0.45, 0.3), style: tool ? 'left' : 'corners' });
  if (tool) logoSticker(ctx, fx + fw - 58, fy - 6, 148, { toolId, rot: 0.1 - lean, k: s.enter(0.35, 0.4), seed });
  ctx.restore();

  const caption = String(props.caption || '').trim();
  if (caption) {
    tornLabel(ctx, W / 2 + 110, fy + fh + 66, caption, {
      k: s.enter(0.6, 0.35), set: s.set, seed, size: 42, maxW: 700, minX: 300, maxX: 1004, rot: -0.03,
    });
  }

  s.kit({ x: 190, y: BAND.floorY + 50, s: 0.8, pose: 'point', pointAngle: -1.0, face: t > 0.6 ? 'happy' : 'smile' });
}
