// The no-voice timing estimate: how long each beat lasts and when each of its words is said before a voice exists.
// It mirrors loadEpisode without a voice.json (src/render.mjs, the layout preview) number for number, so a cue lands at
// the same moment in the code-scene checks (scene.mjs codeSceneErrors) and in stills drawn before the voice. A voiced
// reel is timed by its real voice instead (voice.json). test/code.test.mjs pins these numbers to render.mjs.

/** render.mjs: words every 0.32 s from 0.25 s in, a beat max(2.4, 0.32 × words + 0.6) s, and 1 s after the last beat. */
export const ESTIMATE = { lead: 0.25, perWord: 0.32, pad: 0.6, minBeat: 2.4, tail: 1 };

/** A spoken word, in seconds from the video's start; `raw` keeps it as written. */

const wordsOf = (vo) => String(vo || '').split(/\s+/).filter(Boolean);
/** How long a beat of `count` words lasts, before the video's tail. */
const beatSeconds = (count) => Math.max(ESTIMATE.minBeat, count * ESTIMATE.perWord + ESTIMATE.pad);

/** The whole video timed without a voice, as render.mjs times it: the last beat runs on through the 1 s tail. */
export function estimateTiming(beats) {
  let t = 0;
  const spans = beats.map((beat, index) => {
    const words = wordsOf(beat.vo), start = t;
    t += beatSeconds(words.length);
    return { index, start, end: t, words: words.map((text, k) => ({ text, raw: text, start: start + ESTIMATE.lead + k * ESTIMATE.perWord, end: start + ESTIMATE.lead + (k + 1) * ESTIMATE.perWord })) };
  });
  const duration = t + ESTIMATE.tail;
  if (spans.length) spans[spans.length - 1].end = duration;
  return { duration, beats: spans };
}

/** A beat's words relative to its start (`from`, seconds), as a code scene gets them. */
export function relativeWords(words, from) {
  return words.map(w => ({ text: w.text, start: w.start - from, end: w.end - from }));
}

/**
 * One beat as the estimate times it inside a video (its own span, without the video's tail): a code scene's length,
 * words and voice span, the way the engine hands them to the scene (its voice from its first word to its last).
 */
export function estimateBeat(vo) {
  const span = estimateTiming([{ vo }]).beats[0];
  const duration = beatSeconds(span.words.length), words = relativeWords(span.words, 0);
  return { duration, words, voStart: words[0]?.start ?? 0, voEnd: words.at(-1)?.end ?? duration };
}
