// 최종 관문 (심마): out of the run flow since the stage redesign (docs/ability-redesign-plan.md, 4.1). Kept for the
// special stage 심마 will become; nothing opens it now.
import { G } from '../core/context';
import { BR } from '../data/branches';
import { SKILLS } from '../data/skills';
import { SIMMA } from '../data/stages';
import { openChoice } from './choice';

export function openFinalGate(onEnter: () => void) {
  // (2026-11: it listed the 인연 met; 인연 are not used since 공명, so it lists the 공명 기술 held)
  const list = G.state.skills.length
    ? G.state.skills
        .map(s => `<b style="color:${BR[SKILLS[s.id].br].color}">${SKILLS[s.id].name}</b> (Lv ${s.level})`)
        .join(', ')
    : '없음';
  openChoice({
    eyebrow: '특별 스테이지',
    title: SIMMA.name,
    sub: SIMMA.intro,
    cards: [
      {
        color: SIMMA.color,
        tag: '지난 공명',
        title: SIMMA.enter,
        desc: '<b>공명 기술:</b> ' + list,
        onPick: onEnter,
      },
    ],
  });
}
