import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { battleSpriteIds, classSpriteIds } from '../src/game/sprite-needs';

// Telefon belleği (0.8.2 Grave Field çökmesi): savaş yalnızca sahnedeki birimlerin + çağrıların görsellerini yükler.
describe('sprite-needs', () => {
  it('savaş: birimlerin spriteId’leri + tüm çağrılar, başka mob yok', () => {
    const ids = battleSpriteIds(['warrior', 'hexer', 'antimage', 'mage', 'ghoul', 'grave_chanter', null, '']);
    for (const u of ['warrior', 'hexer', 'antimage', 'mage', 'ghoul', 'grave_chanter']) expect(ids).toContain((content.classes[u] ?? content.mobs[u])!.spriteId);
    for (const s of Object.values(content.summons)) expect(ids).toContain(s.spriteId);
    expect(ids).not.toContain('bandit_chief');
    expect(ids).not.toContain('high_priest_of_the_undying');
  });

  it('savaş: boss ve bağlı yardımcısı', () => {
    const ids = battleSpriteIds(['bridge_warden', 'iron_mooring']);
    expect(ids).toContain(content.bosses['bridge_warden']!.spriteId);
    expect(ids).toContain(content.bosses['iron_mooring']!.spriteId);
  });

  it('çağrı etkileri yalnızca data/summons birimlerini çağırır (hepsi savaş listesinde)', () => {
    const units = new Set<string>();
    for (const sk of Object.values(content.skills) as { effects?: { type: string; unit?: string }[] }[])
      for (const e of sk.effects ?? []) if (e.type === 'summon' && e.unit) units.add(e.unit);
    expect(units.size).toBeGreaterThan(0);
    for (const u of units) expect(Object.keys(content.summons)).toContain(u);
  });

  it('savaş dışı ekranlar: sınıflar + çağrılar + tüccar, mob yok', () => {
    const ids = classSpriteIds();
    for (const c of Object.values(content.classes)) expect(ids).toContain(c.spriteId);
    expect(ids).toContain('merchant');
    for (const m of Object.values(content.mobs)) if (![...Object.values(content.classes), ...Object.values(content.summons)].some((c) => c.spriteId === m.spriteId)) expect(ids).not.toContain(m.spriteId);
  });
});
