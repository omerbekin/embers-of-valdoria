import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CINEMATICS,
  CINEMATIC_FALLBACK,
  CINEMATIC_IDS,
  CONFIG,
  autoResolve,
  carryCinematics,
  cinematicSeen,
  cinematicSpeaker,
  cinematicTitle,
  debugTeleport,
  dueCinematic,
  getMap,
  latestSave,
  markCinematicSeen,
  memoryKV,
  newCampaign,
  nextStep,
  resolveCinematicBg,
  writeSave,
  type CampaignState,
} from '../src/campaign';

// Hikâye sinematikleri (Ömer 2026-10-23; data/campaign/cinematics.json, src/campaign/cinematics.ts, oynatıcı src/ui/cinematic.ts)
const onDisk = (folder: string, id: string): boolean => existsSync(`assets/${folder}/${id}.webp`);
const fresh = (): CampaignState => newCampaign({ mode: 'normal', seed: 4242 });
/** Düğümün savaşını kazanmış durum (debugTeleport hedefte savaştan önce durur). */
const wonAt = (nodeId: string): CampaignState => {
  const s = debugTeleport(fresh(), nodeId);
  expect(nextStep(s).kind).toBe('battle');
  return autoResolve(s);
};
/** Önceki sinematikler görülmüş sayılır (yalnızca bakılan tetik kalsın). */
const seenAllBut = (s: CampaignState, keep: string): CampaignState => CINEMATIC_IDS.filter((id) => id !== keep).reduce((a, id) => markCinematicSeen(a, id), s);

describe('veri', () => {
  it('beş sahne var, her satırın metni ve konuşanı dolu; metinler veride', () => {
    expect(CINEMATIC_IDS).toEqual(['prologue', 'bridge_fallen', 'forward_camp', 'morvane_meets', 'morvane_falls']);
    for (const id of CINEMATIC_IDS) {
      const def = CINEMATICS[id]!;
      expect(def.scenes.length, id).toBeGreaterThan(0);
      for (const sc of def.scenes) for (const l of sc.lines) expect(l.text.trim() && l.speaker.trim(), id).toBeTruthy();
    }
    expect(CINEMATICS['morvane_falls']!.endCard).toBe(CONFIG.texts['complete']);
    expect(CONFIG.texts['intro']!.endsWith(CONFIG.texts['introRules']!)).toBe(true); // oynanış cümleleri intro'dan birebir
  });

  it('tetik düğümleri haritada var; başlık düğümün adı (prologue: haritanın adı)', () => {
    const map = getMap(CONFIG.maps[0]!);
    for (const id of CINEMATIC_IDS) {
      const t = CINEMATICS[id]!.trigger;
      if ('node' in t) expect(map.nodes.some((n) => n.id === t.node), `${id} -> ${t.node}`).toBe(true);
    }
    expect(cinematicTitle('bridge_fallen', map)).toBe("King's Bridge");
    expect(cinematicTitle('forward_camp', map)).toBe('Forward Camp');
    expect(cinematicTitle('prologue', map)).toBe(map.title);
  });

  it('konuşanlar: anlatıcı portresiz ve adsız, lider = sınıf adı + sınıf avatarı, Odo, boss adları; portre dosyaları diskte', () => {
    expect(cinematicSpeaker('narrator', 'paladin')).toEqual({ name: '', portrait: null });
    expect(cinematicSpeaker('leader', 'paladin')).toEqual({ name: 'Paladin', portrait: 'paladin' });
    expect(cinematicSpeaker('merchant')).toEqual({ name: 'Odo', portrait: 'merchant' });
    expect(cinematicSpeaker('lord_morvane').name).toBe('Lord Morvane');
    for (const cls of [...CONFIG.starterPool, ...CONFIG.companyPool]) {
      const p = cinematicSpeaker('leader', cls).portrait;
      expect(p && onDisk('avatars', p), `leader ${cls}`).toBeTruthy();
    }
    for (const id of CINEMATIC_IDS)
      for (const sc of CINEMATICS[id]!.scenes)
        for (const l of sc.lines) {
          if (l.speaker === 'narrator' || l.speaker === 'leader') continue;
          const sp = cinematicSpeaker(l.speaker);
          expect(sp.name, `${id}: ${l.speaker}`).not.toBe(l.speaker); // tanınan konuşan (görünen adı var)
          expect(sp.portrait && onDisk('avatars', sp.portrait), `${id}: ${l.speaker} avatarı`).toBeTruthy();
        }
  });
});

describe('sahne görseli: önce assets/cinematics, sonra assets/backgrounds, sonra _fallback', () => {
  const has = (f: string, id: string) => onDisk(f, id);
  it('eksik cin_* görselleri veriyle yedeklenir', () => {
    expect(CINEMATIC_FALLBACK).toMatchObject({ cin_lookup: 'cin_kneel', cin_crown: 'castle-hall', cin_plain: 'ashen-plain' });
    expect(resolveCinematicBg('cin_kneel', has)).toEqual({ folder: 'cinematics', id: 'cin_kneel' });
    expect(resolveCinematicBg('border-road', has)).toEqual({ folder: 'backgrounds', id: 'border-road' });
  });
  it('yeni görsel gelince yalnızca dosya yeter (kod değişmez): dosya varsa yedeğe gidilmez', () => {
    const only = (files: string[]) => (f: string, id: string) => files.includes(`${f}/${id}`);
    expect(resolveCinematicBg('cin_lookup', only(['cinematics/cin_kneel']))).toEqual({ folder: 'cinematics', id: 'cin_kneel' });
    expect(resolveCinematicBg('cin_lookup', only(['cinematics/cin_lookup', 'cinematics/cin_kneel']))).toEqual({ folder: 'cinematics', id: 'cin_lookup' });
    expect(resolveCinematicBg('cin_crown', only(['backgrounds/castle-hall']))).toEqual({ folder: 'backgrounds', id: 'castle-hall' });
    expect(resolveCinematicBg('nothing', only([]))).toBeNull();
    expect(resolveCinematicBg('a', only([]), { a: 'b', b: 'a' })).toBeNull(); // döngü çökertmez
  });
  it('bugünkü dosyalarla her sahnenin görseli bulunur', () => {
    for (const id of CINEMATIC_IDS) for (const sc of CINEMATICS[id]!.scenes) expect(resolveCinematicBg(sc.bg, has), `${id}: ${sc.bg}`).not.toBeNull();
  });
});

describe('tetikler: her biri seferde bir kez', () => {
  it('prologue: sefer başında, kahraman seçiminden (ilk savaştan) önce; görülünce bir daha gelmez', () => {
    const s = fresh();
    expect(nextStep(s).kind).toBe('hero');
    expect(dueCinematic(s, 'map')).toBe('prologue');
    const seen = markCinematicSeen(s, 'prologue');
    expect(cinematicSeen(seen, 'prologue')).toBe(true);
    expect(dueCinematic(seen, 'map')).toBeNull();
    expect(markCinematicSeen(seen, 'prologue').done.filter((d) => d === 'cinematic:prologue')).toHaveLength(1);
  });

  it('bridge_fallen: King\'s Bridge (9) kazanılınca, düğümdeyken; savaştan önce değil', () => {
    const before = seenAllBut(debugTeleport(fresh(), '9'), 'bridge_fallen');
    expect(dueCinematic(before, 'map')).toBeNull();
    expect(dueCinematic(before, 'beforeBattle')).toBeNull();
    const won = seenAllBut(wonAt('9'), 'bridge_fallen');
    expect(dueCinematic(won, 'map')).toBe('bridge_fallen');
    expect(dueCinematic(markCinematicSeen(won, 'bridge_fallen'), 'map')).toBeNull();
  });

  it('forward_camp: kampa ilk varışta (tüccar adımı bekliyor), tüccardan sonra ya da görüldükten sonra yok', () => {
    const at = debugTeleport(fresh(), 'camp');
    expect(nextStep(at).kind).toBe('merchant');
    expect(dueCinematic(at, 'map')).toBe('forward_camp');
    expect(dueCinematic(markCinematicSeen(at, 'forward_camp'), 'map')).toBeNull();
    const left = autoResolve(at); // tüccardan ayrıldı: düğüm bitti
    expect(dueCinematic(left, 'map')).toBeNull();
  });

  it('morvane_meets: Castle Morvane (12) savaşı başlamadan hemen önce (harita adımında değil); bir kez', () => {
    const at = seenAllBut(debugTeleport(fresh(), '12'), 'morvane_meets');
    expect(nextStep(at).kind).toBe('battle');
    expect(dueCinematic(at, 'map')).toBeNull();
    expect(dueCinematic(at, 'beforeBattle')).toBe('morvane_meets');
    expect(dueCinematic(markCinematicSeen(at, 'morvane_meets'), 'beforeBattle')).toBeNull();
    expect(dueCinematic({ ...at, suspended: {} as CampaignState['suspended'] }, 'beforeBattle')).toBeNull(); // duraklatılan savaşın sürdürülmesi
  });

  it('başka düğümün savaşından önce oynamaz; devriyede oynamaz', () => {
    const mill = debugTeleport(autoResolve(fresh()), '1');
    expect(dueCinematic(seenAllBut(mill, 'morvane_meets'), 'beforeBattle')).toBeNull();
    const at = seenAllBut(debugTeleport(fresh(), '12'), 'morvane_meets');
    expect(dueCinematic({ ...at, patrol: '12' }, 'beforeBattle')).toBeNull(); // devriye (yeniden oynama) bayrağı
  });

  it('morvane_falls: düğüm 12 zaferinde, sefer bitiş penceresinden önce', () => {
    const won = seenAllBut(wonAt('12'), 'morvane_falls');
    expect(nextStep(won).kind).toBe('complete');
    expect(dueCinematic(won, 'map')).toBe('morvane_falls');
    expect(dueCinematic(markCinematicSeen(won, 'morvane_falls'), 'map')).toBeNull();
  });

  it('görüldü bilgisi kayda yazılır (mevcut done listesi, şema aynı) ve yüklenen kayıtta tekrar oynamaz', () => {
    const kv = memoryKV();
    const s = markCinematicSeen(fresh(), 'prologue');
    expect(s.done).toContain('cinematic:prologue');
    expect(writeSave(kv, s, 'auto').ok).toBe(true);
    const back = latestSave(kv, s.slot)!.state;
    expect(back.version).toBe(s.version);
    expect(cinematicSeen(back, 'prologue')).toBe(true);
    expect(dueCinematic(back, 'map')).toBeNull();
  });

  it('yenilgide son kayda dönülürken görülenler taşınır (Morvane karşılaşması yeniden oynamaz); başka done kaydı taşınmaz', () => {
    const now = markCinematicSeen(debugTeleport(fresh(), '12'), 'morvane_meets');
    const old = debugTeleport(fresh(), '12');
    const doneBefore = old.done.length;
    carryCinematics(now, old);
    expect(cinematicSeen(old, 'morvane_meets')).toBe(true);
    expect(old.done.length).toBe(doneBefore + now.done.filter((d) => d.startsWith('cinematic:')).length);
    carryCinematics(now, old);
    expect(old.done.filter((d) => d === 'cinematic:morvane_meets')).toHaveLength(1);
  });
});

describe('bağlantı (kaynak denetimi)', () => {
  it('haritada savaş yalnızca launchBattle ile başlar (Morvane karşılaşması atlanamaz); Skip ikonu ortak gezinme dilinde', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/game/scenes/CampaignMapScene.ts', 'utf8');
    const calls = src.match(/startCampaignBattle\(this\)/g) ?? [];
    expect(calls).toHaveLength(2); // ikisi de launchBattle içinde
    const body = src.slice(src.indexOf('private launchBattle(): void {'), src.indexOf('private playStoryCinematic('));
    expect(body.match(/startCampaignBattle\(this\)/g)).toHaveLength(2);
    const { navSvg, SKIP_PATH } = await import('../src/ui/nav-icons');
    expect(navSvg('skip')).toContain(SKIP_PATH);
    expect(readFileSync('src/ui/cinematic.ts', 'utf8')).toMatch(/mountCloseButton\(el, skip, 'Skip', 'skip'\)/);
  });
});
