// Sound effects, synthesised, in sets: each set plays only on moments its looks actually draw, and they are
// seasoning, each well under the voice. The presets in sound.mjs pick one.
//   paper        the paper and studio looks (the house set, unchanged): a swipe on every beat change (the next sheet
//                slides in from the right, so the whoosh pans right → left), a card tap when a header label slaps
//                on, a shimmer when the hook's confetti fires, soft key ticks as the CTA types its keyword and a
//                ding when the Post button lights.
//   cozy         voice-first: a soft chime when the closing ask's keyword lands; a card tap as the opening title
//                settles only with more density. Nothing on cuts.
//   interface    systems that light up: a scan sweep across the opening, a "verified" chime on the payoff and a
//                double blip on the keyword; a two-partial blip as each step lights with more density (otherwise
//                nothing on cuts).
//   engineering  machines and readouts: a servo whine rising into the opening title, a low thunk when the bed drops
//                out on the story's turn and when the keyword locks, count ticks as readouts reset with more density.
//                Nothing on cuts.
//   timelapse    time racing in one place: a swish on every stage change, a short run of clock ticks on the music's
//                beat as each line's counter races and settles, a sparkle on the payoff, a pop on the keyword; a
//                push-in whoosh into the opening and a steady quiet clock on the beat between with more density.
//   minimal      looks that cut hard: a card tap when the headline changes, a pop on the keyword and a soft cut tick
//                on other beat changes with more density.
// A set's moments come in tiers: 'few' plays the first, 'some' the first two, 'lots' all three. Every set but paper
// lands its closing cue where the look draws the keyword (keywordAt), and the time-lapse ticks on the music's beat.
import { rng } from '../util.mjs';
import { RATE, stereo, place, addBus, scaleBus, noise, filter, biquad, svf, eq, reverb, loudness, peakMomentary, mtof, dbToGain } from './dsp.mjs';

const PENTA = [0, 2, 4, 7, 9];

/** The sets this module plays (sound.mjs's presets and `sfx` name them). */
export const SFX_SETS = ['paper', 'cozy', 'interface', 'engineering', 'timelapse', 'minimal'];
const TIERS = { few: 1, some: 2, lots: 3 };

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

// ---------------------------------------------------------------- sounds of the other sets

// Interface blip: two soft partials (about 1.8 kHz over 850 Hz), a 2 ms attack and a 60 ms fall.
function blip(seed, { hi = 1800, lo = 850 } = {}) {
  const r = rng(seed);
  const n = Math.round(0.16 * RATE);
  const out = new Float32Array(n);
  const f1 = hi * (0.98 + r() * 0.04), f2 = lo * (0.98 + r() * 0.04);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] = Math.min(1, t / 0.002) * (Math.sin(2 * Math.PI * f1 * t) * Math.exp(-t / 0.045) + 0.7 * Math.sin(2 * Math.PI * f2 * t) * Math.exp(-t / 0.06));
  }
  return tailFade(out, 8);
}

// A soft two-note chime in the music's key: `rise` true goes up (verified), false steps down (a gentle close).
function chime(key, { rise = true, top = 79 } = {}) {
  const n = Math.round(1.8 * RATE);
  const out = new Float32Array(n);
  const tonic = top + key - (key > 6 ? 12 : 0);
  const notes = rise ? [[tonic - 5, 0, 0.6], [tonic, 0.11, 1]] : [[tonic + 7, 0, 0.7], [tonic, 0.13, 1]];
  for (const [m, at, amp] of notes) {
    const f = mtof(m), w = 2 * Math.PI * f / RATE, s = Math.round(at * RATE);
    for (let i = 0; s + i < n; i++) {
      const t = i / RATE;
      out[s + i] += amp * Math.min(1, t / 0.004) * (Math.sin(w * i) * Math.exp(-t / 0.42) + 0.18 * Math.sin(2 * w * i) * Math.exp(-t / 0.12));
    }
  }
  return tailFade(out, 120);
}

// Scan sweep: a sine gliding 1.2 → 2 kHz over 0.6 s inside a band-pass of air, panned left to right. Returns [L, R].
function sweep(seed, dur = 0.6) {
  const n = Math.round(dur * RATE);
  const air = noise(n, seed);
  svf(air, 'bp', i => 1200 * Math.pow(2000 / 1200, i / n), 2.5);
  const L = new Float32Array(n), R = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    ph += 2 * Math.PI * 1200 * Math.pow(2000 / 1200, x) / RATE;
    const env = Math.sin(Math.PI * Math.pow(x, 0.6)) ** 2;
    const y = env * (0.5 * Math.sin(ph) + 0.6 * air[i]);
    const a = x * Math.PI / 2;
    L[i] = y * Math.cos(a) * Math.SQRT2; R[i] = y * Math.sin(a) * Math.SQRT2;
  }
  return tailFade([L, R], 10);
}

// Clock tick: a 15 ms knock of band-passed noise; `tock` drops it a fifth for the alternate beat.
function clockTick(seed, tock = false) {
  const n = Math.round(0.03 * RATE);
  const out = noise(n, seed);
  filter(out, biquad('bp', tock ? 1550 : 2300, 3));
  for (let i = 0; i < n; i++) { const t = i / RATE; out[i] *= Math.exp(-t / 0.004); }
  return tailFade(out, 4);
}

// Swish: white noise through a band-pass that sweeps 800 Hz → 6 kHz and back, panned across. `dur` long; a longer,
// lower one with a sub under it is the push-in whoosh. Returns [L, R].
function swish(seed, { dur = 0.26, from = 800, to = 6000, sub = 0, dir = 1 } = {}) {
  const n = Math.round(dur * RATE);
  const src = noise(n, seed);
  svf(src, 'bp', i => from * Math.pow(to / from, Math.sin(Math.PI * i / n)), 1.1);
  const L = new Float32Array(n), R = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const x = i / n;
    const env = Math.sin(Math.PI * Math.pow(x, 0.75)) ** 1.6;
    ph += 2 * Math.PI * (70 - 30 * x) / RATE;
    const y = env * (src[i] + sub * Math.sin(ph));
    const a = (dir > 0 ? x : 1 - x) * Math.PI / 2;
    L[i] = y * Math.cos(a) * Math.SQRT2; R[i] = y * Math.sin(a) * Math.SQRT2;
  }
  return tailFade([L, R], 12);
}

// Thunk: a low sine dropping from 110 to 55 Hz under a 1 kHz noise thud, 120 ms: a stamp, a lock, a beat landing.
function thunk(seed) {
  const n = Math.round(0.22 * RATE);
  const thud = noise(n, seed);
  filter(thud, biquad('lp', 1100, 0.7));
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    ph += 2 * Math.PI * (55 + 55 * Math.exp(-t / 0.03)) / RATE;
    out[i] = Math.min(1, t / 0.001) * (Math.sin(ph) * Math.exp(-t / 0.08) + 0.5 * thud[i] * Math.exp(-t / 0.012));
  }
  return tailFade(out, 20);
}

// Servo whine: a soft saw gliding 300 Hz → 1.2 kHz through a low-pass, with a little wobble, swelling in.
function whine(seed, dur = 1.2) {
  const r = rng(seed);
  const n = Math.round(dur * RATE);
  const out = new Float32Array(n);
  const wob = 5 + r() * 2;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE, x = i / n;
    ph += 2 * Math.PI * 300 * Math.pow(4, x) * (1 + 0.006 * Math.sin(2 * Math.PI * wob * t)) / RATE;
    let saw = 0;
    for (let h = 1; h <= 6; h++) saw += Math.sin(h * ph) / h;
    out[i] = saw * Math.pow(x, 1.3) * Math.min(1, (1 - x) / 0.06);
  }
  svf(out, 'lp', i => 900 + 2400 * (i / n), 0.9);
  return tailFade(out, 10);
}

// Pop: a sine rising 300 → 900 Hz over 40 ms, round and short (a bubble, a word landing).
function pop() {
  const n = Math.round(0.09 * RATE);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    ph += 2 * Math.PI * (300 + 600 * Math.min(1, t / 0.04)) / RATE;
    out[i] = Math.sin(ph) * Math.min(1, t / 0.002) * Math.exp(-t / 0.025);
  }
  return tailFade(out, 6);
}

// Cut tick: a dry, low knock, the sound of a hard cut.
function cut(seed) {
  const n = Math.round(0.05 * RATE);
  const out = noise(n, seed);
  filter(out, biquad('bp', 900, 1.2));
  for (let i = 0; i < n; i++) { const t = i / RATE; out[i] = out[i] * Math.exp(-t / 0.005) + 0.4 * Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t / 0.012); }
  return tailFade(out, 6);
}

// ---------------------------------------------------------------- compose

const levelled = (src, target) => {
  const g = dbToGain(target - peakMomentary(src));
  return Array.isArray(src) ? src.map(ch => ch.map(v => v * g)) : src.map(v => v * g);
};

// The other sets' levels (LU under the voice) and their room.
const SET_LEVELS = {
  cozy: { chime: -21, tap: -25, verb: -27 },
  interface: { blip: -22, chime: -18, sweep: -23, verb: -26 },
  engineering: { whine: -21, thunk: -15, count: -27, verb: -27 },
  timelapse: { swish: -18, run: -27, clock: -30, whoosh: -16, sparkle: -14, pop: -16, verb: -24 },
  minimal: { tap: -19, cut: -25, pop: -16, verb: -27 },
};

/**
 * When the closing ask's keyword lands on screen, as the look draws it (`cue`, sound.mjs): 'post' the paper and studio
 * comment bar's Post button lighting once the keyword is typed (scenes/cta.mjs); otherwise as the keyword is said,
 * else soon after the beat starts.
 */
function keywordAt(episode, timing, i, cue = null) {
  const beat = episode.beats[i] || {}, bt = timing.beats[i];
  const word = String(beat.props?.keyword || episode.cta?.keyword || '').toUpperCase();
  if (cue === 'post') return bt.start + TYPE_START + (word || 'TOOLS').length * PER_LETTER + POST_AFTER;
  const said = word && (bt.words ?? []).find(w => String(w.text).replace(/[^\p{L}\p{N}]/gu, '').toUpperCase() === word);
  return (said ? said.start - 0.1 : bt.start + 0.35) + 0.12;
}

/**
 * All SFX for an episode as one stereo bus. `voiceLufs` is the working loudness of the voice stem; `key` keeps the
 * tuned sounds in the music's key. `set` and `density` pick the set and how many of its moments play; `moments` are
 * the story's turn and payoff as the music drops out for them ([from, to] seconds, or null); `closing` is where the
 * look lands the closing ask's keyword (keywordAt); `beat` the music's beat in seconds (its grid starts at 0), or
 * null without music. The paper set keeps its own moments.
 */
export function composeSfx({ episode, timing, key = 0, voiceLufs, length, set = 'paper', density = 'lots', moments = {}, closing = null, beat = null }) {
  if (set !== 'paper') return composeSet({ episode, timing, key, voiceLufs, length, set, density, moments, cue: closing, beat });
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

// The time-lapse counter's run: [eighth notes after the line starts, gain].
const RUN = [[0, 1], [1, 0.85], [2, 0.7], [4, 0.55]];

// The other sets: each moment is [tier, name, time, sound, options]; the density keeps the tiers it allows. A sound
// made once (a blip, a pop) is reused, levelled once.
function composeSet({ episode, timing, key, voiceLufs, length, set, density, moments, cue, beat }) {
  const levels = SET_LEVELS[set] ?? SET_LEVELS.minimal;
  const keepTier = TIERS[density] ?? TIERS.some;
  const bus = stereo(length), send = stereo(length);
  const events = [];
  const made = new Map();
  const once = (id, name, make) => { let s = made.get(id); if (!s) { s = levelled(make(), voiceLufs + levels[name]); made.set(id, s); } return s; };
  const add = (tier, name, t, id, make, { pan = 0, verb = 0, gain = 1 } = {}) => {
    if (tier > keepTier || t < 0 || t * RATE >= length) return;
    const s = once(id, name, make);
    place(bus, t, s, gain, pan);
    if (verb) place(send, t, s, gain * verb, pan);
    events.push({ sfx: name, t: +t.toFixed(3) });
  };
  const beats = timing.beats;
  const ends = beats.map((b, i) => beats[i + 1]?.start ?? timing.duration);
  const closing = episode.beats.findIndex(b => b?.scene === 'cta');
  const content = beats.map((_, i) => i).filter(i => i > 0 && i !== closing);
  const payoff = moments.payoff?.[0] ?? null, pivot = moments.pivot?.[0] ?? null;
  const keyword = () => keywordAt(episode, timing, closing, cue);

  if (set === 'cozy') {
    if (beats[0]) add(2, 'tap', beats[0].start + 0.6, 'tap', () => tap('cozy-tap'), { verb: 0.2 });
    if (closing >= 0 && beats[closing]) add(1, 'chime', keyword(), 'chime', () => chime(key, { rise: false, top: 76 }), { pan: 0.2, verb: 0.4 });
  } else if (set === 'interface') {
    if (beats[0]) add(1, 'sweep', beats[0].start + 0.3, 'sweep', () => sweep('interface-sweep'), { verb: 0.25 });
    content.forEach((i, k) => add(2, 'blip', beats[i].start + 0.08, `blip${k % 3}`, () => blip(`interface-blip:${k % 3}`), { pan: -0.3 + 0.6 * (k / Math.max(1, content.length - 1)), verb: 0.2 }));
    if (payoff !== null) add(1, 'chime', payoff + 0.35, 'chime', () => chime(key), { pan: 0.15, verb: 0.4 });
    if (closing >= 0 && beats[closing]) {
      const t = keyword();
      add(1, 'blip', t, 'ok1', () => blip('interface-ok:1', { hi: 1600, lo: 800 }), { pan: 0.1, verb: 0.2 });
      add(1, 'blip', t + 0.09, 'ok2', () => blip('interface-ok:2', { hi: 2140, lo: 1070 }), { pan: 0.1, verb: 0.2 });
    }
  } else if (set === 'engineering') {
    const title = beats[0] ? Math.min(1.3, (beats[0].voStart ?? beats[0].start) + 0.4) : 0;
    if (beats[0] && title > 0.4) add(1, 'whine', Math.max(0, title - 1.2), 'whine', () => whine('engineering-whine', Math.min(1.2, title)), { verb: 0.15 });
    if (pivot !== null) add(1, 'thunk', pivot, 'thunk', () => thunk('engineering-thunk'), { verb: 0.3 });
    content.forEach(i => { for (let j = 0; j < 4; j++) add(2, 'count', beats[i].start + 0.2 + j * 0.07, `count${j % 2}`, () => clockTick(`engineering-count:${j % 2}`, j % 2 === 1), { pan: 0.25, gain: 1 - j * 0.12 }); });
    if (closing >= 0 && beats[closing]) add(1, 'thunk', keyword(), 'lock', () => thunk('engineering-lock'), { verb: 0.3 });
  } else if (set === 'timelapse') {
    if (beats[0]) add(2, 'whoosh', Math.max(0, beats[0].start), 'push', () => swish('timelapse-push', { dur: 0.7, from: 300, to: 2400, sub: 0.6 }), { verb: 0.2 });
    beats.forEach((bt, i) => { if (i > 0) add(1, 'swish', bt.start - 0.04, `swish${i % 3}`, () => swish(`timelapse-swish:${i % 3}`, { dir: i % 2 ? 1 : -1 }), { verb: 0.15 }); });
    // The ticks keep the music's time: its eighth notes from 0 (music.mjs), else a 125 BPM grid.
    const eighth = (beat ?? 0.48) / 2;
    const next = (t, step) => Math.ceil(t / step - 1e-6) * step;
    const until = payoff ?? Infinity;
    for (const i of content) {
      if (beats[i].start >= until - 0.05) continue;
      // The counter races and settles as the line starts: three eighth notes, then one a beat later, each softer (none
      // into the payoff, where the music drops out).
      const t0 = next(beats[i].start, eighth);
      RUN.forEach(([at, gain], j) => { if (t0 + at * eighth < until - 0.05) add(1, 'run', t0 + at * eighth, `run${j % 2}`, () => clockTick(`timelapse-run:${j % 2}`, j % 2 === 1), { pan: 0.2, gain }); });
      // With more density, a quiet clock keeps time on the beat until the line ends (not into the payoff).
      for (let c = next(t0 + 5 * eighth, 2 * eighth), k = 0; c < Math.min(ends[i] - 0.3, until - 0.1); c += 2 * eighth, k++) add(3, 'clock', c, `clock${k % 2}`, () => clockTick(`timelapse-clock:${k % 2}`, k % 2 === 1), { pan: 0.2 });
    }
    if (payoff !== null) add(1, 'sparkle', payoff + 0.1, 'sparkle', () => shimmer('timelapse-sparkle', key), { verb: 0.5 });
    if (closing >= 0 && beats[closing]) add(1, 'pop', keyword(), 'pop', () => pop(), { verb: 0.2 });
  } else {
    // minimal
    beats.forEach((bt, i) => {
      if (i === 0 || i === closing) return;
      const beat = episode.beats[i] || {}, prev = episode.beats[i - 1]?.label;
      if (beat.label && beat.label !== prev) add(1, 'tap', bt.start + TAP_AT, `tap${i % 3}`, () => tap(`minimal-tap:${i % 3}`), { verb: 0.12 });
      else add(2, 'cut', bt.start, 'cut', () => cut('minimal-cut'));
    });
    if (closing >= 0 && beats[closing]) add(1, 'pop', keyword(), 'pop', () => pop(), { verb: 0.2 });
  }

  events.sort((a, b) => a.t - b.t);
  const wet = reverb(send, { room: 0.55, damp: 0.5, width: 1, predelay: 0.015 });
  eq(wet, [['hp', 400, 0.7], ['lp', 6000, 0.7]]);
  const wl = loudness(wet);
  if (Number.isFinite(wl)) scaleBus(wet, dbToGain(voiceLufs + levels.verb - wl));
  addBus(bus, wet);
  return { bus, events };
}
