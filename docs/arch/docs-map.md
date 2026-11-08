# Belge haritası: hangi belge hangi konuya sahip

> **Ne için / Güncel mi (2026-11-08):** her konunun tek sahibi. Güncel; bugünkü temizlikte eklenenler: enemy-weapon-tags, affix-ideas-2.html, anim-review, project-layout içeriği.

Kural: bir konunun TEK sahibi vardır; başka yerde kopyalama, bağlantı ver. Kök CLAUDE.md yalnız her sohbette gereken çekirdeği tutar; klasör kuralları `src/engine/`, `src/game/`, `src/ui/`, `data/` içindeki CLAUDE.md dosyalarında. Ömer'in "unutma" dediği karar buradaki sahip belgeye yazılır (`lead.md` > Not düzeni). Eski/çelişen belgeler: `stale-docs.md`.

## docs/arch (nasıl çalışıyor / nasıl çalışılır)
| Belge | Sahip olduğu konu |
|---|---|
| workflow-rules.md | sürüm numarası, yayın kelimeleri, gönderim kuyruğu, worktree modu, agent adları/model seçimi, Ömer'in kelimeleri, denge adımı akışı, parça parça yayın |
| ui-global-rules.md | tasarım kiti, Back/Menu hiza kuralı, zemin dokunma, sürükle-bırak, üç ekran boyutu (tam metin) |
| project-layout.md | klasör yapısı |
| lead.md, areas/*.md | Lead düzeni, alan listesi (lead.md > Alanlar), alan devirleri (campaign, character-design, character-vfx, combat-design, item-design, minor-fixes [bekleyen düzeltmeler dahil], push-queue, ui-ux) |
| `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/` (depoda DEĞİL, yerel) | Lead hafızasından taşınan/birleştirilen dosyaların değiştirilmemiş kopyaları (yalnız geçmiş; güncel karar alan belgesinde) |
| battle-engine.md | savaş motoru mekanikleri, skill/status/formül/YZ verisi |
| ui-and-stage.md | sahne, viewport, ekran yapısı, HUD, performans |
| assets.md | sprite, poz, ikon, vfx, ses, müzik, yükleme ekranı |
| codex-imagegen.md | Codex ile görsel üretimi ve Terra/Sol sanat döngüsü (art-loop) |
| debug-wiki.md | debug menüsü, Codex/Wiki, Assets/Legacy |
| diagnostics.md | opt-in hata raporu, Worker /diag |
| sims-and-deploy.md > Hesap / bulut kaydı | hesap / bulut kaydı (nasıl çalışır); eski plan `docs/archive/arch/accounts-plan.md` |
| sims-and-deploy.md | simülatörler, build, kod bölme, Pages, Cloudflare |
| code-map.md | kod haritası (`npm run codemap` üretir) |
| docs-map.md, stale-docs.md | bu harita; eski belge listesi |

## docs/design (Ömer'in çerçevesi / tasarım kararları)
| Belge | Konu |
|---|---|
| vision.md | genel vizyon (onaylı 2026-11-08; eskisi archive/design/vision-2026-10-08.md) |
| combat.md, range.md | savaş kuralları (HP/ölüm reworkü dahil), menzil. Sıra sayacı mekaniği tek yerde: arch/battle-engine.md |
| affix-ideas-2.html, ../anim-review/ | affix fikir sayfası (görsel referans), animasyon inceleme panosu + kayıtlar (character-vfx.md kullanır) |
| classes.md, classes/*.md, element-class-template.md | sınıf tasarımı (13 kahraman; eskisi archive/design/classes-old.md) |
| ai-priorities.md, match-log.md, enemy-weapon-tags.md | YZ kararları, maç kaydı biçimi, düşman silah etiketleri (karar bekler) |
| ui-design-language.md, ui-reference.md | arayüz dili, parça referansı |
| art-v2.md, audio-map.md | sanat (eski görsel rehber dahil), ses, ikon, VFX |
| campaign/*.md, bosses/*.md, waves.md, tutorial.md | sefer, boss, dalga, tutorial (sıra ölçümü dahil). Her belgenin başında "Güncel mi" satırı var; uygulanmış planlar (mob-plan, maps-2-3, map2-quests-surge) karar kaydı + tarihçedir, geçerli sayı `data/` |
| progression/*.md, economy-d8-proposal.md | item, level, ilerleme, ekonomi |
| classes/skill-tree-logic.md | düğüm tasarım kuralı (CANLI sahip) |
| skill-tree-moments.md | ağaç şekli / kilit şeması (canlı) |
| skill-tree-implementation.md, skill-tree-fx-catalog.md | uygulama referansı: veri şeması, motor kancaları, fx alanları (canlı referans; faz notları tarihçe) |
| archive/design/skill-tree-{structures,mastery,mastery-v2,moments-variants}.md, skill-trees-grimdawn.md, offhand-and-skilltree-draft.md | eski öneri turları (arşiv) |
| multiplayer.md | ağ, lobi, lockstep |
| open-questions.md (+ -archive) | Ömer'e açık sorular + onay bekleyen varsayımlar (kararlar sahip belgede); arşiv: eski maddelerin tam metni (1-520) |
| future-ideas.md, future-ideas/ | "şimdilik alma" fikirleri |
| ../balance.md + data/balance.json | denge hedef bantları |

## docs/archive
Eski/uygulanmış belgeler; `docs/archive/<aynı yol>` (README orada). Güncel değil, silinmez: dialogue-replies-draft, campaign/{map3-art-status,morvane-cinematic-video}, icon prompt sayfaları (`design/art/`, `design/prompts/`), icon-redraw-plan, pose-coverage, mob-vfx-fixes, ui-consistency-audit, skill-scaling-review, balance-baseline-before-initcd, playtest-2026-10-23*, campaign/{map-1-rework,fill-plan,valdoria-2x}, future-ideas/done, pending-fixes, hp-death-rework, tutorial-order, art, arch/{accounts-plan,coordinator,chat-owners,codex-art-loop,old-claude-md-sections}, handoff/push-workflow-2026-10-29.
