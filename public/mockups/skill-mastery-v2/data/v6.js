// V6 Moments (Anlar): her düğüm belirli bir anda çalışır (ilk tur, can %50 altı, öldürme sonrası,
// müttefik düşünce, tek düşman kalınca, ön / arka sıra, hedefte durum varken). Sayılar PROVİZYON.
// Şekil: r -> ea / eb -> (ea: ma, fa) (eb: fb, mb) -> v. Dal A ve dal B iki farklı "an" ailesidir.
(window.SMV_DATA = window.SMV_DATA || {})[6] = {
  w: {
    mastery: "Bloodhour Mastery",
    bar: [
      ["Opening Roar", "On your first turn of each battle, gain 10 Rage."],
      ["Red Mist", "The first time you drop below 50% HP in a battle, your next skill costs no MP."],
      ["Spoils of the Kill", "Each time you kill an enemy, gain 8 Rage."],
      ["Oathkeeper", "When an ally falls, your next skill deals +25% damage."],
      ["Death's Door", "Once per battle, when you drop below 25% HP, all your cooldowns drop by 1."],
    ],
    rows: [
      { // 0 Berserker: A = kendi canın, B = takım düşünce / yalnız kalınca
        n: {
          r: ["Scar Tissue", "While below 50% HP, Rage from losing HP +8% per rank."],
          ea: ["Cornered Beast", "The first time you drop below 50% HP in a battle, gain 15 Rage and Haste for 2 turns."],
          ma: ["Grave's Edge", "Below 25% HP you shrug off Stun, and Berserker already gives its full +80% bonus."],
          fa: ["Gristle", "Below 25% HP, damage taken -4% per rank."],
          eb: ["Avenge the Fallen", "When an ally falls, gain 20 Rage and your next attack cannot miss."],
          fb: ["Grim Tally", "Your damage +3% per rank for each fallen ally."],
          mb: ["Last of the Line", "While you are the last ally standing, damage taken -20% and you gain 8 Rage each turn."],
          v: ["Wolf's Hour", "Each time you drop below 50% HP, your next skill deals +60% damage and ignores its cooldown."],
        },
      },
      { // 1 Double Strike: A = açılış / ön sıra, B = öldürme / son düşman
        n: {
          r: ["Steady Grip", "Double Strike +5% power per rank against a Stunned target."],
          ea: ["First Blood", "On your first turn of battle, Double Strike strikes a third time."],
          ma: ["Line Breaker", "While you stand in the front row, Double Strike's second hit strikes the enemy behind the target.", 1],
          fa: ["Front-Rank Drill", "While you stand in the front row, Double Strike +4% power per rank."],
          eb: ["Red Tally", "After you kill an enemy, your next Double Strike grants double Rage."],
          fb: ["Hunter's Patience", "Against the last enemy standing, Double Strike +6% power per rank."],
          mb: ["Throat Cut", "Double Strike hits are always critical against a target below 30% HP."],
          v: ["Butcher's Hour", "Below 50% HP, Double Strike strikes three times and each hit grants 2 extra Rage."],
        },
      },
      { // 2 Whirlwind: A = kalabalık düşman, B = öldürme / tek düşman
        n: {
          r: ["Thirsting Steel", "While below 50% HP, Whirlwind lifesteal +4% per rank."],
          ea: ["Into the Thick", "Whirlwind +20% damage while 4 or more enemies are alive."],
          ma: ["Wheel of Ruin", "If Whirlwind hits 4 or more enemies, it grants 15 Rage and its cooldown is 1 shorter."],
          fa: ["Crowd Reaper", "Whirlwind grants +2 Rage per enemy hit, per rank."],
          eb: ["Crow's Feast", "After Whirlwind kills an enemy, your next Whirlwind has +20% lifesteal."],
          fb: ["Thinning Ranks", "Whirlwind +2% power per rank for each enemy fallen this battle."],
          mb: ["Last Dance", "Against a lone enemy, Whirlwind strikes it twice."],
          v: ["Sanguine Spin", "Below 50% HP, Whirlwind's lifesteal doubles and it Wounds every enemy hit for 2 turns."],
        },
      },
      { // 3 Charge: A = hedefin yeri / durumu, B = müttefik düşünce / az can
        n: {
          r: ["Gathering Pace", "On your first turn of battle, Charge +8% power per rank."],
          ea: ["Rear Strike", "Charge +25% damage against a target in the back row."],
          ma: ["Through the Lines", "Charging a back-row target also Stuns the enemies beside it for 1 turn."],
          fa: ["Prey Sense", "Charge +6% power per rank against a target with any debuff."],
          eb: ["Vengeful Dash", "When an ally falls, Charge's cooldown resets."],
          fb: ["Bloodied Charge", "While below 50% HP, Charge +6% power per rank."],
          mb: ["Desperate Ram", "Below 25% HP, Charge Stuns for 2 turns and heals you for 10% of max HP."],
          v: ["Breaker of Lines", "If Charge kills its target, it carries on into another enemy in that row for 60%.", 1],
        },
      },
      { // 4 Headsman's Blow: A = hedefin durumu, B = öldürme / son düşman
        n: {
          r: ["Measured Swing", "Headsman's Blow +5% power per rank against a target below 50% HP."],
          ea: ["Bound for the Block", "Headsman's Blow cannot miss a Stunned target and deals +20% damage to it."],
          ma: ["Last Breath", "Against a target below 25% HP, Headsman's Blow is always critical and needs only 20 Rage."],
          fa: ["Chopping Block", "Headsman's Blow +4% power per rank against a target with any debuff."],
          eb: ["Swift Justice", "If Headsman's Blow kills, its cooldown drops by 2."],
          fb: ["Final Foe", "Against the last enemy standing, Headsman's Blow +8% power per rank."],
          mb: ["Headsman's Due", "A kill with Headsman's Blow heals you for 20% of max HP and grants Haste for 2 turns."],
          v: ["Executioner's Dawn", "The turn after you drop below 50% HP, Headsman's Blow is ready and needs only 15 Rage."],
        },
      },
    ],
  },
  h: {
    mastery: "Portent Mastery",
    bar: [
      ["Crow at Dawn", "Your first skill each battle applies 1 extra Omen."],
      ["Carrion Hour", "When an ally falls, every enemy gains 1 Omen."],
      ["Lone Quarry", "When only one enemy remains, its Doom deals +25% damage."],
      ["Cornered Witch", "The first time you drop below 50% HP, every enemy with an Omen gains 1 more."],
      ["Toll of the Dead", "After Doom kills an enemy, your next skill costs no MP."],
    ],
    rows: [
      { // 0 Ill Omen: A = düşman ölünce, B = son düşman / kendi canın / yalnız kalınca
        n: {
          r: ["Graveside Rite", "Passed Omens arrive with +1 turn on their timer per rank."],
          ea: ["Corpse Candle", "When a cursed enemy dies, you regain 4 MP."],
          ma: ["Wake of Crows", "A dead enemy's Omens pass to the two nearest enemies instead of one."],
          fa: ["Mourner's Due", "Enemies that received passed Omens take +5% Doom damage per rank."],
          eb: ["Lone Candle", "When only one enemy remains, your skills apply 1 extra Omen to it."],
          fb: ["Ill Starlight", "While you are below 50% HP, Doom +6% damage per rank."],
          mb: ["Lone Witch", "While you are the last ally standing, each Omen you apply counts double."],
          v: ["Gravebound", "The first cursed enemy to die each battle passes its Omens to every other enemy."],
        },
      },
      { // 1 Evil Eye: A = hedefte durum varken, B = kendi canın / son düşman
        n: {
          r: ["Hungry Gaze", "Evil Eye +5% power per rank against a target with no Omen."],
          ea: ["Third Sight", "Against a Jinxed target, Evil Eye applies 1 extra Omen."],
          ma: ["Gallows Glance", "Evil Eye deals +35% damage to a Withering target and refreshes its Wither."],
          fa: ["Cold Iris", "Evil Eye +4% crit chance per rank against a target with an Omen."],
          eb: ["Leeching Look", "While below 50% HP, Evil Eye heals you for 15% of its damage."],
          fb: ["Cornered Gaze", "While below 50% HP, Evil Eye +6% power per rank."],
          mb: ["Final Stare", "Against the last enemy standing, Evil Eye strikes twice."],
          v: ["Eye of Reckoning", "The first Evil Eye on each enemy is always a critical hit (2 Omens) and cannot miss."],
        },
      },
      { // 2 Withering Curse: A = savaşın ilk turu, B = hedefte durum / müttefik düşünce
        n: {
          r: ["Damp Earth", "Wither ticks +6% per rank on enemies below 50% HP."],
          ea: ["Morning Blight", "Withering Curse cast on your first turn makes Wither last 2 turns longer."],
          ma: ["Field of Graves", "On your first turn, Withering Curse covers a 3x3 area and applies 2 Omens."],
          fa: ["Rot in the Roots", "Each enemy that dies while Withering refunds 1 MP per rank."],
          eb: ["Rotting Knot", "Jinxed enemies hit by Withering Curse gain 1 extra Omen."],
          fb: ["Sallow Skin", "Wither ticks +6% per rank on an enemy with 2 Omens."],
          mb: ["Mourning Blight", "When an ally falls, Withering Curse's cooldown resets and its next cast costs no MP."],
          v: ["Weeping Sores", "Wither ticks twice as hard on enemies below 50% HP; Withering Curse cooldown 3 to 2."],
        },
      },
      { // 3 Jinx: A = Jinxed düşman ıskalayınca, B = kendi canın / sana vuran / müttefik düşünce
        n: {
          r: ["Pinprick", "Jinx +6% power per rank against a target at full HP."],
          ea: ["Snapped Thread", "When a Jinxed enemy misses, Jinx's cooldown resets."],
          ma: ["Crossed Stars", "The first time a Jinxed enemy misses, it is Stunned for its next turn."],
          fa: ["Sour Fortune", "Jinx +8% power per rank against a target that already carries an Omen."],
          eb: ["Spite of the Dying", "While below 50% HP, Jinx costs no MP and gains +15% crit chance."],
          fb: ["Old Grudge", "Jinx +6% power per rank against the enemy that last hit you."],
          mb: ["Kinslayer's Bane", "When an ally falls, its killer is Jinxed for 3 turns and gains 2 Omens."],
          v: ["Black Cat", "When a Jinxed enemy misses, it takes Doom equal to its Omens; the Omens stay.", 1],
        },
      },
      { // 4 Doom Mark: A = öldürünce, B = son düşman / kendi canın / savaş başı
        n: {
          r: ["Patient Verdict", "Doom Mark +5% power per rank against a target with 2 Omens."],
          ea: ["Ashen Wake", "If Doom Mark kills, the nearest enemy gains 1 Omen."],
          ma: ["Gallows Bell", "If Doom Mark kills, it strikes the nearest enemy too for 60% power.", 1],
          fa: ["Grave Ledger", "If Doom Mark kills, refund 3 MP per rank."],
          eb: ["Final Reckoning", "Against the last enemy standing, Doom Mark's Doom is x2 instead of x1.65."],
          fb: ["Doomsayer's Rasp", "While below 50% HP, Doom Mark's Doom +5% per rank."],
          mb: ["Herald of Ruin", "Doom Mark has no starting cooldown, and its first cast each battle applies 2 Omens."],
          v: ["Midnight Toll", "Against a target below 50% HP, Doom Mark cannot miss and its Doom is x2.5."],
        },
      },
    ],
  },
};
