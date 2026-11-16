// 인연 의뢰 (docs/ability-redesign-plan.md, 4.5). An 인연 comes to a 만남 with an 의뢰. Following it moves the
// 선·악 저울 toward the 인연's side, defying it moves it the other way; the move happens when the choice is made.
// Met in time, a followed 의뢰 raises the 인연 one level (its next skill), and pays 엽전 once the 인연 is at level 3;
// a defied one pays 엽전. The deadline is the next 만남: a full gauge fails an 의뢰 still running, and so does the end
// of the run. Failing costs only the reward.
import { done } from './scene-flow';
import { on } from '../core/events';
import { G } from '../core/context';
import { chime } from '../core/audio';
import { BR, COND } from '../data/branches';
import { QUEST_COINS } from '../data/meta';
import { NPCS } from '../data/npcs';
import { SKILLS } from '../data/skills';
import { label, ring } from '../render/fx';
import { announce, notify, syncHUD } from '../ui/hud';
import { learn } from './abilities';
import { moveAlign, moveText, openedText } from './alignment';
import { bondLevel } from './relationship';

export const BOND_MAX = 3;

/** a condition's target (the same on every stage) */
export const questTarget = (c: { n: number }) => c.n;
/** how far the scale moves when this 인연's 의뢰 is followed (+1 정파 / −1 사파) or defied (the other way) */
export const alignMove = (id: string, mode: string) =>
  (NPCS[id].side === 'good' ? 1 : -1) * (mode === 'follow' ? 1 : -1);
/** What meeting an 의뢰 gives: the 인연's next level, or 엽전. */
export function questReward(id: string, mode: string): { level: number; coins: number } {
  const next = bondLevel(id) + 1;
  return mode === 'follow' && next <= BOND_MAX ? { level: next, coins: 0 } : { level: 0, coins: QUEST_COINS };
}

export function questEvent(type, amount = 1) {
  if (G.state && G.mode === 'play') {
    G.state.stats ??= {};
    G.state.stats[type] =
      type === 'combo' ? Math.max(G.state.stats[type] || 0, G.state.combo) : (G.state.stats[type] || 0) + amount;
  }
  const q = G.state?.quest;
  if (!q || q.done || q.failed || q.t !== type || G.mode !== 'play' || G.state.phase === 'clear') return;
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

/** Raises an 인연 one level: they teach the skill of that level. */
export function raiseBond(id: string) {
  if (bondLevel(id) >= BOND_MAX) return;
  const level = bondLevel(id) + 1;
  G.state.bond[id] = level;
  learn(NPCS[id].levels[level - 1]);
}

export function completeQuest() {
  const q = G.state.quest,
    n = NPCS[q.npc],
    reward = questReward(q.npc, q.mode);
  q.done = true;
  q.prog = q.target;
  if (reward.level) raiseBond(q.npc);
  else G.state.coins += reward.coins;
  if (G.state.questPath) G.state.questPath.result = '성취';
  announce(
    '의뢰 성공',
    reward.level
      ? `${n.name} ${reward.level}단계 · ${SKILLS[n.levels[reward.level - 1]].name}`
      : `엽전 +${reward.coins}냥`,
    q.mode === 'follow' ? n.name + '의 뜻을 이루었다' : n.name + '의 뜻을 거슬러 제 길을 증명했다',
    BR[q.br].color,
    1.4,
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
export function acceptQuest(id, qmode) {
  const n = NPCS[id],
    met = G.state.met[id] || 0,
    q = n.quests[met % n.quests.length],
    c = qmode === 'follow' ? q.follow : q.defy,
    move = alignMove(id, qmode);
  G.state.met[id] = met + 1;
  const opened = moveAlign(move);
  G.state.quest = {
    npc: id,
    mode: qmode,
    t: c.t,
    target: questTarget(c),
    prog: 0,
    br: COND[c.t].br,
    done: false,
    failed: false,
    from: c.t === 'combo' ? G.state.combo : undefined,
  };
  G.state.path.push({ stage: G.state.encounters, npc: id, mode: qmode, t: c.t, result: '진행 중' });
  G.state.questPath = G.state.path[G.state.path.length - 1];
  done('encounter');
  label(
    (qmode === 'follow' ? '따른다' : '거스른다') + ' · ' + moveText(move),
    240,
    430,
    BR[G.state.quest.br].color,
    20,
  );
  if (opened.length) notify(openedText(opened), 2);
}

// 의뢰 progress is driven by combat events.
export function registerQuestListeners() {
  on('graze', () => questEvent('graze'));
  on('zigzag', () => questEvent('step'));
  on('rowClear', () => questEvent('rowClear'));
  on('nearKill', () => questEvent('nearKill'));
  on('kill', () => questEvent('combo'));
}
