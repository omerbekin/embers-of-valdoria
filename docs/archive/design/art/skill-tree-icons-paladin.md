# Skill ağacı ikonları: Paladin (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Paladin'e uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/paladin.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/paladin/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: parlak gümüş çelik ve altın, yumuşak ışınlı beyaz-altın kutsal ışık, sıcak krem kumaş, küçük altın haçlar. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

## 1. Envanter

| Tür | Adet | Düğümler |
|---|---|---|
| Notable (satır) | 12 | her satırda n0, ma, mb (4 satır) |
| Notable (ult kol sonu) | 4 | 4.u3, 4.r3, 4.d3, 4.l3 |
| Evolve | 4 | 0.v, 1.v, 2.v, 3.v |
| **Toplam** | **20 ikon** | |

## 2. Warrior turundan dersler (her prompta işlendi)

- Tek kalın konu, 48 px'te okunmalı; ince yatay nesne yok (ince kılıçlar başarısızdı). Ortak bloğa "chunky, 48 px" cümlesi eklendi.
- Her ikon satırın skill ikonundan VE satır arkadaşlarından açıkça farklı: nesne türü, siluet, yön değişir. Her satırın başlığında "kaçın" yazan motif (skill ikonunun kendi motifi) prompta "Do NOT draw ..." olarak eklendi.
- Büyük saf siyah alan yok (koyu #15100c arayüzde siyah kukuleta okunmadı); koyu konulara sıcak kenar ışığı.
- Evolve: biraz daha görkemli, ince altın kenar ışığı; skill ikonunun "daha çok ateşlisi" değil, başka bir konu.
- Class'ın kendi palet/malzeme ailesi korunur, yalnızca ortaçağ.

## 3. Ortak prompt bloğu

Her işin promptu = bu blok + ` Subject (<Ad>): <konu>` + ` Do NOT draw <satırın kaçın motifi> (that is the skill's own icon).` (+ evolve'da evolve cümlesi). Bölüm 6'daki JSON hazır birleşik haldedir.

```
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Divine Light (pasif) satırı · ref `divine.png` · kaçın: ışık huzmeli açık el / eldiven

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | No Rest for Evil | Yaralı müttefik yoksa Divine Light en zayıf düşmana %30 INT kutsal hasar vurur. | a silver-and-gold flanged mace with a small gold cross on its head, glowing white-gold. | `assets/tree-icons/paladin/0_n0.png` |
| 0.ma | Notable | Chain of Light | Divine Light'ın vuruşu öldürürse hemen bir daha vurur. | a short chain of thick glowing gold links. | `assets/tree-icons/paladin/0_ma.png` |
| 0.mb | Notable | Banner of Dawn | Divine Light'ın hedefi %50 altındaysa 1 tur Haste da alır. | a cream and gold banner with a rising sun emblem on a silver pole. | `assets/tree-icons/paladin/0_mb.png` |
| 0.v | Evolve | Crusader's Dawn | Divine Light evolve (Crusader's Dawn): en yaralı müttefiki iyileştirir ve en zayıf düşmana aynı miktar vurur; öldürme 5 MP iade. | a silver crusader great helm facing front with a gold cross on its visor, white-gold dawn light rising behind it. + evolve cümlesi | `assets/tree-icons/paladin/0_v.png` |

### Holy Strike satırı · ref `judgehammer.png` · kaçın: çekiç

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | First Smite | Savaştaki ilk Holy Strike kesin kritik. | a silver longsword pointing straight up, its blade glowing white-gold. | `assets/tree-icons/paladin/1_n0.png` |
| 1.ma | Notable | Hammer Rhythm | Üst üste 3. Holy Strike iki kez vurur. | a silver-and-gold war drum with a gold cross on its side and two drumsticks. | `assets/tree-icons/paladin/1_ma.png` |
| 1.mb | Notable | Hammerfall Quake | Holy Strike öldürürse şok o düşmanın sırasına %20 vurur. | a cracked marble floor slab with white-gold light bursting through the cracks. | `assets/tree-icons/paladin/1_mb.png` |
| 1.v | Evolve | Hammer of the Heavens | Holy Strike evolve (Hammer of the Heavens): ikinci çekiç en düşük canlı düşmana %30 iner. | a towering gold-edged cloud with a huge glowing white-gold hammer of pure light bursting down out of it. + evolve cümlesi | `assets/tree-icons/paladin/1_v.png` |

### Resurrection satırı · ref `ankh.png` · kaçın: kanatlı haç

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Soul Exchange | Resurrection MP yerine mevcut canının %25'iyle ödenebilir. | a silver heart-shaped reliquary locket glowing warm white-gold. | `assets/tree-icons/paladin/2_n0.png` |
| 2.ma | Notable | Risen in Glory | Diriltilen müttefik 2 tur Blessed, ilk skill'i +%15. | a gold laurel wreath crown. | `assets/tree-icons/paladin/2_ma.png` |
| 2.mb | Notable | Not Yet | Müttefik son turundan beri düştüyse Resurrection MP harcamaz. | a white dove flying to the right, carrying a gold olive branch. | `assets/tree-icons/paladin/2_mb.png` |
| 2.v | Evolve | Martyr Rising | Resurrection evolve (Martyr Rising): hazırken düşersen savaşta bir kez %40 canla kalkarsın. | a silver knight's sword standing in a cracked stone tomb lid, white-gold light rising from the crack. + evolve cümlesi | `assets/tree-icons/paladin/2_v.png` |

### Judgment satırı · ref `judgebeam.png` · kaçın: dikey ışık sütunu

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Sanctified Earth | Judgment'ın kutsal ateşi 2 yerine 3 tur sürer. | a stone slab carved with a gold cross, low white-gold flames on its surface. | `assets/tree-icons/paladin/3_n0.png` |
| 3.ma | Notable | Fire on Fire | Zaten yanan hücrelere Judgment ateşi iki kat sıcak yapar. | a silver brazier with tall white-gold holy flames. | `assets/tree-icons/paladin/3_ma.png` |
| 3.mb | Notable | Wildfire Verdict | Kutsal ateşte ölen düşmandan ateş en yakın düşmana 2 tur sıçrar. | a single white-gold flame leaping in an arc to the right like a jumping spark. | `assets/tree-icons/paladin/3_mb.png` |
| 3.v | Evolve | Day of Judgment | Judgment evolve (Day of Judgment): ateş bitince içinde kalan her düşmana %30 INT kutsal hasar patlar. | silver scales of justice with gold pans, white-gold holy fire erupting from both pans. + evolve cümlesi | `assets/tree-icons/paladin/3_v.png` |

### Radiance ult kol sonları (notable) · ref `radiance.png` · kaçın: güneş / yuvarlak ışık patlaması

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Wrath of Heaven | Radiance hasarı eksik can bonusu da alır: en yaralılara +%50'ye kadar. | a bold white-gold lightning bolt striking down diagonally to the left. | `assets/tree-icons/paladin/4_u3.png` |
| 4.r3 | Notable | Sunstrike | Radiance öldürürse bekleme süresi -2. | a large silver-and-gold church bell, swinging. | `assets/tree-icons/paladin/4_r3.png` |
| 4.d3 | Notable | Lance of Dawn | Odaklı ışın hedefin arkasındaki tüm şeridi %60 deler. | a silver jousting lance with gold bands pointing right, white-gold light streaming along it. | `assets/tree-icons/paladin/4_d3.png` |
| 4.l3 | Notable | Second Sunrise | Radiance %50 altındaki 3+ müttefiki iyileştirirse bu sefer bekleme süresi 4 yerine 2. | a proud golden rooster crowing, chest out. | `assets/tree-icons/paladin/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-paladin.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/paladin/`, oyun dosyası `assets/tree-icons/paladin/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (No Rest for Evil): a silver-and-gold flanged mace with a small gold cross on its head, glowing white-gold. Do NOT draw an open hand or gauntlet with a light beam (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/divine.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Chain of Light): a short chain of thick glowing gold links. Do NOT draw an open hand or gauntlet with a light beam (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/divine.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Banner of Dawn): a cream and gold banner with a rising sun emblem on a silver pole. Do NOT draw an open hand or gauntlet with a light beam (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/divine.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Crusader's Dawn): a silver crusader great helm facing front with a gold cross on its visor, white-gold dawn light rising behind it. Do NOT draw an open hand or gauntlet with a light beam (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/paladin/divine.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (First Smite): a silver longsword pointing straight up, its blade glowing white-gold. Do NOT draw a hammer (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/judgehammer.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hammer Rhythm): a silver-and-gold war drum with a gold cross on its side and two drumsticks. Do NOT draw a hammer (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/judgehammer.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hammerfall Quake): a cracked marble floor slab with white-gold light bursting through the cracks. Do NOT draw a hammer (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/judgehammer.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hammer of the Heavens): a towering gold-edged cloud with a huge glowing white-gold hammer of pure light bursting down out of it. Do NOT draw a hammer (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/paladin/judgehammer.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Soul Exchange): a silver heart-shaped reliquary locket glowing warm white-gold. Do NOT draw a winged cross (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/ankh.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Risen in Glory): a gold laurel wreath crown. Do NOT draw a winged cross (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/ankh.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Not Yet): a white dove flying to the right, carrying a gold olive branch. Do NOT draw a winged cross (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/ankh.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Martyr Rising): a silver knight's sword standing in a cracked stone tomb lid, white-gold light rising from the crack. Do NOT draw a winged cross (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/paladin/ankh.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sanctified Earth): a stone slab carved with a gold cross, low white-gold flames on its surface. Do NOT draw a vertical beam or pillar of light (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/judgebeam.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Fire on Fire): a silver brazier with tall white-gold holy flames. Do NOT draw a vertical beam or pillar of light (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/judgebeam.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Wildfire Verdict): a single white-gold flame leaping in an arc to the right like a jumping spark. Do NOT draw a vertical beam or pillar of light (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/judgebeam.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Day of Judgment): silver scales of justice with gold pans, white-gold holy fire erupting from both pans. Do NOT draw a vertical beam or pillar of light (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/paladin/judgebeam.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Wrath of Heaven): a bold white-gold lightning bolt striking down diagonally to the left. Do NOT draw a sun or round light burst (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/radiance.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sunstrike): a large silver-and-gold church bell, swinging. Do NOT draw a sun or round light burst (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/radiance.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Lance of Dawn): a silver jousting lance with gold bands pointing right, white-gold light streaming along it. Do NOT draw a sun or round light burst (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/radiance.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/paladin/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished silver steel and gold, white-gold holy light with soft rays, warm cream cloth, small golden crosses) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Second Sunrise): a proud golden rooster crowing, chest out. Do NOT draw a sun or round light burst (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/paladin/radiance.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
