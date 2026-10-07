// Paper SFX, synthesised: a swipe on every beat change (the next sheet slides
// in from the right, so the whoosh pans right → left), a card tap when a
// header label slaps on, a shimmer when the hook's confetti fires, soft key
// ticks as the CTA types its keyword and a ding when the Post button lights.
// They are seasoning: each sits well under the voice.
import { rng } from '../util.mjs';
import { RATE, stereo, place, addBus, scaleBus, noise, filter, biquad, svf, eq, reverb, loudness, peakMomentary, mtof, dbToGain } from './dsp.mjs';

const PENTA = [0, 2, 4, 7, 9];

// Moments the picture defines (render.mjs, overlay.drawHeader, scenes/hook.mjs, scenes/cta.mjs).
const TAP_AT = 0.05;          // header label slap, after beat start
const CONFETTI_AT = 0.42;     // hook confetti burst
const TYPE_START = 0.8;       // CTA comment bar starts typing
const PER_LETTER = 0.09;
const POST_AFTER = 0.1;       // Post button lights this long after the last letter

// Loudest momentary (400 ms) loudness of each sound, LU relative to the
// voice's integrated loudness.
const LEVELS = { whoosh: -14, tap: -16, shimmer: -13, tick: -26, ding: -10, verb: -22 };

const STOP_FPS = 15;
const onTwosCeil = t => Math.ceil(t * STOP_FPS - 1e-6) / STOP_FPS;

// Fade the last few ms of every channel so no sound ends on a click.
function tailFade(src, ms = 30) {
  for (const ch of Array.isArray(src) ? src : [src]) {
    const k = Math.min(ch.length, Math.round(ms * RATE / 1000));
    for (let i = 0; i < k; i++) ch[ch.length - 1 - i] *= i / k;
  }
  return src;
}

// ---------------------------------------------------------------- sounds

// Paper swipe: noise with a fibrous flutter through a band-pass that sweeps
// up and back down, over a soft low "air" layer. Returns [L, R].
function whoosh(seed, dur = 0.34) {
  const n = Math.round(dur * RATE);
  const src = noise(n, seed), r = rng(`${seed}:grain`);
  let g = 1, target = 1;
  for (let i = 0; i < n; i++) {
    if (i % 140 === 0) target = 0.5 + r();
    g += (target - g) * 0.03;
    src[i] *= g;
  }
  const air = Float32Array.from(src);
  svf(src, 'bp', i => 520 + 2400 * Math.sin(Math.PI * Math.pow(i / n, 0.8)), 1.2);
  svf(air, 'lp', () => 450, 0.7);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(x, 0.7)), 1.5);
    const y = (src[i] * 0.85 + air[i] * 0.5) * env;
    const a = (0.7 - 1.4 * x + 1) * Math.PI / 4;
    L[i] = y * Math.cos(a) * Math.SQRT2;
    R[i] = y * Math.sin(a) * Math.SQRT2;
  }
  return tailFade([L, R], 10);
}

// Card stock slapped onto the wall: a light "tock" plus a papery crack with
// a tiny flutter after it.
function tap(seed) {
  const n = Math.round(0.14 * RATE);
  const crack = noise(n, seed);
  filter(crack, biquad('bp', 2100, 1.1));
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    ph += 2 * Math.PI * (175 + 130 * Math.exp(-t / 0.01)) / RATE;
    const thump = Math.sin(ph) * Math.exp(-t / 0.022) * Math.min(1, t / 0.0008);
    const c = crack[i] * (Math.exp(-t / 0.005) + (t > 0.012 ? 0.3 * Math.exp(-(t - 0.012) / 0.007) : 0));
    out[i] = thump * 0.45 + c;
  }
  filter(out, biquad('hp', 90, 0.7));
  filter(out, biquad('lp', 6000, 0.7));
  return tailFade(out, 10);
}

// Sparkle: a quick upward scatter of pentatonic glints in the song's key,
// sprayed across the stereo field like the confetti, over a breath of air.
function shimmer(seed, key) {
  const r = rng(seed);
  const n = Math.round(1.5 * RATE);
  const L = new Float32Array(n), R = new Float32Array(n);
  const base = 79 + key - (key > 6 ? 12 : 0);
  const count = 10;
  for (let j = 0; j < count; j++) {
    const k = Math.floor(j * 0.75 + r() * 1.5);
    const f = mtof(base + PENTA[k % 5] + 12 * Math.floor(k / 5));
    const at = Math.round((j * 0.032 + r() * 0.012) * RATE);
    const amp = (1 - (j / count) * 0.45) * (0.7 + r() * 0.3) / 3;
    const tau = 0.16 + r() * 0.14, pan = (r() * 2 - 1) * 0.75;
    const a = (pan + 1) * Math.PI / 4, gl = Math.cos(a) * Math.SQRT2, gr = Math.sin(a) * Math.SQRT2;
    const w = 2 * Math.PI * f / RATE, h2 = f * 2 < 6000 ? 0.22 : 0;
    for (let i = 0; at + i < n; i++) {
      const t = i / RATE;
      const y = amp * Math.min(1, t / 0.002) * Math.exp(-t / tau) * (Math.sin(w * i) + h2 * Math.exp(-t / 0.05) * Math.sin(2 * w * i));
      L[at + i] += y * gl; R[at + i] += y * gr;
    }
  }
  const air = noise(n, `${seed}:air`);
  svf(air, 'bp', i => 3500 + 1500 * (i / n), 0.8);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const y = air[i] * 0.05 * Math.min(1, t / 0.06) * Math.exp(-t / 0.3);
    L[i] += y; R[i] += y;
  }
  return tailFade([L, R]);
}

// Keyboard tick for each typed letter.
function tick(seed) {
  const n = Math.round(0.03 * RATE);
  const out = noise(n, seed);
  filter(out, biquad('bp', 3000, 1.4));
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] = out[i] * Math.exp(-t / 0.0025) + 0.35 * Math.sin(2 * Math.PI * 620 * t) * Math.exp(-t / 0.006);
  }
  filter(out, biquad('lp', 5500, 0.7));
  return tailFade(out, 5);
}

// Bright two-note "ding": the fifth, then the tonic a fourth above it, each a
// soft bell (fundamental plus quickly fading upper partials).
function ding(key) {
  const n = Math.round(2.6 * RATE);
  const out = new Float32Array(n);
  const top = 84 + key - (key > 6 ? 12 : 0);
  for (const [m, at, amp] of [[top - 5, 0, 0.55], [top, 0.075, 1]]) {
    const f = mtof(m), w = 2 * Math.PI * f / RATE, s = Math.round(at * RATE);
    for (let i = 0; s + i < n; i++) {
      const t = i / RATE;
      const y = Math.sin(w * i) * Math.exp(-t / 0.55)
        + 0.32 * Math.sin(2 * w * i) * Math.exp(-t / 0.22)
        + 0.1 * Math.sin(3 * w * i) * Math.exp(-t / 0.1)
        + 0.06 * Math.sin(4.17 * w * i) * Math.exp(-t / 0.05);
      out[s + i] += amp * y * Math.min(1, t / 0.0012);
    }
  }
  return tailFade(out, 120);
}

// ---------------------------------------------------------------- compose

const levelled = (src, target) => {
  const g = dbToGain(target - peakMomentary(src));
  return Array.isArray(src) ? src.map(ch => ch.map(v => v * g)) : src.map(v => v * g);
};

// All SFX for an episode as one stereo bus. `voiceLufs` is the working
// loudness of the voice stem; `key` keeps the tuned sounds in the music's key.
export function composeSfx({ episode, timing, key = 0, voiceLufs, length }) {
  const bus = stereo(length), send = stereo(length);
  const events = [];
  const lv = name => voiceLufs + LEVELS[name];
  const add = (name, t, src, { pan = 0, verb = 0, gain = 1 } = {}) => {
    const s = levelled(src, lv(name));
    place(bus, t, s, gain, pan);
    if (verb) place(send, t, s, gain * verb, pan);
    events.push({ sfx: name, t: +t.toFixed(3) });
  };

  timing.beats.forEach((bt, i) => {
    const beat = episode.beats[i] || {};
    if (i > 0) add('whoosh', bt.start - 0.02, whoosh(`whoosh:${i}`), { verb: 0.15 });
    const prev = i > 0 ? episode.beats[i - 1]?.label : null;
    if (beat.label && beat.label !== prev) add('tap', bt.start + TAP_AT, tap(`tap:${i}`), { verb: 0.12 });
    if (beat.scene === 'hook') add('shimmer', bt.start + CONFETTI_AT, shimmer(`shimmer:${i}`, key), { verb: 0.5 });
    if (beat.scene === 'cta') {
      const word = String(beat.props?.keyword || episode.cta?.keyword || 'TOOLS').toUpperCase();
      // A letter appears on the first 15 fps step past its slot (scenes/cta.mjs).
      for (let j = 1; j <= word.length; j++) {
        add('tick', bt.start + onTwosCeil(TYPE_START + j * PER_LETTER), tick(`tick:${i}:${j}`), { pan: -0.25 + j * 0.03, gain: 0.85 + 0.3 * ((j * 7) % 5) / 5 });
      }
      add('ding', bt.start + TYPE_START + word.length * PER_LETTER + POST_AFTER, ding(key), { pan: 0.35, verb: 0.35 });
    }
  });

  const wet = reverb(send, { room: 0.5, damp: 0.5, width: 1, predelay: 0.012 });
  eq(wet, [['hp', 400, 0.7], ['lp', 6000, 0.7]]);
  const wl = loudness(wet);
  if (Number.isFinite(wl)) scaleBus(wet, dbToGain(lv('verb') - wl));
  addBus(bus, wet);
  return { bus, events };
}
