import { classGroupRank, sortByPrimary } from '../src/game/class-order';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { battleRulesArticle, buildWiki, drownedReachArticle, drownedReachShown, stripNow, type WikiBlock, type WikiFiles } from '../src/wiki/catalog';
import { UI_ICONS } from '../src/ui/dom-icons';
import { ICON_KINDS } from '../src/ui/icon-kinds';
import { ITEMS, itemDef, weaponPowerOf } from '../src/progression';
import { CONFIG as CAMPAIGN_CONFIG } from '../src/campaign';
const replayXp = CAMPAIGN_CONFIG.replay?.xp ?? [1];

function scan(dir: string, depth: 1 | 2): Record<string, string> {
  const root = join(__dirname, '..', 'assets', dir);
  const out: Record<string, string> = {};
  if (!existsSync(root)) return out;
  for (const a of readdirSync(root, { withFileTypes: true })) {
    if (depth === 1 && a.isFile() && a.name.endsWith('.png')) out[`assets/${dir}/${a.name}`] = join(root, a.name);
    if (depth === 2 && a.isDirectory()) for (const f of readdirSync(join(root, a.name))) if (f.endsWith('.png')) out[`assets/${dir}/${a.name}/${f}`] = join(root, a.name, f);
  }
  return out;
}
const files: WikiFiles = { sprites: scan('sprites', 2), avatars: scan('avatars', 1) };
const wiki = buildWiki(files);
const blockText = (b: WikiBlock): string[] => (b.kind === 'p' ? [b.text] : b.kind === 'list' ? b.items : [...b.head, ...b.rows.flat()]);

describe('Wiki kataloğu (sağ üst kitap simgesi)', () => {
  it('kitap ikonu tanımlı ve arayüz ikonu olarak kullanılıyor', () => {
    expect(ICON_KINDS as readonly string[]).toContain('book');
    expect(UI_ICONS as readonly string[]).toContain('book');
  });

  it('wiki class listesi primary statına göre sıralı (STR, DEX, INT, LUCK; test class yok)', () => {
    const ranks = wiki.classes.map((c) => classGroupRank(content.classes[c.id]!));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    expect(wiki.classes.map((c) => c.id)).toEqual(sortByPrimary(Object.values(content.classes).filter((d) => !d.hidden)).map((d) => d.id));
  });

  it('tüm class ve çağrılar kartlarıyla, sprite/avatar/logo/skill/pasifleriyle yer alır', () => {
    expect(wiki.classes.map((c) => c.id).sort()).toEqual(Object.keys(content.classes).filter((id) => !content.classes[id]!.hidden).sort());
    expect(wiki.summons.map((c) => c.id).sort()).toEqual(Object.keys(content.summons).sort());
    for (const u of [...wiki.classes, ...wiki.summons]) {
      const def = content.classes[u.id] ?? content.summons[u.id]!;
      expect(u.spriteUrl, `${u.id} sprite`).not.toBeNull();
      expect(u.avatarUrl, `${u.id} avatar`).not.toBeNull();
      expect(u.logo).toBe(def.logo);
      expect(u.skills.map((s) => s.id), u.id).toEqual(def.skills);
      expect(u.derived.map((d) => d.key)).toEqual(expect.arrayContaining(['hp', 'mp', 'spd', 'evasion', 'accuracy', 'critChance', 'armor', 'magicArmor', 'hpRegen', 'mpRegen']));
      expect(u.attributes).toHaveLength(4);
      if (u.kind === 'class') {
        expect(u.role, `${u.id} role`).not.toBe('');
        expect(u.primaryBonus, `${u.id} primary bonus`).not.toBeNull();
        expect(u.primaryBonus!.name.length).toBeGreaterThan(0);
        expect(u.primaryBonus!.text.length).toBeGreaterThan(10);
      }
      if (def.passive) expect(u.passive?.text.length, `${u.id} passive`).toBeGreaterThan(10);
    }
    for (const c of wiki.classes) expect(c.skills).toHaveLength(4);
  });

  it('skill yuvası (1-4) sahibin skills dizisine uyar; Melee/Ranged/Support/Self etiketi veriden türer', () => {
    for (const u of [...wiki.classes, ...wiki.summons]) {
      const def = content.classes[u.id] ?? content.summons[u.id]!;
      expect(u.skills.map((s) => s.slot), u.id).toEqual(def.skills.map((_, i) => i + 1));
      for (const s of u.skills) {
        const sk = content.skills[s.id]!;
        if (sk.motion === 'melee') expect(s.range, s.id).toBe('Melee');
        else if (sk.target === 'self') expect(s.range, s.id).toBe('Self');
        else if (['single_ally', 'dead_ally', 'all_allies'].includes(sk.target)) expect(s.range, s.id).toBe('Support');
        else expect(s.range, s.id).toBe('Ranged');
      }
    }
    // düz skill listesi: sahibine göre gruplu, grup içinde yuva sırasıyla
    const bySlot = new Map<string, number>();
    for (const s of wiki.skills) {
      if (s.slot === null) continue;
      expect(s.slot, s.id).toBeGreaterThan(bySlot.get(s.owner.id) ?? 0);
      bySlot.set(s.owner.id, s.slot);
    }
    const bossText = JSON.stringify(wiki.mechanics.filter((a) => a.id.startsWith('boss-')));
    for (const b of Object.values(content.bosses)) b.skills.forEach((id, i) => expect(bossText).toContain(`${i + 1}. ${content.skills[id]!.name} [`));
  });

  it('tüm skill listelenir; ad, hedef rozeti, bedel, cooldown ve açıklaması boş değildir', () => {
    // test class'larının (Geometer, Pose Tester'lar) skill'leri Codex'te yok: yalnızca debug menüsünde
    const testOf = new Set(Object.values(content.classes).filter((c) => c.testOnly).flatMap((c) => c.skills));
    expect(wiki.skills.map((s) => s.id).sort()).toEqual(Object.keys(content.skills).filter((id) => !testOf.has(id)).sort());
    for (const s of wiki.skills) {
      expect(s.name, s.id).not.toBe('');
      expect(s.targetBadge, s.id).not.toBe('');
      expect(s.cost, s.id).not.toBe('');
      expect(s.cooldown, s.id).not.toBe('');
      expect(s.lines.length, `${s.id} açıklaması`).toBeGreaterThan(0);
      for (const l of s.lines) expect(l.trim(), s.id).not.toBe('');
      expect(s.owner.kind, `${s.id} sahipsiz`).not.toBe('other');
    }
  });

  it('tüm durumlar ve zeminler ikon, renk ve açıklamayla listelenir', () => {
    expect(wiki.statuses.map((s) => s.id).sort()).toEqual(Object.keys(content.statuses).sort());
    expect(wiki.grounds.map((g) => g.id).sort()).toEqual(Object.keys(content.grounds).sort());
    for (const s of wiki.statuses) {
      expect(s.icon).not.toBe('');
      expect(s.color).toMatch(/^#/);
      expect(s.text.trim(), s.id).not.toBe('');
    }
    for (const g of wiki.grounds) {
      expect(g.icon).not.toBe('');
      expect(g.text.trim(), g.id).not.toBe('');
    }
  });

  it('Mechanics: her stat, her primary bonus ve ana mekanikler var; boş metin ve şimdiki değer sızıntısı yok', () => {
    const ids = wiki.mechanics.map((a) => a.id);
    for (const k of ['str', 'int', 'dex', 'luck', 'hp', 'mp', 'spd', 'critChance', 'accuracy', 'evasion', 'armor', 'magicArmor']) expect(ids, k).toContain(`stat-${k}`);
    for (const k of ['str', 'dex', 'int', 'luck']) expect(ids).toContain(`bonus-${k}`);
    for (const k of ['damage-formula', 'hit-chance', 'ground', 'gamble', 'corpses', 'summons', 'revive', 'rage', 'actions', 'area-shapes']) expect(ids, k).toContain(k);
    for (const name of ['Resilience', "Hunter's Mark", 'Mana Echo', 'Lucky Escape']) expect(wiki.mechanics.some((a) => a.title === name), name).toBe(true);
    for (const a of [...wiki.mechanics, ...wiki.gettingStarted]) {
      expect(a.blocks.length, a.id).toBeGreaterThan(0);
      for (const t of a.blocks.flatMap(blockText)) {
        expect(t.trim(), `${a.id} boş metin`).not.toBe('');
        expect(t, `${a.id} şimdiki değer sızdı`).not.toMatch(/\(now |, now |undefined|NaN/);
      }
    }
  });

  it('Rage, global eylemler (Rest/Skip/Move) ve miss/dodge ayrımı Mechanics içinde yazılıdır; sayılar veriden', () => {
    const text = (id: string) => wiki.mechanics.find((a) => a.id === id)!.blocks.flatMap(blockText).join(' ');
    const r = content.formulas.rage;
    expect(text('rage')).toContain(`0 to ${r.max}`);
    expect(text('rage')).toContain(String(r.perHitCap));
    expect(text('rage')).toContain(content.skills.headsmans_blow!.name);
    // Berserker (Ömer 2026-10-17): hasar alınca Rage + Headsman's Blow'un tüm Rage'i harcaması; sayılar veriden
    const berserker = content.classes.warrior!.passive!.effect as { rageOnHurt?: { perHpPercent: number; perHitCap?: number } };
    expect(text('rage')).toContain(`${berserker.rageOnHurt!.perHpPercent} per 1% of max HP lost`);
    expect(text('rage')).toContain(`spends ALL your Rage (at least ${content.skills.headsmans_blow!.cost.amount})`);
    for (const d of Object.values(content.globalSkills)) expect(text('actions'), d.id).toContain(d.name);
    expect(text('actions')).toContain(`${content.globalSkills.rest!.mp} MP`);
    expect(text('actions')).toContain('next turn arrives in half the time');
    const hit = text('hit-chance');
    expect(hit).toContain('Dodge');
    expect(hit).toContain('MISS');
    expect(wiki.gettingStarted.flatMap((a) => a.blocks.flatMap(blockText)).join(' ')).toContain(`${content.formulas.attributes.mpBase} base MP`);
  });

  it('son sistemler Codex\'te yazılıdır: Endless, nadir düşüş + kötü şans koruması, nadirlik zarı, Battle speed, yenilenme, item kaynaklı durumlar', () => {
    const text = (id: string) => [...wiki.mechanics, ...wiki.gettingStarted].find((a) => a.id === id)!.blocks.flatMap(blockText).join(' ');
    const endless = text('endless');
    for (const w of ['wound', 'corpse', 'Odo', 'buy back', 'Reroll', 'Relics', 'Mana starts full in every wave', 'Cooldowns']) expect(endless, w).toContain(w);
    // Sefer Retreat to Map savaşı duraklatır (Ömer 2026-10-14)
    const campaign = text('campaign');
    for (const w of ['Retreat to Map', 'paused, not reset', 'Resume Battle']) expect(campaign, w).toContain(w);
    // Serbest dolaşım ve devriye (2026-10-18): yüzdeler veriden (campaign.json > replay.xp)
    for (const w of ['Free roaming', 'Patrols return to cleared battlefields', 'Patrol badge', ...replayXp.slice(1).map((x) => `${Math.round(x * 100)}%`)]) expect(campaign, w).toContain(w);
    const items = text('items');
    expect(items).toContain('Rare drops');
    expect(items).toContain('bad-luck protection');
    expect(items).toContain('in its top');
    expect(items).toContain('+25% crit chance');
    expect(items).toContain('40% debuff resistance');
    expect(items).not.toMatch(/Might/);
    // Item Güçlendirme (2026-10-17): silah gücü, başlangıç silahı, seviye şartı; sayılar veriden
    for (const w of ['Weapon power', '(1 + power / 100)', 'Starter weapons', 'Greataxe', 'Requires Level X', `item level - ${ITEMS.levelReq.offset}`, "A shield's base value is its block chance"]) expect(items, w).toContain(w);
    expect(items).toContain(`${weaponPowerOf(itemDef('woodcutters_axe')!, 30)} at 30`);
    expect(text('turns')).toContain('Battle speed');
    expect(text('mana')).toContain('"+2 MP"');
    const st = (id: string) => wiki.statuses.find((s) => s.id === id)!;
    for (const id of ['burning', 'fleet']) if (content.statuses[id]) expect(st(id).usedByItems.length, id).toBeGreaterThan(0);
  });

  it('bahis (gamble) skilleri Mechanics içinde yazılıdır', () => {
    const gamble = wiki.mechanics.find((a) => a.id === 'gamble')!;
    const text = gamble.blocks.flatMap(blockText).join('\n');
    for (const s of Object.values(content.skills)) if (s.effects.some((e) => e.type === 'damage' && e.bet)) expect(text, s.name).toContain(s.name);
  });

  it('sayılar formulas.json içinden gelir (eşik, dizilim, evasion adımı, zırh k, zayıflıklar)', () => {
    const f = content.formulas;
    const start = wiki.gettingStarted.flatMap((a) => a.blocks.flatMap(blockText)).join('\n');
    expect(start).toContain(String(f.turn.threshold));
    expect(start).toContain(`${f.formation.rows} x ${f.formation.lanes}`);
    const mech = wiki.mechanics.flatMap((a) => a.blocks.flatMap(blockText)).join('\n');
    expect(mech).toContain(`armor + ${f.armor.k}`);
    expect(mech).toContain(`${f.attributes.dexPerEvasionStep} Dexterity`);
    const head = wiki.elementTable.head.map((x) => x.toLowerCase());
    for (const [tag, m] of Object.entries(f.weaknesses))
      for (const [el, mult] of Object.entries(m)) expect(wiki.elementTable.rows.find((r) => r[0]!.toLowerCase() === tag)?.[head.indexOf(el)]).toBe(`x${mult}`);
  });

  it('Getting Started: tur sırası, takım, dizilim, MP ve cooldown başlıkları var; test modundan söz edilmez', () => {
    const ids = wiki.gettingStarted.map((a) => a.id);
    for (const k of ['goal', 'turns', 'formation', 'mana']) expect(ids).toContain(k);
    expect(wiki.gettingStarted.flatMap((a) => a.blocks.flatMap(blockText)).join(' ').toLowerCase()).not.toContain('test mode');
  });

  it('elementler: her element rengiyle yer alır, zayıflık verisi tabloda', () => {
    expect(wiki.elements.map((e) => e.id).sort()).toEqual(['arcane', 'dark', 'fire', 'holy', 'ice', 'lightning', 'nature', 'physical']);
    for (const e of wiki.elements) expect(e.color).toMatch(/^#/);
    expect(wiki.elementTable.rows.length).toBe(Object.keys(content.formulas.weaknesses).length);
  });

  it('stripNow: şimdiki değer parçalarını atar', () => {
    expect(stripNow('Max MP: +2 per point (now 40)')).toBe('Max MP: +2 per point');
    expect(stripNow('Accuracy: +1% per point (base 80%, now 90%); misses')).toBe('Accuracy: +1% per point; misses');
  });
});

describe('Wiki: test class\'ı ve alan şekilleri', () => {
  it('testOnly class (Geometer) wiki\'de görünür ve testOnly işaretlidir; diğerleri değil', () => {
    // Geometer şimdilik gizli (hidden): wiki'de görünmez; diğer class'lar testOnly değildir
    expect(wiki.classes.find((c) => c.id === 'aoe_tester')).toBeUndefined();
    for (const c of wiki.classes) expect(c.testOnly, c.id).toBe(false);
  });

  it('Mechanics: "Area shapes" makalesi row/column/block/cross kurallarını anlatır', () => {
    const text = wiki.mechanics.find((a) => a.id === 'area-shapes')!.blocks.flatMap(blockText).join(' ');
    for (const w of ['Row', 'Column', 'Block', 'Cross', 'bottom-left', 'slides', 'empty']) expect(text, w).toContain(w);
  });

  it('Mechanics: "Enemy passives" her sefer mobu pasifini (YM1-YM19) sahipleriyle yazar; Enemies makaleleri yeni aileleri (Brann Order, Beasts) ve pasifleri gösterir', () => {
    const text = wiki.mechanics.find((a) => a.id === 'enemy-passives')!.blocks.flatMap(blockText).join(' ');
    for (const m of Object.values(content.mobs)) if (m.passive) {
      expect(text, m.passive.name).toContain(m.passive.name);
      expect(text, m.name).toContain(m.name);
    }
    const ground = wiki.mechanics.find((a) => a.id === 'ground')!.blocks.flatMap(blockText).join(' ');
    expect(ground).toContain('Last Ember');
    const enemies = JSON.stringify(buildWiki(files));
    expect(enemies).toContain("Brann's Order");
    for (const id of ['deep_runecaller', 'grave_chanter', 'oathsworn_brother', 'censer_monk', 'high_priest_of_the_undying']) expect(enemies, id).toContain(content.mobs[id]!.name);
    // Bölge I (YM14-YM19, mob-plan.md 9): yeni aile Beasts ve tutorial mobları
    expect(enemies).toContain('Beasts');
    for (const id of ['cutpurse', 'grey_wolf', 'ravenwood_poacher', 'raven_seer', 'bandit_chief']) expect(enemies, id).toContain(content.mobs[id]!.name);
    for (const name of ['Grudge', 'Head Start', 'Pack Tactics', 'Hide in the Brush', 'Flock Shield', 'Shares of the Dead']) expect(text, name).toContain(name);
    // Bölge III (YM20-YM23, mob-plan.md 10): yeni aile Morvane's Army, yeni ve gelişmiş moblar; Lord Morvane'ın boss makalesi
    expect(enemies).toContain("Morvane's Army");
    for (const id of ['morvane_halberdier', 'sworn_guard', 'ash_hound', 'cinder_gatewarden', 'ember_hierophant', 'drake_priest']) expect(enemies, id).toContain(content.mobs[id]!.name);
    for (const name of ['Close Ranks', 'Blood Scent', 'Molten Shed', 'Searing Rebuke']) expect(text, name).toContain(name);
    for (const name of ['Lord Morvane', 'Crown of Ash', 'Pyre of Morvane', 'Ashfall', 'Iron Decree']) expect(enemies, name).toContain(name);
  });
});

describe('Codex boyalı ikonları (assets/misc-icons/codex, docs/design/art/codex-icons.md)', () => {
  const all = [...wiki.gettingStarted, ...wiki.lessons, ...wiki.mechanics];
  const byId = (id: string) => all.find((a) => a.id === id)!;

  it('Getting Started / Mechanics / Lessons makaleleri plandaki boyalı ikonu kullanır', () => {
    const want: Record<string, string> = {
      goal: 'codex:gs_goal', turns: 'codex:gs_turns', screen: 'codex:gs_screen', formation: 'ui:formation', range: 'ui:range',
      'damage-formula': 'codex:mech_damage', ground: 'codex:mech_ground', 'enemy-passives': 'codex:mech_enemy_passives', gamble: 'codex:mech_gamble',
      rage: 'ui:rage', 'area-shapes': 'codex:mech_area', actions: 'ui:move', corpses: 'fx:corpse', shields: 'fx:barrier', 'half-turn': 'codex:mech_half_turn',
      multiplayer: 'codex:mech_multiplayer', campaign: 'codex:mech_campaign', 'legendary-items': 'codex:mech_legendary', 'item-affixes': 'codex:mech_affixes',
      levels: 'codex:mech_levels', endless: 'codex:mech_endless', valor: 'codex:mech_valor', items: 'ui:gear', control: 'taunt2',
    };
    for (const [id, icon] of Object.entries(want)) {
      const a = byId(id);
      if (!a && id === 'range') continue; // range.enabled kapalıysa makale yok
      expect(a, id).toBeTruthy();
      expect(a.icon, id).toBe(icon);
    }
    for (const l of wiki.lessons) expect(l.icon).toBe('codex:nav_lessons');
  });

  it('skill ikonu kullanan makaleler sahibini taşır; boss ve düşman makaleleri portre alır', () => {
    expect(byId('backstab').owner).toBe('cutthroat');
    expect(byId('revive').owner).toBe('paladin');
    expect(byId('dark-bond').owner).toBe('undead');
    const bosses = wiki.mechanics.filter((a) => a.group === 'Bosses' || a.group === 'Enemies');
    expect(bosses.length).toBeGreaterThan(0);
    for (const a of bosses) expect(a.avatarUrl, a.id).toBeTruthy();
  });

  it('sol menü: her bölümün Codex ikonu var; eksik dosyada eski ikon', async () => {
    const { CODEX_SECTIONS, NAV_CODEX_ICON, navIconName, weaknessIconName } = await import('../src/wiki/codex');
    const { ASSET_NAV } = await import('../src/wiki/assets/nav');
    for (const s of [...CODEX_SECTIONS, ...ASSET_NAV]) expect(navIconName(s.id, s.icon), s.id).toBe(`codex:${NAV_CODEX_ICON[s.id]}`);
    expect(Object.keys(NAV_CODEX_ICON)).toHaveLength(16);
    expect(navIconName('nope', 'sword')).toBe('sword');
    expect(weaknessIconName()).toBe('codex:el_weakness');
  });
});

describe('Codex: The Drowned Reach (Harita 2, bayrak arkasında)', () => {
  it('sayfa yalnız bayrak açıkken Codex menüsünde (Harita 2 açık: Ömer 2026-10-26); sayfa metni harita verisinden', () => {
    expect(wiki.mechanics.some((a) => a.id === 'drowned-reach')).toBe(drownedReachShown());
    const a = drownedReachArticle();
    expect(a.title).toBe('The Drowned Reach');
    const text = a.blocks.flatMap(blockText).join(' ');
    for (const w of ['83 stops', '6 regions', 'Saltmere', "Fisher's Landing", 'The Long Stair', 'Throne of Brine']) expect(text, w).toContain(w);
  });

  it('Battle rules sayfası (bayrak arkasında): koşul, üç hedef ve güverte veriden', () => {
    expect(wiki.mechanics.some((a) => a.id === 'battle-rules')).toBe(drownedReachShown());
    const text = battleRulesArticle().blocks.flatMap(blockText).join(' ');
    for (const w of ['Tide', 'Soaked', 'Flooded', 'Hold out for 6 turns', 'Break the Totem', 'every 2 turns', 'Hold the Bridge', "Ship's deck"]) expect(text, w).toContain(w);
    expect(text).not.toMatch(/\{n\}|\{every\}/);
  });
});
