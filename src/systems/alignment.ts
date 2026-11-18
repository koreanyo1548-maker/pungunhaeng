// 선·악 (docs/ability-redesign-plan.md, 4.3 and 7.7). Two points that only grow: 선 and 악 are counted apart, so
// 선 1 and then 악 1 is 선 1 · 악 1 (not 0). Passers-by and the choice to follow or defy an 인연 add to them.
// Reaching 1, 3 and 5 of a side's points unlocks that side's 인연 (data/npcs.ts `unlock`). At the end of the run each
// 선 point adds 5% to the final score and each 악 point 5% to the 엽전 banked (systems/flow.ts `end`).
import { G } from '../core/context';
import { NPCS } from '../data/npcs';
import { NPC_IDS } from '../data/roster';

/** final score bonus per 선 point, final 엽전 bonus per 악 point */
export const VIRTUE_BONUS = 0.05;

/** "선 3 · 악 2" */
export const alignText = (s = G.state) => `선 ${s.good} · 악 ${s.evil}`;
/** "선 +1" / "악 +2" for points gained (a positive delta is 선, a negative one 악) */
export const moveText = (delta: number) => (delta > 0 ? `선 +${delta}` : `악 +${-delta}`);

/** Adds points (a positive delta to 선, a negative one to 악) and unlocks every 인연 whose mark that side reached.
 *  Returns the names of 인연 unlocked now. */
export function moveAlign(delta: number): string[] {
  const s = G.state;
  if (delta > 0) s.good += delta;
  else s.evil -= delta;
  const opened: string[] = [];
  for (const id of NPC_IDS) {
    const n = NPCS[id],
      reach = n.side === 'good' ? s.good : s.evil;
    if (reach >= n.unlock && !s.unlocked.includes(id)) {
      s.unlocked.push(id);
      opened.push(n.name);
    }
  }
  return opened;
}

/** 인연 who can come to a 만남: the ones the points have unlocked (every 인연 can come; no card needed). */
export const candidates = (): string[] => NPC_IDS.filter(id => G.state.unlocked.includes(id));

/** "인연이 열렸다 · 떠돌이 약선" for the 인연 a move unlocked, or '' */
export const openedText = (names: string[]) => (names.length ? '인연이 열렸다 · ' + names.join(', ') : '');
