# Alan: Minor Fixes (küçük / sahipsiz işler)
> **Ne için / Güncel mi (2026-11-08):** küçük/sahipsiz işler ve bekleyen düzeltmeler. bekleyen düzeltme yok.


Bekleyen düzeltme listesi bu dosyadadır (eski `pending-fixes.md` buraya birleştirildi, kopyası `docs/archive/design/pending-fixes.md`; tablo boştu).

## Çalışma kuralları
- Küçük düzeltme: bul, düzelt, test ekle, sürüm notu satırını `node tools/push-queue.mjs ready <oturum> --fixes "..."` ile ver. Not tam cümle, 140 karakter altı, dosya adı yok. `notes` komutu TÜM satırları değiştirir; hepsini birlikte ver.
- Tam ağaç commit edilir (assets/source hariç); yarım iş varken `ready` verme.
- Başka alanın dosyasında geri alma yapma; yalnız kendi hunk'ını geri al.
- Motor kuralı / kayıt şeması / denge değeri Combat Design'a (Lead) gider; burada yapılmaz.

## Açık / bekleyen
- Castle Gate: KAPANDI, görsel zaten güncel (sürüm notunda var). Yeniden üretilen görsel oyuna alınmadı (geçici klasörde).
- Emberbrand tür/görsel uyumsuzluğu → Item Design. Çekiç/gürz ikon + isim tutarsızlığı → Item Design.
- Ley Thread / ikinci mana yakma → Combat Design (Ley 1,5, Ömer'in son kararı).
- `assets/source/ui-icons/ring-slot.png` izlenmeyen dosya, bu alana ait değil; commit'e sokma.

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
