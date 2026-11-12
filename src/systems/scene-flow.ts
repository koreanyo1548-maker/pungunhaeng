import { buildStagePlan, isFinal } from './run-plan';
// Run flow as a scene state machine. Every screen of a run is a scene. A scene only reports that it finished
// (done), and this file alone decides what comes next, so changing the order of a run — e.g. an endless mode that
// alternates 땅 and 하늘 — means editing the transitions below, not the scenes.
//
//   title ─start→ course → formation(선봉) → formation(후위) → gate
//   gate = crossroads (인연, 화두) | finalGate (최종 관문, after the 3rd gate)
//   gate → stage: flight → warning → boss → clear (phases, see systems/loop.ts)
//            ├ 화두 성취 → dono → back to the same stage
//            └ death → result
//   stage cleared → tuhak → inn → gate          (final stage cleared → result, victory)
//
// App-level modes (loading, title, pause) stay in systems/flow.ts; G.mode still says what the frame loop runs.
import { G } from '../core/context';
import { resumePlay } from '../scenes/choice';
import { openCrossroads } from '../scenes/crossroads';
import { openDono } from '../scenes/dono';
import { openFinalGate } from '../scenes/final-gate';
import { openInn } from '../scenes/inn';
import { openCourseSelect, openFormation } from '../scenes/setup';
import { openTuhak } from '../scenes/tuhak';
import { beginStage, end, nextStage } from './flow';
import { gateCleared } from './meta';

export type Scene =
  'title' | 'course' | 'formation' | 'crossroads' | 'finalGate' | 'stage' | 'dono' | 'tuhak' | 'inn' | 'result';

/** the scene that opens the current gate of the plan: an 인연 for a gate, the 최종 관문 for the final */
const gate = (): Scene => (isFinal() ? 'finalGate' : 'crossroads');

function enter(scene: Scene) {
  G.scene = scene;
  G.sceneLog?.push(scene); // only set by the debug hook, for tests
}

/** Enters a scene. `arg` is scene-specific: the formation slot, or whether the result is a victory. */
export function go(scene: Scene, arg?: any): void {
  enter(scene);
  switch (scene) {
    case 'course':
      return openCourseSelect();
    case 'formation':
      return openFormation(arg);
    case 'crossroads':
      return openCrossroads();
    case 'finalGate':
      return openFinalGate();
    case 'stage':
      resumePlay();
      beginStage();
      return;
    case 'dono':
      return openDono();
    case 'tuhak':
      return openTuhak();
    case 'inn':
      return openInn();
    case 'result':
      return end(!!arg);
  }
}

/** A scene reports that it finished; the transition is decided here. */
export function done(scene: Scene, outcome?: any): void {
  switch (scene) {
    case 'course':
      G.state.plan = buildStagePlan(G.state.course);
      return go('formation', 0);
    case 'formation': // outcome: the slot that was just filled
      return outcome === 0 ? go('formation', 1) : go(gate());
    case 'crossroads':
    case 'finalGate':
      return go('stage');
    case 'dono': // an interrupt: the stage keeps running where it paused
      enter('stage');
      return resumePlay();
    case 'stage':
      gateCleared();
      return isFinal() ? go('result', true) : go('tuhak');
    case 'tuhak':
      G.mode = 'play';
      nextStage();
      return go('inn');
    case 'inn':
      return go(gate());
  }
}
