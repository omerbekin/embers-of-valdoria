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
