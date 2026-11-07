# Alan: Item Design (yeni item, item tipi, item dengesi, rework, affix)

Agent buradan başlar: `docs/design/progression/item-design-plan.md` (kararlar + sıra; `items.md` ile çelişirse bu geçerli), veri `data/items.json`, kod `src/progression/items.ts`.

## Kurallar (Ömer onaylı)
- Affix değeri = (base + perIlvl x ilvl) x affixRules.power (1,6; noPower parçalar hariç), zar q ile ±spread (0,25), nadirlik tabanı `rollFloorByRarity`; Legendary q=1. Adım (`step`): 30. seviyede orta değeri >= 10 olan affixler tam sayı adım.
- Tavanlar `data/items.json > caps` (crit 25, accuracy 10, evasion 15 ...); yeni tavan YOK, güçlü olanın değeri/ödünleşmesi değişir.
- Silah tipi aile (`weaponFamilies`) ya da item `type`; el çizimi `data/poses.json` (weapons, familyArt, itemArt). poses/weapons değişince `python tools/pack-pose-atlases.py` (--check, --force).
- Yuvalar: weapon, offhand, helm, armor, gloves, boots, ring, trinket. Trinket Harita 2'de Reedgate'te açılır (Harita 1'de düşmez); Endless'ta baştan açık.
- Affix `minIlvl` alanı: o seviyeden önce çekilmez (Block break 21 = Harita 3). Eski örnekler etkilenmez.
- Immunity seçenekleri: slow, blinded, wound (mob taraması). DoT damage + Shield power + Potency değeri 2 kat (IP de 2 kat). Quick start 30. seviyede %30, Mana shield %16,8.
- Piercing: temel saldırı + tek hedefli skill'ler arkadakine vurur (motor Combat Design'da). Potency ayrı çarpan (`mod:potencyAdd`).
- Set kuralları (2+3+4 parça, düşüş tablosu, bonus adları): item-design-plan.md "Set kuralları". Pilotlar: Ashguard Vigil (sınıf) + Wayfarer's Oath (nötr). Veri + yazı Item Design, bonus kuralı motoru Combat Design; aynı dosyaya aynı anda girme.
- Boss set düşürmez; set Endless'ta düşmez; Temper olur, Reforge/Combine olmaz.

## Açık işler
1. Piercing 15 / 0,9 uygulandı (Lead 2026-11-03; ilvl 30, 200 seed, sefer/Endless galibiyet katkısı: Hexer +1,0 / +2,3, Warrior +1,7 / +1,6, Druid sıfır).
2. Potency ayrı ölçülmedi (DoT simi üçünü birlikte ölçtü; Hexer tek başına sıfırdan ayrışmadı).
3. Set sistemi: 2 pilot oynanabilir (`src/progression/sets.ts`, `data/items.json > setItems`), `setsEnabled` kapalı; parçalar Debug > Give pilot sets. Ayrıntı item-design-plan.md "Motor adımı". Lead 2026-11-07: altı set de veride (Kingsfall Regalia, Gallows Pact, Raven's Shroud, Conclave of Embers eklendi; 4./3. parça bonusu YALNIZ STAT, ödünleşmeli; adlı özel kurallar Unseen / Hangman's Rope / The Conclave Answers / Royal Command YAPILMADI, Ömer tasarımı bekliyor), Sadak + Focus Orb tabanları (`pairs`, imza stat'sız), Equip best set bonusunu tartar (`setBonusScore`, `setValue`). Sıradaki: Ömer'in kuralları, sim, bayrağı açma.
4. Legendary 40. seviye iki silah çifti (gamblers_last_coin, bones_of_the_quarry) 1,05 payının altında; `tests/items-data.test.ts` muaf, son denge turunda (plan adım 7) düzelt.
5. Ring yuvasında yalnız 2 item (Copper Ring, Pilgrim's Band); fazlası Ömer'in isteğine bağlı.
6. Yeni silah çizimleri oyunda gerçek ekranda gözle doğrulanmadı (16:9, 21:9, telefon): Debug > Chars > Weapon art.

## Tuzaklar
- Sim: `npm run sim:affix -- --out=<json> --seeds --jobs --env --ilvl --affixes`; Hexer taşıyıcıyı zorlamak için araçta bayrak yok (geçici kopyada `AFFIX_FORCE_MATE` + `--heroes=mate:hexer`). `--part` sonuçları bellekten döner, süreç kesilirse hepsi kaybolur; uzun simi parçalara böl. Her sim için Ömer'e önce sor.
- Sim geçici kopyası: `node_modules` junction'ını önce sil (`(Get-Item ...\node_modules -Force).Delete()`), sonra `git worktree remove --force`.
- Item/affix değişince goldenlar: `npx tsx tests/golden/record.ts`; iki kırmızı test seçim gerektirebilir (item-caps Quick start tavanı 60. seviyeye bağlı; endless-balance bandı, telafi `data/endless.json > scaling.hpPerWave`).
- Tam `vitest run` yük altında 30 sn zaman aşımı verir; düşenleri tek başına yeniden koş.
- Yeni stat/mekanik Ömer'e sorulmadan eklenmez; sayı/denge değişiminden önce Ömer sayılara bakar.
