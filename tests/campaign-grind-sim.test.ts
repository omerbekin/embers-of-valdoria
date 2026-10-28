import { describe, expect, it } from 'vitest';
import { autoResolve, canReplay, CONFIG, debugSetLevel, debugTeleport, getMap, newCampaign, nextStep, node, pickHero } from '../src/campaign';
import { Battle, content } from '../src/engine';
import { valorRules } from '../src/engine/content';
import { lateValorChoice, nodeCategory, resolveSimMap, simMapChain } from '../src/sim/campaign';
import { ITEMS } from '../src/progression/items';
import { equalAllocateAll, mergeGrindResults, pickFarm, repeatPreset, simOverrides, simulateGrind, withIlvlBonus, withLevelBonus } from '../src/sim/campaign-grind';
import { bonusText, bossFirstWins, grindBand, grindReport, parseBonus, parseSimOptions, parseWallCap } from '../src/sim/campaign-grind-report';
import { instanceIlvl, SLOT_IDS } from '../src/progression/items';
import { CAMPAIGN_TARGETS } from '../src/sim/campaign-targets';

// Sefer kasma simülatörü (src/sim/campaign-grind.ts): oyuncu kararlarının iç tutarlılığı. Denge ölçümü değil (npm run sim:campaign).
const map = getMap('valdoria');
/** Bölük kurulduktan (Ashford) sonraki savaş düğümü mü (tutorial değil). */
const nodeCategoryAfterAshford = (id: string) => nodeCategory(map, id) !== 'tutorial';

describe('sefer kasma simülatörü', () => {
  it('harita seçimi (--map): varsayılan Harita 1; id, alt çizgili yazım ve sıra numarası; bilinmeyen hata; zincir Harita 1den hedefe', () => {
    expect(resolveSimMap(undefined)).toBe(CONFIG.maps[0]);
    expect(resolveSimMap('drowned_reach')).toBe('drowned-reach');
    expect(resolveSimMap('drowned-reach')).toBe('drowned-reach');
    expect(resolveSimMap('2')).toBe('drowned-reach');
    expect(resolveSimMap('1')).toBe('valdoria');
    expect(() => resolveSimMap('atlantis')).toThrow();
    expect(simMapChain()).toEqual(['valdoria']);
    expect(simMapChain('drowned-reach')).toEqual(['valdoria', 'drowned-reach']);
    // Tutorial yalnız Harita 1'de (Ashford öncesi); Harita 2'nin ilk savaşları normal sayılır
    expect(nodeCategory(map, map.start)).toBe('tutorial');
    const dr = getMap('drowned-reach');
    expect(dr.nodes.filter((n) => n.encounter).every((n) => nodeCategory(dr, n.id) !== 'tutorial')).toBe(true);
  });

  it('duvar sınırı: varsayılan zorluk başına hedef bloğundan, --wall-cap hepsini ya da zorluk başına ezer', () => {
    expect(parseWallCap(undefined)).toEqual(CAMPAIGN_TARGETS.wallCap);
    expect(parseWallCap('7')).toEqual({ easy: 7, medium: 7, hard: 7 });
    expect(parseWallCap('hard:30')).toEqual({ ...CAMPAIGN_TARGETS.wallCap, hard: 30 });
  });

  it('ortalama oyuncunun kasma bandı üst sınırı x(1 + averageGrindExtra)', () => {
    const b = CAMPAIGN_TARGETS.grind.medium.boss;
    expect(grindBand('medium', 'boss', 'good')).toEqual(b);
    expect(grindBand('medium', 'boss', 'average')[1]).toBeCloseTo(b[1] * (1 + CAMPAIGN_TARGETS.averageGrindExtra));
  });

  it('ortalama oyuncu stat puanlarını dört stata eşit dağıtır', () => {
    const s = equalAllocateAll(debugSetLevel(newCampaign({ mode: 'normal', seed: 3 }), 12));
    for (const h of s.roster) {
      const v = (['str', 'dex', 'int', 'luck'] as const).map((k) => h.alloc?.[k] ?? 0);
      expect(h.statPoints ?? 0).toBe(0);
      expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(1);
    }
  });

  it('kasma yeri: temizlenmiş tekrar oynanabilir düğüm; orada hep kaybeden başka yere geçer', () => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 5 }), 'cairn');
    while (nextStep(s).kind !== 'move') s = autoResolve(s);
    const f = pickFarm(s)!;
    expect(f).toBeTruthy();
    expect(canReplay(map, node(map, f))).toBe(true);
    const other = pickFarm(s, new Map([[f, { w: 0, n: 200 }]]));
    expect(other).not.toBe(f);
  });

  it('koşu sayaçları tutarlı: kasma savaşları düğümlere dağılır, düğüm başına en çok duvar sınırı kadar', () => {
    const wallCap = 2;
    const r = simulateGrind({ difficulty: 'hard', player: 'average', runs: 1, firstSeed: 11, wallCap, retries: 0, preGrind: 2, merchant: 'off' });
    const nodes = Object.values(r.nodes);
    expect(r.runs).toBe(1);
    // farmBattles Inn bekleme devriyelerini (econ.innBattles) ve yan düğüm devriyelerini (econ.lfPatrol) de sayar (grindOnce)
    expect(nodes.reduce((a, n) => a + n.farmBattles, 0)).toBe(r.grindBattles + r.preGrindBattles + r.econ.innBattles + r.econ.lfPatrol);
    expect(nodes.reduce((a, n) => a + n.grindSum + n.grindWall, 0)).toBe(r.grindBattles);
    expect(r.battles).toBe(nodes.reduce((a, n) => a + n.battles + n.farmBattles, 0));
    for (const n of nodes) expect(n.grindSum + n.grindWall).toBeLessThanOrEqual(wallCap * Math.max(1, n.reached));
    expect(r.walls + r.completed).toBeLessThanOrEqual(1);
    // Ekonomi sayaçları: altın kaynaklarının toplamı = kazanılan altın; nadirlik dağılımı = düşen item; tüccar kapalıyken alışveriş yok
    const e = r.econ;
    expect(e.goldBattle + e.goldElite + e.goldBoss + e.goldReplay + e.goldTreasure + e.goldSell).toBe(r.goldEarned);
    expect(Object.values(e.rarity).reduce((a, b) => a + b, 0)).toBe(e.itemsFirst + e.itemsReplay + e.itemsTreasure);
    expect(e.itemsEquipped).toBeLessThanOrEqual(e.itemsFirst + e.itemsReplay + e.itemsTreasure);
    expect(e.merchantVisits + e.itemsBought + e.itemsSold + e.goldMerchant).toBe(0);
    expect(r.merchant).toBe('off');
    expect(r.repeat).toBe('today');
  });

  it('seçenek bayrakları: --repeat önayarları bugünkü tablodan türer', () => {
    const today = ITEMS.loot.repeat;
    expect(repeatPreset('today')).toEqual(today);
    expect(repeatPreset('soft').map((x) => x.items)).toEqual([1, 0.8, 0.65, 0.5].slice(0, today.length));
    expect(repeatPreset('soft').map((x) => x.maxRarity)).toEqual(today.map((x) => x.maxRarity));
    expect(repeatPreset('nocap').map((x) => x.gold)).toEqual(today.map((x) => x.gold));
    expect(repeatPreset('nocap').every((x) => x.maxRarity === 'legendary')).toBe(true);
    expect(repeatPreset('off').every((x) => x.items === 1 && x.gold === 1 && x.maxRarity === 'legendary')).toBe(true);
    const flags = (m: Record<string, string>) => (k: string) => m[k];
    expect(parseSimOptions(flags({}))).toEqual({ repeat: 'today', merchant: 'sell' }); // varsayılan sell (Ömer 2026-10-20)
    expect(parseSimOptions(flags({ repeat: 'soft', merchant: 'on', 'valor-revive': '5:3', 'rest-price': '20' }))).toEqual({ repeat: 'soft', merchant: 'on', valorRevive: [5, 3], restPrice: 20 });
    expect(() => parseSimOptions(flags({ repeat: 'x' }))).toThrow();
  });

  it('seçenekler yalnızca sim süresince geçerli: veri kopyası sonra eski haline döner (oyun davranışı değişmez)', () => {
    const repeat = JSON.stringify(ITEMS.loot.repeat);
    const revive = JSON.stringify(valorRules.revive);
    const rest = JSON.stringify(CONFIG.rest);
    // restPrice: ücretli kasaba dinlenmesi kalktı (2026-10-26, yerine Inn); bayrak etkisiz, veri değişmez
    const undo = simOverrides({ repeat: 'off', valorRevive: [2, 1], restPrice: 37 });
    expect(ITEMS.loot.repeat.every((x) => x.items === 1)).toBe(true);
    expect(valorRules.revive.battleCost).toBe(2);
    expect(JSON.stringify(CONFIG.rest)).toBe(rest);
    undo();
    expect(JSON.stringify(ITEMS.loot.repeat)).toBe(repeat);
    expect(JSON.stringify(valorRules.revive)).toBe(revive);
    expect(JSON.stringify(CONFIG.rest)).toBe(rest);
    // tüm koşu: tüccar 'sell' (satar + alır) ve seçenekler; bitince veri aynen
    const r = simulateGrind({ difficulty: 'easy', player: 'good', runs: 1, firstSeed: 3, merchant: 'sell', repeat: 'off', valorRevive: [4, 3], restPrice: 20 });
    expect(r.merchant).toBe('sell');
    expect(r.econ.merchantVisits).toBeGreaterThan(0);
    expect(r.econ.goldBattle + r.econ.goldElite + r.econ.goldBoss + r.econ.goldReplay + r.econ.goldTreasure + r.econ.goldSell).toBe(r.goldEarned);
    expect(r.econ.boughtEquipped).toBeLessThanOrEqual(r.econ.itemsBought);
    expect(JSON.stringify(ITEMS.loot.repeat)).toBe(repeat);
    expect(JSON.stringify(valorRules.revive)).toBe(revive);
    expect(JSON.stringify(CONFIG.rest)).toBe(rest);
  });

  it('güç kaldıracı bayrakları: varsayılan 0, --bonus-level / --bonus-ilvl / --bonus-gold okunur, geçersiz değer hata', () => {
    const flags = (m: Record<string, string>) => (k: string) => m[k];
    expect(parseBonus(flags({}))).toEqual({ level: 0, ilvl: 0, gold: 0 });
    expect(parseBonus(flags({ 'bonus-level': '2', 'bonus-ilvl': '1', 'bonus-gold': '300' }))).toEqual({ level: 2, ilvl: 1, gold: 300 });
    expect(() => parseBonus(flags({ 'bonus-level': '-1' }))).toThrow();
    expect(() => parseBonus(flags({ 'bonus-gold': 'x' }))).toThrow();
    expect(bonusText({})).toBe('yok');
    expect(bonusText({ gold: 100 })).toContain('100');
  });

  it('bonus level: herkes N level atlar (stat / skill puanı oyun kuralıyla); bonus ilvl: takılı itemler kopyada +N, asıl durum aynen', () => {
    const s = debugSetLevel(pickHero(newCampaign({ mode: 'normal', seed: 3 }), CONFIG.starterPool[0]!), 3);
    expect(s.roster.length).toBeGreaterThan(0);
    const up = withLevelBonus(s, 2);
    s.roster.forEach((h, i) => {
      const u = up.roster[i]!;
      expect(u.level).toBe((h.level ?? 1) + 2);
      expect(u.statPoints ?? 0).toBeGreaterThan(h.statPoints ?? 0);
    });
    expect(withLevelBonus(s, 0)).toBe(s);
    const gear = s.roster.flatMap((h) => SLOT_IDS.map((k) => h.equipment?.[k]).filter((x): x is NonNullable<typeof x> => !!x));
    expect(gear.length).toBeGreaterThan(0);
    const before = JSON.stringify(s);
    const b = withIlvlBonus(s, 2);
    const boosted = b.roster.flatMap((h) => SLOT_IDS.map((k) => h.equipment?.[k]).filter((x): x is NonNullable<typeof x> => !!x));
    boosted.forEach((x, i) => expect(instanceIlvl(x)).toBe(instanceIlvl(gear[i]!) + 2));
    expect(JSON.stringify(s)).toBe(before);
    expect(withIlvlBonus(s, 0)).toBe(s);
  });

  it('bonuslu koşu: bonus sonuçta yazılı (birleşince toplanmaz), bonus altın kazanca sayılmaz, boss ilk deneme özeti', () => {
    const o = { difficulty: 'easy', player: 'good', runs: 1, firstSeed: 3, merchant: 'off' } as const;
    const plain = simulateGrind(o);
    const r = simulateGrind({ ...o, bonus: { level: 2, ilvl: 1, gold: 50 } });
    expect(plain.bonus).toEqual({ level: 0, ilvl: 0, gold: 0 });
    expect(r.bonus).toEqual({ level: 2, ilvl: 1, gold: 50 });
    expect(r.goldBonus).toBe(50);
    const e = r.econ;
    expect(e.goldBattle + e.goldElite + e.goldBoss + e.goldReplay + e.goldTreasure + e.goldSell).toBe(r.goldEarned);
    // Ashford sonrası ilk savaşa takım daha yüksek level ve item seviyesiyle girer
    // Harita sırası (Object.keys DEĞİL: '9', '10' gibi sayı anahtarlar başa dizilir, King's Bridge boss'u seçilirdi; orada level farkı erimiş olabilir)
    const first = map.nodes.map((n) => n.id).find((id) => plain.nodes[id]?.reached && r.nodes[id]?.reached && nodeCategoryAfterAshford(id))!;
    expect(first).toBe('moor');
    expect(r.nodes[first]!.lvSum).toBeGreaterThan(plain.nodes[first]!.lvSum);
    expect(r.nodes[first]!.ilvlSum).toBeGreaterThan(plain.nodes[first]!.ilvlSum);
    expect(mergeGrindResults([r, r]).bonus).toEqual(r.bonus);
    for (const b of bossFirstWins(r)) expect(node(map, b.id).type).toBe('boss');
    const txt = grindReport([r], { runs: 1, firstSeed: 3, secs: 0, opts: { retries: 2, grindStep: 1, onWall: 'stop', healAt: 0.5, bonus: r.bonus }, caps: CAMPAIGN_TARGETS.wallCap });
    expect(txt).toContain('Güç kaldıracı (bonus): +2 level');
    if (bossFirstWins(r).length) expect(txt).toContain('boss ilk deneme:');
  });

  it('ortalama oyuncunun geç Valor kuralı: dost düşünce bir oyuncu turu bekler, sonra bedel yetiyorsa diriltir; yetmezse hiç', () => {
    const cells = (m: Record<number, string>) => Array.from({ length: 12 }, (_, i) => m[i] ?? '');
    const mk = (valor: number) => {
      const b = new Battle(content.battleSetup('random-battle', 1, 'test', { party: cells({ 0: 'warrior', 4: 'mage' }), enemies: cells({ 0: 'archer' }), valor: { party: valor } }, false));
      const mage = b.combatants.find((c) => c.side === 'party' && c.slot === 4)!;
      b.debugKill(mage.uid);
      return { b, mage, actor: b.combatants.find((c) => c.side === 'party' && c.slot === 0)!.uid };
    };
    const cost = valorRules.revive.battleCost;
    const ok = mk(cost);
    const seen = new Map<string, number>();
    expect(lateValorChoice(ok.b, ok.actor, seen)).toBeNull(); // ilk tur boşa gider
    const c = lateValorChoice(ok.b, ok.actor, seen)!;
    expect(c).toMatchObject({ targetUid: ok.mage.uid });
    expect(ok.b.applyChoice(ok.actor, c).ok).toBe(true);
    expect(ok.mage.hp).toBeGreaterThan(0);
    expect(ok.b.valorOf('party')).toBe(0);
    const poor = mk(cost - 1);
    const s2 = new Map<string, number>();
    for (let i = 0; i < 3; i++) expect(lateValorChoice(poor.b, poor.actor, s2)).toBeNull();
  });
});
