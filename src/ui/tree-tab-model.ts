// Gear > Tree sekmesinin DOM'suz mantığı (Faz 3b; plan docs/design/skill-tree-implementation.md, görünüm public/mockups/skill-tree-gear.html#v4).
// Kuralları kendisi yazmaz: src/progression/skill-tree.ts (check / untake / status / evoState) ve skill-tree-hero.ts (respec bedeli, onay
// kontrolü) çağrılır. Burada yalnızca ekran durumu var: onaylı dağılım + BEKLEYEN puanlar (stat sayfası gibi: tık +1 bekleyen, sağ tık / uzun
// basış -1 bekleyen, Reset siler, Confirm kaynağa yazar; onaylı puan yalnızca respec ile geri gelir).
import {
  check,
  counter,
  emptyAlloc,
  evoState,
  free,
  rankOf,
  spent,
  status,
  treeNodes,
  untake,
  ultArm,
  type TreeAlloc,
  type TreeBlock,
  type TreeNode,
} from '../progression/skill-tree';
import { treeChangeBlocked, heroRespecCost, respecBlocked, type TreeHero } from '../progression/skill-tree-hero';
import { TREE_RULES, treeOf, type TreeData, type TreeRules } from '../progression/skill-tree-data';

/** Ekran durumu: kahramanın ağacı + onaylı dağılım + bekleyen puanlar (anahtar -> +rank). */
export interface TreeSession {
  tree: TreeData;
  level: number;
  confirmed: TreeAlloc;
  pending: Record<string, number>;
}

const levelOf = (h: Pick<TreeHero, 'level'>): number => Math.max(1, Math.floor(h.level ?? 1));

/** Kahramandan oturum (ağacı olmayan class: undefined). Bekleyen puan boş başlar. */
export function makeSession(h: TreeHero): TreeSession | undefined {
  const tree = treeOf(h.class);
  if (!tree) return undefined;
  return { tree, level: levelOf(h), confirmed: h.tree ? { v: h.tree.v, r: { ...h.tree.r } } : emptyAlloc(tree), pending: {} };
}

/** Etkin dağılım = onaylı + bekleyen (kurallar bunun üstünde denetlenir: bekleyen ult puanı geri alınınca kollar yeniden serbest). */
export function effective(s: TreeSession): TreeAlloc {
  const r = { ...s.confirmed.r };
  for (const k in s.pending) r[k] = (r[k] ?? 0) + s.pending[k]!;
  return { v: s.confirmed.v, r };
}

export function pendingCount(s: TreeSession): number {
  let n = 0;
  for (const k in s.pending) n += s.pending[k]!;
  return n;
}

/** Harcanmamış puan (bekleyenler düşülmüş): havuz - onaylı - bekleyen. */
export const freePoints = (s: TreeSession): number => free(s.level, effective(s));

export type StepResult = { ok: true } | { ok: false; reason: string; block?: TreeBlock };

/** Tık: +1 bekleyen puan (kural reddederse neden, durum değişmez). */
export function addPending(s: TreeSession, key: string, rules: TreeRules = TREE_RULES): StepResult {
  const b = check(s.tree, s.level, effective(s), key, {}, rules);
  if (b) return { ok: false, reason: b.text, block: b };
  s.pending[key] = (s.pending[key] ?? 0) + 1;
  return { ok: true };
}

/** Sağ tık / uzun basış: -1 BEKLEYEN puan (onaylı puan için respec). Bağımlıyı bozuyorsa "Needed by X". */
export function removePending(s: TreeSession, key: string, rules: TreeRules = TREE_RULES): StepResult {
  if (!((s.pending[key] ?? 0) > 0)) return { ok: false, reason: rankOf(s.confirmed, key) > 0 ? 'Confirmed points need a respec' : 'Nothing to remove' };
  const res = untake(s.tree, s.level, effective(s), key, rules);
  if (!res.ok) return { ok: false, reason: res.reason };
  const n = s.pending[key]! - 1;
  if (n > 0) s.pending[key] = n;
  else delete s.pending[key];
  return { ok: true };
}

export function resetPending(s: TreeSession): void {
  s.pending = {};
}

/** Confirm'in kaynağa göndereceği TAM dağılım (onaylı + bekleyen). */
export const confirmAlloc = (s: TreeSession): TreeAlloc => effective(s);

/** Confirm yapılabilir mi (yoksa null): bekleyen puan var ve kahramanın kayıt kuralı (skill-tree-hero.ts > treeChangeBlocked) kabul ediyor. */
export function confirmBlocked(h: TreeHero, s: TreeSession, rules: TreeRules = TREE_RULES): string | null {
  if (!pendingCount(s)) return 'No pending points';
  return treeChangeBlocked(h, effective(s), rules);
}

/** Düğümün arayüz durumu (etkin dağılım üstünden). */
export const nodeStatus = (s: TreeSession, key: string, rules: TreeRules = TREE_RULES) => status(s.tree, s.level, effective(s), key, rules);

/** Respec bilgisi: bedel (bedava hakkı varsa 0), onaylı puan sayısı, yapılamıyorsa neden. */
export function respecInfo(h: TreeHero, gold: number, rules: TreeRules = TREE_RULES): { cost: number; spent: number; free: boolean; blocked: string | null } {
  return { cost: heroRespecCost(h, rules), spent: h.tree ? spent(h.tree) : 0, free: !!h.freeRespec, blocked: respecBlocked(h, gold, rules) };
}

/** Düğümün kilit bilgisi (ipucu çipleri): kademe / evolve / ult level, gereken sayı ve açık mı. */
export function lockInfo(s: TreeSession, nd: TreeNode, rules: TreeRules = TREE_RULES): { tier: string; lock: string; open: boolean } {
  const a = effective(s);
  if (nd.arm) {
    const need = nd.ultLevel ?? 0;
    return { tier: `Ult · ${ARM_NAME[nd.arm] ?? nd.arm} arm`, lock: `Lv ${need}`, open: s.level >= need };
  }
  if (nd.kind === 'evolve') {
    if (rankOf(a, nd.key) > 0) return { tier: 'Evolve', lock: 'Taken', open: true };
    const es = evoState(a, rules);
    return es.capped ? { tier: 'Evolve', lock: `${rules.evolveMax} / ${rules.evolveMax} used`, open: false } : { tier: es.label, lock: `${es.need} pts`, open: es.open };
  }
  const need = rules.tierNeed[nd.tier ?? 'I'] ?? 0;
  return { tier: `Tier ${nd.tier}`, lock: need ? `${need} pts` : 'Open', open: counter(a, rules) >= need };
}

export const ARM_NAME: Record<string, string> = { u: 'Up', r: 'Right', d: 'Down', l: 'Left' };

/** Seçilmiş ult kolu (etkin dağılımda). */
export const chosenArm = (s: TreeSession, rules: TreeRules = TREE_RULES): string | null => ultArm(effective(s), rules);

/** Düğüm tablosu kısayolu. */
export const nodeOf = (key: string, rules: TreeRules = TREE_RULES): TreeNode | undefined => treeNodes(rules).by.get(key);

/** Debug (Debug > Campaign > 'Skill tree tab in Gear'): ana şalter kapalıyken de sekmeyi gösterir; yalnızca bellekte, şalteri DEĞİŞTİRMEZ (savaş bugünküyle aynı kalır). */
let debugTab = false;
export const setTreeTabDebug = (on: boolean): void => {
  debugTab = on;
};
export const treeTabDebug = (): boolean => debugTab;

/** Sekmenin görünürlüğü: ana şalter (_rules.json > enabled) ya da debug anahtarı. Kapalıyken Gear sekmeyi hiç çizmez; açık Gear'a sonradan yansımaz (yeniden açılınca). */
export const treeTabEnabled = (rules: TreeRules = TREE_RULES): boolean => !!rules.enabled || debugTab;

/** Tier bandı durumu (üstteki şerit): kısa ad, gereken puan, sayaç ilerlemesi, kilitli mi. */
export function stripState(a: TreeAlloc, tier: string, rules: TreeRules = TREE_RULES): { small: string; pt: string; em: string; lk: boolean } {
  const sp = counter(a, rules);
  if (tier === 'E') {
    const es = evoState(a, rules);
    if (es.capped) return { small: 'Evolve', pt: `${rules.evolveMax} / ${rules.evolveMax} used`, em: '', lk: true };
    return { small: es.label, pt: `${es.need} pts`, em: es.open ? '' : `${sp}/${es.need}`, lk: !es.open };
  }
  const need = rules.tierNeed[tier] ?? 0;
  return { small: `Tier ${tier}`, pt: need === 0 ? 'open' : `${need} pts`, em: sp >= need ? '' : `${sp}/${need}`, lk: sp < need };
}
