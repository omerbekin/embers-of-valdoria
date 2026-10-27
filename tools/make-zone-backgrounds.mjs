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
// Yeniden üretmek için: node tools/make-zone-backgrounds.mjs
import { statSync } from 'node:fs';
import sharp from 'sharp';

const SRC_DIR = 'assets/source/backgrounds-v3';
const OUT_DIR = 'assets/backgrounds';
const SRC_H = 1024;
const NEAR_LOSSLESS = 60; // 100 = kayıpsız; 60 gözle ayırt edilmez, dosya ~%35 küçük

/** Kaynakta (1024 yükseklik) ölçülen zemin çizgisi: çit / mezar taşı / kaya / korkuluk / sütun kaidesi dibi, yürünebilir zeminin başladığı y (v3, 2026-10-13). */
const FLOOR_SRC_Y = {
  'ember-road': 610,
  'border-road': 600,
  'windy-moor': 605,
  'iron-pass': 620,
  'misty-marsh': 640,
  'grave-field': 600,
  'pilgrim-road': 610,
  'ashen-plain': 620,
  'thornwood-hollow': 600,
  'kings-bridge': 625, // köprü korkuluğunun dibi (birimler güvertede, korkuluğun önünde)
  'castle-hall': 615, // sütun kaidelerinin dibi (birimler kaidelerin önünde)
  // Quick Battle / multiplayer arenaları (v3): çit direklerinin dibi / taş duvar basamağının dibi (ortada)
  'proving-grounds-sunny-afternoon': 540,
  'proving-grounds-sunset': 540,
  'proving-grounds-rain': 540,
  'duelling-ring-moon': 562,
  'duelling-ring-snow': 562,
  'duelling-ring-storm': 562,
  // Harita 2 (The Drowned Reach) bölge arka planları: kaynak assets/source/backgrounds-drowned (2026-10-27, Ömer onayı bekliyor); zemin = kıyı / korkuluk / basamak dibi
  'river-gorge': 595,
  'saltmarsh': 585,
  'saltmere-docks': 605, // rıhtım duvarının dibi
  'wreck-cliffs': 595,
  'siren-rocks': 610,
  'storm-deck': 625, // güverte korkuluğunun dibi
  'sunken-court': 600, // taht basamaklarının dibi
};
const DROWNED = new Set(['river-gorge', 'saltmarsh', 'saltmere-docks', 'wreck-cliffs', 'siren-rocks', 'storm-deck', 'sunken-court']);

const floors = {};
for (const [id, fy] of Object.entries(FLOOR_SRC_Y)) {
  const out = `${OUT_DIR}/${id}.webp`;
  const src = sharp(`${DROWNED.has(id) ? 'assets/source/backgrounds-drowned' : SRC_DIR}/${id}.png`);
  const m = await src.metadata();
  if (m.height !== SRC_H) throw new Error(`${id}: kaynak yüksekliği ${m.height} (beklenen ${SRC_H}); FLOOR_SRC_Y yeniden ölçülmeli`);
  await src.webp({ nearLossless: true, quality: NEAR_LOSSLESS, effort: 6 }).toFile(out);
  floors[id] = Math.round((fy / SRC_H) * 1000) / 1000;
  console.log(`${out} ${m.width}x${m.height} floor=${floors[id]} ${Math.round(statSync(out).size / 1024)} KB`);
}
console.log(JSON.stringify(floors));
