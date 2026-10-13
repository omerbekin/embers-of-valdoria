# Sefer tutorial'ı (mentor dersleri)

Ömer onayı 2026-10-13. Varsayımlar: `open-questions.md` madde 319.

## İlke
- Oyuncu her düğümde **tek yeni şey** öğrenir; ders, işe yaradığı anda o savaşın / ekranın içinde çıkar. Toplam ~20 kısa ders (çoğu 1, bazıları 3 sayfa).
- Her ders en çok **1-2 cümle**, oyun içi metin İngilizce. Herkesin bildiği şeyler yazılmaz.
- Anlatıcı bir **mentor**: Garrick, Old Border Commander (portreli kısa diyalog kutusu; oyunu durdurmaz).
- Yalnızca **ilk savaş (Mill Road)** adım adım zorunludur; sonrakiler serbest ipuçlarıdır.

## Akış
| Bölüm / yer | Ders | Ne zaman |
|---|---|---|
| I · Mill Road | Açılış sözü, The Turn Bar, Attacking, Choosing a Target | İlk karar: ZORUNLU adımlar (Next -> saldırı düğmesi -> düşmana dokun). Savaş kaybedilemez. |
| I · Ravenwood | Skills and MP · Rows and Reach | Başta · melee skill seçilince (yoksa 2. kararda) |
| I · Ruined Watchtower | The Ultimate · Rest, Skip and Move | Başta · 2. kararda |
| I · ilk loot | Gear (3 sayfa: sürükle, karşılaştır, Equip best) | Torbada item varken Gear ilk açıldığında |
| I · Ashford | Towns · Your Company · The Merchant | Kasaba ekranı · "Form your company" · tüccar ilk açılışta |
| I · Ashford sonrası harita | Formation · Roads | Yol seçimi (Formation 3+ kahramanla) |
| II · herhangi bir savaş | Statuses · Area Shapes · Burning Ground · Bosses | İlk durum / alan skill seçimi / zemin etkisi / boss görülünce |
| II · Valdren Keep | Valor | Komutanın mevcut anlatımı (yeni kutu yok), Codex'e eklenir |
| II · ilk seçenekli olay | Choices | Olay penceresi açılınca |
| III | ders yok | Aynı savaş 2 kez kaybedilince savaş başında duruma özel mentor ipucu |
| Endless | Endless (3 kart: Waves, Camp, Relics) | Endless başlık ekranına ilk girişte |

## Kurallar
- **Atlama:** Settings > Gameplay > **Tutorials** On/Off (ana menü sütunu + oyun içi Settings) ve her kutuda **Don't show again** (tüm dersleri kapatır).
- **Bir kez:** görülen dersler `localStorage proto.tutorial.v1` (`{ v, on, seen }`); sefer yuvasından bağımsız.
- **Codex > Lessons:** görülen her ders orada yeniden okunur (Getting Started'ın altında).
- **Zorunlu adım:** adım bitene kadar diğer skill / Rest-Skip-Move / hedef girdisi kabul edilmez; "Don't show again" ya da ayar kapalıysa serbest.
- **Kaybedilemez ilk savaş:** motor `UnitSetup.undying` (can 1'de durur), karşılaşma `partyUndying: true` (Mill Road).

## Teknik
- İçerik: `data/tutorial.json` (mentor, açılış sözü, dersler + tetikler, Bölüm III ipuçları).
- Saf kurallar: `src/tutorial/lessons.ts`; kayıt `src/tutorial/store.ts`; testler `tests/tutorial.test.ts`.
- Kutu (DOM, kit): `src/ui/lesson-box.ts` + `lesson-box.css` (vurgu `.tut-focus`).
- Savaş: `src/game/battle-tutorial.ts` (BattleScene: oyuncu kararı, skill seçimi, eylem kapıları). Harita / kasaba / Gear / olay: `CampaignMapScene.lessons(...)`; Endless: `EndlessScene.drawTitle`.
- Debug > Campaign > Tutorial: Tutorials on/off, Reset tutorials, "Trigger a lesson" (her ders + yenilgi ipucu).

## Gereken sanat
- Mentor portresi (Garrick, yaşlı sınır komutanı; 256x256, diğer avatarlarla aynı stil): `assets/avatars/mentor.png`, sonra `data/tutorial.json > mentor.avatar = "mentor"`. Şimdilik yer tutucu `shieldwarden`.
- (İsteğe bağlı) Codex > Lessons ikonu: şimdilik piksel `book`.
