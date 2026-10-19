// The moving map's reference video (../index.mjs `reference`): "Why does Lesotho exist?", a "why does X exist?" map
// documentary in eight scenes, at the detail every video in the style should have: a clean modern map on a pale sea
// (a faint graticule, land in chalk with a thin coastline), the camera always somewhere over it and moving between
// views for its transitions, the subject's territory in the accent spreading from a point and its rival in rose,
// disputed land hatched, fat arrows that draw themselves, uppercase serif labels, this style's own round-head figures
// with a sash in their side's colour and a blunt speech bubble, the date cartouche at the top left that ticks from one
// scene's year to the next, and the scale bar and north arrow at the bottom right. Its skeleton is the format's: the
// odd shape (a hole in South Africa), a pull back to where it is, the starting date (1824), the key event (the wars
// for the farmland), the deal (Britain steps in, and an 1869 treaty fixes the border), the consequences (1910, then
// independence in 1966) and a kicker (the highest low point of any country).
//
// Its facts, in plain words:
// - Lesotho is completely surrounded by South Africa, one of three countries surrounded by a single other (with
//   Vatican City and San Marino); it covers 30,355 km², about Belgium's 30,689 km² (Wikipedia, "Lesotho" and
//   "Belgium").
// - Moshoeshoe I took his followers onto Thaba Bosiu, a flat-topped plateau ringed by cliffs about 24 km east of
//   today's Maseru, in July 1824 (Wikipedia, "Thaba Bosiu").
// - From 1858 the Orange Free State, a Boer republic, fought the Basotho in a series of wars over the farmland west of
//   the Caledon River (Wikipedia, "Lesotho" and "Free State–Basotho Wars").
// - Moshoeshoe appealed to Britain, which made Basutoland a protectorate in 1868; the 1869 Convention of Aliwal North
//   defined its border with the Free State along the Caledon, and the land west of it (the "Conquered Territory")
//   stayed with the Free State (Wikipedia, "Lesotho" and "Lesotho–South Africa border").
// - In 1910 Britain joined the Cape, Natal, the Transvaal and the Orange River Colony into the Union of South Africa;
//   Basutoland, Bechuanaland and Swaziland stayed outside it as High Commission Territories (UK National Archives,
//   catalogue C495), and South Africa's later requests for them were never granted (Journal of Modern African
//   Studies, doi:10.1017/S0022278X00004006).
// - Basutoland became independent as the Kingdom of Lesotho on 4 October 1966 (Wikipedia, "Lesotho").
// - Its lowest point, where the Makhaleng meets the Senqu (Orange) on the border (about 30.3° S, 27.4° E), is 1,400 m
//   above sea level, the highest lowest point of any country; its highest, Thabana Ntlenyana, is 3,482 m (Wikipedia,
//   "Lesotho", "Geography of Lesotho" and "Makhaleng River").
// The farmland is drawn as the land west of the river within about 65 km of it, an illustration of where the fighting
// was, not a surveyed boundary. A new moving map video remakes the video. Each scene names its place
// (a new map view per scene), which a new video never copies (../guide.mjs lookGuide). Bump the id when the
// video changes (a place is text only: it changes no frame).
//
// Every scene's code stands alone, so each spells out its camera and the kit (written into it below). The camera
// (cameraMove) moves from the last scene's view to this one's, each a centre and a width in degrees of longitude,
// with easeInOut over 1.1 s (the opening pushes in over its whole line): `cam` its progress, `cx`, `cy` and `cw` the
// view now, and `view` that view as [west, south, east, north] for the map kit. KIT: on(t, d), an ease-out
// from the moment t; L(codes), land() on the scene's view across the whole frame (centred on the stage); P(lon, lat),
// geo() on the same map; deg, pixels per degree of longitude; tick(a, b), a year ticking with the camera; Sea, the
// pale sea and its faint graticule; Land, every country in the view (land()'s '*', so no neighbour in frame is left
// out as sea) in chalk with a thin coastline; Grow, a clip circle growing from a point (a territory spreading from its
// capital); Name, an italic serif place name (in cardInk, for land; a sea's is set in ink and drawn before the land;
// words are never set in the accent or rose, which a brand's colours can make unreadable on chalk land, so the
// subject's name gets an accent underline instead); Stamp, the date cartouche at the top left; Scale, the scale bar
// and north arrow at the bottom right over the map's foot, a sea-toned margin (MARGIN) the captions are drawn
// on, so they read whatever land runs under them and whatever the brand's colours. CITY: City, a dot
// with an uppercase serif label. FIGURES: Fig, this style's own figure (a round head, dot eyes, a robe and a
// sash in its side's colour) standing at `at`, and Say, a blunt one-line speech bubble with its tail to `to`; figures
// fade in once the camera has settled. ROUTE: Route, a fat curved arrow that draws itself (p, 0–1).
// HATCH: Hatch, thin diagonal lines across a box, clipped to its children (disputed land). CALEDON: this
// video's own river and the land beside it (see below).

/** A view: its centre (longitude, latitude) and its width in degrees of longitude, across the frame's 1080 px. */

const r2 = (n) => Math.round(n * 100) / 100;

/** The camera from the last scene's view to this one's, over `over` seconds (an expression: '1.1', 'duration'). */
export const cameraMove = ([x0, y0, w0], [x1, y1, w1], over = '1.1') => String.raw`const cam = easeInOut(clamp(time / ${over})), cx = ${x0} + ${r2(x1 - x0)} * cam, cy = ${y0} + ${r2(y1 - y0)} * cam, cw = ${w0} * Math.pow(${w1} / ${w0}, cam);
  const view = [cx - cw / 2, cy - 0.01, cx + cw / 2, cy + 0.01];`;

/**
 * The map's foot, from just above the captions to the bottom of the frame: a sea-toned margin with a thin rule along its
 * top (its other edges are off the frame), so the captions (drawn in the brand's ink) always sit on its background
 * colour, the pair a brand kit is checked for, never on chalk land in a dark brand's near-white. A hint of the land
 * shows through.
 */
export const MARGIN = String.raw`<rect x={-9} y={1290} width={1098} height={640} fill={colors.wall} opacity={0.9} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={3}/>`;

/** The kit every moving map scene starts from, after its camera (see above), indented for a scene's body. */
export const KIT = String.raw`const on = (t, d = 0.5) => easeOut(clamp((time - t) / d));
  const L = c => land(view, 0, -390, 1080, 2310, c), P = (x, y) => geo(x, y, view, 0, -390, 1080, 2310);
  const deg = 1080 / cw, tick = (a, b) => Math.round(a + (b - a) * cam), g = deg < 135 ? 5 : 1, gx = P(Math.round(cx / g) * g, cy)[0];
  const Sea = () => <g><rect x={0} y={0} width={1080} height={1920} fill={colors.wall}/>
    <path d={range(17).map(i => { const x = gx + (i - 8) * g * deg, y = P(cx, Math.round(cy / g) * g + (i - 8) * g)[1]; return 'M ' + x + ' 0 L ' + x + ' 1920 M 0 ' + y + ' L 1080 ' + y; }).join(' ')} stroke={colors.ink} strokeWidth={2} opacity={0.1}/></g>;
  const Land = ({ o = 0.3 }) => <path d={L('*')} fill={colors.chalk} stroke={colors.cardInk} strokeOpacity={o} strokeWidth={2}/>;
  const Grow = ({ id, at, r }) => <clipPath id={id}><circle cx={at[0]} cy={at[1]} r={Math.max(1, r)}/></clipPath>;
  const Name = ({ at, s = 44, c = colors.cardInk, p = 1, children }) => <text x={at[0]} y={at[1]} textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize={s} fontWeight={700} letterSpacing={4} fill={c} opacity={p}>{children}</text>;
  const Stamp = ({ v }) => { const w = 48 + ('' + v).length * 42;
    return <g><rect x={60} y={262} width={w} height={96} fill={colors.chalk} stroke={colors.cardInk} strokeWidth={3}/><rect x={68} y={270} width={w - 16} height={80} fill="none" stroke={colors.cardInk} strokeOpacity={0.35} strokeWidth={2}/>
      <text x={60 + w / 2} y={333} textAnchor="middle" fontFamily="serif" fontSize={64} fontWeight={700} fill={colors.cardInk}>{v}</text></g>; };
  const Scale = () => { const k = deg / (111.32 * Math.cos(cy * Math.PI / 180)), km = [10, 25, 50, 100, 250, 500, 1000].filter(n => n * k <= 230).slice(-1)[0] || 10, w = km * k, x = 842 - w;
    return <g fontFamily="serif" fontWeight={700} fill={colors.cardInk} textAnchor="middle">${MARGIN}
      <rect x={x} y={1172} width={w + 118} height={104} fill={colors.chalk} stroke={colors.cardInk} strokeWidth={3}/>
      <text x={x + 24 + w / 2} y={1226} fontSize={34}>{km + ' KM'}</text><text x={912} y={1214} fontSize={34}>N</text>
      <rect x={x + 24} y={1242} width={w} height={14} fill={colors.chalk} stroke={colors.cardInk} strokeWidth={2}/><rect x={x + 24} y={1242} width={w / 2} height={14} fill={colors.cardInk}/>
      <polygon points="912,1220 926,1264 912,1254 898,1264" fill={colors.cardInk}/></g>; };`;

/** A city: a dot with an uppercase serif label to its right (or `left`). */
export const CITY = String.raw`const City = ({ at, name, p = 1, left }) => <g opacity={p}><circle cx={at[0]} cy={at[1]} r={11} fill={colors.cardInk} stroke={colors.chalk} strokeWidth={4}/>
    <text x={at[0] + (left ? -24 : 24)} y={at[1] + 13} textAnchor={left ? 'end' : 'start'} fontFamily="serif" fontSize={36} fontWeight={700} letterSpacing={2} fill={colors.cardInk}>{name}</text></g>;`;

/** This style's own figures and their speech bubbles (see above). */
export const FIGURES = String.raw`const R = 'M -40 0 L -30 -112 Q 0 -126 30 -112 L 40 0 Z';
  const Fig = ({ id, at, s = 1, c, up }) => <g transform={'translate(' + at[0] + ' ' + at[1] + ') scale(' + s + ')'} stroke={colors.cardInk} strokeWidth={4} strokeLinecap="round">
    <clipPath id={id}><path d={R}/></clipPath>
    <path d={up ? 'M 24 -100 L 56 -172' : 'M 26 -100 L 42 -38'} strokeWidth={14}/>
    <path d={R} fill={colors.chalk}/><path d="M -36 -122 L 44 -4" stroke={c} strokeWidth={24} clipPath={'url(#' + id + ')'}/><path d={R} fill="none"/>
    <circle cx={0} cy={-150} r={34} fill={colors.chalk}/><path d="M -11 -152 L -11 -151 M 11 -152 L 11 -151" strokeWidth={9}/>
  </g>;
  const Say = ({ x, y, w, p, to, children }) => { const b = Math.max(x + 30, Math.min(x + w - 30, to[0]));
    return <g opacity={p} fill={colors.chalk} stroke={colors.cardInk} strokeWidth={3}>
      <path d={'M ' + (b - 16) + ' ' + (y + 70) + ' L ' + to.join(' ') + ' L ' + (b + 16) + ' ' + (y + 70)}/>
      <rect x={x} y={y} width={w} height={76} rx={16}/><rect x={b - 14} y={y + 64} width={28} height={14} stroke="none"/>
      <text x={x + w / 2} y={y + 51} textAnchor="middle" fontSize={40} fontWeight={800} width={w - 32} maxLines={1} fill={colors.cardInk} stroke="none">{children}</text>
    </g>; };`;

/** A fat curved arrow from a through q to b that draws itself (p, 0–1) and lands with an arrowhead. */
export const ROUTE = String.raw`const Route = ({ a, q, b, p, c }) => { const n = Math.sqrt((b[0] - q[0]) ** 2 + (b[1] - q[1]) ** 2), u = (b[0] - q[0]) / n, v = (b[1] - q[1]) / n, e = [b[0] - 34 * u, b[1] - 34 * v];
    const len = n + Math.sqrt((q[0] - a[0]) ** 2 + (q[1] - a[1]) ** 2);
    return <g fill={c} stroke={c} opacity={p > 0 ? 1 : 0}>
      <path d={'M ' + a.join(' ') + ' Q ' + q.join(' ') + ' ' + e.join(' ')} fill="none" strokeWidth={18} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)}/>
      <polygon points={b.join(',') + ' ' + (e[0] + 26 * v) + ',' + (e[1] - 26 * u) + ' ' + (e[0] - 26 * v) + ',' + (e[1] + 26 * u)} stroke="none" opacity={clamp((p - 0.8) / 0.2)}/>
    </g>; };`;

/** Disputed land: thin diagonal lines across the box x, y, w, h, clipped to the shapes it's given. */
export const HATCH = String.raw`const Hatch = ({ id, x, y, w, h, c, p = 1, children }) => <g opacity={p}><clipPath id={id}>{children}</clipPath>
    <g clipPath={'url(#' + id + ')'}>{range(Math.min(64, Math.ceil((w + h) / 24))).map(i => <line x1={x + i * 24 - h} y1={y + h} x2={x + i * 24} y2={y} stroke={c} strokeWidth={4}/>)}</g></g>;`;

/**
 * This video's river and the land beside it, all from the map kit: clip "nw", the land northwest of a line from
 * Lesotho's northern tip to its Wepener corner, down to the Orange and along it (the Free State's side of the Caledon); clip "fm",
 * the farmland, within about 65 km of the river; and the Caledon itself, the stretch of Lesotho's outline inside "nw",
 * where the border runs along the river, in a water tone (drawn from land(), never traced).
 */
export const CALEDON = String.raw`<clipPath id="nw"><polygon points={[P(28.7, -28.55), P(29.5, -27), P(20, -27), P(20, -30.6), P(25.98, -30.5), P(26.71, -30.69), P(27.38, -30.33), P(27.02, -29.7)].map(q => q.join(',')).join(' ')}/></clipPath>
    <Grow id="fm" at={P(27.3, -29.05)} r={0.62 * deg}/>
    <path d={L('LS')} fill="none" stroke={colors.floor} strokeWidth={10} clipPath="url(#nw)"/>`;

// Every view of the video, in order: [longitude, latitude, width in degrees].
const ZA = [25.2, -27.6, 21];
const HOLE = [26.6, -28.3, 15];
const REGION = [25.6, -27.8, 26];
const BOSIU = [27.9, -29.3, 3.8];
const RIVER = [26.65, -29.2, 4.4];
const BORDER = [28.1, -29.6, 4.6];
const UNION = [25, -28.6, 19.5];
const TODAY = [28.1, -29.45, 5];
const LOW = [28.85, -29.85, 4.2];

// 1. The odd shape: South Africa with a hole in it (Lesotho in the sea's colour), the title plate up from the first
// frame (the cover reads), a slow push in over the line, the hole ringed on "hole" and filled in the accent from Maseru
// on "country".
const HOOK = String.raw`export default function Scene({ time, duration, colors }) {
  ${cameraMove(ZA, HOLE, 'duration')}
  ${KIT}
  const ls = P(28.25, -29.55), r = 1.35 * deg, ring = on(at('hole'), 0.6), fill = on(at('country'), 0.8);
  return <svg>
    <Sea/>
    <Land/>
    <path d={L('LS')} fill={colors.wall} stroke={colors.cardInk} strokeOpacity={0.3} strokeWidth={2}/>
    <path d={L('LS')} fill={colors.chalk} opacity={fill}/>
    <Grow id="ls" at={P(27.48, -29.31)} r={2 * r * fill}/>
    <path d={L('LS')} fill={colors.accent} fillOpacity={0.7} clipPath="url(#ls)"/>
    <circle cx={ls[0]} cy={ls[1]} r={r} fill="none" stroke={colors.accent} strokeWidth={6} strokeDasharray={6.3 * r} strokeDashoffset={6.3 * r * (1 - ring)} opacity={ring > 0 ? 1 : 0}/>
    <line x1={ls[0] - 0.7 * r} y1={ls[1] - 0.7 * r} x2={ls[0] - r - 20} y2={ls[1] - r - 20} stroke={colors.accent} strokeWidth={4} opacity={fill}/>
    <Name at={[ls[0] - r - 100, ls[1] - r - 30]} s={46} p={fill}>LESOTHO</Name>
    <rect x={ls[0] - r - 215} y={ls[1] - r - 18} width={230} height={6} fill={colors.accent} opacity={fill}/>
    <rect x={60} y={392} width={900} height={124} fill={colors.chalk} stroke={colors.cardInk} strokeWidth={3}/>
    <text x={540} y={476} textAnchor="middle" fontFamily="serif" fontSize={70} fontWeight={700} width={840} maxLines={1} fill={colors.cardInk}>Why does Lesotho exist?</text>
    <Stamp v="TODAY"/>
    <Scale/>
  </svg>;
}`;

// 2. Where it is: the camera pulls back to southern Africa, South Africa tints rose on "South", arrowheads close in on
// Lesotho from every side, and its size lands over its name; the ocean names fade in once the camera settles.
const REGION_SCENE = String.raw`export default function Scene({ time, duration, colors }) {
  ${cameraMove(HOLE, REGION)}
  ${KIT}
  const ls = P(28.25, -29.55), sa = on(at('South')), every = on(at('every'), 0.6), seas = on(1.2);
  return <svg>
    <Sea/>
    <Name at={P(17.8, -35.6)} s={38} c={colors.ink} p={seas}>ATLANTIC</Name>
    <Name at={P(17.8, -36.6)} s={38} c={colors.ink} p={seas}>OCEAN</Name>
    <Name at={P(31.6, -34.2)} s={38} c={colors.ink} p={seas}>INDIAN OCEAN</Name>
    <Land/>
    <path d={L('ZA')} fill={colors.rose} fillOpacity={0.3 * sa}/>
    <path d={L('LS')} fill={colors.accent} fillOpacity={0.7}/>
    {range(6).map(i => { const a = i * Math.PI / 3 + 0.5, c = Math.cos(a), s = Math.sin(a), d = 110 - 46 * every, x = ls[0] + c * d, y = ls[1] + s * d;
      return <polygon points={(x - 16 * c) + ',' + (y - 16 * s) + ' ' + (x + 12 * c - 14 * s) + ',' + (y + 12 * s + 14 * c) + ' ' + (x + 12 * c + 14 * s) + ',' + (y + 12 * s - 14 * c)} fill={colors.rose} opacity={every}/>; })}
    <Name at={P(21.8, -30.9)} s={40} p={sa}>SOUTH AFRICA</Name>
    <g opacity={on(1.1)}>
      <line x1={ls[0] - 6} y1={ls[1] - 34} x2={ls[0] - 20} y2={ls[1] - 150} stroke={colors.accent} strokeWidth={4}/>
      <Name at={[ls[0] - 20, ls[1] - 166]} s={46}>LESOTHO</Name>
      <rect x={ls[0] - 135} y={ls[1] - 154} width={230} height={6} fill={colors.accent}/>
      <text x={ls[0] - 20} y={ls[1] - 224} textAnchor="middle" fontFamily="serif" fontSize={36} fontWeight={700} fill={colors.cardInk} opacity={on(at('Belgium'))}>SIZE OF BELGIUM</text>
    </g>
    <Stamp v="TODAY"/>
    <Scale/>
  </svg>;
}`;

// 3. The starting date: the camera dives to the Caledon valley as the cartouche rewinds to 1824, the flat-topped
// mountain rises at Thaba Bosiu with a Basotho figure on top, and the kingdom spreads in the accent from it over the
// valley around it, on both sides of the river (not yet today's country: the highlands come later); today's border is
// only a faint dashed ghost.
const BOSIU_SCENE = String.raw`export default function Scene({ time, duration, colors }) {
  ${cameraMove(REGION, BOSIU)}
  ${KIT}
  ${FIGURES}
  const t = P(27.67, -29.35), m = on(at('Moshoeshoe'), 0.6), grow = on(at('people'), 1.4), says = on(at('mountain'), 0.3);
  return <svg>
    <Sea/>
    <Land o={0}/>
    <Grow id="ba" at={t} r={0.7 * deg * grow}/>
    <g clipPath="url(#ba)" fill={colors.accent} fillOpacity={0.55}>
      <path d={L('LS')}/>
      <g clipPath="url(#nw)"><path d={L('ZA')} clipPath="url(#fm)"/></g>
    </g>
    <path d={L('LS')} fill="none" stroke={colors.cardInk} strokeOpacity={0.3} strokeWidth={3} strokeDasharray="10 12"/>
    ${CALEDON}
    <Name at={P(27.8, -29.75)} s={46} p={grow}>BASOTHO</Name>
    <g opacity={m}>
      <path d={'M ' + (t[0] - 96) + ' ' + t[1] + ' L ' + (t[0] - 56) + ' ' + (t[1] - 58) + ' L ' + (t[0] + 56) + ' ' + (t[1] - 58) + ' L ' + (t[0] + 96) + ' ' + t[1] + ' Z'} fill={colors.floor} stroke={colors.cardInk} strokeWidth={4} strokeLinejoin="round"/>
      <Fig id="mo" at={[t[0], t[1] - 58]} s={0.8} c={colors.accent} up={says > 0}/>
      <text x={t[0] + 110} y={t[1] - 6} fontFamily="serif" fontSize={36} fontWeight={700} letterSpacing={2} fill={colors.cardInk}>THABA BOSIU</text>
    </g>
    <Say x={t[0] - 170} y={t[1] - 360} w={340} p={says} to={[t[0], t[1] - 210]}>Let them try.</Say>
    <Stamp v={tick(2026, 1824)}/>
    <Scale/>
  </svg>;
}`;

// 4. The key event: as the years tick on, the kingdom has grown over today's country, the Free State spreads in rose
// from Bloemfontein up to the river, its arrows push east into the farmland, and the farmland goes contested: both
// colours, hatched.
const RIVER_SCENE = String.raw`export default function Scene({ time, duration, colors }) {
  ${cameraMove(BOSIU, RIVER)}
  ${KIT}
  ${CITY}
  ${ROUTE}
  ${HATCH}
  const b = P(26.21, -29.12), f = P(27.3, -29.05), fs = on(at('Free'), 1.4), farm = on(at('farmland'));
  return <svg>
    <Sea/>
    <Land o={0}/>
    <Grow id="ba" at={P(27.67, -29.35)} r={(0.7 + 1.55 * cam) * deg}/>
    <g clipPath="url(#ba)" fill={colors.accent} fillOpacity={0.55}><path d={L('LS')}/><g clipPath="url(#nw)"><path d={L('ZA')} clipPath="url(#fm)"/></g></g>
    <Grow id="fs" at={b} r={4 * deg * fs}/>
    <g clipPath="url(#fs)"><path d={L('ZA')} fill={colors.rose} fillOpacity={0.5} clipPath="url(#nw)"/></g>
    <g clipPath="url(#nw)"><g clipPath="url(#fm)"><Hatch id="hz" x={f[0] - 160} y={f[1] - 160} w={320} h={320} c={colors.cardInk} p={0.6 * farm}><path d={L('ZA')}/></Hatch></g></g>
    <path d={L('LS')} fill="none" stroke={colors.cardInk} strokeOpacity={0.3} strokeWidth={3} strokeDasharray="10 12"/>
    ${CALEDON}
    <City at={b} name="BLOEMFONTEIN" left={true} p={fs}/>
    {[[-28.62, 27.8], [-29.38, 27.28], [-29.72, 26.98]].map((q, i) => <Route a={P(26.5, q[0] + 0.08)} q={P(26.95, q[0] - 0.12)} b={P(q[1], q[0])} p={on(at('fought') + i * 0.25, 0.8)} c={colors.rose}/>)}
    <Name at={P(27.3, -29.1)} s={38} p={farm}>FARMLAND</Name>
    <Name at={P(27.85, -28.45)} s={36} p={on(at('Caledon'))}>CALEDON R.</Name>
    <Name at={P(26.3, -29.95)} s={36} p={fs}>ORANGE FREE STATE</Name>
    <Name at={P(27.85, -30.05)} s={40}>BASOTHO</Name>
    <Stamp v={tick(1824, 1858)}/>
    <Scale/>
  </svg>;
}`;

// 5. The deal: once the camera settles a Basotho figure asks for help, a British figure steps in on the second
// "Britain" and takes over, BASUTOLAND is lettered in, and on "1869" the treaty's border, the Free State stretch along
// the Caledon (all the treaty fixed), draws itself down the river in ink while the cartouche ticks over; the rest of
// today's border is a faint dashed ghost, and the farmland is the Free State's.
const BORDER_SCENE = String.raw`export default function Scene({ time, duration, colors }) {
  ${cameraMove(RIVER, BORDER)}
  ${KIT}
  ${FIGURES}
  const line = on(at('1869'), 1.6), mo = P(28.05, -30.45), uk = P(29.55, -28.85), brit = on(at('Britain', 2), 0.3);
  return <svg>
    <Sea/>
    <Land o={0}/>
    <path d={L('ZA')} fill={colors.rose} fillOpacity={0.5} clipPath="url(#nw)"/>
    <path d={L('LS')} fill={colors.accent} fillOpacity={0.7}/>
    <path d={L('LS')} fill="none" stroke={colors.cardInk} strokeOpacity={0.3} strokeWidth={3} strokeDasharray="10 12"/>
    ${CALEDON}
    <Grow id="tr" at={P(28.7, -28.55)} r={2.6 * deg * line}/>
    <g clipPath="url(#nw)"><path d={L('LS')} fill="none" stroke={colors.cardInk} strokeWidth={6} strokeLinejoin="round" clipPath="url(#tr)" opacity={line > 0 ? 1 : 0}/></g>
    <Name at={P(28.55, -29.25)} s={46} p={brit}>BASUTOLAND</Name>
    <Name at={P(27, -28.75)} s={36} p={line}>TO THE</Name>
    <Name at={P(27, -28.92)} s={36} p={line}>FREE STATE</Name>
    <g opacity={on(1.1, 0.3)}><Fig id="mo" at={mo} s={0.85} c={colors.accent}/></g>
    <Say x={mo[0] - 120} y={mo[1] - 290} w={240} p={on(at('help'), 0.3)} to={[mo[0], mo[1] - 160]}>Help?</Say>
    <g opacity={brit}><Fig id="uk" at={uk} s={0.85} c={colors.cardInk} up={time > at('took')}/></g>
    <Say x={530} y={uk[1] - 290} w={420} p={on(at('took'), 0.3)} to={[uk[0], uk[1] - 160]}>Ours now. Stop it.</Say>
    <Stamp v={time < at('1869') ? tick(1858, 1868) : 1869}/>
    <Scale/>
  </svg>;
}`;

// 6. The consequence: the camera pulls back to the whole country while four colonies grow from their capitals into
// one union in rose, and Basutoland alone stays in the accent, its figure (in once the camera settles, standing on the
// Drakensberg side of it) refusing.
const UNION_SCENE = String.raw`export default function Scene({ time, duration, colors }) {
  ${cameraMove(BORDER, UNION)}
  ${KIT}
  ${FIGURES}
  const grow = on(at('joined'), 1.6) * 9 * deg, caps = [P(18.42, -33.92), P(30.38, -29.6), P(28.19, -25.75), P(26.21, -29.12)], mo = P(30.1, -28.8);
  return <svg>
    <Sea/>
    <Land/>
    <clipPath id="un">{caps.map(q => <circle cx={q[0]} cy={q[1]} r={Math.max(1, grow)}/>)}</clipPath>
    <path d={L('ZA')} fill={colors.rose} fillOpacity={0.5} clipPath="url(#un)"/>
    <path d={L('LS')} fill={colors.accent} fillOpacity={0.7} stroke={colors.cardInk} strokeWidth={3}/>
    {caps.map((q, i) => <circle cx={q[0]} cy={q[1]} r={12} fill={colors.cardInk} stroke={colors.chalk} strokeWidth={4} opacity={on(at('colonies') + i * 0.15, 0.3)}/>)}
    <Name at={P(22.8, -31)} s={36} p={on(at('Union'))}>UNION OF SOUTH AFRICA</Name>
    <g opacity={on(1.1, 0.3)}><Fig id="mo" at={mo} s={0.85} c={colors.accent} up={time > at('out')}/></g>
    <Say x={mo[0] - 120} y={mo[1] - 290} w={240} p={on(at('out'), 0.3)} to={[mo[0], mo[1] - 160]}>Not us.</Say>
    <Stamp v={tick(1869, 1910)}/>
    <Scale/>
  </svg>;
}`;

// 7. Independence: the camera pushes back in, and once it settles South Africa's figure asks and Britain's says no
// while the years tick on through the line; on "1966" BASUTOLAND becomes LESOTHO, with Maseru as its capital.
const TODAY_SCENE = String.raw`export default function Scene({ time, duration, colors }) {
  ${cameraMove(UNION, TODAY)}
  ${KIT}
  ${CITY}
  ${FIGURES}
  const ls = P(28.5, -29.55), free = on(at('1966'), 0.6), sa = P(26.6, -30.9), uk = P(29.6, -30.75), seen = on(1.1, 0.3);
  return <svg>
    <Sea/>
    <Land/>
    <path d={L('ZA')} fill={colors.rose} fillOpacity={0.3}/>
    <path d={L('LS')} fill={colors.accent} fillOpacity={0.6 + 0.25 * free} stroke={colors.cardInk} strokeWidth={5} strokeLinejoin="round"/>
    <Name at={ls} s={46} p={1 - free}>BASUTOLAND</Name>
    <Name at={ls} s={58} p={free}>LESOTHO</Name>
    <City at={P(27.48, -29.31)} name="MASERU" left={true} p={free}/>
    <g opacity={seen}><Fig id="sa" at={sa} s={0.85} c={colors.rose}/></g>
    <Say x={70} y={sa[1] - 290} w={400} p={on(at('asking'), 0.3)} to={[sa[0], sa[1] - 160]}>Can we have it?</Say>
    <g opacity={seen}><Fig id="uk" at={uk} s={0.85} c={colors.cardInk}/></g>
    <Say x={uk[0] - 110} y={uk[1] - 290} w={170} p={on(at('never'), 0.3)} to={[uk[0], uk[1] - 160]}>No.</Say>
    <Stamp v={time < at('1966') ? Math.round(1910 + 55 * clamp(time / at('1966'))) : 1966}/>
    <Scale/>
  </svg>;
}`;

// 8. The kicker: back to today, the hole is ringed again, a pin drops on the lowest point, and an altitude key fills
// to the country's highest peak, every bit of it above the 1,400-metre line (the one figure the line says).
const LOW_SCENE = String.raw`export default function Scene({ time, duration, colors }) {
  ${cameraMove(TODAY, LOW)}
  ${KIT}
  const ls = P(28.2, -29.6), pt = P(27.38, -30.33), pin = on(at('lowest'), 0.4), key = on(at('metres'), 0.8), top = on(at('higher'), 0.6), y = m => 1100 - m * 0.16;
  return <svg>
    <Sea/>
    <Land/>
    <path d={L('ZA')} fill={colors.rose} fillOpacity={0.3}/>
    <path d={L('LS')} fill={colors.accent} fillOpacity={0.7} stroke={colors.cardInk} strokeWidth={4} strokeLinejoin="round"/>
    <circle cx={ls[0]} cy={ls[1]} r={1.3 * deg} fill="none" stroke={colors.accent} strokeWidth={6} strokeDasharray={8.2 * deg} strokeDashoffset={8.2 * deg * (1 - on(at('hole'), 0.6))}/>
    <g opacity={pin} transform={'translate(0 ' + -60 * (1 - pin) + ')'}>
      <path d={'M ' + pt[0] + ' ' + pt[1] + ' L ' + (pt[0] - 26) + ' ' + (pt[1] - 52) + ' C ' + (pt[0] - 42) + ' ' + (pt[1] - 84) + ' ' + (pt[0] - 22) + ' ' + (pt[1] - 104) + ' ' + pt[0] + ' ' + (pt[1] - 104) + ' C ' + (pt[0] + 22) + ' ' + (pt[1] - 104) + ' ' + (pt[0] + 42) + ' ' + (pt[1] - 84) + ' ' + (pt[0] + 26) + ' ' + (pt[1] - 52) + ' Z'} fill={colors.accent} stroke={colors.cardInk} strokeWidth={4} strokeLinejoin="round"/>
      <circle cx={pt[0]} cy={pt[1] - 68} r={12} fill={colors.chalk}/>
      <text x={pt[0] + 46} y={pt[1] - 50} fontFamily="serif" fontSize={36} fontWeight={700} letterSpacing={2} fill={colors.cardInk}>LOWEST POINT</text>
    </g>
    <g opacity={key} fontFamily="serif" fontWeight={700}>
      <rect x={700} y={420} width={260} height={720} fill={colors.chalk} stroke={colors.cardInk} strokeWidth={3}/>
      <text x={830} y={478} textAnchor="middle" fontSize={34} letterSpacing={2} fill={colors.cardInk}>ALTITUDE</text>
      <rect x={724} y={y(3482 * key)} width={40} height={1100 - y(3482 * key)} fill={colors.floor}/>
      <rect x={724} y={y(3482)} width={40} height={y(1400) - y(3482)} fill={colors.accent} opacity={0.7 * top}/>
      <line x1={716} y1={y(1400)} x2={944} y2={y(1400)} stroke={colors.accent} strokeWidth={5}/>
      <text x={776} y={y(1400) - 16} fontSize={40} fill={colors.cardInk}>1,400 M</text>
      <line x1={716} y1={1100} x2={944} y2={1100} stroke={colors.cardInk} strokeWidth={4}/>
      <text x={776} y={1086} fontSize={34} fill={colors.cardInk}>0 M</text>
    </g>
    <Stamp v="TODAY"/>
    <Scale/>
  </svg>;
}`;

export const MAP_REFERENCE = {
  id: 'map-1',
  title: 'Why does Lesotho exist?',
  caption: 'Lesotho is a whole country inside South Africa. A mountain fortress, a border war and a British treaty put it there.',
  beats: [
    { label: 'A hole in South Africa', line: "There's a hole in the map of South Africa, and a whole country lives in it.", place: 'South Africa from above, a hole in its middle', source: HOOK },
    { label: 'Surrounded on every side', line: "That's Lesotho, a mountain kingdom about the size of Belgium, with South Africa on every side.", place: 'southern Africa pulled back, ocean to ocean', source: REGION_SCENE },
    { label: '1824: a mountain fortress', line: 'In 1824, a chief named Moshoeshoe led his people onto a flat-topped mountain, Thaba Bosiu.', place: 'Thaba Bosiu, a flat-topped mountain, close up', source: BOSIU_SCENE },
    { label: '1858: wars for the farmland', line: 'From 1858, Boers of the Orange Free State fought them for the farmland west of the Caledon River.', place: 'the Caledon River, Free State arrows crossing it', source: RIVER_SCENE },
    { label: '1868: Britain steps in', line: 'Losing, Moshoeshoe asked Britain for help. Britain took over in 1868, and an 1869 treaty fixed the border.', place: 'the 1869 Free State border inked down the Caledon', source: BORDER_SCENE },
    { label: '1910: one union, minus one', line: 'In 1910, Britain joined its colonies into the Union of South Africa, but left Basutoland out.', place: 'all of South Africa, four colonies merging', source: UNION_SCENE },
    { label: '1966: independent Lesotho', line: 'South Africa kept asking for it, but Britain never handed it over. In 1966, it became independent Lesotho.', place: 'Lesotho today, Maseru on its western border', source: TODAY_SCENE },
    { label: 'Lowest point: 1,400 m', line: "And that hole in the map? Its lowest ground sits 1,400 metres up, higher than any other country's.", place: "Lesotho's lowest point, a pin and an altitude key", source: LOW_SCENE },
  ],
};
