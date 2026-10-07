// Generated music bed: a light "creator tech news" groove — marimba comps, a
// kalimba hook, warm sub bass, a soft kick, claps on 2 & 4 and a shaker on
// 16ths — synthesised sample by sample (no samples, no downloads), so it is
// royalty-free by construction. Key, tempo, progression, patterns and hook are
// seeded by the episode id; the tempo is nudged so the final chord lands just
// after the last spoken word and rings out over the tail.
//
// Arrangement: a gentle first bar (filtered comps, pad swell, shaker fading
// in, a riser), the full groove lifts in on bar 2, the bar before the end
// turns into a cadence (IV or V plus a little run) and the reel resolves on
// the tonic chord, which fades with the last frame.
import { rng, clamp } from '../util.mjs';
import { RATE, stereo, place, addBus, scaleBus, noise, eq, filter, biquad, svf, reverb, pingPong, saturate, loudness, mtof, dbToGain } from './dsp.mjs';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTA = [0, 2, 4, 7, 9];
const KEYS = [0, 2, 3, 5, 7, 9, 10];
const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
const PROGRESSIONS = [[0, 4, 5, 3], [5, 3, 0, 4], [0, 5, 3, 4], [3, 0, 4, 5], [0, 3, 5, 4]];

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
const semi = d => MAJOR[mod(d, 7)] + 12 * Math.floor(d / 7);

// Chord on degree d: triad plus a soft colour tone (add9 on I and V, 7th elsewhere).
function chordOf(d) {
  const ext = d === 0 || d === 4 ? d + 8 : d + 6;
  return { degree: d, root: semi(d), third: semi(d + 2), fifth: semi(d + 4), ext: semi(ext), name: ROMAN[d] };
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

// Pick key, progression and tempo, then nudge the tempo (within 108–118 BPM)
// so a bar line — or failing that a half bar, then a beat — lands where the
// music should resolve.
export function planMusic({ seed, timing, length }) {
  const r = rng(`music:${seed}`);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const key = pick(KEYS);
  const prog = pick(PROGRESSIONS);
  const baseBpm = 108 + r() * 10;
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
        if (n < step || bpm < 108 || bpm > 118) continue;
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
  return {
    key, keyName: KEY_NAMES[key], bpm: fit.bpm, beat, step: beat / 4, beats, nBars, introBeats,
    tLift: introBeats * beat, tRes, end, comp, bass, hook,
    progression: prog.map(d => ROMAN[d]).join('–'),
    chords: degrees.map(chordOf),
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
function marimba(f, { bright = 1, decay = 0.42, len = 1.4 } = {}) {
  const tau = decay * Math.pow(261.6 / f, 0.3);
  const n = Math.round(Math.min(len, tau * 6.5) * RATE);
  const out = new Float32Array(n), w = 2 * Math.PI * f / RATE;
  const p4 = f * 3.98 < 6500 ? 0.14 * bright : 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = (1 - Math.exp(-t / 0.0015)) * Math.exp(-t / tau);
    const idx = (0.25 + 1.1 * bright) * Math.exp(-t / 0.028);
    out[i] = env * (Math.sin(w * i + idx * Math.sin(w * i)) + p4 * Math.exp(-t / 0.045) * Math.sin(w * 3.98 * i));
  }
  return tailFade(out);
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

// ---------------------------------------------------------------- compose

// Per-bus loudness targets (LUFS, before the bed is levelled against the
// voice): plucks and bass carry the track, the kit stays soft, the pad and
// shaker are glue.
const LEVELS = { comp: -23, melody: -25, bass: -25.5, kick: -26, clap: -29.5, pad: -31, shaker: -35.5, fx: -31, verb: -30, echo: -33 };

export function composeMusic({ seed, timing, length }) {
  const plan = planMusic({ seed, timing, length });
  const { key, beat, step, beats, introBeats, tLift, tRes, end, chords } = plan;
  const r = rng(`music-play:${seed}`);
  const jitter = () => (r() - 0.5) * 0.006;            // ±3 ms of hand-played looseness
  const buses = Object.fromEntries(Object.keys(LEVELS).filter(k => !['verb', 'echo'].includes(k)).map(k => [k, stereo(length)]));
  const introSteps = introBeats * 4, steps = beats * 4;
  const bassRoot = m => 36 + mod(key + m - 36, 12);     // C2..B2
  const melTonic = 72 + key - (key > 6 ? 12 : 0);       // tonic of the hook's octave
  const pent = k => melTonic + PENTA[mod(k, 5)] + 12 * Math.floor(k / 5);
  const kickTimes = [];
  // Every pitched note, for logs and checks: [part, seconds, midi].
  const score = [];
  const note = (part, t, m) => { score.push([part, +t.toFixed(3), m]); return mtof(m); };

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
    place(buses.pad, tBar, pad([padRoot, padRoot + 7, padRoot + (ch.third - ch.root) + 12].map(m => note('pad', tBar, m)), barDur + 0.04, { attack: inIntro ? Math.max(0.3, Math.min(barDur, tLift) * 0.8) : 0.12 }), 1);

    for (let k = 0; k < barSteps; k++) {
      const gs = bar0 + k, t = gs * step;
      const intro = gs < introSteps;
      const ip = introSteps ? clamp(gs / introSteps) : 1;   // 0 → 1 across the intro

      // Comps — darker and quieter through the intro, opening up into the lift.
      const hit = plan.comp.find(([s]) => s === k);
      if (hit) {
        const vel = hit[1] * (intro ? 0.55 + 0.45 * ip : 1) * (0.92 + r() * 0.16);
        const bright = intro ? 0.12 + 0.6 * ip * ip : 0.75 + r() * 0.2;
        compNotes.forEach((m, j) => place(buses.comp, t + jitter() + j * 0.004, marimba(note('comp', t, m), { bright }), vel, [-0.32, 0.05, 0.3][j] ?? 0));
      }

      // Shaker: fades in over the second half of the intro, swung 16ths.
      if (gs >= introSteps / 2) {
        const accent = k % 4 === 2 ? 1 : k % 4 === 0 ? 0.55 : 0.38;
        const fade = intro ? clamp((gs - introSteps / 2) / Math.max(1, introSteps / 2)) : 1;
        place(buses.shaker, t + (k % 2 ? step * 0.09 : 0) + jitter() * 0.5, shaker(`sh${gs}`, accent * fade * (0.9 + r() * 0.2)), 1, 0.35);
      }
      if (intro) continue;

      if (kickSteps.includes(k)) { place(buses.kick, t, kick(`k${gs}`, k === 0 ? 1 : 0.82)); kickTimes.push(t); }
      // Clap on 2 and 4, plus a ghost snap into every fourth bar.
      if (k === 4 || k === 12) place(buses.clap, t + jitter() * 0.3, clap(`c${gs}`, 0.95 + r() * 0.1), 1, 0);
      if (k === 15 && b % 4 === 3) place(buses.clap, t, clap(`g${gs}`, 0.35), 1, 0.15);

      // Bass.
      const bn = plan.bass.find(([s]) => s === k);
      if (bn) {
        const [, len, iv] = bn;
        const dur = Math.min(len * step * 0.92, (barSteps - k) * step);
        place(buses.bass, t, subBass(note('bass', t, bassRoot(ch.root) + iv), dur), k === 0 ? 1 : 0.85);
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
        if (k >= barSteps) continue;
        let m = pent(off);
        if ((k % 4 === 0 || len >= 3) && chordPcs.some(c => mod(m - c, 12) === 1)) m = snapTo(m, chordPcs);
        const vel = (k % 4 === 0 ? 1 : 0.82) * (0.9 + r() * 0.15);
        place(buses.melody, tBar + k * step + jitter(), kalimba(note('hook', tBar + k * step, m), { decay: 0.35 + len * 0.05 }), vel, 0.08);
      }
    }
    if (cadence) {
      // Lead-in: a pentatonic run up into the final tonic.
      for (let j = 0; j < 4; j++) {
        const k = barSteps - 4 + j;
        if (k < 0) continue;
        place(buses.melody, tBar + k * step + jitter(), kalimba(note('hook', tBar + k * step, pent(1 + j))), 0.55 + j * 0.12, 0.08);
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
  const tonic = chordOf(0);
  // Open I(add9): fifth, root, third, fifth, ninth — strummed a few ms apart.
  const finalNotes = [55, 60, 64, 67, 74].map(m => m + key - (key > 6 ? 12 : 0));
  finalNotes.forEach((m, j) => place(buses.comp, tRes + j * 0.012, marimba(note('comp', tRes, m), { bright: 0.8, decay: 0.9, len: 3 }), 0.7, [-0.35, 0.3, -0.15, 0.2, 0][j]));
  place(buses.melody, tRes + 0.01, kalimba(note('hook', tRes, pent(5)), { decay: 1.1, len: 3 }), 0.9, 0.08);
  place(buses.bass, tRes, subBass(note('bass', tRes, bassRoot(tonic.root)), Math.max(0.3, end - tRes - 0.2)), 1);
  place(buses.kick, tRes, kick('k-final', 1));
  kickTimes.push(tRes);
  const padRoot = 48 + mod(key - 48, 12);
  place(buses.pad, tRes, pad([padRoot, padRoot + 7, padRoot + 16].map(m => note('pad', tRes, m)), Math.max(0.2, end - tRes - 0.3), { attack: 0.08, release: 0.35 }), 1);

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

  // Fade: a short fade-in against clicks, and the resolution rings out to
  // silence on the last frame.
  const fadeFrom = tRes + 0.35, fadeTo = Math.max(fadeFrom + 0.3, end - 0.03);
  for (let i = 0; i < length; i++) {
    const t = i / RATE;
    let g = Math.min(1, t / 0.02);
    if (t > fadeFrom) g *= t >= fadeTo ? 0 : Math.cos(((t - fadeFrom) / (fadeTo - fadeFrom)) * Math.PI / 2) ** 2;
    out[0][i] *= g; out[1][i] *= g;
  }
  return { bus: out, plan, score };
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
