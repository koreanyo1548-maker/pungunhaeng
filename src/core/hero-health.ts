import { HERO_IDS } from '../data/roster';
import type { HeroId } from '../data/roster';
import type { HeroHealth, RunState } from './state-types';

export const BASE_HEALTH = 1;
export function createHeroHealth(): Record<HeroId, HeroHealth> {
  return Object.fromEntries(HERO_IDS.map(id => [id, { hp: BASE_HEALTH, maxHp: BASE_HEALTH, fallen: false }])) as Record<
    HeroId,
    HeroHealth
  >;
}
export function heroCanFight(state: RunState, id: HeroId): boolean {
  const health = state.heroHealth[id];
  return !health.fallen && health.hp > 0;
}
/** Shared learned skills strengthen the party; healing never brings back a fallen hero. */
export function changePartyMaxHealth(state: RunState, delta: number) {
  for (const health of Object.values(state.heroHealth)) {
    health.maxHp = Math.max(BASE_HEALTH, health.maxHp + delta);
    if (!health.fallen) health.hp = Math.min(health.maxHp, health.hp + Math.max(0, delta));
  }
}
