export const BR = {
  yu: { name: '회피', hanja: '柔', color: '#7fe6cf' },
  gang: { name: '공격', hanja: '剛', color: '#ff8f6e' },
  gi: { name: '필살', hanja: '氣', color: '#ffd77a' },
  art: { name: '보스', hanja: '偸', color: '#e9c3ff' },
};
export const COND = {
  graze: { br: 'yu', label: '스침 (탄 곁·적 사이)', off: 0.45 },
  step: { br: 'yu', label: '좌우 전환 (빠르게)' },
  nearKill: { br: 'gang', label: '근접 처치 (코앞에서)' },
  rowClear: { br: 'gang', label: '한 줄 전멸' },
  combo: { br: 'gang', label: '연속 처치' },
  blast: { br: 'gi', label: '필살기 사용' },
  blastKill: { br: 'gi', label: '필살기 한 번에 6명 이상 처치' },
  fullCharge: { br: 'gi', label: '필살기 충전 가득 채우기' },
  charge: { br: 'gi', label: '필살기 충전량' },
};
