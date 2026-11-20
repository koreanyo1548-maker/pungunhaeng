// 행인 (passers-by, docs/ability-redesign-plan.md 4.4 and 7.8): who comes to a 만남 when no 인연 can. There is no
// 의뢰; what the player does adds 선 or 악 points. A passer-by's level is how many the run has met: the first is
// level 1 (help or ignore), every later one level 2 (give 엽전 or not). Portraits go in order (no randomness, so the
// run's rolls are untouched); they are keyed by art in core/ambient-art.ts.
import { ambientPictures } from '../core/ambient-art';
import { G } from '../core/context';
import { chime } from '../core/audio';
import { ALMS } from '../data/meta';
import { label } from '../render/fx';
import { notify } from '../ui/hud';
import { moveAlign, moveText, openedText } from './alignment';
import { done } from './scene-flow';
import { waitForMeet } from './encounter';
import { BASELINE } from '../data/baseline';

export const PASSERS = [
  {
    art: 'market-woman',
    name: '아낙네',
    title: '장에 다녀오는 길',
    ask: '짐이 무거워 고개를 못 넘겠소.',
    say: '흉년이라 끼니가 걱정이라오.',
  },
  {
    art: 'wanderer',
    name: '떠돌이 행인',
    title: '봇짐 하나 멘 나그네',
    ask: '길을 잃었소. 큰길이 어디요?',
    say: '노잣돈이 다 떨어졌소.',
  },
  {
    art: 'woodcutter',
    name: '늙은 나무꾼',
    title: '산길의 나무꾼',
    ask: '나뭇짐 좀 같이 들어 주겠소?',
    say: '허리가 예전 같지 않구먼.',
  },
  { art: 'lost-child', name: '길 잃은 아이', title: '엄마를 찾는 아이', ask: '엄마를 찾아 주세요…', say: '배고파요…' },
];
/** the passer-by of this 만남 and their level (1 or 2) */
export function passerNow() {
  const n = G.state.passers;
  return { who: PASSERS[n % PASSERS.length], level: n === 0 ? 1 : 2 };
}

/** What each choice does: the points it adds (+ 선, − 악), and 엽전 paid (level 2 giving). */
export const PASSER_ACTS = {
  1: [
    { kind: 'help', label: '돕는다', move: 1, cost: 0, result: '도움' },
    { kind: 'ignore', label: '무시한다', move: -1, cost: 0, result: '무시' },
  ],
  2: [
    { kind: 'give', label: '엽전을 베푼다', move: 2, cost: ALMS, result: '베풂' },
    { kind: 'keep', label: '안 베푼다', move: -1, cost: 0, result: '안 베풂' },
  ],
};

/** The choice at a passer-by (index into PASSER_ACTS of their level). Records it on the run's path. */
export function meetPasser(pick: number) {
  const s = G.state,
    { who, level } = passerNow(),
    act = PASSER_ACTS[level][pick];
  if (act.cost) {
    s.coins -= act.cost;
    s.spent = (s.spent || 0) + act.cost;
  }
  if (act.move > 0) chime();
  s.passers++;
  s.quest = null;
  waitForMeet(BASELINE.meet.afterPasser);
  const opened = moveAlign(act.move);
  s.path.push({ stage: s.encounters, npc: null, who: who.name, mode: act.kind, result: act.result });
  done('encounter');
  label(`${act.label} · ${moveText(act.move)}`, 240, 430, act.move > 0 ? '#ffd77a' : '#c9b8a6', 20);
  // a grateful face for a kindness; an unlock is named in the same toast
  if (act.move > 0)
    notify(
      [who.name + ' · ' + moveText(act.move), openedText(opened)].filter(Boolean).join(' · '),
      opened.length ? 2 : 1.6,
      ambientPictures[who.art + '-grateful'],
    );
  else if (opened.length) notify(openedText(opened), 2);
}
