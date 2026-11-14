// The player's profile: everything kept between runs, in one localStorage entry.
// A run never reads this directly. It takes a snapshot (metaSnapshot) when it starts, so a run is reproducible
// from its seed and its snapshot.
import { HERO_IDS, NPC_IDS, PIECES_MAX, STARTERS, emptyMeta, pieceLevel } from '../data/meta';
import type { HeroId, Meta, NpcId } from '../data/meta';

// Debug only (#debug&roster): every hero and every 인연 card is unlocked (one piece each), the way the game was
// before they had to be drawn. The regression tests use it so that their runs stay comparable across versions.
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
  /** 인연 card pieces: 1 makes the card (the 인연 appears in runs), more raise its level */
  cards: Record<NpcId, number>;
};

const fresh = (): Profile => ({
  v: 2,
  coins: 0,
  best: 0,
  heroes: Object.fromEntries(HERO_IDS.map(id => [id, ROSTER || STARTERS.includes(id) ? 1 : 0])) as Profile['heroes'],
  cards: Object.fromEntries(NPC_IDS.map(id => [id, ROSTER ? 1 : 0])) as Profile['cards'],
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
  for (const id of NPC_IDS) p.cards[id] = Math.max(p.cards[id], whole(raw.cards?.[id], PIECES_MAX));
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
export const cardOf = (id: NpcId) => pieceLevel(profile.cards[id]);

export function metaSnapshot(): Meta {
  const m = emptyMeta();
  for (const id of HERO_IDS) m.heroes[id] = Math.max(0, heroStars(id) - 1);
  for (const id of NPC_IDS) m.cards[id] = cardOf(id);
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
