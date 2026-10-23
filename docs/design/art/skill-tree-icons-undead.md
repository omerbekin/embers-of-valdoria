# Skill ağacı ikonları: Undead (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Undead'e uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/undead.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/undead/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: eskimiş fildişi kemik, paslı koyu demir, hayaletimsi turkuaz ruh ateşi, koyu kızıl-mor tonlar. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Vampiric Bite (pasif) satırı · ref `soul.png` · kaçın: kafatası / diş

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Sanguine Thirst | %50 altındayken her turun ilk vuruşu Vampiric Bite ile iki kat emer. | a rusted iron goblet holding glowing dark crimson-purple wine. | `assets/tree-icons/undead/0_n0.png` |
| 0.ma | Notable | Undying Thirst | Savaşta bir kez öldürücü darbe 1 HP bırakır, sıradaki vuruşun hasarının %50'sini emer. | a cracked coffin lid sliding open, teal soul light spilling from the gap. | `assets/tree-icons/undead/0_ma.png` |
| 0.mb | Notable | Stolen Remedy | Wound'ladığın düşman iyileşince Wound'un engellediği kadar sen iyileşirsin. | a cracked glass healing vial of green liquid being drained by thin teal wisps. | `assets/tree-icons/undead/0_mb.png` |
| 0.v | Evolve | Crimson Tide | Vampiric Bite evolve (Crimson Tide): skill için can ödedikçe savaş sonuna kadar emme +%3 artar. | a bat with wings spread wide, dark crimson-purple fur with teal rim light. + evolve cümlesi | `assets/tree-icons/undead/0_v.png` |

### Bone Throw satırı · ref `bonethrow.png` · kaçın: uçan tek kemik

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Crippling Bone | Bone Throw Slow'u 2 yerine 3 tur. | a rusted iron bear trap snapped shut, a faint teal glow on its teeth. | `assets/tree-icons/undead/1_n0.png` |
| 1.ma | Notable | Grave Shackle | Bone Throw %50 altındaki Slow'lu hedefi 1 tur Stun eder (düşman başına savaşta bir kez). | a pair of rusted iron manacles on a short chain, a few yellow-white stun stars. | `assets/tree-icons/undead/1_ma.png` |
| 1.mb | Notable | Jaw Breaker | Silence'lı hedefe Bone Throw Jinx de verir. | a cracked ivory jawbone broken in two. | `assets/tree-icons/undead/1_mb.png` |
| 1.v | Evolve | Femur Chain | Bone Throw evolve (Femur Chain): hedefe ve arkasındakine vurur, ikisini 3 tur Slow eder. | two big ivory bones linked by a rusted iron chain, swinging like a flail with a teal trail. + evolve cümlesi | `assets/tree-icons/undead/1_v.png` |

### Wail of the Dead satırı · ref `wail.png` · kaçın: yüz / hayalet kafası / çığlık atan ağız

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Scream of Need | %50 altındayken Wail of the Dead +%15 hasar. | a cracked rusted iron bell with a teal glow inside its mouth. | `assets/tree-icons/undead/2_n0.png` |
| 2.ma | Notable | Blood Banshee | Wail ödediği canın %25'i kadar ek karanlık hasarı her vurduğuna verir. | a tattered floating grey-purple burial shroud, empty, with a teal glow along its folds. | `assets/tree-icons/undead/2_ma.png` |
| 2.mb | Notable | Gorging Howl | Wail 3+ düşmana vurursa can bedelini tamamen iade eder. | a war horn carved from a large ivory bone, teal wisps flowing back into its mouth. | `assets/tree-icons/undead/2_mb.png` |
| 2.v | Evolve | Banshee's Toll | Wail evolve (Banshee's Toll): sahadaki her düşmana vurur, mevcut canın %30'u bedel, iki kat emer. | a tall rusted iron gothic lantern with a teal soul flame burning inside. + evolve cümlesi | `assets/tree-icons/undead/2_v.png` |

### Dark Bond satırı · ref `darkbond.png` · kaçın: kalp / zincir

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Lifeline | Bağlı müttefik %30 altına düşünce sıradaki vuruşun iki kat emer ve tamamını ona yollar. | an ivory rib cage holding a glowing teal soul flame inside. | `assets/tree-icons/undead/3_n0.png` |
| 3.ma | Notable | Blood Ransom | Savaşta bir kez bağlı müttefike gelen öldürücü darbe sana yönlenir. | a rusted iron key with a bone bow and a dark crimson-purple tassel. | `assets/tree-icons/undead/3_ma.png` |
| 3.mb | Notable | Blood Oath | Bağlıyken müttefikine gelen hasarın %15'ini sen alırsın. | a rusted iron dagger stabbed through a parchment oath with a dark crimson-purple wax seal. | `assets/tree-icons/undead/3_mb.png` |
| 3.v | Evolve | Crimson Covenant | Dark Bond evolve (Crimson Covenant): 3 turda bitmez; biriniz düşene ya da başkasını bağlayana kadar sürer. | a thick dark purple tome bound in rusted iron with a teal glowing clasp. + evolve cümlesi | `assets/tree-icons/undead/3_v.png` |

### Raise Dead ult kol sonları (notable) · ref `raise.png` · kaçın: el / toprak mezar

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Grave Grasp | İskeletin ilk saldırısı hedefini 1 tur Stun eder. | a rusted iron mace with a bone handle, a few yellow-white stun stars. | `assets/tree-icons/undead/4_u3.png` |
| 4.r3 | Notable | Rot Bomb | Pox Bloom, zeminindeki düşmanlardaki tüm Wither'ı da patlatır. | a bloated green-purple pox flower bursting with spores. | `assets/tree-icons/undead/4_r3.png` |
| 4.d3 | Notable | Tomb Knight | Beslenmiş iskeletin Bone Slash'i bekleme süresi istemez. | a rusted iron great helm with a teal glowing eye slit and a crown of small bones. | `assets/tree-icons/undead/4_d3.png` |
| 4.l3 | Notable | Bone Champion | İskelet öldürülene kadar yaşar ama Raise Dead bekleme süresi 5 -> 7. | a rusted bone-hilted greatsword planted point-down, a teal soul flame burning on its crossguard. | `assets/tree-icons/undead/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-undead.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/undead/`, oyun dosyası `assets/tree-icons/undead/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sanguine Thirst): a rusted iron goblet holding glowing dark crimson-purple wine. Do NOT draw a skull or fangs (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/soul.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Undying Thirst): a cracked coffin lid sliding open, teal soul light spilling from the gap. Do NOT draw a skull or fangs (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/soul.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Stolen Remedy): a cracked glass healing vial of green liquid being drained by thin teal wisps. Do NOT draw a skull or fangs (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/soul.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Crimson Tide): a bat with wings spread wide, dark crimson-purple fur with teal rim light. Do NOT draw a skull or fangs (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/undead/soul.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Crippling Bone): a rusted iron bear trap snapped shut, a faint teal glow on its teeth. Do NOT draw a single flying bone (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/bonethrow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Grave Shackle): a pair of rusted iron manacles on a short chain, a few yellow-white stun stars. Do NOT draw a single flying bone (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/bonethrow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Jaw Breaker): a cracked ivory jawbone broken in two. Do NOT draw a single flying bone (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/bonethrow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Femur Chain): two big ivory bones linked by a rusted iron chain, swinging like a flail with a teal trail. Do NOT draw a single flying bone (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/undead/bonethrow.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Scream of Need): a cracked rusted iron bell with a teal glow inside its mouth. Do NOT draw a face, a ghost head or a screaming mouth (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/wail.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Blood Banshee): a tattered floating grey-purple burial shroud, empty, with a teal glow along its folds. Do NOT draw a face, a ghost head or a screaming mouth (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/wail.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Gorging Howl): a war horn carved from a large ivory bone, teal wisps flowing back into its mouth. Do NOT draw a face, a ghost head or a screaming mouth (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/wail.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Banshee's Toll): a tall rusted iron gothic lantern with a teal soul flame burning inside. Do NOT draw a face, a ghost head or a screaming mouth (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/undead/wail.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Lifeline): an ivory rib cage holding a glowing teal soul flame inside. Do NOT draw hearts or chains (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/darkbond.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Blood Ransom): a rusted iron key with a bone bow and a dark crimson-purple tassel. Do NOT draw hearts or chains (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/darkbond.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Blood Oath): a rusted iron dagger stabbed through a parchment oath with a dark crimson-purple wax seal. Do NOT draw hearts or chains (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/darkbond.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Crimson Covenant): a thick dark purple tome bound in rusted iron with a teal glowing clasp. Do NOT draw hearts or chains (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/undead/darkbond.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Grave Grasp): a rusted iron mace with a bone handle, a few yellow-white stun stars. Do NOT draw a hand, or a grave of soil (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/raise.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Rot Bomb): a bloated green-purple pox flower bursting with spores. Do NOT draw a hand, or a grave of soil (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/raise.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Tomb Knight): a rusted iron great helm with a teal glowing eye slit and a crown of small bones. Do NOT draw a hand, or a grave of soil (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/raise.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/undead/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, aged ivory bone, rusted dark iron, ghostly teal-cyan soul fire, dark crimson-purple tones) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Bone Champion): a rusted bone-hilted greatsword planted point-down, a teal soul flame burning on its crossguard. Do NOT draw a hand, or a grave of soil (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/undead/raise.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
