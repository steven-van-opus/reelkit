// Soundtrack: voiceover + generated music + paper SFX → <dir>/mix.wav
// (48 kHz, stereo, 16-bit). The music is synthesised in code (src/audio/music.mjs),
// ducks under the voice like a sidechain, and the finished mix is normalised to
// -14 LUFS integrated with true peak under -1 dBTP. render.mjs picks mix.wav up
// automatically when it muxes the reel.
//
//   node src/audio.mjs episodes/<id>            writes mix.wav and prints levels
//   node src/audio.mjs episodes/<id> --stems    also writes stems/{vo,music,music-dry,sfx}.wav
//   node src/audio.mjs episodes/<id> --json     prints the full report (levels, music plan, SFX cues)
import fs from 'fs';
import path from 'path';
import { FPS } from './brand.mjs';
import { readWav, writeWav } from './tts.mjs';
import { rng, clamp } from './util.mjs';
import { RATE, stereo, addBus, scaleBus, eq, resample, loudness, limit, truePeakDb, dbToGain } from './audio/dsp.mjs';
import { composeMusic } from './audio/music.mjs';
import { composeSfx } from './audio/sfx.mjs';
import { applyHouseCta } from './cta.mjs';

const TARGET_LUFS = -14;
const CEILING_DBTP = -1.5;    // limiter ceiling: margin under -1 dBTP for the AAC encode
const VOICE_REF = -17;        // working loudness of the voice stem before the final normalise
const MUSIC_UNDER_VOICE = -10; // music loudness while someone is talking, LU relative to the voice
const DUCK_DB = 9;            // how far the music dips under speech
// Voice peak ceiling at the working level: lands near -2 dBTP after the final gain.
const VOICE_CEILING = CEILING_DBTP - (TARGET_LUFS - VOICE_REF) - 0.5;

// ---------------------------------------------------------------- ducking

// Speech activity 0..1 per sample, from the voice itself (sidechain-style):
// 10 ms RMS frames → soft threshold, held 160 ms across word gaps, opened
// 80 ms early (we render offline, so the duck can see the next word coming),
// then smoothed with a 40 ms attack and a 320 ms release.
function voiceActivity(vo) {
  const hop = RATE / 100, nf = Math.ceil(vo.length / hop);
  const raw = new Float32Array(nf);
  for (let f = 0; f < nf; f++) {
    let s = 0, c = 0;
    for (let i = (f - 1) * hop; i < (f + 2) * hop; i++) if (i >= 0 && i < vo.length) { s += vo[i] * vo[i]; c++; }
    const db = 10 * Math.log10(s / Math.max(1, c) + 1e-12);
    raw[f] = clamp((db + 52) / 16);                  // -52 dBFS → 0, -36 dBFS → 1
  }
  const HOLD = 16, AHEAD = 8;
  const held = new Float32Array(nf);
  for (let f = 0; f < nf; f++) {
    let m = 0;
    for (let k = Math.max(0, f - HOLD); k <= Math.min(nf - 1, f + AHEAD); k++) if (raw[k] > m) m = raw[k];
    held[f] = m;
  }
  const att = 1 - Math.exp(-1 / 4), rel = 1 - Math.exp(-1 / 32);
  let y = held[0];
  for (let f = 0; f < nf; f++) { y += (held[f] - y) * (held[f] > y ? att : rel); held[f] = y; }
  const out = new Float32Array(vo.length);
  for (let i = 0; i < vo.length; i++) {
    const x = i / hop, f = Math.floor(x), fr = x - f;
    out[i] = (held[f] ?? 0) * (1 - fr) + (held[f + 1] ?? held[f] ?? 0) * fr;
  }
  return out;
}

// Loudness-block filter that keeps only blocks where the voice is talking
// (activity averages at least `min`).
function speechBlocks(act, min = 0.9) {
  const ps = new Float64Array(act.length + 1);
  for (let i = 0; i < act.length; i++) ps[i + 1] = ps[i] + act[i];
  return (a, b) => (ps[b] - ps[a]) / (b - a) >= min;
}

// ---------------------------------------------------------------- mix

export async function buildMix(dir, { stems = false, log = true } = {}) {
  const episode = applyHouseCta(JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8')));
  const timingFile = path.join(dir, 'voice.json'), voFile = path.join(dir, 'vo.wav');
  if (!fs.existsSync(timingFile) || !fs.existsSync(voFile)) throw new Error(`audio: ${dir} needs vo.wav + voice.json (run src/tts.mjs first)`);
  const timing = JSON.parse(fs.readFileSync(timingFile, 'utf8'));
  const seed = episode.id || path.basename(dir);
  // Match the video exactly: render.mjs draws ceil(duration × FPS) frames.
  const length = Math.ceil(timing.duration * FPS) * (RATE / FPS);

  // Voice: windowed-sinc resample to 48 kHz, tone, working level.
  const { rate, samples } = readWav(voFile);
  const vo = new Float32Array(length);
  vo.set(resample(samples, rate, RATE).subarray(0, length));
  // Rumble filter, and pull down the TTS voice's bright 7–11 kHz band
  // (sibilance that turns hissy on phone speakers).
  eq(vo, [['hp', 70, 0.7], ['peak', 9000, 0.9, -5], ['highshelf', 7000, 0.7, -3]]);
  const voStereo = [vo, vo];
  // Catch the voice's transients on their own (fast look-ahead limiter) so the
  // master limiter has little left to do and never pumps the music on a plosive.
  scaleBus([vo], dbToGain(VOICE_REF - loudness(voStereo)));
  const voLim = limit(voStereo, VOICE_CEILING, { lookahead: 0.003, release: 0.06 });
  scaleBus([vo], dbToGain(VOICE_REF - loudness(voStereo)));

  // Music, levelled so it sits MUSIC_UNDER_VOICE below the voice while ducked.
  const act = voiceActivity(vo);
  const { bus: dry, plan } = composeMusic({ seed, timing, length });
  const duck = act.map(a => dbToGain(-DUCK_DB * a));
  const music = stereo(length);
  for (let i = 0; i < length; i++) { music[0][i] = dry[0][i] * duck[i]; music[1][i] = dry[1][i] * duck[i]; }
  const speech = speechBlocks(act);
  let underVo = loudness(music, { keep: speech });
  if (!Number.isFinite(underVo)) underVo = loudness(music) - DUCK_DB; // no speech long enough to measure
  const mg = dbToGain(VOICE_REF + MUSIC_UNDER_VOICE - underVo);
  scaleBus(music, mg);
  scaleBus(dry, mg);

  const { bus: sfx, events } = composeSfx({ episode, timing, key: plan.key, voiceLufs: VOICE_REF, length });

  // Sum (voice dead centre), then normalise: gain to target, true-peak limit,
  // re-measure and correct; it settles within a pass or two.
  const sum = stereo(length);
  addBus(sum, voStereo); addBus(sum, music); addBus(sum, sfx);
  let gain = dbToGain(TARGET_LUFS - loudness(sum)), out, lim;
  for (let pass = 0; pass < 3; pass++) {
    out = sum.map(ch => ch.map(v => v * gain));
    lim = limit(out, CEILING_DBTP);
    const err = TARGET_LUFS - loudness(out);
    if (Math.abs(err) < 0.05) break;
    gain *= dbToGain(err);
  }

  // Interleave with TPDF dither and write 16-bit.
  const r = rng(`dither:${seed}`);
  const pcm = new Float32Array(length * 2);
  for (let i = 0; i < length; i++) {
    pcm[2 * i] = out[0][i] + (r() - r()) / 32768;
    pcm[2 * i + 1] = out[1][i] + (r() - r()) / 32768;
  }
  const file = path.join(dir, 'mix.wav');
  writeWav(file, pcm, RATE, 2);

  if (stems) {
    const sdir = path.join(dir, 'stems');
    const write = (name, bus) => {
      const il = new Float32Array(length * 2);
      for (let i = 0; i < length; i++) { il[2 * i] = bus[0][i] * gain; il[2 * i + 1] = bus[1][i] * gain; }
      writeWav(path.join(sdir, `${name}.wav`), il, RATE, 2);
    };
    write('vo', voStereo); write('music', music); write('music-dry', dry); write('sfx', sfx);
  }

  const g = 20 * Math.log10(gain);
  const report = {
    file,
    duration: +(length / RATE).toFixed(3),
    lufs: +loudness(out).toFixed(2),
    truePeak: +truePeakDb(out).toFixed(2),
    voiceLimiter: `${voLim.deepestDb.toFixed(1)} dB max, >0.5 dB on ${voLim.reducedPct.toFixed(1)}% of samples`,
    limiter: `${lim.deepestDb.toFixed(1)} dB max, >0.5 dB on ${lim.reducedPct.toFixed(1)}% of samples`,
    voice: +(VOICE_REF + g).toFixed(1),
    musicUnderVoice: +(loudness(music, { keep: speech }) + g).toFixed(1),
    // Un-ducked bed over the groove: what the music rises to in a pause.
    musicBed: +(loudness(dry, { keep: (a, b) => a >= plan.tLift * RATE && b <= plan.tRes * RATE }) + g).toFixed(1),
    duckDb: DUCK_DB,
    music: { key: plan.keyName, bpm: +plan.bpm.toFixed(1), progression: plan.progression, bars: plan.nBars, lift: +plan.tLift.toFixed(2), resolve: +plan.tRes.toFixed(2), chords: plan.chords.map(c => c.name).join(' ') },
    sfx: events,
  };
  if (log) {
    console.log(`  mix: ${report.lufs} LUFS, ${report.truePeak} dBTP (master limiter ${report.limiter}) → ${path.relative(process.cwd(), file)}`);
    console.log(`  music: ${plan.keyName} major, ${report.music.bpm} BPM, ${plan.progression}, resolves at ${report.music.resolve}s`);
    console.log(`  levels: voice ${report.voice} · music under voice ${report.musicUnderVoice} · music bed (gaps) ${report.musicBed} LUFS · ${events.length} sfx`);
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = path.resolve(args.find(a => !a.startsWith('--')) || '.');
  const report = await buildMix(dir, { stems: args.includes('--stems') });
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
}
