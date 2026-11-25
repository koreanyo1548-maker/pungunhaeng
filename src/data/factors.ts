// 팩터: the smallest unit of an effect that meta growth gives (docs/equipment-plan.md, 4장). Equipment, hero traits
// and levels each give a list of factors; systems/factors.ts adds them up when a run starts, and the game rules read
// only that sum. A % is kept as a fraction (0.05 = 5%).
// This file imports nothing, so any module can read it.

export const FACTOR_IDS = [
  // 전투
  'attackPct',
  'dualSeconds',
  'pierce',
  'fireRatePct',
  'critChance',
  'critDamage',
  'bombs',
  'bombPower',
  'entrySeconds',
  // 생존
  'maxHp',
  'grazePct',
  'hitInvuln',
  // 수집
  'magnetPct',
  'coinPct',
  'dropPct',
  'eliteChance',
  // 점수
  'doubleSeconds',
  'distanceScorePct',
  'virtueScorePct',
  'hyperSeconds',
] as const;
export type FactorId = (typeof FACTOR_IDS)[number];
export type FactorEntry = { factor: FactorId; value: number };
export type Factors = Partial<Record<FactorId, number>>;

export type FactorKind = 'combat' | 'survival' | 'collect' | 'score';
export type FactorInfo = {
  name: string;
  kind: FactorKind;
  /** hero: belongs to the hero who has it (gear gives only these); party: a run-wide effect (item seconds, 엽전,
   *  score), kept for a later source shared by the whole party (docs/equipment-plan.md 10장) */
  party?: boolean;
  /** how the value reads: a % (fraction), seconds, or a count */
  unit: '%' | '%p' | '초' | '마리' | '목숨' | '회';
};

export const FACTORS: Record<FactorId, FactorInfo> = {
  attackPct: { name: '공격력', kind: 'combat', unit: '%' },
  dualSeconds: { name: '듀얼샷 시간', kind: 'combat', unit: '초', party: true },
  pierce: { name: '관통', kind: 'combat', unit: '마리' },
  fireRatePct: { name: '발사 간격 단축', kind: 'combat', unit: '%' },
  critChance: { name: '치명타 확률', kind: 'combat', unit: '%' },
  critDamage: { name: '치명타 피해', kind: 'combat', unit: '%' },
  bombs: { name: '필살기', kind: 'combat', unit: '회' },
  bombPower: { name: '필살기 위력', kind: 'combat', unit: '%' },
  entrySeconds: { name: '등장 기술 시간', kind: 'combat', unit: '초' },
  maxHp: { name: '최대 체력', kind: 'survival', unit: '목숨' },
  grazePct: { name: '스침 범위', kind: 'survival', unit: '%' },
  hitInvuln: { name: '피격 뒤 무적', kind: 'survival', unit: '초' },
  magnetPct: { name: '자석 범위', kind: 'collect', unit: '%', party: true },
  coinPct: { name: '엽전 획득', kind: 'collect', unit: '%', party: true },
  dropPct: { name: '아이템 드롭', kind: 'collect', unit: '%', party: true },
  eliteChance: { name: '정예 적 등장', kind: 'collect', unit: '%p', party: true },
  doubleSeconds: { name: '점수 두 배 시간', kind: 'score', unit: '초', party: true },
  distanceScorePct: { name: '거리 점수 보너스', kind: 'score', unit: '%', party: true },
  virtueScorePct: { name: '정도 점수 보너스', kind: 'score', unit: '%', party: true },
  hyperSeconds: { name: '무아지경 시간', kind: 'score', unit: '초', party: true },
};

/** "공격력 +15%", "듀얼샷 시간 +1초", "관통 +1마리" */
export function factorText(f: FactorId, value: number) {
  const info = FACTORS[f];
  const n =
    info.unit === '%' || info.unit === '%p'
      ? `${+(value * 100).toFixed(1)}${info.unit}`
      : `${+value.toFixed(2)}${info.unit === '목숨' ? '' : info.unit}`;
  return `${info.name} +${n}`;
}

/** the factors that belong to a hero: what gear (and its 인챈트) can give */
export const HERO_FACTORS = FACTOR_IDS.filter(f => !FACTORS[f].party);

/** Adds entries into a sum. */
export function addFactors(into: Factors, list: readonly FactorEntry[]) {
  for (const { factor, value } of list) into[factor] = (into[factor] ?? 0) + value;
  return into;
}
