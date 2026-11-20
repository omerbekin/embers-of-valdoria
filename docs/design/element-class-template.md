# Element / hal sistemi — sınıf şablonu (taslak)
> **Ne için / Güncel mi (2026-11-08):** Element / hal sistemi ve sınıf şablonu. Yalnız PLAN (Ömer 2026-10-13: "ben söyleyene kadar değişiklik yapma"). Oyuna yalnız lightning hasar türü girdi (bölüm 1); haller, etkileşim tablosu ve sınıf şablonları uygulanmadı. Durum: `docs/arch/areas/combat-design.md`. §5 kit adları 2026-11-08 itibarıyla bugünkü kitlere göre güncellendi.

> Durum: **TASARIM TASLAĞI, uygulanmadı.** Kaynak: `future-ideas.md` “Element ve hal sistemi” (2026-10-10) ve “Ömer’in yön kararları” (2026-10-11) satırları. Ömer’in kararları **Karar**, önceki taslakta sunulmuş ama tek tek onaylanmamış maddeler **Taslak**, bu belgede ilk kez önerilenler **[ÖNERİ]** olarak işaretli. Yeni mekanikler yalnızca öneridir; Ömer “evet” demeden uygulanmaz. Sayılar yok; önce kurallar netleşecek.

## 1. Kesinleşen kararlar

- Sistem, maddenin hallerine ve fiziksel mantığa dayanır; soyut “işaret + bonus” kuralları yok (ilk taslak reddedildi, Ömer 2026-10-10). Örnek: “fiziksel Charge donmuş düşmanın stun’ını uzatır” gibi keyfi kural OLMAZ.
- Elektrik kesin dahil (Ömer 2026-10-10).
- **2026-10-25: lightning hasar türü oyuna girdi (yalnız hasar; haller hâlâ plan). Yeni mob planlamalarında lightning de kullanılacak.** Veride `element: "lightning"` (renk soluk mavi-beyaz `#c6dbff`, ikon kodla çizilen şimşek `bolt`); ilk kullanıcılar mob yetenekleri Spark (Will-o'-Wisp) ve Rune Spark (Deep Runecaller). O gün Shocked, zemin/Wet tepkileri, Static Field yoktu; kahraman yeteneği lightning değildi (Ömer 2026-10-25). Bugünkü durum bir alttaki maddede.
- **Bugünkü oyun durumu (2026-11-08):** lightning artık kahraman skill'lerinde de var (Skald: Hammer Spark, Thunder Strike, Stormcall; Vesper: Thunderpeal, Great Bell). `shocked` durumu var ama yalnız rozet + sıra çubuğunda geri itme (`data/statuses.json > shocked`, `formulas.json > thunder.pushback`); bu planın "Shocked + Wet = Stunned" tepkisi yok. Plandaki Wet oyunda `soaked` (Druid Nature's Wrath verir; ateş hasarını azaltır, Burning'i söndürür). `chilled` ve Frozen (Chilled'a buz atışı) Mage reworkünden beri oyunda (`campaign/maps-2-3.md` M-D); plandaki diğer haller ve etkileşim tablosu uygulanmadı.
- Druid Su temalı; Rejuvenate → Healing Rain: EVET (Ömer 2026-10-11).
- ~~Anti-Mage’in Drain Field (bugün Ley Brand) ve Void Strike skill’leri Elektrik temalı (Ömer 2026-10-11)~~ **Ömer 2026-11-16 Tur 28-29: elektrik değil; Anti-Mage arcane kalır, Anti-Mage için başka element aranıyor (açık).** Bugün ikisi de arcane.
- Kan yalnızca AĞIR KRİTİK FİZİKSEL vuruşlarda çıkar (Ömer 2026-10-11).
- Şimdilik skill art’ı (ikon/vfx/ses) değişmez; sistem uygulanınca su/elektrik temasına göre yenilenir (Ömer 2026-10-11).
- Archer bu planda YOK (Ömer 2026-11-01: fikirlerden çıkarıldı); özel ok, yağ ve ikinci elektrik kaynağı önerileri kapandı.
- Sıra: item sistemi bitince bu sistem (Ömer 2026-10-11).

## 2. Elementler

| Element | Ne yapar | Durum |
|---|---|---|
| Fiziksel | Silah vuruşu. Kendi başına hal üretmez; ağır kritikte Kan bırakır. | Karar (kan kuralı) |
| Kan | Hasar türü değil, ZEMİN. Ağır kritik fiziksel vuruşta hedefin karesine düşer. Sıvıdır: donar, elektrik iletir. | Karar |
| Ateş | Yakar; suda söner (söndürme, buhar yok: Ömer onaylı 2026-11-09), buzu eritir, zehir/yağı patlatır. | Taslak |
| Buz | Soğutur; sıvıları buz zeminine çevirir, yangını söndürür. | Taslak |
| Su | Islatır; yangını söndürür, elektriği iletir, buzla donar. | Karar (Druid) |
| Elektrik | Sarsar; ıslak hedefi sersemletir, sıvıyı “yüklü” yapar (buhar yok). | Karar (Anti-Mage) |
| Buhar | **YOK (Ömer onaylı 2026-11-09): buhar bulutu yok, söndürme kalır.** Su + ateş bugünkü söndürme kuralıyla çözülür; bulut katmanı, buhar bulutu ve yüklü bulut yapılmaz. | Karar |
| Zehir | Zemin (Undead’de zaten var). Ateşle patlar. | Taslak |
| Yağ | Zemin; üstündekini yavaşlatır, ateşle yangına döner. Tek kaynağı Archer önerisiydi, o kapandı (2026-11-01): şu an veren sınıf yok. | Taslak, kaynaksız |
| Kutsal | Kutsar; yangını kutsal ateşe, suyu kutsal suya çevirir. | Taslak |
| Karanlık | Lanetler; kutsal ateşi lanetli ateşe çevirir. | Taslak |
| Arcane | Saf büyü; zemin/hal etkileşimi yok (Spell Ward, Mana Steal, Ley Brand; Mana Barrier emekli). | Mevcut |
| Doğa | Diken/kök; hal etkileşimi yok (Druid ve Treant). | Mevcut |

## 3. Haller (karakter üstü durumlar)

| Hal | Nasıl gelir | Sonucu | Durum |
|---|---|---|---|
| Wet (Islak) | Su değince | Buz gelirse → Frozen; elektrik gelirse → Stunned; ıslakken Burning tutmaz. | Taslak |
| Chilled (Üşümüş) | Buz değince | Üst üste soğuk ya da Islakken buz → Frozen (tur kaybı). | Taslak |
| Frozen (Donmuş) | Islak/Chilled + Buz | Sırası atlanır (Stun gibi). Ateş eritir → Islak kalır. | Taslak |
| Shocked (Sarsılmış) | Elektrik değince | Islakken elektrik → Stunned. | Taslak |
| Burning (Yanıyor) | Ateş değince | Her tur yanma hasarı; su/buz söndürür. (Oyunda “burning” durumu zaten var.) | Taslak |
| Poisoned (Zehirli) | Zehir zeminde | Zehir hasarı. | Taslak |
| Staggered (Kayma) | Buz zeminde | Buz zemininde kayıp sendeler. (Oyunda Staggered adlı başka bir durum var; ad çakışması çözülmeli.) | Taslak |
| Slow (yağda) | Yağ zeminde | Yağlı zeminde yavaşlar (mevcut Slow durumu). | Taslak |
| Bleeding (Kanıyor) | Ağır kritik fiziksel | Kan yalnız zemin mi kalsın, yoksa hedefe ayrıca “Kanıyor” durumu mu gelsin? (Mevcut Wound zaten benzer işi yapıyor.) | **[ÖNERİ]** |

**Genel kurallar:**
- Her karede en fazla 1 zemin + 1 bulut (taslak).
- Aynı zemin üst üste gelince birleşir, süresi tazelenir (debuff kuralıyla tutarlı; taslak).
- 1. aşama önerisi: Su, Buz, Ateş, Elektrik, Buhar (+ karar gereği Kan).

## 4. Etkileşim tablosu (kurulum → tetik → sonuç)

| Kurulum (zeminde/hedefte olan) | Tetik (gelen) | Sonuç | Durum |
|---|---|---|---|
| Su | Ateş | Söndürme (Flooded + Burning = ateş söner, 2026-10-27); buhar bulutu YOK (Ömer onaylı 2026-11-09) | Karar |
| Su | Buz | Buz zemini (kayma) | **Karar (Ömer 2026-10-27):** Flooded + Storm (iki sıra) -> Ice zemini, üstündeki düşman tur başında Slow 1 tur; su kalkar (open-questions-archive 445) |
| Buz zemini | Ateş | Su zemini | Taslak |
| Yanan zemin | Su / Buz | Söner | **Karar (Ömer 2026-10-27):** suda söner (eskisi gibi); Storm + Burning (iki sıra) ikisi de söner, hücre Flooded olur (open-questions-archive 445) |
| Zehir / Yağ zemini | Ateş | Patlama / yangın | **Karar (Ömer 2026-10-27), zehir:** Poison -> Burning = Explosion (hücre + komşulara anlık ateş hasarı, zehir kalkar, ateş kalır); ters sıra Burning -> Poison = Toxic smoke (Blinded 1 tur + bir zehir tiki, zehir buharlaşır). Yağ hâlâ taslak (open-questions-archive 445) |
| Kan zemini | Buz | Buz zemini | Taslak |
| Su / Kan zemini | Elektrik | Yüklü zemin (üstündekileri sarsar) | Taslak |
| ~~Buhar bulutu~~ | Elektrik | ~~Yüklü bulut~~: düştü (Ömer onaylı 2026-11-09: buhar bulutu yok, söndürme kalır) | Karar |
| Yanan zemin | Kutsal | Kutsal ateş | **Karar (Ömer 2026-10-27):** Burning <-> Holy Fire (iki sıra) = Sanctified Flame (güçlünün %30 fazlası, uzun süre) (open-questions-archive 445) |
| Kutsal ateş | Karanlık | Lanetli ateş | Taslak |
| Su zemini | Kutsal | Kutsal su | **Karar (Ömer 2026-10-27):** Flooded <-> Holy Fire = Holy Water (tetiği bırakanın dostlarına tur başı şifa, hasar yok) (open-questions-archive 445) |
| Wet hedef | Buz | Frozen | Taslak |
| Wet hedef | Elektrik | Stunned | Taslak |
| Su/kan/zehir zemini | Defender sarsıntısı | Sıvı komşu karelere sıçrar | Taslak |
| Buz zemini / Frozen hedef | Ağır fiziksel darbe | Buz kırılır (zemin → su; Frozen biter) | **[ÖNERİ]** |
| Yüklü zemin | Elektrik vuruşu | Akım zemin boyunca komşu ıslak hedeflere sıçrar | **[ÖNERİ]** |
| Kutsal su | — | Üstünde duran müttefiğe küçük şifa | **[ÖNERİ]** |
| Kutsal ateş | Zehir | Purified: zehir tutmaz, kutsal ateşin süresi o hücrede baştan başlar | **Karar (Ömer 2026-10-27)** (open-questions-archive 445) |
| Zehir zemini | Kutsal ateş | Fed: zehir tükenir, kutsal ateş o hücrede %50 fazla vurur | **Karar (Ömer 2026-10-27)** (open-questions-archive 445) |
| Kök zemini (Root Field) | Ateş (iki sıra) | Roots burn: kök yanar (Slow biter), anlık ateş hasarı, ateş kalır | **Karar (Ömer 2026-10-27)** (open-questions-archive 445) |
| Su zemini | Zehir (iki sıra) | Zehir ortak sıvı kuralıyla taşar (alanın %33'ü kadar bitişik hücre, en az 1), su kalır | **Karar (Ömer 2026-10-27; yayılma kuralı 2026-11-09)** (open-questions-archive 445) |

Zemin tepkimelerinin genel kuralı (Ömer 2026-10-27, uygulandı): hücredeki zemin kurulum, yeni bırakılan tetik; her ortak hücrede bir kez, tek sonuç; iki tarafın zeminleri de tepkir; etkinin sahibi tetiği bırakan. Veri `data/grounds.json > reactions`, sayılar provizyon (open-questions-archive 445).

### Karar 2026-11-09: element formu (uygulandı)

- **Kademe kuralı: "Yukarı birleşir, aşağı çözülür" (Ömer 2026-11-09).** T1 + T1 = T2 ya da anlık etki. T2 asla yeni bir T2 kurmaz; yalnız silinir (isteğe göre anlık hasarla) ya da T1 kaynağına çözülür. Çözülen T1 normal davranır. Anlık etkiler geride bir şey bırakmaz. Kutsal muaf.
- **Etkisiz çift kuralı (Ömer 2026-11-09):** "Ömer 2026-11-09: empty (etkisiz) combos are allowed, but they must be spread evenly across elements. No element may have many more empty pairs than another." Bugün etkisiz: ateş + kan, zehir + şimşek (ateş, şimşek, kan, zehir birer boş çift).
- **Ortak sıvı yayılma kuralı (Ömer 2026-11-09):** her sıvı yayılması (su + zehir, su + lanet, zehir + kan, Spark blaze) tepkimeye giren alanın hücre sayısı x %33 kadar (yuvarlanır, en az 1) rastgele bitişik hücreye taşar. Veri `formulas.json > liquidSpread`. Eski "bağlı tüm su hücrelerine" kuralının yerini aldı.
- **Electrocuted (T2 şimşek, Ömer 2026-11-09):** Soaked ya da suda (Flooded, Healing Rain, Kan) duran hedefe şimşek Stun yerine Electrocuted verir: birim anında temel saldırısıyla (ilk skill) kendi tarafından rastgele bir dosta vurur, sonra sıra çubuğu 0. Boss bağışık; elit Stun ile aynı CC kuralı. Shocked (T1) aynı kaldı; tepkimeler sonuç olarak Shocked vermez. Veri `formulas.json > thunder.wetInto`, `statuses.json > electrocuted`.
- **Healing Rain su sayılır (Ömer 2026-11-09):** tüm su kurallarında (tepkime, şimşek iletimi); lanet ona da yayılır, lanetli Healing Rain kimseyi iyileştirmez. Islatmaz (Soaked vermez).
- Kod: zemin + birim tepkimeleri `data/grounds.json > reactions` (birim üstü olanlarda `unitSetup` / `unitTrigger`), motor `battle.ts > reactGrounds / reactUnit / boltLanded`, YZ `ai.ts > unitReactionValue / groundCreationValue / thunderValue`, test `tests/element-combos.test.ts`. Sayılar provizyon; varsayımlar `open-questions.md` > Q-NEW "Element formu".

Çift matrisi (zemin çiftleri; birim üstü tepkimeler hücrede yazılı):

| | Ateş | Buz / Chill | Şimşek | Zehir | Su (Flooded, Healing Rain) | Kan | Lanet | Kutsal |
|---|---|---|---|---|---|---|---|---|
| **Ateş** | - | Söner (Quenched); birimde Frozen + ateş = Soaked | Spark blaze (yanan zemin ortak kuralla yayılır) | Explosion / Toxic smoke | Söndürme; birimde Steam (Soaked + Burning: ikisi kalkar) | **etkisiz (Ömer 2026-11-09)** | Black flame (Burning + Unhallowed) | Sanctified Flame |
| **Buz / Chill** | | Frozen chill | Ice: Shatter; Chill Ground: Brittle frost (Shredded 1 tur); birimde Brittle | Frost venom (Ice + Chilled + bir zehir tiki); birimde zehir süresi +1 | Ice; birimde Flash freeze (Soaked + Chilled = Frozen) | Ice | Grave frost (Chilled + Unhallowed) | - (kutsal muaf) |
| **Şimşek** | | | - | **etkisiz (Ömer 2026-11-09)**; birimde Poisoned + Shocked = bir zehir tiki | Live Water + Electrocuted | Electrocuted (kan suyu gibi iletir) | Hexed spark (Jinxed 2 tur, Shocked yok) | - (kutsal muaf) |
| **Zehir** | | | | - | Spread (ortak sıvı kuralı); birimde Soaked + Poisoned = komşu Soaked'a Poisoned 1 tur | Tainted blood (kan zehre döner, ortak kuralla yayılır) | Rot / çürüme (Poisoned, tik +%25 PROVİZYON + Unhallowed) | Purified / Fed |
| **Su** | | | | | - | Bloody water (su gibi + Bleeding) | Lanet ortak kuralla yayılır; lanetli Healing Rain iyileştirmez | Holy Water / Evaporate; Holy Water + lanet birbirini siler |
| **Kan** | | | | | | - | Blood curse (alınan şifa -%70) | - (kutsal muaf) |
| **Lanet** | | | | | | | - | Birbirini siler (Cleansed) |

## 5. Sınıf şablonları

Her sınıf aynı kalıpta: kimlik satırı, skill tablosu, takım sinerjisi, açık sorular. “Değişiklik”: **yok** = skill aynı kalır, **küçük** = etkiye bir hal/zemin eklenir, **rework** = skill’in elementi ya da işi değişir. Testlik sınıflar (Geometer, poz test) dahil değil.

### Warrior — STR — Fiziksel + Kan

**Element kimliği:** Kanın ustası: ağır kritikleri meydanı kan zeminiyle kaplar, başkalarının buz ve elektriğine malzeme hazırlar.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Double Strike | Fiziksel | Fiziksel (+Kan) | Ağır kritikte hedefin karesine kan zemini (karar) | Kurar: kan → buzla buz zemini, elektrikle yüklü zemin | küçük | Berserker: can azaldıkça daha sert vurur, ağır kritik daha sık |
| Whirlwind | Fiziksel | Fiziksel (+Kan) | Ağır kritik olan her hedefte kan | Kurar: geniş kan alanı → Anti-Mage için büyük yüklü alan | küçük | Berserker ile aynı |
| Charge | Fiziksel | Fiziksel | Stun (mevcut) | Yok: donmuş hedefe ekstra stun gibi keyfi kural yok (Ömer) | yok | — |
| Headsman's Blow | Fiziksel | Fiziksel | Yok (Rage harcar, tek dev darbe) | Yok | yok | Berserker ile zaten bağlı |

**Takım sinerjisi:**
- Mage Blizzard: kan zemini → buz zemini, düşman kayar.
- Anti-Mage Ley Brand: kan zemini → yüklü zemin, üstündekiler sarsılır.
- Defender Tremor Slam: kanı komşu karelere sıçratıp alanı büyütür.

**Açık sorular:**
- (S9) Kansız düşmanlar (iskelet, golem, hayalet) kan bırakır mı?
- (S10) Kan zemini tek başına bir şey yapar mı, yoksa yalnız dönüşüm malzemesi mi?

### Defender — STR — Fiziksel

**Element kimliği:** Sarsıntı: yere vurarak sıvıları yayar, buzu kırar; başkalarının kurduğu zemini büyüten “alan mühendisi”.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Tremor Slam | Fiziksel | Fiziksel (sarsıntı) | Slow (mevcut) | **Uygulandı (Ömer onaylı 2026-11-09):** isabet ettiği hücredeki sıvı zemini (su, kan, zehir; `grounds.json > liquid`) 1 kare komşulara sıçratır. **[ÖNERİ]** buz zeminini kırar (→ su, kayma biter) | küçük | Yok |
| Taunt | — | — | Taunt (mevcut) | Yok | yok | Bulwark Aura ile ilgisiz |
| Close Ranks | — | — | Guard (mevcut; seçilen dost + sırası) | Yok (Guard’lı müttefikin elektriğini Defender’ın yemesi açık soru) | yok | Bulwark Aura: yanındakiler zaten korunuyor |
| Fist Crush | Fiziksel | Fiziksel (+Kan) | Ağır kritikte kan | **[ÖNERİ]** Frozen hedefe vurursa buz kırılır: Frozen biter | küçük | Yok |

**Takım sinerjisi:**
- Druid Healing Rain / Nature’s Wrath suyu → Tremor Slam yayar → Anti-Mage geniş alanı yükler.
- Mage Blizzard dondurur → Fist Crush kırar.
- Warrior kanını yayar.

**Açık sorular:**
- (S11) Frozen hedefi kırmak ekstra hasar verir mi, yoksa yalnız donmayı mı bitirir?
- (S12) Sıçratma kaç kareye (yalnız sağ-sol-ön-arka mı)?
- (S13) Guard’lanan müttefik ıslakken gelen elektriği Defender mı yer?

### Cutthroat — DEX — Fiziksel + Zehir

**Element kimliği:** Zehir ve duman: zehirli bıçakla patlamaya hazırlık yapar, takımın hallerinden beslenen fırsatçı.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Venom Edge | Fiziksel | Fiziksel + Zehir | Wound (mevcut). **[ÖNERİ]** hedefin karesine küçük zehir zemini | Kurar: zehir + ateş = patlama | küçük | Opportunist: Wound’lu hedefe +%25 (kendini zaten kuruyor) |
| Saltire Cut | Fiziksel | Fiziksel (+Kan) | Ağır kritikte kan | Kurar: kan zemini | küçük | Opportunist |
| Smoke Bomb | — | — (duman) | Blinded / Shrouded (mevcut) | **[ÖNERİ]** duman kareye bulut olarak oturur (karede tek bulut: buharla yer paylaşır) | yok | Yok |
| Backstab | Fiziksel | Fiziksel (+Kan) | Garantili kritik; ağır kritikse kan | Kurar: kan zemini | küçük | **[ÖNERİ]** Opportunist listesine Chilled / Shocked / Wet eklenir → takım hallerinden beslenir |

**Takım sinerjisi:**
- Mage Meteor / Fire Bolt: zehir zeminini patlatır.
- Undead Wail of the Dead ile aynı zehir alanını büyütür.
- Druid ve Anti-Mage’in halleri (öneri kabul edilirse) Opportunist’i besler.

**Açık sorular:**
- (S17) Opportunist listesine element halleri (Wet, Chilled, Shocked) eklensin mi?
- (S18) Venom Edge zehir zemini bıraksın mı, Wound yeterli mi?

### Gambler — LUCK — Fiziksel + Kan

**Element kimliği:** Kaos: bol kritikle bol kan; Card Trick rastgele element hali dağıtarak herkesin zincirine kıvılcım atar.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Loaded Dice | Fiziksel | Fiziksel (+Kan) | Ağır kritikte kan | Kurar: kan zemini | küçük | Double or Nothing: skill yeniden hazır → daha çok kritik denemesi |
| High Stakes | Fiziksel | Fiziksel (+Kan) | Ağır kritikte kan | Kurar: kan zemini | küçük | Double or Nothing |
| Card Trick | Fiziksel | Fiziksel + rastgele hal | Rastgele durum (mevcut). **[ÖNERİ]** havuza Wet / Chilled / Shocked / Burning eklenir | Rastgele kurar: diğer sınıfların tetikleyicisine malzeme | küçük | Double or Nothing |
| All In | Fiziksel | Fiziksel (+Kan) | Ağır kritikte kan | Kurar: kan zemini | küçük | Double or Nothing |

**Takım sinerjisi:**
- Warrior ile birlikte geniş kan alanı → Mage/Anti-Mage zinciri.
- Card Trick’in rastgele Wet’i → Mage Blizzard veya Anti-Mage Void Strike ile şans eseri Frozen/Stunned.

**Açık sorular:**
- (S19) Card Trick havuzuna element halleri girsin mi, yoksa “şans” kimliği sade mi kalsın?

### Mage — INT — Ateş + Buz

**Element kimliği:** Ateş + buz: haritanın asıl tetikleyicisi; başkalarının kurduğu su, zehir, yağ ve kanı patlatır ya da dondurur.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Fire Bolt | Ateş | Ateş | **[ÖNERİ]** kısa Burning (ıslak değilse) | Tüketir: ıslak hedef → buhar; yağ/zehir zemini → yangın/patlama; buz zemini → su | küçük | Heat Mirage: yakın vuran düşmanın hücresine yanan zemin bırakır; ateş + buz hasarına %10 direnç |
| Blizzard | Buz | Buz | Chilled; ıslaksa Frozen | Tüketir: su/kan zemini → buz zemini; yanan zemini söndürür | küçük | Heat Mirage (aynı) |
| Ice Crater | Buz | Buz | Chilled; hedefi 1 hücre iter (mevcut) | Tüketir: Chilled hedef → Frozen (uygulandı). Plan: su/kan zemini → buz zemini | yok | Heat Mirage: yakın vuran düşmanın hücresine yanan zemin |
| Meteor | Ateş | Ateş | Yanan zemin (mevcut) | Tüketir: su → buhar; zehir/yağ → patlama/yangın. Kurar: Paladin için yanan zemin | yok | Heat Mirage (aynı) |

**Takım sinerjisi:**
- Druid: ıslak hedef → Blizzard ile Frozen, Fire Bolt ile buhar.
- Cutthroat / Undead: zehir zeminini patlatır.
- Paladin: Meteor’un yanan zeminini kutsal ateşe çevirir.

**Açık sorular:**
- (S20) Fire Bolt Burning durumu versin mi, yoksa ateş yalnız zemin ve dönüşüm mü yapsın?
- (S21) Mana Barrier emekli (`retired: true`); Ice Crater yerine geldi. Soru artık geçersiz.

### Druid — INT — Su + Doğa

**Element kimliği:** Su + doğa: takımı yağmurla iyileştirip yangından korur, düşmanı ıslatıp buz ve elektriğe hazırlar.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Thorn Whip | Doğa | Doğa | Wound (mevcut) | Yok | yok | Yok |
| Tidal Wrath (eski Nature’s Wrath; id `natures_wrath`) | Doğa | Doğa (Ömer onaylı 2026-11-09: yalnız ad Tidal Wrath oldu, hasar türü doğa kalır) | **[ÖNERİ]** Wet (düşman alanı) | Kurar: ıslak düşman → Blizzard dondurur, elektrik sersemletir, ateş buharlaştırır | rework | Yok |
| Healing Rain (eski Rejuvenate) | — (şifa) | Su (KARAR) | Şifa + HoT (mevcut) + müttefiğe Wet (taslak) | Müttefiğin Burning’ini ve yanan zemini söndürür; ama ıslak müttefik elektriğe açık | rework | Yok |
| Summon Treant | — | Doğa | Treant: Root Smash (fiziksel), Vine Snare (doğa, kök) | Yok | yok | Nature's Grudge (2026-10-20, Verdant Blessing'in yerine): dost kahraman düşünce öldüreni 3 tur Slow + Wither |

**Takım sinerjisi:**
- Mage: ıslak düşman → Frozen ya da buhar.
- Anti-Mage (ve seçilirse Archer): ıslak düşman → Stunned.
- Paladin: su zemini → kutsal su.

**Açık sorular:**
- (S22) Healing Rain tek müttefik mi kalsın, “yağmur” adına uygun olarak alan mı olsun?
- (S23) Healing Rain müttefiği ıslatsın mı (yangına karşı koruma ama elektrik riski)?
- (S24) Nature’s Wrath su olsun mu (Druid’in düşmana yönelik tek su kaynağı)?

### Paladin — INT — Kutsal

**Element kimliği:** Kutsal: zemini kutsar; yangını kutsal ateşe, suyu kutsal suya çeviren dönüştürücü.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Holy Strike | Kutsal | Kutsal | — | Yok | yok | Divine Light ile ilgisiz |
| Resurrection | — | — | Diriltme (mevcut) | Yok | yok | — |
| Judgment | Kutsal (kutsal ateş zemini) | Kutsal | Kutsal ateş zemini (mevcut) | Tüketir: yanan zemin → kutsal ateş; su zemini → kutsal su. Hexer karanlığıyla → lanetli ateş | küçük | Yok |
| Radiance | Kutsal | Kutsal | Şifa + hasar (mevcut) | **[ÖNERİ]** alandaki su zeminlerini kutsal suya çevirir | küçük | Divine Light: şifacı kimliğini güçlendirir |

**Takım sinerjisi:**
- Druid: su zemini → kutsal su (öneri: üstündeki müttefiğe şifa).
- Mage: Meteor’un yanan zemini → kutsal ateş.
- Hexer: kutsal ateşi lanetli ateşe çevirir (karşıt eşleşme).

**Açık sorular:**
- (S25) Kutsal su ne yapar (müttefiğe küçük şifa mı, ölümsüze hasar mı)?
- (S26) Judgment var olan zemini dönüştürür mü, üstüne mi yazar?

### Anti-Mage — INT — Elektrik + Arcane

**Element kimliği:** Elektrik (KARAR): ıslak ve kanlı alanları yükler, ıslak hedefleri sersemletir.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Mana Steal | Arcane | Arcane (ses notu elektrik cızırtısı; açık) | Mana çalma (mevcut) | Yok | yok | Spellbreaker’s Instinct ile ilgisiz |
| Ley Brand (`drain_field`) | Arcane (damga, mana yakma) | ~~Elektrik~~ Ömer 2026-11-16 Tur 28-29: elektrik değil; Anti-Mage için başka element aranıyor (açık) | Shocked; ıslaksa Stunned | Tüketir: su/kan zemini → yüklü zemin; buhar → yüklü bulut | rework | Yok |
| Spell Ward | Arcane | Arcane | Kalkan (mevcut) | **[ÖNERİ]** Wet / Shocked’ı da siler (dost ateşine karşı) | yok | Spellbreaker’s Instinct: tempo kimliği (büyü zırhı sınıf verisinde) |
| Void Strike | Arcane | ~~Elektrik~~ Ömer 2026-11-16 Tur 28-29: elektrik değil; Anti-Mage için başka element aranıyor (açık) | Shocked; ıslaksa Stunned | Tüketir: ıslak hedef. **[ÖNERİ]** yüklü zeminde komşu ıslak hedeflere sıçrar | rework | Yok |

**Takım sinerjisi:**
- Druid: ıslattığı düşmanları Ley Brand / Void Strike sersemletir.
- Warrior / Gambler: kan zemini → yüklü zemin.
- Mage: buhar bulutu → yüklü bulut.

**Açık sorular:**
- (S27) Ley Brand (eski Drain Field) adı Static Field olsun mu? Void Strike adı korunsun mu? (Ömer Ley Brand adını 2026-10-27 verdi; soru büyük olasılıkla kapandı, doğrulanmadı.)
- (S28) Mana Steal da elektrik mi olsun?

### Hexer — LUCK — Karanlık

**Element kimliği:** Karanlık lanet: zemini lanetler, kutsal ateşi lanetli ateşe çevirir; Omen kimliği korunur.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Evil Eye | Karanlık | Karanlık | Omen (mevcut) | Yok | yok | Ill Omen |
| Withering Curse | Karanlık | Karanlık | Wither + Omen (mevcut). **[ÖNERİ]** alana lanetli zemin | Tüketir: kutsal ateş → lanetli ateş | küçük | Ill Omen |
| Jinx | Karanlık | Karanlık | Jinxed + Omen (mevcut) | Yok | yok | Ill Omen |
| Doom Mark | Karanlık | Karanlık | Omen patlatma (mevcut) | Yok | yok | Ill Omen |

**Takım sinerjisi:**
- Paladin: Judgment’ın kutsal ateşini lanetli ateşe çevirir.
- Mage: yanan zemin → (Paladin varsa) kutsal ateş → lanetli ateş zinciri.
- Undead ile karanlık ortaklığı.

**Açık sorular:**
- (S29) Lanetli zemin ve lanetli ateş ne yapar?
- (S30) Hexer zaten Omen ile karmaşık; element katkısı yalnız Withering Curse’te mi kalsın?

### Undead — INT — Karanlık + Zehir

**Element kimliği:** Karanlık + zehir: zehirli zemin kurar, ateş için patlamaya hazırlar; iskeleti fiziksel kan kaynağı.

| Skill | Şu anki element | Önerilen element | Uyguladığı durum | Tetiklediği / tükettiği etkileşim | Değişiklik | Pasifle ilişkisi |
|---|---|---|---|---|---|---|
| Bone Throw | Karanlık | Karanlık | Slow (mevcut) | Yok | yok | Vampiric Bite |
| Wail of the Dead | Karanlık | Karanlık + Zehir zemini | Zehir zemini (mevcut) | Kurar: zehir + ateş = patlama | yok | Yok |
| Dark Bond | — | Karanlık | Bağ (mevcut) | Yok | yok | Yok |
| Raise Dead | — | — | İskelet: Bone Strike / Bone Slash (fiziksel) | İskeletin ağır kritiği hedefte kan bırakır (iskeletin kendisi kansız) | yok | Vampiric Bite |

**Takım sinerjisi:**
- Mage: zehir zeminini patlatır.
- Cutthroat ile ortak zehir alanı.
- Hexer ile karanlık ortaklığı.

**Açık sorular:**
- (S31) Zehir patlaması kendi takımımızı da vurur mu (dost ateşi sorusuyla bağlı)?

### Vesper, Skald, Archer (2026-11-08 eklendi; plana sonradan girdiler, onaysız)

- **Vesper — INT — Kutsal + Şimşek:** Toll, Cracked Bell, Great Bell kutsal; Thunderpeal ve Great Bell'in ikinci satırı şimşek (Blinded verir). Ömer 2026-11-08: Thunderpeal'e `shocked` verilmez. Plan etkileşimi tanımlanmadı (kutsal ateş / yüklü zemin yok). Kit: `classes/vesper.md`.
- **Skald — STR — Fiziksel + Şimşek:** Hammer Spark yarı fiziksel yarı şimşek bölünmüş vuruş; Thunder Strike ve Stormcall şimşek ve hedefi Shocked yapar (bugünkü Shocked yalnız rozet + sıra geri itme). Pasif Conductor yavaş / sersem / şoklu hedefe şimşek hasarını artırır. Plandaki "ıslak + elektrik = Stunned" tepkisi uygulanmadı. Kit: `classes/skald.md`.
- **Archer — DEX — Fiziksel:** bu planda YOK (Ömer 2026-11-01: fikirlerden çıkarıldı).

## 6. Özet matris (sınıf × element)

● ana kimlik · ○ ikincil / kurar · ✦ tüketir / dönüştürür (tetikleyici)

| Sınıf | Fiziksel | Kan | Ateş | Buz | Su | Elektrik | Buhar | Zehir | Yağ | Kutsal | Karanlık | Arcane | Doğa |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Warrior | ● | ● |  |  |  |  |  |  |  |  |  |  |  |
| Defender | ● | ○ |  | ✦ | ○ |  |  |  |  |  |  |  |  |
| Cutthroat | ● | ○ |  |  |  |  |  | ● |  |  |  |  |  |
| Gambler | ● | ● | ○ | ○ | ○ | ○ |  |  |  |  |  |  |  |
| Mage |  | ✦ | ● | ● | ✦ |  | ✦ | ✦ | ✦ |  |  | ○ |  |
| Druid |  |  |  |  | ● |  |  |  |  |  |  |  | ● |
| Paladin |  |  | ✦ |  | ✦ |  |  |  |  | ● |  |  |  |
| Anti-Mage |  | ✦ |  |  | ✦ | ● | ✦ |  |  |  |  | ○ |  |
| Hexer |  |  |  |  |  |  |  |  |  | ✦ | ● |  |  |
| Undead | ○ |  |  |  |  |  |  | ● |  |  | ● |  |  |
| Vesper |  |  |  |  |  | ● |  |  |  | ● |  |  |  |
| Skald | ● |  |  |  |  | ● |  |  |  |  |  |  |  |

**Kurulum → tetik zincirleri (her sınıfın en az bir ortağı var):**
- Druid ıslatır → Mage Blizzard dondurur (Frozen) / Anti-Mage sersemletir (Stunned) / Mage Fire Bolt buharlaştırır.
- Warrior / Gambler kan döker → Mage buz zemini yapar / Anti-Mage yükler; Defender kanı yayar.
- Cutthroat / Undead zehir bırakır → Mage patlatır / yakar.
- Mage yanan zemin bırakır → Paladin kutsal ateşe çevirir → Hexer lanetli ateşe çevirir.
- Mage buhar yaratır → Anti-Mage yüklü bulut yapar.
- Mage dondurur → Defender buzu kırar (**[ÖNERİ]**).

## 7. Tüm açık sorular (31)

1. **Genel:** Durum listesi (Wet, Chilled, Frozen, Shocked, Burning, Poisoned) taslaktı; bu haliyle onaylıyor musun?
2. **Genel:** “Ağır kritik” ne demek? (Öneri: normal kritiğin üstünde ayrı bir eşik, ör. hedefin maks. canının %15’inden büyük kritik vuruş.) **Karar (Ömer onaylı 2026-11-09):** eşik %35 (`formulas.json > heavyCrit.hpRatio`).
3. **Genel:** Kan yalnız zemin mi kalsın, yoksa hedefe ayrıca “Kanıyor” durumu da gelsin mi?
4. **Genel:** Dost ateşi: element zincirleri kendi takımımızı da etkiler mi? (Ör. Healing Rain ile ıslanan müttefik, kendi Anti-Mage’imizin elektriğiyle sersemler mi?)
5. **Genel:** Bosslar CC yemiyor; Frozen ve Stunned bossta ne olur? (Öneri: yalnız Chilled/Shocked kalır, hal yine zemine/zincire işler.) **Karar (Ömer onaylı 2026-11-09):** boss tüm CC'ye bağışık (Frozen dahil); Chilled CC değil; CC dışı debuff'lar boss'ta %25, elitte %50 güç (`combat.md` > Boss / elit debuff gücü).
6. **Genel:** Karede 1 zemin + 1 bulut kuralı ve “aynı zemin birleşir, süre tazelenir” kuralı onaylı mı?
7. **Genel:** 1. aşama kapsamı: su, buz, ateş, elektrik, buhar + kan yeterli mi; zehir/yağ/kutsal/lanet 2. aşamaya mı?
8. **Genel:** Ad çakışması: buz kayması için mevcut “Staggered” adı kullanılabilir mi, yoksa yeni ad mı (ör. “Slipping”)?
9. **Warrior:** Kansız düşmanlar (iskelet, golem, hayalet) kan bırakır mı?
10. **Warrior:** Kan zemini tek başına bir şey yapar mı, yoksa yalnız dönüşüm malzemesi mi?
11. **Defender:** Frozen hedefi kırmak ekstra hasar verir mi, yoksa yalnız donmayı mı bitirir?
12. **Defender:** Sıçratma kaç kareye (yalnız sağ-sol-ön-arka mı)?
13. **Defender:** Guard’lanan müttefik ıslakken gelen elektriği Defender mı yer? **Karar (Ömer onaylı 2026-11-09):** hayır; Guard yalnız hasarı aktarır, Stun / Shocked asıl hedefte kalır.
14. **Archer:** KAPANDI (Ömer 2026-11-01, Archer plandan çıktı).
15. **Archer:** KAPANDI (elektrik yalnız Anti-Mage'de).
16. **Archer:** KAPANDI (yağın kaynağı kalmadı).
17. **Cutthroat:** Opportunist listesine element halleri (Wet, Chilled, Shocked) eklensin mi?
18. **Cutthroat:** Venom Edge zehir zemini bıraksın mı, Wound yeterli mi?
19. **Gambler:** Card Trick havuzuna element halleri girsin mi, yoksa “şans” kimliği sade mi kalsın?
20. **Mage:** Fire Bolt Burning durumu versin mi, yoksa ateş yalnız zemin ve dönüşüm mü yapsın?
21. **Mage:** KAPANDI (Mana Barrier emekli, Ice Crater yerine geldi).
22. **Druid:** Healing Rain tek müttefik mi kalsın, “yağmur” adına uygun olarak alan mı olsun?
23. **Druid:** Healing Rain müttefiği ıslatsın mı (yangına karşı koruma ama elektrik riski)?
24. **Druid:** Nature’s Wrath su olsun mu (Druid’in düşmana yönelik tek su kaynağı)?
25. **Paladin:** Kutsal su ne yapar (müttefiğe küçük şifa mı, ölümsüze hasar mı)?
26. **Paladin:** Judgment var olan zemini dönüştürür mü, üstüne mi yazar?
27. **Anti-Mage:** Ley Brand adı (eski Drain Field) Static Field olsun mu? Void Strike adı korunsun mu? (büyük olasılıkla kapandı)
28. **Anti-Mage:** Mana Steal da elektrik mi olsun?
29. **Hexer:** Lanetli zemin ve lanetli ateş ne yapar?
30. **Hexer:** Hexer zaten Omen ile karmaşık; element katkısı yalnız Withering Curse’te mi kalsın?
31. **Undead:** Zehir patlaması kendi takımımızı da vurur mu (dost ateşi sorusuyla bağlı)?

## Karar (Ömer 2026-11-09): Explosion hasarı

Explosion anlık hasarı = hücredeki Poison Ground tiki + Burning Ground tiki (toplam; `grounds.json > reactions.explosion.damage.sum`). Poison için hücredeki zemin örneğinin kayıtlı tiki (hücre çarpanı dahil), Burning için tetikleyen skill'in zemin gücü alınır (motor `reactGrounds` / YZ `groundCreationValue` aynı toplamı kullanır); komşu hücreler toplamın `adjacent` oranı. Ters sıra (Burning -> Poison = Toxic smoke) değişmedi. **Birim üstü (uygulandı, Ömer 2026-11-09):** Poisoned birime Burning gelirse Explosion (Poisoned biter, hedef + komşulara ateş hasarı = iki durumun kayıtlı tik miktarlarının toplamı, Burning kalır); Burning'li birime Poisoned = Toxic smoke (Blinded 1 tur + bir zehir tiki, Poisoned buharlaşır). Zemin tepkimesiyle aynı kod ve aynı veri (`grounds.json > reactions > unitSetup / unitTrigger / unitRemove`; `Battle.reactUnit` + `applyReactionFx`). Boss'ta Blinded 2026-11-09'dan beri engelli değil (Ömer onaylı, form 3: `ccImmunity.accuracyCrit` kapalı), boss %25 / elit %50 güçle yer. Zeminin kendi verdiği durumlar zaten hücre tepkimesinden geçtiği için yalnız skill ile gelen durumlar tetikler. YZ: `ai.ts > unitReactionValue` (tepkime hasarı aday hasarına). Test: `tests/unit-reactions.test.ts`.

## Karar (Ömer onaylı 2026-11-09): Kan zemini, lanetli zemin; bulut katmanı yok

- **Kan zemini (uygulandı):** fiziksel kritik vuruş hedefin maks canının `formulas.json > heavyCrit.hpRatio` (0,35) oranından FAZLA can götürürse hedefin hücresine Blood (`grounds.json > blood`) düşer (eski taslaktaki %15 eşiği yerine). Kansız birim (veride `bloodless: true`: iskelet, golem, ruh, bitki, yapı) kan bırakmaz. Kan sıvıdır: içindeki her birim Soaked (Flooded gibi), Tremor Slam sıçratmasında sıvı (`liquid`), kan + buz = Ice (`reactions.frozen`), kan + elektrik = su gibi iletir (Live Water). Motor `battle.ts > spillBlood / bleeds / isHeavyCrit`, YZ `ai.ts > bloodValue`. Test `tests/blood-cursed-ground.test.ts`. Bu, bölüm 7 soru 2, 3 (kan yalnız zemin), 9 (kansızlar bırakmaz) ve 10 (tek başına Soaked verir) cevabıdır.
- **Lanetli zemin (uygulandı):** Hexer Withering Curse alanına Cursed Ground bırakır; içindeki düşman Unhallowed (`statuses.json > unhallowed`; Tur 27, 2026-11-16: yeni süreli debuff'lar 1 tur uzun sürer, eski şifa / karanlık hasar etkisi yok; kural `combat.md`). Kutsal ateş (Holy Fire / Sanctified Flame) + lanetli zemin = ikisi de kalkar, hücre temiz (`reactions.cleansed`). Bölüm 7 soru 29'un lanetli zemin kısmı; lanetli ateş tanımsız, uygulanmadı.
- **Buhar / yüklü bulut ve "karede 1 zemin + 1 bulut": DÜŞTÜ (Ömer onaylı 2026-11-09, form 3): buhar bulutu yok, söndürme kalır.** Su + ateş bugünkü söndürme kuralıyla çözülür (Flooded + Burning = ateş söner, 2026-10-27); buhar bulutu, yüklü bulut ve bulut katmanı yapılmaz. Belgedeki eski buhar önerileri (Fire Bolt / Meteor "su -> buhar", Ley Brand "buhar -> yüklü bulut", sinerji satırları) bu kararla geçersizdir.
