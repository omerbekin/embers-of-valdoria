// Oyunda skill şeridi (Redtithe poz seti v1): Redtithe skill'lerini debugCastSkill ile gerçek savaş hattında oynatır, 120 ms arayla kare alır.
// Kullanım: node capture-skills.mjs <url> <klasör> skill|@hit|@passive ...  (EVERY = kare arası 1/60 sn adım, SHOTS = kare sayısı,
// ALLY = dost warrior'un hücresi; boşsa Redtithe tek başına; ENEMY2 = ikinci düşmanın hücresi; DODGE=1 = her vuruş kaçınılır; AIM = hedef hücre; FOE = ilk düşmanın id'si, varsayılan stonebound_warden)
// (kaynak) Oyunda poz çekimi (Redtithe poz seti v1): verilen her kareyi oyunun kendi BattleScene'inde, oyunun taktığı silahla gösterir.
// İki elli kareler (idle2, step2, slash2, overhead2, thrust2, spin2*, guard2) için oyunun iki el silahı (greataxes/dane) takılır.
// Kullanım: ZOOM=2 CY=110 node capture-poses.mjs <url> <klasör> poz ...
// (eski başlık) Oyunda kontrol (Redtithe step1 v4): oyunun kendi BattleScene'inde (test modu, sessiz) Redtithe oyuncu tarafında, kukla karşısında.
// Döngü durur; idle1 karesi alınır, sonra view.showPose('step') (koşarken gösterilen poz, combatant-view.ts) ile adım pozuna geçilir ve
// 1/60 sn adımlarla ilerletilir (yumuşak geçişin hayalet karesi dahil). Her adımda birimin çevresi kırpılarak kaydedilir.
// Kullanım: node capture.mjs <url> <çıktı klasörü>   (geliştirme sunucusu açık olmalı)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const [URL0, OUT, ...SKILLS] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const DT = 1000 / 60;
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.addInitScript(() => {
  localStorage.setItem('eov.settings.v1', JSON.stringify({ volume: 0, steps: 20 }));
  localStorage.setItem('eov.diag.v1', JSON.stringify({ consent: false, noticed: true }));
  const realNow = Date.now.bind(Date);
  Date.now = () => (window.__vdate === undefined ? realNow() : window.__vdate);
});
await page.goto(`${URL0}/?debug=1`, { timeout: 120000 });
await page.waitForFunction(() => window.__game?.scene?.getScenes(true).length > 0, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(async ([ALLY, ENEMY2, DODGE, AIM, FOE]) => {
  window.__dodge = !!DODGE;
  window.__aim = AIM;
  const content = await import('/src/engine/content.ts');
  const { BattleScene } = await import('/src/game/scenes/BattleScene.ts');
  const cells = (units) => Array.from({ length: content.CELL_COUNT }, (_, i) => units.find(([s]) => s === i)?.[1] ?? '');
  window.__seed = 4242;
  const data = { seed: 4242, mode: 'test', teams: { party: cells([[1, 'antimage'], ...(ALLY ? [[Number(ALLY), 'warrior']] : [])]), enemies: cells([[1, FOE || 'stonebound_warden'], ...(ENEMY2 ? [[Number(ENEMY2), 'stonebound_warden']] : [])]) }, partySize: ALLY ? 2 : 1, enemySize: ENEMY2 ? 2 : 1, background: 'ashen-plain' };
  window.__game.scene.getScenes(true)[0]?.scene.start(BattleScene.KEY, data);
}, [process.env.ALLY ?? '', process.env.ENEMY2 ?? '', process.env.DODGE ?? '', process.env.AIM ?? '', process.env.FOE ?? '']);
await page.waitForFunction(() => { const sc = window.__game.scene.getScene('BattleScene'); return !!sc && window.__game.scene.isActive('BattleScene') && sc.views?.get('party-0'); }, null, { timeout: 30000 });
await page.waitForTimeout(3000);
// Oyun döngüsü durdurulur, sanal zamanla 1/60 sn adımlanır (kare aralığı sabit, ekran görüntüsü süresinden bağımsız).
await page.evaluate(() => { window.__game.loop.sleep(); window.__capT = performance.now(); window.__vdate = Date.now(); });
const stepN = (n) => page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { window.__capT += dt; window.__vdate += dt; window.__game.step(window.__capT, dt); } }, [n, DT]);
const clip = { x: 520, y: 470, width: 880, height: 440 };
const EVERY = Number(process.env.EVERY ?? 6), SHOTS = Number(process.env.SHOTS ?? 24);
for (const s of SKILLS) {
  // '@hit': Redtithe darbe alır (view.play('hit'): darbe pozu + parlama; hit v2 şeridi), başka ad = skill
  // '@passive': Blood Tithe pasif olay efekti (sıra öne kaydı; normalde düşman MP'li skill atınca), doğrudan runEventFx ile
  const r = s === '@hit'
    ? await page.evaluate(() => { window.__game.scene.getScene('BattleScene').views.get('party-0').play('hit'); return null; })
    : s === '@passive'
      ? await page.evaluate(() => { const sc = window.__game.scene.getScene('BattleScene'); const v = sc.views.get('party-0'); void sc.runEventFx('antimage', 'passive_spellbreaker_instinct', { actor: v, targets: [v], event: { type: 'passive' } }); return null; })
      : await page.evaluate((s) => { const sc = window.__game.scene.getScene('BattleScene'); const me = sc.battle.living('party').find((x) => x.slot === 1) /* Redtithe hep 1. hücrede */; if (me) sc.galleryCaster = me.uid; if (window.__dodge) sc.battle.debug.dodge = 'always'; if (window.__aim !== '') sc.galleryCell = Number(window.__aim); return sc.debugCastSkill(s); }, s);
  if (r) console.log(s, 'hata', r);
  for (let i = 0; i < SHOTS; i++) { await stepN(EVERY); writeFileSync(`${OUT}/${s}-${String(i).padStart(2, '0')}.png`, await page.screenshot({ clip })); }
  await stepN(240);
  const log = await page.evaluate(() => globalThis.__sfxLog ?? null); // ses olay sırası (yalnız kaynakta geçici günlük varsa)
  if (log) console.log(s, 'sfx', JSON.stringify(log));
  console.log(s, 'tamam');
}
await b.close();
