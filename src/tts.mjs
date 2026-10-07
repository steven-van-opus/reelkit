// Voiceover: Kokoro-82M (open-weight neural TTS, runs locally on CPU) with a
// macOS `say` fallback. Each beat's line is synthesised sentence by sentence,
// edge silence is trimmed, and every caption word gets a start/end time.
//
//   node src/tts.mjs episodes/<id>      → writes vo.wav + voice.json
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { ROOT } from './brand.mjs';
import { applyHouseCta } from './cta.mjs';
import { speakable } from './pronounce.mjs';

export const SAMPLE_RATE = 24000;
const LEAD_IN = 0.35;          // silence before the first word
const SENTENCE_GAP = 0.12;     // pause between sentences inside a beat
const BEAT_GAP = 0.2;          // pause between beats
const TAIL = 1.4;              // hold on the last frame after the final word

const CACHE_DIR = path.join(ROOT, '.cache', 'tts');

let kokoro = null;
async function getKokoro() {
  if (kokoro) return kokoro;
  const { KokoroTTS } = await import('kokoro-js');
  kokoro = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
  return kokoro;
}

// ---------------------------------------------------------------- wav io

export function readWav(file) {
  const buf = fs.readFileSync(file);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(off + 8), channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    if (id === 'data') data = buf.subarray(off + 8, off + 8 + size);
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`Bad wav: ${file}`);
  const n = data.length / (fmt.bits / 8) / fmt.channels;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let ch = 0; ch < fmt.channels; ch++) {
      const p = (i * fmt.channels + ch) * (fmt.bits / 8);
      v += fmt.format === 3 ? data.readFloatLE(p) : fmt.bits === 16 ? data.readInt16LE(p) / 32768 : data.readInt32LE(p) / 2147483648;
    }
    out[i] = v / fmt.channels;
  }
  return { rate: fmt.rate, samples: out };
}

export function writeWav(file, samples, rate = SAMPLE_RATE, channels = 1) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2 * channels, 28); buf.writeUInt16LE(2 * channels, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

function resample(samples, from, to) {
  if (from === to) return samples;
  const n = Math.round(samples.length * to / from);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * from / to, i0 = Math.floor(x), f = x - i0;
    out[i] = (samples[i0] || 0) * (1 - f) + (samples[i0 + 1] || 0) * f;
  }
  return out;
}

// Trim only true silence at the edges. Sentence endings carry the rise of a
// question and the lift of an exclamation, so the tail keeps 150 ms of air.
function trim(samples, rate) {
  const thr = 0.004, lead = Math.round(rate * 0.04), tail = Math.round(rate * 0.15);
  let a = 0, b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < thr) a++;
  while (b > a && Math.abs(samples[b]) < thr) b--;
  return samples.subarray(Math.max(0, a - lead), Math.min(samples.length, b + tail));
}

// Time caption words against the pauses the voice actually leaves. Words are
// grouped at punctuation; the longest silent gaps in the audio (one fewer
// than there are groups) become the group boundaries, and words inside a
// group are spread by speaking weight. Falls back to weights alone.
function pauseAlignedWords(shown, audio, at) {
  const words = String(shown).split(/\s+/).filter(Boolean);
  const dur = audio.length / SAMPLE_RATE;
  const hop = Math.round(SAMPLE_RATE * 0.01);
  const n = Math.floor(audio.length / hop);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = i * hop; k < (i + 1) * hop; k++) sum += audio[k] * audio[k];
    env[i] = Math.sqrt(sum / hop);
  }
  const sorted = [...env].sort((x, y) => x - y);
  const thr = sorted[Math.floor(n * 0.95)] * 0.08;
  let first = 0, last = n - 1;
  while (first < n && env[first] < thr) first++;
  while (last > first && env[last] < thr) last--;
  const gaps = [];
  for (let i = first, run = -1; i <= last; i++) {
    if (env[i] < thr) { if (run < 0) run = i; }
    else if (run >= 0) { if (i - run >= 9) gaps.push({ start: run * 0.01, end: i * 0.01, len: i - run }); run = -1; }
  }
  const groups = [];
  let cur = [];
  for (const w of words) { cur.push(w); if (/[,.;:!?—]$/.test(w)) { groups.push(cur); cur = []; } }
  if (cur.length) groups.push(cur);
  const s0 = first * 0.01, s1 = (last + 1) * 0.01;
  if (groups.length < 2 || gaps.length < groups.length - 1) return timeWords(words, at + s0, s1 - s0);
  const cuts = gaps.sort((x, y) => y.len - x.len).slice(0, groups.length - 1).sort((x, y) => x.start - y.start);
  const out = [];
  groups.forEach((g, i) => {
    const a = i === 0 ? s0 : cuts[i - 1].end;
    const b = i === groups.length - 1 ? s1 : cuts[i].start;
    out.push(...timeWords(g, at + a, Math.max(0.05, b - a)));
  });
  return out;
}

// ---------------------------------------------------------------- house voice
// Kokoro's Heart voice with Qwen3-TTS delivery: Qwen3's Base model speaks in
// the timbre of a Kokoro reference clip (voices/anchors/kokoro-heart.wav,
// synthetic) — Kokoro's sound, Qwen's phrasing. Runs locally on Apple
// Silicon via mlx-audio (.tts/venv, see voices/lock.py).
export const HOUSE_VOICE = { engine: 'qwen-locked', anchor: 'kokoro-heart', temperature: 0.9 };
const QWEN_PY = path.join(ROOT, '.tts', 'venv', 'bin', 'python');
const QWEN_LOCK = path.join(ROOT, 'voices', 'lock.py');

export function qwenAvailable(anchor = HOUSE_VOICE.anchor) {
  return [QWEN_PY, QWEN_LOCK, path.join(ROOT, 'voices', 'anchors', `${anchor}.wav`),
    path.join(ROOT, '.tts', 'hf', 'hub', 'models--mlx-community--Qwen3-TTS-12Hz-1.7B-Base-6bit')].every(f => fs.existsSync(f));
}

const sha1 = x => crypto.createHash('sha1').update(x).digest('hex');

// All of an episode's lines in one Python process (the model loads once).
// Each line's seed comes from its text, so a re-render reuses the same take.
function qwenBatch(texts, voice) {
  const jobs = texts.map(text => {
    const seed = parseInt(sha1(text).slice(0, 7), 16);
    const key = sha1(JSON.stringify(['qwen-locked', voice.anchor, voice.temperature, seed, text]));
    return { text, seed, key, file: path.join(CACHE_DIR, `${key}.wav`) };
  });
  const todo = jobs.filter(j => !fs.existsSync(j.file));
  if (todo.length) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    process.stdout.write(`  voicing ${todo.length} line(s) with ${voice.anchor} × Qwen3…\n`);
    try {
      execFileSync(QWEN_PY, [QWEN_LOCK, 'speak', voice.anchor, '--out-dir', CACHE_DIR, '--temperature', String(voice.temperature)], {
        input: JSON.stringify(todo.map(j => ({ text: j.text, seed: j.seed, id: j.key }))),
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch (err) {
      // MLX can exit non-zero while tearing down after every take is written;
      // only fail if a take is actually missing.
      const missing = todo.filter(j => !fs.existsSync(j.file));
      if (missing.length) throw new Error(`Qwen3 voice failed: ${String(err.stderr || err.message).slice(-1200)}`);
      process.stdout.write(`  (Qwen3 exited with code ${err.status} after writing every take — continuing)\n`);
    }
  }
  return jobs.map(j => {
    const { rate, samples } = readWav(j.file);
    return trim(resample(samples, rate, SAMPLE_RATE), SAMPLE_RATE);
  });
}

// ---------------------------------------------------------------- ElevenLabs

// The key comes from the environment or a gitignored .env (reels/.env or the
// repo's .env) — never from a script or the repo.
function envValue(name) {
  if (process.env[name]) return process.env[name].trim();
  for (const file of [path.join(ROOT, '.env'), path.join(ROOT, '..', '.env')]) {
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(new RegExp(`^\\s*${name}\\s*=\\s*["']?([^"'\\n]+)`, 'm'));
    if (m) return m[1].trim();
  }
  return null;
}

export const elevenKey = () => envValue('ELEVENLABS_API_KEY');
const ELEVEN = 'https://api.elevenlabs.io';
// Stock voices to try, in order, when no voice id is configured.
const ELEVEN_PREFERRED = ['Jessica', 'Laura', 'Sarah', 'Will', 'Chris', 'Brian', 'Alice', 'Matilda'];

async function eleven(pathname, init = {}) {
  const res = await fetch(`${ELEVEN}${pathname}`, {
    ...init,
    headers: { 'xi-api-key': elevenKey(), 'content-type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

let elevenModelId = null;
// The newest text-to-speech model the account can use, unless ELEVENLABS_MODEL
// pins one: v4 → v3 → multilingual v2.
async function elevenModel() {
  if (elevenModelId) return elevenModelId;
  elevenModelId = envValue('ELEVENLABS_MODEL');
  if (elevenModelId) return elevenModelId;
  const models = (await eleven('/v1/models')).filter(m => m.can_do_text_to_speech !== false).map(m => m.model_id);
  const pick = [/^eleven_v4$/, /^eleven_v4/, /^eleven_v3$/, /^eleven_v3/, /^eleven_multilingual_v2$/]
    .map(re => models.find(id => re.test(id) && !/flash|turbo|conversational/.test(id))).find(Boolean);
  elevenModelId = pick || models[0];
  return elevenModelId;
}

export async function elevenVoices() {
  return (await eleven('/v1/voices')).voices.map(v => ({ id: v.voice_id, name: v.name, category: v.category, labels: v.labels }));
}

let defaultVoice = null;
async function elevenVoiceId(voice) {
  if (voice.elevenlabsId) return voice.elevenlabsId;
  const env = envValue('ELEVENLABS_VOICE_ID');
  if (env) return env;
  if (!defaultVoice) {
    const voices = await elevenVoices();
    defaultVoice = ELEVEN_PREFERRED.map(n => voices.find(v => v.name.split(/\s|-/)[0] === n)).find(Boolean)?.id || voices[0]?.id;
  }
  return defaultVoice;
}

// One beat, synthesised whole (better prosody than sentence by sentence), with
// the neighbouring lines as context. Returns 24 kHz samples plus per-word
// times from ElevenLabs' character alignment.
async function elevenSynth(text, voice, { previous = '', next = '' } = {}) {
  const model = await elevenModel();
  const voiceId = await elevenVoiceId(voice);
  const settings = { stability: 0.4, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: voice.speed || 1.05 };
  const key = crypto.createHash('sha1').update(JSON.stringify(['eleven', model, voiceId, text, previous, next, settings])).digest('hex');
  const wav = path.join(CACHE_DIR, `${key}.wav`), meta = path.join(CACHE_DIR, `${key}.json`);
  if (!fs.existsSync(wav) || !fs.existsSync(meta)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const body = { text, model_id: model, voice_settings: settings };
    // Context stitching is a v2-generation feature; newer models ignore or refuse it.
    if (/v2/.test(model)) Object.assign(body, { previous_text: previous || undefined, next_text: next || undefined });
    const out = await eleven(`/v1/text-to-speech/${voiceId}/with-timestamps?output_format=pcm_24000`, { method: 'POST', body: JSON.stringify(body) });
    const pcm = Buffer.from(out.audio_base64, 'base64');
    const samples = new Float32Array(pcm.length / 2);
    for (let i = 0; i < samples.length; i++) samples[i] = pcm.readInt16LE(i * 2) / 32768;
    writeWav(wav, samples, 24000);
    fs.writeFileSync(meta, JSON.stringify({ model, voiceId, alignment: out.alignment || out.normalized_alignment || null }));
  }
  const { rate, samples } = readWav(wav);
  const { alignment } = JSON.parse(fs.readFileSync(meta, 'utf8'));
  // Trim edge silence and shift the alignment by what was cut.
  const thr = 0.012, keep = Math.round(rate * 0.025);
  let a = 0, b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < thr) a++;
  while (b > a && Math.abs(samples[b]) < thr) b--;
  const from = Math.max(0, a - keep);
  const audio = resample(samples.subarray(from, Math.min(samples.length, b + keep)), rate, SAMPLE_RATE);
  const words = [];
  if (alignment?.characters) {
    let cur = null;
    alignment.characters.forEach((ch, i) => {
      const t0 = alignment.character_start_times_seconds[i] - from / rate, t1 = alignment.character_end_times_seconds[i] - from / rate;
      if (/\s/.test(ch)) { if (cur) words.push(cur); cur = null; return; }
      if (!cur) cur = { text: '', start: t0, end: t1 };
      cur.text += ch;
      cur.end = t1;
    });
    if (cur) words.push(cur);
  }
  return { audio, words, model, voiceId };
}

// Map the spoken words' times onto the displayed words. Same count → one to
// one; otherwise ("2.1" spoken as "two point one") spread the displayed words
// over the spoken span by speaking weight.
function displayTimes(shown, spokenWords, at, dur) {
  const disp = shown.split(/\s+/).filter(Boolean);
  if (spokenWords.length === disp.length && spokenWords.length) {
    return disp.map((raw, i) => ({ text: raw, raw, start: +(at + spokenWords[i].start).toFixed(3), end: +(at + spokenWords[i].end).toFixed(3) }));
  }
  if (spokenWords.length) {
    const s0 = spokenWords[0].start, s1 = spokenWords[spokenWords.length - 1].end;
    return timeWords(disp, at + s0, s1 - s0);
  }
  return timeWords(disp, at, dur);
}

// ---------------------------------------------------------------- synthesis

async function synth(textToSay, voice) {
  const key = crypto.createHash('sha1').update(JSON.stringify([textToSay, voice])).digest('hex');
  const cached = path.join(CACHE_DIR, `${key}.wav`);
  if (!fs.existsSync(cached)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    if (voice.engine === 'say') {
      const aiff = cached.replace(/\.wav$/, '.aiff');
      execFileSync('say', ['-v', voice.id || 'Samantha', '-r', String(Math.round(185 * (voice.speed || 1))), '-o', aiff, textToSay]);
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', aiff, '-ar', String(SAMPLE_RATE), '-ac', '1', cached]);
      fs.unlinkSync(aiff);
    } else {
      const tts = await getKokoro();
      const audio = await tts.generate(textToSay, { voice: voice.id || 'af_heart', speed: voice.speed || 1.05 });
      await audio.save(cached);
    }
  }
  const { rate, samples } = readWav(cached);
  return trim(resample(samples, rate, SAMPLE_RATE), SAMPLE_RATE);
}

// Split after . ! ? only when followed by whitespace or the end, so "2.1" and
// "8:1" stay inside their sentence.
const splitSentences = s => String(s).split(/(?<=[.!?]["')\]]*)\s+/).map(x => x.trim()).filter(Boolean);

// Rough speaking weight of a word: syllable-ish count plus pauses for punctuation.
function weight(word) {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  const digits = (w.match(/\d/g) || []).length;
  const syl = Math.max(1, (w.replace(/\d/g, '').match(/[aeiouy]+/g) || []).length) + digits * 0.9;
  return 0.55 + syl * 0.5 + (/[,;:—]$/.test(word) ? 0.5 : 0) + (/[.!?]$/.test(word) ? 0.35 : 0);
}

function timeWords(words, start, dur) {
  const ws = words.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  let t = start;
  return words.map((raw, i) => {
    const d = (ws[i] / total) * dur;
    const out = { text: raw, raw, start: +t.toFixed(3), end: +(t + d).toFixed(3) };
    t += d;
    return out;
  });
}

// Replace estimated word times with the ones actually spoken: local Whisper
// word timestamps matched to the script (voices/align.py). Drives captions and
// Kit's lip sync. Best-effort — any failure keeps the estimates.
function alignWords(dir, beats) {
  const py = path.join(ROOT, '.tts', 'venv', 'bin', 'python');
  const script = path.join(ROOT, 'voices', 'align.py');
  if (!fs.existsSync(py) || !fs.existsSync(script) || process.env.REELS_ALIGN === '0') return;
  const words = beats.flatMap(b => b.words);
  try {
    const res = JSON.parse(execFileSync(py, [script], {
      input: JSON.stringify({ wav: path.join(dir, 'vo.wav'), words: words.map(w => w.text), spans: beats.map(b => [b.voStart, b.voEnd]) }),
      stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
    }).toString().trim().split('\n').pop());
    if (!(res.matchRate >= 0.75) || res.words.length !== words.length) {
      process.stdout.write(`  word alignment skipped (match ${res.matchRate})\n`);
      return;
    }
    let k = 0;
    for (const b of beats) {
      for (const w of b.words) {
        const a = res.words[k++];
        // Stay inside the beat's speech window (Whisper can stamp the first word at 0).
        const start = Math.min(Math.max(a.start, b.voStart), b.voEnd - 0.05);
        const end = Math.min(Math.max(a.end, start + 0.05), b.voEnd + 0.05);
        Object.assign(w, { start: +start.toFixed(3), end: +end.toFixed(3) });
      }
    }
    process.stdout.write(`  words aligned to the voice (${Math.round(res.matchRate * 100)}% matched)\n`);
  } catch (err) {
    process.stdout.write(`  word alignment unavailable (${String(err.message).split('\n')[0].slice(0, 120)}) — keeping estimates\n`);
  }
}

export async function voiceEpisode(dir) {
  const episode = applyHouseCta(JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8')));
  // Engine: REELS_VOICE, else the episode's pin, else the house voice (Kokoro
  // Heart × Qwen3) where its local environment exists, else ElevenLabs when a
  // key is set, else plain Kokoro.
  const engine = process.env.REELS_VOICE || episode.voice?.engine
    || (qwenAvailable() ? 'qwen-locked' : elevenKey() ? 'elevenlabs' : 'kokoro');
  const voice = { id: 'af_heart', speed: 1.06, ...(episode.voice || {}), engine };
  if (engine === 'qwen-locked') Object.assign(voice, { anchor: HOUSE_VOICE.anchor, temperature: HOUSE_VOICE.temperature },
    episode.voice?.anchor ? { anchor: episode.voice.anchor } : {}, episode.voice?.temperature ? { temperature: episode.voice.temperature } : {});
  const qwenAudio = engine === 'qwen-locked' ? qwenBatch(episode.beats.map(b => speakable(b.speak || b.vo)), voice) : null;
  const parts = [];
  let cursor = LEAD_IN;
  const beats = [];

  for (const [bi, beat] of episode.beats.entries()) {
    const display = splitSentences(beat.vo);
    // `speak` lets a script spell out pronunciation ("two point one") while the
    // captions keep the written form ("2.1"). Sentence counts must match.
    const spoken = beat.speak ? splitSentences(beat.speak) : display;
    const pairs = spoken.length === display.length ? display.map((d, i) => [d, spoken[i]]) : [[beat.vo, beat.speak || beat.vo]];
    const beatStart = bi === 0 ? 0 : cursor - BEAT_GAP / 2;
    const words = [];
    if (voice.engine === 'elevenlabs') {
      const said = speakable(beat.speak || beat.vo);
      const neighbour = k => episode.beats[k] ? speakable(episode.beats[k].speak || episode.beats[k].vo) : '';
      const r = await elevenSynth(said, voice, { previous: neighbour(bi - 1), next: neighbour(bi + 1) });
      voice.model = r.model;
      voice.elevenlabsId = r.voiceId;
      const dur = r.audio.length / SAMPLE_RATE;
      parts.push({ at: cursor, audio: r.audio });
      words.push(...displayTimes(beat.vo, r.words, cursor, dur));
      cursor += dur;
      beats.push({ index: bi, start: +beatStart.toFixed(3), voStart: words[0]?.start ?? cursor, voEnd: +cursor.toFixed(3), words });
      cursor += BEAT_GAP;
      process.stdout.write(`  voiced beat ${bi + 1}/${episode.beats.length} (ElevenLabs ${r.model})\r`);
      continue;
    }
    // The whole beat in one pass: the model phrases it as a passage, so
    // questions rise and exclamations land the way a person would say them.
    {
      const said = speakable(beat.speak || beat.vo);
      const audio = qwenAudio ? qwenAudio[bi] : await synth(said, voice);
      const dur = audio.length / SAMPLE_RATE;
      parts.push({ at: cursor, audio });
      words.push(...pauseAlignedWords(beat.vo, audio, cursor));
      cursor += dur;
    }
    beats.push({ index: bi, start: +beatStart.toFixed(3), voStart: words[0]?.start ?? cursor, voEnd: +cursor.toFixed(3), words });
    cursor += BEAT_GAP;
    process.stdout.write(`  voiced beat ${bi + 1}/${episode.beats.length}\r`);
  }
  const total = cursor - BEAT_GAP + TAIL;
  beats.forEach((b, i) => { b.end = +(i < beats.length - 1 ? beats[i + 1].start : total).toFixed(3); });

  const out = new Float32Array(Math.ceil(total * SAMPLE_RATE));
  for (const p of parts) out.set(p.audio, Math.round(p.at * SAMPLE_RATE));
  writeWav(path.join(dir, 'vo.wav'), out);
  alignWords(dir, beats);
  const timing = { sampleRate: SAMPLE_RATE, duration: +total.toFixed(3), voice, beats };
  fs.writeFileSync(path.join(dir, 'voice.json'), JSON.stringify(timing, null, 2));
  process.stdout.write(`\n  voice: ${total.toFixed(1)}s, ${beats.length} beats\n`);
  return timing;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (arg === '--voices') {
    // node src/tts.mjs --voices   → the ElevenLabs voices this key can use
    for (const v of await elevenVoices()) console.log(`${v.id}  ${v.name.padEnd(28)} ${v.category || ''}  ${Object.values(v.labels || {}).join(', ')}`);
  } else {
    await voiceEpisode(path.resolve(arg || '.'));
  }
}
