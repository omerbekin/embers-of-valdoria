/**
 * Debug > Setup > "Owner tests": Ömer'in elle denediği şeylere tek tuş kısayolları için SAF mantık (Phaser / DOM yok; Node'da testlenir).
 * Oyun kuralı burada değildir: yalnızca debug savaşının kurulum verisi ve ses listesi.
 *  - Mage evrimleri vitrin savaşı: Mage'in 4 evrimi (pasif Mirage Veil + 3 skill) AÇIK.
 *  - Sound check: ses listesi (ad -> hangi dosyadan çalar).
 */
import { content, type Teams } from '../engine';
import type { UnitSetup } from '../engine/types';
import type { TreeAlloc } from '../progression/skill-tree';
import { compileTree } from '../progression/skill-tree-compile';
import { evolveKeys } from '../progression/skill-tree-evolve';
import { treeOf } from '../progression/skill-tree-data';
import { SFX, sfxV2Of, type SfxDef } from './audio';
import { MOB_SFX } from './mob-sfx';

/** Mage'in 4 evrimi: satır (0 = pasif), skill id, evrim adı, taban ad. */
export const MAGE_EVOLVES = [
  { row: 0, skill: 'heat_mirage', evolve: 'Mirage Veil', base: 'Heat Mirage' },
  { row: 1, skill: 'fire_bolt', evolve: 'Sunfire', base: 'Fire Bolt' },
  { row: 2, skill: 'blizzard', evolve: 'Eternal Winter', base: 'Blizzard' },
  { row: 3, skill: 'ice_crater', evolve: 'Glacier Crater', base: 'Ice Crater' },
] as const;

/** Hint metni: hangi skill hangi evrim. */
export const MAGE_EVOLVES_TEXT = MAGE_EVOLVES.map((e) => `${e.base} > ${e.evolve}`).join(', ');

/** Vitrin savaşındaki düşmanlar: hepsi yakın dövüşçü (Mirage Veil tetiklensin: Mage'e yakın vuruş = saldıranın altına zemin). */
export const MAGE_SHOWCASE_ENEMIES = ['warrior', 'paladin', 'cutthroat'];

/** 4 evrim düğümü onaylı dağılım (ön koşul düğümleri yok: kural denetimi yok, yalnızca debug vitrini; gerçek kahraman en çok 2 evrim taşır). */
export function mageShowcaseAlloc(): TreeAlloc | null {
  const tree = treeOf('mage');
  if (!tree) return null;
  const keys = evolveKeys();
  const r: Record<string, number> = {};
  for (const e of MAGE_EVOLVES) {
    const k = keys.get(e.row);
    if (k) r[k] = 1;
  }
  return { v: tree.version, r };
}

/** Mage'in vitrin kurulumu: 4 evrimin etkisi derlenmiş, sunum listesi (ikon / ses / Mirage Veil karakter efekti) dolu, kolay ölmesin diye can çarpanı. */
export function mageShowcaseSetup(): UnitSetup {
  const tree = treeOf('mage');
  const alloc = mageShowcaseAlloc();
  const setup: UnitSetup = { level: 30, modifiers: { hpMult: 3 }, evolved: MAGE_EVOLVES.map((e) => e.skill) };
  const compiled = tree && alloc ? compileTree(tree, alloc) : undefined;
  if (compiled) setup.tree = compiled;
  return setup;
}

/** BattleScene verisi: Mage + Defender (sağ tarafta 3 yakın dövüşçü), sıra tabanlı (turns), menzil sınırı yok; Mage oyuncu kontrolünde. */
export function mageShowcaseBattleData(seed: number): { seed: number; mode: 'turns'; teams: Teams; partySize: number; enemySize: number; ignoreRange: boolean } {
  const party = content.randomCells(content.arrangeTeam(['mage', 'defender']), seed);
  const enemies = content.randomCells(content.arrangeTeam(MAGE_SHOWCASE_ENEMIES), seed + 7);
  const at = party.indexOf('mage');
  return {
    seed,
    mode: 'turns',
    teams: { party, enemies, units: { party: { [at]: mageShowcaseSetup() } } },
    partySize: 2,
    enemySize: MAGE_SHOWCASE_ENEMIES.length,
    ignoreRange: true,
  };
}

// ---------------------------------------------------------------------------------------------- Sound check

export interface SoundEntry {
  /** Düğme yazısı (İngilizce). */
  label: string;
  /** Ses motorundaki ad. */
  id: string;
  /** 'v2:<sahip>' (data/audio-v2/<sahip>.json), 'v1' (data/audio.json) ya da 'mob' (data/audio-mobs.json). */
  from: string;
}
export interface SoundGroup {
  title: string;
  hint: string;
  sounds: SoundEntry[];
}

const v2 = (owner: string, id: string, label = id): SoundEntry => ({ label, id, from: `v2:${owner}` });
const mob = (id: string, label = id): SoundEntry => ({ label, id, from: 'mob' });

/** Sound check listesi (adlar ses motorundaki adlardır; docs/design/audio-map.md). */
export const SOUND_GROUPS: SoundGroup[] = [
  { title: 'Sunfire (Fire Bolt evolve)', hint: 'Mage v2', sounds: [v2('mage', 'sunfireIgnite'), v2('mage', 'sunfireRoar'), v2('mage', 'sunfireBlast')] },
  { title: 'Eternal Winter (Blizzard evolve)', hint: 'Mage v2', sounds: [v2('mage', 'eternalWinterHowl'), v2('mage', 'eternalWinterHail'), v2('mage', 'eternalWinterShatter')] },
  { title: 'Glacier Crater (Ice Crater evolve)', hint: 'Mage v2', sounds: [v2('mage', 'glacierCrack'), v2('mage', 'glacierSlam')] },
  { title: 'Ice sounds (the 5 ice evolve sounds)', hint: 'Mage v2: Eternal Winter x3 + Glacier Crater x2', sounds: [v2('mage', 'eternalWinterHowl'), v2('mage', 'eternalWinterHail'), v2('mage', 'eternalWinterShatter'), v2('mage', 'glacierCrack'), v2('mage', 'glacierSlam')] },
  { title: 'Base ice (before evolve)', hint: 'Blizzard / Ice Crater base sounds', sounds: [v2('mage', 'windHowl'), v2('mage', 'hailPatter'), v2('mage', 'iceCrack')] },
  { title: 'Redtithe: Exsanguinate stabs', hint: 'Anti-Mage v2: two dagger stabs + the implode that follows', sounds: [v2('antimage', 'daggerStabA'), v2('antimage', 'daggerStabB'), v2('antimage', 'implode')] },
  {
    title: 'Roars',
    hint: 'Hero roars + mob roars',
    sounds: [v2('mage', 'flameRoar'), v2('mage', 'sunfireRoar'), v2('defender', 'battleRoar'), mob('mobRoarCast'), mob('mobRoarHit'), mob('mobGateWardenRoar'), mob('mobDrakefireRoar'), mob('mobMireGorgeGrowl')],
  },
];

/** Girdinin tarifi (yoksa undefined: düğme pasif, çalmaz). */
export function resolveSound(e: SoundEntry): SfxDef | undefined {
  if (e.from === 'v1') return SFX[e.id];
  if (e.from === 'mob') return MOB_SFX[e.id];
  if (e.from.startsWith('v2:')) return sfxV2Of(e.from.slice(3), e.id);
  return undefined;
}

/** Ses kapalı mı (Master 0, ses motoru kapalı ya da Sound Effects 0): panel uyarısı. Saf: değerleri çağıran verir. */
export function volumeWarning(s: { enabled: boolean; volume: number; sfx: number }): string | null {
  if (!s.enabled || s.volume <= 0) return 'Volume is 0 in Settings (Master Volume): sounds stay silent';
  if (s.sfx <= 0) return 'Sound Effects is 0 in Settings: sounds stay silent';
  return null;
}
