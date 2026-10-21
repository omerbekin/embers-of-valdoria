# Moments ağacı: class başına 5 varyant (Ömer isteği 2026-10-21 gece)

Ömer: "Tüm classlar için class başına 5 mockup yapar mısın farklı skill ağacıyla. Hepsini bir mockupta buluşturursun."

**Okuma:** Ağaç şekli Moments olarak sabit kalıyor (`skill-tree-moments.md`, Ömer'in düzeltmeleriyle). Her class için **5 farklı ağaç içeriği** yazılıyor. Her varyant kendine özgü bir **build kimliği** taşıyor (oyun tarzı); aynı içeriğin isim değiştirmiş hali olmuyor. Hepsi tek mockup'ta (`public/mockups/skill-tree-moments.html`) class + varyant seçiciyle gösteriliyor.

Classlar (sıra): warrior, defender, paladin, archer, cutthroat, mage, druid, undead, hexer, antimage, gambler. Warrior'da 5 yeni varyanta ek olarak "Ömer's pick" (`picks-warrior.js`) de kalıyor.

## 1. Şekil (değişmez)
- Satır 0 = pasif, satır 1-3 = class'ın ilk 3 aktif skill'i (class dosyasındaki `skills` sırası), satır 4 = ult (`skills[3]`) + ağacı.
- Satır düğümleri: `f1` filler 3 rank → `f2` filler 5 rank → `f3` filler 5 rank → `n0` **notable** (Tier II) → `r` filler 3 rank (Tier III) → `ea` / `eb` **edge** (Tier III, iki yön) → `ma` **notable** + `fa` **blood price** (ea'dan) / `mb` **notable** + `fb` **blood price** (eb'den) (Tier IV) → `v` **evolve** (ma ya da mb).
- Yani her satırda iki yön var: **a yönü** (ea → ma, fa) ve **b yönü** (eb → mb, fb). İki yön aynı skill'i farklı oynatmalı.
- Kilit sayacı: pasif + 3 aktif satıra harcanan puan (**ult sayılmaz**). Tier II 5 · III 10 · IV 15 · Evolve I 23 · Evolve II 38. Karakter başına en çok 2 evolve.
- Ult + ağacı: 4 kol (u yukarı, r sağ, d aşağı, l sol), her kolda ortadan dışa `1` (L5) → `2` (L10) → `3` (L15, **notable**). Ult'a **toplam en çok 3 puan**: ya bir kolu sonuna kadar, ya da birkaç kolun ilk düğümleri. Her kol ayrı bir ult tarzı olmalı; kol 1 düğümleri tek başına da cazip olmalı.
- Mastery bar: 5/10/15/20/25'te sabit bonus (5 adet). L50 bonusları (30-45) TBD.

## 2. Tasarım kuralları
- **Ayrım:** item = genel stat, set = pasif / kaynak sayısı, **ağaç = skill davranışı**. Düz genel stat yok ("+5% crit", "+20 HP" gibi). Sayı içeren filler'lar o satırın skill'ine bağlı olsun ("Whirlwind damage +4% per rank" olur). Koşullu ve skill'e bağlı stat olur (Ömer'in Warrior seçimlerinde var: "below 50% HP, your skills +2% crit per rank").
- **Tavan yok:** yeni stat tavanı koyma; denge takasla (blood price, bedel, koşul) kurulur.
- **Yeni mekanik:** mümkünse oyunda var olan statü / kaynak / anahtar kelimeyi kullan (`data/statuses.json`, `data/skills.json`, class dosyası). Yeni kural isteyen düğüm `true` ile işaretlenir (mockup'ta NEW rozeti) ve varyant başına **en çok 4** olur.
- **Evolve:** skill'i yerinde dönüştürür (aynı skill, yeni davranış), build'i tanımlayan an olmalı. Evolve metni ne değiştiğini açıkça söylemeli.
- **Blood Price:** kazanç + açık bedel, dead end.
- **Edge:** küçük ama güçlü, yönün kapısı. **Notable:** orta boy, kendi başına bir "an" (moment).
- **Varyantlar farklı olsun:** 5 varyant 5 ayrı oyun tarzı (ör. kanama, kontrol, hayatta kalma, patlama, kaynak döngüsü...). Aynı class içinde aynı düğüm iki varyantta tekrar etmesin (en çok birkaç küçük filler).
- **Metin:** İngilizce, düz (italik yok), kısa: isim ≤ 24 karakter, etki ≤ 150 karakter. Rank'lı filler "per rank" der. Sayılar mantıklı ve oyundaki ölçekte olsun (skill'in mevcut sayılarına bak).
- **Zevk ayarı:** Ömer'in Warrior seçimleri `public/mockups/skill-tree-moments/picks-warrior.js` (notları dahil) güç ve üslup için referans.

## 3. Veri sözleşmesi
Dosya: `public/mockups/skill-tree-moments/variants/<classId>.js`

```js
/* <CLASS>: 5 Moments varyantı (content-designer, 2026-10-21). */
(window.SMM_VARIANTS = window.SMM_VARIANTS || {})['archer'] = {
  cls: 'archer', name: 'Archer',
  rows: [ // satır 0-3
    { skill: 'sharpshooter', name: 'Sharpshooter', passive: true },
    { skill: 'quick_shot', name: 'Quick Shot' },
    { skill: 'piercing_arrow', name: 'Piercing Arrow' },
    { skill: 'arrow_rain', name: 'Arrow Rain' }
  ],
  ult: { skill: 'aimed_shot', name: 'Aimed Shot' },
  variants: [
    { title: 'Deadeye',                 // varyant adı, EN, 1-2 kelime
      theme: 'One shot, one kill: ...', // EN, ≤ 120 karakter, build kimliği
      tr: 'Uzaktan tek hedefe ...',     // TR, ≤ 160 karakter, Ömer için oyun tarzı özeti
      mastery: 'Deadeye Mastery',
      bar: [['Name', 'Effect'], ... 5 adet: 5/10/15/20/25],
      nodes: {
        '0.f1': ['Name', 'Effect'], '0.f2': [...], ... '0.v': [...],   // satır 0-3 × 12 anahtar
        '4.u1': ['Name', 'Effect'], ... '4.l3': ['Name', 'Effect', true] // ult 12 anahtar; 3. eleman true = yeni mekanik
      } },
    ... // toplam 5 varyant
  ]
};
```
Satır anahtarları: `f1 f2 f3 n0 r ea eb ma fa fb mb v`. Ult anahtarları: `u1 u2 u3 r1 r2 r3 d1 d2 d3 l1 l2 l3`. Varyant başına 60 düğüm.

Denetim: `node <scratchpad>/check-variants.js <classId>` (yapı, anahtarlar, uzunluk, tekrar).

## 4. Varyant özeti (ajan raporlarından, 2026-10-21 gece)
Hepsi denetimden geçti (11 dosya × 5 varyant × 60 düğüm). Sayılar taslak, sim yok. NEW = yeni kural isteyen düğüm.

### paladin (OK, 0 warn) — NEW 11
Rows: Divine Light / Holy Strike / Resurrection / Judgment, ult Radiance.
1 Mercy: saf şifacı (NEW 3) · 2 Crusader: saldırgan, Holy Strike büyür/sıçrar (NEW 1) · 3 Aegis: kalkan/Taunt/Guard koruyucu (NEW 3) · 4 Hallowed Ground: Judgment ateşi zemini kaplar (NEW 2) · 5 Martyr: kendi canıyla şifa/diriltme (NEW 2)
Belirsiz: hasar yansıtma, kendini diriltme, zemin yayılması yeni kural; Paladin zaten güçlü, Mercy evolve cömert olabilir.
### archer (OK, 0 warn) — NEW 8
Ult Aimed Shot. 1 Deadeye: arka sırada sabit, uzak tek hedef kritik/zırh delme (NEW 2) · 2 Skirmisher: Haste/Fleet ile sık tur, Quick Shot yağmuru (NEW 2) · 3 Crippler: Slow/Stun/Blind/Silence kontrolü, kontrol altındakine sert (NEW 0) · 4 Volley: Arrow Rain + Piercing alan hasarı (NEW 1) · 5 Huntsman: Quarry avı, Wound, öldürünce cooldown sıfır (NEW 3)
Belirsiz: Overextended boss statüsü genelleştirilmeli; Volley evolve Arrow Rain 4 sıra = tüm düşman tarafı; "önce davranma" tur sırası takibi ister.
### hexer (OK, 0 warn) — NEW 12
Ult Doom Mark. 1 Doombringer: Omen'i hızla 3'e çıkarıp tek hedefte Doom patlatma (NEW 1) · 2 Rotcaller: Wither uzatma/yığma/ölünce yayma (NEW 3) · 3 Black Cat: Jinx/Blind/Slow/Silence kontrol, takımı koruma (NEW 4, sınırda) · 4 Contagion: Omen sıçratma, öldürünce sıraya zincir (NEW 1) · 5 Witch's Tithe: Omen/Doom'dan MP/can/cooldown geri ödeme (NEW 3)
Belirsiz: Doom Mark verisi x1.65, notta x1.5 (veri kullanıldı); Unbroken Chain var olan "geçen Omen Doom tetiklemez" kuralını kaldırıyor (NEW sayılmadı).
### antimage (OK, 0 warn) — NEW 15
Row1 Mana Steal (id mana_burn), ult Void Strike. 1 Silencer: MP sıfırda tut, Silenced zinciri (NEW 2) · 2 Voidreaver: boşalt sonra Void Strike infaz (NEW 3) · 3 Wellspring: çalınan büyüyü takıma MP dağıtma, destek (NEW 4) · 4 Nullwarden: kalkan/temizleme/taunt/Guard büyü koruması (NEW 2) · 5 Spellbreaker: düşman buff/kalkan sökme, hızlı tempo (NEW 4)
Belirsiz: Spellbreaker buff'sız takımlara zayıf; Spell Ward süresi bilinmiyor; Drain Field 3x4 ve Silenced ücretsiz skill yasağı öneri.
### cutthroat (OK, 0 warn) — NEW 14
Ult Backstab. 1 Slow Venom: Wound/Wither/Slow yığ, Backstab tüketip patlatır (NEW 4) · 2 Smoke Dancer: Shrouded kaçış, Blind ıskasına karşı vuruş (NEW 4) · 3 Throat Slitter: düşük canlıyı kritikle bitir, öldürünce hız/cooldown sıfır (NEW 2) · 4 Knife Fan: geride bıçak fırlatma, Saltire Cut ana silah, alana Wound (NEW 2) · 5 Dirty Fighter: Slow/Stun/Silence/Jinx ile tur bozma (NEW 2)
Belirsiz: Wound = sadece iyileşme -%25, zehir Wither üstüne kuruldu (Wither'a %15 DEX/tur değeri önerildi); geri itme ve karşı vuruş NEW.
### gambler (OK, 0 warn) — NEW 12
Ult All In. 1 The House: hileli zar, az risk istikrarlı hasar (NEW 3) · 2 Blood Wager: skill'ler can yakar, Jackpot can verir (NEW 3) · 3 Hot Streak: Double or Nothing yankıları, cooldown kısalır + Haste (NEW 3) · 4 Cardsharp: Slow/Jinx/Blind/Stun kontrol, durumlu hedefe bahis kolay (NEW 1) · 5 Bankroll: MP biriktir, büyük All In (NEW 2)
Belirsiz: Stacked Deck (durumu oyuncu seçer), Second Wind, Vendetta yeni kural.
### defender (OK, 0 warn) — NEW 9
Ult Fist Crush. 1 Bastion: kalkan biriktir, kıpırdamadıkça güçlen (NEW 1) · 2 Earthshaker: Slow/Stun/Staggered kontrol, Tremor Slam evolve sütun vurur (NEW 0) · 3 Shield Wall: dizilim tankı, aura/Guard yayma (NEW 2) · 4 Provoker: Taunt + aldığı darbeyi hasara çevirme (NEW 4) · 5 Ironbreaker: zırhı silaha çevirme, Overextended + Fist Crush (NEW 2)
Belirsiz: Overextended Warden'a özgü metin; Sundered yeni durum; "Shield Wall" adı mevcut skill id ile aynı.
### undead (OK, 0 warn) — NEW 17
Rows Vampiric Bite / Bone Throw / Wail of the Dead / Dark Bond, ult Raise Dead. 1 Blood Tithe: canla ödeme, vurdukça içme, fazla şifa kalkan (NEW 4) · 2 Bonelord: iskelet asıl silah, cesetler yakıt (NEW 4) · 3 Plaguebearer: Wither/zehir zemini/Wound, şifa kesme (NEW 3) · 4 Soulbinder: destek, çalınan can dosta, dostu bir kez döndürme (NEW 4) · 5 Gravechill: Slow/Staggered/Silence/Blind, düşman sırasını geri itme (NEW 2)
Belirsiz: Vampiric Bite oranı class %50 vs battle-engine.md %35 (%50 alındı); Rot Communion Wither'ın şu an can çalmadığını varsayıyor.
### druid (OK, 0 warn) — NEW 7
Rows Nature's Grudge / Thorn Whip / Nature's Wrath / Rejuvenate, ult Summon Treant. 1 Rotwood: Wither yayılır (a) ya da derinleşip hasat (b) (NEW 1) · 2 Grovekeeper: Treant ordusu, hepsi Treant'ı besler (NEW 2) · 3 Wellspring: saf şifacı, fazla şifa kalkan, ölüm erteleme (NEW 1) · 4 Snarewood: kontrol, Rooted=Stun, öne çekme, susturma (NEW 1) · 5 Wildwrath: kritik patlama, öldürünce MP (NEW 2)
Belirsiz: ayrı Root statüsü yok (Stun kullanıldı); Treant ölünce Grudge tetikleniyor mu belli değil; var olan statüye yeni tetik veren düğümler NEW sayılmadı ama motor kancası ister.
### warrior (OK, 0 warn) — NEW 13 (+ Ömer's pick tab)
1 Butcher: her vuruşla Wound, yaralıya sert, kanla beslenme (NEW 3) · 2 Wrathforge: Rage ekonomisi, harcayarak güçlendirme (NEW 0) · 3 Deathless: düşük canda ölmeyen, Fortified/can çalma/karşı vuruş/1 canla atlatma/Taunt (NEW 4) · 4 Bonebreaker: Stun/Slow/Staggered/Blind kontrol, boss'a Stagger (NEW 2) · 5 Warlord: takım önderi, dostlara Haste/hasar/şifa/MP (NEW 4)
Belirsiz: başka class statüleri Warrior'a verildi (Blinded, Jinxed, Overextended, Fleet); Staggered boss bağışıklığı motorda doğrulanmadı.
### mage (OK, 0 warn) — NEW 8
Ult Meteor. 1 Pyromancer: Burning yayılır, Blizzard ile söndür/patlat (NEW 2) · 2 Frostbinder: Slow→Stun dondurma, Blind/Silence (NEW 2) · 3 Echo Weaver: Spell Echo zinciri, kısa cooldown, sık Blizzard/Meteor (NEW 1) · 4 Mana Tide: fazla MP harca güç al, MP geri doldur (NEW 1) · 5 Glass Cannon: kritik, öldürme zinciri, düşük canda güç (NEW 2)
Belirsiz: yarım tur düğümleri "en az 2 cooldown" kuralını zorlayabilir; yankı tekrar ateşleme, sonradan cooldown kazanma NEW sayılmadı.

## 5. Karma turu (Ömer isteği 2026-10-22)
Ömer: "Çok fazla okunacak skill var, seçemedim. Önerdiklerinden ortaya karışık yap. Buffladığı skill'in kimliğini güçlendirsin, skill'ler arasında nadiren sinerji olsun ama genelde farklı kimlikleri olsun, ilgi çekici olsun. Class başına 5'ten karma 2'ye düşür, oradan seçeyim."

**Kurallar**
- Her class için **2 karma ağaç** (Karma A, Karma B). Düğümler o class'ın 5 varyantından seçilir (`variants/<cls>.js`). Yeni düğüm yazılmaz.
- Düğüm **aynı satırda** ve **aynı tür yuvada** kalır: filler (f1 f2 f3 r) ↔ filler, edge (ea eb) ↔ edge, notable (n0 ma mb) ↔ notable, blood price (fa fb) ↔ blood price, evolve (v) ↔ evolve, ult 1. düğüm (u1 r1 d1 l1) ↔ ult 1. düğüm, ult 2. düğüm ↔ ult 2. düğüm, ult notable (u3 r3 d3 l3) ↔ ult notable.
- Kaynak her düğümde yazılır: `'V2:1.ea'`. Metin uyum için hafifçe düzeltilebilir (başka düğüme atıf, sayı, ad çakışması); düzeltilen düğümün kaynağının sonuna `*` konur. Karma başına en çok 12 düzeltme.
- **Kimlik:** her satır kendi skill'inin kimliğini keskinleştirir (ör. Whirlwind = çevre / sürekli dönme, Charge = giriş / sersemletme). Satırın a ve b yönleri yine farklı oynar. Pasif satırı class'ın genel kimliğini taşır.
- **Nadir sinerji:** karma başına **1-3 düğüm** başka bir skill'e bağlanır (`syn`). Geri kalanı yalnızca kendi skill'ini güçlendirir.
- **İlgi çekici:** sıkıcı düz sayı yerine "an" yaratan düğüm tercih edilir; filler'lar bile skill'e özgü olur.
- Karma A ile Karma B gerçekten **farklı** iki seçenek olur: her satırda farklı bir yön ya da ton (en çok 15 ortak düğüm).
- NEW (yeni mekanik) karma başına en çok 4; mümkünse az.
- Bar: 5 bonus, herhangi bir varyantın bar bonuslarından seçilir (kaynak `'V3:bar2'`).

**Veri:** `public/mockups/skill-tree-moments/mix/<cls>.js`
```js
/* <CLASS>: 2 karma ağaç (content-designer, 2026-10-22). Kaynak: variants/<cls>.js */
(window.SMM_MIX = window.SMM_MIX || {})['archer'] = {
  cls: 'archer',
  mixes: [
    { title: 'Name',                    // EN, 1-3 kelime
      theme: 'EN ≤ 120',
      tr: 'TR ≤ 160, Ömer için genel özet',
      rowsTr: ['Sharpshooter: ...', 'Quick Shot: ...', 'Piercing Arrow: ...', 'Arrow Rain: ...', 'Aimed Shot: ...'], // TR, 5 satır (pasif, 3 aktif, ult), her biri ≤ 110: o skill bu karmada ne olur
      mastery: 'X Mastery',
      bar: [['Name', 'Effect', 'V3:bar0'], ... 5 adet],
      syn: { '2.mb': 'Quick Shot' },    // 1-3 sinerji düğümü: anahtar → bağlandığı skill adı
      nodes: { '0.f1': ['Name', 'Effect', false, 'V2:0.f2'], ... 60 anahtar } }, // 3. eleman true = NEW
    { ... Karma B ... }
  ]
};
```
Denetim: `node <scratchpad>/check-variants.js <cls> --mix`.

## 6. Karma özeti (ajan raporlarından, 2026-10-22)
Hepsi denetimden geçti (11 dosya × 2 karma × 60 düğüm, kurallar testi 0 hata). Sayılar taslak, sim yok.

### defender — A Stone Rampart / B Iron Reprisal (ortak 0, NEW 2/3)
A: yerinden kıpırdamayan duvar; Slam yavaşlatır/sersemletir, Taunt dayanır, Close Ranks öldürücü darbeyi üstlenir. Sinerji: Fist Crush kill → Taunt cooldown sıfır; Fist Crush yavaşlatılanlara iner.
B: misilleme tankı; dikenli aura, Slam zırh kırar, Taunt düello + Riposte, Close Ranks vurana Jinx. Sinerji: Taunt kırılmazsa Fist Crush 2 tur erken; Close Ranks'ın üstlendiği vuruşlar Fist Crush'a eklenir.
### gambler — A Push Your Luck / B Sleight of Hand (ortak 0, NEW 3/3)
A: risk ve seri; Double or Nothing seriyle büyür, Loaded Dice yeniden atılır, High Stakes can yatırıp 3-4x, All In MP ile büyür. Sinerji: Loaded Dice kritik → sonraki bahis Jackpot şansı; Jackpot → Card Trick'e kart.
B: hileli masa + kontrol; ilk bahis hep tutar, Loaded Dice ıskalamaz (Jinx/MP çalma), Card Trick durumunu sen seçersin. Sinerji: Jinx'li hedefi Card Trick hep bayıltır; High Stakes kaybedince sonraki All In kesin.
### archer — A Still Bow / B Running Hunt (ortak 0, NEW 2/1)
A: kıpırdamayan nişancı; uzak hedefe kritik/zırh delme, Quick Shot yavaşlatıp kör eder, Piercing geçtikçe sertleşir, Aimed Shot zırh yaran tek atış. Sinerji: yaklaşana bedava Quick Shot; yağmurdan geçen Piercing hasar kaybetmez.
B: hep hareket eden avcı; Haste'le büyüyen pasif, seri Quick Shot, Piercing arkayı vurur, Aimed Shot canı azalanı bitirir. Sinerji: aynı tur yürü + Quick Shot; her 2. Quick Shot Arrow Rain cooldown -1.
### hexer — A Grim Verdict / B Plague of Misfortune (ortak 0, NEW 2/3)
A: tek kurbana Omen yığ, çürüme olgunlaştırır, Doom ile infaz; Evil Eye kritikte 3 Omen. Sinerji: Evil Eye Withered hedefe daha çok kritik; Doom Mark kalan çürümeyi +%50 tek seferde vurur.
B: lanet sıçrar, Omen'li düşman ıskalar/sırasını kaybeder; Evil Eye kör eder, çürüme bulaşıcı. Sinerji: Evil Eye ıskalamış hedefe sert; Doom Mark'tan sağ çıkan 2 tur Jinxed.
### antimage — A Silent Hunt / B Warden's Well (ortak 0, NEW 1/3)
A: saldırgan; Mana Overflow engellediğine geri vurur, Mana Steal hançer yağmuru, Drain Field toplu susturur, Spell Ward tuzak kalkan, Void Strike MP'siz hedefi infaz. Sinerji: 0 MP'de ölen düşman Void Strike cooldown kısaltır; susturulmuş hedefe Void Strike +%20.
B: takım; Overflow dostlara MP, Mana Steal buff söker + iyileşir, Drain Field alan tutar, Spell Ward debuff temizler, Void Strike kör/sersem/buff çalma. Sinerji: Void Strike sonrası Mana Steal fazla hançer; Void Strike Overflow'u tetikler.
### undead — A Blood Price / B Grave Blight (ortak 0, NEW 2/3)
A: canla öder; Vampiric Bite can azaldıkça çok emer, Bone Throw Slow/Stagger/Stun/Silence kilit, Wail can yakıp sert vurur, Dark Bond canını dosta aktarır. Sinerji: Wail için ödenen can bağlı dosta şifa.
B: çürümeden beslenir; Wither tıkları iyileştirir, Wail zehir zemini yayılır, Bone Throw Overextended yapar, Dark Bond'da dostun vuruşu besler. Sinerji: bağlı dost ölürse Raise Dead cooldown sıfır / dost iskelet olarak kalkar.
### druid — A Thornwrath / B Deep Roots (ortak 1, NEW 1/3)
A: intikamcı orman; katil sersemler/ağır hasar yer, Thorn Whip kanca kırbaç, Wrath büyük patlama, Treant ön sırayı ezer. Sinerji: pasif tetiklenince katile bedava kritik Thorn Whip; dost düşünce katile bedava Wrath. VARSAYIM: pasif dost %30 altına inince de tetikleniyor (onay lazım).
B: sabırlı orman; Wither ölenden yanındakine geçer, Thorn Whip az canlıyı bitirir, Wrath kök tarlası, Rejuvenate fazla şifa kalkan, Treant uzun yaşayan duvar. Sinerji: Treant ayaktayken Rejuvenate cooldown -1; Rejuvenate'te Treant da yarım güçle şifa.
### cutthroat — A Rot and Ruin / B Ghost Blade (ortak 0, NEW 0/3)
A: yıpratan suikastçı; Venom Edge zehir (Wither), Saltire dikenli bıçak yağmuru, Smoke Bomb susturur/kör eder, Backstab statüleri hasara çevirir. Sinerji: Backstab Venom zehrini tek vuruşta boşaltır; susturulmuş hedefe Backstab ek hasar.
B: hayalet suikastçı; Venom Edge az canlıyı bitirir, Saltire merkezde kritik, Smoke Bomb dostları saklar/pusu, Backstab vur-kaybol. Sinerji: kör saldırgana kritik karşı kesik; Venom öldürünce Backstab cooldown -1.
### mage — A Fire and Frost / B Arcane Tempo (ortak 0, NEW 2/2)
A: Fire Bolt ve Meteor yakar, Blizzard ve Mana Barrier dondurur; Spell Echo ateşi patlatır ya da yavaşlatıp susturur. Sinerji: pasif yankı Fire Bolt'a da işler; kalkan kırılınca saldırana kesin kritik Fire Bolt.
B: element yerine büyü ustalığı; yankılar cooldown kısaltır, Fire Bolt öldürünce bedava tekrar, Mana Barrier MP kuyusu, Meteor öldürünce yeniden hazır. Sinerji: Meteor Blizzard cooldown'unu sıfırlar.
### paladin — A Dawn Crusade / B Oathkeeper (ortak 0, NEW 1/2)
A: saldırgan; Divine Light iyileştirirken düşmanı çarpar, Holy Strike art arda büyür, Judgment ateşi yayılır, dirilen dost Haste/alevle kalkar. Sinerji: Judgment ateşindekine Holy Strike fazla hasar; Radiance sonrası Judgment cooldown sıfır.
B: koruyucu/fedakâr; Divine Light kalkan verir, Holy Strike Taunt/MP, diriltilen Fortified+Blessed, Judgment kör/sersem/arındırma. Sinerji: art arda iki Holy Strike → Resurrection ya da Radiance bedava. En cömert şifa evolve'ları alınmadı.
### warrior — A Blood and Fury / B Iron and Bone (ortak 1, NEW 1/3)
A: acı ve Rage yakıt; darbe yiyince güçlenme, Double Strike Rage toplayıp yakar, Whirlwind herkesi kanatıp can çalar, Headsman's harcanan Rage'le büyür. Sinerji: Charge sonrası Headsman's 10 daha az Rage.
B: düşmez, hattı kırar; ölümcül darbeden 1 canla kalkma, Double Strike ilk darbe ikinciyi hazırlar, Whirlwind çeker/kör eder, Charge koçbaşı, Headsman's sağ kalanı sersemletir. Sinerji: sersemlemiş hedefe Headsman's ıskalamaz + kritik.

## 7. Ömer'in satır seçimleri (2026-10-22)
Ömer her class için satır satır Karma A ya da B seçiyor; kaynak dosya `public/mockups/skill-tree-moments/final.js` (`rows = [pasif, aktif 1, aktif 2, aktif 3, ult]`). Mastery adı ve bar bonusları pasif satırının karmasından gelir. Mockup'ta "Seçim ✓" sekmesi.
- **Warrior:** Berserker B, Double Strike B, Whirlwind A, Charge A, Headsman's Blow B. Çapraz kontrol: A'nın Charge sinerjisi (Into the Fire: Charge sonrası Headsman's 10 Rage ucuz) B'nin ult'uyla çalışır; B ult'unun Stun kolları A'nın Charge Stun'uyla çalışır. Bar: Iron Mastery (B).
- **Defender:** Bulwark A, Tremor Slam A, Taunt A, Close Ranks A, Fist Crush (ult) B. Bar: Rampart Mastery (A). Sinerji düğümlerinin hiçbiri seçilen satırlara düşmüyor (A'nınkiler ult satırında, B'ninkiler Taunt/Close Ranks satırlarında). Ömer "Tremor evolve güçsüz mü?" dedi: evet, yalnızca şekil değişimi + 1 tur Slow idi. Earthsplitter artık artı şekli (satır + sütun) vuruyor ve 3 tur Slow (src V2:1.v*, geri alınabilir).
- **Paladin:** Divine Light A, Holy Strike A, Resurrection B, Judgment A, Radiance (ult) A. Bar: Crusade Mastery (A). İki sinerji de düşüyor: 3.f2 (Judgment satırı) → Holy Strike, 4.l1 (ult) → Judgment. Seçimdeki YENİ mekanikler: A 4.d1 Focused Beam (Radiance tek hedef ışın), B 2.v Martyr Rising (Resurrection hazırken düşersen %40 canla kalkarsın); ikisi de onaylandı (2026-10-22 form).
- **Archer:** Sharpshooter A, Quick Shot A, Arrow Rain A, Aimed Shot (ult) B; **Piercing Arrow için Ömer iki karmayı da istemedi ("yeni öner")**: `alts.js` içinde 3 yeni satır, C Ricochet (sekme), D Bodkin Point (zırh kırma; Sunder NEW, Aimed Shot sinerjisi), E Suppressing Fire (Jinx / Silence). final.js `try: {2: [c,d,e]}`: Seçim sekmesi her öneri için ayrı; Ömer seçince harf yazılır, try silinir. Exposed Perch metni netleşti: +2 sıra yalnızca uzaklık bonuslarında (Range Keeper'ın bedava Quick Shot'ı da alır), Range Keeper'ın "3 mesafe" tetiği gerçek mesafeye bakar. Range Keeper (A 0.mb) NEW, onay bekliyor.
- **Cutthroat:** Opportunist B, Venom Edge B, Saltire Cut B, Smoke Bomb A, Backstab (ult) B. Bar: Ghost Mastery (B). Düşen sinerjiler: B 0.mb Turned Blade → Smoke Bomb (A'nın Smoke Bomb'u da Blind veriyor, çalışır), B 1.ma Clean Kill → Backstab (ult B). A'nın ult sinerjileri düşmüyor. Çapraz not: A 3.ma Lost in Smoke (Blind'lı düşman ıskalayınca Staggered) ile B 0.eb Counter Cut (yakın dövüşçü ıskalayınca karşı kesik) aynı ıskayla birlikte tetiklenir; A 3.fb Hard Clay ise Blind'ı kaldırıp Turned Blade'i boşa çıkarır (blood price bedeli). NEW: B 0.eb Counter Cut, onay bekliyor.
- **Mage:** Spell Echo B, Fire Bolt B, Blizzard A, Mana Barrier A, Meteor (ult) A. Bar: Arcane Tempo Mastery (B; genel, her satırla çalışır). Düşen sinerji: A 3.v Shatter Aegis → Fire Bolt (kırılan kalkan bedava, kesin kritik Fire Bolt atar); B'nin kritik odaklı Fire Bolt satırıyla daha da güçlü (Weak Spot, Searing Crit, Sunfire'ın kritik sıçraması; Hot Streak bu kritikten sonraki Fire Bolt'u da kesin kritik yapar). B'nin ult sinerjisi (4.u2 → Blizzard) ult A seçildiği için düşmüyor. Çapraz not: A'nın Fire Bolt yakma satırı gittiği için yanık yalnızca Meteor'un zemininden gelir; B 0.n0 Overload (yankı sonrası tekrar kesin kritik) ile Fire Bolt B kritik zinciri aynı yöne çalışır. NEW: B 1.mb Rolling Doom (Fire Bolt öldürünce bedava tekrar), A 2.v Eternal Winter (Blizzard alanda 2 tur kalır), A 4.d3 Twin Meteors (bir tur sonra ikinci meteor); üçü de onay bekliyor.
- **Druid:** Nature's Grudge B, Thorn Whip B, Nature's Wrath B, Rejuvenate B, Summon Treant (ult) A. Bar: Deep Roots Mastery (B; Barkskin ult A'nın Treant'ıyla da çalışır). Sinerjilerin hiçbiri düşmüyor: A'nınkiler (0.mb → Thorn Whip, 0.v → Nature's Wrath) A pasif satırında, B'ninkiler (4.l2 / 4.l3 → Rejuvenate) B ult'unda. Çapraz not: ult A 4.r2 Heavy Smash (Slow / Stun'lı düşmana +%25) Nature's Wrath B'nin Slow / Stun'larıyla (kök tarlası, Tangleroot, Strangling Grove) birlikte çalışır; B 0.f3 Choking Grip de aynı Slow'ları kullanır. B pasifinin 0.n0 Rot Remembers'ı (dost %30 altına düşünce saldıran Withering) artık seçili içerik. NEW: B 2.v Thicket Wave (Nature's Wrath bir tur sonra aynı hücreleri yeniden vurur), B 3.n0 Overflowing Cup (fazla şifa kalkan olur; Rejuvenate satırının giriş düğümü, onaysız kalırsa satırın geri kalanı da kilitli), A 4.d3 Living Bomb (Treant varken yeniden çağır: eskisi patlar); üçü de onay bekliyor.
- **Undead:** Vampiric Bite A, Bone Throw A, Wail of the Dead A, Dark Bond A, Raise Dead (ult) B. Bar: Blood Price Mastery (A). İki sinerji de düşüyor: A 2.eb Blood Hymn ve 2.fb Bitter Gift → Dark Bond (Wail'in ödediği can bağlı dostu iyileştirir). B'ninkiler (3.eb / 3.mb → Raise Dead) B'nin Dark Bond satırında, düşmüyor. Çapraz not: ult B 4.u1 Grasping Hands (iskelet vuruşu Slow) + 4.u2 Cold Grip, Bone Throw A'nın Slow'lu hedef düğümleriyle (Knee Breaker, Shattered Shin, Grave Shackle) birlikte çalışır. Ult B 4.r3 Rot Bomb Withering patlatır ama Undead'in kendi Withering'i yok; yalnızca takımda Druid varsa işe yarar. NEW: A 0.ma Undying Thirst (bir kez ölümcül darbede 1 canla kalır, sonraki vuruş %100 emer), A 0.mb Stolen Remedy (Wound'lu düşman iyileşince Wound'un engellediği kadar sen iyileşirsin); ikisi de onay bekliyor.
- **Hexer:** Ill Omen A, Evil Eye A, Withering Curse B, Jinx B, Doom Mark (ult) B. Bar: Verdict Mastery (A; Long Rot ve Carrion Feast B'nin Withering Curse'üyle de çalışır). Düşen sinerjiler: A 1.r Rheumy Stare → Withering Curse (B'nin Curse'ü de Wither verir, çalışır), B 4.l2 Cowed Foe → Jinx (ult B, l kolu seçilirse). Düşmeyenler: A 4.r3 (A ult), B 1.r (B Evil Eye). Çapraz not: Omen ekonomisi tek yöne akar: Evil Eye A Opening Glare / Fatal Glance + Withering Curse B Herd Curse / Plague Tide Omen ekler, Ill Omen A Doom'u güçlendirir, ult B Doom Mark Omen toplar. NEW: A 0.v Herald of Ruin (lanetli düşman ölünce en yakına Omen'leri kadar Doom), B 2.v Plague Curse (Wither bulaşıcı), B 3.v Turned Hand (Jinx'li düşmanın sonraki saldırısı kendi dostuna), B 4.l3 Last Rite (bir kez 1 canla kalır ve öldürene bedava Doom Mark); dördü de onay bekliyor.
- **Anti-Mage:** Mana Overflow B, Mana Steal B, Drain Field A, Spell Ward B, Void Strike (ult) B. Bar: Warden's Mastery (B; Wide Basin A'nın Drain Field'ıyla da çalışır). Düşen sinerjiler: B 4.d2 Ready Blades → Mana Steal ve B 4.d3 Overflow Strike → Mana Overflow (ikisi de ult'un d kolunda; tek kol kuralıyla d kolu seçilirse ikisi birden). Düşmeyenler: A 0.mb → Void Strike (A pasif), A 4.l1 → Drain Field (A ult). Çapraz not: MP yakma zinciri: Mana Steal B MP yakar, Drain Field A 0 MP'deki düşmanı Silence'lar (Sure Hush, Heart of Quiet, Mass Hush), ult B u3 Void Shackle 0 MP'deki hedefi Stun'lar. İsim çakışması: B 3.fb Ironbound Oath, Defender'ın Ironbound Oath düğümüyle aynı ad (farklı class, kod çakışmaz; ad değişikliği Ömer'e soruldu). NEW: B 0.v Endless Spring (dostların büyü zırhının engellediği de sayılır), B 3.v Mirror Ward (emdiği büyünün %50'si saldırana döner), B 4.l3 Grand Theft (hedefin tüm buff'larını çalıp takıma dağıtır); üçü de onay bekliyor.
