import { afterEach, describe, expect, it } from 'vitest';
import { STORIES, type DialogueStep } from '../src/campaign/data';
import { dialogueAdvance, dialogueStart, type DialoguePage } from '../src/campaign/dialogue-flow';
import { storyLiked, storyLikes } from '../src/campaign/state';

/** Yalnız test verisi: gerçek metinler Ömer görmeden data'ya girmez (docs/design/dialogue-replies-draft.md). */
const steps: DialogueStep[] = [
  { text: 'First?', choices: [{ label: 'Kind', likes: true, reply: 'Reply to kind.' }, { label: 'Rude' }] },
  { text: 'Second?', choices: [{ label: 'Plain', likes: true }, { label: 'Blank', reply: '   ' }] },
  { text: 'Last?', choices: [{ label: 'Kind', likes: true, reply: 'Reply before the ending.' }, { label: 'Rude' }] },
];

/** Cevapları sırayla oynatır; reply sayfasında Continue'ya (0) basar, gezilen sayfaları döner. */
function play(picks: number[], data = steps): { pages: DialoguePage[]; answers: number[] } {
  const answers: number[] = [];
  let page = dialogueStart(data);
  const pages = [page];
  const queue = [...picks];
  while (page.kind !== 'end') {
    page = dialogueAdvance(data, page, page.kind === 'reply' ? 0 : queue.shift()!, answers);
    pages.push(page);
  }
  return { pages, answers };
}

describe('dialogue reply page', () => {
  afterEach(() => {
    delete STORIES['__reply_fixture'];
  });

  it('shows the reply between the pick and the next step', () => {
    expect(play([0, 0, 0]).pages).toEqual([
      { kind: 'step', at: 0 },
      { kind: 'reply', at: 0, text: 'Reply to kind.' },
      { kind: 'step', at: 1 },
      { kind: 'step', at: 2 },
      { kind: 'reply', at: 2, text: 'Reply before the ending.' },
      { kind: 'end' },
    ]);
  });

  it('a choice without reply goes straight to the next step, exactly as before', () => {
    expect(play([1, 0, 1]).pages.map((p) => p.kind)).toEqual(['step', 'step', 'step', 'end']);
  });

  it('a blank reply counts as no reply', () => {
    expect(play([1, 1, 1]).pages.map((p) => p.kind)).toEqual(['step', 'step', 'step', 'end']);
  });

  it('the reply Continue is not an answer: one answer per step, like count unchanged', () => {
    const { answers } = play([0, 0, 1]);
    expect(answers).toEqual([0, 0, 1]);
    STORIES['__reply_fixture'] = { title: 'T', text: '', dialogue: steps, likeThreshold: 2 };
    expect(storyLikes('__reply_fixture', answers)).toBe(2);
    expect(storyLiked('__reply_fixture', answers)).toBe(true);
    const plain = steps.map((st) => ({ ...st, choices: st.choices.map(({ label, likes }) => ({ label, ...(likes ? { likes } : {}) })) }));
    STORIES['__reply_fixture'] = { title: 'T', text: '', dialogue: plain, likeThreshold: 2 };
    expect(storyLikes('__reply_fixture', answers)).toBe(2);
    expect(storyLiked('__reply_fixture', play([1, 1, 0]).answers)).toBe(false);
  });

  it('the end page stays the end and an empty dialogue ends at once', () => {
    const answers: number[] = [];
    expect(dialogueAdvance(steps, { kind: 'end' }, 0, answers)).toEqual({ kind: 'end' });
    expect(answers).toEqual([]);
    expect(dialogueStart([])).toEqual({ kind: 'end' });
  });

  it('any reply in the real data is a short, non-empty line with no em dash', () => {
    for (const [id, def] of Object.entries(STORIES))
      for (const st of def.dialogue ?? [])
        for (const c of st.choices) {
          if (c.reply === undefined) continue;
          expect(c.reply.trim().length, `${id}: ${c.label}`).toBeGreaterThan(0);
          expect(c.reply.length, `${id}: ${c.label}`).toBeLessThanOrEqual(200);
          expect(c.reply, `${id}: ${c.label}`).not.toContain('\u2014');
        }
  });
});
