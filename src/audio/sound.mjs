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
import { STYLES } from '../styles/index.mjs';

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
 * The presets: the house sound, `minimal`, and each style's own (src/styles/<id>/style.mjs `sound`), under the
 * style's id, so a brand pack or an episode can use a style's sound without its look. `musicOn: false` starts with
 * the music off.
 *   house      the groove and the paper set: the paper and studio looks' own sound.
 *   minimal    a soft ambient bed and only the moments every look draws: a card tap when the headline changes and a pop
 *              on the keyword.
 *   <style id> its style's, named after its look: diorama, isometric, blueprint, timelapse, doodle, flat, terminal, map.
 * @type {Record<string, SoundPreset>}
 */
export const SOUNDS = {
  house: { mood: 'groove', bpm: [108, 118], mode: 'major', underVoiceLu: -10, duckDb: 9, breakAt: null, sfx: 'paper', density: 'lots' },
  minimal: { mood: 'ambient', bpm: [84, 96], mode: 'major', underVoiceLu: -11, duckDb: 5, breakAt: null, sfx: 'minimal', density: 'few' },
  ...Object.fromEntries(Object.values(STYLES).map(style => [style.id, style.sound])),
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
