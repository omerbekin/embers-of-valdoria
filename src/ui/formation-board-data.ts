/**
 * DİZİLİM TAHTASI veri köprüsü: oyunun kahramanını (sınıf + level + ekipman + dağıtılmış puan) tahtanın düz verisine (formation-board.ts) çevirir ve
 * dizilim ipucunu motor kuralından (src/engine/formation-hints.ts) alır. Sefer Formation penceresi bunu kullanır; Quick Battle / Multiplayer
 * hazırlık ekranları da aynı köprüyle ya da kendi düz verisiyle tahtayı besler. Oyun kuralı burada YOK: yalnızca okur ve biçimler.
 */
import { content } from '../engine';
import { heroStats, type LoadoutSource } from '../progression';
import { avatarUrl } from './character-panel';
import { gearSkillRows } from './gear-skills';
import { iconUrl } from './dom-icons';
import { skillIconName } from './mob-icons';
import { uiIconName } from './ui-icons';
import { STAT_COLOR, statIconName } from './stat-icons';
import { ownerOfSkill, ownerOfUnit } from '../game/asset-versions';
import type { BoardAttr, BoardHint, BoardSkill, FormationBoardHero, FormationBoardOpts } from './formation-board';

/** Tahtaya girecek kahramanın kaynak biçimi (sefer kahramanı buna uyar). */
export interface BoardHeroSource extends LoadoutSource {
  id: string;
  hpRatio: number;
  leader?: boolean;
}

const ATTRS: BoardAttr[] = ['str', 'dex', 'int', 'luck'];

/** Skill bedeli çipi (motor hesabı yok: veri sabit miktar ya da yüzde). */
function costOf(skill: { cost: { resource: string; amount: number; ofCurrent?: number; spendAll?: boolean } }): BoardSkill['cost'] {
  const c = skill.cost;
  const pct = (c.ofCurrent ?? 0) > 0 ? `${Math.round(c.ofCurrent! * 100)}%` : '';
  if (c.amount <= 0 && !pct) return { kind: 'free' };
  const text = pct ? `${c.amount > 0 ? `${c.amount}+` : ''}${pct}` : String(c.amount);
  return { kind: c.resource === 'rage' ? 'rage' : c.resource === 'mp' ? 'mp' : 'hp', text };
}

/** Bir kahramanın tahta verisi (sınıf yoksa null). */
export function boardHero(h: BoardHeroSource): FormationBoardHero | null {
  const def = content.classes[h.class];
  const stats = heroStats(h);
  if (!def || !stats) return null;
  const plan = content.planUnitOf(h.class);
  const rows = gearSkillRows(h.class, stats);
  const passiveRow = rows.find((r) => r.passive);
  const p = def.passive;
  return {
    id: h.id,
    name: def.name,
    role: def.role ?? '',
    range: Number.isFinite(plan.range) ? plan.range : null,
    primary: (def.primary as BoardAttr | undefined) ?? 'str',
    level: h.level ?? 1,
    hp: stats.hp,
    hpRatio: h.hpRatio,
    mp: stats.mp,
    attr: { str: stats.str, dex: stats.dex, int: stats.int, luck: stats.luck },
    avatar: avatarUrl(h.class) ?? '',
    ...(h.leader ? { leader: true } : {}),
    // Pasif HER ZAMAN skill'lerin önünde (gearSkillRows sırası: pasif, sonra skill'ler)
    ...(passiveRow && p ? { passive: { name: p.name, icon: iconUrl(p.icon || uiIconName('passive'), def.color, ownerOfUnit(h.class)) } } : {}),
    skills: rows
      .filter((r) => !r.passive && r.skill)
      .map((r) => ({ name: r.skill!.name, icon: iconUrl(skillIconName(r.skill!), r.skill!.fx, ownerOfSkill(r.skill!.id)), cost: costOf(r.skill!) })),
  };
}

/** Stat ve bedel ikonları (boyalı stat ikonları). */
export function boardIcons(): FormationBoardOpts['icons'] {
  const ic = (k: 'hp' | 'mp' | BoardAttr): string => iconUrl(statIconName(k), STAT_COLOR[k]);
  return { hp: ic('hp'), mp: ic('mp'), ...(Object.fromEntries(ATTRS.map((k) => [k, ic(k)])) as Record<BoardAttr, string>) };
}

/** Menzil arayüzü açık mı (data/formulas > range.enabled; kapalıyken tahta eski sade görünüme döner). */
export const boardRangeUi = (): boolean => !!content.formulas.range?.enabled;

/** Hücre listesi (kahraman id'leri) için motor dizilim ipuçları; `classOf` id -> sınıf. */
export function boardHints(classOf: (id: string) => string): (cells: string[]) => BoardHint[] {
  return (cells) => content.placementHintsForCells(cells.map((id) => (id ? classOf(id) : '')));
}
