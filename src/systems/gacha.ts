// 뽑기: spend banked 엽전 on pieces of heroes and 인연 cards. Runs between runs only (title, result screen).
// Draws use Math.random, never the seeded run streams (core/rng.ts), so drawing cannot change any run.
import { profile, saveProfile } from '../core/profile';
import { DRAW_COST, HERO_IDS, HERO_SHARE, NPC_IDS, PIECES_MAX, pieceLevel } from '../data/meta';

export type Drawn = {
  kind: 'hero' | 'card';
  id: string;
  /** pieces after this draw */
  pieces: number;
  /** level (성급 or card level) before and after this draw */
  from: number;
  to: number;
};

/** what can still come out: anything not at its last level */
const open = (kind: 'hero' | 'card') =>
  kind === 'hero'
    ? HERO_IDS.filter(id => profile.heroes[id] < PIECES_MAX)
    : NPC_IDS.filter(id => profile.cards[id] < PIECES_MAX);

/** Draws that can be paid for and still give something, up to n. */
export function drawable(n: number) {
  if (!open('hero').length && !open('card').length) return 0;
  return Math.min(n, Math.floor(profile.coins / DRAW_COST));
}

/** Draws n times if the bank can pay for all of them; returns what came out (null when it cannot). */
export function draw(n: number, price = n * DRAW_COST): Drawn[] | null {
  if (drawable(n) < n || profile.coins < price) return null;
  const out: Drawn[] = [];
  for (let i = 0; i < n; i++) {
    const heroes = open('hero'),
      cards = open('card');
    if (!heroes.length && !cards.length) break;
    const kind = !cards.length || (heroes.length && Math.random() < HERO_SHARE) ? 'hero' : 'card',
      list: readonly string[] = kind === 'hero' ? heroes : cards,
      id = list[Math.floor(Math.random() * list.length)],
      store = kind === 'hero' ? profile.heroes : profile.cards,
      from = pieceLevel(store[id]);
    store[id]++;
    out.push({ kind, id, pieces: store[id], from, to: pieceLevel(store[id]) });
  }
  // every draw that was paid for gave something, unless everything reached its last level part-way
  profile.coins -= Math.round((price * out.length) / n);
  saveProfile();
  return out;
}
