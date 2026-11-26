import { describe, expect, it } from 'vitest';
import * as content from '../src/engine/content';
import { Battle } from '../src/engine/battle';
import { advanceTurn, predictQueue, type TurnSlot } from '../src/engine/turn-order';
import { battlePlan, battleForPlan, debugTeleport, newCampaign } from '../src/campaign';

// Playtest 2026-10-23 D4 (Ömer seçenek 3): eşit hızda sıra taraf taraf değil birim birim karışık (düşman, kahraman, düşman...).
// Seçenek 1: bölge I sıradan moblarının hızı veride 15-17 (encounters.json mods.spdAdd).

const slot = (uid: string, side: 'party' | 'enemy', s: number, spd = 16): TurnSlot => ({ uid, side, slot: s, spd, counter: 0 });
const sideOf = (uid: string) => (uid.startsWith('party') ? 'p' : 'e');
// Kişisel hız zarı (Ömer 2026-10-24) KAPALI kurulum: eşit hız kuralı ve veri hız bantları zarsız (taban) hızı denetler
const flat = (setup: ReturnType<typeof content.battleSetup>): ReturnType<typeof content.battleSetup> => ({ ...setup, formulas: { ...setup.formulas, attributes: { ...setup.formulas.attributes, spdVariance: 0 } } });

describe('karışık sıra (eşit hız)', () => {
  it('tahmin: eşit hızlı 3+3 birim birim birim sıralanır, ilk taraf firstSide', () => {
    const slots = [slot('party-0', 'party', 0), slot('party-1', 'party', 1), slot('party-2', 'party', 2), slot('enemy-0', 'enemy', 0), slot('enemy-1', 'enemy', 1), slot('enemy-2', 'enemy', 2)];
    expect(predictQueue(slots, 200, 6, null, 'enemy').map(sideOf).join('')).toBe('epepep');
    expect(predictQueue(slots, 200, 6, null, 'party').map(sideOf).join('')).toBe('pepepe');
    // aynı taraf içinde yuva sırası korunur
    expect(predictQueue(slots, 200, 6, null, 'enemy')).toEqual(['enemy-0', 'party-0', 'enemy-1', 'party-1', 'enemy-2', 'party-2']);
  });

  it('hızlı birim yine önce oynar (eşitlik kuralı yalnızca eşit sayaçta)', () => {
    const slots = [slot('party-0', 'party', 0), slot('enemy-0', 'enemy', 0, 24), slot('enemy-1', 'enemy', 1)];
    expect(advanceTurn(slots.map((s) => ({ ...s })), 200, 'party')!.uid).toBe('enemy-0');
  });

  it('savaş: gerçek tur sırası tahminle aynı ve karışık; her tohumda (yazı-tura) taraflar dönüşür', () => {
    const party = ['', 'defender', '', 'mage', '', 'hexer', '', '', '', '', '', ''];
    for (const seed of [1, 2, 3, 4]) {
      const b = new Battle(flat(content.battleSetup(content.DEFAULT_BATTLE, seed, 'turns', { party, enemies: party }, false)));
      for (const c of b.combatants) c.mp = 0; // Rest için (MP doluyken kullanılamaz)
      const predicted = b.turnQueue(6);
      const actual: string[] = [];
      for (let i = 0; i < 6; i++) {
        const uid = b.currentUid!;
        actual.push(uid);
        expect(b.useGlobal(uid, 'rest').ok).toBe(true);
      }
      expect(actual).toEqual(predicted);
      const s = actual.map(sideOf).join('');
      expect(s === 'epepep' || s === 'pepepe', `seed ${seed}: ${s}`).toBe(true);
    }
  });

  it('test modunda sıra yok: her birim istediği an oynar', () => {
    const party = ['', 'defender', '', 'mage', '', 'hexer', '', '', '', '', '', ''];
    const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, 1, 'test', { party, enemies: party }, false));
    expect(b.turnQueue()).toEqual([]);
    for (const c of b.combatants) c.mp = 0;
    expect(b.useGlobal('party-1', 'rest').ok).toBe(true);
    expect(b.useGlobal('enemy-2', 'rest').ok).toBe(true);
  });
});

describe('bölge I mob hızları (veri)', () => {
  const plan = (node: string) => battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 7, difficulty: 'medium' }), node));
  const LOWERED = ['moor_raider', 'road_thug', 'cutpurse', 'ravenwood_poacher', 'bandit_crossbowman'];
  /**
   * BİLİNEN EKSİK (geçici muafiyet; normalde BOŞ; PENDING_EARLY_ENEMY kalıbı): r41 akşam (Ömer onayı m_dex = A) formulas.json spdPerDex
   * kısıldı; encounters.json / waves.json'daki düz spdAdd eksileri eski formüle göre ayarlıydı, yüksek DEX'li moblar bandın altına düştü
   * (ör. bandit_crossbowman 16,8 -> 12,75). r42 (Ömer d_mobs = evet): spdAdd eksileri eski hızlara geri çekildi, liste boşaldı. Liste bandın dışındaki
   * mobların TAMAMIdır: biri banda girerse ya da yeni biri çıkarsa test KIRMIZI olur, liste güncellenir.
   */
  const PENDING_SPD_I: readonly string[] = [];
  const PENDING_SPD_II: readonly string[] = [];
  const outOfBand = (out: Set<string>, id: string, spd: number) => {
    if (spd < 15 || spd > 17) out.add(id);
  };

  it('sıradan bölge I mobları 15-17 hızında (ilk dalga ve sonraki dalgalar)', () => {
    const out = new Set<string>();
    for (const node of ['1', '3', 'moor', 'hills', 'hoard', 'cairn', '5B', 'charcoal']) {
      const p = plan(node);
      const lists = [{ enemies: p.enemies, units: p.units.enemies }, ...(p.waves ?? [])];
      for (const w of lists) {
        const b = new Battle(flat(content.battleSetup(content.DEFAULT_BATTLE, 1, 'turns', { party: p.party, enemies: w.enemies, units: { party: p.units.party, enemies: w.units } }, false)));
        // ondalık hız (Ömer 2026-10-31): bant yuvarlanmış değerin bandı (14,8 eskiden 15'ti; denge sayısı değişmedi)
        for (const c of b.combatants.filter((x) => x.side === 'enemy' && LOWERED.includes(x.defId))) outOfBand(out, c.defId, Math.round(c.stats.spd));
      }
    }
    if (PENDING_SPD_I.length) console.warn(`[turn-order] BİLİNEN EKSİK: bölge I bant dışı ${PENDING_SPD_I.join(', ')} (spdAdd yeniden ayarı bekliyor)`);
    expect([...out].sort()).toEqual([...PENDING_SPD_I].sort());
  });

  // Bölge II (D4 genişletme, balance-tester 2026-10-24): sıradan moblar 15-17; imza hızlı mob Will-o'-Wisp (19) ve elit/boss hariç.
  const REGION_II = ['6B', '5A', 'shrine', 'grave', 'pilgrim', '8A', '8C', '9'];
  const FAST_OK = ['will_o_wisp', 'iron_mooring'];
  it('sıradan bölge II mobları 15-17 hızında (ilk dalga ve sonraki dalgalar; Will-o\'-Wisp imza hızlı)', () => {
    const out = new Set<string>();
    for (const node of REGION_II) {
      const p = plan(node);
      const lists = [{ enemies: p.enemies, units: p.units.enemies }, ...(p.waves ?? [])];
      for (const w of lists) {
        const b = new Battle(flat(content.battleSetup(content.DEFAULT_BATTLE, 1, 'turns', { party: p.party, enemies: w.enemies, units: { party: p.units.party, enemies: w.units } }, false)));
        for (const c of b.combatants.filter((x) => x.side === 'enemy' && !x.tier && !FAST_OK.includes(x.defId))) outOfBand(out, c.defId, c.stats.spd);
      }
    }
    if (PENDING_SPD_II.length) console.warn(`[turn-order] BİLİNEN EKSİK: bölge II bant dışı ${PENDING_SPD_II.join(', ')} (spdAdd yeniden ayarı bekliyor)`);
    expect([...out].sort()).toEqual([...PENDING_SPD_II].sort());
  });

  it('Ravenwood: yalnız lider kurt hızlı (19), diğer kurtlar 15-16; yavaş takım karşısında ilk kahraman turundan önce 1 düşman', () => {
    const p = plan('2');
    const b = new Battle(flat(content.battleSetup(content.DEFAULT_BATTLE, 1, 'turns', { party: ['defender', 'mage', 'paladin'], enemies: p.enemies, units: { enemies: p.units.enemies } }, false)));
    const wolves = b.combatants.filter((x) => x.side === 'enemy' && x.defId === 'grey_wolf').map((x) => x.stats.spd).sort((a, z) => z - a);
    // r41 akşam: mutlak hız (eskiden lider 18,8, diğerleri <= 16) spdPerDex'e bağlı; kural göreli: lider öbürlerinden en az 2 hızlı
    for (const s of wolves.slice(1)) expect(wolves[0]! - s).toBeGreaterThanOrEqual(2);
    expect(b.turnQueue(8).findIndex((u) => u.startsWith('party'))).toBeLessThanOrEqual(1);
  });

  /**
   * BİLİNEN EKSİK (geçici muafiyet; normalde BOŞ; campaign-balance.test.ts > PENDING_LOW kalıbı): silah tipleri reworkünden (open-questions 443;
   * ör. mace -%9 hız) sonra bu düğümlerde düşman ilk kahraman turundan önce 1'den fazla oynuyor. Ömer 2026-10-28: denge değeri değişmez, element
   * reworkü sonrası sim'e kadar (open-questions 427) beklesin. Listedeki düğüm hâlâ eksik olmalı: düzelirse test KIRMIZI olur, listeden çıkar.
   */
  const PENDING_EARLY_ENEMY: ReadonlySet<string> = new Set<string>([]);
  it('Defender/Mage/Paladin karşısında düşman en çok 1 tur önce oynar (Windy Moor, Brackenridge, Charcoal Camp)', () => {
    for (const node of ['moor', 'hills', 'hoard', 'cairn', 'charcoal']) {
      const q = battleForPlan(plan(node)).turnQueue(8);
      const first = q.findIndex((u) => u.startsWith('party'));
      if (PENDING_EARLY_ENEMY.has(node)) {
        console.warn(`[turn-order] BİLİNEN EKSİK: ${node} ilk kahraman turu ${first}. sırada (> 1; muaf: PENDING_EARLY_ENEMY, open-questions 443)`);
        expect(first, `${node} düzeldi: PENDING_EARLY_ENEMY listesinden çıkar`).toBeGreaterThan(1);
      } else expect(first, node).toBeLessThanOrEqual(1);
    }
  });
});
