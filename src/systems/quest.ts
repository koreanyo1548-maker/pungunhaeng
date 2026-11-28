// 공명의 조짐 (2026-11, docs/resonance-plan.md): the protagonist senses where a 공명 is forming and what it needs
// (스침, 좌우 전환, 근접 처치, 한 줄 전멸, 연속 처치). Each 조짐 is one condition, taken by itself (systems/encounter.ts
// opens its card). The target is about 5/6 of the condition's full count, ±10% (QUEST_SHARE, QUEST_SPREAD).
// It has BASELINE.meet.quest s of flight: met, a 공명 follows (the choice of a 공명 기술, scenes/resonance.ts) and
// the next 조짐 comes; run out (or at the end of the run) it fails and the next comes. Failing costs only the 공명.
// 정요란 (her trait, while she fights) cuts every target. Nothing counts during 무아지경.
// (This replaced the 만남 with an 인연 or a passer-by, their 의뢰, the 인연 levels and 정·사.)
import { on } from '../core/events';
import { G } from '../core/context';
import { chime } from '../core/audio';
import { random } from '../core/rng';
import { BR, COND } from '../data/branches';
import type { Quest } from '../core/state-types';
import { label, ring } from '../render/fx';
import { announce, syncHUD } from '../ui/hud';
import { BASELINE } from '../data/baseline';
import { traitValue } from './hero-effects';
import { candidates } from './resonance';

/** the 조짐: what each asks for, its full count, and how the protagonist reads it */
export const SIGNS = [
  { t: 'graze', n: 24, say: '적의 곁을 스쳐라' },
  { t: 'step', n: 90, say: '좌우로 빠르게 움직여라' },
  { t: 'nearKill', n: 12, say: '가까이서 베어라' },
  { t: 'rowClear', n: 4, say: '한 줄을 쓸어버려라' },
  { t: 'combo', n: 40, say: '끊김 없이 베어라' },
] as const;
export const signOf = (t: string) => SIGNS.find(s => s.t === t);

/** a 조짐 asks this share of its condition's full count, give or take QUEST_SPREAD */
export const QUEST_SHARE = 5 / 6;
export const QUEST_SPREAD = 0.1;
/** what 정요란 (while she fights) cuts from a target */
const cut = () => 1 - (traitValue('yoran') ?? 0);
/** a condition's target: its full count × QUEST_SHARE, × (1 ± QUEST_SPREAD) by `roll` (−1 to 1), cut by 정요란 */
export const questTarget = (c: { n: number }, roll = 0) =>
  Math.max(1, Math.round(c.n * QUEST_SHARE * (1 + QUEST_SPREAD * roll) * cut()));

/** Rolls the next 조짐 (gameplay random): any condition but the last one's (debug: forceSign picks it). */
export function rollSign(): Quest {
  const last = G.state.path[G.state.path.length - 1]?.t,
    list = SIGNS.filter(s => s.t !== last),
    forced = signOf(G.state.forceSign ?? ''),
    c = forced ?? list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  G.state.forceSign = undefined;
  return {
    t: c.t,
    target: questTarget(c, random() * 2 - 1),
    br: COND[c.t].br,
    prog: 0,
    done: false,
    failed: false,
    left: BASELINE.meet.quest,
  };
}

export function questEvent(type, amount = 1) {
  if (G.state && G.mode === 'play') {
    G.state.stats ??= {};
    G.state.stats[type] =
      type === 'combo' ? Math.max(G.state.stats[type] || 0, G.state.combo) : (G.state.stats[type] || 0) + amount;
  }
  const q = G.state?.quest;
  if (!q || q.done || q.failed || q.t !== type || G.mode !== 'play' || G.state.phase === 'clear') return;
  // nothing counts during 무아지경
  if (G.state.hyper > 0) return;
  if (type === 'combo') {
    // the chain counts from the 조짐: a combo that ran into it does not count
    if (G.state.combo < (q.from ?? 0)) q.from = 0;
    q.prog = Math.max(q.prog, G.state.combo - (q.from ?? 0));
  } else q.prog += amount;
  if (q.prog >= q.target) {
    completeQuest();
    return;
  }
  if (type !== 'combo') q.tick = G.time;
}

/** A 무아지경 kill counts for no 조짐: a 연속 처치 조짐 leaves it out of its chain. */
export function hyperQuestKill() {
  const q = G.state.quest;
  if (q && q.t === 'combo' && !q.done && !q.failed) q.from = (q.from ?? 0) + 1;
}

/** No more 조짐 once every slot is full and every skill held is at its last level. */
export const resonanceLeft = () => candidates().length > 0;

export function completeQuest() {
  const q = G.state.quest;
  q.done = true;
  q.prog = q.target;
  G.state.resonances++;
  // met: the 공명 choice opens at the next safe step (systems/encounter.ts), then the next 조짐 comes
  G.state.pickReady = true;
  G.state.meetTimer = G.state.meetWait = BASELINE.meet.reward + BASELINE.meet.after;
  if (G.state.questPath) G.state.questPath.result = '성취';
  announce('공명', '공명의 조짐을 이뤘다', signOf(q.t)?.say ?? '', BR[q.br].color, BASELINE.meet.reward);
  ring(G.player.x, G.player.y, BR[q.br].color, 10, 260, 0.6);
  G.flash = 0.15;
  chime();
  syncHUD();
}
export function closeQuest() {
  const q = G.state?.quest;
  if (q && !q.done && !q.failed) {
    q.failed = true;
    if (G.state.questPath) G.state.questPath.result = '미달';
    if (G.mode === 'play') label('공명의 조짐이 흩어졌다', 240, 330, '#d6cdbd', 18);
  }
}
/** The 조짐 on its card is taken (scenes/encounter.ts). */
export function acceptQuest(sign: Quest) {
  const s = G.state;
  s.quest = { ...sign, from: sign.t === 'combo' ? s.combo : undefined };
  s.path.push({ stage: s.encounters, t: sign.t, result: '진행 중' });
  s.questPath = s.path[s.path.length - 1];
  label(`공명의 조짐 · ${signOf(sign.t)?.say ?? ''}`, 240, 430, BR[s.quest.br].color, 20);
}

// 조짐 progress is driven by combat events.
export function registerQuestListeners() {
  on('graze', () => questEvent('graze'));
  on('zigzag', () => questEvent('step'));
  on('rowClear', () => questEvent('rowClear'));
  on('nearKill', () => questEvent('nearKill'));
  on('kill', () => questEvent('combo'));
  on('coin', ({ n }) => questEvent('coins', n));
}
