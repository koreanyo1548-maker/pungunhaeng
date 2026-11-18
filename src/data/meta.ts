// Meta progression numbers: what is kept between runs. See docs/meta-progression-plan.md.
// 엽전 left at the end of a run is banked and spent on 뽑기 (hero pieces) and hero 레벨업. One piece unlocks a
// hero; more raise its 성급 (★1 to ★5), and each 성급 opens ten more levels. 인연 grow by 호감도: every time an
// 인연's 의뢰 is followed (docs/combat-stats.md, docs/meta-progression-plan.md).

import { HERO_IDS, NPC_IDS } from './roster';
import type { HeroId, NpcId } from './roster';
export { HERO_IDS, NPC_IDS };
export type { HeroId, NpcId };

/** 엽전 added to the bank for beating a stage's boss. */
export const CLEAR_BONUS = 300;

/** Heroes given for free on a new save (one that fits each road). */
export const STARTERS: readonly HeroId[] = ['pungun', 'bicheon'];

// ---- pieces → 성급, 호감도 → 인연 level (the same steps)
/** total pieces (or 호감도) needed for levels 1 to 5 (a hero's level 1 = unlocked) */
export const PIECE_STEPS = [1, 3, 6, 10, 15];
export const LEVEL_MAX = PIECE_STEPS.length;
export const PIECES_MAX = PIECE_STEPS[LEVEL_MAX - 1];
/** 0 (not unlocked) to 5 */
export function pieceLevel(pieces: number): number {
  let level = 0;
  while (level < LEVEL_MAX && pieces >= PIECE_STEPS[level]) level++;
  return level;
}
/** ★★☆☆☆ for a hero's 성급 (1 to 5) */
export const starText = (stars: number) => '★'.repeat(stars) + '☆'.repeat(LEVEL_MAX - stars);
/** ●●○○○ for an 인연's level (0 to 5) */
export const pipText = (level: number) => '●'.repeat(level) + '○'.repeat(LEVEL_MAX - level);

// ---- 뽑기
/** Price of one draw and of ten, in banked 엽전. */
export const DRAW_COST = 100,
  DRAW_TEN_COST = 1000;

// ---- hero levels (provisional numbers)
/** each 성급 opens this many levels: ★1 up to 10, ★5 up to 50 */
export const LEVELS_PER_STAR = 10;
export const levelCap = (stars: number) => Math.max(1, stars * LEVELS_PER_STAR);
/** 엽전 to go from `level` to the next */
export const levelCost = (level: number) => level * 20;
/** the basic attack's stage (shots per volley) at a hero level: 1 below 10, 2 from 10, 3 from 20 */
export const weaponStage = (level: number) => (level >= 20 ? 3 : level >= 10 ? 2 : 1);

// ---- in a run (provisional numbers)
/** 엽전 given to a passer-by at level 2 (systems/virtue.ts) */
export const ALMS = 20;
/** 엽전 an 의뢰 pays when it does not raise an 인연: defied, or the 인연 is already at level 3 */
export const QUEST_COINS = 50;

/** What a run reads. Copied from the profile when the run starts, so a seed and a snapshot replay the same run. */
export type Meta = {
  /** each hero's 성급 minus one: 0 (★1, or not unlocked) to 4 (★5) */
  heroes: Record<HeroId, number>;
  /** each hero's level (1 and up): raises the attack (docs/combat-stats.md) */
  levels: Record<HeroId, number>;
  /** each 인연's level from 호감도, 0 to 5: raises that 인연's skills (+10% per level above 1) */
  cards: Record<NpcId, number>;
};
export const emptyMeta = (): Meta => ({
  heroes: Object.fromEntries(HERO_IDS.map(id => [id, 0])) as Meta['heroes'],
  levels: Object.fromEntries(HERO_IDS.map(id => [id, 1])) as Meta['levels'],
  cards: Object.fromEntries(NPC_IDS.map(id => [id, 0])) as Meta['cards'],
});

/** 엽전 a run adds to the bank: what is left plus the clear bonus. */
export function settle(coins: number, victory: boolean): number {
  return Math.floor(coins + (victory ? CLEAR_BONUS : 0));
}
