// 의뢰 (docs/ability-redesign-plan.md, 4.4 and 4.5). Every 만남 brings one: an 인연's or a passer-by's.
//   - 인연: following adds a point to the 인연's side (정 or 사), defying it a point to the other side; the point comes
//     when the choice is made. The target is about 5/6 of the condition's full count, ±10% (QUEST_SHARE,
//     QUEST_SPREAD), the same however often the 인연 comes. Met, a followed 의뢰 raises the 인연 one level (its next
//     skill), and pays 엽전 once the 인연 is at level 3; a defied one pays 엽전.
//   - Passer-by: 돕는다 asks for kills and pays 엽전, 무시한다 asks for 엽전 taken and turns 점수 두 배 on; which of the
//     two is 정 and which 사 is rolled for each passer-by (systems/virtue.ts).
// It has BASELINE.meet.quest s of flight: met, the next 만남 opens at once; run out (or at the end of the run) it
// fails, and the next 만남 opens (systems/encounter.ts). Failing costs only the reward. 정요란 (her trait, while she
// fights) cuts every target. Nothing counts during 무아지경.
import { done } from './scene-flow';
import { on } from '../core/events';
import { G } from '../core/context';
import { chime } from '../core/audio';
import { ambientPictures } from '../core/ambient-art';
import { BR, COND } from '../data/branches';
import { QUEST_COINS } from '../data/meta';
import { NPCS } from '../data/npcs';
import type { NpcId } from '../data/roster';
import { SKILLS } from '../data/skills';
import type { Quest } from '../core/state-types';
import { label, ring } from '../render/fx';
import { actionCallout } from '../render/callout';
import { announce, notify, syncHUD } from '../ui/hud';
import { learn } from './abilities';
import { moveAlign, moveText } from './alignment';
import { bondLevel } from './relationship';
import { addBond } from '../core/profile';
import { BASELINE } from '../data/baseline';
import { traitValue } from './hero-effects';
import { doubleSeconds } from '../entities/pickups';

export const BOND_MAX = 3;

/** an 인연's 의뢰 asks this share of its condition's full count, give or take QUEST_SPREAD */
export const QUEST_SHARE = 5 / 6;
export const QUEST_SPREAD = 0.1;
/** what 정요란 (while she fights) cuts from a target */
const cut = () => 1 - (traitValue('yoran') ?? 0);
/** an 인연 condition's target: its full count × QUEST_SHARE, × (1 ± QUEST_SPREAD) by `roll` (−1 to 1), cut by 정요란 */
export const questTarget = (c: { n: number }, roll = 0) =>
  Math.max(1, Math.round(c.n * QUEST_SHARE * (1 + QUEST_SPREAD * roll) * cut()));
/** a passer-by's target from a whole count (rolled in its range), cut by 정요란 */
export const passerTarget = (n: number) => Math.max(1, Math.round(n * cut()));
/** the point this 인연's 의뢰 gives when followed (+1 정 for 정파 / −1 = 사 +1 for 사파) or defied (the other side) */
export const alignMove = (id: string, mode: string) =>
  (NPCS[id].side === 'good' ? 1 : -1) * (mode === 'follow' ? 1 : -1);

export type Reward = { level: number; coins: number; double: boolean };
/** What meeting an 의뢰 gives: the 인연's next level, 엽전, or 점수 두 배 (a passer-by's 무시한다). */
export function questReward(q: Pick<Quest, 'npc' | 'mode'>): Reward {
  if (!q.npc)
    return q.mode === 'ignore' ? { level: 0, coins: 0, double: true } : { level: 0, coins: QUEST_COINS, double: false };
  const next = bondLevel(q.npc) + 1;
  return q.mode === 'follow' && next <= BOND_MAX
    ? { level: next, coins: 0, double: false }
    : { level: 0, coins: QUEST_COINS, double: false };
}
/** "1단계 「철골」", "엽전 50냥", "점수 두 배 3초" */
export function rewardName(q: Pick<Quest, 'npc' | 'mode'>) {
  const r = questReward(q);
  if (r.level) return `${r.level}단계 「${SKILLS[NPCS[q.npc as string].levels[r.level - 1]].name}」`;
  return r.double ? `점수 두 배 ${+doubleSeconds().toFixed(1)}초` : `엽전 ${r.coins}냥`;
}

/** An 의뢰 as offered at a 만남 (not yet accepted). */
export function offerQuest(o: {
  npc: string | null;
  who?: Quest['who'];
  mode: string;
  move: number;
  t: string;
  target: number;
}): Quest {
  return { ...o, br: COND[o.t].br, prog: 0, done: false, failed: false, left: BASELINE.meet.quest };
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
    // the chain counts from the 의뢰's acceptance: a combo that ran into the 만남 does not count
    if (G.state.combo < (q.from ?? 0)) q.from = 0;
    q.prog = Math.max(q.prog, G.state.combo - (q.from ?? 0));
  } else q.prog += amount;
  if (q.prog >= q.target) {
    completeQuest();
    return;
  }
  if (type !== 'combo') q.tick = G.time;
}

/** A 무아지경 kill counts for no 의뢰: a 연속 처치 의뢰 leaves it out of its chain. */
export function hyperQuestKill() {
  const q = G.state.quest;
  if (q && q.t === 'combo' && !q.done && !q.failed) q.from = (q.from ?? 0) + 1;
}

/** Raises an 인연 one level: they teach the skill of that level. */
export function raiseBond(id: string) {
  if (bondLevel(id) >= BOND_MAX) return;
  const level = bondLevel(id) + 1;
  G.state.bond[id] = level;
  learn(NPCS[id].levels[level - 1]);
}

export function completeQuest() {
  const q = G.state.quest,
    reward = questReward(q),
    title = rewardName(q);
  q.done = true;
  q.prog = q.target;
  // met: the reward shows, then the next 만남 comes (systems/encounter.ts)
  G.state.meetTimer = G.state.meetWait = BASELINE.meet.reward + BASELINE.meet.after;
  if (reward.level) raiseBond(q.npc as string);
  else if (reward.double) {
    G.state.double = doubleSeconds();
    actionCallout('double');
  } else G.state.coins += reward.coins;
  if (G.state.questPath) G.state.questPath.result = '성취';
  const name = q.npc ? NPCS[q.npc].name : (q.who?.name ?? '행인');
  announce(
    '의뢰 성공',
    q.npc && reward.level ? `${NPCS[q.npc].name} ${title}` : title,
    q.npc
      ? q.mode === 'follow'
        ? name + '의 뜻을 이루었다'
        : name + '의 뜻을 거슬러 제 길을 증명했다'
      : name + '와의 일을 마쳤다',
    BR[q.br].color,
    BASELINE.meet.reward,
  );
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
    if (G.mode === 'play') label('의뢰 실패', 240, 330, '#d6cdbd', 18);
  }
}
/** Takes an 의뢰 offered at the 만남: its point comes now. */
export function acceptQuest(offer: Quest) {
  const s = G.state;
  if (offer.npc) {
    s.met[offer.npc] = (s.met[offer.npc] || 0) + 1;
    // following raises the 인연's 호감도 at once (kept between runs; it takes effect from the next run)
    if (offer.mode === 'follow') addBond(offer.npc as NpcId);
  } else s.passers++;
  moveAlign(offer.move);
  s.quest = { ...offer, from: offer.t === 'combo' ? s.combo : undefined };
  s.offer = undefined;
  s.path.push({
    stage: s.encounters,
    npc: offer.npc,
    who: offer.who?.name,
    mode: offer.mode,
    t: offer.t,
    result: '진행 중',
  });
  s.questPath = s.path[s.path.length - 1];
  done('encounter');
  const act = { follow: '따른다', defy: '거스른다', help: '돕는다', ignore: '무시한다' }[offer.mode];
  label(`${act} · ${moveText(offer.move)}`, 240, 430, BR[s.quest.br].color, 20);
  // a grateful face for helping a passer-by
  if (offer.mode === 'help' && offer.who)
    notify(`${offer.who.name} · ${moveText(offer.move)}`, 1.6, ambientPictures[offer.who.art + '-grateful']);
}

// 의뢰 progress is driven by combat events.
export function registerQuestListeners() {
  on('graze', () => questEvent('graze'));
  on('zigzag', () => questEvent('step'));
  on('rowClear', () => questEvent('rowClear'));
  on('nearKill', () => questEvent('nearKill'));
  on('kill', () => questEvent('combo'));
  on('coin', ({ n }) => questEvent('coins', n));
}
