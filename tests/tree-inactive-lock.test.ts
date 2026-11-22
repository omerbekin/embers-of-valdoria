// Pasif (inactive) düğümler ağaçta kilitli: puan verilemez (mantık + oturum + otomatik dağıtım).
import { describe, expect, it } from 'vitest';
import { TREE_RULES, treeOf, type TreeData } from '../src/progression/skill-tree-data';
import { check, focusBuild, isInactive, rankOf, treeNodes, validate } from '../src/progression/skill-tree';
import { bandTipHtml } from '../src/ui/band-tip';
import { INACTIVE_TXT, inactiveTipSpec } from '../src/ui/tree-tab';
import { addPending, makeSession, nodeStatus } from '../src/ui/tree-tab-model';

// Redtithe ağacının pasif düğümleri r36'da (Ömer 2026-11-20) etkinleşti: kilit mantığı sentetik veriyle sınanır (Redtithe kopyası, birkaç düğüm pasif)
const tree = JSON.parse(JSON.stringify(treeOf('antimage')!)) as TreeData;
for (const k of ['0.f1', '0.eb', '2.ea', '3.v']) tree.nodes[k]!.inactive = true;
const keys = treeNodes(TREE_RULES).list.map((n) => n.key).filter((k) => isInactive(tree, k));

describe('inactive düğüm kilidi', () => {
  it('sentetik ağaçta pasif düğüm var', () => expect(keys).toEqual(['0.f1', '0.eb', '2.ea', '3.v']));
  it('check reddeder, durum kilitli', () => {
    for (const k of keys) {
      expect(check(tree, 40, { v: tree.version, r: {} }, k)?.code).toBe('inactive');
    }
  });
  it('oturumda puan eklenemez', () => {
    const s = { ...makeSession({ id: 'h', class: 'antimage', level: 40, skillPoints: 39 })!, tree };
    for (const k of keys) {
      expect(nodeStatus(s, k, TREE_RULES).block?.code).toBe('inactive');
      expect(addPending(s, k, TREE_RULES).ok).toBe(false);
    }
  });
  it('validate pasif düğümde puanı reddeder', () => {
    const r: Record<string, number> = { [keys[0]!]: 1 };
    expect(validate(tree, 40, { v: tree.version, r })?.code).toBe('inactive');
  });
  it('otomatik dağıtım pasif düğüme puan koymaz', () => {
    const a = focusBuild(tree, [1, 2], 40);
    for (const k of keys) expect(rankOf(a, k)).toBe(0);
  });
  it('kilitli ipucunda cümle tam bir kez, LOCKED etiketi ve başlık kalır', () => {
    const html = bandTipHtml(inactiveTipSpec('Mastery bonus · X', 'Some Node'));
    expect(html.split(INACTIVE_TXT).length - 1).toBe(1);
    expect(html).toContain('Locked');
    expect(html).toContain('Some Node');
  });
});
