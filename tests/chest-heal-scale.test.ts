// Haftalık liste 2026-11-07 (campaign-dev): sandıklar 1 item az, Harita 2 düşüş ölçeği, düşük level düğümde az zafer şifası.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine';
import { CONFIG, scaledVictoryHeal } from '../src/campaign';
import { ITEMS, emptyEquipment, rollLoot } from '../src/progression';

const party4 = ['warrior', 'mage', 'archer', 'gambler'].map((c) => ({ class: c, equipment: emptyEquipment() }));

describe('sandık item sayısı ve Harita 2 düşüş ölçeği', () => {
  it('treasureItemsDelta -1: sandık ortalaması düşer, her sandıkta en az 1 item kalır', () => {
    expect(ITEMS.loot.treasureItemsDelta).toBe(-1);
    let withDelta = 0;
    let without = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const a = rollLoot({ rng: new Rng(seed), kind: 'treasure', chapter: 1, ilvl: 6, party: party4 });
      expect(a.items.length).toBeGreaterThanOrEqual(1);
      withDelta += a.items.length;
      const saved = ITEMS.loot.treasureItemsDelta;
      ITEMS.loot.treasureItemsDelta = 0;
      without += rollLoot({ rng: new Rng(seed), kind: 'treasure', chapter: 1, ilvl: 6, party: party4 }).items.length;
      ITEMS.loot.treasureItemsDelta = saved;
    }
    expect(withDelta).toBeLessThan(without);
  });

  it('Harita 2 ölçeği: altın ve item beklentisi %12 az (mapLootScale), diğer haritalarda yok', () => {
    expect(CONFIG.mapLootScale?.['drowned-reach']).toEqual({ items: 0.88, gold: 0.88 });
    expect(CONFIG.mapLootScale?.['valdoria']).toBeUndefined();
    const base = rollLoot({ rng: new Rng(3), kind: 'battle', chapter: 2, ilvl: 12, party: party4 });
    const scaled = rollLoot({ rng: new Rng(3), kind: 'battle', chapter: 2, ilvl: 12, party: party4, scale: { items: 0.88, gold: 0.88 } });
    expect(scaled.gold).toBe(Math.round(base.gold * 0.88));
  });
});

describe('zafer şifası level ölçeği', () => {
  it('düğüm takım ortalamasının altına indikçe %25 -> %10', () => {
    const r = CONFIG.rules;
    expect([scaledVictoryHeal(r, 0.25, 6, 6), scaledVictoryHeal(r, 0.25, 5, 6), scaledVictoryHeal(r, 0.25, 4, 6), scaledVictoryHeal(r, 0.25, 1, 6)]).toEqual([0.25, 0.2, 0.15, 0.1]);
  });
});

describe('tutorial: lider ilk kasabaya L2 varır (özel level kuralı yok), 2. kahraman L1 gelir', () => {
  it('tutorial XP çarpanı (soloStart.xpScale): elit öncesi L1, elitten sonra tam L2 (L3 değil); Ashford katılımcısı L1; eski telafi çarpanları yok', async () => {
    const { newCampaign, pickHero, nextStep, autoResolve, moveTo, activeHeroes } = await import('../src/campaign');
    expect((CONFIG.soloStart as Record<string, unknown>).eliteLevelUp).toBeUndefined(); // tutxp (Ömer 2026-11-07): özel level verme kuralı kalktı
    expect(CONFIG.soloStart.xpScale).toBeDefined();
    expect(CONFIG.soloStart.enemyScale.nodes['1']).toBeUndefined();
    let s = pickHero(newCampaign({ mode: 'normal', seed: 9 }), 'warrior');
    const seen: Array<[string, number]> = [];
    for (let g = 0; g < 60 && s.at !== '4'; g++) {
      const st = nextStep(s);
      const wasBattle = st.kind === 'battle';
      const at = s.at;
      s = st.kind === 'move' ? moveTo(s, st.options[0]!) : autoResolve(s, st);
      if (wasBattle && ['1', '2', '3'].includes(at)) seen.push([at, s.roster[0]!.level]);
    }
    // tutxp (Ömer 2026-11-07): lider ilk kasabaya (Ashford) tam L2 varır; level elitte atlanır (XP miktarıyla, özel kural yok)
    expect(seen).toEqual([['1', 1], ['2', 1], ['3', 2]]);
    expect(s.at).toBe('4');
    expect(s.roster[0]!.level).toBe(2);
    while (activeHeroes(s).length < 2 && nextStep(s).kind !== 'complete') {
      const st = nextStep(s);
      s = st.kind === 'move' ? moveTo(s, st.options[0]!) : autoResolve(s, st);
      if (s.roster.length > 1) break;
    }
    expect(s.roster.length).toBe(2);
    expect(s.roster[1]!.level).toBe(1);
  });
});
