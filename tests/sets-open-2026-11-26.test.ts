// Set item'leri oyuncuya açıldı (Ömer 2026-11-26: rareDrop.setsEnabled true). Açılış denetimi: her set kendi haritasında gerçekten düşebilir,
// her sınıfın düşebilen tam bir seti var, ipucu ham stat anahtarı yazmaz, sefer zaferi düşüren elitte set parçasını düğüm seviyesinde verir.
import { describe, expect, it } from 'vitest';
import { activeHeroes, debugTeleport, newCampaign, pickHero } from '../src/campaign';
import { getMap } from '../src/campaign/data';
import { grantLoot } from '../src/campaign/loot';
import { nodeIlvl, POWER_BUDGET } from '../src/campaign/power';
import { classes, setSummons } from '../src/engine/content';
import { canEquip, itemDef } from '../src/progression/items';
import { RARE } from '../src/progression/rare';
import { MOD_FMT, SETS, setDropPools, setPieces, setTip } from '../src/progression/sets';
import campaignJson from '../data/campaign/campaign.json';
import { buildSummons, buildWiki, hiddenSetSkill, setsArticle } from '../src/wiki/catalog';

const heroClasses = Object.keys(classes).filter((c) => !classes[c]!.testOnly && !(classes[c] as { enemy?: boolean }).enemy);

describe('set açılışı (2026-11-26)', () => {
  it('bayrak açık', () => {
    expect(RARE.setsEnabled).toBe(true);
  });

  it('her setin haritası bir bölüm adı, düşüreni o haritada bir elit düğüm; havuz boş değil', () => {
    for (const s of SETS) {
      const ch = POWER_BUDGET.chapters.find((c) => c.name === s.map);
      expect(ch, `${s.id}: harita adı "${s.map}" bölüm adlarında yok`).toBeTruthy();
      const nodes = getMap(ch!.map!).nodes.filter((n) => n.name === s.dropper);
      expect(nodes.length, `${s.id}: "${s.dropper}" ${ch!.map} haritasında yok`).toBeGreaterThan(0);
      for (const n of nodes) expect(n.type, `${s.id} ${n.id}`).toBe('elite');
      expect(setDropPools(s.map, s.dropper, heroClasses).dropper.filter((d) => d.set === s.id)).toHaveLength(s.slots.length);
    }
  });

  it('her kahraman sınıfının düşebilen en az bir tam seti var (nötr setler dahil)', () => {
    for (const c of heroClasses) {
      const full = SETS.filter((s) => setPieces(s.id).every((p) => canEquip(c, p)) && setDropPools(s.map, s.dropper, [c]).dropper.length === s.slots.length);
      expect(full.length, c).toBeGreaterThan(0);
    }
  });

  it('set bonusu stat anahtarlarının hepsinin adı var; ipucu ham anahtar yazmaz', () => {
    for (const s of SETS) {
      for (const b of Object.values(s.bonuses)) for (const k of Object.keys(b.mods ?? {})) expect(MOD_FMT[k], `${s.id} ${k}`).toBeTruthy();
      for (const r of setTip({ set: s.id })!.rows) expect(r.text, s.id).not.toMatch(/[a-z]+Add\b/);
    }
    expect(setTip({ set: 'relics_of_saint_odran' })!.rows[0]!.text).toContain('+15% Potency');
  });

  it('Codex: Sets makalesi tüm setlerle görünür; set durumları ve Road Hound Codex\'te', () => {
    const art = setsArticle();
    const text = JSON.stringify(art);
    for (const s of SETS) expect(text, s.id).toContain(s.name);
    const wiki = buildWiki({ sprites: {}, avatars: {} });
    expect(wiki.statuses.map((s) => s.id)).toEqual(expect.arrayContaining(['banked_coals', 'focused', 'empowered']));
    expect(buildSummons({ sprites: {}, avatars: {} }).some((u) => u.id === 'road_hound')).toBe(true);
    expect(JSON.stringify(wiki)).toContain('Set items');
    for (const sk of setSummons.road_hound!.skills) expect(hiddenSetSkill(sk), sk).toBe(false);
  });

  it('Codex set listesi harita bayrağına uyar: Harita 2 kapalıyken onun setleri yazılmaz', () => {
    const flags = (campaignJson as unknown as { mapFlags: Record<string, { enabled: boolean }> }).mapFlags;
    const was = flags['drowned-reach']!.enabled;
    try {
      flags['drowned-reach']!.enabled = false;
      const text = JSON.stringify(setsArticle());
      for (const s of SETS) {
        if (s.map === 'The Drowned Reach') expect(text, s.id).not.toContain(s.name);
        if (s.map === 'Valdoria') expect(text, s.id).toContain(s.name);
      }
    } finally {
      flags['drowned-reach']!.enabled = was;
    }
  });

  it('seferde düşüren elit zaferi set parçasını Epic olarak, düğümün item seviyesinde torbaya koyar', () => {
    const almoner = SETS.find((s) => s.id === 'almoners_vestments')!;
    const node = getMap('valdoria').nodes.find((n) => n.name === almoner.dropper)!;
    let found = false;
    for (let seed = 1; seed < 200 && !found; seed++) {
      const s = debugTeleport(pickHero(newCampaign({ mode: 'normal', seed, difficulty: 'medium' }), 'paladin'), node.id);
      s.lootState.rareMisses = 400; // şans >= 1: zar hep isabet
      s.inventory = [];
      const drop = grantLoot(s, node.id, 'elite', activeHeroes(s));
      const id = drop.rare?.[0];
      if (!id || !itemDef(id)?.set) continue;
      found = true;
      const inst = s.inventory.find((i) => i.id === id)!;
      expect(itemDef(id)!.set).toBe('almoners_vestments');
      expect(itemDef(id)!.rarity).toBe('epic');
      expect(inst.rolls?.ilvl).toBe(nodeIlvl('valdoria', node.id));
      expect(s.lootState.rareMisses).toBe(0);
    }
    expect(found).toBe(true);
  });
});
