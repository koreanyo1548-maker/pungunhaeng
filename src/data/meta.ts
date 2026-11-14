// Meta progression numbers: what is kept between runs. See docs/meta-progression-plan.md.
// 엽전 left at the end of a run is banked and spent on 뽑기 (draws). A draw gives a piece (조각) of a hero or of
// an 인연 card. One piece unlocks it; more pieces raise a hero's 성급 (★1 to ★5) or a card's level (1 to 5).

import { HERO_IDS, NPC_IDS } from './roster';
import type { HeroId, NpcId } from './roster';
export { HERO_IDS, NPC_IDS };
export type { HeroId, NpcId };

/** 엽전 added to the bank for finishing the final gate. */
export const CLEAR_BONUS = 300;

/** Heroes given for free on a new save (one that fits each road). */
export const STARTERS: readonly HeroId[] = ['pungun', 'bicheon'];

// ---- pieces → levels (heroes and 인연 cards use the same steps)
/** total pieces needed for levels 1 to 5 (level 1 = unlocked) */
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
/** ●●○○○ for a card's level (0 to 5) */
export const pipText = (level: number) => '●'.repeat(level) + '○'.repeat(LEVEL_MAX - level);

/** What 인연 card levels 3 and 5 add (2 and 4 strengthen the unique skill, data/npcs.ts `card`). */
export const CARD_EASE = '의뢰를 한 번만 따라 성공해도 고유 기술 전수',
  CARD_HELP = '최종 관문에서 이 인연의 도움 위력 +40%';

// ---- 뽑기
/** Price of one draw and of ten, in banked 엽전. */
export const DRAW_COST = 100,
  DRAW_TEN_COST = 1000;
/** Chance that a draw gives a hero piece rather than an 인연 card piece. */
export const HERO_SHARE = 0.3;

// ---- 덕: 엽전 given to passers-by in a run (systems/virtue.ts) raises what that run banks
/** 엽전 given for one point of 덕, and how much one passer-by can be given at a time. */
export const ALMS = 20,
  ALMS_VIRTUE = 2;
/** each point of 덕 adds 1% to the banked 엽전, up to 30% */
export const VIRTUE_RATE = 0.01,
  VIRTUE_CAP = 30;

/** What a run reads. Copied from the profile when the run starts, so a seed and a snapshot replay the same run. */
export type Meta = {
  /** each hero's 성급 minus one: 0 (★1, or not unlocked) to 4 (★5) */
  heroes: Record<HeroId, number>;
  /** 인연 card level of each 인연, 0 (no card) to 5 */
  cards: Record<NpcId, number>;
};
export const emptyMeta = (): Meta => ({
  heroes: Object.fromEntries(HERO_IDS.map(id => [id, 0])) as Meta['heroes'],
  cards: Object.fromEntries(NPC_IDS.map(id => [id, 0])) as Meta['cards'],
});

/** 엽전 a run adds to the bank: what is left plus the clear bonus, raised by 덕. */
export function settle(coins: number, victory: boolean, virtue = 0): number {
  return Math.floor((coins + (victory ? CLEAR_BONUS : 0)) * (1 + VIRTUE_RATE * Math.min(VIRTUE_CAP, virtue)));
}
