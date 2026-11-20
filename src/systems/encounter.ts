// 만남 timing (docs/ability-redesign-plan.md, 4.2 and 7.6). The first 만남 opens BASELINE.meet.first s into the
// flight. An 인연 brings an 의뢰 with BASELINE.meet.quest s of flight to meet it: the next 만남 opens as soon as it is
// met, or when its time runs out (it fails). After a passer-by (no 의뢰) the next 만남 comes BASELINE.meet.afterPasser
// s later. So meeting 의뢰 fast means more 만남 (and more 인연 skills).
//   - Only flight time counts: the 만남 window, the boss warning and the boss fight do not. An 의뢰 running at the
//     boss warning carries into the boss fight with no clock; the end of the run fails it.
//   - A 만남 opens at the end of a step, and not in the step a hero entered (it waits one step).
import { G } from '../core/context';
import { BASELINE } from '../data/baseline';
import { closeQuest } from './quest';
import { go } from './scene-flow';

/** an 의뢰 is running (accepted, not met, not failed) */
export const questRunning = () => {
  const q = G.state.quest;
  return !!q && !q.done && !q.failed;
};

/** A step of flight: runs the 의뢰's clock, or the wait for the next 만남 when no 의뢰 runs. */
export function updateMeetClock(dt: number) {
  const s = G.state;
  if (s.meetReady) return;
  if (questRunning()) {
    s.quest.left -= dt;
    if (s.quest.left <= 0) {
      closeQuest();
      s.meetReady = true;
    }
    return;
  }
  s.meetTimer -= dt;
  if (s.meetTimer <= 0) s.meetReady = true;
}

/** how near the next 만남 is at the latest, 0 to 1 (the HUD's bar): the 의뢰's clock, or the wait */
export function meetProgress() {
  const s = G.state;
  if (s.meetReady) return 1;
  if (questRunning()) return 1 - s.quest.left / BASELINE.meet.quest;
  return 1 - Math.max(0, s.meetTimer) / s.meetWait;
}

/** Waits the given seconds of flight before the next 만남 (the start of a run, after a passer-by). */
export function waitForMeet(seconds: number) {
  G.state.meetTimer = G.state.meetWait = seconds;
}

/** Opens a waiting 만남. Called at the end of a step; false when the 만남 opened (the step is over). */
export function updateEncounter(): boolean {
  const s = G.state;
  if (!s.meetReady || G.mode !== 'play') return true;
  if (s.phase !== 'flight') {
    s.meetReady = false;
    return true;
  }
  if (s.enteredStep) return true;
  s.meetReady = false;
  go('encounter');
  return false;
}
