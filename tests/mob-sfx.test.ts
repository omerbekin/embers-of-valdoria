import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { MOB_SFX, MOB_SFX_MIN_GAP_MS, MOB_SKILL_SOUNDS, mobSfxFor, mobSfxSession, mobSoundsOf } from '../src/game/mob-sfx';
import { buildMobSounds, MOB_SOUND_GROUP } from '../src/gallery/catalog';
import { SFX } from '../src/game/audio';
import { AUDIO_V2 } from '../src/game/art-v2/audio-index';
import { ownerOfSkill } from '../src/game/asset-versions';

/** Tüm sefer moblarının skill'leri (data/mobs). Bölge I-II karşılaşmalarındaki diğer birimler oynanabilir class'lar (kendi sesleri) ya da Bridge Warden (kendi sesleri). */
// + Lord Morvane (Bölge III final boss) ve Harita 2 bossları (Weir-Wyrm, Admiral Vane, Drowned Queen): hepsinin kendi sesleri
const mobSkills = [...new Set([...Object.values(content.mobs).flatMap((m) => m.skills), ...['lord_morvane', 'weir_wyrm', 'admiral_vane', 'drowned_queen'].flatMap((b) => content.bosses[b]!.skills)])];

describe('sefer düşmanı skill sesleri (data/audio-mobs.json)', () => {
  it('her mob skill\'inin kendi ses kaydı var', () => {
    expect(mobSkills.length).toBeGreaterThanOrEqual(50);
    for (const id of mobSkills) expect(MOB_SKILL_SOUNDS[id], id).toBeDefined();
  });

  it('her mob skill\'i kendi sesine çözülür: ödünç ses adları ya kendi sese ya sessize gider, ödünç ses hiç çalmaz', () => {
    for (const id of mobSkills) {
      const sk = content.skills[id]!;
      const own = mobSoundsOf(id);
      expect(own.length, id).toBeGreaterThan(0);
      const reached = new Set<string>();
      for (const req of sk.sfx ?? []) {
        const r = mobSfxFor(id, req);
        expect(r, `${id} <- ${req}`).not.toBeUndefined();
        if (r) {
          expect(own, `${id} <- ${req}`).toContain(r);
          expect(SFX[r], `${r} class sesi olmamalı`).toBeUndefined();
          reached.add(r);
        }
      }
      // kendi seslerinin hepsi skill'in istek listesinden ulaşılır (mob sheet'i yalnızca bu listeyi çalar)
      expect([...reached].sort(), id).toEqual([...own].sort());
      // sahibin v2 dosyasındaki bilinmeyen adlar da ödünç sese düşmez
      const owner = ownerOfSkill(id);
      for (const req of Object.keys((owner && AUDIO_V2[owner]?.sfx) || {})) expect(mobSfxFor(id, req), `${id} <- v2 ${req}`).not.toBeUndefined();
    }
  });

  it('her kendi ses tam olarak bir skill\'e ait ve tanımlı; tanımlı her ses kullanılıyor', () => {
    const users = new Map<string, string[]>();
    for (const id of Object.keys(MOB_SKILL_SOUNDS)) for (const s of mobSoundsOf(id)) users.set(s, [...(users.get(s) ?? []), id]);
    for (const [s, list] of users) {
      expect(MOB_SFX[s], s).toBeDefined();
      expect(list, s).toHaveLength(1);
    }
    for (const s of Object.keys(MOB_SFX)) expect(users.has(s), `kullanılmayan ${s}`).toBe(true);
  });

  it('tablosu olmayan skill eski ödünç sesini çalar (yedek); tabloda olup tarifi eksikse de yedek', () => {
    expect(mobSfxFor('whirlwind', 'axeSwing')).toBeUndefined();
    expect(mobSfxSession('whirlwind')).toBeNull();
    expect(mobSfxFor('billhook', 'chainTether')).toBe('mobBillhookSwing');
    expect(mobSfxFor('billhook', 'boneImpact')).toBe('mobBillhookSnag');
    expect(mobSfxFor('billhook', 'somethingUnknown')).toBeNull();
  });

  it('döküm oturumu: aynı kendi ses 90 ms içinde iki kez çalmaz, sonra yine çalar', () => {
    const play = mobSfxSession('murder_of_crows')!;
    expect(play('arrowThunk', 0)).toBe('mobCrowsPeck');
    expect(play('arrowThunk', MOB_SFX_MIN_GAP_MS - 1)).toBeNull();
    expect(play('bowTwang', 10)).toBe('mobCrowsCaw');
    expect(play('arrowThunk', MOB_SFX_MIN_GAP_MS + 5)).toBe('mobCrowsPeck');
  });

  it('tarifler geçerli ve ortaçağ ses kuralına uygun (çınlayan saf sinüs yok: sinüs yalnızca alçak gümleme)', () => {
    for (const [id, def] of Object.entries(MOB_SFX)) {
      expect(def.label, id).toBeTruthy();
      expect(def.desc, id).toBeTruthy();
      expect(def.gain, id).toBeGreaterThan(0);
      expect(def.layers.length, id).toBeGreaterThan(0);
      let end = 0;
      for (const l of def.layers) {
        expect(['tone', 'noise', 'voice', 'pluck'], id).toContain(l.type);
        if (l.type === 'voice') {
          expect(l.duration, id).toBeGreaterThan(0.2);
          expect(l.duration, id).toBeLessThan(3);
          expect(l.volume, id).toBeLessThanOrEqual(1);
          expect(l.formants, id).toHaveLength(3);
          end = Math.max(end, (l.at ?? 0) + l.duration);
        } else if (l.type === 'pluck') {
          expect(l.fb, id).toBeGreaterThan(0);
          expect(l.fb, id).toBeLessThan(1);
          expect(l.duration, id).toBeLessThanOrEqual(0.3); // kuru tel şaklaması, çınlama değil
          end = Math.max(end, (l.at ?? 0) + l.duration);
        } else {
          expect(l.f0, id).toBeGreaterThan(20);
          expect(l.f1, id).toBeGreaterThan(20);
          expect(l.decay, id).toBeGreaterThan(0);
          expect(l.attack, id).toBeGreaterThanOrEqual(0);
          expect(l.gain, id).toBeGreaterThan(0);
          if (l.type === 'tone' && l.wave === 'sine') {
            expect(Math.max(l.f0, l.f1), `${id}: sinüs yalnızca gümleme`).toBeLessThanOrEqual(200);
            expect(l.decay, id).toBeLessThanOrEqual(0.45);
          }
          end = Math.max(end, (l.at ?? 0) + l.attack + l.decay);
        }
      }
      expect(end, `${id} süresi (class skill sesleri gibi kısa)`).toBeLessThanOrEqual(1.6);
    }
  });

  it('Codex > Assets > Sounds: tüm sefer düşmanı sesleri "Campaign enemies" grubunda, kullanan skill etiketiyle', () => {
    const list = buildMobSounds();
    expect(list.map((s) => s.id).sort()).toEqual(Object.keys(MOB_SFX).sort());
    for (const s of list) {
      expect(s.group).toBe(MOB_SOUND_GROUP);
      expect(s.usedBy.length, s.id).toBe(1);
      // Bölge III: Lord Morvane'ın skill sesleri de bu grupta (data/bosses); Harita 2 çağrısı Risen Drowned'ın skill'leri de (data/summons, open-questions 444)
      expect(['mob', 'boss', 'summon'], s.id).toContain(s.usedBy[0]!.owner.kind);
    }
  });
});
