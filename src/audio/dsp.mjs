// Small offline DSP kit for the soundtrack: filters, a windowed-sinc
// resampler, a Freeverb-style room, BS.1770 loudness and a true-peak limiter.
// Everything works on whole Float32Array buffers at RATE and is deterministic.
import { rng } from '../util.mjs';

export const RATE = 48000;

export const dbToGain = db => Math.pow(10, db / 20);
export const gainToDb = g => 20 * Math.log10(Math.max(g, 1e-12));
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export const stereo = n => [new Float32Array(n), new Float32Array(n)];

// Mix `src` (mono or [L, R]) into the stereo `bus` starting at time `t`, with
// an equal-power pan in -1..1 (centre stays at unity gain).
export function place(bus, t, src, gain = 1, pan = 0) {
  const [L, R] = bus;
  const at = Math.round(t * RATE);
  const a = (Math.max(-1, Math.min(1, pan)) + 1) * Math.PI / 4;
  const gl = Math.cos(a) * Math.SQRT2 * gain, gr = Math.sin(a) * Math.SQRT2 * gain;
  const [sl, sr] = Array.isArray(src) ? src : [src, src];
  const from = Math.max(0, -at), to = Math.min(sl.length, L.length - at);
  for (let i = from; i < to; i++) {
    L[at + i] += sl[i] * gl;
    R[at + i] += sr[i] * gr;
  }
}

// Sum `src` bus into `dst` bus with a gain.
export function addBus(dst, src, gain = 1) {
  for (let c = 0; c < 2; c++) for (let i = 0; i < dst[c].length; i++) dst[c][i] += src[c][i] * gain;
}

export function scaleBus(bus, gain) {
  for (const ch of bus) for (let i = 0; i < ch.length; i++) ch[i] *= gain;
}

// Seeded white noise in [-1, 1].
export function noise(n, seed) {
  const r = rng(seed);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = r() * 2 - 1;
  return out;
}

// ---------------------------------------------------------------- filters

// RBJ cookbook biquad coefficients.
export function biquad(type, f, q = 0.707, gainDb = 0) {
  const w = 2 * Math.PI * Math.min(f, RATE * 0.49) / RATE;
  const cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q), A = Math.pow(10, gainDb / 40), sa = 2 * Math.sqrt(A) * al;
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
  else if (type === 'lowshelf') {
    b0 = A * ((A + 1) - (A - 1) * cs + sa); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - sa);
    a0 = (A + 1) + (A - 1) * cs + sa; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - sa;
  } else if (type === 'highshelf') {
    b0 = A * ((A + 1) + (A - 1) * cs + sa); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sa);
    a0 = (A + 1) - (A - 1) * cs + sa; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sa;
  } else throw new Error(`biquad: unknown type ${type}`);
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

// Run a biquad over a buffer in place (transposed direct form II).
export function filter(buf, c) {
  let z1 = 0, z2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i], y = c.b0 * x + z1;
    z1 = c.b1 * x - c.a1 * y + z2;
    z2 = c.b2 * x - c.a2 * y;
    buf[i] = y;
  }
  return buf;
}

// Chain of [type, f, q, gainDb] biquads over every channel of a bus.
export function eq(bus, chain) {
  for (const ch of Array.isArray(bus) ? bus : [bus]) for (const [type, f, q, g] of chain) filter(ch, biquad(type, f, q, g));
  return bus;
}

// Zero-delay-feedback state-variable filter with a cutoff that can move per
// sample (`cutoff(i)` in Hz, re-read every 16 samples). mode: 'lp' | 'bp' | 'hp'.
// The band-pass output is normalised to unity gain at the centre.
export function svf(buf, mode, cutoff, q = 0.707) {
  const k = 1 / q;
  let ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0;
  for (let i = 0; i < buf.length; i++) {
    if ((i & 15) === 0) {
      const g = Math.tan(Math.PI * Math.min(Math.max(cutoff(i), 20), RATE * 0.45) / RATE);
      a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2;
    }
    const v0 = buf[i], v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    buf[i] = mode === 'lp' ? v2 : mode === 'bp' ? k * v1 : v0 - k * v1 - v2;
  }
  return buf;
}

// ---------------------------------------------------------------- resampling

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const sinc = x => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
const blackman = x => (Math.abs(x) >= 1 ? 0 : 0.42 + 0.5 * Math.cos(Math.PI * x) + 0.08 * Math.cos(2 * Math.PI * x));

// Band-limited polyphase resampler (Blackman-windowed sinc, `half` taps per
// side). The cutoff sits just under the lower of the two Nyquists, so 24k→48k
// upsampling leaves no imaging and downsampling no aliasing.
export function resample(x, from, to, half = 32) {
  if (from === to) return Float32Array.from(x);
  const g = gcd(from, to);
  let L = to / g;
  const M = from / g;
  const phases = Math.min(L, 4096);
  const ratio = Math.min(1, to / from);
  const fc = 0.5 * ratio * 0.94;               // cutoff in cycles per input sample
  const span = Math.ceil(half / ratio);        // taps per side, in input samples
  const table = Array.from({ length: phases }, (_, p) => {
    const frac = p / phases;
    const taps = new Float64Array(span * 2);
    let sum = 0;
    for (let j = -span + 1; j <= span; j++) {
      const d = frac - j;
      const v = 2 * fc * sinc(2 * fc * d) * blackman(d / span);
      taps[j + span - 1] = v;
      sum += v;
    }
    for (let j = 0; j < taps.length; j++) taps[j] /= sum; // unity DC gain per phase
    return taps;
  });
  const n = Math.floor(x.length * to / from);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i * M / L;
    const base = Math.floor(pos);
    const taps = table[Math.min(phases - 1, Math.round((pos - base) * phases))];
    let acc = 0;
    for (let j = -span + 1; j <= span; j++) {
      const k = base + j;
      if (k >= 0 && k < x.length) acc += x[k] * taps[j + span - 1];
    }
    out[i] = acc;
  }
  return out;
}

// ---------------------------------------------------------------- effects

// Freeverb (Jezar's public-domain design), retuned for 48 kHz. Returns the wet
// signal only; `width` 0..1 sets stereo spread.
export function reverb(bus, { room = 0.6, damp = 0.5, width = 0.9, predelay = 0.02 } = {}) {
  const scale = RATE / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const spread = 23;
  const fb = room * 0.28 + 0.7, d = damp * 0.4;
  const n = bus[0].length, pd = Math.round(predelay * RATE);
  const input = new Float32Array(n);
  for (let i = pd; i < n; i++) input[i] = (bus[0][i - pd] + bus[1][i - pd]) * 0.015;
  const run = off => {
    const out = new Float32Array(n);
    for (const len of combT) {
      const size = Math.round((len + off) * scale), buf = new Float32Array(size);
      let idx = 0, store = 0;
      for (let i = 0; i < n; i++) {
        const y = buf[idx];
        store = y * (1 - d) + store * d;
        buf[idx] = input[i] + store * fb;
        out[i] += y;
        if (++idx >= size) idx = 0;
      }
    }
    for (const len of apT) {
      const size = Math.round((len + off) * scale), buf = new Float32Array(size);
      let idx = 0;
      for (let i = 0; i < n; i++) {
        const b = buf[idx], x = out[i];
        out[i] = b - x;
        buf[idx] = x + b * 0.5;
        if (++idx >= size) idx = 0;
      }
    }
    return out;
  };
  const l = run(0), r = run(spread);
  const w1 = width / 2 + 0.5, w2 = (1 - width) / 2;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = l[i] * w1 + r[i] * w2; R[i] = r[i] * w1 + l[i] * w2; }
  return [L, R];
}

// Ping-pong feedback delay with a darkening filter in the loop. Wet only.
export function pingPong(bus, { time = 0.4, feedback = 0.3, tone = 3500 } = {}) {
  const n = bus[0].length, D = Math.round(time * RATE);
  const L = new Float32Array(n), R = new Float32Array(n);
  const lp = Math.exp(-2 * Math.PI * tone / RATE);
  let sl = 0, sr = 0;
  for (let i = 0; i < n; i++) {
    const inp = (bus[0][i] + bus[1][i]) * 0.5;
    const dl = i >= D ? L[i - D] : 0, dr = i >= D ? R[i - D] : 0;
    // Left echoes the input, right echoes the left: the repeats bounce L→R→L.
    sl = (inp + dr * feedback) * (1 - lp) + sl * lp;
    sr = dl * (1 - lp) + sr * lp;
    L[i] = sl; R[i] = sr;
  }
  // The first repeat lands one delay late on the left.
  const outL = new Float32Array(n), outR = new Float32Array(n);
  for (let i = D; i < n; i++) { outL[i] = L[i - D]; outR[i] = R[i - D]; }
  return [outL, outR];
}

// Gentle tanh saturation, normalised so small signals pass at unity.
export function saturate(buf, drive = 1.5) {
  const k = Math.tanh(drive);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive) / k;
  return buf;
}

// Loudest momentary (400 ms) loudness of a bus, in LUFS — how loud a short
// sound is heard. Sounds shorter than a block are measured as one block.
export function peakMomentary(bus) {
  const [l, r] = Array.isArray(bus) ? bus : [bus, bus];
  const block = Math.round(0.4 * RATE), hop = Math.round(0.1 * RATE);
  const n = Math.max(l.length, block);
  const L = new Float32Array(n), R = new Float32Array(n);
  L.set(l); R.set(r);
  const kl = kWeight(L), kr = kWeight(R);
  const ps = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) ps[i + 1] = ps[i] + kl[i] * kl[i] + kr[i] * kr[i];
  let best = 0;
  for (let s = 0; s + block <= n; s += hop) best = Math.max(best, (ps[s + block] - ps[s]) / block);
  return best > 0 ? -0.691 + 10 * Math.log10(best) : -Infinity;
}

// ---------------------------------------------------------------- loudness

// ITU-R BS.1770-4 K-weighting, coefficients specified for 48 kHz.
function kWeight(x) {
  const y = Float32Array.from(x);
  filter(y, { b0: 1.53512485958697, b1: -2.69169618940638, b2: 1.19839281085285, a1: -1.69065929318241, a2: 0.73248077421585 });
  filter(y, { b0: 1, b1: -2, b2: 1, a1: -1.99004745483398, a2: 0.99007225036621 });
  return y;
}

// Integrated loudness (LUFS) of a stereo bus with the standard 400 ms / 75 %
// overlap blocks, absolute (-70) and relative (-10 LU) gates. `keep(a, b)`
// optionally restricts the measurement to blocks [a, b) it accepts.
export function loudness(bus, { keep } = {}) {
  const [L, R] = bus;
  const kl = kWeight(L), kr = R === L ? kl : kWeight(R);
  const n = kl.length;
  const ps = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) ps[i + 1] = ps[i] + kl[i] * kl[i] + kr[i] * kr[i];
  const block = Math.round(0.4 * RATE), hop = Math.round(0.1 * RATE);
  const lk = z => -0.691 + 10 * Math.log10(z);
  let zs = [];
  for (let s = 0; s + block <= n; s += hop) {
    if (keep && !keep(s, s + block)) continue;
    zs.push((ps[s + block] - ps[s]) / block);
  }
  zs = zs.filter(z => z > 0 && lk(z) > -70);
  if (!zs.length) return -Infinity;
  const mean = a => a.reduce((p, q) => p + q, 0) / a.length;
  const rel = lk(mean(zs)) - 10;
  const gated = zs.filter(z => lk(z) > rel);
  return lk(mean(gated));
}

// ---------------------------------------------------------------- true peak

// 4× oversampling interpolator (windowed sinc, 12 taps per side) used to find
// inter-sample peaks; returns per-sample |true peak| of the bus (max of L/R).
const TP_HALF = 12;
const TP_TAPS = [0.25, 0.5, 0.75].map(frac => {
  const taps = [];
  for (let j = -TP_HALF + 1; j <= TP_HALF; j++) taps.push(sinc(frac - j) * blackman((frac - j) / TP_HALF));
  return taps;
});

export function truePeaks(bus, floor = 0) {
  const n = bus[0].length;
  const out = new Float32Array(n);
  for (const x of bus) {
    for (let i = 0; i < n; i++) {
      let p = Math.abs(x[i]);
      // Only interpolate where a peak could matter.
      if (p > floor || Math.abs(x[i + 1] || 0) > floor) {
        for (const taps of TP_TAPS) {
          let acc = 0;
          for (let j = -TP_HALF + 1; j <= TP_HALF; j++) {
            const k = i + j;
            if (k >= 0 && k < n) acc += x[k] * taps[j + TP_HALF - 1];
          }
          p = Math.max(p, Math.abs(acc));
        }
      }
      if (p > out[i]) out[i] = p;
    }
  }
  return out;
}

export function truePeakDb(bus) {
  const tp = truePeaks(bus, 0);
  let m = 0;
  for (let i = 0; i < tp.length; i++) if (tp[i] > m) m = tp[i];
  return gainToDb(m);
}

// Look-ahead brick-wall limiter on the 4×-oversampled peak. The gain curve is a
// forward min-filter (so it starts falling `lookahead` before a peak), an
// exponential release, then a box smoother of the same length, which keeps
// the gain at or under what every peak needs while staying click-free.
export function limit(bus, ceilingDb = -1.5, { lookahead = 0.002, release = 0.12 } = {}) {
  const n = bus[0].length, ceil = dbToGain(ceilingDb);
  const tp = truePeaks(bus, ceil * 0.5);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) need[i] = tp[i] > ceil ? ceil / tp[i] : 1;
  const la = Math.max(1, Math.round(lookahead * RATE));
  // Forward sliding minimum over [i, i + la] with a monotonic deque.
  const h = new Float32Array(n);
  const dq = new Int32Array(n);
  let head = 0, tail = 0, next = 0;
  for (let i = 0; i < n; i++) {
    const end = Math.min(n - 1, i + la);
    while (next <= end) {
      while (tail > head && need[dq[tail - 1]] >= need[next]) tail--;
      dq[tail++] = next++;
    }
    while (dq[head] < i) head++;
    h[i] = need[dq[head]];
  }
  const rel = 1 - Math.exp(-1 / (release * RATE));
  for (let i = 1; i < n; i++) h[i] = Math.min(h[i], h[i - 1] + (1 - h[i - 1]) * rel);
  // Box average over [i - la + 1, i]; samples before the start count as 1.
  let acc = la, reduced = 0, deepest = 1;
  for (let i = 0; i < n; i++) {
    acc += h[i] - (i >= la ? h[i - la] : 1);
    const g = Math.min(1, acc / la);
    if (g < 0.944) reduced++;          // more than 0.5 dB of reduction
    if (g < deepest) deepest = g;
    bus[0][i] *= g;
    if (bus[1] !== bus[0]) bus[1][i] *= g;
  }
  return { reducedPct: (100 * reduced) / n, deepestDb: gainToDb(deepest) };
}
