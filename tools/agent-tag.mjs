// Usage: node tools/agent-tag.mjs <agent-name> -- <command...>
// Registers the running command in <git-common-dir>/agent-tags.json so tools/load-monitor.mjs can attribute CPU/RAM.
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (!argv[0] || sep < 1 || sep === argv.length - 1) {
  console.error('usage: node tools/agent-tag.mjs <agent-name> -- <command...>');
  process.exit(2);
}
const agent = argv[0];
const q = (a) => (/[\s"'<>()|&^;]/.test(a) ? '"' + a.replace(/"/g, '\\"') + '"' : a);
const cmd = argv.slice(sep + 1).map(q).join(' ');

function registryPath() {
  const dir = execSync('git rev-parse --git-common-dir', { encoding: 'utf8' }).trim();
  return path.resolve(dir, 'agent-tags.json');
}
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}
function read(file) {
  try {
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(arr) ? arr.filter((e) => e && alive(e.pid)) : [];
  } catch { return []; }
}
function update(file, fn) {
  try { fs.writeFileSync(file, JSON.stringify(fn(read(file)), null, 1)); } catch {}
}

const file = registryPath();
const child = spawn(cmd, { shell: true, stdio: 'inherit' });
// shell:true: child.pid is the shell; its descendants are attributed by parent walk.
update(file, (l) => l.concat({ pid: child.pid, agent, cmd, start: new Date().toISOString() }));
const done = () => update(file, (l) => l.filter((e) => e.pid !== child.pid));
child.on('exit', (code, sig) => { done(); process.exit(code ?? (sig ? 1 : 0)); });
child.on('error', (e) => { done(); console.error(e.message); process.exit(1); });
process.on('SIGINT', () => {});
