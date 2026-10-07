import { isStudio } from './brand.mjs';

// Deterministic helpers. Every frame must render identically on every run, so
// nothing here (or in any scene) may call Math.random() or Date.now().

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const remap = (v, a, b, c, d) => lerp(c, d, invLerp(a, b, v));

export function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — small, fast, seedable.
export function rng(seed) {
  let a = (typeof seed === 'string' ? hash(seed) : seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value in [-1, 1] that is stable for a given (seed, step).
export function noise1(seed, step) {
  const r = rng(hash(`${seed}:${step}`));
  return r() * 2 - 1;
}

export const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: t => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

// Damped spring from 0 → 1, t in seconds. Overshoots a little, settles ~0.6s.
export function spring(t, { freq = 2.2, damp = 0.42 } = {}) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  return 1 - Math.exp(-damp * w * t) * Math.cos(w * Math.sqrt(1 - damp * damp) * t);
}

// Progress of an animation that starts at `start` (s) and lasts `dur` (s).
export const prog = (t, start, dur) => clamp((t - start) / dur);


// Stop-motion: in the paper theme elements move "on twos" (15 fps) so the
// piece feels handmade; the studio theme moves everything at a smooth 30 fps.
export const STOP_FPS = isStudio() ? 30 : 15;
export const onTwos = t => Math.floor(t * STOP_FPS) / STOP_FPS;

// Tiny per-element rotation/offset that changes every stop-motion step —
// the "boil" of hand-placed paper.
export function boil(seed, t, amp = 1) {
  if (isStudio()) return { rot: 0, dx: 0, dy: 0 };
  const step = Math.floor(t * STOP_FPS / 2);
  return {
    rot: noise1(`${seed}r`, step) * 0.006 * amp,
    dx: noise1(`${seed}x`, step) * 1.2 * amp,
    dy: noise1(`${seed}y`, step) * 1.2 * amp,
  };
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function shade(hex, amt) {
  // amt in [-1, 1]: negative darkens, positive lightens.
  const [r, g, b] = hexToRgb(hex);
  const f = c => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return `#${[f(r), f(g), f(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

export function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return `#${a.map((c, i) => Math.round(lerp(c, b[i], t)).toString(16).padStart(2, '0')).join('')}`;
}

// Relative luminance, for picking ink vs chalk text on an arbitrary color.
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
