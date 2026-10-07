// Phone beat: a big paper phone rises out of the floor and leans on a kraft
// easel. The app's header bar (with the product's logo when the app is a known
// tool) and title settle in, task rows pop in one by one with live status chips
// (a spinning pink dot, a check, a ticking clock) — or, when props.media is
// set, the real vertical screenshot / screen recording lights up the screen.
// An optional notification banner drops in from the top of the screen with a
// bounce while the phone buzzes. Kit stands beside it pointing at the screen.
import { C, BAND } from '../../brand.mjs';
import { paper, roundRectPath, cutCirclePath, fitWrapped, fitSize, text, tape, pinkGradient, grainCanvas } from '../../paper.mjs';
import { icon, sparkles } from '../../fx.mjs';
import { toolInfo } from '../../logos.mjs';
import { drawCover, drawContain } from '../../mediastore.mjs';
import { clamp, lerp, ease, onTwos, boil, spring } from '../../util.mjs';
import { logoSticker } from './product.mjs';

const STATUSES = ['running', 'done', 'waiting'];

const PW = 580, PH = 990, PX = 350, PY = BAND.floorY + 30 - PH; // phone body
const BEZ = 20;
const SX = PX + BEZ, SY = PY + BEZ, SW = PW - BEZ * 2, SH = PH - BEZ * 2; // screen
const SCREEN = '#F4F1F7';
const ROW_X = SX + 20, ROW_W = SW - 40, ROW_TEXT_X = ROW_X + 100, ROW_TEXT_W = ROW_W - 100 - 26;
const KX = 178, KS = 0.9, KY = BAND.floorY + 50; // Kit, left of the phone

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
    const at = spoken !== null && Math.abs(spoken - 0.1 - even) < 1.1 ? spoken - 0.1 : even;
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
// Drops the composer bar when four long rows need the room.
function layout(ctx, title, rows) {
  const titleTop = SY + 196;
  for (const step of [0, 1, 2, 3]) {
    const t = fitWrapped(ctx, title, 900, SW - 60, 2, 60 - step * 4, 40);
    const titleLh = t.size * 1.06;
    const rowsTop = titleTop + (title ? t.lines.length * titleLh + 30 : 0);
    const fits = rows.map(r => {
      const f = fitWrapped(ctx, r.text, 700, ROW_TEXT_W, 2, 38 - step * 2, 30);
      const lh = f.size * 1.16;
      const h = Math.max(104 - step * 6, f.lines.length * lh + 40 + (r.status === 'running' ? 14 : 0));
      return { ...f, lh, h };
    });
    const gap = 14;
    const total = fits.reduce((n, f) => n + f.h, 0) + gap * (rows.length - 1);
    const bottom = rowsTop + total;
    const composer = bottom <= SY + SH - 138;
    if (composer || bottom <= SY + SH - 52 || step === 3) {
      let y = rowsTop;
      const placed = fits.map(f => { const r = { ...f, y }; y += f.h + gap; return r; });
      return { title: { ...t, lh: titleLh, top: titleTop }, rows: placed, composer };
    }
  }
}

// ---------------------------------------------------------------- pieces

// App tile: the product's logo sticker when the app is a known tool, else an
// accent square with the app's initial.
function appTile(ctx, x, y, size, app, fill, toolId = null) {
  if (toolId) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    logoSticker(ctx, size, { toolId, lift: 0.5 });
    ctx.restore();
    return;
  }
  paper(ctx, c => roundRectPath(c, x, y, size, size, size * 0.27), { fill, lift: 0.5, rim: 0.7 });
  const initial = (String(app).match(/[\p{L}\p{N}]/u) || ['A'])[0].toUpperCase();
  text(ctx, initial, x + size / 2, y + size / 2 + 2, { weight: 900, size: size * 0.58, color: C.chalk });
}

function statusChip(ctx, status, x, y, ts, seed) {
  if (status === 'running') {
    paper(ctx, c => cutCirclePath(c, x, y, 30, { seed }), { fill: pinkGradient(ctx, x - 30, y - 30, x + 30, y + 30), lift: 0.8, rim: 0.6 });
    ctx.save();
    ctx.strokeStyle = C.chalk;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const a = ts * 6.5 + seed.length;
    ctx.arc(x, y, 14, a, a + Math.PI * 1.35);
    ctx.stroke();
    ctx.restore();
  } else if (status === 'done') {
    paper(ctx, c => cutCirclePath(c, x, y, 30, { seed }), { fill: C.ink, lift: 0.8, rim: 0.4 });
    icon(ctx, 'check', x, y + 1, 34, C.chalk);
  } else {
    paper(ctx, c => cutCirclePath(c, x, y, 30, { seed }), { fill: C.line, lift: 0.5, rim: 0.6 });
    ctx.save();
    ctx.strokeStyle = C.mute;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ts * 1.6 - Math.PI / 2) * 10, y + Math.sin(ts * 1.6 - Math.PI / 2) * 10);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 7, y + 3);
    ctx.stroke();
    ctx.restore();
  }
}

function row(s, r, i, at) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const e = s.enter(at, 0.4);
  if (e <= 0) return;
  const y = r.y, h = r.h, cy = y + h / 2;
  const running = r.status === 'running';
  const b = boil(`row-${i}`, t, 0.5);
  pivot(ctx, ROW_X + ROW_W / 2, cy, { scale: 0.9 + 0.1 * e, alpha: clamp(e * 3), dx: (1 - e) * 160 + b.dx, dy: b.dy }, () => {
    paper(ctx, c => roundRectPath(c, ROW_X, y, ROW_W, h, 24), { fill: C.chalk, lift: 1.1, rim: 0.8 });
    const ty = cy - (running ? 7 : 0) - ((r.lines.length - 1) * r.lh) / 2 + 2;
    r.lines.forEach((l, k) => text(ctx, l, ROW_TEXT_X, ty + k * r.lh, {
      weight: 700, size: r.size, color: r.status === 'waiting' ? C.mute : C.ink, align: 'left',
    }));
    // The chip pops a beat after its row lands.
    const ce = s.enter(at + 0.12, 0.3);
    if (ce > 0) pivot(ctx, ROW_X + 52, cy, { scale: ce }, () => statusChip(ctx, r.status, ROW_X + 52, cy, ts, `chip-${i}`));
    if (running) {
      // Indeterminate progress: a pink segment sliding along a blush track.
      const tx = ROW_TEXT_X, tw = ROW_W - 100 - 26, tyy = y + h - 22;
      ctx.fillStyle = C.blush;
      roundRect(ctx, tx, tyy, tw, 8, 4);
      ctx.save();
      ctx.beginPath();
      roundRectPath(ctx, tx, tyy, tw, 8, 4);
      ctx.clip();
      const u = ((ts * 0.7 + i * 0.37) % 1.4) - 0.4;
      ctx.fillStyle = pinkGradient(ctx, tx, 0, tx + tw, 0);
      roundRect(ctx, tx + u * tw, tyy, tw * 0.38, 8, 4);
      ctx.restore();
    }
  });
}

function header(s, app, toolId) {
  const { ctx } = s;
  const e = s.enter(0.42, 0.35);
  if (e <= 0) return;
  const hy = SY + 74;
  pivot(ctx, SX + SW / 2, hy + 50, { alpha: clamp(e * 3), dy: (1 - e) * -30 }, () => {
    appTile(ctx, SX + 26, hy + 17, 66, app, s.accent, toolId);
    const size = fitSize(ctx, app, 900, SW - 112 - 92, 44, 30);
    text(ctx, app, SX + 110, hy + 52, { weight: 900, size, color: C.ink, align: 'left' });
    // Generic avatar.
    const ax = SX + SW - 54, ay = hy + 50;
    paper(ctx, c => cutCirclePath(c, ax, ay, 28, { seed: 'ph-av' }), { fill: C.blush, lift: 0.5, rim: 0.6 });
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, 28, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.arc(ax, ay - 6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ax, ay + 24, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = C.line;
    ctx.fillRect(SX + 24, hy + 104, SW - 48, 3);
  });
}

// The camera island alone, for a real screen that brings its own status bar.
const island = ctx => { ctx.fillStyle = C.ink; roundRect(ctx, SX + SW / 2 - 66, SY + 20, 132, 38, 19); };

function statusBar(ctx, ink = C.ink) {
  text(ctx, '9:41', SX + 58, SY + 40, { weight: 800, size: 30, color: ink, align: 'left' });
  island(ctx);
  ctx.fillStyle = ink;
  // Signal bars and battery.
  for (let i = 0; i < 4; i++) roundRect(ctx, SX + SW - 152 + i * 11, SY + 46 - (8 + i * 5), 7, 8 + i * 5, 2);
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundRectPath(ctx, SX + SW - 96, SY + 28, 46, 22, 6);
  ctx.stroke();
  ctx.restore();
  roundRect(ctx, SX + SW - 92, SY + 32, 32, 14, 3);
  roundRect(ctx, SX + SW - 48, SY + 35, 4, 8, 2);
}

function composer(s) {
  const { ctx } = s;
  const e = s.enter(0.7, 0.35);
  if (e <= 0) return;
  const y = SY + SH - 116, h = 72, x = SX + 20, w = SW - 40;
  pivot(ctx, x + w / 2, y + h / 2, { scale: e, alpha: clamp(e * 3) }, () => {
    paper(ctx, c => roundRectPath(c, x, y, w, h, h / 2), { fill: C.chalk, lift: 0.8, rim: 0.6 });
    ctx.fillStyle = C.line;
    roundRect(ctx, x + 32, y + h / 2 - 7, w * 0.46, 14, 7);
    const bx = x + w - h / 2 - 2, by = y + h / 2;
    paper(ctx, c => cutCirclePath(c, bx, by, 26, { seed: 'ph-send' }), { fill: pinkGradient(ctx, bx - 26, by - 26, bx + 26, by + 26), lift: 0.6, rim: 0.6 });
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-Math.PI / 2);
    icon(ctx, 'arrow', 0, 0, 30, C.chalk);
    ctx.restore();
  });
}

// Ink on the drawn app; chalk over a real screen, which is often dark.
function banner(s, app, note, at, toolId, light = false) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  if (ts < at) return;
  const bx = SX + 14, bw = SW - 28;
  const { size, lines } = fitWrapped(ctx, note, 700, bw - 122, 2, 36, 30);
  const lh = size * 1.18;
  const bh = 72 + lines.length * lh + 14;
  const rest = SY + 14, hidden = SY - bh - 30;
  const by = lerp(hidden, rest, spring(ts - at, { freq: 2.1, damp: 0.36 }));
  paper(ctx, c => roundRectPath(c, bx, by, bw, bh, 34), { fill: light ? C.chalk : C.ink, lift: 2.2, rim: light ? 0.8 : 0.5 });
  appTile(ctx, bx + 22, by + 22, 64, app, s.accent, toolId);
  text(ctx, app, bx + 104, by + 42, { weight: 800, size: 30, color: light ? C.mute : C.muteDark, align: 'left' });
  text(ctx, 'now', bx + bw - 26, by + 42, { weight: 600, size: 28, color: C.mute, align: 'right' });
  lines.forEach((l, k) => text(ctx, l, bx + 104, by + 82 + lh / 2 - 4 + k * lh, { weight: 700, size, color: light ? C.ink : C.chalk, align: 'left' }));
}

// ---------------------------------------------------------------- media

const grainFills = new WeakMap();
function grainFill(ctx) {
  let p = grainFills.get(ctx);
  if (!p) grainFills.set(ctx, (p = ctx.createPattern(grainCanvas('light'), 'repeat')));
  return p;
}

// The real screen from the sources, printed onto the paper screen. A tall
// capture fills it (top-aligned with a slow scroll; video centred); a squatter
// one spans the full width and its top and bottom edges are stretched to fill
// the screen, so nothing at the sides is cut off; a landscape one plays
// letterboxed on ink, the way a phone shows it. Returns true when letterboxed.
function screenMedia(ctx, img, { t, dur, video }) {
  const ar = img.width / img.height;
  let letterbox = false;
  if (ar > 0.85) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(SX, SY, SW, SH);
    drawContain(ctx, img, SX, SY + 96, SW, SH - 192);
    letterbox = true;
  } else if (ar > (SW / SH) * 1.14) {
    const ih = SW / ar, iy = SY + (SH - ih) * 0.42;
    ctx.drawImage(img, 0, 0, img.width, 2, SX, SY, SW, iy - SY + 1);
    ctx.drawImage(img, 0, img.height - 2, img.width, 2, SX, iy + ih - 1, SW, SY + SH - (iy + ih) + 1);
    ctx.drawImage(img, SX, iy, SW, ih);
  } else {
    const u = ease.inOutQuad(clamp(t / Math.max(dur, 1)));
    drawCover(ctx, img, SX, SY, SW, SH, { zoom: 1.0 + 0.03 * u, py: video ? 0 : lerp(-1, -0.6, u) });
  }
  ctx.save();
  ctx.globalAlpha *= 0.3;
  ctx.fillStyle = grainFill(ctx);
  ctx.fillRect(SX, SY, SW, SH);
  ctx.restore();
  return letterbox;
}

// ---------------------------------------------------------------- phone

function phone(s, props, L, tl, media) {
  const { ctx, t } = s;
  const ts = onTwos(t);
  const dark = s.set.ink === C.chalk;
  const rise = s.spring(0.02, { freq: 1.5, damp: 0.5 });
  if (rise <= 0) return;
  const b = boil('phone', t, 0.6);

  // Buzz when the notification lands.
  const bz = ts >= tl.notifAt ? clamp((ts - tl.notifAt) / 0.45) : 1;
  const buzz = bz < 1 ? (Math.round(ts * 15) % 2 ? 1 : -1) * 0.012 * (1 - bz) : 0;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1080, BAND.floorY + 80);
  ctx.clip();
  pivot(ctx, PX + PW / 2, PY + PH, { rot: -0.016 + b.rot * 0.6 + buzz, dx: b.dx * 0.6, dy: (1 - rise) * 1150 }, () => {
    // Kraft easel leg behind the phone.
    paper(ctx, c => {
      c.moveTo(PX + PW - 110, PY + PH * 0.36);
      c.lineTo(PX + PW - 74, PY + PH * 0.36);
      c.lineTo(PX + PW + 58, BAND.floorY + 40);
      c.lineTo(PX + PW + 18, BAND.floorY + 40);
      c.closePath();
    }, { fill: C.kraft, lift: 1.2, rim: 0.8 });

    // Side buttons peek out from behind the body.
    ctx.fillStyle = shadeInk(dark);
    roundRect(ctx, PX - 7, PY + 190, 14, 64, 5);
    roundRect(ctx, PX - 7, PY + 278, 14, 108, 5);
    roundRect(ctx, PX + PW - 7, PY + 250, 14, 124, 5);

    paper(ctx, c => roundRectPath(c, PX, PY, PW, PH, 80), { fill: C.ink, lift: 2.6, rim: 0.6 });
    if (dark) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      roundRectPath(ctx, PX + 1.5, PY + 1.5, PW - 3, PH - 3, 79);
      ctx.stroke();
      ctx.restore();
    }
    paper(ctx, c => roundRectPath(c, SX, SY, SW, SH, 62), { fill: SCREEN, lift: 0, grain: 0.7, rim: 0.4 });

    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, SX, SY, SW, SH, 62);
    ctx.clip();
    if (media) {
      // The screen lights up with the real thing (on twos, a quick bloom).
      const me = clamp((ts - 0.35) / 0.3);
      if (me > 0) {
        ctx.save();
        ctx.globalAlpha *= me;
        pivot(ctx, SX + SW / 2, SY + SH / 2, { scale: 1.04 - 0.04 * me }, () => {
          const letterbox = screenMedia(ctx, media.img, { t: t - 0.35, dur: s.dur, video: media.video });
          if (letterbox) statusBar(ctx, C.chalk);
        });
        ctx.restore();
      }
      island(ctx);
    } else {
      statusBar(ctx);
      header(s, props.app, props.toolId);
      const te = s.enter(0.52, 0.4);
      if (te > 0 && L.title.lines.length) {
        const { size, lines, lh, top } = L.title;
        pivot(ctx, SX + 30, top + lh / 2, { scale: 0.7 + 0.3 * te, alpha: clamp(te * 3) }, () => {
          lines.forEach((l, k) => text(ctx, l, SX + 30, top + lh / 2 + k * lh, { weight: 900, size, color: C.ink, align: 'left', tracking: -0.5 }));
        });
      }
      L.rows.forEach((r, i) => row(s, r, i, tl.rowAt[i]));
      if (L.composer) composer(s);
    }
    ctx.fillStyle = media ? 'rgba(255,255,255,0.75)' : C.ink;
    roundRect(ctx, SX + SW / 2 - 80, SY + SH - 26, 160, 9, 4.5);
    if (props.notification) banner(s, props.app, props.notification, tl.notifAt, props.toolId, Boolean(media));
    ctx.restore();

    // Glass glint across the screen.
    ctx.save();
    ctx.globalAlpha *= 0.07;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(SX + SW * 0.55, SY);
    ctx.lineTo(SX + SW * 0.8, SY);
    ctx.lineTo(SX + SW * 0.2, SY + SH);
    ctx.lineTo(SX - SW * 0.05, SY + SH);
    ctx.closePath();
    ctx.clip();
    ctx.beginPath();
    roundRectPath(ctx, SX, SY, SW, SH, 62);
    ctx.fill();
    ctx.restore();

    tape(ctx, PX + 34, PY + 30, 116, 38, -0.62, { seed: 'ph-ta', alpha: 0.75 });
  });
  ctx.restore();

  // Buzz marks either side of the phone, plus a few sparkles for the banner.
  if (bz < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - bz;
    ctx.strokeStyle = s.set.ink;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const x = side < 0 ? PX - 26 : PX + PW + 26, y = PY + 150;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.arc(x - side * 30, y, 30 + k * 22, -0.5, 0.5);
        if (side < 0) { ctx.beginPath(); ctx.arc(x - side * 30, y, 30 + k * 22, Math.PI - 0.5, Math.PI + 0.5); }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  if (ts >= tl.notifAt) {
    ctx.save();
    ctx.globalAlpha *= clamp(1.6 - (ts - tl.notifAt));
    sparkles(ctx, { x: PX + PW - 30, y: PY + 90, t, radius: 120, count: 4, seed: 'ph-sp', fill: dark ? C.blush : C.chalk });
    ctx.restore();
  }
}

const shadeInk = dark => (dark ? '#2C2C36' : '#26262E');

// ---------------------------------------------------------------- Kit

// Pointing angle eases from target to target: the newest row, then the banner.
function aim(ts, keys) {
  let a = keys[0].a;
  for (let i = 1; i < keys.length; i++) {
    const p = clamp((ts - keys[i].at) / 0.3);
    if (p <= 0) break;
    a = lerp(a, keys[i].a, ease.inOutCubic(p));
  }
  return a;
}

function kit(s, L, tl, media) {
  const { t } = s;
  const ts = onTwos(t);
  const m = s.beat.mascot || {};
  const sx = KX + 99 * KS, sy = KY - 128 * KS;
  const angleTo = (x, y) => clamp(Math.atan2(y - sy, x - sx), -1.2, -0.25);
  const keys = media
    ? [{ at: 0, a: angleTo(SX + 40, SY + SH * 0.42) }]
    : [{ at: 0, a: angleTo(ROW_X + 52, L.rows[0].y + L.rows[0].h / 2) }];
  if (!media) L.rows.forEach((r, i) => keys.push({ at: tl.rowAt[i], a: angleTo(ROW_X + 52, r.y + r.h / 2) }));
  if (Number.isFinite(tl.notifAt)) keys.push({ at: tl.notifAt + 0.1, a: angleTo(SX + 60, SY + 80) });

  let face = m.face || 'smile';
  if (t < 0.6 || (ts >= tl.notifAt && ts < tl.notifAt + 0.6)) face = 'wow';
  else if (ts >= tl.notifAt + 0.6) face = m.face || 'happy';
  s.kit({
    x: KX, y: KY, s: KS,
    pose: t < 0.6 ? 'idle' : m.pose || 'point',
    face, look: 0.6, flip: false,
    pointAngle: aim(ts, keys),
  });
}

// ---------------------------------------------------------------- scene

export default {
  type: 'phone',
  describe: 'Mobile / remote / notifications. A big paper phone shows an app header (with the product logo), a title and 2–4 task rows with live status chips (running, done, waiting) — or the real vertical screenshot/recording when `media` is set; an optional notification banner drops in with a buzz. Kit points at it.',
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
