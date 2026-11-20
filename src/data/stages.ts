// Stages: one boss per stage, opened in order (docs/ability-redesign-plan.md, 4.1). A run is one stage: the
// party runs `distance` metres through the stage's background, then its boss comes.
// `world` picks the background and how the hero is drawn (0 산길, 1 대숲, 2 운해). Movement is left-right on
// every stage; the free up-down flight of 운해 is kept in the code but off (TUNE.freeFlight).
// `terrain` keeps each place's own rule: rock (바위, not on S1), bamboo (죽창), cloud (느린 줄).
import { stageLength } from './baseline';

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
  /** metres to run before the boss comes (data/baseline.ts `stageLength`: about 3 minutes with 무아지경) */
  distance: number;
}

/** Enemy health comes from the tier ladder (data/baseline.ts `tierHealth`, systems/ladder.ts): the same tiers on
 *  every stage for now; per-stage reference growth comes later (docs/balance-baseline.md). */

export const STAGES: Stage[] = [
  {
    name: '산길',
    boss: '녹림 채주',
    type: 3,
    color: '#ffc179',
    terrain: 'rock',
    world: 0,
    hint: '갈수록 거세진다 · 약한 틈을 찾아 뚫어라',
    patterns: ['fan', 'dive', 'lanes'],
    distance: stageLength(1),
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
    distance: stageLength(2),
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
    distance: stageLength(3),
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
    distance: stageLength(4),
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
    distance: stageLength(5),
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
    distance: stageLength(6),
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
