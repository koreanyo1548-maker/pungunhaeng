// 행인 (passers-by): when the 인연 a gate would bring has no 인연 card, an ordinary passer-by comes instead.
// There is no 의뢰. The player may give them 엽전, which builds 덕; 덕 raises the 엽전 banked at the end of the run
// (data/meta.ts settle). Passers-by have no pictures yet.
import { G } from '../core/context';
import { chime } from '../core/audio';
import { ALMS, ALMS_VIRTUE, VIRTUE_CAP, VIRTUE_RATE } from '../data/meta';
import { label } from '../render/fx';
import { done } from './scene-flow';

/** who stands at the roadside, by gate (no randomness, so the run's rolls are untouched) */
export const PASSERS = [
  { name: '아낙네', title: '장에 다녀오는 길', say: '흉년이라 끼니가 걱정이라오.' },
  { name: '떠돌이 행인', title: '봇짐 하나 멘 나그네', say: '노잣돈이 다 떨어졌소.' },
  { name: '늙은 나무꾼', title: '산길의 나무꾼', say: '허리가 예전 같지 않구먼.' },
  { name: '길 잃은 아이', title: '엄마를 찾는 아이', say: '배고파요…' },
];
export const passerOf = (stage: number) => PASSERS[(stage - 1) % PASSERS.length];

/** 덕 counted toward the bonus (capped) and the bonus it gives, in percent */
export function virtueBonus(virtue = G.state.virtue) {
  const v = Math.min(VIRTUE_CAP, virtue);
  return { v, percent: Math.round(v * VIRTUE_RATE * 100) };
}

/** The choice at a passer-by: give (pay ALMS, gain 덕) or walk on. Records it on the run's path. */
export function meetPasser(give: boolean) {
  const s = G.state,
    who = passerOf(s.stage);
  if (give) {
    s.coins -= ALMS;
    s.virtue += ALMS_VIRTUE;
    s.spent = (s.spent || 0) + ALMS;
    chime();
  }
  s.quest = null;
  s.path.push({
    stage: s.stage,
    npc: null,
    who: who.name,
    mode: give ? 'give' : 'pass',
    result: give ? '베풂' : '지나침',
  });
  done('crossroads');
  label(give ? `${who.name}에게 베풀었다 · 덕 +${ALMS_VIRTUE}` : '지나간다', 240, 430, '#ffd77a', 20);
}
