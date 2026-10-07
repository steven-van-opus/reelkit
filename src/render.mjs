// Frame renderer: draws every frame of an episode on a 2D canvas and pipes raw
// RGBA into ffmpeg. No video framework — just canvas + ffmpeg.
//
//   node src/render.mjs episodes/<id>                 full mp4 (parallel workers)
//   node src/render.mjs episodes/<id> --stills        stills.png contact sheet, one frame per beat
//   node src/render.mjs episodes/<id> --frame 3.2     frame-3.2.png at t = 3.2s
//        [--out file.png]   write it there instead
//        [--cover]          a designed still: no caption chips, no confetti (cover.png)
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { createCanvas } from '@napi-rs/canvas';
import { W, H, FPS, C, SETS, registerFonts } from './brand.mjs';
import { drawSet } from './backgrounds.mjs';
import { drawHeader, drawCaptions } from './overlay.mjs';
import { drawMascot } from './mascot.mjs';
import { tornRectPath } from './paper.mjs';
import { SCENES, fallbackScene } from './scenes/index.mjs';
import { clamp, ease, onTwos, spring, luminance } from './util.mjs';
import { prepareBrand } from './brandmark.mjs';
import { applyHouseCta } from './cta.mjs';
import { prepareLogos } from './logos.mjs';
import { prepareShots } from './shots.mjs';
import { findMentions, mentionedToolIds } from './mentions.mjs';
import { prepareMedia, mediaItem, beatMediaIds } from './mediastore.mjs';
import { matchTool } from './scenes/studio/where.mjs';
import { readWav } from './tts.mjs';
import { visemeTrack } from './lipsync.mjs';
import { alignWords, detectSilences } from './align.mjs';
import { FX } from './fx.mjs';

// Kit is drawn this much larger than scenes ask for.
const KIT_SCALE = 1.1;

registerFonts();

const TRANSITION = 0.32; // seconds of paper-slide between beats

// Everything a frame draws from disk or network is loaded up front, because
// frames render synchronously.
export async function prepareAssets(episode, dir, timing, [t0, t1] = [0, Infinity]) {
  await prepareBrand();
  // Logos: mentioned products, plus 'where' items named by text ("Vercel AI Gateway").
  const whereIds = (episode.beats || []).filter(b => b.scene === 'where')
    .flatMap(b => (b.props?.items || []).map(it => (typeof it === 'string' ? matchTool(it) : it?.logo || matchTool(it?.text || ''))))
    .filter(Boolean);
  await prepareLogos(episode, [...mentionedToolIds(episode), ...whereIds]);
  await prepareShots(episode);
  // Source media: video frames are loaded only for the beats this renderer
  // touches in [t0, t1), in beat-local time.
  const windows = new Map();
  timing.beats.forEach((b, i) => {
    if (b.end + TRANSITION < t0 || b.start > t1) return;
    const a = Math.max(0, t0 - b.start - TRANSITION), z = Math.min(b.end - b.start + TRANSITION, t1 - b.start) + 0.2;
    for (const id of beatMediaIds(episode.beats[i])) {
      const w = windows.get(id);
      windows.set(id, w ? [Math.min(w[0], a), Math.max(w[1], z)] : [a, z]);
    }
  });
  await prepareMedia({ ...episode, beats: episode.beats.filter((_, i) => timing.beats[i].end + TRANSITION >= t0 && timing.beats[i].start <= t1) }, dir, { windows });
}

const mentionCache = new WeakMap();
function beatMentions(episode, timing, i) {
  let byBeat = mentionCache.get(timing);
  if (!byBeat) mentionCache.set(timing, (byBeat = []));
  if (!byBeat[i]) {
    const beat = episode.beats[i];
    byBeat[i] = beat.logos === false ? new Map() : findMentions(timing.beats[i].words, {
      subjectToolId: episode.source?.toolId,
      explicit: Array.isArray(beat.logos) ? beat.logos : null,
    });
  }
  return byBeat[i];
}

// Lip sync: the narration's loudness per frame, 0..1 — fast to open, a little
// slower to close, gated so breaths and room tone keep the mouth shut.
function mouthTrack(dir, frames) {
  const file = path.join(dir, 'vo.wav');
  if (!fs.existsSync(file)) return null;
  const { rate, samples } = readWav(file);
  const win = Math.round(rate / FPS);
  const raw = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const a = f * win;
    for (let k = a; k < Math.min(samples.length, a + win); k++) sum += samples[k] * samples[k];
    raw[f] = Math.sqrt(sum / win);
  }
  const ref = [...raw].sort((x, y) => x - y)[Math.floor(frames * 0.95)] || 1;
  const out = new Float32Array(frames);
  let v = 0;
  for (let f = 0; f < frames; f++) {
    const target = Math.max(0, Math.min(1, (raw[f] / ref - 0.12) / 0.75));
    v = target > v ? v + (target - v) * 0.85 : v + (target - v) * 0.45;
    out[f] = v < 0.05 ? 0 : v;
  }
  return out;
}

export function loadEpisode(dir) {
  const episode = applyHouseCta(JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8')));
  const timingFile = path.join(dir, 'voice.json');
  let timing;
  if (fs.existsSync(timingFile)) {
    timing = JSON.parse(fs.readFileSync(timingFile, 'utf8'));
    // A Kokoro voice that skipped the pipeline's align step (node src/tts.mjs
    // on its own) still gets captions pinned to its pauses, in memory.
    const vo = path.join(dir, 'vo.wav');
    if (!timing.aligned && timing.voice?.engine !== 'elevenlabs' && fs.existsSync(vo)) {
      try {
        const silences = detectSilences(vo);
        for (const b of timing.beats) { const r = alignWords(b.words || [], silences); if (r) b.words = r.words; }
      } catch { /* keep the estimates */ }
    }
  } else {
    // No voice yet (layout preview): 3.2s per beat, evenly spaced words.
    let t = 0;
    const beats = episode.beats.map((b, i) => {
      const words = String(b.vo || '').split(/\s+/).filter(Boolean);
      const dur = Math.max(2.4, words.length * 0.32 + 0.6);
      const out = { index: i, start: t, end: t + dur, words: words.map((w, k) => ({ text: w, raw: w, start: t + 0.25 + k * 0.32, end: t + 0.25 + (k + 1) * 0.32 })) };
      t += dur;
      return out;
    });
    timing = { duration: t + 1, beats };
    timing.beats[timing.beats.length - 1].end = timing.duration;
  }
  const frames = Math.ceil(timing.duration * FPS) + 2;
  timing.mouth = mouthTrack(dir, frames);
  // Mouth shapes per frame from the (aligned) words, opened by the loudness.
  timing.visemes = visemeTrack(timing.beats.flatMap(b => b.words), frames, FPS, timing.mouth);
  return { episode, timing };
}

function sceneState(ctx, episode, timing, i, t, T, frame) {
  const beat = episode.beats[i];
  const bt = timing.beats[i];
  const dur = bt.end - bt.start;
  const words = bt.words.map(w => ({ ...w, start: w.start - bt.start, end: w.end - bt.start }));
  const setName = beat.set || 'rose';
  const s = {
    ctx, t, ts: onTwos(t), dur, T, frame,
    beat, props: beat.props || {}, episode, index: i, count: episode.beats.length,
    setName, set: SETS[setName] || SETS.rose,
    accent: episode.subject?.accent || C.pink,
    words,
    voStart: (bt.voStart ?? words[0]?.start + bt.start ?? bt.start) - bt.start,
    voEnd: (bt.voEnd ?? words[words.length - 1]?.end + bt.start ?? bt.end) - bt.start,
    // Local time the first word matching `needle` is spoken (or null).
    // Numbers match whole tokens ("16" won't hit "2016"); words match substrings.
    // The needle is normalised like the words, so "8:1" finds the spoken "8:1.".
    wordTime(needle) {
      const norm = x => x.text.toLowerCase().replace(/[^\p{L}\p{N}.%$+]/gu, '').replace(/\.$/, '');
      const n = norm({ text: String(needle) });
      if (!n) return null;
      const numeric = /^[\d.,$%x+k]+$/i.test(n);
      const w = words.find(x => (numeric ? norm(x) === n || norm(x).replace(/[,$%]/g, '') === n.replace(/[,$%]/g, '') : norm(x).includes(n)));
      return w ? w.start : null;
    },
    // 0 → 1 pop-in that starts at `delay` seconds into the beat (stop-motion stepped).
    enter(delay = 0, dur = 0.5) {
      const p = clamp((onTwos(t) - delay) / dur);
      return p <= 0 ? 0 : p >= 1 ? 1 : ease.outBack(p, 1.9);
    },
    // Smooth damped spring from `delay` (overshoots, then settles).
    spring(delay = 0, opts) { return spring(onTwos(t) - delay, opts); },
    // Kit: the scene places Kit; the script's beat.mascot (pose/face) wins.
    kit(opts = {}) {
      const dark = (SETS[setName] || {}).tone === 'light' || (SETS[setName] || {}).ink === C.chalk;
      // Narrating (inside this beat's speech) → lip sync; otherwise Kit's posed face.
      const speaking = timing.visemes && t >= s.voStart - 0.08 && t <= s.voEnd + 0.08;
      const talk = speaking ? timing.visemes[Math.max(0, Math.min(timing.visemes.length - 1, Math.round(T * FPS)))] : null;
      drawMascot(ctx, { t, dark, talk, wall: (SETS[setName] || {}).wall, ...opts, ...(beat.mascot || {}), s: (opts.s ?? 1) * KIT_SCALE });
    },
    // Source media by id ('m03'): { kind, img, width, height, frameAt(t), caption, alt, url }.
    media: id => mediaItem(id),
    // The current frame of a media item (videos play from the beat start, `offset` s later).
    mediaFrame(id, offset = 0) { const m = mediaItem(id); return m ? m.frameAt(Math.max(0, t - offset)) : null; },
  };
  return s;
}

function drawBeat(ctx, episode, timing, i, t, T, frame) {
  const beat = episode.beats[i];
  const dur = timing.beats[i].end - timing.beats[i].start;
  const scene = SCENES[beat.scene] || fallbackScene;
  // Camera: gentle push-in across the beat plus a slow drift.
  const push = 1 + 0.035 * ease.inOutQuad(clamp(t / Math.max(dur, 0.1)));
  const driftX = Math.sin(T * 0.45 + i) * 6;
  const driftY = Math.cos(T * 0.37 + i) * 4;
  ctx.save();
  ctx.translate(W / 2 + driftX, H * 0.52 + driftY);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H * 0.52);
  // The set is drawn with overscan, so the drift never uncovers a frame edge.
  drawSet(ctx, beat.set || 'rose');
  scene.draw(sceneState(ctx, episode, timing, i, t, T, frame));
  ctx.restore();
}

// opts.captions = false leaves the caption chips out (the cover).
export function drawFrame(ctx, episode, timing, T, frame = Math.round(T * FPS), { captions = true } = {}) {
  const beats = timing.beats;
  let i = beats.findIndex(b => T >= b.start && T < b.end);
  if (i < 0) i = T < beats[0].start ? 0 : beats.length - 1;
  const t = T - beats[i].start;

  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);

  if (i > 0 && t < TRANSITION) {
    // Paper slide: the next beat arrives as a sheet sliding in from the right,
    // with a torn leading edge, over the outgoing beat drifting left.
    const p = ease.inOutCubic(t / TRANSITION);
    const prev = beats[i - 1];
    ctx.save();
    ctx.translate(-p * W * 0.28, 0);
    drawBeat(ctx, episode, timing, i - 1, prev.end - prev.start + t, T, frame);
    ctx.restore();
    const edge = (1 - p) * W;
    // Shadow cast by the incoming sheet.
    const g = ctx.createLinearGradient(edge - 60, 0, edge, 0);
    g.addColorStop(0, 'rgba(30,0,20,0)');
    g.addColorStop(1, 'rgba(30,0,20,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(edge - 60, 0, 60, H);
    ctx.save();
    ctx.beginPath();
    tornRectPath(ctx, edge, -20, W + 40, H + 40, { seed: `wipe-${i}`, rough: 9, step: 16, edges: 'l' });
    ctx.clip();
    ctx.translate(edge, 0);
    drawBeat(ctx, episode, timing, i, t, T, frame);
    ctx.restore();
  } else {
    drawBeat(ctx, episode, timing, i, t, T, frame);
  }

  // Label and captions change with the scene: while the incoming sheet is
  // less than halfway across, the outgoing beat keeps its label (and chips);
  // the new label slaps on as the sheet passes the middle. The first beat's
  // label is already up on frame 0, so the reel opens on a finished frame.
  const half = TRANSITION / 2;
  const k = i > 0 && t < half ? i - 1 : i;
  const beat = episode.beats[k];
  const prevLabel = k > 0 ? episode.beats[k - 1].label : null;
  const lt = k < i ? t + (beats[i - 1].end - beats[i - 1].start) : k === 0 ? t + 0.4 : t - half;
  const set = SETS[beat.set] || {};
  drawHeader(ctx, beat.label, lt, { slap: beat.label !== prevLabel, seed: beat.label, dark: set.tone === 'light', darkWall: !!set.wall && luminance(set.wall) < 0.1 });
  if (captions) drawCaptions(ctx, beats[k].words, k < i ? Math.min(T, beats[i].start - 0.001) : T, { mentions: beatMentions(episode, timing, k) });
}

// ---------------------------------------------------------------- outputs

function stills(dir, episode, timing) {
  const n = timing.beats.length;
  const cols = Math.min(n, 6), rows = Math.ceil(n / cols);
  const sw = 360, sh = 640;
  const sheet = createCanvas(cols * sw, rows * sh);
  const sctx = sheet.getContext('2d');
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  timing.beats.forEach((b, i) => {
    const local = Math.min(b.end - b.start - 0.05, Math.max(1.4, (b.end - b.start) * 0.6));
    drawFrame(ctx, episode, timing, b.start + local);
    sctx.drawImage(cv, (i % cols) * sw, Math.floor(i / cols) * sh, sw, sh);
  });
  const out = path.join(dir, 'stills.png');
  fs.writeFileSync(out, sheet.toBuffer('image/png'));
  return out;
}

function frameAt(dir, episode, timing, T, { out = null, cover = false } = {}) {
  const cv = createCanvas(W, H);
  FX.confetti = !cover;
  drawFrame(cv.getContext('2d'), episode, timing, T, Math.round(T * FPS), { captions: !cover });
  FX.confetti = true;
  const file = out ? path.resolve(out) : path.join(dir, `frame-${T}.png`);
  fs.writeFileSync(file, cv.toBuffer('image/png'));
  return file;
}

// Render frames [from, to) to a video-only mp4.
async function renderSegment(dir, from, to, outFile) {
  const { episode, timing } = loadEpisode(dir);
  await prepareAssets(episode, dir, timing, [from / FPS, to / FPS]);
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const ff = spawn('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = from; f < to; f++) {
    drawFrame(ctx, episode, timing, f / FPS, f);
    const buf = ctx.getImageData(0, 0, W, H).data;
    if (!ff.stdin.write(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength))) {
      await new Promise(r => ff.stdin.once('drain', r));
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', code => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)))));
}

export async function renderEpisode(dir, { workers = Math.max(1, Math.min(8, os.cpus().length - 2)) } = {}) {
  const { timing } = loadEpisode(dir);
  const total = Math.ceil(timing.duration * FPS);
  const tmp = path.join(dir, '.segments');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const per = Math.ceil(total / workers);
  const started = Date.now();
  const segs = [];
  await Promise.all(Array.from({ length: workers }, (_, k) => {
    const from = k * per, to = Math.min(total, (k + 1) * per);
    if (from >= to) return null;
    const file = path.join(tmp, `seg-${String(k).padStart(2, '0')}.mp4`);
    segs.push(file);
    return new Promise((res, rej) => {
      const child = spawn(process.execPath, [new URL(import.meta.url).pathname, dir, '--segment', `${from}:${to}`, '--out', file], { stdio: 'inherit' });
      child.on('close', code => (code === 0 ? res() : rej(new Error(`worker ${k} exited ${code}`))));
    });
  }));
  segs.sort();
  fs.writeFileSync(path.join(tmp, 'list.txt'), segs.map(f => `file '${f}'`).join('\n'));

  const mix = fs.existsSync(path.join(dir, 'mix.wav')) ? path.join(dir, 'mix.wav') : path.join(dir, 'vo.wav');
  const out = path.join(dir, 'reel.mp4');
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'),
    ...(fs.existsSync(mix) ? ['-i', mix, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000'] : []),
    '-c:v', 'copy', '-movflags', '+faststart', '-shortest', out,
  ]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  rendered ${total} frames in ${((Date.now() - started) / 1000).toFixed(1)}s → ${path.relative(process.cwd(), out)}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = path.resolve(args.find(a => !a.startsWith('--') && !/^\d/.test(a)) || '.');
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? true : null; };
  const { episode, timing } = loadEpisode(dir);
  if (!flag('--segment')) await prepareAssets(episode, dir, timing, flag('--frame') ? [Number(flag('--frame')) - 0.5, Number(flag('--frame')) + 0.5] : [0, Infinity]);
  if (flag('--segment')) {
    const [a, b] = String(flag('--segment')).split(':').map(Number);
    await renderSegment(dir, a, b, flag('--out'));
  } else if (flag('--stills')) {
    console.log(stills(dir, episode, timing));
  } else if (flag('--frame')) {
    console.log(frameAt(dir, episode, timing, Number(flag('--frame')), { out: typeof flag('--out') === 'string' ? flag('--out') : null, cover: args.includes('--cover') }));
  } else {
    await renderEpisode(dir, { workers: flag('--workers') ? Number(flag('--workers')) : undefined });
  }
}
