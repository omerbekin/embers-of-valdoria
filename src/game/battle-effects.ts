// Koşu boyu etkiler (battle HUD > Battle info > Effects; saf, Phaser'sız). Oturum (sefer / Endless) savaşı başlatırken
// `CampaignBattleHooks.battleEffects` kancasıyla bu listeyi verir; ileride yeni sistemler (kutsamalar, lanetler, olaylar) aynı listeye eklenir.
import { paintedOr } from '../ui/misc-icons';
import { boonList, type CampaignState, type DifficultyEnemyMods } from '../campaign';
import { relicDef, type EndlessRun } from '../endless';

export interface BattleEffect {
  name: string;
  text: string;
  /** İkon türü (src/ui/icon-kinds.ts) ve rengi; yoksa kor elmas. */
  icon?: string;
  color?: string;
  /** Başlık grubu ('Relics', 'Enemy scaling'...). */
  group?: string;
}

const pctUp = (m: number) => `${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%`;

/** Düşman güçlendirmesinin okunur hali: "+12% HP, +5% damage". Etkisizse boş. */
export function enemyModsText(m: DifficultyEnemyMods | undefined): string {
  if (!m) return '';
  const out: string[] = [];
  if (m.hpMult !== undefined && m.hpMult !== 1) out.push(`${pctUp(m.hpMult)} HP`);
  if (m.statMult !== undefined && m.statMult !== 1) out.push(`${pctUp(m.statMult)} stats`);
  if (m.powerMult !== undefined && m.powerMult !== 1) out.push(`${pctUp(m.powerMult)} damage`);
  if (m.armorAdd) out.push(`+${m.armorAdd} armor`);
  if (m.magicArmorAdd) out.push(`+${m.magicArmorAdd} Magic Armor`);
  return out.join(', ');
}

/**
 * Sefer savaşının etkileri: takımın taşıdığı kutsamalar (Wayshrine). Zorluk ve bölüm ölçeği düşman güçlendirmesi olarak savaşta
 * aynen uygulanır ama bu listede GÖSTERİLMEZ (Ömer 2026-11-14).
 * İkon: her blessing kendi boyalı ikonu (`blessing:<ad>`, id `dr_shrine_<ad>`); eşleşmeyen yeni blessing genel `blessing:blessing`.
 */
export function blessingIcon(id: string): string {
  const key = id.replace(/^.*_shrine_/, '');
  return paintedOr('blessing', key, paintedOr('blessing', 'blessing', 'rest'));
}

/** Sefer savaşının blessing listesi (savaş Effects). */
export function campaignEffects(s: CampaignState): BattleEffect[] {
  return boonList(s).map((b) => ({ name: b.name, text: `${b.effect}. Every hero, every battle.`, icon: blessingIcon(b.id), color: '#ffe3a0', group: 'Blessings' }));
}

/** Endless savaşının etkileri: koşunun kalıntıları. */
export function endlessEffects(run: Pick<EndlessRun, 'relics'>): BattleEffect[] {
  return (run.relics ?? [])
    .map((id) => relicDef(id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ name: r.name, text: r.text, icon: paintedOr('relic', r.id, r.icon), color: r.color, group: 'Relics' })); // boyalı kalıntı ikonu (assets/misc-icons/relic), yoksa piksel
}
