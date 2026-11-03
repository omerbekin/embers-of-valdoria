# Alan: Karakter tasarımı ve sınıf dengesi

**Agent buradan başlar:** sınıf belgesi `docs/design/classes/<sınıf>.md`, kararlar `docs/design/open-questions.md` ("Q-NEW. Ömer'in denge kararları", "Druid: Healing Rain"), test `tests/balance-checks.ts`.

## Kurallar
- Sayı değişikliği yalnız Ömer'in seçimiyle; yeni mekanik/durum/zemin tepkisi önce sorulur, uygulanmaz.
- Başka sınıfa kendiliğinden dokunulmaz; bant dışı kayma raporlanır + öneri. Bant %44-56 (`data/balance.json`).
- Yüzde sonuçları en çok 3 ondalık. Her ölçümde tüm sınıflar birleşik gösterilir.
- Yeni skill/durum/zemin/ağaç tetiği YZ değeri + testiyle gelir.
- Makinede aynı anda tek sim; sim Ömer onayıyla. Tam test yalnız `ready` öncesi.

## Ölçüm
- `npx tsx src/sim/cli.ts <n> 1` ve `<n> 50001`; kesin ölçüm `5000 900001`, `5000 300001` (test seed'leri). Çıktılar scratchpad'e.
- Sim Quick Battle'dır, ağaçsızdır: ağaç güçlenmeleri görünmez. 300 savaşta grup farkı 5-13 puan: bu boyutta sayı kararı verme (Defender 39,6 çıktı, 5000'de 47,3). 1000 ile yön, 5000 ile karar.
- Sefer `src/sim/campaign-cli.ts 96 1 medium good`, Endless `src/sim/endless-cli.ts 96 1`.

## Durum (2026-11-03, 5000 x 2)
Druid 55,6 | Hexer 53,1 | Warrior 51,0 | Undead 50,6 | Mage 50,2 | Gambler 49,4 | Vesper 49,1 | Paladin 48,8 | Archer 48,4 | Cutthroat 48,5 | AM 48,3 | Defender 47,3

Son kararlar: Nature's Wrath 0,64 + Soaked 1 tur; Vesper iki kez +%3 (Toll 0,467, Thunderpeal 0,764, Cracked Bell 1,083, Great Bell 0,488 / 0,329; çan başına +0,025 değişmedi); Defender Armor 38, Taunt kırılma 0,30; Gambler +%5; Holy Strike 0,627; Blizzard 0,70. Her Soaked Burning'i söndürür; tüm şimşek hasarı ±%50 (`formulas.damage.elementVariance`).

## Healing Rain
İç id `rejuvenate` kalır, görünen ad Healing Rain. Tek hücre `area_any`, yalnız kendi tahtası, boş hücreye de atılır. Şifa 0,675 + `healing_rain` zemini 0,225 x 3 tur, Hallowed verir (yeni durum yok). Su sayılır (Ömer), ıslatmaz. Ağaç sürümü 3.

## Açık işler
1. **Sefer + Endless ölçüldü (96'şar, 2026-11-03):** Harita 1 bitirme %77, boss ilk deneme %48-49; Endless ortalama dalga 18,6 (hedef 17-22). Endless boss 30-50 kazanma hedefin üstünde (%50-77), ama örnek küçük (n=10-17). Sayı değişmedi.
2. **Druid muafiyeti** `PENDING_BALANCE`'ta (bir grup 56,5): görsel rework bitince 5000 ile yeniden bakılır, sayıya şimdilik dokunulmaz (Ömer).
3. **Healing Rain görseli:** tüm Druid skilleri + Treant + skilleri rework'ü Character vfx alanında. `src/game/vfx.ts` zemin rengi geçici.
4. **Healing Rain tarayıcı kontrolü:** 16:9'da hedef seçimi, zemin, ipucu, ağaç metinleri geçti, konsol hatası yok. Doğrulanmadı: zemin ipucu ve hedef seçimi 21:9 ve telefonda, şifa sayısının çıkması, ağacın üst kademeleri.

## Tuzaklar
- Spreading Roots komşulara TAM güçte zemin verir (Ömer kabul etti); güçlü görünürse bedel konuşulur. Sim bunu ölçmez.
- Zemin tikleri ilk şifa kancalarını tetiklemez (Soft Hands, Emergency Bloom, Overflowing Cup, Lifebloom).
- Kahramanlarda HoT kalmadı; HoT'a dayanan test/özellik Marsh Light'ın Fen Glimmer'ını kullanır.
- Wrath hasarı Druid'i düşürmüyor (0,58'de hasar 87 → 79, kazanma aynı): gücü Soaked süresinden geliyordu.
- `src/engine/ai-value.ts > isHealSkillGround`: Druid YZ değerini tutar, kaldırılırsa Snowfather's Roar tetiklenmez.
