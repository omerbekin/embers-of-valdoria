#!/usr/bin/env node
/**
 * SEFER MOBU SANATI İÇE AKTARICI (Bölge I + II, ChatGPT 2026-10-16): skill/pasif ikon sayfaları ve 8 karelik VFX sheet'leri TEK komutla oyuna aktarır.
 * (Karakter çizimleri ayrı: `python tools/import-mobs.py --only <id>`.)
 *
 *   node tools/import-mob-art.mjs            hepsi (ikonlar + vfx)
 *   node tools/import-mob-art.mjs icons      yalnızca ikon sayfaları
 *   node tools/import-mob-art.mjs vfx        yalnızca vfx sheet'leri
 *   node tools/import-mob-art.mjs poses      yalnızca poz sayfaları
 *
 * İKONLAR: assets/source/mob-icons/<sayfa>.png (1254x1254, 2x2 ızgara, ince siyah boşluklu; sıra TL, TR, BL, BR). Siyah boşluklar ölçülüp
 *   kırpılır, hücre kare kesilir -> assets/mob-icons/<ad>.png (128) + assets/mob-icons/small/<ad>.png (64). <ad> = skill id ya da pasif id
 *   (oyun bu adla bulur: src/ui/mob-icons.ts > skillIconName / passiveIconName). Yeni sayfa = aşağıdaki ICON_SHEETS'e bir satır.
 * VFX: assets/source/mob-vfx/<mob>-<skill>.png (1536x1024, 4 sütun x 2 satır, hücre 384x512, gerçek saydam) -> assets/mob-vfx/<mob>/<skill>.png
 *   (1024x512, 4x2 kare x 256 px) + .json meta (assets/vfx/defender/*.json biçimi). 8 karenin ortak içerik kutusu 256'lık kareye oran korunarak
 *   sığdırılır: zemin efektleri ALTA oturur (pivot alt-orta), vuruşlar ORTALANIR (pivot orta). Kaynak klasördeki her <mob>-<skill>.png işlenir;
 *   eksik dosya atlanır (o skill yer tutucu efektini oynar). Zemine oturacak sheet'ler GROUND listesinde. Efektin oyunda nasıl oynayacağı
 *   src/game/mob-vfx.ts > MOB_VFX_SPECS (skill id başına bir satır).
 * POZLAR (elit/boss, isteğe bağlı): assets/source/mob-poses/<mob>.png (gerçek saydam, 4 sütun x 3 satır = 12 tam boy poz) ->
 *   assets/sprites/<mob>/poses.png (aynı ızgara; her kare figürün ayak noktasına (alt-orta) hizalı, piksel yoğunluğu idle.png'nin POSE_DENSITY katı:
 *   1. pozun boyu idle.png'deki figür boyunun o katı, alt boşluk idle.png'ninki). Hangi oyun anında hangi kare: data/mob-poses.json (önce
 *   `python tools/import-mobs.py --only <mob>` ile idle.png olmalı).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { blackToAlpha } from './black-to-alpha.mjs';

const ICON_SRC = 'assets/source/mob-icons';
const ICON_OUT = 'assets/mob-icons';
/** Mob ikonu olmayan sayfalarin cikti klasoru (durum ikonlari oyunda misc-icons/status adiyla bulunur). */
/** Zemini de saf siyah olan sayfalar: karanlik bant bulma hucre ile ayirgaci ayiramaz; sabit 2x2 izgara (kenar 12, ayirac 20 px). */
const FIXED_GRID_SHEETS = new Set(['status2-sheet', 'reaver_archer-sheet']);
const ICON_SHEET_OUT = { 'status2-sheet': 'assets/misc-icons/status' };
const VFX_SRC = 'assets/source/mob-vfx';
const VFX_OUT = 'assets/mob-vfx';
const POSE_SRC = 'assets/source/mob-poses';
const POSE_COLS = 4;
const POSE_ROWS = 3;
/** Poz sayfasının idle.png'ye göre piksel yoğunluğu (0,5 = yarı çözünürlük; telefonda doku belleği). Oyun data/mob-poses.json > density ile aynı. */
const POSE_DENSITY = 0.5;

/** Sayfa -> [TL, TR, BL, BR] adları (null = kullanılmayan hücre). */
const ICON_SHEETS = {
  // Harita 2 (2026-10-25): durum ikonlari (TR spellbound, BL saltbound secildi; TL/BR alternatif) -> assets/misc-icons/status; Reaver Archer Fire Volley (TR alternatif)
  'status2-sheet': [null, 'spellbound', 'saltbound', null],
  'reaver_archer-sheet': ['fire_volley', null, null, null],
  'stonebound_warden-sheet-simple': ['gatestone_slam', 'rockfall', 'stone_patience', null],
  'deep_runecaller-sheet': ['rune_spark', 'glyph_of_breaking', 'ward_etcher', null],
  'thane_of_the_deep-sheet': ['pick_of_the_deep', 'oath_of_stone', 'deep_hoard', null],
  'bandits-sheet': ['billhook', 'peat_smoke', 'cut_and_run', 'scatter_quarrels'],
  'ember_drowned-sheet': ['shovel_of_embers', 'kiln_smoke', 'last_ember', 'clutch'],
  'hexes-sheet': ['cauldron_splash', 'hags_mark', 'mire_bound', 'flicker'],
  'undead-sheet': ['dirge', 'call_the_buried', 'bone_ward', 'corpse_hunger'],
  'branns_order-sheet': ['penance_flail', 'sanctuary', 'martyrs_vow', 'rebuke'],
  'monk_priest-sheet': ['holy_ember', 'consecrate', 'censer_smoke', 'vessel_of_the_choir'],
  'high_priest_of_the_undying-sheet': ['bone_rite', 'requiem', 'unholy_benediction', null],
  // Bölge I (ChatGPT 2026-10-16); chief_extra'nın son üçü eski mob skill'leri (Road Thug, Ghoul/Drowned): ödünç sınıf ikonunun yerine
  'thieves-sheet': ['shiv', 'sand_in_the_eyes', 'head_start', 'grudge'],
  'beasts_poacher-sheet': ['bite', 'rend', 'pack_tactics', 'poachers_shot'],
  'poacher_seer-sheet': ['tainted_bait', 'ravens_peck', 'murder_of_crows', 'hide_in_the_brush'],
  'bandit_chief-sheet': ['chiefs_cleaver', 'toll_sweep', 'hold_the_tower', 'flock_shield'],
  'chief_extra-sheet': ['shares_of_the_dead', 'cudgel', 'hamstring', 'gnaw'],
  // Eski mob skill'leri (ChatGPT 2026-10-16): ödünç sınıf ikonunun yerine; old_d'nin son üçü yedek (kullanılmaz)
  'old_a-sheet': ['feast', 'drag_under', 'ember_toss', 'burn_the_ground'],
  'old_b-sheet': ['shield_bash', 'hold_the_line', 'shield_wall', 'crossbow_bolt'],
  'old_c-sheet': ['hex_bolt', 'bog_curse', 'lure_light', 'wisp_spark'],
  'old_d-sheet': ['marsh_glow', null, null, null],
  // Bölge III (mob-plan.md 10.6; sayfalar yarın ChatGPT'den: dosya yoksa atlanır)
  'morvane_army-sheet': ['halberd_chop', 'pike_thrust', 'close_ranks', 'wall_of_pikes'],
  'ash_hound-sheet': ['scorch_bite', 'run_down', 'blood_scent', 'searing_rebuke'],
  'region3_upgrades-sheet': ['hold_the_gate', 'burn_the_field', 'crown_of_ash', null],
  'drake_priest-sheet': ['drakefire', 'dragons_breath', 'kindle_the_faithful', 'molten_shed'],
  'lord_morvane-sheet': ['cinder_lash', 'ashfall', 'iron_decree', 'pyre_of_morvane'],
  // King's Bridge boss (Bridge Warden): 4 skill + (2. sayfa) fall_of_kings_bridge + 3 pasif
  'bridge_warden-sheet': ['anchor_smash', 'breaking_span', 'chain_hook', 'ash_brand'],
  'bridge_warden2-sheet': ['fall_of_kings_bridge', 'unyielding', 'anchored', 'ember_heart'],
  // Harita 2 (Drowned Reach) mob paketi: Corsair Cutlass/Slinger (boarding ortak), Salt Crab, Weir Eel, Siren
  'corsairs-sheet': ['cutlass', 'rake', 'boarding', 'sling_stone'],
  'corsairs_crab-sheet': ['pitch_pot', 'pincer', 'burrow', 'shell'],
  'weir_eel-sheet': ['eel_bite', 'lunge', 'slick', null],
  'siren-sheet': ['lament', 'chorus', 'lure', null],
  // Harita 2 paket 2 (2026-10-25): Drowned Knight, Brine Maiden, Reaver Archer + Reef Wrecker (cut_and_run zaten bandits-sheet'te)
  'drowned_knight-sheet': ['rusted_blade', 'shield_of_brine', 'deathless_tide', null],
  'brine_maiden-sheet': ['lament_of_salt', 'tidal_mend', 'salt_tears', null],
  'reaver_reef-sheet': ['pitch_arrow', 'hook', 'lantern_flash', 'undertow'],
};

/** Zemine oturan (alt hizalı) vfx sheet'leri: '<mob>-<skill>'. Geri kalanı ortalanır (vuruş/mermi). */
const GROUND = new Set([
  'bandit_crossbowman-scatter_quarrels',
  'censer_monk-consecrate',
  'charcoal_burner-kiln_smoke',
  'drowned-clutch',
  'grave_chanter-call_the_buried',
  'hedge_witch_morwen-cauldron_splash',
  'high_priest_of_the_undying-requiem',
  'high_priest_of_the_undying-unholy_benediction',
  'moor_raider-peat_smoke',
  'oathsworn_brother-penance_flail',
  'oathsworn_brother-sanctuary',
  'stonebound_warden-gatestone_slam',
  'stonebound_warden-rockfall',
  'thane_of_the_deep-oath_of_stone',
  // Bölge I
  'ravenwood_poacher-tainted_bait',
  'raven_seer-murder_of_crows',
  'bandit_chief-hold_the_tower',
  // Bölge I-II eski skill'ler (kendi sheet'leri, 2026-10-17)
  'fen_witchling-bog_curse',
  'will_o_wisp-marsh_glow',
  'ember_acolyte-burn_the_ground',
  'shieldwarden-hold_the_line',
  'drowned-drag_under',
  'thane_of_the_deep-shield_wall',
  // Bölge III (yarın)
  'sworn_guard-wall_of_pikes',
  'cinder_gatewarden-hold_the_gate',
  'ember_hierophant-burn_the_field',
  'drake_priest-drakefire',
  'drake_priest-dragons_breath',
  'drake_priest-kindle_the_faithful',
  'lord_morvane-ashfall',
  'lord_morvane-cinder_lash',
  'lord_morvane-iron_decree',
  'lord_morvane-pyre_of_morvane',
  // King's Bridge boss (Bridge Warden)
  'bridge_warden-breaking_span',
  'bridge_warden-fall_of_kings_bridge',
  // Harita 2 (Drowned Reach)
  'corsair_slinger-pitch_pot',
  'salt_crab-burrow',
  // Reaver Archer: Fire Volley (zemine sabit alev; kareler ayni taban cizgisine hizalandi)
  'reaver_archer-fire_volley',
  // Harita 2 paket 2: kalkan kubbesi ve iyilestirme dalgasi zeminden yukselir (kareler ayni taban cizgisine hizalandi)
  'drowned_knight-shield_of_brine',
  'brine_maiden-tidal_mend',
]);

/** Hücrenin tamamına yayılmış düşük alfalı sis taşıyan sheet'ler: bu eşiğin altındaki alfa silinir (yoksa içerik kutusu tüm hücre olur). */
const HAZE = { 'bandit_chief-chiefs_cleaver': 40 };
/** Üst satırın içeriği alt satır hücrelerine taşmış sheet'ler: alt satır hücrelerinin üstten bu kadar pikseli silinir. */
const ROW_SEAM = { 'bandit_chief-chiefs_cleaver': 80 };

/**
 * Komşu hücreden taşan kırıntılar (yalnızca CLEAN_EDGES): hücre kenarına (6 px) değen ve hücrenin opak alanının %8'inden küçük bağlı bileşenler (alfa > 8) silinir.
 * Yerinde değiştirir (RGBA tampon).
 */
function dropEdgeSlivers(data, W, H, CW, CH) {
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let f = 0; f < 8; f++) {
    const ox = (f % 4) * CW;
    const oy = Math.floor(f / 4) * CH;
    let total = 0;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (data[((oy + y) * W + ox + x) * 4 + 3] > 8) total++;
    for (let y = 0; y < CH; y++)
      for (let x = 0; x < CW; x++) {
        const i0 = (oy + y) * W + ox + x;
        if (seen[i0] || data[i0 * 4 + 3] <= 8) continue;
        const comp = [];
        let edge = false;
        seen[i0] = 1;
        stack.push(i0);
        while (stack.length) {
          const i = stack.pop();
          comp.push(i);
          const px = (i % W) - ox;
          const py = Math.floor(i / W) - oy;
          if (px < 6 || py < 6 || px >= CW - 6 || py >= CH - 6) edge = true;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue;
            const j = (oy + ny) * W + ox + nx;
            if (!seen[j] && data[j * 4 + 3] > 8) {
              seen[j] = 1;
              stack.push(j);
            }
          }
        }
        if (edge && comp.length < total * 0.08) for (const i of comp) data[i * 4 + 3] = 0;
      }
  }
}

/** Kırıntı temizliği uygulanan sheet'ler (Bölge I; Bölge II sheet'leri onaylı çerçeveleriyle aynen kalır). */
const CLEAN_EDGES = new Set([
  'cutpurse-shiv',
  'cutpurse-sand_in_the_eyes',
  'grey_wolf-bite',
  'grey_wolf-rend',
  'ravenwood_poacher-poachers_shot',
  'ravenwood_poacher-tainted_bait',
  'raven_seer-ravens_peck',
  'raven_seer-murder_of_crows',
  'bandit_chief-chiefs_cleaver',
  'bandit_chief-toll_sweep',
  'bandit_chief-hold_the_tower',
  // Harita 2 paket 2
  'reaver_archer-pitch_arrow',
  // Bölge III (yarın)
  'sworn_guard-wall_of_pikes',
  'cinder_gatewarden-hold_the_gate',
  'ember_hierophant-burn_the_field',
  'drake_priest-drakefire',
  'drake_priest-dragons_breath',
  'drake_priest-kindle_the_faithful',
  'lord_morvane-ashfall',
  'lord_morvane-cinder_lash',
  'lord_morvane-iron_decree',
  'lord_morvane-pyre_of_morvane',
  // King's Bridge boss (Bridge Warden)
  'bridge_warden-anchor_smash',
  'bridge_warden-breaking_span',
  'bridge_warden-chain_hook',
  'bridge_warden-ash_brand',
  'bridge_warden-fall_of_kings_bridge',
]);

const FRAME = 256;
const PAD = 6;
const FPS = 12;

// ------------------------------------------------------------------ ikonlar
/** Koyu (siyah boşluk) satır/sütun aralıkları: değer < 18 olan piksellerin oranı > 0,8. */
function darkRuns(fracs) {
  const runs = [];
  let s = -1;
  fracs.forEach((f, i) => {
    if (f > 0.8 && s < 0) s = i;
    if ((f <= 0.8 || i === fracs.length - 1) && s >= 0) {
      runs.push([s, f > 0.8 ? i : i - 1]);
      s = -1;
    }
  });
  return runs;
}

/** İki koyu bant arasındaki aydınlık aralıklar (hücreler); en uzun iki aralık. */
function spans(fracs) {
  const n = fracs.length;
  const runs = darkRuns(fracs);
  const bounds = [];
  let start = 0;
  for (const [a, b] of runs) {
    if (a > start) bounds.push([start, a - 1]);
    start = b + 1;
  }
  if (start < n) bounds.push([start, n - 1]);
  return bounds
    .sort((p, q) => q[1] - q[0] - (p[1] - p[0]))
    .slice(0, 2)
    .sort((p, q) => p[0] - q[0]);
}

/** İkon zemini anahtarı: kenar parlaklığının medyanına göre eşik (siyah zemin ~30, kahverengi düz zemin ~60; üst sınır 62: parlak kenarlı konular yenmesin). */
async function iconKeyOpts(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const v = [];
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) if (Math.min(x, y, w - 1 - x, w - 1 - y) < 4) v.push(Math.max(data[(y * w + x) * 3], data[(y * w + x) * 3 + 1], data[(y * w + x) * 3 + 2]));
  v.sort((a, b) => a - b);
  const bgMax = Math.max(30, Math.min(62, v[v.length >> 1] + 10));
  return { bgMax, noise: bgMax - 8, soft: bgMax + 30, depth: 6 };
}

async function importIcons() {
  mkdirSync(join(ICON_OUT, 'small'), { recursive: true });
  let n = 0;
  for (const [sheet, names] of Object.entries(ICON_SHEETS)) {
    const src = join(ICON_SRC, `${sheet}.png`);
    const outDir = ICON_SHEET_OUT[sheet] ?? ICON_OUT;
    mkdirSync(join(outDir, 'small'), { recursive: true });
    if (!existsSync(src)) {
      console.warn(`atlandı (yok): ${src}`);
      continue;
    }
    const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    const dark = (x, y) => {
      const i = (y * W + x) * 3;
      return Math.max(data[i], data[i + 1], data[i + 2]) < 18;
    };
    const colF = Array.from({ length: W }, (_, x) => {
      let d = 0;
      for (let y = 0; y < H; y += 2) d += dark(x, y) ? 1 : 0;
      return d / Math.ceil(H / 2);
    });
    const rowF = Array.from({ length: H }, (_, y) => {
      let d = 0;
      for (let x = 0; x < W; x += 2) d += dark(x, y) ? 1 : 0;
      return d / Math.ceil(W / 2);
    });
    const fixed = (n) => [[12, n / 2 - 10], [n / 2 + 10, n - 13]];
    const cols = FIXED_GRID_SHEETS.has(sheet) ? fixed(W) : spans(colF);
    const rows = FIXED_GRID_SHEETS.has(sheet) ? fixed(H) : spans(rowF);
    if (cols.length !== 2 || rows.length !== 2) throw new Error(`${sheet}: 2x2 ızgara bulunamadı`);
    for (let k = 0; k < 4; k++) {
      const name = names[k];
      if (!name) continue;
      const [x0, x1] = cols[k % 2];
      const [y0, y1] = rows[Math.floor(k / 2)];
      const inset = 3;
      const w = x1 - x0 + 1 - 2 * inset;
      const h = y1 - y0 + 1 - 2 * inset;
      const side = Math.min(w, h);
      const left = x0 + inset + Math.floor((w - side) / 2);
      const top = y0 + inset + Math.floor((h - side) / 2);
      const cell = sharp(src).removeAlpha().extract({ left, top, width: side, height: side });
      // siyah zemin/çerçeve -> saydam (kahraman ikonları gibi); kırpma yok, kare korunur
      const cellPng = await cell.png().toBuffer();
      const buf = await blackToAlpha(cellPng, { trim: false, ...(await iconKeyOpts(cellPng)) });
      await sharp(buf).resize(128, 128, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(join(outDir, `${name}.png`));
      await sharp(buf).resize(64, 64, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(join(outDir, 'small', `${name}.png`));
      n++;
      console.log(`${sheet} [${['TL', 'TR', 'BL', 'BR'][k]}] ${side}px -> ${outDir}/${name}.png`);
    }
  }
  console.log(`ikon: ${n}`);
}

// ------------------------------------------------------------------ vfx
async function importVfx() {
  if (!existsSync(VFX_SRC)) return;
  let n = 0;
  for (const file of readdirSync(VFX_SRC).filter((f) => f.endsWith('.png')).sort()) {
    const base = file.replace(/\.png$/, '');
    const dash = base.indexOf('-');
    if (dash < 0) {
      console.warn(`atlandı (ad <mob>-<skill> değil): ${file}`);
      continue;
    }
    const mob = base.slice(0, dash);
    const skill = base.slice(dash + 1);
    const src = join(VFX_SRC, file);
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    const CW = Math.floor(W / 4);
    const CH = Math.floor(H / 2);
    const haze = HAZE[base];
    if (haze) for (let i = 3; i < data.length; i += 4) if (data[i] < haze) data[i] = 0;
    const seam = ROW_SEAM[base];
    if (seam) for (let y = CH; y < CH + seam; y++) for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;
    if (CLEAN_EDGES.has(base)) dropEdgeSlivers(data, W, H, CW, CH);
    const raw = { raw: { width: W, height: H, channels: 4 } };
    // 8 karenin ortak içerik kutusu (hücre koordinatı)
    let bx0 = CW, by0 = CH, bx1 = -1, by1 = -1;
    for (let f = 0; f < 8; f++) {
      const ox = (f % 4) * CW;
      const oy = Math.floor(f / 4) * CH;
      for (let y = 0; y < CH; y++)
        for (let x = 0; x < CW; x++) {
          if (data[((oy + y) * W + ox + x) * 4 + 3] > 8) {
            if (x < bx0) bx0 = x;
            if (x > bx1) bx1 = x;
            if (y < by0) by0 = y;
            if (y > by1) by1 = y;
          }
        }
    }
    if (bx1 < 0) {
      console.warn(`atlandı (boş): ${file}`);
      continue;
    }
    const bw = bx1 - bx0 + 1;
    const bh = by1 - by0 + 1;
    const scale = Math.min(1, (FRAME - 2 * PAD) / bw, (FRAME - 2 * PAD) / bh);
    const tw = Math.max(1, Math.round(bw * scale));
    const th = Math.max(1, Math.round(bh * scale));
    const ground = GROUND.has(base);
    const left = Math.round((FRAME - tw) / 2);
    const top = ground ? FRAME - PAD - th : Math.round((FRAME - th) / 2);
    const comps = [];
    for (let f = 0; f < 8; f++) {
      const cell = await sharp(data, raw)
        .extract({ left: (f % 4) * CW + bx0, top: Math.floor(f / 4) * CH + by0, width: bw, height: bh })
        .resize(tw, th, { kernel: 'lanczos3' })
        .png()
        .toBuffer();
      comps.push({ input: cell, left: (f % 4) * FRAME + left, top: Math.floor(f / 4) * FRAME + top });
    }
    const outDir = join(VFX_OUT, mob);
    mkdirSync(outDir, { recursive: true });
    await sharp({ create: { width: FRAME * 4, height: FRAME * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(comps)
      .png({ compressionLevel: 9 })
      .toFile(join(outDir, `${skill}.png`));
    const meta = {
      slug: skill,
      title: `${mob} ${skill}`.replace(/_/g, ' '),
      frames: 8,
      fps: FPS,
      duration_ms: Math.round((8 * 1000) / FPS),
      frame_size: [FRAME, FRAME],
      sheet_size: [FRAME * 4, FRAME * 2],
      grid: [4, 2],
      order: 'row-major',
      padding_px: PAD,
      anchor: ground ? 'bottom' : 'center',
      pivot: [FRAME / 2, ground ? FRAME - PAD : FRAME / 2],
      content_px: [tw, th],
      source: `${VFX_SRC}/${file}`,
    };
    writeFileSync(join(outDir, `${skill}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    n++;
    console.log(`${file} -> ${outDir}/${skill}.png (${ground ? 'zemin' : 'orta'}, içerik ${tw}x${th})`);
  }
  console.log(`vfx: ${n}`);
}

// ------------------------------------------------------------------ pozlar
/** RGBA tampondaki alfa kutusu (eşik 8) ve alt yarının ağırlık merkezi x'i (gövde ekseni; uzanan kol/asa hizayı kaydırmasın). */
function alphaBox(data, W, x0, y0, w, h) {
  let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[((y0 + y) * W + x0 + x) * 4 + 3] > 8) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
  let sx = 0, n = 0;
  const mid = by0 + Math.floor((by1 - by0) / 2);
  for (let y = mid; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++)
      if (data[((y0 + y) * W + x0 + x) * 4 + 3] > 8) {
        sx += x;
        n++;
      }
  return { x0: bx0, y0: by0, x1: bx1, y1: by1, cx: n ? sx / n : (bx0 + bx1) / 2 };
}

/**
 * Figürleri ızgara çizgisini aşan poz sayfaları (Bandit Chief: ayak, balta, kafa komşu hücreye taşar): hücre dikdörtgeni yerine bağlı
 * bileşenler (alfa > 8, 8 komşu) ağırlık merkezinin düştüğü hücreye atanır. Diğer sayfalar düz ızgarayla kesilir (çıktıları aynen kalır).
 */
const POSE_SPLIT = new Set(['bandit_chief', 'deserter_captain', 'drake_priest', 'lord_morvane', 'bridge_warden', 'reaver_chief_hook', 'admiral_vane', 'weir_wyrm', 'drowned_champion', 'salt_bishop', 'siren_queen', 'corsair_captain_marrow', 'wrecker_captain', 'guild_enforcer_bastion', 'salt_hag_mother']);

/** Hücre başına tam boy RGBA katman: yalnızca o hücreye atanan bileşenlerin pikselleri. */
function cellLayers(data, W, H, cols, rows) {
  const CW = Math.floor(W / cols);
  const CH = Math.floor(H / rows);
  const seen = new Uint8Array(W * H);
  const layers = Array.from({ length: cols * rows }, () => Buffer.alloc(W * H * 4));
  const stack = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (seen[i0] || data[i0 * 4 + 3] <= 8) continue;
    const comp = [];
    let sx = 0, sy = 0;
    seen[i0] = 1;
    stack.push(i0);
    while (stack.length) {
      const i = stack.pop();
      comp.push(i);
      const x = i % W;
      const y = (i - x) / W;
      sx += x;
      sy += y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (!seen[j] && data[j * 4 + 3] > 8) {
            seen[j] = 1;
            stack.push(j);
          }
        }
    }
    const col = Math.min(cols - 1, Math.floor(sx / comp.length / CW));
    const row = Math.min(rows - 1, Math.floor(sy / comp.length / CH));
    const layer = layers[row * cols + col];
    for (const i of comp) data.copy(layer, i * 4, i * 4, i * 4 + 4);
  }
  return layers;
}

async function importPoses() {
  if (!existsSync(POSE_SRC)) return;
  for (const file of readdirSync(POSE_SRC).filter((f) => f.endsWith('.png')).sort()) {
    const mob = file.replace(/\.png$/, '');
    const idle = join('assets', 'sprites', mob, 'idle.png');
    if (!existsSync(idle)) {
      console.warn(`atlandı (önce idle.png: python tools/import-mobs.py --only ${mob}): ${file}`);
      continue;
    }
    const ref = await sharp(idle).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rb = alphaBox(ref.data, ref.info.width, 0, 0, ref.info.width, ref.info.height);
    const idleH = rb.y1 - rb.y0 + 1;
    const bottomPad = Math.round((ref.info.height - 1 - rb.y1) * POSE_DENSITY);
    const src = join(POSE_SRC, file);
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const CW = Math.floor(info.width / POSE_COLS);
    const CH = Math.floor(info.height / POSE_ROWS);
    const split = POSE_SPLIT.has(mob) ? cellLayers(data, info.width, info.height, POSE_COLS, POSE_ROWS) : null;
    const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
    // origin: kutu koordinatının kaynak sayfadaki başlangıcı (düz ızgarada hücre köşesi, bileşen katmanında 0)
    const origin = (i) => (split ? { x: 0, y: 0 } : { x: (i % POSE_COLS) * CW, y: Math.floor(i / POSE_COLS) * CH });
    const boxes = Array.from({ length: POSE_COLS * POSE_ROWS }, (_, i) =>
      split ? alphaBox(split[i], info.width, 0, 0, info.width, info.height) : alphaBox(data, info.width, (i % POSE_COLS) * CW, Math.floor(i / POSE_COLS) * CH, CW, CH),
    );
    const scale = (POSE_DENSITY * idleH) / (boxes[0].y1 - boxes[0].y0 + 1);
    // ortak kare: her poz gövde ekseninde ortalı, ayak altta
    let half = 0, height = 0;
    for (const b of boxes) {
      if (b.x1 < 0) continue;
      half = Math.max(half, (b.cx - b.x0 + 1) * scale, (b.x1 - b.cx + 1) * scale);
      height = Math.max(height, (b.y1 - b.y0 + 1) * scale);
    }
    const FW = Math.ceil(half * 2) + 4;
    const FH = Math.ceil(height) + bottomPad + 4;
    const comps = [];
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.x1 < 0) continue;
      const w = b.x1 - b.x0 + 1;
      const h = b.y1 - b.y0 + 1;
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));
      const o = origin(i);
      const input = await (split ? sharp(split[i], raw) : sharp(src).ensureAlpha())
        .extract({ left: o.x + b.x0, top: o.y + b.y0, width: w, height: h })
        .resize(tw, th, { kernel: 'lanczos3' })
        .png()
        .toBuffer();
      const left = (i % POSE_COLS) * FW + Math.round(FW / 2 - (b.cx - b.x0) * scale);
      const top = Math.floor(i / POSE_COLS) * FH + FH - bottomPad - th;
      comps.push({ input, left: Math.max((i % POSE_COLS) * FW, left), top });
    }
    const out = join('assets', 'sprites', mob, 'poses.png');
    await sharp({ create: { width: FW * POSE_COLS, height: FH * POSE_ROWS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(comps)
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`${file} -> ${out} (${POSE_COLS}x${POSE_ROWS} kare, ${FW}x${FH})`);
    promotePending(mob);
  }
}

/**
 * Önceden yazılmış poz kaydı (data/mob-poses.json > _pending.<mob>, Bölge III: Drake Priest, Lord Morvane): poz sayfası içe aktarılınca kayıt
 * üst düzeye taşınır (oyun _ ile başlayan anahtarları okumaz; dosyası olmayan kayıt testte kırmızı olurdu).
 */
function promotePending(mob) {
  const path = 'data/mob-poses.json';
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const rec = data._pending?.[mob];
  if (!rec || data[mob]) return;
  data[mob] = rec;
  delete data._pending[mob];
  if (Object.keys(data._pending).filter((k) => !k.startsWith('_')).length === 0) delete data._pending;
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`  poz kaydı _pending.${mob} -> ${mob} (data/mob-poses.json)`);
}

const what = process.argv[2] ?? 'all';
if (what === 'all' || what === 'icons') await importIcons();
if (what === 'all' || what === 'vfx') await importVfx();
if (what === 'all' || what === 'poses') await importPoses();

// Oyun bu PNG'lerin .webp kopyasını yükler: değişenlerin WebP'si hemen üretilir (tools/webp-assets.mjs, tests/webp-assets.test.ts)
await import('./webp-assets.mjs');
