// 루트 팩터 (docs/equipment-plan.md, 4장): every source of meta growth gives factors, and they are added up here.
// The game rules read only `factor(id)`. Sources:
//   - 장비: the fighting hero's gear, copied into the run's snapshot when it starts (core/profile.ts metaSnapshot)
//   - 영웅 특성: the traits that are factors (홍련 치명타, 아영 공격력), while they are on (systems/hero-effects.ts)
// A hero's level gives the attack itself (hero-effects heroAttack). 공명 기술 learned in a run are not factors.
import { G } from '../core/context';
import { addFactors } from '../data/factors';
import type { FactorId, Factors } from '../data/factors';
import { activeHeroId } from './formation';
import { traitValue } from './hero-effects';

/** The traits that give a factor, and which. */
const TRAIT_FACTORS = [
  { hero: 'hongryeon', factor: 'critChance' },
  { hero: 'ayeong', factor: 'attackPct' },
] as const;

/** Everything the fighting hero gets now, added up. */
export function rootFactors(): Factors {
  const sum: Factors = {};
  if (!G.state?.meta) return sum;
  addFactors(sum, G.state.meta.gear?.[activeHeroId()] ?? []);
  for (const t of TRAIT_FACTORS) {
    const v = traitValue(t.hero);
    if (v) sum[t.factor] = (sum[t.factor] ?? 0) + v;
  }
  return sum;
}
/** One factor of the fighting hero now (0 when nothing gives it). */
export const factor = (id: FactorId): number => rootFactors()[id] ?? 0;
/** A factor from one hero's own gear (for what is set once per hero when the run starts, like health). */
export const heroGearFactor = (hero: string, id: FactorId): number =>
  (G.state?.meta?.gear?.[hero] ?? []).reduce((n, e) => n + (e.factor === id ? e.value : 0), 0);
