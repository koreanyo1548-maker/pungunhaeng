import { applyStartTraits } from './hero-effects';
// Run flow as a scene state machine. Every screen of a run is a scene. A scene only reports that it finished
// (done), and this file alone decides what comes next, so changing the order of a run means editing the
// transitions below, not the scenes.
//
//   title ─start→ stageSelect → formation(선봉) → formation(후발) → stage
//   stage: flight → warning → boss → clear (phases, see systems/stage-phases.ts)
//            ├ 처치 게이지 full → encounter (인연 의뢰 or 행인) → back to the same stage
//            └ death → result
//   boss beaten → result (victory, the next stage opens)
//
// App-level modes (loading, title, pause) stay in systems/flow.ts; G.mode still says what the frame loop runs.
import { G } from '../core/context';
import { resumePlay } from '../scenes/choice';
import { openEncounter } from '../scenes/encounter';
import { openFormation, openStageSelect } from '../scenes/setup';
import { beginStage, end } from './flow';

export type Scene = 'title' | 'stageSelect' | 'formation' | 'stage' | 'encounter' | 'result';

function enter(scene: Scene) {
  G.scene = scene;
  G.sceneLog?.push(scene); // only set by the debug hook, for tests
}

/** Enters a scene. `arg` is scene-specific: the formation slot, or whether the result is a victory. */
export function go(scene: Scene, arg?: any): void {
  enter(scene);
  switch (scene) {
    case 'stageSelect':
      return openStageSelect();
    case 'formation':
      return openFormation(arg);
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
    case 'stageSelect': // outcome: the stage picked (1 to 6)
      G.state.stage = outcome;
      return go('formation', 0);
    case 'formation': // outcome: the slot that was just filled
      if (outcome === 0) return go('formation', 1);
      applyStartTraits();
      return go('stage');
    case 'encounter': // an interrupt: the stage keeps running where it paused
      enter('stage');
      return resumePlay();
    case 'stage':
      return go('result', true);
  }
}
