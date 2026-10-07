// Lip sync for Kit: which mouth shape to draw on every frame.
//
// Words (aligned to the voice by voices/align.py) are broken into phonemes with
// the CMU pronouncing dictionary (spelling rules for names it doesn't know),
// phonemes map to the classic nine-shape animation mouth set, and each shape
// is laid across the word's time span. The audio's loudness scales how wide
// the open shapes go. Mouths move just ahead of the sound, so shapes lead the
// audio by ~40 ms, and anything shorter than two frames is merged away.
//
//   A  closed, lips pressed (M B P)        B  slightly open, teeth (most consonants, EE)
//   C  open (EH AE AH)                     D  wide open (AA, AY, AW)
//   E  rounded (AO ER OW)                  F  puckered (OO W)
//   G  teeth on lower lip (F V)            H  tongue up (L)
//   X  at rest
import fs from 'fs';
import path from 'path';
import { dictionary } from 'cmu-pronouncing-dictionary';
import { ROOT, FPS } from './brand.mjs';

const VOWEL = {
  AA: 'D', AE: 'C', AH: 'C', AO: 'E', AW: 'D', AY: 'D', EH: 'C', ER: 'E', EY: 'C',
  IH: 'B', IY: 'B', OW: 'E', OY: 'E', UH: 'F', UW: 'F',
};
// Diphthongs close toward a second shape.
const GLIDE = { AW: 'F', AY: 'B', EY: 'B', OW: 'F', OY: 'B' };
const CONSONANT = { B: 'A', M: 'A', P: 'A', F: 'G', V: 'G', L: 'H', W: 'F', R: 'E' };
const STOPS = new Set(['B', 'P', 'T', 'D', 'K', 'G']);

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

// "2.1" → ["two", "point", "one"]; "4K" → ["four", "k"]; "8:1" → ["eight", "to", "one"].
function spokenParts(word) {
  const w = word.toLowerCase().replace(/[^a-z0-9.:'+]/g, '');
  if (!/\d/.test(w)) return w.split(/[+]/).filter(Boolean);
  return w.split(/(\d+|[.:+])/).filter(Boolean).flatMap(p => {
    if (/^\d+$/.test(p)) return Number(p) <= 20 ? [NUMBER_WORDS[Number(p)]] : p.split('').map(d => NUMBER_WORDS[Number(d)]);
    return p === '.' ? ['point'] : p === ':' ? ['to'] : p === '+' ? ['plus'] : [p];
  });
}

// Letter rules for words the dictionary doesn't have ("Figma", "Higgsfield").
function guessPhones(word) {
  const out = [];
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  for (let i = 0; i < w.length; i++) {
    const c = w[i], n = w[i + 1];
    if ('aeiouy'.includes(c)) {
      if (c === 'o' && n === 'o') { out.push('UW1'); i++; continue; }
      if (c === 'e' && n === 'e') { out.push('IY1'); i++; continue; }
      out.push({ a: 'AE1', e: 'EH1', i: 'IH1', o: 'AO1', u: 'AH1', y: 'IY1' }[c]);
      if (c === 'e' && i === w.length - 1 && out.length > 1) out.pop(); // silent final e
    } else if (c === 'p' && n === 'h') { out.push('F'); i++; }
    else if (c === 't' && n === 'h') { out.push('TH'); i++; }
    else if (c === 's' && n === 'h') { out.push('SH'); i++; }
    else if (c === 'c' && n === 'h') { out.push('CH'); i++; }
    else if (c === n) { /* doubled letter: one sound */ }
    else out.push({ b: 'B', c: 'K', d: 'D', f: 'F', g: 'G', h: 'HH', j: 'JH', k: 'K', l: 'L', m: 'M', n: 'N', p: 'P', q: 'K', r: 'R',
      s: 'S', t: 'T', v: 'V', w: 'W', x: 'K', z: 'Z' }[c] || 'T');
  }
  return out;
}

function phonesFor(word) {
  return spokenParts(word).flatMap(p => {
    const entry = dictionary[p] || dictionary[p.replace(/'s$/, '')];
    return entry ? entry.split(' ') : guessPhones(p);
  });
}

// [{ shape, start, end }] for one word spoken over [start, end].
function wordShapes(text, start, end) {
  const phones = phonesFor(text);
  if (!phones.length) return [{ shape: 'C', start, end }];
  const units = [];
  for (const ph of phones) {
    const base = ph.replace(/\d/, '');
    const stressed = /1/.test(ph);
    if (VOWEL[base]) {
      const w = stressed ? 1.8 : 1.3;
      if (GLIDE[base]) units.push({ shape: VOWEL[base], w: w * 0.65 }, { shape: GLIDE[base], w: w * 0.35 });
      else units.push({ shape: VOWEL[base], w });
    } else {
      units.push({ shape: CONSONANT[base] || 'B', w: STOPS.has(base) ? 0.6 : 0.85 });
    }
  }
  const total = units.reduce((a, u) => a + u.w, 0);
  let t = start;
  return units.map(u => {
    const d = ((end - start) * u.w) / total;
    const seg = { shape: u.shape, start: t, end: t + d };
    t += d;
    return seg;
  });
}

const OPEN_SHAPES = new Set(['C', 'D', 'E', 'H']);
const LEAD = 0.04;       // mouths move before the sound
const REST_GAP = 0.12;   // pauses longer than this close the mouth

// words: [{ text, start, end }] absolute; envelope: per-frame loudness 0..1.
export function visemeTrack(words, frames, fps, envelope = null) {
  const segs = [];
  words.forEach((w, i) => {
    segs.push(...wordShapes(w.text, w.start, w.end));
    const next = words[i + 1];
    // Short gaps inside a phrase keep the mouth slightly open, long ones rest.
    if (next && next.start - w.end > 0 && next.start - w.end <= REST_GAP) segs.push({ shape: 'B', start: w.end, end: next.start });
  });

  // Frame f shows the mouth for the speech at f/fps + lead (seconds, any
  // value — not whole frames), gated by how loud the voice is at that moment.
  const build = lead => {
    const track = new Array(frames);
    let k = 0;
    for (let f = 0; f < frames; f++) {
      const t = f / fps + lead;
      while (k < segs.length && segs[k].end <= t) k++;
      const seg = segs[k] && segs[k].start <= t ? segs[k] : null;
      let shape = seg ? seg.shape : 'X';
      // The audio has the last word: the mouth only opens as far as the voice
      // is loud at that moment, so it narrows and closes on real syllable gaps.
      const loud = envelope ? envelope[Math.max(0, Math.min(envelope.length - 1, Math.round(t * fps)))] : 1;
      if (seg && envelope) {
        if (loud < 0.05) shape = shape === 'A' ? 'A' : 'X';
        else if (OPEN_SHAPES.has(shape) && loud < 0.22) shape = 'B';
      }
      track[f] = { shape, open: shape === 'X' ? 0 : 0.7 + 0.45 * Math.min(1, loud) };
    }
    // Merge one-frame flickers into the neighbouring shape.
    for (let f = 1; f < frames - 1; f++) {
      if (track[f].shape !== track[f - 1].shape && track[f].shape !== track[f + 1].shape && track[f - 1].shape === track[f + 1].shape) {
        track[f] = { ...track[f], shape: track[f - 1].shape };
      }
    }
    return track;
  };

  if (!envelope) return build(LEAD + leadMs() / 1000);
  // Measure how far this track's mouth already leads the voice, then sample
  // the speech exactly far enough ahead that it leads by leadMs().
  const base = build(LEAD);
  return build(LEAD + leadMs() / 1000 - measuredLead(base, envelope) / fps);
}

// How open each shape reads, for matching the mouth against the voice.
const OPENNESS = { C: 1, D: 1.2, E: 0.9, H: 0.8, F: 0.4, B: 0.35, G: 0.3, A: 0, X: 0 };

// How far the mouth leads the voice, in ms — reels/lipsync.json, set by ear in
// Reels Studio's lip-sync tuner (viewer/sync.html). Applied to the millisecond.
export function leadMs() {
  try { return Number(JSON.parse(fs.readFileSync(path.join(ROOT, 'lipsync.json'), 'utf8')).leadMs) || 0; } catch { return 67; }
}

// The lag (in frames, + = mouth first) at which mouth openness best matches
// the voice's loudness.
function measuredLead(track, envelope) {
  const open = track.map(v => OPENNESS[v.shape] ?? 0);
  const corr = lag => {
    let sum = 0;
    for (let f = 0; f < open.length; f++) { const g = f + lag; if (g >= 0 && g < envelope.length) sum += open[f] * envelope[g]; }
    return sum;
  };
  let best = 0, bestScore = -Infinity;
  for (let lag = -6; lag <= 6; lag++) { const c = corr(lag); if (c > bestScore) { bestScore = c; best = lag; } }
  return best;
}
