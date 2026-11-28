// What the 공명 기술 that stay on the hero look like (systems/abilities.ts): the swords of 어검진 circling the hero, and
// the clones of 그림자 분신 while it is on. Display only: nothing here changes the game.
// (2026-11: the entry skills drawn here before — their timer ring, 학의 장막, 정심반사 — went with the party.)
import { G } from '../core/context';
import { reduced } from '../core/dom';
import { swordPositions } from '../data/skills';
import { heroPose } from '../entities/player';
import { cloneOffsets } from '../systems/hero-effects';
import { drawHeroSprite } from './actors';
import { drawSkillFrame } from './skill-animation';

export function drawHeroEffect() {
  if (!G.state || G.player.hp <= 0) return;
  const x = G.player.x,
    y = G.player.y;
  for (const dx of cloneOffsets()) drawHeroSprite(heroPose(), x + dx, y, G.player.tilt, 0.38, true);
  const swords = G.state.skills.find(s => s.id === 'eogeom');
  if (swords)
    for (const p of swordPositions(swords.level, swords.angle ?? 0))
      drawSkillFrame(
        'hoeseon',
        reduced ? 2 : [1, 2, 3, 2][Math.floor(G.time * 8) % 4],
        p.x,
        p.y,
        48,
        0.9,
        p.a + Math.PI,
      );
}
