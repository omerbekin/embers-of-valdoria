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

## Dalın durumu (`chat/combat-design`, 2026-11-02; ready verilmedi)
- **Ley Thread:** `f4a63a4a` 0,5 içerir, `8057a7e7` 1,5'e geri aldı (Ömer kararı). Dal ucunda 1,5; yeniden geri alma gerekmez.
- **Ward-Etcher + Last Ember YZ:** kod ve testler bitti, ready verilemedi: yavaş testte `tests/campaign-difficulty.test.ts` kırmızı (normal: Medium %89,0, Hard %84,1, fark 4,98, eşik 5). Sebep araştırılmadı; bu YZ işi mi main mi bilinmiyor.
- **Golden:** birleşmiş kodla yeniden kaydedildi (main'deki 0.9.10.25 dahil).
- **Ward farkı, yalnız değerler açık/kapalı:** Quick, comps, Endless, items aynı. Campaign 147 savaşın 55'i aynı, 76'sı farklı başlangıçlı, 90'ı olay farklı. Harita 2 ayrımı yapılmadı. Karar örnekleri: Deep Runecaller Rune Spark yerine Glyph of Breaking; Gambler skill seçimi; All In, Holy Strike, Root Smash hedefi.

## Açık işler
1. **Madde 469 sim bekliyor:** `castBurnPct` 0,5 ve `threadBurnMult` 1,5 "PROVİZYON, sim bekliyor" notuyla duruyor. Ömer 2026-11-02: iplik katı 1,5 kalır, 0,5 uygulanmaz.
2. **Set bonus kuralları:** başlanmadı, Item Design verisi bekleniyor. Pilotlar Ashguard Vigil + Wayfarer's Oath. Kuralları bu alan, veri ve yazıyı Item Design tarafı yapar.
3. **Piercing değeri:** ilvl 20'de değer 0,88, ip 0,1; 300 savaşlık ölçümde tek affix için güçlü çıktı. Değer ve ip sorusunu Ömer'e Koordinatör soruyordu.

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
