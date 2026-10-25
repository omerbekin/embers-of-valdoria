/**
 * EL YAPIMI (TAMAMEN KODLA ÇİZİLEN) MOB EFEKTLERİ: TÜM mob skill'leri (src/game/mob-vfx.ts > MOB_VFX_SPECS) için var. GERÇEK savaşta yalnızca Ömer'in
 * 2026-10-20'de seçtiği 18 skill oynar (data/battle-layout.json > animation.mobVfx.skills > hand:true; mob-vfx.ts bu modülü tembel yükler, savaş
 * parçasına girmez); kalanı yalnızca Debug > VFX frame test (in battle) > Version "Hand-coded" (test paneli `mobVfxTest.hand` alanına koyar).
 *
 * Ömer 2026-10-18: "tüm düşman karakterlerinin animasyonunu rend'de ve glyph'de öğrendiklerinden yola çıkarak sıfırdan baştan yarat".
 * Dil: fiziksel vuruşlar Rend gibi gerçekçi, koyu, mat (ince keskin izler, mat kan/toz zerreleri, kopan lifler, kısa kontrollü sarsıntı,
 * izler koyulaşıp söner + kalın damlalar); büyüler Glyph of Breaking gibi katmanlı ve okunur (zemin rün dairesi, çatlak, ışık sütunu,
 * disiplinli zamanlama), neon / aşırı parlama yok. Kimlik (renk, fikir) asıl sheet'ten: assets/mob-vfx/<mob>/<skill>.png.
 *
 * ZAMANLAMA SÖZLEŞMESİ (asıl sheet ile birebir, hasar rakamları aynı anda; tek yerde: mob-vfx-hand/flow.ts): `hitMs` = asıl sheet'in vuruş
 * karesine kadar geçen süre (impact / fps x fpsScale).
 *   melee  (spec.windMs varsa hazırlık pozu) -> c.lunge -> hitMs sonra vuruş + kısa sarsıntı
 *   bolt   c.windUp -> hitMs sonra vuruş; mermi windUp'ın ikinci yarısında çıkar, hedefin yakın kenarında (k.contact) patlar
 *   cells  c.windUp -> her hücrede hitMs sonra vuruş; aşamalı skill'de aşama i: i x 180 ms + hitMs (c.releaseStage(i) aynı anda)
 *   center c.windUp -> hitMs sonra alanın merkezinde vuruş (AOE çizimi hücre merkezlerinde)
 *   self / ally  c.windUp -> hitMs sonra doruk
 * Promise vuruşta (aşamalıda ilk aşamada) çözülür; ilk ses başta, kalanlar vuruşta.
 *
 * Modüller (src/game/mob-vfx-hand/): core.ts (havuz, katman sürücüsü, parçacık, duman), draw.ts (alev, rün dairesi, zincir, çatlak...),
 * phys.ts (yara, kan/toprak, silahlar), bolts.ts (mermi), flow.ts (akış), classic.ts (Rend + Glyph of Breaking: olduğu gibi korunur) ve
 * skill grupları (beasts, bandits, ...). Her kare yeniden çizilir; Graphics / Image havuzdan gelir (aynı anda birkaç efekt kasmasın).
 */
import type { MobHandVfx } from './mob-vfx';
import { CLASSIC } from './mob-vfx-hand/classic';
import { BEASTS } from './mob-vfx-hand/beasts';
import { BANDITS } from './mob-vfx-hand/bandits';
import { FIRE_SKILLS } from './mob-vfx-hand/fire';
import { UNDEAD } from './mob-vfx-hand/undead';
import { HEXES } from './mob-vfx-hand/hexes';
import { GUARDIANS } from './mob-vfx-hand/guardians';
import { MORVANE_MEN } from './mob-vfx-hand/morvane';
import { BRIDGE } from './mob-vfx-hand/bridge';

/**
 * Harita 2 (The Drowned Reach, content-designer 2026-10-25): bu skill'lerin el yapımı sürümü henüz yok; test panelinde temaca en yakın Bölge I-III
 * efektini oynar (gerçek savaşta hand:true değiller, asıl sheet oynar). Kendi el yapımı efekti yazılınca satır silinir.
 */
const DROWNED_REACH_STANDIN: Readonly<Record<string, string>> = {
  cutlass: 'halberd_chop',
  rake: 'toll_sweep',
  sling_stone: 'crossbow_bolt',
  pitch_pot: 'ember_toss',
  pincer: 'shield_bash',
  burrow: 'oath_of_stone',
  eel_bite: 'bite',
  lunge: 'run_down',
  lament: 'ravens_peck',
  chorus: 'requiem',
};

const BASE: Readonly<Record<string, MobHandVfx>> = {
  ...CLASSIC,
  ...BEASTS,
  ...BANDITS,
  ...FIRE_SKILLS,
  ...UNDEAD,
  ...HEXES,
  ...GUARDIANS,
  ...MORVANE_MEN,
  ...BRIDGE,
};

/** skill id -> el yapımı efekt (gerçek savaşta yalnızca hand:true skill'ler; hepsi test panelinde). */
export const MOB_HAND_VFX: Readonly<Record<string, MobHandVfx>> = {
  ...BASE,
  ...Object.fromEntries(Object.entries(DROWNED_REACH_STANDIN).map(([id, from]) => [id, BASE[from]!])),
};
