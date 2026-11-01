// Savaş günlüğü: olayların `cause` kimliğini okunur ada çevirir (saf, Phaser'sız). Bulunamazsa '' döner: ham kimlik oyuncuya hiç gösterilmez.
import { content } from '../engine';
import { treeOf } from '../progression/skill-tree-data';

/** Veride ad taşımayan motor mekanikleri (battle.ts içindeki düz cause anahtarları; varsa 'passive' olaylarındaki adlarla aynı). */
const MECHANICS: Record<string, string> = {
  thorns: 'Thorns',
  overflow: 'Overflow',
  cave_in: 'Cave-in',
  live_water: 'Live Water',
  lifesteal: 'Lifesteal',
  regen: 'Regen',
  leech: 'Life Leech',
  second_wind: 'Second Wind',
  bloodletter: 'Bloodletter',
  forge_heart: 'Heart of the Forge',
  vigil: 'Vigil',
  victors_breath: "Victor's Breath",
  last_rites: 'Last Rites',
  wave: 'Round Break',
};

let passives: Map<string, string> | null = null;

/** Tüm birim tanımlarındaki pasiflerin adları (ilk çağrıda bir kez kurulur). */
function passiveName(id: string): string | undefined {
  if (!passives) {
    passives = new Map();
    for (const defs of [content.classes, content.summons, content.bosses, content.mobs]) {
      for (const d of Object.values(defs)) if (d.passive) passives.set(d.passive.id, d.passive.name);
    }
  }
  return passives.get(id);
}

/** Ağaç düğümü kimliği '<class>:<anahtar>' (usta çubuğu '<class>:bar[i]'). */
function treeNodeName(id: string): string | undefined {
  const at = id.indexOf(':');
  if (at <= 0) return undefined;
  const tree = treeOf(id.slice(0, at));
  const key = id.slice(at + 1);
  const bar = /^bar\[(\d+)\]$/.exec(key);
  return bar ? tree?.mastery.bar[Number(bar[1])]?.name : tree?.nodes[key]?.name;
}

export function causeName(id: string): string {
  return (
    MECHANICS[id] ??
    treeNodeName(id) ??
    passiveName(id) ??
    content.statuses[id]?.name ??
    content.grounds[id]?.name ??
    content.skills[id]?.name ??
    content.groundReactions[id]?.label ??
    ''
  );
}
