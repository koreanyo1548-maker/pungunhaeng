import { isFinal } from './run-plan';
// Phases of one stage (one gate): flight → warning → boss → clear. Each phase has an optional enter (runs once
// when the phase starts) and update (runs every simulation step while the phase is active). setPhase is the only
// way to change phase, so every transition inside a stage is listed here. Leaving the stage (clear → 투학/결과,
// 화두 성취 → 돈오) goes through the run flow in scene-flow.ts.
//
//   flight  rows, hazards and pickups spawn; after stageDuration() → warning
//   warning field is cleared, boss intro plays for phaseTimer → boss
//   boss    the boss fights; its death (entities/enemies.ts kill) → clear
//   clear   the gate is announced, then the stage is done (waits for a pending 돈오 beat first)
import { G } from '../core/context';
import { chime } from '../core/audio';
import { W } from '../core/dom';
import { clamp, rnd } from '../core/math';
import { TUNE } from '../data/tune';
import { bossSpawn, createBoss } from '../entities/boss';
import { meteor, spawnRow, spear } from '../entities/enemies';
import { addPickup } from '../entities/pickups';
import { announce } from '../ui/hud';
import { difficulty, region, stageDuration } from './flow';
import { closeQuest } from './quest';
import { done, go } from './scene-flow';

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
      if (G.state.stageTime >= stageDuration()) setPhase('warning');
    },
  },
  warning: {
    enter: bossSpawn,
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
      if (G.state.phaseTimer <= 0 && G.state.donoDelay <= 0) {
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

/**
 * 돈오 beat: after a 화두 is fulfilled the stage runs at quarter speed for donoDelay (real) seconds, then the 돈오
 * choice opens. Returns the scaled dt, or null when the choice opened and the rest of the step must be skipped.
 */
export function donoBeat(dt: number, realDt: number): number | null {
  if (G.state.donoDelay <= 0) return dt;
  G.state.donoDelay -= realDt;
  dt *= 0.25;
  if (G.state.donoDelay <= 0) {
    go('dono');
    return null;
  }
  return dt;
}

function updateFlight(dt) {
  G.state.stageTime += dt;
  G.state.rowTimer -= dt;
  G.state.meteorTimer -= dt;
  G.state.powerTimer -= dt;
  G.state.hyperCooldown -= dt;
  if (G.state.rowTimer <= 0) {
    spawnRow();
    G.state.rowTimer =
      Math.max(0.68, 1.27 - difficulty() * 0.08 - G.state.stageTime * 0.005) +
      (G.state.stage === 1 ? Math.max(0, TUNE.openingGap - G.state.stageTime * 0.02) : 0);
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
  if (G.state.powerTimer <= 0) {
    if (G.player.weapon < 3 && !G.pickups.some(p => p.kind === 'power')) addPickup('power', G.player.x, -20);
    G.state.powerTimer = 14;
  }
  if (
    G.state.hyperCooldown <= 0 &&
    G.state.hyper <= 0 &&
    G.state.stageTime < stageDuration() - 8 &&
    !G.pickups.some(p => p.kind === 'hyper')
  ) {
    addPickup('hyper', clamp(G.player.x + rnd(-100, 100), 45, W - 45), -20);
    G.state.hyperDrops++;
    G.state.hyperCooldown = rnd(70, 95);
  }
}

/** clear phase: the gate is announced and the field emptied */
function enterClear() {
  G.state.phaseTimer = 2.4;
  G.hazards = [];
  G.pickups = [];
  G.shots = [];
  G.state.hyper = 0;
  G.player.inv = 4;
  closeQuest();
  announce(
    isFinal() ? region().name + ' 돌파' : '관문 ' + G.state.stage + ' 돌파',
    region().boss + ' 처치',
    isFinal() ? region().winLine : '쓰러진 자의 기술이 눈에 들어온다',
    region().color,
    2.6,
  );
  chime();
}
