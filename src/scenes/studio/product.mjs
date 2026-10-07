// "What it is" beat, in the site's card language: an app window carries the
// product's logo tile, name and tagline over the real thing — a source media
// item (props.media, image or video), else the product's screenshot, else an
// abstract mock of its UI as a last resort. Up to three feature chips (white
// pills with lucide icons) land under the window as they're said, and Kit
// walks in to point at each.
import { W, C, BAND } from '../../brand.mjs';
import { paper, card, roundRectPath, fitWrapped, fitSize, text, measure, pinkGradient } from '../../paper.mjs';
import { appWindow, icon } from '../../fx.mjs';
import { lucideIcon, hasIcon, ICON_ALIASES } from '../../icons.mjs';
import { logoTile, toolInfo } from '../../logos.mjs';
import { beatShotSrc, shotImage } from '../../shots.mjs';
import { drawCover, drawContain } from '../../mediastore.mjs';
import { clamp, lerp, ease, rng, rgba, luminance } from '../../util.mjs';

const WIN = { x: 90, y: 360, w: 900, bar: 56, pad: 30, maxBottom: 1072 };
const CHIP = { x: 96, gap: 26, step: 84, h: 68, maxW: 600 };
const KIT = { xMin: 720, xMax: 880, s: 0.88 };
const PANEL_R = 12;

// ---------------------------------------------------------------- text

// Shorten to fit maxW at the given type, ending in an ellipsis.
function ellipsize(ctx, str, weight, size, maxW) {
  if (measure(ctx, str, weight, size) <= maxW) return str;
  let s = str;
  while (s.length > 1 && measure(ctx, `${s}…`, weight, size) > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

// fitWrapped that never overflows: an over-long word or a dropped tail ends in "…".
function fitLines(ctx, str, weight, maxW, maxLines, maxSize, minSize) {
  const { size, lines } = fitWrapped(ctx, str, weight, maxW, maxLines, maxSize, minSize);
  return { size, lines: lines.map(l => ellipsize(ctx, l, weight, size, maxW)) };
}

const domainOf = (s = '') => { try { return new URL(s).hostname.replace(/^www\./, ''); } catch { return ''; } };

// ---------------------------------------------------------------- chips

function chipList(raw) {
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr
    .map(c => String(typeof c === 'object' && c ? c.text || c.label || '' : c ?? '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

// A lucide icon that fits the feature's wording; a check when nothing does.
const CHIP_ICONS = [
  [/\b(free|gift|no cost|\$0)\b/, 'Gift'],
  [/\b(4k|8k|hd|1080p|720p|480p|resolution|pixels?)\b/, 'Maximize2'],
  [/\b(video|clips?|film|motion|animate)\b/, 'Video'],
  [/\b(images?|photos?|pictures?|art)\b/, 'Image'],
  [/\b(fast|faster|speed|instant|seconds|quick)\b/, 'Zap'],
  [/\b(browser|web|online|chrome)\b/, 'Globe'],
  [/\b(phone|mobile|ios|android|app)\b/, 'Smartphone'],
  [/\b(laptop|desktop|mac|computer|lid)\b/, 'Laptop'],
  [/\b(offline|local)\b/, 'HardDrive'],
  [/\b(open source|code|api|sdk|cli|terminal)\b/, 'Code'],
  [/\b(faces?|characters?|consistent|people)\b/, 'ScanFace'],
  [/\b(styles?|brand|design|colors?)\b/, 'Palette'],
  [/\b(plugged|power|battery|charge|awake)\b/, 'Plug'],
  [/\b(team|share|collab\w*|multiplayer)\b/, 'Users'],
  [/\b(secure|private|privacy|enterprise)\b/, 'Lock'],
  [/\b(studio|edit\w*)\b/, 'WandSparkles'],
  [/\b(ai|agent|smart|auto\w*)\b/, 'Sparkles'],
  [/\b(stays|always|wifi|connected)\b/, 'Wifi'],
];
const chipIcon = str => CHIP_ICONS.find(([re]) => re.test(str.toLowerCase()))?.[1] || 'Check';

// When each chip lands: on the spoken word it names if the voice says it,
// otherwise spread across the narration. Always in order, ≥0.3s apart.
function chipTimes(s, chips) {
  const w = s.words;
  const vs = w.length ? w[0].start : s.voStart;
  const ve = w.length ? w[w.length - 1].end : s.voEnd;
  const lo = Math.max(0.8, vs + 0.4);
  const hi = Math.max(lo + 0.6, Math.min(ve, s.dur - 0.5));
  let prev = -Infinity;
  const times = chips.map((c, i) => {
    let at = lerp(lo, hi, ((i + 1) / (chips.length + 1)) * 0.9);
    const key = c.toLowerCase().split(/\s+/).map(x => x.replace(/[^\p{L}\p{N}]/gu, '')).sort((a, b) => b.length - a.length)[0];
    const said = key && key.length >= 3 ? s.wordTime(key) : null;
    if (said != null && said >= 0.3) at = said - 0.06;
    at = Math.max(clamp(at, 0.75, Math.max(0.75, s.dur - 0.45)), prev + 0.3);
    prev = at;
    return at;
  });
  // A very short beat still shows every chip: squeeze them in evenly.
  const limit = Math.max(0.6, s.dur - 0.3);
  return times.some(at => at > limit) ? times.map((at, i) => lerp(0.6, limit, (i + 1) / times.length)) : times;
}

function chipMetrics(ctx, str) {
  const maxText = CHIP.maxW - 108;
  const size = fitSize(ctx, str, 600, maxText, 38, 34);
  const label = ellipsize(ctx, str, 600, size, maxText);
  return { label, size, icon: chipIcon(str), w: measure(ctx, label, 600, size) + 108 };
}

// A site pill: white, hairline, soft shadow; the icon sits in a pearl disc.
function drawChip(ctx, { label, size, icon: name, w }, dark) {
  const h = CHIP.h;
  paper(ctx, c => roundRectPath(c, -w / 2, -h / 2, w, h, h / 2), { fill: dark ? C.panel : '#FFFFFF', lift: 1.2 });
  const dx = -w / 2 + 38;
  ctx.fillStyle = dark ? rgba(C.pink, 0.18) : C.rose;
  ctx.beginPath();
  ctx.arc(dx, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  lucideIcon(ctx, name, dx, 0, 26, { color: C.pink, stroke: 2.2 });
  text(ctx, label, -w / 2 + 76, 2, { weight: 600, size, color: dark ? C.chalk : C.ink, align: 'left' });
}

// ---------------------------------------------------------------- media

// The real thing in the window's content panel. Screenshots are cover-fitted
// from the top and scroll down a touch over the beat; video plays centred. An
// image whose shape is far from the panel's is letterboxed instead of cropped.
function drawShot(ctx, img, { x, y, w, h }, { t, dur, video }) {
  const ar = img.width / img.height, pr = w / h;
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(x, y, w, h);
  if (ar / pr > 1.7 || pr / ar > 1.7) {
    drawContain(ctx, img, x + 12, y + 12, w - 24, h - 24);
    return;
  }
  const u = ease.inOutQuad(clamp(t / Math.max(dur, 1)));
  drawCover(ctx, img, x, y, w, h, { zoom: 1.02 + 0.05 * u, py: video ? 0 : lerp(-1, -0.55, u) });
}

// ---------------------------------------------------------------- UI mock

// Arrow cursor with its tip at the origin: ink with a white outline.
function cursorPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 40);
  ctx.lineTo(10, 30);
  ctx.lineTo(18, 47);
  ctx.lineTo(26, 43);
  ctx.lineTo(18, 27);
  ctx.lineTo(31, 27);
  ctx.closePath();
}

function drawCursor(ctx, x, y, press, alpha) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(1 - press * 0.14, 1 - press * 0.14);
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(16,16,20,0.24)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5 - press * 3;
  cursorPath(ctx);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.restore();
}

// Abstract product UI, only when there is nothing real to show: sidebar, an
// input that gets typed into, an ink send button, and three result tiles.
// `m` is the mock's own clock.
function drawMock(ctx, s, { x, y, w, h }, m) {
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(x, y, w, h);
  if (m <= 0) return;
  const step = (m0, d = 0.3) => ease.outCubic(clamp((m - m0) / d));
  const pulse = (at, d = 0.16) => (m >= at && m < at + d ? Math.sin(((m - at) / d) * Math.PI) : 0);
  const fadeUp = (e, fn) => {
    if (e <= 0) return;
    ctx.save();
    ctx.globalAlpha *= e;
    ctx.translate(0, (1 - e) * 14);
    fn();
    ctx.restore();
  };
  const bar = (bx, by, bw, bh, fill) => { ctx.fillStyle = fill; ctx.beginPath(); roundRectPath(ctx, bx, by, bw, bh, bh / 2); ctx.fill(); };

  // Sidebar: one active row on a white tab.
  const side = w >= 560 ? 160 : 0;
  const sx = x + 18;
  if (side) {
    const rows = clamp(Math.floor((h - 24) / 54), 2, 4);
    const bars = [86, 64, 92, 58];
    for (let i = 0; i < rows; i++) {
      const ry = y + 18 + i * 54;
      fadeUp(step(0.08 + i * 0.06), () => {
        if (i === 0) card(ctx, sx, ry, side, 42, { r: 8, fill: '#FFFFFF', lift: 0.4 });
        ctx.fillStyle = i === 0 ? C.pink : rgba(C.ink, 0.16);
        ctx.beginPath();
        ctx.arc(sx + 24, ry + 21, 7, 0, Math.PI * 2);
        ctx.fill();
        bar(sx + 42, ry + 15, bars[i], 12, rgba(C.ink, i === 0 ? 0.55 : 0.18));
      });
    }
  }

  // Input with typed "words", caret and an ink send button.
  const mx0 = sx + side + (side ? 18 : 0), mx1 = x + w - 18, mw = mx1 - mx0;
  const iy = y + 18, ih = 60;
  const bx = mx1 - 34, by = iy + ih / 2;
  const sendAt = 1.45;
  fadeUp(step(0.12), () => {
    card(ctx, mx0, iy, mw, ih, { r: 12, fill: '#FFFFFF', lift: 0.5, stroke: m > 0.58 && m < sendAt + 0.2 ? rgba(C.ink, 0.35) : null, strokeWidth: 2 });
    const r = rng('product-type');
    const words = [];
    let wx = mx0 + 26;
    while (words.length < 8) {
      const ww = 34 + r() * 72;
      if (wx + ww > bx - 52) break;
      words.push({ x: wx, w: ww });
      wx += ww + 12;
    }
    const n = m < 0.62 ? 0 : clamp(Math.floor((m - 0.62) / 0.085) + 1, 0, words.length);
    for (let i = 0; i < n; i++) bar(words[i].x, by - 6, words[i].w, 12, rgba(C.ink, 0.5));
    const typing = n > 0 && n < words.length;
    if (m > 0.58 && (typing || Math.floor(s.t * 2.5) % 2 === 0)) {
      const cx = n ? words[n - 1].x + words[n - 1].w + 6 : mx0 + 26;
      ctx.fillStyle = C.pink;
      ctx.fillRect(cx, by - 15, 3, 30);
    }
    const press = pulse(sendAt);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(1 - press * 0.14, 1 - press * 0.14);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    roundRectPath(ctx, -22, -22, 44, 44, 10);
    ctx.fill();
    lucideIcon(ctx, 'ArrowUp', 0, 0, 24, { color: '#FFFFFF', stroke: 2.4 });
    ctx.restore();
  });

  // Result tiles: dashed placeholders until send, then they rise in.
  const ty = iy + ih + 16, th = y + h - 18 - ty;
  const gap = 16, tw = (mw - gap * 2) / 3;
  const tilesAt = sendAt + 0.1;
  const hoverAt = 2.05;
  if (th >= 56) {
    for (let i = 0; i < 3; i++) {
      const tx = mx0 + i * (tw + gap);
      const pop = step(tilesAt + i * 0.12, 0.32);
      if (pop < 1) {
        ctx.save();
        ctx.globalAlpha *= clamp((m - 0.2 - i * 0.05) / 0.2) * (1 - pop);
        ctx.strokeStyle = rgba(C.ink, 0.16);
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        roundRectPath(ctx, tx, ty, tw, th, 10);
        ctx.stroke();
        ctx.restore();
      }
      const hover = i === 1 ? clamp((m - hoverAt + 0.1) / 0.15) : 0;
      fadeUp(pop, () => {
        ctx.translate(0, -hover * 6);
        drawTile(ctx, i, tx, ty, tw, th, m - (tilesAt + i * 0.12), hover);
      });
    }
  }

  // Cursor: drifts in, clicks the input, waits out the typing, hits send,
  // then settles over the middle result and idles there.
  const keys = [
    { m: 0.3, x: x + w - 60, y: y + h - 40 },
    { m: 0.55, x: mx0 + 120, y: by + 8 },
    { m: 0.75, x: mx0 + 120, y: by + 8 },
    { m: 1.05, x: mx0 + mw * 0.55, y: iy + ih + 34 },
    { m: 1.38, x: bx + 4, y: by + 6 },
    { m: 1.75, x: bx + 4, y: by + 6 },
    { m: hoverAt, x: mx0 + tw * 1.5 + gap, y: ty + Math.max(30, th * 0.55) },
  ];
  if (m >= keys[0].m) {
    let k = 0;
    while (k < keys.length - 1 && m >= keys[k + 1].m) k++;
    let cx, cy;
    if (k === keys.length - 1) {
      cx = keys[k].x + Math.sin((m - hoverAt) * 1.6) * 18;
      cy = keys[k].y + Math.sin((m - hoverAt) * 2.3) * 8;
    } else {
      const a = keys[k], b = keys[k + 1];
      const p = ease.inOutCubic(clamp((m - a.m) / (b.m - a.m)));
      cx = lerp(a.x, b.x, p);
      cy = lerp(a.y, b.y, p);
    }
    for (const at of [0.58, sendAt]) {
      const rp = clamp((m - at) / 0.3);
      if (rp > 0 && rp < 1) {
        ctx.save();
        ctx.strokeStyle = rgba(C.ink, 0.5 * (1 - rp));
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 10 + rp * 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    drawCursor(ctx, cx, cy, Math.max(pulse(0.58), pulse(sendAt)), clamp((m - keys[0].m) / 0.12));
  }
}

// One result tile: an image, a doc, or a little bar chart.
function drawTile(ctx, i, x, y, w, h, age, hover) {
  card(ctx, x, y, w, h, { r: 10, fill: i === 0 ? C.rose : '#FFFFFF', lift: 0.5 + hover * 1.2 });
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.clip();
  const pad = Math.min(20, w * 0.12);
  if (i === 0) {
    lucideIcon(ctx, 'Image', x + w / 2, y + h / 2, Math.min(w, h) * 0.42, { color: C.pink, stroke: 1.8 });
  } else if (i === 1) {
    const lh = Math.min(24, (h - pad * 2) / 4);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    roundRectPath(ctx, x + pad, y + pad, w * 0.42, Math.min(12, lh * 0.55), 6);
    ctx.fill();
    ctx.fillStyle = rgba(C.ink, 0.16);
    [0.82, 0.64, 0.74].forEach((f, k) => {
      const ly = y + pad + lh * (k + 1.2);
      if (ly + 10 > y + h - pad * 0.6) return;
      ctx.beginPath();
      roundRectPath(ctx, x + pad, ly, (w - pad * 2) * f, Math.min(10, lh * 0.42), 5);
      ctx.fill();
    });
  } else {
    // Chart: bars grow in after the tile lands; the last one is the accent.
    const grow = ease.outCubic(clamp(age / 0.45));
    const hs = [0.36, 0.58, 0.46, 0.82];
    const bw = (w - pad * 2) / (hs.length * 1.6);
    hs.forEach((f, k) => {
      const bh = (h - pad * 2) * f * grow;
      const bx = x + pad + k * bw * 1.6 + bw * 0.3;
      ctx.fillStyle = k === hs.length - 1 ? pinkGradient(ctx, bx, y + h - pad - bh, bx + bw, y + h - pad) : rgba(C.ink, 0.72);
      ctx.beginPath();
      roundRectPath(ctx, bx, y + h - pad - bh, bw, bh, Math.min(4, bw / 2));
      ctx.fill();
    });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- scene

export default {
  type: 'product',
  describe: 'What the product is. A clean app window shows the product logo, name and tagline over the real product (a source media item, else its screenshot); up to 3 feature chips land below as they are said, and Kit points at each.',
  props: {
    name: 'string ≤ 24 chars — the product name, e.g. "Nano Banana 2.1"',
    tagline: 'string ≤ 60 chars — what it does in one line, e.g. "Edits photos from a single sentence"',
    chips: 'string[] up to 3, each ≤ 18 chars — key features, e.g. ["Free in Gemini", "4K output"]',
    media: 'optional media id (image or video) of the real product UI/output, shown inside the window — prefer this whenever the sources have one',
    toolId: 'optional data.ts tool id for the logo tile (defaults to the episode tool)',
    icon: 'optional icon name for the tile when there is no tool logo: check bolt image phone cursor sparkle chat code play star layers globe heart lock bell',
  },
  draw(s) {
    const { ctx, t, props, episode } = s;
    const name = String(props.name || episode.subject?.name || s.beat.label || 'New tool').trim();
    const tagline = String(props.tagline || '').trim();
    const chips = chipList(props.chips);
    const times = chipTimes(s, chips);
    const dark = luminance(s.set.wall) < 0.1;

    // ------------------------------------------------ what to show
    // A source media item first, then the product's screenshot; the abstract
    // mock only when neither exists.
    const mediaId = Array.isArray(props.media) ? props.media[0] : props.media;
    const item = s.media(mediaId);
    const revealAt = 0.5;
    const shot = item ? s.mediaFrame(mediaId, revealAt) : shotImage(beatShotSrc(s.beat, episode));
    const toolId = props.toolId || props.logo || episode.source?.toolId || null;
    const tool = toolInfo(toolId);
    const iconName = props.icon && (ICON_ALIASES[props.icon] || hasIcon(props.icon)) ? props.icon : 'sparkle';
    const domain = domainOf(item?.page || item?.url || '') || tool?.displayDomain || domainOf(tool?.url || '') || '';

    // ------------------------------------------------ layout
    // Header row (logo tile, then name over tagline), then the content panel
    // down to the window's bottom; the chips hang under the window.
    const cx0 = WIN.x + WIN.pad, cx1 = WIN.x + WIN.w - WIN.pad;
    const tile = 104;
    const rowTop = WIN.y + WIN.bar + 28;
    const textX = cx0 + tile + 26, textW = cx1 - textX;
    const one = fitSize(ctx, name, 'd600', textW, 74, 56);
    const nm = measure(ctx, name, 'd600', one) <= textW ? { size: one, lines: [name] } : fitLines(ctx, name, 'd600', textW, 2, 62, 46);
    const nlh = nm.size * 1.04;
    const tg = tagline ? fitLines(ctx, tagline, 500, textW, 2, 36, 34) : null;
    const tlh = tg ? tg.size * 1.28 : 0;
    const textH = nm.lines.length * nlh + (tg ? 8 + tg.lines.length * tlh : 0);
    const rowH = Math.max(tile, textH);
    const textTop = rowTop + (rowH - textH) / 2;
    const chipsH = chips.length ? chips.length * CHIP.step - (CHIP.step - CHIP.h) : 0;
    const winBottom = Math.min(WIN.maxBottom, BAND.floorY + 12 - chipsH - CHIP.gap);
    const panel = { x: cx0, y: rowTop + rowH + 26, w: cx1 - cx0, h: winBottom - WIN.pad - (rowTop + rowH + 26) };
    const winH = winBottom - WIN.y;

    // ------------------------------------------------ window
    const we = s.spring(0.02, { freq: 1.5, damp: 0.62 });
    ctx.save();
    ctx.globalAlpha *= clamp(we * 2.5);
    ctx.translate(0, (1 - we) * 120);

    const gy = panel.y + panel.h / 2;
    const glow = ctx.createRadialGradient(W / 2, gy, 20, W / 2, gy, 620);
    glow.addColorStop(0, 'rgba(255,43,136,0.16)');
    glow.addColorStop(1, 'rgba(255,43,136,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(W / 2 - 620, gy - 620, 1240, 1240);

    appWindow(ctx, WIN.x, WIN.y, WIN.w, winH, { fill: '#FFFFFF', bar: '#F5F5F5', lift: 2.6, r: 18 });
    ctx.fillStyle = C.line;
    ctx.fillRect(WIN.x, WIN.y + WIN.bar + 1, WIN.w, 1.5);
    // Address pill in the title bar.
    if (domain) {
      const ay = WIN.y + WIN.bar / 2 + 0.5;
      const pw = Math.min(460, measure(ctx, domain, 500, 22) + 70);
      paper(ctx, c => roundRectPath(c, W / 2 - pw / 2, ay - 17, pw, 34, 8), { fill: '#FFFFFF', lift: 0 });
      lucideIcon(ctx, 'Lock', W / 2 - pw / 2 + 24, ay, 16, { color: C.mute, stroke: 2.2 });
      text(ctx, ellipsize(ctx, domain, 500, 22, pw - 62), W / 2 - pw / 2 + 42, ay + 1, { weight: 500, size: 22, color: C.mute, align: 'left' });
    }

    // Logo tile pops in; the product's own logo when it has one.
    const ie = s.enter(0.2, 0.42);
    if (ie > 0) {
      const tcx = cx0 + tile / 2, tcy = rowTop + rowH / 2;
      ctx.save();
      ctx.translate(tcx, tcy);
      ctx.scale(ie, ie);
      if (tool) logoTile(ctx, 0, 0, tile, { toolId });
      else {
        paper(ctx, c => roundRectPath(c, -tile / 2, -tile / 2, tile, tile, tile * 0.24), { fill: pinkGradient(ctx, -tile / 2, -tile / 2, tile / 2, tile / 2), lift: 1, border: false });
        icon(ctx, iconName, 0, 0, 56, '#FFFFFF');
      }
      ctx.restore();
    }

    // Name lines rise out of a slot, a beat apart; the tagline fades up.
    nm.lines.forEach((l, i) => {
      const e = ease.outCubic(clamp((t - 0.28 - i * 0.08) / 0.42));
      if (e <= 0) return;
      const ly = textTop + nlh * (i + 0.5);
      ctx.save();
      ctx.beginPath();
      ctx.rect(textX - 10, ly - nlh * 0.62, textW + 20, nlh * 1.24);
      ctx.clip();
      text(ctx, l, textX, ly + (1 - e) * nlh * 0.8 + 3, { weight: 'd600', size: nm.size, color: C.ink, align: 'left' });
      ctx.restore();
    });
    if (tg) {
      const te = ease.outCubic(clamp((t - 0.45) / 0.4));
      const top = textTop + nm.lines.length * nlh + 8;
      ctx.save();
      ctx.globalAlpha *= te;
      tg.lines.forEach((l, i) => text(ctx, l, textX, top + tlh * (i + 0.5) + (1 - te) * 12, { weight: 500, size: tg.size, color: C.mute, align: 'left' }));
      ctx.restore();
    }

    // Content panel: the real thing, or the mock on its own clock.
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, panel.x, panel.y, panel.w, panel.h, PANEL_R);
    ctx.clip();
    if (shot) {
      const pe = ease.outCubic(clamp((t - revealAt + 0.15) / 0.45));
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.globalAlpha *= pe;
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.scale(1.04 - 0.04 * pe, 1.04 - 0.04 * pe);
      ctx.translate(-(panel.x + panel.w / 2), -(panel.y + panel.h / 2));
      drawShot(ctx, shot, panel, { t, dur: s.dur, video: item?.kind === 'video' });
    } else {
      const pace = clamp((s.dur * 0.6 - 0.55) / 1.9, 0.45, 1.0);
      drawMock(ctx, s, panel, (t - 0.55) / pace);
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, panel.x + 0.75, panel.y + 0.75, panel.w - 1.5, panel.h - 1.5, PANEL_R);
    ctx.strokeStyle = 'rgba(16,16,20,0.10)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    // Video items get a small play badge so it reads as footage, not a still.
    if (item?.kind === 'video' && t > revealAt) {
      const bx = panel.x + 26, by = panel.y + panel.h - 26;
      const be = ease.outCubic(clamp((t - revealAt - 0.2) / 0.3));
      ctx.save();
      ctx.globalAlpha *= be;
      paper(ctx, c => roundRectPath(c, bx - 6, by - 42, 104, 44, 22), { fill: rgba(C.ink, 0.78), lift: 0, border: false });
      lucideIcon(ctx, 'Play', bx + 18, by - 20, 20, { color: '#FFFFFF', fill: '#FFFFFF', stroke: 2 });
      text(ctx, 'Live', bx + 34, by - 19, { weight: 600, size: 24, color: '#FFFFFF', align: 'left' });
      ctx.restore();
    }
    ctx.restore();

    // ------------------------------------------------ chips
    const metrics = chips.map(c => chipMetrics(ctx, c));
    const room = BAND.floorY + 20 - (winBottom + CHIP.gap);
    const chipY = winBottom + CHIP.gap + Math.max(0, (room - chipsH) / 2) + CHIP.h / 2;
    const chipPts = metrics.map((mt, i) => ({ x: CHIP.x + mt.w + 24, y: chipY + i * CHIP.step }));
    chips.forEach((c, i) => {
      const mt = metrics[i];
      const e = ease.outCubic(clamp((t - times[i]) / 0.34));
      if (e <= 0) return;
      const pop = s.enter(times[i], 0.34);
      ctx.save();
      ctx.globalAlpha *= clamp(e * 2);
      ctx.translate(CHIP.x + mt.w / 2 - (1 - e) * 40, chipPts[i].y);
      ctx.scale(0.9 + 0.1 * Math.min(pop, 1.04), 0.9 + 0.1 * Math.min(pop, 1.04));
      drawChip(ctx, mt, dark);
      ctx.restore();
    });

    // ------------------------------------------------ Kit
    // Kit walks in from the right to stand clear of the widest chip, then
    // points: first at the window, then at each chip as it lands, with a
    // little hop of delight.
    const km = s.beat.mascot || {};
    const arrive = s.spring(0.1, { freq: 1.4, damp: 0.6 });
    const home = chipPts.length ? clamp(Math.max(...chipPts.map(p => p.x)) + 210, KIT.xMin, KIT.xMax) : W / 2 + 200;
    const kx = home + (1 - arrive) * 380;
    const ky = BAND.floorY + 56;
    // Kit faces left (flipped), so world direction (dx, dy) is local angle
    // atan2(dy, -dx), measured from the pointing shoulder (mascot.mjs proportions).
    const aim = (px, py) => clamp(Math.atan2(py - (ky - 128 * KIT.s), -(px - (kx - 99 * KIT.s))), -1.35, 0.35);
    const aims = [{ at: 0, a: aim(560, winBottom - 60) }, ...chipPts.map((p, i) => ({ at: times[i], a: aim(p.x, p.y) }))];
    let k = 0;
    for (let i = 1; i < aims.length; i++) if (t >= aims[i].at) k = i;
    const turn = k === 0 ? 1 : ease.outBack(clamp((t - aims[k].at) / 0.24), 1.4);
    const pointAngle = lerp(aims[Math.max(0, k - 1)].a, aims[k].a, turn) + Math.sin(t * 3.2) * 0.04;
    const since = k > 0 ? t - aims[k].at : 1;
    const hop = since >= 0 && since < 0.3 ? Math.sin((since / 0.3) * Math.PI) * 12 : 0;
    const walking = (1 - arrive) * 380 > 8;
    s.kit({
      x: kx, y: ky - hop, s: KIT.s, flip: true, look: 0.4, pointAngle,
      pose: walking ? 'walk' : km.pose || 'point',
      face: km.face || (t < 0.7 ? 'wow' : since < 0.4 ? 'happy' : 'smile'),
    });
  },
};
