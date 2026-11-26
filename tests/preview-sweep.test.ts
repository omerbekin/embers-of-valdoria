/**
 * Güvenlik ağı (denetim r39 madde 9.1): önizleme = gerçek sonuç TARAMASI. Oynanabilir her sınıfın her skill'i, ağaçsız ve evolve'lu odak
 * kurulumlarıyla, `turns` modunda ve verideki menzil kuralıyla (eski dizilim / test modu / eski skill YOK) önizlenir ve aynı durumda gerçekten kullanılır.
 * Karşılaştırma (önizlemenin gösterdiği her hedef için, yalnız kullanıcının skill vuruşu / şifası / kalkanı):
 * - kritik kapalı: gerçek hasar ve şifa önizlenen [min, max] içinde; kalkan önizlenen miktarla aynı;
 * - kritik zorla açık: gerçek hasar [min, critMax] içinde (kritiğin rastgele kısmı aralıkla).
 * İsabet zorla tutar (kaçınma / ıska zarı önizlemede ayrı şans olarak durur). Hedeflerin canı büyük: öldürme kırpması karşılaştırmayı bozmasın.
 * Veride hasar / şifa / kalkan etkisi olan her skill en az bir kez denetlenmeli (boş geçme koruması).
 * BİLİNEN AÇIKLAR (KNOWN): motor hatası ya da belgelenmiş önizleme sınırı; liste dışı yeni sapma kırmızı, düzelen (artık sapmayan) madde de kırmızı
 * (liste güncel kalsın). Motor bu işte değiştirilmedi.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { Battle, content, previewForTargets, previewSkill, type BattleEvent, type Combatant, type CombatantDef, type SkillDef, type Teams, type UnitSetup } from '../src/engine';
import { compileTree, treeOf } from '../src/progression';
import { focusBuild } from '../src/progression/skill-tree';

const COLLECT = !!process.env.PREVIEW_SWEEP_COLLECT;
const SEEDS = [1, 2, 3];
const BIG = 50000;
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const CLASSES = Object.keys(content.classes).filter((id) => !content.classes[id]!.testOnly && treeOf(id));

interface Build {
  name: string;
  rows?: [number, number];
  dir?: 'a' | 'b';
}
const BUILDS: Build[] = [{ name: 'ağaçsız' }, { name: 'evolve 1+2 (a)', rows: [1, 2] }, { name: 'evolve 3+1 (a)', rows: [3, 1] }, { name: 'evolve 2+3 (b)', rows: [2, 3], dir: 'b' }];

/** Kullanıcı: yakın dövüşçü ön sırada (yuva 1), menzilli ikinci sırada (yuva 4). Dost (Archer) yanında; düşmanlar ön + arka sırada. */
function arena(cls: string, build: Build, seed: number, crit: 'never' | 'always'): { b: Battle; actor: Combatant } {
  const melee = content.isMeleeClass(cls);
  const mine = melee ? 1 : 4;
  const party: Record<number, string> = { [mine]: cls, [melee ? 0 : 3]: 'archer' };
  const units: Record<number, UnitSetup> = {};
  if (build.rows) {
    const tree = treeOf(cls)!;
    units[mine] = { tree: compileTree(tree, focusBuild(tree, build.rows, 50, build.dir ? { dir: build.dir } : {}))! };
  }
  const teams: Teams = { party: cells(party), enemies: cells({ 0: 'archer', 1: 'warrior', 4: 'mage' }), units: { party: units, enemies: {} } };
  const b = new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
  b.debug.crit = crit;
  b.debug.dodge = 'never'; // ne kaçınma ne ıska (isabet şansı önizlemede ayrı alan); eşyasız sınıfların blok şansı 0
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    Object.assign(c.stats, { surviveChance: 0 });
    // Düşmanların canı büyük (öldürme kırpması yok); dostlar ve kullanıcı kendi canlarının %60'ında (şifa kırpılmasın; can bedelli skill'ler
    // (Wail of the Dead) gerçek ölçekte ödesin: bedel mevcut canın oranı olduğundan büyük can, bedele bağlı ağaç bonuslarını şişirir)
    if (c.side === 'enemy') c.maxHp = c.hp = BIG;
    else c.hp = Math.max(1, Math.floor(c.maxHp * 0.6));
    c.mp = c.maxMp;
    if (c.maxRage !== undefined) c.rage = c.maxRage;
    if (c.maxBlood !== undefined) c.blood = c.maxBlood;
  }
  const actor = b.combatants.find((c) => c.side === 'party' && c.defId === cls)!;
  b.currentUid = actor.uid;
  return { b, actor };
}

type Dmg = Extract<BattleEvent, { type: 'damage' }>;
/**
 * Kullanıcının skill vuruşu. Sayılmayanlar: guard aktarımı, zemin / durum tiki ve Doom patlaması (`status` alanlı; ayrı önizlenir), ağaç tetiği /
 * özel kural vuruşu (`cause` alanlı, ör. "druid:1.ea"; skill önizlemesine girmez).
 */
const ownHit = (e: BattleEvent, actor: string, target: string): e is Dmg =>
  e.type === 'damage' && e.source === actor && e.target === target && !e.redirected && (e.origin === undefined || e.origin === 'skill') && !e.status && !e.cause;

const hasNumber = (sk: SkillDef): boolean => sk.effects.some((e) => e.type === 'damage' || e.type === 'heal' || e.type === 'shield');

/** Bilinen açıklar: "sınıf|kurulum|skill|tür" -> neden. */
const KNOWN: Record<string, string> = {
  // (B) düzeldi (2026-11-23): önizleme preHit Wound'unu (Gore Wheel 2.n0) hedef sırasıyla geçici koyar (preview.ts applyPreHit); Reaper's Spin /
  // Red Arc / Exsanguinate / Crimson Wheel önizlemede de Wound'u görür.
};

/**
 * Küçük / şansa / cana bağlı bilinen açıklar: sapma olabilir ama ŞART değil (denge değişince kaybolabilir; o zaman test kırmızı olmasın).
 * Şu an boş. Düzelenler (2026-11-23, yalnız önizleme; ayrıntılı testler tests/preview-tree-cast.test.ts):
 * (A) Wail of the Dead'in ödenen cana bağlı bonusu (Bloody Breath 2.f1 / Blood Banshee 2.ma) önizlemede ödenecek canla sayılır.
 * (C) Whirlwind kullanım ortası şifa (can çalma / Spin Recovery 2.f2): en az hasar, önceki vuruşların en çok şifasıyla yükselmiş canla (Berserker düşer).
 * (D) Saltire Cut: Bloody Saltire (2.r) kritikte şansla Wound; sonraki merkez vuruşunun kritik üst sınırı (critMax) Opportunist'i sayar.
 */
const KNOWN_SOFT: Record<string, string> = {};

interface Outcome {
  checked: Set<string>;
  /** Karşılaştırma sayısı (tür başına). */
  counts: { damage: number; heal: number; shield: number; crash: number };
  devs: Map<string, string>;
}
const newOutcome = (): Outcome => ({ checked: new Set(), counts: { damage: 0, heal: 0, shield: 0, crash: 0 }, devs: new Map() });

/**
 * Tek kullanımı önizler, uygular ve karşılaştırır (önizleme kullanımdan ÖNCE, aynı durumda). `tag` = sapma anahtarının başı ("sınıf|kurulum").
 * Dönüş: false = kullanılamadı (sapma olarak yazıldı).
 */
function compare(out: Outcome, b: Battle, actor: Combatant, sid: string, tgt: string, crit: 'never' | 'always', seed: number, tag: string, owner: string): boolean {
  const sk = b.skill(sid, actor)!;
  // Rastgele hedefli skill'in önizlemesi bilerek yok (preview.ts); hedef başına aralık previewForTargets'tan, vuruş başına karşılaştırılır
  const random = sk.target === 'random_enemies';
  const pv = random ? previewForTargets(b, actor, sid, b.validTargets(actor.uid, sid)) : previewSkill(b, actor.uid, sid, tgt);
  const from = b.log.length;
  const r = b.useSkill(actor.uid, sid, tgt);
  const key = (kind: string) => `${tag}|${sid}|${kind}${crit === 'always' ? '+crit' : ''}`;
  if (!r.ok) {
    out.devs.set(key('use'), `kullanılamadı: ${JSON.stringify(r)}`);
    return false;
  }
  // Yalnız bu kullanım: tetikle gelen bedava kullanım (ör. Vesper Pealing Bells -> Toll) yeni skillUsed olayıyla başlar, ondan sonrası sayılmaz
  const all = b.log.slice(from);
  const next = all.findIndex((e, i) => i > 0 && e.type === 'skillUsed');
  const evs = next < 0 ? all : all.slice(0, next);
  // İtme çarpması (crash olayı): sonraki hasar olayları çarpma hasarıdır, önizlemede `push.damage` / `push.withDamage` (ayrı karşılaştırılır)
  const crashAt = evs.findIndex((e) => e.type === 'crash');
  const hitEvs = crashAt < 0 ? evs : evs.slice(0, crashAt);
  const crashEvs = crashAt < 0 ? [] : evs.slice(crashAt);
  for (const p of pv) {
    if (p.damage) {
      out.checked.add(`${owner}|${sid}`);
      // Kesin kritik (Backstab): debug 'never' kesin kritiği de kapatır (debug aracı), önizleme kritik aralığını gösterir: yalnız 'always' turunda
      if (crit === 'never' && p.damage.critChance >= 1) continue;
      // Kritik olamayan vuruş (Wild Thorns noCrit): debug 'always' bunu da kritik yapar (debug aracı), oyunda olmaz
      if (crit === 'always' && p.damage.critChance <= 0) continue;
      const hits = hitEvs.filter((e): e is Dmg => ownHit(e, actor.uid, p.uid));
      const hi = crit === 'always' ? p.damage.critMax : p.damage.max;
      out.counts.damage++;
      const parts = random ? hits.map((e) => e.amount + e.absorbed) : [hits.reduce((s, e) => s + e.amount + e.absorbed, 0)];
      for (const got of parts)
        if (got < p.damage.min || got > hi) out.devs.set(key('damage'), `seed ${seed} hedef ${p.uid}: gerçek ${got}, önizleme [${p.damage.min}, ${hi}]`);
    }
    if (p.push?.kind === 'crash' && crit === 'never') {
      out.counts.crash++;
      const sumOn = (uid: string) => crashEvs.filter((e): e is Dmg => ownHit(e, actor.uid, uid)).reduce((s, e) => s + e.amount + e.absorbed, 0);
      if (sumOn(p.uid) !== (p.push.damage ?? 0)) out.devs.set(key('crash'), `seed ${seed} hedef ${p.uid}: çarpma ${sumOn(p.uid)}, önizleme ${p.push.damage ?? 0}`);
      if (p.push.with && sumOn(p.push.with) !== (p.push.withDamage ?? 0)) out.devs.set(key('crash'), `seed ${seed} çarpılan ${p.push.with}: ${sumOn(p.push.with)}, önizleme ${p.push.withDamage ?? 0}`);
    }
    if (p.heal && crit === 'never') {
      out.checked.add(`${owner}|${sid}`);
      // Şifa kritiği debug.crit'e bağlı değil (debug aracı): kritik şifa olayı varsa üst sınır critMax. `cause`lu şifa (zemin, tetik) ayrı önizlenir
      const heals = evs.filter((e): e is Extract<BattleEvent, { type: 'heal' }> => e.type === 'heal' && e.source === actor.uid && e.target === p.uid && !e.cause);
      out.counts.heal++;
      const got = heals.reduce((s, e) => s + e.amount, 0);
      const hi = heals.some((e) => e.crit) ? p.heal.critMax : p.heal.max;
      if (got < p.heal.min || got > hi) out.devs.set(key('heal'), `seed ${seed} hedef ${p.uid}: gerçek ${got}, önizleme [${p.heal.min}, ${hi}]`);
    }
    if (p.shield && crit === 'never') {
      out.checked.add(`${owner}|${sid}`);
      out.counts.shield++;
      const got = evs.filter((e) => e.type === 'shield' && e.source === actor.uid && e.target === p.uid).reduce((s, e) => s + (e as { amount: number }).amount, 0);
      if (got !== p.shield.amount) out.devs.set(key('shield'), `seed ${seed} hedef ${p.uid}: gerçek ${got}, önizleme ${p.shield.amount}`);
    }
  }
  // Ters yön: skill vuruşunun değdiği ama önizlemenin hiç göstermediği hedef (denetim 3.2 türü: önizlemede görünmeyen yan vuruş)
  const shown = new Set(pv.filter((p) => p.damage).map((p) => p.uid));
  const unlisted = [...new Set(hitEvs.filter((e): e is Dmg => e.type === 'damage' && ownHit(e, actor.uid, e.target)).map((e) => e.target))].filter((u) => !shown.has(u));
  if (unlisted.length) out.devs.set(key('unlisted'), `seed ${seed}: önizlemede yok ama vuruldu: ${unlisted.join(', ')}`);
  return true;
}

function sweep(): Outcome {
  const out = newOutcome();
  for (const cls of CLASSES)
    for (const build of BUILDS)
      for (const crit of ['never', 'always'] as const)
        for (const seed of SEEDS) {
          const probe = arena(cls, build, seed, crit);
          for (const sid of probe.actor.skills) {
            const sk = probe.b.skill(sid, probe.actor);
            if (!sk || !hasNumber(sk)) continue;
            const pick = probe.b.validTargets(probe.actor.uid, sid);
            if (!pick.length) {
              out.devs.set(`${cls}|${build.name}|${sid}|target`, 'geçerli hedef yok');
              continue;
            }
            const { b, actor } = arena(cls, build, seed, crit);
            compare(out, b, actor, sid, sk.target === 'self' ? actor.uid : pick[0]!.uid, crit, seed, `${cls}|${build.name}`, cls);
          }
        }
  return out;
}

/* ------------------------------------------------- mob / boss / çağrı skill'leri (denetim 9.1 "mob dahil") ------------------------------------------------- */

const NPCS = [...Object.keys(content.bosses), ...Object.keys(content.mobs), ...Object.keys(content.summons)];
const npcDef = (id: string): CombatantDef => (content.bosses[id] ?? content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;

/** Mob düşman tarafında ön sırada (yuva 1), yanında Warrior; karşıda dört sınıf (canları büyük). Mob ve dostu kendi canlarının %60'ında. */
function npcArena(id: string, seed: number, crit: 'never' | 'always'): { b: Battle; actor: Combatant } {
  const base = content.battleSetup('random-battle', seed, 'turns', { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: ['warrior', 'archer', 'mage', 'paladin'].map(npcDef), partySlots: [1, 0, 4, 3], enemies: [npcDef(id), npcDef('warrior')], enemySlots: [1, 4] });
  b.debug.crit = crit;
  b.debug.dodge = 'never';
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    Object.assign(c.stats, { surviveChance: 0 });
    if (c.side === 'party') c.maxHp = c.hp = BIG;
    else c.hp = Math.max(1, Math.floor(c.maxHp * 0.6));
    c.mp = c.maxMp;
    if (c.maxRage !== undefined) c.rage = c.maxRage;
  }
  const actor = b.combatants.find((c) => c.side === 'enemy' && c.defId === id)!;
  b.currentUid = actor.uid;
  return { b, actor };
}

/**
 * Telgraflı skill (gecikmeli saldırı: Breaking Span, Undermine, Slag Charge...) bu kullanımda vurmaz, sahibinin sonraki turunda çözülür: önizlemesi
 * çözülecek vuruşu gösterir, anlık karşılaştırma yapılamaz (sayılıp atlanır). Ön koşulu tutmayan skill (faz, bağlı yardımcı, yanan hücre) atlanır.
 */
function npcSweep(): Outcome & { telegraph: number; blocked: number } {
  const out = { ...newOutcome(), telegraph: 0, blocked: 0 };
  for (const id of NPCS)
    for (const crit of ['never', 'always'] as const)
      for (const seed of [1, 2]) {
        const probe = npcArena(id, seed, crit);
        for (const sid of probe.actor.skills) {
          const sk = probe.b.skill(sid, probe.actor);
          if (!sk || !hasNumber(sk)) continue;
          if (sk.telegraph) {
            out.telegraph++;
            continue;
          }
          if (!probe.b.canUse(probe.actor.uid, sid).ok) {
            out.blocked++;
            continue;
          }
          const pick = probe.b.validTargets(probe.actor.uid, sid);
          if (!pick.length) {
            out.devs.set(`${id}|${sid}|target`, 'geçerli hedef yok');
            continue;
          }
          const { b, actor } = npcArena(id, seed, crit);
          compare(out, b, actor, sid, sk.target === 'self' ? actor.uid : pick[0]!.uid, crit, seed, id, id);
        }
      }
  return out;
}

describe('önizleme taraması: her sınıfın her skill\'i (ağaçsız + evolve), turns modu, menzil açık', () => {
  let out: Outcome;
  beforeAll(() => {
    out = sweep();
  }, 60000); // tek başına ~2,5 sn; yük altında varsayılan 10 sn kanca sınırını aşmasın

  it('evolve kurulumları gerçekten iki evolve taşıyor (test boşa dönmesin)', () => {
    for (const cls of CLASSES)
      for (const build of BUILDS.filter((x) => x.rows)) {
        const r = focusBuild(treeOf(cls)!, build.rows!, 50, build.dir ? { dir: build.dir } : {}).r;
        expect([r[`${build.rows![0]}.v`], r[`${build.rows![1]}.v`]], `${cls} ${build.name}`).toEqual([1, 1]);
      }
  });

  it('veride hasar / şifa / kalkanı olan her sınıf skill\'i en az bir kez denetlendi (boş geçme yok)', () => {
    const want = CLASSES.flatMap((cls) => content.classes[cls]!.skills.filter((id) => content.skills[id] && hasNumber(content.skills[id]!)).map((id) => `${cls}|${id}`));
    expect(CLASSES.length).toBeGreaterThanOrEqual(13);
    expect(want.filter((k) => !out.checked.has(k))).toEqual([]);
    // her tür gerçekten karşılaştırıldı (hasar: sınıf x kurulum x kritik x seed; şifa / kalkan: şifacı ve kalkancı skill'ler)
    expect(out.counts.damage).toBeGreaterThan(500);
    expect(out.counts.heal).toBeGreaterThan(20);
    expect(out.counts.shield).toBeGreaterThan(5);
  });

  it('gerçek sonuç önizlemeyle tutarlı (bilinen açıklar dışında)', () => {
    if (COLLECT) for (const [k, v] of out.devs) console.log(`SAPMA ${k} :: ${v}`);
    const fresh = [...out.devs.entries()].filter(([k]) => !KNOWN[k] && !KNOWN_SOFT[k]).map(([k, v]) => `${k} :: ${v}`);
    expect(fresh).toEqual([]);
  });

  it('bilinen açıklar listesi güncel (düzelen madde listeden çıkarılmalı)', () => {
    expect(Object.keys(KNOWN).filter((k) => !out.devs.has(k))).toEqual([]);
  });
});

/** Mob / boss / çağrı bilinen açıkları: "mob|skill|tür" -> neden (sınıf listesiyle aynı kural). */
const KNOWN_NPC: Record<string, string> = {};

describe('önizleme taraması: mob / boss / çağrı skill\'leri, turns modu, menzil açık', () => {
  let out: ReturnType<typeof npcSweep>;
  beforeAll(() => {
    out = npcSweep();
  }, 60000);

  it('yeterince skill gerçekten karşılaştırıldı (boş geçme yok); telgraflı / ön koşullu atlananlar sayılı', () => {
    expect(out.counts.damage).toBeGreaterThan(800);
    expect(out.counts.crash).toBeGreaterThan(0);
    expect(out.telegraph).toBeGreaterThan(0);
    // her mob / boss / çağrının hasar / şifa / kalkan skill'lerinin en az yarısı denetlendi (telgraf ve faz dışı kalan az)
    const want = NPCS.flatMap((id) => npcDef(id).skills.filter((s) => content.skills[s] && hasNumber(content.skills[s]!) && !content.skills[s]!.telegraph).map((s) => `${id}|${s}`));
    expect(want.filter((k) => out.checked.has(k)).length).toBeGreaterThan(want.length * 0.9);
  });

  it('gerçek sonuç önizlemeyle tutarlı (bilinen açıklar dışında)', () => {
    if (COLLECT) for (const [k, v] of out.devs) console.log(`SAPMA ${k} :: ${v}`);
    expect([...out.devs.entries()].filter(([k]) => !KNOWN_NPC[k]).map(([k, v]) => `${k} :: ${v}`)).toEqual([]);
    expect(Object.keys(KNOWN_NPC).filter((k) => !out.devs.has(k))).toEqual([]);
  });
});
