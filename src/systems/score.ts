// Score and the end-of-run bonuses (docs/combat-stats.md).
// - 점수 두 배 (an in-play item): while it runs, every score gained counts twice (the clear bonus does not).
// - 최대 점수: what a stage gives when every row is cleared, every 엽전 is picked up, the 연속 처치 chain never breaks
//   (×1 → ×5, comboMult) and the boss is beaten. 근접 × and 점수 두 배 are left out, and the boss counts ×1 (the field
//   is cleared before it comes, so the chain ends there). Worked out from the stage's length, its speed-up, the row
//   gap and the tier ladder (no 무아지경), rounded.
// - 정산: the share of the 최대 점수 a run reached adds 10/20/30% to the 엽전 banked (ACHIEVE_TIERS); each 악 point
//   adds 5% more. Each 선 point adds 5% to the final score.
import { G } from '../core/context';
import { STAGES } from '../data/stages';
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
/** 엽전 bonus for the share of the 최대 점수 reached: the highest tier met counts */
export const ACHIEVE_TIERS = [
  { share: 0.9, bonus: 0.3 },
  { share: 0.7, bonus: 0.2 },
  { share: 0.5, bonus: 0.1 },
];

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

/** The average kill score of a row at a stage's progress (0 to 1): the weak slot and four slots of the step's mix. */
function rowKillScore(progress: number) {
  const steps = BASELINE.steps,
    k = Math.min(steps, Math.floor(progress * steps) + 1),
    t = Math.min(1, progress * steps - (k - 1)),
    m = BASELINE.stepMix,
    two = m.nextTwo[0] + (m.nextTwo[1] - m.nextTwo[0]) * t,
    one = m.next[0] + (m.next[1] - m.next[0]) * t,
    top = BASELINE.tierShots.length,
    score = (tier: number) => killScore(Math.min(top, tier) - 1);
  return score(k) + 4 * (two * score(k + 2) + one * score(k + 1) + (1 - two - one) * score(k));
}

/** 최대 점수 of a stage (see the top of this file), rounded to the nearest 1,000. */
export function maxScore(stage: number) {
  const s = STAGES[stage - 1],
    dt = 1 / 60,
    v0 = runSpeed(stage);
  let metres = 0,
    timer = 0.8,
    rows = 0,
    run = 0,
    kills = 0,
    rest = 0;
  // the same row timer as systems/stage-phases.ts (the 운해 rows come a quarter faster while far off); the run speeds
  // up with progress (systems/ladder.ts)
  while (metres < s.distance) {
    const progress = metres / s.distance;
    metres += v0 * (1 + BASELINE.speedUp * progress) * dt;
    run += RUN_SCORE * dt;
    timer -= dt;
    if (s.terrain === 'cloud' && timer > 0.5) timer -= dt * 0.25;
    if (timer <= 0) {
      rows++;
      timer = rowGap(metres, s.distance);
      // every kill in one unbroken chain: the k-th kill scores the row's average × comboMult(k)
      const each = rowKillScore(progress) / 5;
      for (let i = 0; i < 5; i++) kills += each * comboMult((rows - 1) * 5 + i + 1);
      rest += ROW_CLEAR_SCORE + 5 * COIN_SCORE;
    }
  }
  rest += run + bossScore(stage) + VICTORY_SCORE;
  return Math.round((kills + rest) / 1000) * 1000;
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
