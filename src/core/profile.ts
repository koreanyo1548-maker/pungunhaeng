// The player's profile: everything kept between runs, in one localStorage entry.
// A run never reads this directly. It takes a snapshot (metaSnapshot) when it starts, so a run is reproducible
// from its seed and its snapshot.
import {
  HERO_IDS,
  NPC_IDS,
  PIECES_MAX,
  STARTERS,
  emptyMeta,
  levelCap,
  levelCost,
  pieceLevel,
  playable,
} from '../data/meta';
import { STAGE_COUNT } from '../data/stages';
import { GEAR_ITEMS, GRADE_MAX, PLUS_MAX, SLOTS, enchantPool, enchantValue, gearFactors } from '../data/gear';
import type { Gear, GearItemId, Slot } from '../data/gear';
import type { FactorId } from '../data/factors';
import type { HeroId, Meta, NpcId } from '../data/meta';

// Debug only (#debug&roster): every hero is unlocked (one piece each) and every stage is open, the way the game was
// before they had to be earned. The regression tests use it so that their runs stay comparable across versions.
const ROSTER = typeof location !== 'undefined' && /debug/.test(location.hash) && /[#&]roster\b/.test(location.hash);

// v3 (장비, docs/equipment-plan.md) starts over: v2 and older saves are not carried over.
const KEY = 'pungun-profile-v3';

export type Profile = {
  v: 3;
  /** 엽전 kept between runs, spent on 뽑기 */
  coins: number;
  best: number;
  /** hero pieces: 1 unlocks the hero, more raise its 성급 */
  heroes: Record<HeroId, number>;
  /** each hero's level: 1 to 10 × 성급, raised with 엽전 (levelUp) */
  levels: Record<HeroId, number>;
  /** 호감도 of each 인연: +1 every time their 의뢰 is followed; it sets the 인연's level (1·3·6·10·15) */
  bonds: Record<NpcId, number>;
  /** stages opened, 1 to 6: beating a stage's boss opens the next */
  stages: number;
  /** the last run's party (선봉, 후발), filled in on the formation screen; empty before the first run */
  formation: HeroId[];
  /** 장비 held (docs/equipment-plan.md) */
  gear: Gear[];
  /** each hero's equipped gear: a uid per slot */
  equipped: Record<HeroId, Partial<Record<Slot, number>>>;
  /** the uid the next piece of gear gets */
  nextUid: number;
};

const fresh = (): Profile => ({
  v: 3,
  coins: 0,
  best: 0,
  heroes: Object.fromEntries(HERO_IDS.map(id => [id, ROSTER || STARTERS.includes(id) ? 1 : 0])) as Profile['heroes'],
  levels: Object.fromEntries(HERO_IDS.map(id => [id, 1])) as Profile['levels'],
  bonds: Object.fromEntries(NPC_IDS.map(id => [id, 0])) as Profile['bonds'],
  stages: ROSTER ? STAGE_COUNT : 1,
  formation: [],
  gear: [],
  equipped: Object.fromEntries(HERO_IDS.map(id => [id, {}])) as Profile['equipped'],
  nextUid: 1,
});

const whole = (n: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;

/** Builds a valid profile from anything: missing or damaged fields fall back to their defaults. */
export function sanitize(raw: any): Profile {
  const p = fresh();
  if (!raw || typeof raw !== 'object') return p;
  p.coins = whole(raw.coins);
  p.best = whole(raw.best);
  // the starters (and, in debug, everyone) always keep at least their first piece
  for (const id of HERO_IDS) p.heroes[id] = Math.max(p.heroes[id], whole(raw.heroes?.[id], PIECES_MAX));
  // a level stays within what the hero's 성급 allows; 인연 card pieces of older saves are not carried over
  for (const id of HERO_IDS) p.levels[id] = Math.max(1, whole(raw.levels?.[id], levelCap(pieceLevel(p.heroes[id]))));
  for (const id of NPC_IDS) p.bonds[id] = whole(raw.bonds?.[id]);
  p.stages = Math.max(p.stages, whole(raw.stages, STAGE_COUNT));
  // two different heroes in play the player has, or none
  const party = Array.isArray(raw.formation) ? raw.formation.filter(playable) : [];
  if (party.length === 2 && party[0] !== party[1] && party.every(id => p.heroes[id] > 0)) p.formation = party;
  // gear: known items within their 등급 and 강화, each uid once
  const uids = new Set<number>();
  for (const g of Array.isArray(raw.gear) ? raw.gear : []) {
    const uid = whole(g?.uid);
    if (!uid || uids.has(uid) || !(g?.item in GEAR_ITEMS)) continue;
    const item = g.item as GearItemId,
      gear: Gear = { uid, item, grade: Math.max(1, whole(g.grade, GRADE_MAX)), plus: whole(g.plus, PLUS_MAX) };
    const f = g.enchant?.factor as FactorId;
    if (f && enchantPool(GEAR_ITEMS[item].slot).includes(f)) gear.enchant = { factor: f, value: enchantValue(f) };
    uids.add(uid);
    p.gear.push(gear);
  }
  p.nextUid = Math.max(whole(raw.nextUid), ...p.gear.map(g => g.uid + 1), 1);
  // equipped: a held piece in its own slot, worn by one hero only
  const worn = new Set<number>();
  for (const id of HERO_IDS)
    for (const slot of SLOTS) {
      const uid = whole(raw.equipped?.[id]?.[slot]),
        g = p.gear.find(x => x.uid === uid);
      if (!g || worn.has(uid) || GEAR_ITEMS[g.item].slot !== slot) continue;
      worn.add(uid);
      p.equipped[id][slot] = uid;
    }
  return p;
}

function read(): Profile {
  try {
    const text = localStorage.getItem(KEY);
    return text ? sanitize(JSON.parse(text)) : fresh();
  } catch {
    return fresh();
  }
}

export const profile: Profile = read();

export function saveProfile() {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // private mode or a full disk: the game still runs, the profile just lives for this session
  }
}

/** Replaces the whole profile (import, tests). */
export function loadProfile(raw: unknown) {
  Object.assign(profile, sanitize(raw));
  saveProfile();
}

export const heroOwned = (id: HeroId) => profile.heroes[id] > 0;
/** a hero's 성급, 1 to 5 (0: not unlocked) */
export const heroStars = (id: HeroId) => pieceLevel(profile.heroes[id]);
/** an 인연's level from 호감도, 0 to 5 */
export const bondOf = (id: NpcId) => pieceLevel(profile.bonds[id]);
/** a hero's level, and the highest its 성급 allows */
export const heroLevelOf = (id: HeroId) => profile.levels[id];
export const heroLevelCap = (id: HeroId) => levelCap(heroStars(id));
/** 엽전 for the next level, or null when the hero is not joined or at its cap */
export function levelUpCost(id: HeroId): number | null {
  return heroOwned(id) && profile.levels[id] < heroLevelCap(id) ? levelCost(profile.levels[id]) : null;
}
/** Raises a hero one level with banked 엽전. False when it cannot (cap, not joined, short of 엽전). */
export function levelUp(id: HeroId): boolean {
  const cost = levelUpCost(id);
  if (cost === null || profile.coins < cost) return false;
  profile.coins -= cost;
  profile.levels[id]++;
  saveProfile();
  return true;
}
/** Following an 인연's 의뢰 raises their 호감도 at once (saved); the run keeps the level it started with. */
export function addBond(id: NpcId) {
  profile.bonds[id]++;
  saveProfile();
}
/** Opens the stage after `stage` (its boss was beaten). True when that stage was not open before. */
export function openNextStage(stage: number): boolean {
  const next = Math.min(STAGE_COUNT, stage + 1);
  if (next <= profile.stages) return false;
  profile.stages = next;
  return true;
}

export function metaSnapshot(): Meta {
  const m = emptyMeta();
  for (const id of HERO_IDS) m.heroes[id] = Math.max(0, heroStars(id) - 1);
  for (const id of HERO_IDS) m.levels[id] = profile.levels[id];
  for (const id of NPC_IDS) m.cards[id] = bondOf(id);
  for (const id of HERO_IDS) m.gear[id] = equippedGear(id).flatMap(gearFactors);
  return m;
}

// ---- 장비 (docs/equipment-plan.md, 3장)
export const gearOf = (uid: number | undefined) => profile.gear.find(g => g.uid === uid);
/** what a hero wears, slot by slot */
export const equippedGear = (id: HeroId): Gear[] =>
  SLOTS.map(slot => gearOf(profile.equipped[id]?.[slot])).filter((g): g is Gear => !!g);
/** the hero wearing a piece, if any */
export const wearer = (uid: number): HeroId | undefined =>
  HERO_IDS.find(id => SLOTS.some(slot => profile.equipped[id]?.[slot] === uid));
/** Adds a new piece of gear (saved). */
export function addGear(item: GearItemId, grade: number): Gear {
  const g: Gear = { uid: profile.nextUid++, item, grade, plus: 0 };
  profile.gear.push(g);
  saveProfile();
  return g;
}
/** Puts a piece on a hero (taking it off whoever wore it), or empties the slot with null. */
export function equip(id: HeroId, slot: Slot, uid: number | null) {
  if (uid !== null) {
    const g = gearOf(uid);
    if (!g || GEAR_ITEMS[g.item].slot !== slot) return;
    const other = wearer(uid);
    if (other) delete profile.equipped[other][slot];
    profile.equipped[id][slot] = uid;
  } else delete profile.equipped[id][slot];
  saveProfile();
}
/** Removes a piece (used up as a material): it comes off whoever wore it. */
export function removeGear(uid: number) {
  const other = wearer(uid);
  if (other) for (const slot of SLOTS) if (profile.equipped[other][slot] === uid) delete profile.equipped[other][slot];
  profile.gear = profile.gear.filter(g => g.uid !== uid);
}

/**
 * Save code: the profile as text, to carry it to another copy of the game (a single HTML file opened from a
 * different place does not share storage). The prefix lets an import reject unrelated text.
 */
const CODE = 'PUNGUN3:';
export function exportCode(): string {
  return CODE + btoa(unescape(encodeURIComponent(JSON.stringify(profile))));
}
export function importCode(text: string): boolean {
  try {
    const t = text.trim();
    if (!t.startsWith(CODE)) return false;
    loadProfile(JSON.parse(decodeURIComponent(escape(atob(t.slice(CODE.length))))));
    return true;
  } catch {
    return false;
  }
}
