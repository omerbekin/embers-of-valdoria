# Level / XP sistemi (Ömer kararları 2026-10-17 .. 2026-10-24)
> **Ne için / Güncel mi (2026-11-08):** Level, XP, stat puanı, düşman level'ı kuralları. Uygulandı; her sayı `data/levels.json` (Endless kısmı `data/endless.json > levels`). Eski ölçümler, eski formüller, tarihçe: `docs/archive/design/progression/levels-history.md`.

## Değiştirmek için
Sayı: `data/levels.json` (alan adları aşağıda). Kod: `src/progression/levels.ts` (saf kurallar), `src/campaign/xp.ts` (sefer), `src/endless/run.ts > waveXp`. Testler: `tests/levels.test.ts`, `tests/enemy-levels.test.ts`. Sonra `data/patch-notes.json` satırı ve `docs/arch/areas/campaign.md` Durum. Sayı kararı Ömer'in seçimiyle.

## Tavan ve eğri
- **Sefer tavanı L30** (`campaignMaxLevel`), Endless L50 (`maxLevel`). Seferde XP ve level 30'da durur.
- Sonraki level XP'si = round(`xpToNext.base` x L^`xpToNext.pow`). Düşman XP'si düşman başına `enemyXp.base` x karşılaşma seviyesi^`enemyXp.pow`, ikinci dalgadan itibaren dalga başına `waveBonus` sabit.
- Düğüm çarpanı `nodeMult`: savaş 1, elit 2, boss 4, olay ve hazine 0,5 (savaşlı olay / hazine 1). Savaşsız olay / hazine `fixedEnemies` düşmanlık XP.
- Düğüm seviyesi: bölüm başına `levelsPerChapter` (10); rampa Ashford'dan başlar (`rampStartSteps` 2: tutorial, Ashford ve ilk düğümler L1).
- Hedef: farmsız oyuncu bölüm sonunda tavanın 1-2 level altında (~L8,5 / 17 / 25,5); ölçüm denge turunda.

## XP dağılımı
- Düşman XP'si savaşa giren kahraman sayısına bölünür; düşen bölenden çıkmaz, düştükten sonraki öldürmelerin payı `fallenShare` (0,5). Tekrar ziyaret tam XP.
- **Level farkı:** kahraman düğümden `gap.fullBand` (2) level yukarıdaysa XP azalır, `gap.zeroAt` (8) farkta 0. Ceza yalnız yukarıdaki kahramana; geride kalan tam XP alır.
- **Yakalama bonusu:** takım ortalamasının altındaki kahramana level farkı başına `catchUp.perLevel` (0,25), en çok `catchUp.max` (1).
- **Sonradan katılan** kahraman takımın ortalama level'ında katılır (`joinBelow` 0, en az L1), stat puanları dağıtılmamış.

## Level ne verir
- **Stat puanı:** her level `statPoints.perLevel` (1), 5'in katlarında `bonusLevelPoints` (2). 1 puan = temel stata `statPerPoint` (1). Oyuncu Gear > Character'da dağıtır; onaylanan puan geri alınmaz. Skill puanı level başına `skillPointsPerLevel` (1).
- **Temel stat kuralı:** tek temel stat diğer üçünün toplamını aşamaz; item ve diğer kaynaklar BONUS'tur, kurala girmez.
- **Kahraman büyümesi** (`heroGrowth`): maks can level başına +%5, maks MP +%2 (seferde ve Endless'ta; Quick Battle / multiplayer L1, etkisiz). Düşman bu çarpanı almaz.
- Level atlayınca tam iyileşme (ayaktaysa; Endless'ta MP de). Dinlenme diriltmez, diriltme yalnızca Valor ve skill'ler.
- Başlangıç statları: sınıf dosyalarındaki (`data/classes/*.json`) değerler geçerlidir; en yüksek temel stat diğer üçünün toplamının en çok %80'i.
- İyileşme: sefer zafer şifası `campaign.json > rules.victoryHeal`, Endless kartı `endless.json > rewards.healRatio`.

## Item şartı
Item takma şartı = max(`levelReq.min`, ilvl - `levelReq.offset`) (`data/items.json > levelReq`). Ayrıntı `docs/design/progression/items.md`.

## Düşman level'ı
- Her düşman karşılaşmanın seviyesindedir (sefer: düğüm seviyesi, Endless: dalga numarası) ve kahramanla aynı tür stat büyümesini alır (`enemies.enabled` true; `enemies.profiles[birim id]` ile ağırlık verilebilir, bugün boş). Quick Battle / multiplayer: L1, büyüme yok.
- Puan, birimin kendi stat oranının en gerisindeki stata gider; temel stat kuralı geçerli. Can / MP / hız statlardan türer; level eki düz eklenir, `statMult` büyütmez, `hpMult` türemiş canın tamamını çarpar.
- Çift ölçek yok: `power-budget.json > activeSystems` yalnız 'item'; 'level' sistemi açılmaz.
- Ad plakasında "Lv N" (Quick Battle'da yok). Kod: `levels.ts > growthAlloc, enemyLevelAttrAdd, withEnemyLevel`, `encounters.ts > battlePlan`, `endless/waves.ts > wavePlan`.

## Endless
Her koşu L1'den başlar, dalga seviyesi = dalga numarası, level farkı cezası yok. Elit kartı Veteran's Lesson: ayaktaki her kahramana sonraki level XP'sinin `special.elite.xpRatio` (0,3) kadarı. Sayılar `data/endless.json`.
