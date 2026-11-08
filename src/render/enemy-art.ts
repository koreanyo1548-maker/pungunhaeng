import { G } from '../core/context';
import { propArt, rockHitArt } from '../core/assets';
import { reduced } from '../core/dom';
import { enemyFrameIndex } from './util';

/** Share the exact art between alive, hit and defeated enemies. */
export function enemyArt(e) {
  if (e.rock) {
    const index = e.baseX < 240 ? 0 : 1;
    return { image: propArt[index], white: rockHitArt[index], size: (e.r + 6) * 2 };
  }
  if (G.state?.course === 'sky' && !e.boss) {
    const rank = Math.min(2, e.rank);
    const pose = reduced ? 0 : Math.floor(G.time * 5 + (e.phase || 0)) % 4;
    return {
      image: G.skyEnemyFrames?.[rank]?.[pose] || G.skyEnemies?.[rank],
      white: G.skyEnemyWhites?.[rank]?.[pose],
      size: e.size,
    };
  }
  const pose = enemyFrameIndex(e);
  return {
    image: G.enemyFrames[e.type]?.[pose] || G.sprite[e.type],
    white: G.enemyWhites[e.type]?.[pose],
    size: e.size,
  };
}
