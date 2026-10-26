import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  ENCOUNTERS,
  SAVE_VERSION,
  TREASURES,
  autoResolve,
  battlePlan,
  choicePoints,
  completeSimple,
  debugTeleport,
  getMap,
  grantLoot,
  isCleared,
  moveTo,
  newCampaign,
  nextStep,
  node,
  nodeLevel,
  nodeVisibility,
  normalizeState,
  activeHeroes,
  treasureGiftRarity,
  validateTreasures,
  type CampaignState,
} from '../src/campaign';
import { content } from '../src/engine';
import { REGION_VIEW, regionBounds, regionSets, regionZoom } from '../src/game/region-view';
import type { NodeVis } from '../src/campaign/fog';

// Harita 1 (Valdoria) yeniden çizim + genişletme (Ömer onayı 2026-10-22; docs/design/campaign/map-1-rework.md).

const map = getMap('valdoria');
const NEW = ['hills', 'hoard', 'shrine', 'wagons', 'hamlet', 'deserters'];
const fresh = (seed = 31) => newCampaign({ mode: 'normal', seed });

function finish(s: CampaignState): CampaignState {
  let t = s;
  for (let g = 0; g < 30 && nextStep(t).kind !== 'move' && nextStep(t).kind !== 'complete'; g++) t = autoResolve(t);
  return t;
}
const at = (id: string) => finish(debugTeleport(fresh(), id));

/** Eski (yeniden çizim öncesi) kayıt taklidi: yeni düğüm kimlikleri durumun her yerinden silinir. */
function strip(x: unknown): unknown {
  const bad = (v: string) => NEW.some((id) => v === id || v.startsWith(`${id}:`));
  if (Array.isArray(x)) return x.filter((v) => !(typeof v === 'string' && bad(v))).map(strip);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).filter(([k]) => !bad(k)).map(([k, v]) => [k, strip(v)]));
  return x;
}
const oldSave = (s: CampaignState): CampaignState => normalizeState(strip(JSON.parse(JSON.stringify(s))), 0)!;

describe('Harita 1 yeniden çizim: veri', () => {
  it('blurb sayıları graftan (33 durak, 6 seçim noktası, 22 durak / sefer); kayıt sürümü değişmedi (12)', () => {
    expect(map.blurb).toBe(`From Mill Road to Castle Morvane: ${map.nodes.length} stops, ${choicePoints(map).length} choice points, ${map.stopsPerRun} stops per run.`);
    expect(SAVE_VERSION).toBe(12);
  });

  it('eski 27 düğümün seviyesi aynen; yeni düğümler planlanan seviyede (Deserters\' Camp final ile aynı L10)', () => {
    const old: Record<string, number> = { 1: 1, 2: 1, 3: 1, 4: 1, moor: 1, cairn: 1, '5B': 2, charcoal: 2, 7: 2, '6B': 3, '6A': 3, '5A': 3, grave: 3, pilgrim: 4, '8A': 4, '8C': 4, river: 5, 9: 6, 10: 6, '11B': 7, thorn: 7, camp: 7, road: 8, fold: 8, head: 9, gate: 9, 12: 10 };
    for (const [id, lv] of Object.entries(old)) expect(nodeLevel('valdoria', id), id).toBe(lv);
    const neu: Record<string, number> = { hills: 1, hoard: 1, shrine: 3, wagons: 7, hamlet: 8, deserters: 10 };
    for (const [id, lv] of Object.entries(neu)) expect(nodeLevel('valdoria', id), id).toBe(lv);
  });

  it('yeni karşılaşmalar: var olan class\'lar, elle yazılmış 2 dalga; elit lider (Deserter Captain = Bandit Chief) son dalgada, ayrı sprite anahtarı veride', () => {
    const units = (id: string) => [...ENCOUNTERS[id]!.units, ...(ENCOUNTERS[id]!.waves ?? []).flatMap((w) => w.units)];
    const known = (c: string) => !!(content.mobs[c] ?? content.bosses[c] ?? content.summons[c] ?? content.classes[c]);
    for (const id of NEW) {
      const enc = node(map, id).encounter!;
      expect(ENCOUNTERS[enc], id).toBeDefined();
      expect(ENCOUNTERS[enc]!.waves, id).toHaveLength(1); // normal 2, elit 2 dalga (waves.md)
      for (const u of units(enc)) expect(known(u.class), `${enc} ${u.class}`).toBe(true);
    }
    const des = ENCOUNTERS[node(map, 'deserters').encounter!]!;
    const lead = des.waves![0]!.units.find((u) => u.tier === 'elite')!;
    expect([lead.class, lead.name, lead.sprite]).toEqual(['bandit_chief', 'Deserter Captain', 'deserter_captain']);
    expect(des.units.some((u) => u.tier)).toBe(false);
    // eşlikçileri Watchtower'dakilerden (Poacher + Ember Acolyte) farklı
    expect(units('deserters_camp').some((u) => u.class === 'ravenwood_poacher' || u.class === 'ember_acolyte')).toBe(false);
  });

  it('yeni düğümlerde savaş kurulur (dalgalı); Deserter Captain motorda Bandit Chief olarak, kendi adıyla', () => {
    for (const id of NEW) {
      const s = debugTeleport(fresh(), id);
      expect(nextStep(s).kind, id).toBe('battle');
      const plan = battlePlan(s);
      expect(plan.waves?.length, id).toBe(1);
    }
    const plan = battlePlan(debugTeleport(fresh(), 'deserters'));
    const lead = Object.values(plan.waves![0]!.units).find((u) => u.tier === 'elite')!;
    expect(lead.displayName).toBe('Deserter Captain');
  });

  it('eğitim ölçeği düğüm listesi (skipNodes 1-4): bölge I\'e taşınan dört düğüm eskisi gibi ölçekli', () => {
    expect(CONFIG.enemyScale?.skipNodes).toEqual(['1', '2', '3', '4']);
    const es = CONFIG.enemyScale!;
    for (const id of ['moor', 'cairn', '5B', 'charcoal']) {
      const scaled = battlePlan(debugTeleport(fresh(), id));
      const keep = es.skipNodes;
      es.skipNodes = [...keep!, id];
      try {
        const raw = battlePlan(debugTeleport(fresh(), id));
        const slot = Number(Object.keys(raw.units.enemies)[0]);
        expect(scaled.units.enemies[slot]!.modifiers!.powerMult! / raw.units.enemies[slot]!.modifiers!.powerMult!, id).toBeCloseTo(es.all!.powerMult! * (es.regions?.I ?? 1), 2);
      } finally {
        es.skipNodes = keep;
      }
    }
  });
});

describe('Harita 1 yeniden çizim: cepler', () => {
  it('cebe girilir, savaş + sandık; sonra yalnız geri yol (ileri yol yok), ana yol kapanmaz', () => {
    let s = moveTo(at('moor'), 'hoard');
    expect(nextStep(s)).toEqual({ kind: 'battle', node: 'hoard', encounter: 'hoard_guards' });
    s = autoResolve(s);
    expect(nextStep(s)).toEqual({ kind: 'treasure', node: 'hoard', treasure: 'raiders_hoard' });
    s = completeSimple(s, 'treasure');
    expect(nextStep(s)).toEqual({ kind: 'move', options: [], back: ['moor'] });
    s = moveTo(s, 'moor');
    const st = nextStep(s);
    expect(st.kind === 'move' && st.options).toEqual(['cairn', 'hoard']);
  });

  it('hazine içerikleri (3a + 417): Hoard 1 item + Uncommon hediye + 68 altın; Shrine / Wagons standart + Uncommon hediye + 15 altın; Mine / Abbey standart + Uncommon hediye, altın yok', () => {
    const chest = (id: string) => {
      const s = autoResolve(debugTeleport(fresh(), id)); // koruma savaşı kazanıldı, sandık sırada
      expect(nextStep(s).kind, id).toBe('treasure');
      // aynı zarla standart sandık (karşılaştırma)
      const std = JSON.parse(JSON.stringify(s)) as CampaignState;
      std.pendingLoot = undefined;
      const base = grantLoot(std, id, 'treasure', activeHeroes(std));
      // koruma savaşının ganimeti aynı kartta (tek Spoils kartı): sandığın payı = kart farkı
      const before = s.pendingLoot;
      const t = completeSimple(s, 'treasure');
      const loot = t.pendingLoot!;
      const newIds = loot.items.filter((uid) => !(before?.items ?? []).includes(uid));
      const items = [...newIds.map((uid) => t.inventory.find((i) => i.uid === uid)!), ...(loot.left ?? []).slice(before?.left?.length ?? 0).map((x) => ({ id: x }))];
      return { base: base.items.length + (base.left?.length ?? 0), items, gold: loot.gold - (before?.gold ?? 0), t };
    };
    // Korunan hazine ödülü (Ömer 2026-10-25, open-questions 417): her sandığa Uncommon hediye (+1 item ya da nadirlik yükseltmesi), altın x1,5
    expect(TREASURES.raiders_hoard!.loot).toEqual({ maxItems: 1, gold: 68, gift: 'uncommon' });
    const hoard = chest('hoard');
    expect(hoard.items).toHaveLength(Math.min(1, hoard.base) + 1);
    expect(hoard.gold).toBe(68);
    const shrine = chest('shrine');
    expect(shrine.items).toHaveLength(shrine.base + 1);
    expect(shrine.gold).toBe(15);
    const wagons = chest('wagons');
    expect(wagons.items).toHaveLength(wagons.base + 1);
    expect(wagons.gold).toBe(15);
    // eski hazineler: standart sandık + Uncommon hediye, ALTIN YOK (revizyon 2026-10-25: standart altın zarı da 0)
    const mine = chest('6B');
    expect(mine.items).toHaveLength(mine.base + 1);
    expect(mine.gold).toBe(0);
    const vault = chest('8A');
    expect(vault.items).toHaveLength(vault.base + 1);
    expect(vault.gold).toBe(0);
    const rarityOf = (i: unknown) => (i as { rolls?: { rarity?: string } }).rolls?.rarity;
    for (const c of [hoard, shrine, wagons]) expect(c.items.some((i) => rarityOf(i) === 'uncommon')).toBe(true);
    // Mine / Abbey hediyesi: seed'li zarla Uncommon ya da Rare (open-questions 417)
    for (const [c, id] of [[mine, '6B'], [vault, '8A']] as const) {
      const want = treasureGiftRarity(c.t, id, 'uncommon', { rarity: 'rare', chance: 0.35 });
      expect(c.items.some((i) => rarityOf(i) === want), id).toBe(true);
    }
  });
});

// Ömer onayı 2026-10-25 ("ekle bakalım", open-questions 417): hazine hediyesine şanslı nadirlik (giftUpgrade)
describe('Korunan hazine: hediyenin Rare şansı (giftUpgrade)', () => {
  it('veri: yalnız Mine / Abbey %35 Rare (taban Uncommon, altın 0); diğer üç sandıkta yok; şekil denetimi temiz', () => {
    expect(validateTreasures()).toEqual([]);
    for (const id of ['dwarven_mine', 'relic_vault']) expect(TREASURES[id]!.loot).toEqual({ gold: 0, gift: 'uncommon', giftUpgrade: { rarity: 'rare', chance: 0.35 } });
    for (const id of ['raiders_hoard', 'sunken_shrine', 'supply_wagons']) expect(TREASURES[id]!.loot!.giftUpgrade).toBeUndefined();
    // denetim bozuk veriyi yakalar
    expect(validateTreasures({ x: { title: '', text: '', loot: { giftUpgrade: { rarity: 'rare', chance: 1.2 } } } } as never).length).toBe(2);
    expect(validateTreasures({ x: { title: '', text: '', loot: { gift: 'rare', giftUpgrade: { rarity: 'uncommon', chance: 0.5 } } } } as never).length).toBe(1);
  });

  it('deterministik: aynı sefer + düğüm = aynı sonuç (deneme / yükleme değiştirmez); sandık açılışı aynı item\'i verir', () => {
    const up = { rarity: 'rare' as const, chance: 0.35 };
    const s = fresh(77);
    const a = treasureGiftRarity(s, '6B', 'uncommon', up);
    for (let i = 0; i < 5; i++) expect(treasureGiftRarity(JSON.parse(JSON.stringify(s)) as CampaignState, '6B', 'uncommon', up)).toBe(a);
    const open = () => {
      const r = autoResolve(debugTeleport(fresh(77), '6B'));
      const t = completeSimple(r, 'treasure');
      return t.inventory.map((i) => `${i.id}:${i.rolls?.rarity ?? ''}`).sort();
    };
    expect(open()).toEqual(open());
    expect(treasureGiftRarity(s, '6B', 'uncommon')).toBe('uncommon'); // upgrade yoksa taban
  });

  it('dağılım: çok sayıda seed\'de yaklaşık %35 Rare, gerisi Uncommon', () => {
    const up = { rarity: 'rare' as const, chance: 0.35 };
    let rare = 0;
    const N = 4000;
    for (let seed = 1; seed <= N; seed++) {
      const r = treasureGiftRarity({ seed, mapId: 'valdoria' }, seed % 2 ? '6B' : '8A', 'uncommon', up);
      expect(['uncommon', 'rare']).toContain(r);
      if (r === 'rare') rare++;
    }
    expect(rare / N).toBeGreaterThan(0.31);
    expect(rare / N).toBeLessThan(0.39);
  });
});

describe('Harita 1 yeniden çizim: eski kayıt uyumu (yeni id\'ler kayıtta yok)', () => {
  it('Ashford\'da duran eski kayıt: yeni çatal doğrudan çıkar (Windy Moor / Brackenridge), Brackenridge\'de savaş', () => {
    const s = oldSave(at('4'));
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['moor', 'hills'] });
    const t = moveTo(s, 'hills');
    expect(nextStep(t)).toEqual({ kind: 'battle', node: 'hills', encounter: 'brackenridge' });
    expect(finish(moveTo(finish(t), 'cairn')).at).toBe('cairn');
  });

  it('Valdren Keep\'te duran eski kayıt açılır ve ilerler; geride kalan yeni kol / cep temizlenmemiş', () => {
    const s = oldSave(at('7'));
    expect(s.at).toBe('7');
    for (const id of NEW) expect(isCleared(s, id), id).toBe(false);
    const st = nextStep(s);
    expect(st.kind).toBe('move');
    if (st.kind === 'move') expect([...st.options].sort()).toEqual(['5A', '6A', '6B']);
    expect(finish(moveTo(s, '5A')).at).toBe('5A');
  });

  it('Ember Road\'da duran eski kayıt: Shepherd\'s Fold ya da Burnt Hamlet; Burnt Hamlet\'te savaş, sonra Riverhead', () => {
    const s = oldSave(at('road'));
    const st = nextStep(s);
    expect(st.kind === 'move' && st.options).toEqual(['fold', 'hamlet']);
    const t = finish(moveTo(s, 'hamlet'));
    expect(isCleared(t, 'hamlet')).toBe(true);
    expect(finish(moveTo(t, 'head')).at).toBe('head');
  });

  it('Castle Morvane önündeki (Gate of Cinders) eski kayıt: final ve Deserters\' Camp cebi', () => {
    const s = oldSave(at('gate'));
    const st = nextStep(s);
    expect(st.kind === 'move' && st.options).toEqual(['12', 'deserters']);
    expect(nextStep(moveTo(s, '12')).kind).toBe('battle');
  });
});

describe('bölge görünümü (src/game/region-view.ts)', () => {
  const all = (v: NodeVis) => Object.fromEntries(map.nodes.map((n) => [n.id, v])) as Record<string, NodeVis>;
  const P = (id: string) => ({ x: node(map, id).pos[0] * 1920, y: node(map, id).pos[1] * 1080 });

  it('bölgenin düğümleri + komşu bölgenin bağlantı düğümleri (silik); cepler komşu sayılmaz', () => {
    const I = regionSets(map, 'I', all('far'));
    expect([...I.inside].sort()).toEqual(['1', '2', '3', '4', '5B', 'cairn', 'charcoal', 'hillcamp', 'hills', 'hoard', 'moor']);
    expect([...I.ghosts]).toEqual(['7']);
    const II = regionSets(map, 'II', all('far'));
    expect([...II.ghosts].sort()).toEqual(['10', '5B', 'charcoal']);
    expect(II.ghostRoads.map((e) => `${e.from}>${e.to}`).sort()).toEqual(['5B>7', '9>10', 'charcoal>7']);
    const III = regionSets(map, 'III', all('far'));
    expect([...III.ghosts]).toEqual(['9']);
    for (const r of [I, II, III]) for (const e of r.roads) expect(r.inside.has(e.from) && r.inside.has(e.to)).toBe(true);
  });

  it('kilitli (görülmemiş) bölgenin düğümü gösterilmez: oyunun başında bölge I\'den Valdren Keep görünmez', () => {
    const vis = nodeVisibility(map, fresh());
    expect(regionSets(map, 'I', vis).ghosts.size).toBe(0);
    const keep = nodeVisibility(map, at('charcoal'));
    expect([...regionSets(map, 'I', keep).ghosts]).toEqual(['7']);
  });

  it('yakınlaştırma: bölge sığar, görseli her zaman kaplar (kenarda siyah yok), üst sınırı aşmaz', () => {
    const frame = { left: 0, right: 1920, top: 0, bottom: 1080 };
    for (const r of ['I', 'II', 'III']) {
      const b = regionBounds(map, r, P);
      for (const view of [{ w: 1920, h: 1080 }, { w: 2580, h: 1080 }, { w: 1920, h: 1440 }]) {
        const z = regionZoom(b, view, frame);
        expect(z).toBeGreaterThanOrEqual(Math.max(view.w / 1920, view.h / 1080) - 1e-9);
        expect(z).toBeLessThanOrEqual(Math.max(REGION_VIEW.maxZoom, view.w / 1920, view.h / 1080));
        expect(z).toBeGreaterThanOrEqual(1);
      }
      // 16:9'da bölge kutusu görünüme sığar (ya da üst sınır)
      const z = regionZoom(b, { w: 1920, h: 1080 }, frame);
      expect(Math.min(z * (b.right - b.left) <= 1920 + 1e-6 ? 1 : 0, z * (b.bottom - b.top) <= 1080 + 1e-6 ? 1 : 0)).toBe(1);
    }
  });
});
