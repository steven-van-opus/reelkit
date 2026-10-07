// Rebuilds catalog/tools.json from a Creators Toolbox checkout: every listed
// product in data.ts order, trimmed to what reelkit reads, site images as
// absolute creatorstoolbox.com URLs. One product per line so a re-sync diffs
// by product. Same input, same bytes.
//
//   node scripts/sync-catalog.mjs /path/to/Creators-Toolbox
//   npm run catalog:sync -- /path/to/Creators-Toolbox
//   (no path: $REELKIT_SITE)
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { readSiteCatalog } from '../src/lib/site-catalog.mjs';
import { compactProduct, PRODUCT_SITE, SNAPSHOT } from '../src/catalog.mjs';

const arg = process.argv.slice(2).find(a => !a.startsWith('--')) || process.env.REELKIT_SITE;
if (!arg) {
  console.error('Usage: node scripts/sync-catalog.mjs /path/to/Creators-Toolbox');
  process.exit(1);
}
const site = path.resolve(arg);

let list;
try {
  list = readSiteCatalog(site, { siteUrl: PRODUCT_SITE }).map(compactProduct);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
if (!list.length) {
  // The site parser has silently returned nothing before; never commit that.
  console.error(`No products parsed from ${site}; leaving catalog/tools.json as it is.`);
  process.exit(1);
}
const text = `[\n${list.map(p => JSON.stringify(p)).join(',\n')}\n]\n`;
const before = fs.existsSync(SNAPSHOT) ? fs.readFileSync(SNAPSHOT, 'utf8') : null;
fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
fs.writeFileSync(SNAPSHOT, text);

let commit = '';
try { commit = execFileSync('git', ['-C', site, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* not a git checkout */ }
const news = list.reduce((n, p) => n + (p.news?.length || 0), 0);
const kb = Math.round(Buffer.byteLength(text) / 1024);
console.log(`${path.relative(process.cwd(), SNAPSHOT)}: ${list.length} products, ${news} news items, ${kb} KB${commit ? ` (site ${commit})` : ''}${before === text ? ', unchanged' : ''}`);
