/**
 * Debug > Characters > Poses (Ömer 2026-10-11, Warrior poz denemesi): poz kütüphanesini (src/game/poses.ts) gerçek savaşta denemek için.
 *  - "Pose test battle": test modunda (sıra yok) oyuncu tarafında gizli test class'ları Pose Tester I / II (data/classes/pose_tester_*.json:
 *    başka sınıfların gerçek skill'lerinin bedelsiz, ~1 hasarlı kopyaları; her skill tek poz), düşmanda pozlu Warrior'lar + rakipler.
 *  - Poz seçici: Ctrl+tık seçili (yoksa tüm) pozlu birimlerde her pozu / döngüyü oynatır; isabet tepkisi, diz çökme, kalk.
 *  - Silah seçici (aile x görünüm + nadirlik ışıltısı) ve poz süresi / döngü hızı kaydırıcısı.
 * Warrior skill'leri (Double Strike, Whirlwind, Charge, Abyssal Cry) gerçek animasyonlarıyla Skills sekmesinden ya da savaşta normalce atılır.
 * Sahneye yalnızca verilen host üzerinden dokunur.
 */
import type { CombatantView } from '../game/combatant-view';
import { POSES, allWeapons, type WeaponPick } from '../game/poses';
import { debugButton, debugHeading, debugSection, type DebugMenu } from './debug-menu';

export interface PosesHost {
  /** Açık savaşın pozlu birimleri (seçili olanlar ya da hepsi); savaş yoksa boş. */
  views: () => CombatantView[];
  /** Poz deneme savaşını başlatır. */
  startTestBattle: () => void;
}

/** Oturumluk ayarlar (menü yenilense de kalsın). */
const state = { hold: false, speed: 1, glow: '' as string, last: '' };

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
    label: 'Test Warrior poses',
    hint: 'Start a test battle with Pose Tester I and II (hidden debug classes drawn with the Warrior pose library and weapon layer). Their skills are free copies of real skills from other classes (Saltire Cut, Tremor Slam, Whirlwind, Charge, Judgment, Wail of the Dead, Quick Shot, Guard), each playing one pose; enemies include posed Warriors with ornate weapons. Test mode: no turn order. Pose picker: Characters tab',
    run: () => host.startTestBattle(),
  });

  debug.registerPanel({
    id: 'panel.poses',
    tab: 'Characters',
    render: (el, refresh) => {
      el.append(debugHeading('Poses (Warrior trial)'));
      el.append(...debugSection('Test battle', debugButton('Pose test battle', () => host.startTestBattle(), { icon: 'sword', title: 'Pose Tester I and II (one pose per skill) against posed Warriors, test mode (no turn order)' })));
      const views = host.views();
      if (!views.length) {
        const n = document.createElement('div');
        n.className = 'debug-note dim';
        n.textContent = 'No unit uses the pose library in this battle. Start the Pose test battle, or a battle with a Warrior.';
        el.append(n);
        return;
      }
      const note = document.createElement('div');
      note.className = 'debug-note dim';
      note.textContent = `Acting on ${views.length} unit${views.length > 1 ? 's' : ''} (Ctrl + click a unit to pick only that one). Real skill animations: cast Double Strike / Whirlwind / Charge / Abyssal Cry from the Skills tab.`;
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

      // silah seçici
      const cur = first.poseWeapon;
      const weaponBtns = allWeapons().map((w) =>
        debugButton(`${w.family === 'swords' ? 'Sword' : w.family === 'axes' ? 'Axe' : w.family} ${w.look}`, () => {
          const pick: WeaponPick = { ...w, ...(state.glow ? { glow: state.glow } : {}) };
          host.views().forEach((v) => v.setPoseWeapon(pick));
          refresh();
        }, { icon: w.family === 'axes' ? 'charge' : 'sword', on: !!cur && cur.family === w.family && cur.look === w.look, title: `Draw the ${w.look} ${w.family.replace(/s$/, '')}` }),
      );
      el.append(...debugSection('Weapon', ...weaponBtns));
      const glowBtns = [['', 'No glow'], ...Object.keys(POSES.rarityGlow).map((r) => [POSES.rarityGlow[r]!, r.charAt(0).toUpperCase() + r.slice(1)])].map(([hex, label]) =>
        debugButton(label!, () => {
          state.glow = hex!;
          const w = host.views()[0]?.poseWeapon;
          if (w) host.views().forEach((v) => v.setPoseWeapon({ family: w.family, look: w.look, ...(hex ? { glow: hex } : {}) }));
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
