import type { HeroArt, HeroId } from './roster';

// Each hero has a trait, on while that hero fights (one hero a run). `L` is the hero's 성급 minus one, 0 (★1) to
// 4 (★5). The numbers the game uses live here (`value`) so the text and the effect cannot drift apart;
// systems/hero-effects.ts applies them. See docs/ability-redesign-plan.md (3장).
// (2026-11: the entry skills — a timed effect when the second hero of the party entered — went with the party;
// 비천's 어검진, 홍련's 홍련화, 묵영's 그림자 분신 and 목청완's 관창 became 공명 기술, data/skills.ts. The two support
// heroes' "party" traits now work for the hero alone.)

export interface HeroTrait {
  name: string;
  desc: (L: number) => string;
  /** the trait's number at this level (radius, chance, multiplier, count), when it has one */
  value?: (L: number) => number;
  /** shown when the trait has no effect yet (it needs a later step of the redesign) */
  pending?: string;
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
}

const star5 = (L: number) => L >= 4;
const pct = (n: number) => Math.round(n * 100) + '%';

export const HEROES: Record<HeroId, Hero> = {
  pungun: {
    art: { frames: { sheet: 'hero-run', row: 0 }, portrait: { sheet: 'characters/pungun-portrait' }, swapPose: 0 },
    name: '풍운객',
    terrain: 'ground',
    tint: null,
    color: '#ff8f6e',
    projectile: '검기',
    trait: {
      name: '질풍',
      value: L => 80 + 10 * L,
      desc: L => `근접 처치 시 주변 탄 제거 (반경 ${80 + 10 * L})`,
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
      value: L => (star5(L) ? 2 : 1),
      desc: L => `체력 +${star5(L) ? 2 : 1}`,
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
      value: L => 1.4 + 0.05 * L,
      desc: L => `스침 범위 +${pct(0.4 + 0.05 * L)}`,
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
      value: L => 10 - L,
      desc: L => `연속 처치 ${10 - L}마다 비검이 날아가 가까운 적을 벤다 (기본 공격 4발 위력)`,
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
      value: L => (star5(L) ? 2 : 1),
      desc: L => `판 시작 필살기 +${star5(L) ? 2 : 1}`,
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
      value: L => 0.15 + 0.025 * L,
      desc: L => `치명타 ${pct(0.15 + 0.025 * L)} (피해 2배)`,
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
      // the same magnet as the 자석 item (BASELINE.magnet), always on while she stands
      value: () => 1,
      desc: () => '자석: 가까운 엽전을 끌어당긴다',
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
      value: L => (star5(L) ? 2 : 1),
      desc: L => `기본 공격이 적 ${star5(L) ? 2 : 1}명 관통`,
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
      value: L => 0.5 + 0.1 * L,
      desc: L => `처치 시 엽전 +${pct(0.5 + 0.1 * L)}`,
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
      value: L => 0.5 + 0.1 * L,
      desc: L => `무아지경 시간 +${pct(0.5 + 0.1 * L)}`,
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
      value: L => 0.15 + 0.03 * L,
      desc: L => `공명의 조짐 목표 −${pct(0.15 + 0.03 * L)}`,
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
      value: L => 0.2 + 0.05 * L,
      desc: L => `공격력 +${pct(0.2 + 0.05 * L)}`,
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
