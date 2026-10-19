// What a reel's soundtrack is made with (buildMix's `sound`): the music bed (a mood from music.mjs, its tempo range
// and mode, its loudness under the voice, how far it dips under speech, where the arrangement drops out, and a level)
// and the sound effects (a set from sfx.mjs, how many of its moments play, a level, and where the look lands the
// closing ask's keyword). Null music or effects leave them out.
//
// `duckDb` is how far the bed rises when nobody is talking: before the first word, after the last and in pauses of
// about half a second or more. The ducker holds through the short gaps the voice leaves between sentences and lines
// (0.12-0.2 s, tts.mjs), so mid-reel the bed stays at `underVoiceLu`, as it should under continuous narration.
//
// A reel picks its sound with `sound` in episode.json, else its style's preset (a styled reel, src/styles/), else the
// brand pack's `sound` (brand.json), else the house sound: the groove and the paper set, exactly as every reel had
// them before there was a choice. `sound` is a preset name (SOUNDS) or an object that starts from one and changes it
// (resolveSound). Everything is synthesised in code, so nothing here is a recording.

/**
 * @typedef {{
 *   music: { mood: string, bpm: [number, number], mode: 'major' | 'minor', underVoiceLu: number, duckDb: number, breakAt: 'pivot' | 'payoff' | null, gain: number } | null,
 *   sfx: { set: string, density: 'few' | 'some' | 'lots', gain: number, closing?: 'post' } | null,
 * }} Sound
 */

/** @type {Sound} */
export const HOUSE_SOUND = {
  music: { mood: 'groove', bpm: [108, 118], mode: 'major', underVoiceLu: -10, duckDb: 9, breakAt: null, gain: 1 },
  sfx: { set: 'paper', density: 'lots', gain: 1 },
};

/**
 * @typedef {{ mood: string, bpm: [number, number], mode: 'major' | 'minor', underVoiceLu: number, duckDb: number,
 *   breakAt: 'pivot' | 'payoff' | null, sfx: string, density: 'few' | 'some' | 'lots', musicOn?: boolean }} SoundPreset
 */

/**
 * The presets, one per look they were made for (`musicOn: false` starts with the music off):
 *   house      the groove and the paper set: the paper and studio looks' own sound.
 *   cozy       lamplit rooms, a coach talking you through it: a quiet, steady, beat-light keys bed about 12 LU under
 *              the voice that barely dips, and almost no effects (a soft chime as the closing ask's keyword lands).
 *   isometric  an isometric network that lights up: a soft, fairly narrow ambient bed near 74 BPM that dips about 6 dB
 *              under speech; a scan across the opening, a chime on the payoff, a double blip on the keyword.
 *   blueprint  a blueprint HUD: a dark minor pulse near 110 BPM, 8 LU under the voice, barely ducked, that drops out for
 *              a bar on the story's turn; a servo whine into the opening, a thunk on the turn and as the keyword locks.
 *   timelapse  a low-poly time-lapse: a low-passed minor pulse near 125 BPM, the loudest bed (7 LU under), clock ticks
 *              on its beat as each line's counter races, swishes on stage changes, and the music drops out under the
 *              payoff.
 *   doodle     a deadpan stick-figure doodle: near-silent with hard cuts (the silence is part of the joke), so it
 *              starts with the music off; switched on, soft keys near 92 BPM about 16 LU under the voice; nothing on
 *              the cuts, only a soft chime as the keyword lands.
 *   flat       a flat-vector science short: a minor-leaning ambient pad and plucked arpeggio near 90 BPM, 10 LU under
 *              the voice, dipping 5 dB under speech; interface blips as each step lights.
 *   terminal   a speedrun on a developer's screen: a synth pulse near 124 BPM under a voice that never stops, 9 LU under
 *              it, barely ducked, dropping out under the payoff; interface blips as panes light up.
 *   atlas      a map documentary: an understated chamber bed, the ambient pad and pluck near 95 BPM in a minor key that
 *              resolves on its open major chord, 11 LU under the voice with a gentle 6 dB dip; nothing on the camera
 *              moves, only a soft chime as the keyword lands.
 *   minimal    a soft ambient bed and only the moments every look draws: a card tap when the headline changes and a pop
 *              on the keyword.
 * @type {Record<string, SoundPreset>}
 */
export const SOUNDS = {
  house: { mood: 'groove', bpm: [108, 118], mode: 'major', underVoiceLu: -10, duckDb: 9, breakAt: null, sfx: 'paper', density: 'lots' },
  cozy: { mood: 'keys', bpm: [80, 88], mode: 'major', underVoiceLu: -12, duckDb: 3, breakAt: null, sfx: 'cozy', density: 'few' },
  isometric: { mood: 'ambient', bpm: [72, 76], mode: 'major', underVoiceLu: -11, duckDb: 6, breakAt: null, sfx: 'interface', density: 'few' },
  blueprint: { mood: 'dark', bpm: [106, 114], mode: 'minor', underVoiceLu: -8, duckDb: 1, breakAt: 'pivot', sfx: 'engineering', density: 'few' },
  timelapse: { mood: 'pulse', bpm: [120, 130], mode: 'minor', underVoiceLu: -7, duckDb: 3, breakAt: 'payoff', sfx: 'timelapse', density: 'some' },
  doodle: { mood: 'keys', bpm: [88, 96], mode: 'major', underVoiceLu: -16, duckDb: 3, breakAt: null, sfx: 'cozy', density: 'few', musicOn: false },
  flat: { mood: 'ambient', bpm: [84, 96], mode: 'minor', underVoiceLu: -10, duckDb: 5, breakAt: null, sfx: 'interface', density: 'some' },
  terminal: { mood: 'pulse', bpm: [120, 128], mode: 'minor', underVoiceLu: -9, duckDb: 3, breakAt: 'payoff', sfx: 'interface', density: 'some' },
  atlas: { mood: 'ambient', bpm: [90, 100], mode: 'minor', underVoiceLu: -11, duckDb: 6, breakAt: null, sfx: 'cozy', density: 'few' },
  minimal: { mood: 'ambient', bpm: [84, 96], mode: 'major', underVoiceLu: -11, duckDb: 5, breakAt: null, sfx: 'minimal', density: 'few' },
};

/** What a mood brings when it's chosen over the preset's own: its tempo, mode and drop-out (the preset keeps its levels). */
export const MOOD_DEFAULTS = {
  groove: { bpm: [108, 118], mode: 'major', breakAt: null },
  keys: { bpm: [80, 90], mode: 'major', breakAt: null },
  ambient: { bpm: [72, 78], mode: 'major', breakAt: null },
  dark: { bpm: [104, 114], mode: 'minor', breakAt: 'pivot' },
  pulse: { bpm: [120, 130], mode: 'minor', breakAt: 'payoff' },
};
/** How many of a set's moments play when it's chosen over the preset's own. */
export const SET_DENSITY = { paper: 'lots', cozy: 'few', interface: 'some', engineering: 'few', timelapse: 'some', minimal: 'some' };
/** The music and effects levels a reel may ask for, against the preset's own (1). */
export const VOLUME = { min: 0.2, max: 2 };

const KEYS = ['preset', 'mood', 'sfx', 'music', 'musicVolume', 'sfxVolume'];

/**
 * The sound a choice mixes with, or null when that's exactly the house sound. `choice` is a preset name, or
 *   { preset?, mood?, sfx?, music?, musicVolume?, sfxVolume? }
 * starting from `preset` (default 'house'): another bed (`mood`), another effects set or 'none' (`sfx`), the music on
 * or off (`music`; a preset with `musicOn: false` starts off), and the music's and effects' levels (0.2-2, 1 as the
 * preset has them). On the paper and studio looks every set but paper lands its closing cue as the comment bar's Post
 * button lights (scenes/cta.mjs), and the paper set times its own; on the canvas look (`canvas`, a styled reel) the
 * cue lands as the keyword is said. Throws on anything it doesn't know, naming it.
 * @returns {Sound | null}
 */
export function resolveSound(choice, { where = 'sound', canvas = false } = {}) {
  if (choice == null) return null;
  const c = typeof choice === 'string' ? { preset: choice } : choice;
  const fail = msg => { throw new Error(`${where}: ${msg}`); };
  if (typeof c !== 'object' || Array.isArray(c)) fail(`must be a preset name (${Object.keys(SOUNDS).join(', ')}) or an object`);
  for (const k of Object.keys(c)) if (!KEYS.includes(k)) fail(`unknown field "${k}" (fields: ${KEYS.join(', ')})`);
  const name = c.preset ?? 'house';
  if (!Object.hasOwn(SOUNDS, name)) fail(`no preset "${name}" (presets: ${Object.keys(SOUNDS).join(', ')})`);
  if (c.mood != null && !Object.hasOwn(MOOD_DEFAULTS, c.mood)) fail(`no mood "${c.mood}" (moods: ${Object.keys(MOOD_DEFAULTS).join(', ')})`);
  if (c.sfx != null && c.sfx !== 'none' && !Object.hasOwn(SET_DENSITY, c.sfx)) fail(`no effects set "${c.sfx}" (sets: ${Object.keys(SET_DENSITY).join(', ')}, or none)`);
  if (c.music != null && typeof c.music !== 'boolean') fail('"music" must be true or false');
  for (const k of ['musicVolume', 'sfxVolume']) {
    if (c[k] != null && !(typeof c[k] === 'number' && c[k] >= VOLUME.min && c[k] <= VOLUME.max)) fail(`"${k}" must be a number from ${VOLUME.min} to ${VOLUME.max}`);
  }
  const preset = SOUNDS[name];
  const mood = c.mood ?? preset.mood;
  const bed = mood === preset.mood ? preset : { ...preset, ...MOOD_DEFAULTS[mood] };
  const set = c.sfx ?? preset.sfx;
  /** @type {Sound} */
  const sound = {
    music: (c.music ?? preset.musicOn ?? true)
      ? { mood, bpm: [...bed.bpm], mode: bed.mode, underVoiceLu: preset.underVoiceLu, duckDb: preset.duckDb, breakAt: bed.breakAt, gain: c.musicVolume ?? 1 }
      : null,
    sfx: set === 'none' ? null : { set, density: set === preset.sfx ? preset.density : SET_DENSITY[set], gain: c.sfxVolume ?? 1, ...(set === 'paper' || canvas ? {} : { closing: 'post' }) },
  };
  return JSON.stringify(sound) === JSON.stringify(HOUSE_SOUND) ? null : sound;
}

// A line that turns the story ("But…", "Then the fans let go.").
const TURN = /^(but|then|until|so|now|yet|except|instead|however|meanwhile|suddenly|here['’]s|that['’]s when|the catch|turns out|and then)\b/i;

/**
 * Where the story turns or pays off, in seconds, or null. A beat runs from its start to the next one's (voice.json
 * keeps only starts), the last to the end.
 * 'pivot': the line that turns the story: the first content line from a third of the way in that opens with a turn
 * word, else the one starting nearest 55% of the way; music.mjs drops one bar from its start.
 * 'payoff': the line before the closing ask, until the closing starts; without one, the last line's final two seconds
 * up to its last word (not the hold on the last frame after it, where the music has already resolved).
 * @param {'pivot' | 'payoff' | null} breakAt
 * @param {{ beats?: { scene?: string, vo?: string }[] }} episode
 * @param {{ duration: number, beats: { start: number, voEnd?: number }[] }} timing
 * @returns {[number, number] | null}
 */
export function breakWindow(breakAt, episode, timing) {
  const beats = timing.beats.map((b, i) => ({ start: b.start, end: timing.beats[i + 1]?.start ?? timing.duration }));
  const scenes = episode.beats ?? [];
  const closing = scenes.findIndex(b => b?.scene === 'cta');
  const last = closing >= 0 ? closing - 1 : beats.length - 1;
  if (last < 1 || !beats[last]) return null;
  if (breakAt === 'payoff') {
    const end = closing >= 0 && beats[closing] ? beats[closing].start : Math.min(beats[last].end, timing.beats[last].voEnd ?? beats[last].end);
    const start = closing >= 0 ? beats[last].start : Math.max(beats[last].start, end - 2);
    return end - start >= 0.8 ? [start, end] : null;
  }
  if (breakAt === 'pivot') {
    const content = beats.map((b, i) => ({ b, i })).filter(({ i }) => i >= 1 && i <= last && i < beats.length - 1);
    if (content.length < 2) return null;
    const total = beats[last].end;
    const turn = content.find(({ b, i }) => b.start >= total * 0.33 && TURN.test(String(scenes[i]?.vo ?? '').trim()));
    const near = turn ?? content.reduce((best, c) => (Math.abs(c.b.start - total * 0.55) < Math.abs(best.b.start - total * 0.55) ? c : best));
    return [near.b.start, near.b.end];
  }
  return null;
}
