// Tur 40: olay penceresi. 1) en uzun metinli + en çok seçenekli olay (alçak resim şeridi, taşma ölçümü)  2) X akışı: seçenek X = kapat (olay açık, düğüme dokununca yeniden açılır), sonuç X = Continue
import { startCampaign, closeLoot } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: '.debug-toggle,#debug-toggle,.debug-fab,[class*="debug-btn"],#debug-root>button{display:none!important}' });
  await startCampaign(page, wait, { idx: 0 });
  const pick = await page.evaluate(async () => {
    const d = await import('/src/campaign/data.ts');
    const all = Object.entries(d.EVENTS).map(([id, e]) => ({ id, len: (e.text ?? '').length, n: (e.choices ?? []).filter((c) => !c.closer && !c.walkAway).length, has: (e.choices ?? []).length }));
    const wc = all.filter((x) => x.has > 0);
    const longest = [...wc].sort((a, b) => b.len - a.len)[0];
    const most = [...wc].sort((a, b) => b.n - a.n || b.len - a.len)[0];
    return { total: all.length, withChoices: wc.length, longest, most };
  });
  console.log(view, 'secim', JSON.stringify(pick));
  for (const [tag, ev] of [['uzun', pick.longest.id], ['cok', pick.most.id]]) {
    await page.evaluate(async (e) => {
      const d = await import('/src/campaign/data.ts');
      const sc = window.__game.scene.getScene('CampaignMapScene');
      document.querySelectorAll('.mw').forEach((x) => x.remove());
      sc.choiceEvent(e, sc.map.nodes[0].id, d.EVENTS[e].choices);
    }, ev);
    await wait(1300);
    const m = await page.evaluate(() => { const p = document.querySelector('.mw-panel').getBoundingClientRect(); const art = document.querySelector('.mw-art')?.getBoundingClientRect(); const sc = document.querySelector('.mw-scroll'); const pl = [...document.querySelectorAll('.mw-plate')].map((x) => x.getBoundingClientRect()); const acts = document.querySelector('.mw-acts')?.getBoundingClientRect(); return { vh: innerHeight, panel: [p.top, p.bottom].map(Math.round), art: art ? [Math.round(art.height), getComputedStyle(document.querySelector('.mw-art')).display] : null, scroll: sc ? [sc.clientHeight, sc.scrollHeight] : null, platesMaxB: Math.round(Math.max(0, ...pl.map((x) => x.bottom))), plateR: Math.round(Math.max(0, ...pl.map((x) => x.right))), vw: innerWidth, inPanel: pl.every((x) => x.bottom <= p.bottom + 1) }; });
    console.log(view, tag, ev, JSON.stringify(m));
    await shot(`olay-${tag}-${ev}`);
  }
  if (process.env.AKIS) {
    const r = await page.evaluate(async () => {
      const st = await import('/src/campaign/state.ts');
      const d = await import('/src/campaign/data.ts');
      const sc = window.__game.scene.getScene('CampaignMapScene');
      document.querySelectorAll('.mw').forEach((x) => x.remove());
      sc.update2(st.debugTeleport(sc.s, '6A')); sc.refresh(true);
      
      sc.advance();
      return { step: st.nextStep(sc.s).kind, at: sc.s.at, gold: sc.s.gold };
    });
    console.log('akis0', JSON.stringify(r)); await wait(1200); await closeLoot(page, wait); await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').advance());
    await wait(1400);
    const snap = (tag) => page.evaluate(async (t) => { const st = await import('/src/campaign/state.ts'); const sc = window.__game.scene.getScene('CampaignMapScene'); return { t, win: document.querySelectorAll('.mw-win').length, plates: document.querySelectorAll('.mw-plate').length, chosen: !!document.querySelector('.mw-A.bd-chosen'), step: st.nextStep(sc.s).kind, canLeave: st.canWithdraw(sc.s), gold: sc.s.gold, items: (sc.s.bag ?? sc.s.items ?? []).length, nodeCard: !!document.querySelector('.nc-card, .sbc'), xBtn: !!document.querySelector('.close-toggle') }; }, tag);
    console.log(JSON.stringify(await snap('acik')));
    await page.evaluate(() => document.querySelector('.close-toggle')?.click()); await wait(700);
    console.log(JSON.stringify(await snap('X-sonrasi')));
    await page.evaluate(() => { const sc = window.__game.scene.getScene('CampaignMapScene'); sc.onNodeTap(sc.s.at, 'here'); }); await wait(1500);
    console.log(JSON.stringify(await snap('yeniden-dokun')));
    await page.evaluate(() => document.querySelector('[data-plate]:not(.dim)')?.click()); await wait(700);
    console.log(JSON.stringify(await snap('sonuc')));
    await shot('akis-sonuc');
    await page.evaluate(() => document.querySelector('.close-toggle')?.click()); await wait(1200);
    console.log(JSON.stringify(await snap('sonuc-X')));
    await page.evaluate(() => { const sc = window.__game.scene.getScene('CampaignMapScene'); sc.onNodeTap(sc.s.at, 'here'); }); await wait(1200);
    console.log(JSON.stringify(await snap('bitince-dokun')));
    // 3 dokunuş: komşu düğümden olay düğümüne dokun -> yürür -> pencere doğrudan (kart yok)
    const nb = await page.evaluate(async () => {
      const st = await import('/src/campaign/state.ts');
      const sc = window.__game.scene.getScene('CampaignMapScene');
      document.querySelectorAll('.mw').forEach((x) => x.remove());
      for (const n of sc.map.nodes) { if (n.id === '6A') continue; const t = st.debugTeleport(sc.s, n.id); let u = t; for (let i = 0; i < 8 && st.nextStep(u).kind !== 'move' && st.nextStep(u).kind !== 'complete'; i++) u = st.autoResolve(u, st.nextStep(u)); if (st.travelRoutes(u).has('6A') && st.nextStep(u).kind === 'move') { sc.update2(u); sc.refresh(true); sc.advance(); return n.id; } }
      return null;
    });
    console.log('komsu', nb); await wait(1200); await closeLoot(page, wait); await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').closeModal?.()); await wait(500);
    await wait(800);
    await page.evaluate(() => { const sc = window.__game.scene.getScene('CampaignMapScene'); sc.onNodeTap('6A', 'open'); });
    await wait(300);
    console.log(JSON.stringify(await snap('dokunus1-sonra')));
    await wait(9000);
    console.log(JSON.stringify(await snap('varinca')));
    await shot('akis-varinca');
  }
};
