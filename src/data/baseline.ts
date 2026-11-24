// The run's skeleton every stage follows (docs/balance-baseline.md): measured from a Dragon Flight play video and
// set as the common baseline. Numbers here are the S1 values; per-stage differences come later.

/** stage difficulty: 0 on S1 (the running speed follows it) */
export const stageDifficulty = (stage: number) => Math.log2(stage + 1) - 1;
/** metres a second at the start of a stage (not in 무아지경); the run speeds up from here (BASELINE.speedUp) */
export const runSpeed = (stage: number) => 85 + Math.min(stageDifficulty(stage) * 12, 65);

export const BASELINE = {
  /** seconds to the boss without 무아지경 (each 무아지경 shortens it; about 3 minutes on average) */
  stageSeconds: 185,
  /** tier steps in a stage: the tier ladder goes up one step every sixth of the stage */
  steps: 6,
  /** the run gets faster with the stage's progress: × (1 + speedUp × progress), so twice as fast at the boss */
  speedUp: 1,
  /** starting row descent in px/s, before the stage progress multiplier */
  descent: 592,
  /** S1 rows start at `s1Descent` px/s and speed up `s1DescentPower` times as fast as the run (the run's factor to
   *  that power), up to `s1DescentMax` (about 1:50 into the flight; systems/ladder.ts `descentFactor`) */
  s1Descent: 300,
  s1DescentMax: 800,
  s1DescentPower: 2.4,
  /** seconds between rows at the start and at the boss (by the stage's progress) */
  rowGap: { start: 1.7, end: 1.45 },
  /** health as basic shots of the reference growth (Lv1: 10 a shot): tier 2 is 3 shots, then about × 1.4 */
  tierHealthMultipliers: [1, 3, 4, 6, 8, 12],
  /** within a tier step k: the weak slot is tier k; each other slot is k+1 or k+2 with these chances, growing from
   *  the start of the step to its end (the rest are tier k); tiers above 6 are 6 */
  stepMix: { next: [0.2, 0.6], nextTwo: [0, 0.2] },
  /** the boss takes this many seconds of the reference growth's basic attack */
  bossSeconds: 30,
  /** the basic attack: one shot every `fireInterval` s (8 a second) at every level, shots fly `shotSpeed` px/s */
  fireInterval: 0.125,
  shotSpeed: 1760,
  /** 운석: one comes after a random wait of `every` seconds (30 on average), warned `warn` s ahead, aimed */
  meteor: { every: [15, 45], warn: 2 },
  /** 정예 적 (docs/equipment-plan.md, 2장, systems/elite.ts): one every run, in tier step `firstStep` with
   *  `chances[0]`, else the next with `chances[1]`, … (the last is sure), at a random point of that step but not
   *  during a 운석 소나기; every hit takes 1 of `health`. Its path, at one steady speed (`stopY` + 80 px in `down` s, about 93 px/s): down to
   *  `stopY` swaying ±`sway` px (one sway in `swayPeriod` s), `stop` s in front of the hero, then on down out of the
   *  bottom (about 4.4 s) */
  elite: {
    firstStep: 2,
    chances: [0.5, 0.6, 1],
    health: 60,
    radius: 46,
    score: 3000,
    path: { down: 6, stop: 1.5, stopY: 480, sway: 120, swayPeriod: 2.5 },
  },
  /** 운석 소나기 (systems/shower.ts): at the end of each step from `fromStep` on, no rows and `count` 운석 marked `gap`
   *  s apart (the last `aimed` where the hero is); rows come back when the `resumeWith`-th starts to fall */
  shower: { fromStep: 3, count: 5, gap: 0.5, aimed: 2, resumeWith: 4 },
  /** 무아지경: `seconds` long at `speed` × the running speed, it cuts through everything; at its end the screen
   *  bursts and the enemies left turn into 엽전 */
  hyper: { seconds: 2, speed: 6, descent: 2.5 },
  /** a kill drops an item with `chance`; which one is picked by `weights` (자석 4 : 점수 두 배 4 : 듀얼샷 4 : 무아지경 2);
   *  a 무아지경 kill drops none */
  itemDrop: { chance: 0.03, weights: { magnet: 4, double: 4, dual: 4, hyper: 2 } },
  /** seconds an item (not 엽전) hangs at the top of its pop before it falls */
  itemHang: 0.45,
  /** 만남 (systems/encounter.ts): the first comes `first` s into the flight; an 의뢰 (an 인연's or a passer-by's) has
   *  `quest` s of flight. Met, its reward shows for `reward` s, then `after` s later the next 만남 comes; run out, the
   *  next comes `after` s later. Who comes is announced for `arrive` s before the cards open. */
  meet: { first: 10, quest: 60, reward: 1.4, after: 3, arrive: 1.5 },
  /** 보물상자: chance a row holds one (about 2 in the ~115 rows of a run); its health is the step's strong tier (k+1)
   *  and it bursts into `coins` 엽전 */
  chest: { perRow: 0.018, coins: 20 },
  /** 기준 점수 of S1 to S6: the invincible bot's average score at the reference growth (6 runs each, before the 선
   *  bonus), rounded; the 엽전 bonus tiers are 100/150/200% of it (systems/score.ts) */
  referenceScore: [136000, 73000, 143000, 122000, 77000, 153000],
};

/** metres to run before the boss on a stage: `stageSeconds` of running at a speed that doubles with progress */
export const stageLength = (stage: number) =>
  Math.round((BASELINE.stageSeconds * runSpeed(stage)) / Math.log(1 + BASELINE.speedUp) / 100) * 100;
/** health of a tier (1 to 6) for the reference attack */
export function tierHealth(tier: number, attack: number) {
  const multipliers = BASELINE.tierHealthMultipliers;
  return Math.round(multipliers[Math.min(multipliers.length, Math.max(1, tier)) - 1] * attack);
}
