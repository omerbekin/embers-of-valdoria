# Valdoria haritasını doldurma planı (A1-x, 26 düğüm)

> **Durum: TASARIM PLANI, revizyon 2 (content designer, 2026-10-12).** Kod, veri ya da commit değişmedi.
> **Ömer'in onayları (2026-10-12):** N1 (gizli `data/mobs/`), N2 (seçenekli olaylar, artık KAPSAMDA), N5 (Lord Morvane gerçek fazlı boss), N3a (kasabada tüccar, T1), N3e (sisi açan hikâye sahnesi, T5), 3 fazlı yapım sırası. T2, T3, T4 sonra. Zone sayısı uygun.
> **Bu revizyondaki değişiklikler (Ömer'in istekleri):** (1) zone başına ayrı moblar yerine **8 tekrar eden mob ailesi**; her ailenin oyuncunun öğreneceği tek bir imza hilesi var, aile önce kolay bir düğümde tanıtılıyor, sonra zor birleşimlerde geri geliyor. (2) **Mob başına 2 skill** (temel saldırı dahil), birkaç mobda 3. (3) Bölüm 2, 4, 5, 6, 7 buna göre yenilendi; sprite sayısı 30'dan 16'ya indi.
> Kaynaklar: `data/campaign/valdoria.json`, `campaign.json`, `encounters.json`, `events.json`, `data/classes/*`, `data/bosses/*`, `data/summons/*`, `data/skills.json`, `data/statuses.json`, `data/grounds.json`, `src/game/battle-background.ts`, `src/campaign/encounters.ts`, `docs/design/campaign/valdoria-2x.md`, `docs/design/future-ideas.md` (İLK YAPILACAKLAR satırı: önce harita doldurma, sonra sefer mantığı, sonra yetenek ağaçları; element/durum sistemi ERTELENDİ).
> Oyun içi adlar (mob, skill, düğüm) İngilizce; açıklamalar Türkçe.

## 0. Bugünkü durum: önemli bulgular

1. **Hiçbir düğüm tamamen boş değil**, ama çoğu **jenerik**: 22 savaşın tamamı oyuncunun da seçtiği 11 sınıfın yeniden adlandırılmış kopyası (warrior, archer, defender...). Bölgeye özgü tek düşman King's Bridge'deki Bridge Warden.
2. **Sefer savaşları neredeyse hep `castle-hall` arka planında geçiyor.** Bölgeler `border-road`, `valley-field`, `ashen-heights` arka planlarını istiyor, ama bu dosyalar `assets/backgrounds/` altında YOK; seçim kuralı (karşılaşma > düğüm > bölge > varsayılan) bu yüzden varsayılan `castle-hall`'a düşüyor. Yalnızca King's Bridge'in kendi arka planı var.
3. **Arka plan altyapısı hazır:** düğüm başına `battleBackground` ve karşılaşma başına `background` alanları zaten destekleniyor (`src/campaign/encounters.ts`). Yeni arka planlar için kod gerekmiyor, yalnızca görsel, veri ve zemin çizgisi ölçümü (`battle-layout.json > backgrounds.floor`).
4. **Skill sanatı ödünç alınabiliyor:** skill'deki `artOf` alanı, ikonu, efekti ve sesi var olan bir skill'den alır (Pose Tester böyle çalışıyor). Mob skill'leri bu yolla **yeni ikon ve efekt çizmeden** yapılabilir.
5. **Mob'lar "class" olamaz:** class'lar "tam 4 skill" kuralına bağlı ve takım seçiminde, rastgele havuzda ve sim'de görünür. Bridge Warden bu yüzden `data/bosses/` altında gizli tanımlı. Yeni moblar aynı türde gizli bir **`data/mobs/`** kategorisine girer (**N1, ONAYLANDI**).
6. Olaylar (Witch's Hut, Shepherd's Fold) bugün yalnızca **yer tutucu metin** ("Events with choices are coming soon"). Seçenekli olay (**N2, ONAYLANDI**) artık bu planın parçası; tasarımları 4. bölümde.
7. Lord Morvane (final boss) bugün `undead` sınıfının can çarpanlı kopyası. Bridge Warden için yazılan boss altyapısı (fazlar, afiş, telgraf, Unyielding) veriyle yönetiliyor; Morvane bunu kullanacak (**N5, ONAYLANDI**).

## 1. Bölge (zone) tablosu

Haritanın resmi 3 bölgesi (I, II, III) aynı kalır (etiketler, tablo); içerik ve arka plan için **11 alt bölge (zone)** kullanılır. Yeni sütun: zone'da hangi mob aileleri karışıyor (aileler 2. bölümde).

| Zone | Ad | Tema (tek cümle) | Düğümler | Aileler |
|---|---|---|---|---|
| Z1 (I) | **The Borderlands** | Kül Laneti'nden kaçan haydutların istila ettiği kıyı tarlaları ve Ravenwood ormanı. | 1 Mill Road, 2 Ravenwood, 3 Ruined Watchtower (elit), 4 Ashford Village (kasaba) | Bandits, Beasts |
| Z2 (II) | **Windy Moor & Charwood** | Rüzgârın dövdüğü fundalık ve dumanı tüten kömürcü ormanları; akıncılar ve Kül Tarikatı'na kapılmış kömürcüler. | moor Windy Moor, charcoal Charcoal Camp | Bandits, Ember Cult, Guardians (yalnızca Charcoal Camp) |
| Z3 (II) | **The Iron Hills** | Terk edilmiş cüce geçidi ve madeni; dağ haydutları ve taşa dönmüş eski muhafızlar. | 5B Iron Pass, 6B Dwarven Mine (hazine) | Guardians, Bandits |
| Z4 (II) | **Misty Marsh** | Sisle boğulmuş kara sulu bataklık; boğulmuşlar kıpırdıyor, bir çalı cadısı kendi sarayını kurmuş. | 5A Misty Marsh, 6A Witch's Hut (olay) | Hexes, Undead |
| Z5 (II) | **The Dead Fields** | Eski bir savaş mezarlığı ve kirletilmiş kara katedral; lanet ölüleri kaldırıyor. | grave Grave Field, 8C Black Cathedral (elit) | Undead, Hexes |
| Z6 (II) | **Pilgrim's Way** | St. Brann'a giden hac yolu; sahte hacılar ve bağnazlar yolcuları avlıyor, manastırın yeminli bekçileri emanetleri koruyor. | pilgrim Pilgrim Road, 8A St. Brann's Abbey (hazine), river Riverside Camp (dinlenme) | Fanatics, Guardians, Hexes (+ bir Bandit varyantı) |
| Z7 (II) | **King's Bridge** | Kral Köprüsü ve Bridge Warden. | 9 King's Bridge (boss) | **TAMAM**, değişiklik yok. |
| Z8 (III) | **The Ashen Plain** | Kül gömülü gri savaş alanı; Morvane'ın öncüleri kuşatma hattı kazıyor, düşenler korun içinden kalkıyor. | 10 Ashen Plain, 11B Siege Line, camp Forward Camp (tüccar) | Morvane's Army, Undead, Beasts |
| Z9 (III) | **Thornwood Hollow** | Dikenlerle boğulmuş bir çukur; Ejder Tarikatı için için yanan inini burada saklıyor. | thorn Thornwood Hollow (elit) | Ember Cult, Fanatics |
| Z10 (III) | **The Ember Road** | Kuzeye giden son yanık yol, külle kaplı pınar başı ve Morvane'ın kapı kulesi; hane şövalyeleri devriyede. | road Ember Road, fold Shepherd's Fold (olay + dinlenme), head Riverhead, gate Gate of Cinders | Morvane's Army, Guardians, Ember Cult (+ Beasts, Fold olayında) |
| Z11 (III) | **Castle Morvane** | Kül içinde boğulmuş Morvane'ın taht salonu. | 12 Castle Morvane (final boss) | Boss + Guardians, Undead, Ember Cult eskortları |

Not: Z2 ve Z6 dört aile karıştırıyor. Sebep rota kapsamı: çatallı yollarda her oyuncunun her aileyi zor bir savaştan ÖNCE kolay bir yerde görmesi gerekiyor (4. bölüm sonundaki kapsam tablosu).

## 2. Mob aileleri

### 2.1 Ortak kurallar

- **Skill sayısı (Ömer 2026-10-12): TEMEL SALDIRI SKILL SAYILIR.** Sıradan bir mobun tam **2 eylemi** vardır: **1 temel saldırı** (bekleme süresi yok, MP yok) + **1 imza skill'i** (bekleme süreli). Bazı moblar (varyant ya da adlı lider) **3. bir skill** taşır; tabloda "3. skill" diye ayrıca yazılır. Elitler ve boss'lar daha zengin (4+).
- **Pasif skill sayılmaz.** Bir mobda en çok 1 pasif olur ve yalnızca ailenin imza hilesinin parçasıysa verilir (Bandits Opportunist, Fanatics Berserker, Guardians Bulwark Aura, Ghoul Vampiric Bite).
- Global eylemler (Rest / Skip / Move) bugün olduğu gibi her birimde var; sayılmaz.
- Her mob `data/mobs/` altında gizli birim (N1).
- **Varyant** = aynı ailenin aynı çekirdek davranışı, farklı ad ve görünüş, en çok **bir** skill değişimi ya da eklemesi. Varyantlar çoğunlukla **taban sprite'ın renk değişimi (palet)** ile çizilir: aynı çizim ve poz, yeni renkler, ayrı dosya (`assets/sprites/<id>/idle.png`). Kod gerekmez.
- Yalnızca **var olan** etki türleri ve durumlar kullanılır: hasar (`damage`), durum (`slow`, `haste`, `wound`, `stun` [şanslı da olur], `fortify`, `blessed`, `blinded`, `shrouded`, `jinxed`, `fleet`, `burning`), DoT (`wither`, `burning`), şifa / HoT, kalkan, dispel, zemin (`poison`, `burning`, `holy_fire`, `flooded_planks`), çağırma (`skeleton`, `treant`), taunt, guard, pull, omen, manaBurn, alan şekilleri (row, column, rect, plus, x), `area_any` ile dostlara durum (Smoke Bomb gibi), HP bedeli (`cost.ofCurrent`), `ignoreFrontRow`, `requiresOpenBehind`, `repeatChance`, `ignoreDefense`, `falloff`, `guaranteedCrit`.
- Pasifler de yalnızca var olanlar: Berserker (`rage`), Opportunist (`bonusVsStatus`), Vampiric Bite (`soulDrain`), Bulwark Aura (`armorAura`), Unyielding (Warden).
- "Şablon" = sayıları ve sanatı (`artOf`) ödünç alınacak var olan skill. Sayılar PROVİZYON; denge `sim:campaign` ile. CD = bekleme süresi (tur).
- Element alanı yalnızca görsel etiket (element/direnç sistemi ertelendi).
- 2026-10-25: lightning hasar türü oyuna girdi (yalnız hasar; haller hâlâ plan). Yeni mob planlamalarında lightning de kullanılacak.
- ★ = ailenin ilk tanıtıldığı yer (4. bölümde de işaretli).

### 2.2 Aileler ve imza hileleri (özet)

| # | Aile | İmza hilesi (oyuncunun öğreneceği) | Oyuncunun kazanacağı alışkanlık | ★ İlk tanıtım |
|---|---|---|---|---|
| 1 | **Bandits** | Yavaşlatır, sonra yavaşlamış / yaralı hedefe daha sert vurur (Hamstring / Snare Shot + Opportunist). | Slow yiyen kahramanı geri çek ya da önce okçuyu indir. | 1 Mill Road |
| 2 | **Beasts** | Isırık `wound` bırakır; Pack Howl sürünün hızını artırır. | Sürüyü Howl'dan önce alanla böl; hızlanınca sıra çubuğunu izle. | 2 Ravenwood |
| 3 | **Ember Cult** | 2x2 **yanan zemin** kurar. | Zemine bak, Move ile çık; arkadaki rahibi önce indir. | 5 Windy Moor |
| 4 | **Guardians** | **Taunt** ile vuruşları kendine çeker; zırhlı, dostlarına zırh verir. | Duvarı alan ve arka sıra saldırısıyla aş; ya önce kır ya en sona bırak. | 6a Iron Pass / 6b Charcoal Camp (iki dal da) |
| 5 | **Hexes** | Her temel saldırı 1 **Omen** biriktirir (3'te Doom); cadı alana Wither yayar. | Omen 3'e varmadan cadıyı öldür; çok Omen'li kahramanı koru. | 8b Witch's Hut / 8c Misty Marsh; 8a rotası için 10 Pilgrim Road |
| 6 | **Undead** | Can çalar (Ghoul) ve cesetten yeniden kalkar (Grave Chanter'ın Raise Dead'i). | Çağırıcıyı önce öldür; ceset bırakma sırasını düşün. | 8b / 8c (Drowned varyantı); çekirdek üyeler 9 Grave Field |
| 7 | **Fanatics** | Kendi canını yakarak sıraya sert vurur; canı azaldıkça güçlenir (Mortify + Berserker). | Yarım bırakma: odaklanıp tek seferde indir. | 10 Pilgrim Road |
| 8 | **Morvane's Army** | Dizilimi deler: mızrak sütunu boydan vurur, süvari ön sırayı atlar, arbalet zırhı deler. | Arka sıra güvende değil; tek sütuna yığılma, dağınık diz. | 14 Ashen Plain |

Aile dışında kalanlar: var olan **Cutpurse** (cutthroat, yalnızca eğitim), var olan **Thorn Treant** (treant çağrısı, Z9), benzersiz elitler ve boss'lar (2.4).

### 2.3 Aile tabloları

#### 1. Bandits (haydutlar)

| Birim | Tür | Rol | Görünüş | Skill'ler (2 = temel + imza) | Pasif | Düğümler |
|---|---|---|---|---|---|---|
| **Road Thug** | çekirdek, YENİ sprite | brute (ön) | Yamalı deri yelekli, sopalı, iri, kel köylü haydut. | **Cudgel** (—): STR hasarı (şablon Bone Strike). **Hamstring** (CD 2): hasar + 2 tur `slow`. | Opportunist (slow / wound'lu hedefe +%25) | ★1, 2 |
| **Bandit Crossbowman** | çekirdek, YENİ sprite | ranged (arka) | Kürk yakalı, arbaletli, dağ eşarplı haydut. | **Bolt** (—): DEX hasarı, savunmanın %25'ini yok sayar (`ignoreDefense`). **Snare Shot** (CD 2): DEX hasarı + 2 tur `slow` (şablon Bone Throw). | Opportunist | 6a, 8a (Z3'te adı **Pass Crossbowman**) |
| **Ravenwood Poacher** | varyant (Crossbowman, yeşil kukuleta paleti) | ranged | Yeşil kukuletalı, belinde tavşan asılı kaçak avcı. | Crossbowman ile aynı. | Opportunist | 2, 3 |
| **Moor Raider** | varyant (Road Thug, yün pelerin + yüz boyası paleti) | melee | Rüzgârda savrulan yün pelerinli fundalık akıncısı. | Road Thug ile aynı. | Opportunist | 5 |
| **False Pilgrim** | varyant (**var olan cutthroat sprite'ı**, kirli hacı cübbesi paleti) | melee (suikast) | Kirli hacı cübbesi, deniz kabuğu rozeti, altında hançer. Temel saldırı aynı (**Cudgel**, oyunda adı "Hidden Knife"). Değişen skill: **Ambush** (CD 4), Hamstring yerine: arkası boş hedefe garantili kritik (`requiresOpenBehind` + `guaranteedCrit`, Backstab'ın zayıfı). | Opportunist | 10 |
| Elit: **Bandit Chief** | var olan warrior elit | | Değişmez (isteğe bağlı yeni görünüm). | Değişmez. | | 3 |

#### 2. Beasts (sürü hayvanları)

| Birim | Tür | Rol | Görünüş | Skill'ler | Pasif | Düğümler |
|---|---|---|---|---|---|---|
| **Grey Wolf** | çekirdek, YENİ sprite | melee, hızlı | Kır tüylü, sıska, gözleri kor gibi parlayan kurt (Ravenwood'da "Ravenwood Wolf" adıyla). | **Bite** (—): DEX hasarı + 2 tur `wound` (şablon Venom Edge). **Pack Howl** (CD 4): 2x2 alanda dostlara 2 tur `haste` (Smoke Bomb'un `area_any` + `side: allies` yapısı). | — | ★2 |
| **Ash Hound** | varyant (Grey Wolf, kara + kor paleti) | melee, hızlı | Kara, kemikleri görünen, ağzından kıvılcım saçan av köpeği. | Değişen skill: **Searing Bite** (—), Bite yerine: hasar + 2 tur `burning` DoT. **Pack Howl** aynı. | — | 14, 18 (olay savaşı) |

#### 3. Ember Cult (Kül Tarikatı)

| Birim | Tür | Rol | Görünüş | Skill'ler | Pasif | Düğümler |
|---|---|---|---|---|---|---|
| **Ember Acolyte** | çekirdek, YENİ sprite | caster (arka) | Kurum lekeli kızıl cüppe, kül maskesi, elinde tüten kor kovası. | **Ember Toss** (—): INT ateş hasarı (Fire Bolt'un zayıfı). **Burn the Ground** (CD 3): 2x2 alana 2 tur `burning` zemini, küçük hasar (Meteor'un zemin kısmı). | — | ★5 |
| **Charcoal Burner** | varyant (Acolyte, is-siyahı önlük paleti) | caster | Kurumla kararmış önlüklü, maskeli kömürcü. | Acolyte ile aynı. | — | 6b |
| **Drake Cultist** | varyant (Acolyte, koyu kızıl + altın pul paleti) | caster | Ejder pulu desenli maske, kızıl cüppe. | Acolyte'in 2 skill'i + **3. skill Kindle** (CD 2): hasar + 3 tur `burning` DoT. | — | 15a |
| **Pyre Witch** | varyant (Acolyte, kül grisi + kor paleti) | caster | Saçları duman gibi yükselen, kül maskeli. | Acolyte'in 2 skill'i + **3. skill Firestorm** (CD 4): 3x2 alanda ateş hasarı (Blizzard şekli). | — | 17, 20, 21 |
| **Drakeling** | tarikat çağrısı, YENİ sprite (`data/summons/` kopyası; haritada tek başına çıkmaz) | ranged | Kedi boyunda, kızıl pullu, kanatları yırtık ejder yavrusu. | **Bite** (—, Grey Wolf'unki). **Spit Fire** (CD 3): bir sıraya ateş hasarı + 1 tur `burning` zemini. | — | 15a (Drake Priestess çağırır) |

#### 4. Guardians (muhafızlar)

| Birim | Tür | Rol | Görünüş | Skill'ler | Pasif | Düğümler |
|---|---|---|---|---|---|---|
| **Shieldwarden** | çekirdek, YENİ sprite | tank (ön) | Kapalı miğferli, kule kalkanlı, plaka zırhlı paralı muhafız. | **Shield Bash** (—): STR + zırhtan bonus hasar (Fist Crush'ın `bonusScale armor`'ı). **Hold the Line** (CD 4): taunt. | Bulwark Aura | ★6b |
| **Stonebound Warden** | varyant (Shieldwarden, taş grisi + sönük rün ışığı paleti) | tank | Yarısı taşa dönmüş eski cüce geçidi muhafızı. | Shieldwarden ile aynı. | Bulwark Aura | ★6a |
| **Abbey Keeper** | varyant (Shieldwarden, beyaz-altın tabard paleti) | tank / destek | Beyaz-altın tabardlı manastır muhafızı. | 2 skill aynı + **3. skill Sanctuary** (CD 3): bir dosta 2 tur `blessed`. | Bulwark Aura | 11a |
| **Cinder Knight** | varyant (Shieldwarden, kara plaka + kor çatlakları paleti) | tank | Kor çatlaklı kara zırh, alev desenli kalkan. | 2 skill aynı + **3. skill Shield Wall** (CD 4): bir dosta `guard` (Guard). | Bulwark Aura | 19, 20, 21 |
| Adlı: **Thane of the Deep** | Stonebound Warden + `name`, `hpMult` | | Yeni sprite yok. | 2 skill + **3. skill Shield Wall**. | Bulwark Aura | 8a |
| Adlı: **Brother-Castellan** | Abbey Keeper + `name`, `hpMult` | | Yeni sprite yok. | Abbey Keeper ile aynı. | Bulwark Aura | 11a |

#### 5. Hexes (cadılar ve ışıklar)

| Birim | Tür | Rol | Görünüş | Skill'ler | Pasif | Düğümler |
|---|---|---|---|---|---|---|
| **Fen Witchling** | çekirdek, YENİ sprite | caster (arka) | Ot taçlı, kemik muskalı, kambur genç cadı çırağı. | **Hex Bolt** (—): LUCK karanlık hasar + 1 `omen` (Evil Eye). **Bog Curse** (CD 3): 2x3 alanda küçük hasar + 3 tur `wither` (Withering Curse). | — | ★8b, ★8c |
| **Will-o'-Wisp** | çekirdek, YENİ sprite | destek (arka) | Yeşil-mavi titrek ışık topu, içinde soluk bir yüz. | **Spark** (—): INT büyü hasarı + 1 `omen`. **Marsh Glow** (CD 3): bir dosta şifa + 3 tur HoT (Rejuvenate'in zayıfı). | — | 8b (olay savaşı), 8c |
| **Wayside Wisp** | varyant (Wisp, soluk altın paleti) | destek | Hacıları yoldan çıkaran sahte kandil ışığı. | Wisp ile aynı. | — | ★10 (8a rotası için ilk Hex), 11a |
| **Grave Witch** | varyant (Witchling, mor-siyah paleti) | caster | Mezar toprağına bulanmış, mor muskalı cadı. | Witchling ile aynı. | — | 11b |
| Adlı: **Hedge Witch Morwen** | Fen Witchling + `name`, `hpMult` | lider | Yeni sprite yok. | 2 skill + **3. skill Lure Light** (CD 2): hasar + 2 tur `jinxed`. | — | 8b (olayın "Steal" seçeneği) |

#### 6. Undead (ölüler)

| Birim | Tür | Rol | Görünüş | Skill'ler | Pasif | Düğümler |
|---|---|---|---|---|---|---|
| **Risen Skeleton** | çekirdek, **var olan `skeleton` çağrısı** (yeni sprite YOK) | melee | Var. | **Bone Strike**, **Bone Slash** (var; zaten 2 skill). | — | 9, 11b |
| **Ghoul** | çekirdek, YENİ sprite | brute (ön) | Kambur, gri derili, uzun tırnaklı ceset yiyici. | **Gnaw** (—): STR hasarı + 2 tur `wound`. **Feast** (CD 3): güçlü tek vuruş. | Vampiric Bite | ★9 |
| **Grave Chanter** | çekirdek, YENİ sprite | destek (arka) | Yırtık siyah cüppeli, paslı fenerli, ağzı dikili ölü rahibi. | **Dirge** (—): karanlık hasar + 2 tur `slow` (Bone Throw). **Raise Dead** (CD 5, var: cesetten iskelet). | — | ★9, 11b |
| **Drowned** | varyant (Ghoul, yosun yeşili + bataklık mavisi paleti) | brute | Sazla sarılmış, şişmiş, sudan yarı çıkmış boğulmuş. | **Gnaw** aynı. Değişen skill: **Drag Under** (CD 3), Feast yerine: hasar + hedefi kendi şeridinin önüne çeker (`pull`, Chain Hook'un etkisi, Mooring şartı yok; N6). | Vampiric Bite | ★8b, ★8c |
| **Ash Revenant** | varyant (**var olan skeleton sprite'ı**, kül grisi + kor çatlakları paleti) | melee | Külden yapılmış, çatlaklarından kor sızan eski asker. | **Bone Strike** aynı (adı "Cinder Blade"). Değişen skill: **Ash Cloud** (CD 3), Bone Slash yerine: 2x2 alanda düşmanlara 2 tur `blinded`. | — | 14, 21 |

#### 7. Fanatics (bağnazlar)

| Birim | Tür | Rol | Görünüş | Skill'ler | Pasif | Düğümler |
|---|---|---|---|---|---|---|
| **Flagellant** | çekirdek, YENİ sprite | brute (ön) | Çıplak sırtı yaralı, kırbaçlı, kukuletalı bağnaz. | **Scourge** (—): STR hasarı. **Mortify** (CD 3): kendi MEVCUT canının %15'ini harcar (`cost.ofCurrent`, asla öldürmez), bir sıraya güçlü hasar. | Berserker (canı azaldıkça sert) | ★10, 11a |
| **Pyre Zealot** | varyant (Flagellant, kül + kor yanık paleti) | brute | Sırtında kor yanıkları, elinde zincirli tütsü. | Flagellant ile aynı. | Berserker | 15a |

#### 8. Morvane's Army (Kül Ordusu)

| Birim | Tür | Rol | Görünüş | Skill'ler | Pasif | Düğümler |
|---|---|---|---|---|---|---|
| **Vanguard Pikeman** | çekirdek, YENİ sprite | melee (ön) | Kül grisi armalı, uzun mızraklı, kalkanlı öncü. | **Jab** (—): STR hasarı. **Pike Thrust** (CD 2): bir sütuna (column) azalan fiziksel hasar (Piercing Arrow, STR'li, `falloff`). | — | ★14, 15b |
| **Morvane Outrider** | çekirdek, YENİ sprite | melee, hızlı | Kül renkli pelerinli, hafif zırhlı, kılıçlı atsız süvari. | **Saber** (—): STR hasarı. **Ride Down** (CD 3): ön sırayı atlayıp hasar + 1 tur `stun`, öne geçer (Charge; `ignoreFrontRow`). | — | 17 (ailenin bu üyesinin ilk görünüşü), 19 |
| **Siege Arbalist** | ailede üye; sprite = **Bandit Crossbowman, kül grisi pelerin paleti** | ranged (arka) | Morvane armalı ağır arbaletçi. | **Bolt** (—, Crossbowman'ınki). **Pinning Bolt** (CD 3): güçlü tek atış, savunmanın %50'sini yok sayar (Aimed Shot'un zayıfı). | — | 15b, 17, 19, 20 |
| Adlı: **Siege Sergeant** | Vanguard Pikeman + `name`, `hpMult` | lider | Yeni sprite yok. | 2 skill + **3. skill Brace** (CD 4): kendine 1 tur `fortify`. | — | 15b |
| *(isteğe bağlı)* **Gate Ballista** | YENİ sprite | ranged (kuşatma), çok yavaş (`overrides.spd`) | Kapı kulesine sabit ağır mancınıklı yay. | **Iron Bolt** (—). **Bolt Thrower** (CD 2): bir sütuna yüksek hasar, savunmanın %50'sini yok sayar. | — | 20 (yoksa adlı "Gate Arbalist" = Siege Arbalist + `hpMult`) |

### 2.4 Benzersiz elitler ve boss'lar (aile dışı, daha zengin)

| Birim | Rol | Görünüş | Skill'ler | Düğüm |
|---|---|---|---|---|
| **Bandit Chief** (var) | elit | Var olan warrior elit. | Değişmez. | 3 |
| **High Priest of the Undying** (YENİ sprite) | caster elit | Kemik taçlı, mor-siyah cübbeli, mum ışığında süzülen baş rahip. | **Bone Throw** (—). **Wail of the Dead** (CD 3, var: artı alan + `poison` zemini). **Unholy Hymn** (CD 3): dosta şifa + HoT (Rejuvenate). **Raise Dead** (CD 5). Pasif: Vampiric Bite. (Undead ailesinin büyütülmüş hali.) | 11b |
| **Drake Priestess** (YENİ sprite) | caster elit | Boynuzlu ejder kafatası başlıklı, kanat gibi açılan pelerinli başrahibe. | **Fire Bolt** (—). **Meteor** (CD 3, var). **Mana Barrier** (CD 3, var). **Call the Brood** (CD 6): Drakeling çağırır (var olan `summon` etkisi). (Ember Cult'ın büyütülmüş hali.) | 15a |
| **Bridge Warden** (var) | boss | Değişmez. | Değişmez. | 13 |
| **Lord Morvane** (YENİ boss sprite + `data/bosses/lord_morvane.json`, N5) | final boss | Uzun, zayıf, kül rengi zırhlı, kor dolu taç ve kırık kılıçlı lanetli lord; pelerininden kül dökülüyor. | **Ashen Blade** (—): STR ateş hasarı. **Ash Curse** (CD 3): 2x3 alanda hasar + `wither` + `omen` (Hexes hilesi). **Raise the Fallen** (CD 5): cesetten iskelet (Undead hilesi; Raise Dead). **Pyre of Valdoria** (CD 4, 2. fazdan): bir tur önceden telgraflı tüm sıraya ateş hasarı + 2 tur `burning` zemini (Ember Cult hilesi; Breaking Span'in telgraf + zemin yapısı). Pasif: Vampiric Bite + Unyielding. **Fazlar** (Warden altyapısı): %50'de "The Ember Crown wakes." afişi, tur başına 2 eylem. | 21 |

**Tasarım notu:** Morvane, oyuncunun yol boyunca öğrendiği üç ailenin hilesini birleştirir (Omen/Wither, ceset diriltme, yanan zemin). Final, yeni kural öğretmez; öğrenilenleri sınar. Eskortlar da tanıdık: Cinder Knight (Guardians), Ash Revenant (Undead), Pyre Witch (Ember Cult).

### 2.5 Sayım

- **Aile: 8.** Sıradan çekirdek üye: 13 (12'si yeni sprite, Risen Skeleton var olan). Varyant: 16 (hepsi palet; 14'ü yeni taban sprite'lardan, False Pilgrim cutthroat'tan, Ash Revenant skeleton'dan). Adlı lider: 4 (Thane, Morwen, Brother-Castellan, Siege Sergeant; sprite yok). Tarikat çağrısı: Drakeling.
- **3 skill'li sıradan moblar:** Drake Cultist, Pyre Witch, Abbey Keeper, Cinder Knight, Thane of the Deep, Hedge Witch Morwen, Siege Sergeant. Geri kalan tüm sıradan moblar 2 skill.
- **Kaldırılan önceki moblar** (aile yapısına sığmadığı için): Heath Slinger, Moor Boar, Tunnel Sapper, Cave Crawler, Bog Lurker (yerine Drowned), Bell Wraith, Riverhead Archer (archer sınıfı kopyası), Bog Thrall (undead sınıfı kopyası).
- **Yeni skill sayısı ~40** (önceki plan ~70): çoğu var olan skill'in sayı kopyası + `artOf`.

## 3. Arka planlar (zone başına)

Değişmedi. Tüm arka planlar için ortak istek: yandan görünüm, karakter yok, 16:9 en az 1920x1080 (tercihen 2580 genişlik, geniş ekran için), alt yaklaşık üçte bir düz yürünebilir zemin, zemin çizgisi görsel yüksekliğinin 0,6-0,7'sinde (ölçülüp `backgrounds.floor`'a yazılır), ortaçağ, boyalı piksel art, mevcut `proving-grounds` / `kings-bridge` diliyle aynı.

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

Birimler: ön = ön sıra, arka = arka sıra. ★ = ailenin (ya da bir üyenin) ilk görüldüğü yer. Tutorial düğümlerinde (1-3) bugünkü güç çarpanları ve ultimate kilitleri korunur.

| Durak | Düğüm | Tür | Karşılaşma / olay | Aileler | Amaç |
|---|---|---|---|---|---|
| 1 | **1 Mill Road** | savaş | `mill_road_thugs`: Road Thug (ön), Cutpurse (cutthroat, ön). Arka plan `border-road`. | **★Bandits** | Sıra çubuğunu öğret (değişmez); Hamstring + Opportunist'i tek düşmanla göster. |
| 2 | **2 Ravenwood** | savaş + katılım | `ravenwood_pack`: 2 Ravenwood Wolf (ön), Road Thug (ön), 2 Ravenwood Poacher (arka). | **★Beasts**, Bandits (★ranged üye) | Alan saldırısı öğret: sık dizili 5 düşman. Kurtlar Pack Howl ile hızı gösterir. |
| 3 | **3 Ruined Watchtower** | elit | `watchtower_chief`: Bandit Chief (elit), 2 Ravenwood Poacher (arka). İsteğe bağlı arka plan `ruined-watchtower`. | Bandits | İlk elit; eğitimi kapatır (değişmez). |
| 4 | **4 Ashford Village** | kasaba | Dinlenme + yeni bölük (var) + **T1 tüccar (küçük stok)** + **T5 hikâye sahnesi + sis açma** (5. bölüm). | — | Eğitimden sefere geçiş; ilk alışveriş. |
| 5 | **moor Windy Moor** | savaş | `windy_moor`: 2 Moor Raider (ön), Ember Acolyte (arka). Arka plan `windy-moor`. | Bandits, **★Ember Cult** | Yeni bölüğün ilk savaşı, kolay. Tek Acolyte yanan zemini tanıtır: oyuncu Move ile zeminden çıkmayı öğrenir. |
| 6a | **5B Iron Pass** | savaş | `iron_pass_ambush`: Stonebound Warden (ön), 2 Pass Crossbowman (arka). Arka plan `iron-pass`. | **★Guardians**, Bandits | Taunt duvarının arkasında tanıdık okçular: taunt'ı alanla ya da arka sıraya vurarak aşmayı öğretir. |
| 6b | **charcoal Charcoal Camp** | savaş | `charcoal_camp`: Shieldwarden (ön), 2 Charcoal Burner (arka). Arka plan `windy-moor`. | **★Guardians**, Ember Cult | Taunt seni yanan zeminde tutar: iki hilenin ilk birleşimi, ama yalnızca 3 birim. |
| 7 | **7 Valdren Keep** | şehir | Dinlenme + katılım (var) + **T1 tüccar (büyük stok)** + **T5 hikâye sahnesi + sis açma**. | — | Üçlü seçimden önce hazırlık. |
| 8a | **6B Dwarven Mine** | hazine (korumalı) | `mine_wardens`: Thane of the Deep (adlı Stonebound, ön), 2 Pass Crossbowman (arka). Ödül: cüce sandığı (var). İsteğe bağlı arka plan `dwarven-mine`. | Guardians, Bandits | Zor ama ödüllü: Shield Wall'lu güçlü bir taunt duvarı. Yalnızca bilinen aileler. |
| 8b | **6A Witch's Hut** | olay (korumalı, **N2**) | Önce `witchs_hut_guard`: 2 Drowned (ön), Fen Witchling (arka). Ardından **seçenekli olay** (aşağıda). | **★Hexes**, **★Undead** (Drowned) | Bugün ödülsüz olan düğüme gerçek bir sebep ve bir pazarlık. |
| 8c | **5A Misty Marsh** | savaş | `bog_ambush`: Drowned (ön), Fen Witchling (arka), Will-o'-Wisp (arka). Arka plan `misty-marsh`. | **★Hexes**, **★Undead** (Drowned) | Güvenli yol: Omen birikimi ve `pull` tanıtımı, 3 düşük tehditli birim. |
| 9 | **grave Grave Field** | savaş | `grave_field`: 2 Risen Skeleton (ön), Ghoul (ön), Grave Chanter (arka). Arka plan `grave-field`. | **★Undead çekirdek** (Ghoul, Chanter; 8a rotası için ailenin ilk görünüşü) | Birleşme noktası: ceset ve çağırma oyunu, "çağırıcıyı önce öldür". |
| 10 | **pilgrim Pilgrim Road** | savaş | `pilgrim_road`: Flagellant (ön), False Pilgrim (ön), Wayside Wisp (arka). Arka plan `pilgrim-road`. | **★Fanatics**, Bandits (Ambush varyantı), Hexes (**★8a rotası için**) | Arka sırayı tehdit eden suikastçı (Ambush) ve yarım bırakılınca tehlikeli bağnaz. |
| 11a | **8A St. Brann's Abbey** | hazine (korumalı) | `vault_keepers`: Brother-Castellan (adlı Abbey Keeper, ön), Abbey Keeper (ön), Flagellant (ön), Wayside Wisp (arka). Ödül: emanet kasası (var). Arka plan `pilgrim-road` ya da isteğe bağlı `abbey-vault`. | Guardians, Fanatics, Hexes | Ödül yolu: `blessed` + şifa + taunt ile çok dayanıklı bir duvar; önce Wisp'i indir. |
| 11b | **8C Black Cathedral** | elit | `black_cathedral`: High Priest of the Undying (elit), Risen Skeleton (ön), Grave Chanter (arka), Grave Witch (arka). Arka plan `grave-field` ya da isteğe bağlı `black-cathedral`. | Undead, Hexes | Elit yolu: iki çağırıcı + Omen baskısı; iyi loot. |
| 12 | **river Riverside Camp** | dinlenme | Değişmez: ücretsiz %50 şifa + altınla diriltme. İsteğe bağlı: köprü öncesi kısa hikâye metni (Warden'ın efsanesi). | — | Boss öncesi nefes. |
| 13 | **9 King's Bridge** | boss | Değişmez. | — | Bölge II'nin sonu. |
| 14 | **10 Ashen Plain** | savaş | `ashen_plain`: 2 Ash Revenant (ön), Vanguard Pikeman (ön), Ash Hound (ön). Arka plan `ashen-plain`. | **★Morvane's Army**, Undead, Beasts | Bölge III girişi: tanıdık iki ailenin kül varyantları arasında tek Pikeman; sütun hasarını öğretir. |
| 15a | **thorn Thornwood Hollow** | elit | `dragons_spine`: Drake Priestess (elit), Pyre Zealot (ön), Thorn Treant (ön, var olan çağrı), Drake Cultist (arka). Arka plan `thornwood-hollow`. | Ember Cult, Fanatics | Elit yolu: zemin + DoT + Drakeling çağrısı. |
| 15b | **11B Siege Line** | savaş | `siege_line`: Siege Sergeant (adlı Pikeman, ön), Vanguard Pikeman (ön), 2 Siege Arbalist (arka). Arka plan `ashen-plain`. Alt başlık "Battle · Morvane's Vanguard". | Morvane's Army | Güvenli yol, ama iki sütun + zırh delen arbaletler: dağınık diz. |
| 16 | **camp Forward Camp** | tüccar | Değişmez (Odo). | — | Son alışveriş. |
| 17 | **road Ember Road** | savaş | `ember_road`: 2 Morvane Outrider (ön), Pyre Witch (arka), Siege Arbalist (arka). Arka plan `ember-road`. | Morvane's Army (★Outrider), Ember Cult | Süvari ön sırayı atlar, arka sırada zemin yanar. |
| 18 | **fold Shepherd's Fold** | olay + dinlenme (**N2**) | Seçenekli olay (aşağıda); dinlenme her seçenekte olur (finalden önceki tek şifa). | Beasts (olay savaşı) | Son üç savaş öncesi hazırlık ve bir risk seçimi. |
| 19 | **head Riverhead** | savaş | `riverhead`: Cinder Knight (ön), Morvane Outrider (ön), 2 Siege Arbalist (arka). Arka plan `ember-road`. | Guardians, Morvane's Army | Taunt duvarının arkasında zırh delen okçular; odak ateşi. |
| 20 | **gate Gate of Cinders** | savaş | `gate_of_cinders`: 2 Cinder Knight (ön), Pyre Witch (arka), Gate Ballista (arka; isteğe bağlı, yoksa adlı "Gate Arbalist"). Arka plan `ember-road`. | Guardians, Ember Cult, Morvane's Army | Finalden önce en sert normal savaş: 6b'deki "taunt + yanan zemin" dersinin büyüğü, guard'lı. |
| 21 | **12 Castle Morvane** | final boss | `lord_morvane`: Lord Morvane (boss), Cinder Knight (ön), Ash Revenant (ön), Pyre Witch (arka). Arka plan `castle-hall` (ya da `castle-morvane`). | Boss + Guardians, Undead, Ember Cult | Final: iki fazlı, telgraflı gerçek boss; öğrenilen hileleri birleştirir. |

Sonuç: 26 düğümün 26'sı amaçlı içerik taşır; savaşlı 21 düğümün 20'si aile moblarını kullanır (King's Bridge zaten özel).

### 4.1 Rota kapsamı (her rota her aileyi önce kolay yerde görür mü?)

Çatallar: 6a/6b, 8a/8b/8c, 11a/11b, 15a/15b.

| Aile | 6a rotası | 6b rotası | 8a rotası | 8b / 8c rotası | Zor ilk karşılaşma riski |
|---|---|---|---|---|---|
| Bandits, Beasts | 1, 2 (herkes) | | | | Yok. |
| Ember Cult | 5 (herkes) | | | | Yok. |
| Guardians | 6a | 6b | | | Yok (iki dal da tanıtır). |
| Hexes | | | 10 (tek Wayside Wisp, destek) | 8b / 8c | Yok. |
| Undead | | | 9 | 8b / 8c (Drowned), 9 (çekirdek) | Yok. |
| Fanatics | 10 (herkes) | | | | Yok. |
| Morvane's Army | 14 (herkes) | | | | Yok. |

8a rotasındaki oyuncu 10 Pilgrim Road'da iki aileyi (Fanatics, Hexes) ilk kez aynı savaşta görür; Hex üyesi orada yalnızca destekçi bir Wisp olduğu için savaş yine düşük risklidir.

### 4.2 Seçenekli olay tasarımları (N2, onaylı)

Olay sonuç türleri **yalnızca var olan kaynaklar**: altın (+/-), var olan hazine sandığı ödülü (item), takım canı (+/-, oransal), var olan bir karşılaşma (savaş), metin, sis açma (T5 ile ortak kural, N3e). Yeni stat, kaynak ya da kalıcı etki yok.

#### Witch's Hut (6A), "The Hedge Witch's Bargain"

Akış: korumalı düğüm. Önce `witchs_hut_guard` savaşı (2 Drowned + Fen Witchling). Kazanınca kulübeye girilir; Hedge Witch Morwen kazanın başında bekliyor.

> Metin (taslak, oyunda İngilizce): *"Your thralls are mud again," the witch says, not looking up from the pot. "No matter. Travellers always want something. So do I."*

| Seçenek (oyunda İngilizce) | Sonuç |
|---|---|
| **Pay her price** (altın, ör. 60) | Cadının sandığı açılır: var olan hazine sandığı ödülü (1 item seçimi). |
| **Pay in blood** | Her kahraman MEVCUT canının %20'sini kaybeder (en az 1 can kalır, kimse ölmez). Aynı sandık ödülü, altın gitmez. |
| **Steal her ingredients** | Savaş `morwen_duel`: Hedge Witch Morwen (adlı, 3 skill) + Will-o'-Wisp (arka) + Drowned (ön). Kazanınca sandık ödülü + küçük altın. Kaybedince bugünkü sefer yenilgi kuralı. |
| **Leave** | Hiçbir şey olmaz. |

Tasarım amacı: altın, can ya da risk arasında gerçek bir seçim. "Pay in blood" Ömer'e açıkça sorulacak (6. bölüm, onay bekleyen küçük kararlar).

#### Shepherd's Fold (fold), "The Scattered Flock"

Akış: olay + dinlenme. Oyuncu **bir** seçenek seçer; ardından dinlenme her durumda uygulanır (normalde ücretsiz %50 şifa).

> Metin (taslak): *Shepherds huddle around a dying fire. Their flock scattered when the ash-hounds came down from the road. "Lord Morvane's beasts," the eldest mutters. "And his gate is worse."*

| Seçenek | Sonuç |
|---|---|
| **Search for the flock** | Savaş `fold_flock`: 2 Ash Hound (ön). Kazanınca altın + çobanların hediyesi (var olan küçük sandık ödülü). Sonra dinlenme (%50). Bedeli: dinlenmeden önce kaybedilen can. |
| **Ask about the castle** | Hikâye metni (kapı kulesi ve Cinder Knight'lar hakkında ipucu) + **sonraki iki durağın sisi açılır** (Riverhead, Gate of Cinders: düğümün içindeki düşmanlar görünür; N3e ile aynı kural). Sonra dinlenme (%50). |
| **Share your bread** (altın, ör. 40) | Dinlenme bu sefer %100 şifa verir (var olan dinlenme ayarının farklı değeri). |
| **Just rest** | Normal dinlenme (%50). |

## 5. Kasaba içeriği (Ashford Village ve Valdren Keep)

| # | Seçenek | Ne yapar | Durum |
|---|---|---|---|
| T1 | **Town Merchant** | Kasabada Odo'nun dükkânı açılır: Ashford küçük stok, Valdren Keep büyük stok. Kasaba düğümü dinlenme + katılım + tüccar taşır (N3a). | **ONAYLANDI 2026-10-12, Faz 1.** |
| T5 | **Story Scene + fog reveal** | Kasabaya ilk girişte kısa hikâye sahnesi; kapanınca **rotadaki sonraki iki durağın sisi açılır** (N3e, onaylı yeni kural). | **ONAYLANDI 2026-10-12, Faz 1.** |
| T2 | Shrine / Blessing | Altınla kutsama: sonraki savaşa takım bir durumla başlar (N3b). | **SONRA.** |
| T3 | Bounty Board | Görev ilanı, düğüm kazanılınca ek ödül (N3c). | **SONRA.** |
| T4 | Training Yard | Can kaybı kalıcı olmayan antrenman ya da item yükseltme (N3d). | **SONRA.** |

**T5 sahneleri (taslak, oyunda İngilizce):**

- **Ashford Village, "Ash on the Wind":** köy meydanında kaçak bir kömürcü, Charwood'da kül maskeli adamların ormanı yaktığını ve "Kül Lordu"ndan söz ettiğini anlatır (Ember Cult'a ön hazırlık). Açılan sis: **Windy Moor** ve sonraki çatalın iki düğümü **Iron Pass** ile **Charcoal Camp**.
- **Valdren Keep, "The Warden's Oath":** kale komutanı King's Bridge'i tutan lanetli bekçinin efsanesini ve bataklıkta kıpırdayan ölüleri anlatır. Açılan sis: üç yollu çatal **Dwarven Mine**, **Witch's Hut**, **Misty Marsh** ve ardından **Grave Field**.

**Sis açma kuralı (N3e):** "Sonraki iki durak" rota üzerinde sayılır; bir durak çatalsa o çataldaki TÜM düğümler açılır. Açılan düğümün türü ve düşman listesi görünür (bugünkü sisli düğümün göstermediği bilgi). Sahne kasabaya ilk girişte bir kez oynar; kayıt "sahne görüldü" ve "açılan düğümler"i tutar. Shepherd's Fold'un "Ask about the castle" seçeneği aynı kuralı kullanır.

## 6. AYRI LİSTE: yeni mekanik, durum ya da kural gerektirenler

| Kod | Ne | Durum | Not |
|---|---|---|---|
| **N1** | **`data/mobs/` gizli birim kategorisi.** Takım seçiminde, rastgele savaşta, Endless havuzunda ve denge sim'inde görünmez; "tam 4 skill / stat toplamı" class kuralları uygulanmaz (moblar 2-3 skill). | **ONAYLANDI 2026-10-12** | Faz 1. |
| **N2** | **Seçenekli olaylar** (Witch's Hut pazarlığı, Shepherd's Fold). Sonuç türleri: altın +/-, var olan sandık ödülü, oransal can +/-, var olan karşılaşma, metin, sis açma. | **ONAYLANDI 2026-10-12** | Witch's Hut Faz 1, Shepherd's Fold Faz 3. |
| **N3a** | Kasabada tüccar (dinlenme + katılım + tüccar aynı düğümde). | **ONAYLANDI 2026-10-12** | Faz 1. |
| **N3b** | Shrine: haritadan sonraki savaşa taşınan durum. | SONRA (T2 ile) | |
| **N3c** | Bounty / görev takibi (kayıt şeması değişir). | SONRA (T3 ile) | |
| **N3d** | Training Yard: kalıcı can kaybı olmayan savaş ya da item seviye yükseltme. | SONRA (T4 ile) | |
| **N3e** | Sisi açan hikâye sahnesi (kasaba T5 + Fold seçeneği). | **ONAYLANDI 2026-10-12** | Faz 1. |
| **N4** | **Mob ölçeklemesi:** `campaign.json > enemyScale` ve zorluk çarpanları moblara da uygulanmalı. Denetlenecek, muhtemelen kural değişmez. | Doğrulama | Faz 1. |
| **N5** | **Lord Morvane boss tanımı:** Warden'ın boss altyapısı (fazlar, telgraf, Unyielding) ikinci bir boss için; `ai.json`'a boss YZ profili, "telgraflı tüm sıra + zemin" birleşimi küçük motor işi isteyebilir. | **ONAYLANDI 2026-10-12** | Faz 3. |
| **N6** | `pull` etkisini Iron Mooring şartı olmadan kullanmak (Drowned'ın Drag Under'ı). YZ'nin pull değerlemesi Warden kombosuna göre yazılmış olabilir. | Doğrulama | Olmazsa Drag Under yerine hasar + `slow`. |
| Reddedilen | Ölünce patlayan / zemin bırakan mob, element direnci, yeni durum (ör. "Bleed", "Fear"). | KULLANILMADI | |

**Bilinçli olarak YENİ durum eklenmedi.** Bütün mob skill'leri `statuses.json`'daki durumlardan ve `grounds.json`'daki 4 zeminden yararlanıyor.

**Onay bekleyen küçük kararlar (Ömer'e açıkça sorulacak; plana gömülü kabul edilmesin):**
1. Witch's Hut "Pay in blood": olaydan takıma oransal can kaybı (kimse ölmez). N2'nin sonuç türü olarak uygun mu, yoksa bu seçenek çıksın mı?
2. Shepherd's Fold "Share your bread": altınla dinlenmeyi %100'e çıkarmak uygun mu?
3. Sis açmada "sonraki iki durak" = çataldaki tüm düğümler sayılır (Valdren 4 düğüm açar). Uygun mu, yoksa çatal tek durak mı sayılsın?
4. Olay ve sahne metinleri taslak; oyuna İngilizce yazılacak.

## 7. Efor tahmini ve yapım sırası

### Görsel varlıklar

| Tür | Zorunlu | İsteğe bağlı |
|---|---|---|
| **Yeni taban sprite'lar** (idle illüstrasyonu; tek ayakta görsel yeterli) | **16** = 13 sıradan + 2 elit + 1 boss (liste aşağıda; Risen Skeleton var olan) | +1 Gate Ballista, +1 Bandit Chief yeni görünüm |
| **Palet varyantları** (aynı çizim, yeni renk, ayrı dosya; yeni çizim değil) | **16** (liste aşağıda) | +1 Thorn Treant koyu-diken rengi |
| Savaş arka planları | **9** (Z1-Z6, Z8-Z10) | +1 `castle-morvane`, +4 düğüme özel |
| Skill ikonları / efektleri | **0** (`artOf` ile ödünç) | ~5 imza ikon (Morvane'ın 3 skill'i, Call the Brood, Gate Ballista) |
| Mob logoları | 0 | 8 aile logosu (Codex için; aile başına bir logo, mob başına değil) |

**Taban sprite listesi (16):** Road Thug, Bandit Crossbowman, Grey Wolf, Ember Acolyte, Drakeling, Shieldwarden, Fen Witchling, Will-o'-Wisp, Ghoul, Grave Chanter, Flagellant, Vanguard Pikeman, Morvane Outrider (13 sıradan) + High Priest of the Undying, Drake Priestess (2 elit) + Lord Morvane (1 boss).

**Palet varyantı listesi (16) ve hangi tabanı kullandığı:**

| Varyant | Taban sprite | Renk yönü |
|---|---|---|
| Moor Raider | Road Thug | yün pelerin, mavi yüz boyası |
| Ravenwood Poacher | Bandit Crossbowman | orman yeşili kukuleta |
| Siege Arbalist | Bandit Crossbowman | kül grisi pelerin, Morvane arması rengi |
| False Pilgrim | **cutthroat (var)** | kirli bej hacı cübbesi |
| Ash Hound | Grey Wolf | kara post, kor gözler |
| Charcoal Burner | Ember Acolyte | is-siyahı |
| Drake Cultist | Ember Acolyte | koyu kızıl + altın |
| Pyre Witch | Ember Acolyte | kül grisi + kor |
| Stonebound Warden | Shieldwarden | taş grisi, sönük mavi rün |
| Abbey Keeper | Shieldwarden | beyaz-altın |
| Cinder Knight | Shieldwarden | kara plaka + kor çatlakları |
| Wayside Wisp | Will-o'-Wisp | soluk altın |
| Grave Witch | Fen Witchling | mor-siyah |
| Drowned | Ghoul | yosun yeşili + bataklık mavisi |
| Ash Revenant | **skeleton (var)** | kül grisi + kor |
| Pyre Zealot | Flagellant | kül + kor yanıkları |

Önceki plan: 30 zorunlu yeni sprite. Bu plan: **16 yeni sprite + 16 palet** (palet işi yeni çizimden çok daha ucuz).

### Kod ve veri

- **Kod (küçük-orta):** `data/mobs/` yükleyicisi + testleri (N1, ~60-100 satır); kasaba düğümünde tüccar (N3a, küçük akış); sahne + sis açma (N3e: kayıtta görülen sahne ve açılan düğümler, harita görünürlüğü); seçenekli olay sistemi (N2: seçenek listesi, sonuç türleri, olaydan savaş başlatma); Morvane boss YZ profili (N5, ~50-150 satır, veriye ağırlıklı); Gate Ballista için `overrides.spd` (var olan alan).
- **Veri (orta):** ~32 birim dosyası (`data/mobs/*.json`: 12 çekirdek + 16 varyant + 3 skill'li adlı liderler; Brother-Castellan karşılaşmadaki `name`/`hpMult` ile) + Drakeling `data/summons/` kopyası; **~40 yeni skill** (`skills.json`'a ~700-900 satır, çoğu var olan skill'in sayı kopyası + `artOf`); 22 karşılaşmanın yeniden yazımı + 2 yeni (`morwen_duel`, `fold_flock`); 9-14 arka plan kaydı + zemin çizgisi ölçümü; olay ve sahne metinleri (`events.json`: Witch's Hut, Shepherd's Fold, iki T5 sahnesi).
- **Denge:** her faz sonunda `npm run sim:campaign` (balance-tester).

### Yapım sırası (3 faz, onaylı; içerik ailelere göre yeniden dağıtıldı)

Fazlar hâlâ harita sırasını izler, ama bir aile ilk göründüğü fazda **taban sprite'ı** ile gelir; sonraki fazlar o aileye yalnızca palet varyantı ekler.

1. **Faz 1: altyapı + duraklar 4-8 (Ashford'dan üçlü çatala kadar).**
   - Kod: N1 yükleyicisi, N3a kasaba tüccarı (T1, iki kasaba), N3e sahne + sis açma (T5, iki kasaba), N2 seçenekli olay sistemi, N4 ölçek denetimi.
   - Aileler (5): Bandits (Road Thug tabanı + Moor Raider; Bandit Crossbowman / Pass Crossbowman), Ember Cult (Ember Acolyte + Charcoal Burner), Guardians (Shieldwarden + Stonebound Warden + Thane), Hexes (Fen Witchling, Will-o'-Wisp, Hedge Witch Morwen), Undead (Ghoul tabanı + Drowned). Eğitim düğümleri (1-3) Faz 3'te; Faz 1'de bugünkü hâlleriyle kalır.
   - Düğümler: Windy Moor, Iron Pass, Charcoal Camp, Dwarven Mine, Witch's Hut (savaş + seçenekli olay), Misty Marsh; Ashford ve Valdren Keep kasaba içeriği.
   - Görsel: **7 taban sprite** (Road Thug, Bandit Crossbowman, Ember Acolyte, Shieldwarden, Fen Witchling, Will-o'-Wisp, Ghoul) + **4 palet** (Moor Raider, Charcoal Burner, Stonebound Warden, Drowned) + **3 arka plan** (`windy-moor`, `iron-pass`, `misty-marsh`) + bölge yedeği olarak `border-road` / `valley-field` / `ashen-heights` bağlanması (bugünkü `castle-hall` sorununu hemen çözer).
   - Denge ölçümü.
2. **Faz 2: duraklar 9-15 (Grave Field'dan Thornwood / Siege Line'a).**
   - Aileler: Undead çekirdeği (Grave Chanter, Risen Skeleton, Ash Revenant), Fanatics (Flagellant, Pyre Zealot), Morvane's Army (Vanguard Pikeman, Siege Arbalist, Siege Sergeant), Beasts (Grey Wolf tabanı, Ash Hound için), varyantlar (False Pilgrim, Wayside Wisp, Grave Witch, Abbey Keeper, Brother-Castellan, Ash Hound, Drake Cultist), elitler (High Priest, Drake Priestess + Drakeling).
   - Görsel: **5 taban** (Grave Chanter, Flagellant, Vanguard Pikeman, Drakeling, Grey Wolf) + **2 elit** + **9 palet** + **4 arka plan** (`grave-field`, `pilgrim-road`, `ashen-plain`, `thornwood-hollow`).
   - Denge ölçümü.
3. **Faz 3: final yolu + eğitim.**
   - Morvane's Army'nin son üyesi (Morvane Outrider), Guardian ve Cult varyantları (Cinder Knight, Pyre Witch), Lord Morvane (N5), Shepherd's Fold seçenekli olayı, Z1 eğitim mobları (Road Thug, Bandit Crossbowman ve Grey Wolf tabanları önceki fazlardan hazır; yalnızca Ravenwood Poacher paleti; eğitim dengesi en son ve dikkatle). İsteğe bağlı Gate Ballista.
   - Görsel: **2 taban** (Morvane Outrider, Lord Morvane) + **3 palet** (Cinder Knight, Pyre Witch, Ravenwood Poacher) + **2 arka plan** (`ember-road`, `border-road`).
   - T2-T4 SONRA. Sefer mantığı işi (İLK YAPILACAKLAR 2. madde) bundan sonra başlar.

Faz toplamı: taban 7 + 7 + 2 = **16**, palet 4 + 9 + 3 = **16**, arka plan 3 + 4 + 2 = **9**.
