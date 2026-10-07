// The house call to action: every reel ends the same way, asking viewers to
// comment one keyword for daily updates. It is applied when an episode is
// read (voice, mix, render, pipeline), so a script can't drift from it — set
// "cta": { "house": false } on an episode to opt out for a one-off ask.

import { BRAND } from './brandpack.mjs';

// The copy is the brand pack's (brand.json "cta"):
//   keyword  the word viewers comment, in capitals
//   label    the CTA beat's header
//   vo       what the reel says and captions show; written copy quotes the
//            keyword (Comment “TOOLBOX”), the narrator just says it
//   speak    the spoken form, when the TTS would misread vo: the default puts
//            a beat either side of the keyword and says both syllables, so it
//            never comes out as "toolbar"
//   line     the CTA scene's line under the keyword
//   caption  the line that closes every post caption
// "We'll send you" is a promise: the account needs an auto-DM (e.g. ManyChat)
// that replies to the keyword.
export const HOUSE_CTA = BRAND.cta;

const CAPTION_CTA = /^.*\bcomment\s+["“']?[A-Z][A-Z0-9]+["”']?.*$/im;

export function applyHouseCta(episode) {
  if (!episode || episode.cta?.house === false) return episode;
  const beats = episode.beats || [];
  const cta = {
    label: HOUSE_CTA.label,
    vo: HOUSE_CTA.vo,
    speak: HOUSE_CTA.speak,
    set: 'pink',
    scene: 'cta',
    props: { keyword: HOUSE_CTA.keyword, line: HOUSE_CTA.line },
    mascot: { pose: 'wave', face: 'happy' },
  };
  const last = beats[beats.length - 1];
  if (last?.scene === 'cta') {
    // Keep the script's set/mascot choice; everything the viewer reads or hears is the house ask.
    beats[beats.length - 1] = { ...cta, set: last.set || cta.set, mascot: last.mascot || cta.mascot };
  } else {
    beats.push(cta);
  }
  episode.beats = beats;
  episode.cta = { ...(episode.cta || {}), keyword: HOUSE_CTA.keyword };
  if (episode.post) {
    // Old per-episode asks come out wherever they were; the house line always
    // closes the caption. If the ask was the caption's opening line, the hook
    // beat's first sentence takes its place.
    const lines = String(episode.post.caption || '').split('\n');
    const openedWithAsk = CAPTION_CTA.test(lines.find(l => l.trim()) || '');
    CAPTION_CTA.lastIndex = 0;
    let body = lines.filter(l => !CAPTION_CTA.test(l) && !(CAPTION_CTA.lastIndex = 0)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    CAPTION_CTA.lastIndex = 0;
    if (openedWithAsk && beats[0]?.vo) body = `${String(beats[0].vo).split(/(?<=[.!?])\s+/)[0]}\n\n${body}`;
    episode.post.caption = `${body}\n\n${HOUSE_CTA.caption}`.trim();
  }
  return episode;
}

// Read an episode with the house CTA applied.
export async function readEpisodeFile(file) {
  const fs = await import('fs');
  return applyHouseCta(JSON.parse(fs.readFileSync(file, 'utf8')));
}
