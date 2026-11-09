# Ne için: docs/design/tutorial.md belgesinden 2026-11-08 de taşınan ek günlük aşağıda; bu dosya 2026-10-31 ölçümüdür, güncel değil.

# Tutorial sırası (ölçüm, 2026-10-31)

Dış test raporu üzerine ölçüldü (v0.9.10.4, Warrior, Medium, tutorial atlanmadı: "Rage ile vurduğum güçlü saldırı ilk savaşta ıskaladı, Hit Chance ikinci savaşta geldi"). Kurallar `tutorial.md`, içerik `data/tutorial.json`.

## Nasıl ölçüldü
- Gerçek oyun, 0.9.10.6 tabanı, yeni sefer: Normal, Medium, Warrior, tutorial atlanmadı; Mill Road'dan sonra Druid seçildi. Her açılan kutu sayfa içinden kaydedildi.
- İlk saldırı elle yapıldı. Savaşların kalanını küçük bir test betiği oynadı: kartı hemen kapatır, kullanılabilen en yüksek yuvadaki skill'i seçer. Bu yüzden durumla açılan derslerin sırası oyuncunun seçimine göre biraz değişebilir.
- "Karar" = oyuncunun o savaştaki kaçıncı hamlesi.

## Ölçülen sıra (değişiklikten önce)
"Önce / sonra": oyuncunun o bilgiye ihtiyaç duyduğu andan önce mi sonra mı.

| # | id | Başlık | Yer | An | Tetik | Önce / sonra |
|---|---|---|---|---|---|---|
| 1 | (opening) | Mill Road | Mill Road | 1. karar | Açılış sözü | - |
| 2 | turn_bar | The Turn Bar | Mill Road | 1. karar | Zorunlu | Önce |
| 3 | attack | Attacking | Mill Road | 1. karar | Zorunlu | Önce |
| 4 | target | Choosing a Target | Mill Road | 1. karar | Zorunlu, saldırı seçilince | Önce |
| 5 | f_mp_skill | Stronger Skills | Mill Road | 2. karar | Zorunlu; Warrior'da Charge (en pahalı MP skill'i) | Önce |
| 6 | skills_mp | Skills and MP | Mill Road | 2. karardan sonra | Kod, MP adımı bitince | Önce |
| - | **kart yok** | Headsman's Blow (Rage) | Mill Road | 3. karar | Mill Road'da serbest; Rage bedeli olan 30'a ulaşmıştı | **Hiç anlatılmadı** |
| 7 | hp_carry | Wounds Carry Over | Harita | Mill Road zaferi + katılım sonrası | İlk zafer | Önce |
| 8 | formation_new_hero | A New Companion | Harita | Ravenwood'a dokununca | Kapı | Önce |
| 9 | unit_card | Reading a Fighter | Ravenwood | 1. karar | `first` | Önce |
| 10 | statuses | Statuses | Ravenwood | 2. karar | `status` | Yerinde |
| 11 | ultimate | The Ultimate | Ravenwood | 3. karar (Druid) | `ultimate` | Yerinde |
| 12 | hit_preview | **Hit Chance** | Ravenwood | **4. karar**, seferin 9. oyuncu hamlesi | `preview` | **Sonra** |
| 13 | rows_reach | Rows and Reach | Ravenwood | 6. karar | `reach` | Sonra |
| 14 | ally_target | Helping Allies | Ravenwood | 7. karar | `ally` | Sonra (iki iyileştirme yapılmıştı) |
| 15 | area_shapes | Area Shapes | Ravenwood | 9. karar | `area` | Sonra (iki alan skill'i atılmıştı) |
| 16 | node_types | Reading the Road | Harita | Ravenwood zaferinden sonra | `map` + görünen düğüm | Geç (elit düğüm bir önceki haritada da görünüyordu) |
| 17 | gear | Gear (3 sayfa) | Gear | Gear ilk açılınca | Torbada item | Önce |
| 18 | burning_ground | Burning Ground | Ruined Watchtower | 3. karar | `ground` | Yerinde |
| 19 | ultimate | The Ultimate (tekrar) | Ruined Watchtower | 5. karar (Druid) | Eylem dersi tekrarı (betik Druid'in çağrısını kullanmadığı için) | Yerinde |

Ruined Watchtower'ın sonuna kadar oynanmadı; kayıt iki düşmandan biri ölmüşken, ikincisinin canı 2'yken kesildi.

## Veriyle fark
`data/tutorial.json` dizisindeki sıra gösterim sırası değil, aynı anda birden çok ders hazırsa kullanılan önceliktir.

- **Açılış sözü** ders dizisinde yok (`opening` alanı).
- **Skills and MP** veride `spent` durumu; ölçümde Mill Road'da kod zorla açtı. `tutorial.md` bunu yazıyor, hata değil.
- **Hit Chance** veride Statuses'tan önce, oyunda sonra. Sebep aşağıda.
- **Wounds Carry Over** veride Towns ve Merchant'ın altında, oyunda ilk harita dersi. Diğerlerinin ekran koşulu henüz oluşmuyor.
- **A New Companion** veride harita derslerinin sonunda, oyunda erken. Kapı oyunun kendisi açıyor.
- **Reading the Road** hazır olduğu halde bir harita sonraya kaldı: ekranda aynı anda tek ders kuralı, Wounds Carry Over önce çıktı.

## Hit Chance neden geç geldi
Üç kural üst üste bindi. Üçü de tasarımda yazılı; bu bir kod hatası değil.

1. **Mill Road'da durum dersi kapalı** (`situationLessonsIn`). Hit Chance durum dersi olduğu için ilk savaşta hiç çıkamıyordu. Rage skill'i ise 3. kararda serbest kullanılabiliyordu.
2. **Karar başına tek ders.** Reading a Fighter, Statuses ve The Ultimate karar başında açılır. Hit Chance ancak skill'e basınca değerlendirilir, o kararda başka ders çıktıysa bekler. Bu yüzden veride önde olsa da Ravenwood'da üç karar geride kaldı.
3. **Yalnızca düğmeye basınca tetiklenir.** Her turda temel saldırı zaten seçili gelir; oyuncu düğmeye basmadan düşmana dokunursa ders tetiklenmez (koddan, ölçümde bu yol denenmedi).

Raporcunun gördüğü ıskalamayı bu oyunda görmedik: ilk vuruşun isabet şansı %87 gösteriyordu ve ıskalama olmadı. Sıra kısmı ise rapordakiyle aynı çıktı.

## Değişiklik (Ömer: Hit Chance ilk savaşta)
Mill Road 1. karar artık: The Turn Bar → Attacking → **Hit Chance** → Choosing a Target.

- Kart saldırı düğmesine basılınca açılır, metin aynıdır, "Got it" basılana kadar vuruş kilitli kalır. Bu sırada düşmanın üstüne gelince sayılar görünür.
- Saldırı adımı 1. kararda zorunlu olduğu için Rage skill'i de kartın ardından gelir.
- Görülmüşse tekrar çıkmaz. Mill Road'u eski sürümde geçmiş oyuncu için durum tetiği (`preview`) yerinde kaldı.
- Başka ders, metin ya da sıra değişmedi. Kod `src/game/battle-tutorial.ts > nextStep`.


---
## Ek: tutorial.md'den 2026-11-08'de taşınan tam ölçüm günlüğü (Ne için: tarihçe; güncel değil)

## Tutorial sırası ölçümü (2026-10-31; eski tutorial-order.md)
Dış test raporu üzerine ölçüldü (v0.9.10.4, Warrior, Medium, tutorial atlanmadı: "Rage ile vurduğum güçlü saldırı ilk savaşta ıskaladı, Hit Chance ikinci savaşta geldi"). Kurallar `tutorial.md`, içerik `data/tutorial.json`.

### Nasıl ölçüldü
- Gerçek oyun, 0.9.10.6 tabanı, yeni sefer: Normal, Medium, Warrior, tutorial atlanmadı; Mill Road'dan sonra Druid seçildi. Her açılan kutu sayfa içinden kaydedildi.
- İlk saldırı elle yapıldı. Savaşların kalanını küçük bir test betiği oynadı: kartı hemen kapatır, kullanılabilen en yüksek yuvadaki skill'i seçer. Bu yüzden durumla açılan derslerin sırası oyuncunun seçimine göre biraz değişebilir.
- "Karar" = oyuncunun o savaştaki kaçıncı hamlesi.

### Ölçülen sıra (değişiklikten önce)
"Önce / sonra": oyuncunun o bilgiye ihtiyaç duyduğu andan önce mi sonra mı.

| # | id | Başlık | Yer | An | Tetik | Önce / sonra |
|---|---|---|---|---|---|---|
| 1 | (opening) | Mill Road | Mill Road | 1. karar | Açılış sözü | - |
| 2 | turn_bar | The Turn Bar | Mill Road | 1. karar | Zorunlu | Önce |
| 3 | attack | Attacking | Mill Road | 1. karar | Zorunlu | Önce |
| 4 | target | Choosing a Target | Mill Road | 1. karar | Zorunlu, saldırı seçilince | Önce |
| 5 | f_mp_skill | Stronger Skills | Mill Road | 2. karar | Zorunlu; Warrior'da Charge (en pahalı MP skill'i) | Önce |
| 6 | skills_mp | Skills and MP | Mill Road | 2. karardan sonra | Kod, MP adımı bitince | Önce |
| - | **kart yok** | Headsman's Blow (Rage) | Mill Road | 3. karar | Mill Road'da serbest; Rage bedeli olan 30'a ulaşmıştı | **Hiç anlatılmadı** |
| 7 | hp_carry | Wounds Carry Over | Harita | Mill Road zaferi + katılım sonrası | İlk zafer | Önce |
| 8 | formation_new_hero | A New Companion | Harita | Ravenwood'a dokununca | Kapı | Önce |
| 9 | unit_card | Reading a Fighter | Ravenwood | 1. karar | `first` | Önce |
| 10 | statuses | Statuses | Ravenwood | 2. karar | `status` | Yerinde |
| 11 | ultimate | The Ultimate | Ravenwood | 3. karar (Druid) | `ultimate` | Yerinde |
| 12 | hit_preview | **Hit Chance** | Ravenwood | **4. karar**, seferin 9. oyuncu hamlesi | `preview` | **Sonra** |
| 13 | rows_reach | Rows and Reach | Ravenwood | 6. karar | `reach` | Sonra |
| 14 | ally_target | Helping Allies | Ravenwood | 7. karar | `ally` | Sonra (iki iyileştirme yapılmıştı) |
| 15 | area_shapes | Area Shapes | Ravenwood | 9. karar | `area` | Sonra (iki alan skill'i atılmıştı) |
| 16 | node_types | Reading the Road | Harita | Ravenwood zaferinden sonra | `map` + görünen düğüm | Geç (elit düğüm bir önceki haritada da görünüyordu) |
| 17 | gear | Gear (3 sayfa) | Gear | Gear ilk açılınca | Torbada item | Önce |
| 18 | burning_ground | Burning Ground | Ruined Watchtower | 3. karar | `ground` | Yerinde |
| 19 | ultimate | The Ultimate (tekrar) | Ruined Watchtower | 5. karar (Druid) | Eylem dersi tekrarı (betik Druid'in çağrısını kullanmadığı için) | Yerinde |

Ruined Watchtower'ın sonuna kadar oynanmadı; kayıt iki düşmandan biri ölmüşken, ikincisinin canı 2'yken kesildi.

### Veriyle fark
`data/tutorial.json` dizisindeki sıra gösterim sırası değil, aynı anda birden çok ders hazırsa kullanılan önceliktir.

- **Açılış sözü** ders dizisinde yok (`opening` alanı).
- **Skills and MP** veride `spent` durumu; ölçümde Mill Road'da kod zorla açtı. `tutorial.md` bunu yazıyor, hata değil.
- **Hit Chance** veride Statuses'tan önce, oyunda sonra. Sebep aşağıda.
- **Wounds Carry Over** veride Towns ve Merchant'ın altında, oyunda ilk harita dersi. Diğerlerinin ekran koşulu henüz oluşmuyor.
- **A New Companion** veride harita derslerinin sonunda, oyunda erken. Kapı oyunun kendisi açıyor.
- **Reading the Road** hazır olduğu halde bir harita sonraya kaldı: ekranda aynı anda tek ders kuralı, Wounds Carry Over önce çıktı.

### Hit Chance neden geç geldi
Üç kural üst üste bindi. Üçü de tasarımda yazılı; bu bir kod hatası değil.

1. **Mill Road'da durum dersi kapalı** (`situationLessonsIn`). Hit Chance durum dersi olduğu için ilk savaşta hiç çıkamıyordu. Rage skill'i ise 3. kararda serbest kullanılabiliyordu.
2. **Karar başına tek ders.** Reading a Fighter, Statuses ve The Ultimate karar başında açılır. Hit Chance ancak skill'e basınca değerlendirilir, o kararda başka ders çıktıysa bekler. Bu yüzden veride önde olsa da Ravenwood'da üç karar geride kaldı.
3. **Yalnızca düğmeye basınca tetiklenir.** Her turda temel saldırı zaten seçili gelir; oyuncu düğmeye basmadan düşmana dokunursa ders tetiklenmez (koddan, ölçümde bu yol denenmedi).

Raporcunun gördüğü ıskalamayı bu oyunda görmedik: ilk vuruşun isabet şansı %87 gösteriyordu ve ıskalama olmadı. Sıra kısmı ise rapordakiyle aynı çıktı.

### Değişiklik (Ömer: Hit Chance ilk savaşta)
Mill Road 1. karar artık: The Turn Bar → Attacking → **Hit Chance** → Choosing a Target.

- Kart saldırı düğmesine basılınca açılır, metin aynıdır, "Got it" basılana kadar vuruş kilitli kalır. Bu sırada düşmanın üstüne gelince sayılar görünür.
- Saldırı adımı 1. kararda zorunlu olduğu için Rage skill'i de kartın ardından gelir.
- Görülmüşse tekrar çıkmaz. Mill Road'u eski sürümde geçmiş oyuncu için durum tetiği (`preview`) yerinde kaldı.
- Başka ders, metin ya da sıra değişmedi. Kod `src/game/battle-tutorial.ts > nextStep`.
