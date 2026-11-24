// The tier ladder and the run's speed (docs/balance-baseline.md). A stage is split into BASELINE.steps equal
// stretches of its length. In step k every slot of a row is tier k through the first half of the step; through the
// second half, cut in five, one, two, three, four, then all five slots are tier k+1, at random places. No slot is
// kept weak: a party that is not strong enough cannot break through. The next step starts all over at its own tier.
// The run speeds up with the stage's progress.
import { G } from '../core/context';
import { random } from '../core/rng';
import { BASELINE } from '../data/baseline';
import { stageDistance } from './flow';

const TOP = BASELINE.tierHealthMultipliers.length;

/** 0 at the start of a stage, 1 at the boss */
export const stageProgress = () => Math.min(1, Math.max(0, G.state.distance / stageDistance()));
/** how much faster the run is than at its start: 1 → 1 + speedUp at the boss */
export const speedFactor = () => 1 + BASELINE.speedUp * stageProgress();
/** how much faster rows come down than at the start: like the run, but on S1 it grows BASELINE.s1DescentPower times
 *  as fast in time (the run's factor to that power) and stops at BASELINE.s1DescentMax */
export const descentFactor = () =>
  G.state.stage === 1
    ? Math.min(BASELINE.s1DescentMax / BASELINE.s1Descent, speedFactor() ** BASELINE.s1DescentPower)
    : speedFactor();
/** the tier step now: 1 to BASELINE.steps */
export const ladderStep = () => Math.min(BASELINE.steps, Math.floor(stageProgress() * BASELINE.steps) + 1);
/** 0 at the start of the step, 1 at its end */
export const stepProgress = () => Math.min(1, stageProgress() * BASELINE.steps - (ladderStep() - 1));

/** how many slots of a row are tier k+1 now: none in the first half of the step, then 1 to 5 by fifths of the
 *  second half (BASELINE.stepRise: where it starts and how many it reaches) */
export function strongSlots(t = stepProgress()): number {
  const r = BASELINE.stepRise;
  if (t < r.from) return 0;
  return Math.min(r.slots, Math.floor(((t - r.from) / (1 - r.from)) * r.slots) + 1);
}
/** The tiers of a row's five slots: the step's tier, and strongSlots() of them (at random places, gameplay random:
 *  always the same number of rolls) one tier up. */
export function rowTiers(): number[] {
  const k = stepTier(),
    order = [0, 1, 2, 3, 4];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const up = new Set(order.slice(0, strongSlots()));
  return [0, 1, 2, 3, 4].map(i => (up.has(i) ? Math.min(TOP, k + 1) : k));
}
/** the tier of the current step */
export const stepTier = () => Math.min(TOP, ladderStep());
/** the step's strong tier (보물상자 health) */
export const strongTier = () => Math.min(TOP, ladderStep() + 1);
