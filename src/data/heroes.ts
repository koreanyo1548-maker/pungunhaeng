import { queueHeroAction } from '../systems/hero-actions';
import { skillCue } from '../render/skill-animation';
import { G } from '../core/context';
import { targetable } from '../entities/enemies';
import { ring } from '../render/fx';
import { D, aoe, clearBullets, column, fan, fireShot, gainCharge } from '../systems/combat';
import type { HeroArt, HeroId } from './roster';

// `L` is the hero's 성급 minus one, 0 (★1) to 4 (★5): it strengthens the trait (see systems/formation.ts for the
// numbers the game uses) and the swap skill. `m` is 2 for a well-timed swap.
export const HEROES = {
  pungun: {
    art: { frames: { sheet: 'hero-run', row: 0 }, portrait: { sheet: 'portraits', col: 0, row: 0 }, swapPose: 0 },
    name: '풍운객',
    terrain: 'ground',
    tint: null,
    color: '#ff8f6e',
    trait: '질풍',
    traitDesc: (L = 0) => `근접 처치 시 필살기 충전 +${5 + L}`,
    tag: '풍운검',
    tagDesc: '전방으로 관통 검강 3줄기',
    fx: (m, L = 0) => {
      for (const vx of [-150, 0, 150])
        fireShot(G.player.x, G.player.y - 40, vx, D() * 5 * m * (1 + 0.1 * L), {
          kind: 'gang',
          pierce: true,
          w: 10 + 4 * m,
          color: '#ff8f6e',
        });
    },
  },
  cheolhyeol: {
    art: { frames: { sheet: 'hero-run', row: 1 }, portrait: { sheet: 'portraits', col: 1, row: 0 }, swapPose: 1 },
    name: '철혈',
    terrain: 'ground',
    tint: 'rgba(150,28,18,.42)',
    color: '#ff6b57',
    trait: '철혈',
    traitDesc: (L = 0) => `공격력 +${25 + 4 * L}%`,
    tag: '붕천각',
    tagDesc: '주변에 큰 충격파',
    fx: (m, L = 0) => aoe(G.player.x, G.player.y - 40, 120 + 50 * m, D() * 6 * m * (1 + 0.1 * L), '#ff6b57'),
  },
  mukyoung: {
    art: { frames: { sheet: 'hero-run', row: 2 }, portrait: { sheet: 'portraits', col: 2, row: 0 }, swapPose: 2 },
    name: '묵영',
    terrain: 'ground',
    tint: 'rgba(8,12,30,.55)',
    color: '#a7b3d6',
    trait: '묵영보',
    traitDesc: (L = 0) => `스침 판정 +${40 + 5 * L}%`,
    tag: '암영',
    tagDesc: '잠깐 몸을 감추고 주변 탄을 지운다',
    fx: (m, L = 0) => {
      G.player.inv = Math.max(G.player.inv, 0.6 * m + 0.2 + 0.1 * L);
      clearBullets(G.player.x, G.player.y, 130 * m + 20);
    },
  },
  bicheon: {
    art: { frames: { sheet: 'hero-fly', row: 0 }, portrait: { sheet: 'portraits', col: 0, row: 1 }, swapPose: 3 },
    name: '비천',
    terrain: 'sky',
    tint: 'rgba(30,190,180,.36)',
    color: '#7fe6cf',
    trait: '비천',
    traitDesc: (L = 0) => `공격력 +${25 + 4 * L}%`,
    tag: '비천어검',
    tagDesc: '검의 비가 강한 적들에게 꽂힌다',
    fx: (m, L = 0) => {
      const power = D() * 5 * (1 + 0.1 * L);
      const l = G.enemies
        .filter(targetable)
        .sort((a, b) => b.hp - a.hp)
        .slice(0, 4 * m);
      for (const e of l) column(e.x, power, '#7fe6cf', 28);
      if (!l.length) column(G.player.x, power, '#7fe6cf', 28);
    },
  },
  unhak: {
    art: { frames: { sheet: 'hero-fly', row: 1 }, portrait: { sheet: 'portraits', col: 1, row: 1 }, swapPose: 4 },
    name: '운학',
    terrain: 'sky',
    tint: 'rgba(245,238,214,.5)',
    color: '#ffd77a',
    trait: '운학',
    traitDesc: (L = 0) => `필살기 충전 +${40 + 5 * L}%`,
    tag: '학익진',
    tagDesc: '필살기 충전을 크게 채운다',
    fx: (m, L = 0) => {
      gainCharge(45 * m + 5 * L);
      ring(G.player.x, G.player.y, '#ffd77a', 10, 120, 0.4);
    },
  },
  hongryeon: {
    art: { frames: { sheet: 'hero-fly', row: 2 }, portrait: { sheet: 'portraits', col: 2, row: 1 }, swapPose: 5 },
    name: '홍련',
    terrain: 'sky',
    tint: 'rgba(210,50,105,.4)',
    color: '#ff8fb0',
    trait: '홍련',
    traitDesc: (L = 0) => `기본 공격 속도 +${20 + 3 * L}%`,
    tag: '홍련비도',
    tagDesc: '부채꼴로 비도를 흩뿌린다',
    fx: (m, L = 0) => fan(5 + 4 * m + L, 0.15, D() * 1.8, '#ff8fb0'),
  },
  yeoncheong: {
    art: heroineArt(0),
    name: '황연청',
    terrain: 'ground',
    tint: null,
    color: '#9ddca8',
    trait: '영민',
    traitDesc: (L = 0) => `기본 공격 속도 +${12 + 2 * L}%, 필살기 충전 +${15 + 3 * L}%`,
    tag: '탄지비침',
    tagDesc: '부채꼴로 은침 7줄기를 발사한다',
    fx: (m, L = 0) => fan(7, 0.12, D() * 2 * m * (1 + 0.1 * L), '#9ddca8'),
  },
  cheongwan: {
    art: heroineArt(1),
    name: '목청완',
    terrain: 'ground',
    tint: null,
    color: '#e8ae88',
    trait: '일점관통',
    traitDesc: (L = 0) => `공격력 +${20 + 4 * L}%`,
    tag: '회마관창',
    tagDesc: '전방 한 줄을 강하게 관통하는 창격',
    fx: (m, L = 0) =>
      fireShot(G.player.x, G.player.y - 42, 0, D() * 10 * m * (1 + 0.1 * L), {
        kind: 'gang',
        pierce: true,
        w: 16,
        vy: 1100,
        color: '#e8ae88',
      }),
  },
  seolyeong: {
    art: heroineArt(2),
    name: '매설영',
    terrain: 'ground',
    tint: null,
    color: '#e889a0',
    trait: '음풍보',
    traitDesc: (L = 0) => `스침 판정 +${25 + 4 * L}%, 공격력 +${10 + 2 * L}%`,
    tag: '음풍편',
    tagDesc: '전방 가까운 적들을 채찍으로 휩쓴다',
    fx: (m, L = 0) => {
      const y = G.player.y - 90,
        radius = 145;
      aoe(G.player.x, y, radius, D() * 7 * m * (1 + 0.1 * L), '#e889a0');
      skillCue('seolyeong', G.player.x, y, radius * 2, false, false, true, 1);
    },
  },
  soun: {
    art: heroineArt(3),
    name: '한소운',
    terrain: 'ground',
    tint: null,
    color: '#91baff',
    trait: '쾌검',
    traitDesc: (L = 0) => `기본 공격 속도 +${20 + 3 * L}%`,
    tag: '쌍연참',
    tagDesc: '전방을 시간차로 두 번 베어낸다',
    fx: (m, L = 0) => {
      const strike = () => {
        aoe(G.player.x, G.player.y - 105, 115, D() * 3.5 * m * (1 + 0.1 * L), '#91baff');
        skillCue('soun', G.player.x, G.player.y - 105, 230, false, false, true, 1);
      };
      strike();
      queueHeroAction('soun', 0.18, strike);
    },
  },
  yoran: {
    art: heroineArt(4),
    name: '정요란',
    terrain: 'ground',
    tint: null,
    color: '#eee5c7',
    trait: '정심',
    traitDesc: (L = 0) => `필살기 충전 +${30 + 5 * L}%`,
    tag: '정심반격',
    tagDesc: '근처 탄을 지우고 곧은 검기로 반격한다',
    fx: (m, L = 0) => {
      clearBullets(G.player.x, G.player.y, 110 + 20 * m);
      fireShot(G.player.x, G.player.y - 40, 0, D() * 5 * m * (1 + 0.1 * L), {
        kind: 'gang',
        pierce: true,
        w: 12,
        color: '#eee5c7',
      });
    },
  },
  ayeong: {
    art: heroineArt(5),
    name: '아영',
    terrain: 'ground',
    tint: null,
    color: '#8ed6cc',
    trait: '명궁',
    traitDesc: (L = 0) => `공격력 +${15 + 3 * L}%, 기본 공격 속도 +${8 + L}%`,
    tag: '삼연시',
    tagDesc: '전방 적을 향해 화살을 세 번 연속 발사한다',
    fx: (m, L = 0) => {
      const arrow = () => {
        const target = G.enemies
          .filter(e => targetable(e) && e.y < G.player.y)
          .sort(
            (a, b) => Math.hypot(a.x - G.player.x, a.y - G.player.y) - Math.hypot(b.x - G.player.x, b.y - G.player.y),
          )[0];
        const dx = target ? target.x - G.player.x : 0,
          dy = target ? Math.max(40, G.player.y - 34 - target.y) : 900;
        const length = Math.hypot(dx, dy);
        fireShot(G.player.x, G.player.y - 34, (dx / length) * 1050, D() * 4 * m * (1 + 0.1 * L), {
          vy: (dy / length) * 1050,
          color: '#8ed6cc',
        });
      };
      arrow();
      queueHeroAction('ayeong', 0.12, arrow);
      queueHeroAction('ayeong', 0.24, arrow);
    },
  },
} satisfies Record<HeroId, { name: string; art: HeroArt; [key: string]: unknown }>;

function heroineArt(index: number): HeroArt {
  const group = index < 3 ? 'a' : 'b';
  return {
    frames: { sheet: `heroines/run-${group}`, row: index % 3 },
    portrait: { sheet: 'heroines/portraits', col: index % 3, row: Math.floor(index / 3) },
    cast: { sheet: `heroines/cast-${group}`, row: index % 3 },
    castScale: 1,
  };
}
