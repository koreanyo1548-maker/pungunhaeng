// 장비 (docs/equipment-plan.md, 3장): four slots. Gear gives only what belongs to the hero who wears it (attack,
// health, 필살기 …: HERO_FACTORS), each item what fits its name; run-wide effects (items, 엽전, score) are not gear's
// (2026-11: they would switch off when the other hero of the party takes over). A piece of gear is an item (its slot
// and base factor), a 등급 (★1 to ★3), a 강화 (+0 to +5) and maybe one 인챈트 factor. Numbers are first
// proposals; balance is set by play (docs/workflow.md 8장).
// Imports only data with no imports, so any module can read it.
import { HERO_FACTORS } from './factors';
import type { FactorEntry, FactorId, FactorKind } from './factors';

export const SLOTS = ['weapon', 'robe', 'charm', 'manual'] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_INFO: Record<Slot, { name: string; kind: FactorKind; kindName: string }> = {
  weapon: { name: '무기', kind: 'combat', kindName: '전투' },
  robe: { name: '의복', kind: 'survival', kindName: '생존' },
  charm: { name: '장신구', kind: 'collect', kindName: '수집' },
  manual: { name: '비급', kind: 'score', kindName: '점수' },
};

export type GearItem = { name: string; slot: Slot; factor: FactorId; color: string };
export const GEAR_ITEMS = {
  cheonggang: { name: '청강검', slot: 'weapon', factor: 'attackPct', color: '#9fd7ff' },
  ssangbisu: { name: '쌍비수', slot: 'weapon', factor: 'critChance', color: '#ff9a7a' },
  gwanil: { name: '관일창', slot: 'weapon', factor: 'pierce', color: '#c9b6ff' },
  yeonno: { name: '연노', slot: 'weapon', factor: 'fireRatePct', color: '#ffd27a' },
  cheolpo: { name: '철포', slot: 'robe', factor: 'maxHp', color: '#b8c4cc' },
  unmu: { name: '운무의', slot: 'robe', factor: 'grazePct', color: '#bfe9ff' },
  hosin: { name: '호신갑', slot: 'robe', factor: 'hitInvuln', color: '#d9c08a' },
  // (ids stay as saved; 혈옥환·호골낭·속사결·금강결 were 자석환·금전낭·천리보·정도결)
  jaseok: { name: '혈옥환', slot: 'charm', factor: 'critDamage', color: '#ff7a7a' },
  geumjeon: { name: '호골낭', slot: 'charm', factor: 'attackPct', color: '#ffdf87' },
  yeongmul: { name: '영물패', slot: 'charm', factor: 'bombs', color: '#c5f9ff' },
  pyoguk: { name: '표국 영패', slot: 'charm', factor: 'maxHp', color: '#ff8f6e' },
  ssanghui: { name: '쌍희보', slot: 'manual', factor: 'critChance', color: '#ffd36e' },
  cheolli: { name: '속사결', slot: 'manual', factor: 'fireRatePct', color: '#a8e6cf' },
  jeongdo: { name: '금강결', slot: 'manual', factor: 'attackPct', color: '#9fd7ff' },
  mua: { name: '무아심법', slot: 'manual', factor: 'hitInvuln', color: '#c5ffff' },
} as const satisfies Record<string, GearItem>;
export type GearItemId = keyof typeof GEAR_ITEMS;
export const GEAR_ITEM_IDS = Object.keys(GEAR_ITEMS) as GearItemId[];

export const GRADE_MAX = 3;
export const PLUS_MAX = 5;

/** a factor's value at ★1 / ★2 / ★3; `flat` ones do not grow with 강화 but gain one more at +5 */
export const GRADE_VALUES: Record<FactorId, { grades: [number, number, number]; flat?: boolean }> = {
  attackPct: { grades: [0.05, 0.1, 0.15] },
  dualSeconds: { grades: [0.5, 1, 1.5] },
  pierce: { grades: [1, 1, 2], flat: true },
  fireRatePct: { grades: [0.03, 0.06, 0.09] },
  critChance: { grades: [0.03, 0.06, 0.09] },
  critDamage: { grades: [0.2, 0.4, 0.6] },
  bombs: { grades: [1, 1, 2], flat: true },
  maxHp: { grades: [1, 1, 2], flat: true },
  grazePct: { grades: [0.1, 0.2, 0.3] },
  hitInvuln: { grades: [0.2, 0.4, 0.6] },
  magnetPct: { grades: [0.1, 0.2, 0.3] },
  coinPct: { grades: [0.05, 0.1, 0.15] },
  dropPct: { grades: [0.1, 0.2, 0.3] },
  eliteChance: { grades: [0.05, 0.1, 0.15] },
  doubleSeconds: { grades: [0.5, 1, 1.5] },
  distanceScorePct: { grades: [0.05, 0.1, 0.15] },
  virtueScorePct: { grades: [0.25, 0.5, 1] },
  hyperSeconds: { grades: [0.2, 0.4, 0.6] },
};
/** each 강화 adds this share of the 등급 value (+5: twice the value) */
export const PLUS_STEP = 0.2;

/** A piece of gear the player holds. */
export type Gear = {
  /** unique within the profile */
  uid: number;
  item: GearItemId;
  /** 1 to GRADE_MAX */
  grade: number;
  /** 0 to PLUS_MAX */
  plus: number;
  enchant?: FactorEntry;
};

/** the base factor's value of an item at a 등급 and 강화 */
export function baseValue(item: GearItemId, grade: number, plus: number) {
  const g = GRADE_VALUES[GEAR_ITEMS[item].factor],
    v = g.grades[grade - 1];
  return g.flat ? v + (plus >= PLUS_MAX ? 1 : 0) : +(v * (1 + PLUS_STEP * plus)).toFixed(4);
}
/** everything a piece of gear gives */
export function gearFactors(g: Gear): FactorEntry[] {
  const out: FactorEntry[] = [{ factor: GEAR_ITEMS[g.item].factor, value: baseValue(g.item, g.grade, g.plus) }];
  if (g.enchant) out.push(g.enchant);
  return out;
}
/** "청강검 ★2 +3" */
export const gearName = (g: Gear) => `${GEAR_ITEMS[g.item].name} ${'★'.repeat(g.grade)}${g.plus ? ' +' + g.plus : ''}`;

/** the factors an 인챈트 can roll: any that belongs to a hero, whatever the slot */
export const enchantPool = (_slot?: Slot): FactorId[] => [...HERO_FACTORS];
/** an 인챈트's value: the factor's ★1 value */
export const enchantValue = (f: FactorId) => GRADE_VALUES[f].grades[0];

// ---- prices and odds (first proposals)
/** 엽전 for 강화 from +plus to +plus+1 */
export const plusCost = (grade: number, plus: number) => 50 * (plus + 1) * grade;
export const ENCHANT_COST = 100;
/** the 장비 상자 of the 뽑기 screen */
export const GEAR_BOX_COST = 200;
/** 등급 odds (★1, ★2, ★3) of a box from the 뽑기 and from a 정예 적 */
export const BOX_ODDS = { shop: [0.7, 0.25, 0.05], elite: [0.5, 0.4, 0.1] } as const;
