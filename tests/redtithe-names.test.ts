import { describe, expect, it } from 'vitest';
import { content, describeSkill } from '../src/engine';
import { treeOf } from '../src/progression';
import { buildWiki, buildWikiStatuses } from '../src/wiki/catalog';

// Redtithe (id antimage, engine-dev 2026-11-17): oyuncunun gördüğü metinlerde eski Anti-Mage kitinin adları kalmamalı.
// Sürüm notları (data/patch-notes.json) bilerek denetlenmez: geçmiş kayıttır. Pasif (inactive) ağaç düğümleri de görünmez, dışarıda.
const OLD = /Anti-Mage|Mana Steal|Ley Brand|Ley Thread|Spell Ward|Void Strike|Spellbreaker|tainted/;

describe('Redtithe: eski ad taraması', () => {
  it('sınıf adı, tanıtım, pasif, skill adları ve açıklamaları', () => {
    const c = content.classes.antimage!;
    expect(c.name).toBe('Redtithe');
    const texts = [c.name, c.blurb ?? '', c.passive?.name ?? '', c.passive?.text ?? ''];
    for (const id of c.skills) {
      const sk = content.skills[id]!;
      texts.push(sk.name, ...describeSkill(sk, c.stats, content.formulas, content.summons, { statuses: content.statuses, grounds: content.grounds }).lines);
    }
    for (const t of texts) expect(t).not.toMatch(OLD);
  });

  it('Redtithe durumları (Blood Brand; Mirror Vein artık kalkan, durum yok) ve etkin ağaç düğümleri', () => {
    expect(content.statuses.mirror_vein).toBeUndefined();
    for (const k of ['blood_brand']) {
      const st = content.statuses[k]!;
      expect(`${st.name} ${st.text}`).not.toMatch(OLD);
    }
    const t = treeOf('antimage')!;
    for (const r of t.rows) expect(r.name).not.toMatch(OLD);
    expect(t.ult.name).not.toMatch(OLD);
    for (const [k, n] of Object.entries(t.nodes)) if (!n.inactive) expect(`${k}: ${n.name} ${n.text} ${n.syn ?? ''}`).not.toMatch(OLD);
    for (const b of t.mastery.bar) if (!b.inactive) expect(b.text).not.toMatch(OLD);
  });

  it('wiki: mekanik makaleleri ve sınıf sayfası eski adları anmaz', () => {
    const w = buildWiki({ sprites: {}, avatars: {} });
    const bad: string[] = [];
    for (const a of w.mechanics) {
      const text = [a.title, ...a.blocks.flatMap((x) => (x.kind === 'p' ? [x.text] : x.kind === 'list' ? x.items : []))].join(' ');
      if (OLD.test(text)) bad.push(`${a.id}: ${text.match(OLD)![0]}`);
    }
    const cls = w.classes.find((u) => u.id === 'antimage')!;
    expect(cls).toBeDefined();
    if (OLD.test(JSON.stringify(cls))) bad.push(`class: ${JSON.stringify(cls).match(OLD)![0]}`);
    expect(bad).toEqual([]);
  });

  it('Codex durum listesi: kitten çıkan (retired) eski Ley Brand durumları gösterilmez; kalan durum metinleri eski Redtithe adlarını anmaz', () => {
    const list = buildWikiStatuses();
    const ids = list.map((x) => x.id);
    expect(content.statuses.branded?.retired).toBe(true);
    expect(content.statuses.ley_thread?.retired).toBe(true);
    expect(ids).not.toContain('branded');
    expect(ids).not.toContain('ley_thread');
    expect(ids).toContain('blood_brand');
    expect(ids).not.toContain('mirror_vein');
    const bad = list.filter((x) => /Anti-Mage|Mana Steal|Ley Brand|Ley Thread|Spell Ward|Void Strike|Spellbreaker/.test(`${x.name} ${x.text}`)).map((x) => x.id);
    expect(bad).toEqual([]);
  });
});
