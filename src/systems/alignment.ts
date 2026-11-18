// 선·악 저울 (docs/ability-redesign-plan.md, 4.3 and 7.7). One value from −9 (악) to +9 (선). Passers-by and
// the choice to follow or defy an 인연 move it. Reaching 1, 3 and 5 on a side unlocks that side's 인연 (data/npcs.ts
// `unlock`); an unlocked 인연 stays unlocked for the run even when the scale swings back.
import { G } from '../core/context';
import { clamp } from '../core/math';
import { NPCS } from '../data/npcs';
import { NPC_IDS } from '../data/roster';

export const ALIGN_MAX = 9;

/** "선 3", "악 2" or "중립" */
export const alignText = (v = G.state.align) => (v > 0 ? `선 ${v}` : v < 0 ? `악 ${-v}` : '중립');
/** "선 +1" / "악 +2" for a move of the scale */
export const moveText = (delta: number) => (delta > 0 ? `선 +${delta}` : `악 +${-delta}`);

/** Moves the scale and unlocks every 인연 whose mark it reached. Returns the names of 인연 unlocked now. */
export function moveAlign(delta: number): string[] {
  const s = G.state;
  s.align = clamp(s.align + delta, -ALIGN_MAX, ALIGN_MAX);
  const opened: string[] = [];
  for (const id of NPC_IDS) {
    const n = NPCS[id],
      reach = n.side === 'good' ? s.align : -s.align;
    if (reach >= n.unlock && !s.unlocked.includes(id)) {
      s.unlocked.push(id);
      opened.push(n.name);
    }
  }
  return opened;
}

/** 인연 who can come to a 만남: the ones the scale has unlocked (every 인연 can come; no card needed). */
export const candidates = (): string[] => NPC_IDS.filter(id => G.state.unlocked.includes(id));

/** "인연이 열렸다 · 떠돌이 약선" for the 인연 a move unlocked, or '' */
export const openedText = (names: string[]) => (names.length ? '인연이 열렸다 · ' + names.join(', ') : '');
