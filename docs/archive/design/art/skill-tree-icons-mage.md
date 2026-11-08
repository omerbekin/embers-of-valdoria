# Skill ağacı ikonları: Mage (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Mage'e uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/mage.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/mage/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: canlı turuncu-kırmızı ateş, buz mavisi kristal, koyu safir arcane ışık, altın süs, eskimiş deri. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Spell Echo (pasif) satırı · ref `echo.png` · kaçın: kitap

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Overload | Spell Echo sonrası yeniden attığın büyü kesin kritik. | a wooden wizard staff head topped with a sapphire crystal, crackling with blue lightning. | `assets/tree-icons/mage/0_n0.png` |
| 0.ma | Notable | Endless Refrain | Echo sonrası atılan büyünün Spell Echo şansı iki katı. | a small gold lyre with glowing sapphire-blue strings. | `assets/tree-icons/mage/0_ma.png` |
| 0.mb | Notable | Time Fold | Spell Echo tetiklenince yeniden atış yarım tur sürer. | a brass hourglass bent in the middle like folded metal, glowing blue arcane sand inside. | `assets/tree-icons/mage/0_mb.png` |
| 0.v | Evolve | Arcane Overload | Spell Echo evolve (Arcane Overload): echo tüm bekleme sürelerini sıfırlar, yeniden atış +%15. | a tall pointed deep-blue wizard hat with gold stars, blue arcane lightning crackling above its tip. + evolve cümlesi | `assets/tree-icons/mage/0_v.png` |

### Fire Bolt satırı · ref `fireball.png` · kaçın: ateş topu / kuyruklu yıldız

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Weak Spot | Fire Bolt kritikleri büyü zırhının %20'sini yok sayar. | a steel breastplate with one red-hot glowing melted spot, a little smoke. | `assets/tree-icons/mage/1_n0.png` |
| 1.ma | Notable | Hot Streak | Kritik Fire Bolt sıradaki Fire Bolt'u kesin kritik yapar. | a burning wooden torch held upright, a tall orange flame. | `assets/tree-icons/mage/1_ma.png` |
| 1.mb | Notable | Rolling Doom | Fire Bolt öldürürse en düşük canlı düşmana bedava tekrar atılır, her öldürmede sürer. | an iron-banded wooden barrel on fire, rolling to the right. | `assets/tree-icons/mage/1_mb.png` |
| 1.v | Evolve | Sunfire | Fire Bolt evolve (Sunfire): +%30 hasar; kritik Sunfire tam hasarı yandakilere sıçratır. | a fiery orange salamander with glowing ember skin, coiled ready to strike. + evolve cümlesi | `assets/tree-icons/mage/1_v.png` |

### Blizzard satırı · ref `blizzard.png` · kaçın: buz girdabı / sarmal

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Hard Frost | Blizzard alanının ön sırasındakileri her zaman 1 tur Slow eder. | a large jagged ice crystal spike growing straight up from a frozen patch of ground. | `assets/tree-icons/mage/2_n0.png` |
| 2.ma | Notable | Winter's Grip | Bir düşman Stun'luyken Blizzard bekleme süresi 2 yerine 1. | a steel gauntlet frozen solid in thick ice, clenched in a grip. | `assets/tree-icons/mage/2_ma.png` |
| 2.mb | Notable | Lost in the Snow | Blizzard'ın Blind ettiği düşman ıskalayınca 1 tur Stun. | a steel helm half-buried in a snowdrift, a few small yellow-white stun stars. | `assets/tree-icons/mage/2_mb.png` |
| 2.v | Evolve | Eternal Winter | Blizzard evolve (Eternal Winter): fırtına 2 tur kalır, orada tur başlatan her düşmanı Slow eder. | a pine tree heavy with snow and icicles, a pale-blue frost glow. + evolve cümlesi | `assets/tree-icons/mage/2_v.png` |

### Mana Barrier satırı · ref `manabarrier.png` · kaçın: küre / top / yuvarlak kabarcık

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Ice Mirror | Mana Barrier'ın emdiği ilk vuruş saldıranı 2 tur Slow eder. | a polished silver hand mirror with its glass frosted over by ice crystals. | `assets/tree-icons/mage/3_n0.png` |
| 3.ma | Notable | Frozen Rebuke | Slow'lu düşman Mana Barrier'a vurursa 1 tur Stun (bariyer başına bir kez). | a cluster of three sharp ice shards bursting outward to the left. | `assets/tree-icons/mage/3_ma.png` |
| 3.mb | Notable | Twin Ward | Mana Barrier en düşük canlı müttefiki de değerinin %35'iyle korur. | two tall sapphire crystal shards standing side by side, linked by a glowing blue thread. | `assets/tree-icons/mage/3_mb.png` |
| 3.v | Evolve | Shatter Aegis | Mana Barrier evolve (Shatter Aegis): kırılınca saldırana bedava, kesin kritik Fire Bolt atar. | a sapphire crystal kite shield shattering into large shards, a small burst of orange fire at its center. + evolve cümlesi | `assets/tree-icons/mage/3_v.png` |

### Meteor ult kol sonları (notable) · ref `meteor.png` · kaçın: düşen alevli kaya

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Sea of Fire | Meteor'un yanan zemini artı şeklinin dokunduğu her hücreyi de kaplar. | a cracked stone ground slab with molten lava glowing through the cracks, low flames. | `assets/tree-icons/mage/4_u3.png` |
| 4.r3 | Notable | Earthshaker | Meteor'un vurduğu her düşman %35 şansla Stagger (sıradaki eylemini kaybeder). | a stone pillar cracking and toppling to the right, a little dust. | `assets/tree-icons/mage/4_r3.png` |
| 4.d3 | Notable | Twin Meteors | Meteor'dan 1 tur sonra aynı hücrelere %35 güçle ikinci meteor. | a smoking stone crater with a glowing molten core. | `assets/tree-icons/mage/4_d3.png` |
| 4.l3 | Notable | Extinction | Meteor'un merkez hedefi, vurulan diğer her düşman için +%15 hasar alır. | a small erupting volcano cone pouring orange lava down its sides. | `assets/tree-icons/mage/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-mage.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/mage/`, oyun dosyası `assets/tree-icons/mage/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Overload): a wooden wizard staff head topped with a sapphire crystal, crackling with blue lightning. Do NOT draw a book or tome (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/echo.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Endless Refrain): a small gold lyre with glowing sapphire-blue strings. Do NOT draw a book or tome (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/echo.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Time Fold): a brass hourglass bent in the middle like folded metal, glowing blue arcane sand inside. Do NOT draw a book or tome (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/echo.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Arcane Overload): a tall pointed deep-blue wizard hat with gold stars, blue arcane lightning crackling above its tip. Do NOT draw a book or tome (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/mage/echo.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Weak Spot): a steel breastplate with one red-hot glowing melted spot, a little smoke. Do NOT draw a fireball or comet (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/fireball.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hot Streak): a burning wooden torch held upright, a tall orange flame. Do NOT draw a fireball or comet (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/fireball.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Rolling Doom): an iron-banded wooden barrel on fire, rolling to the right. Do NOT draw a fireball or comet (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/fireball.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sunfire): a fiery orange salamander with glowing ember skin, coiled ready to strike. Do NOT draw a fireball or comet (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/mage/fireball.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hard Frost): a large jagged ice crystal spike growing straight up from a frozen patch of ground. Do NOT draw a swirl or spiral of ice (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/blizzard.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Winter's Grip): a steel gauntlet frozen solid in thick ice, clenched in a grip. Do NOT draw a swirl or spiral of ice (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/blizzard.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Lost in the Snow): a steel helm half-buried in a snowdrift, a few small yellow-white stun stars. Do NOT draw a swirl or spiral of ice (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/blizzard.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Eternal Winter): a pine tree heavy with snow and icicles, a pale-blue frost glow. Do NOT draw a swirl or spiral of ice (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/mage/blizzard.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Ice Mirror): a polished silver hand mirror with its glass frosted over by ice crystals. Do NOT draw a sphere, orb, globe or round bubble (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/manabarrier.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Frozen Rebuke): a cluster of three sharp ice shards bursting outward to the left. Do NOT draw a sphere, orb, globe or round bubble (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/manabarrier.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Twin Ward): two tall sapphire crystal shards standing side by side, linked by a glowing blue thread. Do NOT draw a sphere, orb, globe or round bubble (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/manabarrier.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Shatter Aegis): a sapphire crystal kite shield shattering into large shards, a small burst of orange fire at its center. Do NOT draw a sphere, orb, globe or round bubble (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/mage/manabarrier.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sea of Fire): a cracked stone ground slab with molten lava glowing through the cracks, low flames. Do NOT draw a flaming rock falling (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/meteor.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Earthshaker): a stone pillar cracking and toppling to the right, a little dust. Do NOT draw a flaming rock falling (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/meteor.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Twin Meteors): a smoking stone crater with a glowing molten core. Do NOT draw a flaming rock falling (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/meteor.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/mage/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, vivid blazing orange-red fire, icy pale-blue frost crystals, deep sapphire-blue arcane light, gold trim, worn leather) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Extinction): a small erupting volcano cone pouring orange lava down its sides. Do NOT draw a flaming rock falling (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/mage/meteor.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
