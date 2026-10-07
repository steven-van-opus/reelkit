// Kit — the Creators Toolbox mascot. A pink card-stock toolbox whose carry
// handle is the brand's thick "C", with a face on the front panel, paper-strip
// arms, mitten hands and two little sneakers.
//
// drawMascot(ctx, { x, y, s, t, pose, face, look, flip })
//   x, y   the point between the feet on the floor
//   s      scale (1 ≈ 330px tall incl. handle)
//   t      seconds — drives idle bob, blinks and pose motion
//   pose   'idle' | 'wave' | 'point' | 'cheer' | 'hold' | 'think' | 'shrug' | 'walk' | 'type'
//   face   'smile' | 'happy' | 'wow' | 'wink' | 'focus' | 'grin'
//   look   -1..1 horizontal gaze; pointAngle for 'point' (radians, 0 = right)
//   wall   the set's wall colour: on a pink wall Kit's pink arms and body get
//          a chalk die-cut rim so they don't melt into it
import { C } from './brand.mjs';
import { paper, roundRectPath, cutCirclePath, pinkGradient } from './paper.mjs';
import { onTwos, noise1, hash } from './util.mjs';
import { drawMark, markWidth } from './brandmark.mjs';

const BODY_W = 210, BODY_H = 150, LID_H = 40, LEG_H = 54;

function blinkAmount(t, seed) {
  // A blink roughly every 2.6–3.8s, lasting ~0.14s.
  const period = 2.6 + (hash(seed) % 120) / 100;
  const phase = (t + (hash(seed) % 97) / 40) % period;
  if (phase > 0.14) return 0;
  return Math.sin((phase / 0.14) * Math.PI);
}

// A pink wall: saturated pink, not the pale rose/pearl sets.
function isPink(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  if (!m) return false;
  const [r, g, b] = m.slice(1).map(v => parseInt(v, 16));
  return r > 200 && g < 140 && b > 90;
}

// Chalk under-stroke for a limb on a pink wall (a die-cut sticker edge).
const RIM = 'rgba(250,250,252,0.92)';

function arm(ctx, sx, sy, angle, len, side, holding, rim = false) {
  // Shoulder at (sx, sy); angle measured from straight down, positive = outward.
  const a = side * angle;
  const ex = sx + Math.sin(a) * len;
  const ey = sy + Math.cos(a) * len;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2 + side * 6, (sy + ey) / 2 + 6, ex, ey);
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(60,0,30,0.22)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  if (rim) {
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 28;
    path();
    ctx.stroke();
    ctx.shadowColor = 'transparent';
  }
  ctx.strokeStyle = C.pinkDeep;
  ctx.lineWidth = 20;
  path();
  ctx.stroke();
  ctx.restore();
  paper(ctx, c => cutCirclePath(c, ex, ey, holding ? 17 : 16, { seed: `hand${side}` }), { fill: C.chalk, lift: 0.8, rim: 0.6 });
  return [ex, ey];
}

function eyes(ctx, face, blink, look) {
  const ey = -BODY_H + LID_H - 56;
  const lx = look * 6;
  for (const side of [-1, 1]) {
    const cx = side * 42 + lx;
    ctx.save();
    if (face === 'happy' || face === 'grin' || (face === 'wink' && side === 1)) {
      // Closed, smiling eyes: ^ ^
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, ey + 6, 13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      const big = face === 'wow' ? 1.25 : 1;
      const h = 25 * big * (1 - blink * 0.92);
      const w = 18 * big;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.ellipse(cx, ey, w / 2, Math.max(1.5, h / 2), 0, 0, Math.PI * 2);
      ctx.fill();
      if (blink < 0.5) {
        ctx.fillStyle = C.chalk;
        ctx.beginPath();
        ctx.arc(cx - 3 + look * 2, ey - 6 * big, 4.2 * big, 0, Math.PI * 2);
        ctx.fill();
      }
      if (face === 'focus') {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 13, ey - 22 + side * -3);
        ctx.lineTo(cx + 13, ey - 22 + side * 3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// One mouth shape from the animation set (see lipsync.mjs), centred at
// (mx, my), drawn in Kit's own style: the same soft grin as the happy face —
// a gently smiling top edge and a round bottom — just opening shorter or
// taller, a pink tongue when it's wide, round "o"s for rounded sounds. No
// teeth: on Kit's flat face they read as a slot, not a mouth.
function viseme(ctx, mx, my, shape, open = 1) {
  const k = Math.max(0.65, Math.min(1.2, open));
  const ink = C.ink, tongue = '#FF7DB5';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The grin: w = half width, h = depth below the top edge.
  const grin = (w, h, withTongue = h > 13) => {
    const top = my - 4;
    ctx.beginPath();
    ctx.moveTo(mx - w, top);
    ctx.quadraticCurveTo(mx, top + Math.min(5, h * 0.25), mx + w, top);
    ctx.bezierCurveTo(mx + w * 0.92, top + h * 1.15, mx - w * 0.92, top + h * 1.15, mx - w, top);
    ctx.closePath();
    ctx.fillStyle = ink;
    ctx.fill();
    if (withTongue) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = tongue;
      ctx.beginPath();
      ctx.ellipse(mx, top + h * 0.95, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  const oval = (rx, ry, withTongue) => {
    ctx.beginPath();
    ctx.ellipse(mx, my + 3, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
    if (withTongue) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = tongue;
      ctx.beginPath();
      ctx.ellipse(mx, my + 3 + ry * 0.75, rx * 0.65, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  switch (shape) {
    case 'A': // M B P — a closed smile, a touch tighter than at rest
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(mx, my - 10, 14, Math.PI * 0.22, Math.PI * 0.78);
      ctx.stroke();
      break;
    case 'B': grin(18, 8 * k, false); break;          // most consonants, EE
    case 'G': grin(16, 7, false); break;              // F V
    case 'C': grin(21, 15 * k); break;                // EH AE AH
    case 'H': grin(19, 15 * k); break;                // L
    case 'D': grin(23, 22 * k); break;                // AA — wide open
    case 'E': oval(12, 15 * Math.min(1, k), true); break;   // OH ER
    case 'F': oval(8, 9.5, false); break;             // OO W — small round
    default: // X — at rest: a closed smile
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(mx, my - 6, 16, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
  }
  ctx.restore();
}

function cheeks(ctx, mx, my) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,170,205,0.85)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 74 + mx, my - 6, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function mouth(ctx, face, look, t, talk = null) {
  const my = -BODY_H + LID_H - 22;
  const mx = look * 5;
  // Lip sync: a viseme from lipsync.mjs ({ shape, open }) while narrating.
  if (talk && typeof talk === 'object') {
    // Drawn 1.15× so the shapes still read at phone size.
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(1.15, 1.15);
    ctx.translate(-mx, -my);
    viseme(ctx, mx, my, talk.shape, talk.open);
    ctx.restore();
    cheeks(ctx, mx, my);
    return;
  }
  ctx.save();
  ctx.strokeStyle = C.ink;
  ctx.fillStyle = C.ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7;
  if (face === 'wow') {
    ctx.beginPath();
    ctx.ellipse(mx, my + 4, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (face === 'grin' || face === 'happy') {
    ctx.beginPath();
    ctx.moveTo(mx - 22, my - 2);
    ctx.quadraticCurveTo(mx, my + 30, mx + 22, my - 2);
    ctx.closePath();
    ctx.fill();
    // Tongue.
    ctx.fillStyle = '#FF7DB5';
    ctx.beginPath();
    ctx.ellipse(mx, my + 13, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (face === 'focus') {
    ctx.beginPath();
    ctx.moveTo(mx - 12, my + 4);
    ctx.lineTo(mx + 12, my + 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(mx, my - 6, 16, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
  ctx.restore();
  // Cheeks.
  ctx.save();
  ctx.fillStyle = 'rgba(255,170,205,0.85)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 74 + mx, my - 6, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// The brand "C" as the toolbox handle: a thick arc opening downward into the lid.
function handle(ctx, dark = false) {
  const top = -BODY_H;
  if (dark) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.arc(0, top + 14, 50, Math.PI * 1.0, Math.PI * 2.0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.shadowColor = 'rgba(40,0,20,0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(0, top + 14, 50, Math.PI * 1.0, Math.PI * 2.0);
  ctx.stroke();
  ctx.restore();
}

function pose(name, t) {
  // Returns arm angles (radians from straight down; + = outward) for [left, right].
  const tt = onTwos(t);
  const wig = Math.sin(tt * Math.PI * 2 * 2.2);
  switch (name) {
    case 'wave': return { l: 0.28, r: 2.6 + wig * 0.35 };
    case 'point': return { l: 0.25, r: null };
    case 'cheer': return { l: 2.7 + wig * 0.18, r: 2.7 - wig * 0.18 };
    case 'hold': return { l: 2.85, r: 2.85, holding: true };
    case 'think': return { l: 0.25, r: -1.15 };
    case 'shrug': return { l: 1.75 + wig * 0.05, r: 1.75 - wig * 0.05 };
    case 'type': return { l: -0.9 + wig * 0.12, r: -0.9 - wig * 0.12 };
    case 'walk': return { l: 0.3 + wig * 0.25, r: 0.3 - wig * 0.25 };
    default: return { l: 0.32, r: 0.32 };
  }
}

// Where Kit's pointing (right) shoulder is in world space, so scenes can aim.
export function mascotShoulder({ x, y, s = 1, flip = false }) {
  return { x: x + (flip ? -1 : 1) * (BODY_W / 2 - 6) * s, y: y - (LEG_H + BODY_H - LID_H - 36) * s };
}

export function drawMascot(ctx, { x, y, s = 1, t = 0, pose: poseName = 'idle', face = 'smile', look = 0, flip = false, pointAngle = -0.4, pointAt = null, seed = 'kit', alpha = 1, dark = false, talk = null, wall = null } = {}) {
  const rim = isPink(wall);
  if (pointAt && poseName === 'point') {
    const sh = mascotShoulder({ x, y, s, flip });
    const dx = (pointAt.x - sh.x) * (flip ? -1 : 1);
    pointAngle = Math.atan2(pointAt.y - sh.y, dx);
  }
  const tt = onTwos(t);
  const bounce = poseName === 'cheer' ? Math.abs(Math.sin(tt * Math.PI * 2 * 1.6)) * 16 : 0;
  const bob = Math.sin(tt * Math.PI * 2 * 1.1) * 3.5 + bounce;
  const squash = 1 + Math.sin(tt * Math.PI * 2 * 1.1) * 0.012;
  const blink = face === 'happy' || face === 'grin' ? 0 : blinkAmount(t, seed);
  const p = pose(poseName, t);
  const jitter = noise1(seed, Math.floor(tt * 7.5)) * 0.008;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.globalAlpha *= alpha;

  // Contact shadow on the floor.
  ctx.save();
  const sh = ctx.createRadialGradient(0, 0, 4, 0, 0, 130);
  sh.addColorStop(0, `rgba(60,10,35,${0.28 - bounce * 0.006})`);
  sh.addColorStop(1, 'rgba(60,10,35,0)');
  ctx.fillStyle = sh;
  ctx.scale(1, 0.18);
  ctx.beginPath();
  ctx.arc(0, 0, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Legs + sneakers.
  const walk = poseName === 'walk' ? Math.sin(tt * Math.PI * 2 * 2.2) : 0;
  for (const side of [-1, 1]) {
    const lift = poseName === 'walk' ? Math.max(0, walk * side) * 14 : 0;
    ctx.save();
    ctx.lineCap = 'round';
    if (dark) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(side * 38, -LEG_H - bob);
      ctx.lineTo(side * 40, -16 - lift);
      ctx.stroke();
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(side * 38, -LEG_H - bob);
    ctx.lineTo(side * 40, -16 - lift);
    ctx.stroke();
    ctx.restore();
    paper(ctx, c => {
      c.ellipse(side * 46, -11 - lift, 30, 15, 0, 0, Math.PI * 2);
    }, { fill: C.chalk, lift: 0.6, rim: 0.5 });
    // Sneaker toe cap.
    ctx.save();
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.ellipse(side * 60, -9 - lift, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.translate(0, -LEG_H - bob);
  ctx.rotate(jitter);
  ctx.scale(1 / squash, squash);

  // Back arm (left) drawn behind the body when raised.
  const shoulderY = -BODY_H + LID_H + 36;
  const leftBehind = p.l > 1.6;
  if (leftBehind) arm(ctx, -BODY_W / 2 + 6, shoulderY, p.l, 82, -1, p.holding, rim);

  handle(ctx, dark);

  // Body: rounded box with a slight taper, pink gradient.
  const bodyPath = c => {
    const w = BODY_W, h = BODY_H, taper = 8;
    c.moveTo(-w / 2 + 18, -h);
    c.lineTo(w / 2 - 18, -h);
    c.quadraticCurveTo(w / 2, -h, w / 2, -h + 18);
    c.lineTo(w / 2 - taper, -14);
    c.quadraticCurveTo(w / 2 - taper, 0, w / 2 - taper - 14, 0);
    c.lineTo(-w / 2 + taper + 14, 0);
    c.quadraticCurveTo(-w / 2 + taper, 0, -w / 2 + taper, -14);
    c.lineTo(-w / 2, -h + 18);
    c.quadraticCurveTo(-w / 2, -h, -w / 2 + 18, -h);
    c.closePath();
  };
  paper(ctx, bodyPath, {
    fill: pinkGradient(ctx, -BODY_W / 2, -BODY_H, BODY_W / 2, 0), lift: 1.4, rim: 1.2,
    ...(rim ? { stroke: RIM, strokeWidth: 6 } : {}),
  });

  // Lid band.
  ctx.save();
  ctx.beginPath();
  bodyPath(ctx);
  ctx.clip();
  ctx.fillStyle = 'rgba(160,0,70,0.28)';
  ctx.fillRect(-BODY_W, -BODY_H, BODY_W * 2, LID_H);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-BODY_W, -BODY_H + LID_H, BODY_W * 2, 3);
  ctx.restore();

  // Rivets at the ends of the lid band.
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(side * (BODY_W / 2 - 22), -BODY_H + LID_H / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,0,50,0.35)';
    ctx.beginPath();
    ctx.arc(side * (BODY_W / 2 - 22) + 1.5, -BODY_H + LID_H / 2 + 1.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Face sits below the lid.
  ctx.save();
  ctx.translate(0, 66);
  eyes(ctx, face, blink, look);
  // talk: null = not narrating (face as posed); { shape, open } = lip sync.
  mouth(ctx, face, look, t, talk);
  ctx.restore();

  // The Creators Toolbox mark as a little sticker on the lower corner. It
  // sits on the mirrored corner when Kit is flipped, but always reads the
  // right way round (a mirrored C reads as a backwards "D").
  {
    const mw = markWidth(26), mx = BODY_W / 2 - 34 - mw;
    ctx.save();
    if (flip) {
      ctx.translate(mx + mw / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(mx + mw / 2), 0);
    }
    drawMark(ctx, mx, -42, 26, { fill: 'rgba(255,255,255,0.95)' });
    ctx.restore();
  }

  // Front arms.
  if (!leftBehind) arm(ctx, -BODY_W / 2 + 6, shoulderY, p.l, 82, -1, p.holding, rim);
  if (p.r === null) {
    // Point: right arm extends toward pointAngle (in world space, flipped with the body).
    const len = 96;
    const sx = BODY_W / 2 - 6, sy = shoulderY;
    const ex = sx + Math.cos(pointAngle) * len, ey = sy + Math.sin(pointAngle) * len;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(60,0,30,0.22)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    if (rim) {
      ctx.strokeStyle = RIM;
      ctx.lineWidth = 28;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
    }
    ctx.strokeStyle = C.pinkDeep;
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
    paper(ctx, c => cutCirclePath(c, ex, ey, 16, { seed: 'handp' }), { fill: C.chalk, lift: 0.8, rim: 0.6 });
    // Pointing finger.
    ctx.save();
    ctx.strokeStyle = C.chalk;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.cos(pointAngle) * 24, ey + Math.sin(pointAngle) * 24);
    ctx.stroke();
    ctx.restore();
  } else {
    arm(ctx, BODY_W / 2 - 6, shoulderY, p.r, 82, 1, p.holding, rim);
  }

  ctx.restore();
}

// Where Kit's raised hands are (for props held overhead in the 'hold' pose).
export function mascotHoldPoint({ x, y, s = 1 }) {
  return { x, y: y - (LEG_H + BODY_H + 90) * s };
}

export const MASCOT_HEIGHT = BODY_H + LEG_H + 60;
