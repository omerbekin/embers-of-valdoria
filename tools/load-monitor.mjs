// Local load monitor: node tools/load-monitor.mjs  -> http://localhost:5199
// Shows CPU/RAM per tagged agent (tools/agent-tag.mjs) or per job kind.
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execFile, execSync } from 'node:child_process';

const PORT = 5199;
const CORES = os.cpus().length;
let snapshot = { t: 0, cpu: 0, ramUsedMB: 0, ramTotalMB: Math.round(os.totalmem() / 1048576), groups: [], cores: CORES };

function tagFile() {
  try {
    const cwd = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
    return path.resolve(cwd, execSync('git rev-parse --git-common-dir', { encoding: 'utf8', cwd }).trim(), 'agent-tags.json');
  } catch { return null; }
}
const TAGS = tagFile();
function readTags() {
  if (!TAGS) return [];
  try {
    const arr = JSON.parse(fs.readFileSync(TAGS, 'utf8'));
    return (Array.isArray(arr) ? arr : []).filter((e) => { try { process.kill(e.pid, 0); return true; } catch (x) { return x.code === 'EPERM'; } });
  } catch { return []; }
}

const PS = `$ErrorActionPreference='SilentlyContinue';
$p=Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,WorkingSetSize,CreationDate;
$c=Get-CimInstance Win32_PerfFormattedData_PerfProc_Process | Select-Object IDProcess,PercentProcessorTime;
@{p=@($p|ForEach-Object{@{i=$_.ProcessId;pp=$_.ParentProcessId;n=$_.Name;c=$_.CommandLine;w=$_.WorkingSetSize;d=if($_.CreationDate){$_.CreationDate.ToString('o')}else{$null}}});
  c=@($c|ForEach-Object{@{i=$_.IDProcess;u=$_.PercentProcessorTime}})} | ConvertTo-Json -Depth 4 -Compress`;

function classify(name, cmd) {
  const c = (cmd || '').toLowerCase().replace(/\\/g, '/'), n = (name || '').toLowerCase();
  if (c.includes('load-monitor')) return null;
  if (c.includes('codex')) return 'codex';
  if (c.includes('vitest')) {
    if (/\.test\.ts/.test(c)) return 'vitest (single)';
    return /slow/.test(c) ? 'vitest (slow)' : 'vitest (fast)';
  }
  if (c.includes('src/sim')) return 'sim';
  if (c.includes('anim-capture')) return 'anim-capture';
  if (c.includes('vite') && c.includes('preview')) return 'vite preview 5000';
  if (c.includes('vite')) { const m = c.match(/--port[ =](\d+)/); return 'vite dev' + (m ? ' :' + m[1] : ''); }
  if (/(chrome|msedge|brave|chromium|headless_shell)/.test(n) && (c.includes('headless') || c.includes('--remote-debugging'))) return 'headless browser';
  if (c.includes('claude')) return 'claude sessions';
  if (n === 'node.exe') return 'other node';
  return null;
}

let busy = false;
function tick() {
  if (busy) return;
  busy = true;
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS], { maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, out) => {
    busy = false;
    if (err) return;
    let d; try { d = JSON.parse(out); } catch { return; }
    const cpu = new Map(d.c.map((x) => [x.i, x.u || 0]));
    const procs = new Map(d.p.map((x) => [x.i, x]));
    const tags = new Map(readTags().map((t) => [t.pid, t]));
    const groups = new Map();
    for (const p of d.p) {
      let label = null;
      let cur = p, hops = 0;
      while (cur && hops++ < 30) {
        const t = tags.get(cur.i);
        if (t) { label = 'agent: ' + t.agent; break; }
        cur = procs.get(cur.pp);
      }
      if (!label) label = classify(p.n, p.c);
      if (!label) continue;
      const pct = (cpu.get(p.i) || 0) / CORES;
      let g = groups.get(label);
      if (!g) groups.set(label, (g = { label, cpu: 0, ramMB: 0, count: 0, oldest: null, procs: [] }));
      g.cpu += pct; g.ramMB += (p.w || 0) / 1048576; g.count++;
      if (p.d && (!g.oldest || p.d < g.oldest)) g.oldest = p.d;
      g.procs.push({ pid: p.i, name: p.n, cpu: +pct.toFixed(1), ramMB: Math.round((p.w || 0) / 1048576), cmd: (p.c || '').slice(0, 400) });
    }
    const idle = d.c.find((x) => x.i === 0);
    const sumCpu = [...groups.values()].reduce((a, g) => a + g.cpu, 0);
    const machine = idle ? Math.max(0, 100 - (idle.u || 0) / CORES) : sumCpu;
    const list = [...groups.values()].map((g) => ({ ...g, cpu: +g.cpu.toFixed(1), ramMB: Math.round(g.ramMB), procs: g.procs.sort((a, b) => b.cpu - a.cpu) }))
      .sort((a, b) => b.cpu - a.cpu || b.ramMB - a.ramMB);
    snapshot = { t: Date.now(), cpu: +Math.min(100, machine).toFixed(1), ramUsedMB: Math.round((os.totalmem() - os.freemem()) / 1048576), ramTotalMB: Math.round(os.totalmem() / 1048576), cores: CORES, groups: list };
  });
}
tick();
setInterval(tick, 3000);

// ---- Progress sekmesi: Claude Code agent transkriptleri (tasks/*.output, JSONL) ----
const CLAUDE_TMP = path.join(os.tmpdir(), 'claude');
const HEAD_BYTES = 64 * 1024, TAIL_BYTES = 512 * 1024, MAX_AGE_MS = 24 * 3600 * 1000, MAX_SCAN = 64 * 1024 * 1024;
const pcache = new Map(); // path -> { mtimeMs, size, offset, tools, head, card }
let progSnap = { t: 0, agents: [] };

function readRange(fd, pos, len) {
  const b = Buffer.alloc(len);
  const n = fs.readSync(fd, b, 0, len, pos);
  return b.subarray(0, n);
}
function oneLine(s, max) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
function parseHead(buf) {
  const txt = buf.toString('utf8');
  if (!txt.startsWith('{"parentUuid"')) return null; // shell görev çıktısı, agent değil
  const ts = (txt.match(/"timestamp":"([^"]+)"/) || [])[1] || null;
  const agentId = (txt.match(/"agentId":"([^"]+)"/) || [])[1] || null;
  let prompt = '';
  const m = txt.match(/"role":"user","content":"((?:[^"\\]|\\.)*)/);
  if (m) {
    let raw = m[1];
    try { prompt = JSON.parse('"' + raw + '"'); }
    catch { try { prompt = JSON.parse('"' + raw.replace(/\\$/, '') + '"'); } catch { prompt = raw; } }
  } else {
    const m2 = txt.match(/"type":"text","text":"((?:[^"\\]|\\.)*)/);
    if (m2) { try { prompt = JSON.parse('"' + m2[1] + '"'); } catch { prompt = m2[1]; } }
  }
  let first = (prompt.split('\n').find((l) => l.trim()) || '').trim().replace(/^Görev:\s*/i, '');
  return { startedAt: ts, agentId, title: oneLine(first, 80) || '(no title)' };
}
// artımlı araç sayacı: yalnız yeni baytlar okunur, tam satırlar sayılır
function countTools(fd, ent, size) {
  if (size < ent.offset) { ent.offset = 0; ent.tools = 0; }
  let guard = 0;
  while (ent.offset < size && guard++ < 8) {
    const len = Math.min(size - ent.offset, 16 * 1024 * 1024);
    const buf = readRange(fd, ent.offset, len);
    const lastNl = buf.lastIndexOf(10);
    if (lastNl < 0) break; // yarım satır: sonraki taramada tamamlanır
    const txt = buf.subarray(0, lastNl + 1).toString('utf8');
    let i = 0;
    while (i < txt.length) {
      let j = txt.indexOf('\n', i); if (j < 0) j = txt.length;
      const head = txt.slice(i, Math.min(j, i + 600));
      if (head.includes('"role":"assistant"') && !head.includes('api-request-blob')) {
        const mm = txt.slice(i, j).match(/"type":"tool_use"/g);
        if (mm) ent.tools += mm.length;
      }
      i = j + 1;
    }
    ent.offset += lastNl + 1;
  }
}
function analyze(fp, st, ent) {
  const fd = fs.openSync(fp, 'r');
  try {
    if (!ent.head) {
      ent.head = parseHead(readRange(fd, 0, Math.min(HEAD_BYTES, st.size)));
      if (!ent.head) return null;
    }
    countTools(fd, ent, st.size);
    const start = Math.max(0, st.size - TAIL_BYTES);
    const lines = readRange(fd, start, st.size - start).toString('utf8').split('\n');
    if (start > 0) lines.shift();
    let handback = false, lastTool = '', lastText = '', prog = null, lastTs = null;
    for (const ln of lines) {
      if (ln.charCodeAt(0) !== 123) continue;
      let o; try { o = JSON.parse(ln); } catch { continue; }
      if (o.timestamp) lastTs = o.timestamp;
      if (o.type !== 'assistant' || !o.message || !Array.isArray(o.message.content)) continue;
      for (const b of o.message.content) {
        if (b.type === 'text' && b.text) {
          const t = b.text.trim();
          if (t) lastText = t;
          const re = /(?:İLERLEME|ILERLEME|PROGRESS)\s+(\d+)\s*\/\s*(\d+)[ \t]*[:\-–]?[ \t]*([^\n]*)/gi;
          let m; while ((m = re.exec(b.text))) prog = { n: +m[1], m: +m[2], step: oneLine(m[3], 80) };
        } else if (b.type === 'tool_use') {
          if (b.name === 'SubagentHandback') handback = true;
          const inp = b.input || {};
          lastTool = b.name === 'Bash' || b.name === 'PowerShell' ? (b.name + ': ' + oneLine(inp.description || inp.command, 100))
            : b.name + (inp.file_path ? ': ' + path.basename(String(inp.file_path)) : '');
        }
      }
    }
    if (prog) ent.prog = prog;
    if (lastTool) ent.lastTool = lastTool;
    if (lastText) ent.lastText = lastText;
    if (handback) ent.handback = true;
    const lines2 = (ent.lastText || '').split('\n').map((l) => l.trim()).filter(Boolean);
    return {
      lastText: oneLine(lines2[lines2.length - 1] || '', 140),
      lastTool: ent.lastTool || '', prog: ent.prog || null, handback: !!ent.handback, lastTs,
    };
  } finally { fs.closeSync(fd); }
}
function scanProgress() {
  const now = Date.now(), agents = [], seen = new Set();
  let sessions = [];
  try {
    for (const h of fs.readdirSync(CLAUDE_TMP)) {
      const hp = path.join(CLAUDE_TMP, h);
      let subs; try { subs = fs.readdirSync(hp); } catch { continue; }
      for (const s of subs) sessions.push({ dir: path.join(hp, s, 'tasks'), sid: s });
    }
  } catch { /* klasör yok */ }
  for (const { dir, sid } of sessions) {
    let files; try { files = fs.readdirSync(dir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.output')) continue;
      const fp = path.join(dir, f);
      let st; try { st = fs.statSync(fp); } catch { continue; }
      if (!st.size || now - st.mtimeMs > MAX_AGE_MS) continue;
      seen.add(fp);
      let ent = pcache.get(fp);
      try {
        if (!ent) pcache.set(fp, (ent = { mtimeMs: 0, size: 0, offset: 0, tools: 0, head: null, info: null }));
        if (ent.mtimeMs !== st.mtimeMs || ent.size !== st.size || !ent.info) {
          if (ent.nonAgent) continue;
          const info = analyze(fp, st, ent);
          if (!info) { ent.nonAgent = true; continue; }
          ent.info = info; ent.mtimeMs = st.mtimeMs; ent.size = st.size;
        }
      } catch { continue; }
      if (ent.nonAgent || !ent.info) continue;
      const age = now - st.mtimeMs, i = ent.info;
      const status = i.handback || age > 30 * 60000 ? 'done' : age < 3 * 60000 ? 'running' : 'waiting';
      const t0 = Date.parse(ent.head.startedAt || '') || st.birthtimeMs || st.mtimeMs;
      const end = status === 'done' ? st.mtimeMs : now;
      agents.push({
        id: ent.head.agentId || f.replace('.output', ''), sid: sid.slice(0, 8), title: ent.head.title, status,
        known: !!i.prog, pct: i.prog && i.prog.m ? Math.max(0, Math.min(100, Math.round((i.prog.n / i.prog.m) * 100))) : 0,
        n: i.prog ? i.prog.n : 0, m: i.prog ? i.prog.m : 0, step: i.prog ? i.prog.step : '',
        tools: ent.tools, elapsedS: Math.max(0, Math.round((end - t0) / 1000)), lastAt: st.mtimeMs,
        lastTool: i.lastTool, lastText: i.lastText,
      });
    }
  }
  for (const k of [...pcache.keys()]) if (!seen.has(k)) pcache.delete(k);
  const rank = { running: 0, waiting: 1, done: 2 };
  agents.sort((a, b) => rank[a.status] - rank[b.status] || b.lastAt - a.lastAt);
  let doneN = 0;
  progSnap = { t: now, agents: agents.filter((a) => a.status !== 'done' || ++doneN <= 40) };
}
function safeScan() { try { scanProgress(); } catch (e) { console.error('progress scan failed', e.message); } }
safeScan();
setInterval(safeScan, 5000);

const PAGE = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Load monitor</title>
<style>
:root{--bg:#0f1115;--card:#181b21;--line:#262b34;--tx:#e4e7ec;--dim:#8d95a3;--ok:#3fb67a;--warn:#e6a93a;--bad:#e5534b;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--tx);margin:0;padding:16px;max-width:1400px;margin:0 auto}
header{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}
.gauge{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.gauge .l{color:var(--dim);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.gauge .v{font-size:40px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1;margin:4px 0 8px;transition:color .5s}
.gauge .v small{font-size:16px;font-weight:500;color:var(--dim)}
.track{height:8px;border-radius:4px;background:#232832;overflow:hidden}
.track i{display:block;height:100%;width:0;border-radius:4px;transition:width .6s,background .5s}
.meta{color:var(--dim);font-size:12px;margin:0 2px 14px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin:18px 2px 8px;font-weight:600}
h2.t{cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;cursor:pointer;min-width:0;transition:border-color .3s,box-shadow .3s}
.card:hover{border-color:#3a4150}
.card.hot{border-color:var(--warn);box-shadow:0 0 0 1px var(--warn) inset}
.top{display:flex;align-items:center;gap:8px;justify-content:space-between}
.name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.badge{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;color:#0f1115;white-space:nowrap}
.cpu{font-size:32px;font-weight:700;font-variant-numeric:tabular-nums;margin:6px 0 2px}
.cpu small{font-size:14px;color:var(--dim);font-weight:500}
svg.sp{display:block;width:100%;height:34px;margin:2px 0 6px}
.stats{display:flex;justify-content:space-between;color:var(--dim);font-size:12px;font-variant-numeric:tabular-nums;margin-top:6px}
.stats b{color:var(--tx);font-weight:600}
.procs{margin-top:10px;border-top:1px solid var(--line);padding-top:8px;font-size:12px;display:grid;gap:5px}
.p{display:grid;grid-template-columns:52px 1fr auto;gap:6px;color:var(--dim)}
.p .c{grid-column:1/-1;font:11px ui-monospace,Consolas,monospace;color:#a9b0bd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.p b{color:var(--tx);font-weight:500;font-variant-numeric:tabular-nums}
.empty{color:var(--dim);padding:10px 2px}
[hidden]{display:none!important}
.tabs{display:flex;gap:6px;margin-bottom:12px}
.tab{background:var(--card);border:1px solid var(--line);border-radius:99px;padding:6px 16px;color:var(--dim);font-size:13px;font-weight:600;cursor:pointer;text-decoration:none}
.tab.on{color:var(--tx);border-color:#3a4150;background:#222731}
.pg{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}
.pc{cursor:default}
.pc.done{opacity:.55}
.pc .sid{color:var(--dim);font-size:10px;font-family:ui-monospace,Consolas,monospace}
.pc .title{font-weight:600;margin:6px 0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pbar{height:10px;border-radius:5px;background:#232832;overflow:hidden;position:relative}
.pbar i{display:block;height:100%;border-radius:5px;transition:width .6s}
.pbar.unk i{width:100%;background:repeating-linear-gradient(45deg,#3a4150 0 10px,#2b303a 10px 20px);background-size:28px 28px;animation:stripe 1s linear infinite}
.pbar.unk.done i{animation:none}
@keyframes stripe{to{background-position:28px 0}}
.pstep{display:flex;justify-content:space-between;gap:8px;color:var(--dim);font-size:12px;margin:5px 0 2px}
.pstep b{color:var(--tx);font-weight:600;font-variant-numeric:tabular-nums}
.pl{color:var(--dim);font-size:12px;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl b{color:#a9b0bd;font-weight:600}
@media(max-width:520px){body{padding:10px}.gauge .v{font-size:30px}header{gap:8px}.pg{grid-template-columns:1fr}}
</style>
<div class=tabs><a class="tab on" id=tl href="#load">Load</a><a class=tab id=tp href="#progress">Progress</a></div>
<div id=vl>
<header>
<div class=gauge><div class=l>CPU</div><div class=v id=cv>-</div><div class=track><i id=cb></i></div></div>
<div class=gauge><div class=l>RAM</div><div class=v id=rv>-</div><div class=track><i id=rb></i></div></div>
</header>
<div class=meta><span id=cores></span><span id=upd>waiting for first sample...</span></div>
<h2>Agents</h2><div class=grid id=ga></div>
<h2>Jobs</h2><div class=grid id=gj></div>
<h2 class=t id=oh>Other (idle) +</h2><div class=grid id=go hidden></div>
</div>
<div id=vp hidden>
<div class=meta><span id=pcount></span><span id=pupd>waiting for first scan...</span></div>
<h2>Active</h2><div class=pg id=pa></div>
<h2 class=t id=ph>Finished +</h2><div class=pg id=pd hidden></div>
</div>
<script>
var $=function(i){return document.getElementById(i)};
var KINDS={agent:['Agent','#f0b35a'],vitest:['Vitest','#7cc4fa'],sim:['Sim','#b69cf5'],capture:['Capture','#f08fc0'],codex:['Codex','#5fd3c4'],vite:['Vite','#c9e265'],browser:['Browser','#f59d6e'],claude:['Claude','#e08a7a'],other:['Node','#9aa3b2']};
function kind(l){if(l.indexOf('agent:')==0)return'agent';if(l.indexOf('vitest')==0)return'vitest';if(l=='sim')return'sim';if(l=='anim-capture')return'capture';if(l=='codex')return'codex';if(l.indexOf('vite')==0)return'vite';if(l=='headless browser')return'browser';if(l=='claude sessions')return'claude';return'other'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function col(p){return p>=80?'var(--bad)':p>=50?'var(--warn)':'var(--ok)'}
var hist={},open={},cards={},anim={},lastT=0;
function tween(el,to,dec){var k=el.id||(el.id='n'+Math.random());var from=anim[k]==null?to:anim[k];anim[k]=to;var t0=performance.now();(function f(n){var r=Math.min(1,(n-t0)/500),v=from+(to-from)*r;el.textContent=v.toFixed(dec);if(r<1)requestAnimationFrame(f)})(t0)}
function dur(iso){if(!iso)return'-';var s=Math.max(0,(Date.now()-new Date(iso))/1000);if(s<60)return Math.round(s)+'s';if(s<3600)return Math.round(s/60)+'m';return(s/3600).toFixed(1)+'h'}
function spark(h,c){var W=100,H=34,n=20,pts=[],m=Math.max(10,Math.max.apply(null,h));for(var i=0;i<h.length;i++){pts.push(((n-h.length+i)/(n-1)*W).toFixed(1)+','+(H-1-(h[i]/m)*(H-4)).toFixed(1))}
 var line=pts.length>1?pts.join(' '):'';return '<svg class=sp viewBox="0 0 100 34" preserveAspectRatio=none><polyline fill=none stroke="'+c+'" stroke-width=1.5 vector-effect=non-scaling-stroke points="'+line+'"/></svg>'}
function render(g){
 var k=kind(g.label),K=KINDS[k],h=hist[g.label]||(hist[g.label]=[]);h.push(g.cpu);if(h.length>20)h.shift();
 var name=g.label.replace('agent: ','');
 var html='<div class=top><span class=name title="'+esc(name)+'">'+esc(name)+'</span><span class=badge style="background:'+K[1]+'">'+K[0]+'</span></div>'+
 '<div class=cpu><span class=num data-v="'+g.cpu+'">'+g.cpu.toFixed(1)+'</span><small> % CPU</small></div>'+spark(h,K[1])+
 '<div class=track><i style="width:'+Math.min(100,g.cpu)+'%;background:'+col(g.cpu*2)+'"></i></div>'+
 '<div class=stats><span><b>'+g.ramMB+'</b> MB</span><span><b>'+g.count+'</b> proc</span><span>up <b>'+dur(g.oldest)+'</b></span></div>';
 if(open[g.label])html+='<div class=procs>'+g.procs.map(function(p){return'<div class=p><b>'+p.pid+'</b><span>'+esc(p.name)+'</span><span>'+p.cpu+'% - '+p.ramMB+' MB</span><div class=c title="'+esc(p.cmd)+'">'+esc(p.cmd||'')+'</div></div>'}).join('')+'</div>';
 return html}
function fill(el,list){
 if(!list.length){el.innerHTML='<div class=empty>none</div>';return}
 var seen={};
 list.forEach(function(g){seen[g.label]=1;var c=cards[g.label];if(!c){c=cards[g.label]=document.createElement('div');c.className='card';c.onclick=function(){open[g.label]=!open[g.label];c.innerHTML=render(c._g)};}
  c._g=g;c.classList.toggle('hot',g.cpu>30);c.innerHTML=render(g);el.appendChild(c)});
 Array.prototype.slice.call(el.children).forEach(function(c){if(c.className.indexOf('card')<0||!seen[c._g&&c._g.label])el.removeChild(c)})}
function trimHist(gs){var s={};gs.forEach(function(g){s[g.label]=1});for(var k in hist)if(!s[k])delete hist[k]}
async function load(){
 try{
  var s=await(await fetch('/api')).json();
  if(!s.t)return;
  tween($('cvn')||($('cv').innerHTML='<span id=cvn></span><small> %</small>',$('cvn')),s.cpu,1);
  $('cb').style.width=s.cpu+'%';$('cb').style.background=col(s.cpu);$('cv').style.color=col(s.cpu);
  var rp=s.ramUsedMB/s.ramTotalMB*100;
  if(!$('rvn'))$('rv').innerHTML='<span id=rvn></span><small> / '+(s.ramTotalMB/1024).toFixed(1)+' GB</small>';
  tween($('rvn'),s.ramUsedMB/1024,1);
  $('rb').style.width=rp+'%';$('rb').style.background=col(rp);$('rv').style.color=col(rp);
  $('cores').textContent=s.cores+' logical cores';$('upd').textContent='updated '+new Date(s.t).toLocaleTimeString();
  if(s.t==lastT)return;lastT=s.t;
  trimHist(s.groups);
  var ag=[],jb=[],ot=[];
  s.groups.forEach(function(g){if(g.label.indexOf('agent:')==0)ag.push(g);else if(g.cpu<0.5&&g.count<=3)ot.push(g);else jb.push(g)});
  fill($('ga'),ag);fill($('gj'),jb);fill($('go'),ot);
  $('oh').textContent='Other (idle) '+($('go').hidden?'+':'-')+' ('+ot.length+')';
 }catch(e){$('upd').textContent='fetch failed'}
}
$('oh').onclick=function(){$('go').hidden=!$('go').hidden;$('oh').textContent=$('oh').textContent.replace(/[+-]/,$('go').hidden?'+':'-')};
load();setInterval(load,3000);
var SC={running:['Running','var(--ok)'],waiting:['Waiting','var(--warn)'],done:['Done','#7a8394']};
function ds(s){if(s<60)return s+'s';if(s<3600)return Math.floor(s/60)+'m '+(s%60)+'s';return Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m'}
function ago(ms){var s=Math.max(0,Math.round((Date.now()-ms)/1000));if(s<10)return'just now';return ds(s)+' ago'}
function pcard(a){
 var S=SC[a.status],bar=a.known?'<div class=pbar><i style="width:'+a.pct+'%;background:'+S[1]+'"></i></div><div class=pstep><span>'+esc(a.step||'')+'</span><b>'+a.pct+'% ('+a.n+'/'+a.m+')</b></div>'
  :'<div class="pbar unk'+(a.status=='done'?' done':'')+'"><i></i></div><div class=pstep><span>no progress marker</span><b>'+a.tools+' tool calls</b></div>';
 return '<div class="card pc '+a.status+'"><div class=top><span class=sid>'+esc(a.sid)+'</span><span class=badge style="background:'+S[1]+'">'+S[0]+'</span></div>'+
  '<div class=title title="'+esc(a.title)+'">'+esc(a.title)+'</div>'+bar+
  '<div class=stats><span>elapsed <b>'+ds(a.elapsedS)+'</b></span><span>last <b>'+ago(a.lastAt)+'</b></span></div>'+
  (a.lastTool?'<div class=pl title="'+esc(a.lastTool)+'"><b>tool</b> '+esc(a.lastTool)+'</div>':'')+
  (a.lastText?'<div class=pl title="'+esc(a.lastText)+'">'+esc(a.lastText)+'</div>':'')+'</div>'}
async function loadP(){
 try{
  var s=await(await fetch('/api/progress')).json();
  var act=s.agents.filter(function(a){return a.status!='done'}),dn=s.agents.filter(function(a){return a.status=='done'});
  $('pa').innerHTML=act.length?act.map(pcard).join(''):'<div class=empty>no active agents</div>';
  $('pd').innerHTML=dn.map(pcard).join('');
  $('ph').textContent='Finished '+($('pd').hidden?'+':'-')+' ('+dn.length+')';
  $('pcount').textContent=act.length+' active, '+dn.length+' finished (last 24h)';
  $('pupd').textContent='updated '+new Date(s.t).toLocaleTimeString();
 }catch(e){$('pupd').textContent='fetch failed'}
}
$('ph').onclick=function(){$('pd').hidden=!$('pd').hidden;$('ph').textContent=$('ph').textContent.replace(/[+-]/,$('pd').hidden?'+':'-')};
function tab(){var p=location.hash=='#progress';$('vl').hidden=p;$('vp').hidden=!p;$('tl').className='tab'+(p?'':' on');$('tp').className='tab'+(p?' on':'');if(p)loadP()}
window.addEventListener('hashchange',tab);tab();setInterval(function(){if(location.hash=='#progress')loadP()},5000);
</script>`;

http.createServer((req, res) => {
  if (req.url === '/api/progress') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(progSnap)); }
  else if (req.url === '/api') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(snapshot)); }
  else { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); }
}).listen(PORT, '127.0.0.1', () => console.log('load-monitor on http://localhost:' + PORT));
