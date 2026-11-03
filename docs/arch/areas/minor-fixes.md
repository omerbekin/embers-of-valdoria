# Alan: Minor Fixes (küçük / sahipsiz işler)

Son durum: 2026-11-02. Liste `docs/design/pending-fixes.md` (tablo boş; altında "form kararları" bölümü kalıntı not).

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
1. `docs/design/pending-fixes.md`, sonra ilgili dosya (`src/game/combat-log.ts`, `src/progression/items.ts`, `src/engine/stat-info.ts`).
2. Testler: `tests/combat-log*.test.ts`, `item-rules.test.ts`, `primary.test.ts`, `buffs.test.ts`.
3. Metin kuralı: oyun içi İngilizce, Ömer'le Türkçe.
