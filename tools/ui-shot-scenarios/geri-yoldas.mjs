import { dbg, tutorialsOff } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await tutorialsOff(page);
  await dbg(page, 'campaign.open');
  await wait(3000);
  await page.evaluate(async () => {
    const st = await import('/src/campaign/state.ts');
    const sc = window.__game.scene.getScene('CampaignMapScene');
    const ids = st.companyChoices(sc.s);
    sc.closeModal?.();
    sc.companionWindow(ids, { heroes: ids.slice(3, 6) });
  });
  await wait(1500);
  await shot('c1-top');
  await page.evaluate(() => { const c = document.querySelector('.hp-list, .mw-cards'); if (c) c.scrollTop = 99999; });
  await wait(300);
  await shot('c2-listscroll');
  await page.locator('.mw-card').nth(1).click({ timeout: 5000 }).catch(() => {});
  await page.evaluate(() => { const d = document.querySelector('.hp-detail'); if (d) d.scrollTop = 99999; });
  await wait(500);
  await shot('c3-detailbottom');
  console.log(JSON.stringify(await page.evaluate(() => { const r = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; }; return { panel: r('.mw-panel'), split: r('.hp-split'), act: r('.mw-acts'), vp: [innerWidth, innerHeight] }; })));
};
