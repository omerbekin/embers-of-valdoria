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
@media(max-width:520px){body{padding:10px}.gauge .v{font-size:30px}header{gap:8px}}
</style>
<header>
<div class=gauge><div class=l>CPU</div><div class=v id=cv>-</div><div class=track><i id=cb></i></div></div>
<div class=gauge><div class=l>RAM</div><div class=v id=rv>-</div><div class=track><i id=rb></i></div></div>
</header>
<div class=meta><span id=cores></span><span id=upd>waiting for first sample...</span></div>
<h2>Agents</h2><div class=grid id=ga></div>
<h2>Jobs</h2><div class=grid id=gj></div>
<h2 class=t id=oh>Other (idle) +</h2><div class=grid id=go hidden></div>
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
</script>`;

http.createServer((req, res) => {
  if (req.url === '/api') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(snapshot)); }
  else { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); }
}).listen(PORT, '127.0.0.1', () => console.log('load-monitor on http://localhost:' + PORT));
