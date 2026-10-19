// The 'Isometric network' style (index.mjs): systems explained as small isometric worlds on deep navy,
// where blocks light up and packets travel glowing paths between them, a step tracker across the top. Its reference
// video (REFERENCE below, eight scenes) is what a new video remakes; the opening and
// examples stay until every style has a reference (index.mjs). Its identity (IDENTITY: what every video keeps) is
// told apart from what each topic brings, so a new video draws its own system, never the reference's network. Every
// scene draws the whole 1080 × 1920 frame and passes the code-scene checks on the canvas stage
// (test/styles.test.mjs).

// What every scene in this style starts from, written into each example's code: P(x, y, z) projects a world point
// (2:1 isometric, z up) to the frame, pts() a list of them as polygon points, Box a block with three shaded faces
// (c: its top corners, then the three bottom ones in view; lit 0–1 makes its top glow), Ring a glow ring on the ground and Tag a label chip with a leader line to the point `to`.
const kit = (x0, y0, u) => String.raw`  const U = ${u}, P = (x, y, z) => [${x0} + (x - y) * U, ${y0} + (x + y) * U / 2 - z * U * 1.2];
  const pts = a => a.map(q => (${x0} + (q[0] - q[1]) * U) + ',' + (${y0} + (q[0] + q[1]) * U / 2 - q[2] * U * 1.2)).join(' ');
  const Box = ({ x, y, z = 0, w, d, h, lit = 0 }) => {
    const t = z + h, X = x + w, Y = y + d, c = [[x, y, t], [X, y, t], [X, Y, t], [x, Y, t], [X, y, z], [X, Y, z], [x, Y, z]].map(q => pts([q]));
    const face = (k, fill, o) => <polygon points={k.map(i => c[i]).join(' ')} fill={fill} opacity={o}/>;
    return <g>
      {face([0, 1, 4, 5, 6, 3], colors.wall, 1)}
      {face([0, 1, 2, 3], colors.ink, 0.2)}
      {face([3, 2, 5, 6], colors.ink, 0.11)}
      {face([1, 2, 5, 4], colors.ink, 0.05)}
      <polygon points={c.slice(0, 4).join(' ')} fill={colors.accent} fillOpacity={0.18} stroke={colors.accent} strokeWidth={4} strokeLinejoin="round" opacity={lit}/>
    </g>;
  };
  const Ring = ({ x, y, z = 0, r, o }) => { const c = P(x, y, z); return <ellipse cx={c[0]} cy={c[1]} rx={r * U * 1.41} ry={r * U * 0.71} fill="none" stroke={colors.accent} strokeWidth={3} opacity={o}/>; };
  const Tag = ({ x, y, s, hot, to }) => { const w = s.length * 23 + 66, L = x - w / 2, c = hot ? colors.accent : colors.ink, o = hot ? 1 : 0.35, side = Math.abs(to[0] - x) > w / 2; return <g>
    <line x1={side ? (to[0] > x ? L + w : L) : x} y1={side ? y - 14 : to[1] > y ? y + 18 : y - 46} x2={to[0]} y2={to[1]} stroke={c} strokeOpacity={o} strokeWidth={2}/>
    <circle cx={to[0]} cy={to[1]} r={6} fill={c}/>
    <rect x={L} y={y - 46} width={w} height={64} rx={14} fill={colors.wall} stroke={c} strokeOpacity={o} strokeWidth={2}/>
    <circle cx={L + 26} cy={y - 14} r={7} fill={c} opacity={o}/>
    <text x={L + 46} y={y} fontFamily="mono" fontSize={34} fontWeight={700} letterSpacing={2} fill={colors.ink}>{s}</text>
  </g>; };`;

// A packet's glow, and the fade that keeps the floor grid off the top bar and out from under the captions.
const DEFS = String.raw`<defs>
      <radialGradient id="halo"><stop offset="0" stopColor={colors.accent} stopOpacity={0.6}/><stop offset="1" stopColor={colors.accent} stopOpacity={0}/></radialGradient>
      <linearGradient id="fade" x2="0" y2="1"><stop offset="0" stopColor={colors.wall}/><stop offset="0.2" stopColor={colors.wall} stopOpacity={0}/><stop offset="0.58" stopColor={colors.wall} stopOpacity={0}/><stop offset="0.68" stopColor={colors.wall}/></linearGradient>
    </defs>`;
// The faint isometric floor grid across the whole frame.
const GRID = String.raw`{range(15).map(i => <g opacity={0.08} stroke={colors.ink} strokeWidth={2} fill="none">
      <polyline points={pts([[i - 5, -9, 0], [i - 5, 18, 0]])}/>
      <polyline points={pts([[-9, i - 5, 0], [18, i - 5, 0]])}/>
    </g>)}
    <rect x={0} y={0} width={1080} height={1920} fill="url(#fade)"/>`;

const OPENING = String.raw`export default function Scene({ time, colors }) {
${kit(540, 600, 56)}
  const go = clamp((time - at('crosses')) / (at('second') - at('crosses') + 0.3));
  const k = go * 3, step = Math.floor(k + 0.02);
  const nodes = [[1.5, 6.5], [1.5, 1.5], [6.5, 1.5], [6.5, 6.5]];
  const leg = Math.min(2, Math.floor(k)), f = k - leg, a = nodes[leg], b = nodes[leg + 1] || a;
  const now = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const trail = pts([...nodes.slice(0, leg + 1), now].map(n => [n[0], n[1], 0]));
  const pk = P(now[0], now[1], 0.25), moving = go > 0 && go < 1 ? 1 : 0;
  const lit = i => (go > 0 || i === 0) && step >= i ? 1 : 0;
  const pulse = (time * 0.7) % 1;
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.5} y={-0.5} z={-0.5} w={9} d={9} h={0.5}/>
    <polyline points={pts(nodes.map(n => [n[0], n[1], 0]))} fill="none" stroke={colors.ink} strokeOpacity={0.25} strokeWidth={4} strokeDasharray="10 12"/>
    <polyline points={trail} fill="none" stroke={colors.accent} strokeOpacity={0.22} strokeWidth={24} strokeLinejoin="round" strokeLinecap="round"/>
    <polyline points={trail} fill="none" stroke={colors.accent} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round"/>
    {nodes.map((n, i) => <Ring x={n[0]} y={n[1]} r={1.4 + pulse} o={lit(i) * (1 - pulse) * 0.8}/>)}
    <Box x={0.6} y={0.9} w={1.8} d={1.2} h={0.5} lit={lit(1)}/>
    {[0.9, 2.1].map(x => <polyline points={pts([[x, 1.1, 0.5], [x, 1.1, 1.3]])} stroke={colors.ink} strokeOpacity={0.45} strokeWidth={6} strokeLinecap="round"/>)}
    {[0, 1, 2].map(i => <Box x={5.6} y={0.6} z={i * 0.45} w={1.8} d={1.8} h={0.3} lit={lit(2)}/>)}
    <Box x={0.9} y={5.4} w={1.2} d={2.2} h={0.16} lit={lit(0)}/>
    <polygon points={pts([[1.05, 5.6, 0.16], [1.95, 5.6, 0.16], [1.95, 7.4, 0.16], [1.05, 7.4, 0.16]])} fill={colors.accent} opacity={0.2 + 0.4 * lit(0)}/>
    <Box x={5.7} y={5.7} w={1.6} d={1.6} h={2.6} lit={lit(3)}/>
    {[0.5, 1, 1.5, 2].map(z => { const led = P(6.1, 7.3, z + 0.22); return <g>
      <polyline points={pts([[5.85, 7.3, z], [7.15, 7.3, z]])} stroke={colors.ink} strokeOpacity={0.25} strokeWidth={3} fill="none"/>
      <circle cx={led[0]} cy={led[1]} r={5} fill={lit(3) ? colors.accent : colors.ink} opacity={lit(3) ? 1 : 0.3}/>
    </g>; })}
    <circle cx={pk[0]} cy={pk[1]} r={56} fill="url(#halo)" opacity={moving}/>
    <circle cx={pk[0]} cy={pk[1]} r={12} fill={colors.chalk} opacity={moving}/>
    <Tag x={260} y={720} s="YOU" hot={lit(0)} to={[260, 815]}/>
    <Tag x={540} y={540} s="ROUTER" hot={lit(1)} to={[540, 640]}/>
    <Tag x={820} y={660} s="DNS" hot={lit(2)} to={[820, 740]}/>
    <Tag x={540} y={1200} s="SERVER" hot={lit(3)} to={[540, 1012]}/>
    <line x1={130} y1={300} x2={700} y2={300} stroke={colors.ink} strokeOpacity={0.2} strokeWidth={4}/>
    <line x1={130} y1={300} x2={130 + 190 * k} y2={300} stroke={colors.accent} strokeWidth={4}/>
    {['YOU', 'ROUTER', 'DNS', 'SERVER'].map((s, i) => <g>
      <circle cx={130 + 190 * i} cy={300} r={11} fill={lit(i) ? colors.accent : colors.wall} stroke={colors.accent} strokeWidth={3}/>
      <text x={130 + 190 * i} y={358} textAnchor="middle" fontFamily="mono" fontSize={34} fontWeight={700} letterSpacing={3} fill={colors.ink} opacity={lit(i) ? 1 : 0.45}>{s}</text>
    </g>)}
    <text x={960} y={315} textAnchor="end" fontSize={46} fontWeight={800} fill={colors.accent}>{'≈' + Math.round(go * 100) + 'ms'}</text>
  </svg>;
}`;

const SERVERS = String.raw`export default function Scene({ time, colors }) {
${kit(490, 690, 54)}
  const go = clamp((time - at('biggest')) / (at('servers') - at('biggest') + 0.4));
  const n = Math.round(go * 100);
  const wave = (r, c) => clamp(go * 12 - (r + c) * 1.05);
  return <svg>
    ${DEFS}
    ${GRID}
    <ellipse cx={530} cy={870} rx={470} ry={260} fill="url(#halo)" opacity={0.25 * go}/>
    <Box x={-0.6} y={-0.6} z={-0.4} w={9} d={7.4} h={0.4}/>
    {range(4).map(r => range(6).map(c => { const x = 0.3 + c * 1.3, Y = 1.15 + r * 1.75, lit = wave(r, c); return <g>
      <Box x={x} y={Y - 0.95} w={1} d={0.95} h={1.5} lit={lit}/>
      <polyline points={pts([[x + 0.15, Y, 1.1], [x + 0.85, Y, 1.1]])} stroke={colors.accent} strokeWidth={5} opacity={lit}/>
      <polyline points={pts([[x + 0.15, Y, 0.7], [x + 0.85, Y, 0.7]])} stroke={colors.ink} strokeOpacity={0.25} strokeWidth={3}/>
    </g>; }))}
    <Ring x={3.4} y={5.9} r={0.9} o={go}/>
    <Tag x={380} y={1215} s="1 RACK ≈ 40 SERVERS" hot={go >= 1} to={[328, 955]}/>
    <circle cx={102} cy={292} r={9} fill={colors.accent}/>
    <text x={126} y={304} fontFamily="mono" fontSize={34} fontWeight={700} letterSpacing={3} fill={colors.accent}>ONE DATA CENTRE</text>
    <text x={88} y={480} fontSize={170} fontWeight={800} fill={colors.ink}>{n >= 100 ? '100,000+' : n ? n + ',000' : '0'}</text>
    <text x={94} y={552} fontFamily="mono" fontSize={36} fontWeight={600} letterSpacing={2} fill={colors.ink} opacity={0.6}>SERVERS RUNNING AT ONCE</text>
  </svg>;
}`;

const CODE = String.raw`export default function Scene({ time, colors }) {
${kit(540, 790, 54)}
  const on = w => clamp((time - at(w)) / 0.5), s0 = on('authenticator'), s1 = on('new'), s2 = on('six');
  const flip = easeInOut(clamp((time - at('new') - 0.2) / 0.5));
  const left = 1 - clamp((time - at('new') - 0.2) / 3.6);
  const beam = P(4, 4, 0.2), up = easeOut(s2), tip = beam[1] - (beam[1] - 650) * up, face = P(-0.9, 4.6, 1);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-2.2} y={-2.2} z={-0.5} w={8.6} d={8.6} h={0.5}/>
    <polyline points={pts([[-0.2, 4.6, 0], [2.8, 4.6, 0]])} stroke={colors.accent} strokeWidth={6} opacity={s0}/>
    <polyline points={pts([[4.6, -0.2, 0], [4.6, 1.9, 0]])} stroke={colors.accent} strokeWidth={6} opacity={s1}/>
    <Box x={-1.6} y={3.9} w={1.4} d={1.4} h={1} lit={s0}/>
    <ellipse cx={face[0]} cy={face[1]} rx={50} ry={25} fill="none" stroke={colors.ink} strokeWidth={4} opacity={0.6}/>
    <line x1={face[0]} y1={face[1]} x2={face[0] + 26} y2={face[1] - 9} stroke={colors.ink} strokeWidth={5}/>
    <Box x={3.9} y={-1.6} w={1.4} d={1.4} h={1} lit={s1}/>
    <Ring x={4} y={4} r={2.4 + up * 0.6} o={s2 * (1 - up * 0.5)}/>
    <Box x={2.8} y={1.9} w={2.4} d={4.2} h={0.2} lit={s2}/>
    {range(6).map(i => { const x = 3.25 + (i % 2) * 0.85, y = 2.5 + Math.floor(i / 2) * 1.1; return <polygon points={pts([[x, y, 0.2], [x + 0.65, y, 0.2], [x + 0.65, y + 0.8, 0.2], [x, y + 0.8, 0.2]])} fill={colors.accent} opacity={0.2 + 0.7 * clamp(s2 * 3 - i * 0.4)}/>; })}
    <line x1={540} y1={beam[1]} x2={540} y2={tip} stroke={colors.accent} strokeWidth={6}/>
    <Tag x={243} y={760} s="CLOCK" hot={s0 > 0} to={[243, 820]}/>
    <Tag x={837} y={760} s="SECRET" hot={s1 > 0} to={[837, 820]}/>
    <rect x={120} y={405} width={840} height={245} rx={36} fill={colors.chalk} shadow="0 24 60 rgba(0,0,0,0.45)"/>
    <text x={170} y={478} fontFamily="mono" fontSize={34} fontWeight={700} letterSpacing={3} fill={colors.cardInk} opacity={0.5}>YOUR CODE</text>
    <text x={166} y={598 - 30 * flip} opacity={clamp(1 - flip * 2)} fontSize={112} fontWeight={800} letterSpacing={6} fill={colors.cardInk}>482 913</text>
    <text x={166} y={628 - 30 * flip} opacity={clamp(flip * 2 - 1)} fontSize={112} fontWeight={800} letterSpacing={6} fill={colors.cardInk}>075 266</text>
    <circle cx={850} cy={528} r={62} fill="none" stroke={colors.cardInk} strokeOpacity={0.12} strokeWidth={12}/>
    <circle cx={850} cy={528} r={62} fill="none" stroke={colors.accent} strokeWidth={12} strokeDasharray={390 * left + ' 400'} transform="rotate(-90 850 528)"/>
    <text x={850} y={542} textAnchor="middle" fontSize={40} fontWeight={800} fill={colors.cardInk}>{Math.max(1, Math.round(30 * left))}</text>
    <line x1={130} y1={300} x2={530} y2={300} stroke={colors.ink} strokeOpacity={0.2} strokeWidth={4}/>
    <line x1={130} y1={300} x2={130 + 200 * (s1 + s2)} y2={300} stroke={colors.accent} strokeWidth={4}/>
    {[['CLOCK', s0], ['SECRET', s1], ['CODE', s2]].map((s, i) => <g>
      <circle cx={130 + 200 * i} cy={300} r={11} fill={s[1] > 0 ? colors.accent : colors.wall} stroke={colors.accent} strokeWidth={3}/>
      <text x={130 + 200 * i} y={358} textAnchor="middle" fontFamily="mono" fontSize={34} fontWeight={700} letterSpacing={3} fill={colors.ink} opacity={s[1] > 0 ? 1 : 0.45}>{s[0]}</text>
    </g>)}
    <text x={960} y={315} textAnchor="end" fontSize={46} fontWeight={800} fill={colors.accent}>≈30s</text>
  </svg>;
}`;

const CABLE = String.raw`export default function Scene({ time, colors }) {
${kit(440, 650, 50)}
  const big = easeOut(clamp((time - at('ninety')) / 0.9));
  const land = clamp((time - at('continents')) / 0.4), sea = clamp((time - at('ocean')) / 0.6);
  const cable = pts([[2.6, 3, 0.02], [3, 3, 0.02], [3, 3, -0.9], [7.6, 3, -0.9], [7.6, 3, 0]]);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.4} y={-0.4} z={-1.3} w={10.6} d={6.8} h={0.4}/>
    <Box x={-0.4} y={-0.4} z={-0.9} w={3.4} d={6.8} h={0.9}/>
    <Box x={0.2} y={0.4} w={0.9} d={0.9} h={1.3}/>
    <Box x={0.3} y={4.4} w={0.8} d={0.8} h={0.7}/>
    <Box x={1.6} y={2.4} w={1} d={1.2} h={0.6} lit={land}/>
    <polyline points={cable} fill="none" stroke={colors.ink} strokeOpacity={0.3} strokeWidth={5}/>
    <polyline points={cable} fill="none" stroke={colors.accent} strokeOpacity={0.25} strokeWidth={22} strokeLinejoin="round" opacity={sea}/>
    <polyline points={cable} fill="none" stroke={colors.accent} strokeWidth={6} strokeLinejoin="round" opacity={sea}/>
    {range(4).map(i => { const p = (time * 0.35 + i / 4) % 1, q = P(3 + 4.6 * p, 3, -0.9); return <g opacity={sea * Math.sin(p * 3.14)}>
      <circle cx={q[0]} cy={q[1]} r={34} fill="url(#halo)"/>
      <circle cx={q[0]} cy={q[1]} r={9} fill={colors.chalk}/>
    </g>; })}
    <polygon points={pts([[3, -0.4, -0.1], [7.6, -0.4, -0.1], [7.6, 6.4, -0.1], [3, 6.4, -0.1]])} fill={colors.accent} opacity={0.06}/>
    <Box x={7.6} y={-0.4} z={-0.9} w={2.6} d={6.8} h={0.9}/>
    <Box x={8.2} y={2.4} w={1} d={1.2} h={0.6} lit={land}/>
    <Box x={8.9} y={0.2} w={0.8} d={0.8} h={1.1}/>
    <Box x={8.6} y={4.6} w={0.9} d={0.9} h={0.8}/>
    <Ring x={2.1} y={3} r={0.9 + 0.3 * sea} o={land * 0.8}/>
    <Ring x={8.7} y={3} r={0.9 + 0.3 * sea} o={land * 0.8}/>
    <Tag x={220} y={590} s="EUROPE" hot={land > 0} to={[395, 741]}/>
    <Tag x={790} y={1230} s="AMERICA" hot={land > 0} to={[725, 906]}/>
    <Tag x={350} y={1120} s="6,000 KM CABLE" hot={sea > 0} to={[520, 894]}/>
    <text x={960} y={500} textAnchor="end" fontSize={210} fontWeight={800} fill={colors.ink} opacity={clamp(big * 3)}>{Math.round(big * 99) + '%'}</text>
    <text x={960} y={570} textAnchor="end" fontFamily="mono" fontSize={36} fontWeight={600} letterSpacing={2} fill={colors.accent}>OF DATA BETWEEN</text>
    <text x={960} y={620} textAnchor="end" fontFamily="mono" fontSize={36} fontWeight={600} letterSpacing={2} fill={colors.accent}>CONTINENTS</text>
  </svg>;
}`;

const EDGE = String.raw`export default function Scene({ time, colors }) {
${kit(540, 690, 48)}
  const copy = clamp((time - at('copy')) / 1.2), near = clamp((time - at('near')) / 0.4);
  const got = clamp((time - at('arrives')) / 0.8), done = clamp((time - at('milliseconds')) / 0.4);
  const hop = pts([[7.1, 5, 0], [7.1, 6.8, 0]]);
  const c = P(1.7 + 5.4 * copy, 1.7 + 2.6 * copy, 2.4 + Math.sin(copy * 3.14) * 1.5), q = P(7.1, 5 + 1.8 * got, 0.3);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.2} y={-0.2} z={-0.4} w={9.4} d={9.4} h={0.4}/>
    <polyline points={pts([[1.7, 2.4, 0], [1.7, 7.8, 0], [6.5, 7.8, 0]])} fill="none" stroke={colors.ink} strokeOpacity={0.3} strokeWidth={4} strokeDasharray="10 12"/>
    <polyline points={hop} fill="none" stroke={colors.accent} strokeOpacity={0.25} strokeWidth={22} opacity={got}/>
    <polyline points={hop} fill="none" stroke={colors.accent} strokeWidth={6} opacity={near}/>
    <Box x={1} y={1} w={1.4} d={1.4} h={2.2}/>
    {[[3.2, 0.6, 0.6], [4.6, 1.2, 0.9], [2.6, 4.2, 0.5], [8, 1.6, 0.7], [4.4, 5.6, 0.4]].map(b => <Box x={b[0]} y={b[1]} w={1} d={1} h={b[2]}/>)}
    <Ring x={7.1} y={4.3} r={1.2 + near * 0.4} o={near * (1 - got * 0.6)}/>
    <Box x={6.4} y={3.6} w={1.4} d={1.4} h={1.2} lit={near}/>
    <Ring x={7.1} y={7.8} r={1.4} o={done * 0.8}/>
    <Box x={6.5} y={6.8} w={1.2} d={2} h={0.15} lit={done}/>
    <circle cx={c[0]} cy={c[1]} r={50} fill="url(#halo)" opacity={copy > 0 && copy < 1 ? 1 : 0}/>
    <rect x={c[0] - 22} y={c[1] - 16} width={44} height={32} rx={6} fill={colors.chalk} opacity={copy > 0 && copy < 1 ? 1 : 0}/>
    <circle cx={q[0]} cy={q[1]} r={46} fill="url(#halo)" opacity={got > 0 && got < 1 ? 1 : 0}/>
    <circle cx={q[0]} cy={q[1]} r={11} fill={colors.chalk} opacity={got > 0 && got < 1 ? 1 : 0}/>
    <Tag x={240} y={770} s="ORIGIN · 180MS" hot={false} to={[473, 715]}/>
    <Tag x={830} y={830} s="EDGE · 20MS" hot={near > 0} to={[700, 880]}/>
    <Tag x={300} y={1110} s="YOU" hot={done > 0} to={[475, 1034]}/>
    <rect x={120} y={380} width={840} height={230} rx={30} fill={colors.chalk} shadow="0 24 60 rgba(0,0,0,0.45)"/>
    {[0, 1, 2].map(i => <circle cx={160 + i * 30} cy={418} r={9} fill={colors.cardInk} opacity={0.2}/>)}
    <rect x={270} y={398} width={400} height={40} rx={20} fill={colors.cardInk} opacity={0.08}/>
    {[[462, 760, 70], [552, 520, 22], [584, 360, 22]].map(r => <g>
      <rect x={160} y={r[0]} width={r[1]} height={r[2]} rx={11} fill={colors.cardInk} opacity={0.06}/>
      <rect x={160} y={r[0]} width={r[1] * got} height={r[2]} rx={11} fill={r[2] > 50 ? colors.accent : colors.cardInk} opacity={r[2] > 50 ? 1 : 0.22}/>
    </g>)}
    <text x={130} y={318} fontFamily="mono" fontSize={34} fontWeight={700} letterSpacing={3} fill={colors.ink} opacity={0.6}>PAGE LOAD</text>
    <text x={960} y={325} textAnchor="end" fontSize={46} fontWeight={800} fill={colors.accent}>{'≈' + (done > 0 ? 20 : Math.round(180 - 160 * got)) + 'ms'}</text>
  </svg>;
}`;

// The style's reference video (reference.mjs): "How Shazam hears your song", one real system everyone has used,
// told stage by stage under a step tracker (LISTEN · MAP · CODES · SEND · MATCH) that stays on screen, every scene on
// the whole frame in the kit above and a new set per stage. A new video in this style remakes it.
// The tracker every scene draws: a stop lights once `k` (0–4, the scene's own) reaches it; the readout on the right.
const TRACK = (note, o = '1') => String.raw`<line x1={130} y1={300} x2={650} y2={300} stroke={colors.ink} strokeOpacity={0.2} strokeWidth={4}/>
    <line x1={130} y1={300} x2={130 + 130 * k} y2={300} stroke={colors.accent} strokeWidth={4}/>
    {['LISTEN', 'MAP', 'CODES', 'SEND', 'MATCH'].map((s, i) => <g opacity={k >= i ? 1 : 0.45}>
      <circle cx={130 + 130 * i} cy={300} r={11} fill={k >= i ? colors.accent : colors.wall} stroke={colors.accent} strokeWidth={3}/>
      <text x={130 + 130 * i} y={358} textAnchor="middle" fontFamily="mono" fontSize={34} fontWeight={700} letterSpacing={2} fill={colors.ink}>{s}</text>
    </g>)}${note ? `
    <text x={960} y={313} textAnchor="end" fontSize={36} fontWeight={800} fill={colors.accent} opacity={${o}}>${note}</text>` : ''}`;

// Opens on the end state (a match on the phone, every stop lit), then rewinds the tracker to LISTEN on the question.
const HOOK = String.raw`export default function Scene({ time, colors }) {
${kit(540, 780, 54)}
  const r = easeInOut(clamp((time - at('so')) / (at('hear') - at('so') + 0.3))), k = 4 - 4 * r, card = 1 - r;
  const b = easeOut(clamp((time - at('billion')) / 0.4)), hum = clamp((time - at('noise')) / 0.5), q = (time * 0.8) % 1;
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.3} y={-0.3} z={-0.4} w={7.6} d={7.6} h={0.4}/>
    {range(14).map(i => { const c = P(0.3 + (i * 2.3) % 6.8, 0.3 + (i * 3.7) % 6.8, 0); return <circle cx={c[0]} cy={c[1]} r={7 + (i % 3) * 4} fill={colors.rose} opacity={hum * 0.7}/>; })}
    <Ring x={3.5} y={3.4} r={1.6 + q * 1.6} o={card * (1 - q) * 0.8}/>
    <Box x={2.5} y={1.7} w={2} d={3.4} h={0.2} lit={card}/>
    <polygon points={pts([[2.65, 1.9, 0.2], [4.35, 1.9, 0.2], [4.35, 4.9, 0.2], [2.65, 4.9, 0.2]])} fill={colors.accent} opacity={0.15 + 0.4 * card}/>
    {range(7).map(i => <polyline points={pts([[2.8 + i * 0.24, 3.9, 0.2], [2.8 + i * 0.24, 3.9, 0.2 + (0.15 + 0.5 * Math.abs(Math.sin(time * 4 + i * 1.7))) * card]])} stroke={colors.chalk} strokeWidth={8} strokeLinecap="round" opacity={card}/>)}
    <g opacity={card}>
      <line x1={540} y1={830} x2={540} y2={925} stroke={colors.accent} strokeWidth={3}/>
      <rect x={250} y={680} width={580} height={150} rx={28} fill={colors.chalk} shadow="0 24 60 rgba(0,0,0,0.45)"/>
      <rect x={285} y={710} width={90} height={90} rx={14} fill={colors.accent} opacity={0.35}/>
      <rect x={400} y={722} width={210} height={28} rx={14} fill={colors.cardInk} opacity={0.75}/>
      <rect x={400} y={766} width={140} height={22} rx={11} fill={colors.cardInk} opacity={0.3}/>
      <rect x={636} y={727} width={160} height={56} rx={28} fill={colors.accent}/>
      <text x={716} y={767} textAnchor="middle" fontFamily="mono" fontSize={34} fontWeight={700} fill={colors.cardInk}>MATCH</text>
    </g>
    <text x={88} y={565} fontSize={190} fontWeight={800} fill={colors.ink} opacity={0.8 + 0.2 * b}>100B+</text>
    <rect x={94} y={588} width={540 * b} height={8} rx={4} fill={colors.accent}/>
    <text x={94} y={640} fontFamily="mono" fontSize={36} fontWeight={600} letterSpacing={2} fill={colors.accent}>SONG RECOGNITIONS SINCE 2002</text>
    ${TRACK('')}
  </svg>;
}`;

// The scenario: a busy café, the song from its speaker, chatter from the tables, and one tap on your phone.
const CAFE = String.raw`export default function Scene({ time, colors }) {
${kit(540, 730, 56)}
  const k = 0, song = clamp((time - at('song')) / 0.4), tap = clamp((time - at('tap')) / 0.3), up = easeOut(clamp((time - at('names')) / 0.5));
  const q = (time * 0.7) % 1, sp = P(1, 2.1, 2.2), ph = P(6.2, 5.7, 0.84);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.4} y={-0.4} z={-0.4} w={8.2} d={8.2} h={0.4}/>
    {[0, 0.33, 0.66].map(o => { const f = (q + o) % 1; return <Ring x={1} y={2.1} r={1 + 4 * f} o={song * (1 - f) * 0.8}/>; })}
    <Box x={0.2} y={0.6} w={1.4} d={5.4} h={1.1}/>
    <Box x={0.5} y={1.6} z={1.1} w={1} d={1} h={1.1} lit={song}/>
    {[[2.4, 4.8], [5, 1.4]].map(t => { const c = P(t[0] + 0.7, t[1] + 0.7, 0.8); return <g>
      <Box x={t[0]} y={t[1]} w={1.4} d={1.4} h={0.8}/>
      <Box x={t[0] + 0.3} y={t[1] + 0.5} z={0.8} w={0.3} d={0.3} h={0.3}/>
      {[0, 0.5].map(o => { const f = (q + o) % 1; return <ellipse cx={c[0]} cy={c[1]} rx={60 + 80 * f} ry={30 + 40 * f} fill="none" stroke={colors.rose} strokeWidth={3} opacity={0.7 * (1 - f)}/>; })}
    </g>; })}
    <Box x={5.4} y={4.9} w={1.6} d={1.6} h={0.8}/>
    <Box x={5.6} y={6} z={0.8} w={0.3} d={0.3} h={0.3}/>
    <Box x={5.85} y={5.15} z={0.8} w={0.7} d={1.1} h={0.06} lit={tap}/>
    <Ring x={6.2} y={5.7} z={0.86} r={0.8 + q * 0.6} o={tap * (1 - q)}/>
    <g opacity={up} transform={'translate(0 ' + (1 - up) * 40 + ')'}>
      <line x1={600} y1={590} x2={ph[0]} y2={ph[1] - 10} stroke={colors.accent} strokeWidth={3} strokeDasharray="8 8"/>
      <rect x={300} y={430} width={480} height={160} rx={28} fill={colors.chalk} shadow="0 24 60 rgba(0,0,0,0.45)"/>
      <rect x={334} y={465} width={90} height={90} rx={14} fill={colors.accent} opacity={0.35}/>
      <rect x={450} y={478} width={260} height={28} rx={14} fill={colors.cardInk} opacity={0.75}/>
      <rect x={450} y={522} width={170} height={22} rx={11} fill={colors.cardInk} opacity={0.3}/>
      <rect x={800} y={445} width={150} height={64} rx={32} fill="none" stroke={colors.accent} strokeWidth={3}/>
      <text x={875} y={489} textAnchor="middle" fontFamily="mono" fontSize={36} fontWeight={700} fill={colors.accent}>HOW?</text>
    </g>
    <Tag x={220} y={640} s="SPEAKER" hot={song > 0} to={[sp[0] - 20, sp[1]]}/>
    <Tag x={820} y={1230} s="YOU" hot={tap > 0} to={[ph[0] + 30, ph[1] + 20]}/>
    ${TRACK('IN SECONDS')}
  </svg>;
}`;

// Step 1: the clip's sound scanned into a field of time against pitch; the haze fades and only its loudest points rise.
const STARS = String.raw`export default function Scene({ time, colors }) {
${kit(520, 640, 56)}
  const s = clamp((time - at('sound')) / (at('loudest') - at('sound'))), L = easeOut(clamp((time - at('loudest')) / 0.6)), k = clamp((time - at('star')) / 0.5);
  const S = [[0.5, 3.4], [1.2, 1.1], [1.9, 4.3], [2.5, 2.2], [3.2, 0.7], [3.8, 3.3], [4.3, 5], [4.9, 1.6], [5.5, 3.9], [6.1, 0.9], [6.6, 2.8], [7.2, 4.6], [7.6, 1.8]];
  const wav = n => range(n).map(i => (130 + i * 13) + ',' + (470 + Math.sin(i * 1.9) * Math.sin(i * 0.37) * 60)).join(' ');
  return <svg>
    ${DEFS}
    ${GRID}
    <polyline points={wav(64)} fill="none" stroke={colors.ink} strokeOpacity={0.3} strokeWidth={4} strokeLinejoin="round"/>
    <polyline points={wav(Math.ceil(s * 64))} fill="none" stroke={colors.accent} strokeWidth={4} strokeLinejoin="round" opacity={1 - 0.6 * L}/>
    <text x={950} y={592} textAnchor="end" fontFamily="mono" fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.ink} opacity={0.6}>SHAZAM PAPER · 2003</text>
    <Box x={-0.4} y={-0.4} z={-0.4} w={8.8} d={8.6} h={0.4}/>
    <Box x={0} y={0} w={8} d={5.6} h={0.06}/>
    {range(8).map(i => range(6).map(j => <polygon points={pts([[i, j * 0.93, 0.06], [i + 1, j * 0.93, 0.06], [i + 1, j * 0.93 + 0.93, 0.06], [i, j * 0.93 + 0.93, 0.06]])} fill={colors.accent} opacity={(i < s * 8 ? 0.05 * ((i * 7 + j * 5) % 6) : 0) * (1 - L)}/>))}
    <polyline points={pts([[0, 5.9, 0], [8, 5.9, 0]])} stroke={colors.accent} strokeWidth={4} opacity={s > 0 ? 1 : 0.3}/>
    <polyline points={pts([[-0.3, 5.6, 0], [-0.3, 0, 0]])} stroke={colors.accent} strokeWidth={4} opacity={s > 0 ? 1 : 0.3}/>
    <polyline points={pts([[s * 8, 0, 0.06], [s * 8, 5.6, 0.06]])} stroke={colors.accent} strokeWidth={5} opacity={s > 0 && s < 1 ? 1 : 0}/>
    {S.map(p => { const u = clamp(L * 3 - p[0] / 4), c = P(p[0] + 0.14, p[1] + 0.14, 0.06 + 0.5 * u); return <g opacity={u}>
      <Box x={p[0]} y={p[1]} z={0.06} w={0.28} d={0.28} h={0.5 * u} lit={1}/>
      <circle cx={c[0]} cy={c[1]} r={30} fill="url(#halo)"/>
      <circle cx={c[0]} cy={c[1]} r={7} fill={colors.chalk}/>
    </g>; })}
    <Box x={0.6} y={6.5} w={0.9} d={1.4} h={0.12} lit={1}/>
    <Tag x={760} y={1130} s="TIME" hot={s > 0} to={P(5, 5.9, 0)}/>
    <Tag x={180} y={630} s="PITCH" hot={s > 0} to={P(-0.3, 2.2, 0)}/>
    <Tag x={330} y={1230} s="LOUDEST POINTS" hot={L > 0} to={P(4.4, 5.1, 0.5)}/>
    ${TRACK('IN SECONDS')}
  </svg>;
}`;

// Step 2: an anchor star pairs with the stars in its target zone, and each pair packs into one 32-bit code.
const CODES = String.raw`export default function Scene({ time, colors }) {
${kit(540, 760, 64)}
  const a = clamp((time - at('nearby')) / 0.4), f = easeOut(clamp((time - at('pair')) / 0.6)), c = clamp((time - at('pair')) / 0.4);
  const n = Math.floor(32 * clamp((time - at('thirty')) / 0.8)), done = clamp((time - at('code')) / 0.4), k = 1 + clamp((time - at('then')) / 0.5);
  const A = [1.4, 2.6], Z = [[3.4, 1.4], [4.2, 3.3], [5, 2.2]], O = [[0.6, 0.8], [0.8, 4.2], [2.6, 4.6], [5.9, 0.6], [6.2, 4.4], [2.2, 0.5]], a0 = P(A[0], A[1], 0.3);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.3} y={-0.3} z={-0.4} w={7.6} d={5.6} h={0.4}/>
    <polygon points={pts([[2.9, 0.8, 0.02], [5.6, 0.8, 0.02], [5.6, 4, 0.02], [2.9, 4, 0.02]])} fill={colors.accent} fillOpacity={0.08} stroke={colors.accent} strokeWidth={3} strokeDasharray="12 10" opacity={a}/>
    {Z.map(z => { const b = P(z[0], z[1], 0.3); return <line x1={a0[0]} y1={a0[1]} x2={a0[0] + (b[0] - a0[0]) * f} y2={a0[1] + (b[1] - a0[1]) * f} stroke={colors.accent} strokeWidth={5}/>; })}
    {[A, ...Z, ...O].map((p, i) => { const q = P(p[0], p[1], 0.3), on = i < 4; return <g>
      <Box x={p[0] - 0.14} y={p[1] - 0.14} w={0.28} d={0.28} h={0.3} lit={on ? a : 0}/>
      <circle cx={q[0]} cy={q[1]} r={i ? 28 : 54} fill="url(#halo)" opacity={on ? 0.4 + 0.6 * a : 0.4}/>
      <circle cx={q[0]} cy={q[1]} r={i ? 6 : 10} fill={colors.chalk}/>
    </g>; })}
    {range(3).map(i => <Box x={6.2} y={1.4} z={i * 0.26} w={0.9} d={1.6} h={0.18} lit={clamp(done * 3 - i)}/>)}
    <g opacity={c}>
      <rect x={120} y={410} width={840} height={270} rx={30} fill={colors.chalk} shadow="0 24 60 rgba(0,0,0,0.45)"/>
      <text x={160} y={476} fontFamily="mono" fontSize={40} fontWeight={700} fill={colors.cardInk} opacity={clamp((time - at('pitches')) / 0.3)}>PITCH · PITCH</text>
      <text x={496} y={476} fontFamily="mono" fontSize={40} fontWeight={700} fill={colors.cardInk} opacity={clamp((time - at('gap')) / 0.3)}>· GAP</text>
      {range(32).map(i => <rect x={160 + i * 24.6} y={516} width={20} height={74} rx={4} fill={i < n && (i * 7 + 3) % 5 < 2 ? colors.accent : colors.cardInk} opacity={i < n ? ((i * 7 + 3) % 5 < 2 ? 1 : 0.3) : 0.08}/>)}
      <text x={160} y={652} fontFamily="mono" fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.cardInk} opacity={0.5}>SHAZAM PAPER · 2003</text>
    </g>
    <Tag x={250} y={1160} s="ANCHOR" hot={a > 0} to={[a0[0], a0[1] + 14]}/>
    <Tag x={790} y={1230} s="32-BIT CODE" hot={done > 0} to={P(6.65, 2.2, 0.3)}/>
    ${TRACK('IN SECONDS')}
  </svg>;
}`;

// Step 3: what travels. The recording stays on the phone; a fingerprint a tenth its height goes to the servers.
const SEND = String.raw`export default function Scene({ time, colors }) {
${kit(500, 760, 56)}
  const go = easeInOut(clamp((time - at('fingerprint')) / (at('ten') - at('fingerprint')))), no = clamp((time - at('recording')) / 0.4);
  const ten = easeOut(clamp((time - at('ten')) / 0.5)), k = 2 + clamp((time - at('sends')) / 0.5);
  const R = [[2.6, 4.6], [2.6, 1.9], [7.2, 1.9]], d = go * 7.3, h = d < 2.7 ? [2.6, 4.6 - d] : [2.6 + d - 2.7, 1.9];
  const fp = P(h[0], h[1], 0.3), x = P(2.6, 6.2, 1.6);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.4} y={-0.4} z={-0.4} w={9.4} d={8} h={0.4}/>
    <polyline points={pts(R.map(p => [p[0], p[1], 0]))} fill="none" stroke={colors.ink} strokeOpacity={0.3} strokeWidth={4} strokeDasharray="10 12"/>
    <polyline points={pts([...R.slice(0, d < 2.7 ? 1 : 2), h].map(p => [p[0], p[1], 0]))} fill="none" stroke={colors.accent} strokeWidth={6} strokeLinejoin="round" opacity={go > 0 ? 1 : 0}/>
    {range(3).map(i => <Box x={7.6} y={0.3 + i * 1.2} w={1} d={0.9} h={2.4} lit={go >= 1 ? 1 : 0}/>)}
    <Box x={0.5} y={5.2} w={1} d={1.6} h={0.12} lit={1}/>
    <g opacity={1 - 0.6 * no}><Box x={2.2} y={5.8} w={0.8} d={0.8} h={3}/></g>
    <g opacity={no} stroke={colors.rose} strokeWidth={8} strokeLinecap="round">
      <line x1={x[0] - 34} y1={x[1] - 34} x2={x[0] + 34} y2={x[1] + 34}/>
      <line x1={x[0] + 34} y1={x[1] - 34} x2={x[0] - 34} y2={x[1] + 34}/>
    </g>
    <circle cx={fp[0]} cy={fp[1]} r={60} fill="url(#halo)" opacity={go > 0 && go < 1 ? 1 : 0}/>
    <Box x={h[0] - 0.4} y={h[1] - 0.4} w={0.8} d={0.8} h={0.3} lit={1}/>
    <Tag x={260} y={1230} s="YOUR RECORDING" hot={false} to={P(2.6, 6.6, 0)}/>
    <Tag x={740} y={760} s="FINGERPRINT" hot={go > 0} to={[fp[0], fp[1] - 20]}/>
    <Tag x={820} y={1180} s="SERVERS" hot={go >= 1} to={P(8.1, 3.3, 0)}/>
    <g opacity={ten}>
      <text x={88} y={590} fontSize={170} fontWeight={800} fill={colors.ink}>{'≥' + Math.round(1 + 9 * ten) + '×'}</text>
      <text x={94} y={655} fontFamily="mono" fontSize={36} fontWeight={600} letterSpacing={2} fill={colors.accent}>SMALLER THAN THE AUDIO</text>
    </g>
    ${TRACK('IN SECONDS')}
  </svg>;
}`;

// Step 4: the clip's codes on a see-through tile slide along a song's strip until most of them land on its codes.
const MATCH = String.raw`export default function Scene({ time, colors }) {
${kit(540, 700, 56)}
  const m = clamp((time - at('millions')) / 0.5), s = easeInOut(clamp((time - at('tracks')) / (at('line') - at('tracks') + 0.2)));
  const hit = easeOut(clamp((time - at('line')) / 0.5)), k = 3 + clamp((time - at('finally')) / 0.5), o = (s - 1) * 3.4;
  const D = range(13).map(i => [0.4 + i * 0.55, 4.2 + ((i * 5) % 7) * 0.09]);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.4} y={-0.4} z={-0.4} w={9.6} d={7.2} h={0.4}/>
    {range(5).map(i => <Box x={0.4 + i * 1.6} y={0.3} w={1.2} d={1} h={2.6} lit={clamp(m * 5 - i)}/>)}
    <Box x={0} y={4} w={7.4} d={1} h={0.12}/>
    {D.map((p, i) => { const c = P(p[0], p[1], 0.12), on = i > 5 && i < 11 ? hit : 0; return <circle cx={c[0]} cy={c[1]} r={10} fill={on ? colors.accent : colors.ink} opacity={0.5 + 0.5 * on}/>; })}
    <polygon points={pts([[3.4 + o, 3.9, 0.35], [6.2 + o, 3.9, 0.35], [6.2 + o, 5.1, 0.35], [3.4 + o, 5.1, 0.35]])} fill={colors.accent} fillOpacity={0.12} stroke={colors.accent} strokeWidth={3} opacity={clamp(s * 6)}/>
    {D.slice(6, 11).map(p => { const c = P(p[0] + o, p[1], 0.35); return <g opacity={clamp(s * 6)}>
      <circle cx={c[0]} cy={c[1]} r={40} fill="url(#halo)" opacity={hit}/>
      <circle cx={c[0]} cy={c[1]} r={10} fill={colors.chalk}/>
    </g>; })}
    <Ring x={8.4} y={4.5} r={0.9 + 0.4 * hit} o={hit * 0.8}/>
    <Box x={8.1} y={4.2} w={0.6} d={0.6} h={0.2 + 3 * hit} lit={hit}/>
    <Tag x={330} y={600} s="MILLIONS OF TRACKS" hot={m > 0} to={P(1, 0.3, 2.6)}/>
    <Tag x={790} y={1230} s="MOST LINE UP" hot={hit > 0} to={P(8.4, 4.8, 0)}/>
    <text x={94} y={1150} fontFamily="mono" fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.ink} opacity={0.6}>SHAZAM PAPER · 2003</text>
    ${TRACK('IN SECONDS')}
  </svg>;
}`;

// The twist: noise floods the star field and most codes drop away, yet the few left still line up.
const GARBLED = String.raw`export default function Scene({ time, colors }) {
${kit(560, 760, 52)}
  const g = clamp((time - at('garbled')) / 0.6), f = easeInOut(clamp((time - at('match')) / (at('percent') - at('match'))));
  const left = clamp((time - at('left')) / 0.4), k = 4, keep = i => i % 9 === 4, v = Math.round(100 - 98 * f);
  const C = range(24).map(i => [0.5 + (i * 2.9) % 6.8, 0.5 + (i * 4.3) % 6.6]);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.3} y={-0.3} z={-0.4} w={7.8} d={7.6} h={0.4}/>
    {range(40).map(i => { const c = P((i * 1.7) % 7.4, (i * 2.3) % 7.2, 0); return <circle cx={c[0]} cy={c[1]} r={6 + (i % 4) * 3} fill={colors.rose} opacity={g * 0.6}/>; })}
    {C.map((p, i) => keep(i) ? null : <g opacity={1 - f}><Box x={p[0]} y={p[1]} z={-0.4 * f} w={0.32} d={0.32} h={0.3} lit={1 - g}/></g>)}
    <polyline points={pts(C.filter((p, i) => keep(i)).map(p => [p[0] + 0.16, p[1] + 0.16, 0.3]))} fill="none" stroke={colors.accent} strokeWidth={4} opacity={left}/>
    {C.filter((p, i) => keep(i)).map(p => { const c = P(p[0] + 0.16, p[1] + 0.16, 0.3); return <g>
      <Box x={p[0]} y={p[1]} w={0.32} d={0.32} h={0.3} lit={1}/>
      <circle cx={c[0]} cy={c[1]} r={44} fill="url(#halo)"/>
      <circle cx={c[0]} cy={c[1]} r={8} fill={colors.chalk}/>
    </g>; })}
    <Tag x={330} y={1230} s="15-SECOND GARBLED CLIP" hot={g > 0} to={P(4.6, 6.8, 0)}/>
    <Tag x={830} y={1130} s="MATCH" hot={left > 0} to={P(5.46, 4.66, 0.3)}/>
    <text x={88} y={565} fontSize={190} fontWeight={800} fill={colors.ink}>{f >= 1 ? '1–2%' : v + '%'}</text>
    <text x={94} y={630} fontFamily="mono" fontSize={36} fontWeight={600} letterSpacing={2} fill={colors.accent}>OF ITS CODES LEFT</text>
    <text x={94} y={680} fontFamily="mono" fontSize={34} fontWeight={600} letterSpacing={2} fill={colors.ink} opacity={0.6}>SHAZAM PAPER · 2003</text>
    ${TRACK('IN SECONDS')}
  </svg>;
}`;

// The callback recap: one path back through the café table, a star tile, a code stack and a rack, the café card landing.
const RECAP = String.raw`export default function Scene({ time, colors }) {
${kit(540, 770, 56)}
  const t = [at('noise'), at('stars'), at('codes'), at('name')], go = clamp((time - t[0]) / (t[3] - t[0])), k = 4 * go;
  const lit = i => clamp((time - t[i]) / 0.3), sec = clamp((time - at('seconds')) / 0.4), up = easeOut(clamp((time - t[3]) / 0.5));
  const N = [[1, 6.4], [1, 3], [4.4, 3], [4.4, 0.4]], seg = Math.min(2, Math.floor(go * 3)), f = go * 3 - seg;
  const now = [N[seg][0] + (N[seg + 1][0] - N[seg][0]) * f, N[seg][1] + (N[seg + 1][1] - N[seg][1]) * f], pk = P(now[0], now[1], 0.3);
  return <svg>
    ${DEFS}
    ${GRID}
    <Box x={-0.4} y={-0.4} z={-0.4} w={8.4} d={8.2} h={0.4}/>
    <polyline points={pts(N.map(n => [n[0], n[1], 0]))} fill="none" stroke={colors.ink} strokeOpacity={0.3} strokeWidth={4} strokeDasharray="10 12"/>
    <polyline points={pts([...N.slice(0, seg + 1), now].map(n => [n[0], n[1], 0]))} fill="none" stroke={colors.accent} strokeWidth={6} opacity={go > 0 ? 1 : 0}/>
    <Box x={0.3} y={5.7} w={1.4} d={1.4} h={0.7} lit={lit(0)}/>
    <Box x={0.65} y={5.95} z={0.7} w={0.7} d={0.9} h={0.06} lit={lit(0)}/>
    <Box x={0.3} y={2.3} w={1.4} d={1.4} h={0.08} lit={lit(1)}/>
    {[[0.6, 2.6], [1.3, 2.9], [0.8, 3.3], [1.4, 3.4]].map(p => { const c = P(p[0], p[1], 0.08); return <circle cx={c[0]} cy={c[1]} r={7} fill={colors.chalk} opacity={0.3 + 0.7 * lit(1)}/>; })}
    {range(3).map(i => <Box x={3.8} y={2.4} z={i * 0.24} w={1.2} d={1.2} h={0.16} lit={lit(2)}/>)}
    <Box x={3.9} y={-0.1} w={1} d={1} h={2.2} lit={lit(3)}/>
    <circle cx={pk[0]} cy={pk[1]} r={50} fill="url(#halo)" opacity={go > 0 && go < 1 ? 1 : 0}/>
    <circle cx={pk[0]} cy={pk[1]} r={11} fill={colors.chalk} opacity={go > 0 && go < 1 ? 1 : 0}/>
    <g opacity={up} transform={'translate(0 ' + (1 - up) * 40 + ')'}>
      <rect x={180} y={430} width={720} height={160} rx={28} fill={colors.chalk} shadow="0 24 60 rgba(0,0,0,0.45)"/>
      <rect x={214} y={465} width={90} height={90} rx={14} fill={colors.accent}/>
      <rect x={330} y={478} width={250} height={28} rx={14} fill={colors.cardInk} opacity={0.75}/>
      <rect x={330} y={522} width={160} height={22} rx={11} fill={colors.cardInk} opacity={0.3}/>
      <g opacity={sec}>
        <rect x={680} y={482} width={190} height={56} rx={28} fill={colors.accent}/>
        <text x={775} y={522} textAnchor="middle" fontFamily="mono" fontSize={34} fontWeight={700} fill={colors.cardInk}>SHARE</text>
      </g>
    </g>
    <Tag x={220} y={1200} s="CAFÉ" hot={lit(0) > 0} to={P(1, 7.1, 0)}/>
    <Tag x={830} y={1150} s="MATCH" hot={lit(3) > 0} to={P(4.9, 0.9, 0)}/>
    ${TRACK('IN SECONDS', '0.4 + 0.6 * sec')}
  </svg>;
}`;

// The use case this style was modelled on: how a real system everyone uses works, a scale hook and "so how does…?", an
// "imagine you're…" scenario, First / Then / Next / Finally steps, a twist and a callback recap, in eight scenes (every
// style's reference keeps to seven or eight); the share ask rides in the caption, its chip landing on the recap's card.
// Every number here is real. 100 billion recognitions since the 2002 launch: Apple Newsroom, "Shazam hits 100 billion
// song recognitions" (Nov 20, 2024). "Millions of tracks", matched "within seconds": shazam.com/company. The method
// (beats 3, 4, 6 and 7) is Shazam's published one, Avery Li-Chun Wang, "An Industrial-Strength Audio Search
// Algorithm" (ISMIR 2003): spectrogram peaks whose constellation maps "resemble a star field" (§2.1), anchor points
// paired with points in a target zone, each pair's two frequencies and time difference packed into a 32-bit hash
// (§2.2), a match as the most hashes lining up at one time offset, like a transparent strip slid along a song's (§2.1,
// §2.3), and a heavily corrupted 15-second sample matched with only about 1–2% of its hash tokens surviving (§3.1).
// Apple doesn't say what today's signature is made of, so the paper is credited on screen ("SHAZAM PAPER · 2003")
// wherever its method is shown: the star map, the code card, the strip the codes line up on and the twist (beats 3,
// 4, 6 and 7).
// What the app sends today (beat 5) is Apple's: a signature, not the audio, at least an order of magnitude smaller
// (WWDC21 session 10044, "Explore ShazamKit"), the song's "unique audio fingerprint" (apple.com/legal/privacy, Shazam
// Music Recognition & Privacy). The café is invented and no logo is drawn. Bump `id` whenever the video changes (a place is text only: it changes no frame).
const REFERENCE = {
  id: 'isometric-2',
  title: 'How Shazam hears your song',
  caption: "Shazam has named songs over 100 billion times. What's the last song you Shazamed? Share this with the friend who Shazams every song they hear.",
  beats: [
    { label: 'Over 100 billion recognitions', line: 'Shazam has named songs a hundred billion times, so how does it hear yours through noise?', source: HOOK, place: 'a phone on a plinth under a lit match card' },
    { label: 'A song in a busy café', line: "Imagine you're in a busy café, a song comes on, and one tap names it.", source: CAFE, place: 'a busy café corner: counter speaker, tables, your phone' },
    { label: 'A star map of the loudest points', line: 'First, behind that tap, the sound becomes a star map of its loudest points.', source: STARS, place: 'a time-by-pitch field where the loudest points rise' },
    { label: 'Pairs become 32-bit codes', line: "Then nearby stars pair up, and each pair's pitches and time gap become one thirty-two-bit code.", source: CODES, place: "an anchor star's target zone, a 32-bit code card above" },
    { label: 'A fingerprint, not your audio', line: "Next, your phone sends a fingerprint, not your recording, and it's at least ten times smaller.", source: SEND, place: 'your phone and recording, a path to a row of server racks' },
    { label: 'The codes line up in time', line: 'Finally, Shazam searches millions of tracks for the one where the most codes line up in time.', source: MATCH, place: 'a long song strip with a see-through clip tile sliding' },
    { label: 'About 1–2% of codes is enough', line: 'Even a badly garbled clip can match with about one or two percent of its codes left.', source: GARBLED, place: 'the star field flooded with noise, a few codes still lit' },
    { label: 'Noise, stars, codes, a name', line: 'So that café song went from noise to stars to codes to a name, in seconds.', source: RECAP, place: 'one path through café table, star tile, codes and a rack' },
  ],
};

// What every Isometric network video keeps, what its topic brings, and what it never copies from the reference video.
const IDENTITY = {
  constant: [
    'Small isometric worlds on deep navy: 2:1 projection on a raised plinth, built from the kit (P(), Box, Ring, Tag), every block with three shaded faces',
    "One accent does the lighting: a block's top glows when it's named, glowing paths join blocks and a bright packet travels them, rings pulse out from what's active",
    'A step tracker across the top when the story is a journey: dots on a line, short uppercase mono labels, a timer or count on the right in the accent',
    'Uppercase mono tags in rounded chips with thin leader lines; now and then a chalk UI card or a huge number over a short uppercase line',
    'Calm, precise motion: things light up and travel, the camera never moves, never a bounce',
    'A centred karaoke caption line (drawn for you)',
  ],
  topic: [
    'The system your topic is about and every stage of it: its buildings, machines, devices and documents, and the paths between them',
    "What stands on each scene's plinth and where, laid out for its line",
    'Who or what travels through it: a parcel, a passenger, a payment, a message',
    'The step names, timers and counts, and the cards and screens shown',
  ],
  never: [
    "The reference video's Shazam story: its café, the phone under a match card, the star map, the 32-bit code card, the sliding song strip",
    "Servers and packets for a story that isn't about networks: draw the system your topic is about",
    'The same plinth layout in every scene',
  ],
};

// The same style on another topic, as text: one parcel carried through a new place at every stage.
const CONTRAST = {
  topic: 'how a parcel reaches your door overnight',
  title: 'Where your parcel goes overnight',
  chapters: [
    { label: 'Ordered at 9 p.m.', line: 'You order at nine at night, and the parcel is at your door by noon.', place: 'a warehouse aisle, a robot lifting one box off a shelf' },
    { label: 'Sorted at the hub', line: 'First it rides a conveyor to a sorting hub that reads its label.', place: 'a sorting hub of crossing conveyor belts and scanners' },
    { label: 'Overnight by truck', line: 'Then a night truck carries it, with thousands of others, to your city.', place: 'a motorway at night, one lit truck on a long road' },
    { label: 'The last mile', line: 'Finally, a van drops it at your door before lunch.', place: 'a street of houses, a van stopping at one door' },
  ],
};

export const ISOMETRIC = {
  id: 'isometric',
  name: 'Isometric network',
  identity: IDENTITY,
  contrast: CONTRAST,
  feel: `Systems drawn as small isometric worlds on deep navy: calm and precise, like an engineering diagram that comes alive. Paint the whole frame: a faint isometric floor grid fading out at the top and under the captions, then a raised plinth carrying a small world built for its line. Everything is in 2:1 isometric projection with three shaded faces (copy the kit: P() projects a point, Box draws a block, Ring a glow ring, Tag a label): the topic's own buildings, machines, devices and cards lying flat, each built from a few blocks. One accent does the lighting (colors.accent, cyan by default): a block's top glows when it's named, glowing paths join blocks along the grid, and a bright packet (a chalk dot in a soft halo) travels them; soft rings pulse out from what's active. When the story is a journey, a step tracker runs across the top: dots on a line, short uppercase mono labels (34 px) that light as it moves on, and a timer or count on the right in the accent. Name things with uppercase tags in rounded chips (fontFamily="mono"), a thin leader line to what they name. Now and then a bright chalk UI card (a message, a web page, a code) in colors.cardInk, or a huge number (150–210 px) over a short uppercase line. colors.rose is a second accent for a warning or a cost, used sparingly. The camera never moves: things light up and travel (easeOut, easeInOut, never a bounce).`,
  opening: {
    title: 'A request crossing four machines: each node lights up as the packet reaches it, the step tracker and the clock keeping pace',
    line: 'Opening a website crosses four machines in a tenth of a second.',
    source: OPENING,
  },
  examples: [
    {
      title: 'A big number counting up over a hall of server racks that light up row by row, one rack tagged for scale',
      line: 'The biggest data centres run more than a hundred thousand servers.',
      source: SERVERS,
    },
    {
      title: 'A white code card over a phone lying flat: the clock and the secret feed it, the code flips and its ring drains',
      line: 'Your authenticator app makes a new six-digit code every thirty seconds.',
      source: CODE,
    },
    {
      title: 'Two continents with a glowing cable on the sea floor between them, packets streaming across, the share as a big number',
      line: 'Ninety-nine percent of data between continents runs along the ocean floor.',
      source: CABLE,
    },
    {
      title: 'A web card loading as its copy hops from a nearby edge server instead of the far origin, the clock dropping',
      line: 'A CDN keeps a copy of the site near you, so the page arrives in milliseconds.',
      source: EDGE,
    },
  ],
  frame: {
    captions: { kind: 'line-center', font: 'sans', weight: 700, size: 64, upper: false, color: 'ink', highlight: 'accent', dim: 0.42 },
    grain: false,
    vignette: false,
  },
  palette: { primary: '#22D3EE', accent: '#F5A524', ink: '#E6EDF5', background: '#0B1220' },
  reference: REFERENCE,
  // A soft, fairly narrow bed near 74 BPM that dips about 6 dB under speech, and almost no effects (none on its cuts):
  // a scan across the opening, a chime on the reveal, a double blip on the keyword (src/audio/sound.mjs SOUNDS.isometric).
  sound: 'isometric',
};
