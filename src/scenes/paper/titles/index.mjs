// Extra title treatments for the paper hook, one module per style:
// default-export { name, label, draw(ctx, s, opts) → { bottom } }, where opts
// is { cx, top, bottom, title, kicker, by, toolId, maxW } — the same contract as
// titleStrips() in ../hook-titles.mjs. Every file here registers itself.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TITLES = {};
for (const file of fs.readdirSync(here).sort()) {
  if (!file.endsWith('.mjs') || file === 'index.mjs') continue;
  const mod = (await import(pathToFileURL(path.join(here, file)).href)).default;
  if (mod?.name && typeof mod.draw === 'function') TITLES[mod.name] = mod;
}
