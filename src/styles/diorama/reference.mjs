// Lamplit diorama's reference video (../reference.mjs): "Let AI draft your weekly update", told in chapters the way the
// style's coach tells a tip: one continuous take on the coach's skeleton (a hook with a number, "That's
// because", "So", "Then", "And get this", "But", "Which means"), seven chapters under a taped headline banner (which
// a reelkit scene draws itself, style.mjs BANNER), and one protagonist, Bea, a pebble team lead in a lanyard,
// writing her Friday update in every chapter.
// Each set is a place built from the topic (an attic study, a farmhouse kitchen, a craft table by a wood stove, an
// office under the stairs, a hallway doorframe, a pantry shelf), the first coming back as a bookend; two sets are held
// across a second sentence (reelkit draws a scene per set, ../reference.mjs referenceSets). No scene of it draws the
// banner: in chapters, the look did. Its facts: Noy and Zhang, "Experimental evidence on the productivity effects of generative artificial
// intelligence", Science, 14 July 2023 (453 professionals, writing time down 40%, quality up 18% as graded blind by
// experienced professionals in the same occupations; MIT News, 14 July 2023), and their March 2023 MIT working paper
// (time spent before AI: about a quarter brainstorming, half on the rough draft, a quarter editing). The three parts
// follow the common Progress, Plans, Problems status format. A new Lamplit diorama video remakes it.
// Each set names its place, which a new video never copies (../guide.mjs lookGuide). Bump the id when the video
// changes (a place is text only: it changes no frame).

export const DIORAMA_REFERENCE = {
  id: 'diorama-2',
  title: 'Let AI draft your weekly update',
  caption: 'One prompt turns a week of messy notes into your update. What’s on your stuck list?',
  layout: 'chapters',
  thread: 'Bea, a pebble team lead in a lanyard, writing her Friday update',
  beats: [
    {
      label: '40% LESS WRITING TIME',
      line: 'AI cut writing time 40% in an MIT study.',
      place: 'an attic study at night, a desk under the roof window',
      source: String.raw`export default function Scene({ time, colors }) {
  const Half = ({ x, g, top, s }) => <g transform={'translate(' + x + ' 0) scale(1 ' + s + ')'} clipPath={top ? 'url(#ct)' : 'url(#cb)'}>
    <rect x={0} y={-140} width={180} height={280} rx={16} fill={colors.chalk}/>
    <text x={90} y={84} textAnchor="middle" fontSize={226} fontWeight={900} fill={colors.cardInk}>{g}</text>
    <rect x={0} y={-140} width={180} height={280} fill="#000" opacity={(1 - s) * 0.3}/>
  </g>;
  const Flap = ({ x, p }) => {
    const d = Math.floor(p), f = p - d;
    return <g>
      <Half x={x} g={(d + 1) % 10} top={true} s={1}/>
      <Half x={x} g={d % 10} top={false} s={1}/>
      {f < 0.5 ? <Half x={x} g={d % 10} top={true} s={Math.cos(f * Math.PI)}/> : <Half x={x} g={(d + 1) % 10} top={false} s={-Math.cos(f * Math.PI)}/>}
    </g>;
  };
  const roll = easeOut(clamp(time / Math.max(0.6, at('40%'))));
  const snip = clamp((time - at('cut')) / 0.2), fall = clamp((time - at('cut') - 0.2) / 0.9);
  const tag = easeOutBack(clamp((time - at('mit')) / 0.35));
  const drop = clamp((time - at('prompt') + 0.35) / 0.35);
  const jump = Math.sin(clamp((time - at('prompt')) / 0.5) * Math.PI) * 60 + Math.sin(clamp((time - at('update')) / 0.45) * Math.PI) * 40;
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.5}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
      <clipPath id="ct"><rect x={0} y={-140} width={180} height={140}/></clipPath>
      <clipPath id="cb"><rect x={0} y={0} width={180} height={140}/></clipPath>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <polygon points="0,0 1080,0 1080,430 0,640" fill={colors.floor}/>
    <polygon points="88,510 312,467 312,566 88,612" fill="#27305C" stroke="#5A3826" strokeWidth={18}/>
    <circle cx={250} cy={516} r={26} fill="#F8EBC4"/>
    <circle cx={900} cy={900} r={540} fill="url(#glow)"/>
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={40} y={1090} width={1000} height={26} rx={6} fill="#9A6644"/>
    <rect x={64} y={1116} width={952} height={194} fill="#6A4029"/>
    <ellipse cx={960} cy={1090} rx={60} ry={11} fill="#3B2418"/>
    <rect x={954} y={940} width={12} height={150} fill="#3B2418"/>
    <polygon points="880,960 1040,960 1006,870 914,870" fill={colors.accent}/>
    <g transform="translate(450 700)">
      <rect x={-300} y={-180} width={600} height={360} rx={36} fill={colors.cardInk} shadow="0 26 40 rgba(0,0,0,0.45)"/>
      <Flap x={-275} p={4 * roll}/>
      <Flap x={-80} p={10 * roll}/>
      <text x={200} y={60} textAnchor="middle" fontSize={170} fontWeight={900} fill={colors.chalk}>%</text>
    </g>
    <rect x={120} y={1040} width={348} height={46} fill={colors.chalk}/>
    {range(6).map(i => <line x1={146 + i * 58} y1={1040} x2={146 + i * 58} y2={1052} stroke={colors.cardInk} strokeWidth={4}/>)}
    <text x={294} y={1078} textAnchor="middle" fontSize={34} fontWeight={800} fill={colors.cardInk}>WRITING TIME</text>
    <rect x={0} y={0} width={232} height={46} fill={colors.accent} opacity={1 - fall} transform={'translate(' + (468 + 70 * fall) + ' ' + (1040 + 380 * fall * fall) + ') rotate(' + 40 * fall + ')'}/>
    <g transform="translate(468 1062) rotate(90)">
      {[-1, 1].map(k => <g transform={'rotate(' + k * (16 - 14 * snip) + ')'}><polygon points={'-10,' + 4 * k + ' 120,' + 2 * k + ' -10,' + -6 * k} fill="#C9CED6"/><ellipse cx={-52} cy={24 * k} rx={36} ry={22} fill="none" stroke={colors.chalk} strokeWidth={12}/></g>)}
      <circle r={8} fill={colors.cardInk}/>
    </g>
    <g transform={'translate(250 966) rotate(' + (-3 + (1 - tag) * 12) + ') scale(' + (0.5 + 0.5 * tag) + ')'} opacity={clamp(tag * 3)}>
      <path d={torn(-150, -44, 300, 88, 4)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
      <text x={0} y={16} textAnchor="middle" fontSize={46} fontWeight={900} fill={colors.cardInk}>MIT STUDY</text>
      <rect x={-48} y={-62} width={96} height={36} fill="#EADFC0" opacity={0.85} transform="rotate(-4)"/>
    </g>
    <g transform={'translate(800 ' + (836 - (1 - drop * drop) * 1100 - jump) + ') rotate(' + (6 - 8 * drop) + ')'} opacity={drop > 0 ? 1 : 0}>
      <rect x={-110} y={-70} width={220} height={140} rx={8} fill={colors.chalk} shadow="0 10 16 rgba(0,0,0,0.35)"/>
      <rect x={-110} y={-70} width={220} height={14} fill={colors.accent}/>
      <text x={0} y={16} textAnchor="middle" fontSize={40} fontWeight={900} fill={colors.cardInk}>PROMPT</text>
    </g>
    <g transform={'translate(800 ' + (1090 - jump) + ') scale(0.8)'}>
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <circle cx={-20 + 8 * drop} cy={-102 - 10 * drop} r={9} fill="#2A1E18"/>
      <circle cx={24 + 8 * drop} cy={-102 - 10 * drop} r={9} fill="#2A1E18"/>
      <ellipse cx={-48} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={54} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <path d="M -6 -82 Q 4 -70 14 -82" fill="none" stroke="#2A1E18" strokeWidth={5} strokeLinecap="round"/>
      <path d="M -44 -66 L 0 -40 L 44 -66" fill="none" stroke={colors.accent} strokeWidth={6}/>
      <rect x={-17} y={-42} width={34} height={28} rx={5} fill={colors.chalk}/>
    </g>
  </svg>;
}`,
    },
    {
      label: '40% LESS WRITING TIME',
      line: 'So let one prompt draft your weekly update.',
      hold: true,
    },
    {
      label: 'THE ROUGH-DRAFT HALF',
      line: 'That’s because drafting took about half that time, and AI does that part.',
      place: 'a farmhouse kitchen table under a pendant lamp',
      cut: 'dissolve',
      source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const Tag = ({ x, y, w, p, r, text, seed }) => <g transform={'translate(' + x + ' ' + y + ') rotate(' + (r - (1 - p) * 3 * r) + ') scale(' + (0.6 + 0.4 * p) + ')'} opacity={clamp(p * 3)}>
    <path d={torn(-w / 2, -38, w, 76, seed)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
    <text x={0} y={13} textAnchor="middle" fontSize={36} fontWeight={900} fill={colors.cardInk}>{text}</text>
    <Tape x={0} y={-38} r={r}/>
  </g>;
  const X = (r, a) => r * Math.cos(a * Math.PI / 180), Y = (r, a) => r * Math.sin(a * Math.PI / 180);
  const W = (r, a0, a1) => 'M 0 0 L ' + X(r, a0) + ' ' + Y(r, a0) + ' A ' + r + ' ' + r + ' 0 0 1 ' + X(r, a1) + ' ' + Y(r, a1) + ' Z';
  const hot = easeOut(clamp((time - at('half')) / 0.4));
  const lift = spring(time - at('ai'));
  const tagAI = easeOutBack(clamp((time - at('ai') - 0.35) / 0.35));
  const lean = easeInOut(clamp((time - at('part')) / 0.5));
  const sway = Math.sin(time * 1.6) * 3;
  const steam = (time * 0.6) % 1;
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.55}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    {range(9).map(i => <rect x={i * 124 - 10} y={430} width={8} height={640} fill={colors.chalk} opacity={0.06}/>)}
    <rect x={60} y={500} width={200} height={260} rx={10} fill="#5A3826"/>
    <rect x={74} y={514} width={172} height={232} fill="#3B4A6E"/>
    <rect x={74} y={514} width={172} height={232} fill={colors.chalk} opacity={0.22}/>
    <path d="M 160 514 V 746 M 74 630 H 246" stroke="#5A3826" strokeWidth={10}/>
    <g transform={'rotate(' + sway + ' 540 0)'}>
      <line x1={540} y1={0} x2={540} y2={440} stroke="#3B2418" strokeWidth={6}/>
      <path d="M 466 500 Q 540 400 614 500 Z" fill={colors.accent}/>
      <ellipse cx={540} cy={500} rx={74} ry={11} fill="#FFE7B0"/>
    </g>
    <circle cx={540} cy={800} r={620} fill="url(#glow)"/>
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={300} y={1080} width={760} height={28} rx={6} fill="#9A6644"/>
    <rect x={330} y={1108} width={22} height={200} fill="#6A4029"/>
    <rect x={1008} y={1108} width={22} height={200} fill="#6A4029"/>
    <rect x={500} y={960} width={80} height={120} rx={8} fill="#B98A55"/>
    <ellipse cx={540} cy={962} rx={250} ry={22} fill="#D8CBB8"/>
    <ellipse cx={540} cy={1080} rx={90} ry={12} fill="#B98A55"/>
    <ellipse cx={780} cy={1078} rx={200} ry={20} fill="#D8CBB8" opacity={0.5 + 0.5 * clamp(lift * 2)}/>
    <g transform="translate(540 760) scale(1 0.8)">
      <circle r={226} fill="#C98B4A"/>
      <path d={W(204, 180, 270)} fill={colors.blush} stroke={colors.chalk} strokeWidth={6}/>
      <path d={W(204, 270, 360)} fill={colors.blush} stroke={colors.chalk} strokeWidth={6}/>
      <path d="M -204 0 A 204 204 0 0 0 204 0 Z" fill="#7A4E34" opacity={lift > 0.05 ? 0.6 : 0}/>
    </g>
    <g transform={'translate(' + (540 + 240 * lift) + ' ' + (760 + 250 * lift) + ') scale(1 0.8)'}>
      <path d={W(204, 0, 180)} fill={hot > 0 ? colors.accent : colors.rose} stroke={colors.chalk} strokeWidth={6} opacity={0.75 + 0.25 * hot}/>
      <path d="M -150 30 Q 0 60 150 30 M -110 90 Q 0 120 110 90" fill="none" stroke="#7A4E34" strokeWidth={8} strokeLinecap="round" opacity={0.5}/>
    </g>
    <Tag x={290} y={570} w={300} p={1} r={-4} text="BRAINSTORM 25%" seed={3}/>
    <Tag x={800} y={570} w={200} p={1} r={4} text="EDIT 25%" seed={7}/>
    <Tag x={540 + 230 * lift} y={890 + 250 * lift} w={320} p={easeOutBack(clamp((time - at('half')) / 0.35))} r={-2} text="ROUGH DRAFT 50%" seed={5}/>
    <Tag x={910} y={960} w={140} p={tagAI} r={6} text="AI" seed={9}/>
    <g transform={'translate(190 1300) rotate(' + (-10 * lean) + ')'}>
      <g transform="scale(0.88)">
        <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
        <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
        <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
        <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
        <circle cx={-14 + 10 * hot} cy={-102} r={9} fill="#2A1E18"/>
        <circle cx={30 + 10 * hot} cy={-102} r={9} fill="#2A1E18"/>
        <ellipse cx={-48} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
        <ellipse cx={54} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
        <path d={lean > 0.5 ? 'M -4 -84 Q 8 -66 20 -84' : 'M -2 -80 Q 8 -72 18 -80'} fill="none" stroke="#2A1E18" strokeWidth={5} strokeLinecap="round"/>
        <path d="M -44 -66 L 0 -40 L 44 -66" fill="none" stroke={colors.accent} strokeWidth={6}/>
        <rect x={-17} y={-42} width={34} height={28} rx={5} fill={colors.chalk}/>
        <rect x={56} y={-70} width={54} height={58} rx={10} fill={colors.chalk}/>
        <circle cx={118} cy={-42} r={16} fill="none" stroke={colors.chalk} strokeWidth={8}/>
        {range(2).map(i => <path d={'M ' + (70 + i * 26) + ' -84 q 12 -20 0 -40'} fill="none" stroke={colors.chalk} strokeWidth={6} strokeLinecap="round" opacity={0.5 * Math.sin(((steam + i * 0.5) % 1) * Math.PI)}/>)}
      </g>
    </g>
  </svg>;
}`,
    },
    {
      label: 'PASTE IN YOUR NOTES',
      line: 'So you paste in the week’s notes, messy bullets and all.',
      place: 'a craft table by a wood stove, a scrapbook open',
      cut: 'cut',
      source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const brush = easeInOut(clamp((time - at('paste') + 0.1) / 0.6));
  const tip = easeOut(clamp((time - at('notes') + 0.15) / 0.3));
  const go = k => clamp((time - at('notes') - k * 0.13) / 0.45);
  const flip = easeOutBack(clamp((time - at('messy')) / 0.4));
  const pat = Math.sin(clamp((time - at('all')) / 0.5) * Math.PI * 2);
  const fire = 0.9 + 0.1 * Math.sin(time * 2.4);
  const bits = [[350, 800, -8, colors.blush], [470, 930, 6, colors.chalk], [610, 790, 4, colors.blush], [690, 940, -5, colors.chalk]];
  const fly = (k, tx, ty) => { const f = go(k), e = easeOut(f); return [890 + (tx - 890) * e, 1000 + (ty - 1000) * e - Math.sin(f * Math.PI) * 240, f]; };
  const m = fly(4, 560, 880);
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="fire"><stop offset="0" stopColor="#FF9A4D" stopOpacity={0.55}/><stop offset="1" stopColor="#FF9A4D" stopOpacity={0}/></radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    {range(7).map(i => <rect x={0} y={460 + i * 90} width={1080} height={4} fill="#000" opacity={0.08}/>)}
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <circle cx={150} cy={1100} r={560 * fire} fill="url(#fire)"/>
    <rect x={130} y={0} width={44} height={830} fill="#2E2A28"/>
    <rect x={56} y={830} width={192} height={260} rx={14} fill="#3B3532"/>
    <rect x={88} y={900} width={128} height={110} rx={10} fill="#1F1A18"/>
    <path d={'M 100 1004 Q 120 ' + (948 - 14 * fire) + ' 140 1000 Q 156 ' + (930 - 20 * fire) + ' 176 1000 Q 192 ' + (950 - 12 * fire) + ' 206 1004 Z'} fill="#FF9A4D"/>
    <rect x={70} y={1090} width={40} height={30} fill="#3B3532"/>
    <rect x={194} y={1090} width={40} height={30} fill="#3B3532"/>
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={260} y={1080} width={800} height={28} rx={6} fill="#9A6644"/>
    <rect x={284} y={1108} width={752} height={200} fill="#6A4029"/>
    <rect x={300} y={1124} width={720} height={168} rx={8} fill="none" stroke="#4E2E1D" strokeWidth={5}/>
    <path d="M 300 720 L 520 740 L 520 1060 L 300 1044 Z" fill={colors.chalk} shadow="0 14 24 rgba(0,0,0,0.35)"/>
    <path d="M 520 740 L 740 720 L 740 1044 L 520 1060 Z" fill={colors.chalk}/>
    <rect x={516} y={740} width={8} height={320} fill="#C9B9A2"/>
    <path d={'M 550 870 L ' + (550 + 170 * brush) + ' 860'} stroke="#FFFFFF" strokeWidth={34} strokeLinecap="round" opacity={0.55 * clamp(brush * 4)}/>
    {bits.map(([x, y, r, c], k) => { const [px, py, f] = fly(k, x, y); return <g transform={'translate(' + px + ' ' + py + ') rotate(' + (r + (1 - f) * 120) + ')'} opacity={f > 0 ? 1 : 0}>
      <rect x={-48} y={-38} width={96} height={76} rx={4} fill={c} shadow="0 4 8 rgba(0,0,0,0.25)"/>
      <path d="M -32 -14 H 30 M -32 4 H 20 M -32 22 H 26" stroke={colors.cardInk} strokeWidth={5} opacity={0.4}/>
    </g>; })}
    <g transform={'translate(' + m[0] + ' ' + (m[1] + 4 * pat) + ') rotate(' + (180 * (1 - flip) + 3) + ') scale(1 ' + (1 - 0.08 * pat) + ')'} opacity={m[2] > 0 ? 1 : 0}>
      <rect x={-56} y={-44} width={112} height={88} rx={4} fill={colors.accent} shadow="0 4 8 rgba(0,0,0,0.25)"/>
      <circle cx={18} cy={6} r={26} fill="none" stroke="#7A4E34" strokeWidth={7} opacity={0.6}/>
      <path d="M -40 -20 H 20 M -40 -2 H 0" stroke={colors.cardInk} strokeWidth={5} opacity={0.45}/>
    </g>
    <g transform={'translate(890 1000) rotate(' + (-62 * tip) + ' 90 80)'}>
      <rect x={-90} y={-20} width={180} height={100} rx={8} fill="#C49A6C"/>
      <rect x={-96} y={-34} width={192} height={24} rx={6} fill="#A87F55"/>
    </g>
    <g transform="translate(886 1050)">
      <rect x={-86} y={-24} width={172} height={50} rx={6} fill={colors.chalk}/>
      <text x={0} y={12} textAnchor="middle" fontSize={34} fontWeight={900} fill={colors.cardInk}>THIS WEEK</text>
      <Tape x={-80} y={-22} r={-30}/>
    </g>
    <g transform={'translate(' + (560 + 170 * brush) + ' 852) rotate(' + (-30 + 10 * brush) + ')'}>
      <rect x={-12} y={0} width={24} height={50} fill="#EADFC0"/>
      <rect x={-8} y={50} width={16} height={230} rx={6} fill={colors.accent}/>
    </g>
    <g transform={'translate(640 1300) scale(0.84) rotate(' + (6 * pat) + ')'}>
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <circle cx={-16} cy={-106} r={9} fill="#2A1E18"/>
      <circle cx={28} cy={-106} r={9} fill="#2A1E18"/>
      <ellipse cx={-48} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={54} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <path d="M -2 -82 Q 8 -70 18 -82" fill="none" stroke="#2A1E18" strokeWidth={5} strokeLinecap="round"/>
      <path d="M -44 -66 L 0 -40 L 44 -66" fill="none" stroke={colors.accent} strokeWidth={6}/>
      <rect x={-17} y={-42} width={34} height={28} rx={5} fill={colors.chalk}/>
    </g>
  </svg>;
}`,
    },
    {
      label: 'DONE, NEXT, STUCK',
      line: 'Then it turns them into three parts: done, next, and stuck.',
      place: 'a small office tucked under the stairs',
      cut: 'whip',
      source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const { i, p } = shot(['done', 'next', 'stuck']);
  const on = k => (i > k + 1 ? 1 : i === k + 1 ? p : 0);
  const lamps = [['DONE', 940, '#FFE7B0'], ['NEXT', 790, colors.blush], ['STUCK', 640, colors.accent]];
  const point = easeOut(clamp((time - at('stuck')) / 0.4));
  const glow = 0.9 + 0.1 * Math.sin(time * 2);
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.5}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
      <radialGradient id="lit"><stop offset="0" stopColor="#FFFFFF" stopOpacity={0.6}/><stop offset="1" stopColor="#FFFFFF" stopOpacity={0}/></radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <polygon points="0,0 1080,0 1080,640 420,418 0,418" fill={colors.floor}/>
    {range(9).map(k => <rect x={420 + k * 74} y={418 + k * 25} width={74} height={22} fill="#7A4E34"/>)}
    <line x1={420} y1={418} x2={1080} y2={640} stroke="#4E2E1D" strokeWidth={14}/>
    <circle cx={220} cy={900} r={460 * glow} fill="url(#glow)"/>
    {range(12).map(k => <polygon points={(540 + (k * 200 - 660) * 0.45) + ',1320 ' + (540 + (k * 200 - 460) * 0.45) + ',1320 ' + (k * 200 - 460) + ',1920 ' + (k * 200 - 660) + ',1920'} fill={k % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={40} y={1000} width={360} height={24} rx={6} fill="#9A6644"/>
    <rect x={60} y={1024} width={22} height={282} fill="#6A4029"/>
    <rect x={358} y={1024} width={22} height={282} fill="#6A4029"/>
    <rect x={70} y={960} width={190} height={40} rx={6} fill={colors.rose}/>
    <rect x={70} y={952} width={190} height={10} rx={4} fill={colors.chalk}/>
    <ellipse cx={320} cy={1000} rx={44} ry={8} fill="#3B2418"/>
    <rect x={315} y={860} width={10} height={140} fill="#3B2418"/>
    <polygon points="250,876 390,876 360,800 280,800" fill={colors.accent}/>
    <rect x={526} y={1020} width={28} height={286} fill="#9A6644"/>
    <ellipse cx={540} cy={1306} rx={100} ry={14} fill="#6A4029"/>
    <rect x={460} y={560} width={160} height={460} rx={24} fill="#C49A6C" shadow="0 20 30 rgba(0,0,0,0.4)"/>
    <rect x={476} y={576} width={128} height={428} rx={18} fill="#9A6644"/>
    {lamps.map(([name, y, c], k) => <g>
      <circle cx={540} cy={y} r={58} fill="#4E2E1D"/>
      <circle cx={540} cy={y} r={50} fill={on(k) > 0 ? c : '#5A4636'} opacity={0.4 + 0.6 * on(k)}/>
      <circle cx={540} cy={y} r={120} fill="url(#lit)" opacity={on(k)}/>
      <path d={'M 600 ' + y + ' H 680'} stroke={colors.chalk} strokeWidth={4} strokeDasharray="8 8" opacity={on(k)}/>
      <g transform={'translate(780 ' + (y - (1 - easeOutBack(on(k))) * 120) + ') rotate(' + (k % 2 ? 4 : -4) + ')'} opacity={clamp(on(k) * 3)}>
        <path d={torn(-100, -40, 200, 80, k + 2)} fill={k === 2 ? colors.accent : colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
        <text x={0} y={16} textAnchor="middle" fontSize={46} fontWeight={900} fill={colors.cardInk}>{name}</text>
        <Tape x={0} y={-40} r={k % 2 ? 6 : -6}/>
      </g>
    </g>)}
    <g transform="translate(900 1300) scale(0.84)">
      <ellipse cx={-70} cy={-140} rx={22} ry={60} fill={colors.rose} transform={'rotate(' + (-30 - 100 * point) + ' -70 -100)'}/>
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <circle cx={-30} cy={-110 - 8 * point} r={9} fill="#2A1E18"/>
      <circle cx={14} cy={-110 - 8 * point} r={9} fill="#2A1E18"/>
      <ellipse cx={-52} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={50} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <path d="M -14 -82 Q -4 -70 6 -82" fill="none" stroke="#2A1E18" strokeWidth={5} strokeLinecap="round"/>
      <path d="M -44 -66 L 0 -40 L 44 -66" fill="none" stroke={colors.accent} strokeWidth={6}/>
      <rect x={-17} y={-42} width={34} height={28} rx={5} fill={colors.chalk}/>
    </g>
  </svg>;
}`,
    },
    {
      label: 'RATED 18% BETTER',
      line: 'And get this, expert graders rated the AI-assisted writing 18% better, too.',
      place: 'a hallway doorframe marked with pencil height lines',
      cut: 'push',
      source: String.raw`export default function Scene({ time, colors }) {
  const Tape = ({ x, y, r }) => <rect x={x - 48} y={y - 18} width={96} height={36} fill="#EADFC0" opacity={0.85} transform={'rotate(' + r + ' ' + x + ' ' + y + ')'}/>;
  const rule = easeOut(clamp((time - at('graders')) / 0.8));
  const tagR = easeOutBack(clamp((time - at('graders') - 0.4) / 0.35));
  const up = spring(time - at('18%'));
  const tip = easeOutBack(clamp((time - at('better')) / 0.35));
  const mark = 1000 - 150 * clamp(up, 0, 1.2);
  const glow = 0.9 + 0.1 * Math.sin(time * 1.8);
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.55}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <rect x={0} y={1010} width={1080} height={300} fill={colors.floor} opacity={0.6}/>
    <rect x={0} y={1000} width={1080} height={14} fill="#7A4E34"/>
    <circle cx={190} cy={600} r={420 * glow} fill="url(#glow)"/>
    <rect x={170} y={560} width={40} height={70} rx={8} fill="#7A4E34"/>
    <path d="M 140 560 Q 190 480 240 560 Z" fill={colors.accent}/>
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    {range(6).map(i => <rect x={800 + i * 46} y={1306 - (i + 1) * 64} width={280 - i * 46} height={20} fill="#8A5A3B"/>)}
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={430} y={490} width={260} height={816} fill="#2A1E18" opacity={0.45}/>
    <rect x={380} y={440} width={360} height={50} fill="#EDE3D2"/>
    <rect x={380} y={440} width={50} height={866} fill="#EDE3D2"/>
    <rect x={690} y={440} width={50} height={866} fill="#EDE3D2"/>
    {[1180, 1120, 1060, 1000].map(y => <line x1={384} y1={y} x2={426} y2={y} stroke={colors.cardInk} strokeWidth={4} opacity={0.55}/>)}
    {range(8).map(k => <g opacity={clamp(rule * 8 - k)}>
      <rect x={700} y={1206 - k * 96} width={30} height={92} fill={colors.accent}/>
      {range(4).map(j => <line x1={700} y1={1206 - k * 96 + j * 23} x2={714} y2={1206 - k * 96 + j * 23} stroke={colors.cardInk} strokeWidth={3}/>)}
    </g>)}
    <g transform="translate(220 1000) rotate(-3)">
      <path d={torn(-120, -38, 240, 76, 2)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
      <text x={0} y={14} textAnchor="middle" fontSize={40} fontWeight={900} fill={colors.cardInk}>WITHOUT AI</text>
      <path d="M 120 0 L 162 0" stroke={colors.cardInk} strokeWidth={4}/>
    </g>
    <line x1={380} y1={mark} x2={430} y2={mark} stroke={colors.accent} strokeWidth={10} strokeLinecap="round" opacity={up > 0 ? 1 : 0}/>
    <g transform={'translate(220 ' + (mark - 4) + ') rotate(' + (3 - (1 - tip) * 6) + ')'} opacity={clamp(up * 4)}>
      <path d={torn(-140, -46, 280, 92, 6)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
      <text x={0} y={17} textAnchor="middle" fontSize={50} fontWeight={900} fill={colors.cardInk}>18% BETTER</text>
      <Tape x={-120} y={-44} r={-30}/>
    </g>
    <g transform={'translate(870 650) rotate(' + (4 - (1 - tagR) * 8) + ') scale(' + (0.6 + 0.4 * tagR) + ')'} opacity={clamp(tagR * 3)}>
      <path d={torn(-110, -70, 220, 140, 8)} fill={colors.chalk} shadow="0 8 14 rgba(0,0,0,0.35)"/>
      <text x={0} y={-8} textAnchor="middle" fontSize={40} fontWeight={900} fill={colors.cardInk}>EXPERT</text>
      <text x={0} y={42} textAnchor="middle" fontSize={40} fontWeight={900} fill={colors.cardInk}>GRADERS</text>
      <Tape x={0} y={-70} r={5}/>
    </g>
    <g transform={'translate(560 ' + (1300 - 24 * tip) + ') scale(0.9 ' + 0.9 * (1 + 0.06 * tip) + ')'}>
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <circle cx={-34} cy={-108} r={9} fill="#2A1E18"/>
      <circle cx={8} cy={-108} r={9} fill="#2A1E18"/>
      <ellipse cx={-56} cy={-80} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={46} cy={-80} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <path d={tip > 0.5 ? 'M -28 -88 Q -12 -64 4 -88 Z' : 'M -22 -84 Q -12 -74 -2 -84'} fill={tip > 0.5 ? '#2A1E18' : 'none'} stroke="#2A1E18" strokeWidth={5} strokeLinecap="round"/>
      <path d="M -44 -66 L 0 -40 L 44 -66" fill="none" stroke={colors.accent} strokeWidth={6}/>
      <rect x={-17} y={-42} width={34} height={28} rx={5} fill={colors.chalk}/>
    </g>
  </svg>;
}`,
    },
    {
      label: 'ONLY WHAT YOU JOT',
      line: 'But AI only knows your notes.',
      place: 'a pantry shelf lit by one hanging bulb',
      cut: 'cut',
      source: String.raw`export default function Scene({ time, colors }) {
  const s0 = easeOut(clamp((time - at('only')) / 0.6));
  const swing = 14 * s0 + 3 * Math.sin(time * 1.8) * (1 - s0);
  const rustle = k => Math.sin(time * 9 + k) * 6 * clamp(1 - Math.abs(time - at('notes') - 0.3) / 0.4);
  const jot = clamp((time - at('jot')) / 0.6);
  const toss = clamp((time - at('down')) / 0.6), land = time - at('down') - 0.6;
  const bounce = land > 0 ? 18 * Math.exp(-5 * land) * Math.abs(Math.sin(9 * land)) : 0;
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const bx = 300 + 210 * toss, by = 1150 - 280 * toss - Math.sin(toss * Math.PI) * 220 - bounce;
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.6}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    {range(10).map(k => <rect x={k * 112} y={420} width={104} height={900} fill="#000" opacity={0.05}/>)}
    <g transform={'rotate(' + swing + ' 700 0)'}>
      <circle cx={700} cy={640} r={520} fill="url(#glow)"/>
      <line x1={700} y1={0} x2={700} y2={600} stroke="#3B2418" strokeWidth={5}/>
      <rect x={686} y={590} width={28} height={26} fill="#7A6A5A"/>
      <circle cx={700} cy={640} r={30} fill="#FFE7B0"/>
    </g>
    {range(12).map(k => <polygon points={(540 + (k * 200 - 660) * 0.45) + ',1320 ' + (540 + (k * 200 - 460) * 0.45) + ',1320 ' + (k * 200 - 460) + ',1920 ' + (k * 200 - 660) + ',1920'} fill={k % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={40} y={1160} width={1000} height={20} fill="#8A5A3B"/>
    {range(6).map(k => <rect x={600 + k * 70} y={1080} width={56} height={80} rx={8} fill={[colors.rose, colors.blush, colors.accent][k % 3]} opacity={0.8}/>)}
    <rect x={40} y={950} width={1000} height={24} fill="#9A6644"/>
    <rect x={60} y={974} width={18} height={186} fill="#6A4029"/>
    <rect x={1002} y={974} width={18} height={186} fill="#6A4029"/>
    {days.map((d, k) => { const x = 150 + k * 180; return <g>
      <rect x={x - 62} y={760} width={124} height={190} rx={22} fill={colors.chalk} opacity={0.22} stroke={colors.chalk} strokeOpacity={0.6} strokeWidth={5}/>
      <rect x={x - 54} y={738} width={108} height={26} rx={6} fill="#7A4E34"/>
      {k === 2 ? null : range(3).map(j => <rect x={x - 44 + j * 26} y={880 - j * 18} width={58} height={44} rx={4} fill={j % 2 ? colors.blush : colors.chalk} transform={'rotate(' + (j * 12 - 10 + rustle(k + j)) + ' ' + (x - 15 + j * 26) + ' ' + (902 - j * 18) + ')'}/>)}
      <rect x={x - 44} y={790} width={88} height={46} rx={6} fill={k === 2 && s0 > 0.5 ? colors.accent : colors.chalk}/>
      <text x={x} y={826} textAnchor="middle" fontSize={34} fontWeight={900} fill={colors.cardInk}>{d}</text>
    </g>; })}
    <g transform={'translate(' + bx + ' ' + by + ') rotate(' + 300 * toss + ')'} opacity={toss > 0 && toss < 1 || land > 0 ? 1 : 0}>
      <rect x={-26} y={-20} width={52} height={40} rx={4} fill={colors.accent}/>
    </g>
    <g transform="translate(230 1300) scale(0.86)">
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <circle cx={-4 + 18 * jot} cy={-104 + 10 * jot} r={9} fill="#2A1E18"/>
      <circle cx={38 + 18 * jot} cy={-104 + 10 * jot} r={9} fill="#2A1E18"/>
      <ellipse cx={-40} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={62} cy={-78} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <path d="M 8 -82 Q 18 -70 28 -82" fill="none" stroke="#2A1E18" strokeWidth={5} strokeLinecap="round"/>
      <path d="M -44 -66 L 0 -40 L 44 -66" fill="none" stroke={colors.accent} strokeWidth={6}/>
      <rect x={-17} y={-42} width={34} height={28} rx={5} fill={colors.chalk}/>
      <g transform="translate(96 -60) rotate(8)">
        <rect x={-34} y={-46} width={68} height={92} rx={6} fill={colors.chalk}/>
        <rect x={-34} y={-46} width={68} height={12} fill={colors.accent}/>
        <path d="M -22 -16 H 22 M -22 4 H 16 M -22 24 H 20" stroke={colors.cardInk} strokeWidth={5} strokeDasharray="44" strokeDashoffset={44 * (1 - jot)} opacity={0.6}/>
      </g>
      <rect x={70} y={-10} width={10} height={70} rx={4} fill={colors.cardInk} transform={'rotate(' + (20 + 25 * Math.sin(time * 14) * jot * (1 - toss)) + ' 75 50)'}/>
    </g>
  </svg>;
}`,
    },
    {
      label: 'ONLY WHAT YOU JOT',
      line: 'So jot things down as you go.',
      hold: true,
    },
    {
      label: 'READY TO SHARE',
      line: 'Which means one prompt turns a week of notes into an update that’s ready to share.',
      place: 'an attic study at night, a desk under the roof window',
      cut: 'dissolve',
      source: String.raw`export default function Scene({ time, colors }) {
  const card = spring(time - at('prompt'));
  const jar = k => spring(time - at('week') - k * 0.12);
  const page = spring(time - at('update'));
  const line = easeInOut(clamp((time - at('share')) / 0.5));
  const cheer = Math.sin(clamp((time - at('share')) / 0.5) * Math.PI) * 40;
  const heads = ['DONE', 'NEXT', 'STUCK'];
  return <svg>
    <defs>
      <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.floor}/><stop offset="0.6" stopColor={colors.wall}/></linearGradient>
      <radialGradient id="glow"><stop offset="0" stopColor="#FFD08A" stopOpacity={0.55}/><stop offset="1" stopColor="#FFD08A" stopOpacity={0}/></radialGradient>
    </defs>
    <rect x={0} y={0} width={1080} height={1920} fill="url(#w)"/>
    <polygon points="0,0 1080,0 1080,430 0,640" fill={colors.floor}/>
    {range(5).map(i => <line x1={i * 270} y1={0} x2={i * 270} y2={640 - i * 52} stroke="#4F3122" strokeWidth={14} opacity={0.5}/>)}
    <polygon points="70,500 330,450 330,580 70,630" fill="#5A3826"/>
    <polygon points="88,510 312,467 312,566 88,612" fill="#27305C"/>
    <circle cx={250} cy={516} r={26} fill="#F8EBC4"/>
    <circle cx={760} cy={880} r={600} fill="url(#glow)"/>
    {range(12).map(i => <polygon points={(540 + (i * 200 - 660) * 0.45) + ',1320 ' + (540 + (i * 200 - 460) * 0.45) + ',1320 ' + (i * 200 - 460) + ',1920 ' + (i * 200 - 660) + ',1920'} fill={i % 2 ? '#6F4630' : '#7D5137'} stroke="#4F3122" strokeWidth={3}/>)}
    <rect x={0} y={1306} width={1080} height={16} fill={colors.floor}/>
    <rect x={40} y={1090} width={1000} height={26} rx={6} fill="#9A6644"/>
    <rect x={64} y={1116} width={952} height={194} fill="#6A4029"/>
    <path d="M 92 1138 h 430 v 150 h -430 Z M 558 1138 h 430 v 150 h -430 Z" fill="none" stroke="#4E2E1D" strokeWidth={5}/>
    <ellipse cx={960} cy={1090} rx={60} ry={11} fill="#3B2418"/>
    <rect x={954} y={940} width={12} height={150} fill="#3B2418"/>
    <polygon points="880,960 1040,960 1006,870 914,870" fill={colors.accent}/>
    <ellipse cx={960} cy={962} rx={58} ry={10} fill="#FFE7B0"/>
    <g transform={'translate(210 ' + (1030 - (1 - card) * 700) + ') rotate(' + (-5 + (1 - card) * 10) + ')'} opacity={time > at('prompt') - 0.1 ? 1 : 0}>
      <rect x={-110} y={-60} width={220} height={120} rx={8} fill={colors.chalk} shadow="0 10 16 rgba(0,0,0,0.35)"/>
      <rect x={-110} y={-60} width={220} height={14} fill={colors.accent}/>
      <text x={0} y={16} textAnchor="middle" fontSize={40} fontWeight={900} fill={colors.cardInk}>PROMPT</text>
    </g>
    {range(5).map(k => <g transform={'translate(' + (660 + k * 62) + ' ' + (1090 - (1 - jar(k)) * 800) + ')'} opacity={time > at('week') + k * 0.12 - 0.15 ? 1 : 0}>
      <rect x={-26} y={-84} width={52} height={84} rx={12} fill={colors.chalk} opacity={0.3} stroke={colors.chalk} strokeWidth={4}/>
      <rect x={-22} y={-96} width={44} height={14} rx={4} fill="#7A4E34"/>
      <rect x={-16} y={-34} width={32} height={26} rx={3} fill={k % 2 ? colors.blush : colors.accent}/>
    </g>)}
    <g transform={'translate(540 ' + (1090 - cheer) + ') scale(0.82)'}>
      <path d="M -84 0 C -96 -118 -52 -196 0 -196 C 52 -196 96 -118 84 0 Z" fill={colors.rose}/>
      <path d="M -68 -146 C -64 -228 64 -228 68 -146 Z" fill={colors.accent}/>
      <rect x={-74} y={-158} width={148} height={28} rx={14} fill={colors.chalk}/>
      <circle cx={0} cy={-222} r={18} fill={colors.chalk}/>
      <circle cx={-20} cy={-110} r={9} fill="#2A1E18"/>
      <circle cx={24} cy={-110} r={9} fill="#2A1E18"/>
      <ellipse cx={-48} cy={-80} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <ellipse cx={54} cy={-80} rx={14} ry={8} fill={colors.accent} opacity={0.5}/>
      <path d="M -10 -88 Q 2 -66 14 -88 Z" fill="#2A1E18"/>
      <path d="M -44 -66 L 0 -40 L 44 -66" fill="none" stroke={colors.accent} strokeWidth={6}/>
      <rect x={-17} y={-42} width={34} height={28} rx={5} fill={colors.chalk}/>
      <ellipse cx={-96} cy={-150 - 120 * page} rx={20} ry={44} fill={colors.rose}/>
      <ellipse cx={96} cy={-150 - 120 * page} rx={20} ry={44} fill={colors.rose}/>
    </g>
    <g transform={'translate(540 ' + (1180 - 450 * page - cheer) + ') rotate(' + (2 - 2 * page) + ')'} opacity={time > at('update') - 0.05 ? 1 : 0}>
      <rect x={-170} y={-210} width={340} height={420} rx={10} fill={colors.chalk} shadow="0 14 24 rgba(0,0,0,0.4)"/>
      <text x={0} y={-140} textAnchor="middle" fontSize={40} fontWeight={900} fill={colors.cardInk}>WEEKLY UPDATE</text>
      <line x1={-140} y1={-120} x2={-140 + 280 * line} y2={-120} stroke={colors.accent} strokeWidth={10} strokeLinecap="round"/>
      {heads.map((h, k) => <g>
        <rect x={-162} y={-82 + k * 100} width={12} height={30} rx={4} fill={k === 2 ? colors.accent : colors.rose}/>
        <text x={-140} y={-56 + k * 100} fontSize={36} fontWeight={900} fill={colors.cardInk}>{h}</text>
        <path d={'M -140 ' + (-30 + k * 100) + ' H 120 M -140 ' + (-10 + k * 100) + ' H 70'} stroke={colors.cardInk} strokeWidth={6} strokeLinecap="round" opacity={0.35}/>
      </g>)}
    </g>
  </svg>;
}`,
    },
  ],
};
