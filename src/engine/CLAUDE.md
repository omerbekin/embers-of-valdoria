# src/engine kuralları (bu klasörde çalışınca okunur)
- Saf TypeScript: Phaser, DOM, `window` yok; Node'da headless çalışır (`npm test` motor saflığı denetimi yapar).
- Seed'li RNG; `Math.random` yasak. Aynı seed + girdi = birebir aynı savaş.
- **İki savaş modu** (`turns` + debug'dan `test`): her yeni savaş özelliği ikisinde de bozulmamalı (`docs/arch/battle-engine.md`).
- Her motor değişikliği testle gelir. Yeni skill/durum/zemin/ağaç tetiği YZ değeri + testiyle gelir.
- Sayıları koda gömme; `data/` dosyasına koy.
- Yeni mekanik/özel kural/pasif eklenince Mechanics metni güncel mi bak (`src/wiki/catalog.ts`, `tests/wiki.test.ts`).
- Mekanik ayrıntı: `docs/arch/battle-engine.md`; yeni mekanik/stat/kural Ömer'e sorulmadan eklenmez.
