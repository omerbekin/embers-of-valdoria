/**
 * SEFER MOBU SKILL EFEKTLERİ (Bölge I + II, ChatGPT 2026-10-16): hazır 8 karelik sprite sheet'ler (assets/mob-vfx/<mob>/<skill>.png, içe aktarma
 * `node tools/import-mob-art.mjs vfx`). Mob bir sürüm anahtarı değildir: src/game/vfx-select.ts önce bu tabloya bakar (skill id'si), sheet'i
 * yoksa skill eski ödünç (artOf) efektini oynar. Sesler aynen skill'in `sfx` listesinden (ilk ses başta, kalanlar vuruşta).
 *
 * Nasıl oynar (SPECS, skill başına bir satır):
 *   melee   kullanıcı hedefe atılır (c.lunge), sheet hedefte oynar (sıra/alan vuruşunda her hedefte; `windMs`: önce hazırlık pozu)
 *   bolt    büyü/atış hazırlığı (c.windUp), sheet hedefte oynar (ilk kareler mermi/uçuş)
 *   cells   alan skill'i: her kapsanan hücrede bir sheet (aşamalı skill'de aşama aşama, c.releaseStage)
 *   center  alan skill'i: alanın ortasında tek büyük sheet
 *   self    kullanıcının ayağında (Oath of Stone, Call the Buried)
 *   ally    hedef dostun ayağında (Sanctuary, Unholy Benediction)
 * Sheet'ler soldan sağa çizilidir: düşman tarafı (moblar) için yatay aynalanır. `impact` = vuruş karesi (0-7): Promise o karede çözülür
 * (hasar rakamları o an), sheet arkada biter. `at`: 'hit' göğüs hizası, 'ground' ayak/hücre zemini (alta oturan sheet).
 * DAYANAK NOKTASI (vfxSheetAnchors, vuruş karesinin alfa dağılımından): sheet'ler vuruşu karenin ortasına, zemin halkasını karenin altına
 * çizmez, pivot (kare ortası / alt kenar) bunu bilmez ve efekt ayağa / havaya düşerdi (Ömer 2026-10-18). Bu yüzden:
 *   'hit' + melee/bolt: karenin AĞIRLIK MERKEZİ hedefin gövde merkezine (k.spot) oturur;
 *   'ground' (cells, self, ally, zemine inen melee/mermi): içeriğin ALT BANDININ merkezi (zemin diski) hücre zeminine / ayağa (k.feet) oturur;
 *   center + 'hit' (Glyph of Breaking): sheet pivotundan (kare ortası), `squashY` ve -40 ayarıyla zemine yatar.
 * DERİNLİK: efekt TÜM birimlerin üstünde çizilir (k.DEPTH); yalnızca zemine yatan desen (groundPlane) birim sırasına göre kalır.
 *
 * GERÇEK SAVAŞTA NE OYNAR (Ömer 2026-10-20, her skill için karar; veri data/battle-layout.json > animation.mobVfx.skills):
 *   `hand: true`  el yapımı efekt (src/game/mob-vfx-hand.ts > MOB_HAND_VFX, tamamen kodla çizilir; sheet yalnızca vuruş anı için okunur)
 *   aksi halde    asıl ChatGPT sheet'i + KODLA ARA KARE (data/vfx-inbetween.json > player: yöntem, kat; skill başına `ib` / `sub` ezer)
 * El yapımı modül büyük olduğu için tembel yüklenir (yalnızca el yapımı skill'in ilk atışında ya da test panelinde inen ayrı parça).
 * Phaser'ı çalışma zamanında içe aktarmaz (yalnızca tip): node testlerinde de yüklenir.
 */
import type Phaser from 'phaser';
import type { CombatantView } from './combatant-view';
import type { VfxCtx } from './vfx';
import type { VfxKit } from './vfx-versions';
import type { V2Vfx } from './art-v2/types';
import { mobSheetId, mobTweenSheetId, vfxSheetFile } from './vfx-sheet-files';
import layout from '../../data/battle-layout.json';
import { IB_CFG, type StabilizeOpts } from './vfx-inbetween';

const IB = IB_CFG.player;

/**
 * Yalnızca Debug > VFX frame test (in battle): bir sonraki mob efekti hangi sheet'le / ara karelerle oynasın. `on` kapalıyken (gerçek savaşlar,
 * panelde "Real battle" sürümü) hiçbir şey ezilmez: skill'in gerçek ayarı oynar (`hand` / ara kare, yukarıdaki başlık).
 *   tween  16 karelik ChatGPT sheet'i (assets/mob-vfx-tween; test ekranı kaydeder, yoksa asıl sheet)
 *   ib     kodla ara kare (null = kapalı)
 *   hand   sheet YERİNE tamamen kodla çizilen efekt (src/game/mob-vfx-hand.ts; test paneli verir, null = kapalı). `hitMs` = asıl sheet'in
 *          vuruş anı (ms, yavaşlatılmadan): el yapımı efekt hasar rakamlarını aynı anda düşürür.
 */
export type MobHandVfx = (c: VfxCtx, k: VfxKit, hitMs: number) => Promise<void>;
export const mobVfxTest: { on: boolean; tween: boolean; ib: { method: string; sub: number } | null; hand: MobHandVfx | null } = { on: false, tween: false, ib: null, hand: null };

type Mode = 'melee' | 'bolt' | 'cells' | 'center' | 'self' | 'ally';

export interface MobVfxSpec {
  /** Sheet'in sahibi (mob id, assets/mob-vfx/<mob>). */
  mob: string;
  mode: Mode;
  at: 'hit' | 'ground';
  /** Vuruş karesi (0-7). */
  impact: number;
  /** 256'lık karenin ekrandaki kenarı (px). */
  size: number;
  /** Dikey basıklık (zemine yatan desen: Glyph of Breaking). */
  squashY?: number;
  /** Zemin düzlemine yatır: derinlik ekseni yuva ızgarasının çaprazını izler (vfx-sheets groundTilt; Glyph of Breaking). */
  groundPlane?: boolean;
  /** Hazırlık rengi (c.windUp). */
  hex?: string;
  /** melee: atılmadan önce bu kadar ms hazırlık pozu (poz sayfalı mobda kaldırma karesi: Bandit Chief'in baltası). */
  windMs?: number;
}

export const MOB_VFX_SPECS: Readonly<Record<string, MobVfxSpec>> = {
  // Bölge I (tutorial)
  shiv: { mob: 'cutpurse', mode: 'melee', at: 'hit', impact: 3, size: 220 },
  sand_in_the_eyes: { mob: 'cutpurse', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  bite: { mob: 'grey_wolf', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  rend: { mob: 'grey_wolf', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  poachers_shot: { mob: 'ravenwood_poacher', mode: 'bolt', at: 'hit', impact: 2, size: 230, hex: '#8a9a4a' },
  tainted_bait: { mob: 'ravenwood_poacher', mode: 'bolt', at: 'ground', impact: 1, size: 220, hex: '#6fcf4b' },
  ravens_peck: { mob: 'raven_seer', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#a55cff' },
  murder_of_crows: { mob: 'raven_seer', mode: 'center', at: 'ground', impact: 4, size: 340, hex: '#a55cff' },
  chiefs_cleaver: { mob: 'bandit_chief', mode: 'melee', at: 'hit', impact: 3, size: 250, windMs: 280 },
  toll_sweep: { mob: 'bandit_chief', mode: 'melee', at: 'hit', impact: 4, size: 250, windMs: 280 },
  hold_the_tower: { mob: 'bandit_chief', mode: 'self', at: 'ground', impact: 3, size: 260, hex: '#c0704a' },
  // Bandits
  billhook: { mob: 'moor_raider', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  peat_smoke: { mob: 'moor_raider', mode: 'cells', at: 'ground', impact: 1, size: 210, hex: '#8a6a48' },
  scatter_quarrels: { mob: 'bandit_crossbowman', mode: 'cells', at: 'ground', impact: 1, size: 200, hex: '#c0392b' },
  // Ember Cult / Drowned
  shovel_of_embers: { mob: 'charcoal_burner', mode: 'bolt', at: 'hit', impact: 2, size: 240, hex: '#ff7a1a' },
  kiln_smoke: { mob: 'charcoal_burner', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#ff7a1a' },
  clutch: { mob: 'drowned', mode: 'melee', at: 'ground', impact: 3, size: 220 },
  // Guardians
  gatestone_slam: { mob: 'stonebound_warden', mode: 'melee', at: 'ground', impact: 1, size: 250 },
  rockfall: { mob: 'stonebound_warden', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#c08a3a' },
  pick_of_the_deep: { mob: 'thane_of_the_deep', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  oath_of_stone: { mob: 'thane_of_the_deep', mode: 'self', at: 'ground', impact: 3, size: 250, hex: '#3aa0ff' },
  rune_spark: { mob: 'deep_runecaller', mode: 'bolt', at: 'hit', impact: 2, size: 220, hex: '#4fe3ff' },
  glyph_of_breaking: { mob: 'deep_runecaller', mode: 'center', at: 'hit', impact: 3, size: 460, squashY: 0.62, groundPlane: true, hex: '#4fe3ff' },
  // Hexes
  cauldron_splash: { mob: 'hedge_witch_morwen', mode: 'bolt', at: 'ground', impact: 1, size: 230, hex: '#a6e22e' },
  hags_mark: { mob: 'hedge_witch_morwen', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#a6e22e' },
  // Undead
  dirge: { mob: 'grave_chanter', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#a55cff' },
  call_the_buried: { mob: 'grave_chanter', mode: 'self', at: 'ground', impact: 4, size: 230, hex: '#a55cff' },
  // Brann's Order
  penance_flail: { mob: 'oathsworn_brother', mode: 'melee', at: 'ground', impact: 3, size: 240 },
  sanctuary: { mob: 'oathsworn_brother', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#ffcf5a' },
  holy_ember: { mob: 'censer_monk', mode: 'bolt', at: 'hit', impact: 2, size: 240, hex: '#ffcf5a' },
  consecrate: { mob: 'censer_monk', mode: 'center', at: 'ground', impact: 2, size: 330, hex: '#ffcf5a' },
  // High Priest of the Undying
  bone_rite: { mob: 'high_priest_of_the_undying', mode: 'bolt', at: 'hit', impact: 3, size: 240, hex: '#a55cff' },
  requiem: { mob: 'high_priest_of_the_undying', mode: 'cells', at: 'ground', impact: 2, size: 230, hex: '#a55cff' },
  unholy_benediction: { mob: 'high_priest_of_the_undying', mode: 'ally', at: 'ground', impact: 4, size: 240, hex: '#a55cff' },
  // Bölge I-II eski skill'ler: kendi sheet'leri (2026-10-17; öncesinde ödünç artOf efekti). Ortak skill'lerin sahibi burada (ember_toss: Hierophant da, shield_bash: Gatewarden da)
  cudgel: { mob: 'road_thug', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  hamstring: { mob: 'road_thug', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  gnaw: { mob: 'ghoul', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  feast: { mob: 'ghoul', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  hex_bolt: { mob: 'fen_witchling', mode: 'bolt', at: 'hit', impact: 2, size: 230, hex: '#b04fa8' },
  bog_curse: { mob: 'fen_witchling', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#9cab3c' },
  wisp_spark: { mob: 'will_o_wisp', mode: 'bolt', at: 'hit', impact: 2, size: 220, hex: '#6fc9b8' },
  marsh_glow: { mob: 'will_o_wisp', mode: 'ally', at: 'ground', impact: 3, size: 230, hex: '#7dff9b' },
  ember_toss: { mob: 'ember_acolyte', mode: 'bolt', at: 'hit', impact: 2, size: 240, hex: '#ff7a1a' },
  burn_the_ground: { mob: 'ember_acolyte', mode: 'center', at: 'ground', impact: 3, size: 340, hex: '#ff4d1a' },
  shield_bash: { mob: 'shieldwarden', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  hold_the_line: { mob: 'shieldwarden', mode: 'self', at: 'ground', impact: 3, size: 250, hex: '#b9c8dc' },
  drag_under: { mob: 'drowned', mode: 'melee', at: 'ground', impact: 3, size: 230 },
  crossbow_bolt: { mob: 'bandit_crossbowman', mode: 'bolt', at: 'hit', impact: 2, size: 230, hex: '#d9c9a3' },
  shield_wall: { mob: 'thane_of_the_deep', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#7fb8e8' },
  lure_light: { mob: 'hedge_witch_morwen', mode: 'bolt', at: 'hit', impact: 2, size: 230, hex: '#e0b04a' },
  // Bölge III (campaign-dev 2026-10-17; mob-plan.md 10.6): satırlar HAZIR, sheet'ler yarın (ChatGPT). Sheet yokken skill sanatını ödünç aldığı
  // mob skill'inin (artOf) sheet'ini oynar (vfx-select.ts); `node tools/import-mob-art.mjs vfx` sonrası kendi sheet'i kendiliğinden öne geçer.
  halberd_chop: { mob: 'morvane_halberdier', mode: 'melee', at: 'hit', impact: 3, size: 250 },
  pike_thrust: { mob: 'morvane_halberdier', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  wall_of_pikes: { mob: 'sworn_guard', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#c0392b' },
  scorch_bite: { mob: 'ash_hound', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  run_down: { mob: 'ash_hound', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  hold_the_gate: { mob: 'cinder_gatewarden', mode: 'self', at: 'ground', impact: 3, size: 260, hex: '#ff7a1a' },
  burn_the_field: { mob: 'ember_hierophant', mode: 'center', at: 'ground', impact: 3, size: 380, hex: '#ff5a1a' },
  drakefire: { mob: 'drake_priest', mode: 'bolt', at: 'hit', impact: 2, size: 240, hex: '#ff8a2a' },
  dragons_breath: { mob: 'drake_priest', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#ff5a1a' },
  kindle_the_faithful: { mob: 'drake_priest', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#ffb04a' },
  cinder_lash: { mob: 'lord_morvane', mode: 'bolt', at: 'hit', impact: 3, size: 250, hex: '#ff6a2a' },
  ashfall: { mob: 'lord_morvane', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#8a6a5a' },
  iron_decree: { mob: 'lord_morvane', mode: 'self', at: 'ground', impact: 3, size: 280, hex: '#c0392b' },
  pyre_of_morvane: { mob: 'lord_morvane', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#ff4d1a' },
  // King's Bridge boss (Bridge Warden)
  anchor_smash: { mob: 'bridge_warden', mode: 'melee', at: 'hit', impact: 3, size: 260, hex: '#ff8a3a' },
  breaking_span: { mob: 'bridge_warden', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#6ad0d8' },
  chain_hook: { mob: 'bridge_warden', mode: 'bolt', at: 'hit', impact: 2, size: 250, hex: '#ff8a3a' }, // vuruş karesi 2 (çarpma patlaması): 0-1 kancanın gidişi (tune.travel)
  ash_brand: { mob: 'bridge_warden', mode: 'bolt', at: 'hit', impact: 4, size: 260, hex: '#ff6a1a' },
  fall_of_kings_bridge: { mob: 'bridge_warden', mode: 'center', at: 'ground', impact: 3, size: 520, hex: '#ff5a1a' },
  // Harita 2 (The Drowned Reach; content-designer 2026-10-25, sheet'ler art-pipeline 7b399db). Ömer: yalnız BU efektler yüksek FPS oynar
  // (data/battle-layout.json > animation.mobVfx.skills: speed 1.35 + 5 kat ara kare); Harita 1 hızları aynı. Drowned Knight, Brine Maiden,
  // Drowned Knight, Brine Maiden, Reaver Archer, Reef Wrecker skill'leri kendi sheet'lerinde (art-pipeline 8fecb02, 272c464; artOf yalnız yedek).
  cutlass: { mob: 'corsair_cutlass', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  rake: { mob: 'corsair_cutlass', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  sling_stone: { mob: 'corsair_slinger', mode: 'bolt', at: 'hit', impact: 3, size: 220, hex: '#d9c9a3' }, // 0-2 taşın uçuşu (tune.travel)
  pitch_pot: { mob: 'corsair_slinger', mode: 'bolt', at: 'ground', impact: 2, size: 240, hex: '#ff7a1a' }, // 0-1 çömleğin uçuşu; zemine oturur (Burning ground)
  pincer: { mob: 'salt_crab', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  burrow: { mob: 'salt_crab', mode: 'self', at: 'ground', impact: 3, size: 250, hex: '#c8b48a' },
  eel_bite: { mob: 'weir_eel', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  lunge: { mob: 'weir_eel', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  lament: { mob: 'siren', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#7fb8c8' },
  chorus: { mob: 'siren', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#5fa8c8' },
  fire_volley: { mob: 'reaver_archer', mode: 'cells', at: 'ground', impact: 2, size: 220, hex: '#ff7a1a' }, // 0-1 oklar iner, 2 saplanır (vuruş), 3-4 alev, 5-7 kor; her hücreye
  pitch_arrow: { mob: 'reaver_archer', mode: 'bolt', at: 'hit', impact: 3, size: 220, hex: '#ff7a1a' }, // 0-2 ok uçuşu (tune.fly), 3 zifti patlar
  rusted_blade: { mob: 'drowned_knight', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  shield_of_brine: { mob: 'drowned_knight', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#5fd8c0' },
  lament_of_salt: { mob: 'brine_maiden', mode: 'bolt', at: 'ground', impact: 3, size: 230, hex: '#bfe8f0' }, // tuz kristalleri hedefin üstüne yağar
  tidal_mend: { mob: 'brine_maiden', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#5fd8c0' },
  hook: { mob: 'reef_wrecker', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#e0b04a' }, // kanca zinciriyle fırlatılır (tune.fly + throw)
  lantern_flash: { mob: 'reef_wrecker', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#fff0b0' }, // sıranın her hücresinde göz alan parlama
  // Harita 2 yaygin mob skilleri: KENDI efektleri (2026-10-27, art-pipeline; her skill kendi ikonuna uyan sheet; ödünç artOf yok, tests/map2-leaders.test.ts, map2-commons.test.ts)
  belaying_pin: { mob: 'dock_rat', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  cargo_net: { mob: 'dock_rat', mode: 'melee', at: 'hit', impact: 3, size: 240, hex: '#d8d0b0' },
  brine_bite: { mob: 'reef_hound', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  breaker_rush: { mob: 'reef_hound', mode: 'melee', at: 'hit', impact: 3, size: 240, hex: '#5a7a8a' },
  salt_hex: { mob: 'salt_hag', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#d8d0b0' },
  brackish_tide: { mob: 'salt_hag', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#3d7f9a' },
  tide_dirge: { mob: 'tide_caller', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#4f8a9a' },
  rise_from_the_deep: { mob: 'tide_caller', mode: 'self', at: 'ground', impact: 3, size: 250, hex: '#3d8a9a' },
  bog_spark: { mob: 'marsh_light', mode: 'bolt', at: 'hit', impact: 3, size: 220, hex: '#9ad8e8' },
  fen_glimmer: { mob: 'marsh_light', mode: 'ally', at: 'ground', impact: 3, size: 230, hex: '#9ae8c8' },
  barnacle_claw: { mob: 'wreck_ghoul', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  wreck_feast: { mob: 'wreck_ghoul', mode: 'melee', at: 'hit', impact: 3, size: 240, hex: '#a8b8a0' },
  raid_cut: { mob: 'river_reaver', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  boat_hook: { mob: 'river_reaver', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  cliff_bolt: { mob: 'cliff_crossbowman', mode: 'bolt', at: 'hit', impact: 3, size: 220, hex: '#c9c0a0' },
  plunging_volley: { mob: 'cliff_crossbowman', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#c9c0a0' },
  // Harita 2 elit / boss kitleri: KENDI efektleri (2026-10-27, art-pipeline; her skill kendi ikonuna uyan sheet; ödünç artOf yok, tests/map2-leaders.test.ts, map2-commons.test.ts)
  gaff_strike: { mob: 'reaver_chief_hook', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  boarding_hook: { mob: 'reaver_chief_hook', mode: 'bolt', at: 'hit', impact: 3, size: 240, hex: '#9fb4c0' },
  gutting_sweep: { mob: 'reaver_chief_hook', mode: 'melee', at: 'hit', impact: 3, size: 250 },
  brine_curse: { mob: 'salt_hag_mother', mode: 'bolt', at: 'hit', impact: 3, size: 240, hex: '#5fe0c0' },
  call_the_tide: { mob: 'salt_hag_mother', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#3d9ac0' },
  salt_circle: { mob: 'salt_hag_mother', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#cfe8e0' },
  iron_maul: { mob: 'guild_enforcer_bastion', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  hold_the_pier: { mob: 'guild_enforcer_bastion', mode: 'self', at: 'ground', impact: 3, size: 250, hex: '#9fb8d0' },
  debtors_chain: { mob: 'guild_enforcer_bastion', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  scourge_of_heresy: { mob: 'inquisitor_captain_vell', mode: 'melee', at: 'hit', impact: 3, size: 240, hex: '#e8d48a' },
  writ_of_silence: { mob: 'inquisitor_captain_vell', mode: 'bolt', at: 'hit', impact: 3, size: 240, hex: '#f3d070' },
  lead_the_faithful: { mob: 'inquisitor_captain_vell', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#ffd76a' },
  wreckers_gaff: { mob: 'wrecker_captain', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  false_beacon: { mob: 'wrecker_captain', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#ffe08a' },
  drag_to_the_rocks: { mob: 'wrecker_captain', mode: 'melee', at: 'hit', impact: 3, size: 250 },
  black_cutlass: { mob: 'corsair_captain_marrow', mode: 'melee', at: 'hit', impact: 3, size: 230 },
  captains_rake: { mob: 'corsair_captain_marrow', mode: 'melee', at: 'hit', impact: 3, size: 240, hex: '#d9b86a' },
  powder_keg: { mob: 'corsair_captain_marrow', mode: 'bolt', at: 'ground', impact: 3, size: 250, hex: '#ff7a1a' },
  queens_lament: { mob: 'siren_queen', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#7fb8c8' },
  grand_chorus: { mob: 'siren_queen', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#5fa8c8' },
  sirens_call: { mob: 'siren_queen', mode: 'bolt', at: 'hit', impact: 3, size: 230, hex: '#e0b04a' },
  brine_rite: { mob: 'salt_bishop', mode: 'bolt', at: 'hit', impact: 3, size: 240, hex: '#9fd4e0' },
  requiem_of_salt: { mob: 'salt_bishop', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#7fd0d8' },
  tide_of_mercy: { mob: 'salt_bishop', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#5fd8c0' },
  drowned_greatsword: { mob: 'drowned_champion', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  champions_challenge: { mob: 'drowned_champion', mode: 'self', at: 'ground', impact: 3, size: 250, hex: '#9fb0c4' },
  wall_of_brine: { mob: 'drowned_champion', mode: 'ally', at: 'ground', impact: 3, size: 240, hex: '#5fa8c8' },
  pit_cestus: { mob: 'pit_champion_gorr', mode: 'melee', at: 'hit', impact: 3, size: 230, hex: '#c9a070' },
  skull_splitter: { mob: 'pit_champion_gorr', mode: 'melee', at: 'hit', impact: 3, size: 240, hex: '#ff9a3a' },
  play_to_the_crowd: { mob: 'pit_champion_gorr', mode: 'self', at: 'ground', impact: 3, size: 260, hex: '#ff9a3a' },
  wyrm_lash: { mob: 'weir_wyrm', mode: 'melee', at: 'hit', impact: 3, size: 260 },
  wyrm_swallow: { mob: 'weir_wyrm', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#2f9f9a' },
  wyrm_surge: { mob: 'weir_wyrm', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#3d9ac0' },
  wyrm_deluge: { mob: 'weir_wyrm', mode: 'center', at: 'ground', impact: 3, size: 520, hex: '#2f9fb0' },
  cutlass_flurry: { mob: 'admiral_vane', mode: 'melee', at: 'hit', impact: 3, size: 240 },
  chain_shot: { mob: 'admiral_vane', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#9aa4ae' },
  harpoon_line: { mob: 'admiral_vane', mode: 'bolt', at: 'hit', impact: 3, size: 250, hex: '#c9985a' },
  vane_rally: { mob: 'admiral_vane', mode: 'ally', at: 'ground', impact: 3, size: 280, hex: '#e0b04a' },
  broadside: { mob: 'admiral_vane', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#ff5a1a' },
  brine_lash: { mob: 'drowned_queen', mode: 'bolt', at: 'hit', impact: 3, size: 250, hex: '#3d9aa8' },
  high_tide: { mob: 'drowned_queen', mode: 'cells', at: 'ground', impact: 3, size: 230, hex: '#6ab0d0' },
  lament_of_the_deep: { mob: 'drowned_queen', mode: 'cells', at: 'ground', impact: 3, size: 220, hex: '#5fa8c8' },
  the_reach_drowns: { mob: 'drowned_queen', mode: 'center', at: 'ground', impact: 3, size: 520, hex: '#2f6f73' },
};

type Pt = { x: number; y: number };

/** OYNATMA AYARLARI (Ömer 2026-10-17: mob efektleri savaşta zor seçiliyordu). Hız ayarları veride: data/battle-layout.json > animation.mobVfx. */
const SIZE_MULT = 1.5; // her spec.size bununla çarpılır (skill'ler arası oran korunur)
const SIZE_MAX = 640; // büyük (center/cells) efektler ekranı kaplamasın (1080 yükseklikte ~%60)
const FPS_SCALE = layout.animation.mobVfx.fpsScale; // sheet fps çarpanı (sheet 12 fps x fpsScale; ayar data/battle-layout.json > animation.mobVfx)
const HOLD_MS = layout.animation.mobVfx.impactHoldMs; // vuruş karesinde donma (ms, k.slow ile)
const MOB_SCALE = (layout.animation.mobVfx as { scale?: number }).scale ?? 1; // yalnızca ChatGPT mob sheet'leri (%20 küçük: 0.8); kodla çizilen sınıf efektleri etkilenmez
const WIND_MULT = layout.animation.mobVfx.windMult; // spec.windMs (hazırlık pozu) çarpanı

/** Skill başına oynatma ayarı (data/battle-layout.json > animation.mobVfx.skills; alanların anlamı oradaki _not2 / _not3). */
export interface MobTune {
  size?: number;
  speed?: number;
  dx?: number;
  dy?: number;
  align?: 'base' | 'core' | 'none';
  alignPre?: boolean;
  travel?: number;
  lane?: boolean;
  /** Gerçek savaşta el yapımı (kodla çizilen) efekt oynasın (src/game/mob-vfx-hand.ts). */
  hand?: boolean;
  /** Kodla ara kare yöntemi ('crossfade' | 'crossfade+motion') ya da false = bu skill'de ara kare yok. Yoksa data/vfx-inbetween.json > player. */
  ib?: string | false;
  /** Ara kare katı (2-5) bu skill için. Yoksa data/vfx-inbetween.json > player.sub. */
  sub?: number;
  /** Mermi çıkış noktası kayması (ekran px): srcDx saldıranın baktığı yöne (+ ileri), srcDy dikey (- yukarı). */
  srcDx?: number;
  srcDy?: number;
  /** 'cast': mermi saldıranın büyü/silah ucundan çıkar (CombatantView.castPoint, poz yoksa srcDx/srcDy ile gövde). */
  from?: 'cast';
  /** cells: efekt hücrenin bu kadar px üstünden DÜŞER (yağan ok); uçuş karesi `fall` ms boyunca iner, sonra çarpma kareleri oynar. */
  fromAbove?: number;
  fall?: number;
  /** Efekt (ve vuruş anı) bu kadar ms geç başlar: saldıranın vuruş hareketine (swing) uydurma. */
  lag?: number;
  /** bolt: hazırlık animasyonu ('attack' = silah savurma; varsayılan 'cast'). */
  anim?: 'attack';
  /** false: vuruş anındaki yuvarlak parlama (flash) çizilmez (Shield Wall'daki mavi daire). */
  flash?: boolean;
  /** Karenin kenarından bu kadar px silinir: sheet'e çizili dikdörtgen çerçeve (Ember Toss). */
  trim?: number;
  /** Sheet'teki mermi eğimi (derece, sağa bakarken aşağı doğru): uçuşta mermi gerçek yola döndürülür (çapraz görünmesin). */
  art?: number;
  /** melee: hedefe bu kadar px daha az yaklaş (yalnızca görüntü; mızraklılar). */
  standOff?: number;
  /** melee: vuruşu bu skill'in sheet'i oynar (ısırma), skill'in KENDİ sheet'i saldıranın arkasında iz (trail) olur (Run Down). */
  bite?: string;
  /** cells (aşamalı): tek bir mermi tüm aşamaları katederek ilerler (parça parça yeni mermi yok); ok gövdesi uzar (`stretch`), dayanak `originX`. */
  single?: boolean;
  stretch?: number;
  originX?: number;
  /**
   * bolt: UÇAN MERMİ (Harita 2, Ömer 2026-10-25): sheet'in `flyFrame` karesi saldırandan hedefe `fly` ms'de uçar (`arc` px yay; `flyArt`: karedeki
   * mermi eğimi, derece, uçuşta yolun teğetine döner; `grow`: başlangıç ölçeği, varışta 1; `echo`: arkasında sönen kopya sayısı = dalga izi),
   * varınca sheet hedefte `flyFrom` karesinden oynar. `throw`: hazırlık halkası yerine fırlatma hareketi (geri kaykıl + ileri savur).
   */
  fly?: number;
  flyFrame?: number;
  flyFrom?: number;
  arc?: number;
  flyArt?: number;
  grow?: number;
  echo?: number;
  throw?: boolean;
  /** Burrow: Fortified görünürken birim bu oranda zemine gömülü durur (sprite aşağı kayar, alt kısmı kırpılır; buryDepth + BattleScene.refreshBadges). */
  bury?: number;
  /** Son kare bitince birden kaybolmasın: son karede durur ve bu kadar ms'de yumuşakça solar (Fire Volley: saplanan oklar). */
  fadeOut?: number;
}
const TUNE = layout.animation.mobVfx as unknown as { sizeMult?: number; speedMult?: number; stabilize: { minMass: number; maxShift: number }; skills: Record<string, MobTune> };
const BOOST_ALPHA = 0.35; // ikinci ADD kopyanın şeffaflığı (soluk sanatı parlatır; açık zeminde yıkamaz)
const FLASH_HEX = '#ffe2b0'; // spec.hex yoksa sıcak beyaz
const FLASH_SIZE = 150; // vuruş parlaması başlangıç çapı (px)
const FLASH_GROW = 2.4; // parlama büyüme çarpanı
const FLASH_MS = 220; // parlama süresi (ms, k.slow ile)
const FLASH_ALPHA = 0.85;
const ADD_BLEND = 1; // Phaser.BlendModes.ADD
const CELL_DEPTH = 8; // hücre zemin merkezi (ayak y'sinin ~4-6 px üstü) -> o hücredeki birimin derinliğinin hemen üstü
const SHAKE_MS = 130; // yalnızca melee
const SHAKE_MAG = 0.004;
const STEP = 180; // aşamalı alan skill'inde aşamalar arası (ms)
const TRAIL_MS = 300; // iz (trail) sheet'inin toplam oynama süresi (ms, yavaşlatılmadan)
const TRAIL_SIZE = 300; // iz sheet'inin ekran boyu (px)
const TRAIL_ORIGIN: [number, number] = [0.84, 0.5]; // iz sheet'inin başı (alev ucu) sağda: aynalanınca saldıranın önünde
const CAST_PEAK_MS = 130; // büyü ucunun okunduğu an (windUp'ın tepe noktası; bu anda cast pozu oturmuş)
const FAST_RAIN_X = 0.55; // yağan okun yatay eğimi (dikey px başına)
const BURY_HOLD_MS = 1500; // gömülen birim durum rozeti görünmeden en az bu kadar gömülü kalır (ms, k.slow ile)

/**
 * Zemin eğimi (ekranda yatay / dikey px): hedef tahtanın yuva ızgarasında bir sıra aşağı inince x ne kadar kayar (data/battle-layout.json yuvaları).
 * Saldırgan düşmansa (flip) hedef oyuncu tahtasıdır: orada aşağı = sola (negatif), düşman tahtasında aşağı = sağa.
 */
function groundTilt(flip: boolean): number {
  const slots = (flip ? layout.partySlots : layout.enemySlots) as Array<{ x: number; y: number }>;
  return (slots[1]!.x - slots[0]!.x) / (slots[1]!.y - slots[0]!.y);
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Vuruş karesine kadar geçen süre (ms, yavaşlatılmadan; sheet fps'i meta'dan). */
const impactMs = (frame: number, fps: number): number => (frame * 1000) / Math.max(1, fps);

/** Mermi sheet'inin eğimini (art, derece) uçuş yönüne çevirir: dönme açısı (radyan, -PI..PI). flip = sheet yatay aynalı (sola uçan). */
export function flightRotation(from: Pt, to: Pt, artDeg: number, flip: boolean): number {
  const th = Math.atan2(to.y - from.y, to.x - from.x);
  const a = (artDeg * Math.PI) / 180;
  let r = flip ? th - Math.PI + a : th - a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
}

/** Skill'in efektli tune'u (bite: asıl vuruşu yapan skill'in ayarı + kendi ayarı üstüne). */
function tuneOf(skillId: string): MobTune {
  const own = TUNE.skills[skillId] ?? {};
  return own.bite ? { ...(TUNE.skills[own.bite] ?? {}), ...own } : own;
}

/** Skill'in GERÇEK savaşta oynayan sürümü (debug paneli "Real battle" satırı için): el yapımı mı, ara kare yöntemi / katı. */
export function mobRealPlay(skillId: string): { hand: boolean; ib: { method: string; sub: number } | null } {
  const t = TUNE.skills[skillId] ?? {};
  if (t.hand) return { hand: true, ib: null };
  const tune = tuneOf(skillId);
  return { hand: false, ib: realInbetween(tune) };
}

function realInbetween(tune: MobTune): { method: string; sub: number } | null {
  if (tune.ib === false || !IB.enabled) return null;
  return { method: tune.ib ?? IB.method, sub: tune.sub ?? IB.sub };
}

/** El yapımı efekt modülü tembel yüklenir: yaklaşık 7000 satırlık çizim kodu savaş parçasına girmesin. */
let handMod: Promise<typeof import('./mob-vfx-hand')> | null = null;
const loadHand = async (skillId: string): Promise<MobHandVfx | undefined> => (await (handMod ??= import('./mob-vfx-hand'))).MOB_HAND_VFX[skillId];

/**
 * El yapımı efektler TÜM birimlerin üstünde çizilir (Ömer 2026-10-19: "araya sıkışmaz"); çizim dosyaları birim derinliğine göre derinlik verir
 * (src/game/mob-vfx-hand/*), o yüzden efekt süresince sahneye eklenen / havuzdan yeniden alınan düşük derinlikli nesneler her karede k.DEPTH
 * katmanına çıkarılır (göreli sıra korunur). Birim kapsayıcıları (Container), arka plan ve arayüz (derinlik 3000+) dokunulmaz. groundPlane:
 * zemine yatan desen (Glyph of Breaking) birim sırasında kalır.
 */
const FRONT_MAX = 3000;
const FRONT_WINDOW_MS = 5000;
const liftedFx = new WeakSet<object>();
function frontLayer(c: VfxCtx, k: VfxKit): void {
  const sc = c.scene;
  type D = Phaser.GameObjects.GameObject & { depth: number; setDepth: (d: number) => unknown };
  const before = new Set<object>();
  for (const o of sc.children.list) if (o.type !== 'Container') before.add(o);
  const lift = (): void => {
    for (const o of sc.children.list as D[]) {
      if (o.type === 'Container') continue;
      const d = o.depth;
      if (d <= 0 || d >= FRONT_MAX) continue;
      if (before.has(o) && !liftedFx.has(o)) continue;
      liftedFx.add(o);
      o.setDepth(k.DEPTH + d * 0.001);
    }
  };
  sc.events.on('postupdate', lift);
  const stop = (): void => {
    sc.events.off('postupdate', lift);
  };
  sc.time.delayedCall(k.slow(FRONT_WINDOW_MS), stop);
  sc.events.once('shutdown', stop);
}

function build(skillId: string, s0: MobVfxSpec): V2Vfx {
  const own = TUNE.skills[skillId] ?? {};
  const tune = tuneOf(skillId);
  // bite (Run Down): vuruşu başka skill'in sheet'i yapar (spec ve sheet onunki), skill'in kendi sheet'i iz olur
  const bs = own.bite ? MOB_VFX_SPECS[own.bite] : undefined;
  const s = bs ?? s0;
  const ownId = mobSheetId(s0.mob, skillId);
  const origId = bs ? mobSheetId(bs.mob, own.bite!) : ownId;
  return async (c: VfxCtx, k: VfxKit) => {
    // el yapımı sürüm: test panelinin seçimi ya da (gerçek savaşta) skill'in kararı; sheet yüklenmez, vuruş anı asıl sheet'inkiyle aynı
    const handFn = mobVfxTest.on ? mobVfxTest.hand : own.hand ? ((await loadHand(skillId)) ?? null) : null;
    if (handFn) {
      if (!s0.groundPlane) frontLayer(c, k);
      return handFn(c, k, impactMs(s0.impact, (vfxSheetFile(ownId)?.meta.fps ?? 12) * FPS_SCALE));
    }
    // test ekranı: 16 karelik sheet (varsa) ve kare sayısı oranı (vuruş karesi ve fps ona göre); gerçek savaşta hep asıl sheet
    const tweenId = mobVfxTest.on && mobVfxTest.tween ? mobTweenSheetId(s.mob, bs ? own.bite! : skillId) : null;
    const id = tweenId && vfxSheetFile(tweenId) ? tweenId : origId;
    const mult = (vfxSheetFile(id)?.meta.frames ?? 8) / (vfxSheetFile(origId)?.meta.frames ?? 8);
    const impactF = Math.round(s.impact * mult);
    const ib = mobVfxTest.on ? mobVfxTest.ib : realInbetween(tune);
    const flip = c.actor.combatant.side !== 'party';
    const fwd = flip ? -1 : 1; // saldıranın baktığı yön (ekran x)
    await k.sheetsReady(c.scene, bs ? [id, ownId] : [id]);
    const fps = (vfxSheetFile(id)?.meta.fps ?? 12) * FPS_SCALE * (tune.speed ?? TUNE.speedMult ?? 1);
    const size = Math.min(SIZE_MAX, Math.round(s.size * SIZE_MULT * MOB_SCALE * (tune.size ?? TUNE.sizeMult ?? 1)));
    const off: Pt = { x: tune.dx ?? 0, y: tune.dy ?? 0 };
    const travelF = Math.round((tune.travel ?? 0) * mult);
    const lag = tune.lag ?? 0;
    const flyMs = s.mode === 'bolt' && tune.fly ? tune.fly : 0;
    // `fall`: zamanlamadaki uçuş payı (yağan ok ya da uçan mermi; ikisi aynı skill'de olmaz)
    const fall = tune.fall ?? flyMs;
    const startF = flyMs ? Math.round((tune.flyFrom ?? 1) * mult) : fall ? 1 : 0; // uçuştan sonra çarpma sheet'i bu kareden oynar
    const hitT = impactMs(impactF - startF, fps); // sheet başlangıcından vuruş karesine (ms, yavaşlatılmadan)
    // kare hizalama: vuruş sonrası kareler vuruş karesinin yerine oturur; uçuş kareleri ağırlık merkezinden vuruş noktasına (yolu sprite yapar)
    const alignMode = tune.align ?? (s.at === 'ground' ? 'base' : 'core');
    const stabilize: StabilizeOpts | undefined =
      alignMode === 'none' && !travelF
        ? undefined
        : {
            ref: impactF,
            anchor: alignMode === 'none' ? (s.at === 'ground' ? 'base' : 'core') : alignMode,
            pre: alignMode !== 'none' && (tune.alignPre ?? (s.mode === 'self' || s.mode === 'ally')),
            travel: travelF,
            minMass: TUNE.stabilize.minMass,
            maxShift: TUNE.stabilize.maxShift,
          };
    const flashColor = parseInt((s.hex ?? FLASH_HEX).slice(1), 16);
    const sfx = c.skill.sfx ?? [];
    // 'bolt' + 'hit' (tek hedefli mermi): vuruş hedefin GÖVDE MERKEZİNDE değil, saldırgana bakan kenarında (ilk temas; data/battle-layout.json > animation.contactEdgeRatio)
    const pos = (v: CombatantView): Pt => (s.at === 'hit' ? (s.mode === 'bolt' ? k.contact(c.actor, v) : k.spot(v)) : k.feet(v));
    // dayanak noktası (origin): vuruş karesinden okunur, pivota değil (başlık yorumu). Doku okunamazsa (null) sheet pivotu kalır.
    const meta = vfxSheetFile(id)?.meta;
    const [fw, fh] = meta?.frame_size ?? [256, 256];
    const anchors = s.at === 'ground' || s.mode === 'melee' || s.mode === 'bolt' ? k.sheetAnchors(c.scene, id, impactF) : null;
    const origin: [number, number] | null = !anchors
      ? null
      : s.at === 'ground'
        ? [anchors.baseX / fw, anchors.baseY / fh]
        : [anchors.core[0] / fw, anchors.core[1] / fh];
    const frameCount = meta?.frames ?? 8;
    const flashAt = (p: Pt, depth: number): void => {
      if (tune.flash === false) return;
      const f = c.scene.add.circle(p.x, p.y, FLASH_SIZE / 2, flashColor, FLASH_ALPHA).setBlendMode(ADD_BLEND).setDepth(depth + 3);
      c.scene.tweens.add({ targets: f, scale: FLASH_GROW, alpha: 0, duration: k.slow(FLASH_MS), onComplete: () => f.destroy() });
    };
    // DERİNLİK (Ömer 2026-10-19: "önündeki karakterlerin de önüne çıkacak, araya sıkışmaz"): efekt TÜM birimlerin üstünde (k.DEPTH, oyuncu
    // skill efektleriyle aynı katman). Yalnızca zemine yatan desen (groundPlane: Glyph of Breaking) birim sırasına göre kalır: hedefin hemen
    // üstü, öndeki birimlerin altı (birim derinliği = ayak y'si), yoksa öndekinin ayaklarına biner.
    const play = (p0: Pt, delay = 0, unitDepth = k.DEPTH, from0?: Pt): void => {
      const depth = s.groundPlane ? unitDepth : k.DEPTH;
      const p = { x: p0.x + off.x, y: p0.y + off.y };
      const flying = !!from0 && (travelF > 0 || fall > 0);
      const from = flying ? { x: from0!.x + off.x, y: from0!.y + off.y } : null;
      const base = {
        size,
        flipX: flip,
        fps,
        ...(s.squashY ? { squashY: s.squashY } : {}),
        ...(s.groundPlane ? { groundTilt: groundTilt(flip) } : {}),
        ...(origin ? { origin } : {}),
        ...(ib ? { inbetween: ib } : {}), // kodla ara kare (data/vfx-inbetween.json > player, skill başına tune.ib / tune.sub)
        ...(stabilize ? { stabilize } : {}),
        ...(tune.trim ? { trim: tune.trim } : {}),
      };
      const pair = (o: { delay?: number; frame?: number; keep?: boolean; from?: number }, at: Pt): Array<NonNullable<ReturnType<VfxKit['sheet']>>> => {
        const fade = !o.keep && !!tune.fadeOut;
        const main = k.sheet(c.scene, id, at.x, at.y, { ...base, ...o, ...(fade ? { keep: true } : {}), depth: depth + 1 });
        const glow = k.sheet(c.scene, id, at.x, at.y, { ...base, ...o, ...(fade ? { keep: true } : {}), depth: depth + 2, alpha: BOOST_ALPHA, blend: ADD_BLEND });
        const out = [main, glow].filter((x): x is NonNullable<typeof x> => !!x);
        // tune.fadeOut: son karede kalır, sonra solup yok olur (efekt bitince birden kaybolmaz)
        if (fade)
          for (const spr of out)
            spr.once('animationcomplete', () => {
              if (spr.active) c.scene.tweens.add({ targets: spr, alpha: 0, duration: k.slow(tune.fadeOut!), ease: 'Sine.easeIn', onComplete: () => spr.active && spr.destroy() });
            });
        return out;
      };
      let objs: Array<NonNullable<ReturnType<VfxKit['sheet']>>>;
      if (from && flyMs) {
        flyShot(from, p, delay + lag);
        objs = pair({ delay: delay + lag + flyMs, from: startF }, p);
      } else if (from && fall) {
        // yağan efekt (Scatter Quarrels): uçuş karesi (0) yukarıdan hücreye iner, sonra çarpma kareleri o hücrede oynar
        const fl = pair({ frame: 0, keep: true, delay: delay + lag }, from);
        c.scene.tweens.add({ targets: fl, x: p.x, y: p.y, delay: k.slow(delay + lag), duration: k.slow(fall), ease: 'Quad.easeIn', onComplete: () => fl.forEach((o) => o.destroy()) });
        objs = pair({ delay: delay + lag + fall, from: startF }, p);
      } else {
        objs = pair({ delay: delay + lag }, from ?? p);
        // uçuş: vuruş karesine kadar saldırandan hedefe düz ilerler; çarpma kareleri hedefte oturur
        if (from && objs.length)
          c.scene.tweens.add({ targets: objs, x: p.x, y: p.y, delay: k.slow(delay + lag), duration: k.slow(hitT), ease: 'Linear' });
        // mermi eğimi: sheet'te mermi aşağı eğik çizili; uçuşta gerçek yola döner, çarpma karesinde düz
        if (from && tune.art !== undefined) {
          const r = flightRotation(from, p, tune.art, flip);
          for (const o of objs) o.setRotation(r);
        }
      }
      if (!objs.length) return;
      // vuruş karesi: sheet'i kısa dondur + hedefte parlama
      c.scene.time.delayedCall(k.slow(delay + lag + fall + hitT), () => {
        for (const o of objs) {
          if (!o.active) continue;
          o.anims.pause();
          if (tune.art !== undefined) o.setRotation(0);
        }
        flashAt(p, depth);
        c.scene.time.delayedCall(k.slow(HOLD_MS), () => {
          for (const o of objs) if (o?.active) o.anims.resume();
        });
      });
    };
    /**
     * UÇAN MERMİ (tune.fly): `flyFrame` karesi (ağırlık merkezinden tutulur) saldırandan hedefe yay çizerek uçar, teğete döner; `echo` kopyası
     * aynı yolda biraz geriden, sönük gelir (dalga izi). Varınca silinir: çarpma kareleri o anda hedefte başlar (play).
     */
    function flyShot(from: Pt, to: Pt, delay: number): void {
      const fr = Math.round((tune.flyFrame ?? 0) * mult);
      const an = k.sheetAnchors(c.scene, id, fr);
      const o: [number, number] | undefined = an ? [an.core[0] / fw, an.core[1] / fh] : undefined;
      const echoes = tune.echo ?? 0;
      const opts = { size, flipX: flip, frame: fr, keep: true, delay, ...(o ? { origin: o } : {}) };
      const parts: Array<{ spr: Phaser.GameObjects.Sprite; lagU: number; alpha: number }> = [];
      for (let i = echoes; i >= 0; i--) {
        const alpha = i ? 0.5 / i : 1;
        const main = k.sheet(c.scene, id, from.x, from.y, { ...opts, depth: k.DEPTH + 1 - i * 0.01, alpha });
        const glow = k.sheet(c.scene, id, from.x, from.y, { ...opts, depth: k.DEPTH + 2 - i * 0.01, alpha: BOOST_ALPHA * alpha, blend: ADD_BLEND });
        for (const spr of [main, glow]) if (spr) parts.push({ spr, lagU: i * 0.14, alpha: spr.alpha });
      }
      if (!parts.length) return;
      const arc = tune.arc ?? 0;
      const g0 = tune.grow ?? 1;
      const sx0 = parts[0]!.spr.scaleX;
      const sy0 = parts[0]!.spr.scaleY;
      const place = (u0: number): void => {
        for (const q of parts) {
          if (!q.spr.active) continue;
          const u = u0 - q.lagU;
          q.spr.setAlpha(u <= 0 ? 0 : q.alpha);
          const v = Math.max(0, u);
          const x = from.x + (to.x - from.x) * v;
          const y = from.y + (to.y - from.y) * v - arc * 4 * v * (1 - v);
          const g = g0 + (1 - g0) * v;
          q.spr.setPosition(x, y).setScale(sx0 * g, sy0 * g);
          if (tune.flyArt !== undefined) q.spr.setRotation(flightRotation({ x: 0, y: 0 }, { x: to.x - from.x, y: to.y - from.y - arc * 4 * (1 - 2 * v) }, tune.flyArt, flip));
        }
      };
      place(0);
      c.scene.tweens.addCounter({
        from: 0,
        to: 1,
        delay: k.slow(delay),
        duration: k.slow(flyMs),
        onUpdate: (tw) => place(tw.getValue() ?? 0),
        onComplete: () => parts.forEach((q) => q.spr.active && q.spr.destroy()),
      });
    }
    /** Fırlatma hareketi (tek görselli mob: poz yok): geri kaykılır, ileri savurur (bırakış anında çözülür), sonra doğrulur. */
    const throwMotion = (): Promise<void> => {
      const spr = c.actor.sprite;
      c.actor.play('attack');
      return new Promise<void>((resolve) => {
        c.scene.tweens.add({
          targets: spr,
          angle: -fwd * 11,
          x: -fwd * 10,
          duration: k.slow(170),
          ease: 'Quad.easeOut',
          onComplete: () =>
            c.scene.tweens.add({
              targets: spr,
              angle: fwd * 9,
              x: fwd * 14,
              duration: k.slow(90),
              ease: 'Quad.easeIn',
              onComplete: () => {
                resolve();
                c.scene.tweens.add({ targets: spr, angle: 0, x: 0, duration: k.slow(200), ease: 'Sine.easeOut', onComplete: () => c.actor.play('idle') });
              },
            }),
        });
      });
    };
    const land = (): Promise<void> => {
      const d = deferred();
      c.scene.time.delayedCall(k.slow(lag + fall + hitT), () => {
        for (const x of sfx.slice(1)) c.sfx(x);
        d.resolve();
      });
      return d.promise;
    };
    if (sfx[0]) c.sfx(sfx[0]);

    // uçuşun çıkış noktası: saldıranın göğsü (zemin efektinde ayağı) + tune.srcDx / srcDy; tune.from='cast' ise büyü / silah ucu (cast pozunun tepesinde okunur)
    let tip: Pt | null = null;
    if (tune.from === 'cast') c.scene.time.delayedCall(k.slow(CAST_PEAK_MS), () => (tip = c.actor.castPoint?.() ?? null));
    const src = (): Pt => {
      if (tip) return tip;
      const b = s.at === 'hit' ? k.spot(c.actor) : k.feet(c.actor);
      return { x: b.x + fwd * (tune.srcDx ?? 0), y: b.y + (tune.srcDy ?? 0) };
    };
    if (s.mode === 'melee') {
      if (s.windMs) {
        c.actor.play('cast');
        await new Promise<void>((r) => c.scene.time.delayedCall(k.slow(s.windMs! * WIND_MULT), r));
      }
      const t = c.targets[0];
      if (bs) {
        // iz (trail): skill'in kendi sheet'i atılma boyunca saldıranın arkasında akar; ısırma (bs) hedefte vurur
        const spr = k.sheet(c.scene, ownId, c.actor.container.x, c.actor.container.y, { size: TRAIL_SIZE, flipX: flip, fps: ((vfxSheetFile(ownId)?.meta.frames ?? 8) * 1000) / TRAIL_MS, origin: TRAIL_ORIGIN, depth: k.DEPTH + 1 });
        if (spr)
          c.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: k.slow(TRAIL_MS),
            onUpdate: () => {
              if (!spr.active) return;
              const q = k.spot(c.actor);
              spr.setPosition(q.x - fwd * c.actor.w * 0.1, q.y);
            },
            onComplete: () => spr.active && spr.destroy(),
          });
      }
      await c.lunge(t ? t.container.x : c.actor.container.x, tune.standOff);
      for (const v of c.targets) play(pos(v), 0, v.container.depth);
      c.scene.time.delayedCall(k.slow(lag + hitT), () => k.shake(c.scene, SHAKE_MS, SHAKE_MAG));
      return land();
    }
    if (tune.throw) await throwMotion();
    else await c.windUp(s.hex ?? c.skill.fx ?? '#ffffff', tune.anim ?? 'cast');
    if (s.mode === 'bolt' || s.mode === 'ally') {
      for (const v of c.targets) play(pos(v), 0, v.container.depth, s.mode === 'bolt' ? src() : undefined);
      return land();
    }
    if (s.mode === 'self') {
      play(k.feet(c.actor), 0, c.actor.container.depth);
      // gömülme (Burrow): kum patlamasının vuruşunda batar; sonra Fortified rozeti görünür kaldıkça gömülü durur (BattleScene.refreshBadges)
      if (tune.bury) {
        const actor = c.actor;
        c.scene.time.delayedCall(k.slow(lag + Math.max(0, hitT - 40)), () => actor.setBuried(tune.bury!, BURY_HOLD_MS));
      }
      return land();
    }
    const cells = c.cells.length ? c.cells : c.targets.map((v) => k.feet(v));
    if (s.mode === 'center') {
      // alanın merkezi = gerçekten kapsanan hücrelerin zemin konumlarının ağırlık merkezi (tıklanan hücre değil; kenarda kırpılan alanda ikisi farklıdır)
      const m = cells.length ? cells.reduce((a, p) => ({ x: a.x + p.x / cells.length, y: a.y + p.y / cells.length }), { x: 0, y: 0 }) : (c.centerPos ?? k.feet(c.actor));
      const mid = s.at === 'hit' ? { x: m.x, y: m.y - 40 } : m;
      play(mid, 0, Math.max(...cells.map((q) => q.y)) + CELL_DEPTH);
      return land();
    }
    // yağan efekt: çıkış noktası hücrenin üstü (sheet'teki ok yönüne yakın eğimle), yoksa saldıran
    const rainFrom = (p: Pt): Pt => (tune.fromAbove ? { x: p.x - fwd * tune.fromAbove * FAST_RAIN_X, y: p.y - tune.fromAbove } : src());
    // cells: aşamalı skill'de aşama aşama (her aşama bir öncekinden ~180 ms sonra), değilse küçük rastgele gecikmeyle hepsi birden
    if (c.stages && c.stages.length > 1) {
      if (tune.single) {
        playSingle();
      } else {
        c.stages.forEach((st, i) => {
          // lane: aşamanın efekti bir önceki aşamanın hücresinden yenisine ilerler (ışınlanma yok, önden arkaya süpürme)
          const prev = i > 0 ? c.stages![i - 1]!.cells[0] : undefined;
          for (const p of st.cells) play(p, i * STEP, p.y + CELL_DEPTH, tune.lane ? (prev ?? src()) : rainFrom(p));
        });
      }
      c.stages.forEach((_, i) => c.scene.time.delayedCall(k.slow(i * STEP + lag + fall + hitT), () => c.releaseStage(i)));
      return land();
    }
    cells.forEach((p, i) => play(p, i * 50, p.y + CELL_DEPTH, rainFrom(p)));
    return land();

    /**
     * TEK MERMİ (Wall of Pikes; Ömer 2026-10-20: "hücre başına parça parça atma, okun arka kısmı trailer olarak uzasın, aynı ok sürekli gitsin"):
     * tek sprite saldırandan ilk aşamaya, oradan sırayla sonrakilere ilerler; uçuş kareleri (0..vuruş-1) döngüyle oynar, gövdesi yol boyunca uzar
     * (`stretch`, baş `originX`'te sabit); her aşamada kısa parlama + hasar, SON aşamada çarpma kareleri oynar. Kareleri elle sürer.
     */
    function playSingle(): void {
      const stages = c.stages!;
      const pts = stages.map((st) => {
        const q = st.cells[0] ?? k.feet(c.actor);
        return { x: q.x + off.x, y: q.y + off.y };
      });
      const n = pts.length;
      const sub = ib && ib.sub > 1 ? ib.sub : 1;
      const start = { x: src().x + off.x, y: src().y + off.y };
      const depth = k.DEPTH;
      const base = {
        size,
        flipX: flip,
        frame: 0,
        keep: true,
        ...(origin ? { origin: [tune.originX ?? origin[0], origin[1]] as [number, number] } : tune.originX !== undefined ? { origin: [tune.originX, 0.5] as [number, number] } : {}),
        ...(ib ? { inbetween: ib } : {}),
        ...(stabilize ? { stabilize } : {}),
      };
      const main = k.sheet(c.scene, id, start.x, start.y, { ...base, depth: depth + 1 });
      const glow = k.sheet(c.scene, id, start.x, start.y, { ...base, depth: depth + 2, alpha: BOOST_ALPHA, blend: ADD_BLEND });
      const objs = [main, glow].filter((x): x is NonNullable<typeof x> => !!x);
      if (!objs.length) return;
      const fStep = 1000 / (fps * sub); // türev kare süresi (ms)
      const flightN = Math.max(1, impactF) * sub;
      const tLast = hitT + (n - 1) * STEP; // son aşamaya varış (ms, yavaşlatılmadan)
      const total = tLast + ((frameCount - impactF) * 1000) / fps;
      const sx0 = objs[0]!.scaleX;
      const at = (t: number): Pt => {
        if (t < hitT) {
          const u = t / hitT;
          return { x: start.x + (pts[0]!.x - start.x) * u, y: start.y + (pts[0]!.y - start.y) * u };
        }
        const j = Math.min(n - 2, Math.floor((t - hitT) / STEP));
        if (j < 0 || t >= tLast) return pts[n - 1]!;
        const u = (t - hitT - j * STEP) / STEP;
        return { x: pts[j]!.x + (pts[j + 1]!.x - pts[j]!.x) * u, y: pts[j]!.y + (pts[j + 1]!.y - pts[j]!.y) * u };
      };
      for (let i = 0; i < n; i++) c.scene.time.delayedCall(k.slow(hitT + i * STEP), () => flashAt(pts[i]!, depth));
      c.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: k.slow(total + 40),
        onUpdate: (tw) => {
          const t = Math.min(total, (tw.getValue() ?? 0) * (total + 40));
          const q = at(t);
          const fr = t < tLast ? Math.floor(t / fStep) % flightN : Math.min(frameCount * sub - 1, impactF * sub + Math.floor((t - tLast) / fStep));
          const sx = t < tLast ? sx0 * (1 + (tune.stretch ?? 0) * (t / Math.max(1, tLast))) : sx0;
          for (const o of objs) {
            if (!o.active) continue;
            o.setPosition(q.x, q.y).setFrame(fr).setScale(sx, o.scaleY);
          }
        },
        onComplete: () => objs.forEach((o) => o.active && o.destroy()),
      });
    }
  };
}

/**
 * Gömülme (tune.bury, Burrow): birimin skill'lerinden biri gömülen türdense ve ekranda `status` durumu görünüyorsa sprite'ın gömülü oranı, değilse 0.
 * BattleScene her karede uygular (durum rozetleriyle aynı an: skill'in kum patlamasının vuruşunda batar, Fortified bitince çıkar).
 */
export function buryDepth(skillIds: readonly string[], shownStatuses: readonly string[]): number {
  for (const id of skillIds) {
    const b = TUNE.skills[id]?.bury;
    if (b && shownStatuses.includes('fortify')) return b;
  }
  return 0;
}

/** skill id -> efekt (sheet dosyası olmayan skill burada yok: ödünç efektini oynar). */
export function mobVfxOf(skillId: string, hasSheet: (id: string) => boolean): V2Vfx | undefined {
  const s = MOB_VFX_SPECS[skillId];
  if (!s || !hasSheet(mobSheetId(s.mob, skillId))) return undefined;
  return (cache[skillId] ??= build(skillId, s));
}
const cache: Record<string, V2Vfx> = {};
