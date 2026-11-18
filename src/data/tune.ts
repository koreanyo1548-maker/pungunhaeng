export const TUNE = {
  earlyWeak: 0.6,
  secondWeak: 0.4,
  earlyRock: 0.12,
  /** 근접 처치: a kill this close above the player (px). The same line gives the ×3 score (`근접 ×3`). */
  nearDy: 154,
  /** 운해 stages: free up-down flight. Off: every stage moves left-right only (kept for later). */
  freeFlight: false,
  skyMinY: 330,
  skyMaxY: 700,
  grazeRadius: 26,
  /** the basic attack: one basic shot hits for this much (whole number; hero levels will raise it) */
  attack: 10,
  /** a 필살기 hits the boss for this many basic attacks (everything else dies) */
  blastBoss: 21,
  rockChance: 0.3,
};
