// Skill ipucu kuralı (Ömer 2026-11-02 A, 2026-11-07: More kalktı): describeSkill satırlarını TEK parça kısa ipucuna toplar.
// Eşit değerli Damage / Heal satırları tek satırda birleşir; her durum / zemin / zamanla hasar = "ad (taraf) · süre · sayı"; cümleler, kurallar,
// zemin tepkimeleri ve kurallar altta düz satır olarak kalır; uzun kural satırı sayıları korunarak kısaltılır (compactRow). Saf.
// Not (varsayım, Q-NEW): sayı içeren kısa kural satırı sınırı 70 karakter (taslak A 60, B 70; "Ley Brand" açıklaması B'deki gibi görünsün diye B'nin sınırı).

export interface FoldRow {
  text: string;
  color?: string;
  section?: boolean;
}

const VAL = String.raw`\d+%(?: → \d+%)?(?: \([+\-−][\d.]+%?\))? [A-Z]+ \(\d+(?: → \d+)?(?: \([+\-−][\d.]+%?\))?\)(?: x\d+)?`;
const VAL_RE = new RegExp(VAL);
const EFF_RE = new RegExp(String.raw`^(Damage|Heal|Magic shield|Shield|Heals you)\s+(${VAL})(.*)$`);
const PERTURN = /start of (each|every)|each of (its|their) turns|every turn/;
const MOD_MAX = 70;
const COND_MAX = 90;
const SEP = ' [[d|·]] ';
const turnsWord = (n: number): string => `${n} ${n === 1 ? 'turn' : 'turns'}`;

interface Per {
  name: string;
  side: string;
  turns: number;
  val: string;
  color?: string;
}

function parsePer(t: string): { name: string; side: string; turns: number; clause: string; you: boolean } | null {
  let m = /^Damage over time: (.+?) for (\d+) turns?: (.*)$/.exec(t);
  if (m) return { name: m[1]!, side: '', turns: +m[2]!, clause: m[3]!, you: false };
  m = /^Leaves (.+?) on the area(?: \(([^)]*)\))? for (\d+) turns?(?:: (.*))?$/.exec(t);
  if (m) return { name: m[1]!, side: (m[2] ?? '').replace(/ only$/, ''), turns: +m[3]!, clause: m[4] ?? '', you: false };
  m = /^You gain (.+?) for (\d+) turns?(?:: (.*))?$/.exec(t);
  if (m) return { name: m[1]!, side: 'you', turns: +m[2]!, clause: m[3] ?? '', you: true };
  m = /^Applies (.+?) for (\d+) turns?(?:: (.*))?$/.exec(t);
  if (m) return { name: m[1]!, side: '', turns: +m[2]!, clause: m[3] ?? '', you: false };
  return null;
}

/** Zemin tepkimesi satırları ("Ground reactions: A (with X), ...") tek satıra birleşir, aynı girdiler elenir. */
function mergeReactions(rows: FoldRow[]): FoldRow | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const body = r.text.replace(/^Ground reactions: /, '');
    for (const m of body.matchAll(/([^,()]+? \(with [^)]*\))/g)) {
      const e = m[1]!.trim();
      if (!seen.has(e)) {
        seen.add(e);
        out.push(e);
      }
    }
  }
  return out.length ? { text: `Ground reactions: ${out.join(', ')}`, ...(rows[0]?.color ? { color: rows[0].color } : {}) } : null;
}

/** Bu uzunluktan sonra satır özetlenir (karakter). */
const LONG_ROW = 100;

/**
 * Uzun satırdan yalnızca DOLGU not atılır ((rounded up) gibi); önemli kural notları (cannot miss or crit, ignores armor, cannot be dodged / blocked, unpurgeable...) ve
 * tüm sayılar KALIR (Ömer 2026-11-07). Kısa satırlar aynen kalır. Saf.
 */
export function compactRow(r: FoldRow): FoldRow {
  if (r.text.length <= LONG_ROW) return r;
  const text = r.text
    .replace(/\s*\(rounded(?: up| down)?\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return text === r.text ? r : { ...r, text };
}

/**
 * `rows`: describeSkill satırları (renkli; element rengi `color`), tepkime ipuçları dahil. `extra`: duruma bağlı satırlar (bekleme, kilit, neden kullanılamıyor...):
 * aynen eklenir. Dönüş: BandLine satırları (More yok: tek parça ipucu).
 */
export function foldSkillRows(rows: FoldRow[], extra: FoldRow[] = [], tree: FoldRow[] = []): FoldRow[] {
  const reacts = rows.filter((r) => /^Ground reactions: /.test(r.text));
  const main = rows.filter((r) => !/^Ground reactions: /.test(r.text));
  const eff: Array<{ label: string; val: string; who: string; color?: string }> = [];
  const per: Per[] = [];
  const mods: FoldRow[] = [];
  const rest: FoldRow[] = [];
  let cond: FoldRow | null = null;
  for (const r of main) {
    const e = EFF_RE.exec(r.text);
    const p = parsePer(r.text);
    if (e) {
      let tail = e[3]!;
      let who = '';
      const w = /\(on (?:the )?(?:enemy|your) side: (enemies|allies)\)/.exec(tail);
      if (w) {
        who = w[1]!;
        tail = tail.replace(w[0], '');
      }
      if (tail.trim()) rest.push(r);
      else eff.push({ label: e[1]!, val: e[2]!, who, ...(r.color ? { color: r.color } : {}) });
    } else if (p) {
      const v = VAL_RE.exec(p.clause);
      per.push({ name: p.name, side: p.side, turns: p.turns, val: v ? v[0] + (PERTURN.test(p.clause) ? ' per turn' : '') : '', ...(r.color ? { color: r.color } : {}) });
    } else if (/\d/.test(r.text) && r.text.length <= MOD_MAX && !/^(Needs|Cannot|Can also|Only from|Choose a|If you are not)/.test(r.text)) mods.push(r);
    else if (/^(Needs|Cannot|Can also|Only from|Choose a|If you are not)/.test(r.text) && !cond && r.text.length <= COND_MAX) cond = r;
    else rest.push(r);
  }
  // eşit değerler tek satır
  const by = new Map<string, { labels: string[]; whos: string[]; val: string; color?: string }>();
  for (const e of eff) {
    const g = by.get(e.val) ?? { labels: [], whos: [], val: e.val, ...(e.color ? { color: e.color } : {}) };
    g.labels.push(e.label);
    if (e.who) g.whos.push(e.who);
    by.set(e.val, g);
  }
  const head: FoldRow[] = [];
  for (const g of by.values()) {
    head.push({ text: `[[k|${g.labels.join(' / ')}]] ${g.val}${g.whos.length ? SEP + `[[d|${g.whos.join(' / ')}]]` : ''}`, ...(g.color ? { color: g.color } : {}) });
  }
  for (const p of per) {
    head.push({ text: `[[k|${p.name}]]${p.side ? ` [[d|(${p.side})]]` : ''}${SEP}${turnsWord(p.turns)}${p.val ? SEP + p.val : ''}`, ...(p.color ? { color: p.color } : {}) });
  }
  for (const m of mods) head.push(m);
  // Ömer 2026-11-07: "More" düğmesi kalktı; ipucu tek parça, uzun satırlar sayıları kaybetmeden özetlenir (compactRow). Sıra: değer satırları, kurallar, zemin tepkimeleri.
  const mr = mergeReactions(reacts);
  const body = [...head, ...rest.map(compactRow), ...(cond ? [compactRow(cond)] : []), ...(mr ? [compactRow(mr)] : [])];
  return [...body, ...extra, ...tree];
}
