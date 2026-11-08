# Eski / çelişen belge listesi (2026-11-08 temizliğinden sonra kalanlar)

> **Ne için / Güncel mi (2026-11-08):** çelişen/eski belge izleme listesi. classes.md ve vision.md satırları çözüldü (2026-11-08 bugün yenilendi), silindi. docs/arch + areas + eski design belgeleri taranıp başlık eklendi; project-layout.md ve combat.md (sıra sistemi) düzeltildi.


Kanıt = koddaki gerçek durum. Karar Lead / Ömer'indir. Çözülen satır silinir. Temizlikte: eski/uygulanmış belgeler `docs/archive/`e taşındı (README orada), birleştirmeler yapıldı (coordinator + chat-owners -> lead.md, pending-fixes -> areas/minor-fixes.md, codex-art-loop -> codex-imagegen.md, art -> art-v2.md, hp-death-rework -> combat.md, tutorial-order -> tutorial.md), yanlış yollar düzeltildi (diagnostics, multiplayer, bridge-warden, items).

| Belge | Sorun | Kanıt |
|---|---|---|
| docs/balance.md | Kontrol EDİLMEDİ (sayıların balance.json ile uyumu) | tests/balance.test.ts bunu zaten denetler |
| docs/design/open-questions.md ve open-questions-archive.md | `tools/make-class-icons.mjs` (gerçek: `.py`), `assets/palette.json`, `tests/gallery.test.ts` anılıyor; ayrıca `docs/archive/` e taşınan belgelerin eski yollarını (icon-redraw-plan, map-1-rework, accounts-plan, hp-death-rework, pose-coverage, skill-scaling-review, balance-baseline, valdoria-2x, fill-plan, pose-coverage...) anıyor | palette ve gallery testi yok; arşiv yolu `docs/archive/<aynı yol>` (dosyalara dokunulmadı: başka agent kullanıyor) |

Not: başka agentların kullandığı dosyalara (open-questions*, skill-tree-*, offhand draft, classes/**, classes.md, vision.md, anim-review, areas/*) bu temizlikte dokunulmadı; içlerindeki eski yollar `docs/archive/<aynı yol>` olarak okunur. `docs/arch/code-map.md` `npm run codemap` ile yenilendi.

## docs/design planı/taslak denetimi (2026-11-08)
Her belgeye "Ne için / Güncel mi" başlığı eklendi. Arşive: dialogue-replies-draft, campaign/map3-art-status, campaign/morvane-cinematic-video. Kalan tutarsızlıklar:

| Belge | Sorun | Kanıt |
|---|---|---|
| Karar bekleyenler (canlı, bilerek duruyor) | economy-d8-proposal (paket seçilmedi), enemy-weapon-tags, element-class-template, character-tiers, silver-stag-arc: uygulanmadı | ilgili alan belgeleri |
