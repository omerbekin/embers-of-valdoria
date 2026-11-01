import { describe, expect, it } from 'vitest';
import { CONFIG, cleanCompanyName, newCampaign, normalizeState, setCompanyName, summarize } from '../src/campaign';
import { LESSONS, TUTORIAL, codexLessons, firstPointLine, firstPointRec, firstPointState, lessonById, lessonWhisperText } from '../src/tutorial/lessons';
import { canAddPoint } from '../src/progression/levels';
import { check, emptyAlloc } from '../src/progression/skill-tree';
import { classes } from '../src/engine/content';
import { treeOf } from '../src/progression';

// Ömer 2026-11-01: C5 B Garrick şeridi, C6 B Whisper, D4 bölük adı (docs/design/tutorial.md).

const WHISPERS = ['unit_card', 'skills_mp', 'hit_preview', 'ally_target', 'rows_reach', 'area_shapes', 'statuses', 'fallen_battle'];
const FIVE = ['warrior', 'archer', 'defender', 'paladin', 'druid'];

describe('Whisper (C6 B)', () => {
  it('yalnız seçilen bilgi derslerinde var; kutular kutu kalır', () => {
    expect(LESSONS.filter((l) => l.whisper).map((l) => l.id).sort()).toEqual([...WHISPERS].sort());
    for (const id of ['rest', 'move', 'burning_ground', 'skip', 'ultimate', 'boss', 'taunt']) {
      const l = LESSONS.find((x) => x.id === id || x.id.startsWith(id));
      if (l) expect(l.whisper, l.id).toBeUndefined();
    }
  });
  it('her metin tek cümle; süre veride', () => {
    expect(TUTORIAL.whisper.ms).toBe(7000);
    expect(TUTORIAL.whisper.fadeMs).toBeGreaterThan(0);
    for (const id of WHISPERS) {
      const l = lessonById(id)!;
      const texts = [l.whisper!.text, ...Object.values(l.whisper!.variants ?? {})];
      for (const t of texts) expect(t.replace(/\.$/, ''), id).not.toMatch(/[.!?]/);
      expect(lessonWhisperText(l)).toBeTruthy();
    }
    expect(lessonWhisperText(lessonById('fallen_battle')!, { variant: 'valor' })).toMatch(/Valor/);
  });
  it('Whisper dersleri Codex metnini korur', () => {
    const ids = codexLessons(new Set(WHISPERS)).map((l) => l.id);
    for (const id of WHISPERS) expect(ids).toContain(id);
  });
});

describe('Garrick şeridi (C5 B)', () => {
  it('beş sınıfın önerisi gerçek veriye bağlı: düğüm var, ilk puanla alınabilir, cümlede adı geçer', () => {
    for (const c of FIVE) {
      const r = firstPointRec(c, 'tree')!;
      const tree = treeOf(c)!;
      const node = tree.nodes[r.node]!;
      expect(node, `${c} ${r.node}`).toBeTruthy();
      expect(r.text, c).toContain(node.name);
      expect(check(tree, 2, emptyAlloc(tree), r.node), c).toBeNull();
    }
  });
  it('stat önerisi sınıfın ana statı ve 2. level puanı ona konabilir', () => {
    for (const c of FIVE) {
      const r = firstPointRec(c, 'stat')!;
      expect(r.attr, c).toBe(classes[c]!.primary);
      expect(canAddPoint(c, undefined, r.attr as 'str'), c).toBe(true);
    }
  });
  it('verisi olmayan sınıfta öneri yok; dersler Codex grubunda', () => {
    expect(firstPointRec('hexer', 'tree')).toBeNull();
    expect(firstPointRec('hexer', 'stat')).toBeNull();
    for (const id of Object.values(TUTORIAL.firstPoint.lessons)) {
      expect(lessonById(id)!.group).toBe('On the Road');
      expect(lessonById(id)!.trigger?.gate).toBe('first_point');
    }
  });
  it('durum: öneri -> sessiz -> doğru / başka seçim', () => {
    expect(firstPointState({ pending: 0, recPending: false, dismissed: false })).toBe('suggest');
    expect(firstPointState({ pending: 0, recPending: false, dismissed: true })).toBe('quiet');
    expect(firstPointState({ pending: 1, recPending: true, dismissed: false })).toBe('good');
    expect(firstPointState({ pending: 1, recPending: false, dismissed: true })).toBe('other');
    expect(firstPointLine('suggest', 'X')).toBe('X');
    expect(firstPointLine('good', 'X')).toBe(TUTORIAL.firstPoint.lines.good);
    expect(firstPointLine('other', 'X')).toBe(TUTORIAL.firstPoint.lines.other);
  });
});

describe('Bölük adı (D4)', () => {
  const s = () => newCampaign({ mode: 'normal', seed: 7 });
  it('hazır adlar: sınır içinde, farklı, İngilizce harf', () => {
    const { max, suggestions } = CONFIG.companyName;
    expect(max).toBe(24);
    expect(new Set(suggestions).size).toBe(suggestions.length);
    for (const n of suggestions) {
      expect(n.length, n).toBeLessThanOrEqual(max);
      expect(n, n).toMatch(/^[A-Za-z' ]+$/);
      expect(cleanCompanyName(n)).toBe(n);
    }
  });
  it('temizleme: boşluklar toplanır, boş / uzun / yazı olmayan geçersiz', () => {
    expect(cleanCompanyName('  Iron   Foxes ')).toBe('Iron Foxes');
    expect(cleanCompanyName('a\u0000b\nc')).toBe('a b c');
    expect(cleanCompanyName('   ')).toBeUndefined();
    expect(cleanCompanyName('x'.repeat(25))).toBeUndefined();
    expect(cleanCompanyName(7)).toBeUndefined();
    expect(cleanCompanyName(null)).toBeUndefined();
  });
  it('yazma: ad konur, boş ad alanı siler, fazlası kırpılır', () => {
    const a = setCompanyName(s(), ' Iron Foxes ');
    expect(a.companyName).toBe('Iron Foxes');
    const b = setCompanyName(a, '   ');
    expect('companyName' in b).toBe(false);
    expect(setCompanyName(s(), 'x'.repeat(30)).companyName).toHaveLength(24);
    const c = s();
    expect(setCompanyName(c, '')).toBe(c);
  });
  it('kayıt: eski kayıt adsız açılır, ad gidip gelir (JSON / bulut), geçersiz ad düşer ama kayıt açılır', () => {
    const old = s();
    expect('companyName' in old).toBe(false);
    expect(normalizeState(JSON.parse(JSON.stringify(old)))).not.toBeNull();
    expect('companyName' in normalizeState(JSON.parse(JSON.stringify(old)))!).toBe(false);
    const named = setCompanyName(s(), 'The Mill Road Few');
    expect(normalizeState(JSON.parse(JSON.stringify(named)))!.companyName).toBe('The Mill Road Few');
    for (const bad of [42, '', '   ', 'x'.repeat(99), { a: 1 }]) {
      const back = normalizeState({ ...JSON.parse(JSON.stringify(old)), companyName: bad });
      expect(back, String(bad)).not.toBeNull();
      expect('companyName' in back!, String(bad)).toBe(false);
    }
  });
  it('kayıt kartı özeti adı taşır, adsızda alan yok', () => {
    expect(summarize(setCompanyName(s(), 'Ember Company')).company).toBe('Ember Company');
    expect('company' in summarize(s())).toBe(false);
  });
});
