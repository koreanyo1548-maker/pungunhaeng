import { G } from '../core/context';
import { propArt, rockHitArt } from '../core/assets';
import { reduced } from '../core/dom';
import { enemyFrameIndex } from './util';
import { skyStage } from '../systems/flow';
import { RANKS } from '../data/enemies';
import { chestArt, tinted } from './placeholder-art';

/** Share the exact art between alive, hit and defeated enemies. */
export function enemyArt(e) {
  if (e.chest) return { ...chestArt(), size: e.size };
  if (e.rock) {
    const index = e.baseX < 240 ? 0 : 1;
    return { image: propArt[index], white: rockHitArt[index], size: (e.r + 6) * 2 };
  }
  if (skyStage() && !e.boss) {
    const rank = Math.min(2, e.rank);
    const pose = reduced ? 0 : Math.floor(G.time * 5 + (e.phase || 0)) % 4,
      image = G.skyEnemyFrames?.[rank]?.[pose] || G.skyEnemies?.[rank],
      // sky tiers above 3 share tier 3's art: tiers 5 and 6 are tinted
      tint = RANKS[e.rank]?.tint;
    return {
      image: tint && image ? tinted(image, tint, 0.42) : image,
      white: G.skyEnemyWhites?.[rank]?.[pose],
      size: e.size,
    };
  }
  const pose = enemyFrameIndex(e),
    image = G.enemyFrames[e.type]?.[pose] || G.sprite[e.type],
    // tiers 5 and 6 reuse tier 4's art, tinted, until their own art comes (docs/codex-art-handoff.md)
    tint = RANKS[e.rank]?.tint;
  return {
    image: tint && image ? tinted(image, tint, 0.42) : image,
    white: G.enemyWhites[e.type]?.[pose],
    size: e.size,
  };
}
