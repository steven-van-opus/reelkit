// Local reel viewer: `node src/serve.mjs` → http://localhost:4310
// Serves reels/ as static files plus /api/episodes, which lists every episode
// folder and the outputs it has so far. The page polls it, so new renders show
// up without a reload.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ROOT } from './brand.mjs';

// ---------------------------------------------------------------- lip-sync tuner
// viewer/sync.html: read/save how far Kit's mouth leads the voice
// (reels/lipsync.json) and re-render one reel with it.
const LIPSYNC = path.join(ROOT, 'lipsync.json');
const renders = new Map(); // episode id → { state, startedAt, finishedAt, log }

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function startRender(id) {
  const job = { state: 'running', startedAt: Date.now(), log: '' };
  renders.set(id, job);
  const child = spawn(process.execPath, [path.join(ROOT, 'src', 'run.mjs'), '--episode', path.join('episodes', id), '--from', 'render'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  const take = d => { job.log = (job.log + d).slice(-4000); };
  child.stdout.on('data', take);
  child.stderr.on('data', take);
  child.on('close', code => Object.assign(job, { state: code === 0 ? 'done' : 'failed', finishedAt: Date.now() }));
  return job;
}

async function lipsyncApi(req, res, url) {
  if (url.pathname === '/api/lipsync' && req.method === 'GET') {
    let leadMs = 67;
    try { leadMs = JSON.parse(fs.readFileSync(LIPSYNC, 'utf8')).leadMs; } catch {}
    return sendJson(res, 200, { leadMs });
  }
  if (url.pathname === '/api/lipsync' && req.method === 'POST') {
    const body = await readBody(req);
    // Kept to 0.1 ms (renders sample the speech at the exact offset).
    const leadMs = Math.round(Math.max(-300, Math.min(400, Number(body.leadMs))) * 10) / 10;
    if (!Number.isFinite(leadMs)) return sendJson(res, 400, { error: 'leadMs must be a number' });
    fs.writeFileSync(LIPSYNC, JSON.stringify({ leadMs }, null, 2) + '\n');
    return sendJson(res, 200, { leadMs });
  }
  if (url.pathname === '/api/render') {
    const id = req.method === 'POST' ? (await readBody(req)).id : url.searchParams.get('id');
    // Only real episode folders (no paths, no test beds).
    if (typeof id !== 'string' || !/^[\w.-]+$/.test(id) || id.startsWith('_') || !fs.existsSync(path.join(ROOT, 'episodes', id, 'episode.json'))) {
      return sendJson(res, 404, { error: 'unknown episode' });
    }
    if (req.method === 'POST') {
      const running = renders.get(id);
      return sendJson(res, 202, running?.state === 'running' ? running : startRender(id));
    }
    return sendJson(res, 200, renders.get(id) || { state: 'idle' });
  }
  return false;
}

const PORT = Number(process.env.PORT || 4310);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.mp4': 'video/mp4', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8', '.wav': 'audio/wav', '.js': 'text/javascript', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

function episodes() {
  const dir = path.join(ROOT, 'episodes');
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const p = path.join(dir, d.name);
      const has = f => fs.existsSync(path.join(p, f));
      const stat = f => (has(f) ? fs.statSync(path.join(p, f)).mtimeMs : 0);
      let episode = null, voice = null;
      try { episode = JSON.parse(fs.readFileSync(path.join(p, 'episode.json'), 'utf8')); } catch {}
      try { voice = JSON.parse(fs.readFileSync(path.join(p, 'voice.json'), 'utf8')); } catch {}
      return {
        id: d.name,
        test: d.name.startsWith('_'),
        episode,
        duration: voice?.duration ?? null,
        files: {
          reel: has('reel.mp4') ? `episodes/${d.name}/reel.mp4?v=${stat('reel.mp4')}` : null,
          stills: has('stills.png') ? `episodes/${d.name}/stills.png?v=${stat('stills.png')}` : null,
          cover: has('cover.png') ? `episodes/${d.name}/cover.png?v=${stat('cover.png')}` : null,
          caption: has('caption.txt') ? fs.readFileSync(path.join(p, 'caption.txt'), 'utf8') : null,
        },
        updated: Math.max(stat('episode.json'), stat('reel.mp4'), stat('stills.png')),
      };
    })
    .sort((a, b) => (a.test - b.test) || b.updated - a.updated);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/lipsync' || url.pathname === '/api/render') {
    try { if ((await lipsyncApi(req, res, url)) !== false) return; } catch (err) { return sendJson(res, 500, { error: String(err.message) }); }
  }
  if (url.pathname === '/api/episodes') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    return res.end(JSON.stringify(episodes()));
  }
  const rel = url.pathname === '/' ? 'viewer/index.html' : decodeURIComponent(url.pathname.slice(1));
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) || rel.includes('node_modules') || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  const size = fs.statSync(file).size;
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (range) {
    // Video scrubbing needs byte ranges.
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

// If the port is taken by another copy of this viewer, just point at it;
// if something else holds it, move up to the next free port.
async function isViewer(port) {
  try {
    const res = await fetch(`http://localhost:${port}/api/episodes`, { signal: AbortSignal.timeout(1500) });
    return res.ok && Array.isArray(await res.json());
  } catch {
    return false;
  }
}

function listen(port, attempts = 10) {
  server.once('error', async err => {
    if (err.code !== 'EADDRINUSE' || attempts <= 1) throw err;
    if (await isViewer(port)) {
      console.log(`Reels viewer is already running → http://localhost:${port}`);
      process.exit(0);
    }
    listen(port + 1, attempts - 1);
  });
  server.listen(port, () => console.log(`Reels viewer → http://localhost:${port}`));
}
listen(PORT);
