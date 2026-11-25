import type { HeroArt, HeroId } from './roster';

// Each hero has a trait (on while that hero fights, or for the whole party for the two support heroes) and an
// entry skill: a timed effect that starts when the hero enters as the second of the party, after the first falls.
// `L` is the hero's 성급 minus one, 0 (★1) to 4 (★5). The numbers the game uses live here (`value`, `seconds`)
// so the text and the effect cannot drift apart; systems/hero-effects.ts applies them.
// See docs/ability-redesign-plan.md (3장, 7장).

export type TraitScope = 'self' | 'party';
export interface HeroTrait {
  name: string;
  scope: TraitScope;
  desc: (L: number) => string;
  /** the trait's number at this level (radius, chance, multiplier, count), when it has one */
  value?: (L: number) => number;
  /** shown when the trait has no effect yet (it needs a later step of the redesign) */
  pending?: string;
}
export interface HeroEntry {
  name: string;
  desc: (L: number) => string;
  /** seconds the effect lasts; 0 for 풍운객, whose 계승 takes the fallen hero's skill and time */
  seconds: (L: number) => number;
}
export interface Hero {
  name: string;
  /** which body art the hero uses (running or flying frames); no longer a road affinity */
  terrain: 'ground' | 'sky';
  tint: string | null;
  color: string;
  art: HeroArt;
  /** what the hero's basic shots look like (all heroes shoot the same) */
  projectile: string;
  trait: HeroTrait;
  entry: HeroEntry;
}

/** ★3 and ★5 change an entry skill's shape; seconds grow by one per star level. */
const time = (base: number) => (L: number) => base + L;
const star3 = (L: number) => L >= 2,
  star5 = (L: number) => L >= 4;
const pct = (n: number) => Math.round(n * 100) + '%';

export const HEROES: Record<HeroId, Hero> = {
  pungun: {
    art: { frames: { sheet: 'hero-run', row: 0 }, portrait: { sheet: 'portraits', col: 0, row: 0 }, swapPose: 0 },
    name: '풍운객',
    terrain: 'ground',
    tint: null,
    color: '#ff8f6e',
    projectile: '검기',
    trait: {
      name: '질풍',
      scope: 'self',
      value: L => 80 + 10 * L,
      desc: L => `근접 처치 시 주변 탄 제거 (반경 ${80 + 10 * L})`,
    },
    entry: {
      name: '계승',
      desc: L =>
        '쓰러진 선봉의 등장 기술을 대신 펼친다' +
        (star3(L) ? ' · 시간 +50%' : '') +
        (star5(L) ? ' · 선봉의 특성도 이어받음' : ''),
      seconds: () => 0,
    },
  },
  cheolhyeol: {
    art: { frames: { sheet: 'hero-run', row: 1 }, portrait: { sheet: 'portraits', col: 1, row: 0 }, swapPose: 1 },
    name: '철혈',
    terrain: 'ground',
    tint: 'rgba(150,28,18,.42)',
    color: '#ff6b57',
    projectile: '권기',
    trait: {
      name: '철혈',
      scope: 'self',
      value: L => (star5(L) ? 2 : 1),
      desc: L => `체력 +${star5(L) ? 2 : 1}`,
    },
    entry: {
      name: '불굴',
      desc: L =>
        `맞아도 쓰러지지 않고, 맞을 때마다 주변 충격파` +
        (star3(L) ? ' · 충격파 확대' : '') +
        (star5(L) ? ' · 끝날 때 체력 +1' : ''),
      seconds: time(15),
    },
  },
  mukyoung: {
    art: { frames: { sheet: 'hero-run', row: 2 }, portrait: { sheet: 'portraits', col: 2, row: 0 }, swapPose: 2 },
    name: '묵영',
    terrain: 'ground',
    tint: 'rgba(8,12,30,.55)',
    color: '#a7b3d6',
    projectile: '암기',
    trait: {
      name: '묵영보',
      scope: 'self',
      value: L => 1.4 + 0.05 * L,
      desc: L => `스침 범위 +${pct(0.4 + 0.05 * L)}`,
    },
    entry: {
      name: '그림자 분신',
      desc: L => `분신 ${star5(L) ? 3 : star3(L) ? 2 : 1}개가 같은 공격을 따라 쏜다`,
      seconds: time(15),
    },
  },
  bicheon: {
    art: { frames: { sheet: 'hero-fly', row: 0 }, portrait: { sheet: 'portraits', col: 0, row: 1 }, swapPose: 3 },
    name: '비천',
    terrain: 'sky',
    tint: 'rgba(30,190,180,.36)',
    color: '#7fe6cf',
    projectile: '어검',
    trait: {
      name: '비천',
      scope: 'self',
      value: L => 10 - L,
      desc: L => `연속 처치 ${10 - L}마다 비검이 날아가 가까운 적을 벤다 (기본 공격 4발 위력)`,
    },
    entry: {
      name: '어검진',
      desc: L =>
        `비검 ${star3(L) ? 5 : 3}자루가 주위를 돌며 탄을 막고 적을 벤다` + (star5(L) ? ' · 비검 피해 2배' : ''),
      seconds: time(20),
    },
  },
  unhak: {
    art: { frames: { sheet: 'hero-fly', row: 1 }, portrait: { sheet: 'portraits', col: 1, row: 1 }, swapPose: 4 },
    name: '운학',
    terrain: 'sky',
    tint: 'rgba(245,238,214,.5)',
    color: '#ffd77a',
    projectile: '깃털',
    trait: {
      name: '운학',
      scope: 'party',
      value: L => (star5(L) ? 2 : 1),
      desc: L => `판 시작 필살기 +${star5(L) ? 2 : 1} (편대 전체)`,
    },
    entry: {
      name: '학의 장막',
      desc: L =>
        '주위 결계 안에 들어온 탄이 사라진다' +
        (star3(L) ? ' · 결계 확대' : '') +
        (star5(L) ? ' · 결계 안 적도 피해' : ''),
      seconds: time(12),
    },
  },
  hongryeon: {
    art: { frames: { sheet: 'hero-fly', row: 2 }, portrait: { sheet: 'portraits', col: 2, row: 1 }, swapPose: 5 },
    name: '홍련',
    terrain: 'sky',
    tint: 'rgba(210,50,105,.4)',
    color: '#ff8fb0',
    projectile: '비도',
    trait: {
      name: '홍련',
      scope: 'self',
      value: L => 0.15 + 0.025 * L,
      desc: L => `치명타 ${pct(0.15 + 0.025 * L)} (피해 2배)`,
    },
    entry: {
      name: '홍련화',
      desc: L =>
        '모든 공격이 치명타' + (star3(L) ? ' · 치명타 피해 2.5배' : '') + (star5(L) ? ' · 치명타 때 불꽃 폭발' : ''),
      seconds: time(15),
    },
  },
  yeoncheong: {
    art: heroineArt(0),
    name: '황연청',
    terrain: 'ground',
    tint: null,
    color: '#9ddca8',
    projectile: '은침',
    trait: {
      name: '영민',
      scope: 'party',
      // the same magnet as the 자석 item (BASELINE.magnet), always on while she stands
      value: () => 1,
      desc: () => '자석: 가까운 엽전을 끌어당긴다 (편대 전체)',
    },
    entry: {
      name: '은침 비',
      desc: L =>
        `은침이 위쪽 적을 자동 사격` + (star3(L) ? ' · 은침 2배' : '') + (star5(L) ? ' · 은침이 탄도 지움' : ''),
      seconds: time(20),
    },
  },
  cheongwan: {
    art: heroineArt(1),
    name: '목청완',
    terrain: 'ground',
    tint: null,
    color: '#e8ae88',
    projectile: '창',
    trait: {
      name: '일점관통',
      scope: 'self',
      value: L => (star5(L) ? 2 : 1),
      desc: L => `기본 공격이 적 ${star5(L) ? 2 : 1}명 관통`,
    },
    entry: {
      name: '관창',
      desc: L => `${star5(L) ? '0.4' : '0.6'}초마다 정면으로 거대 관통 창 투척` + (star3(L) ? ' · 창 2자루씩' : ''),
      seconds: time(10),
    },
  },
  seolyeong: {
    art: heroineArt(2),
    name: '매설영',
    terrain: 'ground',
    tint: null,
    color: '#e889a0',
    projectile: '채찍',
    trait: {
      name: '음풍보',
      scope: 'self',
      value: L => 0.5 + 0.1 * L,
      desc: L => `처치 시 엽전 +${pct(0.5 + 0.1 * L)}`,
    },
    entry: {
      name: '음풍',
      desc: L => `적 탄 속도 ${star5(L) ? '1/3' : '절반'}` + (star3(L) ? ' · 적 이동도 느려짐' : ''),
      seconds: time(15),
    },
  },
  soun: {
    art: heroineArt(3),
    name: '한소운',
    terrain: 'ground',
    tint: null,
    color: '#91baff',
    projectile: '쾌검',
    trait: {
      name: '쾌검',
      scope: 'self',
      value: L => 0.5 + 0.1 * L,
      desc: L => `무아지경 시간 +${pct(0.5 + 0.1 * L)}`,
    },
    entry: {
      name: '질풍',
      desc: L => '무아지경 질주 (무적, 빠른 진행)' + (star5(L) ? ' · 끝날 때 화면 탄 제거' : ''),
      seconds: L => 8 + L + (star3(L) ? 3 : 0),
    },
  },
  yoran: {
    art: heroineArt(4),
    name: '정요란',
    terrain: 'ground',
    tint: null,
    color: '#eee5c7',
    projectile: '검기',
    trait: {
      name: '정심',
      scope: 'self',
      value: L => 0.15 + 0.03 * L,
      desc: L => `의뢰 목표 −${pct(0.15 + 0.03 * L)}`,
    },
    entry: {
      name: '정심반사',
      desc: L =>
        (star5(L) ? '모든 방향의' : '앞에서 오는') +
        ' 탄을 튕겨 적에게 되돌린다' +
        (star3(L) ? ' · 되돌린 탄 위력 2배' : ''),
      seconds: time(8),
    },
  },
  ayeong: {
    art: heroineArt(5),
    name: '아영',
    terrain: 'ground',
    tint: null,
    color: '#8ed6cc',
    projectile: '화살',
    trait: {
      name: '명궁',
      scope: 'self',
      value: L => 0.2 + 0.05 * L,
      desc: L => `공격력 +${pct(0.2 + 0.05 * L)}`,
    },
    entry: {
      name: '매의 눈',
      desc: L =>
        '기본 공격이 가까운 적을 자동 조준' +
        (star3(L) ? ' · 화살 관통' : '') +
        (star5(L) ? ' · 특성 공격력 +10% 추가' : ''),
      seconds: time(12),
    },
  },
};

function heroineArt(index: number): HeroArt {
  const group = index < 3 ? 'a' : 'b';
  return {
    frames: { sheet: `heroines/run-${group}`, row: index % 3 },
    portrait: { sheet: 'heroines/portraits', col: index % 3, row: Math.floor(index / 3) },
    cast: { sheet: `heroines/cast-${group}`, row: index % 3 },
    castScale: 1,
  };
}
