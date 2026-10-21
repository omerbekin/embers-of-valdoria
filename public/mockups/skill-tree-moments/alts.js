/* SATIR ICIN YENI ONERILER (Omer iki karmayi da begenmedigi satir icin "yeni oner" dediginde), 2026-10-22.
   window.SMM_ALT[cls][satir] = [{ id: 'c'|'d'|'e', title, theme, tr, syn: { anahtar: 'Skill' }, nodes: { 'r.f1': [ad, etki, yeniMekanik, kaynak] x12 } }].
   final.js'te satir harfi 'c'/'d'/'e' bu listeden gelir; try: { satir: ['c','d','e'] } = Omer henuz secmedi, Seçim sekmesi her oneri icin ayri gorunur. */
window.SMM_ALT = {
  archer: {
    2: [
      { id: 'c', title: 'Ricochet',
        theme: 'The arrow bounces off the end of its lane into the next one: spray many lanes or bank it onto the weakest.',
        tr: 'Piercing Arrow: Seken ok. Şeridin sonundan yan şeride sekip öne doğru geri gelir. Ya çok şeride sekersin (kalabalık şerit, ikinci sekme) ya da sekmeyi en zayıfa nişanlarsın (ıskalamaz, zırh deler). Evrim: ok şeritten şeride sekmeye devam eder.',
        syn: {},
        nodes: {
          '2.f1': ['Hard Nock', 'Piercing Arrow +3% damage per rank to the last enemy it hits.', false, 'new row proposal'],
          '2.f2': ["Fletcher's Trim", 'Piercing Arrow falloff 2% smaller per rank.', false, 'new row proposal'],
          '2.f3': ['Bank Angle', 'Piercing Arrow +2% critical chance per rank for each enemy it has already passed.', false, 'new row proposal'],
          '2.n0': ['Ricochet', 'When Piercing Arrow leaves the back of its lane, it bounces into a neighboring lane and flies back to the front at 50%.', false, 'new row proposal'],
          '2.r': ['Live Edge', 'Ricochet damage +5% per rank (50% → 65%).', false, 'new row proposal'],
          '2.ea': ['Wall Banker', 'Ricochet picks the neighboring lane with the most enemies.', false, 'new row proposal'],
          '2.ma': ['Pinball', 'Piercing Arrow ricochets a second time at the front, into the lane on the other side, at 35%.', false, 'new row proposal'],
          '2.fa': ['Wild Bounce', "Ricochets keep the arrow's full damage, but Piercing Arrow's cooldown is 3.", false, 'new row proposal'],
          '2.eb': ['Chosen Mark', "Ricochet skips the lane's front and flies straight to its weakest enemy.", false, 'new row proposal'],
          '2.mb': ['From Behind', 'Ricochet hits from behind: it cannot miss and ignores 50% of Armor.', false, 'new row proposal'],
          '2.fb': ["Hunter's Angle", 'Ricochet deals +50% to its target, but Piercing Arrow costs 8 MP.', false, 'new row proposal'],
          '2.v': ['Endless Carom', 'Piercing Arrow evolves: it keeps ricocheting lane to lane across the field, losing 25% each bounce, until it fades below 25%.', false, 'new row proposal']
        } },
      { id: 'd', title: 'Bodkin Point',
        theme: 'A bodkin that laughs at plate: sunder a whole line of armor or strip their buffs and shields.',
        tr: 'Piercing Arrow: Zırh delici uç. Zırhı hiçe sayar. Ya hattın zırhını kırarsın (Sunder; Aimed Shot kırılmış zırhı tamamen deler) ya da buff ve kalkanları söküp atarsın. Evrim: tüm zırhı yok sayan mancınık oku.',
        syn: { '2.ma': 'Aimed Shot' },
        nodes: {
          '2.f1': ['Tempered Point', 'Piercing Arrow ignores 3% of Armor per rank.', false, 'new row proposal'],
          '2.f2': ['Weighted Head', 'Piercing Arrow +2% damage per rank against enemies with more Armor than you.', false, 'new row proposal'],
          '2.f3': ['Narrow Bodkin', 'Piercing Arrow falloff 2% smaller per rank against enemies with 20+ Armor.', false, 'new row proposal'],
          '2.n0': ['Bodkin Point', 'Piercing Arrow ignores 25% of Armor, or 50% against enemies with more Armor than you.', false, 'new row proposal'],
          '2.r': ['Rivet Breaker', 'Piercing Arrow +4% damage per rank against Fortified or Blessed enemies.', false, 'new row proposal'],
          '2.ea': ['Sunder', 'Piercing Arrow Sunders every enemy it hits for 2 turns: their Armor is 20% lower.', true, 'new row proposal'],
          '2.ma': ['Shattered Line', 'Aimed Shot ignores all Armor on a Sundered enemy.', false, 'new row proposal'],
          '2.fa': ['Brittle Point', 'Sunder is 40% instead of 20%, but Piercing Arrow stops after the second enemy.', false, 'new row proposal'],
          '2.eb': ['Strip Wards', 'Piercing Arrow removes one buff from each enemy it hits.', false, 'new row proposal'],
          '2.mb': ['Through the Guard', 'Piercing Arrow ignores Fortified, Blessed and shields on the enemies it hits.', false, 'new row proposal'],
          '2.fb': ['Spent Quarrel', "Strip Wards removes every buff, but Piercing Arrow's cooldown is 4.", false, 'new row proposal'],
          '2.v': ['Siege Bolt', 'Piercing Arrow evolves into a ballista bolt: it ignores all Armor and loses only 10% per enemy it passes.', false, 'new row proposal']
        } },
      { id: 'e', title: 'Suppressing Fire',
        theme: 'Covering fire down a lane: Jinx the line to shield your allies, or Silence the casters in the back.',
        tr: "Piercing Arrow: Baskı atışı. Hattaki düşmanları Jinx'ler (ıskalar, kritik yapamaz). Ya dostlarını korursun (herkese Jinx, şeridindeki dostlara Shrouded) ya da arka sıradaki büyücüleri susturursun (Silence, MP yakma). Evrim: vurduğu herkes Jinx + Silence.",
        syn: { '2.f2': 'Quick Shot' },
        nodes: {
          '2.f1': ['Whistling Shaft', 'Piercing Arrow has a 4% chance per rank to Jinx each enemy it hits.', false, 'new row proposal'],
          '2.f2': ['Low Flight', 'Piercing Arrow +2% damage per rank against Jinxed or Blinded enemies.', false, 'new row proposal'],
          '2.f3': ['Steady Release', 'Piercing Arrow +2% critical chance per rank.', false, 'new row proposal'],
          '2.n0': ['Heads Down', 'Piercing Arrow Jinxes the first two enemies it hits.', false, 'new row proposal'],
          '2.r': ['Pinned Down', 'Enemies Jinxed by Piercing Arrow deal 3% less damage per rank until their next turn.', false, 'new row proposal'],
          '2.ea': ['Suppress the Line', 'Piercing Arrow Jinxes every enemy it hits.', false, 'new row proposal'],
          '2.ma': ['Smoke and Shafts', 'After Piercing Arrow, allies in your lane are Shrouded until your next turn.', false, 'new row proposal'],
          '2.fa': ['Suppression Volley', "Piercing Arrow's Jinx covers the next 2 attacks, but the arrow deals 40% less damage.", false, 'new row proposal'],
          '2.eb': ['Spoiling Shot', 'Piercing Arrow Silences the last enemy it hits for 1 turn.', false, 'new row proposal'],
          '2.mb': ['Broken Chant', 'Piercing Arrow burns 8 MP from every enemy it hits.', false, 'new row proposal'],
          '2.fb': ['Gag Order', 'Piercing Arrow Silences every enemy it hits, but its cooldown is 4.', false, 'new row proposal'],
          '2.v': ['Dead Silence', 'Piercing Arrow evolves: every enemy it hits is Jinxed and Silenced for 1 turn, and the arrow loses only 15% per enemy.', false, 'new row proposal']
        } }
    ]
  }
};
