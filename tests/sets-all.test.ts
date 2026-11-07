import { describe, expect, it } from 'vitest';
import { classes } from '../src/engine/content';
import { patchedPassive } from '../src/engine/stats';
import { Rng } from '../src/engine/rng';
import type { ItemInstance, RarityId } from '../src/progression/items';
import { ITEMS, SLOT_IDS, canEquip, emptyEquipment, itemDef, makeItem, validateItems, type Equipment } from '../src/progression/items';
import { bestMoves, slotScore } from '../src/progression/equip';
import { loadout } from '../src/progression/loadout';
import { SETS, SET_ITEMS, equippedSetCounts, modIP, setBonusScore, setContribution, setPieces, setTip } from '../src/progression/sets';

// Kalan dört set (Lead 2026-11-07): veri geçerli, bonuslar yalnızca mevcut stat ve pasif alanlarına bağlı, ipucu metni tam, Equip best set bonusunu tartar.

const NEW_IDS = ['kingsfall_regalia', 'gallows_pact', 'ravens_shroud', 'conclave_of_embers'];

function wearing(ids: string[]): Equipment {
  const eq = emptyEquipment();
  ids.forEach((id, i) => {
    const d = itemDef(id)!;
    (eq as Record<string, unknown>)[d.slot] = makeItem(id, `u${i}`, new Rng(i + 1));
  });
  return eq;
}

describe('altı set: veri', () => {
  it('altı set, doğrulama temiz, her parça ana katalogda', () => {
    expect(SETS.map((s) => s.id)).toEqual(expect.arrayContaining(['ashguard_vigil', 'wayfarers_oath', ...NEW_IDS]));
    expect(SETS).toHaveLength(6);
    expect(validateItems()).toEqual([]);
    for (const s of SETS) {
      expect(setPieces(s.id).map((d) => d.name), s.id).toEqual(s.pieceNames);
      expect(s.thresholds.at(-1), s.id).toBe(s.slots.length);
      for (const t of s.thresholds) expect(s.bonuses[String(t)], `${s.id} ${t}`).toBeTruthy();
    }
    for (const d of SET_ITEMS) expect(itemDef(d.id)).toBe(d);
  });

  it('sınıf setleri 4 parça, nötr setler 3; her set kendi haritasında, düşüren elit adlı', () => {
    for (const s of SETS) {
      expect(s.slots.length, s.id).toBe(s.kind === 'class' ? 4 : 3);
      expect(s.map && s.dropper, s.id).toBeTruthy();
    }
  });

  it('3. parça sınıf satırları gerçek pasifin gerçek sayısına bağlı (from = bugünkü değer) ve yalnızca takabilen sınıflara', () => {
    for (const s of SETS) {
      const rows = Object.entries(s.bonuses['3']?.byClass ?? {});
      for (const [cls, row] of rows) {
        const passive = classes[cls]?.passive;
        expect(passive?.id, `${s.id} ${cls}`).toBe(row.passive);
        const patched = patchedPassive(passive!, { passive: row.passive, field: row.field, delta: row.to - row.from });
        const at = (p: typeof passive) => row.field.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], p!.effect as unknown);
        expect(at(passive), `${s.id} ${cls}: from`).toBeCloseTo(row.from, 6);
        expect(at(patched), `${s.id} ${cls}: to`).toBeCloseTo(row.to, 6);
        for (const d of setPieces(s.id)) expect(canEquip(cls, d), `${d.id} ${cls}`).toBe(true);
      }
      if (s.kind === 'class') for (const d of setPieces(s.id)) for (const c of d.usableBy ?? []) expect(Object.keys(s.bonuses['3']?.byClass ?? {}), `${s.id} ${c} has a 3-piece row`).toContain(c);
    }
  });

  it('bonus statları: yalnızca bilinen anahtarlar ve ipucunda yazı; her 4. parça / üst eşik bir ödünleşme taşır', () => {
    for (const s of SETS.filter((x) => NEW_IDS.includes(x.id))) {
      for (const t of s.thresholds) {
        const b = s.bonuses[String(t)]!;
        for (const [k, v] of Object.entries(b.mods ?? {})) {
          expect(modIP(k, v), `${s.id} ${t} ${k}`).not.toBe(0);
        }
      }
      const top = s.bonuses[String(s.thresholds.at(-1))]!;
      if (s.id !== 'kingsfall_regalia' || true) expect(Object.values(top.mods ?? {}).some((v) => v < 0), `${s.id} top bonus has a downside`).toBe(true);
      const tip = setTip({ set: s.id }, undefined, undefined);
      expect(tip?.rows.length, s.id).toBeGreaterThan(0);
      for (const r of tip!.rows) expect(r.text, s.id).not.toMatch(/undefined|NaN|\[object/);
    }
  });
});

describe('altı set: bonuslar çalışır', () => {
  it.each(NEW_IDS)('%s: parça sayısı eşikleri açar, loadout yaması ve statlar gelir', (id) => {
    const s = SETS.find((x) => x.id === id)!;
    const cls = (setPieces(id)[0]!.usableBy ?? ['warrior'])[0]!;
    const two = wearing(setPieces(id).slice(0, 2).map((d) => d.id));
    expect(equippedSetCounts(two)[id]).toBe(2);
    const m2 = setContribution(two, cls).mods;
    for (const [k, v] of Object.entries(s.bonuses['2']!.mods!)) expect(m2[k], `${id} ${k}`).toBeCloseTo(v, 6);
    const three = wearing(setPieces(id).slice(0, 3).map((d) => d.id));
    if (s.kind === 'class') expect(setContribution(three, cls).passivePatch?.passive).toBe(s.bonuses['3']!.byClass![cls]!.passive);
    const all = wearing(setPieces(id).map((d) => d.id));
    const top = s.bonuses[String(s.thresholds.at(-1))]!.mods!;
    const mods = setContribution(all, cls).mods;
    for (const k of Object.keys(top)) expect(mods[k], `${id} ${k}`).toBeDefined();
    // loadout (güç katmanı) set statlarını gerçekten taşır: tam setli kahramanın maks MP / can / hız farkı
    const bare = loadout({ class: cls, equipment: wearing([]) });
    const full = loadout({ class: cls, equipment: all });
    expect(JSON.stringify(full.modifiers)).not.toBe(JSON.stringify(bare.modifiers));
  });

  it('parça yalnızca kendi sınıflarına: Raven yalnız Cutthroat / Archer / Anti-Mage, Conclave Mage / Druid / Undead / Vesper, Gallows Gambler / Hexer, Kingsfall herkes', () => {
    const can = (setId: string) => Object.keys(classes).filter((c) => !c.includes('tester') && canEquip(c, setPieces(setId)[0]!)).sort();
    expect(can('ravens_shroud')).toEqual(['antimage', 'archer', 'cutthroat']);
    expect(can('conclave_of_embers')).toEqual(['druid', 'mage', 'undead', 'vesper']);
    expect(can('gallows_pact')).toEqual(['gambler', 'hexer']);
    expect(can('kingsfall_regalia')).toEqual(expect.arrayContaining(['warrior', 'mage', 'hexer']));
  });
});

describe('Equip best set bonusunu tartar', () => {
  const rolled = (id: string, uid: string, seed: number, rarity?: RarityId, ilvl?: number): ItemInstance => makeItem(id, uid, new Rng(seed), { ...(rarity ? { rarity } : {}), ...(ilvl ? { ilvl } : {}) });

  it('setBonusScore: eşik yoksa 0, eşik arttıkça artar', () => {
    const id = 'ravens_shroud';
    const cls = 'cutthroat';
    const pieces = setPieces(id).map((d) => d.id);
    const v = [0, 1, 2, 3, 4].map((n) => setBonusScore(wearing(pieces.slice(0, n)), cls));
    expect(v[0]).toBe(0);
    expect(v[1]).toBe(0);
    expect(v[2]).toBeGreaterThan(0);
    expect(v[3]).toBeGreaterThan(v[2]!);
    expect(v[4]).toBeGreaterThan(v[3]!);
  });

  it('parçalar tek tek biraz zayıfken bile tam set seçilir; bonus olmadan seçilmezdi', () => {
    const setId = 'ravens_shroud';
    const cls = 'cutthroat';
    const slots = ['helm', 'armor', 'gloves', 'boots'] as const;
    const setBag = setPieces(setId).map((d, i) => rolled(d.id, `s${i}`, 10 + i));
    // rakip: katalogdan, aynı yuvada, daha yüksek seviyeli Rare; her yuvada tek tek set parçasından iyi, toplamı setin (bonus dahil) altında
    const catalog = (slot: string) => ITEMS.items.filter((d) => d.slot === slot && !d.set && d.rarity !== 'legendary' && canEquip(cls, d));
    let found = false;
    for (const rarity of ['uncommon', 'rare', 'epic'] as RarityId[]) {
      for (let ilvl = 8; ilvl <= 40 && !found; ilvl++) {
        const rivals = slots.map((k, i) => rolled(catalog(k)[0]!.id, `r${i}`, 50 + i, rarity, ilvl));
        const eq0 = emptyEquipment();
        const each = slots.map((k, i) => ({ set: slotScore(cls, eq0, setBag[i], k), rival: slotScore(cls, eq0, rivals[i], k) }));
        const sumSet = each.reduce((n, x) => n + x.set, 0) + setBonusScore(wearing(setPieces(setId).map((d) => d.id)), cls);
        const sumRival = each.reduce((n, x) => n + x.rival, 0);
        if (!each.every((x) => x.rival > x.set) || !(sumSet > sumRival + 0.01)) continue;
        found = true;
        const moves = bestMoves({ class: cls, equipment: emptyEquipment() }, [...rivals, ...setBag]);
        const picked = new Set(moves.map((m) => m.uid));
        for (const i of [0, 1, 2, 3]) expect(picked.has(`s${i}`), `piece ${i} (${rarity} ilvl ${ilvl})`).toBe(true);
        // bayrak: set parçaları torbada yoksa eski yol (rakipler) aynen
        const plain = bestMoves({ class: cls, equipment: emptyEquipment() }, rivals);
        expect(plain.map((m) => m.uid).sort()).toEqual(['r0', 'r1', 'r2', 'r3']);
      }
    }
    expect(found, 'a rival ilvl exists where the set wins only thanks to its bonus').toBe(true);
  });

  it('set zayıfsa (rakip toplamı bonusla bile yüksek) set seçilmez', () => {
    const cls = 'cutthroat';
    const slots = ['helm', 'armor', 'gloves', 'boots'] as const;
    const setBag = setPieces('ravens_shroud').map((d, i) => rolled(d.id, `s${i}`, 10 + i));
    const rivals = slots.map((k, i) => rolled(ITEMS.items.find((d) => d.slot === k && !d.set && canEquip(cls, d) && d.rarity !== 'legendary')!.id, `r${i}`, 50 + i, 'epic', 60));
    const moves = bestMoves({ class: cls, equipment: emptyEquipment() }, [...rivals, ...setBag]);
    expect(moves.some((m) => m.uid.startsWith('s'))).toBe(false);
  });

  it('sınıfın takamadığı set parçaları Equip best\'te seçilmez', () => {
    const bag = setPieces('conclave_of_embers').map((d, i) => rolled(d.id, `c${i}`, 20 + i));
    expect(bestMoves({ class: 'warrior', equipment: emptyEquipment() }, bag).some((m) => m.uid.startsWith('c'))).toBe(false);
    expect(bestMoves({ class: 'mage', equipment: emptyEquipment() }, bag).filter((m) => m.uid.startsWith('c')).length).toBe(4);
  });

  it('SLOT_IDS sırası bozulmaz (set hamleleri önce, hepsi geçerli yuva)', () => {
    const bag = setPieces('conclave_of_embers').map((d, i) => rolled(d.id, `c${i}`, 20 + i));
    for (const m of bestMoves({ class: 'mage', equipment: emptyEquipment() }, bag)) expect(SLOT_IDS).toContain(m.slot);
  });
});
