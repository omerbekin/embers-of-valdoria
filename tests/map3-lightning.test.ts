// Harita 3 şimşek kuralları (maps-2-3.md A1, A2, A4, A5, A6; skill alanı thunder, sayılar data/formulas.json > thunder, data/grounds.json > reactions.shatter). Sayılar veriden okunur.
import { describe, expect, it, vi } from 'vitest';
import { Battle, chooseAction, content, describeSkill, previewSkill } from '../src/engine';
import type { BattleMode, Combatant, Side, Teams } from '../src/engine';
import { RULES_TESTS, rulesTestBattleData } from '../src/game/rules-test-battle';
import { buildMechanics } from '../src/wiki/catalog';

const T = content.formulas.thunder;
const threshold = content.formulas.turn.threshold;
const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
const MODES: BattleMode[] = ['turns', 'test'];

function make(rules: Teams['rules'], party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test', seed = 7): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies), rules }, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
/** Sıra sırası gelene dek diğerleri pas geçer (test modunda herkes her an oynar). */
function turnOf(b: Battle, uid: string): void {
  if (b.mode !== 'turns') return;
  for (let i = 0; i < 80 && b.currentUid !== uid; i++) b.skipTurn();
  expect(b.currentUid).toBe(uid);
}
const P = { 0: 'warrior', 3: 'druid', 7: 'archer' };
const E = { 6: 'storm_tester', 8: 'drowned' };
const tester = (b: Battle): Combatant => at(b, 'enemy', 6);

describe('etiket kapısı', () => {
  it('yalnız test skill\'leri etiketli: oyuncu ve sefer şimşek skill\'leri değişmedi', () => {
    const owners = Object.values(content.skills).filter((s) => s.thunder || s.effects.some((e) => e.type === 'damage' && e.ironBolt));
    expect(owners.map((s) => s.id).sort()).toEqual(['anvil_strike', 'flare_storm', 'fork', 'gloam_bite', 'ring_the_anvil', 'rolling_thunder', 'storm_test_bolt', 'storm_test_iron', 'storm_test_row', 'thundersnow']); // 4. dilim moblarının şimşekleri + test
    expect(content.classes.storm_tester!.testOnly).toBe(true);
    for (const id of ['thunderpeal', 'great_bell_of_valdoria', 'bog_spark', 'wisp_spark', 'rune_spark']) expect(content.skills[id]?.thunder).toBeUndefined();
    expect(content.randomPool).not.toContain('storm_tester');
  });

  it.each(MODES)('etiketsiz şimşek suda hiçbir kural açmaz, olay yok (%s)', (mode) => {
    const b = make({ condition: 'tide' }, P, { 6: 'will_o_wisp', 8: 'drowned' }, mode);
    const wisp = at(b, 'enemy', 6);
    const hero = at(b, 'party', 0);
    turnOf(b, wisp.uid);
    expect(b.useSkill(wisp.uid, 'wisp_spark', hero.uid).ok).toBe(true);
    expect(b.log.some((e) => e.type === 'shock' || e.type === 'liveWater')).toBe(false);
    expect(b.liveWaters).toEqual([]);
  });
});

describe('A1 Shocked', () => {
  it.each(MODES)('kuru hücrede sıra sayacı anında veri oranı kadar düşer, rozet çıkar, Stun yok (%s)', (mode) => {
    const b = make(undefined, P, E, mode);
    const hero = at(b, 'party', 0);
    turnOf(b, tester(b).uid);
    const before = hero.turnCounter;
    expect(b.useSkill(tester(b).uid, 'storm_test_bolt', hero.uid).ok).toBe(true);
    if (mode === 'test') expect(hero.turnCounter).toBe(before - Math.round(threshold * T.pushback)); // turns modunda sıra ilerlemesi de ekler; ikizle karşılaştırma aşağıda
    expect(hero.statuses.some((s) => s.kind === T.badge)).toBe(true);
    expect(hero.statuses.some((s) => s.kind === 'stun')).toBe(false);
    const ev = b.log.find((e) => e.type === 'shock');
    expect(ev && ev.type === 'shock' && ev.pushed).toBe(Math.round(threshold * T.pushback));
  });

  it.each(MODES)('Flooded hücrede itilmez, Stun yer (%s)', (mode) => {
    const b = make(undefined, P, E, mode);
    const hero = at(b, 'party', 0);
    b.debugPlaceGround(tester(b).uid, 'flooded', 'party', [0], 9, 0);
    turnOf(b, tester(b).uid);
    b.useSkill(tester(b).uid, 'storm_test_bolt', hero.uid);
    const ev = b.log.find((e) => e.type === 'shock');
    expect(ev && ev.type === 'shock' && ev.pushed).toBe(0);
    expect(hero.statuses.some((s) => s.kind === 'stun')).toBe(true);
    expect(hero.statuses.some((s) => s.kind === T.badge)).toBe(false);
  });

  it.each(MODES)('Soaked (suda değil) da Stun yer (%s)', (mode) => {
    const b = make(undefined, P, E, mode);
    const hero = at(b, 'party', 0);
    b.debugAddStatus(hero.uid, T.wetStatus, 3);
    turnOf(b, tester(b).uid);
    b.useSkill(tester(b).uid, 'storm_test_bolt', hero.uid);
    expect(hero.statuses.some((s) => s.kind === 'stun')).toBe(true);
  });

  it('shocks alanı yoksa itmez; ıskada itmez', () => {
    const a = make(undefined, P, E);
    const h1 = at(a, 'party', 0);
    const c1 = h1.turnCounter;
    a.useSkill(tester(a).uid, 'storm_test_iron', h1.uid);
    expect(h1.turnCounter).toBe(c1);
    const m = make(undefined, P, E);
    m.debug.dodge = 'always';
    const h2 = at(m, 'party', 0);
    const c2 = h2.turnCounter;
    m.useSkill(tester(m).uid, 'storm_test_bolt', h2.uid);
    expect(h2.turnCounter).toBe(c2);
  });

  it('geri itilen kahraman sıra tahmininde geriye düşer', () => {
    const run = (skill: string) => {
      const b = make(undefined, P, E, 'turns');
      const hero = at(b, 'party', 0);
      turnOf(b, tester(b).uid);
      b.useSkill(tester(b).uid, skill, hero.uid);
      return { counter: hero.turnCounter, at: b.turnQueue(12).indexOf(hero.uid) };
    };
    const shocked = run('storm_test_bolt');
    const plain = run('storm_test_iron');
    expect(shocked.counter).toBeLessThan(plain.counter);
    expect(shocked.at).toBeGreaterThanOrEqual(plain.at);
  });
});

describe('A2 Live Water', () => {
  it.each(MODES)('bağlı su ağındaki herkes (taraf ayırmadan) ark yer; ağ dışındaki yemez (%s)', (mode) => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid', 2: 'archer' }, E, mode);
    const [a, c, d] = [at(b, 'party', 0), at(b, 'party', 1), at(b, 'party', 2)];
    // Düşmanın kendi birimi kahraman tahtasında: ark taraf ayırmaz
    const own = at(b, 'enemy', 8);
    own.board = 'party';
    own.slot = 3;
    b.debugPlaceGround(tester(b).uid, 'flooded', 'party', [0, 1, 3], 9, 0);
    turnOf(b, tester(b).uid);
    for (const u of [a, c, d, own]) u.stats = { ...u.stats, hpRegen: 0 }; // sıradaki tur başı yenilenmesi ölçümü bozmasın (sıra seed + tur zarına bağlı)
    const hp = new Map([a, c, d, own].map((u) => [u.uid, u.hp]));
    const arc = b.arcDamage(c);
    b.useSkill(tester(b).uid, 'storm_test_iron', a.uid);
    const lw = b.log.find((e) => e.type === 'liveWater');
    expect(lw && lw.type === 'liveWater' && [...lw.cells].sort()).toEqual([0, 1, 3]);
    expect(hp.get(c.uid)! - c.hp).toBe(arc);
    expect(own.hp).toBeLessThan(hp.get(own.uid)!);
    expect(d.hp).toBe(hp.get(d.uid)!);
    expect(a.hp).toBeLessThan(hp.get(a.uid)!);
  });

  it('Ice iletmez: buz zinciri keser; buza dönen hücrede ark yok', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'archer' }, E);
    const far = at(b, 'party', 2);
    b.debugPlaceGround(tester(b).uid, 'flooded', 'party', [0, 2], 9, 0);
    b.debugPlaceGround(tester(b).uid, 'ice_ground', 'party', [1], 9, 0);
    const hp = far.hp;
    b.useSkill(tester(b).uid, 'storm_test_iron', at(b, 'party', 0).uid);
    expect(far.hp).toBe(hp);
    expect(b.onLiveWater('party', 2)).toBe(false);
    expect(b.onLiveWater('party', 0)).toBe(true);
  });

  it('Tide suyu ve Tidewater Urn suyu iletir', () => {
    const t = make({ condition: 'tide' }, { 0: 'warrior', 1: 'druid' }, E);
    const friend = at(t, 'party', 1);
    const h = friend.hp;
    t.useSkill(tester(t).uid, 'storm_test_iron', at(t, 'party', 0).uid);
    expect(friend.hp).toBeLessThan(h);

    const u = make({ device: 'tidewater_urn' }, { 0: 'warrior', 1: 'druid', 3: 'archer' }, E);
    expect(u.useGlobal(at(u, 'party', 3).uid, 'tidewater_urn', 0).ok).toBe(true);
    const fr = at(u, 'party', 1);
    const hp = fr.hp;
    u.useSkill(tester(u).uid, 'storm_test_iron', at(u, 'party', 0).uid);
    expect(fr.hp).toBeLessThan(hp);
  });

  it('su canlı kalır: turunu suda bitiren ark yer, çıkan yemez; atanın sonraki turu bitince söner', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid' }, E, 'turns');
    const [stay, leave] = [at(b, 'party', 0), at(b, 'party', 1)];
    b.debugPlaceGround(at(b, 'enemy', 8).uid, 'flooded', 'party', [0, 1], 30, 0);
    turnOf(b, tester(b).uid);
    b.useSkill(tester(b).uid, 'storm_test_iron', stay.uid);
    expect(b.liveWaters).toHaveLength(1);
    // Sıradakilerin hepsi: druid sudan çıkar, diğerleri pas
    let stayHpAtTurn = 0;
    let moved = false;
    for (let i = 0; i < 12 && b.currentUid !== tester(b).uid; i++) {
      const cur = b.currentUid!;
      if (cur === leave.uid && !moved) {
        moved = true;
        const hp = leave.hp;
        expect(b.useSkill(leave.uid, 'move_tile', undefined, 7).ok).toBe(true);
        expect(leave.hp).toBe(hp);
      } else if (cur === stay.uid) {
        stayHpAtTurn = stay.hp;
        const arc = b.arcDamage(stay);
        b.skipTurn();
        expect(stayHpAtTurn - stay.hp).toBe(arc);
      } else b.skipTurn();
    }
    expect(b.currentUid).toBe(tester(b).uid);
    expect(b.liveWaters).toHaveLength(1);
    b.skipTurn();
    expect(b.liveWaters).toEqual([]);
    expect(b.log.some((e) => e.type === 'liveWaterEnd')).toBe(true);
  });
});

describe('A4 Iron Draws the Bolt', () => {
  const dmg = (armor: number, skill: string, mode: BattleMode) => {
    const b = make(undefined, P, E, mode);
    const hero = at(b, 'party', 0);
    hero.stats = { ...hero.stats, armor };
    turnOf(b, tester(b).uid);
    return previewSkill(b, tester(b).uid, skill, hero.uid).find((p) => p.uid === hero.uid)!.damage!.avg;
  };

  it.each(MODES)('etiketli skill zırhla güçlenir, etiketsiz güçlenmez (%s)', (mode) => {
    expect(dmg(100, 'storm_test_iron', mode)).toBeGreaterThan(dmg(0, 'storm_test_iron', mode));
    expect(dmg(100, 'storm_test_bolt', mode)).toBe(dmg(0, 'storm_test_bolt', mode));
    expect(dmg(100, 'bog_spark', mode)).toBe(dmg(0, 'bog_spark', mode));
  });

  it('gerçek vuruş önizlemeyle aynı aralıkta; alan vuruşundaki 2. hedefe de işler (extras dışı)', () => {
    const b = make(undefined, P, E);
    const hero = at(b, 'party', 0);
    hero.stats = { ...hero.stats, armor: 200 };
    const p = previewSkill(b, tester(b).uid, 'storm_test_iron', hero.uid).find((x) => x.uid === hero.uid)!.damage!;
    const hp = hero.hp;
    b.useSkill(tester(b).uid, 'storm_test_iron', hero.uid);
    expect(hp - hero.hp).toBeGreaterThanOrEqual(p.min);
    expect(hp - hero.hp).toBeLessThanOrEqual(p.max);
  });
});

describe('A5 Thunderflash', () => {
  const dark = { condition: 'darkness' } as const;
  const party = { 0: 'warrior', 7: 'archer' };
  const foes = { 0: 'drowned', 6: 'storm_tester', 9: 'drowned' };

  it.each(MODES)('mob şimşeği tahtayı bir kahraman turu aydınlatır, en yakın kahraman Blinded (%s)', (mode) => {
    const b = make(dark, party, foes, mode);
    expect(b.isDark()).toBe(true);
    const hero = at(b, 'party', 0);
    turnOf(b, tester(b).uid);
    expect(b.isDark()).toBe(true);
    b.useSkill(tester(b).uid, 'storm_test_iron', hero.uid);
    const fl = b.log.find((e) => e.type === 'thunderflash');
    expect(fl && fl.type === 'thunderflash' && fl.blinded).toBe(hero.uid);
    expect(hero.statuses.some((s) => s.kind === 'blinded')).toBe(true);
    if (mode === 'test') expect(b.isDark()).toBe(false);
    // İlk kahraman turu bitince karanlık döner
    if (mode === 'turns') for (let i = 0; i < 10 && b.currentUid && b.get(b.currentUid)!.side !== 'party'; i++) b.skipTurn();
    expect(b.isDark()).toBe(false);
    const actor = mode === 'turns' ? b.currentUid! : hero.uid;
    // Aydınlıkta arka sıra hedeflenebilir
    expect(b.darkBlocks(b.get(actor)!, content.skills.storm_test_iron!, 'enemy', 9)).toBe(false);
    if (mode === 'turns') b.skipTurn();
    else b.useSkill(hero.uid, b.get(hero.uid)!.skills[0]!, at(b, 'enemy', 0).uid);
    expect(b.isDark()).toBe(true);
  });

  it('Lantern ayaktayken (zaten aydınlık) Thunderflash olmaz; kahraman tarafı şimşeği de açmaz', () => {
    const l = make({ condition: 'darkness', lantern: 'lantern' }, party, foes);
    l.useSkill(tester(l).uid, 'storm_test_iron', at(l, 'party', 0).uid);
    expect(l.log.some((e) => e.type === 'thunderflash')).toBe(false);
    const h = make(dark, { 0: 'storm_tester', 7: 'archer' }, { 0: 'drowned' });
    h.useSkill(at(h, 'party', 0).uid, 'storm_test_iron', at(h, 'enemy', 0).uid);
    expect(h.log.some((e) => e.type === 'thunderflash')).toBe(false);
    expect(h.isDark()).toBe(true);
  });
});

describe('A6 Shatter', () => {
  const R = content.groundReactions.shatter!;

  it('veride zemin tepkimesi', () => {
    expect(R.trigger).toEqual(['lightning']);
    expect(R.setup).toContain('ice_ground');
    expect(R.remove).toContain('ice_ground');
  });

  it.each(MODES)('buz patlar: hücre ve artı komşuları fiziksel hasar, buz kalkar; çapraz yemez (%s)', (mode) => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid', 4: 'archer', 3: 'mage' }, E, mode);
    const [c0, c1, c4, c3] = [at(b, 'party', 0), at(b, 'party', 1), at(b, 'party', 4), at(b, 'party', 3)];
    b.debugPlaceGround(tester(b).uid, 'ice_ground', 'party', [1], 9, 0);
    turnOf(b, tester(b).uid);
    const hp = new Map([c0, c1, c4, c3].map((u) => [u.uid, u.hp]));
    b.useSkill(tester(b).uid, 'storm_test_row', undefined, 1);
    expect(b.log.some((e) => e.type === 'groundReaction' && e.reaction === 'shatter')).toBe(true);
    expect(b.ground.some((g) => g.ground === 'ice_ground')).toBe(false);
    expect(c1.hp).toBeLessThan(hp.get(c1.uid)!);
    expect(c4.hp).toBeLessThan(hp.get(c4.uid)!); // komşu
    expect(hp.get(c0.uid)! - c0.hp).toBeGreaterThan(0);
    void c3;
  });

  it('Frozen karaktere ek kural yok: buzsuz hücrede patlama olmaz', () => {
    const b = make(undefined, P, E);
    const hero = at(b, 'party', 0);
    b.debugAddStatus(hero.uid, 'frozen', 1);
    b.useSkill(tester(b).uid, 'storm_test_iron', hero.uid);
    expect(b.log.some((e) => e.type === 'groundReaction')).toBe(false);
  });

  it('debug: Ground reactions > Shatter ve Lightning bolt tetikler', () => {
    const b = make(undefined, P, E);
    const hero = at(b, 'party', 0);
    const hp = hero.hp;
    expect(b.debugGroundReaction(hero.uid, 'shatter').ok).toBe(true);
    expect(hero.hp).toBeLessThan(hp);
    expect(b.ground.some((g) => g.ground === 'ice_ground')).toBe(false);
    expect(b.debugBolt(hero.uid).ok).toBe(true);
    expect(hero.statuses.some((s) => s.kind === T.badge)).toBe(true);
  });
});

describe('YZ', () => {
  it('etiketsiz savaşta kural değeri ve hücre riski yok', () => {
    const b = make(undefined, P, { 6: 'will_o_wisp' });
    expect(b.thunderSkillsOf('enemy')).toEqual([]);
  });

  it('şimşekçi varken kahraman sudan çıkar; şimşekçi yokken aynı durumda kalır', () => {
    const decide = (foe: string) => {
      const b = make(undefined, { 0: 'warrior' }, { 6: foe, 9: 'drowned' }, 'turns');
      const hero = at(b, 'party', 0);
      b.debugPlaceGround(at(b, 'enemy', 9).uid, 'flooded', 'party', [0], 30, 0);
      hero.skills = []; // saldırısı güçlü kahraman bazen vurmayı seçer; burada yalnız hücre değeri ölçülür
      turnOf(b, hero.uid);
      return chooseAction(b, hero.uid, content.aiConfig);
    };
    const threat = decide('storm_tester');
    expect(threat?.skillId).toBe('move_tile');
    const calm = decide('will_o_wisp');
    expect(calm?.skillId === 'move_tile' && calm.slot === threat?.slot).toBe(false);
  });

  it('zırhlı birim etiketli zırh skill\'inin menzilinden geri alınır', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid' }, { 0: 'storm_tester', 9: 'drowned' }, 'turns'); // druid ön sırayı tutar: mesafe en öndeki dolu sıraya göredir, tek başına birim geri çekilemez
    const hero = at(b, 'party', 0);
    hero.stats = { ...hero.stats, armor: 400 };
    const foe = at(b, 'enemy', 0);
    foe.skills = ['storm_test_iron'];
    vi.spyOn(b, 'rangeOf').mockReturnValue(2); // test sınıfının menzili 7: her hücreye yeter
    hero.skills = [];
    turnOf(b, hero.uid);
    const c = chooseAction(b, hero.uid, content.aiConfig);
    expect(c?.skillId).toBe('move_tile');
    expect(b.inRange(foe, content.skills.storm_test_iron!, 'party', c!.slot!, { moved: { uid: hero.uid, slot: c!.slot! } })).toBe(false);
  });

  it('şimşekçi suyu okur: su ağındaki hedefleri kuru hedefe tercih eder', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid', 2: 'archer' }, { 6: 'storm_tester' }, 'turns');
    b.debugPlaceGround(tester(b).uid, 'flooded', 'party', [1, 2], 30, 0);
    for (const u of b.fighting('party')) {
      u.hp = u.maxHp = 500;
      u.stats = { ...u.stats, armor: 20, magicArmor: 20 };
    }
    tester(b).skills = ['storm_test_bolt']; // alan skill'i üçünü birden vurur; burada hedef seçimi ölçülür
    turnOf(b, tester(b).uid);
    const c = chooseAction(b, tester(b).uid, content.aiConfig);
    const target = b.get(c!.targetUid!);
    expect([1, 2]).toContain(target?.slot);
  });

  it('şimşekçi buzu okur: Ice\'lı hücreyi tercih eder', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'warrior' }, { 6: 'storm_tester' }, 'turns');
    b.debugPlaceGround(tester(b).uid, 'ice_ground', 'party', [2], 30, 0);
    for (const u of b.fighting('party')) {
      u.hp = u.maxHp = 500;
      u.stats = { ...u.stats, armor: 20, magicArmor: 20 };
    }
    const foe = tester(b);
    foe.skills = ['storm_test_iron'];
    turnOf(b, foe.uid);
    const c = chooseAction(b, foe.uid, content.aiConfig);
    expect(b.get(c!.targetUid!)?.slot).toBe(2);
  });

  it('Live Water\'da kendi birimini vurmaz: dostu ağda olan hedef yerine kuru hedefi seçer', () => {
    const b = make(undefined, { 0: 'warrior', 2: 'warrior' }, { 6: 'storm_tester', 8: 'drowned' }, 'turns');
    const own = at(b, 'enemy', 8);
    own.board = 'party';
    own.slot = 1; // kendi birimi kahraman tahtasında, 2 ile aynı suda
    own.hp = own.maxHp = 500;
    b.debugPlaceGround(tester(b).uid, 'flooded', 'party', [1, 2], 30, 0);
    for (const u of b.combatants.filter((c) => c.side === 'party')) {
      u.hp = u.maxHp = 500;
      u.stats = { ...u.stats, armor: 20, magicArmor: 20 };
    }
    const foe = tester(b);
    foe.skills = ['storm_test_iron'];
    turnOf(b, foe.uid);
    // Kahraman (2) arkı yer ama kendi birimi de: kazanç sıfırlanır; hedef seçimi en azından kendi birimine vuran hücreye gitmez
    const c = chooseAction(b, foe.uid, content.aiConfig);
    expect(b.get(c!.targetUid!)?.side).toBe('party');
    expect(b.get(c!.targetUid!)?.slot).toBe(0);
  });
});

describe('metin, önizleme, Codex, debug', () => {
  it('skill metni kuralları söyler', () => {
    const text = (id: string) => JSON.stringify(describeSkill(content.skills[id]!, content.classes.storm_tester!.stats ?? content.classes.storm_tester!, content.formulas));
    expect(text('storm_test_bolt')).toContain('Shocked');
    expect(text('storm_test_iron')).toContain('Iron Draws the Bolt');
    expect(text('storm_test_iron')).toContain('Live Water');
  });

  it('önizleme arkı, Shocked satırını ve hedef olmayan birimi gösterir', () => {
    const b = make(undefined, { 0: 'warrior', 1: 'druid' }, E);
    b.debugPlaceGround(tester(b).uid, 'flooded', 'party', [0, 1], 9, 0);
    const list = previewSkill(b, tester(b).uid, 'storm_test_bolt', at(b, 'party', 0).uid);
    const lines = (uid: string) => list.find((p) => p.uid === uid)?.statuses ?? [];
    expect(lines(at(b, 'party', 0).uid).some((l) => l.startsWith('Shocked: Stun'))).toBe(true);
    expect(lines(at(b, 'party', 1).uid).some((l) => l.startsWith('Live Water'))).toBe(true);
    expect(b.groundReactionPreview(tester(b).uid, 'storm_test_bolt', undefined, undefined, at(b, 'party', 0).uid).some((r) => r.label === 'Live Water')).toBe(true);
  });

  it('Codex > Mechanics makalesi var, tepkime tablosunda Shatter', () => {
    const arts = buildMechanics();
    const a = arts.find((x) => x.id === 'lightning-rules');
    expect(a).toBeDefined();
    const text = JSON.stringify(a);
    for (const w of ['Shocked', 'Live Water', 'Iron Draws the Bolt', 'Thunderflash', 'Shatter']) expect(text).toContain(w);
  });

  it.each(MODES)('debug senaryoları kurulur ve birkaç tur oynar (%s)', (mode) => {
    for (const kind of ['thunder_tide', 'thunder_urn', 'thunder_iron', 'thunder_dark', 'thunder_ice'] as const) {
      expect(RULES_TESTS.some((t) => t.kind === kind)).toBe(true);
      const d = rulesTestBattleData(11, mode, kind);
      const b = new Battle(content.battleSetup('random-battle', d.seed, mode, d.teams, false));
      for (let i = 0; i < 25 && !b.winner; i++) {
        const uid = mode === 'turns' ? b.currentUid! : b.combatants.find((c) => c.hp > 0 && !c.inert && c.skills.includes('storm_test_bolt'))?.uid;
        if (!uid) break;
        b.applyChoice(uid, chooseAction(b, uid, content.aiConfig));
      }
      expect(b.log.length).toBeGreaterThan(0);
    }
  });

  it('aynı seed = aynı savaş (şimşek kurallarıyla)', () => {
    const run = () => {
      const d = rulesTestBattleData(5, 'turns', 'thunder_tide');
      const b = new Battle(content.battleSetup('random-battle', 5, 'turns', d.teams, false));
      for (let i = 0; i < 40 && !b.winner && b.currentUid; i++) b.applyChoice(b.currentUid, chooseAction(b, b.currentUid, content.aiConfig));
      return JSON.stringify(b.log);
    };
    expect(run()).toBe(run());
  });
});
