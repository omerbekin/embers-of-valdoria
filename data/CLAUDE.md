# data/ kuralları (bu klasörde çalışınca okunur)
- İçerik burada: class, skill, düşman, item, harita. Yeni class = yeni veri dosyası (+ sprite).
- Denge değişikliği = veri değişikliği; `npm run sim` raporuna dayanır, tahmine değil. Değer Ömer'in seçimiyle; sim Ömer onayıyla.
- Yüzde sonuçları en çok 3 ondalık. Denge bandı ve skill payı bantları `data/balance.json`, test `tests/balance-checks.ts`.
- Yeni stat/kaynak/kural (mekanik) Ömer'e sorulmadan eklenmez. Denge yeni sınırla değil, bedel/kazançla kurulur.
- Veri değişince `npm run test:slow`; golden gerekirse `npx tsx tests/golden/record.ts`.
- Alan kararları: `docs/arch/areas/character-design.md` (sınıf/denge), `item-design.md` (item), `campaign.md` (harita/ekonomi).

## Değer nerede (X'i değiştirmek için)
| Ne | Dosya | Test |
|---|---|---|
| Skill sayıları (güç, MP, bekleme) | `data/skills.json` | `tests/balance-checks.ts`, `npm run test:slow` |
| Sınıf stat / skill listesi | `data/classes/<sınıf>.json` | aynı |
| Skill ağacı düğümleri | `data/skill-trees/<sınıf>.json` (+ `_rules.json`) | `tests/` ağaç testleri, sim `--tree` |
| Mob / boss | `data/mobs/`, `data/bosses/` | `tests/campaign-balance.test.ts` |
| Denge bantları | `data/balance.json` | `tests/balance.test.ts` |
| Oyuncu sürüm notu | `data/patch-notes.json` (kuyruk `ready --fixes` yazar) | sürüm notu testi |
