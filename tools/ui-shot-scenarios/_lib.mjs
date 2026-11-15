// Senaryo ortak yardımcıları. Kullanım: import { dbg, scene, openMap } from './_lib.mjs'
export const dbg = (page, id) => page.evaluate((i) => window.__dbgRun(i), id);
/** Sahne nesnesi üzerinde fonksiyon çalıştırır: scene(page, 'CampaignMapScene', (sc, arg) => ..., arg). */
export const scene = (page, key, fn, arg) =>
  page.evaluate(([k, src, a]) => { const sc = window.__game.scene.getScene(k); return new Function('sc', 'a', 'return (' + src + ')(sc, a)')(sc, a); }, [key, fn.toString(), arg]);
/** Açılış sinematiğini (Esc + Enter) ve açık ders / diyalog kutularını kapatır. */
export async function dismiss(page, wait) {
  for (let i = 0; i < 8; i++) {
    const hit = await page.evaluate(() => {
      const b = document.querySelector('.cin-end-go') ?? document.querySelector('[aria-label="Skip"]');
      if (b) { b.click(); return true; }
      return false;
    });
    if (!hit) break;
    await wait(1500);
  }
  await page.evaluate(() => document.querySelectorAll('.lesson-box .lb-x, .lesson-box button').forEach((b) => b.click()));
}
export async function openMap(page, wait) {
  await dbg(page, 'campaign.open');
  await wait(2500);
  await dismiss(page, wait);
  await wait(1500);
}
/** Yeni sefer: sinematik atlanır, kahraman seçilir (idx), yolculuk başlar; harita hazır. onPicker(page) = seçici açıkken ek çekim. */
export async function startCampaign(page, wait, { idx = 0, onPicker } = {}) {
  await tutorialsOff(page);
  await dbg(page, 'campaign.open');
  await wait(2500);
  await dismiss(page, wait);
  await wait(1500);
  await page.waitForSelector('.mw-card', { timeout: 25000 }).catch(() => {});
  if (await page.locator('.mw-card').count()) {
    if (onPicker) await onPicker(page);
    for (let i = 0; i < 5; i++) {
      await page.locator('.mw-card').nth(idx).click({ timeout: 8000 }).catch(() => {});
      await wait(700);
      if (await page.locator('.mw-card.sel').count()) break;
    }
    await domClick(page, 'Begin the journey');
    await wait(2500);
    await dismiss(page, wait);
  }
}
/** DOM'da görünen metni verilen düğmeye JS ile basar (üstünü örten katmana takılmaz). */
export const domClick = (page, text) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button, .el-btn, [role=button]')].find((x) => x.textContent.trim().toLowerCase() === t.toLowerCase() && !x.disabled);
    if (b) b.click();
    return !!b;
  }, text);
/** Ders kutusu "Got it" ve ganimet ekranı "Done" düğmelerine basar (varsa). */
export async function closeLoot(page, wait) {
  for (const t of ['Got it', 'Take all', 'Done', 'Leave', 'Got it']) {
    if (await domClick(page, t)) await wait(900);
  }
}
/** Haritadaki düğümde ganimet verir ve ganimet ekranını açar. rarity: 'rare' | 'epic' | 'legendary' (yoksa zar). */
export async function giveLoot(page, rarity) {
  await page.evaluate(async (rar) => {
    const cs = await import('/src/game/campaign-session.ts');
    const c = await import('/src/campaign/index.ts');
    const s = JSON.parse(JSON.stringify(cs.current()));
    c.grantLoot(s, s.at, 'elite', c.activeHeroes(s), rar ? { rarity: rar } : undefined);
    sessionStorage.removeItem('eov.chestPlayed');
    cs.setState(s);
    window.__game.scene.getScene('CampaignMapScene').scene.start('CampaignMapScene');
  }, rarity ?? null);
}
/** Mentor ders kutularını kapatır (haritada animasyonların üstünü örtmesin). */
export const tutorialsOff = (page) => page.evaluate(async () => { const m = await import('/src/tutorial/store.ts'); m.setTutorialsOn(false); });

/** Gerçek sefer akışı: kaydı hedef düğüme ışınlar (debugTeleport = debug menüsündeki "Teleport to stop"), haritayı açar, savaşı haritanın kendi launchBattle'ıyla başlatır. */
export async function battleAt(page, wait, nodeId, { hero, ensure, settle = 6000 } = {}) {
  // Kayıt yoksa (taze tarayıcı) önce kahraman seçilip sefer başlatılır; kayıt varsa startCampaign yalnız haritayı açar
  await startCampaign(page, wait);
  await page.evaluate(async ([id, h, ens]) => {
    const cs = await import('/src/game/campaign-session.ts');
    const st = await import('/src/campaign/state.ts');
    let t = st.debugTeleport(cs.current(), id, h);
    if (ens) t = st.debugEnsureClass(t, ens); // debug menüsündeki görev atlamasının sınıf ekleme yolu
    cs.setState(t);
    window.__game.scene.getScene('CampaignMapScene').scene.start('CampaignMapScene');
  }, [nodeId, hero ?? null, ensure ?? null]);
  await wait(3500);
  await dismiss(page, wait);
  await page.evaluate(() => window.__game.scene.getScene('CampaignMapScene').launchBattle());
  await wait(settle);
  // yavaş makinede savaş sahnesi geç kurulabilir: birim görünümleri gelene kadar bekle
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => (window.__game.scene.getScene('BattleScene')?.views?.size ?? 0) > 0)) break; await wait(300); }
}
/** CombatantView.emberDeath'e (boss/elit ölüm kıvılcımı) iz bırakır: window.__death = {t, kind}. */
export const traceDeath = (page) =>
  scene(page, 'BattleScene', (sc) => {
    const v = [...sc.views.values()][0];
    const P = Object.getPrototypeOf(v);
    if (P.__traced) return;
    P.__traced = true;
    const o = P.emberDeath;
    P.emberDeath = function (kind) { window.__death = { t: performance.now(), kind }; return o.call(this, kind); };
  });
export const waitFor = async (page, wait, fn, ms = 60000, step = 60) => {
  for (let t = 0; t < ms; t += step) { if (await page.evaluate(fn)) return true; await wait(step); }
  return false;
};
/** Kahramanlar ölemez (motorun undying bayrağı, tutorial savaşındaki gibi): tek vuruşta öldürme açıkken savaş kazanılana kadar sürer. */
export const partyUndying = (page) => scene(page, 'BattleScene', (sc) => { for (const c of sc.battle.combatants) if (c.side !== 'enemy') c.undying = true; });
/** CombatantView metoduna iz bırakır: window.__tr[ad] = çağrı sayısı + son argümanlar. */
export const traceView = (page, method) =>
  scene(page, 'BattleScene', (sc, m) => {
    const P = Object.getPrototypeOf([...sc.views.values()][0]);
    window.__tr = window.__tr || {};
    const k = '__t_' + m;
    if (P[k]) return;
    P[k] = true;
    const o = P[m];
    P[m] = function (...a) { const r = window.__tr[m] || (window.__tr[m] = { n: 0 }); r.n++; r.args = JSON.stringify(a); r.t = performance.now(); return o.apply(this, a); };
  }, method);
export const traceCount = (page, method) => page.evaluate((m) => window.__tr?.[m]?.n ?? 0, method);
/**
 * Boya göre kare alıcı: 16:9 ve telefonda yavaş çekimde `shot.cast`; 21:9'da (1720x720) yalnızca TEK durağan kare
 * (cast'in `pick`. karesi anına denk gelecek kadar bekler). Çıktı adı 21:9'da <ad>-tek-<WxH>.jpg.
 */
export const castV = (shot, wait, view) => async (name, ms, every, pick = 4) => {
  if (view.startsWith('1720')) { await wait(500 * (pick - 1)); await shot(`${name}-tek`); return; }
  await shot.cast(name, ms, every);
};
export const isWide = (view) => view.startsWith('1720');
/** Ana menü Phaser yazısına (Play / Settings / Codex / Quick Battle ...) fare tıklaması: yazıyı bulur, ekrana çevirir, page.mouse ile basar. */
export async function menuClick(page, label) {
  const pt = await page.evaluate((l) => {
    const g = window.__game;
    for (const sc of g.scene.getScenes(true)) {
      const walk = (list) => { for (const o of list) { if (o.type === 'Text' && o.text && o.text.trim().toLowerCase() === l.toLowerCase() && o.visible) return o; if (o.list) { const r = walk(o.list); if (r) return r; } } return null; };
      const o = walk(sc.children.list);
      if (o) {
        const m = o.getWorldTransformMatrix();
        const cam = sc.cameras.main;
        const r = g.canvas.getBoundingClientRect();
        const sx = r.width / g.scale.width, sy = r.height / g.scale.height;
        const wx = m.tx - cam.scrollX, wy = m.ty - cam.scrollY;
        return { x: r.left + (wx - 0) * sx + (o.width * (0.5 - o.originX)) * sx * Math.abs(m.scaleX), y: r.top + wy * sy + (o.height * (0.5 - o.originY)) * sy * Math.abs(m.scaleY) };
      }
    }
    return null;
  }, label);
  if (!pt) return false;
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.click(pt.x, pt.y);
  return true;
}
