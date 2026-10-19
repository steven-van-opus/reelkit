// The styles (src/styles/): each one whole (identity, reference video, sound, palette, frame), every reference scene
// passing the code checks and painting in Node, its reference video a valid episode, the writer's instructions built
// from it, and the canvas look drawing it the same every time. Nothing in the styles names another creator.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { registerFonts } from '../src/brand.mjs';
import { STYLES, STYLE_IDS, styleOf } from '../src/styles/index.mjs';
import { referenceSets, referenceEpisode } from '../src/styles/reference.mjs';
import { lookGuide } from '../src/styles/guide.mjs';
import { CANVAS_STAGE, codeSceneErrors, runCodeScene, sampleInputs } from '../src/code/scene.mjs';
import { paintCodeTree } from '../src/code/paint.mjs';
import { canvasColors, canvasFont, createCanvasLook } from '../src/canvas.mjs';
import { SOUNDS } from '../src/audio/sound.mjs';
import { episodeSound } from '../src/audio.mjs';
import { applyHouseCta } from '../src/cta.mjs';
import { checkEpisode, STYLE_LIMITS } from '../src/validate.mjs';
import { styleGuide, buildPrompt, writerScenes } from '../src/write-script.mjs';
import { sceneSpecs } from '../src/validate.mjs';
import { contrastRatio } from '../src/util.mjs';

registerFonts();
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const plain = value => JSON.parse(JSON.stringify(value));
// Each style's scenes as the writer sees them: its reference video a scene per set (a chaptered one's held beats say
// their lines over the set before), plus the opening and examples it was designed from.
const scenesOf = style => [
  ...referenceSets(style.reference).map(b => ({ title: b.label, line: b.line, source: b.source })),
  style.opening,
  ...style.examples,
];

test('every style is whole: its id, identity, reference video, sound preset, palette and caption frame', () => {
  assert.deepEqual(STYLE_IDS, Object.keys(STYLES));
  for (const [id, style] of Object.entries(STYLES)) {
    assert.equal(style.id, id, 'its key is its id');
    assert.equal(styleOf(id), style);
    assert.ok(style.name && style.feel.length > 150, id);
    const { constant, topic, never } = style.identity;
    for (const list of [constant, topic, never]) assert.ok(list.length && list.every(item => typeof item === 'string' && item.length > 10), id);
    assert.ok(never.some(item => /reference video/.test(item)), `${id}: never copies the reference video's sets`);
    assert.ok(style.reference && referenceSets(style.reference).length >= 6, `${id}: a reference video`);
    for (const b of referenceSets(style.reference)) {
      assert.ok(b.place && b.place.length <= 60, `${id}: ${b.label} has a place`);
      assert.ok(b.label.length <= STYLE_LIMITS.label, `${id}: ${b.label}`);
    }
    // Its sound is the preset of the same name.
    assert.equal(style.sound, id, `${id}: its sound preset`);
    assert.ok(SOUNDS[id], `${id}: SOUNDS.${id}`);
    // Its colours read: text on the wall, text on a card.
    const colors = canvasColors(style.palette);
    assert.ok(contrastRatio(colors.ink, colors.wall) >= 4.5, `${id}: ink on the wall is ${contrastRatio(colors.ink, colors.wall).toFixed(2)}:1`);
    assert.ok(contrastRatio(colors.cardInk, colors.chalk) >= 4.5, `${id}: cardInk on chalk`);
    assert.ok(['line-left', 'line-center', 'word-chip', 'chips', 'serif'].includes(style.frame.captions.kind) && style.frame.captions.size >= 40, id);
    assert.equal(typeof style.frame.grain, 'boolean');
    assert.equal(typeof style.frame.vignette, 'boolean');
  }
});

test('every reference scene, opening and example passes the code checks on the canvas stage', () => {
  for (const [id, style] of Object.entries(STYLES)) {
    for (const e of scenesOf(style)) {
      assert.deepEqual(plain(codeSceneErrors(`${id}: ${e.title}`, e.source, e.line, new Set(['m01', 'm80', 'm81', 'm82']), CANVAS_STAGE)), [], `${id}: ${e.title}`);
    }
  }
});

test('every reference scene paints in Node at its start, middle and end, without falling back', () => {
  for (const [id, style] of Object.entries(STYLES)) {
    const colors = canvasColors(style.palette);
    const ctx = createCanvas(1080, 1920).getContext('2d');
    for (const e of scenesOf(style)) {
      const inputs = { ...sampleInputs(e.line, CANVAS_STAGE), colors, marks: {} };
      for (const time of [0, inputs.duration / 2, inputs.duration]) {
        const tree = runCodeScene(e.source, { ...inputs, time });
        assert.doesNotThrow(() => paintCodeTree(ctx, tree, { Path2D, font: canvasFont, ink: colors.ink, backdrop: colors.wall, image: () => null }), `${id}: ${e.title} at ${time.toFixed(1)} s`);
      }
    }
  }
});

test('every style\'s reference video is a valid styled episode, mixed with its own sound', async () => {
  for (const [id, style] of Object.entries(STYLES)) {
    const episode = applyHouseCta(referenceEpisode(style));
    assert.equal(episode.style, id);
    const { errors } = await checkEpisode(episode, { media: null });
    assert.deepEqual(errors, [], id);
    // Its sound is its style's preset, its closing cue landing as the keyword is said (the canvas look's closing).
    const sound = episodeSound(episode);
    assert.equal(sound.sfx.set, SOUNDS[id].sfx, id);
    assert.equal(sound.sfx.closing, undefined, id);
    assert.equal(sound.music === null, SOUNDS[id].musicOn === false, id);
  }
  // A style that doesn't exist, and a styled reel with a scene that isn't code, are refused.
  const atlas = applyHouseCta(referenceEpisode(STYLES.atlas));
  assert.match((await checkEpisode({ ...atlas, style: 'nope' }, { media: null })).errors.join('\n'), /style "nope" must be one of/);
  const fixed = { ...atlas, beats: atlas.beats.map((b, i) => (i === 2 ? { ...b, scene: 'stat', props: { value: '1' } } : b)) };
  assert.match((await checkEpisode(fixed, { media: null })).errors.join('\n'), /beat 3 \(stat\): unknown scene 'stat' \(known: cta, hook, code\)/);
});

test('the writer gets the style: its feel, identity and reference scenes, and the code-scene contract', async () => {
  const { specs } = await sceneSpecs();
  const scenes = writerScenes(specs);
  const cand = { id: 'x', name: 'Acme Sketch 3', items: [{ title: 'Acme ships Sketch 3', toolId: 'figma', date: '2026-10-19', url: 'https://acme.example/blog', body: 'Sketch 3 is out.' }], primary: { toolId: 'figma', title: 'Acme ships Sketch 3', url: 'https://acme.example/blog' }, tools: [{ id: 'figma', title: 'Figma' }], urls: [] };
  for (const style of Object.values(STYLES)) {
    const system = styleGuide(scenes, style);
    assert.ok(system.includes(style.feel), style.id);
    for (const b of referenceSets(style.reference)) assert.ok(system.includes(b.source), `${style.id}: ${b.label}`);
    assert.ok(system.includes(lookGuide(style)));
    assert.match(system, /## Code scenes\n/);
    assert.match(system, /## Best practices\n/);
    assert.doesNotMatch(system, /## Scenes and props|mascot \{ pose, face \}/, `${style.id}: no scene catalog`);
    const prompt = buildPrompt(cand, { specs: scenes, catalog: [], today: '2026-10-19', style });
    assert.match(prompt, new RegExp(`news reel in the ${style.name} style`));
    assert.match(prompt, /"scene": "code", "props": \{ "source": "…" \}/);
    assert.doesNotMatch(prompt, /## Scene catalog/);
  }
  // Without a style, the writer's instructions are the scene catalog's, as before.
  assert.match(styleGuide(scenes), /## Scenes and props/);
  assert.doesNotMatch(styleGuide(scenes), /## Code scenes/);
});

test('the canvas look draws a style\'s frames the same every time, captions in the band and the closing ask', () => {
  const style = STYLES.blueprint;
  const look = createCanvasLook({ palette: style.palette, frame: style.frame, canvas: createCanvas });
  const episode = applyHouseCta(referenceEpisode(style));
  let t = 0;
  const beats = episode.beats.map((b, i) => {
    const words = String(b.vo).split(/\s+/).map((text, k) => ({ text, start: t + 0.25 + k * 0.32, end: t + 0.25 + (k + 1) * 0.32 }));
    const out = { index: i, start: t, end: t + Math.max(2.4, words.length * 0.32 + 0.6), words };
    t = out.end;
    return out;
  });
  const timing = { duration: t, beats };
  const frame = (T, captions = true) => { const cv = createCanvas(1080, 1920); look.draw(cv.getContext('2d'), { ...episode, marks: {} }, timing, T, Math.round(T * 30), { captions }); return cv; };
  const a = frame(2.5), b = frame(2.5);
  assert.ok(a.toBuffer('image/png').equals(b.toBuffer('image/png')), 'deterministic');
  // The captions are drawn in the band, and only there: the frame without them differs only inside y 1300–1470.
  const plainFrame = frame(2.5, false).getContext('2d').getImageData(0, 0, 1080, 1920).data, withCaptions = a.getContext('2d').getImageData(0, 0, 1080, 1920).data;
  let first = Infinity, last = -1;
  for (let i = 0; i < plainFrame.length; i += 4) if (plainFrame[i] !== withCaptions[i] || plainFrame[i + 1] !== withCaptions[i + 1] || plainFrame[i + 2] !== withCaptions[i + 2]) { const y = Math.floor(i / 4 / 1080); first = Math.min(first, y); last = Math.max(last, y); }
  assert.ok(last > 0, 'the captions draw something');
  assert.ok(first >= 1280 && last <= 1480, `the captions are drawn in y ${first}–${last}`);
  // The closing: the house ask's keyword lands on a chip in the style's accent, centred under its headline.
  const close = beats.at(-1);
  const end = frame(close.start + 1.5, false).getContext('2d');
  const hex = ([r, g, bl]) => `#${[r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  assert.ok(contrastRatio(hex(end.getImageData(540, 775, 1, 1).data), canvasColors(style.palette).accent) < 1.1, 'the chip, above the keyword');
});

test('nothing in the engine names a creator a style was modelled on, or the app it came from', () => {
  const NAMES = /nocodealex|baultro|app\.engineering|observerstalk|postii|posty/i;
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'scripts')), ...walk(path.join(ROOT, 'docs')), ...['README.md', 'CLAUDE.md', 'brands/README.md'].map(f => path.join(ROOT, f))]) {
    if (!/\.(mjs|md|json|sh)$/.test(file)) continue;
    const hit = fs.readFileSync(file, 'utf8').match(NAMES);
    assert.equal(hit, null, `${path.relative(ROOT, file)} names "${hit?.[0]}"`);
  }
});
