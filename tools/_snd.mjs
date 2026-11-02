import { chromium } from 'playwright';
const names = ['healRainDrops','healChime','waterSurge','rootSnap','thornSnap','rootFistSlam','rootCinch'];
const b = await chromium.launch(); const page = await b.newPage();
await page.addInitScript(() => { localStorage.setItem('eov.settings.v1', JSON.stringify({ volume: 0, steps: 20 })); });
await page.goto('http://localhost:5177/?debug=1', { timeout: 120000 });
await page.waitForFunction(() => window.__game?.scene?.getScenes(true).length > 0, null, { timeout: 60000 });
const r = await page.evaluate(async (names) => {
  const a = await import('/src/game/audio.ts'); const out = {};
  for (const n of names) {
    const def = a.resolveSfx(n, 'druid'); const rate = 44100; const off = new OfflineAudioContext(1, rate * 3, rate);
    const master = off.createGain(); master.gain.value = a.MASTER_GAIN ?? 1; master.connect(off.destination); a.synthSfx(off, master, def, 0);
    const d = (await off.startRendering()).getChannelData(0); let pk = 0, sum = 0, sq = 0, clip = 0, last = 0;
    for (let i = 0; i < d.length; i++) { const v = d[i]; pk = Math.max(pk, Math.abs(v)); sum += v; sq += v * v; if (Math.abs(v) >= 0.999) clip++; if (Math.abs(v) > 0.003) last = i; }
    out[n] = { peak: +pk.toFixed(3), rms: +Math.sqrt(sq / d.length).toFixed(4), dc: +(sum / d.length).toFixed(5), clip, endSec: +(last / rate).toFixed(2) };
  } return out; }, names);
console.log(JSON.stringify(r, null, 1)); await b.close();
