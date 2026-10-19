// Flat Vector's reference video (index.mjs `reference`): "How much of you is new today?", a big-question science
// short in eight scenes that climb one ladder of time, at the detail every video in the style should have: one hero
// object per scene floating on the plum night with a soft glow and drifting dust, every shape shaded the same way (a
// darker crescent on the side away from the light, one small highlight), this style's own beans for people, the
// ladder tag at the top left with one dot per scene at the top right, a huge number in the accent, and camera moves
// (a pull back from inside the hero, a slow push in) for transitions. Its skeleton is the format's: the question and
// a striking number, a cascade up a ladder (every second, every few days, three months), the twist (it isn't a whole
// new you: blood, then fat cells, then cells kept for life) and an awe close back where it started.
//
// Its facts: the body replaces about 0.33 trillion cells a day, about 3.8 million a second and about 80 g, most of
// them blood cells, then the gut lining (Sender & Milo, "The distribution of cellular turnover in the human body",
// Nature Medicine, 2021); a reference adult holds about 30 trillion human cells (Sender, Fuchs & Milo, PLoS Biology,
// 2016), so three months of turnover (about 30 trillion) is about as many; a red blood cell lives about 120 days; the
// gut lining renews every 3–5 days (Darwich et al., Molecular Pharmaceutics, 2014); fat cells average about ten years
// old, about a tenth renewed each year (Spalding et al., Nature, 2008); no neurons are added to the adult human
// neocortex (Bhardwaj et al., PNAS, 2006); the fibre cells at the centre of the eye's lens form before birth and stay
// (Lynnerup et al., PLoS ONE, 2008). A new Flat Vector video remakes it. Each scene names its
// place (a new hero per scene, the last a bookend of the first), which a new video never copies (guide.mjs
// lookGuide). Bump the id when the video changes (a place is text only: it changes no frame).
//
// Every scene's code stands alone, so each spells out the same small kit (FLAT_KIT, written into it below): on(t, d),
// an ease-out from the moment t over d seconds; Orb, a shaded circle (its colour, colors.cardInk at 30% over it, the
// same circle again offset a tenth of its size toward the top left, all clipped to it, so a crescent stays dark on the
// far side; its children drawn inside the clip; one small highlight); Bean, this style's own character (a capsule h
// tall standing with its feet at x, y, shaded the same way, two chalk eyes whose pupils follow look, a soft glow under
// it); and Tag, a chalk label with a leader line to what it names. flatSky paints the night (the wall edge to edge, a
// big soft radial glow and the drifting dust, FLAT_DUST); flatHead draws the ladder tag and the row of scene dots;
// flatBig, the huge number and its unit line.

/** The kit every Flat Vector scene starts from (see above), indented for a scene's body. */
export const FLAT_KIT = String.raw`const on = (t, d) => easeOut(clamp((time - t) / (d || 0.5)));
  const Orb = ({ id, x, y, r, c, children }) => <g>
    <clipPath id={id}><circle cx={x} cy={y} r={r}/></clipPath>
    <g clipPath={'url(#' + id + ')'}>
      <circle cx={x} cy={y} r={r} fill={c}/>
      <circle cx={x} cy={y} r={r} fill={colors.cardInk} opacity={0.3}/>
      <circle cx={x - r * 0.1} cy={y - r * 0.1} r={r} fill={c}/>
      {children}
    </g>
    <circle cx={x - r * 0.45} cy={y - r * 0.45} r={r * 0.09} fill={colors.chalk} opacity={0.6}/>
  </g>;
  const Bean = ({ id, x, y, h, c, look, children }) => { const w = h * 0.6;
    return <g transform={'translate(' + x + ' ' + y + ')'}>
      <ellipse cx={0} cy={0} rx={w * 0.8} ry={h * 0.07} fill={colors.accent} opacity={0.3}/>
      <clipPath id={id}><rect x={-w / 2} y={-h} width={w} height={h} rx={w / 2}/></clipPath>
      <g clipPath={'url(#' + id + ')'}>
        <rect x={-w / 2} y={-h} width={w} height={h} fill={c}/>
        <rect x={-w / 2} y={-h} width={w} height={h} fill={colors.cardInk} opacity={0.3}/>
        <rect x={-w * 0.6} y={-h - w * 0.1} width={w} height={h} rx={w / 2} fill={c}/>
        {children}
      </g>
      <circle cx={-w * 0.22} cy={w * 0.3 - h} r={w * 0.07} fill={colors.chalk} opacity={0.6}/>
      {[-1, 1].map(s => <g>
        <circle cx={s * w * 0.18} cy={-h * 0.68} r={w * 0.12} fill={colors.chalk}/>
        <circle cx={s * w * 0.18 + (look || 0) * w * 0.05} cy={-h * 0.68} r={w * 0.06} fill={colors.cardInk}/>
      </g>)}
    </g>; };
  const Tag = ({ x, y, w, to, children }) => <g>
    <line x1={x} y1={y} x2={to[0]} y2={to[1]} stroke={colors.chalk} strokeWidth={3} strokeOpacity={0.7}/>
    <circle cx={to[0]} cy={to[1]} r={8} fill={colors.chalk}/>
    <rect x={x - w / 2} y={y - 32} width={w} height={64} rx={10} fill={colors.chalk}/>
    <text x={x} y={y + 13} textAnchor="middle" fontSize={36} fontWeight={800} letterSpacing={1} fill={colors.cardInk}>{children}</text>
  </g>;`;

/** The drifting dust: 48 tiny dots in seeded places, floating slowly up (a test strips it to see what the scene draws). */
export const FLAT_DUST = String.raw`{range(48).map(i => <circle cx={(i * 263 + 1080 + 10 * Math.sin(time * 0.5 + i)) % 1080} cy={(i * 397 + 1920 - (time * (8 + (i % 5) * 4)) % 1920) % 1920} r={2 + (i % 3)} fill={colors.blush} opacity={0.2 + (i % 4) * 0.1}/>)}`;

/** The plum night edge to edge, a big soft glow in colors.accent or colors.rose centred at (x, y), and the dust. */
export const flatSky = (glow, x, y) => String.raw`<rect x={0} y={0} width={1080} height={1920} fill={colors.wall}/>
    <defs><radialGradient id="glow"><stop offset="0" stopColor={colors.${glow}} stopOpacity={0.24}/><stop offset="1" stopColor={colors.${glow}} stopOpacity={0}/></radialGradient></defs>
    <circle cx={${x}} cy={${y}} r={620 + 20 * Math.sin(time * 1.2)} fill="url(#glow)"/>
    ${FLAT_DUST}`;

/** The ladder tag's width for its words: uppercase heavy sans at 36 px, letterSpacing 2, 24 px of air each side. */
export const tagWidth = (step) => 48 + [...step].reduce((w, c) => w + (c === ' ' ? 11 : /[.,]/.test(c) ? 12 : 26), 0);

/**
 * The ladder tag at the top left of the stage (the step in time or scale, sliding in) and, at the top right, one dot
 * per scene of the video (`of`), lit up to this one (`n`, from 0). A single example scene has no dots (`of` 0); a
 * step that counts (JSX, like {'AFTER ' + m + ' MIN'}) passes the width of its longest words.
 */
export const flatHead = (step, n, of = 8, width = tagWidth(step)) => String.raw`<g opacity={on(0.05, 0.4)} transform={'translate(' + 40 * (on(0.05, 0.4) - 1) + ' 0)'}>
      <rect x={60} y={262} width={${width}} height={64} rx={12} fill={colors.accent}/>
      <text x={84} y={307} fontSize={36} fontWeight={800} letterSpacing={2} fill={colors.wall}>${step}</text>
    </g>${of ? String.raw`
    {range(${of}).map(i => <circle cx={${960 - (of - 1) * 30} + i * 30} cy={294} r={i === ${n} ? 9 : 6} fill={i > ${n} ? colors.ink : colors.accent} opacity={i > ${n} ? 0.3 : 1}/>)}` : ''}`;

/** The huge number (JSX `value`, in colors.accent, sized to fit) and its unit line, arriving on the word `cue`. */
export const flatBig = (cue, value, unit, y = 1150) => String.raw`<g opacity={on(at('${cue}'), 0.4)}>
      <text x={540} y={${y}} width={880} maxLines={1} textAnchor="middle" fontSize={170} fontWeight={900} letterSpacing={-4} fill={colors.accent}>{${value}}</text>
      <text x={540} y={${y + 90}} width={880} maxLines={1} textAnchor="middle" fontSize={44} fontWeight={700} fill={colors.ink} opacity={0.8}>${unit}</text>
    </g>`;

// 1. Today: the question over a pull back from close on a bean made of cells, some swapping as it breathes, and the
// day's count. The question is the hook's title, so it's up by half a second (the first frame people see, and the
// cover's); the camera pulls back about the bean's top, which stays below the question, so it reads on the night.
const TODAY = String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const cam = 1 + 2.6 * (1 - easeInOut(clamp(time / 1.8))), n = easeOut(clamp((time - at('three')) / 1.4));
  return <svg>
    ${flatSky('rose', 540, 760)}
    <g transform={'translate(540 490) scale(' + cam + ') translate(0 250) scale(' + (1 + 0.02 * Math.sin(time * 2)) + ')'}>
      {range(12).map(i => { const p = (time * 0.4 + i / 12) % 1, a = i * 2.4;
        return <circle cx={Math.cos(a) * (190 + 240 * p)} cy={Math.sin(a) * (290 + 160 * p)} r={12 * (1 - p)} fill={i % 2 ? colors.rose : colors.accent} opacity={1 - p}/>; })}
      <Bean id="you" x={0} y={250} h={500} c={colors.rose} look={Math.sin(time * 0.8)}>
        {range(48).map(i => { const p = (time * 0.6 + i * 0.618) % 1;
          return <circle cx={-125 + (i % 6) * 50 + (Math.floor(i / 6) % 2) * 25} cy={-480 + Math.floor(i / 6) * 62} r={21 * clamp(p * 6)} fill={p < 0.3 ? colors.accent : colors.chalk} opacity={p < 0.3 ? 0.9 : 0.15}/>; })}
      </Bean>
    </g>
    <text x={540} y={430} width={880} maxLines={1} textAnchor="middle" fontSize={68} fontWeight={800} fill={colors.ink} opacity={on(0.3, 0.5)}>How much of you is new?</text>
    ${flatBig('three', "Math.round(330 * n) + ' billion'", 'cells replaced, every day')}
    ${flatHead('TODAY', 0)}
  </svg>;
}`;

// 2. Every second: a stopwatch whose inner ring fills once a second, throwing off a stream of cells, and the count.
const SECOND = String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const s = on(0, 0.8), k = Math.round(38 * easeOut(clamp((time - at('three')) / 1.2)));
  return <svg>
    ${flatSky('accent', 540, 700)}
    {range(28).map(i => { const p = (time * 0.5 + i / 28) % 1, a = (i % 2 ? -0.35 : -2.79) + ((i % 7) - 3) * 0.08, d = 300 + 460 * p;
      return <circle cx={540 + Math.cos(a) * d} cy={700 + Math.sin(a) * d} r={14 - 8 * p} fill={i % 3 ? colors.rose : colors.accent} opacity={(1 - p) * s}/>; })}
    <g transform={'translate(540 700) scale(' + (0.7 + 0.3 * s) * (1 + 0.015 * Math.sin(time * 3)) + ')'}>
      <rect x={-44} y={-336} width={88} height={70} rx={16} fill={colors.chalk}/>
      <rect x={-44} y={-290} width={88} height={24} fill={colors.cardInk} opacity={0.3}/>
      <Orb id="dial" x={0} y={0} r={280} c={colors.chalk}>
        {range(60).map(i => <rect x={-3} y={-258} width={6} height={i % 5 ? 16 : 34} fill={colors.cardInk} opacity={0.45} transform={'rotate(' + i * 6 + ')'}/>)}
        <circle cx={0} cy={0} r={180} fill="none" stroke={colors.rose} strokeWidth={30} strokeDasharray={1131} strokeDashoffset={1131 * (1 - (time % 1))} transform="rotate(-90)"/>
        <rect x={-7} y={-226} width={14} height={250} rx={7} fill={colors.accent} transform={'rotate(' + time * 90 + ')'}/>
        <circle cx={0} cy={0} r={24} fill={colors.cardInk}/>
      </Orb>
    </g>
    <g opacity={on(at('eighty'), 0.4)}><Tag x={820} y={410} w={270} to={[738, 502]}>80 g A DAY</Tag></g>
    ${flatBig('three', "Math.floor(k / 10) + '.' + (k % 10) + ' million'", 'new cells, every second')}
    ${flatHead('EVERY SECOND', 1)}
  </svg>;
}`;

// 3. Every few days: the gut wall in cross-section, cells riding up each villus and coming off at its tip.
const GUT = String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const s = on(0, 0.6), xs = [-315, -105, 105, 315];
  return <svg>
    ${flatSky('accent', 540, 640)}
    <g transform={'translate(540 720) scale(' + (0.94 + 0.06 * s + 0.04 * clamp(time / duration)) + ')'}>
      {range(12).map(j => { const p = (time * 0.3 + j / 12) % 1;
        return <circle cx={xs[j % 4] + 30 * Math.sin(j * 2 + time)} cy={-290 - 260 * p} r={16 - 6 * p} fill={colors.rose} opacity={(1 - p) * 0.85}/>; })}
      {xs.map((x, i) => <g>
        <clipPath id={'v' + i}><rect x={x - 75} y={-270} width={150} height={440} rx={75}/></clipPath>
        <g clipPath={'url(#v' + i + ')'}>
          <rect x={x - 75} y={-270} width={150} height={440} fill={colors.blush}/>
          <rect x={x - 75} y={-270} width={150} height={440} fill={colors.cardInk} opacity={0.3}/>
          <rect x={x - 90} y={-285} width={150} height={440} rx={75} fill={colors.blush}/>
          <rect x={x - 12} y={-200} width={24} height={380} rx={12} fill={colors.accent} opacity={0.6}/>
          {range(9).map(j => { const p = (time * 0.16 + j / 9) % 1;
            return [-1, 1].map(d => <circle cx={x + d * 56} cy={170 - 450 * p} r={17} fill={colors.rose}/>); })}
        </g>
      </g>)}
      <rect x={-470} y={150} width={940} height={110} rx={40} fill={colors.rose}/>
      <rect x={-470} y={215} width={940} height={45} rx={22} fill={colors.cardInk} opacity={0.3}/>
    </g>
    <g opacity={on(at('wear'), 0.4)}><Tag x={300} y={410} w={230} to={[435, 440]}>WORN OFF</Tag></g>
    <g opacity={on(at('replaced'), 0.4)}><Tag x={540} y={935} w={250} to={[645, 880]}>NEW CELLS</Tag></g>
    ${flatBig('few', "'3–5 days'", 'for a whole new lining', 1160)}
    ${flatHead('EVERY FEW DAYS', 2)}
  </svg>;
}`;

// 4. In three months: a floating balance, you on one pan and a heap of new cells on the other, coming level; then
// the camera pushes into the heap, and the next scene opens on one cell.
const THREE = String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const n = easeInOut(clamp((time - at('thirty') + 0.6) / 2)), t = (1 - n) * (1.2 * Math.sin(time * 1.5) - 11), a = t * 0.01745;
  const L = [540 - 310 * Math.cos(a), 600 - 310 * Math.sin(a)], R = [540 + 310 * Math.cos(a), 600 + 310 * Math.sin(a)];
  const push = easeInOut(clamp((time - duration + 1.4) / 1.3)), px = R[0], py = R[1] + 160;
  const Pan = ({ p }) => <g>
    <polyline points={(p[0] - 96) + ',' + (p[1] + 226) + ' ' + p[0] + ',' + p[1] + ' ' + (p[0] + 96) + ',' + (p[1] + 226)} fill="none" stroke={colors.chalk} strokeWidth={4} strokeOpacity={0.7}/>
    <path d={'M ' + (p[0] - 110) + ' ' + (p[1] + 226) + ' Q ' + p[0] + ' ' + (p[1] + 300) + ' ' + (p[0] + 110) + ' ' + (p[1] + 226) + ' Z'} fill={colors.accent}/>
    <ellipse cx={p[0] + 16} cy={p[1] + 246} rx={78} ry={12} fill={colors.cardInk} opacity={0.3}/>
  </g>;
  return <svg>
    ${flatSky('rose', 540, 760)}
    <g transform={'translate(' + (px + (540 - px) * push) + ' ' + (py + (720 - py) * push) + ') scale(' + (1 + 1.6 * push) + ') translate(' + -px + ' ' + -py + ')'}>
    <rect x={526} y={600} width={28} height={380} fill={colors.chalk}/>
    <rect x={540} y={600} width={14} height={380} fill={colors.cardInk} opacity={0.3}/>
    <ellipse cx={540} cy={985} rx={150} ry={26} fill={colors.chalk}/>
    <ellipse cx={556} cy={992} rx={130} ry={18} fill={colors.cardInk} opacity={0.3}/>
    <g transform={'rotate(' + t + ' 540 600)'}>
      <rect x={220} y={588} width={640} height={24} rx={12} fill={colors.chalk}/>
      <rect x={220} y={600} width={640} height={12} rx={6} fill={colors.cardInk} opacity={0.3}/>
    </g>
    <polygon points="540,572 506,630 574,630" fill={colors.accent}/>
    <Pan p={L}/><Pan p={R}/>
    <Bean id="you" x={L[0]} y={L[1] + 232} h={210} c={colors.rose} look={1}/>
    {range(36).map(i => { const r = Math.floor(i / 6), c = (i % 6) - 2.5, k = clamp(n * 44 - i);
      return Math.abs(c) <= 3.2 - r * 0.5 ? <g transform={'translate(' + (R[0] + c * 34 + (r % 2) * 10) + ' ' + (R[1] + 210 - r * 30) + ') scale(' + k + ')'}>
        <circle cx={0} cy={0} r={19} fill={i % 3 ? colors.accent : colors.blush}/>
        <circle cx={5} cy={5} r={11} fill={colors.cardInk} opacity={0.2}/>
      </g> : null; })}
    </g>
    <g opacity={on(at('three'), 0.4) * (1 - push)}><Tag x={210} y={430} w={130} to={[L[0], L[1] + 80]}>YOU</Tag></g>
    <g opacity={on(at('new'), 0.4) * (1 - push)}><Tag x={810} y={430} w={250} to={[R[0], R[1] + 150]}>NEW CELLS</Tag></g>
    ${flatBig('thirty', "Math.round(30 * n) + ' trillion'", 'new cells, about as many as you hold')}
    ${flatHead('IN 3 MONTHS', 3)}
  </svg>;
}`;

// 5. Every four months: one red blood cell, opening close up and pulling back as it tilts, others streaming past,
// a ring closing on its lifespan. The close-up stops short of the title, so "A whole new you?" reads on the night
// from the first frame until it's struck out.
const BLOOD = String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const cam = 1 + 0.6 * (1 - easeInOut(clamp(time / 1.3))), ring = easeInOut(clamp((time - at('blood')) / (duration - at('blood') - 0.3))), tilt = 0.82 + 0.12 * Math.sin(time * 0.9);
  const cut = easeInOut(clamp((time - at('you')) / 0.4));
  return <svg>
    ${flatSky('accent', 540, 750)}
    {range(9).map(i => { const x = (i * 233 + time * (40 + (i % 3) * 25)) % 1300 - 110, y = 470 + (i * 151) % 600, r = 36 + (i % 3) * 20;
      return <g opacity={0.35 + (i % 3) * 0.15}>
        <ellipse cx={x} cy={y} rx={r} ry={r * 0.8} fill={colors.accent}/>
        <ellipse cx={x + 4} cy={y + 4} rx={r * 0.45} ry={r * 0.35} fill={colors.cardInk} opacity={0.25}/>
      </g>; })}
    <circle cx={540} cy={750} r={285} fill="none" stroke={colors.ink} strokeOpacity={0.15} strokeWidth={14}/>
    <circle cx={540} cy={750} r={285} fill="none" stroke={colors.rose} strokeWidth={14} strokeLinecap="round" strokeDasharray={1791} strokeDashoffset={1791 * (1 - ring)} transform="rotate(-90 540 750)"/>
    <g transform={'translate(540 750) scale(' + cam + ' ' + cam * tilt + ')'}>
      <Orb id="cell" x={0} y={0} r={230} c={colors.accent}>
        <circle cx={18} cy={18} r={118} fill={colors.cardInk} opacity={0.22}/>
        <circle cx={6} cy={6} r={104} fill={colors.accent}/>
        <circle cx={6} cy={6} r={104} fill={colors.cardInk} opacity={0.1}/>
      </Orb>
    </g>
    <text x={540} y={420} width={880} maxLines={1} textAnchor="middle" fontSize={64} fontWeight={800} fill={colors.ink} opacity={1 - 0.5 * cut}>A whole new you?</text>
    <rect x={280} y={398} width={520 * cut} height={8} rx={4} fill={colors.accent}/>
    ${flatBig('four', "'4 months'", 'for each red blood cell, about 120 days', 1170)}
    ${flatHead('EVERY 4 MONTHS', 4)}
  </svg>;
}`;

// 6. About ten years: a fat cell as round as a moon, a ring of years lighting up around it one by one.
const FAT = String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const s = on(0, 0.6), y = Math.round(10 * easeInOut(clamp((time - at('fat')) / (at('ten') + 0.5 - at('fat')))));
  return <svg>
    ${flatSky('accent', 540, 700)}
    <circle cx={540} cy={700} r={300} fill="none" stroke={colors.ink} strokeOpacity={0.14} strokeWidth={4}/>
    <g transform={'translate(540 700) scale(' + (0.85 + 0.15 * s) * (1 + 0.02 * Math.sin(time * 1.6)) + ')'}>
      <Orb id="fat" x={0} y={0} r={230} c={colors.blush}>
        <circle cx={-60} cy={-40} r={150} fill={colors.chalk} opacity={0.18}/>
        <ellipse cx={150} cy={140} rx={58} ry={40} fill={colors.rose} transform="rotate(-40 150 140)"/>
        <ellipse cx={142} cy={132} rx={26} ry={18} fill={colors.cardInk} opacity={0.25} transform="rotate(-40 150 140)"/>
      </Orb>
    </g>
    {range(10).map(i => { const a = (i * 36 - 90 + time * 8) * 0.01745, lit = clamp(y - i);
      return <circle cx={540 + 300 * Math.cos(a)} cy={700 + 300 * Math.sin(a)} r={10 + 10 * lit} fill={lit ? colors.accent : colors.ink} opacity={lit ? 1 : 0.3}/>; })}
    ${flatBig('hang', "y + (y === 1 ? ' year' : ' years')", 'the average age of a fat cell', 1170)}
    ${flatHead('ABOUT 10 YEARS', 5)}
  </svg>;
}`;

// 7. For life: a neuron branching in the dark, signals running down its axon, beside an eye lens with a glowing core.
const LIFE = String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const g = easeInOut(clamp((time - at('neurons')) / 1.2)), l = on(at('lens'), 0.6);
  const ds = ['M 380 700 Q 300 600 180 560', 'M 380 700 Q 330 560 360 450', 'M 380 700 Q 250 700 140 760', 'M 380 700 Q 300 820 200 900', 'M 380 700 Q 470 580 560 520', 'M 280 627 Q 230 560 250 500', 'M 290 712 Q 220 640 170 660'];
  const P = k => [380 + 2 * k * (1 - k) * 260 + k * k * 320, 700 + 2 * k * (1 - k) * 60 + k * k * 260];
  const lens = (k, dx) => 'M ' + (800 + dx) + ' ' + (650 - 150 * k + dx) + ' Q ' + (800 + 140 * k + dx) + ' ' + (650 + dx) + ' ' + (800 + dx) + ' ' + (650 + 150 * k + dx) + ' Q ' + (800 - 140 * k + dx) + ' ' + (650 + dx) + ' ' + (800 + dx) + ' ' + (650 - 150 * k + dx) + ' Z';
  return <svg>
    ${flatSky('rose', 480, 720)}
    <g fill="none" stroke={colors.rose} strokeLinecap="round">
      {ds.map((d, i) => <path d={d} strokeWidth={i < 5 ? 18 : 10} strokeDasharray={300} strokeDashoffset={300 * (1 - g)}/>)}
      <path d="M 380 700 Q 640 760 700 960" strokeWidth={14} strokeDasharray={520} strokeDashoffset={520 * (1 - g)}/>
    </g>
    {range(4).map(i => { const k = (time * 0.5 + i / 4) % 1, p = P(k); return <circle cx={p[0]} cy={p[1]} r={12} fill={colors.accent} opacity={g * (1 - k)}/>; })}
    <Orb id="soma" x={380} y={700} r={86 + 3 * Math.sin(time * 2)} c={colors.rose}>
      <circle cx={392} cy={712} r={30} fill={colors.cardInk} opacity={0.3}/>
    </Orb>
    <g opacity={l} transform={'translate(0 ' + 30 * (1 - l) + ')'}>
      <clipPath id="lens"><path d={lens(1, 0)}/></clipPath>
      <g clipPath="url(#lens)">
        <path d={lens(1, 0)} fill={colors.chalk}/>
        <path d={lens(1, 0)} fill={colors.cardInk} opacity={0.25}/>
        <path d={lens(1, -14)} fill={colors.chalk}/>
        <path d={lens(0.66, 0)} fill={colors.blush}/>
        <path d={lens(0.36 + 0.03 * Math.sin(time * 2), 0)} fill={colors.accent}/>
      </g>
    </g>
    <g opacity={on(at('neurons'), 0.4)}><Tag x={200} y={430} w={200} to={[319, 639]}>NEURON</Tag></g>
    <g opacity={on(at('lens'), 0.4)}><Tag x={830} y={890} w={240} to={[800, 680]}>LENS CORE</Tag></g>
    ${flatBig('life', "'For life'", 'most cortex neurons and the lens core')}
    ${flatHead('FOR LIFE', 6)}
  </svg>;
}`;

// 8. Today, again: pulled back to the bean of you, new cells circling it and a core that has been there all along.
const AGAIN = String.raw`export default function Scene({ time, duration, colors }) {
  ${FLAT_KIT}
  const cam = 1.5 - 0.5 * easeInOut(clamp(time / 1.6)) + 0.06 * easeInOut(clamp((time - duration + 2) / 2)), core = on(at('built'), 0.6);
  return <svg>
    ${flatSky('accent', 540, 740)}
    <g transform={'translate(540 740) scale(' + cam + ')'}>
      {range(18).map(i => { const a = i * 0.349 + time * 0.35, r = 300 + 30 * Math.sin(time + i);
        return <circle cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={9 + (i % 3) * 4} fill={i % 2 ? colors.rose : colors.accent} opacity={0.85}/>; })}
      <Bean id="you" x={0} y={250} h={500} c={colors.rose} look={0.6 * Math.sin(time * 0.7)}>
        {range(48).map(i => { const p = (time * 0.6 + i * 0.618) % 1;
          return <circle cx={-125 + (i % 6) * 50 + (Math.floor(i / 6) % 2) * 25} cy={-480 + Math.floor(i / 6) * 62} r={21 * clamp(p * 6)} fill={p < 0.3 ? colors.accent : colors.chalk} opacity={p < 0.3 ? 0.9 : 0.15}/>; })}
        <circle cx={0} cy={-405} r={64 + 6 * Math.sin(time * 2)} fill={colors.accent} opacity={0.4 * core}/>
        <circle cx={0} cy={-405} r={34} fill={colors.accent} opacity={core}/>
      </Bean>
    </g>
    <g opacity={on(at('birth'), 0.5)}>
      <text x={540} y={1150} width={880} maxLines={1} textAnchor="middle" fontSize={130} fontWeight={900} letterSpacing={-3} fill={colors.accent}>Partly new.</text>
      <text x={540} y={1250} width={880} maxLines={1} textAnchor="middle" fontSize={60} fontWeight={800} fill={colors.ink}>Still you.</text>
    </g>
    ${flatHead('TODAY', 7)}
  </svg>;
}`;

export const FLAT_REFERENCE = {
  id: 'flat-2',
  title: 'How much of you is new today?',
  caption: 'Your body swaps about 330 billion cells a day. Here is what gets replaced, how fast, and what stays with you for life.',
  beats: [
    { label: '330 billion new cells a day', line: "Today, you'll replace about three hundred thirty billion cells. How much of you is new?", place: 'a bean of you, made of cells, floating in the night', source: TODAY },
    { label: '3.8 million every second', line: "That's about three point eight million every second, around eighty grams a day.", place: 'a stopwatch dial throwing off a stream of cells', source: SECOND },
    { label: 'Your gut lining, every few days', line: "Your gut lining's cells wear off and are replaced every few days.", place: 'a cross-section of the gut wall, villi like hills', source: GUT },
    { label: '30 trillion in three months', line: 'Add it up: in three months, thirty trillion new cells, about as many as you hold.', place: 'a floating balance: you against a heap of new cells', source: THREE },
    { label: 'Mostly blood, 4 months a cell', line: "Not a whole new you: it's mostly blood, and red cells last about four months.", place: 'a single red blood cell drifting past, huge', source: BLOOD },
    { label: 'Fat cells: about ten years', line: 'Your fat cells hang on far longer: about ten years, on average.', place: 'a fat cell, round as a moon, years ticking past', source: FAT },
    { label: 'Neurons and lens: for life', line: "Most cortex neurons, and the cells deep in your eye's lens, stay for life.", place: 'a neuron branching in the dark beside an eye lens', source: LIFE },
    { label: 'New, around a core that stays', line: "So today you're partly new, built around a core that's been you since before birth.", place: 'you as one bean again, a glowing core inside', source: AGAIN },
  ],
};
