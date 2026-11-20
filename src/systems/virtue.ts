// 행인 (passers-by, docs/ability-redesign-plan.md 4.4 and 7.8): who comes to a 만남 when the roll is not an 인연
// (systems/alignment.ts). A passer-by brings an 의뢰 too: 돕는다 asks for kills (PASSER_QUESTS) and pays 엽전,
// 무시한다 asks for 엽전 taken and turns 점수 두 배 on. Which of the two adds 정 and which 사 is rolled for each
// passer-by. Portraits go in order; they are keyed by art in core/ambient-art.ts.
import { G } from '../core/context';
import { random } from '../core/rng';
import type { Quest } from '../core/state-types';
import { offerQuest, passerTarget } from './quest';

export const PASSERS = [
  {
    art: 'market-woman',
    name: '아낙네',
    title: '장에 다녀오는 길',
    ask: '짐이 무거워 고개를 못 넘겠소.',
  },
  {
    art: 'wanderer',
    name: '떠돌이 행인',
    title: '봇짐 하나 멘 나그네',
    ask: '길을 잃었소. 큰길이 어디요?',
  },
  {
    art: 'woodcutter',
    name: '늙은 나무꾼',
    title: '산길의 나무꾼',
    ask: '나뭇짐 좀 같이 들어 주겠소?',
  },
  { art: 'lost-child', name: '길 잃은 아이', title: '엄마를 찾는 아이', ask: '엄마를 찾아 주세요…' },
];
/** a passer-by's 의뢰 by choice: the condition and the range its target is rolled in (whole numbers) */
export const PASSER_QUESTS = {
  help: { label: '돕는다', t: 'kills', n: [30, 40] },
  ignore: { label: '무시한다', t: 'coins', n: [20, 30] },
};
/** the passer-by of this 만남 */
export const passerNow = () => PASSERS[G.state.passers % PASSERS.length];

/** What this passer-by offers (gameplay random): 돕는다 and 무시한다, one 정 and the other 사, with their targets. */
export function passerOffer(): Quest[] {
  const who = passerNow(),
    helpMove = random() < 0.5 ? 1 : -1;
  return (['help', 'ignore'] as const).map(mode => {
    const def = PASSER_QUESTS[mode],
      n = def.n[0] + Math.floor(random() * (def.n[1] - def.n[0] + 1));
    return offerQuest({
      npc: null,
      who: { art: who.art, name: who.name },
      mode,
      move: mode === 'help' ? helpMove : -helpMove,
      t: def.t,
      target: passerTarget(n),
    });
  });
}
