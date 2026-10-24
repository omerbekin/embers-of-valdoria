import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, explainChoice, previewSkill, unitLabel } from '../src/engine';
import type { AiConfig, BattleEvent, Combatant } from '../src/engine';

/**
 * Close Ranks (Ömer 2026-10-20, Defender'da Guard'ın yerine): seçilen dost + onun sırasındaki dostlar (Defender hariç) 3 tur Guard alır,
 * aldıkları hasarın %50'i Defender'a geçer (Guard makinesi: aktarılan pay Defender zırhıyla yeniden azalmaz; Defender ölünce durur).
 */

const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
const grid = (party: string[], enemies: string[], seed = 1) => {
  const b = new Battle(content.battleSetup('random-battle', seed, 'test', { party, enemies }, false));
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0 });
  return b;
};
const at = (b: Battle, side: 'party' | 'enemy', slot: number): Combatant => b.combatants.find((c) => c.side === side && c.slot === slot)!;
const act = (b: Battle, actor: string, skill: string, target?: string): BattleEvent[] => {
  const r = b.useSkill(actor, skill, target);
  if (!r.ok) throw new Error(`${actor} ${skill}: ${r.reason}`);
  return r.events;
};
const guardOf = (c: Combatant) => c.statuses.find((s) => s.kind === 'guard');
const share = () => (content.skills.close_ranks!.effects.find((e) => e.type === 'guard') as { share: number; turns: number });

// Dost dizilimi (yuva = sıra*3 + şerit): ön sıra (0) 0 Defender, 1 Warrior (seçilen), 2 Archer; 2. sıra (1) 4 Mage, 5 Paladin; 3. sıra 7 Druid
const PARTY = cells({ 0: 'defender', 1: 'warrior', 2: 'archer', 4: 'mage', 5: 'paladin', 7: 'druid' });
const ENEMY = cells({ 0: 'warrior', 1: 'warrior', 2: 'warrior' });

describe('Close Ranks', () => {
  it('veri: Defender Guard yerine Close Ranks taşır; %50, 3 tur, sıra (row); menzil 2, 10 MP, cooldown 5', () => {
    expect(content.classes.defender!.skills.slice(0, 4)).toEqual(['tremor_slam', 'taunt', 'close_ranks', 'fist_crush']);
    const cr = content.skills.close_ranks!;
    expect(cr).toMatchObject({ name: 'Close Ranks', target: 'single_ally', excludeSelf: true, splash: { pattern: 'row' } });
    expect(share()).toMatchObject({ share: 0.5, turns: 3 });
    // eski Guard'ın menzil ve yarım turn'ü (tests/legacy-skills.ts > guard); Ömer 2026-10-20: cooldown 4 -> 5, bedel 2 -> 10 MP
    // bedel değeri veriden (balance-tester 2026-10-24 mana turu: 10 -> 12)
    expect([cr.range, cr.cost.resource, cr.cooldown, cr.turnCost]).toEqual([2, 'mp', 5, 0.5]);
    expect(cr.cost.amount).toBeGreaterThan(0);
    expect(content.skills.guard).toBeUndefined(); // oyundan kalktı (Thane of the Deep'in shield_wall kopyası kendi verisiyle sürer)
    expect(describeSkill(cr, at(grid(PARTY, ENEMY), 'party', 0).stats, content.formulas).lines.join(' ')).toMatch(/allies in the chosen row pass 50%/);
  });

  it('alan: seçilen dostun sırasındaki dostlar (başka sıra hariç, Defender hariç) Guard alır', () => {
    const b = grid(PARTY, ENEMY);
    const def = at(b, 'party', 0);
    const events = act(b, def.uid, 'close_ranks', at(b, 'party', 1).uid);
    const guarded = b.combatants.filter((c) => c.side === 'party' && guardOf(c)).map((c) => c.slot).sort((x, y) => x - y);
    expect(guarded).toEqual([1, 2]);
    expect(guardOf(def)).toBeUndefined(); // Defender (aynı sırada) kendini korumaz
    for (const s of [1, 2]) expect(guardOf(at(b, 'party', s))).toMatchObject({ source: def.uid, share: 0.5, turns: 3 });
    expect(events.filter((e) => e.type === 'status' && e.status === 'guard')).toHaveLength(2);
    // önizleme ve UI aynı grubu görür
    expect(previewSkill(b, def.uid, 'close_ranks', at(b, 'party', 1).uid).map((p) => p.uid).sort()).toEqual([1, 2].map((s) => at(b, 'party', s).uid).sort());
    // 2. sıra: Mage seçilince Mage + Paladin
    const b2 = grid(PARTY, ENEMY);
    act(b2, at(b2, 'party', 0).uid, 'close_ranks', at(b2, 'party', 4).uid);
    expect(b2.combatants.filter((c) => c.side === 'party' && guardOf(c)).map((c) => c.slot).sort((x, y) => x - y)).toEqual([4, 5]);
  });

  it('%50 aktarım: toplam hasar aynı, Defender payı ~%50 ve zırhıyla yeniden azalmaz', () => {
    for (const seed of [1, 2, 3]) {
      const plain = grid(PARTY, ENEMY, seed);
      const guarded = grid(PARTY, ENEMY, seed);
      const def = at(guarded, 'party', 0);
      act(guarded, def.uid, 'close_ranks', at(guarded, 'party', 1).uid);
      // komşu Archer'a (yuva 2) vuruş
      const hit = (b: Battle) => act(b, at(b, 'enemy', 0).uid, 'melee_attack', at(b, 'party', 2).uid);
      const sum = (ev: BattleEvent[], uid: string) => ev.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.target === uid).reduce((s, e) => s + e.amount + e.absorbed, 0);
      const base = sum(hit(plain), at(plain, 'party', 2).uid);
      const ev = hit(guarded);
      const onArcher = sum(ev, at(guarded, 'party', 2).uid);
      const onDef = sum(ev, def.uid);
      expect(onArcher + onDef).toBe(base);
      const hits = ev.filter((e) => e.type === 'damage' && e.target === def.uid).length;
      expect(onDef).toBeGreaterThanOrEqual(Math.round(base * 0.5) - hits);
      expect(onDef).toBeLessThanOrEqual(Math.round(base * 0.5) + hits);
      expect(ev.filter((e) => e.type === 'damage' && e.target === def.uid).every((e) => e.type === 'damage' && e.redirected)).toBe(true);
    }
  });

  it('süre: her korunan dostun kendi 3 turu (eski Guard sayımı); sonra Guard düşer', () => {
    const b = new Battle(content.battleSetup('random-battle', 1, 'turns', { party: PARTY, enemies: ENEMY }, false));
    const def = at(b, 'party', 0);
    for (let i = 0; i < 300 && b.currentUid !== def.uid; i++) b.skipTurn();
    const archer = at(b, 'party', 2);
    // Guard süresi taşıyanın kendi tur başlarında azalır (Guard ile aynı kural): 1. ve 2. turunu korunarak oynar, 3. turunun başında düşer
    // (süre işlemi turnStart olayından ÖNCE: düştüğü anda görülen turnStart sayısı 2)
    let starts = 0;
    let endedAt = -1;
    const scan = (ev: BattleEvent[]) => {
      for (const e of ev) {
        if (e.type === 'turnStart' && e.actor === archer.uid) starts++;
        if (e.type === 'statusEnd' && e.target === archer.uid && e.status === 'guard' && endedAt < 0) endedAt = starts;
      }
    };
    scan(act(b, def.uid, 'close_ranks', at(b, 'party', 1).uid));
    expect(guardOf(archer)).toBeDefined();
    for (let i = 0; i < 300 && endedAt < 0; i++) {
      const r = b.skipTurn();
      if (r.ok) scan(r.events);
    }
    expect(guardOf(archer)).toBeUndefined();
    expect(endedAt).toBe(2);
  });

  it('Defender ölünce aktarım durur', () => {
    const b = grid(PARTY, ENEMY);
    const def = at(b, 'party', 0);
    act(b, def.uid, 'close_ranks', at(b, 'party', 1).uid);
    def.hp = 0;
    const ev = act(b, at(b, 'enemy', 0).uid, 'melee_attack', at(b, 'party', 2).uid);
    expect(ev.filter((e) => e.type === 'damage' && e.redirected)).toHaveLength(0);
  });

  it('yığılma: birimde tek Guard; yenisi eskisinin yerine geçer', () => {
    const b = grid(PARTY, ENEMY);
    const def = at(b, 'party', 0);
    const archer = at(b, 'party', 2);
    archer.statuses.push({ kind: 'guard', turns: 3, source: at(b, 'party', 5).uid, share: 0.6 });
    act(b, def.uid, 'close_ranks', at(b, 'party', 1).uid);
    const gs = archer.statuses.filter((s) => s.kind === 'guard');
    expect(gs).toHaveLength(1);
    expect(gs[0]).toMatchObject({ source: def.uid, share: 0.5 });
  });

  it('YZ: Close Ranks değeri sırayı toplar: kalabalık ön sırada tek dostu korumaktan büyük', () => {
    const b = grid(PARTY, cells({ 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'archer', 4: 'mage' }));
    const def = at(b, 'party', 0);
    const ai: AiConfig = { ...content.aiConfig, global: undefined };
    const protect = () => explainChoice(b, def.uid, ai)!.candidates.find((c) => c.skill === 'close_ranks' && c.target === unitLabel(at(b, 'party', 1)))?.terms?.protect ?? 0;
    const group = protect();
    const skill = content.skills.close_ranks!;
    const splash = skill.splash;
    delete skill.splash; // aynı skill tek hedefli olsaydı
    const single = protect();
    skill.splash = splash;
    expect(single).toBeGreaterThan(0);
    expect(group).toBeGreaterThan(single);
  });
});
