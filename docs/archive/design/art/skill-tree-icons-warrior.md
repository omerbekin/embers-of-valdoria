# Skill ağacı ikonları: Warrior (örnek set, Codex/ChatGPT promptları)

content-designer, 2026-10-23. Durum: **Ömer'in stil onayını bekliyor.** Onaydan sonra aynı kalıp diğer 10 class'a uygulanır.
Kaynak: `data/skill-trees/warrior.json` (düğüm adları/metinleri), `data/skill-trees/_rules.json > rowShape` (tür: `notable` = n0, ma, mb; `evolve` = v; ult kolunun 3. adımı notable sayılır), plan `docs/design/skill-tree-implementation.md` Faz 3c.
Üretim yolu: Codex CLI (`node tools/codex/imagegen.mjs`, `docs/arch/codex-imagegen.md`), art-pipeline kuralları `.claude/agents/art-pipeline.md`.
Stil kaynağı: `docs/design/icon-redraw-plan.md` 3.4 (Warrior skill ikonlarını üreten ortak blok; sonuçlar `assets/icons-v2/warrior/*.png`). Ağaç ikonları skill plakalarının yanında aynı aile gibi durmalı: boyalı, kalın koyu kontur, çelik + pirinç + kızıl, öfke = kızıl-turuncu kor ışığı. Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ, kan yok.

## 1. Envanter

| Tür | Adet | Düğümler |
|---|---|---|
| Notable (satır) | 12 | her satırda n0, ma, mb (4 satır) |
| Notable (ult kol sonu) | 4 | 4.u3, 4.r3, 4.d3, 4.l3 |
| Evolve | 4 | 0.v, 1.v, 2.v, 3.v |
| **Toplam** | **20 ikon** | |

Satırın skill motifi ikonda kalır (oyuncu hangi skill'e ait olduğunu görür): Berserker = çelik eldiven/öfke alevi, Double Strike = pirinç siperli uzun kılıç, Whirlwind = dönen kılıç izi, Charge = çelik omuzluk, Headsman's Blow = hilal ağızlı cellat baltası.
Evolve ikonları aynı stilde ama "daha büyük an": konu biraz daha görkemli, kenarda **ince altın kenar ışığı** (ağaçta evolve düğümü büyük altın). Notable'larda altın kenar ışığı YOK.

## 2. Üretim planı: ikon başına 1 görsel (sayfa yok)

- **Neden tek tek:** Codex'te sohbet başına 5 görsel sınırı yok; tek ikon daha iyi ortalanır, komşu hücreye taşma ve kesme işi olmaz, her işe stil referansı (`-i`) verilebilir. Sayfa (2x2) yalnızca görsel sayısını azaltır ama kesme + taşma riski getirir; burada gerek yok.
- **Stil referansı:** her ikona o satırın mevcut Warrior skill ikonu `-i` ile verilir (`assets/icons-v2/warrior/<ad>.png`); prompt "stili eşle, konuyu kopyalama" der. Böylece ağaç ikonları skill plakasıyla aynı aileden çıkar.
- **Sayı ve süre:** 20 görsel; ~2 dk/görsel, en fazla 2 paralel → ~20-25 dk.
- **Pilot:** önce yalnızca Charge satırı (4 görsel: 3 notable + 1 evolve; aşağıdaki pilot listesi). Önizleme (açık + koyu zemin, 128 ve 48 px, skill ikonlarının yanında) Ömer'e gider; onaydan sonra tam liste (hedef varsa atlandığı için pilot dosyaları yeniden üretilmez).
- **Ham çıktı scratch'e:** `C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/<id>.png` (repo dışında; `.codex.log` / `.last.txt` orada kalır). Kontrol (saydam alfa, dama deseni yok, koyu hale yok) sonrası asıl dosya `assets/source/tree-icons/warrior/<id>.png` olarak kopyalanır.
- **Oyun dosyası:** `assets/tree-icons/warrior/<id>.png` (128, saydam; `<id>` = düğüm id'si, nokta yerine alt çizgi, ör. `3_v`) + `.webp` (`node tools/webp-assets.mjs`). Kare 1024 kaynağı 128'e küçültme (alfa kutusu ölç, %5 pay, LANCZOS) `tools/make-class-icons.py` mantığıyla yapılır; tek dosya modu / bu klasör çıkışı ve ağaç ekranına bağlama **ui-dev işi** (bu belgenin kapsamı dışında, bölüm 7).

## 3. Ortak prompt bloğu

Her işin promptu = bu blok + ` Subject (<Ad>): <konu>` (+ evolve'da evolve cümlesi). Aşağıdaki JSON listelerinde hazır birleşik halde.

```
Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

Evolve cümlesi (yalnızca 4 evolve'un sonuna):

```
This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges.
```

## 4. Düğümler

### Berserker (pasif) satırı · ref `rage.png`

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 0.n0 | Notable | Iron Retort | Seni ilk %50 altına düşüren düşman 1 tur Stun yer. | a dented steel gauntlet punching forward to the right, a small ring of yellow-white stun stars around the knuckles. | `assets/tree-icons/warrior/0_n0.png` |
| 0.ma | Notable | Red Line | %50 üstüne taşacak şifa 2 turluk kalkana döner. | a battered steel heater shield crossed by one glowing crimson horizontal line, a soft warm green-gold glow sinking into the steel above the line. | `assets/tree-icons/warrior/0_ma.png` |
| 0.mb | Notable | Not Today | Savaşta bir kez öldürücü darbe seni 1 HP ile bırakır, 1 tur Fortified. | a deeply dented but unbroken steel breastplate with brass rivets, a single crimson ember glowing inside the crack. | `assets/tree-icons/warrior/0_mb.png` |
| 0.v | Evolve | Undying Rage | Berserker evolve: %25 altında kritik olmayan vuruş seni 1 HP altına indiremez; her kurtarma 10 Rage. | a scarred steel gauntlet raised and clenched into a fist, wrapped in a tall crimson-orange rage flame rising upward. + evolve cümlesi | `assets/tree-icons/warrior/0_v.png` |

### Double Strike satırı · ref `sword.png`

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 1.n0 | Notable | Gut Strike | İlk vuruş 2 tur Wound; ikinci vuruş Wounded hedefe +%8. | a steel longsword with a brass crossguard thrusting horizontally to the right, a short glowing crimson gash mark just past its tip. | `assets/tree-icons/warrior/1_n0.png` |
| 1.ma | Notable | Hobble | Slowed hedefte Slow 1 tur uzar, +%5 hasar. | a heavy iron ball and chain lying low, one crimson slash streak cutting across the chain. | `assets/tree-icons/warrior/1_ma.png` |
| 1.mb | Notable | Butcher's Carve | Hedefteki her Wound turu için her vuruş +%2. | a notched steel longsword blade pointing up diagonally, three glowing crimson notches along its cutting edge. | `assets/tree-icons/warrior/1_mb.png` |
| 1.v | Evolve | Skull and Knee | Double Strike evolve: ilk vuruş Slow, ikinci vuruş Slowed hedefi Stun; 2 tur cooldown. | a steel longsword striking pommel-first into a dented steel great helm, a ring of yellow-white stun stars above the helm. + evolve cümlesi | `assets/tree-icons/warrior/1_v.png` |

### Whirlwind satırı · ref `whirlwind.png`

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 2.n0 | Notable | Gore Wheel | Whirlwind vurduğu her düşmana 2 tur Wound. | a steel longsword spinning flat inside one bold circular motion swirl, three short glowing crimson gash streaks flung outward from the swirl. | `assets/tree-icons/warrior/2_n0.png` |
| 2.ma | Notable | Blood Glut | Max HP üstüne taşan Whirlwind şifası Rage olur. | a brass goblet overflowing with glowing crimson-orange ember light that spills over the rim like liquid fire. | `assets/tree-icons/warrior/2_ma.png` |
| 2.mb | Notable | Crimson Wheel | Vurulanlar arasındaki her Wounded düşman başına herkese +%4. | three steel longswords arranged in a ring with their points outward, spinning inside a thick crimson circular streak. | `assets/tree-icons/warrior/2_mb.png` |
| 2.v | Evolve | Exsanguinate | Whirlwind evolve: her hedefteki Wound açılıp biter; o vuruşta +%20 hasar ve iki kat lifesteal. | a steel longsword spinning flat at the center of a crimson-orange glowing spiral that curls inward into a bright hot core. + evolve cümlesi | `assets/tree-icons/warrior/2_v.png` |

### Charge satırı (PİLOT) · ref `charge.png`

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 3.n0 | Notable | Roaring Charge | Savaştaki ilk Charge Rage en az 30 yapar. | an open-faced steel helm in profile facing right, one bold crimson-orange roar shockwave arc bursting from its face opening. | `assets/tree-icons/warrior/3_n0.png` |
| 3.ma | Notable | Payback | Sana son vurana Charge +%20 hasar, yarısı kadar şifa. | a steel gauntlet gripping a broken spear shaft and shoving it back to the right, a few small wood splinters. | `assets/tree-icons/warrior/3_ma.png` |
| 3.mb | Notable | Into the Fire | Charge sonrası sıradaki Headsman's Blow 10 Rage ucuz. | a heavy steel shoulder pauldron with brass trim bursting to the right through a curtain of crimson-orange fire. | `assets/tree-icons/warrior/3_mb.png` |
| 3.v | Evolve | Herald of Ruin | Charge evolve: tutulan her Rage için +%1 güç (harcamadan); Stun bitince 10 Rage iade. | a heavy steel shoulder pauldron with brass trim charging to the right, crowned by a tall crimson-orange rage flame streaming backward, a small yellow-white impact star in front. + evolve cümlesi | `assets/tree-icons/warrior/3_v.png` |

### Headsman's Blow ult kol sonları (notable) · ref `warcry.png`

| Düğüm | Tür | Ad | Ne yapar | Konu (Subject) | Hedef |
|---|---|---|---|---|---|
| 4.u3 | Notable | Grave Robber | Headsman's Blow öldürürse max HP %12 şifa + 1 tur Fortified. | a two-handed headsman's axe with a wide crescent steel blade leaning against a steel heater shield, a soft warm green-gold healing glow around the shield. | `assets/tree-icons/warrior/4_u3.png` |
| 4.r3 | Notable | Mercy Stroke | Stunned hedefe ıskalamaz ve hep kritik; Stun biter. | a headsman's axe with a wide crescent steel blade coming down, one bright white-gold glint flashing on its cutting edge, a few fading yellow-white stun stars below it. | `assets/tree-icons/warrior/4_r3.png` |
| 4.d3 | Notable | Executioner's Calm | Headsman's Blow sonrası sıradaki turuna kadar debuff işlemez. | a black cloth executioner's hood with two eye holes, a calm pale steel-blue glow inside the eye holes. | `assets/tree-icons/warrior/4_d3.png` |
| 4.l3 | Notable | Terror | Headsman's Blow öldürürse tüm düşmanlar Jinxed. | a headsman's axe with a wide crescent steel blade held upright, a ring of dark violet dread smoke curling around its blade. | `assets/tree-icons/warrior/4_l3.png` |

## 5. Evolve hover animasyonu

### Öneri: yalnızca CSS (ek görsel YOK)
Statik evolve ikonu fare üstüne gelince (dokunmatikte seçilince) üç katmanla canlanır; hepsi `transform` / `opacity` / `filter` (telefonda akıcı), süre ve renkler `data/ui-motion.json` içinde:
1. **Kor nabzı:** ikonun arkasında yumuşak ışık (drop-shadow) 1,2 sn'de bir şişip söner + parlaklık 1,0 -> 1,12.
2. **Kor sürüklenmesi:** 3-4 küçük kor noktası (CSS öğesi) ikonun "sıcak yerinden" çıkıp süzülerek söner; döngü 1,6 sn, birbirinden kaydırmalı.
3. **Nefes:** ikon %2 büyüyüp küçülür (çok hafif).

| Evolve | Işık rengi | Korların çıkış yeri ve yönü | Ek |
|---|---|---|---|
| 0.v Undying Rage | kızıl-turuncu | yumruğun üstünden yukarı | alev hissi için nabız biraz hızlı (0,9 sn) |
| 1.v Skull and Knee | sarı-beyaz | miğferin üstünde küçük yay çizerek | kor yerine 3 küçük yıldız noktası, miğfer çevresinde yarım tur |
| 2.v Exsanguinate | kızıl-turuncu | dış kenardan merkeze (içe çekilme = lifesteal) | |
| 3.v Herald of Ruin | kızıl-turuncu | alevle birlikte geriye-yukarı (sol üst) | |

Neden bu: sıfır ek görsel, 44 evolve'un hepsine tek bileşenle uygulanır, ChatGPT karelerinin birbirini tutmama (titreme) riski yok, ikon küçük düğmede de net kalır.

### Alternatifler (Ömer CSS'i yavan bulursa)
- **B. Efekt katmanı:** her evolve için yalnızca alev/ışık içeren ayrı bir saydam görsel (ikonun üstüne biner, CSS ile titretilir/nabız). Maliyet: evolve başına +1 görsel (Warrior 4, 11 class 44).
- **C. Kare sayfası (4-8 kare):** gerçek oynayan animasyon. Maliyet: evolve başına 1 sayfa (44) + imagegen kareler arasında konuyu kaydırır, hizalama aracı gerekir. Önerilmez.

Plan belgesindeki "kare sayfası, biçim örnekle onaylanır" notu önce CSS örneğiyle denenir: ui-dev pilot evolve ikonunu (3.v) ağaç mockup'ına koyar, Ömer görür; beğenmezse B, sonra C.

## 6. Hazır Codex listeleri

Kullanım (repo kökü `game/` içinden): listeyi bir JSON dosyasına (scratch klasöre) kaydet, sonra
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`

### 6.1 Pilot (Charge satırı, 4 görsel)

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Roaring Charge): an open-faced steel helm in profile facing right, one bold crimson-orange roar shockwave arc bursting from its face opening.",
  "refs": [
   "assets/icons-v2/warrior/charge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Payback): a steel gauntlet gripping a broken spear shaft and shoving it back to the right, a few small wood splinters.",
  "refs": [
   "assets/icons-v2/warrior/charge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Into the Fire): a heavy steel shoulder pauldron with brass trim bursting to the right through a curtain of crimson-orange fire.",
  "refs": [
   "assets/icons-v2/warrior/charge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Herald of Ruin): a heavy steel shoulder pauldron with brass trim charging to the right, crowned by a tall crimson-orange rage flame streaming backward, a small yellow-white impact star in front. This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges.",
  "refs": [
   "assets/icons-v2/warrior/charge.png"
  ]
 }
]
```

### 6.2 Tam liste (20 görsel; pilot dosyaları zaten varsa atlanır)

```json
[
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/0_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Iron Retort): a dented steel gauntlet punching forward to the right, a small ring of yellow-white stun stars around the knuckles.",
  "refs": [
   "assets/icons-v2/warrior/rage.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/0_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Red Line): a battered steel heater shield crossed by one glowing crimson horizontal line, a soft warm green-gold glow sinking into the steel above the line.",
  "refs": [
   "assets/icons-v2/warrior/rage.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/0_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Not Today): a deeply dented but unbroken steel breastplate with brass rivets, a single crimson ember glowing inside the crack.",
  "refs": [
   "assets/icons-v2/warrior/rage.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/0_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Undying Rage): a scarred steel gauntlet raised and clenched into a fist, wrapped in a tall crimson-orange rage flame rising upward. This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges.",
  "refs": [
   "assets/icons-v2/warrior/rage.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/1_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Gut Strike): a steel longsword with a brass crossguard thrusting horizontally to the right, a short glowing crimson gash mark just past its tip.",
  "refs": [
   "assets/icons-v2/warrior/sword.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/1_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hobble): a heavy iron ball and chain lying low, one crimson slash streak cutting across the chain.",
  "refs": [
   "assets/icons-v2/warrior/sword.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/1_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Butcher's Carve): a notched steel longsword blade pointing up diagonally, three glowing crimson notches along its cutting edge.",
  "refs": [
   "assets/icons-v2/warrior/sword.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/1_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Skull and Knee): a steel longsword striking pommel-first into a dented steel great helm, a ring of yellow-white stun stars above the helm. This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges.",
  "refs": [
   "assets/icons-v2/warrior/sword.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/2_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Gore Wheel): a steel longsword spinning flat inside one bold circular motion swirl, three short glowing crimson gash streaks flung outward from the swirl.",
  "refs": [
   "assets/icons-v2/warrior/whirlwind.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/2_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Blood Glut): a brass goblet overflowing with glowing crimson-orange ember light that spills over the rim like liquid fire.",
  "refs": [
   "assets/icons-v2/warrior/whirlwind.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/2_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Crimson Wheel): three steel longswords arranged in a ring with their points outward, spinning inside a thick crimson circular streak.",
  "refs": [
   "assets/icons-v2/warrior/whirlwind.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/2_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Exsanguinate): a steel longsword spinning flat at the center of a crimson-orange glowing spiral that curls inward into a bright hot core. This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges.",
  "refs": [
   "assets/icons-v2/warrior/whirlwind.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/3_n0.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Roaring Charge): an open-faced steel helm in profile facing right, one bold crimson-orange roar shockwave arc bursting from its face opening.",
  "refs": [
   "assets/icons-v2/warrior/charge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/3_ma.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Payback): a steel gauntlet gripping a broken spear shaft and shoving it back to the right, a few small wood splinters.",
  "refs": [
   "assets/icons-v2/warrior/charge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/3_mb.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Into the Fire): a heavy steel shoulder pauldron with brass trim bursting to the right through a curtain of crimson-orange fire.",
  "refs": [
   "assets/icons-v2/warrior/charge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/3_v.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Herald of Ruin): a heavy steel shoulder pauldron with brass trim charging to the right, crowned by a tall crimson-orange rage flame streaming backward, a small yellow-white impact star in front. This is a grand evolution icon: slightly more heroic and imposing than a normal icon, with a thin warm gold rim light along its edges.",
  "refs": [
   "assets/icons-v2/warrior/charge.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/4_u3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Grave Robber): a two-handed headsman's axe with a wide crescent steel blade leaning against a steel heater shield, a soft warm green-gold healing glow around the shield.",
  "refs": [
   "assets/icons-v2/warrior/warcry.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/4_r3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Mercy Stroke): a headsman's axe with a wide crescent steel blade coming down, one bright white-gold glint flashing on its cutting edge, a few fading yellow-white stun stars below it.",
  "refs": [
   "assets/icons-v2/warrior/warcry.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/4_d3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Executioner's Calm): a black cloth executioner's hood with two eye holes, a calm pale steel-blue glow inside the eye holes.",
  "refs": [
   "assets/icons-v2/warrior/warcry.png"
  ]
 },
 {
  "out": "C:/Users/Omer/AppData/Local/Temp/claude/tree-icons/warrior/4_l3.png",
  "prompt": "Single game icon for a medieval fantasy turn-based RPG skill tree, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, polished steel, brass, crimson red and dark leather, rage shown as a crimson-orange ember glow) but do NOT copy its subject. ONE bold, clear subject, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or embers. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Terror): a headsman's axe with a wide crescent steel blade held upright, a ring of dark violet dread smoke curling around its blade.",
  "refs": [
   "assets/icons-v2/warrior/warcry.png"
  ]
 }
]
```

## 7. Açık noktalar (Ömer / ana oturum)
1. Stil onayı pilotla (özellikle evolve'daki altın kenar ışığı yeterince ayırt ediyor mu; Payback / Executioner's Calm konuları okunuyor mu).
2. Ağaç ikon klasörü (`assets/tree-icons/<class>/`), 1024 -> 128 küçültme (tek dosya modu) ve ağaç ekranına bağlama: ui-dev işi.
3. Evolve animasyonu: A (CSS) mı, B mi, C mi; pilot örnekle karar.
4. Toplam tahmin 11 class: ~220 görsel (class başına 20); B seçilirse +44.
