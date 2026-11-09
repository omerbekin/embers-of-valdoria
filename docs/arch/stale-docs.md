# Eski / çelişen belge listesi
> **Ne için / Güncel mi (2026-11-08):** çelişen/eski belge izleme listesi; yalnız AÇIK satırlar. Çözülen satır silinir. Temizlik tarihçesi: `docs/archive/arch/stale-docs.md`.

Kanıt = koddaki gerçek durum. Karar Lead / Ömer'indir. Arşive taşınan belgenin eski yolu `docs/archive/<aynı yol>` olarak okunur.

| Belge | Sorun | Kanıt |
|---|---|---|
| docs/balance.md | Sayıların `data/balance.json` ile uyumu kontrol EDİLMEDİ | `tests/balance.test.ts` bunu zaten denetler |
| `docs/design/open-questions.md` ve `docs/archive/design/open-questions-archive.md` | Var olmayan yollar anılıyor (tools/make-class-icons.mjs (gerçek `.py`); `assets/palette.json`; tests/gallery.test.ts) ve arşive taşınan belgelerin eski yolları | palette ve gallery testi diskte yok; arşiv yolu `docs/archive/<aynı yol>` |
| Karar bekleyenler (canlı, bilerek duruyor) | economy-d8-proposal (arşivde: `docs/archive/design/economy-d8-proposal.md`, paket seçilmedi), enemy-weapon-tags, element-class-template, character-tiers, silver-stag-arc (`docs/design/future-ideas/silver-stag-arc.md`): uygulanmadı | ilgili alan belgeleri |
