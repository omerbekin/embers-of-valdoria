# data/ kuralları (bu klasörde çalışınca okunur)
- İçerik burada: class, skill, düşman, item, harita. Yeni class = yeni veri dosyası (+ sprite).
- Denge değişikliği = veri değişikliği; `npm run sim` raporuna dayanır, tahmine değil. Değer Ömer'in seçimiyle; sim Ömer onayıyla.
- Yüzde sonuçları en çok 3 ondalık. Denge bandı ve skill payı bantları `data/balance.json`, test `tests/balance-checks.ts`.
- Yeni stat/kaynak/kural (mekanik) Ömer'e sorulmadan eklenmez. Denge yeni sınırla değil, bedel/kazançla kurulur.
- Veri değişince `npm run test:slow`; golden gerekirse `npx tsx tests/golden/record.ts`.
- Alan kararları: `docs/arch/areas/character-design.md` (sınıf/denge), `item-design.md` (item), `campaign.md` (harita/ekonomi).
