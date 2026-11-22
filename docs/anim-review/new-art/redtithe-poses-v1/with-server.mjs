// Tek süreçte: vite geliştirme sunucusunu açar, verilen komutu (URL ilk argümana eklenir) koşturur, sonra sunucuyu kapatır (arka plan süreci kalmaz).
// Kullanım (worktree kökü): node with-server.mjs <script.mjs> <arg ...>   -> node <script.mjs> http://localhost:<port> <arg ...>
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
const server = await createServer({ server: { port: 5291, strictPort: false, host: '127.0.0.1' }, logLevel: 'warn' });
await server.listen();
const url = `http://127.0.0.1:${server.config.server.port}`;
const [script, ...rest] = process.argv.slice(2);
const code = await new Promise((res) => { const p = spawn(process.execPath, [script, url, ...rest], { stdio: 'inherit', env: process.env }); p.on('exit', res); });
await server.close();
process.exit(code ?? 1);
