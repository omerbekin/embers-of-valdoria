// Seferde nadir düşüş (Legendary) TABAN SEVİYESİZ (Ömer 2026-10-12): düştüğü düğümün item seviyesinde zarlanır (Endless'taki dalga seviyesi gibi),
// tabanın ilvl'si alt sınır değildir. Düğüm seviyesi burada taklit edilir (taban 10-22'nin altı ve üstü); normal düşüşler değişmez.
import { describe, expect, it, vi } from 'vitest';

const node = vi.hoisted(() => ({ ilvl: 3 }));
vi.mock('../src/campaign/power', async (orig) => ({ ...(await orig<typeof import('../src/campaign/power')>()), nodeIlvl: () => node.ilvl }));

const { activeHeroes, debugTeleport, newCampaign, pickHero } = await import('../src/campaign');
const { grantLoot } = await import('../src/campaign/loot');
const { itemDef } = await import('../src/progression');

describe('seferde nadir düşüşün item seviyesi', () => {
  for (const lvl of [3, 30])
    it(`Legendary düğümün item seviyesinde (${lvl}) zarlanır, tabanın seviyesi ne olursa olsun; normal düşüşler taban seviyesinde kalır`, () => {
      node.ilvl = lvl;
      let found = false;
      for (let seed = 1; seed < 400 && !found; seed++) {
        const s = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed, difficulty: 'medium' }), 'archer'), 'road');
        s.lootState.rareMisses = 30; // nadir şansı yüksek: düşüş çabuk bulunur
        s.inventory = []; // torba boş: düşüşlerin hepsi torbaya girer
        const drop = grantLoot(s, 'road', 'battle', activeHeroes(s));
        if (!drop.rare?.length) continue;
        found = true;
        const rare = s.inventory.find((i) => i.id === drop.rare![0])!;
        const def = itemDef(rare.id)!;
        expect(def.rarity).toBe('legendary');
        expect(def.ilvl).not.toBe(lvl);
        expect(rare.rolls?.ilvl).toBe(lvl);
        for (const i of s.inventory) if (i !== rare) expect(i.rolls?.ilvl).toBeUndefined();
      }
      expect(found).toBe(true);
    });
});
