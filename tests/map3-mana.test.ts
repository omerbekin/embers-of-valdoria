// Mob mana kuralı (open-questions 466): skill'lerini sürekli kullanan birim, Harita 3 üst level'ı L30'da, ilk kez 5-6 kullanımdan sonra "mana yetmedi"ye düşer. Bedelsiz skill bedelsiz kalır.
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { enemyLevelAttrAdd } from '../src/progression/levels';

const LEVEL = 30;

/** Tur tur: her turda hazır en pahalı bedelli skill. Dönen: mana bitmeden önceki kullanım sayısı; bedelli skill yoksa null. */
function usesBeforeDry(id: string): number | null {
  const d = content.mobs[id] ?? content.bosses[id]!;
  const a = content.formulas.attributes;
  const int = d.attributes.int + (enemyLevelAttrAdd(id, LEVEL)?.int ?? 0);
  const max = Math.round(a.mpBase + a.mpPerInt * int);
  const regen = Math.round(a.mpRegenPerInt * int);
  const paid = d.skills.map((s) => content.skills[s]!).filter((s) => s.cost.amount > 0);
  if (!paid.length) return null;
  const cd: Record<string, number> = {};
  let mp = max;
  let uses = 0;
  for (let turn = 0; turn < 300; turn++) {
    mp = Math.min(max, mp + regen);
    for (const k of Object.keys(cd)) cd[k] = Math.max(0, cd[k]! - 1);
    const s = paid.filter((x) => !cd[x.id]).sort((x, y) => y.cost.amount - x.cost.amount)[0];
    if (!s) continue;
    if (mp < s.cost.amount) return uses;
    mp -= s.cost.amount;
    cd[s.id] = s.cooldown ?? 0;
    uses++;
  }
  return Infinity;
}

const MAP3 = ['clan_vaulter', 'shardwalker', 'hollow_delver', 'gloamstalker', 'cinderleaper', 'slagcart_golem', 'thunderwright', 'clan_stormcaller', 'gloam_eel', 'stormhorn_ram', 'snow_wolf', 'clan_axeman', 'cave_crawler', 'clan_skald', 'pyre_witch', 'cinder_knight', 'forge_golem', 'wight', 'rime_hound', 'clan_slinger', 'rime_witch', 'hollow_warden', 'molten_hound'];

/** Seçilen 9 elit ve boss kiti: temel saldırı bedelsiz, kalanı aynı kural. */
const KITS = ['hollow_runecaller', 'ashborn_acolyte', 'pack_mother', 'pyre_matriarch', 'forge_master_golem', 'ashborn_hierarch', 'cinder_warden', 'snowfather', 'hollow_king', 'hearthwarden', 'ember_of_the_first_hearth', 'clan_chief_brannoc', 'frozen_standard_bearer', 'oathkeeper', 'frozen_halberdier', 'frozen_crossbowman'];

describe('Harita 3 elit ve boss manası, L30', () => {
  it.each(KITS)('%s: 5-6 kullanımda biter, ilk skill bedelsiz', (id) => {
    expect(usesBeforeDry(id), id).not.toBeNull();
    expect([5, 6], id).toContain(usesBeforeDry(id));
    const d = content.mobs[id] ?? content.bosses[id]!;
    expect(content.skills[d.skills[0]!]!.cost.amount, id).toBe(0);
  });
});

describe('Harita 3 mob manası, L30', () => {
  it.each(MAP3)('%s: 5-6 kullanımda biter ya da tüm skill bedelsiz', (id) => {
    const n = usesBeforeDry(id);
    if (n !== null) expect([5, 6], id).toContain(n);
  });
  it('kopya skill\'ler paylaşılan bedeli değiştirmedi', () => {
    expect(content.skills.pike_thrust!.cost.amount).toBe(8);
    expect(content.skills.rend!.cost.amount).toBe(5);
    expect(content.skills.lunge!.cost.amount).toBe(5);
    expect(content.skills.shard_pike_thrust!.ai?.scoreCost).toBe(5);
    // Elit ve boss kitleri: Harita 1-2'nin paylaştığı skill'ler
    expect(content.skills.hold_the_gate!.cost.amount).toBe(13);
    expect(content.skills.burn_the_field!.cost.amount).toBe(25);
  });
});
