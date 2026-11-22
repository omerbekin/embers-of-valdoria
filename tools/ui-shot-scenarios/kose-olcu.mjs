// Köşe süsü mockup'ı için gerçek bileşen boyları (gerçek CSS pikseli): skill plakası ikonu, olay penceresi paneli, skill ipucu. Kullanım: ui-shot.mjs kose-olcu.mjs --view 844x390,1920x1080
import { startCampaign } from './_lib.mjs';
const rect = (el) => (el ? (() => { const r = el.getBoundingClientRect(); return `${Math.round(r.width * 10) / 10}x${Math.round(r.height * 10) / 10}`; })() : 'yok');
export default async ({ page, shot, wait, view }) => {
  await page.addStyleTag({ content: '.debug-toggle{display:none!important}' });
  await startCampaign(page, wait, { idx: 0 });
  await page.evaluate(async () => {
    const d = await import('/src/campaign/data.ts');
    const sc = window.__game.scene.getScene('CampaignMapScene');
    document.querySelectorAll('.mw').forEach((x) => x.remove());
    const ch = d.EVENTS['dr_guild_hall'].choices ?? [];
    sc.choiceEvent('dr_guild_hall', sc.map.nodes[0].id, ch);
  });
  await wait(1500);
  const ev = await page.evaluate(() => { const r = (el) => { if (!el) return 'yok'; const b = el.getBoundingClientRect(); return `${b.width.toFixed(1)}x${b.height.toFixed(1)}`; }; return { panel: r(document.querySelector('.mw-panel')), gu: getComputedStyle(document.documentElement).getPropertyValue('--gu') }; });
  const evd = await page.evaluate(() => { const c = document.querySelector('.mw-corner'); const p = document.querySelector('.mw-panel'); return { corner: c ? c.getBoundingClientRect().width.toFixed(2) : 'yok', panelW: p ? p.getBoundingClientRect().width.toFixed(1) : 'yok', cornerCss: c ? getComputedStyle(c).width : '' }; });
  console.log(view, 'olay', JSON.stringify(ev), 'karo', JSON.stringify(evd));
  await shot('olcu-olay');
  await page.evaluate(() => document.querySelectorAll('.mw').forEach((x) => x.remove()));
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
  await wait(7000);
  await page.evaluate(() => document.querySelectorAll('button').forEach((b) => { if (b.textContent === 'DEBUG') b.style.display = 'none'; }));
  const plate = await page.evaluate(() => { const r = (el) => { if (!el) return 'yok'; const b = el.getBoundingClientRect(); return `${b.width.toFixed(1)}x${b.height.toFixed(1)}`; }; const bp = document.querySelector('.bh-skills .bp:not(.pas)'); const ico = bp?.querySelector('.bp-ico'); const pw = ico ? getComputedStyle(ico, '::before').width : ''; return { dia: pw, bpIco: r(ico), bp: r(bp), pframe: r(document.querySelector('.bh-pframe')), root: document.querySelector('.bh-root')?.getAttribute('style') }; });
  console.log(view, 'plaka', JSON.stringify(plate));
  const bp = page.locator('.bh-skills .bp:not(.pas)').first();
  await bp.hover({ timeout: 5000 }).catch(() => {});
  await wait(900);
  const tip = await page.evaluate(() => { const r = (el) => { if (!el) return 'yok'; const b = el.getBoundingClientRect(); return `${b.width.toFixed(1)}x${b.height.toFixed(1)}`; }; const bt = [...document.querySelectorAll('.bh-sktip .bt')].find((e) => e.getBoundingClientRect().width > 0); return { diaBt: bt ? getComputedStyle(bt, '::before').width : '', tipBt: r([...document.querySelectorAll('.bh-sktip .bt')].find((e) => e.getBoundingClientRect().width > 0)) }; });
  console.log(view, 'ipucu', JSON.stringify(tip));
  await shot('olcu-ipucu');
};
