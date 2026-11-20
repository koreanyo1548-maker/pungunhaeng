import type { Meta, HeroId } from '../data/meta';
import type { HeroEffect } from '../systems/hero-effects';
export interface SkillInstance {
  id: string;
  ready?: number;
  flash?: number;
}
export interface Quest {
  /** the 인연's id, or null for a passer-by's 의뢰 */
  npc: string | null;
  /** a passer-by's portrait (ambient art key) and name */
  who?: { art: string; name: string };
  /** follow / defy (인연), help / ignore (passer-by) */
  mode: string;
  /** the side the choice adds a point to (+1 정, −1 사) */
  move: number;
  t: string;
  target: number;
  prog: number;
  br: string;
  done: boolean;
  failed: boolean;
  /** seconds of flight left to meet it (BASELINE.meet.quest); the next 만남 opens when it runs out */
  left: number;
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
  /** seconds left of the 자석 item: 엽전 and items are pulled in */
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
  /** 정 points this run (systems/alignment.ts): only grow; each adds 5% to the final score */
  good: number;
  /** 사 points this run: only grow; each adds 5% to the 엽전 banked */
  evil: number;
  /** who comes to a 만남: the weights of a passer-by, a 정파 and a 사파 인연 (systems/alignment.ts) */
  meetOdds: { passer: number; good: number; evil: number };
  /** the 의뢰 the open 만남 offers (rolled when it opens: the cards show them), by choice */
  offer?: Quest[];
  /** each 인연's level this run, 0 to 3 */
  bond: Record<string, number>;
  /** seconds of flight before the next 만남 when no 의뢰 runs, and the whole wait (systems/encounter.ts) */
  meetTimer: number;
  meetWait: number;
  baseScore: number;
  /** who the next 만남 brings (an 인연's id, or null for a passer-by), announced for `left` more seconds */
  meetArrive?: { id: string | null; left: number };
  /** a 만남 is due: it opens at the next safe step */
  meetReady: boolean;
  /** 만남 so far this run */
  encounters: number;
  /** passers-by met this run (their portrait goes in order) */
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
}
