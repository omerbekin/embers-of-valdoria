# Klasör yapısı

> Ne için: depo klasörlerinin kısa haritası. | Güncel mi (2026-11-08): evet, eksik klasörler eklendi (campaign, progression, wiki, net, cloud, tools, cloudflare). Kural ayrıntısı klasör `CLAUDE.md`'lerinde.

```
CLAUDE.md
docs/arch/        konu belgeleri (motor, arayüz, asset, debug/wiki, sim/yayın; dizin: docs-map.md)
docs/arch/areas/  alan devirleri (alan listesi: docs-map.md)
docs/design/      Ömer'in çerçevesi: vision, combat, classes, art, open-questions
docs/archive/     eski/uygulanmış belgeler (aynı yol)
docs/balance.md   denge hedefleri
data/             classes, skills, mobs, items, campaign, bosses, audio JSON
src/engine/       saf savaş motoru (headless)
src/game/         Phaser sahneleri, sprite/animasyon sistemi, art-v2
src/ui/           menüler, HUD, debug menüsü
src/campaign/     sefer (harita, kayıt, görev, surge)
src/progression/  item, level, loadout
src/endless/, src/tutorial/, src/wiki/ (Codex), src/gallery/
src/net/, src/cloud/, src/diag/   çevrimiçi Quick Battle, hesap/bulut kaydı, hata raporu
src/sim/          headless savaş/denge simülatörü (CLI)
assets/, public/  sprite, ses, statik dosyalar
tests/            vitest testleri
tools/            üretim/içe aktarma betikleri, push-queue, codemap
cloudflare/       Worker (signaling, hesap, diag)
.claude/agents/   özel agent tanımları (roller, model)
.claude/skills/   proje skill'leri (vfx)
.claude/launch.json  önizleme sunucuları (dev, play 5000)
public/mockups/   onaylı/taslak arayüz mockup sayfaları (Pages'te .html ile)
docs/anim-review/ animasyon inceleme panosu + kayıtlar (character-vfx kullanır)
```
