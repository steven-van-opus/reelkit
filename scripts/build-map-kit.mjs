// Builds the map kit: every country's outline, ready for a code scene's land() and geo() helpers
// (src/code/map/kit.mjs). Run after changing this script:   npm run map-kit
//
// Writes two generated modules (committed, never hand-edited):
//   src/code/map/countries.mjs  each code's name and box (about 13 KB): all the scene checks need, since they only
//                               measure where a country is drawn
//   src/code/map/shapes.mjs     each code's outline (about 150 KB): only the renderer loads it
//
// Source: Natural Earth admin-0 countries (public domain), as the TopoJSON the world-atlas package publishes (ISC),
// pinned to world-atlas@2.0.2 and checked by sha256. The files are downloaded into .cache/map-kit/ (git-ignored) when
// missing. The outlines all come from the 1:50m set: the kit fits a country to the whole stage, where the 1:110m
// outlines are too coarse (Belgium has 14 points, the Netherlands 13, Luxembourg 6, France 71) and 65 smaller
// countries are missing, and one topology keeps neighbours' shared borders the same line, so countries drawn together
// meet without gaps. The 1:110m set is read only to cross-check the codes: each of its countries must land on the
// same code in about the same place.
//
// Steps: decode the TopoJSON (quantized, delta-encoded arcs and a transform); key every country by ISO 3166-1
// alpha-2 (the numeric ids mapped below; the areas without an id get codes by name); split off far-away parts that
// have codes of their own (Alaska, Hawaii, the Azores, French Guiana…) so a country fits its box; project to Web
// Mercator (Antarctica, which Mercator can't show, to a south polar view); join the halves the antimeridian cuts
// (Chukotka, Fiji) and the merged areas (Northern Cyprus into Cyprus); drop islands too small to see at the stage;
// then simplify each shared arc once (Douglas–Peucker, at the finest tolerance of the countries that use it, within
// SHARE) so every country has at most MAX_POINTS points and its path stays well under the scene's 12,000-character
// text limit. MAP_KIT_REPORT=1 prints each code's points, rings, tolerance and bytes.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
export const SOURCES = {
  '50m': { file: '.cache/map-kit/countries-50m.json', url: 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json', sha256: '04342cdc1e3016bcd7db1630de95684d67b79fe3c8c460321e87aef469502394' },
  '110m': { file: '.cache/map-kit/countries-110m.json', url: 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json', sha256: '2516c915867c7baf18ddec727aec46c315541a07cfb3d79a6559b05d5e94eee8' },
};
export const OUTPUTS = { countries: 'src/code/map/countries.mjs', shapes: 'src/code/map/shapes.mjs' };

/**
 * UNIT: grid units per degree. Points are stored as whole units of Web Mercator: x the longitude, y the Mercator
 * northing in the same degree units, so both axes share one scale (a 500th of a degree, about 220 m at the equator,
 * finer than the 1:50m data's own grid of 0.0036°). STAGE: the size, in px, a country is fitted to when its detail is
 * chosen (the canvas stage is 900 × 1030). MIN_RING: islands smaller than this at that fit are left out. TOLERANCE:
 * the simplification's starting tolerance at that fit, in px; a country over MAX_POINTS gets a coarser one. SHARE: a
 * border two countries share is simplified at the finer one's tolerance, but at most SHARE times finer than the other's.
 */
export const KIT = { unit: 500, stage: 940, minRing: 2.5, tolerance: 0.45, maxPoints: 400, share: 4 };

// ISO 3166-1 numeric (Natural Earth's ids, as world-atlas keeps them) to alpha-2.
const ISO = Object.fromEntries(`004 AF 248 AX 008 AL 012 DZ 016 AS 020 AD 024 AO 660 AI 010 AQ 028 AG 032 AR 051 AM 533 AW 036 AU 040 AT 031 AZ
044 BS 048 BH 050 BD 052 BB 112 BY 056 BE 084 BZ 204 BJ 060 BM 064 BT 068 BO 070 BA 072 BW 086 IO 076 BR 092 VG 096 BN 100 BG 854 BF
108 BI 132 CV 116 KH 120 CM 124 CA 136 KY 140 CF 148 TD 152 CL 156 CN 170 CO 174 KM 178 CG 184 CK 188 CR 384 CI 191 HR 192 CU 531 CW
196 CY 203 CZ 180 CD 208 DK 262 DJ 212 DM 214 DO 218 EC 818 EG 222 SV 226 GQ 232 ER 233 EE 748 SZ 231 ET 234 FO 238 FK 242 FJ 246 FI
258 PF 260 TF 250 FR 266 GA 270 GM 268 GE 276 DE 288 GH 300 GR 304 GL 308 GD 316 GU 320 GT 831 GG 324 GN 624 GW 328 GY 332 HT 334 HM
340 HN 344 HK 348 HU 352 IS 356 IN 360 ID 364 IR 368 IQ 372 IE 833 IM 376 IL 380 IT 388 JM 392 JP 832 JE 400 JO 398 KZ 404 KE 296 KI
414 KW 417 KG 418 LA 428 LV 422 LB 426 LS 430 LR 434 LY 438 LI 440 LT 442 LU 446 MO 807 MK 450 MG 454 MW 458 MY 462 MV 466 ML 470 MT
584 MH 478 MR 480 MU 484 MX 583 FM 498 MD 492 MC 496 MN 499 ME 500 MS 504 MA 508 MZ 104 MM 580 MP 516 NA 520 NR 524 NP 528 NL 540 NC
554 NZ 558 NI 562 NE 566 NG 570 NU 574 NF 408 KP 578 NO 512 OM 586 PK 585 PW 275 PS 591 PA 598 PG 600 PY 604 PE 608 PH 612 PN 616 PL
620 PT 630 PR 634 QA 642 RO 643 RU 646 RW 239 GS 728 SS 654 SH 662 LC 882 WS 674 SM 678 ST 682 SA 686 SN 688 RS 690 SC 694 SL 702 SG
534 SX 703 SK 705 SI 090 SB 706 SO 710 ZA 410 KR 724 ES 144 LK 652 BL 663 MF 659 KN 666 PM 670 VC 729 SD 740 SR 752 SE 756 CH 760 SY
158 TW 762 TJ 834 TZ 764 TH 626 TL 768 TG 776 TO 780 TT 788 TN 792 TR 795 TM 796 TC 850 VI 800 UG 804 UA 784 AE 826 GB 840 US 858 UY
860 UZ 548 VU 336 VA 862 VE 704 VN 732 EH 876 WF 887 YE 894 ZM 716 ZW`.trim().split(/\s+/).reduce((pairs, v, i, all) => (i % 2 ? pairs : [...pairs, [v, all[i + 1]]]), []));

/**
 * Natural Earth's areas without an ISO id. Kosovo takes XK, the code the EU, the IMF and Unicode use. Northern Cyprus
 * and Somaliland take user-assigned codes (ISO 3166 leaves XA–XZ to users) and are also part of CY and SO, which ISO
 * gives the whole island and the whole country, so a video can draw the island and then the line across it. The
 * Siachen Glacier is drawn as part of India, which holds it. The Indian Ocean Territories are Christmas Island and
 * the Cocos (Keeling) Islands (split by place below).
 */
const BY_NAME = { Kosovo: ['XK'], 'N. Cyprus': ['XC', 'CY'], Somaliland: ['XS', 'SO'], 'Siachen Glacier': ['IN'], 'Indian Ocean Ter.': ['CX'] };

/**
 * Far parts of a country, by where a polygon's centre is: a code of their own (ISO 3166-1, or ISO 3166-2 for a
 * state or region), or null to leave them out (remote islets with no code that would shrink the country in its box).
 * Natural Earth draws France and Norway with their overseas parts (its own ISO_A2 for them is -99): FR here is
 * metropolitan France with Corsica, NO mainland Norway. US is the lower 48 states and their islands.
 */
const PARTS = {
  US: [['US-AK', (lon, lat) => lat > 50 && (lon < -129 || lon > 0)], ['US-HI', (lon, lat) => lat < 30 && lon < -150]],
  FR: [['GF', near(-53.1, 4, 3)], ['GP', near(-61.5, 16.2, 1)], ['MQ', near(-61, 14.65, 0.6)], ['RE', near(55.5, -21.1, 1)], ['YT', near(45.15, -12.8, 0.6)]],
  NO: [['SJ', (lon, lat) => lat > 73 || lon < -5]],
  NL: [['BQ', lon => lon < -30]],
  PT: [['PT-20', lon => lon < -24], ['PT-30', (lon, lat) => lon < -15 && lat < 34]],
  ES: [['ES-CN', (lon, lat) => lat < 30 && lon < -12]],
  EC: [['EC-W', lon => lon < -85]],
  NZ: [['NZ-CIT', lon => lon < -175], ['TK', (lon, lat) => lat > -12], [null, (lon, lat) => lat < -48]],
  CL: [[null, lon => lon < -100]],
  ZA: [[null, (lon, lat) => lat < -40]],
  CX: [['CC', lon => lon < 100]],
};
function near(lon0, lat0, r) { return (lon, lat) => Math.hypot(lon - lon0, lat - lat0) <= r; }

/** Names, for the helpers' error messages ("'Germany' isn't a code; Germany is 'DE'"): Natural Earth's, spelled out. */
const NAMES = {
  US: 'United States', 'US-AK': 'Alaska', 'US-HI': 'Hawaii', GF: 'French Guiana', GP: 'Guadeloupe', MQ: 'Martinique', RE: 'Réunion', YT: 'Mayotte',
  SJ: 'Svalbard and Jan Mayen', BQ: 'Caribbean Netherlands', 'PT-20': 'Azores', 'PT-30': 'Madeira', 'ES-CN': 'Canary Islands', 'EC-W': 'Galápagos Islands',
  'NZ-CIT': 'Chatham Islands', TK: 'Tokelau', CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', XC: 'Northern Cyprus', XS: 'Somaliland', XK: 'Kosovo',
  CD: 'Democratic Republic of the Congo', CG: 'Republic of the Congo', BA: 'Bosnia and Herzegovina', CF: 'Central African Republic', SS: 'South Sudan',
  GQ: 'Equatorial Guinea', EH: 'Western Sahara', PF: 'French Polynesia', MP: 'Northern Mariana Islands', DO: 'Dominican Republic',
  TF: 'French Southern and Antarctic Lands', AG: 'Antigua and Barbuda', GS: 'South Georgia and the South Sandwich Islands', VC: 'Saint Vincent and the Grenadines',
  KN: 'Saint Kitts and Nevis', PM: 'Saint Pierre and Miquelon', BL: 'Saint Barthélemy', MF: 'Saint Martin', SX: 'Sint Maarten', LC: 'Saint Lucia', SH: 'Saint Helena',
  HM: 'Heard Island and McDonald Islands', VG: 'British Virgin Islands', VI: 'U.S. Virgin Islands', IO: 'British Indian Ocean Territory', FK: 'Falkland Islands',
  FO: 'Faroe Islands', KY: 'Cayman Islands', TC: 'Turks and Caicos Islands', CK: 'Cook Islands', SB: 'Solomon Islands', MH: 'Marshall Islands', PN: 'Pitcairn Islands',
  WF: 'Wallis and Futuna', KP: 'North Korea', KR: 'South Korea', MK: 'North Macedonia', SZ: 'Eswatini', GB: 'United Kingdom', AE: 'United Arab Emirates',
  ST: 'São Tomé and Príncipe', TT: 'Trinidad and Tobago', CV: 'Cabo Verde', FM: 'Micronesia', VA: 'Vatican City', NF: 'Norfolk Island',
};

/** Rough boxes ([west, south, east, north]) the codes a reader knows best must fall inside: a check on the ids and splits. */
const EXPECT = {
  US: [-125, 24, -66, 50], 'US-AK': [172, 51, 231, 72], 'US-HI': [-179, 18, -154, 29], FR: [-5.5, 41, 10, 51.5], NO: [4, 57.5, 31.5, 71.5], SJ: [-9.5, 70.5, 34, 81],
  PT: [-10, 36.8, -6, 42.2], ES: [-9.5, 35, 4.5, 44], CL: [-80, -56, -66, -17], NZ: [166, -48, 179, -34], RU: [19, 41, 191, 82], FJ: [174, -22, 182.5, -12],
  AU: [112, -44, 160, -9], CY: [32, 34.5, 34.7, 35.8], XC: [32.5, 35, 34.7, 35.8], GB: [-8.7, 49.8, 1.8, 61], DE: [5.8, 47.2, 15.1, 55.1], AQ: [-180, -90, 180, -60],
  JP: [122, 24, 146, 46], IN: [68, 6, 98, 37.2], BR: [-74.1, -34, -28.8, 5.3], CA: [-141.1, 41.6, -52.5, 83.2], CN: [73, 18, 135.1, 53.6],
};

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
/** The builder's own fingerprint, recorded in both outputs so a changed builder shows as stale without the data. */
export const builderHash = () => sha256(fs.readFileSync(import.meta.filename)).slice(0, 16);

/** The pinned TopoJSON files: read from .cache/map-kit/, downloaded there first when missing (`download`). */
export async function readSources({ download = true } = {}) {
  const out = {};
  for (const [key, { file, url, sha256: want }] of Object.entries(SOURCES)) {
    const at = path.join(root, file);
    if (!fs.existsSync(at)) {
      if (!download) return null;
      fs.mkdirSync(path.dirname(at), { recursive: true });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      fs.writeFileSync(at, Buffer.from(await res.arrayBuffer()));
    }
    const buffer = fs.readFileSync(at);
    if (sha256(buffer) !== want) throw new Error(`${file} doesn't match its pinned sha256 (${want}); delete it to download it again`);
    out[key] = JSON.parse(buffer.toString('utf8'));
  }
  return out;
}

// ------------------------------------------------------------------------------------------------- TopoJSON

/** Arcs as absolute quantized points ([qx, qy]), and the transform back to degrees. */
function decodeTopology(topology) {
  const [sx, sy] = topology.transform.scale, [tx, ty] = topology.transform.translate;
  const arcs = topology.arcs.map(arc => { let x = 0, y = 0; return arc.map(([dx, dy]) => [(x += dx), (y += dy)]); });
  const qmax = Math.round((180 - tx) / sx);
  return { arcs, lon: qx => qx * sx + tx, lat: qy => qy * sy + ty, qmax, qmin: 0 };
}
const polygonsOf = g => (g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []);
const ringPoints = (topo, ring) => ring.flatMap((i, k) => { const a = i < 0 ? topo.arcs[~i].slice().reverse() : topo.arcs[i]; return k ? a.slice(1) : a; });

/** Each country's polygons under its code, with the far parts split off (PARTS) and the areas without ids keyed (BY_NAME). */
function assignCodes(topology, topo) {
  const codes = new Map();
  const add = (code, polygon) => { if (!codes.has(code)) codes.set(code, []); codes.get(code).push(polygon); };
  for (const g of topology.objects.countries.geometries) {
    const keys = g.id !== undefined ? [ISO[g.id]] : BY_NAME[g.properties?.name];
    if (!keys?.[0]) throw new Error(`no code for ${g.id} ${g.properties?.name}`);
    for (const polygon of polygonsOf(g)) {
      const pts = ringPoints(topo, polygon[0]);
      const lon = topo.lon(pts.reduce((a, p) => a + p[0], 0) / pts.length), lat = topo.lat(pts.reduce((a, p) => a + p[1], 0) / pts.length);
      for (const key of keys) {
        const part = (PARTS[key] ?? []).find(([, test]) => test(lon, lat));
        if (part && part[0] === null) continue;
        add(part ? part[0] : key, polygon);
      }
    }
  }
  return codes;
}

// ------------------------------------------------------------------------------------------------- projection

const RAD = Math.PI / 180;
/** Web Mercator northing in degrees (equal to the latitude at the equator), clamped to ±85°. */
export const mercator = lat => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * RAD) / 2)) / RAD;
/** Antarctica, seen from above the South Pole: 0° longitude up, 90°E to the right; distances from the pole in degrees. */
const polar = (lon, lat) => [(90 + lat) * Math.sin(lon * RAD), (90 + lat) * Math.cos(lon * RAD)];
const POLAR = new Set(['AQ']);

// ------------------------------------------------------------------------------------------------- simplification

/** Douglas–Peucker over points [x, y], keeping both ends: the indexes kept. */
function simplify(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [ax, ay] = points[a], [bx, by] = points[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let far = -1, best = tolerance;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = len > 1e-12 ? Math.abs(dx * (ay - py) - dy * (ax - px)) / len : Math.hypot(px - ax, py - ay);
      if (d > best) { best = d; far = i; }
    }
    if (far >= 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return [...keep.keys()].filter(i => keep[i]);
}

// ------------------------------------------------------------------------------------------------- the kit

/** The kit from the two TopoJSON topologies: { files: {path: text}, report }. Deterministic. */
export function buildMapKit(sources, hash = builderHash()) {
  const topology = sources['50m'], topo = decodeTopology(topology);
  const U = KIT.unit;
  const byCode = assignCodes(topology, topo);

  // Arcs split where they run along the antimeridian or the south pole's edge (cuts the data makes, not coastlines),
  // so those pieces can be dropped and the halves joined. `parts[i]`: arc i's sub-arcs, each [points, artificial].
  const isCut = ([qx]) => qx === topo.qmin || qx === topo.qmax;
  const isPole = ([, qy]) => topo.lat(qy) <= -89.99;
  const sub = [], parts = topo.arcs.map(arc => {
    // Edge i joins points i - 1 and i; each run of edges of one kind becomes a sub-arc.
    const artificial = i => (isCut(arc[i - 1]) && isCut(arc[i])) || (isPole(arc[i - 1]) && isPole(arc[i]));
    const ids = [];
    let start = 0, kind = artificial(1);
    for (let i = 2; i < arc.length; i++) {
      if (artificial(i) === kind) continue;
      ids.push(sub.length); sub.push({ points: arc.slice(start, i), artificial: kind });
      start = i - 1; kind = !kind;
    }
    ids.push(sub.length); sub.push({ points: arc.slice(start), artificial: kind });
    return ids;
  });
  const expand = ref => (ref < 0 ? parts[~ref].slice().reverse().map(j => ~j) : parts[ref]);
  const subPoints = ref => (ref < 0 ? sub[~ref].points.slice().reverse() : sub[ref].points);

  // Each code: its projection, whether it's unwrapped across the antimeridian (Russia, Fiji, Alaska…), and its rings
  // as lists of directed sub-arcs, with the cut pieces and the borders inside a merged code dropped and the rest joined.
  const countries = new Map();
  for (const [code, polygons] of [...byCode].sort(([a], [b]) => a.localeCompare(b))) {
    const polar_ = POLAR.has(code);
    const lons = polygons.flatMap(p => p.flatMap(r => ringPoints(topo, r).map(([qx]) => topo.lon(qx))));
    const span = Math.max(...lons) - Math.min(...lons), wrapped = lons.map(l => (l < 0 ? l + 360 : l));
    const wrap = !polar_ && Math.max(...wrapped) - Math.min(...wrapped) < span - 1;
    const rings = polygons.flatMap(p => p.map(r => r.flatMap(expand)));
    const uses = new Map();
    for (const ring of rings) for (const ref of ring) uses.set(ref, (uses.get(ref) ?? 0) + 1);
    const inner = ref => uses.has(~ref);
    const drop = ref => sub[ref < 0 ? ~ref : ref].artificial || inner(ref);
    let joined = rings;
    if (rings.some(r => r.some(drop))) {
      // Join what's left end to end, by where each piece starts and ends (the antimeridian's two sides are one place).
      const key = ([qx, qy]) => `${wrap && qx === topo.qmin ? topo.qmax : polar_ && qx === topo.qmin ? topo.qmax : qx},${qy}`;
      const pieces = rings.flat().filter(ref => !drop(ref)), from = new Map();
      const nearOnCut = (end, free) => {
        const [x, y] = end.split(',').map(Number);
        if (x !== topo.qmax && x !== topo.qmin) return undefined;
        const near = free.map(ref => ({ ref, at: key(subPoints(ref)[0]).split(',').map(Number) })).filter(f => f.at[0] === x && Math.abs(f.at[1] - y) <= 4);
        return near.sort((a, b) => Math.abs(a.at[1] - y) - Math.abs(b.at[1] - y))[0]?.ref;
      };
      for (const ref of pieces) { const k = key(subPoints(ref)[0]); if (!from.has(k)) from.set(k, []); from.get(k).push(ref); }
      const used = new Set(), out = [];
      let ok = true;
      for (const first of pieces) {
        if (used.has(first)) continue;
        const ring = [first], start = key(subPoints(first)[0]);
        used.add(first);
        for (let guard = 0; ; guard++) {
          const end = key(subPoints(ring.at(-1)).at(-1));
          if (end === start || nearOnCut(end, [first]) === first) break;
          // The two sides of a cut don't always meet to the quantum: the nearest start along the cut, a few quanta away.
          const next = (from.get(end) ?? []).find(ref => !used.has(ref)) ?? nearOnCut(end, pieces.filter(ref => !used.has(ref)));
          if (next === undefined || guard > pieces.length) { ok = false; break; }
          used.add(next); ring.push(next);
        }
        if (!ok) break;
        out.push(ring);
      }
      if (ok) joined = out;
      else console.warn(`map kit: ${code}'s cut pieces don't join; kept as they are`);
    }
    const project = ([qx, qy]) => {
      const lon = topo.lon(qx), lat = topo.lat(qy);
      if (polar_) return polar(lon, lat).map(v => v * U);
      return [(wrap && lon < 0 ? lon + 360 : lon) * U, mercator(lat) * U];
    };
    countries.set(code, { code, polar: polar_, wrap, rings: joined, project });
  }

  // Each ring's full points (projected), the code's box at full detail, and the rings big enough to see at the stage.
  const fullRing = (c, ring) => ring.flatMap((ref, k) => { const pts = subPoints(ref).map(c.project); return k ? pts.slice(1) : pts; });
  const boxOf = pts => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
  for (const c of countries.values()) {
    const full = c.rings.map(r => ({ refs: r, box: boxOf(fullRing(c, r)) }));
    const all = boxOf(full.flatMap(r => [[r.box[0], r.box[1]], [r.box[2], r.box[3]]]));
    const scale = KIT.stage / Math.max(all[2] - all[0], all[3] - all[1]);
    const seen = full.filter(r => Math.max(r.box[2] - r.box[0], r.box[3] - r.box[1]) * scale >= KIT.minRing);
    c.kept = (seen.length ? seen : full).map(r => r.refs);
    const box = boxOf(c.kept.flatMap(r => fullRing(c, r)));
    c.scale = KIT.stage / Math.max(box[2] - box[0], box[3] - box[1]);
    c.px = KIT.tolerance;
  }

  // Simplify each sub-arc once, at the finest tolerance of the codes that use it, so shared borders stay one line;
  // a code over budget gets a coarser tolerance and the arcs are simplified again.
  const users = new Map();
  for (const c of countries.values()) for (const ring of c.kept) for (const ref of ring) { const i = ref < 0 ? ~ref : ref; if (!users.has(i)) users.set(i, new Set()); users.get(i).add(c); }
  const projected = new Map();
  const subProjected = i => {
    if (!projected.has(i)) {
      // Projected without unwrapping (a translation per code, applied after): every user simplifies the same points.
      const c = [...users.get(i)][0];
      projected.set(i, sub[i].points.map(p => (c.polar ? c.project(p) : [topo.lon(p[0]) * U, mercator(topo.lat(p[1])) * U])));
    }
    return projected.get(i);
  };
  let simplified = new Map();
  const ringOut = (c, ring) => {
    const pts = [];
    for (const ref of ring) {
      const i = ref < 0 ? ~ref : ref, kept = simplified.get(i), raw = sub[i].points;
      const list = kept.map(k => raw[k]);
      const seq = ref < 0 ? list.reverse() : list;
      pts.push(...(pts.length ? seq.slice(1) : seq).map(p => c.project(p).map(Math.round)));
    }
    // Closed: the last point repeats the first. Consecutive repeats (rounding) go.
    const out = pts.slice(0, -1).filter((p, k, all) => !k || p[0] !== all[k - 1][0] || p[1] !== all[k - 1][1]);
    while (out.length > 1 && out.at(-1)[0] === out[0][0] && out.at(-1)[1] === out[0][1]) out.pop();
    return out.length >= 3 ? out : null;
  };
  let rounds = 0;
  for (;;) {
    simplified = new Map();
    for (const [i, set] of users) {
      // The finest of its users', but never more than SHARE times finer than the coarsest: a big country's long borders
      // with small ones would otherwise spend its whole budget (Brazil has ten neighbours, China fourteen).
      const each = [...set].map(c => c.px / c.scale), tolerance = Math.max(Math.min(...each), Math.max(...each) / KIT.share);
      simplified.set(i, simplify(subProjected(i), tolerance));
    }
    let over = 0;
    for (const c of countries.values()) {
      c.out = c.kept.map(r => ringOut(c, r)).filter(Boolean);
      c.points = c.out.reduce((a, r) => a + r.length, 0);
      if (c.points > KIT.maxPoints) { c.px *= 1.15; over++; }
    }
    if (!over) break;
    if (++rounds > 80) throw new Error(`map kit: still over ${KIT.maxPoints} points: ${[...countries.values()].filter(c => c.points > KIT.maxPoints).map(c => `${c.code} ${c.points}`).join(', ')}`);
  }

  // Check the codes against the places they should be, and the 1:110m set's countries against the kit's.
  const degrees = c => { const b = boxOf(c.out.flat()); return c.polar ? null : [b[0] / U, latOf(b[1] / U), b[2] / U, latOf(b[3] / U)]; };
  for (const [code, [w, s, e, n]] of Object.entries(EXPECT)) {
    const c = countries.get(code);
    if (!c) throw new Error(`map kit: no ${code}`);
    const b = degrees(c);
    if (b && !(b[0] >= w - 0.5 && b[1] >= s - 0.5 && b[2] <= e + 0.5 && b[3] <= n + 0.5)) throw new Error(`map kit: ${code} spans ${b.map(v => v.toFixed(1)).join(', ')}, outside ${[w, s, e, n].join(', ')}`);
  }
  const small = sources['110m'], smallTopo = decodeTopology(small);
  for (const [code, polygons] of assignCodes(small, smallTopo)) {
    const c = countries.get(code);
    if (!c) throw new Error(`map kit: the 1:110m set has ${code}, the kit doesn't`);
    if (c.polar) continue;
    const pts = polygons.flatMap(p => ringPoints(smallTopo, p[0])).map(([qx, qy]) => [smallTopo.lon(qx), smallTopo.lat(qy)]);
    const lon = pts.reduce((a, p) => a + (c.wrap && p[0] < 0 ? p[0] + 360 : p[0]), 0) / pts.length, lat = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const b = degrees(c), pad = 2 + 0.1 * Math.max(b[2] - b[0], b[3] - b[1]);
    if (lon < b[0] - pad || lon > b[2] + pad || lat < b[1] - pad || lat > b[3] + pad) throw new Error(`map kit: 1:110m ${code} sits at ${lon.toFixed(1)}, ${lat.toFixed(1)}, away from the kit's ${b.map(v => v.toFixed(1)).join(', ')}`);
  }

  // Encode: each code's box in grid units, and its rings as deltas from the box's corner in Google's polyline encoding
  // (zigzag, five bits a character from '?'), rings separated by spaces.
  const encode = n => { let v = n < 0 ? ~(n << 1) : n << 1, s = ''; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>>= 5; } return s + String.fromCharCode(v + 63); };
  const index = {}, shapes = {}, report = [];
  for (const c of [...countries.values()].sort((a, b) => a.code.localeCompare(b.code))) {
    const b = boxOf(c.out.flat());
    let x = b[0], y = b[1];
    shapes[c.code] = c.out.map(ring => ring.map(([px, py]) => { const s = encode(px - x) + encode(py - y); x = px; y = py; return s; }).join('')).join(' ');
    index[c.code] = c.polar ? [...b, nameOf(c.code, byName(topology)), 1] : [...b, nameOf(c.code, byName(topology))];
    report.push({ code: c.code, points: c.points, rings: c.out.length, px: +c.px.toFixed(2), bytes: shapes[c.code].length });
  }

  const header = (what, use) => `// Generated by \`npm run map-kit\` (scripts/build-map-kit.mjs, builder ${hash}). Do not edit.
// ${what}
// Source: Natural Earth 1:50m admin-0 countries (public domain, naturalearthdata.com), via the world-atlas@2.0.2
// TopoJSON (ISC licence; 1:50m sha256 ${SOURCES['50m'].sha256.slice(0, 16)}…). Natural Earth's boundaries are de facto
// ones and imply no view on any dispute. Keyed by ISO 3166-1 alpha-2, plus ISO 3166-2 codes for far parts with codes of
// their own (US-AK, US-HI, PT-20, PT-30, ES-CN, EC-W, NZ-CIT) and XK Kosovo, XC Northern Cyprus, XS Somaliland.
// ${use}
`;
  const countriesText = `${header('Each code\'s name and box, in grid units of Web Mercator (x the longitude, y the Mercator northing, both in degrees × MAP_UNIT): all the scene checks need, since they only measure where a country is drawn.', 'Read by src/code/map/kit.mjs; the outlines are in shapes.mjs.')}
/** Grid units per degree. */
export const MAP_UNIT = ${U};
/** [x0, y0, x1, y1, name] per code; a sixth value of 1 marks a south polar view (Antarctica), which can't share a map. */
export const MAP_COUNTRIES = {
${Object.entries(index).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};
`;
  const shapesText = `${header('Each code\'s outline: its rings, separated by spaces, as deltas from its box\'s corner (MAP_COUNTRIES) in grid units, in Google\'s polyline encoding.', 'Only the renderer loads this (src/canvas.mjs); the scene checks draw each country as its box.')}
export const MAP_SHAPES = {
${Object.entries(shapes).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};
`;
  return { files: { [OUTPUTS.countries]: countriesText, [OUTPUTS.shapes]: shapesText }, report };
}

const latOf = y => (2 * Math.atan(Math.exp(y * RAD)) - Math.PI / 2) / RAD;
let names = null;
function byName(topology) {
  if (names) return names;
  names = new Map();
  for (const g of topology.objects.countries.geometries) {
    const code = g.id !== undefined ? ISO[g.id] : BY_NAME[g.properties?.name]?.[0];
    if (code && !names.has(code)) names.set(code, g.properties.name);
  }
  return names;
}
const nameOf = (code, from) => NAMES[code] ?? from.get(code) ?? code;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const sources = await readSources();
  const { files, report } = buildMapKit(sources);
  if (process.env.MAP_KIT_REPORT) console.log(report.slice().sort((a, b) => b.px - a.px).map(r => `${r.code} ${r.points}pt ${r.rings}r ${r.px}px ${r.bytes}B`).join('\n'));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  const most = report.slice().sort((a, b) => b.points - a.points).slice(0, 8).map(r => `${r.code} ${r.points}`).join(', ');
  console.log(`${report.length} codes, ${report.reduce((a, r) => a + r.points, 0)} points; ${Object.entries(files).map(([f, t]) => `${path.basename(f)} ${(Buffer.byteLength(t) / 1024).toFixed(1)} KB`).join(', ')}; most points: ${most}`);
}
