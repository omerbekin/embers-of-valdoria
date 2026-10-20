// Sefer KASMA simülatörü (Ömer 2026-10-19): serbest dolaşım + devriye (temizlenmiş düğümü yeniden oynama) ile oynayan oyuncu vekili.
// npm run sim:campaign (varsayılan --mode=grind; rapor src/sim/campaign-grind-report.ts, hedefler src/sim/campaign-targets.ts).
// Oyun kuralları (campaign.md 2.3; src/campaign/state.ts moveOptions / travelRoutes / startPatrol) aynen çağrılır; burada yalnızca oyuncunun kararları:
// - Yeni düğümde kaybedince aynı savaşı `retries` (2) kez daha dener (yenilgi = son kayda dönüş: savaşa giren takım birebir aynı, seed değişir).
// - Yine kaybederse son kayda (o düğüme yürümeden önceki duruma) döner ve `grindStep` (1) kasma savaşı yapar, sonra düğümü bir kez dener
//   (kas -> dene döngüsü). Kasma yeri: en verimli temizlenmiş tekrar oynanabilir düğüm (pickFarm; puan = beklenen XP x sıradaki ödül oranı x
//   tahmini kazanma şansı). Kaybedilen kasma savaşı bedelsizdir (son kayda dönüş) ama savaş sayılır.
// - O düğüm için `wallCap` kasma savaşından sonra hâlâ geçemezse DUVAR: koşu orada biter (onWall 'force' = zorla geçilir, ölçüm sürer).
//   Kasma yeri hiç yoksa (ör. Ashford sonrası ilk savaş, tutorial) kasma yerine düz tekrar; 1 + retries + wallCap denemede geçemezse duvar (farmsız).
// - Stat puanı: iyi oyuncu ana stata (autoAllocateAll, Medium YZ), ortalama oyuncu dört stata eşit (Easy YZ). İkisi de "Equip best".
// - Can: savaştan önce yaşayanların ort. canı `healAt`'in altındaysa ya da yaşayan yaralı kahraman varsa ve altın yetiyorsa temizlenmiş bir kasabada ücretli dinlenir (yolculuk bedelsiz).
// - Demirci: her yola çıkışta (temizlenmiş kasaba varsa) parası yettikçe takımın en değerli silahını Temper eder; bir dinlenme parası ayrılır.
import { valorInBattle, valorOutside, type ValorSimMode } from './valor-mode';
import { type AiDifficulty } from '../engine';
import {
  CONFIG,
  activeHeroes,
  applyBattle,
  autoAllocateAll,
  autoResolve,
  autoValorRevive,
  battlePlan,
  battleXp,
  canReplay,
  clearedNodes,
  completeSimple,
  equipBest,
  farewell,
  formCompany,
  getMap,
  isFallen,
  moveTo,
  newCampaign,
  nextStep,
  node,
  battleOutcomeOf,
  pickHero,
  recruit,
  replayCount,
  replayMult,
  rngFor,
  roamOpen,
  shuffle,
  startPatrol,
  temperItem,
  temperPreview,
  townRestPrice,
  travelRoutes,
  visitedNodes,
  type CampaignState,
  type Difficulty,
} from '../campaign';
import { instanceIlvl, itemValue, SLOT_IDS } from '../progression/items';
import { ATTRS, allocate, canAddPoint } from '../progression/levels';
import { allRoutes, fightPlan, routeLabel, simTownRest } from './campaign';
import { CAMPAIGN_TARGETS } from './campaign-targets';

export type PlayerType = 'good' | 'average';
/** Oyuncu tipinin savaş YZ vekili: iyi = Medium, ortalama = Easy. */
export const PLAYER_AI: Record<PlayerType, AiDifficulty> = { good: 'medium', average: 'easy' };

export interface GrindSimOptions {
  difficulty: Difficulty;
  player: PlayerType;
  runs: number;
  firstSeed?: number;
  /** Koşu i'nin rotası: (i + routeOffset) % rota sayısı (paralel parçalar için). */
  routeOffset?: number;
  /** Duvar sınırı (kasma savaşı); yoksa CAMPAIGN_TARGETS.wallCap[zorluk]. */
  wallCap?: number;
  /** Yeni düğümde ilk yenilgiden sonra kasmadan önceki tekrar sayısı (varsayılan 2). */
  retries?: number;
  /** Bir kas -> dene döngüsündeki kasma savaşı (varsayılan 1). */
  grindStep?: number;
  /** Duvarda: 'stop' = koşu biter (varsayılan), 'force' = düğüm zorla geçilir, ölçüm sürer. */
  onWall?: 'stop' | 'force';
  /** Aşırı kasma koşusu: Ashford sonrası ilk iki tekrar oynanabilir düğüm temizlenince önceden yapılan kasma savaşı (varsayılan 0). */
  preGrind?: number;
  /** Ücretli kasaba dinlenmesi eşiği (yaşayanların ort. can oranı; 0 = hiç dinlenmez). Varsayılan 0,5. */
  healAt?: number;
  valor?: ValorSimMode;
}

/** Toplanabilir düğüm sayaçları (paralel parçalar birleştirilir). */
export interface GrindNodeAgg {
  /** Düğüme ulaşan koşu (ilk deneme). */
  reached: number;
  firstWins: number;
  cleared: number;
  /** Geçen koşularda yeni düğüm denemesi toplamı ve kasma savaşı toplamı; kasma gereken koşu sayısı. */
  attemptsSum: number;
  grindSum: number;
  grindRuns: number;
  /** Duvara vuran koşuların o düğüm için yaptığı kasma savaşları. */
  grindWall: number;
  walls: number;
  /** Duvarın kasma yeri olmadan (düz tekrarla) olanı. */
  noFarmWalls: number;
  /** Bu düğümün kendi savaşları (yeni düğüm denemeleri; kasma savaşları farmBattles'ta). */
  battles: number;
  wins: number;
  hpEndSum: number;
  deathsOnWin: number;
  hpStartSum: number;
  turnsSum: number;
  /** Tur histogramı (tüm savaşlar: yeni düğüm + bu düğümde yapılan kasma). */
  turnHist: Record<string, number>;
  /** İlk varışta: takımın ort. level'ı, takılı item'lerin ort. item seviyesi, kahraman başına takılı item. */
  lvSum: number;
  ilvlSum: number;
  gearSum: number;
  /** Bu düğüm kasma yeri olarak: savaş / zafer. */
  farmBattles: number;
  farmWins: number;
}

export interface GrindGroupAgg {
  runs: number;
  completed: number;
  walls: number;
  /** Düğüm geçmek için yapılan kasma savaşı (aşırı kasma koşusunun ön kasması hariç). */
  grind: number;
  battles: number;
}

export interface GrindSimResult {
  difficulty: Difficulty;
  player: PlayerType;
  preGrind: number;
  wallCap: number;
  runs: number;
  completed: number;
  walls: number;
  /** Tüm savaşlar (yeni düğüm denemeleri + kasma), kasma savaşları, ön kasma (aşırı kasma koşusu), yenilgiler. */
  battles: number;
  grindBattles: number;
  preGrindBattles: number;
  defeats: number;
  goldEarned: number;
  goldSmith: number;
  goldRest: number;
  tempers: number;
  rests: number;
  /** Koşu sonunda takımın ort. level'ı toplamı. */
  levelEnd: number;
  nodes: Record<string, GrindNodeAgg>;
  routes: Record<string, GrindGroupAgg>;
  classes: Record<string, GrindGroupAgg>;
}

const emptyNode = (): GrindNodeAgg => ({
  reached: 0, firstWins: 0, cleared: 0, attemptsSum: 0, grindSum: 0, grindRuns: 0, grindWall: 0, walls: 0, noFarmWalls: 0, battles: 0, wins: 0, hpEndSum: 0,
  deathsOnWin: 0, hpStartSum: 0, turnsSum: 0, turnHist: {}, lvSum: 0, ilvlSum: 0, gearSum: 0, farmBattles: 0, farmWins: 0,
});
const emptyGroup = (): GrindGroupAgg => ({ runs: 0, completed: 0, walls: 0, grind: 0, battles: 0 });
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Ortalama oyuncu: stat puanlarını dört stata eşit dağıtır (her puan en az puan almış, kurala uyan stata; eşitlikte str, dex, int, luck). */
export function equalAllocateAll(s: CampaignState): CampaignState {
  if (!s.roster.some((h) => (h.statPoints ?? 0) > 0)) return s;
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  for (const h of t.roster) {
    while ((h.statPoints ?? 0) > 0) {
      const cur = h.alloc ?? {};
      const k = ATTRS.filter((a) => canAddPoint(h.class, cur, a)).sort((a, b) => (cur[a] ?? 0) - (cur[b] ?? 0))[0];
      if (!k) break;
      allocate(h, { [k]: 1 });
    }
  }
  return t;
}

/** Düğümde (kazanılırsa) takımın alacağı toplam XP (ilk zafer çarpanıyla; level farkı / yakalama kuralları dahil). */
export function expectedXp(s: CampaignState, nodeId: string): number {
  const n = node(getMap(s.mapId), nodeId);
  if (!n.encounter) return 0;
  const t = { ...s, at: nodeId } as CampaignState;
  const units = activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 1, alive: true }));
  return Object.values(battleXp(t, { victory: true, units }, n.encounter)).reduce((a, b) => a + b, 0);
}

/**
 * Kasma yeri (VARSAYIM, open-questions): yola çıkılabilir durumda gidilebilen temizlenmiş tekrar oynanabilir düğümler arasında
 * puan = beklenen XP (expectedXp) x sıradaki devriyenin ödül oranı (replay.xp) x bu koşudaki kazanma tahmini ((zafer + 1) / (savaş + 2)) en yüksek olan.
 */
export function pickFarm(s: CampaignState, record?: Map<string, { w: number; n: number }>): string | null {
  if (!roamOpen(s) || nextStep(s).kind !== 'move') return null;
  const map = getMap(s.mapId);
  const reach = travelRoutes(s);
  let best: string | null = null;
  let bestScore = -1;
  for (const id of clearedNodes(s)) {
    if (!canReplay(map, node(map, id)) || (id !== s.at && !reach.has(id))) continue;
    const r = record?.get(id) ?? { w: 0, n: 0 };
    const score = expectedXp(s, id) * replayMult(replayCount(s, id) + 1) * ((r.w + 1) / (r.n + 2));
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

const clearedTowns = (s: CampaignState): string[] => {
  const map = getMap(s.mapId);
  return clearedNodes(s).filter((id) => node(map, id).type === 'town');
};

export function simulateGrind(o: GrindSimOptions): GrindSimResult {
  const map = getMap(CONFIG.maps[0]!);
  const routes = allRoutes(map);
  const wallCap = o.wallCap ?? CAMPAIGN_TARGETS.wallCap[o.difficulty];
  const retries = o.retries ?? 2;
  const grindStep = Math.max(1, o.grindStep ?? 1);
  const healAt = o.healAt ?? 0.5;
  const ai = PLAYER_AI[o.player];
  const res: GrindSimResult = {
    difficulty: o.difficulty, player: o.player, preGrind: o.preGrind ?? 0, wallCap, runs: 0, completed: 0, walls: 0, battles: 0, grindBattles: 0,
    preGrindBattles: 0, defeats: 0, goldEarned: 0, goldSmith: 0, goldRest: 0, tempers: 0, rests: 0, levelEnd: 0, nodes: {}, routes: {}, classes: {},
  };
  const nodeAgg = (id: string) => (res.nodes[id] ??= emptyNode());
  const prepare = (s: CampaignState) => equipBest(o.player === 'good' ? autoAllocateAll(s) : equalAllocateAll(s));

  for (let i = 0; i < o.runs; i++) {
    const seed = (o.firstSeed ?? 1) + i;
    const route = routes[(i + (o.routeOffset ?? 0)) % routes.length]!;
    const label = routeLabel(map, route);
    // Seçimler düğüme bağlı seed'li (son kayda dönüşte yeniden yaşanan adım aynı seçimi yapar)
    const pick = (tag: string) => rngFor(seed, 'campaign-grind', tag);
    let s: CampaignState = newCampaign({ mode: 'normal', seed, difficulty: o.difficulty });
    let base: CampaignState | null = null;
    const ctx = new Map<string, { tries: number; grinds: number }>();
    const farmRec = new Map<string, { w: number; n: number }>();
    let grindFor: string | null = null;
    let grindLeft = 0;
    let preLeft = o.preGrind ?? 0;
    let wall = false;
    let stop = false;
    let runGrind = 0;
    let runBattles = 0;
    let spent = 0;
    const company = new Set<string>();

    const heal = (t: CampaignState): CampaignState => {
      const r = simTownRest(t, healAt);
      if (!r) return t;
      res.goldRest += r.price;
      res.rests++;
      spent += r.price;
      return r.state;
    };
    const smith = (t: CampaignState): CampaignState => {
      const towns = clearedTowns(t);
      if (!towns.length) return t;
      const reserve = Math.min(...towns.map((id) => townRestPrice(t, id)));
      for (let guard = 0; guard < 60; guard++) {
        const weapons = activeHeroes(t)
          .map((h) => h.equipment?.weapon)
          .filter((w): w is NonNullable<typeof w> => !!w)
          .sort((a, b) => itemValue(b) - itemValue(a));
        let done = false;
        for (const w of weapons) {
          const p = temperPreview(t, w.uid);
          if (!p || p.blocked || !p.after || t.gold - p.price < reserve) continue;
          t = temperItem(t, w.uid);
          res.goldSmith += p.price;
          res.tempers++;
          spent += p.price;
          done = true;
          break;
        }
        if (!done) break;
      }
      return t;
    };
    const hist = (a: GrindNodeAgg, turns: number) => (a.turnHist[turns] = (a.turnHist[turns] ?? 0) + 1);
    /** Bir kasma savaşı (yola çıkılabilir durumda): kazanırsa durum ilerler, kaybederse son kayda dönülür (durum aynen). */
    const grindOnce = (forNode: string | null): boolean => {
      s = heal(prepare(s));
      const f = pickFarm(s, farmRec);
      if (!f) return false;
      let t = s.at === f ? s : moveTo(s, f);
      t = startPatrol(t);
      const rec = farmRec.get(f) ?? { w: 0, n: 0 };
      const plan = battlePlan(t, rec.n - rec.w); // kaybedilen devriye yeniden oynanınca seed değişsin
      const battle = fightPlan(plan, ai, valorInBattle(o.valor));
      const fa = nodeAgg(f);
      fa.farmBattles++;
      hist(fa, battle.turnsTaken);
      res.battles++;
      runBattles++;
      if (forNode) {
        ctx.get(forNode)!.grinds++;
        res.grindBattles++;
        runGrind++;
      } else res.preGrindBattles++;
      rec.n++;
      if (battle.winner === 'party') {
        rec.w++;
        fa.farmWins++;
        s = applyBattle(t, battleOutcomeOf(plan, battle, true));
        if (valorOutside(o.valor)) s = autoValorRevive(s);
      } else res.defeats++;
      farmRec.set(f, rec);
      return true;
    };
    const hitWall = (id: string, noFarm: boolean) => {
      const a = nodeAgg(id);
      a.walls++;
      a.grindWall += ctx.get(id)?.grinds ?? 0;
      if (noFarm) a.noFarmWalls++;
      wall = true;
      if ((o.onWall ?? 'stop') === 'stop') stop = true;
      else s = applyBattle(s, { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: h.hpRatio, alive: !isFallen(h) })) });
    };

    for (let guard = 0; guard < 20000 && !stop; guard++) {
      const step = nextStep(s);
      if (step.kind === 'complete') break;
      switch (step.kind) {
        case 'hero':
          s = pickHero(s, CONFIG.starterPool[pick('hero').int(0, CONFIG.starterPool.length - 1)]!);
          break;
        case 'recruit':
        case 'volunteer': {
          const c = step.offer[pick(`recruit:${step.node}`).int(0, step.offer.length - 1)]!;
          s = recruit(s, c);
          if (step.kind === 'volunteer') company.add(c);
          break;
        }
        case 'farewell':
          s = farewell(s);
          break;
        case 'company': {
          const picks = shuffle(CONFIG.companyPool, pick('company')).slice(0, step.size);
          picks.forEach((c) => company.add(c));
          s = formCompany(s, picks);
          break;
        }
        case 'treasure':
        case 'event':
        case 'story':
        case 'town':
          s = completeSimple(s, step.kind);
          break;
        case 'rest':
        case 'merchant':
          s = autoResolve(s, step);
          break;
        case 'battle': {
          const id = step.node;
          const c = ctx.get(id) ?? { tries: 0, grinds: 0 };
          ctx.set(id, c);
          const a = nodeAgg(id);
          s = prepare(s);
          const party = activeHeroes(s);
          if (c.tries === 0) {
            a.reached++;
            a.hpStartSum += mean(party.map((h) => h.hpRatio));
            a.lvSum += mean(party.map((h) => h.level ?? 1));
            const items = party.flatMap((h) => SLOT_IDS.map((k) => h.equipment?.[k]).filter((x): x is NonNullable<typeof x> => !!x));
            a.ilvlSum += mean(items.map((x) => instanceIlvl(x)));
            a.gearSum += items.length / Math.max(1, party.length);
          }
          const plan = battlePlan(s, c.tries);
          const battle = fightPlan(plan, ai, valorInBattle(o.valor));
          c.tries++;
          a.battles++;
          a.turnsSum += battle.turnsTaken;
          hist(a, battle.turnsTaken);
          res.battles++;
          runBattles++;
          if (battle.winner === 'party') {
            a.wins++;
            if (c.tries === 1) a.firstWins++;
            a.cleared++;
            a.attemptsSum += c.tries;
            a.grindSum += c.grinds;
            if (c.grinds > 0) a.grindRuns++;
            const out = battleOutcomeOf(plan, battle, true);
            a.hpEndSum += mean(out.units.map((u) => (u.alive ? u.hpRatio : 0)));
            a.deathsOnWin += out.units.filter((u) => !u.alive).length;
            s = applyBattle(s, out);
            if (valorOutside(o.valor)) s = autoValorRevive(s);
            break;
          }
          res.defeats++;
          if (c.tries < 1 + retries) break; // aynı savaşı yeniden dene (son kayıt = aynı takım)
          const canFarm = !!base && !!pickFarm(base, farmRec);
          if (!canFarm) {
            if (c.tries >= 1 + retries + wallCap) hitWall(id, true);
          } else if (c.grinds >= wallCap) hitWall(id, false);
          else {
            s = base!; // son kayda dön (düğüme yürümeden önceki durum), kas
            grindFor = id;
            grindLeft = grindStep;
          }
          break;
        }
        case 'move': {
          if (grindLeft > 0 && grindFor) {
            if (!grindOnce(grindFor)) grindLeft = 0;
            else grindLeft--;
            break;
          }
          if (preLeft > 0 && roamOpen(s)) {
            const farmable = clearedNodes(s).filter((id) => canReplay(map, node(map, id))).length;
            if (farmable >= 2) {
              while (preLeft > 0 && grindOnce(null)) preLeft--;
              preLeft = 0;
              break;
            }
          }
          s = heal(smith(s));
          const seen = new Set(visitedNodes(s));
          const target = route.find((id) => !seen.has(id));
          if (!target) {
            stop = true;
            break;
          }
          base = s;
          s = moveTo(s, target);
          break;
        }
      }
    }
    const done = !wall && nextStep(s).kind === 'complete';
    res.runs++;
    if (done) res.completed++;
    if (wall) res.walls++;
    res.goldEarned += s.gold + spent;
    res.levelEnd += mean(activeHeroes(s).map((h) => h.level ?? 1));
    const groups = [(res.routes[label] ??= emptyGroup()), ...[...company].map((c) => (res.classes[c] ??= emptyGroup()))];
    for (const g of groups) {
      g.runs++;
      if (done) g.completed++;
      if (wall) g.walls++;
      g.grind += runGrind;
      g.battles += runBattles;
    }
  }
  return res;
}

/** Sayı alanlarını iç içe toplar (paralel parçalar; metin alanları ilk parçadan). */
function deepAdd(into: Record<string, unknown>, from: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(from)) {
    if (typeof v === 'number') into[k] = ((into[k] as number | undefined) ?? 0) + v;
    else if (v && typeof v === 'object') deepAdd((into[k] ??= {}) as Record<string, unknown>, v as Record<string, unknown>);
    else if (!(k in into)) into[k] = v;
  }
}

/** Paralel parçaların sonuçlarını toplar (aynı zorluk, oyuncu tipi ve ön kasma). */
export function mergeGrindResults(parts: GrindSimResult[]): GrindSimResult {
  const out = JSON.parse(JSON.stringify(parts[0]!)) as GrindSimResult;
  for (const p of parts.slice(1)) deepAdd(out as unknown as Record<string, unknown>, p as unknown as Record<string, unknown>);
  out.wallCap = parts[0]!.wallCap;
  out.preGrind = parts[0]!.preGrind;
  return out;
}
