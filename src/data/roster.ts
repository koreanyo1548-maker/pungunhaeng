// The one list of characters, in display order. Adding a hero or an 인연 starts here: add the id, then the type
// checker asks for everything else the character needs (its entry in data/heroes.ts or data/npcs.ts). New
// characters join the 뽑기 pool on their own. See docs/adding-characters.md.
// This file imports nothing, so any module can read the lists without import-order concerns.

export const HERO_IDS = ['pungun', 'cheolhyeol', 'mukyoung', 'bicheon', 'unhak', 'hongryeon'] as const;
export type HeroId = (typeof HERO_IDS)[number];

export const NPC_IDS = ['dosa', 'milsa', 'monk', 'yeonhyeop', 'yakseon', 'uijeok'] as const;
export type NpcId = (typeof NPC_IDS)[number];

/**
 * Where a picture is: a sheet (an image registered in assets/manifest.ts) and a cell of its grid (0-based).
 * Shared sheets have their grid listed in core/assets.ts (SHEET_GRIDS). A sheet that is not listed holds one
 * character: a single picture, or one row of four frames.
 */
export type Cell = { sheet: string; col?: number; row?: number };
export type HeroArt = {
  /** four running (땅) or flying (하늘) frames: one row of a four-column sheet */
  frames: Cell;
  /** the face shown on cards, the HUD and menus */
  portrait: Cell;
  /** row of skills/swap-poses.png drawn when the hero swaps in; none: no swap pose */
  swapPose?: number;
};
