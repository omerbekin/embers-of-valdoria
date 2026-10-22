import { afterEach, describe, expect, it } from 'vitest';
import { classes } from '../src/engine/content';
import { TREE_RESET_NOTICE, TREE_RULES, autoTreePlan, compileTree, debugFocusAlloc, heroRespecCost, setDebugTreeFocus, treeOf, treeSetupFor } from '../src/progression';
import { focusBuild, respecCost, spent, validate, type TreeAlloc } from '../src/progression/skill-tree';
import { setLevel } from '../src/progression/levels';
import {
  PAUSED_LOCK,
  SAVE_KEY,
  SAVE_VERSION,
  autoTreeAll,
  battleForPlan,
  battlePlan,
  canResume,
  debugSetLevel,
  debugTeleport,
  heroTreeBlocked,
  latestSave,
  memoryKV,
  migrateSaves,
  newCampaign,
  nextStep,
  pauseRecord,
  pickHero,
  readSaves,
  respecHeroTree,
  respecTreeBlocked,
  resumeKey,
  setHeroTree,
  withSuspended,
  type CampaignState,
  type Hero,
} from '../src/campaign';
import {
  SAVE_VERSION as RUN_VERSION,
  autoTreeRun,
  debugRunLevel,
  newRun,
  parseRun,
  planKey,
  respecRunBlocked,
  respecRunHeroTree,
  runTreeBlocked,
  setRunHeroTree,
  wavePlan,
  type EndlessHero,
  type EndlessRun,
} from '../src/endless';
import { leveledRun } from './level-helpers';

// Skill ağacı Faz 1b: KAYIT (docs/design/skill-tree-implementation.md 3.3 + 10a): kahraman `tree` alanı, sürüm 12 / 7, okumada onarım,
// setLevel sıfırlaması, saf durum fonksiyonları, respec (altın + bir kez bedava), savaş anahtarları.

const W = treeOf('warrior')!;
const D = treeOf('defender')!;
/** Ağaç verisi olmayan bir class (puanlar birikir; tree alanına dokunulmaz). */
const NO_TREE = Object.keys(classes).find((c) => !treeOf(c))!;
/** Warrior odaklı kurulum (Double Strike + Whirlwind, ult u). */
const wb = (lv: number): TreeAlloc => focusBuild(W, [1, 2], lv, { ult: 'u' });

/** Sefer: '5A' savaş düğümünde, ilk kahraman Warrior, herkes `level`'da (puanlar harcanmamış; debugSetLevel). */
function camp(level = 20): { s: CampaignState; id: string } {
  const s0 = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 21, slot: 0, campaignId: 'c-tree' }), 'warrior'), '5A');
  const id = s0.active.find(Boolean)!;
  const s = debugSetLevel({ ...s0, roster: s0.roster.map((h) => (h.id === id ? { ...h, class: 'warrior' } : h)) }, level);
  return { s, id };
}
const hero = (s: CampaignState, id: string): Hero => s.roster.find((h) => h.id === id)!;
const withHero = (s: CampaignState, id: string, patch: Partial<Hero>): CampaignState => ({ ...s, roster: s.roster.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
/** Tek yuvalı, tek kayıtlı sefer dosyası (sürüm `version`). */
const file = (s: CampaignState, version: number): string =>
  JSON.stringify({ version, counter: 1, lastSlot: 0, slots: [{ campaignId: s.campaignId, mode: s.mode, difficulty: s.difficulty, startedAt: 'x', lastPlayed: 'x', saves: [{ id: 's1', kind: 'auto', savedAt: 'x', mode: s.mode, campaignId: s.campaignId, summary: {}, state: s }] }] });
/** Durumu kayıt dosyasına yazıp geri okur (okuma onarımı: normalizeState > normalizeTree). */
function load(s: CampaignState, version = SAVE_VERSION): CampaignState {
  const kv = memoryKV();
  kv.setItem(SAVE_KEY, file(s, version));
  return latestSave(kv)!.state;
}
const pool = (lv: number) => lv - 1; // skillPointsPerLevel 1
const runHero = (r: EndlessRun, i: number): EndlessHero => r.heroes[i]!;
const PAUSED = { node: '5A', seed: 1, actions: [], turn: 0, hash: 'x', setup: 'x' };

describe('kayıt sürümü (3.3): göç yok, alan yok = boş ağaç', () => {
  it('sefer v11 kaydı v12\'ye yüklenir: ağaç boş, puanlar aynen; dosya 12 olarak yeniden yazılır', () => {
    expect(SAVE_VERSION).toBe(12);
    const { s } = camp(10);
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, file(s, 11));
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    expect(r.migrated).toBe(true);
    const got = r.file.slots[0]!.saves[0]!.state;
    for (const h of got.roster) expect([h.tree, h.freeRespec, h.treeReset]).toEqual([undefined, undefined, undefined]);
    expect(got.roster.map((h) => [h.level, h.skillPoints, h.statPoints])).toEqual(s.roster.map((h) => [h.level, h.skillPoints, h.statPoints]));
    expect(got.roster.every((h) => h.skillPoints === pool(10))).toBe(true);
    expect(migrateSaves(kv)).toBe(true);
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(12);
    expect(readSaves(kv).migrated).toBe(false);
  });

  it('Endless v6 kaydı v7\'ye yüklenir: ağaç boş, puanlar aynen (koşu birebir aynı)', () => {
    expect(RUN_VERSION).toBe(7);
    const run = leveledRun(newRun(5, ['warrior', 'defender', NO_TREE], 't'), 12);
    const got = parseRun(JSON.stringify({ version: 6, run }))!;
    expect(got).toEqual(run);
    expect(got.heroes.map((h) => [h.tree, h.skillPoints])).toEqual([[undefined, 11], [undefined, 11], [undefined, 11]]);
  });
});

describe('okumada onarım (normalizeTree; idempotent)', () => {
  it('bozuk dağılım (gerek eksik): ağacın tamamı bedava iade + treeReset bayrağı; ikinci okuma aynı', () => {
    const { s, id } = camp(10);
    const got = load(withHero(s, id, { tree: { v: W.version, r: { '1.f2': 2 } }, skillPoints: 7 }));
    expect(hero(got, id).tree).toBeUndefined();
    expect(hero(got, id).treeReset).toBe(true);
    expect(hero(got, id).skillPoints).toBe(pool(10));
    expect(load(got)).toEqual(got);
    expect(TREE_RESET_NOTICE).toBe('Your skill tree was reset after an update. Points refunded.');
  });

  it('ea + eb birlikte kayıtta: tamamı iade + treeReset', () => {
    const { s, id } = camp(25);
    const a = wb(20);
    expect(a.r['1.ea']).toBe(1);
    const bad = { v: W.version, r: { ...a.r, '1.eb': 1 } };
    const got = load(withHero(s, id, { tree: bad, skillPoints: pool(25) - spent(bad) }));
    expect(hero(got, id).tree).toBeUndefined();
    expect(hero(got, id).treeReset).toBe(true);
    expect(hero(got, id).skillPoints).toBe(pool(25));
  });

  it('iki ult kolunda puan (tek kol kuralı, Ömer 2026-10-22; tavan içinde bile): tamamı iade + treeReset; ikinci okuma aynı', () => {
    const { s, id } = camp(20);
    const a = wb(10); // ult u1 + u2 (2 puan)
    expect([a.r['4.u1'], a.r['4.u2']]).toEqual([1, 1]);
    const bad = { v: W.version, r: { ...a.r, '4.r1': 1 } };
    expect(validate(W, 20, bad, { ...TREE_RULES, ult: { ...TREE_RULES.ult, singleArm: false } })).toBeNull(); // yalnızca tek kol kuralı bozuyor
    const got = load(withHero(s, id, { tree: bad, skillPoints: pool(20) - spent(bad) }));
    expect(hero(got, id).tree).toBeUndefined();
    expect(hero(got, id).treeReset).toBe(true);
    expect(hero(got, id).skillPoints).toBe(pool(20));
    expect(load(got)).toEqual(got);
  });

  it('bilinmeyen anahtar atılır, kalan geçerli dağılım kalır (bayrak yok), atılan puan harcanmamışa döner', () => {
    const { s, id } = camp(20);
    const a = wb(10);
    const got = load(withHero(s, id, { tree: { v: W.version, r: { ...a.r, '9.zz': 3, '1.f1': 'x' as unknown as number } }, skillPoints: 0 }));
    const { '1.f1': _f1, ...rest } = a.r;
    // tam sayı olmayan 1.f1 atılınca f2 gereksiz kalır -> dağılım geçersiz -> tamamı iade (repair kuralı)
    expect(Object.keys(rest).length).toBeGreaterThan(0);
    expect(hero(got, id).tree).toBeUndefined();
    expect(hero(got, id).treeReset).toBe(true);
    const ok = load(withHero(s, id, { tree: { v: W.version, r: { ...a.r, '9.zz': 3 } }, skillPoints: 0 }));
    expect(hero(ok, id).tree).toEqual(a);
    expect(hero(ok, id).treeReset).toBeUndefined();
    expect(hero(ok, id).skillPoints).toBe(pool(20) - spent(a));
  });

  it('değişmez kural: skillPoints + harcanan = (level - 1); tutmazsa skillPoints düzeltilir, geçerli dağılım asla silinmez', () => {
    const { s, id } = camp(20);
    const full = wb(20);
    expect(spent(full)).toBe(pool(20));
    const a = load(withHero(s, id, { tree: full, skillPoints: 5 })); // fazla puan -> düşer
    expect(hero(a, id).tree).toEqual(full);
    expect(hero(a, id).skillPoints).toBe(0);
    const half = wb(10);
    const b = load(withHero(s, id, { tree: half, skillPoints: 0 })); // eksik puan -> tamamlanır
    expect(hero(b, id).tree).toEqual(half);
    expect(hero(b, id).skillPoints).toBe(pool(20) - spent(half));
    const c = load(withHero(s, id, { skillPoints: -3 })); // ağaçsız Warrior: havuzun tamamı
    expect(hero(c, id).skillPoints).toBe(pool(20));
    expect(load(b)).toEqual(b);
  });

  it('sürüm farkı (class dosyası version değişti): geçerli ağaç kalır, bir kez bedava respec hakkı (freeRespec); v güncellenir, tekrar verilmez', () => {
    const { s, id } = camp(20);
    const a = wb(10);
    const got = load(withHero(s, id, { tree: { v: W.version + 1, r: a.r }, skillPoints: pool(20) - spent(a) }));
    expect(hero(got, id).tree).toEqual({ v: W.version, r: a.r });
    expect(hero(got, id).freeRespec).toBe(true);
    expect(hero(got, id).treeReset).toBeUndefined();
    expect(load(got)).toEqual(got);
    // hak kullanılınca (bedava respec) bir daha okunsa da geri gelmez
    const used = respecHeroTree({ ...got, gold: 0 }, id);
    expect(hero(used, id).freeRespec).toBeUndefined();
    expect(hero(load(used), id).freeRespec).toBeUndefined();
    // boş ağaçta sürüm farkı hak vermez; bozuk bayrak değerleri atılır
    const empty = load(withHero(s, id, { tree: { v: W.version + 1, r: {} }, freeRespec: 'yes' as unknown as boolean, treeReset: 1 as unknown as boolean }));
    expect([hero(empty, id).tree, hero(empty, id).freeRespec, hero(empty, id).treeReset]).toEqual([undefined, undefined, undefined]);
  });

  it('ağaç verisi olmayan class: tree alanına ve puanlara dokunulmaz (puanlar birikir)', () => {
    const { s, id } = camp(20);
    const raw = { v: 1, r: { foo: 2 } };
    const got = load(withHero(s, id, { class: NO_TREE, tree: raw, skillPoints: 3 }));
    expect(hero(got, id).tree).toEqual(raw);
    expect(hero(got, id).skillPoints).toBe(3);
  });

  it('Endless parseRun aynı kurallar: bozuk -> iade + bayrak, sürüm farkı -> freeRespec, ağaçsız class dokunulmaz; idempotent', () => {
    const run = leveledRun(newRun(5, ['warrior', 'defender', NO_TREE], 't'), 20);
    const d = focusBuild(D, [2, 3], 10, { ult: 'r' });
    const raw: EndlessRun = {
      ...run,
      heroes: [
        { ...runHero(run, 0), tree: { v: W.version, r: { '1.f2': 2 } }, skillPoints: 0 },
        { ...runHero(run, 1), tree: { v: D.version + 1, r: d.r }, skillPoints: 0 },
        { ...runHero(run, 2), tree: { v: 1, r: { x: 1 } }, skillPoints: 2 },
      ],
    };
    const got = parseRun(JSON.stringify({ version: RUN_VERSION, run: raw }))!;
    expect([runHero(got, 0).tree, runHero(got, 0).treeReset, runHero(got, 0).skillPoints]).toEqual([undefined, true, pool(20)]);
    expect([runHero(got, 1).tree, runHero(got, 1).freeRespec, runHero(got, 1).skillPoints]).toEqual([{ v: D.version, r: d.r }, true, pool(20) - spent(d)]);
    expect([runHero(got, 2).tree, runHero(got, 2).skillPoints]).toEqual([{ v: 1, r: { x: 1 } }, 2]);
    expect(parseRun(JSON.stringify({ version: RUN_VERSION, run: got }))).toEqual(got);
  });
});

describe('debug setLevel ağacı da sıfırlar', () => {
  it('sefer debugSetLevel ve Endless debugRunLevel: ağaç + bayraklar silinir, puanlar level\'a göre harcanmamış', () => {
    const { s, id } = camp(20);
    const t = withHero(setHeroTree(s, id, wb(20)), id, { freeRespec: true, treeReset: true });
    expect(hero(t, id).tree).toBeDefined();
    const u = debugSetLevel(t, 10);
    expect([hero(u, id).tree, hero(u, id).freeRespec, hero(u, id).treeReset, hero(u, id).skillPoints]).toEqual([undefined, undefined, undefined, pool(10)]);
    const run = setRunHeroTree(leveledRun(newRun(5, ['warrior'], 't'), 20), 'h1', wb(20));
    expect(runHero(run, 0).tree).toBeDefined();
    const r = debugRunLevel(run, 30);
    expect([runHero(r, 0).tree, runHero(r, 0).skillPoints]).toEqual([undefined, pool(30)]);
    const h = { id: 'x', class: 'warrior', level: 20, tree: wb(20), skillPoints: 0 };
    setLevel(h, 20);
    expect([h.tree, h.skillPoints]).toEqual([undefined, pool(20)]);
  });
});

describe('saf durum fonksiyonları: setHeroTree / setRunHeroTree', () => {
  it('sefer: geçerli onay puanı düşer; geçersiz onay durumu DEĞİŞTİRMEZ (aynı nesne) ve nedeni söylenir', () => {
    const { s, id } = camp(20);
    const half = setHeroTree(s, id, wb(10));
    expect(hero(half, id).tree).toEqual(wb(10));
    expect(hero(half, id).skillPoints).toBe(pool(20) - spent(wb(10)));
    expect(hero(s, id).tree).toBeUndefined(); // girdi değişmez
    const full = setHeroTree(half, id, wb(20));
    expect(hero(full, id).skillPoints).toBe(0);
    const bad = { v: W.version, r: { '1.f2': 1 } };
    expect(setHeroTree(s, id, bad)).toBe(s);
    expect(heroTreeBlocked(s, id, bad)).toMatch(/^Needs /);
    expect(setHeroTree(half, id, { v: W.version, r: {} })).toBe(half);
    expect(heroTreeBlocked(half, id, { v: W.version, r: {} })).toBe('Confirmed points can only be refunded by a full reset');
    expect(heroTreeBlocked(half, id, wb(10))).toBe('No points to spend');
    expect(heroTreeBlocked(withHero(s, id, { skillPoints: 3 }), id, wb(10))).toBe('Not enough skill points');
    expect(heroTreeBlocked(withHero(s, id, { level: 5 }), id, wb(20))).toBe('Too many points for this level');
    expect(heroTreeBlocked(withHero(s, id, { class: NO_TREE }), id, wb(10))).toBe('This class has no skill tree yet');
    expect(heroTreeBlocked(s, 'nobody', wb(10))).toBe('Unknown hero');
    const paused = { ...s, suspended: { ...PAUSED, node: s.at } };
    expect(heroTreeBlocked(paused, id, wb(10))).toBe(PAUSED_LOCK);
    expect(setHeroTree(paused, id, wb(10))).toBe(paused);
    expect(heroTreeBlocked(s, id, { v: W.version, r: { '1.f1': 1.5 } })).toMatch(/Invalid rank/);
  });

  it('Endless: aynı kurallar + Gear kilidi (kalıntı seçimi / yarım savaş / bitmiş koşu)', () => {
    const run = leveledRun(newRun(5, ['warrior', 'defender'], 't'), 20);
    const next = setRunHeroTree(run, 'h1', wb(10));
    expect(runHero(next, 0).tree).toEqual(wb(10));
    expect(runHero(next, 0).skillPoints).toBe(pool(20) - spent(wb(10)));
    const bad = { v: W.version, r: { '1.f2': 1 } };
    expect(setRunHeroTree(run, 'h1', bad)).toBe(run);
    expect(runTreeBlocked(run, 'h1', bad)).toMatch(/^Needs /);
    expect(runTreeBlocked(next, 'h1', { v: W.version, r: {} })).toBe('Confirmed points can only be refunded by a full reset');
    expect(runTreeBlocked(run, 'h9', wb(10))).toBe('Unknown hero');
    const relic = { ...run, phase: 'relic' as const, relicOffer: [] };
    expect(runTreeBlocked(relic, 'h1', wb(10))).toBe('Choose a relic first.');
    expect(setRunHeroTree(relic, 'h1', wb(10))).toBe(relic);
  });
});

describe('respec (Ömer 10a): ağacın tamamı altınla, bedel level\'la artar; veri değişince bir kez bedava', () => {
  it('bedel _rules.json > respec (provizyon: 20 + 5 x level)', () => {
    expect(TREE_RULES.respec).toEqual({ base: 20, perLevel: 5 });
    expect(respecCost(10)).toBe(70);
    expect(respecCost(30)).toBe(170);
    expect(respecCost(10, { ...TREE_RULES, respec: undefined })).toBe(0);
  });

  it('sefer: altın düşer, puanlar harcanmamışa döner; altın yetmez / boş ağaç / duraklatılmış savaş -> durum aynen', () => {
    const { s, id } = camp(10);
    const t = { ...setHeroTree(s, id, wb(10)), gold: 100 };
    const r = respecHeroTree(t, id);
    expect(r.gold).toBe(100 - respecCost(10));
    expect([hero(r, id).tree, hero(r, id).skillPoints]).toEqual([undefined, pool(10)]);
    expect(respecHeroTree(r, id)).toBe(r);
    expect(respecTreeBlocked(r, id)).toBe('No skill points to reset');
    const poor = { ...t, gold: respecCost(10) - 1 };
    expect(respecHeroTree(poor, id)).toBe(poor);
    expect(respecTreeBlocked(poor, id)).toBe(`Not enough gold (${respecCost(10)} needed)`);
    const paused = { ...t, suspended: { ...PAUSED, node: t.at } };
    expect(respecTreeBlocked(paused, id)).toBe(PAUSED_LOCK);
    expect(respecHeroTree(paused, id)).toBe(paused);
  });

  it('freeRespec bir kez bedava: hak kullanılınca silinir, sonraki respec ücretli', () => {
    const { s, id } = camp(10);
    const t = withHero({ ...setHeroTree(s, id, wb(10)), gold: 0 }, id, { freeRespec: true });
    expect(heroRespecCost(hero(t, id))).toBe(0);
    const f1 = respecHeroTree(t, id);
    expect([f1.gold, hero(f1, id).tree, hero(f1, id).freeRespec, hero(f1, id).skillPoints]).toEqual([0, undefined, undefined, pool(10)]);
    const f2 = setHeroTree(f1, id, wb(10));
    expect(respecHeroTree(f2, id)).toBe(f2); // altın 0: ücretli respec yapılamaz
    expect(respecHeroTree({ ...f2, gold: 100 }, id).gold).toBe(100 - respecCost(10));
  });

  it('Endless: bedel koşu altınından; freeRespec aynı kural', () => {
    const run = { ...setRunHeroTree(leveledRun(newRun(5, ['warrior'], 't'), 12), 'h1', wb(12)), gold: 200 };
    const r = respecRunHeroTree(run, 'h1');
    expect(r.gold).toBe(200 - respecCost(12));
    expect([runHero(r, 0).tree, runHero(r, 0).skillPoints]).toEqual([undefined, pool(12)]);
    const poor = { ...run, gold: 0 };
    expect(respecRunHeroTree(poor, 'h1')).toBe(poor);
    expect(respecRunBlocked(poor, 'h1')).toBe(`Not enough gold (${respecCost(12)} needed)`);
    const free = { ...poor, heroes: [{ ...runHero(poor, 0), freeRespec: true }] };
    const f = respecRunHeroTree(free, 'h1');
    expect([f.gold, runHero(f, 0).tree, runHero(f, 0).freeRespec]).toEqual([0, undefined, undefined]);
  });
});

describe('savaş bağlantısı: kahramanın ağacı loadoutSetup\'a, duraklatılmış savaş / Endless plan anahtarı', () => {
  const shipped = TREE_RULES.enabled;
  afterEach(() => {
    TREE_RULES.enabled = shipped;
    setDebugTreeFocus(null);
  });

  it('ana şalter kapalıyken: kayıttaki ağaç savaşa girmez, anahtarlar değişmez', () => {
    TREE_RULES.enabled = false;
    const { s, id } = camp(20);
    const t = setHeroTree(s, id, wb(20));
    expect(Object.values(battlePlan(t).units.party).some((u) => u.tree)).toBe(false);
    expect(resumeKey(battlePlan(t))).toBe(resumeKey(battlePlan(s)));
    const run = leveledRun(newRun(5, ['warrior', 'defender'], 't'), 20);
    expect(planKey(wavePlan(setRunHeroTree(run, 'h1', wb(20))))).toBe(planKey(wavePlan(run)));
  });

  it('şalter açıkken: ağaç birim kurulumuna girer; ağaç değişince sefer duraklatılmış savaşı tutmaz (baştan başlar)', () => {
    TREE_RULES.enabled = true;
    const { s, id } = camp(20);
    expect(nextStep(s).kind).toBe('battle');
    const plan = battlePlan(s);
    const paused = withSuspended(s, pauseRecord(plan, battleForPlan(plan), []));
    expect(canResume(paused)).toBe(true);
    // Gear duraklatılmış savaşta kilitli; güvenlik ağı: ağaç yine de değişirse (ör. eski sürümün kaydı) anahtar tutmaz
    const changed = withHero(paused, id, { tree: wb(20), skillPoints: 0 });
    expect(Object.values(battlePlan(changed).units.party).filter((u) => u.tree).length).toBe(1);
    expect(resumeKey(battlePlan(changed))).not.toBe(resumeKey(plan));
    expect(canResume(changed)).toBe(false);
  });

  it('şalter açıkken: Endless kampında ağaç değişince dalga planı anahtarı değişir (yarım dalga baştan)', () => {
    TREE_RULES.enabled = true;
    const run = leveledRun(newRun(5, ['warrior', 'defender'], 't'), 20);
    const before = planKey(wavePlan(run));
    const after = setRunHeroTree(run, 'h1', wb(20));
    expect(Object.values(wavePlan(after).units.party).filter((u) => u.tree).length).toBe(1);
    expect(planKey(wavePlan(after))).not.toBe(before);
  });

  it('debug odaklı kurulum açıkken: kayıtta kendi ağacı olan kahraman kendi ağacıyla girer, ağacı boş olan ön ayarı alır', () => {
    setDebugTreeFocus({ dir: 'a' });
    const own = focusBuild(D, [3, 2], 20, { ult: 'r' });
    expect(Object.keys(compileTree(D, own)!.skills!).sort()).toEqual(['close_ranks', 'fist_crush']);
    expect(treeSetupFor({ class: 'defender', level: 20, tree: own }, 'campaign')).toEqual(compileTree(D, own));
    const preset = compileTree(D, debugFocusAlloc('defender', 20, 'a')!);
    expect(treeSetupFor({ class: 'defender', level: 20 }, 'endless')).toEqual(preset);
    expect(treeSetupFor({ class: 'defender', level: 20, tree: { v: D.version, r: {} } }, 'campaign')).toEqual(preset);
    expect(treeSetupFor({ class: 'defender', level: 20, tree: own }, 'quick')).toBeUndefined();
  });
});

describe('oyuncu vekili (sim): autoTreeAll / autoTreeRun', () => {
  it('sefer: ağacı olan herkes puanını odaklı kurulumla harcar; ağaçsız class puanını tutar; level atlayınca onaylı ağaçtan sürer', () => {
    const { s, id } = camp(20);
    const t = autoTreeAll(withHero(s, s.roster.find((h) => h.id !== id)?.id ?? id, s.roster.length > 1 ? { class: NO_TREE } : {}));
    const p = autoTreePlan('warrior');
    expect(hero(t, id).tree).toEqual(focusBuild(W, p.rows, 20, { dir: p.dir, ...(p.ult ? { ult: p.ult } : {}) }));
    expect(hero(t, id).skillPoints).toBe(0);
    for (const h of t.roster) if (!treeOf(h.class)) expect([h.tree, h.skillPoints]).toEqual([undefined, pool(20)]);
    expect(autoTreeAll(t)).toBe(t);
    const up = autoTreeAll(withHero(t, id, { level: 21, skillPoints: 1 }));
    expect(hero(up, id).tree).toEqual(focusBuild(W, p.rows, 21, { dir: p.dir, ...(p.ult ? { ult: p.ult } : {}) }));
    expect(hero(up, id).skillPoints).toBe(0);
  });

  it('Endless: aynı; ön ayarı olmayan class satır 1 + 2', () => {
    expect(autoTreePlan(NO_TREE).rows).toEqual(TREE_RULES.debugFocus?.[NO_TREE]?.rows ?? [1, 2]);
    const run = leveledRun(newRun(5, ['warrior', 'defender', NO_TREE], 't'), 15);
    const r = autoTreeRun(run);
    expect(r.heroes.map((h) => [h.tree ? spent(h.tree) : 0, h.skillPoints])).toEqual([[pool(15), 0], [pool(15), 0], [0, pool(15)]]);
    expect(autoTreeRun(r)).toBe(r);
  });
});
