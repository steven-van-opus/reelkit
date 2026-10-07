// Set backgrounds: a paper wall, a torn paper floor laid over it, and light set
// dressing. Each set is static, so it is drawn once into an offscreen canvas
// and blitted every frame. The canvas is OVERSCAN px bigger than the frame on
// every side, so the camera's drift never uncovers an edge — draw it with
// drawSet(), which puts frame coordinates where they belong.
import { createCanvas } from '@napi-rs/canvas';
import { W, H, C, SETS, BAND, isStudio, THEME, paperSetKey } from './brand.mjs';
import { backdropMark, backdropOrbits, backdropTiles } from './brandmark.mjs';
import { paper, tornRectPath, grainCanvas, roundRectPath, cutCirclePath } from './paper.mjs';
import { rng, shade, rgba } from './util.mjs';

const cache = new Map();
export const OVERSCAN = 32;
const OS = OVERSCAN;

// Blit a set's background with its overscan hanging off the frame.
export function drawSet(ctx, name) {
  ctx.drawImage(drawSetBackground(name), -OS, -OS);
}

function overscanCanvas() {
  const cv = createCanvas(W + OS * 2, H + OS * 2);
  const g = cv.getContext('2d');
  g.translate(OS, OS);
  return { cv, g };
}

function wallpaper(g, set, name) {
  const r = rng(`wall-${name}`);
  if (name === 'rose' || name === 'mint' || name === 'sky') {
    // Soft vertical stripes, like printed wallpaper.
    for (let x = -20 - 96; x < W + OS; x += 96) {
      g.fillStyle = rgba(shade(set.wall, -0.06), 0.55);
      g.fillRect(x, -OS, 40, BAND.floorY + OS);
    }
  } else if (name === 'chalk') {
    // Tiny printed dots.
    g.fillStyle = rgba(shade(set.wall, -0.12), 0.7);
    for (let y = 40 - 54; y < BAND.floorY; y += 54) {
      for (let x = (y / 54) % 2 ? 27 - 54 : -54; x < W + OS; x += 54) {
        g.beginPath();
        g.arc(x, y, 3.2, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (name === 'night') {
    // A paper window with stars and a pink moon.
    paper(g, c => roundRectPath(c, 640, 420, 330, 420, 18), { fill: '#2B2B5C', lift: 1.2, rim: 0.6 });
    g.fillStyle = '#FAFAFC';
    for (let i = 0; i < 26; i++) {
      const x = 660 + r() * 290, y = 440 + r() * 380, s = 1.5 + r() * 3;
      g.globalAlpha = 0.4 + r() * 0.6;
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    paper(g, c => cutCirclePath(c, 880, 520, 46, { seed: 'moon' }), { fill: C.blush, lift: 0.4 });
    g.strokeStyle = shade('#2B2B5C', -0.3);
    g.lineWidth = 14;
    g.strokeRect(640, 420, 330, 420);
    g.beginPath();
    g.moveTo(805, 420); g.lineTo(805, 840);
    g.moveTo(640, 630); g.lineTo(970, 630);
    g.stroke();
  } else if (name === 'pink') {
    // Big soft paper discs — reads like a stage backdrop.
    for (let i = 0; i < 7; i++) {
      const x = r() * W, y = 300 + r() * (BAND.floorY - 500), rad = 90 + r() * 160;
      g.fillStyle = rgba('#FFFFFF', 0.06 + r() * 0.05);
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// Studio sets: a site surface with one BrandBackdrop motif and a clean floor
// plane (a slightly deeper tint with a soft horizon) for Kit to stand on.
function studioBackground(name) {
  const set = SETS[name] || SETS.light;
  const { cv, g } = overscanCanvas();
  const wall = g.createLinearGradient(0, 0, 0, BAND.floorY);
  wall.addColorStop(0, set.wall);
  wall.addColorStop(1, set.wallDeep);
  g.fillStyle = wall;
  g.fillRect(-OS, -OS, W + OS * 2, H + OS * 2);

  // Paper stock on the wall, under the motif.
  if (THEME.texture) {
    g.save();
    // Near-white walls show the grain's mottling as smudges, so they get less.
    g.globalAlpha = set.tone === 'light' ? 0.75 : set.tone === 'neutral' ? 0.42 : 0.6;
    g.fillStyle = g.createPattern(grainCanvas(set.tone === 'light' ? 'dark' : 'light'), 'repeat');
    g.fillRect(-OS, -OS, W + OS * 2, H + OS * 2);
    g.restore();
  }

  const strength = set.tone === 'light' ? 1.1 : 1.25;
  if (set.motif === 'mark') backdropMark(g, { x: 430, y: 760, height: 760, tone: set.tone, strength });
  if (set.motif === 'orbits') backdropOrbits(g, { x: 860, y: 520, scale: 2.1, tone: set.tone, strength: strength * 1.1, width: 2.5 });
  if (set.motif === 'tiles') backdropTiles(g, { x: 430, y: 300, scale: 2.4, tone: set.tone, strength });

  // Floor plane.
  const fl = g.createLinearGradient(0, BAND.floorY, 0, H);
  fl.addColorStop(0, set.floor);
  fl.addColorStop(1, set.floorEdge);
  g.fillStyle = fl;
  g.fillRect(-OS, BAND.floorY, W + OS * 2, H - BAND.floorY + OS);
  // Horizon: a soft shadow line where the floor meets the wall.
  const hz = g.createLinearGradient(0, BAND.floorY - 26, 0, BAND.floorY + 4);
  hz.addColorStop(0, 'rgba(16,16,20,0)');
  hz.addColorStop(1, `rgba(16,16,20,${set.tone === 'light' ? 0.25 : 0.06})`);
  g.fillStyle = hz;
  g.fillRect(-OS, BAND.floorY - 26, W + OS * 2, 30);
  g.fillStyle = set.tone === 'light' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)';
  g.fillRect(-OS, BAND.floorY, W + OS * 2, 2);
  if (THEME.texture) {
    // The floor is a separate sheet: its own grain, offset so it doesn't line up with the wall's.
    g.save();
    g.beginPath();
    g.rect(-OS, BAND.floorY, W + OS * 2, H - BAND.floorY + OS);
    g.clip();
    g.translate(173, 91);
    g.globalAlpha = set.tone === 'light' ? 0.8 : set.tone === 'neutral' ? 0.55 : 0.75;
    g.fillStyle = g.createPattern(grainCanvas(set.tone === 'light' ? 'dark' : 'light'), 'repeat');
    g.fillRect(-200, BAND.floorY - 100, W + 400, H);
    g.restore();
  }
  return cv;
}

export function drawSetBackground(name) {
  if (cache.has(name)) return cache.get(name);
  if (isStudio()) {
    const cv = studioBackground(name);
    cache.set(name, cv);
    return cv;
  }
  // Script set names ('pearl', 'ink', …) resolve to the paper set they look
  // like, so the wallpaper, grain and vignette follow the set, not its name.
  const key = paperSetKey(name);
  const set = SETS[key] || SETS.rose;
  const { cv, g } = overscanCanvas();

  // Wall: vertical gradient, darker toward the floor.
  const wall = g.createLinearGradient(0, 0, 0, BAND.floorY);
  wall.addColorStop(0, set.wall);
  wall.addColorStop(1, set.wallDeep);
  g.fillStyle = wall;
  g.fillRect(-OS, -OS, W + OS * 2, H + OS * 2);
  wallpaper(g, set, key);

  // Wall grain.
  g.save();
  g.globalAlpha = key === 'night' || key === 'pink' ? 0.7 : 1;
  g.fillStyle = g.createPattern(grainCanvas(key === 'night' ? 'dark' : 'light'), 'repeat');
  g.fillRect(-OS, -OS, W + OS * 2, H + OS * 2);
  g.restore();

  // Floor: a sheet of card laid over the wall, torn along its top edge.
  paper(g, c => tornRectPath(c, -OS - 30, BAND.floorY, W + OS * 2 + 60, H - BAND.floorY + OS + 40, { seed: `floor-${key}`, rough: 4, edges: 't' }), {
    fill: set.floor,
    lift: 1.6,
    rim: 1,
  });
  // Floor depth: darker toward the bottom of frame.
  const fl = g.createLinearGradient(0, BAND.floorY, 0, H + OS);
  fl.addColorStop(0, 'rgba(0,0,0,0)');
  fl.addColorStop(1, rgba(shade(set.floorEdge, -0.4), 0.35));
  g.fillStyle = fl;
  g.fillRect(-OS, BAND.floorY + 8, W + OS * 2, H - BAND.floorY + OS);

  // Vignette.
  const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(30,0,20,${key === 'night' ? 0.4 : 0.16})`);
  g.fillStyle = v;
  g.fillRect(-OS, -OS, W + OS * 2, H + OS * 2);

  cache.set(name, cv);
  return cv;
}
