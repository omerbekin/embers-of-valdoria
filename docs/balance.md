# Denge: bantlar ve nasıl ölçülür
> **Ne için / Güncel mi (2026-11-08):** Denge bantları, ölçüm komutları ve ayar sırası. Canlı sayı yalnız `data/balance.json` ve `data/campaign/balance.json`. Son ölçüm tablosu ve açık denge işleri yalnız `docs/arch/areas/character-design.md` (Durum, Açık işler). Tur günlüğü ve eski ölçümler (tek kişilik eğri, Harita 2 eğrisi, sefer simi 2026-10-08, denge turları, Warrior / Paladin / Skald / Anti-Mage turları): `docs/archive/design/balance-log-2026-10-11.md`.

## Bantlar (Ömer kararı 2026-10-08)
Geçerli sayı: `data/balance.json > bands`. `npm run sim` raporu, `tests/balance.test.ts` + `tests/balance-b.test.ts` (ortak kontrol `tests/balance-checks.ts`) oradan okur.
- **Class kazanma:** `bands.classWin` (4'e 4, iki seed grubunda da).
- **Skill kullanım payı:** `bands.basic` (class'ın 1. skill'i, bedelsiz), `bands.normal` (2.-3. yuva), `bands.situational` (listede `situational`: Close Ranks, Mana Barrier, Spell Ward, Jinx, Dark Bond, Resurrection). Payı Rest / Skip Turn / Move dahil tüm hamleler üzerinden. Bantlar yalnız 4'e 4.
- **Ultimate:** `bands.ultimateUsedMin` (class ortalaması); tek class `ultimateLowWarn` altındaysa test ve rapor UYARI yazar.
- **Savaş süresi:** `bands.battleTurns` (bugün 35-51 tur ortalama, 4'e 4).
- **Eşleşme:** `bands.matchup` (ezici eşleşme işareti, en az 200 savaş); eşitlik hedeflenmez. Taraf (oyuncu/düşman) %45-55.
- Yapay zeka iki tarafta Medium. Ana ölçüm 4'e 4 (`data/battles/random-battle.json > random.size`); 3'e 3 ve 5'e 5 yalnız kontrol.
- **Sefer bantları:** `data/campaign/balance.json > targets, finish` (kasma simi ana ölçüm; kasmasız sim bantları Harita 1 için 2026-11-01'de yenilendi, Harita 2 kasmasız ayarlı değil). Endless hedefi: `docs/arch/areas/character-design.md` Açık işler.

## Nasıl ölçülür
- Hızlı yön: `npx tsx src/sim/cli.ts <n> <seed>` (300: yalnız yön, grup farkı 5-13 puan; 1000: yön; 5000: karar).
- Kesin ölçüm: `5000 x 2` seed `900001` ve `300001` (test seed'leri, `balance.json > test`); tam rapor `npm run sim` (2 x 10.000, `measure`). Sefer: `npm run sim:campaign` (`src/sim/campaign-cli.ts`), Endless: `npm run sim:endless`.
- Sim Quick Battle'dır, ağaçsızdır: ağaç güçlenmeleri görünmez.
- Makinede aynı anda tek sim, Ömer onayıyla; ağır komut `node tools/agent-tag.mjs <agent> -- <komut>` ile etiketlenir (`docs/arch/sims-and-deploy.md`). Çıktı scratchpad'e.

## Değiştirme sırası
1. Ömer "X zayıf/güçlü" der: önce ölçüm raporu, sonra sayı önerisi; sayı yalnız Ömer'in seçimiyle.
2. Kaldıraç: skill gücü / MP / bekleme `data/skills.json`; sınıf statı `data/classes/<id>.json`; bant `data/balance.json`; item `data/items.json`.
3. Yeniden ölç (5000 x 2), yüzdeler en çok 3 ondalık, tüm sınıflar birleşik.
4. Belge: ölçüm ve karar `docs/arch/areas/character-design.md` Durum; sınıf kararı `docs/design/classes/<id>.md`; oyuncu satırı `data/patch-notes.json`.

## Geçici muafiyet
Sınıf bandı muafiyeti `tests/balance-checks.ts > PENDING_BALANCE` (bugün: `druid`, Ömer kararıyla sayıya dokunulmaz); skill muafiyeti `PENDING_SKILLS`. Tek doğru kaynak testin kendisidir.
