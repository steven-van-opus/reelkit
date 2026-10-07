// What this machine can make right now: the tools a reel needs (the same
// checks as scripts/setup.sh), which voice and script writer a reel would use
// and why, and the active brand pack and catalog. Never prints a secret.
// Exits 1 only when something required is missing.
//
//   npm run doctor
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = p => path.relative(ROOT, p) || '.';
const tty = process.stdout.isTTY;
const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);

let missing = 0;
function line(mark, text, hint) {
  console.log(`${mark} ${text}`);
  if (hint) console.log(`  ${paint(2, hint)}`);
}
const ok = (text, hint) => line(paint(32, '✓'), text, hint);
const note = (text, hint) => line(paint(33, '–'), text, hint);
const fail = (text, hint) => { missing++; line(paint(31, '✗'), text, hint); };
const section = title => console.log(`\n${paint(1, title)}`);
const firstErr = err => String(err?.message || err).split('\n')[0].slice(0, 200);

const mac = process.platform === 'darwin';
// Under Rosetta process.arch says x64, so ask the hardware.
const appleSilicon = mac && (() => {
  try { return execFileSync('/usr/sbin/sysctl', ['-n', 'hw.optional.arm64']).toString().trim() === '1'; } catch { return false; }
})();
const hint = (brew, apt) => `Install: ${mac ? brew : process.platform === 'linux' ? apt : `${brew} (macOS) or ${apt} (Ubuntu)`}`;

// `cmd` itself when it's a path, else the first runnable match on PATH.
function which(cmd) {
  const runnable = f => {
    try { fs.accessSync(f, fs.constants.X_OK); return fs.statSync(f).isFile(); } catch { return false; }
  };
  if (cmd.includes('/')) return runnable(cmd) ? cmd : null;
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir && runnable(path.join(dir, cmd))) return path.join(dir, cmd);
  }
  return null;
}

function firstLine(cmd, args) {
  try {
    return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }).toString().split('\n')[0].trim();
  } catch {
    return '';
  }
}

// The same lookup as src/tts.mjs envValue (environment, then ./.env), plus
// where the value came from. Callers print the source, never the value.
function envSource(name) {
  if (process.env[name]) return process.env[name].trim() ? { value: process.env[name].trim(), from: 'environment' } : null;
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, 'utf8').match(new RegExp(`^[ \\t]*${name}[ \\t]*=[ \\t]*["']?([^"'\\n]+)`, 'm'));
  return m?.[1].trim() ? { value: m[1].trim(), from: '.env' } : null;
}

// ------------------------------------------------------------------ tools

section('Tools');

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 20) {
  ok(`Node ${process.versions.node}`);
  if (nodeMajor < 22) note('Node 22 or later recommended: page captures in headless Chrome need its built-in WebSocket.');
} else {
  fail(`Node ${process.versions.node} is too old. reelkit needs Node 20 or later.`, hint('brew install node', 'Node 20+ from https://nodejs.org'));
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const absentDeps = Object.keys(pkg.dependencies || {}).filter(d => !fs.existsSync(path.join(ROOT, 'node_modules', d, 'package.json')));
if (absentDeps.length) fail(`npm dependencies missing: ${absentDeps.join(', ')}`, 'Run: npm run setup');
else ok('npm dependencies installed');

const ffmpeg = which('ffmpeg');
const ffprobe = which('ffprobe');
const ffmpegVersion = ffmpeg && firstLine(ffmpeg, ['-version']).split(' ')[2];
if (ffmpeg && ffprobe) ok(`ffmpeg${ffmpegVersion ? ` ${ffmpegVersion}` : ''} and ffprobe`);
else if (ffmpeg) fail('ffprobe not found. It ships with ffmpeg, so reinstall ffmpeg.', hint('brew reinstall ffmpeg', 'sudo apt install --reinstall ffmpeg'));
else fail('ffmpeg not found. It renders every reel and reads source video.', hint('brew install ffmpeg', 'sudo apt install ffmpeg'));

// As src/media.mjs picks it: Homebrew's yt-dlp, else PATH.
const ytdlp = fs.existsSync('/opt/homebrew/bin/yt-dlp') ? '/opt/homebrew/bin/yt-dlp' : which('yt-dlp');
if (ytdlp) ok(`yt-dlp ${firstLine(ytdlp, ['--version']) || `(${ytdlp})`}`);
else note("yt-dlp not found (optional). Without it, reels can't use source videos from YouTube, Vimeo or X.",
  hint('brew install yt-dlp', "sudo apt install pipx && pipx install yt-dlp (apt's yt-dlp lags behind YouTube)"));

// As src/media.mjs picks it: CHROME_PATH, else the macOS Google Chrome app.
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chromeHint = hint('brew install --cask google-chrome', 'the .deb from https://www.google.com/chrome, then export CHROME_PATH=/usr/bin/google-chrome');
const chrome = process.env.CHROME_PATH || MAC_CHROME;
if (fs.existsSync(chrome)) {
  ok(process.env.CHROME_PATH ? `Chrome (${chrome})` : 'Google Chrome');
} else if (process.env.CHROME_PATH) {
  note(`CHROME_PATH is set to ${chrome}, but nothing is there.`, chromeHint);
} else {
  const found = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].map(which).find(Boolean);
  if (found) note(`Found ${found}, but reelkit only uses Chrome through CHROME_PATH.`, `Run: export CHROME_PATH=${found}`);
  else note("Chrome not found (optional). Without it, pages that render client-side can't be captured.", chromeHint);
}

// ------------------------------------------------------------------ voice

section('Voice');

const VENV_PY = path.join(ROOT, '.tts', 'venv', 'bin', 'python');
const QWEN_REPO = 'mlx-community/Qwen3-TTS-12Hz-1.7B-Base-6bit';
const WHISPER_REPO = 'mlx-community/whisper-small.en-asr-8bit';
const hubDir = repo => path.join(ROOT, '.tts', 'hf', 'hub', `models--${repo.replace('/', '--')}`);
const snapshotReady = repo => {
  const dir = path.join(hubDir(repo), 'snapshots');
  return fs.existsSync(dir) && fs.readdirSync(dir).some(s => fs.existsSync(path.join(dir, s, 'config.json')));
};
const mlxAudio = () => {
  const lib = path.join(ROOT, '.tts', 'venv', 'lib');
  if (!fs.existsSync(lib)) return false;
  return fs.readdirSync(lib).some(py => {
    const site = path.join(lib, py, 'site-packages');
    return fs.existsSync(site) && fs.readdirSync(site).some(d => /^mlx_audio-.*\.dist-info$/.test(d));
  });
};

// Imported defensively: a missing or broken module is reported, not thrown.
async function load(file) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return { absent: true };
  try {
    return { mod: await import(pathToFileURL(abs).href) };
  } catch (err) {
    return { err };
  }
}
// src/tts.mjs imports the brand pack, so a broken pack is counted once, below.
const brand = await load('src/brandpack.mjs');

// Use src/tts.mjs's own check so this can't drift from what voicing does; fall
// back to the same file test if the module doesn't load.
const ttsLoad = await load('src/tts.mjs');
const tts = ttsLoad.mod || null;
if (!tts) {
  const msg = ttsLoad.absent ? 'src/tts.mjs not found.' : `src/tts.mjs didn't load (${firstErr(ttsLoad.err)}).`;
  if (absentDeps.length) note(msg, 'Run: npm run setup');
  else if (brand.err) note(msg);
  else fail(msg);
}
const anchor = tts?.HOUSE_VOICE?.anchor || 'kokoro-heart';
const houseReady = tts ? tts.qwenAvailable() : [VENV_PY, path.join(ROOT, 'voices', 'lock.py'),
  path.join(ROOT, 'voices', 'anchors', `${anchor}.wav`), hubDir(QWEN_REPO)].every(f => fs.existsSync(f));
const key = envSource('ELEVENLABS_API_KEY');
const voiceSetup = appleSilicon ? 'Run: npm run setup -- --voice' : 'The house voice runs on Apple Silicon only.';

// Mirrors voiceEpisode: REELS_VOICE, else the episode's own pin, else the
// house voice, else ElevenLabs with a key, else Kokoro.
const forced = process.env.REELS_VOICE;
const engine = forced || (houseReady ? 'qwen-locked' : key ? 'elevenlabs' : 'kokoro');
const precedence = 'An episode can pin voice.engine in its episode.json; REELS_VOICE overrides both.';
const ENGINES = {
  'qwen-locked': 'house voice (Kokoro Heart × Qwen3-TTS)',
  elevenlabs: 'ElevenLabs',
  kokoro: 'Kokoro (af_heart)',
  say: 'macOS say',
};
const why = forced ? `REELS_VOICE=${forced}`
  : houseReady ? 'the house voice is installed'
  : key ? `ELEVENLABS_API_KEY is set (${key.from})`
  : 'no house voice and no ElevenLabs key';

if (!ENGINES[engine]) {
  note(`REELS_VOICE=${engine} isn't an engine reelkit knows, so Kokoro narrates.`, `Use one of: ${Object.keys(ENGINES).join(', ')}.`);
} else if (engine === 'qwen-locked' && !houseReady) {
  fail("REELS_VOICE=qwen-locked, but the house voice isn't installed.", voiceSetup);
} else if (engine === 'elevenlabs' && !key) {
  fail("REELS_VOICE=elevenlabs, but ELEVENLABS_API_KEY isn't set.", 'Add it to .env (see .env.example).');
} else if (engine === 'say' && !mac) {
  fail('REELS_VOICE=say needs macOS.');
} else {
  ok(`Narration: ${ENGINES[engine]}, because ${why}`, forced ? null : precedence);
}

if (engine === 'elevenlabs' && key) {
  const model = envSource('ELEVENLABS_MODEL');
  const voiceId = envSource('ELEVENLABS_VOICE_ID');
  note(`ElevenLabs model: ${model ? `${model.value} (${model.from})` : 'newest the account can use'}; voice: ${voiceId ? `${voiceId.value} (${voiceId.from})` : 'first available stock voice'}.`);
} else if (key) {
  note(`ElevenLabs key found (${key.from}), but the ${ENGINES[engine] || 'selected voice'} comes first.`, 'Set REELS_VOICE=elevenlabs to narrate with ElevenLabs.');
}
if (engine === 'kokoro' && !forced) {
  note('Kokoro is the fallback voice.', appleSilicon
    ? 'For a more natural read, run npm run setup -- --voice (house voice) or add ELEVENLABS_API_KEY to .env.'
    : 'For a more natural read, add ELEVENLABS_API_KEY to .env (see .env.example).');
}

// Kokoro is the fallback for every machine, so its cache matters even when
// another engine leads.
const kokoroModel = path.join(ROOT, 'node_modules', '@huggingface', 'transformers', '.cache',
  'onnx-community', 'Kokoro-82M-v1.0-ONNX', 'onnx', 'model_quantized.onnx');
if (fs.existsSync(kokoroModel)) ok('Kokoro model cached');
else note('Kokoro model not cached yet. It downloads (about 90 MB) the first time Kokoro speaks.');

// Mirrors alignWords: Whisper word timestamps whenever the venv and the
// script exist, unless REELS_ALIGN=0. voices/align.py runs offline, so the
// weights must already be cached.
if (process.env.REELS_ALIGN === '0') {
  note('Word alignment off (REELS_ALIGN=0). Captions and lip sync use estimated timing.');
} else {
  const gaps = [
    !fs.existsSync(VENV_PY) && '.tts/venv',
    fs.existsSync(VENV_PY) && !mlxAudio() && 'mlx-audio',
    !snapshotReady(WHISPER_REPO) && 'Whisper weights',
    !fs.existsSync(path.join(ROOT, 'voices', 'align.py')) && 'voices/align.py',
  ].filter(Boolean);
  if (!gaps.length) ok('Word alignment: Whisper small.en, so captions and lip sync follow the actual voice');
  else note(`Word alignment unavailable (missing: ${gaps.join(', ')}). Captions and lip sync use estimated timing.`, voiceSetup);
}

// ------------------------------------------------------------------ writer

section('Script writer');

const claude = which(process.env.CLAUDE_CLI || 'claude');
if (claude) {
  const version = firstLine(claude, ['--version']).split(' ')[0];
  const auth = process.env.ANTHROPIC_API_KEY ? 'ANTHROPIC_API_KEY'
    : process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'CLAUDE_CODE_OAUTH_TOKEN'
    : 'your claude login';
  ok(`Claude Code${version ? ` ${version}` : ''}, model ${process.env.REELS_MODEL || 'opus'}`, `Signs in with ${auth}.`);
} else {
  note("claude CLI not found. It writes and fact-checks every new reel; existing episodes re-render without it.",
    'Install: npm install -g @anthropic-ai/claude-code, then run claude once to sign in');
}

// ------------------------------------------------------------------ brand + catalog

section('Brand and catalog');

if (brand.absent) note('Brand pack: src/brandpack.mjs not found.');
else if (brand.err) fail(`Brand pack didn't load: ${firstErr(brand.err)}`);
else {
  const { BRAND, brandDir } = brand.mod;
  ok(`Brand pack: ${BRAND?.name || '(unnamed)'} (${brandDir ? rel(brandDir) : 'unknown folder'})`,
    process.env.REELKIT_BRAND ? `Chosen by REELKIT_BRAND=${process.env.REELKIT_BRAND}.` : 'The default. Set REELKIT_BRAND to use another pack in brands/.');
}

const catalog = await load('src/catalog.mjs');
if (catalog.absent) note('Catalog: src/catalog.mjs not found.');
else if (catalog.err) fail(`Catalog didn't load: ${firstErr(catalog.err)}`);
else {
  try {
    const all = await catalog.mod.products();
    const news = all.reduce((n, p) => n + (p.news?.length || 0), 0);
    const localFile = catalog.mod.LOCAL || path.join(ROOT, 'catalog', 'local.json');
    let local = 0;
    try { local = JSON.parse(fs.readFileSync(localFile, 'utf8')).length || 0; } catch { /* no local additions */ }
    const source = process.env.REELKIT_SITE ? `REELKIT_SITE=${process.env.REELKIT_SITE}` : rel(catalog.mod.SNAPSHOT || path.join(ROOT, 'catalog', 'tools.json'));
    const fmt = n => n.toLocaleString('en-US');
    if (!all.length) {
      note('Catalog is empty. --url still works; --news and --auto need products.', 'Run: npm run catalog:sync -- /path/to/Creators-Toolbox');
    } else {
      ok(`Catalog: ${fmt(all.length)} products, ${fmt(news)} news items`,
        `From ${source}${local ? `, plus ${fmt(local)} in ${rel(localFile)}` : ''}.`);
    }
  } catch (err) {
    fail(`Catalog didn't load: ${firstErr(err)}`);
  }
}

console.log();
if (missing) {
  console.log(`${paint(31, '✗')} ${missing} required item(s) missing. Fix the lines marked ✗, then run npm run doctor again.`);
  process.exitCode = 1;
} else {
  console.log('Ready to make reels: npm run reel -- --url https://…');
}
