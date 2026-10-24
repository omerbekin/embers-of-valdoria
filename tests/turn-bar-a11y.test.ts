import { describe, expect, it } from 'vitest';
import { queueCellLabel, type HudQueueCell } from '../src/ui/battle-hud';

// B9 (playtest 2026-10-23): sıra çubuğu hücreleri yalnızca portreydi (alt=""), erişilebilirlik ağacında boş görünüyordu.
describe('sıra çubuğu erişilebilir adı', () => {
  const cell = (o: Partial<HudQueueCell> = {}): HudQueueCell => ({
    uid: 'party-0',
    avatarUrl: '',
    enemy: false,
    flip: false,
    state: 'now',
    tip: { title: 'Warrior', badge: 'Ally', rows: [{ text: 'Acting now' }] },
    ...o,
  });

  it('ad + taraf + ne zaman', () => {
    expect(queueCellLabel(cell())).toBe('Warrior, Ally, Acting now');
  });

  it('rozet (Elite / x2) da okunur', () => {
    expect(queueCellLabel(cell({ enemy: true, state: 'next', tag: { text: 'Elite', color: '#fff' }, tip: { title: 'Bandit Chief', badge: 'Enemy', rows: [{ text: 'Acts in 2 turns' }] } }))).toBe(
      'Bandit Chief, Enemy, Elite, Acts in 2 turns',
    );
  });
});
