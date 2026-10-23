# Skill ağacı ikonları: Antimage (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Antimage'e uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/antimage.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/antimage/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: koyu çelik, açık renk oyma taş, gümüş, mor-macenta boşluk enerjisi, küçük camgöbeği mana kristalleri. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Mana Overflow (pasif) satırı · ref `overflow.png` · kaçın: kadeh / taşan sıvı

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Tidal Surge | Her 3. Mana Overflow tetiklemesi takıma 5 yerine 15 MP verir. | a tall breaking wave of glowing cyan-blue mana water curling to the right, three small cyan crystals riding its crest. | `assets/tree-icons/antimage/0_n0.png` |
| 0.ma | Notable | Brimming Ally | Mana Overflow'un MP'sini doldurduğu müttefik 1 tur Haste alır. | a dark steel armored boot striding to the right, cyan mana light streaming from its heel as short speed streaks. | `assets/tree-icons/antimage/0_ma.png` |
| 0.mb | Notable | Spell Sink | Mana Overflow tetiklenince en düşük canlı müttefiki sıradaki turuna kadar korursun (hasarının %15'ini sen alırsın). | an upright dark steel kite shield with a pale stone rim, two violet energy bolts bending and sinking into its face. | `assets/tree-icons/antimage/0_mb.png` |
| 0.v | Evolve | Endless Spring | Mana Overflow evolve: müttefiklerin büyü zırhının engellediği hasar da sayılır. | a large cluster of faceted cyan-blue mana crystals growing upward from a cracked pale stone base, bright cyan droplets rising endlessly from its tips. + evolve cümlesi | `assets/tree-icons/antimage/0_v.png` |

### Mana Steal satırı · ref `manaburn.png` · kaçın: kristal ezen eldiven / yumruk

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Prying Blade | Mana Steal hedefinden rastgele bir buff söker. | a thick dark steel dagger pointing down, levering a glowing golden rune seal apart so it cracks in two. | `assets/tree-icons/antimage/1_n0.png` |
| 1.ma | Notable | Drink Deep | Mana Steal yaktığı MP'nin %30'u kadar seni iyileştirir. | a curved drinking horn with silver bands, glowing cyan mana pouring into its mouth from above, a soft green heal glow at the rim. | `assets/tree-icons/antimage/1_ma.png` |
| 1.mb | Notable | Tempo Thief | Mana Steal hedefin MP'sini sıfırlarsa sıradaki turun %8 erken gelir. | a brass hourglass tipped on its side, glowing cyan mana instead of sand draining out of its upper bulb, one violet speed streak. | `assets/tree-icons/antimage/1_mb.png` |
| 1.v | Evolve | Spellsplitter | Mana Steal evolve (Spellsplitter): hedefin tüm buff'larını söker, söktüğü her buff için +%8 hasar. | a heavy dark steel cleaver-blade splitting a glowing golden rune tablet into two halves, violet void sparks along the cut. + evolve cümlesi | `assets/tree-icons/antimage/1_v.png` |

### Drain Field satırı · ref `drainfield.png` · kaçın: yerde halka / portal / girdap

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Sure Hush | Drain Field, büyüden önce zaten 0 MP olan düşmanları her zaman Silence eder. | a heavy dark iron padlock locked shut, a violet glow inside its keyhole. | `assets/tree-icons/antimage/2_n0.png` |
| 2.ma | Notable | Heart of Quiet | Drain Field'ın merkezindeki düşman 0 MP'de kalırsa 1 tur kesin Silence. | a single tall violet void crystal spike driven point-down into a cracked pale stone slab. | `assets/tree-icons/antimage/2_ma.png` |
| 2.mb | Notable | Mass Hush | Drain Field 3+ düşmanı boşaltırsa hepsi zarsız Silence olur. | three empty glass mana vials standing side by side, their stoppers sealed with violet wax, a faint violet haze above them. | `assets/tree-icons/antimage/2_mb.png` |
| 2.v | Evolve | Hall of Silence | Drain Field evolve (Hall of Silence): alan 2 tur kalır, her tur maks MP'nin %15'ini yakar, içindeki 0 MP düşmanları Silence eder. | a tall pointed pale stone gothic archway filled with a calm violet void glow, two small cyan crystals at its base. + evolve cümlesi | `assets/tree-icons/antimage/2_v.png` |

### Spell Ward satırı · ref `spellward.png` · kaçın: taş tabletler / rün halkası / yuvarlak şekil

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Purging Ward | Spell Ward önce korunan müttefikin tüm debuff'larını siler. | a silver ewer tilted forward, pouring a clear cyan stream that washes violet-black grime off into small fading drops. | `assets/tree-icons/antimage/3_n0.png` |
| 3.ma | Notable | Second Ward | Spell Ward kırılınca en düşük canlı müttefikte %25'lik yeni bir kalkan oluşur. | a cracked dark steel heater shield on the left, a new translucent glowing cyan heater shield forming behind it on the right. | `assets/tree-icons/antimage/3_ma.png` |
| 3.mb | Notable | Bastion of Null | Spell Ward + taunt varken %30 daha az fiziksel hasar alırsın. | a heavy dark steel great helm facing front, a violet glow in its eye slit and a cyan rune etched on its brow. | `assets/tree-icons/antimage/3_mb.png` |
| 3.v | Evolve | Mirror Ward | Spell Ward evolve (Mirror Ward): emdiği büyü vuruşlarının %25'ini saldırana geri yansıtır. | an upright silver hand mirror in an ornate dark steel frame, a violet bolt bouncing off its glass back to the left. + evolve cümlesi | `assets/tree-icons/antimage/3_v.png` |

### Void Strike ult kol sonları (notable) · ref `voidstrike.png` · kaçın: mor alevli kılıç

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Void Shackle | Void Strike, 0 MP'deki hedefini Stun eder. | a pair of heavy dark iron shackle cuffs joined by a short thick chain, glowing violet runes on the cuffs, a few small yellow-white stun stars. | `assets/tree-icons/antimage/4_u3.png` |
| 4.r3 | Notable | Feeding Frenzy | Hedefini sıradaki turundan önce bir müttefik öldürürse takım 15 MP kazanır. | a dark steel hunting horn with silver bands, cyan mana sparks bursting from its bell. | `assets/tree-icons/antimage/4_r3.png` |
| 4.d3 | Notable | Overflow Strike | Void Strike atınca Mana Overflow hemen tetiklenir. | a dark steel spear point thrust downward, cracking open a large cyan mana crystal with cyan light spraying out. | `assets/tree-icons/antimage/4_d3.png` |
| 4.l3 | Notable | Grand Theft | Void Strike hedefin tüm buff'larını çalar ve takımına dağıtır. | a bulging dark leather thief's sack tied with violet cord, glowing golden rune motes and a few gold sparkles spilling from its open top. | `assets/tree-icons/antimage/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-antimage.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/antimage/`, oyun dosyası `assets/tree-icons/antimage/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Tidal Surge): a tall breaking wave of glowing cyan-blue mana water curling to the right, three small cyan crystals riding its crest. Do NOT draw a chalice, goblet or cup, or liquid overflowing a rim (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/overflow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Brimming Ally): a dark steel armored boot striding to the right, cyan mana light streaming from its heel as short speed streaks. Do NOT draw a chalice, goblet or cup, or liquid overflowing a rim (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/overflow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Spell Sink): an upright dark steel kite shield with a pale stone rim, two violet energy bolts bending and sinking into its face. Do NOT draw a chalice, goblet or cup, or liquid overflowing a rim (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/overflow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Endless Spring): a large cluster of faceted cyan-blue mana crystals growing upward from a cracked pale stone base, bright cyan droplets rising endlessly from its tips. Do NOT draw a chalice, goblet or cup, or liquid overflowing a rim (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/antimage/overflow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Prying Blade): a thick dark steel dagger pointing down, levering a glowing golden rune seal apart so it cracks in two. Do NOT draw a gauntlet, fist or hand crushing crystals (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/manaburn.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Drink Deep): a curved drinking horn with silver bands, glowing cyan mana pouring into its mouth from above, a soft green heal glow at the rim. Do NOT draw a gauntlet, fist or hand crushing crystals (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/manaburn.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Tempo Thief): a brass hourglass tipped on its side, glowing cyan mana instead of sand draining out of its upper bulb, one violet speed streak. Do NOT draw a gauntlet, fist or hand crushing crystals (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/manaburn.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Spellsplitter): a heavy dark steel cleaver-blade splitting a glowing golden rune tablet into two halves, violet void sparks along the cut. Do NOT draw a gauntlet, fist or hand crushing crystals (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/antimage/manaburn.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sure Hush): a heavy dark iron padlock locked shut, a violet glow inside its keyhole. Do NOT draw a ring, circle, portal or vortex swirl on the ground (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/drainfield.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Heart of Quiet): a single tall violet void crystal spike driven point-down into a cracked pale stone slab. Do NOT draw a ring, circle, portal or vortex swirl on the ground (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/drainfield.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Mass Hush): three empty glass mana vials standing side by side, their stoppers sealed with violet wax, a faint violet haze above them. Do NOT draw a ring, circle, portal or vortex swirl on the ground (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/drainfield.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hall of Silence): a tall pointed pale stone gothic archway filled with a calm violet void glow, two small cyan crystals at its base. Do NOT draw a ring, circle, portal or vortex swirl on the ground (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/antimage/drainfield.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Purging Ward): a silver ewer tilted forward, pouring a clear cyan stream that washes violet-black grime off into small fading drops. Do NOT draw stone tablets, rings of runes or round shapes (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/spellward.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Second Ward): a cracked dark steel heater shield on the left, a new translucent glowing cyan heater shield forming behind it on the right. Do NOT draw stone tablets, rings of runes or round shapes (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/spellward.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Bastion of Null): a heavy dark steel great helm facing front, a violet glow in its eye slit and a cyan rune etched on its brow. Do NOT draw stone tablets, rings of runes or round shapes (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/spellward.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Mirror Ward): an upright silver hand mirror in an ornate dark steel frame, a violet bolt bouncing off its glass back to the left. Do NOT draw stone tablets, rings of runes or round shapes (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/antimage/spellward.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Void Shackle): a pair of heavy dark iron shackle cuffs joined by a short thick chain, glowing violet runes on the cuffs, a few small yellow-white stun stars. Do NOT draw a sword wreathed in violet flame (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/voidstrike.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Feeding Frenzy): a dark steel hunting horn with silver bands, cyan mana sparks bursting from its bell. Do NOT draw a sword wreathed in violet flame (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/voidstrike.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Overflow Strike): a dark steel spear point thrust downward, cracking open a large cyan mana crystal with cyan light spraying out. Do NOT draw a sword wreathed in violet flame (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/voidstrike.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/antimage/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, dark steel, carved pale stone, silver, violet-magenta void energy and small faceted cyan-blue mana crystals) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Grand Theft): a bulging dark leather thief's sack tied with violet cord, glowing golden rune motes and a few gold sparkles spilling from its open top. Do NOT draw a sword wreathed in violet flame (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/antimage/voidstrike.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
