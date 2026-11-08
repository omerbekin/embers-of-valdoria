# Skill ağacı ikonları: Cutthroat (Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **üretime hazır.** Warrior örnek seti Ömer'den stil onayı aldı; bu belge aynı kalıbı Cutthroat'a uygular.
Şablon ve üretim kuralları: `docs/design/art/skill-tree-icons-warrior.md` (bölüm 2 üretim planı, 1024 -> 128 küçültme, oyun dosyası yolu, ui-dev bağlama işi aynen geçerli).
Kaynak: `data/skill-trees/cutthroat.json` (düğüm adları/metinleri; "Ne yapar" sütunu oradaki İngilizce metnin kısa Türkçesi), `data/skill-trees/_rules.json > rowShape`.
Stil kaynağı: `assets/icons-v2/cutthroat/*.png` (mevcut boyalı skill ikonları). Malzeme/palet: kömür grisi deri (kenar ışıklı), aşınmış çelik hançer, pas turuncusu bez sargı, hastalıklı yeşil zehir. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

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
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.
```

## 4. Düğümler

### Opportunist (pasif) satırı · ref `opportunist.png` · kaçın: kukuleta / yüz / maske

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Smell of Blood | Opportunist %40 can altındaki her düşmanı da sayar. | a lean hunting hound's head in profile sniffing to the right, a faint crimson scent wisp curling in front of its nose. | `assets/tree-icons/cutthroat/0_n0.png` |
| 0.ma | Notable | Bloodletter | Kritiklerin 2 tur Wound verir. | a small curved steel lancet with a bone handle, a bright crimson crit spark at its tip. | `assets/tree-icons/cutthroat/0_ma.png` |
| 0.mb | Notable | Turned Blade | Karşı vuruşun Blind saldırana kritik olur ve onu 1 tur daha Blind eder. | a steel parrying dagger with a wide basket guard angled to deflect, a bright orange spark where it parried. | `assets/tree-icons/cutthroat/0_mb.png` |
| 0.v | Evolve | Assassin's Instinct | Opportunist evolve: hedefin eksik canının her %2'si için +%1 (normal bonustan yüksekse). | a coiled viper rearing to strike, charcoal scales with a rust-orange belly and warm rim light, green venom on its fangs. + evolve cümlesi | `assets/tree-icons/cutthroat/0_v.png` |

### Venom Edge satırı · ref `venomedge.png` · kaçın: zehir damlatan kavisli hançer

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Coup de Grace | Venom Edge %30 altındaki hedefe hep kritik. | a chunky straight mercy dagger plunging point-down, a white-gold glint at its point. | `assets/tree-icons/cutthroat/1_n0.png` |
| 1.ma | Notable | Clean Kill | Venom Edge öldürürse 8 MP ve Backstab bekleme süresi -1. | a folded rust-orange cloth wiping a straight steel blade clean, the wiped part shining bright. | `assets/tree-icons/cutthroat/1_ma.png` |
| 1.mb | Notable | Carving Arc | Venom Edge'in ters vuruşu yandaki yeni düşmanlara geçer, en fazla 3 kesik. | three short bold orange-green slash marks stepping up to the right in a row, a small steel dagger at the end of the last one. | `assets/tree-icons/cutthroat/1_mb.png` |
| 1.v | Evolve | Red Smile | Venom Edge evolve (Red Smile): %50 altında iki kat ve hep kritik; üstünde 3 tur Wound. | a steel gorget (neck armor plate) cut cleanly across by one glowing crimson-orange line. + evolve cümlesi | `assets/tree-icons/cutthroat/1_v.png` |

### Saltire Cut satırı · ref `saltire.png` · kaçın: X şekli / çapraz bıçaklar

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Finishing Cross | Saltire Cut bir düşman öldürürse bekleme süresi sıfırlanır. | a brass hourglass flipped upside-down in mid-air, sand pouring, a small orange spark. | `assets/tree-icons/cutthroat/2_n0.png` |
| 2.ma | Notable | X Marks the Throat | İki merkez vuruşu da kritikse merkeze zırh yok sayan 3. vuruş. | an open steel helm knocked askew, three short orange-green cut marks across its cheek guard. | `assets/tree-icons/cutthroat/2_ma.png` |
| 2.mb | Notable | Endless Knives | Kritik olan her vuruş aynı hedefe %50'lik bir bıçak daha atar (en fazla 2). | a dark leather bandolier strap holding a row of five chunky throwing knives. | `assets/tree-icons/cutthroat/2_mb.png` |
| 2.v | Evolve | Butcher's Cross | Saltire Cut evolve (Butcher's Cross): X'teki her düşmana iki kez vurur; güç 0,45 -> 0,35. | a heavy steel butcher's cleaver with a dark wooden handle, two glowing green-and-orange cut streaks along its edge. + evolve cümlesi | `assets/tree-icons/cutthroat/2_v.png` |

### Smoke Bomb satırı · ref `smokebomb.png` · kaçın: yuvarlak bomba / duman bulutu

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Choking Cloud | Smoke Bomb düşmanları 1 tur Silence da eder. | a tall corked glass flask of thick yellow-green gas, its cork sealed with rust-orange wax. | `assets/tree-icons/cutthroat/3_n0.png` |
| 3.ma | Notable | Lost in Smoke | Iskalayan Blind düşman Stagger olur, sıradaki eylemini kaybeder. | a dagger stuck at an angle in a wooden post after a missed throw, a few small yellow-white daze stars. | `assets/tree-icons/cutthroat/3_ma.png` |
| 3.mb | Notable | Shrapnel Shell | Smoke Bomb kil parçalarına patlar: içindeki her düşmana %25 DEX hasar + 2 tur Wound. | jagged terracotta clay shards flying outward to the right from a burst point, a few small orange sparks. | `assets/tree-icons/cutthroat/3_mb.png` |
| 3.v | Evolve | Brimstone Jar | Smoke Bomb evolve (Brimstone Jar): içindekiler 2 tur Blind + Silence, 1 tur Slow. | a tall narrow terracotta jar with a wax-sealed neck and a lit rope fuse, sickly yellow brimstone fumes leaking from its cracks. + evolve cümlesi | `assets/tree-icons/cutthroat/3_v.png` |

### Backstab ult kol sonları (notable) · ref `backstab.png` · kaçın: bıçaklayan kukuletalı figür

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Shadow Return | Backstab sonrası sen ve yanındaki müttefikler 2 tur Shrouded + Fleet. | a charcoal-grey cloak with rust-orange lining flaring outward, empty, warm rim light, a faint grey mist trailing. | `assets/tree-icons/cutthroat/4_u3.png` |
| 4.r3 | Notable | Opening Act | Savaştaki ilk Backstab bekleme süresi başlatmaz. | a heavy wooden door standing ajar, a steel dagger slipping through the gap, warm orange light from the crack. | `assets/tree-icons/cutthroat/4_r3.png` |
| 4.d3 | Notable | Spine Splitter | Backstab %50 altındaki hedefte tüm zırhı yok sayar. | a chunky straight stiletto driven down through a steel backplate, a crack spreading from the hole. | `assets/tree-icons/cutthroat/4_d3.png` |
| 4.l3 | Notable | Death From Afar | Backstab hedefin arkasında boş hücre istemez ve hep tam hasar. | a chunky steel throwing dagger flying straight to the right with a long rust-orange motion streak. | `assets/tree-icons/cutthroat/4_l3.png` |

## 5. Evolve hover animasyonu

Ayrı görsel YOK: evolve animasyonu kodda hazır (CSS kor döngüsü, tüm class'lar için tek bileşen). Ayrıntı `docs/design/art/skill-tree-icons-warrior.md` bölüm 5.

## 6. Hazır Codex listesi (20 görsel)

Kullanım (repo kökü `game/` içinden): liste ayrıca `jobs-cutthroat.json` olarak scratch klasörde hazır; yoksa aşağıdakini bir JSON dosyasına kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Ham çıktı `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/<id>.png`; kontrol ve kopyalama Warrior belgesi bölüm 2'deki gibi (`assets/source/tree-icons/cutthroat/`, oyun dosyası `assets/tree-icons/cutthroat/<id>.png` + `.webp`).

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Smell of Blood): a lean hunting hound's head in profile sniffing to the right, a faint crimson scent wisp curling in front of its nose. Do NOT draw a hood, a face or a mask (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/opportunist.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Bloodletter): a small curved steel lancet with a bone handle, a bright crimson crit spark at its tip. Do NOT draw a hood, a face or a mask (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/opportunist.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Turned Blade): a steel parrying dagger with a wide basket guard angled to deflect, a bright orange spark where it parried. Do NOT draw a hood, a face or a mask (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/opportunist.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Assassin's Instinct): a coiled viper rearing to strike, charcoal scales with a rust-orange belly and warm rim light, green venom on its fangs. Do NOT draw a hood, a face or a mask (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/cutthroat/opportunist.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Coup de Grace): a chunky straight mercy dagger plunging point-down, a white-gold glint at its point. Do NOT draw a curved dagger dripping venom (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/venomedge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Clean Kill): a folded rust-orange cloth wiping a straight steel blade clean, the wiped part shining bright. Do NOT draw a curved dagger dripping venom (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/venomedge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Carving Arc): three short bold orange-green slash marks stepping up to the right in a row, a small steel dagger at the end of the last one. Do NOT draw a curved dagger dripping venom (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/venomedge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Red Smile): a steel gorget (neck armor plate) cut cleanly across by one glowing crimson-orange line. Do NOT draw a curved dagger dripping venom (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/cutthroat/venomedge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Finishing Cross): a brass hourglass flipped upside-down in mid-air, sand pouring, a small orange spark. Do NOT draw an X shape or crossed blades (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/saltire.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (X Marks the Throat): an open steel helm knocked askew, three short orange-green cut marks across its cheek guard. Do NOT draw an X shape or crossed blades (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/saltire.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Endless Knives): a dark leather bandolier strap holding a row of five chunky throwing knives. Do NOT draw an X shape or crossed blades (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/saltire.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Butcher's Cross): a heavy steel butcher's cleaver with a dark wooden handle, two glowing green-and-orange cut streaks along its edge. Do NOT draw an X shape or crossed blades (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/cutthroat/saltire.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Choking Cloud): a tall corked glass flask of thick yellow-green gas, its cork sealed with rust-orange wax. Do NOT draw a round bomb or a smoke cloud (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/smokebomb.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Lost in Smoke): a dagger stuck at an angle in a wooden post after a missed throw, a few small yellow-white daze stars. Do NOT draw a round bomb or a smoke cloud (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/smokebomb.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Shrapnel Shell): jagged terracotta clay shards flying outward to the right from a burst point, a few small orange sparks. Do NOT draw a round bomb or a smoke cloud (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/smokebomb.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Brimstone Jar): a tall narrow terracotta jar with a wax-sealed neck and a lit rope fuse, sickly yellow brimstone fumes leaking from its cracks. Do NOT draw a round bomb or a smoke cloud (that is the skill's own icon). This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges. It is a different subject from the reference icon, not the reference icon with extra fire or glow.",
  "refs": [
   "assets/icons-v2/cutthroat/smokebomb.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Shadow Return): a charcoal-grey cloak with rust-orange lining flaring outward, empty, warm rim light, a faint grey mist trailing. Do NOT draw a hooded figure stabbing (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/backstab.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Opening Act): a heavy wooden door standing ajar, a steel dagger slipping through the gap, warm orange light from the crack. Do NOT draw a hooded figure stabbing (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/backstab.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Spine Splitter): a chunky straight stiletto driven down through a steel backplate, a crack spreading from the hole. Do NOT draw a hooded figure stabbing (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/backstab.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/cutthroat/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, charcoal-grey leather with warm rim light, worn steel daggers, rust-orange cloth wraps, sickly green venom, small orange spark glints) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Chunky, thick, simple shapes that read clearly at 48 pixels; no thin delicate parts. No large pure-black areas: dark materials get a warm rim light so they read on a very dark background. Very little debris: at most a few small sparks or motes. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Death From Afar): a chunky steel throwing dagger flying straight to the right with a long rust-orange motion streak. Do NOT draw a hooded figure stabbing (that is the skill's own icon).",
  "refs": [
   "assets/icons-v2/cutthroat/backstab.png"
  ]
 }
]
```

## 7. Açık noktalar

1. Üretim sonrası önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; okunmayan konu tek tek yeniden üretilir.
2. Ağaç ikon klasörü, küçültme ve ağaç ekranına bağlama: ui-dev işi (Warrior belgesi bölüm 7 ile aynı).
