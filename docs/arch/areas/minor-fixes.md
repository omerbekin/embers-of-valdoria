# Alan: Minor Fixes (küçük / sahipsiz işler)
> **Ne için / Güncel mi (2026-11-08):** küçük/sahipsiz işler ve bekleyen düzeltmeler. son durum 2026-11-02; bekleyen tablo boş.


Son durum: 2026-11-02. Bekleyen düzeltme listesi bu dosyadadır (eski `pending-fixes.md` buraya birleştirildi, kopyası `docs/archive/design/pending-fixes.md`; tablo boştu).

## Çalışma kuralları
- Küçük düzeltme: bul, düzelt, test ekle, sürüm notu satırını `node tools/push-queue.mjs ready <oturum> --fixes "..."` ile ver. Not tam cümle, 140 karakter altı, dosya adı yok. `notes` komutu TÜM satırları değiştirir; hepsini birlikte ver.
- Tam ağaç commit edilir (assets/source hariç); yarım iş varken `ready` verme.
- Başka alanın dosyasında geri alma yapma; yalnız kendi hunk'ını geri al.
- Motor kuralı / kayıt şeması / denge değeri Combat Design'a (Lead) gider; burada yapılmaz.

## Yapılanlar (bu turda, hepsi main'de)
- Combat log: kendi/yabancı/eylemsiz hasar satırları, `hitCause`; DoT ile ölende "Skipped" yazmaz (`src/engine/battle.ts`, `src/game/combat-log.ts`).
- Paladin pasif smite çift "Divine Light" yazısı: `passiveSmite(..., announced)`.
- Item tür adları tek kaynaktan: `src/progression/items.ts` (`itemKindName`, `itemKindPlural`, `cannotUseText`); `data/items.json` içinde `plural` (ör. staff: "Staves").
- STR yazısı düz metin: `src/engine/stat-info.ts` hpRegen ("+X per point. You have N STR.").
- Weir Warden yeni cevap: `data/campaign/drowned-reach-events.json`.

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
1. Bu dosyanın "Bekleyen düzeltmeler" bölümü, sonra ilgili dosya (`src/game/combat-log.ts`, `src/progression/items.ts`, `src/engine/stat-info.ts`).
2. Testler: `tests/combat-log*.test.ts`, `item-rules.test.ts`, `primary.test.ts`, `buffs.test.ts`.
3. Metin kuralı: oyun içi İngilizce, Ömer'le Türkçe.

## Kararlar (hafızadan taşındı 2026-11-08)
Tam metin `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/minor-fixes-chat.md`.
- Ömer 2026-10-31: "sadece not alma düzeltme de yap": her madde bu dosyanın "Bekleyen düzeltmeler" bölümüne satır olur ve düzeltilir; biçimi Ömer'in seçeceği maddeler soru olarak kalır.
- Bu alanda karakter (sınıf) denge değişikliği yapılmaz (Ömer 2026-10-31).
- Form kararları (2026-10-31/11-01: XHRQTLgNCTRgrZJPAKqaKE, 5zA2fTZoieYUk375aqLJpe, JNBoJeMNZ9fcnRxJkVcNCd, 3BrydobNvD6oDRByW5vu17, 5jP9sSGG5vSKyYjxVKF2Vb, PHYLLgAq71QhakfARDAvaX, SddKWixEhvgaA8Az3yWr8T, J8AtVow21nfPMCX7DW3Yp3) uygulandı. İki lore sorusu açık: `docs/archive/design/dialogue-replies-draft.md` (Ash on the Wind hayatta kalanlar bilerek açık). Paladin log satırı pasif adı Divine Light'ı kullanır, düğüm adını değil.
- Ömer ekran görüntüsüne "skill görünümü" yazınca o parçayı düzelt, ayrı yerleşim önerme.

## Bekleyen düzeltmeler (eski docs/design/pending-fixes.md)
Ömer 2026-10-31: bu kanal artık hem not alır hem düzeltir; biten satır listeden silinir, biçimi ya da kuralı Ömer'in seçeceği satırlar soru olarak kalır.
| # | Tarih | Konu | Not / yön |
|---|---|---|---|

### Ömer'in form kararları (2026-10-31, artifact XHRQTLgNCTRgrZJPAKqaKE, db kararlar/main)
- #25 hedef yazıları: a. '-14  85%', altında yazısız durum ikonları; yalnız %50 ve üstü ihtimaller görünür.
- #1 Ley Thread: a, mana yakma azalır. Ömer ek: oyunda iki farklı mana yakma var, bu da düzeltilecek.
- #17 Block tavanı: b, kalkar. Ömer ek: Block kırma şansı gibi karşı bufflar olsun; kalkanlı düşmanların da Block şansı olsun; item'lara Block kırma şansı gelsin.
- Sim: a, mana kaldırma bitince 300 sim, önce ve sonra farkı.
- #3 Castle Gate: KAPANDI (2026-11-02). Görsel zaten güncellenmişti (sürüm notunda "Castle Gate art cleaned up" var); yeniden üretilen görsel oyuna alınmadı, yalnız geçici klasörde kaldı.
- #4 Barracks üyesi: a, binanın üstünde rozet + kasaba bandında kısa yazı.
- #23 kasaba level'ı: otomatik (kasabanın yanındaki düğümlerin düşman level'ından). Dükkân tavanı Ömer'in notuyla: level farkı, bir sonraki kasabaya kadarki moblara göre belirlenir.
- #6 ve #10 Gear filtreleri ve Sheet: a, gerçek görünümle mockup.
- #12 'now STR 29' kutusu: a, kutu kalkar, düz yazı olur ('+1 per point. You have 29 STR.').
- #32 dükkân ilk stoğu (form 4, artifact 3BrydobNvD6oDRByW5vu17): b, kural aynen kalır; ilk stok kasaba level'ında, takımın çok üstünde olsa da kısılmaz.
