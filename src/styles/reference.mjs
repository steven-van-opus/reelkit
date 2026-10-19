// A style's reference video: one finished reel in the style, every scene designed in code, that a new reel remakes
// for its own subject (guide.mjs lookGuide). The writer starts from it and uses its own judgement: it adapts a
// reference scene where its story has the same kind of moment, and designs a new one in the same visual language
// where it doesn't. `npm run style -- <id>` turns it into a test episode to voice and render (referenceEpisode).
//
// A reference told in chapters (`layout: 'chapters'`) groups its beats into chapters by label: one continuous take,
// and a beat either draws a new set (a shot, with its code and its place) or holds the set before it (a hold, which
// draws nothing of its own and says its line while that scene keeps running). reelkit draws a scene per set
// (referenceSets): each set's lines together, as one scene that says them all.

/**
 * @typedef {{ label: string, line: string, source: string, place?: string, set?: string, cut?: string, mascot?: { pose: string, face: string } }} ReferenceShot
 *   A scene drawn in code: its label (≤ 34 chars; a chaptered reel's chapter headline), its line, its code and the
 *   place it is set in (text only, never drawn).
 * @typedef {{ label: string, line: string, hold: true }} ReferenceHold
 *   A chaptered reference's beat that holds the set before it.
 * @typedef {{ id: string, title: string, caption?: string, layout?: 'chapters', thread?: string, beats: (ReferenceShot | ReferenceHold)[], ownColumns?: { x: number, w: number }[] }} ReferenceVideo
 *   `id` names this version of the video (bump it when the video changes). `thread`: the one protagonist or worked
 *   example every chapter carries. `ownColumns`: columns of the frame where a full-height piece is the style's own,
 *   never a set.
 */

/** @param {ReferenceShot | ReferenceHold} beat */
export const isReferenceHold = beat => beat.hold === true;

/**
 * The reference's sets, in order: each shot with the lines of the beats holding it after it (its scene runs on across
 * them, so its cues are words of all of them), and `beat`, the shot's own place in the video (0-based). A reference
 * without chapters is a set per scene, each with its own line.
 * @param {ReferenceVideo} reference
 */
export function referenceSets(reference) {
  const sets = [];
  reference.beats.forEach((b, i) => {
    const set = sets.at(-1);
    if (isReferenceHold(b)) { if (set) { set.line = `${set.line} ${b.line}`; set.last = i; } return; }
    sets.push({ ...b, beat: i, last: i });
  });
  return sets;
}

/**
 * The reference as an episode of the style: the opening a 'hook' drawn in code (its title the video's), every other
 * set a 'code' scene, and the closing ask left to the house CTA. Its sources and post copy are placeholders: it's a
 * demo of the style, not a reel to post.
 * @param {{ id: string, name: string, reference: ReferenceVideo }} style
 */
export function referenceEpisode(style) {
  const ref = style.reference;
  const beats = referenceSets(ref).map((b, i) => ({
    label: b.label,
    vo: b.line,
    scene: i === 0 ? 'hook' : 'code',
    props: i === 0 ? { title: ref.title.slice(0, 28), source: b.source } : { source: b.source },
    ...(b.place ? { place: b.place } : {}),
  }));
  return {
    id: `_test-style-${style.id}`,
    style: style.id,
    subject: { name: ref.title.slice(0, 28) },
    source: { url: 'https://example.com/' },
    sources: [{ claim: `${style.name}'s reference video`, url: 'https://example.com/' }],
    post: { caption: `${ref.title}: the ${style.name} style's reference video.`, hashtags: [] },
    script: beats.map(b => b.vo).join(' '),
    beats,
  };
}
