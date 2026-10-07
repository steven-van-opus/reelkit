// Orchestrator: news → episode folder → source media → script → voice →
// music mix → frames → post kit.
//
//   node src/run.mjs --auto [--count 1] [--days 3]   pick the top new stories and make a reel for each
//   node src/run.mjs --news <url-or-title-substring> make a reel about one story (even if it's been done)
//   node src/run.mjs --episode episodes/<id>         re-run an existing script from voice (after a validation check)
//   node src/run.mjs --episode episodes/<id> --from <step>   resume an episode at any step after seed
//
//   --pick-only     print what --auto would make and stop
//   --no-render     stop after voice + mix (check timing before spending minutes on frames)
//   --no-video      everything except reel.mp4: stills, cover and caption for a quick review
//   --force         render even if the script fails validation
//
// Steps, in order (names for --from):
//   pick → seed → media → write → validate → voice → mix → render → stills → cover → caption
// seed creates episodes/<date>-<slug>/ with a seed episode.json (id, date,
// source, subject); media runs src/media.mjs, which collects the sources'
// images and video into media/ with media.json and a contact sheet; write has
// Claude look at that media and write the script; the rest voice, mix and
// draw it. `--from media` re-collects and rewrites, `--from write` rewrites
// with the media already there, `--from cover` just redoes the cover.
//
// Each finished episode folder holds reel.mp4, cover.png, stills.png,
// caption.txt, episode.json, media.json and media/. In GitHub Actions the
// folders are also written to $GITHUB_OUTPUT (dirs=…) and summarised in the
// job summary.
//
// Env: REELS_MEDIA_MAX (default 12) caps how many media items are collected.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { parseCatalogFromDataTs } from '../../scripts/lib/data-ts.mjs';
import { pickNews, formatCandidate, todayUTC, MIN_SCORE, DATA_TS, REELS } from './pick-news.mjs';
import { validateDir, readMedia } from './validate.mjs';
import { seedEpisode, candidateFor } from './write-script.mjs';
import { applyHouseCta } from './cta.mjs';

const TARGET = [20, 32]; // seconds a reel should land in
const MEDIA_MAX = Number(process.env.REELS_MEDIA_MAX) || 12;

export const STEPS = ['pick', 'seed', 'media', 'write', 'validate', 'voice', 'mix', 'render', 'stills', 'cover', 'caption'];
const FRAMES = ['render', 'stills', 'cover', 'caption'];

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] ?? true : null; };
const has = name => args.includes(name);

// ---------------------------------------------------------------- console

const t0 = Date.now();
const since = t => `${((Date.now() - t) / 1000).toFixed(1)}s`;
let stepStart = Date.now();
function step(n, total, title) {
  stepStart = Date.now();
  console.log(`\n[${n}/${total}] ${title}`);
}
const info = msg => console.log(`      ${msg}`);
const done = msg => console.log(`      done${msg ? `: ${msg}` : ''} (${since(stepStart)})`);
const rel = p => path.relative(REELS, p) || '.';

let catalogCache = null;
const catalog = () => (catalogCache ||= parseCatalogFromDataTs(fs.readFileSync(DATA_TS, 'utf8')));
const readEpisode = dir => applyHouseCta(JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8')));
const today = flag('--today') || todayUTC();

// The steps this run makes, from `from` to the end, minus what --no-render /
// --no-video skip.
function plan(from) {
  let list = STEPS.slice(STEPS.indexOf(from));
  if (has('--no-render')) list = list.filter(s => !FRAMES.includes(s));
  else if (has('--no-video')) list = list.filter(s => s !== 'render');
  return list;
}

// ---------------------------------------------------------------- outputs

// Caption file to paste into Instagram/TikTok: the post copy, its hashtags and
// a credit block with the source links.
function writeCaption(dir, episode) {
  const tags = (episode.post?.hashtags || []).map(t => `#${String(t).replace(/^#+/, '')}`).join(' ');
  const links = [...new Set([episode.source?.url, ...(episode.source?.extraUrls || [])].filter(Boolean))].slice(0, 4);
  const parts = [episode.post?.caption?.trim() || episode.subject?.name || '', tags, links.length ? `Sources:\n${links.join('\n')}` : ''];
  const out = path.join(dir, 'caption.txt');
  fs.writeFileSync(out, `${parts.filter(Boolean).join('\n\n')}\n`);
  return out;
}

// render.mjs's own CLI (--stills, --frame), so stills and cover get exactly
// the setup a full render does.
function renderCli(dir, ...extra) {
  const res = spawnSync(process.execPath, [path.join(REELS, 'src', 'render.mjs'), dir, ...extra], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  if (res.status !== 0) throw new Error(`render.mjs ${extra.join(' ')} failed`);
  return res.stdout.trim().split('\n').pop();
}

// cover.png: the reel's custom cover — a designed poster for the Reels tab and
// the profile grid's 3:4 crop (src/thumbnail.mjs), plus cover-grid.png to
// preview that crop. Set it as the reel's cover when posting.
async function writeCover(dir) {
  const { renderCover } = await import('./thumbnail.mjs');
  return renderCover(dir);
}

function durationOf(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'voice.json'), 'utf8')).duration; } catch { return null; }
}

// ---------------------------------------------------------------- steps

// Each step works on one job: { dir, cand, fresh, timing }. `cand` is the
// pick-news candidate (looked up from the episode's source when resuming).
const TITLES = {
  pick: 'Picking news',
  seed: 'Creating the episode folder',
  media: 'Collecting source media',
  write: `Writing script with claude (${process.env.REELS_MODEL || 'opus'})`,
  validate: 'Validating script',
  voice: 'Voicing (Kokoro, local)',
  mix: 'Mixing music + sfx',
  render: 'Rendering frames → reel.mp4',
  stills: 'Stills contact sheet',
  cover: 'Cover',
  caption: 'Caption',
};

const RUN = {
  async seed(job) {
    const seeded = seedEpisode(job.cand);
    Object.assign(job, { dir: seeded.dir, fresh: seeded.fresh });
    done(`${rel(seeded.dir)}/episode.json${seeded.fresh ? '' : ' (this story already has a folder; reusing it)'}`);
  },

  // src/media.mjs is optional: without it (or when collecting fails) the
  // writer gets no media list and uses the drawn scenes.
  async media(job) {
    let collectMedia = null;
    if (fs.existsSync(path.join(REELS, 'src', 'media.mjs'))) {
      try { ({ collectMedia } = await import('./media.mjs')); }
      catch (e) { info(`can't load src/media.mjs: ${e.message.split('\n')[0]}`); }
    }
    const fallback = () => (readMedia(job.dir)?.size ? 'keeping the media.json already there' : 'the script uses drawn scenes only');
    if (typeof collectMedia !== 'function') return done(`skipped (no src/media.mjs yet); ${fallback()}`);
    try {
      await collectMedia(job.dir, { max: MEDIA_MAX });
    } catch (e) {
      info(`collecting failed: ${e.message.split('\n')[0]}`);
      return done(`skipped; ${fallback()}`);
    }
    const items = [...(readMedia(job.dir)?.values() || [])];
    const videos = items.filter(it => it.kind === 'video').length;
    const contact = fs.existsSync(path.join(job.dir, 'media', 'contact.jpg'));
    done(items.length
      ? `${items.length - videos} image${items.length - videos === 1 ? '' : 's'}, ${videos} video${videos === 1 ? '' : 's'} → ${rel(job.dir)}/media.json${contact ? ', media/contact.jpg' : ''}`
      : 'nothing usable found; the script uses drawn scenes only');
  },

  async write(job) {
    if (!job.cand) {
      job.cand = candidateFor(readEpisode(job.dir), { catalog: catalog() });
      if (!job.cand) throw new Error(`no news item in data.ts matches ${rel(job.dir)}'s source, so there's nothing to write from`);
    }
    job.cand.today = today;
    const { writeScript } = await import('./write-script.mjs');
    const res = await writeScript(job.cand, { dir: job.dir, rename: !!job.fresh, catalog: catalog(), log: info });
    job.dir = res.dir;
    if (res.errors.length) throw new Error(`script still fails validation after retries: ${res.errors.join('; ')}`);
    done(`${rel(res.dir)}/episode.json · ${res.episode.beats.length} beats · $${res.cost.toFixed(2)}`);
  },

  async validate(job) {
    const { errors, warnings } = await validateDir(job.dir);
    for (const w of warnings) info(`warning  ${w}`);
    for (const e of errors) info(`error    ${e}`);
    if (errors.length && !has('--force')) throw new Error(`${errors.length} validation error(s) in ${rel(job.dir)}/episode.json (pass --force to render anyway)`);
    done(errors.length ? 'errors ignored (--force)' : 'ok');
  },

  async voice(job) {
    const { voiceEpisode } = await import('./tts.mjs');
    job.timing = await voiceEpisode(job.dir);
    // Kokoro's word times are estimates: pin them to the pauses in vo.wav.
    const { alignEpisode } = await import('./align.mjs');
    job.timing = alignEpisode(job.dir, { log: m => info(`captions: ${m}`) });
    const d = job.timing.duration;
    done(`${d.toFixed(1)}s${d >= TARGET[0] && d <= TARGET[1] ? '' : ` (outside the ${TARGET[0]}–${TARGET[1]}s target)`}`);
  },

  async mix(job) {
    // A voice made outside this pipeline (node src/tts.mjs) gets aligned here.
    const { alignEpisode, isAligned } = await import('./align.mjs');
    if (fs.existsSync(path.join(job.dir, 'vo.wav')) && !isAligned(job.dir)) alignEpisode(job.dir, { log: m => info(`captions: ${m}`) });
    const audio = fs.existsSync(path.join(REELS, 'src', 'audio.mjs')) ? await import('./audio.mjs') : null;
    if (typeof audio?.buildMix !== 'function') return done('skipped (no src/audio.mjs yet); the reel uses the bare voiceover');
    await audio.buildMix(job.dir);
    done('mix.wav');
  },

  async render(job) {
    const { renderEpisode } = await import('./render.mjs');
    await renderEpisode(job.dir);
    done();
  },

  async stills(job) {
    renderCli(job.dir, '--stills');
    done(rel(path.join(job.dir, 'stills.png')));
  },

  async cover(job) {
    done(rel(await writeCover(job.dir)));
  },

  async caption(job) {
    done(rel(writeCaption(job.dir, readEpisode(job.dir))));
  },
};

// Run `steps` (names from STEPS, never 'pick') for one job; numbering
// continues from `first` out of `total`.
async function produce(job, steps, { first = 1, total = steps.length } = {}) {
  for (const [k, name] of steps.entries()) {
    step(first + k, total, TITLES[name]);
    await RUN[name](job);
  }
  return { dir: job.dir, episode: readEpisode(job.dir), duration: durationOf(job.dir) };
}

// ---------------------------------------------------------------- github

function report(results) {
  const ok = results.filter(r => r.dir && !r.error);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `dirs=${ok.map(r => rel(r.dir)).join(' ')}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ['## News reels', ''];
    if (!results.length) lines.push('Nothing new worth a reel today.');
    for (const r of results) {
      if (r.error) { lines.push(`- **${r.name}**: failed: ${r.error}`); continue; }
      const media = readMedia(r.dir)?.size || 0;
      lines.push(`### ${r.episode.subject?.name}${r.duration ? ` · ${r.duration.toFixed(1)}s` : ''} · ${media} media item${media === 1 ? '' : 's'} · \`${rel(r.dir)}\``, '', '```', fs.existsSync(path.join(r.dir, 'caption.txt')) ? fs.readFileSync(path.join(r.dir, 'caption.txt'), 'utf8').trim() : r.episode.post?.caption || '', '```', '');
    }
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
}

// ---------------------------------------------------------------- main

async function main() {
  const results = [];
  const from = flag('--from');
  if (from && !STEPS.includes(from)) throw new Error(`--from must be one of ${STEPS.join(', ')}`);

  if (flag('--episode')) {
    const dir = path.resolve(flag('--episode'));
    if (!fs.existsSync(path.join(dir, 'episode.json'))) throw new Error(`no episode.json in ${dir}`);
    // Without --from an episode re-runs from voice, behind the validation gate.
    const start = from || 'validate';
    if (STEPS.indexOf(start) < STEPS.indexOf('media')) throw new Error(`--from ${start} starts a new story; use --news or --auto for that`);
    console.log(`Producing ${rel(dir)} from ${from || 'voice'}`);
    try {
      results.push(await produce({ dir, cand: null, fresh: false }, plan(start)));
    } catch (e) {
      console.error(`\n      FAILED: ${e.message}`);
      results.push({ name: rel(dir), error: e.message });
    }
    report(results);
    return results;
  }

  const news = flag('--news');
  if (!has('--auto') && !news) {
    console.log(`usage: node src/run.mjs --auto [--count 1] [--days 3] | --news <url-or-title> | --episode episodes/<id> [--from ${STEPS.slice(2).join('|')}]`);
    process.exit(2);
  }
  if (from && from !== 'pick') throw new Error('--from resumes an existing episode: pass --episode episodes/<id> with it');
  const count = news ? 1 : Number(flag('--count') || 1);
  const days = Number(flag('--days') || (news ? 30 : 3));
  const steps = plan('pick');

  step(1, steps.length, `${TITLES.pick} (${news ? `matching "${news}", last ${days} days` : `last ${days} days`})`);
  const picked = pickNews({ days, today, filter: news || null, includeProduced: !!news, catalog: catalog() });
  const chosen = news ? picked.candidates.slice(0, 1) : picked.candidates.filter(c => c.score >= MIN_SCORE).slice(0, count);
  info(`${picked.items} news items → ${picked.candidates.length} candidates${picked.skipped.length ? `, ${picked.skipped.length} already produced` : ''}`);
  chosen.forEach((c, i) => console.log(formatCandidate(c, i).replace(/^/gm, '      ')));
  if (!chosen.length) {
    done(news ? `nothing matches "${news}"` : `nothing scores ${MIN_SCORE}+ today`);
    report(results);
    return results;
  }
  for (const c of chosen) if (c.alreadyProduced) info(`note: ${c.alreadyProduced}; making it again because --news asked for it`);
  done();
  if (has('--pick-only')) return results;

  for (const [i, cand] of chosen.entries()) {
    if (chosen.length > 1) console.log(`\n=== Reel ${i + 1} of ${chosen.length}: ${cand.name}`);
    const job = { dir: null, cand, fresh: false };
    try {
      results.push(await produce(job, steps.slice(1), { first: 2, total: steps.length }));
    } catch (e) {
      console.error(`\n      FAILED: ${e.message}`);
      results.push({ name: cand.name, error: e.message });
    }
  }
  report(results);
  return results;
}

const results = await main().catch(e => {
  console.error(`\nFAILED: ${e.message}`);
  process.exit(1);
});
const ok = results.filter(r => r.dir && !r.error);
console.log(`\n${ok.length ? `Made ${ok.length} reel${ok.length === 1 ? '' : 's'}` : 'No reels made'} in ${since(t0)}${ok.length ? ':' : '.'}`);
for (const r of ok) console.log(`  ${rel(r.dir)}${r.duration ? `  ${r.duration.toFixed(1)}s` : ''}`);
if (results.some(r => r.error) && !ok.length) process.exit(1);
