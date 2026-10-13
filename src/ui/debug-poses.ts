/**
 * Debug > Characters > Poses (Ömer 2026-10-11; v2 2026-10-12): poz kütüphanesini (src/game/poses.ts) gerçek savaşta denemek için.
 *  - "Pose test battle": test modunda (sıra yok) oyuncu tarafında 11 gizli test sınıfı Pose Tester I (Warrior) ... XI (Hexer)
 *    (data/classes/pose_tester_*.json, tools/make-pose-testers.mjs: her sınıfın 4 gerçek skill'inin bedelsiz, ~1 hasarlı pt_* kopyası; v2 poz
 *    takımı, sınıfının silahıyla), düşmanda iki pozlu (v1) Warrior.
 *  - Gerçek sınıfların çizimi (Ömer 2026-10-13): v2 poz gövdeleri (varsayılan) ya da karşılaştırma için eski v1 çizimi (tek idle görseli).
 *  - Poz seçici: Ctrl+tık seçili (yoksa tüm) pozlu birimlerde her pozu / döngüyü oynatır; isabet tepkisi, diz çökme, kalk.
 *  - Gerçek item ile donatma (tutuş item'den: Dane Axe / Avenger's Maul çift el takımı; kalkan / hançer ikinci ele), silah görseli
 *    seçici (aile x görünüm), tek el / çift el takımını zorlama, nadirlik ışıltısı, poz süresi / döngü hızı.
 * Sahneye yalnızca verilen host üzerinden dokunur.
 */
import type { CombatantView } from '../game/combatant-view';
import { POSES, allWeapons, weaponFor, type Grip, type WeaponPick } from '../game/poses';
import { offhandItem, weaponItem } from '../game/pose-weapons';
import { poseRender, setPoseRender } from '../game/pose-mode';
export { POSE_TESTER_GEAR } from '../game/pose-weapons';
import { itemDef } from '../progression/items';
import { debugButton, debugHeading, debugSection, type DebugMenu } from './debug-menu';

/** Debug donatma düğmeleri: [item id, ikinci el mi, etiket]. */
const DEBUG_ITEMS: readonly (readonly [string, boolean, string])[] = [
  ['arming_sword', false, 'Arming Sword'],
  ['woodcutters_axe', false, "Woodcutter's Axe"],
  ['flanged_mace', false, 'Flanged Mace'],
  ['rondel_dagger', false, 'Rondel Dagger'],
  ['dane_axe', false, 'Dane Axe (2H)'],
  ['avengers_maul', false, "Avenger's Maul (2H)"],
  ['rune_staff', false, 'Rune Staff (2H)'],
  ['hunting_bow', false, 'Hunting Bow'],
  ['hex_doll', false, 'Hex Doll'],
  ['oak_shield', true, 'Off: Oak Shield'],
  ['oathkeepers_bulwark', true, 'Off: Bulwark'],
  ['misericorde', true, 'Off: Dagger'],
];

export interface PosesHost {
  /** Açık savaşın pozlu birimleri (seçili olanlar ya da hepsi); savaş yoksa boş. */
  views: () => CombatantView[];
  /** Poz deneme savaşını başlatır. */
  startTestBattle: () => void;
}

/** Oturumluk ayarlar (menü yenilense de kalsın). */
const state = { hold: false, speed: 1, glow: '' as string, last: '', main: null as string | null, off: null as string | null };

const timers = new Set<ReturnType<typeof setTimeout>>();
const later = (ms: number, fn: () => void) => {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
};
const clearTimers = () => {
  for (const t of timers) clearTimeout(t);
  timers.clear();
};

/** Pozu gösterir; "Hold" kapalıysa süre sonunda boşta pozuna döner. */
function play(views: CombatantView[], pose: string): void {
  clearTimers();
  for (const v of views) v.showPose(pose);
  if (!state.hold) later(1400 / state.speed, () => views.forEach((v) => v.alive && v.showPose(null)));
}

/** Döngü pozu (spin): 3 tur, her kare 1/speed oranında. */
function cycle(views: CombatantView[], name: string): void {
  clearTimers();
  const frames = views[0]?.poseCycles()[name]?.length ?? 1;
  const step = 110 / state.speed;
  const total = frames * 3;
  for (let i = 0; i <= total; i++)
    later(i * step, () => {
      for (const v of views) {
        if (i === total) {
          if (!state.hold) v.showPose(null);
        } else v.cycleFrame(name, (i % frames) / frames + 0.001);
      }
    });
}

export function registerPosesPanel(debug: Pick<DebugMenu, 'registerPanel' | 'register'>, host: PosesHost): void {
  debug.register({
    id: 'battle.test-poses',
    icon: 'sword',
    tab: 'Setup',
    section: 'Test battles',
    label: 'Test poses (v2)',
    hint: 'Start a test battle with the 11 Pose Testers (hidden debug classes, one per class: Pose Tester I (Warrior) ... XI (Hexer)). Each holds free copies of the 4 real skills of its class, drawn with the new (v2) pose set, and its class weapon (Warrior: Dane Axe two-handed, Defender: mace + shield...). Test mode: no turn order. Pose picker and weapon / grip switches: Characters tab',
    run: () => host.startTestBattle(),
  });

  debug.registerPanel({
    id: 'panel.poses',
    tab: 'Characters',
    render: (el, refresh) => {
      el.append(debugHeading('Poses (v2)'));
      // gerçek sınıflar: v2 gövde + takılı silah (varsayılan) ya da eski tek görsel (karşılaştırma); bir sonraki savaştan geçerli
      const mode = poseRender();
      el.append(
        ...debugSection(
          'Real classes',
          debugButton('v2 poses', () => {
            setPoseRender('v2');
            refresh();
          }, { icon: 'team', on: mode === 'v2', title: 'Default: every playable class is drawn with its own v2 pose body and its equipped weapon (Quick Battle: the class default weapon)' }),
          debugButton('v1 render', () => {
            setPoseRender('v1');
            refresh();
          }, { icon: 'restart', on: mode === 'v1', title: 'Compare: the old look (one idle illustration + code motion; Warrior: its v1 poses). Mobs and summons are unchanged either way' }),
        ),
      );
      const applies = document.createElement('div');
      applies.className = 'debug-note dim';
      applies.textContent = 'Saved in this browser. Applies from the next battle (use Restart battle).';
      el.append(applies);
      el.append(...debugSection('Test battle', debugButton('Pose test battle', () => host.startTestBattle(), { icon: 'sword', title: 'All 11 Pose Testers (every class skill with the v2 poses) against two Warriors, test mode (no turn order)' })));
      const views = host.views();
      if (!views.length) {
        const n = document.createElement('div');
        n.className = 'debug-note dim';
        n.textContent = 'No unit uses the pose library in this battle. Start the Pose test battle, or any battle with a playable class (v2 poses).';
        el.append(n);
        return;
      }
      const note = document.createElement('div');
      note.className = 'debug-note dim';
      note.textContent = `Acting on ${views.length} unit${views.length > 1 ? 's' : ''} (Ctrl + click a unit to pick only that one). Real skill animations: cast any skill from the Skills tab.`;
      el.append(note);

      const first = views[0]!;
      const cycles = first.poseCycles();
      const inCycle = new Set(Object.values(cycles).flat());
      const poseBtns = first.poseList().map((p) =>
        debugButton(p, () => {
          state.last = p;
          play(host.views(), p);
          refresh();
        }, { icon: 'team', on: state.last === p, title: `Show the ${p} pose${inCycle.has(p) ? ' (one frame of a cycle)' : ''}` }),
      );
      const cycleBtns = Object.keys(cycles).map((c) =>
        debugButton(`${c} (cycle)`, () => {
          state.last = c;
          cycle(host.views(), c);
          refresh();
        }, { icon: 'whirlwind', on: state.last === c, title: `Play the ${cycles[c]!.join(' > ')} cycle three times (Reduced motion: key frame only)` }),
      );
      el.append(...debugSection('Pose', ...poseBtns, ...cycleBtns));
      el.append(
        ...debugSection(
          'Reactions',
          debugButton('Hit reaction', () => host.views().forEach((v) => v.hit(0.3)), { icon: 'burst', title: 'Play the hit reaction (no damage)' }),
          debugButton('Defeated', () => {
            clearTimers();
            host.views().forEach((v) => v.play('death'));
          }, { icon: 'skull', title: 'Show the defeated pose (no damage; the unit stays). Use Stand up to return.' }),
          debugButton('Stand up', () => {
            clearTimers();
            host.views().forEach((v) => v.showPose(null));
          }, { icon: 'boot', title: 'Back to the idle pose' }),
          debugButton('Hold pose', () => {
            state.hold = !state.hold;
            refresh();
          }, { icon: 'hourglass', on: state.hold, title: 'Keep the picked pose instead of returning to idle' }),
        ),
      );

      // gerçek item ile donat (tutuş item'den: Dane Axe / Avenger's Maul çift el takımını açar; kalkan / hançer ikinci ele)
      const cur = first.poseWeapon;
      const equip = (main: string | null, off: string | null) => {
        for (const v of host.views()) {
          const w = weaponItem(main ? { uid: 'debug', id: main } : null);
          const o = offhandItem(off ? { uid: 'debug-off', id: off } : null);
          const pick = weaponFor(v.combatant.defId, w, o);
          if (pick) v.setPoseWeapon(pick);
        }
        refresh();
      };
      // ana el ve ikinci el ayrı hatırlanır (biri değişince öteki kalır; çift el silah ikinci eli çizmez)
      const itemBtns = DEBUG_ITEMS.map(([id, off, label]) =>
        debugButton(label, () => {
          if (off) state.off = id;
          else state.main = id;
          equip(state.main, state.off);
        }, { icon: off ? 'guard2' : 'sword', on: off ? state.off === id : state.main === id, title: `${off ? 'Off-hand' : 'Main hand'}: ${itemDef(id)?.name ?? id} (grip from the item)` }),
      );
      itemBtns.push(debugButton('No off-hand', () => {
        state.off = null;
        equip(state.main, null);
      }, { icon: 'boot', title: 'Remove the off-hand item' }));
      el.append(...debugSection('Equip item', ...itemBtns));

      // görsel seçici: aile x görünüm (tutuş ailenin hold'u: büyük balta / gürz / asa çift el, yay, tılsım; kalkan yalnızca ikinci el)
      const weaponBtns = allWeapons()
        .filter((w) => POSES.weapons[w.family]?.hold !== 'offhand')
        .map((w) => {
          const hold = POSES.weapons[w.family]?.hold as Grip | undefined;
          return debugButton(`${w.family} ${w.look}`, () => {
            const pick: WeaponPick = { ...w, ...(state.glow ? { glow: state.glow } : {}), ...(hold && hold !== 'one' ? { grip: hold } : {}) };
            const offNow = host.views()[0]?.poseWeapon?.offhand;
            if (offNow && !hold) pick.offhand = offNow;
            host.views().forEach((v) => v.setPoseWeapon(pick));
            refresh();
          }, { icon: hold === 'two' ? 'charge' : 'sword', on: !!cur && cur.family === w.family && cur.look === w.look, title: `Draw the ${w.look} ${w.family} (${hold ?? 'one'}-handed set)` });
        });
      el.append(...debugSection('Weapon art', ...weaponBtns));
      const gripBtns = (['one', 'two'] as const).map((g) =>
        debugButton(g === 'one' ? 'One-handed set' : 'Two-handed set', () => {
          const w = host.views()[0]?.poseWeapon;
          if (w) host.views().forEach((v) => v.setPoseWeapon({ ...w, ...(g === 'two' ? { grip: 'two' as const } : { grip: undefined }) }));
          refresh();
        }, { icon: g === 'two' ? 'charge' : 'sword', on: (cur?.grip ?? 'one') === g, title: `Force the ${g === 'one' ? 'one' : 'two'}-handed pose set with the current weapon art (compare)` }),
      );
      el.append(...debugSection('Pose set', ...gripBtns));
      const glowBtns = [['', 'No glow'], ...Object.keys(POSES.rarityGlow).map((r) => [POSES.rarityGlow[r]!, r.charAt(0).toUpperCase() + r.slice(1)])].map(([hex, label]) =>
        debugButton(label!, () => {
          state.glow = hex!;
          const w = host.views()[0]?.poseWeapon;
          if (w) {
            const { glow: _g, ...rest } = w;
            host.views().forEach((v) => v.setPoseWeapon({ ...rest, ...(hex ? { glow: hex } : {}) }));
          }
          refresh();
        }, { icon: 'radiance', on: (cur?.glow ?? '') === hex, title: hex ? `Rarity glow: ${label}` : 'No rarity glow (Common / Uncommon)' }),
      );
      el.append(...debugSection('Rarity glow', ...glowBtns));

      // hız
      const row = document.createElement('label');
      row.className = 'debug-note';
      row.textContent = `Pose time / cycle speed: ${state.speed.toFixed(2)}x `;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0.25';
      range.max = '3';
      range.step = '0.25';
      range.value = String(state.speed);
      range.addEventListener('change', () => {
        state.speed = Number(range.value);
        refresh();
      });
      row.append(range);
      el.append(row);
    },
  });
}
