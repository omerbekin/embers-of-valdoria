// EVOLVE İKONU (Ömer 2026-10-23, genel kural: docs/design/skill-tree-implementation.md > "Evolve ikonu ve animasyonu"): bir skill'in evolve düğümü
// ONAYLIYSA o skill'in ikonu o kayıtta (sefer / Endless) her yerde döngülü animasyonla gösterilir; evolve sanatı varsa ikon onunla değişir.
// Kural src/progression/skill-tree-evolve.ts'te; burada yalnızca ikon adresini seçer ve ADRESE İŞARET koyar: işaretli adres `#evo` taşır
// (ör. 'x.webp#evo#smooth'); animasyon TEK yerde (evolve-icon.css: img[src*='#evo']), yani adresi bir <img>'e koyan her ekran kendiliğinden
// animasyonlu olur (Gear, savaş HUD'ı, ipuçları, formasyon kartları). Phaser'da çizilen skill ikonu yok (savaş HUD'ı DOM): Phaser eşdeğeri gerekmez.
import './evolve-icon.css';
import type { SkillDef } from '../engine';
import { evolveArtFor, resolveEvolveIcon, type EvolveSource } from '../progression/skill-tree-evolve';
import type { TreeMode } from '../progression/skill-tree-data';
import { treeImage, TREE_ICON_PREFIX } from '../game/icon-image-files';
import { ownerOfSkill } from '../game/asset-versions';
import { iconUrl } from './dom-icons';
import { skillIconName } from './mob-icons';

export const EVO_MARK = '#evo';

/** Adrese evolve işareti koyar (zaten işaretliyse aynen; boyalı ikonun `#smooth` ekinden ÖNCE girer: sonek denetimleri bozulmasın). */
export function markEvolved(url: string): string {
  if (!url || url.includes(EVO_MARK)) return url;
  return url.endsWith('#smooth') ? `${url.slice(0, -'#smooth'.length)}${EVO_MARK}#smooth` : `${url}${EVO_MARK}`;
}

export const isEvolvedUrl = (url: string): boolean => url.includes(EVO_MARK);

/** Sanat dosyası var mı (çözücüye verilen sınama). */
export const hasTreeArt = (artId: string): boolean => !!treeImage(artId);

/**
 * Gear / Tree / formasyon gibi KAYITLI kahramanın gösterildiği yerlerin modu: kahramanın kendi ağacı yalnızca sefer / Endless kayıtlarında vardır
 * (ikisi _rules.json'da aynı bayrakta; Quick Battle / multiplayer kahramanında `tree` hiç yoktur).
 */
export const SAVE_TREE_MODE: TreeMode = 'campaign';

/** Skill'in ikon adresi (DOM): evolve aktifse evolve sanatı (yoksa normal ikon) + işaret; değilse normal ikon, işaretsiz. */
export function heroSkillIconUrl(h: EvolveSource | undefined, skill: SkillDef, mode: TreeMode | undefined = SAVE_TREE_MODE): string {
  const base = (): string => iconUrl(skillIconName(skill), skill.fx, ownerOfSkill(skill.id));
  if (!h) return base();
  const r = resolveEvolveIcon(h, skill.id, mode, hasTreeArt);
  if (!r.evolved) return base();
  return markEvolved(r.art ? iconUrl(`${TREE_ICON_PREFIX}${r.art}`, skill.fx) : base());
}

/** Evolve düğümünün kendi görseli (Tree ekranı): sanat varsa o, yoksa null. İşaret onaylıysa (confirmed) konur. */
export function evolveNodeIconUrl(classId: string, skillId: string): string | null {
  const art = evolveArtFor(classId, skillId, hasTreeArt);
  return art ? iconUrl(`${TREE_ICON_PREFIX}${art}`) : null;
}

/** Notable düğümün kendi sanatı (Tree ekranı): '<satır>.<id>' anahtarı -> 'assets/tree-icons/<sınıf>/<satır>_<id>' dosyası varsa URL, yoksa null (düğüm eski görünümde kalır). */
export function nodeArtUrl(classId: string, nodeKey: string): string | null {
  const id = `${classId}/${nodeKey.replace('.', '_')}`;
  return hasTreeArt(id) ? iconUrl(`${TREE_ICON_PREFIX}${id}`) : null;
}
