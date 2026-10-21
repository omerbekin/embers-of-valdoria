import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  SAVE_KEY,
  SAVE_VERSION,
  activeHeroes,
  applyBattle,
  autoResolve,
  battlePlan,
  battleXp,
  cancelPatrol,
  canReplay,
  clearedNodes,
  clearedProgress,
  debugResetReplays,
  debugRoamTeleport,
  debugTeleport,
  getMap,
  isCleared,
  memoryKV,
  moveTo,
  newCampaign,
  nextReplayMult,
  nextStep,
  node,
  nodeVisibility,
  normalizeState,
  patrolAvailable,
  patrolRetreatConfirm,
  patrolRetreatMaxLoss,
  readSaves,
  retreatPatrol,
  replayMult,
  roamOpen,
  startPatrol,
  travelRoute,
  travelRoutes,
  tutorialNodes,
  visitedNodes,
  writeSave,
  type CampaignState,
} from '../src/campaign';
import { totalXpFor } from '../src/progression/levels';

// Serbest dolaşım ve devriye (roadmap 2.1-2.4, 2.6, 2.7; Ömer kararları 2026-10-09: 1, 4, 5). Kurallar src/campaign/state.ts, sis fog.ts, kayıt save.ts.

const map = getMap('valdoria');
const fresh = (seed = 21) => newCampaign({ mode: 'normal', seed });

/** Düğümün tüm adımlarını otomatik çözer (yola çıkılabilene kadar). */
function finish(s: CampaignState): CampaignState {
  let t = s;
  for (let g = 0; g < 30 && nextStep(t).kind !== 'move' && nextStep(t).kind !== 'complete'; g++) t = autoResolve(t);
  return t;
}

/** Ashford'dan sonra (serbest dolaşım açık) belirtilen sırayla yürür, her düğümü bitirir. */
function walk(s: CampaignState, ...ids: string[]): CampaignState {
  let t = finish(s);
  for (const id of ids) t = finish(moveTo(t, id));
  return t;
}

const afterAshford = (seed = 21): CampaignState => finish(debugTeleport(fresh(seed), '4'));
const total = (s: CampaignState, id: string): number => {
  const h = s.roster.find((x) => x.id === id)!;
  return totalXpFor(h.level) + h.xp;
};

describe('serbest dolaşım: tutorial tek yön, sonra iki yönlü yollar', () => {
  it('tutorial düğümleri (Mill Road, Ravenwood, Watchtower) bölük kurma düğümünün (Ashford) öncesi; orada yollar tek yönlü', () => {
    expect([...tutorialNodes(map)].sort()).toEqual(['1', '2', '3']);
    let s = finish(debugTeleport(fresh(), '2'));
    expect(roamOpen(s)).toBe(false);
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['3'] });
    expect(() => moveTo(s, '1')).toThrow();
    s = afterAshford();
    expect(roamOpen(s)).toBe(true);
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['moor'] }); // Watchtower'a geri dönülmez
    expect(() => moveTo(s, '3')).toThrow();
    for (const id of ['1', '2', '3']) {
      expect(isCleared(s, id)).toBe(true);
      expect(canReplay(map, node(map, id))).toBe(false);
      expect(patrolAvailable(s, id)).toBe(false);
    }
  });

  it('kenarlar iki yönlü: seçim noktasında seçilmeyen dal kapanmaz, geri dönülüp girilir', () => {
    let s = walk(afterAshford(), 'moor', 'cairn', 'charcoal');
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['7'], back: ['cairn'] });
    s = walk(s, 'cairn', '5B');
    expect(s.at).toBe('5B');
    expect(isCleared(s, '5B')).toBe(true);
    expect(visitedNodes(s)).toEqual(['1', '2', '3', '4', 'moor', 'cairn', 'charcoal', '5B']);
  });

  it('yolculuk: temizlenmiş düğümlerden geçerek tek hamlede uzak düğüme; aradakiler tetiklenmez, yol günlüğe yazılır', () => {
    let s = walk(afterAshford(), 'moor', 'cairn', 'charcoal', '7', '6B');
    const routes = travelRoutes(s);
    expect(routes.get('5B')).toEqual(['7', '5B']); // 7 temizlendi; 5B ona komşu (en kısa yol)
    expect(travelRoute(s, '4')).toEqual(['7', 'charcoal', 'cairn', 'moor', '4']);
    // temizlenmemiş düğümün ötesine geçilmez: 5A temizlenmedi, grave'e 6B'den tek hamle (komşu)
    expect(travelRoute(s, 'grave')).toEqual(['grave']);
    expect(routes.has('pilgrim')).toBe(false);
    // Ashford'a yolculuk: aradaki düğümlerde hiçbir adım açılmaz; tekrar ziyarette varış şifası YOK (karar 364: bedava dinlenme ilk varıştaydı)
    const hurt = { ...s, roster: s.roster.map((h) => ({ ...h, hpRatio: 0.3 })) };
    const t = moveTo(hurt, '4');
    expect(t.at).toBe('4');
    expect(t.path.slice(-5)).toEqual(['7', 'charcoal', 'cairn', 'moor', '4']);
    expect(nextStep(t).kind).toBe('move'); // kasaba temizlenmiş: yeniden giriş isteğe bağlı
    expect(t.roster.filter((h) => h.alive).every((h) => h.hpRatio === 0.3)).toBe(true);
    // tutorial düğümleri yolculuk hedefi değil
    expect(travelRoutes(t).has('3')).toBe(false);
  });

  it('final düğümü temizlenince sefer biter (complete), serbest dolaşım ilk düğümün içeriğini değiştirmez', () => {
    const s = finish(debugTeleport(fresh(), '12'));
    expect(nextStep(s).kind).toBe('complete');
  });
});

describe('sis: iki yönlü mesafe, keşfedilen kalır', () => {
  it('d = 1 her iki yönde tam bilgi; bir kez görülen düğüm uzaklaşınca sise dönmez', () => {
    let s = walk(afterAshford(), 'moor', 'cairn', 'charcoal');
    let v = nodeVisibility(map, s);
    expect(v['5B']).toBe('far');
    expect(v['7']).toBe('near');
    s = walk(s, '7', '6B', 'grave');
    v = nodeVisibility(map, s);
    expect(v['5B']).toBe('far'); // görüldü: sis yok (mesafe artık 4)
    expect(v['8A']).toBe('far');
    expect(v['10']).toBe('fog');
    expect(v['12']).toBe('goal');
    expect(Object.values(v)).not.toContain('closed');
  });
});

describe('devriye (yeniden oynama) ve azalan getiri', () => {
  it('temizlenmiş Battle / Elite / korunan hazine yeniden oynanır; Boss, olay (korunan olay dahil), saf hazine, kasaba hayır', () => {
    const ok = map.nodes.filter((n) => canReplay(map, n)).map((n) => n.id).sort();
    for (const id of ok) expect(['battle', 'elite', 'treasure']).toContain(node(map, id).type);
    expect(ok).toContain('6B'); // Dwarven Mine (korunan hazine)
    expect(ok).toContain('8C'); // elit
    expect(ok).not.toContain('9'); // boss
    expect(ok).not.toContain('6A'); // Witch's Hut: korunan olay, bir kez
    expect(ok).not.toContain('3'); // tutorial eliti
    expect(ok.some((id) => node(map, id).type === 'treasure' && !node(map, id).encounter)).toBe(false);
  });

  it('devriye: aynı karşılaşma, seed oynama sayısını içerir; zafer sayacı artar, XP %60 / %40 / %25 (taban), sandık yok', () => {
    let s = walk(afterAshford(), 'moor', 'cairn', 'charcoal', '7', '6B');
    expect(nextStep(s).kind).toBe('move');
    expect(patrolAvailable(s)).toBe(true);
    expect(nextReplayMult(s, '6B')).toBe(CONFIG.replay!.xp[1]);
    const firstSeed = battlePlan({ ...s, patrol: undefined }).seed;
    s = startPatrol(s);
    const step = nextStep(s);
    expect(step).toEqual({ kind: 'battle', node: '6B', encounter: node(map, '6B').encounter, patrol: true });
    const plan = battlePlan(s);
    expect(plan.encounterId).toBe(node(map, '6B').encounter);
    expect(plan.seed).not.toBe(firstSeed);
    for (let i = 1; i <= 5; i++) {
      if (i > 1) s = startPatrol(s);
      const outcome = { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 1, alive: true })) };
      const gains = battleXp(s, outcome, node(map, '6B').encounter!);
      const before = new Map(s.roster.map((h) => [h.id, total(s, h.id)]));
      const clears = s.lootState.clears['6B:battle'] ?? 0;
      const t = applyBattle(s, outcome);
      const k = replayMult(i);
      expect(k).toBe(CONFIG.replay!.xp[Math.min(i, CONFIG.replay!.xp.length - 1)]);
      for (const [id, g] of Object.entries(gains)) expect(total(t, id) - before.get(id)!).toBe(Math.round(g * k));
      expect(t.replays['6B']).toBe(i);
      expect(t.lootState.clears['6B:battle']).toBe(clears + 1); // altın / item çarpanı loot.ts'te (items.json > loot.repeat)
      expect(t.lootState.clears['6B:treasure']).toBe(1); // sandık yalnızca ilk zaferde
      expect(t.patrol).toBeUndefined();
      expect(nextStep(t).kind).toBe('move');
      s = t;
    }
    expect(replayMult(99)).toBe(CONFIG.replay!.xp.at(-1));
  });

  it('boss ve olay düğümünde devriye başlatılamaz; başlatılmış devriye savaştan önce bırakılabilir', () => {
    let s = finish(debugTeleport(fresh(), '9'));
    expect(patrolAvailable(s)).toBe(false);
    expect(() => startPatrol(s)).toThrow();
    s = walk(afterAshford(), 'moor', 'cairn', 'charcoal', '7', '6A');
    expect(patrolAvailable(s)).toBe(false);
    s = walk(afterAshford(), 'moor');
    s = startPatrol(s);
    expect(nextStep(s).kind).toBe('battle');
    s = cancelPatrol(s);
    expect(nextStep(s).kind).toBe('move');
  });

  it('devriyeden geri çekilme (Ömer 2026-10-19, hp-death-rework): devriye iptal, takım serbest; savaşta ne olduysa kalır (can kaybı, düşen yaralı / 3 yaralıysa ceset)', () => {
    expect(patrolRetreatConfirm()).toContain('stays lost');
    expect(patrolRetreatConfirm()).toContain(`${Math.round(CONFIG.rules.wounds.riseRatio * 100)}% health and a wound`);
    expect((CONFIG.replay as Record<string, unknown>)['retreatHpLoss']).toBeUndefined(); // eski rastgele kayıp kalktı
    expect(patrolRetreatMaxLoss()).toBe(0);
    const base = walk(afterAshford(), 'moor', 'cairn', 'charcoal', '7', '6B');
    const armed = startPatrol(base);
    // devriye değilse bir şey olmaz
    expect(retreatPatrol(base).state).toBe(base);
    const team = activeHeroes(armed);
    const [a, b, c] = team;
    // c: 3 yaralı (ölümcül sınır)
    const set = { ...armed, roster: armed.roster.map((h) => (h.id === c!.id ? { ...h, wounds: CONFIG.rules.wounds.lethal } : h)) };
    const units = [
      { heroId: a!.id, hpRatio: 0.4, alive: true },
      { heroId: b!.id, hpRatio: 0, alive: false },
      { heroId: c!.id, hpRatio: 0, alive: false },
    ];
    const r = retreatPatrol(set, { units });
    expect(r.state.patrol).toBeUndefined();
    expect(r.state.suspended).toBeUndefined();
    expect(nextStep(r.state).kind).toBe('move');
    expect(r.state.replays?.['6B'] ?? 0).toBe(armed.replays?.['6B'] ?? 0); // zafer sayılmaz
    const get = (id: string) => r.state.roster.find((h) => h.id === id)!;
    expect(get(a!.id)).toMatchObject({ hpRatio: 0.4, alive: true }); // can kaybı taşınır, şifa yok
    expect(get(a!.id).wounds).toBeUndefined();
    expect(get(b!.id)).toMatchObject({ hpRatio: CONFIG.rules.wounds.riseRatio, alive: true, wounds: 1 }); // düşen yaralı kalkar
    expect(get(c!.id)).toMatchObject({ hpRatio: 0, alive: false, wounds: CONFIG.rules.wounds.lethal }); // 3 yaralı: ceset
    expect(r.losses.find((l) => l.heroId === b!.id)?.wounded).toBe(true);
    expect(r.losses.find((l) => l.heroId === c!.id)?.died).toBe(true);
    expect(r.state.gold).toBe(set.gold); // loot yok
    // savaş kaydı yoksa yalnızca devriye bırakılır
    const bare = retreatPatrol(set);
    expect(bare.state.patrol).toBeUndefined();
    expect(bare.state.roster).toEqual(set.roster);
  });

  it('ödül çarpanları veride (campaign.json > replay.xp): ilk zafer 1, azalan, taban > 0', () => {
    const xs = CONFIG.replay!.xp;
    expect(xs[0]).toBe(1);
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeLessThanOrEqual(xs[i - 1]!);
    expect(xs.at(-1)!).toBeGreaterThan(0);
  });
});

describe('ilerleme yazısı ve debug', () => {
  it('Cleared x / toplam düğüm', () => {
    const s = walk(afterAshford(), 'moor');
    expect(clearedProgress(s)).toEqual({ cleared: 5, total: map.nodes.length });
  });

  it('Reset replays: sayaçlar sıfır, loot sayacı ilk zafere döner; Teleport keşfedilmiş düğüme taşır, kadroyu korur', () => {
    let s = walk(afterAshford(), 'moor');
    s = applyBattle(startPatrol(s), { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 1, alive: true })) });
    expect(s.replays['moor']).toBe(1);
    const r = debugResetReplays(s);
    expect(r.replays).toEqual({});
    expect(r.lootState.clears['moor:battle']).toBe(1);
    expect(nextReplayMult(r, 'moor')).toBe(CONFIG.replay!.xp[1]);
    const t = debugRoamTeleport(s, '4');
    expect(t.at).toBe('4');
    expect(t.roster).toEqual(s.roster);
    expect(nextStep(t).kind).toBe('move');
  });
});

describe('kayıt: sürüm 10 göçü (visited / cleared / replays)', () => {
  /** Sürüm 9 biçiminde kopya: yeni alanlar yok. */
  const asV9 = (s: CampaignState): Record<string, unknown> => {
    const o = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete o.visited;
    delete o.cleared;
    delete o.replays;
    delete o.patrol;
    return o;
  };

  it('eski kayıt açılır: visited / cleared yürüyüş günlüğünden türetilir, devriye sayacı boş; durum yeni oyundakiyle aynı', () => {
    const s = walk(afterAshford(), 'moor', 'cairn', 'charcoal', '7');
    const got = normalizeState(asV9(s), 0)!;
    expect(got.visited).toEqual(s.visited);
    expect(got.cleared.sort()).toEqual([...clearedNodes(s)].sort());
    expect(got.replays).toEqual({});
    expect(nextStep(got)).toEqual(nextStep(s));
    const kv = memoryKV();
    const slot = { campaignId: s.campaignId, mode: 'normal', difficulty: s.difficulty, startedAt: 't', lastPlayed: 't', saves: [{ id: 's1', kind: 'auto', savedAt: 't', mode: 'normal', campaignId: s.campaignId, summary: {}, state: asV9(s) }] };
    kv.setItem(SAVE_KEY, JSON.stringify({ version: 9, counter: 1, lastSlot: 0, slots: [slot, null, null] }));
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    expect(r.migrated).toBe(true);
    expect(r.file.slots[0]!.saves[0]!.state.at).toBe('7');
    expect(r.file.slots[0]!.saves[0]!.state.visited).toContain('charcoal');
    expect(SAVE_VERSION).toBe(12);
  });

  it('başlatılmış devriye duraklatma olmadan kayıtta kalmaz; bozuk alanlar onarılır; özet "Cleared"', () => {
    const s = walk(afterAshford(), 'moor');
    const armed = startPatrol(s);
    const got = normalizeState(JSON.parse(JSON.stringify(armed)), 0)!;
    expect(got.patrol).toBeUndefined();
    expect(nextStep(got).kind).toBe('move');
    const broken = normalizeState({ ...JSON.parse(JSON.stringify(s)), visited: 'x', cleared: [1, 2], replays: { moor: -1, nowhere: 3 } }, 0)!;
    expect(broken.visited).toEqual(visitedNodes(s));
    expect(broken.cleared.sort()).toEqual([...clearedNodes(s)].sort());
    expect(broken.replays).toEqual({});
    const kv = memoryKV();
    const w = writeSave(kv, s, 'manual');
    expect(w.entry!.summary).toMatchObject({ cleared: 5, total: map.nodes.length });
  });
});
