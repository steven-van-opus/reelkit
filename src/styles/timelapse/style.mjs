// Low-poly time-lapse: a flat-shaded diorama of one place, chosen for each video's topic and seen from a fixed camera
// while time runs fast, as a skill the writer designs from on the canvas look. Each scene paints the whole place, its
// own blocky character (the style's own), something that keeps count, the
// question title at the top and a HUD of the elapsed time and the stage reached, over a fun-fact footer that stays the
// same all video, on a dark gradient above the serif captions. Its identity (IDENTITY: what every video keeps) is told
// apart from what each topic brings, so a new video picks its own place, never the reference video's room.

import { TIMELAPSE_REFERENCE } from './reference.mjs';

const OPENING = {
  title: 'The question over a lamp-lit bedroom: the clock spins through a day and night while the sleeper behind the desk droops',
  line: 'What actually happens to your body if you just stop sleeping?',
  source: String.raw`export default function Scene({ time, duration, colors }) {
  const p = easeInOut(clamp((time - 0.4) / (duration - 0.6))), hr = 24 * p, h = Math.round(hr);
  const day = clamp(0.5 + 0.8 * Math.cos((hr - 5) / 3.82)), lid = 0.1 + 0.6 * p;
  const t1 = easeOut(clamp(time / 0.5)), t2 = easeOut(clamp((time - at('stop')) / 0.5)), hud = easeOut(clamp((time - 0.8) / 0.5));
  const skin = '#E3A982', wood = '#9A6A45', dark = '#24262E';
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' ');
  const arm = '-92,14 -70,4 -54,84 -86,86', desk = '250,900 830,900 880,950 200,950';
  return <svg>
    {R(0, 0, 1080, 1920, colors.wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, colors.chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', colors.floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(150, 548, 220, 260, colors.chalk)}{R(164, 562, 192, 232, '#AED8E6')}{R(164, 562, 192, 232, '#16213D', 1 - day)}
    <circle cx={210 + 100 * p} cy={640} r={26} fill="#FFE6A0" opacity={day}/>
    {F('164,562 356,562 164,760', '#fff', 0.12)}{R(255, 562, 10, 232, colors.chalk)}{R(164, 672, 192, 10, colors.chalk)}{R(136, 802, 248, 16, colors.chalk)}
    <g transform="translate(820 640)">
      <polygon points={ring(96)} fill={colors.cardInk}/><polygon points={ring(84)} fill={colors.chalk}/>{F('0,-84 84,0 0,84', '#000', 0.06)}
      {range(12).map(i => <rect x={-3} y={-76} width={6} height={i % 3 ? 10 : 18} fill={colors.cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <rect x={-4} y={-54} width={8} height={58} fill={colors.cardInk} transform={'rotate(' + (8 + hr) * 30 + ')'}/>
      <rect x={-3} y={-72} width={6} height={76} fill={colors.accent} transform={'rotate(' + hr * 360 + ')'}/>
      <circle r={9} fill={colors.cardInk}/>
    </g>
    <g transform={'translate(540 ' + (786 + p * 14) + ') scale(1.55) rotate(' + p * -3 + ')'}>
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', colors.accent)}
      {F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, colors.accent)}{F(arm, '#000', 0.12)}
      <g transform="scale(-1 1)">{F(arm, colors.accent)}{F(arm, '#000', 0.22)}</g>
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}{R(-18, -24, 36, 12, '#000', 0.2)}
      <g transform={'rotate(' + p * 9 + ' 0 -20)'}>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}
        {F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {[-34, 16].map(x => <g>{R(x, -98, 18, 18, dark)}{R(x - 3, -101, 24, 21 * lid, skin)}{R(x - 3, -102 + 21 * lid, 24, 3, dark)}{R(x, -74, 18, 5, '#6E4A7E', p * 0.8)}</g>)}
        {R(-14, -50, 28, 6, '#8A4B3C')}
      </g>
    </g>
    {F(desk, wood)}{F(desk, '#fff', 0.16)}{R(200, 950, 680, 130, wood)}{R(200, 950, 680, 130, '#000', 0.25)}
    {R(398, 904, 54, 28, skin)}{R(628, 904, 54, 28, skin)}
    {range(4).filter(i => i < h / 6).map(i => <g transform={'translate(' + (226 + i * 44) + ' 862)'}>{R(0, 0, 34, 42, colors.chalk)}{R(34, 10, 10, 20, colors.chalk)}{R(0, 0, 34, 7, '#5A3A28')}{R(20, 0, 14, 42, '#000', 0.12)}</g>)}
    {R(796, 886, 60, 14, colors.cardInk)}{R(822, 800, 8, 90, colors.cardInk)}
    {F('776,812 876,812 858,762 794,762', colors.rose)}{F('826,762 858,762 876,812 826,812', '#000', 0.18)}
    {F('776,812 876,812 930,900 722,900', '#FFE3A3', (1 - day) * 0.45)}
    {R(0, 0, 1080, 1920, '#0B1428', (1 - day) * 0.28)}
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={colors.cardInk} stopOpacity="0"/><stop offset="0.2" stopColor={colors.cardInk} stopOpacity="0.86"/><stop offset="1" stopColor={colors.cardInk} stopOpacity="0.97"/>
    </linearGradient></defs>
    <rect y={880} width={1080} height={1040} fill="url(#hud)"/>
    <text x={540} y={384 + (1 - t1) * 24} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={colors.ink} opacity={t1}>What happens if you</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={colors.accent} opacity={t2}>stop sleeping?</text>
    <g opacity={hud} fill={colors.chalk}>
      <text x={90} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>TIME AWAKE</text>
      <text x={590} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>STAGE</text>
      <text x={88} y={1200} fontFamily="serif" fontSize={88}>{h}<tspan fontSize={46} fontStyle="italic">{h === 1 ? ' hour' : ' hours'}</tspan></text>
      <text x={590} y={1196} fontFamily="serif" fontStyle="italic" fontSize={66} fill={colors.blush}>{h < 9 ? 'Alert' : h < 17 ? 'Foggy' : 'Impaired'}</text>
      <text x={90} y={1258} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>{h < 17 ? 'Focus slips after about 16 hours.' : 'At 24 hours, you react like you’re drunk.'}</text>
    </g>
  </svg>;
}`,
};

// Each example paints the same kind of room (one-point perspective, vanishing point 540,640: the back wall, its darker
// lower band and trim, the lit left wall, the shaded right wall, the floor boards) and the same character; each
// scene's code stands alone, so each spells them out with two tiny helpers, F (a facet) and R (a rect).
const EXAMPLES = [
  {
    title: 'A wall calendar filling with X marks over three months while the character reads, a stack of finished books growing beside them',
    line: 'Repeat one small thing every day, and around day sixty-six it finally feels automatic.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), d = Math.max(1, Math.round(66 * p));
  const m = Math.min(2, Math.floor((d - 1) / 30)), u = 1 - clamp((d - 20) / 40);
  const hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', pants = '#33415C';
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const arm = '-92,14 -70,4 -40,88 -66,98';
  return <svg>
    {R(0, 0, 1080, 1920, colors.wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, colors.chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', colors.floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {F('20,540 128,584 128,850 20,894', colors.chalk)}{F('34,562 114,594 114,836 34,868', '#AED8E6')}{F('34,562 114,594 34,760', '#fff', 0.3)}{F('70,576 78,580 78,852 70,850', colors.chalk)}{F('8,892 136,846 150,852 22,904', colors.chalk)}
    {F('130,1000 290,962 790,962 950,1000 790,1046 290,1046', colors.rose, 0.45)}
    <g transform="translate(630 524)">
      {R(0, 0, 290, 340, colors.chalk)}{F('290,0 290,340 110,340', '#000', 0.05)}{R(0, 0, 290, 70, colors.accent)}
      {R(64, -14, 12, 30, dark)}{R(214, -14, 12, 30, dark)}
      <text x={145} y={49} textAnchor="middle" fontSize={36} fontWeight={700} letterSpacing={6} fill={colors.chalk}>{['MARCH', 'APRIL', 'MAY'][m]}</text>
      {range(30).map(i => <g transform={'translate(' + (8 + (i % 7) * 40) + ' ' + (84 + Math.floor(i / 7) * 50) + ')'}>
        {R(2, 2, 34, 42, colors.cardInk, 0.07)}
        {i < d - m * 30 && <g stroke={colors.rose} strokeWidth={6} strokeLinecap="round"><line x1={8} y1={10} x2={30} y2={36}/><line x1={30} y1={10} x2={8} y2={36}/></g>}
      </g>)}
    </g>
    {range(9).filter(i => i < d / 7).map(i => <g transform={'translate(' + (160 + (i % 2) * 10) + ' ' + (1000 - i * 26) + ')'}>{R(0, 0, 140, 24, [colors.accent, colors.chalk, colors.rose][i % 3])}{R(104, 0, 36, 24, '#000', 0.2)}{R(0, 0, 140, 6, '#fff', 0.3)}</g>)}
    <g transform={'translate(470 ' + (726 + Math.sin(time * 3) * 2) + ') scale(1.1)'}>
      {R(-50, 150, 44, 100, pants)}{R(6, 150, 44, 100, pants)}{R(26, 150, 24, 100, '#000', 0.2)}
      {R(-56, 246, 54, 20, dark)}{R(2, 246, 54, 20, dark)}
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', colors.accent)}
      {F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}{R(-18, -24, 36, 12, '#000', 0.2)}
      {F(arm, colors.accent)}{F(arm, '#000', 0.12)}<g transform="scale(-1 1)">{F(arm, colors.accent)}{F(arm, '#000', 0.22)}</g>
      {F('-70,40 0,54 70,40 70,104 0,118 -70,104', colors.rose)}
      {F('-62,44 0,58 0,110 -62,96', colors.chalk)}{F('0,58 62,44 62,96 0,110', colors.chalk)}{F('0,58 62,44 62,96 0,110', '#000', 0.1)}
      {R(-74, 88, 30, 24, skin)}{R(44, 88, 30, 24, skin)}
      {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}
      {F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
      {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
      {[-34, 16].map(x => <g>{R(x, -92, 18, 18, dark)}<rect x={x - 2} y={-114} width={22} height={6} fill={dark} transform={'rotate(' + (x < 0 ? 14 : -14) * u + ' ' + (x + 9) + ' -111)'}/></g>)}
      {F('-16,' + (-56 + 6 * u) + ' 16,' + (-56 + 6 * u) + ' 8,-46 -8,-46', '#8A4B3C')}
    </g>
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={colors.cardInk} stopOpacity="0"/><stop offset="0.2" stopColor={colors.cardInk} stopOpacity="0.86"/><stop offset="1" stopColor={colors.cardInk} stopOpacity="0.97"/>
    </linearGradient></defs>
    <rect y={880} width={1080} height={1040} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={colors.ink}>How long until a</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={colors.accent}>habit sticks?</text>
    <g opacity={hud} fill={colors.chalk}>
      <text x={90} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>DAYS IN A ROW</text>
      <text x={590} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>FEELS</text>
      <text x={88} y={1200} fontFamily="serif" fontSize={88}>{d}<tspan fontSize={46} fontStyle="italic">{d === 1 ? ' day' : ' days'}</tspan></text>
      <text x={590} y={1196} fontFamily="serif" fontStyle="italic" fontSize={66} fill={colors.blush}>{d < 21 ? 'Hard work' : d < 45 ? 'Easier' : 'Automatic'}</text>
      <text x={90} y={1258} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>{d < 30 ? 'The 21-day rule is a myth.' : 'On average, it takes 66 days to stick.'}</text>
    </g>
  </svg>;
}`,
  },
  {
    title: 'A kitchen timer sweeping round as the minutes pass while the character behind the counter sips and wakes up, eyes widening and zaps landing on "peaks"',
    line: 'Ten minutes after your first sip, caffeine kicks in, and it peaks within the hour.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), mn = 45 * p, n = Math.round(mn);
  const wake = clamp(mn / 30), zap = easeOut(clamp((time - at('peaks')) / 0.4)), a = mn / 9.55;
  const hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E';
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' ');
  const arm = '-92,14 -70,4 -60,96 -88,98', top = '150,900 930,900 980,944 100,944';
  return <svg>
    {R(0, 0, 1080, 1920, colors.wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', colors.floor)}
    {R(150, 640, 780, 260, colors.chalk, 0.16)}
    {range(13).map(i => R(150 + i * 65, 640, 3, 260, colors.wall, 0.6))}{range(4).map(i => R(150, 640 + i * 65, 780, 3, colors.wall, 0.6))}
    {R(170, 548, 200, 230, colors.chalk)}{R(184, 562, 172, 202, '#AED8E6')}{F('184,562 356,562 184,720', '#fff', 0.25)}{R(265, 562, 10, 202, colors.chalk)}
    <g transform="translate(830 650)">
      <polygon points={ring(104)} fill={colors.cardInk}/><polygon points={ring(90)} fill={colors.chalk}/>
      <polygon points={'0,0 ' + range(25).map(i => 90 * Math.sin(a * i / 24) + ',' + -90 * Math.cos(a * i / 24)).join(' ')} fill={colors.accent} opacity={0.85}/>
      {F('0,-90 90,0 0,90', '#000', 0.06)}
      {range(12).map(i => <rect x={-3} y={-86} width={6} height={i % 3 ? 10 : 20} fill={colors.cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <rect x={-4} y={-80} width={8} height={84} fill={colors.cardInk} transform={'rotate(' + mn * 6 + ')'}/>
      <circle r={10} fill={colors.cardInk}/>
    </g>
    <g transform="translate(520 790) scale(1.45)">
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', colors.accent)}
      {F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, colors.accent)}{F(arm, '#000', 0.12)}
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}{R(-18, -24, 36, 12, '#000', 0.2)}
      <g transform={'rotate(' + (6 - 8 * wake) + ' 0 -20)'}>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}
        {F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {[-36, 14].map(x => <g>{R(x, -100 - 6 * wake, 22, 16 + 10 * wake, '#fff')}{R(x + 5, -96 - 3 * wake, 12, 12 + 4 * wake, dark)}{R(x - 2, -102 - 6 * wake, 26, 16 * (1 - wake), skin)}</g>)}
        {R(-12, -52, 24, 6 + 6 * wake, '#8A4B3C')}
      </g>
      <g opacity={zap}>{[-72, -48, 48, 72].map(r => <rect x={-4} y={-226} width={8} height={26} fill={colors.blush} transform={'rotate(' + r + ' 0 -90)'}/>)}</g>
      {F('84,16 60,4 26,44 52,60', colors.accent)}{F('84,16 60,4 26,44 52,60', '#000', 0.22)}
      <g transform="translate(34 -8)">
        {R(0, 0, 46, 54, colors.rose)}{R(32, 0, 14, 54, '#000', 0.15)}{R(46, 12, 14, 28, colors.rose)}{R(0, 0, 46, 8, '#5A3A28')}
        {range(3).map(i => F((14 + 6 * Math.sin(time * 4 + i * 2)) + ',' + (-6 - ((time * 0.9 + i / 3) % 1) * 80) + ' 23,' + (-26 - ((time * 0.9 + i / 3) % 1) * 80) + ' 32,' + (-6 - ((time * 0.9 + i / 3) % 1) * 80), colors.chalk, 0.85 * (1 - ((time * 0.9 + i / 3) % 1))))}
        {R(-8, 26, 30, 26, skin)}
      </g>
    </g>
    {F(top, colors.chalk)}{F(top, colors.wall, 0.12)}{R(100, 944, 880, 160, colors.floor)}
    {range(4).map(i => <g>{R(122 + i * 214, 964, 196, 130, '#fff', 0.07)}{R(204 + i * 214, 986, 32, 8, colors.chalk, 0.7)}</g>)}
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={colors.cardInk} stopOpacity="0"/><stop offset="0.2" stopColor={colors.cardInk} stopOpacity="0.86"/><stop offset="1" stopColor={colors.cardInk} stopOpacity="0.97"/>
    </linearGradient></defs>
    <rect y={880} width={1080} height={1040} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={colors.ink}>What happens after</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={colors.accent}>your first coffee?</text>
    <g opacity={hud} fill={colors.chalk}>
      <text x={90} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>SINCE THE SIP</text>
      <text x={590} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>CAFFEINE</text>
      <text x={88} y={1200} fontFamily="serif" fontSize={88}>{n}<tspan fontSize={46} fontStyle="italic"> min</tspan></text>
      <text x={590} y={1196} fontFamily="serif" fontStyle="italic" fontSize={66} fill={colors.blush}>{n < 10 ? 'Kicking in' : n < 35 ? 'Rising' : 'Peaking'}</text>
      <text x={90} y={1258} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>{n < 25 ? 'Effects start in about 10 minutes.' : 'Blood levels peak within the hour.'}</text>
    </g>
  </svg>;
}`,
  },
  {
    title: 'A tomato plant shooting up in a sunroom over seventy days, leaves then flowers then fruit, while the character waters it and a tear-off calendar sheds days',
    line: 'Plant a tomato seedling, water it daily, and in about two months you are picking fruit.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), d = Math.round(70 * p), g = clamp(d / 50);
  const mo = d < 31 ? 0 : d < 61 ? 1 : 2, top = 930 - 350 * g, ripe = clamp((d - 56) / 10);
  const hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', pants = '#33415C', leaf = '#4F8A45', can = '#7F9FAD';
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const arm = '-92,14 -70,4 -60,96 -88,98';
  return <svg>
    {R(0, 0, 1080, 1920, colors.wall)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, colors.chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', colors.floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(160, 530, 560, 380, colors.chalk)}{R(176, 546, 528, 348, '#B9DFEA')}
    {F('176,546 704,546 704,620 176,860', '#fff', 0.22)}{F('520,894 704,700 704,894', '#fff', 0.15)}
    {[350, 530].map(x => R(x, 546, 12, 348, colors.chalk))}{R(176, 714, 528, 12, colors.chalk)}
    {F('300,960 520,960 760,1110 330,1110', '#FFF4D2', 0.12)}
    <g transform="translate(770 560)">
      {R(0, 0, 150, 190, colors.chalk)}{F('150,0 150,190 60,190', '#000', 0.06)}{R(0, 0, 150, 54, colors.accent)}{R(66, -16, 18, 26, dark)}
      <text x={75} y={41} textAnchor="middle" fontSize={34} fontWeight={700} letterSpacing={4} fill={colors.chalk}>{['MAY', 'JUNE', 'JULY'][mo]}</text>
      <text x={75} y={150} textAnchor="middle" fontFamily="serif" fontSize={84} fill={colors.cardInk}>{d + 1 - [0, 31, 61][mo]}</text>
      {R(4, 190, 142, 7, colors.chalk, 0.7)}{R(9, 197, 132, 7, colors.chalk, 0.4)}
    </g>
    {R(615, top, 12, 930 - top, leaf)}
    {range(6).filter(k => 900 - k * 60 > top + 10).map(k => <g transform={'translate(621 ' + (900 - k * 60) + ') scale(' + (k % 2 ? -1 : 1) * Math.min(1, g * 2 - k * 0.2) + ' 1)'}>
      {F('0,0 -110,-46 -70,8', leaf)}{F('0,0 -110,-46 -60,-36', '#fff', 0.18)}{F('-4,-6 -76,-58 -40,-62', leaf)}
      {d > 38 && k > 1 && F('-60,-70 -48,-90 -36,-70 -48,-60', '#F4C542')}
      {d > 46 && k < 4 && <g transform="translate(-58 18)">
        <polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11" fill="#7DAA4A"/>
        <polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11" fill="#D9442F" opacity={ripe}/>
        {F('0,-22 19,-11 0,0 -19,-11', '#fff', 0.2)}
      </g>}
    </g>)}
    {F('556,930 686,930 670,1040 572,1040', colors.rose)}{F('640,930 686,930 670,1040 636,1040', '#000', 0.2)}{R(546, 918, 150, 22, colors.rose)}{R(546, 918, 150, 8, '#fff', 0.25)}
    <g transform={'translate(330 ' + (728 + Math.sin(time * 3) * 2) + ') scale(1.1)'}>
      {R(-50, 150, 44, 100, pants)}{R(6, 150, 44, 100, pants)}{R(26, 150, 24, 100, '#000', 0.2)}
      {R(-56, 246, 54, 20, dark)}{R(2, 246, 54, 20, dark)}
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', colors.accent)}
      {F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, colors.accent)}{F(arm, '#000', 0.12)}{R(-94, 94, 30, 24, skin)}
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}{R(-18, -24, 36, 12, '#000', 0.2)}
      {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}
      {F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
      {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
      {[-30, 20].map(x => R(x, -96, 18, 18, dark))}
      {F('-12,-54 16,-54 10,-46 -6,-46', '#8A4B3C')}
      <g transform="rotate(18 110 40)">{F('166,44 238,12 246,24 172,66', can)}{F('234,2 254,-6 260,26 242,28', can)}{F('96,24 168,24 176,88 88,88', can)}{F('146,24 168,24 176,88 150,88', '#000', 0.2)}{F('96,24 168,24 164,36 100,36', '#fff', 0.25)}{F('104,24 112,-6 152,-6 160,24 150,24 146,6 118,6 114,24', can)}</g>
      {F('80,14 58,4 96,66 118,48', colors.accent)}{F('80,14 58,4 96,66 118,48', '#000', 0.22)}{R(96, 44, 26, 24, skin)}
    </g>
    {range(5).map(i => R(606 + ((time * 1.5 + i / 5) % 1) * 12, 798 + ((time * 1.5 + i / 5) % 1) * 116, 8, 18, '#4FA6D2'))}
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={colors.cardInk} stopOpacity="0"/><stop offset="0.2" stopColor={colors.cardInk} stopOpacity="0.86"/><stop offset="1" stopColor={colors.cardInk} stopOpacity="0.97"/>
    </linearGradient></defs>
    <rect y={880} width={1080} height={1040} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={colors.ink}>How fast does a</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={colors.accent}>tomato plant grow?</text>
    <g opacity={hud} fill={colors.chalk}>
      <text x={90} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>SINCE PLANTING</text>
      <text x={590} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>STAGE</text>
      <text x={88} y={1200} fontFamily="serif" fontSize={88}>{d}<tspan fontSize={46} fontStyle="italic">{d === 1 ? ' day' : ' days'}</tspan></text>
      <text x={590} y={1196} fontFamily="serif" fontStyle="italic" fontSize={66} fill={colors.blush}>{d < 14 ? 'Seedling' : d < 38 ? 'Growing' : d < 50 ? 'Flowering' : 'Fruiting'}</text>
      <text x={90} y={1258} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>{d < 45 ? 'Flowers come weeks before fruit.' : 'Most ripen 60 to 85 days in.'}</text>
    </g>
  </svg>;
}`,
  },
  {
    title: 'A glass jar filling with coins over ten years while the wall calendar flips its year and the character greys and gains glasses',
    line: 'Drop five dollars in a jar every day, and ten years later you have over eighteen thousand.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), days = Math.round(3650 * p), yr = Math.floor(days / 365);
  const sum = days * 5, k = Math.floor(sum / 1000), r = sum % 1000, fill = 256 * p, c = (time * 1.4) % 1;
  const hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', pants = '#33415C', gold = '#E8B64A';
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const arm = '-92,14 -70,4 -60,96 -88,98', jar = '660,650 860,650 880,676 880,890 860,910 660,910 640,890 640,676';
  return <svg>
    {R(0, 0, 1080, 1920, colors.wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, colors.chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', colors.floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    <g transform="translate(170 540)">
      {R(0, 0, 250, 270, colors.chalk)}{F('250,0 250,270 100,270', '#000', 0.06)}{R(0, 0, 250, 64, colors.accent)}{R(56, -14, 12, 28, dark)}{R(182, -14, 12, 28, dark)}
      <text x={125} y={45} textAnchor="middle" fontSize={34} fontWeight={700} letterSpacing={6} fill={colors.chalk}>YEAR</text>
      <text x={125} y={186} textAnchor="middle" fontFamily="serif" fontSize={78} fill={colors.cardInk}>{2026 + yr}</text>
      {R(24, 222, 202, 4, colors.cardInk, 0.15)}{R(24, 238, 130, 4, colors.cardInk, 0.15)}
    </g>
    {F('600,910 950,910 966,940 584,940', '#9A6A45')}{R(584, 940, 382, 140, '#9A6A45')}{R(584, 940, 382, 140, '#000', 0.25)}
    <clipPath id="jar"><polygon points={jar}/></clipPath>
    <g clipPath="url(#jar)">
      {R(600, 910 - fill, 300, fill, gold)}{F('600,' + (910 - fill) + ' 900,' + (910 - fill) + ' 900,' + (940 - fill), '#fff', 0.25)}
      {range(42).filter(i => 898 - Math.floor(i / 6) * 38 > 910 - fill).map(i => <polygon points="0,-12 20,-12 28,0 20,12 0,12 -8,0" fill="#C9902E" transform={'translate(' + (664 + (i % 6) * 36 + (Math.floor(i / 6) % 2) * 16) + ' ' + (892 - Math.floor(i / 6) * 38) + ')'}/>)}
    </g>
    {F(jar, colors.chalk, 0.16)}{F('660,650 712,650 700,910 660,910 640,890 640,676', '#fff', 0.24)}{F('830,650 860,650 880,676 880,890 860,910 836,910', '#000', 0.12)}
    {R(652, 624, 236, 30, colors.cardInk)}{R(652, 624, 236, 10, '#fff', 0.15)}
    <polygon points="-10,-12 10,-12 18,0 10,12 -10,12 -18,0" fill={gold} transform={'translate(' + (660 + 110 * c) + ' ' + (716 - 330 * c * (1 - c) - 70 * c) + ') scale(' + (1 - 0.3 * c) + ' 1)'} opacity={c < 0.92 ? 1 : 0}/>
    <g transform={'translate(500 ' + (728 + Math.sin(time * 3) * 2) + ') scale(1.1)'}>
      {R(-50, 150, 44, 100, pants)}{R(6, 150, 44, 100, pants)}{R(26, 150, 24, 100, '#000', 0.2)}
      {R(-56, 246, 54, 20, dark)}{R(2, 246, 54, 20, dark)}
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', colors.accent)}
      {F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, colors.accent)}{F(arm, '#000', 0.12)}{R(-94, 94, 30, 24, skin)}
      {F('80,16 56,-4 132,-26 140,0', colors.accent)}{F('80,16 56,-4 132,-26 140,0', '#000', 0.22)}{R(130, -26, 28, 26, skin)}
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}{R(-18, -24, 36, 12, '#000', 0.2)}
      {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}
      {F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
      <g>{[dark, '#C9CCD2'].map((c, i) => F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', c, i ? clamp(yr / 9) : 1))}</g>
      {[-30, 20].map(x => <g>{R(x, -96, 18, 18, dark)}<rect x={x - 9} y={-104} width={34} height={32} fill="none" stroke={dark} strokeWidth={5} opacity={clamp(yr - 4)}/></g>)}
      {R(4, -90, 16, 4, dark, clamp(yr - 4))}
      {F('-12,-54 16,-54 10,-46 -6,-46', '#8A4B3C')}
    </g>
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={colors.cardInk} stopOpacity="0"/><stop offset="0.2" stopColor={colors.cardInk} stopOpacity="0.86"/><stop offset="1" stopColor={colors.cardInk} stopOpacity="0.97"/>
    </linearGradient></defs>
    <rect y={880} width={1080} height={1040} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={colors.ink}>What if you saved</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={colors.accent}>$5 every day?</text>
    <g opacity={hud} fill={colors.chalk}>
      <text x={90} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>TIME</text>
      <text x={590} y={1112} fontSize={34} fontWeight={600} letterSpacing={4} opacity={0.65}>IN THE JAR</text>
      <text x={88} y={1200} fontFamily="serif" fontSize={88}>{yr || days}<tspan fontSize={46} fontStyle="italic">{yr ? (yr > 1 ? ' years' : ' year') : days === 1 ? ' day' : ' days'}</tspan></text>
      <text x={590} y={1196} fontFamily="serif" fontStyle="italic" fontSize={66} fill={colors.blush}>{'$' + (k ? k + ',' + (r < 100 ? '0' : '') + (r < 10 ? '0' : '') + r : r)}</text>
      <text x={90} y={1258} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>{yr < 3 ? '$5 a day is $1,825 a year.' : 'And that’s before any interest.'}</text>
    </g>
  </svg>;
}`,
  },
];

// What every Low-poly time-lapse video keeps, what its topic brings, and what it never copies from the reference video.
const IDENTITY = {
  constant: [
    'The flat-shaded low-poly finish: every surface in flat facets of 2–3 shades, no outlines, under a soft vignette',
    'One place per video, chosen for its topic and held by a fixed camera while time races on in it',
    "This style's own blocky character (an octagonal head, a flat dark hair cap with one tuft, square eyes, an accent V-neck sweater), big in the middle of the scene",
    'The question title up top in two centred serif lines, the second italic in the accent',
    'The HUD on a dark gradient: tracked uppercase labels and big serif values with an italic unit, over a FUN FACT footer (a tracked accent label, one italic line) that stays the same all video',
    'Time jumps further each beat toward the extreme; the verdict may reset it (the payoff). The counter, the light and the character change together, easing and settling',
    'A quiet serif caption line (drawn for you)',
  ],
  topic: [
    "The one place itself, picked for the topic (a greenhouse, a garage, a ship's cabin, a lab, orbit), with its own furniture and light",
    'What keeps count in it: a clock, a tear-off pad, a plant growing, a candle burning down, a jar filling',
    "How the place and the character change as time passes: the light, the clutter, what they're holding, how they look",
    "The question, the HUD's labels and every value, from your sources",
    'The fun fact: one real, named person or case your topic is known for, from your sources',
  ],
  never: [
    "The reference video's room, an eat-in kitchen: the tall fridge against the back wall, the wall clock over the tiled backsplash, the table with its plate, glass and lamp",
    "Its pieces as they are: the chalkboard on the fridge door and its graphics (sugar cubes, fat drop, caution sign, brain, day ruler, Dundee clipboard) and the egg breakfast that ends it",
    "A window, clock or calendar in a place that wouldn't have one: count time the way the topic does",
  ],
};

// The same style on another topic, as text: another body-limit question, set outdoors far from the reference's
// kitchen, in one place held for the whole video while its stages climb (first threshold, safe limit, danger, an
// extreme case, the verdict). Its numbers: Gordon Giesbrecht's 1-10-1 principle, about a minute of cold shock, about
// ten minutes of useful movement and about an hour before hypothermia knocks you out (McGill Office for Science and
// Society, "Professor Popsicle's physiological proof"); Anna Bågenholm, trapped under ice in freezing water for 80
// minutes in 1999 and revived (Gilbert et al., "Resuscitation from accidental hypothermia of 13.7°C with circulatory
// arrest", Lancet 2000;355:375-6).
const LAKESHORE = 'a frozen lakeshore at dusk, a hole cut in the ice';
const CONTRAST = {
  topic: 'how long a person can last in icy water',
  title: 'How long can you stand icy water?',
  chapters: [
    { label: 'Minute 1: the cold-shock gasp', line: 'Drop into icy water, and for the first minute you gasp for air.', place: LAKESHORE },
    { label: '10 minutes to climb out', line: 'After that, you have about ten minutes before your arms stop working.', place: LAKESHORE },
    { label: 'About an hour: you pass out', line: 'Within about an hour, the cold can knock you unconscious.', place: LAKESHORE },
    { label: '80 minutes trapped under ice', line: 'One skier was trapped under ice for eighty minutes, and doctors revived her.', place: LAKESHORE },
    { label: 'The real answer: 10 minutes', line: 'The real answer is about ten minutes, so plan your way out first.', place: LAKESHORE },
  ],
};

export const TIMELAPSE = {
  id: 'timelapse',
  name: 'Low-poly time-lapse',
  feel: "A flat-shaded low-poly diorama of one place, seen from a fixed camera as time races. Each video picks one place for its topic and keeps it, the camera and the character; only time, their state and the HUD change. Paint it edge to edge: indoors, a back wall (colors.wall), lit left and shaded right walls and a floor (colors.floor) running from a vanishing point near 540,640; outdoors, sky and ground the same way. Each surface is flat facets in 2–3 shades (white or black at 5–25%), no outlines. Skin, leaves and sky keep real colours; walls, sweater and paper take the brand's.\nEvery scene has this style's own blocky character beside its subject, both big in the middle of the place (y 520–1060): an octagonal head, a flat dark hair cap with one tuft, square eyes, an accent V-neck sweater, drawn in local coordinates and scaled (1.1 standing, 1.5 behind a desk). Something from the topic keeps count.\nUp top, the question in two centred serif lines (baselines y 384 and 478), the second italic in the accent. A colors.cardInk gradient from y 850 carries the HUD in chalk: tracked uppercase labels (y 1086), big serif values with an italic unit (y 1168, the second in blush) and a FUN FACT footer (label y 1220, line y 1264).\nTime jumps further each beat toward the extreme (hours, days, years); the verdict may reset it (the payoff). Counter, place, light and character change together. Set \"kit\": \"none\"; the scene draws it.",
  identity: IDENTITY,
  contrast: CONTRAST,
  opening: OPENING,
  examples: EXAMPLES,
  reference: TIMELAPSE_REFERENCE,
  frame: { captions: { kind: 'serif', font: 'serif', weight: 600, size: 58, upper: false, color: 'chalk', highlight: 'accent', dim: 0.55 }, grain: false, vignette: true },
  // A teal-painted room: the wall's floor (src/canvas.mjs canvasColors) lands near its dark teal HUD backdrop,
  // and the gold title still reads on the wall. Coral stays off the wall as text (about 2.5:1).
  palette: { background: '#2C5F5A', ink: '#FBF3E6', primary: '#E9A84C', accent: '#E07A5F' },
  // A low-passed, music-forward pulse, clock ticks on the beat as time races, swishes on each stage, and the music
  // drops out under the payoff: about 10 effects per 10 s with the voice over them.
  sound: { mood: 'pulse', bpm: [120, 130], mode: 'minor', underVoiceLu: -7, duckDb: 3, breakAt: 'payoff', sfx: 'timelapse', density: 'some' },
};

export default TIMELAPSE;
