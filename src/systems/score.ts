// Score and the end-of-run bonuses (docs/combat-stats.md).
// - 점수 두 배 (an in-play item): while it runs, every score gained counts twice (the clear bonus does not).
// - 기준 점수: the average score (before the 정 bonus) of the reference growth (Lv1, no 인연) on a stage, measured with
//   the invincible bot (BASELINE.referenceScore). A run's share of it sets the 엽전 bonus.
// - 정산: reaching 100/150/200% of the 기준 점수 adds 10/20/30% to the 엽전 banked (ACHIEVE_TIERS); each 사 point
//   adds 5% more. Each 정 point adds 5% to the final score.
import { G } from '../core/context';
import { BASELINE, runSpeed, stageDifficulty } from '../data/baseline';
import { VIRTUE_BONUS } from './alignment';

/** the 연속 처치 multiplier of the `combo`-th kill in a chain: ×1, +1 every 10 kills, at most ×5 */
export const comboMult = (combo: number) => Math.min(5, 1 + Math.floor(combo / 10));
/** points for a kill of an enemy of this rank, before multipliers */
export const killScore = (rank: number) => 100 + rank * 65;
export const ROW_CLEAR_SCORE = 500;
export const COIN_SCORE = 10;
/** score per second of running */
export const RUN_SCORE = 8;
export const VICTORY_SCORE = 20000;
export const bossScore = (stage: number) => 5000 + stage * 1000;
/** 엽전 bonus for the share of the 기준 점수 reached: the highest tier met counts */
export const ACHIEVE_TIERS = [
  { share: 2, bonus: 0.3 },
  { share: 1.5, bonus: 0.2 },
  { share: 1, bonus: 0.1 },
];
/** 기준 점수 of a stage (data/baseline.ts) */
export const referenceScore = (stage: number) => BASELINE.referenceScore[stage - 1];

/** the row gap (seconds) at this distance into a stage of `length` metres: BASELINE.rowGap, evenly by progress */
export function rowGap(metres: number, length: number) {
  const f = Math.min(1, Math.max(0, metres / length)),
    g = BASELINE.rowGap;
  return g.start + (g.end - g.start) * f;
}
export { runSpeed, stageDifficulty };

/** Adds score; 점수 두 배 doubles it while it runs. */
export function addScore(points: number) {
  G.state.score += points * (G.state.double > 0 ? 2 : 1);
}

/** The end-of-run bonuses for a score (before the 정 bonus) on a stage, with the run's 선 and 사 points. */
export function runBonus(score: number, stage: number, good: number, evil: number) {
  const max = referenceScore(stage),
    share = score / max,
    tier = ACHIEVE_TIERS.find(t => share >= t.share)?.bonus ?? 0;
  return {
    max,
    share,
    /** 엽전 bonus for the share reached */
    tier,
    /** final score bonus from 정 */
    scoreBonus: good * VIRTUE_BONUS,
    /** final 엽전 bonus from 사 and the share reached */
    coinBonus: evil * VIRTUE_BONUS + tier,
  };
}
