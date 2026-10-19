// A stand-in voice for tests: a buzzy syllable for every three letters of a word and a pause after each sentence,
// written as vo.wav and voice.json the way src/tts.mjs writes them (its lead-in, gap between beats and tail), so the
// mix has speech to duck under without a TTS model.
import fs from 'node:fs';
import path from 'node:path';
import { SAMPLE_RATE, writeWav } from '../../src/tts.mjs';
import { applyHouseCta } from '../../src/cta.mjs';

const LEAD_IN = 0.35, BEAT_GAP = 0.2, TAIL = 1.4;
const SYLLABLE = 0.13, WORD_GAP = 0.05, SENTENCE_GAP = 0.3;

export function stubVoice(dir) {
  const episode = applyHouseCta(JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8')));
  const out = [];
  const pad = until => { while (out.length < Math.round(until * SAMPLE_RATE)) out.push(0); };
  const beats = [];
  let cursor = LEAD_IN;
  pad(cursor);
  episode.beats.forEach((beat, index) => {
    const start = index === 0 ? 0 : cursor - BEAT_GAP / 2;
    const words = [];
    for (const word of String(beat.vo || '').split(/\s+/).filter(Boolean)) {
      const begin = cursor;
      for (let s = 0; s < Math.max(1, Math.round(word.length / 3)); s++) {
        const n = Math.round(SAMPLE_RATE * SYLLABLE);
        for (let i = 0; i < n; i++) out.push(Math.sin(Math.PI * i / n) * (0.35 * Math.sin(i * 0.035) + 0.15 * Math.sin(i * 0.15)));
        cursor += n / SAMPLE_RATE;
      }
      words.push({ text: word, raw: word, start: +begin.toFixed(3), end: +cursor.toFixed(3) });
      cursor += /[.!?]$/.test(word) ? SENTENCE_GAP : WORD_GAP;
      pad(cursor);
    }
    beats.push({ index, start: +start.toFixed(3), voStart: words[0]?.start ?? cursor, voEnd: words.at(-1)?.end ?? cursor, words });
    cursor = (words.at(-1)?.end ?? cursor) + BEAT_GAP;
    pad(cursor);
  });
  const total = cursor - BEAT_GAP + TAIL;
  beats.forEach((b, i) => { b.end = +(i < beats.length - 1 ? beats[i + 1].start : total).toFixed(3); });
  pad(total);
  writeWav(path.join(dir, 'vo.wav'), Float32Array.from(out.slice(0, Math.ceil(total * SAMPLE_RATE))));
  const timing = { sampleRate: SAMPLE_RATE, duration: +total.toFixed(3), voice: { id: 'stub', engine: 'stub' }, beats };
  fs.writeFileSync(path.join(dir, 'voice.json'), JSON.stringify(timing, null, 2));
  return timing;
}

/** RMS level of a 48 kHz stereo 16-bit WAV every 250 ms, dB (both channels). */
export function levels(file) {
  const buf = fs.readFileSync(file), data = buf.subarray(44), hop = 48000 / 4 * 2, out = [];
  for (let i = 0; i < data.length / 2; i += hop) {
    let s = 0, c = 0;
    for (let k = i; k < Math.min(i + hop, data.length / 2); k++) { const v = data.readInt16LE(k * 2) / 32768; s += v * v; c++; }
    out.push(+(10 * Math.log10(s / c + 1e-12)).toFixed(2));
  }
  return out;
}
