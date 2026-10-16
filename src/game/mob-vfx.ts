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
};

type Pt = { x: number; y: number };

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
    const fps = vfxSheetFile(id)?.meta.fps ?? 12;
    const sfx = c.skill.sfx ?? [];
    const pos = (v: CombatantView): Pt => (s.at === 'hit' ? k.spot(v) : k.feet(v));
    const play = (p: Pt, delay = 0): void => {
      k.sheet(c.scene, id, p.x, p.y, { size: s.size, flipX: flip, depth: k.DEPTH + 20, delay, ...(s.squashY ? { squashY: s.squashY } : {}) });
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
