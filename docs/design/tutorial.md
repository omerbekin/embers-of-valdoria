# Sefer tutorial'ı (mentor dersleri)

Ömer onayı 2026-10-13; durum dersleri ve küçük kutu Ömer 2026-10-14. Ek dersler, MP adımı, spot ışığı, Replay: Ömer seçimi 2026-10-14. Varsayımlar: `open-questions.md` madde 319, 320, 325.

## İlke
- **Temel kural (Ömer 2026-10-14): Mill Road'dan sonraki her savaş dersi DURUMLA tetiklenir.** Ders, o şeyin gerçekten işe yaradığı durum İLK KEZ oluştuğunda, sırası gelen kahraman için çıkar ve o an basılacak düğmeyi gösterir (ör. MP biten kahramanda Rest). "Anlattım demek için" ders yok: durum hiç oluşmazsa ders hiç çıkmaz ve Codex > Lessons'ta da görünmez (yalnızca görülen dersler orada).
- Bir kararda en çok **bir** yeni ders. Toplam ~30 kısa ders (çoğu 1, bazıları 3 sayfa).
- Her ders en çok **1-2 cümle**, oyun içi metin İngilizce. Herkesin bildiği şeyler yazılmaz.
- Anlatıcı bir **mentor**: Garrick, Old Border Commander (portreli kısa diyalog kutusu; oyunu durdurmaz).
- Yalnızca **ilk savaş (Mill Road)** adım adım zorunludur (senaryo); orada durum dersi çıkmaz.

## Akış
| Yer | Ders | Ne zaman |
|---|---|---|
| I · Mill Road | Açılış sözü, The Turn Bar, Attacking, Choosing a Target | İlk karar: ZORUNLU adımlar (Next -> saldırı düğmesi -> düşmana dokun). Savaş kaybedilemez (takımın tamamı, 2 kahramanla da). |
| I · Mill Road | Stronger Skills (`f_mp_skill`) + Skills and MP | İkinci karar: ZORUNLU; kahramanın şu an kullanılabilen en güçlü MP skill'i parlar, oyuncu onu kullanır; ardından Skills and MP burada gösterilir. Kullanılabilir MP skill'i yoksa adım sessizce atlanır. |
| Her savaş (Mill Road hariç) | Durum dersleri (aşağıdaki tablo) | Durum ilk kez oluşunca |
| I · Ravenwood (katılımdan sonra) | Zorunlu Formation (ipucu kartı "Arrange your formation...") | Yeni kahraman katılınca savaş beklemede; Formation düğmesi kor rengiyle parlar; Formation açılana kadar savaşa dokunmak savaşı BAŞLATMAZ ("Open Formation first." notu + ipucu kartı yeniden + parıltı çakar). Açılıp kapanınca parıltı söner, savaş normal (aşağıda Kurallar). |
| I · ilk zafer sonrası harita | Wounds Carry Over | İlk zaferden sonraki ilk yol seçimi; yüzde verinin zafer toparlanmasından (`victoryHeal`) |
| Harita | Reading the Road | Yolda (yakın / uzak) ilk kez elit, boss, dinlenme ya da hazine düğümü görününce (gerçek ikonlar: boynuzlu miğfer, taçlı kafatası, kamp ateşi, sandık) |
| I · ilk loot | Gear (3 sayfa: sürükle, karşılaştır, Equip best) | Torbada item varken Gear ilk açıldığında; Gear kapanınca kutu da kapanır |
| Gear | Item Quality | Torbada ya da takılı Uncommon ya da üstü item varken Gear açılınca (Gear dersi önce) |
| İlk dinlenme noktası | Rest Camps | Kamp penceresi ilk açılınca; yüzde `restHealOf` (veri) |
| I · Ashford | Towns · Your Company · The Merchant | Kasaba ekranı · "Form your company" · tüccar ilk açılışta |
| I · Ashford sonrası harita | Formation · Roads | Yol seçimi (Formation 3+ kahramanla) |
| II · Valdren Keep | Valor | Komutanın mevcut anlatımı (yeni kutu yok), Codex'e eklenir |
| II · ilk seçenekli olay | Choices | Olay penceresi açılınca |
| III | Bölüm III yenilgi ipucu | Aynı savaş 2 kez kaybedilince savaş başında duruma özel mentor ipucu |
| Endless | Endless (3 kart: Waves, Camp, Relics) | Endless başlık ekranına ilk girişte |

## Durum dersleri (öncelik sırasıyla)
| Ders | Durum (sırası gelen kahraman) | Gösterir | Biter |
|---|---|---|---|
| Reading a Fighter | Mill Road'dan sonraki ilk savaşın ilk kararı (`first`) | - | Bir kez |
| Rest | MP isteyen skill'lerin hiçbiri MP yetmediği için kullanılamıyor | Rest | Rest basılınca |
| Move | Düşmana giden hiçbir skill yok, yakın dövüş menzile ulaşamıyor (ör. önünde dost) | Move | Move yapılınca |
| Burning Ground | Kahramanın hücresinde ya da yanında düşmanın zemin etkisi | Move | Move yapılınca |
| Skip Turn | Hiçbir skill kullanılamıyor (bekleme / bedel / hedef) ve Rest/Move çözüm değil | Skip | Skip basılınca |
| The Ultimate | 4. skill ilk kez hazır | O skill | Ultimate kullanılınca |
| Fallen Heroes | Oyuncunun bir kahramanı düşmüş (`fallen`); Valor açıksa metin Valor'u da sayar | - | Bir kez |
| Skills and MP | Kullandığı skill beklemede ya da MP harcandı (Mill Road MP adımında zaten gösterilir) | O skill | Bir kez gösterilince |
| Hit Chance | Düşmana hasar veren skill seçildi (`preview`; hedefin üstünde "-22 / 81% hit") | - | Bir kez |
| Helping Allies | Dost seçen skill seçildi (`ally`, `single_ally`) | - | Bir kez |
| Rows and Reach | Seçilen yakın dövüş skill'i arka sıradaki düşmana ulaşamıyor | - | Bir kez |
| Area Shapes | Alan skill'i seçildi | - | Bir kez |
| Statuses | Bir kahramanda durum var | - | Bir kez |
| Bosses | Boss vuracağı hücreleri işaretledi | Move | Bir kez |

- **Eylem dersi** (Rest, Move, Burning Ground, Skip, Ultimate) oyuncu önerilen eylemi yapınca tamamlanır; yapmazsa durum yeniden oluştuğunda savaş başına bir kez, en çok 3 savaş (`actionRepeats`) yeniden çıkar. **Bilgi dersi** bir kez gösterilince biter.
- Oyuncu herhangi bir eylem yapınca açık ders kartı kapanır.
- **Bir kararda en çok bir ders** (savaşta karar başı + skill seçimi birlikte; ekranda aynı anda hazır derslerden yalnızca ilki, kalanlar ekran yeniden açılınca).

## Kutu (Ömer 2026-10-14)
- Küçük ve kenarda: oyun alanının sol üstünde, sıra çubuğunun altında; savaşanları ve sıra çubuğunu örtmez. Tek satır: portre | başlık + 1-2 satır metin | düğme. "Got it" diğer kit düğmeleriyle aynı (secondary, 44 px dokunma). Telefonda (`html.short / html.compact`) portre 36 px, mentor adı gizli. Gear dersleri altta ortada.
- **Spot ışığı (Ömer 2026-10-14):** Mill Road zorunlu adımlarında ve Boss dersinde ekran yumuşakça kararır; vurgulanan öğe (sıra çubuğu, skill düğmesi, Move) ve kutu aydınlık kalır. Karartma girdiyi engellemez; hedef (düşmana dokun) aşamasında yoktur. Telefonda ve döndürülmüş dikey sahnede de doğru yerde; "reduced motion"da geçiş yok. Veri: dersin `spotlight: true`.

## Kurallar
- **Atlama:** Settings > Gameplay > **Tutorials** On/Off (ana menü sütunu + oyun içi Settings) ve her kutuda **Don't show again** (tüm dersleri kapatır).
- **Yeniden oynatma (Ömer 2026-10-14):** aynı satırda **Replay**: görülen / tamamlanan dersleri unutur ve dersleri açar (debug "Reset tutorials" ile aynı); onay sorulmaz, "Tutorials will play again." yazar.
- **Bir kez:** görülen dersler `localStorage proto.tutorial.v1` (`{ v, on, seen, done?, shows? }`); sefer yuvasından bağımsız.
- **Codex > Lessons:** görülen her ders orada yeniden okunur (Getting Started'ın altında).
- **Zorunlu adım:** adım bitene kadar diğer skill / Rest-Skip-Move / hedef girdisi kabul edilmez; "Don't show again" ya da ayar kapalıysa serbest.
- **Katılım zamanı (Ömer 2026-10-27):** ikinci kahraman Mill Road kazanılınca, haritaya dönüşte katılır (aynı "A New Companion" penceresi; veri `recruit.when: "after"` Mill Road düğümünde, Ravenwood'da katılım yok). Eski kayıt (şema 12 kalır): Ravenwood'da yapılmış katılım (`2:recruit`) Mill Road'a yazılır (ikinci kahraman gelmez); Mill Road'u geçmiş ama katılımı görmemiş kayıt kahramanı bulunduğu yerde alır (`carriedRecruit`).
- **Zorunlu Formation (Ömer 2026-10-17, 2026-10-27):** tutorial'da katılım kayda sıradaki savaşın düğümünü yazar (`formationDue`; Mill Road'dan sonra Ravenwood). O düğüme dokunulunca (`formationTapGated`) savaş kartı yerine ekran spot ışığıyla kararır, yalnızca Formation düğmesi aydınlık ve parlar; Garrick'in kutusu (ders `formation_new_hero`, düğme yerine "Open Formation") yeni kahramanı ve dizilimi anlatır (ön sıra darbeyi alır, arka sıra okçu / büyücü için güvenli, kahramanları hücrelere sürükle). Formation açılana kadar harita düğümleri, Gear, Menu, Back ve diğer düğmeler çalışmaz (dokununca kutu sallanır). Formation açılınca (Done, zemin ya da Esc ile kapanması fark etmez) alan silinir (`markFormationOpened`), sonra düğüme dokunmak savaşı normal başlatır; Formation kapıdan önce kendiliğinden açılırsa da kapı kalkar. Alan isteğe bağlı: eski kayıtta yoksa kapı yok; geçersizse okunurken atılır; yola çıkınca silinir. Tutorials kapalıysa ya da "Don't show again" basılınca kapı yok. Telefonda / döndürülmüş sahnede spot doğru yerde, "reduced motion"da geçiş yok. Debug > Campaign > Tutorial > "Formation gate" (burada ya da ileri yoldaki savaşta kurar); ders Codex > Lessons'ta (On the Road).
- **Kaybedilemez ilk savaş:** motor `UnitSetup.undying` (can 1'de durur), karşılaşma `partyUndying: true` (Mill Road).

## Teknik
- İçerik: `data/tutorial.json` (mentor, açılış sözü, dersler + tetikler, Bölüm III ipuçları).
- Saf kurallar: `src/tutorial/lessons.ts` (`dueBattleLesson`, `lessonComplete`, `dueScreenLessons`, metindeki `{victoryHeal}` / `{restHeal}` veriden `LESSON_VARS`), durum tespiti `src/tutorial/situations.ts` (`turnSituations`, `selectSituations`, Mill Road MP adımı `strongMpSkill`); kayıt `src/tutorial/store.ts` (`seen`, eylem dersleri için `done` + `shows`); testler `tests/tutorial.test.ts`, `tests/tutorial-situations.test.ts`, `tests/battle-tutorial.test.ts` (zorunlu adım akışı), `tests/lesson-spot.test.ts`.
- Kutu (DOM, kit): `src/ui/lesson-box.ts` + `lesson-box.css` (vurgu `.tut-focus`, spot ışığı `.tut-spot`, zorunlu adım kilidi `<html data-tut-lock>`: next / skill / target / mp).
- Savaş: `src/game/battle-tutorial.ts` (BattleScene: oyuncu kararı, skill seçimi, skill / Rest-Skip-Move eylemi, zorunlu adım kapıları). Harita / kasaba / Gear / olay / dinlenme noktası: `CampaignMapScene.lessons(...)`; Endless: `EndlessScene.drawTitle`.
- Debug > Campaign > Tutorial: Tutorials on/off, Reset tutorials, "Trigger a lesson" (her ders + yenilgi ipucu).

## Gereken sanat
- Mentor portresi (Garrick, yaşlı sınır komutanı; 256x256, diğer avatarlarla aynı stil): `assets/avatars/mentor.png`, sonra `data/tutorial.json > mentor.avatar = "mentor"`. Hazır (2026-10-14): asıl `assets/source/mentor/garrick.png`, yana bakan sürüm (öne bakan ilk deneme reddedildi).
- (İsteğe bağlı) Codex > Lessons ikonu: şimdilik piksel `book`.
