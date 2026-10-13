# Ses haritası (2026-10-13)

Tüm sesler WebAudio sentezidir (dosya yok). Ses felsefesi CLAUDE.md'de: gerçek karşılığından kurulur, çan / saf sinüs çınlaması yok.
Codex > Assets > Sounds hepsini listeler ve çalar ("UI (menus)", "World & stingers" grupları, en altta "Soundtracks").

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

## Müzik (`data/audio-music.json` + `data/audio-music-tracks.json`, motor `src/game/music.ts`, denetim `src/ui/music.ts > sceneMusic`)

| Parça | Ad | Nerede | Karakter |
|---|---|---|---|
| menu | Embers of Valdoria | ana menü, takım seçimi, multiplayer lobisi | Re dorian 3/4, lavta arpejleri, flüt, drone, çerçeve davul |
| map | The Long Road | sefer haritası | Sol miksolidyen 4/4 yürüyüş, lavta adımları, hafif davul, alçak flüt |
| town | Hearth and Ale | kasaba ekranı | Fa majör 3/4 jig, parlak lavta, flüt teması, bodhrán |
| battle | Steel at Dawn | savaş (hızlı savaş, sefer, Endless dalgası, MP) | La minör 4/4, bir oktav alçak lavta ostinatosu, savaş davulu, kısık |
| boss | The Warden's Wrath | boss savaşı | Re frigyen 4/4, daha ağır davul ve rulolar, kalın drone |
| camp | Embers at Night | Endless başlığı ve kampı (ara verme) | Mi dorian yavaş 3/4, seyrek lavta, alçak flüt |

Sahne değişince eski parça `crossfadeMs` (2,4 sn) içinde söner, yenisi yükselir; her parça kaldığı ölçüden devam eder. Savaş bitince müzik
söner ve zafer / yenilgi stingeri çalar (Endless zaferinde kamp müziğine geçilir). Codex > Sounds > Soundtracks'te ▶ ile önizlenir
(Codex kapanınca sahnenin müziğine döner). CPU: aynı anda en çok iki motor (geçişte), kısa yankı, notalar önceden hesaplanıp önbellekte.

## Eksik / sonraya

- Level-up anı oyunda henüz yok (XP verilmiyor); ses tasarlanmadı.
