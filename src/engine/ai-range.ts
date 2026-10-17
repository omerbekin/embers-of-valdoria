/**
 * YAPAY ZEKA: MENZİL KONUMLANMASI (docs/design/range.md Faz 2; yalnızca formulas.range.enabled true iken ai.ts buraya yönlenir).
 * Ayrı modül: menzil sistemi geri alınırsa bu dosya ve ai.ts'teki birkaç `battle.rangeOn` dalı silinir. Saf ve belirleyici.
 *
 * Move planları: geri çekilme (kırılgan/yaralı birim düşman menzilinden çıkar), menzile girme (hiçbir saldırısı ulaşmayan birim en iyi saldırısının
 * ulaştığı hücreye geçer), yaklaşma (hiçbir hücreden ulaşamıyor ve yapacak hamle yoksa öne), aura komşuluğu, telgraftan kaçma.
 */
import type { Battle } from './battle';
import { previewForTargets } from './preview';
import { FOE_TARGETS } from './range';
import type { Combatant, SkillDef } from './types';
import type { AiValueConfig, ValueContext } from './ai-value';

/** ai.ts'ten gelen bağımlılıklar (karar bağlamı ve paylaşılan hesaplar); döngüsel içe aktarma yok. */
export interface RangeAiDeps {
  ctx: ValueContext | null;
  vc: AiValueConfig;
  dodgeOpportunityShare: number;
  telegraphLoad: (battle: Battle, actor: Combatant, slot: number) => number;
  auraBenefit: (battle: Battle, actor: Combatant, slot: number, pct: number, incoming: Map<string, number>) => number;
}

/** data/ai.json > global.move ayarları (ai.ts > AiGlobalConfig.move ile aynı). */
export interface RangeMoveConfig {
  minAvoidShare: number;
  opportunityShare: number;
  meleeOpportunityShare: number;
  retreatHpRatio: number;
  minFrontGainShare: number;
  minAuraGain: number;
}

export interface RangeMovePlan {
  slot: number;
  net: number;
  /** Maç kaydı: planın türü. */
  kind?: string;
}

const ratio = (c: Combatant) => c.hp / c.maxHp;
const foeSide = (c: Combatant) => (c.side === 'party' ? 'enemy' : 'party');

/** Birimin düşmanı hedefleyen hasar skill'leri. */
export function rangedSkills(battle: Battle, actor: Combatant): SkillDef[] {
  return actor.skills.map((id) => battle.skill(id)).filter((s): s is SkillDef => !!s && FOE_TARGETS.includes(s.target) && s.effects.some((e) => e.type === 'damage'));
}

/** Skill şu an bedeli/cooldown'u (ya da kilidi: lockedSkills) yüzünden kullanılamıyor mu? */
export function blockedByCost(battle: Battle, c: Combatant, sk: SkillDef): boolean {
  if (c.lockedSkills?.includes(sk.id)) return true;
  if (battle.mode === 'turns' && !battle.noCooldowns && (c.cooldowns[sk.id] ?? 0) > 0) return true;
  if (sk.cost.resource === 'mp' && !battle.freeMp && c.mp < sk.cost.amount) return true;
  if (sk.cost.resource === 'rage' && !battle.freeRage && (c.rage ?? 0) < sk.cost.amount) return true;
  return false;
}

/** Önizleme önbelleği (bir karar içinde): saldıranın skill'iyle hedefe beklenen hasar (isabet dahil); saldıranın hücresine bağlı değildir. */
export type HitMemo = Map<string, number>;
function expectedHit(battle: Battle, memo: HitMemo, attacker: Combatant, skillId: string, target: Combatant): number {
  const key = `${attacker.uid}|${skillId}|${target.uid}`;
  let v = memo.get(key);
  if (v === undefined) {
    const d = previewForTargets(battle, attacker, skillId, [target]).find((p) => p.uid === target.uid)?.damage;
    v = d ? d.avg * d.hitChance : 0;
    memo.set(key, v);
  }
  return v;
}

/**
 * Düşman takımının, birim `slot` yuvasındayken ona MENZİLDEN vurabileceği beklenen hasar (tek turluk; tek hedefli skill'de dikkat, o skill'in ulaştığı
 * birimlerimiz arasında bölünür). Birimin varsayımsal hücresi kendi tahtasının en öndeki dolu sırasını da değiştirir.
 */
export function incomingAt(battle: Battle, actor: Combatant, slot: number, memo: HitMemo = new Map()): number {
  let total = 0;
  for (const foe of battle.living(foeSide(actor))) {
    if (foe.board !== foe.side) continue;
    let top = 0;
    for (const sk of rangedSkills(battle, foe)) {
      if (blockedByCost(battle, foe, sk) || !battle.reachedBy(foe, sk, actor, slot)) continue;
      const v = expectedHit(battle, memo, foe, sk.id, actor);
      if (v <= 0) continue;
      let share = 1;
      if (sk.target === 'single_enemy') {
        const reached = battle.living(actor.side).filter((c) => c.uid !== actor.uid && c.board === actor.board && battle.inRange(foe, sk, c.board, c.slot, { moved: { uid: actor.uid, slot } })).length + 1;
        share = 1 / reached;
      }
      top = Math.max(top, v * share);
    }
    total += top;
  }
  return total;
}

/** Birim `slot` hücresinden yapabileceği (bedeli yeten) bir saldırıyla en az bir düşmana ulaşıyor mu? */
export function canActFrom(battle: Battle, actor: Combatant, slot: number, skills = rangedSkills(battle, actor).filter((s) => !blockedByCost(battle, actor, s))): boolean {
  return skills.some((sk) => battle.reachesFrom(actor, sk, slot));
}

/** Birim `slot` hücresindeyken menzildeki düşmanlara verebileceği en iyi beklenen hasar (tek hedefte en iyi hedef; çok hedefte toplam). */
function potentialFrom(battle: Battle, actor: Combatant, slot: number, memo: HitMemo): number {
  const foe = foeSide(actor);
  let best = 0;
  for (const sk of rangedSkills(battle, actor)) {
    if (blockedByCost(battle, actor, sk) || !battle.reachesFrom(actor, sk, slot)) continue;
    const inReach = battle.living(foe).filter((c) => c.board === foe && battle.inRange(actor, sk, c.board, c.slot, { from: slot }) && (!sk.requiresOpenBehind || battle.openBehindProblem(c) === null));
    // alan skill'inde hedef anchor'dan kapsanır: en yakın düşman ulaşılamasa da alan kenarı ulaşabilir; en az bir hedef say
    const pool = inReach.length > 0 ? inReach : battle.living(foe).filter((c) => c.board === foe).slice(0, 1);
    const hits = pool.map((c) => expectedHit(battle, memo, actor, sk.id, c));
    const v = sk.target === 'single_enemy' ? Math.max(0, ...hits) : hits.reduce((a, b) => a + b, 0);
    best = Math.max(best, v - (sk.cost.resource === 'mp' ? sk.cost.amount * 0.5 : 0));
  }
  return best;
}

/** Telgraftan kaçma (menzil sürümü): eşitlikte saldırı yeteneğini koruyan hücre; menzilden çıkıp saldıramayacaksa + şimdiki hamlenin yarısı bedel. */
export function telegraphDodgeRange(battle: Battle, actor: Combatant, free: number[], vNow: number, deps: RangeAiDeps): RangeMovePlan | null {
  if (battle.telegraphs.length === 0) return null;
  const now = deps.telegraphLoad(battle, actor, actor.slot);
  if (now <= 0) return null;
  const usable = rangedSkills(battle, actor).filter((s) => !blockedByCost(battle, actor, s));
  const actNow = canActFrom(battle, actor, actor.slot, usable);
  let best: RangeMovePlan | null = null;
  for (const s of free) {
    const avoided = now - deps.telegraphLoad(battle, actor, s);
    if (avoided <= 0) continue;
    const threat = (slot?: number) => battle.telegraphThreat(actor.uid, slot).reduce((t, x) => t + x.avg, 0);
    const life = actor.hp + actor.shield;
    const saved = deps.ctx && threat() >= life && threat(s) < life ? deps.ctx.save(actor) * 0.5 : 0;
    const lose = actNow && !canActFrom(battle, actor, s, usable) ? vNow * 0.5 : 0;
    const net = avoided + saved - vNow * deps.dodgeOpportunityShare - lose;
    if (net > 0 && (!best || net > best.net + 1e-9 || (Math.abs(net - best.net) < 1e-9 && s < best.slot))) best = { slot: s, net, kind: 'dodge a pending warning' };
  }
  return best;
}

/** Move Tile için en iyi plan (menzil sürümü; yoksa null). Üst üste hareket yok (telgraf kaçışı hariç). */
export function bestMoveRange(battle: Battle, actor: Combatant, mv: RangeMoveConfig, vNow: number, deps: RangeAiDeps): RangeMovePlan | null {
  const free = battle.freeTiles(actor.uid);
  if (free.length === 0) return null;
  const dodge = telegraphDodgeRange(battle, actor, free, vNow, deps);
  if (battle.lastActionOf(actor.uid) === 'move') return dodge;
  const memo: HitMemo = new Map();
  const attacks = rangedSkills(battle, actor);
  const usable = attacks.filter((s) => !blockedByCost(battle, actor, s));
  const canActNow = canActFrom(battle, actor, actor.slot, usable);
  // "kırılgan" = yakın menzilli (<= 1) saldırısı yok VE canı eksik (tam canla geri çekilme yok)
  const close = attacks.some((s) => battle.rangeOf(actor, s) <= 1);
  const fragile = !close && ratio(actor) < Math.min(1, mv.retreatHpRatio * 2);
  const wounded = ratio(actor) < mv.retreatHpRatio;
  const neighbors = (slot: number) => battle.living(actor.side).filter((c) => c.uid !== actor.uid && c.board === actor.board && Math.abs(battle.rowOf(c.slot) - battle.rowOf(slot)) + Math.abs(battle.laneOf(c.slot) - battle.laneOf(slot)) <= 1).length;
  // Bitişik dost sayısı çok olan, sonra öne yakın, sonra küçük yuva
  const pickSlot = (slots: number[]): number => [...slots].sort((a, b) => neighbors(b) - neighbors(a) || battle.rowOf(a) - battle.rowOf(b) || a - b)[0]!;
  const plans: RangeMovePlan[] = [];

  // 1) Geri çekilme: kırılgan ya da yaralı birim düşman menziline açıkken tehdit büyükse, daha az vurulacağı hücreye (saldırabildiği hücreler önce)
  if (fragile || wounded) {
    const now = incomingAt(battle, actor, actor.slot, memo);
    if (now >= mv.minAvoidShare * actor.hp) {
      const safer = free.map((s) => ({ s, inc: incomingAt(battle, actor, s, memo) })).filter((x) => x.inc < now);
      const keepActing = canActNow ? safer.filter((x) => canActFrom(battle, actor, x.s, usable)) : safer;
      const pool = keepActing.length > 0 ? keepActing : safer;
      if (pool.length > 0) {
        const low = Math.min(...pool.map((x) => x.inc));
        const slot = pickSlot(pool.filter((x) => x.inc <= low + 1e-9).map((x) => x.s));
        const avoided = now - low;
        const losesAction = canActNow && !canActFrom(battle, actor, slot, usable);
        const cost = vNow * (fragile ? mv.opportunityShare : mv.meleeOpportunityShare) + (losesAction ? vNow * 0.5 : 0);
        const saved = deps.ctx && deps.ctx.rescued(actor, 0, avoided) ? deps.ctx.save(actor) : 0;
        if (avoided >= mv.minAvoidShare * actor.hp && avoided + saved > cost) plans.push({ slot, net: avoided + saved - cost, kind: 'retreat out of enemy range' });
      }
    }
  }

  // 2) Menzile girme: şu an hiçbir saldırısı ulaşmıyor; ulaştığı boş hücre varsa potansiyel değer (gelen hasar riski düşülür)
  if (usable.length > 0 && !canActNow && !(wounded && fragile)) {
    const into = free.filter((s) => canActFrom(battle, actor, s, usable));
    if (into.length > 0) {
      let top: { slot: number; potential: number; risk: number } | null = null;
      for (const s of into) {
        const potential = potentialFrom(battle, actor, s, memo);
        const risk = incomingAt(battle, actor, s, memo) * (deps.vc.advanceRiskShare ?? 0.5) * (1 - ratio(actor));
        const v = potential - risk;
        const tv = top ? top.potential - top.risk : -Infinity;
        // eşitlikte: uzak birim (yakın saldırısı yok) EN DERİN hücreyi, yakın dövüşçü öndekini seçer (range.md: uzaklar geride, önde savaşanlar önde)
        const depth = (x: number) => (close ? -battle.rowOf(x) : battle.rowOf(x));
        const tie = Math.abs(v - tv) < 1e-9 && top !== null;
        if (!top || v > tv + 1e-9 || (tie && (depth(s) > depth(top.slot) || (depth(s) === depth(top.slot) && (neighbors(s) > neighbors(top.slot) || (neighbors(s) === neighbors(top.slot) && s < top.slot)))))) top = { slot: s, potential, risk };
      }
      if (top && top.potential > 0) {
        const net = top.potential * 0.9 - top.risk - vNow;
        if (net >= mv.minFrontGainShare * top.potential) plans.push({ slot: top.slot, net, kind: 'step into range' });
      }
    } else if (vNow <= 0) {
      // 3) Yaklaşma: hiçbir hücreden ulaşamıyor ve yapacak hamle yok (pas yerine): en yakın düşman daima karşı tarafın en öndeki dolu sırasıdır,
      // mesafe = kendi sıra derinliği + 1; daha öndeki hücreye geç
      const closer = free.filter((s) => battle.rowOf(s) < battle.rowOf(actor.slot));
      if (closer.length > 0) {
        const best = Math.min(...closer.map((s) => battle.rowOf(s)));
        plans.push({ slot: pickSlot(closer.filter((s) => battle.rowOf(s) === best)), net: 0.01 * actor.maxHp, kind: 'approach (nothing in range from any cell)' });
      }
    }
  }

  // 4) Aura komşuluğu: zırh aurası taşıyan birim, saldırı yeteneğini koruyarak daha çok dostun bitişiğine geçer
  const aura = actor.passive?.effect;
  if (aura?.type === 'armorAura' && battle.living(actor.side).length > 1) {
    const incoming = new Map<string, number>();
    const here = deps.auraBenefit(battle, actor, actor.slot, aura.pct, incoming);
    let top: RangeMovePlan | null = null;
    for (const s of free) {
      if (canActNow && !canActFrom(battle, actor, s, usable)) continue;
      if (battle.rowOf(s) > battle.rowOf(actor.slot)) continue;
      const gain = deps.auraBenefit(battle, actor, s, aura.pct, incoming) - here;
      const net = gain - vNow * mv.opportunityShare;
      if (gain >= mv.minAuraGain && net > 0 && (!top || net > top.net || (net === top.net && s < top.slot))) top = { slot: s, net, kind: 'aura adjacency' };
    }
    if (top) plans.push(top);
  }

  if (dodge) plans.push(dodge);
  return plans.length ? plans.reduce((a, b) => (b.net > a.net ? b : a)) : null;
}
