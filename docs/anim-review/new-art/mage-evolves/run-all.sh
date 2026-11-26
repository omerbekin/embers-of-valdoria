#!/usr/bin/env bash
# Mage evolve çekimlerinin tamamı (taban + evolve, masaüstü + telefon). Kullanım (worktree kökü): bash docs/anim-review/new-art/mage-evolves/run-all.sh [skill ...]
D=docs/anim-review/new-art/mage-evolves
S=/c/Users/Omer/Projects/embers-of-valdoria/ui-shots-mobil-masaustu/mage-evolves
cfg() { case $1 in
  fire_bolt) echo "3 40 1,4 sunfire";;
  blizzard) echo "5 50 0,1,3,4 eternal-winter";;
  ice_crater) echo "3 40 0,1,2 glacier-crater";;
esac; }
for sk in "${@:-fire_bolt blizzard ice_crater}"; do for s in $sk; do
  read STEP N FOES NAME <<<"$(cfg $s)"
  for evo in 0 1; do for view in 1920x1080 844x390; do
    tag=$([ $evo = 1 ] && echo evolve || echo taban); dev=$([ ${view%%x*} = 1920 ] && echo masaustu || echo telefon)
    SKILL=$s EVO=$evo VIEW=$view STEP=$STEP N=$N FOES=$FOES node $D/with-server.mjs $D/capture.mjs $S/$NAME/$tag-$dev 2>&1 | grep -v "Vite\|configLoader\|vitest\|NATIVE"
  done; done
done; done
