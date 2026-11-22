// Doğrulama turu yardımcıları: gerçek akış (önceki düğüme ışınlan, hedef düğüme FARE ile dokun, kartın düğmesine bas, yürüyüş, olay penceresi).
import { startCampaign, dismiss, closeLoot } from './_lib.mjs';
export const HIDE = '.debug-toggle,#debug-toggle,.debug-fab,[class*="debug-btn"],#debug-root>button{display:none!important}';
/** kind: 'v' (Harita 1) | 'dr' | 'hc'. Hedefin bir öncesindeki düğüme ışınlar, bekleyen adımları çözer (adım = move). */
export async function jumpBefore(page, wait, kind, target) {
  for (let i = 0; i < 20; i++) { if (await page.evaluate(async () => !!(await import('/src/game/campaign-session.ts')).current())) break; await wait(500); }
  const info = await page.evaluate(async ([k, t]) => {
    const cs = await import('/src/game/campaign-session.ts');
    const md = await import('/src/campaign/maps23-debug.ts');
    const c = await import('/src/campaign/index.ts');
    const st = await import('/src/campaign/state.ts');
    const fl = await import('/src/ui/maps23-flag.ts');
    if (k !== 'v') { c.setMapOverride(c.DROWNED_REACH, true); c.setMapOverride(c.HOLLOW_CROWN, true); fl.setMaps23(true); }
    const id = k === 'v' ? 'valdoria' : k === 'dr' ? 'drowned-reach' : 'hollow-crown';
    const map = c.getMap(id);
    const route = st.pathTo(map, t);
    const pred = route[route.length - 2];
    let s = cs.current();
    s = k === 'v' ? st.debugTeleport(s, pred) : k === 'dr' ? md.debugJumpNode(s, pred) : md.debugJumpHollowNode(s, pred);
    for (let i = 0; i < 12 && !['move', 'complete'].includes(st.nextStep(s).kind); i++) s = st.autoResolve(s, st.nextStep(s));
    cs.setState(s);
    window.__game.scene.getScene('CampaignMapScene').scene.start('CampaignMapScene');
    return { pred, step: st.nextStep(s).kind, at: s.at };
  }, [kind, target]);
  await wait(3500);
  await dismiss(page, wait);
  await closeLoot(page, wait);
  await wait(800);
  return info;
}
/** Düğümün ekran noktası (görünüm penceresi pikseli). */
export const nodePoint = (page, id) => page.evaluate((i) => {
  const sc = window.__game.scene.getScene('CampaignMapScene');
  const root = document.getElementById('ui-root');
  const p = sc.worldCssPoint(sc.P(i), root);
  const r = root.parentElement.getBoundingClientRect();
  return p ? { x: r.left + p.x, y: r.top + p.y } : null;
}, id);
export async function tapNode(page, wait, id) {
  const p = await nodePoint(page, id);
  if (!p) return null;
  await page.mouse.click(p.x, p.y);
  await wait(900);
  return p;
}
/** Kart düğmesine bas (gerçek tıklama). */
export async function pressCard(page, wait) {
  const b = page.locator('.sbc-acts button').first();
  const n = await b.count();
  if (!n) return false;
  await b.click({ timeout: 5000 }).catch(() => {});
  return true;
}
export const winState = (page) => page.evaluate(() => {
  const w = document.querySelector('.mw-win');
  const t = (s) => document.querySelector(s)?.textContent ?? null;
  return {
    wins: document.querySelectorAll('.mw-win').length,
    title: t('.mw-t'),
    tags: [...document.querySelectorAll('.mw-tags .mw-chip')].map((c) => c.textContent),
    medal: !!document.querySelector('.mw-medal'),
    art: document.querySelector('.mw-art')?.style.backgroundImage.slice(0, 80) ?? null,
    labels: [...document.querySelectorAll('.mw-win .el-btn, .mw-win [data-act]')].map((b) => b.textContent.trim()),
    plates: [...document.querySelectorAll('.mw-plate')].map((p) => (p.querySelector('.mw-ptag')?.textContent ?? '') + '|' + (p.querySelector('.mw-pnm')?.textContent ?? '')),
    chips: [...document.querySelectorAll('.mw-chip')].map((c) => c.textContent),
    x: !!document.querySelector('.nav-close, [aria-label="Close"]'),
    card: !!document.querySelector('.sbc-card'),
  };
});
export const stepNow = (page) => page.evaluate(async () => { const st = await import('/src/campaign/state.ts'); const sc = window.__game.scene.getScene('CampaignMapScene'); return { step: st.nextStep(sc.s).kind, at: sc.s.at, walking: !!sc.walking }; });
export { startCampaign };
