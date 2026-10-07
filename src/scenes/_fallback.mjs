// Used when a beat names a scene type that doesn't exist: Kit shrugs next to a
// card with the beat label, so a bad script still renders something sane.
import { W, C, BAND } from '../brand.mjs';
import { card, fitWrapped, text } from '../paper.mjs';

export default {
  type: '_fallback',
  draw(s) {
    const { ctx } = s;
    const e = s.enter(0.05);
    ctx.save();
    ctx.translate(W / 2, 760);
    ctx.scale(e, e);
    card(ctx, -380, -200, 760, 400, { fill: C.chalk, lift: 2, seed: 'fb' });
    const { size, lines } = fitWrapped(ctx, s.beat.label || s.beat.scene || '', 900, 640, 3, 64, 30);
    lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * size * 1.15, { weight: 900, size }));
    ctx.restore();
    s.kit({ x: W / 2, y: BAND.floorY + 40, s: 0.9, pose: 'shrug', face: 'wow' });
  },
};
