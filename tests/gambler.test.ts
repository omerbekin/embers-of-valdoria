import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeSkill, previewSkill } from '../src/engine';
import { describeEvent } from '../src/engine/match-log';
import { compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';
import type { AiConfig, BattleEvent, BattleMode, SkillDef, SkillEffect } from '../src/engine';

// Gambler class'ı ve onun yeni motor kuralları: çifte vuruş (repeatChance), bahis (bet), rastgele durum (randomStatus).
// Sayılar veriden okunur; zorlanan sonuçlar için skill kopyaları (winChance 0/1 gibi) yalnızca testte kullanılır.

const ai: AiConfig = { ...content.aiConfig, global: undefined }; // class skill kararları (global skill: tests/ai-global.test.ts)
const ATTRS = ['str', 'int', 'dex', 'luck'] as const;
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');

/** Gambler (party slot 0) vs tek düşman (enemy slot 0, çok canlı). `skillOverrides`: id -> değiştirilmiş skill. */
function duel(opts: { seed?: number; mode?: BattleMode; enemy?: string; overrides?: Record<string, SkillDef> } = {}): Battle {
  const setup = content.battleSetup('random-battle', opts.seed ?? 1, opts.mode ?? 'test', { party: cells({ 0: 'gambler' }), enemies: cells({ 0: opts.enemy ?? 'warrior', 3: 'warrior' }) }, false);
  const b = new Battle({ ...setup, skills: { ...setup.skills, ...(opts.overrides ?? {}) } });
  for (const c of b.combatants) {
    c.hp = c.maxHp = 100000;
    Object.assign(c.stats, { accuracy: 10, evasion: 0 });
    c.stats.armor = 0;
    c.stats.surviveChance = 0;
  }
  b.debug.crit = 'never';
  return b;
}

const withEffect = (id: string, mutate: (e: SkillEffect) => SkillEffect): SkillDef => {
  const s = content.skills[id]!;
  return { ...s, effects: s.effects.map(mutate) };
};

const G = 'party-0';
const E = 'enemy-0';
const run = (b: Battle, skill: string, target = E): BattleEvent[] => {
  const r = b.useSkill(G, skill, target);
  if (!r.ok) throw new Error(r.reason);
  return r.events;
};
const dmgTo = (events: BattleEvent[], uid: string) => events.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.target === uid);
const sumDmg = (events: BattleEvent[], uid: string) => dmgTo(events, uid).reduce((s, e) => s + e.amount + e.absorbed, 0);
const passives = (events: BattleEvent[], id: string) => events.filter((e) => e.type === 'passive' && e.passive === id);

describe('Gambler: class verisi', () => {
  const g = content.classes.gambler!;

  it('class havuzunda, takım havuzunda (random-battle) ve ai profili tanımlı', () => {
    expect(g).toBeDefined();
    expect(content.battles['random-battle']!.random!.pool).toContain('gambler');
    expect(content.aiConfig.profiles[g.ai!]).toBeDefined();
    expect(g.skills).toEqual(['loaded_dice', 'high_stakes', 'card_trick', 'all_in']);
  });

  it('dört stat toplamı 30, primary luck ve en yüksek stat; Lucky Escape aktif', () => {
    const a = g.attributes;
    expect(a.str + a.int + a.dex + a.luck).toBe(60); // x2 stat ölçeği: 60
    expect(g.primary).toBe('luck');
    expect(a.luck).toBe(Math.max(...ATTRS.map((k) => a[k])));
    expect(g.stats.primaryActive).toBe(true);
    expect(g.stats.surviveChance).toBe(content.formulas.primaryBonus.luck.surviveChance);
  });

  it('tüm hasarlar skill\'in statıyla (luck) ölçeklenir; bahis/çifte vuruş ölçek kuralını bozmaz', () => {
    for (const id of g.skills) {
      for (const e of content.skills[id]!.effects) {
        if (e.type === 'damage' || e.type === 'ground') expect((e as { scale: string }).scale, id).toBe('luck');
        expect(['damage', 'randomStatus'], `${id}: ${e.type} bu class'ta beklenmiyor`).toContain(e.type);
      }
    }
  });

  it('skill bedelleri ve beklemeleri mevcut class\'larla aynı büyüklükte', () => {
    const others = Object.values(content.classes).filter((c) => c.id !== 'gambler').flatMap((c) => c.skills.map((s) => content.skills[s]!));
    const maxCost = Math.max(...others.map((s) => s.cost.amount));
    const maxCd = Math.max(...others.map((s) => s.cooldown ?? 0));
    for (const id of g.skills) {
      const s = content.skills[id]!;
      expect(s.cost.amount, id).toBeLessThanOrEqual(maxCost);
      expect(s.cooldown ?? 0, id).toBeLessThanOrEqual(maxCd);
      expect(s.cost.amount, id).toBeLessThanOrEqual(g.stats.mp);
    }
    expect(content.skills.loaded_dice!.cost.amount).toBe(0); // 1. skill bedava (diğer class'lar gibi)
  });
});

/** Gambler'ın Lucky Streak pasifi (veriden). */
const lucky = content.classes.gambler!.passive!.effect as { type: 'luckyStreak'; chance: number; max: number; skills: number[] };
/** Pasif tekrar şansını bu birimde değiştirir (yalnız test). */
const setRepeat = (b: Battle, chance: number) => {
  const me = b.get(G)!;
  me.passive = { ...me.passive!, effect: { ...lucky, chance } };
};
const diceOf = (events: BattleEvent[]) => events.filter((e): e is Extract<BattleEvent, { type: 'dice' }> => e.type === 'dice');
const streakEv = (events: BattleEvent[]) => events.filter((e): e is Extract<BattleEvent, { type: 'streak' }> => e.type === 'streak');

describe('Lucky Streak: pasif tekrar (eski Loaded Dice repeatChance)', () => {
  it('pasif verisi: tekrar şansı, seri tavanı, tekrar eden skill sıraları (1., 2., 3.; ult hariç)', () => {
    expect(lucky.type).toBe('luckyStreak');
    expect(lucky.skills).not.toContain(content.classes.gambler!.skills.indexOf('all_in'));
    expect((content.skills.loaded_dice!.effects[0] as { repeatChance?: number }).repeatChance).toBeUndefined();
  });

  it('ihtimal 1: hedefe iki vuruş, "Double Hit" yazısı, her vuruş yeni zar; ihtimal 0: tek vuruş', () => {
    const b2 = duel();
    setRepeat(b2, 1);
    const two = run(b2, 'loaded_dice');
    expect(dmgTo(two, E)).toHaveLength(2);
    expect(diceOf(two)).toHaveLength(2);
    expect(passives(two, 'gamble_double')).toHaveLength(1);
    const b1 = duel();
    setRepeat(b1, 0);
    const one = run(b1, 'loaded_dice');
    expect(dmgTo(one, E)).toHaveLength(1);
    expect(passives(one, 'gamble_double')).toHaveLength(0);
  });

  it('gerçek veri: tekrar oranı pasifin şansına yakın (seed\'li)', () => {
    let doubles = 0;
    const N = 600;
    for (let seed = 1; seed <= N; seed++) if (dmgTo(run(duel({ seed }), 'loaded_dice'), E).length === 2) doubles++;
    expect(doubles / N).toBeGreaterThan(lucky.chance - 0.07);
    expect(doubles / N).toBeLessThan(lucky.chance + 0.07);
  });

  it('High Stakes tekrarı yeni bahis atmaz: tek Jackpot/Bust, can bedeli bir kez, seri bir kez değişir', () => {
    const b = duel({ overrides: { high_stakes: withEffect('high_stakes', (e) => (e.type === 'damage' && e.bet ? { ...e, bet: { ...e.bet, winChance: 0 } } : e)) } });
    setRepeat(b, 1);
    const me = b.get(G)!;
    me.streak = 2;
    const hp0 = me.hp;
    const ev = run(b, 'high_stakes');
    expect(dmgTo(ev, E)).toHaveLength(2);
    expect(passives(ev, 'gamble_lose')).toHaveLength(1);
    const bet = (content.skills.high_stakes!.effects[0] as { bet: { ratio: number } }).bet;
    expect(hp0 - me.hp).toBe(Math.round(me.maxHp * bet.ratio));
    expect(streakEv(ev).map((e) => e.reason)).toEqual(['betLoss']);
  });

  it('All In tekrar etmez (ihtimal 1 olsa da)', () => {
    const b = duel();
    setRepeat(b, 1);
    b.get(G)!.mp = b.get(G)!.maxMp;
    const ev = run(b, 'all_in');
    expect(passives(ev, 'gamble_double')).toHaveLength(0);
    expect(ev.filter((e) => e.type === 'skillUsed')).toHaveLength(1);
    expect(dmgTo(ev, E).length).toBeLessThanOrEqual(1);
  });

  it('aynı seed + aynı girdi = birebir aynı olay akışı (iki modda da)', () => {
    for (const mode of ['test', 'turns'] as const) {
      for (const skill of ['loaded_dice', 'high_stakes', 'card_trick', 'all_in']) {
        const play = () => {
          const b = duel({ seed: 7, mode });
          const actor = mode === 'turns' ? b.currentUid! : G;
          b.get(actor)!.mp = b.get(actor)!.maxMp;
          if (b.get(actor)!.streak !== undefined) b.get(actor)!.streak = 2;
          return b.useSkill(actor, actor === G ? skill : b.get(actor)!.skills[0]!, mode === 'turns' ? b.living(b.get(actor)!.side === 'party' ? 'enemy' : 'party')[0]!.uid : E);
        };
        expect(JSON.stringify(play()), `${mode} ${skill}`).toBe(JSON.stringify(play()));
      }
    }
  });
});

describe('Lucky Streak: Loaded Dice zarları', () => {
  const dice = (content.skills.loaded_dice!.effects[0] as { dice: { count: number; sides: number; mean: number; doubleGain: number } }).dice;

  it('iki zar 1..yüz arası; hasar zar toplamıyla orantılı (toplam / ortalama)', () => {
    const rows: { sum: number; dmg: number }[] = [];
    for (let seed = 1; seed <= 200; seed++) {
      const b = duel({ seed });
      setRepeat(b, 0);
      const ev = run(b, 'loaded_dice');
      const d = diceOf(ev);
      expect(d).toHaveLength(1);
      expect(d[0]!.values).toHaveLength(dice.count);
      for (const v of d[0]!.values) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(dice.sides);
      }
      expect(d[0]!.double).toBe(d[0]!.values.every((v) => v === d[0]!.values[0]));
      rows.push({ sum: d[0]!.values.reduce((a, b) => a + b, 0), dmg: sumDmg(ev, E) });
    }
    const avg = (k: number) => {
      const r = rows.filter((x) => x.sum === k);
      return r.reduce((a, x) => a + x.dmg, 0) / r.length;
    };
    expect(avg(12) / avg(dice.mean)).toBeGreaterThan((12 / dice.mean) * 0.8);
    expect(avg(12) / avg(dice.mean)).toBeLessThan((12 / dice.mean) * 1.2);
    expect(avg(2)).toBeLessThan(avg(dice.mean));
  });

  it('çift gelirse seri +1 (olay: streak double); seri tavanda kalır', () => {
    let seen = 0;
    for (let seed = 1; seed <= 200 && seen < 3; seed++) {
      const b = duel({ seed });
      setRepeat(b, 0);
      const me = b.get(G)!;
      expect(me.streak).toBe(0); // savaş başı 0
      const ev = run(b, 'loaded_dice');
      if (!diceOf(ev)[0]!.double) {
        expect(me.streak).toBe(0);
        continue;
      }
      seen++;
      expect(me.streak).toBe(dice.doubleGain);
      expect(streakEv(ev)).toMatchObject([{ before: 0, after: dice.doubleGain, max: lucky.max, reason: 'double' }]);
      // tavanda: kazanç boşa, olay yok
      const b2 = duel({ seed });
      setRepeat(b2, 0);
      b2.get(G)!.streak = lucky.max;
      const ev2 = run(b2, 'loaded_dice');
      expect(b2.get(G)!.streak).toBe(lucky.max);
      expect(streakEv(ev2)).toHaveLength(0);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('1. skill seriyi harcamaz; debug oynatması seriyi değiştirmez', () => {
    const b = duel();
    const me = b.get(G)!;
    me.streak = lucky.max;
    run(b, 'loaded_dice');
    expect(me.streak).toBe(lucky.max);
    me.streak = lucky.max;
    b.debugCast(G, 'high_stakes', E);
    expect(me.streak).toBe(lucky.max);
  });
});

describe('bahis (damage.bet): can', () => {
  const hs = (winChance: number) => ({ high_stakes: withEffect('high_stakes', (e) => (e.type === 'damage' && e.bet ? { ...e, bet: { ...e.bet, winChance } } : e)) });
  const bet = (content.skills.high_stakes!.effects[0] as { bet: { ratio: number; winMult: number; loseMult: number } }).bet;

  it('kazanç: Jackpot, hasar winMult katı, can düşmez', () => {
    const win = duel({ overrides: hs(1) });
    const ev = run(win, 'high_stakes');
    expect(passives(ev, 'gamble_win')).toHaveLength(1);
    expect(win.get(G)!.hp).toBe(win.get(G)!.maxHp);
    const lose = duel({ overrides: hs(0) });
    const evL = run(lose, 'high_stakes');
    expect(sumDmg(ev, E) / sumDmg(evL, E)).toBeGreaterThan((bet.winMult / bet.loseMult) * 0.75);
    expect(sumDmg(ev, E) / sumDmg(evL, E)).toBeLessThan((bet.winMult / bet.loseMult) * 1.3);
  });

  it('kayıp: Bust, bahis (maks canın ratio\'su) kullanıcıdan düşer, hasar loseMult katı', () => {
    const b = duel({ overrides: hs(0) });
    const me = b.get(G)!;
    const before = me.hp;
    const ev = run(b, 'high_stakes');
    expect(passives(ev, 'gamble_lose')).toHaveLength(1);
    const stake = Math.round(me.maxHp * bet.ratio);
    expect(before - me.hp).toBe(stake);
    expect(dmgTo(ev, G)).toHaveLength(1); // kendine hasar olayı (UI için)
    expect(dmgTo(ev, G)[0]!.amount).toBe(stake);
  });

  it('can bahsi kullanıcıyı öldürmez: canı en az 1 kalır', () => {
    const b = duel({ overrides: hs(0) });
    const me = b.get(G)!;
    me.hp = 3;
    run(b, 'high_stakes');
    expect(me.hp).toBe(1);
    expect(me.hp).toBeGreaterThan(0);
  });

  it('turns modunda cooldown işler, test modunda cooldown yok', () => {
    const t = duel({ mode: 'turns' });
    const first = t.currentActor!;
    const me = t.combatants.find((c) => c.uid === G)!;
    while (t.currentUid !== G && !t.winner) t.skipTurn();
    me.mp = me.maxMp;
    expect(t.useSkill(G, 'high_stakes', t.living('enemy')[0]!.uid).ok).toBe(true);
    expect(me.cooldowns.high_stakes).toBe(content.skills.high_stakes!.cooldown);
    expect(first).toBeDefined();
    const x = duel({ mode: 'test' });
    run(x, 'high_stakes');
    expect(x.get(G)!.cooldowns.high_stakes).toBeUndefined();
    expect(x.canUse(G, 'high_stakes').ok).toBe(true);
  });
});

describe('Lucky Streak: High Stakes', () => {
  const hs = (winChance: number) => ({ high_stakes: withEffect('high_stakes', (e) => (e.type === 'damage' && e.bet ? { ...e, bet: { ...e.bet, winChance } } : e)) });
  const full = content.skills.high_stakes!.streak!.full!;

  it('bahis kazanırsa seri +1, kaybederse 0', () => {
    const w = duel({ overrides: hs(1) });
    setRepeat(w, 0);
    w.get(G)!.streak = 1;
    const ev = run(w, 'high_stakes');
    expect(w.get(G)!.streak).toBe(1 + content.skills.high_stakes!.streak!.betWinGain!);
    expect(streakEv(ev)[0]!.reason).toBe('betWin');
    const l = duel({ overrides: hs(0) });
    setRepeat(l, 0);
    l.get(G)!.streak = 2;
    run(l, 'high_stakes');
    expect(l.get(G)!.streak).toBe(0);
  });

  it('seri doluyken: seri harcanır (0), bahis kesin kazanılır, verilen hasarın bir kısmı can emme', () => {
    const b = duel({ overrides: hs(0) }); // şans 0 olsa da dolu seri kesin kazanır
    setRepeat(b, 0);
    const me = b.get(G)!;
    me.streak = lucky.max;
    me.hp = Math.round(me.maxHp / 2);
    const hp0 = me.hp;
    // biçim: önizleme ve YZ aynı tanımı görür
    const def = b.skill('high_stakes', G)!;
    expect((def.effects[0] as { bet: { winChance: number } }).bet.winChance).toBe(1);
    expect((def.effects[0] as { lifesteal?: number }).lifesteal).toBe(full.lifesteal);
    const ev = run(b, 'high_stakes');
    expect(passives(ev, 'gamble_win')).toHaveLength(1);
    expect(streakEv(ev)).toMatchObject([{ before: lucky.max, after: 0, reason: 'spend' }]);
    expect(me.streak).toBe(0);
    const healed = ev.filter((e) => e.type === 'heal' && e.target === G && e.cause === 'lifesteal').reduce((a, e) => a + (e.type === 'heal' ? e.amount : 0), 0);
    expect(healed).toBe(Math.round(sumDmg(ev, E) * full.lifesteal!));
    expect(me.hp).toBe(hp0 + healed);
    // seri harcandı: sonraki High Stakes normal biçim
    expect((b.skill('high_stakes', G)!.effects[0] as { lifesteal?: number }).lifesteal).toBeUndefined();
  });
});

describe('Lucky Streak: All In (her şey masaya)', () => {
  const skill = content.skills.all_in!;
  const bet = (skill.effects[0] as { bet: { winChance: number; winMult: number; loseMult?: number; perStake: number; loseHpRatio: number } }).bet;
  const table = skill.streak!.winChanceByStreak!;
  const ai_ = (winChance: number) => ({ all_in: { ...skill, streak: { ...skill.streak!, winChanceByStreak: table.map(() => winChance) }, effects: skill.effects.map((e) => (e.type === 'damage' && e.bet ? { ...e, bet: { ...e.bet, winChance } } : e)) } });

  it('kazanma ihtimali seriye göre tablo (önizleme / YZ / gerçek aynı tanım); seri 0 değeri bet.winChance', () => {
    expect(table).toHaveLength(lucky.max + 1);
    expect(table[0]).toBe(bet.winChance);
    expect(table[lucky.max]).toBe(1);
    const b = duel();
    for (let s = 0; s <= lucky.max; s++) {
      b.get(G)!.streak = s;
      expect((b.skill('all_in', G)!.effects[0] as { bet: { winChance: number } }).bet.winChance, `streak ${s}`).toBe(table[s]);
    }
  });

  it('uzun vadede kazanma oranı tablodaki ihtimale yakın (seri 1)', () => {
    let won = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) {
      const b = duel({ seed });
      b.get(G)!.mp = b.get(G)!.maxMp;
      b.get(G)!.streak = 1;
      if (passives(run(b, 'all_in'), 'gamble_win').length) won++;
    }
    expect(won / N).toBeGreaterThan(table[1]! - 0.08);
    expect(won / N).toBeLessThan(table[1]! + 0.08);
  });

  it('kayıp: hasar 0, MP 0, seri 0, maks canın loseHpRatio\'su gider (en az 1 can kalır)', () => {
    const b = duel({ overrides: ai_(0) });
    const me = b.get(G)!;
    me.mp = me.maxMp;
    me.streak = 2;
    const hp0 = me.hp;
    const ev = run(b, 'all_in');
    expect(passives(ev, 'gamble_lose')).toHaveLength(1);
    expect(dmgTo(ev, E)).toHaveLength(0);
    expect(me.mp).toBe(0);
    expect(me.streak).toBe(0);
    expect(hp0 - me.hp).toBe(Math.round(me.maxHp * bet.loseHpRatio));
    const b2 = duel({ overrides: ai_(0) });
    b2.get(G)!.mp = b2.get(G)!.maxMp;
    b2.get(G)!.hp = 2;
    run(b2, 'all_in');
    expect(b2.get(G)!.hp).toBe(1);
  });

  it('seri ödülü (Ömer 2026-11-19): seri 0 / 1 / 2 iken kazanırsa seri dolar (tek olay, sebep fill); veride winFillsStreak', () => {
    expect(skill.streak!.winFillsStreak).toBe(true);
    for (let s = 0; s < lucky.max; s++) {
      const b = duel({ overrides: ai_(1) });
      const me = b.get(G)!;
      me.mp = me.maxMp;
      me.streak = s;
      const ev = run(b, 'all_in');
      expect(passives(ev, 'gamble_win'), `seri ${s}`).toHaveLength(1);
      expect(me.streak, `seri ${s}`).toBe(lucky.max);
      expect(streakEv(ev), `seri ${s}`).toMatchObject([{ before: s, after: lucky.max, reason: 'fill' }]);
      // Maç kaydı satırı yeni sebebi yazar
      expect(describeEvent(b, streakEv(ev)[0]!)).toMatch(/All In won: Streak filled/);
    }
  });

  it('seri ödülü + ağaç (Unbroken Run, streakGain miktar 3): dolum tetiği o kullanımın vuruşunu değil sonraki skill\'i kritik yapar (High Stakes kazancıyla aynı sıra)', () => {
    const tree = (() => {
      const t = JSON.parse(JSON.stringify(treeOf('gambler')!)) as TreeData;
      for (const k of Object.keys(t.nodes)) if (k !== '0.ma') t.nodes[k]!.fx = null;
      for (const bar of t.mastery.bar) bar.fx = null;
      return compileTree(t, { v: t.version, r: { '0.ma': 1 } });
    })();
    const sure = (id: string): SkillDef => {
      const s = content.skills[id]!;
      return { ...s, ...(s.streak?.winChanceByStreak ? { streak: { ...s.streak, winChanceByStreak: s.streak.winChanceByStreak.map(() => 1) } } : {}), effects: s.effects.map((e) => (e.type === 'damage' && e.bet ? { ...e, bet: { ...e.bet, winChance: 1 } } : e)) };
    };
    const crits = (sk: string, lv: number) => {
      const setup = content.battleSetup('random-battle', 1, 'test', { party: cells({ 0: 'gambler' }), enemies: cells({ 0: 'warrior', 3: 'warrior' }), units: { party: { 0: { tree } }, enemies: {} } }, false);
      const b = new Battle({ ...setup, skills: { ...setup.skills, [sk]: sure(sk) } });
      for (const c of b.combatants) {
        c.hp = c.maxHp = 100000;
        Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0 });
      }
      const me = b.get(G)!;
      me.mp = me.maxMp;
      me.streak = lv;
      me.cooldowns = {};
      const first = dmgTo(run(b, sk), E).map((e) => e.crit);
      me.mp = me.maxMp;
      me.cooldowns = {};
      const next = dmgTo(run(b, 'loaded_dice'), E).map((e) => e.crit);
      return { first, next };
    };
    const allIn = crits('all_in', 0);
    expect(allIn.first).toEqual([false]);
    expect(allIn.next.every(Boolean)).toBe(true);
    expect(crits('high_stakes', lucky.max - 1)).toEqual({ first: [false], next: allIn.next.map(() => true) });
  });

  it('seri ödülü: kayıpta seri 0 (seri 0 iken olay yok, seri 1-2 iken sebep betLoss)', () => {
    for (let s = 0; s < lucky.max; s++) {
      const b = duel({ overrides: ai_(0) });
      const me = b.get(G)!;
      me.mp = me.maxMp;
      me.streak = s;
      const ev = run(b, 'all_in');
      expect(me.streak, `seri ${s}`).toBe(0);
      expect(streakEv(ev), `seri ${s}`).toEqual(s === 0 ? [] : [expect.objectContaining({ before: s, after: 0, reason: 'betLoss' })]);
    }
  });

  it('seri 3: kesin kazanç, seri harcanır (0, sebep spend; döngü kırılır), kazanç x(1 + fullStreakMore) ayrı çarpan', () => {
    const more = skill.streak!.fullStreakMore!;
    expect(more).toBeGreaterThan(0);
    const play = (overrides?: Record<string, SkillDef>) => {
      const b = duel({ seed: 7, ...(overrides ? { overrides } : {}) });
      const me = b.get(G)!;
      me.mp = me.maxMp;
      me.streak = lucky.max;
      const ev = run(b, 'all_in');
      return { ev, me, dmg: sumDmg(ev, E) };
    };
    const full = play();
    expect(passives(full.ev, 'gamble_win')).toHaveLength(1);
    expect(full.me.streak).toBe(0);
    expect(streakEv(full.ev)).toMatchObject([{ before: lucky.max, after: 0, reason: 'spend' }]);
    // Aynı seed, ayrı çarpan 0: oran = 1 + more (yuvarlama payı)
    const plain = play({ all_in: { ...skill, streak: { ...skill.streak!, fullStreakMore: 0 } } });
    expect(full.dmg / plain.dmg).toBeGreaterThan((1 + more) * 0.98);
    expect(full.dmg / plain.dmg).toBeLessThan((1 + more) * 1.02);
    // Önizleme / YZ aynı tanımı görür: seri 3 biçiminde kazanç dalında ayrı çarpan, seri 2'de yok
    const b = duel();
    b.get(G)!.streak = lucky.max;
    expect((b.skill('all_in', G)!.effects[0] as { bet: { winMore?: number } }).bet.winMore).toBe(more);
    b.get(G)!.streak = lucky.max - 1;
    expect((b.skill('all_in', G)!.effects[0] as { bet: { winMore?: number } }).bet.winMore).toBeUndefined();
  });

  it('seri ödülü seed tekrarı: aynı seed + aynı girdi = birebir aynı olay akışı (iki modda da)', () => {
    const play = (seed: number, mode: BattleMode) => {
      const { initialCooldown: _ic, ...noOpen } = skill; // turns modunda ilk bekleme olmasın
      const b = duel({ seed, mode, overrides: { all_in: noOpen } });
      for (let i = 0; i < 20 && b.currentActor?.uid !== G; i++) b.skipTurn(); // turns: sıra hız zarına bağlı; Gambler'ın sırasını bekle (aynı seed = aynı bekleyiş)
      const me = b.get(G)!;
      me.mp = me.maxMp;
      me.streak = 2;
      return JSON.stringify(run(b, 'all_in')) + '|' + me.streak;
    };
    for (const mode of ['test', 'turns'] as BattleMode[]) for (const seed of [3, 11, 29]) expect(play(seed, mode)).toBe(play(seed, mode));
  });

  it('kazanç: hasar winMult + perStake x bahis katı, MP bedelden sonra kalan miktarda kalır; bahis büyüdükçe hasar artar', () => {
    const play = (mp: number) => {
      const b = duel({ overrides: ai_(1) });
      const me = b.get(G)!;
      me.mp = mp;
      const ev = run(b, 'all_in');
      return { dmg: sumDmg(ev, E), mpLeft: me.mp, stake: mp - skill.cost.amount };
    };
    const small = play(skill.cost.amount);
    const big = play(skill.cost.amount + 10);
    expect(small.mpLeft).toBe(small.stake);
    expect(big.mpLeft).toBe(big.stake);
    expect(big.dmg).toBeGreaterThan(small.dmg);
    const luck = content.classes.gambler!.stats.luck;
    const power = (skill.effects[0] as { power: number }).power;
    expect(small.dmg).toBeGreaterThan(luck * power * bet.winMult * 0.85);
    expect(small.dmg).toBeLessThan(luck * power * bet.winMult * 1.15);
    const expectedRatio = (bet.winMult + bet.perStake * big.stake) / (bet.winMult + bet.perStake * small.stake);
    expect(big.dmg / small.dmg).toBeGreaterThan(expectedRatio * 0.85);
    expect(big.dmg / small.dmg).toBeLessThan(expectedRatio * 1.15);
  });

  it('MP yoksa canUse reddeder (bedel)', () => {
    const b = duel();
    b.get(G)!.mp = 0;
    expect(b.canUse(G, 'all_in').ok).toBe(false);
  });
});

/** 4 düşmanlı arena (Card Trick seri biçimi 3 hedef ister). */
function crowd(seed = 1): Battle {
  const setup = content.battleSetup('random-battle', seed, 'test', { party: cells({ 0: 'gambler' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior' }) }, false);
  const b = new Battle(setup);
  for (const c of b.combatants) {
    c.hp = c.maxHp = 100000;
    Object.assign(c.stats, { accuracy: 10, evasion: 0 });
    c.stats.surviveChance = 0;
  }
  b.debug.crit = 'never';
  b.get(G)!.mp = b.get(G)!.maxMp;
  return b;
}
/** Olayları kullanım başına böler (skillUsed sınırı). */
const perCast = (events: BattleEvent[]): BattleEvent[][] => {
  const out: BattleEvent[][] = [];
  for (const e of events) {
    if (e.type === 'skillUsed') out.push([]);
    out[out.length - 1]?.push(e);
  }
  return out;
};

describe('Lucky Streak: Card Trick', () => {
  const full = content.skills.card_trick!.streak!.full!;

  it('seri doluyken: seri harcanır, 3 rastgele düşman; biri kesin Stun, diğerleri Slow ya da Wound', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const b = crowd(seed);
      setRepeat(b, 0);
      b.get(G)!.streak = lucky.max;
      const ev = b.useSkill(G, 'card_trick');
      if (!ev.ok) throw new Error(ev.reason);
      const used = ev.events.find((e) => e.type === 'skillUsed')!;
      expect(used.type === 'skillUsed' && used.targets).toHaveLength(full.count!);
      const st = ev.events.filter((e): e is Extract<BattleEvent, { type: 'status' }> => e.type === 'status');
      expect(st).toHaveLength(full.count!);
      expect(st.filter((x) => x.status === full.sure!.status)).toHaveLength(1);
      for (const x of st.filter((y) => y.status !== full.sure!.status)) expect(full.others!.map((o) => o.status)).toContain(x.status);
      expect(b.get(G)!.streak).toBe(0);
    }
  });

  it('pasif tekrarı: yeni rastgele hedeflerle bir kez daha (MP / bekleme yok, seri tekrar harcanmaz); seride atıldıysa tekrar da seri kuralıyla', () => {
    const b = crowd(4);
    setRepeat(b, 1);
    const me = b.get(G)!;
    me.streak = lucky.max;
    const mp0 = me.mp;
    const r = b.useSkill(G, 'card_trick');
    if (!r.ok) throw new Error(r.reason);
    const casts = perCast(r.events);
    expect(casts).toHaveLength(2); // tekrar kendi tekrarını atmaz
    expect(passives(r.events, 'gamble_double')).toHaveLength(1);
    for (const c of casts) {
      const used = c[0]!;
      expect(used.type === 'skillUsed' && used.targets).toHaveLength(full.count!);
      expect(c.filter((e) => e.type === 'status' && e.status === full.sure!.status)).toHaveLength(1);
    }
    expect(streakEv(r.events)).toHaveLength(1);
    expect(mp0 - me.mp).toBe(content.skills.card_trick!.cost.amount);
    // seri dışı: 2 hedef, eski rastgele durum
    const n = crowd(4);
    setRepeat(n, 1);
    const r2 = n.useSkill(G, 'card_trick');
    if (!r2.ok) throw new Error(r2.reason);
    for (const c of perCast(r2.events)) expect(c[0]!.type === 'skillUsed' && c[0]!.targets).toHaveLength(content.skills.card_trick!.count!);
  });

  it('boss / elit ccImmunity: kesin Stun da normal bağışıklık kuralından geçer', () => {
    const b = crowd(2);
    setRepeat(b, 0);
    const foes = b.combatants.filter((c) => c.side === 'enemy');
    for (const c of foes) c.tier = 'boss';
    expect(b.ccImmune(foes[0]!)).toBe(true);
    b.get(G)!.streak = lucky.max;
    const r = b.useSkill(G, 'card_trick');
    if (!r.ok) throw new Error(r.reason);
    const stunned = r.events.filter((e) => e.type === 'status' && e.status === 'stun');
    const immune = r.events.filter((e) => e.type === 'immune' && e.status === 'stun');
    expect(stunned).toHaveLength(0);
    expect(immune).toHaveLength(1);
  });
});

describe('rastgele durum (randomStatus): Card Trick', () => {
  const trick = content.skills.card_trick!;
  const options = (trick.effects.find((e) => e.type === 'randomStatus') as Extract<SkillEffect, { type: 'randomStatus' }>).options;

  it('rastgele 2 farklı düşmana vurur; her vurulana seçeneklerden tam 1 durum verilir', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const b = duel({ seed });
      for (const ev of perCast(run(b, 'card_trick'))) {
        const hit = [...new Set(dmgTo(ev, E).concat(dmgTo(ev, 'enemy-1')).map((e) => e.target))];
        expect(hit.length).toBeLessThanOrEqual(trick.count!);
        const st = ev.filter((e): e is Extract<BattleEvent, { type: 'status' }> => e.type === 'status');
        expect(st).toHaveLength(hit.length);
        for (const s of st) expect(options.map((o) => o.status)).toContain(s.status);
      }
    }
  });

  it('seed\'e göre farklı etkiler çıkar (tümü görülür), ağırlıklara uygun; aynı seed aynı sonuç', () => {
    const seen = new Map<string, number>();
    for (let seed = 1; seed <= 300; seed++) {
      const ev = run(duel({ seed }), 'card_trick');
      for (const e of ev) if (e.type === 'status') seen.set(e.status, (seen.get(e.status) ?? 0) + 1);
    }
    for (const o of options) expect(seen.get(o.status) ?? 0, o.status).toBeGreaterThan(0);
    const heaviest = [...options].sort((a, b) => b.weight - a.weight)[0]!.status;
    const lightest = [...options].sort((a, b) => a.weight - b.weight)[0]!.status;
    expect(seen.get(heaviest)!).toBeGreaterThan(seen.get(lightest)!);
    expect(JSON.stringify(run(duel({ seed: 9 }), 'card_trick'))).toBe(JSON.stringify(run(duel({ seed: 9 }), 'card_trick')));
  });

  it('turns modunda da çalışır ve Slow/Wound/Stun gerçekten uygulanır', () => {
    const b = duel({ mode: 'turns', seed: 3 });
    while (b.currentUid !== G && !b.winner) b.skipTurn();
    b.get(G)!.mp = b.get(G)!.maxMp;
    const r = b.useSkill(G, 'card_trick');
    expect(r.ok).toBe(true);
    const statuses = b.combatants.filter((c) => c.side === 'enemy').flatMap((c) => c.statuses.map((s) => s.kind));
    expect(statuses.length).toBeGreaterThan(0);
  });
});

/** All In bahsi (veriden). */
const allInBet = (content.skills.all_in!.effects[0] as { bet: { loseMult?: number } }).bet;

describe('önizleme ve açıklama', () => {
  it('önizleme: bahis/çifte vuruş en az-en çok-ortalama aralığını verir; ölümcül hesap en çok değere bakar', () => {
    const b = duel();
    const me = b.get(G)!;
    me.mp = me.maxMp;
    const dice = previewSkill(b, G, 'loaded_dice', E)[0]!.damage!;
    expect(dice.max).toBeGreaterThan(dice.avg);
    expect(dice.avg).toBeGreaterThan(dice.min);
    const stakes = previewSkill(b, G, 'high_stakes', E)[0]!.damage!;
    expect(stakes.max).toBeGreaterThan(stakes.avg);
    expect(stakes.min).toBeGreaterThan(0);
    const allIn = previewSkill(b, G, 'all_in', E)[0]!.damage!;
    if ((allInBet.loseMult ?? 1) <= 0) expect(allIn.min).toBe(0); // iska ihtimali
    else expect(allIn.min).toBeGreaterThan(0); // kayıpta da zayıf vuruş (loseMult)
    expect(allIn.max).toBeGreaterThan(allIn.avg);
    expect(previewSkill(b, G, 'card_trick')).toEqual([]); // hedefler rastgele: önizleme yok
  });

  it('önizleme bahis dalları (2026-11-18 YZ düzeltmesi): iki dallı bahiste kazanç/kayıp aralığı ayrı; seri 3 All In kesin kazanç (en az 0 görünmez)', () => {
    const table = content.skills.all_in!.streak!.winChanceByStreak!;
    const max = (content.classes.gambler!.passive!.effect as { max: number }).max;
    const b = duel();
    const me = b.get(G)!;
    me.mp = me.maxMp;
    const a0 = previewSkill(b, G, 'all_in', E)[0]!.damage!;
    expect(a0.bet!.winChance).toBe(table[0]);
    expect(a0.bet!.win.min).toBeGreaterThan(a0.bet!.lose.max);
    if ((allInBet.loseMult ?? 1) <= 0) expect(a0.bet!.lose.max).toBe(0);
    me.streak = max;
    const a3 = previewSkill(b, G, 'all_in', E)[0]!.damage!;
    expect(table[max]).toBe(1);
    expect(a3.bet).toBeUndefined();
    expect(a3.min).toBeGreaterThan(0);
    // High Stakes: tekrar vuruşu (Lucky Streak) ayrı alan; tek vuruş en çoğu iki katlı en çoktan küçük
    me.streak = 0;
    const hs = previewSkill(b, G, 'high_stakes', E)[0]!.damage!;
    const lucky = (content.classes.gambler!.passive!.effect as { chance: number }).chance;
    expect(hs.repeat!.chance).toBe(lucky);
    expect(hs.repeat!.max).toBeLessThan(hs.max);
    expect(hs.bet!.win.max).toBeGreaterThan(hs.bet!.lose.max);
  });

  it('önizleme ve gerçek vuruş tutarlı: gerçek hasar önizleme aralığının içinde', () => {
    for (const skill of ['loaded_dice', 'high_stakes', 'all_in']) {
      for (let seed = 1; seed <= 30; seed++) {
        const b = duel({ seed });
        b.get(G)!.mp = b.get(G)!.maxMp;
        const p = previewSkill(b, G, skill, E)[0]!.damage!;
        const d = sumDmg(run(b, skill), E);
        expect(d, `${skill} seed ${seed}`).toBeGreaterThanOrEqual(p.min);
        expect(d, `${skill} seed ${seed}`).toBeLessThanOrEqual(p.max + 1);
      }
    }
  });

  it('skill-info: her skill\'in açıklaması yeni kuralı sade İngilizceyle anlatır', () => {
    const stats = content.classes.gambler!.stats;
    const info = (id: string) => describeSkill(content.skills[id]!, stats, content.formulas, content.summons, { statuses: content.statuses, grounds: content.grounds });
    expect(info('loaded_dice').lines.join('\n')).toMatch(/Rolls 2 dice .*Doubles add 1 Streak/);
    expect(info('high_stakes').lines.join('\n')).toMatch(/At full Streak: spends it, and the bet always wins/);
    expect(info('card_trick').lines.join('\n')).toMatch(/At full Streak: .*hits 3 random enemies.*always gets Stun/);
    expect(info('card_trick').lines.join('\n')).toMatch(/new random targets/);
    expect(info('all_in').lines.join('\n')).toMatch(/whole Streak: win chance 50% \/ 65% \/ 80% \/ 100%/);
    expect(info('all_in').lines.join('\n')).toMatch(/lose 10% of your max HP/);
    const top = lucky.max;
    expect(info('all_in').lines.join('\n')).toMatch(new RegExp(`A win below ${top} Streak fills your Streak to ${top}; a loss resets it to 0`));
    expect(info('all_in').lines.join('\n')).toMatch(new RegExp(`At ${top} Streak: spends it, and the win deals ${Math.round(content.skills.all_in!.streak!.fullStreakMore! * 100)}% more damage`));
    expect(info('high_stakes').lines.join('\n')).toMatch(/Bet .*max HP/);
    expect(info('all_in').lines.join('\n')).toMatch(/Bet all your remaining MP/);
    expect(info('all_in').lines.join('\n')).toMatch((allInBet.loseMult ?? 1) <= 0 ? /you miss/ : new RegExp(`otherwise ${Math.round(Math.abs(1 - allInBet.loseMult!) * 100)}% ${allInBet.loseMult! >= 1 ? 'more' : 'less'} damage`));
    expect(info('card_trick').lines.join('\n')).toMatch(/Random effect/);
    expect(info('card_trick').targetBadge).toMatch(/Random/);
    for (const id of content.classes.gambler!.skills) {
      const i = info(id);
      expect(i.name.length).toBeGreaterThan(0);
      expect(i.lines.length).toBeGreaterThan(0);
    }
  });
});

describe('yapay zeka ve simülasyon', () => {
  it('YZ Gambler\'ı oynatır: her zaman geçerli hamle, hedef türleri ve bedeller yasalara uyar', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const b = new Battle(content.battleSetup('random-battle', seed, 'turns', { party: ['gambler', 'warrior', 'mage', 'archer', 'druid'], enemies: ['gambler', 'defender', 'paladin', 'undead', 'antimage'] }));
      for (let i = 0; i < 500 && !b.winner; i++) {
        const actor = b.currentUid!;
        const choice = chooseAction(b, actor, ai);
        const r = b.applyChoice(actor, choice);
        expect(r.ok, `seed ${seed} tur ${i}`).toBe(true);
      }
      expect(b.winner, `seed ${seed}`).not.toBeNull();
    }
  });

  it('YZ düşük canda can bahsi (High Stakes) oynamaz; yeterli canda oynayabilir', () => {
    const b = duel({ mode: 'turns' });
    // Gambler'ın sırasını bekle
    for (let i = 0; i < 200 && b.currentUid !== G; i++) b.skipTurn();
    const me = b.get(G)!;
    me.mp = me.maxMp;
    me.hp = Math.round(me.maxHp * 0.3);
    for (const e of b.living('enemy')) {
      e.hp = e.maxHp = 100000;
    }
    const low = chooseAction(b, G, ai);
    expect(low?.skillId).not.toBe('high_stakes');
  });

  it('YZ Gambler\'ın tüm skill\'lerini (denemelerde) kullanır', () => {
    const used = new Set<string>();
    const all = content.classes.gambler!.skills;
    // Hepsi görülünce dur (kanıt aynı: her skill en az bir kez seçildi); 80 deneme üst sınır.
    for (let seed = 1; seed <= 80 && !all.every((id) => used.has(id)); seed++) {
      const b = new Battle(content.battleSetup('random-battle', seed, 'turns', { party: ['gambler', 'warrior', 'mage', 'archer', 'druid'], enemies: ['gambler', 'defender', 'paladin', 'undead', 'antimage'] }));
      for (let i = 0; i < 500 && !b.winner; i++) {
        const actor = b.currentUid!;
        const c = b.get(actor)!;
        const choice = chooseAction(b, actor, ai);
        if (c.defId === 'gambler' && choice) used.add(choice.skillId);
        const r = b.applyChoice(actor, choice);
        expect(r.ok).toBe(true);
      }
    }
    for (const id of all) expect(used.has(id), id).toBe(true);
  });
});
