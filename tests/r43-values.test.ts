import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, explainChoice, type AiConfig, type BattleEvent, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';

// r43 (Ömer form r43): Reckless Heat seçim A, 3a kural kesimleri (Archer / Gambler / Mage / Hexer). Sayılar veriden okunur.
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const comp = (cls: string, r: Record<string, number>) => {
  const t = treeOf(cls)!;
  return compileTree(t, { v: t.version, r })!;
};
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: 'test' | 'turns' = 'test', enemyUnits: Record<number, UnitSetup> = {}): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: enemyUnits } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
const P = (b: Battle, cls: string): Combatant => b.combatants.find((c) => c.side === 'party' && c.defId === cls)!;
const E = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'enemy')!;
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
function untilTurn(b: Battle, c: Combatant, max = 40): void {
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
}
function cast(b: Battle, actor: Combatant, skill: string, target?: Combatant): BattleEvent[] {
  if (b.mode === 'turns') untilTurn(b, actor);
  const from = b.log.length;
  actor.cooldowns[skill] = 0;
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, skill, target?.uid);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const ai: AiConfig = { ...content.aiConfig, global: undefined };

describe('r43 madde 1: Reckless Heat (Stun geri, 30 Rage, kendine Fortified)', () => {
  const W = treeOf('warrior')!;

  it('Herald of Ruin ile birlikte: Charge Stun atar, Stun bitince Herald Rage iade eder', () => {
    const refund = (W.nodes['3.v']!.fx![1] as unknown as { do: Array<{ rage: number }> }).do[0]!.rage;
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { tree: comp('warrior', { '3.fb': 1, '3.v': 1 }) } }, 11, 'turns');
    const me = P(b, 'warrior');
    const d = E(b);
    d.hp = d.maxHp = 9999;
    d.stats = { ...d.stats, evasion: -5 };
    cast(b, me, 'charge', d);
    const st = d.statuses.find((s) => s.kind === 'stun');
    expect(st?.fromSkill).toBe('charge');
    expect(has(me, 'fortify')).toBe(true);
    me.rage = 0; // Reckless'ın 30 Rage'i + tavan (50) iadeyi gizlemesin
    let gained = 0;
    for (let i = 0; i < 8 && has(d, 'stun'); i++) {
      const r0 = me.rage ?? 0;
      expect(b.skipTurn().ok).toBe(true);
      gained += (me.rage ?? 0) - r0;
    }
    expect(has(d, 'stun')).toBe(false);
    expect(gained).toBeGreaterThanOrEqual(refund);
  });

  it('kontrol: Herald olmadan (yalnız Reckless) Stun bitince Rage iadesi yok', () => {
    const b = make({ 0: 'warrior' }, { 0: 'defender' }, { 0: { tree: comp('warrior', { '3.fb': 1 }) } }, 11, 'turns');
    const me = P(b, 'warrior');
    const d = E(b);
    d.hp = d.maxHp = 9999;
    d.stats = { ...d.stats, evasion: -5 };
    cast(b, me, 'charge', d);
    expect(has(d, 'stun')).toBe(true);
    me.rage = 0;
    const before = b.treeProcs().find((p) => p.node === 'warrior:3.v')?.count ?? 0;
    for (let i = 0; i < 8 && has(d, 'stun'); i++) expect(b.skipTurn().ok).toBe(true);
    expect(has(d, 'stun')).toBe(false);
    expect(before).toBe(0);
    expect(b.treeProcs().find((p) => p.node === 'warrior:3.v')?.count ?? 0).toBe(0);
  });

  it('tooltip: Charge satırları Stun ve ağaçtan "You gain Fortified for 2 turns" yazar', () => {
    const sk = comp('warrior', { '3.fb': 1 }).skills!['charge']!;
    const info = describeSkill(sk, content.classes.warrior!.stats, content.formulas, {}, { statuses: content.statuses });
    const turns = (W.nodes['3.fb']!.fx!.find((f) => (f as { k: string }).k === 'addEffect') as unknown as { effect: { turns: number } }).effect.turns;
    expect(info.lines.join(' | ')).toMatch(/Stunned|stun/i);
    expect((info.treeLines ?? []).join(' | ')).toContain(`You gain ${content.statuses['fortify']!.name} for ${turns} turns`);
  });

  it("YZ: Charge'ın kendine Fortified'ı değer alır (control terimi ağaçsızdan büyük; Stun her ikisinde)", () => {
    const control = (r: Record<string, number> | null) => {
      const b = make({ 1: 'warrior' }, { 1: 'mage', 4: 'archer' }, r ? { 1: { tree: comp('warrior', r) } } : {}, 3);
      b.debugClearCooldowns();
      const me = P(b, 'warrior');
      me.mp = me.maxMp;
      me.rage = me.maxRage!; // Rage terimi karışmasın
      return Math.max(0, ...explainChoice(b, me.uid, ai)!.candidates.filter((c) => c.skill === 'charge').map((c) => c.terms?.control ?? 0));
    };
    const plain = control(null);
    expect(plain).toBeGreaterThan(0); // taban Charge Stun'ı
    expect(control({ '3.fb': 1 })).toBeGreaterThan(plain);
  });
});

describe('r43 madde 2a: Archer zemin ömrü (Spent Arrows 1 tur, Choking Rain 3 tur)', () => {
  const A = treeOf('archer')!;
  const groundTurns = (r: Record<string, number>) => {
    const sk = comp('archer', r).skills!['arrow_rain']!;
    return (sk.effects.find((e) => e.type === 'ground' && e.ground === 'field_of_shafts') as { turns: number } | undefined)?.turns;
  };
  const spent = (A.nodes['3.ea']!.fx![0] as unknown as { effect: { turns: number } }).effect.turns;
  const choking = (A.nodes['3.fa']!.fx![0] as unknown as { v: number }).v;

  it('derlenen Arrow Rain zemini veriyle aynı; metinler sayıyı söyler', () => {
    expect(groundTurns({ '3.ea': 1 })).toBe(spent);
    expect(groundTurns({ '3.ea': 1, '3.fa': 1 })).toBe(choking);
    expect(A.nodes['3.ea']!.text).toContain(`for ${spent} turn${spent > 1 ? 's' : ''}`);
    expect(A.nodes['3.fa']!.text).toContain(`lasts ${choking} turns`);
  });

  for (const mode of ['turns', 'test'] as const) {
    it(`1 turluk zemin yine de düşmanı Hobble'lar (${mode})`, () => {
      const b = make({ 0: 'archer' }, { 0: 'mage' }, { 0: { tree: comp('archer', { '3.ea': 1 }) } }, 11, mode);
      const me = P(b, 'archer');
      const m = E(b);
      if (mode === 'turns') untilTurn(b, me);
      me.cooldowns['arrow_rain'] = 0;
      me.mp = me.maxMp;
      expect(b.useSkill(me.uid, 'arrow_rain', m.uid, 0, 'enemy').ok).toBe(true);
      expect(has(m, 'slow')).toBe(true);
      if (mode === 'turns') {
        untilTurn(b, m); // düşmanın kendi turu: 1 turluk zemin hâlâ Hobble'lı tutar
        expect(has(m, 'slow')).toBe(true);
      }
    });
  }
});

describe('r43 madde 2b: Double Deal rastgele ikinci durumu Stun olamaz', () => {
  const G = treeOf('gambler')!;
  const excl = (G.nodes['3.ma']!.fx![0] as unknown as { secondExclude: string[] }).secondExclude;
  const seconds = (r: Record<string, number>) => {
    const t = comp('gambler', r);
    const own = t.skills?.['card_trick'];
    const modes = t.modes?.['card_trick']?.list ?? [];
    const defs = [...modes.map((m) => m.skill), ...(own ? [own] : [])];
    return defs.flatMap((d) => d.effects.filter((e) => e.type === 'randomStatus' && e.treeNode === 'gambler:3.ma').flatMap((e) => (e as { options: Array<{ status: string }> }).options.map((o) => o.status)));
  };

  it('veri: Stun dışlanır; derleyici yanlış kullanımı reddeder', () => {
    expect(excl).toEqual(['stun']);
    expect(checkTreeFx(G)).toEqual([]);
    const bad = JSON.parse(JSON.stringify(G)) as TreeData;
    (bad.nodes['3.ma']!.fx![0] as unknown as { secondExclude: string[] }).secondExclude = ['not_a_status'];
    expect(checkTreeFx(bad).length).toBeGreaterThan(0);
  });

  it('Stacked Deck + Double Deal: hiçbir kartın ikinci durumu Stun değil; Stun kartı yine seçilebilir', () => {
    const list = seconds({ '3.ea': 1, '3.ma': 1 });
    expect(list.length).toBeGreaterThan(0);
    for (const s of excl) expect(list).not.toContain(s);
    const modes = comp('gambler', { '3.ea': 1, '3.ma': 1 }).modes!['card_trick']!.list;
    expect(modes.some((m) => m.status === 'stun')).toBe(true); // Stun yalnız oyuncu seçince
  });

  it('Cold Deck + Double Deal: sabit Stun, ikinci durum Stun değil', () => {
    const list = seconds({ '3.ea': 1, '3.ma': 1, '3.fa': 1 });
    expect(list.length).toBeGreaterThan(0);
    for (const s of excl) expect(list).not.toContain(s);
  });
});

describe('r43 madde 2c: Glacial Spike kesin kritiği yalnız Ice Crater ana hedefine', () => {
  const run = (r: Record<string, number>, mode: 'test' | 'turns') => {
    const b = make({ 0: 'mage' }, { 0: 'defender', 1: 'defender' }, { 0: { tree: comp('mage', r) } }, 11, mode);
    const me = P(b, 'mage');
    const [main, side] = [0, 1].map((s) => b.combatants.find((c) => c.side === 'enemy' && c.slot === s)!);
    me.stats = { ...me.stats, critChance: 0 }; // olağan kritik zarı tutmaz: kritik yalnız kesin kritikten
    b.debug.dodge = 'never';
    for (const c of [main!, side!]) {
      c.hp = c.maxHp = 99999;
      c.statuses.push({ kind: 'chilled', turns: 3, source: me.uid } as Combatant['statuses'][number]);
    }
    const evs = cast(b, me, 'ice_crater', main);
    const crit = (u: Combatant) => evs.filter((e) => e.type === 'damage' && e.source === me.uid && e.target === u.uid).map((e) => (e as { crit?: boolean }).crit === true);
    return { main: crit(main!), side: crit(side!) };
  };

  for (const mode of ['test', 'turns'] as const) {
    it(`Glacier Crater ile: Chilled ana hedef kesin kritik, Chilled yan hedef değil (${mode})`, () => {
      const r = run({ '3.ma': 1, '3.v': 1 }, mode);
      expect(r.main[0]).toBe(true);
      expect(r.side.length).toBeGreaterThan(0); // yan vuruş oldu
      expect(r.side.every((c) => !c)).toBe(true);
    });
  }

  it('Glacial Spike olmadan ana hedef de kritik değil (kontrol)', () => {
    expect(run({ '3.v': 1 }, 'test').main[0]).toBe(false);
  });

  it('önizleme: ana hedefe kesin kritik görünür', async () => {
    const { previewSkill } = await import('../src/engine');
    const b = make({ 0: 'mage' }, { 0: 'defender', 1: 'defender' }, { 0: { tree: comp('mage', { '3.ma': 1, '3.v': 1 }) } });
    const me = P(b, 'mage');
    const main = b.combatants.find((c) => c.side === 'enemy' && c.slot === 0)!;
    main.statuses.push({ kind: 'chilled', turns: 3, source: me.uid } as Combatant['statuses'][number]);
    const p = previewSkill(b, me.uid, 'ice_crater', main.uid).find((x) => x.uid === main.uid)!;
    expect((p.damage as { critChance?: number } | undefined)?.critChance).toBe(1);
  });
});

describe('r43 madde 2d: Woeful Turn aynı düşmanda art arda çalışmaz (cdTurns), boss\'ta çalışmaz', () => {
  const H = treeOf('hexer')!;
  const hook = H.nodes['3.ma']!.fx![0] as unknown as { cdTurns: number };
  const setup = (enemyUnits: Record<number, UnitSetup> = {}) => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior' }, { 0: { tree: comp('hexer', { '3.ma': 1 }) } }, 11, 'turns', enemyUnits);
    const me = P(b, 'hexer');
    const w = E(b);
    me.hp = me.maxHp = 99999;
    b.debug.miss = 'always';
    return { b, me, w };
  };
  /** Savaşçı sırası gelince (sersem turları kendiliğinden geçer) Jinx'li hâlde Hexer'e vurur ve ıskalar; Stun aldı mı. */
  const missOnce = (b: Battle, me: Combatant, w: Combatant): boolean => {
    untilTurn(b, w);
    w.statuses = w.statuses.filter((s) => s.kind !== 'jinxed');
    w.statuses.push({ kind: 'jinxed', turns: 5, source: me.uid } as Combatant['statuses'][number]);
    const evs = cast(b, w, 'melee_attack', me);
    expect(evs.some((e) => e.type === 'miss' || e.type === 'dodge')).toBe(true);
    return has(w, 'stun');
  };

  it('veri: bekleme 2 tur', () => {
    expect(hook.cdTurns).toBe(2);
  });

  it('ıska > Stun; Stun sonrası ilk ıska Stun vermez; ondan sonraki yine verir (turns)', () => {
    const { b, me, w } = setup();
    expect(missOnce(b, me, w)).toBe(true); // 1. ıska: sıra kaybı
    expect(missOnce(b, me, w)).toBe(false); // Stun turu geçti, hemen sonraki ıska: bekleme
    expect(missOnce(b, me, w)).toBe(true); // bekleme bitti
  });

  it('test modu: bekleme eylemle sayılır (art arda ikinci ıska tetiklemez)', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior' }, { 0: { tree: comp('hexer', { '3.ma': 1 }) } }, 11, 'test');
    const me = P(b, 'hexer');
    const w = E(b);
    me.hp = me.maxHp = 99999;
    b.debug.miss = 'always';
    const fires = () => b.treeProcs().find((p) => p.node === 'hexer:3.ma')?.count ?? 0;
    const swing = () => {
      w.statuses = w.statuses.filter((s) => s.kind !== 'jinxed' && s.kind !== 'stun');
      w.statuses.push({ kind: 'jinxed', turns: 5, source: me.uid } as Combatant['statuses'][number]);
      cast(b, w, 'melee_attack', me);
    };
    swing();
    expect(fires()).toBe(1);
    swing();
    expect(fires()).toBe(1);
    swing();
    expect(fires()).toBe(1); // eylem 2 ve 3: bekleme (2)
    swing();
    expect(fires()).toBe(2);
  });

  it("YZ tetik listesi (aiTriggers) de bekleme süresince Woeful Turn'ü görmez", () => {
    const { b, me, w } = setup();
    w.statuses.push({ kind: 'jinxed', turns: 5, source: me.uid } as Combatant['statuses'][number]);
    const live = () => b.aiTriggers(me, { on: 'enemyMissed', target: w, subject: me, source: w }).filter((t) => t.hook.node === 'hexer:3.ma').length;
    expect(live()).toBe(1);
    expect(missOnce(b, me, w)).toBe(true);
    w.statuses.push({ kind: 'jinxed', turns: 5, source: me.uid } as Combatant['statuses'][number]);
    expect(live()).toBe(0);
  });

  it("boss: Jinx'li sayılsa bile Woeful Turn sıra aldırmaz (CC bağışıklığı)", () => {
    const { b, me, w } = setup({ 0: { tier: 'boss' } as UnitSetup });
    expect(w.tier).toBe('boss');
    expect(missOnce(b, me, w)).toBe(false);
  });
});
