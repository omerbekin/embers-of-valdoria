# Sefer mob planı (Bölge II ayrıntılı; Bölge III ve tutorial taslak)

> **Ömer onayı 2026-10-16: tüm plan kabul; açık sorular önerilen seçeneklerle (Stonebound şimdi yeniden çizilir, Morwen kendi çizimi, palet varyantları kalır, Bridge Warden değişmez, Pilgrim Road'da Mage + tek rakip bölük, pasif ikonları ChatGPT, eski mob skill sanatı sonra); MP ağırlıklı pasifler çeşitlendirildi (Ömer notu, yeniden onay gerekmez).** Ömer notu: "Mobların yarısına MP yenileme / MP çalma verdin, Anti-Mage'den bu kadar esinlenme." Sonuç: 13 pasiften yalnızca 3'ü MP'ye dayanır (P5 Deep Hoard, P6 Ward-Etcher, P13 Vessel of the Choir); aktiflerde MP yakan tek skill Glyph of Breaking (Dirge artık Slow verir). Ayrıntı open-questions madde 328.
> **Uygulama (engine-dev, 2026-10-16):** Bölge II (2., 3. ve 5. bölüm) veri + motor olarak yapıldı: YM1-YM13 `src/engine/battle.ts` (testler `tests/mob-passives.test.ts`), D1-D6 doğrulandı, karşılaşmalar `data/campaign/encounters.json` (+ `morwen_duel`), sanat yer tutucuları 6.1'de. Sapmalar: open-questions madde 329.
> **Durum: TASARIM PLANI, ONAYLI (content designer, 2026-10-16).** (Plan yazılırken veri, kod, sürüm değişmemişti.) Sayılar PROVİZYON: son ayar `sim:campaign` ile, hedef "Easy YZ vekili (ortalama oyuncu) Medium'u ~%50 bitirir".
> **Bağlayıcı kararlar (Ömer, form 2026-10-16):** class kopyası düşmanlar mob olur (yalnızca 1-2 hikâyeli "rakip bölük" savaşı kalır); adlı lider/boss'a özel çizim + özel skill seti; sefer başına ~12 yeni mob tasarımı (~4/bölge); her savaşın KOMPOZİSYONU farklı; caster = MP havuzu + büyü hasarı; bölge başına en çok 1 caster'sız savaş; her mobun kendi kiti (aile pasif paylaşabilir, aktifler farklı); kit şekli: sıradan = 1 pasif + 2 aktif, elit = pasif + 3 aktif, boss = pasif + 3 aktif + 1 ultimate; pasifler class pasifi kopyası DEĞİL, birincil stat bonusu DEĞİL, kaynak/türev stat (HP, MP, MP yenilenmesi, zırh...) üzerine kurulabilir ve sıradan olmamalı; motorun desteklemediği her şey **YENİ MEKANİK** (Ömer tek tek onaylar); çizim + her yeni skill için ChatGPT ikon ve 8 karelik VFX sheet; onay mob başına paket; yeni moblar sonra Endless havuzuna girer.
> Kaynaklar: `data/mobs/*.json`, `data/campaign/encounters.json`, `valdoria.json`, `data/skills.json`, `statuses.json`, `grounds.json`, `data/bosses/*`, `docs/arch/battle-engine.md`, `fill-plan.md`.
> Kısaltmalar: yuva = sıra*3 + şerit (0-2 ön sıra, 3-5 ikinci, 6-8 üçüncü, 9-11 en arka). CD = bekleme (tur). "Var" = motor bugün destekliyor. Oyun içi adlar İngilizce.

## 1. Denetim: Bölge II savaşları bugün

| Düğüm | Karşılaşma | Birimler (yuva) | Class kopyası | Mob kopyası / sorun | Caster? |
|---|---|---|---|---|---|
| Windy Moor | `windy_moor` | 2 Moor Raider (0,2), Ember Acolyte (7) | yok | Moor Raider = Road Thug kiti + Opportunist (class pasifi) | evet (Acolyte) |
| Iron Pass | `iron_pass_ambush` | Stonebound Warden (1), 2 Pass Crossbowman (6,8) | yok | Stonebound = Shieldwarden kiti + Bulwark Aura (class pasifi); Crossbowman Opportunist | **HAYIR** |
| Charcoal Camp | `charcoal_camp` | Shieldwarden (1), 2 Charcoal Burner (6,8) | yok | Charcoal Burner = Ember Acolyte kiti; Shieldwarden Bulwark Aura | evet |
| Dwarven Mine | `mine_wardens` | Thane of the Deep (1), 2 Pass Crossbowman (6,8) | yok | Thane = Shieldwarden kiti + Shield Wall, Stonebound çizimi; Iron Pass ile neredeyse aynı kompozisyon | **HAYIR** |
| Witch's Hut | `witchs_hut_guard` (+ `morwen_duel` henüz yok) | 2 Drowned (0,2), Fen Witchling (7) | yok | Drowned Gnaw'ı Ghoul ile ortak, Vampiric Bite (class pasifi); Morwen = Witchling kiti + Lure Light, Witchling çizimi | evet |
| Misty Marsh | `bog_ambush` | Drowned (1), Fen Witchling (6), Will-o'-Wisp (8) | yok | Drowned (yukarıdaki gibi) | evet |
| Grave Field | `grave_field` | Warrior (1), Undead (7), Hexer (6) | **3/3** | | evet |
| Pilgrim Road | `pilgrim_road` | Cutthroat (0), Warrior (2), Gambler (7), Archer (6) | **4/4** | Gambler fiziksel hasar vurur | **HAYIR** |
| St. Brann's Abbey | `vault_keepers` | Defender (1), Paladin (6), Anti-Mage (8), Paladin (10) | **4/4** | | evet |
| Black Cathedral (elit) | `black_cathedral` | High Priest = Undead (7), Undead (6), Defender (1), Hexer (4) | **4/4** | Elit lider düz bir class kopyası | evet |
| King's Bridge (boss) | `bridge_warden` | Bridge Warden (1), 2 Iron Mooring (3,5) | yok | Zaten özel (çizim + kit) | kısmen (Ash Brand: büyü ateşi, 12 MP, yalnızca Faz 2+) |

Bugün: 11 savaşın 4'ü tamamen class kopyası, 3'ü caster'sız (kural en çok 1), 4 mobun kiti başka mobun kopyası, 3 class pasifi (Opportunist, Vampiric Bite, Bulwark Aura) 8 mobda kullanılıyor. Not: `mercenary_camp` (Sellswords) haritada yok (8B kaldırıldı); Endless kullanıyorsa dokunulmaz, kullanmıyorsa sonra silinebilir.

## 2. Mob aileleri ve Bölge II mobları

### 2.1 Özet: kim kalır, kim değişir, kim yeni

| Mob | Aile | Durum | Çizim | Değişen |
|---|---|---|---|---|
| Moor Raider | Bandits | kit yenilenir | var (Road Thug paleti) | 2 yeni aktif + aile pasifi |
| Bandit Crossbowman ("Pass Crossbowman") | Bandits | kit kısmen yenilenir | var | Bolt kalır, Snare Shot yerine yeni skill + aile pasifi |
| Ember Acolyte | Ember Cult | kit kalır | var | yalnızca aile pasifi |
| Charcoal Burner | Ember Cult | kit yenilenir | var (Acolyte paleti) | 2 yeni aktif + aile pasifi |
| Shieldwarden | Guardians | kit kalır | var | yalnızca kendi pasifi |
| Stonebound Warden | Guardians | kit + çizim yenilenir | **YENİ** (Ömer: şimdi yeniden çizilir) | 2 yeni aktif + kendi pasifi |
| Thane of the Deep | Guardians (adlı lider) | kit + çizim yenilenir | **YENİ** | pasif + 3 aktif |
| **Deep Runecaller** | Guardians | **YENİ** | **YENİ** | |
| Fen Witchling | Hexes | kit kalır | var | yalnızca aile pasifi |
| Hedge Witch Morwen | Hexes (adlı lider) | kit + çizim yenilenir | **YENİ** (Ömer: kendi çizimi) | pasif + 3 aktif |
| Will-o'-Wisp | Hexes | kit kalır | var | yalnızca kendi pasifi |
| Drowned | Undead | kit kısmen yenilenir | var (Ghoul paleti) | Gnaw yerine yeni skill + aile pasifi |
| Ghoul | Undead | kit kalır | var | yalnızca aile pasifi |
| Risen Skeleton | Undead | var olan `skeleton` çağrısı | var | değişmez (yuvaya `summoned` ile konur) |
| **Grave Chanter** | Undead | **YENİ** | **YENİ** | |
| **Oathsworn Brother** | Brann's Order (yeni aile) | **YENİ** | **YENİ** | |
| **Censer Monk** | Brann's Order | **YENİ** | **YENİ** | |
| **High Priest of the Undying** | elit (Undead) | **YENİ** | **YENİ** | pasif + 3 aktif |
| The Bridge Warden | boss | kalır | var | bkz. 4.2 |

Bölge II yeni sıradan mob tasarımı: **4** (Deep Runecaller, Grave Chanter, Oathsworn Brother, Censer Monk). Ayrıca adlı/özel: Thane (yeni çizim), Morwen (yeni çizim), High Priest (elit); Stonebound Warden yeniden çizilir. Fill-plan'daki Abbey Keeper (Shieldwarden paleti) ve Brother-Castellan yerine Oathsworn Brother geçer; Flagellant Bölge III'e kayar (7. bölüm).

### 2.2 Pasifler (hepsi YENİ MEKANİK; motor ihtiyacı birkaç ortak kancaya iner, 5. bölüm)

MP'ye dayanan pasif: **3 / 13** (P5, P6, P13; MP'nin en açık karşı oyun olduğu Thane-Runecaller ikilisi ve elit rahip). Diğer 10 pasif konum, şerit, sıra/hız, can eşiği, ölüm, çağrı, durum, zemin, zırh tepkisi ve dost koruma üzerine kurulu (Ömer notu 2026-10-16).

| # | Pasif (oyun içi) | Kimde | Kural (tam) | Oyuncuya öğrettiği |
|---|---|---|---|---|
| P1 | **Cut and Run** | Moor Raider, Bandit Crossbowman (aile; tutorial'da Road Thug) | Savaş başına bir kez: canı ilk kez %50'nin altına düşünce 1 tur Shrouded (kaçınma +%20) ve hız desteği alır (Skip Turn'deki gibi: sıradaki turu yarı sürede gelir). | Haydudu yarıda bırakma: tek seferde indir, yoksa kaçar ve önce o oynar. |
| P2 | **Last Ember** | Ember Acolyte, Charcoal Burner (aile) | Ölünce, onu öldüren kahramanın hücresi 2 tur yanan zemin (Burning ground) olur (öldüren skill vuruşuysa; zemin/DoT ile ölürse olmaz). | Tarikatçıyı öldüren yanar: ardından Move ile çık ya da zeminle/DoT ile bitir. |
| P3 | **Rebuke** | Shieldwarden | Yakın dövüş (melee) skill'iyle vurulunca, zırhının engellediği hasarın %30'u saldırana fiziksel hasar olarak döner. | Kalkanlıya kılıçla değil uzaktan ya da büyüyle vur. |
| P4 | **Stone Patience** | Stonebound Warden | Kendi turunun başında, son turundan beri hiç hasar almadıysa +8 zırh kazanır (en çok +24); herhangi bir hasar bu bonusu sıfırlar. | Taş muhafızı görmezden gelirsen kaya olur; arada bir dokun. |
| P5 | **Deep Hoard** | Thane of the Deep | Mevcut MP'sinin %50'si kadar ek zırh VE büyü zırhı (anlık hesap). Skill kullandıkça (MP harcadıkça) incelir. | MP'sini çal/yak (Anti-Mage, Drain Field) ya da büyüsünü harcatmasını bekle. |
| P6 | **Ward-Etcher** | Deep Runecaller | MP harcadığı her skill'den sonra, zırhı en düşük dostuna harcanan MP x 2 kadar büyü kalkanı (2 tur) verir. | Runecaller'ın MP'si = dostlarının kalkanı; MP'sini kes. |
| P7 | **Mire-Bound** | Fen Witchling, Hedge Witch Morwen (aile) | Bu birim yaşadıkça, üstünde en az 1 Omen olan kahramanların hızı %20 düşer (sıra çubuğunda geri kayar; aynı aileden birden çok cadı olsa da bir kez uygulanır). | Omen'li kahraman sıra kaybeder: cadıyı önce öldür ya da Omen'i söndür. |
| P8 | **Flicker** | Will-o'-Wisp | Bir skill vuruşu ona isabet edince 1 tur Shrouded (kaçınma +%20) kazanır; kendi turu başına en çok bir kez. | Wisp'e tek ağır vuruşla git, ufak vuruşlarla değil. |
| P9 | **Corpse Hunger** | Ghoul, Drowned (aile) | Herhangi bir taraftaki çağrı olmayan bir birim ölünce, en yüksek %15 maks. can iyileşir (Wound şifa azaltmasından etkilenir). | Ölüm, ölüleri doyurur: öldürme sırasını düşün, ghoul'u en sona bırakma. |
| P10 | **Bone Ward** | Grave Chanter | Kendi tarafında en az bir çağrılmış (summoned) dost yaşadıkça aldığı tüm hasar %30 azalır. | Önce kemikleri kır, sonra Chanter'a yüklen; Call the Buried'ın 5 turluk beklemesini kolla. |
| P11 | **Martyr's Vow** | Oathsworn Brother | Savaş başına bir kez: bitişik (ön/arka/sol/sağ) bir dosta gelecek ÖLÜMCÜL vuruşu kendisi alır (hasar zırhına göre yeniden hesaplanır). | İlk öldürme vuruşun boşa gidebilir; yemini önce harcat. |
| P12 | **Censer Smoke** | Censer Monk | Kendisi ve kendi şeridindeki (aynı sütun, tüm sıralar) dostlar kendi tur başlarında maks. canlarının %4'ünü yeniler (Wound şifa azaltmasından etkilenir). | Dumanın şeridindeki kardeşi kemirme; şerit dışındakine ya da keşişe vur. |
| P13 | **Vessel of the Choir** | High Priest of the Undying | +30 maks. MP; bir dostu kahraman skill'inden hasar aldıkça 2 MP kazanır. | Koroya vurdukça rahip dolar: önce rahibe yüklen ya da MP'sini kes. |

### 2.3 Mob kartları (Bölge II)

Ortak çizim stili (tüm prompt'ların başına): *"Single full-body enemy character for a side-view medieval dark-fantasy RPG, painted pixel-art look matching the existing enemy set (gritty hand-painted textures, heavy dark outline, muted earthy palette with ONE strong accent colour, worn and patched gear), three-quarter view facing left, idle combat stance, feet visible, plain dark background for cut-out, no text, no frame."* Hiçbiri oynanabilir bir sınıfın çiziminden türetilmez.
Ortak VFX kuralı: 4x2 ızgara, 8 kare x 256 px, saydam zemin, pivot ortada (art-v2 3.4). Ortak ikon kuralı: 128x128 boyalı ikon, koyu zemin, tek nesne, kenarda altın ince çerçeve yok (skill ikon dili).
Statlar mevcut moblara göre (Road Thug STR 28 / zırh 14; Acolyte INT 30 / zırh 8; Shieldwarden STR 26 / zırh 30 / can 130). Bugün hiçbir mobda büyü zırhı yok; aşağıdaki MZ (büyü zırhı) değerleri öneri.

#### Bandits

**Moor Raider** (kit yenilenir) · ön, yakın dövüş, caster değil · STR 26 / DEX 14 (Road Thug'dan hızlı, zırh 12) · Pasif P1 Cut and Run.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Billhook** (temel) | tek düşman, melee | STR fiziksel 0,9 + 1 tur Jinxed (kanca silahı kenara iter) | 0 / — | Kıvrık ağızlı tarım kancası (billhook), yünlü sap | Kanca yay çizip çeker, kopan kıvılcım, hedefin silahı sallanır |
| **Peat Smoke** | 2x2 alan, düşman | STR fiziksel 0,3 + 2 tur Blinded | 6 / 3 | Tüten turba topağı, kahverengi duman | Fırlatılan turba topağı patlar, yere çöken koyu kahve duman bulutu |

Çizim: mevcut sprite (Road Thug paleti) kalır (Ömer 2026-10-16: palet varyantları kalır).

**Bandit Crossbowman** (Iron Pass'te ad "Pass Crossbowman") · arka, menzilli, caster değil · statlar değişmez · Pasif P1.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| Bolt (temel, VAR, değişmez) | tek düşman | DEX 0,95, savunmanın %25'ini yok sayar | 0 / — | var (artOf) | var |
| **Scatter Quarrels** | bir sıra (row) | her hücreye DEX fiziksel 0,4 | 6 / 3 | Yelpaze gibi açılmış üç kısa arbalet oku | Üç ok yan yana uçar, sıra boyunca toz çıkaran ardışık saplanmalar |

#### Ember Cult

**Ember Acolyte** (kit kalır: Ember Toss + Burn the Ground) · Pasif P2 Last Ember. Yeni çizim/skill yok.

**Charcoal Burner** (kit yenilenir) · arka, orta menzil, **caster** · INT 26 / STR 14, zırh 12 (Acolyte'ten dayanıklı, daha az büyü gücü) · Pasif P2.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Shovel of Embers** (temel) | tek düşman, menzilli | INT büyü (ateş) 0,7 + 1 tur Blinded (göze kül) | 0 / — | Kor dolu kömürcü küreği | Kürekten savrulan kor ve kül yelpazesi, hedefin yüzünde kıvılcım |
| **Kiln Smoke** | bir sütun (column), sıra sıra | INT büyü (ateş) 0,35 + 2 tur Burning (DoT) | 8 / 3 | Ağzından kara duman çıkan kömür ocağı | Sütun boyunca ilerleyen koyu duman şeridi, içinde turuncu korlar |

#### Guardians

**Shieldwarden** (kit kalır: Shield Bash + Hold the Line) · Pasif P3 Rebuke (Bulwark Aura çıkar). Yeni çizim/skill yok.

**Stonebound Warden** (kit yenilenir) · ön, tank, caster değil · STR 24, zırh 30 (+ P4 ile en çok +24), can 130 · Pasif P4 Stone Patience.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Gatestone Slam** (temel) | tek düşman, melee | STR fiziksel 0,75 + 1 tur Slow | 0 / — | Rünlü taş tokmak başı | Tokmak iner, yerde taş çatlağı ve gri toz halkası |
| **Rockfall** | bir sıra (row) | STR fiziksel 0,5 + 2 tur Slow | 8 / 4 | Düşen üç kaya parçası | Yukarıdan sıraya yağan kayalar, çarpınca toz ve kırık taş |

Çizim (YENİ, Ömer 2026-10-16: şimdi yeniden çizilir): *"A towering mountain-pass sentinel whose armour has half turned to living stone, grey granite plates fused over old iron mail, moss and lichen in the cracks, faceless stone visor with a thin slit, a huge rune-carved stone maul in both hands, small pebbles crumbling from the shoulders, faint dull-amber glow in the carved runes as accent colour."*

**Thane of the Deep** (adlı lider, elit şekli) · ön, tank, caster değil · STR 28 / INT 14, zırh 26 + P5 (44 MP dolu iken +22 zırh/MZ), can 150 · Pasif P5 Deep Hoard.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Pick of the Deep** (temel) | tek düşman, melee | STR fiziksel 0,6 + zırhın %6'sı (bonusScale armor; Deep Hoard ile MP doluyken sert) | 0 / — | Altın işlemeli cüce kazması | Kazma yukarıdan iner, ucunda mavi maden ışığı, kıvılcım |
| **Oath of Stone** | kendisi | 2 tur taunt + 1 tur Fortified | 10 / 4 | Taşa oyulmuş kalkan üstünde yemin rünü | Ayak altından yükselen taş halka, rün parlar, kalkan çınlar |
| Shield Wall (VAR) | tek dost | Guard (mevcut) | 2 / 4 | var | var |

Çizim (YENİ): *"A stout ancient dwarven lord of the deep halls, broad and short, beard braided with iron rings and grey stone dust, crown-like helmet of dark iron with a single sapphire-blue lantern crystal, heavy plate carved with mountain runes, a long-hafted gilded mining pick in one hand and a round stone-rimmed shield on the back, blue lantern glow as accent colour."*

**Deep Runecaller** (YENİ) · arka, menzilli, **caster** · INT 28 / STR 8, zırh 14, MZ 10 (Acolyte'ten sağlam) · Pasif P6 Ward-Etcher.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Rune Spark** (temel) | tek düşman, menzilli | INT büyü (arcane) 0,8 | 0 / — | Havada parlayan tek cüce rünü | Yumruktan fırlayan mavi rün kıvılcımı, çarpınca kırılan glif |
| **Glyph of Breaking** | artı (plus) | INT büyü (arcane) 0,45 + hücre başına 6 MP yakma (manaBurn) | 10 / 3 | Çatlamış taş levha üstünde kırık rün | Yerde beliren dönen rün dairesi, artı şeklinde çatlayıp mavi parçalar saçar |

Çizim: *"An old dwarven rune-priest from an abandoned mountain mine, hunched, long white beard tucked into a leather apron covered in chalk runes, iron spectacles, carrying a heavy stone tablet on a chain and a chisel-tipped staff, fingertips glowing pale cyan, lantern-blue runes floating near the hands as accent colour."*

#### Hexes

**Fen Witchling** (kit kalır: Hex Bolt + Bog Curse) · Pasif P7 Mire-Bound. Yeni çizim/skill yok.

**Will-o'-Wisp** (kit kalır: Spark + Marsh Glow) · Pasif P8 Flicker. Yeni çizim/skill yok.

**Hedge Witch Morwen** (adlı lider, elit şekli) · arka, **caster** · LUCK 28, can 90 (değişmez) · Pasif P7 (aile; Witchling ile paylaşır).

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Cauldron Splash** (temel) | tek düşman | LUCK büyü (karanlık) 0,5 + 2 tur Wither (DoT, LUCK 0,08) | 0 / — | Taşan yeşil kazan kepçesi | Kepçeden fırlayan köpüklü yeşil sıvı, hedefte buharlaşan lekeler |
| Lure Light (VAR, artık yalnız Morwen'de) | tek düşman | hasar + 2 tur Jinxed | 2 / 2 | var | var |
| **Hag's Mark** | tek düşman | 2 Omen + 1 tur Silenced | 10 / 4 | Kurumuş el izi ve göz sembolü | Hedefin üstünde beliren mor el izi, ağzını kapatan dumanlı tasma |

Çizim (YENİ, Ömer 2026-10-16: kendi çizimi): *"An old hedge witch of the fen, bent but sharp-eyed, wild grey hair woven with reeds and small bird bones, patched moss-green shawl over a mud-dark dress, a wooden ladle dripping glowing green brew in one hand and a crooked rowan staff hung with charms in the other, a small bubbling iron cauldron at her side, sickly marsh-green glow as accent colour."*

#### Undead

**Ghoul** (kit kalır: Gnaw + Feast) · Pasif P9 Corpse Hunger (Vampiric Bite çıkar).

**Drowned** (kit kısmen yenilenir) · ön, brute · statlar değişmez · Pasif P9.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Clutch** (temel, Gnaw yerine) | tek düşman, melee | STR fiziksel 0,75 + 1 tur Silenced (ciğere dolan su) | 0 / — | Sazla sarılı, şişmiş el | Yerden uzanan ıslak el, hedefin ağzında su köpüğü |
| Drag Under (VAR) | tek düşman | hasar + pull | 4 / 3 | var | var |

**Grave Chanter** (YENİ) · arka, **caster**, çağırıcı · INT 28, zırh 6, MZ 6 (kırılgan) · Pasif P10 Bone Ward.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Dirge** (temel) | tek düşman, menzilli | INT büyü (karanlık) 0,6 + 1 tur Slow (ağır ağıt adımları ağırlaştırır) | 0 / — | Paslı fener, içinde mor alev | Fenerden süzülen mor ses dalgası, hedefin ayaklarına çöken ağır mor sis halkaları |
| **Call the Buried** | kendisi -> yuva | Risen Skeleton çağırır (ceset varsa tüketir, beslenmiş; yoksa beslenmemiş), ömür 3 tur | 12 / 5 | Topraktan çıkan iskelet eli | Yerde açılan mezar çatlağı, mor sis, kemik el çıkar |

Çizim: *"A dead monk of a forgotten graveyard order, tall and gaunt, tattered black robes with mud-stained hem, mouth sewn shut with black thread, hollow glowing violet eyes, a rusted iron lantern burning with violet flame held high, a string of bone prayer beads, violet lantern light as accent colour."*

#### Brann's Order (St. Brann manastırının yeminli bekçileri; yeni aile)

**Oathsworn Brother** (YENİ) · ön, yakın dövüş, tank-ımsı, caster değil · STR 26, zırh 22, MZ 12, can 120 · Pasif P11 Martyr's Vow.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Penance Flail** (temel) | tek düşman, melee | STR fiziksel 1,05; bedeli kendi MEVCUT canının %8'i (`cost.ofCurrent`, asla öldürmez) | 0 MP / — | Zincirli demir topuz (flail), kanlı bez | Zincir dolanıp topuz iner, beyaz-altın darbe halkası |
| **Sanctuary** | tek dost (kendisi hariç) | 2 tur Blessed | 8 / 4 | Küçük manastır çanı, altın ışık | Dostun üstünde sallanan hayalet çan, aşağı süzülen altın toz |

Çizim: *"A sworn lay-brother guarding a mountain abbey's relic vault, broad-shouldered, shaved head with a tonsure and a branded oath scar, grey wool habit over dented mail, white tabard with a simple gold sun-wheel of St. Brann, a heavy chained flail and a wooden vow-plaque hanging from the belt, warm gold as accent colour."*

**Censer Monk** (YENİ) · arka, **caster**, destek · INT 28, zırh 8, MZ 14 · Pasif P12 Censer Smoke.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Holy Ember** (temel) | tek düşman, menzilli | INT büyü (kutsal) 0,7 | 0 / — | Buhurdandan fırlayan altın kor | Sallanan buhurdandan ayrılan altın kor, hedefte kısa ışık patlaması |
| **Consecrate** | 2x2 alan, düşman | INT büyü (kutsal) 0,25 + 2 tur Holy Fire zemini (INT 0,2) | 10 / 3 | Altın dumanla çizilmiş daire | Yukarıdan inen buhur dumanı, yerde yanan altın daire |

Çizim: *"An elderly abbey monk swinging a large brass censer on a long chain, deep-hooded cream and brown habit, thick white smoke curling around the body, prayer scroll tucked in the rope belt, calm half-closed eyes, warm amber smoke-glow as accent colour."*

## 3. Bölge II karşılaşma kompozisyonları

Çarpanlar (mods) bugünkü değerlerden başlar; birim sayısı değişen savaşlar `sim:campaign` ile yeniden ayarlanır.

| Düğüm | Birimler (yuva) | Diziliş | Caster | Karşılaşmanın dersi |
|---|---|---|---|---|
| Windy Moor | Moor Raider (0), Moor Raider (2), Ember Acolyte (7) | 2 ön + 1 arka | 1 | Yanan zemin + yarı canda kaçan akıncılar: tek seferde indir; Acolyte'i öldüren hücre yanar |
| Iron Pass | Stonebound Warden (1), Pass Crossbowman (6), Deep Runecaller (8) | 1 ön + 2 arka | 1 | Taş muhafız kendini büyütür; rün kalkanı arkadakini korur |
| Charcoal Camp | Shieldwarden (1), Charcoal Burner (4), Ember Acolyte (7) | tek sütun (ön-orta-arka) | 2 | Rebuke'a melee girme; sütun dumanı + zemin |
| Dwarven Mine | Thane of the Deep (1), Deep Runecaller (6), Deep Runecaller (8) | 1 ön + 2 arka | 2 | MP'yi kes: Thane'in zırhı ve Runecaller'ların kalkanı MP'den gelir |
| Witch's Hut (koruma) | Drowned (0), Drowned (2), Fen Witchling (7) | 2 ön + 1 arka | 1 | Silence + Omen (Omen'li yavaşlar); ölüm ölüleri iyileştirir |
| Witch's Hut "Steal" (`morwen_duel`, yeni) | Hedge Witch Morwen (7), Drowned (1), Will-o'-Wisp (6), Will-o'-Wisp (8) | 1 ön + 3 arka | 3 | Lider düellosu: Omen + sıra kaybı; Wisp'ler tek ağır vuruş ister |
| Misty Marsh | Drowned (1), Fen Witchling (6), Will-o'-Wisp (8) | 1 ön + 2 arka | 2 | Omen tanıtımı, Wisp'e tek ağır vuruş |
| Grave Field | Ghoul (1), Risen Skeleton (0, `summoned`), Risen Skeleton (2, `summoned`), Grave Chanter (7) | 3 ön + 1 arka | 1 | Kemikler Chanter'ı korur (Bone Ward): önce iskeletleri kır, sonra çağırıcıyı |
| Pilgrim Road (rakip bölük) | Warrior (0), Cutthroat (2), Archer (6), **Mage (8)** (Gambler yerine) | 2 ön + 2 arka | 1 | Hikâye: rakip maceracı bölüğü (6. madde) |
| St. Brann's Abbey | Oathsworn Brother (0), Oathsworn Brother (1), Censer Monk (7) | 2 ön + 1 arka | 1 | Yemin (iki kardeş bitişik) + kutsama + şerit 1'de şifa dumanı (Brother 1 ve keşiş aynı şeritte) |
| Black Cathedral (elit) | High Priest of the Undying (7, elit), Grave Chanter (6), Fen Witchling (8), Ghoul (1) | 1 ön + 3 arka | 3 | Çağırıcı + Omen + rahip: rahip doldukça şifa/Requiem gelir; önce rahibe ya da Chanter'ın kemiklerine odaklan |
| King's Bridge (boss) | Değişmez: Bridge Warden (1), 2 Iron Mooring (3,5) | | kısmi (Faz 2+) | |

**Aynı kompozisyon yok:** 12 karşılaşmanın birim kümeleri birbirinden farklı (aynı birim kümesini paylaşan iki savaş yok; en yakın ikili Misty Marsh / Witch's Hut koruması bile farklı: Witchling+Wisp+Drowned ile 2 Drowned+Witchling). Aynı dizilişi paylaşanlarda (2 ön + 1 arka: Windy Moor, Witch's Hut, Abbey; 1 ön + 2 arka: Iron Pass, Mine, Marsh) aileler ve dersler farklı.
**Caster'sız savaş:** 0 (King's Bridge'i katı sayarsan 1; Ash Brand yalnızca Faz 2'de açılıyor). Kural (en çok 1) sağlanıyor.
**Class kopyası kalan:** yalnızca Pilgrim Road (hikâyeli rakip bölük).

**Pilgrim Road hikâyesi (öneri, oyun içi İngilizce):** karşılaşma adı *"The Silver Stag Company"*, alt başlık *"Battle · Rival Company"*. Gerekçe: St. Brann'ın emanetinin peşindeki paralı bir maceracı bölüğü, aynı yolda giden oyuncu takımını rakip görüp yolu keser. Birimlere `name`: "Stag Sellsword", "Stag Knife", "Stag Bowman", "Stag Magus". Sınıf kitleri aynen (bunlar gerçekten maceracı).

## 4. Elit ve boss kitleri

### 4.1 Black Cathedral: High Priest of the Undying (elit = pasif + 3 aktif)

Arka, **caster** · INT 32, zırh 12, MZ 16, MP = 30 + INT + 30 (P13) · elit can çarpanı bugünkü gibi 1,1-1,4 · Pasif P13 Vessel of the Choir.

| Skill | Hedef / şekil | Etki | MP / CD | İkon | VFX |
|---|---|---|---|---|---|
| **Bone Rite** (temel) | tek düşman, menzilli | INT büyü (karanlık) 0,7 + 2 tur Wound | 0 / — | Kemik asa ucunda mor mum | Mum alevinden çıkan kemik kıymıkları hedefe saplanır |
| **Requiem** | bir sütun, sıra sıra | INT büyü (karanlık) 0,55, sıra başına %25 azalan (falloff 0,75) + 3 tur Wither (INT 0,1) | 14 / 3 | Açık ilahi kitabı, sayfalardan mor duman | Sütun boyunca ilerleyen hayalet koro yüzleri, ardında yeşil-mor çürüme |
| **Unholy Benediction** | tek dost | INT şifa 0,5 + 2 tur Blessed | 12 / 4 | Kemik eller arasında mor kutsal ışık | Dostun üstünde ters dönmüş mor hale, aşağı süzülen kül |

Çizim: *"The high priest of a corrupted black cathedral, very tall and skeletally thin, floating slightly above the ground, crown of fused finger bones, long violet-and-black vestments embroidered with tarnished silver skulls, face hidden behind a cracked porcelain mask with weeping black streaks, a tall bone crozier topped with a burning violet candle, ring of small floating candles, violet candlelight as accent colour."*

### 4.2 King's Bridge: The Bridge Warden (boss = pasif + 3 aktif + ultimate)

Çizim ve kit **zaten özel ve kural şeklini karşılıyor** (değişmez, Ömer 2026-10-16): pasifler Unyielding, Anchored, Ember Heart; aktifler Anchor Smash (temel), Breaking Span, Chain Hook, Ash Brand (Faz 2+); ultimate Fall of King's Bridge (Faz 3). Kural "3 aktif" der, Warden'da 4 var; Ömer 2026-10-16: olduğu gibi kalır. Endless ile ortak karşılaşma; dokunulursa Endless dengesi de değişir.

## 5. YENİ MEKANİK listesi (onay sayfası için)

| # | Ad | Tek satır kural | Motor kancası |
|---|---|---|---|
| YM1 | Cut and Run | Savaş başına bir kez, canı ilk kez %50 altına düşünce 1 tur Shrouded + hız desteği (Skip Turn'deki gibi). | onDamaged can eşiği + var olan `shrouded` ve `speedBoost` |
| YM2 | Last Ember | Ölünce, öldüren kahramanın hücresi 2 tur yanan zemin olur (yalnızca skill vuruşuyla öldürülürse). | ölüm olayı (killer) + var olan `burning` zemini |
| YM3 | Rebuke | Melee ile vurulunca zırhın engellediği hasarın %30'u saldırana fiziksel hasar olarak döner. | hasar alma (onDamaged) |
| YM4 | Stone Patience | Tur başında, son turundan beri hasar almadıysa +8 zırh (en çok +24); hasar alınca bonus sıfırlanır. | tur başı + onDamaged, birikimli zırh |
| YM5 | Deep Hoard (MP) | Mevcut MP'nin %50'si kadar ek zırh ve büyü zırhı (anlık). | canlı türev stat |
| YM6 | Ward-Etcher (MP) | MP harcadığı skill'den sonra zırhı en düşük dosta, harcanan MP x 2 büyü kalkanı (2 tur). | MP harcama olayı + var olan `shield` |
| YM7 | Mire-Bound | Bu birim yaşadıkça Omen'li kahramanların hızı %20 düşer (aile içinde yığılmaz). | aura, hız çarpanı (sıra sayacı) |
| YM8 | Flicker | Skill vuruşu isabet edince 1 tur Shrouded; kendi turu başına bir kez. | onDamaged + var olan `shrouded` |
| YM9 | Corpse Hunger | Çağrı olmayan herhangi bir birim ölünce maks. canının %15'i kadar iyileşir. | ölüm olayı (herkes) -> şifa |
| YM10 | Bone Ward | Kendi tarafında çağrılmış bir dost yaşadıkça aldığı hasar %30 azalır. | koşullu alınan hasar çarpanı |
| YM11 | Martyr's Vow | Savaş başına bir kez, bitişik dosta gelen ölümcül vuruşu kendisi alır (kendi zırhıyla). | ölümcül vuruş yönlendirme |
| YM12 | Censer Smoke | Kendisi ve aynı şeritteki dostlar tur başında maks. canın %4'ünü yeniler (Wound etkiler). | aura (şerit) + tur başı şifa |
| YM13 | Vessel of the Choir (MP) | +30 maks. MP; dostu kahraman skill'inden hasar aldıkça 2 MP kazanır. | maks. MP eki + dost onDamaged -> MP |

MP'ye dayanan: 3 / 13 (YM5, YM6, YM13). Flicker (YM8) ve Cut and Run (YM1) var olan durumları kullanır; yeni olan yalnızca tetik.

Ortak kancalar (engine-dev için; 13 kural 7 kancaya iner): onDamaged (YM1, YM3, YM4, YM8, YM13), ölüm olayı (YM2, YM9), tur başı aura / şerit (YM7 hız, YM12 şifa), MP harcama (YM6), canlı türev stat ve koşullu çarpan (YM4, YM5, YM10), ölümcül vuruş yönlendirme (YM11), zemin yerleştirme (YM2, var olan `burning`).

**Yeni mekanik DEĞİL, yalnızca doğrulanacak (engine-dev):** D1 `status: silence`'ın düz skill etkisiyle verilmesi (Clutch, Hag's Mark); D2 `dot` etkisinin `burning` durumuyla kullanımı (Kiln Smoke); D3 mob YZ'sinin çağırma skill'ini (Call the Buried) kullanması; D4 `cost.ofCurrent`'in temel saldırıda ve mobda çalışması (Penance Flail); D5 alan skill'inde `manaBurn {amount}` (Glyph of Breaking; Bölge II'de MP yakan TEK aktif); D6 düz skill etkisiyle `slow` (Dirge, Gatestone Slam, Rockfall). Tüm AKTİF skill'ler var olan etkilerle kurulu.

## 6. Bölge II sanat iş yükü

| Tür | Adet | Liste |
|---|---|---|
| Karakter çizimi (ChatGPT) | **8** | Deep Runecaller, Grave Chanter, Oathsworn Brother, Censer Monk, Thane of the Deep, High Priest of the Undying, Stonebound Warden (yeniden çizim), Hedge Witch Morwen (Ömer 2026-10-16) |
| Yeni skill ikonu (ChatGPT) | **23** | Billhook, Peat Smoke, Scatter Quarrels, Shovel of Embers, Kiln Smoke, Gatestone Slam, Rockfall, Pick of the Deep, Oath of Stone, Rune Spark, Glyph of Breaking, Cauldron Splash, Hag's Mark, Clutch, Dirge, Call the Buried, Penance Flail, Sanctuary, Holy Ember, Consecrate, Bone Rite, Requiem, Unholy Benediction |
| VFX sheet (8 kare, ChatGPT) | **23** | yukarıdaki 23 skill |
| Pasif ikonu | **13** (ChatGPT, Ömer 2026-10-16) | P1-P13 (Cut and Run, Last Ember, Rebuke, Stone Patience, Deep Hoard, Ward-Etcher, Mire-Bound, Flicker, Corpse Hunger, Bone Ward, Martyr's Vow, Censer Smoke, Vessel of the Choir) |

Onay paketleri (mob başına; karakter + ikonlar + VFX): 1 Moor Raider (2 skill), 2 Bandit Crossbowman (1), 3 Charcoal Burner (2), 4 Stonebound Warden (çizim + 2), 5 Thane (çizim + 2), 6 Deep Runecaller (çizim + 2), 7 Hedge Witch Morwen (çizim + 2), 8 Drowned (1), 9 Grave Chanter (çizim + 2), 10 Oathsworn Brother (çizim + 2), 11 Censer Monk (çizim + 2), 12 High Priest (çizim + 3). Pasif ikonları ilgili paketin içinde. Sesler kodla (WebAudio), çizim gerektirmez. Korunan eski mob skill'lerinin (Cudgel, Bolt, Ember Toss...) kendi ikon/VFX'i sonraya kalır (Ömer 2026-10-16).
Önerilen sıra (karşılaşma açılış sırasına göre): 1, 3 (Windy Moor, Charcoal Camp hazır olur) -> 4, 2, 6 (Iron Pass) -> 5 (Mine) -> 8, 7 (Marsh, Witch's Hut) -> 9 (Grave Field) -> 10, 11 (Abbey) -> 12 (Cathedral).

### 6.1 Yer tutucular (uygulandı 2026-10-16, engine-dev)

Bölge II veri + motor olarak oyunda; yeni sanat henüz yok. Her şey var olan bir sanatı **ödünç** kullanıyor, eksik dosya çökertmez. Sanat gelince yalnızca aşağıdaki alanlar değişir (id'ler sabit).

**Karakter çizimi** (`data/mobs/<id>.json > spriteId`; çizim gelince `spriteId` = mobun kendi id'si, dosyalar `assets/sprites/<id>/` + `assets/avatars/<id>.png`, `tools/import-mobs.py`):

| Mob (id) | Şu anki yer tutucu spriteId | Son spriteId |
|---|---|---|
| Deep Runecaller (`deep_runecaller`) | `ember_acolyte` | `deep_runecaller` |
| Grave Chanter (`grave_chanter`) | `ember_acolyte` | `grave_chanter` |
| Oathsworn Brother (`oathsworn_brother`) | `shieldwarden` | `oathsworn_brother` |
| Censer Monk (`censer_monk`) | `charcoal_burner` | `censer_monk` |
| High Priest of the Undying (`high_priest_of_the_undying`) | `charcoal_burner` (spriteScale 1,15) | `high_priest_of_the_undying` |
| Thane of the Deep (`thane_of_the_deep`) | `stonebound_warden` (spriteScale 1,12) | `thane_of_the_deep` |
| Hedge Witch Morwen (`hedge_witch_morwen`) | `fen_witchling` | `hedge_witch_morwen` |
| Stonebound Warden (`stonebound_warden`) | kendi id'si (eski palet çizimi) | aynı id, dosya yenilenir |

**Skill ikonu / VFX / ses** (`data/skills.json`; şu an `artOf` sahibinin `icon` + `vfx` + `sfx`'i birebir kopya, `tests/mobs.test.ts` bunu denetler). Sanat gelince skill'in `icon`/`vfx` alanı yeni ada (öneri: skill id'si) geçer ve `artOf` silinir (o skill için mobs.test artOf kuralı gevşetilir):

| Skill | id | artOf (ödünç) | icon | vfx | sfx |
|---|---|---|---|---|---|
| Billhook | `billhook` | `jinx` | `clover` | `bonethrow` | chainTether, boneImpact |
| Peat Smoke | `peat_smoke` | `smoke_bomb` | `smokebomb` | `smokebomb` | fistWhoosh, smokePuff |
| Scatter Quarrels | `scatter_quarrels` | `piercing_arrow` | `pierce` | `pierce` | heavyTwang, arrowWhoosh, arrowThunk |
| Shovel of Embers | `shovel_of_embers` | `fire_bolt` | `fireball` | `fireball` | flameIgnite, flameRoar, fireBlast |
| Kiln Smoke | `kiln_smoke` | `ash_brand` | `ashbrand` | `ashbrand` | emberHiss |
| Gatestone Slam | `gatestone_slam` | `tremor_slam` | `tremor2` | `tremor2` | plateCreak, heaveGrunt, shieldPlant, groundHeave |
| Rockfall | `rockfall` | `root_smash` | `rootsmash` | `rootfall` | woodCreak, woodSmash, rootsRumble, leafRustle |
| Pick of the Deep | `pick_of_the_deep` | `anchor_smash` | `anchorsmash` | `anchorsmash` | chainDrag, anchorImpact |
| Oath of Stone | `oath_of_stone` | `taunt` | `taunt2` | `taunt2` | shieldBang, battleRoar |
| Rune Spark | `rune_spark` | `void_strike` | `voidstrike` | `voidstrike` | voidPulse, implode |
| Glyph of Breaking | `glyph_of_breaking` | `drain_field` | `drainfield` | `drainfield` | voidSuction, voidPulse, energySlurp |
| Cauldron Splash | `cauldron_splash` | `withering_curse` | `drainfield` | `wail` | graveMoan, voidSuction |
| Hag's Mark | `hags_mark` | `doom_mark` | `voidstrike` | `voidstrike` | voidPulse, implode |
| Clutch | `clutch` | `venom_edge` | `venomedge` | `venomedge` | daggerDraw, twinSlice |
| Dirge | `dirge` | `bone_throw` | `bonethrow` | `bonethrow` | boneSpin, boneImpact |
| Call the Buried | `call_the_buried` | `raise_dead` | `raise` | `raise` | graveMoan, earthCrack, boneClatter, thud, soulDrain |
| Penance Flail | `penance_flail` | `melee_attack` | `sword` | `doublestrike` | armorRun, axeSwing, axeChop |
| Sanctuary | `sanctuary` | `spell_ward` | `spellward` | `spellward` | wardHum |
| Holy Ember | `holy_ember` | `holy_strike` | `judgehammer` | `hammerfall` | hammerWhoosh, hammerSlam |
| Consecrate | `consecrate` | `judgment` | `judgebeam` | `judgment` | hammerWhoosh, hammerSlam, fireCrackle |
| Bone Rite | `bone_rite` | `evil_eye` | `eye` | `voidstrike` | darkChant, boneImpact |
| Requiem | `requiem` | `withering_curse` | `drainfield` | `wail` | graveMoan, voidSuction |
| Unholy Benediction | `unholy_benediction` | `rejuvenate` | `rejuvenate` | `rejuvenate` | chimeHeal, leafRustle |

Not: Wither ve Jinxed uygulayan skill'ler (Billhook, Cauldron Splash, Requiem) Hexer sanatını ödünç alır; durum rozetinin sürüm sahibi Hexer kalır (`tests/ui-hooks-v2.test.ts`).

**Pasif ikonu** (`data/mobs/<id>.json > passive.icon`; var olan ikon türleri, `src/ui/icon-kinds.ts`). ChatGPT ikonu gelince `icon` yeni ada geçer:

| # | Pasif (id) | Yer tutucu icon | Kimde |
|---|---|---|---|
| P1 | Cut and Run (`cut_and_run`) | `shrouded` | Moor Raider, Bandit Crossbowman |
| P2 | Last Ember (`last_ember`) | `flame` | Ember Acolyte, Charcoal Burner |
| P3 | Rebuke (`rebuke`) | `bash` | Shieldwarden |
| P4 | Stone Patience (`stone_patience`) | `bulwark` | Stonebound Warden |
| P5 | Deep Hoard (`deep_hoard`) | `mpregen` | Thane of the Deep |
| P6 | Ward-Etcher (`ward_etcher`) | `rune` | Deep Runecaller |
| P7 | Mire-Bound (`mire_bound`) | `hourglass` | Fen Witchling, Hedge Witch Morwen |
| P8 | Flicker (`flicker`) | `feather` | Will-o'-Wisp |
| P9 | Corpse Hunger (`corpse_hunger`) | `soul` | Ghoul, Drowned |
| P10 | Bone Ward (`bone_ward`) | `bone` | Grave Chanter |
| P11 | Martyr's Vow (`martyrs_vow`) | `guardian` | Oathsworn Brother |
| P12 | Censer Smoke (`censer_smoke`) | `hpregen` | Censer Monk |
| P13 | Vessel of the Choir (`vessel_of_the_choir`) | `wail` | High Priest of the Undying |

Kaldırılan: `snare_shot` (Bandit Crossbowman'ın eski skill'i, başka sahibi yoktu). Korunan eski mob skill'leri (Cudgel, Hamstring, Gnaw, Feast, Drag Under, Ember Toss, Burn the Ground, Shield Bash, Hold the Line, Shield Wall, Hex Bolt, Bog Curse, Lure Light, Spark, Marsh Glow) aynen `artOf` ile kalır.

## 7. Taslak: Bölge III ve tutorial (Bölge I)

**Bölge III** (~5 yeni sıradan mob; Ashen Plain, Siege Line, Thornwood Hollow elit, Ember Road, Riverhead, Gate of Cinders, Castle Morvane boss):

| Mob | Aile | Rol | Fikir |
|---|---|---|---|
| Vanguard Pikeman (YENİ) | Morvane's Army | ön, melee | sütunu delen mızrak; pasif zırh/sıra tabanlı |
| Morvane Outrider (YENİ) | Morvane's Army | ön, hızlı | ön sırayı atlayan saldırı; pasif hız/tur tabanlı |
| Siege Arbalist (YENİ, kendi çizimi) | Morvane's Army | arka, menzilli | zırh delen atış (Crossbowman'dan farklı kit) |
| Cinder Knight (YENİ) | Guardians | ön, tank | ateşte güçlenen zırh |
| Pyre Witch (YENİ) | Ember Cult | arka, caster | Bölge III'ün ana caster'ı; geniş alan ateşi |
| Ash Revenant / Ash Hound / Flagellant | Undead / Beasts / Fanatics | | Bölge I-II çizimlerinden türeyen varyantlar, kendi kitleriyle (kapsam ayrıca) |
| Drake Priest (elit, özel çizim + kit) | Ember Cult | arka, caster | pasif + 3 aktif; Drakeling çağrısı |
| Lord Morvane (boss, özel çizim + kit, N5) | | | pasif + 3 aktif + ultimate; fazlı |

Bölge III'te 6 savaşın tamamı bugün class kopyası; hepsi mob olur. Rakip bölük savaşı Bölge III'te yok: tek rakip bölük Pilgrim Road (Ömer 2026-10-16).

**Tutorial / Bölge I** (en son yapılır): Road Thug (kit kalır, pasif P1 Cut and Run alır), Cutpurse (cutthroat kopyası -> YENİ mob), Grey Wolf (YENİ, Beasts), Ravenwood Poacher (Crossbowman paletinden kendi kitine), Bandit Chief (elit, özel çizim + pasif + 3 aktif). Tutorial'ın güç çarpanları ve ultimate kilitleri korunur. Sayım: Bölge I ~3 + Bölge II 4 + Bölge III ~5 = ~12 yeni sıradan mob tasarımı (karar ile uyumlu).

## 8. Açık sorular (Ömer): kapandı (2026-10-16)

Tümü önerilen seçenekle kapandı:
1. Morwen: kendi çizimi (+1 karakter, 2.3 Hexes).
2. Palet varyantları: Moor Raider ve Charcoal Burner palet olarak kalır; Stonebound Warden şimdi yeniden çizilir (2.3 Guardians).
3. Bridge Warden: değişmez (4 aktif + ultimate).
4. Rakip bölük: Pilgrim Road'da Gambler yerine Mage; tek rakip bölük savaşı (Bölge III'te yok).
5. Pasif ikonları: ChatGPT ile çizilir (13 ikon).
6. Korunan eski mob skill'lerinin ChatGPT ikon/VFX'i: sonra.
Ek (Ömer notu): MP ağırlıklı pasifler çeşitlendirildi (2.2, 5); yeniden onay gerekmez.
