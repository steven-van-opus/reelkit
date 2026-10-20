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
import { CODE_EXAMPLE, lookGuide } from '../src/styles/guide.mjs';
import { ACTING_WARNING, CANVAS_STAGE, codeSceneErrors, codeSceneWarnings, runCodeScene, sampleInputs } from '../src/code/scene.mjs';
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

test('every style is whole: its folder, id, identity, reference video, sound, palette and caption frame', () => {
  assert.deepEqual(STYLE_IDS, Object.keys(STYLES));
  // One folder per style, each registered by its style.mjs (its id the folder's name).
  const folders = fs.readdirSync(path.join(ROOT, 'src/styles'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
  assert.deepEqual(STYLE_IDS, folders);
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
    // Its sound is its own, offered as the preset of its id.
    assert.ok(style.sound && style.sound.mood && style.sound.sfx, `${id}: its sound`);
    assert.equal(SOUNDS[id], style.sound, `${id}: SOUNDS.${id}`);
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

test('every scene after the opening of a style\'s reference video raises no text-led warning, and neither does the guide\'s example', () => {
  // The opening may land its hook word as type (best-practices.mjs "The hook lands on its word"), so it isn't checked.
  // No warning at all: each scene also runs with none of its words said yet (a scene that couldn't be checked that way
  // would say so). Passing is a floor, not a model: some reference scenes act only through a small shape beside their
  // number, and the writer is told to redesign those moments (guide.mjs REMAKE_RULES).
  for (const [id, style] of Object.entries(STYLES)) {
    for (const b of referenceSets(style.reference).slice(1)) {
      assert.deepEqual(plain(codeSceneWarnings(`${id}: ${b.label}`, b.source, b.line, CANVAS_STAGE)), [], `${id}: ${b.label}`);
    }
  }
  assert.deepEqual(plain(codeSceneErrors('the guide\'s example', CODE_EXAMPLE.source, CODE_EXAMPLE.line, new Set(), CANVAS_STAGE)), []);
  assert.deepEqual(plain(codeSceneWarnings('the guide\'s example', CODE_EXAMPLE.source, CODE_EXAMPLE.line, CANVAS_STAGE)), []);
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
    const { errors, warnings } = await checkEpisode(episode, { media: null });
    assert.deepEqual(errors, [], id);
    assert.deepEqual(warnings.filter(w => w.includes(ACTING_WARNING) || /payoff/.test(w)), [], id);
    // Its last scene is the payoff it builds to, held a second longer.
    assert.deepEqual(episode.beats.map((b, i) => (b.payoff ? i : -1)).filter(i => i >= 0), [episode.beats.length - 2], id);
    // Its sound is its style's preset, its closing cue landing as the keyword is said (the canvas look's closing).
    const sound = episodeSound(episode);
    assert.equal(sound.sfx.set, SOUNDS[id].sfx, id);
    assert.equal(sound.sfx.closing, undefined, id);
    assert.equal(sound.music === null, SOUNDS[id].musicOn === false, id);
  }
  // A style that doesn't exist, and a styled reel with a scene that isn't code, are refused.
  const map = applyHouseCta(referenceEpisode(STYLES.map));
  assert.match((await checkEpisode({ ...map, style: 'nope' }, { media: null })).errors.join('\n'), /style "nope" must be one of/);
  const fixed = { ...map, beats: map.beats.map((b, i) => (i === 2 ? { ...b, scene: 'stat', props: { value: '1' } } : b)) };
  assert.match((await checkEpisode(fixed, { media: null })).errors.join('\n'), /beat 3 \(stat\): unknown scene 'stat' \(known: cta, hook, code\)/);
  // A scene that types its line out over a still card is warned as text-led, never refused; the opening isn't checked.
  const typed = `export default function Scene({ time, colors, words }) {
  return <svg>
    <rect x={0} y={0} width={1080} height={1920} fill={colors.wall}/>
    <rect x={140} y={400} width={800} height={700} rx={40} fill={colors.chalk}/>
    <text x={540} y={700} width={700} maxLines={4} textAnchor="middle" fontSize={64} fontWeight={800} fill={colors.cardInk}>{words.filter(w => w.start <= time).map(w => w.text).join(' ')}</text>
  </svg>;
}`;
  const typedAt = k => ({ ...map, beats: map.beats.map((b, i) => (i === k ? { ...b, props: { ...b.props, source: typed } } : b)) });
  const third = await checkEpisode(typedAt(2), { media: null });
  assert.deepEqual(third.errors, []);
  assert.match(third.warnings.join('\n'), /beat 3 \(code\): only words and numbers change as its line is said; nothing drawn moves, turns, grows, fills or swaps on a word, so the scene is text-led/);
  const opening = await checkEpisode(typedAt(0), { media: null });
  assert.deepEqual(opening.errors, []);
  assert.deepEqual(opening.warnings.filter(w => w.includes(ACTING_WARNING)), []);
  // The opening is beat 1, whatever its scene: a 'hook' later on is refused, never let off the check.
  const lateHook = { ...map, beats: map.beats.map((b, i) => (i === 2 ? { ...b, scene: 'hook', props: { title: 'Mid hook', source: typed } } : b)) };
  const late = await checkEpisode(lateHook, { media: null });
  assert.match(late.errors.join('\n'), /beat 3 \(hook\): only beat 1 is the 'hook'; every beat after it is a 'code' scene/);
  assert.match(late.warnings.join('\n'), /beat 3 \(hook\): only words and numbers change as its line is said/);
  // A scene with errors gets them, not the warning on top.
  const zebra = typed.replace('fill={colors.chalk}/>', "fill={colors.chalk} opacity={easeOut(clamp(time - at('zebra')))}/>");
  const broken = await checkEpisode({ ...map, beats: map.beats.map((b, i) => (i === 2 ? { ...b, props: { source: zebra } } : b)) }, { media: null });
  assert.match(broken.errors.join('\n'), /beat 3 \(code\): at\('zebra'\) isn't a word of this beat's vo/);
  assert.deepEqual(broken.warnings.filter(w => w.startsWith('beat 3') && w.includes(ACTING_WARNING)), []);
  // The payoff: one beat after the opening, marked true; none is a warning, two or a misplaced one an error.
  const marked = (marks) => ({ ...map, beats: map.beats.map((b, i) => { const { payoff, ...rest } = b; return i in marks ? { ...rest, payoff: marks[i] } : rest; }) });
  assert.match((await checkEpisode(marked({}), { media: null })).warnings.join('\n'), /no beat is marked "payoff": true/);
  assert.match((await checkEpisode(marked({ 3: true, 5: true }), { media: null })).errors.join('\n'), /2 beats are marked "payoff": true; mark only the one line the reel builds to/);
  assert.match((await checkEpisode(marked({ 0: true }), { media: null })).errors.join('\n'), /beat 1 \(hook\): only a beat after the opening and before the closing ask can be the payoff/);
  assert.match((await checkEpisode(marked({ 3: 'yes' }), { media: null })).errors.join('\n'), /beat 4 \(code\): payoff must be true/);
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
    assert.match(prompt, /"scene": "code", "payoff": true, "props"/);
    // Its reference's last scene is shown as the payoff, held.
    const sets = referenceSets(style.reference);
    assert.ok(system.includes(`### Scene ${sets.length}, the payoff (its beat marked "payoff": true, held): ${sets.at(-1).label}`), style.id);
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
