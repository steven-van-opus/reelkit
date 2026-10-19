// A short sample of one music bed or one sound-effect set on its own, to hear what each choice in sound.mjs sounds
// like. It runs the same composers a reel's mix does (music.mjs, sfx.mjs) over a made-up story timed like voice.json:
// an opening, two lines, a turn ("But…"), a payoff and the closing ask with its keyword said. So a bed lifts in, drops
// out where it would in a reel, cadences and resolves, and a set plays the moments it plays in a reel.
//
// There's no voice for it to sit under: a bed is levelled to SAMPLE_LUFS, an effects sample's loudest moment to
// SAMPLE_PEAK (so a set that plays one soft chime is still heard), and both are limited like the mix. An effects
// sample keeps only from just before its first sound to just after its last.
//
//   node src/audio/sample.mjs [--out <dir>]    writes music-<mood>.wav and sfx-<set>.wav (default .tmp/sounds/)
import { RATE, loudness, peakMomentary, limit, scaleBus, dbToGain } from './dsp.mjs';
import { composeMusic, MOODS } from './music.mjs';
import { composeSfx, SFX_SETS } from './sfx.mjs';
import { breakWindow, MOOD_DEFAULTS, SET_DENSITY } from './sound.mjs';

/** A bed sample's integrated loudness, LUFS. */
export const SAMPLE_LUFS = -20;
/** An effects sample's loudest momentary loudness, LUFS. */
export const SAMPLE_PEAK = -19;
const CEILING_DBTP = -1.5;
/** How long a sample's story runs, seconds; an effects sample is trimmed to its sounds. */
export const SAMPLE_SECONDS = 12;
const LEAD = 0.25, TAIL = 1.6;

const LINES = [
  { scene: 'hook', label: 'The idea', vo: 'Here is the whole idea in one line.' },
  { scene: 'card', label: 'Step one', vo: 'It starts with something small.' },
  { scene: 'card', label: 'Step two', vo: 'Then it quietly adds up.' },
  { scene: 'card', label: 'The catch', vo: 'But one thing changes everything.' },
  { scene: 'card', label: 'The payoff', vo: 'So now it finally works.' },
  { scene: 'cta', vo: 'Comment LINK and I will send it.', props: { keyword: 'LINK' } },
];

/**
 * The made-up story, `seconds` long: its episode (scenes, header labels, lines, the closing keyword) and its timing
 * in voice.json's shape. The lines share the time up to 1.4 s before the end, where the last word is said, so a bed
 * resolves and rings out as it does at the end of a video.
 */
export function sampleStory(seconds = SAMPLE_SECONDS) {
  const speech = seconds - 1.4, each = speech / LINES.length;
  const beats = LINES.map((_, i) => {
    const start = +(i * each).toFixed(3), next = (i + 1) * each;
    return { start, voStart: +(start + 0.15).toFixed(3), voEnd: +(i === LINES.length - 1 ? speech : next - 0.2).toFixed(3) };
  });
  const closing = beats.at(-1);
  closing.words = [{ text: 'LINK', start: +(closing.start + 0.45).toFixed(3), end: +(closing.start + 0.8).toFixed(3) }];
  return { episode: { id: 'sound-sample', beats: LINES.map(line => ({ ...line })), cta: { keyword: 'LINK' } }, timing: { duration: seconds, beats } };
}

/**
 * One sample as a stereo bus at 48 kHz: `music` (a bed as sound.mjs's Sound has it, its level ignored) or `sfx` (a
 * set and its density). `events` lists the effects it plays (seconds into the sample), `drop` where a bed dropped out
 * ([from, to] s, or null), and `lufs` its integrated loudness.
 */
export function composeSample({ music = null, sfx = null, seconds = SAMPLE_SECONDS, seed = 'sound-sample' }) {
  if (!music === !sfx) throw new Error('composeSample: give music or sfx');
  const { episode, timing } = sampleStory(seconds);
  const length = Math.round(seconds * RATE);
  if (music) {
    const at = music.breakAt ? breakWindow(music.breakAt, episode, timing) : null;
    const { bus, plan, drop } = composeMusic({ seed, timing, length, mood: music.mood, bpm: music.bpm, mode: music.mode, drop: at ? { kind: music.breakAt, at } : null });
    scaleBus(bus, dbToGain(SAMPLE_LUFS - loudness(bus)));
    limit(bus, CEILING_DBTP);
    return { bus, events: [], drop, bpm: +plan.bpm.toFixed(1), seconds, lufs: +loudness(bus).toFixed(2) };
  }
  const moments = { pivot: breakWindow('pivot', episode, timing), payoff: breakWindow('payoff', episode, timing) };
  const { bus, events } = composeSfx({ episode, timing, key: 0, voiceLufs: -20, length, set: sfx.set, density: sfx.density, moments });
  if (!events.length) return { bus: [new Float32Array(0), new Float32Array(0)], events, drop: null, bpm: null, seconds: 0, lufs: null };
  // From just before the first sound to just after the last one (its ring-out), with a short fade at each end.
  const times = events.map(e => e.t);
  const from = Math.max(0, Math.floor((Math.min(...times) - LEAD) * RATE)), to = Math.min(length, Math.ceil((Math.max(...times) + TAIL) * RATE));
  const out = bus.map(ch => ch.slice(from, to));
  const fade = Math.round(0.01 * RATE), fadeOut = Math.round(0.3 * RATE);
  for (const ch of out) {
    for (let i = 0; i < Math.min(fade, ch.length); i++) ch[i] *= i / fade;
    for (let i = 0; i < Math.min(fadeOut, ch.length); i++) ch[ch.length - 1 - i] *= i / fadeOut;
  }
  scaleBus(out, dbToGain(SAMPLE_PEAK - peakMomentary(out)));
  limit(out, CEILING_DBTP);
  const shift = from / RATE;
  return { bus: out, events: events.map(e => ({ ...e, t: +(e.t - shift).toFixed(3) })), drop: null, bpm: null, seconds: +((to - from) / RATE).toFixed(3), lufs: +loudness(out).toFixed(2) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [{ default: path }, { writeWav }] = await Promise.all([import('path'), import('../tts.mjs')]);
  const i = process.argv.indexOf('--out');
  const out = path.resolve(i >= 0 ? process.argv[i + 1] : '.tmp/sounds');
  const write = (name, { bus }) => {
    const pcm = new Float32Array(bus[0].length * 2);
    for (let k = 0; k < bus[0].length; k++) { pcm[2 * k] = bus[0][k]; pcm[2 * k + 1] = bus[1][k]; }
    writeWav(path.join(out, `${name}.wav`), pcm, RATE, 2);
    console.log(`  ${path.relative(process.cwd(), path.join(out, `${name}.wav`))}`);
  };
  for (const mood of Object.keys(MOODS)) write(`music-${mood}`, composeSample({ music: { mood, ...MOOD_DEFAULTS[mood] } }));
  for (const set of SFX_SETS) write(`sfx-${set}`, composeSample({ sfx: { set, density: SET_DENSITY[set] } }));
}
