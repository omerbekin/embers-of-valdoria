import type { Battle } from './battle';
import { damageRange, healRange, missingHpHealMult } from './formulas';
import { betMultipliers, betStakeParts } from './gamble';
import { burnAmountFor, emptyProcApplies } from './mana-burn';
import { damageSpecFor, type DamageEffect } from './spec';
import { slotOfTileUid } from './battle';
import { attributePower, hitChance } from './stats';
import type { Combatant, OnAbsorbSpec, Side, SkillDef, SkillEffect } from './types';
import type { HitInfo, TreeQuery } from './tree-hooks';

/** Item affix çarpanlı güç (motorla aynı ifade): çarpan yoksa güç aynen. */
const pw = (power: number, m: number | undefined): number => (m !== undefined && m !== 1 ? power * m : power);

/**
 * Bir skill'in bir hedefe tahmini etkisi. Kalkan önce emer; değerler ortalama ve [min, max] aralığıdır
 * (kritik hariç; `critMax` kritik vuruşta ulaşılabilecek en yüksek değerdir).
 * Saf ve belirleyicidir: savaşı değiştirmez, RNG kullanmaz (UI hover önizlemesi ve yapay zeka için).
 */
export interface TargetPreview {
  uid: string;
  damage?: {
    min: number;
    max: number;
    avg: number;
    /** Kalkanın emeceği ortalama miktar. */
    absorbed: number;
    /** Cana ulaşacak hasar (ortalama / en az / en çok), hedefin mevcut canıyla sınırlı. */
    hpLoss: number;
    hpLossMin: number;
    hpLossMax: number;
    /** sure: en düşük hasar bile öldürür; maybe: yalnızca yüksek zarda öldürür; null: öldürmez. */
    lethal: 'sure' | 'maybe' | null;
    /** Madde 258: vuruş ölümcülse hedefin onu Lucky Escape ile tamamen yok sayma şansı (Luck primary, savaşta henüz kullanılmadıysa); yoksa tanımsız. */
    luckyEscape?: number;
    critChance: number;
    critMax: number;
    /** Skill ağacı: bu vuruşun kritik çarpanı (critDmgMul dahil); yalnızca kancalı aktörde, yoksa actor.stats.critMult. */
    critMult?: number;
    /** İsabet şansı (0-1): saldırganın accuracy'si - hedefin evasion'ı, x(1 - hedefin blok şansı) (fiziksel vuruşta kalkan). min/max/avg ve hpLoss değerleri İSABET ETTİĞİNDE geçerlidir; beklenen hasar = avg x hitChance. */
    hitChance: number;
    /** Beklenen hasar: avg x hitChance (kalkan/can ayrımı yapmaz; birden çok etkide toplanır). */
    expected: number;
    /** Arkadaki birime sıçrayan kısmî hasar (ana hedef değil). */
    splash: boolean;
  };
  heal?: { min: number; max: number; avg: number; critChance: number; critMax: number };
  /** Tur bazlı şifa: tur başına miktar, tur sayısı, toplam (eksik canla sınırlı). */
  hot?: { perTurn: number; turns: number; total: number };
  /** `onAbsorb`: kancalı kalkan (Spell Ward / Mana Barrier): emdikçe tetiklenecek kancalar (skills.json aynen). */
  shield?: { amount: number; magic: boolean; onAbsorb?: OnAbsorbSpec };
  /** Dispel/cleanse: hedeften silinecek durumların adları (Mana Barrier: debuff'lar). Silinecek yoksa boş dizi. */
  dispel?: string[];
  /**
   * Çağrı (kullanıcının girdisinde): çağrılacak birim, maks canı ve (ceset tüketen çağrıda) beslenmiş mi + tüketilecek ceset (yoksa null).
   * `empowered` yalnızca Raise Dead gibi ceset tüketen çağrılarda tanımlı (UI mor parıltı / "Empowered" yazısı).
   */
  summon?: { unit: string; name: string; hp: number; empowered?: boolean; corpse?: string | null; /** Çağrının geleceği yuva (seçilen ya da varsayılan). */ slot?: number | null };
  /** Yer etkisi: tik başına büyü hasarı (hedefin büyü zırhı ve element zayıflığı dahil), tur sayısı, toplam. */
  ground?: { perTick: number; turns: number; total: number };
  /** Yakılacak mana. */
  burn?: number;
  /**
   * Mana boşalma zarı (manaBurn onEmpty, Drain Field; madde 260): bu yakımla MP'si 0'a inecek (ya da zaten 0 olan) hedefte `chance` ihtimalle
   * `status` (`turns` tur) + hasar (kritik hariç aralık; isabet zarı yok, kalkan düşülmemiş). Zar tutmazsa hiçbiri olmaz.
   */
  emptyProc?: { chance: number; status: string; statusName: string; turns: number; /** Yok: boşalma hasarı ağaçla kaldırıldı (Shallow Net). */ damage?: { min: number; max: number; avg: number; critChance: number; critMax: number } };
  /** Uygulanacak durumlar, okunur metin (ör. "Taunt 2 turns"). */
  statuses?: string[];
  /**
   * Yığılan durum (Omen; skill isabet ederse): önce/sonra yığın (kritikte `afterCrit`), üst sınır, sayaç (`turnsLeft`: bu hamleden sonraki süre: yeni yığın ya da
   * `refreshOnStack` ise tam süre, değilse mevcut süre). `doom`: bu hamle Doom tetikliyorsa (yığın doluyor ya da detonate) patlama aralığı (kritik hariç; `critMax` kritikte en çok),
   * patlayacak yığın, çarpan ve neden; `doomOnCrit`: kritik lanet (critStacks) yığını farklı yaparsa o durumdaki patlama (kritiksiz doldurmuyorsa
   * yalnızca kritikte tetiklenir; detonate'te daha büyük patlama).
   */
  omen?: {
    status: string;
    before: number;
    after: number;
    afterCrit: number;
    max: number;
    turnsLeft: number;
    doom?: DoomPreview;
    doomOnCrit?: DoomPreview;
  };
  /** Karakter üstü DoT (Wither): tik başına hasar (zırh/zayıflık dahil), tur sayısı, toplam. */
  dot?: { status: string; perTick: number; turns: number; total: number };
  /** Kontrol bağışıklığı (madde 271/272): hedefin YEMEYECEĞİ durumların adları (boss: Stun, Slow, Silence, Blinded, Jinxed); `statuses` satırında 'Immune: Stun'. */
  immune?: string[];
  /** advanceToFront (Warrior Charge; kullanıcının girdisinde): skill sonrası geçeceği ön sıra hücresi (`from` -> `to`); ön sıradaysa ya da yer yoksa tanımsız. */
  advance?: { from: number; to: number };
}

/**
 * Hedef(ler) için etki önizlemesi. Tek hedefli skill'de `targetUid` verilmelidir.
 * Ceset tüketen çağrıda (Raise Dead) `corpseUid` seçilen ceset (yoksa YZ önerisi = en tehlikeli), `slot` seçilen çağrı yuvası.
 */
export function previewSkill(battle: Battle, actorUid: string, skillId: string, targetUid?: string, slot?: number, board?: Side, corpseUid?: string): TargetPreview[] {
  const actor = battle.get(actorUid);
  if (!actor || !battle.skill(skillId, actor)) return [];
  let targets = battle.validTargets(actorUid, skillId);
  if (battle.skill(skillId, actor)?.target === 'random_enemies') return []; // hedefler rastgele: önizleme yok
  let centerUid: string | undefined;
  if (battle.isAreaSkill(skillId, actor)) {
    // Anchor birimi erişim dışında (arkada) da olabilir: anchor yalnızca hücreyi belirler. Hedef sırası gerçek vuruşla aynı (aşamalıda aşama sırası;
    // falloff bu sırayla), toplam hasar aşamalı/aşamasız aynı hesaplanır. area_any: tahta = anchor biriminin tahtası / `tile:<yuva>` kendi tahtası / `board`.
    const anyBoard = battle.isAnyBoardArea(skillId, actor);
    const tileSlot = anyBoard ? slotOfTileUid(targetUid) : undefined;
    const anchored = targetUid && tileSlot === undefined ? battle.get(targetUid) : undefined;
    const b: Side = anyBoard ? (tileSlot !== undefined ? actor.side : anchored && anchored.hp > 0 ? anchored.board : (board ?? foe(actor.side))) : foe(actor.side);
    const unit = anchored && anchored.hp > 0 && anchored.board === b ? anchored : undefined;
    const center = unit ? unit.slot : (tileSlot ?? slot);
    // Menzil (range.md): anchor hücre menzil dışındaysa atış geçersiz -> önizleme boş (kapalıyken inRange hep evet)
    targets = center === undefined || !battle.inRange(actor, battle.skill(skillId, actor)!, b, center) ? [] : battle.areaWindowAt(actorUid, skillId, center, b);
    centerUid = center === undefined ? undefined : targets.find((t) => t.board === b && t.slot === center)?.uid;
  } else if (battle.needsTargetChoice(skillId, actor)) {
    targets = targets.filter((t) => t.uid === targetUid);
    // Yan vuruşlu skill: seçilen hedefin yanındaki hücreler de vurulur (ilk giriş seçilen hedef)
    if (targets[0]) targets = [targets[0], ...battle.splashTargets(skillId, targets[0], actorUid)];
  }
  return previewForTargets(battle, actor, skillId, targets, centerUid, battle.needsSlotChoice(skillId) ? { corpseUid, slot } : undefined);
}

const foe = (side: Side): Side => (side === 'party' ? 'enemy' : 'party');

/**
 * Verilen hedef listesi için etkiyi hesaplar; arkaya sıçrayan hasar ayrı bir giriş olarak döner.
 * `centerUid`: alan skill'inde anchor hücredeki birim (area.hitsAtCenter > 1 ise hasar etkileri ona o kadar kez uygulanır: X şekli).
 */
export function previewForTargets(battle: Battle, actor: Combatant, skillId: string, targets: Combatant[], centerUid?: string, summonPick?: { corpseUid?: string; slot?: number }): TargetPreview[] {
  const skill = battle.skill(skillId, actor);
  if (!skill) return [];
  const f = battle.formulas;
  const out = new Map<string, TargetPreview>();
  const entry = (uid: string) => {
    let e = out.get(uid);
    if (!e) out.set(uid, (e = { uid }));
    return e;
  };

  // Her hedef için sıralı etkiler (kalkan ve hasar birbirini etkiler)
  const pools = new Map<string, { hp: number; shield: number; magicShield: number }>();
  const pool = (c: Combatant) => {
    let p = pools.get(c.uid);
    if (!p) pools.set(c.uid, (p = { hp: c.hp, shield: c.shield, magicShield: c.magicShield }));
    return p;
  };

  const addDamage = (target: Combatant, base: DamageEffect, powerMult: number, splash: boolean, hitInfo?: HitInfo) => {
    // Skill ağacı C1 (Faz 2a): gerçek vuruşla aynı koşullu etki kopyası (kritik / zırh delme / lifesteal); güç dealtDamageMult'ta. Kancasızda aynı nesne
    const tq: TreeQuery = actor.treeHooks && hitInfo ? { hit: hitInfo } : {};
    const effect = battle.treeEffect(actor, target, skill, base, tq);
    const tm = actor.treeHooks ? battle.treeMods(actor, target, skill, base, tq) : null;
    const stats = battle.effectiveStats(target);
    const specFor = (mult: number) => damageSpecFor(actor, target, effect, f, powerMult * mult, !splash, battle.damageTakenMult(target, actor, effect.damageType, skill) * battle.flockMult(actor, target), battle.dealtDamageMult(actor, target, skill, effect, tq), effect.bonusScale ? battle.effectiveStats(actor) : undefined);
    // Ağaç: düz hasar (flatDamage) ve vuruş sonrası (hitIsCrit) kancaları gerçek vuruşla aynı sırada (çarpan, sonra düz ek); kancasızda aynı aralık
    const adj = (x: number, late: { mult: number; flat: number } | null) => (late || tm?.flat ? Math.round(x * (late?.mult ?? 1) + (tm?.flat ?? 0) + (late?.flat ?? 0)) : x);
    const lateN = actor.treeHooks ? battle.lateDamage(actor, target, skill, base, specFor(1), false, tq) : null;
    const lateC = actor.treeHooks ? battle.lateDamage(actor, target, skill, base, specFor(1), true, tq) : null;
    const rawRange = (mult: number) => damageRange(battle.attackStats(actor), stats, specFor(mult), f);
    const range = (mult: number) => {
      const r0 = rawRange(mult);
      return lateN || tm?.flat ? { min: adj(r0.min, lateN), max: adj(r0.max, lateN), avg: adj(r0.avg, lateN) } : r0;
    };
    // Bahis: en az (kayıp), en çok (kazanç) ve beklenen çarpan (güce uygulanır, gerçek vuruşla aynı yuvarlama); çifte vuruş: en çok 2 vuruş, beklenen 1 + ihtimal
    let lo = 1;
    let hi = 1;
    let ex = 1;
    if (effect.bet) {
      const mpLeft = skill.cost.resource === 'mp' && !battle.freeMp ? actor.mp - skill.cost.amount : actor.mp;
      // Skill ağacı bahis yaması (winChance / stakeMul): gerçek zarla aynı tanım
      const tb = actor.treeHooks ? battle.treeBet(actor, target, skill, effect.bet) : null;
      const bet = tb?.bet ?? effect.bet;
      // Mortgage (bet.hpStake): ek can bahsi kazanç çarpanında MP sayılır (betStakeParts; stakeMul her parçaya ayrı, gerçek zarla aynı)
      const sp = betStakeParts(bet, actor.maxHp, actor.hp, mpLeft, tb?.stakeMul ?? 1);
      const m = betMultipliers(bet, sp.main + sp.hp);
      lo = m.lose;
      hi = Math.max(m.win, m.lose);
      ex = m.expected;
    }
    const again = effect.repeatChance ?? 0;
    // Garantili kritik (Backstab): her vuruş kritik; aralık kritik çarpanıyla verilir (critChance 1)
    // Ağaç: kritik çarpanı (critDmgMul) ve noCrit; kancasızda actor.stats.critMult
    const cmult = actor.treeHooks ? battle.critMultFor(actor, target, skill, base, tq) : actor.stats.critMult;
    const noCrit = !!tm?.noCrit;
    const critR = (mult: number) => {
      const r0 = rawRange(mult);
      return lateC || tm?.flat ? { min: adj(r0.min * cmult, lateC), max: adj(r0.max * cmult, lateC), avg: adj(r0.avg * cmult, lateC) } : { min: r0.min * cmult, max: r0.max * cmult, avg: r0.avg * cmult };
    };
    const sureC = effect.guaranteedCrit && !noCrit;
    const r = sureC
      ? { min: lo <= 0 ? 0 : Math.round(critR(lo).min), max: Math.round(critR(hi).max) * (again > 0 ? 2 : 1), avg: Math.round(critR(ex).avg * (1 + again)) }
      : { min: lo <= 0 ? 0 : Math.round(range(lo).min), max: Math.round(range(hi).max) * (again > 0 ? 2 : 1), avg: Math.round(range(ex).avg * (1 + again)) };
    // İsabet: durum ekleri (Blinded/Shrouded) dahil geçerli stat'lar, gerçek vuruşla aynı
    // Blok (Ömer 2026-10-18): kalkanlı hedef fiziksel vuruşu bloklayabilir; bloklanan vuruş iska gibi (hasar ve ek etki yok)
    // Ağaç sureHit: isabet zarı yok (blok yine olabilir)
    const hit = (tm?.sureHit ? 1 : hitChance(battle.effectiveStats(actor), stats, f)) * (1 - battle.blockChance(actor, target, effect, skill));
    const p = pool(target);
    // Bu hasarı emebilecek havuz: büyü hasarını iki kalkan da, fizikseli yalnızca genel kalkan emer
    const soak = effect.damageType === 'magic' ? p.magicShield + p.shield : p.shield;
    const loss = (v: number) => Math.min(p.hp, Math.max(0, v - soak));
    const hpLoss = loss(r.avg);
    const absorbed = Math.min(soak, r.avg);
    const e = entry(target.uid);
    const prev = e.damage;
    e.damage = {
      min: (prev?.min ?? 0) + r.min,
      max: (prev?.max ?? 0) + r.max,
      avg: (prev?.avg ?? 0) + r.avg,
      absorbed: (prev?.absorbed ?? 0) + absorbed,
      hpLoss: (prev?.hpLoss ?? 0) + hpLoss,
      hpLossMin: (prev?.hpLossMin ?? 0) + loss(r.min),
      hpLossMax: (prev?.hpLossMax ?? 0) + loss(r.max),
      lethal: null,
      critChance: noCrit ? 0 : effect.guaranteedCrit ? 1 : battle.effectiveStats(actor, effect.critBonus ?? 0).critChance, // critBonus: Jinx
      critMax: (prev?.critMax ?? 0) + (sureC || noCrit ? r.max : actor.treeHooks ? Math.round(critR(hi).max) * (again > 0 ? 2 : 1) : Math.round(r.max * actor.stats.critMult)),
      ...(actor.treeHooks ? { critMult: cmult } : {}),
      hitChance: hit,
      expected: (prev?.expected ?? 0) + r.avg * hit,
      splash: prev ? prev.splash && splash : splash,
    };
    // Sonraki etkiler için havuzları güncelle (magic: önce büyü kalkanı)
    let rest = r.avg;
    if (effect.damageType === 'magic') {
      const a = Math.min(p.magicShield, rest);
      p.magicShield -= a;
      rest -= a;
    }
    const b = Math.min(p.shield, rest);
    p.shield -= b;
    rest -= b;
    p.hp = Math.max(0, p.hp - rest);
  };

  const selfShieldDone = new Set<unknown>();
  // Skill ağacı ölçeği hitWithStatus (Faz 2a): gerçek vuruştaki gibi bu skill'in hedefleri (yalnızca kancalı aktör; bitince temizlenir)
  const prevTargets = actor.treeHooks ? battle.setCondTargets(targets) : null;
  for (const target of targets) {
    for (const effect of skill.effects) {
      if (!battle.effectAppliesTo(skill, effect, target, actor)) continue;
      if (effect.type === 'status') {
        if (effect.self) continue;
        const def = battle.statusDef(effect.status);
        const e = entry(target.uid);
        if (battle.statusBlocked(target, effect.status)) {
          // Boss: CC durumu (madde 271) ve isabet/kritik cezası (Blinded, Jinxed; madde 272) işlemez
          e.immune = [...(e.immune ?? []), def?.name ?? effect.status];
          e.statuses = [...(e.statuses ?? []), `Immune: ${def?.name ?? effect.status}`];
          continue;
        }
        // Skill ağacı C1 (Faz 2a): koşullu süre / şans eki gerçek uygulamayla aynı (kancasızda null, metin aynı)
        const tm = actor.treeHooks ? battle.treeMods(actor, target, skill, effect) : null;
        const ch = tm ? Math.max(0, Math.min(1, (effect.chance ?? 1) + tm.chance)) : effect.chance;
        const turns = tm ? Math.max(1, Math.round(effect.turns + tm.turns)) : effect.turns;
        const chance = ch !== undefined && ch < 1 ? ` (${Math.round(ch * 100)}% chance)` : '';
        e.statuses = [...(e.statuses ?? []), `${def?.name ?? effect.status} ${turns} turns${chance}`];
      } else if (effect.type === 'damage') {
        // Çok hedefli (alan) vuruşta her yeni hedef bir öncekinin falloff katı hasar alır (hedef sırası = vuruş sırası)
        const idx = effect.falloff || skill.splash ? targets.indexOf(target) : 0;
        const side = !!skill.splash && idx > 0; // yan vuruş: ana hedefin yanındaki hücre
        // X şekli: merkez çift vuruş; Faz 5a hitsEach: alandaki her birim (merkezde büyüğü)
        const each = skill.area?.hitsEach ?? 1;
        const times = centerUid !== undefined && target.uid === centerUid ? Math.max(1, skill.area?.hitsAtCenter ?? 1, each) : Math.max(1, each);
        // Skill ağacı: vuruş bilgisi (sıra / merkez) ve falloff eki gerçek vuruşla aynı (kancasızda ifade aynı)
        const isC = centerUid !== undefined ? target.uid === centerUid : undefined;
        // Faz 5a (Thrown Stiletto): fırlatma (arkası dolu hedef) gerçek vuruşla aynı
        const thrownHit = !!skill.treeThrown && battle.openBehindProblem(target) !== null;
        const hiOf = (k: number): HitInfo | undefined => (actor.treeHooks ? { index: idx, ...(isC !== undefined ? { center: isC } : {}), ...(isC ? { centerHit: k + 1 } : {}), mpBefore: target.mp, ...(thrownHit ? { thrown: true } : {}) } : undefined);
        const fa = actor.treeHooks && effect.falloff ? (battle.treeMods(actor, target, skill, effect, { hit: hiOf(0)! })?.falloffAdd ?? 0) : 0;
        const fo = effect.falloff ? effect.falloff + fa : effect.falloff;
        for (let k = 0; k < times; k++) addDamage(target, effect, (fo ? Math.pow(fo, idx) : 1) * (side ? skill.splash!.mult ?? 1 : 1), idx > 0 || k > 0, hiOf(k));
      } else if (effect.type === 'randomStatus') {
        const e = entry(target.uid);
        const blocked = effect.options.filter((o) => battle.statusBlocked(target, o.status)).map((o) => battle.statusDef(o.status)?.name ?? o.status);
        if (blocked.length > 0) e.immune = [...(e.immune ?? []), ...blocked];
        e.statuses = [...(e.statuses ?? []), `Random: ${effect.options.map((o) => battle.statusDef(o.status)?.name ?? o.status).join(' / ')}${blocked.length > 0 ? ` (immune to ${blocked.join(', ')})` : ''}`];
      } else if (effect.type === 'heal') {
        const r = healRange(actor.stats, effect.scale, pw(effect.power, actor.stats.healPowerMult), f);
        const missing = target.maxHp - target.hp;
        // missingHpBonus (Radiance): motorla aynı çarpan (hedefin şu anki eksik can oranı)
        const low0 = missingHpHealMult(effect.missingHpBonus, target.hp, target.maxHp);
        // Faz 4a C4: ağaç şifa çarpanı (healTaken / healDealt; gerçek şifayla aynı); kancasızda 1
        const low = low0 * battle.treeHealMult(actor, target, skill);
        const k = (v: number) => (low === 1 ? v : Math.round(v * low));
        entry(target.uid).heal = {
          min: Math.min(k(r.min), missing),
          max: Math.min(k(r.max), missing),
          avg: Math.min(k(r.avg), missing),
          critChance: actor.stats.critChance,
          critMax: Math.min(Math.round(low === 1 ? r.max * actor.stats.critMult : r.max * actor.stats.critMult * low), missing),
        };
      } else if (effect.type === 'revive') {
        const e = entry(target.uid);
        e.statuses = [...(e.statuses ?? []), `Revived: ${Math.max(1, Math.round(target.maxHp * effect.hpRatio))} HP, ${Math.round(target.maxMp * effect.mpRatio)} MP`];
      } else if (effect.type === 'hot') {
        const perTurn = Math.round(attributePower(actor.stats, effect.scale, f) * pw(effect.power, actor.stats.healPowerMult));
        entry(target.uid).hot = {
          perTurn,
          turns: effect.turns,
          total: Math.min(perTurn * effect.turns, target.maxHp - target.hp),
        };
      } else if (effect.type === 'shield') {
        if (effect.self) {
          if (selfShieldDone.has(effect)) continue; // kendine kalkan: hedef sayısından bağımsız bir kez
          selfShieldDone.add(effect);
        }
        const recipient = effect.self ? actor : target;
        const mpLeft = skill.cost.resource === 'mp' ? actor.mp - skill.cost.amount : actor.mp;
        const amount0 = Math.round(attributePower(actor.stats, effect.scale, f) * pw(effect.power, actor.stats.shieldPowerMult)) + Math.round((effect.bonusPerMana ?? 0) * mpLeft);
        // Faz 4a C4 (shieldDealt): gerçek kalkanla aynı çarpan; kancasızda aynı miktar
        const shm = battle.treeShieldMult(actor, recipient, skill);
        const amount = shm !== 1 ? Math.max(0, Math.round(amount0 * shm)) : amount0;
        entry(recipient.uid).shield = { amount, magic: effect.shieldType === 'magic', ...(effect.onAbsorb ? { onAbsorb: { ...effect.onAbsorb } } : {}) };
      } else if (effect.type === 'dispel') {
        const e = entry(target.uid);
        const names = battle.dispelCandidates(target, effect.status).slice(0, effect.count ?? Infinity).map((s) => battle.statusDef(s.kind)?.name ?? s.kind);
        e.dispel = [...(e.dispel ?? []), ...names];
        if (names.length > 0) e.statuses = [...(e.statuses ?? []), `Removes ${names.join(', ')}`];
      } else if (effect.type === 'bond') {
        const e = entry(target.uid);
        e.statuses = [...(e.statuses ?? []), `${battle.statusDef('dark_bond')?.name ?? 'Dark Bond'} ${effect.turns} turns`];
      } else if (effect.type === 'summon') {
        const sp = battle.summonPreview(actor.uid, skill.id, summonPick?.corpseUid, summonPick?.slot);
        if (sp.unit) entry(actor.uid).summon = { unit: sp.unit.id, name: sp.unit.name, hp: sp.unit.stats.hp, slot: sp.slot, ...(sp.empowered !== undefined ? { empowered: sp.empowered, corpse: sp.corpse?.uid ?? null } : {}) };
      } else if (effect.type === 'ground' && battle.isHealGround(effect.ground)) {
        // D11 (Holy Ground): şifa zemini dosta tur başı şifa gibi görünür (hot); toplam, anlık şifadan sonra kalan eksik canla sınırlı
        const e = entry(target.uid);
        const perTurn = battle.groundTickHeal(Math.round(attributePower(actor.stats, effect.scale, f) * effect.power), target);
        const room = Math.max(0, target.maxHp - target.hp - (e.heal?.avg ?? 0));
        e.hot = { perTurn, turns: effect.turns, total: Math.min(perTurn * effect.turns, room) };
      } else if (effect.type === 'ground') {
        const perTick = battle.groundTickDamage(effect.ground, Math.round(attributePower(actor.stats, effect.scale, f) * effect.power), target);
        const e = entry(target.uid);
        e.ground = { perTick: (e.ground?.perTick ?? 0) + perTick, turns: effect.turns, total: (e.ground?.total ?? 0) + perTick * effect.turns };
      } else if (effect.type === 'manaBurn') {
        const e = entry(target.uid);
        e.burn = (e.burn ?? 0) + burnAmountFor(effect, target);
        // Madde 260 (Drain Field): MP'si bu yakımla 0'a inecek (ya da zaten 0) hedefte onEmpty zarı: ihtimal, durum ve hasar aralığı (isabet zarı yok)
        const spec = effect.onEmpty;
        if (spec && emptyProcApplies(effect, target)) {
          const dmg: DamageEffect | undefined = spec.damage ? { type: 'damage', ...spec.damage } : undefined;
          const r = dmg ? damageRange(battle.attackStats(actor), battle.effectiveStats(target), damageSpecFor(actor, target, dmg, f, 1, false, battle.damageTakenMult(target, actor, dmg.damageType, skill), battle.dealtDamageMult(actor, target, skill), dmg.bonusScale ? battle.effectiveStats(actor) : undefined), f) : undefined;
          if (battle.statusBlocked(target, spec.status)) e.immune = [...(e.immune ?? []), battle.statusDef(spec.status)?.name ?? spec.status];
          e.emptyProc = {
            chance: spec.chance,
            status: spec.status,
            statusName: battle.statusDef(spec.status)?.name ?? spec.status,
            turns: spec.turns,
            ...(r ? { damage: { min: r.min, max: r.max, avg: r.avg, critChance: battle.effectiveStats(actor).critChance, critMax: Math.round(r.max * actor.stats.critMult) } } : {}),
          };
        }
      } else if (effect.type === 'taunt') {
        const e = entry(target.uid);
        e.statuses = [...(e.statuses ?? []), `Taunt ${effect.turns} turns`];
      } else if (effect.type === 'guard') {
        const e = entry(target.uid);
        e.statuses = [...(e.statuses ?? []), `Guard ${effect.turns} turns`];
      } else if (effect.type === 'dot') {
        const amount = Math.round(attributePower(actor.stats, effect.scale, f) * pw(effect.power, actor.stats.dotPowerMult));
        const old = target.statuses.find((s) => s.kind === effect.status)?.amount ?? 0;
        const perTick = battle.dotTickDamage(effect.status, Math.max(amount, old), target);
        entry(target.uid).dot = { status: effect.status, perTick, turns: effect.turns, total: perTick * effect.turns };
      } else if (effect.type === 'omen') {
        const o = omenPreview(battle, actor, skill, target, effect.status ?? 'omen', effect.stacks, effect.critStacks ?? effect.stacks, pool(target), effect.critDoomOnCrit === true);
        if (o) entry(target.uid).omen = o;
      }
    }
  }
  if (actor.treeHooks) battle.setCondTargets(prevTargets);

  // advanceToFront (Warrior Charge): kullanıcının skill sonrası geçeceği ön sıra hücresi (kendi girdisinde, en sonda)
  if (skill.advanceToFront) {
    const to = battle.advanceDestination(actor);
    if (to !== null) {
      const e = entry(actor.uid);
      e.advance = { from: actor.slot, to };
      e.statuses = [...(e.statuses ?? []), 'Then steps into the front row'];
    }
  }

  for (const e of out.values()) {
    if (!e.damage) continue;
    const target = battle.get(e.uid);
    if (!target) continue;
    e.damage.lethal = e.damage.hpLossMin >= target.hp ? 'sure' : e.damage.hpLossMax >= target.hp ? 'maybe' : null;
    // Madde 258: hedefin kullanılmamış Lucky Escape hakkı varsa ölümcül vuruş o şansla yok sayılır: 'sure' -> 'maybe'
    const lucky = battle.luckyEscapeChance(target.uid);
    if (lucky > 0 && e.damage.lethal) {
      e.damage.luckyEscape = lucky;
      if (e.damage.lethal === 'sure') e.damage.lethal = 'maybe';
    }
  }
  return [...out.values()];
}

/** Doom patlamasının önizlemesi (kritik hariç aralık; `hpLoss`: skill'in vuruşundan sonra kalan kalkan/canla sınırlı ortalama can kaybı). */
export interface DoomPreview {
  min: number;
  max: number;
  avg: number;
  critMax: number;
  critChance: number;
  omens: number;
  mult: number;
  cause: 'complete' | 'detonate';
  hpLoss: number;
  /** true: bu Doom KESİN kritik (kritik Jinx'in tamamladığı Doom, critDoomOnCrit): `critChance` 1, `hpLoss` kritik ortalamasıyla. */
  sureCrit?: boolean;
}

/**
 * Omen etkisinin hedefteki önizlemesi (isabet ederse): yığın önce/sonra, sayaç ve tetiklenecekse Doom aralığı (Hexer'in o anki ölçek statı ve kritik şansı;
 * gerçek patlamayla aynı battle.doomRange). `p`: skill'in hasar etkilerinden sonra hedefte kalan can/kalkan (önizleme havuzu).
 */
function omenPreview(battle: Battle, actor: Combatant, skill: SkillDef, target: Combatant, kind: string, stacks: number, critStacks: number, p: { hp: number; shield: number; magicShield: number }, critDoomOnCrit = false): TargetPreview['omen'] {
  const def = battle.statusDef(kind);
  if (!def?.maxStacks) return undefined;
  const max = def.maxStacks;
  const cur = target.statuses.find((s) => s.kind === kind);
  const before = cur?.stacks ?? 0;
  const after = Math.min(max, before + stacks);
  const afterCrit = Math.min(max, before + critStacks);
  const det = skill.effects.find((e): e is Extract<SkillEffect, { type: 'detonate' }> => e.type === 'detonate' && e.status === kind);
  const doomAt = (omens: number, sureCrit = false): DoomPreview | undefined => {
    const doom = def.doom;
    if (!doom || (!det && omens < max)) return undefined;
    const mult = det ? det.mult : 1;
    const r = battle.doomRange(target, kind, omens, mult, actor.stats[doom.scale] * (actor.stats.spellPowerMult ?? 1)); // = Battle.doomStat
    if (!r) return undefined;
    const soak = doom.damageType === 'magic' ? p.magicShield + p.shield : p.shield;
    const avg = sureCrit ? r.avg * actor.stats.critMult : r.avg;
    return {
      min: r.min,
      max: r.max,
      avg: r.avg,
      critMax: Math.round(r.max * actor.stats.critMult),
      critChance: sureCrit ? 1 : battle.effectiveStats(actor).critChance,
      omens,
      mult,
      cause: det ? 'detonate' : 'complete',
      hpLoss: Math.min(p.hp, Math.max(0, avg - soak)),
      ...(sureCrit ? { sureCrit: true } : {}),
    };
  };
  const doom = doomAt(after);
  // Kritik lanet yığını farklı yaparsa o durumun patlaması; critDoomOnCrit (Jinx) ve otomatik Doom ise o Doom KESİN kritik
  // (yığın kritikte de aynı olsa bile: 2 Omen'li hedefe kritik Jinx -> kesin kritik Doom)
  const sureCritDoom = critDoomOnCrit && !det && afterCrit >= max;
  const doomCrit = afterCrit !== after || sureCritDoom ? doomAt(afterCrit, sureCritDoom) : undefined;
  const turnsLeft = !cur ? (def.duration ?? 3) : def.refreshOnStack ? Math.max(cur.turns, def.duration ?? 3) : cur.turns;
  return { status: kind, before, after, afterCrit, max, turnsLeft, ...(doom ? { doom } : {}), ...(doomCrit ? { doomOnCrit: doomCrit } : {}) };
}
