// Stages: one boss per stage, opened in order (docs/ability-redesign-plan.md, 4.1). A run is one stage: the
// party runs `distance` metres through the stage's background, then its boss comes.
// `world` picks the background and how the hero is drawn (0 산길, 1 대숲, 2 운해). Movement is left-right on
// every stage; the free up-down flight of 운해 is kept in the code but off (TUNE.freeFlight).
// `terrain` keeps each place's own rule: rock (바위), bamboo (죽창), cloud (느린 줄).

export interface Stage {
  name: string;
  boss: string;
  /** boss art and pattern set: 3 녹림 채주, 6 철갑 권승, 7 천마 교주, 8 심마 */
  type: number;
  color: string;
  terrain: 'rock' | 'bamboo' | 'cloud' | 'gate';
  world: 0 | 1 | 2;
  skin?: string;
  hint: string;
  patterns: string[];
  /** metres to run before the boss comes */
  distance: number;
  /** kills that fill the 처치 게이지 (a 만남): set from the bot's kills per stage so a run has about 6 (provisional) */
  gauge: number;
  /** enemy health on this stage, in whole numbers (see `HEALTH` below) */
  health: StageHealth;
}

/**
 * Enemy health (docs/combat-stats.md). Applied in this order, rounded to a whole number at the end (at least 1):
 *   1. the stage's starting health (per enemy rank, rocks)
 *   2. × the distance multiplier: 1 at the start of the run, `distance` when the boss comes (straight line)
 *   3. × `boss` for the boss, on top of the rank 0 health at the boss's distance
 * The player's basic attack is a whole number too (TUNE.attack); %-bonuses multiply it.
 */
export interface StageHealth {
  /** starting health of enemy ranks 0 to 3 */
  ranks: number[];
  rock: number;
  /** distance multiplier when the boss comes */
  distance: number;
  /** boss multiplier */
  boss: number;
}
/** Provisional: every stage starts the same until the stage table is set (later: per-stage start health, boss attack). */
const HEALTH: StageHealth = { ranks: [5, 14, 25, 40], rock: 33, distance: 1.5, boss: 145 };
/** S1 keeps its easier rocks (as before). */
const FIRST_HEALTH: StageHealth = { ...HEALTH, rock: 18 };

export const STAGES: Stage[] = [
  {
    name: '산길',
    boss: '녹림 채주',
    type: 3,
    color: '#ffc179',
    terrain: 'rock',
    world: 0,
    hint: '바위가 길을 막는다 · 부수며 나아가라',
    patterns: ['fan', 'dive', 'lanes'],
    distance: 12000,
    gauge: 90,
    health: FIRST_HEALTH,
  },
  {
    name: '청죽림',
    boss: '철갑 권승',
    type: 6,
    color: '#9fe5dd',
    terrain: 'bamboo',
    world: 1,
    hint: '죽창이 쏟아진다 · 스치며 흘려라',
    patterns: ['lanes', 'fan', 'dive'],
    distance: 13000,
    gauge: 75,
    health: HEALTH,
  },
  {
    name: '폐사',
    boss: '천마 교주',
    type: 7,
    color: '#f6bc83',
    terrain: 'cloud',
    world: 0,
    hint: '향로의 연기가 짙다 · 적이 느리게 몰려온다',
    patterns: ['dive', 'lanes', 'fan'],
    distance: 14000,
    gauge: 65,
    health: HEALTH,
  },
  {
    name: '부유암',
    boss: '녹림 채주',
    type: 3,
    color: '#ffc179',
    terrain: 'rock',
    world: 2,
    hint: '떠다니는 바위섬 · 부수며 나아가라',
    patterns: ['fan', 'dive', 'lanes'],
    distance: 15000,
    gauge: 55,
    health: HEALTH,
  },
  {
    name: '유운봉',
    boss: '철갑 권승',
    type: 6,
    color: '#9fe5dd',
    terrain: 'bamboo',
    skin: 'wind',
    world: 2,
    hint: '바람 칼날이 떨어진다 · 스치며 흘려라',
    patterns: ['lanes', 'fan', 'dive'],
    distance: 16000,
    gauge: 60,
    health: HEALTH,
  },
  {
    name: '천마성',
    boss: '천마 교주',
    type: 7,
    color: '#f6bc83',
    terrain: 'cloud',
    world: 2,
    hint: '기류가 거세다 · 적이 느리게 몰려온다',
    patterns: ['dive', 'lanes', 'fan'],
    distance: 17000,
    gauge: 60,
    health: HEALTH,
  },
];
export const STAGE_COUNT = STAGES.length;

/** 심마 (검총): out of the stages for now, kept for the special stage it will become (scenes/final-gate.ts). */
export const SIMMA = {
  name: '검총',
  boss: '심마',
  type: 8,
  color: '#c9a6ff',
  terrain: 'gate',
  world: 1,
  hint: '칼들의 무덤 · 지나온 인연이 모인다',
  patterns: ['fan', 'lanes', 'dive'],
  intro: '꽂힌 칼들 사이에 그대의 그림자, 심마(心魔)가 서 있다. 지나온 길에서 맺은 인연이 이곳에 모인다.',
  enter: '검총으로 들어선다',
};
