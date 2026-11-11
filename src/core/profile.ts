// The player's profile: everything kept between runs, in one localStorage entry.
// A run never reads this directly. It takes a snapshot (metaSnapshot) when it starts, so a run is reproducible
// from its seed and its snapshot. An empty profile plays exactly like the game without meta progression.
import { STATS, STAT_IDS, emptyMeta } from '../data/meta';
import type { Meta, StatId } from '../data/meta';

const KEY = 'pungun-profile',
  LEGACY_BEST = 'wuxia-best';

export type Profile = {
  v: 1;
  /** 엽전 kept between runs */
  coins: number;
  stats: Record<StatId, number>;
  best: number;
};

const fresh = (): Profile => ({ v: 1, coins: 0, stats: emptyMeta().stats, best: 0 });

const whole = (n: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;

/** Builds a valid profile from anything: missing or damaged fields fall back to their defaults. */
export function sanitize(raw: any): Profile {
  const p = fresh();
  if (!raw || typeof raw !== 'object') return p;
  p.coins = whole(raw.coins);
  p.best = whole(raw.best);
  for (const id of STAT_IDS) p.stats[id] = whole(raw.stats?.[id], STATS[id].costs.length);
  return p;
}

function read(): Profile {
  try {
    const text = localStorage.getItem(KEY);
    if (text) return sanitize(JSON.parse(text));
    // first launch with this save format: carry the old best score over
    const p = fresh();
    p.best = whole(Number(localStorage.getItem(LEGACY_BEST)));
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

export function metaSnapshot(): Meta {
  return { stats: { ...profile.stats } };
}

export function statCost(id: StatId): number | null {
  return STATS[id].costs[profile.stats[id]] ?? null;
}

/** Buys the next level of a stat. Returns false when it is maxed or the bank is short. */
export function buyStat(id: StatId): boolean {
  const cost = statCost(id);
  if (cost === null || profile.coins < cost) return false;
  profile.coins -= cost;
  profile.stats[id]++;
  saveProfile();
  return true;
}

/**
 * Save code: the profile as text, to carry it to another copy of the game (a single HTML file opened from a
 * different place does not share storage). The prefix lets an import reject unrelated text.
 */
const CODE = 'PUNGUN1:';
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
