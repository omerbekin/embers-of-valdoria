/**
 * Harita pencereleri (Ömer 2026-10-19; src/ui/map-window*.ts, data/map-window.json, data/hero-bust.json): saf veri parçaları ve veri tutarlılığı.
 * Görünüm (DOM) yerleşik tarayıcıyla elle denetlenir: debug menüsü > Campaign > "Map windows".
 */
import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import bust from '../data/hero-bust.json';
import mw from '../data/map-window.json';
import { EVENTS } from '../src/campaign/data';
import { choiceChips, nodeTags, paragraphs, resultChips } from '../src/ui/map-window-data';
import { content } from '../src/engine';

describe('olay seçeneği çipleri', () => {
  it('savaşlı seçenek: Battle + kazanç', () => {
    const c = choiceChips({ battle: ['x'], win: { gold: 30, chest: true } });
    expect(c.map((x) => x.text)).toEqual(['Battle', 'Win: 30 gold', 'Win: chest']);
  });
  it('bedelli seçenek: altın / can kaybı / sandık / altın', () => {
    expect(choiceChips({ cost: 60, chest: true, chestItems: 1, gold: 25 }).map((x) => x.text)).toEqual(['60 gold', '1 item', '25 gold']);
    expect(choiceChips({ hpLoss: 0.2, chest: true, chestItems: 1, gold: 25 }).map((x) => x.text)).toEqual(['-20% HP, every hero', '1 item', '25 gold']);
    expect(choiceChips({ cost: 40, restHeal: 1 }).map((x) => x.text)).toEqual(['40 gold', 'Rest heals 100%']);
  });
  it('etkisiz seçenek: No change; sonuçta Nothing gained', () => {
    expect(choiceChips({}).map((x) => x.text)).toEqual(['No change']);
    expect(resultChips({}).map((x) => x.text)).toEqual(['Nothing gained, nothing lost']);
  });
  it('sonuç çipleri işaretli', () => {
    expect(resultChips({ cost: 60, chest: true, chestItems: 1, gold: 25 }).map((x) => x.text)).toEqual(['-60 gold', '1 item from the chest', '+25 gold']);
  });
  it('gerçek olay verisinin her seçeneği çip üretir', () => {
    for (const [id, e] of Object.entries(EVENTS)) for (const c of e.choices ?? []) expect(choiceChips(c).length, `${id}.${c.id}`).toBeGreaterThan(0);
  });
});

describe('düğüm üst bilgisi', () => {
  it('alt yazıdan tür ve yer', () => {
    expect(nodeTags('Event · Guarded', 'Event')).toEqual({ kind: 'Event', place: 'Guarded' });
    expect(nodeTags('Town · Rest, Recruits, Trade', 'Town')).toEqual({ kind: 'Town', place: 'Rest, Recruits, Trade' });
    expect(nodeTags(undefined, 'Rest point')).toEqual({ kind: 'Rest point' });
  });
  it('paragraflar boş satırla bölünür', () => {
    expect(paragraphs('a\n\nb')).toEqual(['a', 'b']);
    expect(paragraphs(undefined)).toEqual([]);
  });
});

describe('veri tutarlılığı', () => {
  it('sahne şeridi dosyaları var', () => {
    const files = new Set(readdirSync('assets/campaign/windows').map((f) => f.replace(/\.webp$/, '')));
    for (const [k, a] of Object.entries(mw.art)) expect(files.has(a.file), k).toBe(true);
  });
  it('seçenek stilleri gerçek seçeneklere bağlı', () => {
    for (const k of Object.keys(mw.choices)) {
      const [ev, ch] = k.split('.') as [string, string];
      const real = (EVENTS[ev]?.choices ?? []).some((c) => c.id === ch);
      expect(real, k).toBe(true);
    }
  });
  it('büst kırpma kutusu poz görselinin içinde, poz dosyası var, sınıf gerçek', () => {
    for (const [id, r] of Object.entries(bust.classes)) {
      expect(content.classes[id], id).toBeTruthy();
      expect(existsSync(`assets/poses/${id}-v2/${r.pose}.webp`), `${id} pose`).toBe(true);
      expect(r.x + r.w, id).toBeLessThanOrEqual(r.sw);
      expect(r.y + r.h, id).toBeLessThanOrEqual(r.sh);
      expect(r.h / r.w, `${id} oran`).toBeGreaterThan(0.8);
      expect(r.h / r.w, `${id} oran`).toBeLessThan(0.9);
    }
  });
  it('oynanabilir sınıfların hepsinin büst satırı ve blurb alanı var', () => {
    for (const [id, d] of Object.entries(content.classes)) {
      if (d.hidden || d.testOnly || !d.blurb) continue;
      expect((bust.classes as Record<string, unknown>)[id], `${id} büst`).toBeTruthy();
    }
  });
});
