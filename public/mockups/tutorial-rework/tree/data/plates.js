/* Skill plaka verisi (mockup, oyun kodu DEGIL; uretildi 2026-10-22, GERCEK veriden: data/skills.json + data/classes/warrior.json, hesap = oyunun Gear plakasinin kaynagi src/ui/gear-skills.ts > gearSkillRows / skillTip).
   Statlar Sheet sayfasinda gorunenlerle ayni (Warrior Lv 30: STR 61, DMG +12%). Sira: pasif, 4 skill (4. skill = ult), views.js PLATE ile ayni.
   chips = plakadaki cipler (character-panel.ts > costChips / plateChips: bedel ikonlu sayi ya da yalniz "Free", bekleme ikonlu sayi; Rage "RAGE n");
   nums = plakadaki deger satirlari (numsHtml: etiket + sayi, times = "x2"); tip = A Band ipucu cipleri (skillTip meta: bedel, "Cooldown N turns"). */
window.SMM_PLATES = {
  warrior: { str: 61, dmg: "+12%", rows: [
    {"name":"Berserker","kind":"pas","chips":[],"nums":[{"label":"Max bonus","text":"+80%"},{"label":"Rage per 1% HP lost","text":"0.4"}],"tip":[]},
    {"name":"Double Strike","kind":"","chips":[{"kind":"free","text":"Free"}],"nums":[{"label":"Damage","text":"27","times":2}],"tip":["Free"]},
    {"name":"Whirlwind","kind":"","chips":[{"kind":"mp","text":"8"},{"kind":"cd","text":"3"}],"nums":[{"label":"Damage","text":"31"}],"tip":["8 MP","Cooldown 3 turns"]},
    {"name":"Charge","kind":"","chips":[{"kind":"mp","text":"10"},{"kind":"cd","text":"4"}],"nums":[{"label":"Damage","text":"46"},{"label":"Stun","text":"2 turns"}],"tip":["10 MP","Cooldown 4 turns"]},
    {"name":"Headsman's Blow","kind":"ult","chips":[{"kind":"rage","text":"RAGE 30"},{"kind":"cd","text":"5"}],"nums":[{"label":"Damage","text":"34"}],"tip":["RAGE 30","Cooldown 5 turns"]}
  ] },
};
