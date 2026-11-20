// 만남 timing (docs/ability-redesign-plan.md, 4.2 and 7.6). Each 만남 brings an 의뢰 with BASELINE.meet.quest s of
// flight to meet it. The next 만남 comes in steps: met, its reward shows (BASELINE.meet.reward s) and
// BASELINE.meet.after s later who comes is announced; run out, it fails and BASELINE.meet.after s later the same.
// The announcement (BASELINE.meet.arrive s, the fight goes on) names who comes, then the cards open and the fight
// stops. The first 만남 is announced BASELINE.meet.first s into the flight. Meeting 의뢰 fast means more 만남.
//   - Only flight time counts: the 만남 window, the boss warning and the boss fight do not. An 의뢰 running at the
//     boss warning carries into the boss fight with no clock; the end of the run fails it.
//   - A 만남 opens at the end of a step, and not in the step a hero entered (it waits one step).
import { G } from '../core/context';
import { BASELINE } from '../data/baseline';
import { BR } from '../data/branches';
import { NPCS, SIDE_NAME } from '../data/npcs';
import { announce } from '../ui/hud';
import { rollMeet } from './alignment';
import { closeQuest } from './quest';
import { go } from './scene-flow';
import { passerNow } from './virtue';

/** an 의뢰 is running (accepted, not met, not failed) */
export const questRunning = () => {
  const q = G.state.quest;
  return !!q && !q.done && !q.failed;
};

/** A step of flight: the announcement of who comes, the 의뢰's clock, or the wait for the next 만남. */
export function updateMeetClock(dt: number) {
  const s = G.state;
  if (s.meetReady) return;
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
  s.meetTimer -= dt;
  if (s.meetTimer <= 0) arrive();
}

/** The next 만남 comes after `seconds` of flight (and its announcement). */
export function waitForMeet(seconds: number) {
  G.state.meetTimer = G.state.meetWait = seconds;
}

/** Rolls who comes (debug: forceNpc, 'passer' for a passer-by) and announces them; the cards open after it. */
function arrive() {
  const s = G.state,
    forced = s.forceNpc;
  s.forceNpc = null;
  const id = forced === 'passer' ? null : forced || rollMeet();
  s.meetArrive = { id, left: BASELINE.meet.arrive };
  if (id) {
    const n = NPCS[id];
    announce('인연', n.name, `${SIDE_NAME[n.side]} · ${n.title}`, BR[n.br].color, BASELINE.meet.arrive);
  } else {
    const who = passerNow();
    announce('행인', who.name, who.title, '#d9c58f', BASELINE.meet.arrive);
  }
}

/** how near the next 만남 is at the latest, 0 to 1 (the HUD's bar): the 의뢰's clock, or the wait */
export function meetProgress() {
  const s = G.state;
  if (s.meetReady || s.meetArrive) return 1;
  if (questRunning()) return 1 - s.quest.left / BASELINE.meet.quest;
  return 1 - Math.max(0, s.meetTimer) / s.meetWait;
}

/** Opens a waiting 만남. Called at the end of a step; false when the 만남 opened (the step is over). */
export function updateEncounter(): boolean {
  const s = G.state;
  if (!s.meetReady || G.mode !== 'play') return true;
  if (s.phase !== 'flight') {
    s.meetReady = false;
    s.meetArrive = undefined;
    return true;
  }
  if (s.enteredStep) return true;
  s.meetReady = false;
  go('encounter');
  return false;
}
