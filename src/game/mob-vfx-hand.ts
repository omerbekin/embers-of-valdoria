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
  fire_volley: 'burn_the_ground',
  pitch_arrow: 'poachers_shot',
  rusted_blade: 'penance_flail',
  shield_of_brine: 'shield_wall',
  lament_of_salt: 'bone_rite',
  tidal_mend: 'marsh_glow',
  hook: 'drag_under',
  lantern_flash: 'sand_in_the_eyes',
  // art turu 2026-10-28: Harita 2 elit/boss ve sıradan mob skill'lerinin kendi sheet'leri var; el yapımı sürümü yok, test panelinde en yakın efekt oynar
  barnacle_claw: 'gnaw',
  belaying_pin: 'halberd_chop',
  black_cutlass: 'halberd_chop',
  boarding_hook: 'drag_under',
  boat_hook: 'drag_under',
  bog_spark: 'wisp_spark',
  brackish_tide: 'bog_curse',
  breaker_rush: 'run_down',
  brine_bite: 'bite',
  brine_curse: 'bog_curse',
  brine_lash: 'drag_under',
  brine_rite: 'bone_rite',
  broadside: 'crossbow_bolt',
  call_the_tide: 'burn_the_ground',
  captains_rake: 'toll_sweep',
  cargo_net: 'sand_in_the_eyes',
  chain_shot: 'crossbow_bolt',
  champions_challenge: 'oath_of_stone',
  cliff_bolt: 'crossbow_bolt',
  cutlass_flurry: 'halberd_chop',
  debtors_chain: 'drag_under',
  drag_to_the_rocks: 'drag_under',
  drowned_greatsword: 'penance_flail',
  false_beacon: 'burn_the_ground',
  fen_glimmer: 'marsh_glow',
  gaff_strike: 'halberd_chop',
  grand_chorus: 'requiem',
  gutting_sweep: 'toll_sweep',
  harpoon_line: 'drag_under',
  high_tide: 'burn_the_ground',
  hold_the_pier: 'shield_wall',
  iron_maul: 'shield_bash',
  lament_of_the_deep: 'requiem',
  lead_the_faithful: 'marsh_glow',
  pit_cestus: 'shield_bash',
  play_to_the_crowd: 'marsh_glow',
  plunging_volley: 'burn_the_ground',
  powder_keg: 'ember_toss',
  queens_lament: 'requiem',
  raid_cut: 'halberd_chop',
  requiem_of_salt: 'bone_rite',
  rise_from_the_deep: 'bone_rite',
  salt_circle: 'burn_the_ground',
  salt_hex: 'hex_bolt',
  scourge_of_heresy: 'penance_flail',
  sirens_call: 'requiem',
  skull_splitter: 'shield_bash',
  the_reach_drowns: 'burn_the_ground',
  tide_dirge: 'requiem',
  tide_of_mercy: 'marsh_glow',
  vane_rally: 'marsh_glow',
  wall_of_brine: 'shield_wall',
  wreck_feast: 'gnaw',
  wreckers_gaff: 'halberd_chop',
  writ_of_silence: 'hex_bolt',
  wyrm_deluge: 'burn_the_ground',
  wyrm_lash: 'toll_sweep',
  wyrm_surge: 'burn_the_ground',
  wyrm_swallow: 'bite',
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
