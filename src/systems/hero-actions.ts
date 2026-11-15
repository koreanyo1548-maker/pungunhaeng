import { G } from '../core/context';
import { withSkill } from '../core/skill-context';

// Simulation-time actions, never wall-clock timers. A swap/death/scene change cancels pending attacks.
const pending: { run: typeof G.state; owner: number; stage: number; due: number; id: string; act: () => void }[] = [];
export function queueHeroAction(id: string, delay: number, act: () => void) {
  pending.push({ run: G.state, owner: G.state.active, stage: G.state.stage, due: G.time + delay, id, act });
}
export function clearHeroActions() {
  pending.length = 0;
}
export function updateHeroActions() {
  for (const item of [...pending]) {
    const valid =
      item.run === G.state &&
      item.owner === G.state?.active &&
      item.stage === G.state?.stage &&
      G.mode === 'play' &&
      G.player.hp > 0 &&
      ['flight', 'boss', 'warning'].includes(G.state.phase);
    if (!valid || G.time >= item.due) {
      pending.splice(pending.indexOf(item), 1);
      if (valid) withSkill(item.id, item.act);
    }
  }
}
