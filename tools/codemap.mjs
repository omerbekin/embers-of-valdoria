// Büyük src dosyaları için kod haritası üretir -> docs/arch/code-map.md
// Ayrıştırıcı: rolldown'un oxc ayrıştırıcısı (typescript@7 JS API'si sunmuyor; ts.createSourceFile yok).
import { parseSync } from 'rolldown/experimental';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_FILE_BYTES = 40 * 1024; // haritaya girecek dosya eşiği
const MIN_ITEM_LINES = 20; // bundan kısa öğeler atlanır
const DESC_MAX = 80;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/arch/code-map.md');

function walk(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (n.endsWith('.ts') && !n.endsWith('.d.ts') && s.size > MIN_FILE_BYTES) acc.push({ path: p, size: s.size });
  }
  return acc;
}

function analyze(file) {
  const src = readFileSync(file, 'utf8');
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) lineStarts.push(i + 1);
  const lineOf = (off) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (lineStarts[m] <= off) lo = m; else hi = m - 1;
    }
    return lo + 1;
  };
  const r = parseSync(file, src, { lang: 'ts' });
  if (r.errors?.some((e) => e.severity === 'Error')) console.warn('uyarı: ayrıştırma hatası', file);
  // yorum satırı -> açıklama (bitiş satırı -> {ilk satır metni})
  const commentEndLine = new Map();
  for (const c of r.comments) {
    let text = c.value.split('\n').map((l) => l.replace(/^\s*\*+\s?/, '').trim()).find((l) => l) ?? '';
    commentEndLine.set(lineOf(c.end - 1), { text, start: lineOf(c.start), type: c.type });
  }
  const descFor = (startOff) => {
    let ln = lineOf(startOff) - 1;
    let found = null;
    // bitişik yorum bloğunun en üst satırını başlık say
    while (commentEndLine.has(ln)) {
      found = commentEndLine.get(ln);
      ln = found.start - 1;
    }
    if (!found) return '';
    let t = found.text.replace(/\s+/g, ' ');
    return t.length > DESC_MAX ? t.slice(0, DESC_MAX - 1) + '…' : t;
  };
  const items = [];
  const push = (name, start, end, depth, descStart = start) => {
    const a = lineOf(start), b = lineOf(end - 1);
    items.push({ name, a, b, depth, desc: descFor(descStart), len: b - a + 1 });
  };
  const keyName = (k) => (k?.name ?? k?.value ?? '?');
  const classMembers = (cls, cname) => {
    for (const m of cls.body.body) {
      if (m.type === 'MethodDefinition' || m.type === 'PropertyDefinition') {
        const isFn = m.type === 'MethodDefinition' || /Function/.test(m.value?.type ?? '');
        if (!isFn) continue;
        const n = (m.static ? 'static ' : '') + keyName(m.key);
        const a = lineOf(m.start), b = lineOf(m.end - 1);
        if (b - a + 1 >= MIN_ITEM_LINES) push(`${cname}.${n}`, m.start, m.end, 1);
      }
    }
  };
  const visit = (node, outer) => {
    const t = node.type;
    const s = outer.start, e = outer.end; // export dahil aralık
    if (t === 'FunctionDeclaration' && node.id) push(`${node.id.name}()`, s, e, 0);
    else if (t === 'ClassDeclaration' && node.id) {
      push(`class ${node.id.name}`, s, e, 0);
      classMembers(node, node.id.name);
    } else if (t === 'TSInterfaceDeclaration') push(`interface ${node.id.name}`, s, e, 0);
    else if (t === 'TSTypeAliasDeclaration') push(`type ${node.id.name}`, s, e, 0);
    else if (t === 'TSEnumDeclaration') push(`enum ${node.id.name}`, s, e, 0);
    else if (t === 'VariableDeclaration') {
      for (const d of node.declarations) {
        const nm = d.id.type === 'Identifier' ? d.id.name : '{destructure}';
        const fn = /Function/.test(d.init?.type ?? '');
        // tek bildirimde tek declarator ise export dahil aralığı kullan
        const single = node.declarations.length === 1;
        push(fn ? `${nm}()` : `const ${nm}`, single ? s : d.start, single ? e : d.end, 0, single ? s : d.start);
      }
    }
  };
  for (const n of r.program.body) {
    if ((n.type === 'ExportNamedDeclaration') && n.declaration) visit(n.declaration, n);
    else if (n.type === 'ExportDefaultDeclaration' && n.declaration && n.declaration.id) visit(n.declaration, n);
    else visit(n, n);
  }
  const kept = items.filter((i) => i.len >= MIN_ITEM_LINES);
  return { lines: lineStarts.length - (src.endsWith('\n') ? 1 : 0), items: kept };
}

const files = walk(join(root, 'src')).sort((x, y) => y.size - x.size);
let md = `# Kod haritası

Bu dosya \`npm run codemap\` ile üretilir, elle düzenleme. Büyük dosyada çalışmadan önce burada ilgili öğeyi bul, sonra Read'e offset/limit ver.
Yalnızca 40 KB'tan büyük \`src\` dosyaları ve ${MIN_ITEM_LINES}+ satırlık öğeler listelenir. Biçim: \`ad — başlangıç–bitiş satır\` · kısa açıklama (varsa).
Kod yapısı değişince \`npm run codemap\` ile yenile.

`;
let total = 0;
for (const f of files) {
  const rel = relative(root, f.path).split(sep).join('/');
  const { lines, items } = analyze(f.path);
  total += items.length;
  md += `## ${rel} (${lines} satır, ${Math.round(f.size / 1024)} KB)\n`;
  for (const i of items) {
    md += `${i.depth ? '  ' : ''}- ${i.name} — ${i.a}–${i.b}${i.desc ? ' · ' + i.desc : ''}\n`;
  }
  md += '\n';
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, md);
console.log(`codemap: ${files.length} dosya, ${total} öğe, ${(Buffer.byteLength(md) / 1024).toFixed(1)} KB -> docs/arch/code-map.md`);
