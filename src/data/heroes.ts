import { G } from '../core/context';
import { targetable } from '../entities/enemies';
import { ring } from '../render/fx';
import { D, aoe, clearBullets, column, fan, fireShot, gainCharge } from '../systems/combat';
import type { HeroArt, HeroId } from './roster';

// `L` is the hero's mastery level, 0 (★1) to 4 (★5): it strengthens the trait (see systems/formation.ts for the
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
} satisfies Record<HeroId, { name: string; art: HeroArt; [key: string]: unknown }>;
