# The Bridge Warden: King's Bridge boss tasarımı (UYGULANDI)
> **Ne için / Güncel mi (2026-11-08):** Bridge Warden boss'unun kimliği, skill mantığı, fazları, YZ özeti. UYGULANDI. **Geçerli sayı: `data/bosses/bridge_warden.json` (stat, `overrides.hp`, `anchor.armorAdd` / `magicArmorAdd`, pasifler, fazlar), `data/bosses/iron_mooring.json`, `data/skills.json` (skill gücü/MP/CD), `data/campaign/encounters.json > bridge_warden` (sefer çarpanı), `data/ai.json > profiles.bridge_warden` ve `telegraph`.** Bu belgede sayı yok; tasarım anı sayıları, tema seçenekleri, motor işleri (M1-M14), arayüz, görsel-işitsel brief, balans hesabı ve sim ayarı `docs/archive/design/bosses/bridge-warden.md` altında.
> Motor: `src/engine/battle.ts` (telgraf, faz, Mooring, Stagger, Unyielding, çekme), YZ: `src/engine/ai.ts`. Durumlar `data/statuses.json` (overextended, staggered, ash_brand, anchored), zemin `data/grounds.json` (flooded_planks). Test: `tests/bridge-warden.test.ts`.

## X'i değiştirmek için
- Can, stat, zırh, Mooring eki, pasif metni: `data/bosses/bridge_warden.json`; Mooring canı/zırhı: `iron_mooring.json`. Test: `tests/bridge-warden.test.ts`.
- Skill gücü, MP, CD, alan şekli: `data/skills.json` (anchor_smash, breaking_span, chain_hook, ash_brand, fall_of_kings_bridge). Sefer çarpanı ve zorluk: `encounters.json > bridge_warden`.
- Sayı değişirse oyun içi pasif/skill metni de veriyle aynı kalmalı (metin veride, İngilizce). Denge: `npm run sim:campaign`.

## 1. Kimlik ve tema
King's Bridge (Bölge II sonu) taş köprüsünü Morvane'in Kül Laneti tutar. **The Bridge Warden**: Kralın köprü bekçisi, "Kral dönene dek kimse geçmez" yemini etmişti; lanet göğsüne bir kor yerleştirdi, bedenini köprünün taşına ve demir palamar zincirlerine kaynaştırdı. Yarı adam, yarı köprü: sırtında kemer taşları, kollarında paslı zincirler, elinde zincire bağlı dev çapa. Defender'ın (gri çelik şövalye) büyütülmüşü değildir; silüeti insan şövalye olmamalı.

- **Mekân = boss:** köprüyü çökertir (telgraflı alan), zincirle çeker (konum), kor yanar (faz).
- **Boss + 2 yardımcı nesne (Iron Mooring):** Warden ön ortada, iki yanda köprü korkuluğuna çakılı demir palamar babaları. Mooring'ler sıra almaz, saldırmaz, ama Warden'ı güçlendirir; kırılmaları oyuncuya karar verdirir: "boss'a vur" mu, "zinciri kır" mı.
- id `bridge_warden` (gizli boss class'ı; rastgele havuzda ve takım seçiminde YOK). Rol: Boss · Siege Giant. Primary STR. Dizilim: Warden yuva 1, Mooring'ler yuva 3 ve 5. Yakın dövüşçüler yalnız Warden'a ulaşır; Mooring'ler uzak/alan skill'leriyle kırılır.
- **Oyuncuya öğrettiği:** telgrafı oku, konum al (Move), yardımcıyı kır, açık verdiği anı (Overextended) cezalandır.
- **Zayıf noktalar:** Mooring kırmak (zırh düşer, Warden Stagger olur, bekleyen Breaking Span iptal); Overextended (+alınan hasar); Faz III'te Ember Heart (zırh yarıya); MP (Ash Brand MP ister: Anti-Mage karşı oyunu); dispel (Mana Barrier Ash Brand'i siler).

## 2. Telgraf kuralı (tüm gecikmeli saldırılar için ortak)
- Telgraflı skill kullanılınca hasar o an gelmez: oyuncu tahtasında hücreler işaretlenir (çatlak plaka), sıra çubuğunda Warden'ın sonraki portresi üstünde skill ikonu belirir.
- **Çözülme: Warden'ın bir sonraki turunun başı**, eylemlerinden önce; işaretli hücrede duran birimler vurulur (hücre tabanlı). İstisna Ash Brand: birime bağlı.
- Adalet: çözülmeden önce karşı taraftaki her canlı, sersem olmayan birim en az bir kez oynar (yoksa ertelenir). Çözülmede isabet zarı yok (oyuncu uyarıldı).
- Aynı anda en fazla bir alan telgrafı + bir Ash Brand bekler; bir turda en fazla bir yeni telgraf. Telgraf her zaman güvenli hücre bırakır. Warden ölünce bekleyen telgraflar iptal.

## 3. Skill'ler (değerler: `data/skills.json`)
| id | Ad | Faz | Özet |
|---|---|---|---|
| `anchor_smash` | Anchor Smash | I-III | Ön sıradaki tek düşmana fiziksel vuruş; her turun "doldurma" eylemi, telgrafsız |
| `breaking_span` | Breaking Span | I-III | Telgraf: Faz I bir sıra (`row`), Faz II-III iki sıra (`rect 2x3`). Çözülmede fiziksel hasar + Flooded Planks zemini, sonra Warden Overextended. Mooring kırılırsa iptal |
| `chain_hook` | Chain Hook | I-II | Arka sıra dahil tek düşman, hedefi kendi şeridinin en öndeki boş hücresine çeker. En az bir Mooring canlıysa; Faz III'te kapanır |
| `ash_brand` | Ash Brand | II-III | Tek düşmanı damgalar (MP ister); çözülmede damgalının o anki hücresi merkezli `plus` büyü/ateş hasarı. Dispel siler, damgalı ölürse söner |
| `fall_of_kings_bridge` | Fall of King's Bridge | III | Faz III'e girerken otomatik telgraf: oyuncu tahtasının tamamı, şerit başına bir Keystone güvenli. Sonra Overextended, sonra cooldown'lı |

Karar mantığı: Span "hep birlikte geri çekil" ile "melee yerinde kalıp yesin" arasında seçtirir; Hook kırılgan birimi Span hücresine ya da ön sıraya çeker; Brand sıkışmış dizilimi cezalandırır (Span güvenli hücreleri sıkıştırır, Brand komşuları vurur); Fall'da 4 kahraman, 3 Keystone: biri dışarıda kalır.

## 4. Pasifler ve fazlar
- **Unyielding:** boss CC'ye tamamen bağışık (Stun, Slow, Silence işlemez; taunt'a uymaz; çekilemez; `unyielding.stunToStagger: false`). Taunt Chain Hook / Ash Brand'i çekmez (Ömer 2026-10-08, madde 271). Blinded/Jinxed/Misfortune etkisizdir; diğer debuff'lar 1 tur kısa sürer (Omen kısalmaz).
- **Anchored:** her canlı Mooring Warden'a zırh ve büyü zırhı ekler (değer: `anchor.armorAdd` / `magicArmorAdd`) ve Chain Hook'u açar. Mooring kırılınca Warden Staggered (1 eylem kaybı) ve bekleyen Breaking Span iptal. Faz III'te kalan Mooring'ler Stagger vermeden kopar. Mooring'ler hedeflenebilir, alan skill'ine girer, taunt/guard yapmaz, şifa/kalkan almaz.
- **Ember Heart (fazlar):** I (%100-66) "None shall cross.": Anchor Smash, Span (row), Hook. II (%66-33) "The Ember wakes.": Ash Brand açılır, Span `rect 2x3`. III (%33-0) "The span fails.": 3 eylem, güç artar, zırh yarıya, Mooring'ler kopar, Fall anında telgraflanır. Faz kilidi: tek vuruş en fazla bir eşiği geçer (bekleyen Span, Faz III'e girerken iptal olur, yerini Fall alır).

## 5. Boss YZ'si (`data/ai.json > profiles.bridge_warden`)
- Mevcut tek değer terazisi (`ai-value.ts`); telgraf değeri = çözülmede işaretli hücrelerde kalması beklenen birimlere tahmini hasar x `telegraphHitShare` + kaçış turlarının değeri. Belirleyici, rastgelelik yok.
- Faz I: Span hazırsa en kalabalık sıraya Span, ikinci eylemde Hook (kırılgan birimi Span sırasına çek) ya da Anchor Smash. Faz II: Span ya da Ash Brand (güvenli hücrelerde en çok komşusu olana). Faz III: Fall beklerken Anchor Smash / Ash Brand / Span.
- Easy: Span'i ilk dolu sıraya atar, Hook kombinasyonu yapmaz. Hard: Hook + Span ve Brand + Span sıkıştırmasını kurar. Oyuncu vekili telgraftan Move ile kaçar (`ai.json > telegraph.dodgeOpportunityShare`).
- Maç kaydı anahtarları: `telegraph`, `resolve`, `brand ... burst`, `phase`, `mooring broken`.

## 6. Sınıf rolleri (sim senaryoları)
Defender: Guard ile Fall'u paylaştırır (Taunt/Slow işlemez). Paladin/Druid: telgraf sonrası toparlar, Resurrection kritik. Mage: Mana Barrier Brand'i siler, alan skill'i Warden + iki Mooring'i birden vurur. Anti-Mage: MP yakıp Ash Brand'i engeller. Archer/Hexer/Undead: uzaktan Mooring kırar (Hexer Doom faz kilidine takılır). Warrior/Cutthroat: Overextended penceresinde patlar. Gambler: All In'i Overextended'a saklar.

## 7. Kararlar (Ömer 2026-10-08)
Tema A, ad "The Bridge Warden" aynen; Warden + 2 Iron Mooring; Faz III sertliği uygun; boss'a girerken tam iyileşme kampı YOK (Warden canı %10 düşük, değer `overrides.hp`); telgraflar Warden'ın bir sonraki turunda çözülür. Sim ayarı, hedef kazanma oranları ve uygulama varsayımları: `docs/archive/design/bosses/bridge-warden.md` ve `docs/archive/design/open-questions-archive.md` madde 265, 269.
Sanat: sprite `spriteId: bridge_warden`; ikonlar `src/game/pixel-icons.ts`, animasyon `src/game/vfx-warden.ts`, `src/game/mob-vfx-hand/bridge.ts`; sesler `data/audio.json`, `data/audio-mobs.json`. Ses felsefesi: bu boss'ta çan sesi yok (filtreli gürültü + alçak darbe); çan yalnız Vesper'de, bkz. `docs/design/audio-map.md`.
