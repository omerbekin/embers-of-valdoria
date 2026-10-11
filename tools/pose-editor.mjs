// Poz el noktası düzenleyicisi (geliştirici aracı; oyuna girmez): node tools/pose-editor.mjs  ->  http://localhost:5181
// Gövde pozunu ve seçili silahı oyundaki AYNI birleştirme kuralıyla çizer (src/game/poses.ts > drawPoseComposite ile aynı matematik):
//   tık = ana el (yumruk) noktası, Shift+tık = ikinci el, Q/E = açı -/+5 (Shift ile 1), oklar = noktayı 1 px kaydır, F = silahı aynala,
//   B = silah gövdenin arkasında, H = silahı gizle, [ ] = yumruk yaması yarıçapı. "Save" data/poses.json'a yazar (yalnızca poses alanları).
// Sunucu yalnızca 127.0.0.1'i dinler; assets/ ve data/poses.json dışında dosya vermez.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 5181);
const ROOT = resolve('.');
const DATA = join(ROOT, 'data/poses.json');
const HTML = join(ROOT, 'tools/pose-editor.html');
const TYPES = { '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.html': 'text/html; charset=utf-8' };

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': TYPES['.html'] });
    res.end(readFileSync(HTML));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/data') {
    res.writeHead(200, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' });
    res.end(readFileSync(DATA));
    return;
  }
  if (req.method === 'GET' && url.pathname.startsWith('/assets/')) {
    const file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(join(ROOT, 'assets')) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/save') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const data = JSON.parse(readFileSync(DATA, 'utf8'));
        // yalnızca el noktası alanları yazılır (ölçümler araçtan gelir)
        for (const [cls, poses] of Object.entries(incoming.classes ?? {})) {
          const def = data.classes?.[cls];
          if (!def) continue;
          for (const [name, p] of Object.entries(poses)) {
            const dst = def.poses?.[name];
            if (!dst) continue;
            for (const k of ['anchor', 'offhand', 'flip', 'back', 'hidden', 'fist']) {
              if (p[k] === undefined || p[k] === null || p[k] === false) delete dst[k];
              else dst[k] = p[k];
            }
          }
        }
        writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`);
        res.writeHead(200, { 'content-type': 'text/plain' }).end('saved');
      } catch (e) {
        res.writeHead(400, { 'content-type': 'text/plain' }).end(String(e));
      }
    });
    return;
  }
  // Yerel derleme önizlemesi (yalnızca GAME_DIR verilince; `vite build --base /game/` çıktısı): HMR yeniden yüklemesi olmadan sabit sürüm
  if (process.env.GAME_DIR && req.method === 'GET' && url.pathname.startsWith('/game/')) {
    const root = resolve(process.env.GAME_DIR);
    let file = normalize(join(root, decodeURIComponent(url.pathname.slice('/game/'.length)) || 'index.html'));
    if (file === root || !existsSync(file)) file = join(root, 'index.html');
    if (!file.startsWith(root)) {
      res.writeHead(404).end();
      return;
    }
    const ext = extname(file);
    const type = TYPES[ext] ?? { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' }[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(readFileSync(file));
    return;
  }
  // Ekran görüntüsü toplama (yalnızca SHOT_DIR verilince): oyun sayfası tuvali PNG data URL olarak gönderir (tarayıcı panesi küçükken tam boy görüntü)
  if (process.env.SHOT_DIR && url.pathname === '/shot') {
    res.setHeader('access-control-allow-origin', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-headers': 'content-type' }).end();
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const name = (url.searchParams.get('name') ?? 'shot').replace(/[^a-z0-9_-]/gi, '');
      writeFileSync(join(process.env.SHOT_DIR, `${name}.png`), Buffer.from(body.replace(/^data:image\/png;base64,/, ''), 'base64'));
      res.writeHead(200).end('ok');
    });
    return;
  }
  res.writeHead(404).end();
});
server.listen(PORT, '127.0.0.1', () => console.log(`pose editor: http://localhost:${PORT}`));
