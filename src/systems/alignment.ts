// 정·사 (docs/ability-redesign-plan.md, 4.3 and 7.7). Two points that only grow: 정 and 사 are counted apart, so
// 정 1 and then 사 1 is 정 1 · 사 1 (not 0). Passers-by and the choice to follow or defy an 인연 add to them.
// Who comes to a 만남 is rolled each time by the run's odds (MEET_ODDS): passer-by 6 : 정파 2 : 사파 2 at the start;
// each point moves `shift` from the passer-by to its side, until the passer-by has none left (then the odds stay).
// An 인연 of the side rolled comes, any of that side's 인연 at even odds. At the end of the run each 정 point adds 5%
// to the final score and each 사 point 5% to the 엽전 banked (systems/flow.ts `end`).
import { G } from '../core/context';
import { random } from '../core/rng';
import { MEET_ODDS, NPCS, type Side } from '../data/npcs';
import { NPC_IDS } from '../data/roster';

/** final score bonus per 정 point, final 엽전 bonus per 사 point */
export const VIRTUE_BONUS = 0.05;

/** "정 3 · 사 2" */
export const alignText = (s = G.state) => `정 ${s.good} · 사 ${s.evil}`;
/** "정 +1" / "사 +2" for points gained (a positive delta is 정, a negative one 사) */
export const moveText = (delta: number) => (delta > 0 ? `정 +${delta}` : `사 +${-delta}`);

/** Adds points (a positive delta to 정, a negative one to 사) and moves the 만남 odds toward that side. */
export function moveAlign(delta: number) {
  const s = G.state,
    side: Side = delta > 0 ? 'good' : 'evil';
  if (delta > 0) s.good += delta;
  else s.evil -= delta;
  const moved = Math.min(s.meetOdds.passer, Math.abs(delta) * MEET_ODDS.shift);
  s.meetOdds.passer -= moved;
  s.meetOdds[side] += moved;
}

/** Who comes to this 만남 (gameplay random): an 인연's id, or null for a passer-by. */
export function rollMeet(): string | null {
  const o = G.state.meetOdds,
    roll = random() * (o.passer + o.good + o.evil);
  if (roll < o.passer) return null;
  const side: Side = roll < o.passer + o.good ? 'good' : 'evil',
    list = NPC_IDS.filter(id => NPCS[id].side === side);
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

/** the 만남 odds now as percentages: [passer-by, 정파, 사파] */
export function meetChances(o = G.state.meetOdds) {
  const sum = o.passer + o.good + o.evil;
  return [o.passer, o.good, o.evil].map(n => Math.round((n / sum) * 100));
}
