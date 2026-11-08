# Skill ağacı ikonları: Gambler (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Gambler'a uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/gambler.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/gambler/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: parlak altın para, siyah noktalı fildişi zar, kırmızı/siyah takımlı eskimiş krem kart, kırmızı kadife, koyu deri. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Double or Nothing (pasif) satırı · ref `doubleornothing.png` · kaçın: tek para / dönen disk

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Chain Reaction | Double or Nothing tetiklenince diğer bekleme sürelerin de -1. | a short chain of three thick gold links snapping taut, a few gold sparks. | `assets/tree-icons/gambler/0_n0.png` |
| 0.ma | Notable | Unbroken Run | Üst üste 3 tetiklemeden sonra sıradaki skill kesin kritik. | a polished iron horseshoe with gold nails, opening pointing up. | `assets/tree-icons/gambler/0_ma.png` |
| 0.mb | Notable | Borrowed Time | Lucky Escape seni kurtarınca 2 tur boyunca her skill'de Double or Nothing tetiklenir. | a brass hourglass with red velvet trim, its sand flowing upward. | `assets/tree-icons/gambler/0_mb.png` |
| 0.v | Evolve | Run It Back | Double or Nothing evolve (Run It Back): tetiklenince skill hemen %40 güçle bir daha atılır. | a gilded jester's scepter with a carved head, red velvet ribbons and small gold bells. + evolve cümlesi | `assets/tree-icons/gambler/0_v.png` |

### Loaded Dice satırı · ref `loadeddice.png` · kaçın: zar çifti

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Endless Rattle | Loaded Dice'ın Double Hit'i aynı şansla tekrar tekrar sürebilir. | a red leather dice cup with gold trim shaking, short motion lines around it. | `assets/tree-icons/gambler/1_n0.png` |
| 1.ma | Notable | Boxcars | Loaded Dice 3+ kez atarsa rastgele başka bir düşmana da bir kez vurur. | one huge ivory die showing six pips, slamming down and cracking the wooden board beneath it. | `assets/tree-icons/gambler/1_ma.png` |
| 1.mb | Notable | Snake Eyes | Loaded Dice kritik vurunca sıradaki bahsin +%5 Jackpot şansı alır. | a coiled green-gold snake with two glowing red eyes, wrapped around a small ivory die. | `assets/tree-icons/gambler/1_mb.png` |
| 1.v | Evolve | Dice Storm | Loaded Dice evolve (Dice Storm): rastgele düşmanlara 3 zar atar, her biri kendi Double Hit'ini atar. | three ivory dice bursting out of a torn red velvet pouch, gold sparks. + evolve cümlesi | `assets/tree-icons/gambler/1_v.png` |

### High Stakes satırı · ref `highstakes.png` · kaçın: para yığını

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Due for a Win | Her High Stakes Bust'ı sıradakine +%10 Jackpot şansı verir, Jackpot'a kadar birikir. | a gold-banded wooden treasure chest with its lid slightly open, a gold glint inside. | `assets/tree-icons/gambler/2_n0.png` |
| 2.ma | Notable | Haymaker | Slow'lu hedefe High Stakes Jackpot'ı 1 tur Stun. | a heavy wooden cudgel with gold bands, a few yellow-white stun stars. | `assets/tree-icons/gambler/2_ma.png` |
| 2.mb | Notable | Sure Thing | High Stakes %70+ Jackpot şansındayken can bahsetmez. | a rolled parchment contract tied with a red ribbon and sealed with a big gold wax seal. | `assets/tree-icons/gambler/2_mb.png` |
| 2.v | Evolve | Called Game | High Stakes evolve (Called Game): Jackpot 1 tur Stun, Bust Jinx; can bahsi %15 -> %8. | an ornate gold crown with a red velvet cap, one playing card tucked into its band. + evolve cümlesi | `assets/tree-icons/gambler/2_v.png` |

### Card Trick satırı · ref `cardtrick.png` · kaçın: yelpaze açılmış kartlar

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Crippling Ace | Card Trick Slow'lu hedefe her zaman Stun verir. | a single ace playing card stuck upright into a wooden board like a thrown blade. | `assets/tree-icons/gambler/3_n0.png` |
| 3.ma | Notable | Double Deal | Her Card Trick kartı iki farklı durum verir: Stacked Deck seçimin + rastgele biri. | a dark leather card box with two cards popping out of its open top. | `assets/tree-icons/gambler/3_ma.png` |
| 3.mb | Notable | Blinding Flurry | Card Trick vurduğu her düşmanı 1 tur Blind da eder. | a polished gold hand mirror flashing a bright white glare. | `assets/tree-icons/gambler/3_mb.png` |
| 3.v | Evolve | Returning Cards | Card Trick evolve (Returning Cards): her kart %40 güçle geri dönüp ikinci kez vurur, yeni durum atar. | a raven flying to the left carrying a playing card in its beak, charcoal feathers with warm rim light. + evolve cümlesi | `assets/tree-icons/gambler/3_v.png` |

### All In ult kol sonları (notable) · ref `allin.png` · kaçın: para kesesi

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | High Roller | 25+ MP bahisli All In zırhın %35'ini yok sayar, ıskalamaz. | a fancy red velvet cap with a tall white feather and a gold brooch. | `assets/tree-icons/gambler/4_u3.png` |
| 4.r3 | Notable | Domino | All In öldürürse rastgele bir düşmana hasarının %40'ıyla vurur. | a line of three ivory domino tiles toppling to the right. | `assets/tree-icons/gambler/4_r3.png` |
| 4.d3 | Notable | Blitz | All In her savaşın başından hazırdır. | a fully wound wooden crossbow with brass fittings, cocked and loaded, pointing right. | `assets/tree-icons/gambler/4_d3.png` |
| 4.l3 | Notable | Last Breath | %25 can altındayken All In hep Jackpot. | a guttering red wax candle stub with one last tall golden flame. | `assets/tree-icons/gambler/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-gambler.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/gambler/`, oyun dosyası `assets/tree-icons/gambler/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Chain Reaction): a short chain of three thick gold links snapping taut, a few gold sparks. Do NOT draw a single coin or a spinning disc (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/doubleornothing.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Unbroken Run): a polished iron horseshoe with gold nails, opening pointing up. Do NOT draw a single coin or a spinning disc (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/doubleornothing.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Borrowed Time): a brass hourglass with red velvet trim, its sand flowing upward. Do NOT draw a single coin or a spinning disc (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/doubleornothing.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Run It Back): a gilded jester's scepter with a carved head, red velvet ribbons and small gold bells. Do NOT draw a single coin or a spinning disc (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/gambler/doubleornothing.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Endless Rattle): a red leather dice cup with gold trim shaking, short motion lines around it. Do NOT draw a pair of dice (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/loadeddice.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Boxcars): one huge ivory die showing six pips, slamming down and cracking the wooden board beneath it. Do NOT draw a pair of dice (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/loadeddice.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Snake Eyes): a coiled green-gold snake with two glowing red eyes, wrapped around a small ivory die. Do NOT draw a pair of dice (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/loadeddice.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Dice Storm): three ivory dice bursting out of a torn red velvet pouch, gold sparks. Do NOT draw a pair of dice (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/gambler/loadeddice.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Due for a Win): a gold-banded wooden treasure chest with its lid slightly open, a gold glint inside. Do NOT draw a stack of coins (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/highstakes.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Haymaker): a heavy wooden cudgel with gold bands, a few yellow-white stun stars. Do NOT draw a stack of coins (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/highstakes.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sure Thing): a rolled parchment contract tied with a red ribbon and sealed with a big gold wax seal. Do NOT draw a stack of coins (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/highstakes.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Called Game): an ornate gold crown with a red velvet cap, one playing card tucked into its band. Do NOT draw a stack of coins (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/gambler/highstakes.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Crippling Ace): a single ace playing card stuck upright into a wooden board like a thrown blade. Do NOT draw a fan of playing cards (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/cardtrick.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Double Deal): a dark leather card box with two cards popping out of its open top. Do NOT draw a fan of playing cards (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/cardtrick.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Blinding Flurry): a polished gold hand mirror flashing a bright white glare. Do NOT draw a fan of playing cards (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/cardtrick.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Returning Cards): a raven flying to the left carrying a playing card in its beak, charcoal feathers with warm rim light. Do NOT draw a fan of playing cards (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/gambler/cardtrick.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (High Roller): a fancy red velvet cap with a tall white feather and a gold brooch. Do NOT draw a sack or pouch of coins (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/allin.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Domino): a line of three ivory domino tiles toppling to the right. Do NOT draw a sack or pouch of coins (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/allin.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Blitz): a fully wound wooden crossbow with brass fittings, cocked and loaded, pointing right. Do NOT draw a sack or pouch of coins (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/allin.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/gambler/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished gold coins, ivory dice with black pips, aged cream playing cards with red and black suits, red velvet, dark leather, gold glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Last Breath): a guttering red wax candle stub with one last tall golden flame. Do NOT draw a sack or pouch of coins (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/gambler/allin.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
