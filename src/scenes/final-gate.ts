// 최종 관문 (심마): out of the run flow since the stage redesign (docs/ability-redesign-plan.md, 4.1). Kept for the
// special stage 심마 will become; nothing opens it now.
import { G } from '../core/context';
import { BR } from '../data/branches';
import { NPCS } from '../data/npcs';
import { SIMMA } from '../data/stages';
import { openChoice } from './choice';

export function openFinalGate(onEnter: () => void) {
  const met = Object.keys(G.state.bond).filter(k => G.state.bond[k] > 0),
    list = met.length
      ? met.map(k => `<b style="color:${BR[NPCS[k].br].color}">${NPCS[k].name}</b> (${G.state.bond[k]}단계)`).join(', ')
      : '없음';
  openChoice({
    eyebrow: '특별 스테이지',
    title: SIMMA.name,
    sub: SIMMA.intro,
    cards: [
      {
        color: SIMMA.color,
        tag: '지난 인연',
        title: SIMMA.enter,
        desc: '<b>함께한 인연:</b> ' + list,
        onPick: onEnter,
      },
    ],
  });
}
