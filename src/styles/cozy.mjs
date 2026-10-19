// Expert Coach (id 'cozy', the cozy diorama style): every scene is a small warm set built from simple shapes for what
// its line says (a floor in perspective, a pool of lamplight, the props the line needs), and the facts as objects in
// the set: split-flap counters, gauges and dials, scales, paper cards and printouts. Its characters are its own soft
// round pebbles in knit beanies, dressed for each role, and its motion is toy-box physics (things drop in, bounce and
// settle). Each scene names its beat on a taped paper banner across the top (BANNER); the canvas look adds grain and a
// vignette and sets the captions one serif word at a time on a terracotta paper chip. Its reference video is told in
// chapters (cozy-reference.mjs), which reelkit draws a scene per set. Its identity (what every reel keeps) is told apart
// from what each topic brings, so a new reel builds its own sets instead of the reference video's rooms. Every example
// and every set of its reference passes the code-scene checks on the canvas stage (test/styles.test.mjs).

import { COZY_REFERENCE } from './cozy-reference.mjs';

const FEEL = "A cosy miniature world built like a diorama. Every scene is a set built for its line, never a bare background (a room, a shop, a workshop, a street): a backdrop in a gradient from colors.floor at the top down to colors.wall (it never changes colour), a floor in perspective, and a lamp, fire or sun throwing a big soft pool of warm light (a radial gradient of #FFD08A at half opacity). Dress it with the props its line needs; a night window or clock is welcome dressing, never the same room again. Facts are objects in the set: split-flap counters (chalk flaps in a dark cardInk housing, each flipping round to its digit), gauges and dials whose needles swing and settle, scales, and chalk paper cards, tags and printouts for anything that would be a screen. Most scenes have one of this style's own pebbles, dressed for its role and reacting to the fact: an egg-shaped body in colors.rose, an accent knit beanie with a chalk pompom, dot eyes, blush cheeks; never a boxy or square mascot. Motion is toy-box physics: things drop in and land with a squash (spring, easeOutBack), needles overshoot and settle, flaps flip. colors.accent marks the one thing that matters.";

// What every Expert Coach reel keeps, what its topic brings, and what it never copies from the reference video.
const IDENTITY = {
  constant: [
    "This style's own pebble characters (an egg-shaped body in colors.rose, an accent knit beanie with a chalk pompom, dot eyes, blush cheeks), dressed for each role: a headset, a hard hat, a chef's apron",
    'The warm miniature-diorama finish: every set built like a small model and lit by a big soft pool of warm light, under the grain and vignette the frame adds; a data or interface moment may switch to flat paper cut-out',
    'The taped headline banner across the top: a torn chalk strip with the beat\'s headline in heavy uppercase sans in cardInk, masking tape at each end',
    'Facts as objects you could pick up: split-flap counters, gauges and dials, scales, stamps, tags, receipts and paper cards',
    'Toy-box motion: things drop in, land with a squash, overshoot and settle',
    "A coach's voice: a hook with a number, then practical moves the viewer can try and what each is worth",
    'Its captions, one word at a time on an accent paper chip, and the closing ask (both drawn for you)',
  ],
  topic: [
    'Every place: a new set wherever the line moves somewhere new (a bakery, a train platform, a lab bench, a harbour), with the furniture and props its line needs',
    "The pebbles' roles, costumes and what they're doing",
    'The objects that carry the facts, and every number, label and headline on them',
    'The mock-ups, documents and screens shown, and which colors.* accents carry the story',
  ],
  never: [
    "The reference video's attic study: its roof window with the moon, the long desk and the lamp at its end",
    'Its other sets as they are: the farmhouse kitchen with the pie on its stand, the craft table by the wood stove, the office under the stairs with the toy traffic light, the hallway doorframe, the pantry shelf of jars',
    'A window, clock or calendar fixed in every scene, the same piece in the same spot: each set built for its line gets its own dressing',
  ],
};

// The same style on another topic, as text: a new place wherever the line moves on, the first returning as a bookend.
const CONTRAST = {
  topic: 'keeping a houseplant alive',
  title: "Your plant isn't thirsty",
  chapters: [
    { label: 'Drowned, not dried out', line: 'Most houseplants that die are watered too much, not too little.', place: 'a greenhouse potting bench, a fern in a clay pot' },
    { label: 'The finger test', line: 'Push a finger into the soil, and water only when it feels dry.', place: 'a terracotta pot cut away to show the soil inside' },
    { label: 'Light beats food', line: 'A bright spot does more for it than any plant food.', place: 'a sunny windowsill with three pots in a row' },
    { label: 'Holes in the pot', line: 'A pot with no drainage holes leaves the roots sitting in water.', place: 'a garden-centre shelf, one pot tipped up to show its base' },
    { label: 'Your plant, thriving', line: "Water less, give it light, and let it drain: that's a plant that lasts.", place: 'a greenhouse potting bench, a fern in a clay pot' },
  ],
};

// Every scene, the opening too, draws its beat's headline itself: the reference video's chapters had the look draw it.
const BANNER = 'Every scene, the opening too, names its beat in three or four words on the same taped banner across the top: a torn() strip of chalk centred around y 330, uppercase heavy sans at 60–66 px in cardInk, masking tape (#EADFC0) at each end.';

export const COZY = {
  id: 'cozy',
  name: 'Expert Coach',
  feel: `${FEEL} ${BANNER}`,
  identity: IDENTITY,
  contrast: CONTRAST,
  frame: {
    captions: { kind: 'word-chip', font: 'serif', weight: 800, size: 76, upper: false, color: 'chalk', highlight: 'chalk', dim: 0.5, chip: 'accent' },
    grain: true,
    vignette: true,
  },
  // Lamplit rooms at night, as the format's sets are: a night-indigo wall, rust paper (primary → colors.accent), gold
  // pebbles (accent → colors.rose) and cream text.
  palette: { primary: '#C9583A', accent: '#F2B441', ink: '#F7EFE1', background: '#1F2447' },
  reference: COZY_REFERENCE,
  // A quiet, steady, beat-light bed about 12 LU under the voice that barely dips, and almost no effects.
  sound: 'cozy',
  opening: {
    title: 'A split-flap counter drops onto a sideboard at night and flips round to the number, while a pebble checks its phone',
    line: 'You unlock your phone 96 times a day.',
    source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const Half = ({ x, g, top, s }) => <g transform={'translate(' + x + ' 0) scale(1 ' + s + ')'} clipPath={top ? 'url(#ct)' : 'url(#cb)'}>
    <rect x={0} y={-160} width={220} height={320} rx={18} fill={colors.chalk}/>
    <text x={110} y={102} textAnchor="middle" fontSize={280} fontWeight={900} fill={colors.cardInk}>{g}</text>
    <rect x={0} y={-160} width={220} height={320} fill="#000" opacity={(1 - s) * 0.3}/>
  </g>;
  const Flap = ({ x, p }) => {
    const d = Math.floor(p), f = p - d;
    return <g>
      <Half x={x} g={(d + 1) % 10} top={true} s={1}/>
      <Half x={x} g={d % 10} top={false} s={1}/>
      {f < 0.5 ? <Half x={x} g={d % 10} top={true} s={Math.cos(f * Math.PI)}/> : <Half x={x} g={(d + 1) % 10} top={false} s={-Math.cos(f * Math.PI)}/>}
    </g>;
  };
  const ban = easeOutBack(clamp(time / 0.5));
  const box = spring(time - 0.2);
  const roll = easeOut(clamp((time - at('96')) / 1.4));
  const tag = easeOutBack(clamp((time - at('day')) / 0.35));
  const fall = clamp((time - 0.15) / 0.4), land = time - 0.55;
  const sq = land > 0 ? 0.16 * Math.exp(-5 * land) * Math.cos(16 * land) : -0.1 * fall;
  const jump = Math.sin(clamp((time - at('96')) / 0.45) * Math.PI) * 60;
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.5}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
      <clipPath id="ct"><rect x={0} y={-160} width={220} height={160}/></clipPath>
      <clipPath id="cb"><rect x={0} y={0} width={220} height={160}/></clipPath>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <circle cx={860} cy={930} r={560} fill="url(#glow)"/>
    <rect x={92} y={470} width={330} height={410} rx={10} fill="#5A3826"/>
    <rect x={112} y={490} width={290} height={370} fill="#27305C"/>
    <circle cx={320} cy={575} r={44} fill="#F8EBC4"/>
    <path d="M 257 490 V 860 M 112 675 H 402" stroke="#5A3826" strokeWidth={12}/>
    <rect x={650} y={598} width={330} height={20} rx={4} fill="#7A4E34"/>
    {[150, 120, 170, 130, 110, 160].map((h, i) => <rect x={672 + i * 44} y={598 - h} width={38} height={h} rx={5} fill={[colors.accent, colors.rose, colors.blush, colors.chalk][i % 4]}/>)}
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={40} y={1090} width={1000} height={26} rx={6} fill="#9A6644"/>
    <rect x={64} y={1116} width={952} height={194} fill="#6A4029"/>
    <path d="M 92 1138 h 430 v 150 h -430 Z M 558 1138 h 430 v 150 h -430 Z" fill="none" stroke="#4E2E1D" strokeWidth={5}/>
    <ellipse cx={880} cy={1090} rx={64} ry={12} fill="#3B2418"/>
    <rect x={874} y={930} width={12} height={160} fill="#3B2418"/>
    <polygon points="800,950 960,950 926,860 834,860" fill={colors.accent}/>
    <ellipse cx={880} cy={952} rx={58} ry={10} fill="#FFE7B0"/>
    <g transform={'translate(540 ' + (860 - (1 - box) * 700) + ')'}>
      <rect x={-275} y={-200} width={550} height={400} rx={40} fill={colors.cardInk} shadow="0 26 40 rgba(0,0,0,0.45)"/>
      <rect x={-210} y={196} width={56} height={34} fill={colors.cardInk}/>
      <rect x={154} y={196} width={56} height={34} fill={colors.cardInk}/>
      <Flap x={-250} p={9 * roll}/>
      <Flap x={30} p={6 * roll}/>
      <rect x={-264} y={-4} width={528} height={8} fill={colors.cardInk}/>
    </g>
    <ellipse cx={230} cy={1094} rx={80} ry={12} fill="#000" opacity={0.3 * fall}/>
    <g transform={'translate(230 ' + (1092 - (1 - fall * fall) * 1500 - jump) + ') scale(' + 0.95 * (1 + sq) + ' ' + 0.95 * (1 - sq) + ')'}>
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <circle cx={-20} cy={-92} r={9} fill="#2A1E18"/>
      <circle cx={30} cy={-92} r={9} fill="#2A1E18"/>
      <ellipse cx={-48} cy={-68} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={58} cy={-68} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <path d="M 0 -72 Q 10 -62 20 -72" fill="none" stroke="#2A1E18" strokeWidth={5} strokeLinecap="round"/>
      <rect x={34} y={-60} width={52} height={80} rx={10} fill={colors.blush} stroke={colors.cardInk} strokeWidth={7} transform="rotate(-14 60 -20)"/>
      <ellipse cx={52} cy={-8} rx={22} ry={16} fill={colors.rose}/>
    </g>
    <g transform={'translate(540 1205) rotate(' + (-2 + (1 - tag) * 10) + ') scale(' + (0.5 + 0.5 * tag) + ')'} opacity={clamp(tag * 3)}>
      <path d={torn(-230, -50, 460, 100, 7)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
      <text x={0} y={18} textAnchor="middle" fontSize={52} fontWeight={900} fill={colors.cardInk}>TIMES A DAY</text>
      <Tape x={0} y={-50} r={-3}/>
    </g>
    <g transform={'translate(540 ' + (330 - (1 - ban) * 320) + ') rotate(' + (-1.2 + (1 - ban) * 5) + ')'}>
      <path d={torn(-440, -64, 880, 128, 3)} fill={colors.chalk} shadow="0 10 20 rgba(0,0,0,0.4)"/>
      <text x={0} y={23} textAnchor="middle" fontSize={64} fontWeight={900} fill={colors.cardInk}>THE UNLOCK HABIT</text>
      <Tape x={-420} y={-52} r={-36}/>
      <Tape x={420} y={-52} r={36}/>
    </g>
  </svg>;
}`,
  },
  examples: [
    {
      title: 'A big gauge on a radiator pipe drops onto the wall and its needle swings up, past and back to just short of the half mark, while a pebble in a scarf warms up beside it',
      line: 'Heating and cooling make up almost half of your energy bill.',
      source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const X = (r, a) => r * Math.cos(a * Math.PI / 180), Y = (r, a) => r * Math.sin(a * Math.PI / 180);
  const ban = easeOutBack(clamp(time / 0.5));
  const dial = spring(time - 0.15);
  const v = 0.16 * spring(time - at('heating') - 0.3) + 0.3 * spring(time - at('half'));
  const a = 135 + 270 * clamp(v, 0, 1);
  const tag = easeOutBack(clamp((time - at('bill')) / 0.35));
  const look = Math.sin(time * 1.5) * 4;
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.5}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <circle cx={540} cy={760} r={600} fill="url(#glow)"/>
    <rect x={0} y={1010} width={1080} height={300} fill={colors.floor}/>
    <rect x={0} y={1000} width={1080} height={16} fill={colors.chalk} opacity={0.2}/>
    {range(6).map(i => <rect x={30 + i * 180} y={1046} width={150} height={236} rx={8} fill="none" stroke={colors.chalk} strokeOpacity={0.1} strokeWidth={5}/>)}
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1306} width={1080} height={16} fill="#000" opacity={0.3}/>
    <rect x={528} y={990} width={24} height={140} fill="#B87333"/>
    {range(8).map(i => <rect x={262 + i * 70} y={1110} width={56} height={180} rx={24} fill="#D8CBB8" stroke="#A8998A" strokeWidth={4}/>)}
    <rect x={250} y={1126} width={580} height={22} rx={11} fill="#B87333"/>
    {range(4).map(i => <path d={'M ' + [320, 420, 660, 760][i] + ' 1100 q 16 -26 0 -52 q -16 -26 0 -52'} fill="none" stroke="#FFD08A" strokeWidth={8} strokeLinecap="round" opacity={0.55 * Math.sin(((time * 0.6 + i * 0.25) % 1) * Math.PI)} transform={'translate(0 ' + (-((time * 0.6 + i * 0.25) % 1) * 50) + ')'}/>)}
    <g transform={'translate(540 ' + (712 - (1 - dial) * 600) + ') rotate(' + (1 - dial) * -8 + ')'}>
      <circle r={290} fill={colors.cardInk} shadow="0 28 44 rgba(0,0,0,0.45)"/>
      <circle r={264} fill={colors.chalk}/>
      <path d={'M ' + X(220, 135) + ' ' + Y(220, 135) + ' A 220 220 0 1 1 ' + X(220, 405) + ' ' + Y(220, 405)} fill="none" stroke={colors.cardInk} strokeOpacity={0.12} strokeWidth={30}/>
      <path d={'M ' + X(220, 135) + ' ' + Y(220, 135) + ' A 220 220 0 ' + (a > 315 ? 1 : 0) + ' 1 ' + X(220, a) + ' ' + Y(220, a)} fill="none" stroke={colors.accent} strokeWidth={30}/>
      {range(11).map(i => <line x1={X(190, 135 + 27 * i)} y1={Y(190, 135 + 27 * i)} x2={X(i === 5 ? 140 : i % 5 ? 172 : 160, 135 + 27 * i)} y2={Y(i === 5 ? 140 : i % 5 ? 172 : 160, 135 + 27 * i)} stroke={i === 5 ? colors.accent : colors.cardInk} strokeWidth={i % 5 ? 5 : 10} strokeLinecap="round"/>)}
      <text x={0} y={194} textAnchor="middle" fontSize={38} fontWeight={800} fill={colors.cardInk}>OF YOUR BILL</text>
      <g transform={'rotate(' + a + ')'}>
        <polygon points="-40,-12 196,-3 196,3 -40,12" fill={colors.cardInk}/>
        <polygon points="150,-7 206,0 150,7" fill={colors.accent}/>
      </g>
      <circle r={30} fill={colors.accent}/>
      <circle r={10} fill={colors.chalk}/>
    </g>
    <g transform="translate(165 1312) scale(0.95)">
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <circle cx={-6 + look} cy={-100} r={9} fill="#2A1E18"/>
      <circle cx={42 + look} cy={-100} r={9} fill="#2A1E18"/>
      <ellipse cx={-36} cy={-76} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={70} cy={-76} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <path d="M -88 -56 Q 0 -30 88 -56 L 84 -26 Q 0 -2 -84 -26 Z" fill={colors.chalk}/>
      <rect x={30} y={-40} width={30} height={84} rx={10} fill={colors.chalk} transform="rotate(-8 45 -40)"/>
    </g>
    <g transform={'translate(540 1050) rotate(' + (-3 + (1 - tag) * 14) + ') scale(' + (0.5 + 0.5 * tag) + ')'} opacity={clamp(tag * 3)}>
      <path d={torn(-220, -54, 440, 108, 5)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
      <text x={0} y={19} textAnchor="middle" fontSize={54} fontWeight={900} fill={colors.cardInk}>ALMOST HALF</text>
      <Tape x={0} y={-56} r={-4}/>
    </g>
    <g transform={'translate(540 ' + (330 - (1 - ban) * 320) + ') rotate(' + (1.2 - (1 - ban) * 5) + ')'}>
      <path d={torn(-440, -64, 880, 128, 8)} fill={colors.chalk} shadow="0 10 20 rgba(0,0,0,0.4)"/>
      <text x={0} y={23} textAnchor="middle" fontSize={64} fontWeight={900} fill={colors.cardInk}>WHERE THE BILL GOES</text>
      <Tape x={-420} y={-52} r={-36}/>
      <Tape x={420} y={-52} r={36}/>
    </g>
  </svg>;
}`,
    },
    {
      title: 'A little desk printer feeds out a paper slip one step per phrase, each ticked as it prints, then the hardest one gets circled',
      line: 'Write it down, pick three, and do the hardest one first.',
      source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const ban = easeOutBack(clamp(time / 0.5));
  const cues = [0.25, Math.max(at('write'), 0.75), at('three'), at('hardest')];
  const step = c => easeInOut(clamp((time - c) / 0.45));
  const L = 150 * step(cues[0]) + 130 * step(cues[1]) + 130 * step(cues[2]) + 150 * step(cues[3]);
  const busy = clamp((time - cues[0]) * 3) - clamp((time - cues[3] - 0.5) * 3);
  const ring = easeInOut(clamp((time - at('first')) / 0.5));
  const items = ['Write it down', 'Pick three', 'Hardest first'];
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.5}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
      <clipPath id="slot"><rect x={0} y={0} width={1080} height={1034}/></clipPath>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <circle cx={540} cy={760} r={620} fill="url(#glow)"/>
    <rect x={70} y={480} width={210} height={300} rx={10} fill="#9A6644"/>
    <rect x={86} y={496} width={178} height={268} fill="#C49A6C"/>
    <rect x={104} y={520} width={80} height={80} fill={colors.rose} transform="rotate(-6 144 560)"/>
    <rect x={160} y={630} width={80} height={80} fill={colors.blush} transform="rotate(5 200 670)"/>
    <circle cx={144} cy={528} r={8} fill={colors.accent}/>
    <circle cx={200} cy={638} r={8} fill={colors.accent}/>
    <rect x={800} y={600} width={180} height={20} rx={4} fill="#7A4E34"/>
    <path d="M 850 600 L 862 540 L 918 540 L 930 600 Z" fill={colors.accent}/>
    {range(5).map(i => <ellipse cx={890 + Math.cos(i * 1.3) * 34} cy={500 - i * 6} rx={16} ry={36} fill="#4F7A52" transform={'rotate(' + (i * 30 - 60) + ' 890 540)'}/>)}
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={20} y={1180} width={1040} height={30} rx={6} fill="#9A6644"/>
    <rect x={44} y={1210} width={992} height={100} fill="#6A4029"/>
    <rect x={380} y={1226} width={320} height={66} rx={10} fill="none" stroke="#4E2E1D" strokeWidth={5}/>
    <circle cx={540} cy={1259} r={9} fill="#C49A6C"/>
    <g clipPath="url(#slot)">
      <g transform={'translate(0 ' + (1034 - L) + ')'}>
        <path d={torn(300, 0, 480, 760, 5)} fill={colors.chalk} shadow="0 10 18 rgba(0,0,0,0.3)"/>
        <text x={540} y={92} textAnchor="middle" fontSize={56} fontWeight={900} fill={colors.cardInk}>TO DO</text>
        <line x1={330} y1={128} x2={750} y2={128} stroke={colors.cardInk} strokeWidth={4} strokeDasharray="14 10"/>
        {items.map((t, i) => <g>
          <rect x={330} y={170 + i * 130} width={56} height={56} rx={8} fill="none" stroke={colors.cardInk} strokeWidth={6}/>
          <polyline points={'340,' + (198 + i * 130) + ' 356,' + (216 + i * 130) + ' 392,' + (166 + i * 130)} fill="none" stroke={colors.accent} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="100" strokeDashoffset={100 * (1 - clamp((time - cues[i + 1] - 0.35) / 0.25))}/>
          <text x={408} y={214 + i * 130} fontSize={46} fontWeight={800} fill={colors.cardInk}>{t}</text>
        </g>)}
        <ellipse cx={548} cy={456} rx={238} ry={54} fill="none" stroke={colors.accent} strokeWidth={8} strokeLinecap="round" strokeDasharray="1600" strokeDashoffset={1600 - 1560 * ring} transform="rotate(-3 548 456)"/>
      </g>
    </g>
    <rect x={240} y={1010} width={600} height={172} rx={34} fill={colors.accent} shadow="0 20 30 rgba(0,0,0,0.4)"/>
    <rect x={240} y={1010} width={600} height={40} rx={20} fill="#FFFFFF" opacity={0.18}/>
    <rect x={290} y={1026} width={500} height={14} rx={7} fill={colors.cardInk}/>
    <rect x={300} y={1086} width={170} height={56} rx={10} fill={colors.cardInk}/>
    <rect x={312} y={1098} width={146} height={32} rx={6} fill={colors.blush} opacity={0.35 + 0.65 * busy}/>
    <circle cx={720} cy={1114} r={22} fill={colors.chalk}/>
    <circle cx={780} cy={1114} r={14} fill={colors.rose} opacity={0.4 + 0.6 * busy}/>
    <rect x={280} y={1178} width={60} height={10} rx={5} fill="#3B2418"/>
    <rect x={740} y={1178} width={60} height={10} rx={5} fill="#3B2418"/>
    <g transform={'translate(540 ' + (330 - (1 - ban) * 320) + ') rotate(' + (-1 + (1 - ban) * 5) + ')'}>
      <path d={torn(-440, -64, 880, 128, 2)} fill={colors.chalk} shadow="0 10 20 rgba(0,0,0,0.4)"/>
      <text x={0} y={23} textAnchor="middle" fontSize={64} fontWeight={900} fill={colors.cardInk}>THE THREE-THING RULE</text>
      <Tape x={-420} y={-52} r={-36}/>
      <Tape x={420} y={-52} r={36}/>
    </g>
  </svg>;
}`,
    },
    {
      title: 'A kitchen balance scale tips as a steaming mug drops on one pan, then levels out as three cans land on the other',
      line: 'One cup of coffee has as much caffeine as three cans of cola.',
      source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const ban = easeOutBack(clamp(time / 0.5));
  const tm = at('coffee') + 0.2, tc = [0, 1, 2].map(i => at('three') + 0.2 + i * 0.22);
  const tilt = -11 * spring(time - tm) + 3.67 * (spring(time - tc[0]) + spring(time - tc[1]) + spring(time - tc[2]));
  const k = tilt * Math.PI / 180;
  const lx = 540 - 280 * Math.cos(k), ly = 640 - 280 * Math.sin(k), rx = 540 + 280 * Math.cos(k), ry = 640 + 280 * Math.sin(k);
  const fall = t0 => -700 * (1 - clamp((time - t0 + 0.3) / 0.3)) ** 2;
  const seen = t0 => (time > t0 - 0.3 ? 1 : 0);
  const tagA = easeOutBack(clamp((time - at('coffee')) / 0.35)), tagB = easeOutBack(clamp((time - at('cola')) / 0.35));
  const Tag = ({ x, p, r, text, seed }) => <g transform={'translate(' + x + ' 1250) rotate(' + (r - (1 - p) * 3 * r) + ') scale(' + (0.5 + 0.5 * p) + ')'} opacity={clamp(p * 3)}>
    <path d={torn(-150, -50, 300, 100, seed)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
    <text x={0} y={18} textAnchor="middle" fontSize={54} fontWeight={900} fill={colors.cardInk}>{text}</text>
    <Tape x={0} y={-52} r={r}/>
  </g>;
  const Pan = ({ x, y }) => <g>
    <line x1={x} y1={y} x2={x - 125} y2={y + 250} stroke={colors.cardInk} strokeWidth={4}/>
    <line x1={x} y1={y} x2={x + 125} y2={y + 250} stroke={colors.cardInk} strokeWidth={4}/>
    <path d={'M ' + (x - 146) + ' ' + (y + 250) + ' Q ' + x + ' ' + (y + 310) + ' ' + (x + 146) + ' ' + (y + 250) + ' Z'} fill={colors.rose}/>
    <circle cx={x} cy={y} r={12} fill={colors.rose}/>
  </g>;
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.5}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <circle cx={540} cy={760} r={620} fill="url(#glow)"/>
    {range(40).map(i => <rect x={(i % 8) * 140 - (Math.floor(i / 8) % 2) * 70} y={830 + Math.floor(i / 8) * 64} width={136} height={60} rx={6} fill={colors.chalk} opacity={0.08}/>)}
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1150} width={1080} height={30} fill="#9A6644"/>
    <rect x={0} y={1180} width={1080} height={130} fill="#6A4029"/>
    <rect x={0} y={1180} width={1080} height={20} fill="#000" opacity={0.25}/>
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={500} y={1120} width={80} height={34} rx={8} fill={colors.cardInk}/>
    <rect x={528} y={640} width={24} height={490} fill={colors.cardInk}/>
    <line x1={lx} y1={ly} x2={rx} y2={ry} stroke={colors.cardInk} strokeWidth={18} strokeLinecap="round"/>
    <Pan x={lx} y={ly}/>
    <Pan x={rx} y={ry}/>
    <g transform={'translate(' + lx + ' ' + (ly + 250 + fall(tm)) + ')'} opacity={seen(tm)}>
      <rect x={-75} y={-170} width={150} height={170} rx={20} fill={colors.chalk}/>
      <rect x={-75} y={-118} width={150} height={36} fill={colors.accent}/>
      <circle cx={92} cy={-96} r={36} fill="none" stroke={colors.chalk} strokeWidth={17}/>
      <ellipse cx={0} cy={-168} rx={64} ry={11} fill="#4A2A1A"/>
      {range(2).map(i => <path d={'M ' + (-22 + i * 44) + ' -200 q 16 -24 0 -48 q -16 -24 0 -48'} fill="none" stroke={colors.chalk} strokeWidth={8} strokeLinecap="round" opacity={0.3 + 0.2 * Math.sin(time * 2 + i * 2)}/>)}
    </g>
    {tc.map((c, i) => <g transform={'translate(' + (rx - 92 + i * 92) + ' ' + (ry + 250 + fall(c)) + ')'} opacity={seen(c)}>
      <rect x={-40} y={-150} width={80} height={150} rx={14} fill={colors.accent}/>
      <rect x={-40} y={-102} width={80} height={44} fill={colors.chalk} opacity={0.9}/>
      <ellipse cx={0} cy={-148} rx={36} ry={9} fill="#D0C4B4"/>
    </g>)}
    <circle cx={540} cy={640} r={24} fill={colors.accent}/>
    <Tag x={260} p={tagA} r={-4} text="1 CUP" seed={4}/>
    <Tag x={820} p={tagB} r={4} text="3 CANS" seed={9}/>
    <g transform={'translate(540 ' + (330 - (1 - ban) * 320) + ') rotate(' + (1 - (1 - ban) * 5) + ')'}>
      <path d={torn(-440, -64, 880, 128, 6)} fill={colors.chalk} shadow="0 10 20 rgba(0,0,0,0.4)"/>
      <text x={0} y={23} textAnchor="middle" fontSize={64} fontWeight={900} fill={colors.cardInk}>CAFFEINE, WEIGHED</text>
      <Tape x={-420} y={-52} r={-36}/>
      <Tape x={420} y={-52} r={36}/>
    </g>
  </svg>;
}`,
    },
    {
      title: 'A pebble asleep under a patchwork quilt while the bedroom clock above the bed fills in the night, seven hours, then nine',
      line: 'Most adults need seven to nine hours of sleep a night.',
      source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const X = (r, a) => r * Math.cos(a * Math.PI / 180), Y = (r, a) => r * Math.sin(a * Math.PI / 180);
  const W = (r, a0, a1) => 'M 0 0 L ' + X(r, a0) + ' ' + Y(r, a0) + ' A ' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + X(r, a1) + ' ' + Y(r, a1) + ' Z';
  const ban = easeOutBack(clamp(time / 0.5));
  const clock = spring(time - 0.1);
  const h7 = 7 * easeInOut(clamp((time - at('seven')) / 0.6)), h9 = 2 * easeInOut(clamp((time - at('nine')) / 0.5));
  const s = 220, hand = 240 + (h7 + h9) * 30;
  const tag = easeOutBack(clamp((time - at('hours')) / 0.35));
  const breath = Math.sin(time * 2.2) * 0.03;
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.55}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B2448"/><stop offset="1" stopColor="#3B4278"/></linearGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <circle cx={110} cy={1000} r={560} fill="url(#glow)"/>
    <rect x={70} y={470} width={190} height={300} rx={10} fill="#5A3826"/>
    <rect x={86} y={486} width={158} height={268} fill="url(#sky)"/>
    <circle cx={190} cy={550} r={30} fill="#F8EBC4"/>
    <circle cx={204} cy={540} r={27} fill="url(#sky)"/>
    <rect x={159} y={486} width={12} height={268} fill="#5A3826"/>
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1270 ' + (540 + (i * 200 - 460) * 0.45) + ',1270 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1256} width={1080} height={16} fill={colors.floor}/>
    <rect x={30} y={1090} width={140} height={170} rx={10} fill="#8A5A3B"/>
    <ellipse cx={100} cy={1090} rx={40} ry={8} fill="#3B2418"/>
    <rect x={94} y={1010} width={12} height={80} fill="#3B2418"/>
    <polygon points="50,1010 150,1010 130,950 70,950" fill={colors.rose}/>
    <rect x={200} y={930} width={780} height={300} rx={50} fill="#8A5A3B"/>
    <rect x={220} y={950} width={740} height={260} rx={38} fill="#9A6644"/>
    <ellipse cx={760} cy={1056} rx={150} ry={42} fill={colors.chalk}/>
    <g transform={'translate(760 1136) scale(' + 0.85 * (1 - breath) + ' ' + 0.85 * (1 + breath) + ')'}>
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <path d="M -38 -96 Q -26 -84 -14 -96 M 14 -96 Q 26 -84 38 -96" fill="none" stroke="#2A1E18" strokeWidth={6} strokeLinecap="round"/>
      <ellipse cx={-50} cy={-70} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={50} cy={-70} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
    </g>
    <path d="M 190 1084 L 990 1084 L 1010 1300 L 170 1300 Z" fill={colors.chalk}/>
    {range(12).map(i => <rect x={196 + (i % 6) * 134} y={1124 + Math.floor(i / 6) * 86} width={130} height={82} fill={[colors.accent, colors.rose, colors.blush][(i + Math.floor(i / 6)) % 3]}/>)}
    {range(3).map(i => <text x={810 + i * 36 + Math.sin(time * 1.5 + i) * 10} y={940 - ((time * 0.4 + i / 3) % 1) * 200} fontSize={40 + i * 10} fontWeight={900} fill={colors.ink} opacity={Math.sin(((time * 0.4 + i / 3) % 1) * Math.PI)}>z</text>)}
    <g transform={'translate(540 ' + (660 - (1 - clock) * 500) + ') rotate(' + (1 - clock) * 10 + ')'}>
      <circle r={s + 24} fill={colors.cardInk} shadow="0 24 40 rgba(0,0,0,0.45)"/>
      <circle r={s} fill={colors.chalk}/>
      <path d={W(s - 24, 240, 240 + h7 * 30)} fill={colors.accent}/>
      <path d={W(s - 24, 240 + h7 * 30, hand)} fill={colors.rose}/>
      {range(12).map(i => <line x1={X(s - 12, i * 30)} y1={Y(s - 12, i * 30)} x2={X(i % 3 ? s - 30 : s - 44, i * 30)} y2={Y(i % 3 ? s - 30 : s - 44, i * 30)} stroke={colors.cardInk} strokeWidth={i % 3 ? 5 : 9} strokeLinecap="round"/>)}
      {range(4).map(i => <text x={X(s - 80, i * 90 - 90)} y={Y(s - 80, i * 90 - 90) + 16} textAnchor="middle" fontSize={44} fontWeight={900} fill={colors.cardInk}>{['12', '3', '6', '9'][i]}</text>)}
      <line x1={0} y1={0} x2={X(110, hand)} y2={Y(110, hand)} stroke={colors.cardInk} strokeWidth={16} strokeLinecap="round"/>
      <line x1={0} y1={0} x2={0} y2={-168} stroke={colors.cardInk} strokeWidth={9} strokeLinecap="round"/>
      <circle r={16} fill={colors.cardInk}/>
    </g>
    <g transform={'translate(430 1010) rotate(' + (-4 + (1 - tag) * 14) + ') scale(' + (0.5 + 0.5 * tag) + ')'} opacity={clamp(tag * 3)}>
      <path d={torn(-170, -54, 340, 108, 3)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
      <text x={0} y={20} textAnchor="middle" fontSize={58} fontWeight={900} fill={colors.cardInk}>7–9 HOURS</text>
      <Tape x={0} y={-54} r={-6}/>
    </g>
    <g transform={'translate(540 ' + (330 - (1 - ban) * 320) + ') rotate(' + (-1 + (1 - ban) * 5) + ')'}>
      <path d={torn(-440, -64, 880, 128, 11)} fill={colors.chalk} shadow="0 10 20 rgba(0,0,0,0.4)"/>
      <text x={0} y={23} textAnchor="middle" fontSize={64} fontWeight={900} fill={colors.cardInk}>HOW MUCH SLEEP</text>
      <Tape x={-420} y={-52} r={-36}/>
      <Tape x={420} y={-52} r={36}/>
    </g>
  </svg>;
}`,
    },
  ],
};
