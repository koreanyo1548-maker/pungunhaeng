// Score and the end-of-run bonuses (docs/combat-stats.md).
// - 점수 두 배 (an in-play item): while it runs, every score gained counts twice (the clear bonus does not).
// - 최대 점수: what a stage gives when every row is cleared, every 엽전 is picked up and the boss is beaten, with no
//   multiplier (근접 ×, 연속 ×, 점수 두 배). Worked out from the stage's distance, row spacing and enemy mix, rounded.
// - 정산: the share of the 최대 점수 a run reached adds 10/20/30% to the 엽전 banked (ACHIEVE_TIERS); each 악 point
//   adds 5% more. Each 선 point adds 5% to the final score.
import { G } from '../core/context';
import { STAGES } from '../data/stages';
import { TUNE } from '../data/tune';
import { VIRTUE_BONUS } from './alignment';

/** seconds a row takes at the start of a stage and at its end (the boss); the gap shrinks evenly with distance */
export const ROW_GAP = { start: 2, end: 0.8 };
/** points for a kill of an enemy of this rank, before multipliers */
export const killScore = (rank: number) => 100 + rank * 65;
export const ROW_CLEAR_SCORE = 500;
export const COIN_SCORE = 10;
/** score per second of running */
export const RUN_SCORE = 8;
export const VICTORY_SCORE = 20000;
export const bossScore = (stage: number) => 5000 + stage * 1000;
/** 엽전 bonus for the share of the 최대 점수 reached: the highest tier met counts */
export const ACHIEVE_TIERS = [
  { share: 0.9, bonus: 0.3 },
  { share: 0.7, bonus: 0.2 },
  { share: 0.5, bonus: 0.1 },
];

/** the row gap (seconds) at this distance into a stage of `length` metres */
export function rowGap(metres: number, length: number) {
  const f = Math.min(1, Math.max(0, metres / length));
  return ROW_GAP.start + (ROW_GAP.end - ROW_GAP.start) * f;
}
/** stage difficulty: 0 on S1 (the running speed and the enemy mix follow it) */
export const stageDifficulty = (stage: number) => Math.log2(stage + 1) - 1;
/** metres a second while running (not in 무아지경) */
export const runSpeed = (stage: number) => 85 + Math.min(stageDifficulty(stage) * 12, 65);

/** Adds score; 점수 두 배 doubles it while it runs. */
export function addScore(points: number) {
  G.state.score += points * (G.state.double > 0 ? 2 : 1);
}

/** The average score of one enemy slot that is not the row's weak one (see entities/enemies.ts `spawnRow`). */
function slotScore(stage: number) {
  const s = STAGES[stage - 1],
    weak = stage === 1 ? TUNE.earlyWeak : stage === 2 ? TUNE.secondWeak : 0.25,
    top = Math.min(3, stage),
    strong = 0.55 * killScore(Math.max(1, top)) + 0.45 * killScore(Math.max(1, top - 1)),
    enemy = weak * killScore(0) + (1 - weak) * strong,
    rock = s.terrain === 'rock' ? (stage === 1 ? TUNE.earlyRock : TUNE.rockChance) : s.terrain === 'gate' ? 0.15 : 0;
  // a rock scores as rank 2
  return rock * killScore(2) + (1 - rock) * enemy;
}

/** 최대 점수 of a stage (see the top of this file), rounded to the nearest 1,000. */
export function maxScore(stage: number) {
  const s = STAGES[stage - 1],
    dt = 1 / 60,
    speed = runSpeed(stage);
  let metres = 0,
    timer = 0.8,
    rows = 0,
    run = 0;
  // the same row timer as systems/stage-phases.ts (the 운해 rows come a quarter faster while far off)
  while (metres < s.distance) {
    metres += speed * dt;
    run += RUN_SCORE * dt;
    timer -= dt;
    if (s.terrain === 'cloud' && timer > 0.5) timer -= dt * 0.25;
    if (timer <= 0) {
      rows++;
      timer = rowGap(metres, s.distance);
    }
  }
  const row = killScore(0) + 4 * slotScore(stage) + ROW_CLEAR_SCORE + 5 * COIN_SCORE;
  return Math.round((rows * row + run + bossScore(stage) + VICTORY_SCORE) / 1000) * 1000;
}

/** The end-of-run bonuses for a score (before the 선 bonus) on a stage, with the run's 선 and 악 points. */
export function runBonus(score: number, stage: number, good: number, evil: number) {
  const max = maxScore(stage),
    share = score / max,
    tier = ACHIEVE_TIERS.find(t => share >= t.share)?.bonus ?? 0;
  return {
    max,
    share,
    /** 엽전 bonus for the share reached */
    tier,
    /** final score bonus from 선 */
    scoreBonus: good * VIRTUE_BONUS,
    /** final 엽전 bonus from 악 and the share reached */
    coinBonus: evil * VIRTUE_BONUS + tier,
  };
}
