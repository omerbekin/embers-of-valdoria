# Açık Sorular ve onay bekleyen varsayımlar
> **Ne için / Güncel mi (2026-11-08):** Ömer'a açık sorular (madde 1-2) ve onay bekleyen varsayımlar. Eski maddeler (1-520): `docs/archive/design/open-questions-archive.md`.

Bu dosya iki şey tutar: Ömer'e açık sorular ve agentların Ömer onayı almadan yaptığı varsayımlar. **Kararlar burada durmaz:** Ömer'in verdiği karar konunun sahip belgesine yazılır (`docs/arch/docs-map.md`; sınıf için `docs/design/classes/<id>.md` > Ömer kararları, mekanik için `combat.md` / `docs/arch/battle-engine.md`, sefer için `campaign/*`, item için `progression/*`).

- **Eski maddeler (1-520) arşivde:** `docs/archive/design/open-questions-archive.md` (aramada hariç; numarayla arıyorsan yolu açıkça ver). Madde 330-520'nin A/B/C/D listesi arşivde "Madde 330-517 ve üç Q-NEW" başlığında. Bir belge "open-questions madde N" diyorsa tam metin arşivdedir.
- **Yeni madde:** dosyanın SONUNA, "Onay bekleyen varsayımlar" altına `## Q-NEW. Başlık (tarih, agent)` olarak, en çok birkaç satır. Ömer cevap verince karar sahip belgeye yazılır, madde arşive taşınır.
- Aşağıdaki satırlar kısa özettir; "(madde N)" tam metnin arşivdeki numarasıdır.

## Ömer'e açık sorular

1. **Hukuki metin (madde 415):** gizlilik metnindeki hukuki dayanak ve "13 yaş altı giriş yapmasın" satırı oyunda var (`data/account-notice.json`); avukat kontrolü ve Türkiye veli onayı yaşı bekliyor (oyun kararı değil, dış kontrol).

2. **Kasabada ücretli dinlenme / Fountain dolumu:** ilerleme yol haritası karar 7 (2026-10-09) hâlâ açık: Rest altın istesin mi (ilk dinlenme bedava, sonra bölüm seviyesine göre küçük ücret), elit / boss sonrası Fountain benzeri dolum olsun mu. İlgili fikir satırı: `docs/design/future-ideas/campaign.md` (Hades mantığında can). Eski plan: `docs/archive/design/progression/roadmap-2026-10.md` bölüm 2.3 D ve 2.5.

3. **Skald ve Vesper kişisel görevi:** 13 sınıflık havuza sonradan girdiler, kişisel görevleri tanımlı değil (`campaign/map2-quests-surge.md`). Kasıtlı mı, görev eklensin mi?

4. **Karakter tier sistemi kapsamı:** `progression/character-tiers.md` dağılımı ilk 9 sınıfı kapsıyor; Skald ve Vesper tier planına girecek mi?
Eski liste madde 2-16 2026-11-08'de kapandı: bugünkü oyun davranışı Ömer'in cevabı sayıldı. Liste arşivde "2026-11-08 doğrulama: kapanan D/B".


## Onay bekleyen varsayımlar

Hepsi kodda bugünkü davranış. Ömer onayı bekliyor; itiraz gelirse değişir. Tam metin arşivde.

- **332** Settings sayfalı düzen: Fullscreen Display sayfasında, Privacy'de Copy log / Info ayrı satır, son sayfa oturumda hatırlanır, klavye gezinme kuralları.
- **333** Bölge III mob paketi: YM20 Close Ranks, YM22 Molten Shed, YM23 Crown of Ash yeni mekanikleri (YM21 onaylı) ve Lord Morvane sim ayarı. Ayrıntı arşiv `docs/archive/design/campaign/mob-plan.md` 10.
- **356** Harita 1 düğüm lore cümleleri content-designer taslağı; Ömer okuyup onaylamadı.
- **366** 0.9.1 gecesi küçük kararları: Gear sekme ikonları, tek Bad Omen göstergesi, Cairn Hill düğümü, DEFEATED damgası, mob VFX ölçeği, loot `gripWeight` 2,5, Thane ayarı.
- **402** Evolve ikonu: sanat varsa ikon değişir, Codex / QB / MP'de animasyon yok, Performance Mode'da durur, pasif satırı evolve'u bağlanmadı.
- **405** Hikâye sinematikleri: Prologue kahraman seçiminden önce, zafer sinematikleri ganimetten sonra, Esc = Skip, yarıda kesmek "görüldü" sayılır.
- **428** Harita 2 Wayshrines ve Salvage Dive: sınav türleri, nimet sayıları, dalış derinlikleri ve yenilgi kuralı (sayılar provizyon).
- **430** Storm (yalnız `motion: ranged` skill'ler, -15 isabet puanı) ve Tidewater Urn (oyuncu tahtası orta hücre, global eylem) varsayımları.
- **432** Crown Surge / Ashen Taint: provizyon sayılar, Ash çağrılara da gider, YZ ve sim Surge kullanmaz (Ömer cevapları 449'da; kalanlar burada).
- **433** Harita 2 deniz kuralları: crossing bayrağı, Charter 60 altın (provizyon), Caravel hareketi, Gallows Cove kapısı, Lantern Rock +1 görüş.
- **434** Mill Road sonrası katılım ve zorunlu Formation spot ışığı: kapı Ravenwood'a dokununca, kilitliyken yalnız bakma serbest.
- **467** Kasaba level'ı / dükkân tavanı (kural onaylı): tavan = sonraki kasabaya kadarki en güçlü mob level'ı, 1 mob level'ı = 1 item level'ı, yalnız `town` türü sınır.
- **472** Harita 3 Heat / Cave-in / Darkness + Lantern: Cave-in ayrı kural, sayılar geçici, Lantern yalnız hc_43.
- **473** Frozen köşe durumları: zemin yeniden Chilled verir, Burning tiki çözer, Ice hücresi 2 tur.
- **475** Harita 3 şimşek kuralları: etiket kapısı `thunder`, ıskalayan bolt da düşer, su 1 tur canlı, ark / Shatter sayıları geçici.
- **476** Harita 3 imza mekanikleri (Thunder Rod vb.): sayılar provizyon, en basit yorum.
- **477** Harita 3 mobları: Pole Vault, Undermine, Slagcart, Headlong, Ring the Anvil, Stormhide yorumları; Rime Witch / Rime Hound yer tutucu.
- **478** Harita 3 E1-E6 dokunuşları (Overheat, Whiteout, The Long Sermon, Storm in the Chimney); altı boss kit bekliyor. Ayrıntı arşiv `docs/archive/design/campaign/maps-2-3-plan.md` son bölüm.
- **480** Tek kişilik sefer başlangıcı: Defender / Paladin skill açılış sırası, XP bölünmüyor, çarpan düğüme bağlı, metinler taslak.
- **482** Harita 1 tek kişilik eğri: kolay düğüm listesi genişledi, Iron Pass / Charcoal Camp hedefi ~93 agent seçimi, yalnız Medium ölçüldü.
- **487** Affix ölçüm aracı (`npm run sim:affix`): ilvl dilimi oynanır, temel takım Uncommon, ölçü savaş sonu ortalama can.
- **488** Level farkı saldırı bonusu: +%2 isabet düz puan, yalnız doğrudan hasar vuruşu, yalnız düşmana, çağrı çağıranın level'ını alır.
- **498** Zemin tepkimesi / rozet küçük değişiklikleri: Ice + ateş Quenched, Purified `poisoned` siler, zemin rozeti durum varken gizlenir.
- **502** Affix dağılımı adım 3: direnç girdisi 2 kat, `needs` alanı olmayan B / A affix her sınıfa uyar, Reforge'da sınıf ağırlığı yok.
- **513** Pilot set motoru (`setsEnabled` kapalı): Ashguard yalnız Warrior / Defender / Paladin, parça affix'leri elle, ertelenen hasar yuvarlama, set düşüş oranı.
- **518** Thunder Skald: War Drum karesi tahta kenarında kırpılır; bölünmüş vuruş Guard / Phalanx'ta tek vuruş sayılır, hedef ilk parçada düşerse ikinci parça yok (sayılar 2026-11-08 simiyle kapandı).
- **519** Vesper ağacı v3: bedava Toll düğümleri hedefsiz, Judgement Peal seçicisiz, Long Glare yerine Glaring Peal; sayılar tahmin. Ayrıntı `classes/vesper.md` bölüm 3.
- **520** Skald ağacı v1: Hammer Spark Slow / Stun koşullu kancayla, War Drum `castCount` dostları sayar, YZ procChance'lı kancaları şansıyla değerler; sayılar tahmin. Ayrıntı `classes/skald.md` bölüm 3.
