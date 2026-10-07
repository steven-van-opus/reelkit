// Where-to-get-it beat: a cork pinboard slaps onto the wall, an optional title
// banner is taped across its top, and 2–5 paper name tags get pinned or taped
// on one by one as the narrator names them. Items are strings or
// { text, logo }; a name that matches a data.ts tool ("Vercel AI Gateway" →
// Vercel) gets that tool's logo sticker stuck over its tag's pink tab, anything
// else a hand-cut icon. Kit waves a little pennant on the floor below and
// cheers once the last tag is up.
import { createCanvas } from '@napi-rs/canvas';
import { W, C, BAND, font } from '../../brand.mjs';
import { paper, roundRectPath, cutCirclePath, tornRectPath, fitSize, fitWrapped, wrapLines, text, measure, tape, pinkGradient, withT } from '../../paper.mjs';
import { icon, sparkles, confetti } from '../../fx.mjs';
import { toolInfo } from '../../logos.mjs';
import { clamp, ease, lerp, prog, rng, boil, spring, onTwos, noise1, rgba, shade } from '../../util.mjs';
import { matchTool } from '../studio/where.mjs';
import { logoSticker } from './product.mjs';

const STOP = new Set(['the', 'and', 'with', 'your', 'you', 'for', 'from', 'into', 'that', 'this', 'app', 'apps', 'all', 'any']);

// The distinctive words of a name, longest first: what the narrator is likely
// to say when they reach it.
function keyWords(str) {
  return String(str).toLowerCase().split(/\s+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(w => w.length >= 2 && !STOP.has(w))
    .sort((a, b) => b.length - a.length);
}

// When each tag goes up: on the word that names it if the voiceover says it,
// else evenly spread across the voiceover. The first tag always goes up right
// after the board lands so the beat never sits empty.
function revealTimes(s, items, first = 0.45) {
  const a = Math.max(first, s.voStart);
  const b = Math.max(a + 0.5 * items.length, s.voEnd);
  const step = (b - a) / items.length;
  const out = [];
  items.forEach((item, i) => {
    if (i === 0) return out.push(a);
    let at = a + i * step;
    const said = keyWords(item.text).map(k => s.wordTime(k)).find(x => x != null && x > a && x < b);
    if (said != null) at = said - 0.1;
    out.push(Math.max(at, out[i - 1] + 0.32));
  });
  return out;
}

// Items as { text, toolId }: strings or { text | name | label, logo | toolId }.
// An explicit logo wins; otherwise a name that matches a tool gets its logo.
function readItems(props) {
  let raw = props.items;
  if (typeof raw === 'string') raw = raw.split(/\n|,|;|\|/);
  const items = (Array.isArray(raw) ? raw : [])
    .map(x => {
      const o = x && typeof x === 'object' ? x : { text: x };
      const txt = String(o.text ?? o.name ?? o.label ?? '').trim();
      if (!txt) return null;
      const explicit = o.logo || o.toolId;
      return { text: txt, toolId: explicit && toolInfo(explicit) ? explicit : matchTool(txt) };
    })
    .filter(Boolean)
    .slice(0, 5);
  return items.length ? items : ['Web', 'iOS', 'Android'].map(text => ({ text, toolId: null }));
}

// A generic fx icon that fits the platform name. Never a brand mark.
const ICONS = [
  [/\b(ios|iphone|ipad|android|mobile|phone|app ?store|play ?store)\b/, 'phone'],
  [/\b(web|browser|chrome|safari|firefox|edge|online|site|extension)\b/, 'globe'],
  [/\b(slack|discord|teams|chat|chatgpt|claude|gemini|whatsapp|telegram|messages?|copilot)\b/, 'chat'],
  [/\b(api|cli|sdk|terminal|code|vs ?code|cursor|github|dev|developers?|npm)\b/, 'code'],
  [/\b(youtube|tiktok|video|reels|instagram|twitch|stream|shorts)\b/, 'play'],
  [/\b(figma|canva|photoshop|design|photos?|image|lightroom)\b/, 'image'],
  [/\b(mac|macos|windows|desktop|linux|pc|laptop)\b/, 'cursor'],
  [/\b(notion|docs|workspace|office|sheets|drive|word|excel)\b/, 'layers'],
  [/\b(pro|plus|premium|paid|enterprise|business|max|team)\b/, 'star'],
  [/\b(free|everyone)\b/, 'heart'],
  [/\b(beta|preview|labs|early)\b/, 'sparkle'],
];
const iconFor = (name, i) => ICONS.find(([re]) => re.test(name.toLowerCase()))?.[1] || ['bolt', 'sparkle', 'star', 'check', 'globe'][i % 5];

// ---------------------------------------------------------------- board

const corkCache = new Map();
// Cork granules and a few old pin holes, drawn once per board size.
function corkCanvas(w, h) {
  const key = `${w}x${h}`;
  if (corkCache.has(key)) return corkCache.get(key);
  const cv = createCanvas(w, h);
  const g = cv.getContext('2d');
  const r = rng('cork');
  for (let i = 0; i < (w * h) / 70; i++) {
    const x = r() * w, y = r() * h, sz = 0.8 + r() * 2.6;
    g.fillStyle = r() < 0.62 ? rgba('#8A5A2E', 0.12 + r() * 0.24) : rgba('#FFF4E0', 0.22 + r() * 0.34);
    g.beginPath();
    g.ellipse(x, y, sz, sz * (0.55 + r() * 0.6), r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(60,30,10,0.38)';
    g.beginPath();
    g.arc(r() * w, r() * h, 1.6 + r() * 1.2, 0, Math.PI * 2);
    g.fill();
  }
  corkCache.set(key, cv);
  return cv;
}

function board(ctx, x, y, w, h) {
  const fr = 26;
  paper(ctx, c => roundRectPath(c, x, y, w, h, 20), { fill: '#B98A5E', lift: 2.2, rim: 1.1 });
  const ix = x + fr, iy = y + fr, iw = w - fr * 2, ih = h - fr * 2;
  paper(ctx, c => roundRectPath(c, ix, iy, iw, ih, 8), { fill: '#D9B48A', lift: 0, rim: 0, grain: 0.8 });
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, ix, iy, iw, ih, 8);
  ctx.clip();
  ctx.drawImage(corkCanvas(iw, ih), ix, iy);
  // The frame casts a soft shadow onto the cork.
  ctx.shadowColor = 'rgba(70,35,10,0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 7;
  ctx.shadowOffsetX = 3;
  ctx.strokeStyle = '#B98A5E';
  ctx.lineWidth = 20;
  ctx.beginPath();
  roundRectPath(ctx, ix - 10, iy - 10, iw + 20, ih + 20, 14);
  ctx.stroke();
  ctx.restore();
  return { x: ix, y: iy, w: iw, h: ih };
}

// ---------------------------------------------------------------- tags

// Rounded on the left only — the coloured tab of a name tag.
function tabPath(c, x, y, w, h, r) {
  c.moveTo(x + r, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

const TAB = 96;

// Fit the name: one line big, else two lines, else squeeze.
function fitName(ctx, str, maxW, maxSize, minSize) {
  const one = fitSize(ctx, str, 900, maxW, maxSize, minSize);
  ctx.font = font(900, one);
  if (ctx.measureText(str).width <= maxW) return { size: one, lines: [str] };
  const two = fitWrapped(ctx, str, 900, maxW, 2, Math.min(maxSize, 52), 34);
  ctx.font = font(900, two.size);
  const all = wrapLines(ctx, str, maxW);
  return { size: two.size, lines: all.length > 2 ? [all[0], all.slice(1).join(' ')] : all };
}

// A real product's logo sticker, stuck over the tag's pink tab a beat after
// the tag lands (k: 0..1 slap progress).
function tagSticker(ctx, tg, k) {
  if (k <= 0) return;
  const size = Math.min(tg.h - 30, 108);
  const e = ease.outBack(k, 1.8);
  withT(ctx, { x: -tg.w / 2 + TAB / 2 + 4, y: 1, rot: tg.stickerRot + (1 - e) * 0.3, scale: lerp(1.3, 1, e), alpha: clamp(k * 4) }, () => {
    logoSticker(ctx, size, { toolId: tg.toolId, lift: lerp(3, 1.1, e), seed: `where-logo-${tg.toolId}` });
  });
}

function nameTag(ctx, tg, { lift, fill, stick = 1 }) {
  const { w, h } = tg;
  paper(ctx, c => roundRectPath(c, -w / 2, -h / 2, w, h, 16), { fill, lift, rim: 0.9 });
  // Pink tab glued over the left end, with the fx icon cut from chalk — or a
  // real product's logo sticker stuck on top of it.
  paper(ctx, c => tabPath(c, -w / 2, -h / 2, TAB, h, 16), {
    fill: pinkGradient(ctx, -w / 2, -h / 2, -w / 2 + TAB, h / 2), lift: 0.35, rim: 0.6,
  });
  if (tg.toolId) tagSticker(ctx, tg, stick);
  else icon(ctx, tg.icon, -w / 2 + TAB / 2, 0, 50, C.chalk);
  // Perforation between tab and label.
  ctx.save();
  ctx.fillStyle = rgba(C.ink, 0.18);
  for (let yy = -h / 2 + 14; yy < h / 2 - 8; yy += 14) {
    ctx.beginPath();
    ctx.arc(-w / 2 + TAB + 9, yy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const tx = -w / 2 + TAB + 28, lh = tg.size * 1.06;
  tg.lines.forEach((l, k) => {
    const lw = measure(ctx, l, 900, tg.size);
    ctx.save();
    ctx.translate(tx, (k - (tg.lines.length - 1) / 2) * lh + 3);
    // Last-resort squeeze so a name can never run off its tag.
    if (lw > tg.textW) ctx.scale(tg.textW / lw, 1);
    text(ctx, l, 0, 0, { weight: 900, size: tg.size, color: C.ink, align: 'left', tracking: -0.5 });
    ctx.restore();
  });
}

// A push-pin seen from the front: the needle's shadow, then a round head.
function pin(ctx, x, y, color, height = 0) {
  ctx.save();
  ctx.strokeStyle = 'rgba(40,10,20,0.35)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 9 + height * 8, y + 14 + height * 12);
  ctx.stroke();
  ctx.restore();
  paper(ctx, c => cutCirclePath(c, x, y, 17, { seed: 'pin', wobble: 0.6 }), {
    fill: color, lift: 1 + height * 2, rim: 0.9, grain: 0.3,
  });
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - 5, y - 6, 6, 4, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(shade(color, -0.35), 0.5);
  ctx.beginPath();
  ctx.arc(x + 3, y + 4, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- kit

// Where Kit's right mitten is in the 'wave' and 'cheer' poses, so a held prop
// sits in the hand. Mirrors the body/arm geometry in mascot.mjs, which has no
// hand-point helper for one-handed poses.
function kitHand({ x, y, s: ks, t, pose, seed = 'kit' }) {
  const tt = onTwos(t);
  const wig = Math.sin(tt * Math.PI * 2 * 2.2);
  const ang = pose === 'cheer' ? 2.7 - wig * 0.18 : 2.6 + wig * 0.35;
  const bounce = pose === 'cheer' ? Math.abs(Math.sin(tt * Math.PI * 2 * 1.6)) * 16 : 0;
  const bob = Math.sin(tt * Math.PI * 2 * 1.1) * 3.5 + bounce;
  const squash = 1 + Math.sin(tt * Math.PI * 2 * 1.1) * 0.012;
  const jitter = noise1(seed, Math.floor(tt * 7.5)) * 0.008;
  // Shoulder (BODY_W / 2 - 6, -BODY_H + LID_H + 36); arm length 82; LEG_H 54.
  const hx = (99 + Math.sin(ang) * 82) / squash, hy = (-74 + Math.cos(ang) * 82) * squash;
  const rx = hx * Math.cos(jitter) - hy * Math.sin(jitter), ry = hx * Math.sin(jitter) + hy * Math.cos(jitter);
  return { x: x + rx * ks, y: y + (ry - 54 - bob) * ks, ang: ang + jitter };
}

// A little pennant on a stick, gripped at (hx, hy) and leaning with the arm.
function pennant(ctx, hx, hy, ang, ks, t, onPink) {
  const dir = { x: Math.sin(ang) * 0.55, y: Math.cos(ang) };
  const len = Math.hypot(dir.x, dir.y);
  const ux = dir.x / len, uy = dir.y / len;
  const L = 150 * ks;
  const topX = hx + ux * L, topY = hy + uy * L;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(40,0,20,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.strokeStyle = '#B98A5E';
  ctx.lineWidth = 9 * ks;
  ctx.beginPath();
  ctx.moveTo(hx - ux * 22 * ks, hy - uy * 22 * ks);
  ctx.lineTo(topX, topY);
  ctx.stroke();
  ctx.restore();
  // Flag flaps on twos: the free tip swings and the cloth bows.
  const tt = onTwos(t);
  const flap = Math.sin(tt * 9) * 0.5 + 0.5;
  const fl = (118 - flap * 16) * ks, fh = 74 * ks;
  const px = -uy, py = ux; // perpendicular, pointing right of the stick
  const a = { x: topX, y: topY };
  const b = { x: topX - ux * fh, y: topY - uy * fh };
  const tip = { x: topX - ux * fh * 0.5 + px * fl, y: topY - uy * fh * 0.5 + py * fl + (flap - 0.5) * 14 * ks };
  const bow = (flap - 0.5) * 18 * ks;
  const build = c => {
    c.moveTo(a.x, a.y);
    c.quadraticCurveTo((a.x + tip.x) / 2 + bow * ux, (a.y + tip.y) / 2 - bow, tip.x, tip.y);
    c.quadraticCurveTo((b.x + tip.x) / 2 + bow * ux, (b.y + tip.y) / 2 - bow, b.x, b.y);
    c.closePath();
  };
  paper(ctx, build, {
    fill: onPink ? C.chalk : pinkGradient(ctx, a.x, a.y, tip.x, tip.y), lift: 1, rim: 0.7,
  });
  icon(ctx, 'star', (a.x + b.x + tip.x * 1.2) / 3.2, (a.y + b.y + tip.y * 1.2) / 3.2, 30 * ks, onPink ? C.pink : C.chalk);
  // Ball finial on top of the stick.
  paper(ctx, c => cutCirclePath(c, topX, topY, 9 * ks, { seed: 'finial' }), { fill: '#B98A5E', lift: 0.5, rim: 0.6, grain: 0.4 });
}

// ---------------------------------------------------------------- layout

// Up to three tags stack in one staggered column; four or five go in two
// columns (the odd one out centred on the last row).
function layoutTags(ctx, items, area) {
  const n = items.length;
  const r = rng(`where-${items.map(it => it.text).join('|')}`);
  const grid = n >= 4;
  const rows = grid ? Math.ceil(n / 2) : n;
  const h = grid ? (n === 4 ? 156 : 132) : n === 3 ? 140 : 160;
  const rowH = area.h / rows;
  const colGap = 30;
  return items.map(({ text: name, toolId }, i) => {
    const row = grid ? Math.floor(i / 2) : i;
    const alone = grid && i === n - 1 && n % 2 === 1;
    let w, cx;
    const maxSize = grid ? 50 : 66;
    if (grid) {
      w = (area.w - colGap * 3) / 2;
      cx = alone ? area.x + area.w / 2 : area.x + colGap + w / 2 + (i % 2) * (w + colGap);
    } else {
      ctx.font = font(900, maxSize);
      const natural = TAB + 28 + ctx.measureText(name).width + 40;
      w = clamp(natural, 400, area.w - 60);
      const sway = n === 1 ? 0 : (i % 2 ? 1 : -1) * 64;
      cx = clamp(area.x + area.w / 2 + sway, area.x + 24 + w / 2, area.x + area.w - 24 - w / 2);
    }
    const textW = w - TAB - 28 - 30;
    const { size, lines } = fitName(ctx, name, textW, maxSize, grid ? 38 : 44);
    return {
      name, w, h, size, lines, textW, toolId,
      icon: iconFor(name, i),
      stickerRot: noise1(`where-stick-${name}`, i) * 0.08,
      x: cx + (r() - 0.5) * (grid ? 16 : 30),
      y: area.y + rowH * (row + 0.5) + (r() - 0.5) * 14,
      rot: (r() - 0.5) * 0.11,
      taped: r() < 0.34,
      fill: [C.chalk, C.paperWarm, C.chalk, C.rose, C.chalk][i % 5],
    };
  });
}

export default {
  type: 'where',
  describe: 'Where it is available / who supports it. A cork pinboard with an optional title banner; 2–5 name tags (product logo sticker or platform icon + name) get pinned on one by one as they are named, and Kit waves a pennant below.',
  props: {
    title: 'string ≤ 24 chars, optional — the banner across the board, e.g. "Live on", "Works with"',
    items: 'array of 2–5 entries, each a string ≤ 22 chars or { text, logo } (logo = data.ts toolId) — platform or product names in the order the voiceover says them, e.g. ["Gemini API", "Vercel AI Gateway", "iOS"]; names matching a tool get its logo sticker automatically',
  },
  draw(s) {
    const { ctx, t, ts, props } = s;
    const items = readItems(props);
    const title = String(props.title || '').trim();
    const onPink = s.setName === 'pink';

    sparkles(ctx, { x: W / 2, y: 740, t, radius: 500, count: 5, seed: 'where-sp', fill: s.set.ink === C.chalk ? C.blush : C.chalk });

    // Board slaps onto the wall.
    const bx = 100, by = 400, bw = 880, bh = 690;
    const pop = s.spring(0.02, { freq: 2.1, damp: 0.5 });
    let area;
    withT(ctx, {
      x: W / 2, y: by + bh / 2,
      rot: (1 - pop) * -0.06,
      scale: lerp(0.84, 1, pop),
      alpha: clamp(ts / 0.1),
    }, () => {
      ctx.translate(-W / 2, -(by + bh / 2));
      area = board(ctx, bx, by, bw, bh);
    });
    const top = title ? 112 : 30;
    area = { x: area.x, y: area.y + top, w: area.w, h: area.h - top - 24 };

    const tags = layoutTags(ctx, items, area);
    const at = revealTimes(s, items);
    const shown = at.filter(a => ts >= a).length;
    const newest = Math.max(0, shown - 1);

    tags.forEach((tg, i) => {
      const dt = ts - at[i];
      if (dt < 0) return;
      // Held just above the board, pressed flat, then pinned.
      const press = spring(dt, { freq: 2.4, damp: 0.55 });
      const flat = ease.outCubic(clamp(dt / 0.26));
      const side = i % 2 ? 1 : -1;
      const pinT = clamp((dt - 0.2) / 0.12);
      const bump = dt > 0.32 && dt < 0.5 ? Math.sin(((dt - 0.32) / 0.18) * Math.PI) * 4 : 0;
      const b = boil(`where-${i}`, t, 0.7);
      withT(ctx, {
        x: tg.x + b.dx + (1 - press) * 40 * side,
        y: tg.y - (1 - press) * 70 + b.dy + bump,
        rot: tg.rot + (1 - press) * 0.2 * side + b.rot,
        scale: 1 + (1 - flat) * 0.14,
        alpha: clamp(dt / 0.08),
      }, () => {
        nameTag(ctx, tg, { lift: lerp(3.4, i === newest ? 1.6 : 1.1, flat), fill: tg.fill, stick: clamp((dt - 0.1) / 0.3) });
        if (pinT <= 0) return;
        if (tg.taped) {
          const k = ease.outBack(pinT, 1.6);
          tape(ctx, -tg.w / 2 + 18, -tg.h / 2 + 6, 90 * k, 32, -0.62, { seed: `where-ta-${i}`, alpha: 0.8 });
          tape(ctx, tg.w / 2 - 18, -tg.h / 2 + 6, 90 * k, 32, 0.62, { seed: `where-tb-${i}`, alpha: 0.8 });
        } else {
          const h = 1 - ease.inQuad(pinT);
          withT(ctx, { x: 26, y: -tg.h / 2 + 22 - h * 50, scale: 1 + h * 1.2, alpha: clamp(pinT * 3) }, () => pin(ctx, 0, 0, s.accent, h));
        }
      });
    });

    // Title banner taped across the top of the board.
    const e = s.enter(0.22, 0.4);
    if (title && e > 0) {
      const str = title.toUpperCase();
      const size = fitSize(ctx, str, 900, 700, 62, 40);
      const tw = Math.min(700, measure(ctx, str, 900, size, 2));
      const w = tw + 96, h = size + 50;
      withT(ctx, { x: W / 2, y: by + 26, rot: -0.022 + (1 - e) * 0.08, scale: e }, () => {
        paper(ctx, c => tornRectPath(c, -w / 2, -h / 2, w, h, { seed: `where-title-${str}`, rough: 4, step: 12 }), {
          fill: onPink ? C.ink : pinkGradient(ctx, -w / 2, -h / 2, w / 2, h / 2), lift: 2, rim: 0.6,
        });
        text(ctx, str, 0, 3, { weight: 900, size, color: C.chalk, tracking: 2 });
        tape(ctx, -w / 2 + 6, -h / 2 + 8, 84, 30, -0.7, { seed: 'where-title-ta', alpha: 0.78 });
        tape(ctx, w / 2 - 6, h / 2 - 8, 84, 30, -0.7, { seed: 'where-title-tb', alpha: 0.78 });
      });
    }

    const last = at[at.length - 1];
    const lastTag = tags[tags.length - 1];
    confetti(ctx, { x: lastTag.x, y: lastTag.y, t, at: last + 0.3, seed: 'where-confetti', count: 22, spread: 0.8 });

    // Kit on the floor, bottom left, waving a pennant; cheers when the last
    // tag is up.
    const m = s.beat.mascot || {};
    const kx = 248, ky = BAND.floorY + 62, ks = 0.88;
    const done = ts >= last + 0.3;
    const pose = m.pose || (done ? 'cheer' : 'wave');
    const justLanded = at.some(a => ts >= a + 0.2 && ts < a + 0.55);
    const face = m.face || (done ? 'happy' : justLanded ? 'wow' : 'smile');
    const look = clamp((tags[newest].x - kx) / 380, -1, 1);
    if (pose === 'wave' || pose === 'cheer') {
      const hand = kitHand({ x: kx, y: ky, s: ks, t, pose });
      pennant(ctx, hand.x, hand.y, hand.ang, ks, t, onPink);
    }
    s.kit({ x: kx, y: ky, s: ks, pose, face, look });
  },
};
