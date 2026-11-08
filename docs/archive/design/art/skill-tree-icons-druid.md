# Skill ağacı ikonları: Druid (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Druid'e uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/druid.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/druid/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: canlı meşe odunu/kabuk, yeşil yaprak, yosun, dikenli sarmaşık, kahve toprak, altın-yeşil yaşam ışığı; çürüme = mor-kahve ışık. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Nature's Grudge (pasif) satırı · ref `leaves.png` · kaçın: meşe yaprağı kümesi / palamut

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Rot Remembers | Nature's Grudge, bir müttefik ilk kez %30 altına düşünce de tetiklenir: saldıran 3 tur Wither. | a fallen hollow log split open, a violet-brown rot glow seeping out from inside. | `assets/tree-icons/druid/0_n0.png` |
| 0.ma | Notable | Rot Bloom | Wither'lı düşman ölünce patlar: yanındakilere %20 INT doğa hasarı + 2 tur Wither. | a bulbous toadstool mushroom bursting, releasing a puff of violet-brown spores. | `assets/tree-icons/druid/0_ma.png` |
| 0.mb | Notable | Rot to the Core | Grudge Wither'ı bitince katil verdiği hasarın yarısını bir kez daha alır. | a halved apple, its core rotten violet-brown. | `assets/tree-icons/druid/0_mb.png` |
| 0.v | Evolve | Ever-Rot | Nature's Grudge evolve (Ever-Rot): her turunun başında en canlı düşman 2 tur Wither. | a tall twisted rotting tree with violet-brown blight glowing in its cracks, a few dead leaves falling. + evolve cümlesi | `assets/tree-icons/druid/0_v.png` |

### Thorn Whip satırı · ref `thornwhip.png` · kaçın: kıvrılmış sarmaşık / kırbaç

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Whip Crack | Thorn Whip %30 altındaki hedefe +%25 hasar. | a single oversized thorn barb, sharp and curved upward, a green-gold crack flash at its tip. | `assets/tree-icons/druid/1_n0.png` |
| 1.ma | Notable | Third Lash | Her 3. Thorn Whip başka bir düşmana da %10 vurur. | a spiky thistle flower head with a purple bloom and three sharp leaves. | `assets/tree-icons/druid/1_ma.png` |
| 1.mb | Notable | Endless Lash | Thorn Whip öldürürse sıradaki turun %15 erken gelir. | a hawthorn branch heavy with thorns and red berries pointing right, a short green speed streak behind it. | `assets/tree-icons/druid/1_mb.png` |
| 1.v | Evolve | Thornstorm Lash | Thorn Whip evolve (Thornstorm Lash): üç kırbaca bölünür, her biri rastgele düşmana %45; kritik başına 3 MP. | a large spiky thorn burr seed pod bursting open, three thorns shooting outward. + evolve cümlesi | `assets/tree-icons/druid/1_v.png` |

### Nature's Wrath satırı · ref `roots.png` · kaçın: kök yumağı / kök patlaması

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Root Field | Nature's Wrath 2 turluk kök alanı bırakır: orada tur başlatan 1 tur Slow. | a mossy boulder covered in creeping green ivy. | `assets/tree-icons/druid/2_n0.png` |
| 2.ma | Notable | Overgrown Field | Kök alanı 2 tur daha sürer ve her tur %15 INT doğa hasarı verir. | a wild bramble bush with green leaves and a few small golden-green sparks. | `assets/tree-icons/druid/2_ma.png` |
| 2.mb | Notable | Strangling Grove | Nature's Wrath vurduğu her Slow'lu düşmanı 1 tur Stun eder. | three young birch trunks leaning tightly together, a few yellow-white stun stars. | `assets/tree-icons/druid/2_mb.png` |
| 2.v | Evolve | Thicket Wave | Nature's Wrath evolve (Thicket Wave): sıradaki turunun başında aynı hücrelere %25 + 1 tur Stun. | a tall wave made of green leaves and thorny branches cresting to the right, golden-green glow. + evolve cümlesi | `assets/tree-icons/druid/2_v.png` |

### Rejuvenate satırı · ref `rejuvenate.png` · kaçın: toprakta filiz

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Overflowing Cup | Rejuvenate'in fazla iyileştirmesi aynı boyda kalkana döner. | a carved wooden cup overflowing with glowing golden-green sap. | `assets/tree-icons/druid/3_n0.png` |
| 3.ma | Notable | Grove Bloom | Rejuvenate'in ilk şifası hedefin sırasındaki tüm müttefiklere de iner. | a large white-and-gold wild flower blossom in full bloom with soft golden pollen. | `assets/tree-icons/druid/3_ma.png` |
| 3.mb | Notable | Lifebloom | Rejuvenate yenilenmesi bitince müttefik ilk şifa kadar bir kez daha iyileşir. | a chunk of honeycomb dripping golden honey. | `assets/tree-icons/druid/3_mb.png` |
| 3.v | Evolve | Verdant Link | Rejuvenate evolve (Verdant Link): hedef ve en düşük canlı müttefik ikisi de tam şifa + yenilenme alır. | two halves of a split oak branch knitting back together with glowing golden-green fibers. + evolve cümlesi | `assets/tree-icons/druid/3_v.png` |

### Summon Treant ult kol sonları (notable) · ref `treant.png` · kaçın: ağaç yüzü / treant

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Falling Oak | Varış hasarı +%100, Treant'ın karşısındaki düşman 1 tur Stun. | a huge oak trunk toppling diagonally down to the right, yellow-white stun stars at its impact. | `assets/tree-icons/druid/4_u3.png` |
| 4.r3 | Notable | Wrathful Oak | Treant turda iki kez oynar ama yalnızca 2 tur yaşar. | a thick oak staff with glowing amber wrath in its cracks. | `assets/tree-icons/druid/4_r3.png` |
| 4.d3 | Notable | Living Bomb | Treant ayaktayken yenisini çağırabilirsin: eskisi iki kat hasarla patlar. | a round gnarled wooden burl bursting open with golden-green light and a few splinters. | `assets/tree-icons/druid/4_d3.png` |
| 4.l3 | Notable | Guardian Oak | Treant arkasındaki müttefiki korur: aldığı hasarın yarısı Treant'a gider. | a thick oak-bark heater shield with green leaves growing from its rim. | `assets/tree-icons/druid/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-druid.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/druid/`, oyun dosyası `assets/tree-icons/druid/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Rot Remembers): a fallen hollow log split open, a violet-brown rot glow seeping out from inside. Do NOT draw oak leaf clusters or acorns (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/leaves.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Rot Bloom): a bulbous toadstool mushroom bursting, releasing a puff of violet-brown spores. Do NOT draw oak leaf clusters or acorns (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/leaves.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Rot to the Core): a halved apple, its core rotten violet-brown. Do NOT draw oak leaf clusters or acorns (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/leaves.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Ever-Rot): a tall twisted rotting tree with violet-brown blight glowing in its cracks, a few dead leaves falling. Do NOT draw oak leaf clusters or acorns (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/druid/leaves.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Whip Crack): a single oversized thorn barb, sharp and curved upward, a green-gold crack flash at its tip. Do NOT draw a coiled vine or whip (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/thornwhip.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Third Lash): a spiky thistle flower head with a purple bloom and three sharp leaves. Do NOT draw a coiled vine or whip (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/thornwhip.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Endless Lash): a hawthorn branch heavy with thorns and red berries pointing right, a short green speed streak behind it. Do NOT draw a coiled vine or whip (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/thornwhip.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Thornstorm Lash): a large spiky thorn burr seed pod bursting open, three thorns shooting outward. Do NOT draw a coiled vine or whip (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/druid/thornwhip.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Root Field): a mossy boulder covered in creeping green ivy. Do NOT draw a tangle or burst of roots (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/roots.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Overgrown Field): a wild bramble bush with green leaves and a few small golden-green sparks. Do NOT draw a tangle or burst of roots (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/roots.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Strangling Grove): three young birch trunks leaning tightly together, a few yellow-white stun stars. Do NOT draw a tangle or burst of roots (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/roots.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Thicket Wave): a tall wave made of green leaves and thorny branches cresting to the right, golden-green glow. Do NOT draw a tangle or burst of roots (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/druid/roots.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Overflowing Cup): a carved wooden cup overflowing with glowing golden-green sap. Do NOT draw a sprout or seedling in soil (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/rejuvenate.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Grove Bloom): a large white-and-gold wild flower blossom in full bloom with soft golden pollen. Do NOT draw a sprout or seedling in soil (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/rejuvenate.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Lifebloom): a chunk of honeycomb dripping golden honey. Do NOT draw a sprout or seedling in soil (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/rejuvenate.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Verdant Link): two halves of a split oak branch knitting back together with glowing golden-green fibers. Do NOT draw a sprout or seedling in soil (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/druid/rejuvenate.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Falling Oak): a huge oak trunk toppling diagonally down to the right, yellow-white stun stars at its impact. Do NOT draw a tree face or treant face (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/treant.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Wrathful Oak): a thick oak staff with glowing amber wrath in its cracks. Do NOT draw a tree face or treant face (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/treant.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Living Bomb): a round gnarled wooden burl bursting open with golden-green light and a few splinters. Do NOT draw a tree face or treant face (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/treant.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/druid/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, living oak wood and bark, green leaves, moss, thorny vines, brown earth, warm golden-green life glow, wither and rot shown as a violet-brown glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Guardian Oak): a thick oak-bark heater shield with green leaves growing from its rim. Do NOT draw a tree face or treant face (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/druid/treant.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
