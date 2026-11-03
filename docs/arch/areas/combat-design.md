# Alan: Savaş kuralları (eski Combat Design sohbeti)

Genel savaş kuralları, durumlar, buff/debuff, tur akışı, genel denge, savaş mekanikleri.

## Agent buradan başlar
- Önce `docs/arch/battle-engine.md`, tasarım için `docs/design/combat.md`; 40 KB+ dosyadan önce `docs/arch/code-map.md`.
- Kural/denge değeri kritik iştir: `model: opus` (engine-dev).

## Kurallar
- Yeni kural, stat veya mekanik Ömer'e sorulmadan eklenmez. Denge değeri Ömer'den gelir.
- Stat tavanı yok; denge ödünleşmeyle kurulur.
- Yeni skill, durum, zemin ve pasif YZ değeri + testiyle gelir (`src/engine/ai.ts > kitPassiveValue`, ağırlıklar `data/ai.json > value.mobKit`).
- Her özellik `turns` ve `test` modunda çalışır. Sayı koda değil veriye yazılır.
- İmza mekanikleri (Omen, Dark Bond) moblara verilmez. Mob mana havuzuna dokunulmaz.
- Sim izinsiz koşulmaz. Makine yükü: tam test yalnız ready öncesi, tek seferde.

## Durum (0.9.10.26)
- **Ley Thread:** 1,5 (Ömer kararı).
- **Ward-Etcher + Last Ember YZ:** main'de. Difficulty testini 4,98 farkla kırmızıya düşürmüştü, Hard mobları 1,09 -> 1,12 ile çözüldü (Ömer 2026-11-03).
- **Ice:** Ice zemini de suyu dondurur (`grounds.json > frozen`). Hall of Silence bugünkü gibi kalır (Ömer 2026-11-03).
- **Ward farkı, yalnız değerler açık/kapalı:** Quick, comps, Endless, items aynı. Campaign 147 savaşın 55'i aynı, 76'sı farklı başlangıçlı, 90'ı olay farklı. Harita 2 ayrımı yapılmadı. Karar örnekleri: Deep Runecaller Rune Spark yerine Glyph of Breaking; Gambler skill seçimi; All In, Holy Strike, Root Smash hedefi.

## Açık işler
2. **Set bonus kuralları:** pilot kurallar motorda, bayrak kapalı (Banked Coals, Road Hound; `battle.ts > bankCoal, applyCoalTicks, spawnSetHounds`). Açık: sayıların sim ölçümü. Ayrıntı item-design-plan.md "Motor adımı".

## Tuzaklar
- Kaynak dosyalar CRLF: `\n` çapalı betikler tutmaz; tek satır çapa ya da Edit kullan.
- Golden: `npx tsx tests/golden/record.ts`. Çakışma elle çözülmez; kuyruk birleşmiş koddan yeniden üretir.
- Golden farkına değer açık/kapalı iki kayıtla bak. Eski kayıtla kıyas başka sohbetlerin farkını da katar. Bir savaşın ilk ayrılan olayı kök sebebi gösterir.
- Durdurulan test işinin vitest'i aynı log dosyasına yazmayı sürdürebilir: her koşuda yeni log adı.
- Ses testi her mob skill'ine ayrı ses ister (`data/audio-mobs.json`).

## Dosyalar
- Motor: `src/engine/battle.ts`, `stats.ts` (`dotOutgoingMult`), `mana-burn.ts`, `preview.ts`, `skill-info.ts`.
- YZ: `src/engine/ai.ts`, `ai-value.ts`, `data/ai.json`.
- Veri: `data/skills.json`, `data/statuses.json`, `data/mobs/*.json`. Metin: `src/wiki/catalog.ts`.
- Testler: `tests/dot-formula.test.ts`, `map3-advanced-casters.test.ts`, `am-thread-instinct.test.ts`, `mana-burn-rule.test.ts`.
