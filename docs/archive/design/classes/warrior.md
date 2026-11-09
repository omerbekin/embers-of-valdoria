> Ne için: docs/design/classes/warrior.md belgesinden 2026-11-08'de taşınan eski tam metin (karar günlüğü, ara değerler, eski tablolar); güncel değil. Güncel belge: docs/design/classes/warrior.md.

# Warrior

Sayılar: `data/classes/warrior.json`, `data/skills.json`, ağaç `data/skill-trees/warrior.json` (sürüm 1, "Iron Mastery"). Çerçeve: `docs/design/classes.md`. Ağaç kuralı: `skill-tree-logic.md`. Son güncelleme 2026-11-08.

## 1. Kimlik
- **Melee Bruiser**, ön saf, menzil 1, ana stat STR. Statlar STR 26 / INT 12 / DEX 8 / LUCK 14. Zırh 16, büyü zırhı 0 (Ömer 2026-11-08: 18 -> 16). Kaynak: Rage.
- Fikir: kalkansız, iki elli baltayla dalan, kanla beslenen savaşçı. Dalar, kan kaybeder, kanla geri döner ve bitirir.
- **Güçlü:** canı düştükçe çok sert vurur; Rage ile tek dev darbe; Whirlwind ile can çalar.
- **Zayıf:** büyü zırhı yok; gücü düşük cana bağlı, sağlam başlayan savaşta yavaş açılır; kontrolü (Slow, Stun) azdır, ağaç bunu doldurur.
- Denge: Quick Battle ölçümünde bant üstü (%56,1 / %53,9, 2026-11-08). Ömer kararıyla ek nerf yok; yalnız zırh 16 ve Double Strike 0,35'e inildi (bu son hâl ölçülmedi). Ayrıntı `docs/balance.md`.

## 2. Skill'ler
| Skill | Ne yapar | MP / bekleme | Sayı |
|---|---|---|---|
| Double Strike (`melee_attack`) | Tek hedefe iki fiziksel vuruş; Rage üretir | 0 / yok | STR 0,35 x 2 (Ömer 2026-11-08, eskisi 0,38) |
| Whirlwind | İlk iki düşman sırasını süpürür (rect 2x3); verdiği hasarın bir kısmı can olur | 8 / 3 | STR 0,45, lifesteal %20 |
| Charge | Arka sıradaki dahil tek hedefe atılır, hasar + Stun | 10 / 4 | STR 0,675, Stun 2 tur, menzil 4 |
| Headsman's Blow (ult) | Tüm Rage'i (en az 30) harcayıp tek dev balta darbesi | 30+ Rage (hepsi) / 5, ilk bekleme 1 | STR 0,5 + 0,025 x harcanan Rage |

Görsel: Headsman vfx'i v2'de (kaldırış + kor dolumu, dikey iniş, zemin çatlağı); ult ikonu yer tutucu (`warcry`).

## 3. Pasif ve ağaç mantığı
**Pasif Berserker:** canı azaldıkça en çok %80 fazla hasar; kaybedilen can da Rage verir (maks canın %1'i başına 0,4 Rage, vuruş başına en çok 15).

Ağaç = "can düşük + Rage" kimliğinin her skill'e yayılması. Her satırda f1-f3 küçük koşullu ek, n0 anahtar davranış, ea / eb iki yön (biri alınca öbürü kilitlenir), ma / mb yönün ödülü, fa / fb bedelli uç, v evrim.

| Satır | n0 (anahtar) | ea yönü | eb yönü | Evrim (v) |
|---|---|---|---|---|
| Berserker | Iron Retort: canı %50 altına indiren ilk düşman Stun yer | Measured Mending: düşük canda gelen şifa fazla, yüksekte yarım. Ödül Red Line (üst şifa kalkana döner). Uç Grave Pact (düşük canda lifesteal, yüksekte -%15 hasar) | Stand Firm: canın %30+'ını alan vuruş %25 az vurur. Ödül Not Today (ölümcül vuruşta 1 can kalır). Uç Iron Will (Stun/Slow kısa, şifa -%20) | Undying Rage: %25 altında kritik olmayan vuruş canı 1'in altına indiremez, vuruş başına 10 Rage |
| Double Strike | Gut Strike: ilk vuruş Wound açar, ikinci vuruş yaralıya +%8 | Hamstring: Slow. Ödül Hobble. Uç Crippling Pair (Slow 2 tur, -%15 hasar) | Deep Gash: Wound 4 tur. Ödül Butcher's Carve. Uç Third Cut (yaralıya üçüncü vuruş, kritik yok) | Skull and Knee: ilk vuruş Slow, ikinci Stun; 2 tur bekleme |
| Whirlwind | Gore Wheel: vurduğu herkese Wound | Thirst: Wound'lu düşmandan lifesteal 2 kat. Ödül Blood Glut (fazla şifa Rage olur). Uç Glass Cyclone (lifesteal +%12, +%15 hasar alma) | Reaping Wind: her vurulandan Rage. Ödül Crimson Wheel. Uç Reaper's Spin (yaralıya +%15, yaralı olmayana hasar yok) | Exsanguinate: Wound'u koparıp +%20 hasar, çift lifesteal |
| Charge | Roaring Charge: ilk Charge Rage'i en az 30'a çeker | Grudge Charge: son vuran düşmana fazladan Stun. Ödül Payback. Uç Martyr's Rush (herkesi Taunt eder, +%15 hasar alma) | Blood Up: dolu canlı hedefe +10 Rage. Ödül Into the Fire (Headsman 20 Rage'e iner). Uç Reckless Heat (20 Rage, Stun 1 tur) | Herald of Ruin: tuttuğun Rage başına +%1 güç, Stun bitince 10 Rage iade |

- **Neden böyle:** Warrior'ın tek derdi "hayatta kalıp dolmak". Berserker satırı iki cevap sunar: düşük canda şifa / lifesteal ile yaşa (ea), ya da tek ağır vuruşu yutup ayakta kal (eb). Double Strike ve Whirlwind Wound ile ortak dil kurar (yaralı hedef = bonus). Charge Rage'i Headsman'a taşır.
- **Ult kolları (Headsman's Blow):** u = can çalma (Feast, Gravedigger, Grave Robber); r = Stun (Ringing Headsman, Heavy Toll, Mercy Stroke); d = korunma (Grim Calm, Clean Slate, Executioner's Calm); l = korku / körlük (Dreadful Swing, Blinding Spray, Terror). Yalnız tek kol seçilir.
- **Bar (Iron Mastery):** 5 Heavy Hand (ilk skill Slow), 10 Second Wind (%30 altına ilk düşüşte %8 şifa), 15 Crushing Weight (Stun / Slow / Staggered düşmana +%3), 20 Stubborn Heart (%25 altında tur başı %2 şifa), 25 Stagger Step (Stun'dan sonra sıra %30 erken, savaşta bir kez).
- Toplam 60 düğüm (4 satır x 12 + ult 12), bar ayrı. Her düğüm YZ değeri + testle gelir (`skill-tree-logic.md`).

## 4. Ömer kararları
- **Berserker (Ömer onayı 2026-10-17, wr1; open-questions-archive madde 338):**
  - Kalkansız, iki elli baltalı, kanla beslenen gözü kara savaşçı.
  - Pasif: canı azaldıkça sert vurur (eski kural) ve can kaybettikçe Rage kazanır; Rage artık yalnızca vurarak gelmez.
  - Double Strike aynı (Rage üretir). Charge aynı (arka sıraya atılma + Stun).
  - Whirlwind: ilk iki düşman sırasını süpürür (ön sıra + arkasındaki; Ömer 2026-10-20, rect 2x3); verdiği hasarın bir kısmı Warrior'a can olarak döner. Ömer notu: skill'ler değiştirilmedi, Whirlwind'e ek yapıldı.
  - Ult Headsman's Blow, Abyssal Cry'ın yerine: yakın dövüş tek hedef, bütün Rage'i (en az 30) tek darbeye harcar; hasar harcanan Rage'le ve hedefin eksik canıyla büyür ("şimdi 30 Rage ile mi vursam, 50'ye kadar bekleyip kafasını mı alsam?").
  - Görsel / ses o gün yer tutucuydu (Headsman animasyonu 2026-10-23'te yapıldı); sayılar balance-tester'ın.
- **2026-11-08 akşam:** zırh 16, Double Strike 0,35 (iki vuruş). Ömer "şimdilik değiştirme" demişti; bu son hâl ölçülmedi.

## 5. Açıklar
- Headsman's Blow'un eski notu "30 Rage 1,1 / 50 Rage 1,5 STR" diyor; veri şimdi 0,5 + 0,025 x Rage (30 Rage = 1,25). Eski karardaki "hedefin eksik canıyla büyür" (executeBonus 0,6) 0.9.10.4'te (2d63cca8) kaldırıldı, powerPerRage 0,02 -> 0,025. **Ömer kararıydı, o gün not düşülmemişti (Ömer 2026-11-08 doğruladı: bugünkü haliyle kalır).** Headsman's Blow artık yalnız harcanan Rage ile büyür; motor desteği (`executeBonus`, spec.ts) ağaç düğümleri için duruyor.
- Double Strike 0,35 x 2 ve zırh 16 için sim yok.
- Düğüm sayıları tahmin; ağaç sim'i Ömer onayıyla.
