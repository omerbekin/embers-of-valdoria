# Emekli karakterler (eski tasarımlar)

Buradaki sınıflar oyundan çıktı ya da yeniden tasarlandı. İleride geri getirmek ya da fikir almak için tam hâlleri saklanır (tasarım belgesi + veri anlık görüntüsü). Canlı oyunun verisi değildir; kod ve veri buradan okunmaz.

## Anti-Mage (2026-11-17'ye kadar; yerine Redtithe)

### Tasarım belgesi (`docs/design/classes/antimage.md`, tam içerik)

#### Anti-Mage

> **Ne için / Güncel mi (2026-11-08):** Anti-Mage kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/antimage.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

### 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `antimage` / Mana Hunter |
| Ön sıra önceliği, menzil | 3.5, menzil 4 |
| Stat (STR / INT / DEX / LUCK) | 8 / 26 / 12 / 14, ana stat INT (toplam 60) |
| Zırh / büyü zırhı | 12 / 40 |
| YZ profili | `antimage` (`data/ai.json > profiles.antimage`) |
| Pasif | **Spellbreaker's Instinct**: "When an enemy uses a skill that costs MP on your team, your next turn comes 10% sooner (once per round)." |

- Mana avcısı: kadın, hançer fırlatır (savaşta hedefe koşmadan yerinden atar). Düşmanın büyü gücünü yakar; düşman takımı MP harcayınca tur sırası öne kayar.
- **Güçlü:** büyücü ve MP'li düşmana karşı çok güçlü; büyü zırhı yüksek; MP'siz düşmana da "tainted mana" ile hasar yazar; takımına kalkan taşır.
- **Zayıf:** zırh düşük, fiziksel hasara açık; düz hasarı sınırlı, gücü damga + yakım zincirine bağlı.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

Ley Brand'in skill id'si `drain_field` (Drain Field'ın yerine geldi, Ömer 2026-10-27); görsel ve ses Drain Field'ınki, durum ikonu yer tutucu, Instinct ikonu ödünç (overflow).

### 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Mana Steal (`mana_burn`) | Tek hedefe arcane büyü hasarı, MP yakar, yakılanın yarısını sana verir, 2 tur Ley Thread bırakır | 0 / yok | 4 | hasar magic/arcane INT 0,665; manaBurn: amount=7, gainRatio=0,5; status: status=ley_thread, turns=2 |
| Ley Brand (`drain_field`) | 3x3 alandaki her düşmana 3 tur Branded. MP'siz düşman maks canının %20'si kadar tainted mana alır; MP'li düşmanın bedelleri 1,5 kat. Yakılan her MP hasar olur; süre bitince kalan tainted mana patlar | 12 / 3 | 4 | brand: turns=3, taintPct=0,2, costMult=1,5, burnDamagePct=0,49, explodePct=0,49, castBurnPct=0,5, markDamagePct=0,4, markSkills=[mana_burn, void_strike], threadTurns=2, threadBurnMult=1,5, element=arcane; area={shape:rect, rows:3, cols:3, anchor:bottom_left} |
| Spell Ward (`spell_ward`) | Dosta ya da kendine büyü kalkanı; emdiği her darbede saldıranın MP'sini yakar, buff'ını silme şansı | 12 / 3 | sınıf (4) | shield: scale=int, power=0,75, shieldType=magic, onAbsorb={burnMana:8, dispelChance:0.25} |
| Void Strike (`void_strike`) | Tek hedefe büyük arcane hasar; hedefin eksik MP'si hasarı büyütür | 28 / 3, ilk 3 | sınıf (4) | hasar magic/arcane INT 0,95, bonusPerMissingMana=1 |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-antimage.test.ts`) ve bu tablo birlikte güncellenir.

### 3. Ağaç

Ağaç "yak, işaretle, hızlan": Instinct tempo, Mana Steal tek hedef MP hırsızlığı, Ley Brand alan baskısı, Spell Ward takım koruması.

Veri: `data/skill-trees/antimage.json` (sürüm 5, bar "Warden's Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Spellbreaker's Instinct (pasif):** dolgu Keen Senses, Taut Thread, Thread Sense, Pull Taut; anahtar Long Thread; yön A Quickened Instinct (ödül Ready Reflexes, uç Hair Trigger); yön B Twin Thread (ödül Snapping Thread, uç Thin Thread); evrim Spellbreaker's Fury. Anahtar: "Ley Thread lasts 1 turn longer."
- **Mana Steal:** dolgu Generous Cut, Deep Pockets, Deep Cut, Bare Steel; anahtar Prying Blade; yön A Siphon Vein (ödül Drink Deep, uç Drained Dry); yön B Quickening Steal (ödül Tempo Thief, uç Hurried Hands); evrim Spellsplitter. Anahtar: "Mana Steal removes one random buff from its target."
- **Ley Brand:** dolgu Deep Taint, Searing Brand, Heavy Toll, Bitter Burst; anahtar Hush of the Brand; yön A Focused Brand (ödül Lasting Brand, uç Narrow Brand); yön B Wider Brand (ödül Searing Grasp, uç Thin Brand); evrim Spreading Brand. Anahtar: "A Branded enemy whose mana reaches 0 is Silenced for 1 turn."
- **Spell Ward:** dolgu Layered Ward, Ward Mending, Deep Reserve, Shelter Echo; anahtar Purging Ward; yön A Split Ward (ödül Second Ward, uç Stretched Ward); yön B Ward Taunt (ödül Bastion of Null, uç Cloistered Ward); evrim Mirror Ward. Anahtar: "Spell Ward first removes every debuff from the warded ally."
- **Ult Void Strike (tek kol seçilir):** u Crippling Void, Spell Shatter, Void Shackle; r Opening for All, Shared Spoils, Feeding Frenzy; d Swift Void, Ready Blades, Threaded Void; l Rallying Break, Turned Boons, Grand Theft.
- **Bar Warden's Mastery:** 5 Ready Stance, 10 Quick Fingers, 15 Wide Basin, 20 Warded Steps, 25 Void Focus.

### 4. YZ notları

- Profil: `data/ai.json > profiles.antimage`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

### 5. Açık işler / kararlar

- **Ley Brand kuralı (Ömer 2026-10-27 / 10-29, arşiv madde 444):** 3x3 alandaki her düşman Branded olur (boss dahil, CC değil), hasar ve isabet zarı yok. MP havuzu olmayan düşman maks canının bir payı kadar "tainted mana" alır (harcayamaz, yenilenme almaz; Mana Steal çalar, Spell Ward yakar, Void Strike eksik manayı sayar); MP'li düşmanın bedelleri 1,5 kat. Branded birimin yakılan / çalınan MP'sinin yarısı büyü hasarı olur; süre doğal bitince kalan tainted mana'nın yarısı damgalayandan patlar. Yeniden atış süreyi tazeler, havuzu doldurmaz. Silence skill'de yok, ağaçta (Hush of the Brand). Sayılar: `data/skills.json > drain_field`.
- Mana Steal Ley Thread bırakır (2 tur): iplikli hedefte Brand 2 tur uzun, yakım 1,5 kat, iplik tüketilir; Branded hedefe Mana Steal ve Void Strike %40 fazla vurur (Ömer 2026-10-29; `castBurnPct`, `threadBurnMult`, `markDamagePct`). Spell Ward dosta ya da kendine atılır (madde 240).
- **Drained Dry (Ömer 2026-11-09):** sabit 15 yerine "%50 increased": Mana Steal yakımı taban x 1,5 (7 -> 10,5; ağaç derleyicisi tam sayıya yuvarlar: 11), hasar yok. Ağaç `pct` op'u (percentRule mul) kullanıldı; metin "burns 50% more MP, but deals no damage".
- Ağaçta Mana Overflow düğümlerinin `inactive` temizliği kontrol edilmedi. Ağaç sim ile oturmadı.

### 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/antimage.md`.

### Veri anlık görüntüsü (2026-11-17)

#### `data/classes/antimage.json` (sınıf + pasif Spellbreaker's Instinct tanımı bu dosyadadır, `passive` alanı)

```json
{
  "id": "antimage",
  "name": "Anti-Mage",
  "spriteId": "antimage",
  "color": "#9b59d0",
  "logo": "nullsphere",
  "role": "Mana Hunter",
  "blurb": "Mana hunter who burns enemy spellpower and strikes faster when enemies cast on her team.",
  "frontPriority": 3.5,
  "range": 4,
  "attributes": {
    "str": 8,
    "int": 26,
    "dex": 12,
    "luck": 14
  },
  "primary": "int",
  "armor": 12,
  "magicArmor": 40,
  "ai": "antimage",
  "skills": [
    "mana_burn",
    "drain_field",
    "spell_ward",
    "void_strike"
  ],
  "passive": {
    "id": "spellbreaker_instinct",
    "name": "Spellbreaker's Instinct",
    "icon": "spellbreaker",
    "_not": "Ömer 2026-10-29: Mana Overflow'un yerine (manaOverflow efekt kodu motorda duruyor, AM kitinden çıktı; ağaçtaki Mana Overflow düğümleri inactive). Bir düşman AM'in takımından birine MP ödediği bir skill atınca AM'in sıra sayacı eşiğin advance oranı kadar öne kayar; AM'in iki turu arasında en çok bir kez. İkon YER TUTUCU (overflow, eski pasifin ikonu; ödünç). Sayı PROVİZYON.",
    "text": "When an enemy uses a skill that costs MP on your team, your next turn comes 10% sooner (once per round).",
    "effect": {
      "type": "spellbreakerInstinct",
      "advance": 0.1
    }
  }
}
```

#### `data/skills.json` > `mana_burn`

```json
{
  "_not": "Görünüm (Ömer 2026-10-18, Anti-Mage kadın hançer fırlatan): motor ve yapay zeka `motion: melee` görür (menzil kuralı, yapay zeka değeri DEĞİŞMEZ). `viewMotion: ranged` YALNIZCA savaş görünümünde okunur (src/game/pose-timing.ts > viewMotion): Anti-Mage hedefe koşmaz, yerinden hançer fırlatır.",
  "id": "mana_burn",
  "name": "Mana Steal",
  "icon": "manaburn",
  "target": "single_enemy",
  "range": 4,
  "cost": {
    "resource": "mp",
    "amount": 0
  },
  "motion": "melee",
  "viewMotion": "ranged",
  "fx": "#9b59d0",
  "effects": [
    {
      "type": "damage",
      "damageType": "magic",
      "scale": "int",
      "power": 0.665,
      "element": "arcane"
    },
    {
      "type": "manaBurn",
      "amount": 7,
      "gainRatio": 0.5
    },
    {
      "type": "status",
      "status": "ley_thread",
      "turns": 2
    }
  ],
  "vfx": "manasteal",
  "sfx": [
    "manaSizzle",
    "energySlurp"
  ]
}
```

#### `data/skills.json` > `drain_field`

```json
{
  "_not": "Ley Brand (Ömer 2026-10-27, open-questions 444; eski Drain Field'ın yerine, id kayıt / ağaç / YZ uyumu için AYNI kaldı). 3x3 alandaki her düşmana Branded (turns). MP havuzu olmayan düşman maks canının taintPct'i kadar DOLU tainted mana alır (harcayamaz; Brand bitince silinir); MP'si olan düşmanın MP bedelleri costMult katı (yukarı yuvarlanır). Branded düşmanın yakılan/çalınan her MP'si yakana burnDamagePct x MP büyü hasarı (isabet/kritik yok, büyü zırhı işler); süre doğal bitince kalan tainted mana explodePct x kalan büyü hasarıyla patlar. Silence artık skill'de değil, ağaçta (Hush of the Brand). Ömer 2026-10-29 (open-questions 444): castBurnPct = Branded birim MP bedelli skill kullanınca ödediği (costMult'lu) bedelin bu oranı kadar EK MP yanar (yetmezse olanı), yanan MP yakım sayılır (burnDamagePct hasar, damgalayan AM'den); markDamagePct = markSkills (Mana Steal, Void Strike) Branded hedefe bu oranda fazla (çarpımsal, 'X% more') hasar. Sayılar PROVİZYON. Ley Thread (Ömer 2026-10-29): Mana Steal isabet ettiği hedefe 2 tur ley_thread bırakır; Brand iplikli hedefte threadTurns tur daha uzun sürer ve castBurnPct x threadBurnMult olur, iplik o anda tüketilir (Ömer 2026-11-02: castBurnPct 0,5 ve threadBurnMult 1,5 kesin).",
  "id": "drain_field",
  "name": "Ley Brand",
  "icon": "drainfield",
  "target": "area_enemies",
  "range": 4,
  "area": {
    "shape": "rect",
    "rows": 3,
    "cols": 3,
    "anchor": "bottom_left"
  },
  "cost": {
    "resource": "mp",
    "amount": 12
  },
  "cooldown": 3,
  "motion": "sky",
  "fx": "#9b59d0",
  "effects": [
    {
      "type": "brand",
      "turns": 3,
      "taintPct": 0.2,
      "costMult": 1.5,
      "burnDamagePct": 0.49,
      "explodePct": 0.49,
      "castBurnPct": 0.5,
      "markDamagePct": 0.4,
      "markSkills": [
        "mana_burn",
        "void_strike"
      ],
      "threadTurns": 2,
      "threadBurnMult": 1.5,
      "element": "arcane"
    }
  ],
  "skyFx": "void",
  "vfx": "drainfield",
  "sfx": [
    "voidSuction",
    "voidPulse",
    "energySlurp"
  ]
}
```

#### `data/skills.json` > `spell_ward`

```json
{
  "id": "spell_ward",
  "name": "Spell Ward",
  "_not": "Madde 240 (Ömer): artık dosta ya da kendine atılır (single_ally, excludeSelf YOK). Büyü kalkanı Int x 0,75 (Ömer 2026-11-08, 0,6 sonra 0,75: kalan MP payı kaldırıldı, güç INT'e kaydı; eskisi Int x 0,15 + kalan MP x 0,6). Kalkan bir skill vuruşunu emdiği HER darbede (madde 241) saldıranın MP'sinden burnMana yakar ve saldıranın üstünde buff varsa dispelChance ihtimalle RASTGELE bir buff'ını siler. Yer etkisi tiki tetiklemez. Sayılar PROVİZYON.",
  "icon": "spellward",
  "target": "single_ally",
  "cost": {
    "resource": "mp",
    "amount": 12
  },
  "cooldown": 3,
  "motion": "cast",
  "fx": "#b36bff",
  "effects": [
    {
      "type": "shield",
      "scale": "int",
      "power": 0.75,
      "shieldType": "magic",
      "onAbsorb": {
        "burnMana": 8,
        "dispelChance": 0.25
      }
    }
  ],
  "vfx": "spellward",
  "sfx": [
    "wardHum"
  ]
}
```

#### `data/skills.json` > `void_strike`

```json
{
  "id": "void_strike",
  "name": "Void Strike",
  "icon": "voidstrike",
  "target": "single_enemy",
  "cost": {
    "resource": "mp",
    "amount": 28
  },
  "cooldown": 3,
  "initialCooldown": 3,
  "motion": "cast",
  "fx": "#7d3fb0",
  "effects": [
    {
      "type": "damage",
      "damageType": "magic",
      "scale": "int",
      "power": 0.95,
      "bonusPerMissingMana": 1,
      "element": "arcane"
    }
  ],
  "vfx": "voidstrike",
  "sfx": [
    "voidPulse",
    "implode"
  ],
  "ai": {
    "reserveMp": 2
  }
}
```

#### `data/statuses.json` > `ley_thread`

```json
{
  "_not": "Ley Thread (Anti-Mage, Ömer 2026-10-29): Mana Steal isabet ettiği hedefe bırakır (skills.json > mana_burn, 2 tur). Ley Brand iplikli hedefi kapsarsa o hedefte Brand threadTurns tur daha uzun sürer ve bedel yakımı (castBurnPct) threadBurnMult kat olur; iplik o anda tüketilir (sayılar skills.json > drain_field > brand). Yığın: debuff varsayılanı (refresh-strongest): yeniden çekilen iplik süreyi tazeler. CC değil (boss da yer). Debuff: Mana Barrier dispel siler. İkon YER TUTUCU: manaburn (ödünç; sonra gerçek sanat).",
  "name": "Ley Thread",
  "type": "debuff",
  "icon": "manaburn",
  "color": "#b48ae0",
  "text": "The next Ley Brand on this unit lasts 2 turns longer and burns 50% more mana per cast"
}
```

#### `data/statuses.json` > `branded`

```json
{
  "_not": "Ley Brand (Anti-Mage, Ömer 2026-10-27, open-questions 444). Sayılar skill'de (skills.json > drain_field > effects brand) ve örnekte (Status.brand). stack replace: yeniden atış süreyi tazeler ve son damgalayanın değerlerini alır, tainted mana havuzunu DOLDURMAZ. CC değil (boss da yer). Debuff: Mana Barrier dispel siler (havuz da silinir, patlamaz). İkon YER TUTUCU: manaburn (sonra gerçek sanat).",
  "name": "Branded",
  "type": "debuff",
  "icon": "manaburn",
  "color": "#7a3fb8",
  "stack": "replace",
  "text": "Ley Brand: MP costs are higher and each MP skill burns extra mana; a unit with no mana holds tainted mana it cannot spend. Mana burned or stolen from it hurts, Mana Steal and Void Strike hit it harder, and leftover tainted mana bursts when the Brand runs out"
}
```

#### `data/skill-trees/antimage.json`

```json
{
  "class": "antimage",
  "version": 5,
  "picked": {
    "rows": [
      "b",
      "b",
      "a",
      "b",
      "b"
    ],
    "at": "2026-10-22"
  },
  "rows": [
    {
      "skill": "spellbreaker_instinct",
      "name": "Spellbreaker's Instinct",
      "passive": true,
      "karma": "B"
    },
    {
      "skill": "mana_burn",
      "name": "Mana Steal",
      "karma": "B"
    },
    {
      "skill": "drain_field",
      "name": "Ley Brand",
      "karma": "A"
    },
    {
      "skill": "spell_ward",
      "name": "Spell Ward",
      "karma": "B"
    }
  ],
  "ult": {
    "skill": "void_strike",
    "name": "Void Strike",
    "karma": "B"
  },
  "mastery": {
    "name": "Warden's Mastery",
    "karma": "B",
    "bar": [
      {
        "at": 5,
        "name": "Ready Stance",
        "text": "Spellbreaker's Instinct moves your turn a further 3% sooner.",
        "src": "B:V3:bar0",
        "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
        "fx": [
          {
            "k": "passive",
            "f": "advance",
            "op": "add",
            "v": 0.03
          }
        ]
      },
      {
        "at": 10,
        "name": "Quick Fingers",
        "text": "Mana Steal burns +3 MP from enemies that have a buff.",
        "src": "B:V5:bar0",
        "fx": [
          {
            "k": "hook",
            "h": "cond",
            "skill": "mana_burn",
            "when": {
              "targetHasBuff": true
            },
            "mod": {
              "manaBurnAdd": 3
            }
          }
        ]
      },
      {
        "at": 15,
        "name": "Wide Basin",
        "text": "Ley Brand gives your team 1 MP for each enemy it Brands.",
        "src": "B:V3:bar2",
        "fx": [
          {
            "k": "hook",
            "h": "trigger",
            "on": "statusApplied",
            "skill": "drain_field",
            "status": "branded",
            "do": [
              {
                "mp": 1,
                "to": "allAllies"
              }
            ]
          }
        ]
      },
      {
        "at": 20,
        "name": "Warded Steps",
        "text": "Allies under your Spell Ward take 2% less physical damage.",
        "src": "B:V4:bar1",
        "fx": [
          {
            "k": "hook",
            "h": "heal",
            "on": "damageTaken",
            "who": "team",
            "shield": "spell_ward",
            "when": {
              "incomingType": "physical"
            },
            "mul": -0.02
          }
        ]
      },
      {
        "at": 25,
        "name": "Void Focus",
        "text": "Void Strike costs 2 less MP.",
        "src": "B:V2:bar3",
        "fx": [
          {
            "k": "skill",
            "sel": "self",
            "f": "cost.amount",
            "op": "add",
            "v": -2,
            "skill": "void_strike"
          }
        ]
      }
    ]
  },
  "nodes": {
    "0.f1": {
      "name": "Keen Senses",
      "text": "Spellbreaker's Instinct moves your turn a further 2% sooner per rank.",
      "src": "B:V3:0.f1",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "passive",
          "f": "advance",
          "op": "add",
          "v": 0.02,
          "rank": true
        }
      ]
    },
    "0.f2": {
      "name": "Taut Thread",
      "text": "Your skills deal 3% increased damage per rank to enemies with a Ley Thread.",
      "src": "B:V3:0.f2",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "hook",
          "h": "cond",
          "when": {
            "targetStatus": "ley_thread"
          },
          "mod": {
            "powerMul": 0.03
          },
          "rank": true
        }
      ]
    },
    "0.f3": {
      "name": "Thread Sense",
      "text": "Enemies with a Ley Thread deal 2% less damage to you per rank.",
      "src": "B:V3:0.f3",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "hook",
          "h": "heal",
          "on": "damageTaken",
          "who": "self",
          "when": {
            "incomingStatus": "ley_thread"
          },
          "mul": -0.02,
          "rank": true
        }
      ]
    },
    "0.n0": {
      "name": "Long Thread",
      "text": "Ley Thread lasts 1 turn longer.",
      "src": "B:V3:0.mb",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "skill",
          "skill": "mana_burn",
          "sel": "status:ley_thread",
          "f": "turns",
          "op": "add",
          "v": 1
        }
      ]
    },
    "0.r": {
      "name": "Pull Taut",
      "text": "Mana Steal burns 1 more MP per rank from enemies with a Ley Thread.",
      "src": "B:V5:0.f3",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "hook",
          "h": "cond",
          "skill": "mana_burn",
          "when": {
            "targetStatus": "ley_thread"
          },
          "mod": {
            "manaBurnAdd": 1
          },
          "rank": true
        }
      ]
    },
    "0.ea": {
      "name": "Quickened Instinct",
      "text": "Spellbreaker's Instinct moves your turn a further 10% sooner.",
      "src": "B:V3:0.ea",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "passive",
          "f": "advance",
          "op": "add",
          "v": 0.1
        }
      ]
    },
    "0.eb": {
      "name": "Twin Thread",
      "text": "Mana Steal also leaves a Ley Thread on one enemy beside its target.",
      "src": "B:V3:0.eb",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "hit",
          "skill": "mana_burn",
          "do": [
            {
              "status": "ley_thread",
              "turns": 2,
              "to": "beside",
              "count": 1
            }
          ]
        }
      ]
    },
    "0.ma": {
      "name": "Ready Reflexes",
      "text": "When Spellbreaker's Instinct triggers, you gain Fleet (+10% Evasion) until your next turn.",
      "src": "B:V3:0.ma",
      "_not": "engine-dev 2026-10-29 (Ömer formu, open-questions 457): yeni tetik olayı; sayılar PROVİZYON. Answering Blade (0.ma) yerine: Instinct tetiklenince AM 1 tur Fleet (var olan buff; süre AM'in tur başında düşer).",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "instinct",
          "do": [
            {
              "status": "fleet",
              "turns": 1
            }
          ]
        }
      ]
    },
    "0.fa": {
      "name": "Hair Trigger",
      "text": "Spellbreaker's Instinct moves your turn a further 15% sooner, but you take 10% more magic damage.",
      "src": "B:V3:0.fa",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "passive",
          "f": "advance",
          "op": "add",
          "v": 0.15
        },
        {
          "k": "hook",
          "h": "heal",
          "on": "damageTaken",
          "who": "self",
          "when": {
            "incomingType": "magic"
          },
          "mul": 0.1
        }
      ]
    },
    "0.fb": {
      "name": "Thin Thread",
      "text": "Ley Thread lasts 2 turns longer, but Mana Steal deals 20% less damage.",
      "src": "B:V4:0.fb",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "skill",
          "skill": "mana_burn",
          "sel": "status:ley_thread",
          "f": "turns",
          "op": "add",
          "v": 2
        },
        {
          "k": "skill",
          "skill": "mana_burn",
          "sel": "damage",
          "f": "power",
          "op": "pct",
          "v": -0.2
        }
      ]
    },
    "0.mb": {
      "name": "Snapping Thread",
      "text": "When Ley Brand consumes a Ley Thread, the target takes 25% INT arcane damage.",
      "src": "B:V4:0.mb",
      "_not": "engine-dev 2026-10-29 (Ömer formu, open-questions 457): yeni tetik olayı; sayılar PROVİZYON. Unravel (0.mb, iplikliye vurunca sıra erken) yerine: Brand ipliği tüketince (Brand konduktan sonra) hedefe 0,25 INT büyü (arcane) hasarı; zırh / alınan hasar işler, isabet zarı yok.",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "threadConsumed",
          "do": [
            {
              "damage": 0.25,
              "stat": "int",
              "damageType": "magic",
              "element": "arcane",
              "to": "target"
            }
          ]
        }
      ]
    },
    "0.v": {
      "name": "Spellbreaker's Fury",
      "text": "Spellbreaker's Instinct evolves: it moves your turn 5% further, and a magic hit on you makes your next skill deal 20% more damage (once per round).",
      "src": "B:V3:0.v",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "passive",
          "f": "advance",
          "op": "add",
          "v": 0.05
        },
        {
          "k": "hook",
          "h": "trigger",
          "on": "hitTaken",
          "when": {
            "incomingType": "magic"
          },
          "once": "perTurn",
          "do": [
            {
              "buff": {
                "powerMul": 0.2
              }
            }
          ]
        }
      ]
    },
    "1.f1": {
      "name": "Generous Cut",
      "text": "Mana Steal gives you 10% more of the burned MP per rank.",
      "src": "B:V3:1.f1",
      "fx": [
        {
          "k": "skill",
          "sel": "manaBurn",
          "f": "gainRatio",
          "op": "add",
          "v": 0.1,
          "rank": true
        }
      ]
    },
    "1.f2": {
      "name": "Deep Pockets",
      "text": "Mana Steal +8% damage per rank against enemies above half MP.",
      "src": "B:V3:1.f3",
      "fx": [
        {
          "k": "hook",
          "h": "cond",
          "when": {
            "targetMpAbove": 0.5
          },
          "mod": {
            "powerMul": 0.08
          },
          "rank": true
        }
      ]
    },
    "1.f3": {
      "name": "Deep Cut",
      "text": "Mana Steal also burns 3% of the target's max MP per rank.",
      "src": "B:V1:1.r",
      "fx": [
        {
          "k": "skill",
          "sel": "manaBurn",
          "f": "pctMax",
          "op": "add",
          "v": 0.03,
          "rank": true
        }
      ]
    },
    "1.n0": {
      "name": "Prying Blade",
      "text": "Mana Steal removes one random buff from its target.",
      "src": "B:V5:1.n0",
      "fx": [
        {
          "k": "addEffect",
          "effect": {
            "type": "dispel",
            "status": "buff",
            "count": 1,
            "random": true
          }
        }
      ]
    },
    "1.r": {
      "name": "Bare Steel",
      "text": "Mana Steal deals 2% increased damage per rank against enemies with no buffs.",
      "src": "B:V5:1.r",
      "fx": [
        {
          "k": "hook",
          "h": "cond",
          "when": {
            "targetHasBuff": false
          },
          "mod": {
            "powerMul": 0.02
          },
          "rank": true
        }
      ]
    },
    "1.ea": {
      "name": "Siphon Vein",
      "text": "Mana Steal gains 60% of the MP it burns instead of 50%.",
      "src": "B:V3:1.ea",
      "fx": [
        {
          "k": "skill",
          "sel": "manaBurn",
          "f": "gainRatio",
          "op": "base",
          "v": 0.6
        }
      ]
    },
    "1.eb": {
      "name": "Quickening Steal",
      "text": "If Mana Steal's target is at 0 MP, the ally with the least MP gains Haste for 1 turn.",
      "src": "B:V3:1.eb",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "hit",
          "when": {
            "targetMpZero": true
          },
          "do": [
            {
              "status": "haste",
              "turns": 1,
              "to": "lowestMpAlly"
            }
          ]
        }
      ]
    },
    "1.ma": {
      "name": "Drink Deep",
      "text": "Mana Steal also heals you for 30% of the MP it burns.",
      "src": "B:V4:1.ma",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "manaBurned",
          "do": [
            {
              "heal": 0.3,
              "of": "amount"
            }
          ]
        }
      ]
    },
    "1.fa": {
      "name": "Drained Dry",
      "text": "Mana Steal burns 50% more MP, but deals no damage.",
      "src": "B:V3:1.fa",
      "fx": [
        {
          "k": "removeEffect",
          "sel": "damage"
        },
        {
          "k": "skill",
          "sel": "manaBurn",
          "f": "amount",
          "op": "pct",
          "v": 0.5
        }
      ]
    },
    "1.fb": {
      "name": "Hurried Hands",
      "text": "Mana Steal takes only half a turn, but gains a 2-turn cooldown.",
      "src": "B:V3:1.fb",
      "fx": [
        {
          "k": "skill",
          "sel": "self",
          "f": "turnCost",
          "op": "set",
          "v": 0.5
        },
        {
          "k": "skill",
          "sel": "self",
          "f": "cooldown",
          "op": "set",
          "v": 2
        }
      ]
    },
    "1.mb": {
      "name": "Tempo Thief",
      "text": "If Mana Steal empties its target, your next turn comes 8% sooner.",
      "src": "B:V3:1.mb",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "mpEmptied",
          "do": [
            {
              "sooner": 0.08
            }
          ]
        }
      ]
    },
    "1.v": {
      "name": "Spellsplitter",
      "text": "Mana Steal becomes Spellsplitter: it removes every buff from its target and deals 8% more damage per buff removed.",
      "src": "B:V5:1.v",
      "fx": [
        {
          "k": "addEffect",
          "first": true,
          "effect": {
            "type": "dispel",
            "status": "buff"
          }
        },
        {
          "k": "hook",
          "h": "cond",
          "scale": {
            "buffsRemoved": true
          },
          "mod": {
            "powerMul": 0.08
          }
        }
      ]
    },
    "2.f1": {
      "name": "Deep Taint",
      "text": "Ley Brand's tainted mana pool grows by 2% of max HP per rank.",
      "src": "A:V1:2.f1",
      "fx": [
        {
          "k": "skill",
          "sel": "brand",
          "f": "taintPct",
          "op": "add",
          "v": 0.02,
          "rank": true
        }
      ]
    },
    "2.f2": {
      "name": "Searing Brand",
      "text": "Mana lost by a Branded enemy deals damage equal to a further 5% of that mana per rank.",
      "src": "A:V1:2.f2",
      "fx": [
        {
          "k": "skill",
          "sel": "brand",
          "f": "burnDamagePct",
          "op": "add",
          "v": 0.05,
          "rank": true
        }
      ]
    },
    "2.f3": {
      "name": "Heavy Toll",
      "text": "Branded enemies' MP costs rise by a further 5% per rank.",
      "src": "A:V1:2.f3",
      "fx": [
        {
          "k": "skill",
          "sel": "brand",
          "f": "costMult",
          "op": "add",
          "v": 0.05,
          "rank": true
        }
      ]
    },
    "2.n0": {
      "name": "Hush of the Brand",
      "text": "A Branded enemy whose mana reaches 0 is Silenced for 1 turn.",
      "src": "A:V1:2.n0",
      "fx": [
        {
          "k": "skill",
          "sel": "brand",
          "f": "silenceOnEmpty",
          "op": "set",
          "v": 1
        }
      ]
    },
    "2.r": {
      "name": "Bitter Burst",
      "text": "When Ley Brand runs out, leftover tainted mana deals damage equal to a further 10% of itself per rank.",
      "src": "A:V1:2.r",
      "fx": [
        {
          "k": "skill",
          "sel": "brand",
          "f": "explodePct",
          "op": "add",
          "v": 0.1,
          "rank": true
        }
      ]
    },
    "2.ea": {
      "name": "Focused Brand",
      "text": "The enemy in Ley Brand's centre cell gets a 50% larger tainted mana pool.",
      "src": "A:V1:2.ea",
      "fx": [
        {
          "k": "skill",
          "sel": "brand",
          "f": "centerTaintMul",
          "op": "set",
          "v": 0.5
        }
      ]
    },
    "2.eb": {
      "name": "Wider Brand",
      "text": "Ley Brand covers one more column (3x3 → 3x4).",
      "src": "A:V1:2.eb",
      "fx": [
        {
          "k": "hook",
          "h": "target",
          "area": {
            "rows": 4
          }
        }
      ]
    },
    "2.ma": {
      "name": "Lasting Brand",
      "text": "Ley Brand lasts 1 more turn.",
      "src": "A:V1:2.ma",
      "fx": [
        {
          "k": "skill",
          "sel": "brand",
          "f": "turns",
          "op": "add",
          "v": 1
        }
      ]
    },
    "2.fa": {
      "name": "Narrow Brand",
      "text": "Ley Brand hits only its centre cell, but that enemy's tainted mana pool is 40% of its max HP and its MP costs are doubled.",
      "src": "A:V1:2.fa",
      "fx": [
        {
          "k": "hook",
          "h": "target",
          "area": {
            "rows": 1,
            "cols": 1
          }
        },
        {
          "k": "skill",
          "sel": "brand",
          "f": "taintPct",
          "op": "base",
          "v": 0.4
        },
        {
          "k": "skill",
          "sel": "brand",
          "f": "costMult",
          "op": "base",
          "v": 2
        }
      ]
    },
    "2.fb": {
      "name": "Thin Brand",
      "text": "Ley Brand costs 6 less MP, but lasts 1 turn less.",
      "src": "A:V1:2.fb",
      "fx": [
        {
          "k": "skill",
          "sel": "self",
          "f": "cost.amount",
          "op": "add",
          "v": -6
        },
        {
          "k": "skill",
          "sel": "brand",
          "f": "turns",
          "op": "add",
          "v": -1
        }
      ]
    },
    "2.mb": {
      "name": "Searing Grasp",
      "text": "Ley Brand also burns 15% of each Branded enemy's max MP, tainted mana included.",
      "src": "A:V1:2.mb",
      "fx": [
        {
          "k": "addEffect",
          "effect": {
            "type": "manaBurn",
            "pctMax": 0.15
          }
        }
      ]
    },
    "2.v": {
      "name": "Spreading Brand",
      "text": "Ley Brand becomes Spreading Brand: when a Brand runs out, it leaps once to an unbranded enemy next to its bearer with a fresh Brand.",
      "src": "A:V1:2.v",
      "fx": [
        {
          "k": "skill",
          "sel": "brand",
          "f": "spread",
          "op": "on"
        }
      ]
    },
    "3.f1": {
      "name": "Layered Ward",
      "text": "Spell Ward's shield is 4% larger per rank.",
      "src": "B:V4:3.f1",
      "fx": [
        {
          "k": "skill",
          "sel": "shield",
          "f": "power",
          "op": "pct",
          "v": 0.04,
          "rank": true
        },
        {
          "k": "skill",
          "sel": "shield",
          "f": "bonusPerMana",
          "op": "pct",
          "v": 0.04,
          "rank": true
        }
      ]
    },
    "3.f2": {
      "name": "Ward Mending",
      "text": "Spell Ward heals the warded ally for 4% of its max HP per rank when cast.",
      "src": "B:V4:3.f2",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "skillUse",
          "rank": true,
          "do": [
            {
              "heal": 0.04,
              "to": "target"
            }
          ]
        }
      ]
    },
    "3.f3": {
      "name": "Deep Reserve",
      "text": "Spell Ward's shield takes +6% per rank from your remaining MP.",
      "src": "B:V3:3.f2",
      "fx": [
        {
          "k": "skill",
          "sel": "shield",
          "f": "bonusPerMana",
          "op": "add",
          "v": 0.06,
          "rank": true
        }
      ]
    },
    "3.n0": {
      "name": "Purging Ward",
      "text": "Spell Ward first removes every debuff from the warded ally.",
      "src": "B:V4:3.n0",
      "fx": [
        {
          "k": "addEffect",
          "before": "shield",
          "effect": {
            "type": "dispel",
            "status": "debuff"
          }
        }
      ]
    },
    "3.r": {
      "name": "Shelter Echo",
      "text": "When Spell Ward breaks, the warded ally heals 2% of its max HP per rank.",
      "src": "B:V4:3.r",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "shieldBreak",
          "rank": true,
          "do": [
            {
              "heal": 0.02,
              "to": "subject"
            }
          ]
        }
      ]
    },
    "3.ea": {
      "name": "Split Ward",
      "text": "Spell Ward also wards the ally with the least MP at 25% strength.",
      "src": "B:V3:3.eb",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "skillUse",
          "do": [
            {
              "cast": "event",
              "power": 0.25,
              "to": "lowestMpAlly",
              "noChain": true,
              "notTarget": true
            }
          ]
        }
      ]
    },
    "3.eb": {
      "name": "Ward Taunt",
      "text": "When you cast Spell Ward on yourself, you taunt all enemies for 1 turn.",
      "src": "B:V4:3.ea",
      "fx": [
        {
          "k": "addEffect",
          "effect": {
            "type": "taunt",
            "turns": 1,
            "when": {
              "targetIsSelf": true
            }
          }
        }
      ]
    },
    "3.ma": {
      "name": "Second Ward",
      "text": "When Spell Ward breaks, a 25% ward forms on the ally with the lowest HP.",
      "src": "B:V4:3.mb",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "shieldBreak",
          "skill": "spell_ward",
          "do": [
            {
              "shield": 0.25,
              "of": "shieldSize",
              "magic": true,
              "to": "lowestHpAlly"
            }
          ]
        }
      ]
    },
    "3.fa": {
      "name": "Stretched Ward",
      "text": "Split Ward is full strength, but Spell Ward costs 18 MP.",
      "src": "B:V3:3.fb",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "skillUse",
          "drop": "3.ea",
          "do": [
            {
              "cast": "event",
              "power": 1,
              "to": "lowestMpAlly",
              "noChain": true,
              "notTarget": true
            }
          ]
        },
        {
          "k": "skill",
          "sel": "self",
          "f": "cost.amount",
          "op": "set",
          "v": 18
        }
      ]
    },
    "3.fb": {
      "name": "Cloistered Ward",
      "text": "Spell Ward on yourself is 30% larger, but it can no longer target allies.",
      "src": "B:V4:3.fa",
      "fx": [
        {
          "k": "hook",
          "h": "target",
          "target": "self"
        },
        {
          "k": "hook",
          "h": "heal",
          "on": "shieldDealt",
          "skill": "spell_ward",
          "mul": 0.3
        }
      ]
    },
    "3.mb": {
      "name": "Bastion of Null",
      "text": "While you hold Spell Ward and a taunt, you take 30% less physical damage.",
      "src": "B:V4:3.ma",
      "fx": [
        {
          "k": "hook",
          "h": "heal",
          "on": "damageTaken",
          "who": "self",
          "when": {
            "selfHasShield": "spell_ward",
            "selfTaunting": true,
            "incomingType": "physical"
          },
          "mul": -0.3
        }
      ]
    },
    "3.v": {
      "name": "Mirror Ward",
      "text": "Spell Ward becomes Mirror Ward: magic hits it absorbs are thrown back at the attacker for 25% of their damage.",
      "src": "B:V4:3.v",
      "new": true,
      "approved": true,
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "shieldAbsorb",
          "when": {
            "incomingType": "magic"
          },
          "do": [
            {
              "damage": 0.25,
              "of": "amount",
              "to": "target"
            }
          ]
        }
      ]
    },
    "4.u1": {
      "name": "Crippling Void",
      "text": "Void Strike Blinds its target for 1 turn.",
      "src": "B:V4:4.u1",
      "fx": [
        {
          "k": "addEffect",
          "after": "damage",
          "effect": {
            "type": "status",
            "status": "blinded",
            "turns": 1
          }
        }
      ]
    },
    "4.u2": {
      "name": "Spell Shatter",
      "text": "Void Strike's target deals 20% less magic damage for 2 turns.",
      "src": "B:V4:4.u2",
      "fx": [
        {
          "k": "addEffect",
          "after": "damage",
          "effect": {
            "type": "status",
            "status": "weakened",
            "turns": 2
          }
        },
        {
          "k": "hook",
          "h": "cond",
          "sel": "status:weakened",
          "mod": {
            "statusPotency": {
              "damageDealtMult": 0.15,
              "magicDealtMult": -0.2
            }
          }
        }
      ]
    },
    "4.u3": {
      "name": "Void Shackle",
      "text": "Void Strike Stuns its target if it is at 0 MP.",
      "src": "B:V4:4.u3",
      "fx": [
        {
          "k": "hook",
          "h": "cond",
          "when": {
            "targetMpZero": true
          },
          "mod": {
            "addStatus": {
              "status": "stun",
              "turns": 1
            }
          }
        }
      ]
    },
    "4.r1": {
      "name": "Opening for All",
      "text": "Void Strike makes its target Overextended.",
      "src": "B:V3:4.l1",
      "fx": [
        {
          "k": "addEffect",
          "after": "damage",
          "effect": {
            "type": "status",
            "status": "overextended",
            "turns": 1
          }
        }
      ]
    },
    "4.r2": {
      "name": "Shared Spoils",
      "text": "Allies that hit the Overextended target gain 4 MP.",
      "src": "B:V3:4.l2",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "allyHit",
          "when": {
            "targetStatus": "overextended"
          },
          "do": [
            {
              "mp": 4,
              "to": "source"
            }
          ]
        }
      ]
    },
    "4.r3": {
      "name": "Feeding Frenzy",
      "text": "If an ally kills Void Strike's target before its next turn, your team gains 15 MP.",
      "src": "B:V3:4.l3",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "hit",
          "skill": "void_strike",
          "do": [
            {
              "mark": true,
              "until": "turn",
              "to": "target"
            }
          ]
        },
        {
          "k": "hook",
          "h": "trigger",
          "on": "enemyDied",
          "marked": true,
          "by": "ally",
          "do": [
            {
              "mp": 15,
              "to": "allAllies"
            }
          ]
        }
      ]
    },
    "4.d1": {
      "name": "Swift Void",
      "text": "Void Strike takes only half a turn.",
      "src": "B:V5:4.d1",
      "fx": [
        {
          "k": "skill",
          "sel": "self",
          "f": "turnCost",
          "op": "set",
          "v": 0.5
        }
      ]
    },
    "4.d2": {
      "name": "Ready Blades",
      "text": "After Void Strike, your next Mana Steal throws an extra dagger.",
      "src": "B:V5:4.d2",
      "syn": "Mana Steal",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "skillUse",
          "do": [
            {
              "buff": {
                "repeatChance": 1
              },
              "uses": 1,
              "skill": "mana_burn"
            }
          ]
        }
      ]
    },
    "4.d3": {
      "name": "Threaded Void",
      "text": "Void Strike leaves a Ley Thread on its target for 2 turns, and your next turn comes 10% sooner.",
      "src": "B:V3:4.d3",
      "_not": "content-designer 2026-10-29 (Mage/AM reworkü): yeni düğüm, yalnızca var olan fx sözlüğü; sayılar PROVİZYON (open-questions 457).",
      "fx": [
        {
          "k": "addEffect",
          "after": "damage",
          "effect": {
            "type": "status",
            "status": "ley_thread",
            "turns": 2
          }
        },
        {
          "k": "hook",
          "h": "trigger",
          "on": "skillUse",
          "do": [
            {
              "sooner": 0.1
            }
          ]
        }
      ]
    },
    "4.l1": {
      "name": "Rallying Break",
      "text": "If Void Strike's target had a buff, your team gains Haste for 1 turn.",
      "src": "B:V5:4.l1",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "hit",
          "when": {
            "targetHasBuff": true
          },
          "do": [
            {
              "status": "haste",
              "turns": 1,
              "to": "allAllies"
            }
          ]
        }
      ]
    },
    "4.l2": {
      "name": "Turned Boons",
      "text": "Allies hasted by Rallying Break also gain 4 MP.",
      "src": "B:V5:4.l2",
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "hit",
          "drop": "4.l1",
          "when": {
            "targetHasBuff": true
          },
          "do": [
            {
              "status": "haste",
              "turns": 1,
              "to": "allAllies"
            },
            {
              "mp": 4,
              "to": "allAllies"
            }
          ]
        }
      ]
    },
    "4.l3": {
      "name": "Grand Theft",
      "text": "Void Strike steals every buff from its target and spreads them across your team.",
      "src": "B:V5:4.l3",
      "new": true,
      "approved": true,
      "fx": [
        {
          "k": "hook",
          "h": "trigger",
          "on": "hit",
          "do": [
            {
              "steal": true,
              "to": "target"
            }
          ]
        }
      ]
    }
  }
}
```

### Son denge ölçümü (`docs/arch/areas/character-design.md`)

Warrior 55,5 / 54,3 | Undead 54,4 / 53,8 | Skald 53,4 / 53,5 | Druid 53,1 / 54,0 | Anti-Mage 51,9 / 51,6 | Hexer 50,8 / 51,6 | Mage 48,7 / 49,3 | Gambler 47,9 / 47,0 | Cutthroat 47,5 / 48,2 | Archer 47,2 / 49,1 | Vesper 47,3 / 46,1 | Paladin 47,1 / 45,7 | Defender 45,5 / 45,6. Hepsi bantta. Skald menzil 3'te 48,9 / 51,3 idi (+2-4,5 puan). Sim ağaçsız: Vesper Thunder After burada görünmez.

### Bu sınıfa bağlı testler

Dosya adı eşleşenler:

- tests/am-legacy-helpers.ts
- tests/am-thread-instinct.test.ts
- tests/mana-burn-rule.test.ts
- tests/skill-tree-fx-antimage.test.ts

Ad geçmeyen ama içeriğinde antimage / mana_burn / void_strike / spell_ward geçenler (yalnız liste):

- tests/ai-context.test.ts
- tests/ai-coverage.test.ts
- tests/ai-difficulty.test.ts
- tests/ai-global.test.ts
- tests/ai.test.ts
- tests/am-thread-instinct.test.ts
- tests/area-migration.test.ts
- tests/ashford-freeze.test.ts
- tests/buffs.test.ts
- tests/campaign.test.ts
- tests/cc-immunity-charge.test.ts
- tests/company-suggest.test.ts
- tests/cutthroat.test.ts
- tests/damage-scale-rule.test.ts
- tests/drain-silence.test.ts
- tests/equip-move.test.ts
- tests/formation-ai.test.ts
- tests/gambler.test.ts
- tests/golden/harness.ts
- tests/hexer.test.ts
- tests/item-power.test.ts
- tests/item-rules.test.ts
- tests/ley-brand.test.ts
- tests/loadout.test.ts
- tests/mana-burn-rule.test.ts
- tests/mana-pool.test.ts
- tests/mana-steal-miss.test.ts
- tests/mechanics.test.ts
- tests/mob-passives.test.ts
- tests/offhand-main-first.test.ts
- tests/offhand.test.ts
- tests/poses.test.ts
- tests/preview.test.ts
- tests/primary.test.ts
- tests/range.test.ts
- tests/run-down-summoner-chain.test.ts
- tests/sets-all.test.ts
- tests/shield-hooks-bond.test.ts
- tests/side-neighbors.test.ts
- tests/skill-tags.test.ts
- tests/skill-tree-fx-antimage.test.ts
- tests/skill-tree-fx-leybrand.test.ts
- tests/skill-tree-fx-rework.test.ts
- tests/skill-tree-fx2c.test.ts
- tests/skill-tree-fx4-hag.test.ts
- tests/skill-tree-fx4a.test.ts
- tests/skill-tree-fx4c.test.ts
- tests/skill-tree-fx5a.test.ts
- tests/skill-tree-fx5b.test.ts
- tests/skill-tree-fx6.test.ts
- tests/skill-tree.test.ts
- tests/sprite-needs.test.ts
- tests/team-size.test.ts
- tests/tree-new-triggers.test.ts
- tests/tutorial-situations.test.ts
