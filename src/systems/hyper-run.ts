// 무아지경 (docs/combat-stats.md, "엽전과 아이템"). It runs at HYPER_SPEED while the rows still come by time, so
// without help it would pass a long stretch of the stage with few enemies, and the 처치 게이지, the score and the
// 의뢰 would fall behind. So the metres it runs beyond the normal speed count as the kills those metres give at the
// normal speed (5 a row at this distance's row gap): each fills the gauge, adds the average kill score × the 연속
// multiplier (and 한 줄 전멸 every 5), and counts for the 의뢰 like a 무아지경 kill. They drop no 엽전: 엽전 come only
// from what is picked up.
// A 무아지경 kill, real or counted, adds 1 to 연속 처치, 근접 처치 and 스침 의뢰 (한 줄 전멸 counts as it is; 좌우
// 전환 still needs the player's own moves).
import { G } from '../core/context';
import { addKill } from './encounter';
import { stageDistance } from './flow';
import { questEvent } from './quest';
import { HYPER_SPEED, ROW_CLEAR_SCORE, addScore, averageKillScore, comboMult, rowGap, runSpeed } from './score';

/** A 무아지경 kill for the 의뢰: 연속 처치, 근접 처치 and 스침 each +1. */
export function hyperQuestKill() {
  questEvent('combo');
  questEvent('nearKill');
  questEvent('graze');
}

/** Counts the kills of the metres 무아지경 runs beyond the normal speed. Called every step. */
export function updateHyperRun(dt: number) {
  const s = G.state;
  if (s.hyper <= 0 || s.phase !== 'flight') return;
  const speed = runSpeed(s.stage),
    extra = (HYPER_SPEED - speed) * dt;
  s.hyperKills += (5 * extra) / (rowGap(s.distance, stageDistance()) * speed);
  while (s.hyperKills >= 1) {
    s.hyperKills -= 1;
    countedKill();
  }
}

function countedKill() {
  const s = G.state;
  addKill({});
  s.combo++;
  s.comboTimer = 2;
  addScore(averageKillScore(s.stage) * comboMult(s.combo));
  if (++s.hyperRowKills % 5 === 0) {
    addScore(ROW_CLEAR_SCORE);
    questEvent('rowClear');
  }
  hyperQuestKill();
}
