// Scene registry: every `<type>.mjs` in this folder (not starting with "_")
// default-exports { type, describe, props, draw(s) }. A beat's `scene` field
// picks one by `type`. See SCENES.md for the contract.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fallback from './_fallback.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SCENES = {};
for (const file of fs.readdirSync(here).sort()) {
  if (!file.endsWith('.mjs') || file === 'index.mjs' || file.startsWith('_')) continue;
  const mod = (await import(pathToFileURL(path.join(here, file)).href)).default;
  if (!mod?.type || typeof mod.draw !== 'function') throw new Error(`scenes/${file} must default-export { type, draw }`);
  SCENES[mod.type] = mod;
}
export const fallbackScene = fallback;

// Catalog handed to the script writer so it only uses scenes that exist.
export function sceneCatalog() {
  return Object.values(SCENES).map(s => ({ type: s.type, describe: s.describe, props: s.props }));
}
