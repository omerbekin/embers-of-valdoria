import { describe, expect, it } from 'vitest';
import { SAVE_KEY, addItem, memoryKV, migrateSaves, newCampaign, pickHero, readSaves, writeSave } from '../src/campaign';
import { content } from '../src/engine';
import { newRun, parseRun, saveRun, SAVE_VERSION as ENDLESS_SAVE_VERSION, SCORES_VERSION, loadScores, RUN_KEY, SCORES_KEY } from '../src/endless';
import { migrateItemRolls, migrateRollsX2, rolledAffixes, SCALED_ITEM_STATS } from '../src/progression/items';

// x2 stat ölçeği (Ömer onayı 2026-10-10): eski kayıtlardaki item zarlarının ölçekli statları (STR/DEX/INT/LUCK, zırh, büyü zırhı, hız) x2'ye taşınır;
// diğer zarlar (can, MP, kritik...) aynı kalır. Affix kademeleri (Ömer 2026-10-11): sonra eski stat zarları en yakın affix biçimine çevrilir
// (sefer kaydı sürüm 5, Endless koşu kaydı sürüm 4); skor listesi etkilenmez.

describe('x2 stat ölçeği: veri ve kayıt göçü', () => {
  it('veri: statScale 2, katsayılar yarı, zırh k ve sıra eşiği iki kat', () => {
    const f = content.formulas;
    expect(f.statScale).toBe(2);
    expect(f.armor.k).toBe(60);
    expect(f.turn.threshold).toBe(200);
    expect(f.attributes.hpPerStr).toBe(3);
    expect(f.attributes.mpPerInt).toBe(1);
    expect(f.attributes.dexPerEvasionStep).toBe(10);
    expect(f.scaling).toEqual({ str: 1, dex: 1, int: 1, luck: 1 }); // skill güçleri veride yarıya indi, ölçek çarpanı aynı
  });

  it('migrateRollsX2: yalnızca ölçekli stat zarları x2; iç içe her item örneği; sayı döner', () => {
    const tree = { a: { uid: 'u1', id: 'riveted_mail', rolls: { armor: 2, hp: 3 } }, list: [{ uid: 'u2', id: 'arming_sword', rolls: { str: 1, crit: 1 } }, { uid: 'u3', id: 'turnshoes' }] };
    expect(migrateRollsX2(tree)).toBe(2);
    expect(tree.a.rolls).toEqual({ armor: 4, hp: 3 });
    expect(tree.list[0]!.rolls).toEqual({ str: 2, crit: 1 });
    expect(SCALED_ITEM_STATS).toEqual(['str', 'dex', 'int', 'luck', 'armor', 'magicArmor', 'spd']);
    // yeni biçimli zarlara dokunmaz
    const fresh = { uid: 'u9', id: 'riveted_mail', rolls: { rarity: 'uncommon', affixes: [{ id: 'c_armor', q: 0.5 }] } };
    expect(migrateRollsX2(fresh)).toBe(0);
    // affix göçü: x2'den sonra en yakın affix biçimi (eski statlara karşılık gelen affix'ler)
    expect(migrateItemRolls(tree)).toBe(3);
    expect(rolledAffixes(tree.a).map((a) => a.id)).toEqual(['c_armor', 'c_hp']);
  });

  it('sefer kaydı v3 -> güncel: eski zarlar en yakın affix biçimine (bir kez), geri yazılınca sürüm 5', () => {
    const kv = memoryKV();
    let s = pickHero(newCampaign({ mode: 'normal', seed: 9, campaignId: 'm1' }), 'warrior');
    s = addItem(s, 'riveted_mail').state;
    writeSave(kv, s, 'manual', 't');
    // eski (v3, x1 ölçek) kaydı taklit et: dosya sürümü 3, zarlar eski ölçekte
    const raw = JSON.parse(kv.getItem(SAVE_KEY)!);
    raw.version = 3;
    raw.slots[0].saves[0].state.inventory[0].rolls = { armor: 2, hp: 3 };
    kv.setItem(SAVE_KEY, JSON.stringify(raw));
    const r = readSaves(kv);
    expect(r.migrated).toBe(true);
    const migrated = r.file.slots[0]!.saves[0]!.state.inventory[0]!;
    expect(migrated.rolls!.affixes.map((a) => a.id)).toEqual(['c_armor', 'c_hp']);
    expect(migrateSaves(kv)).toBe(true);
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(5);
    const again = readSaves(kv);
    expect(again.migrated).toBe(false);
    expect(again.file.slots[0]!.saves[0]!.state.inventory[0]!.rolls).toEqual(migrated.rolls); // ikinci kez değişmez
  });

  it('Endless koşu kaydı v1 -> güncel: zarlar x2, yarım savaş atılır; güncel sürüm aynen okunur; skor listesi sürüm 1 kalır', () => {
    expect(ENDLESS_SAVE_VERSION).toBe(4); // 3: sürekli akış (madde 300); 4: affix kademeleri (2026-10-11)
    expect(SCORES_VERSION).toBe(1);
    const run = newRun(5, ['warrior', 'mage', 'archer', 'paladin'], '2026-10-10T00:00:00.000Z');
    const legacy = { ...run, bag: [{ uid: 'b1', id: 'riveted_mail', rolls: { armor: 3, hp: 4 } }], suspended: { wave: 1, seed: 1, actions: [], turn: 0, hash: 'x' } };
    const back = parseRun(JSON.stringify({ version: 1, run: legacy }))!;
    expect(back.bag![0]!.rolls!.affixes.map((a) => a.id)).toEqual(['c_armor', 'c_hp']);
    expect(back.suspended).toBeUndefined();
    const kv = memoryKV();
    saveRun(kv, back);
    expect(JSON.parse(kv.getItem(RUN_KEY)!).version).toBe(4);
    expect(parseRun(kv.getItem(RUN_KEY))!.bag![0]!.rolls).toEqual(back.bag![0]!.rolls); // güncel sürüm: zar göçü yok
    kv.setItem(SCORES_KEY, JSON.stringify({ version: 1, scores: [] }));
    expect(loadScores(kv)).toEqual([]);
  });
});
