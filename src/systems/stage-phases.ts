// Phases of a stage: flight → warning → boss → clear. Each phase has an optional enter (runs once when the phase
// starts) and update (runs every simulation step while the phase is active). setPhase is the only way to change
// phase, so every transition inside a stage is listed here. Leaving the stage (clear → 결과, a full 처치 게이지 →
// 만남) goes through the run flow in scene-flow.ts.
//
//   flight  rows and hazards spawn (pickups drop from kills); after stageDistance() metres → warning (however many 만남 came)
//   warning field is cleared, boss intro plays for phaseTimer → boss
//   boss    the boss fights; its death (entities/enemies.ts kill) → clear
//   clear   the stage is announced, then the run ends with a victory
import { G } from '../core/context';
import { chime } from '../core/audio';
import { josa, rnd } from '../core/math';
import { bossSpawn, createBoss } from '../entities/boss';
import { meteor, spawnRow, spear } from '../entities/enemies';
import { rowGap } from './score';
import { announce } from '../ui/hud';
import { difficulty, region, stageDistance } from './flow';
import { profile } from '../core/profile';
import { STAGES, STAGE_COUNT } from '../data/stages';
import { done } from './scene-flow';

export type Phase = 'flight' | 'warning' | 'boss' | 'clear';

interface PhaseDef {
  enter?: () => void;
  /** return false when the stage was left (the rest of the step is skipped) */
  update?: (dt: number) => boolean | void;
}

const PHASES: Record<Phase, PhaseDef> = {
  flight: {
    update: dt => {
      updateFlight(dt);
      if (G.state.distance >= stageDistance()) setPhase('warning');
    },
  },
  warning: {
    enter: () => {
      // no 만남 from here on; an 의뢰 still running carries into the boss fight
      G.state.meetReady = false;
      bossSpawn();
    },
    update: dt => {
      G.state.phaseTimer -= dt;
      if (G.state.phaseTimer <= 0) setPhase('boss');
    },
  },
  boss: {
    enter: createBoss,
  },
  clear: {
    enter: enterClear,
    update: dt => {
      G.state.phaseTimer -= dt;
      if (G.state.phaseTimer <= 0) {
        done('stage');
        return false;
      }
    },
  },
};

export function setPhase(phase: Phase): void {
  G.state.phase = phase;
  PHASES[phase].enter?.();
}

/** runs the current phase for one step; false if the stage was left */
export function updatePhase(dt: number): boolean {
  return PHASES[G.state.phase as Phase].update?.(dt) !== false;
}

function updateFlight(dt) {
  G.state.stageTime += dt;
  G.state.rowTimer -= dt;
  G.state.meteorTimer -= dt;
  if (G.state.rowTimer <= 0) {
    spawnRow();
    // 2 s a row at the start, 0.8 s at the boss: the rows come faster the farther the run gets
    G.state.rowTimer = rowGap(G.state.distance, stageDistance());
  }
  if (G.state.hyper <= 0 && G.state.meteorTimer <= 0) {
    meteor();
    G.state.meteorTimer = Math.max(3.7, 6 - difficulty() * 0.28);
  }
  const terrain = region().terrain;
  if ((terrain === 'bamboo' || terrain === 'gate') && G.state.hyper <= 0) {
    G.state.spearTimer -= dt;
    if (G.state.spearTimer <= 0) {
      spear();
      G.state.spearTimer = terrain === 'gate' ? rnd(1, 1.5) : rnd(0.5, 0.85);
    }
  }
  if (terrain === 'cloud' && G.state.rowTimer > 0.5) G.state.rowTimer -= dt * 0.25;
}

/** clear phase: the stage is announced and the field emptied (the 의뢰 stays open until the result) */
function enterClear() {
  G.state.phaseTimer = 2.4;
  G.hazards = [];
  G.pickups = [];
  G.shots = [];
  G.state.hyper = 0;
  G.player.inv = 4;
  const next = G.state.stage < STAGE_COUNT ? STAGES[G.state.stage] : null;
  announce(
    'S' + G.state.stage + ' 돌파',
    region().boss + ' 처치',
    next && G.state.stage >= profile.stages
      ? `S${G.state.stage + 1} ${josa(next.name, '이', '가')} 열린다`
      : '강호에 이름이 퍼진다',
    region().color,
    2.6,
  );
  chime();
}
