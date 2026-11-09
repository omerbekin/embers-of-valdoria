# Arşiv
> **Ne için / Güncel mi (2026-11-08):** Eski, uygulanmış veya yerine yenisi geçmiş belgelerin tek dizini. Güncel değil, silinmez. Yol, `docs/` altındaki özgün yolun aynısıdır (`docs/archive/<aynı yol>`). Güncel sahiplik: `docs/arch/docs-map.md`. Taşıma kuralı: tarihçe canlı belgeden çıkınca birebir buraya gelir, dosya başında "Ne için" satırı olur, canlı belgede tek satır bağlantı kalır.

Yolları `docs/archive/` önekiyle oku (örn. `design/hp-death-rework.md` = `docs/archive/design/hp-death-rework.md`).

## arch/ (çalışma düzeni, alan belgesi tarihçeleri)
- `arch/chat-owners.md`, `arch/coordinator.md`: alt sohbet ve Koordinatör düzeni (kapandı, Ömer 2026-11-02); yerine `docs/arch/lead.md`.
- `arch/old-claude-md-sections.md`, `arch/battle-engine-history.md`, `arch/accounts-plan.md`, `arch/codex-art-loop.md`: eski CLAUDE.md bölümleri, motor tarihçesi, hesap planı, Codex sanat döngüsü; güncel kurallar `docs/arch/` altındaki ilgili belgede.
- `arch/areas/{campaign,character-design,character-vfx,push-queue,ui-ux}.md`, `arch/{assets,lead,ui-and-stage,workflow-rules,stale-docs}.md`: alan ve kural belgelerinden taşınan tarihçe / eski Kararlar günlükleri; güncel hâli `docs/arch/areas/` ve `docs/arch/`.
- `handoff/push-workflow-2026-10-29.md`: eski gönderim iş akışı notu; güncel `docs/arch/areas/push-queue.md`.

## design/ sistem ve denge tarihçesi
- `design/balance-log-2026-10-11.md`, `design/balance-baseline-before-initcd.md`: denge turu günlüğü ve eski ölçüm; güncel bantlar `docs/balance.md`, `data/balance.json`.
- `design/open-questions-archive.md`: Ömer'e sorulan eski maddeler 1-520 (numarayla arayan yolu açıkça verir; `.ignore` aramadan gizler); güncel `docs/design/open-questions.md`.
- `design/progression/items-history.md`, `item-design-plan-history.md`, `item-effects.md`, `levels-history.md`, `roadmap-2026-10.md`: eski item, level ve ilerleme planları; güncel `docs/design/progression/`.
- `design/economy-d8-proposal.md`: seçilmeyen D8 ekonomi paketi; uygulanan ekonomi `data/items.json > loot`, `data/campaign/campaign.json > merchant`.
- `design/hp-death-rework.md`, `design/combat-hp-death-rework-table.md`, `design/combat-x2-stat-scale.md`: can / ölüm ve stat ölçeği reworkleri (uygulandı); güncel `docs/design/combat.md`.
- `design/range-history.md`, `design/waves-history.md`, `design/ai-priorities-history.md`, `design/ai-priorities-plan-and-questions.md`, `design/multiplayer-quota.md`: menzil, dalga, YZ, çok oyunculu kota tarihçeleri; güncel `docs/design/range.md`, `waves.md`, `ai-priorities.md`, `multiplayer.md`.
- `design/classes-old.md`, `design/classes/*.md` (12 sınıf dosyası): eski sınıf taslakları ve tarihçe; güncel `docs/design/classes/`.
- `design/skill-scaling-review.md`, `design/vision-2026-10-08.md`, `design/pending-fixes.md`, `design/tutorial-order.md`, `design/pose-coverage.md`: eski gözden geçirme, vizyon ve plan notları.
- `design/playtest-2026-10-23.md`, `design/playtest-2026-10-23-picks.md`: 2026-10-23 playtest bulguları ve Ömer seçimleri (işlendi).
- `design/future-ideas/done.md`: biten ve kapanan fikirler; canlı liste `docs/design/future-ideas.md`.

## design/ skill ağacı turları
- `design/skill-tree-structures.md`, `skill-tree-mastery.md`, `skill-tree-mastery-v2.md`, `skill-tree-moments-variants.md`, `skill-tree-moments-mockup-notes.md`: ağaç şekli seçim turları; sonuç `docs/design/skill-tree-moments.md`.
- `design/skill-trees-grimdawn.md`, `design/offhand-and-skilltree-draft.md`: 2026-10-12 öneri / taslaklar; ağaçlar `data/skill-trees/` ile yapıldı, ikinci el kuralı `docs/design/progression/items.md`.
- `design/skill-tree-fx-catalog.md`, `design/skill-tree-implementation.md`: biten ağaç VFX ve uygulama planı; güncel `docs/design/skill-tree-implementation.md`, `skill-tree-fx-reference.md`.

## design/ sefer
- `design/campaign/campaign-mvp-v5.md`, `maps-2-3-plan.md`, `map2-quests-surge.md`, `map-1-rework.md`, `valdoria-2x.md`, `fill-plan.md`, `mob-plan.md`: eski sefer planları (uygulandı); güncel `docs/design/campaign/`, `docs/arch/areas/campaign.md`.
- `design/campaign/map3-art-status.md`, `morvane-cinematic-video.md`: Harita 3 sanat durumu (hepsi TAMAM), Morvane video promptları (hareketsiz kareler kullanıldı, `docs/design/campaign/cinematics.md`).
- `design/campaign/art-review-*`, `borderlands-flow-reference.png`, `progression-concepts-reference.png`: eski inceleme görselleri.
- `design/bosses/bridge-warden.md`: Bridge Warden boss tasarımı (uygulandı).
- `design/dialogue-replies-draft.md`: diyalog cevapları taslağı; Ömer 2026-10-31 onayladı, metinler `data/campaign/*events.json` içinde `"reply"`.

## design/ sanat, arayüz, ses
- `design/art.md`, `design/art-v2-history.md`, `design/art/*.md` (Codex ikonları, 10 sınıfın skill ağacı ikon planı), `design/icon-redraw-plan.md`, `design/mob-vfx-fixes.md`, `design/prompts/{item-icons,misc-icons}.md`: eski sanat planları ve prompt'lar; güncel `docs/design/art-v2.md`, `docs/arch/assets.md`.
- `design/audio-map-mob-sounds.md`: mob ses tarif anlatıları; güncel tarifler `data/audio-mobs.json`.
- `design/ui-consistency-audit.md`, `design/ui-reference-long-rows.md`: arayüz tutarlılık taraması ve `ui-reference.md` uzun satırlarının eski tam metni.
