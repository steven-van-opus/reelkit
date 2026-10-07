// Opening beat: a hanging paper sign drops in with the product name, a sticker
// says what happened ("JUST SHIPPED"), the product's logo sticker gets taped
// onto the sign's corner, confetti fires on impact and Kit pops up from behind
// the floor to cheer. With a source image or video (props.media) the real
// media is the hero: a big taped photo print, shown whole (contain-fit, so
// lettering near its edges is never cropped), with the sign hanging below it
// on strings that run clear of the print's sides.
//
// As the first beat, the hook opens on a finished frame: the print is already
// taped up on frame 0 (the label is too — render.mjs), and the sign drops in
// from above the frame a beat later.
import { W, C, BAND, font } from '../../brand.mjs';
import { paper, roundRectPath, fitWrapped, wrapLines, text, measure, tape, pinkGradient } from '../../paper.mjs';
import { confetti, pill, sparkles, string } from '../../fx.mjs';
import { toolInfo } from '../../logos.mjs';
import { clamp, onTwos, spring, boil } from '../../util.mjs';
import { photoPrint, printSize, printTilt, slapIn, logoSticker } from './product.mjs';
import { titleStrips, titleLetters, titleOnPrint } from './hook-titles.mjs';
import { TITLES } from './titles/index.mjs';

// The print on the wall: top edge and the biggest it may be (border included).
// The sign is SIGN_W wide and its strings hang STRING_IN from its ends, so a
// print up to PRINT.maxW (plus its tilt) stays between them.
const SIGN_W = 880, STRING_IN = 32;
const PRINT = { top: 334, maxW: 2 * (SIGN_W / 2 - STRING_IN - 34), maxH: 490 };
const SIGN_GAP = 32;   // print bottom → sign top

// Two title lines split evenly ("Nano / Banana 2.1", not "Nano Banana / 2.1").
function balance(ctx, str, size, lines, maxW) {
  if (lines.length !== 2 || lines[1].endsWith('…')) return lines;
  ctx.save();
  ctx.font = font(900, size);
  let best = lines;
  for (let w = maxW - 16; w > maxW * 0.4; w -= 16) {
    const l = wrapLines(ctx, str, w);
    if (l.length > 2) break;
    best = l;
  }
  ctx.restore();
  return best;
}

// The house title treatment for hooks (see hook-titles.mjs). Torn strips, and
// with a real image the hook settles into the same layout as the reel's cover
// (src/thumbnail.mjs), so the first frame and the cover match.
export const HOOK_STYLE = 'strips';

// Hooks with a cut-paper title instead of the hanging sign.
function drawTitled(s, style) {
  const { ctx, t, props, episode } = s;
  const cx = W / 2;
  const mediaId = Array.isArray(props.media) ? props.media[0] : props.media;
  const item = s.media(mediaId);
  const first = s.index === 0;
  const slapAt = first ? -1 : 0.06;
  const img = item ? s.mediaFrame(mediaId, Math.max(0, slapAt)) : null;
  const title = props.title || episode.subject?.name || '';
  const toolId = toolInfo(props.logo || episode.source?.toolId) ? (props.logo || episode.source?.toolId) : null;
  const asPrint = style === 'print' && img;
  const coverLike = style === 'strips' && img;
  const print = img
    ? coverLike
      ? printSize(img.width / img.height, 820, 560, { crop: 1.25 })
      : printSize(img.width / img.height, asPrint ? 900 : PRINT.maxW, asPrint ? 640 : 420, { crop: props.fit === 'cover' ? 1.25 : 1 })
    : null;

  sparkles(ctx, { x: cx, y: 760, t, radius: 470, count: 7, seed: 'hook-sp', fill: s.set.ink === C.chalk ? C.blush : C.chalk });
  if (print) {
    const sl = first ? { alpha: 1, rot: 0, scale: 1, lift: 0 } : slapIn(s, slapAt);
    if (sl) {
      const b = boil('hook-print', t, 0.6);
      ctx.save();
      ctx.globalAlpha *= sl.alpha;
      ctx.translate(cx + b.dx, PRINT.top + print.h / 2 + b.dy);
      ctx.rotate((coverLike ? -0.045 : printTilt('hook-print')) + sl.rot + b.rot);
      ctx.scale(sl.scale, sl.scale);
      photoPrint(ctx, img, print, { seed: 'hook-print', t: t - Math.max(0, slapAt), dur: s.dur, video: item.kind === 'video', lift: 2 + sl.lift, tapeIn: 1 });
      ctx.restore();
    }
  }
  let bottom;
  if (coverLike) {
    // The cover's layout: logo sticker on the print's corner, the headline
    // left of centre, Kit at the right pointing at it.
    if (toolId) {
      const ls = slapIn(s, 0.6, 0.32);
      if (ls) {
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(cx + print.w / 2 - 40, PRINT.top + 34);
        ctx.rotate(0.14 + ls.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, 140, { toolId, lift: 1.8, taped: true, seed: 'hook-logo', tapeIn: 1 });
        ctx.restore();
      }
    }
    // No by-line strip here: the narrator says it, and the headline matches the cover's size.
    ({ bottom } = titleStrips(ctx, s, { cx: 430, top: PRINT.top + print.h + 26, bottom: 1420, title, kicker: props.kicker, toolId: null, maxW: 700 }));
    confetti(ctx, { x: 430, y: Math.min(bottom, 1100), t, at: 0.45, seed: 'hook-confetti', count: 34 });
    const rise = s.spring(0.3, { freq: 1.8, damp: 0.45 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, BAND.floorY + 90);
    ctx.clip();
    s.kit({ x: 905, y: BAND.floorY + 70 + (1 - rise) * 420, s: 0.95, pose: 'point', pointAngle: -2.3, face: t > 0.7 ? 'happy' : 'wow' });
    ctx.restore();
    return;
  }
  if (asPrint) {
    ({ bottom } = titleOnPrint(ctx, s, { cx, labelY: PRINT.top + print.h - 10, title, kicker: props.kicker, by: props.by }));
    if (toolId) {
      const ls = slapIn(s, 0.6, 0.32);
      if (ls) {
        ctx.save();
        ctx.globalAlpha *= ls.alpha;
        ctx.translate(cx + print.w / 2 - 40, PRINT.top + 24);
        ctx.rotate(0.12 + ls.rot);
        ctx.scale(ls.scale, ls.scale);
        logoSticker(ctx, 116, { toolId, lift: 1.4, taped: true, seed: 'hook-logo', tapeIn: 1 });
        ctx.restore();
      }
    }
  } else {
    const top = print ? PRINT.top + print.h + 30 : 360;
    const make = style === 'letters' ? titleLetters : TITLES[style] ? (c, st, o) => TITLES[style].draw(c, st, o) : titleStrips;
    // Leave the floor area to Kit: the title fills what's above it.
    ({ bottom } = make(ctx, s, { cx, top, bottom: print ? 1180 : 1010, title, kicker: props.kicker, by: props.by, toolId, maxW: print ? 820 : 900 }));
  }
  confetti(ctx, { x: cx, y: Math.min(bottom, 1100), t, at: 0.45, seed: 'hook-confetti', count: 34 });
  // Kit cheers from the floor — to the side when the title runs low.
  const rise = s.spring(0.3, { freq: 1.8, damp: 0.45 });
  const side = bottom > 1000;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, BAND.floorY + 90);
  ctx.clip();
  s.kit({ x: side ? W - 190 : W / 2 + 10, y: BAND.floorY + 70 + (1 - rise) * 420, s: side ? 0.82 : 0.96, pose: t > 0.7 ? 'cheer' : 'idle', face: t > 0.7 ? 'happy' : 'wow' });
  ctx.restore();
}

export default {
  type: 'hook',
  describe: 'Opening beat. A big hanging sign drops in with the product/news name, a sticker kicker, a by-line and the product logo sticker; confetti bursts and Kit pops up cheering. Pass `media` to pin the real source image/video above the sign as a taped photo print. Use for beat 1.',
  props: {
    kicker: 'string ≤ 16 chars, e.g. "JUST SHIPPED", "NOW FREE", "NEW IN BETA"',
    title: 'string ≤ 28 chars — the product or feature name, e.g. "Nano Banana 2.1"',
    by: 'string ≤ 28 chars — maker or context, e.g. "from Google"',
    logo: 'optional data.ts toolId for the logo sticker on the sign (defaults to the episode tool)',
    media: 'optional media id — the best real image/video from the sources, taped to the wall as a photo print',
    fit: "optional 'contain' (default: the whole image, nothing cropped) or 'cover' (crop up to 25% toward the print's shape — only for images with nothing important near the edges)",
    titleStyle: "optional 'strips' | 'letters' | 'print' | 'sign' — how the title is made (default: the house style)",
  },
  draw(s) {
    const style = s.props.titleStyle || process.env.REELS_HOOK || HOOK_STYLE;
    if (style !== 'sign') return drawTitled(s, style);
    const { ctx, t, props, episode } = s;
    const cx = W / 2;

    // A source image/video goes up first as a print; the sign then hangs
    // under it, a little shorter so everything clears Kit.
    const mediaId = Array.isArray(props.media) ? props.media[0] : props.media;
    const item = s.media(mediaId);
    // Opening the reel: the print is already up on frame 0.
    const first = s.index === 0;
    const slapAt = first ? -1 : 0.06;
    const img = item ? s.mediaFrame(mediaId, Math.max(0, slapAt)) : null;
    const crop = props.fit === 'cover' ? 1.25 : 1;
    const print = img ? printSize(img.width / img.height, PRINT.maxW, PRINT.maxH, { crop }) : null;
    // The sign drops once the print is up (a beat after frame 0 on the first beat).
    const d = print ? (first ? 0.07 : 0.16) : first ? -0.3 : 0;
    const sw = print ? SIGN_W : 820, sh = print ? 244 : 440;
    const cy = print ? PRINT.top + print.h + SIGN_GAP + sh / 2 : 760;
    const eye = print ? sw / 2 - STRING_IN : 260; // where the strings attach

    const toolId = props.logo || episode.source?.toolId || null;
    const hasLogo = Boolean(toolInfo(toolId));

    // Drop from above the frame + damped swing. Nothing shows before it starts.
    const drop = spring(onTwos(t) - 0.05 - d, { freq: 1.6, damp: 0.38 });
    const y = cy - (1 - drop) * (cy + sh / 2 + 140);
    const sinceSwing = Math.max(0, t - 0.35 - d);
    const swing = Math.exp(-2.2 * sinceSwing) * Math.sin(sinceSwing * 7) * 0.05;
    const signUp = drop > 0;

    sparkles(ctx, { x: cx, y: print ? 700 : cy, t, radius: 470, count: 7, seed: 'hook-sp', fill: s.set.ink === C.chalk ? C.blush : C.chalk });

    // The print slaps onto the wall behind where the sign will hang.
    if (print) {
      const sl = first ? { alpha: 1, rot: 0, scale: 1, lift: 0 } : slapIn(s, slapAt);
      if (sl) {
        const b = boil('hook-print', t, 0.6);
        ctx.save();
        ctx.globalAlpha *= sl.alpha;
        ctx.translate(cx + b.dx, PRINT.top + print.h / 2 + b.dy);
        ctx.rotate((coverLike ? -0.045 : printTilt('hook-print')) + sl.rot + b.rot);
        ctx.scale(sl.scale, sl.scale);
        photoPrint(ctx, img, print, {
          seed: 'hook-print', t: t - Math.max(0, slapAt), dur: s.dur, video: item.kind === 'video', lift: 2 + sl.lift,
          tapeIn: first ? 1 : clamp((s.ts - slapAt - 0.22) / 0.14),
        });
        ctx.restore();
      }
    }

    // Strings from the top of frame to the sign corners.
    const top = 320;
    if (signUp) {
    ctx.save();
    ctx.translate(cx, y - sh / 2 - 120);
    ctx.rotate(swing);
    ctx.translate(-cx, -(y - sh / 2 - 120));
    string(ctx, cx - eye, top - 400, cx - eye, y - sh / 2 + 18);
    string(ctx, cx + eye, top - 400, cx + eye, y - sh / 2 + 18);

    paper(ctx, c => roundRectPath(c, cx - sw / 2, y - sh / 2, sw, sh, 30), { fill: C.chalk, lift: 2.4, rim: 1 });
    // Pink inner border.
    ctx.save();
    ctx.strokeStyle = pinkGradient(ctx, cx - sw / 2, y - sh / 2, cx + sw / 2, y + sh / 2);
    ctx.lineWidth = 10;
    ctx.beginPath();
    roundRectPath(ctx, cx - sw / 2 + 22, y - sh / 2 + 22, sw - 44, sh - 44, 20);
    ctx.stroke();
    ctx.restore();
    // Eyelets where the strings attach.
    for (const ox of [-eye, eye]) {
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(cx + ox, y - sh / 2 + 18, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title: kept clear of the logo sticker on the top-right corner.
    const title = props.title || episode.subject?.name || '';
    const titleW = sw - (print ? 130 : hasLogo ? 180 : 140);
    // Title and by-line are one block, centred inside the pink border with a
    // fixed gap, and the title is sized to the height that leaves — so a
    // two-line title can never crowd the by-line.
    const bySize = print ? 34 : 36, byGap = 26;
    const inner = sh - 44 - 2 * (print ? 30 : 38);
    const byH = props.by ? bySize * 1.15 + byGap : 0;
    const lhK = 1.0;
    let fit = fitWrapped(ctx, title, 900, titleW, 2, print ? 96 : 112, print ? 48 : 52);
    const maxByHeight = Math.floor((inner - byH) / (fit.lines.length * lhK));
    if (fit.size > maxByHeight) {
      // Two lines don't fit the sign's height: one big line beats two small ones.
      const one = fitWrapped(ctx, title, 900, titleW, 1, Math.min(96, inner - byH), 56);
      fit = one.lines.length === 1 && !one.lines[0].endsWith('…') && measure(ctx, one.lines[0], 900, one.size, -1) <= titleW
        ? one
        : fitWrapped(ctx, title, 900, titleW, 2, maxByHeight, Math.min(maxByHeight, print ? 48 : 52));
    }
    const size = fit.size, lines = balance(ctx, title, size, fit.lines, titleW);
    const lh = size * lhK;
    const block = lines.length * lh + byH;
    const blockTop = y + 4 - block / 2;
    lines.forEach((l, i) => text(ctx, l, cx, blockTop + lh * (i + 0.5), { weight: 900, size, color: C.ink, tracking: -1 }));
    if (props.by) text(ctx, props.by, cx, blockTop + lines.length * lh + byGap + (bySize * 1.15) / 2, { weight: 600, size: bySize, color: C.mute });

    // The product's logo sticker gets taped over the sign's top-right corner
    // (inset so it stays inside the safe zone through the camera push).
    const ls = slapIn(s, 0.72 + d, 0.34);
    if (hasLogo && ls) {
      const size = print ? 112 : 124;
      const b = boil('hook-logo', t, 0.8);
      ctx.save();
      ctx.globalAlpha *= ls.alpha;
      ctx.translate(cx + sw / 2 - (print ? 70 : 34) + b.dx, y - sh / 2 + 8 + b.dy);
      ctx.rotate(0.1 + ls.rot + b.rot);
      ctx.scale(ls.scale, ls.scale);
      logoSticker(ctx, size, { toolId, lift: 1.4 + ls.lift * 0.5, taped: true, seed: 'hook-logo', tapeIn: clamp((s.ts - 0.72 - d - 0.18) / 0.12) });
      ctx.restore();
    }
    ctx.restore();
    }

    // Kicker sticker slaps on after the sign lands — on the sign itself, clear
    // of the print above it.
    const k = s.enter(0.55 + d, 0.35);
    if (k > 0 && props.kicker && signUp) {
      ctx.save();
      ctx.translate(cx - sw / 2 + 150, y - sh / 2 + (print ? 14 : 6));
      ctx.rotate(-0.12);
      ctx.scale(k, k);
      pill(ctx, 0, 0, props.kicker.toUpperCase(), { fill: 'pink', size: 38, weight: 900, tracking: 1, lift: 1.6 });
      ctx.restore();
      tape(ctx, cx - sw / 2 + 60, y - sh / 2 - 6, 70, 28, -0.6, { seed: 'hook-tape', alpha: 0.7 * k });
    }

    confetti(ctx, { x: cx, y: y + sh / 2 - 40, t, at: 0.42 + d, seed: 'hook-confetti', count: 34 });

    // Kit rises from behind the floor edge and cheers.
    const rise = s.spring(0.3 + d, { freq: 1.8, damp: 0.45 });
    const ky = BAND.floorY + 70 + (1 - rise) * 420;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, BAND.floorY + 90);
    ctx.clip();
    s.kit({ x: W / 2 + 10, y: ky, s: print ? 0.94 : 1.0, pose: t > 0.7 + d ? 'cheer' : 'idle', face: t > 0.7 + d ? 'happy' : 'wow' });
    ctx.restore();
  },
};
