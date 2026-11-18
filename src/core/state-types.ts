import type { Meta, HeroId } from '../data/meta';
import type { HeroEffect } from '../systems/hero-effects';
export interface SkillInstance {
  id: string;
  ready?: number;
  flash?: number;
}
export interface Quest {
  npc: string;
  mode: string;
  t: string;
  target: number;
  prog: number;
  br: string;
  done: boolean;
  failed: boolean;
  tick?: number;
  /** combo 의뢰: the combo already running when it was accepted (only the chain after it counts) */
  from?: number;
}
export interface PathEntry {
  /** which 만남 of the run (1 = first) */
  stage: number;
  npc: string | null;
  who?: string;
  t?: string;
  mode: string;
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
  hyperCooldown: number;
  hyperDrops: number;
  combo: number;
  comboTimer: number;
  stage: number;
  stageTime: number;
  phase: string;
  phaseTimer: number;
  rowTimer: number;
  meteorTimer: number;
  elapsed: number;
  cleared: number;
  trailTimer: number;
  stepTimer: number;
  ghostTimer: number;
  runPhase: number;
  jumpPhase: number;
  grazes: number;
  rain: number;
  rainTimer: number;
  negate: boolean;
  blasting: boolean;
  spearTimer: number;
  victory: boolean;
  active: number;
  /** the running entry skill (systems/hero-effects.ts) */
  effect: HeroEffect | null;
  /** 풍운객 ★5: the fallen vanguard whose trait he carries */
  inheritTrait?: HeroId;
  /** 매설영: the fraction of a coin carried between kills */
  coinFrac?: number;
  critLabel?: number;
  lastHurt: number;
  spent: number;
  skills: SkillInstance[];
  met: Record<string, number>;
  quest: Quest | null;
  path: PathEntry[];
  formation: HeroId[];
  meta: Meta;
  /** debug: the 인연 the next 만남 brings */
  forceNpc: string | null;
  /** 선·악 저울, −9 (악) to +9 (선) (systems/alignment.ts) */
  align: number;
  /** 인연 the scale has unlocked this run (kept when it swings back) */
  unlocked: string[];
  /** each 인연's level this run, 0 to 3 */
  bond: Record<string, number>;
  /** 처치 게이지 toward the next 만남 (systems/encounter.ts) */
  gauge: number;
  /** the gauge is full: a 만남 opens at the next safe step */
  meetReady: boolean;
  /** 만남 so far this run */
  encounters: number;
  /** passers-by met this run (their level and portrait) */
  passers: number;
  /** a hero entered during this step, so a 만남 waits one step (cleared when the next step starts) */
  enteredStep?: boolean;
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
  shield: number;
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
  hero?: HeroId;
  weaponStage?: number;
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
}
