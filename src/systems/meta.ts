// Run-side bookkeeping for meta progression: what a run writes back to the profile.
// The simulation never reads these writes; it only reads the snapshot taken when the run started.
import { G } from '../core/context';
import { profile, saveProfile } from '../core/profile';
import { HERO_IDS, MASTERY_STEPS, unlocked } from '../data/meta';
import type { HeroId } from '../data/meta';
import { HEROES } from '../data/heroes';
import { notify } from '../ui/hud';
import { isFinal } from './run-plan';

/** A gate was cleared: the heroes in the formation gain mastery, and the road's record moves forward. */
export function gateCleared() {
  const s = G.state,
    road = s.course as 'ground' | 'sky',
    cap = MASTERY_STEPS[MASTERY_STEPS.length - 1];
  for (const id of new Set<HeroId>(s.formation)) {
    const h = profile.heroes[id];
    h.mastery = Math.min(cap, h.mastery + 1);
  }
  profile.records.gates[road] = Math.max(profile.records.gates[road], Math.min(4, s.stage));
  if (isFinal()) profile.records.clears[road]++;
  commit();
}
/** The run ended (victory or not): bank what is counted per run. The caller saves the profile. */
export function runEnded() {
  bankGrazes();
  checkUnlocks();
}
function commit() {
  bankGrazes();
  checkUnlocks();
  saveProfile();
}
function bankGrazes() {
  const s = G.state;
  profile.records.grazes += s.grazes - (s.grazesBanked ?? 0);
  s.grazesBanked = s.grazes;
}
function checkUnlocks() {
  for (const id of HERO_IDS) {
    const h = profile.heroes[id];
    if (h.owned || !unlocked(id, profile.records)) continue;
    h.owned = true;
    (G.state.newHeroes ??= []).push(id);
    (G.state.heroNews ??= []).push(HEROES[id].name);
    notify('새 영웅 합류 · ' + HEROES[id].name, 2.2);
  }
}
