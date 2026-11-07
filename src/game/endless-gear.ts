import { woundCount } from '../progression/wounds';
import { allocateRun, respecRunBlocked, respecRunHeroTree, runTreeBlocked, setRunHeroTree, endlessWoundRules, bagOf, discardFromBag, endlessBagSize, equipBestRun, equipFromBag, fullEquipment, unequipToBag, moveEquippedRun, type EndlessRun } from '../endless';
import { openGear, type GearSource } from '../ui/gear-screen';

/**
 * Endless'ın Gear kaynağı (adaptör): seferin Gear ekranı (src/ui/gear-screen.ts) aynen kullanılır; işlemler src/endless/run.ts'in saf
 * torba fonksiyonlarıdır (silah ailesi, primary uyarısı, "Equip best" seferle aynı). `get` / `set` koşu durumunu okur / yazar (set = kayıt).
 */
export function endlessGearSource(get: () => EndlessRun, set: (r: EndlessRun) => void): GearSource {
  const apply = (fn: (r: EndlessRun) => EndlessRun): void => set(fn(get()));
  return {
    heroes: () => get().heroes.map((h) => ({ id: h.id, class: h.class, level: h.level ?? 1, xp: h.xp ?? 0, statPoints: h.statPoints ?? 0, skillPoints: h.skillPoints ?? 0, alloc: h.alloc ?? {}, ...(h.tree ? { tree: h.tree } : {}), ...(h.freeRespec ? { freeRespec: true } : {}), ...(h.treeReset ? { treeReset: true } : {}), hpRatio: h.hpRatio, ...(woundCount(h) > 0 ? { wounds: woundCount(h), woundCfg: { rules: endlessWoundRules(), town: false } } : {}), equipment: fullEquipment(h) })),
    bag: () => bagOf(get()),
    bagSize: endlessBagSize(),
    gold: () => get().gold,
    equip: (heroId, uid, slot) => apply((r) => equipFromBag(r, heroId, uid, slot)),
    unequip: (heroId, slot) => apply((r) => unequipToBag(r, heroId, slot)),
    move: (heroId, from, to) => apply((r) => moveEquippedRun(r, heroId, from, to)),
    discard: (uid) => apply((r) => discardFromBag(r, uid)),
    equipBest: (ids) => apply((r) => equipBestRun(r, ids)),
    emptyText: 'The bag is empty. Rewards and the merchant bring new gear.',
    allocate: (heroId, add) => apply((r) => allocateRun(r, heroId, add)),
    // Skill ağacı onayı (Faz 1b kaynak bağlantısı; ekranı Faz 3b)
    setTree: (heroId, alloc) =>
      apply((r) => {
        const why = runTreeBlocked(r, heroId, alloc);
        if (why) throw new Error(why);
        return setRunHeroTree(r, heroId, alloc);
      }),
    respecTree: (heroId) =>
      apply((r) => {
        const why = respecRunBlocked(r, heroId);
        if (why) throw new Error(why);
        return respecRunHeroTree(r, heroId);
      }),
  };
}

/** Kamp ekranından Gear'ı açar (DOM katmanı; kapanınca `onClose`). */
export function openEndlessGear(root: HTMLElement, get: () => EndlessRun, set: (r: EndlessRun) => void, onClose: () => void, hero?: string, view?: 'char' | 'inv'): () => void {
  return openGear(root, endlessGearSource(get, set), { hero, onClose, ...(view ? { view } : {}) });
}
