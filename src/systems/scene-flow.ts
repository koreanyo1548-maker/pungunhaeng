import { applyStartTraits } from './hero-effects';
import { rollElite } from './elite';
// Run flow as a scene state machine. Every screen of a run is a scene. A scene only reports that it finished
// (done), and this file alone decides what comes next, so changing the order of a run means editing the
// transitions below, not the scenes.
//
//   title (the stage card, ui/lobby.ts) ─강호에 나서기→ hero (the one hero of the run) → stage
//   stage: flight → warning → boss → clear (phases, see systems/stage-phases.ts)
//            ├ 공명의 조짐 due → encounter (its card) → back to the same stage
//            ├ 조짐 met → resonance (choose a 공명 기술) → back to the same stage
//            └ death → result
//   boss beaten → result (victory, the next stage opens)
//
// App-level modes (loading, title, pause) stay in systems/flow.ts; G.mode still says what the frame loop runs.
import { G } from '../core/context';
import { resumePlay } from '../scenes/choice';
import { openEncounter } from '../scenes/encounter';
import { openHeroPick } from '../scenes/setup';
import { openResonance } from '../scenes/resonance';
import { beginStage, end } from './flow';

export type Scene = 'title' | 'hero' | 'stage' | 'encounter' | 'resonance' | 'result';

function enter(scene: Scene) {
  G.scene = scene;
  G.sceneLog?.push(scene); // only set by the debug hook, for tests
}

/** Enters a scene. `arg` is scene-specific: whether the result is a victory. */
export function go(scene: Scene, arg?: any): void {
  enter(scene);
  switch (scene) {
    case 'hero':
      return openHeroPick();
    case 'stage':
      resumePlay();
      beginStage();
      return;
    case 'encounter':
      return openEncounter();
    case 'resonance':
      return openResonance();
    case 'result':
      return end(!!arg);
  }
}

/** A scene reports that it finished; the transition is decided here. */
export function done(scene: Scene, outcome?: any): void {
  switch (scene) {
    case 'hero': // the hero is set (G.state.hero)
      applyStartTraits();
      rollElite();
      return go('stage');
    case 'encounter': // interrupts: the stage keeps running where it paused
    case 'resonance':
      enter('stage');
      return resumePlay();
    case 'stage':
      return go('result', true);
  }
}
