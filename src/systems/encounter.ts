// 처치 게이지 (docs/ability-redesign-plan.md, 4.2 and 7.6). Kills fill it, each by its enemy's tier (1 to 6, the
// tier ladder; a 보물상자 or 바위 counts as the step's strong tier), so the few strong kills of a late step fill it as
// steadily as the many weak ones of the start. It is apart from the score. When it is full a 만남 opens: an 인연
// with an 의뢰 when one can come (systems/alignment.ts), otherwise a passer-by (scenes/encounter.ts).
//   - Only in flight: the boss warning and the boss fight neither fill it nor open a 만남; the boss kill is not
//     counted. Kills by 필살기 and 무아지경 count.
//   - Overflow carries into the next gauge, but never fills it: one 만남 at a time.
//   - 정요란 fills it faster while she fights (her trait).
//   - A 만남 opens at the end of a step, and not in the step a hero entered (it waits one step).
import { G } from '../core/context';
import { traitValue } from './hero-effects';
import { go } from './scene-flow';
import { region } from './flow';

/** the gauge's size on this stage, in tiers of the kills (data/stages.ts `gauge`) */
export const gaugeMax = () => region().gauge;
/** what a kill adds to the gauge: its tier (1 for an enemy with none) */
export const gaugeWorth = (e: { tier?: number }) => e.tier ?? 1;

/** A kill: fills the gauge by its tier (kill() in entities/enemies.ts). */
export function addKill(e: { boss?: boolean; tier?: number }) {
  const s = G.state;
  if (e.boss || s.phase !== 'flight') return;
  const add = gaugeWorth(e) * (1 + (traitValue('yoran') ?? 0));
  s.gauge += add;
  s.gaugeEarned += add;
  const max = gaugeMax();
  if (s.gauge >= max && !s.meetReady) {
    s.meetReady = true;
    s.gauge -= max;
  }
  if (s.meetReady) s.gauge = Math.min(s.gauge, max - 1);
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
