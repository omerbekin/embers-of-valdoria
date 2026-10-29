# Idle (boşta duruş) · Harita 3 kadrosu (22 birim) · Hollow King kalıbı

Bu iş bir skill efekti DEĞİL: Harita 3 (The Hollow Crown) birimlerinin savaştaki boşta duruş sprite'ı ve nefes döngüsü.
Ömer: "mob sprite'ı çizdirirken animasyonlu çizdireceğin varsa /vfx kullan". Hollow King örneği onaylandı
(`notes/hollow_king.md`): aynı yol, kalan birimler.

## Liste (22)
Kaynak `docs/design/campaign/maps-2-3.md` 4.3 + 6 (yeni mob 7, elit 8, boss 4; Hollow King bitti) ve Hollow Crown mekanik
seçimi D1-D4 (yıldırım mobları). Palet değişikliği olan moblar (Wight, Rime Hound, Clan Slinger, Rime Witch, Hollow Warden,
Molten Hound) bu turda YOK (Ömer'e açık soru).

| Rütbe | id |
|---|---|
| Mob | `snow_wolf`, `clan_axeman`, `cave_crawler`, `clan_skald`, `pyre_witch`, `cinder_knight`, `forge_golem` |
| Mob (yıldırım D1-D4) | `thunderwright`, `clan_stormcaller`, `gloam_eel`, `stormhorn_ram` |
| Elit | `pack_mother`, `clan_chief_brannoc`, `frozen_standard_bearer`, `oathkeeper`, `pyre_matriarch`, `forge_master_golem`, `ashborn_hierarch`, `cinder_warden` |
| Boss | `snowfather`, `hearthwarden`, `ember_of_the_first_hearth` |

## Tur 1 · Claude · çizim isteği + ekleme · 2026-10-29
Çizim: `node tools/codex/imagegen.mjs --list` (toplu, 2 paralel), Hollow King sheet'i + Thane idle.png stil referansı.
İstem kalıbı: 2x2 = 4 kare nefes döngüsü (insansı 1024x1536 hücre 512x768; dört ayaklı / yılan 1536x1024 hücre 768x512,
siluet ~1,5:1), sağa bakan yan profil, gerçek saydam zemin, tek figür (taşıyıcı / yardımcı yok), ayaklar sabit, ortaçağ.
Eski çizimin bilinen sorunlarına karşı: Pack-Mother kömür siyahı + gümüş yele (Snow Wolf beyaz), Pyre Matriarch tek kadın,
hepsi yan profil, Cave Crawler kısa gövde.
Düzeltmeler (çizim sonrası, Claude): dama boyanmış zeminler (`clan_stormcaller`, `gloam_eel`, `pack_mother`,
`clan_chief_brannoc`, `ashborn_hierarch`) `tools/import-mobs.py > remove_checker` ile silindi; `cinder_warden` ve
`hearthwarden` için Codex'in kendi ikinci denemesi seçildi (sonuncusu bozuk / ilgisiz görsel); `snowfather` çömelmiş ve
önden duruyordu: magenta zeminle yeniden çizildi, `tools/key-chroma.mjs` + kenar renk sızıntısı temizliği.
Kurulum: her kare temizlendi (alfa < 150 ve 400 px altı kırıntı silindi), dört kare kare 1'in taban çizgisi ve ayak
merkezine hizalandı → `new-art/<id>/<id>.png+json`; kare 1 → `assets/source/mobs/<id>.png` → `python tools/import-mobs.py
--only <id>` (idle.png + avatar; kafa kutuları `HEADS` > "Harita 3 kadrosu" bloğu); 4 kare → `assets/source/mob-poses/<id>.png`
(4x3 ızgaranın ilk satırı) → `node tools/import-mob-art.mjs poses <id...>` (araç artık id listesi alır) → poses.png;
`data/mob-poses.json > <id>`: idle 450 ms/kare. Kareler arası piksel farkında belirgin aykırı kare (komşularının
~1,25 katından fazla) döngüden çıkarıldı, kalan üç kare ileri-geri (a, b, c, b; Hollow King yöntemi).
Geçici görünüm kaydı: `data/bosses/hollow-crown-looks.json` (22 birim, kit yok, inert, karşılaşmaya bağlı değil; boyut
`spriteScale`: mob ≤ 1 (dört ayaklılar en-boy sınırıyla 1,2-1,25), elit 1,12-1,4, boss 1,2-1,35).
Yakalama: `node tools/anim-capture.mjs --idle <id>` → `captures/idle-<id>/`. İnceleme görselleri (scratchpad): her satır =
solda savaş görünümü (soldaki kukla Stonebound Warden ile ölçek), sağda kullanılan pozların yakın planı, kesikli camgöbeği
= birimin zemin noktası.

Döngü sırası (aykırı kare çıkarılanlar, `data/mob-poses.json > idle`): `snow_wolf` [0, 1, 2, 1], `clan_skald` [0, 1, 3, 1], `forge_golem` [1, 0, 3, 0], `thunderwright` [0, 3, 1, 3], `gloam_eel` [0, 3, 1, 3], `stormhorn_ram` [1, 0, 2, 0], `pack_mother` [0, 1, 3, 1], `pyre_matriarch` [0, 3, 1, 3], `hearthwarden` [0, 1, 3, 1], `ember_of_the_first_hearth` [1, 0, 3, 0], `snowfather` [0, 2, 1, 2]; diğerleri [0, 1, 2, 3].
Boyut düzeltmesi (Codex öncesi, Claude): `thunderwright` 0,88 (cüce kuklayı aşıyordu), `forge_golem` 0,97.

## Tur 2 · Codex · kontrol · 2026-10-29
Yakalama: `captures/idle-<id>/` (2026-10-29), inceleme görselleri a1-a3 / b1-b3 (scratchpad). İki çağrı, 11'er birim.

| Birim | Gözlem | Karar |
|---|---|---|
| `snow_wolf` | Sola bakan yan profil; sıradan mob olarak kukladan küçük. Ayak tabanı zeminde, pozlar arasında belirgin kayma yok; nefes çok hafif, pop veya titreme görünmüyor. Boyalı stil ve kurt kimliği uygun; siyah hale yok. | tamam |
| `pack_mother` | Sola bakan yan profil; elit kütlesi Snow Wolf’tan belirgin büyük. Ayaklar zeminde sabit; kareler neredeyse aynı, nefes zor seçiliyor ama pop yok. Kömür siyahı kürk ve gümüş yele Snow Wolf’tan açıkça ayrı; stil uygun, siyah hale yok. | tamam |
| `cave_crawler` | Sola bakan yan profil; sıradan mob ölçeğinde. Bacaklar zemine basıyor, pozlar arasında taban kayması yok; baş/kıskaç hareketi küçük, pop görünmüyor. Fantastik-ortaçağ stili ve ayrı siluet uygun; siyah hale yok. | tamam |
| `gloam_eel` | Sola bakan kıvrımlı yan profil; sıradan mob kütlesinde, kukladan küçük. Gövde zeminde, poz değişimleri yumuşak; hafif nefes/hareket var, ani pop yok. Boyalı stil ve özgün yılanımsı kimlik uygun; siyah hale yok. | tamam |
| `stormhorn_ram` | Sola bakan yan profil; sıradan mob kütlesi kukladan küçük/eşit. Ayaklar zeminde, kareler çok benzer ve taban sabit; nefes ince, pop yok. Boynuzlu koç kimliği ve ortaçağ-fantastik stil uygun; siyah hale yok. | tamam |
| `clan_axeman` | Sola bakan yan profil; sıradan mob olarak kukladan küçük. Ayaklar zeminde ve sabit; gövde hareketi ince, kareler arasında pop yok. Silahı ve giysisi ortaçağlı, stil uygun; siyah hale yok. | tamam |
| `clan_skald` | Sola bakan yan profil; sıradan mob ölçeğinde, kukladan küçük. Asa ve ayaklar sabit; karelerde belirgin hareket az, pop/titreme yok. Tek figür, ortaçağlı ve boyalı stile uygun; siyah hale yok. | tamam |
| `clan_stormcaller` | Sola bakan yan profil; sıradan mob ölçeğinde. Ayaklar ve asa zemine sabit; kareler neredeyse aynı, nefes çok hafif ama pop yok. Fırtına asasıyla kimliği okunuyor, stil uygun; siyah hale yok. | tamam |
| `clan_chief_brannoc` | Sola bakan yan profil; elit ölçeğinde, sıradan moblardan büyük. Ayaklar zeminde sabit; pozlar çok benzer, belirgin nefes az ama pop yok. Kürk pelerinli şef kimliği ve ortaçağ stili uygun; siyah hale yok. | tamam |
| `frozen_standard_bearer` | Sola bakan yan profil; elit olarak sıradan mobdan büyük. Ayaklar ve sancak direği sabit; kareler çok benzer, nefes az seçiliyor ve pop görünmüyor. Tek figürlü, ortaçağlı tasarım uygun; siyah hale yok. | tamam |
| `snowfather` | Sola bakan yan profil; boss kukladan belirgin büyük. Ayaklar ve asa zeminde sabit; pozlar arasında kayma veya pop yok, nefes hafif. Boyalı stil ve buz devi kimliği uygun; siyah hale yok. | tamam |
| `pyre_witch` | Sola dönük yan profil; 107×194, kuklayla yaklaşık aynı ölçekte ve 4 px daha uzun. Zemin sabit; kareler çok benzer, nefes hareketi zor seçiliyor. Ortaçağ cadısı görünümü belirgin, tek figür. | duzelt: Mob ölçeği kuklayı az da olsa aşmasın; `spriteScale` yaklaşık `0,97`. |
| `cinder_knight` | Sola dönük yan profil; 96×191, kukladan dar ve hemen hemen aynı boyda. Taban sabit; kareler arasında pop yok, nefes çok hafif. Zırhlı şövalye stili uygun. | tamam |
| `forge_golem` | Sola dönük yan profil; 115×189, kukladan küçük. Ayaklar çizgide; karelerde belirgin sıçrama veya silüet pop’u yok, nefes çok ince. Taş ve dövme demir görünümü ayırt edici. | tamam |
| `thunderwright` | Sola dönük yan profil; 140×173, kukladan kısa ama daha geniş. Zemin sabit; kareler neredeyse aynı, nefes zor seçiliyor. Sakallı çekiçli savaşçı, ortaçağ stiliyle uyumlu. | tamam |
| `oathkeeper` | Sola dönük yan profil; 169×209, elit için kukladan belirgin büyük. Taban sabit; pozlar arasında pop yok, nefes çok hafif. Kalkanlı zırhlı figür tek ve ayırt edici. | tamam |
| `pyre_matriarch` | Sola dönük yan profil; 146×220, elit ölçeği belirgin. Zemin sabit; kareler arasında kayma veya pop görünmüyor, nefes ince. Tek kadın figür; kül rengi pelerin ve asa, kızıl cübbeli kültçülerden farklı. | tamam |
| `forge_master_golem` | Sola dönük yan profil; 145×231, elit için belirgin büyük. Ayak ve çekiç tabanı çizgide; karelerde ani değişim yok, nefes zayıf. Ağır zırhlı golem kimliği belirgin. | tamam |
| `ashborn_hierarch` | Sola dönük yan profil; 140×221, elit ölçeği uygun. Taban sabit; döngüde pop yok, nefes hafif. İskelet din adamı ve kitap tasarımı tek figürlü, ayırt edici. | tamam |
| `cinder_warden` | Sola dönük yan profil; 140×218, elit için büyük. Ayaklar çizgide; pozlar tutarlı, ani pop yok; nefes zor seçiliyor. Alevli mızraklı zırhlı figür ortaçağ stiliyle uyumlu. | tamam |
| `hearthwarden` | Sola dönük yan profil; 154×229, boss için kukladan belirgin büyük. Ayak ve çekiç zeminde sabit; karelerde sıçrama veya pop görünmüyor, nefes çok hafif. Lav çatlaklı taş dev, tek figür. | tamam |
| `ember_of_the_first_hearth` | Sola dönük yan profil; 153×261, boss olarak belirgin büyük. Taban çizgide; kareler tutarlı, pop yok; alev silüetinde hafif hareket var. Ateşten yaratık görünümü özgün ve ortaçağ fantezisine uygun. | tamam |

Son: 2026-10-29 · Codex

## Tur 3 · Claude · düzeltme · 2026-10-29
`pyre_witch` `spriteScale` 1 → 0,97 (kuklayı 4 px aşıyordu; şimdi 104x188, kukla 122x190). Yeniden yakalandı.
Claude yakın plan / ayak kontrolü (22 birim): ayaklar ve zemine değen silah/asa uçları dört karede aynı yerde; taban
camgöbeği çizginin birkaç px üstünde, Hollow King ile aynı (içe aktarma payı), kayma yok. Not: `cinder_warden` (taçlı,
sakallı, kor çatlaklı zırh) ile `hearthwarden` (taçlı, lav çatlaklı cüce kral) renk ve taç bakımından yakın; ayrı
okunuyorlar (glaive + uzun boy / çekiç + taş gövde) ama Ömer görmek isteyebilir.

## Tur 4 · Codex · kontrol · 2026-10-29
| Birim | Gözlem | Karar |
|---|---|---|
| `pyre_witch` | Sola bakan yan profil; Mob ölçeğinde kukladan küçük, Tur 2’de `spriteScale 0,97` ile önceki 4 px taşma giderilmiş. Ayaklar zemin çizgisinde ve pozlar arasında taban kayması yok. Kullanılan karelerde ani pop veya titreme görünmüyor; nefes hareketi hafif. Boyalı ortaçağ stili tek figür olarak uyumlu; Snow Wolf’tan belirgin ayrı. | tamam |

Son: 2026-10-29 · Codex
