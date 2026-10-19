// A style's spoken-word captions: which words are on screen at a moment, and where. The canvas look (src/canvas.mjs)
// lays them out with it in the style's treatment. Pure.

import { CAPTION_BAND, SAFE_ZONE } from './safe-zone.mjs';

/**
 * Words grouped into caption phrases: at most `max` words or `chars`
 * characters, breaking after sentence and clause punctuation.
 */
export function captionPhrases(words, { max = 3, chars = 22 } = {}) {
  const out = [];
  let cur = [], len = 0;
  words.forEach((w, i) => {
    const text = String(w.text || '');
    if (cur.length && (cur.length >= max || len + 1 + text.length > chars)) { out.push(cur); cur = []; len = 0; }
    cur.push(i);
    len += (len ? 1 : 0) + text.length;
    if (/[.!?;:,]["”’)]*$/.test(text)) { out.push(cur); cur = []; len = 0; }
  });
  if (cur.length) out.push(cur);
  return out;
}

// ---------------------------------------------------------------- a canvas style's captions

/** One moment of a style's captions: each word's box (x, y its top-left; the text sits on its baseline at y + h × 0.78), and their bounds. */

/**
 * A canvas style's captions at T (absolute seconds): the phrase being said, laid out in CAPTION_BAND in the style's
 * treatment, or null when no phrase is showing (before the first word, after a beat's last phrase has had its moment).
 * `measure` is a text's width at a size (the canvas's).
 */
export function canvasCaptionLayout(treatment, words, T, measure) {
  if (!words?.length) return null;
  const phrases = captionPhrases(words, treatment.phrase);
  let k = -1;
  phrases.forEach((p, i) => { if (words[p[0]].start - 0.05 <= T) k = i; });
  if (k < 0) return null;
  const phrase = phrases[k];
  const until = phrases[k + 1] ? words[phrases[k + 1][0]].start : words[phrase[phrase.length - 1]].end + 0.6;
  if (T > until + 0.05) return null;
  const said = phrase.filter(i => words[i].start <= T);
  const current = said.length ? said[said.length - 1] : phrase[0];
  const label = (i) => (treatment.upper ? String(words[i].text).toUpperCase() : String(words[i].text));
  const shown = treatment.kind === 'word-chip' ? [current] : phrase;
  let size = treatment.size;
  const chip = treatment.kind === 'chips' || treatment.kind === 'word-chip';
  const pad = chip ? size * 0.36 : 0, gap = chip ? size * 0.2 : size * 0.26, maxW = SAFE_ZONE.right - SAFE_ZONE.left;
  const widthOf = (i) => measure(label(i), size) + pad * 2;
  // One line for chips (shrunk to fit), up to two wrapped lines for a line of words.
  let lines = [shown];
  if (chip) {
    const total = shown.reduce((a, i) => a + widthOf(i), 0) + gap * (shown.length - 1);
    if (total > maxW) size = Math.max(30, Math.floor((size * maxW) / total));
  } else {
    lines = [];
    let cur = [], w = 0;
    for (const i of shown) {
      const add = widthOf(i) + (cur.length ? gap : 0);
      if (cur.length && w + add > maxW) { lines.push(cur); cur = []; w = 0; }
      cur.push(i); w += cur.length > 1 ? add : widthOf(i);
    }
    if (cur.length) lines.push(cur);
    // Past two lines, a smaller size until it fits.
    if (lines.length > 2 && size > 30) return canvasCaptionLayout({ ...treatment, size: size - 4 }, words, T, measure);
  }
  const h = chip ? size * 1.5 : size * 1.2, lead = chip ? 0 : size * 0.06;
  const mid = (CAPTION_BAND.top + CAPTION_BAND.bottom) / 2;
  const top = mid - (lines.length * h + (lines.length - 1) * lead) / 2;
  const items = [];
  lines.forEach((line, row) => {
    const widths = line.map(widthOf);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (line.length - 1);
    let x = treatment.kind === 'line-left' ? SAFE_ZONE.left : 540 - total / 2;
    line.forEach((i, n) => {
      items.push({ text: label(i), x, y: top + row * (h + lead), w: widths[n], h, spoken: words[i].start <= T, current: i === current, since: T - words[i].start });
      x += widths[n] + gap;
    });
  });
  const x0 = Math.min(...items.map(it => it.x)), x1 = Math.max(...items.map(it => it.x + it.w));
  const y0 = Math.min(...items.map(it => it.y)), y1 = Math.max(...items.map(it => it.y + it.h));
  return { items, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, size };
}
