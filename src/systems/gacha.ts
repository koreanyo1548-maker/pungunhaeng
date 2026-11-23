// 뽑기: spend banked 엽전 on hero pieces. Runs between runs only (title, result screen).
// Draws use Math.random, never the seeded run streams (core/rng.ts), so drawing cannot change any run.
// 인연 are not drawn: they grow by 호감도 in runs (core/profile.ts addBond).
import { profile, saveProfile } from '../core/profile';
import { DRAW_COST, PIECES_MAX, PLAYABLE_HEROES, pieceLevel } from '../data/meta';

export type Drawn = {
  kind: 'hero';
  id: string;
  /** pieces after this draw */
  pieces: number;
  /** 성급 before and after this draw */
  from: number;
  to: number;
};

/** what can still come out: heroes in play not at their last 성급 */
const open = () => PLAYABLE_HEROES.filter(id => profile.heroes[id] < PIECES_MAX);

/** Draws that can be paid for and still give something, up to n. */
export function drawable(n: number) {
  if (!open().length) return 0;
  return Math.min(n, Math.floor(profile.coins / DRAW_COST));
}

/** Draws n times if the bank can pay for all of them; returns what came out (null when it cannot). */
export function draw(n: number, price = n * DRAW_COST): Drawn[] | null {
  if (drawable(n) < n || profile.coins < price) return null;
  const out: Drawn[] = [];
  for (let i = 0; i < n; i++) {
    const heroes = open();
    if (!heroes.length) break;
    const id = heroes[Math.floor(Math.random() * heroes.length)],
      from = pieceLevel(profile.heroes[id]);
    profile.heroes[id]++;
    out.push({ kind: 'hero', id, pieces: profile.heroes[id], from, to: pieceLevel(profile.heroes[id]) });
  }
  // every draw that was paid for gave something, unless everything reached its last 성급 part-way
  profile.coins -= Math.round((price * out.length) / n);
  saveProfile();
  return out;
}
