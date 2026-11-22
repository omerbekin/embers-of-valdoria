// Gear başlık / ana stat işareti / alttan uyarı barı / ağaç düğüm ipucu (Ömer 2026-11-21).
import { dbg, tutorialsOff } from './_lib.mjs';
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: '.debug-toggle{display:none!important}' });
  await dbg(page, 'campaign.solo-valdren');
  await wait(3000);
  await page.evaluate(() => { document.querySelectorAll('[aria-label="Skip"]').forEach((b) => b.click()); });
  await wait(1500);
  await dbg(page, 'campaign.level-5');
  await wait(3000);
  await page.addStyleTag({ content: '.debug-toggle{display:none!important}' });
  await tutorialsOff(page);
  await dbg(page, 'maps23.boons.all');
  await wait(1500);
  await dbg(page, 'campaign.tree-tab');
  await dbg(page, 'campaign.gear');
  await wait(2500);
  await shot('1-hero-baslik');
  const m = await page.evaluate(() => {
    const t = document.querySelector('.gr-lhead > .gr-title'); const p = document.querySelector('.gr-gear.gr-ledger'); const b = document.querySelector('.gr-boons');
    const r = (e) => e && e.getBoundingClientRect();
    const tr = r(t), pr = r(p), tabs = r(document.querySelector('.gr-headtabs')), br = r(b);
    return { titleCenter: tr.left + tr.width / 2, panelCenter: pr.left + pr.width / 2, titleL: tr.left, titleR: tr.right, tabsR: tabs?.right, boonsL: br?.left, boonsH: br?.height, boonsIcon: b?.querySelector('img')?.getBoundingClientRect().width, bagIcon: document.querySelector('.gr-sec .gr-ui-ico')?.getBoundingClientRect().width };
  });
  console.log(view, JSON.stringify(m), 'fark', (m.titleCenter - m.panelCenter).toFixed(1));
  const before = await page.evaluate(() => { const st = document.createElement('style'); st.id = 'tmp-before'; st.textContent = '.gr-ledger > .gr-lhead:has(.gr-headtabs) > .gr-title{position:static!important;transform:none!important;width:auto!important;grid-column:2!important;margin:0!important}'; document.head.append(st); const t = document.querySelector('.gr-lhead > .gr-title').getBoundingClientRect(); const p = document.querySelector('.gr-gear.gr-ledger').getBoundingClientRect(); const d = (t.left + t.width / 2) - (p.left + p.width / 2); st.remove(); return d; });
  console.log(view, 'ESKI fark', before.toFixed(1));
  await page.locator('.gr-tab').nth(1).click({ timeout: 8000 }).catch((e) => console.log('sekme', e.message.split('\n')[0]));
  await wait(1500);
  await shot('2-sheet-ana-stat');
  await page.evaluate(async () => {
    const m = await import('/src/ui/bottom-warn.ts');
    m.showBottomWarn(document.querySelector('.gr-gear.gr-ledger'), 'Warrior cannot use this item.', { ms: 60000 });
  });
  await wait(600);
  await shot('3-uyari-bari');
  await page.locator('.gr-tab').nth(2).click({ timeout: 8000 }).catch((e) => console.log('agac', e.message.split('\n')[0]));
  await wait(1500);
  await shot('4-agac');
  const info = await page.evaluate(() => [...document.querySelectorAll('[data-tt]')].slice(0, 40).map((e) => e.className.split(' ').join('.')));
  console.log(JSON.stringify(info.slice(0, 12)));
  const n = page.locator('[data-tt].gt-nd.st-av').first();
  await n.hover({ timeout: 5000 }).catch((e) => console.log('hover', e.message.slice(0, 80)));
  await wait(800);
  await shot('5-dugum-ipucu');
};
