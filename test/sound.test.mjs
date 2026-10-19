// The soundtrack's sound (src/audio/sound.mjs): the house sound mixed exactly as before there was a choice, each
// preset at -14 LUFS with only its own moments, the choice read from episode.json and brand.json, and the samples.
// Uses a stand-in voice (helpers/stub-voice.mjs), so no TTS model is needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stubVoice, levels } from './helpers/stub-voice.mjs';
import { buildMix } from '../src/audio.mjs';
import { HOUSE_SOUND, SOUNDS, resolveSound } from '../src/audio/sound.mjs';
import { composeSample, SAMPLE_LUFS } from '../src/audio/sample.mjs';
import { MOODS } from '../src/audio/music.mjs';
import { SFX_SETS } from '../src/audio/sfx.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const fixture = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures', name), 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));

// A scratch episode folder under .tmp/ (gitignored): the fixture episode (with `extra` merged in) and its stub voice.
function episodeDir(extra = {}) {
  fs.mkdirSync(path.join(ROOT, '.tmp'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, '.tmp', 'test-sound-'));
  fs.writeFileSync(path.join(dir, 'episode.json'), JSON.stringify({ ...fixture('episode.json'), ...extra }));
  return { dir, timing: stubVoice(dir), done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('choices resolve to a sound, the house sound to null, and anything unknown is named', () => {
  assert.equal(resolveSound(null), null);
  assert.equal(resolveSound('house'), null);
  assert.equal(resolveSound({ preset: 'house', musicVolume: 1, sfxVolume: 1 }), null);
  assert.deepEqual(resolveSound({ musicVolume: 1.5 }).music, { ...HOUSE_SOUND.music, gain: 1.5 });
  // Another set on the paper look lands its closing cue as the Post button lights; the paper set times its own.
  assert.deepEqual(resolveSound('diorama').sfx, { set: 'cozy', density: 'few', gain: 1, closing: 'post' });
  assert.deepEqual(resolveSound({ sfx: 'timelapse' }).sfx, { set: 'timelapse', density: 'some', gain: 1, closing: 'post' });
  // A mood chosen over the preset's brings its tempo, mode and drop-out; the preset keeps its levels.
  assert.deepEqual(resolveSound({ preset: 'diorama', mood: 'dark' }).music, { mood: 'dark', bpm: [104, 114], mode: 'minor', underVoiceLu: -12, duckDb: 3, breakAt: 'pivot', gain: 1 });
  assert.equal(resolveSound('doodle').music, null, 'doodle starts with the music off');
  assert.equal(resolveSound({ preset: 'doodle', music: true }).music.mood, 'keys');
  assert.equal(resolveSound({ preset: 'blueprint', sfx: 'none' }).sfx, null);
  for (const [bad, message] of [
    ['nope', /no preset "nope"/],
    [{ mood: 'jazz' }, /no mood "jazz"/],
    [{ sfx: 'bells' }, /no effects set "bells"/],
    [{ music: 'yes' }, /"music" must be true or false/],
    [{ musicVolume: 3 }, /"musicVolume" must be a number from 0.2 to 2/],
    [{ volume: 1 }, /unknown field "volume"/],
    [['diorama'], /must be a preset name/],
  ]) assert.throws(() => resolveSound(bad), message);
});

test('the house sound mixes exactly as it did before there was a choice', { timeout: 120_000 }, async () => {
  const { dir, done } = episodeDir();
  try {
    // Recorded at 0fb1e51 with the same stub voice: the music's plan and every effect exactly, the level every 250 ms
    // within 0.05 dB (so a CPU's last bit doesn't matter, but any change to the groove or the paper set does).
    const before = fixture('house-mix.json');
    const report = await buildMix(dir, { log: false });
    const mix = path.join(dir, 'mix.wav');
    const a = fs.readFileSync(mix);
    assert.deepEqual(plain(report.music), before.music);
    assert.deepEqual(plain(report.sfx), before.sfx);
    assert.equal(report.lufs, before.lufs);
    const now = levels(mix);
    assert.equal(now.length, before.rms.length);
    now.forEach((db, i) => assert.ok(Math.abs(db - before.rms[i]) <= 0.05, `${(i * 0.25).toFixed(2)} s: ${db} dB, was ${before.rms[i]}`));
    // The house sound given explicitly mixes to the same bytes.
    await buildMix(dir, { log: false, sound: null });
    assert.ok(fs.readFileSync(mix).equals(a), 'null is exactly the house sound');
    await buildMix(dir, { log: false, sound: HOUSE_SOUND });
    assert.ok(fs.readFileSync(mix).equals(a), 'HOUSE_SOUND is exactly the house sound, deterministically');
  } finally { done(); }
});

test('every preset mixes at -14 LUFS, at its own level under the voice, with only its own moments', { timeout: 300_000 }, async () => {
  const { dir, timing, done } = episodeDir();
  try {
    const seconds = timing.duration;
    const PAPER_ONLY = ['whoosh', 'shimmer', 'ding'];
    const allowed = { paper: ['whoosh', 'tap', 'shimmer', 'tick', 'ding'], cozy: ['chime', 'tap'], interface: ['blip', 'chime', 'sweep'], engineering: ['whine', 'thunk', 'count'], timelapse: ['whoosh', 'swish', 'run', 'clock', 'sparkle', 'pop'], minimal: ['tap', 'cut', 'pop'] };
    for (const [name, preset] of Object.entries(SOUNDS)) {
      const sound = resolveSound({ preset: name, music: true }) ?? HOUSE_SOUND;
      const report = await buildMix(dir, { log: false, sound });
      assert.ok(Math.abs(report.lufs + 14) < 0.6, `${name}: ${report.lufs} LUFS`);
      assert.ok(report.truePeak <= -1, `${name}: ${report.truePeak} dBTP`);
      assert.equal(report.music.mood, preset.mood === 'groove' ? undefined : preset.mood, name);
      assert.ok(report.music.bpm >= preset.bpm[0] - 0.01 && report.music.bpm <= preset.bpm[1] + 0.01, `${name}: ${report.music.bpm} BPM`);
      assert.ok(Math.abs(report.musicUnderVoice - report.voice - preset.underVoiceLu) < 1.5, `${name}: ${(report.musicUnderVoice - report.voice).toFixed(1)} LU under the voice`);
      const names = new Set(report.sfx.map(e => e.sfx));
      for (const sfx of names) assert.ok(allowed[preset.sfx].includes(sfx), `${name}: ${sfx}`);
      if (preset.sfx !== 'paper' && preset.sfx !== 'timelapse') for (const sfx of PAPER_ONLY) assert.ok(!names.has(sfx), `${name}: no ${sfx}`);
      if (name === 'diorama') assert.ok(report.sfx.length <= 1, 'diorama: almost no effects');
      // Doodle and map: nothing on the cuts, only the chime as the keyword lands.
      if (name === 'doodle' || name === 'map') {
        assert.deepEqual(plain(report.sfx.map(e => e.sfx)), ['chime'], name);
        for (const e of report.sfx) assert.ok(timing.beats.every(b => Math.abs(e.t - b.start) >= 0.15), `${name}: ${e.sfx} at ${e.t} s, on a cut`);
      }
      if (name === 'isometric') assert.deepEqual(plain(report.sfx.map(e => e.sfx)), ['sweep', 'chime', 'blip', 'blip']);
      if (preset.breakAt) {
        assert.ok(report.music.drop, `${name}: the bed drops out on the ${preset.breakAt}`);
        const [from, to] = report.music.drop;
        assert.ok(to > from && to < report.music.resolve, name);
        if (name === 'blueprint') assert.ok(report.sfx.some(e => e.sfx === 'thunk' && Math.abs(e.t - from) < 0.01), 'blueprint: a thunk where the bed drops out');
        if (name === 'timelapse') assert.ok(report.sfx.some(e => e.sfx === 'sparkle' && e.t >= from && e.t < to), 'timelapse: a sparkle under the payoff');
      }
      if (name === 'timelapse') {
        const per10s = report.sfx.length / seconds * 10;
        assert.ok(per10s >= 6 && per10s <= 12, `timelapse: ${per10s.toFixed(1)} effects per 10 s`);
        // The counter's ticks land on the music's eighth notes, none under the payoff.
        const eighth = 30 / report.music.bpm;
        for (const e of report.sfx.filter(e => e.sfx === 'run' || e.sfx === 'clock')) {
          const off = e.t / eighth - Math.round(e.t / eighth);
          assert.ok(Math.abs(off) < 0.06, `timelapse: a tick at ${e.t} s is ${(off * eighth * 1000).toFixed(0)} ms off the beat`);
          assert.ok(e.t < report.music.drop[0], 'timelapse: no tick under the payoff');
        }
      }
    }
    // A bed turned all the way up still sits about 4 LU under the voice, as the house bed does at its loudest.
    const loud = await buildMix(dir, { log: false, sound: resolveSound({ preset: 'timelapse', musicVolume: 2 }) });
    assert.ok(loud.musicUnderVoice - loud.voice <= -3.9 && loud.musicUnderVoice - loud.voice >= -4.5, `${loud.musicUnderVoice - loud.voice} LU`);
    // No music and no effects: just the voice, still mastered.
    const bare = await buildMix(dir, { log: false, sound: { music: null, sfx: null } });
    assert.equal(bare.music, null);
    assert.equal(bare.sfx.length, 0);
    assert.ok(Math.abs(bare.lufs + 14) < 0.6, `${bare.lufs} LUFS`);
  } finally { done(); }
});

test('an episode’s own `sound` is what it mixes with', { timeout: 120_000 }, async () => {
  const { dir, done } = episodeDir({ sound: { preset: 'doodle' } });
  try {
    const report = await buildMix(dir, { log: false });
    assert.equal(report.music, null);
    assert.deepEqual(plain(report.sfx.map(e => e.sfx)), ['chime']);
    assert.ok(Math.abs(report.lufs + 14) < 0.6, `${report.lufs} LUFS`);
  } finally { done(); }
});

test('a brand pack’s `sound` is checked when it loads', () => {
  fs.mkdirSync(path.join(ROOT, '.tmp'), { recursive: true });
  const pack = fs.mkdtempSync(path.join(ROOT, '.tmp', 'test-brand-'));
  try {
    const src = path.join(ROOT, 'brands/creators-toolbox');
    fs.cpSync(src, pack, { recursive: true });
    const brand = JSON.parse(fs.readFileSync(path.join(src, 'brand.json'), 'utf8'));
    const load = sound => {
      fs.writeFileSync(path.join(pack, 'brand.json'), JSON.stringify({ ...brand, sound }));
      return spawnSync(process.execPath, ['--input-type=module', '-e', `const { BRAND } = await import(${JSON.stringify(path.join(ROOT, 'src/brandpack.mjs'))}); console.log(JSON.stringify(BRAND.sound))`], { env: { ...process.env, REELKIT_BRAND: pack }, encoding: 'utf8' });
    };
    const ok = load('diorama');
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout.trim(), '"diorama"');
    const bad = load({ preset: 'diorama', mood: 'jazz' });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /brand\.json "sound": no mood "jazz"/);
  } finally { fs.rmSync(pack, { recursive: true, force: true }); }
});

test('every bed and effects set has a sample: a bed levelled, a set trimmed to its sounds', () => {
  for (const mood of Object.keys(MOODS)) {
    const s = composeSample({ music: { mood } });
    assert.ok(Math.abs(s.lufs - SAMPLE_LUFS) < 1, `${mood}: ${s.lufs} LUFS`);
  }
  for (const set of SFX_SETS) {
    const s = composeSample({ sfx: { set, density: 'lots' } });
    assert.ok(s.events.length > 0, `${set}: plays something`);
    assert.ok(s.seconds > 0 && s.seconds < 12, `${set}: ${s.seconds} s`);
  }
});
