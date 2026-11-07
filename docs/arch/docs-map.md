# Belge haritası: hangi belge hangi konuya sahip

Kural: bir konunun TEK sahibi vardır; başka yerde kopyalama, bağlantı ver. CLAUDE.md yalnızca kural + işaretçi tutar. Eski/çelişen belgeler: `stale-docs.md`.

## docs/arch (nasıl çalışıyor / nasıl çalışılır)
| Belge | Sahip olduğu konu |
|---|---|
| workflow-rules.md | sürüm numarası, yayın kelimeleri, gönderim kuyruğu, worktree modu, agent adları/model seçimi, Ömer'in kelimeleri, denge adımı akışı, parça parça yayın |
| ui-global-rules.md | tasarım kiti, Back/Menu hiza kuralı, zemin dokunma, sürükle-bırak, üç ekran boyutu (tam metin) |
| project-layout.md | klasör yapısı |
| lead.md, chat-owners.md, areas/*.md | Lead düzeni, alan listesi, alan devirleri (campaign, character-design, character-vfx, combat-design, item-design, minor-fixes, push-queue, ui-ux) |
| coordinator.md | kapandı; yalnızca Lead'e yönlendirme |
| battle-engine.md | savaş motoru mekanikleri, skill/status/formül/YZ verisi |
| ui-and-stage.md | sahne, viewport, ekran yapısı, HUD, performans |
| assets.md | sprite, poz, ikon, vfx, ses, müzik, yükleme ekranı |
| codex-imagegen.md, codex-art-loop.md | Codex ile görsel üretimi ve sanat döngüsü |
| debug-wiki.md | debug menüsü, Codex/Wiki, Assets/Legacy |
| diagnostics.md | opt-in hata raporu, Worker /diag |
| accounts-plan.md | hesap / bulut kaydı |
| sims-and-deploy.md | simülatörler, build, kod bölme, Pages, Cloudflare |
| code-map.md | kod haritası (`npm run codemap` üretir) |
| docs-map.md, stale-docs.md | bu harita; eski belge listesi |

## docs/design (Ömer'in çerçevesi / tasarım kararları)
| Belge | Konu |
|---|---|
| vision.md | genel vizyon |
| combat.md, range.md, hp-death-rework.md | savaş kuralları, menzil, HP/ölüm |
| classes.md, classes/*.md, element-class-template.md | sınıf tasarımı |
| ai-priorities.md, match-log.md | YZ kararları, maç kaydı biçimi |
| ui-design-language.md, ui-reference.md, ui-consistency-audit.md | arayüz dili, parça referansı, tutarlılık |
| art.md, art-v2.md, audio-map.md, icon-redraw-plan.md, pose-coverage.md, mob-vfx-fixes.md | sanat, ses, ikon, poz, VFX |
| campaign/*.md, bosses/*.md, waves.md, tutorial.md, tutorial-order.md | sefer, boss, dalga, tutorial |
| progression/*.md, economy-d8-proposal.md | item, level, ilerleme, ekonomi |
| skill-tree-*.md, skill-trees-grimdawn.md, offhand-and-skilltree-draft.md, skill-scaling-review.md | skill ağacı tasarımı / önerileri |
| multiplayer.md | ağ, lobi, lockstep |
| open-questions.md (+ -archive) | karar günlüğü (varsayımlar) |
| future-ideas.md, future-ideas/ | "şimdilik alma" fikirleri |
| pending-fixes.md, playtest-*.md | bekleyen düzeltmeler, playtest günlükleri |
| balance-baseline-before-initcd.md | eski denge ölçümü (tarihsel) |
| ../balance.md + data/balance.json | denge hedef bantları |

## Eski CLAUDE.md konu dizini (birebir, 'ne zaman oku' sütunuyla)

| Konu | Belge | Ne zaman oku |
|---|---|---|
| Savaş motoru, mekanikler | `docs/arch/battle-engine.md` | `src/engine`, skill/class/status/formula/AI verisi, çağrı, ceset, AOE, Rage/mana, kurulum seçenekleri |
| Savaş kuralları (tasarım) | `docs/design/combat.md` | hasar/AOE/durum kuralının ne olması gerektiği |
| Arayüz, sahne, ekran yapısı | `docs/arch/ui-and-stage.md` | herhangi bir ekran, pencere, HUD, menü, viewport, tam ekran, performans |
| Arayüz tasarım dili | `docs/design/ui-design-language.md` | yeni arayüz / mockup öncesi (ZORUNLU) |
| Arayüz parçaları referansı | `docs/design/ui-reference.md` | yeni ekran/pencere yazmadan önce (ZORUNLU) |
| Ekran tutarlılık denetimi | `docs/design/ui-consistency-audit.md` | ortak ekran yapısı, bekleyen tutarlılık işleri |
| Asset, sanat, ses, müzik | `docs/arch/assets.md` | sprite, poz, ikon (boyalı/v1/v2), vfx, ses, müzik, valor görseli, yükleme ekranı |
| Codex ile görsel üretimi | `docs/arch/codex-imagegen.md` | ChatGPT görselini tarayıcısız üretme (`tools/codex/`) |
| Sanat kılavuzları | `docs/design/art.md`, `docs/design/art-v2.md`, `docs/design/audio-map.md` | piksel art paleti, v2 yeniden tasarım, ses listesi |
| Debug menüsü, Codex/Wiki | `docs/arch/debug-wiki.md` | debug aracı ekleme, Codex/Wiki içeriği, Assets/Legacy |
| Simülatörler, build, yayın | `docs/arch/sims-and-deploy.md` | denge simi, kod bölme/yeni sahne, GitHub Pages, Cloudflare |
| Hata raporu (opt-in tanılama) | `docs/arch/diagnostics.md` | çökme/hata izi (`logEvent`), Settings > Privacy, Worker /diag, `npm run diag:pull` |
| Denge hedefleri | `docs/balance.md`, `data/balance.json` | sınıf/skill dengesi |
| Sefer (campaign) | `docs/design/campaign/campaign.md`, `docs/design/campaign/fill-plan.md` | sefer haritası, düğümler, karşılaşmalar |
| Item, ilerleme, Endless | `docs/design/progression/items.md`, `item-effects.md`, `roadmap.md` | item, ödül, Endless, ilerleme |
| Sınıflar | `docs/design/classes.md`, `docs/design/classes/hexer.md` | sınıf tasarımı |
| Yapay zeka öncelikleri | `docs/design/ai-priorities.md`, `docs/design/match-log.md` | YZ kararları, maç kaydı |
| Multiplayer | `docs/design/multiplayer.md` | ağ, lobi, lockstep |
| Tutorial | `docs/design/tutorial.md` | sefer tutorial'ı |
| Menzil sistemi | `docs/design/range.md` | hedefleme, menzil değerleri, dizilim yapay zekası (`range.enabled` bayrağı) |
| Level / XP | `docs/design/progression/levels.md` | XP, level, stat puanı ve başlangıç stat kuralı, düşman level'ı |
| Açık sorular / karar günlüğü | `docs/design/open-questions.md` (madde 330+; 1-329 `open-questions-archive.md`, aramada hariç) | varsayım eklerken (sıradaki numarayla; worktree sohbetinde `## Q-NEW. Başlık`) |
| Gelecek fikirleri | `docs/design/future-ideas.md` | "şimdilik alma" fikirleri |
| Kod haritası (büyük dosyalar) | `docs/arch/code-map.md` | 40 KB+ bir src dosyasını okumadan önce; kod yapısı değişince `npm run codemap` |
