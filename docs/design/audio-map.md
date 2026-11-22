# Ses haritası
> **Ne için / Güncel mi (2026-11-08):** Ses haritası: WebAudio sentezi, kaydırıcılar, dünya sesleri, müzik tablosu, Vesper sesleri. Tam ses listesi Codex > Assets > Sounds ve `data/audio*.json` (esas kaynak); Harita 3 mob sesleri ve Skald sesleri bu belgede ayrıca anlatılmaz.


Tüm sesler WebAudio sentezidir (dosya yok). Ses felsefesi: gerçek karşılığından kurulur; saf sinüs çınlaması yok. Çan yalnız gerçek bronz kısmilerle (Vesper) kurulur; Bridge Warden'da çan sesi kullanılmaz.
Codex > Assets > Sounds hepsini listeler ve çalar ("UI (menus)", "World & stingers", "Campaign enemies" grupları, en altta "Soundtracks").

## Kaydırıcılar (Settings > Sounds)

| Kaydırıcı | Neyi çarpar |
|---|---|
| Master Volume | her şeyi |
| Music | ana menü + sahne müzikleri |
| Sound Effects | skill sesleri (`data/audio.json`, v2) + dünya sesleri `bus: "sfx"` |
| UI sounds | menü sesleri (`data/audio-ui.json`) + dünya sesleri `bus: "ui"` |

## Dünya / anlatı sesleri (`data/audio-world.json`, çalma `src/ui/ui-sound.ts > worldSound`)

| Ses | Gerçek karşılığı | Nerede çalar | Kaydırıcı |
|---|---|---|---|
| map_unroll | parşömen harita masaya açılır | sefer haritası açılınca (`CampaignMapScene.create`) | UI |
| map_roll | harita dürülür, deri bağ çekilir | haritadan çıkınca (sahne kapanışı) | UI |
| book_open | ağır deri cilt açılır, sayfalar yelpazelenir | Codex açılınca (`wiki/view.ts > setOpen`) | UI |
| book_close | cilt kapanır | Codex kapanınca | UI |
| quill | tüy kalem parşömende üç çizik | seçenekli olay / kasaba diyaloğu penceresi açılınca (`choiceModal`) | UI |
| seal | mühür mumuna basılır | olay / diyalog seçeneği seçilince | UI |
| coin_count | sikkeler meşe tezgâha sayılır | tüccar ekranı açılınca (kasaba, Odo, Endless; `openMerchant`) | UI |
| door | demir mandal + meşe kapı menteşesi | kasaba ekranında bina yerine dokununca (ticaret, ilan, hikâye) | UI |
| hearth | ocakta odun oturur, çıtırtı | kasaba ateşine (rest) dokununca | UI |
| ember_ignite | çakmak sürtmesi + alev + çıtırtı | Valor korlarından biri tutuşunca (`valor-braziers.ts`) | UI |
| loot_reveal | sandık kapağı gıcırdar, sikkeler kayar | Spoils / Treasure kartı açılınca (`showSpoils`) | UI |
| item_cloth | kumaş hışırtısı | tılsım (charm) kaldırma / kuşanma / çıkarma (Gear) | UI |
| item_leather | deri gıcırtısı + kayış | zırh, eldiven, çizme | UI |
| item_metal | kısa, boğuk çelik tıkırtısı (çınlamaz) | balta, gürz, hançer, kalkan, miğfer | UI |
| item_wood | boğuk ahşap vuruş | yay, asa | UI |
| item_jewel | ince zincir tıkırtısı | trinket | UI |
| march_step | toprak yolda çizme adımı | haritada yürüyüş boyunca (tempo `march.stepMs`) | SFX |
| wagon_creak | araba aksı gıcırtısı + tekerlek | yürüyüşte her `march.wagonEvery` adımda | SFX |
| battle_horn | savaş borusu + iki davul | savaş başında (`BattleScene.startBattleAudio`) | SFX |
| boss_horn | daha alçak, uzun boru + üç ağır davul | boss savaşı başında | SFX |
| victory | yükselen boru çağrısı + davul + uzak alkış | zafer (savaş sonu) | SFX |
| defeat | alçalan boru + iki yavaş davul + rüzgâr | yenilgi | SFX |

Item kaldırma (sürükleme başı) aynı malzeme sesini `itemPickupGain` ile kısık çalar. Settings ekranı açılıp kapanınca menü sesi `open` / `close` (parşömen) çalar.

## Sefer düşmanı skill sesleri (`data/audio-mobs.json`, çalma `src/game/mob-sfx.ts`)

Her mob skill'inin kendi sesi vardır (Bölge I-III, Harita 2 önderleri ve sıradan mobları); ödünç ses yalnız tabloda olmayan skill için yedektir. Efekt eski ses adını ister, `roles` tablosu bunu role çevirir (cast, travel, hit, none; `skills.<id>.roles` ezer). Tarifler ve tepe seviyeleri `data/audio-mobs.json`'dadır; Codex > Assets > Sounds > "Campaign enemies" grubunda ▶ ile dinlenir. Kaydırıcı: Sound Effects. Mob başına ses tarif paragrafları: `docs/archive/design/audio-map-mob-sounds.md`.

## Müzik (`data/audio-music.json` + `data/audio-music-tracks.json`, motor `src/game/music.ts`, denetim `src/ui/music.ts > sceneMusic`)

| Parça | Ad | Nerede | Karakter |
|---|---|---|---|
| menu | Embers of Valdoria | ana menü, takım seçimi, multiplayer lobisi | Re dorian 3/4, lavta arpejleri, flüt, drone, çerçeve davul |
| map | The Long Road | sefer haritası | Sol miksolidyen 4/4 yürüyüş, lavta adımları, hafif davul, alçak flüt |
| town | Hearth and Ale | kasaba ekranı | Fa majör 3/4 jig, parlak lavta, flüt teması, bodhrán |
| battle | Steel at Dawn | savaş (hızlı savaş, sefer, Endless dalgası, MP) | La minör 4/4, bir oktav alçak lavta ostinatosu, savaş davulu, kısık |
| boss | The Warden's Wrath | boss savaşı | Re frigyen 4/4, daha ağır davul ve rulolar, kalın drone |
| boss_wyrm (+2, +3) | Jaws of the Weir | The Weir-Wyrm (Harita 2; faz 2 / 3: 146 / 158 bpm) | Do frigyen 4/4 134, akıntı gibi kıvrılan alçak lavta, "maw" teması, kabaran davul |
| boss_vane (+2, +3) | Run Out the Guns | Admiral Vane (Harita 2; faz 2 / 3: 164 / 176 bpm, faz 3 reel arpeji) | La dorian 3/4 152, hızlı denizci jigi, güverte tepen davul, "broadside" teması |
| boss_queen (+2, +3) | The Drowned Crown | The Drowned Queen (Harita 2; faz 2 / 3: 138 / 150 bpm) | Fa dorian 4/4 126, yuvarlanan "tide" lavta, siren ağıdı "crown" teması, geniş yankı |
| map_reach | The Grey Delta | Harita 2 sefer haritası | Mi dorian 4/4 76, sisli delta, alçak lavta + martı gibi flüt |
| town_reach | Salt and Tar | Harita 2 kasabaları | Re miksolidyen 3/4 96, iskele meyhanesi denizci havası |
| battle_reach | Brine and Steel | Harita 2 sıradan savaşları | Re dorian 4/4 108, bir oktav alçak lavta, savaş davulu, kısık |
| camp | Embers at Night | Endless başlığı ve kampı (ara verme) | Mi dorian yavaş 3/4, seyrek lavta, alçak flüt |

Sahne değişince eski parça `crossfadeMs` (2,4 sn) içinde söner, yenisi yükselir; her parça kaldığı ölçüden devam eder. Savaş bitince müzik
söner ve zafer / yenilgi stingeri çalar (Endless zaferinde kamp müziğine geçilir). Codex > Sounds > Soundtracks'te ▶ ile önizlenir
(Codex kapanınca sahnenin müziğine döner). CPU: aynı anda en çok iki motor (geçişte), kısa yankı, notalar önceden hesaplanıp önbellekte.

## The First Fire's Verdict (2026-11-21, ui-dev)
- **Vuruş sesleri (2026-11-21, Ocak mührü efektiyle; YENİ sentez, ödünç ses kalktı; `data/audio-first-fire.json`, çalma `src/game/first-fire-fx.ts`):** gerçek karşılığı: mühür halkası metal gibi sürtünerek kapanır, sonra yargıç tokmağı gibi kuru bir vuruş ve alevin "fşş" soluğu. Saf sinüs çınlaması yok.
  - `strike_seal` (mühür belirirken çalar, 0,39 sn, tepe 0,35 / -9,0 dB, RMS -23,9 dB): ince, yükselen metalik sürtünme; dar bant gürültü 2,2 -> 5,6 kHz (Q 6) + iki FM üçgen (1150 -> 1780 Hz oran 1,41; 1630 -> 2520 Hz oran 2,76; 21 / 27 Hz titreşim, yüksek geçiren) + alçak hava çekişi (alçak geçiren gürültü 380 -> 1100 Hz).
  - `strike_hit` (alev fışkırınca çalar, 0,30 sn, tepe 0,68 / -3,4 dB, RMS -24,0 dB): kuru tık (yüksek geçiren gürültü 3,6 kHz, 30 ms) + alçak gövde darbesi (sinüs 150 -> 46 Hz, 0,22 sn) + boğuk taş tıkırtısı (kare 220 -> 118 Hz, alçak geçiren 900) + çatlama (alçak geçiren gürültü 2,6 kHz -> 240 Hz) + yükselen beyaz gürültü soluğu (bant 1,7 -> 5,2 kHz ve yüksek geçiren 0,9 -> 2,6 kHz, 0,35 sn). Yankı yok (kuru).
  - İkisi birlikte (fışkırma 0,42 sn'de): 0,72 sn, tepe 0,64 (-3,8 dB), kırpma 0. Ölçüm OfflineAudioContext 44,1 kHz, master 0,8. Dinleme: `ui-shots-mobil-masaustu/first-fire/ses/vurus-muhur.wav`. Ömer kulakla onaylar; sayılar geçici. Çalışlar arası küçük sapma (`vary`: perde ±%3, seviye ±%8).
- **Bildirim sesleri (YENİ sentez, ödünç değil; `data/audio-first-fire.json`, çalma `BattleScene` > `playSceneSfxDef`, Master + Sound Effects kaydırıcısına uyar; ayrı ducking mekanizması kodda YOK):** üçü aynı aile: alçak titrek dron + kalp atışı, her bildirimde tırman.
  - `first_warn` (ilk uyarı, 1,9 sn, tepe -12,4 dB, RMS -32,2 dB): uzaktan alçak uğultu; testere 55 -> 51 Hz (alçak geçiren 220, titreme 4,5 Hz %60) + üçgen 58,5 -> 54 Hz + alçak gürültü nefesi; yavaş nabız 62 -> 40 Hz, 4 vuruş (0,45 / 0,8 / 1,35 / 1,7 sn).
  - `final_warn` (son uyarı, 2,0 sn, tepe -5,7 dB, RMS -26,9 dB): aynı motif yükselen ve yakın; testere 82 -> 123 Hz (titreme 8 Hz %75), üçgen 87 -> 130, üst testere 116 -> 175, bant gürültüsü 380 -> 1400 Hz yükselir; nabız hızlanır, 7 vuruş (0 / 0,5 / 0,9 / 1,22 / 1,48 / 1,68 / 1,84 sn), vuruş 70 -> 42 Hz.
  - **`start` (başlangıç; Ömer B'yi seçti 2026-11-21, kükreme ve A / C alternatifleri silindi)**: nefes ve fısıltı (3,3 sn, tepe -1,8 dB, RMS -22,4 dB, kırpma 0): derin açılış darbesi (sine 95 -> 26 Hz + alçak geçiren gürültü) 0,9 sn'de söner, ~1,25 sn'ye dek tam sessizlik (-69 dB), sonra yakın alçak nefes (bant gürültüsü 500 -> 800 Hz, 3,2 Hz titreme) + hışırtı (yüksek geçiren 3500 -> 5500 Hz) + dört sesli fısıltı korosu (voice katmanı 92 / 110 / 138 / 174 Hz, baskın nefes gürültüsü), ~2,7 sn'de ani kesilir. `data/audio-first-fire.json > sfx.start`.
  - WAV: `ui-shots-mobil-masaustu/first-fire/ses/baslangic.wav` (ilk-uyari.wav, son-uyari.wav değişmedi).

## Müzik: first_fire (The First Fire's Verdict; 2026-11-21, ui-dev)
- Parça `first_fire` (`data/audio-music-tracks.json`, mevcut müzik motoru `src/game/music.ts`; yeni çalma yolu yok). `firstFireStart` olayında savaş / boss müziği söner (`sceneMusic(null)`, Music fadeOutMs 1,2 sn), başlangıç sesi (fısıltı) çalarken müzik yok, `musicEnterMs` = 3200 ms sonra (`data/audio-first-fire.json`) `sceneMusic('first_fire')` girer (fadeIn 1,6 sn). Savaş bitince (zafer / yenilgi) `sceneMusic(null)` ve normal akış; dalga geçişi / boss fazı müziği değiştirmez (`BattleScene.ffMusic`); kural başlamadan müzik değişmez; yarım savaştan devam edilirse kural zaten başlamışsa baştan first_fire. Music kaydırıcısına ve Master'a uyar (motorun genel yolu). Durum denetimi: `musicState().track` (ses kapalıyken de istenen parça; `playing` yalnız ses açıkken).
- Besteleme: E frigiyen 4/4, 88 bpm, ölçü 2,73 sn; çok alçak titrek drone (B1 + E2, LFO 4,5 Hz) hep altta; harp bir oktav alçak ostinato (creep: tek sürünen nabız -> tread -> grind -> frenzy); savaş davulu yavaş kalp atışından (beat1, ölçüde 1 vuruş) ruloya (roll) hızlanır; form creep, tread, grind, frenzy, grind (döngü ~109 sn; gerilim çözülmez); uyarı seslerindeki motifle (alçak titrek drone + nabız) aynı aile; master 0,62.
- Dinleme dosyaları: `ui-shots-mobil-masaustu/first-fire/ses/muzik-first-fire.wav` (20 sn örnek) ve `gecis.wav` (eski müziğin sönmesi + fısıltı + yeni parçanın girişi, 13 sn). Ölçüm değerleri commit raporunda; sayılar geçici, Ömer kulakla onaylar.
  - Ölçüm (OfflineAudioContext, 44,1 kHz, master 0,8): üçünde kırpma 0; tepe ve RMS sırayla yükselir. Dinleme dosyaları: `ui-shots-mobil-masaustu/first-fire/ses/` (ilk-uyari.wav, son-uyari.wav, baslangic.wav). Ömer kulakla onaylar; sayılar geçici.

## Eksik / sonraya

- Level-up sesi tasarlanmadı.

## Vesper (sürüm 3, 2026-11-08, `data/audio-v2/vesper.json`)

Ömer: "bip bop gibi tek düze ses olmasın". Hepsi WebAudio tarifi; motor (`src/game/audio.ts`) bunun için üç ek aldı: `tone.fm` (FM metal dokusu: uyumsuz oranlı modülatör, sapması vuruştan sonra hızla söner), `sfx.room` (taş salon yankısı: paralel geri beslemeli gecikmeler, her döngüde alçak geçiren) ve `sfx.vary` (yalnız oyunda çalarken: her çalışta ±%2,5 ortak perde, katman başına ±%0,3 kayma, ±4 ms zaman, ±%12 seviye, gürültü tamponunda rastgele başlangıç; ölçüm ve önizleme sabit kalır).

- **Çan:** gerçek bronz kısmiler (hum 0,5 / prime 1 / tierce 1,183 / quint 1,506 / nominal 2 / superquint 2,66 / üst nominal 3,98 / 5,24 / 6,71 / 8,43). Her ana kısmi iki yakın frekansla çalar (0,3-3,7 Hz vuruş, dalgalanma). Metal dokusu FM (tierce, nominal, üstler) ve filtreli üçgen/testere; nominal ve üst nominalde dar bant gürültü rezonansı (nefes alan pırıltı). Üstler 0,1 sn içinde, hum en son söner. Saf sinüs yalnız birkaç kısmide.
- **Tokmak:** parlak tiz gürültü tıkı (12 ms) + 5,2 → 1,9 kHz süzülen bant gürültü + kare dalga "tın" + tokmak gövdesinin alçak gümlemesi.
- **Şimşek:** çatırtı patlağı + düzensiz 6-9 kıvılcım çıtırtısı + 6,5 kHz → 650 Hz yırtılma (38 Hz titreşim) + gümleme + iki yuvarlanan gök gürültüsü (5,7 / 3,4 Hz dalgalanma) + alt bas; uzak yankı.
- **Toll (2. tur):** çan + tokmağın kendi kısa uyumsuz çınlaması (2,1 / 3,4 kHz FM) ve daha sert tık; alçak geçirenli testere + üçgen gövde (dolu); "yaşayan kuyruk": vuruştan sonra kabaran kısmiler (0,8-2,3 Hz dalgalanma) ve superquint / quint / 5,24 üstünde uzun dar rezonanslar; 5 gecikmeli taş salon yankısı daha duyulur. `tollWave` aynı çanın kısmilerini 9 Hz nabızlı havada taşır, aynı salon.
- **Thunderpeal (2. tur):** Toll gibi zengin alçak çan (155 Hz) + `thunderCrack`'in şimşek dokusu (çatırtı, yırtılma, gürleme; kısık) + elektrik arkı (47 / 61 Hz vızıltı) + 9 düzensiz kıvılcım + çanın altında yuvarlanan alçak gürleme.
- **Cracked Bell:** düşüş = yaklaşan hava + düzensiz zincir halkaları + rüzgârda titreyen çatlak vızıltısı. Vuruş (3. tur, v3b, Ömer: "çok iyi"; 1. tur "tiz osuruk gibi", 2. tur "hâlâ sade", 3. tur v3a "kötü"): tiz vızıltı yok (testere, FM, hızlı titreme yok). Boğuk, ağır, karanlık çatlak bronz (prime 128 Hz, 1,15 kHz alçak geçiren): temas + gövde gümlemesi + alt bas + yarılma; darbe anında ilk 70 ms'de 9 kısa kırık metal çatırtısı (1-2,4 kHz, tek tık); gövdede uyumsuz çatlak çan kısmileri (0,5 / 0,97 / 1,23 / 1,44 / 1,93 / 2,38 / 2,87 / 3,61, 3-8 Hz pürüzlü çift vuruş, perdesi aşağı sarkan kısmiler, 7-11 Hz hafif titreme) + hızla sarkan iki kırık üst kısmi; hafif düşük gürleme; ardından kum hışırtısı + 10 moloz tıkı.
- **Great Bell:** en derin çan (prime 103 Hz, hum 51,5 Hz), ağır tokmak, en uzun kuyruk ve büyük salon yankısı; ayrıca daha derin ve uzun gök gürültüsü ve yere iniş (alt bas + taş gümlemesi + moloz tıkları).

Tepe = çevrimdışı çizim, ana ses 0,8 dahil (Codex > Sounds ölçümüyle aynı yöntem; diğer sınıf sesleri ortanca 0,60, %90'ı 0,80 altında). Aynı anda çalanlar: Great Bell üçlüsü 0,85, Thunderpeal ikilisi 0,86 (kırpma yok). Tekdüzelik denetimi: her seste kısmi / gürültü bileşenleri zamanla değişir (çanlarda spektrum ağırlık merkezi 2,5 kHz → 0,3 kHz kayar), üç rastgele çalış birbirine benzemez (ilinti çoğunda 0,1-0,6). **Ömer dinledi, Vesper sesleri tamamı onaylı (2026-11-09), dokunulmaz:** Toll vuruş / dalga ve Thunderpeal iyi (2. tur), `thunderCrack` çok iyi, `crackedBellFall` iyi, Great Bell iyi, `crackedBellHit` v3b çok iyi.

| Skill | Sesler | Gerçek karşılığı | Tepe | Süre (-60 dB) |
|---|---|---|---:|---:|
| Toll | `tollStrike`, `tollWave` | orta boy çan (prime 233 Hz) + taş oda; havada nabız gibi yayılan basınç dalgası + çanın havada çınlaması | 0,63 / 0,36 | 1,7 sn / 1,4 sn |
| Thunderpeal | `thunderPeal`, `thunderCrack` | alçak çan (155 Hz) + elektrik vızıltısı ve kıvılcımlar; şimşek (yukarıdaki tarif) | 0,56 / 0,68 | 1,9 sn / 1,3 sn |
| Cracked Bell | `crackedBellFall`, `crackedBellHit` | düşen çanın havası + zincir; kırık, boğuk, titreyen çan | 0,48 / 0,67 | 0,4 sn / 0,7 sn |
| Great Bell of Valdoria | `greatBellDescend`, `greatBellToll`, `greatBellThunder`, `greatBellImpact` | ağır zincir + itilen hava; en derin çan; derin gök gürültüsü; yere iniş | 0,51 / 0,57 / 0,54 / 0,28 | 0,8 / 3,9 / 1,8 / 0,5 sn |

Aynı tarifler `skills.json > sfx` denetimi için `data/audio.json` içinde de durur; sürüm seçicide v1 seçilirse genel hareketle başta çalar.

Tarihçe: 2026-11-01 sürüm 1-2 (sinüs kısmileri; Ömer "bip bop, tekdüze" buldu) → 2026-11-08 sürüm 3 (FM + doku + yankı + çalış başına sapma) → aynı gün 2. tur: Toll / Thunderpeal zenginleşti, `crackedBellHit` boğuk ağır darbe oldu → 2026-11-09 3. tur: `crackedBellHit` dolu, karanlık çatlak bronz (v3b onaylı; v3a reddedildi); tüm Vesper sesleri onaylı.

## Redtithe: Exsanguinate saplama sesleri (2026-11-22, Ömer form r41 op_stab, `data/audio-v2/antimage.json`)
- `daggerStabA`, `daggerStabB`: hançer ete saplanır. Katmanlar: kısa "fft" giriş (bandpass gürültü 2,2 kHz -> 0,7 kHz), alçak "thock" gövde (lowpass'lı üçgen 150 -> 58 Hz, 90 ms), ıslak et vuruşu (lowpass gürültü), tremolo'lu dar bant "şlap" (ıslaklık, 38 / 31 Hz). B, A'nın %86 perdesinde ve ıslaklığı 12 ms geç (iki hançer aynı sesi çalmasın). Çan / saf sinüs yok.
- Zamanlama (`art-v2/antimage/vfx.ts > voidstrike`): A saplama karesinde (hançerler hedefe girdiği, yaranın açıldığı kare), B 40 ms sonra; yalnız isabette (kaçınma / ıska / blokta saplama sesi yok).
- `implode` hizası: sesin kendi 0,22 sn emiş girişi var (patlama tepe ~0,221 sn); eskiden saplama karesinde başlatıldığı için patlama ~0,22 sn geç duyuluyordu. Şimdi `IMPLODE_LEAD` (220 ms) önce başlar, itiş süresi buna göre ayarlanır; oyun içi olay günlüğünde implode başlangıcı -> saplama karesi 233 ms (1 kare payı).
- Tepe (çevrimdışı çizim, ana ses 0,8 dahil; `docs/anim-review/new-art/redtithe-poses-v1/measure-sfx.mjs`): daggerStabA 0,545, daggerStabB 0,51, implode 0,72; üçü birlikte (oyundaki sırayla) 0,742, kırpma yok. Ömer'in kulak onayı bekliyor.
