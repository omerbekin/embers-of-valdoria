# Sefer tutorial'ı (mentor dersleri)

Ömer onayı 2026-10-13; durum dersleri ve küçük kutu Ömer 2026-10-14. Varsayımlar: `open-questions.md` madde 319, 320.

## İlke
- **Temel kural (Ömer 2026-10-14): Mill Road'dan sonraki her savaş dersi DURUMLA tetiklenir.** Ders, o şeyin gerçekten işe yaradığı durum İLK KEZ oluştuğunda, sırası gelen kahraman için çıkar ve o an basılacak düğmeyi gösterir (ör. MP biten kahramanda Rest). "Anlattım demek için" ders yok: durum hiç oluşmazsa ders hiç çıkmaz ve Codex > Lessons'ta da görünmez (yalnızca görülen dersler orada).
- Bir kararda en çok **bir** yeni ders. Toplam ~20 kısa ders (çoğu 1, bazıları 3 sayfa).
- Her ders en çok **1-2 cümle**, oyun içi metin İngilizce. Herkesin bildiği şeyler yazılmaz.
- Anlatıcı bir **mentor**: Garrick, Old Border Commander (portreli kısa diyalog kutusu; oyunu durdurmaz).
- Yalnızca **ilk savaş (Mill Road)** adım adım zorunludur (senaryo); orada durum dersi çıkmaz.

## Akış
| Yer | Ders | Ne zaman |
|---|---|---|
| I · Mill Road | Açılış sözü, The Turn Bar, Attacking, Choosing a Target | İlk karar: ZORUNLU adımlar (Next -> saldırı düğmesi -> düşmana dokun). Savaş kaybedilemez (takımın tamamı, 2 kahramanla da). |
| Her savaş (Mill Road hariç) | Durum dersleri (aşağıdaki tablo) | Durum ilk kez oluşunca |
| I · ilk loot | Gear (3 sayfa: sürükle, karşılaştır, Equip best) | Torbada item varken Gear ilk açıldığında; Gear kapanınca kutu da kapanır |
| I · Ashford | Towns · Your Company · The Merchant | Kasaba ekranı · "Form your company" · tüccar ilk açılışta |
| I · Ashford sonrası harita | Formation · Roads | Yol seçimi (Formation 3+ kahramanla) |
| II · Valdren Keep | Valor | Komutanın mevcut anlatımı (yeni kutu yok), Codex'e eklenir |
| II · ilk seçenekli olay | Choices | Olay penceresi açılınca |
| III | Bölüm III yenilgi ipucu | Aynı savaş 2 kez kaybedilince savaş başında duruma özel mentor ipucu |
| Endless | Endless (3 kart: Waves, Camp, Relics) | Endless başlık ekranına ilk girişte |

## Durum dersleri (öncelik sırasıyla)
| Ders | Durum (sırası gelen kahraman) | Gösterir | Biter |
|---|---|---|---|
| Rest | MP isteyen skill'lerin hiçbiri MP yetmediği için kullanılamıyor | Rest | Rest basılınca |
| Move | Düşmana giden hiçbir skill yok, yakın dövüş menzile ulaşamıyor (ör. önünde dost) | Move | Move yapılınca |
| Burning Ground | Kahramanın hücresinde ya da yanında düşmanın zemin etkisi | Move | Move yapılınca |
| Skip Turn | Hiçbir skill kullanılamıyor (bekleme / bedel / hedef) ve Rest/Move çözüm değil | Skip | Skip basılınca |
| The Ultimate | 4. skill ilk kez hazır | O skill | Ultimate kullanılınca |
| Skills and MP | Kullandığı skill beklemede ya da MP harcandı | O skill | Bir kez gösterilince |
| Rows and Reach | Seçilen yakın dövüş skill'i arka sıradaki düşmana ulaşamıyor | - | Bir kez |
| Area Shapes | Alan skill'i seçildi | - | Bir kez |
| Statuses | Bir kahramanda durum var | - | Bir kez |
| Bosses | Boss vuracağı hücreleri işaretledi | Move | Bir kez |

- **Eylem dersi** (Rest, Move, Burning Ground, Skip, Ultimate) oyuncu önerilen eylemi yapınca tamamlanır; yapmazsa durum yeniden oluştuğunda savaş başına bir kez, en çok 3 savaş (`actionRepeats`) yeniden çıkar. **Bilgi dersi** bir kez gösterilince biter.
- Oyuncu herhangi bir eylem yapınca açık ders kartı kapanır.

## Kutu (Ömer 2026-10-14)
- Küçük ve kenarda: oyun alanının sol üstünde, sıra çubuğunun altında; savaşanları ve sıra çubuğunu örtmez. Tek satır: portre | başlık + 1-2 satır metin | düğme. "Got it" diğer kit düğmeleriyle aynı (secondary, 44 px dokunma). Telefonda (`html.short / html.compact`) portre 36 px, mentor adı gizli. Gear dersi altta ortada.

## Kurallar
- **Atlama:** Settings > Gameplay > **Tutorials** On/Off (ana menü sütunu + oyun içi Settings) ve her kutuda **Don't show again** (tüm dersleri kapatır).
- **Bir kez:** görülen dersler `localStorage proto.tutorial.v1` (`{ v, on, seen, done?, shows? }`); sefer yuvasından bağımsız.
- **Codex > Lessons:** görülen her ders orada yeniden okunur (Getting Started'ın altında).
- **Zorunlu adım:** adım bitene kadar diğer skill / Rest-Skip-Move / hedef girdisi kabul edilmez; "Don't show again" ya da ayar kapalıysa serbest.
- **Kaybedilemez ilk savaş:** motor `UnitSetup.undying` (can 1'de durur), karşılaşma `partyUndying: true` (Mill Road).

## Teknik
- İçerik: `data/tutorial.json` (mentor, açılış sözü, dersler + tetikler, Bölüm III ipuçları).
- Saf kurallar: `src/tutorial/lessons.ts` (`dueBattleLesson`, `lessonComplete`), durum tespiti `src/tutorial/situations.ts` (`turnSituations`, `selectSituations`); kayıt `src/tutorial/store.ts` (`seen`, eylem dersleri için `done` + `shows`); testler `tests/tutorial.test.ts`, `tests/tutorial-situations.test.ts`.
- Kutu (DOM, kit): `src/ui/lesson-box.ts` + `lesson-box.css` (vurgu `.tut-focus`).
- Savaş: `src/game/battle-tutorial.ts` (BattleScene: oyuncu kararı, skill seçimi, skill / Rest-Skip-Move eylemi, zorunlu adım kapıları). Harita / kasaba / Gear / olay: `CampaignMapScene.lessons(...)`; Endless: `EndlessScene.drawTitle`.
- Debug > Campaign > Tutorial: Tutorials on/off, Reset tutorials, "Trigger a lesson" (her ders + yenilgi ipucu).

## Gereken sanat
- Mentor portresi (Garrick, yaşlı sınır komutanı; 256x256, diğer avatarlarla aynı stil): `assets/avatars/mentor.png`, sonra `data/tutorial.json > mentor.avatar = "mentor"`. Şimdilik yer tutucu `shieldwarden`.
- (İsteğe bağlı) Codex > Lessons ikonu: şimdilik piksel `book`.
