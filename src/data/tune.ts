export const TUNE = {
  /** 근접 처치: a kill this close above the player (px). The same line gives the ×3 score (`근접 ×3`). */
  nearDy: 154,
  /** 운해 stages: free up-down flight. Off: every stage moves left-right only (kept for later). */
  freeFlight: false,
  skyMinY: 330,
  skyMaxY: 700,
  grazeRadius: 26,
  /** the basic attack: one basic shot hits for this much (whole number; hero levels will raise it) */
  attack: 10,
  /** heroes' basic shots: drawn `art` times their old size (40 px with a hero's own art, 36 px for 검기: about 65 px
   *  visible), and they hit within `reach` px to either side of their line, to match what is drawn */
  basicShot: { art: 3, reach: 30 },
  /** a 필살기 hits the boss for this many basic attacks (everything else dies) */
  blastBoss: 21,
  rockChance: 0.3,
};
