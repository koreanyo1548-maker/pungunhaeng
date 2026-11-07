export const BR = {
  yu: { name: '유', hanja: '柔', color: '#7fe6cf' },
  gang: { name: '강', hanja: '剛', color: '#ff8f6e' },
  gi: { name: '기', hanja: '氣', color: '#ffd77a' },
  art: { name: '투학', hanja: '偸', color: '#e9c3ff' },
};
export const COND = {
  graze: { br: 'yu', label: '스침 (탄 곁·적 사이)', off: 0.45 },
  step: { br: 'yu', label: '보법 (빠른 좌우 전환)' },
  nearKill: { br: 'gang', label: '근접 격파 (코앞에서)' },
  rowClear: { br: 'gang', label: '한 줄 완전 격파' },
  combo: { br: 'gang', label: '연속 격파' },
  blast: { br: 'gi', label: '내공 해방' },
  blastKill: { br: 'gi', label: '해방 한 번에 6명 이상 격파' },
  fullCharge: { br: 'gi', label: '내공 가득 채우기' },
  charge: { br: 'gi', label: '내공 충전량' },
};
export const TRIG_NAME = {
  step: '보법 발동',
  graze: '스침 발동',
  nearKill: '근접 격파 발동',
  rowClear: '완전 격파 발동',
  combo10: '연속 10회 발동',
  blast: '해방 발동',
  tick: '자동 발동',
  passive: '상시',
};
