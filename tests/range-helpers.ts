import type { BattleSetup } from '../src/engine';
import { content } from '../src/engine';

/**
 * Menzil sistemi KAPALI (formulas.json > range.enabled false) kopya kurulum: ESKİ erişim kuralını (melee yalnızca en öndeki dolu sıraya;
 * skill reach / ignoreReach / ignoreFrontRow) sınayan testler bununla kurulur. Bu testler aynı zamanda "bayrak kapalı = eski hedefleme" güvencesidir.
 * Paylaşılan content.formulas nesnesi değişmez (kopya).
 */
export function rangeOff<T extends Pick<BattleSetup, 'formulas'>>(setup: T): T {
  return { ...setup, formulas: { ...setup.formulas, range: { ...setup.formulas.range!, enabled: false } } };
}

/** Menzil sistemi AÇIK kopya kurulum (veri bayrağından bağımsız menzil testleri için). */
export function rangeOn<T extends Pick<BattleSetup, 'formulas'>>(setup: T): T {
  return { ...setup, formulas: { ...setup.formulas, range: { default: 1, ...setup.formulas.range, enabled: true } } };
}

/**
 * Menzil KAPALIYKEN dizilir (eski otomatik dizilim: planCells) ama savaş paylaşılan veriyle (menzil bayrağı neyse) oynar: eski dizilimi
 * sınayan testler ve dizilime bağlı eski senaryolar için. Bayrak yalnızca `fn` süresince kapanır.
 */
export function withOldLayout<T>(formulas: { range?: { enabled?: boolean } }, fn: () => T): T {
  const r = formulas.range;
  const was = r?.enabled;
  if (r) r.enabled = false;
  try {
    return fn();
  } finally {
    if (r) r.enabled = was;
  }
}

/**
 * content.battleSetup, ESKİ otomatik dizilimle (menzil açık YZ dizilimi öncesi): sınıf listesiyle kurulan senaryo testleri hücrelere bağlı
 * (kim önde, kim arkada); bu testler yapay zeka/önizleme/sıra kuralını sınar, dizilimi değil. Savaş menzil bayrağıyla oynar.
 */
export function oldLayoutSetup(...args: Parameters<typeof content.battleSetup>): ReturnType<typeof content.battleSetup> {
  return withOldLayout(content.formulas, () => content.battleSetup(...args));
}
