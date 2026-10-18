import { describe, expect, it } from 'vitest';
import {
  ENCOUNTERS,
  EVENTS,
  STORIES,
  autoResolve,
  battlePlan,
  campaignStock,
  chooseEvent,
  completeSimple,
  completeStory,
  debugTeleport,
  eventChoices,
  isFallen,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  openCampaignShop,
  restAtCamp,
  restHealOf,
  storyLiked,
  storyLikes,
  type CampaignState,
} from '../src/campaign';
import { BAG_SIZE, ITEMS, makeItem } from '../src/progression';

// Seçenekli olaylar (N2), kasaba tüccarı (T1), kasaba sahnesi + diyalog (T5; sis açma YOK). fill-plan.md 4.2 ve 5.

const base = (): CampaignState => newCampaign({ mode: 'normal', seed: 4242 });

/** Düğüme ışınlan ve oyuncu adımlarını `until` gelene kadar otomatik çöz. */
function at(target: string, until: string): CampaignState {
  let s = debugTeleport(base(), target);
  for (let i = 0; i < 20 && nextStep(s).kind !== until; i++) s = autoResolve(s);
  expect(nextStep(s).kind).toBe(until);
  return s;
}

describe("Witch's Hut choice event", () => {
  const atHut = (): CampaignState => at('6A', 'event');

  it('offers the four designed choices after the guard battle', () => {
    expect(eventChoices('witchs_hut').map((c) => c.id)).toEqual(['pay', 'blood', 'steal', 'leave']);
  });

  it('Pay her price costs gold and opens the chest; blocked without gold', () => {
    const s = atHut();
    expect(() => chooseEvent({ ...s, gold: 10 }, 'pay')).toThrow(/gold/);
    const rich = { ...s, gold: 500, pendingLoot: undefined };
    const t = chooseEvent(rich, 'pay');
    // Küçük sandık (Ömer 2026-10-12): tek item + 20-30 altın, kartta görünür
    expect(t.inventory.length).toBe(rich.inventory.length + 1);
    expect(t.pendingLoot?.kind).toBe('treasure');
    expect(t.pendingLoot?.items.length).toBe(1);
    expect(t.pendingLoot?.gold).toBeGreaterThanOrEqual(20);
    expect(t.pendingLoot?.gold).toBeLessThanOrEqual(30);
    expect(t.gold).toBe(rich.gold - 60 + t.pendingLoot!.gold);
    expect(nextStep(t).kind).toBe('move');
  });

  it('Pay in blood takes 20% of current HP from every living hero, nobody dies, no gold spent', () => {
    let s = atHut();
    s = { ...s, pendingLoot: undefined, roster: s.roster.map((h, i) => ({ ...h, hpRatio: i === 0 ? 0.001 : 0.5 })) };
    const t = chooseEvent(s, 'blood');
    expect(t.gold - (t.pendingLoot?.gold ?? 0)).toBe(s.gold);
    expect(t.pendingLoot?.items.length).toBe(1);
    expect(t.pendingLoot?.gold).toBeGreaterThanOrEqual(20);
    expect(t.pendingLoot?.gold).toBeLessThanOrEqual(30);
    t.roster.forEach((h, i) => {
      expect(isFallen(h)).toBe(false);
      expect(h.hpRatio).toBeCloseTo(i === 0 ? 0.001 : 0.4, 3);
    });
    expect(t.pendingLoot).toBeTruthy();
  });

  it('Steal starts a battle from the event; winning grants the chest and gold and ends the event', () => {
    const s = atHut();
    const t = chooseEvent(s, 'steal');
    const step = nextStep(t);
    expect(step.kind).toBe('battle');
    const enc = step.kind === 'battle' ? step.encounter : '';
    expect(ENCOUNTERS[enc]).toBeTruthy();
    expect(battlePlan(t).encounterId).toBe(enc);
    const won = autoResolve(t);
    expect(won.eventChoice?.battle).toBeUndefined();
    expect(nextStep(won).kind).toBe('move');
    expect(won.gold).toBeGreaterThanOrEqual(s.gold + 25);
    expect(won.pendingLoot?.kind).toBe('treasure');
  });

  it('Leave does nothing; the legacy one-click completion still works (sim / auto)', () => {
    const s = atHut();
    const t = chooseEvent(s, 'leave');
    expect(t.gold).toBe(s.gold);
    expect(t.inventory.length).toBe(s.inventory.length);
    expect(nextStep(t).kind).toBe('move');
    expect(nextStep(completeSimple(s, 'event')).kind).toBe('move');
  });

  it('a choice whose battle encounter does not exist yet is hidden', () => {
    const fold = eventChoices('shepherds_fold').map((c) => c.id);
    const expected = ENCOUNTERS.fold_flock ? ['search', 'castle', 'bread', 'rest'] : ['castle', 'bread', 'rest'];
    expect(fold).toEqual(expected);
  });
});

describe("Shepherd's Fold choice event", () => {
  const atFold = (): CampaignState => {
    const s = at('fold', 'event');
    return { ...s, gold: 200, roster: s.roster.map((h) => ({ ...h, hpRatio: 0.2 })) };
  };

  it('Share your bread: pay 40 gold, the rest heals 100%', () => {
    const s = atFold();
    const t = chooseEvent(s, 'bread');
    expect(t.gold).toBe(160);
    expect(nextStep(t).kind).toBe('rest');
    expect(restHealOf(t)).toBe(1);
    const r = restAtCamp(t);
    r.roster.filter((h) => !isFallen(h)).forEach((h) => expect(h.hpRatio).toBe(1));
  });

  it('Ask about the castle is story text only, then the normal 50% rest', () => {
    const s = atFold();
    const t = chooseEvent(s, 'castle');
    expect(EVENTS.shepherds_fold!.choices!.find((c) => c.id === 'castle')!.result).toMatch(/Cinder Knights/);
    expect(t.gold).toBe(s.gold);
    expect(restHealOf(t)).toBe(0.5);
    const r = restAtCamp(t);
    r.roster.filter((h) => !isFallen(h)).forEach((h) => expect(h.hpRatio).toBeCloseTo(0.7, 3));
  });

  it('the rest override does not leak past the node', () => {
    let t = restAtCamp(chooseEvent(atFold(), 'bread'));
    t = moveTo(t, 'head');
    expect(t.eventChoice).toBeUndefined();
  });
});

describe('Town merchant (T1)', () => {
  it('Ashford and Valdren Keep open Odo during the town step: small stock and big stock', () => {
    const ash = at('4', 'town');
    const val = at('7', 'town');
    expect(campaignStock(ash).length).toBe(5);
    expect(campaignStock(val).length).toBe(9);
    const opened = openCampaignShop(ash);
    expect(opened.shop?.node).toBe('4');
    // Leave kapatır; adım yapısı değişmez
    const left = completeSimple(opened, 'town');
    expect(left.shop).toBeUndefined();
  });

  it('towns still heal the living fully on arrival; the fallen stay down (TUR 1 madde 10: only Valor revives)', () => {
    let s = autoResolve(at('5B', 'battle'));
    s = { ...s, roster: s.roster.map((h, i) => ({ ...h, hpRatio: i === 0 ? 0 : 0.3, alive: i !== 0 })) };
    const t = moveTo(s, '7');
    t.roster.forEach((h, i) => {
      expect(h.alive).toBe(i !== 0);
      expect(h.hpRatio).toBe(i === 0 ? 0 : 1);
    });
  });
});

describe('Town story scenes (T5)', () => {
  it('each town plays its scene once before the town actions; no fog reveal', () => {
    const s = at('7', 'story');
    expect(nextStep(s)).toMatchObject({ kind: 'story', story: 'the_wardens_oath' });
    const t = completeStory(s);
    expect(nextStep(t).kind).toBe('town');
    expect(Object.keys(t).filter((k) => /fog|reveal/i.test(k))).toEqual([]);
  });

  it('older saves already past the town step do not replay the scene', () => {
    const s = at('7', 'town');
    const legacy = { ...s, done: s.done.filter((d) => d !== '7:story').concat('7:town') };
    expect(nextStep(normalizeState(JSON.parse(JSON.stringify(legacy)))!).kind).not.toBe('story');
  });

  it('Ashford is a dialogue with 3 questions; the like count decides the gift', () => {
    const d = STORIES.ash_on_the_wind!;
    expect(d.dialogue!.length).toBe(3);
    const kind = d.dialogue!.map((st) => st.choices.findIndex((c) => c.likes));
    const rude = d.dialogue!.map((st) => st.choices.findIndex((c) => !c.likes));
    expect(storyLikes('ash_on_the_wind', kind)).toBe(3);
    expect(storyLikes('ash_on_the_wind', rude)).toBe(0);
    expect(storyLiked('ash_on_the_wind', [kind[0]!, kind[1]!, rude[2]!])).toBe(true); // 2/3
    expect(storyLiked('ash_on_the_wind', [kind[0]!, rude[1]!, rude[2]!])).toBe(false); // 1/3
    expect(() => storyLikes('ash_on_the_wind', [0])).toThrow();
  });

  it('liked: exactly one Common item at the node item level; disliked: nothing', () => {
    const s = { ...at('4', 'story'), pendingLoot: undefined };
    const d = STORIES.ash_on_the_wind!;
    const kind = d.dialogue!.map((st) => st.choices.findIndex((c) => c.likes));
    const rude = d.dialogue!.map((st) => st.choices.findIndex((c) => !c.likes));
    const liked = completeStory(s, kind);
    expect(liked.inventory.length).toBe(s.inventory.length + 1);
    const gift = liked.inventory[liked.inventory.length - 1]!;
    expect(gift.rolls?.rarity).toBe('common');
    expect(liked.pendingLoot?.items).toEqual([gift.uid]);
    expect(nextStep(liked).kind).toBe('town');
    // aynı seed = aynı hediye
    expect(completeStory(s, kind).inventory.at(-1)).toEqual(gift);
    const cold = completeStory(s, rude);
    expect(cold.inventory.length).toBe(s.inventory.length);
    expect(cold.pendingLoot).toBeUndefined();
    expect(nextStep(cold).kind).toBe('town');
  });

  it('Valdren Keep is a persuasion dialogue: 2 of 3 convincing answers earn a Bridge Warden hint, no item', () => {
    const d = STORIES.the_wardens_oath!;
    expect(d.dialogue!.length).toBe(3);
    expect(d.gift).toBeUndefined();
    expect(d.liked).toMatch(/chain/i);
    const yes = d.dialogue!.map((st) => st.choices.findIndex((c) => c.likes));
    const no = d.dialogue!.map((st) => st.choices.findIndex((c) => !c.likes));
    expect(storyLikes('the_wardens_oath', yes)).toBe(3);
    expect(storyLikes('the_wardens_oath', no)).toBe(0);
    expect(storyLiked('the_wardens_oath', [no[0]!, yes[1]!, yes[2]!])).toBe(true); // 2/3
    expect(storyLiked('the_wardens_oath', [yes[0]!, no[1]!, no[2]!])).toBe(false); // 1/3
    const s = { ...at('7', 'story'), pendingLoot: undefined };
    const t = completeStory(s, yes);
    expect(t.inventory.length).toBe(s.inventory.length);
    expect(t.pendingLoot).toBeUndefined();
    expect(nextStep(t).kind).toBe('town');
  });

  it('liked: the gift is labelled as a gift on the Spoils card (no gold)', () => {
    const s = { ...at('4', 'story'), pendingLoot: undefined };
    const kind = STORIES.ash_on_the_wind!.dialogue!.map((st) => st.choices.findIndex((c) => c.likes));
    const t = completeStory(s, kind);
    expect(t.pendingLoot?.gift).toBe(true);
    expect(t.pendingLoot?.gold).toBe(0);
  });

  it('liked with a full bag: the gift waits on the Spoils card as left behind', () => {
    const s0 = at('4', 'story');
    const filler = ITEMS.items[0]!.id;
    const full = { ...s0, pendingLoot: undefined, inventory: Array.from({ length: BAG_SIZE }, (_, i) => ({ ...makeItem(filler, `f${i}`, { int: () => 0 }) })) };
    const kind = STORIES.ash_on_the_wind!.dialogue!.map((st) => st.choices.findIndex((c) => c.likes));
    const t = completeStory(full, kind);
    expect(t.inventory.length).toBe(BAG_SIZE);
    expect(t.pendingLoot?.left?.length).toBe(1);
    expect(t.pendingLoot?.leftRolls?.[0]?.rarity).toBe('common');
  });
});
