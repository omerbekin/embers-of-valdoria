import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { heroStats } from '../src/progression';
import { treeOf } from '../src/progression/skill-tree-data';
import { treeNodes, emptyAlloc } from '../src/progression/skill-tree';
import { setTreeTabDebug } from '../src/ui/tree-tab-model';
import { treePatchedSkill, nextPointLines, nextPointLinesFor, nextPointRows, NEXT_POINT_COLOR } from '../src/ui/skill-tree-preview';
import { skillTip } from '../src/ui/gear-skills';

// Skill ipucunda "sonraki ağaç puanı" önizlemesi (Ömer 2026-11-07): motorla derlenir, gerçek dağılım değişmez, puan yoksa satır yok.

const hero = { id: 'h', class: 'warrior', level: 30 };
describe('Skill tree next-point preview', () => {
  it('tab kapalıyken boş; açıkken en az bir skill için yeşil önizleme satırı; dağılım değişmez; puan yoksa boş', () => {
    setTreeTabDebug(false);
    const tree = treeOf('warrior')!;
    const stats = heroStats({ ...hero, equipment: undefined } as never)!;
    const skills = content.classes.warrior!.skills;
    const alloc = emptyAlloc(tree);
    const snap = JSON.stringify(alloc);
    const off = skills.flatMap((id) => nextPointLines(tree, 30, alloc, id, stats));
    // şalter ana kuralda açıksa önizleme zaten gelir; kapalıysa boş. İkisinde de debug anahtarıyla doğrulanır
    setTreeTabDebug(true);
    const on = skills.flatMap((id) => nextPointLines(tree, 30, alloc, id, stats));
    expect(on.length).toBeGreaterThan(0);
    expect(off.length === 0 || off.length === on.length).toBe(true);
    for (const l of on) {
      expect(l.changes.length).toBeGreaterThan(0);
      expect(l.changes[0]!.now).not.toBe(l.changes[0]!.after);
    }
    expect(JSON.stringify(alloc)).toBe(snap);
    // puan yok (level 1): önizleme yok
    expect(skills.flatMap((id) => nextPointLines(tree, 1, alloc, id, stats))).toEqual([]);
    // kahramandan kısayol + ipucu satırları yeşil
    const sk = skills.find((id) => nextPointLinesFor(hero, id, stats).length > 0)!;
    const tip = skillTip(content.skills[sk]!, stats, null, nextPointLinesFor(hero, sk, stats));
    const green = tip.rows.filter((r) => r.color === NEXT_POINT_COLOR);
    expect(green.length).toBeGreaterThan(0);
    expect(green.some((r) => r.text.includes('→') || r.text.includes('(new)'))).toBe(true);
    expect(nextPointRows([])).toEqual([]);
    expect(treeNodes().list.length).toBeGreaterThan(0);
    setTreeTabDebug(false);
  });

  it('treePatchedSkill: onaylı rank skill sayısını değiştirir, dağılım yoksa taban skill', () => {
    setTreeTabDebug(true);
    const tree = treeOf('mage')!;
    const stats = heroStats({ id: 'm', class: 'mage', level: 30 } as never)!;
    const base = content.skills.ice_crater!;
    const nl = nextPointLines(tree, 30, emptyAlloc(tree), 'ice_crater', stats).find((l) => l.changes.some((c) => c.now && c.after))!;
    const alloc = { v: tree.version, r: { [nl.key]: 1 } };
    const src = { class: 'mage', level: 30, tree: alloc };
    expect(treePatchedSkill({ class: 'mage', level: 30 }, base)).toBe(base);
    expect(JSON.stringify(treePatchedSkill(src, base))).not.toBe(JSON.stringify(base));
    setTreeTabDebug(false);
  });
});
