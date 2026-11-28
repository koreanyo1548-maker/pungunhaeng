import type { Meta, HeroId } from '../data/meta';
import type { SkillId } from '../data/skills';
/** a 공명 기술 held in a run (data/skills.ts) */
export interface SkillInstance {
  id: SkillId;
  /** 1 to SKILL_LEVEL_MAX */
  level: number;
  ready?: number;
  flash?: number;
  /** window skills: seconds fought since it was learned (systems/skill-state.ts) */
  clock?: number;
  /** 어검진: the swords' angle */
  angle?: number;
}
/** 공명의 조짐 (systems/quest.ts): a condition to meet in BASELINE.meet.quest s of flight */
export interface Quest {
  t: string;
  target: number;
  prog: number;
  br: string;
  done: boolean;
  failed: boolean;
  /** seconds of flight left to meet it (BASELINE.meet.quest); the next 조짐 comes when it runs out */
  left: number;
  tick?: number;
  /** combo: the combo already running when it began (only the chain after it counts) */
  from?: number;
}
export interface PathEntry {
  /** which 조짐 of the run (1 = first) */
  stage: number;
  t: string;
  result: string;
}
export interface HeroHealth {
  hp: number;
  maxHp: number;
  fallen: boolean;
}
export interface RunState {
  heroHealth: Record<HeroId, HeroHealth>;
  score: number;
  distance: number;
  coins: number;
  kills: number;
  bombs: number;
  hyper: number;
  /** seconds left of the 자석 item: 엽전 are pulled in (BASELINE.magnet) */
  magnet: number;
  /** seconds left of the 점수 두 배 item */
  double: number;
  /** seconds left of the 듀얼샷 item (two lines of basic shots) */
  dual: number;
  hyperDrops: number;
  drops: { hyper: number; magnet: number; double: number; dual: number; chest: number };
  combo: number;
  comboTimer: number;
  stage: number;
  stageTime: number;
  phase: string;
  phaseTimer: number;
  rowTimer: number;
  meteorTimer: number;
  /** a 운석 소나기 running (systems/shower.ts): 운석 marked so far, seconds to the next mark, seconds until rows */
  shower?: { marked: number; next: number; left: number };
  /** the tier steps whose end has had its 운석 소나기 */
  showerSteps: number[];
  /** the 정예 적 of this run (systems/elite.ts): the distance it comes at (one every run), whether it is out and
   *  caught, the 장비 상자 won, and the box flying to the hero */
  elite?: { at: number; out: boolean; caught: boolean; boxes: number; fly?: { x: number; y: number; t: number } };
  elapsed: number;
  cleared: number;
  trailTimer: number;
  stepTimer: number;
  ghostTimer: number;
  runPhase: number;
  jumpPhase: number;
  grazes: number;
  blasting: boolean;
  spearTimer: number;
  victory: boolean;
  /** 매설영: the fraction of a coin carried between kills */
  coinFrac?: number;
  critLabel?: number;
  lastHurt: number;
  spent: number;
  /** the 공명 기술 held (data/skills.ts) */
  skills: SkillInstance[];
  /** the running 공명의 조짐 */
  quest: Quest | null;
  /** debug: the condition the next 조짐 asks for */
  forceSign?: string;
  path: PathEntry[];
  /** the one hero of the run (2026-11: no more party of two, 편대 비행 was removed) */
  hero: HeroId;
  meta: Meta;
  /** seconds of flight before the next 조짐 when none runs, and the whole wait (systems/encounter.ts) */
  meetTimer: number;
  meetWait: number;
  baseScore: number;
  /** the next 조짐 is announced for `left` more seconds */
  meetArrive?: { left: number };
  /** a 조짐 is due: its card opens at the next safe step */
  meetReady: boolean;
  /** a 조짐 was met: the 공명 choice opens at the next safe step */
  pickReady: boolean;
  /** 조짐 so far this run */
  encounters: number;
  /** 공명 so far this run (조짐 met) */
  resonances: number;
  questPath?: PathEntry;
  stats?: Record<string, number>;
  lastStepDir?: number;
  lastStepTime?: number;
  lastGraze?: number;
}
export interface Player {
  x: number;
  y: number;
  target: number;
  targetY: number;
  hp: number;
  maxHp: number;
  inv: number;
  fire: number;
  tilt: number;
  muzzle: number;
  step: number;
  stepDir: number;
  swing: number;
  swingCount: number;
}
export interface Shot {
  x: number;
  y: number;
  prevY: number;
  vx: number;
  damage: number;
  r: number;
  kind: string;
  phase: number;
  art?: string;
  skill?: string;
  basic?: boolean;
  color?: string;
  pierce?: boolean;
  w?: number;
  vy?: number;
  homing?: boolean;
  /** enemies a basic shot still passes through (목청완) */
  pierceLeft?: number;
  /** the shot erases the first hazard it touches (은침 ★5) */
  erase?: boolean;
  hits?: Set<Enemy>;
  dead?: boolean;
}
export interface Enemy {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: number;
  size: number;
  r: number;
  phase: number;
  hit: number;
  dead: boolean;
  baseX?: number;
  rank?: number;
  /** tier 1 to 6 on the ladder (rank = tier − 1; systems/ladder.ts) */
  tier?: number;
  /** a 보물상자: bursts into 엽전 */
  chest?: boolean;
  rock?: boolean;
  color?: string;
  row?: number;
  weak?: boolean;
  shape?: number[];
  boss?: boolean;
  action?: string;
  timer?: number;
  cast?: number;
  recoil?: number;
  enraged?: boolean;
  trailClock?: number;
  pattern?: string;
  cycle?: number;
  attackTimer?: number;
  volley?: number;
  targetX?: number;
  targetY?: number;
  safeLane?: number;
  orbHit?: number;
  grazed?: boolean;
  lastImpact?: number;
  /** a 정예 적 (systems/elite.ts): every hit takes 1 */
  elite?: boolean;
}
