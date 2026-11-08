# Alan: Item Design (yeni item, item tipi, item dengesi, rework, affix)
> **Ne için / Güncel mi (2026-11-08):** item tasarımı alanı canlı durumu ve kararlar. evet.


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

## Kararlar (hafızadan taşındı 2026-11-08)
Tam metinler `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/` (dosya adı parantezde).
- **Silah tipleri, karar 2026-10-27** (form 6yFJY5JwVrJLyMHhXE3PFs; uygulandı, open-q 443): örtükler Sword +crit şansı (+%1,5 +0,1/ilvl), Dagger hız, Axe zırh delme %8, Mace isabet %6 more, Bow +crit hasarı (+%10 +1/ilvl), Staff %8 more Max MP, Charm MP yenilenme, Hammer Daze (%15, hedef sırası %25 geri, boss yarım; 2H x1,67). Hammer Defender + Paladin için (Warrior DEĞİL), x1,05 güç / -%2 hız; War Maul 2H çekiç. Yayılım: sword x1,00, axe x1,10/-%5, mace x1,18/-%9. 2H yakın (staff/bow değil): güç x1,15 (grip 1,45 üstüne), örtük x1,67, -%5 hız. Kişisel hız zarı ±%5. Gösterim: toplanan "+X% Stat", oransal cümle "8% more Max MP", direnç "Takes 4% less Holy damage", ipucu takanın gerçek sonucunu gösterir (doğrulanmadı). Silah tipi kuralları düşmanlara uygulanmaz; yeni moblara Daze/zırh delme bireysel pasif olarak verilebilir. Açık: 3 çekiç tabanının kendi ikonu yoktu (sonradan çizildi mi doğrula). (weapon-types-form)
- **Off-hand affix'leri sınıfa bağlı değil** (Ömer 2026-11-07: "bu offhandlere o classa özel özellik önerme. yarın bir gün farklı bir classa da bunu giyilebilir yapabiliriz"): yalnız genel kancalar; Sharpshooter, bahis, Omen, Wither vb. yok; tema item'e uyabilir. (offhand-not-class-bound)
- **Tutuş + off-hand çeşidi** (Ömer 2026-11-07: "her karakter hem 1h + 1oh hem de 2h takabilmeli. mage, vesper vs bunları es geçme", "en az 2den kastım offhand çeşidi"): her sınıfa 1H+OH ve 2H yapı; her off-hand türü en az 2 alt tip, kendi örtüğüyle; Quiver ve Focus Orb dışında yeni büyücü off-hand'leri. O gün asa sınıflarının (Mage, Druid, Undead, Vesper) off-hand'i yoktu. (grip-and-offhand-variety)
- **Eski Item Design sohbeti** (2026-11-01, kapandı): kolye yuvası YOK, yalnız Ring + Trinket; Ring yalnız Copper Ring + Pilgrim's Band; bosslar set düşürmez (elit + normal). Kararlar `docs/design/progression/item-design-plan.md`. (item-design-chat)
- Taşınan hafıza: weapon-types-form, offhand-not-class-bound, grip-and-offhand-variety, item-design-chat.
