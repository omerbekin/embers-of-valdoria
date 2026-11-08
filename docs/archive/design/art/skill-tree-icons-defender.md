# Skill ağacı ikonları: Defender (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Defender'a uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/defender.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/defender/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: parlak çelik plaka zırh, koyu kraliyet mavisi arma boyası, pirinç perçin, kahverengi toprak/taş tozu. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
- **Defender'a özel:** mevcut Defender skill ikonları (`*2.png`, `aura.png`) kare, arka planlı ve çerçeveli sahne. Ağaç ikonları diğer class'lar gibi SAYDAM olmalı; ortak bloğa "yalnızca boya stilini ve renkleri eşle, kare zemini/çerçeveyi alma" cümlesi eklendi. Ağaçta skill plakasının yanında farklı (zeminsiz) durur; Ömer zeminli isterse ayrı karar.

## 3. Ortak prompt bloğu

Her işin promptu = bu blok + ` Subject (<Ad>): <konu>` + ` Do NOT draw <satırın kaçın motifi> (that is the skill's own icon).` (+ evolve'da evolve cümlesi). Bölüm 6'daki JSON hazır birleşik haldedir.

```
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Bulwark Aura (pasif) satırı · ref `aura.png` · kaçın: kule armalı kalkan / ayakta şövalyeler

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Shield Brothers | Savaş başında Bulwark Aura içindeki müttefikler maks canının %5'i kalkan alır. | two steel gauntlets clasping each other in a firm forearm grip, a soft pale-blue shield glow around the clasp. | `assets/tree-icons/defender/0_n0.png` |
| 0.ma | Notable | Unyielding | Rooted Stance doluyken Move'a kadar Stun ve çekilmeye bağışıksın. | a heavy iron anchor sunk upright, a royal blue rope wrapped around its shank. | `assets/tree-icons/defender/0_ma.png` |
| 0.mb | Notable | Living Rampart | Aura içindeki müttefik %30 altına düşünce 1 tur Fortified (savaşta müttefik başına bir kez). | a short stone castle rampart wall section with crenellations, a small royal blue pennant on top. | `assets/tree-icons/defender/0_mb.png` |
| 0.v | Evolve | Fortress Aura | Bulwark Aura evolve: her turunun başında sana zırh bonusu kadar kalkan da verir. | a chunky stone castle keep with a royal blue roof and pennant, a soft pale-blue protective glow hugging its walls. + evolve cümlesi | `assets/tree-icons/defender/0_v.png` |

### Tremor Slam satırı · ref `tremor2.png` · kaçın: yere basan zırhlı bacak / çizme

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Rolling Quake | Tremor Slam arkadaki sıraya da %25 vurur (Slow'suz). | a heavy flanged steel mace slamming down, two rolling waves of brown earth rippling away to the right. | `assets/tree-icons/defender/1_n0.png` |
| 1.ma | Notable | Third Quake | Her 3. Tremor Slam ilk vurduğu düşmanı 1 tur Stun eder. | three stacked flat stone slabs, the top one cracked through, a few small yellow-white stun stars. | `assets/tree-icons/defender/1_ma.png` |
| 1.mb | Notable | Sinking Earth | Sarsılan zemindeki düşmanlar tur başında %15 STR hasar alır. | a jagged chunk of brown earth and stone sinking into a dark crack, a little dust rising. | `assets/tree-icons/defender/1_mb.png` |
| 1.v | Evolve | Earthsplitter | Tremor Slam evolve (Earthsplitter): artı şeklinde, tüm sıra + sütun, 3 tur Slow. | a huge two-handed steel war maul with brass bands smashing down, a cross-shaped crack of glowing amber earth splitting beneath it. + evolve cümlesi | `assets/tree-icons/defender/1_v.png` |

### Taunt satırı · ref `taunt2.png` · kaçın: şövalye / sancak / bağıran miğfer / ses dalgası

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Cover Them | Bir müttefik %30 altına düşünce Taunt bekleme süresi sıfırlanır. | a brass war horn with a royal blue cord and tassel, lying on its side pointing right. | `assets/tree-icons/defender/2_n0.png` |
| 2.ma | Notable | Weathered the Storm | Taunt kırılmadan biterse 1 tur Fortified. | a battered wide-brimmed steel kettle helm, rain streaks running off its brim. | `assets/tree-icons/defender/2_ma.png` |
| 2.mb | Notable | Refused to Fall | Taunt kırılınca bekleme süresi -1 ve zırhının %5'i kadar kalkan. | a cracked steel heater shield still standing upright on its point, a pale-blue shimmer sealing the crack. | `assets/tree-icons/defender/2_mb.png` |
| 2.v | Evolve | Bastion Cry | Taunt evolve (Bastion Cry): sürdükçe Fortified da olursun (alınan hasar -%50). | a huge royal blue steel pavise (tall rectangular siege shield) planted in the ground with a brass boss, braced by a wooden prop. + evolve cümlesi | `assets/tree-icons/defender/2_v.png` |

### Close Ranks satırı · ref `closeranks2.png` · kaçın: kalkan sırası / kalkan duvarı

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Second Chain | Close Ranks kendi sıradaki müttefikleri de korur. | a heavy iron chain of two big interlocked links, a royal blue cloth tied to it, a soft pale-blue glow. | `assets/tree-icons/defender/3_n0.png` |
| 3.ma | Notable | Final Shield | Korunan müttefik ölecekken öldürücü darbeyi tamamen sen alırsın. | a steel breastplate over a royal blue tabard, a broken arrow shaft stuck in its center, the plate unbroken. | `assets/tree-icons/defender/3_ma.png` |
| 3.mb | Notable | Steady Them | Close Ranks korunan müttefiklerden Stun ve Slow'u temizler. | a steel gauntlet gripping an upright wooden spear shaft planted in the ground, a few fading stun stars breaking apart. | `assets/tree-icons/defender/3_mb.png` |
| 3.v | Evolve | Phalanx | Close Ranks evolve (Phalanx): korunanlara gelen hasar sen dahil hepsine eşit bölünür. | a dense bristle of four steel-tipped long spears angled forward to the right, small royal blue pennants on them. + evolve cümlesi | `assets/tree-icons/defender/3_v.png` |

### Fist Crush ult kol sonları (notable) · ref `fistcrush2.png` · kaçın: yumruk / eldiven

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Settle the Score | Fist Crush bu savaşta seni en çok yaralayana iki kez vurur. | a steel war pick swung down, two yellow-white impact flashes at its point. | `assets/tree-icons/defender/4_u3.png` |
| 4.r3 | Notable | Iron Meteor | Fist Crush zırh ölçeği %15'e çıkar ama 2 düşmana vurur. | a huge glowing hot iron ball falling diagonally down-left, trailing orange sparks. | `assets/tree-icons/defender/4_r3.png` |
| 4.d3 | Notable | Breaker of Walls | Fist Crush senden zırhlı düşmanda tüm zırhı yok sayar. | a crumbling stone wall section with a large breach blown through it, a few stones falling. | `assets/tree-icons/defender/4_d3.png` |
| 4.l3 | Notable | Forge Again | Fist Crush öldürürse bekleme süresi sıfırlanır. | a blacksmith's anvil with a glowing orange-hot forging hammer resting on it. | `assets/tree-icons/defender/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-defender.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/defender/`, oyun dosyası `assets/tree-icons/defender/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Shield Brothers): two steel gauntlets clasping each other in a firm forearm grip, a soft pale-blue shield glow around the clasp. Do NOT draw tower shields with a tower emblem, or standing knights (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/aura.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Unyielding): a heavy iron anchor sunk upright, a royal blue rope wrapped around its shank. Do NOT draw tower shields with a tower emblem, or standing knights (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/aura.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Living Rampart): a short stone castle rampart wall section with crenellations, a small royal blue pennant on top. Do NOT draw tower shields with a tower emblem, or standing knights (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/aura.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Fortress Aura): a chunky stone castle keep with a royal blue roof and pennant, a soft pale-blue protective glow hugging its walls. Do NOT draw tower shields with a tower emblem, or standing knights (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/defender/aura.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Rolling Quake): a heavy flanged steel mace slamming down, two rolling waves of brown earth rippling away to the right. Do NOT draw an armored leg or boot stomping the ground (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/tremor2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Third Quake): three stacked flat stone slabs, the top one cracked through, a few small yellow-white stun stars. Do NOT draw an armored leg or boot stomping the ground (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/tremor2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sinking Earth): a jagged chunk of brown earth and stone sinking into a dark crack, a little dust rising. Do NOT draw an armored leg or boot stomping the ground (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/tremor2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Earthsplitter): a huge two-handed steel war maul with brass bands smashing down, a cross-shaped crack of glowing amber earth splitting beneath it. Do NOT draw an armored leg or boot stomping the ground (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/defender/tremor2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Cover Them): a brass war horn with a royal blue cord and tassel, lying on its side pointing right. Do NOT draw a knight, a banner, a shouting helm or sound waves (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/taunt2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Weathered the Storm): a battered wide-brimmed steel kettle helm, rain streaks running off its brim. Do NOT draw a knight, a banner, a shouting helm or sound waves (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/taunt2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Refused to Fall): a cracked steel heater shield still standing upright on its point, a pale-blue shimmer sealing the crack. Do NOT draw a knight, a banner, a shouting helm or sound waves (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/taunt2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Bastion Cry): a huge royal blue steel pavise (tall rectangular siege shield) planted in the ground with a brass boss, braced by a wooden prop. Do NOT draw a knight, a banner, a shouting helm or sound waves (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/defender/taunt2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Second Chain): a heavy iron chain of two big interlocked links, a royal blue cloth tied to it, a soft pale-blue glow. Do NOT draw a row or wall of shields (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/closeranks2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Final Shield): a steel breastplate over a royal blue tabard, a broken arrow shaft stuck in its center, the plate unbroken. Do NOT draw a row or wall of shields (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/closeranks2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Steady Them): a steel gauntlet gripping an upright wooden spear shaft planted in the ground, a few fading stun stars breaking apart. Do NOT draw a row or wall of shields (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/closeranks2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Phalanx): a dense bristle of four steel-tipped long spears angled forward to the right, small royal blue pennants on them. Do NOT draw a row or wall of shields (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/defender/closeranks2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Settle the Score): a steel war pick swung down, two yellow-white impact flashes at its point. Do NOT draw a fist or gauntlet (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/fistcrush2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Iron Meteor): a huge glowing hot iron ball falling diagonally down-left, trailing orange sparks. Do NOT draw a fist or gauntlet (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/fistcrush2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Breaker of Walls): a crumbling stone wall section with a large breach blown through it, a few stones falling. Do NOT draw a fist or gauntlet (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/fistcrush2.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/defender/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel plate armor, deep royal blue heraldic paint, brass rivets, brown earth and stone dust) but do NOT copy its subject. The reference is a square framed scene: match only its painting style and colors, NOT its square background or frame. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Forge Again): a blacksmith's anvil with a glowing orange-hot forging hammer resting on it. Do NOT draw a fist or gauntlet (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/defender/fistcrush2.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
