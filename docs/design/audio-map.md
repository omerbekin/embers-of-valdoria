# Ses haritası (2026-10-13)

Tüm sesler WebAudio sentezidir (dosya yok). Ses felsefesi CLAUDE.md'de: gerçek karşılığından kurulur, çan / saf sinüs çınlaması yok.
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

## Sefer düşmanı skill sesleri (`data/audio-mobs.json`, çalma `src/game/mob-sfx.ts`; Ömer 2026-10-16)

Bölge I-II'deki her mob skill'inin (50 skill, 98 ses) KENDİ sesi var; artık bir class'ın sesini ödünç almaz. Efekt (ödünç v1/v2 ya da mobun
kendi sheet'i) eski ses adını ister (`c.sfx('axeChop')`); `roles` tablosu bunu role çevirir (cast = hazırlık / savurma / atış, travel = uçuş,
hit = vuruş, none = sessiz; skill bazında `skills.<id>.roles` ezer) ve skill'in o roldeki sesi çalar. Aynı ses bir dökümde 90 ms'den sık çalmaz.
Skill tabloda yoksa eski ödünç ses çalar (yedek; `skills.json > sfx` yedek olarak durur). Kaydırıcı: Sound Effects. Tepe 0,30-0,66 (vuruş ~0,6,
savurma ~0,45, uçuş ~0,3, ilahi/fısıltı ~0,38), class skill sesleriyle aynı seviye. Codex > Assets > Sounds > "Campaign enemies" grubunda
▶ ile dinlenir (kartta gerçek karşılığı ve kullanan skill yazar; "Play all in group" hepsini sırayla çalar).
Örnekler: Billhook = demir kanca savrulması + kumaş takılması; Rockfall = gürleme, sonra sırayla taş düşmeleri + çakıl; Dirge = ağzı kapalı
alçak mırıldanma (formantlı ses, sinüs değil); Holy Ember = buhurdan zinciri şıkırtısı + savrulma; Raven's Peck = çift karga gaklaması +
kanat çırpışı ve gaga darbesi; Bite = kurt hırlaması + diş şaklaması.

**Bölge III (campaign-dev 2026-10-17; mob-plan.md 10):** 14 yeni skill (Morvane Halberdier, Sworn Guard, Ash Hound, Cinder Gatewarden, Ember Hierophant,
Drake Priest ve final boss Lord Morvane), 29 yeni ses; hepsi WebAudio tarifi, kayıtlı dosya yok. Her yeni ses tepe ölçümüyle eşitlenmiş bir Bölge I-II
sesinin katmanlarından türetildi (frekans kaydırma + ek katman; kazanç şablondan, ek katmanda %10 kısık; tarayıcıda tepe ölçümü yapılmadı, kulak
kontrolü önerilir). Örnekler: Halberd Chop = uzun sap savrulması + kalın balta vuruşu; Scorch Bite = dumanlı hırlama + diş şaklaması ve kor çıtırtısı;
Hold the Gate = demir bantlı kalkan taşa vurulur + kalın "None pass the gate!" bağırışı; Cinder Lash = kor zincir kırbaç şaklaması + tıslama;
Iron Decree = kızgın mühür basılması + Morvane'nin derin tek komutu; Pyre of Morvane = yer gürlemesi, sonra tüm alanı saran alev. Lord Morvane'ın
sesleri de "Campaign enemies" grubunda (sahibi boss).

**Harita 2 önderleri (content-designer 2026-10-27):** 9 elit (Hook, Salt Hag Mother, Bastion, Vell, Wrecker-Captain, Marrow, Siren Queen, Salt Bishop,
Drowned Champion), Pit Champion "Gorr" ve 3 boss (Weir-Wyrm, Admiral Vane, Drowned Queen): 43 skill, 83 ses; her skill KENDİ tarifiyle (eski kopya /
yer tutucu tarifler ve Bridge Warden'ın ödünç sesleri kalktı). Aileler aynı malzemeden ama her biri ayırt edilir: kanca ailesi (Gaff Strike = kısa demir
kanca + yırtılma, Boarding Hook = ip ucunda dönen çatal kanca + ip gerilir, Debtor's Chain = zincir sarılır + asma kilit kapanır, Wrecker's Gaff = ıslak
sırık + kaldıraç gıcırtısı, Harpoon Line = zıpkın + gerilen halat); pala ailesi (Black Cutlass = kınından çekme + tek kesik, Captain's Rake = ileri-geri iki
savuruş, Cutlass Flurry = hızlı çift kesik, Drowned Greatsword = ağır ıslak savuruş + sıçrama); deniz büyüsü (Brine Curse = gargaralı lanet, Call the Tide /
High Tide / Surge = yükselen dalga ve kırılış, Salt Circle = dökülen tuz + kristal çıtırtısı, Requiem of Salt / Lament of the Deep = alçak koro); siren
sesleri formantlı kadın sesi (Queen's Lament = tiz ağıt, Grand Chorus = dört sesli akor, Siren's Call = nefesli iki notalık çağrı); Weir-Wyrm = kuyruk
şaklaması, ağız açılırken gargaralı hırıltı + ısırma ve yutkunma, kükreme + bent yıkılışı; Admiral Vane = top atışı + zincir gülle vınlaması, "Fire!" +
üç topluk yaylım, "All hands!" + tayfa tezahüratı; Gorr = demir yumruk, kalabalığın "Ohh!"u, göğüs yumruklama + adını haykıran kalabalık. Tepe ölçümü
çevrimdışı JS taklidiyle, Bölge I-II seslerine göre ayarlı (aynı ölçekte Billhook 0,56 / 0,74): savuruş ~0,55, vuruş ~0,72, ağır vuruş ~0,78,
ses / koro ~0,62, yumuşak ~0,44, ulti ~0,8; tarayıcıda kulak kontrolü önerilir. Mob sheet'i istek listesinin ilkini başta, kalanlarını vuruşta çalar:
Warden kaynaklı listelerde (wyrm_*, chain_shot) yalnızca biri vuruşa bağlı, diğerleri sessiz (`skills.<id>.roles`); Powder Keg / Brine Lash'in uçuş isteği
sessiz (uçuş sesi vuruşla üst üste binmesin).

## Müzik (`data/audio-music.json` + `data/audio-music-tracks.json`, motor `src/game/music.ts`, denetim `src/ui/music.ts > sceneMusic`)

| Parça | Ad | Nerede | Karakter |
|---|---|---|---|
| menu | Embers of Valdoria | ana menü, takım seçimi, multiplayer lobisi | Re dorian 3/4, lavta arpejleri, flüt, drone, çerçeve davul |
| map | The Long Road | sefer haritası | Sol miksolidyen 4/4 yürüyüş, lavta adımları, hafif davul, alçak flüt |
| town | Hearth and Ale | kasaba ekranı | Fa majör 3/4 jig, parlak lavta, flüt teması, bodhrán |
| battle | Steel at Dawn | savaş (hızlı savaş, sefer, Endless dalgası, MP) | La minör 4/4, bir oktav alçak lavta ostinatosu, savaş davulu, kısık |
| boss | The Warden's Wrath | boss savaşı | Re frigyen 4/4, daha ağır davul ve rulolar, kalın drone |
| boss_wyrm | Jaws of the Weir | The Weir-Wyrm (Harita 2) | Do frigyen 4/4 134, akıntı gibi kıvrılan alçak lavta, "maw" teması, kabaran davul |
| boss_vane | Run Out the Guns | Admiral Vane (Harita 2) | La dorian 3/4 152, hızlı denizci jigi, güverte tepen davul, "broadside" teması |
| boss_queen (+2, +3) | The Drowned Crown | The Drowned Queen (Harita 2; faz 2 / 3: 138 / 150 bpm) | Fa dorian 4/4 126, yuvarlanan "tide" lavta, siren ağıdı "crown" teması, geniş yankı |
| camp | Embers at Night | Endless başlığı ve kampı (ara verme) | Mi dorian yavaş 3/4, seyrek lavta, alçak flüt |

Sahne değişince eski parça `crossfadeMs` (2,4 sn) içinde söner, yenisi yükselir; her parça kaldığı ölçüden devam eder. Savaş bitince müzik
söner ve zafer / yenilgi stingeri çalar (Endless zaferinde kamp müziğine geçilir). Codex > Sounds > Soundtracks'te ▶ ile önizlenir
(Codex kapanınca sahnenin müziğine döner). CPU: aynı anda en çok iki motor (geçişte), kısa yankı, notalar önceden hesaplanıp önbellekte.

## Eksik / sonraya

- Level-up anı oyunda henüz yok (XP verilmiyor); ses tasarlanmadı.
