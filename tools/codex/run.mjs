#!/usr/bin/env node
// Codex CLI sarmalayıcı: en yeni codex.exe'yi bulur, argümanları aynen iletir, çıkış kodunu döndürür.
// Windows'ta ChatGPT/Codex uygulaması codex.exe'yi her güncellemede yeni bir
// %LOCALAPPDATA%\OpenAI\Codex\bin\<sürüm>\ klasörüne koyar; yol elle güncellenmez.
// Diğer sistemlerde PATH'teki `codex` kullanılır (npm i -g @openai/codex).
// Kullanım ve istem kalıbı: docs/arch/codex-imagegen.md
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function findCodex() {
  const base = process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
  if (base && existsSync(base)) {
    const found = readdirSync(base)
      .map((d) => join(base, d, 'codex.exe'))
      .filter((p) => existsSync(p))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    if (found.length) return found[0];
  }
  return 'codex';
}

const exe = findCodex();
const child = spawn(exe, process.argv.slice(2), { stdio: 'inherit', shell: exe === 'codex' });
child.on('error', (e) => {
  console.error(`codex çalıştırılamadı (${exe}): ${e.message}`);
  process.exit(127);
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
