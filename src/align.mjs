// Caption timing pass, run after the voice and before mix/render.
//
// Kokoro gives no word timings: tts.mjs estimates them by spreading each
// beat's words by syllable weight. The model, though, pauses at commas and
// colons and wherever it takes a breath, so the estimates drift 0.25–0.4 s
// around every pause and snap back at the end of the beat. This pass measures
// the real pauses in vo.wav (ffmpeg silencedetect) and re-times each beat's
// words around them:
//
//   1. The pauses inside a beat cut its speech into runs.
//   2. A small DP picks which word boundary each pause sits on, so every run's
//      length matches the speaking weight of the words in it (commas and
//      sentence ends get a bonus; a pause can also be absorbed, e.g. a stop
//      consonant, at a cost).
//   3. The word before a pause ends where the silence starts, the word after
//      starts where it ends, and the words in between are spread by weight.
//
// voice.json is rewritten in place, so caption chips and every scene's
// wordTime() follow the audio. Running it twice gives the same result.
// ElevenLabs timings come from the API's own alignment and are left alone.
//
//   node src/align.mjs episodes/<id>          align and rewrite voice.json
//   node src/align.mjs episodes/<id> --dry    print what would move
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const NOISE = '-38dB';
const MIN_SILENCE = 0.1;   // seconds; shorter dips are plosives, not pauses
const EDGE = 0.05;         // ignore silences touching the beat's speech edges

// [{ start, end }] silences in an audio file.
export function detectSilences(file, { noise = NOISE, min = MIN_SILENCE } = {}) {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=noise=${noise}:d=${min}`, '-f', 'null', '-'], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`align: silencedetect failed on ${file}`);
  const out = [];
  let start = null;
  for (const line of String(res.stderr).split('\n')) {
    const a = /silence_start: (-?[\d.]+)/.exec(line);
    if (a) start = Math.max(0, Number(a[1]));
    const b = /silence_end: ([\d.]+)/.exec(line);
    if (b && start != null) { out.push({ start, end: Number(b[1]) }); start = null; }
  }
  return out;
}

// Speaking weight of a word, syllable-ish, without tts.mjs's pause bonus
// (the pauses are measured here instead of guessed).
function weight(word) {
  const w = String(word).toLowerCase().replace(/[^a-z0-9]/g, '');
  const digits = (w.match(/\d/g) || []).length;
  const syl = Math.max(1, (w.replace(/\d/g, '').match(/[aeiouy]+/g) || []).length) + digits * 0.9;
  return 0.55 + syl * 0.5;
}

const PUNCT = /[,.;:!?—]["')\]]*$/;
// Nobody pauses right after these ("and | we'll"), and phrases tend to
// start with the second set ("TOOLBOX | and we'll").
const CLINGY = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'as', 'is', 'are', 'was', 'your', 'my', 'our', 'their', 'its', "it's", 'we', "we'll", 'you', "you'll", 'i', 'can', 'will', 'so', 'like', 'then', 'than', 'that', 'this', 'up']);
const OPENERS = new Set(['and', 'or', 'but', 'so', 'with', 'like', 'then', 'while', 'because', 'which', 'when', 'where', 'into', 'from', 'for', 'to']);
const bareWord = x => String(x.raw || x.text).toLowerCase().replace(/[^\p{L}\p{N}']/gu, '').replace(/[’]/g, "'");

// Re-time one beat's words against the silences inside its speech.
// Returns null when there is nothing to pin (no pause inside the beat).
export function alignWords(words, silences) {
  const n = words.length;
  if (n < 2) return null;
  const s0 = words[0].start, s1 = words[n - 1].end;
  const gaps = silences.filter(g => g.start > s0 + EDGE && g.end < s1 - EDGE);
  if (!gaps.length) return null;
  const q = gaps.length;
  const w = words.map(x => weight(x.raw || x.text));
  const cum = [0];
  for (const v of w) cum.push(cum[cum.length - 1] + v);
  const pauseTotal = gaps.reduce((a, g) => a + g.end - g.start, 0);
  const rate = Math.max(0.05, (s1 - s0 - pauseTotal) / cum[n]);
  const punct = words.map(x => PUNCT.test(x.raw || x.text));

  // Anchors: (a, j) = word a starts right after gap j. Start (0, 0) and end (n, q + 1).
  const tStart = (a, j) => (j === 0 ? s0 : gaps[j - 1].end);
  const tEnd = (a, j) => (j === q + 1 ? s1 : gaps[j - 1].start);
  const absorbed = (j0, j1) => { let len = 0; for (let k = j0 + 1; k < j1; k++) len += gaps[k - 1].end - gaps[k - 1].start; return len; };
  const segCost = (a0, j0, a1, j1) => {
    if (a1 <= a0) return Infinity;
    const lost = absorbed(j0, j1);
    const D = tEnd(a1, j1) - tStart(a0, j0) - lost;
    if (D <= 0.04) return Infinity;
    const E = rate * (cum[a1] - cum[a0]);
    return 2 * Math.log(D / E) ** 2 + 2 * lost;
  };
  // Pausing after a comma or sentence end is expected; after a clingy word it isn't.
  const bare = words.map(bareWord);
  const bonus = a => (punct[a - 1] ? -0.4 : CLINGY.has(bare[a - 1]) ? 0.35 : 0) + (OPENERS.has(bare[a]) ? -0.15 : 0);

  const key = (a, j) => `${a}:${j}`;
  const best = new Map([[key(0, 0), { cost: 0, prev: null }]]);
  const nodes = [[0, 0]];
  for (let a = 1; a < n; a++) for (let j = 1; j <= q; j++) nodes.push([a, j]);
  nodes.push([n, q + 1]);
  for (const [a, j] of nodes.slice(1)) {
    let pick = null;
    for (const [a0, j0] of nodes) {
      if (a0 >= a || j0 >= j) continue;
      const from = best.get(key(a0, j0));
      if (!from) continue;
      const c = from.cost + segCost(a0, j0, a, j) + (a < n ? bonus(a) : 0);
      if (Number.isFinite(c) && (!pick || c < pick.cost)) pick = { cost: c, prev: [a0, j0] };
    }
    if (pick) best.set(key(a, j), pick);
  }
  const end = best.get(key(n, q + 1));
  if (!end) return null;
  const anchors = [];
  for (let cur = [n, q + 1]; cur; cur = best.get(key(...cur)).prev) anchors.unshift(cur);
  if (anchors.length <= 2) return null;

  const out = words.map(x => ({ ...x }));
  for (let k = 1; k < anchors.length; k++) {
    const [a0, j0] = anchors[k - 1], [a1, j1] = anchors[k];
    const T0 = tStart(a0, j0), T1 = tEnd(a1, j1);
    const total = cum[a1] - cum[a0];
    let t = T0;
    for (let i = a0; i < a1; i++) {
      const d = ((T1 - T0) * w[i]) / total;
      out[i].start = +t.toFixed(3);
      out[i].end = +(t + d).toFixed(3);
      t += d;
    }
  }
  return { words: out, pinned: anchors.length - 2 };
}

// Align an episode's voice.json against its vo.wav. Returns the timing.
export function alignEpisode(dir, { dry = false, log = () => {} } = {}) {
  const timingFile = path.join(dir, 'voice.json'), voFile = path.join(dir, 'vo.wav');
  if (!fs.existsSync(timingFile) || !fs.existsSync(voFile)) throw new Error(`align: ${dir} needs vo.wav + voice.json`);
  const timing = JSON.parse(fs.readFileSync(timingFile, 'utf8'));
  if (timing.voice?.engine === 'elevenlabs') {
    log('ElevenLabs timings come from the API alignment; nothing to do');
    return timing;
  }
  const silences = detectSilences(voFile);
  let pinned = 0, moved = 0, worst = 0;
  for (const beat of timing.beats) {
    const r = alignWords(beat.words || [], silences);
    if (!r) continue;
    r.words.forEach((x, i) => {
      const d = Math.abs(x.start - beat.words[i].start);
      if (d > 0.05) moved++;
      worst = Math.max(worst, d);
      if (dry && d > 0.05) log(`beat ${beat.index}: "${x.text}" ${beat.words[i].start.toFixed(2)} → ${x.start.toFixed(2)}`);
    });
    pinned += r.pinned;
    beat.words = r.words;
  }
  timing.aligned = { method: 'silencedetect', noise: NOISE, min: MIN_SILENCE, pauses: pinned };
  if (!dry) fs.writeFileSync(timingFile, JSON.stringify(timing, null, 2));
  log(`${pinned} pause${pinned === 1 ? '' : 's'} pinned, ${moved} word${moved === 1 ? '' : 's'} moved (max ${worst.toFixed(2)}s)`);
  return timing;
}

// True when voice.json has been through this pass (or needs none).
export function isAligned(dir) {
  try {
    const timing = JSON.parse(fs.readFileSync(path.join(dir, 'voice.json'), 'utf8'));
    return Boolean(timing.aligned) || timing.voice?.engine === 'elevenlabs';
  } catch { return false; }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = path.resolve(args.find(a => !a.startsWith('--')) || '.');
  alignEpisode(dir, { dry: args.includes('--dry'), log: m => console.log(`  align: ${m}`) });
}
