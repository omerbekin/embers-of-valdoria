# Alan: Savaş kuralları (eski Combat Design sohbeti)
> **Ne için / Güncel mi (2026-11-08):** savaş kuralları alanı canlı durumu. Durum bölümü 0.9.11.x ile kontrol edildi (2026-11-08): Açık iş 2 hâlâ açık (set bayrağı kapalı, kodda duruyor), YZ ağaç düzeltmeleri hâlâ bu worktree'de, ana kola gönderilmedi.


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

## Durum (0.9.11.x)
- **Ley Thread:** 1,5 (Ömer kararı).
- **Ward-Etcher + Last Ember YZ:** main'de. Difficulty testini 4,98 farkla kırmızıya düşürmüştü, Hard mobları 1,09 -> 1,12 ile çözüldü (Ömer 2026-11-03).
- **Ice:** Ice zemini de suyu dondurur (`grounds.json > frozen`). Hall of Silence bugünkü gibi kalır (Ömer 2026-11-03).
- **YZ ağaç düzeltmeleri (2026-11-08, worktree chat-lead-tune, gönderilmedi):** `cast` tetiği artık sahibin tarafına artı (Mage 1.mb eksiydi); `statusEffectWorth` isabet/kritik cezasını sayar (tetikle gelen Shaken/Blinded); `statusPotency` (Lingering Ears, Searing Flash, Hexer) mitigation'a, `cooldownDelta/Set` (Peal of Ages) cooldown bedeline girer. Test: `tests/ai-coverage.test.ts` bölüm 10.
- **Ward farkı, yalnız değerler açık/kapalı:** Quick, comps, Endless, items aynı. Campaign 147 savaşın 55'i aynı, 76'sı farklı başlangıçlı, 90'ı olay farklı. Harita 2 ayrımı yapılmadı. Karar örnekleri: Deep Runecaller Rune Spark yerine Glyph of Breaking; Gambler skill seçimi; All In, Holy Strike, Root Smash hedefi.

## Açık işler
1. **Set bonus kuralları:** pilot kurallar motorda, bayrak kapalı (Banked Coals, Road Hound; `battle.ts > bankCoal, applyCoalTicks, spawnSetHounds`). Açık: sayıların sim ölçümü. Ayrıntı item-design-plan.md "Motor adımı".

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

## Kararlar (hafızadan taşındı 2026-11-08)
Tam metinler `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/` (dosya adı parantezde).
- **Element işi yalnız plan** (Ömer 2026-10-13: "Ben söyleyene kadar değişiklik yapma. Şu an için sadece planda kalacak"): element hâlleri vb. Ömer söyleyene kadar uygulanmaz (form cevapları future-ideas 2026-10-13 satırı + `docs/design/element-class-template.md`). Archer bu planda yok (Ömer 2026-11-01). İstisna 2026-10-25: şimşek düz HASAR elementi olarak eklendi (Will-o-Wisp Spark, Deep Runecaller Rune Spark); yeni mob planlarında şimşek düşünülür ve şimşek DURUMLARI yavaşça girer (önce az mob, basit durum; her yeni durum önce Ömer'e öneri). Şimdilik kalsın: Spark/Rune Spark eski mor VFX; mobda şimşek direnç/zayıflık yok (öneri: taş/rün bekçileri dirençli, zırhlı/metal zayıf); "Lightning damage" item affix'i bir kahraman şimşek skill'i alınca. (element-plan-only)
- **Zemin durumu kuralı** (Ömer 2026-10-29, skill aksini demedikçe tüm alan/zemin skill'leri): zemin içindeki birime durumunu verir, girişte (yürüme/itme) hemen; zeminin kendi süresi var; çıkınca ya da zemin bitince durum hemen kalkar; hasar/şifa DURUM tikinden, tur başında bir kez; yeniden kazanmak tiklemez; aynı debuff iki kez yığılmaz. Eşleme ("uygun"): Burning Ground → Burning; Chill Ground → Chilled; Ice → Slow; Flooded → Soaked; Hall of Silence → Silence; Quaking/Field of Shafts/Root Field → Slow; Poison → Poisoned (doğa tiki + %15 az şifa); Holy Fire + Sanctified Flame → Searing; Lingering Rain → Bleeding; Flooded Planks → Soaked (küçük fiziksel hasarı zemin tiki kalır); Holy Ground + Holy Water → Hallowed. (ground-status-rule)
- **Zemin tepkileri** (form 8ZQm59UR1zai7QLUHdnDn6, db zemin/main; 2026-11-01 formuyla tamamlandı): hücredeki zemin = kurulum, yeni zemin = tetik; tek tepki, tek sonuç zemini; her tarafın zemini tepkir. Zehir→Ateş patlama; Ateş→Zehir zehirli duman (1 tur Blinded); Kutsal ateş→Zehir zehir düşer, müttefik temizlenir; Zehir→Kutsal ateş kutsal güçlenir; Ateş↔Kutsal ateş = sanctified flame; Kök+ateş kökler yanar; Storm(buz)+ateş ikisi söner, su kalır; su: zehir komşu suya yayılır, kutsal ateş → kutsal su, buz suyu dondurur. Hedeflemede ÖNİZLEME + Codex tablosu; durum veren zemin tek rozet "(from <Ground>)". `data/grounds.json` + `battle.ts`, `src/game/ground-badges.ts`. (ground-reactions-form)
- **Eski Combat Design sınırı** (Ömer 2026-11-01): bu alan genel savaş kuralları, genel denge, yeni/değişen mekanikler; tek karakterin ağacı ve sayıları Character Design'da. Mob mana artışı (77 skill, `ai.scoreCost`) sim ve oyunda bakılmadan gitti; açıklar open-questions "Mob mana bedelleri". (combat-design-chat)
- Taşınan hafıza: element-plan-only, ground-status-rule, ground-reactions-form, combat-design-chat.
