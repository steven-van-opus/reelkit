// Opening beat: the news as a site card. A white card rises into place with
// the product's logo tile, a pink kicker pill ("Just shipped"), the product
// name in Inter Display and a muted by-line; the brand glow and orbit rings
// bloom behind it and Kit pops up from behind the floor to cheer. With a
// source image or video (props.media) the card becomes the site's post card:
// the real media on top, the kicker as a badge on it, logo + title below.
import { W, C, BAND, font } from '../../brand.mjs';
import { paper, roundRectPath, fitSize, fitWrapped, wrapLines, text, measure, trackingFor } from '../../paper.mjs';
import { burst, confetti } from '../../fx.mjs';
import { lucideIcon } from '../../icons.mjs';
import { logoTile, toolInfo } from '../../logos.mjs';
import { brandGradient } from '../../brandmark.mjs';
import { drawCover } from '../../mediastore.mjs';
import { clamp, lerp, ease, prog } from '../../util.mjs';

// Title card without media: everything centred in one column.
const STACK = { w: 860, r: 28, tile: 150, cy: 770, minTop: 420, maxBottom: 1090 };
// Post card with media: image on top, logo + text in a row underneath.
const POST = { x: 90, w: 900, top: 352, maxBottom: 1104, r: 28, inset: 14, imgR: 18, tile: 128, pad: 36, minImg: 380, maxImg: 560 };

// ---------------------------------------------------------------- pieces

// Shorten to fit maxW at weight/size, ending in an ellipsis.
function clip(ctx, str, weight, size, maxW, tracking = 0) {
  if (measure(ctx, str, weight, size, tracking) <= maxW) return str;
  let s = str;
  while (s.length > 1 && measure(ctx, `${s}…`, weight, size, tracking) > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

// A product name: one line when it fits at a hero size (≥ oneMin), else two
// lines split evenly ("Higgsfield / for Figma", not "Higgsfield for / Figma").
function fitTitle(ctx, str, maxW, maxSize, oneMin, minSize) {
  const one = fitSize(ctx, str, 'd600', maxW, maxSize, oneMin);
  if (measure(ctx, str, 'd600', one) <= maxW) return { size: one, lines: [str] };
  const fit = fitWrapped(ctx, str, 'd600', maxW, 2, maxSize, minSize);
  if (fit.lines.length < 2 || fit.lines[1].endsWith('…')) return fit;
  ctx.save();
  ctx.font = font('d600', fit.size);
  ctx.letterSpacing = `${trackingFor(fit.size)}px`;
  let best = fit.lines;
  for (let w = maxW - 20; w > maxW * 0.4; w -= 20) {
    const lines = wrapLines(ctx, str, w);
    if (lines.length > 2) break;
    best = lines;
  }
  ctx.restore();
  return { size: fit.size, lines: best };
}

// The kicker: a brand-gradient pill with a sparkle, the scene's one pink
// accent. A soft highlight sweeps across it every few seconds.
const KICK = { size: 34, h: 70, padX: 30, ic: 32, gap: 12, track: 1.6, maxW: 640 };

function kickerLabel(ctx, str) {
  const { size, padX, ic, gap, track, maxW } = KICK;
  const label = clip(ctx, str, 600, size, maxW - padX * 2 - ic - gap, track);
  return { label, w: padX * 2 + ic + gap + measure(ctx, label, 600, size, track) };
}

// Centred on the origin.
function kickerPill(ctx, str, t) {
  const { size, h, padX, ic, gap, track } = KICK;
  const { label, w } = kickerLabel(ctx, str);
  const x = -w / 2, y = -h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(255,43,136,0.34)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = brandGradient(ctx, x, y, x + w, y + h);
  ctx.fill();
  ctx.restore();
  // Shine: a diagonal band crossing the pill once every 2.8s.
  const sweep = ((t + 0.4) % 2.8) / 0.9;
  if (sweep < 1) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.clip();
    const sx = lerp(x - 120, x + w + 120, ease.inOutQuad(sweep));
    const g = ctx.createLinearGradient(sx - 70, -h, sx + 70, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.34)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  lucideIcon(ctx, 'Sparkles', x + padX + ic / 2, 0, ic, { color: '#FFFFFF', stroke: 2.2 });
  text(ctx, label, x + padX + ic + gap, 2, { weight: 600, size, color: '#FFFFFF', align: 'left', tracking: track });
}

// Scale/fade wrapper for things that pop in around their own centre.
function popAt(ctx, x, y, k, fn, rot = 0) {
  if (k <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  if (rot) ctx.rotate(rot * (1 - k));
  fn();
  ctx.restore();
}

// ---------------------------------------------------------------- layouts

function stackLayout(ctx, { title, by, kicker, hasTile }) {
  const fit = fitTitle(ctx, title, STACK.w - 100, 124, 96, 58);
  const lh = fit.size * 1.04;
  const topPad = hasTile ? STACK.tile / 2 + 34 : 56;
  const kickH = kicker ? KICK.h : 0, gapA = kicker ? 38 : 0;
  const byH = by ? 40 : 0, gapB = by ? 28 : 0;
  const h = topPad + kickH + gapA + fit.lines.length * lh + gapB + byH + 56;
  const top = clamp(STACK.cy - h / 2, STACK.minTop, STACK.maxBottom - h);
  return { fit, lh, topPad, kickH, gapA, byH, gapB, h, top };
}

function drawStack(s, L, { title, by, kicker, toolId }) {
  const { ctx, t } = s;
  const cx = W / 2, x = cx - STACK.w / 2;
  const e = s.spring(0.05, { freq: 1.6, damp: 0.58 });
  const y = L.top + (1 - e) * 160 + Math.sin(t * 1.4) * 4;
  ctx.save();
  ctx.globalAlpha *= clamp(e * 1.8);
  ctx.translate(cx, y + L.h / 2);
  ctx.scale(0.95 + 0.05 * e, 0.95 + 0.05 * e);
  ctx.translate(-cx, -(y + L.h / 2));
  paper(ctx, c => roundRectPath(c, x, y, STACK.w, L.h, STACK.r), { fill: '#FFFFFF', lift: 2.6 });

  let ty = y + L.topPad;
  if (kicker) popAt(ctx, cx, ty + L.kickH / 2, s.enter(0.42, 0.4), () => kickerPill(ctx, kicker, t));
  ty += L.kickH + L.gapA;
  // Title and by-line ease up just after the card.
  const tp = ease.outCubic(prog(t, 0.24, 0.45));
  ctx.save();
  ctx.globalAlpha *= tp;
  ctx.translate(0, (1 - tp) * 18);
  L.fit.lines.forEach((l, i) => text(ctx, l, cx, ty + L.lh * (i + 0.5) + L.fit.size * 0.03, { weight: 'd600', size: L.fit.size, color: C.ink }));
  ctx.restore();
  ty += L.fit.lines.length * L.lh + L.gapB;
  if (by) {
    const bp = ease.outCubic(prog(t, 0.4, 0.45));
    ctx.save();
    ctx.globalAlpha *= bp;
    text(ctx, clip(ctx, by, 500, 38, STACK.w - 120), cx, ty + L.byH / 2 + (1 - bp) * 12, { weight: 500, size: 38, color: C.mute });
    ctx.restore();
  }
  // Logo tile perched on the card's top edge.
  if (toolId) popAt(ctx, cx, y, s.enter(0.3, 0.45), () => logoTile(ctx, 0, 0, STACK.tile, { toolId, name: toolInfo(toolId)?.title || title }), -0.25);
  ctx.restore();
  return { top: y };
}

function postLayout(ctx, img, { title, by, hasTile }) {
  const textX = POST.pad + (hasTile ? POST.tile + 30 : 0);
  const textW = POST.w - textX - 40;
  const fit = fitTitle(ctx, title, textW, 84, 68, 52);
  const lh = fit.size * 1.06;
  const block = fit.lines.length * lh + (by ? 10 + 40 : 0);
  const body = Math.max(hasTile ? POST.tile : 0, block);
  const rest = POST.inset + POST.pad + body + POST.pad + 4;
  const iw = POST.w - POST.inset * 2;
  const room = POST.maxBottom - POST.top - rest;
  const ih = clamp(Math.min(iw / (img.width / img.height), room), POST.minImg, POST.maxImg);
  return { textX, textW, fit, lh, block, body, iw, ih, h: POST.inset + ih + rest };
}

function drawPost(s, L, img, { title, by, kicker, toolId }) {
  const { ctx, t } = s;
  const cx = W / 2, x = POST.x;
  const e = s.spring(0.05, { freq: 1.6, damp: 0.6 });
  const y = POST.top + (1 - e) * 160 + Math.sin(t * 1.4) * 3;
  ctx.save();
  ctx.globalAlpha *= clamp(e * 1.8);
  ctx.translate(cx, y + L.h / 2);
  ctx.scale(0.95 + 0.05 * e, 0.95 + 0.05 * e);
  ctx.translate(-cx, -(y + L.h / 2));
  paper(ctx, c => roundRectPath(c, x, y, POST.w, L.h, POST.r), { fill: '#FFFFFF', lift: 2.6 });

  // The real media, cover-fitted with a slow push.
  const ix = x + POST.inset, iy = y + POST.inset;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(ix, iy, L.iw, L.ih, POST.imgR);
  ctx.clip();
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(ix, iy, L.iw, L.ih);
  // Stills get a slow push; video plays as-is.
  drawCover(ctx, img, ix, iy, L.iw, L.ih, { zoom: L.still ? 1.01 + 0.05 * ease.inOutQuad(clamp(t / 5)) : 1, py: -0.15 });
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(ix + 0.75, iy + 0.75, L.iw - 1.5, L.ih - 1.5, POST.imgR);
  ctx.strokeStyle = 'rgba(16,16,20,0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Logo + title + by-line in a row under the media.
  const by0 = iy + L.ih + POST.pad;
  const midY = by0 + L.body / 2;
  if (toolId) popAt(ctx, x + POST.pad + POST.tile / 2, midY, s.enter(0.3, 0.45), () => logoTile(ctx, 0, 0, POST.tile, { toolId, name: toolInfo(toolId)?.title || title }), -0.25);
  const tp = ease.outCubic(prog(t, 0.24, 0.45));
  const tx = x + L.textX;
  let ty = midY - L.block / 2;
  ctx.save();
  ctx.globalAlpha *= tp;
  ctx.translate((1 - tp) * 18, 0);
  L.fit.lines.forEach((l, i) => text(ctx, l, tx, ty + L.lh * (i + 0.5) + L.fit.size * 0.03, { weight: 'd600', size: L.fit.size, color: C.ink, align: 'left' }));
  ty += L.fit.lines.length * L.lh + 10;
  if (by) text(ctx, clip(ctx, by, 500, 36, L.textW), tx, ty + 20, { weight: 500, size: 36, color: C.mute, align: 'left' });
  ctx.restore();

  // Kicker badge on the media's top-left corner.
  if (kicker) popAt(ctx, ix + 26 + kickerLabel(ctx, kicker).w / 2, iy + 26 + KICK.h / 2, s.enter(0.42, 0.4), () => kickerPill(ctx, kicker, t));
  ctx.restore();
  return { top: y };
}

// ---------------------------------------------------------------- scene

export default {
  type: 'hook',
  describe: 'Opening beat. The news as a clean site card: the product logo tile, a pink kicker pill, the product/feature name and a by-line; the brand glow blooms behind it and Kit pops up cheering. Pass `media` to show the real source image/video on the card. Use for beat 1.',
  props: {
    kicker: 'string ≤ 16 chars, e.g. "JUST SHIPPED", "NOW FREE", "NEW IN BETA"',
    title: 'string ≤ 28 chars — the product or feature name, e.g. "Nano Banana 2.1"',
    by: 'string ≤ 28 chars — maker or context, e.g. "from Google"',
    logo: 'optional data.ts toolId for the logo tile (defaults to the episode tool)',
    media: 'optional media id — the best real image/video from the sources, shown on the card',
  },
  draw(s) {
    const { ctx, t, props, episode } = s;
    const cx = W / 2;
    const info = {
      title: String(props.title || episode.subject?.name || '').trim(),
      by: String(props.by || '').trim(),
      kicker: String(props.kicker || '').trim().toUpperCase(),
      toolId: props.logo || episode.source?.toolId || null,
    };
    info.hasTile = Boolean(info.toolId);
    const item = s.media(props.media);
    const img = item ? s.mediaFrame(props.media) : null;

    const L = img ? { ...postLayout(ctx, img, info), still: item.kind !== 'video' } : stackLayout(ctx, info);
    const top = img ? POST.top : L.top;
    // Glow + orbit rings bloom behind the card once it lands.
    const bloom = s.spring(0.32, { freq: 1.4, damp: 0.6 });
    if (bloom > 0) burst(ctx, cx, top + L.h / 2, (img ? 640 : 600) * bloom, { t });

    const card = img ? drawPost(s, L, img, info) : drawStack(s, L, info);

    confetti(ctx, { x: cx, y: card.top + 10, t, at: 0.5, seed: 'hook-confetti', count: 18, spread: 1.15, colors: [C.pink, C.blush, C.pinkDeep, '#FF8DBF'] });

    // Kit rises from behind the floor edge and cheers (beat.mascot overrides).
    const rise = s.spring(0.3, { freq: 1.8, damp: 0.45 });
    const ky = BAND.floorY + 64 + (1 - rise) * 420;
    const cheer = t > 0.7;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, BAND.floorY + 90);
    ctx.clip();
    s.kit({ x: cx + 10, y: ky, s: img ? 0.8 : 0.96, pose: cheer ? 'cheer' : 'idle', face: cheer ? 'happy' : 'wow' });
    ctx.restore();
  },
};
