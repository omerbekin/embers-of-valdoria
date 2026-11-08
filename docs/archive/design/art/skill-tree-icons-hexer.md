# Skill ağacı ikonları: Hexer (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Hexer'a uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/hexer.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/hexer/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: eskimiş kemik, koyu yıpranmış ahşap, kenar ışıklı koyu mum, yıpranmış kırmızı iplik, hastalıklı yeşil ve mor lanet ışığı. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Ill Omen (pasif) satırı · ref `soul.png` · kaçın: kemik etiket / muska / kolye

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Fate Sealed | Doom'dan sağ çıkan düşman 1 Omen tutar, sıradaki Doom daha erken gelir. | a small dark wooden coffin nailed shut, one red thread tied around it, violet light leaking from a crack. | `assets/tree-icons/hexer/0_n0.png` |
| 0.ma | Notable | Ruinous Crit | Kritik Doom x1,5 yerine x2 hasar verir. | a raven with wings spread wide and violet eyes, charcoal feathers with a warm rim light (not pure black). | `assets/tree-icons/hexer/0_ma.png` |
| 0.mb | Notable | Toppling Ruin | Doom öldürünce sıradaki turun %50 erken gelir. | a crumbling dark stone tower toppling to the right, violet curse light in its windows. | `assets/tree-icons/hexer/0_mb.png` |
| 0.v | Evolve | Passing Bell | Ill Omen evolve (Passing Bell): lanetli düşman ölünce en yakın düşman, ölünün Omen'leri kadar Doom yer. | a cracked bronze funeral bell with a frayed red rope, violet curse light pouring from its mouth. + evolve cümlesi | `assets/tree-icons/hexer/0_v.png` |

### Evil Eye satırı · ref `eye.png` · kaçın: göz

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Opening Glare | Omen'siz hedefe Evil Eye 2 Omen ekler. | a straw poppet doll with two bone pins stuck in it, tied with red thread. | `assets/tree-icons/hexer/1_n0.png` |
| 1.ma | Notable | Fatal Glance | Kritik Evil Eye 2 yerine 3 Omen ekler (hep Doom getirir). | a long bone needle pointing diagonally down-right, a violet curse spark at its tip, red thread trailing. | `assets/tree-icons/hexer/1_ma.png` |
| 1.mb | Notable | Doom Gaze | Evil Eye Doom getirirse o Doom +%10 hasar. | a cracked hourglass of dark wood with glowing violet sand. | `assets/tree-icons/hexer/1_mb.png` |
| 1.v | Evolve | Eye of Ruin | Evil Eye evolve (Eye of Ruin): vuruş başına 2 Omen (kritikte 3), doğrudan hasar yok. | a tall dark wooden staff topped with a raven skull, violet ruin light around it, red threads tied below. + evolve cümlesi | `assets/tree-icons/hexer/1_v.png` |

### Withering Curse satırı · ref `drainfield.png` · kaçın: mum

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Herd Curse | Withering Curse 3+ düşmana vurursa her biri 1 Omen daha alır. | three dark glass vials of glowing green rot tied together with red thread. | `assets/tree-icons/hexer/2_n0.png` |
| 2.ma | Notable | Plague Tide | Withering Curse alan dışındaki Omen'li her düşmana da 1 Omen ekler. | a cracked dark clay urn tipped over, green-violet miasma spilling downward. | `assets/tree-icons/hexer/2_ma.png` |
| 2.mb | Notable | Returning Curse | Lanetin Wither'ladığı düşman ölünce Withering Curse bekleme süresi sıfırlanır. | a withered dark rose with a warm rim light, a green curse glow on its petals. | `assets/tree-icons/hexer/2_mb.png` |
| 2.v | Evolve | Plague Curse | Withering Curse evolve (Plague Curse): Wither bulaşıcı; her tik yandaki düşmanı 2 tur Wither eder. | a sickly grey rat with glowing green eyes, a red thread tied around its tail. + evolve cümlesi | `assets/tree-icons/hexer/2_v.png` |

### Jinx satırı · ref `clover.png` · kaçın: yonca / yaprak

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Double Jinx | Jinxed hedefin sıradaki 2 saldırısı boyunca sürer. | a charcoal-grey cat arching its back, warm rim light along its fur, violet eyes. | `assets/tree-icons/hexer/3_n0.png` |
| 3.ma | Notable | Woeful Turn | Iskalayan Jinxed düşman sıradaki eylemini kaybeder. | a shattered hand mirror with violet light in its cracks. | `assets/tree-icons/hexer/3_ma.png` |
| 3.mb | Notable | Turned Luck | Jinxed düşman ıskalayınca hedeflediği müttefik 1 tur Haste. | an upside-down iron horseshoe dripping violet curse light. | `assets/tree-icons/hexer/3_mb.png` |
| 3.v | Evolve | Turned Hand | Jinx evolve (Turned Hand): Jinxed hedefin sıradaki saldırısı kendi müttefikine gider. | a dark wooden marionette control cross with red strings, one puppet hand dangling from them. + evolve cümlesi | `assets/tree-icons/hexer/3_v.png` |

### Doom Mark ult kol sonları (notable) · ref `voidstrike.png` · kaçın: çivi / çatlak disk

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Unending Mark | Doom Mark'ın sıçraması her öldürmede tekrarlar. | a smoldering iron branding iron with a curse sigil end glowing violet. | `assets/tree-icons/hexer/4_u3.png` |
| 4.r3 | Notable | Mark of Many | Doom Mark patlamadan önce diğer her düşmandan 1 Omen çeker. | a bundle of five bone pins bound together with red thread. | `assets/tree-icons/hexer/4_r3.png` |
| 4.d3 | Notable | Mark of Silence | Doom Mark hedefin sırasındaki her büyücüyü 1 tur Silence eder. | a rolled parchment sealed with a dark wax seal bearing a violet glowing sigil. | `assets/tree-icons/hexer/4_d3.png` |
| 4.l3 | Notable | Last Rite | Savaşta bir kez öldürücü darbe seni 1 HP bırakır ve katile bedava Doom Mark atar. | a dark wooden grave cross wrapped in red thread, a violet glow at its center. | `assets/tree-icons/hexer/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-hexer.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/hexer/`, oyun dosyası `assets/tree-icons/hexer/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Fate Sealed): a small dark wooden coffin nailed shut, one red thread tied around it, violet light leaking from a crack. Do NOT draw a bone tag, charm or pendant (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/soul.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Ruinous Crit): a raven with wings spread wide and violet eyes, charcoal feathers with a warm rim light (not pure black). Do NOT draw a bone tag, charm or pendant (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/soul.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Toppling Ruin): a crumbling dark stone tower toppling to the right, violet curse light in its windows. Do NOT draw a bone tag, charm or pendant (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/soul.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Passing Bell): a cracked bronze funeral bell with a frayed red rope, violet curse light pouring from its mouth. Do NOT draw a bone tag, charm or pendant (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/hexer/soul.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Opening Glare): a straw poppet doll with two bone pins stuck in it, tied with red thread. Do NOT draw an eye (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/eye.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Fatal Glance): a long bone needle pointing diagonally down-right, a violet curse spark at its tip, red thread trailing. Do NOT draw an eye (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/eye.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Doom Gaze): a cracked hourglass of dark wood with glowing violet sand. Do NOT draw an eye (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/eye.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Eye of Ruin): a tall dark wooden staff topped with a raven skull, violet ruin light around it, red threads tied below. Do NOT draw an eye (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/hexer/eye.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Herd Curse): three dark glass vials of glowing green rot tied together with red thread. Do NOT draw a candle (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/drainfield.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Plague Tide): a cracked dark clay urn tipped over, green-violet miasma spilling downward. Do NOT draw a candle (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/drainfield.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Returning Curse): a withered dark rose with a warm rim light, a green curse glow on its petals. Do NOT draw a candle (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/drainfield.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Plague Curse): a sickly grey rat with glowing green eyes, a red thread tied around its tail. Do NOT draw a candle (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/hexer/drainfield.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Double Jinx): a charcoal-grey cat arching its back, warm rim light along its fur, violet eyes. Do NOT draw a clover or leaves (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/clover.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Woeful Turn): a shattered hand mirror with violet light in its cracks. Do NOT draw a clover or leaves (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/clover.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Turned Luck): an upside-down iron horseshoe dripping violet curse light. Do NOT draw a clover or leaves (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/clover.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Turned Hand): a dark wooden marionette control cross with red strings, one puppet hand dangling from them. Do NOT draw a clover or leaves (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/hexer/clover.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Unending Mark): a smoldering iron branding iron with a curse sigil end glowing violet. Do NOT draw a nail or a cracked disc (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/voidstrike.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Mark of Many): a bundle of five bone pins bound together with red thread. Do NOT draw a nail or a cracked disc (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/voidstrike.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Mark of Silence): a rolled parchment sealed with a dark wax seal bearing a violet glowing sigil. Do NOT draw a nail or a cracked disc (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/voidstrike.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/hexer/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged bone, dark weathered wood, dark wax with warm rim light, frayed red thread, sickly green and violet curse light) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Last Rite): a dark wooden grave cross wrapped in red thread, a violet glow at its center. Do NOT draw a nail or a cracked disc (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/hexer/voidstrike.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
