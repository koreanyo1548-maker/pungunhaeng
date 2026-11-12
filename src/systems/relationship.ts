import { G } from '../core/context';
import { josa, rnd } from '../core/math';
import { NPCS, NPC_LINK } from '../data/npcs';
import { TUNE } from '../data/tune';

/** 인연 card level of this 인연 for the current run (0 to 5), from the snapshot taken when the run started. */
export const cardRank = (id: string): number => G.state?.meta?.cards?.[id] ?? 0;
/** 호감도 needed for the 인연 to pass on their unique skill; a level 3 card lowers it by one. */
export const sasaNeed = (id: string): number => TUNE.sasaRel - (cardRank(id) >= 3 ? 1 : 0);
export function nextNpcOf(id, qmode) {
  return qmode === 'follow' ? NPC_LINK[id] : NPCS[id].rival;
}
export function pickNpc() {
  if (G.state.forceNpc) {
    const id = G.state.forceNpc;
    G.state.forceNpc = null;
    return { id, why: '수소문 끝에 ' + josa(NPCS[id].name, '을', '를') + ' 찾아냈다.' };
  }
  const last = G.state.path[G.state.path.length - 1];
  if (!last) {
    const ids = Object.keys(NPCS);
    const id = ids[Math.floor(rnd(0, ids.length))];
    return { id, why: josa(NPCS[id].name, '이', '가') + ' 길목에서 기다리고 있다.' };
  }
  const prev = NPCS[last.npc].name;
  if (last.result === '미달') return { id: last.npc, why: josa(prev, '이', '가') + ' 다시 의뢰를 청한다.' };
  const id = nextNpcOf(last.npc, last.mode),
    n = NPCS[id].name;
  return {
    id,
    why:
      last.mode === 'follow'
        ? josa(prev, '이', '가') + ' 그대를 ' + josa(n, '에게', '에게') + ' 소개했다.'
        : josa(prev, '을', '를') + ' 거스른 소식을 듣고 ' + josa(n, '이', '가') + ' 찾아왔다.',
  };
}
