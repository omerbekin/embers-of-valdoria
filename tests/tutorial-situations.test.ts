import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { Teams } from '../src/engine';
import { selectSituations, turnSituations } from '../src/tutorial/situations';
import { dueBattleLesson, type BattleLessonCtx } from '../src/tutorial/lessons';

// Durum dersleri (Ömer 2026-10-14, docs/design/tutorial.md > Durum dersleri): gerçek savaş durumundan saf tespit (src/tutorial/situations.ts).

const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');

/** Hasarsız savaş kurar ve verilen kahramanın sırasına kadar (diğer herkes YZ ile) oynar. */
function battleAt(party: Record<number, string>, enemies: Record<number, string>, slot: number, seed = 3): { b: Battle; uid: string } {
  const teams: Teams = { party: cells(party), enemies: cells(enemies) };
  const b = new Battle(content.battleSetup('random-battle', seed, 'turns', teams, false));
  b.debug.damageMult = 0;
  const uid = b.combatants.find((c) => c.side === 'party' && c.slot === slot)!.uid;
  for (let n = 0; n < 200 && b.currentUid !== uid; n++) b.applyChoice(b.currentUid!, chooseAction(b, b.currentUid!, content.aiConfig));
  expect(b.currentUid).toBe(uid);
  return { b, uid };
}
const whens = (s: { when: string }[]) => s.map((x) => x.when);

describe('karar başı durumları (sırası gelen kahraman)', () => {
  it('Rest: MP isteyen skill\'lerin hiçbiri MP yetmediği için kullanılamıyor; MP doluyken yok', () => {
    const { b, uid } = battleAt({ 1: 'mage' }, { 1: 'warrior' }, 1);
    expect(whens(turnSituations(b, uid))).not.toContain('rest');
    b.debugSetResource(uid, 'mp', 0);
    const s = turnSituations(b, uid).find((x) => x.when === 'rest');
    expect(s?.skill).toBeDefined();
    expect(b.skill(s!.skill!)?.cost.resource).toBe('mp');
  });

  it('Rest: yalnızca en ucuz büyüye yeten MP de Rest durumudur; güçlü büyüye yeten MP değil', () => {
    const { b, uid } = battleAt({ 1: 'mage' }, { 1: 'warrior' }, 1);
    const me = b.get(uid)!;
    const costs = me.skills.filter((id) => b.skill(id)?.cost.resource === 'mp').map((id) => b.skill(id)!.cost.amount).sort((x, y) => x - y);
    b.debugSetResource(uid, 'mp', costs[0]!); // yalnızca en ucuz
    expect(whens(turnSituations(b, uid))).toContain('rest');
    b.debugSetResource(uid, 'mp', costs[1]!); // ikinci en ucuza da yetiyor
    expect(whens(turnSituations(b, uid))).not.toContain('rest');
  });

  it('Move: arka sıradaki yakın dövüşçü hiçbir düşmana ulaşamıyor (önünde dost var); ön sıradayken yok', () => {
    const back = battleAt({ 1: 'mage', 10: 'warrior' }, { 1: 'archer' }, 10);
    back.b.get(back.uid)!.cooldowns['charge'] = 3; // Charge (ön sıra şartı yok) beklemede
    const s = turnSituations(back.b, back.uid);
    expect(whens(s)).toContain('move');
    expect(whens(s)).not.toContain('skip');
    const front = battleAt({ 1: 'warrior' }, { 1: 'archer' }, 1);
    expect(whens(turnSituations(front.b, front.uid))).not.toContain('move');
  });

  it('Skip: hiçbir skill kullanılamıyor ve Rest / Move çözüm değil', () => {
    const { b, uid } = battleAt({ 1: 'warrior' }, { 1: 'archer' }, 1);
    expect(whens(turnSituations(b, uid))).not.toContain('skip');
    const me = b.get(uid)!;
    for (const id of me.skills) me.cooldowns[id] = 3;
    expect(whens(turnSituations(b, uid))).toContain('skip');
  });

  it('Ultimate: 4. skill kullanılabilir olunca, o skill ile', () => {
    const { b, uid } = battleAt({ 1: 'mage' }, { 1: 'warrior' }, 1);
    const me = b.get(uid)!;
    const ult = me.skills[3]!;
    me.cooldowns[ult] = 2;
    expect(whens(turnSituations(b, uid))).not.toContain('ultimate');
    me.cooldowns[ult] = 0;
    b.debugSetResource(uid, 'mp', me.maxMp);
    expect(turnSituations(b, uid).find((x) => x.when === 'ultimate')?.skill).toBe(ult);
  });

  it('Harcandı (Skills and MP): kahramanın kullandığı skill beklemede ya da MP harcandı; savaş başında yok', () => {
    const { b, uid } = battleAt({ 1: 'mage' }, { 1: 'warrior' }, 1);
    expect(whens(turnSituations(b, uid))).not.toContain('spent');
    const me = b.get(uid)!;
    const mpSkill = me.skills.find((id) => b.skill(id)?.cost.resource === 'mp' && b.canUse(uid, id).ok && b.validTargets(uid, id)[0]?.side === 'enemy')!;
    expect(b.useSkill(uid, mpSkill, b.validTargets(uid, mpSkill)[0]!.uid).ok).toBe(true);
    for (let n = 0; n < 200 && b.currentUid !== uid; n++) b.applyChoice(b.currentUid!, chooseAction(b, b.currentUid!, content.aiConfig));
    if (me.mp >= me.maxMp) b.debugSetResource(uid, 'mp', me.maxMp - 1);
    expect(turnSituations(b, uid).find((x) => x.when === 'spent')?.skill).toBe(mpSkill);
  });

  it('Durum, zararlı zemin (üstünde / yanında), boss telgrafı', () => {
    const { b, uid } = battleAt({ 1: 'warrior' }, { 1: 'archer' }, 1);
    expect(whens(turnSituations(b, uid))).toEqual(expect.not.arrayContaining(['status', 'ground', 'telegraph']));
    b.debugAddStatus(uid, 'slow', 2);
    expect(whens(turnSituations(b, uid))).toContain('status');
    const enemy = b.living('enemy')[0]!;
    // dostun bıraktığı zemin zararsız: ders yok
    b.ground.push({ id: 'g1', ground: 'burning', board: 'party', slots: [2], turns: 2, source: uid, sourceSide: 'party', amount: 5 });
    expect(whens(turnSituations(b, uid))).not.toContain('ground');
    b.ground.push({ id: 'g2', ground: 'burning', board: 'party', slots: [2], turns: 2, source: enemy.uid, sourceSide: 'enemy', amount: 5 }); // yan hücre
    expect(whens(turnSituations(b, uid))).toContain('ground');
    b.telegraphs.push({ id: 't1', source: enemy.uid, skill: 'x', kind: 'area', board: 'party', cells: [1] } as unknown as (typeof b.telegraphs)[number]);
    expect(whens(turnSituations(b, uid))).toContain('telegraph');
  });

  it('düşman sırasında durum yok', () => {
    const { b } = battleAt({ 1: 'warrior' }, { 1: 'archer' }, 1);
    const enemy = b.living('enemy')[0]!;
    expect(turnSituations(b, enemy.uid)).toEqual([]);
  });
});

describe('skill seçimi durumları', () => {
  it('Rows and Reach: yakın dövüş arka sıradaki düşmana ulaşamıyor; tek sıralı düşmanda yok', () => {
    const deep = battleAt({ 1: 'warrior' }, { 1: 'warrior', 10: 'archer' }, 1);
    expect(whens(selectSituations(deep.b, deep.uid, 'melee_attack'))).toEqual(['reach']);
    const flat = battleAt({ 1: 'warrior' }, { 0: 'warrior', 2: 'archer' }, 1);
    expect(selectSituations(flat.b, flat.uid, 'melee_attack')).toEqual([]);
  });

  it('Area Shapes: alan skill\'i seçilince', () => {
    const { b, uid } = battleAt({ 1: 'mage' }, { 1: 'warrior' }, 1);
    const area = b.get(uid)!.skills.find((id) => b.isAreaSkill(id) || b.isShapeSkill(id))!;
    expect(whens(selectSituations(b, uid, area))).toContain('area');
  });
});

describe('uçtan uca: durum -> ders', () => {
  const ctx: BattleLessonCtx = { node: '2', region: 'I', encounter: 'ravenwood_pack', defeats: 0 };
  const prog = { seen: new Set<string>(), done: new Set<string>(), shows: () => 0, thisBattle: new Set<string>() };
  it('MP biten büyücü: Rest dersi, Rest düğmesine odaklı', () => {
    const { b, uid } = battleAt({ 1: 'mage' }, { 1: 'warrior' }, 1);
    b.debugSetResource(uid, 'mp', 0);
    const d = dueBattleLesson(ctx, turnSituations(b, uid), prog);
    expect(d?.lesson.id).toBe('rest');
    expect(d?.lesson.focus).toBe('[data-global=rest]');
    // Mill Road'da (senaryo savaşı) aynı durum ders çıkarmaz
    expect(dueBattleLesson({ ...ctx, node: '1' }, turnSituations(b, uid), prog)).toBeNull();
  });
});
