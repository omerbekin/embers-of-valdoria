# Valdoria haritasını doldurma planı (A1-x, 26 düğüm)

> **Durum: YALNIZCA TASARIM ÖNERİSİ (content designer, 2026-10-12).** Kod, veri ya da commit değişmedi. Ömer seçim formundan seçecek.
> Kaynaklar: `data/campaign/valdoria.json`, `campaign.json`, `encounters.json`, `events.json`, `data/classes/*`, `data/bosses/*`, `data/summons/*`, `data/skills.json`, `data/statuses.json`, `data/grounds.json`, `src/game/battle-background.ts`, `src/campaign/encounters.ts`, `docs/design/campaign/valdoria-2x.md`, `docs/design/future-ideas.md` (İLK YAPILACAKLAR satırı: önce harita doldurma, sonra sefer mantığı, sonra yetenek ağaçları; element/durum sistemi ERTELENDİ).
> Oyun içi adlar (mob, skill, düğüm) İngilizce; açıklamalar Türkçe.

## 0. Bugünkü durum: önemli bulgular

1. **Hiçbir düğüm tamamen boş değil**, ama çoğu **jenerik**: 22 savaşın tamamı oyuncunun da seçtiği 11 sınıfın yeniden adlandırılmış kopyası (warrior, archer, defender...). Bölgeye özgü tek düşman King's Bridge'deki Bridge Warden.
2. **Sefer savaşları neredeyse hep `castle-hall` arka planında geçiyor.** Bölgeler `border-road`, `valley-field`, `ashen-heights` arka planlarını istiyor, ama bu dosyalar `assets/backgrounds/` altında YOK; seçim kuralı (karşılaşma > düğüm > bölge > varsayılan) bu yüzden varsayılan `castle-hall`'a düşüyor. Yalnızca King's Bridge'in kendi arka planı var.
3. **Arka plan altyapısı hazır:** düğüm başına `battleBackground` ve karşılaşma başına `background` alanları zaten destekleniyor (`src/campaign/encounters.ts`). Yeni arka planlar için kod gerekmiyor, yalnızca görsel, veri ve zemin çizgisi ölçümü (`battle-layout.json > backgrounds.floor`).
4. **Skill sanatı ödünç alınabiliyor:** skill'deki `artOf` alanı, ikonu, efekti ve sesi var olan bir skill'den alır (Pose Tester böyle çalışıyor). Mob skill'leri bu yolla **yeni ikon ve efekt çizmeden** yapılabilir.
5. **Mob'lar "class" olamaz:** class'lar "tam 4 skill" kuralına bağlı ve takım seçiminde, rastgele havuzda ve sim'de görünür. Bridge Warden bu yüzden `data/bosses/` altında gizli tanımlı. Yeni moblar için aynı türde gizli bir **`data/mobs/`** kategorisi gerekir (küçük kod; bkz. 6. bölüm, N1).
6. Olaylar (Witch's Hut, Shepherd's Fold) yalnızca **yer tutucu metin** ("Events with choices are coming soon"). Seçenekli olay YENİ mekaniktir (N2).
7. Lord Morvane (final boss) bugün `undead` sınıfının can çarpanlı kopyası. Bridge Warden için yazılan boss altyapısı (fazlar, afiş, telgraf, Unyielding) veriyle yönetiliyor; Morvane bunu kullanabilir.

## 1. Bölge (zone) tablosu

Haritanın resmi 3 bölgesi (I, II, III) tek arka planla tema vermek için çok geniş (II'de 13 düğüm var: bataklık, maden, mezarlık, manastır...). Öneri: haritadaki **3 bölge aynı kalır** (etiketler, tablo), içerik ve arka plan için **11 alt bölge (zone)** kullanılır.

| Zone | Ad | Tema (tek cümle) | Düğümler | Boş / zayıf olanlar |
|---|---|---|---|---|
| Z1 (I) | **The Borderlands** | Kül Laneti'nden kaçan haydutların istila ettiği kıyı tarlaları ve Ravenwood ormanı. | 1 Mill Road, 2 Ravenwood, 3 Ruined Watchtower (elit), 4 Ashford Village (kasaba) | 1, 2, 3: sınıf kopyası (eğitim için bilinçli). 4: yalnızca dinlenme + yeni bölük. |
| Z2 (II) | **Windy Moor & Charwood** | Rüzgârın dövdüğü fundalık ve dumanı tüten kömürcü ormanları; çaresiz akıncılar ve kömürcüler yol kesiyor. | moor Windy Moor, charcoal Charcoal Camp | İkisi de sınıf kopyası. |
| Z3 (II) | **The Iron Hills** | Terk edilmiş cüce geçidi ve madeni; dağ haydutları ve taşa bağlanmış cüce muhafızlar. | 5B Iron Pass, 6B Dwarven Mine (hazine) | İkisi de sınıf kopyası. |
| Z4 (II) | **Misty Marsh** | Sisle boğulmuş kara sulu bataklık; boğulmuşlar kıpırdıyor, bir çalı cadısı kendi sarayını kurmuş. | 5A Misty Marsh, 6A Witch's Hut (olay) | 5A sınıf kopyası; 6A olay metni yer tutucu, ödül yok. |
| Z5 (II) | **The Dead Fields** | Eski bir savaş mezarlığı ve kirletilmiş kara katedral; lanet ölüleri kaldırıyor. | grave Grave Field, 8C Black Cathedral (elit) | İkisi de sınıf kopyası (elit = undead kopyası). |
| Z6 (II) | **Pilgrim's Way** | St. Brann'a giden hac yolu; sahte hacılar ve bağnazlar yolcuları avlıyor, manastırın yeminli bekçileri emanetleri koruyor. | pilgrim Pilgrim Road, 8A St. Brann's Abbey (hazine), river Riverside Camp (dinlenme) | pilgrim, 8A sınıf kopyası; river tamam (dinlenme + diriltme). |
| Z7 (II) | **King's Bridge** | Kral Köprüsü ve Bridge Warden. | 9 King's Bridge (boss) | **TAMAM** (özel boss, özel arka plan). Değişiklik önerilmiyor. |
| Z8 (III) | **The Ashen Plain** | Kül gömülü gri savaş alanı; Morvane'ın öncüleri kuşatma hattı kazıyor, düşenler korun içinden kalkıyor. | 10 Ashen Plain, 11B Siege Line, camp Forward Camp (tüccar) | 10, 11B sınıf kopyası; 11B'nin alt başlığı yalnızca "Battle". camp tamam. |
| Z9 (III) | **Thornwood Hollow** | Dikenlerle boğulmuş bir çukur; Ejder Tarikatı için için yanan inini burada saklıyor. | thorn Thornwood Hollow (elit) | Sınıf kopyası (elit = mage kopyası). |
| Z10 (III) | **The Ember Road** | Kuzeye giden son yanık yol, külle kaplı pınar başı ve Morvane'ın kapı kulesi; hane şövalyeleri devriyede. | road Ember Road, fold Shepherd's Fold (olay + dinlenme), head Riverhead, gate Gate of Cinders | road/head/gate sınıf kopyası; fold olay metni yer tutucu. |
| Z11 (III) | **Castle Morvane** | Kül içinde boğulmuş Morvane'ın taht salonu. | 12 Castle Morvane (final boss) | Boss = undead kopyası. |

## 2. Moblar (zone başına)

**Ortak kurallar**
- Her mob `data/mobs/` altında gizli birim (N1). Bir **temel saldırı** (bekleme süresi yok, MP yok) + **1-2 skill** taşır. Toplam 2-3 skill.
- Yalnızca **var olan** etki türleri ve durumlar kullanılır: hasar (`damage`), durum (`slow`, `haste`, `wound`, `stun` [şanslı da olur], `fortify`, `blessed`, `blinded`, `shrouded`, `jinxed`, `fleet`, `burning`), DoT (`wither`, `burning`), şifa / HoT, kalkan, dispel, zemin (`poison`, `burning`, `holy_fire`, `flooded_planks`), çağırma (`skeleton`, `treant`), taunt, guard, pull, omen, manaBurn, alan şekilleri (row, column, rect, plus, x), `area_any` ile dostlara durum (Smoke Bomb gibi), HP bedeli, `ignoreFrontRow`, `requiresOpenBehind`, `repeatChance`, `ignoreDefense`, `falloff`.
- Pasifler de yalnızca var olanlar: Berserker (`rage`), Opportunist (`bonusVsStatus`), Vampiric Bite (`soulDrain`), Bulwark Aura (`armorAura`), Divine Light, Sharpshooter (`longshot`).
- "Şablon" = sayıları ve sanatı (`artOf`) ödünç alınacak var olan skill. Sayılar PROVİZYON; denge `sim:campaign` ile.
- Element alanı yalnızca görsel etiket olarak kalır (element/direnç sistemi ertelendi).
- CD = bekleme süresi (tur).

### Z1 The Borderlands (eğitim)
Eğitim, oyuncuya gerçek sınıfları öğretiyor ve dengesi ayarlı. Öneri: **Cutpurse (cutthroat) ve Bandit Chief (warrior elit) aynen kalır**, yanlarına 3 hafif mob gelir. Eğitimde ultimate kilidi gibi kurallar aynen sürer.

| Mob | Rol | Görünüş (piksel art) | Skill'ler | Düğümler |
|---|---|---|---|---|
| **Road Thug** | brute (yakın) | Yamalı deri yelekli, sopalı, iri, kel bir köylü haydut. | **Cudgel** (—): tek hedef fiziksel hasar (şablon Bone Strike). **Knockdown** (CD 3): hasar + %25 şansla 1 tur `stun` (şablon Vine Snare'in şanslı stun'ı). | 1, 2 |
| **Ravenwood Poacher** | ranged | Yeşil kukuletalı, kısa yaylı, belinde tavşan asılı kaçak avcı. | **Snare Shot** (—): DEX hasarı + 2 tur `slow` (şablon Bone Throw). **Loose Volley** (CD 3): rastgele 2 düşmana hasar (şablon Card Trick, durumsuz). | 2, 3 |
| **Ravenwood Wolf** | melee (hızlı) | Kır tüylü, sıska, gözleri kor gibi parlayan orman kurdu. | **Bite** (—): DEX hasarı + 2 tur `wound` (şablon Venom Edge). **Pack Howl** (CD 4): 2x2 alanda dostlara 2 tur `haste` (şablon Smoke Bomb'un `area_any` + `side: allies` yapısı). | 2 |
| Elit: **Bandit Chief** | (var) | Var olan warrior elit. İsteğe bağlı yeni sprite (kırmızı pelerinli, miğferli şef). | Değişmez. | 3 |

### Z2 Windy Moor & Charwood

| Mob | Rol | Görünüş | Skill'ler | Düğümler |
|---|---|---|---|---|
| **Moor Raider** | melee | Rüzgârda savrulan yün pelerinli, kancalı mızraklı, yüzü boyalı fundalık akıncısı. | **Hooked Spear** (—): fiziksel hasar. **Hamstring** (CD 2): hasar + 2 tur `slow`. Pasif: Opportunist (yavaşlamış / yaralı hedefe +%25). | moor, charcoal |
| **Heath Slinger** | ranged | Taş torbalı, sapanlı, çıplak ayaklı genç çoban. | **Sling Stone** (—): LUCK hasarı, %25 tekrar şansı (şablon Loaded Dice). **Stone Hail** (CD 3): bir sıraya (row) fiziksel hasar (şablon Tremor Slam şekli, slow'suz). | moor |
| **Charcoal Burner** | caster | Kurumla kararmış önlüklü, elinde tüten kömür kovası, maskeli kömürcü. | **Ember Toss** (—): INT ateş hasarı (Fire Bolt'un zayıfı). **Smoke Pot** (CD 3): 2x2 alanda düşmanlara 2 tur `blinded`, dostlara 2 tur `shrouded` (Smoke Bomb). **Burn the Clearing** (CD 4): 2x2 `burning` zemini, 2 tur (Meteor'un zemin kısmı). | charcoal |
| *(isteğe bağlı)* **Moor Boar** | brute | Kalın, çamurlu, tek dişi kırık yaban domuzu. | **Gore** (—): STR hasarı. **Trample** (CD 3): sıra hasarı + 2 tur `slow` (Tremor Slam). | moor |

### Z3 The Iron Hills

| Mob | Rol | Görünüş | Skill'ler | Düğümler |
|---|---|---|---|---|
| **Pass Crossbowman** | ranged | Kürk yakalı, arbaletli, dağ eşarplı geçit haydudu. | **Bolt** (—): DEX hasarı, savunmanın %25'ini yok sayar (`ignoreDefense`). **Pinning Bolt** (CD 3): güçlü tek atış + 2 tur `slow` (Aimed Shot'un zayıfı). | 5B, Z8'de reskin (11B) |
| **Stonebound Warden** | tank | Rünleri sönük ışıyan, taş kalkanlı, yarısı taşa dönmüş cüce muhafız heykeli. | **Shield Bash** (—): STR + zırhtan bonus hasar (Fist Crush'ın `bonusScale armor`'ı). **Hold the Line** (CD 4): taunt (Taunt). **Stone Ward** (CD 4): bir dosta `guard` (Guard). Pasif: Bulwark Aura. | 6B, 5B |
| **Tunnel Sapper** | caster / ranged | Kazmalı, deri miğferli, belinde barut torbaları olan madenci. | **Pick Throw** (—): fiziksel hasar. **Blasting Charge** (CD 3): artı (plus) alanında fiziksel hasar + 2 tur `burning` zemini (Meteor şekli). | 6B |
| *(isteğe bağlı)* **Cave Crawler** | melee | Soluk, çok bacaklı mağara örümceği. | **Venom Bite** (—): hasar + `wound`. **Web Spit** (CD 3): 2 tur `slow` + %25 `stun`. | 6B |
| Hazine bekçisi: **Thane of the Deep** | (adlı lider) | Stonebound Warden, adlı ve can çarpanlı (`name`, `hpMult`); yeni sprite gerekmez. | Aynı skill'ler. | 6B |

### Z4 Misty Marsh

| Mob | Rol | Görünüş | Skill'ler | Düğümler |
|---|---|---|---|---|
| **Bog Lurker** | brute | Yosun ve sazla kaplı, uzun kollu, çamurdan yarı çıkmış bataklık yaratığı. | **Claw** (—): STR hasarı. **Drag Under** (CD 3): hasar + hedefi kendi şeridinin önüne çeker (`pull`, Chain Hook'un etkisi; Mooring şartı olmadan). | 5A, 6A |
| **Fen Witchling** | caster | Ot taçlı, kemik muskalı, genç, kambur çalı cadısı çırağı. | **Hex Bolt** (—): LUCK karanlık hasar + 1 `omen` (Evil Eye). **Bog Curse** (CD 3): 2x3 alanda küçük hasar + 3 tur `wither` (Withering Curse). | 5A, 6A |
| **Will-o'-Wisp** | support | Yeşil-mavi titrek bir ışık topu, içinde soluk bir yüz. | **Spark** (—): INT büyü hasarı. **Lure Light** (CD 2): hasar + 2 tur `jinxed`. **Marsh Glow** (CD 3): dosta şifa + 3 tur HoT (Rejuvenate'in zayıfı). | 5A, 6A |
| Reuse: **Bog Thrall** | melee | Var olan `undead` sınıfı (bugünkü Witch's Hut'taki ad). | Var. | 6A |
| Lider: **Hedge Witch Morwen** | (adlı lider) | Fen Witchling, adlı ve güçlendirilmiş; ya da var olan Hexer adlandırması (bugünkü). | Aynı. | 6A |

### Z5 The Dead Fields

| Mob | Rol | Görünüş | Skill'ler | Düğümler |
|---|---|---|---|---|
| Reuse: **Risen Skeleton** | melee | **Var olan `skeleton` çağrısı** mob olarak (yeni sprite YOK). | Bone Strike, Bone Slash (var). | grave, 8C |
| **Ghoul** | brute | Kambur, gri derili, uzun tırnaklı, mezar toprağına bulanmış ceset yiyici. | **Gnaw** (—): STR hasarı + 2 tur `wound`. **Feast** (CD 3): güçlü tek vuruş. Pasif: Vampiric Bite (verdiği hasarın bir kısmı can). | grave |
| **Grave Chanter** | support / caster | Yırtık siyah cüppeli, elinde paslı fener, ağzı dikili kült rahibi. | **Dirge** (—): karanlık hasar + 2 tur `slow` (Bone Throw). **Raise Dead** (CD 5): cesetten iskelet çağırır (Raise Dead, var). | grave, 8C |
| **Bell Wraith** | caster | Paslı bir çanı zincirle taşıyan, alt yarısı duman bir hayalet. | **Toll** (—): INT karanlık hasar. **Death Knell** (CD 3): bir sıraya karanlık hasar + %25 şansla 1 tur `stun`. | 8C |
| Elit: **High Priest of the Undying** (YENİ sprite) | caster elit | Kemik taçlı, mor-siyah cübbeli, arkasında mum ışığında süzülen uzun boylu baş rahip. | **Bone Throw** (—). **Wail of the Dead** (CD 3, var: artı alan + `poison` zemini). **Unholy Hymn** (CD 3): bir dosta şifa + HoT (Rejuvenate). **Raise Dead** (CD 5). Pasif: Vampiric Bite. | 8C |

### Z6 Pilgrim's Way

| Mob | Rol | Görünüş | Skill'ler | Düğümler |
|---|---|---|---|---|
| **False Pilgrim** | melee (suikast) | Kirli hacı cübbesi, deniz kabuğu rozeti, cübbenin altından görünen hançer. | **Hidden Knife** (—): DEX hasarı + `wound`. **Ambush** (CD 4): ön sırayı atlayıp arkası boş hedefe garantili kritik (Backstab'ın zayıfı). | pilgrim |
| **Flagellant** | brute | Çıplak sırtı yaralı, kırbaçlı, başı kukuletalı bağnaz. | **Scourge** (—): STR hasarı. **Mortify** (CD 3): kendi mevcut canının %15'ini harcar, bir sıraya güçlü hasar (Wail of the Dead'in HP bedeli). Pasif: Berserker (canı azaldıkça daha sert). | pilgrim, 8A |
| **Abbey Keeper** | tank / support | Beyaz-altın tabardlı, gürzlü, kapalı miğferli manastır muhafızı. | **Mace** (—): INT kutsal hasar (Holy Strike). **Sanctuary** (CD 3): bir dosta 2 tur `blessed` (-%30 hasar). **Consecrate** (CD 4): artı alanına `holy_fire` zemini (Judgment). | 8A |
| Hazine bekçisi: **Brother-Castellan** | (adlı lider) | Abbey Keeper, adlı ve güçlü. | Aynı. | 8A |

### Z7 King's Bridge
Değişiklik yok (Bridge Warden + 2 Iron Mooring, `kings-bridge` arka planı).

### Z8 The Ashen Plain

| Mob | Rol | Görünüş | Skill'ler | Düğümler |
|---|---|---|---|---|
| **Ash Revenant** | melee | Külden yapılmış, çatlaklarından kor sızan, eski zırhlı bir asker. | **Cinder Blade** (—): STR ateş hasarı. **Ash Cloud** (CD 3): 2x2 alanda düşmanlara 2 tur `blinded`. | 10, 11B |
| **Vanguard Pikeman** | melee (uzun menzil) | Morvane'ın kül grisi armalı, uzun mızraklı, kalkanlı öncü askeri. | **Pike Thrust** (CD 2): bir sütuna (column) azalan fiziksel hasar (Piercing Arrow, STR'li). Temel saldırı: **Jab** (—). **Brace** (CD 4): kendine 1 tur `fortify` (-%50 hasar). | 11B, 10 |
| **Ash Hound** | melee (hızlı) | Kara, kemikleri görünen, ağzından kıvılcım saçan av köpeği. | **Searing Bite** (—): hasar + 2 tur `burning` DoT. **Pack Howl** (CD 4): Ravenwood Wolf'unki gibi dostlara `haste`. | 10 |
| Reskin: **Siege Arbalist** | ranged | Pass Crossbowman sprite'ı (gri pelerin rengi farkı isteğe bağlı). | Bolt, Pinning Bolt. | 11B |
| Lider: **Siege Sergeant** | (adlı lider) | Vanguard Pikeman, adlı ve güçlü. | Aynı. | 11B |

### Z9 Thornwood Hollow

| Mob | Rol | Görünüş | Skill'ler | Düğümler |
|---|---|---|---|---|
| **Drake Cultist** | caster | Ejder pulu maskeli, kızıl cüppeli, elinde tütsü tası. | **Flame Lash** (—): INT ateş hasarı. **Kindle** (CD 2): hasar + 3 tur `burning` DoT. | thorn |
| **Drakeling** | ranged | Kedi boyunda, kızıl pullu, kanatları yırtık genç ejder yavrusu. | **Bite** (—). **Spit Fire** (CD 3): bir sıraya ateş hasarı + 1 tur `burning` zemini. | thorn |
| Reuse: **Thorn Treant** | melee | **Var olan `treant` çağrısı** mob olarak (isteğe bağlı koyu-diken renk varyantı). | Root Smash, Vine Snare (var). | thorn |
| Elit: **Drake Priestess** (YENİ sprite) | caster elit | Boynuzlu ejder kafatası başlıklı, kanat gibi açılan pelerinli tarikat başrahibesi. | **Fire Bolt** (—). **Meteor** (CD 3, var). **Mana Barrier** (CD 3, var: dosta kalkan + dispel). **Call the Brood** (CD 6): Drakeling çağırır (var olan `summon` etkisi; Drakeling'in `data/summons/` kopyası gerekir). | thorn |

### Z10 The Ember Road

| Mob | Rol | Görünüş | Skill'ler | Düğümler |
|---|---|---|---|---|
| **Morvane Outrider** | melee (hızlı) | Kül renkli pelerinli, hafif zırhlı, kılıçlı atsız süvari. | **Saber** (—): STR hasarı. **Ride Down** (CD 3): ön sırayı atlayıp hasar + 1 tur `stun`, öne geçer (Charge). Pasif yok; yüksek hız. | road, head |
| **Cinder Knight** | tank | Kor çatlaklı kara plaka zırh, alev desenli kalkan, ağır gürz. | **Ember Mace** (—): STR + zırh bonusu. **Ashen Challenge** (CD 4): taunt. **Shield Wall** (CD 4): bir dosta `guard`. Pasif: Bulwark Aura. | gate, head, 12 |
| **Pyre Witch** | caster | Saçları duman gibi yükselen, kül maskeli, elinde yanan asa. | **Fire Bolt** (—, zayıf). **Firestorm** (CD 3): 3x2 alanda ateş hasarı (Blizzard şekli, ateş). **Kindle** (CD 2): Z9'daki gibi `burning` DoT. | road, gate |
| **Gate Ballista** | ranged (kuşatma) | Kapı kulesine sabitlenmiş, iki askerin kurduğu ağır mancınıklı yay. Çok yavaş (düşük hız ile). | **Bolt Thrower** (CD 2): bir sütuna yüksek fiziksel hasar, savunmanın %50'sini yok sayar. Temel saldırı: **Iron Bolt** (—). | gate |
| Reuse: **Riverhead Archer** | ranged | Var olan `archer` sınıfı (bugünkü Spring Ambush). | Var. | head |

### Z11 Castle Morvane

| Birim | Rol | Görünüş | Skill'ler | Düğüm |
|---|---|---|---|---|
| **Lord Morvane** (YENİ boss sprite + `data/bosses/lord_morvane.json`) | final boss | Uzun, zayıf, kül rengi zırhlı, kor dolu taç ve kırık kılıçlı lanetli lord; pelerininden kül dökülüyor. | **Ashen Blade** (—): STR ateş hasarı. Pasif: Vampiric Bite + Unyielding (Warden'dakiyle aynı pasif). **Ash Curse** (CD 3): 2x3 alanda hasar + `wither` + `omen` (Withering Curse). **Raise the Fallen** (CD 5): cesetten iskelet çağırır (Raise Dead). **Pyre of Valdoria** (CD 4, 2. fazdan): telgraflı (bir tur önceden gösterilen) tüm-sıra ateş hasarı + 2 tur `burning` zemini (Breaking Span'in telgraf + zemin yapısı). **Fazlar** (Warden altyapısı): %50'de "The Ember Crown wakes." afişi, tur başına 2 eylem. | 12 |
| Eskortlar | | Cinder Knight (ön), Ash Revenant (ön), Pyre Witch (arka). | Yukarıdaki gibi. | 12 |

**Toplam:** 27 yeni sıradan mob (+2 isteğe bağlı: Moor Boar, Cave Crawler), 2 yeni elit (High Priest, Drake Priestess), 1 yeni boss (Lord Morvane). Yeniden kullanılan: cutthroat, warrior elit, undead (Bog Thrall), archer, skeleton, treant; Pass Crossbowman sprite'ı Z8'de reskin. Adlı liderler (Thane of the Deep, Hedge Witch Morwen, Brother-Castellan, Siege Sergeant) yeni sprite istemez.

## 3. Arka planlar (zone başına)

Tüm arka planlar için ortak istek: yandan görünüm, karakter yok, 16:9 en az 1920x1080 (tercihen 2580 genişlik, geniş ekran için), alt yaklaşık üçte bir düz yürünebilir zemin, zemin çizgisi görsel yüksekliğinin 0,6-0,7'sinde (ölçülüp `backgrounds.floor`'a yazılır), ortaçağ, boyalı piksel art, mevcut `proving-grounds` / `kings-bridge` diliyle aynı.

| Zone | Arka plan kimliği | Prompt'a hazır tek cümle | Yeniden kullanılabilecek var olan |
|---|---|---|---|
| Z1 | `border-road` (kimlik zaten bölge I'de tanımlı, dosya yok) | Side-view painted pixel-art medieval dirt road along coastal wheat fields at the edge of a dark pine forest, broken fences, a distant sea and windmill, overcast morning. | Geçici: `proving-grounds-sunny-afternoon`. |
| Z2 | `windy-moor` | Side-view painted pixel-art windswept heather moor with standing stones and bent grass, smoking charcoal kilns at a forest edge, grey racing clouds. | `valley-field` kimliği bölge II için tanımlı (dosya yok); bunun yerine. |
| Z3 | `iron-pass` | Side-view painted pixel-art narrow mountain pass with dwarven carved stone gate and a collapsed mine entrance, iron rails and lanterns, cold blue dusk. | Yok. |
| Z4 | `misty-marsh` | Side-view painted pixel-art fog-choked swamp with black water, reeds, dead willows and a crooked witch's hut on stilts in the background, sickly green light. | Yok. |
| Z5 | `grave-field` | Side-view painted pixel-art moonlit battlefield cemetery with leaning headstones, rusted swords in the ground and a ruined black cathedral looming behind, purple mist. | `duelling-ring-moon` atmosfer referansı. |
| Z6 | `pilgrim-road` | Side-view painted pixel-art stone pilgrim road with wayside shrines and prayer flags winding to a white hilltop abbey, warm golden afternoon light. | Yok. |
| Z7 | `kings-bridge` | VAR. | VAR. |
| Z8 | `ashen-plain` (bölge III'teki `ashen-heights` yerine ya da onun adıyla) | Side-view painted pixel-art grey ash-covered battlefield with siege trenches, broken banners and wooden stakes, embers drifting under a red-brown sky. | Yok. |
| Z9 | `thornwood-hollow` | Side-view painted pixel-art sunken hollow overgrown with giant black thorns around a smouldering cave mouth with drake skulls and cult candles, orange glow. | Yok. |
| Z10 | `ember-road` | Side-view painted pixel-art burnt road along an ash-grey river spring leading to a dark gatehouse with burning braziers, cinders falling like snow, dusk. | Yok. |
| Z11 | `castle-morvane` (isteğe bağlı) | Side-view painted pixel-art ruined throne hall choked with ash, cracked pillars, a burning ember crown above the throne, red light through broken windows. | **`castle-hall` yeniden kullanılabilir** (bugünkü varsayılan). |

İsteğe bağlı düğüme özel arka planlar (düğümün `battleBackground` alanı ile): `ruined-watchtower` (3), `dwarven-mine` iç mekân (6B), `black-cathedral` iç mekân (8C), `abbey-vault` (8A). Bunlar olmadan zone arka planı kullanılır.

## 4. Düğüm düğüm doldurma listesi (21 duraklık rota sırasıyla)

Birimler: ön = ön sıra, arka = arka sıra. Tutorial düğümlerinde (1-3) bugünkü güç çarpanları ve ultimate kilitleri korunur.

| Durak | Düğüm | Tür | Karşılaşma / olay | Amaç |
|---|---|---|---|---|
| 1 | **1 Mill Road** | savaş | `mill_road_thugs`: Road Thug (ön), Cutpurse (cutthroat, ön). Arka plan `border-road`. | Sıra çubuğunu öğret (değişmez); ilk yeni mob tek ve basit. |
| 2 | **2 Ravenwood** | savaş + katılım | `ravenwood_pack`: 2 Ravenwood Wolf (ön), Road Thug (ön), 2 Ravenwood Poacher (arka). | Alan saldırısı öğret: sık dizili 5 düşman. Kurtlar Pack Howl ile hızı da gösterir. |
| 3 | **3 Ruined Watchtower** | elit | `watchtower_chief`: Bandit Chief (elit, warrior), 2 Ravenwood Poacher (arka). İsteğe bağlı arka plan `ruined-watchtower`. | İlk elit; eğitimi kapatır. |
| 4 | **4 Ashford Village** | kasaba | Dinlenme + yeni bölük (var) + **5. bölümden seçilen kasaba içeriği**. | Eğitimden sefere geçiş; ilk alışveriş / hazırlık yeri. |
| 5 | **moor Windy Moor** | savaş | `windy_moor`: Moor Raider (ön), Moor Boar ya da ikinci Raider (ön), Heath Slinger (arka). Arka plan `windy-moor`. | Yeni bölüğün ilk savaşı: kolay, "slow + opportunist" ikilisini tanıtır. |
| 6a | **5B Iron Pass** | savaş | `iron_pass_ambush`: Stonebound Warden (ön), 2 Pass Crossbowman (arka). Arka plan `iron-pass`. | Seçim: tank + arbalet (zırh delme) yolu. |
| 6b | **charcoal Charcoal Camp** | savaş | `charcoal_camp`: Moor Raider (ön), Charcoal Burner (arka), Heath Slinger (arka). Arka plan `windy-moor`. | Seçim: duman (`blinded`) ve yanan zemin yolu; yer değiştirmeyi öğretir. |
| 7 | **7 Valdren Keep** | şehir | Dinlenme + katılım (var) + **5. bölümden seçilen şehir içeriği**. | Orta bölümün merkezi; üçlü seçimden önce hazırlık. |
| 8a | **6B Dwarven Mine** | hazine (korumalı) | `mine_wardens`: Thane of the Deep (adlı Stonebound Warden), Tunnel Sapper, Cave Crawler ya da Pass Crossbowman. Ödül: cüce sandığı (var). İsteğe bağlı arka plan `dwarven-mine`. | Zor ama ödüllü yol: ekipman sandığı. |
| 8b | **6A Witch's Hut** | olay (korumalı) | `witchs_hut_guard`: Hedge Witch Morwen (adlı Fen Witchling), Bog Thrall (undead), Will-o'-Wisp. Ardından olay. **Mevcut mekanikle:** zaferden sonra cadı "ödül" olarak bir hazine sandığı açar (düğüm `treasure` alanı alır; sadece veri). **Yeni mekanikle (N2):** cadının seçenekli pazarlığı. | Bugün ödülsüz olan düğüme gerçek bir sebep vermek. |
| 8c | **5A Misty Marsh** | savaş | `bog_ambush`: Bog Lurker (ön), Bog Thrall (undead, ön), Fen Witchling (arka), Will-o'-Wisp (arka). Arka plan `misty-marsh`. | Güvenli ama düz savaş yolu; `pull` ve lanet (omen/wither) tanıtımı. |
| 9 | **grave Grave Field** | savaş | `grave_field`: 2 Risen Skeleton (ön), Ghoul (ön), Grave Chanter (arka). Arka plan `grave-field`. | Birleşme noktası; ölüler temasının girişi, ceset ve çağırma oyunu. |
| 10 | **pilgrim Pilgrim Road** | savaş | `pilgrim_road`: Flagellant (ön), False Pilgrim (ön), Heath Slinger (arka). Arka plan `pilgrim-road`. | Arka sırayı tehdit eden suikastçı (Ambush) karşısında dizilim öğretir. |
| 11a | **8A St. Brann's Abbey** | hazine (korumalı) | `vault_keepers`: Brother-Castellan (adlı Abbey Keeper), Abbey Keeper, Flagellant. Ödül: emanet kasası (var). Arka plan `pilgrim-road` ya da isteğe bağlı `abbey-vault`. | Ödül yolu; kutsal zemin ve `blessed` ile dayanıklı düşmanlar. |
| 11b | **8C Black Cathedral** | elit | `black_cathedral`: High Priest of the Undying (elit), Bell Wraith, Risen Skeleton, Grave Chanter. Arka plan `grave-field` ya da isteğe bağlı `black-cathedral`. | Elit yolu: zor, iyi loot; çağırıcıları önce öldürmeyi öğretir. |
| 12 | **river Riverside Camp** | dinlenme | Değişmez: ücretsiz %50 şifa + altınla diriltme. İsteğe bağlı: köprü öncesi kısa hikâye metni (Warden'ın efsanesi). | Boss öncesi nefes. |
| 13 | **9 King's Bridge** | boss | Değişmez. | Bölge II'nin sonu. |
| 14 | **10 Ashen Plain** | savaş | `ashen_plain`: 2 Ash Revenant (ön), Ash Hound (ön), Vanguard Pikeman (orta). Arka plan `ashen-plain`. | Bölge III girişi; körlük + yanma tanıtımı. |
| 15a | **thorn Thornwood Hollow** | elit | `dragons_spine`: Drake Priestess (elit), Drake Cultist, Drakeling, Thorn Treant. Arka plan `thornwood-hollow`. | Elit yolu (riskli, iyi loot). |
| 15b | **11B Siege Line** | savaş | `siege_line`: Siege Sergeant (adlı Pikeman, ön), Vanguard Pikeman (ön), 2 Siege Arbalist (arka). Arka plan `ashen-plain`. Alt başlık "Battle · Morvane's Vanguard". | Güvenli yol; ama sütun (Pike Thrust) ve arbalet baskısı. |
| 16 | **camp Forward Camp** | tüccar | Değişmez (Odo). | Son alışveriş. |
| 17 | **road Ember Road** | savaş | `ember_road`: 2 Morvane Outrider (ön), Pyre Witch (arka), Siege Arbalist (arka). Arka plan `ember-road`. | Hızlı düşmanlar (Ride Down) arka sırayı vurur. |
| 18 | **fold Shepherd's Fold** | olay + dinlenme | Dinlenme kalır (finalden önceki tek şifa). Olay: **mevcut mekanikle** daha iyi metin (çobanların kaçış hikâyesi, kale hakkında ipucu). **Yeni mekanikle (N2):** "kayıp sürüyü ara" seçeneği (küçük savaş: 2 Ash Hound) ya da "dinlen" seçeneği. | Son üç savaş öncesi hazırlık. |
| 19 | **head Riverhead** | savaş | `riverhead`: Cinder Knight (ön), Morvane Outrider (ön), 2 Riverhead Archer (arka). Arka plan `ember-road`. | Tank arkasında okçular; odak ateşi gerektirir. |
| 20 | **gate Gate of Cinders** | savaş | `gate_of_cinders`: 2 Cinder Knight (ön), Gate Ballista (arka), Pyre Witch (arka). Arka plan `ember-road`. | Finalden önce en sert normal savaş: guard + taunt duvarı ve ağır balista. |
| 21 | **12 Castle Morvane** | final boss | `lord_morvane`: Lord Morvane (boss), Cinder Knight (ön), Ash Revenant (ön), Pyre Witch (arka). Arka plan `castle-hall` (ya da `castle-morvane`). | Final: iki fazlı, telgraflı gerçek boss. |

Sonuç: 26 düğümün 26'sı amaçlı içerik taşır; savaşlı 21 düğümün 20'si yeni zone mobları kullanır (King's Bridge zaten özel).

## 5. Kasaba seçenekleri (Ashford Village ve Valdren Keep)

| # | Seçenek | Ne yapar | Mekanik durumu | Efor |
|---|---|---|---|---|
| T1 | **Town Merchant** | Kasabada da Odo'nun dükkânı açılır (Ashford küçük stok, Valdren Keep büyük). | Var olan tüccar ekranı. Kasaba düğümü hem dinlenme hem tüccar taşıyacak: küçük akış kodu gerekebilir (N3a). | **Küçük** (veri + küçük akış). |
| T2 | **Shrine / Blessing** | Altınla kutsama: sonraki savaşa takım `blessed` (2 tur, -%30 hasar) ya da `haste` ile başlar. | Durum var, ama "haritadan sonraki savaşa taşınan durum" YENİ kural (N3b). | **Orta**. |
| T3 | **Bounty Board (görev veren)** | Kasabada bir ödül ilanı alınır ("Misty Marsh'taki Bog Lurker'ları temizle"); o düğüm kazanılınca ek altın / item. | YENİ kural: görev takibi + kayıtta saklama (N3c). | **Orta-büyük**. |
| T4 | **Training Yard (sparring)** | İsteğe bağlı antrenman savaşı (zone moblarına karşı): can kaybı kalıcı değil, küçük altın ödülü; ya da altınla bir kahramanın item'ine +1 seviye. | YENİ kural (can taşımayan savaş ya da item yükseltme) (N3d). Yetenek ağaçları gelince oraya bağlanabilir. | **Orta**. |
| T5 | **Story Scene / Tavern Rumors** | Kasabaya girişte kısa hikâye sahnesi (Ashford: Kül Laneti haberi; Valdren: köprü ve Warden). İsteğe bağlı: sonraki iki durağın sisini açar. | Metin sahnesi var olan olay metin sistemiyle yapılabilir; **sis açma YENİ** (N3e). | Metin: **küçük**; sis açma: **orta**. |

Önerim: önce **T1 + T5 (yalnızca metin)** (neredeyse hiç yeni kural yok), sonra T2.

## 6. AYRI LİSTE: yeni mekanik, durum ya da kural gerektirenler (Ömer'in açık onayı şart)

| Kod | Ne | Neden gerekli | Alternatif (yeni kural olmadan) |
|---|---|---|---|
| **N1** | **`data/mobs/` gizli birim kategorisi.** Boss'lar gibi: takım seçiminde, rastgele savaşta, Endless havuzunda ve denge sim'inde görünmez; "tam 4 skill / stat toplamı" class kuralları uygulanmaz (moblar 2-3 skill). | Yeni moblar class olarak eklenirse oyuncu da seçebilir ve 4 skill kuralı bozulur. | Her mobu `data/bosses/` altına koymak (çalışır ama adı yanıltıcı) ya da 4 skill'li gizli class yapmak (iş artar). |
| **N2** | **Seçenekli olaylar** (Witch's Hut pazarlığı, Shepherd's Fold "sürüyü ara"). | Olaylar bugün yalnızca metin. | Olay düğümünü korumalı hazine gibi kullanmak (yalnızca veri; 4. bölümde varsayılan bu). |
| **N3a** | Kasabada tüccar (dinlenme + tüccar aynı düğümde). | Kasaba akışı tek türü işliyor olabilir. | Tüccarı kasabanın yanındaki ayrı düğüme koymak (harita değişir). |
| **N3b** | Shrine: haritadan sonraki savaşa taşınan durum. | Yeni kural. | Yok. |
| **N3c** | Bounty / görev takibi (kayıt şeması değişir). | Yeni kural. | Yok. |
| **N3d** | Training Yard: kalıcı can kaybı olmayan savaş ya da item seviye yükseltme. | Yeni kural. | Yok. |
| **N3e** | Sisi açan hikâye sahnesi. | Görünürlük kuralı değişir (`alwaysVisible` var, ama olayla açma yok). | Yalnızca metin sahnesi. |
| **N4** | **Mob ölçeklemesi:** `campaign.json > enemyScale` ve zorluk çarpanları moblara da uygulanmalı (bugün karşılaşma birimine uygulanıyor; tür fark etmemeli). Denetlenmeli, muhtemelen kural değişmez. | Doğrulama. | — |
| **N5** | **Lord Morvane boss tanımı:** Warden'ın boss altyapısını (fazlar, telgraf, Unyielding) ikinci bir boss için kullanmak. Kural yeni değil, ama `ai.json`'a yeni boss YZ profili ve "telgraflı tüm sıra + zemin" birleşimi küçük motor işi isteyebilir. | Bugünkü Morvane jenerik. | Morvane'ı can çarpanlı mob olarak bırakmak (bugünkü gibi), yalnızca sprite + skill'ler. |
| **N6** | `pull` etkisini Iron Mooring şartı olmadan kullanmak (Bog Lurker). Etki motorda genel; şart yalnızca Chain Hook verisinde. YZ'nin pull değerlemesi Warden kombosuna göre yazılmış olabilir. | Doğrulama, muhtemelen kural yok. | Drag Under yerine hasar + `slow`. |
| Reddedilen | Ölünce patlayan / zemin bırakan mob, element direnci, yeni durum (ör. "Bleed", "Fear"). | YENİ mekanik; bu planda KULLANILMADI. | — |

**Bilinçli olarak YENİ durum eklenmedi.** Bütün skill'ler `statuses.json`'daki 20 durumdan ve `grounds.json`'daki 4 zeminden yararlanıyor.

## 7. Efor tahmini ve yapım sırası

### Görsel varlıklar
| Tür | Zorunlu | İsteğe bağlı |
|---|---|---|
| Mob sprite'ları (idle illüstrasyonu; mevcut kurala göre tek ayakta görsel yeterli) | 27 sıradan + 2 elit + 1 boss = **30** | +2 (Moor Boar, Cave Crawler), +1 Bandit Chief yeni görünüm, +1 Thorn Treant renk varyantı |
| Savaş arka planları | **9** (Z1-Z6, Z8-Z10) | +1 `castle-morvane`, +4 düğüme özel (watchtower, mine, cathedral, abbey vault) |
| Skill ikonları / efektleri | **0** (`artOf` ile var olanlardan ödünç) | ~5 imza ikon (Morvane'ın 3 skill'i, Drake Priestess'in Call the Brood'u, Gate Ballista) |
| Sınıf / mob logoları | 0 (var olan logolar) | 30 mob logosu, Codex için |

### Kod ve veri
- **Kod (küçük):** `data/mobs/` yükleyicisi + testleri (~60-100 satır; N1); Morvane boss YZ profili (N5, ~50-150 satır, veriye ağırlıklı); Gate Ballista için `overrides.spd` (var olan alan). Seçilirse kasaba / olay mekanikleri ayrıca (N2, N3: her biri orta).
- **Veri (orta):** ~30 birim dosyası (`data/mobs/*.json`, her biri ~25 satır); ~70 yeni skill (`skills.json`'a ~1.200-1.600 satır, çoğu var olan skill'in sayı kopyası + `artOf`); 22 karşılaşmanın yeniden yazımı (`encounters.json`); 9-14 arka plan kaydı + zemin çizgisi ölçümü (`battle-layout.json`, `valdoria.json` düğüm/bölge `battleBackground`); olay metinleri (`events.json`).
- **Denge:** her faz sonunda `npm run sim:campaign` (balance-tester), çünkü yeni moblar sınıf kopyalarından farklı vuracak.

### Önerilen yapım sırası
1. **Faz 1: altyapı + orta bölümün ilk yarısı.** N1 yükleyicisi; Z2, Z3, Z4 mobları (9 sprite) ve arka planları (3); bölge yedeği olarak `border-road` / `valley-field` / `ashen-heights` görsellerinin de bağlanması (bugünkü `castle-hall` sorununu hemen çözer); Witch's Hut ödülünü hazine sandığına bağlama; T1 + T5 metin seçilirse burada. Denge ölçümü.
2. **Faz 2: orta bölümün ikinci yarısı + Bölge III'ün başı.** Z5, Z6, Z8, Z9 mobları (11 sprite + 2 elit) ve arka planları (4). Denge ölçümü.
3. **Faz 3: final yolu + eğitim + seçilen yeni mekanikler.** Z10 mobları (4) ve arka planı, Lord Morvane boss'u (N5), Z1 eğitim mobları (3; eğitim dengesi en son ve dikkatle), onaylanırsa seçenekli olaylar (N2) ve kasaba ekleri (T2-T4). Sefer mantığı işi (İLK YAPILACAKLAR 2. madde) bundan sonra başlar.
