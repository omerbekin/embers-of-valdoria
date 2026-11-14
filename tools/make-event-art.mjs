/**
 * Olay resimlerini keser (Ömer 2026-11-14: kart şeridi dikdörtgen, resim de geniş olmalı).
 * Kaynak assets/source/events/wide1..8.png: 1024x1536, alt alta dört geniş panel (~2.7:1), aralarında ince siyah boşluk.
 * Boşluklar otomatik bulunur; her panel -> assets/campaign/events/<olay>.webp (768 px geniş, saydamlık yok).
 * Tekrar çalıştırılabilir: `node tools/make-event-art.mjs`. Olay kartı sahnesi bunları gösterir (src/ui/node-card-events.ts).
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'assets/source/events';
const OUT = 'assets/campaign/events';
const W = 768;
// wideN -> panel sırası (yukarıdan aşağı)
const SHEETS = {
  1: ['witchs_hut', 'shepherds_fold', 'dr_quest_roost', 'dr_quest_table'],
  2: ['dr_quest_debt', 'dr_quest_registry', 'dr_wayshrine', 'dr_floodplain_farms'],
  3: ['dr_stilt_hamlet', 'dr_smugglers_reeds', 'dr_fishmarket', 'dr_guild_hall'],
  4: ['dr_ferry_office', 'dr_lantern_rock', 'dr_widows_watch', 'dr_saltspray_shrine'],
  5: ['dr_monks_isle', 'dr_sunken_stair', 'dr_flooded_library', 'dr_two_crowns'],
  6: ['dr_vesper', 'hc_shrine_of_the_hearth', 'hc_clan_steading', 'hc_white_dark'],
  7: ['hc_morvanes_bivouac', 'hc_stone_gate', 'hc_hall_of_oaths', 'hc_lantern_gallery'],
  8: ['hc_broken_lift', 'hc_sermon_hall', 'hc_crown_gallery', 'hc_mend_or_quench'],
};

/** Koyu satır kümelerini bulup aradaki panelleri döndürür: [{top, height}] */
function panels(data, w, h) {
  const dark = [];
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x += 4) s += data[y * w + x];
    dark.push(s / (w / 4) < 14);
  }
  const out = [];
  let y = 0;
  while (y < h) {
    while (y < h && dark[y]) y++;
    const top = y;
    while (y < h && !dark[y]) y++;
    if (y - top > h / 10) out.push({ top, height: y - top });
  }
  // ChatGPT bazen iki panelin arasına siyah çizgi koymuyor: boyu ortancanın ~2 katı olan paneli eşit böl
  const med = [...out].sort((a, b) => a.height - b.height)[Math.floor(out.length / 2)].height;
  return out.flatMap((p) => {
    const k = Math.round(p.height / med);
    if (k < 2) return [p];
    const hh = Math.floor(p.height / k);
    return Array.from({ length: k }, (_, i) => ({ top: p.top + i * hh, height: hh }));
  });
}

mkdirSync(OUT, { recursive: true });
for (const [n, ids] of Object.entries(SHEETS)) {
  const file = `${SRC}/wide${n}.png`;
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const ps = panels(data, info.width, info.height);
  if (ps.length !== ids.length) throw new Error(`${file}: ${ps.length} panel bulundu, ${ids.length} bekleniyordu`);
  for (let i = 0; i < ids.length; i++) {
    // kenardaki 2 px'lik geçişi at
    const p = ps[i];
    await sharp(file).extract({ left: 2, top: p.top + 2, width: info.width - 4, height: p.height - 4 }).resize({ width: W }).webp({ quality: 84 }).toFile(`${OUT}/${ids[i]}.webp`);
  }
}
console.log('events done');
