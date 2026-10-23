import { describe, expect, it } from 'vitest';
import * as content from '../src/engine/content';
import { Battle } from '../src/engine/battle';
import { chooseAction, type AiTrace } from '../src/engine/ai';
import type { UnitSetup } from '../src/engine/types';
import { battlePlan, debugTeleport, newCampaign } from '../src/campaign';

// Playtest 2026-10-23 D5: Taunt alan / rastgele saldırıları da çeker (ai.json value.tauntPull 0,7; tek hedefli skill zaten zorlanır)
// ve bölge I düşmanları yaralı hedefe daha az yüklenir (valdoria.json regions[I].enemyAi.pressureShare).

const PARTY = ['', 'defender', '', 'paladin', '', 'mage', '', '', '', '', '', ''];

function setup(mob: string, opts: { taunt?: boolean; mode?: 'turns' | 'test'; unit?: UnitSetup; mageHp?: number } = {}): Battle {
  const enemies = ['', '', '', '', mob, '', '', '', '', '', '', ''];
  const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, 5, opts.mode ?? 'turns', { party: PARTY, enemies, ...(opts.unit ? { units: { party: {}, enemies: { 4: opts.unit } } } : {}) }, false));
  const def = b.get('party-0')!;
  if (opts.taunt) def.statuses.push({ kind: 'taunt', turns: 3, source: def.uid, taken: 0 });
  if (opts.mageHp !== undefined) b.get('party-2')!.hp = opts.mageHp;
  return b;
}

function decide(b: Battle, value?: Record<string, number>) {
  const trace: AiTrace = { options: [], reserves: [], steps: [] };
  const choice = chooseAction(b, 'enemy-0', content.aiConfig, trace, value ? { value } : undefined);
  return { choice, options: trace.options };
}

describe('Taunt çekimi (tauntPull)', () => {
  it('veride 0,7', () => {
    expect(content.aiConfig.value?.tauntPull).toBe(0.7);
  });

  it('alan skill\'inde taunt\'sız hedeflere giden hasarın %70\'i silinir; taunt\'lıya giden tam kalır', () => {
    const b = setup('bandit_crossbowman', { taunt: true });
    expect(b.currentUid).toBe('enemy-0');
    const { options } = decide(b);
    const row = (uid: string) => options.find((o) => o.skill.id === 'scatter_quarrels' && o.primary?.uid === uid)!;
    const off = row('party-1'); // Paladin + Mage sırası (Defender yok)
    expect(off.terms.tauntPull).toBeCloseTo(-0.7 * Object.values(off.dmgBy).reduce((a, c) => a + c, 0), 1);
    expect(row('party-0').terms.tauntPull).toBeUndefined(); // Defender'ın sırası: tek hedef taunt'lı
    // tek hedefli skill: motor zaten zorluyor, terim yok
    for (const o of options.filter((x) => x.skill.id === 'crossbow_bolt')) {
      expect(o.primary?.uid).toBe('party-0');
      expect(o.terms.tauntPull).toBeUndefined();
    }
  });

  it('karar değişir: yaralı Mage\'in sırasına alan atışı yerine taunt\'lı Defender', () => {
    const before = decide(setup('bandit_crossbowman', { taunt: true, mageHp: 20 }), { tauntPull: 0 }).choice!;
    const after = decide(setup('bandit_crossbowman', { taunt: true, mageHp: 20 })).choice!;
    expect(before.skillId).toBe('scatter_quarrels'); // eski davranış: Taunt'a rağmen Mage'in sırası
    expect(after.targetUid).toBe('party-0');
  });

  it('taunt yoksa, değer 0 ise ya da birim taunt\'a uymuyorsa (boss) terim yok', () => {
    const noTerm = (b: Battle, value?: Record<string, number>) => decide(b, value).options.every((o) => o.terms.tauntPull === undefined);
    expect(noTerm(setup('bandit_crossbowman'))).toBe(true);
    expect(noTerm(setup('bandit_crossbowman', { taunt: true }), { tauntPull: 0 })).toBe(true);
    const boss = setup('bandit_crossbowman', { taunt: true, unit: { tier: 'boss' } });
    expect(boss.ignoresTaunt(boss.get('enemy-0')!)).toBe(true);
    expect(noTerm(boss)).toBe(true);
  });

  it('test modunda da çalışır (sırasız mod)', () => {
    const b = setup('charcoal_burner', { taunt: true, mode: 'test' });
    const { choice, options } = decide(b);
    expect(choice).not.toBeNull();
    expect(options.some((o) => o.skill.id === 'kiln_smoke' && (o.terms.tauntPull ?? 0) < 0)).toBe(true);
  });
});

describe('Bölge I düşman YZ ayarı (enemyAi)', () => {
  const plan = (node: string) => battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 3, difficulty: 'medium' }), node));

  it('bölge I planı pressureShare\'i taşır (notlar atılır), bölge II taşımaz', () => {
    const p1 = plan('moor');
    expect(p1.enemyAi).toEqual({ pressureShare: 0.125 });
    expect(p1.enemyAi!.pressureShare).toBeLessThan(content.aiConfig.value!.pressureShare!);
    expect(plan('6A').enemyAi).toBeUndefined();
  });

  it('opts.value baskı terimini düşürür', () => {
    const b = setup('bandit_crossbowman');
    const base = decide(b).options.find((o) => o.skill.id === 'crossbow_bolt' && o.primary?.uid === 'party-2')!;
    const low = decide(b, { pressureShare: 0.125 }).options.find((o) => o.skill.id === 'crossbow_bolt' && o.primary?.uid === 'party-2')!;
    expect(low.terms.pressure).toBeCloseTo(base.terms.pressure! / 2, 1);
  });
});
