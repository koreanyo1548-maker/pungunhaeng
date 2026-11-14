import combatProjectiles from './images/combat-projectiles.png';
import simma from './images/simma.png';
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

// Pictures for one character each (see images/characters/README.md): every PNG in images/characters is registered
// as 'characters/<file name without .png>', so adding a character's art needs no edit here.
const characterArt = import.meta.glob('./images/characters/*.png', { eager: true, import: 'default' }) as Record<
  string,
  string
>;
for (const [path, url] of Object.entries(characterArt))
  IMG['characters/' + path.slice(path.lastIndexOf('/') + 1, -'.png'.length)] = url;
