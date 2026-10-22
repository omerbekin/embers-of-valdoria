// Sefer simülatörü (headless): Valdoria seferini baştan sona iki taraf da yapay zeka ile oynatır ve sefer dengesini ölçer.
// npm run sim:campaign (rapor: src/sim/campaign-cli.ts) ve tests/campaign-balance.test.ts bunu kullanır. Tasarım: docs/balance.md > Sefer dengesi.
//
// Akış gerçek oyunun saf sefer mantığıyla aynıdır (src/campaign): kahraman (rastgele) -> Ravenwood adayı (rastgele) -> Watchtower ->
// Ashford'da 11 sınıftan rastgele 3 kişilik yeni takım -> Valdren Keep'ten ayrılırken aday (rastgele) = 4 kişi; rota sabit bir listeden
// (koşu no % 12) seçilir, böylece 12 rota eşit sayıda oynanır. Can taşıma, zafer/boss/kasaba iyileşmesi `applyBattle` / `moveTo` ile.
// Yenilgide "son kayda dönüş" = aynı düğümün savaşı aynı durumla yeniden denenir (oyunda kayıt zaferden sonra alınır; dönüşte kasaba
// iyileşmesi vb. yeniden yaşanır, yani savaşa giren takım birebir aynıdır), yeni denemede savaş seed'i değişir (attempt sayacı).
// `maxAttempts` aşılırsa sefer o düğümde "takıldı" sayılır.
import { valorInBattle, valorOutside, type ValorSimMode } from './valor-mode';
import { Battle, chooseAction, content, type AiDifficulty } from '../engine';
import {
  CONFIG,
  activeHeroes,
  applyBattle,
  autoAllocateAll,
  autoResolve,
  autoValorRevive,
  battlePlan,
  completeSimple,
  equipBest,
  farewell,
  formCompany,
  getMap,
  newCampaign,
  nextStep,
  node,
  battleOutcomeOf,
  clearedNodes,
  isFallen,
  outgoing,
  pickHero,
  recruit,
  moveTo,
  restInTown,
  rngFor,
  shuffle,
  townRestPrice,
  type CampaignMap,
  type CampaignState,
  type Difficulty,
} from '../campaign';
import { MAX_TURNS } from './simulate';
import { autoTreeHeroes, withTreesInMemory } from './tree-sim';
import type { TreeDir } from '../progression/skill-tree-data';
import { RARITY_IDS, clampRarity, instanceRarity, itemDef } from '../progression/items';
import { woundCount } from '../progression/wounds';

/**
 * Oyuncu vekilinin kasaba dinlenmesi (iki sefer simülatörü ortak; 2026-10-20): yaşayanların ort. canı `healAt`'in altındaysa YA DA yaşayan yaralı
 * kahraman varsa (yarayı yalnızca kasaba dinlenmesi siler) ve altın yetiyorsa temizlenmiş en ucuz kasabada dinlenir (yolculuk bedelsiz, serbest
 * dolaşım). VARSAYIM (open-questions 371). Dinlenmezse null.
 */
export function simTownRest(s: CampaignState, healAt: number): { state: CampaignState; price: number } | null {
  if (!healAt) return null;
  const alive = activeHeroes(s).filter((h) => !isFallen(h));
  const hp = alive.length ? alive.reduce((a, h) => a + h.hpRatio, 0) / alive.length : 0;
  if (hp >= healAt && !alive.some((h) => woundCount(h) > 0)) return null;
  const map = getMap(s.mapId);
  const town = clearedNodes(s)
    .filter((id) => node(map, id).type === 'town')
    .map((id) => ({ id, price: townRestPrice(s, id) }))
    .sort((a, b) => a.price - b.price)[0];
  if (!town || s.gold < town.price) return null;
  return { state: restInTown(s, town.id), price: town.price };
}

export type NodeCategory = 'tutorial' | 'normal' | 'elite' | 'boss';

/** Düğümün denge kategorisi: Ashford öncesi savaşlar tutorial; elite / boss türleri; kalan savaşlar (battle, guarded treasure) normal. */
export function nodeCategory(map: CampaignMap, nodeId: string): NodeCategory {
  const n = node(map, nodeId);
  const tutorialEnd = map.nodes.find((x) => x.endsTutorial)?.id;
  // Ashford'dan (tutorial sonu) önceki düğümler: başlangıçtan Ashford'a giden tek yoldadır
  const before = new Set<string>();
  let cur: string | undefined = map.start;
  while (cur && cur !== tutorialEnd) {
    before.add(cur);
    const outs = outgoing(map, cur);
    cur = outs.length === 1 ? outs[0] : undefined;
  }
  if (before.has(nodeId)) return 'tutorial';
  if (n.type === 'boss') return 'boss';
  if (n.type === 'elite') return 'elite';
  return 'normal';
}

/** Haritadaki tüm rotalar (başlangıçtan finale; veri sırasıyla). Valdoria: 12. */
export function allRoutes(map: CampaignMap): string[][] {
  const out: string[][] = [];
  const walk = (path: string[]) => {
    const next = outgoing(map, path[path.length - 1]!);
    if (!next.length) out.push(path);
    for (const n of next) walk([...path, n]);
  };
  walk([map.start]);
  return out;
}

/** Rotanın kısa adı (seçim noktalarındaki seçimler): ör. "5A·8C·11A". */
export function routeLabel(map: CampaignMap, route: string[]): string {
  return route.filter((_, i) => i > 0 && outgoing(map, route[i - 1]!).length > 1).join('·');
}

export interface CampaignSimOptions {
  /** Skill ağacı (Faz 6; --tree=a|b): oyuncu vekili puanları odaklı kurulumla bu yönde harcar, ağaç bu süreçte bellekte açık (tree-sim.ts). */
  tree?: TreeDir;
  difficulty: Difficulty;
  /** Oyuncu tarafının vekili: Medium = "iyi oyuncu", Easy = "ortalama oyuncu". */
  player: AiDifficulty;
  /** Valor (Ömer 2026-10-13): false = savaşta kullanılmaz ve savaş dışı diriltme yok (Valor öncesi karşılaştırma; CLI VALOR=off). */
  valor?: ValorSimMode;
  runs: number;
  firstSeed?: number;
  /** Bir düğümde en fazla deneme (aşılırsa sefer takıldı). Varsayılan 10. */
  maxAttempts?: number;
  /** Koşu i'nin rotası: (i + routeOffset) % rota sayısı (paralel parçalar için). */
  routeOffset?: number;
  /**
   * Takılınca (maxAttempts aşıldı) sefer yine de sürsün mü: düğüm zorla geçilir (takım savaşa girdiği canla, zafer toparlanmasıyla), sefer
   * "bitmedi" sayılır ama sonraki düğümler de ölçülür. Varsayılan true (ölçüm için); false = gerçek sefer gibi orada biter.
   */
  continueOnStuck?: boolean;
  /**
   * Oyuncu vekilinin ekipman politikası (items.md 4.4): 'best' = her loot sonrası takım "Equip best" yapar (varsayılan; iyi oyuncu),
   * 'none' = hiç item takmaz (item'siz referans: düşman ölçeği yine açık, yani zorlaşır).
   */
  gear?: 'best' | 'none';
  /** Kasaba dinlenmesi eşiği (simTownRest; 0 = hiç dinlenmez, eski davranış). Varsayılan 0,5 (kasma simülatörüyle aynı). */
  healAt?: number;
  /** Her düğümün ilk denemesinden önce durum (ayar betikleri için). */
  onBattle?: (nodeId: string, state: CampaignState) => void;
}

/** Toplanabilir (paralel parçalar birleştirilebilir) sayaçlar. */
export interface NodeAgg {
  /** Düğüme ulaşan seferler (ilk deneme sayısı). */
  reached: number;
  firstWins: number;
  /** Tüm savaşlar (denemeler) ve kazanılanlar. */
  battles: number;
  wins: number;
  /** Temizlenen seferlerin toplam deneme sayısı. */
  cleared: number;
  attemptsToClear: number;
  /** Kazanılan savaşlarda: oyuncu karakterlerinin ortalama kalan can oranı (düşen = 0) toplamı, düşen karakter sayısı. */
  hpEndSum: number;
  deathsOnWin: number;
  /** Savaşa giren takımın ortalama başlangıç can oranı toplamı (ilk denemede). */
  hpStartSum: number;
  turnsSum: number;
  stuck: number;
}

export interface RouteAgg {
  runs: number;
  completed: number;
  defeats: number;
}

export interface ClassAgg {
  /** Sınıfın asıl takımda (Ashford + Valdren gönüllüsü) olduğu seferler. */
  runs: number;
  completed: number;
  defeats: number;
  /** Tutorial kahramanı olarak: Mill Road ilk deneme. */
  heroRuns: number;
  heroFirstWins: number;
}

export interface CampaignSimResult {
  difficulty: Difficulty;
  player: AiDifficulty;
  runs: number;
  completed: number;
  defeats: number;
  nodes: Record<string, NodeAgg>;
  routes: Record<string, RouteAgg>;
  classes: Record<string, ClassAgg>;
  /** Düşen item'lerin nadirlik sayıları (Common..Legendary) harita bölgesine göre (Ömer 2026-10-11: nadirlik dağılımı raporu). */
  loot?: Record<string, number[]>;
}

const emptyNode = (): NodeAgg => ({ reached: 0, firstWins: 0, battles: 0, wins: 0, cleared: 0, attemptsToClear: 0, hpEndSum: 0, deathsOnWin: 0, hpStartSum: 0, turnsSum: 0, stuck: 0 });
const emptyClass = (): ClassAgg => ({ runs: 0, completed: 0, defeats: 0, heroRuns: 0, heroFirstWins: 0 });

/**
 * Ortalama oyuncu taklidinin Valor kuralı (Ömer 2026-10-20 ekonomi formu; YALNIZCA sim, oyun YZ'si değişmez): Easy YZ Valor'u hiç kullanmaz
 * (rules.globals = restWhenIdle), gerçek ortalama oyuncu ise geç de olsa kullanır. Kural: diriltilebilir bir dost düştükten sonra oyuncu tarafının
 * İLK turu boşa gider (fark etmez, class hamlesi yapar); ondan sonraki ilk oyuncu turunda Valor diriltme bedeline yetiyorsa en önce düşeni diriltir.
 * Değer tartmaz (iyi oyuncunun YZ'si gibi "savaş zaten kazanıldı mı" bakmaz). `seen` = düşmüş dostun görüldüğü oyuncu turu sayısı (savaş başına).
 */
export function lateValorChoice(battle: Battle, actorUid: string, seen: Map<string, number>): { skillId: string; targetUid: string; slot: number } | null {
  const actor = battle.get(actorUid);
  if (!actor || actor.side !== 'party' || actor.summoned) return null;
  const id = battle.globalSkillIds(actor.side).find((x) => battle.globalDef(x)?.kind === 'valor');
  if (!id) return null;
  const targets = battle.valorTargets(actorUid);
  for (const t of targets) seen.set(t.uid, (seen.get(t.uid) ?? 0) + 1);
  const ready = targets.find((t) => (seen.get(t.uid) ?? 0) >= 2);
  if (!ready || !battle.canUseGlobal(actorUid, id).ok) return null;
  const slot = battle.valorSlotFor(ready.uid);
  if (slot === null) return null;
  seen.delete(ready.uid);
  return { skillId: id, targetUid: ready.uid, slot };
}

/**
 * Tek savaşı yapay zeka ile oynatır: oyuncu tarafı `player`, düşman tarafı zorluğun YZ'si. `lateValor` = ortalama oyuncunun geç Valor kuralı
 * (lateValorChoice; yalnızca grind sim'in ortalama oyuncusu açar).
 */
export function fightPlan(plan: ReturnType<typeof battlePlan>, player: AiDifficulty, valor = true, lateValor = false): Battle {
  const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...(plan.waves ? { waves: plan.waves.map((w) => ({ enemies: w.enemies, units: w.units })) } : {}), ...(plan.valor !== undefined && valor ? { valor: { party: plan.valor } } : {}) }, false));
  const seen = new Map<string, number>();
  while (!battle.winner && battle.turnsTaken < MAX_TURNS) {
    const actor = battle.currentActor;
    if (!actor) break;
    const late = lateValor && valor ? lateValorChoice(battle, actor.uid, seen) : null;
    const choice = late ?? chooseAction(battle, actor.uid, content.aiConfig, undefined, { difficulty: actor.side === 'enemy' ? plan.difficulty : player });
    if (!battle.applyChoice(actor.uid, choice).ok) break;
  }
  return battle;
}

export function simulateCampaign(o: CampaignSimOptions): CampaignSimResult {
  return withTreesInMemory(!!o.tree, () => simulateCampaignRuns(o));
}

function simulateCampaignRuns(o: CampaignSimOptions): CampaignSimResult {
  const map = getMap(CONFIG.maps[0]!);
  const routes = allRoutes(map);
  const maxAttempts = o.maxAttempts ?? 10;
  const res: CampaignSimResult = { difficulty: o.difficulty, player: o.player, runs: 0, completed: 0, defeats: 0, nodes: {}, routes: {}, classes: {}, loot: {} };
  const nodeAgg = (id: string) => (res.nodes[id] ??= emptyNode());
  // Loot sayımı: işlemden önceki torba + geride kalanlar; sonra yeni gelenlerin nadirliği düğümün bölgesine
  const lootCount = (before: CampaignState, after: CampaignState, nodeId: string) => {
    const region = map.nodes.find((n) => n.id === nodeId)?.region ?? '?';
    const row = (res.loot![region] ??= RARITY_IDS.map(() => 0));
    const had = new Set(before.inventory.map((i) => i.uid));
    for (const it of after.inventory) if (!had.has(it.uid) && itemDef(it.id)) row[RARITY_IDS.indexOf(instanceRarity(it))]!++;
    const prevLeft = before.pendingLoot?.node === nodeId ? (before.pendingLoot.left?.length ?? 0) : 0;
    const left = after.pendingLoot?.node === nodeId ? (after.pendingLoot.left ?? []) : [];
    left.slice(prevLeft).forEach((id, k) => {
      const d = itemDef(id);
      if (d) row[RARITY_IDS.indexOf(clampRarity(d, after.pendingLoot!.leftRolls?.[prevLeft + k]?.rarity))]!++;
    });
  };
  const classAgg = (id: string) => (res.classes[id] ??= emptyClass());

  for (let i = 0; i < o.runs; i++) {
    const seed = (o.firstSeed ?? 1) + i;
    const route = routes[(i + (o.routeOffset ?? 0)) % routes.length]!;
    const label = routeLabel(map, route);
    const ra = (res.routes[label] ??= { runs: 0, completed: 0, defeats: 0 });
    const rng = rngFor(seed, 'campaign-sim');
    let s: CampaignState = newCampaign({ mode: 'normal', seed, difficulty: o.difficulty });
    let defeats = 0;
    let stuck = false;
    let hero = '';
    const company: string[] = [];
    let mill: boolean | undefined;
    while (true) {
      if (stuck && !(o.continueOnStuck ?? true)) break;
      const step = nextStep(s);
      if (step.kind === 'complete') break;
      switch (step.kind) {
        case 'hero':
          hero = CONFIG.starterPool[rng.int(0, CONFIG.starterPool.length - 1)]!;
          s = pickHero(s, hero);
          break;
        case 'recruit':
        case 'volunteer': {
          const pick = step.offer[rng.int(0, step.offer.length - 1)]!;
          s = recruit(s, pick);
          if (step.kind === 'volunteer') company.push(pick);
          break;
        }
        case 'farewell':
          s = farewell(s);
          break;
        case 'company': {
          const picks = shuffle(CONFIG.companyPool, rng).slice(0, step.size);
          company.push(...picks);
          s = formCompany(s, picks);
          break;
        }
        case 'battle': {
          const agg = nodeAgg(step.node);
          agg.reached++;
          s = autoAllocateAll(s); // level puanları: oyuncu vekili ana stata dağıtır (levels.md)
          if (o.tree) s = { ...s, roster: autoTreeHeroes(s.roster, o.tree) }; // skill ağacı (Faz 6; --tree)
          if ((o.gear ?? 'best') === 'best') s = equipBest(s);
          const party = activeHeroes(s);
          o.onBattle?.(step.node, s);
          agg.hpStartSum += party.reduce((a, h) => a + h.hpRatio, 0) / Math.max(1, party.length);
          let won = false;
          for (let attempt = 0; attempt < maxAttempts && !won; attempt++) {
            const plan = battlePlan(s, attempt);
            const battle = fightPlan(plan, o.player, valorInBattle(o.valor));
            const victory = battle.winner === 'party';
            agg.battles++;
            agg.turnsSum += battle.turnsTaken;
            if (attempt === 0 && step.node === map.start) mill = victory;
            if (victory) {
              won = true;
              agg.wins++;
              if (attempt === 0) agg.firstWins++;
              agg.cleared++;
              agg.attemptsToClear += attempt + 1;
              const out = battleOutcomeOf(plan, battle, true);
              agg.hpEndSum += out.units.reduce((a, u) => a + (u.alive ? u.hpRatio : 0), 0) / Math.max(1, out.units.length);
              agg.deathsOnWin += out.units.filter((u) => !u.alive).length;
              const pre = s;
              s = applyBattle(s, out);
              if (valorOutside(o.valor)) s = autoValorRevive(s);
              lootCount(pre, s, step.node);
            } else {
              defeats++;
            }
          }
          if (!won) {
            agg.stuck++;
            stuck = true;
            if (o.continueOnStuck ?? true) s = applyBattle(s, { victory: true, units: party.map((h) => ({ heroId: h.id, hpRatio: h.hpRatio, alive: true })) });
          }
          break;
        }
        case 'treasure':
        case 'event':
        case 'story':
        case 'town': {
          const pre = s;
          const at = s.at;
          s = completeSimple(s, step.kind);
          if (step.kind === 'treasure') lootCount(pre, s, at);
          break;
        }
        case 'rest':
        case 'merchant':
          // Dinlenme: ücretsiz %50 (düşmüş yoksa diriltme yok); tüccar: vekil alışveriş yapmaz (Ömer 2026-10-11, madde 305)
          s = autoResolve(s, step);
          break;
        case 'move': {
          s = simTownRest(s, o.healAt ?? 0.5)?.state ?? s; // yaralı / düşük canlı takım kasabada dinlenir (yara kuralı, 2026-10-20)
          const next = route[s.path.length];
          s = moveTo(s, next && step.options.includes(next) ? next : step.options[0]!);
          break;
        }
      }
    }
    res.runs++;
    ra.runs++;
    ra.defeats += defeats;
    res.defeats += defeats;
    if (!stuck) {
      res.completed++;
      ra.completed++;
    }
    for (const c of new Set(company)) {
      const ca = classAgg(c);
      ca.runs++;
      ca.defeats += defeats;
      if (!stuck) ca.completed++;
    }
    if (hero) {
      const ca = classAgg(hero);
      ca.heroRuns++;
      if (mill) ca.heroFirstWins++;
    }
  }
  return res;
}

/** Paralel parçaların sonuçlarını toplar (aynı zorluk ve oyuncu vekili). */
export function mergeCampaignResults(parts: CampaignSimResult[]): CampaignSimResult {
  const out: CampaignSimResult = { difficulty: parts[0]!.difficulty, player: parts[0]!.player, runs: 0, completed: 0, defeats: 0, nodes: {}, routes: {}, classes: {}, loot: {} };
  const add = <T extends object>(into: Record<string, T>, from: Record<string, T>, empty: () => T) => {
    for (const [k, v] of Object.entries(from)) {
      const t = (into[k] ??= empty()) as Record<string, number>;
      for (const [f, n] of Object.entries(v as Record<string, number>)) t[f] = (t[f] ?? 0) + n;
    }
  };
  for (const p of parts) {
    out.runs += p.runs;
    out.completed += p.completed;
    out.defeats += p.defeats;
    add(out.nodes, p.nodes, emptyNode);
    add(out.routes, p.routes, () => ({ runs: 0, completed: 0, defeats: 0 }));
    add(out.classes, p.classes, emptyClass);
    for (const [k, v] of Object.entries(p.loot ?? {})) {
      const row = (out.loot![k] ??= RARITY_IDS.map(() => 0));
      v.forEach((n, i) => (row[i] = (row[i] ?? 0) + n));
    }
  }
  return out;
}

/** Kategori bazında ilk deneme kazanma oranı (%; düğümlerin ilk denemeleri toplanarak). */
export function categoryFirstWin(r: CampaignSimResult, map: CampaignMap = getMap(CONFIG.maps[0]!)): Record<NodeCategory, number> {
  const sum: Record<NodeCategory, { n: number; w: number }> = { tutorial: { n: 0, w: 0 }, normal: { n: 0, w: 0 }, elite: { n: 0, w: 0 }, boss: { n: 0, w: 0 } };
  for (const [id, a] of Object.entries(r.nodes)) {
    const c = nodeCategory(map, id);
    sum[c].n += a.reached;
    sum[c].w += a.firstWins;
  }
  const pct = (x: { n: number; w: number }) => (x.n ? (x.w / x.n) * 100 : 0);
  return { tutorial: pct(sum.tutorial), normal: pct(sum.normal), elite: pct(sum.elite), boss: pct(sum.boss) };
}
