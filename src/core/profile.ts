// The player's profile: everything kept between runs, in one localStorage entry.
// A run never reads this directly. It takes a snapshot (metaSnapshot) when it starts, so a run is reproducible
// from its seed and its snapshot.
import { HERO_IDS, NPC_IDS, PIECES_MAX, STARTERS, emptyMeta, levelCap, levelCost, pieceLevel } from '../data/meta';
import { STAGE_COUNT } from '../data/stages';
import type { HeroId, Meta, NpcId } from '../data/meta';

// Debug only (#debug&roster): every hero is unlocked (one piece each) and every stage is open, the way the game was
// before they had to be earned. The regression tests use it so that their runs stay comparable across versions.
const ROSTER = typeof location !== 'undefined' && /debug/.test(location.hash) && /[#&]roster\b/.test(location.hash);

// v2 (뽑기) replaced v1 (수련, unlock conditions): v1 saves are not carried over.
const KEY = 'pungun-profile-v2',
  LEGACY_BEST = 'wuxia-best';

export type Profile = {
  v: 2;
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
};

const fresh = (): Profile => ({
  v: 2,
  coins: 0,
  best: 0,
  heroes: Object.fromEntries(HERO_IDS.map(id => [id, ROSTER || STARTERS.includes(id) ? 1 : 0])) as Profile['heroes'],
  levels: Object.fromEntries(HERO_IDS.map(id => [id, 1])) as Profile['levels'],
  bonds: Object.fromEntries(NPC_IDS.map(id => [id, 0])) as Profile['bonds'],
  stages: ROSTER ? STAGE_COUNT : 1,
  formation: [],
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
  // two different heroes the player has, or none
  const party = Array.isArray(raw.formation) ? raw.formation.filter(id => HERO_IDS.includes(id)) : [];
  if (party.length === 2 && party[0] !== party[1] && party.every(id => p.heroes[id] > 0)) p.formation = party;
  return p;
}

function read(): Profile {
  try {
    const text = localStorage.getItem(KEY);
    if (text) return sanitize(JSON.parse(text));
    // a new save: only the best score is carried over from older versions
    const p = fresh();
    p.best = whole(Number(localStorage.getItem(LEGACY_BEST)));
    try {
      p.best = Math.max(p.best, whole(JSON.parse(localStorage.getItem('pungun-profile') || '{}').best));
    } catch {
      // no older profile, or a broken one
    }
    return p;
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
  return m;
}

/**
 * Save code: the profile as text, to carry it to another copy of the game (a single HTML file opened from a
 * different place does not share storage). The prefix lets an import reject unrelated text.
 */
const CODE = 'PUNGUN2:';
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
