import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  SAVE_VERSION,
  addItem,
  battlePlan,
  equipItem,
  latestSave,
  memoryKV,
  migrateSaves,
  newCampaign,
  normalizeState,
  pickHero,
  readSaves,
  writeSave,
  type CampaignState,
} from '../src/campaign';
import { emptyEquipment } from '../src/progression';

// Kayıt v3 (madde 278): kahraman level / XP / 6 yuva, sefer torbası, altın. Eski kayıtlar (dosya v1/v2, durum v1) bozulmadan taşınır.

/** Bugünkü (v2 durum) bir seferden, aşama 0 öncesi biçimde (durum v1: yeni alanlar yok) kopya üretir. */
function asV1(s: CampaignState): Record<string, unknown> {
  const o = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
  o.version = 1;
  delete o.inventory;
  delete o.gold;
  delete o.nextItemId;
  delete o.lootState;
  delete o.pendingLoot;
  o.roster = (o.roster as Array<Record<string, unknown>>).map(({ level: _l, xp: _x, equipment: _e, ...h }) => h);
  return o;
}

// Yalnızca kahraman seçimi (savaş yok => loot yok: v1 kaydı torbasız olduğu için birebir karşılaştırılabilir)
const played = (seed = 11): CampaignState => pickHero(newCampaign({ mode: 'normal', seed, campaignId: `c${seed}` }), 'mage');

describe('kayıt v3: kahraman kaydı ve geçiş', () => {
  it('yeni sefer: sürüm 2 durum, kahraman level 1 / XP 0 / 6 boş yuva, torba boş, altın 0', () => {
    const s = played();
    expect(s.version).toBe(2);
    expect(SAVE_VERSION).toBe(7); // 4: x2 stat ölçeği (item zarları göçü); 5: affix kademeleri; 6: Valdoria A1-x haritası (2026-10-11); 7: Valor (2026-10-13)
    expect(s.roster[0]).toMatchObject({ level: 1, xp: 0, equipment: emptyEquipment() });
    expect(Object.keys(s.roster[0]!.equipment)).toEqual(['weapon', 'offhand', 'helm', 'armor', 'gloves', 'boots', 'trinket']);
    expect([s.inventory, s.gold, s.nextItemId]).toEqual([[], 0, 1]);
  });

  it('durum v1 -> v2: içerik aynı, yeni alanlar varsayılan; savaş planı aynı', () => {
    const s = played();
    const got = normalizeState(asV1(s), 0)!;
    expect(got).toEqual(s);
    expect(battlePlan(got)).toEqual(battlePlan(s));
  });

  it('dosya v2 (eski harita): yuva kalır, kayıtlar silinir, harita uyarısı; geri yazılınca güncel sürüm; yeni kayıt uyarıyı kaldırır', () => {
    const s = played();
    const kv = memoryKV();
    const old = asV1(s);
    kv.setItem(
      SAVE_KEY,
      JSON.stringify({ version: 2, counter: 1, lastSlot: 0, slots: [{ campaignId: s.campaignId, mode: 'normal', difficulty: 'medium', startedAt: 't', lastPlayed: 't', saves: [{ id: 's1', kind: 'auto', savedAt: 't', mode: 'normal', campaignId: s.campaignId, summary: {}, state: old }] }, null, null] }),
    );
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    expect(r.migrated).toBe(true);
    expect(r.file.slots[0]).toMatchObject({ campaignId: s.campaignId, mode: 'normal', difficulty: 'medium', saves: [], mapChanged: true });
    expect(migrateSaves(kv)).toBe(true);
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(SAVE_VERSION);
    expect(readSaves(kv).migrated).toBe(false);
    expect(readSaves(kv).file.slots[0]!.mapChanged).toBe(true); // uyarı yeni sefer kaydedilene kadar kalır
    expect(latestSave(kv)).toBeNull();
    const fresh = { ...pickHero(newCampaign({ mode: 'normal', seed: 99, campaignId: 'new' }), 'mage'), slot: 0 };
    writeSave(kv, fresh, 'start');
    expect(readSaves(kv).file.slots[0]!.mapChanged).toBeUndefined();
    expect(latestSave(kv)!.state).toEqual(fresh);
  });

  it('dosya v1 (tek liste) de eski harita: yuvaya taşınır, kayıtlar silinir, uyarı', () => {
    const s = played(12);
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, JSON.stringify({ version: 1, counter: 1, saves: [{ id: 's1', kind: 'auto', savedAt: 't', mode: 'normal', campaignId: s.campaignId, summary: {}, state: asV1(s) }] }));
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    expect(r.file.slots[0]).toMatchObject({ campaignId: s.campaignId, saves: [], mapChanged: true });
  });

  it('takılı item, torba ve altın kayıttan aynen döner; bozuk item girdisi atılır, uid sayacı çakışmaz', () => {
    let s = played();
    let r = addItem(s, 'turnshoes');
    s = equipItem(r.state, s.roster[0]!.id, r.item.uid);
    r = addItem(s, 'woodcutters_axe');
    s = { ...r.state, gold: 42 };
    const kv = memoryKV();
    writeSave(kv, s, 'auto');
    expect(latestSave(kv)!.state).toEqual(s);
    const broken = JSON.parse(JSON.stringify(s)) as CampaignState & Record<string, unknown>;
    (broken.inventory as unknown[]).push({ nope: 1 }, null);
    (broken.roster[0]!.equipment as unknown as Record<string, unknown>).helm = 'junk';
    broken.nextItemId = 1;
    const n = normalizeState(broken)!;
    expect(n.inventory.map((i) => i.id)).toEqual(['woodcutters_axe']);
    expect(n.roster[0]!.equipment.helm).toBeNull();
    expect(n.roster[0]!.equipment.boots?.id).toBe('turnshoes');
    expect(n.nextItemId).toBe(3);
  });

  it('bilinmeyen durum sürümü geçersiz', () => {
    const o = asV1(played());
    o.version = 7;
    expect(normalizeState(o)).toBeNull();
  });
});
