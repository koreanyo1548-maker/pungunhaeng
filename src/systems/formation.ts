import { G } from '../core/context';
import { heroAnimations } from '../core/assets';
import type { HeroId } from '../data/roster';

// The hero of the run (2026-11: one hero; the party of two — 선봉 and 후발, the second entering with an entry skill
// when the first fell — was removed with 편대 비행). The file keeps its name for the imports.

export function activeHeroId(): HeroId {
  return G.state && G.mode !== 'title' ? G.state.hero : 'pungun';
}
export function activeFrames() {
  return heroAnimations[activeHeroId()] || G.heroFrames;
}
/** The hero's 성급 minus one (0 = ★1 to 4 = ★5), as the run started with it. */
export function heroLevel(id: HeroId = activeHeroId()) {
  return G.state.meta.heroes[id] ?? 0;
}
