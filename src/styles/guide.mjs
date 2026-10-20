// The writer's instructions for a styled reel (src/write-script.mjs styleGuide, with `style`): how the reel is
// designed (every beat a scene written in code), how to write a code scene on the style's full frame, the opening,
// the best practices every style follows, and the style itself: its feel, its frame, what stays and what each topic
// brings, and its reference video to remake with judgement, scene by scene. The validator checks every scene the
// writer sends back (src/validate.mjs, src/code/scene.mjs codeSceneErrors) and warns where one after the opening
// doesn't act on its words (codeSceneWarnings).
import { CODE_LIMITS, CODE_SHOT, CANVAS_STAGE } from '../code/scene.mjs';
import { CAPTION_BAND } from '../code/safe-zone.mjs';
import { LOGO_IDS } from '../code/marks.mjs';
import { BEST_PRACTICES } from './best-practices.mjs';
import { referenceSets } from './reference.mjs';

/** The longest "place" a beat may name (the set it is in, never drawn). */
export const PLACE_MAX = 60;

const S = CANVAS_STAGE;

/**
 * The code-scene guide's example: a drawn thing that acts out its line on the words that name it (a padlock drops in on
 * "sixty" and snaps open on "free", its chain falling away), its price landing beside it as a label. Its kit is a
 * stand-in, style-neutral (one ease, flat fills and round strokes through one helper): a real reel starts every scene
 * from its style's own helpers instead. test/styles.test.mjs keeps it passing every check.
 */
export const CODE_EXAMPLE = {
  line: 'Most editors charge sixty a month, but this one is free for anyone.',
  source: `export default function Scene({ time, colors, stage }) {
  // The kit, the same at the top of every scene. A stand-in: a real reel copies its style's helpers from the reference
  // scenes (its material and its eases), adding an act() in the style's own ease only where it has none.
  const enter = t => easeOut(clamp((time - t) / 0.4));
  const act = t => easeOut(clamp((time - t) / 0.45));
  const Part = ({ d, c, w, t }) => <path d={d} fill={w ? 'none' : c} stroke={w ? c : 'none'} strokeWidth={w || 0} strokeLinecap="round" transform={t || ''}/>;
  const cx = (stage.left + stage.right) / 2, drop = enter(at('sixty')), open = act(at('free'));
  return <svg>
    <rect x={0} y={0} width={1080} height={1920} fill={colors.wall}/>
    {range(8).map(i => <g opacity={1 - open} transform={\`translate(0 \${640 * open * open}) rotate(\${(i % 2 ? 30 : -30) * open} \${130 + i * 103} 470)\`}><Part d={\`M \${74 + i * 103} 470 a 56 30 0 1 0 112 0 a 56 30 0 1 0 -112 0\`} c={colors.ink} w={18}/></g>)}
    <g transform={\`translate(\${cx} \${840 - 1100 * (1 - drop)}) rotate(\${-6 * open})\`}>
      <Part d="M -160 -230 V -350 A 160 160 0 0 1 160 -350 V -230" c={colors.ink} w={60} t={\`translate(0 \${-70 * open}) rotate(\${40 * open} 160 -230)\`}/>
      <Part d="M -320 -240 H 320 V 160 Q 320 240 240 240 H -240 Q -320 240 -320 160 Z" c={colors.accent}/>
      <Part d="M -50 -30 A 50 50 0 1 1 50 -30 A 50 50 0 1 1 -50 -30 Z M -18 -10 H 18 V 100 H -18 Z" c={colors.cardInk}/>
    </g>
    <text x={cx} y={1240} width={820} maxLines={1} textAnchor="middle" fontSize={88} fontWeight={900} fill={open > 0.5 ? colors.accent : colors.ink} opacity={drop}>{open > 0.5 ? 'free' : '$60 a month'}</text>
  </svg>;
}`,
};

/** How to write a code scene on a style's frame: the component's inputs, what it can use, and an example. */
export const CODE_GUIDE = `## Code scenes
A \`code\` beat's \`source\` is one React component, \`export default function Scene({ time, duration, colors, stage, words }) { … }\`, that returns an <svg> of the frame: 1080×1920 px, drawn every frame. Write it the way you'd hand-code a motion graphic.
- Inputs: \`time\` seconds since the scene began; \`duration\` the scene's length; \`colors\` the style's ({ink, cardInk, chalk, accent, pink, rose, blush, wall, floor}: wall the background, floor a deeper tone of it, ink text on the background, chalk cards and paper, cardInk text on a chalk card, accent the main highlight, rose the second accent, blush a soft tint of the accent); \`stage\` {left: ${S.left}, right: ${S.right}, top: ${S.top}, bottom: ${S.bottom}}; \`words\` the line's words [{text, start, end}].
- The frame is the scene's: coordinates are the frame's own (0–1080 × 0–1920), so paint the background yourself, edge to edge, then everything on it. Every word and key visual stays inside \`stage\` (the platforms' UI covers the top, the buttons on the right and the bottom). The spoken-word captions are drawn for you in y ${CAPTION_BAND.top}–${CAPTION_BAND.bottom}: nothing important there. There's no label or character unless your scene draws one.
- Logos: \`<Mark id="m80" x={540} y={700} size={320}/>\` draws a declared logo's exact shape (see "Designing the reel"), centred on (x, y) in a size × size box, in its own colours; \`fill={colors.ink}\` sets it in one colour, \`variant="symbol"\` uses its compact symbol (Nvidia's eye, Google's G) instead of the full logo where there is one. Wrap it in a <g> to tilt or move it, and put it on a card or sticker in the style's way. Where no exact shape is found, its name is set in its place.
- Timing: \`at('word')\` is when that word of this beat's vo is spoken (seconds), so \`const p = easeOut(clamp((time - at('free')) / 0.5))\` animates something in as "free" is said; \`at('it', 2)\` is when that word is said the second time. Helpers: interpolate(t, t0, t1, from, to) (clamped), clamp(v, lo = 0, hi = 1), ease, easeOut, easeInOut, easeOutBack (each 0–1 → 0–1), spring(seconds since start) (overshoots, settles at 1), range(n), torn(x, y, w, h, seed) (a torn-paper path), Math. Arrays have map, filter, slice and join.
- Maps: \`land('FR', x, y, w, h)\` is a country's real outline as path data fitted in a box (\`land(['US', 'CA'], …)\` several on one map, a sixth argument picks one of them or adds neighbours, \`'*'\` every country in view), and \`geo(lon, lat, fit, x, y, w, h)\` the point on the same map. Never trace a coastline by hand.
- Shots: \`const { i, t, p } = shot(['recruiter', 'manager', 'lead'])\` cuts the scene on its words. \`i\` is how many of those words have been said (0 before the first; each is found after the one before it, so a word said twice can be listed twice), \`t\` the seconds since the last of them and \`p\` a 0–1 ease over ${CODE_SHOT.ease} s from it. Return a different composition for each i (\`i === 0 ? … : i === 1 ? … : …\`), its new parts sliding or scaling in with p. Keep a big card or backdrop on screen from cut to cut (change its words, or move it in): a large shape that fades up from nothing on every cut flashes, and the flash check stops it. Use it for a list, a cut per role or a quick montage over one clause, keeping them in one beat, never one beat per item. Write the list in the call itself (never a variable), each a word of the line, in the order it says them; the end of every shot is checked like the scene's last frame.
- Elements: svg, g, rect (rx for round corners), circle, ellipse, line, polyline, polygon, path, text, tspan, image, defs, linearGradient, radialGradient, stop, clipPath. Attributes are React's: fill, stroke, strokeWidth, strokeLinecap, strokeDasharray, strokeDashoffset, opacity, transform ("translate(…) scale(…) rotate(…)"), clipPath="url(#id)", fill="url(#gradient)". The painter adds \`shadow\` ("0 12 30 rgba(0,0,0,0.2)") on any element, \`rx\` on image, and on text \`width\` (wrap to that width) with \`maxLines\` (shrink the font until it fits) and \`lineHeight\`.
- Text: fontSize, fontWeight (400–900), fontFamily ("sans", "serif" or "mono"), fontStyle ("italic"), textAnchor, dominantBaseline ('middle' centres the lines on y). Give every headline a \`width\` and \`maxLines\` so it can never run off the frame.
- Images: \`<image href={asset('m01')} x y width height/>\` shows it whole (meet). asset() takes a media id from the media list, written literally (asset('m01'), never asset(id) with a variable). Show images as themselves: never put a photo in a frame, a polaroid or a box; place it big, overlapping or tilted, with a \`shadow\` if it needs to lift off the background. Crop only when the design asks for it (preserveAspectRatio="xMidYMid slice" with a clipPath circle or blob, or \`rx\` for a screen grab). Only a video clip sits in a rounded frame.
- No state, effects, events, timers, fetch, HTML elements, CSS animations or external URLs: everything is a function of \`time\`. Assignment (=, ++) and loops don't exist; build lists with map. Keep it under ${CODE_LIMITS.source} characters.
- Design like a motion designer, not a slide maker. Fill the stage: the composition spans most of its width (700–900 px) and its height, its weight centred around y 760 (the middle of the stage) or deliberately off-centre, never bunched at the top or small in a corner. Use solid shapes, bold colour (the accent as a field, not just a dot), gradients, overlap, scale and rotation; avoid rows of identical cards or pills, outlined wireframe boxes and bullet lists. Draw real things with shapes and paths (a laptop, a price tag, a padlock, a folder, a cloud, a chart) instead of labelled rectangles.
- Build each scene around the thing its line names acting it out, and cue the act on the word that names it (see "Objects act out the words"), in the style's own idiom: a request packet that hops from the app to the server, territory flooding across a border, a cable drawing taut as the deck lifts, a bar growing to its real value, a chart that grows, a before/after that wipes across, a list that checks off, logos that fly into a row, a diagram that draws itself, a screenshot that zooms to the button the line names. A number or a few words can land beside it as its labels, but never alone: a counter ticking, a line typing or a label fading in while nothing drawn changes makes a text-led scene, and the validator warns. The thing then settles in its new state.
- Start every scene from the style's kit (see "One material, one motion"): the helpers at the top of its reference scenes, copied exactly, the same in every scene.
Example (its line: "${CODE_EXAMPLE.line}"; a padlock drops in on "sixty" and snaps open on "free", its chain falling away, the price beside it; its kit is a stand-in for the style's):
${CODE_EXAMPLE.source}`;

/** How a styled reel is designed: the opening and every beat in code, places from the topic, real media and logos. */
const designGuide = ({ beats: [lo, hi] }) => `## Designing the reel
The style is a visual language (its look, colours, type, captions and motion), applied to whatever you design. It is not a layout to fill: don't make every reel the same sequence of scenes with only the words and images swapped.
- You decide the pacing: ${lo} to ${hi} beats before the house CTA, and how long each is. Keep beats short and punchy for lists, reveals and numbers; give a beat more words when it explains something.
- The opening is designed too: beat 1 is a \`hook\` with \`title\` (the reel's name, ≤ 28 chars) and \`source\`, its first frame drawn in code (see "The opening").
- Every beat after it is a \`code\` scene you design (see "Code scenes"), drawn for what its line says. A styled reel has no other scene types, no "set" and no "mascot": a style's own characters, when it has some, are drawn in your code.
- Give every beat, the opening too, a top-level "place" beside its "label": the set it is in, invented from your topic (at most ${PLACE_MAX} characters, never drawn as text), like "a night bakery, trays cooling on the counter". When a beat returns to an earlier set on purpose, repeat that place word for word.
- Never repeat a design: no two scenes in a row with the same layout.
- One material and one motion for the whole reel, both the style's: every scene starts from the helpers at the top of its reference scenes, copied exactly (see "One material, one motion").
- Every scene after the opening is led by the thing its line names (drawn, or the source media or a logo) acting it out on the word that names it; its words and numbers label it (see "Objects act out the words").
- Find the payoff, the line the reel builds to, and mark its beat \`"payoff": true\`: its scene runs on about a second after its line, so land its final state big on the payoff word, even the line's last, and hold it (see "A held payoff").
- Show the real thing: put the source media (product shots, screenshots, demo clips, photos) on screen with asset('m01') where they show what the line says, as themselves and big, the way the style would lift or tilt them. Read each item before you use it and show it only for what it really shows; say only what is visible in it or stated by the source, and never invent a media id. Draw in code what no source media shows.
- Draw what is named: whenever a line names a company, app, product, person, place or thing, its scene shows it, in code in this style: a logo placed with <Mark id="m80" …/> and styled around the way the style does it (on a card, a tile or a sticker; tilted, with a shadow; in its own colours or one colour of the style), a person as a portrait (see "Best practices"), a place or landmark by its silhouette. Only draw what you know well enough to be recognised; otherwise set its name big on a drawn thing that can act (a sign, a crate, a sticker). Declare each logo in the episode's top-level "logos" list, written before "beats", so reelkit can look up its exact shape: {"id": "m80", "name": "Adobe Photoshop", "domain": "adobe.com"} (ids ${LOGO_IDS[0]} to ${LOGO_IDS.at(-1)}; "name" exactly as Wikipedia titles the page; "domain" the maker's website).

${CODE_GUIDE}

## The opening
Beat 1's \`source\` is a code scene like the others (same inputs, stage and checks), and it's the frame people decide to keep watching on, so make it the boldest one: what this reel is about, in a form made for it, that reads in a second. Pick the form from the story, never the same title card every time: the subject drawn big with a few huge words beside it; a giant number or price that lands on its word; a before → after; a question with the answer hidden; two rivals facing off; the title built from the thing itself (its logo, its shape, its colours). Keep its words few (≤ 8) and large (72 px or more), in the style, and land them on the vo's words. Its main title is on screen within the first half second (it's the first frame people see; the cover is taken later, once the opening has landed): build the frame around it, then bring in the secondary pieces on their words. Then land the hook big on its key word as it's said, within about the first two seconds (write the line so that word comes in its first five words or so): the reel's biggest move happens on that word (the word slamming in as huge type, the subject dropping in or breaking open, or both). When the key word is in the title, the title sits there from the first frame and the word slams in far bigger as it's said; otherwise the key word is its own slam, never faded up before it's said (see "The hook lands on its word"). It's the one scene a word may lead; draw its subject there too.`;

/** What every reel in the style keeps, what each topic brings, and what is never copied from its reference video. */
function identityGuide(style) {
  const { constant = [], topic = [], never = [] } = style.identity ?? {};
  const list = items => items.map(item => `- ${item}`).join('\n');
  return constant.length || topic.length || never.length ? `
### What stays (this style's identity)
${list(constant)}
### What comes from your topic (new every reel)
${list(topic)}
### Never copy
${list(never)}` : '';
}

/** A second reel in the style on another topic, as text: what changes when the topic does. */
const contrastGuide = style => (style.contrast ? `

### The same style on another topic: ${style.contrast.title}
A second reel in this style, about ${style.contrast.topic}, outlined as text only (never drawn, never copied): its identity stays, and every place comes from its topic.
${style.contrast.chapters.map((c, i) => `${i + 1}. ${c.label} · place: ${c.place}\n   Its line: "${c.line}"`).join('\n')}` : '');

/** How a style's sets come and go: a new place where the line moves on, kept only on purpose. */
const STYLE_SETS = '- Build a new place where the line moves somewhere new, and return to one only on purpose (a bookend, a callback, a recap); a style that keeps one place per reel says so under "What stays". A window, clock or calendar is dressing in a room you built for this topic, never a fixture of the style.';

/** The reference's rules: start from it, leave it where the story needs something else, match its finish. */
const REMAKE_RULES = `- Start from it. Where your story has the same kind of moment (the opening, the product shown working, the number that matters, the steps, a change made with a sentence, a before and after, where to get it), adapt that scene: keep its materials, layering, motion and level of detail, but build its place and its props from your topic, and put your own words, numbers, media and logos in.
- Leave its weaker moments behind: where a reference scene is led by a number, typed code, a counter or a card, keep its look and redesign the moment around something that acts on its word (see "Objects act out the words"); where its opening lands its key word later than about two seconds in, land yours sooner.
- Leave it where your story needs something else. When a moment needs what the reference doesn't have (a timeline, a map, a head-to-head, a quote, a chart, a process), design a new scene in the reference's visual language at the same level of detail, rather than squeezing it into a scene that doesn't fit. Your story decides how many scenes there are, their order and what each shows.
- Match its finish, not only its layout: as much detail (interfaces with real-looking controls, shadows, small secondary notes, things that keep moving), so your reel looks as made as the reference.
${STYLE_SETS}
- The producer's notes come first: when they ask for a different look, layout, colours, pacing or tone, do what they asked.
- Its cues are words of its own lines: cue only words your line says. Its logos and media ids are placeholders: use your own.`;

/**
 * The style's section: its feel, its identity and its reference video to remake (each scene's label, place, line and
 * code), or, for a style without one, its example scenes to design from.
 * @param {import('./index.mjs').CanvasStyle} style
 */
export function lookGuide(style) {
  const head = `${style.feel}${identityGuide(style)}`;
  if (style.reference) return `## This style's reference video: ${style.reference.title}
${head}
### How to remake it
Below is this style's reference video, scene by scene: what's said, the place it is set in and the scene's code. It's the reel the producer picked this style for. Make yours the way a good editor remakes a reference for a new subject, with your own judgement:
${REMAKE_RULES}
${referenceSets(style.reference).map((b, i, sets) => `### Scene ${i + 1}${i ? (i === sets.length - 1 ? ', the payoff (its beat marked "payoff": true, held)' : '') : ', the opening'}: ${b.label}${b.place ? ` · place: ${b.place} (this reel's own set; build yours from your topic)` : ''}
Its line: "${b.line}"
${b.source}`).join('\n\n')}${contrastGuide(style)}`;
  return `## This style: ${style.name}
${head}
Below are example code scenes in this style. Learn the visual language from them (the materials, the colour, the scale, the way things arrive and keep moving) and design your own scenes in it for what each of your lines says. Don't copy an example or reuse its layout, and only cue words your own line says. Their asset ids are placeholders: use your own media and logos.
${style.examples.map((e, i) => `### Example ${i + 1}: ${e.title}\nIts line: "${e.line}"\n${e.source}`).join('\n\n')}

### An opening in this style: ${style.opening.title}
Its line: "${style.opening.line}"
${style.opening.source}${contrastGuide(style)}`;
}

/**
 * Everything a styled reel adds to the writer's instructions, after the take and the facts: the design, code scenes,
 * the opening, the best practices and the style. `limits` are the styled reel's (validate.mjs limitsFor).
 */
export const styledGuide = (style, limits) => `${designGuide({ beats: limits.takeBeats })}

${BEST_PRACTICES}

${lookGuide(style)}`;
