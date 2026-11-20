// Colours and seals of the old skill families. They only colour skills and 의뢰 now: rewards no longer depend
// on a family (docs/ability-redesign-plan.md, 4.5).
export const BR = {
  yu: { name: '회피', hanja: '柔', color: '#7fe6cf' },
  gang: { name: '공격', hanja: '剛', color: '#ff8f6e' },
  gi: { name: '필살', hanja: '氣', color: '#ffd77a' },
  art: { name: '보스', hanja: '偸', color: '#e9c3ff' },
};
/** 의뢰 conditions. A target is the same on every stage. */
export const COND = {
  graze: { br: 'yu', label: '스침 (탄·적 곁)' },
  step: { br: 'yu', label: '좌우 전환 (빠르게)' },
  nearKill: { br: 'gang', label: '근접 처치 (근접 ×3 거리)' },
  rowClear: { br: 'gang', label: '한 줄 전멸' },
  combo: { br: 'gang', label: '연속 처치' },
  /** a passer-by's 의뢰 (systems/virtue.ts) */
  kills: { br: 'gang', label: '적 처치' },
  coins: { br: 'gi', label: '엽전 획득' },
};
