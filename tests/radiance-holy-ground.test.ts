import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, describeSkill, previewSkill } from '../src/engine';
import type { BattleEvent, BattleMode } from '../src/engine';

// D11 (Ömer 2026-10-23, düzeltme 2026-10-24; open-questions 406): Radiance yalnızca seçilen TEK hücreyi etkiler, iki tahtaya da atılır.
// Kendi tarafına: alandaki dostlara anlık şifa + Holy Ground (şifa zemini: içinde tur başlatan DOSTA tur başı şifa, düşmana etkisi yok).
// Düşman tarafına: o hücredeki düşmana kutsal hasar (şifa ve zemin yok).

const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
const ai = { ...content.aiConfig, global: undefined }; // global skill'siz YZ (ai-context ile aynı)
function mk(party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test', seed = 3): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies) }, false));
  for (const c of b.combatants) {
    Object.assign(c.stats, { critChance: 0, accuracy: 10, evasion: 0, manaEcho: 0 });
    c.mp = c.maxMp;
  }
  return b;
}
const of = <T extends BattleEvent['type']>(ev: BattleEvent[], t: T) => ev.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === t);
const radiance = content.skills.radiance!;
const groundEff = radiance.effects.find((e) => e.type === 'ground') as Extract<(typeof radiance.effects)[number], { type: 'ground' }>;

describe('Radiance (D11): veri', () => {
  it('area_any + tek hücre (rect 1x1) + global; etkiler side ile ayrılır; Holy Ground şifa zemini', () => {
    expect(radiance).toMatchObject({ target: 'area_any', area: { shape: 'rect', rows: 1, cols: 1 }, global: true });
    expect(radiance.effects.map((e) => [e.type, e.side])).toEqual([
      ['heal', 'allies'],
      ['ground', 'allies'],
      ['damage', 'enemies'],
    ]);
    expect(groundEff).toMatchObject({ ground: 'holy_ground', turns: 2 });
    expect(content.grounds.holy_ground).toMatchObject({ name: 'Holy Ground', heal: true, element: 'holy' });
  });

  it('açıklama iki modu da yazar (dost tarafı şifa + Holy Ground, düşman tarafı hasar)', () => {
    const text = describeSkill(radiance, content.classes.paladin!.stats, content.formulas, content.summons, { statuses: content.statuses, grounds: content.grounds }).lines.join('\n');
    expect(text).toContain('(on your side: allies)');
    expect(text).toContain('(on the enemy side: enemies)');
    expect(text).toContain('Holy Ground');
    expect(text).toContain('healing at the start of each ally turn there');
  });
});

describe('Radiance (D11): motor', () => {
  it('dost tarafı: yalnızca seçilen hücredeki dost iyileşir, Holy Ground KENDİ tahtasında o tek hücreye konur, hasar yok', () => {
    const b = mk({ 0: 'paladin', 1: 'warrior', 2: 'mage' }, { 0: 'archer', 1: 'warrior' });
    for (const c of b.living('party')) c.hp = Math.round(c.maxHp / 2);
    const r = b.useSkill('party-0', 'radiance', 'tile:1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(of(r.events, 'heal').map((e) => e.target)).toEqual(['party-1']);
    expect(of(r.events, 'damage')).toHaveLength(0);
    const g = of(r.events, 'ground');
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ground: 'holy_ground', board: 'party', turns: 2 });
    expect(g[0]!.slots).toEqual([1]);
  });

  it('düşman tarafı: yalnızca o hücredeki düşmana hasar; şifa ve zemin yok', () => {
    const b = mk({ 0: 'paladin', 1: 'warrior' }, { 0: 'archer', 1: 'warrior', 2: 'mage' });
    b.get('party-1')!.hp = 10;
    const r = b.useSkill('party-0', 'radiance', undefined, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(of(r.events, 'damage').map((e) => e.target)).toEqual(['enemy-1']);
    expect(of(r.events, 'heal')).toHaveLength(0);
    expect(of(r.events, 'ground')).toHaveLength(0);
    expect(b.ground).toHaveLength(0);
  });

  it('boş dost alanına atılamaz (alanda dost yok)', () => {
    const b = mk({ 0: 'paladin' }, { 0: 'archer' });
    expect(b.useSkill('party-0', 'radiance', 'tile:11')).toMatchObject({ ok: false, reason: 'No ally in the area' });
  });

  it('Holy Ground: içinde tur başlatan dost sabit miktar iyileşir (kritiksiz); düşmana tik hasarı yok; süre bırakanın turlarıyla biter', () => {
    const b = mk({ 0: 'paladin', 1: 'warrior' }, { 0: 'archer' }, 'turns', 5);
    const pal = b.get('party-0')!;
    const war = b.get('party-1')!;
    for (let i = 0; i < 30 && b.currentActor !== pal; i++) expect(b.skipTurn().ok).toBe(true);
    pal.cooldowns = {};
    war.hp = 1;
    const r = b.useSkill(pal.uid, 'radiance', 'tile:1');
    expect(r.ok).toBe(true);
    const tick = Math.round(pal.stats.int * groundEff.power);
    expect(b.ground.find((g) => g.ground === 'holy_ground')?.amount).toBe(tick);
    // savaşçının sıradaki turları: her tur başında Holy Ground şifası (cause holy_ground)
    const ticks: number[] = [];
    const enemyHurtByGround: BattleEvent[] = [];
    for (let i = 0; i < 40 && b.ground.some((g) => g.ground === 'holy_ground'); i++) {
      const from = b.log.length;
      war.hp = 1; // eksik can hep büyük: tik tam miktar
      const sk = b.skipTurn();
      if (!sk.ok) break;
      const ev = b.log.slice(from);
      for (const e of of(ev, 'heal')) if (e.cause === 'holy_ground') {
        expect(e.target).toBe(war.uid);
        expect(e.crit).toBe(false);
        ticks.push(e.amount);
      }
      enemyHurtByGround.push(...of(ev, 'damage').filter((e) => e.origin === 'ground'));
    }
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((t) => t === tick)).toBe(true);
    expect(enemyHurtByGround).toHaveLength(0);
    expect(b.ground.some((g) => g.ground === 'holy_ground')).toBe(false); // süre doldu
  });

  it('önizleme: dost alanında Holy Ground tur başı şifa olarak (hot) görünür, kalan eksik canla sınırlı', () => {
    const b = mk({ 0: 'paladin', 1: 'warrior' }, { 0: 'archer' });
    const war = b.get('party-1')!;
    war.hp = war.maxHp; // tam can: ne anlık şifa ne zemin şifası değer taşır
    const full = previewSkill(b, 'party-0', 'radiance', 'tile:1').find((p) => p.uid === war.uid)!;
    expect(full.heal?.avg ?? 0).toBe(0);
    expect(full.hot?.total ?? 0).toBe(0);
    war.hp = 1;
    const low = previewSkill(b, 'party-0', 'radiance', 'tile:1').find((p) => p.uid === war.uid)!;
    expect(low.hot).toMatchObject({ perTurn: Math.round(b.get('party-0')!.stats.int * groundEff.power), turns: groundEff.turns });
    expect(low.hot!.total).toBeGreaterThan(0);
  });
});

describe('Radiance (D11): yapay zeka iki modu da kullanır', () => {
  it('ağır yaralı dostlar varken kendi tarafına (şifa) atar', () => {
    const b = mk({ 0: 'paladin', 1: 'warrior', 2: 'mage' }, { 0: 'archer', 1: 'warrior' });
    b.get('party-0')!.skills = ['radiance'];
    for (const c of b.living('party')) c.hp = Math.round(c.maxHp * 0.25);
    expect(chooseAction(b, 'party-0', ai)).toMatchObject({ skillId: 'radiance', board: 'party' });
  });

  it('dostlar sağlamken düşman tarafına (hasar) atar', () => {
    const b = mk({ 0: 'paladin', 1: 'warrior' }, { 0: 'archer', 1: 'warrior', 2: 'mage' });
    b.get('party-0')!.skills = ['radiance'];
    expect(chooseAction(b, 'party-0', ai)).toMatchObject({ skillId: 'radiance', board: 'enemy' });
  });

  it('düşman tarafındaki Paladin (YZ) de kendi yaralılarına atar', () => {
    const b = mk({ 0: 'archer', 1: 'warrior' }, { 0: 'paladin', 1: 'warrior', 2: 'mage' });
    b.get('enemy-0')!.skills = ['radiance'];
    for (const c of b.living('enemy')) c.hp = Math.round(c.maxHp * 0.25);
    expect(chooseAction(b, 'enemy-0', ai)).toMatchObject({ skillId: 'radiance', board: 'enemy' });
  });
});
