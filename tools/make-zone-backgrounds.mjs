// Sefer bölge savaş arka planları + kings-bridge + castle-hall: assets/source/backgrounds-v3/<id>.png (1536x1024) -> assets/backgrounds/<id>.webp.
// 2026-10-13 (Ömer onayı, v3 yeniden çizim): kaynak backgrounds-v3; *-rejected* dosyalar kullanılmaz.
// 2026-10-13: Quick Battle (proving-grounds-*) ve multiplayer (duelling-ring-*) arenaları da v3; bölgeler gibi zemin hedefe oturur
// (birimler çite / duvara yakın), alt kenar biraz kırpılır.
// 2026-10-12 (Ömer, v2 yeniden çizim): ÖN KIRPMA YOK, büyütme yok. Eskiden 2000x729 şeride kırpılıp lanczos ile büyütülüyordu
// (görselin ~%45'i gidiyor, oyun yanlardan bir daha kırpıp büyütünce kaba/pikselli görünüyordu). Artık asıl boyut korunur; savaş
// görseli görünür sahneye "cover" ile tek seferde ölçekler ve ölçülen zemin çizgisini arka sıranın ayağının üstüne oturtur
// (src/game/battle-background.ts > backgroundPlacement). Kodlama near-lossless webp: blok / renk kanalı (4:2:0) izi yok
// (Ömer eski q82 sıkıştırma izlerini beğenmedi).
// Zemin kesirleri (kaynakta ölçülen y / 1024) data/battle-layout.json > backgrounds.floor'a yazılır (çıktıda listelenir).
//
// Yeniden üretmek için: node tools/make-zone-backgrounds.mjs   (yalnız belirli kimlikler: node tools/make-zone-backgrounds.mjs castle-morvane)
import { existsSync, statSync } from 'node:fs';
import sharp from 'sharp';

const SRC_DIR = 'assets/source/backgrounds-v3';
const OUT_DIR = 'assets/backgrounds';
const SRC_H = 1024;
const NEAR_LOSSLESS = 60; // 100 = kayıpsız; 60 gözle ayırt edilmez, dosya ~%35 küçük

/** Kaynakta (1024 yükseklik) ölçülen zemin çizgisi: çit / mezar taşı / kaya / korkuluk / sütun kaidesi dibi, yürünebilir zeminin başladığı y (v3, 2026-10-13). */
const FLOOR_SRC_Y = {
  'ember-road': 612,
  'border-road': 603,
  'windy-moor': 608,
  'iron-pass': 622,
  'misty-marsh': 650,
  'grave-field': 600,
  'pilgrim-road': 610,
  'ashen-plain': 620,
  'thornwood-hollow': 600,
  'kings-bridge': 642, // köprü korkuluğunun dibi (birimler güvertede, korkuluğun önünde)
  'castle-hall': 634, // sütun kaidelerinin dibi (birimler kaidelerin önünde)
  'castle-morvane': 650, // r41 (2026-11-21): taht basamaklarının dibi, kaynak 0,635 (ChatGPT temiz pixel art)
  'pirate-cove': 610, // r41 (2026-11-21): iskele kenarı tahtası, kaynak 0,58
  'dwarf-mine': 600, // r41: taş kaide sırasının üst çizgisi, kaynak 0,57
  'sea-cave': 628, // r41: kaya ve su kenarı, kaynak 0,61
  'wreckers-hall': 614, // r41: salon kenar basamağı, kaynak 0,60
  'ice-cave': 635, // r41: buz zemin kenarı, kaynak 0,62
  'deserters-camp': 625, // r41 (2026-11-22): kamp tarasi kenarindaki kar ve kaya dizisinin dibi
  'flooded-crypt': 625, // r41: korkuluk dibi, kaynak 0,61
  // Quick Battle / multiplayer arenaları (v3): çit direklerinin dibi / taş duvar basamağının dibi (ortada)
  'proving-grounds-sunny-afternoon': 540,
  'proving-grounds-sunset': 540,
  'proving-grounds-rain': 540,
  'duelling-ring-moon': 562,
  'duelling-ring-snow': 562,
  'duelling-ring-storm': 562,
  // Harita 2 (The Drowned Reach) bölge arka planları: kaynak assets/source/backgrounds-drowned (2026-10-27, Ömer onayı bekliyor); zemin = kıyı / korkuluk / basamak dibi
  'river-gorge': 595,
  'saltmarsh': 604, // 2026-10-27 yeniden çizim (temiz pixel art): çamur düzlüğünün başladığı çizgi
  'saltmere-docks': 610, // rıhtım kenar taşının dibi (yeniden çizim)
  'saltmere-pit': 560, // Fighting Pit: halka duvarının dibi (2026-11-07, Ömer onayı bekliyor)
  'wreck-cliffs': 572, // kıyı çizgisi (yeniden çizim)
  'siren-rocks': 603, // deniz kenarı (yeniden çizim)
  'storm-deck': 625, // güverte korkuluğunun dibi
  'sunken-court': 605, // taht basamaklarının dibi
  // Harita 3 (The Hollow Crown) bölge arka planları: kaynak assets/source/backgrounds-hollow (2026-10-29, ChatGPT temiz pixel art); zemin = çit / kerb / korkuluk dibi (ölçülen kenar)
  snowline: 583, // çit dibi
  glacier: 588, // buz kenarı
  kharduin: 582, // korkuluk dibi
  'deep-halls': 585, // göl kenarı kerb dibi
  warrens: 603, // lav kenarı kaya dudağı
  'forge-heart': 628, // erimiş kanal kerb dibi
};
const HOLLOW = new Set(['snowline', 'glacier', 'kharduin', 'deep-halls', 'warrens', 'forge-heart']);
const DROWNED = new Set(['river-gorge', 'saltmarsh', 'saltmere-docks', 'saltmere-pit', 'wreck-cliffs', 'siren-rocks', 'storm-deck', 'sunken-court']);

const ONLY = process.argv.slice(2);
const floors = {};
for (const [id, fy] of Object.entries(FLOOR_SRC_Y)) {
  if (ONLY.length && !ONLY.includes(id)) continue;
  const out = `${OUT_DIR}/${id}.webp`;
  // r41 (2026-11-22): 18 yeniden cizim + deserters-camp backgrounds-v3'e tasindi; v3'te dosya varsa o kullanilir, yoksa eski bolge klasoru
  const v3 = `${SRC_DIR}/${id}.png`;
  const src = sharp(existsSync(v3) ? v3 : `${DROWNED.has(id) ? 'assets/source/backgrounds-drowned' : HOLLOW.has(id) ? 'assets/source/backgrounds-hollow' : SRC_DIR}/${id}.png`);
  const m = await src.metadata();
  if (m.height !== SRC_H) throw new Error(`${id}: kaynak yüksekliği ${m.height} (beklenen ${SRC_H}); FLOOR_SRC_Y yeniden ölçülmeli`);
  await src.webp({ nearLossless: true, quality: NEAR_LOSSLESS, effort: 6 }).toFile(out);
  floors[id] = Math.round((fy / SRC_H) * 1000) / 1000;
  console.log(`${out} ${m.width}x${m.height} floor=${floors[id]} ${Math.round(statSync(out).size / 1024)} KB`);
}
console.log(JSON.stringify(floors));
