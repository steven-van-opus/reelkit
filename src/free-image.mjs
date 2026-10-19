// Images as themselves: a photo, logo, cut-out or overlay is drawn whole (contain-fit), with a soft shadow that
// follows its own shape (a transparent logo keeps its outline), never framed in a paper print, a tile or tape.
// Only video keeps the engine's print frame. Used by photoPrint() in scenes/paper/product.mjs and scenes/media.mjs.

export function freeImage(ctx, img, x, y, w, h, { lift = 1.6, alpha = 1 } = {}) {
  const iw = img?.width || img?.videoWidth || 0, ih = img?.height || img?.videoHeight || 0;
  if (!iw || !ih || w <= 0 || h <= 0) return { x, y, w, h };
  const k = Math.min(w / iw, h / ih), dw = iw * k, dh = ih * k, dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.save();
  ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
  ctx.shadowColor = 'rgba(24,10,32,0.22)';
  ctx.shadowBlur = 16 * lift;
  ctx.shadowOffsetY = 7 * lift;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return { x: dx, y: dy, w: dw, h: dh };
}
