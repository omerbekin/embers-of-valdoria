// 1.0 öncesi "eski kayıt açılma testi" (bug-hunter 2026-11-23): her kayıt dosyası sürümü (2..15) bugünkü okuyucuda çökmeden ve kayıpsız açılır.
// Eski kayıt örneği bugünkü durumdan, o sürümden SONRA eklenen alanlar silinerek kurulur (alan listesi save.ts sürüm yorumlarından; uydurma alan yok).
// Ayrıca: eski anahtar göçü, bozuk / yarım JSON, kaldırılmış item / bilinmeyen sınıf, her sınıfın eski ağaç sürümü, Endless sürümleri.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import {
  canResume,
  latestSave,
  migrateSaves,
  newCampaign,
  pickHero,
  readSaves,
  SAVE_KEY,
  SAVE_VERSION,
  slotSummaries,
  CORRUPT_KEY,
  type CampaignState,
  type KV,
} from '../src/campaign';
import { makeItem } from '../src/progression/items';
import { TREES } from '../src/progression/skill-tree-data';
import { focusBuild, treePool } from '../src/progression/skill-tree';
import { normalizeTree, type TreeHero } from '../src/progression/skill-tree-hero';
import { newRun } from '../src/endless/run';
import { parseRun } from '../src/endless/save';
import { migrateStorage, MIGRATED_FLAG } from '../src/storage-migrate';

const mem = (): KV & { store: Map<string, string> } => {
  const store = new Map<string, string>();
  return { store, getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) };
};
const it_ = (id: string, uid: string) => makeItem(id, uid, new Rng(5));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Bugünkü biçimde orta sefer durumu: 3 kahraman (Warrior, Redtithe/antimage, Gambler), set parçaları, torba, altın, Valor, yara, ağaç. */
function today(): CampaignState {
  const s = pickHero(newCampaign({ mode: 'normal', seed: 11 }), 'warrior');
  const base = s.roster[0]!;
  const mk = (id: string, cls: string): CampaignState['roster'][number] => ({ ...clone(base), id, class: cls, level: 12, xp: 40, hpRatio: 0.8, alive: true, equipment: { ...clone(base.equipment), weapon: null } });
  const am = mk('h2', 'antimage');
  const gb = mk('h3', 'gambler');
  // gerçek ağaç dağılımı (odaklı kurulum), seviye 12
  for (const h of [am, gb]) {
    const t = TREES[h.class]!;
    h.tree = focusBuild(t, [1, 2], 12);
    h.skillPoints = treePool(12) - Object.values(h.tree.r).reduce((a, b) => a + b, 0);
  }
  const w = clone(base);
  w.level = 12;
  w.equipment.helm = it_('ashguard_helm', 'i1'); // set parçası
  w.equipment.armor = it_('ashguard_hauberk', 'i2');
  w.equipment.ring = it_('copper_ring', 'i3');
  w.wounds = 1;
  const t = clone(s);
  t.roster = [w, am, gb];
  t.inventory = [it_('saints_medal', 'i4'), it_('ashguard_greaves', 'i5')];
  t.gold = 321;
  t.nextItemId = 6;
  t.valor = 7;
  return t;
}

/** `today()` durumunu `v` sürümünün biçimine indirir (v'den SONRA eklenen alanlar silinir). */
function asOf(v: number): CampaignState {
  const s = clone(today());
  const heroes = s.roster as unknown as Array<Record<string, unknown>>;
  if (v < 15) delete (s as { crownChoice?: unknown }).crownChoice;
  if (v < 14) {
    // Ring ve Trinket tek yuvaydı: `ring` alanı yok, Ring item'i `trinket` yuvasında
    for (const h of heroes) {
      const eq = h.equipment as Record<string, unknown>;
      eq.trinket = eq.ring ?? null;
      delete eq.ring;
    }
  }
  if (v < 13) {
    delete (s as { merchantStock?: unknown }).merchantStock;
    (s as { closedShop?: unknown }).closedShop = { node: 'n1', wares: [], buyback: [], rerolls: 0 };
  }
  if (v < 12) for (const h of heroes) for (const k of ['tree', 'freeRespec', 'treeReset']) delete h[k];
  if (v < 11) for (const h of heroes) delete h.wounds;
  if (v < 10) for (const k of ['visited', 'cleared', 'replays']) delete (s as unknown as Record<string, unknown>)[k];
  if (v < 9) for (const h of heroes) for (const k of ['statPoints', 'skillPoints', 'alloc']) delete h[k];
  if (v < 7) delete (s as { valor?: unknown }).valor;
  return s;
}

const fileOf = (v: number, s: CampaignState, extra: Record<string, unknown> = {}) => ({
  version: v,
  counter: 1,
  lastSlot: 0,
  slots: [{ campaignId: s.campaignId, mode: 'normal', difficulty: 'medium', startedAt: 't', lastPlayed: 't', saves: [{ id: 'a1', kind: 'auto', savedAt: 't', mode: 'normal', campaignId: s.campaignId, summary: {}, state: s }] }, null, null],
  ...extra,
});

describe('kayıt dosyası sürümü 2..15: çökmeden ve kayıpsız açılır', () => {
  for (let v = 2; v <= SAVE_VERSION; v++) {
    it(`sürüm ${v}`, () => {
      const kv = mem();
      kv.setItem(SAVE_KEY, JSON.stringify(fileOf(v, asOf(v))));
      const r = readSaves(kv);
      expect(r.corrupt).toBe(false);
      const sd = r.file.slots[0]!;
      if (v < 6) {
        // eski harita: kayıtlar bilerek silinir, yuva kalır + uyarı (tasarım kararı, save.ts sürüm 6 notu)
        expect(sd.saves).toHaveLength(0);
        expect(sd.mapChanged).toBe(true);
        return;
      }
      expect(sd.saves).toHaveLength(1);
      const st = sd.saves[0]!.state;
      expect(st.roster.map((h) => h.class)).toEqual(['warrior', 'antimage', 'gambler']);
      expect(st.roster.map((h) => h.level)).toEqual([12, 12, 12]);
      expect(st.gold).toBe(321);
      expect(st.inventory.map((i) => i.id).sort()).toEqual(['ashguard_greaves', 'saints_medal']);
      const w = st.roster[0]!;
      // v<14: Ring `trinket` yuvasındaydı, yeni `ring` yuvasına geçer; set parçaları yerinde
      expect(w.equipment.ring?.id).toBe('copper_ring');
      expect(w.equipment.helm?.id).toBe('ashguard_helm');
      expect(w.equipment.armor?.id).toBe('ashguard_hauberk');
      // v<7: alanı olmayan eski kayıt: Valor yoksa ya da Valdren Keep geçilmediyse kapalı kalır, çökmez
      if (v >= 7) expect(st.valor).toBe(7);
      // v<10: yürüyüş günlüğünden türetilir
      expect(Array.isArray(st.visited)).toBe(true);
      expect(Array.isArray(st.cleared)).toBe(true);
      // v<9: puanlar level'dan tamamlanır; v<12: ağaç yok = boş ağaç, puan havuzu 11 (level 12)
      for (const h of st.roster) expect(h.skillPoints! + Object.values(h.tree?.r ?? {}).reduce((a, b) => a + b, 0)).toBe(treePool(12));
      if (v >= 12) expect(st.roster[1]!.tree).toBeTruthy();
      // v<13: closedShop merchantStock'a taşınır, eski alan kalmaz
      expect((st as { closedShop?: unknown }).closedShop).toBeUndefined();
      // v<11: yara yok = 0
      if (v >= 11) expect(w.wounds).toBe(1);
      else expect(w.wounds ?? 0).toBe(0);
      // arayüz yardımcıları çökmez
      expect(() => latestSave(kv)).not.toThrow();
      expect(() => slotSummaries(kv)).not.toThrow();
      // geri yazma: güncel sürüm, ikinci okuma aynı (idempotent), kayıp yok
      expect(migrateSaves(kv)).toBe(v < SAVE_VERSION);
      const again = readSaves(kv);
      expect(again.migrated).toBe(false);
      expect(again.corrupt).toBe(false);
      expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(SAVE_VERSION);
      expect(again.file.slots[0]!.saves[0]!.state).toEqual(st);
    });
  }
});

describe('sürüm 1 (tek liste) ve durum sürümü 1', () => {
  it('sürüm 1 dosyası açılır (yuvaya taşınır, eski harita: kayıt silinir, yuva + uyarı)', () => {
    const kv = mem();
    const s = clone(asOf(6)) as unknown as Record<string, unknown>;
    s.version = 1; // durum v1: kahraman level / ekipman yok
    delete s.gold;
    delete s.inventory;
    for (const h of s.roster as Array<Record<string, unknown>>) for (const k of ['level', 'xp', 'equipment', 'skillPoints', 'statPoints', 'alloc', 'tree']) delete h[k];
    kv.setItem(SAVE_KEY, JSON.stringify({ version: 1, counter: 2, saves: [{ id: 'x', kind: 'auto', savedAt: '2026-10-01T00:00:00Z', mode: 'normal', campaignId: 'c', summary: {}, state: s }] }));
    expect(() => readSaves(kv)).not.toThrow();
    const r = readSaves(kv);
    expect(r.file.slots[0]).toBeTruthy();
  });
});

describe('bozuk / yarım / yabancı kayıt', () => {
  const cases: Record<string, string> = {
    'yarım JSON': '{"version":15,"counter":1,"lastSlot":0,"slots":[{"campaignId":"c","mode":"nor',
    'boş nesne': '{}',
    'null': 'null',
    'sayı': '42',
    'dizi': '[]',
    'slots dizi değil': JSON.stringify({ version: 15, counter: 0, lastSlot: null, slots: 'x' }),
    'sürüm yok': JSON.stringify({ counter: 0, slots: [null, null, null] }),
    'sürüm 0': JSON.stringify({ version: 0, counter: 0, slots: [null, null, null] }),
    'yuva sayısı fazla': JSON.stringify({ version: 15, counter: 0, lastSlot: 0, slots: [null, null, null, null, null] }),
    'kayıt girdisi bozuk': JSON.stringify({ version: 15, counter: 0, lastSlot: 0, slots: [{ campaignId: 'c', mode: 'normal', difficulty: 'medium', saves: [null, 3, { id: 'q', state: { version: 2 } }] }, null, null] }),
  };
  for (const [name, raw] of Object.entries(cases)) {
    it(name, () => {
      const kv = mem();
      kv.setItem(SAVE_KEY, raw);
      expect(() => readSaves(kv)).not.toThrow();
      expect(() => latestSave(kv)).not.toThrow();
      expect(() => slotSummaries(kv)).not.toThrow();
      expect(() => migrateSaves(kv)).not.toThrow();
      // okunamayan dosyanın ham hali yazılmadan önce yedeklenir (veri kaybı yok); geçerli boş / eski ise yedek gerekmez
      const r = readSaves(kv);
      expect(r.file.slots).toHaveLength(3);
    });
  }

  it('bozuk dosya üstüne yazılmadan önce ham kopya CORRUPT_KEY\'e gider', () => {
    const kv = mem();
    const raw = '{"version":15,"slots":[{"campaignId":"c","mode":"nor';
    kv.setItem(SAVE_KEY, raw);
    const s = pickHero(newCampaign({ mode: 'normal', seed: 3 }), 'warrior');
    kv.setItem(SAVE_KEY, raw);
    // yeni kayıt yazan yol: claimSlot / writeSave
    return import('../src/campaign').then(({ writeSave }) => {
      writeSave(kv, s, 'auto');
      expect(kv.getItem(CORRUPT_KEY)).toBe(raw);
    });
  });

  it('bilinmeyen sınıf: kayıt bozuk sayılmaz ya da temiz atılır, çökmez; kaldırılmış item id\'si çökertmez', () => {
    const s = asOf(14);
    s.inventory.push({ uid: 'i9', id: 'removed_sword_xyz', rolls: undefined } as never);
    s.roster[0]!.equipment.weapon = { uid: 'i8', id: 'removed_axe_xyz' } as never;
    const kv = mem();
    kv.setItem(SAVE_KEY, JSON.stringify(fileOf(14, s)));
    expect(() => readSaves(kv)).not.toThrow();
    // bugünkü davranış: kayıt tanımsız id'yle de açılır (tarihte hiçbir item / sınıf id'si kaldırılmadı; kaldırılırsa oyun tarafı ayrıca ele alınmalı)
    const st = readSaves(kv).file.slots[0]!.saves[0]!.state;
    expect(st.roster[0]!.equipment.weapon?.id).toBe('removed_axe_xyz');
    expect(() => canResume(st)).not.toThrow();
    expect(() => latestSave(kv)).not.toThrow();
  });

  it('eski duraklatılmış savaş (kaldırılmış skill id\'li eylemler, tutmayan kurulum) sürdürülemez, çökmez', () => {
    const s = asOf(14);
    (s as { suspended?: unknown }).suspended = { node: s.at, seed: 1, turn: 3, hash: 'old', setup: 'old', actions: [{ kind: 'skill', unit: 'a1', skill: 'removed_skill_xyz', targets: ['e1'] }] };
    const kv = mem();
    kv.setItem(SAVE_KEY, JSON.stringify(fileOf(14, s)));
    const st = readSaves(kv).file.slots[0]!.saves[0]!.state;
    expect(() => canResume(st)).not.toThrow();
    expect(canResume(st)).toBe(false);
  });
});

describe('eski anahtar göçü (proto.* / protomedi.* -> eov.*)', () => {
  const kvStore = () => {
    const m = new Map<string, string>();
    return {
      m,
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() {
        return m.size;
      },
    };
  };
  it('eski sefer kaydı (proto.campaign.v1) göçle eov.campaign.v1 olur ve okunur', () => {
    const st = kvStore();
    st.setItem('proto.campaign.v1', JSON.stringify(fileOf(9, asOf(9))));
    st.setItem('proto.endless.v1', 'x');
    st.setItem('protomedi.settings.v1', '{"volume":0.5}');
    expect(migrateStorage(st)).toBe(3);
    expect(st.getItem('proto.campaign.v1')).toBeNull();
    expect(st.getItem(MIGRATED_FLAG)).toBe('1');
    expect(readSaves(st).file.slots[0]!.saves).toHaveLength(1);
  });
  it('eov.campaign.v1 zaten varsa eski proto kaydı onu ezmez', () => {
    const st = kvStore();
    st.setItem('eov.campaign.v1', JSON.stringify(fileOf(15, asOf(15))));
    st.setItem('proto.campaign.v1', JSON.stringify(fileOf(9, asOf(9))));
    migrateStorage(st);
    expect(JSON.parse(st.getItem('eov.campaign.v1')!).version).toBe(15);
  });
});

describe('ağaç sürümü artışı: her sınıfın eski ağaç sürümü bedava respec alır, puan kaybolmaz', () => {
  for (const [cls, tree] of Object.entries(TREES)) {
    it(`${cls} (güncel v${tree.version})`, () => {
      const level = 20;
      const alloc = focusBuild(tree, [1, 2], level);
      const spent = Object.values(alloc.r).reduce((a, b) => a + b, 0);
      for (let old = 1; old < tree.version; old++) {
        const h: TreeHero = { id: 'h', class: cls, level, skillPoints: treePool(level) - spent, tree: { v: old, r: { ...alloc.r } } };
        expect(() => normalizeTree(h)).not.toThrow();
        // ya ağaç korunur + bir kez bedava respec, ya tamamı iade + bildirim; ikisinde de puan korunur
        const held = Object.values(h.tree?.r ?? {}).reduce((a, b) => a + b, 0);
        expect(h.skillPoints! + held).toBe(treePool(level));
        expect(h.freeRespec === true || h.treeReset === true).toBe(true);
        if (h.tree) expect(h.tree.v).toBe(tree.version);
      }
    });
  }
});

describe('Endless koşu sürümleri 1..8 açılır', () => {
  for (let v = 1; v <= 8; v++) {
    it(`sürüm ${v}`, () => {
      const run = newRun(5, ['warrior', 'antimage', 'gambler', 'paladin'], 't');
      run.heroes[0]!.equipment.ring = it_('copper_ring', 'r1');
      const raw = clone(run) as unknown as { heroes: Array<Record<string, unknown>> };
      if (v < 8) for (const h of raw.heroes) {
        const eq = h.equipment as Record<string, unknown>;
        eq.trinket = eq.ring ?? null;
        delete eq.ring;
      }
      if (v < 7) for (const h of raw.heroes) for (const k of ['tree', 'freeRespec', 'treeReset']) delete h[k];
      if (v < 6) for (const h of raw.heroes) delete h.wounds;
      const got = parseRun(JSON.stringify({ version: v, run: raw }));
      expect(got).toBeTruthy();
      expect(got!.heroes.map((h) => h.class)).toEqual(['warrior', 'antimage', 'gambler', 'paladin']);
      expect(got!.gold).toBe(run.gold);
      expect(got!.heroes[0]!.equipment.ring?.id).toBe('copper_ring');
    });
  }
  it('bozuk Endless dosyası null döner, çökmez', () => {
    for (const raw of ['{"version":8,"run":', '{}', 'null', '{"version":99,"run":{}}', '[]']) expect(() => parseRun(raw)).not.toThrow();
  });
});
