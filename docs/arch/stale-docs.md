# Eski / çelişen belge listesi (2026-11-07; yalnızca liste, belgeler düzenlenmedi)

Kanıt = koddaki gerçek durum. Karar Lead / Ömer'indir.

| Belge | Sorun | Kanıt |
|---|---|---|
| docs/design/classes.md | Yalnızca Warrior/Paladin/Undead + "(4. class) ?" listeler; "İlk dikey dilim için Warrior ve Paladin yeterli" der | `data/classes/` içinde 28 dosya (antimage, archer, cutthroat, defender, druid, gambler, hexer, mage, paladin...); `classes/mage.md`, `vesper.md`, `blood-warden.md` var |
| docs/design/vision.md | Başlık "TASLAK — Ömer onaylayıp düzenleyecek"; son değişiklik 2026-10-08; oyun döngüsü "taslak" | sonradan sefer, Map 2, Endless, online Quick Battle, hesap/bulut kaydı eklendi (campaign/, multiplayer.md, accounts-plan.md) |
| docs/design/art.md | "ilk iş `assets/palette.json` oluşturulur" | `assets/palette.json` YOK; son değişiklik 2026-10-04; asıl kılavuz art-v2.md |
| docs/design/open-questions.md ve open-questions-archive.md | `tools/make-class-icons.mjs`, `assets/palette.json`, `tests/gallery.test.ts` anılıyor | `tools/make-class-icons.py` var (.mjs yok); palette ve gallery testi yok |
| docs/design/icon-redraw-plan.md | `tools/make-class-icons.mjs` anıyor | dosya `.py` |
| docs/design/offhand-and-skilltree-draft.md | "TASLAK, hiçbiri onaylı değil" (2026-10-12); `data/campaign/progression.json` anıyor | dosya yok; ağaçlar sonra `data/skill-trees/` ve skill-tree-implementation.md ile yapıldı |
| docs/design/skill-trees-grimdawn.md | "ÖNERİ, ikisinden biri seçilecek" (2026-10-12) | seçim yapılmış, uygulama `data/skill-trees/`; belge karar kaydı değil öneri |
| skill-tree-mastery.md, skill-tree-mastery-v2.md, skill-tree-structures.md, skill-tree-moments.md, skill-tree-moments-variants.md | Aynı konuda çok sürüm, hangisi geçerli belli değil | 2026-10-20..22; en yeni uygulama belgesi skill-tree-implementation.md (2026-10-27) |
| docs/design/bosses/bridge-warden.md | Başlıkta "TASLAK" ama durum "UYGULANDI"; `data/classes/bridge_warden.json`, `data/audio-v2/bridge_warden.json`, `data/summons/iron_mooring.json`, `src/game/art-v2/bridge_warden/icons.ts` anıyor | dört yol da yok; boss verisi `data/bosses/bridge_warden.json` ve `data/bosses/iron_mooring.json` |
| docs/design/balance-baseline-before-initcd.md | cooldown/YZ değişikliğinden ÖNCEKİ ölçüm (2026-10-06) | tarihsel; güncel bantlar docs/balance.md |
| docs/design/progression/items.md | `tests/campaign-gear-balance.test.ts`, `tests/gear-modifiers.test.ts` anıyor | yok (tests/ altında endless-gear, fallen-gear, gear-drop, gear-skills vb. var) |
| docs/design/multiplayer.md | `src/net/signaling.ts` anıyor | yok; `src/net/` içinde session, transport, lobby-code, webrtc-link; Worker tarafı `cloudflare/src/lobby-logic.ts` |
| docs/arch/diagnostics.md | `src/diag-logic.ts` anıyor | gerçek yol `cloudflare/src/diag-logic.ts` |
| docs/arch/accounts-plan.md | Plan belgesi (2026-10-25); `cloudflare/scripts/auth-smoke.mjs` anıyor | script yok; giriş + bulut kaydı canlı (`cloudflare/src/auth.ts`, `save-logic.ts`) |
| docs/arch/coordinator.md | Tek satırlık "kapandı" notu | içerik lead.md'de; arşivlenebilir |
| docs/arch/chat-owners.md | Dosya adı eski "chat" düzeninden; içerik "Alanlar" | docs-map.md ile adı uyumsuz; yeniden adlandırma önerisi |
| docs/design/pending-fixes.md vs docs/arch/areas/minor-fixes.md | İki yerde bekleyen iş listesi | ikisi de Minor Fixes alanını anlatıyor |
| docs/handoff/push-workflow-2026-10-29.md | Eski push akışı devri | akış sonra worktree modu / push-queue v2 oldu (workflow-rules.md, areas/push-queue.md) |
| docs/design/playtest-2026-10-23.md, playtest-2026-10-23-picks.md | Tarihsel günlük | seçimler uygulandı, yalnızca kayıt |
| docs/arch/code-map.md | 80 KB, üretilmiş; son 2026-11-03 | `npm run codemap` ile yenilenmeli (kod sonra değişti) |
| docs/arch/workflow-rules.md (agent adları örneği) | `endless-dev` örnek olarak geçiyor | `.claude/agents/` altında yok (roller: art-pipeline, balance-tester, bug-hunter, campaign-dev, content-designer, engine-dev, frame-check, gate-check, multiplayer-dev, scout, text-qa, ui-dev); CLAUDE.md'den birebir taşındığı için dokunulmadı |
| docs/balance.md | Kontrol EDİLMEDİ (sayıların balance.json ile uyumu) | tests/balance.test.ts bunu zaten denetler |
