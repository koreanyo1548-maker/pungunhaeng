// 장비 between runs (docs/equipment-plan.md, 3장): opening boxes, 강화 and 인챈트. Rolls use Math.random, never the
// seeded run streams (core/rng.ts), so nothing here can change a run.
import { addGear, gearOf, profile, removeGear, saveProfile, wearer } from '../core/profile';
import {
  BOX_ODDS,
  ENCHANT_COST,
  GEAR_BOX_COST,
  GEAR_ITEMS,
  GEAR_ITEM_IDS,
  PLUS_MAX,
  enchantPool,
  enchantValue,
  plusCost,
} from '../data/gear';
import type { Gear } from '../data/gear';

/** Opens one box: a random item (all equally likely) at a 등급 by the box's odds. Saved. */
export function openBox(kind: keyof typeof BOX_ODDS): Gear {
  const item = GEAR_ITEM_IDS[Math.floor(Math.random() * GEAR_ITEM_IDS.length)],
    odds = BOX_ODDS[kind];
  let roll = Math.random(),
    grade = 1;
  for (let i = 0; i < odds.length; i++) {
    if (roll < odds[i]) {
      grade = i + 1;
      break;
    }
    roll -= odds[i];
  }
  return addGear(item, grade);
}
/** Buys and opens n 장비 상자 with banked 엽전; null when the bank cannot pay. */
export function buyBoxes(n: number): Gear[] | null {
  if (profile.coins < GEAR_BOX_COST * n) return null;
  profile.coins -= GEAR_BOX_COST * n;
  const out = Array.from({ length: n }, () => openBox('shop'));
  saveProfile();
  return out;
}

/** a piece nobody wears (a material can be used up) */
const free = (g: Gear, not: number) => g.uid !== not && !wearer(g.uid);
/** materials for 강화: the same item, not worn; the weakest first */
export const plusMaterials = (target: Gear) =>
  profile.gear
    .filter(g => g.item === target.item && free(g, target.uid))
    .sort((a, b) => a.grade - b.grade || a.plus - b.plus || a.uid - b.uid);
/** materials for 인챈트: any piece not worn but the target; the weakest first */
export const enchantMaterials = (target: Gear) =>
  profile.gear.filter(g => free(g, target.uid)).sort((a, b) => a.grade - b.grade || a.plus - b.plus || a.uid - b.uid);

/** What stands in the way of 강화 now, or null when it can go. */
export function plusBlock(target: Gear): string | null {
  if (target.plus >= PLUS_MAX) return '최대 강화';
  if (!plusMaterials(target).length) return `재료가 없다 (착용하지 않은 ${GEAR_ITEMS[target.item].name} 1개)`;
  if (profile.coins < plusCost(target.grade, target.plus)) return '엽전이 모자라다';
  return null;
}
/** 강화 +1: uses up the weakest same item and 엽전. False when it cannot. */
export function enhance(uid: number): boolean {
  const target = gearOf(uid);
  if (!target || plusBlock(target)) return false;
  profile.coins -= plusCost(target.grade, target.plus);
  removeGear(plusMaterials(target)[0].uid);
  target.plus++;
  saveProfile();
  return true;
}
/** 인챈트: uses up the material and 엽전, and puts a random factor of the slot's kind on the target (replacing one
 *  it had). Returns the target, or null when it cannot. */
export function enchant(uid: number, material: number): Gear | null {
  const target = gearOf(uid),
    m = gearOf(material);
  if (!target || !m || !free(m, uid) || profile.coins < ENCHANT_COST) return null;
  const pool = enchantPool(GEAR_ITEMS[target.item].slot),
    factor = pool[Math.floor(Math.random() * pool.length)];
  profile.coins -= ENCHANT_COST;
  removeGear(m.uid);
  target.enchant = { factor, value: enchantValue(factor) };
  saveProfile();
  return target;
}
