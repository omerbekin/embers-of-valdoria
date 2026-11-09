# Belge haritası: hangi belge hangi konuya sahip

> **Ne için / Güncel mi (2026-11-08):** her konunun tek sahibi. Güncel.

Kural: bir konunun TEK sahibi vardır; başka yerde kopyalama, bağlantı ver. Kök CLAUDE.md yalnız her sohbette gereken çekirdeği tutar; klasör kuralları `src/engine/`, `src/game/`, `src/ui/`, `data/` içindeki CLAUDE.md dosyalarında. Ömer'in "unutma" dediği karar buradaki sahip belgeye yazılır (`lead.md` > Not düzeni). Eski/çelişen belgeler: `stale-docs.md`.

## docs/arch (nasıl çalışıyor / nasıl çalışılır)
| Belge | Sahip olduğu konu |
|---|---|
| workflow-rules.md | sürüm numarası kuralı, agent adları/model seçimi, Ömer'in kelimeleri (gönderim akışı DEĞİL: areas/push-queue.md) |
| ui-global-rules.md | UI kuralının TEK sahibi: tasarım kiti, Back/Menu hiza, zemin dokunma, sürükle-bırak, üç ekran boyutu (ui-and-stage, src/ui/CLAUDE.md, ui-ux.md yalnız bağlantı verir) |
| project-layout.md | klasör yapısı |
| lead.md | Lead düzeni: yetki, kurallar, agent brief |
| areas/push-queue.md | gönderim akışının TEK sahibi: "GitHub'a at / canlıya al", kuyruk komutları, sürüm notu, worktree modu, kuyruk sağlamlığı |
| `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/` (depoda DEĞİL, yerel) | Lead hafızasından taşınan/birleştirilen dosyaların değiştirilmemiş kopyaları (yalnız geçmiş; güncel karar alan belgesinde) |
| battle-engine.md | motor mekaniği + Değişiklik reçetesi (skill/status/formül/YZ verisi); oyun kuralı combat.md'de |
| battle-engine-mobs-maps.md | motor tarafı: mob pasifleri, Harita 2-3 karşılaşma kuralları, Harita 3 kancaları, set kuralları |
| ui-and-stage.md | sahne, viewport, ekran yapısı, HUD, performans |
| assets.md | sprite, poz, ikon, vfx, ses, müzik, yükleme ekranı |
| codex-imagegen.md | Codex ile görsel üretimi ve Terra/Sol sanat döngüsü (art-loop) |
| debug-wiki.md | debug menüsü, Codex/Wiki, Assets/Legacy |
| diagnostics.md | opt-in hata raporu, Worker /diag |
| sims-and-deploy.md | simülatörler, build, kod kesme, test ayrımı, Pages, Cloudflare; hesap / bulut kaydı (nasıl çalışır; eski plan `docs/archive/arch/accounts-plan.md`) |
| code-map.md | kod haritası (`npm run codemap` üretir) |
| ../../assets/CREDITS.md | asset/üçüncü taraf kaynak ve lisans künyesi |
| ../../cloudflare/README.md | Cloudflare Worker (diag, vb.) kurulum notu |
| docs-map.md, stale-docs.md | bu harita; eski belge listesi |

## Alan belgeleri (docs/arch/areas/; alan = eski sohbet adı; iş alana göre agente gider)
| Alan | Dosya | Kapsam |
|---|---|---|
| Character Design | areas/character-design.md | karakter tasarımı, tek karakterin yetenek ağacı ve sayıları, sınıf dengesi |
| Campaign | areas/campaign.md | sefer, Harita 2-3, kasabalar |
| Character vfx | areas/character-vfx.md | karakter efektleri |
| Item Design | areas/item-design.md | yeni itemler, item türleri, item dengesi ve reworkleri, affixler |
| Minor Fixes | areas/minor-fixes.md | küçük ve sahipsiz işler, bekleyen düzeltmeler |
| Combat Design | areas/combat-design.md | genel savaş kuralları: etkiler, durumlar, buff/debufflar, turlar, genel denge |
| UI-UX Design | areas/ui-ux.md | mevcut arayüzlerin elden geçirilmesi, yeni arayüz, kullanıcı deneyimi |
| Gönderim | areas/push-queue.md | gönderim kuyruğu ve yayın |

## docs/design (Ömer'in çerçevesi / tasarım kararları)
| Belge | Konu |
|---|---|
| vision.md | genel vizyon (onaylı 2026-11-08; eskisi archive/design/vision-2026-10-08.md) |
| combat.md, range.md | oyun kuralı: savaş (HP/ölüm reworkü dahil), menzil; motor mekaniği arch/battle-engine.md'de (sıra sayacı da orada). Arşiv: `archive/design/{combat-x2-stat-scale,combat-hp-death-rework-table,range-history,waves-history,ai-priorities-plan-and-questions,multiplayer-quota}.md`, `archive/arch/battle-engine-history.md` |
| affix-ideas-2.html, ../anim-review/ | affix fikir sayfası (görsel referans), animasyon inceleme panosu + kayıtlar (character-vfx.md kullanır) |
| classes.md, classes/*.md (gambler.md dahil), element-class-template.md | sınıf tasarımı (13 kahraman; eskisi archive/design/classes-old.md; eski sınıf belgeleri `archive/design/classes/`). Blood Warden = future-ideas/blood-warden*.md |
| ai-priorities.md, match-log.md, enemy-weapon-tags.md | YZ kararları, maç kaydı biçimi, düşman silah etiketleri (karar bekler) |
| ui-design-language.md, ui-reference.md | arayüz dili, parça referansı |
| art-v2.md, audio-map.md | sanat (eski görsel rehber dahil), ses, ikon, VFX |
| campaign/*.md, bosses/*.md, waves.md, tutorial.md | sefer, boss, dalga, tutorial. campaign.md = geçerli kurallar; maps-2-3 / mob-plan / map2-quests-surge = kısa özet, tarihçe `archive/design/campaign/`; silver-stag-arc `future-ideas/`; tutorial sıra ölçümü `archive/design/tutorial-order.md`. Geçerli sayı `data/` |
| progression/ (items, item-design-plan, levels, character-tiers) | item, level, ilerleme. Arşiv: `archive/design/progression/` (item-effects, roadmap, tarihçeler), `archive/design/economy-d8-proposal.md` |
| classes/skill-tree-logic.md | düğüm tasarım kuralı (CANLI sahip) |
| skill-tree-moments.md | ağaç şekli / kilit şeması (canlı) |
| skill-tree-implementation.md | veri şeması / kural modülü / kayıt / motor |
| skill-tree-fx-reference.md | fx sözlüğü + "yeni düğüm ekleme" adımları |
| archive/design/skill-tree-{implementation,fx-catalog,moments-mockup-notes,structures,mastery,mastery-v2,moments-variants}.md, skill-trees-grimdawn.md, offhand-and-skilltree-draft.md | eski öneri turları (arşiv) |
| multiplayer.md | ağ, lobi, lockstep |
| open-questions.md (+ `docs/archive/design/open-questions-archive.md`) | Ömer'e açık sorular + onay bekleyen varsayımlar (kararlar sahip belgede); arşiv: eski maddelerin tam metni (1-520) |
| future-ideas.md, future-ideas/ | "şimdilik alma" fikirleri |
| ../balance.md + data/balance.json | denge hedef bantları |

## docs/archive
Eski/uygulanmış belgeler; `docs/archive/<aynı yol>` (README orada). Güncel değil, silinmez: dialogue-replies-draft, campaign/{map3-art-status,morvane-cinematic-video}, icon prompt sayfaları (eski `design/art/`, `design/prompts/` klasörleri silindi), icon-redraw-plan, pose-coverage, mob-vfx-fixes, ui-consistency-audit, skill-scaling-review, balance-baseline-before-initcd, playtest-2026-10-23*, campaign/{map-1-rework,fill-plan,valdoria-2x}, future-ideas/done, pending-fixes, hp-death-rework, tutorial-order, art, arch/{accounts-plan,coordinator,chat-owners,codex-art-loop,old-claude-md-sections}, handoff/push-workflow-2026-10-29.
