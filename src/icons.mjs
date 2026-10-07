// Lucide icons — the same set the site uses (lucide-react) — drawn on canvas.
// Icons are 24×24 stroke drawings: 2px stroke, round caps and joins.
//
//   lucideIcon(ctx, 'Sparkles', x, y, 48, { color })   centred at (x, y), 48px box
//   Names are lucide's PascalCase export names ('Smartphone', 'ArrowUpRight'),
//   or kebab-case ('arrow-up-right').
import * as lucide from 'lucide';
import { Path2D } from '@napi-rs/canvas';
import { C } from './brand.mjs';

const pascal = name => String(name).replace(/(^|[-_\s])([a-z0-9])/g, (_, __, c) => c.toUpperCase());

// fx.icon() names → lucide equivalents, so older scenes pick up the site's set.
export const ICON_ALIASES = {
  check: 'Check', x: 'X', bolt: 'Zap', image: 'Image', phone: 'Smartphone', cursor: 'MousePointer2',
  sparkle: 'Sparkles', chat: 'MessageSquare', code: 'Code', play: 'Play', star: 'Star', layers: 'Layers',
  globe: 'Globe', heart: 'Heart', arrow: 'ArrowRight', lock: 'Lock', bell: 'Bell', clock: 'Clock',
  bot: 'Bot', wand: 'WandSparkles', pen: 'PenTool', palette: 'Palette', video: 'Video', music: 'Music',
  mic: 'Mic', send: 'Send', download: 'Download', link: 'Link', search: 'Search', users: 'Users',
  rocket: 'Rocket', gift: 'Gift', terminal: 'SquareTerminal', laptop: 'Laptop', figma: 'Figma',
};

const cache = new Map();

function toPaths(node) {
  const paths = [];
  for (const [tag, a] of node) {
    const p = new Path2D();
    switch (tag) {
      case 'path': paths.push(new Path2D(a.d)); continue;
      case 'circle': p.arc(+a.cx, +a.cy, +a.r, 0, Math.PI * 2); break;
      case 'ellipse': p.ellipse(+a.cx, +a.cy, +a.rx, +a.ry, 0, 0, Math.PI * 2); break;
      case 'line': p.moveTo(+a.x1, +a.y1); p.lineTo(+a.x2, +a.y2); break;
      case 'rect': {
        const x = +a.x || 0, y = +a.y || 0, w = +a.width, h = +a.height, r = Math.min(+a.rx || +a.ry || 0, w / 2, h / 2);
        if (r) p.roundRect(x, y, w, h, r); else p.rect(x, y, w, h);
        break;
      }
      case 'polyline':
      case 'polygon': {
        const pts = String(a.points).trim().split(/[\s,]+/).map(Number);
        for (let i = 0; i < pts.length; i += 2) (i ? p.lineTo : p.moveTo).call(p, pts[i], pts[i + 1]);
        if (tag === 'polygon') p.closePath();
        break;
      }
      default: continue;
    }
    paths.push(p);
  }
  return paths;
}

export function hasIcon(name) {
  const key = ICON_ALIASES[name] || pascal(name);
  return Array.isArray(lucide[key]);
}

export function lucideIcon(ctx, name, x, y, size = 48, { color = C.ink, stroke = 2, fill = null } = {}) {
  const key = ICON_ALIASES[name] || pascal(name);
  if (!cache.has(key)) {
    const node = lucide[key];
    cache.set(key, Array.isArray(node) ? toPaths(node) : null);
  }
  const paths = cache.get(key) || cache.get('Circle') || toPaths(lucide.Circle);
  const s = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(s, s);
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  for (const p of paths) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(p); }
    ctx.stroke(p);
  }
  ctx.restore();
}
