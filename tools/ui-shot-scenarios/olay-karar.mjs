// Olay penceresi form r39 kararları: boş kart yok + X, tür rozeti, sonuç aynı pencerede, Final, metin olayı, tek düğme.
import { startCampaign } from './_lib.mjs';
const EV = ['dr_guild_hall', 'dr_stilt_hamlet', 'hc_white_dark', 'dr_lantern_rock', 'dr_sunken_stair', 'hc_hall_of_oaths'];
export default async ({ page, shot, wait }) => {
  await page.addStyleTag({ content: '.debug-toggle,#debug-toggle,.debug-fab,[class*="debug-btn"],#debug-root>button{display:none!important}' });
  await startCampaign(page, wait, { idx: 0 });
  for (const id of EV) {
    await page.evaluate(async (e) => {
      const d = await import('/src/campaign/data.ts');
      const sc = window.__game.scene.getScene('CampaignMapScene');
      document.querySelectorAll('.mw').forEach((x) => x.remove());
      const ch = d.EVENTS[e].choices ?? [];
      if (ch.length) sc.choiceEvent(e, sc.map.nodes[0].id, ch);
      else sc.worldWindow(sc.map.nodes[0].id, { title: d.EVENTS[e].title, art: (await import('/src/ui/map-window.ts')).windowArt('event:' + e), paras: d.EVENTS[e].text.split(/\n\s*\n/), acts: [{ label: 'Continue', primary: true, run: () => {} }] });
    }, id);
    await wait(1200);
    const info = await page.evaluate(() => ({ plates: [...document.querySelectorAll('.mw-plate')].map((p) => p.querySelector('.mw-ptag')?.textContent + ' | ' + p.querySelector('.mw-pnm')?.textContent), x: !!document.querySelector('.nav-close, [aria-label="Close"]'), notes: [...document.querySelectorAll('.mw-note')].map((n) => n.textContent) }));
    console.log(id, JSON.stringify(info));
    await shot(`karar-${id}`);
  }
  // gerçek akış: Valdoria "fold" (shepherds_fold) olay adımına ışınla; Lore seçimi -> sonuç aynı pencerede; sonra X ("Just rest")
  await page.evaluate(async () => {
    const st = await import('/src/campaign/state.ts');
    const sc = window.__game.scene.getScene('CampaignMapScene');
    document.querySelectorAll('.mw').forEach((x) => x.remove());
    sc.s = st.debugTeleport(sc.s, 'fold');
    for (let i = 0; i < 6 && st.nextStep(sc.s).kind !== 'event'; i++) sc.s = st.autoResolve(sc.s, st.nextStep(sc.s));
    console.log('adim', st.nextStep(sc.s).kind, sc.s.at);
    const d = await import('/src/campaign/data.ts');
    sc.choiceEvent('shepherds_fold', 'fold', st.eventChoicesFor ? st.eventChoicesFor(sc.s, 'shepherds_fold') : d.EVENTS['shepherds_fold'].choices);
  });
  await wait(1500);
  console.log('olay', JSON.stringify(await page.evaluate(() => ({ plates: [...document.querySelectorAll('.mw-plate .mw-pnm')].map((p) => p.textContent) }))));
  await page.evaluate(() => document.querySelector('[data-plate="castle"]')?.click());
  await wait(500);
  console.log('sonuc', JSON.stringify(await page.evaluate(() => ({ wins: document.querySelectorAll('.mw-win').length, anim: !!document.querySelector('.mw.mw-in'), acts: [...document.querySelectorAll('[data-act]')].map((b) => b.textContent), chips: [...document.querySelectorAll('.mw-chip')].map((b) => b.textContent) }))));
  await shot('karar-sonuc-ayni-pencere');
  await page.evaluate(() => document.querySelector('[data-act="0"]')?.click());
  await wait(800);
  console.log('sonra', JSON.stringify(await page.evaluate(() => ({ wins: document.querySelectorAll('.mw-win').length }))));
};
