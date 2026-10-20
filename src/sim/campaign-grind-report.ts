// Sefer kasma simülatörünün CLI'ı ve Türkçe raporu (npm run sim:campaign; varsayılan --mode=grind). Simülatör: campaign-grind.ts,
// hedefler: campaign-targets.ts. Kullanım:
//   npm run sim:campaign -- [sefer] [ilk seed] [easy|medium|hard|all] [good|average|both (medium|easy da olur)]
//     [--wall-cap=N | --wall-cap=easy:5,medium:10,hard:20] [--retries=2] [--grind-step=1] [--on-wall=stop|force] [--overgrind=10 (0 = yok)]
//     [--heal-at=0.5] [--jobs=N] [--json=dosya]
//     Güç kaldıracı (yalnızca sim; varsayılan 0): [--bonus-level=N] (bölük kurulunca herkes +N level) [--bonus-ilvl=N] (savaşta takılı her item +N
//       item seviyesi) [--bonus-gold=N] (bölük kurulunca bir kez +N altın). Ayrıntı: campaign-grind.ts > GrindBonus.
//     Seçenekler (yalnızca sim süreci; veri dosyası değişmez): [--repeat=today|soft|nocap|off] [--merchant=sell|on|off (varsayılan sell)] [--valor-revive=6:4] [--rest-price=19]
//       repeat: tekrar zaferinin item/altın oranı ve nadirlik tavanı (today = items.json loot.repeat; soft = 1/0,8/0,65/0,5 tavan aynen; nocap = oran aynen
//       tavan yok; off = kesinti yok). merchant: tüccardan alışveriş (on = alır, sell = torbayı satar ve alır; off = eski davranış). valor-revive:
//       Valor diriltme bedeli savaşta:savaş dışında. rest-price: 1. bölüm ücretli kasaba dinlenmesi fiyatı.
// İyi oyuncu = Medium YZ + akıllı stat dağıtımı; ortalama oyuncu = Easy YZ + eşit stat dağıtımı. Her (zorluk, tip) ayrı; --overgrind > 0 ise
// her biri bir de "aşırı kasma" koşusuyla (Ashford sonrası ilk yerlerde önceden N kasma savaşı) ölçülür.
import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { CONFIG, getMap, node, nodeIlvl, nodeLevel, type Difficulty } from '../campaign';
import { content } from '../engine';
import { nodeCategory } from './campaign';
import { bonusOf, mergeGrindResults, simulateGrind, type GrindBonus, type GrindGroupAgg, type GrindNodeAgg, type GrindSimResult, type MerchantMode, type PlayerType, type RepeatMode } from './campaign-grind';
import { CAMPAIGN_TARGETS as T, inBand, type Band, type GrindCategory } from './campaign-targets';
import { valorMode } from './valor-mode';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
const CATS: GrindCategory[] = ['normal', 'elite', 'boss'];
const CAT_NAME: Record<GrindCategory, string> = { normal: 'normal', elite: 'elit', boss: 'boss' };
const TYPE_NAME: Record<PlayerType, string> = { good: 'iyi', average: 'ortalama' };
const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d).replace('.', ',') : '-');
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const mark = (ok: boolean) => (ok ? '+' : '!');
const band = (b: Band, d = 0) => `${fmt(b[0], d)}-${fmt(b[1], d)}`;

/** "--wall-cap=12" (hepsi) ya da "--wall-cap=easy:5,hard:20" (zorluk başına; yazılmayan varsayılan). */
export function parseWallCap(v: string | undefined): Record<Difficulty, number> {
  const out = { ...T.wallCap } as Record<Difficulty, number>;
  if (!v) return out;
  if (/^\d+$/.test(v)) return { easy: Number(v), medium: Number(v), hard: Number(v) };
  for (const part of v.split(',')) {
    const [k, n] = part.split(':');
    if (k && n && DIFFS.includes(k as Difficulty)) out[k as Difficulty] = Number(n);
  }
  return out;
}

const REPEATS: RepeatMode[] = ['today', 'soft', 'nocap', 'off'];
const MERCHANTS: MerchantMode[] = ['off', 'on', 'sell'];

/** Seçenek bayrakları (geçersiz değer hata). */
export function parseSimOptions(flag: (name: string) => string | undefined): {
  repeat: RepeatMode;
  merchant: MerchantMode;
  valorRevive?: [number, number];
  restPrice?: number;
} {
  const repeat = (flag('repeat') ?? 'today') as RepeatMode;
  const merchant = (flag('merchant') ?? 'sell') as MerchantMode; // varsayılan sell (Ömer 2026-10-20 ekonomi formu)
  if (!REPEATS.includes(repeat)) throw new Error(`--repeat=${REPEATS.join('|')}`);
  if (!MERCHANTS.includes(merchant)) throw new Error(`--merchant=${MERCHANTS.join('|')}`);
  const vr = flag('valor-revive');
  const rp = flag('rest-price');
  let valorRevive: [number, number] | undefined;
  if (vr) {
    const [a, b] = vr.split(':').map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('--valor-revive=savaşta:dışında (ör. 6:4)');
    valorRevive = [a!, b!];
  }
  if (rp !== undefined && !Number.isFinite(Number(rp))) throw new Error('--rest-price=N');
  return { repeat, merchant, ...(valorRevive ? { valorRevive } : {}), ...(rp !== undefined ? { restPrice: Number(rp) } : {}) };
}

/** Güç kaldıracı bayrakları (--bonus-level / --bonus-ilvl / --bonus-gold; yazılmayan 0; negatif ya da sayı olmayan hata). */
export function parseBonus(flag: (name: string) => string | undefined): GrindBonus {
  const one = (name: string): number => {
    const v = flag(name);
    if (v === undefined) return 0;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw new Error(`--${name}=N (0 ya da pozitif tam sayı)`);
    return n;
  };
  return { level: one('bonus-level'), ilvl: one('bonus-ilvl'), gold: one('bonus-gold') };
}

/** Açık bonusların metni (rapor başlığı); hiçbiri yoksa 'yok'. */
export function bonusText(b?: Partial<GrindBonus>): string {
  const x = bonusOf(b);
  const parts = [x.level ? `+${x.level} level (Ashford)` : '', x.ilvl ? `+${x.ilvl} item seviyesi (savaşta takılı her item)` : '', x.gold ? `+${x.gold} altın (Ashford, bir kez)` : ''].filter(Boolean);
  return parts.length ? parts.join(', ') : 'yok';
}

const toPlayers =(v: string | undefined): PlayerType[] =>
  !v || v === 'both' ? ['good', 'average'] : [v === 'medium' || v === 'good' ? 'good' : 'average'];

interface Combo {
  difficulty: Difficulty;
  player: PlayerType;
  preGrind: number;
}

export async function grindCli(args: string[], script: string): Promise<void> {
  const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const pos = args.filter((a) => !a.startsWith('--'));
  const runs = Number(pos[0] ?? 240);
  const firstSeed = Number(pos[1] ?? 1);
  const diffs: Difficulty[] = !pos[2] || pos[2] === 'all' ? DIFFS : [pos[2] as Difficulty];
  const players = toPlayers(pos[3]);
  const caps = parseWallCap(flag('wall-cap'));
  const overgrind = Number(flag('overgrind') ?? T.overgrind);
  const opts = {
    retries: Number(flag('retries') ?? 2),
    grindStep: Number(flag('grind-step') ?? 1),
    onWall: (flag('on-wall') ?? 'stop') as 'stop' | 'force',
    healAt: Number(flag('heal-at') ?? 0.5),
    valor: valorMode(),
    ...parseSimOptions(flag),
    bonus: parseBonus(flag),
  };
  const combos: Combo[] = diffs.flatMap((difficulty) =>
    players.flatMap((player) => (overgrind > 0 ? [0, overgrind] : [0]).map((preGrind) => ({ difficulty, player, preGrind }))),
  );
  const runRange = (start: number, end: number): GrindSimResult[] =>
    combos.map((c) => simulateGrind({ ...opts, ...c, wallCap: caps[c.difficulty], runs: end - start, firstSeed: firstSeed + start, routeOffset: start }));

  const part = flag('part');
  if (part) {
    const [a, b] = part.split(':').map(Number) as [number, number];
    process.stdout.write(JSON.stringify(runRange(a, b)));
    return;
  }
  const t0 = Date.now();
  const jobs = Math.max(1, Number(flag('jobs') ?? Math.min(12, cpus().length - 1)));
  let results: GrindSimResult[];
  if (jobs <= 1 || runs < 24) results = runRange(0, runs);
  else {
    const n = Math.min(jobs, runs);
    const bounds = Array.from({ length: n }, (_, k) => [Math.floor((runs * k) / n), Math.floor((runs * (k + 1)) / n)] as const);
    const parts = await Promise.all(
      bounds.map(
        ([a, b]) =>
          new Promise<GrindSimResult[]>((resolve, reject) => {
            const child = spawn(process.execPath, [...process.execArgv, script, ...args.filter((x) => !x.startsWith('--part=')), `--part=${a}:${b}`], {
              stdio: ['ignore', 'pipe', 'inherit'],
            });
            let buf = '';
            child.stdout.on('data', (d) => (buf += d));
            child.on('exit', (code) => (code === 0 ? resolve(JSON.parse(buf) as GrindSimResult[]) : reject(new Error(`part ${a}:${b} exit ${code}`))));
          }),
      ),
    );
    results = parts[0]!.map((_, i) => mergeGrindResults(parts.map((p) => p[i]!)));
  }
  const json = flag('json');
  // JSON: her sonuca özet (boss ilk deneme) eklenir; bonus zaten sonuçta (GrindSimResult.bonus)
  if (json) writeFileSync(json, JSON.stringify(results.map((r) => ({ ...r, bossFirstWin: bossFirstWins(r) })), null, 1));
  console.log(grindReport(results, { runs, firstSeed, secs: (Date.now() - t0) / 1000, opts, caps }));
}

// ---------------------------------------------------------------- rapor

const map = () => getMap(CONFIG.maps[0]!);
const nodeGrind = (a: GrindNodeAgg) => a.grindSum + a.grindWall;

interface CatRow {
  reached: number;
  firstWins: number;
  grind: number;
  grindRuns: number;
  cleared: number;
  wins: number;
  hpEnd: number;
}
export function categoryRows(r: GrindSimResult): Record<GrindCategory, CatRow> {
  const out = Object.fromEntries(CATS.map((c) => [c, { reached: 0, firstWins: 0, grind: 0, grindRuns: 0, cleared: 0, wins: 0, hpEnd: 0 }])) as Record<GrindCategory, CatRow>;
  for (const [id, a] of Object.entries(r.nodes)) {
    const c = nodeCategory(map(), id);
    if (c === 'tutorial' || !a.reached) continue;
    const o = out[c];
    o.reached += a.reached;
    o.firstWins += a.firstWins;
    o.grind += nodeGrind(a);
    o.grindRuns += a.grindRuns;
    o.cleared += a.cleared;
    o.wins += a.wins;
    o.hpEnd += a.hpEndSum;
  }
  return out;
}
/** Kasma (düğüme ulaşan koşu başına ortalama kasma savaşı) kategori başına. */
export const categoryGrind = (r: GrindSimResult): Record<GrindCategory, number> => {
  const rows = categoryRows(r);
  return Object.fromEntries(CATS.map((c) => [c, rows[c].reached ? rows[c].grind / rows[c].reached : 0])) as Record<GrindCategory, number>;
};
/** Oyuncu tipine göre kasma bandı: ortalama oyuncuda üst sınır x(1 + averageGrindExtra). */
export function grindBand(d: Difficulty, c: GrindCategory, p: PlayerType): Band {
  const b = T.grind[d][c];
  return p === 'average' ? [b[0], b[1] * (1 + T.averageGrindExtra)] : b;
}

function groupLines(title: string, groups: Record<string, GrindGroupAgg>, name: (k: string) => string): string[] {
  const rows = Object.entries(groups).filter(([, g]) => g.runs > 0);
  const per = (g: GrindGroupAgg) => g.grind / g.runs;
  const out = [`  ${title}  (koşu başına kasma, duvar %, bitirme %, koşu başına savaş)`];
  for (const [k, g] of rows.sort((x, y) => per(x[1]) - per(y[1])))
    out.push(`    ${name(k).padEnd(14)} n=${String(g.runs).padStart(4)}  kasma ${fmt(per(g), 2).padStart(5)}  duvar %${fmt(pct(g.walls, g.runs)).padStart(5)}  bitirme %${fmt(pct(g.completed, g.runs)).padStart(5)}  savaş ${fmt(g.battles / g.runs)}`);
  const big = rows.filter(([, g]) => g.runs >= 3);
  if (big.length >= 2) {
    const vals = big.map(([, g]) => per(g));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    // VARSAYIM: çok küçük değerlerde oran gürültü; fark en az 1 kasma savaşı olmalı
    const bad = hi - lo >= 1 && hi > T.spreadMax * lo;
    out.push(`    fark: en az ${fmt(lo, 2)} / en çok ${fmt(hi, 2)} = ${lo > 0 ? `${fmt(hi / lo, 1)}x` : hi > 0 ? 'sonsuz' : '1x'} (sınır ${T.spreadMax}x) ${mark(!bad)}`);
  }
  return out;
}

export function grindReport(
  results: GrindSimResult[],
  meta: { runs: number; firstSeed: number; secs: number; opts: { retries: number; grindStep: number; onWall: string; healAt: number; repeat?: string; merchant?: string; valorRevive?: [number, number]; restPrice?: number; bonus?: Partial<GrindBonus> }; caps: Record<Difficulty, number> },
): string {
  const m = map();
  const L: string[] = [];
  L.push('Embers of Valdoria sefer KASMA simülatörü (serbest dolaşım + devriye)');
  L.push('=================================');
  L.push(
    `Sefer: ${meta.runs} (rotalar eşit), seed ${meta.firstSeed}.., süre ${fmt(meta.secs, 0)} sn. Yenilgide ${meta.opts.retries} tekrar, sonra ${meta.opts.grindStep} kasma -> 1 deneme döngüsü; ` +
      `duvar sınırı Easy ${meta.caps.easy} / Medium ${meta.caps.medium} / Hard ${meta.caps.hard} kasma (duvarda: ${meta.opts.onWall === 'stop' ? 'koşu biter' : 'zorla geçilir'}); dinlenme eşiği can %${fmt(meta.opts.healAt * 100, 0)}.`,
  );
  L.push('İyi oyuncu = Medium YZ + ana stata puan; ortalama oyuncu = Easy YZ + eşit puan. Kasma = düğümü geçmek için yapılan devriye savaşı (ulaşan koşu başına ortalama).');
  const vr = meta.opts.valorRevive;
  L.push(
    `Seçenekler: tekrar loot'u ${meta.opts.repeat ?? 'today'}, tüccar ${meta.opts.merchant ?? 'sell'}` +
      `${vr ? `, Valor diriltme ${vr[0]} savaşta / ${vr[1]} dışarıda` : ''}${meta.opts.restPrice !== undefined ? `, dinlenme fiyatı ${meta.opts.restPrice}` : ''}.`,
  );
  L.push(`Güç kaldıracı (bonus): ${bonusText(meta.opts.bonus ?? results[0]?.bonus)}.${bonusOf(meta.opts.bonus ?? results[0]?.bonus).gold ? ' Bonus altın kazanca sayılmaz, harcamaya ve keseye dahil.' : ''}`);
  L.push('İşaret: + hedefte, ! hedef dışı. Hedefler: src/sim/campaign-targets.ts.');
  L.push('');
  const base = results.filter((r) => r.preGrind === 0);
  L.push('ÖZET (aşırı kasmasız koşular)');
  for (const r of base) {
    const rows = categoryRows(r);
    const g = categoryGrind(r);
    const n = rows.normal;
    const first = pct(n.firstWins, n.reached);
    const share = pct(r.grindBattles, r.battles);
    const hp = n.wins ? (n.hpEnd / n.wins) * 100 : 0;
    const grinds = CATS.map((c) => {
      const b = grindBand(r.difficulty, c, r.player);
      return `${CAT_NAME[c]} ${fmt(g[c], 2)} (${band(b, 2)})${mark(inBand(g[c], b))}`;
    }).join('  ');
    L.push(`  ${`${r.difficulty}/${TYPE_NAME[r.player]}`.padEnd(16)} normal ilk %${fmt(first)} (${band(T.firstWinNormal)})${mark(inBand(first, T.firstWinNormal))}  kasma: ${grinds}`);
    L.push(
      `  ${''.padEnd(16)} kasma oranı %${fmt(share)} (${band(T.grindShare)})${mark(inBand(share, T.grindShare))}  normal zafer canı %${fmt(hp, 0)} (${band(T.hpEndNormal)})${mark(inBand(hp, T.hpEndNormal))}` +
        `  duvar %${fmt(pct(r.walls, r.runs))}  bitirme %${fmt(pct(r.completed, r.runs))}  savaş/koşu ${fmt(r.battles / r.runs)}  son level ${fmt(r.levelEnd / r.runs)}`,
    );
    const bosses = bossFirstWins(r);
    if (bosses.length) L.push(`  ${''.padEnd(16)} boss ilk deneme: ${bosses.map((b) => `${b.name} %${fmt(b.pct)} (n=${b.reached})`).join(', ')}`);
  }
  L.push(...econLines(base));
  // ortalama vs iyi
  const pairs = DIFFS.map((d) => [base.find((r) => r.difficulty === d && r.player === 'good'), base.find((r) => r.difficulty === d && r.player === 'average')] as const).filter(
    ([a, b]) => a && b,
  );
  if (pairs.length) {
    L.push('');
    L.push(`ORTALAMA / İYİ OYUNCU kasma oranı (sınır x${fmt(1 + T.averageGrindExtra, 1)}; iyi oyuncu ~0 iken ortalama 0,1 üstü = !)`);
    for (const [g, a] of pairs) {
      const gg = categoryGrind(g!);
      const ag = categoryGrind(a!);
      const cells = CATS.map((c) => {
        const ok = gg[c] > 0.05 ? ag[c] / gg[c] <= 1 + T.averageGrindExtra : ag[c] <= 0.1;
        return `${CAT_NAME[c]} ${fmt(ag[c], 2)} / ${fmt(gg[c], 2)} = ${gg[c] > 0.05 ? `${fmt(ag[c] / gg[c], 2)}x` : '-'}${mark(ok)}`;
      });
      L.push(`  ${g!.difficulty.padEnd(8)} ${cells.join('   ')}`);
    }
  }
  // aşırı kasma
  const over = results.filter((r) => r.preGrind > 0);
  if (over.length) {
    L.push('');
    L.push('AŞIRI KASMA  (Ashford sonrası ilk iki tekrar oynanabilir düğüm temizlenince önceden N kasma savaşı; sonraki kasma ihtiyacı)');
    L.push('  VARSAYIM: erken N kasma, sonraki kasmayı N\'den fazla azaltıyorsa XP azalması yetersiz (!).');
    for (const o of over) {
      const b = base.find((r) => r.difficulty === o.difficulty && r.player === o.player);
      if (!b) continue;
      const bg = categoryGrind(b);
      const og = categoryGrind(o);
      const tot = (r: GrindSimResult) => r.grindBattles / r.runs;
      const saved = tot(b) - tot(o);
      const pre = o.preGrindBattles / o.runs;
      L.push(
        `  ${`${o.difficulty}/${TYPE_NAME[o.player]}`.padEnd(16)} ön kasma ${fmt(pre)}  elit kasma ${fmt(bg.elite, 2)} -> ${fmt(og.elite, 2)}  boss ${fmt(bg.boss, 2)} -> ${fmt(og.boss, 2)}  normal ${fmt(bg.normal, 2)} -> ${fmt(og.normal, 2)}` +
          `  toplam kasma/koşu ${fmt(tot(b), 2)} -> ${fmt(tot(o), 2)} (kazanç ${fmt(saved, 2)})${mark(saved <= pre)}  bitirme %${fmt(pct(b.completed, b.runs))} -> %${fmt(pct(o.completed, o.runs))}`,
      );
    }
  }
  for (const r of base) {
    L.push('');
    L.push(`---- ${r.difficulty.toUpperCase()} / ${TYPE_NAME[r.player]} oyuncu (YZ ${r.player === 'good' ? 'Medium' : 'Easy'}, duvar ${r.wallCap}) ----`);
    L.push('  DÜĞÜMLER  (n = ulaşan; ilk %; deneme = geçenlerde yeni düğüm denemesi; kasma = ulaşan başına (kasan koşu %); duvar %; can giriş/çıkış;');
    L.push('            güç: takım level / düğüm level, item seviyesi / düğüm item seviyesi, kahraman başına item, IP = item başına / kahraman başına;');
    L.push('            yara / ceset girişte (kahraman başına yara, takımda ceset); zaferde alınan yara / ceset (ulaşan başına); tur; kasma yeri olarak savaş)');
    const ids = m.nodes.filter((n) => r.nodes[n.id]?.reached || r.nodes[n.id]?.farmBattles).map((n) => n.id);
    for (const id of ids) {
      const a = r.nodes[id]!;
      const cat = nodeCategory(m, id);
      const first = pct(a.firstWins, a.reached);
      const wallPct = pct(a.walls, a.reached);
      const firstMark = cat === 'normal' ? mark(inBand(first, T.firstWinNormal)) : ' ';
      const g = a.reached ? nodeGrind(a) / a.reached : 0;
      const gMark = cat === 'tutorial' ? ' ' : mark(inBand(g, grindBand(r.difficulty, cat, r.player)));
      const hpEnd = a.wins ? (a.hpEndSum / a.wins) * 100 : 0;
      const hpMark = cat === 'normal' ? mark(inBand(hpEnd, T.hpEndNormal)) : ' ';
      const lv = a.reached ? a.lvSum / a.reached : 0;
      const nl = nodeLevel(m.id, id);
      const per = (v: number | undefined) => (a.reached ? (v ?? 0) / a.reached : 0);
      L.push(
        `  ${id.padEnd(8)} ${node(m, id).name.padEnd(18)} ${(cat === 'tutorial' ? 'tutorial' : CAT_NAME[cat]).padEnd(8)} n=${String(a.reached).padStart(4)}  ilk %${fmt(first).padStart(5)}${firstMark}` +
          `  deneme ${fmt(a.attemptsSum / Math.max(1, a.cleared), 2)}  kasma ${fmt(g, 2).padStart(5)}${gMark} (%${fmt(pct(a.grindRuns, a.cleared), 0)})  duvar %${fmt(wallPct, 0)}${mark(wallPct <= T.wallRunsMaxPct)}` +
          `  can %${fmt(a.reached ? (a.hpStartSum / a.reached) * 100 : 0, 0)}/%${fmt(hpEnd, 0)}${hpMark}` +
          `  Lv ${fmt(lv)}/${nl} (${fmt(lv / nl, 2)})  ilvl ${fmt(a.reached ? a.ilvlSum / a.reached : 0)}/${nodeIlvl(m.id, id)}  item ${fmt(a.reached ? a.gearSum / a.reached : 0)}` +
          `  IP ${fmt(per(a.ipSum))}/${fmt(per(a.ipHeroSum), 0)}  yara ${fmt(per(a.woundInSum), 2)} ceset ${fmt(per(a.corpseInSum), 2)}  zaferde yara ${fmt(per(a.woundsTaken), 2)} ceset ${fmt(per(a.corpses), 2)}` +
          `  ${fmt(a.turnsSum / Math.max(1, a.battles), 0)} tur${a.farmBattles ? `  kasma yeri ${a.farmBattles} (%${fmt(pct(a.farmWins, a.farmBattles), 0)} zafer)` : ''}`,
      );
    }
    // uzun savaşlar
    let n = 0;
    let sum = 0;
    for (const a of Object.values(r.nodes)) for (const [t, c] of Object.entries(a.turnHist)) (n += c), (sum += Number(t) * c);
    const avg = n ? sum / n : 0;
    const thr = avg * T.longBattleMult;
    const longs = Object.entries(r.nodes)
      .map(([id, a]) => {
        const all = Object.values(a.turnHist).reduce((x, y) => x + y, 0);
        const ks = Object.entries(a.turnHist).filter(([t]) => Number(t) > thr);
        return { id, k: ks.reduce((x, [, c]) => x + c, 0), all, max: Math.max(0, ...Object.keys(a.turnHist).map(Number)) };
      })
      .filter((x) => x.k > 0)
      .sort((x, y) => y.k / y.all - x.k / x.all);
    L.push(`  UZUN SAVAŞLAR  (ortalama ${fmt(avg)} tur; ${T.longBattleMult} katından uzun = ${fmt(thr, 0)}+ tur)`);
    if (!longs.length) L.push('    yok');
    for (const x of longs) L.push(`    ${x.id.padEnd(8)} ${node(m, x.id).name.padEnd(18)} ${x.k} savaş (%${fmt(pct(x.k, x.all))}), en uzun ${x.max} tur`);
    L.push(...groupLines('ROTALAR', r.routes, (k) => k));
    L.push(...groupLines('SINIFLAR', r.classes, (k) => content.classes[k]?.name ?? k));
    L.push(
      `  EKONOMİ  (koşu başına) altın kazanç ${fmt(r.goldEarned / r.runs, 0)}, demirci ${fmt(r.goldSmith / r.runs, 0)} (${fmt(r.tempers / r.runs)} Temper), ` +
        `dinlenme ${fmt(r.goldRest / r.runs, 0)} (${fmt(r.rests / r.runs)} kez); harcanan %${fmt(pct(r.goldSmith + r.goldRest, r.goldEarned), 0)}; toplam savaş ${fmt(r.battles / r.runs)}, kasma ${fmt(r.grindBattles / r.runs)}, yenilgi ${fmt(r.defeats / r.runs)}`,
    );
  }
  return L.join('\n');
}

/** Boss düğümlerinin (King's Bridge, Castle Morvane) ilk deneme kazanma oranı; ulaşılmayan düğüm yazılmaz. */
export function bossFirstWins(r: GrindSimResult): Array<{ id: string; name: string; reached: number; firstWins: number; pct: number }> {
  return map()
    .nodes.filter((n) => n.type === 'boss' && r.nodes[n.id]?.reached)
    .map((n) => {
      const a = r.nodes[n.id]!;
      return { id: n.id, name: n.name, reached: a.reached, firstWins: a.firstWins, pct: pct(a.firstWins, a.reached) };
    });
}

const RAR_NAME: Record<string, string> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

/** EKONOMİ ve ÖLÜM / VALOR bölümleri (zorluk x oyuncu tipi; koşu başına). Eski JSON'larda econ yoksa bölüm yazılmaz. */
export function econLines(results: GrindSimResult[]): string[] {
  const rows = results.filter((r) => r.econ);
  if (!rows.length) return [];
  const L: string[] = [];
  const name = (r: GrindSimResult) => `${r.difficulty}/${TYPE_NAME[r.player]}`.padEnd(16);
  const pad = ''.padEnd(16);
  L.push('');
  L.push('EKONOMİ  (koşu başına ortalama)');
  L.push('  Altın nereden: ilk zafer (normal / elit / boss), tekrar savaşı (devriye), hazine sandığı, item satışı; nereye: demirci, dinlenme, tüccar.');
  for (const r of rows) {
    const e = r.econ;
    const k = (v: number, d = 0) => fmt(v / r.runs, d);
    const fights = e.goldBattle + e.goldElite + e.goldBoss;
    const total = fights + e.goldReplay + e.goldTreasure + e.goldSell;
    L.push(
      `  ${name(r)} altın ${k(total)}: savaş ${k(e.goldBattle)} + elit ${k(e.goldElite)} + boss ${k(e.goldBoss)} (ilk zafer %${fmt(pct(fights, total), 0)}), ` +
        `tekrar ${k(e.goldReplay)} (%${fmt(pct(e.goldReplay, total), 0)}), hazine ${k(e.goldTreasure)} (%${fmt(pct(e.goldTreasure, total), 0)}), satış ${k(e.goldSell)}`,
    );
    L.push(`  ${pad} harcama: demirci ${k(r.goldSmith)}, dinlenme ${k(r.goldRest)}, tüccar ${k(e.goldMerchant)}; koşu sonunda kesede ${k(r.goldEarned + (r.goldBonus ?? 0) - r.goldSmith - r.goldRest - e.goldMerchant)}${r.goldBonus ? ` (bonus altın ${k(r.goldBonus)} dahil)` : ''}`);
    const items = e.itemsFirst + e.itemsReplay + e.itemsTreasure;
    const rar = Object.entries(e.rarity)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `${RAR_NAME[id] ?? id} %${fmt(pct(n, items), 0)}`)
      .join(', ');
    L.push(
      `  ${pad} item ${k(items, 1)}: ilk zafer ${k(e.itemsFirst, 1)}, tekrar ${k(e.itemsReplay, 1)}, hazine ${k(e.itemsTreasure, 1)} (torba dolu, kaybolan ${k(e.itemsLost, 1)}); ` +
        `takılan %${fmt(pct(e.itemsEquipped, items), 0)}; nadirlik: ${rar || '-'}`,
    );
    L.push(
      `  ${pad} tüccar: ziyaret ${k(e.merchantVisits, 1)}, alınan ${k(e.itemsBought, 1)} (${k(e.goldMerchant)} altın; takılan %${fmt(pct(e.boughtEquipped, e.itemsBought), 0)}), satılan ${k(e.itemsSold, 1)}` +
        `${r.merchant === 'off' ? '  (tüccar kapalı: sim almıyor, satmıyor)' : ''}`,
    );
  }
  L.push('');
  L.push('ÖLÜM / VALOR  (koşu başına ortalama)');
  L.push('  Yara = kazanılan savaşın sonunda düşmüş kalıp %10 canla kalkan; ceset = 3 yaralıyken bir kez daha düşen. Valor tavanı 8: dolu keseye gelen kazanç boşa gider.');
  for (const r of rows) {
    const e = r.econ;
    const k = (v: number, d = 1) => fmt(v / r.runs, d);
    const nodes = Object.values(r.nodes);
    const deaths = nodes.reduce((x, a) => x + a.deathsOnWin, 0);
    const arrivals = nodes.reduce((x, a) => x + a.reached, 0);
    const woundIn = nodes.reduce((x, a) => x + (a.woundInSum ?? 0), 0);
    L.push(
      `  ${name(r)} zaferde düşen (yeni düğüm) ${k(deaths)}, alınan yara ${k(e.wounds)}, ceset ${k(e.corpses, 2)}; düğüme girişte kahraman başına yara ${fmt(arrivals ? woundIn / arrivals : 0, 2)}`,
    );
    L.push(
      `  ${pad} Valor: hediye ${k(e.valorGift)}, kazanç ${k(e.valorEarned)}, tavana vurup boşa giden ${k(e.valorWasted)} (%${fmt(pct(e.valorWasted, e.valorEarned + e.valorWasted), 0)}); ` +
        `harcama savaşta ${k(e.valorSpentBattle)} (${k(e.revivesBattle)} diriltme), savaş dışında ${k(e.valorSpentOut)} (${k(e.revivesOut)} diriltme)`,
    );
  }
  return L;
}
