# Skill ağacı fx kataloğu (11 class, 715 düğüm)

Durum: **SINIFLANDIRMA** (fx yazılmadı; `data/` değişmedi). Hazırlayan: content-designer, 2026-10-22.
Kaynak: `data/skill-trees/<class>.json` (11 class × (60 düğüm + 5 Mastery bar) = 715; 15'inin fx'i yazılı), `docs/design/skill-tree-implementation.md` (2.3 fx dili, 4.2 kanca aileleri, 4.4 / 4.5 örnekleri, 10a cevaplar), `data/skills.json`, `data/statuses.json`, `data/grounds.json`, `src/engine/types.ts > ItemEffects / SkillEffectKind / PassiveDef`, `src/progression/skill-tree-compile.ts > FX_FIELDS`.
Amaç: engine-dev'in C1 koşul sözlüğünü ve C3-C6 kapsamını 11 class'a göre kurması; content-designer'ın fx yazım sırası.

## 0. Okuma anahtarı
| Kat. | Anlamı | Faz |
|---|---|---|
| **a** | Düz sayı; alan bugün `FX_FIELDS` beyaz listesinde (`self`, `damage`, `status`, `taunt`, `guard`, `ground`, `bonusScale`) ya da pasif alanı | 2 (çoğu 1a'da yazılabilirdi) |
| **a\*** | Düz sayı; alan motorda VAR ama beyaz listede yok (ör. `heal.power`, `hot.turns`, `shield.power`, `revive.hpRatio`, `manaBurn.*`, `bet.*`, `omen.stacks`, `dot.*`, `bond.ratio`, `cost.ofCurrent`, `summon.lifespan`, `dispel.count`). Derleyiciye seçici + alan eklemek yeter | 2 |
| **b** | Var olan etki: `addEffect` / `replaceEffect` (status, randomStatus, dispel, shield, ground, taunt, guard, detonate…) ya da `unitFx` (var olan `ItemEffects` anahtarı). Yeni durum VERİSİ gerektirenler ayrıca işaretli | 2 |
| **C1** | Koşullu değiştirici (`cond`): koşul anahtarı + değiştirici (mod). "Koşulsuz" yazanlar motorda olmayan yeni bir skill alanı (kritik hasarı, ıskalamaz, kritik olamaz…) ister; `when` boş C1 olarak yazılır | 2 |
| **C2** | Rage (yalnız Warrior) | 2 |
| **C3** | Tetik (`trigger`): olay → eylem | 4 |
| **C4** | Şifa / kalkan / alınan hasar (`heal`) | 4 |
| **C5** | Hedef / alan / aura / zemin / çağrı yerleşimi (`target`) | 5 |
| **C6** | Tekil kural (`rule`) | 5 |

**Çok aileli düğüm kuralı:** düğüm, istediği parçalardan **en geç fazdaki** aileye yazılır (ör. b + C1 + C3 → C3); notta öbür parçalar `+b`, `+C1` diye geçer. Başka bir düğümün kurduğu kancayı / zemini / etkiyi yamalayan düğüm, o kancanın ailesini alır (ör. Defender 1.mb Sinking Earth, 1.eb'nin yeni zeminini yamaladığı için C5). Bu kural 4.4 / 4.5'ten birkaç satırı değiştirdi (bölüm 13).
**Not dili:** koşul anahtarları `targetStatus:wound` gibi; YENİ olanlar bölüm 12.1'de ayrı listede. `r` = rank başına (`rank: true`). `(çağrı)` = Treant / Skeleton gibi çağrının skill'ini / statını yamalar (bölüm 12.6). `[NEW]` = NEW işaretli (hepsi onaylı, 10a).

## 1. Warrior (Berserker, Double Strike = `melee_attack`, Whirlwind, Charge, ult Headsman's Blow; Iron Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Heavy Hand | b | `unitFx.openerStatus {slow, 1, max 1}` (10a: ilk hasar veren skill) |
| bar10 | Second Wind | b | `unitFx.secondWind {below 0.3, heal 0.1}` |
| bar15 | Crushing Weight | C1 | tüm skill'ler `targetStatusAny:[stun,slow,staggered]` → `powerMul 0.08` (4.4 "b" diyordu; ItemEffects'te karşılığı yok, `bonusVsStatus` yalnız pasif tipi) |
| bar20 | Stubborn Heart | C3 | `turnStart` + `selfHpBelow:0.25` → maks canın %3'ü şifa |
| bar25 | Stagger Step | C3 | `statusApplied(stun, kaynak ben)` savaşta 1 kez → `turnSooner 0.3` (Skip Turn hız desteği) |
| 0.f1 | Thick Hide | b | `unitFx.lowHpReduce {below 0.5, reduce 0.02r}` |
| 0.f2 | Grit | C4 | `selfHpBelow:0.25` → alınan şifa × (1 + 0.05r) |
| 0.f3 | Shared Scars | C1 | pasif `maxBonus` + 0.02r × `alliesBelowHp:0.5` (10a: düz ekleme) |
| 0.n0 | Iron Retort | C3 | `hpThresholdFirst(self, 0.5)` → saldırana Stun 1 |
| 0.r | Hardened | C3 | `statusGained(fortify)` → maks canın %2r'si şifa |
| 0.ea | Measured Mending | C4 | alınan şifa: `selfHpBelow:0.5` ×1.25, üstünde ×0.5 |
| 0.eb | Stand Firm | C4 | tek vuruş ≥ maks canın %30'u → ×0.75 |
| 0.ma | Red Line | C4 | canı %50 üstüne çıkaracak şifa → 2 turluk kalkan (`ShieldHook.turns`) |
| 0.fa | Grave Pact | C1 | `selfHpBelow:0.25` → `lifestealAdd 0.15`; `selfHpAbove:0.5` → `powerMul -0.15` |
| 0.fb | Iron Will | C6 | sana gelen Stun / Slow −1 tur (10a: 1 turluk Stun tamamen düşer) +C4 alınan şifa ×0.8 |
| 0.mb | Not Today | C6 | savaşta 1 kez ölümcül vuruş → 1 can + Fortified 1 |
| 0.v | Undying Rage [NEW] | C6 | `selfHpBelow:0.25` iken kritik olmayan vuruş 1'in altına indiremez; +C2 her kurtarış −10 Rage |
| 1.f1 | Knee Cutter | b | `addEffect status slow 1, chance 0.05r` |
| 1.f2 | Notched Axe | a | YAZILI: `damage:1.power pct 0.04r` |
| 1.f3 | Hard Knocks | C1 | `damage:1` `targetStatus:slow` → `critBonus 0.04r` |
| 1.n0 | Gut Strike | C1 | +b `status wound 2` (damage:0'dan sonra); `damage:1` `targetStatus:wound` → `powerMul 0.2` |
| 1.r | Bone Saw | C1 | `targetStatus:wound` → `ignoreDefense +0.04r` |
| 1.ea | Hamstring | b | `addEffect after damage:1 status slow 1` |
| 1.eb | Deep Gash | a | `status:wound.turns set 4` (n0'ın eklediği etki; Faz 1a'da null kaldı) |
| 1.ma | Hobble | C1 | `targetStatus:slow` → `extendStatus slow +1` + `powerMul 0.15` |
| 1.fa | Crippling Pair | a | `status:slow.turns set 2` + `damage.power pct -0.15` (Slow f1 / ea'dan gelir) |
| 1.fb | Third Cut | C5 | `targetStatus:wound` → 3. vuruş (ek vuruş) +C1 `noCrit` |
| 1.mb | Butcher's Carve | C1 | `targetStatus:wound` `perTurnLeft` → `powerMul 0.05` |
| 1.v | Skull and Knee | C1 | +b damage:0 sonrası Slow 1; damage:1 `targetStatus:slow` → `addStatus stun 1`; +a `cooldown set 2` |
| 2.f1 | Steady Spin | a | YAZILI: `damage.lifesteal add 0.02r` |
| 2.f2 | Spin Recovery | C4 | vurulan düşman başına maks canın %1r'si şifa |
| 2.f3 | Hungry Arc | C1 | `selfHpBelow:0.5` → `powerMul 0.03r` |
| 2.n0 | Gore Wheel | b | `addEffect status wound 2` (10a: vuruştan önce işler → etki damage'dan önce) |
| 2.r | Red Arc | C1 | `targetStatus:wound` → `powerMul 0.03r` |
| 2.ea | Thirst | C1 | `targetStatus:wound` → `lifestealMul 2` |
| 2.eb | Reaping Wind | C2 | Rage tüm hedeflerden (10a: perCastCap 20 kalır) |
| 2.ma | Blood Glut | C4 | maks canı aşan şifa → %1 başına 1 Rage (+C2) |
| 2.fa | Glass Cyclone | b | +a `lifesteal add 0.25`; kendine YENİ durum "+%15 alınan hasar" 1 tur (10a; `damageTakenMult` alanı var → yalnız veri) |
| 2.fb | Reaper's Spin | C1 | `targetStatus:wound` → `powerMul 0.3`, değilse ×0 |
| 2.mb | Crimson Wheel | C1 | `hitCountWithStatus:wound` → `powerMul 0.08` / adet |
| 2.v | Exsanguinate | C6 | vurulanın Wound'unu tüketir: o vuruş ×1.4 + lifesteal ×2 (`detonate` benzeri) |
| 3.f1 | Rolling Start | C1 | `targetNotActed` → `powerMul 0.03r` |
| 3.f2 | Vengeful Run | C1 | `targetLastHitMe` (10a: yalnız skill vuruşu) → `powerMul 0.05r` |
| 3.f3 | War Gallop | C2 | isabette +2r Rage |
| 3.n0 | Roaring Charge | C2 | `firstUseOfSkill` → Rage = max(Rage, 30) |
| 3.r | Grim Momentum | C2 | `selfMissingHp` her %20 → +1r Rage |
| 3.ea | Grudge Charge | C1 | `targetLastHitMe` → `statusTurns stun +1` |
| 3.eb | Blood Up | C2 | `targetFullHp` → +10 Rage |
| 3.ma | Payback | C1 | `targetLastHitMe` → `powerMul 0.4` + `lifestealAdd 0.5` |
| 3.fa | Martyr's Rush | b | `addEffect taunt 1` + kendine YENİ "+%15 alınan hasar" durumu (2.fa ile aynı) |
| 3.fb | Reckless Heat | C2 | +a `status:stun.turns set 1`; +20 Rage |
| 3.mb | Into the Fire | C2 | Charge sonrası sıradaki Headsman's Blow Rage bedeli −10 (`skill` sinerji, durum bayrağı) |
| 3.v | Herald of Ruin | C3 | +C2 tutulan Rage başına +%1 güç; `statusEnd(stun, kaynak bu Charge)` → +10 Rage (4.4'te C2) |
| 4.u1 | Headsman's Feast | a | YAZILI: `damage.lifesteal set 0.2` |
| 4.u2 | Gravedigger | C1 | `selfHpBelow:0.25` → `lifestealMul 2` |
| 4.u3 | Grave Robber | C3 | `onKill` → maks canın %25'i şifa + Fortified 1 |
| 4.r1 | Ringing Headsman | b | `addEffect status stun 1` |
| 4.r2 | Heavy Toll | C1 | `rageSpent≥40` → `statusTurns stun set 2` |
| 4.r3 | Mercy Stroke | C1 | `targetStatus:stun` → `sureHit` + `guaranteedCrit`, sonra hedefin Stun'ı silinir (+b `dispel` `kinds` süzgeci) |
| 4.d1 | Grim Calm | b | `addEffect status fortify 1 self` |
| 4.d2 | Clean Slate | b | `addEffect dispel debuff` kendine (`dispel`'e `self` bayrağı) |
| 4.d3 | Executioner's Calm | C6 | sonraki turuna kadar debuff tutmaz |
| 4.l1 | Dreadful Swing | C5 | hedef + yan komşular Jinxed 2 (10a) |
| 4.l2 | Blinding Spray | C5 | hedef + yan komşular Blinded 2 |
| 4.l3 | Terror | C3 | `onKill` → tüm düşmanlar Jinxed 2 |

**Özet:** düğüm (60): a 5 · a\* 0 · b 9 · C1 20 · C2 7 · C3 5 · C4 6 · C5 3 · C6 5 — bar (5): b 2, C1 1, C3 2.

## 2. Defender (Bulwark Aura, Tremor Slam, Taunt, Close Ranks, ult Fist Crush; Rampart Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Iron Morning | C3 | ilk turunda görünen toplam zırhın %50'si kalkan (10a; +C4 zırh oranlı kalkan) |
| bar10 | First Tremor | C1 | `firstUseOfSkill` → `statusTurns slow +1` (4.5'te C3) |
| bar15 | Formed Up | C1 | `firstUseOfSkill` (close_ranks) → `costMul 0` (4.5'te C3; `firstSkillFree` skill'e özgü değil) |
| bar20 | Fault Line | C3 | `statusEnd(stun, kaynak ben)` → hedefe Slow 1 |
| bar25 | Last Wall Standing | b | `unitFx.vengeance {[fortify], 1}` kapsam tüm dostlar (bugün yan komşu; kapsam parametresi gerekir) |
| 0.f1 | Braced Stance | C1 | `noMoveLastTurn` → auranın sendeki payı + %5r zırh (kendi payı ayrımı: soru 14.2) |
| 0.f2 | Drilled Ranks | C5 | aura dostlara büyü zırhı da verir (zırhının %3r'si; yeni aura alanı) |
| 0.f3 | Tight Formation | C1 | `alliesInAura` → aura + %2r / dost |
| 0.n0 | Shield Brothers | C3 | `battleStart` → auradaki dostlara maks canın %10'u kalkan (+C4) |
| 0.r | Weathered | C1 | `incomingArea` → sendeki aura + %5r |
| 0.ea | Rooted Stance | C3 | üst üste yürümediğin her tur sendeki aura + %10 (en çok + %40; 10a kalır; `stonePatience` benzeri) |
| 0.eb | Diagonal Guard | C5 | aura şekli artı → 3×3 |
| 0.ma | Unyielding | C6 | Rooted Stance doluyken Stun / çekilme bağışıklığı |
| 0.fa | Anchored Stone | C6 | sendeki aura ×1.5 + Move kilidi |
| 0.fb | Pledged Plate | C5 | dostların payı %100 + kendi zırhın ×0.7 (kendi / dost payı ayrımı) |
| 0.mb | Living Rampart | C3 | `hpThresholdFirst(ally in aura, 0.3)` dost başına 1 kez → Fortified 1 |
| 0.v | Fortress Aura | C3 | `turnStart` → aura zırh bonusu kadar kalkan (+C4) |
| 1.f1 | Deep Stomp | b | `replaceEffect status:slow → randomStatus [slow 3 (0.15r), slow 2 (1−0.15r)]` |
| 1.f2 | Shockwave | C1 | `targetStatus:slow` → `powerMul 0.05r` |
| 1.f3 | Ringing Earth | b | `addEffect status stun 1, chance 0.03r` |
| 1.n0 | Rolling Quake | C5 | arka sıraya da %50 hasar, Slow'suz (10a: hedef en arkadaysa ek vuruş yok) |
| 1.r | Fault Strike | C3 | `statusApplied(stun, bu skill)` → +2r MP |
| 1.ea | Skull Rattler | C1 | `targetStatus:slow` → `addStatus stun 1, chance 0.2` |
| 1.eb | Aftershock Ground | C5 | YENİ zemin "quaking ground" 2 tur: üstündeki düşman tur başında Slowed |
| 1.ma | Third Quake | C3 | `everyNthUse 3` → ilk vurulana Stun 1 |
| 1.fa | Heavy Landing | a | YAZILI: `status:slow.turns set 3` + `bonusScale:armor.pct set 0` |
| 1.fb | Endless Tremor | C5 | eb zeminini yamalar: `ground.turns set 4` + a `damage.power pct -0.4` (4.5'te a) |
| 1.mb | Sinking Earth | C5 | eb zeminine %15 STR tik (4.5'te b; zemin eb'den) |
| 1.v | Earthsplitter | C5 | yeni alan: tam sıra + tam şerit, menzil yok sayılır (10a); +a Slow 3 |
| 2.f1 | Bellow | a | YAZILI: `taunt.breakRatio add 0.03r` |
| 2.f2 | Second Breath | C3 | `statusEnd(taunt)` → maks canın %3r'si şifa |
| 2.f3 | Thick Skull | C4 | Taunt maks canın %3r'si kadar kalkan |
| 2.n0 | Cover Them | C3 | `hpThresholdFirst(ally, 0.3)` → Taunt cooldown sıfır |
| 2.r | Rally Cry | a | YAZILI: `taunt.allyDamageMult add -0.02r` |
| 2.ea | Stand Fast | a | YAZILI: `taunt.turns set 3` |
| 2.ma | Weathered the Storm | C3 | `statusEnd(taunt, kırılmadan)` → Fortified 1 |
| 2.fa | Ironbound Oath | a | YAZILI: `breakRatio set 0` + `allyDamageMult set 1` |
| 2.eb | Brief Defiance | a | YAZILI: `self.cooldown set 3` |
| 2.mb | Refused to Fall | C3 | `statusEnd(taunt, kırıldı)` → cooldown sıfır + zırhın %30'u kalkan (+C4) |
| 2.fb | Hollow Roar | a | YAZILI: `cost.amount set 0`, `cooldown set 2`, `breakRatio base 0.15` |
| 2.v | Bastion Cry | C3 | +b kendine Fortified; 10a: Taunt bitince / kırılınca biter → `statusEnd(taunt)` → Fortified sil (4.5'te b) |
| 3.f1 | Interlocked | C5 | korunanlara zırhının %3r'si zırh |
| 3.f2 | Shield Chain | C4 | korunanlara zırhının %4r'si kalkan |
| 3.f3 | Linked Plates | C4 | sana aktarılan hasar × (1 − 0.03r) |
| 3.n0 | Second Chain | C5 | kendi sırandaki dostlar da korunur (ikinci Guard kümesi) |
| 3.r | Linked Shields | C4 | korunan dost başına zırhının %5r'si kendine kalkan |
| 3.ea | Hold Their Weight | a | YAZILI: `guard.share set 0.65` |
| 3.ma | Final Shield [NEW] | C6 | korunan dost ölecekse öldürücü vuruşu sen alırsın (`interceptLethal`, kapsam guarded) |
| 3.fa | Chained to Them | C6 | +a `share set 0.8`; sürerken Move ve Taunt kilidi |
| 3.eb | Shield Toss | C4 | korunanlara zırhının %25'i kalkan |
| 3.mb | Steady Them | b | korunanlardan Stun + Slow sil (`dispel` `kinds` süzgeci) |
| 3.fb | Loose Chain | a | YAZILI: `cooldown 3`, `guard.turns 2`, `share 0.35` |
| 3.v | Phalanx [NEW] | C6 | korunan dosta gelen hasar tüm korunanlar + sen arasında eşit bölünür |
| 4.u1 | Payback Fist | C5 | hedef önceliği: `targetHitMeSinceTurn` olanlar önce |
| 4.u2 | Bitter Knuckles | C1 | `targetHitMeSinceTurn` → `powerMul 0.25` |
| 4.u3 | Settle the Score | C5 | savaşta sana en çok hasar vereni normal vuruşlara EK 2 kez vurur (10a; hasar defteri) |
| 4.r1 | Plated Gauntlet | a | YAZILI: `bonusScale:armor.pct set 0.15` |
| 4.r2 | Heavier Fall | C1 | `selfArmorAbove:40` → her 2 zırh +%1 |
| 4.r3 | Iron Meteor | a | YAZILI: `pct set 0.4` + `count set 2` |
| 4.d1 | Plate Hunter | C5 | hedef önceliği: en zırhlılar önce |
| 4.d2 | Can Opener | C1 | `targetArmor` (ölçek) → +%1 / puan |
| 4.d3 | Breaker of Walls | C1 | `targetArmorAboveMine` → `ignoreDefense 1` |
| 4.l1 | Swift Iron | a | YAZILI: `cooldown set 3` |
| 4.l2 | Pain Into Iron | C1 | `selfMissingHp` her %10 → `costDelta -1` |
| 4.l3 | Forge Again | C3 | `onKill` → cooldown sıfır |

**Özet:** düğüm (60): a 12 · a\* 0 · b 3 · C1 10 · C2 0 · C3 12 · C4 5 · C5 13 · C6 5 — bar (5): b 1, C1 2, C3 2.

## 3. Paladin (Divine Light, Holy Strike, Resurrection, Judgment, ult Radiance; Crusade Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Battle Hymn | C1 | `firstTurn` → Holy Strike `powerMul 0.3` (`openingDamageMult` birim geneli, skill'e özgü değil) |
| bar10 | Holy Soil | C1 | tüm skill'ler `targetOnGround:holy_fire` → `powerMul 0.08` |
| bar15 | Charging Faith | b | `unitFx.killRush {haste, 1, mpRatio 0}` |
| bar20 | Kindled Path | C3 | `enemyDied(onGround holy_fire)` → Judgment cooldown −1 |
| bar25 | Crusader's Oath | C3 | `hpThresholdFirst(self, 0.3)` 1 kez → `nextSkillBuff guaranteedCrit` |
| 0.f1 | Wrathful Glow | C5 | pasif ek eylem: "en zayıf" düşmana %4r INT kutsal hasar (pasif bugün hasar vermez; hedef seçimi soru 14.3) |
| 0.f2 | Kindled Resolve | C3 | `passiveHeal(divine_light)` → şifalanan dosta `nextSkillBuff powerMul 0.02r` |
| 0.f3 | Bedside Watch | C4 | pasif şifa `targetHpBelow:0.5` → × (1 + 0.04r) |
| 0.n0 | No Rest for Evil | C5 | canı eksik dost yoksa (soru 14.3) şifa yerine en zayıf düşmana %30 INT kutsal hasar |
| 0.r | Sun-Forged Will | C1 | pasifin smite'ı `targetHpBelow:0.5` → `powerMul 0.05r` (smite f1 / n0 / ea'dan) |
| 0.ea | Twofold Light | C5 | her tur şifaya ek olarak en zayıf düşmana %20 INT smite |
| 0.eb | Anointed Arms | C3 | `passiveHeal` → dosta `nextSkillBuff powerMul 0.15` |
| 0.ma | Chain of Light | C3 | `onKill(smite)` → hemen bir smite daha |
| 0.fa | Vengeful Light | C5 | smite ×2 (C5 smite'ı yamalar) + a pasif `power pct -0.4` |
| 0.fb | Fervent Oath | C5 | eb'nin bonusu ×2 + pasif seni hedefleyemez (hedef dışlama) |
| 0.mb | Banner of Dawn | C1 | pasif şifa noktası: `targetHpBelow:0.5` → `addStatus haste 1` |
| 0.v | Crusader's Dawn | C5 | en yaralı dosta şifa + en zayıf düşmana aynı miktarda hasar; +C3 öldürürse 5 MP |
| 1.f1 | Relentless Hammer | C1 | `targetIsMyLastTarget` → `powerMul 0.02r` |
| 1.f2 | Piercing Light | a | `damage.ignoreDefense add 0.03r` (büyü vuruşunda büyü zırhına uygulanıyor mu doğrulanacak) |
| 1.f3 | Sparking Hammer | b | `addEffect dot burning 2, chance 0.06r` (+a\* `dot.chance` alanı yok; güç metinde yok: soru 14.4) |
| 1.n0 | First Smite | C1 | `firstUseOfSkill` → `guaranteedCrit` |
| 1.r | Unyielding Swing | C1 | `targetRow:front` → `powerMul 0.05r` |
| 1.ea | Rising Fervor | C1 | `skillStreak` (ölçek) → `powerMul 0.1` / adım; başka skill sıfırlar |
| 1.eb | Shockwave | C5 | hedefin yan komşularına %30 sıçrama |
| 1.ma | Hammer Rhythm | C5 | +C1 `skillStreak≥3` → ikinci vuruş (ek vuruş) |
| 1.fa | Blind Zeal | C1 | +a ea adımı %20; `skillStreak>0` iken pasif şifa ×0.7 |
| 1.fb | Heavy Hammer | a | `damage.power pct 0.35` + `cost.amount set 6` |
| 1.mb | Hammerfall Quake | C3 | `onKill` → ölenin sırasına %40 hasar |
| 1.v | Hammer of the Heavens | C5 | ikinci çekiç: canı en düşük düşmana %60 |
| 2.f1 | Life for Life | C4 | +a\* `revive.hpRatio add 0.04r`; aynı miktar senin canından (can aktarımı) |
| 2.f2 | Shielded Return | C4 | dirilen maks canının %4r'si kalkanla kalkar |
| 2.f3 | Desperate Rite | C1 | `selfHpBelow:0.5` → `costDelta -2r` |
| 2.n0 | Soul Exchange | C6 | MP yerine mevcut canın %25'iyle ödenebilir (seçim kuralı: soru 14.26) |
| 2.r | Iron Return | C4 | dirilenin aldığı ilk vuruş × (1 − 0.1r) (YENİ durum ya da kanca) |
| 2.ea | Untouchable Rise | b | `addEffect status fortify 1` (dirilen hedefe) |
| 2.eb | Quick Absolution | a | `cooldown set 4` |
| 2.ma | Risen in Glory | C3 | +b Blessed 2; dirilene `nextSkillBuff powerMul 0.3` |
| 2.fa | Heavy Absolution | C4 | dirilen maks canının %30'u kalkan + a `cooldown set 7` |
| 2.fb | Hasty Rite | a\* | `cooldown add -2` + `revive.hpRatio set 0.15` |
| 2.mb | Not Yet | C1 | `targetDiedSinceMyTurn` → `costMul 0` |
| 2.v | Martyr Rising [NEW] | C6 | savaşta 1 kez, Resurrection hazırken düşersen %40 canla kalkarsın ("hazır" tanımı: soru 14.32) |
| 3.f1 | Deep Coals | C1 | zemin tiki `groundAge≥2` → `powerMul 0.03r` |
| 3.f2 | Kindling | C1 | Holy Strike `targetOnGround:holy_fire` → `powerMul 0.02r` |
| 3.f3 | Spark of Wrath | b | `addEffect dot burning 2, chance 0.06r` (Judgment'ta bugün yalnız zemin var; güç soru 14.4) |
| 3.n0 | Sanctified Earth | a | `ground.turns set 3` |
| 3.r | Ash Upon Ash | C1 | zemin tiki `targetStatus:burning` → `powerMul 0.05r` |
| 3.ea | Undying Flame | C3 | `enemyDied(onGround)` → o hücrenin ateşi savaş sonuna kadar yarı güçte (süresiz zemin: soru 14.16) |
| 3.eb | Broad Sentence | C5 | artı şeklinin kolu 1 hücre uzar (yeni alan parametresi) |
| 3.ma | Fire on Fire | C5 | zaten yanan hücreye atılırsa o hücrenin ateşi ×2 (zemin üst üste kuralı) |
| 3.fa | Scorched Earth | a | `ground.turns add 2` + `cooldown set 5` |
| 3.fb | Scattered Flame | C5 | merkez sırasının tamamını da kaplar + a `ground.power pct -0.3` |
| 3.mb | Wildfire Verdict | C3 | `enemyDied(onGround)` → en yakın düşmanın hücresine 2 turluk ateş |
| 3.v | Day of Judgment | C3 | `groundEnd(holy_fire)` → içindeki her düşmana %60 INT kutsal hasar |
| 4.u1 | Searing Dawn | a | `damage.power pct 0.2` |
| 4.u2 | Scorching Light | b | `addEffect dot burning 2` tüm düşmanlara (güç soru 14.4) |
| 4.u3 | Wrath of Heaven | a | `damage.executeBonus set 0.5` |
| 4.r1 | Final Light | C1 | `targetHpBelow:0.3` → `powerMul 0.4` |
| 4.r2 | Reaping Dawn | C3 | `onKill` (her biri) → +5 MP |
| 4.r3 | Sunstrike | C3 | `onKill` → cooldown −2 |
| 4.d1 | Focused Beam [NEW] | C6 | ikinci kullanım biçimi: tek düşman, şifa yok, %220 hasar (seçim arayüzü + YZ: soru 14.27) |
| 4.d2 | Pillar of Wrath | C6 | d1 biçimine bağlı: hedef hücreye 2 turluk holy fire (b `ground`) |
| 4.d3 | Lance of Dawn | C6 | d1 biçimine bağlı: hedefin arkasındaki şeride %60 delme (+C5) |
| 4.l1 | Hallowed Steps | C3 | `afterSkillUse` → Judgment cooldown sıfır |
| 4.l2 | Frugal Glory | a | `cost.amount add -6` |
| 4.l3 | Second Sunrise | C1 | `healedCountBelow:0.5 ≥ 3` → bu kullanımın `cooldownSet 2` |

**Özet:** düğüm (60): a 8 · a\* 1 · b 4 · C1 14 · C2 0 · C3 11 · C4 5 · C5 12 · C6 5 — bar (5): b 1, C1 2, C3 2.


## 4. Archer (Sharpshooter, Quick Shot, Piercing Arrow, Arrow Rain, ult Aimed Shot; Still Bow Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Still Hands | C1 | `noMoveLastTurn` → `critBonus 0.05` ("first skill" soru 14.20) |
| bar10 | Knee Shots | C1 | birim geneli, koşulsuz: uyguladığın Slow `statusTurns +1` (`potencyTurns` tüm debuff'ları uzatır, uymaz) |
| bar15 | Wide Nock | a | Piercing Arrow `damage.falloff add 0.05` (soru 14.6) |
| bar20 | Full Quiver | a | Arrow Rain `cost.amount add -2` |
| bar25 | Plate Reader | a | Aimed Shot `damage.ignoreDefense add 0.05` |
| 0.f1 | Long Sight | a | pasif `perRow add 0.01r` |
| 0.f2 | Steady Feet | C1 | `noMoveLastTurn` → `critBonus 0.02r` (tüm skill'ler) |
| 0.f3 | Gap in the Plate | C1 | `targetDistance≥4` → `ignoreDefense +0.03r` |
| 0.n0 | Eagle Eye | C1 | `targetDistance` (ölçek) → `critBonus` = pasif bonusun yarısı |
| 0.r | Killing Distance | C1 | `targetDistance≥5` + `hitIsCrit` → `powerMul 0.08r` |
| 0.ea | Patient Aim | C1 | `notHitSinceMyTurn` → `critBonus 0.2` |
| 0.eb | Long Pin | C1 | `targetDistance≥5` → `addStatus slow 1, chance 0.15` |
| 0.ma | Held Breath | C3 | `onSkipTurn` → `nextSkillBuff guaranteedCrit + ignoreDefense 0.3` |
| 0.fa | Tunnel Vision | C1 | +a pasif `perRow add 0.04`; `targetDistance≤2` → `powerMul -0.25` |
| 0.fb | Exposed Perch | C4 | +C1 pasif mesafe +2 sıra (yeni pasif alanı); menzilli düşman skill'lerinden alınan hasar ×1.2 |
| 0.mb | Range Keeper [NEW] | C3 | `enemyMovedNear(≤3)` turlar arası 1 kez → bedava Quick Shot (`freeCast`) |
| 0.v | Dead Center | C1 | `firstHitOnTarget` + `targetDistance≥4` → `guaranteedCrit` |
| 1.f1 | Hamstring | b | `addEffect status slow 1, chance 0.06r` |
| 1.f2 | Practiced Release | C1 | `targetDistance≥4` → `critBonus 0.03r` |
| 1.f3 | Sting in the Eye | b | `addEffect status blinded 1, chance 0.04r` |
| 1.n0 | Shot to the Knee | C1 | `hitIsCrit` → `addStatus slow 2` |
| 1.r | Spiteful Nock | C1 | `targetStatusAny:[slow,blinded]` → `critBonus 0.03r` |
| 1.ea | Cut the Tendon | C1 | `targetStatus:slow` → `extendStatus slow +1` |
| 1.eb | For the Eyes | C1 | `hitIsCrit` → `addStatus blinded 1` |
| 1.ma | Hobbled | C1 | `targetStatus:slow` `turnsLeft≥2` → `addStatus stun 1` + Slow silinir (+b `dispel kinds`) |
| 1.fa | Leg Shot Only | b | `addEffect status slow 2` + `replaceEffect` haste (self) kaldır |
| 1.fb | Gouging Arrow | b | `addEffect status blinded 2` + a `cooldown set 2` |
| 1.mb | Blind Panic | C1 | `targetStatus:blinded` → `addStatus jinxed` (süre metinde yok: soru 14.22) |
| 1.v | Maiming Shot | C1 | Slow; `targetStatus:slow` → Blind; `slow+blinded` → Staggered (zincir koşul) |
| 2.f1 | Tempered Point | a | `damage.ignoreDefense add 0.03r` |
| 2.f2 | Weighted Head | C1 | `targetArmorAboveMine` → `powerMul 0.02r` |
| 2.f3 | Narrow Bodkin | C1 | `targetArmorAtLeast:20` → `falloff +0.02r` (hedef başına falloff) |
| 2.n0 | Bodkin Point | C1 | +a `ignoreDefense set 0.25`; `targetArmorAboveMine` → `ignoreDefense set 0.5` |
| 2.r | Rivet Breaker | C1 | `targetStatusAny:[fortify,blessed]` → `powerMul 0.04r` |
| 2.ea | Sunder [NEW] | b | `addEffect status sunder 2` — YENİ durum (zırh −%20; durumda zırh çarpanı alanı yok) |
| 2.eb | Strip Wards | b | `addEffect dispel buff count 1` |
| 2.ma | Shattered Line | C1 | Aimed Shot (`skill` sinerji) `targetStatus:sunder` → `ignoreDefense 1` |
| 2.fa | Brittle Point | C5 | alan 2. düşmanda durur + Sunder %40 (durum gücü: soru 14.7) |
| 2.fb | Spent Quarrel | a\* | eb'nin `dispel.count` kaldır (hepsi) + a `cooldown set 4` |
| 2.mb | Through the Guard | C6 | vurulanlarda Fortified, Blessed ve kalkanı yok sayar |
| 2.v | Siege Bolt | a | `ignoreDefense set 1` + `falloff set 0.9` |
| 3.f1 | Thick Volley | a | `damage.power pct 0.04r` |
| 3.f2 | Scatter Shot | b | `addEffect status slow 1, chance 0.05r` |
| 3.f3 | Rear Volley | C1 | `targetRow:back` → `powerMul 0.04r` |
| 3.n0 | Hobbling Hail | C1 | `targetStatus:slow` → `extendStatus slow +1` |
| 3.r | Stinging Shower | C1 | `hitCountWithStatus:slow` → `powerMul 0.03r` / adet |
| 3.ea | Spent Arrows | C5 | YENİ zemin "field of shafts" 2 tur: içindeki düşmanlar Slowed |
| 3.eb | Lingering Hail | b | `addEffect ground` YENİ zemin türü "lingering rain" 1 tur, %25 hasar (yalnız veri + ikon; ölçek soru 14.5) |
| 3.ma | Killing Field | C5 | ea zeminine tur başı %20 DEX + Blinded |
| 3.fa | Choking Rain | C5 | ea zemini 4 tur (ea'yı yamalar) + a `damage.power pct -0.4` |
| 3.fb | Endless Hail | a | eb zemini `ground.turns set 4` + `cooldown set 5` |
| 3.mb | Sky Full of Shafts | C5 | +a eb zemini +2 tur; Piercing Arrow yağmurun içinden geçerse falloff yok (zemin-yol etkileşimi) |
| 3.v | Arrow Storm | C5 | alan 3 → 4 sıra + b 2 turluk yağmur zemini (%30 / tur) |
| 4.u1 | Killing Shot | C1 | `targetHpBelow:0.5` → `powerMul 0.4` |
| 4.u2 | Heart Shot | C1 | `targetHpBelow:0.5` → `sureHit` |
| 4.u3 | Deathblow | a | `damage.executeBonus set 1` |
| 4.r1 | Trophy | C3 | `onKill` → cooldown sıfır |
| 4.r2 | Blood Rush | C3 | `onKill` → Haste 2 (`killRush` birim geneli; skill'e özgü) |
| 4.r3 | Next in Line | C3 | `onKill` → `nextSkillBuff powerMul 0.5 + sureHit` |
| 4.d1 | Snap Shot | C1 | `selfStatus:haste` → `cooldownDelta -1` |
| 4.d2 | Quick Sight | a | `initialCooldown set 0` |
| 4.d3 | Lightning Draw | C5 | +C1 `fasterThanTarget` → ikinci atış %50 (ek vuruş) |
| 4.l1 | Draw and Vanish | b | `addEffect status fleet 2 self` |
| 4.l2 | Light Feet | b | `addEffect status haste 2 self` |
| 4.l3 | Ghost Archer | b | `addEffect status shrouded 2 self` |

**Özet:** düğüm (60): a 7 · a\* 1 · b 11 · C1 27 · C2 0 · C3 5 · C4 1 · C5 7 · C6 1 — bar (5): a 3, C1 2.

## 5. Mage (Spell Echo, Fire Bolt, Blizzard, Mana Barrier, ult Meteor; Arcane Tempo Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | First Refrain | C1 | `firstUseOfSkill` (cooldown'lu büyü, savaşta ilk) → `echoChance set 1` |
| bar10 | Resonant Kill | C3 | `onKill` → en uzun cooldown −1 |
| bar15 | Low Tide | C3 | `mpBelowFirst(0.25)` 1 kez → sonraki büyü bedelsiz |
| bar20 | Momentum | C3 | `onKill` → `nextSkillBuff powerMul 0.15` |
| bar25 | Encore | C3 | `hpThresholdFirst(self, 0.4)` 1 kez → tüm cooldown'lar sıfır |
| 0.f1 | Resonance | a | pasif `chance add 0.02r` |
| 0.f2 | Killing Echo | C1 | `killedThisCast` → `echoChance +0.03r` |
| 0.f3 | Rapid Recall | C3 | `onEcho` → `turnSooner 0.04r` |
| 0.n0 | Overload | C3 | `onEcho` → o büyünün yeniden kullanımı `guaranteedCrit` (bayrak) |
| 0.r | Overtone | C1 | `hitCount` (ilkten sonraki her biri) → `echoChance +0.01r` |
| 0.ea | Echo Chamber | C3 | `onEcho` → savaş boyu `echoChance +0.03` (birikir) |
| 0.eb | Sympathy | C3 | `onEcho` → öbür cooldown'lu büyüler −1 |
| 0.ma | Endless Refrain | C3 | `onEcho` → yeniden kullanımda `echoChance ×2` |
| 0.fa | Unstable Weave | C3 | `onEcho` → yeniden kullanım +%40; `onEchoFail` → o cooldown +1 |
| 0.fb | Frayed Threads | C3 | eb kancasını yamalar (2 tur) + a pasif `chance` 0.25 → 0.18 (`base` mı `set` mi: soru 14.8) |
| 0.mb | Time Fold | C3 | `onEcho` → yeniden kullanım yarım tur (`turnCost 0.5`) |
| 0.v | Arcane Overload | C3 | `onEcho` → TÜM cooldown'lar sıfır + yeniden kullanım +%20 |
| 1.f1 | Focused Bolt | a | `damage.critBonus add 0.02r` |
| 1.f2 | Searing Crit | C1 | koşulsuz `critDmgMul 0.06r` (yeni alan) |
| 1.f3 | Clean Shot | C1 | `targetFullHp` → `powerMul 0.06r` |
| 1.n0 | Weak Spot | C1 | `hitIsCrit` → `ignoreDefense 0.3` (büyü zırhı) |
| 1.r | Finisher | C1 | `targetHpBelow:0.3` → `powerMul 0.05r` |
| 1.ea | Keen Gaze | C1 | koşulsuz `sureHit` (yeni alan) + a `critBonus add 0.1` |
| 1.eb | Execution Bolt | C1 | `targetHpBelow:0.25` → `powerMul 0.5` |
| 1.ma | Hot Streak | C3 | `onCrit` → sıradaki Fire Bolt `guaranteedCrit` |
| 1.fa | Unstable Focus | C1 | `hitIsCrit` → `powerMul 0.5`, değilse −0.2 |
| 1.fb | Reckless Bolt | C1 | `targetHpBelow:0.5` → +0.35, değilse −0.2 |
| 1.mb | Rolling Doom [NEW] | C3 | `onKill` → canı en düşük düşmana bedava Fire Bolt (`freeCast`), her öldürmede tekrar |
| 1.v | Sunfire | C5 | +a `power pct 0.4`; +C1 `hitIsCrit` → tam hasar yan komşulara sıçrar |
| 2.f1 | Biting Gale | b | `addEffect status slow 1, chance 0.1r` |
| 2.f2 | Numbing Cold | C1 | `targetStatus:slow` → `powerMul 0.04r` |
| 2.f3 | Driving Snow | b | `addEffect status blinded 1, chance 0.05r` |
| 2.n0 | Hard Frost | C5 | alanın ön sırasındaki düşmanlara her zaman Slow 1 (alan içi alt seçim) |
| 2.r | Snow Blindness | C1 | `targetStatus:blinded` → `powerMul 0.04r` |
| 2.ea | Flash Freeze | C1 | `targetStatus:slow` → `addStatus stun 1, chance 0.5` |
| 2.eb | Whiteout | a | f3'ün `status:blinded.chance` ×2 + `turns set 2` (f3'e bağlı) |
| 2.ma | Winter's Grip | C1 | `anyEnemyStatus:stun` → `cooldownSet 1` |
| 2.fa | Black Ice | C1 | ea'nın koşullu Stun şansı `set 1` (ea'yı yamalar) + a `power pct -0.4` |
| 2.fb | Howling Squall | C5 | alan 3×2 → 3×3 + a `cost.amount set 20` |
| 2.mb | Lost in the Snow | C3 | `enemyMissed` (Blizzard'ın Blind'ı olan saldıran) → Stun 1 (kaynak takibi: soru 14.25) |
| 2.v | Eternal Winter [NEW] | C5 | YENİ zemin "storm" 2 tur: turuna orada başlayan düşman Slowed |
| 3.f1 | Rimeguard | C4 | `targetRow:front` → kalkan × (1 + 0.05r) |
| 3.f2 | Cauterize | C3 | `onDispel` (silinen her debuff) → dosta maks canın %2r'si şifa (+C4) |
| 3.f3 | Numbing Touch | C4 | kalkan sürerken Slowed saldıranların taşıyana verdiği hasar × (1 − 0.03r) |
| 3.n0 | Ice Mirror | C3 | `onShieldAbsorb` (ilk vuruş) → saldırana Slow 2 (`OnAbsorbSpec` genişler) |
| 3.r | Frozen Reserve | C3 | `onShieldAbsorb` + saldıran Slowed → +1r MP |
| 3.ea | Frost Armor | C3 | `onShieldAbsorb` (her vuruş) → saldırana Slow 1 |
| 3.eb | Ice Block | b | `addEffect status fortify 1` (hedefe) |
| 3.ma | Frozen Rebuke | C3 | `onShieldAbsorb` + saldıran Slowed → Stun 1 (kalkan başına 1 kez) |
| 3.fa | Brittle Shell | C3 | ea kancasını yamalar (Slow 2) + a\* `shield.power pct -0.35` |
| 3.fb | Frozen Solid | b | eb `status:fortify.turns set 2` + `addEffect status slow` (taşıyana, süre aynı) |
| 3.mb | Twin Ward | C5 | canı en düşük dosta da %50 kalkan (ek hedef) |
| 3.v | Shatter Aegis | C3 | `onShieldBreak` → saldırana bedava kesin kritik Fire Bolt (`freeCast`) |
| 4.u1 | Long Smoulder | a | `ground.turns set 3` |
| 4.u2 | White Heat | a | `ground.power pct 0.3` |
| 4.u3 | Sea of Fire | C5 | zemin, artıya değen tüm hücreleri de kaplar (zemin alanı hasar alanından ayrı) |
| 4.r1 | Concussion | C1 | `targetIsCenter` → `addStatus stun 1` |
| 4.r2 | Ringing Ears | C1 | `targetIsCenter=false` → `addStatus stun 1, chance 0.25` |
| 4.r3 | Earthshaker | b | `addEffect status staggered, chance 0.5` |
| 4.d1 | Flung Embers | C5 | alan dışındaki rastgele düşmana kor: %30 INT + Burning 2 (`firstAttackEcho` benzeri) |
| 4.d2 | Ember Hail | C5 | d1 kor sayısı 1 → 3 (d1'i yamalar) |
| 4.d3 | Twin Meteors [NEW] | C3 | `delayedStrike` 1 tur sonra aynı hücrelere %50 güçle ikinci meteor |
| 4.l1 | Dead Center | C1 | `targetIsCenter` → `powerMul 0.4` |
| 4.l2 | Molten Core | C5 | zemin merkez hücrede ×2 (hücre başına zemin gücü) |
| 4.l3 | Extinction | C1 | `targetIsCenter` + `hitCount` (öbür vurulanlar) → `powerMul 0.2` / adet |

**Özet:** düğüm (60): a 5 · a\* 0 · b 5 · C1 19 · C2 0 · C3 20 · C4 2 · C5 9 · C6 0 — bar (5): C1 1, C3 4.

## 6. Druid (Nature's Grudge, Thorn Whip, Nature's Wrath, Rejuvenate, ult Summon Treant; Deep Roots Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Deep Rot | a | pasif `turns add 1` (Withering'i yalnız pasif ve ondan türeyen düğümler verir) |
| bar10 | Heart of the Wild | b | `unitFx.critMp 4` (birim geneli; "nature skills" süzgeci: soru 14.19) |
| bar15 | Tight Weave | C5 | 2.n0 root field'ı +1 tur (o düğüm yoksa etkisiz: soru 14.17) |
| bar20 | Deep Spring | a\* | Rejuvenate `heal.power pct` + `hot.power pct` (2026-10-22: süre yerine güç, HoT 3 tur kalır; Faz 7 ikinci turda +%15) |
| bar25 | Barkskin | a\* | (çağrı) Treant alınan hasar ×0.85 |
| 0.f1 | Bitter Sap | a | pasif `power pct 0.1r` |
| 0.f2 | Spreading Spite | C5 | pasif tetiklenince katilin komşusu her düşmana %8r şansla aynı kök |
| 0.f3 | Choking Grip | C1 | DoT tiki `targetStatus:slow` → `powerMul 0.06r` |
| 0.n0 | Rot Remembers | C3 | `hpThresholdFirst(ally, 0.3)` → o saldırana Withering 3 |
| 0.r | Bitter Balm | C4 | Withering tiki → canı en düşük dosta tikin %20r'si şifa |
| 0.ea | Creeping Blight | C3 | `enemyDied(status wither)` → kalan turla en yakın düşmana geçer |
| 0.eb | Gnawing Rot | C1 | DoT tiki `dotTickIndex` (ölçek) → +%10 / tik |
| 0.ma | Rot Bloom | C3 | `enemyDied(status wither)` → komşulara %40 INT + Withering 2 |
| 0.fa | Black Mold | a\* | pasif `power pct 0.3` + pasifin Slow'u kaldırılır (`status` alanı boşaltma) |
| 0.fb | Grief's Toll | C3 | +a pasif ×2; `passiveTrigger` → maks canının %10'unu kaybedersin |
| 0.mb | Rot to the Core | C3 | `statusEnd(wither)` → katile verdiği toplam hasarın yarısı bir kez daha (hasar defteri) |
| 0.v | Ever-Rot | C3 | `turnStart` → canı en yüksek düşmana Withering 2 |
| 1.f1 | Hooked Barbs | a | `damage.power pct 0.03r` |
| 1.f2 | Nettle Sting | a | `damage.critBonus add 0.02r` |
| 1.f3 | Charged Lash | C1 | `lastSkillCostMp` → `powerMul 0.05r` |
| 1.n0 | Whip Crack | C1 | `targetHpBelow:0.3` → `powerMul 0.5` |
| 1.r | Keen Thorns | C1 | koşulsuz `critDmgMul 0.08r` |
| 1.ea | Forked Thorn | C5 | 1 düşmana daha %60 zincir + Wound |
| 1.eb | Reaping Vine | C3 | `onKill` → +6 MP |
| 1.ma | Third Lash | C3 | `skillUse` + `every: 3` → alan dışı 1 düşmana %20 kamçı (2026-10-22: eski Thorn Volley kritikte tetikleniyordu, 1.fa ile ölüydü) |
| 1.fa | Wild Thorns | C1 | +a `power pct 0.35`; koşulsuz `noCrit` |
| 1.fb | Cutting Haste | C3 | eb kancasını yamalar (15 MP) + C1 `targetHpAbove:0.5` → −0.2 |
| 1.mb | Endless Lash | C3 | `onKill` → `turnSooner 0.5` (iki kat hızlı) |
| 1.v | Thornstorm Lash | C5 | hedef `random_enemies count 3` %45, Wound yok; kritik başına 3 MP |
| 2.f1 | Grasping Earth | b | `addEffect status slow 2, chance 0.08r` |
| 2.f2 | Tangleroot | b | `addEffect status stun 1, chance 0.05r` |
| 2.f3 | Pollen Drift | b | `addEffect` YENİ durum "verilen hasar −%2r" 1 tur (rank'a göre büyüklük: soru 14.7) |
| 2.n0 | Root Field | C5 | YENİ zemin "root field" 2 tur: turuna orada başlayan Slowed 1 |
| 2.r | Deep Tangle | b | f2'nin Stun'ı → `randomStatus` (+1 tur %10r) |
| 2.ea | Hushing Moss | C5 | n0 zemini Silence da verir |
| 2.eb | Grasp and Drag | C5 | arka sıradakileri bir sıra öne çeker (`pull` bugün yalnız `laneFront`) |
| 2.ma | Overgrown Field | C5 | n0 zemini +2 tur + %15 INT tik |
| 2.fa | Mire | C5 | n0 zemini çarpınca da Slow + 4 tur + a `cooldown set 5` |
| 2.fb | Briar Prison | C5 | ilk sıra (aşama 1) Stun 1, hasar yok |
| 2.mb | Strangling Grove | C1 | `targetStatus:slow` → `addStatus stun 1` |
| 2.v | Thicket Wave [NEW] | C3 | `delayedStrike` sonraki turunun başında aynı hücreler %50 + Stun 1 ("Rooted": soru 14.18) |
| 3.f1 | Tender Sap | a\* | `heal.power pct 0.04r` |
| 3.f2 | Long Bloom | a\* | `hot.power pct 0.06r` |
| 3.f3 | Soft Hands | C4 | `targetHpBelow:0.5` → şifa × (1 + 0.04r) |
| 3.n0 | Overflowing Cup [NEW] | C4 | fazla şifa → aynı boyda kalkan |
| 3.r | Dewdrop Shield | C4 | n0 kalkanı × (1 + 0.1r) |
| 3.ea | Spreading Roots | C5 | HoT komşu dostlara yarı güçte |
| 3.eb | Emergency Bloom | C4 | `targetHpBelow:0.3` → şifa ×1.5 |
| 3.ma | Grove Bloom | C5 | ilk şifa hedefin sırasındaki tüm dostlara (`splash row` kalıbı) |
| 3.fa | Thin Sap | C5 | hedef tüm dostlar + a şifa ×0.5, `cooldown set 4` |
| 3.fb | Desperate Sap | b | `replaceEffect hot → heal` (toplam ×1.25) + a `cooldown set 4` |
| 3.mb | Lifebloom | C3 | `statusEnd(hot)` → ilk şifa kadar bir daha |
| 3.v | Verdant Link | C5 | hedef + canı en düşük dost ikisi de tam şifa + HoT |
| 4.u1 | Crashing Arrival | C5 | (çağrı) iniş anında düşman ön sırasına %50 INT (self skill'e düşman alanı) |
| 4.u2 | Heavy Landing | C5 | u1 alanına ikinci sıra |
| 4.u3 | Falling Oak | C5 | +a u1 ×2; Treant'ın karşısındaki düşmana Stun 1 |
| 4.r1 | Heavy Boughs | a | (çağrı) Root Smash `power pct 0.2` |
| 4.r2 | Heavy Smash | C1 | (çağrı) Root Smash `targetStatusAny:[slow,stun]` → `powerMul 0.25` |
| 4.r3 | Wrathful Oak | C6 | (çağrı) turda iki eylem + a\* `summon.lifespan set 2` |
| 4.d1 | Splinter Burst | C3 | `summonDeath` (ölüm / süre bitişi) → en yakın 2 düşmana %60 INT |
| 4.d2 | Brittle Bark | C3 | d1'i yamalar (+%50) + (çağrı) maks can ×0.8 |
| 4.d3 | Living Bomb [NEW] | C6 | Treant varken yeniden çağırma; eski Treant hemen ×2 patlar (+C3) |
| 4.l1 | Shieldbark | C3 | `summonArrive` → Treant 1 tur Taunt (taunt durum değil, etki: çağrıya uygulanmalı) |
| 4.l2 | Thornbark | C3 | (çağrı) `onHitTaken` → saldırana %15 INT (`rebuke` benzeri) |
| 4.l3 | Guardian Oak | C5 | (çağrı) arkasındaki dostu korur: hasarın yarısı Treant'a (Guard ilişkisi konumla) |

**Özet:** düğüm (60): a 4 · a\* 3 · b 5 · C1 8 · C2 0 · C3 15 · C4 5 · C5 18 · C6 2 — bar (5): a 1, a\* 2, b 1, C5 1.


## 7. Cutthroat (Opportunist, Venom Edge, Saltire Cut = `x_cut`, Smoke Bomb, ult Backstab; Ghost Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Ash Cloak | C1 | sana gelen Shrouded `statusTurns +1` (alınan durum süresi) |
| bar10 | Light Step | C3 | `onDodge` → +2 MP |
| bar15 | Killer Instinct | C1 | `targetHpBelow:0.5` → `critBonus 0.04` |
| bar20 | Trophy | C3 | `onKill` → savaş boyu `critDmgMul +0.03` (birikir) |
| bar25 | Reaper's Due | C3 | ilk `onKill` → öbür skill'lerin cooldown'u sıfır |
| 0.f1 | Cold Read | C1 | pasif bonus `targetHpBelow:0.5` → `+0.03r` |
| 0.f2 | Vein Finder | C1 | `targetOpportunist` → `critBonus 0.02r` |
| 0.f3 | Feinting Step | C3 | `onDodge` → sonraki vuruşa pasif bonus `+0.02r` |
| 0.n0 | Smell of Blood | C1 | pasif koşulu genişler: `targetHpBelow:0.4` de sayılır (yeni pasif alanı) |
| 0.r | Missed Chance | C1 | `targetMissedMeSinceTurn` → pasif bonus `+0.04r` |
| 0.ea | Killer's Eye | C1 | `targetOpportunist` + `hitIsCrit` → `powerMul 0.2` |
| 0.eb | Counter Cut [NEW] | C3 | `enemyMissed` (yakın dövüş, hedef ben) → %40 DEX karşı kesik; pasif uygulanır |
| 0.ma | Bloodletter | b | `unitFx.critStatuses [{wound, 2}]` |
| 0.fa | Glass Knife | C1 | `targetOpportunist` + `hitIsCrit` → +0.4, kritik değilse −0.15 |
| 0.fb | Reckless Grace | C3 | eb kancasını yamalar (×2) + karşı kesik Shrouded'ını bitirir |
| 0.mb | Turned Blade | C3 | eb kancası: saldıran Blinded ise kesin kritik + Blind 1 |
| 0.v | Assassin's Instinct | C1 | pasif alternatif formül: `targetMissingHp` her %2 → +%1, büyük olan kullanılır |
| 1.f1 | Balanced Blade | C1 | `targetStatus:wound` → `powerMul 0.03r` |
| 1.f2 | Seeking Tip | a | `damage.critBonus add 0.02r` |
| 1.f3 | Twist the Knife | C1 | koşulsuz `critDmgMul 0.05r` |
| 1.n0 | Coup de Grace | C1 | `targetHpBelow:0.3` → `guaranteedCrit` |
| 1.r | Honed Point | C1 | `targetHpBelow:0.5` → `powerMul 0.03r` |
| 1.ea | Finishing Cut | C1 | `targetHpBelow:0.3` → `powerMul 0.3` |
| 1.eb | Backhand Cut | C5 | hedefin yanındaki bir düşmana %50 + Wound |
| 1.ma | Clean Kill | C3 | `onKill` → +6 MP + Backstab cooldown −1 |
| 1.fa | Butcher's Haste | C1 | `targetHpBelow:0.5` → +0.25, değilse −0.25 |
| 1.fb | Thirsty Edge | C1 | `killingBlow` → `lifestealAdd 0.25` + b Wound etkisi kaldırılır |
| 1.mb | Carving Arc | C5 | eb kesiği yandan yana zincirlenir, en çok 3 |
| 1.v | Red Smile | C1 | `targetHpBelow:0.5` → `powerMul 1` + `guaranteedCrit`; üstündeyse `statusTurns wound set 3` |
| 2.f1 | Crossed Crit | C1 | `targetIsCenter` → `critBonus 0.03r` |
| 2.f2 | Scissor Bite | C1 | `centerHitIndex=2` → `powerMul 0.05r` |
| 2.f3 | Keen Pair | C1 | `targetHpBelow:0.5` → `powerMul 0.04r` |
| 2.n0 | Finishing Cross | C3 | `onKill` → cooldown sıfır |
| 2.r | Bloody Saltire | C1 | `hitIsCrit` → `addStatus wound, chance 0.1r` (süre metinde yok, Venom Edge gibi 2 varsayılabilir) |
| 2.ea | Double Lunge | C1 | `targetIsCenter` + `targetHpBelow:0.5` → `powerMul 0.25` |
| 2.eb | Extra Knife | C5 | `area.hitsAtCenter set 3` (alan yüklemi uid almalı, Faz 1a notu) |
| 2.ma | X Marks the Throat | C5 | +C1 iki merkez vuruşu da kritikse zırh yok sayan 3. vuruş (ek vuruş) |
| 2.fa | Heavy Cross | C1 | `targetIsCenter` → +0.4, çapraz −0.5 |
| 2.fb | Spent Belt | C5 | `hitsAtCenter set 4` + a `cost.amount set 14` |
| 2.mb | Endless Knives | C5 | kritik vuruş başına aynı hedefe bir bıçak daha, en çok 2 (ek vuruş) |
| 2.v | Butcher's Cross | C5 | X'teki herkese 2 vuruş + a `power set 0.35` |
| 3.f1 | Far Toss | C1 | `targetRow:back` → Blinded `statusTurns +1, chance 0.15r` |
| 3.f2 | Lungful of Ash | C1 | koşulsuz `statusPotency blinded accuracy −0.02r` (soru 14.7) |
| 3.f3 | Gritty Ash | C1 | koşulsuz `statusPotency blinded critDelta −0.02r` (soru 14.7) |
| 3.n0 | Choking Cloud | b | `addEffect status silence 1, side enemies` |
| 3.r | Coughing Fit | b | `addEffect status slow 1, chance 0.06r, side enemies` |
| 3.ea | Sulfur Cake | a | n0'ın `status:silence.turns set 2` |
| 3.eb | Exposed in Smoke | C5 | alandaki canı en düşük düşmana Overextended (var olan durum; alt hedef seçimi) |
| 3.ma | Lost in Smoke | C3 | `enemyMissed` (saldıran Blinded) → Staggered |
| 3.fa | Sulfur Overload | C1 | `statusPotency blinded accuracy −0.45` + b Shrouded etkisi kaldırılır |
| 3.fb | Hard Clay | C5 | alandan rastgele 1 düşmana Stun 1 + b Blind kaldırılır |
| 3.mb | Shrapnel Shell | b | `addEffect damage 0.35 DEX` + `status wound 2` (side enemies; hasarda `side` süzgeci doğrulanacak) |
| 3.v | Brimstone Jar | b | Blinded 2 + Silence 2 + Slow 1 (`addEffect` ×2, a Blind süresi) |
| 4.u1 | Into the Smoke | b | `addEffect status shrouded 2 self` |
| 4.u2 | Smoke Trail | b | `addEffect status blinded 2` |
| 4.u3 | Shadow Return | C5 | sen + yanındaki dostlar Shrouded 2 + Fleet (süre: soru 14.21) |
| 4.r1 | Early Knife | a | `initialCooldown set 1` |
| 4.r2 | First Blood | C1 | `targetFullHp` → `powerMul 0.25` |
| 4.r3 | Opening Act | C1 | `firstUseOfSkill` → `cooldownSet 0` |
| 4.d1 | Between the Plates | a | `damage.ignoreDefense add 0.25` |
| 4.d2 | Sure Hand | C1 | koşulsuz `sureHit` |
| 4.d3 | Spine Splitter | C1 | `targetHpBelow:0.5` → `ignoreDefense 1` |
| 4.l1 | Thrown Stiletto | C5 | `requiresOpenBehind` gevşer (hedef yüklemi) + C1 `thrown` → −0.3 |
| 4.l2 | Weighted Stiletto | C5 | l1'e bağlı: `thrown` → `addStatus wound 3` |
| 4.l3 | Death From Afar | C5 | `requiresOpenBehind set false`, tam hasar (hedef yüklemi uid almalı) |

**Özet:** düğüm (60): a 4 · a\* 0 · b 7 · C1 29 · C2 0 · C3 7 · C4 0 · C5 13 · C6 0 — bar (5): C1 2, C3 3.

## 8. Undead (Vampiric Bite, Bone Throw, Wail of the Dead, Dark Bond, ult Raise Dead; Blood Price Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Opening Cut | C1 | `hpPaidThisCast` savaşta ilk kez → `drainMul 2` |
| bar10 | Red Reserve | C3 | `hpThresholdFirst(self, 0.5)` → sonraki skill bedelsiz (HP ve MP) |
| bar15 | Tomb Frost | C1 | `firstUseOfSkill` → `statusTurns slow +1` |
| bar20 | First Thread | C4 | `firstUseOfSkill` → bağlanan dosta maks canının %10'u şifa (maks can oranlı şifa) |
| bar25 | Brink Walker | C3 | `hpThresholdFirst(self, 0.25)` → Wail cooldown sıfır |
| 0.f1 | Thin Blood | C1 | `selfHpBelow:0.5` → pasif `ratio +0.04r` |
| 0.f2 | Tithe Collector | C1 | `hpPaidThisCast` → `drainMul` (+0.03r) |
| 0.f3 | Open Veins | C1 | `selfMissingHp` her %10 → `powerMul 0.01r` (tüm skill'ler) |
| 0.n0 | Sanguine Thirst | C1 | `selfHpBelow:0.5` + `firstHitThisTurn` → `drainMul 2` |
| 0.r | Last Drop | b | `unitFx.secondWind {below 0.3, heal 0.05r}` |
| 0.ea | Dying Light | C1 | `selfHpBelow:0.5` → `ignoreDefense 0.2` (büyü zırhı) |
| 0.eb | Black Spittle | b | tüm hasar skill'lerine `addEffect status wound 2` (seçici "her skill"; soru 14.24) |
| 0.ma | Undying Thirst [NEW] | C6 | savaşta 1 kez ölümcül vuruş → 1 can; sonraki vuruş hasarın %100'ünü emer |
| 0.fa | Gaunt Frame | b | a pasif `ratio set 0.7` + `unitFx.modifiers` maks can −%20 |
| 0.fb | Rancid Blood | C1 | uyguladığın Wound `statusTurns +2` (birim geneli) + a pasif `ratio pct -0.2` |
| 0.mb | Stolen Remedy [NEW] | C3 | `enemyHealed` (senin Wound'unla) → Wound'un engellediği kadar şifa |
| 0.v | Crimson Tide | C3 | `onPayHp` → savaş boyu pasif `ratio +0.05` (birikir) |
| 1.f1 | Knee Breaker | C1 | `targetStatus:slow` → `powerMul 0.04r` |
| 1.f2 | Marrow Leech | C1 | `targetStatus:slow` → `drainMul` (+0.03r) |
| 1.f3 | Skull Rattle | b | `addEffect status staggered, chance 0.03r` |
| 1.n0 | Crippling Bone | a | `status:slow.turns set 3` |
| 1.r | Numb Joints | C1 | `targetStatusAny:[staggered,stun,silence]` → `powerMul 0.05r` |
| 1.ea | Shattered Shin | C1 | `targetStatus:slow` → `addStatus staggered, chance 0.25` |
| 1.eb | Skull Cracker | b | `addEffect status silence 1, chance 0.3` |
| 1.ma | Grave Shackle | C1 | `targetStatus:slow` + `targetHpBelow:0.5` → `addStatus stun 1` (hedef başına savaşta 1 kez: durum hafızası) |
| 1.fa | Brutal Hurl | C1 | ea şansı 0.45 (ea'yı yamalar) + a `power pct -0.2` |
| 1.fb | Mute Marrow | b | eb `chance set 1` + `replaceEffect` Slow kaldırılır |
| 1.mb | Jaw Breaker | C1 | `targetStatus:silence` → `addStatus jinxed` (süre yok; Jinxed varsayılan 2) |
| 1.v | Femur Chain | C5 | hedef + arkasındaki düşman, ikisine Slow 3 |
| 2.f1 | Bloody Breath | C1 | `hpPaidAmount` her 10 HP → `powerMul 0.01r` |
| 2.f2 | Lingering Moan | C1 | koşulsuz bu skill'de `drainMul` (+0.03r) |
| 2.f3 | Fearful Keening | b | `addEffect status blinded 1, chance 0.04r` |
| 2.n0 | Scream of Need | C1 | `selfHpBelow:0.5` → `powerMul 0.3` |
| 2.r | Tithe Refund | C4 | vurulan düşman başına bedelin %4r'si iade (can) |
| 2.ea | Deeper Cut | a\* | `cost.ofCurrent set 0.3` + a `power pct 0.3` |
| 2.eb | Blood Hymn | C4 | bağlı dosta ödenen can kadar şifa |
| 2.ma | Blood Banshee | C1 | `hpPaidAmount` → `flatDamage` bedelin %50'si (her vurulana) |
| 2.fa | Torn Lungs | a\* | `cooldown set 2` + `cost.ofCurrent set 0.4` |
| 2.fb | Bitter Gift | C4 | eb şifası ×2 + a `power pct -0.25` |
| 2.mb | Gorging Howl | C4 | `hitCount≥3` → bedelin tamamı iade |
| 2.v | Banshee's Toll | C5 | hedef tüm düşmanlar (alan → global) + a\* `ofCurrent 0.3` + C1 `drainMul 2` |
| 3.f1 | Thick Blood | a\* | `bond.ratio add 0.04r` |
| 3.f2 | Kindred Pulse | C4 | bağ başlarken dosta senin maks canının %2r'si şifa |
| 3.f3 | Kindred Guard | C4 | bağlı dost (senden `dark_bond`) alınan hasar × (1 − 0.02r) |
| 3.n0 | Lifeline | C3 | `hpThresholdFirst(bonded ally, 0.3)` → sonraki vuruş ×2 emer ve tamamı dosta gider |
| 3.r | Blood Kin | C1 | `selfHpBelow:0.5` → `bond.ratio +0.05r` |
| 3.ea | Transfusion | C4 | mevcut canının %15'i dosta şifa olarak aktarılır |
| 3.eb | Soul Shield | C4 | dosta senin maks canının %15'i kalkan |
| 3.ma | Life for Life | C6 | savaşta 1 kez bağlı dosta gelen ölümcül vuruş sana döner (`interceptLethal` kapsam bonded) |
| 3.fa | Bled Dry | C4 | ea %30 (ea'yı yamalar) + a `cooldown set 3` |
| 3.fb | Iron Oath | a | mb `guard.share set 0.6` + pasif `ratio pct -0.2` |
| 3.mb | Blood Oath | b | `addEffect guard {turns 3, share 0.3}` bağlı dosta (süre eşleşmesi: soru 14.23) |
| 3.v | Crimson Covenant | a\* | `bond.turns` süresiz (biri düşene / yeni bağa kadar; "süresiz" değeri: soru 14.16) |
| 4.u1 | Grasping Hands | b | (çağrı) Skeleton vuruşuna `addEffect status slow 1` |
| 4.u2 | Cold Grip | C1 | (çağrı) `targetStatus:slow` → `powerMul 0.2` |
| 4.u3 | Grave Grasp | C1 | (çağrı) `firstUseOfSkill` → `addStatus stun 1` |
| 4.r1 | Pox Bloom | C3 | `summonDeath` → son vurduğu düşmanın altına poison zemini (%15 INT, 2 tur) |
| 4.r2 | Spore Cloud | C5 | r1 zemini yan hücrelere de (r1'i yamalar) |
| 4.r3 | Rot Bomb | C3 | r1 eylemine `detonate wither` (var olan `detonate` türü) |
| 4.d1 | Fresh Meat | a | (çağrı) beslenmiş Skeleton hasar +%15, maks can +%15 |
| 4.d2 | Gravedigger | C6 | ceset yoksa +8 MP ile yine beslenmiş Skeleton (`consumeCorpse` kuralı) |
| 4.d3 | Tomb Knight | a | (çağrı) beslenmiş Bone Slash `cooldown set 0` |
| 4.l1 | Hulking Frame | a\* | (çağrı) maks can +%20 + `summon.lifespan add 1` |
| 4.l2 | Grave Plate | b | (çağrı) +10 zırh (`modifiers`) + ilk turunda Fortified (`startStatuses`) |
| 4.l3 | Bone Champion | a\* | `summon.lifespan` süresiz + a `cooldown set 7` (soru 14.16) |

**Özet:** düğüm (60): a 4 · a\* 6 · b 10 · C1 20 · C2 0 · C3 5 · C4 9 · C5 3 · C6 3 — bar (5): C1 2, C3 2, C4 1.

## 9. Hexer (Ill Omen, Evil Eye, Withering Curse, Jinx, ult Doom Mark; Verdict Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Quick Fate | C1 | `firstUseOfSkill` → `omenStacks +1` |
| bar10 | Grim Herald | C1 | Doom yolu: `firstDoom` → `powerMul 0.2` |
| bar15 | Long Rot | a\* | Withering Curse `dot.turns add 1` |
| bar20 | Carrion Feast | C1 | DoT tiki `targetHpBelow:0.3` → `powerMul 0.2` |
| bar25 | Hour of Ruin | C3 | `onDoom` 1 kez → Doom Mark cooldown −2 |
| 0.f1 | Fresh Host | C1 | Doom yolu `omenFromTransfer` → `powerMul 0.03r` (soru 14.9) |
| 0.f2 | Grim Arithmetic | C1 | Doom yolu `targetHpBelow:0.5` → `powerMul 0.04r` |
| 0.f3 | Crooked Stars | C1 | Doom yolu koşulsuz `critBonus 0.03r` (Doom ayarı bugün `statuses.json`'da, birime özgü değil) |
| 0.n0 | Fate Sealed | C3 | `onDoom` hedef sağ kalırsa → 1 Omen kalır |
| 0.r | Bitter Interest | C1 | Doom yolu `lifestealAdd 0.04r` |
| 0.ea | Crushing Doom | C1 | Doom yolu `ignoreDefense 0.25` |
| 0.eb | Doom Leaks | a | pasif `onDoomKill set 1` (Doom Mark dahil mi: soru 14.29) |
| 0.ma | Ruinous Crit | C1 | Doom yolu `critDmgMul` ×1.5 → ×2 |
| 0.fa | Overcharged Doom | C4 | +C1 Doom +0.3; verdiğin Doom hasarının %10'u sana (geri tepme) |
| 0.fb | Final Toll | C1 | Doom yolu `targetHpBelow:0.3` → +0.4, değilse −0.2 |
| 0.mb | Toppling Ruin | C3 | `onKill(Doom)` → `turnSooner 0.5` |
| 0.v | Herald of Ruin [NEW] | C3 | `enemyDied(status omen)` → en yakın düşmana ölenin Omen'i kadar Doom |
| 1.f1 | Prying Eye | C1 | `targetStatusStacks:omen=0` → `powerMul 0.04r` |
| 1.f2 | Unblinking | a | `damage.critBonus add 0.02r` |
| 1.f3 | Envy's Edge | C1 | `targetStatusStacks:omen=2` → `powerMul 0.04r` |
| 1.n0 | Opening Glare | C1 | `targetStatusStacks:omen=0` → `omenStacks set 2` |
| 1.r | Rheumy Stare | C1 | `targetStatus:wither` → `critBonus 0.02r` |
| 1.ea | Glint of Malice | C1 | `targetStatusStacks:omen≥1` → `critBonus 0.1` |
| 1.eb | Fixed Stare | C1 | `targetIsMyLastTarget` → `powerMul 0.12` |
| 1.ma | Fatal Glance | a\* | `omen.critStacks set 3` |
| 1.fa | Strained Eyes | a | `critBonus add 0.15` + `power pct -0.15` |
| 1.fb | Burning Stare | a | `power pct 0.25` + `cost.amount set 6` |
| 1.mb | Doom Gaze | C1 | Doom yolu `doomSource:evil_eye` → `powerMul 0.3` |
| 1.v | Eye of Ruin | b | a\* `omen.stacks set 2, critStacks 3` + `replaceEffect` hasar kaldırılır (isabet zarı: soru 14.10) |
| 2.f1 | Plague Breath | C1 | `hitCount` → `powerMul 0.01r` / adet |
| 2.f2 | Fog of Ill Luck | C1 | koşulsuz `statusPotency wither accuracy −0.02r` (soru 14.7) |
| 2.f3 | Leeching Rot | C1 | DoT tiki `lifestealAdd 0.02r` |
| 2.n0 | Herd Curse | C1 | `hitCount≥3` → `omenStacks +1` |
| 2.r | Rot Contagion | C5 | %10r şansla alanın hemen dışındaki bir düşman da lanetlenir |
| 2.ea | Broad Curse | C5 | alan 2×3 → 3×3 |
| 2.eb | Seeping Rot | C3 | `statusEnd(wither)` → komşulara Wither 2 |
| 2.ma | Plague Tide | C5 | alan dışında Omen'i olan her düşmana +1 Omen |
| 2.fa | Thin Plague | C5 | hedef tüm düşmanlar + a hasar ×0.5, `dot.turns set 1` |
| 2.fb | Gnawing Rot | a\* | `dot.power pct 0.5` + `dot.turns set 2` |
| 2.mb | Returning Curse | C3 | `enemyDied(status wither, kaynak bu skill)` → cooldown sıfır |
| 2.v | Plague Curse [NEW] | C3 | `dotTick(wither)` → konağın komşusuna Wither 2 |
| 3.f1 | Clinging Jinx | C1 | `statusPotency jinxed`: saldırıdan sonra düşmeme şansı 0.1r (soru 14.7) |
| 3.f2 | Wobbly Aim | C1 | `statusPotency jinxed accuracy` −0.2 → −0.3 (−0.02r) |
| 3.f3 | Hex Ward | C4 | `anyEnemyStatus:jinxed` → alınan hasar × (1 − 0.03r) |
| 3.n0 | Double Jinx | C1 | `statusPotency jinxed`: 2 saldırı sürer |
| 3.r | Rumour Mill | C5 | %10r şansla hedefin komşusuna da Jinxed |
| 3.ea | Lasting Jinx | a | `status:jinxed.turns set 3` |
| 3.eb | Backlash | C3 | `enemyMissed` (saldıran Jinxed) → LUCK'ın %40'ı karanlık hasar |
| 3.ma | Woeful Turn | C3 | `enemyMissed` (Jinxed) → Staggered |
| 3.fa | Spiteful Jinx | b | `addEffect status silence 1` + a `cooldown set 5` |
| 3.fb | Feeble Jinx | C1 | `statusPotency jinxed accuracy −0.4` + b hasar kaldırılır (soru 14.10) |
| 3.mb | Turned Luck | C3 | `enemyMissed` (Jinxed) → hedeflenen dosta Haste 1 |
| 3.v | Turned Hand [NEW] | C6 | Jinxed hedefin sonraki saldırısı kendi dostuna gider |
| 4.u1 | Leaping Mark | C3 | `onKill` → Doom en yakın düşmana %50 sıçrar |
| 4.u2 | Hungry Leap | C3 | u1'i yamalar (%75) |
| 4.u3 | Unending Mark | C3 | u1 her öldürmede tekrar |
| 4.r1 | Gathering Mark | C5 | önce en çok 2 başka düşmandan hedefe 1'er Omen çeker |
| 4.r2 | Overflowing Fate | C5 | r1'e bağlı: 3'ü aşan her çekilen Omen Doom'a +%20 |
| 4.r3 | Mark of Many | C5 | öbür tüm düşmanlardan 1'er Omen çeker |
| 4.d1 | Sealing Mark | b | `addEffect status silence 1` |
| 4.d2 | Heavy Seal | a | d1 `status:silence.turns set 2` |
| 4.d3 | Mark of Silence | C5 | hedefin sırasındaki her "caster"a Silence 1 (tanım: soru 14.13) |
| 4.l1 | Dread Ward | b | `addEffect status shrouded 1 self` |
| 4.l2 | Cowed Foe | b | `addEffect status jinxed 2` (sağ kalana) |
| 4.l3 | Last Rite [NEW] | C6 | savaşta 1 kez öldürücü vuruş → 1 can + katile bedava Doom Mark |

**Özet:** düğüm (60): a 6 · a\* 2 · b 5 · C1 22 · C2 0 · C3 12 · C4 2 · C5 9 · C6 2 — bar (5): a\* 1, C1 3, C3 1.

## 10. Anti-Mage (Mana Overflow, Mana Steal = `mana_burn`, Drain Field, Spell Ward, ult Void Strike; Warden's Mastery)
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Shared Cup | a | pasif `threshold add -2` |
| bar10 | Quick Fingers | C1 | `targetHasBuff` → `manaBurnAdd 3` |
| bar15 | Wide Basin | C3 | Drain Field vurulan düşman başına takıma 1 MP (`onHit` eylemi) |
| bar20 | Warded Steps | C4 | Spell Ward'lı dostlar fiziksel hasarı × 0.95 alır |
| bar25 | Void Focus | a | Void Strike `cost.amount add -2` |
| 0.f1 | Wide Channels | a | pasif `mana add 1r` |
| 0.f2 | Soaking Robes | C1 | koşulsuz pasif sayaç çarpanı `blockedMul +0.04r` (yeni pasif alanı) |
| 0.f3 | Overflow Spill | C3 | `onManaOverflow` → MP'si en az dosta +1r |
| 0.n0 | Tidal Surge | C3 | `onManaOverflow` her 3.de 5 yerine 15 MP |
| 0.r | Hunter's Read | C3 | `enemyGainedBuff` → sayaca +3r |
| 0.ea | Conduit | C5 | MP dağıtımı: tamamı MP'si en az dosta |
| 0.eb | Spillover | C6 | dostun maks'ı aşan MP'si MP'si en az dosta geçer |
| 0.ma | Brimming Ally | C3 | `onManaOverflow` dostu doldurursa → Haste 1 |
| 0.fa | Lifeline Pact | C5 | ea dağıtımı ×2 (ea'yı yamalar) + a `threshold set 45` |
| 0.fb | Martyr's Overflow | C5 | dostlara 8 MP, sana 0 (dağıtımdan dışlama) + C3 her tetikte maks canın %5'i |
| 0.mb | Spell Sink | C3 | `onManaOverflow` → canı en düşük dosta sonraki turuna kadar Guard %30 (b `guard`) |
| 0.v | Endless Spring [NEW] | C6 | dostların büyü zırhının engellediği büyü hasarı da sayılır |
| 1.f1 | Generous Cut | a\* | `manaBurn.gainRatio add 0.1r` |
| 1.f2 | Deep Pockets | C1 | `targetMpAbove:0.5` → `manaBurnAdd 2r` |
| 1.f3 | Deep Cut | a\* | `manaBurn.pctMax add 0.03r` (`amount` ile birlikte çalışıyor mu doğrulanacak) |
| 1.n0 | Prying Blade | b | `addEffect dispel buff count 1` (rastgele seçim: soru 14.15) |
| 1.r | Bare Steel | C1 | `targetHasBuff=false` → `powerMul 0.05r` |
| 1.ea | Siphon Vein | a\* | `manaBurn.gainRatio set 1` |
| 1.eb | Quickening Steal | C5 | `targetMp=0` → MP'si en az dosta Haste 1 (başka hedefe eylem) |
| 1.ma | Drink Deep | C4 | yakılan MP kadar kendine şifa |
| 1.fa | Drained Dry | b | a\* `manaBurn.amount set 20` + `replaceEffect` hasar kaldırılır |
| 1.fb | Hurried Hands | a | `turnCost set 0.5` + `cooldown set 2` |
| 1.mb | Tempo Thief | C3 | `targetMpEmptied` → `turnSooner` (Skip Turn kadar) |
| 1.v | Spellsplitter | C1 | +b `dispel buff` (hepsi); `buffsRemoved` (ölçek) → `powerMul 0.15` / adet |
| 2.f1 | Wide Siphon | a\* | `manaBurn.pctMax add 0.04r` |
| 2.f2 | Hushing Mist | a\* | `manaBurn.onEmpty.chance add 0.04r` |
| 2.f3 | Long Quiet | C1 | Silence `statusTurns +1, chance 0.06r` |
| 2.n0 | Sure Hush | C1 | `targetMpZeroBefore` → Silence şansı 1 |
| 2.r | Settling Dust | C1 | `silencedAny` → `cooldownDelta -1, chance 0.1r` |
| 2.ea | Focused Siphon | C1 | `targetIsCenter` → `manaBurnMul 1.25` |
| 2.eb | Wider Grasp | C5 | alan 3×3 → 3×4 |
| 2.ma | Heart of Quiet | C1 | `targetIsCenter` + MP 0'da bitirdiyse → Silence şansı 1 |
| 2.fa | Narrow Siphon | C5 | yalnız merkez hücre + a\* `pctMax set 1` |
| 2.fb | Shallow Net | a\* | `onEmpty.chance set 0.8` + `onEmpty.damage` kaldırılır |
| 2.mb | Mass Hush | C1 | `hitCount(MP'si 0'a inen)≥3` → hepsine Silence, zar yok |
| 2.v | Hall of Silence | C5 | YENİ zemin 2 tur: tur başı maks MP'nin %15'ini yakar, MP'si 0 olanı Silence |
| 3.f1 | Layered Ward | a\* | `shield.power pct 0.04r` |
| 3.f2 | Ward Mending | C4 | atılınca dosta maks canının %2r'si şifa |
| 3.f3 | Deep Reserve | a\* | `shield.bonusPerMana add 0.06r` |
| 3.n0 | Purging Ward | b | `addEffect dispel debuff` (kalkandan önce) |
| 3.r | Shelter Echo | C3 | `onShieldBreak` → dosta maks canının %3r'si şifa (+C4) |
| 3.ea | Split Ward | C5 | MP'si en az dosta da %50 kalkan |
| 3.eb | Ward Taunt | C1 | `targetIsSelf` → `addEffect taunt 1` |
| 3.ma | Second Ward | C3 | `onShieldBreak` → canı en düşük dosta %50 kalkan |
| 3.fa | Stretched Ward | C5 | ea tam güç (ea'yı yamalar) + a `cost.amount set 18` |
| 3.fb | Cloistered Ward | C5 | hedef yalnız kendin (`target` değişir) + a\* `shield.power pct 0.6` |
| 3.mb | Bastion of Null | C4 | `selfHasShield(spell_ward)` + `selfTaunting` → fiziksel hasar ×0.7 |
| 3.v | Mirror Ward [NEW] | C3 | `onShieldAbsorb` (büyü vuruşu) → saldırana %50 geri yansır |
| 4.u1 | Crippling Void | b | `addEffect status blinded 1` |
| 4.u2 | Spell Shatter | b | `addEffect` YENİ durum "büyü hasarı −%20" 2 tur |
| 4.u3 | Void Shackle | C1 | `targetMp=0` → `addStatus stun 1` |
| 4.r1 | Opening for All | b | `addEffect status overextended 1` (var olan durum) |
| 4.r2 | Shared Spoils | C3 | `allyHitTarget(status overextended)` → o dosta +4 MP |
| 4.r3 | Feeding Frenzy | C3 | hedef senin sonraki turundan önce dost eliyle ölürse takıma 15 MP |
| 4.d1 | Swift Void | a | `turnCost set 0.5` |
| 4.d2 | Ready Blades | C5 | Void Strike sonrası sıradaki Mana Steal'e ek hançer (soru 14.14) |
| 4.d3 | Overflow Strike | C3 | `afterSkillUse` → Mana Overflow hemen tetiklenir |
| 4.l1 | Rallying Break | C5 | +C1 `targetHasBuff` → takıma Haste 1 |
| 4.l2 | Turned Boons | C5 | l1'e bağlı: Haste alan dostlara +4 MP |
| 4.l3 | Grand Theft [NEW] | C6 | hedefin tüm buff'larını çalar, takıma dağıtır |

**Özet:** düğüm (60): a 3 · a\* 8 · b 6 · C1 12 · C2 0 · C3 12 · C4 3 · C5 13 · C6 3 — bar (5): a 2, C1 1, C3 1, C4 1.

## 11. Gambler (Double or Nothing, Loaded Dice, High Stakes, Card Trick, ult All In; Streak Mastery)
Terim: Double or Nothing = `spellEcho` pasifi (echo), Double Hit = `repeatChance`, Jackpot / Bust = `bet` kazanır / kaybeder, Lucky Escape = `stats.surviveChance`.
| Anahtar | Ad | Kat. | Motor notu |
|---|---|---|---|
| bar5 | Warm Hands | C1 | `firstUseOfSkill` (cooldown'lu) → `echoChance +0.15` |
| bar10 | On a Roll | C3 | `onJackpot` → Haste 1 |
| bar15 | Blood Debt | C3 | `onBust` (can kaybettiren) → `nextSkillBuff powerMul 0.15` |
| bar20 | Momentum | C3 | `onEcho` → +%5 hasar (birikir), `onBust` sıfırlar |
| bar25 | Death Shrug | C3 | `onLuckyEscape` → maks canın %10'u şifa |
| 0.f1 | Hot Hand | C3 | `onJackpot` → sonraki skill `echoChance +0.02r` |
| 0.f2 | Cornered Dog | C1 | `selfHpBelow:0.5` → `echoChance +0.02r` |
| 0.f3 | Quick Shuffle | C3 | `onEcho` → `turnSooner 0.03r` |
| 0.n0 | Chain Reaction | C3 | `onEcho` → öbür cooldown'lar −1 |
| 0.r | Scar Gambler | C3 | `onBust` (can) → `echoChance +0.03r` sonraki `onJackpot`'a kadar |
| 0.ea | Streak [NEW] | C3 | `onEcho` üst üste → +0.1 / adım; `onEchoFail` sıfırlar |
| 0.eb | Charmed Life | C3 | `onLuckyEscape` → Haste 2 |
| 0.ma | Unbroken Run | C3 | 3 üst üste `onEcho` → `nextSkillBuff guaranteedCrit` |
| 0.fa | All or Nothing | C3 | +a pasif `chance` 0.25 → 0.4 (soru 14.8); `onEchoFail` → o cooldown +1 |
| 0.fb | Coin Toss Life | C6 | Lucky Escape şansı %30 → %50 (şans LUCK'tan türer: soru 14.28) + b `startHpRatio 0.8` |
| 0.mb | Borrowed Time | C3 | `onLuckyEscape` → 2 tur her skill'de echo |
| 0.v | Run It Back [NEW] | C3 | `onEcho` → skill hemen %60 güçle bir daha (`freeCast`) |
| 1.f1 | Steady Wrist | C1 | `repeatIndex≥1` → `powerMul 0.06r` |
| 1.f2 | Red Pips | C1 | `selfMissingHp` her %20 → `repeatChance +0.01r` |
| 1.f3 | Rolling Dice | C3 | `onRepeat` → kullanımlar arası `powerMul +0.01r` (birikir), tekrar olmayınca sıfır |
| 1.n0 | Endless Rattle | C6 | Double Hit zincirlenir (her tekrar aynı şansla; bugün en çok 1 tekrar) |
| 1.r | Nimble Fingers | C3 | `onRepeat` → `turnSooner 0.02r` |
| 1.ea | Hot Dice | C1 | +a `repeatChance set 0.35` (soru 14.8); `repeatIndex` → her tekrar +0.1 |
| 1.eb | Loaded Corner | C1 | `repeatIndex≥1` → `guaranteedCrit` |
| 1.ma | Boxcars | C5 | 3+ atış → rastgele başka düşmana 1 vuruş |
| 1.fa | Fever Dice | a | `repeatChance add 0.2` + `power pct -0.15` |
| 1.fb | Spendthrift | C6 | +a `cost.amount set 6`, `power pct 0.8`; Rest yarı MP verir (Rest kuralı) |
| 1.mb | Snake Eyes | C3 | `onCrit` → sonraki bahis `winChance +0.1` |
| 1.v | Dice Storm | C5 | hedef `random_enemies count 3`, her zar kendi Double Hit'i |
| 2.f1 | Steady Stake | a\* | `bet.loseMult add 0.05r` |
| 2.f2 | Cautious Wager | a\* | `bet.ratio add -0.01r` |
| 2.f3 | Read the Room | C1 | `targetHpBelow:0.5` → `winChance +0.02r` |
| 2.n0 | Due for a Win [NEW] | C3 | `onBust` → sonraki High Stakes `winChance +0.15` (birikir, Jackpot'ta sıfır) |
| 2.r | Twist the Knife | C1 | `betWon` → hedefin bir durumunu `extendStatus +1, chance 0.15r` |
| 2.ea | Knockout Bet | C1 | `betWon` → `addStatus slow 2` |
| 2.eb | Hedged Bet | C1 | `betLost` → kendine Fortified 1 |
| 2.ma | Haymaker | C1 | `betWon` + `targetStatus:slow` → `addStatus stun 1` |
| 2.fa | Dirty Fighting | C1 | `betWon` → `addStatus stun 1` + a\* `winMult set 1.5` |
| 2.fb | Penny Ante | a\* | `bet.ratio set 0.05` + `winMult set 1.6` |
| 2.mb | Sure Thing | C1 | `betChanceAtLeast:0.7` → bahis bedeli 0 |
| 2.v | Called Game | C1 | `betWon` → Stun 1, `betLost` → Jinxed (süre yok); a\* `bet.ratio set 0.08` |
| 3.f1 | Sharp Corners | C1 | `targetStatus:stun` → `powerMul 0.05r` |
| 3.f2 | Jack of Clubs | C1 | `targetHasAnyStatus` → `powerMul 0.04r` (soru 14.12) |
| 3.f3 | Swift Suit | a\* | `randomStatus` Slow olasılığı +0.05r (ağırlık mı olasılık mı: soru 14.11) |
| 3.n0 | Crippling Ace | C1 | `targetStatus:slow` → randomStatus yerine Stun |
| 3.r | Long Con | C1 | Stun `statusTurns +1, chance 0.05r` |
| 3.ea | Stacked Deck [NEW] | C6 | kullanmadan önce durum seçimi (Slow / Wound / Stun; Stun yalnız ilk hedefe): arayüz + YZ seçimi |
| 3.eb | Distracting Fan | b | `addEffect` YENİ durum "sonraki saldırısında −%15 hasar" |
| 3.ma | Double Deal | C6 | ea seçimine ek rastgele ikinci durum (ea'ya bağlı) |
| 3.fa | Cold Deck | b | `replaceEffect randomStatus → status stun 1` + a `cooldown set 5` |
| 3.fb | Smoke Cards | b | `addEffect status blinded 2` + `replaceEffect` hasar kaldırılır (soru 14.10) |
| 3.mb | Blinding Flurry | b | `addEffect status blinded 1` |
| 3.v | Returning Cards | C5 | her kart geri döner: %60 ikinci vuruş + yeni durum zarı |
| 4.u1 | Fat Stack | a\* | `bet.perStake add 0.02` |
| 4.u2 | Mortgage | C6 | bahse maks canın %10'u da girer, MP sayılır (çift kaynak bahis) |
| 4.u3 | High Roller | C1 | `stakeAtLeast:25` → `ignoreDefense 0.5` + `sureHit` |
| 4.r1 | Run the Table | C3 | `onKill` → cooldown sıfır |
| 4.r2 | Clean Sweep | C3 | `onKill` → bahse konan MP geri |
| 4.r3 | Domino | C3 | `onKill` → rastgele düşmana hasarın %60'ı |
| 4.d1 | Ride the Wave | C1 | koşulsuz bu skill'de `echoChance +0.1` |
| 4.d2 | Fast Break | a | `cooldown set 2` |
| 4.d3 | Blitz | a | `initialCooldown set 0` |
| 4.l1 | Grudge Ledger | C1 | `hitsTakenSinceLastUse` → `powerMul 0.02` / vuruş |
| 4.l2 | Heartbeat | C1 | `selfMissingHp` her %1 → `powerMul 0.01` |
| 4.l3 | Last Breath | C1 | `selfHpBelow:0.25` → `winChance set 1` |

**Özet:** düğüm (60): a 3 · a\* 5 · b 4 · C1 22 · C2 0 · C3 17 · C4 0 · C5 3 · C6 6 — bar (5): C1 1, C3 4.


## 12. TOPLAM
### 12.0 Sayılar (düğüm + bar; 715)
| Class | a | a\* | b | C1 | C2 | C3 | C4 | C5 | C6 | Toplam |
|---|---|---|---|---|---|---|---|---|---|---|
| Warrior | 5 | 0 | 11 | 21 | 7 | 7 | 6 | 3 | 5 | 65 |
| Defender | 12 | 0 | 4 | 12 | 0 | 14 | 5 | 13 | 5 | 65 |
| Paladin | 8 | 1 | 5 | 16 | 0 | 13 | 5 | 12 | 5 | 65 |
| Archer | 10 | 1 | 11 | 29 | 0 | 5 | 1 | 7 | 1 | 65 |
| Mage | 5 | 0 | 5 | 20 | 0 | 24 | 2 | 9 | 0 | 65 |
| Druid | 5 | 5 | 6 | 8 | 0 | 15 | 5 | 19 | 2 | 65 |
| Cutthroat | 4 | 0 | 7 | 31 | 0 | 10 | 0 | 13 | 0 | 65 |
| Undead | 4 | 6 | 10 | 22 | 0 | 7 | 10 | 3 | 3 | 65 |
| Hexer | 6 | 3 | 5 | 25 | 0 | 13 | 2 | 9 | 2 | 65 |
| Anti-Mage | 5 | 8 | 6 | 13 | 0 | 13 | 4 | 13 | 3 | 65 |
| Gambler | 3 | 5 | 4 | 23 | 0 | 21 | 0 | 3 | 6 | 65 |
| **Toplam** | **67** | **29** | **74** | **220** | **7** | **142** | **40** | **104** | **32** | **715** |

- fx'i yazılı 15 düğümün hepsi (a): Warrior 3, Defender 12. Kalan 52 (a) + 29 (a\*) hemen yazılabilir (a\* için derleyiciye seçici / alan eklemek yeter).
- NEW işaretli 27 düğümün aileleri: C3 12, C6 12, C4 1, C5 1, b 1 (Sunder); hepsi onaylı (10a).
- C2 yalnız Warrior'da (Rage). Öbür 10 class'ta Rage yok; C2 altyapısı Warrior'a özel kalır.

### 12.1 C1 koşul anahtarları
Ad önerisi; engine-dev kendi adını koyarsa bu liste eşleme tablosu olarak kullanılır. Parantezde kullanım sayısı (bar dahil, notlarda geçtiği her yer; C3 / C4 / C5 düğümlerinin koşul parçaları da sayıldı).

**A. Bölüm 4.2 sözlüğünde olanlar**
| Anahtar | Sayı | Düğümler |
|---|---|---|
| `targetStatus:<durum>` (+ `perTurnLeft`, `turnsLeft≥N`) | 36 | W 1.f3, 1.n0, 1.r, 1.ma, 1.fb, 1.mb, 1.v, 2.r, 2.ea, 2.fb, 4.r3 · D 1.f2, 1.ea · P 3.r · Ar 1.ea, 1.ma, 1.mb, 1.v, 2.ma, 3.n0 · M 2.f2, 2.r, 2.ea · Dr 0.f3, 2.mb · Cu 1.f1 · U 1.f1, 1.f2, 1.ea, 1.ma, 1.mb, 4.u2 · H 1.r · G 2.ma, 3.f1, 3.n0 |
| `selfHpBelow:x` / `selfHpAbove:x` | 15 / 1 | W bar20, 0.f2, 0.ea, 0.fa, 0.v, 2.f3, 4.u2 · P 2.f3 · U 0.f1, 0.n0, 0.ea, 2.n0, 3.r · G 0.f2, 4.l3 / W 0.fa |
| `targetFullHp` | 3 | W 3.eb · M 1.f3 · Cu 4.r2 |
| `targetLastHitMe` (10a: yalnız skill vuruşu) | 3 | W 3.f2, 3.ea, 3.ma |
| `targetArmorAboveMine` | 3 | D 4.d3 · Ar 2.f2, 2.n0 |
| `noMoveLastTurn` | 3 | D 0.f1 · Ar bar5, 0.f2 |
| `targetHitMeSinceTurn` | 2 | D 4.u1 (C5 öncelik), 4.u2 |
| `hitCountWithStatus:<durum>` (ölçek) | 2 | W 2.mb · Ar 3.r |
| `targetNotActed` | 1 | W 3.f1 |
| `targetArmor` (ölçek) | 1 | D 4.d2 |
| `selfArmorAbove:40` (ölçek) | 1 | D 4.r2 |
| `alliesInAura` (ölçek) | 1 | D 0.f3 |
| `alliesBelowHp:0.5` (ölçek) | 1 | W 0.f3 |
| `incomingArea` | 1 | D 0.r |
| `rageSpent≥N` | 1 | W 4.r2 |
| sözlükte olup hiçbir seçili düğümde geçmeyen | 0 | `rageAtLeast` / `rageAtMost`, `rageSpentLastTurn` (Warrior'ın seçilmeyen karmalarından) |

**B. 4.4 / 4.5 örneklerinde kullanılmış ama 4.2 sözlüğünde yazmayan (sözlüğe eklenmeli)**
| Anahtar | Sayı | Düğümler |
|---|---|---|
| `firstUseOfSkill` (savaşta bu skill'in ilk kullanımı) | 11 | W 3.n0 · D bar10, bar15 · P 1.n0 · M bar5 · Cu 4.r3 · U bar15, bar20, 4.u3 · H bar5 · G bar5 |
| `selfMissingHp` (her %N eksik can, ölçek) | 5 | W 3.r · D 4.l2 · U 0.f3 · G 1.f2, 4.l2 |

**C. YENİ anahtarlar (53)**
| Anahtar | Sayı | Düğümler |
|---|---|---|
| `targetHpBelow:x` / `targetHpAbove:x` | 28 / 1 | P 0.f3, 0.r, 0.mb, 4.r1 · Ar 4.u1, 4.u2 · M 1.r, 1.eb, 1.fb · Dr 1.n0, 3.f3, 3.eb · Cu bar15, 0.f1, 0.n0, 1.n0, 1.r, 1.ea, 1.fa, 1.v, 2.f3, 2.ea, 4.d3 · U 1.ma · H bar20, 0.f2, 0.fb · G 2.f3 / Dr 1.fb |
| `hitIsCrit` (bu vuruş kritik) | 10 | Ar 0.r, 1.n0, 1.eb · M 1.n0, 1.fa, 1.v · Dr 1.ma · Cu 0.ea, 0.fa, 2.r (+ Cu 2.ma) |
| `targetIsCenter` (alanın tıklanan merkez hücresi) | 9 | M 4.r1, 4.r2, 4.l1, 4.l3 · Cu 2.f1, 2.ea, 2.fa · AM 2.ea, 2.ma |
| `targetDistance` (≥N ya da ölçek, sıra cinsinden) | 7 | Ar 0.f3, 0.n0, 0.r, 0.eb, 0.fa, 0.v, 1.f2 |
| `hitCount` (bu kullanımda vurulan sayısı, ölçek / ≥N) | 6 | M 0.r, 4.l3 · U 2.mb · H 2.f1, 2.n0 · AM 2.mb |
| `targetStatusAny:[liste]` | 5 | W bar15 · Ar 1.r, 2.r · Dr 4.r2 · U 1.r |
| `betWon` / `betLost` (Jackpot / Bust) | 5 / 2 | G 2.r, 2.ea, 2.ma, 2.fa, 2.v / G 2.eb, 2.v |
| `targetRow:front\|back` | 4 | P 1.r · Ar 3.f3 · M 3.f1 · Cu 3.f1 |
| `targetStatusStacks:omen=N` | 4 | H 1.f1, 1.f3, 1.n0, 1.ea |
| `targetHasBuff` (true / false) | 3 | AM bar10, 1.r, 4.l1 |
| `targetOpportunist` (pasif listesindeki durumdan biri) | 3 | Cu 0.f2, 0.ea, 0.fa |
| `skillStreak` (aynı skill üst üste, ölçek) | 3 | P 1.ea, 1.ma, 1.fa |
| `repeatIndex` (Double Hit zincirindeki sıra) | 3 | G 1.f1, 1.ea, 1.eb |
| `targetMp=0` / `targetMpAbove:x` / `targetMpZeroBefore` | 3 / 1 / 1 | AM 1.eb, 4.u3, 2.ma / 1.f2 / 2.n0 |
| `targetIsMyLastTarget` | 2 | P 1.f1 · H 1.eb |
| `anyEnemyStatus:<durum>` | 2 | M 2.ma · H 3.f3 (C4) |
| `targetOnGround:<zemin>` | 2 | P bar10, 3.f2 |
| `hpPaidThisCast` / `hpPaidAmount` (ölçek) | 2 / 2 | U bar5, 0.f2 / U 2.f1, 2.ma |
| `thrown` (Backstab arkası kapalı atış) | 2 | Cu 4.l1, 4.l2 |
| `firstTurn` | 1 | P bar5 |
| `firstHitOnTarget` (bu düşmana ilk vuruşun) | 1 | Ar 0.v |
| `firstHitThisTurn` | 1 | U 0.n0 |
| `firstDoom` (savaşta ilk Doom) | 1 | H bar10 |
| `notHitSinceMyTurn` | 1 | Ar 0.ea |
| `targetMissedMeSinceTurn` | 1 | Cu 0.r |
| `targetMissingHp` (ölçek) | 1 | Cu 0.v |
| `targetArmorAtLeast:N` | 1 | Ar 2.f3 |
| `targetDiedSinceMyTurn` (ölü dost hedef) | 1 | P 2.mb |
| `targetIsSelf` | 1 | AM 3.eb |
| `targetHasAnyStatus` | 1 | G 3.f2 |
| `selfStatus:<durum>` | 1 | Ar 4.d1 |
| `selfHasShield:<skill>` + `selfTaunting` | 1 | AM 3.mb (C4) |
| `fasterThanTarget` | 1 | Ar 4.d3 |
| `lastSkillCostMp` | 1 | Dr 1.f3 |
| `killedThisCast` / `killingBlow` | 1 / 1 | M 0.f2 / Cu 1.fb |
| `centerHitIndex=N` | 1 | Cu 2.f2 |
| `healedCountBelow:x ≥ N` | 1 | P 4.l3 |
| `groundAge≥N` (zemin tiki) | 1 | P 3.f1 |
| `dotTickIndex` (DoT tiki, ölçek) | 1 | Dr 0.eb |
| `buffsRemoved` (ölçek) | 1 | AM 1.v |
| `silencedAny` (bu kullanımda) | 1 | AM 2.r |
| `doomSource:<skill>` | 1 | H 1.mb |
| `omenFromTransfer` | 1 | H 0.f1 |
| `betChanceAtLeast:x` / `stakeAtLeast:N` | 1 / 1 | G 2.mb / G 4.u3 |
| `hitsTakenSinceLastUse` (ölçek) | 1 | G 4.l1 |

**D. C1 değiştiricileri (mod)** — 4.2'dekiler: `powerMul`, `critBonus`, `ignoreDefense`, `lifestealAdd` / `lifestealMul`, `statusTurns`, `addStatus` (koşullu durum, şanslı), `costMul` / `costDelta`. YENİ: `critDmgMul` (5: M 1.f2, Dr 1.r, Cu bar20, 1.f3, H 0.ma), `sureHit` (5), `noCrit` (2), `guaranteedCrit` koşullu (8), `extendStatus` (hedefteki durumu uzat; 4), `cooldownSet` / `cooldownDelta` (bu kullanımın cooldown'u; 5), `echoChance` (10), `repeatChance` koşullu (G), `winChance` (bahis; 4), `drainMul` (Vampiric Bite; 6), `manaBurnAdd` / `manaBurnMul` (3), `omenStacks` (3), hedef başına `falloff` (Ar 2.f3), `flatDamage` (U 2.ma), `statusPotency` (durum gücü; 8, soru 14.7), pasif alan değiştiricileri (Berserker `maxBonus`, Opportunist `bonus` ve koşul listesi, Spell Echo `chance`, soulDrain `ratio`, bond `ratio`, Mana Overflow sayaç çarpanı).

**E. C1'in bağlanacağı yeni noktalar (vuruş yolu dışında):** Doom patlaması (Hexer 9 düğüm: bar10, 0.f1, 0.f2, 0.f3, 0.r, 0.ea, 0.ma, 0.fa, 0.fb, 1.mb), DoT tiki (Dr 0.f3, 0.eb; H bar20, 2.f3), zemin tiki (P 3.f1, 3.r), pasif şifa / smite (P 0.r, 0.mb, 1.fa), Opportunist bonusu (Cu 0.f1, 0.n0, 0.r, 0.v), Spell Echo / Double or Nothing zarı (M, G), bahis zarı (G), Double Hit zarı (G), durum uygulama noktası (`statusTurns`, `addStatus`), `cost.ts` (bedel), mana yakma (AM).

### 12.2 C3 tetik olayları
**4.2'de olanlar:** `onKill` (24: W 4.u3, 4.l3 · D 4.l3 · P 0.ma, 1.mb, 4.r2, 4.r3 · Ar 4.r1, 4.r2, 4.r3 · M bar10, bar20, 1.mb · Dr 1.eb, 1.mb · Cu bar20, bar25, 1.ma, 2.n0 · H 0.mb, 4.u1 · G 4.r1, 4.r2, 4.r3), `statusEnd` (9: W 3.v · D bar20, 2.f2, 2.ma, 2.mb, 2.v · Dr 0.mb (wither), 3.mb (hot) · H 2.eb (wither)), `hpThresholdFirst` kendi / dost (9: W 0.n0 · D 0.mb, 2.n0 · P bar25 · M bar25 · Dr 0.n0 · U bar10, bar25, 3.n0), `turnStart` (3: W bar20 · D 0.v · Dr 0.v), `battleStart` (1: D 0.n0), `statusGained` (1: W 0.r), `everyNthUse` (1: D 1.ma). `allyFell`: seçili düğümlerde yok (D bar25 var olan `vengeance` ile b).

**YENİ olaylar (36)**
| Olay | Sayı | Düğümler |
|---|---|---|
| `onEcho` / `onEchoFail` (Spell Echo, Double or Nothing) | 14 / 3 | M 0.f3, 0.n0, 0.ea, 0.eb, 0.ma, 0.fa, 0.mb, 0.v · G bar20, 0.f3, 0.n0, 0.ea, 0.ma, 0.v / M 0.fa · G 0.ea, 0.fa |
| `enemyDied` (durumlu / zeminde ölen düşman) | 7 | P bar20, 3.ea, 3.mb · Dr 0.ea, 0.ma · H 0.v, 2.mb |
| `enemyMissed` (düşman saldırısı ıskaladı; hedef ben ya da saldıran durumlu) | 6 | M 2.mb · Cu 0.eb, 3.ma · H 3.eb, 3.ma, 3.mb |
| `onShieldAbsorb` / `onShieldBreak` | 5 / 3 | M 3.n0, 3.r, 3.ea, 3.ma · AM 3.v / M 3.v · AM 3.r, 3.ma (var olan `OnAbsorbSpec` genişler) |
| `onBust` / `onJackpot` | 4 / 3 | G bar15, bar20, 0.r, 2.n0 / G bar10, 0.f1, 0.r |
| `onManaOverflow` | 4 | AM 0.f3, 0.n0, 0.ma, 0.mb |
| `onLuckyEscape` | 3 | G bar25, 0.eb, 0.mb |
| `statusApplied` (kaynak ben: Stun verdim) | 2 | W bar25 · D 1.r |
| `onCrit` (sonraki kullanıma bayrak) | 2 | M 1.ma · G 1.mb |
| `onDodge` | 2 | Cu bar10, 0.f3 |
| `onDoom` (Doom patladı / hedef sağ kaldı) | 2 | H bar25, 0.n0 |
| `onRepeat` (Double Hit oldu) | 2 | G 1.f3, 1.r |
| `summonDeath` / `summonArrive` | 2 / 1 | Dr 4.d1 · U 4.r1 / Dr 4.l1 |
| `afterSkillUse` (başka skill'in cooldown'u / pasif tetik) | 2 | P 4.l1 · AM 4.d3 |
| `delayedStrike` (sonraki turun başında aynı hücrelere ikinci vuruş) | 2 | M 4.d3 · Dr 2.v |
| `passiveHeal` / `passiveTrigger` | 2 / 1 | P 0.f2, 0.eb / Dr 0.fb |
| `groundEnd` | 1 | P 3.v |
| `dotTick` | 1 | H 2.v |
| `onSkipTurn` | 1 | Ar 0.ma |
| `enemyMovedNear` (≤N) | 1 | Ar 0.mb |
| `enemyGainedBuff` | 1 | AM 0.r |
| `enemyHealed` (senin Wound'unla) | 1 | U 0.mb |
| `onPayHp` | 1 | U 0.v |
| `onDispel` | 1 | M 3.f2 |
| `mpBelowFirst` | 1 | M bar15 |
| `targetMpEmptied` | 1 | AM 1.mb |
| `onHitTaken` (çağrıya vuran) | 1 | Dr 4.l2 |
| `allyHitTarget` (dost, işaretli hedefe vurdu) | 1 | AM 4.r2 |
| işaretli hedef dost eliyle öldü | 1 | AM 4.r3 |
| `onHit` (her vurulan için eylem) | 1 | AM bar15 |

**C3 eylemleri:** şifa, kalkan, durum, MP, Rage, cooldown sıfırla / azalt, `turnSooner` (7: W bar25, M 0.f3, Dr 1.mb, H 0.mb, AM 1.mb, G 0.f3, G 1.r; var olan Skip Turn hız desteği), `nextSkillBuff` (9: P bar25, 0.f2, 0.eb, 2.ma · Ar 0.ma, 4.r3 · M bar20 · G bar15, 0.ma), `freeCast` (bedava skill kullanımı; 4: Ar 0.mb, M 1.mb, 3.v, G 0.v), hasar (tek / alan / en yakın / rastgele), zemin bırakma, durum aktarma, savaş boyu biriken bonus (M 0.ea, U 0.v, Cu bar20, G bar20, 1.f3).

### 12.3 C4 (40)
- **Alınan şifa çarpanı (koşullu):** W 0.f2, 0.ea (+ 0.fb ceza, C6'da).
- **Fazla şifa → kalkan / Rage:** W 0.ma, 2.ma · Dr 3.n0 [NEW], 3.r.
- **Verilen şifa çarpanı (hedefin canına göre):** P 0.f3 · Dr 3.f3, 3.eb.
- **Maks can / zırh oranlı kalkan:** D 2.f3, 3.f2, 3.r, 3.eb · P 2.f2, 2.fa · M 3.f1 (koşullu kalkan gücü) · U 3.eb.
- **Maks can oranlı şifa (stat × güç değil):** W 2.f2 · U bar20, 3.f2 · AM 3.f2.
- **Can aktarma / iade:** P 2.f1 · U 2.r, 2.eb, 2.fb, 2.mb, 3.ea, 3.fa · AM 1.ma (MP → can).
- **Alınan hasar indirimi / artışı (koşullu):** W 0.eb (büyük vuruş) · D 3.f3 (Guard aktarımı) · P 2.r (ilk vuruş) · Ar 0.fb (menzilli düşmandan +%20) · M 3.f3 (Slowed saldıran) · U 3.f3 (bağlı dost) · H 3.f3 (Jinxed düşman varken) · AM bar20 (Ward'lı dost, fiziksel), 3.mb.
- **DoT tikinden şifa / geri tepme:** Dr 0.r · H 0.fa.

### 12.4 C5 (104)
- **Ek vuruş / sıçrama / zincir:** W 1.fb, 4.l1, 4.l2 · D 1.n0 · P 1.eb, 1.ma, 1.v · Ar 4.d3 · M 1.v, 4.d1, 4.d2 · Dr 1.ea, 1.ma · Cu 1.eb, 1.mb, 2.ma, 2.mb · U 1.v · H 2.r, 3.r · G 1.ma, 3.v.
- **Alan şekli / alt alan değişimi** (Faz 1a: alan yüklemleri uid almalı): D 1.v · P 3.eb, 3.fb · Ar 2.fa, 3.v · M 2.n0, 2.fb · Dr 2.fb · Cu 2.eb, 2.fb, 2.v · H 2.ea · AM 2.eb, 2.fa.
- **Hedef türü / kapsam değişimi:** Dr 1.v (`random_enemies`), 3.fa (tüm dostlar) · U 2.v (tüm düşmanlar) · H 2.fa · AM 3.fb (yalnız kendin) · G 1.v · Cu 4.l1, 4.l2, 4.l3 (`requiresOpenBehind`).
- **Ek hedef seçimi (en zayıf / canı en düşük / MP'si en az / rastgele / alan dışı):** P 0.f1, 0.n0, 0.ea, 0.fa, 0.fb, 0.v · M 3.mb · Dr 0.f2, 3.ea, 3.ma, 3.v · Cu 3.eb, 3.fb, 4.u3 · H 2.ma, 4.r1, 4.r2, 4.r3, 4.d3 · AM 0.ea, 0.fa, 0.fb, 1.eb, 3.ea, 3.fa, 4.d2, 4.l1, 4.l2.
- **Hedef önceliği:** D 4.u1, 4.u3, 4.d1.
- **Yeni / değişen zemin:** D 1.eb, 1.fb, 1.mb · P 3.ma · Ar 3.ea, 3.ma, 3.fa, 3.mb · M 2.v, 4.u3, 4.l2 · Dr bar15, 2.n0, 2.ea, 2.ma, 2.fa · U 4.r2 · AM 2.v.
- **Aura / Guard ilişkisi:** D 0.f2, 0.eb, 0.fb, 3.f1, 3.n0 · Dr 4.l3.
- **Konum değiştirme:** Dr 2.eb (`pull` yeni biçim).
- **Çağrı inişi / çağrı alanı:** Dr 4.u1, 4.u2, 4.u3.

### 12.5 C6 (32)
| Kural | Düğümler |
|---|---|
| Ölümden 1 canla / canla dönme | W 0.mb, 0.v [NEW] · P 2.v [NEW] · U 0.ma [NEW] · H 4.l3 [NEW] |
| Ölümcül vuruşu üstlenme / hasar paylaştırma | D 3.ma [NEW], 3.v [NEW] · U 3.ma |
| CC kısaltma / bağışıklık / debuff bağışıklığı | W 0.fb, 4.d3 · D 0.ma |
| Move / Taunt kilidi | D 0.fa, 3.fa |
| Durumu tüketip patlatma | W 2.v |
| Hasar azaltıcı durum + kalkanı yok sayma | Ar 2.mb |
| İkinci kullanım biçimi / oyuncu seçimi (arayüz + YZ) | P 4.d1 [NEW], 4.d2, 4.d3 · G 3.ea [NEW], 3.ma · P 2.n0 (bedel seçimi) |
| Bedel / bahis / Rest kuralı | G 1.fb (Rest), 4.u2 (çift kaynak bahis) · U 4.d2 (cesetsiz besleme) |
| Zar zinciri | G 1.n0 (sınırsız Double Hit) |
| Lucky Escape şansı | G 0.fb |
| MP taşması / pasif kapsamı | AM 0.eb, 0.v [NEW] |
| Buff çalma | AM 4.l3 [NEW] |
| Düşmanı kendi dostuna saldırtma | H 3.v [NEW] |
| Çağrı: turda iki eylem / varken yeniden çağırma | Dr 4.r3, 4.d3 [NEW] |

### 12.6 Çağrı yaması gerektirenler (ağaç, çağrının skill / statını değiştirir)
Druid: bar25 (alınan hasar), 4.r1, 4.r2 (Root Smash), 4.r3 (iki eylem, ömür), 4.d2 (maks can), 4.l2 (vurana hasar), 4.l3 (Guard); Undead: 4.u1, 4.u2, 4.u3 (Skeleton vuruşu), 4.d1, 4.d3 (beslenmiş varyant), 4.l1 (can + ömür), 4.l2 (zırh + başlangıç durumu). Toplam 15. Bugün `summonPower` dışında çağrıya ağaç aktaran yol yok: `TreeSetup` çağrı birimine (sahibinden) geçmeli.

### 12.7 Yeni durum (status) ve yeni zemin gerektirenler
**Yeni durum**
| Durum (taslak ad) | Düğümler | Motor ihtiyacı |
|---|---|---|
| "+%15 alınan hasar", sonraki turuna kadar, silinebilir (ad henüz yok) | W 2.fa, 3.fa | YOK: `damageTakenMult 1.15` alanı var (Overextended gibi); yalnız `statuses.json` + ikon |
| Sunder: zırh −%20, 2 tur | Ar 2.ea [NEW] (2.fa'da %40, 2.ma okur) | durumda zırh çarpanı alanı yok |
| Verilen hasar azaltma | Dr 2.f3 Pollen Drift (−%2r, 1 tur) · G 3.eb Distracting Fan (−%15, sonraki saldırı; `endsOnOwnAttack` var) · AM 4.u2 Spell Shatter (büyü hasarı −%20, 2 tur) | `damageDealtMult` (+ büyü süzgeci) alanı yok; Pollen Drift rank'a göre büyüklük ister (soru 14.7) |
| Sonraki skill güçlendirmesi (dosta) | P 0.f2 (+%2r), 0.eb (+%15), 0.fb (×2), 2.ma (+%30) | durum ya da `nextSkillBuff` kancası (C3); büyüklük değişken |
| İlk vuruş indirimi | P 2.r Iron Return (−%10r) | durum ya da kanca (C4) |
| "Rooted" | Dr 2.v Thicket Wave | Stun mu ayrı durum mu (soru 14.18) |

Var olan durumla çözülenler (yeni değil): Overextended (Cu 3.eb, AM 4.r1), Staggered (Ar 1.v, M 4.r3, Cu 3.ma, U 1.f3, 1.ea, H 3.ma), Silence, Jinxed, Blinded, Shrouded, Fleet, Haste, Fortified, Blessed, Burning (DoT gücü: soru 14.4).

**Yeni zemin**
| Zemin (taslak ad) | Düğümler | Motor ihtiyacı |
|---|---|---|
| quaking ground (Slow) | D 1.eb (+ 1.fb süre, 1.mb hasar) | tur başında durum veren zemin |
| field of shafts (Slow) | Ar 3.ea (+ 3.ma hasar + Blind, 3.fa süre) | aynı |
| root field (Slow) | Dr 2.n0 (+ 2.ea Silence, 2.ma hasar, 2.fa çarpınca Slow, bar15 süre) | aynı |
| storm (Slow) | M 2.v [NEW] | aynı |
| Hall of Silence (MP yakma + Silence) | AM 2.v | MP yakan zemin + koşullu durum |
| lingering rain (fiziksel hasar) | Ar 3.eb (+ 3.fb, 3.mb, 3.v) | YOK: hasar tiki var; yalnız `grounds.json` + ikon |
| Var olan zeminde yeni kural | P 3.ea (süresiz, yarım güç), 3.ma (üst üste ×2), M 4.u3 (zemin alanı ≠ hasar alanı), 4.l2 (merkez hücre ×2), U 4.r1 / 4.r2 (poison, ölüm anında) | zemin süresi / hücre başına güç / üst üste kuralı |

## 13. 4.4 / 4.5'ten ayrılan sınıflandırmalar
| Düğüm | 4.4 / 4.5 | Burada | Neden |
|---|---|---|---|
| W bar15 Crushing Weight | b | C1 | ItemEffects'te karşılığı yok (`bonusVsStatus` pasif tipi) |
| W 2.fa Glass Cyclone, 3.fa Martyr's Rush | C4 | b | 10a "yeni küçük durum"; `damageTakenMult` var, yalnız veri |
| W 3.v Herald of Ruin | C2 | C3 | Stun bitince iade tetik ister (çok aileli kural) |
| W 0.v, D 3.ma, D 3.v | NEW | C6 | onaylandı (10a), aile atandı |
| D bar10 First Tremor, bar15 Formed Up | C3 | C1 | "savaşta ilk kullanım" koşul olarak (`firstUseOfSkill`, W 3.n0 ile aynı) |
| D 1.fb Endless Tremor | a | C5 | `ground` seçicisi 1.eb'nin yeni zeminine bakar |
| D 1.mb Sinking Earth | b | C5 | aynı |
| D 2.v Bastion Cry | b | C3 | 10a: Fortified Taunt bitince / kırılınca biter → `statusEnd` |
Sonuç (yalnız 60 düğüm, 4.3 ile karşılaştırma): Warrior Faz 2 kapsamı 40 → 41; Defender 28 → 25 (1.fb, 1.mb Faz 5'e; 2.v Faz 4'e). Bar'lar dahil: Warrior 44, Defender 28.

## 14. Sorular (metin belirsiz ya da motorda iki türlü okunabilir; karar verilmedi)
> **Cevaplandı (Ömer 2026-10-22):** cevaplar `skill-tree-implementation.md` bölüm 10a "Beşinci tur". Öneriler kabul; farklı olanlar: 1 (yeni adlar verildi), 3 (en az kalan can, sayı), 4 (tek ortak Burning değeri, öneri INT × 0,12 / tur), 17 (Tight Weave metni değişti), 25 (her Blind), 27 (önce mockup), 29 (Doom Mark da sayılır). Aşağıdaki tablolarda eski adlar geçebilir; güncel ad JSON'dadır.
1. **Ad çakışmaları (11):** Hamstring (W 1.ea / Ar 1.f1), Herald of Ruin (W 3.v / H 0.v), Gravedigger (W 4.u2 / U 4.d2), Shockwave (D 1.f2 / P 1.eb), Heavy Landing (D 1.fa / Dr 4.u2), Life for Life (P 2.f1 / U 3.ma), Dead Center (Ar 0.v / M 4.l1), Trophy (Ar 4.r1 / Cu bar20), Momentum (M bar20 / G bar20), Gnawing Rot (Dr 0.eb / H 2.fb), Twist the Knife (Cu 1.f3 / G 2.r). Öneri: Ironbound Oath → Cloistered Ward örneğindeki gibi, ikinciye yeni ad (Ömer seçer).
2. **Aura "on you" düğümleri** (D 0.f1, 0.r, 0.ea, 0.fa) auranın kendi payını dostlarınkinden ayırmayı ister; bu ayrım 4.2'de C5 (0.fb Pledged Plate). Öneri: ayrımı Faz 2'ye çekmek (yoksa bu dört düğüm Faz 5'e kayar).
3. **Paladin "weakest enemy"** (0.f1, 0.n0, 0.ea, 0.v): en düşük mevcut can mı, en düşük can oranı mı? Öneri: can oranı (Divine Light'ın "most wounded" seçimiyle simetrik). 0.n0 "no ally is wounded" = canı eksik dost yok (Wound durumu değil) öneriyle.
4. **Burning DoT gücü metinde yok:** P 1.f3, 3.f3, 4.u2, M 4.d1. Öneri: kaynağın zemin gücüyle aynı ölçek (Judgment 0.288 INT / Meteor 0.361 INT) ya da tek ortak değer `data/`'da.
5. **Archer 3.eb Lingering Hail "25% damage":** DEX'in %25'i mi (3.ma "20% DEX" gibi), çarpma hasarının %25'i mi? Öneri: DEX ölçeği.
6. **"Falloff X% smaller"** (Ar bar15, 2.f3): 0.70 → 0.75 (düz ek) mi, ×1.05 mi? Öneri: düz ek.
7. **Durum gücü kişiye özel** (Cu 3.f2, 3.f3, 3.fa · H 2.f2, 3.f1, 3.f2, 3.n0, 3.fb · Ar 2.fa Sunder %40 · Dr 2.f3 Pollen Drift): durumlar bugün `statuses.json`'da sabit. İki yol: (a) uygulanan duruma büyüklük alanı (motor), (b) her varyant için ayrı durum (veri, ama rank'lı olanlarda imkânsız). Öneri (a).
8. **"A → B" yazan taban değişimleri başka rank'larla birlikte** (M 0.fb 25 → 18 + Resonance; G 0.fa 25 → 40, 1.ea 25 → 35, 2.fb, 2.v; Ar 2.n0): `base` (Hollow Roar gibi, ekler üstüne biner) mi `set` (ekleri siler) mi? Öneri: `base` (10a Hollow Roar kararıyla tutarlı).
9. **Hexer 0.f1 Fresh Host:** pasif metni "Passed Omens never trigger Doom" diyor; düğüm "host of passed Omens"a gelen Doom'dan bahsediyor. Anlam: geçen Omen'in üstüne kendi Omen'inle Doom getirince mi? Öneri: evet, konakta en az 1 geçmiş Omen varsa.
10. **"Hasar yok" düğümlerinde isabet zarı** (H 1.v, 3.fb · AM 1.fa, 2.fb · Dr 2.fb · G 3.fb): durum / Omen yine isabet ister mi? Öneri: zar kalır (ıskada etki yok).
11. **G 3.f3 Swift Suit "Slow odds +5%":** mutlak olasılık (%40 → %45, öbürleri orantılı azalır) mı, ağırlık mı? Öneri: mutlak olasılık.
12. **G 3.f2 Jack of Clubs "a status":** buff dahil mi? Öneri: yalnız debuff.
13. **H 4.d3 Mark of Silence "every caster":** MP bedelli skill'i olan düşman mı? Öneri: evet (Silence'ın etkilediği).
14. **AM 4.d2 Ready Blades "extra dagger":** Mana Steal'in tam ikinci vuruşu (hasar + yakma) mı, yalnız hasar mı? Öneri: tam ikinci vuruş.
15. **AM 1.n0 Prying Blade "random buff":** `dispel` en uzun süreliyi seçer; rastgele seçim yeni seçenek. Öneri: seed'li rastgele.
16. **Süresiz değerler** (U 3.v Crimson Covenant, U 4.l3 Bone Champion, P 3.ea Undying Flame): büyük sayı mı, `permanent` bayrağı mı? Öneri: bayrak.
17. **Druid bar15 Tight Weave** yalnız 2.n0 Root Field alınmışsa işe yarar (bar seçimsiz açılır). Kalsın mı, metin değişsin mi?
18. **Druid 2.v Thicket Wave "1-turn Stun (Rooted)":** Stun mu, yeni "Rooted" durumu mu? Öneri: Stun (ad yalnız görsel).
19. **Druid bar10 Heart of the Wild "nature skills":** var olan `critMp` birim genelidir (Treant'ın Root Smash'i ve olası nature dışı skill'ler). Öneri: element `nature` süzgeci.
20. **Archer bar5 Still Hands "your first skill":** o turdaki skill mi, savaştaki ilk skill mi? Öneri: o tur (Steady Feet ile aynı mantık).
21. **Cutthroat 4.u3 Shadow Return:** Fleet süresi yok. Öneri: 2 tur (Shrouded ile aynı).
22. **Archer 1.mb Blind Panic / Undead 1.mb Jaw Breaker / Gambler 2.v Called Game:** Jinxed süresi yok. Öneri: 2 tur (10a Warrior kararı).
23. **Undead 3.mb Blood Oath:** var olan `guard` taşıyanın turlarıyla, bağ Undead'in turlarıyla sayılır. Öneri: Guard bağla birlikte biter (bağa bağlı süre).
24. **Undead 0.eb Black Spittle "direct hits":** Undead'in kendi skill vuruşları (zemin / DoT / Skeleton hariç)? Öneri: evet.
25. **Mage 2.mb Lost in the Snow:** yalnız Blizzard'ın verdiği Blind mı, her Blind mi? Öneri: yalnız Blizzard'ınki (`cause` alanı var).
26. **Paladin 2.n0 Soul Exchange "can be paid":** oyuncu seçimi mi (arayüz + YZ), MP yetmeyince otomatik mi? İki seçenek; karar Ömer'in.
27. **Paladin 4.d1 Focused Beam "can target one enemy":** yeni hedefleme kipi (arayüz + YZ). Tek düşman tıklanınca odaklı mı, ayrı düğme mi? Karar Ömer'in (mockup gerekebilir). Aynı soru G 3.ea Stacked Deck (durum seçimi) için.
28. **Gambler 0.fb Coin Toss Life "30% → 50%":** Lucky Escape şansı LUCK'tan türer (sabit %30 değil). %50'ye sabitle mi, +20 puan mı? Öneri: +0.20.
29. **Hexer 0.eb Doom Leaks:** Doom Mark'ın öldürmesi de sayılır mı (Doom Mark'ta `noTransferOnKill` var)? Öneri: yalnız Doom.
30. **"Beside" / "next to" komşuluğu:** W 4.l1, 4.l2, P 1.eb, M 1.v, Cu 1.eb, 4.u3 ("beside") ve Dr 0.f2, 0.ma, 3.ea, H 2.eb, 2.v, 3.r ("next to"). Öneri: "beside" = aynı sıradaki yan şeritler (`sideNeighbors`), "next to" = 4 yön komşu.
31. **Paladin 2.v Martyr Rising "while it is ready":** cooldown'da değil mi yeterli, MP de mi gerekir? Öneri: yalnız cooldown.
32. **Cutthroat 2.r Bloody Saltire:** Wound süresi yok. Öneri: 2 tur (Venom Edge gibi).

## 15. Faz önerisi (class başına düğüm sayısı, bar dahil 65)
| Class | Faz 2 (a + a\* + b + C1 + C2) | Faz 4 (C3 + C4) | Faz 5 (C5 + C6) | Birikimli |
|---|---|---|---|---|
| Warrior | 44 | 13 | 8 | 44 → 57 → 65 |
| Defender | 28 | 19 | 18 | 28 → 47 → 65 |
| Paladin | 30 | 18 | 17 | 30 → 48 → 65 |
| Archer | 51 | 6 | 8 | 51 → 57 → 65 |
| Mage | 30 | 26 | 9 | 30 → 56 → 65 |
| Druid | 24 | 20 | 21 | 24 → 44 → 65 |
| Cutthroat | 42 | 10 | 13 | 42 → 52 → 65 |
| Undead | 42 | 17 | 6 | 42 → 59 → 65 |
| Hexer | 39 | 15 | 11 | 39 → 54 → 65 |
| Anti-Mage | 32 | 17 | 16 | 32 → 49 → 65 |
| Gambler | 35 | 21 | 9 | 35 → 56 → 65 |
| **Toplam** | **397** | **182** | **136** | 397 → 579 → 715 |

- **Faz 2 kapsamı 397 düğüm (%56):** en dolu Archer (51), Warrior (44), Cutthroat ve Undead (42). En boş Druid (24) ve Defender (28): ikisinin asıl hissi zemin / aura / çağrıda (Faz 5).
- **Faz 2 için engine-dev listesi:** (1) derleyiciye a\* seçicileri (`heal`, `hot`, `shield`, `revive`, `manaBurn` + `onEmpty`, `bet`, `omen`, `dot`, `bond`, `cost.ofCurrent`, `summon.lifespan`, `dispel.count`, `randomStatus` ağırlığı); (2) 12.1 A + B + C koşulları ve D değiştiricileri; (3) 12.1 E bağlantı noktaları (Doom, DoT tiki, zemin tiki, pasif noktaları, zarlar); (4) `addEffect` için `dispel` `kinds` / `self` süzgeci ve hasar etkisinde `side`; (5) "+%15 alınan hasar" durum verisi (motor değişmez), Sunder ve "verilen hasar" durumları için durum alanı (12.7).
- **Faz 4 (182):** Mage (24 C3; Spell Echo olayları) ve Gambler (21 C3; echo / bahis / Lucky Escape olayları) bu fazın ağırlığı; `onEcho` tek başına 14 düğüm açar.
- **Faz 5 (136):** Druid (21) ve Defender (18); C5'in 104 düğümünün yarısı "ek hedef seçimi" + "ek vuruş" kalıbı (ortak kanca iki aileyi kapatır); C6 32 düğüm, 12'si NEW.
- Bağımlılık notu: başka düğümün kancasını yamalayan düğümler o kancanın fazına yazıldı (bölüm 0); bar'larda Druid bar15 (2.n0'a bağlı) tek örnek.
