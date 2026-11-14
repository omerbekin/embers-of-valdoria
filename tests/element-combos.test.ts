/**
 * Element kombinasyonları (Ömer onaylı 2026-11-09, element formu; kademe kuralı "Yukarı birleşir, aşağı çözülür", docs/design/combat.md).
 * Sayılar veriden: data/grounds.json > reactions (cleansed_water, blood_curse, black_flame, grave_frost, cursed_water, bloody_water, frost_venom,
 * tainted_blood, steam, flash_freeze, brittle, chilled_venom, jolted_venom, jolted_flame, wet_venom), data/statuses.json (unhallowed,
 * blood_cursed, frozen.thawsInto).
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice } from '../src/engine';
import type { BattleEvent, Combatant, Status } from '../src/engine';

const R = content.groundReactions;
const S = content.statuses;
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
type Priv = {
  addStatus(t: unknown, s: Status, emit: unknown, cause?: string): void;
  applyHit(a: unknown, t: unknown, amount: number, type: 'physical' | 'magic', crit: boolean, emit: unknown, redirected: boolean, meta: unknown): number;
  debugEmit: unknown;
};
const mk = (mode: 'turns' | 'test' = 'turns', units?: Record<number, { tier: 'boss' }>) => {
  const b = new Battle(content.battleSetup('random-battle', 7, mode, { party: cells({ 0: 'mage', 1: 'paladin' }), enemies: cells({ 0: 'warrior', 1: 'warrior', 3: 'warrior', 4: 'warrior' }), ...(units ? { units: { enemies: units } } : {}) }, false));
  for (const c of b.combatants) Object.assign(c.stats, { critChance: 0, armor: 0, magicArmor: 0, resilience: 0, evasion: 0 });
  return b;
};
const priv = (b: Battle) => b as unknown as Priv;
const give = (b: Battle, uid: string, kind: string, amount?: number, by = 'party-0', turns = 3, origin?: 'skill') =>
  priv(b).addStatus(b.get(uid)!, { kind: kind as Status['kind'], turns, source: by, ...(amount !== undefined ? { amount } : {}), ...(origin ? { origin } : {}) }, priv(b).debugEmit);
/** Skill atışı gibi (origin 'skill'): Chilled'ın dondurma kuralı yalnız atışta işler. */
const shot = (b: Battle, uid: string, kind: string) => give(b, uid, kind, undefined, 'party-0', 2, 'skill');
const has = (b: Battle, uid: string, kind: string) => b.get(uid)!.statuses.some((s) => s.kind === kind);
const st = (b: Battle, uid: string, kind: string) => b.get(uid)!.statuses.find((s) => s.kind === kind);
const reacted = (b: Battle, id: string) => b.log.some((e) => e.type === 'groundReaction' && e.reaction === id);
const dmgOf = (b: Battle, reaction: string) => b.log.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.reaction === reaction);
const groundAt = (b: Battle, ground: string, slot: number, board: 'party' | 'enemy' = 'enemy') => b.ground.some((g) => g.ground === ground && g.board === board && g.slots.includes(slot));
const place = (b: Battle, ground: string, slots: number[], by = 'party-0', board: 'party' | 'enemy' = 'enemy') => expect(b.debugPlaceGround(by, ground, board, slots).ok).toBe(true);
const MODES = ['turns', 'test'] as const;

describe('element formu: veri', () => {
  it('Unhallowed %35, Blood Cursed %70 şifa kesintisi; Frozen ateşle Soaked bırakır', () => {
    expect(S['unhallowed']!.healTakenMult).toBe(0.65);
    expect(S['unhallowed']!.text).toContain('35%');
    expect(S['blood_cursed']!.healTakenMult).toBe(0.3);
    expect(S['frozen']!.thawsInto?.status).toBe('soaked');
    for (const id of ['blood_curse', 'black_flame', 'grave_frost', 'bloody_water', 'rot']) expect(content.grounds[id], id).toBeTruthy();
  });

  it('etkisiz çiftler (Ömer 2026-11-09): ateş + kan ve zehir + şimşek tepkime kurmaz', () => {
    for (const d of Object.values(R)) {
      expect(d.trigger.includes('lightning') && d.setup.includes('poison')).toBe(false);
      expect((d.setup.includes('blood') && d.trigger.includes('burning')) || (d.setup.includes('burning') && d.trigger.includes('blood'))).toBe(false);
      expect(!!(d.unitSetup?.includes('poisoned') && d.unitTrigger?.includes('shocked') && d.setup.length)).toBe(false); // yalnız birim üstü tik (Jolted venom), zemin çifti yok
    }
    expect(R.spark_blaze!.setup).toEqual(['burning']); // ateş + şimşek artık boş değil
    expect(R.rot!.setup.includes('cursed_ground') && R.rot!.trigger.includes('poison') && R.rot!.either).toBe(true); // zehir + lanet = Rot (boş değil)
  });
});

describe('element formu: zemin tepkimeleri', () => {
  it('kan + lanet = Blood Curse: içindeki düşman Blood Cursed (şifa çarpanı veriden); iki sıra, iki mod', () => {
    for (const mode of MODES)
      for (const [a, c] of [['blood', 'cursed_ground'], ['cursed_ground', 'blood']] as const) {
        const b = mk(mode);
        place(b, a, [0]);
        place(b, c, [0]);
        expect(reacted(b, 'blood_curse'), `${mode} ${a}`).toBe(true);
        expect(groundAt(b, 'blood_curse', 0)).toBe(true);
        expect(groundAt(b, 'blood', 0) || groundAt(b, 'cursed_ground', 0)).toBe(false);
        expect(has(b, 'enemy-0', 'blood_cursed')).toBe(true);
        expect(has(b, 'enemy-0', 'soaked')).toBe(false); // T2: ıslatmaz
      }
  });

  it('Holy Water + lanet birbirini iptal eder (ikisi de kalkar)', () => {
    const b = mk();
    place(b, 'holy_water', [0]);
    place(b, 'cursed_ground', [0]);
    expect(reacted(b, 'cleansed_water')).toBe(true);
    expect(groundAt(b, 'holy_water', 0) || groundAt(b, 'cursed_ground', 0)).toBe(false);
  });

  it('zehir + lanet = Rot (iki sıra, iki mod): tek zemin, Poisoned (tik Poison gücünün formulas.rot.poisonMult katı) + Unhallowed', () => {
    const mult = content.formulas.rot!.poisonMult;
    for (const mode of MODES)
      for (const order of [['cursed_ground', 'poison'], ['poison', 'cursed_ground']] as const) {
        const ref = mk(mode);
        place(ref, 'poison', [0]);
        const plain = st(ref, 'enemy-0', 'poisoned')!.amount!;
        const b = mk(mode);
        place(b, order[0], [0]);
        place(b, order[1], [0]);
        expect(reacted(b, 'rot'), `${mode} ${order[0]}`).toBe(true);
        expect(groundAt(b, 'rot', 0)).toBe(true);
        expect(groundAt(b, 'poison', 0) || groundAt(b, 'cursed_ground', 0)).toBe(false);
        expect(has(b, 'enemy-0', 'unhallowed')).toBe(true);
        expect(st(b, 'enemy-0', 'poisoned')!.amount).toBe(Math.round(plain * mult));
      }
  });

  it('ateş + lanet = Black Flame (Burning + Unhallowed); Chill + lanet = Grave Frost (Chilled + Unhallowed)', () => {
    for (const mode of MODES) {
      const b = mk(mode);
      place(b, 'cursed_ground', [0, 1]);
      place(b, 'burning', [0]);
      place(b, 'storm', [1]);
      expect(groundAt(b, 'black_flame', 0)).toBe(true);
      expect(groundAt(b, 'grave_frost', 1)).toBe(true);
      expect(has(b, 'enemy-0', 'burning') && has(b, 'enemy-0', 'unhallowed'), mode).toBe(true);
      expect(has(b, 'enemy-1', 'chilled') && has(b, 'enemy-1', 'unhallowed'), mode).toBe(true);
      expect((st(b, 'enemy-0', 'burning')!.amount ?? 0)).toBeGreaterThan(0); // gücü Burning Ground'dan
    }
  });

  it('su + kan = Bloody Water: su gibi Soaked + Bleeding (tutar = tahta ortalama maks can x hpRatio)', () => {
    const b = mk();
    place(b, 'flooded', [0]);
    place(b, 'blood', [0]);
    expect(groundAt(b, 'bloody_water', 0)).toBe(true);
    expect(has(b, 'enemy-0', 'soaked')).toBe(true);
    const bleed = st(b, 'enemy-0', 'bleeding')!;
    expect(bleed.amount).toBe(Math.max(1, Math.round(b.boardMeanHp('enemy') * R.bloody_water!.becomes!.hpRatio!)));
  });

  it('su + lanet: lanet ortak sıvı kuralıyla bitişik hücrelere taşar (3 hücrelik su -> liquidSpreadCount(3)), su kalır', () => {
    const b = mk();
    place(b, 'flooded', [0, 1, 2]);
    place(b, 'cursed_ground', [0]);
    expect(reacted(b, 'cursed_water')).toBe(true);
    const cursed = new Set(b.ground.filter((g) => g.ground === 'cursed_ground' && g.board === 'enemy').flatMap((g) => g.slots));
    expect(cursed.size).toBe(1 + b.liquidSpreadCount(3));
    for (const s of cursed) if (s !== 0) expect(b.touchingSlots([0]).includes(s)).toBe(true);
    for (const s of [0, 1, 2]) expect(groundAt(b, 'flooded', s)).toBe(true);
  });

  it('zehir + Chill Ground = Ice; içindeki Chilled (süre veriden) + bir zehir tiki', () => {
    for (const mode of MODES)
      for (const [a, c] of [['poison', 'storm'], ['storm', 'poison']] as const) {
        const b = mk(mode);
        place(b, a, [0]);
        place(b, c, [0]);
        expect(reacted(b, 'frost_venom'), `${mode} ${a}`).toBe(true);
        expect(groundAt(b, 'ice_ground', 0)).toBe(true);
        expect(groundAt(b, 'poison', 0) || groundAt(b, 'storm', 0)).toBe(false);
        expect(has(b, 'enemy-0', 'chilled')).toBe(true);
        expect(dmgOf(b, 'frost_venom').some((d) => d.target === 'enemy-0' && d.element === 'nature')).toBe(true);
      }
  });

  it('zehir + kan: bağlı kan zehre döner, alanın %33ü (en az 1) bitişik rastgele hücreye taşar; seed belirleyici', () => {
    const run = () => {
      const b = mk('test');
      place(b, 'blood', [0, 1]);
      place(b, 'poison', [0]);
      return b;
    };
    const b = run();
    expect(reacted(b, 'tainted_blood')).toBe(true);
    expect(groundAt(b, 'blood', 0) || groundAt(b, 'blood', 1)).toBe(false);
    const poisonCells = new Set(b.ground.filter((g) => g.ground === 'poison' && g.board === 'enemy').flatMap((g) => g.slots));
    expect(poisonCells.has(0) && poisonCells.has(1)).toBe(true);
    const extra = [...poisonCells].filter((s) => s !== 0 && s !== 1);
    expect(extra).toHaveLength(b.liquidSpreadCount(2));
    for (const s of extra) expect(b.touchingSlots([0, 1]).includes(s)).toBe(true);
    const again = run();
    expect(new Set(again.ground.filter((g) => g.ground === 'poison' && g.board === 'enemy').flatMap((g) => g.slots))).toEqual(poisonCells);
  });
});

describe('element formu: birim üstü', () => {
  it('Frozen + ateş hasarı: Frozen kalkar, birim Soaked (süre veriden)', () => {
    for (const mode of MODES) {
      const b = mk(mode);
      give(b, 'enemy-0', 'frozen', undefined, 'party-0', 1);
      expect(has(b, 'enemy-0', 'frozen')).toBe(true);
      priv(b).applyHit(b.get('party-0'), b.get('enemy-0'), 5, 'magic', false, priv(b).debugEmit, false, { origin: 'skill', element: 'fire', damageType: 'magic' });
      expect(has(b, 'enemy-0', 'frozen'), mode).toBe(false);
      expect(st(b, 'enemy-0', 'soaked')?.turns).toBe(S['frozen']!.thawsInto!.turns);
    }
  });

  it('Soaked + Burning = Steam: Soaked kalkar, Burning tutmaz', () => {
    const b = mk();
    give(b, 'enemy-0', 'soaked');
    give(b, 'enemy-0', 'burning', 20);
    expect(reacted(b, 'steam')).toBe(true);
    expect(has(b, 'enemy-0', 'soaked') || has(b, 'enemy-0', 'burning')).toBe(false);
  });

  it('Soaked + Chilled = Frozen (iki sıra); boss donmaz ve Soaked kalır', () => {
    for (const mode of MODES)
      for (const [a, c] of [['soaked', 'chilled'], ['chilled', 'soaked']] as const) {
        const b = mk(mode);
        if (a === 'chilled') shot(b, 'enemy-0', a);
        else give(b, 'enemy-0', a);
        if (c === 'chilled') shot(b, 'enemy-0', c);
        else give(b, 'enemy-0', c);
        expect(has(b, 'enemy-0', 'frozen'), `${mode} ${a}`).toBe(true);
        expect(has(b, 'enemy-0', 'soaked') || has(b, 'enemy-0', 'chilled')).toBe(false);
      }
    // Kaynaksız (pasif / zemin / hava; Hoarfrost) Chilled Soaked birimi dondurmaz
    const pas = mk();
    give(pas, 'enemy-0', 'soaked');
    give(pas, 'enemy-0', 'chilled');
    expect(has(pas, 'enemy-0', 'frozen')).toBe(false);
    const boss = mk('turns', { 0: { tier: 'boss' } });
    give(boss, 'enemy-0', 'soaked');
    shot(boss, 'enemy-0', 'chilled');
    expect(has(boss, 'enemy-0', 'frozen')).toBe(false);
    expect(reacted(boss, 'flash_freeze')).toBe(false);
    expect(has(boss, 'enemy-0', 'soaked')).toBe(true);
  });

  it('Chilled + Shocked = Brittle: 1 tur Shredded, Armor eksiği = taban Armor x oran', () => {
    const b = mk();
    const t = b.get('enemy-0')!;
    t.stats.armor = 50;
    give(b, 'enemy-0', 'chilled');
    expect(b.debugBolt('enemy-0').ok).toBe(true);
    expect(reacted(b, 'brittle')).toBe(true);
    const sh = st(b, 'enemy-0', 'shredded')!;
    expect(sh.turns).toBe(R.brittle!.status!.turns);
    expect(sh.amount).toBe(Math.round(50 * R.brittle!.status!.armorRatio!));
  });

  it('Poisoned + Chilled: zehir süresi +1 (iki sıra)', () => {
    const b = mk();
    give(b, 'enemy-0', 'poisoned', 10, 'party-0', 3);
    give(b, 'enemy-0', 'chilled');
    expect(st(b, 'enemy-0', 'poisoned')!.turns).toBe(3 + R.chilled_venom!.extend!.turns);
    const b2 = mk();
    give(b2, 'enemy-0', 'chilled');
    give(b2, 'enemy-0', 'poisoned', 10, 'party-0', 3);
    expect(st(b2, 'enemy-0', 'poisoned')!.turns).toBe(3 + R.chilled_venom!.extend!.turns);
  });

  it('Shocked: Poisoned ve Burning birer tik anında atar (ikisi birden de)', () => {
    const b = mk();
    give(b, 'enemy-0', 'poisoned', 12);
    give(b, 'enemy-3', 'burning', 15);
    b.debugBolt('enemy-0');
    b.debugBolt('enemy-3');
    const v = dmgOf(b, 'jolted_venom').find((d) => d.target === 'enemy-0')!;
    expect(v.amount + v.absorbed).toBe(b.tickDamage('nature', 'magic', 12, b.get('enemy-0')!));
    const f = dmgOf(b, 'jolted_flame').find((d) => d.target === 'enemy-3')!;
    expect(f.amount + f.absorbed).toBe(b.tickDamage('fire', 'magic', 15, b.get('enemy-3')!));
    // Burning'li başka birim: şimşek tek başına Jolted flame kurar
    const c = mk();
    give(c, 'enemy-2', 'burning', 15);
    c.debugBolt('enemy-2');
    expect(reacted(c, 'jolted_flame')).toBe(true);
  });

  it('Soaked + Poisoned: komşu Soaked düşmanlar 1 tur Poisoned; Soaked olmayan komşu almaz; zincirlemez', () => {
    for (const mode of MODES) {
      const b = mk(mode);
      // uid'ler: enemy-0 yuva 0, enemy-1 yuva 1, enemy-2 yuva 3, enemy-3 yuva 4
      give(b, 'enemy-1', 'soaked');
      give(b, 'enemy-3', 'soaked'); // yuva 4: enemy-1'in komşusu, enemy-0'ın değil (zincir olsaydı alırdı)
      give(b, 'enemy-0', 'soaked');
      give(b, 'enemy-0', 'poisoned', 9);
      expect(reacted(b, 'wet_venom'), mode).toBe(true);
      const p1 = st(b, 'enemy-1', 'poisoned')!;
      expect(p1.turns).toBe(R.wet_venom!.spreadStatus!.turns);
      expect(p1.amount).toBe(9);
      expect(has(b, 'enemy-2', 'poisoned')).toBe(false); // yuva 3: komşu ama Soaked değil
      expect(has(b, 'enemy-3', 'poisoned')).toBe(false); // zincir yok
    }
  });
});

describe('element formu: yapay zeka', () => {
  const ai = (soaked: boolean) => {
    const b = mk('test');
    for (const c of b.combatants) {
      c.hp = c.maxHp = 5000;
      c.mp = c.maxMp;
    }
    const me: Combatant = b.get('party-0')!;
    me.skills = ['ice_crater'];
    b.debugClearCooldowns();
    if (soaked) give(b, 'enemy-0', 'soaked');
    const ex = explainChoice(b, 'party-0', { ...content.aiConfig, global: undefined })!;
    return ex.candidates.find((c) => c.skill === 'ice_crater' && !!c.target?.startsWith('E0'));
  };
  it('Soaked düşmana Chilled veren skill Flash freeze değerini görür (reaction terimi, not satırı)', () => {
    const wet = ai(true)!;
    const dry = ai(false)!;
    expect(wet).toBeTruthy();
    expect(wet.terms?.reaction ?? 0).toBeGreaterThan(dry.terms?.reaction ?? 0);
    expect((wet.notes ?? []).some((n) => n.startsWith(R.flash_freeze!.label))).toBe(true);
  });
  it('YZ: lanetli düşman hücresine zehir zemini Rot değerini görür (reaction terimi artı, not satırı)', () => {
    const b = mk('test');
    for (const c of b.combatants) {
      c.hp = c.maxHp = 5000;
      c.mp = c.maxMp;
    }
    b.get('party-0')!.skills = ['tainted_bait'];
    b.debugClearCooldowns();
    place(b, 'cursed_ground', [0]);
    const ex = explainChoice(b, 'party-0', { ...content.aiConfig, global: undefined })!;
    const c = ex.candidates.find((x) => x.skill === 'tainted_bait' && !!x.target?.startsWith('E0'))!;
    expect(c).toBeTruthy();
    expect(c.terms?.reaction ?? 0).toBeGreaterThan(0);
    expect((c.notes ?? []).some((n) => n.startsWith(R.rot!.label))).toBe(true);
  });
});

describe('ikinci element formu (Ömer 2026-11-09)', () => {
  const into = content.formulas.thunder.wetInto!;
  it('Electrocuted: Soaked birime şimşek Shocked / Stun yerine Electrocuted; temel saldırıyla kendi dostuna vurur, sıra çubuğu 0; iki mod', () => {
    expect(into).toBe('electrocuted');
    expect(S[into]!.cc).toBe(true);
    for (const mode of MODES) {
      const b = mk(mode);
      const t = b.get('enemy-0')!;
      t.turnCounter = 50;
      give(b, 'enemy-0', 'soaked');
      b.debugBolt('enemy-0');
      expect(has(b, 'enemy-0', into), mode).toBe(true);
      expect(has(b, 'enemy-0', 'stun')).toBe(false);
      expect(has(b, 'enemy-0', 'shocked')).toBe(false);
      const friendly = b.log.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.source === 'enemy-0');
      expect(friendly.length, mode).toBeGreaterThan(0);
      expect(friendly.every((d) => d.target.startsWith('enemy') && d.target !== 'enemy-0')).toBe(true);
      expect(t.turnCounter).toBe(0);
    }
  });

  it('Electrocuted: kanda ve Healing Rain\'de duran da çarpılır; boss bağışık (saldırı yok)', () => {
    for (const g of ['blood', 'healing_rain']) {
      const b = mk();
      place(b, g, [0], g === 'healing_rain' ? 'enemy-1' : 'party-0'); // Healing Rain: düşmanın kendi şifa suyu
      b.debugBolt('enemy-0');
      expect(has(b, 'enemy-0', into), g).toBe(true);
    }
    const boss = mk('turns', { 0: { tier: 'boss' } });
    give(boss, 'enemy-0', 'soaked');
    boss.debugBolt('enemy-0');
    expect(has(boss, 'enemy-0', into)).toBe(false);
    expect(boss.log.some((e) => e.type === 'damage' && e.source === 'enemy-0')).toBe(false);
  });

  it('Chill Ground + şimşek = Brittle frost (Shredded 1 tur); lanet + şimşek = Hexed spark (Jinxed 2 tur, Shocked yok)', () => {
    const b = mk();
    b.get('enemy-0')!.stats.armor = 40;
    place(b, 'storm', [0]);
    place(b, 'cursed_ground', [1]);
    b.debugBolt('enemy-0');
    b.debugBolt('enemy-1');
    expect(reacted(b, 'brittle_frost')).toBe(true);
    expect(st(b, 'enemy-0', 'shredded')?.turns).toBe(R.brittle_frost!.status!.turns);
    expect(reacted(b, 'hexed_spark')).toBe(true);
    expect(st(b, 'enemy-1', 'jinxed')?.turns).toBe(R.hexed_spark!.status!.turns);
    expect(has(b, 'enemy-1', 'shocked')).toBe(false);
    expect(groundAt(b, 'storm', 0) && groundAt(b, 'cursed_ground', 1)).toBe(true); // zeminler kalır
  });

  it('Spark blaze: şimşek yanan zemini ortak kuralla yayar (alan 1 hücre -> 1 bitişik hücre)', () => {
    const b = mk('test');
    place(b, 'burning', [0]);
    b.debugBolt('enemy-0');
    expect(reacted(b, 'spark_blaze')).toBe(true);
    const cellsNow = b.ground.filter((g) => g.ground === 'burning' && g.board === 'enemy').flatMap((g) => g.slots);
    expect(cellsNow).toHaveLength(1 + b.liquidSpreadCount(1));
    for (const s of cellsNow) expect(b.touchingSlots([0]).includes(s)).toBe(true);
  });

  it('zehir + su: ortak kural, artık bağlı tüm suya değil (3 hücrelik su -> 1 taşma)', () => {
    const b = mk('test');
    place(b, 'flooded', [0, 1, 2]);
    place(b, 'poison', [0]);
    expect(reacted(b, 'spread')).toBe(true);
    const cellsNow = new Set(b.ground.filter((g) => g.ground === 'poison' && g.board === 'enemy').flatMap((g) => g.slots));
    expect(cellsNow.size).toBe(1 + b.liquidSpreadCount(3));
  });

  it('Healing Rain su sayılır: lanet ona yayılır; lanetli Healing Rain kimseyi iyileştirmez', () => {
    const b = mk('test');
    place(b, 'healing_rain', [0], 'enemy-1');
    expect(has(b, 'enemy-0', 'hallowed')).toBe(true);
    place(b, 'cursed_ground', [0]);
    expect(reacted(b, 'cursed_water')).toBe(true);
    expect(has(b, 'enemy-0', 'hallowed')).toBe(false);
  });

  it('YZ: Soaked düşmana şimşek Electrocuted değeri (Stun değil) görür', () => {
    const b = mk('test');
    give(b, 'enemy-0', 'soaked');
    const out = b.boltOutcome(b.get('party-0')!, { id: 'x', thunder: { shocks: true } } as never, [{ board: 'enemy', cells: [0] }], [b.get('enemy-0')!]);
    expect(out.shocks.find((s) => s.uid === 'enemy-0')?.stun).toBe(true);
  });
});
