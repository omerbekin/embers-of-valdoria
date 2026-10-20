import { describe, expect, it } from 'vitest';
import layout from '../data/battle-layout.json';
import { Battle, MatchLog, chooseAction, content, describeSkill, explainChoice } from '../src/engine';
import type { AiTrace, BattleEvent, CombatantDef, SkillDef } from '../src/engine';
import { cursorAnchorSlot, isShapeArea, screenCellOf, shapeCells } from '../src/engine/area-shape';
import { computeScreenGrid } from '../src/engine/formation';
import { previewSkill } from '../src/engine/preview';
import { rangeOff } from './range-helpers';

// AOE şekilleri (row / column / rect / plus): hücre kümesi tabanlı alan. Ekran uzayı formulas.json > formation.screenGrid (layout'tan türetilir).
// Terimler: SIRA = aynı derinlik (yuva = sıra*3+şerit), ŞERİT = aynı şerit (4 sıra boyunca). Rect: rows = sıra sayısı, cols = şerit sayısı, anchor = ekranda sol-alt.

const f = content.formulas;
const fm = f.formation;
const area = (shape: 'row' | 'column' | 'plus') => ({ shape });
const rect = (rows: number, cols: number) => ({ shape: 'rect' as const, rows, cols, anchor: 'bottom_left' as const });
const unitDef = (id: string): CombatantDef => (content.summons[id] ?? content.classes[id])!;

function arena(party: [string, number][], enemies: [string, number][], skills: Record<string, SkillDef> = {}, partySkills?: string[], legacyReach = false): Battle {
  const base = content.battleSetup('random-battle', 1, 'test', { party: [], enemies: [] }, false);
  const mk = ([id]: [string, number]) => (partySkills && id === 'aoe_tester' ? { ...unitDef(id), skills: partySkills } : unitDef(id));
  const setup = { ...base, skills: { ...base.skills, ...skills }, party: party.map(mk), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) };
  const b = new Battle(legacyReach ? rangeOff(setup) : setup); // legacyReach: menzil KAPALI (eski melee erişim kuralı testleri)
  for (const c of b.combatants) Object.assign(c.stats, { critChance: 0, accuracy: 10, evasion: 0, surviveChance: 0 });
  b.debug.crit = 'never';
  b.freeMp = true;
  return b;
}
const dmgTargets = (events: BattleEvent[]) => events.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage').map((e) => e.target);
const WAR = (...slots: number[]): [string, number][] => slots.map((s) => ['warrior', s]);

describe('ekran ızgarası (veri = layout)', () => {
  it('formulas.json screenGrid layout koordinatlarından üretilenle birebir aynı (layout değişirse yeniden üret)', () => {
    expect(fm.screenGrid!.party).toEqual(computeScreenGrid(layout.partySlots, fm.rows, fm.lanes));
    expect(fm.screenGrid!.enemy).toEqual(computeScreenGrid(layout.enemySlots, fm.rows, fm.lanes));
  });

  it('ekranda gerçekten soldan sağa / yukarıdan aşağıya: sütun sırası x, satır sırası y ile uyumlu; iki taraf aynalı', () => {
    for (const [board, slots] of [['party', layout.partySlots], ['enemy', layout.enemySlots]] as const) {
      const g = fm.screenGrid![board];
      for (let i = 0; i < g.length; i++)
        for (let j = 0; j < g.length; j++) {
          if (g[i]!.col < g[j]!.col) expect(slots[i]!.x, `${board} ${i}<${j}`).toBeLessThan(slots[j]!.x + 1e-9 + 100);
          if (g[i]!.row < g[j]!.row) expect(slots[i]!.y).toBeLessThan(slots[j]!.y);
        }
    }
    // oyuncuda derin sıra solda (sütun 0), düşmanda ön sıra solda
    expect(fm.screenGrid!.party[9]!.col).toBe(0);
    expect(fm.screenGrid!.party[0]!.col).toBe(fm.rows - 1);
    expect(fm.screenGrid!.enemy[0]!.col).toBe(0);
    expect(fm.screenGrid!.enemy[9]!.col).toBe(fm.rows - 1);
  });
});

describe('şekil hücre kümeleri (saf)', () => {
  it('row: anchor sırasının tüm şeritleri (ortada/köşede/iki tarafta)', () => {
    for (const board of ['party', 'enemy'] as const) {
      expect(shapeCells(area('row'), 4, board, fm)).toEqual([3, 4, 5]);
      expect(shapeCells(area('row'), 0, board, fm)).toEqual([0, 1, 2]);
      expect(shapeCells(area('row'), 11, board, fm)).toEqual([9, 10, 11]);
    }
  });

  it('column: anchor şeridinin 4 sırası', () => {
    for (const board of ['party', 'enemy'] as const) {
      expect(shapeCells(area('column'), 4, board, fm)).toEqual([1, 4, 7, 10]);
      expect(shapeCells(area('column'), 0, board, fm)).toEqual([0, 3, 6, 9]);
      expect(shapeCells(area('column'), 11, board, fm)).toEqual([2, 5, 8, 11]);
    }
  });

  it('plus: anchor + 4 komşu; tahta kenarında/köşesinde tahta dışı atlanır (kırpılır)', () => {
    for (const board of ['party', 'enemy'] as const) {
      expect(shapeCells(area('plus'), 4, board, fm)).toEqual([1, 3, 4, 5, 7]);
      expect(shapeCells(area('plus'), 0, board, fm)).toEqual([0, 1, 3]);
      expect(shapeCells(area('plus'), 11, board, fm)).toEqual([8, 10, 11]);
      expect(shapeCells(area('plus'), 5, board, fm)).toEqual([2, 4, 5, 8]);
    }
  });

  it('plus = eski radius 1 ile aynı hücreler (eski kural burada referans olarak hesaplanır)', () => {
    const oldR1 = (c: number) => Array.from({ length: 12 }, (_, i) => i).filter((i) => Math.abs(Math.floor(i / 3) - Math.floor(c / 3)) + Math.abs((i % 3) - (c % 3)) <= 1);
    for (let s = 0; s < 12; s++) expect(shapeCells(area('plus'), s, 'enemy', fm)).toEqual(oldR1(s));
  });

  it('rect 2x3 (2 sıra x 3 şerit), düşman tarafı: anchor sol-alt; ekranda sol = ön sıra', () => {
    expect(shapeCells(rect(2, 3), 0, 'enemy', fm)).toEqual([0, 1, 2, 3, 4, 5]); // ön sıra anchor: sıra 0,1
    expect(shapeCells(rect(2, 3), 4, 'enemy', fm)).toEqual([3, 4, 5, 6, 7, 8]); // sıra 1,2
    expect(shapeCells(rect(2, 3), 7, 'enemy', fm)).toEqual([6, 7, 8, 9, 10, 11]); // sıra 2,3
    expect(shapeCells(rect(2, 3), 9, 'enemy', fm)).toEqual([6, 7, 8, 9, 10, 11]); // en arka sıra: taşar, KAYDIRILIR (sıra 2,3)
    expect(shapeCells(rect(2, 3), 11, 'enemy', fm)).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it('rect 2x3, oyuncu tarafı (ayna): derinlik ekseni yine anchor sırası + ARKASI (madde 376/8; ekranda sola uzanır)', () => {
    expect(shapeCells(rect(2, 3), 0, 'party', fm)).toEqual([0, 1, 2, 3, 4, 5]); // ön sıra anchor: sıra 0,1
    expect(shapeCells(rect(2, 3), 3, 'party', fm)).toEqual([3, 4, 5, 6, 7, 8]); // sıra 1,2
    expect(shapeCells(rect(2, 3), 6, 'party', fm)).toEqual([6, 7, 8, 9, 10, 11]); // sıra 2,3
    expect(shapeCells(rect(2, 3), 9, 'party', fm)).toEqual([6, 7, 8, 9, 10, 11]); // en arka: kaydırılır (sıra 2,3)
  });

  it('rect simetrisi: her derinlik-ekseni / şerit boyutu için oyuncu ve düşman tahtası aynı yuvaları kapsar', () => {
    for (let h = 1; h <= fm.rows; h++) for (let v = 1; v <= fm.lanes; v++) for (let s = 0; s < 12; s++) {
      expect(shapeCells(rect(h, v), s, 'party', fm)).toEqual(shapeCells(rect(h, v), s, 'enemy', fm));
    }
  });

  it('imleç hücresi: 2 derinlikli rect alanında iki tahtada da alanın EKRANDAKİ sol-alt köşesi (madde 377); kapsama yine anchor sırası + arkası', () => {
    for (const r of [rect(2, 3), rect(2, 2)]) for (const board of ['party', 'enemy'] as const) for (let s = 0; s < 12; s++) {
      const cells = shapeCells(r, cursorAnchorSlot(r, s, board, fm), board, fm);
      expect(cells).toContain(s);
      const sc = cells.map((c) => screenCellOf(fm, board, c));
      const me = screenCellOf(fm, board, s);
      const row = Math.floor(s / 3);
      // kenarda kaydırılmıyorsa imleç en solda ve en altta
      const slides = board === 'party' ? row === 0 : row === 3;
      if (!slides) expect(me.col, `${board} @${s}`).toBe(Math.min(...sc.map((c) => c.col)));
      if (r.cols === 2 && me.row >= 1) expect(me.row).toBe(Math.max(...sc.map((c) => c.row)));
    }
    // oyuncu tahtası: imleç sıra 2 -> alan sıra 1 + 2 (anchor sıra 1); düşman: imleç = anchor
    expect(cursorAnchorSlot(rect(2, 3), 6, 'party', fm)).toBe(3);
    expect(shapeCells(rect(2, 3), cursorAnchorSlot(rect(2, 3), 6, 'party', fm), 'party', fm)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(cursorAnchorSlot(rect(2, 3), 6, 'enemy', fm)).toBe(6);
    expect(cursorAnchorSlot(rect(3, 3), 6, 'party', fm)).toBe(6);
    expect(cursorAnchorSlot({ shape: 'row' }, 6, 'party', fm)).toBe(6);
  });

  it('rect 2x2: şerit ekseninde de sol-alt (ekranda alt = büyük şerit no) ve kayma; boyut hep korunur', () => {
    // düşman, anchor sıra 1 şerit 2 (ekranda alt): yukarı 2 şerit, sağa 2 sıra
    expect(shapeCells(rect(2, 2), 5, 'enemy', fm)).toEqual([4, 5, 7, 8]);
    // anchor şerit 0 (en üst): yukarı taşar -> aşağı kaydırılır (şerit 0,1)
    expect(shapeCells(rect(2, 2), 3, 'enemy', fm)).toEqual([3, 4, 6, 7]);
    // oyuncu, anchor sıra 1 şerit 2: düşmanla aynı (sıra 1,2; şerit 1,2)
    expect(shapeCells(rect(2, 2), 5, 'party', fm)).toEqual([4, 5, 7, 8]);
    for (const board of ['party', 'enemy'] as const) for (let s = 0; s < 12; s++) {
      expect(shapeCells(rect(2, 2), s, board, fm)).toHaveLength(4);
      expect(shapeCells(rect(2, 3), s, board, fm)).toHaveLength(6);
      expect(shapeCells(rect(1, 1), s, board, fm)).toEqual([s]);
    }
  });

  it('geçersiz anchor boş liste; tahtadan büyük rect tahtaya sığar', () => {
    expect(shapeCells(area('row'), -1, 'enemy', fm)).toEqual([]);
    expect(shapeCells(area('row'), 12, 'enemy', fm)).toEqual([]);
    expect(shapeCells(rect(9, 9), 4, 'enemy', fm)).toHaveLength(12);
  });
});

describe('Geometer (aoe_tester) test karakteri', () => {
  const c = content.classes.aoe_tester!;
  it('4 skill, her biri farklı şekil; Int ölçekli arcane büyü, eşit güç/MP/cooldown', () => {
    expect(c.skills).toEqual(['shape_row', 'shape_column', 'shape_rect', 'shape_plus']);
    expect(c.name).toBe('Geometer');
    expect(c.role).toBe('AOE Test');
    expect(c.testOnly).toBe(true);
    expect(c.primary).toBe('int');
    expect(Object.values(c.attributes).reduce((a, b) => a + b, 0)).toBe(60); // x2 stat ölçeği: 60
    const shapes = c.skills.map((id) => content.skills[id]!.area!.shape);
    expect(shapes).toEqual(['row', 'column', 'rect', 'plus']);
    for (const id of c.skills) {
      const s = content.skills[id]!;
      expect(s.target).toBe('area_enemies');
      expect(s.effects).toHaveLength(1);
      const e = s.effects[0] as { scale: string; power: number; element: string };
      expect(e.scale).toBe('int');
      expect(e.element).toBe('arcane');
      expect(e.power).toBe(0.45); // x2 stat ölçeği (eski 0,9)
      expect(s.cooldown).toBe(2);
      expect(isShapeArea(s.area)).toBe(true);
    }
    expect(content.skills.shape_rect!.area).toMatchObject({ rows: 2, cols: 3, anchor: 'bottom_left' });
  });

  it('testOnly: rastgele havuzda ve random-battle havuzunda yok; seçilebilir listede ve classes\'ta var', () => {
    expect(content.randomPool).not.toContain('aoe_tester');
    expect(content.battles['random-battle']!.random!.pool).not.toContain('aoe_tester');
    expect(content.selectableClasses).not.toContain('aoe_tester'); // gizli (hidden): takım seçiminde görünmez; debug/galeri erişir
    expect(content.classes.aoe_tester).toBeDefined();
    for (let seed = 1; seed <= 60; seed++) {
      const t = content.rollTeams('random-battle', seed, { partySize: 12, enemySize: 12 });
      expect([...t.party, ...t.enemies]).not.toContain('aoe_tester');
      expect(content.randomTeam(seed, 12)).not.toContain('aoe_tester');
    }
  });

  it('açıklama ve rozet sade: Row / Column / Block 2x3 / Cross', () => {
    const info = (id: string) => describeSkill(content.skills[id]!, c.stats, content.formulas);
    expect(info('shape_row').targetBadge).toBe('Row');
    expect(info('shape_column').targetBadge).toBe('Column');
    expect(info('shape_rect').targetBadge).toBe('Block 2x3');
    expect(info('shape_plus').targetBadge).toBe('Cross');
    expect(info('shape_row').target).toBe('Hits the whole row of the target');
    expect(info('shape_column').target).toBe('Hits the whole column');
    // 2 sıra x 3 şerit: şerit ekseni (3) merkezli, sıra ekseni (2) sol-alt kuralı (madde 226 rect anchor kuralı)
    expect(info('shape_rect').target).toBe('Hits a 2x3 block, starting at your cursor cell on the left and centered top to bottom (near an edge it starts at your cell or slides inside)');
    expect(info('shape_plus').target).toBe('Hits a cross: the target and the 4 cells next to it');
  });
});

describe('savaşta şekiller: vurulanlar, boş hücre anchor, olaylar, önizleme = gerçek', () => {
  const castAt = (b: Battle, skill: string, anchor: number, viaUnit?: string) => b.useSkill('party-0', skill, viaUnit, anchor);

  it('Row Sweep: anchor sırasındaki herkes (boş hücre anchor da olur); başka sıra vurulmaz', () => {
    const b = arena([['aoe_tester', 0]], WAR(0, 3, 4, 5, 9));
    expect(b.shapePreviewCells('party-0', 'shape_row', 4)).toMatchObject({ cells: [3, 4, 5], valid: true });
    expect(b.shapePreviewCells('party-0', 'shape_row', 4).targets).toEqual(['enemy-1', 'enemy-2', 'enemy-3']);
    expect(b.shapePreviewCells('party-0', 'shape_row', 7)).toMatchObject({ valid: false, reason: 'No enemy in the area' }); // sıra 2 boş
    const r = castAt(b, 'shape_row', 5); // anchor = enemy-3 hücresi (slot 5)
    expect(r.ok).toBe(true);
    if (r.ok) expect(dmgTargets(r.events).sort()).toEqual(['enemy-1', 'enemy-2', 'enemy-3']);
  });

  it('Column Spear: boş hücre anchor (şeritte düşman varsa geçerli), 4 sıra boyunca vurur', () => {
    const b = arena([['aoe_tester', 0]], WAR(1, 10, 4, 5));
    expect(b.shapePreviewCells('party-0', 'shape_column', 7)).toMatchObject({ cells: [1, 4, 7, 10], valid: true }); // 7 boş hücre
    expect(b.shapePreviewCells('party-0', 'shape_column', 7).targets).toEqual(['enemy-0', 'enemy-2', 'enemy-1']);
    const r = castAt(b, 'shape_column', 7);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(dmgTargets(r.events).sort()).toEqual(['enemy-0', 'enemy-1', 'enemy-2']);
      const used = r.events.find((e) => e.type === 'skillUsed') as Extract<BattleEvent, { type: 'skillUsed' }>;
      expect(used.anchor).toBe(7);
      expect(used.center).toBe(7);
      expect(used.cells).toEqual([1, 4, 7, 10]);
    }
  });

  it('Block Slam: tüm şeritler x 2 sıra; fare hücresi düşman tarafında en soldaki (ön) sıra; arkaya taşan kaydırılır', () => {
    const b = arena([['aoe_tester', 0]], WAR(0, 3, 6, 9, 11));
    expect(b.shapePreviewCells('party-0', 'shape_rect', 3).cells).toEqual([3, 4, 5, 6, 7, 8]);
    expect(b.shapePreviewCells('party-0', 'shape_rect', 3).targets).toEqual(['enemy-1', 'enemy-2']);
    expect(b.shapePreviewCells('party-0', 'shape_rect', 9).cells).toEqual([6, 7, 8, 9, 10, 11]); // kaydı
    expect(b.shapePreviewCells('party-0', 'shape_rect', 9).targets).toEqual(['enemy-2', 'enemy-3', 'enemy-4']);
    const r = castAt(b, 'shape_rect', 11); // en arka sıradaki boş/dolu hücre: yine sıra 2,3
    expect(r.ok).toBe(true);
    if (r.ok) expect(dmgTargets(r.events).sort()).toEqual(['enemy-2', 'enemy-3', 'enemy-4']);
  });

  it('Block Slam, düşman tarafı OYUNCU: dikdörtgen oyuncunun ekran-sol/alt kuralıyla hücreleri seçer', () => {
    // düşman Geometer'ı oynatır, oyuncu tarafındaki warriorlara vurur: anchor party slot 3 (sıra 1) -> sıra 1 ve arkası 2 (madde 376/8)
    const b = arena(WAR(0, 3, 6, 9), [['aoe_tester', 0]]);
    expect(b.shapePreviewCells('enemy-0', 'shape_rect', 3).cells).toEqual([3, 4, 5, 6, 7, 8]);
    expect(b.shapePreviewCells('enemy-0', 'shape_rect', 3).targets).toEqual(['party-1', 'party-2']);
    expect(b.shapePreviewCells('enemy-0', 'shape_rect', 0).cells).toEqual([0, 1, 2, 3, 4, 5]); // ön sıra anchor: sıra 0,1
  });

  it('Whirlwind (melee, rect 2x3) iki tarafta simetrik: ön sıra boşken anchor dolu ön sırada, alan arkasındaki sırayı da vurur (madde 376/8)', () => {
    const hits = (side: 'party' | 'enemy') => {
      const foes = WAR(3, 6, 9); // sıra 1, 2, 3; ön sıra boş
      const b = side === 'party' ? arena(WAR(0), foes) : arena(foes, WAR(0));
      const me = side === 'party' ? 'party-0' : 'enemy-0';
      const anchors = b.shapeAnchors(me, 'whirlwind');
      expect(anchors.length).toBeGreaterThan(0);
      return Math.max(...anchors.map((a) => b.shapePreviewCells(me, 'whirlwind', a).targets.length));
    };
    expect(hits('party')).toBe(2);
    expect(hits('enemy')).toBe(2);
  });

  it('Cross Burst: + şekli, kenarda kırpılır; boş merkez hücre de seçilebilir', () => {
    const b = arena([['aoe_tester', 0]], WAR(1, 3, 4));
    expect(b.shapePreviewCells('party-0', 'shape_plus', 0)).toMatchObject({ cells: [0, 1, 3], valid: true });
    expect(b.shapePreviewCells('party-0', 'shape_plus', 0).targets).toEqual(['enemy-0', 'enemy-1']);
    expect(b.shapePreviewCells('party-0', 'shape_plus', 4).cells).toEqual([1, 3, 4, 5, 7]);
    expect(b.shapePreviewCells('party-0', 'shape_plus', 11)).toMatchObject({ cells: [8, 10, 11], valid: false });
    const r = castAt(b, 'shape_plus', 0);
    expect(r.ok).toBe(true);
    if (r.ok) expect(dmgTargets(r.events).sort()).toEqual(['enemy-0', 'enemy-1']);
  });

  it('shapeAnchors: şekilde en az 1 canlı düşman kalan hücreler (boşlar dahil); geçersiz anchor cast edilemez', () => {
    const b = arena([['aoe_tester', 0]], WAR(4));
    expect(b.shapeAnchors('party-0', 'shape_row')).toEqual([3, 4, 5]);
    expect(b.shapeAnchors('party-0', 'shape_column')).toEqual([1, 4, 7, 10]);
    expect(b.shapeAnchors('party-0', 'shape_plus')).toEqual([1, 3, 4, 5, 7]);
    expect(b.shapeAnchors('party-0', 'shape_rect')).toEqual([0, 1, 2, 3, 4, 5]); // sıra 1'i kapsayan anchor'lar: sıra 0 (->0,1) ve sıra 1 (->1,2)
    expect(castAt(b, 'shape_row', 9).ok).toBe(false);
    expect(b.shapePreviewCells('party-0', 'shape_row', 99)).toMatchObject({ valid: false, reason: 'Invalid cell' });
    expect(b.shapePreviewCells('party-0', 'fire_bolt', 4).valid).toBe(false);
  });

  it('ölü birim hücreyi doldurmaz: ölü düşman vurulmaz, hücresi boş sayılır', () => {
    const b = arena([['aoe_tester', 0]], WAR(3, 4, 5));
    b.get('enemy-1')!.hp = 0;
    expect(b.shapePreviewCells('party-0', 'shape_row', 4).targets).toEqual(['enemy-0', 'enemy-2']);
  });

  it('önizleme = gerçek vuruş: tüm şekiller, tüm anchor hücreler, iki taraf (hasar alan hedefler eşit; önizleme hedef listesi = vurulanlar)', () => {
    for (const actorSide of ['party', 'enemy'] as const) {
      for (const skill of ['shape_row', 'shape_column', 'shape_rect', 'shape_plus']) {
        for (let anchor = 0; anchor < 12; anchor++) {
          const foes = WAR(0, 1, 4, 5, 8, 9, 11);
          const b = actorSide === 'party' ? arena([['aoe_tester', 0]], foes) : arena(foes, [['aoe_tester', 0]]);
          const actor = actorSide === 'party' ? 'party-0' : 'enemy-0';
          const pv = b.shapePreviewCells(actor, skill, anchor);
          const prev = previewSkill(b, actor, skill, undefined, anchor).map((p) => p.uid).sort();
          expect(prev, `${actorSide} ${skill} @${anchor}`).toEqual([...pv.targets].sort());
          const r = b.useSkill(actor, skill, undefined, anchor);
          expect(r.ok, `${actorSide} ${skill} @${anchor}`).toBe(pv.valid);
          if (r.ok) {
            expect(dmgTargets(r.events).sort(), `${actorSide} ${skill} @${anchor}`).toEqual([...pv.targets].sort());
            const used = r.events.find((e) => e.type === 'skillUsed') as Extract<BattleEvent, { type: 'skillUsed' }>;
            expect(used.cells).toEqual(pv.cells);
            expect(used.anchor).toBe(anchor);
          }
        }
      }
    }
  });

  it('melee şekil skill\'i yalnızca erişilebilir (ön sıra) hücrelere vurur; arkada kalan hücre/anchor geçersiz (menzil KAPALI: eski kural)', () => {
    const melee = { melee_rect: { ...content.skills.shape_rect!, id: 'melee_rect', motion: 'melee' as const } };
    const b = arena([['aoe_tester', 0]], WAR(0, 4, 9), melee, ['melee_rect', 'shape_row', 'shape_column', 'shape_plus'], true);
    // ön sıra = sıra 0 (enemy-0). Rect @0 -> sıra 0,1: yalnızca sıra 0'daki düşman vurulur (sıra 1'deki enemy-1 erişim dışı)
    expect(b.shapePreviewCells('party-0', 'melee_rect', 0)).toMatchObject({ cells: [0, 1, 2, 3, 4, 5], targets: ['enemy-0'], valid: true });
    // rect @9 -> sıra 2,3: yalnızca arkadakiler: erişim dışı -> geçersiz
    expect(b.shapePreviewCells('party-0', 'melee_rect', 9)).toMatchObject({ targets: [], valid: false, reason: 'No target in reach' });
    expect(b.shapeAnchors('party-0', 'melee_rect')).toEqual([0, 1, 2]); // yalnızca sıra 0 anchor'ları (->0,1) ön sırayı kapsar
    const r = castAt(b, 'melee_rect', 0);
    expect(r.ok).toBe(true);
    if (r.ok) expect(dmgTargets(r.events)).toEqual(['enemy-0']);
    // arkadaki birim anchor olarak seçilirse (enemy-2 @9: şekli sıra 2,3) cast reddedilir
    expect(b.useSkill('party-0', 'melee_rect', 'enemy-2').ok).toBe(false);
  });

  it('taunt tek hedefli skill\'leri sınırlar; şekil skill\'leri taunt\'tan etkilenmez (mevcut alan skill kuralı)', () => {
    const b = arena([['aoe_tester', 0]], WAR(3, 4, 5));
    b.get('enemy-0')!.statuses.push({ kind: 'taunt', turns: 2, source: 'enemy-0', taken: 0 } as never);
    expect(b.shapePreviewCells('party-0', 'shape_row', 4).targets).toHaveLength(3);
  });

  it('tüm alan skill\'leri şekilli: eski radius / column_enemies yok; isAreaSkill = isShapeSkill', () => {
    const b = arena([['mage', 0]], WAR(1, 3, 4, 5, 7, 0, 9));
    for (const s of Object.values(content.skills)) {
      expect(s.target, s.id).not.toBe('column_enemies');
      expect(s.area ? 'radius' in s.area : false, s.id).toBe(false);
      if (s.target === 'area_enemies') {
        expect(b.isShapeSkill(s.id), s.id).toBe(true);
        expect(b.isAreaSkill(s.id), s.id).toBe(true);
      }
    }
    expect(b.areaCells('meteor', 4)).toEqual([1, 3, 4, 5, 7]);
  });

  it('turns modunda da çalışır; test modunda da: cooldown sayacı ve sıra kuralı bozulmaz', () => {
    const b = new Battle(content.battleSetup('random-battle', 3, 'turns', { party: ['aoe_tester', 'warrior'], enemies: ['warrior', 'archer', 'paladin'] }));
    for (let i = 0; i < 80 && !b.winner; i++) {
      const actor = b.currentUid!;
      const choice = chooseAction(b, actor, content.aiConfig);
      const r = b.applyChoice(actor, choice);
      expect(r.ok, `tur ${i}`).toBe(true);
    }
    expect(b.log.some((e) => e.type === 'skillUsed' && e.cells !== undefined && b.skill(e.skill)?.area?.shape !== undefined)).toBe(true);
  });
});

describe('AI: şekil adayları', () => {
  const ai = content.aiConfig;
  const only = (skill: string) => [skill];

  it('en çok hedef kapsayan anchor seçilir (tüm skill\'ler içinde brute-force ile aynı sayı)', () => {
    const b = arena([['aoe_tester', 0]], WAR(3, 4, 5, 6, 11));
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    const choice = chooseAction(b, 'party-0', ai, trace)!;
    const best = Math.max(...b.combatants[0]!.skills.flatMap((id) => b.shapeAnchors('party-0', id).map((a) => b.areaWindowAt('party-0', id, a).length)));
    const picked = b.areaWindowAt('party-0', choice.skillId, choice.slot ?? b.get(choice.targetUid!)!.slot);
    expect(picked).toHaveLength(best);
    expect(best).toBeGreaterThanOrEqual(4);
  });

  it('boş hücre anchor gerekirse seçilir (Cross Burst: iki düşman çapraz, ortak komşu hücre boş)', () => {
    // düşmanlar slot 0 ve 4; + anchor boş 1 ya da 3 ikisini de kapsar, dolu anchor tek kişi kapsar
    const b = arena([['aoe_tester', 0]], WAR(0, 4), {}, only('shape_plus'));
    const choice = chooseAction(b, 'party-0', ai)!;
    expect(choice.skillId).toBe('shape_plus');
    expect(choice.targetUid).toBeUndefined(); // boş hücre: birim yok
    expect([1, 3]).toContain(choice.slot);
    const r = b.applyChoice('party-0', choice);
    expect(r.ok).toBe(true);
    if (r.ok) expect(dmgTargets(r.events).sort()).toEqual(['enemy-0', 'enemy-1']);
  });

  it('rect kaydırma: arka sıradaki hedefleri kapsamak için anchor kaydırma ile seçilebilir', () => {
    const b = arena([['aoe_tester', 0]], WAR(7, 10), {}, only('shape_rect'));
    const choice = chooseAction(b, 'party-0', ai)!;
    const cells = shapeCells(content.skills.shape_rect!.area!, choice.slot ?? b.get(choice.targetUid!)!.slot, 'enemy', fm);
    expect(cells).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it('aday her anchor için bir tane (aynı hücre kümesi tek aday): satır skill\'inde sıra başına 1', () => {
    const b = arena([['aoe_tester', 0]], WAR(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11), {}, only('shape_row'));
    const trace: AiTrace = { options: [], reserves: [], steps: [] };
    chooseAction(b, 'party-0', ai, trace);
    expect(trace.options.filter((o) => o.skill.id === 'shape_row')).toHaveLength(4);
  });

  it('determinizm: aynı durum + iz var/yok = aynı karar; AI savaşı olay akışı aynı', () => {
    const mk = () => arena([['aoe_tester', 0]], WAR(0, 4, 5, 9, 10));
    const a = chooseAction(mk(), 'party-0', ai);
    const t: AiTrace = { options: [], reserves: [], steps: [] };
    expect(chooseAction(mk(), 'party-0', ai, t)).toEqual(a);
    expect(chooseAction(mk(), 'party-0', ai)).toEqual(a);
    const run = () => {
      const b = new Battle(content.battleSetup('random-battle', 9, 'turns', { party: ['aoe_tester', 'warrior', 'archer'], enemies: ['warrior', 'mage', 'defender', 'druid'] }));
      for (let i = 0; i < 300 && !b.winner; i++) b.applyChoice(b.currentUid!, chooseAction(b, b.currentUid!, ai));
      return JSON.stringify(b.log);
    };
    expect(run()).toBe(run());
  });
});

describe('maç kaydı: şekil adayları ve hamle', () => {
  it('aday satırı şekli ve hücre listesini yazar; hamle başlığı kapsanan hücreleri yazar', () => {
    const b = arena([['aoe_tester', 0]], WAR(0, 4, 5, 9), {}, undefined);
    const log = new MatchLog(b, { version: 'test' });
    const ex = explainChoice(b, 'party-0', content.aiConfig);
    log.noteAi(ex);
    const choice = chooseAction(b, 'party-0', content.aiConfig);
    expect(b.applyChoice('party-0', choice).ok).toBe(true);
    const text = log.serialize();
    expect(text).toMatch(/shape (row|column|plus|rect 2x3) @cell \d+ -> cells \[[\d,]+\]/);
    expect(text).toMatch(/hits \d+ foe\(s\)/);
    expect(text).toMatch(/\(center cell \d+ -> cells \[[\d,]+\]\)/);
    expect(text).toContain('area shape rect 2x3');
  });
});
