> Ne için: docs/arch/battle-engine.md belgesinden 2026-11-08'de taşınan tarihçe notları; güncel değil.

- Eski başlık notu: > CLAUDE.md'den taşındı (2026-10-14, birebir). Genel kurallar CLAUDE.md'de; bu belge motor/mekanik ayrıntısıdır. `src/engine/`, `data/skills.json`, `data/classes/`, `data/statuses.json`, `data/formulas.json`, `data/ai.json` işinden önce oku; kural metni `docs/design/combat.md`.
- Kaldırılan: Abyssal Cry / Abyssal Fury ve durum menzil eki / saldırı yükü / hasar STR eki (madde 338, 2026-10-17); Headsman's Blow `damage.executeBonus` (eksik can oranı; 0.9.10.4'te kaldırıldı, kod `spec.ts` hâlâ okur ama veri vermez).
- Eski dalga bölme: karşılaşmanın `waves` alanı yoksa `wave-split.ts > splitIntoWaves` birimleri bölerdi (önder + inert son dalgada, eşlikçiler yuva sırasıyla). Kaldırıldı; bugünkü kural takviye EKLEME: docs/design/waves.md bölüm 0.
- Eski mana kuralı: MP = 30 + 1 x INT, yenilenme round(INT x 0,165) (x2 ölçeği dönemi); bugün `formulas.json > attributes`.
