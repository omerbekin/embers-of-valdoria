// Hafif agent kopyası (Ömer 2026-11-19): `wt-open-agent` varsayılan kopyası assets/source'u checkout etmez (sparse).
// Asıl dosyanın varlığına bakan testler YALNIZ o durumda atlanır: klasör yok VE kopya sparse.
// Tam kopyada (asıl game/, sohbet kopyaları, gönderim kuyruğunun temiz kopyası) klasör eksikse test eskisi gibi KIRMIZI olur.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { it } from 'vitest';

function sparseCheckout(): boolean {
  try {
    return execFileSync('git', ['config', '--get', '--bool', 'core.sparseCheckout'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim() === 'true';
  } catch {
    return false;
  }
}

export const NO_ASSET_SOURCE = !existsSync('assets/source') && sparseCheckout();

/** assets/source'taki asıl dosyaya bakan test: hafif (sparse) kopyada atlanır, başka her yerde koşar. */
export const itSource = it.skipIf(NO_ASSET_SOURCE);
