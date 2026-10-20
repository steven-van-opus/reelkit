// Code scenes (src/code/scene.mjs): they run in the interpreter with their clock, words and colours; the validator's
// checks tell the writer what's wrong; the painter (src/code/paint.mjs) draws them, keeping words readable.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import * as code from '../src/code/scene.mjs';
import { paintCodeTree, contrastOf, rgbaOf } from '../src/code/paint.mjs';
import { CAPTION_BAND } from '../src/code/safe-zone.mjs';
import { estimateTiming, estimateBeat, PAYOFF_HOLD } from '../src/code/timing.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const plain = value => JSON.parse(JSON.stringify(value));
const colors = { ink: '#111111', cardInk: '#111111', chalk: '#ffffff', accent: '#ff2e88', pink: '#ff2e88', rose: '#ffe4f1', blush: '#ffc9e3', wall: '#ffe4f1', floor: '#f6b3d3' };
const VO = 'Adobe charges sixty a month, and this one is free.';
const inputs = (time, vo = VO) => ({ time, duration: 4, words: code.evenWords(vo, 4), voStart: 0.15, voEnd: 3.6, colors });

const SCENE = `export default function Scene({ time, colors, stage, words }) {
  const p = easeOut(clamp((time - at('free')) / 0.5));
  return <svg>
    <rect x={stage.left} y={400} width={940 * p} height={200} rx={30} fill={colors.accent}/>
    <text x={540} y={500} width={800} maxLines={2} textAnchor="middle" fontSize={90}>Free <tspan fill={colors.accent}>{words.length}</tspan></text>
    <image href={asset('m01')} x={100} y={700} width={300} height={300}/>
  </svg>;
}`;

test('a code scene runs in the interpreter with its clock, its words and its colours', () => {
  const before = plain(code.runCodeScene(SCENE, inputs(0)));
  const after = plain(code.runCodeScene(SCENE, inputs(4)));
  assert.equal(before.tag, 'svg');
  assert.equal(before.children[0].props.width, 0, 'nothing before "free" is said');
  assert.equal(after.children[0].props.width, 940);
  assert.equal(after.children[0].props.fill, '#ff2e88');
  assert.equal(code.codeAssetId(after.children[2].props.href), 'm01', 'an image names its media id');
  const { texts, media } = code.codeContent(code.runCodeScene(SCENE, inputs(4)));
  assert.deepEqual(plain(texts), ['Free 10']);
  assert.deepEqual(plain(media), ['m01']);
  assert.ok(code.cueTime(code.evenWords(VO, 4), 'free', { voStart: 0, voEnd: 4 }) > 3, 'at() is when the word is said');
  for (const bad of ['window.location', 'fetch("/api")', 'globalThis', 'x.constructor']) {
    assert.throws(() => code.runCodeScene(`export default function Scene() { const v = ${bad}; return <svg/>; }`, inputs(1)), bad);
  }
});

test('the writer is told what a code scene got wrong: code that fails, unspoken cues, unknown media and logos, HTML', () => {
  assert.deepEqual(plain(code.codeSceneErrors('beat 2 (code)', SCENE, VO, new Set(['m01']))), []);
  const errors = (source, known = []) => code.codeSceneErrors('beat 2 (code)', source, VO, new Set(known));
  assert.match(errors(SCENE)[0], /asset\('m01'\) is not a media id from the list/);
  assert.match(errors(SCENE.replace("asset('m01')", "asset('m83')"))[0], /asset\('m83'\) is a logo id, which has no picture; place the declared logo with <Mark id="m83" …\/>/);
  assert.match(errors(SCENE.replace("at('free')", "at('cheap')"), ['m01'])[0], /at\('cheap'\) isn't a word of this beat's vo/);
  assert.match(errors('export default function Scene() { return <svg><div>hi</div></svg>; }')[0], /<div> isn't drawn; a code scene is SVG only/);
  assert.match(errors('export default function Scene({ time }) { return time > 1 ? <svg>{nope}</svg> : <svg><rect width={1} height={1}/></svg>; }')[0], /the code fails at \d\.\d s: Unknown scene value: nope/);
  assert.match(errors('export default function Scene() { return <svg/>; }')[0], /draws nothing/);
  assert.match(errors(SCENE.replace('fontSize={90}', 'fontSize={24}'), ['m01'])[0], /fontSize 24 is too small to read on a phone/);
  const mark = '<Mark id="m80" x={540} y={760} size={800}/>';
  const logo = `export default function Scene() { return <svg>${mark}<text x={540} y={1200} textAnchor="middle" fontSize={80}>free</text></svg>; }`;
  assert.match(errors(logo)[0], /<Mark id="m80"\/> isn't a declared logo; add it to the episode's top-level "logos"/);
  assert.deepEqual(plain(errors(logo, ['m80'])), []);
  assert.match(errors('x'.repeat(code.CODE_LIMITS.source + 1))[0], /max 6000/);
});

test('text the same colour as the shape behind it is caught, as on a dark set where ink is light', () => {
  const card = fill => `export default function Scene({ colors }) { return <svg><rect x={100} y={400} width={880} height={700} fill={colors.chalk}/><text x={540} y={760} textAnchor="middle" fontSize={200} fill={colors.${fill}}>$96.2</text></svg>; }`;
  assert.match(code.codeSceneErrors('beat 3 (code)', card('ink'), VO, new Set())[0], /"\$96\.2" is drawn in the same colour as the shape behind it on a dark set; use colors\.cardInk/);
  assert.deepEqual(plain(code.codeSceneErrors('beat 3 (code)', card('cardInk'), VO, new Set())), []);
});

// A full-frame shape behind a card with a headline; `paint` sets its attributes from `k`, the scene's time.
const flashing = (paint, size = 'x={0} y={0} width={1080} height={1920}') => `export default function Scene({ time, colors }) {
  const k = time;
  return <svg>
    <rect ${size} ${paint}/>
    <rect x={140} y={460} width={800} height={640} rx={40} fill={colors.chalk}/>
    <text x={540} y={820} textAnchor="middle" fontSize={120} fontWeight={900} fill={colors.cardInk}>FREE</text>
  </svg>;
}`;

test('nothing large flashes more than 3 times a second, checked at every frame of the beat', () => {
  const errors = source => code.codeSceneErrors('beat 4 (code)', source, VO, new Set());
  assert.match(errors(flashing('fill={Math.floor(k * 8) % 2 === 0 ? colors.accent : colors.cardInk}'))[0], /flashes about 4 times a second .*photosensitive viewers/);
  assert.match(errors(flashing('fill={colors.accent} opacity={Math.floor(k * 8) % 2}'))[0], /flashes about 4 times a second/);
  assert.match(errors(flashing('fill={colors.accent} opacity={Math.floor(k * 30) % 2}'))[0], /flashes about 15 times a second/);
  // Not flashing: 2.5 times a second, a small shape blinking fast (a cursor), a gentle pulse, a large shape sliding.
  assert.deepEqual(plain(errors(flashing('fill={colors.accent} opacity={Math.floor(k * 5) % 2}'))), []);
  assert.deepEqual(plain(errors(flashing('fill={colors.accent} opacity={Math.floor(k * 12) % 2}', 'x={900} y={1100} width={24} height={90}'))), []);
  assert.deepEqual(plain(errors(flashing('fill={colors.accent} opacity={0.9 + 0.1 * Math.sin(k * 26)}'))), []);
  assert.deepEqual(plain(errors(flashing('fill={colors.accent}', 'x={-1080 + 900 * k} y={0} width={1080} height={1920}'))), []);
});

test('on a style\'s full-frame stage, no words sit under the spoken-word captions at any moment of the beat', () => {
  const note = fade => `export default function Scene({ time, colors }) {
  const out = clamp((time - ${fade}) / 0.2);
  return <svg>
    <rect x={60} y={300} width={900} height={900} rx={40} fill={colors.chalk}/>
    <text x={540} y={700} textAnchor="middle" fontSize={120} fontWeight={900} fill={colors.cardInk}>BIG IDEA</text>
    <text x={540} y={${CAPTION_BAND.top + 100}} textAnchor="middle" fontSize={64} fontWeight={800} fill={colors.ink} opacity={1 - out}>small print</text>
  </svg>;
}`;
  const errors = (source, stage = code.CANVAS_STAGE) => code.codeSceneErrors('beat 5 (code)', source, VO, new Set(), stage);
  assert.match(errors(note("at('free')"))[0], /^beat 5 \(code\): "small print" sits under the spoken-word captions from 0\.0 s to \d\.\d s .*the captions are drawn across y 1300–1470/);
  assert.deepEqual(plain(errors(note('0.1'))), [], 'gone within 0.4 s');
  // Every frame runs: code that fails between the start, middle and end samples is caught.
  const late = "export default function Scene({ time, colors }) { return <svg><rect x={100} y={400} width={880} height={700} fill={colors.chalk}/><text x={540} y={760} textAnchor=\"middle\" fontSize={120} fill={colors.cardInk}>{time > 1 && time < 1.5 ? nope : 'OK'}</text></svg>; }";
  assert.match(errors(late)[0], /^beat 5 \(code\): the code fails at 1\.\d s: Unknown scene value: nope/);
});

test('a scene whose drawing never acts on its words is warned: text-led, or nothing landing on a word at all', () => {
  const warn = source => code.codeSceneWarnings('beat 3 (code)', source, VO, code.CANVAS_STAGE);
  // A card that sits still while its count runs up on "sixty" and its label fades in on "free", beside a blob that
  // drifts on the clock: the drift runs the same whether or not the words are said, so it isn't the drawing acting.
  const scene = (card, extra = '') => `export default function Scene({ time, colors }) {
  const n = Math.round(interpolate(time, at('sixty'), at('sixty') + 0.8, 0, 60));
  const p = easeOut(clamp((time - at('free')) / 0.5));
  return <svg>
    <rect x={0} y={0} width={1080} height={1920} fill={colors.wall}/>
    <circle cx={200 + 40 * Math.sin(time * 3)} cy={380} r={90} fill={colors.blush}/>
    <rect x={140} y={460} width={800} height={640} rx={40} fill={colors.chalk} ${card}/>
    <text x={540} y={800} textAnchor="middle" fontSize={240} fontWeight={900} fill={colors.accent}>{n}</text>
    <text x={540} y={960} textAnchor="middle" fontSize={64} fontWeight={800} fill={colors.cardInk} opacity={p}>free</text>
    ${extra}
  </svg>;
}`;
  assert.deepEqual(plain(code.codeSceneErrors('beat 3 (code)', scene(''), VO, new Set(), code.CANVAS_STAGE)), [], 'it passes every check');
  assert.match(warn(scene(''))[0], /^beat 3 \(code\): only words and numbers change as its line is said \(on "sixty", "free"\); nothing drawn moves, turns, grows, fills or swaps on a word, so the scene is text-led/);
  // The drawing acting on a word, however it acts: the card tips, a shape arrives, a stroke draws itself, a fill swaps.
  assert.deepEqual(plain(warn(scene('transform={`rotate(${-8 * p} 940 1100)`}'))), []);
  assert.deepEqual(plain(warn(scene('', '<circle cx={540} cy={1200} r={60} fill={colors.accent} opacity={p}/>'))), []);
  assert.deepEqual(plain(warn(scene('', '<path d="M 200 1150 L 880 1150" fill="none" stroke={colors.accent} strokeWidth={12} strokeDasharray={680} strokeDashoffset={680 * (1 - p)}/>'))), []);
  assert.deepEqual(plain(warn(scene('', '<circle cx={540} cy={1200} r={60} fill={p > 0.5 ? colors.accent : colors.rose}/>'))), []);
  // Paint a group passes down acts too: line art drawing itself through its group's dash offset, a border recoloured
  // and thickened on its group, a fill whose gradient stop moves on the word.
  assert.deepEqual(plain(warn(scene('', '<g fill="none" stroke={colors.ink} strokeWidth={14} strokeDasharray={1400} strokeDashoffset={1400 * (1 - p)}><path d="M 240 1150 C 300 1000 780 1000 840 1150"/><path d="M 300 1200 L 780 1200"/></g>'))), []);
  assert.deepEqual(plain(warn(scene('', '<g stroke={p > 0.5 ? colors.accent : colors.ink} strokeWidth={p > 0.5 ? 14 : 3}><path d="M 240 1150 L 840 1150" fill="none"/></g>'))), []);
  assert.deepEqual(plain(warn(scene('', '<defs><linearGradient id="glass" x1="0" y1="1" x2="0" y2="0"><stop offset={p} stopColor={colors.accent}/><stop offset={p} stopColor={colors.rose}/></linearGradient></defs><rect x={460} y={1110} width={160} height={120} fill="url(#glass)"/>'))), []);
  // A count run from one word to the next (a span between two cues) is checked like any other: with none of the words
  // said, the cues keep their spacing, so the code runs and the still card is warned.
  const between = (count) => `export default function Scene({ time, colors }) {
  const n = Math.round(${count});
  return <svg>
    <rect x={0} y={0} width={1080} height={1920} fill={colors.wall}/>
    <rect x={140} y={460} width={800} height={640} rx={40} fill={colors.chalk}/>
    <text x={540} y={800} textAnchor="middle" fontSize={240} fontWeight={900} fill={colors.accent}>{n}</text>
  </svg>;
}`;
  for (const count of ["interpolate(time, at('sixty'), at('free'), 0, 60)", "60 * clamp((time - at('sixty')) / (at('free') - at('sixty')))"]) {
    assert.deepEqual(plain(code.codeSceneErrors('beat 3 (code)', between(count), VO, new Set(), code.CANVAS_STAGE)), [], count);
    assert.match(warn(between(count))[0] ?? '', /only words and numbers change as its line is said/, count);
  }
  // A line typed out word by word over a still card is text-led too, cued or not.
  assert.match(warn(`export default function Scene({ time, colors, words }) { return <svg><rect x={140} y={460} width={800} height={640} fill={colors.chalk}/><text x={540} y={760} width={700} maxLines={3} textAnchor="middle" fontSize={64} fill={colors.cardInk}>{words.filter(w => w.start <= time).map(w => w.text).join(' ')}</text></svg>; }`)[0], /only words and numbers change as its line is said; nothing drawn moves/);
  // The check is a floor: any shape that changes on a word counts as the drawing acting, so a caret that follows the
  // typing, an underline drawn under a word, a highlight bar, a leader line or a label's pill lets a text-led scene
  // pass. The review (best-practices.mjs BEST_PRACTICE_CHECKS) asks whether the thing the line names acts.
  // Nothing on a word at all: everything runs on the clock, or from the end of the line rather than a word.
  assert.match(warn('export default function Scene({ time, colors }) { return <svg><rect x={140} y={460 + 20 * Math.sin(time)} width={800} height={640} fill={colors.chalk}/></svg>; }')[0], /^beat 3 \(code\): nothing in it changes as its line is said; cue the thing the line names with at\('word'\)/);
  assert.match(warn('export default function Scene({ time, colors, voEnd }) { return <svg><rect x={140} y={460} width={800} height={640} fill={colors.chalk}/><circle cx={540} cy={780} r={80 + 200 * easeOut(clamp((time - voEnd + 1) / 0.5))} fill={colors.accent}/></svg>; }')[0], /nothing in it changes as its line is said;.*timed from the clock, voStart or voEnd alone/);
  // A payoff is checked on its own clock (`run`, its hold included): what lands in the hold, after its line, counts.
  const late = `export default function Scene({ time, colors }) { return <svg><rect x={140} y={460} width={800} height={640} fill={colors.chalk}/><circle cx={540} cy={780} r={80 + 200 * easeOut(clamp((time - at('free') - 0.9) / 0.3))} fill={colors.accent}/></svg>; }`;
  assert.match(warn(late)[0], /nothing in it changes as its line is said/);
  assert.deepEqual(plain(code.codeSceneWarnings('beat 3 (code)', late, VO, code.CANVAS_STAGE, estimateBeat(VO, PAYOFF_HOLD))), []);
  // Every warning says it the same way, so a test or the review can find them all.
  assert.ok(warn(scene('')).every(w => w.includes(code.ACTING_WARNING)));
  // Code that doesn't run is codeSceneErrors' to report; code that only fails before its cues are said can't be checked,
  // and says so rather than passing.
  assert.deepEqual(plain(warn('export default function Scene() { return <svg>{nope}</svg>; }')), []);
  const early = `export default function Scene({ time, colors, duration }) { return <svg><rect x={140} y={460} width={800} height={640} fill={colors.chalk}/><circle cx={540} cy={780} r={60 + 10 * Math.sqrt(duration - at('free'))} fill={colors.accent}/></svg>; }`;
  assert.deepEqual(plain(code.codeSceneErrors('beat 3 (code)', early, VO, new Set(), code.CANVAS_STAGE)), []);
  assert.match(warn(early)[0], /^beat 3 \(code\): whether its drawing acts as its line is said couldn't be checked: run with none of its words said yet, the code fails at/);
});

test('at(word, n) is the nth time the line says the word, and a cue for a time it isn\'t said is caught', () => {
  const IT = 'It works because it is cheap, and it is fast.';
  const beat = estimateBeat(IT);
  const near = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} is not ${b}`);
  near(code.cueTime(beat.words, 'it', beat), 0.25 - 0.08, 'the first');
  near(code.cueTime(beat.words, 'it', beat, 0.35, 2), 0.25 + 3 * 0.32 - 0.08, 'the second');
  near(code.cueTime(beat.words, 'it', beat, 0.35, 3), 0.25 + 7 * 0.32 - 0.08, 'the third');
  const card = cue => `export default function Scene({ time, colors }) {
  const p = easeOut(clamp((time - ${cue}) / 0.4));
  return <svg><rect x={140} y={460} width={800} height={640} rx={40} fill={colors.chalk}/><text x={540} y={820} textAnchor="middle" fontSize={120} fontWeight={900} fill={colors.cardInk} opacity={p}>FREE</text></svg>;
}`;
  const twice = 'Free apps, and free forever.';
  assert.deepEqual(plain(code.codeSceneErrors('beat 2 (code)', card("at('free', 2)"), twice, new Set())), []);
  assert.deepEqual(plain(code.codeSceneErrors('beat 2 (code)', card("at('free', 3)"), twice, new Set())), ["beat 2 (code): at('free', 3) waits for the third time the line says \"free\", but it says it twice; cue a time it's said"]);
});

test('a torn outline has a bounded number of points, however large the rectangle', () => {
  const started = performance.now();
  assert.ok(code.tornPath(0, 0, 1e9, 1e9, 1).length < 50_000);
  assert.ok(performance.now() - started < 250);
  assert.equal(code.tornPath(0, 0, 1080, 1920, 1).split(' L ').length, 2 * 49 + 2 * 87);
});

test('the painter keeps every word readable on what it sits on, in its own hue, when the look gives its backdrop', () => {
  const scene = `export default function Scene({ colors }) { return <svg>
    <rect x={100} y={300} width={300} height={200} fill="#FF7A2E"/>
    <text x={120} y={420} fontSize={40} fill="#E9EDF1">1</text>
    <text x={600} y={420} fontSize={40} fill="#E9EDF1">fine</text>
    <text x={120} y={1000} fontSize={96} fill="#B8643A">Headline</text>
  </svg>; }`;
  const tree = code.runCodeScene(scene, inputs(1));
  const words = [];
  const ctx = createCanvas(1080, 1920).getContext('2d');
  const fillText = ctx.fillText.bind(ctx);
  ctx.fillText = (text, ...rest) => { words.push([text, ctx.fillStyle]); fillText(text, ...rest); };
  paintCodeTree(ctx, tree, { Path2D, font: (w, s) => `${s}px sans-serif`, ink: '#E9EDF1', backdrop: '#0E0B09', image: () => null });
  const color = Object.fromEntries(words);
  const on = (word, behind) => contrastOf(rgbaOf(color[word]), rgbaOf(behind));
  assert.ok(on('1', '#FF7A2E') >= 4.5, `${color['1']} on orange`);
  assert.equal(color.fine.toUpperCase(), '#E9EDF1', 'readable words are drawn as written');
  assert.equal(color.Headline.toUpperCase(), '#B8643A', 'from headline size, 3:1 is enough');
});

test('a gradient with no length paints nothing, as in a browser, instead of failing the scene', () => {
  // @napi-rs/canvas throws on filling with a zero-length gradient; a browser's canvas paints nothing.
  const scene = `export default function Scene() { return <svg>
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff"/><stop offset="1" stopColor="#000"/></linearGradient></defs>
    <rect x={100} y={500} width={880} height={0} fill="url(#g)"/>
    <rect x={100} y={600} width={880} height={400} fill="#336699"/>
  </svg>; }`;
  const ctx = createCanvas(1080, 1920).getContext('2d');
  paintCodeTree(ctx, code.runCodeScene(scene, inputs(1)), { Path2D, font: (w, s) => `${s}px sans-serif`, ink: '#111111', image: () => null });
  assert.deepEqual([...ctx.getImageData(540, 800, 1, 1).data], [0x33, 0x66, 0x99, 255], 'the rest of the scene is painted');
});

test('the checks time a scene the way render.mjs times a reel before it has a voice', async () => {
  // loadEpisode without voice.json is the layout preview the stills draw before voicing; timing.mjs mirrors it.
  fs.mkdirSync(path.join(ROOT, '.tmp'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, '.tmp', 'test-timing-'));
  try {
    const beats = [{ scene: 'hook', vo: 'One two three four five six.' }, { scene: 'code', vo: 'Seven eight.', payoff: true }, { scene: 'code', vo: 'Nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen.' }];
    const { loadEpisode } = await import('../src/render.mjs');
    // A house reel as before (a payoff mark means nothing there); a styled reel's payoff holds PAYOFF_HOLD after its line.
    for (const style of [undefined, 'map']) {
      const episode = { id: 'timing', ...(style ? { style } : {}), cta: { house: false }, beats };
      fs.writeFileSync(path.join(dir, 'episode.json'), JSON.stringify(episode));
      const { timing } = loadEpisode(dir);
      const estimate = estimateTiming(beats, episode);
      assert.equal(timing.duration, estimate.duration);
      timing.beats.forEach((b, i) => {
        assert.equal(b.start, estimate.beats[i].start);
        assert.equal(b.end, estimate.beats[i].end);
        assert.deepEqual(b.words.map(w => [w.start, w.end]), estimate.beats[i].words.map(w => [w.start, w.end]));
      });
      const held = timing.beats[1];
      assert.equal(+(held.end - held.start).toFixed(6), +(estimateBeat('Seven eight.').duration + (style ? PAYOFF_HOLD : 0)).toFixed(6), style ?? 'house');
      assert.equal(estimateTiming(beats).duration, estimateTiming(beats, { id: 'timing', beats }).duration, 'no style, no hold');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
