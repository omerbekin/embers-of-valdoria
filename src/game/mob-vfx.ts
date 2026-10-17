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
 * (hasar rakamları o an), sheet arkada biter. `at`: 'hit' göğüs hizası (ortalanmış sheet), 'ground' ayak/hücre zemini (alta oturan sheet).
 * Phaser'ı çalışma zamanında içe aktarmaz (yalnızca tip): node testlerinde de yüklenir.
 */
import type { CombatantView } from './combatant-view';
import type { VfxCtx } from './vfx';
import type { VfxKit } from './vfx-versions';
import type { V2Vfx } from './art-v2/types';
import { mobSheetId, vfxSheetFile } from './vfx-sheet-files';

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
  peat_smoke: { mob: 'moor_raider', mode: 'cells', at: 'ground', impact: 2, size: 210, hex: '#8a6a48' },
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
  glyph_of_breaking: { mob: 'deep_runecaller', mode: 'center', at: 'hit', impact: 3, size: 460, squashY: 0.62, hex: '#4fe3ff' },
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
  chain_hook: { mob: 'bridge_warden', mode: 'bolt', at: 'hit', impact: 3, size: 250, hex: '#ff8a3a' },
  ash_brand: { mob: 'bridge_warden', mode: 'bolt', at: 'hit', impact: 4, size: 260, hex: '#ff6a1a' },
  fall_of_kings_bridge: { mob: 'bridge_warden', mode: 'center', at: 'ground', impact: 3, size: 520, hex: '#ff5a1a' },
};

type Pt = { x: number; y: number };

/** OYNATMA AYARLARI (Ömer 2026-10-17: mob efektleri savaşta zor seçiliyordu). Tüm sayılar burada. */
const SIZE_MULT = 1.5; // her spec.size bununla çarpılır (skill'ler arası oran korunur)
const SIZE_MAX = 640; // büyük (center/cells) efektler ekranı kaplamasın (1080 yükseklikte ~%60)
const FPS_SCALE = 0.7; // sheet fps çarpanı (12 fps -> ~8,4; 8 kare ~0,95 sn)
const HOLD_MS = 110; // vuruş karesinde donma (ms, k.slow ile)
const BOOST_ALPHA = 0.35; // ikinci ADD kopyanın şeffaflığı (soluk sanatı parlatır; açık zeminde yıkamaz)
const FLASH_HEX = '#ffe2b0'; // spec.hex yoksa sıcak beyaz
const FLASH_SIZE = 150; // vuruş parlaması başlangıç çapı (px)
const FLASH_GROW = 2.4; // parlama büyüme çarpanı
const FLASH_MS = 220; // parlama süresi (ms, k.slow ile)
const FLASH_ALPHA = 0.85;
const ADD_BLEND = 1; // Phaser.BlendModes.ADD
const SHAKE_MS = 130; // yalnızca melee
const SHAKE_MAG = 0.004;

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Vuruş karesine kadar geçen süre (ms, yavaşlatılmadan; sheet fps'i meta'dan). */
const impactMs = (s: MobVfxSpec, fps: number): number => (s.impact * 1000) / Math.max(1, fps);

function build(skillId: string, s: MobVfxSpec): V2Vfx {
  const id = mobSheetId(s.mob, skillId);
  return async (c: VfxCtx, k: VfxKit) => {
    await k.sheetsReady(c.scene, [id]);
    const flip = c.actor.combatant.side !== 'party';
    const fps = (vfxSheetFile(id)?.meta.fps ?? 12) * FPS_SCALE;
    const size = Math.min(SIZE_MAX, Math.round(s.size * SIZE_MULT));
    const flashColor = parseInt((s.hex ?? FLASH_HEX).slice(1), 16);
    const sfx = c.skill.sfx ?? [];
    const pos = (v: CombatantView): Pt => (s.at === 'hit' ? k.spot(v) : k.feet(v));
    const play = (p: Pt, delay = 0): void => {
      const base = { size, flipX: flip, fps, delay, ...(s.squashY ? { squashY: s.squashY } : {}) };
      const main = k.sheet(c.scene, id, p.x, p.y, { ...base, depth: k.DEPTH + 20 });
      const glow = k.sheet(c.scene, id, p.x, p.y, { ...base, depth: k.DEPTH + 21, alpha: BOOST_ALPHA, blend: ADD_BLEND });
      if (!main) return;
      // vuruş karesi: sheet'i kısa dondur + hedefte parlama
      c.scene.time.delayedCall(k.slow(delay + impactMs(s, fps)), () => {
        for (const o of [main, glow]) if (o?.active) o.anims.pause();
        const f = c.scene.add.circle(p.x, p.y, FLASH_SIZE / 2, flashColor, FLASH_ALPHA).setBlendMode(ADD_BLEND).setDepth(k.DEPTH + 22);
        c.scene.tweens.add({ targets: f, scale: FLASH_GROW, alpha: 0, duration: k.slow(FLASH_MS), onComplete: () => f.destroy() });
        c.scene.time.delayedCall(k.slow(HOLD_MS), () => {
          for (const o of [main, glow]) if (o?.active) o.anims.resume();
        });
      });
    };
    const land = (): Promise<void> => {
      const d = deferred();
      c.scene.time.delayedCall(k.slow(impactMs(s, fps)), () => {
        for (const x of sfx.slice(1)) c.sfx(x);
        d.resolve();
      });
      return d.promise;
    };
    if (sfx[0]) c.sfx(sfx[0]);

    if (s.mode === 'melee') {
      if (s.windMs) {
        c.actor.play('cast');
        await new Promise<void>((r) => c.scene.time.delayedCall(k.slow(s.windMs!), r));
      }
      const t = c.targets[0];
      await c.lunge(t ? t.container.x : c.actor.container.x);
      for (const v of c.targets) play(pos(v));
      c.scene.time.delayedCall(k.slow(impactMs(s, fps)), () => k.shake(c.scene, SHAKE_MS, SHAKE_MAG));
      return land();
    }
    await c.windUp(s.hex ?? c.skill.fx ?? '#ffffff', 'cast');
    if (s.mode === 'bolt' || s.mode === 'ally') {
      for (const v of c.targets) play(pos(v));
      return land();
    }
    if (s.mode === 'self') {
      play(k.feet(c.actor));
      return land();
    }
    const cells = c.cells.length ? c.cells : c.targets.map((v) => k.feet(v));
    if (s.mode === 'center') {
      const m = c.centerPos ?? cells.reduce((a, p) => ({ x: a.x + p.x / cells.length, y: a.y + p.y / cells.length }), { x: 0, y: 0 });
      const mid = s.at === 'hit' ? { x: m.x, y: m.y - 40 } : m;
      play(mid);
      return land();
    }
    // cells: aşamalı skill'de aşama aşama (her aşama bir öncekinden ~180 ms sonra), değilse küçük rastgele gecikmeyle hepsi birden
    if (c.stages && c.stages.length > 1) {
      const STEP = 180;
      c.stages.forEach((st, i) => {
        for (const p of st.cells) play(p, i * STEP);
        c.scene.time.delayedCall(k.slow(i * STEP + impactMs(s, fps)), () => c.releaseStage(i));
      });
      return land();
    }
    cells.forEach((p, i) => play(p, i * 50));
    return land();
  };
}

/** skill id -> efekt (sheet dosyası olmayan skill burada yok: ödünç efektini oynar). */
export function mobVfxOf(skillId: string, hasSheet: (id: string) => boolean): V2Vfx | undefined {
  const s = MOB_VFX_SPECS[skillId];
  if (!s || !hasSheet(mobSheetId(s.mob, skillId))) return undefined;
  return (cache[skillId] ??= build(skillId, s));
}
const cache: Record<string, V2Vfx> = {};
