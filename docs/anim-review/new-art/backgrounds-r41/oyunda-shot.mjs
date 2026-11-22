// r41 arka plan: bir sefer düğümünün savaşının gerçek görüntüsü (varsayılan düğüm 12, Castle Morvane). Dosya değiştirmez.
// NODE=<düğüm kimliği> hangi düğümün savaşı açılsın (Harita 1: '12', 'head'; Harita 2: 'dr68'; Harita 3: 'hc3'...); SHOT_NAME=<ad> çıktı adı (varsayılan oyunda).
// Kullanım (kendi dev sunucunla, ör. npx vite --port 5231 --strictPort):
//   node tools/ui-shot.mjs docs/anim-review/new-art/backgrounds-r41/oyunda-shot.mjs --url http://localhost:5231 --out <klasör> --view 1920x1080,844x390
// Yeni arka planı denemek için (bellekte o savaşın bugünkü arka plan dokusunun yerine geçer, yalnız bu sekmede):
//   BG_FILE=<1536x1024 png/jpg yolu> BG_FLOOR=<zemin çizgisi y kesri, ör. 0.586> node tools/ui-shot.mjs ...
// KIND=dr|hc: NODE Harita 2 / 3 düğümü (ör. KIND=dr NODE=dr63).
// Çıktı: oyunda-<WxH>.jpg
import { readFileSync } from 'node:fs';
import { domClick, startCampaign, battleAt, closeLoot, dbg, dismiss, partyUndying, scene, waitFor } from '../../../../tools/ui-shot-scenarios/_lib.mjs';

export default async ({ page, shot, wait }) => {
  if (process.env.KIND === 'dr' || process.env.KIND === 'hc') {
    // Harita 2 / 3 düğümü (KIND=dr|hc): doğrudan o düğüme ışınlan, savaşı başlat
    await startCampaign(page, wait);
    await page.evaluate(async ([k, id]) => {
      const cs = await import('/src/game/campaign-session.ts');
      const md = await import('/src/campaign/maps23-debug.ts');
      const c = await import('/src/campaign/index.ts');
      const fl = await import('/src/ui/maps23-flag.ts');
      c.setMapOverride(c.DROWNED_REACH, true); c.setMapOverride(c.HOLLOW_CROWN, true); fl.setMaps23(true);
      cs.setState(k === 'dr' ? md.debugJumpNode(cs.current(), id) : md.debugJumpHollowNode(cs.current(), id));
      window.__game.scene.getScene('CampaignMapScene').scene.start('CampaignMapScene');
    }, [process.env.KIND, process.env.NODE]);
    await wait(3500);
    await dismiss(page, wait);
    await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
    await wait(7000);
    for (let i = 0; i < 100; i++) { if (await page.evaluate(() => (window.__game.scene.getScene('BattleScene')?.views?.size ?? 0) > 0)) break; await wait(300); }
  } else await battleAt(page, wait, process.env.NODE ?? '12', { settle: 7000 });
  // Işınlanınca bekleyen ganimet penceresi savaşı açtırmayabilir: kapat, savaşı yeniden başlat, sinematiği atla
  for (let i = 0; i < 4; i++) {
    if (await page.evaluate(() => window.__game.scene.isActive('BattleScene'))) break;
    await closeLoot(page, wait);
    await dismiss(page, wait);
    await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
    await wait(4000);
    await dismiss(page, wait);
    await wait(4000);
  }
  const file = process.env.BG_FILE;
  if (file) {
    const ext = file.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    const data = `data:image/${ext};base64,${readFileSync(file).toString('base64')}`;
    await page.evaluate(async ([src, floor]) => {
      const layout = (await import('/data/battle-layout.json?import')).default;
      const sc = window.__game.scene.getScene('BattleScene');
      const id = sc.backgroundId;
      if (floor) layout.backgrounds.floor[id] = Number(floor);
      const img = new Image();
      await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = src; });
      sc.bgImage?.destroy();
      sc.bgImage = undefined;
      if (sc.textures.exists(`bg:${id}`)) sc.textures.remove(`bg:${id}`);
      sc.textures.addImage(`bg:${id}`, img);
      sc.debugSetBackground(id);
    }, [data, process.env.BG_FLOOR ?? '']);
    await wait(800);
  }
  // Giriş bandı bitip birimler sahneye girene kadar bekle (yavaş makinede süre değişir)
  await waitFor(page, wait, () => { const v = [...(window.__game.scene.getScene('BattleScene').views?.values() ?? [])]; return v.length > 0 && v.every((x) => x.container.visible && x.container.alpha >= 0.99); }, 40000, 300);
  await wait(900);
  // Savaşın üstünde ganimet penceresi kaldıysa kapat (onay kutusu: Leave; sonra Take all > Done)
  for (let i = 0; i < 3; i++) {
    const open = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /^(take all|done|leave)$/i.test(b.textContent.trim())));
    if (!open) break;
    for (const t of ['Leave', 'Take all', 'Done', 'Leave']) { if (await domClick(page, t)) await wait(700); }
  }
  // BG_ID=<kimlik>: bağlı arka planı bu savaşta doğrudan göster (düğümü o arka planı kullanmasa da zemin oturumunu görmek için)
  if (process.env.BG_ID) {
    await page.evaluate(async (id) => {
      const sc = window.__game.scene.getScene('BattleScene');
      if (!sc.textures.exists(`bg:${id}`)) { // savaş yalnız kendi arka planını yükler: bağlı webp'yi doğrudan ekle
        const img = new Image();
        await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = `/assets/backgrounds/${id}.webp`; });
        sc.textures.addImage(`bg:${id}`, img);
      }
      sc.debugSetBackground(id);
    }, process.env.BG_ID);
    await wait(800);
  }
  // Varsayılan: 1. dalga (Sworn Guard x2 + Ember Hierophant). Lord Morvane son dalgada gelir; BOSS=1 ile dalgalar otomatik
  // geçilmeye çalışılır (DENEYSEL: 2026-11-21 denemesinde boss karesi yakalanamadı, tahta boş ya da 2. dalgada kaldı)
  await wait(Number(process.env.BG_WAIT ?? 3500));
  if (process.env.BOSS === '1') {
    await dbg(page, 'tweak.damage-ohk'); await dbg(page, 'tweak.damage-ohk');
    await partyUndying(page);
    await dbg(page, 'battle.autoplay');
    const boss = await waitFor(page, wait, () => !!window.__game.scene.getScene('BattleScene').battle?.combatants.find((c) => c.tier === 'boss' && c.hp > 0), 240000, 200);
    await dbg(page, 'battle.autoplay');
    console.log('boss sahnede', boss);
    await wait(6000);
  }
  console.log('arka plan', await scene(page, 'BattleScene', (sc) => sc.backgroundId), await scene(page, 'BattleScene', (sc) => sc.battle.combatants.map((c) => c.name + ':' + c.side).join(', ')));
  await shot(process.env.SHOT_NAME ?? 'oyunda');
};
