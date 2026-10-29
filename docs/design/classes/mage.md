# Mage

Mage'in kit kararları. Genel sınıf çerçevesi `docs/design/classes.md`; sayılar `data/classes/mage.json`, `data/skills.json`, `data/statuses.json`, `data/grounds.json` içinde.

## Mage reworkü (Ömer 2026-10-29)

Kit: **Fire Bolt, Blizzard, Ice Crater, Meteor** + pasif **Heat Mirage**. Fire Bolt, Blizzard ve Meteor değişmedi.

### Chilled (yeni durum)
- "Chilled: 20% less Speed and 10% less Evasion" (`statuses.json > chilled`: speedMult 0,8, evasionMult 0,9). Buz mavisi (#9fe3ff).
- Slow'dan ayrı bir durum; ikisi aynı birimde birlikte durabilir (çarpanlar çarpılır).
- CC sayılır (`cc: true`): boss'lar Slow gibi bağışıktır ("Immune").
- Chill Ground (`grounds.json > storm`; Blizzard'ın zemini, Eternal Winter) içinde turuna başlayan artık **Chilled** (1 tur) alır, Slow almaz. Ice (`ice_ground`) Slow vermeye devam eder.

### Ice Crater (Mana Barrier'ın yerine, 3. skill)
- Tek düşman: buz büyü hasarı + Chilled, sonra hedef oyuncunun seçtiği yöne 1 hücre itilir. Yön yalnızca sıra ya da şerit boyunca (ileri / geri / iki yan), çapraz yok.
- Gidilecek hücre doluysa ya da tahta dışıysa itme olmaz: hedef **çarpar** ve küçük ek buz hasarı alır; o hücrede bir birim varsa o da aynı hasarı alır.
- Zemin bırakmaz.
- Yer değiştirme bağışık birim (boss, steadfast...) itilmez ve çarpmaz; yalnızca hasar + Chilled (boss Chilled'ı da yemez).
- Hedef ölürse itme yok.
- Arayüz: hedef seçilince hedefin çevresinde 4 ok çıkar (adım 2/2). Gidilebilir yön buz mavisi, çarpma yönü kırmızı "Crash N" etiketli; ok üstüne gelince önizleme o yönle hesaplanır (hasar + Chilled) ve varış / çarpma hücresi plakası yanar. Esc, sağ tık, "Back" ya da okların dışına dokunma yön adımını kapatır (hedef seçimi sürer). Hedef itilemiyorsa ok çıkmaz, skill doğrudan atılır.
- Yapay zeka yönü basit puanla seçer: kendi tarafının zararlı zeminine itme > çarpma (iki birime hasar) > öne / kalabalığa itme.

### Heat Mirage (Spell Echo'nun yerine, pasif)
- "When an enemy hits the Mage in melee, Burning Ground appears under it for 1 turn (once per round). The Mage takes 10% less Fire and Ice damage."
- Isı serabı: yakın dövüş skill'iyle (`motion: melee`) Mage'e vuran düşmanın hücresi 1 turluk Burning Ground olur (saldıranın turları sayar). Mage'in iki turu arasında en fazla bir kez. Uzaktan vuruş tetiklemez. Mage o vuruşta ölürse tetiklemez.
- **Frost Skin** (genel küçük etki): Mage ateş ve buz elementli hasardan %10 daha az alır (her zaman; element direnciyle "less" yığılır).

### Geçici sayılar (sim'e göre değişebilir)
| Değer | Sayı |
|---|---|
| Ice Crater bedel / cooldown | 10 MP / 3 |
| Ice Crater güç | 0,70 x INT, büyü, buz |
| Chilled süresi | 2 tur |
| Çarpma hasarı | 0,20 x INT (iki birime de) |
| Heat Mirage zemin gücü | 0,361 x INT (Meteor zemini) |
| Frost Skin | %10 az ateş / buz hasarı |

### Ödünç görsel (sanat yok)
- Chilled ikonu: `blizzard` (geçici). Ice Crater ikonu `blizzard`, VFX `blizzard` (yukarıdan buz parçaları), sesler `iceCrack` + `hailPatter`. Heat Mirage ikonu `flame`. Yön okları kodla çizilir.

### Emekli / pasif kalanlar
- Mana Barrier `skills.json`'da duruyor (`retired: true`): hiçbir karakterin kitinde değil, Codex listelemez, motor kuralı ve eski testler (`tests/mage-legacy-helpers.ts`) korunuyor. Spell Echo etkisi (`spellEcho`) Gambler ve test sınıflarında sürüyor.
- Mage skill ağacı v3 (`data/skill-trees/mage.json`; content-designer 2026-10-29, sürüm artışı = bedava sıfırlama): eski Spell Echo (0.*) ve Mana Barrier (3.*) düğümleri ve First Refrain yerine yeni düğümler geldi (yalnızca var olan fx sözlüğü, Ömer onayı bekliyor):
  - 0. satır (Heat Mirage / Frost Skin): Heat Haze, Searing Mirage, Rime Touch, Lingering Mirage, Cold Comfort, Backdraft, Rime Skin, Stoked Flames, Pyre Heart, Hoarfrost, Brittle Cold, evolve Mirage Veil.
  - 3. satır (Ice Crater): Deep Crater, Hard Landing, Bitter Frost, Frozen Crater, Long Chill, Frostbitten Mark, Deep Freeze, Glacial Spike, Battering Frost, Permafrost, Black Frost, evolve Glacier Crater.
  - Mastery bar 5: Opening Spark. Blizzard'ın Slow koşullu düğümleri (Numbing Cold, Flash Freeze, Black Ice) Chilled'ı da sayar.
- Eternal Winter (2.v) metni: "...and Chills every enemy standing in it."

Karar günlüğü: `docs/design/open-questions.md` madde 452, ağaç: madde 457.
