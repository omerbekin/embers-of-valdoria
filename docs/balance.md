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

## Ağaçlı ölçüm 2026-11-15 (r19: Rime Touch / Hexer rank başına şans)
Ne değişti: Mage 0.f3 Rime Touch %6 sabit -> %6 x rank; Hexer 2.r Rot Contagion ve 3.r Rumour Mill %5 sabit -> %5 x rank (veride `rank: 'chance'`). Denge değeri değişmedi; yalnız ölçüm.
Komut: `npx tsx src/sim/cli.ts 300 1 --tree a --level 20 --side both --only=<sınıf> --rows=<satırlar>`, ÖNCE = main 0.9.11.4, SONRA = agent/r19-bal, aynı seed 1..300. Ön ayar satırları düğümü alacak şekilde seçildi (varsayılan 1+2 bu düğümleri L30 öncesi almaz): Mage 0+1 (Rime Touch rank 5), Hexer 2+3 (Rot Contagion rank 3), Hexer 3+1 (Rumour Mill rank 3).

| Ölçüm | Ağaçsız | Ağaçlı ÖNCE | Ağaçlı SONRA | Düğüm tetiklenmesi önce -> sonra |
|---|---|---|---|---|
| Mage (satır 0+1), 113 savaş | %45,1 | %62,8 | %62,8 | Rime Touch 7 -> 26 |
| Hexer (satır 2+3), 130 savaş | %55,4 | %89,2 | %90,0 | Rot Contagion 19 -> 50 |
| Hexer (satır 3+1), 130 savaş | %55,4 | %67,7 | %67,7 | Rumour Mill 13 -> 59 |

- Mage: Rime Touch 3,7 kat sık tetiklense de 300 savaşta hiçbir sonuç dönmedi (ort. hamle 64,197 -> 64,22); etkisi bu ölçekte görünmez.
- Varsayılan satırlar (1+2; sefer / Endless vekili) bu üç düğümü L30 öncesi almaz: vekil build'leri değişikliği görmez.
- Ağaçsız referans main ile dalda birebir aynı (birleşme taban davranışı değiştirmedi). Fark 300 savaşta gürültü içinde (sınıf başına 113-130 savaş, ±8-9 puan): bant kararı bu ölçümle verilmez.
- Ağaçsız sim (`npm run sim`) bu değişikliği hiç görmez; Hexer %63,1 / Paladin %43,0 (main son ağaçsız sim) bu tabloyla kıyaslanmaz.
- Bilinen zayıf nokta: Hexer satır 2+3 ağaçla +33,8..+34,6 puan (hedef +20..+25), değişiklikten bağımsız; Ömer'e sorulacak (değer değişmedi).
- Ham çıktılar (geçici, scratchpad): `r19bal/{main,br}-{mage,hex23,hex31}.{txt,json}`.

## Sefer düğüm süresi 2026-11-15 (r19, yalnız ölçüm)
`npm run sim:campaign -- 240 1 medium good` (kasma simi, Harita 1, ağaçsız, Medium YZ + iyi oyuncu; koşuların %57,5'i duvara vurdu, bitirme %42,5). "Tur" = tek birim hamlesi (`battle.turnsTaken`, her birimin her eylemi +1, pas dahil; tam tur değil: 4'e 4'te bir tam tur kabaca 8 hamle). Düğüm ortalaması yalnız o düğümün kendi denemeleri (ilk deneme + yenilgi sonrası tekrar), devriye / kasma savaşları HARİÇ; "75+" yüzdeleri ise devriyeleri de sayar. Tüm savaş ortalaması 37,7. Seçilenler: Grave Field 42, Pilgrim Road 28, Black Cathedral (elit) 44 (savaşların %22,6'sı 75+), King's Bridge (boss) 56 (%17,5'i 75+), Siege Line 67, Gate of Cinders 71, Castle Morvane (boss) 106 (%83'ü 75+). Olay savaşları (cadı düellosu) simde oynanmaz.

## Geçici muafiyet
Sınıf bandı muafiyeti `tests/balance-checks.ts > PENDING_BALANCE` (bugün: `druid`, Ömer kararıyla sayıya dokunulmaz); skill muafiyeti `PENDING_SKILLS`. Tek doğru kaynak testin kendisidir.
