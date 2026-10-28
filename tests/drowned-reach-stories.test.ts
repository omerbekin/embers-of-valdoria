import { describe, expect, it } from 'vitest';
import { STORIES, completeStory, debugJumpDrownedReach, debugTeleport, epilogueUnlocksValor, newCampaign, nextStep, storyGiftNote, storyLiked, storyLikes } from '../src/campaign';

// Harita 2 hikâye zincirleri Harita 1 standardında (open-questions 450): 3 adım, orta adım 3 seçenek, hediye satırı NPC'nin zamiriyle.
const MAP2 = ['dr_the_ferryman', 'dr_weir_warden', 'dr_harbor_master', 'dr_keepers_daughter'];

describe('Map 2 story chains', () => {
  it.each(MAP2)('%s has 3 steps (2/3/2 choices) and keeps its Common gift', (id) => {
    const d = STORIES[id]!;
    expect(d.dialogue!.map((st) => st.choices.length)).toEqual([2, 3, 2]);
    expect(d.likeThreshold).toBe(2);
    expect(d.gift).toEqual({ rarity: 'common' });
    const yes = d.dialogue!.map((st) => st.choices.findIndex((c) => c.likes));
    const no = d.dialogue!.map((st) => st.choices.findIndex((c) => !c.likes));
    expect(storyLikes(id, yes)).toBe(3);
    expect(storyLikes(id, no)).toBe(0);
    expect(storyLiked(id, [yes[0]!, yes[1]!, no[2]!])).toBe(true);
    expect(storyLiked(id, [yes[0]!, no[1]!, no[2]!])).toBe(false);
  });

  it('the gift line uses the NPC pronoun (default He)', () => {
    expect(storyGiftNote(STORIES.dr_weir_warden!)).toBe('She presses a small bundle into your hands.');
    expect(storyGiftNote(STORIES.dr_keepers_daughter!)).toBe('She presses a small bundle into your hands.');
    expect(storyGiftNote(STORIES.dr_the_ferryman!)).toBe('He presses a small bundle into your hands.');
    expect(storyGiftNote(STORIES.dr_harbor_master!)).toBe('He presses a small bundle into your hands.');
    expect(storyGiftNote(STORIES.ash_on_the_wind!)).toMatch(/^He /);
  });
  // Sonsöz (open-questions 450, Ömer 2026-10-28 "yazılsın"): yalnız kapanış metni; Valor dersi ayrı `valorLesson` bayrağında (yalnız Keep Commander)
  it.each(MAP2)('%s has a closing epilogue page that does not unlock Valor', (id) => {
    const d = STORIES[id]!;
    expect(d.epilogue?.title).toBeTruthy();
    const words = d.epilogue!.text.split(/\s+/).length;
    expect(words).toBeGreaterThan(70);
    expect(words).toBeLessThan(140);
    expect(d.valorLesson).toBeUndefined();
    expect(epilogueUnlocksValor(d)).toBe(false);
  });

  it('only the Keep Commander epilogue carries the Valor lesson', () => {
    expect(epilogueUnlocksValor(STORIES.the_wardens_oath!)).toBe(true);
    const flagged = Object.entries(STORIES).filter(([, d]) => epilogueUnlocksValor(d)).map(([id]) => id);
    expect(flagged).toEqual(['the_wardens_oath']);
  });

  it('finishing a Map 2 story (liked, with its epilogue) leaves a locked Valor locked', () => {
    const map2 = debugJumpDrownedReach(newCampaign({ mode: 'normal', seed: 77 }));
    const s = debugTeleport(map2, 'dr12');
    delete s.valor;
    const step = nextStep(s);
    expect(step.kind).toBe('story');
    const yes = STORIES.dr_the_ferryman!.dialogue!.map((st) => st.choices.findIndex((c) => c.likes));
    expect(completeStory(s, yes).valor).toBeUndefined();
  });
});
