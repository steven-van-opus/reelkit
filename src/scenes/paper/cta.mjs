// Closing beat: a paper comment bar types the keyword, the Post button lights
// up, a speech bubble from Kit repeats the ask, and a site sign points to the
// brand pack's site. The house ask (comment the keyword) is the only ask on
// screen: the late accent is the Post button pulsing, never a second CTA.
import { W, C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, cutCirclePath, text, measure, fitSize, pinkGradient, tornRectPath } from '../../paper.mjs';
import { pill, icon, sparkles, confetti } from '../../fx.mjs';
import { clamp, onTwos, ease } from '../../util.mjs';
import { drawLockup, brandPixel } from '../../brandmark.mjs';
import { HOUSE_CTA } from '../../cta.mjs';
import { BRAND } from '../../brandpack.mjs';

export default {
  type: 'cta',
  describe: `Closing beat. A comment box types the keyword, ${BRAND.mascot.name} waves with a speech bubble, and a sign shows ${BRAND.site}. Always the last beat.`,
  props: {
    keyword: `set automatically from the house CTA (src/cta.mjs): ${HOUSE_CTA.keyword}`,
    line: 'set automatically from the house CTA (src/cta.mjs)',
  },
  draw(s) {
    const { ctx, t, props } = s;
    const keyword = String(props.keyword || s.episode.cta?.keyword || HOUSE_CTA.keyword).toUpperCase();
    const line = props.line || HOUSE_CTA.line;

    // Speech bubble.
    const b = s.enter(0.1, 0.45);
    if (b > 0) {
      const bx = 470, by = 540, bw = 760, bh = 320;
      ctx.save();
      ctx.translate(bx, by + bh / 2);
      ctx.scale(b, b);
      ctx.translate(-bx, -(by + bh / 2));
      paper(ctx, c => {
        roundRectPath(c, bx - bw / 2, by, bw, bh, 44);
        c.moveTo(bx + 150, by + bh - 6);
        c.lineTo(bx + 250, by + bh + 90);
        c.lineTo(bx + 60, by + bh - 6);
        c.closePath();
      }, { fill: C.chalk, lift: 2.2, rim: 1 });
      text(ctx, 'COMMENT', bx, by + 82, { weight: 900, size: 52, color: C.mute, tracking: 4 });
      const quoted = `“${keyword}”`;
      const ks = fitSize(ctx, quoted, 900, bw - 120, 132, 60);
      text(ctx, quoted, bx, by + 186, { weight: 900, size: ks, color: C.pink, tracking: 2 });
      text(ctx, line, bx, by + 272, { weight: 700, size: fitSize(ctx, line, 700, bw - 100, 40, 32), color: C.ink });
      ctx.restore();
    }

    // A comment thread: the viewer's comment types the keyword, gets a like,
    // and the brand's account replies that it's been sent — the ask, shown working.
    const cardX = 90, cardY = 905, cardW = 900, cardH = 236;
    const ba = s.enter(0.35, 0.35);
    if (ba > 0) {
      ctx.save();
      ctx.globalAlpha *= clamp(ba * 2);
      ctx.translate(0, (1 - ba) * 60);
      paper(ctx, c => roundRectPath(c, cardX, cardY, cardW, cardH, 28), { fill: C.chalk, lift: 1.8, rim: 0.8 });

      // The viewer: a generic avatar, "you", and the comment typing in.
      const ax = cardX + 66, ay = cardY + 66;
      paper(ctx, c => cutCirclePath(c, ax, ay, 34, { seed: 'cta-av' }), { fill: C.blush, lift: 0.3, rim: 0.4 });
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, ay, 34, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = C.pink;
      ctx.beginPath(); ctx.arc(ax, ay - 8, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ax, ay + 26, 22, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const tx = ax + 56;
      text(ctx, 'you', tx, cardY + 42, { weight: 800, size: 30, color: C.ink, align: 'left' });
      const typeStart = 0.8;
      const n = clamp(Math.floor((onTwos(t) - typeStart) / 0.09), 0, keyword.length);
      const typed = keyword.slice(0, n);
      const done = n >= keyword.length;
      const postT = typeStart + keyword.length * 0.09 + 0.15;
      if (n) text(ctx, typed, tx, cardY + 90, { weight: 900, size: 44, color: C.ink, align: 'left', tracking: 1 });
      if (!done && Math.floor(t * 2.5) % 2 === 0 || (n > 0 && !done)) {
        const cw = n ? measure(ctx, typed, 900, 44, 1) : 0;
        ctx.fillStyle = C.pink;
        ctx.fillRect(tx + cw + (n ? 5 : 0), cardY + 70, 4, 42);
      }
      // Once posted: "now · Reply" and a like.
      const posted = clamp((onTwos(t) - postT) / 0.25);
      if (posted > 0) {
        ctx.save();
        ctx.globalAlpha *= posted;
        text(ctx, 'now', tx, cardY + 132, { weight: 600, size: 26, color: C.mute, align: 'left' });
        text(ctx, 'Reply', tx + measure(ctx, 'now', 600, 26) + 28, cardY + 132, { weight: 700, size: 26, color: C.mute, align: 'left' });
        ctx.restore();
      }
      const like = clamp((onTwos(t) - postT - 0.2) / 0.3);
      const hx = cardX + cardW - 64, hy = cardY + 78;
      ctx.save();
      ctx.translate(hx, hy);
      const pop = like > 0 ? 1 + 0.35 * Math.sin(Math.min(1, like) * Math.PI) : 1;
      ctx.scale(pop, pop);
      icon(ctx, 'heart', 0, 0, 40, like > 0 ? C.pink : C.line);
      ctx.restore();
      if (like > 0) text(ctx, '1', hx, hy + 40, { weight: 700, size: 24, color: C.mute });

      // The reply from the brand's handle, indented, with the real app icon.
      const rp = s.enter(postT + 0.75, 0.35);
      if (rp > 0) {
        const rx = cardX + 150, ry = cardY + 186;
        ctx.save();
        ctx.globalAlpha *= clamp(rp * 2);
        ctx.translate(rx, ry);
        ctx.scale(0.85 + 0.15 * rp, 0.85 + 0.15 * rp);
        ctx.translate(-rx, -ry);
        brandPixel(ctx, rx, ry, 52);
        text(ctx, BRAND.handle, rx + 42, ry - 13, { weight: 800, size: 26, color: C.ink, align: 'left' });
        text(ctx, 'Sent! Check your DMs', rx + 42, ry + 17, { weight: 700, size: 30, color: C.ink, align: 'left' });
        ctx.restore();
      }
      ctx.restore();
      if (done) confetti(ctx, { x: hx, y: hy, t, at: postT + 0.2, seed: 'cta-conf', count: 16, spread: 0.8, speed: 0.35 });
    }

    // Site sign on the floor, left.
    const sg = s.enter(0.6, 0.4);
    if (sg > 0) {
      // Inset so its left edge stays ≥ x 80 through the camera push.
      const sx = 348, sy = BAND.floorY + 96;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-0.04);
      ctx.scale(sg, sg);
      // Post.
      ctx.fillStyle = '#B98A5E';
      ctx.fillRect(-9, -100, 18, 100);
      // The official lockup on a chalk card, URL underneath.
      paper(ctx, c => tornRectPath(c, -240, -250, 480, 136, { seed: 'cta-sign', rough: 3 }), { fill: C.chalk, lift: 2, rim: 0.6 });
      drawLockup(ctx, 0, -222, 52, { align: 'center' });
      text(ctx, BRAND.site, 0, -148, { weight: 600, size: 30, color: C.mute });
      ctx.restore();
    }

    sparkles(ctx, { x: 810, y: 1190, t, radius: 190, count: 4, seed: 'cta-sp', fill: C.chalk });
    s.kit({ x: 810, y: BAND.floorY + 70, s: 0.88, pose: 'wave', face: t > 1.2 ? 'happy' : 'smile' });
  },
};
