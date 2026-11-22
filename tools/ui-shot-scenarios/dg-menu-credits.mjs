// Ana menü Credits satırı + jenerik tüm sayfalar (otomatik ilerleme, tıklamasız; kare arası sürelerden bağımsız okuma).
import { HIDE, } from './_dg.mjs';
import { menuClick, dbg } from './_lib.mjs';
export default async ({ page, shot, wait }) => {
  await page.addStyleTag({ content: HIDE });
  await wait(2500);
  await shot('menu-ana');
  console.log('menü yazıları', JSON.stringify(await page.evaluate(() => { const out = []; for (const sc of window.__game.scene.getScenes(true)) { const walk = (l) => { for (const o of l) { if (o.type === 'Text' && o.text && o.visible) out.push(o.text.trim()); if (o.list) walk(o.list); } }; walk(sc.children.list); } return out.slice(0, 30); })));
  const ok = await menuClick(page, 'Credits');
  console.log('Credits tıklandı', ok);
  await wait(1200);
  const pages = [];
  for (let t = 0; t < 40 && await page.locator('.crd').count(); t++) {
    const txt = await page.locator('.crd-page').innerText().catch(() => '');
    if (txt && txt !== pages[pages.length - 1]) { pages.push(txt); await shot(`menu-jenerik${pages.length - 1}`); }
    await wait(700);
  }
  console.log('sayfa sayısı', pages.length, JSON.stringify(pages.map((p) => p.replace(/\n+/g, ' / '))));
  console.log('jenerik kapandı', !(await page.locator('.crd').count()));
};
