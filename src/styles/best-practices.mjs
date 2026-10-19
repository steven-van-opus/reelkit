// The best practices every styled reel follows, whatever its style: one section of the writer's instructions, under
// the style it designs from (guide.mjs), which decides how things look, never whether these hold. The validator
// enforces what code can (src/code/scene.mjs codeSceneErrors: words inside the stage and big enough to read, text that
// stands out from what's behind it, nothing large flashing, and no words under the captions). Edit the practices here;
// their numbers come from src/code/safe-zone.mjs and src/code/scene.mjs.
import { CODE_FLASH, CODE_MIN_TEXT } from '../code/scene.mjs';
import { CAPTION_BAND, CONTENT_ZONE, FRAME, SAFE_ZONE } from '../code/safe-zone.mjs';

/** One practice: what the writer follows (`rule`), and the question to ask of the finished reel (`check`). */

const Z = SAFE_ZONE, C = CONTENT_ZONE, B = CAPTION_BAND;

/**
 * The places a scene's code draws come from the topic. What the style's frame draws (the captions, the closing ask) is
 * its look, never a set of the writer's. A window, clock or calendar is dressing like any prop; a style says more about
 * them (guide.mjs STYLE_SETS, its `identity.never`).
 */
const SETS_FROM_THE_TOPIC = {
  name: 'Sets from the topic',
  rule: 'Where a scene you draw shows a place (a room, a shop, a street, a workshop, a lab), build it for this video\'s topic and dress it with the props its line needs and what a place like it would have. A style\'s reference video shows its look, never your sets: don\'t rebuild its rooms or their furniture. Move to a new place where the line moves somewhere new, and bring a place back only on purpose (a bookend, a callback, a recap). What the style draws around every scene (the captions, the closing ask) is its look, not one of your sets.',
  check: 'Is every place the scenes draw built for this video\'s topic rather than copied from the style\'s reference video, and does a place come back only on purpose?',
};

export const BEST_PRACTICE_RULES = [
  {
    name: 'Platform safe zones',
    rule: `Reels, TikTok and Shorts draw their own UI over the ${FRAME.width} × ${FRAME.height} frame: the top bar (above y ${Z.top}), the rail of buttons down the right (right of x ${Z.right}) and the caption, name and audio rows at the bottom (below y ${Z.bottom}). Words and key visuals stay inside the safe zone, x ${Z.left}–${Z.right} and y ${Z.top}–${Z.bottom}; only backgrounds and decoration run to the edges. In a scene, keep them inside \`stage\`, cut to fit the style (a full-frame style's stage is the safe zone above the captions, x ${C.left}–${C.right} and y ${C.top}–${C.bottom}).`,
    check: 'Is every word and key visual inside the safe zone, clear of the top bar, the buttons down the right and the rows at the bottom?',
  },
  {
    name: 'Nothing under the captions, the character or the platform’s UI',
    rule: `The spoken words are drawn as captions just below the stage (in a full-frame style, across y ${B.top}–${B.bottom}), and a style's character stands in its own corner. Nothing that must be seen goes under them, or under the platform's UI, at any moment of the scene, not just at its end.`,
    check: 'Is anything important hidden, at any moment, behind the spoken-word captions, the character, an image or the platform’s UI? Move or shrink it.',
  },
  {
    name: 'Readable type',
    rule: `Every word is at least ${CODE_MIN_TEXT} px: 64–120 px for headlines, 40–56 px for other words. Each word stands out strongly from what's right behind it: colors.ink on the background, colors.cardInk on a chalk card, never ink on a chalk card (ink is light on a dark set), and never words straight over a busy drawing or picture without a solid shape behind them. Nothing cut off, overlapping or crammed.`,
    check: `Is every word at least ${CODE_MIN_TEXT} px (64–120 for headlines), in a colour that stands out clearly from what's behind it, and nothing cut off, overlapping or crammed?`,
  },
  {
    name: 'One idea per scene, big and bold',
    rule: 'Each scene makes one point with one main thing (a huge number, a big headline, a large drawing or logo, at least 600 px across) and a few smaller pieces supporting it. Every piece arrives on the word that names it (`at(\'word\')`), so things land as they are said.',
    check: 'Does each scene make one point with one big main thing, and does every piece arrive on the word that names it?',
  },
  {
    name: 'Motion that settles',
    rule: `Things arrive with a short eased move (a spring or an ease-out, about 0.3–0.6 s) and come to rest where they can be read; after that, only a slow drift or a gentle pulse, so the scene never freezes and never jitters. No flashing or strobing: nothing large switches its brightness or colour back and forth more than ${CODE_FLASH.perSecond} times a second (faster flashing can trigger seizures in photosensitive viewers), and nothing flickers, shakes or spins fast.`,
    check: `Does everything come to rest where it can be read, with nothing flashing, strobing or flickering more than ${CODE_FLASH.perSecond} times a second? (A still can't show it: read the scene's code.)`,
  },
  {
    name: 'True to the sources',
    rule: 'Every fact, number, name, price and date, said or shown, comes from the source pages and is stated exactly as they state it: no rounding up into a bigger claim, and charts and counters drawn to the real values. Give no medical, financial or legal advice beyond what the sources say, and present what they say as theirs. Nothing misleading: a headline, a drawing or a chart never suggests more than the sources support.',
    check: 'Does every fact and number, said or shown, match the sources exactly, with no medical, financial or legal advice beyond them and nothing that suggests more than they say?',
  },
  {
    name: 'Original drawings only',
    rule: 'No copyrighted characters or mascots (cartoon, game or film characters, another brand\'s mascot; the style\'s own character is fine) and no third-party graphics: draw original subjects, and never paste someone else\'s graphic, chart, thumbnail or infographic; redraw what it says. A logo is never drawn by hand: place its exact shape with <Mark id="m80" …/> (see "Code scenes"). A real person is drawn only by their recognisable features (hair, glasses, beard, signature clothing, the way they\'re usually photographed) as a respectful portrait in the style, plus their name; never a caricature that mocks them.',
    check: 'Is every drawing original (no copyrighted character or mascot, no pasted graphic, chart or thumbnail from someone else), every logo placed with <Mark/>, and every real person drawn respectfully by their recognisable features?',
  },
  {
    name: 'Accessible to everyone',
    rule: 'Every spoken word is captioned on screen (the style draws the captions), so keep their band clear. Never let colour alone carry meaning: a before and after, a right and wrong, an up and down also differ in a word, a drawn symbol (a check, a cross, an arrow) or their place, so they read for colour-blind viewers too.',
    check: 'Are the captions clear to read throughout, and does every difference shown in colour also show in a word, a symbol or a place?',
  },
  SETS_FROM_THE_TOPIC,
];

/** The section every style inherits, in the writer's instructions. */
export const BEST_PRACTICES = `## Best practices
Every video follows these, whatever its style: the style decides how things look, never whether these hold. The validator checks what it can in your code; the rest is yours to get right.
${BEST_PRACTICE_RULES.map(p => `- ${p.name}. ${p.rule}`).join('\n')}`;

/** The question to ask of the finished reel for each practice, as a checklist (the make-reel skill's review). */
export const BEST_PRACTICE_CHECKS = BEST_PRACTICE_RULES.map(p => `- ${p.check}`).join('\n');
