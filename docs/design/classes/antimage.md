# Anti-Mage

Sayılar: `data/classes/antimage.json`, `data/skills.json` (Ley Brand'in id'si `drain_field`), ağaç `data/skill-trees/antimage.json` (sürüm 5, "Warden's Mastery"). Çerçeve: `docs/design/classes.md`. Ağaç kuralı: `skill-tree-logic.md`. Son güncelleme 2026-11-08.

## 1. Kimlik
- **Mana Hunter**, menzil 4, ana stat INT. Statlar STR 8 / INT 26 / DEX 12 / LUCK 14. Zırh 12, büyü zırhı 40. Kadın, hançer fırlatır (savaşta hedefe koşmadan yerinden atar).
- Fikir: düşmanın büyü gücünü yakar; düşman takımı MP harcayınca tur sırası öne kayar.
- **Güçlü:** büyücü ve MP'li düşmana karşı çok güçlü; büyü zırhı yüksek; MP'siz düşmana da "tainted mana" ile hasar yazar; takımına kalkan taşır.
- **Zayıf:** zırh düşük, fiziksel hasara açık; düz hasarı sınırlı, gücü damga + yakım zincirine bağlı.
- Denge: %53,5 / %52,1 (2026-11-08), bant üstüne yakın; ek karar yok.

## 2. Skill'ler
| Skill | Ne yapar | MP / bekleme | Sayı |
|---|---|---|---|
| Mana Steal (`mana_burn`) | Tek hedefe arcane büyü hasarı, MP yakar, yakılanın yarısını sana verir, 2 tur Ley Thread bırakır | 0 / yok | INT 0,665; yakım 7 MP; kazanç %50 (Ömer 2026-11-08: 0,7 / 8 -> 0,665 / 7) |
| Ley Brand (`drain_field`) | 3x3 alandaki her düşmana 3 tur Branded. MP'siz düşman maks canının %20'si kadar tainted mana alır; MP'li düşmanın bedelleri 1,5 kat. Yakılan her MP hasar olur; süre bitince kalan tainted mana patlar | 12 / 3 | yakım hasarı ve patlama 0,49; Branded hedefe Mana Steal ve Void Strike +%40; Ley Thread'li hedefte Brand 2 tur uzun |
| Spell Ward | Dosta ya da kendine büyü kalkanı; emdiği her darbede saldıranın MP'sini yakar, buff'ını silme şansı | 12 / 3 (Ömer 2026-11-08: 4 -> 3) | kalkan INT 0,75; yakım 8 MP; silme şansı %25 |
| Void Strike (ult) | Tek hedefe büyük arcane hasar; hedefin eksik MP'si hasarı büyütür | 28 / 3, ilk bekleme 3 | INT 0,95 + eksik mana başına bonus |

## 3. Pasif ve ağaç mantığı
**Pasif Spellbreaker's Instinct (Ömer 2026-10-29, Mana Overflow'un yerine):** bir düşman Anti-Mage takımından birine MP ödediği bir skill atınca sıran %10 öne kayar; iki tur arasında en çok bir kez.

Ağaç = "yak, işaretle, hızlan". Dört satır, her biri başka bir alt-oyun:

| Satır | n0 (anahtar) | ea yönü | eb yönü | Evrim (v) |
|---|---|---|---|---|
| Spellbreaker's Instinct | Long Thread: Ley Thread +1 tur | Quickened Instinct: ek %10 öne. Ödül Ready Reflexes (Fleet). Uç Hair Trigger (+%15, büyü hasarı +%10) | Twin Thread: yandaki düşmana da iplik. Ödül Snapping Thread (iplik tüketilince INT %25). Uç Thin Thread (iplik +2 tur, Mana Steal -%20) | Spellbreaker's Fury: +%5 öne, büyü isabeti sonrası sonraki skill +%20 |
| Mana Steal | Prying Blade: hedefin bir buff'ını siler | Siphon Vein: MP kazancı %60. Ödül Drink Deep (can şifası). Uç Drained Dry (daha çok MP yakar, hasar yok) | Quickening Steal: hedef 0 MP'deyse en az MP'li dosta Haste. Ödül Tempo Thief. Uç Hurried Hands (yarım tur, 2 bekleme) | Spellsplitter: tüm buff'ları söker, her buff için +%8 hasar |
| Ley Brand | Hush of the Brand: manası 0'a inen Branded düşman 1 tur Silence | Focused Brand: merkez hücre havuzu +%50. Ödül Lasting Brand (+1 tur). Uç Narrow Brand (yalnız merkez, havuz %40, bedel 2 kat) | Wider Brand: 3x4. Ödül Searing Grasp (maks MP'nin %15'ini yakar). Uç Thin Brand (-6 MP, 1 tur kısa) | Spreading Brand: Brand bitince yandaki Brand'siz düşmana bir kez sıçrar |
| Spell Ward | Purging Ward: önce dostun tüm debuff'larını siler | Split Ward: en az MP'li dosta %25 ikinci kalkan. Ödül Second Ward. Uç Stretched Ward (tam güç, 18 MP) | Ward Taunt: kendine atınca tüm düşmanları Taunt. Ödül Bastion of Null (-%30 fiziksel). Uç Cloistered Ward (+%30, yalnız kendine) | Mirror Ward: emilen büyü darbesi %25 geri yansır |

- **Neden böyle:** Anti-Mage tek şey yapar: düşmanın mana ekonomisini bozmak. Instinct satırı tempo, Mana Steal tek hedef MP hırsızlığı, Ley Brand alan baskısı, Spell Ward takım koruması. Ea / eb "geniş mi odaklı mı", "MP mi tempo mu" sorularını sorar.
- **Ult kolları (Void Strike):** u = zayıflatma (Crippling Void, Spell Shatter, Void Shackle); r = takım ödülü (Opening for All, Shared Spoils, Feeding Frenzy); d = hız (Swift Void, Ready Blades, Threaded Void); l = buff hırsızlığı (Rallying Break, Turned Boons, Grand Theft).
- **Bar (Warden's Mastery):** 5 Ready Stance (Instinct +%3), 10 Quick Fingers (Mana Steal buff'lı düşmandan +3 MP yakar), 15 Wide Basin (Brand'lenen düşman başına takıma 1 MP), 20 Warded Steps (kalkanlı dost -%2 fiziksel), 25 Void Focus (Void Strike -2 MP).
- Her düğüm YZ değeri + testle gelir.

## 4. Ömer kararları
- **Ley Brand (Ömer 2026-10-27; open-questions-archive madde 444):**
  - 2. skill, Drain Field'ın yerine; skill id `drain_field` AYNI kaldı. Aynı 3x3 alan, menzil 4, 3 tur bekleme; hasar ve isabet zarı yok. Alandaki her düşman 3 tur Branded. (MP o gün 14'tü, veri şimdi 12.)
  - MP havuzu OLMAYAN düşman (maks MP 0) maks canının %20'si kadar tainted mana alır, dolu başlar. Harcayamaz, MP yenilenmesi almaz. Mana Steal çalar, Spell Ward yakar, Void Strike eksik manayı sayar. Brand bitince (süre, dispel, ölüm) havuz silinir.
  - MP havuzu OLAN düşmanın MP bedelleri %50 daha yüksek (yukarı yuvarlanır); mana eklenmez. MP'si 0'da duran MP'li düşman tainted mana ALMAZ.
  - Branded birimin yakılan / çalınan her MP'si, kaybedilen MP'nin %50'si kadar büyü hasarı verir (kaynak yakan; kritik ve isabet zarı yok, büyü zırhı işler). Veri şimdi 0,49.
  - Süre doğal bitince kalan tainted mana'nın %50'si damgalayandan patlar (damgalayan ölmüş olsa da). Veri şimdi 0,49.
  - Boss'lar da Branded olur (CC değil). Yeniden atış süreyi tazeler, havuzu doldurmaz.
  - Silence artık skill'de yok; ağaçta Hush of the Brand düğümüyle geri geldi.
  - Ağaç satırı sürüm 2'de bedava respec'le yazıldı (bugün sürüm 5). O günkü düğümler: Deep Taint, Searing Brand, Heavy Toll, Hush of the Brand, Bitter Burst, Focused Brand, Wider Brand, Lasting Brand, Narrow Brand, Thin Brand, Searing Grasp, Spreading Brand; bar Wide Basin. Hepsi bugünkü ağaçta durur.
- **Ömer 2026-10-29:** Branded birim MP'li skill kullanınca ek MP yanar (castBurnPct); Mana Steal ve Void Strike Branded hedefe %40 fazla vurur (markDamagePct); Mana Steal 2 tur Ley Thread bırakır, Brand iplikli hedefte 2 tur uzun sürer ve yakım 1,5 katına çıkar, iplik tüketilir. Pasif Mana Overflow'dan Spellbreaker's Instinct'e çevrildi. 2026-11-02: castBurnPct 0,5 ve threadBurnMult 1,5 kesin.
- **Spell Ward:** madde 240 (Ömer): dosta ya da kendine atılır. 2026-11-08: kalkan INT 0,75 (kalan MP payı kaldırıldı, güç INT'e kaydı).
- Görsel / ses Drain Field'ınki; durum ikonu yer tutucu; Instinct ikonu ödünç (overflow).

## 5. Açıklar
- Mana Steal veride 8 MP yakıyor; ağaç metinleri 10'u varsayıyor (Drained Dry: "15 instead of 10"). Düğüm metni ya da veri hizalanmalı.
- Ağaçta Mana Overflow düğümlerinin `inactive` temizliği kontrol edilmedi.
- Sayılar provizyon; ağaç sim ile oturmadı.
