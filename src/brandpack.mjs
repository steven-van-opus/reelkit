// The brand pack: who the reels are for. Name, handle, site, mascot name,
// palette, logo artwork and the house call to action live in
// brands/<name>/brand.json, so the engine renders any brand without code
// changes. This is the only module that knows where brand config comes from.
//
//   REELKIT_BRAND=<name>    use brands/<name>/ (default: creators-toolbox)
//   REELKIT_BRAND=./path    or a pack folder anywhere, relative to the cwd
//
// Everything is checked on import, so a broken pack fails before a render
// starts, with the field or file it's missing.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BRANDS = path.join(ROOT, 'brands');
const NAME = process.env.REELKIT_BRAND || 'creators-toolbox';

export const brandDir = /[\\/]/.test(NAME) ? path.resolve(NAME) : path.join(BRANDS, NAME);

const rel = p => path.relative(process.cwd(), p) || '.';
const fail = msg => { throw new Error(`Brand pack "${NAME}" (${rel(brandDir)}): ${msg}`); };

// Fields every pack needs, as dotted paths into brand.json. brands/README.md
// says what each one drives.
const REQUIRED = [
  'name', 'handle', 'site', 'about', 'hashtag',
  'mascot.name', 'mascot.description',
  'assets.lockup', 'assets.lockupWhite', 'assets.icon', 'assets.mark',
  'cta.keyword', 'cta.label', 'cta.vo', 'cta.speak', 'cta.line', 'cta.caption',
];

function load() {
  if (!fs.existsSync(brandDir)) {
    const have = fs.existsSync(BRANDS) ? fs.readdirSync(BRANDS).filter(d => fs.existsSync(path.join(BRANDS, d, 'brand.json'))) : [];
    fail(`no such folder. Set REELKIT_BRAND to one of: ${have.join(', ') || '(none found in brands/)'}`);
  }
  const file = path.join(brandDir, 'brand.json');
  if (!fs.existsSync(file)) fail(`missing ${rel(file)}`);
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(`${rel(file)} isn't valid JSON: ${e.message}`); }

  for (const key of REQUIRED) {
    const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), raw);
    if (typeof v !== 'string' || !v.trim()) fail(`brand.json needs "${key}" (a non-empty string)`);
  }
  if (!raw.hashtag.startsWith('#')) fail(`brand.json "hashtag" must start with # (got "${raw.hashtag}")`);
  if (!raw.palette || typeof raw.palette !== 'object') fail('brand.json needs a "palette" object of brand colours');
  for (const [k, v] of Object.entries(raw.palette)) {
    if (!/^#[0-9a-f]{6}$/i.test(v)) fail(`brand.json palette.${k} must be a #RRGGBB colour (got ${JSON.stringify(v)})`);
  }

  // Asset paths are relative to the pack; resolve them and make sure each file exists.
  const assets = {};
  for (const [k, v] of Object.entries(raw.assets)) {
    const abs = path.resolve(brandDir, v);
    if (!fs.existsSync(abs)) fail(`assets.${k} points to ${rel(abs)}, which doesn't exist`);
    assets[k] = abs;
  }
  return deepFreeze({ ...raw, assets });
}

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
  return Object.freeze(o);
}

export const BRAND = load();

// Absolute path of one of the pack's assets ('lockup', 'lockupWhite', 'icon', 'mark', …).
export function asset(key) {
  const p = BRAND.assets[key];
  if (!p) fail(`brand.json has no assets.${key}`);
  return p;
}
