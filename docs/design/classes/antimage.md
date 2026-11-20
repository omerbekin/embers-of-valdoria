> 2026-11-17: Bu sınıf Redtithe olarak yeniden tasarlandı (kararlar `docs/arch/areas/character-design.md` Açık işler 8). Eski tam hâl: `docs/design/classes/retired-classes.md`.

# Redtithe (id `antimage`)

> **Ne için / Güncel mi (2026-11-17):** Redtithe kahramanının (eski Anti-Mage; iç id `antimage` kayıt uyumu için AYNI) kimlik, kan barı, skill ve ağaç özeti. Sayılar `data/classes/antimage.json`, `data/skills.json`, `data/statuses.json`, `data/formulas.json > bloodBar` ile birebir (veri değişince burası güncellenir). Tüm sayılar PROVİZYON (sim koşulmadı). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6). Uygulama varsayımları: `docs/design/open-questions.md` > "Redtithe uygulama varsayımları".

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `antimage` / Blood Hunter |
| Ön sıra önceliği, menzil | 3.5, menzil 4 |
| Stat (STR / INT / DEX / LUCK) | 14 / 6 / 26 / 14, ana stat DEX (toplam 60) |
| Zırh / büyü zırhı | 12 / taban 0: büyü zırhı TAMAMEN kan barından (aşağıda; Ömer 2026-11-18) |
| Kaynak | `resource: blood` (MP YOK: MP 0, MP barı gizli) |
| YZ profili | `antimage` (`data/ai.json > profiles.antimage`; "shield" önceliği çıktı) |
| Pasif | **Blood Tithe** (iç id `spellbreaker_instinct`): bir düşman takıma MP'li skill atınca sıra öne kayar: advance + (bloodAdvance 0,1 + DEX x bloodAdvancePerDex 0,0045) x kan / 100 (DEX 22, bar dolu = ~%20; iki turu arasında bir kez; Ömer 2026-11-18 DEX doğrusal). Oyuncu metni formülü yazar. |

- Kan avcısı: düşmanın manasını söker, kana çevirir; kan bitince candan öder. Düşman MP harcadıkça (bar doluysa) sırası öne kayar.
- **Güçlü:** MP'li düşmana karşı (Tithe Cut kan kazandırır, Blood Brand MP bedelini artırır); bar boşaldıkça büyü zırhı ve can emme artar.
- **Zayıf:** zırh düşük; bar boşken skill bedeli candan gider; MP'siz düşmana Tithe Cut yalnız isabet kanı verir.
- Görsel / ses ŞİMDİLİK ödünç (eski Anti-Mage sprite'ı, ikonları, VFX'i, sesleri; bölüm 5).

## 2. Kan barı (`formulas.json > bloodBar`)

| Kural | Değer |
|---|---|
| Bar | 0-100, savaş başı 50; ölüm / diriltmede sıfırlanmaz, Endless dalgaları arasında taşınır |
| Kazanç | Tithe Cut: söktüğü her MP x `bloodPerMp` (2) + isabet başına `hitGain` (5); iskada 0 |
| Bar düştükçe (doğrusal, (100 - bar) / 100) | büyü zırhı = (magicArmorBase 25 + INT x magicArmorPerInt 1,5) x bu oran (Ömer 2026-11-18: kan 0'da tam, INT 10'da 40; INT 20'de 55; kan 100'de 0; eski +15 eki ve class taban 40 kalktı; item / ağaç düz büyü zırhı üstüne eklenir); skill vuruşlarında verilen hasarın %20'sine kadar can emme (DoT tikleri hariç) |
| Eksik kan | candan ödenir: 1 kan = maks canın %0,5'i (yukarı yuvarlanır); can 1'in altına inecekse skill kullanılamaz; önizleme can bedelini gösterir |
| Yok | barın düz hız / hasar bonusu |

## 3. Skill'ler

| Skill (id) | Ne yapar | Bedel / bekleme | Sayı (veri) |
|---|---|---|---|
| Tithe Cut (`mana_burn`) | Tek hedefe fiziksel DEX hasarı; isabette 7 MP söker, sökülen MP başına 2 kan + isabet başına 5 kan | 0 / yok | damage dex 0,665; manaBurn amount 7, bloodPerMp 2 |
| Blood Brand (`drain_field`) | Tek düşmana 3 tur Bleeding + 3 tur işaret. İşaretli birim class skill'i kullanınca Bleeding'i bir kez ek tik yer (süre azalmaz); MP bedelleri x1,5; Tithe Cut ve Exsanguinate ona %40 fazla vurur | 25 kan / 3 | dot bleeding dex 0,2, 3 tur; bloodBrand turns 3, costMult 1,5, ticks 1, markDamagePct 0,4 |
| Mirror Vein (`spell_ward`) = "Kan Örtüsü" (Ömer 2026-11-18) | Bütün takıma (yaşayan dostlar + kendisi) 2 tur kalkan: birim başına 6 + INT x 0,5 (Redtithe'in INT'i). Kalkan her hasarı emer; bu kalkanlardan biri bir BÜYÜ (magic hasarlı düşman skill vuruşu) emince Redtithe 2 + DEX x 0,2 kan kazanır (vuruş başına, üst sınır yok). Süre taşıyanın tur başında düşer; yeniden atınca süre yenilenir. Eski "ilk büyüyü emip Bleeding yansıtma" etkisi kalktı | 20 kan / 3 | shield scale int, flat 6, power 0,5, turns 2, onAbsorb.giveBlood { base 2, perDex 0,2 } |
| Exsanguinate (`void_strike`) | Tek hedefe fiziksel DEX hasar; en az 50 kan ister ve barın TAMAMINI harcar: hasar x (1 + harcanan / 100); hedefin eksik MP'si hasarı büyütür | tüm kan (en az 50) / 3, ilk 3 | damage dex 0,95, bonusPerMissingMana 1, bloodSpentBonus 0,01 |

Geçerli sayı: `data/skills.json` > skill id. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-antimage.test.ts`, `tests/redtithe*.test.ts`) ve bu tablo birlikte güncellenir.

## 4. Ağaç (`data/skill-trees/antimage.json`, sürüm 6)

Sürüm 5 -> 6: eski kayıtta puan taşıyan kahraman bir kez bedava respec alır; pasif (inactive) düğümde puanı olan kayıtta ağacın tamamı bedava iade edilir (`tests/redtithe-save-compat.test.ts`). Satır adları Blood Tithe, Tithe Cut, Blood Brand, Mirror Vein; ult Exsanguinate. Yeni düğüm / mekanik İCAT EDİLMEDİ: her düğüm ya yeni kite eşlendi ya da pasif bırakıldı (Ömer onayı bekler). Her eşlenen düğümün dosyada `_not` notu ve eski metni var; testleri `tests/skill-tree-fx-antimage.test.ts`.

| Düğüm | Durum |
|---|---|
| 0.f1, 0.ea, 0.ma, 0.fa, 0.v | Yalnız ad değişti (fx aynen) |
| 0.f2 | Ley Thread işareti -> Blood Brand'li hedefe +%3/rank hasar |
| 0.f3 | Blood Brand'li düşmandan -%2/rank hasar alırsın |
| 0.n0 | Brand Bleeding +1 tur |
| 0.r | Tithe Cut Blood Brand'li hedeften +1 MP/rank söker |
| 0.fb | Brand Bleeding +2 tur, Tithe Cut gücü -%20 |
| 0.eb, 0.mb | PASİF |
| 1.f1 | bloodPerMp +0,2/rank |
| 1.ea | bloodPerMp taban 2,4 |
| Satır 1'in öbürleri | Yalnız ad |
| 2.f1 | Bleeding dot gücü +%10/rank (2.f2 / 2.f3 buna bağlı olduğu için etkin) |
| 2.f2 | markDamagePct +0,05/rank |
| 2.f3 | costMult +0,05/rank |
| 2.ma | işaret +1 tur |
| 2.fb | kan bedeli -6, işaret -1 tur |
| 2.mb | yalnız metin (fx aynı: hedefin maks MP'sinin %15'i yakılır) |
| 2.n0, 2.r, 2.ea, 2.eb, 2.fa, 2.v | PASİF |
| 3.f1 | (2026-11-18) Mirror Vein kalkanları +%4/rank (düz ek ve INT payı) |
| 3.f2 | (2026-11-18) atınca canı en düşük dost %4/rank maks can iyileşir (eski: hedef dost) |
| 3.eb | Mirror Vein seni kalkanlayınca 1 tur taunt (takım skill'i: her atışta tutar) |
| 3.n0 | (2026-11-18) Mirror Vein'den önce bütün dostların debuff'ları silinir (eski: tek dost) |
| 3.fb | (2026-11-18) yalnız kendine + kalkan %30 büyük |
| 3.mb | Mirror Vein kalkanı (selfHasShield spell_ward) + taunt varken -%30 fiziksel hasar |
| 3.f3, 3.r, 3.ea, 3.ma, 3.fa, 3.v | PASİF |
| 4.d3 | Ley Thread kısmı kalktı; "sonraki tur %10 önce" kaldı |
| Satır 4'ün öbürleri | Yalnız ad |
| bar[0], bar[1] | Yalnız metin |
| bar[2] | Blood Brand tutunca takıma 1 MP |
| bar[3] Warded Steps | PASİF |
| bar[4] | Exsanguinate 2 kan daha az ister (en az 48) |

## 5. YZ notları ve ödünç varlıklar

- Terimler (`data/ai.json > value.blood`, maç kaydı `match-log.md`): `blood` (Tithe Cut kan kazancı), `bloodCost` (kan bedeli; candan ödenen kısım can bedeli ağırlığıyla), `brand` (Blood Brand: ek tikler + MP bedel artışı + işaret hasarı), `vein` (Mirror Vein, 2026-11-18: kalkanların büyü emişinden beklenen kan; dost başına en çok bir emiş, bar boşluğuyla sınırlı, gainShare ağırlığı; kalkanın kendisi genel `shield` / `save` terimlerinde). Yalnız kan barlı birim; mob / boss etkilenmez. Düşman YZ'si Mirror Vein'i öngörmez.
- Ödünç (yer tutucu): sprite `antimage`; skill ikonları manaburn, drainfield, spellward, voidstrike; pasif ikonu spellbreaker; VFX manasteal, drainfield, spellward, voidstrike; durum ikonu drop (Blood Brand); eski sesler; pose tester logosu manaburn.
- Kitten çıkan ama motorda duran (veride kullanıcısı yok) eski yollar: Ley Brand (`brand` etkisi, tainted mana, castBurn, patlama), Ley Thread, Drain Field `onEmpty`. Testleri sentetik eski veriyle korunur.

## 6. Tarihçe

Eski Anti-Mage kiti (Mana Steal, Ley Brand, Spell Ward, Void Strike; Spellbreaker's Instinct): bu dosyanın git geçmişi (2026-11-17 öncesi). Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/antimage.md`.
