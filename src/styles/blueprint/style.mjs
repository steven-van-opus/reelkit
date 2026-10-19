// Blueprint HUD: a style (../index.mjs) for engineering explainers. Technical line art of the subject (side
// elevations, plan views, cross-sections) in thin strokes on a near-black grid, measured with dimension lines and
// labelled with callouts, and the numbers in HUD chart panels whose glowing accent curve draws itself. Every scene
// carries the video's series line under an accent rule that grows like a progress bar. Its reference video (how the
// Golden Gate Bridge hangs its road, below) is what the writer remakes; the opening and examples
// stay until every style has one. It is told the way the engineering explainers this style is modelled on tell how a
// real machine or structure works: a hook of nine words built on a number, a hard number in nearly every line, two acts
// split by a pivot (the cables' weight pressing down on the towers, then their pull on the anchors), a what-if that
// sets the stakes, a 4 + 4-word couplet and a kicker fact, its sources named in speech and tagged on screen. Its
// numbers are the bridge district's own (goldengate.org, Design & Construction Stats): two main cables, a 1,280 m main
// span, 2,737 m in all, 67 m of clearance, 250 pairs of suspender ropes, 27,572 wires per main cable in 61 strands (452
// on average) and 0.92 m across, towers 227 m above the water, 61,500 tons of cable load on each tower, anchorages of
// 60,000 tons each and a 1,966 m (1.2-mile) suspended span; it opened in 1937 (Library of Congress, Today in History,
// May 27); and on May 24, 1987 an estimated 300,000 people on the roadway (a California Highway Patrol estimate, ABC7
// News) flattened its arch without overstressing it (goldengate.org, Golden Gate Bridge Anniversaries). Its tons are US
// short tons, so the screen spells out TONS. Its identity (IDENTITY: what every video keeps) is told apart from what
// each topic brings, so a new video draws its own subject, never the bridge. Every scene passes the code-scene checks
// on the canvas stage with its own line (test/styles.test.mjs).

const FEEL = `An engineer's drawing board at night: near-black with a faint 150 px grid. Every scene opens with a hairline at y 262 whose accent rule grows scene by scene like a progress bar, then the series line at y 324 (fontFamily="mono", 34 px, uppercase, ink at 55%, the dash in the accent), such as "— Nº 07 · SUBSONIC VS SUPERSONIC", on every scene. Fill the stage under it, centred like the captions: start within 80 px of the series line, end just above the captions (y 1180–1260), draw the subject at least 820 px wide, and leave no empty band taller than about 120 px; fill gaps with readouts, spec rows or callouts. Draw the subject as thin-stroked technical line art (strokeWidth 2–5, no fill or a 5–30% tint): elevations, plans, sections, mechanisms; never cartoons. Measure it with dimension lines (dashed extension lines, slanted end ticks, the value in a gap) and callouts whose leader bends once to underline an uppercase label. Labels, axis values and tags are mono. Data lives in a HUD panel: accent corner brackets, a "FIG.01" header, an inner grid and one glowing accent curve (drawn three times: wide and faint, medium, crisp) that draws itself, a bright dot at its tip. colors.accent is the subject and the answer; colors.rose the cool second colour for flows and guides. Big numbers count up in heavy sans (130–250 px). Motion is engineered: strokes draw on, dimensions grow from their centre, values count, never a bounce.`;

const OPENING = String.raw`export default function Scene({ time, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const draw = easeInOut(clamp((time - 0.15) / 1.3));
  const dim = easeOut(clamp((time - at('nose')) / 0.7));
  const n = 15 * easeOut(clamp((time - 0.3) / 1.6));
  const wave = easeOut(clamp((time - at('bullet')) / 0.6));
  const stats = [['TOP SPEED', '320 km/h'], ['CARS', '10'], ['IN SERVICE', '2011']];
  const Dim = ({ a, b, c, d, p, g }) => {
    const L = Math.sqrt((c - a) ** 2 + (d - b) ** 2), ux = (c - a) / L, uy = (d - b) / L, mx = (a + c) / 2, my = (b + d) / 2, h = Math.max(g, L / 2 * p);
    return <g stroke={colors.accent} strokeWidth={3} opacity={clamp(p * 4)}>
      <line x1={mx - ux * g} y1={my - uy * g} x2={mx - ux * h} y2={my - uy * h}/>
      <line x1={mx + ux * g} y1={my + uy * g} x2={mx + ux * h} y2={my + uy * h}/>
      <line x1={a - 12} y1={b + 12} x2={a + 12} y2={b - 12}/>
      <line x1={c - 12} y1={d + 12} x2={c + 12} y2={d - 12}/>
    </g>;
  };
  return <svg>
    <defs><radialGradient id="glow"><stop offset="0" stopColor={colors.accent} stopOpacity={0.2}/><stop offset="1" stopColor={colors.accent} stopOpacity={0}/></radialGradient></defs>
    <g stroke={colors.ink} strokeOpacity={0.05} strokeWidth={2}>
      {range(7).map(i => <line x1={90 + i * 150} y1={0} x2={90 + i * 150} y2={1920}/>)}
      {range(13).map(i => <line x1={0} y1={112 + i * 150} x2={1080} y2={112 + i * 150}/>)}
    </g>
    <circle cx={420} cy={880} r={560} fill="url(#glow)"/>
    <line x1={60} y1={262} x2={960} y2={262} stroke={colors.ink} strokeOpacity={0.14} strokeWidth={2}/>
    <line x1={60} y1={262} x2={60 + 220 * k} y2={262} stroke={colors.accent} strokeWidth={4}/>
    <text fontFamily="mono" x={60} y={324} fontSize={34} fontWeight={600} letterSpacing={3} fill={colors.ink} fillOpacity={0.55}><tspan fill={colors.accent} fillOpacity={1}>— </tspan>Nº 01 · TUNNEL BOOM</text>
    <text fontFamily="mono" x={60} y={410} fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.rose} opacity={k}>E5 SERIES · SIDE ELEVATION</text>
    <text x={50} y={625} fontSize={240} fontWeight={800} letterSpacing={-6} fill={colors.ink}>{Math.floor(n) + '.' + Math.floor(n * 10) % 10}<tspan fontSize={110} letterSpacing={0} fill={colors.accent}> m</tspan></text>
    <g stroke={colors.ink} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 10" opacity={dim}>
      <line x1={150} y1={936} x2={150} y2={680}/>
      <line x1={860} y1={770} x2={860} y2={680}/>
    </g>
    <Dim a={150} b={700} c={860} d={700} p={dim} g={70}/>
    <text fontFamily="mono" x={505} y={712} textAnchor="middle" fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.ink} opacity={dim}>NOSE</text>
    <path d="M 150 955 C 250 934 420 886 560 836 C 660 801 740 784 860 780 L 1100 780 L 1100 978 L 220 978 C 180 978 154 968 150 955 Z" fill={colors.accent} fillOpacity={0.07 * draw} stroke={colors.ink} strokeWidth={3} strokeDasharray="2300 2300" strokeDashoffset={2300 * (1 - draw)}/>
    <path d="M 290 932 C 470 892 650 872 1100 870" fill="none" stroke={colors.accent} strokeWidth={5} strokeDasharray="840 840" strokeDashoffset={840 * (1 - draw)}/>
    <g opacity={draw} fill="none" stroke={colors.ink} strokeWidth={2}>
      <path d="M 600 824 L 700 800 L 760 796 L 748 826 Z" fill={colors.rose} fillOpacity={0.3} stroke={colors.rose}/>
      {range(4).map(i => <rect x={900 + i * 50} y={812} width={28} height={30} rx={6} strokeOpacity={0.7}/>)}
      <line x1={240} y1={958} x2={1100} y2={958} strokeOpacity={0.35}/>
      <path d="M 214 948 L 262 934 L 268 944 L 220 956 Z" fill={colors.rose} fillOpacity={0.5} stroke={colors.rose}/>
      <line x1={560} y1={836} x2={560} y2={978} strokeOpacity={0.35}/>
      {[640, 720, 980, 1060].map(x => <circle cx={x} cy={992} r={20} fill={colors.wall}/>)}
    </g>
    <line x1={0} y1={1016} x2={1080} y2={1016} stroke={colors.ink} strokeOpacity={0.4} strokeWidth={3}/>
    {range(3).map(i => {
      const r = 40 + (time * 120 + i * 75) % 225, x = 150 - r * 0.62, y = r * 0.78;
      return <path d={'M ' + x + ' ' + (955 - y) + ' A ' + r + ' ' + r + ' 0 0 0 ' + x + ' ' + (955 + y)} fill="none" stroke={colors.rose} strokeWidth={3} opacity={wave * (1 - (r - 40) / 225)}/>;
    })}
    <g opacity={wave}>
      <polyline points="84,1040 130,1100 470,1100" fill="none" stroke={colors.rose} strokeWidth={2}/>
      <circle cx={84} cy={1040} r={6} fill={colors.rose}/>
      <text fontFamily="mono" x={140} y={1084} fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.rose}>PRESSURE WAVE</text>
    </g>
    {stats.map((s, i) => {
      const p = easeOut(clamp((time - 0.6 - i * 0.15) / 0.5));
      return <g opacity={p}>
        <line x1={60 + i * 310} y1={1150} x2={60 + i * 310} y2={1258} stroke={colors.ink} strokeOpacity={0.2} strokeWidth={2}/>
        <text fontFamily="mono" x={84 + i * 310} y={1186} fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.ink} fillOpacity={0.55}>{s[0]}</text>
        <text x={84 + i * 310} y={1250} fontSize={52} fontWeight={700} fill={colors.ink}>{s[1]}</text>
      </g>;
    })}
  </svg>;
}`;

const CHART = String.raw`export default function Scene({ time, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const tip = interpolate(time, at('fast'), at('eighty') + 0.25, 0, 18) + interpolate(time, at('slows'), at('crawl') + 0.6, 0, 42);
  const mark = easeOut(clamp((time - at('eighty') - 0.25) / 0.6));
  const slow = easeOut(clamp((time - at('slows')) / 0.6));
  const X = t => 190 + t * 12;
  const C = t => t < 18 ? 10 + t * 70 / 18 : 100 - 20 * Math.exp((18 - t) / 9);
  const Y = c => 1080 - c * 5.2;
  const pts = range(49).map(i => X(i * tip / 48) + ',' + Y(C(i * tip / 48))).join(' ');
  const hx = X(tip), hy = Y(C(tip)), o = 30 * (1 - k);
  const Label = ({ x, y, a, c, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} fontWeight={600} letterSpacing={2} fill={c || colors.ink} fillOpacity={c ? 1 : 0.5}>{children}</text>;
  return <svg>
    <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.accent} stopOpacity={0.3}/><stop offset="1" stopColor={colors.accent} stopOpacity={0}/></linearGradient></defs>
    <g stroke={colors.ink} strokeOpacity={0.05} strokeWidth={2}>
      {range(7).map(i => <line x1={90 + i * 150} y1={0} x2={90 + i * 150} y2={1920}/>)}
      {range(13).map(i => <line x1={0} y1={112 + i * 150} x2={1080} y2={112 + i * 150}/>)}
    </g>
    <line x1={60} y1={262} x2={960} y2={262} stroke={colors.ink} strokeOpacity={0.14} strokeWidth={2}/>
    <line x1={60} y1={262} x2={60 + 220 * k} y2={262} stroke={colors.accent} strokeWidth={4}/>
    <text fontFamily="mono" x={60} y={324} fontSize={34} fontWeight={600} letterSpacing={3} fill={colors.ink} fillOpacity={0.55}><tspan fill={colors.accent} fillOpacity={1}>— </tspan>Nº 12 · FAST CHARGING</text>
    <rect x={70} y={380} width={880} height={860} fill={colors.rose} fillOpacity={0.04} stroke={colors.ink} strokeOpacity={0.16} strokeWidth={2} opacity={k}/>
    {[[70, 380, 1, 1], [950, 380, -1, 1], [70, 1240, 1, -1], [950, 1240, -1, -1]].map(c => <polyline points={(c[0] - c[2] * o) + ',' + (c[1] + 44 * c[3]) + ' ' + (c[0] - c[2] * o) + ',' + (c[1] - c[3] * o) + ' ' + (c[0] + 44 * c[2]) + ',' + (c[1] - c[3] * o)} fill="none" stroke={colors.accent} strokeWidth={4} opacity={k}/>)}
    <text fontFamily="mono" x={110} y={452} fontSize={34} fontWeight={700} letterSpacing={2} fill={colors.accent}>FIG.01 <tspan fill={colors.ink} fontWeight={600}>CHARGE VS TIME</tspan></text>
    <line x1={110} y1={474} x2={226} y2={474} stroke={colors.accent} strokeWidth={3}/>
    <text x={910} y={462} textAnchor="end" fontSize={64} fontWeight={700} fill={colors.accent}>{Math.round(C(tip))}%</text>
    <g stroke={colors.ink} strokeOpacity={0.08} strokeWidth={2}>
      {range(5).map(i => <line x1={190} y1={Y(i * 25)} x2={910} y2={Y(i * 25)}/>)}
      {range(5).map(i => <line x1={X(i * 15)} y1={560} x2={X(i * 15)} y2={1080}/>)}
    </g>
    <polyline points="190,540 190,1080 924,1080" fill="none" stroke={colors.ink} strokeOpacity={0.6} strokeWidth={3}/>
    {[0, 50, 100].map(c => <Label x={170} y={Y(c) + 12} a="end">{c}</Label>)}
    {[0, 20, 40, 60].map(t => <Label x={X(t)} y={1130} a="middle">{t}</Label>)}
    <Label x={190} y={530}>% CHARGE</Label>
    <Label x={910} y={1196} a="end">MINUTES</Label>
    <polygon points={pts + ' ' + hx + ',1080 190,1080'} fill="url(#area)"/>
    {[[24, 0.1], [12, 0.22], [5, 1]].map(s => <polyline points={pts} fill="none" stroke={colors.accent} strokeWidth={s[0]} strokeOpacity={s[1]} strokeLinecap="round" strokeLinejoin="round"/>)}
    <circle cx={hx} cy={hy} r={24} fill={colors.accent} fillOpacity={0.25}/>
    <circle cx={hx} cy={hy} r={9} fill={colors.accent}/>
    <g opacity={mark}>
      <line x1={190} y1={Y(80)} x2={190 + 216 * mark} y2={Y(80)} stroke={colors.rose} strokeWidth={3} strokeDasharray="10 8"/>
      <line x1={X(18)} y1={Y(80)} x2={X(18)} y2={Y(80) + 416 * mark} stroke={colors.rose} strokeWidth={3} strokeDasharray="10 8"/>
      <rect x={X(18) + 26} y={Y(80) + 40} width={330} height={66} rx={4} fill={colors.wall} stroke={colors.accent} strokeWidth={2}/>
      <text fontFamily="mono" x={X(18) + 46} y={Y(80) + 86} fontSize={36} fontWeight={700} letterSpacing={1} fill={colors.ink}>{Math.round(80 * mark)}% · 18 MIN</text>
    </g>
    <g opacity={clamp(tip / 4)}><Label x={X(9)} y={1050} a="middle" c={colors.accent}>FAST</Label></g>
    <g opacity={slow}><Label x={X(39)} y={1050} a="middle" c={colors.rose}>SLOW</Label></g>
  </svg>;
}`;

const CABLE = String.raw`export default function Scene({ time, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const ring = easeInOut(clamp((time - 0.1) / 1));
  const n = Math.round(27572 * easeInOut(clamp((time - at('cable') - 0.1) / 1.6)));
  const dim = easeOut(clamp((time - 0.6) / 0.7));
  const call = easeOut(clamp((time - at('steel')) / 0.6));
  const Hex = ({ x, y, d, m, r, t, c }) => range(2 * m + 1).map(q => range(2 * m + 1).map(s => {
    const a = q - m, b = s - m, ri = Math.max(Math.abs(a), Math.abs(b), Math.abs(a + b));
    const p = easeOut(clamp((time - t - ri * 0.12) / 0.4));
    return ri > m ? null : <circle cx={x + d * (a + b / 2)} cy={y + d * b * 0.866} r={r * p} fill={c} fillOpacity={0.14} stroke={c} strokeWidth={3}/>;
  }));
  const Label = ({ x, y, a, c, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} fontWeight={600} letterSpacing={2} fill={c || colors.ink} fillOpacity={c ? 1 : 0.55}>{children}</text>;
  return <svg>
    <defs><radialGradient id="glow"><stop offset="0" stopColor={colors.accent} stopOpacity={0.16}/><stop offset="1" stopColor={colors.accent} stopOpacity={0}/></radialGradient></defs>
    <g stroke={colors.ink} strokeOpacity={0.05} strokeWidth={2}>
      {range(7).map(i => <line x1={90 + i * 150} y1={0} x2={90 + i * 150} y2={1920}/>)}
      {range(13).map(i => <line x1={0} y1={112 + i * 150} x2={1080} y2={112 + i * 150}/>)}
    </g>
    <circle cx={440} cy={880} r={460} fill="url(#glow)"/>
    <line x1={60} y1={262} x2={960} y2={262} stroke={colors.ink} strokeOpacity={0.14} strokeWidth={2}/>
    <line x1={60} y1={262} x2={60 + 220 * k} y2={262} stroke={colors.accent} strokeWidth={4}/>
    <text fontFamily="mono" x={60} y={324} fontSize={34} fontWeight={600} letterSpacing={3} fill={colors.ink} fillOpacity={0.55}><tspan fill={colors.accent} fillOpacity={1}>— </tspan>Nº 04 · SUSPENSION CABLE</text>
    <Label x={60} y={410}>STEEL WIRES · ONE CABLE</Label>
    <text x={52} y={540} fontSize={130} fontWeight={800} letterSpacing={-2} fill={colors.accent}>{n < 1000 ? n : Math.floor(n / 1000) + ',' + (n % 1000 < 100 ? '0' : '') + (n % 1000 < 10 ? '0' : '') + n % 1000}</text>
    <circle cx={440} cy={880} r={270} fill="none" stroke={colors.ink} strokeWidth={3} strokeDasharray="1700 1700" strokeDashoffset={1700 * (1 - ring)} transform="rotate(-90 440 880)"/>
    <circle cx={440} cy={880} r={258} fill="none" stroke={colors.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="3 7" opacity={ring}/>
    <Hex x={440} y={880} d={56} m={4} r={25} t={at('cable')} c={colors.accent}/>
    <g opacity={call}>
      <circle cx={552} cy={686} r={36} fill="none" stroke={colors.rose} strokeWidth={3}/>
      <polyline points="578,661 610,630 735,510" fill="none" stroke={colors.rose} strokeWidth={2}/>
      <circle cx={830} cy={470} r={104} fill={colors.wall} stroke={colors.rose} strokeWidth={3}/>
      <Hex x={830} y={470} d={27} m={3} r={11} t={at('steel')} c={colors.rose}/>
      <Label x={830} y={626} a="middle" c={colors.rose}>1 STRAND</Label>
      <Label x={830} y={672} a="middle">452 WIRES</Label>
    </g>
    <g stroke={colors.ink} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="6 10" opacity={dim}>
      <line x1={170} y1={890} x2={170} y2={1222}/>
      <line x1={710} y1={890} x2={710} y2={1222}/>
    </g>
    <g stroke={colors.accent} strokeWidth={3} opacity={dim}>
      <line x1={440 - 92} y1={1200} x2={440 - 92 - 178 * dim} y2={1200}/>
      <line x1={440 + 92} y1={1200} x2={440 + 92 + 178 * dim} y2={1200}/>
      <line x1={158} y1={1212} x2={182} y2={1188}/>
      <line x1={698} y1={1212} x2={722} y2={1188}/>
    </g>
    <text fontFamily="mono" x={440} y={1213} textAnchor="middle" fontSize={36} fontWeight={700} letterSpacing={1} fill={colors.ink} opacity={dim}>Ø 92 cm</text>
    <g opacity={easeOut(clamp((time - at('bundles') - 0.3) / 0.5))}>
      <Label x={960} y={1100} a="end">STRANDS</Label>
      <text x={960} y={1196} textAnchor="end" fontSize={96} fontWeight={800} fill={colors.ink}>61</text>
    </g>
  </svg>;
}`;

const LOCK = String.raw`export default function Scene({ time, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const key = easeInOut(clamp((time - at('key')) / 1.2));
  const turn = easeInOut(clamp((time - at('turns')) / 0.8));
  const xs = [300, 430, 560, 690, 820], L = [70, 120, 90, 140, 100];
  const tip = 900 - 960 * (1 - key);
  const lift = xs.map((x, i) => (190 - L[i]) * easeOut(clamp((tip - x + 40) / 100)));
  const set = lift.filter((l, i) => l > 189.5 - L[i]).length;
  const sq = 1 - 0.3 * turn;
  const teeth = xs.map((x, i) => (x - 52) + ',968 ' + (x - 18) + ',' + (800 + L[i]) + ' ' + (x + 18) + ',' + (800 + L[i])).join(' ');
  const Label = ({ x, y, a, c, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} fontWeight={600} letterSpacing={2} fill={c}>{children}</text>;
  return <svg>
    <g stroke={colors.ink} strokeOpacity={0.05} strokeWidth={2}>
      {range(7).map(i => <line x1={90 + i * 150} y1={0} x2={90 + i * 150} y2={1920}/>)}
      {range(13).map(i => <line x1={0} y1={112 + i * 150} x2={1080} y2={112 + i * 150}/>)}
    </g>
    <line x1={60} y1={262} x2={960} y2={262} stroke={colors.ink} strokeOpacity={0.14} strokeWidth={2}/>
    <line x1={60} y1={262} x2={60 + 220 * k} y2={262} stroke={colors.accent} strokeWidth={4}/>
    <text fontFamily="mono" x={60} y={324} fontSize={34} fontWeight={600} letterSpacing={3} fill={colors.ink} fillOpacity={0.55}><tspan fill={colors.accent} fillOpacity={1}>— </tspan>Nº 09 · PIN TUMBLER</text>
    <g opacity={k}>
      <rect x={100} y={540} width={840} height={560} rx={28} fill={colors.floor} stroke={colors.ink} strokeOpacity={0.5} strokeWidth={3}/>
      {xs.map(x => <rect x={x - 30} y={580} width={60} height={220} fill={colors.wall} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={2}/>)}
    </g>
    <g transform={'translate(0 925) scale(1 ' + sq + ') translate(0 -925)'}>
      <rect x={100} y={800} width={800} height={250} rx={16} fill={colors.wall} stroke={colors.ink} strokeWidth={3} opacity={k}/>
      {xs.map((x, i) => <rect x={x - 22} y={990 - L[i] - lift[i]} width={44} height={L[i]} rx={16} fill={colors.accent} fillOpacity={0.3} stroke={colors.accent} strokeWidth={3} opacity={k}/>)}
      <polygon points={'-200,930 ' + teeth + ' 880,968 900,1000 900,1030 -200,1030'} transform={'translate(' + (tip - 900) + ' 0)'} fill={colors.ink} fillOpacity={0.08} stroke={colors.ink} strokeWidth={3} strokeLinejoin="round"/>
    </g>
    {xs.map((x, i) => {
      const top = 890 - L[i] - lift[i];
      return <g opacity={k}>
        <polyline points={range(11).map(j => (x + (j % 2 ? 16 : -16) * (j > 0 && j < 10 ? 1 : 0)) + ',' + (584 + j * (top - 584) / 10)).join(' ')} fill="none" stroke={colors.ink} strokeOpacity={0.6} strokeWidth={2}/>
        <rect x={x - 22} y={top} width={44} height={100} rx={6} fill={colors.rose} fillOpacity={0.18} stroke={colors.rose} strokeWidth={3}/>
      </g>;
    })}
    <line x1={70} y1={800} x2={960} y2={800} stroke={colors.rose} strokeWidth={14} strokeOpacity={set === 5 ? 0.25 : 0}/>
    <line x1={70} y1={800} x2={960} y2={800} stroke={colors.rose} strokeWidth={3} strokeDasharray="14 10"/>
    <g fill="none" strokeWidth={2}>
      <polyline points="100,490 336,490" stroke={colors.rose}/>
      <polyline points="296,490 296,716" stroke={colors.rose}/>
      <polyline points="720,490 952,490 952,792" stroke={colors.rose}/>
      <polyline points="100,1206 270,1206 296,950" stroke={colors.accent}/>
    </g>
    <Label x={100} y={474} c={colors.rose}>DRIVER PIN</Label>
    <Label x={952} y={474} a="end" c={colors.rose}>SHEAR LINE</Label>
    <Label x={100} y={1190} c={colors.accent}>KEY PIN</Label>
    <g opacity={k} fill="none" strokeWidth={3}>
      <circle cx={540} cy={1186} r={74} stroke={colors.ink} strokeOpacity={0.4}/>
      <circle cx={540} cy={1186} r={52} stroke={colors.ink}/>
      <rect x={532} y={1150} width={16} height={58} rx={4} stroke={colors.accent} fill={colors.accent} fillOpacity={0.3} transform={'rotate(' + 90 * turn + ' 540 1186)'}/>
      <path d={'M 540 1106 A 80 80 0 0 1 ' + (540 + 80 * Math.sin(1.57 * turn)) + ' ' + (1186 - 80 * Math.cos(1.57 * turn))} stroke={colors.rose} opacity={turn}/>
    </g>
    <Label x={960} y={1160} a="end" c={colors.ink}>{turn > 0.5 ? 'PLUG TURNS' : 'PINS AT LINE'}</Label>
    <text x={960} y={1252} textAnchor="end" fontSize={80} fontWeight={800} fill={set === 5 ? colors.accent : colors.ink}>{turn > 0.5 ? 'OPEN' : set + '/5'}</text>
  </svg>;
}`;

const POOL = String.raw`export default function Scene({ time, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const draw = easeInOut(clamp((time - 0.1) / 1.2));
  const len = easeOut(clamp((time - at('fifty')) / 0.8));
  const wid = easeOut(clamp((time - at('twenty-five')) / 0.8));
  const vol = easeOut(clamp((time - at('holds')) / 1.6));
  const v = Math.round(25 * vol);
  const rows = [['LANES', '10'], ['LANE', '2.5 m'], ['DEPTH', '2 m']];
  const Dim = ({ a, b, c, d, p, g }) => {
    const L = Math.sqrt((c - a) ** 2 + (d - b) ** 2), ux = (c - a) / L, uy = (d - b) / L, mx = (a + c) / 2, my = (b + d) / 2, h = Math.max(g, L / 2 * p);
    return <g stroke={colors.accent} strokeWidth={3} opacity={clamp(p * 4)}>
      <line x1={mx - ux * g} y1={my - uy * g} x2={mx - ux * h} y2={my - uy * h}/>
      <line x1={mx + ux * g} y1={my + uy * g} x2={mx + ux * h} y2={my + uy * h}/>
      <line x1={a - 12} y1={b + 12} x2={a + 12} y2={b - 12}/>
      <line x1={c - 12} y1={d + 12} x2={c + 12} y2={d - 12}/>
    </g>;
  };
  const Swim = ({ x, s }) => {
    const y = 750 - 310 * Math.cos(time * 0.9 + s), dir = Math.sin(time * 0.9 + s) > 0 ? -1 : 1;
    return <g opacity={draw}>
      <line x1={x} y1={y} x2={x} y2={y + dir * 70} stroke={colors.accent} strokeOpacity={0.4} strokeWidth={8} strokeLinecap="round"/>
      <circle cx={x} cy={y} r={9} fill={colors.accent}/>
    </g>;
  };
  return <svg>
    <g stroke={colors.ink} strokeOpacity={0.05} strokeWidth={2}>
      {range(7).map(i => <line x1={90 + i * 150} y1={0} x2={90 + i * 150} y2={1920}/>)}
      {range(13).map(i => <line x1={0} y1={112 + i * 150} x2={1080} y2={112 + i * 150}/>)}
    </g>
    <line x1={60} y1={262} x2={960} y2={262} stroke={colors.ink} strokeOpacity={0.14} strokeWidth={2}/>
    <line x1={60} y1={262} x2={60 + 220 * k} y2={262} stroke={colors.accent} strokeWidth={4}/>
    <text fontFamily="mono" x={60} y={324} fontSize={34} fontWeight={600} letterSpacing={3} fill={colors.ink} fillOpacity={0.55}><tspan fill={colors.accent} fillOpacity={1}>— </tspan>Nº 15 · OLYMPIC POOL</text>
    <rect x={220} y={370} width={400} height={760} fill="none" stroke={colors.ink} strokeOpacity={0.3} strokeWidth={2} opacity={draw}/>
    <rect x={240} y={390} width={360} height={720} fill={colors.rose} fillOpacity={0.04 + 0.14 * vol} stroke={colors.ink} strokeWidth={3} strokeDasharray="2200 2200" strokeDashoffset={2200 * (1 - draw)}/>
    <g opacity={draw}>
      {range(9).map(i => <line x1={276 + i * 36} y1={390} x2={276 + i * 36} y2={1110} stroke={colors.rose} strokeOpacity={0.55} strokeWidth={2} strokeDasharray="10 8"/>)}
      {range(10).map(i => <polyline points={(250 + i * 36) + ',430 ' + (266 + i * 36) + ',430 ' + (258 + i * 36) + ',430 ' + (258 + i * 36) + ',1070 ' + (250 + i * 36) + ',1070 ' + (266 + i * 36) + ',1070'} fill="none" stroke={colors.ink} strokeOpacity={0.18} strokeWidth={3}/>)}
      {range(10).map(i => <rect x={250 + i * 36} y={374} width={16} height={12} fill={colors.ink} fillOpacity={0.5}/>)}
    </g>
    <Swim x={366} s={0}/>
    <Swim x={474} s={1.7}/>
    <g stroke={colors.ink} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="6 10">
      <line x1={212} y1={390} x2={140} y2={390} opacity={len}/>
      <line x1={212} y1={1110} x2={140} y2={1110} opacity={len}/>
      <line x1={240} y1={1138} x2={240} y2={1204} opacity={wid}/>
      <line x1={600} y1={1138} x2={600} y2={1204} opacity={wid}/>
    </g>
    <Dim a={160} b={390} c={160} d={1110} p={len} g={62}/>
    <text x={160} y={742} textAnchor="middle" fontSize={44} fontWeight={700} fill={colors.ink} opacity={len}>{Math.round(50 * len)}</text>
    <text fontFamily="mono" x={160} y={784} textAnchor="middle" fontSize={34} fontWeight={600} fill={colors.ink} fillOpacity={0.55} opacity={len}>m</text>
    <Dim a={240} b={1184} c={600} d={1184} p={wid} g={74}/>
    <text x={420} y={1199} textAnchor="middle" fontSize={44} fontWeight={700} fill={colors.ink} opacity={wid}>{Math.round(25 * wid) + ' m'}</text>
    {rows.map((r, i) => <g opacity={easeOut(clamp((time - 0.5 - i * 0.15) / 0.5))}>
      <text fontFamily="mono" x={660} y={440 + i * 96} fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.ink} fillOpacity={0.55}>{r[0]}</text>
      <text x={960} y={440 + i * 96} textAnchor="end" fontSize={44} fontWeight={700} fill={colors.ink}>{r[1]}</text>
      <line x1={660} y1={466 + i * 96} x2={960} y2={466 + i * 96} stroke={colors.ink} strokeOpacity={0.18} strokeWidth={2}/>
    </g>)}
    <g opacity={clamp(vol * 4)}>
      <text fontFamily="mono" x={660} y={820} fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.rose}>VOLUME</text>
      <text x={652} y={980} fontSize={170} fontWeight={800} letterSpacing={-4} fill={colors.accent}>{Math.floor(v / 10) + '.' + v % 10}</text>
      <text x={660} y={1040} fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.ink}>MILLION LITRES</text>
      <text fontFamily="mono" x={660} y={1104} fontSize={34} fontWeight={600} letterSpacing={1} fill={colors.ink} fillOpacity={0.5}>50 × 25 × 2 m</text>
    </g>
  </svg>;
}`;

// The reference video (../reference.mjs): how the Golden Gate Bridge hangs its road, eight scenes in one story told
// in two acts. Act one follows the weight down (a hook over the whole bridge, then the road on its ropes, the ropes on
// the cables and the cables pressing on the towers); the pivot names the cables' pull into the anchorages, a what-if
// sets the stakes, a 4 + 4-word couplet sums up both acts and a kicker fact closes. Each scene is a different
// Blueprint move (an elevation measured, a load path, a cross-section, a front elevation with its load flowing down, a
// section, a what-if elevation, two free-body diagrams, a HUD chart), each readout lands on its first number word, and
// each figure carries its source in a small mono SRC tag. The accent rule at the top grows scene by scene, like a
// progress bar.
const HEAD = (n) => String.raw`<g stroke={colors.ink} strokeOpacity={0.05} strokeWidth={2}>
      {range(7).map(i => <line x1={90 + i * 150} y1={0} x2={90 + i * 150} y2={1920}/>)}
      {range(13).map(i => <line x1={0} y1={112 + i * 150} x2={1080} y2={112 + i * 150}/>)}
    </g>
    <line x1={60} y1={262} x2={960} y2={262} stroke={colors.ink} strokeOpacity={0.14} strokeWidth={2}/>
    <line x1={60} y1={262} x2={60 + 900 * (${n} + clamp(time / duration)) / 8} y2={262} stroke={colors.accent} strokeWidth={4}/>
    <text fontFamily="mono" x={60} y={324} fontSize={34} fontWeight={600} letterSpacing={3} fill={colors.ink} fillOpacity={0.55}><tspan fill={colors.accent} fillOpacity={1}>— </tspan>Nº 04 · GOLDEN GATE</text>`;

// A source tag: small mono ink at 45%, under the figure it backs.
const SRC = (x, y, a, words = 'GOLDENGATE.ORG') => String.raw`<text fontFamily="mono" x={${x}} y={${y}} textAnchor="${a}" fontSize={34} letterSpacing={2} fill={colors.ink} fillOpacity={0.45}>SRC · ${words}</text>`;

const R1 = String.raw`export default function Scene({ time, duration, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const draw = easeInOut(clamp((time - 0.15) / 1.2));
  const hang = easeInOut(clamp((time - 0.25) / 1));
  const ropes = easeOut(clamp((time - at('carry')) / 0.8));
  const dim = easeOut(clamp((time - at('golden')) / 0.7));
  const two = easeOut(clamp((time - at('two')) / 0.5));
  const cab = easeOut(clamp((time - at('cables')) / 0.5));
  const n = Math.round(1280 * dim);
  const f = v => v < 1000 ? '' + v : Math.floor(v / 1000) + ',' + (v % 1000 < 100 ? '0' : '') + (v % 1000 < 10 ? '0' : '') + v % 1000;
  const cy = x => 958 - 138 * ((x - 540) / 310) ** 2;
  const gx = 230 + 620 * ((time * 0.2) % 1);
  const stats = [['OPENED', '1937'], ['LENGTH', '2,737 m'], ['CLEARANCE', '67 m']];
  return <svg>
    ${HEAD(0)}
    <text fontFamily="mono" x={540} y={410} textAnchor="middle" fontSize={34} letterSpacing={2} fill={colors.rose} opacity={k}>GOLDEN GATE BRIDGE · ELEVATION</text>
    <text x={540} y={590 + 24 * (1 - two)} textAnchor="middle" fontSize={190} fontWeight={800} letterSpacing={-6} fill={colors.ink} opacity={two}>2<tspan fontSize={96} letterSpacing={0} fill={colors.accent}> CABLES</tspan></text>
    <g opacity={two}>${SRC(540, 664, 'middle')}</g>
    <g opacity={dim} stroke={colors.ink} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 10">
      <line x1={230} y1={806} x2={230} y2={735}/>
      <line x1={850} y1={806} x2={850} y2={735}/>
    </g>
    <g opacity={dim} stroke={colors.accent} strokeWidth={3}>
      <line x1={338} y1={750} x2={338 - 108 * dim} y2={750}/>
      <line x1={742} y1={750} x2={742 + 108 * dim} y2={750}/>
      <line x1={218} y1={762} x2={242} y2={738}/>
      <line x1={838} y1={762} x2={862} y2={738}/>
    </g>
    <text fontFamily="mono" x={540} y={762} textAnchor="middle" fontSize={34} letterSpacing={2} fill={colors.ink} opacity={dim}>MAIN SPAN {f(n)} m</text>
    {[230, 850].map(x => <g transform={'translate(0 ' + 1040 * (1 - draw) + ') scale(1 ' + Math.max(0.01, draw) + ')'} stroke={colors.ink} strokeWidth={3}>
      <polygon points={(x - 14) + ',1040 ' + (x - 9) + ',812 ' + (x + 9) + ',812 ' + (x + 14) + ',1040'} fill={colors.accent} fillOpacity={0.14}/>
      {[845, 890, 935, 975].map(y => <line x1={x - 12} y1={y} x2={x + 12} y2={y} strokeWidth={2}/>)}
    </g>)}
    {['M 230 820 Q 540 1096 850 820', 'M 230 820 Q 130 930 -20 972', 'M 850 820 Q 950 930 1100 972'].map(d => <g fill="none" stroke={colors.accent} strokeDasharray="760 760" strokeDashoffset={760 * (1 - hang)}>
      <path d={d} strokeWidth={14} strokeOpacity={0.2}/>
      <path d={d} strokeWidth={5}/>
    </g>)}
    {range(19).map(i => { const x = 250 + i * 32.2; return <line x1={x} y1={cy(x)} x2={x} y2={975} stroke={colors.ink} strokeOpacity={0.55} strokeWidth={2} opacity={clamp(ropes * 22 - i)}/>; })}
    <g opacity={draw} stroke={colors.ink} strokeWidth={2} fill="none">
      <line x1={0} y1={975} x2={1080} y2={975} strokeWidth={3}/>
      <line x1={0} y1={992} x2={1080} y2={992}/>
      <polyline points={range(37).map(i => i * 30 + ',' + (i % 2 ? 992 : 975)).join(' ')} strokeOpacity={0.5}/>
      <rect x={200} y={1040} width={60} height={22} strokeOpacity={0.5}/>
      <rect x={820} y={1040} width={60} height={22} strokeOpacity={0.5}/>
    </g>
    <line x1={0} y1={1040} x2={1080} y2={1040} stroke={colors.rose} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="22 14" strokeDashoffset={-time * 24}/>
    <circle cx={gx} cy={cy(gx)} r={16} fill={colors.accent} fillOpacity={0.3} opacity={hang}/>
    <circle cx={gx} cy={cy(gx)} r={6} fill={colors.accent} opacity={hang}/>
    <g opacity={cab}>
      <circle cx={700} cy={cy(700)} r={11} fill="none" stroke={colors.rose} strokeWidth={3}/>
      <polyline points={'694,' + (cy(700) + 10) + ' 650,1124 960,1124'} fill="none" stroke={colors.rose} strokeWidth={2}/>
      <text fontFamily="mono" x={960} y={1110} textAnchor="end" fontSize={34} letterSpacing={2} fill={colors.rose}>MAIN CABLES</text>
    </g>
    <text fontFamily="mono" x={60} y={1100} fontSize={34} letterSpacing={2} fill={colors.ink} fillOpacity={0.45} opacity={draw}>V. SCALE ×2</text>
    {stats.map((s, i) => <g opacity={easeOut(clamp((time - 0.7 - i * 0.15) / 0.5))}>
      <line x1={60 + i * 310} y1={1150} x2={60 + i * 310} y2={1258} stroke={colors.ink} strokeOpacity={0.2} strokeWidth={2}/>
      <text fontFamily="mono" x={84 + i * 310} y={1186} fontSize={34} letterSpacing={2} fill={colors.ink} fillOpacity={0.55}>{s[0]}</text>
      <text x={84 + i * 310} y={1250} fontSize={52} fontWeight={700} fill={colors.ink}>{s[1]}</text>
    </g>)}
  </svg>;
}`;

const R2 = String.raw`export default function Scene({ time, duration, colors }) {
  const road = easeInOut(clamp((time - 0.1) / 1));
  const ropes = easeOut(clamp((time - at('two')) / 1));
  const pull = easeOut(clamp((time - at('hang')) / 0.6));
  const cab = easeOut(clamp((time - at('cables')) / 0.5));
  const P = t => [(1 - t) ** 2 * -20 + 2 * (1 - t) * t * 540 + t * t * 1100, (1 - t) ** 2 * 440 + 2 * (1 - t) * t * 560 + t * t * 610];
  const hs = range(8).map(i => P(0.1 + i * 0.108));
  const pairs = Math.round(250 * ropes);
  const Label = ({ x, y, a, c, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} letterSpacing={2} fill={c}>{children}</text>;
  return <svg>
    ${HEAD(1)}
    <g fill="none" stroke={colors.accent}>
      <path d="M -20 440 Q 540 560 1100 610" strokeWidth={46} strokeOpacity={0.05 + 0.12 * cab}/>
      <path d="M -20 440 Q 540 560 1100 610" strokeWidth={24} strokeOpacity={0.3}/>
      <path d="M -20 440 Q 540 560 1100 610" strokeWidth={6}/>
    </g>
    {hs.map((h, i) => { const len = (1000 - h[1]) * clamp(ropes * 1.6 - i * 0.08); return <g>
      <line x1={h[0] - 7} y1={h[1] + 14} x2={h[0] - 7} y2={h[1] + 14 + len} stroke={colors.ink} strokeOpacity={0.7} strokeWidth={3}/>
      <line x1={h[0] + 7} y1={h[1] + 14} x2={h[0] + 7} y2={h[1] + 14 + len} stroke={colors.ink} strokeOpacity={0.7} strokeWidth={3}/>
      <circle cx={h[0]} cy={h[1]} r={15} fill={colors.wall} stroke={colors.ink} strokeWidth={3}/>
      <circle cx={h[0]} cy={1000 - ((time * 150 + i * 61) % (980 - h[1]))} r={5} fill={colors.accent} opacity={pull * 0.9}/>
      <polygon points={(h[0] - 12) + ',' + (h[1] + 46) + ' ' + (h[0] + 12) + ',' + (h[1] + 46) + ' ' + h[0] + ',' + (h[1] + 70)} fill={colors.accent} opacity={pull}/>
    </g>; })}
    <g opacity={road} stroke={colors.ink} fill="none">
      <line x1={0} y1={994} x2={1080 * road} y2={994} strokeWidth={8} strokeOpacity={0.85}/>
      <line x1={0} y1={1010} x2={1080} y2={1010} strokeWidth={3}/>
      <line x1={0} y1={1084} x2={1080} y2={1084} strokeWidth={3}/>
      <polyline points={range(19).map(i => i * 60 + ',' + (i % 2 ? 1084 : 1010)).join(' ')} strokeWidth={2} strokeOpacity={0.6}/>
      {hs.map(h => <line x1={h[0]} y1={1010} x2={h[0]} y2={1084} strokeWidth={2} strokeOpacity={0.6}/>)}
    </g>
    <g opacity={pull} fill={colors.rose} stroke={colors.rose} strokeWidth={4}>
      {[640, 760, 880].map(x => <g><line x1={x} y1={1100} x2={x} y2={1140}/><polygon points={(x - 11) + ',1138 ' + (x + 11) + ',1138 ' + x + ',1160'} strokeWidth={0}/></g>)}
    </g>
    <g opacity={pull}><Label x={960} y={1210} a="end" c={colors.rose}>ROAD WEIGHT</Label></g>
    <g opacity={cab} fill="none" stroke={colors.accent} strokeWidth={2}>
      <polyline points="820,566 820,456 734,456"/>
    </g>
    <g opacity={cab}><Label x={960} y={440} a="end" c={colors.accent}>MAIN CABLE</Label></g>
    <g opacity={road} fill="none" stroke={colors.ink} strokeOpacity={0.6} strokeWidth={2}>
      <polyline points="440,1084 420,1166 60,1166"/>
    </g>
    <g opacity={road}><Label x={60} y={1150} c={colors.ink}>STIFFENING TRUSS</Label></g>
    <g opacity={ropes}>
      <rect x={296} y={700} width={488} height={184} rx={4} fill={colors.wall} stroke={colors.accent} strokeWidth={2}/>
      <text x={540} y={768} textAnchor="middle" fontSize={64} fontWeight={800} fill={colors.accent}>{pairs} PAIRS</text>
      <Label x={540} y={814} a="middle" c={colors.ink}>SUSPENDER ROPES</Label>
      ${SRC(540, 862, 'middle')}
    </g>
  </svg>;
}`;

const R3 = String.raw`export default function Scene({ time, duration, colors }) {
  const ring = easeInOut(clamp((time - 0.1) / 1));
  const n = Math.round(27572 * easeInOut(clamp((time - at('twenty-seven')) / 1.6)));
  const dim = easeOut(clamp((time - 0.6) / 0.7));
  const call = easeOut(clamp((time - at('steel')) / 0.6));
  const Hex = ({ x, y, d, m, r, t, c }) => range(2 * m + 1).map(q => range(2 * m + 1).map(s => {
    const a = q - m, b = s - m, ri = Math.max(Math.abs(a), Math.abs(b), Math.abs(a + b));
    const p = easeOut(clamp((time - t - ri * 0.12) / 0.4));
    return ri > m ? null : <circle cx={x + d * (a + b / 2)} cy={y + d * b * 0.866} r={r * p} fill={c} fillOpacity={0.14} stroke={c} strokeWidth={3}/>;
  }));
  const Label = ({ x, y, a, c, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} letterSpacing={2} fill={c || colors.ink} fillOpacity={c ? 1 : 0.55}>{children}</text>;
  return <svg>
    <defs><radialGradient id="glow"><stop offset="0" stopColor={colors.accent} stopOpacity={0.16}/><stop offset="1" stopColor={colors.accent} stopOpacity={0}/></radialGradient></defs>
    <circle cx={440} cy={880} r={460} fill="url(#glow)"/>
    ${HEAD(2)}
    <Label x={60} y={410}>STEEL WIRES · ONE CABLE</Label>
    <text x={52} y={540} fontSize={130} fontWeight={800} letterSpacing={-2} fill={colors.accent}>{n < 1000 ? n : Math.floor(n / 1000) + ',' + (n % 1000 < 100 ? '0' : '') + (n % 1000 < 10 ? '0' : '') + n % 1000}</text>
    ${SRC(60, 598, 'start')}
    <circle cx={440} cy={880} r={270} fill="none" stroke={colors.ink} strokeWidth={3} strokeDasharray="1700 1700" strokeDashoffset={1700 * (1 - ring)} transform="rotate(-90 440 880)"/>
    <circle cx={440} cy={880} r={258} fill="none" stroke={colors.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="3 7" opacity={ring}/>
    <Hex x={440} y={880} d={56} m={4} r={25} t={at('twenty-seven')} c={colors.accent}/>
    <g opacity={call}>
      <circle cx={552} cy={686} r={36} fill="none" stroke={colors.rose} strokeWidth={3}/>
      <polyline points="578,661 610,630 727,543" fill="none" stroke={colors.rose} strokeWidth={2}/>
      <circle cx={800} cy={470} r={104} fill={colors.wall} stroke={colors.rose} strokeWidth={3}/>
      <Hex x={800} y={470} d={27} m={3} r={11} t={at('steel')} c={colors.rose}/>
      <Label x={800} y={626} a="middle" c={colors.rose}>1 STRAND</Label>
      <Label x={800} y={672} a="middle">AVG 452 WIRES</Label>
    </g>
    <g stroke={colors.ink} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="6 10" opacity={dim}>
      <line x1={170} y1={890} x2={170} y2={1222}/>
      <line x1={710} y1={890} x2={710} y2={1222}/>
    </g>
    <g stroke={colors.accent} strokeWidth={3} opacity={dim}>
      <line x1={348} y1={1200} x2={348 - 178 * dim} y2={1200}/>
      <line x1={532} y1={1200} x2={532 + 178 * dim} y2={1200}/>
      <line x1={158} y1={1212} x2={182} y2={1188}/>
      <line x1={698} y1={1212} x2={722} y2={1188}/>
    </g>
    <text fontFamily="mono" x={440} y={1213} textAnchor="middle" fontSize={36} letterSpacing={1} fill={colors.ink} opacity={dim}>Ø 92 cm</text>
    <g opacity={easeOut(clamp((time - at('wires') - 0.3) / 0.5))}>
      <Label x={960} y={1100} a="end">STRANDS</Label>
      <text x={960} y={1196} textAnchor="end" fontSize={96} fontWeight={800} fill={colors.ink}>61</text>
    </g>
  </svg>;
}`;

const R4 = String.raw`export default function Scene({ time, duration, colors }) {
  const rise = easeInOut(clamp((time - 0.1) / 1.3));
  const cab = easeOut(clamp((time - at('cables')) / 0.5));
  const sad = easeOut(clamp((time - at('tower')) / 0.6));
  const dim = easeOut(clamp((time - at('tower')) / 0.9));
  const press = easeOut(clamp((time - at('press')) / 0.6));
  const load = easeOut(clamp((time - at('sixty-one')) / 0.9));
  const v = Math.round(615 * load) * 100;
  const legs = [340, 540];
  const Label = ({ x, y, a, c, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} letterSpacing={2} fill={c}>{children}</text>;
  return <svg>
    ${HEAD(3)}
    <defs><clipPath id="lens"><circle cx={800} cy={560} r={118}/></clipPath></defs>
    <g transform={'translate(0 ' + 1180 * (1 - rise) + ') scale(1 ' + Math.max(0.01, rise) + ')'} stroke={colors.ink} strokeWidth={3}>
      {[[440, 56], [630, 34], [810, 34], [990, 34]].map(s => <g>
        <rect x={362} y={s[0]} width={156} height={s[1]} fill={colors.floor}/>
        <rect x={374} y={s[0] + 8} width={132} height={s[1] - 16} fill="none" strokeOpacity={0.35} strokeWidth={2}/>
      </g>)}
      {legs.map(x => <g>
        <polygon points={(x - 38) + ',1180 ' + (x - 24) + ',420 ' + (x + 24) + ',420 ' + (x + 38) + ',1180'} fill={colors.accent} fillOpacity={0.14}/>
        {[600, 780, 960].map(y => <line x1={x - 30} y1={y} x2={x + 30} y2={y} strokeOpacity={0.45} strokeWidth={2}/>)}
      </g>)}
    </g>
    {legs.map(x => <g opacity={press} stroke={colors.accent} fill={colors.accent}>
      <line x1={x} y1={440} x2={x} y2={1140} strokeWidth={6} strokeDasharray="18 30" strokeDashoffset={-time * 90}/>
      <polygon points={(x - 18) + ',1140 ' + (x + 18) + ',1140 ' + x + ',1174'} strokeWidth={0}/>
    </g>)}
    {legs.map(x => <g opacity={sad}>
      <rect x={x - 30} y={394} width={60} height={26} fill={colors.floor} stroke={colors.ink} strokeWidth={3}/>
      <circle cx={x} cy={378} r={17} fill={colors.accent} fillOpacity={0.35 * cab + 0.1} stroke={colors.accent} strokeWidth={3}/>
    </g>)}
    <rect x={280} y={1180} width={320} height={40} fill="none" stroke={colors.ink} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="10 8"/>
    <line x1={0} y1={1180} x2={1080} y2={1180} stroke={colors.rose} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="22 14" strokeDashoffset={-time * 24}/>
    <g opacity={dim} stroke={colors.ink} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 10">
      <line x1={300} y1={396} x2={150} y2={396}/>
      <line x1={290} y1={1180} x2={150} y2={1180}/>
    </g>
    <g opacity={dim} stroke={colors.accent} strokeWidth={3}>
      <line x1={170} y1={736} x2={170} y2={736 - 340 * dim}/>
      <line x1={170} y1={846} x2={170} y2={846 + 334 * dim}/>
      <line x1={158} y1={408} x2={182} y2={384}/>
      <line x1={158} y1={1192} x2={182} y2={1168}/>
    </g>
    <text x={170} y={790} textAnchor="middle" fontSize={44} fontWeight={700} fill={colors.ink} opacity={dim}>{Math.round(227 * dim)}</text>
    <g opacity={dim}><Label x={170} y={830} a="middle" c={colors.ink}>m</Label></g>
    <g opacity={sad}>
      <polyline points="566,388 690,490" fill="none" stroke={colors.rose} strokeWidth={2}/>
      <circle cx={800} cy={560} r={120} fill={colors.wall} stroke={colors.rose} strokeWidth={3}/>
      <g clipPath="url(#lens)">
        <path d="M 690 612 Q 800 520 910 612" fill="none" stroke={colors.accent} strokeWidth={30} strokeOpacity={0.2}/>
        <path d="M 690 612 Q 800 520 910 612" fill="none" stroke={colors.accent} strokeWidth={12}/>
        <path d="M 724 640 L 730 600 Q 800 556 870 600 L 876 640 Z" fill={colors.floor} stroke={colors.ink} strokeWidth={3}/>
        <rect x={700} y={640} width={200} height={30} fill={colors.floor} stroke={colors.ink} strokeWidth={3}/>
        {[730, 770, 830, 870].map(x => <circle cx={x} cy={655} r={5} fill={colors.ink}/>)}
      </g>
      <Label x={800} y={718} a="middle" c={colors.rose}>SADDLE</Label>
    </g>
    <g opacity={easeOut(clamp((time - at('sixty-one')) / 0.4))}>
      <Label x={960} y={1030} a="end" c={colors.ink}>LOAD FROM CABLES</Label>
      <text x={960} y={1116} textAnchor="end" fontSize={80} fontWeight={800} fill={colors.accent}>{v < 1000 ? v : Math.floor(v / 1000) + ',' + (v % 1000 < 100 ? '0' : '') + (v % 1000 < 10 ? '0' : '') + v % 1000}</text>
      <Label x={960} y={1162} a="end" c={colors.ink}>TONS</Label>
    </g>
    ${SRC(60, 1268, 'start')}
  </svg>;
}`;

const R5 = String.raw`export default function Scene({ time, duration, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const pull = easeOut(clamp((time - at('pull')) / 0.5));
  const splay = easeInOut(clamp((time - at('ends')) / 1.1));
  const tons = easeOut(clamp((time - at('sixty-thousand-ton')) / 0.8));
  const con = easeOut(clamp((time - at('concrete')) / 0.6));
  const anc = easeOut(clamp((time - at('anchors')) / 0.6));
  const v = Math.round(600 * tons) * 100;
  const Label = ({ x, y, a, c, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} letterSpacing={2} fill={c}>{children}</text>;
  return <svg>
    ${HEAD(4)}
    <defs><clipPath id="block"><polygon points="500,690 960,690 960,1180 560,1180"/></clipPath></defs>
    <g opacity={k} stroke={colors.ink} strokeWidth={2}>
      <line x1={0} y1={760} x2={508} y2={760} strokeWidth={3}/>
      <line x1={960} y1={760} x2={1080} y2={760} strokeWidth={3}/>
      {range(11).map(i => <line x1={i * 46 + 20} y1={766} x2={i * 46} y2={790} strokeOpacity={0.35}/>)}
    </g>
    <polygon points="500,690 960,690 960,1180 560,1180" fill={colors.rose} fillOpacity={0.06} stroke={colors.ink} strokeWidth={3} opacity={k}/>
    <g clipPath="url(#block)" opacity={con}>
      {range(10).map(r => range(8).map(c => <circle cx={530 + c * 58 + (r % 2) * 29} cy={720 + r * 50} r={3} fill={colors.ink} fillOpacity={0.35}/>))}
      {range(6).map(i => <polygon points={(560 + i * 70) + ',' + (760 + (i % 3) * 140) + ' ' + (578 + i * 70) + ',' + (776 + (i % 3) * 140) + ' ' + (552 + i * 70) + ',' + (780 + (i % 3) * 140)} fill="none" stroke={colors.ink} strokeOpacity={0.35} strokeWidth={2}/>)}
    </g>
    <g fill="none" stroke={colors.accent}>
      <line x1={-20} y1={380} x2={420} y2={640} strokeWidth={34} strokeOpacity={0.15}/>
      <line x1={-20} y1={380} x2={420} y2={640} strokeWidth={14}/>
    </g>
    <g opacity={pull} stroke={colors.rose} fill={colors.rose}>
      <line x1={347} y1={671} x2={107} y2={530} strokeWidth={4} strokeDasharray="280 280" strokeDashoffset={280 * (1 - pull)}/>
      <polygon points="107,530 126,557 140,533" strokeWidth={0}/>
    </g>
    <text x={150} y={712} fontSize={56} fontWeight={800} fill={colors.rose} opacity={pull}>PULL</text>
    {range(9).map(j => <line x1={450} y1={662} x2={880} y2={790 + j * 44} stroke={colors.accent} strokeWidth={3} strokeDasharray="700 700" strokeDashoffset={700 * (1 - clamp(splay * 1.6 - j * 0.07))}/>)}
    <rect x={390} y={626} width={80} height={44} fill={colors.floor} stroke={colors.ink} strokeWidth={3} transform="rotate(30 430 648)"/>
    {range(9).map(j => <g opacity={clamp(anc * 3 - j * 0.25)}>
      <line x1={880} y1={790 + j * 44} x2={936} y2={790 + j * 44} stroke={colors.ink} strokeWidth={7}/>
      <circle cx={880} cy={790 + j * 44} r={8} fill={colors.wall} stroke={colors.accent} strokeWidth={3}/>
    </g>)}
    <g opacity={splay}>
      <polyline points="446,618 486,578 760,578" fill="none" stroke={colors.rose} strokeWidth={2}/>
      <Label x={496} y={562} c={colors.rose}>SPLAY SADDLE</Label>
      <polyline points="330,1007 420,1007 640,760" fill="none" stroke={colors.accent} strokeWidth={2}/>
      <rect x={60} y={978} width={270} height={58} fill={colors.wall} stroke={colors.accent} strokeWidth={2}/>
      <Label x={80} y={1019} c={colors.accent}>61 STRANDS</Label>
    </g>
    <g opacity={k}><Label x={960} y={410} a="end" c={colors.ink}>EACH ANCHORAGE</Label></g>
    <text x={960} y={506} textAnchor="end" fontSize={96} fontWeight={800} fill={colors.accent} opacity={clamp(tons * 3)}>{v < 1000 ? v : Math.floor(v / 1000) + ',' + (v % 1000 < 100 ? '0' : '') + (v % 1000 < 10 ? '0' : '') + v % 1000}<tspan fontSize={40} fill={colors.ink}> TONS</tspan></text>
    <g opacity={anc}>
      <polyline points="944,1142 944,1228 620,1228" fill="none" stroke={colors.ink} strokeOpacity={0.6} strokeWidth={2}/>
      <Label x={936} y={1214} a="end" c={colors.ink}>EYEBAR ANCHORS</Label>
    </g>
    <g opacity={con}><Label x={60} y={1250} c={colors.ink}>CONCRETE ANCHORAGE</Label></g>
    <Label x={60} y={830} c={colors.ink}>SHORE</Label>
    <g opacity={tons}>${SRC(60, 1176, 'start')}</g>
  </svg>;
}`;

const R6 = String.raw`export default function Scene({ time, duration, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const draw = easeInOut(clamp((time - 0.1) / 1.1));
  const off = easeOut(clamp((time - at('without')) / 0.5));
  const cut = easeInOut(clamp((time - at('anchors')) / 0.6));
  const dim = easeOut(clamp((time - at('mile')) / 0.7));
  const f = easeInOut(clamp((time - at('fall')) / 0.6));
  const m = Math.round(1966 * dim);
  const cc = 1030 + 140 * f, drop = 90 * f;
  const cy = x => { const t = (x - 276) / 468; return 500 + 2 * t * (1 - t) * (cc - 500); };
  const Label = ({ x, y, a, c, o, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} letterSpacing={2} fill={c} fillOpacity={o || 1}>{children}</text>;
  return <svg>
    ${HEAD(5)}
    <g opacity={k}><Label x={60} y={410} c={colors.rose}>WHAT IF · NO ANCHORAGES</Label></g>
    {[276, 744].map(x => <g transform={'translate(0 ' + 900 * (1 - draw) + ') scale(1 ' + Math.max(0.01, draw) + ')'} stroke={colors.ink} strokeWidth={3}>
      <polygon points={(x - 14) + ',900 ' + (x - 9) + ',500 ' + (x + 9) + ',500 ' + (x + 14) + ',900'} fill={colors.accent} fillOpacity={0.14}/>
      {[590, 680, 830].map(y => <line x1={x - 12} y1={y} x2={x + 12} y2={y} strokeWidth={2}/>)}
    </g>)}
    {['M 276 500 Q 510 ' + cc + ' 744 500', 'M 276 500 Q ' + (201 + 30 * f) + ' 690 ' + (110 + 125 * f) + ' ' + (790 + 40 * f), 'M 744 500 Q ' + (819 - 30 * f) + ' 690 ' + (910 - 125 * f) + ' ' + (790 + 40 * f)].map(d => <g fill="none" stroke={colors.accent} strokeDasharray="800 800" strokeDashoffset={800 * (1 - draw)}>
      <path d={d} strokeWidth={14} strokeOpacity={0.2}/>
      <path d={d} strokeWidth={5}/>
    </g>)}
    {range(13).map(i => { const x = 294 + i * 36; return <line x1={x} y1={cy(x)} x2={x} y2={780 + drop} stroke={colors.ink} strokeOpacity={0.5} strokeWidth={2} opacity={draw}/>; })}
    <g opacity={draw} stroke={colors.ink} strokeWidth={6}>
      <line x1={0} y1={780} x2={150} y2={780}/>
      <line x1={870} y1={780} x2={1080} y2={780}/>
      <line x1={150} y1={780} x2={870} y2={780} opacity={1 - 0.8 * f}/>
    </g>
    <g opacity={f} stroke={colors.rose} fill={colors.rose}>
      <line x1={150} y1={780 + drop} x2={870} y2={780 + drop} strokeWidth={6} strokeDasharray="24 14"/>
      {[350, 510, 670].map(x => <g><line x1={x} y1={796} x2={x} y2={826} strokeWidth={4}/><polygon points={(x - 11) + ',824 ' + (x + 11) + ',824 ' + x + ',844'} strokeWidth={0}/></g>)}
    </g>
    {[70, 870].map(x => <g opacity={draw}>
      <rect x={x} y={770} width={80} height={90} fill={colors.floor} stroke={off > 0.5 ? colors.rose : colors.ink} strokeWidth={3}/>
      <line x1={x - 6} y1={760} x2={x - 6 + 92 * cut} y2={760 + 110 * cut} stroke={colors.rose} strokeWidth={5}/>
      <line x1={x + 86} y1={760} x2={x + 86 - 92 * cut} y2={760 + 110 * cut} stroke={colors.rose} strokeWidth={5}/>
    </g>)}
    <line x1={0} y1={900} x2={1080} y2={900} stroke={colors.rose} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="22 14" strokeDashoffset={-time * 24}/>
    <g opacity={dim} stroke={colors.ink} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 10">
      <line x1={150} y1={880} x2={150} y2={975}/>
      <line x1={870} y1={880} x2={870} y2={975}/>
    </g>
    <g opacity={dim} stroke={colors.accent} strokeWidth={3}>
      <line x1={398} y1={960} x2={398 - 248 * dim} y2={960}/>
      <line x1={622} y1={960} x2={622 + 248 * dim} y2={960}/>
      <line x1={138} y1={972} x2={162} y2={948}/>
      <line x1={858} y1={972} x2={882} y2={948}/>
    </g>
    <g opacity={dim}><Label x={510} y={972} a="middle" c={colors.ink}>SUSPENDED</Label></g>
    <g opacity={k}><Label x={60} y={1080} c={colors.ink} o={0.55}>ROAD ON THE CABLES</Label></g>
    <text x={52} y={1206} opacity={clamp(dim * 4)} fontSize={130} fontWeight={800} letterSpacing={-2} fill={colors.accent}>{m < 1000 ? m : Math.floor(m / 1000) + ',' + (m % 1000 < 100 ? '0' : '') + (m % 1000 < 10 ? '0' : '') + m % 1000}<tspan fontSize={70} letterSpacing={0} fill={colors.ink}> m</tspan></text>
    <g opacity={f}><Label x={960} y={1130} a="end" c={colors.rose}>WOULD FALL</Label></g>
    <text x={960} y={1206} textAnchor="end" fontSize={56} fontWeight={700} fill={colors.ink} opacity={dim}>1.2 MILES</text>
    <g opacity={dim}>${SRC(60, 1258, 'start')}</g>
  </svg>;
}`;

const R7 = String.raw`export default function Scene({ time, duration, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const tw = easeInOut(clamp((time - at('towers')) / 0.8));
  const push = easeOut(clamp((time - at('push')) / 0.4));
  const tag1 = easeOut(clamp((time - at('push') - 0.15) / 0.4));
  const an = easeInOut(clamp((time - at('anchors')) / 0.6));
  const pull = easeOut(clamp((time - at('pull')) / 0.35));
  const tag2 = easeOut(clamp((time - at('pull') - 0.1) / 0.35));
  const Label = ({ x, y, c, o, children }) => <text fontFamily="mono" x={x} y={y} textAnchor="middle" fontSize={34} letterSpacing={2} fill={c} fillOpacity={o || 1}>{children}</text>;
  return <svg>
    ${HEAD(6)}
    <text fontFamily="mono" x={60} y={410} fontSize={34} fontWeight={700} letterSpacing={2} fill={colors.accent} opacity={k}>FIG.01 <tspan fill={colors.ink} fontWeight={600}>FORCES</tspan></text>
    <line x1={510} y1={450} x2={510} y2={1250} stroke={colors.ink} strokeOpacity={0.25} strokeWidth={2} strokeDasharray="8 10" opacity={k}/>
    <g opacity={k}><Label x={285} y={490} c={colors.ink} o={0.55}>TOWER</Label><Label x={735} y={490} c={colors.ink} o={0.55}>ANCHORAGE</Label></g>
    <g transform={'translate(0 ' + 1000 * (1 - tw) + ') scale(1 ' + Math.max(0.01, tw) + ')'} stroke={colors.ink} strokeWidth={3}>
      <polygon points="245,1000 257,620 313,620 325,1000" fill={colors.accent} fillOpacity={0.14}/>
      {[720, 820, 920].map(y => <line x1={252} y1={y} x2={318} y2={y} strokeWidth={2} strokeOpacity={0.45}/>)}
      <rect x={250} y={600} width={70} height={20} fill={colors.floor}/>
    </g>
    <path d="M 140 660 Q 285 540 430 660" fill="none" stroke={colors.accent} strokeWidth={5} opacity={tw}/>
    <g opacity={tw}>
      <rect x={215} y={1000} width={140} height={30} fill="none" stroke={colors.ink} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="10 8"/>
      <line x1={120} y1={1030} x2={450} y2={1030} stroke={colors.ink} strokeOpacity={0.6} strokeWidth={3}/>
    </g>
    {[235, 335].map(x => <g opacity={push} stroke={colors.accent} fill={colors.accent}>
      <line x1={x} y1={515 + 30 * (1 - push)} x2={x} y2={580} strokeWidth={6}/>
      <polygon points={(x - 14) + ',576 ' + (x + 14) + ',576 ' + x + ',602'} strokeWidth={0}/>
    </g>)}
    <line x1={285} y1={640} x2={285} y2={990} stroke={colors.accent} strokeWidth={5} strokeDasharray="16 22" strokeDashoffset={-time * 80} opacity={push}/>
    <text x={285} y={1120} textAnchor="middle" fontSize={96} fontWeight={800} fill={colors.accent} opacity={push}>PUSH</text>
    <g opacity={tag1}><Label x={285} y={1172} c={colors.accent}>COMPRESSION</Label><Label x={285} y={1226} c={colors.ink}>LOAD 61,500 TONS</Label></g>
    <g opacity={an}>
      <line x1={540} y1={880} x2={960} y2={880} stroke={colors.ink} strokeOpacity={0.6} strokeWidth={3}/>
      {range(9).map(i => <line x1={560 + i * 46} y1={886} x2={540 + i * 46} y2={910} stroke={colors.ink} strokeOpacity={0.35} strokeWidth={2}/>)}
    </g>
    <polygon points="640,820 920,820 920,1040 690,1040" fill={colors.rose} fillOpacity={0.08 * an} stroke={colors.ink} strokeWidth={3} strokeDasharray="1100 1100" strokeDashoffset={1100 * (1 - an)}/>
    <line x1={540} y1={580} x2={780} y2={900} stroke={colors.accent} strokeWidth={5} strokeDasharray="400 400" strokeDashoffset={400 * (1 - an)}/>
    <g opacity={an} stroke={colors.accent} fill={colors.accent}>
      <circle cx={780} cy={900} r={9} fill={colors.wall} strokeWidth={3}/>
      <line x1={850} y1={900} x2={850} y2={976} strokeWidth={5}/>
      <polygon points="836,972 864,972 850,1000" strokeWidth={0}/>
    </g>
    <g opacity={pull} stroke={colors.rose} fill={colors.rose}>
      <line x1={760} y1={790} x2={640} y2={630} strokeWidth={5} strokeDasharray="200 200" strokeDashoffset={200 * (1 - pull)}/>
      <polygon points="640,630 667,644 647,660" strokeWidth={0}/>
    </g>
    <text x={735} y={1120} textAnchor="middle" fontSize={96} fontWeight={800} fill={colors.rose} opacity={pull}>PULL</text>
    <g opacity={tag2}><Label x={735} y={1172} c={colors.rose}>TENSION</Label><Label x={735} y={1226} c={colors.ink}>60,000-TON ANCHOR</Label></g>
  </svg>;
}`;

const R8 = String.raw`export default function Scene({ time, duration, colors }) {
  const k = easeOut(clamp(time / 0.8));
  const draw = easeInOut(clamp((time - 0.2) / 1.2));
  const date = easeOut(clamp((time - at('nineteen')) / 0.4));
  const cop = easeOut(clamp((time - at('police')) / 0.4));
  const n = Math.round(3000 * easeOut(clamp((time - at('three')) / 1))) * 100;
  const crowd = clamp((time - at('people')) / 0.9);
  const fl = easeInOut(clamp((time - at('people') - 0.2) / 1.2));
  const held = easeOut(clamp((time - at('held')) / 0.35));
  const D = x => 960 - 56 * (1 - fl) * (1 - ((x - 510) / 320) ** 2);
  const tip = 190 + 640 * draw;
  const pts = range(33).map(i => { const x = 190 + i * (tip - 190) / 32; return x + ',' + D(x); }).join(' ');
  const Label = ({ x, y, a, c, o, children }) => <text fontFamily="mono" x={x} y={y} textAnchor={a || 'start'} fontSize={34} letterSpacing={2} fill={c} fillOpacity={o || 1}>{children}</text>;
  return <svg>
    ${HEAD(7)}
    <rect x={70} y={380} width={880} height={830} fill={colors.rose} fillOpacity={0.04} stroke={colors.ink} strokeOpacity={0.16} strokeWidth={2} opacity={k}/>
    {[[70, 380, 1, 1], [950, 380, -1, 1], [70, 1210, 1, -1], [950, 1210, -1, -1]].map(c => <polyline points={c[0] + ',' + (c[1] + 44 * c[3]) + ' ' + c[0] + ',' + c[1] + ' ' + (c[0] + 44 * c[2]) + ',' + c[1]} fill="none" stroke={colors.accent} strokeWidth={4} opacity={k}/>)}
    <text fontFamily="mono" x={110} y={452} fontSize={34} fontWeight={700} letterSpacing={2} fill={colors.accent}>FIG.02 <tspan fill={colors.ink} fontWeight={600}>ROAD PROFILE</tspan></text>
    <line x1={110} y1={474} x2={226} y2={474} stroke={colors.accent} strokeWidth={3}/>
    <text x={910} y={462} textAnchor="end" fontSize={44} fontWeight={700} fill={colors.accent} opacity={date}>MAY 24, 1987</text>
    <Label x={110} y={540} c={colors.ink} o={0.5}>PEOPLE ON THE ROADWAY</Label>
    <g opacity={cop}>
      <rect x={622} y={500} width={288} height={56} rx={4} fill={colors.wall} stroke={colors.rose} strokeWidth={2}/>
      <Label x={766} y={540} a="middle" c={colors.rose}>CHP ESTIMATE</Label>
    </g>
    <text x={104} y={680} fontSize={130} fontWeight={800} letterSpacing={-2} fill={colors.accent}>{n < 1000 ? n : Math.floor(n / 1000) + ',' + (n % 1000 < 100 ? '0' : '') + (n % 1000 < 10 ? '0' : '') + n % 1000}</text>
    {[190, 830].map(x => <polygon points={(x - 12) + ',1060 ' + (x - 7) + ',740 ' + (x + 7) + ',740 ' + (x + 12) + ',1060'} fill={colors.accent} fillOpacity={0.12} stroke={colors.ink} strokeOpacity={0.6} strokeWidth={2} opacity={k}/>)}
    <path d="M 190 750 Q 510 1030 830 750" fill="none" stroke={colors.ink} strokeOpacity={0.45} strokeWidth={3} opacity={k}/>
    {range(13).map(i => { const x = 230 + i * 46.7, t = (x - 190) / 640; return <line x1={x} y1={750 + 560 * t * (1 - t)} x2={x} y2={D(x)} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={2} opacity={k}/>; })}
    <line x1={110} y1={1060} x2={910} y2={1060} stroke={colors.rose} strokeOpacity={0.6} strokeWidth={2} strokeDasharray="22 14" strokeDashoffset={-time * 24}/>
    <line x1={190} y1={960} x2={830} y2={960} stroke={colors.ink} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 10" opacity={k}/>
    {[[24, 0.1], [12, 0.22], [5, 1]].map(s => <polyline points={pts} fill="none" stroke={colors.accent} strokeWidth={s[0]} strokeOpacity={s[1]} strokeLinecap="round" strokeLinejoin="round"/>)}
    <circle cx={tip} cy={D(tip)} r={20} fill={colors.accent} fillOpacity={0.25}/>
    <circle cx={tip} cy={D(tip)} r={8} fill={colors.accent}/>
    {range(32).map(i => { const x = 200 + i * 20; return <circle cx={x} cy={D(x) - 16} r={6} fill={colors.rose} opacity={clamp(crowd * 34 - i)}/>; })}
    <g opacity={k}>
      <rect x={110} y={1080} width={460} height={56} rx={4} fill={colors.wall} stroke={fl > 0.5 ? colors.rose : colors.accent} strokeWidth={2}/>
      <Label x={130} y={1120} c={fl > 0.5 ? colors.rose : colors.accent}>{fl > 0.5 ? 'PROFILE · FLATTENED' : 'PROFILE · ARCHED'}</Label>
    </g>
    <g opacity={held}>
      <rect x={540} y={1146} width={370} height={56} rx={4} fill={colors.wall} stroke={colors.accent} strokeWidth={2}/>
      <Label x={725} y={1186} a="middle" c={colors.ink}>NOT OVERSTRESSED</Label>
    </g>
    ${SRC(70, 1262, 'start', 'GOLDENGATE.ORG · CHP')}
  </svg>;
}`;

// What every Blueprint HUD video keeps, what its topic brings, and what it never copies from the reference video.
const IDENTITY = {
  constant: [
    "An engineer's drawing board at night: near-black with a faint 150 px grid",
    'The series line at the top of every scene (mono, uppercase), under a hairline whose accent rule grows scene by scene like a progress bar',
    'Thin-stroked technical line art (elevations, plans, sections, mechanisms), measured with dimension lines and labelled with callouts whose leader bends once',
    'HUD panels with accent corner brackets, a FIG header and one glowing curve that draws itself',
    'Big numbers that count up in heavy sans; mono labels and readouts',
    'Engineered motion: strokes draw on, dimensions grow from their centre, values count, never a bounce',
    'A centred karaoke caption line (drawn for you)',
  ],
  topic: [
    'The subject, and which drawing shows it for each idea: a side elevation, a plan, a cross-section, a mechanism, drawings to one scale',
    'Every dimension, value and chart, from your sources',
    "The series line's words, the callouts' labels and what each HUD panel charts",
  ],
  never: [
    "The reference video's Golden Gate drawings: its towers, main cables, saddles, cable cross-section, anchorage and 1987 road profile",
    'One elevation redrawn in every scene: change the drawing when the line moves on',
  ],
};

// The same style on another topic, as text: one subject, a new drawing wherever the line moves on.
const CONTRAST = {
  topic: 'why an airliner wing flexes',
  title: 'Why airliner wings bend',
  chapters: [
    { label: 'Wings that bend', line: "An airliner's wings bend upward in flight, and they're built to.", place: 'a front elevation of a jet, its wings level, then flexed' },
    { label: 'Lift pulls up', line: 'Lift pushes up along the whole wing, while the body hangs in the middle.', place: 'a load diagram along one wing, arrows growing outward' },
    { label: 'The spar inside', line: 'Inside, a long beam called the spar carries that bend to the body.', place: 'a cutaway plan of the wing, its spar and ribs' },
    { label: 'Bending, not breaking', line: 'A wing that flexes spreads the load instead of snapping in rough air.', place: 'a HUD chart of the load against how far the tip rises' },
  ],
};

export const BLUEPRINT = {
  id: 'blueprint',
  name: 'Blueprint HUD',
  feel: FEEL,
  identity: IDENTITY,
  contrast: CONTRAST,
  opening: {
    title: 'A side elevation of the subject drawing itself on, its key dimension measured above it and counted up huge, a pressure wave pulsing off the tip, a row of spec readouts below',
    line: 'Why does a bullet train need a nose fifteen metres long?',
    source: OPENING,
  },
  examples: [
    {
      title: 'A HUD chart panel with corner brackets: a glowing charge curve draws itself, the live value counts in the header, and a tagged marker lands on the knee',
      line: 'Fast charging fills a battery to eighty percent in eighteen minutes, then slows to a crawl.',
      source: CHART,
    },
    {
      title: 'A cross-section of the subject, its strands appearing ring by ring, with a callout leader to a zoomed detail, a diameter dimension and the count rolling up',
      line: 'Each main cable of the Golden Gate Bridge bundles twenty-seven thousand steel wires.',
      source: CABLE,
    },
    {
      title: 'A mechanism in cross-section: the key slides in, each pin rises exactly to the shear line, the count of set pins ticks up and the plug turns',
      line: 'The right key lifts every pin to the shear line, and the plug turns.',
      source: LOCK,
    },
    {
      title: 'A plan view from above, measured along both sides with dimension lines that count up, swimmers pacing their lanes, and a spec sheet totalling the volume',
      line: 'An Olympic pool is fifty metres long, twenty-five wide, and holds two and a half million litres.',
      source: POOL,
    },
  ],
  frame: {
    captions: { kind: 'line-center', font: 'sans', weight: 700, size: 60, upper: false, color: 'ink', highlight: 'accent', dim: 0.4 },
    grain: false,
    vignette: true,
  },
  palette: { primary: '#FF7A2E', accent: '#3CCFEF', ink: '#E9EDF1', background: '#0A0C0F' },
  // A dark electronic bed near 110 BPM, 8 LU under the voice and barely ducked, that drops out on the story's turn;
  // only a few effects, matched to what's drawn.
  sound: { mood: 'dark', bpm: [106, 114], mode: 'minor', underVoiceLu: -8, duckDb: 1, breakAt: 'pivot', sfx: 'engineering', density: 'few' },
  reference: {
    id: 'blueprint-3',
    title: 'How the Golden Gate hangs its road',
    caption: "Two steel cables hold up more than a mile of the Golden Gate's road. The towers take the push and the anchors take the pull. Here's where all that weight goes.",
    beats: [
      { label: 'Two cables carry the road', line: "Here's how two cables carry the Golden Gate's road.", source: R1, place: 'a side elevation of the whole bridge, its main span measured' },
      { label: '250 pairs of suspender ropes', line: 'Two hundred fifty pairs of ropes hang the road from those cables.', source: R2, place: 'a load path: suspenders pulling the road up to the cable' },
      { label: '27,572 wires per cable', line: "The bridge's operators count twenty-seven thousand five hundred seventy-two steel wires per cable.", source: R3, place: 'a cross-section of one main cable, strand by strand' },
      { label: '61,500 tons on each tower', line: 'At each tower, the cables press down with sixty-one thousand five hundred tons.', source: R4, place: "a tower's front elevation, its load flowing down the legs" },
      { label: 'But the cables also pull', line: 'But the cables also pull, so their ends dive into sixty-thousand-ton concrete anchors.', source: R5, place: 'a section through a shore anchorage, cables in concrete' },
      { label: 'Without the anchors', line: 'Without those anchors, more than a mile of road would fall.', source: R6, place: 'the suspended span in elevation, its anchorages struck out' },
      { label: 'Push and pull', line: 'Towers take the push; anchors take the pull.', source: R7, place: 'two free-body diagrams side by side: a tower, an anchorage' },
      { label: '300,000 people, and it held', line: 'In nineteen eighty-seven, police estimated three hundred thousand people on the bridge, and it held.', source: R8, place: "a HUD chart of the road's profile under the 1987 crowd" },
    ],
  },
};

export default BLUEPRINT;
