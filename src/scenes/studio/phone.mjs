// Phone beat: a clean device (ink bezel, dynamic island) rises in beside Kit.
// The screen is an iOS-style app — header, large title and an inset grouped
// list whose rows land one by one with live status chips (a spinning pink
// ring, an ink check, a grey clock) — or, when props.media is set, the real
// vertical screenshot / screen recording from the sources. An optional iOS
// notification banner drops in from the top while the phone buzzes.
import { C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, fitWrapped, fitSize, text, measure, pinkGradient } from '../../paper.mjs';
import { lucideIcon } from '../../icons.mjs';
import { logoTile, toolInfo } from '../../logos.mjs';
import { drawCover, drawContain } from '../../mediastore.mjs';
import { clamp, lerp, ease, spring, rgba } from '../../util.mjs';

const STATUSES = ['running', 'done', 'waiting'];

const PW = 560, PH = 1030, PX = 392, PY = BAND.floorY + 40 - PH; // phone body
const BEZ = 16, R = 64;
const SX = PX + BEZ, SY = PY + BEZ, SW = PW - BEZ * 2, SH = PH - BEZ * 2, SR = R - BEZ; // screen
const SCREEN = '#F2F2F7';                                        // iOS grouped background
const LIST_X = SX + 16, LIST_W = SW - 32;
const ROW_PAD = 22, CHIP = 52, ROW_TEXT_X = LIST_X + ROW_PAD + CHIP + 20, ROW_TEXT_W = LIST_X + LIST_W - ROW_PAD - ROW_TEXT_X;
const KX = 196, KS = 0.88, KY = BAND.floorY + 58;                // Kit, left of the phone

const STOP = new Set(['with', 'your', 'that', 'this', 'from', 'into', 'them', 'they', 'what', 'when', 'will', 'have', 'just', 'more', 'then', 'than', 'been', 'were', 'about', 'while']);

// Draw `fn` scaled/rotated about (cx, cy), keeping absolute coordinates.
function pivot(ctx, cx, cy, { scale = 1, rot = 0, alpha = 1, dx = 0, dy = 0 } = {}, fn) {
  ctx.save();
  ctx.translate(cx + dx, cy + dy);
  if (rot) ctx.rotate(rot);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  fn();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

// Normalise props so a sloppy script still renders: 2–4 rows, known statuses.
function readRows(raw) {
  let rows = Array.isArray(raw) ? raw : [];
  rows = rows
    .map(r => (typeof r === 'string' ? { text: r, status: 'done' } : r && typeof r === 'object' ? r : null))
    .filter(r => r && String(r.text || '').trim())
    .slice(0, 4)
    .map(r => ({ text: String(r.text).trim(), status: STATUSES.includes(r.status) ? r.status : 'done' }));
  if (rows.length === 0) rows = [{ text: 'Reading the brief', status: 'done' }, { text: 'Working on it', status: 'running' }];
  return rows;
}

// One line that shrinks to fit, then ends in an ellipsis if it still won't.
function fitOne(ctx, str, weight, maxW, maxSize, minSize) {
  const size = fitSize(ctx, str, weight, maxW, maxSize, minSize);
  let out = str;
  while (out.length > 1 && measure(ctx, out === str ? out : `${out}…`, weight, size) > maxW) out = out.slice(0, -1).trimEnd();
  return { size, str: out === str ? out : `${out}…` };
}

// Local time the first meaningful word of `str` is spoken, else null.
function spokenAt(s, str) {
  for (const w of String(str).toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 4 || STOP.has(w)) continue;
    const tt = s.wordTime(w);
    if (tt !== null) return tt;
  }
  return null;
}

// Rows land when their own words are spoken (if that's close to an even
// spread across the first half of the line), always in order; the
// notification follows the last row.
function timeline(s, rows, note) {
  const vs = s.words.length ? s.words[0].start : s.voStart;
  const ve = s.words.length ? s.words[s.words.length - 1].end : s.voEnd;
  const n = rows.length;
  const first = 0.8;
  const last = Math.max(first + 0.28 * (n - 1), Math.min(lerp(vs, ve, 0.46), s.dur - 1.4));
  const rowAt = [];
  rows.forEach((r, i) => {
    const even = n === 1 ? first : lerp(first, last, i / (n - 1));
    const spoken = spokenAt(s, r.text);
    const at = spoken !== null && Math.abs(spoken - 0.1 - even) < 1.4 ? spoken - 0.1 : even;
    rowAt.push(Math.max(i ? rowAt[i - 1] + 0.22 : first, at));
  });
  let notifAt = Infinity;
  if (note) {
    const after = n ? rowAt[n - 1] : 0.9;
    const spoken = spokenAt(s, note);
    const want = spoken !== null ? spoken - 0.15 : lerp(vs, ve, 0.6);
    notifAt = Math.min(Math.max(after + 0.5, want), Math.max(after + 0.35, s.dur - 1.0));
  }
  return { rowAt, notifAt };
}

// Fit the title and rows into the screen, shrinking type until they fit.
// Drops the composer when four long rows need the room.
function layout(ctx, title, rows) {
  const titleTop = SY + 158;
  for (const step of [0, 1, 2, 3, 4]) {
    const t = title ? fitWrapped(ctx, title, 'd600', SW - 56, 2, 60 - step * 4, 40) : { size: 0, lines: [] };
    const titleLh = t.size * 1.06;
    const listTop = titleTop + (title ? t.lines.length * titleLh + 26 : 0);
    const fits = rows.map(r => {
      const f = fitWrapped(ctx, r.text, 600, ROW_TEXT_W, 2, 40 - step * 2, 32);
      const lh = f.size * 1.16;
      const h = Math.max(124 - step * 8, f.lines.length * lh + 48 + (r.status === 'running' ? 18 : 0));
      return { ...f, lh, h, status: r.status };
    });
    const total = fits.reduce((n, f) => n + f.h, 0);
    const bottom = listTop + total;
    const composer = bottom <= SY + SH - 140;
    if (composer || bottom <= SY + SH - 50 || step === 4) {
      let y = listTop;
      const placed = fits.map(f => { const r = { ...f, y }; y += f.h; return r; });
      return { title: { ...t, lh: titleLh, top: titleTop }, rows: placed, listTop, listBottom: y, composer };
    }
  }
}

// ---------------------------------------------------------------- pieces

// The app's icon: the product's own logo tile when the app is a known tool,
// else a monogram on the topic accent.
function appIcon(ctx, cx, cy, size, app, toolId, accent) {
  if (toolId) return logoTile(ctx, cx, cy, size, { toolId, shadow: false });
  ctx.fillStyle = accent;
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.24);
  const initial = (String(app).match(/[\p{L}\p{N}]/u) || ['A'])[0].toUpperCase();
  text(ctx, initial, cx, cy + 2, { weight: 'd600', size: size * 0.54, color: '#FFFFFF' });
}

function statusChip(ctx, status, x, y, t) {
  const r = CHIP / 2;
  if (status === 'running') {
    ctx.fillStyle = C.rose;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = pinkGradient(ctx, x - r, y - r, x + r, y + r);
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const a = t * 5.5;
    ctx.arc(x, y, r * 0.5, a, a + Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();
  } else if (status === 'done') {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    lucideIcon(ctx, 'Check', x, y, 28, { color: '#FFFFFF', stroke: 2.8 });
  } else {
    ctx.fillStyle = '#E9E9EF';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    lucideIcon(ctx, 'Clock', x, y, 28, { color: C.mute, stroke: 2.2 });
  }
}

function row(s, r, i, at, sep) {
  const { ctx, t } = s;
  const e = ease.outCubic(clamp((t - at) / 0.4));
  if (e <= 0) return;
  const y = r.y, h = r.h, cy = y + h / 2;
  const running = r.status === 'running';
  pivot(ctx, LIST_X + LIST_W / 2, cy, { alpha: e, dx: (1 - e) * 60 }, () => {
    // Hairline separator once the next row is in, inset past the chip.
    if (sep) {
      ctx.fillStyle = 'rgba(16,16,20,0.10)';
      ctx.fillRect(ROW_TEXT_X, y + h - 1, LIST_X + LIST_W - ROW_TEXT_X, 1.5);
    }
    const ty = cy - (running ? 9 : 0) - ((r.lines.length - 1) * r.lh) / 2 + 2;
    r.lines.forEach((l, k) => text(ctx, l, ROW_TEXT_X, ty + k * r.lh, {
      weight: 600, size: r.size, color: r.status === 'waiting' ? C.mute : C.ink, align: 'left',
    }));
    // The chip pops a beat after its row lands.
    const ce = s.enter(at + 0.12, 0.3);
    if (ce > 0) pivot(ctx, LIST_X + ROW_PAD + CHIP / 2, cy, { scale: ce }, () => statusChip(ctx, r.status, LIST_X + ROW_PAD + CHIP / 2, cy, t));
    if (running) {
      // Indeterminate progress: a pink segment sliding along a pearl track.
      const tx = ROW_TEXT_X, tw = ROW_TEXT_W, tyy = ty + (r.lines.length - 1) * r.lh + r.size * 0.5 + 14;
      ctx.fillStyle = '#F1F1F5';
      roundRect(ctx, tx, tyy, tw, 6, 3);
      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, tx, tyy, tw, 6, 3);
      ctx.clip();
      const u = ((t * 0.6 + i * 0.37) % 1.4) - 0.4;
      ctx.fillStyle = pinkGradient(ctx, tx, 0, tx + tw, 0);
      roundRect(ctx, tx + u * tw, tyy, tw * 0.38, 6, 3);
      ctx.restore();
    }
  });
}

function header(s, app, toolId) {
  const { ctx, t } = s;
  const e = ease.outCubic(clamp((t - 0.4) / 0.35));
  if (e <= 0) return;
  const cy = SY + 106;
  pivot(ctx, SX + SW / 2, cy, { alpha: e, dy: (1 - e) * -16 }, () => {
    appIcon(ctx, SX + 28 + 26, cy, 52, app, toolId, s.accent);
    const name = fitOne(ctx, app, 600, SW - 56 - 52 - 16 - 70, 34, 28);
    text(ctx, name.str, SX + 28 + 52 + 16, cy + 2, { weight: 600, size: name.size, color: C.ink, align: 'left' });
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(SX + SW - 52, cy, 26, 0, Math.PI * 2);
    ctx.fill();
    lucideIcon(ctx, 'Ellipsis', SX + SW - 52, cy, 26, { color: C.ink, stroke: 2.4 });
  });
}

function statusBar(ctx, { dark = false, island = true } = {}) {
  const ink = dark ? '#FFFFFF' : C.ink;
  text(ctx, '9:41', SX + 64, SY + 40, { weight: 600, size: 26, color: ink });
  ctx.fillStyle = ink;
  // Signal bars, then the battery.
  for (let i = 0; i < 4; i++) roundRect(ctx, SX + SW - 138 + i * 9, SY + 47 - (7 + i * 4), 6, 7 + i * 4, 1.5);
  ctx.save();
  ctx.strokeStyle = rgba(ink, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRectPath(ctx, SX + SW - 92, SY + 29, 40, 20, 5);
  ctx.stroke();
  ctx.restore();
  roundRect(ctx, SX + SW - 89, SY + 32, 30, 14, 3);
  ctx.fillStyle = rgba(ink, 0.45);
  roundRect(ctx, SX + SW - 50, SY + 35, 3, 8, 1.5);
  if (island) drawIsland(ctx);
}

const drawIsland = ctx => { ctx.fillStyle = '#000000'; roundRect(ctx, SX + SW / 2 - 70, SY + 18, 140, 40, 20); };

function composer(s) {
  const { ctx, t } = s;
  const e = ease.outCubic(clamp((t - 0.7) / 0.35));
  if (e <= 0) return;
  const h = 68, y = SY + SH - 44 - h, x = SX + 16, w = SW - 32;
  pivot(ctx, x + w / 2, y + h / 2, { alpha: e, dy: (1 - e) * 20 }, () => {
    paper(ctx, c => roundRectPath(c, x, y, w, h, h / 2), { fill: '#FFFFFF', lift: 0.6 });
    text(ctx, 'Message…', x + 30, y + h / 2 + 1, { weight: 500, size: 30, color: rgba(C.mute, 0.8), align: 'left' });
    const bx = x + w - h / 2, by = y + h / 2;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(bx, by, 24, 0, Math.PI * 2);
    ctx.fill();
    lucideIcon(ctx, 'ArrowUp', bx, by, 26, { color: '#FFFFFF', stroke: 2.6 });
  });
}

// iOS notification banner: a frosted white card with the app icon, the app
// name and "now", and the message; it drops in from above the screen.
function banner(s, app, toolId, note, at) {
  const { ctx, t } = s;
  if (t < at) return;
  const bx = SX + 12, bw = SW - 24, textX = bx + 104;
  const { size, lines } = fitWrapped(ctx, note, 600, bw - 104 - 26, 2, 34, 30);
  const lh = size * 1.2;
  const bh = 66 + lines.length * lh + 14;
  const rest = SY + 64, hidden = SY - bh - 40;
  const by = lerp(hidden, rest, spring(t - at, { freq: 1.9, damp: 0.5 }));
  paper(ctx, c => roundRectPath(c, bx, by, bw, bh, 34), {
    fill: '#FFFFFF', lift: 2.6, shadowColor: 'rgba(16,16,20,0.22)',
  });
  appIcon(ctx, bx + 22 + 30, by + bh / 2, 60, app, toolId, s.accent);
  const name = fitOne(ctx, app.toUpperCase(), 600, bw - 104 - 150, 24, 22);
  text(ctx, name.str, textX, by + 38, { weight: 600, size: name.size, color: rgba(C.ink, 0.55), align: 'left', tracking: 1 });
  text(ctx, 'now', bx + bw - 26, by + 38, { weight: 500, size: 24, color: rgba(C.ink, 0.45), align: 'right' });
  lines.forEach((l, k) => text(ctx, l, textX, by + 66 + lh / 2 - 2 + k * lh, { weight: 600, size, color: C.ink, align: 'left' }));
}

// The real screen from the sources. A vertical capture fills the screen
// (top-aligned, slow scroll; video centred); a landscape one plays
// letterboxed on black, the way a phone shows it.
function screenMedia(ctx, img, { t, dur, video }) {
  const ar = img.width / img.height;
  if (ar > 0.85) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(SX, SY, SW, SH);
    drawContain(ctx, img, SX, SY + 80, SW, SH - 160);
    return true;
  }
  const u = ease.inOutQuad(clamp(t / Math.max(dur, 1)));
  drawCover(ctx, img, SX, SY, SW, SH, { zoom: 1.0 + 0.03 * u, py: video ? 0 : lerp(-1, -0.6, u) });
  return false;
}

// ---------------------------------------------------------------- phone

function phone(s, props, L, tl, media) {
  const { ctx, t } = s;
  const rp = s.spring(0.02, { freq: 1.5, damp: 0.62 });
  if (rp <= 0) return;

  // Buzz when the notification lands.
  const bz = t >= tl.notifAt ? clamp((t - tl.notifAt) / 0.45) : 1;
  const buzz = bz < 1 ? Math.sin(t * 90) * 0.01 * (1 - bz) : 0;
  const float = Math.sin(t * 1.3) * 4;

  pivot(ctx, PX + PW / 2, PY + PH / 2, { rot: buzz, alpha: clamp(rp * 2.5), dy: (1 - rp) * 220 + float }, () => {
    // Side buttons peek out from behind the body.
    ctx.fillStyle = '#26262E';
    roundRect(ctx, PX - 5, PY + 200, 10, 60, 4);
    roundRect(ctx, PX - 5, PY + 290, 10, 100, 4);
    roundRect(ctx, PX + PW - 5, PY + 260, 10, 130, 4);

    paper(ctx, c => roundRectPath(c, PX, PY, PW, PH, R), { fill: C.ink, lift: 3, shadowColor: 'rgba(16,16,20,0.30)' });
    // A thin lit rim around the bezel.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRectPath(ctx, PX + 3, PY + 3, PW - 6, PH - 6, R - 3);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, SX, SY, SW, SH, SR);
    ctx.clip();
    ctx.fillStyle = SCREEN;
    ctx.fillRect(SX, SY, SW, SH);
    if (media) {
      const me = ease.outCubic(clamp((t - 0.35) / 0.4));
      ctx.save();
      ctx.globalAlpha *= me;
      const letterbox = screenMedia(ctx, media.img, { t, dur: s.dur, video: media.video });
      ctx.restore();
      if (letterbox) statusBar(ctx, { dark: true, island: false });
    } else {
      statusBar(ctx, { island: false });
      header(s, props.app, props.toolId);
      const te = ease.outCubic(clamp((t - 0.5) / 0.4));
      if (te > 0 && L.title.lines.length) {
        const { size, lines, lh, top } = L.title;
        pivot(ctx, SX + 28, top + lh / 2, { alpha: te, dy: (1 - te) * 18 }, () => {
          lines.forEach((l, k) => text(ctx, l, SX + 28, top + lh / 2 + k * lh, { weight: 'd600', size, color: C.ink, align: 'left' }));
        });
      }
      // Inset grouped list: one white rounded panel that grows as rows land.
      const shown = tl.rowAt.filter(a => t >= a).length;
      if (shown > 0) {
        const lastRow = L.rows[shown - 1];
        const grow = ease.outCubic(clamp((t - tl.rowAt[shown - 1]) / 0.35));
        const prevBottom = shown > 1 ? L.rows[shown - 2].y + L.rows[shown - 2].h : L.listTop + 40;
        const bottom = lerp(prevBottom, lastRow.y + lastRow.h, grow);
        ctx.save();
        ctx.globalAlpha *= ease.outCubic(clamp((t - tl.rowAt[0]) / 0.3));
        paper(ctx, c => roundRectPath(c, LIST_X, L.listTop, LIST_W, bottom - L.listTop, 22), { fill: '#FFFFFF', lift: 0.3, border: false });
        ctx.restore();
      }
      L.rows.forEach((r, i) => row(s, r, i, tl.rowAt[i], i < L.rows.length - 1 && t >= tl.rowAt[i + 1]));
      if (L.composer) composer(s);
    }
    drawIsland(ctx);
    if (props.notification) banner(s, props.app, props.toolId, props.notification, tl.notifAt);
    // Home indicator.
    ctx.fillStyle = media ? 'rgba(255,255,255,0.7)' : C.ink;
    roundRect(ctx, SX + SW / 2 - 70, SY + SH - 18, 140, 6, 3);
    ctx.restore();
  });

  // Buzz marks either side of the phone.
  if (bz < 1) {
    ctx.save();
    ctx.globalAlpha *= (1 - bz) * 0.7;
    ctx.strokeStyle = s.set.ink;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const cx = side < 0 ? PX + 6 : PX + PW - 6, a0 = side < 0 ? Math.PI : 0;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.arc(cx, PY + 150, 40 + k * 20, a0 - 0.35, a0 + 0.35);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- Kit

function kit(s, L, tl, media) {
  const { t } = s;
  const m = s.beat.mascot || {};
  const keys = [];
  if (!media) L.rows.forEach((r, i) => keys.push({ at: tl.rowAt[i], x: LIST_X + ROW_PAD + CHIP / 2, y: r.y + r.h / 2 }));
  if (Number.isFinite(tl.notifAt)) keys.push({ at: tl.notifAt + 0.1, x: SX + 60, y: SY + 120 });
  // Aim eases from target to target: the newest row, then the banner.
  let target = { x: PX + 40, y: PY + PH * 0.42 };
  for (const k of keys) {
    if (t < k.at) break;
    const p = ease.inOutCubic(clamp((t - k.at) / 0.3));
    target = { x: lerp(target.x, k.x, p), y: lerp(target.y, k.y, p) };
  }
  let face = m.face || 'smile';
  if (t < 0.6 || (t >= tl.notifAt && t < tl.notifAt + 0.6)) face = 'wow';
  else if (t >= tl.notifAt + 0.6) face = m.face || 'happy';
  s.kit({
    x: KX, y: KY, s: KS,
    pose: t < 0.6 ? 'idle' : m.pose || 'point',
    face, look: 0.6, flip: false,
    pointAt: { x: target.x, y: target.y + Math.sin(t * 3) * 6 },
  });
}

// ---------------------------------------------------------------- scene

export default {
  type: 'phone',
  describe: 'Mobile / remote / notifications. A clean phone shows an iOS-style app (header, title and 2–4 task rows with live status chips: running, done, waiting) — or the real vertical screenshot/recording when `media` is set; an optional notification banner drops in with a buzz. Kit points at it.',
  props: {
    app: 'string ≤ 18 chars — the app name in the header bar, e.g. "Claude"',
    title: 'string ≤ 26 chars — screen title, e.g. "Your agents"',
    rows: "[{ text: string ≤ 26 chars, status: 'running' | 'done' | 'waiting' }] 2–4 rows, revealed in order",
    notification: 'string ≤ 44 chars (optional) — banner that slides down, e.g. "PR #42 is ready for review"',
    media: 'optional media id of a real phone screenshot or screen recording (vertical works best) shown on the screen instead of the drawn rows',
    toolId: 'optional data.ts tool id for the app icon (defaults to the episode tool when the app name matches it)',
  },
  draw(s) {
    const { ctx, episode } = s;
    const p = s.props;
    const app = String(p.app || episode.subject?.name || 'App').trim();
    // The app's icon is the real product logo when the app is the episode's tool.
    const source = toolInfo(episode.source?.toolId);
    const named = source && app.toLowerCase().includes(String(source.title).toLowerCase().split(/\s+/)[0]);
    const toolId = toolInfo(p.toolId) ? p.toolId : named ? episode.source.toolId : null;
    const props = {
      app, toolId,
      title: String(p.title || '').trim(),
      notification: p.notification ? String(p.notification).trim() : '',
    };
    const mediaId = Array.isArray(p.media) ? p.media[0] : p.media;
    const item = s.media(mediaId);
    const media = item ? { img: s.mediaFrame(mediaId, 0.35), video: item.kind === 'video' } : null;
    const rows = readRows(p.rows);
    const L = layout(ctx, props.title, rows);
    const tl = timeline(s, media ? [] : rows, props.notification);

    phone(s, props, L, tl, media);
    kit(s, L, tl, media);
  },
};
