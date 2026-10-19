// Felt-tip doodle (id 'doodle'): a style (../index.mjs) for the deadpan stick-figure explainer, the format
// faceless creators use for relatable psychology, money, work and everyday-life topics. Every scene is one drawing in
// black felt-tip on a blank white page that makes its line's point, often its joke: this style's own stick figures
// (the one who is "you" in a red-pen scarf) on one wobbly ground stroke, their place sketched in a few strokes,
// hand-printed labels with curved arrows, the red pen circling, crossing out and correcting, crude charts, and a
// quick push-in on the punchline. It copies the format only, never another creator's figures, title cards, window
// chrome or catchphrases. Its reference video ("Why you stay up too late", reference.mjs, with the kit every
// scene spells out) is what the writer remakes; the opening and examples stay until every style
// has one. Its identity (IDENTITY: what every video keeps) is told apart from what each topic brings, so a new video
// sketches its own places, never the reference's bed or sofa. Every scene passes the code-scene checks on the canvas
// stage with its own line (test/styles.test.mjs).

import { DOODLE_KIT, DOODLE_BLANK, DOODLE_PAGE, DOODLE_REFERENCE } from './reference.mjs';

const FEEL = `A deadpan stick-figure explainer in black felt-tip on a white page. Paint the page edge to edge in colors.wall, empty (no gradients, cards, shading or painted sets) but for one wobbly ground stroke near y 1150. Every scene is one drawing that makes its line's point, often its joke, its place sketched in a few strokes. Open every scene with the reference scenes' helpers (J, on, Fig, Arrow, Ring), copied exactly, and draw every figure with Fig: circle head, dot eyes, flat mouth, single-stroke limbs; "you" wears the red-pen scarf. Props take three to eight strokes. Draw like a person with a marker: lines a little uneven, loops not quite closed, and a gentle boil (thin lines redrawn within 2 px three times a second: texture, never a flicker); words never boil. Labels are hand-printed uppercase (sans 800, 40–56 px) in colors.ink or the red pen, with a curved arrow to what they name. colors.accent is the red pen: it circles, underlines, crosses out and corrects the one thing that matters; colors.rose is the blue pen, for strokes and fills only (a second line, figure or "meanwhile"). Charts are crude: two hand-drawn axes, a lumpy line, one red dot. In a list video, the item's number sits top left in red ("#3"). Motion is deadpan: figures pop in fast (0.25 s ease-out), strokes draw on like a pen, and the punchline gets a quick push-in (scale 1.12 in 0.2 s, held). Never a bounce or a slow fade.`;

// What every Felt-tip doodle video keeps, what its topic brings, and what it never copies from the reference video.
const IDENTITY = {
  constant: [
    'A blank white page in colors.wall with one wobbly ground stroke near y 1150: no gradients, cards, shading or painted sets, only what the line needs, sketched in a few strokes',
    'This style\'s own stick figures in black felt-tip (a circle head filled with the page, two dot eyes, a flat line mouth, a single-stroke body and limbs, strokeWidth 7, round caps), the one who is "you" in a red-pen scarf',
    'Hand-printed uppercase labels (sans 800, 40–56 px) in colors.ink or the red pen, with curved marker arrows to what they name',
    'The red pen (colors.accent) circling, underlining, crossing out and correcting the one thing that matters; the blue pen (colors.rose) for strokes and fills only (a second line, figure or "meanwhile"), never words',
    'Crude charts: two hand-drawn axes, a lumpy line and one red dot; in a list video, the item\'s number in red at the top left',
    'Deadpan motion: a gentle line boil (thin lines redrawn within 2 px, three times a second), fast pop-ins, strokes that draw on like a pen and a quick push-in on the punchline, never a bounce',
    'A deadpan voice: the name for the thing, the official version, the honest one, a typology or a crude chart, the escalation, the fix and a dry callback to close',
    'A centred karaoke caption line in heavy sans (drawn for you)',
  ],
  topic: [
    "Every place, sketched in a few strokes for its line: a bus stop, a gym, a dentist's chair, a desk at work, a first date",
    "Who the figures are, what they're holding and doing, and which one is \"you\"",
    "The props, every label and arrow, and the chart's axes and numbers, from your sources",
    'What the red pen circles, crosses out or corrects',
  ],
  never: [
    "The reference video's drawings: the bed lit by a phone, the figure on three strings, the eleven o'clock clock, the seven crossed-out moons, the sofa and its battery, the kitchen counter at six with its book and pot, and the phone tucked into a tiny bed",
    'The same bed, desk or prop redrawn in every scene: sketch a new place when the line moves on',
    "Another creator's recurring figures, title cards, paint-program window or catchphrases: these stick figures and their red-pen scarf are this style's own",
  ],
};

// The same style on another topic, as text: a new sketch wherever the line moves on, the first returning as a bookend.
const CONTRAST = {
  topic: 'why the other queue always seems faster',
  title: 'Why your queue is the slowest',
  chapters: [
    { label: 'Your line is always slowest', line: 'Pick any line at the supermarket, and it will feel like the slowest one.', place: 'a supermarket: three checkout queues side by side' },
    { label: 'Two lines to lose to', line: "You're watching two other lines, so the odds are two to one that one of them beats yours.", place: 'a crude diagram: your queue against the other two' },
    { label: 'You only remember losing', line: 'And you never remember the days your line flew.', place: 'a thought bubble of a queue that never moves' },
    { label: 'One snake, every till', line: "That's why some shops use one long line that feeds every till.", place: 'a shop with one snaking queue feeding four tills' },
    { label: 'Pick one and look away', line: 'Or pick a line, and stop watching the others.', place: 'a supermarket: three checkout queues side by side' },
  ],
};

const OPENING = {
  title: 'The premise hand-printed big with a red underline drawing on, a lone stick figure in the red scarf ticking "I agree" on a giant phone, a "YOU" label arrowing in, and the red pen circling "page 1 of 40"',
  line: 'This is you, agreeing to forty pages of terms you did not read.',
  source: String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const ty = at('you'), ta = at('agreeing'), tf = at('forty'), tr = at('read');
  const under = easeOut(clamp((time - 0.2) / 0.4)), press = on(ta), check = easeOut(clamp((time - ta - 0.15) / 0.3));
  return <svg>
    ${DOODLE_PAGE}
    <text x={540} y={390} textAnchor="middle" fontSize={64} fontWeight={900} width={860} maxLines={1} fill={colors.ink}>{'TERMS & CONDITIONS'}</text>
    <path d="M 150 418 C 380 408 660 428 930 410" fill="none" stroke={colors.accent} strokeWidth={8} strokeLinecap="round" strokeDasharray={790} strokeDashoffset={790 * (1 - under)}/>
    <rect x={470} y={500} width={320} height={600} rx={36} fill={colors.wall} stroke={colors.ink} strokeWidth={7}/>
    <line x1={590} y1={532} x2={670} y2={532} stroke={colors.ink} strokeWidth={6} strokeLinecap="round"/>
    <text x={630} y={612} textAnchor="middle" fontSize={38} fontWeight={800} width={280} maxLines={1} fill={colors.ink} opacity={clamp((time - tf) / 0.15)}>PAGE 1 OF 40</text>
    {range(8).map(i => <line x1={510} y1={668 + i * 38} x2={750 - (i % 3) * 60} y2={668 + i * 38} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={6} strokeLinecap="round"/>)}
    <rect x={510} y={990} width={56} height={56} rx={6} fill="none" stroke={colors.ink} strokeWidth={6}/>
    <text x={588} y={1034} fontSize={44} fontWeight={800} fill={colors.ink}>I AGREE</text>
    <polyline points="514,1012 540,1046 604,958" fill="none" stroke={colors.accent} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={160} strokeDashoffset={160 * (1 - check)}/>
    <Ring x={630} y={598} w={160} h={40} p={easeOut(clamp((time - tr) / 0.3))} c={colors.accent}/>
    <text x={110} y={690} fontSize={52} fontWeight={900} fill={colors.ink} opacity={clamp((time - ty) / 0.15)}>YOU</text>
    <Arrow a={[170, 712]} q={[190, 800]} b={[262, 838]} p={easeOut(clamp((time - ty - 0.05) / 0.3))} c={colors.ink}/>
    <Fig x={330} y={1150} s={1.2} l={[-50, -84]} r={[50 + 92 * press, -90 - 18 * press]} c={colors.accent}/>
  </svg>;
}`,
};

const EXAMPLES = [
  {
    title: 'A typology: three stick figures pop in side by side on their names, each with a hand-printed label under the ground stroke, and the red pen crosses out the muted one\'s microphone and circles them',
    line: 'There are three kinds of people in every meeting: the talker, the nodder, and you, on mute.',
    source: String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const tt = at('talker'), tn = at('nodder'), ty = at('you'), tm = at('mute');
  const under = easeOut(clamp((time - 0.2) / 0.4)), slash = easeOut(clamp((time - tm) / 0.25));
  const Who = ({ x, t, label, red, children }) => <g opacity={time < t ? 0 : 1}>
    {children}
    <text x={x} y={1232} textAnchor="middle" fontSize={40} fontWeight={800} width={250} maxLines={1} fill={red ? colors.accent : colors.ink}>{label}</text>
  </g>;
  const Bubble = ({ x, y, w, text }) => <g>
    <path d={'M ' + (x - w) + ' ' + y + ' C ' + (x - w) + ' ' + (y - 80) + ' ' + (x + w) + ' ' + (y - 80) + ' ' + (x + w) + ' ' + y + ' C ' + (x + w) + ' ' + (y + 70) + ' ' + (x + 30) + ' ' + (y + 64) + ' ' + (x + 10) + ' ' + (y + 60) + ' L ' + (x - 6) + ' ' + (y + 110) + ' L ' + (x - 24) + ' ' + (y + 58) + ' C ' + (x - w) + ' ' + (y + 60) + ' ' + (x - w) + ' ' + (y + 30) + ' ' + (x - w) + ' ' + y} fill={colors.wall} stroke={colors.ink} strokeWidth={6} strokeLinejoin="round"/>
    <text x={x} y={y + 14} textAnchor="middle" fontSize={40} fontWeight={800} fill={colors.ink}>{text}</text>
  </g>;
  return <svg>
    ${DOODLE_PAGE}
    <text x={540} y={390} textAnchor="middle" fontSize={60} fontWeight={900} fill={colors.ink}>3 KINDS OF PEOPLE</text>
    <path d="M 270 418 C 420 410 640 426 810 412" fill="none" stroke={colors.accent} strokeWidth={8} strokeLinecap="round" strokeDasharray={560} strokeDashoffset={560 * (1 - under)}/>
    <Who x={220} t={tt} label="THE TALKER">
      <Bubble x={220} y={650} w={140} text="BLAH BLAH"/>
      <Fig x={220} y={1150} s={1.05 * (0.7 + 0.3 * on(tt))} l={[-40, -84]} r={[70, -240]}/>
    </Who>
    <Who x={540} t={tn} label="THE NODDER">
      <Bubble x={540} y={690} w={110} text="MM-HM."/>
      <Fig x={540} y={1150} s={1.05 * (0.7 + 0.3 * on(tn))} l={[-40, -84]} r={[40, -84]}/>
      <path d="M 476 868 Q 466 894 476 920 M 604 868 Q 614 894 604 920" fill="none" stroke={colors.ink} strokeWidth={5} strokeLinecap="round" opacity={0.6 + 0.4 * Math.sin(time * 6)}/>
    </Who>
    <Who x={850} t={ty} label="YOU" red={true}>
      <rect x={830} y={640} width={40} height={84} rx={20} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
      <path d="M 812 700 Q 812 752 850 752 Q 888 752 888 700 M 850 752 L 850 784 M 822 784 L 878 784" fill="none" stroke={colors.ink} strokeWidth={6} strokeLinecap="round"/>
      <line x1={802} y1={640} x2={802 + 100 * slash} y2={640 + 150 * slash} stroke={colors.accent} strokeWidth={9} strokeLinecap="round" opacity={slash > 0 ? 1 : 0}/>
      <Fig x={850} y={1150} s={1.05 * (0.7 + 0.3 * on(ty))} l={[-40, -84]} r={[40, -84]} c={colors.accent}/>
    </Who>
    <Ring x={850} y={1000} w={130} h={170} p={easeOut(clamp((time - tm - 0.3) / 0.3))} c={colors.accent}/>
  </svg>;
}`,
  },
  {
    title: 'A crude chart: two hand-drawn axes, a lumpy red line that climbs to a peak the night before and drops off a cliff at the start, a red dot riding its tip, and a push-in on "zero"',
    line: 'Your motivation peaks the night before you start, and drops to zero the moment you begin.',
    source: String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const tp = at('peaks'), tz = at('zero'), z = 1 + 0.12 * easeOut(clamp((time - tz) / 0.2));
  const P = [[170, 1000], [250, 960], [330, 880], [400, 760], [460, 570], [520, 610], [580, 1010], [700, 1030], [860, 1032]];
  const p = easeInOut(clamp((time - 0.3) / (tz - 0.1)));
  const f = p * (P.length - 1), i = Math.min(P.length - 2, Math.floor(f)), k = f - i;
  const x = P[i][0] + (P[i + 1][0] - P[i][0]) * k, y = P[i][1] + (P[i + 1][1] - P[i][1]) * k;
  return <svg>
    ${DOODLE_BLANK}
    <g transform={'translate(' + 540 * (1 - z) + ' ' + 780 * (1 - z) + ') scale(' + z + ')'}>
      <polyline points={J(150, 1) + ',430 150,1062 ' + J(920, 2) + ',' + J(1060, 3)} fill="none" stroke={colors.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"/>
      <text x={172} y={430} fontSize={44} fontWeight={800} fill={colors.ink}>MOTIVATION</text>
      <text x={460} y={1115} textAnchor="middle" fontSize={40} fontWeight={800} fill={colors.ink} opacity={clamp((time - at('night')) / 0.15)}>NIGHT BEFORE</text>
      <text x={700} y={1115} textAnchor="middle" fontSize={40} fontWeight={800} fill={colors.ink} opacity={clamp((time - at('begin')) / 0.15)}>DAY 1</text>
      <polyline points={P.slice(0, i + 1).map(q => q[0] + ',' + J(q[1], q[0])).join(' ') + ' ' + x + ',' + y} fill="none" stroke={colors.accent} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={x} cy={y} r={15} fill={colors.accent}/>
      <text x={620} y={560} fontSize={48} fontWeight={900} fill={colors.accent} opacity={clamp((time - tp) / 0.15)}>SO READY</text>
      <Arrow a={[606, 566]} q={[560, 530]} b={[492, 556]} p={easeOut(clamp((time - tp - 0.05) / 0.3))} c={colors.accent}/>
      <text x={780} y={985} textAnchor="middle" fontSize={52} fontWeight={900} fill={colors.accent} opacity={clamp((time - tz) / 0.15)}>ZERO</text>
      <Ring x={780} y={1030} w={120} h={30} p={easeOut(clamp((time - tz - 0.1) / 0.3))} c={colors.accent}/>
    </g>
  </svg>;
}`,
  },
  {
    title: 'A recipe card sketched in a few strokes: the red pen crosses out "30 MIN" and corrects it to "50 MIN", while pans pile up on the ground and the figure in the scarf holds up the right one, circled',
    line: 'The recipe says thirty minutes. It does not count the twenty you spend finding the right pan.',
    source: String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const t3 = at('thirty'), t2 = at('twenty'), ts = at('spend'), tp = at('pan');
  const x1 = easeOut(clamp((time - t2) / 0.25)), x2 = easeOut(clamp((time - t2 - 0.2) / 0.25)), up = on(tp);
  const hx = 790 + 1.15 * (60 + 26 * up), hy = 1150 - 1.15 * (90 + 200 * up);
  return <svg>
    ${DOODLE_PAGE}
    <g transform="rotate(-3 330 660)">
      <rect x={130} y={440} width={400} height={470} rx={6} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
      <text x={330} y={520} textAnchor="middle" fontSize={56} fontWeight={900} fill={colors.ink}>RECIPE</text>
      <line x1={180} y1={548} x2={480} y2={548} stroke={colors.ink} strokeWidth={5} strokeLinecap="round"/>
      <text x={330} y={652} textAnchor="middle" fontSize={72} fontWeight={900} fill={colors.ink} opacity={0.3 + 0.7 * clamp((time - t3) / 0.15)}>30 MIN</text>
      <line x1={196} y1={590} x2={196 + 268 * x1} y2={590 + 76 * x1} stroke={colors.accent} strokeWidth={9} strokeLinecap="round" opacity={x1 > 0 ? 1 : 0}/>
      <line x1={464} y1={590} x2={464 - 268 * x2} y2={590 + 76 * x2} stroke={colors.accent} strokeWidth={9} strokeLinecap="round" opacity={x2 > 0 ? 1 : 0}/>
      <text x={330} y={772} textAnchor="middle" fontSize={72} fontWeight={900} fill={colors.accent} opacity={clamp((time - t2 - 0.45) / 0.15)}>50 MIN</text>
      {range(3).map(i => <line x1={180} y1={820 + i * 32} x2={460 - i * 70} y2={820 + i * 32} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={6} strokeLinecap="round"/>)}
    </g>
    {range(3).map(i => <g opacity={time < ts + i * 0.3 ? 0 : 1} fill="none" stroke={colors.ink} strokeWidth={6} strokeLinecap="round">
      <ellipse cx={J(620 + (i % 2) * 24, i)} cy={1128 - i * 30} rx={62} ry={18} fill={colors.wall}/>
      <line x1={560 + (i % 2) * 24} y1={1128 - i * 30} x2={490 + (i % 2) * 24} y2={1118 - i * 30}/>
    </g>)}
    <Fig x={790} y={1150} s={1.15} l={[-50, -84]} r={[60 + 26 * up, -90 - 200 * up]} c={colors.accent}/>
    <g opacity={up > 0 ? 1 : 0} fill="none" stroke={colors.ink} strokeWidth={7} strokeLinecap="round">
      <line x1={hx} y1={hy} x2={hx - 10} y2={hy - 60}/>
      <ellipse cx={hx - 20} cy={hy - 92} rx={64} ry={24} fill={colors.wall}/>
    </g>
    <Ring x={hx - 20} y={hy - 92} w={96} h={52} p={easeOut(clamp((time - tp - 0.25) / 0.3))} c={colors.accent}/>
  </svg>;
}`,
  },
  {
    title: 'A list item: "#3" in red at the top left, a laptop on a desk sketched in strokes with an email titled "quick question" whose body never stops scrolling, the red pen striking "QUICK" and adding an "S"',
    line: 'Number three: the email titled quick question, which is never quick and never one question.',
    source: String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const t3 = at('three'), tn = at('never'), to = at('one');
  const scroll = Math.max(0, time - at('question')) * 60, off = scroll % 38, row = Math.floor(scroll / 38);
  const strike = easeOut(clamp((time - tn) / 0.25));
  return <svg>
    <defs><clipPath id="body"><rect x={350} y={584} width={470} height={256}/></clipPath></defs>
    ${DOODLE_PAGE}
    <text x={90} y={400} fontSize={110} fontWeight={900} fill={colors.accent} opacity={clamp((time - t3) / 0.15)}>#3</text>
    <g fill={colors.wall} stroke={colors.ink} strokeWidth={7} strokeLinejoin="round">
      <rect x={330} y={470} width={520} height={390} rx={16}/>
      <polygon points="300,860 880,860 910,900 270,900"/>
      <rect x={240} y={900} width={740} height={24}/>
      <path d="M 280 924 L 280 1150 M 940 924 L 940 1150" fill="none"/>
    </g>
    <text x={356} y={545} fontSize={38} fontWeight={800} fill={colors.ink}>RE:</text>
    <text x={446} y={545} fontSize={38} fontWeight={800} fill={colors.ink}>QUICK</text>
    <text x={598} y={545} fontSize={38} fontWeight={800} fill={colors.ink}>QUESTION{time > to ? <tspan fill={colors.accent}>S</tspan> : null}</text>
    <line x1={438} y1={532} x2={438 + 148 * strike} y2={528} stroke={colors.accent} strokeWidth={8} strokeLinecap="round" opacity={strike > 0 ? 1 : 0}/>
    <line x1={360} y1={572} x2={820} y2={572} stroke={colors.ink} strokeWidth={4}/>
    <g clipPath="url(#body)">
      {range(8).map(i => <line x1={370} y1={612 + i * 38 - off} x2={790 - ((i + row) % 3) * 80} y2={612 + i * 38 - off} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={6} strokeLinecap="round"/>)}
    </g>
    <line x1={834} y1={590} x2={834} y2={590 + 220 / (1 + scroll / 150)} stroke={colors.rose} strokeWidth={8} strokeLinecap="round"/>
    <Fig x={160} y={1150} s={1.05} l={[-40, -84]} r={[100, -220]} c={colors.accent} wide={time > tn}/>
  </svg>;
}`,
  },
];

export const DOODLE = {
  id: 'doodle',
  name: 'Felt-tip doodle',
  feel: FEEL,
  identity: IDENTITY,
  contrast: CONTRAST,
  opening: OPENING,
  examples: EXAMPLES,
  reference: DOODLE_REFERENCE,
  frame: {
    captions: { kind: 'line-center', font: 'sans', weight: 800, size: 60, upper: false, color: 'ink', highlight: 'accent', dim: 0.35 },
    grain: false,
    vignette: false,
  },
  // The red pen (primary → colors.accent) and the blue ballpoint (accent → colors.rose) on white paper in black felt-tip.
  palette: { primary: '#E5383B', accent: '#2B6CB0', ink: '#141414', background: '#FFFFFF' },
  // The format is near-silent (the silence is part of the joke), with hard cuts: a reel starts with the music off, and
  // with it on (`"sound": { "preset": "doodle", "music": true }`), soft keys about 6 dB under the house bed that barely
  // dip under the deadpan voice. Nothing plays on the cuts: its only effect is the cozy set's soft chime as the closing
  // ask's keyword lands.
  sound: { mood: 'keys', bpm: [88, 96], mode: 'major', underVoiceLu: -16, duckDb: 3, breakAt: null, sfx: 'cozy', density: 'few', musicOn: false },
};

export default DOODLE;
