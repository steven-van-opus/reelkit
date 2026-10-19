// Generated music beds, synthesised sample by sample (no samples, no downloads), so they are royalty-free by
// construction. Key, tempo, progression and patterns are seeded by the episode id; the tempo is nudged so the final
// chord lands just after the last spoken word and rings out over the tail.
//
// One planner (key, tempo fit, cadence) and five moods (sound.mjs's presets pick one):
//   groove   a light "creator tech news" groove: marimba comps, a kalimba hook, warm sub bass, a soft kick, claps
//            on 2 & 4 and a shaker on 16ths (the house sound).
//   keys     warm FM electric-piano chords (maj7 and add9) over a round sub, a felt kick and a brush: beat-light and
//            voice-first.
//   ambient  a soft detuned pad, a plucked eighth-note arpeggio and a felt half-time kit with a rim on 3, sus chords
//            resolving home.
//   dark     a minor drone, an eighth-note sub pulse and ticking hats; it drops out for a bar on the story's turn and
//            comes back with a new chord colour and a high sustained tone.
//   pulse    a low-passed, sub-heavy synth pulse on a four-on-the-floor kick that opens a little on every new beat
//            of the story; it drops out under the payoff line.
//
// Arrangement (every mood): a gentle first bar or two, the full bed lifts in, the bar before the end turns into a
// cadence and the reel resolves on the tonic chord, which fades with the last frame. Notes that repeat (the same
// pitch, length and settings) are synthesised once per bed and reused (`memo`), which is most of a bed's time.
import { rng, clamp } from '../util.mjs';
import { RATE, stereo, place, addBus, scaleBus, noise, eq, filter, biquad, svf, reverb, pingPong, saturate, loudness, mtof, dbToGain } from './dsp.mjs';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA = [0, 2, 4, 7, 9];
const PENTA_MINOR = [0, 3, 5, 7, 10];
const KEYS = [0, 2, 3, 5, 7, 9, 10];
const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
const PROGRESSIONS = [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [3, 0, 4, 5], [0, 3, 5, 4]];
const MINOR_PROGRESSIONS = [[0, 5, 2, 6], [0, 3, 5, 6], [0, 5, 3, 4], [0, 6, 5, 6], [5, 6, 0, 0]];

/** The moods this module plays, with their own tempo range and mode (a profile can narrow them). */
export const MOODS = {
  groove: { bpm: [108, 118], mode: 'major' },
  keys: { bpm: [80, 90], mode: 'major' },
  ambient: { bpm: [72, 78], mode: 'major' },
  dark: { bpm: [104, 114], mode: 'minor' },
  pulse: { bpm: [120, 130], mode: 'minor' },
};

// Comp rhythms: [16th step, velocity].
const COMPS = [
  [[0, 0.6], [2, 1], [6, 0.9], [10, 1], [14, 0.85]],
  [[0, 1], [3, 0.8], [6, 0.9], [8, 0.7], [11, 0.85], [14, 0.8]],
  [[0, 1], [3, 0.75], [6, 0.85], [10, 0.9], [12, 0.7]],
];
// Bass lines: [step, length in steps, semitones above the chord root].
const BASSES = [
  [[0, 3, 0], [3, 3, 0], [6, 2, 0], [8, 3, 0], [11, 3, 0], [14, 2, 12]],
  [[0, 6, 0], [6, 2, 0], [8, 6, 0], [14, 2, 7]],
  [[0, 4, 0], [6, 2, 0], [8, 4, 0], [12, 2, 7], [14, 2, 12]],
];
// Two-bar hooks: [step 0–31, length in steps, pentatonic offset from the tonic].
const HOOKS = [
  [[0, 2, 2], [2, 2, 1], [4, 2, 2], [6, 2, 3], [8, 4, 2], [14, 2, 0], [16, 2, 1], [18, 2, 0], [20, 4, -1], [26, 2, 0], [28, 4, 1]],
  [[0, 3, 0], [3, 3, 2], [6, 2, 1], [8, 2, 0], [10, 2, 1], [12, 4, 2], [16, 3, 3], [19, 3, 2], [22, 2, 1], [24, 8, 0]],
  [[2, 2, 2], [4, 2, 3], [6, 4, 4], [12, 2, 3], [14, 2, 2], [16, 4, 1], [22, 2, 2], [24, 2, 1], [26, 6, 0]],
  [[0, 2, 4], [2, 2, 3], [4, 2, 2], [6, 2, 1], [8, 6, 2], [16, 2, 3], [18, 2, 2], [20, 2, 1], [22, 2, 0], [24, 8, -1]],
];

const mod = (a, n) => ((a % n) + n) % n;
// Semitones above the tonic of scale degree d (may run past the octave).
const semiIn = scale => d => scale[mod(d, 7)] + 12 * Math.floor(d / 7);

// Chord on degree d: triad plus a soft colour tone (add9 on I and V, 7th elsewhere), and its 7th and 9th for the
// moods that voice them.
function chordOf(d, scale = MAJOR, roman = ROMAN) {
  const semi = semiIn(scale);
  const ext = d === 0 || d === 4 ? d + 8 : d + 6;
  return { degree: d, root: semi(d), third: semi(d + 2), fifth: semi(d + 4), ext: semi(ext), seventh: semi(d + 6), ninth: semi(d + 8), fourth: semi(d + 3), second: semi(d + 1), name: roman[d] };
}

// Close voicing of pitch classes `pcs` whose average sits nearest `center`,
// with a little weight on smooth movement from the previous voicing.
function voicing(pcs, center, prev) {
  let best = null, bestScore = Infinity;
  for (let base = center - 14; base <= center; base++) {
    const r = pcs.indexOf(mod(base, 12));
    if (r < 0) continue;
    const notes = [base];
    for (let k = 1; k < pcs.length; k++) {
      let m = notes[k - 1] + 1;
      while (mod(m, 12) !== pcs[(r + k) % pcs.length]) m++;
      notes.push(m);
    }
    const mean = notes.reduce((a, b) => a + b, 0) / notes.length;
    let score = Math.abs(mean - center);
    if (prev) score += 0.3 * notes.reduce((a, m, i) => a + Math.abs(m - (prev[i] ?? m)), 0) / notes.length;
    if (score < bestScore) { bestScore = score; best = notes; }
  }
  return best;
}

// ---------------------------------------------------------------- plan

// Pick key, progression and tempo, then nudge the tempo (within the mood's range, 108–118 BPM for the groove) so a
// bar line, or failing that a half bar, then a beat, lands where the music should resolve.
export function planMusic({ seed, timing, length, mood = 'groove', bpm = MOODS[mood]?.bpm ?? MOODS.groove.bpm, mode = MOODS[mood]?.mode ?? 'major' }) {
  const [lo, hi] = bpm;
  const minor = mode === 'minor';
  // The groove keeps its own stream (the same key, tempo and patterns as ever for an episode).
  const r = rng(mood === 'groove' ? `music:${seed}` : `music:${mood}:${seed}`);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const key = pick(KEYS);
  const prog = pick(minor ? MINOR_PROGRESSIONS : PROGRESSIONS);
  const baseBpm = lo + r() * (hi - lo);
  const comp = pick(COMPS), bass = pick(BASSES), hook = pick(HOOKS);
  const end = length / RATE;
  const lastWord = timing.beats.at(-1)?.voEnd ?? end - 1.4;
  const tRes = clamp(lastWord + 0.12, Math.min(2, end * 0.6), end - 0.8);

  // Half bars cost a little: a full bar into the final chord feels most natural.
  let fit = null;
  for (const [steps, penalty] of [[[4, 2], 2], [[1], 0]]) {
    for (const step of steps) {
      const approx = tRes * baseBpm / 60;
      for (const n of [Math.floor(approx / step) * step, Math.ceil(approx / step) * step]) {
        const bpm = n * 60 / tRes, cost = Math.abs(bpm - baseBpm) + (step === 2 ? penalty : 0);
        if (n < step || bpm < lo || bpm > hi) continue;
        if (!fit || cost < fit.cost) fit = { n, bpm, cost };
      }
    }
    if (fit) break;
  }
  if (!fit) { const n = Math.max(2, Math.round(tRes * baseBpm / 60)); fit = { n, bpm: n * 60 / tRes }; }

  const beats = fit.n, beat = 60 / fit.bpm;
  const introBeats = beats >= 12 ? 4 : beats >= 6 ? 2 : 0;
  const nBars = Math.ceil(beats / 4);
  const degrees = Array.from({ length: nBars }, (_, b) => prog[b % 4]);
  // Cadence: the bar before the resolution leads home through IV or V.
  if (nBars >= 2 && degrees[nBars - 1] !== 3 && degrees[nBars - 1] !== 4) degrees[nBars - 1] = degrees[nBars - 2] === 4 ? 3 : 4;
  const scale = minor ? MINOR : MAJOR, roman = minor ? ROMAN_MINOR : ROMAN;
  return {
    mood, mode: minor ? 'minor' : 'major', scale, roman,
    key, keyName: KEY_NAMES[key], bpm: fit.bpm, beat, step: beat / 4, beats, nBars, introBeats,
    tLift: introBeats * beat, tRes, end, comp, bass, hook,
    progression: prog.map(d => roman[d]).join('–'),
    chords: degrees.map(d => chordOf(d, scale, roman)),
  };
}

// ---------------------------------------------------------------- voices

// Fade the last few ms of a voice so truncated notes never click.
function tailFade(out, ms = 12) {
  const k = Math.min(out.length, Math.round(ms * RATE / 1000));
  for (let i = 0; i < k; i++) out[out.length - 1 - i] *= i / k;
  return out;
}

// Marimba-ish FM mallet: a decaying FM index gives the woody attack, plus the
// bar's tuned overtone two octaves up. `bright` 0..1 darkens it for the intro.
// `tables` (marimbaTables) holds what the note's pitch fixes, so repeated pitches skip the sines and exponentials
// they share; the samples are exactly the same either way.
function marimba(f, { bright = 1, decay = 0.42, len = 1.4 } = {}, tables = null) {
  const tau = decay * Math.pow(261.6 / f, 0.3);
  const n = Math.round(Math.min(len, tau * 6.5) * RATE);
  const out = new Float32Array(n), w = 2 * Math.PI * f / RATE;
  const p4 = f * 3.98 < 6500 ? 0.14 * bright : 0;
  if (tables) {
    const { env, s1, s4, e028, e045 } = tables;
    const k = 0.25 + 1.1 * bright;
    for (let i = 0; i < n; i++) out[i] = env[i] * (Math.sin(w * i + k * e028[i] * s1[i]) + p4 * e045[i] * s4[i]);
    return tailFade(out);
  }
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = (1 - Math.exp(-t / 0.0015)) * Math.exp(-t / tau);
    const idx = (0.25 + 1.1 * bright) * Math.exp(-t / 0.028);
    out[i] = env * (Math.sin(w * i + idx * Math.sin(w * i)) + p4 * Math.exp(-t / 0.045) * Math.sin(w * 3.98 * i));
  }
  return tailFade(out);
}

// What marimba() computes for every hit of one pitch: its envelope, its two sines and the shared index and overtone
// decays (`shared`, grown as needed). Float64, so each product rounds exactly as marimba's own loop does.
function marimbaTables(f, { decay = 0.42, len = 1.4 } = {}, shared) {
  const tau = decay * Math.pow(261.6 / f, 0.3);
  const n = Math.round(Math.min(len, tau * 6.5) * RATE);
  const w = 2 * Math.PI * f / RATE;
  if (shared.e028.length < n) {
    shared.e028 = new Float64Array(n); shared.e045 = new Float64Array(n);
    for (let i = 0; i < n; i++) { const t = i / RATE; shared.e028[i] = Math.exp(-t / 0.028); shared.e045[i] = Math.exp(-t / 0.045); }
  }
  const env = new Float64Array(n), s1 = new Float64Array(n), s4 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    env[i] = (1 - Math.exp(-t / 0.0015)) * Math.exp(-t / tau);
    s1[i] = Math.sin(w * i);
    s4[i] = Math.sin(w * 3.98 * i);
  }
  return { env, s1, s4, e028: shared.e028, e045: shared.e045 };
}

// Kalimba-ish tine: ratio-2 FM for the hollow attack and the tine's high,
// fast-dying overtone.
function kalimba(f, { bright = 1, decay = 0.6, len = 2 } = {}) {
  const tau = decay * Math.pow(523.3 / f, 0.4);
  const n = Math.round(Math.min(len, tau * 6.5) * RATE);
  const out = new Float32Array(n), w = 2 * Math.PI * f / RATE;
  const hi = f * 5.95 < 7000 ? 0.09 * bright : 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = (1 - Math.exp(-t / 0.001)) * Math.exp(-t / tau);
    const idx = 0.9 * bright * Math.exp(-t / 0.02);
    out[i] = env * (Math.sin(w * i + idx * Math.sin(2 * w * i)) + hi * Math.exp(-t / 0.025) * Math.sin(w * 5.95 * i));
  }
  return tailFade(out);
}

// Warm sub bass with a plucky 2nd/3rd harmonic so phone speakers still hear the line.
function subBass(f, dur) {
  const n = Math.round((dur + 0.06) * RATE);
  const out = new Float32Array(n), w = 2 * Math.PI * f / RATE;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.005) * Math.exp(-t / 2.5) * (t > dur ? Math.exp(-(t - dur) / 0.018) : 1);
    out[i] = env * (Math.sin(w * i) + 0.3 * Math.exp(-t / 0.25) * Math.sin(2 * w * i) + 0.12 * Math.exp(-t / 0.12) * Math.sin(3 * w * i));
  }
  return tailFade(out, 4);
}

// Soft pad chord: a few gentle partials per note, detuned a hair between
// left and right for width. Returns [L, R].
function pad(freqs, dur, { attack = 0.25, release = 0.3 } = {}) {
  const n = Math.round((dur + release * 4) * RATE);
  const L = new Float32Array(n), R = new Float32Array(n);
  const partials = [[1, 1], [2, 0.22], [3, 0.08], [4, 0.03]];
  for (const f of freqs) {
    for (const [side, det] of [[L, 0.9983], [R, 1.0017]]) {
      for (const [h, a] of partials) {
        const w = 2 * Math.PI * f * h * det / RATE;
        for (let i = 0; i < n; i++) side[i] += a * Math.sin(w * i);
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const a = t < attack ? Math.sin(t / attack * Math.PI / 2) ** 2 : 1;
    const env = a * (t > dur ? Math.exp(-(t - dur) / release) : 1) / freqs.length;
    L[i] *= env; R[i] *= env;
  }
  return [tailFade(L), tailFade(R)];
}

// Soft kick: short pitch-dropping sine with a gentle beater click.
function kick(seed, vel = 1) {
  const n = Math.round(0.45 * RATE);
  const out = new Float32Array(n), click = noise(n, seed);
  filter(click, biquad('lp', 2500, 0.7));
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    ph += 2 * Math.PI * (55 + 80 * Math.exp(-t / 0.03)) / RATE;
    out[i] = vel * (Math.sin(ph) * Math.exp(-t / 0.16) * Math.min(1, t / 0.001) + 0.12 * click[i] * Math.exp(-t / 0.004));
  }
  return tailFade(out);
}

// Clap (three quick bursts and a short tail) layered with a finger snap,
// band-limited so it never gets spitty.
function clap(seed, vel = 1) {
  const n = Math.round(0.35 * RATE);
  const body = noise(n, `${seed}b`), snap = noise(n, `${seed}s`);
  filter(body, biquad('bp', 1400, 0.8)); filter(body, biquad('hp', 500, 0.7));
  filter(snap, biquad('bp', 2600, 1.6));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let e = 0;
    for (const b of [0, 0.008, 0.017]) if (t >= b) e += Math.exp(-(t - b) / 0.0045);
    if (t >= 0.022) e += 0.7 * Math.exp(-(t - 0.022) / 0.085);
    out[i] = vel * (body[i] * e * 1.3 + snap[i] * Math.exp(-t / 0.012) * 0.6);
  }
  filter(out, biquad('lp', 7000, 0.7));
  return tailFade(out);
}

// Shaker: soft-attack band of noise around 5 kHz.
function shaker(seed, vel = 1) {
  const n = Math.round(0.09 * RATE);
  const out = noise(n, seed);
  filter(out, biquad('bp', 5200, 0.9));
  filter(out, biquad('lp', 8500, 0.7));
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] *= vel * Math.sin(Math.min(1, t / 0.007) * Math.PI / 2) * Math.exp(-t / 0.028);
  }
  return tailFade(out);
}

// Filtered-noise riser that sweeps up into a downbeat. Mono.
function riser(seed, dur, { from = 300, to = 3200, q = 1.4 } = {}) {
  const n = Math.round(dur * RATE);
  const out = noise(n, seed);
  svf(out, 'bp', i => from * Math.pow(to / from, i / n), q);
  for (let i = 0; i < n; i++) { const x = i / n; out[i] *= x * x * (1 - Math.pow(x, 24)); }
  return out;
}

// Low "lift" drop: a sine sweeping down under the first downbeat of the groove.
function subDrop(dur = 0.5) {
  const n = Math.round(dur * RATE);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    ph += 2 * Math.PI * (40 + 55 * Math.exp(-t / 0.12)) / RATE;
    out[i] = Math.sin(ph) * Math.min(1, t / 0.004) * Math.exp(-t / 0.18);
  }
  return tailFade(out);
}

// ---- voices of the newer moods (no house output depends on them, so they use cheaper recurrences and wavetables)

// The longest a newer mood's opening pad or drone takes to swell in, seconds: about -12 dB by 0.3 s, so the first
// words land on a bed already there (the references never drop near silence).
const INTRO_ATTACK = 0.9;

const TABLE = 2048;
const waves = new Map();
// One band-limited cycle of the given harmonic amplitudes, kept by its recipe.
function wave(amps) {
  const key = amps.join(',');
  let t = waves.get(key);
  if (!t) {
    t = new Float32Array(TABLE + 1);
    for (let i = 0; i < TABLE; i++) { let v = 0; for (let h = 0; h < amps.length; h++) v += amps[h] * Math.sin(2 * Math.PI * (h + 1) * i / TABLE); t[i] = v; }
    t[TABLE] = t[0];
    waves.set(key, t);
  }
  return t;
}
// Adds `table` at frequency f into `out`, shaped by `env` (one gain per sample), from a phase 0..1.
function addWave(out, table, f, env, phase = 0) {
  const inc = f * TABLE / RATE;
  let ph = phase * TABLE;
  for (let i = 0; i < out.length; i++) {
    const k = ph | 0, x = table[k];
    out[i] += (x + (table[k + 1] - x) * (ph - k)) * env[i];
    ph += inc;
    if (ph >= TABLE) ph -= TABLE;
  }
}
// A soft saw (harmonics at 1/n, tilted down), a darker one and a round sub with a 2nd.
const SOFT_SAW = [1, 0.42, 0.22, 0.13, 0.08, 0.05, 0.03, 0.02];
const DARK_SAW = [1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.13, 0.11, 0.09, 0.08, 0.06, 0.05];
const ROUND = [1, 0.28, 0.08];

// An attack (sin² over `attack`), a hold to `dur` and an exponential release, per sample.
function envelope(n, dur, attack, release, peak = 1) {
  const env = new Float32Array(n);
  const k = Math.exp(-1 / (release * RATE));
  let tail = 1;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const a = t < attack ? Math.sin(t / attack * Math.PI / 2) ** 2 : 1;
    if (t > dur) tail *= k;
    env[i] = peak * a * tail;
  }
  return env;
}

// A pad chord from a wavetable: two voices per side, `cents` apart, for a slow chorus. Returns [L, R].
function synthPad(freqs, dur, { attack = 0.6, release = 0.7, amps = SOFT_SAW, cents = 7 } = {}) {
  const n = Math.round((dur + release * 5) * RATE);
  const env = envelope(n, dur, attack, release, 0.5 / freqs.length);
  const L = new Float32Array(n), R = new Float32Array(n), table = wave(amps);
  const d = Math.pow(2, cents / 1200);
  freqs.forEach((f, j) => {
    addWave(L, table, f / d, env, (j * 0.37) % 1); addWave(L, table, f * d * 1.0004, env, (j * 0.61) % 1);
    addWave(R, table, f * d, env, (j * 0.23) % 1); addWave(R, table, f / d * 0.9996, env, (j * 0.83) % 1);
  });
  return [tailFade(L), tailFade(R)];
}

// FM electric piano (a tine and tone bar): ratio-1 FM whose index falls from a bright bark to a mellow body, a short
// high tine at the attack, lower notes ringing longer, damped at `len`.
function ePiano(f, len) {
  const tau = 1.6 * Math.pow(261.6 / f, 0.45);
  const n = Math.round((len + 0.3) * RATE);
  const out = new Float32Array(n), w = 2 * Math.PI * f / RATE, wt = w * 13.97;
  const kDecay = Math.exp(-1 / (tau * RATE)), kIdx = Math.exp(-1 / (0.16 * RATE)), kTine = Math.exp(-1 / (0.011 * RATE)), kRel = Math.exp(-1 / (0.07 * RATE));
  const tineLen = Math.min(n, Math.round(0.09 * RATE)), stop = Math.round(len * RATE);
  let amp = 1, idx = 1, tine = f * 13.97 < 9000 ? 0.1 : 0, rel = 1;
  for (let i = 0; i < n; i++) {
    const att = i < 96 ? i / 96 : 1;
    const s = Math.sin(w * i);
    out[i] = att * amp * rel * (Math.sin(w * i + (0.32 + 1.25 * idx) * s) + (i < tineLen ? tine * Math.sin(wt * i) : 0));
    amp *= kDecay; idx *= kIdx; tine *= kTine;
    if (i >= stop) rel *= kRel;
  }
  return tailFade(out);
}

// A plucked synth note through a wavetable: a fast attack and an exponential fall, damped at `len` (the pulse bass).
function pluckNote(f, len, { amps = DARK_SAW, decay = 0.22, sustain = 0.35 } = {}) {
  const n = Math.round((len + 0.06) * RATE);
  const env = new Float32Array(n);
  const k = Math.exp(-1 / (decay * RATE)), kr = Math.exp(-1 / (0.012 * RATE)), stop = Math.round(len * RATE);
  let d = 1, r = 1;
  for (let i = 0; i < n; i++) {
    if (i >= stop) r *= kr;
    env[i] = Math.min(1, i / 72) * (sustain + (1 - sustain) * d) * r;
    d *= k;
  }
  const out = new Float32Array(n);
  addWave(out, wave(amps), f, env);
  return tailFade(out, 4);
}

// A sustained tone (the dark bed's high colour after its turn): a near-sine with a slow swell. Returns [L, R].
function tone(f, dur) {
  const n = Math.round((dur + 1.2) * RATE);
  const env = envelope(n, dur, Math.min(1.2, dur * 0.5), 0.35, 0.5);
  const L = new Float32Array(n), R = new Float32Array(n), table = wave([1, 0.06, 0.02]);
  addWave(L, table, f * 0.9994, env); addWave(R, table, f * 1.0006, env, 0.25);
  return [tailFade(L), tailFade(R)];
}

// Felt kick: a soft, round low thump with no beater click.
function feltKick(depth = 1) {
  const n = Math.round(0.4 * RATE);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    ph += 2 * Math.PI * (48 + 34 * depth * Math.exp(-t / 0.045)) / RATE;
    out[i] = Math.sin(ph) * Math.min(1, t / 0.004) * Math.exp(-t / 0.2);
  }
  return tailFade(out);
}

// Closed (or open) hi-hat: high-passed noise with a metallic band, very short.
function hat(seed, decay = 0.035) {
  const n = Math.round((decay * 6) * RATE);
  const out = noise(n, seed);
  filter(out, biquad('hp', 6500, 0.7)); filter(out, biquad('peak', 9800, 1.2, 4));
  const k = Math.exp(-1 / (decay * RATE));
  let e = 1;
  for (let i = 0; i < n; i++) { out[i] *= Math.min(1, i / 24) * e; e *= k; }
  return tailFade(out, 3);
}

// Rim click: a woody knock (two short partials) and a snap of noise.
function rim(seed) {
  const n = Math.round(0.12 * RATE);
  const snap = noise(n, seed);
  filter(snap, biquad('bp', 2400, 1.4));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] = (0.7 * Math.sin(2 * Math.PI * 1720 * t) + 0.5 * Math.sin(2 * Math.PI * 410 * t)) * Math.exp(-t / 0.012) + snap[i] * Math.exp(-t / 0.006);
  }
  return tailFade(out, 4);
}

// Brush: a soft swish of band-limited noise with a slow attack.
function brush(seed) {
  const n = Math.round(0.22 * RATE);
  const out = noise(n, seed);
  filter(out, biquad('bp', 3400, 0.6)); filter(out, biquad('lp', 7000, 0.7));
  for (let i = 0; i < n; i++) { const t = i / RATE; out[i] *= Math.sin(Math.min(1, t / 0.02) * Math.PI / 2) * Math.exp(-t / 0.07); }
  return tailFade(out);
}

// ---------------------------------------------------------------- compose

// Per-bus loudness targets (LUFS, before the bed is levelled against the
// voice): plucks and bass carry the track, the kit stays soft, the pad and
// shaker are glue.
const LEVELS = { comp: -23, melody: -25, bass: -25.5, kick: -26, clap: -29.5, pad: -31, shaker: -35.5, fx: -31, verb: -30, echo: -33 };

/**
 * The music bed as one stereo bus. `mood` picks the bed (MOODS), `bpm` and `mode` narrow its tempo and set its mode
 * (the look's profile), and `drop` is where the arrangement drops out: { kind: 'pivot' | 'payoff', at: [from, to] }
 * in seconds (sound.mjs breakWindow).
 */
export function composeMusic({ seed, timing, length, mood = 'groove', bpm, mode, drop = null }) {
  const plan = planMusic({ seed, timing, length, mood: MOODS[mood] ? mood : 'groove', ...(bpm ? { bpm } : {}), ...(mode ? { mode } : {}) });
  // Notes synthesised once per bed: the same pitch, length and settings come back from here.
  const notes = new Map();
  const memo = (key, make) => { let v = notes.get(key); if (!v) { v = make(); notes.set(key, v); } return v; };
  const ctx = { seed, timing, length, plan, memo, drop: dropWindow(plan, drop) };
  const compose = { groove: composeGroove, keys: composeKeys, ambient: composeAmbient, dark: composeDark, pulse: composePulse }[plan.mood];
  // `drop`: the window the bed actually dropped out for (fitted to its bars), or null.
  return { ...compose(ctx), drop: ctx.drop };
}

// The drop window fitted to the bed's grid: a pivot's one bar from the nearest bar line, a payoff's from beat to beat;
// never inside the intro or the cadence.
function dropWindow(plan, drop) {
  if (!drop?.at) return null;
  const bar = plan.beat * 4;
  const [a, b] = drop.at;
  const pivot = drop.kind === 'pivot';
  const from = pivot ? Math.round(a / bar) * bar : Math.round(a / plan.beat) * plan.beat;
  const to = Math.min(pivot ? from + bar : Math.round(b / plan.beat) * plan.beat, plan.tRes - plan.beat);
  if (from < plan.tLift || to - from < plan.beat) return null;
  return [from, to];
}
const within = (w, t) => !!w && t >= w[0] - 1e-6 && t < w[1] - 1e-6;

// The groove: today's house bed, note for note.
function composeGroove({ seed, length, plan, memo, drop }) {
  const { key, beat, step, beats, introBeats, tLift, tRes, end, chords } = plan;
  const minor = plan.mode === 'minor';
  const r = rng(`music-play:${seed}`);
  const jitter = () => (r() - 0.5) * 0.006;            // ±3 ms of hand-played looseness
  const buses = Object.fromEntries(Object.keys(LEVELS).filter(k => !['verb', 'echo'].includes(k)).map(k => [k, stereo(length)]));
  const introSteps = introBeats * 4, steps = beats * 4;
  const bassRoot = m => 36 + mod(key + m - 36, 12);     // C2..B2
  const melTonic = 72 + key - (key > 6 ? 12 : 0);       // tonic of the hook's octave
  const penta = minor ? PENTA_MINOR : PENTA;
  const pent = k => melTonic + penta[mod(k, 5)] + 12 * Math.floor(k / 5);
  const kickTimes = [];
  // Every pitched note, for logs and checks: [part, seconds, midi].
  const score = [];
  const note = (part, t, m) => { score.push([part, +t.toFixed(3), m]); return mtof(m); };
  // The comps' pitches, each with its marimba tables (marimbaTables), and the bus's other repeated notes.
  const shared = { e028: new Float64Array(0), e045: new Float64Array(0) };
  const comp = (f, bright) => marimba(f, { bright }, memo(`mt:${f}`, () => marimbaTables(f, {}, shared)));
  const tine = (f, opts = {}) => memo(`ka:${f}:${opts.bright}:${opts.decay}:${opts.len}`, () => kalimba(f, opts));
  const sub = (f, dur) => memo(`sb:${f}:${dur}`, () => subBass(f, dur));
  const chord = (freqs, dur, opts) => memo(`pd:${freqs.join(',')}:${dur}:${opts.attack}:${opts.release}`, () => pad(freqs, dur, opts));

  let prevComp = null;
  for (let b = 0; b < plan.nBars; b++) {
    const ch = chords[b];
    const bar0 = b * 16, barSteps = Math.min(16, steps - bar0);
    const tBar = bar0 * step, barDur = barSteps * step;
    const cadence = b === plan.nBars - 1 && plan.nBars >= 2;
    const pcs = [ch.third, ch.fifth, ch.ext].map(x => mod(key + x, 12));
    const compNotes = voicing(pcs, 67, prevComp);
    prevComp = compNotes;
    // Kick on 1 and 3, with the odd syncopated push; a pickup into the resolution.
    const kickSteps = cadence ? [0, 8, 14] : b % 2 === 1 && r() < 0.6 ? [0, 8, 10] : [0, 8];
    const chordPcs = [ch.root, ch.third, ch.fifth, ch.ext].map(x => mod(key + x, 12));

    // Pad: root, fifth and the third an octave up, swelling in over the intro.
    const padRoot = 48 + mod(key + ch.root - 48, 12);
    const inIntro = bar0 < introSteps;
    place(buses.pad, tBar, chord([padRoot, padRoot + 7, padRoot + (ch.third - ch.root) + 12].map(m => note('pad', tBar, m)), barDur + 0.04, { attack: inIntro ? Math.max(0.3, Math.min(barDur, tLift) * 0.8) : 0.12, release: 0.3 }), 1);

    for (let k = 0; k < barSteps; k++) {
      const gs = bar0 + k, t = gs * step;
      const intro = gs < introSteps;
      const ip = introSteps ? clamp(gs / introSteps) : 1;   // 0 → 1 across the intro

      // Comps — darker and quieter through the intro, opening up into the lift.
      const hit = plan.comp.find(([s]) => s === k);
      if (hit) {
        const vel = hit[1] * (intro ? 0.55 + 0.45 * ip : 1) * (0.92 + r() * 0.16);
        const bright = intro ? 0.12 + 0.6 * ip * ip : 0.75 + r() * 0.2;
        compNotes.forEach((m, j) => place(buses.comp, t + jitter() + j * 0.004, comp(note('comp', t, m), bright), vel, [-0.32, 0.05, 0.3][j] ?? 0));
      }

      // Shaker: fades in over the second half of the intro, swung 16ths.
      if (gs >= introSteps / 2) {
        const accent = k % 4 === 2 ? 1 : k % 4 === 0 ? 0.55 : 0.38;
        const fade = intro ? clamp((gs - introSteps / 2) / Math.max(1, introSteps / 2)) : 1;
        place(buses.shaker, t + (k % 2 ? step * 0.09 : 0) + jitter() * 0.5, shaker(`sh${gs}`, accent * fade * (0.9 + r() * 0.2)), 1, 0.35);
      }
      if (intro) continue;
      // Under a drop the comps and pad carry on alone.
      if (within(drop, t)) continue;

      if (kickSteps.includes(k)) { place(buses.kick, t, kick(`k${gs}`, k === 0 ? 1 : 0.82)); kickTimes.push(t); }
      // Clap on 2 and 4, plus a ghost snap into every fourth bar.
      if (k === 4 || k === 12) place(buses.clap, t + jitter() * 0.3, clap(`c${gs}`, 0.95 + r() * 0.1), 1, 0);
      if (k === 15 && b % 4 === 3) place(buses.clap, t, clap(`g${gs}`, 0.35), 1, 0.15);

      // Bass.
      const bn = plan.bass.find(([s]) => s === k);
      if (bn) {
        const [, len, iv] = bn;
        const dur = Math.min(len * step * 0.92, (barSteps - k) * step);
        place(buses.bass, t, sub(note('bass', t, bassRoot(ch.root) + iv), dur), k === 0 ? 1 : 0.85);
      }
    }

    // Hook: two-bar phrase from the lift on; every other four bars it breathes
    // (only the long notes play). A strong or long note that would rub a
    // semitone above a chord tone (the 4th over V, say) moves to a chord tone.
    if (bar0 >= introSteps && !cadence) {
      const rel = Math.floor((bar0 - introSteps) / 16);
      const half = rel % 2, sparse = Math.floor(rel / 4) % 2 === 1;
      for (const [s, len, off] of plan.hook) {
        if (Math.floor(s / 16) !== half || (sparse && len < 4)) continue;
        const k = s % 16;
        if (k >= barSteps || within(drop, tBar + k * step)) continue;
        let m = pent(off);
        if ((k % 4 === 0 || len >= 3) && chordPcs.some(c => mod(m - c, 12) === 1)) m = snapTo(m, chordPcs);
        const vel = (k % 4 === 0 ? 1 : 0.82) * (0.9 + r() * 0.15);
        place(buses.melody, tBar + k * step + jitter(), tine(note('hook', tBar + k * step, m), { decay: 0.35 + len * 0.05 }), vel, 0.08);
      }
    }
    if (cadence) {
      // Lead-in: a pentatonic run up into the final tonic.
      for (let j = 0; j < 4; j++) {
        const k = barSteps - 4 + j;
        if (k < 0) continue;
        place(buses.melody, tBar + k * step + jitter(), tine(note('hook', tBar + k * step, pent(1 + j))), 0.55 + j * 0.12, 0.08);
      }
    }
  }

  // Lift: a riser through the last beat of the intro and a sub drop on the downbeat.
  if (introBeats) {
    const rd = Math.min(beat * 1.5, tLift);
    place(buses.fx, tLift - rd, riser(`riser:${seed}`, rd), 0.8, -0.1);
    place(buses.fx, tLift, subDrop(), 0.9);
  }
  // Ending swell into the resolution.
  const sd = Math.min(beat * 2, tRes - tLift || beat);
  place(buses.fx, tRes - sd, riser(`swell:${seed}`, sd, { from: 250, to: 1800, q: 0.9 }), 0.6, 0.1);

  // Resolution: the tonic chord, wide and ringing, over a held root.
  const tonic = chordOf(0, plan.scale, plan.roman);
  // Open I(add9): fifth, root, third, fifth, ninth — strummed a few ms apart.
  const finalNotes = [55, 60, minor ? 63 : 64, 67, 74].map(m => m + key - (key > 6 ? 12 : 0));
  finalNotes.forEach((m, j) => place(buses.comp, tRes + j * 0.012, marimba(note('comp', tRes, m), { bright: 0.8, decay: 0.9, len: 3 }), 0.7, [-0.35, 0.3, -0.15, 0.2, 0][j]));
  place(buses.melody, tRes + 0.01, tine(note('hook', tRes, pent(5)), { decay: 1.1, len: 3 }), 0.9, 0.08);
  place(buses.bass, tRes, sub(note('bass', tRes, bassRoot(tonic.root)), Math.max(0.3, end - tRes - 0.2)), 1);
  place(buses.kick, tRes, kick('k-final', 1));
  kickTimes.push(tRes);
  const padRoot = 48 + mod(key - 48, 12);
  place(buses.pad, tRes, chord([padRoot, padRoot + 7, padRoot + (minor ? 15 : 16)].map(m => note('pad', tRes, m)), Math.max(0.2, end - tRes - 0.3), { attack: 0.08, release: 0.35 }), 1);

  // Kick-keyed pump on the pad for a little modern movement.
  pump(buses.pad, kickTimes, 3.5);

  // Bus processing.
  saturate(buses.bass[0], 1.3); saturate(buses.bass[1], 1.3);
  eq(buses.bass, [['hp', 45, 0.7], ['lp', 900, 0.7]]);
  eq(buses.comp, [['hp', 180, 0.7], ['peak', 2800, 1, -2]]);
  eq(buses.melody, [['hp', 250, 0.7], ['lp', 6500, 0.7]]);
  eq(buses.pad, [['hp', 180, 0.7], ['lp', 2600, 0.7]]);

  // Level every bus by loudness over the groove so the balance holds for any
  // key, tempo or pattern.
  const keep = blockRange(tLift, tRes);
  for (const [name, bus] of Object.entries(buses)) levelTo(bus, LEVELS[name], name === 'fx' ? null : keep);

  // Sends: a soft room for everything but the low end, and a dotted-8th
  // ping-pong on the hook.
  const send = stereo(length);
  for (const [name, amt] of [['comp', 0.35], ['melody', 0.4], ['clap', 0.3], ['pad', 0.25], ['shaker', 0.15], ['fx', 0.4]]) addBus(send, buses[name], amt);
  const verb = reverb(send, { room: 0.62, damp: 0.55, width: 0.95, predelay: 0.018 });
  eq(verb, [['hp', 280, 0.7], ['lp', 5200, 0.7]]);
  const echo = pingPong(buses.melody, { time: beat * 0.75, feedback: 0.32, tone: 3200 });
  eq(echo, [['hp', 300, 0.7]]);
  levelTo(verb, LEVELS.verb, keep);
  levelTo(echo, LEVELS.echo, keep);

  const out = stereo(length);
  for (const bus of [...Object.values(buses), verb, echo]) addBus(out, bus);

  // Master: tidy sub, a scoop where the voice's warmth lives, soft top.
  eq(out, [['hp', 42, 0.7], ['lowshelf', 100, 0.7, -3], ['peak', 320, 0.9, -2.5], ['highshelf', 5000, 0.7, -3], ['lp', 9500, 0.6]]);

  fadeOut(out, tRes, end);
  return { bus: out, plan, score };
}

// Fade: a short fade-in against clicks, and the resolution rings out to silence on the last frame.
function fadeOut(out, tRes, end) {
  const fadeFrom = tRes + 0.35, fadeTo = Math.max(fadeFrom + 0.3, end - 0.03);
  for (let i = 0; i < out[0].length; i++) {
    const t = i / RATE;
    let g = Math.min(1, t / 0.02);
    if (t > fadeFrom) g *= t >= fadeTo ? 0 : Math.cos(((t - fadeFrom) / (fadeTo - fadeFrom)) * Math.PI / 2) ** 2;
    out[0][i] *= g; out[1][i] *= g;
  }
}

// What the newer moods share: the pitch helpers, the score, the buses levelled over the bed and summed with a room.
function bed(ctx, levels) {
  const { plan, length } = ctx;
  const buses = Object.fromEntries(Object.keys(levels).filter(k => k !== 'verb' && k !== 'echo').map(k => [k, stereo(length)]));
  const score = [];
  const note = (part, t, m) => { score.push([part, +t.toFixed(3), m]); return mtof(m); };
  const pc = x => mod(plan.key + x, 12);
  return { buses, score, note, pc };
}
function mixBed({ plan, length }, buses, levels, { sends, room, echoOf = null, echoTime, master }) {
  const keep = blockRange(plan.tLift, plan.tRes);
  for (const [name, bus] of Object.entries(buses)) levelTo(bus, levels[name], keep);
  const send = stereo(length);
  for (const [name, amt] of sends) if (buses[name]) addBus(send, buses[name], amt);
  const verb = reverb(send, room);
  eq(verb, [['hp', 260, 0.7], ['lp', 5000, 0.7]]);
  levelTo(verb, levels.verb, keep);
  const out = stereo(length);
  for (const bus of Object.values(buses)) addBus(out, bus);
  addBus(out, verb);
  if (echoOf && buses[echoOf]) {
    const echo = pingPong(buses[echoOf], { time: echoTime, feedback: 0.34, tone: 3000 });
    eq(echo, [['hp', 320, 0.7]]);
    levelTo(echo, levels.echo, keep);
    addBus(out, echo);
  }
  eq(out, master);
  fadeOut(out, plan.tRes, plan.end);
  return out;
}

// Keys: warm electric-piano chords (a rootless maj7/9 voicing), struck on 1 and lightly on the "and"s, a round sub on
// the root, a felt kick on 1 and a brush on 2 and 4. Narrow and soft: it sits under a voice that never stops.
const KEYS_LEVELS = { keys: -24, bass: -27, kick: -32, brush: -36, verb: -31 };
const KEYS_RHYTHMS = [[[0, 1], [7, 0.62], [10, 0.78]], [[0, 1], [6, 0.66], [12, 0.6]], [[0, 1], [10, 0.74]]];
function composeKeys(ctx) {
  const { plan, memo, seed, drop } = ctx;
  const { buses, score, note, pc } = bed(ctx, KEYS_LEVELS);
  const r = rng(`music-play:keys:${seed}`);
  const rhythm = KEYS_RHYTHMS[Math.floor(r() * KEYS_RHYTHMS.length)];
  const fifthOn3 = r() < 0.5;
  const { step, beats, introBeats, tRes, end, chords } = plan;
  const steps = beats * 4, introSteps = introBeats * 4;
  const swing = step * 0.12;
  const ep = (f, len) => memo(`ep:${f}:${len}`, () => ePiano(f, len));
  const kk = memo('felt', () => feltKick());
  const br = k => memo(`br${k}`, () => brush(`keys-brush:${k}`));
  let prev = null;
  for (let b = 0; b < plan.nBars; b++) {
    const ch = chords[b];
    const bar0 = b * 16, barSteps = Math.min(16, steps - bar0), tBar = bar0 * step;
    const pcs = [ch.third, ch.fifth, ch.seventh, ch.ninth].map(pc);
    const voiced = voicing(pcs, 63, prev);
    prev = voiced;
    rhythm.forEach(([s, vel], j) => {
      if (s >= barSteps) return;
      const next = rhythm[j + 1]?.[0] ?? 16;
      const len = Math.round(Math.min(next - s, barSteps - s) * step * 0.96 * 1000) / 1000;
      const t = tBar + s * step + (s % 4 === 2 ? swing : 0);
      const v = vel * (bar0 < introSteps ? 0.7 : 1);
      voiced.forEach((m, k) => place(buses.keys, t + k * 0.011 + (r() - 0.5) * 0.008, ep(note('keys', t, m), len), v * (k === voiced.length - 1 ? 0.85 : 1), [-0.18, -0.06, 0.06, 0.18][k] ?? 0));
    });
    if (bar0 + 16 <= introSteps || within(drop, tBar)) continue;
    const root = 36 + mod(pc(ch.root) - 36, 12);
    const f1 = note('bass', tBar, root);
    place(buses.bass, tBar, memo(`sb:${root}:${barSteps}`, () => subBass(f1, barSteps * step * 0.55)), 1);
    if (barSteps > 8) {
      const second = root + (fifthOn3 ? 7 : 0), f3 = note('bass', tBar + 8 * step, second);
      place(buses.bass, tBar + 8 * step, memo(`sb3:${second}:${barSteps}`, () => subBass(f3, (barSteps - 8) * step * 0.8)), 0.8);
    }
    place(buses.kick, tBar, kk, 1);
    if (b % 2 === 1 && barSteps > 10) place(buses.kick, tBar + 10 * step + swing, kk, 0.6);
    for (const s of [4, 12]) if (s < barSteps) place(buses.brush, tBar + s * step, br(s), 0.9, 0.12);
  }
  // Resolution: I maj9 (rootless: third, fifth, seventh, ninth) ringing over the root.
  const t = tRes;
  const tonic = chordOf(0, plan.scale, plan.roman);
  voicing([tonic.third, tonic.fifth, tonic.seventh, tonic.ninth].map(pc), 64, prev).forEach((m, k) => place(buses.keys, t + k * 0.016, ep(note('keys', t, m), Math.max(0.6, end - t)), 0.85, [-0.18, -0.06, 0.06, 0.18][k] ?? 0));
  const root = 36 + mod(pc(0) - 36, 12);
  place(buses.bass, t, subBass(note('bass', t, root), Math.max(0.3, end - t - 0.2)), 1);
  place(buses.kick, t, kk, 0.8);
  // A Rhodes' stereo tremolo, gently.
  tremolo(buses.keys, 4.6, 0.12);
  saturate(buses.bass[0], 1.2); saturate(buses.bass[1], 1.2);
  eq(buses.bass, [['hp', 40, 0.7], ['lp', 700, 0.7]]);
  eq(buses.keys, [['hp', 140, 0.7], ['lowshelf', 300, 0.7, 1.5], ['lp', 6200, 0.7]]);
  const out = mixBed(ctx, buses, KEYS_LEVELS, { sends: [['keys', 0.3], ['brush', 0.2]], room: { room: 0.55, damp: 0.6, width: 0.6, predelay: 0.02 }, master: [['hp', 40, 0.7], ['peak', 320, 0.9, -2], ['highshelf', 4500, 0.7, -3], ['lp', 8500, 0.6]] });
  narrow(out, 0.55);
  return { bus: out, plan, score };
}

// Ambient: a soft detuned pad on sus chords (2nds and 4ths for colour, the bar before home a V sus4), an eighth-note
// arpeggio of soft tines with a dotted-eighth echo, a felt kick on 1 and a rim on 3 (half time) with quiet off-beat
// hats, and a held sub. It resolves to an open I add9.
const AMBIENT_LEVELS = { pad: -27, arp: -27, bass: -28, kick: -30, rim: -33, hat: -38, verb: -28, echo: -32 };
const ARPS = [[0, 1, 2, 3, 2, 1, 3, 2], [0, 2, 1, 3, 0, 2, 3, 1], [3, 2, 1, 0, 1, 2, 3, 2]];
function composeAmbient(ctx) {
  const { plan, memo, seed, drop } = ctx;
  const { buses, score, note, pc } = bed(ctx, AMBIENT_LEVELS);
  const r = rng(`music-play:ambient:${seed}`);
  const arp = ARPS[Math.floor(r() * ARPS.length)];
  const { step, beat, beats, introBeats, tRes, end, chords } = plan;
  const steps = beats * 4, introSteps = introBeats * 4;
  const pluck = f => memo(`pl:${f}`, () => kalimba(f, { bright: 0.45, decay: 0.32, len: 1.2 }));
  const kk = memo('felt', () => feltKick(0.8));
  const rm = memo('rim', () => rim('ambient-rim'));
  const hh = k => memo(`hh${k}`, () => hat(`ambient-hat:${k}`, 0.03));
  const padOf = (freqs, dur, attack) => memo(`ap:${freqs.join(',')}:${dur}:${attack}`, () => synthPad(freqs, dur, { attack, release: 0.9, amps: SOFT_SAW, cents: 6 }));
  for (let b = 0; b < plan.nBars; b++) {
    const ch = chords[b];
    const bar0 = b * 16, barSteps = Math.min(16, steps - bar0), tBar = bar0 * step;
    const cadence = b === plan.nBars - 1 && plan.nBars >= 2;
    // sus2 on most chords, sus4 into the cadence, with the 9th on top.
    const color = cadence ? ch.fourth : ch.second;
    const padRoot = 48 + mod(pc(ch.root) - 48, 12), sus = mod(pc(color) - pc(ch.root), 12);
    // Open: root, fifth, the sus tone an octave up, the fifth above it.
    const freqs = [padRoot, padRoot + 7, padRoot + 12 + sus, padRoot + 19].map(m => note('pad', tBar, m));
    // The intro's pad swells in quickly enough that the hook never opens on near-silence.
    place(buses.pad, tBar, padOf(freqs, barSteps * step + 0.1, bar0 < introSteps ? Math.min(INTRO_ATTACK, barSteps * step * 0.7) : 0.5), 1);
    const base = 64 + mod(pc(ch.root) - 64, 12);
    const tones = [base, base + sus, base + 7, base + 12];
    for (let k = 0; k < barSteps; k += 2) {
      const gs = bar0 + k, t = gs * step;
      const intro = gs < introSteps;
      if (within(drop, t)) continue;
      const m = tones[arp[(k / 2) % arp.length]] + (k >= 8 && b % 2 ? 12 : 0);
      place(buses.arp, t, pluck(note('arp', t, m)), (intro ? 0.35 + 0.5 * gs / Math.max(1, introSteps) : 0.85) * (k % 4 === 0 ? 1 : 0.8), k % 4 === 0 ? -0.25 : 0.25);
      if (intro) continue;
      if (k === 0 || (k === 6 && b % 2 === 1)) place(buses.kick, t, kk, k === 0 ? 1 : 0.7);
      if (k === 8) place(buses.rim, t, rm, 0.9, 0.1);
      place(buses.hat, t + step * 2, hh(k % 4), k % 4 === 0 ? 0.7 : 1, 0.3);
    }
    if (bar0 + 16 <= introSteps || within(drop, tBar)) continue;
    const root = 36 + mod(pc(ch.root) - 36, 12), f = note('bass', tBar, root);
    place(buses.bass, tBar, memo(`sb:${root}:${barSteps}`, () => subBass(f, barSteps * step * 0.94)), 1);
  }
  // Resolution: an open I add9 pad, a last tine and the root.
  const padRoot = 48 + mod(pc(0) - 48, 12);
  place(buses.pad, tRes, synthPad([padRoot, padRoot + 7, padRoot + 14, padRoot + 16].map(m => note('pad', tRes, m)), Math.max(0.4, end - tRes - 0.3), { attack: 0.15, release: 0.6, amps: SOFT_SAW, cents: 6 }), 1.1);
  place(buses.arp, tRes + 0.02, pluck(note('arp', tRes, 76 + mod(pc(0) - 76 + 12, 12))), 0.9, 0);
  place(buses.bass, tRes, subBass(note('bass', tRes, 36 + mod(pc(0) - 36, 12)), Math.max(0.3, end - tRes - 0.2)), 1);
  place(buses.kick, tRes, kk, 0.8);
  // The pad breathes: a slow low-pass sweep.
  for (const ch of buses.pad) svf(ch, 'lp', i => 1100 + 700 * Math.sin(2 * Math.PI * i / (RATE * beat * 8)), 0.8);
  eq(buses.bass, [['hp', 40, 0.7], ['lp', 600, 0.7]]);
  eq(buses.arp, [['hp', 300, 0.7], ['lp', 5500, 0.7]]);
  const out = mixBed(ctx, buses, AMBIENT_LEVELS, { sends: [['pad', 0.35], ['arp', 0.45], ['rim', 0.3]], room: { room: 0.72, damp: 0.5, width: 1, predelay: 0.025 }, echoOf: 'arp', echoTime: beat * 0.75, master: [['hp', 40, 0.7], ['peak', 320, 0.9, -2], ['highshelf', 5000, 0.7, -2.5], ['lp', 9000, 0.6]] });
  // Fairly narrow (side about 20 dB under mid): the width is in the echo, not the pad.
  narrow(out, 0.4);
  return { bus: out, plan, score };
}

// Dark: a minor drone (a dark detuned saw, low-passed), an eighth-note sub pulse on the root (on the beat through the
// intro), a kick on 1 and 3 and ticking sixteenth hats. On the story's turn (`drop`) it falls to the drone alone for a
// bar, then comes back on a new progression with a high sustained tone (the fifth and the octave) over it.
const DARK_LEVELS = { drone: -27, pulse: -25, kick: -27, hat: -34, tone: -32, verb: -29 };
const DARK_TURNS = [[5, 6, 0, 0], [3, 5, 6, 0], [5, 3, 6, 4]];
function composeDark(ctx) {
  const { plan, memo, seed, drop } = ctx;
  const { buses, score, note, pc } = bed(ctx, DARK_LEVELS);
  const r = rng(`music-play:dark:${seed}`);
  const turn = DARK_TURNS[Math.floor(r() * DARK_TURNS.length)];
  const { step, beats, introBeats, tRes, end } = plan;
  const steps = beats * 4, introSteps = introBeats * 4;
  const after = drop ? Math.round(drop[1] / (step * 16)) : Infinity;
  const kk = k => memo(`dk${k}`, () => kick(`dark-kick:${k}`, 1));
  const hh = k => memo(`dh${k}`, () => hat(`dark-hat:${k}`, 0.028));
  const oh = memo('doh', () => hat('dark-open', 0.16));
  const pulse = (f, len) => memo(`dp:${f}:${len}`, () => pluckNote(f, len, { amps: ROUND, decay: 0.14, sustain: 0.3 }));
  const droneOf = (freqs, dur, attack) => memo(`dd:${freqs.join(',')}:${dur}:${attack}`, () => synthPad(freqs, dur, { attack, release: 0.8, amps: DARK_SAW, cents: 9 }));
  for (let b = 0; b < plan.nBars; b++) {
    // After the turn the progression changes colour (the cadence bar keeps leading home).
    const cadence = b === plan.nBars - 1 && plan.nBars >= 2;
    const ch = b >= after && !cadence ? chordOf(turn[(b - after) % 4], plan.scale, plan.roman) : plan.chords[b];
    const bar0 = b * 16, barSteps = Math.min(16, steps - bar0), tBar = bar0 * step;
    const root = 48 + mod(pc(ch.root) - 48, 12);
    const freqs = [root - 12, root, root + 7, root + mod(pc(ch.third) - pc(ch.root), 12) + 12].map(m => note('drone', tBar, m));
    place(buses.drone, tBar, droneOf(freqs, barSteps * step + 0.05, bar0 < introSteps ? Math.min(INTRO_ATTACK, barSteps * step * 0.8) : 0.35), 1);
    if (b >= after) {
      // The new section's sustained tone: the fifth and the octave, high and quiet.
      const top = 72 + mod(pc(ch.root) - 72, 12);
      const f5 = note('tone', tBar, top + 7), f8 = note('tone', tBar, top + 12);
      place(buses.tone, tBar, memo(`dt:${f5}:${barSteps}`, () => tone(f5, barSteps * step)), 1, -0.4);
      place(buses.tone, tBar, memo(`dt:${f8}:${barSteps}`, () => tone(f8, barSteps * step)), 0.7, 0.4);
    }
    const bassRoot = 36 + mod(pc(ch.root) - 36, 12);
    for (let k = 0; k < barSteps; k++) {
      const gs = bar0 + k, t = gs * step;
      if (gs < introSteps) {
        // The intro: the sub pulse on the beat from the first moment, growing, under the drone swelling in, and the
        // hats coming in halfway.
        if (k % 4 === 0) place(buses.pulse, t, pulse(note('pulse', t, bassRoot), step * 1.7), 0.45 + 0.4 * gs / Math.max(1, introSteps));
        if (k % 4 === 2 && gs >= introSteps / 2) place(buses.hat, t, hh(k % 4), 0.4, 0.2);
        continue;
      }
      if (within(drop, t)) continue;
      if (k % 2 === 0) place(buses.pulse, t, pulse(note('pulse', t, bassRoot), step * 1.7), k % 8 === 0 ? 1 : 0.72);
      if (k === 0 || k === 8 || (k === 14 && b % 2 === 1)) place(buses.kick, t, kk(k), k === 14 ? 0.7 : 1);
      place(buses.hat, t, hh(k % 4), k % 4 === 0 ? 0.55 : k % 2 === 0 ? 0.85 : 0.45, k % 2 ? 0.25 : 0.1);
      if (k === 14 && b % 2 === 0) place(buses.hat, t, oh, 0.5, -0.2);
    }
  }
  // Resolution: the tonic drone and a last low hit.
  const root = 48 + mod(pc(0) - 48, 12);
  place(buses.drone, tRes, synthPad([root - 12, root, root + 7, root + (plan.mode === 'minor' ? 15 : 16)].map(m => note('drone', tRes, m)), Math.max(0.4, end - tRes - 0.3), { attack: 0.06, release: 0.6, amps: DARK_SAW, cents: 9 }), 1.1);
  place(buses.pulse, tRes, pluckNote(note('pulse', tRes, 36 + mod(pc(0) - 36, 12)), Math.max(0.3, end - tRes - 0.2), { amps: ROUND, decay: 0.6, sustain: 0.5 }), 1);
  place(buses.kick, tRes, kk(0), 1);
  for (const ch of buses.drone) svf(ch, 'lp', () => 1300, 0.9);
  saturate(buses.pulse[0], 1.6); saturate(buses.pulse[1], 1.6);
  eq(buses.pulse, [['hp', 38, 0.7], ['lp', 900, 0.7]]);
  const out = mixBed(ctx, buses, DARK_LEVELS, { sends: [['drone', 0.3], ['hat', 0.15], ['tone', 0.5]], room: { room: 0.78, damp: 0.45, width: 1, predelay: 0.03 }, master: [['hp', 36, 0.7], ['peak', 330, 0.9, -2.5], ['highshelf', 6000, 0.7, -2], ['lp', 11000, 0.6]] });
  return { bus: out, plan, score };
}

// Pulse: a low drone and an eighth-note synth bass through a low-pass near 420 Hz that opens a little each time the
// story moves on (every beat start), on a soft four-on-the-floor kick. Under the payoff line (`drop`) the pulse and
// kick stop and the drone holds; they come back for the closing.
const PULSE_LEVELS = { drone: -29, pulse: -23, kick: -26, verb: -31 };
function composePulse(ctx) {
  const { plan, memo, seed, drop, timing } = ctx;
  const { buses, score, note, pc } = bed(ctx, PULSE_LEVELS);
  const r = rng(`music-play:pulse:${seed}`);
  const octaveUp = r() < 0.5;
  const { step, beats, introBeats, tRes, end } = plan;
  const steps = beats * 4, introSteps = introBeats * 4;
  const kk = memo('pk', () => kick('pulse-kick', 1));
  const pulse = (f, len) => memo(`pp:${f}:${len}`, () => pluckNote(f, len, { amps: DARK_SAW, decay: 0.12, sustain: 0.45 }));
  const droneOf = (freqs, dur, attack) => memo(`pd:${freqs.join(',')}:${dur}:${attack}`, () => synthPad(freqs, dur, { attack, release: 0.7, amps: SOFT_SAW, cents: 8 }));
  for (let b = 0; b < plan.nBars; b++) {
    const ch = plan.chords[b];
    const bar0 = b * 16, barSteps = Math.min(16, steps - bar0), tBar = bar0 * step;
    const root = 36 + mod(pc(ch.root) - 36, 12);
    place(buses.drone, tBar, droneOf([root + 12, root + 19, root + 24].map(m => note('drone', tBar, m)), barSteps * step + 0.05, bar0 < introSteps ? Math.min(2, barSteps * step * 0.8) : 0.25), 1);
    for (let k = 0; k < barSteps; k += 2) {
      const gs = bar0 + k, t = gs * step;
      if (within(drop, t)) continue;
      const intro = gs < introSteps;
      const m = root + (octaveUp && k % 8 === 6 ? 12 : 0);
      place(buses.pulse, t, pulse(note('pulse', t, m), step * 1.6), (intro ? 0.4 + 0.5 * gs / Math.max(1, introSteps) : 1) * (k % 4 === 0 ? 1 : 0.78));
      if (!intro && k % 4 === 0) place(buses.kick, t, kk, 1);
    }
  }
  const root = 36 + mod(pc(0) - 36, 12);
  place(buses.drone, tRes, synthPad([root + 12, root + 19, root + 24].map(m => note('drone', tRes, m)), Math.max(0.4, end - tRes - 0.3), { attack: 0.05, release: 0.6, amps: SOFT_SAW, cents: 8 }), 1.1);
  place(buses.pulse, tRes, pluckNote(note('pulse', tRes, root), Math.max(0.3, end - tRes - 0.2), { amps: DARK_SAW, decay: 0.5, sustain: 0.4 }), 1);
  place(buses.kick, tRes, kk, 1);
  // The low-pass opens by ~600 Hz on each new beat of the story and settles over a second.
  const opens = (timing.beats ?? []).slice(1).map(b => Math.round(b.start * RATE));
  const lift = new Float32Array(buses.pulse[0].length);
  for (const at of opens) for (let i = 0; i < RATE * 1.4 && at + i < lift.length; i++) lift[at + i] = Math.max(lift[at + i], Math.exp(-i / (RATE * 0.35)));
  for (const ch of buses.pulse) svf(ch, 'lp', i => 420 + 650 * lift[i], 1.1);
  saturate(buses.pulse[0], 1.4); saturate(buses.pulse[1], 1.4);
  for (const ch of buses.drone) svf(ch, 'lp', () => 380, 0.8);
  eq(buses.kick, [['lp', 3000, 0.7]]);
  const out = mixBed(ctx, buses, PULSE_LEVELS, { sends: [['drone', 0.3], ['pulse', 0.12]], room: { room: 0.6, damp: 0.6, width: 0.9, predelay: 0.02 }, master: [['hp', 34, 0.7], ['peak', 300, 0.9, -1.5], ['lp', 3800, 0.6]] });
  return { bus: out, plan, score };
}

// A gentle stereo tremolo (a Rhodes' auto-pan): left and right swing in opposite phase by `depth`.
function tremolo(bus, hz, depth) {
  const w = 2 * Math.PI * hz / RATE;
  for (let i = 0; i < bus[0].length; i++) { const s = depth * Math.sin(w * i); bus[0][i] *= 1 - s; bus[1][i] *= 1 + s; }
}
// Pulls the stereo image toward the middle (`amount` 0 = as is, 1 = mono).
function narrow(bus, amount) {
  for (let i = 0; i < bus[0].length; i++) {
    const m = (bus[0][i] + bus[1][i]) / 2;
    bus[0][i] += (m - bus[0][i]) * amount; bus[1][i] += (m - bus[1][i]) * amount;
  }
}

// Nearest MIDI note to m whose pitch class is in `pcs` (prefers m itself, then down).
function snapTo(m, pcs) {
  for (const d of [0, -1, 1, -2, 2, -3, 3]) if (pcs.includes(mod(m + d, 12))) return m + d;
  return m;
}

// Block filter for loudness(): only 400 ms blocks fully inside [a, b) seconds.
function blockRange(a, b) {
  const A = Math.round(a * RATE), B = Math.round(b * RATE);
  return (s, e) => s >= A && e <= B;
}

function levelTo(bus, target, keep) {
  const lu = loudness(bus, { keep });
  if (Number.isFinite(lu)) scaleBus(bus, dbToGain(target - lu));
}

// Sidechain-style pump: dip `depthDb` at each kick, recover over ~150 ms.
function pump(bus, times, depthDb) {
  const n = bus[0].length, g = new Float32Array(n).fill(1);
  const depth = 1 - dbToGain(-depthDb);
  for (const t of times) {
    const at = Math.round(t * RATE);
    for (let i = 0; i < Math.round(0.4 * RATE) && at + i < n; i++) {
      const x = i / RATE;
      const dip = depth * Math.min(1, x / 0.006) * Math.exp(-x / 0.15);
      g[at + i] = Math.min(g[at + i], 1 - dip);
    }
  }
  for (const ch of bus) for (let i = 0; i < n; i++) ch[i] *= g[i];
}
