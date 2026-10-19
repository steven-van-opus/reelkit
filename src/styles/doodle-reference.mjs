// Deadpan Doodle's reference video (index.mjs `reference`): "Why you stay up too late", a deadpan stick-figure
// explainer of revenge bedtime procrastination in eight drawings on one white page, at the detail every video in the
// style should have: the page and its wobbly ground stroke, this style's own stick figures (the one who is "you" in
// the red-pen scarf), hand-printed labels with curved arrows, the red pen circling, crossing out and filling the one
// thing that matters, a crude chart and a quick push-in on the punchline. Its skeleton is the format's: the name for
// the thing, the official version, the honest one, a crude chart, the escalation, the fix and a dry callback. Its
// facts are plain ones: "bedtime procrastination" is failing to go to bed when you meant to with nothing stopping you
// (Kroese et al., Frontiers in Psychology, 2014), the "revenge" name spread online in 2020, and an hour a night for a
// week is seven hours, a whole night's sleep. A new Deadpan Doodle video remakes it. Each scene
// names its place (the drawing it is set in, a new one per scene), which a new video never copies (guide.mjs
// lookGuide). Bump the id when the video changes (a place is text only: it changes no frame).
//
// Every scene's code stands alone, so each spells out the same small kit (DOODLE_KIT, written into it below): J, the
// line boil (a 2 px wobble, redrawn three times a second: under the 3 Hz flicker limit); on(t), a quick 0.25 s pop from the moment t; Fig, a stick figure standing with its feet at (x, y) (l and
// r its hands, relative to the shoulder at (0, -170) before scale s; c the colour of its scarf, which marks "you";
// wide its eyes); Arrow, a curved marker arrow from a through q to b that draws itself (p, 0–1); and Ring, a hand-drawn
// pen loop around (x, y) that draws itself. PAGE paints the white page (BLANK) and its ground stroke (GROUND).

/** The kit every doodle scene starts from (see above), indented for a scene's body. */
export const DOODLE_KIT = String.raw`const J = (v, k) => v + Math.sin(k * 12.9898 + Math.floor(time * 3) * 78.233) * 2;
  const on = t => easeOut(clamp((time - t) / 0.25));
  const Fig = ({ x, y, s, l, r, c, wide }) => <g transform={'translate(' + x + ' ' + y + ') scale(' + s + ')'} fill="none" stroke={colors.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
    <polyline points={J(-34, x) + ',0 0,-96 ' + J(34, x + 1) + ',0'}/>
    <line x1={0} y1={-96} x2={J(0, x + 2)} y2={-196}/>
    <polyline points={J(l[0], x + 3) + ',' + J(l[1], x + 4) + ' 0,-170 ' + J(r[0], x + 5) + ',' + J(r[1], x + 6)}/>
    <circle cx={J(0, x + 7)} cy={-244} r={48} fill={colors.wall}/>
    <circle cx={-16} cy={-250} r={wide ? 9 : 5} fill={colors.ink} stroke="none"/>
    <circle cx={16} cy={-250} r={wide ? 9 : 5} fill={colors.ink} stroke="none"/>
    <line x1={-12} y1={-220} x2={12} y2={-220}/>
    {c ? <path d="M -26 -192 L 26 -192 M 16 -192 L 24 -146" stroke={c} strokeWidth={12}/> : null}
  </g>;
  const Arrow = ({ a, q, b, p, c }) => {
    const n = Math.sqrt((b[0] - q[0]) ** 2 + (b[1] - q[1]) ** 2), u = (b[0] - q[0]) / n, v = (b[1] - q[1]) / n;
    const len = n + Math.sqrt((q[0] - a[0]) ** 2 + (q[1] - a[1]) ** 2);
    return <g fill="none" stroke={c} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={p > 0 ? 1 : 0}>
      <path d={'M ' + a[0] + ' ' + a[1] + ' Q ' + q[0] + ' ' + q[1] + ' ' + b[0] + ' ' + b[1]} strokeDasharray={len} strokeDashoffset={len * (1 - p)}/>
      <polyline points={(b[0] - 26 * u + 16 * v) + ',' + (b[1] - 26 * v - 16 * u) + ' ' + b[0] + ',' + b[1] + ' ' + (b[0] - 26 * u - 16 * v) + ',' + (b[1] - 26 * v + 16 * u)} opacity={p > 0.9 ? 1 : 0}/>
    </g>;
  };
  const Ring = ({ x, y, w, h, p, c }) => <path d={'M ' + (x - w) + ' ' + (y + h * 0.3) + ' C ' + (x - w) + ' ' + (y - h * 1.3) + ' ' + (x + w * 1.1) + ' ' + (y - h * 1.4) + ' ' + (x + w) + ' ' + y + ' C ' + (x + w * 0.95) + ' ' + (y + h * 1.4) + ' ' + (x - w * 1.1) + ' ' + (y + h * 1.3) + ' ' + (x - w * 0.85) + ' ' + (y - h * 0.5)} fill="none" stroke={c} strokeWidth={8} strokeLinecap="round" strokeDasharray={4.4 * (w + h)} strokeDashoffset={4.4 * (w + h) * (1 - p)} opacity={p > 0 ? 1 : 0}/>;`;

/** The white page, edge to edge: on its own, the page for a chart drawn on its own axes. */
export const DOODLE_BLANK = String.raw`<rect x={0} y={0} width={1080} height={1920} fill={colors.wall}/>`;

/** The page's one wobbly ground stroke near y 1150 (inside a push-in, so what stands on it stays standing on it). */
export const DOODLE_GROUND = String.raw`<polyline points={range(10).map(i => (60 + i * 106) + ',' + J(1150 + (i % 3) * 4, i + 50)).join(' ')} fill="none" stroke={colors.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"/>`;

/** The page and its ground stroke. */
export const DOODLE_PAGE = `${DOODLE_BLANK}
    ${DOODLE_GROUND}`;

// 1. The name for it: the figure sitting up in bed, lit by a phone, the premise hand-printed from the first frame (the
// cover reads) and the term landing in red pen with an arrow to it.
const NAME = String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const t1 = at('revenge'), t2 = at('procrastination'), bags = clamp((time - at('exhausted')) / 0.25);
  const glow = 0.55 + 0.25 * Math.sin(time * 2.4);
  return <svg>
    ${DOODLE_PAGE}
    <g fill="none" stroke={colors.ink} strokeWidth={6} strokeLinecap="round">
      <path d={'M 860 610 C 770 620 770 760 870 770 C 820 740 815 640 860 610'}/>
      <path d="M 700 640 L 730 640 M 715 625 L 715 655 M 930 840 L 956 840 M 943 827 L 943 853 M 620 560 L 644 560 M 632 548 L 632 572" strokeWidth={4}/>
    </g>
    <g fill={colors.wall} stroke={colors.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
      <polyline points={'190,1150 ' + J(190, 1) + ',830 240,830 240,1150'} fill="none"/>
      <polyline points={'880,1150 880,' + J(940, 2) + ' 924,940 924,1150'} fill="none"/>
      <line x1={260} y1={1080} x2={260} y2={1150}/>
      <line x1={850} y1={1080} x2={850} y2={1150}/>
      <ellipse cx={290} cy={950} rx={56} ry={30}/>
    </g>
    <Fig x={340} y={1050} s={1} l={[56, -96]} r={[80, -120]} c={colors.accent} wide={true}/>
    <path d="M 316 814 Q 324 822 332 814 M 348 814 Q 356 822 364 814" fill="none" stroke={colors.ink} strokeWidth={4} strokeLinecap="round" opacity={bags}/>
    <rect x={190} y={1010} width={730} height={70} fill={colors.wall} stroke={colors.ink} strokeWidth={7}/>
    <path d={'M 296 1012 C 300 950 380 935 440 ' + J(945, 3) + ' C 560 960 700 955 790 968 C 840 975 880 995 900 1012 Z'} fill={colors.wall} stroke={colors.ink} strokeWidth={7} strokeLinejoin="round"/>
    <rect x={404} y={870} width={48} height={84} rx={9} fill={colors.rose} stroke={colors.ink} strokeWidth={6}/>
    <path d="M 468 880 L 506 856 M 472 912 L 518 912 M 468 944 L 506 968" fill="none" stroke={colors.rose} strokeWidth={5} strokeLinecap="round" opacity={glow}/>
    <text x={540} y={316} textAnchor="middle" fontSize={48} fontWeight={800} width={860} maxLines={1} fill={colors.ink}>THERE'S A NAME FOR THIS:</text>
    <text x={540} y={410} textAnchor="middle" fontSize={72} fontWeight={900} width={860} maxLines={1} fill={colors.accent} opacity={clamp((time - t1) / 0.15)}>REVENGE BEDTIME</text>
    <text x={540} y={506} textAnchor="middle" fontSize={72} fontWeight={900} width={860} maxLines={1} fill={colors.accent} opacity={clamp((time - t2) / 0.15)}>PROCRASTINATION</text>
    <Arrow a={[250, 545]} q={[190, 660]} b={[282, 772]} p={easeOut(clamp((time - t2 - 0.1) / 0.3))} c={colors.accent}/>
  </svg>;
}`;

// 2. The official version: the figure on three strings, pulled by its boss, its inbox and its commute.
const STRINGS = String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const tb = at('boss'), ti = at('inbox'), tc = at('commute');
  const ub = on(tb), uc = on(tc), line = easeOut(clamp((time - at('nine')) / 0.35));
  const S = ({ a, b, t }) => { const p = easeOut(clamp((time - t - 0.15) / 0.3)); return <line x1={a[0]} y1={a[1]} x2={a[0] + (b[0] - a[0]) * p} y2={a[1] + (b[1] - a[1]) * p} stroke={colors.ink} strokeWidth={3} opacity={p > 0 ? 0.8 : 0}/>; };
  const Blob = ({ x, y, t, label, children }) => <g transform={'translate(' + x + ' ' + y + ') scale(' + (0.7 + 0.3 * on(t)) + ')'} opacity={time < t ? 0 : 1}>
    <Ring x={0} y={0} w={125} h={100} p={on(t)} c={colors.ink}/>
    {children}
    <text x={0} y={58} textAnchor="middle" fontSize={36} fontWeight={800} fill={colors.ink}>{label}</text>
  </g>;
  return <svg>
    ${DOODLE_PAGE}
    <text x={90} y={395} fontSize={72} fontWeight={900} fill={colors.ink}>9 TO 6</text>
    <path d="M 86 420 C 180 412 280 426 372 414" fill="none" stroke={colors.accent} strokeWidth={8} strokeLinecap="round" strokeDasharray={300} strokeDashoffset={300 * (1 - line)}/>
    <S a={[250, 692]} b={[432, 802]} t={tb}/>
    <S a={[540, 602]} b={[540, 800]} t={ti}/>
    <S a={[830, 692]} b={[648, 802]} t={tc}/>
    <Blob x={235} y={590} t={tb} label="BOSS">
      <polygon points="-12,-82 12,-82 6,-66 -6,-66" fill={colors.rose} stroke={colors.ink} strokeWidth={4}/>
      <polygon points="-6,-66 6,-66 16,0 0,18 -16,0" fill={colors.rose} stroke={colors.ink} strokeWidth={4} strokeLinejoin="round"/>
    </Blob>
    <Blob x={540} y={500} t={ti} label="INBOX">
      <rect x={-62} y={-72} width={124} height={74} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
      <polyline points="-62,-72 0,-30 62,-72" fill="none" stroke={colors.ink} strokeWidth={6} strokeLinejoin="round"/>
      <circle cx={64} cy={-74} r={30} fill={colors.accent}/>
      <text x={64} y={-62} textAnchor="middle" fontSize={34} fontWeight={900} fill={colors.wall}>99</text>
    </Blob>
    <Blob x={845} y={590} t={tc} label="COMMUTE">
      <rect x={-58} y={-76} width={116} height={64} rx={10} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
      {[-44, -8, 28].map(x => <rect x={x} y={-62} width={22} height={20} fill="none" stroke={colors.ink} strokeWidth={4}/>)}
      <circle cx={-30} cy={-10} r={12} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
      <circle cx={30} cy={-10} r={12} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
    </Blob>
    <Fig x={540} y={1150} s={1.2} l={[-30 - 60 * ub, -80 - 210 * ub]} r={[30 + 60 * uc, -80 - 210 * uc]} c={colors.accent} wide={time > ti}/>
  </svg>;
}`;

// 3. The honest version: eleven on the clock, and the figure's thought bubble finally says "MINE."
const ELEVEN = String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const h = easeOut(clamp((time - at('eleven')) / 0.5)), tb = at('brain'), ty = at('yours');
  const H = (270 + 60 * h) * Math.PI / 180, M = 720 * h * Math.PI / 180, up = on(ty);
  return <svg>
    ${DOODLE_PAGE}
    <circle cx={J(300, 1)} cy={610} r={170} fill={colors.wall} stroke={colors.ink} strokeWidth={7}/>
    {range(12).map(i => <line x1={300 + 146 * Math.sin(i * 0.5236)} y1={610 - 146 * Math.cos(i * 0.5236)} x2={300 + (i % 3 ? 160 : 128) * Math.sin(i * 0.5236)} y2={610 - (i % 3 ? 160 : 128) * Math.cos(i * 0.5236)} stroke={colors.ink} strokeWidth={i % 3 ? 4 : 7} strokeLinecap="round"/>)}
    <line x1={300} y1={610} x2={300 + 80 * Math.sin(H)} y2={610 - 80 * Math.cos(H)} stroke={colors.ink} strokeWidth={12} strokeLinecap="round"/>
    <line x1={300} y1={610} x2={300 + 118 * Math.sin(M)} y2={610 - 118 * Math.cos(M)} stroke={colors.ink} strokeWidth={6} strokeLinecap="round"/>
    <circle cx={300} cy={610} r={10} fill={colors.ink}/>
    <text x={300} y={872} textAnchor="middle" fontSize={64} fontWeight={900} fill={colors.ink} opacity={clamp((time - at('eleven')) / 0.15)}>11 PM</text>
    <g opacity={time < tb ? 0 : 1} transform={'translate(740 560) scale(' + (0.7 + 0.3 * on(tb)) + ')'}>
      <path d={'M -170 0 C -170 -110 170 -110 170 0 C 170 ' + J(110, 2) + ' -170 110 -170 0 Z'} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
      <circle cx={-6} cy={130} r={16} fill={colors.wall} stroke={colors.ink} strokeWidth={5}/>
      <circle cx={12} cy={176} r={10} fill={colors.wall} stroke={colors.ink} strokeWidth={5}/>
      <text x={0} y={26} textAnchor="middle" fontSize={time < ty ? 64 : 76} fontWeight={900} fill={time < ty ? colors.ink : colors.accent}>{time < ty ? '. . .' : 'MINE.'}</text>
    </g>
    <Fig x={760} y={1150} s={1.25} l={[-50, -84]} r={[40 + 30 * up, -84 - 190 * up]} c={colors.accent} wide={time > at('finally')}/>
  </svg>;
}`;

// 4. A crude chart of staying up from 11 PM to 3 AM: fun now climbing, tomorrow you falling (the blue pen, dashed, so it
// differs by more than its colour), and a push-in on "anyway".
const TRADE = String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const pa = easeInOut(clamp((time - 0.2) / 1.4)), pb = easeInOut(clamp((time - at('tired')) / 1.1)), ta = at('anyway');
  const z = 1 + 0.12 * easeOut(clamp((time - ta) / 0.2));
  const A = [[170, 930], [285, 890], [400, 830], [510, 780], [620, 690], [740, 610], [860, 520]];
  const B = [[170, 560], [285, 610], [400, 650], [510, 720], [620, 790], [740, 900], [860, 970]];
  const tip = (P, p) => { const f = p * (P.length - 1), i = Math.min(P.length - 2, Math.floor(f)), k = f - i; return [P[i][0] + (P[i + 1][0] - P[i][0]) * k, P[i][1] + (P[i + 1][1] - P[i][1]) * k, i]; };
  const upto = (P, p) => { const e = tip(P, p); return P.slice(0, e[2] + 1).map(q => q[0] + ',' + J(q[1], q[0])).join(' ') + ' ' + e[0] + ',' + e[1]; };
  const a = tip(A, pa);
  return <svg>
    ${DOODLE_BLANK}
    <g transform={'translate(' + 540 * (1 - z) + ' ' + 780 * (1 - z) + ') scale(' + z + ')'}>
      <polyline points={J(150, 1) + ',420 150,1060 ' + J(920, 2) + ',' + J(1060, 3)} fill="none" stroke={colors.ink} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round"/>
      <text x={172} y={420} fontSize={40} fontWeight={800} fill={colors.ink}>HOW YOU FEEL</text>
      <text x={160} y={1115} fontSize={40} fontWeight={800} fill={colors.ink}>11 PM</text>
      <text x={900} y={1115} textAnchor="end" fontSize={40} fontWeight={800} fill={colors.ink}>3 AM</text>
      <polyline points={upto(B, pb)} fill="none" stroke={colors.rose} strokeWidth={9} strokeDasharray="22 18" strokeLinecap="round" strokeLinejoin="round" opacity={pb > 0 ? 1 : 0}/>
      <polyline points={upto(A, pa)} fill="none" stroke={colors.accent} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={a[0]} cy={a[1]} r={15} fill={colors.accent}/>
      <text x={884} y={478} textAnchor="end" fontSize={52} fontWeight={900} fill={colors.accent} opacity={clamp((pa - 0.9) * 10)}>FUN NOW</text>
      <text x={900} y={1032} textAnchor="end" fontSize={44} fontWeight={900} fill={colors.ink} opacity={clamp((pb - 0.9) * 10)}>TOMORROW YOU</text>
      <Ring x={758} y={460} w={164} h={46} p={easeOut(clamp((time - ta - 0.1) / 0.3))} c={colors.accent}/>
    </g>
  </svg>;
}`;

// 5. The escalation: a week of nights as seven moons, crossed out one by one, adding up to one whole night.
const MOONS = String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const t0 = at('hour'), t1 = at('week') + 0.4, ts = at('seven'), tw = at('whole');
  const X = i => easeOut(clamp((time - t0 - i * (t1 - t0) / 6) / 0.22));
  return <svg>
    ${DOODLE_PAGE}
    {range(7).map(i => { const x = 150 + i * 130, y = 470, p = X(i); return <g fill="none" strokeLinecap="round">
      <path d={'M ' + (x + 12) + ' ' + J(y - 46, i) + ' C ' + (x - 56) + ' ' + (y - 40) + ' ' + (x - 56) + ' ' + (y + 40) + ' ' + (x + 12) + ' ' + (y + 46) + ' C ' + (x - 20) + ' ' + (y + 28) + ' ' + (x - 20) + ' ' + (y - 28) + ' ' + (x + 12) + ' ' + (y - 46)} stroke={colors.ink} strokeWidth={6}/>
      <text x={x - 6} y={580} textAnchor="middle" fontSize={40} fontWeight={800} fill={colors.ink}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</text>
      <line x1={x - 44} y1={y - 44} x2={x - 44 + 88 * clamp(p * 2)} y2={y - 44 + 88 * clamp(p * 2)} stroke={colors.accent} strokeWidth={8} opacity={p > 0 ? 1 : 0}/>
      <line x1={x + 44} y1={y - 44} x2={x + 44 - 88 * clamp(p * 2 - 1)} y2={y - 44 + 88 * clamp(p * 2 - 1)} stroke={colors.accent} strokeWidth={8} opacity={p > 0.5 ? 1 : 0}/>
    </g>; })}
    <text x={255} y={790} textAnchor="middle" fontSize={80} fontWeight={900} fill={colors.ink} opacity={clamp((time - ts) / 0.15)}>7 HOURS</text>
    <text x={516} y={790} textAnchor="middle" fontSize={80} fontWeight={900} fill={colors.ink} opacity={clamp((time - tw) / 0.15)}>=</text>
    <text x={772} y={786} textAnchor="middle" fontSize={72} fontWeight={900} fill={colors.accent} opacity={clamp((time - tw) / 0.15)}>1 NIGHT</text>
    <Ring x={776} y={760} w={196} h={60} p={easeOut(clamp((time - at('gone')) / 0.3))} c={colors.accent}/>
    <Fig x={540} y={1150} s={1} l={[-36, -76]} r={[36, -76]} c={colors.accent}/>
    <path d="M 514 916 Q 522 924 530 916 M 550 916 Q 558 924 566 916" fill="none" stroke={colors.ink} strokeWidth={4} strokeLinecap="round"/>
  </svg>;
}`;

// 6. More escalation: slumped on a sofa, the battery draining, "NO." crossed out, the next episode counting down.
const SOFA = String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const tn = at('no'), tw = at('wins'), lvl = 1 - 0.85 * easeInOut(clamp((time - at('tired')) / 2));
  const n = Math.max(1, 5 - Math.floor(Math.max(0, time - tn) / 0.4));
  return <svg>
    ${DOODLE_PAGE}
    <text x={300} y={600} fontSize={40} fontWeight={800} fill={colors.ink}>ENERGY</text>
    <rect x={300} y={622} width={160} height={70} rx={10} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
    <rect x={462} y={642} width={14} height={30} rx={3} fill={colors.ink}/>
    <rect x={310} y={632} width={140 * lvl} height={50} rx={5} fill={colors.accent}/>
    <rect x={160} y={860} width={480} height={150} rx={30} fill={colors.wall} stroke={colors.ink} strokeWidth={7}/>
    <g transform="rotate(-7 400 1060)"><Fig x={400} y={1060} s={1.1} l={[60, -110]} r={[96, -120]} c={colors.accent}/></g>
    <rect x={478} y={918} width={26} height={52} rx={6} fill={colors.ink}/>
    <g fill={colors.wall} stroke={colors.ink} strokeWidth={7} strokeLinejoin="round">
      <rect x={160} y={1000} width={480} height={84} rx={14}/>
      <rect x={128} y={950} width={70} height={140} rx={22}/>
      <rect x={602} y={950} width={70} height={140} rx={22}/>
      <path d="M 190 1090 L 190 1150 M 610 1090 L 610 1150" fill="none"/>
    </g>
    <g opacity={time < tn ? 0 : 1}>
      <path d="M 520 600 C 520 530 680 530 680 600 C 680 660 560 666 540 640 L 470 700 L 520 628 C 516 620 520 610 520 600 Z" fill={colors.wall} stroke={colors.ink} strokeWidth={6} strokeLinejoin="round"/>
      <text x={600} y={618} textAnchor="middle" fontSize={52} fontWeight={900} fill={colors.ink}>NO.</text>
      <line x1={540} y1={606} x2={540 + 124 * easeOut(clamp((time - tn - 0.5) / 0.25))} y2={598} stroke={colors.accent} strokeWidth={9} strokeLinecap="round"/>
    </g>
    <g fill={colors.wall} stroke={colors.ink} strokeWidth={7} strokeLinejoin="round">
      <rect x={700} y={650} width={250} height={180} rx={12}/>
      <path d="M 825 830 L 825 900 M 730 900 L 920 900 M 740 900 L 740 1150 M 910 900 L 910 1150" fill="none"/>
    </g>
    <text x={825} y={712} textAnchor="middle" fontSize={34} fontWeight={800} width={220} maxLines={1} fill={colors.ink}>NEXT EPISODE</text>
    <text x={825} y={800} textAnchor="middle" fontSize={72} fontWeight={900} fill={time < tw ? colors.ink : colors.accent}>{time < tw ? n : 'PLAY'}</text>
    <Ring x={825} y={776} w={120} h={46} p={easeOut(clamp((time - tw) / 0.3))} c={colors.accent}/>
  </svg>;
}`;

// 7. The fix: willpower at midnight crossed out; thirty minutes with a book at the kitchen counter, at six.
const COUNTER = String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const tw = at('willpower'), tm = at('midnight'), tt = at('thirty'), ty = at('yours'), td = at('dinner');
  const strike = easeOut(clamp((time - tm - 0.15) / 0.3));
  return <svg>
    ${DOODLE_PAGE}
    <text x={540} y={400} textAnchor="middle" fontSize={56} fontWeight={900} width={860} maxLines={1} fill={colors.ink} opacity={clamp((time - tw) / 0.15)}>WILLPOWER AT MIDNIGHT</text>
    <path d="M 120 384 C 400 372 700 390 960 368" fill="none" stroke={colors.accent} strokeWidth={9} strokeLinecap="round" strokeDasharray={860} strokeDashoffset={860 * (1 - strike)} opacity={strike > 0 ? 1 : 0}/>
    <circle cx={J(760, 1)} cy={600} r={100} fill={colors.wall} stroke={colors.ink} strokeWidth={6}/>
    <path d="M 760 540 L 760 668" fill="none" stroke={colors.ink} strokeWidth={9} strokeLinecap="round"/>
    <text x={760} y={775} textAnchor="middle" fontSize={52} fontWeight={900} fill={colors.ink}>6 PM</text>
    <Fig x={330} y={1150} s={1.2} l={[-50, -130]} r={[50, -130]} c={colors.accent}/>
    <path d="M 270 1000 L 330 984 L 330 920 L 270 936 Z M 330 984 L 390 1000 L 390 936 L 330 920 Z" fill={colors.wall} stroke={colors.ink} strokeWidth={5} strokeLinejoin="round"/>
    <g fill={colors.wall} stroke={colors.ink} strokeWidth={7} strokeLinejoin="round">
      <rect x={100} y={1010} width={470} height={140}/>
      <path d="M 335 1030 L 335 1130 M 300 1080 L 312 1080 M 358 1080 L 370 1080" fill="none"/>
    </g>
    <g opacity={time < td ? 0 : 1} transform={'translate(500 1010) scale(' + (0.7 + 0.3 * on(td)) + ')'}>
      <path d="M -50 -60 L 50 -60 L 42 0 L -42 0 Z M -64 -46 L -50 -46 M 50 -46 L 64 -46 M -40 -60 C -30 -84 30 -84 40 -60" fill={colors.wall} stroke={colors.ink} strokeWidth={6} strokeLinejoin="round"/>
      <path d="M -16 -96 Q -4 -116 -16 -136 M 16 -100 Q 28 -120 16 -140" transform={'translate(0 ' + -((time * 20) % 14) + ')'} fill="none" stroke={colors.ink} strokeWidth={4} strokeLinecap="round"/>
    </g>
    <text x={770} y={960} textAnchor="middle" fontSize={76} fontWeight={900} fill={colors.accent} opacity={clamp((time - tt) / 0.15)}>30 MIN</text>
    <text x={770} y={1040} textAnchor="middle" fontSize={44} fontWeight={800} fill={colors.ink} opacity={clamp((time - ty) / 0.15)}>ALL YOURS</text>
    <Ring x={330} y={950} w={110} h={74} p={easeOut(clamp((time - ty) / 0.3))} c={colors.accent}/>
  </svg>;
}`;

// 8. The callback: the phone tucked into a tiny bed of its own, red-pen blanket, lights out; a push-in on "argument".
const TUCKED = String.raw`export default function Scene({ time, colors }) {
  ${DOODLE_KIT}
  const tl = at('loses'), ta = at('argument'), dark = time > tl;
  const z = 1 + 0.12 * easeOut(clamp((time - ta) / 0.2)), tuck = easeOut(clamp((time - at('phone')) / 0.3)) - easeOut(clamp((time - ta) / 0.3));
  const zz = (time * 18) % 40;
  return <svg>
    ${DOODLE_BLANK}
    <g transform={'translate(' + 540 * (1 - z) + ' ' + 800 * (1 - z) + ') scale(' + z + ')'}>
      ${DOODLE_GROUND}
      <g fill="none" stroke={colors.ink} strokeWidth={6} strokeLinecap="round">
        <path d={'M 830 410 C 740 420 740 560 840 570 C 790 540 785 440 830 410'}/>
        <path d="M 640 470 L 668 470 M 654 456 L 654 484 M 920 610 L 944 610 M 932 598 L 932 622" strokeWidth={4}/>
      </g>
      <text x={130} y={760} fontSize={52} fontWeight={900} fill={colors.ink}>THE PHONE</text>
      <Arrow a={[250, 790]} q={[300, 860]} b={[376, 912]} p={easeOut(clamp((time - at('phone')) / 0.3))} c={colors.ink}/>
      <g fill={colors.wall} stroke={colors.ink} strokeWidth={6} strokeLinejoin="round">
        <polyline points={'330,1150 ' + J(330, 1) + ',960 360,960 360,1150'} fill="none"/>
        <polyline points="700,1150 700,1010 730,1010 730,1150" fill="none"/>
        <ellipse cx={410} cy={1036} rx={44} ry={18}/>
        <rect x={386} y={940} width={52} height={100} rx={10} fill={dark ? colors.ink : colors.rose}/>
        <rect x={340} y={1050} width={380} height={44}/>
        <path d={'M 372 1052 C 372 1000 450 1000 ' + J(520, 2) + ' 1002 L 712 1002 L 712 1052 Z'}/>
      </g>
      {range(7).map(i => <line x1={460 + i * 36} y1={1012} x2={448 + i * 36} y2={1046} stroke={colors.accent} strokeWidth={6} strokeLinecap="round"/>)}
      <path d="M 398 976 Q 404 982 410 976 M 414 976 Q 420 982 426 976" fill="none" stroke={colors.wall} strokeWidth={4} strokeLinecap="round" opacity={dark ? 1 : 0}/>
      <text x={470} y={910 - zz} fontSize={40} fontWeight={900} fill={colors.ink} opacity={dark ? 1 - zz / 60 : 0}>z</text>
      <text x={500} y={860 - zz} fontSize={52} fontWeight={900} fill={colors.ink} opacity={dark ? 1 - zz / 60 : 0}>Z</text>
      <Fig x={850} y={1150} s={1.2} l={[-30 - 78 * tuck, -80 - 37 * tuck]} r={[34, -78]} c={colors.accent}/>
    </g>
  </svg>;
}`;

export const DOODLE_REFERENCE = {
  id: 'doodle-1',
  title: 'Why you stay up too late',
  caption: 'There is a name for staying up when you are exhausted. Here it is, drawn by a stick figure who also should be asleep.',
  beats: [
    { label: 'Revenge bedtime procrastination', line: "There's a name for staying up late on purpose when you're exhausted: revenge bedtime procrastination.", source: NAME, place: 'a bed at night, the figure lit by a phone' },
    { label: 'The day belongs to everyone else', line: 'From nine to six, your time belongs to your boss, your inbox and your commute.', source: STRINGS, place: 'an office day: a figure pulled by three strings' },
    { label: 'Night is the only free time', line: "So at eleven p.m., your brain finally sees time that's yours.", source: ELEVEN, place: 'a clock at eleven, the figure wide awake' },
    { label: "You know it's a bad trade", line: "You know you'll be tired tomorrow. You do it anyway.", source: TRADE, place: 'a crude chart: fun now against tomorrow you' },
    { label: 'Sleep debt adds up', line: "Lose an hour a night for a week, and that's seven hours: a whole night's sleep, gone.", source: MOONS, place: 'a week of nights drawn as seven moons' },
    { label: 'Tired makes "one more" easy', line: 'And a tired brain is bad at saying no, so one more episode always wins.', source: SOFA, place: 'a sofa at night, a remote and a draining battery' },
    { label: 'Take the time back earlier', line: "The usual fix isn't willpower at midnight. It's thirty minutes that are yours, before dinner.", source: COUNTER, place: 'a kitchen counter at six, a figure with a book' },
    { label: 'Goodnight, phone', line: 'Then the phone loses the only argument it had.', source: TUCKED, place: 'the phone tucked into a tiny bed of its own' },
  ],
};
