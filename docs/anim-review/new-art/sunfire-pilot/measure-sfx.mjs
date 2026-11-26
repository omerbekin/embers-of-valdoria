// Sunfire sesleri: tepe genliği ve kırpma ölçümü (OfflineAudioContext, audio.json master dahil). Taban sesle yan yana.
import { chromium } from 'playwright';
const [URL0] = process.argv.slice(2);
const b = await chromium.launch();
const page = await b.newPage();
await page.addInitScript(() => localStorage.setItem('eov.settings.v1', JSON.stringify({ volume: 0, steps: 20 })));
await page.goto(`${URL0}/`, { timeout: 120000 });
const out = await page.evaluate(async () => {
  const audio = await import('/src/game/audio.ts');
  const v2 = (await import('/data/audio-v2/mage.json')).default;
  const master = (await import('/data/audio.json')).default.master;
  const render = async (items, secs) => {
    const rate = 44100;
    const off = new OfflineAudioContext(1, Math.ceil(secs * rate), rate);
    const g = off.createGain();
    g.gain.value = master;
    g.connect(off.destination);
    for (const [id, at] of items) audio.synthSfx(off, g, v2.sfx[id], at);
    const d = (await off.startRendering()).getChannelData(0);
    let peak = 0, clip = 0, end = 0;
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a >= 1) clip++; if (a > 0.01) end = i / rate; }
    return { peak: +peak.toFixed(3), clip, audibleEndS: +end.toFixed(2) };
  };
  const r = {};
  for (const id of ['flameIgnite', 'sunfireIgnite', 'flameRoar', 'sunfireRoar', 'fireBlast', 'sunfireBlast']) r[id] = await render([[id, 0]], 1.6);
  return r;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
