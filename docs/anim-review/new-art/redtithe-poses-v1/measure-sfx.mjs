// Redtithe sesleri: tepe genliği ölçümü (Codex > Sounds ile aynı yöntem: OfflineAudioContext, ana ses audio.json master dahil, rastgele
// sapma YOK). Ayrıca Exsanguinate saplama anının birleşik çizimi (implode + iki saplama, oyundaki zamanlamayla).
// Kullanım (worktree kökü): node .../with-server.mjs .../measure-sfx.mjs   (with-server URL'yi ilk argüman olarak verir)
import { chromium } from 'playwright';
const [URL0] = process.argv.slice(2);
const b = await chromium.launch();
const page = await b.newPage();
await page.addInitScript(() => localStorage.setItem('eov.settings.v1', JSON.stringify({ volume: 0, steps: 20 })));
await page.goto(`${URL0}/`, { timeout: 120000 });
const out = await page.evaluate(async () => {
  const audio = await import('/src/game/audio.ts');
  const v2 = (await import('/data/audio-v2/antimage.json')).default;
  const master = (await import('/data/audio.json')).default.master;
  const render = async (items, secs) => {
    const rate = 44100;
    const off = new OfflineAudioContext(1, Math.ceil(secs * rate), rate);
    const g = off.createGain();
    g.gain.value = master;
    g.connect(off.destination);
    for (const [id, at] of items) audio.synthSfx(off, g, v2.sfx[id], at);
    const buf = await off.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0;
    let peakAt = 0;
    let clip = 0;
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]);
      if (a > peak) { peak = a; peakAt = i / rate; }
      if (a >= 1) clip++;
    }
    // 10 ms pencerelerde RMS zarfı: ilk anlamlı ses (tepe x 0,3) anı
    let onset = 0;
    for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > peak * 0.3) { onset = i / rate; break; }
    return { peak: +peak.toFixed(3), peakAt: +peakAt.toFixed(3), onset: +onset.toFixed(3), clip };
  };
  const r = {};
  for (const id of ['implode', 'daggerStabA', 'daggerStabB', 'voidPulse']) r[id] = await render([[id, 0]], 1.2);
  // oyundaki sıra: implode saplamadan IMPLODE_LEAD önce başlar, saplamalar saplama karesinde (A) ve 40 ms sonra (B)
  r.combined = await render([['implode', 0], ['daggerStabA', 0.22], ['daggerStabB', 0.26]], 1.4);
  return r;
});
console.log(JSON.stringify(out, null, 1));
await b.close();
