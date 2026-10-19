// The canvas look: the frame a style (src/styles/) is drawn on. A style is a skill the writer designs every reel from,
// so this look draws only what every reel needs from it (the background in the style's colours, the spoken-word
// captions in the style's treatment in CAPTION_BAND, film grain and a vignette when the style asks, and the closing
// ask) and each scene's code draws everything else on the whole frame, at identity: scene coordinates are frame
// pixels. render.mjs draws a styled episode (`"style": "<id>"`) with it instead of the paper or studio look, with the
// same timing, voice and mix.
import { Path2D } from '@napi-rs/canvas';
import { W, H, FPS } from './brand.mjs';
import { brandPixel } from './brandmark.mjs';
import { mediaItem } from './mediastore.mjs';
import { luminance, mix, contrastRatio } from './util.mjs';
import { canvasCaptionLayout } from './code/captions.mjs';
import { CANVAS_STAGE, codeAssetId, runCodeScene, tornPath } from './code/scene.mjs';
import { paintCodeTree } from './code/paint.mjs';
import { CONTENT_ZONE } from './code/safe-zone.mjs';
import { provideMapShapes } from './code/map/kit.mjs';
import { MAP_SHAPES } from './code/map/shapes.mjs';

// The renderer draws countries with their real outlines; the scene checks measure each as its box.
provideMapShapes(MAP_SHAPES);

const clamp01 = v => Math.max(0, Math.min(1, v));
const outBack = (p, k = 1.7) => 1 + (k + 1) * (p - 1) ** 3 + k * (p - 1) ** 2;

/**
 * A palette as a canvas scene's `colors`: wall the background, floor a deeper tone of it, ink text on the background,
 * chalk cards, cardInk text on chalk, accent the primary, rose the secondary, blush a tint of the accent.
 * @param {{ primary: string, accent: string, ink: string, background: string }} palette
 */
export function canvasColors(palette) {
  const dark = luminance(palette.background) < 0.3;
  const chalk = dark ? '#F5F4F0' : '#FFFFFF';
  const cardInk = contrastRatio(palette.ink, chalk) >= 4.5 ? palette.ink : '#17171A';
  return {
    ink: palette.ink, cardInk, chalk,
    accent: palette.primary, pink: palette.primary, rose: palette.accent, blush: mix(palette.primary, '#FFFFFF', 0.6),
    wall: palette.background, floor: mix(palette.background, dark ? '#000000' : palette.ink, dark ? 0.35 : 0.1),
  };
}

/**
 * A face for code scenes and captions: the sans is the engine's Inter (Inter Display from 22 px up), the serif
 * Fraunces (ExtraBold, or SemiBold Italic), the mono the system's (no mono font ships with reelkit).
 */
export function canvasFont(weight, size, family = 'sans', italic = false) {
  const px = Math.round(size);
  if (family === 'serif') return `${italic ? 'italic ' : ''}${px}px ${italic ? 'FrauncesItalic, Fraunces' : 'Fraunces'}, Georgia, serif`;
  if (family === 'mono') return `${weight >= 700 ? 'bold ' : ''}${px}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  const w = Math.max(400, Math.min(900, Math.round(Number(weight) / 100) * 100 || 400));
  return `${px}px Inter${size >= 22 && w >= 500 ? `d${w}` : w}`;
}

/** A caption treatment's face at a size. */
export const captionFont = (treatment, size, weight = treatment.weight) => canvasFont(weight, size, treatment.font);

/** A small deterministic random from a string, for chips' tilts. */
function seeded(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** The beat at T and the time into it. */
function beatAt(timing, T) {
  const beats = timing.beats;
  let i = beats.findIndex(b => T >= b.start && T < b.end);
  if (i < 0) i = T < beats[0].start ? 0 : beats.length - 1;
  return { i, t: T - beats[i].start };
}

/** A beat drawn in code: a 'code' scene, or the opening when it has a `source`. */
const isCoded = beat => (beat.scene === 'code' || beat.scene === 'hook') && typeof beat.props?.source === 'string';

/**
 * The canvas look for one style (src/styles/index.mjs): `palette` and `frame` are the style's ({ captions, grain,
 * vignette }); `canvas(w, h)` makes an offscreen canvas (the grain tile).
 */
export function createCanvasLook({ palette, frame, brandName = '', canvas }) {
  const colors = canvasColors(palette);
  // What every frame draws the same is made once: the grain's pattern, the vignette's gradient and each chip's torn
  // outline (by its size and seed). Reusing them paints the same pixels as making them again.
  let grainTile = null, grainPattern = null, vignetteFill = null;
  const torn = new Map();
  const tornChip = (w, h, seed) => {
    const key = `${w},${h},${seed}`;
    let path = torn.get(key);
    if (!path) {
      if (torn.size >= 256) torn.clear();
      torn.set(key, path = new Path2D(tornPath(-w / 2, -h / 2, w, h, seed)));
    }
    return path;
  };

  function grain(ctx, frameNo) {
    if (!grainTile) {
      grainTile = canvas(256, 256);
      const g = grainTile.getContext('2d');
      const img = g.createImageData(256, 256);
      let seed = 1;
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 16807) % 2147483647;
        const v = seed % 256;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    const pattern = (grainPattern ||= ctx.createPattern(grainTile, 'repeat'));
    if (!pattern) return;
    const shift = (frameNo * 97) % 256;
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(-shift, -((frameNo * 53) % 256));
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }

  function vignette(ctx) {
    if (!vignetteFill) {
      vignetteFill = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.46, H * 0.72);
      vignetteFill.addColorStop(0, 'rgba(0,0,0,0)');
      vignetteFill.addColorStop(1, 'rgba(0,0,0,0.42)');
    }
    ctx.fillStyle = vignetteFill;
    ctx.fillRect(0, 0, W, H);
  }

  /** The spoken-word captions at T in the style's treatment (captions.mjs lays them out; nothing when no phrase shows). */
  function drawCaptions(ctx, words, T) {
    const tr = frame.captions;
    const measure = (text, size) => { ctx.font = captionFont(tr, size); return ctx.measureText(text).width; };
    const layout = canvasCaptionLayout(tr, words, T, measure);
    if (!layout) return;
    const { items, size } = layout;
    const text = colors[tr.color] ?? colors.ink, hi = colors[tr.highlight] ?? colors.accent;
    ctx.save();
    ctx.font = captionFont(tr, size);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if (tr.kind === 'chips' || tr.kind === 'word-chip') {
      const base = colors[tr.chip ?? 'chalk'];
      for (const it of items) {
        if (tr.kind === 'chips' && !it.spoken) continue;
        const pop = outBack(clamp01((it.since + 0.03) / 0.18), 2);
        const fill = tr.kind === 'chips' && it.current ? hi : base;
        const ink = contrastRatio(colors.cardInk, fill) >= 4.5 ? colors.cardInk : colors.chalk;
        const cx = it.x + it.w / 2, cy = it.y + it.h / 2, tilt = (seeded(it.text + it.x) - 0.5) * 0.08;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
        ctx.globalAlpha *= clamp01(pop * 2);
        ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
        ctx.fillStyle = fill;
        ctx.fill(tornChip(it.w, it.h, seeded(it.text) * 9));
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.fillText(it.text, 0, size * 0.35);
        ctx.restore();
      }
    } else {
      // A line of words: spoken in the style's colour, the word being said in its highlight, the rest dimmed.
      const light = luminance(text) > 0.5;
      ctx.shadowColor = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 16; ctx.shadowOffsetY = 2;
      for (const it of items) {
        ctx.fillStyle = tr.kind === 'serif' ? text : it.current ? hi : text;
        ctx.globalAlpha = it.spoken ? 1 : tr.dim;
        ctx.fillText(it.text, it.x, it.y + it.h * 0.78);
      }
    }
    ctx.restore();
  }

  /** The closing ask: its headline, the keyword on a chip that lands as it's said, the line under it and the brand. */
  function drawClosing(ctx, beat, s) {
    const p = beat.props || {};
    const tr = frame.captions;
    const word = String(p.keyword || '').toUpperCase().slice(0, 12);
    const said = s.words.find(w => String(w.text).replace(/[^\p{L}\p{N}]/gu, '').toUpperCase() === word);
    const land = said ? said.start - s.start - 0.1 : 0.35;
    const k = outBack(clamp01((s.t - land) / 0.35), 1.8);
    const cx = (CONTENT_ZONE.left + CONTENT_ZONE.right) / 2;
    const wrap = (text, font, maxW) => {
      ctx.font = font;
      const lines = [];
      let cur = '';
      for (const w of String(text).split(/\s+/).filter(Boolean)) {
        const next = cur ? `${cur} ${w}` : w;
        if (cur && ctx.measureText(next).width > maxW) { lines.push(cur); cur = w; } else cur = next;
      }
      if (cur) lines.push(cur);
      return lines.slice(0, 3);
    };
    ctx.save();
    // The closing sits on the style's wall, tinted toward its second accent (the scenes paint their own).
    ctx.fillStyle = mix(colors.wall, colors.rose, 0.45);
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = colors.ink;
    const head = wrap(String(beat.label || ''), captionFont(tr, 76, 900), 840);
    head.forEach((line, i) => ctx.fillText(line, cx, 560 + i * 88));
    if (word) {
      ctx.font = captionFont(tr, 150, 900);
      const w = Math.min(860, ctx.measureText(word).width + 120), h = 220;
      ctx.save();
      ctx.translate(cx, 860);
      ctx.rotate(-0.03);
      ctx.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k);
      ctx.globalAlpha *= clamp01(k * 2);
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      ctx.fillStyle = colors.accent;
      ctx.fill(tornChip(w, h, 4));
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = contrastRatio(colors.chalk, colors.accent) >= 3 ? colors.chalk : colors.cardInk;
      ctx.font = captionFont(tr, Math.min(150, 150 * (760 / Math.max(760, w))), 900);
      ctx.fillText(word, 0, 52);
      ctx.restore();
    }
    ctx.fillStyle = colors.ink;
    wrap(String(p.line || ''), captionFont(tr, 52, 600), 820).forEach((line, i) => ctx.fillText(line, cx, 1060 + i * 64));
    try { brandPixel(ctx, cx, 1198, 96); } catch {
      if (brandName) { ctx.font = captionFont(tr, 40, 700); ctx.globalAlpha = 0.7; ctx.fillText(brandName, cx, 1210); }
    }
    ctx.restore();
  }

  /** A beat this look has no design for (a fixed scene): its label, big, in the middle of the stage. */
  function drawLabel(ctx, beat) {
    const tr = frame.captions;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.ink;
    ctx.font = captionFont(tr, 96, 900);
    const text = String(beat.props?.title || beat.label || '');
    ctx.fillText(text, W / 2, (CONTENT_ZONE.top + CONTENT_ZONE.bottom) / 2, CONTENT_ZONE.right - CONTENT_ZONE.left);
    ctx.restore();
  }

  /**
   * A beat's code at identity on the whole frame, with the media it names (a video at the scene's time) and the
   * episode's logo marks; code that can't run shows its beat's label. The painter keeps words readable against the
   * wall (code/paint.mjs `backdrop`).
   */
  function drawCode(ctx, beat, s, marks) {
    ctx.save();
    try {
      const tree = runCodeScene(String(beat.props.source), { time: s.t, duration: s.dur, words: s.codeWords, voStart: s.voStart, voEnd: s.voEnd, colors, marks, stage: CANVAS_STAGE });
      const image = url => {
        const item = mediaItem(codeAssetId(url));
        return !item ? null : item.kind === 'video' && item.frameAt ? item.frameAt(s.t) : item.img;
      };
      paintCodeTree(ctx, tree, { Path2D, font: canvasFont, ink: colors.ink, backdrop: colors.wall, image });
    } catch {
      ctx.restore();
      ctx.save();
      drawLabel(ctx, beat);
    }
    ctx.restore();
  }

  return {
    colors,
    /** One frame at T seconds. `captions: false` leaves the captions out (the cover). */
    draw(ctx, episode, timing, T, frameNo = Math.round(T * FPS), { captions = true } = {}) {
      const { i, t } = beatAt(timing, T);
      const beat = episode.beats[i];
      const bt = timing.beats[i];
      const words = bt.words || [];
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.wall;
      ctx.fillRect(0, 0, W, H);
      if (isCoded(beat)) {
        const s = { t, dur: bt.end - bt.start, codeWords: words.map(w => ({ text: w.text, start: w.start - bt.start, end: w.end - bt.start })), voStart: (words[0]?.start ?? bt.start) - bt.start, voEnd: (words.at(-1)?.end ?? bt.end) - bt.start };
        drawCode(ctx, beat, s, episode.marks || null);
      } else if (beat.scene === 'cta') {
        drawClosing(ctx, beat, { t, start: bt.start, words });
      } else drawLabel(ctx, beat);
      if (frame.vignette) vignette(ctx);
      if (frame.grain) grain(ctx, frameNo);
      if (captions) drawCaptions(ctx, words, T);
      ctx.restore();
    },
  };
}
