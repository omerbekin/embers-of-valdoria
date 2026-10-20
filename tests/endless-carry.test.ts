import { describe, expect, it } from 'vitest';
import { applySummonerScale, content } from '../src/engine';
import type { Battle } from '../src/engine';
import {
  ENDLESS,
  applyOutcome,
  chooseReward,
  battleFor,
  fightWave,
  newRun,
  outcomeFromBattle,
  parseRun,
  restoreBattle,
  battleHash,
  snapshotCarry,
  wavePlan,
  type EndlessRun,
} from '../src/endless';

// Endless sürekli akış (Ömer 2026-10-10, open-questions madde 300): dalga arası taşınan / sıfırlanan durum.

const PARTY = ['warrior', 'archer', 'mage', 'druid'];
const unitOf = (b: Battle, cls: string) => b.combatants.find((c) => c.side === 'party' && c.defId === cls && !c.summoned)!;

/** 1. dalgayı kazanan bir koşu + bitmiş savaş (seed taranır). */
function wonWave1(): { run: EndlessRun; battle: Battle; plan: ReturnType<typeof wavePlan> } {
  for (let seed = 1; seed < 40; seed++) {
    const run = newRun(seed, PARTY, '2026-10-10T00:00:00.000Z');
    const plan = wavePlan(run);
    const battle = fightWave(plan);
    if (battle.winner === 'party' && battle.combatants.filter((c) => c.side === 'party' && !c.summoned).every((c) => c.hp > 0)) return { run, battle, plan };
  }
  throw new Error('no clean wave-1 win');
}

describe('Endless sürekli akış: dalga arası taşıma', () => {
  it('buff, Rage ve kalkan taşınır; debuff silinir; MP her dalgada dolu (hp-death-rework 2026-10-19)', () => {
    const { run, battle, plan } = wonWave1();
    const w = unitOf(battle, 'warrior');
    const m = unitOf(battle, 'mage');
    w.statuses = [
      { kind: 'haste', turns: 2, source: m.uid },
      { kind: 'slow', turns: 3, source: 'enemy-0' },
    ];
    w.rage = 17;
    w.shield = 9;
    m.mp = Math.round(m.maxMp * 0.3);
    const out = outcomeFromBattle(plan, battle);
    const next = applyOutcome(run, plan, out);
    const hw = next.heroes.find((h) => h.class === 'warrior')!;
    expect(hw.carry?.statuses?.map((s) => s.kind)).toEqual(['haste']); // debuff silindi
    expect(hw.carry?.statuses?.[0]!.source).toBe(`h:${next.heroes.find((h) => h.class === 'mage')!.id}`);
    expect(hw.carry?.rage).toBe(17);
    expect(hw.carry?.shield).toBe(9);
    const hm = next.heroes.find((h) => h.class === 'mage')!;
    expect(ENDLESS.carry.mp).toBe('full');
    expect(hm.carry?.mpRatio).toBeUndefined();
    // Sonraki dalganın savaşı bu durumla kurulur (kaynak uid'si yeni savaşın büyücüsüne eşlenir)
    const b2 = battleFor(wavePlan({ ...next, phase: 'ready' }));
    const w2 = unitOf(b2, 'warrior');
    const m2 = unitOf(b2, 'mage');
    // süre taşınır (2); yeni savaşın ilk turu savaşçınınsa kuruluşta 1 düşmüş olabilir (sıra seed'e ve hızlara bağlı; 2026-10-17)
    expect(w2.statuses.map((s) => ({ kind: s.kind, source: s.source }))).toEqual([{ kind: 'haste', source: m2.uid }]);
    expect(w2.statuses[0]!.turns).toBeGreaterThanOrEqual(1);
    expect(w2.statuses[0]!.turns).toBeLessThanOrEqual(2);
    expect(w2.rage).toBe(17);
    expect(w2.shield).toBe(9);
    expect(m2.mp).toBe(m2.maxMp);
    // eski kayıttaki MP oranı yok sayılır
    const stale = { ...next, phase: 'ready' as const, heroes: next.heroes.map((h) => (h.class === 'mage' ? { ...h, carry: { ...(h.carry ?? {}), mpRatio: 0.2 } } : h)) };
    expect(wavePlan(stale).units.party[wavePlan(stale).party.indexOf('mage')]?.startMpRatio).toBeUndefined();
  });

  it('düşen kahraman yaralı kalkar; 3 yaralıysa CESET (Revive kartı yok); boss şifası kaldırmaz; ceset sonraki savaşta geçerli', () => {
    const { run: run0, battle, plan } = wonWave1();
    const a = unitOf(battle, 'archer');
    a.hp = 0;
    a.statuses = [{ kind: 'haste', turns: 2, source: a.uid }];
    // yarasız: %10 canla 1 yara, taşınan durum yok
    const rose = applyOutcome(run0, plan, outcomeFromBattle(plan, battle)).heroes.find((h) => h.class === 'archer')!;
    expect(rose).toMatchObject({ hpRatio: ENDLESS.carry.wounds!.riseRatio, wounds: 1 });
    expect(rose.carry).toBeUndefined();
    // 3 yaralı: ceset
    const run = { ...run0, heroes: run0.heroes.map((h) => (h.class === 'archer' ? { ...h, wounds: ENDLESS.carry.wounds!.lethal } : h)) };
    const next = applyOutcome(run, plan, outcomeFromBattle(plan, battle));
    const ha = next.heroes.find((h) => h.class === 'archer')!;
    expect(ha.hpRatio).toBe(0);
    expect(ha.wounds).toBe(ENDLESS.carry.wounds!.lethal);
    expect(ha.carry).toBeUndefined();
    expect(next.offer!.some((c) => c.kind === 'revive')).toBe(false); // rewards.reviveCard false
    // sonraki savaşta ceset (can 0, diriltilebilir), sırası yok
    const ready = { ...next, phase: 'ready' as const, offer: undefined };
    const b2 = battleFor(wavePlan(ready));
    const a2 = unitOf(b2, 'archer');
    expect(a2.hp).toBe(0);
    expect(b2.corpseOf(a2.uid)?.state).toBe('revivable');
    expect(b2.currentUid).not.toBe(a2.uid);
    // Şifa kartı ceseti kaldırmaz
    const healIdx = next.offer!.findIndex((c) => c.kind === 'heal');
    expect(chooseReward(next, healIdx).heroes.find((h) => h.class === 'archer')!.hpRatio).toBe(0);
    // Boss zaferi: yaşayanlar tam, ceset ceset
    const after = applyOutcome({ ...run, wave: ENDLESS.bossEvery }, { ...plan, wave: ENDLESS.bossEvery }, outcomeFromBattle(plan, battle));
    for (const h of after.heroes) expect(h.hpRatio).toBe(h.class === 'archer' ? 0 : 1);
    // 'rise' = eski kural
    const old = applyOutcome(run, plan, outcomeFromBattle(plan, battle), { ...ENDLESS, carry: { ...ENDLESS.carry, fallen: 'rise' } });
    expect(old.heroes.find((h) => h.class === 'archer')!.hpRatio).toBe(ENDLESS.carry.reviveRatio);
    expect(old.offer!.some((c) => c.kind === 'revive')).toBe(false);
  });

  it("cooldown'lar: 'carry' (varsayılan) kaldığı yerden; 'clear' sıfır; 'initial' savaş başı gibi", () => {
    const { run, battle, plan } = wonWave1();
    const w = unitOf(battle, 'warrior');
    const sk = w.skills[1]!;
    w.cooldowns = { [sk]: 2 };
    const next = { ...applyOutcome(run, plan, outcomeFromBattle(plan, battle)), phase: 'ready' as const, offer: undefined };
    expect(next.heroes.find((h) => h.class === 'warrior')!.carry?.cooldowns).toEqual({ [sk]: 2 });
    const cds = (cfg = ENDLESS) => unitOf(battleFor(wavePlan(next, cfg)), 'warrior').cooldowns;
    expect(cds()).toEqual({ [sk]: 2 }); // başlangıç cooldown'u yeniden yok, taşınan aynen
    expect(cds({ ...ENDLESS, carry: { ...ENDLESS.carry, cooldowns: 'clear' } })).toEqual({});
    const first = unitOf(battleFor(wavePlan(run)), 'warrior').cooldowns; // 1. dalga = savaş başı
    expect(cds({ ...ENDLESS, carry: { ...ENDLESS.carry, cooldowns: 'initial' } })).toEqual(first);
  });

  it('çağrılar taşınır: hücre, sahip, can, ömür, beslenme; kahraman uid sırası çağrıyla bozulmaz', () => {
    const base = newRun(5, PARTY, '2026-10-10T00:00:00.000Z');
    const owner = base.heroes.find((h) => h.class === 'druid')!;
    const used = new Set(base.heroes.map((h) => h.slot));
    const cell = [...Array(12).keys()].find((c) => !used.has(c))!;
    const run: EndlessRun = { ...base, wave: 2, summons: [{ unit: 'skeleton', slot: cell, owner: owner.id, hp: 20, lifespan: 3, empowered: true, statuses: [{ kind: 'haste', turns: 2, source: `h:${owner.id}` }] }] };
    const plan = wavePlan(run);
    expect(plan.heroOrder.filter((x) => x === '')).toHaveLength(1);
    const b = battleFor(plan);
    const sk = b.combatants.find((c) => c.summoned && c.side === 'party')!;
    const dr = unitOf(b, 'druid');
    expect(sk.slot).toBe(cell);
    // Skeleton hızı 17 (Ömer 2026-10-18): kurulumda ilk sıra ona gelebilir; o zaman tur başı can yenilenmesini (yuvarlanmış) çoktan almıştır
    const firstUp = b.currentUid === sk.uid;
    expect(sk.hp).toBe(firstUp ? Math.min(sk.maxHp, 20 + Math.round(sk.stats.hpRegen)) : 20);
    expect(sk.owner).toBe(dr.uid);
    expect(sk.lifespan).toBe(3);
    expect(sk.empowered).toBe(true);
    // beslenmiş varyant (mult 1); çağrı yeniden tasarımı (2026-10-18): can sahibinin (bu savaştaki Druid) STR'sinden yeniden türer
    expect(sk.maxHp).toBe(applySummonerScale(content.summons.skeleton!, dr.stats.summonBase ?? dr.stats, content.formulas).stats.hp);
    expect(sk.maxHp).not.toBe(content.summons.skeleton!.stats.hp); // Druid STR 22 != Undead STR 26
    // ilk sıra Skeleton'daysa tur başında süre 1 azalmıştır (Haste 2 tur taşınır: kaynak eşlemesi her iki durumda da görünür)
    expect(sk.statuses).toEqual([{ kind: 'haste', turns: firstUp ? 1 : 2, source: dr.uid }]);
    // Sonuç eşlemesi: çağrı kahraman sayılmaz, kahramanlar doğru id'lerle
    const snap = snapshotCarry(b, plan.heroOrder);
    expect(Object.keys(snap.heroes).sort()).toEqual(run.heroes.map((h) => h.id).sort());
    expect(snap.summons).toMatchObject([{ unit: 'skeleton', slot: cell, owner: owner.id, hp: sk.hp, lifespan: 3, empowered: true }]);
  });

  it('kayıt sürüm 3: ara verme durumu aynen döner; sürüm 2 göçü taşınanı ve yarım savaşı siler', () => {
    const { run, battle, plan } = wonWave1();
    unitOf(battle, 'warrior').rage = 12;
    const next = applyOutcome(run, plan, outcomeFromBattle(plan, battle));
    const back = parseRun(JSON.stringify({ version: 3, run: next }))!;
    expect(back.heroes).toEqual(next.heroes);
    expect(back.phase).toBe(next.phase);
    // Ceset kayıtta kalır (can 0 + tüketildi bilgisi)
    const dead = { ...next, heroes: next.heroes.map((h, i) => (i === 0 ? { ...h, hpRatio: 0, carry: { corpse: 'consumed' as const } } : h)) };
    const back2 = parseRun(JSON.stringify({ version: 3, run: dead }))!;
    expect(back2.heroes[0]).toMatchObject({ hpRatio: 0, carry: { corpse: 'consumed' } });
    const old = parseRun(JSON.stringify({ version: 2, run: { ...next, suspended: { wave: 2, seed: 1, actions: [], turn: 0, hash: 'x' } } }))!;
    expect(old.heroes.every((h) => h.carry === undefined)).toBe(true);
    expect(old.suspended).toBeUndefined();
  });

  it('yarım savaş (dalga 2, taşınan durumla) eylem günlüğünden birebir döner', () => {
    const { run, battle, plan } = wonWave1();
    unitOf(battle, 'warrior').rage = 20;
    const ready = { ...applyOutcome(run, plan, outcomeFromBattle(plan, battle)), phase: 'ready' as const, offer: undefined };
    const p2 = wavePlan(ready);
    const b = battleFor(p2);
    const actions: Array<{ k: 'skip' }> = [];
    for (let i = 0; i < 3 && !b.winner; i++) if (b.skipTurn().ok) actions.push({ k: 'skip' });
    const susp = { wave: p2.wave, seed: p2.seed, actions, turn: b.turnsTaken, hash: battleHash(b) };
    expect(restoreBattle(battleFor(wavePlan(ready)), susp)).toBe(true);
  });
});
