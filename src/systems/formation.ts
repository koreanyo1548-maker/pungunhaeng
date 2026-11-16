import { heroCanFight } from '../core/hero-health';
import { startSwapPose } from '../render/skill-animation';
import { G } from '../core/context';
import { heroAnimations } from '../core/assets';
import { tone } from '../core/audio';
import { HEROES } from '../data/heroes';
import type { HeroId } from '../data/roster';
import { burst, label, ring } from '../render/fx';
import { pfx, ramp } from '../render/pfx';
import { syncHUD } from '../ui/hud';
import { startEntry } from './hero-effects';

// The party: two heroes, the vanguard (선봉) and the second (후발). There is no manual swap: when the vanguard
// falls, the second hero enters and starts their entry skill (systems/hero-effects.ts).

export const heroTintCache = {};
export function activeHeroId(): HeroId {
  return G.state && G.mode !== 'title' ? G.state.formation[G.state.active] : 'pungun';
}
export function activeFrames() {
  return heroAnimations[activeHeroId()] || G.heroFrames;
}
/** The hero's 성급 minus one (0 = ★1 to 4 = ★5), as the run started with it. */
export function heroLevel(id: HeroId = activeHeroId()) {
  return G.state.meta.heroes[id] ?? 0;
}
/** Whether the hero who has not fought yet can still enter. */
export function hasLivingReserve() {
  return !!G.state && heroCanFight(G.state, G.state.formation[1 - G.state.active]);
}
/** The vanguard fell: the second hero enters at once. Returns false when nobody is left. */
export function replaceFallenHero(): boolean {
  if (G.mode !== 'play' || !G.state.heroHealth[activeHeroId()].fallen || G.player.hp > 0 || !hasLivingReserve())
    return false;
  const vanguard = activeHeroId();
  G.afterimages = [];
  G.state.active = 1 - G.state.active;
  const id = activeHeroId(),
    h = HEROES[id];
  G.player.inv = Math.max(G.player.inv, 0.5);
  if (!pfx('collect', G.player.x, G.player.y + 40, { palette: ramp(h.color) })) {
    ring(G.player.x, G.player.y, h.color, 10, 110, 0.45);
    burst(G.player.x, G.player.y, h.color, 16, 220);
  }
  startSwapPose(id);
  label('등장 · ' + h.name, 240, 470, h.color, 19);
  tone(520, 0.12, 'triangle', 0.1, 780);
  startEntry(id, vanguard);
  G.state.enteredAt = G.time; // a 만남 waits one step after an entry
  syncHUD();
  return true;
}
