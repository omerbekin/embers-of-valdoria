# Sınıf ikonlarının ChatGPT ile yeniden çizimi: üretim planı (content-designer, 2026-10-18)

Ömer'in isteği: "mevcut classların iconlarını komple chatgptye çizdirelim. hem skill hem karakter. warriorun da ultisi değişmişti. buna da yeni bir ulti iconu tasarlattır."
Stil kuralı (Ömer): sade; TEK, kalın, net konu; az kırıntı/parçacık (yoğun ile çok sade arası); boyalı; oyunun medieval görünümüne uygun; saydam (ya da düz) zemin.

Bu belge art-pipeline agent'ı içindir: tasarım kararı vermez, aşağıdaki promptları sırayla ChatGPT'ye verir. Açıklamalar Türkçe, promptlar İngilizce.
Kurallar `.claude/agents/art-pipeline.md` (tek agent, sohbet başına en fazla 5 görsel, uyarıda 2-3 dk bekleme, normal tıklama, engelde dur).

## 1. Envanter

### 1.1 Oynanabilir sınıflar (11)
`data/classes/` içinde oynanabilir 11 sınıf var: Warrior, Defender, Paladin, Archer, Mage, Druid, Undead, Hexer, Anti-Mage, Gambler, Cutthroat.
Kapsam dışı: `aoe_tester` (Geometer, gizli test sınıfı) ve `pose_tester_1..11` (debug).

Her sınıfta 4 skill (4. yuva = ultimate) + 1 pasif + 1 sınıf amblemi = **6 ikon**. Toplam **66 ikon** (44 skill, bunların 11'i ultimate; 11 pasif; 11 amblem).

| Sınıf | Skill 1 | Skill 2 | Skill 3 | Ultimate (4) | Pasif | Amblem (logo) |
|---|---|---|---|---|---|---|
| Warrior | Double Strike `sword` | Whirlwind `whirlwind` | Charge `charge` | **Headsman's Blow `warcry` (YER TUTUCU)** | Berserker `rage` | `helm` |
| Defender | Tremor Slam `tremor2` | Taunt `taunt2` | Guard `guard2` | Fist Crush `fistcrush2` | Bulwark Aura `aura` | `bulwark` |
| Paladin | Holy Strike `judgehammer` | Resurrection `ankh` | Judgment `judgebeam` | Radiance `radiance` | Divine Light `divine` | `holy` |
| Archer | Quick Shot `arrow` | Piercing Arrow `pierce` | Arrow Rain `arrows` | Aimed Shot `aimedshot` | Sharpshooter `sharp` | `bow` |
| Mage | Fire Bolt `fireball` | Blizzard `blizzard` | Mana Barrier `manabarrier` | Meteor `meteor` | Spell Echo `echo` | `wizhat` |
| Druid | Thorn Whip `thornwhip` | Nature's Wrath `roots` | Rejuvenate `rejuvenate` | Summon Treant `treant` | Verdant Blessing `leaves` | `leaf` |
| Undead | Bone Throw `bonethrow` | Wail of the Dead `wail` | Dark Bond `darkbond` | Raise Dead `raise` | Vampiric Bite `soul` | `skull` |
| Hexer | Evil Eye `eye` | Withering Curse `drainfield` | Jinx `clover` | Doom Mark `voidstrike` | Ill Omen `soul` | `rune` |
| Anti-Mage | Mana Steal `manaburn` | Drain Field `drainfield` | Spell Ward `spellward` | Void Strike `voidstrike` | Mana Overflow `overflow` | `nullsphere` |
| Gambler | Loaded Dice `loadeddice` | High Stakes `highstakes` | Card Trick `cardtrick` | All In `allin` | Double or Nothing `doubleornothing` | `gamblerlogo` |
| Cutthroat | Venom Edge `venomedge` | Saltire Cut `saltire` | Smoke Bomb `smokebomb` | Backstab `backstab` | Opportunist `opportunist` | `cutthroatlogo` |

Ters tırnaktaki ad = verideki ikon adı (`skill.icon` / `passive.icon` / `logo`); dosya adları bunu kullanır. Aynı ad iki sınıfta geçse de (`soul`: Undead + Hexer; `drainfield`, `voidstrike`: Hexer + Anti-Mage) her sınıfın kendi klasörü olduğu için ayrı çizimdir.

**Bugünkü durum:** Defender'ın 5 skill/pasif ikonu zaten ChatGPT resmi (koyu zeminli, karakterli sahne; `assets/icons-v2/defender`). Diğer 9 sınıfın v2 ikonları kodla çizilmiş piksel ikon; Cutthroat'ın v2'si yok (yalnızca v1). 11 amblem 2026-10-10'da ChatGPT'ye çizdirildi (`assets/source/misc-icons/class-node-sheet.png`).

**Çağrı (summon) ikonları (isteğe bağlı, varsayılan plana DAHİL DEĞİL):** Treant'ın Root Smash `rootsmash`, Vine Snare `vinesnare`; Skeleton'un Bone Strike `bone`, Bone Slash `boneslash`. Treant ve Skeleton'un logoları sahibinin `treant` / `skull` ikonudur (ayrı çizim gerekmez). Ömer isterse bölüm 5'teki ek sayfa.

### 1.2 "Karakter ikonu" nedir?
Oyunda karakteri temsil eden iki ayrı görsel var:

| Aday | Ne | Nerede görünür | Bugün |
|---|---|---|---|
| **A. Sınıf amblemi (class logo)** | sınıfı anlatan arma/nesne ikonu (ör. Warrior: çapraz kılıç + kalkan) | takım seçimi bilgi kartı, savaş HUD'ı, Codex/Wiki küçük ikonlar ve filtre çipleri, avatar yoksa portre yerine | ChatGPT resmi, `assets/misc-icons/class/<id>.png` (+ `small/`) |
| **B. Avatar (portre)** | karakterin yüzü/başı, savaş çizimindeki kişinin kendisi | sıra çubuğu, sol alt birim kartı, takım seçimi yuvaları, "Start battle?" kartı, Codex portresi | savaş çiziminden kesilmiş 256x256 baş (`assets/avatars/<id>.png`, `import-characters-v2.py`) |

**Öneri: Ömer A'yı (sınıf amblemi) kastediyor.** Gerekçe: "skill ve karakter ikonları" bir ikon takımı olarak söylendi; amblem skill ikonlarıyla aynı stilde, aynı sayfada çizilebilen tek "karakter ikonu". Avatar ise savaştaki çizimin yüzü: ayrı çizilirse savaştaki karakterle yüz/renk tutmayabilir; değişecekse karakter çiziminin kendisi yeniden çizilmeli (çok daha büyük iş). Bu yüzden plan amblemi her sınıf sayfasının 6. hücresine koyar. Ömer avatarı (B) kastediyorsa bölüm 6'daki seçenek uygulanır (pilot onayından önce sorulmalı).

## 2. Warrior ultimate: Headsman's Blow ikon tasarımı
Skill: tek hedef yakın dövüş; Warrior BÜTÜN Rage'ini (en az 30) tek dev balta darbesine harcar, hasar harcanan Rage ve hedefin eksik canıyla büyür (bitirici). Sınıf kimliği (`docs/design/classes.md`): "iki elli baltayla dalan, kanla beslenen gözü kara savaşçı". Sesleri de balta (axeSwing, axeChop).

**Konsept (öneri A): cellat baltası, tek ağır iniş.** İri, hilal ağızlı iki elli cellat baltası (çelik ağız, koyu demir sırt, deri sarılı meşe sap) yukarıdan aşağı TEK büyük çapraz darbeyle iniyor; ağız boyunca kızıl-turuncu öfke (Rage) parıltısı, arkasında tek kalın hareket yayı; ağız alttaki çentikli meşe kütüğe gömülüyor, birkaç küçük talaş. Kan YOK. Okunuş: "bir kerede bitiren ağır balta". Kızıl parıltı = biriktirilmiş Rage'in harcanması.

**Seçenek B (Ömer isterse):** Warrior'ın savaş çizimindeki uzun kılıç (pirinç siperli) aynı ağır inişle. Çizimle uyumlu ama "Headsman" (cellat) adı ve balta sesleriyle daha zayıf okunur.

Not: veride ikonun adı hâlâ `warcry` (eski Abyssal Cry'ın adı). İçe aktarma bu adla yapılır (veri değişmez); istenirse bağlama işinde ad `headsman` yapılabilir (soru 4).

## 3. Sayfa düzeni ve içe aktarma

### 3.1 Bir görsel = bir sınıf
- ChatGPT görseli: **1536x1024 yatay**, görünmez **3 sütun x 2 satır** ızgara, hücre **512x512**.
- Hücre sırası (soldan sağa, üst satır önce): **1 = Skill 1, 2 = Skill 2, 3 = Skill 3, 4 = Ultimate, 5 = Pasif, 6 = Sınıf amblemi.**
- Ham dosya: `assets/source/class-icons/<sınıf id>-sheet.png` (ör. `warrior-sheet.png`, `antimage-sheet.png`). Yeniden üretimde önceki dosya `<id>-sheet-old.png` olarak kalır.
- Zemin: gerçek saydam (her prompttaki standart cümle). Dama deseni ya da koyu hale varsa İÇE AKTARMA, yeniden üret (`art-pipeline.md`).

### 3.2 Kesme ve bağlama (henüz araç YOK)
`tools/import-v2-icons.mjs` yalnızca hazır 128x128 tek dosyaları kopyalar; sayfa kesen sınıf ikonu aracı yok. Pilot sayfa onaylandıktan sonra (art-pipeline'dan önce) şu iş ui-dev'e verilir (Sonnet uygundur, kritik değil):
1. **Kesici araç** `tools/make-class-icons.mjs` (öneri; `make-misc-icons.mjs` / `import-mob-art.mjs icons` örnek): `assets/source/class-icons/<id>-sheet.png` 3x2 kesilir; her hücrede alfa kutusu ölçülür, %5 payla kare 128'e (lanczos) sığdırılır.
   - Hücre 1-5 -> `assets/icons-v2/<id>/<ikon adı>.png` (128); webp kopyası (`webp-assets.mjs`) kendiliğinden.
   - Hücre 6 (amblem) -> `assets/misc-icons/class/<id>.png` (128) + `small/<id>.png` (64).
   - DİKKAT: `make-misc-icons.mjs` yeniden çalışırsa eski amblemleri geri yazar; yeni araç ondan sonra çalışmalı ya da misc aracı `class` hücrelerini atlamalı.
2. **Bağlama:** her sınıfın `src/game/art-v2/<id>/icons.ts > ICONS` içine `<ad>: { image: '<id>/<ad>' }` (Defender'daki gibi). Kodla çizilmiş v2 ikonlar kendiliğinden Legacy'ye düşer.
   - Cutthroat'ın art-v2 klasörü yok (v2 kapsam dışı): bağlamak için kayıt dosyasına satır gerekir (soru 3).
   - Küçük düğmede görsel ikonlar NEAREST çizilir; boyalı resim 36-60 px'te tırtıklı görünebilir. Sefer mob ikonları yumuşak ölçekleniyor; ui-dev aynısını sınıf ikonlarına da açmalı mı bakmalı (soru 6).
3. Testler: `tests/asset-versions.test.ts`, `tests/misc-icons.test.ts`, `tests/wiki-assets.test.ts`, `tests/webp-assets.test.ts`; `npm run build`.

### 3.3 Sohbet planı (sohbet başına en fazla 5 görsel)
- **Sohbet 1:** Warrior (PİLOT) tek görsel. Önizleme (açık + koyu zemin, 128 ve 48 px) -> ana oturum Ömer'e gösterir -> **Ömer onaylamadan diğer sınıflara GEÇME.** Stil değişirse ortak blok burada düzeltilir.
- **Sohbet 2:** Paladin, Archer, Mage, Druid, Undead.
- **Sohbet 3:** Hexer, Anti-Mage, Gambler, Defender, Cutthroat (son ikisi sorulara bağlı; soru 2 ve 3).
- (İsteğe bağlı) Sohbet 4: çağrı sayfası (bölüm 5), avatar seçeneği (bölüm 6).

### 3.4 Ortak prompt bloğu (her sınıf promptunun başında AYNEN)
Aşağıdaki sınıf promptları bu bloğu zaten içerir; ayrıca eklemeye gerek yok. Stil Ömer'in pilot geri bildirimiyle değişirse hepsinde aynı biçimde güncellenir.

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

## 4. Sınıf promptları

### 4.1 Warrior (PİLOT)
Görünüm: sakallı, başı açık savaşçı; pirinç kenarlı çelik levha zırh, kızıl atkı ve yırtık kızıl etek; iki elli silah; kan değil öfke (kızıl-turuncu kor).

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Double Strike | `icons-v2/warrior/sword.png` | uzun kılıç + arkasında X biçimli iki kesik (iki vuruş) |
| 2 | Whirlwind | `icons-v2/warrior/whirlwind.png` | yatay dönen kılıç + tek kalın dönme izi (ön sırayı süpürür) |
| 3 | Charge | `icons-v2/warrior/charge.png` | öne atılan omuzluk, arkada savrulan kızıl atkı, önde küçük çarpma yıldızı (Stun) |
| 4 | Headsman's Blow | `icons-v2/warrior/warcry.png` | bölüm 2, öneri A: cellat baltası kızıl öfkeyle kütüğe iner |
| 5 | Berserker | `icons-v2/warrior/rage.png` | çizik, ezik çelik eldivenli yumruk, kızıl öfke alevi sarar (yaralandıkça güçlenir) |
| 6 | Amblem | `misc-icons/class/warrior.png` | yuvarlak kızıl-çelik arma önünde dik iki elli kılıç |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: WARRIOR, a berserker in steel plate armor with brass trims and a crimson scarf, fighting with heavy two-handed weapons. Colors: polished steel, brass, crimson red, dark leather; rage is shown as a crimson-orange ember glow.
Cells, left to right, top row first:
1) Double Strike: a steel two-handed longsword with a brass crossguard, pointing up diagonally, two crossing crimson slash streaks behind it forming an X.
2) Whirlwind: a steel longsword spinning flat, seen slightly from above, wrapped in one bold circular steel-grey motion swirl.
3) Charge: a heavy steel shoulder pauldron barging forward to the right, a crimson scarf streaming behind it, a small yellow-white impact star in front.
4) Headsman's Blow: a massive two-handed headsman's axe with a wide crescent steel blade, dark iron back and leather-wrapped oak haft, coming down in one heavy diagonal chop; a crimson-orange rage glow runs along the cutting edge with one thick motion arc behind it; the blade bites into a notched oak chopping block at the bottom, a few small wood chips.
5) Berserker: a scarred, dented steel gauntlet clenched into a fist, wrapped in a crimson-orange rage flame.
6) Class emblem: an upright two-handed longsword with a brass crossguard in front of a round crimson and steel heraldic roundel with a brass rim.
```

### 4.2 Paladin
Görünüm: kapalı büyük miğfer, pirinç kenarlı çelik zırh, kızıl tabar üstünde krem haç, kızıl kite kalkan, haç işlemeli savaş çekici; kutsal ışık altın-krem.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Holy Strike | `icons-v2/paladin/judgehammer.png` | haç işlemeli savaş çekici, başında altın ışık patlaması |
| 2 | Resurrection | `icons-v2/paladin/ankh.png` | iki altın kanadın yukarı kaldırdığı parlayan krem haç |
| 3 | Judgment | `icons-v2/paladin/judgebeam.png` | gökten inen altın huzme, altında artı biçimli kutsal ateş |
| 4 | Radiance | `icons-v2/paladin/radiance.png` | uzun-kısa ışınlı altın güneş, ortada krem haç |
| 5 | Divine Light | `icons-v2/paladin/divine.png` | yukarıdan açık çelik avuca inen sıcak ışık huzmesi (her tur şifa) |
| 6 | Amblem | `misc-icons/class/paladin.png` | krem haçlı kızıl kite kalkan |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: PALADIN, a holy knight in a closed great helm and steel plate with brass trims, crimson tabard with a cream cross pattee, a crimson kite shield and a block-headed warhammer. Colors: steel, brass, crimson, cream; holy light is warm gold and cream.
Cells, left to right, top row first:
1) Holy Strike: a steel warhammer with a square block head engraved with a cream cross, swinging down, a burst of golden holy light at the hammer head.
2) Resurrection: a glowing cream cross lifted upward by a pair of golden feathered wings.
3) Judgment: a narrow beam of golden light striking down from above onto a small plus-shaped patch of golden holy fire.
4) Radiance: a radiant golden sun with alternating long and short rays and a white-hot core, a cream cross pattee at its center.
5) Divine Light: a soft shaft of warm golden light falling from above into an open, upturned steel gauntlet.
6) Class emblem: a crimson kite shield with a cream cross pattee, steel rim and brass rivets.
```

### 4.3 Archer
Görünüm: yeşil kukuletalı korucu, sade ahşap uzun yay (pirinç kavrama), beyaz-kahve tüylü oklar, deri; büyü ışığı yok, gerçek malzeme.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Quick Shot | `icons-v2/archer/arrow.png` | sağa hızla uçan tek ok + kısa hız çizgileri |
| 2 | Piercing Arrow | `icons-v2/archer/pierce.png` | iki ince tahtayı arka arkaya delip geçen uzun uçlu ok |
| 3 | Arrow Rain | `icons-v2/archer/arrows.png` | gökten çapraz düşen beş oklu yaylım |
| 4 | Aimed Shot | `icons-v2/archer/aimedshot.png` | sonuna kadar gerilmiş yay ve oku, uçta küçük parıltı |
| 5 | Sharpshooter | `icons-v2/archer/sharp.png` | saman nişan tahtasının tam ortasına saplanmış ok |
| 6 | Amblem | `misc-icons/class/archer.png` | okla dolu deri sadak + çapraz uzun yay |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: ARCHER, a green-hooded ranger with a plain wooden longbow with a brass grip ring and arrows with white and brown feather fletching. No magic: real wood, steel arrowheads, feathers, leather. Colors: forest green, oak brown, steel, cream feathers.
Cells, left to right, top row first:
1) Quick Shot: a single arrow flying fast to the right, white and brown fletching, a few short speed lines behind it.
2) Piercing Arrow: one arrow with a long narrow steel bodkin head passing straight through two thin wooden boards placed one behind the other.
3) Arrow Rain: a volley of five arrows falling diagonally from the top, tips pointing down.
4) Aimed Shot: a wooden longbow drawn to full tension with a nocked arrow aimed to the right, a tiny bright glint on the steel arrowhead.
5) Sharpshooter: one arrow stuck dead center in a round straw archery target with red and cream rings.
6) Class emblem: a leather quiver full of white and brown fletched arrows crossed with a wooden longbow.
```

### 4.4 Mage
Görünüm: koyu mavi cübbe + altın işleme, mavi kristalli bükülmüş ahşap asa, avuçta mavi alev, büyü kitabı; ateşin çekirdeği mavi-beyaz.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Fire Bolt | `icons-v2/mage/fireball.png` | sağa uçan ateş topu, mavi-beyaz çekirdek, turuncu kuyruk |
| 2 | Blizzard | `icons-v2/mage/blizzard.png` | sivri buz parçaları taşıyan dönen tipi |
| 3 | Mana Barrier | `icons-v2/mage/manabarrier.png` | ince altın rün halkalı yarı saydam mavi kalkan küresi |
| 4 | Meteor | `icons-v2/mage/meteor.png` | erimiş çatlaklı, uzun alev kuyruklu düşen kaya |
| 5 | Spell Echo | `icons-v2/mage/echo.png` | açık büyü kitabından yükselen iki üst üste mavi alev (ikincisi soluk) |
| 6 | Amblem | `misc-icons/class/mage.png` | tepesinde mavi kristal ve küçük mavi alev olan bükülmüş asa |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: MAGE, a scholar elementalist in a dark blue robe with gold embroidery, a twisted wooden staff with a blue crystal, a blue flame in his palm and a leather spellbook. Colors: deep blue, gold, warm wood; his fire has a blue-white core.
Cells, left to right, top row first:
1) Fire Bolt: a fireball flying to the right with a blue-white hot core and an orange flame tail.
2) Blizzard: a whirling gust of icy wind carrying a few jagged blue-white ice shards.
3) Mana Barrier: a translucent blue magic bubble shield with a thin golden rune circle around it.
4) Meteor: a large burning rock with glowing molten cracks falling diagonally from top right to bottom left, a long fire tail.
5) Spell Echo: an open leather spellbook with two overlapping blue flames rising from its pages, the second flame fainter like an echo.
6) Class emblem: a twisted wooden staff topped with a blue crystal and a small blue flame.
```

### 4.5 Druid
Görünüm: yeşil kukuletalı, kürk yakalı yaşlı druid; budaklı meşe asa (tepede turuncu meyve), sarmaşık, altın broş, avuçta yeşil ışıyan yaprak. Dil: meşe yaprağı, kabuk, kök, yosun, kehribar ışık.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Thorn Whip | `icons-v2/druid/thornwhip.png` | S biçiminde şaklayan dikenli sarmaşık kırbaç |
| 2 | Nature's Wrath | `icons-v2/druid/roots.png` | çatlak topraktan fırlayan kalın budaklı kökler |
| 3 | Rejuvenate | `icons-v2/druid/rejuvenate.png` | iki taze yapraklı filiz, yumuşak yeşil ışık |
| 4 | Summon Treant | `icons-v2/druid/treant.png` | kehribar gözlü, yosunlu meşe ruhunun (Treant) yüzü; Treant'ın logosu da bu |
| 5 | Verdant Blessing | `icons-v2/druid/leaves.png` | altın damarlı üç meşe yaprağı + palamut |
| 6 | Amblem | `misc-icons/class/druid.png` | ortasında yeşil taş olan, sarmaşık sarılı geyik boynuzları |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: DRUID, an old green-hooded druid with a fur collar and a gnarled oak staff wrapped in ivy, nature magic of oak leaves, bark, roots, moss and warm amber light. Colors: moss green, oak brown, amber, a little gold.
Cells, left to right, top row first:
1) Thorn Whip: a green thorny vine whip lashing in an S-curve, sharp brown thorns along it.
2) Nature's Wrath: thick gnarled oak roots bursting up out of a small patch of cracked earth.
3) Rejuvenate: a young green sprout with two fresh leaves, soft green light around it, two or three tiny pollen motes.
4) Summon Treant: the face of a mossy oak tree spirit with glowing amber eyes, a bark face and a crown of oak leaves.
5) Verdant Blessing: three lobed oak leaves with golden veins and one acorn.
6) Class emblem: a pair of stag antlers wrapped in ivy around a small green gem.
```

### 4.6 Undead
Görünüm: kukuletalı lich; mor + kömür grisi yırtık cübbe, kafatası, turkuaz yanan gözler, avuçta turkuaz ruh ateşi. Dil: turkuaz ruh ateşi + mezar moru + kemik.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Bone Throw | `icons-v2/undead/bonethrow.png` | turkuaz iz bırakarak dönen atılmış uyluk kemiği (Slow) |
| 2 | Wail of the Dead | `icons-v2/undead/wail.png` | ağzı açık çığlık atan turkuaz dumandan ruh |
| 3 | Dark Bond | `icons-v2/undead/darkbond.png` | kemik halkalı zincirle bağlı iki koyu mor kalp |
| 4 | Raise Dead | `icons-v2/undead/raise.png` | mezar toprağından turkuaz ışıkla çıkan iskelet eli |
| 5 | Vampiric Bite | `icons-v2/undead/soul.png` | sivri dişli kafatası çenesi bir turkuaz ruh alevini ısırır (can çalma) |
| 6 | Amblem | `misc-icons/class/undead.png` | turkuaz gözlü kukuletalı lich kafatası |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: UNDEAD, a hooded lich in ragged purple and charcoal robes, a bone skull face with burning turquoise eyes and turquoise soul fire. Colors: old bone, grave purple, charcoal, turquoise soul flame.
Cells, left to right, top row first:
1) Bone Throw: a single thrown thigh bone spinning through the air, trailing thin turquoise wisps.
2) Wail of the Dead: a ghostly wailing spirit face made of turquoise smoke, mouth wide open, two faint sound rings in front of it.
3) Dark Bond: two dark purple hearts linked by a short chain of bone links, a faint turquoise glow on the chain.
4) Raise Dead: a skeletal hand clawing up out of a small mound of grave dirt, turquoise light rising around the fingers.
5) Vampiric Bite: a skull's jaw with long sharp fangs biting into a small turquoise soul flame.
6) Class emblem: a hooded lich skull with glowing turquoise eyes inside a ragged purple hood.
```

### 4.7 Hexer
Görünüm (`docs/design/classes/hexer.md`): erik rengi yırtık cüppe, kırmızı iplikle bağlı oyma kemik pullu kıvrık asa, kara mumlu demir kandil. Büyüsü NESNELERDEN (kemik tılsım, iplik düğümü, mum, nazar); kafatası ve hayvan YOK, yonca yalnızca solmuş.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Evil Eye | `icons-v2/hexer/eye.png` | kırmızı ipte asılı, tek gözlü oyma kemik nazar tılsımı |
| 2 | Withering Curse | `icons-v2/hexer/drainfield.png` | safra yeşili alevli, damlayan kara mum, aşağı süzülen ince yeşil duman |
| 3 | Jinx | `icons-v2/hexer/clover.png` | kırmızı iplik düğümüyle bağlı solmuş kahverengi dört yapraklı yonca |
| 4 | Doom Mark | `icons-v2/hexer/voidstrike.png` | kemik tılsımı yaran kara demir çivi, çatlaktan mor lanet ışığı |
| 5 | Ill Omen | `icons-v2/hexer/soul.png` | oyma işaretli kemik tılsım, kırmızı ipliği yana doğru uzar (lanet sıradakine geçer) |
| 6 | Amblem | `misc-icons/class/hexer.png` | iki iğne batırılmış dikişli çuval bezi kukla |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: HEXER, a folk-curse witch in a ragged plum robe; her magic lives in objects: carved bone charms tied with red thread, black candles, an iron lantern. No skulls and no animals. Colors: plum, curse violet, sickly bile green, old bone, red thread, a little candle amber.
Cells, left to right, top row first:
1) Evil Eye: a carved bone amulet shaped like one staring eye, hanging from a red thread, a faint violet glow in the pupil.
2) Withering Curse: a black wax candle with a sickly yellow-green flame, wax dripping, thin green smoke curling downward.
3) Jinx: a withered brown four-leaf clover tied with a knot of red thread.
4) Doom Mark: a black iron nail driven through a round bone charm, cracking it, violet curse light bursting from the crack.
5) Ill Omen: a single carved bone charm marked with an omen sigil, hanging from a red thread that frays and runs off to the side.
6) Class emblem: a stitched burlap poppet doll pierced by two pins, plum and violet tones.
```

### 4.8 Anti-Mage
Görünüm: kapüşonlu, koyu örgü zırh + çelik plaka, mürdüm kuşak, mor rünlü düz kılıç, kaldırdığı eldivenin çevresinde kırık rün tabletleri. Büyücü değil büyü avcısı: düşmanın MAVİ manasını söküp kendi MOR boşluğuna çevirir.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Mana Steal | `icons-v2/antimage/manaburn.png` | mavi mana kristalini sıkıp çatlatan çelik eldiven, parmak arasından mor ışık |
| 2 | Drain Field | `icons-v2/antimage/drainfield.png` | mavi mana zerrelerini içine çeken çatlak mor rün çemberi |
| 3 | Spell Ward | `icons-v2/antimage/spellward.png` | daire biçiminde süzülen kırık taş rün tabletlerinden koruma halkası |
| 4 | Void Strike | `icons-v2/antimage/voidstrike.png` | mor bir boşluk yarığından ileri saplanan mor rünlü düz kılıç |
| 5 | Mana Overflow | `icons-v2/antimage/overflow.png` | ağzından mor ışıklı sıvı taşan küçük demir kadeh |
| 6 | Amblem | `misc-icons/class/antimage.png` | avucu öne açık çelik eldiven + çevresinde üç kırık rün tableti |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: ANTI-MAGE, a hooded mage hunter in dark chainmail and steel plate with a plum sash, a straight sword with violet runes, broken stone rune tablets floating around his raised steel gauntlet. He tears the enemy's BLUE mana away and turns it into his own VIOLET void. Colors: dark steel, plum, violet runes, a little enemy blue.
Cells, left to right, top row first:
1) Mana Steal: a steel gauntlet crushing a blue mana crystal that cracks, violet light leaking between the fingers.
2) Drain Field: a cracked violet rune circle seen at an angle, pulling a few small blue mana motes down into it.
3) Spell Ward: a ring of broken stone rune tablets floating in a circle, their violet runes glowing.
4) Void Strike: a straight steel sword with violet runes thrusting forward out of a small violet void rift.
5) Mana Overflow: a small iron chalice overflowing with glowing violet liquid that spills over its rim.
6) Class emblem: a raised steel gauntlet, palm forward, with three broken rune tablets floating around it.
```

### 4.9 Gambler
Görünüm: bordo-mor çizgili yelek, tüylü kırmızı şapka, yelpaze kartlar (karo, maça, kırmızı daire), beyaz kemik zarlar, altın paralar ve kese. Silahı şans.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Loaded Dice | `icons-v2/gambler/loadeddice.png` | ikisi de altı gösteren, yuvarlanan iki fildişi zar |
| 2 | High Stakes | `icons-v2/gambler/highstakes.png` | devrilmek üzere sallanan yüksek altın para kulesi |
| 3 | Card Trick | `icons-v2/gambler/cardtrick.png` | sağa savrulan yelpaze üç oyun kartı (karo, maça, kırmızı daire) |
| 4 | All In | `icons-v2/gambler/allin.png` | ağzı patlayıp altın saçan ağır deri kese |
| 5 | Double or Nothing | `icons-v2/gambler/doubleornothing.png` | havada dönen tek altın para: yarısı parlak, yarısı kararmış |
| 6 | Amblem | `misc-icons/class/gambler.png` | tüylü bordo şapka, önünde iki fildişi zar |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: GAMBLER, a medieval card sharp in a burgundy striped vest and a feathered red hat; his weapons are luck: ivory bone dice, old playing cards, gold coins and a leather purse. Colors: burgundy, ivory, gold, black and red card suits.
Cells, left to right, top row first:
1) Loaded Dice: two ivory bone dice tumbling, both showing six black pips.
2) High Stakes: a tall stack of gold coins leaning and about to topple.
3) Card Trick: three old playing cards fanned out and flying to the right, showing a red diamond, a black spade and a red circle suit.
4) All In: a heavy leather coin purse bursting open, a few gold coins spilling out.
5) Double or Nothing: one gold coin spinning in the air, one half bright shining gold, the other half dark and tarnished.
6) Class emblem: a burgundy cap with a red feather plume, two ivory dice in front of it.
```

### 4.10 Defender (soruya bağlı: soru 2)
Görünüm: kapalı vizörlü miğfer, çelik zırh, mavi tabar, beyaz kale kuleli mavi kule kalkan, uzun kılıç. Bugünkü ChatGPT ikonları karakterli sahne (yeni kurala göre fazla yoğun); yeni sayfa tek konulu sürümdür.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Tremor Slam | `icons-v2/defender/tremor2.png` | kule kalkanın alt kenarı yere çarpar, iki yana düz bir taş çatlağı (sırayı yavaşlatır) |
| 2 | Taunt | `icons-v2/defender/taunt2.png` | kalkanına vuran çelik eldiven, üç kısa ses yayı |
| 3 | Guard | `icons-v2/defender/guard2.png` | beyaz kuleli mavi kalkan, kenarından yana uzanan demir zincir (dostunu korur) |
| 4 | Fist Crush | `icons-v2/defender/fistcrush2.png` | aşağı inen dev zırhlı yumruk, altında çatlayan taş |
| 5 | Bulwark Aura | `icons-v2/defender/aura.png` | küçük yuvarlak kalkan üstünde beyaz taş kule, tabanında solgun mavi ışık halkası |
| 6 | Amblem | `misc-icons/class/defender.png` | mavi sorguçlu kapalı miğfer, arkasında beyaz kuleli mavi kalkan |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: DEFENDER, a heavy tank knight in steel plate with a closed visored helm, a blue tabard and a tall blue tower shield bearing a white castle tower. Colors: steel, brass rivets, royal blue, white, grey stone.
Cells, left to right, top row first:
1) Tremor Slam: the bottom edge of a blue tower shield slammed into the ground, one straight crack of broken stone running out to both sides, a few stone chips.
2) Taunt: a steel gauntlet banging on the face of a blue tower shield, three short bold sound arcs coming off it.
3) Guard: a blue tower shield with a white castle tower emblem, an iron chain hanging from its side and running off to one side.
4) Fist Crush: a huge armored steel gauntlet fist smashing straight down, a small burst of cracked stone under it.
5) Bulwark Aura: a white stone castle tower standing on a round steel buckler, a soft pale blue ring of light around its base.
6) Class emblem: a closed steel great helm with a narrow visor slit and a blue plume, in front of a blue tower shield with a white castle tower.
```

### 4.11 Cutthroat (soruya bağlı: soru 3)
Görünüm: gri kukuleta ve pelerin, turuncu atkı, iki eğri hançer, deri kayışlar; zehir yeşili, duman grisi.

| Hücre | İkon | Dosya / hedef | Fikir |
|---|---|---|---|
| 1 | Venom Edge | `icons-v2/cutthroat/venomedge.png` | ağzından yeşil zehir damlayan eğri hançer |
| 2 | Saltire Cut | `icons-v2/cutthroat/saltire.png` | X biçiminde çaprazlanan iki eğri hançer + iki keskin kesik |
| 3 | Smoke Bomb | `icons-v2/cutthroat/smokebomb.png` | fitili yanan yuvarlak kil bomba, gri duman bulutuna patlıyor |
| 4 | Backstab | `icons-v2/cutthroat/backstab.png` | ters tutuşla aşağı inen eğri hançer, gri kukuleta gölgesinden |
| 5 | Opportunist | `icons-v2/cutthroat/opportunist.png` | gri kukuleta gölgesinden bakan kısık göz, altında hançer parıltısı |
| 6 | Amblem | `misc-icons/class/cutthroat.png` | gri dumanla çaprazlanmış iki eğri hançer |

```
Create ONE landscape image, 1536x1024, laid out as an invisible grid of 3 columns x 2 rows (six 512x512 cells) holding 6 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Class: CUTTHROAT, a hooded assassin in a grey cloak with an orange scarf and two curved daggers, using poison and smoke. Colors: charcoal grey, dark leather, steel, burnt orange, venom green.
Cells, left to right, top row first:
1) Venom Edge: a curved dagger with green venom dripping from its edge.
2) Saltire Cut: two curved daggers crossing in an X, two sharp slash streaks along them.
3) Smoke Bomb: a round clay bomb with a lit fuse bursting into a grey smoke cloud.
4) Backstab: a curved dagger in reverse grip striking downward out of the shadow of a grey hooded cloak.
5) Opportunist: one narrowed eye peering from the dark of a grey hood, a small dagger glint below it.
6) Class emblem: two crossed curved daggers with a wisp of grey smoke behind them.
```

## 5. İsteğe bağlı: çağrı ikonları (Ömer isterse)
Tek görsel, **1024x1024, 2x2** (hücre 512), ham dosya `assets/source/class-icons/summons-sheet.png`. Sıra TL, TR, BL, BR:
TL Root Smash -> `icons-v2/druid/rootsmash.png`, TR Vine Snare -> `icons-v2/druid/vinesnare.png`, BL Bone Strike -> `icons-v2/undead/bone.png`, BR Bone Slash -> `icons-v2/undead/boneslash.png`.

```
Create ONE square image, 1024x1024, laid out as an invisible grid of 2 columns x 2 rows (four 512x512 cells) holding 4 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, rich but clean shading, muted warm medieval palette, realistic materials (steel, wood, leather, cloth, stone), readable at 48 pixels. Every icon shows ONE bold, clear subject, centered, filling about 70-75% of its cell. Very little debris: at most a few small sparks or chips. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Each icon stays fully inside its own cell with about 12% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. Light effects (glow, flame, magic) stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
Cells, left to right, top row first:
1) Root Smash: a huge mossy wooden fist made of thick oak roots smashing down, a few chips of bark.
2) Vine Snare: a coil of green ivy vines tightening into a loop like a snare.
3) Bone Strike: a rusty short sword held by a skeletal hand, turquoise glint on the edge.
4) Bone Slash: one curved turquoise slash streak with a few small bone chips.
```

## 6. Seçenek: avatar (portre) yeniden çizimi (Ömer "karakter ikonu" ile bunu kastediyorsa)
Varsayılan planda YOK. Avatar savaş çiziminden kesildiği için ayrı çizilen portre savaştaki yüzle tutmayabilir. Yapılacaksa: her sınıf için ChatGPT'ye `assets/sprites/<id>/idle.png` yüklenip "same character, head and shoulders portrait, facing right" istenir; 1024x1024 tek portre, saydam zemin; içe aktarma `import-characters-v2.py` kafa kesimi yerine doğrudan 256 avatar (araç eki gerekir). 11 ek görsel. Önerim: avatarlar kalsın; değişecekse karakter çizimiyle birlikte değişsin.

## 7. Art-pipeline kontrol listesi (her sayfa)
1. Görsel 3x2 mi, altı ikon ayrı hücrelerde mi, ikon hücre sınırını aşıyor mu, yazı/çerçeve var mı?
2. Gerçek saydamlık var mı (dama deseni yok, koyu hale yok)? Yoksa yeniden üret (art arda döngü yok).
3. Tek net konu ve az parçacık: kalabalık sahne çıktıysa bir kez yeniden üret, yine olmazsa raporla.
4. Dosyayı `assets/source/class-icons/<id>-sheet.png` adıyla koy; önizleme PNG'si (açık ve koyu zemin, 128 ve 48 px) hazırla; içe aktarma ve bağlama bölüm 3.2'deki araç hazır olunca.
5. Sürüm, patch notes, commit, push yok.

## 8. Ömer'e sorular
1. "Karakter ikonu" sınıf amblemi mi (öneri, plana dahil) yoksa sıra çubuğundaki yüz portresi (avatar) mi?
2. Defender'ın bugünkü ChatGPT ikonları (karakterli sahneler) da yeni sade stile çevrilsin mi? (Plan: evet, sohbet 3'te; hayır dersen Defender sayfası yalnızca amblem için kalır ya da atlanır.)
3. Cutthroat v2 kapsamı dışında; yeni ikonları çizilip bağlansın mı? (Bağlamak için kayıt dosyasına satır gerekir.)
4. Headsman's Blow: cellat baltası (öneri A) mı, Warrior'ın uzun kılıcı (B) mı? İkon adı `warcry` kalsın mı, `headsman` olsun mu?
5. Çağrı ikonları (Treant: Root Smash, Vine Snare; Skeleton: Bone Strike, Bone Slash) dahil olsun mu? Olmazsa savaşta bunlar piksel ikon kalır.
6. Zemin: saydam (öneri; HUD'ın kendi koyu plakası arkada görünür) mı, Defender'daki gibi koyu kare zemin mi? Küçük düğmede boyalı ikonlar yumuşak mı keskin mi ölçeklensin?
