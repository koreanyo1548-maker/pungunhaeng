// 공명의 조짐 timing (2026-11, docs/resonance-plan.md; it keeps the 만남 timing of docs/ability-redesign-plan.md 4.2).
// Each 조짐 has BASELINE.meet.quest s of flight to meet it. Met, the 공명 choice opens at the next safe step, its
// banner shows (BASELINE.meet.reward s) and BASELINE.meet.after s later the next 조짐 is announced; run out, it fails
// and BASELINE.meet.after s later the same. The announcement (BASELINE.meet.arrive s, the fight goes on) comes
// first, then the card opens and the fight stops. The first 조짐 comes BASELINE.meet.first s into the flight (at
// once), with no announcement. Once nothing is left to give (systems/quest.ts resonanceLeft), no 조짐 comes.
//   - Only flight time counts: the card, the boss warning and the boss fight do not. A 조짐 running at the boss
//     warning carries into the boss fight with no clock; the end of the run fails it.
import { G } from '../core/context';
import { BASELINE } from '../data/baseline';
import { announce } from '../ui/hud';
import { closeQuest, resonanceLeft } from './quest';
import { go } from './scene-flow';

/** a 조짐 is running (taken, not met, not failed) */
export const questRunning = () => {
  const q = G.state.quest;
  return !!q && !q.done && !q.failed;
};

/** A step of flight: the announcement, the 조짐's clock, or the wait for the next 조짐. */
export function updateMeetClock(dt: number) {
  const s = G.state;
  if (s.meetReady || s.pickReady) return;
  if (s.meetArrive) {
    s.meetArrive.left -= dt;
    if (s.meetArrive.left <= 0) s.meetReady = true;
    return;
  }
  if (questRunning()) {
    s.quest.left -= dt;
    if (s.quest.left <= 0) {
      closeQuest();
      waitForMeet(BASELINE.meet.after);
    }
    return;
  }
  if (!resonanceLeft()) return;
  s.meetTimer -= dt;
  if (s.meetTimer <= 0) arrive();
}

/** The next 조짐 comes after `seconds` of flight (and its announcement). */
export function waitForMeet(seconds: number) {
  G.state.meetTimer = G.state.meetWait = seconds;
}

/** Announces the next 조짐; its card opens after it (the first opens at once). */
function arrive() {
  const s = G.state;
  if (!s.encounters) {
    s.meetReady = true;
    return;
  }
  s.meetArrive = { left: BASELINE.meet.arrive };
  announce('공명', '공명의 조짐', '어딘가에서 권능이 떨린다', '#c9b6ff', BASELINE.meet.arrive);
}

/** how near the next 조짐 is at the latest, 0 to 1 (the HUD's bar): the 조짐's clock, or the wait */
export function meetProgress() {
  const s = G.state;
  if (s.meetReady || s.meetArrive || s.pickReady) return 1;
  if (questRunning()) return 1 - s.quest.left / BASELINE.meet.quest;
  if (!resonanceLeft()) return 0;
  return s.meetWait > 0 ? 1 - Math.max(0, s.meetTimer) / s.meetWait : 1;
}

/** Opens a waiting 공명 choice or 조짐 card. Called at the end of a step; false when one opened (the step is over). */
export function updateEncounter(): boolean {
  const s = G.state;
  if (G.mode !== 'play') return true;
  // a 공명 earned is given in flight and in the boss fight
  if (s.pickReady && ['flight', 'boss'].includes(s.phase)) {
    s.pickReady = false;
    go('resonance');
    return false;
  }
  if (!s.meetReady) return true;
  if (s.phase !== 'flight') {
    s.meetReady = false;
    s.meetArrive = undefined;
    return true;
  }
  s.meetReady = false;
  go('encounter');
  return false;
}
