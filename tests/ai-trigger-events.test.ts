/**
 * (e) 2026-11-23 (güvenlik ağı, Ömer onayı n_ai): YZ'nin eskiden tartmadığı ağaç tetik olayları artık değerlendirilir. Her olay için DAVRANIŞ testi:
 * olayı dinleyen bir kanca (sahibine şifa; sahip yaralı) eklenince adayın 'tree' (bizim taraf) ya da 'retaliation' (karşı taraf) terimi değişir,
 * yönü de doğru (bizim kancamız artı, düşmanınki eksi). Kaynakta adın geçmesi yetmez (ai-value-registry yalnız adı denetler).
 * Değer gerekmeyenler (seçimden bağımsız) ai-value-registry.test.ts > KNOWN_TRIGGER'da gerekçesiyle.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice, type AiConfig, type Combatant, type CombatantDef } from '../src/engine';
import { aiCoverageInternals as AC, unitLabel } from '../src/engine/ai';
import { DEFAULT_VALUE, ValueContext } from '../src/engine/ai-value';
import type { TriggerHook } from '../src/engine/tree-hooks';

const ai: AiConfig = { ...content.aiConfig, global: undefined };
const unitDef = (id: string): CombatantDef => (content.bosses[id] ?? content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;

/** Genel sahne (turns): herkes %55 canda, MP / Rage / kan dolu. */
function arena(party: [string, number][], enemies: [string, number][]): Battle {
  const base = content.battleSetup('random-battle', 5, 'turns', { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    c.hp = Math.max(1, Math.floor(c.maxHp * 0.55));
    c.mp = c.maxMp;
    if (c.maxRage !== undefined) c.rage = c.maxRage;
    if (c.maxBlood !== undefined) c.blood = c.maxBlood;
  }
  return b;
}
const unit = (b: Battle, side: 'party' | 'enemy', defId: string): Combatant => b.combatants.find((c) => c.side === side && c.defId === defId)!;

/** Sahibine (yaralı) şifa veren deneme kancası. */
function hook(c: Combatant, on: string, extra: Partial<TriggerHook> = {}): void {
  c.treeHooks = [...(c.treeHooks ?? []), { h: 'trigger', node: `test:${on}`, on, do: [{ heal: 0.2 }], ...extra } as TriggerHook];
}

/** Adayın (skill + hedef / vurulan) terimleri. */
function terms(b: Battle, actor: Combatant, skill: string, target?: Combatant): Record<string, number> {
  b.currentUid = actor.uid;
  const ex = explainChoice(b, actor.uid, ai)!;
  const c = ex.candidates.find((x) => x.skill === skill && (!target || x.target === unitLabel(target) || x.hits.includes(unitLabel(target))));
  expect(c, `${skill} adayı yok: ${ex.rejected.map((r) => `${r.skill}: ${r.reason}`).join('; ')}`).toBeDefined();
  return c!.terms ?? {};
}

/** Kanca eklenince terimin farkı (sonra - önce). */
function delta(make: () => { b: Battle; actor: Combatant; skill: string; target?: Combatant; owner: (b: Battle) => Combatant; extra?: Partial<TriggerHook> }, on: string, term: 'tree' | 'retaliation'): number {
  const s0 = make();
  const before = terms(s0.b, s0.actor, s0.skill, s0.target)[term] ?? 0;
  const s1 = make();
  hook(s1.owner(s1.b), on, s1.extra);
  const after = terms(s1.b, s1.actor, s1.skill, s1.target)[term] ?? 0;
  return after - before;
}

const FRONT: [string, number][] = [['warrior', 1], ['archer', 4], ['mage', 7]];

describe('YZ: eskiden tartılmayan ağaç tetik olayları (davranış)', () => {
  it('allyHit: kullanıcının vurduğu düşman, dostun kancası artı', () => {
    const d = delta(() => {
      const b = arena([['warrior', 1], ['archer', 4]], FRONT);
      return { b, actor: unit(b, 'party', 'warrior'), skill: 'melee_attack', target: unit(b, 'enemy', 'warrior'), owner: (x) => unit(x, 'party', 'archer') };
    }, 'allyHit', 'tree');
    expect(d).toBeGreaterThan(0);
  });

  it('hpBelow: vuruş düşmanı eşiğin altına indirirse düşmanın kancası eksi', () => {
    const d = delta(() => {
      const b = arena([['warrior', 1], ['archer', 4]], FRONT);
      const t = unit(b, 'enemy', 'warrior');
      t.hp = Math.floor(t.maxHp * 0.51);
      return { b, actor: unit(b, 'party', 'warrior'), skill: 'melee_attack', target: t, owner: (x) => unit(x, 'enemy', 'warrior'), extra: { below: 0.5 } };
    }, 'hpBelow', 'retaliation');
    expect(d).toBeLessThan(0);
  });

  it('luckyEscape: öldürücü vuruşu atlatma ihtimali, düşmanın kancası eksi', () => {
    const d = delta(() => {
      const b = arena([['warrior', 1], ['archer', 4]], FRONT);
      const t = unit(b, 'enemy', 'warrior');
      t.hp = 1;
      t.stats.surviveChance = 0.5;
      return { b, actor: unit(b, 'party', 'warrior'), skill: 'melee_attack', target: t, owner: (x) => unit(x, 'enemy', 'warrior') };
    }, 'luckyEscape', 'retaliation');
    expect(d).toBeLessThan(0);
  });

  it('enemyDied: öldürme ihtimali, bizim taraftaki kanca artı', () => {
    const d = delta(() => {
      const b = arena([['warrior', 1], ['archer', 4]], FRONT);
      const t = unit(b, 'enemy', 'warrior');
      t.hp = 1;
      return { b, actor: unit(b, 'party', 'warrior'), skill: 'melee_attack', target: t, owner: (x) => unit(x, 'party', 'archer') };
    }, 'enemyDied', 'tree');
    expect(d).toBeGreaterThan(0);
  });

  it('summonDeath: düşman çağrısını öldürme, çağrı sahibinin kancası eksi', () => {
    const d = delta(() => {
      const b = arena([['warrior', 1], ['archer', 4]], FRONT);
      const t = unit(b, 'enemy', 'warrior');
      t.hp = 1;
      t.summoned = true;
      t.owner = unit(b, 'enemy', 'mage').uid;
      return { b, actor: unit(b, 'party', 'warrior'), skill: 'melee_attack', target: t, owner: (x) => unit(x, 'enemy', 'mage') };
    }, 'summonDeath', 'retaliation');
    expect(d).toBeLessThan(0);
  });

  it('enemyHealed: dosta şifa, düşmanın kancası eksi', () => {
    const d = delta(() => {
      const b = arena([['paladin', 1], ['archer', 4]], FRONT);
      return { b, actor: unit(b, 'party', 'paladin'), skill: 'radiance', owner: (x) => unit(x, 'enemy', 'mage') };
    }, 'enemyHealed', 'retaliation');
    expect(d).toBeLessThan(0);
  });

  it('statusGained: düşmana durum (Jinx), durumu alanın kancası eksi', () => {
    const d = delta(() => {
      const b = arena([['hexer', 4], ['warrior', 1]], FRONT);
      const t = unit(b, 'enemy', 'warrior');
      return { b, actor: unit(b, 'party', 'hexer'), skill: 'jinx', target: t, owner: (x) => unit(x, 'enemy', 'warrior') };
    }, 'statusGained', 'retaliation');
    expect(d).toBeLessThan(0);
  });

  it('payHp: can bedeli (Wail of the Dead), kullanıcının kancası artı', () => {
    const d = delta(() => {
      const b = arena([['undead', 1], ['archer', 4]], FRONT);
      return { b, actor: unit(b, 'party', 'undead'), skill: 'wail_of_the_dead', owner: (x) => unit(x, 'party', 'undead') };
    }, 'payHp', 'tree');
    expect(d).toBeGreaterThan(0);
  });

  it('mpBelow: MP bedeli eşiği geçirirse kullanıcının kancası artı', () => {
    const d = delta(() => {
      const b = arena([['mage', 4], ['warrior', 1]], FRONT);
      return { b, actor: unit(b, 'party', 'mage'), skill: 'fire_bolt', target: unit(b, 'enemy', 'warrior'), owner: (x) => unit(x, 'party', 'mage'), extra: { below: 0.999 } };
    }, 'mpBelow', 'tree');
    expect(d).toBeGreaterThan(0);
  });

  it('repeat / repeatFail: tekrar vuruşu şansı, kullanıcının kancası artı', () => {
    for (const on of ['repeat', 'repeatFail']) {
      const d = delta(() => {
        const b = arena([['pose_tester_10', 1], ['warrior', 4]], FRONT);
        return { b, actor: unit(b, 'party', 'pose_tester_10'), skill: 'pt_loaded_dice', target: unit(b, 'enemy', 'warrior'), owner: (x) => unit(x, 'party', 'pose_tester_10') };
      }, on, 'tree');
      expect(d, on).toBeGreaterThan(0);
    }
  });

  it('jackpot / bust: bahis kazanma / kaybetme, kullanıcının kancası artı', () => {
    for (const on of ['jackpot', 'bust']) {
      const d = delta(() => {
        const b = arena([['gambler', 4], ['warrior', 1]], FRONT);
        return { b, actor: unit(b, 'party', 'gambler'), skill: 'high_stakes', target: unit(b, 'enemy', 'warrior'), owner: (x) => unit(x, 'party', 'gambler') };
      }, on, 'tree');
      expect(d, on).toBeGreaterThan(0);
    }
  });

  it('doom: yığını dolduran Evil Eye Doom işletir, kullanıcının kancası artı', () => {
    const d = delta(() => {
      const b = arena([['hexer', 4], ['warrior', 1]], FRONT);
      const actor = unit(b, 'party', 'hexer');
      const t = unit(b, 'enemy', 'warrior');
      const max = b.statusDef('omen')!.maxStacks!;
      t.statuses.push({ kind: 'omen', turns: 3, source: actor.uid, stacks: max - 1 } as Combatant['statuses'][number]);
      return { b, actor, skill: 'evil_eye', target: t, owner: (x) => unit(x, 'party', 'hexer') };
    }, 'doom', 'tree');
    expect(d).toBeGreaterThan(0);
  });

  it('revived: diriltme, kullanıcının kancası artı', () => {
    const d = delta(() => {
      const b = arena([['paladin', 4], ['warrior', 1], ['archer', 3]], FRONT);
      const dead = unit(b, 'party', 'warrior');
      dead.hp = 0;
      return { b, actor: unit(b, 'party', 'paladin'), skill: 'resurrection', owner: (x) => unit(x, 'party', 'paladin') };
    }, 'revived', 'tree');
    expect(d).toBeGreaterThan(0);
  });

  it('hpBelow / mpBelow: zaten ateşlenmiş kanca (motorda bir kez) değer almaz', () => {
    const hp = delta(() => {
      const b = arena([['warrior', 1], ['archer', 4]], FRONT);
      const t = unit(b, 'enemy', 'warrior');
      t.hp = Math.floor(t.maxHp * 0.51);
      // motorun "bu birim için ateşlendi" kaydı (fireTrig ile aynı anahtar)
      (b as unknown as { firedOnSet: Set<string> }).firedOnSet.add(`${t.uid}|test:hpBelow|@${t.uid}`);
      return { b, actor: unit(b, 'party', 'warrior'), skill: 'melee_attack', target: t, owner: (x) => unit(x, 'enemy', 'warrior'), extra: { below: 0.5 } };
    }, 'hpBelow', 'retaliation');
    expect(hp).toBe(0);
    const mp = delta(() => {
      const b = arena([['mage', 4], ['warrior', 1]], FRONT);
      const actor = unit(b, 'party', 'mage');
      actor.treeOnce = ['test:mpBelow'];
      return { b, actor, skill: 'fire_bolt', target: unit(b, 'enemy', 'warrior'), owner: (x) => unit(x, 'party', 'mage'), extra: { below: 0.999 } };
    }, 'mpBelow', 'tree');
    expect(mp).toBe(0);
  });

  it('payHp: kanca ödenen canı taban alır (of hpPaid, motorla aynı), değer bedelle büyür', () => {
    const at = (frac: number) =>
      delta(() => {
        const b = arena([['undead', 1], ['archer', 4]], FRONT);
        const actor = unit(b, 'party', 'undead');
        actor.hp = Math.floor(actor.maxHp * frac);
        return { b, actor, skill: 'wail_of_the_dead', owner: (x) => unit(x, 'party', 'undead'), extra: { do: [{ heal: 0.5, of: 'hpPaid' }] } as Partial<TriggerHook> };
      }, 'payHp', 'tree');
    expect(at(0.5)).toBeGreaterThan(0);
    expect(at(0.3)).toBeLessThan(at(0.6)); // bedel mevcut canın oranı: çok can = çok bedel = çok şifa (eksik can tavanı ikisinde de uzak)
  });

  it('enemyMoved: Move planında karşı tarafın kancası eksi', () => {
    const b = arena([['warrior', 1], ['archer', 4]], FRONT);
    const actor = unit(b, 'party', 'archer');
    const ctx = new ValueContext(b, actor, { ...DEFAULT_VALUE, ...(content.aiConfig.value ?? {}) }, () => 'lowest_ratio');
    expect(AC.enemyMovedValue(ctx, actor)).toBe(0);
    hook(unit(b, 'enemy', 'archer'), 'enemyMoved');
    expect(AC.enemyMovedValue(ctx, actor)).toBeLessThan(0);
  });
});
