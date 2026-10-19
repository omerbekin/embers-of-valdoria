import { describe, expect, it } from 'vitest';
import { CONFIG, battlePlan, debugTeleport, newCampaign, withDifficulty } from '../src/campaign';
import { categoryFirstWin, simulateCampaign, type NodeCategory } from '../src/sim/campaign';
import campaignBalance from '../data/campaign/balance.json';

// Zorluk sıralaması (docs/balance.md > Sefer dengesi): aynı seed'lerle Easy > Medium > Hard ilk deneme kazanma oranı.
const T = campaignBalance.test;
const run = (difficulty: 'easy' | 'medium' | 'hard') => categoryFirstWin(simulateCampaign({ difficulty, player: 'medium', runs: T.orderRuns, firstSeed: T.orderSeed }));
const easy = run('easy');
const medium = run('medium');
const hard = run('hard');

/**
 * BİLİNEN EKSİK (geçici muafiyet; normalde BOŞ): yalnızca listedeki kategori + aralık için "en az 5 puan" farkı denetlenmez (uyarı yazılır);
 * sıralama (Easy > Medium) yine denetlenir. Diğer kategoriler ve Medium > Hard farkı aynen denetlenir. Sefer denge turunda listeden çıkarılır.
 */
export const PENDING_ORDER_GAPS: Readonly<Record<string, string>> = {};

describe(`zorluk sıralaması (${T.orderRuns} sefer, seed ${T.orderSeed})`, () => {
  for (const c of ['normal', 'elite', 'boss'] as NodeCategory[])
    it(`${c}: Easy > Medium > Hard (en az 5 puan arayla)`, () => {
      const msg = `${c}: easy %${easy[c].toFixed(1)}, medium %${medium[c].toFixed(1)}, hard %${hard[c].toFixed(1)}`;
      if (`${c}:easy-medium` in PENDING_ORDER_GAPS) {
        console.warn(`[campaign-difficulty] BİLİNEN EKSİK: ${msg} (Easy-Medium 5 puan farkı muaf: PENDING_ORDER_GAPS)`);
        expect(easy[c], msg).toBeGreaterThan(medium[c]);
      } else expect(easy[c] - medium[c], msg).toBeGreaterThanOrEqual(5);
      expect(medium[c] - hard[c], msg).toBeGreaterThanOrEqual(5);
    });

  it('tutorial: Easy >= Medium >= Hard', () => {
    expect(easy.tutorial).toBeGreaterThanOrEqual(medium.tutorial);
    expect(medium.tutorial).toBeGreaterThanOrEqual(hard.tutorial);
  });
});

/** Planın tüm dalgalarının düşman kurulumları (dalgalı savaş, waves.md; yuvalar karşılaşmada tekrarsız). */
const allEnemies = (p: ReturnType<typeof battlePlan>): ReturnType<typeof battlePlan>['units']['enemies'] => Object.assign({}, ...(p.waves ?? []).map((w) => w.units), p.units.enemies);

describe('zorluk tanımı düşmanlara uygulanır', () => {
  it('çarpanlar çarpılır, düz ekler toplanır; zorluk ekleri yoksa karşılaşma aynen', () => {
    expect(withDifficulty({ hpMult: 2, spriteScale: 1.4 }, { hpMult: 1.1, powerMult: 1.2, armorAdd: 2 })).toEqual({ hpMult: 2.2, spriteScale: 1.4, powerMult: 1.2, armorAdd: 2 });
    expect(withDifficulty(undefined, undefined)).toBeUndefined();
    expect(withDifficulty({ hpMult: 0.5 }, {})).toEqual({ hpMult: 0.5 });
  });

  it('Hard: tüm düşmanlar campaign.json > difficulties.hard.enemy ile, boss ayrıca enemyTier.boss ile güçlenir; Medium veride yazıldığı gibi', () => {
    const plan = (difficulty: 'medium' | 'hard', node: string) => battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 3, difficulty }), node));
    const hard = CONFIG.difficulties.hard;
    const m5 = allEnemies(plan('medium', '5A'));
    const h5 = allEnemies(plan('hard', '5A'));
    for (const slot of Object.keys(m5)) {
      expect(h5[+slot]!.modifiers!.hpMult).toBeCloseTo((m5[+slot]!.modifiers!.hpMult ?? 1) * (hard.enemy?.hpMult ?? 1), 2);
      expect(h5[+slot]!.modifiers!.powerMult ?? 1).toBeCloseTo((m5[+slot]!.modifiers!.powerMult ?? 1) * (hard.enemy?.powerMult ?? 1), 2);
    }
    // Lord Morvane (düğüm 12): rütbe eki uygulanır
    const boss = (d: 'medium' | 'hard', node: string) => Object.values(allEnemies(plan(d, node))).find((u) => u.tier === 'boss')!.modifiers!;
    const mb = boss('medium', '12');
    const hb = boss('hard', '12');
    expect(hb.hpMult).toBeCloseTo(mb.hpMult! * (hard.enemy?.hpMult ?? 1) * (hard.enemyTier?.boss?.hpMult ?? 1), 2);
    // The Bridge Warden (düğüm 9): noTierMods, yalnızca genel Hard eki (sim ölçümü: rütbe ekiyle Hard ilk deneme ~%15); eylem sayısı aynı
    const mw = boss('medium', '9');
    const hw = boss('hard', '9');
    expect(hw.hpMult ?? 1).toBeCloseTo((mw.hpMult ?? 1) * (hard.enemy?.hpMult ?? 1), 2);
    expect(hw.actionsPerTurn).toBe(mw.actionsPerTurn);
  });

  it('eliteEscort (open-questions 365): yalnızca ELİT düğümün rütbesiz eşlikçilerine; elit lider, noTierMods ve normal düğüm etkilenmez', () => {
    const units = (difficulty: 'easy' | 'medium', node: string) => allEnemies(battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 3, difficulty }), node)));
    const esc = CONFIG.difficulties.medium.eliteEscort!;
    expect(esc.hpMult).toBeGreaterThan(1);
    expect(CONFIG.difficulties.easy.eliteEscort).toBeUndefined();
    const ratio = (m: Record<number, { modifiers?: { hpMult?: number; powerMult?: number }; tier?: string }>, e: typeof m, slot: string, k: 'hpMult' | 'powerMult') =>
      (m[+slot]!.modifiers?.[k] ?? 1) / (e[+slot]!.modifiers?.[k] ?? 1);
    for (const node of ['8C', '3']) {
      const m = units('medium', node);
      const e = units('easy', node);
      let escorts = 0;
      for (const slot of Object.keys(m)) {
        if (m[+slot]!.tier) continue;
        escorts++;
        expect(ratio(m, e, slot, 'hpMult')).toBeCloseTo(esc.hpMult ?? 1, 2);
        expect(ratio(m, e, slot, 'powerMult')).toBeCloseTo(esc.powerMult ?? 1, 2);
      }
      expect(escorts).toBeGreaterThan(0);
    }
    // Black Cathedral eliti: yalnızca enemyTier.elite farkı
    const m8 = units('medium', '8C');
    const e8 = units('easy', '8C');
    const lead = Object.keys(m8).find((s) => m8[+s]!.tier === 'elite')!;
    expect(ratio(m8, e8, lead, 'hpMult')).toBeCloseTo((CONFIG.difficulties.medium.enemyTier?.elite?.hpMult ?? 1) / (CONFIG.difficulties.easy.enemyTier?.elite?.hpMult ?? 1), 2);
    // Bandit Chief (noTierMods): iki zorlukta aynı
    const m3 = units('medium', '3');
    const e3 = units('easy', '3');
    const chief = Object.keys(m3).find((s) => m3[+s]!.tier === 'elite')!;
    expect(m3[+chief]!.modifiers).toEqual(e3[+chief]!.modifiers);
    // normal düğüm: Easy ile Medium aynı (eliteEscort uygulanmaz)
    const m5 = units('medium', '5A');
    const e5 = units('easy', '5A');
    for (const slot of Object.keys(m5)) expect(m5[+slot]!.modifiers).toEqual(e5[+slot]!.modifiers);
  });
});
