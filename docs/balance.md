# Denge Hedefleri

## Hedef bantlar (Ömer kararı 2026-10-08; madde 261)
Sayılar `data/balance.json` dosyasındadır; `npm run sim` raporu ve `tests/balance.test.ts` + `tests/balance-b.test.ts` (ortak kontroller `tests/balance-checks.ts`) oradan okur.

| Ölçüm | Hedef |
|---|---|
| Ana ölçüm | **4'e 4** (varsayılan takım boyutu 4; `random-battle.json > random.size`), 10.000 savaş, iki farklı seed grubu (1.. ve 500001..). 5'e 5 ve 3'e 3 yalnızca kontrol (Ömer kararı: skill kullanım bantları YALNIZCA 4'e 4 için geçerli; 3'e 3/5'e 5'te skill payı sapmaları kabul) |
| Class kazanma oranı | **%44-56** (her iki seed grubunda) |
| Bedelsiz temel saldırı (class'ın 1. skill'i) kullanım payı | **%20-45** |
| Normal skill (2.-3. yuva, durumsal olmayan) | **%15-35** |
| Durumsal destek skill'leri (`balance.json > situational`: Close Ranks (eski Guard), Mana Barrier, Spell Ward, Jinx, Dark Bond, Resurrection) | **%8-25** |
| Ultimate (class'ın 4. skill'i) | birim hayattayken ultimate'ı ilk kez kullanılabilir olduğu (kendi turunda kullanılabilir) savaşlarda en az bir kez kullanma oranı, **class ORTALAMASI >= %50** (Ömer kararı 2026-10-08: class bazında ayrı kontrol yok); tek bir class **%35 altındaysa** (`ultimateLowWarn`) test ve rapor UYARI yazar; ham oran (tüm birimler) da raporlanır |
| Savaş süresi (tüm birimlerin turları toplamı, 4'e 4) | ortalama **35-50 tur** |
| Karşılaşma tablosu (A class'ının B class'ına karşı kazanma oranı; karşı taraflarda, aynı takımda değilken) | eşitlik HEDEFLENMEZ; yalnızca ezici eşleşmeler (> %75 / < %25, en az 200 savaş) işaretlenir |
| Taraf (oyuncu/düşman) | %45-55 |

- **Kullanım payı** = skill'in, class'ın TÜM hamleleri (Rest / Skip Turn / Move dahil) içindeki yüzdesi.
- Yapay zeka her iki tarafta Medium (tam terazi).
- Test grup başına `balance.json > test.runs` (5.000) savaşla iki ayrı seed grubunda (900001.., 300001..) aynı bantları korur; iki dosya paralel koşar (~1,5 dk). Tam ölçüm: `npm run sim` (argümansız: 2 x 10.000, tek çekirdekte birkaç dakika) ya da `npm run sim -- <savaş> <seed> [boyut] [boyut]`.

## Harita 1 tek kişilik başlangıç eğrisi (balance-tester 2026-11-01; Ömer hedefleri)
Yalnız yeni sefer (`soloStart`); eski kayıt değişmedi, Harita 2 aşağıda ayrı bölümde. Kaldıraç yalnız `data/campaign/campaign.json > soloStart.enemyScale` (mob canı ve hasarı). Ölçüm: Medium, duvar 10, `--overgrind=0`, 300 koşu, kasma simi; ±5 puan hata payı. Sim yüzdesi oyuncu yüzdesi değildir, Ömer'in gerçek oyunu simden güçlüdür.

Hedefler (Medium iyi oyuncu, ilk deneme): Grave ~85, Pilgrim ~88, St. Brann's ~75, Black Cathedral ~62, King's Bridge 45-50, Ashen Plain ~85, Siege Line ~82, Thornwood ~75, Ember Road ~84, Burnt Hamlet ~88, Riverhead ~92, Gate of Cinders ~86, Castle Morvane 45-55. Tek kahramanla ilk denemede kazanma: Windy Moor ve Brackenridge en az %80, Cairn Hill en az %75. Düğüm başına duvar en fazla %10. Kasma: Medium elit 2-3, boss 3-4, KASIP GEÇEN koşu başına (duvara vuran koşu bu ortalamaya girmez); Hard x2; Easy kasmasız; ortalama oyuncu üst sınır x1,5. Hedefler kodda `src/sim/campaign-targets.ts`.

| Düğüm | Takım | İlk deneme % | Zafer canı % | Takım / düğüm level | Duvar % | Kasıp geçen kasma |
|---|---|---|---|---|---|---|
| Mill Road | 1 | 100 | 73 | 1,0 / 1 | 0 | - |
| Ravenwood | 1 | 100 | 95 | 1,0 / 1 | 0 | - |
| Ruined Watchtower | 1 | 100 | 90 | 3,0 / 1 | 0 | - |
| Windy Moor | 2 | 100 (tek kahraman 84,9) | 93 | 4,0 / 1 | 0 | - |
| Brackenridge | 2 | 100 (tek kahraman 85,1) | 94 | 4,0 / 1 | 0 | - |
| Cairn Hill | 2 | 100 (tek kahraman 79,2) | 92 | 4,0 / 1 | 0 | - |
| Iron Pass | 2 | 94,2 | 66 | 4,0 / 2 | 1 | - |
| Charcoal Camp | 2 | 95,1 | 70 | 4,0 / 2 | 0 | - |
| Dwarven Mine | 3 | 92,6 | 79 | 4,1 / 3 | 0 | - |
| Witch's Hut | 3 | 94,2 | 78 | 4,2 / 3 | 0 | - |
| Misty Marsh | 3 | 99,0 | 81 | 4,0 / 3 | 0 | - |
| Grave Field | 3 | 86,0 | 70 | 4,2 / 3 | 1 | - |
| Pilgrim Road | 3 | 89,9 | 66 | 4,7 / 4 | 1 | - |
| St. Brann's Abbey | 3 | 76,4 | 63 | 5,0 / 4 | 3 | - |
| Black Cathedral (elit) | 3 | 64,8 | 61 | 5,3 / 4 | 8 | 4,57 |
| King's Bridge (boss) | 3 | 44,0 | 35 | 5,4 / 6 | 5 | 3,11 |
| Ashen Plain | 4 | 84,0 | 71 | 6,8 / 6 | 0 | - |
| Siege Line | 4 | 80,9 | 68 | 6,9 / 7 | 1 | - |
| Thornwood Hollow (elit) | 4 | 70,3 | 49 | 7,1 / 7 | 3 | 3,31 |
| Ember Road | 4 | 83,9 | 63 | 7,0 / 8 | 0 | - |
| Burnt Hamlet | 4 | 87,8 | 72 | 7,3 / 8 | 0 | - |
| Riverhead | 4 | 85,4 | 78 | 7,5 / 9 | 0 | - |
| Gate of Cinders | 4 | 83,4 | 72 | 7,8 / 9 | 0 | - |
| Castle Morvane (boss) | 4 | 54,5 | 38 | 8,1 / 10 | 16 | 3,40 |

Özet: iyi oyuncu bitirme %70,7, duvar %29,3; kolay düğümler hariç normal ilk deneme %86,3. Ortalama oyuncu bitirme %34, en büyük duvarlar Black Cathedral 31, Castle Morvane 25, St. Brann's 18, Thornwood 14, King's Bridge 13 (hedef dışı değil, bilgi: %10 duvar hedefi iyi oyuncu için).

Hedef dışı kalanlar: Castle Morvane duvarı %16 (sınır 10); Black Cathedral kasıp geçen 4,57 ve Thornwood 3,31 (elit 2-3); Riverhead ilk deneme 85,4 (hedef ~92); Thornwood ilk deneme 70,3 (hedef ~75). Normal düğümlerde 0,3-0,48 görünen kasmanın çoğu Inn beklerken kolay devriyedir (ör. Ember Road 0,43'ün 0,41'i), gerçek kasma değildir.

## Harita 2 eğrisi (balance-tester 2026-11-01; Ömer hedefleri)
Eski ve yeni kayıtta aynı (Harita 2 iki kayıt türünde de aynı yapıda; open-questions Q-NEW). Kaldıraç yalnız `data/campaign/campaign.json > mapEnemyScale` (mob canı ve hasarı). Ölçüm: Medium, iyi oyuncu, duvar 10, `--overgrind=0`, 300 koşu, kasma simi. Hata payı n'e göre: n=200'de ±5, n=40'ta ±12 puan. Throne of Brine aynı çarpanla iki 300 koşuda ilk deneme %50 ve %40 verdi. Sim yüzdesi oyuncu yüzdesi değildir.

**Ana hedef (Ömer 2026-11-01):** iyi oyuncu Harita 2 bitirme %60-75 (Harita 2'ye ulaşan koşular içinde). Ölçülen: %58,6, hedefin 1,4 puan altında (n=215'te hata payı ±7). Bitirme tutmuyorsa elit ve boss ilk deneme oranları eski hedefin üstüne çıkabilir (Ömer).

Eski hedefler (ilk denemede kazanma; artık ikincil): ilk bölge normal 90-95; sonrası normal 80-88; elit 60-70; The Weir Mouth 55-60, Gallows Cove 50-55, Throne of Brine 45-55. Kasıp geçen koşu başına kasma: elit 2-3, boss 3-4. Düğüm başına duvar en çok %10.

| Düğüm | Çarpan can / hasar: önce -> şimdi | n | İlk denemede kazanma %: önce -> şimdi | Eski hedef | Duvar % | Kasma |
|---|---|---|---|---|---|---|
| dr1 The Long Stair | 1,3 / 1,3 -> 1,12 / 1,12 | 215 | 100,0 -> 100,0 | 90-95 | 0 | 0,00 |
| dr3 The Rapids | 1,25 / 1,25 -> 1,1 / 1,1 | 215 | 94,0 -> 99,1 | 90-95 | 0 | 0,00 |
| dr4 Drowned Mill | 1,25 / 1,25 -> 1,1 / 1,1 | 177 | 91,2 -> 94,4 | 90-95 | 0 | 0,00 |
| dr5 Barge Wreck | 1,3 / 1,3 -> 1,12 / 1,12 | 198 | 96,8 -> 99,5 | 90-95 | 0 | 0,00 |
| dr7 Tollhouse (elit) | 1,05 / 1,18 -> 1 / 1,05 | 215 | 73,6 -> 88,8 | 60-70 | 4 | 2,50 /geçen |
| dr8 Hangman's Oak | 1,35 / 1,35 -> 1,15 / 1,15 | 206 | 96,8 -> 99,5 | 90-95 | 0 | 0,05 |
| dr9 Old Weir Road | 1,15 / 1,15 -> 1,05 / 1,05 | 183 | 94,1 -> 95,6 | 90-95 | 1 | 0,05 |
| dr10 Widow's Ford | 1,25 / 1,25 -> 1,1 / 1,1 | 175 | 96,9 -> 96,6 | 90-95 | 0 | 0,00 |
| dr13 Reedway | 0,8 / 0,8 -> 0,73 / 0,73 | 204 | 89,4 -> 92,6 | 80-88 | 3 | 0,29 |
| dr14 Salt Pans | 1,2 / 1,2 -> 1,05 / 1,05 | 153 | 91,7 -> 95,4 | 80-88 | 1 | 0,13 |
| dr17 The Great Weir | 0,77 / 0,77 -> 0,7 / 0,7 | 184 | 82,7 -> 88,6 | 80-88 | 3 | 0,40 |
| dr18 Hag's Island (elit) | 1,3 / 1,6 -> 1,2 / 1,4 | 109 | 93,1 -> 96,3 | 60-70 | 0 | 0,00 /geçen |
| dr19 Sunken Chapel | 1,15 / 1,15 -> 1,03 / 1,03 | 166 | 84,7 -> 94,6 | 80-88 | 1 | 0,10 |
| dr20 Heron Flats | 1 / 1 -> 0,9 / 0,9 | 189 | 87,0 -> 93,1 | 80-88 | 2 | 0,21 |
| dr21 The Drowned Causeway | 1,25 / 1,25 -> 1,05 / 1,05 | 185 | 89,7 -> 96,8 | 80-88 | 1 | 0,15 |
| dr24 Brine Pools | 0,88 / 0,88 -> 0,8 / 0,8 | 183 | 82,1 -> 90,7 | 80-88 | 5 | 0,72 |
| dr25 Eel-Mother's Lair | 1,2 / 1,2 -> 1,08 / 1,08 | 146 | 88,5 -> 93,8 | 80-88 | 0 | 0,00 |
| dr26 The Weir Mouth (boss) | 1,1 / 1,7 -> 1 / 1,38 | 173 | 56,6 -> 83,2 | 55-60 | 3 | 2,50 /geçen |
| dr27 Saltmere Gate | 1,04 / 1,04 -> 0,95 / 0,95 | 168 | 77,1 -> 93,5 | 80-88 | 1 | 0,21 |
| dr30 Chandlers' Row | 0,9 / 0,9 | 15 | 75,0 -> 73,3 | 80-88 | 0 | 0,00 |
| dr32 Harbor Fort (elit) | 1,35 / 2 -> 1,2 / 1,6 | 140 | 69,2 -> 89,3 | 60-70 | 0 | 0,00 /geçen |
| dr33 Sewer Outfall | 0,9 / 0,9 | 7 | 33,3 -> 42,9 | 80-88 | 0 | 0,00 |
| dr34 The Drowned Cathedral | 0,9 / 0,9 | 6 | 66,7 -> 50,0 | 80-88 | 0 | 0,00 |
| dr35 The Crypt Stair | 1 / 1 | 1 | - -> 100,0 | 80-88 | 0 | 0,00 |
| dr36 Chainwalk | 0,95 / 0,95 | 2 | - -> 50,0 | 80-88 | 0 | 0,00 |
| dr37 The Old Mole | 0,95 / 0,95 | 1 | - -> 0,0 | 80-88 | 0 | 0,00 |
| dr40 Quarantine Yard | 1,13 / 1,13 -> 1,05 / 1,05 | 166 | 81,7 -> 92,2 | 80-88 | 2 | 0,37 |
| dr41 Gull Cliffs | 1 / 1 -> 0,92 / 0,92 | 163 | 85,8 -> 92,0 | 80-88 | 1 | 0,23 |
| dr42 Wreckers' Beacon | 1 / 1 | 85 | 91,0 -> 84,7 | 80-88 | 2 | 0,40 |
| dr43 Smugglers' Cave | 1,35 / 1,35 -> 1,15 / 1,15 | 151 | 88,3 -> 97,4 | 80-88 | 0 | 0,02 |
| dr44 Bone Beach | 1,2 / 1,2 -> 1,08 / 1,08 | 81 | 89,8 -> 93,8 | 80-88 | 1 | 0,19 |
| dr47 The Hanging Stair | 0,95 / 0,95 -> 0,86 / 0,86 | 158 | 81,3 -> 89,2 | 80-88 | 1 | 0,23 |
| dr48 Wreck of the Valdren Pride | 1,03 / 1,03 -> 0,94 / 0,94 | 157 | 80,4 -> 89,2 | 80-88 | 0 | 0,33 |
| dr50 The Wrecker's Hall (elit) | 1,1 / 1,3 -> 1 / 1,1 | 157 | 69,6 -> 84,1 | 60-70 | 2 | 1,86 /geçen |
| dr51 Sea Cave Hoard | 1,5 / 1,5 -> 1,2 / 1,2 | 144 | 98,8 -> 98,6 | 80-88 | 0 | 0,00 |
| dr53 Gallows Point | 1,28 / 1,28 -> 1,12 / 1,12 | 154 | 91,6 -> 96,1 | 80-88 | 1 | 0,21 |
| dr55 The Sound | 1,15 / 1,15 -> 1,05 / 1,05 | 109 | 85,7 -> 90,8 | 80-88 | 0 | 0,20 |
| dr57 Siren Rocks | 1,2 / 1,2 -> 1,08 / 1,08 | 71 | 88,1 -> 85,9 | 80-88 | 1 | 0,55 |
| dr58 Gull Isle | 1,15 / 1,15 -> 1,05 / 1,05 | 81 | 80,0 -> 90,1 | 80-88 | 1 | 0,21 |
| dr60 The Narrows | 1,15 / 1,15 -> 1,05 / 1,05 | 90 | 87,7 -> 88,9 | 80-88 | 2 | 0,38 |
| dr62 Open Water | 1,35 / 1,35 -> 1,15 / 1,15 | 87 | 85,2 -> 93,1 | 80-88 | 1 | 0,22 |
| dr63 Pirate Cove | 1 / 1 | 148 | 84,6 -> 83,8 | 80-88 | 1 | 0,58 |
| dr64 Storm Strait | 1,12 / 1,12 -> 1,05 / 1,05 | 146 | 82,4 -> 87,0 | 80-88 | 1 | 0,45 |
| dr66 Gallows Cove (boss) | 1 / 1,58 -> 1 / 1,25 | 145 | 58,4 -> 79,3 | 50-55 | 4 | 2,00 /geçen |
| dr68 Drowned Shoal | 1,45 / 1,45 -> 1,2 / 1,2 | 139 | 96,3 -> 99,3 | 80-88 | 0 | 0,00 |
| dr70 The Drowned Gate | 1,2 / 1,2 -> 1,08 / 1,08 | 139 | 88,9 -> 94,2 | 80-88 | 1 | 0,22 |
| dr71 Hall of Tides | 1,35 / 1,35 -> 1,15 / 1,15 | 74 | 100,0 -> 93,2 | 80-88 | 0 | 0,00 |
| dr72 The Salt Garden | 1,5 / 1,5 -> 1,2 / 1,2 | 74 | 90,9 -> 93,2 | 80-88 | 0 | 0,15 |
| dr73 Courtiers' Walk | 1,3 / 1,3 -> 1,12 / 1,12 | 64 | 83,3 -> 93,8 | 80-88 | 0 | 0,05 |
| dr74 The Bishop's Chapel (elit) | 1,05 / 1,3 -> 1 / 1,15 | 64 | 62,9 -> 85,9 | 60-70 | 2 | 2,25 /geçen |
| dr76 Kennels of the Deep | 1,03 / 1,03 | 137 | 83,5 -> 79,6 | 80-88 | 1 | 0,63 |
| dr78 The Long Gallery | 1,07 / 1,07 -> 0,97 / 0,97 | 136 | 81,0 -> 83,1 | 80-88 | 1 | 0,55 |
| dr79 The Champion's Stair (elit) | 1 / 1,6 -> 1 / 1,3 | 134 | 67,9 -> 78,4 | 60-70 | 2 | 3,13 /geçen |
| dr81 Antechamber | 1,05 / 1,05 -> 0,96 / 0,96 | 131 | 75,6 -> 87,8 | 80-88 | 1 | 0,34 |
| dr82 Throne of Brine (boss) | 0,9 / 1,85 -> 0,9 / 1,45 | 130 | 40,0 -> 73,1 | 45-55 | 3 | 1,45 /geçen |
| dr84 Wayshrine of Stone | 1,25 / 1,25 -> 1,1 / 1,1 | 158 | 97,7 -> 98,7 | - | 0 | 0,00 |
| dr85 Wayshrine of the Heron | 1,2 / 1,2 -> 1,08 / 1,08 | 139 | 90,5 -> 97,8 | - | 0 | 0,00 |
| dr86 Wayshrine of Mercy | 1,2 / 1,2 -> 1,08 / 1,08 | 139 | 96,3 -> 98,6 | - | 0 | 0,00 |
| dr87 Wayshrine of the Line | 1,25 / 1,25 -> 1,1 / 1,1 | 132 | 92,0 -> 94,7 | - | 0 | 0,00 |
| dr91 The Gull Roost | 0,95 / 0,95 | 49 | 76,7 -> 69,4 | - | 0 | 0,00 |

Simde ölçülmeyen düğümler: dr65, dr77, dr88, dr89. dr65 Siren Queen's Rock çarpanı "Stronger than the road ahead" uyarısı sürsün diye seçildi, zorluk ölçüsüne göre değil. n'i 15 ve altındaki düğümler (dr30, dr33, dr34, dr35, dr36, dr37) yorumlanmaz. Yan düğüm uyarısı: önce dr25, dr43, dr51, dr65 alıyordu; şimdi yalnız dr65.

Özet: iyi oyuncu bitirme %33,0 -> %58,6 (ayarsız %66,5), toplam duvar %67,0 -> %41,4; ortalama oyuncu bitirme %8,3 -> %24,8 (ayarsız %32,4). Bitirme yüzdesi Harita 2'ye ulaşan koşular üzerindendir: iyi oyuncuda 300 koşunun 215'i Harita 2'ye girer (89 duvar, 126 bitirme), ortalama oyuncuda 109'u.

Öğrenilen: duvarlı düğümleri tek tek düşürmek bitirmeyi kıpırdatmadı (2 tur: %38 ve %35, 96 koşu). Duvarın %60'ı (89'un 53'ü) kahramanı Inn'de bekleyen takımda oluşuyor; o takımı Inn'e gönderen yara, duvarın olduğu düğümde değil, önceki yüksek çarpanlı savaşlarda alınıyor. Sıçrama, ilk bölge ve yüksek çarpanlı normalleri 1,05-1,2'ye, boss ve elit hasarını aşağı çekince geldi (3. tur %68,3, 96 koşu). Hangi grubun ne kadar katkı verdiği ayrı ölçülmedi.

Eski hedefi aşanlar (ilk deneme): boss The Weir Mouth 83,2 (55-60), Gallows Cove 79,3 (50-55), Throne of Brine 73,1 (45-55); elit Hag's Island 96,3, Harbor Fort 89,3, Tollhouse 88,8, The Bishop's Chapel 85,9, The Wrecker's Hall 84,1, The Champion's Stair 78,4 (hepsi 60-70). Boss kasması 1,87/geçen (hedef 3-4, altında). Normal düğümlerin çoğu 80-88 bandının üstünde (ort. 93,1). Throne of Brine savaşlarının %51'i 100+ tur (önce %47); can artırılmadı (0,9), kök sebep çarpan değil.

## Dengesi / bandı bekleyenler (geçici muafiyet; normalde BOŞ)
- `tests/balance-checks.ts > PENDING_BALANCE` (class bandı): **boş**. Hexer bu turda bantta (%48) olduğu için listeden çıkarıldı.
- `tests/balance-checks.ts > PENDING_SKILLS` (skill bandı): **boş**. Whirlwind 2026-10-20 kısa süre listedeydi (pay %11); Ömer kararıyla ilk iki sıraya vuran rect 2x3 olunca (güç 0,5) pay %22, çıkarıldı (open-questions-archive 376).

## Sefer dengesi — 2026-10-08 (balance-tester, Opus; madde 264)

### Sefer simülatörü (`npm run sim:campaign`)
- Kod: `src/sim/campaign.ts` (çekirdek; testler de kullanır) + `src/sim/campaign-cli.ts` (rapor). Kullanım: `npm run sim:campaign -- [sefer] [ilk seed] [easy|medium|hard|all] [medium|easy|both] [--jobs=N] [--attempts=N] [--json=dosya]`; varsayılan 240 sefer, tüm zorluklar, iki oyuncu vekili, çekirdek sayısı kadar paralel iş.
- Akış gerçek sefer mantığıyla (`src/campaign`) birebir: rastgele kahraman -> Ravenwood'da 3 adaydan rastgele biri -> Watchtower -> Ashford'da 11 sınıftan rastgele 3 kişilik yeni takım (otomatik dizilim) -> Valdren Keep'ten ayrılırken rastgele aday = 4 kişi. 12 rota eşit sayıda oynanır (koşu no % 12). Can taşıma `applyBattle` / `moveTo` ile (zafer +%20, düşen %20 ile kalkar, boss zaferi ve kasaba tam can).
- **Oyuncu vekili:** oyuncu tarafını da YZ oynar. Medium YZ = "iyi oyuncu" (hedefler buna göre), Easy YZ = "ortalama oyuncu" (yalnızca bilgi). Düşman tarafı zorluğun YZ'si + zorluğun düşman çarpanları.
- **Yenilgi = son kayda dönüş:** aynı düğüm aynı takım durumuyla yeniden denenir (kayıt zaferden sonra alındığı için takım birebir aynıdır); deneme sayacıyla savaş seed'i değişir. **10 denemede geçilemeyen düğüm "takıldı"** sayılır: sefer "bitmedi" olur, ölçüm için düğüm zorla geçilip sefer sürer (sonraki düğümler de ölçülsün diye).
- Ölçümler: düğüm başına ilk denemede kazanma, ortalama deneme, savaşa giriş/çıkış canı, zaferde düşen karakter, savaş süresi; rota başına bitirme oranı ve sefer başına yenilgi; sınıf başına (asıl takımda iken) bitirme oranı; en zor/en kolay düğümler.
- **Kategoriler:** tutorial = Ashford öncesi savaşlar (1 Mill Road, 2 Ravenwood, 3 Watchtower: elit olsa da tutorial); elit = 8C, 11A; boss = 9, 12; normal = kalan savaşlar (korunan hazine 6B, 8A dahil).

### Hedefler (ÖNERİ; Ömer onayı bekliyor; `data/campaign/balance.json > targets`)
İlk denemede kazanma, oyuncu vekili Medium YZ, taşınan canla:

| Zorluk | Tutorial | Normal | Elit | Boss |
|---|---|---|---|---|
| Easy | %93-100 | %85-97 | %72-87 | %57-77 |
| Medium | %88-97 | %75-85 | %60-70 | %45-60 |
| Hard | %75-92 | %57-70 | %42-55 | %25-40 |

### Sonuç (960 sefer, seed 1.., 12 rota x 80; oyuncu vekili Medium YZ)

| Zorluk | | Tutorial | Normal | Elit | Boss | Seferi bitirme | Yenilgi / sefer |
|---|---|---|---|---|---|---|---|
| Easy | önce | %41,1 | %51,2 | %6,5 | %29,2 | %0,4 | 37,6 |
| | **sonra** | **%99,3** | **%95,7** | **%86,8** | **%67,9** | **%79,0** | **3,7** |
| Medium | önce | %18,8 | %29,7 | %2,0 | %31,5 | %0 | 52,3 |
| | **sonra** | **%95,0** | **%80,2** | **%63,5** | **%50,9** | **%60,6** | **8,6** |
| Hard | önce | %19,7 | %28,4 | %1,5 | %30,4 | %0 | 51,9 |
| | **sonra** | **%91,1** | **%66,4** | **%44,3** | **%33,2** | **%39,4** | **15,2** |

"Önce" ölçümü 240 sefer: eski karşılaşmalarda tutorial bile çoğu zaman geçilemiyordu (Mill Road %44, Ravenwood %8, Watchtower %4; Dragon's Spine, Siege Line, Castle Morvane %0). Hard eskiden Medium'la aynıydı (yalnızca YZ farkı).

Ortalama oyuncu vekili (Easy YZ), sonra (tutorial / normal / elit / boss, bitirme): Easy %97 / 79 / 69 / 39, %52; Medium %86 / 50 / 39 / 26, %25; Hard %81 / 35 / 29 / 13, %8.

Düğüm başına ilk deneme (Medium, sonra): 1 Mill Road %99, 2 Ravenwood %98, 3 Watchtower %88, 5A %82, 5B %81, 6B %78, 8A %80, 8B %73, 8C %70, 9 King's Bridge %56, 10 %81, 11A %59, 11B %83, 12 Castle Morvane %46. En zor: 12, 9, 11A; en kolay (tutorial dışı): 11B, 5A, 10. Savaş süresi (tüm birimlerin turları): tutorial 12-28, normal 27-50, elit 20-43, King's Bridge 71, Castle Morvane 49.

Rota bitirme (Medium, sonra; rota başına 80 sefer): %52-70. Tek elitli rotalar (8A/8B + 11B) %64-70, iki elitli %52-64, üç elitli (8C + 11A) %54. Alt yol (5A-6A, 9 savaş) ile üst yol (5B-6B, 10 savaş) farkı küçük (%61 / %60). Easy %72-88, Hard %21-55.

Sınıf (asıl takımda iken seferi bitirme, Medium): Paladin %90, Druid %80, Warrior %65, Defender %60, Undead %58, Mage %58, Cutthroat %55, Archer %52, Gambler %52, Anti-Mage %49, Hexer %49. Can taşındığı için şifa ve diriltme seferde 4'e 4 savaştakinden çok daha değerli (class sayılarına dokunulmadı; soru).

### Bitirmeyi düşüren asıl şey: can taşıma sarmalı (soru)
Medium'da seferlerin ~%39'u bir düğümü 10 denemede geçemiyor; neredeyse hepsi **King's Bridge (%22)** ve **Castle Morvane (%21)**. Sebep durum: boss'a düşük canla (önceki savaşta düşen karakter %20 ile) girilince "son kayıt" hep aynı kötü durumdan başlıyor. Castle Morvane'de takımın ortalama giriş canı %60 altındaysa kazanma %14, %80 üstündeyse %80. Ironman'da bu kalıcı kilit demek. Aynı karşılaşmalarla kural denemeleri (Medium, 240 sefer, ayarın ortasındaki karşılaşmalarla):

| Kural | Boss ilk deneme | Seferi bitirme | Yenilgi / sefer |
|---|---|---|---|
| Şimdiki (zafer +%20, düşen %20) | %51 | %57 | 9,5 |
| Düşen %50 ile kalkar | %62 | %79 | 5,7 |
| Zafer +%30, düşen %40 | %64 | %83 | 5,3 |
| Boss düğümüne varınca tam iyileşme ("kamp") | %80 | %90 | 4,3 |

Kurallar Ömer kararı olduğu için değiştirilmedi. Seçilen kural sonra boss (ve kısmen elit) sayılarını yeniden ayarlamayı gerektirir.

### Zorluk tanımları (`campaign.json > difficulties`)
- Yeni alanlar (`src/campaign`, küçük kod + test): `enemy` = seferdeki TÜM düşmanlara eklenen güçlendirme (hpMult, statMult, powerMult, armorAdd, magicArmorAdd; karşılaşmanın kendi `mods`'u ile çarpanlar çarpılır, düz ekler toplanır), `enemyTier` = elit/boss'a ek, `rules` = bu zorlukta victoryHeal / reviveRatio / bossVictoryHeal üstüne yazımı (altyapı hazır, şimdilik kullanılmıyor). Karşılaşma sayıları Medium'a göredir. İleride loot vb. alanlar aynı yere eklenir.
- **Easy:** Easy YZ (hata yapan, ufku kısa); düşman zayıflatması gerekmedi (YZ farkı yeterli).
- **Medium:** Medium YZ; karşılaşmalar veride yazıldığı gibi.
- **Hard:** Hard YZ + tüm düşmanlar **+%12 can, +%5 güç**, boss'lar ayrıca **+%10 can, +%10 güç**. (Denenen: +%15 can / +%10 güç elitleri %36'ya indirdi; +%8 stat elit %40, normal %69; boss eki olmadan boss %41.)
- Hızlı savaşta zorluk yok (Medium): değişmedi. Wiki > Campaign zorluk satırı veriden türetilir.

### Karşılaşma değişiklikleri (`data/campaign/encounters.json`; Medium tabanı; can = hpMult, stat = statMult, güç = powerMult)
- Mill Road – Road Thug + Cutpurse: can 0,5 -> 0,4, stat 0,7 -> 0,6, güç 0,5 (yeni). Eski hal "çok zayıf" görünse de tek kahramana karşı 2 düşmanın sıra avantajı + arkası hep boş tek kahramana Cutpurse'ün Backstab'ı yüzünden ilk deneme %44'tü (can tabanı 30 ile tutorial düşmanları bile güçlendi).
- Ravenwood – 5 haydut: can 0,5 -> 0,4, stat 0,7 -> 0,6, güç 0,4.
- Ruined Watchtower – Bandit Chief can 1,8 -> 1,1, stat 1,15 -> 0,9, güç 0,7; okçular tutorial zayıflatması (0,4 / 0,6 / 0,5).
- Misty Marsh – 3 düşman can 0,75, güç 0,85.
- Iron Pass – iki Cutthroat -> Cutthroat + Warrior (uç kombinasyon: çift Backstab 3 kişilik takımın arka safını eritiyordu, %19); can 0,75, güç 0,8.
- Dwarven Mine – can 0,7, stat 0,9, güç 0,8 (üst yolda ikinci savaş, eksik canla girilir).
- St. Brann's Abbey – can 0,8, güç 0,85 (çift Paladin korundu: bir Paladin'i Mage yapmak zorlaştırdı).
- Mercenary Camp – can 0,85, güç 0,9.
- Black Cathedral (elit) – 5 -> 4 düşman (Mage çıktı); High Priest can 1,8 -> 1,4, stat 1,15 -> 1,1; diğerleri can 0,8, güç 0,8.
- King's Bridge (boss) – Bridge Warden can 6 -> 6,5 (stat 1,5, 2 eylem aynı).
- Ashen Plain – can 0,8, güç 0,85.
- Dragon's Spine (elit) – 5 -> 4 (bir Cutthroat çıktı); Drake Priest can 1,8 -> 1,2, stat 1,15 -> 1; diğerleri can 0,6, stat 0,9, güç 0,75.
- Siege Line – 5 -> 4 (bir Archer çıktı); can 0,7, stat 0,9, güç 0,85.
- Castle Morvane (final) – 5 -> 4 (Warrior çıktı); Lord Morvane can 3,0 -> 2,5, stat 1,35 -> 1,2; eskort can 0,6, stat 0,95, güç 0,75.
- Bölge III düşmanlarının Bölge II'den "zayıf" görünmesinin sebebi taşınan can: takım bu savaşlara ortalama %60-70 canla giriyor.

### Testler
- `tests/campaign-balance.test.ts`: Medium, 120 sefer (seed 7001), her kategori hedef ± 8 puan (`balance.json > test`); eğri iner (tutorial > normal > elit > boss); 12 rota oynandı.
- `tests/campaign-difficulty.test.ts`: 48 sefer (seed 9001), normal/elit/boss için Easy > Medium > Hard en az 5 puan arayla, tutorial Easy >= Medium >= Hard; zorluk çarpanlarının birleşme kuralı ve Hard'ın düşmanlara (boss'a ek) gerçekten uygulandığı.
- İkisi paralel ~40 sn.

## Denge turu 2 — 2026-10-08 (balance-tester, Opus; madde 263; Abyssal Cry yeniden tasarımı + Guard yarım tur sonrası)

### Ölçüm
4'e 4 ana ölçüm: grup başına 10.000 savaş, seed 1.. ve 500001..; test grupları (900001.., 300001.., 5.000) ayrıca. 3'e 3 ve 5'e 5: 10.000 savaş, seed 1.. (önce 3'e 3 iki grup). Hızlı tarama 7 paralel işle.

### Class kazanma oranı (önce -> sonra)

| Class | 4'e 4 önce (grup 1 / 2) | 4'e 4 sonra (grup 1 / 2) | 3'e 3 önce | 3'e 3 sonra | 5'e 5 sonra |
|---|---|---|---|---|---|
| Warrior | %54,5 / %58,1 | %51,3 / %51,6 | %59,0 | %54,3 | %50,7 |
| Paladin | %47,2 / %46,7 | %48,2 / %47,8 | %44,8 | %46,4 | %49,7 |
| Mage | %52,8 / %52,3 | %52,8 / %53,8 | %50,9 | %50,2 | %53,5 |
| Undead | %50,2 / %51,3 | %49,8 / %49,7 | %48,4 | %47,6 | %48,7 |
| Archer | %46,7 / %44,2 | %50,2 / %50,3 | %51,2 | %53,1 | %49,3 |
| Druid | %44,9 / %45,7 | %47,5 / %45,8 | %42,7 | %45,5 | %49,6 |
| Defender | %47,2 / %47,1 | %49,0 / %48,0 | %44,8 | %46,3 | %50,3 |
| Anti-Mage | %52,9 / %53,5 | %49,1 / %50,7 | %47,4 | %46,0 | %52,3 |
| Gambler | %53,6 / %52,4 | %52,4 / %51,5 | %57,9 | %54,2 | %47,5 |
| Cutthroat | %52,0 / %50,8 | %51,2 / %50,1 | %54,5 | %55,9 | %50,7 |
| Hexer | %47,5 / %47,9 | %48,2 / %50,1 | %47,9 | %49,8 | %47,4 |

- Test grupları (900001 / 300001, 5.000): önce Warrior %57,6 / %55,6 (kırmızı), sonra tüm class'lar %47,2-53,0.
- Savaş süresi (4'e 4): **35,3 / 35,4 -> 36,2 / 36,7 tur** (test grupları 34,8 / 35,4 -> 36,1 / 36,7). Bant 35-50 tutuyor; can tabanı 30 korunur (35'e çıkarmak gerekmedi). 3'e 3: 29,7; 5'e 5: 43,0.
- Ultimate class ortalaması %80,6 (hedef >= %50); %35 altında class yok. En düşükler: Summon Treant %52, Raise Dead %57-59, Abyssal Cry %70 (önce %67). Payı en düşük ultimate: Raise Dead %13, Abyssal Cry %13.
- Skill payları (4'e 4): bant dışı yok. Kenara yakın: Wail of the Dead %33,3-34,6, Withering Curse %34,0-34,4, Card Trick %33,5-33,9 (üst 35); Tremor Slam %39-42 (üst 45; önce test grubunda %44,8 göründü); Guard %9,8-10,1 (alt 8).
- Ezici eşleşme (> %75 / < %25) yok.
- 3'e 3 skill payı (yalnızca kontrol): Quick Shot %47, Tremor Slam %50, Mana Steal %46 (temel üst 45), Piercing Arrow %13,5, Arrow Rain %11, Drain Field %14 (normal alt 15), Guard %7,6: az düşmanda alan skill'leri değer kaybediyor (önceki turla aynı yapı). 5'e 5: Holy Strike %19,8, Fire Bolt %19,2, Venom Edge %16,9 (temel alt 20), Wail %36,2, Card Trick %36,6 (normal üst 35).

### Değişiklikler (eski -> yeni; hepsi veri; süreler değişmedi)
- **Warrior:** Double Strike vuruş başına 0,9 -> 0,8; Whirlwind 1,5 -> 1,38; Charge 1,5 -> 1,35. Abyssal Fury bonus STR %50 korundu (%35 denemesi Warrior'ı belirgin düşürmedi ama ult kullanımını %68 -> %42 indirdi; geri alındı).
- **Paladin:** Holy Strike 0,85 -> 0,9.
- **Mage:** Fire Bolt 2,1 -> 2,0; Blizzard 1,5 -> 1,42; Meteor 1,28 -> 1,22.
- **Undead:** Wail of the Dead 1,27 -> 1,22 (bedel %20 aynı; %25 denemesi geri alındı).
- **Archer:** Piercing Arrow MP 4 -> 3; Aimed Shot 2,75 -> 2,85.
- **Druid:** Thorn Whip 1,5 -> 1,72; Rejuvenate ilk şifa 1,2 -> 1,35 ve tur başı 0,4 -> 0,45 (ilk şifa = tur şifası x 3 kuralı korunur).
- **Defender:** Tremor Slam 0,38 -> 0,36; Taunt kalkanı 0,15 -> 0,3; Fist Crush 1,5 -> 1,42. (Zırh 19 -> 20 denemesi Defender'a karşı Defender kalan savaşı bitmez yaptı: geri alındı.)
- **Anti-Mage:** Mana Steal 1,7 -> 1,55; Void Strike 3,3 -> 3,15; Drain Field yakım maks MP'nin %58'i -> %55'i, manası biten hedefe hasar 1,6 -> 1,45 (%50 denemesi Anti-Mage'i %46'ya düşürdü).
- **Gambler:** Loaded Dice 1,6 -> 1,55; High Stakes 2,3 -> 2,2; Card Trick 1,4 -> 1,3 ve MP 8 -> 9; All In 2,2 -> 1,98.
- **Cutthroat:** Backstab 3,2 -> 3,05 (Venom Edge 2,0 -> 1,92 denemesi payını %20 altına indirdi; geri alındı).
- **Hexer:** Withering Curse 0,47 -> 0,45.

### Test değişiklikleri (gevşetilmedi)
- `balance-checks.ts`: ultimate yalnızca class ortalaması (Ömer kararı); %35 altı tek class uyarı; Abyssal Cry `PENDING_SKILLS`'ten çıktı. `balance.json > bands.ultimateLowWarn: 35`; `npm run sim` raporu aynı uyarıyı yazar.
- `abyssal-fury.test.ts`: bonus STR oranı ölçümünde Warrior STR'si iki savaşta da x4 (Double Strike 0,8'de vuruş ~6 hasar; tam sayı yuvarlaması oranı %50 -> %67 gösteriyordu).
- `match-log.test.ts`: kırpma sınırı tam kaydın %60'ı ile 60.000'in küçüğü (savaş kısalınca kayıt 60.000'in altına düşüyordu; kırpmanın gerçekten olduğu da ayrıca doğrulanır).
- YZ bağlam testleri (Aimed Shot / Fist Crush / All In seçimleri) değiştirilmedi; sayılar bunlara uyacak şekilde seçildi (Quick Shot 0,62 aynı kaldı, Fist Crush 1,42, All In 1,98).

## Denge turu 2026-10-08 (balance-tester, Opus; madde 261)

### Ölçüm yöntemi
Başlangıç ve sonuç: 4'e 4, grup başına 10.000 savaş, seed 1.. ve 500001... Her ayar turundan sonra 10.000 savaşla yeniden ölçüldü (19 tur). Teşhis için ayrıca karar başına YZ adaylarının puanları okundu (skill uygun olduğunda kaç kez seçiliyor, kaybettiğinde puanı seçilenin yüzde kaçı).

### Class kazanma oranı, ölüm, hamle, ultimate (4'e 4)

| Class | Önce (grup 1 / 2) | Sonra (grup 1 / 2) | Ölüm önce → sonra | Hamle/birim önce → sonra | Ultimate ≥1 kez (hazır olanlar) önce → sonra (ham) |
|---|---|---|---|---|---|
| Warrior | %64,0 / %65,1 | %52,9 / %54,4 | %46 → %52 | 4,3 → 5,1 | %8 → %21 (%18) |
| Paladin | %48,4 / %50,1 | %47,6 / %47,6 | %54 → %55 | 4,2 → 4,7 | %96 → %96 (%92) |
| Mage | %52,1 / %53,0 | %52,9 / %53,1 | %68 → %67 | 1,9 → 2,3 | %79 → %87 (%58) |
| Undead | %53,2 / %52,4 | %50,2 / %51,5 | %51 → %53 | 4,1 → 4,9 | %34 → %54 (%54) |
| Archer | %46,7 / %46,6 | %47,0 / %45,0 | %71 → %72 | 4,6 → 4,9 | %95 → %91 (%71) |
| Druid | %43,1 / %41,4 | %45,7 / %45,8 | %69 → %68 | 3,2 → 3,7 | %58 → %60 (%60) |
| Defender | %46,9 / %47,5 | %46,8 / %46,4 | %54 → %55 | 4,7 → 5,2 | %74 → %90 (%82) |
| Anti-Mage | %53,9 / %51,4 | %52,4 / %53,7 | %70 → %68 | 2,6 → 3,5 | %80 → %96 (%60) |
| Gambler | %59,8 / %59,0 | %54,4 / %53,1 | %53 → %57 | 4,3 → 4,8 | %81 → %82 (%66) |
| Cutthroat | %45,6 / %46,2 | %51,8 / %51,2 | %81 → %78 | 2,8 → 3,5 | %92 → %92 (%54) |
| Hexer | %36,5 / %37,4 | %48,0 / %47,9 | %68 → %60 | 2,9 → 3,4 | %76 → %71 (%47) |

- Ultimate class ortalaması: %70,4 → **%76,3** (hedef >= %50). Tek tek %50 altında yalnızca Abyssal Cry.
- Savaş süresi (4'e 4): **30,5 / 30,7 → 35,7 / 36,0 tur** (bandın alt kenarına yakın; aşağıda soru).
- Taraf: %50,1 / %50,0. Bitmeyen savaş: 10.000'de 7-10.

### Skill kullanım payı (4'e 4, grup 1; grup 2 her satırda ±0,7 içinde)

| Class | Skill | Kategori | Önce | Sonra |
|---|---|---|---|---|
| Warrior | Double Strike | temel | %55,0 | %43,6 |
| Warrior | Whirlwind | normal | %8,3 | %20,7 |
| Warrior | Charge | normal | %33,0 | %29,6 |
| Warrior | Abyssal Cry | ultimate | %1,4 | %3,6 |
| Paladin | Holy Strike | temel | %16,8 | %21,8 |
| Paladin | Resurrection | durumsal | %12,4 | %10,4 |
| Paladin | Judgment | normal | %20,0 | %17,8 |
| Paladin | Radiance | ultimate | %31,1 | %30,2 |
| Mage | Fire Bolt | temel | %26,1 | %22,7 |
| Mage | Blizzard | normal | %31,0 | %30,4 |
| Mage | Mana Barrier | durumsal | %14,6 | %15,5 |
| Mage | Meteor | ultimate | %27,2 | %29,2 |
| Undead | Bone Throw | temel | %45,3 | %34,5 |
| Undead | Wail of the Dead | normal | %37,6 | %34,8 |
| Undead | Dark Bond | durumsal | %1,6 | %14,5 |
| Undead | Raise Dead | ultimate | %9,2 | %12,4 |
| Archer | Quick Shot | temel | %35,7 | %30,3 |
| Archer | Piercing Arrow | normal | %12,3 | %17,2 |
| Archer | Arrow Rain | normal | %24,5 | %23,2 |
| Archer | Aimed Shot | ultimate | %25,0 | %22,7 |
| Druid | Thorn Whip | temel | %19,3 | %24,8 |
| Druid | Nature's Wrath | normal | %31,4 | %30,4 |
| Druid | Rejuvenate | normal | %28,0 | %25,2 |
| Druid | Summon Treant | ultimate | %18,0 | %16,9 |
| Defender | Tremor Slam | temel | %53,1 | %42,7 |
| Defender | Taunt | normal | %21,1 | %22,2 |
| Defender | Guard | durumsal | %5,5 | %9,4 |
| Defender | Fist Crush | ultimate | %16,2 | %19,2 |
| Anti-Mage | Mana Steal | temel | %72,2 | %37,9 |
| Anti-Mage | Drain Field | normal | %0,6 | %21,6 |
| Anti-Mage | Spell Ward | durumsal | %9,8 | %14,4 |
| Anti-Mage | Void Strike | ultimate | %15,7 | %21,8 |
| Gambler | Loaded Dice | temel | %30,9 | %22,1 |
| Gambler | High Stakes | normal | %4,0 | %18,3 |
| Gambler | Card Trick | normal | %38,4 | %34,0 |
| Gambler | All In | ultimate | %19,4 | %17,6 |
| Cutthroat | Venom Edge | temel | %7,9 | %22,8 |
| Cutthroat | Saltire Cut | normal | %34,6 | %24,5 |
| Cutthroat | Smoke Bomb | normal | %33,5 | %28,3 |
| Cutthroat | Backstab | ultimate | %16,0 | %17,1 |
| Hexer | Evil Eye | temel | %38,3 | %29,4 |
| Hexer | Withering Curse | normal | %38,9 | %34,4 |
| Hexer | Jinx | durumsal | %2,0 | %15,0 |
| Hexer | Doom Mark | ultimate | %15,6 | %14,2 |

Önce bant dışı: 15 skill + 4 class. Sonra bant dışı: yalnızca Abyssal Cry (ultimate). Banda yakın kenarlar: Wail of the Dead ve Withering Curse (%34,4-34,8, üst sınır 35), Guard (%9,4-9,8, alt sınır 8).

### Karşılaşma tablosu (ezici eşleşmeler)
- Önce: **Warrior > Hexer %76** (1.362 savaş; ezici). Sonraki en uçlar: Warrior > Druid %71, Gambler > Hexer %69.
- Sonra: **ezici eşleşme yok**; en uç eşleşmeler %57-60 (Mage > Defender %58-60, Anti-Mage > Paladin %58-59, Gambler/Mage > Druid %57-58, Warrior > Hexer %59 grup 2). Tam 11x11 tablo `npm run sim` raporunda.

### Kontrol: 5'e 5 ve 3'e 3 (sonra, 10.000 savaş, seed 1)
- 5'e 5: süre 42,5 tur; tüm class'lar %46,6-55,4 (bantta). Bant dışı paylar: Fire Bolt %19,9, Holy Strike %17,9, Venom Edge %16,6 (temel saldırılar biraz düşük: kalabalık takımda alan skill'leri daha değerli), Card Trick %36,7, Wail %36,2; Abyssal Cry yine düşük.
- 3'e 3: süre 29,3 tur; Gambler %58,7, Warrior %56,8, Druid %42,7 (küçük sapma); diğerleri %44,3-54,7. Az düşmanda alan skill'leri değer kaybediyor: Tremor Slam %55, Quick Shot %47, Mana Steal %48, Arrow Rain %10,6, Drain Field %14,4.

### Değişiklikler (eski -> yeni; hepsi veri)
- **Ömer kararları:** varsayılan takım 5 -> 4; Abyssal Cry can bedeli maks canın %30'u -> %15, Rage bedeli 40 -> 30, Warrior maks Rage 100 -> 50 (`formulas.json > rage.max`); can tabanı (`attributes.hpBase`) 20 -> 30 (Defender'ın sabit canı 135 -> 145, aynı +10); Dark Bond MP 8 -> 0; Mage zırhı 4 -> 6, Anti-Mage 4 -> 6, Cutthroat 4 -> 5; Drain Field yeni mekanik (engine-dev, madde 260) sayıları: yakım maks MP'nin %58'i (pctMax 0,3 -> 0,58), MP bedeli 14 -> 6, mana biten hedefe hasar gücü 1,0 -> 1,6 (Silence %50 / 1 tur aynı).
- **Warrior:** Double Strike vuruş başına 1,1 -> 0,9; Whirlwind MP 15 -> 8, güç 1,3 -> 1,5; Charge 2,0 -> 1,5.
- **Paladin:** Holy Strike 0,58 -> 0,85.
- **Mage:** Fire Bolt MP 5 -> 3, güç 2,25 -> 2,1; Blizzard 1,58 -> 1,5.
- **Undead:** Bone Throw 1,1 -> 1,12; Wail of the Dead 1,35 -> 1,27; Dark Bond bağ oranı 1 -> 1,5 (dost, Undead'in iyileştiğinin %150'si kadar iyileşir); Raise Dead MP 14 -> 8; Skeleton STR 13 -> 15.
- **Archer:** Quick Shot 0,44 -> 0,62; Piercing Arrow MP 8 -> 4, güç 1,08 -> 1,35; Arrow Rain 0,74 -> 0,88; Aimed Shot 2,65 -> 2,75.
- **Druid:** Thorn Whip 1,12 -> 1,5; Nature's Wrath 0,92 -> 1,12; Summon Treant MP 25 -> 16; zırh 6 -> 8.
- **Defender:** Tremor Slam 0,8 -> 0,38; Guard MP 10 -> 2, aktarılan pay %50 -> %60; Fist Crush 1,3 -> 1,5.
- **Anti-Mage:** Mana Steal 3,0 -> 1,7; Void Strike 3,6 -> 3,3.
- **Gambler:** Loaded Dice 1,7 -> 1,6; High Stakes MP 6 -> 4, güç 1,9 -> 2,3; Card Trick 1,7 -> 1,4.
- **Cutthroat:** Venom Edge 1,1 -> 2,0; Saltire Cut MP 9 -> 7; Smoke Bomb MP 10 -> 8.
- **Hexer:** stat str/int 6/7 -> 8/5 (can +12, MP -4; toplam 30); Evil Eye 0,9 -> 1,3; Withering Curse MP 10 -> 14, güç 0,5 -> 0,47; Jinx MP 6 -> 2, güç 0,5 -> 1,1 (yerleşik kritik +%25 engine-dev'den, aynı); Doom gücü Omen başına 0,6 -> 1,0 (`statuses.json > omen.doom.powerPerStack`).
- Hasar ölçekleme kuralı (stat başına %1) korunur: yalnızca güç/bedel/oran sayıları değişti; yeni ölçeksiz hasar yok. Süreler (cooldown, durum turları) değişmedi.

### Savaş süresi kolu
Genel kol olarak **can tabanı** seçildi (Ömer: 20 -> 30): her birime aynı mutlak can ekler, bu yüzden en kırılganları (Mage, Hexer, Cutthroat, Anti-Mage) oransal olarak en çok korur ve "1,9 hamlede ölüyor" sorununu hafifletir; Str'e bağlı can (`hpPerStr`) ise zaten güçlü olan Warrior'ı büyütürdü. Genel hasar çarpanı (`scaling`) da şifa/kalkanı aynı oranda küçülttüğü ve "stat başına %1" okunuşunu bozduğu için seçilmedi. Ölçüm: taban 40 denemesi 37,4 tur; 30 ile sonuç 35,7-36,0 (5'e 5: 42,5).

### Ömer onayı bekleyen yeniden tasarım önerileri (UYGULANMADI)
- **Abyssal Cry (Warrior ultimate'ı, hazır olanlardan %20-21 kullanım):** Teşhis: sayı değil tasarım + YZ değeri. Saf savunma buff'ı (Fortified: 3 tur %50 az hasar) yalnızca Warrior'a gelen hasarı azaltır; düşman YZ'si can ORANI en düşük hedefe odaklandığı için Warrior az vurulur; buff'ın puanı (medyan -2, en iyi %10'da 27) saldırıların (ortalama 50) çok altında. Rage 40 -> 30 ve maks 50, Fortified'ı %70'e çıkarma denemesi kullanımı değiştirmedi (%20 -> %21; Fortified denemesi geri alındı). Öneri A: Abyssal Cry 2 tur boyunca Warrior'ı **tek hedefli saldırıların zorunlu hedefi** yapsın (Taunt benzeri, "üstüme gelin" çığlığı); Fortified o zaman anlam kazanır, Defender'sız takımlara ön saf verir. Beklenen: kullanım %50+, Warrior gücü yaklaşık aynı. Öneri B: savaş çığlığı saldırgan olsun: Fortified + sonraki 2 saldırısı +%30 hasar (ya da düşmanlara 1 tur Slow). Beklenen: kullanım %60+, Warrior bir miktar güçlenir (Double Strike'ı biraz düşürmek gerekebilir).
- **Guard (%9,4; 3'e 3'te %6,4):** bant içinde ama kenarda; az kişide kurtarılacak dost yok. Öneri (isteğe bağlı): Guard korunan dosta küçük bir kalkan da versin (Taunt'taki gibi). Beklenen: %12-15.

## Önceki notlar
- Normal savaş: ortalama 4-7 oyuncu aksiyonu / karakter başına yaklaşık 3-5 tur. Boss savaşı: 10-15 tur (taslak, sefer için).
- Ömer "X zayıf/güçlü" dediğinde: önce rapor, sonra veri dosyasında ayar, sonra yeni rapor.
- Eski hedef (2026-10-04): sınıf kazanma %40-60, 5'e 5; bu bölümdeki bantlarla değişti.

## Kasmasız sefer simi bantları (Ömer onayı 2026-11-01)
Tek kişilik başlangıç eğrisinden sonra `data/campaign/balance.json > targets, finish` yenilendi (Harita 1, iyi oyuncu, ilk denemede kazanma; 300 koşu ölçümü: Easy 98,6 / 93 / 87 / bitirme 94,3; Medium 86,4 / 57,4 / 37,8 / 44,3; Hard 79,3 / 39,6 / 17,7 / 21,3). Ana ölçüm kasma simi kalır. Harita 2 kasmadan geçilmek üzere ayarlı değil (Medium iyi oyuncu bitirme %7,7), o yüzden kasmasız simde bandı yok.

## Haftalık liste 2026-11-07 (campaign-dev; Ömer onaylı, SİM YOK: Lead koşturacak, tüm sayılar PROVİZYON)
- **Düğüm şifası level farkına göre:** normal düğüm (savaş, olay savaşı) zafer şifası = %25 (düğüm level'ı >= takım ortalaması), takım ortalamasının altındaki HER level için -5 puan, en az %10 (yani 3 level altı ve daha aşağısı %10). Elit (%50) ve boss (tam) ölçeğe girmez. Veri: `campaign.json > rules.victoryHealScale { perLevelBelow: 0.05, min: 0.1 }`, kod `state.ts > scaledVictoryHeal`; düğüm level'ı `nodeLevel`, takım ortalaması savaşa giren kahramanların (XP öncesi) level ortalaması. Gerçek oran `lastVictoryHeal` olarak kaydedilir ve haritadaki "After the victory the living recover {pct}% health." notu onu gösterir. Yemin eksisi (`victoryHealMult`) ve Recovery affix'i bunun üstüne eskisi gibi işler.
- **Harita 1 eğrisi (Valdren Keep -> Castle Morvane):** King's Bridge (boss 1) DEĞİŞMEDİ. Keep sonrası, boss öncesi düğümler kademeli sertleşir (6B 0,80 -> 6A/5A 0,82 -> Sunken Shrine 0,84 -> Grave 0,85 -> Pilgrim 0,88 -> Abbey 0,87 -> Cathedral elit 0,85); boss sonrası ilk düğümler yumuşar (Ashen Plain 1,05 -> 0,97, Siege Line 1,04 -> 1,00, Ember Road 0,92 -> 0,95, Burnt Hamlet 1,04 -> 1,02, Gate of Cinders güç 1,18 -> 1,12) ki boss sonrası sıçrama yerine boss 2'ye doğru düz bir yamaç olsun. Castle Morvane aynen.
- **Harita 1 elit (Black Cathedral, Valdren Keep = 2. kasabadan sonraki ilk elit; Ömer: "canını %50 bile artırabiliriz"):** `soloStart.enemyScale > cathedral` can 0,85 -> 1,275 (0,85 x 1,5; güç 0,85 aynı). Hag's Island (Harita 2) eski haline döndü (can 1,2). Harita 2 düşüşü: `campaign.json > mapLootScale["drowned-reach"] { items: 0.88, gold: 0.88 }` (düşen item sayısı ve altın %12 az; sandık sabit altınları dahil, olay altınları değil).
- **Sandıklar (tüm haritalar):** `items.json > loot.treasureItemsDelta: -1`, en az 1 item kalır. Sandık = `kind treasure` (hazine düğümü, olay sandığı, Pit kademe sandığı); küçük sandıkta (Hedge Witch "Pay her price") 2 -> 1. Harita 2 hazinelerinin `itemsDelta -1`'i bunun üstüne biner (en az 1 item + hediye).
- **Tutorial (Ömer 2026-11-07):** kahraman L1 başlar; ilk elit (Ruined Watchtower, `soloStart.eliteLevelUp {node "3", level 2}`) zaferi tam L2'ye yetecek XP verir (kalan XP, XP 0'a düşer); elit öncesi Mill Road / Ravenwood XP'si aynen hesaplanır ama eşiğin 1 altında kırpılır (level atlatmaz; mob XP değerleri değişmedi). Ashford'daki 2. kahraman L1 gelir (yalnız bu katılım; Valdren Keep ve sonrası takım ortalamasında). Eski L2 başlangıç telafi çarpanları (start x1,08, Moor/Hoard, Brackenridge, Cairn, Iron Pass, Charcoal) geri alındı.
- **2. tur seçimleri (Ömer 2026-11-07, Lead):**
  - **cathhp:** Black Cathedral `soloStart.enemyScale > cathedral` can 1,275 -> 1,0625 (= eski 0,85 x 1,25), güç 0,85 aynı.
  - **tutxpcap:** elit öncesi XP kırpılması KALKTI (`xp.ts > soloEliteLevelUp` yalnız Ruined Watchtower zaferinde çalışır): lider Mill Road / Ravenwood'dan tam XP alır ve erken level atlayabilir; ilk elit zaferi hâlâ L2 altındaki kahramana en az bir level'a yetecek XP verir (kazancı büyükse kazancı). Ashford katılımcısı yine L1. Ölçüm (test, seed 9 otomatik çözüm): lider 2. savaşta L3, elitten sonra L4.
  - **revband:** `consumables.json > drops` revive_ally ağırlığı her tabloda x2 (savaş 1->2, elit 2->4, boss 3->6, hazine 2->4); düşüş şansları (chance) aynı.
  - **healelite:** `rules.victoryHealScale { perLevelBelow 0.05, elitePerLevelBelow 0.1, bossPerLevelBelow 0.2, min 0.1 }`: elit %50 ve boss %100 zafer şifası da takım ortalamasının altındaki her düğüm level'ı için -10 / -20 puan düşer, en az %10 (normal ile aynı alt sınır). Boss'ta yaralı kalkan da bu ölçekli oranla kalkar.
  - **m2gold:** Harita 2 olay altınları -%12, en yakın 5 (Settle 70->60, river reavers 35->30, smugglers 45->40, wreckers' cut 50->45); Salvage Dive sandıkları 30->25, 60->55 (`side-content.json`). Gambler o turda değişmedi (3. turda gamblerbet). Hazine / olay sandığı sabit altınları zaten `mapLootScale` ile %12 az (çift kesinti yok).
  - **tutxp (3. tur, balance-tester):** `soloEliteLevelUp` / `soloStart.eliteLevelUp` KALDIRILDI (özel level verme yok). Yerine tutorial savaş XP çarpanı `soloStart.xpScale { "2": 0.08, "3": 0.25 }` (yalnız yeni sefer, Harita 1; `xp.ts > battleXp` splitXp `scale`). Ham XP (dalga bonusu 40 dahil): Mill Road 12, Ravenwood 76, Ruined Watchtower 140 (L2 = 20, L3 = 81 XP); çarpanla 12 / 6 / 35 = 53. Lider elitte L2 atlar, Ashford'a L2 (33/61) varır. Ölçüm: otomatik çözüm 6 seed x 4 sınıf hep L2; gerçek savaş simi 24 koşu x Easy/Medium/Hard hep L2. Ashford katılımcısı L1.
  - **gamblerbet:** Gambler (dr93 The Dicing Hulk) bahis 80 -> 75, ödül 160 -> 150 ('double your stake' doğru kalır).
  - **endstats:** `stats.goldEarned / playMs / fallen` (isteğe bağlı, sürüm değişmez, eski kayıt 0); Harita 1 bitiş defterinde Gold earned, Play time, Heroes fallen.

## 0.9.11 mana + Harita 1 elit/boss ayarı (balance-tester 2026-11-07; Ömer kararı, Lead)
- **Mana formülü (`formulas.json > attributes`):** mpBase 30 (aynı), mpPerInt 1 -> 0,2 (her 5 INT +1 MP; maks MP `round(30 + 0,2 x INT)`), mpRegenPerInt 0,165 -> 0,15. Örnek: INT 10 -> 32 MP, INT 26 -> 35 MP (önce 40 / 56). Havuzlar sınıflar arasında neredeyse eşitlendi (31-35).
- **Hızlı savaş (4e4, 3000 savaş, seed 1), önce -> sonra kazanma %:** Anti-Mage 48,0 -> 51,6; Archer 47,5 -> 46,6; Cutthroat 49,4 -> 49,5; Defender 46,6 -> 49,3; Druid 55,2 -> 52,3; Gambler 47,1 -> 47,3; Hexer 52,8 -> 52,8; Mage 50,5 -> 47,7; Paladin 49,2 -> 45,3; Undead 50,7 -> 53,2; Vesper 51,7 -> 49,6; Warrior 51,5 -> 55,2 (bant 44-56; 3000 savaşta gürültü ±3). Ortalama süre 42,1 -> 43,8 tur.
- **Savaş sonu kalan MP (ortalama, tüm birimler; önce -> sonra, maks MP'nin %'si):** Anti-Mage 28,2 -> 19,6 (%50 -> %56); Archer 20,7 -> 14,0 (%48 -> %42); Cutthroat 19,6 -> 14,9 (%48 -> %47); Defender 27,8 -> 16,3 (%52 -> %47); Druid 22,2 -> 14,0 (%40 -> %40); Gambler 11,9 -> 9,4 (%33 -> %30); Hexer 18,4 -> 13,5 (%46 -> %42); Mage 21,4 -> 11,3 (%38 -> %32); Paladin 23,2 -> 16,7 (%42 -> %48); Undead 33,5 -> 20,5 (%60 -> %59); Vesper 25,9 -> 13,9 (%46 -> %40); Warrior 22,5 -> 14,5 (%54 -> %45).
- **Harita 1 elit/boss (`campaign.json > soloStart.enemyScale.groups`, yalnız can/güç):** cathedral güç 0,85 -> 0,5 (can 1,0625 Ömer seçimi aynı), thornwood 1/1 -> 0,88/0,88, bridge güç 0,84 -> 0,78, castle güç 1,23 -> 1,18. Hedef (Ömer): elit ilk deneme = 0.9.10.30 ölçümünün 5 puan altı; boss 3-4 denemede. Medium elit bandı 50-65 -> 45-60 (Ömer onayı).
- **Ölçüm (Medium/Medium, 120 sefer, seed 7001 = test):** 0.9.10.30 elit 66,7 / boss 43,3 / bitirme %52,5; yeni mana, ayar öncesi elit 21,7 (Cathedral 8,3, Thornwood 35,0) / boss 23,8 (Bridge 22,5, Castle 25,0) / bitirme %25,8; ayar sonrası elit 60,0 (Cathedral 58,3, Thornwood 61,7) / boss 35,0 (Bridge 35,8, Castle 34,2) / normal 78,3 / bitirme %43,3.
- **Son ölçüm (300 sefer, seed 1):** elit 69,8 (Cathedral 65,5, Thornwood 74,0) / boss 36,3 (Bridge 38,0, Castle 34,7) / normal 79,8 / bitirme %39,3. Aynı seed'de 0.9.10.30 (96 sefer): elit 75,0 / boss 40,1; iki seed'de de elit ~5 puan aşağı.
- **İkinci tur (Ömer seçimleri 2026-11-07):**
  - Harita 3 mob kuralı 5-6 -> 4-5 kullanım (L30; `tests/map3-mana.test.ts`, maps-2-3.md, areas/campaign.md). Yalnız mob skill MP bedeli düştü, formül aynı.
  - Mob bedelleri (önce -> sonra): spread_the_flame, hollow_glyph, ashborn_burn_the_ground 30 -> 23; matriarch_stoke 12 -> 8; rivet_plate 15 -> 7 (reforge 15 aynı; Golem Rivet Plate'i yeniden atıyor); long_sermon, fervour, kindle_the_nave 20 -> 16; warden_hold_gate, slag_wall 14 -> 12; avalanche, roar, whiteout 14 -> 11 (Snowfather Roar yeniden atılıyor); call_the_vault, decree_of_stone, bring_down_the_hall 23 -> 18; quench, forge_chains, temper_the_crown 22 -> 16; cinder_storm, breathe, the_first_fire 13 -> 11; rally_the_clan 12 -> 11; verdict 10 -> 8; mock 15 -> 13; chant 20 -> 17; knight_hold_gate, hollow_rockfall 18 -> 17. oath_of_stone 19 aynı (Harita 2 thane_of_the_deep ile ortak).
  - Kahraman: Mage Ice Crater 10 -> 8 MP.
  - Medium elit bandı 45-60 -> 57-65 (`balance.json`). Elit biraz zorlaştı: cathedral güç 0,5 -> 0,54, thornwood güç 0,88 -> 0,92 (can aynı). Boss verisi aynı.
  - Ölçüm: bedel düşüşü sonrası ayar öncesi test elit 65,8 / 300 sefer elit 67,8. Sonra test (120 / 7001) elit 59,2 (Cathedral 51,7, Thornwood 66,7) / boss 30,4 / normal 78,1 / bitirme %41,7; 300 sefer seed 1 elit 61,7 (Cathedral 56,8, Thornwood 66,7) / boss 32,7 (Bridge 32,3, Castle 33,0) / normal 78,8 / bitirme %40,7.
- **Açık (Ömer'e):** hızlı savaş skill payında Anti-Mage mana_burn (temel) %47,4 / %47,6 (bant üstü 45; `tests/balance.test.ts`, `balance-b.test.ts`). Sebep 0.9.11 manası (Ice Crater 10 ile de %47,6; önceki ölçümde Ice Crater testi önce düştüğü için görünmüyordu). Çözüm kahraman verisi ister (AM skill bedeli); karar bekliyor. Ice Crater payı 8 MP ile %14,6 -> %22,2 (bantta).
- **AM drain_field 14 -> 12 MP (Ömer onayı 2026-11-08, en ucuz temel dışı skill -2):** mana_burn payı %47,4 / %47,6 -> %47,3 / %47,5; hâlâ bant üstü (45). Başka değişiklik yapılmadı; karar bekliyor.

## Paladin / Mage / Warrior turu (2026-11-08; Ömer onayı "Paladini kontrol et, Mage'i kontrol et"; Lead)
- Ölçüm: test seed grupları (900001 / 300001), grup başına 5000 savaş, Skald havuzda (PENDING). 300 savaşlık 0.9.11 raporu gürültülü (sınıf başına ~130 savaş, ±4-5 puan).
- **Mage:** sorun yok. 5000'de %49,1 / %50,0 (300'lük raporun %56,6'sı gürültü). Değişiklik yok.
- **Paladin kök sebep:** 0.9.11 manası havuzu 56 -> 35 yaptı (INT 26 x 0,2), bedeller aynı kaldı (Radiance 24 + Resurrection 16 + Judgment 16 = eski havuzun tamamı). Rest payı %12,6 (en yüksek ikinci), Radiance seyrek. %43,4 / %45,3.
- **Warrior:** Skald havuza girince %56,5 / %56,3 (Skald'a karşı %62-63; Skald zayıf ve muaf).
- Değişiklikler (veri): Radiance MP 24 -> 18; Resurrection MP 16 -> 14; Warrior zırhı 18 -> 15; Double Strike güç 0,38 -> 0,36 (iki vuruş). Charge 0,675 -> 0,65 denendi, etkisiz, geri alındı. Judgment 16 aynı.
- Sonuç (5000 x 2): Paladin %47,0 / %48,5; Warrior %54,8 / %55,2; Mage %50,6 / %49,6. Bant dışı (muaf olmayan) class / skill yok; AM mana_burn %44,9 (sınırda).

## Paladin / Warrior / Skald turu (2026-11-08; Ömer kararları; Lead)
- **Paladin:** Radiance 18 / Resurrection 14 MP kaldı. Judgment düşman hasarı +%5: anlık 0,3 -> 0,315, holy_fire zemini 0,38 -> 0,399. Şifa ve holy_ground aynı.
- **Warrior:** 0.9.11 değerlerine geri (zırh 15 -> 18, Double Strike 0,36 -> 0,38). Ömer: şimdilik dokunulmaz. Sonuç %56,1 / %53,9: seed 900001'de bant üstü (Ömer'e raporlandı, ayar yok).
- **Skald kök sebep:** 0.9.11 manası havuzu 32 yaptı (INT 10), bedeller 10 / 20 / 22. Rest payı %21,4 (en yüksek). War Drum %1,6: YZ, Stormcall'a MP saklamak için Drum yerine Rest seçiyordu (20 MP sonrası 18'lik Stormcall'a yetmiyordu). Hammer Spark bölünmesi ve Conductor sorun değil.
- **Skald değişiklikleri (veri):** War Drum MP 20 -> 8, bekleme 5 -> 4, Haste 2 -> 3 tur; Thunder Strike MP 10 -> 6, bekleme 3 -> 4, güç 0,95 -> 0,85; Stormcall MP 22 -> 18, güç 1,1 -> 1,0; Hammer Spark güç 0,6 -> 0,57 (parça başı 0,285).
- Ara ölçümler (1000, seed 1 / 50001): yalnız MP düşüşü %44,7-48,0, Drum %2,5-7,3; Haste 3 tur Skald'ı %54-59'a çıkardı, hasar kısmalarıyla dengelendi.
- **Sonuç (5000 x 2, 900001 / 300001; AI-fix + Skald ağacı YZ'si dahil):** Skald %48,9 / %51,3; Hammer Spark %24,0 / %24,5, Thunder Strike %24,7 / %24,8, War Drum %16,6 / %16,3, Stormcall hazırken kullanım %99; Rest %11,3. Skald `PENDING_BALANCE` ve `PENDING_SKILLS`'ten çıktı.
- Diğerleri: Undead 53,4 / 54,3; AM 53,5 / 52,1; Druid 52,4 / 52,9 (muaf); Hexer 50,8 / 51,9; Mage 48,7 / 50,4; Archer 48,0 / 48,8; Cutthroat 48,8 / 47,0; Paladin 48,5 / 46,9; Vesper 47,3 / 48,0; Gambler 47,4 / 46,6; Defender 46,2 / 45,8.
- Açık: Warrior %56,1 (900001); AM Mana Steal %45,2 (300001, bant 45, önceden açık).
