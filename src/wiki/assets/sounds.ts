import { audioSettings, playSfxDef, playSfxOn, synthSfx } from '../../game/audio';
import { iconUrl } from '../../ui/dom-icons';
import { MASTER_GAIN, MOB_SOUND_GROUP, UI_SOUND_GROUP, WORLD_SOUND_GROUP, type Catalog, type SoundEntry } from '../../gallery/catalog';
import { previewUiSound, previewWorldSound, UI_AUDIO, WORLD_AUDIO, type UiSoundKind, type WorldSoundKind } from '../../ui/ui-sound';
import { musicPreviewing, previewMusic, type MusicTrack } from '../../ui/music';
import { applyFilter, chipBar, fmtSec, h, isolateKeys, searchable, type SectionApi } from '../../gallery/dom';
import { stepFraction } from '../../ui/volume-steps';

/** Galerinin tek AudioContext'i: ilk tıklamada başlar (tarayıcı kilidi). */
let ctx: AudioContext | null = null;
export function audioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  void ctx.resume();
  return ctx;
}

/** Bir sesi çalar (oyunun kendi sentezi) ve kartı kısa süre vurgular. */
export function playSound(id: string, card?: HTMLElement | null): void {
  playSfxOn(audioContext(), id);
  if (!card) return;
  card.classList.add('playing');
  const dur = (Number(card.dataset['dur']) || 0.5) * 1000;
  window.setTimeout(() => card.classList.remove('playing'), Math.min(dur, 2500));
}

const isUi = (s: SoundEntry): boolean => s.group === UI_SOUND_GROUP;
const isWorld = (s: SoundEntry): boolean => s.group === WORLD_SOUND_GROUP;
const isMob = (s: SoundEntry): boolean => s.group === MOB_SOUND_GROUP;

/** Codex kartındaki ▶: arayüz sesi ui-sound üzerinden (seyreltmesiz, UI seviyesi kapalı olsa da duyulur), diğerleri oyunun skill sesi. */
function playEntry(s: SoundEntry, card?: HTMLElement | null): void {
  if (!isUi(s) && !isWorld(s) && !isMob(s)) return playSound(s.id, card);
  if (isMob(s)) playSfxDef(audioContext(), s.def); // sefer düşmanı sesi: skill sesleriyle aynı master / Sound Effects seviyesi
  else if (isWorld(s)) previewWorldSound(s.id as WorldSoundKind, audioContext());
  else previewUiSound(s.id as UiSoundKind, audioContext(), true);
  if (!card) return;
  card.classList.add('playing');
  window.setTimeout(() => card.classList.remove('playing'), Math.max(200, s.duration * 1000));
}

/** Sesi çevrimdışı çalıp tepe genliğini ölçer (0..1, ana ses dahil; arayüz seslerinde UI master x varsayılan seviye). */
async function measurePeak(entry: SoundEntry): Promise<number> {
  const rate = 44100;
  const off = new OfflineAudioContext(1, Math.ceil((entry.duration + 0.4) * rate), rate);
  const master = off.createGain();
  master.gain.value = isUi(entry) ? UI_AUDIO.master * (stepFraction(UI_AUDIO.defaultLevel)) : isWorld(entry) ? WORLD_AUDIO.master : MASTER_GAIN;
  master.connect(off.destination);
  synthSfx(off, master, entry.def, 0);
  const buf = await off.startRendering();
  let peak = 0;
  for (const v of buf.getChannelData(0)) peak = Math.max(peak, Math.abs(v));
  return peak;
}

const db = (v: number): string => (v <= 0 ? '-inf dB' : `${(20 * Math.log10(v)).toFixed(1)} dB`);

export function mountSounds(cat: Catalog): SectionApi {
  const root = h('section', { class: 'section', attrs: { id: 'sounds' } });
  const status = h('span', { class: 'muted small' });
  let group = '';
  let query = '';
  let stopToken = 0;
  const cards = new Map<string, HTMLElement>();
  const peakEls = new Map<string, HTMLElement>();

  const all = [...cat.sounds, ...cat.uiSounds, ...cat.worldSounds, ...cat.mobSounds];
  const groups = new Map<string, SoundEntry[]>();
  for (const s of all) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  // Önce arayüz (menü) sesleri, sonra class/çağrı grupları (alfabetik), sonra Shared, sefer düşmanları, en sonda kullanılmayanlar
  const order = [...groups.keys()].sort((a, b) => {
    const rank = (g: string): number => (g === UI_SOUND_GROUP ? -2 : g === WORLD_SOUND_GROUP ? -1 : g === 'Unused / UI' ? 3 : g === MOB_SOUND_GROUP ? 2 : g === 'Shared' ? 1 : 0);
    return rank(a) - rank(b) || a.localeCompare(b);
  });

  // --- araç çubuğu ---
  const vol = h('input', { attrs: { type: 'range', min: '0', max: '10', step: '1', value: String(Math.round(audioSettings.volume * 10)) }, class: 'range' });
  const volLabel = h('span', { class: 'small', text: `Volume ${vol.value}/10` });
  vol.addEventListener('input', () => {
    audioSettings.volume = Number(vol.value) / 10;
    volLabel.textContent = `Volume ${vol.value}/10`;
  });
  isolateKeys(vol);
  const measure = h('button', { class: 'btn', text: 'Measure peak levels', attrs: { type: 'button' }, title: 'Renders every sound offline and shows its peak level' });
  measure.addEventListener('click', async () => {
    measure.disabled = true;
    let i = 0;
    for (const s of all) {
      status.textContent = `Measuring ${++i}/${all.length}...`;
      const peak = await measurePeak(s);
      const el = peakEls.get(s.id);
      if (el) {
        el.textContent = `peak ${db(peak)}`;
        el.classList.toggle('warn', peak > 0.99);
        el.title = `Peak amplitude ${peak.toFixed(3)} (after master gain ${MASTER_GAIN})${peak > 0.99 ? ' - clipping' : ''}`;
      }
      await new Promise((r) => setTimeout(r));
    }
    status.textContent = 'Peak levels measured';
    measure.disabled = false;
  });
  const chips = chipBar(
    [{ value: '', label: 'All' }, ...order.map((g) => ({ value: g, label: g }))],
    (v) => {
      group = v;
      refresh();
    },
  );

  const countEl = h('span', { class: 'count' });
  root.append(
    h('div', { class: 'section-head' }, h('h2', { text: 'Sounds' }), countEl, h('span', { class: 'muted small', text: 'WebAudio synthesis from data/audio.json (menu sounds: data/audio-ui.json, world & stingers: data/audio-world.json, campaign enemies: data/audio-mobs.json)' })),
    h('div', { class: 'toolbar' }, h('label', { class: 'inline' }, volLabel, vol), measure, status),
    chips,
  );

  // --- gruplar ---
  const body = h('div');
  for (const g of order) {
    const list = groups.get(g)!;
    const playAll = h('button', { class: 'btn small-btn', text: 'Play all in group', attrs: { type: 'button' } });
    playAll.addEventListener('click', async () => {
      if (playAll.dataset['running']) {
        stopToken++;
        return;
      }
      const token = ++stopToken;
      playAll.dataset['running'] = '1';
      playAll.textContent = 'Stop';
      for (const s of list) {
        if (token !== stopToken) break;
        const card = cards.get(s.id);
        if (card?.hidden) continue; // süzgeçle gizlenen ses atlanır
        playEntry(s, card);
        await new Promise((r) => setTimeout(r, Math.min(s.duration, 2.5) * 1000 + 250));
      }
      delete playAll.dataset['running'];
      playAll.textContent = 'Play all in group';
    });
    const grid = h('div', { class: 'cards' });
    for (const s of list) {
      const peak = h('span', { class: 'peak muted small', text: 'peak -' });
      peakEls.set(s.id, peak);
      const users = isUi(s) || isWorld(s)
        ? [h('span', { class: 'muted small', text: `${isUi(s) ? 'Menu sound' : 'World sound'}: ${s.desc ?? ''}` })]
        : isMob(s)
        ? [
            h('span', { class: 'muted small', text: `Enemy sound: ${s.desc ?? ''}` }),
            ...s.usedBy.map((u) => h('span', { class: 'tag', title: `${u.name} (${u.owner.name})` }, h('img', { class: 'tag-icon pixelated', attrs: { src: iconUrl(u.icon, '#e8c47e'), alt: '' } }), `${u.name}`)),
          ]
        : s.usedBy.length
        ? s.usedBy.map((u) => h('span', { class: 'tag', title: `${u.name} (${u.owner.name})` }, h('img', { class: 'tag-icon pixelated', attrs: { src: iconUrl(u.icon, '#e8c47e'), alt: '' } }), `${u.name}`))
        : [h('span', { class: 'muted small', text: 'Not used by any skill (backup / UI)' })];
      const card = searchable(
        h(
          'article',
          { class: 'card sound', data: { dur: String(s.duration) } },
          h(
            'div',
            { class: 'row' },
            h('button', { class: 'play', text: '▶', title: `Play ${s.id}`, attrs: { type: 'button', 'aria-label': `Play ${s.label}` }, on: { click: () => playEntry(s, card) } }),
            h('div', { class: 'grow' }, h('div', { class: 'card-title', text: s.label }), h('div', { class: 'muted small mono', text: s.id })),
            h('div', { class: 'right small' }, h('div', { text: fmtSec(s.duration) }), peak),
          ),
          h('div', { class: 'muted small', text: `gain ${s.gain} - ${s.layerCount} layers (${s.summary})` }),
          h('div', { class: 'tags' }, ...users),
          h('details', {}, h('summary', { text: 'Layers' }), h('ul', { class: 'small mono' }, ...s.layers.map((l) => h('li', { text: l })))),
        ),
        `${s.id} ${s.label} ${s.group} ${s.usedBy.map((u) => `${u.name} ${u.owner.name}`).join(' ')}`,
        s.group,
      );
      cards.set(s.id, card);
      grid.append(card);
    }
    body.append(h('div', { class: 'group' }, h('div', { class: 'group-head' }, h('h3', { text: g }), h('span', { class: 'muted small', text: `${list.length}` }), playAll), grid));
  }
  root.append(body);

  // --- müzik: ana menü + sahne müzikleri (WebAudio bestesi; ▶ = önizleme, Codex kapanınca sahnenin müziğine döner) ---
  const trackBtns = new Map<string, HTMLButtonElement>();
  const syncTracks = (): void => {
    const on = musicPreviewing();
    for (const [id, b] of trackBtns) {
      b.textContent = on === id ? '■' : '▶';
      b.closest('article')?.classList.toggle('playing', on === id);
    }
  };
  root.append(
    h('h3', { class: 'sub', text: 'Soundtracks' }),
    h('p', { class: 'muted small', text: 'Synthesized music (data/audio-music.json, data/audio-music-tracks.json, data/audio-music-bosses.json). Uses the Music volume; scene changes crossfade. Preview stops when the Codex closes.' }),
    h(
      'div',
      { class: 'cards' },
      ...cat.soundtracks.map((t) => {
        const btn = h('button', { class: 'play', text: '▶', title: `Play ${t.label}`, attrs: { type: 'button', 'aria-label': `Play ${t.label}` } }) as HTMLButtonElement;
        btn.addEventListener('click', () => {
          previewMusic(musicPreviewing() === t.id ? null : (t.id as MusicTrack));
          syncTracks();
        });
        trackBtns.set(t.id, btn);
        return h('article', { class: 'card sound' }, h('div', { class: 'row' }, btn, h('div', { class: 'grow' }, h('div', { class: 'card-title', text: t.label }), h('div', { class: 'muted small mono', text: t.id }))), h('div', { class: 'muted small', text: t.desc }));
      }),
    ),
  );

  const refresh = (): number => {
    const n = applyFilter(body, query, group);
    countEl.textContent = `${n} / ${all.length}`;
    return n;
  };
  return {
    id: 'sounds',
    title: 'Sounds',
    total: all.length,
    root,
    setQuery: (q) => {
      query = q;
      return refresh();
    },
  };
}
