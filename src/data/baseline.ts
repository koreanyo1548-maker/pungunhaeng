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
  /** px a second rows come down at the start (a row reaches 80% of the screen, y 640 from y −70, in 1.2 s) */
  descent: 592,
  /** seconds between rows at the start and at the boss (by the stage's progress) */
  rowGap: { start: 1.7, end: 1.45 },
  /** basic shots of the reference growth (Lv1, no 인연) a tier takes: tier 2 is 10 times tier 1, then × 1.8 */
  tierShots: [1, 10, 18, 32, 58, 105],
  /** within a tier step k: the weak slot is tier k; each other slot is k+1 or k+2 with these chances, growing from
   *  the start of the step to its end (the rest are tier k); tiers above 6 are 6 */
  stepMix: { next: [0.2, 0.6], nextTwo: [0, 0.2] },
  /** the boss takes this many seconds of the reference growth's basic attack */
  bossSeconds: 30,
  /** the basic attack: a volley every `fireInterval` s (Lv1: 2 shots, so 16 a second), shots fly `shotSpeed` px/s */
  fireInterval: 0.125,
  shotSpeed: 1760,
  /** 운석: one comes after a random wait of `every` seconds (30 on average), warned `warn` s ahead, aimed */
  meteor: { every: [15, 45], warn: 2 },
  /** 무아지경: `seconds` long at `speed` × the running speed, it cuts through everything; at its end the screen
   *  bursts and the enemies left turn into 엽전 */
  hyper: { seconds: 1.4, speed: 6, descent: 2.5 },
  /** chance a kill drops each item, set so a run of the reference growth (about 100 kills outside 무아지경 on S1)
   *  sees about 6, 2 and 2; a 무아지경 kill drops none */
  itemChance: { hyper: 0.06, magnet: 0.02, double: 0.02 },
  /** seconds an item (not 엽전) hangs at the top of its pop before it falls */
  itemHang: 0.45,
  /** 보물상자: chance a row holds one (about 2 in the ~115 rows of a run); its health is the step's strong tier (k+1)
   *  and it bursts into `gems` 보석 worth `gemCoins` 엽전 each */
  chest: { perRow: 0.018, gems: 10, gemCoins: 5 },
};

/** metres to run before the boss on a stage: `stageSeconds` of running at a speed that doubles with progress */
export const stageLength = (stage: number) =>
  Math.round((BASELINE.stageSeconds * runSpeed(stage)) / Math.log(1 + BASELINE.speedUp) / 100) * 100;
/** health of a tier (1 to 6) for the reference attack */
export const tierHealth = (tier: number, attack: number) =>
  BASELINE.tierShots[Math.min(BASELINE.tierShots.length, Math.max(1, tier)) - 1] * attack;
