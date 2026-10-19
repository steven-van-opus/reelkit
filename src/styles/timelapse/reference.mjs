// Low-poly time-lapse's reference video (../index.mjs `reference`): a body-limit question, "How long can you go
// without food?", told in one place chosen for it, an eat-in kitchen held by a fixed camera (pushing in twice, on the
// fridge), while the counter races from 0 hours to 382 days and the stages escalate: a first threshold, a safe limit,
// the body adapting, danger, an extreme case and a verdict. Escalation shows in the room's state, never in a new set:
// the light, the character (cheerful, yawning, tired, propped up, slumped, then beaming over breakfast), the fridge
// door, and the chalkboard panel on it, wiped for one graphic per beat. A FUN FACT footer about a named real person
// stays the same in every scene. Every scene names the same place, word for word, as a writer names a set it stays in
// (../guide.mjs): the one place a new video never copies (../guide.mjs lookGuide). Each scene's code stands
// alone, so each spells out the room and character with two tiny helpers, F (a facet) and R (a rect).
// Its numbers and their sources:
//   - Stored sugar (glycogen) is used up after about 24 hours without food; fat then breaks down into fatty acids that
//     the liver turns into ketone bodies: Sanvictores & Casale, "Physiology, Fasting", StatPearls (NCBI Bookshelf
//     NBK534877).
//   - Refeeding risk after 5 days: people who have eaten little or nothing for more than 5 days are fed no more than
//     half their needs at first (NICE clinical guideline 32, "Nutrition support for adults", recommendation 1.4.5 and
//     Box 1; NCBI Bookshelf NBK553310).
//   - After 5 to 6 weeks of fasting, beta-hydroxybutyrate and acetoacetate (ketones) replaced glucose as the brain's
//     predominant fuel: Owen et al., "Brain metabolism during fasting", J Clin Invest 1967;46:1589-95 (three patients).
//     The brain on the panel turns mostly amber and the HUD reads MAIN FUEL, as "predominant" says (glucose is still
//     used); the amber isn't drawn as a measured share.
//   - In the 1981 hunger strike, ten men died after 46 to 73 days without food: CAIN, Ulster University, "The hunger
//     strikers who died"; Lieberson, "How long can a person survive without food?", Scientific American, 2004.
//   - A 27-year-old man fasted 382 days under medical supervision, taking vitamins, electrolytes, yeast and
//     zero-calorie drinks: Stewart & Fleming, "Features of a successful therapeutic fast of 382 days' duration",
//     Postgrad Med J 1973;49:203-9. He was Angus Barbieri of Dundee, June 1965 to July 1966; he weighed about 456 lb
//     (207 kg) at the start (ScienceAlert; Guinness gives 214 kg; no weight is shown) and broke his fast with a boiled
//     egg and a slice of bread and butter (ScienceAlert; Wikipedia, "Angus Barbieri's fast").
//   - "Weeks" is the verdict the danger beat supports (46 to 73 days is 7 to 10 weeks); Scientific American notes
//     reliable data on total starvation are scarce, so no single number is given. The video never shows a weight or
//     celebrates a record, and it ends telling the viewer not to try it.
// Bump `id` whenever the video changes (a place is text only: it changes no frame).

const KITCHEN = 'an eat-in kitchen: tall fridge, wall clock, table and lamp';

export const TIMELAPSE_REFERENCE = {
  id: 'timelapse-3',
  title: 'How long can you go without food?',
  caption: "Your stored sugar lasts about a day. Here's what happens after that, and why you shouldn't test it.",
  beats: [
    {
      label: "Sugar runs out in about a day",
      line: "Stop eating, and in about a day your stored sugar runs out.",
      place: KITCHEN,
      source: String.raw`export default function Scene({ time, duration, colors }) {
  const { wall, floor, ink, chalk, cardInk, accent, rose, blush } = colors;
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', wood = '#9A6A45';
  const h = Math.round(24 * p), day = 0.5 + 0.5 * Math.cos(p * 6.28), t1 = easeOut(clamp(time / 0.5)), t2 = easeOut(clamp((time - 0.3) / 0.5)), out = clamp((time - at('runs')) / 0.3);
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' '), top = '230,900 850,900 900,950 180,950', arm = '-92,14 -70,4 -54,84 -86,86';
  return <svg>
    {R(0, 0, 1080, 1920, wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(150, 680, 450, 116, chalk, 0.12)}{range(7).map(i => R(150 + i * 64, 680, 3, 116, wall, 0.5))}
    <g transform="translate(250 600)">
      <polygon points={ring(74)} fill={cardInk}/><polygon points={ring(64)} fill={chalk}/>
      {range(12).map(i => <rect x={-3} y={-58} width={6} height={i % 3 ? 8 : 14} fill={cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <circle r={46} fill={accent} opacity={0.22}/><rect x={-4} y={-40} width={8} height={44} fill={cardInk} transform={'rotate(' + (p * 720) + ')'}/><circle r={7} fill={cardInk}/>
    </g>
    <rect x={600} y={520} width={310} height={400} fill={chalk} shadow="0 14 28 rgba(0,0,0,0.25)"/>{F('910,520 910,920 750,920', '#000', 0.06)}{R(606, 610, 10, 200, '#8E979F')}
    {R(622, 548, 274, 300, wood)}{R(632, 558, 254, 280, cardInk)}
    {[[666, 712, 0.5], [752, 712, -1], [666, 628, 0.1], [752, 628, 0.3]].map(([x, y, s]) => <g transform={'translate(' + (x + 40) + ' ' + (y + 40) + ') scale(' + (1 - easeOut(s < 0 ? out : clamp((p - s) / 0.12))) + ')'}>
      {R(-40, -40, 80, 80, chalk)}{F('-40,-40 -22,-58 58,-58 40,-40', '#fff')}{F('40,-40 58,-58 58,22 40,40', '#000', 0.2)}{F('-40,-40 40,-40 40,40', '#000', 0.05)}
    </g>)}
    <g transform={'translate(450 792) scale(1.45)'}>
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', accent)}{F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, accent)}<g transform="scale(-1 1)">{F(arm, accent)}{F(arm, '#000', 0.2)}</g>
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}
      <g>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}{F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {[-34, 16].map(x => R(x, -96, 18, 18, dark))}{F('-16,-56 16,-56 8,-46 -8,-46', '#8A4B3C')}
      </g>
    </g>
    {F(top, wood)}{F(top, '#fff', 0.16)}{R(180, 950, 720, 130, wood)}{R(180, 950, 720, 130, '#000', 0.25)}
    {F('400,914 420,902 520,902 540,914 520,926 420,926', chalk)}{F('400,914 540,914 520,926 420,926', '#000', 0.08)}
    {F('640,860 674,860 670,912 644,912', '#CFE8F0', 0.75)}{F('643,880 671,880 669,910 645,910', '#7FB9D6', 0.8)}
    {R(226, 892, 60, 14, cardInk)}{R(252, 820, 8, 76, cardInk)}{F('212,828 300,828 284,780 228,780', rose)}{F('256,780 284,780 300,828 256,828', '#000', 0.18)}
    {[0, 1].map(i => <polyline points={i ? '572,846 588,856 572,866 588,876' : '328,846 312,856 328,866 312,876'} fill="none" stroke={rose} strokeWidth={6} opacity={clamp(Math.sin(time * 5 + i) * 3) * (1 - out)}/>)}
    {R(0, 0, 1080, 1920, '#0B1428', 0.24 * (1 - day))}{F('212,828 300,828 352,900 160,900', '#FFE3A3', 0.4 * (1 - day))}
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">{[0, 0.86, 0.97].map((o, i) => <stop offset={[0, 0.2, 1][i]} stopColor={cardInk} stopOpacity={o}/>)}</linearGradient></defs>
    <rect y={850} width={1080} height={1070} fill="url(#hud)"/>
    <text x={540} y={384 + (1 - t1) * 24} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={ink} opacity={t1}>How long can you</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={accent} opacity={t2}>go without food?</text>
    <g opacity={hud} fill={chalk}>
      {R(90, 1040, 900, 2, chalk, 0.2)}
      <g fontWeight={600} letterSpacing={4} opacity={0.65}><text x={90} y={1086} fontSize={34}>NO FOOD FOR</text><text x={590} y={1086} fontSize={34}>RUNNING ON</text></g>
      <text x={88} y={1168} fontFamily="serif" fontSize={88}>{h}<tspan fontSize={46} fontStyle="italic">{h === 1 ? ' hour' : ' hours'}</tspan></text>
      <text x={590} y={1164} fontFamily="serif" fontStyle="italic" fontSize={66} fill={blush}>{out > 0.5 ? 'Empty' : 'Sugar'}</text>
      <text x={90} y={1220} fontSize={34} fontWeight={700} letterSpacing={6} fill={accent}>FUN FACT</text>
      <text x={90} y={1264} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>Angus Barbieri broke his fast with an egg.</text>
    </g>
  </svg>;
}`,
    },
    {
      label: "Then fat takes over",
      line: "Then your body burns fat, which your liver turns into ketones.",
      place: KITCHEN,
      source: String.raw`export default function Scene({ time, duration, colors }) {
  const { wall, floor, ink, chalk, cardInk, accent, rose, blush } = colors;
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', wood = '#9A6A45';
  const dp = 1 + 4 * p, d = Math.round(dp), day = 0.5 + 0.5 * Math.cos(dp * 6.28), drop = easeOutBack(clamp((time - at('fat')) / 0.5)), k = clamp((time - at('liver')) / 1.2), yawn = Math.sin(clamp((time - at('body')) / 1.2) * 3.14), w = 884 + 12 * Math.sin(time * 2.5);
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' '), top = '230,900 850,900 900,950 180,950', arm = '-92,14 -70,4 -54,84 -86,86';
  return <svg>
    {R(0, 0, 1080, 1920, wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(150, 680, 450, 116, chalk, 0.12)}{range(7).map(i => R(150 + i * 64, 680, 3, 116, wall, 0.5))}
    <g transform="translate(250 600)">
      <polygon points={ring(74)} fill={cardInk}/><polygon points={ring(64)} fill={chalk}/>
      {range(12).map(i => <rect x={-3} y={-58} width={6} height={i % 3 ? 8 : 14} fill={cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <circle r={46} fill={accent} opacity={0.26}/><rect x={-4} y={-40} width={8} height={44} fill={cardInk} transform={'rotate(' + (dp * 360) + ')'}/><circle r={7} fill={cardInk}/>
    </g>
    <rect x={600} y={520} width={310} height={400} fill={chalk} shadow="0 14 28 rgba(0,0,0,0.25)"/>{F('910,520 910,920 750,920', '#000', 0.06)}{R(606, 610, 10, 200, '#8E979F')}
    {R(622, 548, 274, 300, wood)}{R(632, 558, 254, 280, cardInk)}
    <g transform={'translate(759 646) scale(' + drop * (1 - 0.12 * k) + ')'}>
      {F('0,-74 40,-26 55,14 40,50 0,66 -40,50 -55,14 -40,-26', rose)}{F('0,-74 -40,-26 -55,14 -40,50 0,0', '#fff', 0.2)}{F('0,0 55,14 40,50 0,66', '#000', 0.15)}
      <text y={30} textAnchor="middle" fontSize={40} fontWeight={800} fill={cardInk}>FAT</text>
    </g>
    {range(3).map(i => <circle cx={759} cy={722 + ((time * 1.1 + i / 3) % 1) * 30} r={7} fill={accent} opacity={clamp(k * 3)}/>)}
    {F('726,756 792,756 784,798 734,798', chalk, 0.9)}{F('730,' + (796 - 30 * k) + ' 788,' + (796 - 30 * k) + ' 784,798 734,798', accent)}
    <text x={759} y={832} textAnchor="middle" fontSize={34} fontWeight={700} letterSpacing={2} fill={accent} opacity={k}>KETONES</text>
    <g transform={'translate(450 792) scale(1.45)'}>
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', accent)}{F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, accent)}<g transform="scale(-1 1)">{F(arm, accent)}{F(arm, '#000', 0.2)}</g>
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}
      <g>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}{F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {[-34, 16].map(x => R(x, -96 + 12 * yawn, 18, 18 - 12 * yawn, dark))}{R(-12, -58, 24, 6 + 16 * yawn, '#5A2E28')}
      </g>
    </g>
    {F(top, wood)}{F(top, '#fff', 0.16)}{R(180, 950, 720, 130, wood)}{R(180, 950, 720, 130, '#000', 0.25)}
    {F('400,914 420,902 520,902 540,914 520,926 420,926', chalk)}{F('400,914 540,914 520,926 420,926', '#000', 0.08)}
    {F('640,860 674,860 670,912 644,912', '#CFE8F0', 0.75)}{F('643,' + w + ' 671,' + w + ' 669,910 645,910', '#7FB9D6', 0.8)}
    {R(226, 892, 60, 14, cardInk)}{R(252, 820, 8, 76, cardInk)}{F('212,828 300,828 284,780 228,780', rose)}{F('256,780 284,780 300,828 256,828', '#000', 0.18)}
    {R(0, 0, 1080, 1920, '#0B1428', 0.12 * (1 - day))}{F('212,828 300,828 352,900 160,900', '#FFE3A3', 0.1 + 0.3 * (1 - day))}
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">{[0, 0.86, 0.97].map((o, i) => <stop offset={[0, 0.2, 1][i]} stopColor={cardInk} stopOpacity={o}/>)}</linearGradient></defs>
    <rect y={850} width={1080} height={1070} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={ink}>Then the body</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={accent}>burns fat.</text>
    <g opacity={hud} fill={chalk}>
      {R(90, 1040, 900, 2, chalk, 0.2)}
      <g fontWeight={600} letterSpacing={4} opacity={0.65}><text x={90} y={1086} fontSize={34}>NO FOOD FOR</text><text x={590} y={1086} fontSize={34}>RUNNING ON</text></g>
      <text x={88} y={1168} fontFamily="serif" fontSize={88}>{d}<tspan fontSize={46} fontStyle="italic">{d === 1 ? ' day' : ' days'}</tspan></text>
      <text x={590} y={1164} fontFamily="serif" fontStyle="italic" fontSize={66} fill={blush}>{'Fat'}</text>
      <text x={90} y={1220} fontSize={34} fontWeight={700} letterSpacing={6} fill={accent}>FUN FACT</text>
      <text x={90} y={1264} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>Angus Barbieri broke his fast with an egg.</text>
    </g>
  </svg>;
}`,
    },
    {
      label: "Day 5: eating again gets risky",
      line: "After five days, even eating again can be risky.",
      place: KITCHEN,
      source: String.raw`export default function Scene({ time, duration, colors }) {
  const { wall, floor, ink, chalk, cardInk, accent, rose, blush } = colors;
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', wood = '#9A6A45';
  const d = 5 + Math.round(9 * p), th = 0.3 + 0.2 * p, z = 1 + 0.06 * p, five = easeOut(clamp((time - at('five')) / 0.4)), eat = easeOut(clamp((time - at('eating')) / 0.4)), warn = easeOutBack(clamp((time - at('risky')) / 0.5)), cool = Math.sin(clamp((time - at('even')) / 1.6) * 3.14);
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' '), top = '230,900 850,900 900,950 180,950', arm = '-92,14 -70,4 -54,84 -86,86';
  return <svg>
    <g transform={'translate(' + 760 * (1 - z) + ' ' + 700 * (1 - z) + ') scale(' + z + ')'}>
    {R(0, 0, 1080, 1920, wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(150, 680, 450, 116, chalk, 0.12)}{range(7).map(i => R(150 + i * 64, 680, 3, 116, wall, 0.5))}
    <g transform="translate(250 600)">
      <polygon points={ring(74)} fill={cardInk}/><polygon points={ring(64)} fill={chalk}/>
      {range(12).map(i => <rect x={-3} y={-58} width={6} height={i % 3 ? 8 : 14} fill={cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <circle r={46} fill={accent} opacity={0.3}/><rect x={-4} y={-40} width={8} height={44} fill={cardInk} transform={'rotate(' + (time * 360) + ')'}/><circle r={7} fill={cardInk}/>
    </g>
    <rect x={600} y={520} width={310} height={400} fill={chalk} shadow="0 14 28 rgba(0,0,0,0.25)"/>{F('910,520 910,920 750,920', '#000', 0.06)}{R(606, 610, 10, 200, '#8E979F')}
    {R(622, 548, 274, 300, wood)}{R(632, 558, 254, 280, cardInk)}
    <g transform={'translate(759 680) scale(' + warn + ')'}><polygon points="0,-100 106,84 -106,84" fill="none" stroke={accent} strokeWidth={14} strokeLinejoin="round"/></g>
    <g opacity={eat}><circle cx={774} cy={726} r={30} fill={chalk}/><circle cx={774} cy={726} r={18} fill="#000" opacity={0.08}/>{range(3).map(i => R(712 + i * 7, 694, 4, 22, chalk))}{R(712, 712, 18, 8, chalk)}{R(717, 718, 8, 34, chalk)}</g>
    <text x={759} y={818} textAnchor="middle" fontSize={48} fontWeight={800} fill={chalk} opacity={five}>DAY 5+</text>
    {F('600,530 584,538 584,900 600,900', '#BFE6FF', 0.9 * cool)}{F('584,538 584,900 500,900 500,600', '#BFE6FF', 0.18 * cool)}
    <g transform={'translate(450 792) scale(1.45)'}>
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', accent)}{F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, accent)}<g transform="scale(-1 1)">{F(arm, accent)}{F(arm, '#000', 0.2)}</g>
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}
      <g transform={'scale(' + (1 - 0.08 * th) + ' 1)'}>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}{F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {F('-60,-84 -42,-72 -42,-40 -60,-52', '#000', 0.2 * th)}{F('60,-84 42,-72 42,-40 60,-52', '#000', 0.2 * th)}
        {[-34, 16].map(x => <g>{R(x, -96, 18, 18, dark)}{R(x - 3, -99, 24, 9, skin)}</g>)}{F('-16,-56 16,-56 8,-46 -8,-46', '#8A4B3C')}
      </g>
    </g>
    {F(top, wood)}{F(top, '#fff', 0.16)}{R(180, 950, 720, 130, wood)}{R(180, 950, 720, 130, '#000', 0.25)}
    {F('400,914 420,902 520,902 540,914 520,926 420,926', chalk)}{F('400,914 540,914 520,926 420,926', '#000', 0.08)}
    {F('640,860 674,860 670,912 644,912', '#CFE8F0', 0.75)}{F('643,880 671,880 669,910 645,910', '#7FB9D6', 0.8)}
    {R(226, 892, 60, 14, cardInk)}{R(252, 820, 8, 76, cardInk)}{F('212,828 300,828 284,780 228,780', rose)}{F('256,780 284,780 300,828 256,828', '#000', 0.18)}
    {R(0, 0, 1080, 1920, '#0B1428', 0.08)}{F('212,828 300,828 352,900 160,900', '#FFE3A3', 0.3)}
    </g>
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">{[0, 0.86, 0.97].map((o, i) => <stop offset={[0, 0.2, 1][i]} stopColor={cardInk} stopOpacity={o}/>)}</linearGradient></defs>
    <rect y={850} width={1080} height={1070} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={ink}>Even eating</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={accent}>gets risky.</text>
    <g opacity={hud} fill={chalk}>
      {R(90, 1040, 900, 2, chalk, 0.2)}
      <g fontWeight={600} letterSpacing={4} opacity={0.65}><text x={90} y={1086} fontSize={34}>NO FOOD FOR</text><text x={590} y={1086} fontSize={34}>EATING AGAIN</text></g>
      <text x={88} y={1168} fontFamily="serif" fontSize={88}>{d}<tspan fontSize={46} fontStyle="italic">{' days'}</tspan></text>
      <text x={590} y={1164} fontFamily="serif" fontStyle="italic" fontSize={66} fill={blush}>{'Risky'}</text>
      <text x={90} y={1220} fontSize={34} fontWeight={700} letterSpacing={6} fill={accent}>FUN FACT</text>
      <text x={90} y={1264} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>Angus Barbieri broke his fast with an egg.</text>
    </g>
  </svg>;
}`,
    },
    {
      label: "Week 5: brain mostly on ketones",
      line: "After five weeks, your brain runs mostly on ketones.",
      place: KITCHEN,
      source: String.raw`export default function Scene({ time, duration, colors }) {
  const { wall, floor, ink, chalk, cardInk, accent, rose, blush } = colors;
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', wood = '#9A6A45';
  const d = 14 + Math.round(21 * p), th = 0.55, brain = easeOutBack(clamp((time - at('brain')) / 0.5)), fill = clamp((time - at('mostly')) / 0.8);
  const B = ['-88,36', '-96,-4', '-76,-44', '-40,-68', '4,-76', '48,-66', '82,-38', '94,0', '82,32', '64,60', '30,72', '10,58', '-26,62', '-60,54'];
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' '), top = '230,900 850,900 900,950 180,950', arm = '-92,14 -70,4 -54,84 -86,86';
  return <svg>
    {R(0, 0, 1080, 1920, wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(150, 680, 450, 116, chalk, 0.12)}{range(7).map(i => R(150 + i * 64, 680, 3, 116, wall, 0.5))}
    <g transform="translate(250 600)">
      <polygon points={ring(74)} fill={cardInk}/><polygon points={ring(64)} fill={chalk}/>
      {range(12).map(i => <rect x={-3} y={-58} width={6} height={i % 3 ? 8 : 14} fill={cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <circle r={46} fill={accent} opacity={0.32}/><rect x={-4} y={-40} width={8} height={44} fill={cardInk} transform={'rotate(' + (time * 400) + ')'}/><circle r={7} fill={cardInk}/>
    </g>
    <rect x={600} y={520} width={310} height={400} fill={chalk} shadow="0 14 28 rgba(0,0,0,0.25)"/>{F('910,520 910,920 750,920', '#000', 0.06)}{R(606, 610, 10, 200, '#8E979F')}
    {R(622, 548, 274, 300, wood)}{R(632, 558, 254, 280, cardInk)}
    <g transform={'translate(760 664) scale(' + brain + ')'}>
      {F('8,56 30,60 26,106 12,106', '#6FA8DC')}{B.map((b, i) => F('0,0 ' + b + ' ' + B[(i + 1) % 14], i < 9 * fill ? accent : '#6FA8DC', [1, 0.84, 0.92][i % 3]))}
      {['-70,-14 -48,-26 -30,-8 -8,-36 16,-16 40,-44 66,-22', '-60,26 -36,14 -12,30 16,8 46,26 76,10'].map(g => <polyline points={g} fill="none" stroke={cardInk} strokeWidth={5} opacity={0.4}/>)}
    </g>
    <text x={759} y={828} textAnchor="middle" fontSize={34} fontWeight={700} letterSpacing={2} fill={accent} opacity={fill}>KETONES</text>
    <g transform={'translate(450 792) scale(1.45)'}>
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', accent)}{F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, accent)}{F('86,14 64,4 60,74 84,74', accent)}{F('84,74 60,74 18,-10 44,-14', accent)}{F('84,74 60,74 18,-10 44,-14', '#000', 0.2)}
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}
      <g transform={'rotate(7 0 -20) scale(' + (1 - 0.08 * th) + ' 1)'}>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}{F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {F('-60,-84 -42,-72 -42,-40 -60,-52', '#000', 0.2 * th)}{F('60,-84 42,-72 42,-40 60,-52', '#000', 0.2 * th)}
        {[-34, 16].map(x => <g>{R(x, -96, 18, 18, dark)}{R(x - 3, -99, 24, 13, skin)}{R(x, -74, 18, 5, '#6E4A7E', 0.6)}</g>)}{R(-12, -52, 24, 6, '#8A4B3C')}
      </g>{R(6, -30, 42, 24, skin)}{R(6, -12, 42, 6, '#000', 0.15)}
    </g>
    {F(top, wood)}{F(top, '#fff', 0.16)}{R(180, 950, 720, 130, wood)}{R(180, 950, 720, 130, '#000', 0.25)}
    {F('400,914 420,902 520,902 540,914 520,926 420,926', chalk)}{F('400,914 540,914 520,926 420,926', '#000', 0.08)}
    {F('640,860 674,860 670,912 644,912', '#CFE8F0', 0.75)}{F('643,880 671,880 669,910 645,910', '#7FB9D6', 0.8)}
    {R(226, 892, 60, 14, cardInk)}{R(252, 820, 8, 76, cardInk)}{F('212,828 300,828 284,780 228,780', rose)}{F('256,780 284,780 300,828 256,828', '#000', 0.18)}
    {R(0, 0, 1080, 1920, '#0B1428', 0.12)}{F('212,828 300,828 352,900 160,900', '#FFE3A3', 0.35)}
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">{[0, 0.86, 0.97].map((o, i) => <stop offset={[0, 0.2, 1][i]} stopColor={cardInk} stopOpacity={o}/>)}</linearGradient></defs>
    <rect y={850} width={1080} height={1070} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={ink}>After five weeks,</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={accent}>a new fuel.</text>
    <g opacity={hud} fill={chalk}>
      {R(90, 1040, 900, 2, chalk, 0.2)}
      <g fontWeight={600} letterSpacing={4} opacity={0.65}><text x={90} y={1086} fontSize={34}>NO FOOD FOR</text><text x={590} y={1086} fontSize={34}>MAIN FUEL</text></g>
      <text x={88} y={1168} fontFamily="serif" fontSize={88}>{d}<tspan fontSize={46} fontStyle="italic">{' days'}</tspan></text>
      <text x={590} y={1164} fontFamily="serif" fontStyle="italic" fontSize={66} fill={blush}>{'Ketones'}</text>
      <text x={90} y={1220} fontSize={34} fontWeight={700} letterSpacing={6} fill={accent}>FUN FACT</text>
      <text x={90} y={1264} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>Angus Barbieri broke his fast with an egg.</text>
    </g>
  </svg>;
}`,
    },
    {
      label: "46 to 73 days: the danger zone",
      line: "But in one hunger strike, men died after forty-six to seventy-three days.",
      place: KITCHEN,
      source: String.raw`export default function Scene({ time, duration, colors }) {
  const { wall, floor, ink, chalk, cardInk, accent, rose, blush } = colors;
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', wood = '#9A6A45';
  const d = 35 + Math.round(38 * p), th = 0.8, x = 648 + 2.75 * d, band = easeOut(clamp((time - at('forty-six')) / 0.8)), tag = easeOutBack(clamp((time - at('strike')) / 0.4));
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' '), top = '230,900 850,900 900,950 180,950', arm = '-92,14 -70,4 -54,84 -86,86';
  return <svg>
    {R(0, 0, 1080, 1920, wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(150, 680, 450, 116, chalk, 0.12)}{range(7).map(i => R(150 + i * 64, 680, 3, 116, wall, 0.5))}
    <g transform="translate(250 600)">
      <polygon points={ring(74)} fill={cardInk}/><polygon points={ring(64)} fill={chalk}/>
      {range(12).map(i => <rect x={-3} y={-58} width={6} height={i % 3 ? 8 : 14} fill={cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <circle r={46} fill={accent} opacity={0.36}/><rect x={-4} y={-40} width={8} height={44} fill={cardInk} transform={'rotate(' + (time * 450) + ')'}/><circle r={7} fill={cardInk}/>
    </g>
    <rect x={600} y={520} width={310} height={400} fill={chalk} shadow="0 14 28 rgba(0,0,0,0.25)"/>{F('910,520 910,920 750,920', '#000', 0.06)}{R(606, 610, 10, 200, '#8E979F')}
    {R(622, 548, 274, 300, wood)}{R(632, 558, 254, 280, cardInk)}
    {R(648, 728, 222, 6, chalk)}{range(9).map(i => R(646 + i * 27.5, 716, 4, 30, chalk, i % 5 ? 0.5 : 1))}{R(774, 704, 75 * band, 54, blush, 0.85)}
    {F((x - 14) + ',670 ' + (x + 14) + ',670 ' + x + ',698', accent)}
    <g fill={chalk}><text x={648} y={804} textAnchor="middle" fontSize={40}>0</text><g opacity={band}><text x={774} y={804} textAnchor="middle" fontSize={40}>46</text><text x={849} y={804} textAnchor="middle" fontSize={40}>73</text></g></g>
    <g transform={'translate(811 616) scale(' + tag + ')'}>{R(-64, -32, 128, 58, chalk)}<text y={13} textAnchor="middle" fontSize={44} fontWeight={800} fill={cardInk}>1981</text></g>
    <g transform={'translate(450 832) scale(1.45)'}>
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', accent)}{F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, accent)}<g transform="scale(-1 1)">{F(arm, accent)}{F(arm, '#000', 0.2)}</g>
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}
      <g transform={'rotate(9 0 -20) scale(' + (1 - 0.08 * th) + ' 1)'}>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}{F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {F('-60,-84 -42,-72 -42,-40 -60,-52', '#000', 0.2 * th)}{F('60,-84 42,-72 42,-40 60,-52', '#000', 0.2 * th)}
        {[-34, 16].map(x => <g>{R(x, -96, 18, 18, dark)}{R(x - 3, -99, 24, 15, skin)}{R(x, -74, 18, 5, '#6E4A7E', 0.8)}</g>)}{R(-12, -52, 24, 6, '#8A4B3C')}
      </g>
    </g>
    {F(top, wood)}{F(top, '#fff', 0.16)}{R(180, 950, 720, 130, wood)}{R(180, 950, 720, 130, '#000', 0.25)}
    {F('400,914 420,902 520,902 540,914 520,926 420,926', chalk)}{F('400,914 540,914 520,926 420,926', '#000', 0.08)}
    {F('640,860 674,860 670,912 644,912', '#CFE8F0', 0.75)}{F('643,880 671,880 669,910 645,910', '#7FB9D6', 0.8)}
    {R(226, 892, 60, 14, cardInk)}{R(252, 820, 8, 76, cardInk)}{F('212,828 300,828 284,780 228,780', rose)}{F('256,780 284,780 300,828 256,828', '#000', 0.18)}
    {F('330,878 570,878 590,912 310,912', accent)}{F('450,878 570,878 590,912 450,912', '#000', 0.18)}
    {R(0, 0, 1080, 1920, '#0B1428', 0.14 + 0.12 * p)}{F('212,828 300,828 352,900 160,900', '#FFE3A3', (0.3 - 0.18 * p) * (0.55 + 0.45 * Math.abs(Math.sin(time * 9) * Math.sin(time * 4))))}
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">{[0, 0.86, 0.97].map((o, i) => <stop offset={[0, 0.2, 1][i]} stopColor={cardInk} stopOpacity={o}/>)}</linearGradient></defs>
    <rect y={850} width={1080} height={1070} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={ink}>Then comes</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={accent}>the danger zone.</text>
    <g opacity={hud} fill={chalk}>
      {R(90, 1040, 900, 2, chalk, 0.2)}
      <g fontWeight={600} letterSpacing={4} opacity={0.65}><text x={90} y={1086} fontSize={34}>NO FOOD FOR</text><text x={590} y={1086} fontSize={34}>STAGE</text></g>
      <text x={88} y={1168} fontFamily="serif" fontSize={88}>{d}<tspan fontSize={46} fontStyle="italic">{' days'}</tspan></text>
      <text x={590} y={1164} fontFamily="serif" fontStyle="italic" fontSize={66} fill={blush}>{'Danger'}</text>
      <text x={90} y={1220} fontSize={34} fontWeight={700} letterSpacing={6} fill={accent}>FUN FACT</text>
      <text x={90} y={1264} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>Angus Barbieri broke his fast with an egg.</text>
    </g>
  </svg>;
}`,
    },
    {
      label: "382 days, under doctors' care",
      line: "One very heavy man, under doctors' care, fasted three hundred eighty-two days.",
      place: KITCHEN,
      source: String.raw`export default function Scene({ time, duration, colors }) {
  const { wall, floor, ink, chalk, cardInk, accent, rose, blush } = colors;
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', wood = '#9A6A45';
  const d = 73 + Math.round(309 * p * p), th = 0.5, z = 1 + 0.07 * p, clip = easeOutBack(clamp((time - at('man')) / 0.5));
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' '), top = '230,900 850,900 900,950 180,950', arm = '-92,14 -70,4 -54,84 -86,86';
  return <svg>
    <g transform={'translate(' + 760 * (1 - z) + ' ' + 700 * (1 - z) + ') scale(' + z + ')'}>
    {R(0, 0, 1080, 1920, wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(150, 680, 450, 116, chalk, 0.12)}{range(7).map(i => R(150 + i * 64, 680, 3, 116, wall, 0.5))}
    <g transform="translate(250 600)">
      <polygon points={ring(74)} fill={cardInk}/><polygon points={ring(64)} fill={chalk}/>
      {range(12).map(i => <rect x={-3} y={-58} width={6} height={i % 3 ? 8 : 14} fill={cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <circle r={46} fill={accent} opacity={0.4}/><rect x={-4} y={-40} width={8} height={44} fill={cardInk} transform={'rotate(' + (time * 520) + ')'}/><circle r={7} fill={cardInk}/>
    </g>
    <rect x={600} y={520} width={310} height={400} fill={chalk} shadow="0 14 28 rgba(0,0,0,0.25)"/>{F('910,520 910,920 750,920', '#000', 0.06)}{R(606, 610, 10, 200, '#8E979F')}
    {R(622, 548, 274, 300, wood)}{R(632, 558, 254, 280, cardInk)}
    <g transform={'translate(0 ' + -60 * (1 - clip) + ')'} opacity={clamp(clip * 2)}>
      {R(650, 568, 218, 262, '#B98A5A')}{R(662, 590, 194, 228, chalk)}{R(728, 556, 62, 26, '#8E979F')}
      <text x={759} y={636} textAnchor="middle" fontSize={34} fontWeight={800} letterSpacing={2} fill={cardInk}>DUNDEE</text>
      <text x={759} y={676} textAnchor="middle" fontFamily="serif" fontSize={36} fill={cardInk}>1965–66</text>
      <rect x={680} y={702} width={40} height={18} rx={9} fill={rose}/>{F('682,742 716,742 710,770 688,770', accent)}{R(714, 748, 10, 12, accent)}{F('686,786 712,786 708,814 690,814', '#7FB9D6')}
      {range(3).map(i => <polyline points={'800,' + (712 + i * 44) + ' 812,' + (724 + i * 44) + ' 836,' + (698 + i * 44)} fill="none" stroke={rose} strokeWidth={7} strokeLinecap="round" opacity={clamp((p - 0.3 - 0.22 * i) / 0.1)}/>)}
    </g>
    <g transform={'translate(450 792) scale(1.45)'}>
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', accent)}{F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, accent)}<g transform="scale(-1 1)">{F(arm, accent)}{F(arm, '#000', 0.2)}</g>
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}
      <g transform={'scale(' + (1 - 0.08 * th) + ' 1)'}>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}{F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {F('-60,-84 -42,-72 -42,-40 -60,-52', '#000', 0.2 * th)}{F('60,-84 42,-72 42,-40 60,-52', '#000', 0.2 * th)}
        {[-28, 22].map(x => R(x, -96, 18, 18, dark))}{R(-12, -52, 24, 6, '#8A4B3C')}
      </g>
    </g>
    {F(top, wood)}{F(top, '#fff', 0.16)}{R(180, 950, 720, 130, wood)}{R(180, 950, 720, 130, '#000', 0.25)}
    {F('400,914 420,902 520,902 540,914 520,926 420,926', chalk)}{F('400,914 540,914 520,926 420,926', '#000', 0.08)}
    {F('640,860 674,860 670,912 644,912', '#CFE8F0', 0.75)}{F('643,880 671,880 669,910 645,910', '#7FB9D6', 0.8)}
    {R(226, 892, 60, 14, cardInk)}{R(252, 820, 8, 76, cardInk)}{F('212,828 300,828 284,780 228,780', rose)}{F('256,780 284,780 300,828 256,828', '#000', 0.18)}
    {R(0, 0, 1080, 1920, '#0B1428', 0.04)}{F('212,828 300,828 352,900 160,900', '#FFE3A3', 0.15)}
    </g>
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">{[0, 0.86, 0.97].map((o, i) => <stop offset={[0, 0.2, 1][i]} stopColor={cardInk} stopOpacity={o}/>)}</linearGradient></defs>
    <rect y={850} width={1080} height={1070} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={ink}>Over a year,</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={accent}>under doctors’ care.</text>
    <g opacity={hud} fill={chalk}>
      {R(90, 1040, 900, 2, chalk, 0.2)}
      <g fontWeight={600} letterSpacing={4} opacity={0.65}><text x={90} y={1086} fontSize={34}>HIS FAST</text><text x={590} y={1086} fontSize={34}>WATCHED BY</text></g>
      <text x={88} y={1168} fontFamily="serif" fontSize={88}>{d}<tspan fontSize={46} fontStyle="italic">{' days'}</tspan></text>
      <text x={590} y={1164} fontFamily="serif" fontStyle="italic" fontSize={66} fill={blush}>{'Doctors'}</text>
      <text x={90} y={1220} fontSize={34} fontWeight={700} letterSpacing={6} fill={accent}>FUN FACT</text>
      <text x={90} y={1264} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>Angus Barbieri broke his fast with an egg.</text>
    </g>
  </svg>;
}`,
    },
    {
      label: "The real answer: weeks",
      line: "The real answer is weeks, so please don't test it.",
      place: KITCHEN,
      source: String.raw`export default function Scene({ time, duration, colors }) {
  const { wall, floor, ink, chalk, cardInk, accent, rose, blush } = colors;
  const p = easeInOut(clamp((time - 0.3) / (duration - 0.5))), hud = easeOut(clamp(time / 0.6)), skin = '#E3A982', dark = '#24262E', wood = '#9A6A45';
  const back = easeInOut(clamp(time / 1.4)), d = Math.round(73 * (1 - back)), open = easeInOut(clamp((time - at('real')) / 0.6)), egg = easeInOut(clamp((time - at('weeks')) / 0.6)), crack = easeOut(clamp((time - at('test')) / 0.4));
  const F = (pts, fill, o = 1) => <polygon points={pts} fill={fill} opacity={o}/>;
  const R = (x, y, w, h, fill, o = 1) => <rect x={x} y={y} width={w} height={h} fill={fill} opacity={o}/>;
  const ring = r => range(12).map(i => r * Math.cos(i * 0.5236) + ',' + r * Math.sin(i * 0.5236)).join(' '), top = '230,900 850,900 900,950 180,950', arm = '-92,14 -70,4 -54,84 -86,86';
  return <svg>
    {R(0, 0, 1080, 1920, wall)}
    {F('150,0 1080,0 1080,640 150,240', '#fff', 0.05)}
    {R(150, 800, 780, 160, '#000', 0.14)}{R(150, 796, 780, 8, chalk, 0.5)}
    {F('0,0 150,0 150,960 0,1083', '#fff', 0.07)}{F('930,0 1080,0 1080,1083 930,960', '#000', 0.24)}
    {F('0,1083 150,960 930,960 1080,1083 1080,1920 0,1920', floor)}
    {range(10).map(i => F((150 + i * 78) + ',960 ' + (228 + i * 78) + ',960 ' + (i * 312 - 708) + ',1920 ' + (i * 312 - 1020) + ',1920', i % 2 ? '#000' : '#fff', 0.07))}
    {R(150, 680, 450, 116, chalk, 0.12)}{range(7).map(i => R(150 + i * 64, 680, 3, 116, wall, 0.5))}
    <g transform="translate(250 600)">
      <polygon points={ring(74)} fill={cardInk}/><polygon points={ring(64)} fill={chalk}/>
      {range(12).map(i => <rect x={-3} y={-58} width={6} height={i % 3 ? 8 : 14} fill={cardInk} transform={'rotate(' + i * 30 + ')'}/>)}
      <rect x={-4} y={-40} width={8} height={44} fill={cardInk} transform={'rotate(' + (200 + time * 15) + ')'}/><circle r={7} fill={cardInk}/>
    </g>
    <rect x={600} y={520} width={310} height={400} fill="#E4F4FA" shadow="0 14 28 rgba(0,0,0,0.25)"/>{R(612, 650, 286, 8, chalk)}{R(612, 780, 286, 8, chalk)}{R(640, 596, 44, 54, chalk)}{R(700, 726, 60, 54, rose)}{R(780, 740, 40, 40, '#FFF4DC')}
    <g transform={'translate(' + 746 * open + ' 0) scale(' + (1 - 0.82 * open) + ' 1)'}>
      {R(600, 520, 310, 400, chalk)}{F('910,520 910,920 750,920', '#000', 0.06 + 0.2 * open)}{R(606, 610, 10, 200, '#8E979F')}{R(622, 548, 274, 300, wood)}{R(632, 558, 254, 280, cardInk)}
    </g>
    <g transform={'translate(450 792) scale(1.45)'}>
      {F('-90,150 -74,8 -56,-4 56,-4 74,8 90,150', accent)}{F('-90,150 -74,8 -56,-4 -20,-4 -32,150', '#fff', 0.14)}{F('30,-4 56,-4 74,8 90,150 40,150', '#000', 0.2)}
      {F(arm, accent)}<g transform="scale(-1 1)">{F(arm, accent)}{F(arm, '#000', 0.2)}</g>
      {F('-18,-4 18,-4 0,20', skin)}{R(-18, -24, 36, 24, skin)}
      <g>
        {F('-44,-150 44,-150 60,-134 60,-36 44,-20 -44,-20 -60,-36 -60,-134', skin)}{F('30,-150 44,-150 60,-134 60,-36 44,-20 30,-20', '#000', 0.14)}{F('-44,-150 0,-150 -60,-104 -60,-134', '#fff', 0.16)}
        {F('-63,-100 -63,-136 -46,-160 -4,-168 6,-184 14,-166 46,-160 63,-136 63,-100 52,-124 20,-130 -4,-118 -30,-132 -54,-122', dark)}
        {[-34, 16].map(x => R(x, -90, 18, 6, dark))}{F('-24,-60 24,-60 14,-42 -14,-42', '#8A4B3C')}
      </g>
    </g>
    {F(top, wood)}{F(top, '#fff', 0.16)}{R(180, 950, 720, 130, wood)}{R(180, 950, 720, 130, '#000', 0.25)}
    {F('400,914 420,902 520,902 540,914 520,926 420,926', chalk)}{F('400,914 540,914 520,926 420,926', '#000', 0.08)}
    {F('640,860 674,860 670,912 644,912', '#CFE8F0', 0.75)}{F('643,880 671,880 669,910 645,910', '#7FB9D6', 0.8)}
    {R(226, 892, 60, 14, cardInk)}{R(252, 820, 8, 76, cardInk)}{F('212,828 300,828 284,780 228,780', rose)}{F('256,780 284,780 300,828 256,828', '#000', 0.18)}
    <g transform={'translate(' + (452 + 300 * (1 - egg)) + ' ' + (906 - 150 * (1 - egg) - 110 * Math.sin(egg * 3.14)) + ') scale(' + (1.1 + 0.4 * egg) + ')'} opacity={clamp(egg * 20)}>
      {F('-18,0 18,0 12,-16 -12,-16', rose)}{F('-18,-14 -14,-46 14,-46 18,-14', '#FFF4DC')}{F('0,-46 14,-46 18,-14 0,-14', '#000', 0.08)}{F('-10,-46 10,-46 6,-50 -6,-50', '#F2B33D', crack)}
      <g transform={'translate(' + 24 * crack + ' ' + -30 * crack + ') rotate(' + 40 * crack + ' 0 -46)'}>{F('-14,-46 0,-64 14,-46', '#FFF4DC')}</g>
      {R(26, -30, 44, 30, '#D9A15B')}{R(32, -24, 30, 14, '#FBE7A1')}
    </g>
    {R(0, 0, 1080, 1920, '#FFC870', 0.08)}
    <defs><linearGradient id="hud" x1="0" y1="0" x2="0" y2="1">{[0, 0.86, 0.97].map((o, i) => <stop offset={[0, 0.2, 1][i]} stopColor={cardInk} stopOpacity={o}/>)}</linearGradient></defs>
    <rect y={850} width={1080} height={1070} fill="url(#hud)"/>
    <text x={540} y={384} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontSize={78} fill={ink}>So, how long?</text>
    <text x={540} y={478} width={900} maxLines={1} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={84} fill={accent}>Weeks, not a year.</text>
    <g opacity={hud} fill={chalk}>
      {R(90, 1040, 900, 2, chalk, 0.2)}
      <g fontWeight={600} letterSpacing={4} opacity={0.65}><text x={90} y={1086} fontSize={34}>NO FOOD FOR</text><text x={590} y={1086} fontSize={34}>VERDICT</text></g>
      <text x={88} y={1168} fontFamily="serif" fontSize={88}>{d}<tspan fontSize={46} fontStyle="italic">{d === 1 ? ' day' : ' days'}</tspan></text>
      <text x={590} y={1164} fontFamily="serif" fontStyle="italic" fontSize={66} fill={blush}>{'Weeks'}</text>
      <text x={90} y={1220} fontSize={34} fontWeight={700} letterSpacing={6} fill={accent}>FUN FACT</text>
      <text x={90} y={1264} fontFamily="serif" fontStyle="italic" fontSize={38} opacity={0.85}>Angus Barbieri broke his fast with an egg.</text>
    </g>
  </svg>;
}`,
    },
  ],
};
