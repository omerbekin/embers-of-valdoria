// Evolve'lu kahraman: tek ikon / ad çözücüsü (src/ui/evolve-icon.ts) evolve ikonunu ve adını verir; evolve'suz kahraman normal ikon + ad.
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { heroSkillIconUrl, heroSkillName, isEvolvedUrl } from '../src/ui/evolve-icon';

const fireBolt = content.skills['fire_bolt']!;

describe('evolve ikon / ad çözücüsü', () => {
  it('evolve düğümü alınmış kahraman: evolve işaretli ikon + Sunfire adı', () => {
    const h = { class: 'mage', tree: { v: 1, r: { '1.v': 1 } } };
    expect(isEvolvedUrl(heroSkillIconUrl(h, fireBolt))).toBe(true);
    expect(heroSkillName(h, fireBolt)).toBe('Sunfire');
  });
  it('evolve'+"'"+'suz kahraman: temel ikon + temel ad', () => {
    const h = { class: 'mage', tree: { v: 1, r: { '1.f1': 1 } } };
    expect(isEvolvedUrl(heroSkillIconUrl(h, fireBolt))).toBe(false);
    expect(heroSkillName(h, fireBolt)).toBe(fireBolt.name);
    expect(heroSkillIconUrl(undefined, fireBolt)).toBe(heroSkillIconUrl(h, fireBolt));
  });
});
