import { afterEach, describe, expect, it } from 'vitest';
import * as content from '../src/engine/content';
import { Battle } from '../src/engine/battle';
import { chooseAction, type AiTrace } from '../src/engine/ai';

// Mob mana zammı (Ömer 2026-10-31): ai.scoreCost yalnızca YZ skorundaki MP bedelini sınırlar. Mob bol manada eski kararını verir; ödeme ve mana
// yeterliliği gerçek (yeni) bedelle kalır.

const PARTY = ['', 'defender', '', 'paladin', '', 'mage', '', '', '', '', '', ''];

function setup(): Battle {
  const enemies = ['', '', '', '', 'bandit_crossbowman', '', '', '', '', '', '', ''];
  const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, 5, 'turns', { party: PARTY, enemies }, false));
  // Taunt + yaralı Mage: alan atışı Mage'in sırasına değer (taunt-pull.test.ts ile aynı sahne; tauntPull kapalıyken skor alan atışını seçer)
  const def = b.get('party-0')!;
  def.statuses.push({ kind: 'taunt', turns: 3, source: def.uid, taken: 0 });
  b.get('party-2')!.hp = 20;
  return b;
}

function decide(b: Battle) {
  const trace: AiTrace = { options: [], reserves: [], steps: [] };
  const choice = chooseAction(b, 'enemy-0', content.aiConfig, trace, { value: { tauntPull: 0, manaSurplusFrom: 1 } }); // dolu mana eğilimi kapalı: burada yalnız bedel ölçülür
  return { choice, options: trace.options };
}

const skill = content.skills.scatter_quarrels!;
const savedAi = skill.ai;
const savedCost = skill.cost;

afterEach(() => {
  skill.ai = savedAi;
  skill.cost = savedCost;
});

describe('ai.scoreCost', () => {
  it('veride bedel zamlı, scoreCost eski miktar', () => {
    expect(skill.cost.amount).toBe(9);
    expect(skill.ai?.scoreCost).toBe(6);
  });

  it('skordaki bedel scoreCost kadardır; alanı olmayan skill gerçek bedeliyle sayılır', () => {
    const b = setup();
    const w = content.aiConfig.profiles[b.get('enemy-0')!.ai ?? content.aiConfig.defaultProfile]!.mpCostWeight;
    const { options } = decide(b);
    const scatter = options.find((o) => o.skill.id === 'scatter_quarrels')!;
    expect(scatter.cost).toBeCloseTo(6 * w, 6);
    const bolt = options.find((o) => o.skill.id === 'crossbow_bolt')!;
    expect(bolt.skill.ai?.scoreCost).toBeUndefined();
    expect(bolt.cost).toBeCloseTo(bolt.skill.cost.amount * w, 6);
  });

  it('seçimi korur: scoreCost varken alan atışı, kaldırılınca zamlı bedel kararı değiştirir', () => {
    expect(decide(setup()).choice?.skillId).toBe('scatter_quarrels');
    const { scoreCost: _drop, ...rest } = savedAi!;
    skill.ai = rest;
    expect(decide(setup()).choice?.skillId).toBe('crossbow_bolt');
  });

  it('gerçek ödeme yeni bedelden düşer', () => {
    const b = setup();
    const actor = b.get('enemy-0')!;
    const before = actor.mp;
    const { choice } = decide(b);
    expect(choice?.skillId).toBe('scatter_quarrels');
    expect(b.applyChoice('enemy-0', choice).ok).toBe(true);
    expect(actor.mp).toBe(before - 9);
  });

  it('mana yeterliliği gerçek bedele bakar: eski bedele yeten ama yenisine yetmeyen MP ile skill seçenek olmaz', () => {
    const b = setup();
    b.get('enemy-0')!.mp = 8; // scoreCost 6 yeter, gerçek bedel 9 yetmez
    const { choice, options } = decide(b);
    expect(options.some((o) => o.skill.id === 'scatter_quarrels')).toBe(false);
    expect(choice?.skillId).not.toBe('scatter_quarrels');
  });

  it('gerçek bedel scoreCost\'tan küçükse küçük olan sayılır', () => {
    skill.cost = { ...savedCost, amount: 2 };
    const b = setup();
    const w = content.aiConfig.profiles[b.get('enemy-0')!.ai ?? content.aiConfig.defaultProfile]!.mpCostWeight;
    expect(decide(b).options.find((o) => o.skill.id === 'scatter_quarrels')!.cost).toBeCloseTo(2 * w, 6);
  });
});
