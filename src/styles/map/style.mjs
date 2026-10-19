// Moving map (id 'map'): a style (../index.mjs) for "why does X exist?" map documentaries, the format that
// explains a strange border, an enclave, a split or a purchase with a map that moves: the odd shape, a pull back to
// where it is, a starting date, the key event, the deal drawn as a line on the map, the consequence today and a
// kicker. Every scene is a view of one clean modern map (a pale sea with a faint graticule, land in chalk with a thin
// coastline) that the camera pans and zooms across between scenes; territory is colour (the subject in the accent,
// its rival in rose, disputed land hatched), movement is fat arrows that draw themselves, and the style's own
// round-head figures, each with a sash in its side's colour, stand on the map with one blunt line each. A date
// cartouche at the top left ticks from scene to scene, and a scale bar and north arrow sit at the bottom right, over the
// map's sea-toned foot that the captions are drawn on (so they read in any brand's colours, as every word set on the
// map does: cardInk on land, ink on the sea, never the accent or rose). Countries are drawn only with the map kit
// (land() and geo(), src/code/map/kit.mjs: real Natural Earth outlines, never traced by hand), every country in
// view under each scene. It copies the format only, never another creator's figures, map styling, logos, title cards
// or catchphrases. Its reference video ("Why does Lesotho exist?", reference.mjs, with the camera and kit every
// scene spells out) is what the writer remakes; its identity (IDENTITY) is told apart from what
// each topic brings, so a new video maps its own region, never Lesotho. Every scene passes the code-scene checks on
// the canvas stage with its own line (test/styles.test.mjs).

import { isReferenceHold } from '../reference.mjs';
import { MAP_REFERENCE } from './reference.mjs';

const FEEL = `A storyteller's atlas: a clean map on a pale sea (colors.wall, a faint graticule), land in colors.chalk with a thin coastline in colors.cardInk at 30%. Each scene is a new map view of the whole frame, wide for where or close on a border, river or city. Start from the reference's camera and kit; draw land only with land(): <Land/> is every country in view, L(['FR', 'DE']) real outlines (ISO codes) to colour, and P(lon, lat) places every city, arrow and figure; never trace a coastline by hand (a river along a border is that stretch of L(), clipped). Territory is colour: the subject in colors.accent at 70%, spreading from its capital as a growing clip circle; its rival in colors.rose; disputed land hatched with thin diagonals. Movement is fat curved arrows drawing themselves on. Cities are dots with uppercase serif labels; place names are italic serif, colors.cardInk on land, colors.ink on sea (drawn before the land); no words in accent or rose (underline the subject's name in accent). Every scene keeps the date cartouche at the top left (ticking from the last scene's year, or TODAY) and <Scale/>, the scale bar over the sea-toned margin the captions sit on. People are this style's own round-head figures with a sash in their side's colour, fading in once the camera settles, each with a blunt one-line speech bubble ("We'll take the river."). Camera moves are the transitions: pan and zoom from the last view, easeInOut over about a second. Nothing bounces.`;

// What every moving map video keeps, what its topic brings, and what it never copies from the reference video.
const IDENTITY = {
  constant: [
    "A storyteller's map as the whole frame: a pale sea in colors.wall with a faint graticule, land in colors.chalk with a thin coastline in colors.cardInk at 30%, and the camera always somewhere over it",
    "Land drawn only with the map kit: land() (the kit's <Land/> for every country in view, L for the ones to colour), geo() (P) for every city, label, arrow and figure placed on it; nothing traced by hand",
    'Territory as colour: the subject in colors.accent at 70%, spreading from its capital as a growing circle; its rival in colors.rose; disputed land hatched with thin diagonal lines',
    "Fat curved arrows that draw themselves on and land with an arrowhead; cities as dots with uppercase serif labels; italic serif names for countries, rivers and seas, in colors.cardInk on land and colors.ink on the sea, the subject's underlined in the accent",
    "The date cartouche at the top left of every scene (the year in serif on a chalk plate, ticking from the last scene's year to this one's, or TODAY) and the scale bar and north arrow at the bottom right, which follow the camera, over the map's sea-toned foot",
    "This style's own figures: a round head with dot eyes, a robe and a sash in their side's colour, standing on the map near what they speak for, with a blunt one-line speech bubble",
    "Camera moves for transitions: every scene opens by panning and zooming from the last scene's view, easeInOut over about a second; nothing bounces",
    'A "why does this exist?" script: the odd shape, a pull back to where it is, the starting date, the key event, the deal or twist drawn as a line on the map, the consequence today and a kicker',
    "A centred serif caption line on the map's sea-toned foot, under a light paper grain (the line and grain drawn for you)",
  ],
  topic: [
    'The region and every view of it: wide for where, close on a border, a river or a city, and the countries each view colours',
    'The sides, their colours and their figures, and the one blunt line each of them says',
    'Every date, place, route, border and number, from your sources',
    'The kicker: the fact or dry line the video closes on',
  ],
  never: [
    "The reference video's maps as they are: the hole in South Africa, Thaba Bosiu, the Caledon and its farmland, the 1869 border, the four colonies merging and the pin on Lesotho's lowest point",
    'The same map view in every scene: move the camera wherever the line moves on',
    "Another creator's figures, map styling, logos, title cards or catchphrases: these round-head figures, the cartouche and this finish are this style's own",
  ],
};

// The same style on another topic, as text: a new map view wherever the line moves on.
const CONTRAST = {
  topic: 'why Chile is so long and thin',
  title: 'Why is Chile so long?',
  chapters: [
    { label: 'Over 4,000 km long', line: 'Chile runs over four thousand kilometres from north to south, yet it is barely two hundred wide.', place: 'all of Chile along the Pacific, a ruler beside it' },
    { label: 'A wall called the Andes', line: 'The Andes walled it in on the east, so Spanish Chile grew along the coast.', place: 'the Andes ridge close up, Santiago at its foot' },
    { label: '1879: war for the desert', line: 'In 1879, Chile went to war with Peru and Bolivia over the nitrate-rich Atacama Desert.', place: 'the Atacama coast, three armies’ arrows meeting' },
    { label: 'Bolivia loses its coast', line: 'Chile won, and Bolivia lost its whole coastline.', place: "Bolivia's old coast hatched, the new border drawn" },
    { label: '1881: the line on the peaks', line: 'In the south, an 1881 treaty with Argentina split Patagonia along the Andes.', place: 'Patagonia, a border drawing itself down the peaks' },
  ],
};

// A style with a reference video doesn't give the writer its opening and examples (../guide.mjs lookGuide), and the moving map
// was made with its reference from the start: its opening is the reference's own first scene and it keeps no separate
// examples (../index.mjs `reference`).
const [hook] = MAP_REFERENCE.beats;
// The moving map's reference isn't told in chapters, so its first beat is a shot with a scene of its own, never a hold.
if (isReferenceHold(hook)) throw new Error("the moving map's reference must open on a scene of its own");
const OPENING = { title: hook.label, line: hook.line, source: hook.source };

export const MAP = {
  id: 'map',
  name: 'Moving map',
  feel: FEEL,
  identity: IDENTITY,
  contrast: CONTRAST,
  opening: OPENING,
  examples: [],
  reference: MAP_REFERENCE,
  // A quiet serif line on a light paper grain, the word being said in the accent; no vignette (it muddies a light map).
  // The line sits on the map's sea-toned foot (the kit's Scale draws it), so it reads in any brand's colours.
  frame: {
    captions: { kind: 'line-center', font: 'serif', weight: 700, size: 60, upper: false, color: 'ink', highlight: 'accent', dim: 0.4 },
    grain: true,
    vignette: false,
  },
  // A brick atlas red for the subject (primary → colors.accent) and cobalt for its rival (accent → colors.rose), in navy
  // ink on a pale school-atlas aqua sea, which stays apart from land tinted in either side's colour; land is chalk, pure
  // white on this light background.
  palette: { primary: '#B93A23', accent: '#2D5DA8', ink: '#16232C', background: '#A9D3D6' },
  // The format runs on an understated chamber score under the narration, never the house groove's bright marimba: the
  // ambient bed's soft pad and plucked arpeggio near 95 BPM, its minor progression turning to the open major chord it
  // resolves on (music.mjs's ambient bed always ends on I add9), about 11 LU under the voice with a gentle 6 dB dip
  // under speech. (At 12 LU and 4 dB, this minor bed's first pluck dies away before the pad swells in and the hook
  // opens on 0.22 s of near-silence.) The camera moves are the map's own: nothing whooshes on them, only the cozy set's
  // soft chime as the closing ask's keyword lands.
  sound: { mood: 'ambient', bpm: [90, 100], mode: 'minor', underVoiceLu: -11, duckDb: 6, breakAt: null, sfx: 'cozy', density: 'few' },
};

export default MAP;
