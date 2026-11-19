// The tier ladder and the run's speed (docs/balance-baseline.md). A stage is split into BASELINE.steps equal
// stretches of its length; in step k the weak slot of a row is tier k and the other slots are tiers k, k+1 and k+2,
// the higher ones more often as the step goes on. The run speeds up with the stage's progress.
import { G } from '../core/context';
import { random } from '../core/rng';
import { BASELINE } from '../data/baseline';
import { stageDistance } from './flow';

const TOP = BASELINE.tierShots.length;

/** 0 at the start of a stage, 1 at the boss */
export const stageProgress = () => Math.min(1, Math.max(0, G.state.distance / stageDistance()));
/** how much faster the run is than at its start: 1 → 1 + speedUp at the boss */
export const speedFactor = () => 1 + BASELINE.speedUp * stageProgress();
/** the tier step now: 1 to BASELINE.steps */
export const ladderStep = () => Math.min(BASELINE.steps, Math.floor(stageProgress() * BASELINE.steps) + 1);
/** 0 at the start of the step, 1 at its end */
export const stepProgress = () => Math.min(1, stageProgress() * BASELINE.steps - (ladderStep() - 1));

const lerp = (range: number[], t: number) => range[0] + (range[1] - range[0]) * t;
/** the tier of a slot that is not the weak one, in the current step (gameplay random) */
export function slotTier(): number {
  const k = ladderStep(),
    t = stepProgress(),
    roll = random(),
    two = lerp(BASELINE.stepMix.nextTwo, t),
    one = lerp(BASELINE.stepMix.next, t);
  const tier = roll < two ? k + 2 : roll < two + one ? k + 1 : k;
  return Math.min(TOP, tier);
}
/** the weak slot's tier in the current step */
export const weakTier = () => Math.min(TOP, ladderStep());
/** the step's strong tier (보물상자 health) */
export const strongTier = () => Math.min(TOP, ladderStep() + 1);
