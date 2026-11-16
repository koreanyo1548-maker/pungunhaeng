export const TUNE = {
  earlyWeak: 0.6,
  secondWeak: 0.4,
  earlyRock: 0.12,
  earlyRockHp: 14,
  openingGap: 0.35,
  /** 근접 처치: a kill this close above the player (px). The same line gives the ×3 score (`근접 ×3`). */
  nearDy: 154,
  /** 운해 stages: free up-down flight. Off: every stage moves left-right only (kept for later). */
  freeFlight: false,
  skyMinY: 330,
  skyMaxY: 700,
  grazeRadius: 26,
  bossHp: 870, // boss health before stage scaling (580 until skill projectiles were strengthened)
  rockChance: 0.3,
};
