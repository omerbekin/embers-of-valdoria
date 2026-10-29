import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { classes, skills } from '../src/engine/content';
import type { SkillDef } from '../src/engine/types';
import {
  TREES,
  TREE_RULES,
  checkTreeFx,
  compileTree,
  debugFocusAlloc,
  loadoutSetup,
  setDebugTreeFocus,
  treeEnabled,
  treeKeys,
  treeOf,
  treeSetupFor,
  validateTreeData,
  type TreeData,
  type TreeRules,
} from '../src/progression';
import { anyOpen, check, counter, emptyAlloc, evoState, focusBuild, rankOf, repair, spent, status, take, treePool, ultArmsUsed, untake, validate, type TreeAlloc } from '../src/progression/skill-tree';
import { leveledCampaign, leveledRun } from './level-helpers';
import { battlePlan, debugTeleport, newCampaign, pickHero } from '../src/campaign';
import { newRun, wavePlan } from '../src/endless';

// Skill ağacı Faz 1a (docs/design/skill-tree-implementation.md 3.2 madde 1-12): kural modülü, veri doğrulama, derleyici, loadoutSetup bağlantısı.

const W = treeOf('warrior')!;
const D = treeOf('defender')!;
const L50 = 50;

/** Anahtarları sırayla alır (her biri geçerli olmalı). `n` tekrarı için 'key*n'. */
function build(tree: TreeData, level: number, steps: string[], from: TreeAlloc = emptyAlloc(tree), rules: TreeRules = TREE_RULES): TreeAlloc {
  let a = from;
  for (const s of steps) {
    const [key, times] = s.split('*');
    for (let i = 0; i < Number(times ?? 1); i++) {
      const r = take(tree, level, a, key!, rules);
      if (!r.ok) throw new Error(`${key}: ${r.block.code} ${r.block.text}`);
      a = r.alloc;
    }
  }
  return a;
}
/** Bir satırın tam A yolu (20 puan: f1 3, f2 5, f3 5, n0, r 3, ea, ma, fa). */
const fullA = (row: number) => [`${row}.f1*3`, `${row}.f2*5`, `${row}.f3*5`, `${row}.n0`, `${row}.r*3`, `${row}.ea`, `${row}.ma`, `${row}.fa`];
const code = (tree: TreeData, level: number, a: TreeAlloc, key: string) => check(tree, level, a, key)?.code ?? null;
const skillOf = (setup: ReturnType<typeof compileTree>, id: string): SkillDef => setup!.skills![id]!;

describe('kural modülü (3.2 madde 1-10)', () => {
  it('1: boş ağaç her level\'da geçerli; havuz = level - 1', () => {
    for (let lv = 1; lv <= 50; lv++) {
      expect(validate(W, lv, emptyAlloc(W))).toBeNull();
      expect(treePool(lv)).toBe(lv - 1);
    }
  });

  it('2: f1 en çok 3 rank; f2 için f1 gerekir; zincir boyunca gerek', () => {
    const a = build(W, L50, ['1.f1*3']);
    expect(code(W, L50, a, '1.f1')).toBe('max');
    expect(code(W, L50, emptyAlloc(W), '1.f2')).toBe('needs');
    expect(check(W, L50, emptyAlloc(W), '1.f2')!.text).toBe(`Needs ${W.nodes['1.f1']!.name}`);
    expect(code(W, L50, a, '1.f2')).toBeNull();
    expect(code(W, L50, a, '1.f3')).toBe('needs');
    expect(code(W, L50, build(W, L50, ['1.f2'], a), '1.f3')).toBeNull();
  });

  it('3: Tier II sayaç 5\'te açılır; sayaç GLOBAL (başka satırın puanı da açar), ult puanı açmaz', () => {
    const base = build(W, 20, ['1.f1', '1.f2', '1.f3', '2.f1']); // sayaç 4
    expect(check(W, 20, base, '1.n0')).toMatchObject({ code: 'tier', text: 'Tier II needs 5 tree points (have 4)' });
    const ult = build(W, 20, ['4.u1'], base);
    expect(counter(ult)).toBe(4);
    expect(code(W, 20, ult, '1.n0')).toBe('tier');
    const other = build(W, 20, ['3.f1'], base);
    expect(counter(other)).toBe(5);
    expect(code(W, 20, other, '1.n0')).toBeNull();
  });

  it('4: ea alınınca eb / mb / fb kilit (direction); ea geri alınınca açılır; ea + eb birlikte kayıtta geçersiz', () => {
    const a = build(W, L50, ['1.f1*3', '1.f2*5', '1.f3', '1.n0', '1.r', '1.ea']);
    for (const k of ['1.eb', '1.mb', '1.fb']) expect(check(W, L50, a, k)).toMatchObject({ code: 'direction', text: 'Other direction chosen' });
    expect(status(W, L50, a, '1.eb').st).toBe('dir');
    const back = untake(W, L50, a, '1.ea');
    expect(back.ok).toBe(true);
    if (back.ok) expect(code(W, L50, back.alloc, '1.eb')).toBeNull();
    const both: TreeAlloc = { v: a.v, r: { ...a.r, '1.eb': 1 } };
    expect(validate(W, L50, both)?.code).toBe('direction');
    expect(repair(W, L50, both).reset).toBe(true);
  });

  it('5: ult u1 L5, u2 L10, u3 L15; iç düğüm gerek; dolu kolda öbür kol ultArm (tek kol); ultCap tavanı (max kol boyundan küçükse)', () => {
    const e = emptyAlloc(W);
    expect(check(W, 4, e, '4.u1')).toMatchObject({ code: 'ultLevel', text: 'Ult node needs Lv 5 (you are Lv 4)' });
    expect(code(W, 5, e, '4.u1')).toBeNull();
    const u1 = build(W, 9, ['4.u1']);
    expect(code(W, 9, u1, '4.u2')).toBe('ultLevel');
    expect(code(W, 10, u1, '4.u2')).toBeNull();
    expect(code(W, 10, e, '4.u2')).toBe('needs');
    const u2 = build(W, 14, ['4.u2'], u1);
    expect(code(W, 14, u2, '4.u3')).toBe('ultLevel');
    const u3 = build(W, 15, ['4.u3'], u2);
    // tek kol (Ömer 2026-10-22) tavandan önce bakılır: kol doluyken öbür kol "başka kol seçildi" der
    expect(check(W, 15, u3, '4.r1')).toMatchObject({ code: 'ultArm', text: `One ult path only: the ${W.nodes['4.u1']!.name} path is already chosen` });
    expect(status(W, 15, u3, '4.r1').st).toBe('dir');
    // ultCap kural olarak durur: tavanı 2 olan kuralla (kol 3 düğüm) u3 reddedilir
    const cap2: TreeRules = { ...TREE_RULES, ult: { ...TREE_RULES.ult, max: 2 } };
    expect(check(W, 15, u2, '4.u3', {}, cap2)).toMatchObject({ code: 'ultCap', text: 'Ult takes 2 points at most' });
    expect(status(W, 15, u2, '4.u3', cap2).st).toBe('xl');
  });

  it('5b: ult tek kol (Ömer 2026-10-22): bir kolda puan varsa öbür üç kol ultArm; aynı kolda devam serbest; geri alınca serbest; iki kollu dağılım geçersiz, repair iade', () => {
    expect(TREE_RULES.ult.singleArm).toBe(true);
    const u1 = build(W, 15, ['4.u1']);
    for (const k of ['4.r1', '4.d1', '4.l1', '4.r2', '4.l3']) {
      expect(check(W, 15, u1, k), k).toMatchObject({ code: 'ultArm', text: `One ult path only: the ${W.nodes['4.u1']!.name} path is already chosen` });
      expect(status(W, 15, u1, k).st, k).toBe('dir');
    }
    const r1 = build(W, 15, ['4.r1']);
    expect(check(W, 15, r1, '4.u1')?.text).toBe(`One ult path only: the ${W.nodes['4.r1']!.name} path is already chosen`);
    // aynı kolda devam serbest
    const u2 = build(W, 15, ['4.u2'], u1);
    expect(code(W, 15, u2, '4.u3')).toBeNull();
    expect(take(W, 15, u2, '4.r1')).toMatchObject({ ok: false, block: { code: 'ultArm' } });
    // geri alınca seçim yeniden serbest
    const back = untake(W, 15, u1, '4.u1');
    expect(back.ok).toBe(true);
    if (back.ok) for (const k of ['4.r1', '4.d1', '4.l1']) expect(code(W, 15, back.alloc, k), k).toBeNull();
    // iki kolda puan (tavan içinde bile) geçersiz; okuma onarımı ağacın tamamını iade eder
    const two: TreeAlloc = { v: W.version, r: { '1.f1': 2, '4.u1': 1, '4.r1': 1 } };
    expect(validate(W, 15, two)).toMatchObject({ key: '4.r1', code: 'ultArm' });
    expect(repair(W, 15, two)).toEqual({ alloc: emptyAlloc(W), reset: true, dropped: [] });
    // bayrak kapalıysa kollar serbest (eski kural; yalnızca tavan)
    const multi: TreeRules = { ...TREE_RULES, ult: { ...TREE_RULES.ult, singleArm: false } };
    expect(validate(W, 15, two, multi)).toBeNull();
  });

  it('6: evolve: ma / mb yoksa needs; sayaç 22\'de evo, 23\'te açık; ikinci evolve 38; üçüncü evoCap', () => {
    const noM = build(W, L50, ['1.f1*3', '1.f2*5', '1.f3*5', '1.n0', '1.r*3', '1.ea', '1.fa', '2.f1*3', '2.f2*2']);
    expect(counter(noM)).toBe(24);
    expect(code(W, L50, noM, '1.v')).toBe('needs');
    const r1 = build(W, L50, [...fullA(1), '2.f1*2']);
    expect(check(W, L50, r1, '1.v')).toMatchObject({ code: 'evo', text: 'Evolve I needs 23 tree points (have 22)' });
    const e1 = build(W, L50, ['2.f1', '1.v'], r1);
    expect(evoState(e1)).toMatchObject({ n: 1, need: 38 });
    const r2 = build(W, L50, ['2.f2*5', '2.f3*4', '2.n0', '2.r', '2.ea', '2.ma'], e1);
    expect(counter(r2)).toBe(37);
    expect(check(W, L50, r2, '2.v')).toMatchObject({ code: 'evo', text: 'Evolve II needs 38 tree points (have 37)' });
    const e2 = build(W, L50, ['2.f3', '2.v'], r2);
    expect(evoState(e2).capped).toBe(true);
    expect(check(W, L50, e2, '3.v')).toMatchObject({ code: 'evoCap', text: 'Only 2 Evolves per hero' }); // tavan gerekten önce bakılır
  });

  it('7: odaklı kurulum (tek yön + B satırının Tier I\'i): Evolve I L25, Evolve II L40; L2-L50 hiçbir level\'da puan boşta kalmaz', () => {
    const cases: Array<[TreeData, [number, number]]> = [[W, [1, 2]], [D, [2, 3]], [treeOf('paladin')!, [1, 2]], [W, [0, 3]]];
    for (const [tree, rows] of cases)
      for (const dir of ['a', 'b'] as const) {
        const tag = `${tree.class} ${rows} ${dir}`;
        let prev = emptyAlloc(tree);
        for (let lv = 2; lv <= 50; lv++) {
          expect(anyOpen(tree, lv, prev), `${tag} L${lv} open`).toBe(true);
          const a = focusBuild(tree, rows, lv, { dir });
          expect(spent(a), `${tag} L${lv}`).toBe(lv - 1);
          expect(validate(tree, lv, a), `${tag} L${lv}`).toBeNull();
          expect(rankOf(a, `${rows[0]}.e${dir === 'a' ? 'b' : 'a'}`), tag).toBe(0);
          prev = a;
        }
        const evo = (lv: number) => evoState(focusBuild(tree, rows, lv, { dir })).n;
        expect([evo(24), evo(25), evo(39), evo(40)], tag).toEqual([0, 1, 1, 2]);
      }
    // ult kolu verilirse ult puanı kilit açılınca önce oraya (L5 / L10 / L15), yine puan boşta kalmaz
    const u = focusBuild(D, [2, 3], 15, { ult: 'r' });
    expect(['4.r1', '4.r2', '4.r3'].map((k) => rankOf(u, k))).toEqual([1, 1, 1]);
    expect(spent(u)).toBe(14);
  });

  it('7b: odaklı kurulum ult puanını hiçbir zaman iki kola dağıtmaz: ön ayar kolu; başlangıç dağılımında başka kol seçiliyse o kol sürer', () => {
    for (let lv = 5; lv <= 50; lv++) expect(ultArmsUsed(focusBuild(D, [2, 3], lv, { ult: 'r' })), `L${lv}`).toEqual(['r']);
    // kayıttaki ağaçta l kolu seçili: ön ayar r yerine l doldurulur (L10 l2, L15 l3), puan boşta kalmaz
    const from = build(D, 5, ['4.l1']);
    const b = focusBuild(D, [2, 3], 20, { ult: 'r', from });
    expect(ultArmsUsed(b)).toEqual(['l']);
    expect(['4.l1', '4.l2', '4.l3'].map((k) => rankOf(b, k))).toEqual([1, 1, 1]);
    expect(validate(D, 20, b)).toBeNull();
    expect(spent(b)).toBe(19);
    // kol verilmezse de en çok bir kol; debug / sim ön ayarları tek kol
    for (const lv of [5, 15, 30, 50]) expect(ultArmsUsed(focusBuild(W, [1, 2], lv)).length).toBeLessThanOrEqual(1);
    for (const cls of Object.keys(TREE_RULES.debugFocus ?? {})) {
      const a = debugFocusAlloc(cls, 50, 'b');
      if (a) expect(ultArmsUsed(a), cls).toEqual([TREE_RULES.debugFocus![cls]!.ult]);
    }
  });

  it('8: untake bağımlıyı bozuyorsa reddeder ("Needed by"); kademe / evolve sayacını düşürüyorsa reddeder', () => {
    const chain = build(W, L50, ['1.f1', '1.f2']);
    expect(untake(W, L50, chain, '1.f1')).toMatchObject({ ok: false, reason: `Needed by ${W.nodes['1.f2']!.name}` });
    expect(untake(W, L50, chain, '1.f2').ok).toBe(true);
    const tier = build(W, L50, ['1.f1*3', '1.f2', '1.f3', '1.n0']);
    const t = untake(W, L50, tier, '1.f1');
    expect(t.ok).toBe(false);
    if (!t.ok) expect(t.reason).toBe(`Tier II (5 pts) still needed by ${W.nodes['1.n0']!.name}`);
    const evo = build(W, L50, [...fullA(1), '2.f1*3', '1.v']);
    const v = untake(W, L50, evo, '2.f1');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe(`Counter 23 still needed by ${W.nodes['1.v']!.name}`);
    expect(untake(W, L50, emptyAlloc(W), '1.f1')).toMatchObject({ ok: false, reason: 'Nothing to remove' });
  });

  it('9: onaysız NEW düğüm alınamaz; approved: true olunca alınır (Ömer 2026-10-22: tüm NEW düğümler onaylı; bekleyen listesi hariç)', () => {
    const pending: TreeData = { ...W, nodes: { ...W.nodes, '1.v': { ...W.nodes['1.v']!, new: true, approved: false } } };
    const a = build(W, L50, [...fullA(1), '2.f1*3']);
    expect(check(pending, L50, a, '1.v')).toMatchObject({ code: 'unapproved', text: 'Awaiting approval' });
    expect(status(pending, L50, a, '1.v').st).toBe('new');
    expect(validate(pending, L50, build(W, L50, ['1.v'], a))?.code).toBe('unapproved');
    expect(code(W, L50, a, '1.v')).toBeNull();
    // Ömer 2026-10-22 ikinci tur: bekleyen tüm NEW düğümler onaylandı; gerçek veride her NEW approved: true olmalı.
    // Tek istisna listesi: Ömer'in henüz onaylamadığı NEW düğümler (approved: false kalmalı; onaylanınca listeden çıkar, veride true olur).
    // Şu an boş: archer 2.ea Sunder (Piercing Arrow öneri D, zırh -%20 / 2 tur) Ömer 2026-10-22 onayladı. Yeni bekleyen eklenirse: 'class key'.
    const awaiting = new Set<string>([]);
    for (const t of Object.values(TREES))
      for (const [k, n] of Object.entries(t.nodes)) if (n.new) expect(n.approved, `${t.class} ${k}`).toBe(!awaiting.has(`${t.class} ${k}`));
    for (const id of awaiting) {
      const [cls, k] = id.split(' ');
      expect(TREES[cls!]?.nodes[k!]?.new, `${id} listed as awaiting but is not a NEW node`).toBe(true);
    }
  });

  it('10: repair: bilinmeyen / tam sayı olmayan anahtar atılır, rank tavana kırpılır; geçersiz kalan dağılım tamamen iade; geçerli aynen (idempotent)', () => {
    const good = focusBuild(W, [1, 2], 30);
    expect(repair(W, 30, good)).toEqual({ alloc: good, reset: false, dropped: [] });
    const dirty = { v: 1, r: { ...good.r, 'x.zz': 2, '1.r': 2.5 } };
    const fixed = repair(W, 30, dirty);
    expect(fixed.dropped.sort()).toEqual(['1.r', 'x.zz']);
    expect(fixed.reset).toBe(true); // 1.r silinince ea / ma / evolve askıda: tamamı iade
    expect(fixed.alloc).toEqual(emptyAlloc(W));
    const clamp = repair(W, 30, { v: 1, r: { '1.f1': 9 } });
    expect(clamp).toEqual({ alloc: { v: 1, r: { '1.f1': 3 } }, reset: false, dropped: [] });
    expect(repair(W, 30, clamp.alloc)).toEqual(clamp);
    expect(repair(W, 10, good).reset).toBe(true); // level havuzunu aşan
    expect(repair(W, 30, null)).toEqual({ alloc: emptyAlloc(W), reset: false, dropped: [] });
  });
});

describe('veri doğrulama (3.2 madde 11)', () => {
  it('her class dosyası: 48 satır + 12 ult anahtarı, ad / metin sınırı, satır skill\'leri class sırasıyla, NEW approved taşır', () => {
    expect(treeKeys()).toHaveLength(60);
    expect(Object.keys(TREES).sort()).toEqual(['antimage', 'archer', 'cutthroat', 'defender', 'druid', 'gambler', 'hexer', 'mage', 'paladin', 'undead', 'vesper', 'warrior']); // vesper: taslak (2026-10-28)
    for (const t of Object.values(TREES)) expect(validateTreeData(t), t.class).toEqual([]);
  });

  it('her fx gerçek skills.json tanımına karşı derlenir (seçici ve alan var); doğrulayıcı bozuk veriyi yakalar', () => {
    for (const t of Object.values(TREES)) expect(checkTreeFx(t), t.class).toEqual([]);
    const bad: TreeData = {
      ...D,
      nodes: {
        ...D.nodes,
        '2.f1': { ...D.nodes['2.f1']!, fx: [{ k: 'skill', sel: 'guard', f: 'share', op: 'add', v: 0.1 }] },
        '2.f2': { ...D.nodes['2.f2']!, fx: [{ k: 'skill', sel: 'taunt', f: 'power', op: 'add', v: 0.1 }] },
        '0.f1': { ...D.nodes['0.f1']!, fx: [{ k: 'skill', sel: 'self', f: 'cooldown', op: 'add', v: 1 }] },
      },
    };
    const errs = checkTreeFx(bad);
    expect(errs.some((e) => e.includes('2.f1') && e.includes('matches nothing'))).toBe(true);
    expect(errs.some((e) => e.includes('2.f2') && e.includes('not patchable'))).toBe(true);
    expect(errs.some((e) => e.includes('0.f1') && e.includes('needs a "skill"'))).toBe(true);
    const broken: TreeData = { ...W, rows: [W.rows[0]!, W.rows[2]!, W.rows[1]!, W.rows[3]!], nodes: { ...W.nodes, '1.f1': { ...W.nodes['1.f1']!, name: 'x'.repeat(30) } } };
    const v = validateTreeData(broken);
    expect(v.some((e) => e.includes('row 1 skill'))).toBe(true);
    expect(v.some((e) => e.includes('name longer'))).toBe(true);
  });

  it('final.js\'te seçimi biten (try olmayan) her class\'ın dosyası var; seçimi süren class (try) içe aktarılmaz', () => {
    const file = path.resolve(__dirname, '../public/mockups/skill-tree-moments/final.js');
    if (!fs.existsSync(file)) return; // mockup klasörü yoksa (yayın kopyası) atla
    const ctx = { window: {} as { SMM_FINAL?: Record<string, { rows: string[]; try?: Record<string, string[]> }> } };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
    const final = ctx.window.SMM_FINAL ?? {};
    for (const [cls, f] of Object.entries(final)) {
      if (f.try && Object.keys(f.try).length) continue;
      expect(TREES[cls], `${cls} has a final.js pick but no data/skill-trees/${cls}.json (node tools/tree-import.mjs ${cls})`).toBeDefined();
      expect(TREES[cls]!.picked.rows).toEqual(f.rows);
    }
  });
});

describe('derleyici (3.2 madde 12 + pasif yaması)', () => {
  const L = 50;
  const taunt = (a: TreeAlloc) => skillOf(compileTree(D, a), 'taunt').effects[0] as unknown as { breakRatio: number; allyDamageMult: number; turns: number };
  const toR = ['2.f1*3', '2.f2*5', '2.f3*2', '2.n0', '2.r*3']; // sayaç 14: edge ile 15 (Tier IV)
  const dv = (id: string, i = 0) => (D.nodes[id]!.fx![i] as unknown as { v: number }).v; // düğüm sayısı veriden (denge turunda değişebilir)
  const bellow3 = 0.25 + 3 * dv('2.f1'); // temel 0,25 + Bellow 3 rank
  const roarRatio = dv('2.fb', 2) + 3 * dv('2.f1'); // Hollow Roar tabanı + Bellow 3 rank

  it('Bellow 3 rank -> breakRatio 0,34; Rally Cry 3 -> allyDamageMult 0,84; temel tanım değişmez', () => {
    expect(taunt(build(D, L, ['2.f1*3'])).breakRatio).toBeCloseTo(bellow3, 9);
    expect(taunt(build(D, L, toR)).allyDamageMult).toBeCloseTo(0.9 + 3 * dv('2.r'), 9);
    expect((skills.taunt!.effects[0] as unknown as { breakRatio: number }).breakRatio).toBe(0.25);
  });

  it('Hollow Roar + Bellow -> 0,24 (Ömer 2026-10-22: %15 Bellow\'un üstüne eklenir; op base); Ironbound Oath (set 0) Bellow\'u siler', () => {
    const roar = compileTree(D, build(D, L, [...toR, '2.eb', '2.fb']));
    const t = skillOf(roar, 'taunt');
    expect((t.effects[0] as unknown as { breakRatio: number }).breakRatio).toBeCloseTo(roarRatio, 9);
    expect(t.cost.amount).toBe(dv('2.fb', 0));
    expect(t.cooldown).toBe(2); // Brief Defiance (eb) 3, sonra Hollow Roar (fb) 2: sütun sırası
    const oath = taunt(build(D, L, [...toR, '2.ea', '2.fa']));
    expect(oath.breakRatio).toBe(0); // falsy = hiç kırılmaz (battle.ts)
    expect(oath.allyDamageMult).toBe(1);
    expect(oath.turns).toBe(3); // Stand Fast (ea)
  });

  it('Iron Meteor -> bonusScale armor pct 0,4 + count 2; Plated Gauntlet 0,15', () => {
    const fist = (a: TreeAlloc) => skillOf(compileTree(D, a), 'fist_crush') as SkillDef & { count: number; effects: Array<{ bonusScale: Array<{ pct: number }> }> };
    const g = fist(build(D, 5, ['4.r1']));
    expect(g.effects[0]!.bonusScale[0]!.pct).toBe(dv('4.r1'));
    expect(g.count).toBe(3);
    const m = fist(build(D, 15, ['4.r1', '4.r2', '4.r3']));
    expect(m.effects[0]!.bonusScale[0]!.pct).toBe(dv('4.r3'));
    expect(m.count).toBe(2);
  });

  it('fx null düğüm derlemeye girmez; yalnızca fx null düğümler -> undefined (birim bugünküyle aynı)', () => {
    // Faz 2b: gerçek veride fx'ler yazıldı; "yalnızca fx null" durumu fx'leri silinmiş kopyayla denenir
    const bare = (t: typeof W): typeof W => {
      const c = JSON.parse(JSON.stringify(t)) as typeof W;
      for (const n of Object.values(c.nodes)) n.fx = null;
      for (const bb of c.mastery.bar) bb.fx = null;
      return c;
    };
    expect(compileTree(bare(W), build(W, L, ['1.f1*3']))).toBeUndefined();
    expect(compileTree(bare(treeOf('paladin')!), focusBuild(treeOf('paladin')!, [1, 2], 50))).toBeUndefined();
    const ns = compileTree(W, build(W, L, ['1.f1*3', '1.f2*5']));
    expect(Object.keys(ns!.skills!)).toEqual(['melee_attack']);
    expect(ns!.passive).toBeUndefined();
  });

  it('Warrior: Notched Axe (+4% power / rank, yalnızca 2. vuruş) oransal; percentRule add\'e çevrilince düz ek; Steady Spin, Headsman\'s Feast', () => {
    const a = build(W, L, ['1.f1*3', '1.f2*5']);
    const hits = (s: SkillDef) => s.effects.filter((e) => e.type === 'damage').map((e) => (e as unknown as { power: number }).power); // Knee Cutter (1.f1) durum etkisi ekler
    const NA = (W.nodes['1.f2']!.fx![0] as unknown as { v: number }).v; // veriden
    const close = (got: number[], want: number[]) => { expect(got.length).toBe(want.length); got.forEach((x, i) => expect(x).toBeCloseTo(want[i]!, 9)); };
    const DS = hits(skills.melee_attack!)[0]!; // Double Strike vuruş başı temel power (veriden; 2026-10-29 0.40 -> 0.38)
    close(hits(skillOf(compileTree(W, a), 'melee_attack')), [DS, DS * (1 + 5 * NA)]);
    const add: TreeRules = { ...TREE_RULES, percentRule: 'add' };
    close(hits(skillOf(compileTree(W, a, add), 'melee_attack')), [DS, DS + 5 * NA]);
    const spin = skillOf(compileTree(W, build(W, L, ['2.f1*3'])), 'whirlwind');
    expect((spin.effects[0] as unknown as { lifesteal: number }).lifesteal).toBeCloseTo(0.2 + 3 * (W.nodes['2.f1']!.fx![0] as unknown as { v: number }).v, 9);
    const feast = skillOf(compileTree(W, build(W, 5, ['4.u1'])), 'headsmans_blow');
    expect((feast.effects[0] as unknown as { lifesteal: number }).lifesteal).toBe((W.nodes['4.u1']!.fx![0] as unknown as { v: number }).v);
  });

  it('pasif yaması (sentetik düğüm): pasif kopyası yamalanır, sınıf pasifi değişmez; Mastery bar fx sayaçla açılır', () => {
    const syn: TreeData = {
      ...W,
      nodes: { ...W.nodes, '0.f1': { ...W.nodes['0.f1']!, fx: [{ k: 'passive', f: 'rageOnHurt.perHitCap', op: 'add', v: 5, rank: true }] } },
      mastery: { ...W.mastery, bar: W.mastery.bar.map((b, i) => (i === 0 ? { ...b, fx: [{ k: 'passive' as const, f: 'maxBonus', op: 'pct' as const, v: 0.1 }] } : b)) },
    };
    const two = compileTree(syn, build(syn, L, ['0.f1*2']))!;
    const eff = two.passive!.effect as unknown as { rageOnHurt: { perHitCap: number }; maxBonus: number };
    expect(eff.rageOnHurt.perHitCap).toBe(25);
    expect(eff.maxBonus).toBe(0.8); // sayaç 2 < 5: bar kapalı
    const five = compileTree(syn, build(syn, L, ['0.f1*3', '0.f2*2']))!.passive!.effect as unknown as { rageOnHurt: { perHitCap: number }; maxBonus: number };
    expect(five.rageOnHurt.perHitCap).toBe(30);
    expect(five.maxBonus).toBe(0.88);
    expect((classes.warrior!.passive!.effect as unknown as { rageOnHurt: { perHitCap: number } }).rageOnHurt.perHitCap).toBe(15);
  });
});

describe('loadoutSetup bağlantısı + debug odaklı kurulum', () => {
  afterEach(() => setDebugTreeFocus(null));
  const alloc = (lv: number) => focusBuild(D, [2, 3], lv, { ult: 'r' });

  it('ana şalter kapalıyken: dağılım verilse de hiçbir modda tree yok; mod verilmezse hiç yok', () => {
    const prev = TREE_RULES.enabled;
    TREE_RULES.enabled = false;
    try {
      expect(TREE_RULES.modes).toEqual({ campaign: true, endless: true, quick: false, multiplayer: false });
      for (const mode of ['campaign', 'endless', 'quick', 'multiplayer'] as const) {
        expect(treeEnabled(mode)).toBe(false);
        expect(loadoutSetup({ class: 'defender', level: 20, tree: alloc(20) }, { mode }).tree).toBeUndefined();
      }
      expect(loadoutSetup({ class: 'defender', level: 20, tree: alloc(20) }).tree).toBeUndefined();
    } finally {
      TREE_RULES.enabled = prev;
    }
  });

  it('gönderilen şalter açık: sefer / Endless ağaç alır, QB / MP almaz; harcanmış puanı olmayan kahraman ağaçsızla aynı', () => {
    expect(TREE_RULES.enabled).toBe(true);
    const src = { class: 'defender', level: 20, tree: alloc(20) };
    expect(treeEnabled('campaign') && treeEnabled('endless')).toBe(true);
    expect(treeEnabled('quick') || treeEnabled('multiplayer')).toBe(false);
    expect(loadoutSetup(src, { mode: 'campaign' }).tree).toBeDefined();
    expect(loadoutSetup(src, { mode: 'endless' }).tree).toBeDefined();
    expect(loadoutSetup(src, { mode: 'quick' }).tree).toBeUndefined();
    expect(loadoutSetup(src, { mode: 'multiplayer' }).tree).toBeUndefined();
    expect(loadoutSetup(src).tree).toBeUndefined();
    const bare = { class: 'defender', level: 20 };
    const empty = { ...bare, tree: { v: D.version, r: {} } };
    for (const mode of ['campaign', 'endless'] as const) {
      expect(loadoutSetup(bare, { mode }).tree).toBeUndefined();
      expect(loadoutSetup(empty, { mode })).toEqual(loadoutSetup(bare, { mode }));
    }
  });

  it('şalter açıkken: sefer / Endless derlenir, QB / MP derlenmez; geçersiz dağılım ya da ağacı olmayan class -> yok', () => {
    const on: TreeRules = { ...TREE_RULES, enabled: true };
    const src = { class: 'defender', level: 20, tree: alloc(20) };
    expect(treeSetupFor(src, 'campaign', on)?.skills?.taunt).toBeDefined();
    expect(treeSetupFor(src, 'endless', on)?.skills?.fist_crush).toBeDefined();
    expect(treeSetupFor(src, 'quick', on)).toBeUndefined();
    expect(treeSetupFor(src, 'multiplayer', on)).toBeUndefined();
    expect(treeSetupFor({ ...src, level: 5 }, 'campaign', on)).toBeUndefined(); // havuzu aşan
    expect(treeOf('aoe_tester')).toBeUndefined();
    expect(treeSetupFor({ class: 'aoe_tester', level: 20, tree: { v: 1, r: { '1.f1': 1 } } }, 'campaign', on)).toBeUndefined(); // ağaç verisi olmayan class (test class'ı)
  });

  it('debug odaklı kurulum: şalter kapalıyken de sefer / Endless kahramanına _rules.json > debugFocus ön ayarıyla ağaç verir, QB vermez', () => {
    expect(loadoutSetup({ class: 'defender', level: 20 }, { mode: 'campaign' }).tree).toBeUndefined();
    setDebugTreeFocus({ dir: 'a' });
    expect(Object.keys(loadoutSetup({ class: 'defender', level: 20 }, { mode: 'campaign' }).tree!.skills!).sort()).toEqual(['close_ranks', 'fist_crush', 'taunt']); // Faz 2b: bar 15 Formed Up Close Ranks'e bedel koşulu ekler
    const a = loadoutSetup({ class: 'defender', level: 35 }, { mode: 'campaign' }).tree!;
    expect(Object.keys(a.skills!).sort()).toEqual(['close_ranks', 'fist_crush', 'taunt']); // L35: Close Ranks satırı Hold Their Weight'e (3.ea) ulaştı
    expect((a.skills!.close_ranks!.effects[0] as unknown as { share: number }).share).toBe(0.65);
    expect(debugFocusAlloc('defender', 20, 'a')).toEqual(focusBuild(D, [2, 3], 20, { dir: 'a', ult: 'r' }));
    expect(loadoutSetup({ class: 'defender', level: 20 }, { mode: 'quick' }).tree).toBeUndefined();
    expect(loadoutSetup({ class: 'defender', level: 20 }).tree).toBeUndefined();
    expect(loadoutSetup({ class: 'paladin', level: 30 }, { mode: 'endless' }).tree).toBeDefined(); // Faz 2b: Paladin fx'leri yazıldı
    setDebugTreeFocus({ dir: 'b' });
    const b = loadoutSetup({ class: 'defender', level: 30 }, { mode: 'endless' }).tree!;
    expect((b.skills!.taunt!.effects[0] as unknown as { breakRatio: number }).breakRatio).toBeCloseTo((D.nodes['2.fb']!.fx![2] as unknown as { v: number }).v + 3 * (D.nodes['2.f1']!.fx![0] as unknown as { v: number }).v, 9); // Hollow Roar (fb) + Bellow 3
  });

  it('sefer ve Endless savaş planı: debug açıkken Warrior / Defender biriminin kurulumunda tree var, kapalıyken yok', () => {
    const s0 = leveledCampaign(debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 21 }), 'warrior'), '5A'), 20);
    const first = s0.active.find(Boolean); // ışınlanma kadroyu o noktanın hazır takımıyla doldurur: ilk kahraman Warrior yapılır
    const s = { ...s0, roster: s0.roster.map((h) => (h.id === first ? { ...h, class: 'warrior' } : h)) };
    const run = leveledRun(newRun(5, ['warrior', 'mage', 'archer', 'defender'], 't'), 20);
    const trees = () => [...Object.values(battlePlan(s).units.party), ...Object.values(wavePlan(run).units.party)].filter((u) => u.tree).length;
    expect(trees()).toBe(0);
    setDebugTreeFocus({ dir: 'a' });
    expect(trees()).toBe(3); // sefer Warrior + Endless Warrior + Defender (Mage / Archer: debugFocus ön ayarı yok, ağaç verilmez)
  });
});
