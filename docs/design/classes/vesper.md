# Vesper

> **Ne için / Güncel mi (2026-11-08):** Vesper kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/vesper.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `vesper` / Bell Caster |
| Ön sıra önceliği, menzil | 7, menzil 6 |
| Stat (STR / INT / DEX / LUCK) | 21 / 26 / 5 / 8, ana stat INT (toplam 60) |
| Zırh / büyü zırhı | 22 / 0 |
| YZ profili | `vesper` (`data/ai.json > profiles.vesper`) |
| Pasif | **Pealing Bells**: "Every Toll or Thunderpeal you ring makes your bells 7% stronger for the rest of the battle (no limit)." |

- Çan büyücüsü, arka sıra, INT ana stat, silah ailesi asa (`ash_staff`, Mage ile aynı). Arketip: batık bir katedralin çan kulesinin bekçisi. Çan sesi = kutsal, gök gürültüsü = şimşek. Arka sıradan ALAN hasarı veren, savaş uzadıkça güçlenen büyücü. Şifa YOK. Zamir: she.
- Ad: brifte "Bellwarden" idi, Ömer kararıyla Vesper (id `vesper`). Görünüş (yön A "Bronze Abbess"): uzun boylu yaşlı başrahibe, beyaz-altın cüppe, sırtında zincirli yeşil pas tutmuş bronz çan, elinde asa olarak çanın demir tokmağı.
- Sanat durumu (2026-11-01): gövde kendi pozları (`vesper_v2`), efektler (`src/game/art-v2/vesper/vfx.ts`, `assets/vfx/vesper/`) ve sesler (`data/audio-v2/vesper.json`) kendi; ikonlar, logo, avatar ödünç (Ömer bu işte istemedi). Güncel sanat durumu: `docs/arch/areas/character-vfx.md`.
- Sayılar kesin (Ömer 2026-11-08: PROVİZYON kaldırıldı). Ağaç Ömer onaylı (2026-10-31); ağaç sayıları sim bekliyor.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

### Pasif motoru: Pealing Bells
- Çalınan her Toll ya da Thunderpeal (`ringsBell: true`) savaşçıdaki `bells` sayacını +1 artırır (debug kullanımı saymaz; ağaçtan gelen bedava kullanımlar sayar). Sayaç savaş başında 0.
- `bell: true` taşıyan hasar etkileri `1 + perBell x bells` ile çarpılır (`spec.ts > damageSpecFor`; motor, önizleme ve YZ aynı fonksiyonu kullanır). Sayaç skill'in KENDİ hasarından sonra artar (ilk Toll x1,00 vurur). Dört skill'in hasarı da `bell: true`; yalnız Toll ve Thunderpeal çan çalar (ağaç ek çan çaldırabilir).
- Great Bell ayrıca `powerPerBell`: güç = taban + `powerPerBell` x çan (iki hasar satırında ayrı ayrı), üstüne Pealing Bells çarpanı. İpucu metinleri `src/engine/skill-info.ts`.
- **Çan sayacı ve Endless (Ömer 2026-10-31):** Endless'ta dalga arasında sıfırlanır (her dalga ayrı savaş; başlangıç çanları her dalgada yeniden verilir). Savaş içi Round 2/3 dalgalarında sayaç sürer. `tests/vesper.test.ts` kilitler.

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Toll (`toll`) | Tüm düşmanlara küçük kutsal hasar; çan çalar (`ringsBell`). Sayaç kurucusu. | 4 / yok | sınıf (6) | hasar magic/holy INT 0,467, bell=true |
| Thunderpeal (`thunderpeal`) | Bir düşman sırasına şimşek hasarı + Blinded 1 tur; çan çalar. | 12 / 2 | sınıf (6) | hasar magic/lightning INT 0,764, bell=true; status: status=blinded, turns=1; area={shape:row} |
| Cracked Bell (`cracked_bell`) | Tek düşmana kutsal hasar, belli ihtimalle Stun; çan çalmaz. | 10 / 3 | sınıf (6) | hasar magic/holy INT 1,15, bell=true; status: status=stun, turns=1, chance=0,5 |
| Great Bell of Valdoria (`great_bell_of_valdoria`) | Ult: tüm düşmanlara kutsal + şimşek hasarı; güç çan sayısıyla büyür (`powerPerBell`); çan çalmaz. | 22 / 4, ilk 2 | sınıf (6) | hasar magic/holy INT 0,488, bell=true, powerPerBell=0,025; hasar magic/lightning INT 0,329, bell=true, powerPerBell=0,025 |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/vesper.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Sürüm 3: 2026-11-08'de yeniden kuruldu (Ömer: ilk ağaç "çok generic"); aynı şekil, kahramanlara bir kez bedava respec. Her düğüm Vesper'ın kendi skill'inin oynanışını değiştirir; satırlar: çan ritmi (pasif), Toll (seri çalma), Thunderpeal (Blind ve sıra), Cracked Bell (Stun, tek hedef). Test: `tests/vesper.test.ts` (her düğüm), `tests/ai-coverage.test.ts` bölüm 7b (her tetik YZ'de).

Veri: `data/skill-trees/vesper.json` (sürüm 3, bar "Belltower Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Pealing Bells (pasif):** dolgu Bronze Throat, Counted Strokes, Full Peal, Prime; anahtar Matins; yön A Quickening Peal (ödül Call to Prayer, uç Racing Peal); yön B Struck Bronze (ödül Angelus, uç Cracked Throat); evrim Cathedral Choir. Anahtar: "You start each battle with 1 bell already rung."
- **Toll:** dolgu Steady Stroke, Ringing Ears, Dread Peal, Lingering Ears; anahtar Triple Peal; yön A Unbroken Rope (ödül Endless Toll, uç Hammered Rope); yön B Knell (ödül Passing Bell, uç Muffled Knell); evrim Death Knell. Anahtar: "Every 3rd Toll rings 1 extra bell."
- **Thunderpeal:** dolgu Afterglare, Crowded Row, Searing Flash, Dazzled; anahtar Lingering Flash; yön A Forked Peal (ödül Storm Front, uç Overcharged); yön B Thunderstruck (ödül White Flash, uç Blinding Storm); evrim Storm Tower. Anahtar: "Thunderpeal Blinds for 1 more turn."
- **Cracked Bell:** dolgu Bronze Memory, Jarring Note, Bell-Breaker, Aftershock; anahtar Ringing Skull; yön A Resounding Crack (ödül Death Bell, uç Brittle Bell); yön B Toll for One (ödül Bell-Toll Verdict, uç Heavy Bronze); evrim Sundered Bell. Anahtar: "When Cracked Bell Stuns, ring 1 bell."
- **Ult Great Bell of Valdoria (tek kol seçilir):** u Echoing Hall, Royal Peal, Peal of Ages; r Crown of Lightning, Glaring Peal, Judgement Peal; d Shaking Peal, Last Peal, Final Toll; l Tower Watch, Bell of Kings, Evensong.
- **Bar Belltower Mastery:** 5 First Toll, 10 Vigil, 15 Thunder After, 20 Iron Rope, 25 Vespers' Hour.

## 4. YZ notları

- Profil: `data/ai.json > profiles.vesper`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).
- Kalkansız büyücü kalıbı: öncelikler kill / aoe / tactic / damage, `aoeMinTargets`, ult için `reserveMp`.
- YZ çan büyümesini değerlendirir: `ringsBell` skill'i, bir çanın sonraki çan vuruşlarına katacağı hasar kadar değer alır (`bell.horizon`, `discount` veride). Ağaç kancaları da terazide (`ai.ts > bellValue`, `treeTriggerValue`, `treeProcStatusValue`, `armedCostValue`).
- **YZ açıkları: ÇÖZÜLDÜ (2026-11-08, `docs/arch/areas/combat-design.md` Durum):** `statusEffectWorth` isabeti sayar; `cooldownDelta` ve `statusPotency` değerleniyor (test `tests/ai-coverage` bölüm 10). Gönderimle birlikte bu madde silinir.

## 5. Açık işler / kararlar

- Ömer 2026-11-08: Thunderpeal'e `shocked` verilmesi HAYIR (Thunderpeal Blind + çan olarak kalır). Mastery 15 Thunder After uygulandı ("Blinded enemy misses, ring 1 bell", `enemyMissed`); YZ değeri + testler var, sim bekliyor.
- Ağaç sayıları için sim: Ömer onayıyla 300'lük Endless + sefer simi.
- Thunderpeal ilk şimşek KAHRAMAN skill'i; `tests/lightning-element.test.ts` Vesper istisnasıyla güncellendi.
- **Kampanya buluşması (dr19 Sunken Chapel, `data/campaign/drowned-reach.json`, olay `dr_vesper`, Ömer onaylı 2026-10-31):** iki seçenek: Vesper bölüğe katılır (`join: vesper`; bölük 4 ise kışlada yedek bekler) ya da emanet Clapper of the Sunken Bell (trinket, Legendary, kritik vuruş Blinded; `eventOnly`). Bölükte / kışlada / Inn'de zaten Vesper varsa kabul seçeneği gizlenir. Kışla-yedek kuralı (`state.ts > joinHero`, `COMPANY_MAX`) kampanya konusudur; olay metni, emanet tablosu ve kural ayrıntısı arşivdeki eski belgede.
- Havuzlar: Quick Battle / MP rastgele havuzu, Endless, kampanya `companyPool` + `recruitPool`; golden kayıtları havuz değişince yeniden kaydedilir.

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/vesper.md`.
