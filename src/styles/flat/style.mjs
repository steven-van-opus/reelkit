// Flat vector (id 'flat'): a style (../index.mjs) for big-question science shorts, the "what if / why / how"
// format: a question and one striking number, a cascade of consequences up a ladder of time or scale, a twist and an
// awe close. Every scene is one hero object from the topic (a planet, a cell, an organ, a machine) floating big on a
// deep plum night in flat vector: smooth shapes with no outlines, each shaded the same way (a darker crescent on the
// side away from the light, one small highlight), a soft glow and drifting dust behind. Its people are its own beans;
// the ladder tag at the top left carries the step in time or scale; numbers are the climax; the camera pushes in and
// pulls back between ideas. It copies the format only: no birds or any other channel's creatures, logos, end cards or
// palette (ours is plum, sun yellow and mint). Its reference video ("How much of you is new today?", reference.mjs,
// with the kit every scene spells out) is what the writer remakes; the opening and examples below
// are kept as every style keeps them, unused while it has one. Its identity (IDENTITY: what every video keeps) is told
// apart from what each topic brings, so a new video floats its own hero objects, never the reference's cells. Every
// scene passes the code-scene checks on the canvas stage with its own line (test/styles.test.mjs).

import { FLAT_KIT, FLAT_REFERENCE, flatBig, flatHead, flatSky, tagWidth } from './reference.mjs';

const FEEL = `Big-question science in flat vector on a deep plum night. Paint colors.wall edge to edge, a soft radial glow (colors.accent or colors.rose, brightest stop 0.24) and 40–60 drifting dust dots. Every scene is one hero object from the topic, floating big mid-stage with air around it: a planet, a cell, an organ, a machine. Build it from smooth geometric shapes with no outlines, shaded one way: its flat colour, colors.cardInk at 30% over it, then the same shape offset a tenth of its size toward the top left, all clipped to the shape, so a darker crescent stays on the far side; then one small chalk highlight. People are this style's own beans: capsules 60–500 px tall in palette tints, two chalk eyes with dark pupils, no limbs, alone or in crowds of 3 to 40. Every scene starts with the ladder tag at the top left, the step in time or scale ("EVERY SECOND", "× 1,000": uppercase sans 800, 36 px, colors.wall on a colors.accent tag, corners 12), and one dot per scene at the top right, lit up to this one. Numbers are the climax: heavy sans 150–230 px in colors.accent over a unit line. Labels sit on chalk tags with a leader line. The camera is the transition: pull back from inside the hero, or push in until it fills the frame (easeInOut). Things breathe (scale 1 ± 0.02), orbit, pulse and drift; never an outline, a hard cut or a bounce.`;

// What every Flat vector video keeps, what its topic brings, and what it never copies from the reference video.
const IDENTITY = {
  constant: [
    'Flat vector on a deep plum night (colors.wall edge to edge): a big soft radial glow, tiny drifting dust, and smooth geometric shapes with no outlines',
    'One shading for every shape: its flat colour, a darker crescent on the side away from the light (the shape offset toward the top left and clipped to it) and one small chalk highlight',
    'One hero object per scene, floating big in the middle of the stage with air around it',
    "This style's own beans for people: rounded capsules in tints of the palette, two chalk eyes with dark pupils, no limbs, alone or in crowds of 3 to 40",
    'The ladder tag at the top left of every scene (the step in time or scale, uppercase heavy sans on an accent tag) and a row of dots at the top right, one per scene, lit up to this one',
    'Huge numbers in heavy sans in colors.accent over a short unit line, and chalk label tags with leader lines',
    'Camera moves between ideas (a pull back from inside the hero, a push in until it fills the frame); inside a scene, things breathe, orbit, pulse and drift, never a bounce',
    'A curious voice: a question and a striking number, a cascade up a ladder of time or scale, a twist, and an awe close',
    'A centred karaoke caption line in heavy sans under a soft vignette (drawn for you)',
  ],
  topic: [
    'The hero object of every scene, from the topic: a planet, a cell, an organ, a machine, a city, an animal',
    'The ladder: which steps of time or scale the story climbs, and the words on each tag',
    'Every number, unit and label, from your sources',
    'Who the beans are and what they are doing: one bean for "you", a crowd, a crew, a family',
  ],
  never: [
    "The reference video's hero objects as they are: the bean made of cells, the stopwatch, the gut's villi, the balance, the red blood cell, the fat cell, the neuron and the eye lens",
    'The same hero object redrawn in every scene: draw a new one when the line moves on, and bring one back only as a bookend',
    "Birds or any other channel's creatures, logos, end cards or catchphrases: the beans and this finish are this style's own",
  ],
};

// The same style on another topic, as text: a new hero object wherever the line moves down the ladder.
const CONTRAST = {
  topic: 'how deep the ocean goes',
  title: 'How deep does the ocean go?',
  chapters: [
    { label: 'Sunlight runs out at 200 m', line: "Sunlight fades fast in the sea: below about two hundred metres, there isn't enough for plants to grow.", place: 'the sunlit sea from the surface down, a bean diver' },
    { label: 'The twilight zone', line: "From two hundred to a thousand metres, there's only a faint blue glow.", place: 'a deep blue band of water, glowing fish drifting' },
    { label: 'Pitch black below 1,000 m', line: 'Below a thousand metres, no sunlight reaches at all.', place: 'black water lit only by a lantern fish' },
    { label: 'The deepest point: 11 km', line: 'The deepest spot, the Challenger Deep, is nearly eleven kilometres down.', place: 'a cutaway of the trench, a tiny sub at the bottom' },
    { label: 'Deeper than Everest is tall', line: 'Drop Mount Everest in, and its peak would still be over two kilometres under water.', place: 'Everest dropped into the trench, its peak under water' },
  ],
};

// The opening and examples, kept as every style keeps them (../index.mjs `reference`). With a reference video, the
// writer doesn't see them (../guide.mjs lookGuide), so the moves only they show (a tunnel through a planet, a heart's beat, a pull back across space, a push into a drop) reach
// the writer only as the feel's words. The tests check them like the reference's scenes.
const OPENING = {
  title: 'The planet cut open like a fruit, a tunnel straight through its core: a bean on top drops a ball, it falls through and pops out the far side as the ladder tag counts the minutes',
  line: 'Drop a ball down a tunnel through the whole Earth, and it pops out the other side in about forty minutes.',
  source: String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const p = clamp((time - at('drop')) / (at('forty') + 0.4 - at('drop'))), m = Math.round(40 * p), s = on(0, 0.7);
  const by = 680 - 300 * Math.cos(Math.PI * p);
  return <svg>
    ${flatSky('rose', 540, 680)}
    <g transform={'translate(540 680) scale(' + (0.85 + 0.15 * s) + ')'}>
      <Orb id="earth" x={0} y={0} r={280} c={colors.rose}>
        <circle cx={0} cy={0} r={215} fill={colors.blush}/>
        <circle cx={0} cy={0} r={140} fill={colors.accent}/>
        <circle cx={0} cy={0} r={70 + 4 * Math.sin(time * 2)} fill={colors.chalk} opacity={0.85}/>
        <rect x={-16} y={-300} width={32} height={600} fill={colors.wall}/>
      </Orb>
    </g>
    <Bean id="top" x={470} y={409} h={100} c={colors.accent} look={p > 0 ? 1 : 0}/>
    <g transform="rotate(180 610 951)"><Bean id="far" x={610} y={951} h={76} c={colors.blush} look={-1}/></g>
    <Orb id="ball" x={540} y={by} r={22} c={colors.chalk}/>
    <g opacity={on(at('tunnel'), 0.4)}><Tag x={820} y={560} w={230} to={[556, 600]}>TUNNEL</Tag></g>
    ${flatBig('tunnel', "m + ' min'", 'to fall all the way through', 1170)}
    ${flatHead("{'AFTER ' + m + ' MIN'}", 0, 0, tagWidth('AFTER 40 MIN'))}
  </svg>;
}`,
};

const EXAMPLES = [
  {
    title: 'A flat heart floating in a soft glow, beating twice a second with rings pulsing off it, two small beans looking up at it, and the day’s count rolling up beneath',
    line: 'Your heart beats about a hundred thousand times a day, without you ever asking it to.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const H = 'M 0 230 C -90 160 -270 40 -270 -100 C -270 -210 -190 -270 -120 -270 C -60 -270 -20 -235 0 -190 C 20 -235 60 -270 120 -270 C 190 -270 270 -210 270 -100 C 270 40 90 160 0 230 Z';
  const q = (time * 1.15) % 1, beat = 0.07 * Math.exp(-(((q - 0.08) / 0.06) ** 2)) + 0.04 * Math.exp(-(((q - 0.3) / 0.06) ** 2));
  const n = Math.round(100000 * easeOut(clamp((time - at('hundred')) / 1.6))), r = n % 1000, s = on(0, 0.7);
  return <svg>
    ${flatSky('accent', 540, 680)}
    {range(3).map(i => { const k = (time * 1.15 + i / 3) % 1; return <circle cx={540} cy={660} r={300 + 260 * k} fill="none" stroke={colors.rose} strokeWidth={6} opacity={0.5 * (1 - k)}/>; })}
    <g transform={'translate(540 680) scale(' + (0.8 + 0.2 * s) * (1 + beat) + ')'}>
      <rect x={-80} y={-330} width={60} height={130} rx={30} fill={colors.rose}/>
      <rect x={14} y={-318} width={52} height={118} rx={26} fill={colors.rose}/>
      <rect x={-80} y={-330} width={30} height={130} rx={15} fill={colors.cardInk} opacity={0.2}/>
      <clipPath id="heart"><path d={H}/></clipPath>
      <g clipPath="url(#heart)">
        <path d={H} fill={colors.accent}/>
        <path d={H} fill={colors.cardInk} opacity={0.3}/>
        <path d={H} fill={colors.accent} transform="translate(-26 -26)"/>
      </g>
      <circle cx={-150} cy={-170} r={22} fill={colors.chalk} opacity={0.6}/>
    </g>
    <Bean id="b1" x={170} y={1000} h={120} c={colors.rose} look={1}/>
    <Bean id="b2" x={262} y={1000} h={92} c={colors.blush} look={1}/>
    ${flatBig('hundred', "n < 1000 ? '' + n : Math.floor(n / 1000) + ',' + (r < 100 ? '0' : '') + (r < 10 ? '0' : '') + r", 'heartbeats a day', 1160)}
    ${flatHead('EVERY DAY', 0, 0)}
  </svg>;
}`,
  },
  {
    title: 'A pull back from the Sun filling the frame until the Earth shows up as a small dot far away, a beam of light racing across the gap while its travel time counts up to 8 min 20 s',
    line: 'The sunlight on your face left the Sun about eight minutes ago.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const cam = 2.6 - 1.6 * easeInOut(clamp(time / (duration - 0.8))), p = clamp((time - 0.4) / (duration - 0.9)), sec = Math.round(500 * p);
  return <svg>
    ${flatSky('accent', 300, 680)}
    <g transform={'translate(540 760) scale(' + cam + ')'}>
      <circle cx={-240} cy={-80} r={290 + 10 * Math.sin(time * 2)} fill={colors.accent} opacity={0.2}/>
      <Orb id="sun" x={-240} y={-80} r={220} c={colors.accent}>
        {range(14).map(i => <circle cx={-240 + 150 * Math.cos(i * 2.4) * ((i % 4) / 4 + 0.2)} cy={-80 + 150 * Math.sin(i * 2.4) * ((i % 4) / 4 + 0.2)} r={22 + (i % 3) * 8} fill={colors.blush} opacity={0.35}/>)}
      </Orb>
      <line x1={-27} y1={-27} x2={-27 + 347 * p} y2={-27 + 87 * p} stroke={colors.blush} strokeWidth={6} strokeLinecap="round" strokeDasharray="18 16" strokeDashoffset={-time * 60}/>
      <circle cx={-27 + 347 * p} cy={-27 + 87 * p} r={12} fill={colors.chalk}/>
      <Orb id="earth" x={320} y={60} r={26} c={colors.rose}/>
    </g>
    <g opacity={on(at('ago'), 0.4)}><Tag x={860} y={930} w={170} to={[860, 846]}>EARTH</Tag></g>
    ${flatBig('sunlight', "Math.floor(sec / 60) + ' min ' + (sec % 60) + ' s'", 'from the Sun to your face')}
    ${flatHead('8 MINUTES AGO', 0, 0)}
  </svg>;
}`,
  },
  {
    title: 'A small turning planet with beans popping up all around its rim, four every second, a tag keeping the running count',
    line: 'About four babies are born every second, somewhere on Earth.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const s = on(0, 0.6), born = Math.max(0, Math.floor((time - 0.3) * 4)), spin = time * 48;
  return <svg>
    ${flatSky('rose', 540, 720)}
    <g transform={'translate(540 720) scale(' + (0.85 + 0.15 * s) + ')'}>
      <Orb id="globe" x={0} y={0} r={210} c={colors.rose}>
        {range(5).map(i => <ellipse cx={(i * 170 + spin) % 700 - 350} cy={-120 + i * 62} rx={70 + (i % 3) * 30} ry={34 + (i % 2) * 18} fill={colors.blush} opacity={0.9}/>)}
      </Orb>
    </g>
    {range(24).map(i => { const k = easeOut(clamp(((time - 0.3) * 4 - i) / 1.5));
      return k > 0 ? <g transform={'rotate(' + ((i * 105) % 360) + ' 540 720)'}>
        <g transform={'translate(540 506) scale(' + k + ')'}><Bean id={'b' + i} x={0} y={0} h={70} c={[colors.accent, colors.chalk, colors.blush][i % 3]} look={0}/></g>
      </g> : null; })}
    <g opacity={on(0.4, 0.4)}><Tag x={800} y={420} w={300} to={[675, 559]}>{'+' + born + ' JUST NOW'}</Tag></g>
    ${flatBig('four', "'4'", 'babies born every second', 1170)}
    ${flatHead('EVERY SECOND', 0, 0)}
  </svg>;
}`,
  },
  {
    title: 'A push into a single drop of seawater until it fills the frame and goes dark, then the bacteria inside drift into view while the count climbs to a million',
    line: "Zoom into one millilitre of seawater, and you'll find about a million bacteria in it.",
    source: String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const go = easeInOut(clamp((time - at('seawater') - 0.2) / 1.6)), z = 1 + 8 * go, inside = clamp((z - 4) / 4), m = Math.round(1000 ** go);
  const n = Math.round(1000000 * easeOut(clamp((time - at('million')) / 1.2))), f = v => (v < 100 ? '0' : '') + (v < 10 ? '0' : '') + v;
  const D = 'M 0 -250 C 60 -150 190 -40 190 70 C 190 190 105 250 0 250 C -105 250 -190 190 -190 70 C -190 -40 -60 -150 0 -250 Z';
  return <svg>
    ${flatSky('rose', 540, 720)}
    <g transform={'translate(540 760) scale(' + z * (1 + 0.02 * Math.sin(time * 2)) + ')'}>
      <clipPath id="drop"><path d={D}/></clipPath>
      <g clipPath="url(#drop)">
        <path d={D} fill={colors.rose}/>
        <path d={D} fill={colors.cardInk} opacity={0.3}/>
        <path d={D} fill={colors.rose} transform="translate(-20 -20)"/>
        <path d={D} fill={colors.floor} opacity={inside}/>
      </g>
      <circle cx={-80} cy={-60} r={18} fill={colors.chalk} opacity={0.6 * (1 - inside)}/>
    </g>
    {range(36).map(i => { const x = 110 + (i * 137) % 820 + 24 * Math.sin(time * 0.7 + i), y = 420 + (i * 211) % 560 + 18 * Math.cos(time * 0.6 + i * 2);
      return <g opacity={inside} transform={'translate(' + x + ' ' + y + ') rotate(' + (i * 47 + time * 20) % 360 + ')'}>
        <rect x={-34} y={-13} width={68} height={26} rx={13} fill={i % 4 ? colors.rose : colors.accent}/>
        <rect x={-34} y={0} width={68} height={13} rx={6} fill={colors.cardInk} opacity={0.3}/>
      </g>; })}
    <g opacity={on(at('one'), 0.4) * (1 - inside)}><Tag x={760} y={430} w={380} to={[600, 600]}>1 mL OF SEAWATER</Tag></g>
    ${flatBig('million', "n < 1000000 ? Math.floor(n / 1000) + ',' + f(n % 1000) : '1,000,000'", 'bacteria in one millilitre')}
    ${flatHead("{'× ' + (m < 1000 ? m : '1,000')}", 0, 0, tagWidth('× 1,000'))}
  </svg>;
}`,
  },
];

export const FLAT = {
  id: 'flat',
  name: 'Flat vector',
  feel: FEEL,
  identity: IDENTITY,
  contrast: CONTRAST,
  opening: OPENING,
  examples: EXAMPLES,
  reference: FLAT_REFERENCE,
  frame: {
    captions: { kind: 'line-center', font: 'sans', weight: 800, size: 64, upper: false, color: 'ink', highlight: 'accent', dim: 0.45 },
    grain: false,
    vignette: true,
  },
  // Sun yellow (primary → colors.accent) and mint (accent → colors.rose) on a deep plum night, in cream ink.
  palette: { primary: '#FFC145', accent: '#3FD8B5', ink: '#FFF4E6', background: '#2A1846' },
  // An ambient pad and plucked arpeggio, minor-leaning (the default style bed is major), that dips under the curious
  // voice and swells in its pauses; interface blips as each step up the ladder lights, a scan into the opening and a
  // chime on the twist's payoff.
  sound: { mood: 'ambient', bpm: [84, 96], mode: 'minor', underVoiceLu: -10, duckDb: 5, breakAt: null, sfx: 'interface', density: 'some' },
};

export default FLAT;
