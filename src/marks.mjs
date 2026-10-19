// Logo marks for a styled reel's <Mark/>: each logo the writer declared in episode.json's "logos" ({ id, name,
// domain }) looked up as its exact vector shapes (its official SVG logo on Wikimedia Commons, as Wikidata names it,
// and its compact symbol from Simple Icons, CC0; src/code/marks.mjs) into <episode>/marks.json, which render.mjs
// reads. Each lookup is cached in .cache/marks/. A logo that can't be found is set as its name. marks.json holds
// third-party logos, so like media/ it's never committed.
//
//   node src/marks.mjs episodes/<id>
import fs from 'fs';
import path from 'path';
import { ROOT } from './brand.mjs';
import { declaredLogos, lookupMarks, MARK_LIMITS } from './code/marks.mjs';

const CACHE = path.join(ROOT, '.cache', 'marks');
const TIMEOUT_MS = 10_000;
const UA = 'reelkit (https://github.com/steven-van-opus/reelkit)';

// A page's text, or null: over HTTPS only, within the time and size limits (an SVG at most MARK_LIMITS.bytes).
async function fetchText(url, kind) {
  if (!url.startsWith('https://')) return null;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: kind === 'svg' ? 'image/svg+xml' : 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
    if (!res.ok) return null;
    const text = await res.text();
    return kind === 'svg' && text.length > MARK_LIMITS.bytes ? null : text;
  } catch { return null; }
}

const cacheFile = logo => path.join(CACHE, `${`${logo.id}-${logo.name}-${logo.domain}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);

/** Looks up the episode's declared logos and writes marks.json (id → { name, mark, symbol } or { name, missing }). */
export async function prepareMarks(dir, { log = console.log } = {}) {
  const episode = JSON.parse(fs.readFileSync(path.join(dir, 'episode.json'), 'utf8'));
  const logos = declaredLogos(episode);
  const marks = {};
  fs.mkdirSync(CACHE, { recursive: true });
  for (const logo of logos) {
    const file = cacheFile(logo);
    let found = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    if (!found) {
      found = await lookupMarks(logo.id, logo.name, logo.domain, fetchText);
      if (found.mark || found.symbol) fs.writeFileSync(file, JSON.stringify(found));
    }
    marks[logo.id] = found.mark || found.symbol ? { name: logo.name, ...found } : { name: logo.name, missing: true };
    log(`  ${logo.id} ${logo.name}: ${found.mark ? 'logo' : ''}${found.mark && found.symbol ? ' + ' : ''}${found.symbol ? 'symbol' : ''}${found.mark || found.symbol ? '' : 'not found, set as its name'}`);
  }
  fs.writeFileSync(path.join(dir, 'marks.json'), `${JSON.stringify(marks)}\n`);
  return marks;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = path.resolve(process.argv[2] || '.');
  await prepareMarks(dir);
}
