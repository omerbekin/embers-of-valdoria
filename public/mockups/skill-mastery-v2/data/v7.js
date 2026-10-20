// V7 Momentum (İvme): savaş içinde birikir. Art arda kullanım, geçen tur sayısı, alınan / verilen vuruş,
// öldürme sayısı birikir; Major yükü (Warrior: Rage, Hexer: Omen / Wither) HARCAYIP patlatır. Sayılar PROVİZYON.
// Şekil: f1 -> ea | eb -> m -> f2 (Major'ı büyütür) ve v.
(window.SMV_DATA = window.SMV_DATA || {})[7] = {
  w: {
    mastery: "Onslaught Mastery",
    bar: [
      ["Warming Up", "At the start of each of your turns, gain 2 Rage."],
      ["Simmering Rage", "Your skills deal +1% damage for every 5 Rage you hold."],
      ["Long Fight", "From your 6th turn in a battle, your skills deal +10% damage."],
      ["Embers of Wrath", "Rage spent on a skill adds +1% damage per 5 spent to your next skill."],
      ["Crescendo", "Every 4th turn of yours in a battle, your skill deals +30% damage."],
    ],
    rows: [
      { // 0 Berserker: alınan vuruşlar ve tutulan Rage birikir, 50 Rage'de patlar
        n: {
          f1: ["Gathered Hurt", "Each hit you take adds +1% damage per rank to your next skill (stacks)."],
          ea: ["Seething", "Each turn you end above 30 Rage, gain 3 more Rage."],
          eb: ["Bruised Pride", "Every third hit you take grants 10 extra Rage."],
          m: ["Boiling Over", "At 50 Rage, your next skill deals +40% damage and halves your Rage."],
          f2: ["Banked Fire", "Boiling Over's bonus +5% per rank."],
          v: ["Mounting Wrath", "Berserker's bonus +4% for each of your turns this battle, up to +40%."],
        },
      },
      { // 1 Double Strike: aynı hedefe art arda, tur sayısı, Rage harcayıp dört vuruş
        n: {
          f1: ["Heated Steel", "Double Strike +1% power per rank for every 10 Rage you hold."],
          ea: ["Hammering On", "Each Double Strike in a row on the same target deals +10% more (up to +30%).", 1],
          eb: ["Bite Deeper", "Double Strike +2% power for each of your turns this battle, up to +20%."],
          m: ["Rending Flurry", "At 40+ Rage, Double Strike spends 20 Rage to strike four times."],
          f2: ["Flurry Weight", "Rending Flurry's extra hits +6% power per rank."],
          v: ["Ceaseless Axe", "From your 3rd turn Double Strike strikes three times; from your 6th, four times."],
        },
      },
      { // 2 Whirlwind: her dönüş bir sonrakini besler, Rage harcayıp ikinci dönüş
        n: {
          f1: ["Warmed Shoulders", "From your 3rd turn in battle on, Whirlwind +5% power per rank."],
          ea: ["Blood Spray", "Each enemy Whirlwind hits adds +3% lifesteal to your next Whirlwind."],
          eb: ["Spin Up", "Each Whirlwind this battle deals +6% more than the last."],
          m: ["Double Turn", "At 30+ Rage, Whirlwind spends 15 Rage to spin a second time at 60%."],
          f2: ["Long Arms", "Whirlwind's second spin +6% power per rank."],
          v: ["Ever-Turning Wheel", "Each Whirlwind this battle cuts its cooldown by 1, down to 1 turn."],
        },
      },
      { // 3 Charge: kat edilen sıra = gerçek ivme, alınan vuruş bekleme süresini kısaltır
        n: {
          f1: ["Run-Up", "Charge +3% power per rank for each row it crosses."],
          ea: ["Head of Steam", "Charge grants 5 Rage for each row it crosses."],
          eb: ["Goaded", "Every 2 hits you take shorten Charge's cooldown by 1."],
          m: ["Full Tilt", "At 30+ Rage, Charge spends 20 Rage to deal +50% and Stun for 2 turns."],
          f2: ["Iron Shoulder", "Full Tilt damage +6% per rank."],
          v: ["Stampede", "Each Charge in a battle is 12% stronger than the last; from the third on, its cooldown is 1."],
        },
      },
      { // 4 Headsman's Blow: beklerken güçlenir, öldürmeler biriktirilir
        n: {
          f1: ["Whetted Edge", "Headsman's Blow +3% power per rank for every 10 Rage it spends."],
          ea: ["Gathered Grudge", "Each turn Headsman's Blow sits ready unused, its next hit deals +6% more."],
          eb: ["Steady Hand", "Headsman's Blow needs 2 less Rage for each of your turns this battle, down to 20."],
          m: ["Grisly Trophies", "Each enemy you kill this battle adds +8% to Headsman's Blow."],
          f2: ["Skull Tally", "Grisly Trophies bonus +2% per kill per rank."],
          v: ["Patient Axe", "Headsman's Blow keeps 25% of the Rage it spends, and each use adds +10% to the next."],
        },
      },
    ],
  },
  h: {
    mastery: "Gloom Mastery",
    bar: [
      ["Deepening Dusk", "From your 4th turn in a battle, Doom deals +10% damage."],
      ["Heavy Air", "Your skills cost 1 less MP for each enemy carrying 2 Omens."],
      ["Gathered Malice", "Each Doom in a battle makes later Dooms deal +4% more (stacks)."],
      ["Long Night", "From your 6th turn in a battle, your skills apply 1 extra Omen to their first target."],
      ["Black Tide", "Every 4th turn of yours, your skill applies 1 extra Omen to every target it hits."],
    ],
    rows: [
      { // 0 Ill Omen: Omen'in yaşı, ölümler ve Doom sayısı birikir; Doom zincirleme yayılır
        n: {
          f1: ["Seeping Dread", "Each turn an enemy keeps its Omens, its Doom grows +2% per rank."],
          ea: ["Gathering Crows", "Each enemy death this battle makes passed Omens' Doom +8% stronger."],
          eb: ["Tolling Count", "Every 3rd Doom you cause in a battle deals +40% damage."],
          m: ["Overflowing Ruin", "Omens applied past Doom are not lost; they start the next stack.", 1],
          f2: ["Deep Dregs", "Doom from an expired timer deals +4% per rank."],
          v: ["Rising Dark", "Each Doom adds 1 Omen to every other enemy that already carries one."],
        },
      },
      { // 1 Evil Eye: aynı hedefe art arda bakış, kritik serisi, her 3. bakış
        n: {
          f1: ["Lidless", "Evil Eye +2% power per rank for each Omen on the target."],
          ea: ["Fixed Stare", "Each Evil Eye in a row on the same target deals +10% more (up to +30%).", 1],
          eb: ["Gathering Glare", "Each Evil Eye crit adds +5% crit chance to the next; resets when one does not crit."],
          m: ["Burning Gaze", "Every 3rd Evil Eye in a battle is a guaranteed critical hit (2 Omens)."],
          f2: ["Searing Pupil", "Evil Eye critical hits deal +5% damage per rank."],
          v: ["Gaze of Ages", "Every 3rd Evil Eye also strikes every other enemy that carries an Omen."],
        },
      },
      { // 2 Withering Curse: tik büyür, ölümler ve kullanım sayısı birikir, Wither patlatılır
        n: {
          f1: ["Slow Poison", "Wither ticks grow +3% per rank each turn they last."],
          ea: ["Spreading Mold", "Each enemy that dies while Withering adds +10% to your next Withering Curse."],
          eb: ["Rot Upon Rot", "Each Withering Curse this battle costs 2 less MP than the last, down to 4."],
          m: ["Bloom of Decay", "On its third tick, Wither bursts for all its remaining ticks at once and adds 1 Omen.", 1],
          f2: ["Black Petals", "Bloom of Decay burst +6% per rank."],
          v: ["Rot Tide", "Each Withering Curse this battle grows its area: 2x3, then 3x3, then 4x3."],
        },
      },
      { // 3 Jinx: ıskalar ve kullanım sayısı birikir
        n: {
          f1: ["Twisting Thread", "Each miss by a Jinxed enemy this battle adds +3% power per rank to Jinx."],
          ea: ["Tangle Upon Tangle", "Jinxing an already Jinxed enemy adds 1 more Omen and 2 more turns."],
          eb: ["Worsening Luck", "Each Jinx this battle has +5% more crit chance than the last."],
          m: ["Fraying Fate", "Each miss by a Jinxed enemy resets Jinx's cooldown and adds +20% to the next Jinx."],
          f2: ["Worn Thread", "Fraying Fate's bonus +4% per rank."],
          v: ["Spiral of Misfortune", "Each Jinx this battle lowers every enemy's crit chance by 2% for the rest of the battle."],
        },
      },
      { // 4 Doom Mark: aradaki Omen'ler ve kullanımlar birikir, tüm Omen'ler tek patlamada harcanır
        n: {
          f1: ["Long Vigil", "Doom Mark's Doom +2% per rank for each of your turns this battle, from your 3rd."],
          ea: ["Second Toll", "Each Doom Mark this battle shortens its next cooldown by 1, down to 2."],
          eb: ["Debt Collector", "Each Omen you apply between uses adds +4% to the next Doom Mark."],
          m: ["Great Reckoning", "Doom Mark consumes every Omen on all enemies, adding +20% per Omen to its Doom."],
          f2: ["Swollen Verdict", "Great Reckoning +2% per Omen per rank."],
          v: ["Day of Wrath", "Each Doom Mark this battle raises its Doom multiplier by +0.25 (x1.65, x1.9, ...)."],
        },
      },
    ],
  },
};
