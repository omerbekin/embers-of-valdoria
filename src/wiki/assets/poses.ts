/**
 * Codex > Assets > POSES (Ömer 2026-10-11, Warrior poz denemesi): poz kütüphanesindeki her pozu, her silah görünümüyle, oyundaki AYNI
 * birleştirmeyle (src/game/poses.ts > drawPoseComposite) çizer. Üstte silah seçici + nadirlik ışıltısı + ayna (düşman tarafı); altta
 * "All weapons" ızgarası (her poz x her silah). Dosyalar: assets/poses/<dir>/<poz>.png, assets/weapons/<aile>/<görünüm>.png (+ small/).
 */
import { applyFilter, h, searchable, type SectionApi } from '../../gallery/dom';
import { POSES, allWeapons, drawPoseComposite, frameExtent, poseClassIds, type PoseClassDef, type WeaponPick } from '../../game/poses';
import { poseBodyUrl, weaponUrl } from '../../game/pose-files';

const cache = new Map<string, Promise<HTMLImageElement>>();
function load(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  let p = cache.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });
    cache.set(url, p);
  }
  return p.catch(() => null);
}

const label = (w: WeaponPick): string => `${w.family === 'swords' ? 'Sword' : w.family === 'axes' ? 'Axe' : w.family} · ${w.look}`;

/** Bir pozu kanvasa çizer (ayak ortası altta ortada, ortak çerçeve: tüm pozlar aynı ölçekte). */
async function paint(canvas: HTMLCanvasElement, def: PoseClassDef, pose: string, w: WeaponPick, mirror: boolean, scale: number): Promise<void> {
  const { halfW, up } = frameExtent(def, w);
  canvas.width = Math.ceil(halfW * 2 * scale);
  canvas.height = Math.ceil(up * scale);
  const [body, wimg] = await Promise.all([load(poseBodyUrl(def.dir, pose)), load(weaponUrl(w.family, w.look))]);
  const ctx = canvas.getContext('2d');
  if (!ctx || !body) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.scale(scale, scale);
  ctx.translate(halfW - def.canvas.footX, up - def.canvas.footY);
  drawPoseComposite(ctx, def, pose, body, wimg ? { img: wimg, pick: w } : null, 8 * scale);
  ctx.restore();
}

export function mountPoses(): SectionApi {
  const root = h('section', { class: 'section', attrs: { id: 'poses' } });
  const countEl = h('span', { class: 'count' });
  const ids = poseClassIds();
  // ana el görselleri (kalkan yalnızca ikinci el), ailenin tutuşuyla (büyük balta / gürz / asa çift el takımını çizer)
  const weapons = allWeapons()
    .filter((w) => POSES.weapons[w.family]?.hold !== 'offhand')
    .map((w): WeaponPick => {
      const hold = POSES.weapons[w.family]?.hold;
      return hold && hold !== 'one' && hold !== 'offhand' ? { ...w, grip: hold } : w;
    });
  let weapon: WeaponPick = weapons[0]!;
  let glow = '';
  let mirror = false;
  const cards: HTMLElement[] = [];
  const redraws: Array<() => void> = [];

  const toolbar = h('div', { class: 'chips' });
  const renderToolbar = (): void => {
    const chip = (text: string, on: boolean, click: () => void, title: string) => h('button', { class: `chip${on ? ' on' : ''}`, text, title, attrs: { type: 'button' }, on: { click } });
    toolbar.replaceChildren(
      ...weapons.map((w) => chip(label(w), w.family === weapon.family && w.look === weapon.look, () => ((weapon = w), refresh()), `Draw every pose with the ${w.look} ${w.family.replace(/s$/, '')}`)),
      chip('No glow', glow === '', () => ((glow = ''), refresh()), 'Common / Uncommon: no rarity glow'),
      ...Object.entries(POSES.rarityGlow).map(([r, hex]) => chip(r.charAt(0).toUpperCase() + r.slice(1), glow === hex, () => ((glow = hex), refresh()), `Rarity glow: ${r}`)),
      chip('Mirror (enemy side)', mirror, () => ((mirror = !mirror), refresh()), 'Enemies face left: the whole pose is mirrored'),
    );
  };
  const refresh = (): void => {
    renderToolbar();
    for (const r of redraws) r();
  };

  const blocks: HTMLElement[] = [];
  for (const id of ids) {
    const def = POSES.classes[id]!;
    const grid = h('div', { class: 'grid poses-grid' });
    for (const pose of Object.keys(def.poses)) {
      const canvas = h('canvas', { class: 'pose-canvas' }) as HTMLCanvasElement;
      const used = Object.entries(def.states).filter(([, p]) => p === pose).map(([s]) => s);
      const cyc = Object.entries(def.cycles).find(([, f]) => f.includes(pose))?.[0];
      const card = searchable(
        h('figure', { class: 'card pose-card' }, canvas, h('figcaption', {}, h('b', { text: pose }), h('span', { class: 'muted small', text: [cyc ? `${cyc} cycle` : '', used.length ? used.join(', ') : ''].filter(Boolean).join(' · ') }))),
        `${id} ${pose} ${cyc ?? ''} ${used.join(' ')}`,
      );
      cards.push(card);
      grid.append(card);
      redraws.push(() => void paint(canvas, def, pose, { ...weapon, ...(glow ? { glow } : {}) }, mirror, 0.5));
    }
    // her poz x her silah
    const matrix = h('div', { class: 'poses-matrix' });
    const head = h('div', { class: 'poses-row' }, h('span', { class: 'muted small poses-rowlabel', text: '' }), ...weapons.map((w) => h('span', { class: 'muted small poses-collabel', text: label(w) })));
    matrix.append(head);
    for (const pose of Object.keys(def.poses)) {
      const row = h('div', { class: 'poses-row' }, h('span', { class: 'small poses-rowlabel', text: pose }));
      for (const w of weapons) {
        const c = h('canvas', { class: 'pose-mini', title: `${pose} · ${label(w)}` }) as HTMLCanvasElement;
        row.append(c);
        redraws.push(() => void paint(c, def, pose, w, mirror, 0.25));
      }
      matrix.append(row);
    }
    blocks.push(
      h('h3', { text: `${id.charAt(0).toUpperCase() + id.slice(1)} (${Object.keys(def.poses).length} poses)` }),
      h('p', { class: 'muted small', text: `Body poses: assets/poses/${def.dir}/ (empty hands). The weapon is a separate layer drawn at each pose's hand point (data/poses.json). Skill poses come from skills.json "pose". Idle: ${def.idleSprite ? 'today\'s idle.png' : 'the idle pose'}.` }),
      grid,
      h('details', { class: 'wk-fold' }, h('summary', { text: 'All weapons (every pose with every weapon)' }), matrix),
    );
  }

  root.append(
    h('div', { class: 'section-head' }, h('h2', { text: 'Poses' }), countEl),
    h('p', { class: 'muted', text: 'The shared pose library (Warrior v1; warrior_v2 = the new one-handed + two-handed set used by the Pose Testers). Each skill shows one or more key poses; the equipped weapon (family + rarity) is drawn in the hand. Classes without poses keep their single sprite.' }),
    toolbar,
    ...blocks,
  );
  let shown = false;
  return {
    id: 'poses',
    title: 'Poses',
    total: cards.length,
    root,
    setQuery: (q) => {
      const n = applyFilter(root, q);
      countEl.textContent = `${n} / ${cards.length}`;
      return n;
    },
    onShow: () => {
      if (shown) return;
      shown = true;
      refresh();
    },
  };
}
