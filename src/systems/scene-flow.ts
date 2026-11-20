import { applyStartTraits } from './hero-effects';
// Run flow as a scene state machine. Every screen of a run is a scene. A scene only reports that it finished
// (done), and this file alone decides what comes next, so changing the order of a run means editing the
// transitions below, not the scenes.
//
//   title (the stage card, ui/lobby.ts) ─강호에 나서기→ formation (선봉 and 후발 on one screen) → stage
//   stage: flight → warning → boss → clear (phases, see systems/stage-phases.ts)
//            ├ 처치 게이지 full → encounter (인연 의뢰 or 행인) → back to the same stage
//            └ death → result
//   boss beaten → result (victory, the next stage opens)
//
// App-level modes (loading, title, pause) stay in systems/flow.ts; G.mode still says what the frame loop runs.
import { G } from '../core/context';
import { resumePlay } from '../scenes/choice';
import { openEncounter } from '../scenes/encounter';
import { openFormation } from '../scenes/setup';
import { beginStage, end } from './flow';

export type Scene = 'title' | 'formation' | 'stage' | 'encounter' | 'result';

function enter(scene: Scene) {
  G.scene = scene;
  G.sceneLog?.push(scene); // only set by the debug hook, for tests
}

/** Enters a scene. `arg` is scene-specific: whether the result is a victory. */
export function go(scene: Scene, arg?: any): void {
  enter(scene);
  switch (scene) {
    case 'formation':
      return openFormation();
    case 'stage':
      resumePlay();
      beginStage();
      return;
    case 'encounter':
      return openEncounter();
    case 'result':
      return end(!!arg);
  }
}

/** A scene reports that it finished; the transition is decided here. */
export function done(scene: Scene, outcome?: any): void {
  switch (scene) {
    case 'formation': // the party is set (G.state.formation)
      applyStartTraits();
      return go('stage');
    case 'encounter': // an interrupt: the stage keeps running where it paused
      enter('stage');
      return resumePlay();
    case 'stage':
      return go('result', true);
  }
}
