import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { balance, simulate, skillCategory, skillShare, ultReadyRate, winRate } from '../src/sim/simulate';

/**
 * Denge kontrolü (tests/balance.test.ts ve balance-b.test.ts iki farklı seed grubuyla çağırır; iki dosya paralel koşar).
 * Yapay zeka vs yapay zeka, rastgele takımlar, varsayılan 4'e 4 (random-battle.json). TÜM bantlar data/balance.json'dan okunur
 * (Ömer kararı 2026-10-08; docs/balance.md). Tam ölçüm (grup başına 10.000 savaş) `npm run sim` ile yapılır; test grup başına
 * balance.json > test.runs savaşla aynı bantları korur.
 */

/**
 * DENGESİ BEKLEYEN CLASS'LAR: bant kontrolünden GEÇİCİ muaf (ölçülür, uyarı yazılır). Normalde BOŞ.
 * Hexer 2026-10-08 denge turunda bantta (madde 261) olduğu için çıkarıldı.
 */
// 2026-10-17 (levels.md başlangıç statları, en yüksek temel stat <= diğer üçünün %80'i): Warrior %43-44,6 (STR 30 -> 26), Paladin ~%56 (statı aynı,
// diğerleri zayıfladı); level / item sonrası balance-tester turunda çıkarılacak (open-questions 335)
// 2026-10-18 genel denge turu (open-questions 350): Warrior 2 x 10.000'de %50,5-51,4 -> çıkarıldı; Paladin %46 civarında, Holy Strike 0,482 -> 0,51 sonrası ölçülecek.
// 2026-10-28 silah tipleri + Fire Bolt 1,07->1,02, Blizzard 0,81->0,77, asa +%8->+%5 sonrası Mage %57,3-57,7 (bant 56): Mage pasif/kit reworkü (Overflow seçildi) ve element reworkü sonrası sim'e kadar muaf.
// 2026-10-28: vesper = yeni class (Ömer onayı), değerler PROVİZYON (Mage'den türetildi); sim Ömer onayıyla sonra (docs/design/classes/vesper.md).
// 2026-10-30: AM reworkü (Instinct + Ley Thread) ve Void Strike / Mana Steal / Ley Brand kısmaları sonrası 2 x 1000'de %54,1-54,4, 5000'de %56,2-56,3 (sınırda): Ömer kararı bekliyor.
export const PENDING_BALANCE: readonly string[] = ['paladin', 'mage', 'vesper', 'antimage'];

/**
 * BANDI BEKLEYEN SKILL'LER (kullanım payı / ultimate oranı): Ömer onayı bekleyen yeniden tasarım önerisi olanlar; ölçülür, uyarı yazılır.
 * Normalde BOŞ; tasarım kararı verilip uygulanınca listeden çıkarılır (docs/balance.md > Bandı bekleyen skill'ler).
 */
// Abyssal Cry madde 262 yeniden tasarımından sonra hazır olanlardan ~%69 kullanılıyor: 2026-10-08 denge turunda listeden çıkarıldı.
export const PENDING_SKILLS: Readonly<Record<string, string>> = {
  // 2026-10-18 genel denge turu (open-questions 350): Whirlwind (güç 0,87, pay %16-18) ve Resurrection (MP 16, pay %8,5-9) bantta -> çıkarıldı.
  // 2026-10-20 (open-questions 376): Whirlwind güç 0,65 sonrası pay %11 -> listeye alındı; Ömer kararıyla ilk 2 sıraya vuran rect 2x3 oldu (güç 0,5), pay %22 -> çıkarıldı.
  // 2026-10-24: Quick Shot güç 0,42 (Ömer isteği) sonrası Piercing Arrow payı %12,6-13 (bant %15) -> listeye alındı.
  piercing_arrow: 'Quick Shot buff sonrası pay %13 (2026-10-24), Ömer kararı bekliyor',
  // 2026-10-29: Vesper yeni, değerler PROVİZYON; Toll payı %19,8 (bant %20). Vesper sim'inde bakılacak.
  // 2026-10-29: Ley Brand bedel yakımı + işaret (castBurnPct 0,75, markDamagePct 0,4) sonrası AM hamlelerinin ~%39'u; YZ değeri yüksek, sim turunda bakılacak.
  drain_field: 'Ley Brand yeni kurallar sonrası pay ~%39 (2026-10-29), YZ değeri ayarı bekliyor',
  spell_ward: 'Ley Brand payı arttı, Spell Ward %6,7 (bant %8) (2026-10-29), Ley Brand YZ ayarıyla bakılacak',
  toll: 'Vesper PROVİZYON değerler (2026-10-29), sim bekliyor',
  // 2026-10-29: Vesper havuza girince Resurrection payı %7,98 (bant %8, gürültü sınırı); Paladin zaten dengesi bekleyenlerde.
  resurrection: 'Vesper sonrası pay %7,98 (2026-10-29), Paladin turunda bakılacak',
  // 2026-10-30: YZ kapsam turu (open-questions 458) sonrası Dark Bond payı %7,8-8,0 (bant %8, gürültü sınırı).
  dark_bond: 'YZ kapsam turu sonrası pay %7,8-8,0 (2026-10-30), Undead turunda bakılacak',
  // 2026-10-30: YZ kapsam turu sonrası Taunt'un kırılma eşiği değerlendi: Taunt %14-15 (bant %15), Tremor Slam %46-47 ve Quick Shot %46 (bant %45).
  taunt: 'YZ kapsam turu sonrası pay %14-15 (2026-10-30), Defender turunda bakılacak',
  tremor_slam: 'Taunt payı düşünce %46-47 (2026-10-30), Defender turunda bakılacak',
  quick_shot: 'YZ kapsam turu sonrası pay %46 (2026-10-30), Archer turunda bakılacak (Piercing Arrow ile birlikte)',
};

export function balanceSuite(label: string, firstSeed: number): void {
  const RUNS = balance.test.runs;
  const result = simulate(RUNS, firstSeed);
  const B = balance.bands;

  describe(`denge ${label} (seed ${firstSeed}, ${RUNS} savaş, 4'e 4, YZ vs YZ)`, () => {
    it('iki taraf da yaklaşık eşit kazanıyor (taraf avantajı yok)', () => {
      const party = (result.partyWins / RUNS) * 100;
      expect(party).toBeGreaterThan(45);
      expect(party).toBeLessThan(55);
    });

    it(`her class kazanma oranı bantta (%${B.classWin.low}-${B.classWin.high}; dengesi bekleyenler hariç)`, () => {
      for (const id of content.randomPool) {
        const win = winRate(result.classes.get(id)!);
        if (PENDING_BALANCE.includes(id)) {
          console.warn(`[balance] DENGESİ BEKLİYOR: ${id} %${win.toFixed(1)} (kontrolden muaf: PENDING_BALANCE)`);
          continue;
        }
        expect(win, `${id} %${win.toFixed(1)}`).toBeGreaterThanOrEqual(B.classWin.low);
        expect(win, `${id} %${win.toFixed(1)}`).toBeLessThanOrEqual(B.classWin.high);
      }
    });

    it('bekleyen listeler yalnızca gerçek class/skill içerir (yazım hatası sessizce muaf tutmasın)', () => {
      for (const id of PENDING_BALANCE) expect(content.randomPool, id).toContain(id);
      for (const id of Object.keys(PENDING_SKILLS)) expect(content.skills[id], id).toBeDefined();
      for (const id of balance.situational) expect(content.skills[id], id).toBeDefined();
    });

    it(`ortalama savaş süresi bantta (%${B.battleTurns.low}-${B.battleTurns.high} tur, tüm birimlerin turları)`, () => {
      const turns = result.totalTurns / RUNS;
      expect(turns).toBeGreaterThanOrEqual(B.battleTurns.low);
      expect(turns).toBeLessThanOrEqual(B.battleTurns.high);
    });

    it('skill kullanım payları kategorisinin bandında (temel / normal / durumsal; bekleyenler hariç)', () => {
      for (const id of content.randomPool) {
        const s = result.classes.get(id)!;
        for (const sk of content.classes[id]!.skills) {
          const cat = skillCategory(id, sk)!;
          if (cat === 'ultimate') continue;
          const share = skillShare(s, sk);
          const band = B[cat];
          if (sk in PENDING_SKILLS) {
            console.warn(`[balance] SKILL BANDI BEKLİYOR: ${sk} %${share.toFixed(1)} (${cat})`);
            continue;
          }
          expect(share, `${id} ${sk} (${cat}) %${share.toFixed(1)}`).toBeGreaterThanOrEqual(band.low);
          expect(share, `${id} ${sk} (${cat}) %${share.toFixed(1)}`).toBeLessThanOrEqual(band.high);
        }
      }
    });

    it(`ultimate: hazır olduğu ana kadar yaşayan birimlerde en az bir kez kullanma oranı class ORTALAMASI >= %${B.ultimateUsedMin} (tek class %${B.ultimateLowWarn} altıysa yalnızca uyarı)`, () => {
      // Ömer kararı 2026-10-08: hedef class'ların ortalaması; class bazında ayrı kontrol yok, çok düşük kullanılan ult raporlanır.
      const rates = content.randomPool.map((id) => ({ id, ult: content.classes[id]!.skills.at(-1)!, rate: ultReadyRate(result.classes.get(id)!) }));
      const avg = rates.reduce((a, r) => a + r.rate, 0) / rates.length;
      expect(avg).toBeGreaterThanOrEqual(B.ultimateUsedMin);
      for (const r of rates) {
        expect(r.rate, `${r.id} ${r.ult} ölçülmeli`).toBeGreaterThanOrEqual(0);
        if (r.rate < B.ultimateLowWarn) console.warn(`[balance] ÇOK DÜŞÜK ULTIMATE: ${r.id} ${r.ult} %${r.rate.toFixed(1)} (< %${B.ultimateLowWarn})`);
      }
    });

    it(`karşılaşma tablosu: ezici eşleşmeler (> %${B.matchup.crushingHigh}) yalnızca RAPORLANIR (eşitlik hedeflenmez)`, () => {
      const crushing = [...result.matchups].filter(([, m]) => m.games >= B.matchup.minGames && winRate(m) > B.matchup.crushingHigh);
      for (const [k, m] of crushing) console.warn(`[balance] EZİCİ EŞLEŞME: ${k} %${winRate(m).toFixed(1)} (${m.games} savaş)`);
      // tablo dolu: her class her class'la karşılaşmış
      for (const a of content.randomPool) for (const b of content.randomPool) if (a !== b) expect(result.matchups.get(`${a}>${b}`)?.games ?? 0, `${a}>${b}`).toBeGreaterThan(0);
    });

    it('yeterince örneklenen kompozisyonlar uç değerde değil (%10-90)', () => {
      for (const [key, c] of result.comps) {
        if (c.games < 60) continue;
        const win = winRate(c);
        expect(win, `${key} %${win.toFixed(1)} (${c.games} savaş)`).toBeGreaterThan(10);
        expect(win, `${key} %${win.toFixed(1)} (${c.games} savaş)`).toBeLessThan(90);
      }
    });

    it('savaşların neredeyse hepsi sonuçlanıyor (bitmeyen < %3)', () => {
      expect((result.draws / RUNS) * 100).toBeLessThan(3);
    });

    it('kalkan savaşın gidişatını belirlemiyor: toplam kalkan, toplam hasarın %15\'inden az', () => {
      let shield = 0;
      let damage = 0;
      for (const s of result.classes.values()) {
        shield += s.shield;
        damage += s.damage;
      }
      expect(shield / damage).toBeLessThan(0.15);
    });

    it('her class en az bir savaşta oynuyor ve hamle yapıyor (hiçbiri hep pas geçmiyor)', () => {
      for (const [id, s] of result.classes) {
        expect(s.moves, id).toBeGreaterThan(0);
        if (id in content.summons) continue; // çağrılar ön sırada değilse melee kuralı yüzünden çok pas geçebilir
        expect(s.skips / s.moves, id).toBeLessThan(0.5);
      }
    });
  });
}
