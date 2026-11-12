// Meta progression numbers: what is kept between runs. See docs/meta-progression-plan.md.
// A stat's level is the number of entries of `costs` already bought; level 0 is the base game.

export type StatId = 'power' | 'charge' | 'fortune' | 'hp' | 'bombs' | 'swap';

type Stat = {
  name: string;
  /** what one level does, for the row's label */
  per: string;
  /** price of each level, in 엽전 */
  costs: number[];
  /** the value shown for a level ("지금 → 다음") */
  show: (level: number) => string;
};

export const STATS: Record<StatId, Stat> = {
  power: {
    name: '공격력',
    per: '기본 공격과 기술 위력 +4%',
    costs: [200, 300, 450, 650, 900, 1200, 1600, 2100, 2700, 3400],
    show: l => '+' + l * 4 + '%',
  },
  charge: {
    name: '필살기 충전',
    per: '충전량 +5%',
    costs: [250, 400, 650, 1000, 1500, 2200],
    show: l => '+' + l * 5 + '%',
  },
  fortune: {
    name: '재물운',
    per: '판이 끝날 때 보관하는 엽전 +5%',
    costs: [300, 500, 800, 1200, 1800, 2600],
    show: l => '+' + l * 5 + '%',
  },
  hp: {
    name: '체력',
    per: '시작 체력 +1',
    costs: [1500, 4000],
    show: l => '♥ ' + (3 + l),
  },
  bombs: {
    name: '필살기 준비',
    per: '시작 필살기 +1회',
    costs: [2000],
    show: l => 2 + l + '회',
  },
  swap: {
    name: '교체 숙련',
    per: '교체 대기 -0.5초',
    costs: [800, 1800],
    show: l => 6 - l * 0.5 + '초',
  },
};
export const STAT_IDS = Object.keys(STATS) as StatId[];

/** 엽전 added to the bank for finishing the final gate. */
export const CLEAR_BONUS = 300;

// 영웅 수집: two heroes to start with, the rest join when a condition is met.
export const HERO_IDS = ['pungun', 'cheolhyeol', 'mukyoung', 'bicheon', 'unhak', 'hongryeon'] as const;
export type HeroId = (typeof HERO_IDS)[number];
/** One hero that fits each road. */
export const STARTERS: HeroId[] = ['pungun', 'bicheon'];

/** Progress counted across runs, for unlock conditions. */
export type Records = {
  /** furthest gate cleared on each road (4 = the final gate) */
  gates: { ground: number; sky: number };
  clears: { ground: number; sky: number };
  grazes: number;
};
export const emptyRecords = (): Records => ({
  gates: { ground: 0, sky: 0 },
  clears: { ground: 0, sky: 0 },
  grazes: 0,
});
type Unlock = { text: string; progress: (r: Records) => [number, number] };
export const UNLOCKS: Partial<Record<HeroId, Unlock>> = {
  cheolhyeol: { text: '땅의 길 관문 2 돌파', progress: r => [Math.min(2, r.gates.ground), 2] },
  unhak: { text: '하늘의 길 관문 2 돌파', progress: r => [Math.min(2, r.gates.sky), 2] },
  mukyoung: { text: '스침 누적 300회', progress: r => [Math.min(300, r.grazes), 300] },
  hongryeon: { text: '어느 길이든 완주', progress: r => [Math.min(1, r.clears.ground + r.clears.sky), 1] },
};
export function unlocked(id: HeroId, r: Records): boolean {
  const u = UNLOCKS[id];
  if (!u) return true;
  const [now, goal] = u.progress(r);
  return now >= goal;
}

/**
 * 숙련: a hero gains 1 for every gate cleared while in the formation. These totals are the steps ★1 to ★5;
 * each step strengthens the hero's trait and swap skill (see systems/formation.ts and data/heroes.ts).
 */
export const MASTERY_STEPS = [0, 3, 8, 15, 25];
export const MASTERY_MAX = MASTERY_STEPS.length - 1;
/** 0 (★1) to 4 (★5) */
export function masteryLevel(mastery: number): number {
  let level = 0;
  while (level < MASTERY_MAX && mastery >= MASTERY_STEPS[level + 1]) level++;
  return level;
}
export const masteryStars = (level: number) => '★'.repeat(level + 1) + '☆'.repeat(MASTERY_MAX - level);

/** What a run reads. Copied from the profile when the run starts, so a seed and a snapshot replay the same run. */
export type Meta = {
  stats: Record<StatId, number>;
  /** mastery level of each hero, 0 to 4 */
  heroes: Record<HeroId, number>;
};
export const emptyMeta = (): Meta => ({
  stats: { power: 0, charge: 0, fortune: 0, hp: 0, bombs: 0, swap: 0 },
  heroes: { pungun: 0, cheolhyeol: 0, mukyoung: 0, bicheon: 0, unhak: 0, hongryeon: 0 },
});

/** 엽전 a run adds to the bank: what is left, plus the clear bonus, raised by 재물운. */
export function settle(coins: number, victory: boolean, fortune: number): number {
  return Math.floor((coins + (victory ? CLEAR_BONUS : 0)) * (1 + 0.05 * fortune));
}
