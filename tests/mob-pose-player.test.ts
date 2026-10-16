import { describe, expect, it } from 'vitest';
import { MOB_POSES, MobPosePlayer, mobPoseFrame, type MobPoseSkill } from '../src/game/mob-poses';
import { content } from '../src/engine';
import { bosses, mobs } from '../src/engine/content';

// 0.8.2.3: Bandit Chief alan skill'inden sonra vuruş karesinde donup kalıyordu. Her poz sayfalı birim, her skill ve kare isteği sırasında
// sonunda boşta döngüsüne dönmeli.
function rig(id: string) {
  const def = MOB_POSES[id]!;
  let t = 0;
  let timers: Array<{ at: number; fn: () => void }> = [];
  const state = { looping: true, frame: def.idle[0]!, alive: true };
  const player = new MobPosePlayer(
    def,
    {
      loop: () => void (state.looping = true),
      frame: (n) => {
        state.looping = false;
        state.frame = n;
      },
      alive: () => state.alive,
      now: () => t,
      after: (ms, fn) => void timers.push({ at: t + ms, fn }),
    },
    { hitMs: 530, lateMs: 300, endMs: 384, dyingMs: 456 },
  );
  const advance = (ms: number): void => {
    const end = t + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > end) break;
      timers = timers.slice(1);
      t = next.at;
      next.fn();
    }
    t = end;
  };
  return { def, player, state, advance };
}

const skillOf = (id: string): MobPoseSkill => {
  const s = content.skills[id]!;
  return { id, ...(s.motion ? { motion: s.motion } : {}), target: s.target };
};

const ids = Object.keys(MOB_POSES);
const mobSkills = (spriteId: string): string[] => {
  const out = new Set<string>();
  for (const e of [...Object.values(mobs), ...Object.values(bosses)]) if (e.spriteId === spriteId) for (const s of e.skills ?? []) out.add(s);
  return [...out].filter((s) => content.skills[s]);
};

describe('MobPosePlayer', () => {
  it('has pose-sheet mobs to test', () => {
    expect(ids).toContain('bandit_chief');
  });

  for (const id of ids) {
    const skills = mobSkills(id);
    const list = skills.length ? skills : ['__none'];
    for (const sk of list) {
      const skill = sk === '__none' ? { target: 'area_enemies' } : skillOf(sk);
      const sequences: Array<[string, (p: ReturnType<typeof rig>) => void]> = [
        ['plain', ({ player, advance }) => {
          player.useSkill(skill);
          player.play('cast');
          advance(200);
          player.play('attack');
          advance(100);
          player.useSkill(null);
        }],
        ['effect tail idle after skill end', ({ player, advance }) => {
          player.useSkill(skill);
          player.play('attack');
          player.useSkill(null);
          advance(50);
          player.play('idle');
        }],
        ['hit after skill end', ({ player, advance }) => {
          player.useSkill(skill);
          player.play('attack');
          player.useSkill(null);
          advance(100);
          player.play('hit');
        }],
        ['late attack after skill end', ({ player, advance }) => {
          player.useSkill(skill);
          player.play('attack');
          player.useSkill(null);
          advance(100);
          player.play('hit');
          advance(50);
          player.play('attack');
        }],
        ['hit during skill', ({ player, advance }) => {
          player.useSkill(skill);
          player.play('attack');
          player.play('hit', 900);
          advance(100);
          player.useSkill(null);
        }],
      ];
      for (const [name, run] of sequences)
        it(`${id} ${sk}: ${name} returns to idle loop`, () => {
          const r = rig(id);
          run(r);
          r.advance(5000);
          expect(r.state.looping).toBe(true);
          expect(r.player.skill).toBeNull();
        });
    }

    it(`${id}: death stays on the dead frame`, () => {
      const r = rig(id);
      r.player.useSkill({ target: 'single_enemy' });
      r.player.play('attack');
      r.player.play('death');
      r.state.alive = false;
      r.player.useSkill(null);
      r.advance(5000);
      expect(r.state.looping).toBe(false);
      expect(r.state.frame).toBe(r.def.dead);
    });
  }

  it('skill frame is held while the skill plays', () => {
    const r = rig('bandit_chief');
    r.player.useSkill({ target: 'area_enemies' });
    r.player.play('attack');
    r.player.play('idle');
    r.advance(3000);
    expect(r.state.looping).toBe(false);
    expect(r.state.frame).toBe(mobPoseFrame(r.def, 'attack', { target: 'area_enemies' }));
  });
});
