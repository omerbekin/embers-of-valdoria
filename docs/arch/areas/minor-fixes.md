# Alan: Minor Fixes (küçük / sahipsiz işler)
> **Ne için / Güncel mi (2026-11-15):** küçük/sahipsiz işler ve bekleyen düzeltmeler. 1.0 öncesi sağlamlık taramasının bulguları "Açık işler"de (düzeltme planı onay bekliyor).


Bekleyen düzeltme listesi bu dosyadadır (eski `pending-fixes.md` buraya birleştirildi, kopyası `docs/archive/design/pending-fixes.md`; tablo boştu).

## Çalışma kuralları
- Küçük düzeltme: bul, düzelt, test ekle, sürüm notu satırını `node tools/push-queue.mjs ready <oturum> --fixes "..."` ile ver. Not tam cümle, 140 karakter altı, dosya adı yok. `notes` komutu TÜM satırları değiştirir; hepsini birlikte ver.
- Tam ağaç commit edilir (assets/source hariç); yarım iş varken `ready` verme.
- Başka alanın dosyasında geri alma yapma; yalnız kendi hunk'ını geri al.
- Motor kuralı / kayıt şeması / denge değeri Combat Design'a (Lead) gider; burada yapılmaz.

## Açık / bekleyen
- Metin turu r46 (2026-11-25, dal agent/metin-r46): Amerikan yazım süpürmesi (armour/colour/grey/harbour/travel(l)ing/cancelled/Fervour vb., yalnız görünen metin), Wither adı > Withering, "Magic Armor" tek biçim, Wound/Hobbled/Red-Hot/High Stakes/tutorial düzeltmeleri, Soaked cümlesi, status notası. Mob yeniden adlandırma: yalnız Brannoc "Skullsplitter" > "Helm Cleaver" (öbür aynı adlar mob-mob). Bırakılanlar: `match-log.ts` "cancelled" (hata ayıklama günlüğü), audio ikinci kıvrık apostroflar, `harbour` kod yorumları, "Wounded" sıfatları (skill ağaçları).
- Castle Gate: KAPANDI, görsel zaten güncel (sürüm notunda var). Yeniden üretilen görsel oyuna alınmadı (geçici klasörde).
- Emberbrand tür/görsel uyumsuzluğu → Item Design. Çekiç/gürz ikon + isim tutarsızlığı → Item Design.
- Ley Thread / ikinci mana yakma → Combat Design (Ley 1,5, Ömer'in son kararı).
- `assets/source/ui-icons/ring-slot.png` izlenmeyen dosya, bu alana ait değil; commit'e sokma.

## Eski kayıt açılma testi (bug-hunter 2026-11-23, 1.0 öncesi liste; dal agent/bug-hunter-eski-kayit)
- **Sonuç: hata yok.** Sefer dosyası sürümleri 2..15 ve Endless 1..8 bugünkü okuyucuda çökmeden açılıyor; sürüm 6 ve sonrası kayıpsız (kahraman, level, altın, torba, set parçaları, Valor, yara, ağaç, Ring yuvası taşınır). Sürüm 1-5 kayıtları bilerek yeni haritaya taşınmaz (yuva + "map changed" uyarısı; save.ts sürüm 6 notu).
- Test: `tests/old-save-open.test.ts` (sürüm matrisi, bozuk / yarım JSON, proto.* anahtar göçü, her sınıfın eski ağaç sürümü, Endless sürümleri), `tests/diag-crash-flow.test.ts` (çökme bayrağı yaşam döngüleri).
- Tarihte hiçbir sınıf id'si (Anti-Mage -> Redtithe yalnız görünen ad; id `antimage` aynı), item id'si ya da ağaç düğüm anahtarı kaldırılmadı / yeniden adlandırılmadı (git geçmişi tarandı); eski ağaç sürümü tutulan dağılım bedava respec alır.
- Bilinen boşluk (şu an tetiklenmiyor): roster'daki tanımsız sınıf id'si ve takılı / torbadaki tanımsız item id'si okuyucuyu geçer (yalnız yedek / Inn sınıf denetler); ileride sınıf ya da item kaldırılırsa göç kuralı eklenmeli.
- `previous_session_crashed`: bayrak yalnız görünürken (canlılık 45 sn kesilince) ölen oturumda kalkıyor; hidden / pagehide temiz sayılır. Normal arka plana gitme, yenileme, kapatma yanlış pozitif vermiyor (test). Kod okumasından kalan zayıf yollar: (1) masaüstünde görünür sekme uykuya dalarsa (kapak kapanması) ikinci sekme açılınca ilki "çöktü" sanılır; (2) iki sekmenin eşzamanlı işaret yazımı (okuma-değiştirme-yazma) nadiren temiz bayrağı ezebilir. Telefondaki 6 rapor büyük ihtimalle gerçek ani ölüm (bellek) ya da hidden olayı gelmeyen ölüm;  olayını da temiz saymak ucuz bir hafifletme ama kanıtsız, yapılmadı.

## Açık işler: 1.0 öncesi sağlamlık taraması (bug-hunter 2026-11-15; kayıt kaybı maddeleri düzeldi, gönderim bekliyor)
- **DÜZELDİ (2026-11-15, bug-hunter, dal agent/bug-hunter-kayit-kaybi, gönderilmedi).** Okunamayan sefer dosyası artık ezilmiyor.
  - `save.ts > write`: dosya daha yeni sürümse (ör. v15) hiç yazılmaz; oyuncuya "This save was made by a newer version. Reload to update." (ana menü notu + reddedilen kayıtta uyarı, dakikada en çok bir).
  - Yarım / bozuk dosya: üstüne yazmadan önce ham dizgi `eov.campaign.corrupt.v1`e kopyalanır (senkronlanmaz); kopya yazılamazsa yazılmaz.
  - `tombstones.ts > deletedSlots`: önceki dosya sürümsüz ya da yazandan yeniyse, ya da yuva okuyucunun tanımadığı biçimdeyse silme işareti yok.
  - Test: `tests/save-unreadable-guard.test.ts`.
  - Açık kalan küçük nokta: eski sekmede (v15 yerel dosya) temiz cihaz bulut indirmesi yerel dosyayı yine ezebilir; yalnız `eov.cloud.backup.v1`e yedeklenir.
- **DÜZELDİ (2026-11-15).** Çevrimdışı açılışta oynanan ilerleme kalıcı `meta.dirty` alır (`cloud.ts > watchDirtyOffline / persistDirty`); sonraki açılışta normal çakışma sorusu gelir. Test: `cloud-client.test.ts` "sağlamlık A2".
- **DÜZELDİ (2026-11-15).** Kayıt yazılamazsa (kota / depo kapalı) oturumda bir kez "Progress could not be saved on this device." (`campaign-session.ts`, `save.ts > onSaveFail`). Test: `tests/save-fail-warning.test.ts`.
- **Soru (Ömer).** Sefer savaşı ortasında sekme kapanırsa savaş baştan başlar; duraklatma kaydı yalnız Retreat'te. Ironman'da sekme kapatıp yenilgiden kaçılabilir. Gizlenince kayıt yazılsın mı?
- **DÜZELDİ (2026-11-15).** `stale-build.ts`: çevrimdışıyken (`navigator.onLine` false ya da sayfa sunucusu yanıt vermiyor) yenileme yok, "No connection. Reconnect and try again." uyarısı; oyunda kalınır. Test: `stale-build.test.ts`.
- **Küçük.** Hata raporu deposunun 38/45'i agent tarayıcısı (localhost, UA `Claude/`); localhost raporları ayrılmalı.
  - Gerçek telefon: 6 `previous_session_crashed`, hidden izi yok, bellek düşük, sebep belirsiz.
  - Öneri: `freeze` olayı da iz + temiz sayılsın.
- **Küçük.** İlk yüklemede `debug-state` parçası (241 KB) var.
  - `public/mockups` (98 MB) canlıya gidiyor.
  - Menü 4 x 2580x1080 katman telefonda da tam boy (42 MB doku).
- Tam rapor ve ölçümler: bug-hunter sağlamlık raporu (scratchpad); kare süresi ölçülemedi (gizli panel, Playwright yasak).

## Tuzaklar
- Golden: motor olay akışı değişince kırmızı olur; gönderim yeniden üretir, elle düzeltme.
- Codex görsel üretimi: `tools/codex/imagegen.mjs`, tek iş, ücretli API asla; çıktı önce scratchpad, Ömer görmeden import yok.
- Makine yükü yüksekse tek agent, tam test yalnız `ready` öncesi.
- Haiku taramaları yanlış çıkabilir (kısmi dediği iş yapılmış olabilir): raporlamadan önce kodu oku.

## Agent buradan başlar
1. Bu dosyanın "Bekleyen düzeltmeler" bölümü (şu an boş), sonra ilgili dosya (`src/game/combat-log.ts`, `src/progression/items.ts`, `src/engine/stat-info.ts`).
2. Testler: `tests/combat-log*.test.ts`, `item-rules.test.ts`, `primary.test.ts`, `buffs.test.ts`.
3. Metin kuralı: oyun içi İngilizce, Ömer'le Türkçe.

## Kararlar (hafızadan taşındı 2026-11-08)
Tam metin `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/minor-fixes-chat.md`.
- Ömer 2026-10-31: "sadece not alma düzeltme de yap": her madde bu dosyanın "Bekleyen düzeltmeler" bölümüne satır olur ve düzeltilir; biçimi Ömer'in seçeceği maddeler soru olarak kalır.
- Bu alanda karakter (sınıf) denge değişikliği yapılmaz (Ömer 2026-10-31).
- Form kararları (2026-10-31/11-01: XHRQTLgNCTRgrZJPAKqaKE, 5zA2fTZoieYUk375aqLJpe, JNBoJeMNZ9fcnRxJkVcNCd, 3BrydobNvD6oDRByW5vu17, 5jP9sSGG5vSKyYjxVKF2Vb, PHYLLgAq71QhakfARDAvaX, SddKWixEhvgaA8Az3yWr8T, J8AtVow21nfPMCX7DW3Yp3) uygulandı. İki lore sorusu açık: `docs/archive/design/dialogue-replies-draft.md` (Ash on the Wind hayatta kalanlar bilerek açık). Paladin log satırı pasif adı Divine Light'ı kullanır, düğüm adını değil.
- Ömer ekran görüntüsüne "skill görünümü" yazınca o parçayı düzelt, ayrı yerleşim önerme.

## Bekleyen düzeltmeler
Şu an bekleyen yok. Biten işler ve Ömer'in 2026-10-31 form kararları: `docs/archive/arch/areas/minor-fixes.md`. Yeni madde: bu bölüme satır olarak yaz, düzelt, biten satırı sil.
