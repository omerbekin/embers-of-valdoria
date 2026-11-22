// Olay penceresi resmi (hepsi olayın kendi resmi) + düğüm kartı başlık çizgisi ölçümü (Ömer 2026-11-21).
import { startCampaign, scene } from './_lib.mjs';
const EV = ['dr_guild_hall', 'dr_fishmarket', 'hc_white_dark', 'hc_clan_steading', 'shepherds_fold'];
export default async ({ page, shot, wait }) => {
  await page.addStyleTag({ content: '.debug-toggle,#debug-toggle,.debug-fab,[class*="debug-btn"],#debug-root>button{display:none!important}' });
  await startCampaign(page, wait, { idx: 0 });
  for (const id of EV) {
    await page.evaluate(async (e) => {
      const d = await import('/src/campaign/data.ts');
      const sc = window.__game.scene.getScene('CampaignMapScene');
      document.querySelectorAll('.mw').forEach((x) => x.remove());
      sc.choiceEvent(e, sc.map.nodes[0].id, d.EVENTS[e].choices);
    }, id);
    await wait(1300);
    const info = await page.evaluate(() => { const a = document.querySelector('.mw-art'); const r = document.querySelector('.mw-win')?.getBoundingClientRect(); const c = [...document.querySelectorAll('.mw-card')].map((x) => x.getBoundingClientRect()); return { art: a?.style.backgroundImage.slice(0, 40), h: a?.getBoundingClientRect().height, winB: r?.bottom, cardB: Math.max(0, ...c.map((x) => x.bottom)), vh: innerHeight }; });
    console.log(id, JSON.stringify(info));
    await shot(`olay-${id}`);
  }
  await page.evaluate(() => document.querySelectorAll('.mw').forEach((x) => x.remove()));
  // düğüm kartı: iki başlık (tek / iki satır) -> ölçüm
  for (const [nm, tag] of [['The Old Mole', 'tek'], ['The Drowned Cathedral', 'iki']]) {
    await page.evaluate(async (name) => {
      const sc = window.__game.scene.getScene('CampaignMapScene');
      const n = sc.map.nodes.find((x) => x.type === 'battle');
      const old = n.name; n.name = name;
      sc.closeModal?.();
      sc.nodeCard(n.id, { foes: [], onGo: () => {} });
      n.name = old;
    }, nm);
    await wait(1200);
    const m = await page.evaluate((nofit) => { const hd = document.querySelector('.nc-head'); const t = hd.querySelector('.sbc-t'); if (nofit) t.style.width = ''; const r = document.createRange(); r.selectNodeContents(t); const rc = [...r.getClientRects()]; const tx0 = Math.min(...rc.map((x) => x.left)), tx1 = Math.max(...rc.map((x) => x.right)); const rl = hd.querySelectorAll('.rl'); const L = rl[0].getBoundingClientRect(), R = rl[1].getBoundingClientRect(); return { lines: new Set(rc.map((x) => Math.round(x.top))).size, gapL: Math.round(tx0 - L.right), gapR: Math.round(R.left - tx1), titleW: Math.round(t.getBoundingClientRect().width) }; }, !!process.env.NOFIT);
    console.log('kart', tag, JSON.stringify(m));
    await shot(`kart-${tag}`);
  }
};
