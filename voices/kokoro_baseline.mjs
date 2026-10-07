// Baseline takes for the voice bake-off, using the same kokoro-js setup as
// src/tts.mjs (Kokoro-82M ONNX, q8, CPU). Speaks a JSON list of sentences from
// stdin, calibrates Kokoro's native speed to the target pace, and prints JSON
// shaped like voices/synth.py output.
//
//   echo '["One.", "Two."]' | node voices/kokoro_baseline.mjs af_heart <out-dir> [target-wpm]
import fs from 'fs';
import path from 'path';
import { KokoroTTS } from 'kokoro-js';

const [voice = 'af_heart', outDir = '.tmp/kokoro', targetArg = '175'] = process.argv.slice(2);
const target = Number(targetArg);
const lines = JSON.parse(fs.readFileSync(0, 'utf8'));
const words = s => s.split(/\s+/).filter(Boolean).length;

function trim(x, rate, thr = 0.012, keepMs = 30) {
  let a = 0, b = x.length - 1;
  while (a < b && Math.abs(x[a]) < thr) a++;
  while (b > a && Math.abs(x[b]) < thr) b--;
  const keep = Math.round(rate * keepMs / 1000);
  return x.subarray(Math.max(0, a - keep), Math.min(x.length, b + keep + 1));
}

function writeWav(file, samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

const t0 = performance.now();
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const loadSeconds = (performance.now() - t0) / 1000;

async function speak(speed) {
  let synth = 0, speech = 0, rate = 24000;
  const takes = [];
  for (const text of lines) {
    const t = performance.now();
    const audio = await tts.generate(text, { voice, speed });
    const s = (performance.now() - t) / 1000;
    rate = audio.sampling_rate;
    const trimmed = trim(audio.audio, rate);
    synth += s; speech += trimmed.length / rate;
    takes.push({ text, audio: trimmed, synthSeconds: +s.toFixed(3) });
  }
  return { takes, synth, speech, rate };
}

// Pass 1 at the production speed from src/tts.mjs, then one correction pass.
const total = lines.reduce((n, l) => n + words(l), 0);
let speed = 1.06;
let run = await speak(speed);
const firstWpm = total / run.speech * 60;
if (Math.abs(firstWpm - target) > 5) {
  speed = +(speed * target / firstWpm).toFixed(3);
  run = await speak(speed);
}

const files = run.takes.map((t, i) => {
  const file = path.resolve(outDir, `line_${String(i).padStart(2, '0')}.wav`);
  writeWav(file, t.audio, run.rate);
  return { index: i, id: null, text: t.text, file, seconds: +(t.audio.length / run.rate).toFixed(3), synthSeconds: t.synthSeconds };
});
console.log(JSON.stringify({
  model: 'onnx-community/Kokoro-82M-v1.0-ONNX', arch: 'kokoro-js', voice, sampleRate: run.rate,
  loadSeconds: +loadSeconds.toFixed(2), synthSeconds: +run.synth.toFixed(2), speechSeconds: +run.speech.toFixed(3),
  rtf: +(run.synth / run.speech).toFixed(3), naturalWpm: +firstWpm.toFixed(1), speed,
  wpm: +(total / run.speech * 60).toFixed(1), files, warnings: [],
}));
