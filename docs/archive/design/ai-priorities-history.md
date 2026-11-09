> **Ne için:** design/ai-priorities-history arşivi; güncel değil.
# YZ tercih sıralaması: eski ölçüm bölümleri (tarihçe)

> Taşındı 2026-11-08: `docs/design/ai-priorities.md` bölüm 1-5 ve 9 (2026-10-07 ölçümü, class bazlı eski davranış). Sayılar bugünkü `src/engine/ai.ts` / `ai-value.ts` ile eşleşmez; geçerli kural ve veri: `ai-priorities.md` bölüm 0, 6-8 ve `data/ai.json`.

## 1. Nasıl ölçüldü

- Geçici ölçüm betiği (scratchpad, silindi): iki taraf YZ, rastgele takımlar, `turns` modu. Her kararda `chooseAction` izi (adaylar, puanlar, öncelik adımları) okundu; ayrıca örnek kararlar `explainChoice` ile (Copy match data'daki "WHY" satırının aynısı) açıklandı.
- 5v5: 2000 savaş (seed 1-2000) + 1000 savaş ek kontrol; takım boyutu 1, 2, 3, 4, 8, 12: her biri 600 savaş (seed 5001-5600). Standart `npm run sim` 3000 savaş (seed 1) sınıf oranları için.
- Not: engine-dev aynı anda `ai.ts`/`battle.ts` üzerinde çalışıyor; ölçüm 2026-10-07 akşamki çalışma kopyasıyladır.
- "Pay" = o class'ın tüm hamleleri içinde o skill'in yüzdesi. "Override" = seçilen hamlenin net değeri, aynı turda açık olan en iyi başka hamlenin net değerinden belirgin düşük (alternatif > seçilen x 1,25 + 3).

Bağlam (standart sim, 3000 savaş 5v5): oyuncu tarafı %50,7; sınıflar Defender %55,5, Gambler %55,3, Paladin %53,6, Anti-Mage %52,8, Warrior %51,3, Cutthroat %50,9, Druid %50,1, Undead %48,3, Archer %47,0, Mage %43,6, Hexer %41,6. Mage ve Hexer'in düşüklüğünün bir kısmı aşağıdaki AI kararlarından geliyor (balans ayarından önce AI düzeltilmeli).

## 2. Mevcut YZ nasıl karar veriyor (sade)

1. Her skill ve her hedef/alan için bir **aday** üretilir; adayın beklenen hasarı, şifası, kalkanı, mana yakması, lanet (Omen/Wither) değeri, Blinded/Shrouded/Jinx koruma değeri, Dark Bond değeri ve yarım-tur (tempo) değeri hesaplanır (önizlemeyle aynı formül). Bedel düşülür (`mpCostWeight`).
2. Profilin **öncelik listesi** soldan sağa denenir; **ilk uyan öncelik kazanır**, sonrakilere bakılmaz. Öncelikler: `kill` (öldürebiliyorsa), `heal`, `revive` (heal içinde), `summon`, `shield`, `taunt`, `guard`, `burn`, `tactic` (skill'in `ai` ipucu sağlanıyorsa ve neti > 0), `aoe` (alan skill'i), `damage` (odak hedefe en iyi hasar).
3. **Odak** (`damage` önceliği): can ORANI en düşük düşman (Archer: can MİKTARI en düşük). Hasar önceliği yalnızca odak hedefe vuran adaylara bakar.
4. İpucu (`ai`) olan skill ipucu tutmuyorsa yalnızca öldürücü vuruşta seçilebilir; `reserveMp` güçlü skill için MP ayırır.
5. **Global** eylemler (Rest/Skip Turn/Move) yalnızca seçilen class hamlesi `kill` ya da işlevsel (şifa/kalkan/taunt...) değilse, değer hesabıyla denenir.

**Değer hesabına HİÇ girmeyenler** (YZ bunları "görmez"): Stun (Charge, Card Trick, Vine Snare), Slow (Tremor Slam, Bone Throw), Wound (Venom Edge, Thorn Whip; şifayı azaltır), Haste (Quick Shot), Taunt ve Guard'ın koruma değeri, çağrının değeri (yalnızca ceset yoksa), diriltmenin değeri (yalnızca dirilecek birimin maks canı, şifa önceliği içinde), Cutthroat'un Opportunist bonusunun hedef seçimine etkisi (hasar önceliği önce odağı seçer, bonus sonra hesaplanır), müttefiklerin aynı turda yapacakları.

## 3. En önemli bulgular (en kötü kararlar önce)

| # | Sorun | Ölçüm | Örnek (Copy match data "WHY") | Kök neden |
|---|---|---|---|---|
| 1 | **Öncelik zinciri daha iyi hamleyi görmüyor.** Öndeki öncelik (shield, tactic, aoe, burn) uyunca, çok daha değerli başka hamle varken onu seçiyor | Mage Mana Barrier kullanımlarının %93'ünde çok daha iyi saldırı vardı; Warrior Abyssal Cry'ın %34'ü, Undead Dark Bond'un %22'si, Anti-Mage Drain Field'ın %21'i, Hexer Jinx'in %9'u aynı durumda | seed 8 tur 17: Mage (tam can, 68/68 MP) Anti-Mage'e Mana Barrier (net 12,8); Meteor 3 düşmana 113 hasar (net 105) "not in the pool of shield". seed 1 tur 21: Warrior Abyssal Cry net 2,7; Double Strike net 24,9 | `ai.ts` pickClassOption: ilk uyan öncelik kazanır; ortak puan yok |
| 2 | **Whirlwind tek düşmana** (15 MP, Double Strike'tan zayıf) | Whirlwind'in %20'si tek hedef (5v5), 2v2'de %33; Warrior "aoe" kararlarının %44,5'inde daha iyi tek hedef saldırı vardı | seed 2 tur 40: Whirlwind 1 hedef 14,9 hasar (net 7,4) vs Double Strike 24,9 (bedava) | `aoe` önceliği "yaşayan düşman >= 3" diye bakıyor, VURULACAK düşman sayısına değil; Whirlwind yakın dövüş, yalnızca ön sırayı vurur |
| 3 | **Skeleton boşta duruyor** | Skeleton turlarının %39'u pas (5v5), 8v8'de %64; hepsi 2. sırada, hedefi yok | seed 8 tur 34: Skeleton 2. sırada, yakın dövüş skill'leri ulaşmıyor, çağrılar Move kullanamıyor | Raise Dead yuvası "en öndeki boş yuva" ama ön sıra doluysa 2. sıra; YZ değeri bunu bilmiyor |
| 4 | **Defender düşük canda Taunt/Guard** | Taunt'ların %13,8'i Defender canı < %40 iken (en düşük %10); Guard'ların %15'i Defender < %40 iken (Guard hasarın %50'sini Defender'a aktarır) | seed 39 tur 46: Defender 13/135 can, Taunt | `taunt` önceliği koşulsuz (yalnızca "taunt yoksa ve dost varsa"), `guard` Defender'ın canına bakmıyor |
| 5 | **Dark Bond değerinin şişkinliği** | Undead hamlelerinin %37'si Dark Bond (en sık skill'i); tahmini değer 15-22 can, gerçek ortalama 7,6 can / bağ; bağların %39'u Undead canı > %90 iken, %34'ü dostu > %90 iken | seed 2 tur 5: Bond (bond 21,8 + tempo 27,3) seçildi, Wail 3 düşmana 71,6 hasar (net 54,6) "not in the pool of tactic" | Değer en iyi saldırının (alan!) lifesteal'ini 3 tur sayıyor; tempo ekleniyor; tactic önceliği Wail'den önce |
| 6 | **"Öldürür" sanılan vuruşların %30'u öldürmüyor** | kill kararlarının gerçekleşme oranı %63-79 (Gambler %63, Hexer %79) | — | `aiKillMin` 0,5: %50 isabetle "öldürür" sayılıyor; ortalama hasar canı ancak geçiyorsa yarı yarıya kalıyor. kill puanı ihtimali hiç kullanmıyor |
| 7 | **Destekçiler (Paladin, Druid, Undead, Gambler, Hexer) tam canla geri çekiliyor** | Paladin Move'larının %51'i, Hexer %46, Gambler %42, Undead %32'si can > %80 iken | seed 11 tur 5: Paladin 92/92 can, Judgment (4 düşman, net 35) yerine Move | "Kırılgan" = yakın dövüş skill'i olmayan; Paladin (frontPriority 2, önde başlar) kırılgan sayılıyor; fırsat bedeli hamlenin yalnızca %50'si |
| 8 | **Paladin Resurrection'ı her şeyin önüne koyuyor** | Paladin "heal" kararlarının %45'inde çok daha iyi hamle vardı | seed 2 tur 20: Resurrection (Hexer) seçildi; Radiance 6 hedef, 63 hasar + 36 şifa (net 93) | Diriltme `heal` önceliğinin en başında, koşulsuz |
| 9 | **Kritik dost varken öldürme** | Mage, Anti-Mage, Druid, Paladin'de: dost < %30 can VE kurtaran hamle (şifa/kalkan) varken %58-62 öldürme seçildi | seed 20 tur 15: Mage, Anti-Mage dostu %10 can iken Fire Bolt ile Hexer'i öldürdü | `kill` her profilde ilk. Karar K2 ile çözülüyor (6.2) |
| 10 | **Kontrol etkileri görünmüyor** | Charge hedeflerinin yalnızca %1'i zaten sersem; ama Charge'ın sersemletme değeri hiç sayılmadığı için Charge "odak dışı" diye 44 değerli vuruş yerine Double Strike 22,7 seçiliyor (Warrior hasar kararlarının %17'si) | seed 4 tur 16: Charge -> Treant 49 (skipped: not on the focus target) | Stun/Slow/Wound/Haste değere girmiyor; hasar önceliği yalnızca odağa bakıyor |

Küçük bulgular: Archer'ın Quick Shot'ı (kendine Haste) değerlenmediği için Archer hamlelerinin %11'i Rest/Skip; Mana Steal'in %7'si MP'si 0 olan hedefe; Hexer Doom Mark'ın %64'ü hedefte 0-1 Omen varken (çoğu öldürme için); Cutthroat vuruşlarının yalnızca %24-41'i Opportunist bonuslu hedefe (bonuslu hedef varken başkasına %19-32); Smoke Bomb Cutthroat hamlelerinin %31'i (en sık skill'i).

İyi çalışanlar: Rejuvenate hiç dolu canlıya atılmadı (hedef ortalama %31 can); Radiance'ın yalnızca %4'ü dostların çoğu doluyken; Arrow Rain, Drain Field, Judgment, Withering Curse, Nature's Wrath neredeyse hiç tek hedefe atılmıyor (ipucu/şekil seçimi iyi); pahalı skill'i bedava skill de öldürebilecekken harcama %0-2; Fist Crush hep 3+ düşmanda; Guard hep en yaralı dosta.

## 4. Class bazında: skill'ler, mevcut davranış, öneri

Tablolarda "Pay" 5v5 (2000 savaş) ölçümüdür. "Ayar" sütunu: **J** = yalnızca veri (ai.json / skills.json `ai` ipucu / formulas.json), **K** = ai.ts mantık değişikliği.

### Warrior (profil aggressive: kill > tactic > aoe > damage, odak can oranı)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Double Strike | tek hedef hasar (bedava, 2 vuruş) | damage/kill | %50 | — |
| Whirlwind | alan (ön sıra), 15 MP | aoe: yaşayan düşman >= 3 ise | %26 | %20'si tek hedefe |
| Charge | arka safa hasar + Stun, 10 MP | damage/kill | %14 | Stun değersiz; yalnızca odak hedefe |
| Abyssal Cry | kendine Fortify + Berserker, 40 Rage | tactic (can sonrası >= %35, 2+ düşman, 2+ dost) | %7,5 | Net küçük olsa da saldırıyı eziyor |

Terazide beklenen sonuç (K1; sabit sıra değil, "genelde hangisi kazanır"): **öldürme** (ihtimal x hedefin kalan katkısı) > **Charge** (hasar + Stun değeri: hedefin kaçırdığı hamle; arka saftaki büyücü/okçuya en değerli) > **Whirlwind** vurulan düşmanların toplam hasarı Double Strike'ı geçtiğinde (pratikte 2+ hedef) > **Abyssal Cry** yalnızca net buff değeri en iyi saldırıdan büyükse > **Double Strike**. Fark: Whirlwind tek hedefe ve Abyssal Cry zayıf anda kendiliğinden elenir (artık öncelik sırası onları zorla seçtirmez). Ayar: K (terazi, Stun değeri); J gerekmez.

### Defender (tank: kill > taunt > guard > tactic > damage)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Tremor Slam | ön sıra alan + Slow (bedava) | damage | %24 | %61'i tek hedef (bedava, sorun değil) |
| Taunt | dostları korur + küçük kalkan | taunt: hep, sırası gelince | %30 | %14 Defender < %40 can |
| Guard | dostun hasarının %50'sini üstlenir | dost < %80 ise en yaralı | %25 | %15 Defender < %40 can; %12 arka sıradaki dosta |
| Fist Crush | 3 rastgele vuruş | tactic (3+ hedef) | %16,5 | — |

Terazide beklenen sonuç (K1, K6): **Guard** değeri = korunan dosta bu süre içinde gelecek beklenen hasarın aktarılan payı x o dostun değeri (ölümden kurtarıyorsa kurtarma değeri) - Defender'ın bu yüzden ölme riski x Defender'ın değeri. **Taunt** değeri = dostlardan Defender'a çekilen tek hedefli beklenen hasar (+ dostların hasar azaltması) - aynı risk terimi. Böylece sabit can kapısı YOK: 2 kişi kalmış, ölmek üzere olan Mage'i korumak için %10 canlı Defender kendini feda edebilir (Mage'in değeri > Defender'ın kalan değeri); ama 5 kişilik takımda, kimse tehlikede değilken %10 canla Taunt değeri negatif çıkar. **Fist Crush** 3+ düşman, **Tremor Slam** (hasar + Slow değeri) geri kalan. Ayar: K (taunt/guard değer terimleri; `taunt`/`guard` öncelikleri kalkar). J: `tank.guardBelowRatio` artık kullanılmaz.

### Archer (sniper: kill > tactic > aoe > damage, odak can MİKTARI)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Quick Shot | bedava zayıf vuruş + kendine Haste | damage | %8 | Haste değersiz -> Rest/Skip %11 |
| Piercing Arrow | şerit (column) delici, 8 MP | aoe/damage | %29 | %24 tek hedef (yarısı son düşman) |
| Arrow Rain | 3x3 alan, 16 MP | aoe | %26 | iyi (ortalama 4,5 hedef) |
| Aimed Shot | zırh delen büyük vuruş | tactic/kill, MP ayırır | %25 | %70'i öldürme; iyi |

Terazide beklenen sonuç: öldürme (Quick Shot/Piercing Arrow yetiyorsa onlar; yoksa Aimed Shot, K5) > **Arrow Rain** 3+ hedef > **Aimed Shot** zırhlı/yüksek canlı hedef (ultimate: genelde hemen kullanılır, K5) > **Piercing Arrow** 2+ hedef > **Quick Shot** (hasar + Haste tempo değeri, K8) > Rest yalnızca MP gerçekten bitikse. Archer'ın "en az can" odağı kalır (finisher kimliği; terazide küçük bir sınıf ağırlığı olarak). Ayar: K (Haste değeri); `reserveMp` korunur (J).

### Mage (caster: kill > shield > tactic > aoe > damage)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Fire Bolt | ucuz büyük tek hedef | kill/damage | %56 | — |
| Blizzard | 3x2 alan | aoe | %13 | — |
| Mana Barrier | dosta debuff silme + kalkan | shield: dost < %75 can (ya da silinecek debuff) | %24 | %93'ünde çok daha iyi saldırı vardı |
| Meteor | + şekli alan + yanan zemin | tactic (2+ hedef) | %7 | Barrier yüzünden geri kalıyor; %38'i 2 hedefe |

Terazide beklenen sonuç (K4: ana odak hasar): öldürme > **Meteor** (ultimate, genelde hemen; K5) > **Blizzard** 2+ > **Fire Bolt** > **Mana Barrier** yalnızca değeri saldırıyı geçtiğinde: kalkan değeri = dostun bu süre içinde yiyeceği ve kalkanın emeceği beklenen hasar (dostu ölümden kurtarıyorsa kurtarma değeri) + silinen debuff değeri (Stun = kaybedilecek hamle, K8) + emilen darbe başına MP. Pratikte: dost ölmek üzere ve vurulacaksa ya da Stun'lıysa Barrier; yoksa hasar. Ayar: K (`shield` önceliği kalkar, değer terimi); J: `caster` ağırlıkları (hasar 1,0). Mage'in kazanma oranı (%43,6) sonra yeniden ölçülmeli.

### Paladin (healer: kill > heal > tactic > damage; heal = önce diriltme)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Holy Strike | bedava zayıf vuruş | damage/kill | %15,5 | — |
| Resurrection | ölü dostu diriltir, 20 MP | heal önceliğinin EN başı, koşulsuz | %18 | Radiance 93 değerliyken bile önce |
| Judgment | + şekli zemin (holy fire) | tactic (2+ hedef) | %23 | — |
| Radiance | herkese: dosta şifa, düşmana hasar | heal (dost < %55) / tactic (yaralı dost < %70) | %26 | iyi (%4 boşa) |

Ayrıca Paladin hamlelerinin %18'i global: Rest %10,6, Skip %3,7, Move %4 (Move'ların yarısı tam canla geri çekilme).

Sabit sıra YOK (K3): Resurrection, Radiance, Judgment, Holy Strike ve öldürme aynı terazide; hangisinin kazanacağı ölçütlere bağlı. Ölçütler ve Ömer'in ayarlayacağı kollar 8. bölüm Soru P'de (senaryolarla). Ayar: K (diriltme değer terimi, Paladin'i "kırılgan" saymamak); J: Soru P'nin cevabına göre `ai.json` ufuk/ağırlık değerleri.

### Druid (support: kill > heal > summon > tactic > damage)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Thorn Whip | bedava vuruş + Wound | damage/kill | %30 | Wound değersiz |
| Nature's Wrath | 2x3 alan | damage (ipucu yok) | %21 | iyi (ortalama 3,5 hedef) |
| Rejuvenate | şifa + tur şifası | heal: dost < %50 | %23 | iyi (hedef ort. %31) |
| Summon Treant | 3 tur Treant, 25 MP | summon: yoksa hemen | %23,5 | 12v12'de yer yok (hiç çağrılamıyor) |

Terazide beklenen sonuç: öldürme (K2: dostu kurtarıyorsa ya da dost tehlikede değilse) > **Rejuvenate** (dost tehlikedeyse kurtarma değeri; yaralıysa şifa + tur şifası, Wound'lu dostta azalır) > **Summon Treant** (çağrının beklenen katkısı; Verdant Blessing 2026-10-20'de Nature's Grudge ile değişti, çağrıya şifa eki yok) > **Nature's Wrath** 2+ > **Thorn Whip** (hasar + Wound değeri, K8). Druid bugün de büyük ölçüde doğru; fark yalnızca ortak kurallardan. Ayar: K.

### Undead (darkmage: kill > summon > tactic > aoe > damage)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Bone Throw | bedava vuruş + Slow | kill/damage | %14 | Slow değersiz |
| Wail of the Dead | + şekli alan + zehir, bedel anlık canın %20'si | aoe (3+ düşman) | %26 | %10 tek hedefe (çoğu son düşman) |
| Dark Bond | lifesteal'i dosta kopyalar, yarım tur | tactic (2+ dost) | %37 | Değer şişkin; Wail'i eziyor; 1v1'de bile çağrısına |
| Raise Dead | Skeleton (cesetle beslenmiş) | summon: ceset varsa hemen | %16 | Skeleton'ın %39'u pas; %19 cesetsiz |

Terazide beklenen sonuç: öldürme > **Raise Dead** yalnızca Skeleton'ın vurabileceği bir yuva varsa (K7: ön sırada yer yoksa ÇAĞRILMAZ; motor değişikliğiyle ön sıradaki ölü dostun cesedinin üstü de yuva olabilir) > **Wail** 2+ hedef > **Dark Bond** (değer = Undead'in bağ süresince GERÇEKTEN çalacağı can, yani eksik canla sınırlı, x bağlanan birimin bu süre içinde alabileceği şifa; çağrıya da kurulabilir, K10: çağrının kalan ömrü ve katkısı büyükse) > **Bone Throw** (hasar + Slow). J: `darkmage.bondSelfFloor 0.15 -> 0.05`, `bondHpFloor 0.3 -> 0.1` (ölçülecek; şişkinliği azaltır). K: bağ değerinde çalınabilir can tahmini (yalnızca alan saldırısının değil, bağ süresince beklenen tüm vuruşların lifesteal'i, eksik canla sınırlı) ve tempo değerinin terazide doğru sayılması.

### Anti-Mage (antimage: kill > shield > burn > tactic > damage)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Mana Steal | bedava yakın dövüş + mana çalma | kill/damage | %36 | %7 MP'si 0 olana; 12v12'de arka sıradan hiç vuramıyor |
| Drain Field | 3x3 mana yakma | burn: 2+ düşmanın manası varsa | %31,5 | %21'inde Mana Steal çok daha iyiydi (2026-10-27: skill Ley Brand oldu, aşağıdaki not) |
| Spell Ward | dosta/kendine büyü kalkanı + MP yakma | shield: hedef <= %45 | %12 | %32'si kendine (uygun) |
| Void Strike | eksik manaya göre büyük vuruş | tactic/kill (finisher) | %20 | %94'ü öldürme: tasarıma uygun |

**Ley Brand (2026-10-27, madde 444; Drain Field'ın yerine, id `drain_field`):** aday değeri `brand` terimi (`ai.ts > brandValue`, ağırlıklar `ai.json > value.brand`): MP'siz düşmanda doğacak havuzun tahmini yakım / patlama hasarı x poolShare, MP'li düşmanda bedel artışının engellediği hamle (manaDenial) + yakım hasarı x costShare. Tazelik: Brand'siz hedef tam değer, Brand'i freshTurns (1) tur ya da daha az kalan hedef refreshShare (0,4), daha uzun kalan 0 (yeniden basmaz). Mana Steal / Spell Ward yakımının Branded hedefte vereceği hasar `damage` terimine girer.

Terazide beklenen sonuç: öldürme > **Void Strike** (ultimate, genelde hemen; K5) > **Spell Ward** (değer = dosta gelecek büyü hasarının emilen kısmı + yakılan MP'nin düşmana maliyeti + buff silme; dost tehlikedeyse kurtarma değeri) > **Drain Field** (yakılan mananın değeri: düşmanın o mana ile yapamayacağı hamleler) > **Mana Steal** (MP'si 0 olan hedefte mana değeri 0). Ayar: K (`shield` ve `burn` öncelikleri kalkar; mana yakma değeri "engellenen skill" olarak, bugünkü sabit 0,6 yerine). J: Spell Ward ipucu (`maxTargetHpRatio 0.45`) terazi gelince kaldırılabilir.

### Gambler (gambler: kill > tactic > damage)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Loaded Dice | bedava, %25 tekrar | damage/kill | %37 | — |
| High Stakes | can bahsi, büyük vuruş | damage/kill, can >= %50 kuralı | %5,5 | az; risk değeri tutarlı |
| Card Trick | 2 rastgele vuruş + rastgele durum | damage | %23 | durum değersiz |
| All In | MP bahsi, büyük vuruş | tactic (MP >= %60, savaş turu >= 10 ya da öldürme) | %22 | %76 öldürme; iyi |

Terazide beklenen sonuç: öldürme > **All In** (ultimate; beklenen değer zaten bahsi içerir, K5) > **Card Trick** (hasar + rastgele durumun beklenen değeri: Stun %20, Slow/Wound %40'ar, K8) > **Loaded Dice** > **High Stakes** (can bahsinin beklenen bedeli can değerinden düşülür; düşük canda kendiliğinden elenir). Gambler bugün de tutarlı. Ayar: K (Card Trick durum değeri); J: `minHpRatioForHpCost` terazi gelince gereksizleşir.

### Cutthroat (assassin: kill > tactic > damage)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Venom Edge | bedava yakın dövüş + Wound | damage | %10 | Wound değersiz |
| Saltire Cut | X alan, merkez 2 vuruş | tactic (2+ hedef) | %32 | %9 tek hedef (öldürme için) |
| Smoke Bomb | düşmana Blinded / dosta Shrouded | tactic (2+ hedef / 2+ dost) | %31 | En sık skill; %94 düşman tarafına |
| Backstab | arkası boş hedefe garantili kritik | kill/tactic | %15 | %94,5 öldürme; iyi |

Terazide beklenen sonuç: öldürme (Backstab arka saf/değerli hedefe; Venom Edge yetiyorsa o, K5) > **Backstab** (ultimate, genelde hemen) > **Saltire Cut** 2+ hedef > **Smoke Bomb** (Blinded/Shrouded değeri zaten hesaplanıyor; terazide saldırıyla yarışınca payı düşmeli) > **Venom Edge** (hasar + Wound değeri). Hedef seçiminde Opportunist bonuslu (dostların Wound/Slow/Stun/Wither'ı) hedefler adaydır (odak tek hedef değil). Ayar: K.

### Hexer (hexer: kill > tactic > aoe > damage)

| Skill | Amaç | Mevcut YZ | Pay | Sorun |
|---|---|---|---|---|
| Evil Eye | bedava + 1 Omen | damage/kill | %27 | %30'u yığını 3'e tamamlıyor (iyi) |
| Withering Curse | 2x3 alan + Wither + Omen | tactic (2+ hedef) | %38 | ortalama 4 hedef; iyi |
| Jinx | Jinxed (isabet -%20, kritik yok) + Omen | tactic (önlenen hasar >= 6) | %17 | %9'unda Evil Eye çok daha iyiydi |
| Doom Mark | Omen'leri x1,5 patlatır | kill / 2+ Omen | %13 | %64'ü 0-1 Omen'de (çoğu öldürme) |

Terazide beklenen sonuç: öldürme (Evil Eye/Jinx yetiyorsa onlar; Doom Mark yalnızca başka skill öldüremiyorsa, K5) > **Doom Mark** (ultimate; 2+ Omen'li hedefte en değerli, ama genelde hemen kullanılır) > **Withering Curse** (vurulanların toplamı; Wither tikleri ve Omen değeri dahil) > **Evil Eye** yığını tamamlıyorsa > **Jinx** (Jinxed değeri: büyük vurucunun bir sonraki saldırısı) > **Evil Eye**. Ayar: K. `withering_curse.ai.requires.minTargets` terazi gelince gereksizleşir (takım boyutundan bağımsız çalışır).

### Çağrılar

| Birim | Ölçüm | Öneri |
|---|---|---|
| Skeleton | %39 pas (8v8: %64), hep 2. sırada | K7 (6.9). K: Raise Dead değerinde "bu yuvadan vurabilir mi" |
| Treant | Vine Snare %52; %22'sinde Root Smash belirgin iyiydi | Vine Snare'in Stun şansı değersiz sayılıyor; K8 ile çözülür |

## 5. Takım kompozisyonları ve takım arkadaşı farkındalığı

| Konu | Mevcut YZ | Ölçüm | Öneri |
|---|---|---|---|
| Odak ateşi (focus fire) | Herkes can ORANI en düşüğe vurur (Archer: can miktarı). Ortak bir "hedef" yok ama kural aynı olduğu için kendiliğinden toplanıyor | kill kararları %70 gerçekleşiyor | Eşitlikte tehdit (iyileştirici/büyücü) öne; Wither/Doom/yanan zeminle zaten ölecek hedefe fazladan vurmamak (K, düşük öncelik) |
| Opportunist (Cutthroat) | Dostun Wound/Slow/Stun/Wither'ını hedef seçiminde kullanmıyor (odak önce seçiliyor) | Cutthroat vuruşlarının %24-41'i bonuslu hedefe; bonuslu hedef varken başkasına %19-32 | K: hasar önceliğinde odak tek hedef değil, "odak + bonuslu hedefler" arasında en iyi beklenen hasar |
| Guard kimi korur | En yaralı (< %80) dost; Defender'ın kendi canı ve dostun vurulup vurulmayacağı hesapta yok | %12 arka sıradakine; %15 Defender < %40 | J: eşik 0,6 + Defender can kapısı; K: düşman odağındaki/ön sıradaki dost |
| Taunt | Her fırsatta | Defender hamlelerinin %30'u | J: can kapısı; K: düşmanda tek hedefli tehdit yoksa (alan ağırlıklı düşman) Taunt'ın değeri düşük |
| Şifacı önceliği | kill > heal (Paladin heal < %55, Druid < %50); diriltme koşulsuz ilk | kritik dost varken %58-62 öldürme | K2 (6.2), Soru P |
| Dark Bond ortağı | En yüksek bağ değeri (eksik cana göre); eşitlikte listede ilk | %34 dolu canlı dosta | K: vurulacak/ön sıradaki dost; çağrıya değil |
| Spell Ward hedefi | Can <= %45 olan dost | %68 dosta | J: büyü saldırganı koşulu (`minFoeMagicMp`) eklenebilir |
| 2 tank + şifacı | Defender+Paladin çifti +%4,7 sinerji (en güçlü çiftlerden) | — | AI ile uyumlu; değişiklik gerekmez |
| Saf hasar (şifacısız ve Defender'sız takım) | — | %45,1 kazanma | Beklenen; AI sorunu değil |
| Çağrıcı ağırlıklı (Druid + Undead) | Skeleton pası, 12v12'de yer yok | çağrıcısız %52,1, 1 çağrıcı %48,9, 2 çağrıcı %50,2 | Skeleton sorunu çözülünce yeniden ölç |
| Hexer'li çiftler | — | Hexer+Mage, Hexer+Archer, Hexer+Druid -%5 (alan hasarı Omen'leri dolmadan öldürüyor olabilir) | Balans turunda incelenecek (AI değil, mekanik etkileşim) |

### Takım boyutu (1-12) etkisi

| Boyut | Önemli farklar |
|---|---|
| 1v1 | Defender %100 Tremor Slam (Taunt/Guard anlamsız: doğru). Paladin/Defender savaşları çok uzun (5 berabere / 600). Undead hamlelerinin %32'si Dark Bond, tek dostu kendi Skeleton'ı. Wail %80 tek hedef (can bedeli boşa). Archer %12 Skip. Raise Dead %100 cesetsiz |
| 2v2 | Whirlwind ve Saltire Cut %33 tek hedef; Mage Barrier %58 kendine; Raise Dead %74 cesetsiz; Spell Ward %62 kendine |
| 3v3-4v4 | Skeleton pası %25-28; diğerleri 5v5'e benzer |
| 8v8 | Skeleton pası %64; Paladin Rest+Skip %20 |
| 12v12 | Tahta dolu: Summon Treant ve Raise Dead hiç kullanılamıyor; Anti-Mage Mana Steal %0,2 (arka sıradan vuramıyor), Anti-Mage Skip %7; Paladin Rest %16 + Skip %10; Undead Skip %9 |

Seferde (1-4 kişilik takımlar) en çok etkilenecekler: Undead (çağrısına bağ, cesetsiz Skeleton), Defender (1-2 kişide Taunt/Guard değersiz: zaten doğru), alan skill'leri (az düşmanda tek hedef). Öneri: alan ve bağ kuralları "vurulan / gerçek dost" sayısına göre olmalı (K), sabit eşikler küçük takımda doğru çalışmıyor.


## 9. Ek: ölçüm sayıları (5v5, 2000 savaş)

| Ölçüm | Değer |
|---|---|
| Alan skill'i tek düşmana | Whirlwind %20 (son düşman değil), Tremor Slam %61 (bedava), Piercing Arrow %24 (yarısı son düşman), Wail %10 (2/3'ü son düşman), Saltire Cut %9, diğerleri < %1 |
| Ortalama vurulan düşman | Arrow Rain 4,5; Drain Field 4,6; Withering Curse 4,0; Fist Crush (yaşayan) 4,3; Nature's Wrath 3,5; Blizzard 3,4; Judgment 3,2; Wail 2,9; Meteor 2,8; Saltire Cut 2,6; Whirlwind 2,2; Piercing Arrow 2,0 |
| kill kararının gerçekleşmesi | Anti-Mage %72, Archer %71, Cutthroat %68, Defender %67, Druid %71, Gambler %63, Hexer %79, Mage %71, Paladin %67, Undead %69, Warrior %68 |
| Global eylem payı | Archer Rest %8,9 + Skip %2,5; Paladin Rest %10,6 + Skip %3,7 + Move %4; Gambler Rest %8,2 + Move %3; Cutthroat Rest %6,4 + Skip %4,5; Undead Skip %3,6 + Move %2,8; Defender Move %3,7 |
| Pas (hiçbir şey yapamadı) | Skeleton %39; diğer class'lar < %0,3 |
| Raise Dead cesetsiz | %19 (5v5), %74 (2v2), %100 (1v1) |
| Spell Ward kendine | %32 (hedef ortalama %29 can) |
| Mana Barrier kendine | %16; silinecek debuff varken %56 |
| Doom Mark öncesi Omen | 0: %31, 1: %33, 2: %36 |
| Treant çağrısı | Druid'in ilk turunda (savaş turu 3-5) |
| All In | ortalama savaş turu 29, %76 öldürme |
