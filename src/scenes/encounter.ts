// 공명의 조짐 card (2026-11, docs/resonance-plan.md): opened by its timing (systems/encounter.ts). One card shows the
// condition and its time; a tap anywhere takes it, or it is taken by itself after TAP_SECONDS. No 인연 or passer-by
// comes any more (the 만남 card, the 인연 levels, 정·사 and the passers-by were removed).
import { G } from '../core/context';
import { skillImage } from '../core/assets';
import type { Quest } from '../core/state-types';
import { BR, COND } from '../data/branches';
import { openChoice } from './choice';
import { BASELINE } from '../data/baseline';
import { region } from '../systems/flow';
import { acceptQuest, closeQuest, rollSign, signOf } from '../systems/quest';
import { done } from '../systems/scene-flow';

const eyebrow = () => `S${G.state.stage} ${region().name} · 조짐 ${G.state.encounters}`;
/** seconds the card waits before it is taken by itself (a tap takes it at once) */
const TAP_SECONDS = 10;

export function openEncounter() {
  const s = G.state;
  s.encounters++;
  // a 조짐 still open fails (its time or its success opened this one, so this is only a safeguard)
  closeQuest();
  s.meetArrive = undefined;
  const sign = rollSign();
  openChoice({
    eyebrow: eyebrow(),
    title: '공명의 조짐',
    encounter: true,
    tap: { seconds: TAP_SECONDS },
    cards: [
      {
        image: skillImage('sign'),
        artClass: 'npc-choice-art',
        color: BR[sign.br].color,
        tag: '권능이 떨리는 곳',
        title: signOf(sign.t)?.say ?? '',
        acts: [act(sign)],
      },
    ],
  });
}

/** The 조짐's task, and what meeting it brings. */
function act(q: Quest) {
  return {
    color: BR[COND[q.t].br].color,
    html: '',
    detail: `<div class="encounter-reward"><div><small>이루면</small><h4>공명 · 기술 하나를 고른다</h4></div></div><div class="encounter-task"><small>공명의 조짐</small><b>${COND[q.t].label} ${q.target}</b><span>${BASELINE.meet.quest}초 이내</span></div>`,
    onPick: () => {
      acceptQuest(q);
      done('encounter');
    },
  };
}
