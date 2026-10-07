// Closing beat: Kit's speech bubble is a white site card asking for the
// comment, with the keyword in the brand gradient and a site-style comment
// field underneath that focuses, types the keyword and posts it. A card with
// the brand pack's lockup sits on the floor. The comment is the only ask on
// screen (no follow pill).
import { W, C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, text, measure, fitSize } from '../../paper.mjs';
import { lucideIcon } from '../../icons.mjs';
import { brandGradient, drawLockup, lockupAspect } from '../../brandmark.mjs';
import { clamp, ease, luminance } from '../../util.mjs';
import { HOUSE_CTA } from '../../cta.mjs';
import { BRAND } from '../../brandpack.mjs';

const BUBBLE = { x: 96, y: 452, w: 888, r: 32, pad: 44 };
const FIELD = { h: 108, r: 8 };
const KIT = { x: 820, s: 0.88 };
const TYPE_START = 0.85, PER_CHAR = 0.09;
// The colour lockup's viewBox, width / height.
const LOCKUP_ASPECT = lockupAspect('color');

// Shorten to fit maxW at weight/size, ending in an ellipsis.
function clip(ctx, str, weight, size, maxW) {
  if (measure(ctx, str, weight, size) <= maxW) return str;
  let s = str;
  while (s.length > 1 && measure(ctx, `${s}…`, weight, size) > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

// Bubble outline: a rounded card with a tail from its bottom edge toward Kit.
function bubblePath(c, x, y, w, h, r, tail) {
  const { x0, x1, tx, ty } = tail;
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x1, y + h);
  c.quadraticCurveTo(x1 - 6, y + h + (ty - y - h) * 0.45, tx, ty);
  c.quadraticCurveTo(x0 + 18, y + h + (ty - y - h) * 0.3, x0, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

// The comment field, like the site's inputs: #F5F5F5 fill, 8px radius, an ink
// focus ring while it has the caret.
function commentField(ctx, x, y, w, keyword, t, { typed, focus, posted, postT }) {
  const h = FIELD.h;
  if (focus > 0) {
    ctx.save();
    ctx.globalAlpha *= focus;
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 5, w + 10, h + 10, FIELD.r + 5);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, FIELD.r);
  ctx.fillStyle = '#F5F5F5';
  ctx.fill();
  ctx.restore();

  // Viewer avatar.
  const ax = x + 24 + 30, ay = y + h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#DEDEE6';
  ctx.fill();
  ctx.restore();
  lucideIcon(ctx, 'User', ax, ay, 32, { color: C.mute, stroke: 2.2 });

  // Text, caret.
  const tx = ax + 30 + 22;
  const n = typed.length;
  if (n === 0) text(ctx, 'Add a comment…', tx, ay + 2, { weight: 500, size: 38, color: C.mute, align: 'left' });
  else text(ctx, typed, tx, ay + 2, { weight: 600, size: 40, color: C.ink, align: 'left', tracking: 1 });
  if (focus > 0.5 && (n < keyword.length || Math.floor(t * 2.4) % 2 === 0) && posted <= 0) {
    const cw = n ? measure(ctx, typed, 600, 40, 1) + 6 : 0;
    ctx.fillStyle = C.ink;
    ctx.fillRect(tx + cw, ay - 24, 3.5, 48);
  }

  // Post button: muted until there's something to send, then ink; it dips
  // when pressed and swaps its label for a check once posted.
  const done = n >= keyword.length;
  const bw = 132, bh = 72, bx = x + w - 18 - bw;
  const press = t > postT && t < postT + 0.18 ? Math.sin(((t - postT) / 0.18) * Math.PI) * 0.06 : 0;
  ctx.save();
  ctx.translate(bx + bw / 2, ay);
  ctx.scale(1 - press, 1 - press);
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, FIELD.r);
  ctx.fillStyle = done ? C.ink : '#DEDEE6';
  ctx.fill();
  if (posted > 0) {
    ctx.globalAlpha *= posted;
    lucideIcon(ctx, 'Check', 0, 0, 38, { color: '#FFFFFF', stroke: 2.6 });
  } else {
    text(ctx, 'Post', 0, 2, { weight: 600, size: 34, color: done ? '#FFFFFF' : C.mute });
  }
  ctx.restore();
}

export default {
  type: 'cta',
  describe: `Closing beat. ${BRAND.mascot.name}'s speech bubble asks for the comment keyword, a comment field types and posts it, and a card shows the ${BRAND.name} logo. Always the last beat.`,
  props: {
    keyword: `set automatically from the house CTA (src/cta.mjs): ${HOUSE_CTA.keyword}`,
    line: 'set automatically from the house CTA (src/cta.mjs)',
  },
  draw(s) {
    const { ctx, t, props } = s;
    const keyword = String(props.keyword || s.episode.cta?.keyword || HOUSE_CTA.keyword).trim().toUpperCase();
    const line = String(props.line || HOUSE_CTA.line).trim();
    const darkWall = luminance(s.set.wall) < 0.1;
    const { x, y, w, r, pad } = BUBBLE;

    // ---- bubble layout.
    const ks = fitSize(ctx, keyword, 'd700', w - pad * 2 - 40, 156, 64);
    const eyebrowY = y + pad + 22;
    const kwY = eyebrowY + 34 + ks * 0.5;
    const lineY = kwY + ks * 0.5 + 34;
    const fieldY = lineY + 56;
    const h = fieldY + FIELD.h + pad - y;
    const tail = { x0: KIT.x - 150, x1: KIT.x - 60, tx: KIT.x - 40, ty: y + h + 92 };

    // ---- typing timeline.
    const n = clamp(Math.floor((t - TYPE_START) / PER_CHAR), 0, keyword.length);
    const postT = TYPE_START + keyword.length * PER_CHAR + 0.25;
    const focus = clamp((t - TYPE_START + 0.25) / 0.2) * (1 - clamp((t - postT - 0.1) / 0.25));
    const posted = clamp((t - postT - 0.12) / 0.2);

    // ---- bubble pops out of its tail.
    const b = s.enter(0.1, 0.45);
    if (b > 0) {
      const ox = tail.tx, oy = tail.ty;
      const float = Math.sin(t * 1.5) * 3;
      ctx.save();
      ctx.translate(ox, oy + float);
      ctx.scale(b, b);
      ctx.translate(-ox, -oy);
      paper(ctx, c => bubblePath(c, x, y, w, h, r, tail), { fill: '#FFFFFF', lift: 2.6 });
      text(ctx, 'COMMENT', x + w / 2, eyebrowY, { weight: 600, size: 34, color: C.mute, tracking: 5 });
      text(ctx, keyword, x + w / 2, kwY + ks * 0.04, { weight: 'd700', size: ks, color: brandGradient(ctx, x + w / 2 - 300, kwY - ks / 2, x + w / 2 + 300, kwY + ks / 2) });
      text(ctx, clip(ctx, line, 500, 40, w - pad * 2), x + w / 2, lineY, { weight: 500, size: 40, color: C.ink });
      // The field slides up into the bubble just after it opens.
      const fa = ease.outCubic(clamp((t - 0.35) / 0.35));
      if (fa > 0) {
        ctx.save();
        ctx.globalAlpha *= fa;
        ctx.translate(0, (1 - fa) * 24);
        commentField(ctx, x + pad, fieldY, w - pad * 2, keyword, t, { typed: keyword.slice(0, n), focus, posted, postT });
        ctx.restore();
      }
      ctx.restore();
    }

    // ---- brand card on the floor, left: the lockup over the site.
    const sg = ease.outBack(clamp((t - 0.6) / 0.45), 1.4);
    if (sg > 0) {
      const cw = 560, chh = 176, cx = 80, cy = BAND.floorY - 30 - chh;
      const lh = (cw - 80) / LOCKUP_ASPECT;
      ctx.save();
      ctx.globalAlpha *= clamp(sg * 2);
      ctx.translate(0, (1 - sg) * 50 + Math.sin(t * 1.3 + 2) * 2);
      paper(ctx, c => roundRectPath(c, cx, cy, cw, chh, 20), { fill: '#FFFFFF', lift: 2 });
      drawLockup(ctx, cx + cw / 2, cy + 38, lh, { align: 'center' });
      text(ctx, BRAND.site, cx + cw / 2, cy + chh - 44, { weight: 500, size: 34, color: C.mute });
      ctx.restore();
    }

    s.kit({ x: KIT.x, y: BAND.floorY + 66, s: KIT.s, pose: 'wave', face: t > 1.2 ? 'happy' : 'smile' });
  },
};
