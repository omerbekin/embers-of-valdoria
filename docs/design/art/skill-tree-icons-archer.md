# Skill ağacı ikonları: Archer (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Archer'a uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/archer.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/archer/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: sıcak meşe/porsuk ağacı, mumlu kiriş, koyu deri, orman yeşili kumaş, çelik ok ucu, beyaz-kahve kaz tüyü. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Sharpshooter (pasif) satırı · ref `sharp.png` · kaçın: nişan tahtası / iç içe halka

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Eagle Eye | Sharpshooter bonusunun yarısı kritik şansına da eklenir. | a bold eagle head in profile facing right, a sharp amber eye with a tiny gold glint. | `assets/tree-icons/archer/0_n0.png` |
| 0.ma | Notable | Held Breath | Skip Turn nişan aldırır: sıradaki skill kesin kritik ve zırhın %20'sini yok sayar. | a chunky dark leather archer's glove with two fingers raised in a draw grip, held perfectly still, a faint pale breath mist curling beside it. | `assets/tree-icons/archer/0_ma.png` |
| 0.mb | Notable | Range Keeper | Sana 3 mesafe içine giren düşmana bedava Quick Shot (turlar arasında bir kez). | three sharpened oak palisade stakes angled outward to the right, a steel arrowhead lodged in the front stake. | `assets/tree-icons/archer/0_mb.png` |
| 0.v | Evolve | Dead Center | Sharpshooter evolve: 4+ sıra uzaktaki her düşmana ilk vuruşun kesin kritik. | a great yew longbow standing vertical, fully drawn with one thick steel-headed arrow nocked and pointing straight up, a white-gold glint on the arrowhead. + evolve cümlesi | `assets/tree-icons/archer/0_v.png` |

### Quick Shot satırı · ref `arrow.png` · kaçın: yatay uçan tek ok

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Shot to the Knee | Quick Shot kritikleri hedefi her zaman 2 tur Slow eder. | a steel knee guard (poleyn) with one thick arrow stuck in it at a steep angle, a heavy pale-blue chill hanging from it. | `assets/tree-icons/archer/1_n0.png` |
| 1.ma | Notable | Hobbled | 2+ tur Slow'lu düşmana Quick Shot 1 tur Stun verir, Slow biter. | a leather boot caught in a thick rope snare loop, a few small yellow-white stun stars above it. | `assets/tree-icons/archer/1_ma.png` |
| 1.mb | Notable | Blind Panic | Blind düşmana Quick Shot onu Jinxed da yapar. | a thick knotted cloth blindfold band with a big knot, a crooked violet jinx wisp curling out of the knot. | `assets/tree-icons/archer/1_mb.png` |
| 1.v | Evolve | Maiming Shot | Quick Shot evolve: Slow verir; Slow'lu hedefi Blind eder; ikisi birden varsa Stagger. | an oversized chunky barbed steel broadhead arrowhead pointing diagonally down-right, three small glows along its socket: pale blue, grey and yellow-white. + evolve cümlesi | `assets/tree-icons/archer/1_v.png` |

### Piercing Arrow satırı · ref `pierce.png` · kaçın: tahtayı delen ok / yatay ok

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Bodkin Point | Piercing Arrow zırhın %15'ini (senden zırhlıya %50) yok sayar. | an oversized bodkin arrowhead, a thick square steel spike, pointing straight up, a few chips of steel armor flaking off its tip. | `assets/tree-icons/archer/2_n0.png` |
| 2.ma | Notable | Shattered Line | Aimed Shot, Sundered düşmanda tüm zırhı yok sayar. | a steel breastplate split cleanly in half down the middle, the two halves falling apart, a few steel shards. | `assets/tree-icons/archer/2_ma.png` |
| 2.mb | Notable | Through the Guard | Piercing Arrow vurduklarında Fortified, Blessed ve kalkanları yok sayar. | a wooden heater shield with steel rim, a clean gaping hole punched through its center, a faint golden blessing light fading at the hole's edges. | `assets/tree-icons/archer/2_mb.png` |
| 2.v | Evolve | Siege Bolt | Piercing Arrow evolve (Siege Bolt): tüm zırhı yok sayar, geçtiği her düşmanda yalnızca %10 kaybeder. | a heavy oak ballista with steel fittings, drawn and loaded with a thick iron bolt, facing right. + evolve cümlesi | `assets/tree-icons/archer/2_v.png` |

### Arrow Rain satırı · ref `arrows.png` · kaçın: yağan ok yağmuru

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Hobbling Hail | Arrow Rain vurduğu düşmanlardaki her Slow'u 1 tur uzatır. | a heavy iron caltrop with four thick spikes lying on the ground, pale-blue frost on its spikes. | `assets/tree-icons/archer/3_n0.png` |
| 3.ma | Notable | Killing Field | Ok tarlasındaki düşmanlar tur başında %20 DEX hasar alır ve Blind olur. | a crow perched on a broken arrow shaft, wings half spread, charcoal-grey feathers with a warm rim light (not pure black). | `assets/tree-icons/archer/3_ma.png` |
| 3.mb | Notable | Sky Full of Shafts | Kalıcı yağmur 2 tur daha sürer; içinden geçen Piercing Arrow azalmaz. | a dark leather quiver standing upright, stuffed to bursting with many white-fletched arrows. | `assets/tree-icons/archer/3_mb.png` |
| 3.v | Evolve | Arrow Storm | Arrow Rain evolve (Arrow Storm): 3 yerine 4 sıra, alanda 2 turluk yağmur (%20/tur). | a heavy dark-grey thundercloud with three oversized arrows bursting down out of it like lightning bolts, a gold lightning crackle. + evolve cümlesi | `assets/tree-icons/archer/3_v.png` |

### Aimed Shot ult kol sonları (notable) · ref `aimedshot.png` · kaçın: yay geren kol / çapraz yay

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Deathblow | Aimed Shot, hedefin eksik canının her %1'i için +%1 hasar. | a heavy steel helm cracked open from the crown, one thick arrow lodged in the crack. | `assets/tree-icons/archer/4_u3.png` |
| 4.r3 | Notable | Next in Line | Aimed Shot öldürürse sıradaki skill +%35 ve ıskalamaz. | a bundle of three thick arrows tied with a leather cord standing upright, the front arrowhead glowing gold. | `assets/tree-icons/archer/4_r3.png` |
| 4.d3 | Notable | Lightning Draw | Hedeften hızlıysan Aimed Shot iki kez atar (ikincisi %35). | a bold bright yellow-white zigzag lightning bolt with a steel arrowhead at its tip, pointing down-right. | `assets/tree-icons/archer/4_d3.png` |
| 4.l3 | Notable | Ghost Archer | Aimed Shot sonrası 2 tur Shrouded (kaçınma +%20). | an empty forest-green hooded archer's cloak floating upright, its hem fading into pale grey mist, warm rim light along the hood. | `assets/tree-icons/archer/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-archer.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/archer/`, oyun dosyası `assets/tree-icons/archer/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Eagle Eye): a bold eagle head in profile facing right, a sharp amber eye with a tiny gold glint. Do NOT draw an archery target, bullseye or concentric rings (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/sharp.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Held Breath): a chunky dark leather archer's glove with two fingers raised in a draw grip, held perfectly still, a faint pale breath mist curling beside it. Do NOT draw an archery target, bullseye or concentric rings (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/sharp.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Range Keeper): three sharpened oak palisade stakes angled outward to the right, a steel arrowhead lodged in the front stake. Do NOT draw an archery target, bullseye or concentric rings (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/sharp.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Dead Center): a great yew longbow standing vertical, fully drawn with one thick steel-headed arrow nocked and pointing straight up, a white-gold glint on the arrowhead. Do NOT draw an archery target, bullseye or concentric rings (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/archer/sharp.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Shot to the Knee): a steel knee guard (poleyn) with one thick arrow stuck in it at a steep angle, a heavy pale-blue chill hanging from it. Do NOT draw a single horizontal flying arrow (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/arrow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hobbled): a leather boot caught in a thick rope snare loop, a few small yellow-white stun stars above it. Do NOT draw a single horizontal flying arrow (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/arrow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Blind Panic): a thick knotted cloth blindfold band with a big knot, a crooked violet jinx wisp curling out of the knot. Do NOT draw a single horizontal flying arrow (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/arrow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Maiming Shot): an oversized chunky barbed steel broadhead arrowhead pointing diagonally down-right, three small glows along its socket: pale blue, grey and yellow-white. Do NOT draw a single horizontal flying arrow (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/archer/arrow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Bodkin Point): an oversized bodkin arrowhead, a thick square steel spike, pointing straight up, a few chips of steel armor flaking off its tip. Do NOT draw an arrow through wooden planks, or a horizontal arrow (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/pierce.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Shattered Line): a steel breastplate split cleanly in half down the middle, the two halves falling apart, a few steel shards. Do NOT draw an arrow through wooden planks, or a horizontal arrow (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/pierce.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Through the Guard): a wooden heater shield with steel rim, a clean gaping hole punched through its center, a faint golden blessing light fading at the hole's edges. Do NOT draw an arrow through wooden planks, or a horizontal arrow (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/pierce.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Siege Bolt): a heavy oak ballista with steel fittings, drawn and loaded with a thick iron bolt, facing right. Do NOT draw an arrow through wooden planks, or a horizontal arrow (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/archer/pierce.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hobbling Hail): a heavy iron caltrop with four thick spikes lying on the ground, pale-blue frost on its spikes. Do NOT draw many arrows falling as a volley (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/arrows.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Killing Field): a crow perched on a broken arrow shaft, wings half spread, charcoal-grey feathers with a warm rim light (not pure black). Do NOT draw many arrows falling as a volley (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/arrows.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sky Full of Shafts): a dark leather quiver standing upright, stuffed to bursting with many white-fletched arrows. Do NOT draw many arrows falling as a volley (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/arrows.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Arrow Storm): a heavy dark-grey thundercloud with three oversized arrows bursting down out of it like lightning bolts, a gold lightning crackle. Do NOT draw many arrows falling as a volley (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/archer/arrows.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Deathblow): a heavy steel helm cracked open from the crown, one thick arrow lodged in the crack. Do NOT draw an arm or hand drawing a bow, or a bow held diagonally (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/aimedshot.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Next in Line): a bundle of three thick arrows tied with a leather cord standing upright, the front arrowhead glowing gold. Do NOT draw an arm or hand drawing a bow, or a bow held diagonally (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/aimedshot.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Lightning Draw): a bold bright yellow-white zigzag lightning bolt with a steel arrowhead at its tip, pointing down-right. Do NOT draw an arm or hand drawing a bow, or a bow held diagonally (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/aimedshot.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/archer/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, warm oak and yew wood, waxed bowstring, dark leather, forest green cloth, steel arrowheads, white-brown goose fletching, small warm orange glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Ghost Archer): an empty forest-green hooded archer's cloak floating upright, its hem fading into pale grey mist, warm rim light along the hood. Do NOT draw an arm or hand drawing a bow, or a bow held diagonally (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/archer/aimedshot.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
