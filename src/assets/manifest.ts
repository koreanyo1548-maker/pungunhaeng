import combatProjectiles from './images/combat-projectiles.png';
import simma from './images/simma.png';
import pungunAttack from './images/pungun-attack.png';
import skyMotion from './images/sky-enemies-motion.png';
import skyEnemies from './images/sky-enemies.png';
// Original PNG atlases, imported so Vite can hash them (dist/) or inline them (dist-single/).
import portraits from './images/portraits.png';
import props from './images/props.png';
import projectile from './images/projectile.png';
import impact from './images/impact.png';
import utility from './images/utility.png';
import heroRun from './images/hero-run.png';
import heroFly from './images/hero-fly.png';
import npcPortraits from './images/npc-portraits.png';
import skillIcons from './images/skill-icons.png';
import titleArt from './images/title-art.png';
import world from './images/world.png';
import mobs from './images/mobs.png';
import bosses from './images/bosses.png';
import fx from './images/fx.png';

export const IMG: Record<string, string> = {
  'sky-enemies': skyEnemies,
  'pungun-attack': pungunAttack,
  'sky-enemies-motion': skyMotion,
  portraits: portraits,
  props: props,
  projectile: projectile,
  impact: impact,
  utility: utility,
  'hero-run': heroRun,
  'hero-fly': heroFly,
  'npc-portraits': npcPortraits,
  'skill-icons': skillIcons,
  'title-art': titleArt,
  world: world,
  mobs: mobs,
  bosses: bosses,
  simma: simma,
  'combat-projectiles': combatProjectiles,
  fx: fx,
};
