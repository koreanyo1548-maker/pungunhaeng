import combatProjectiles from './images/combat-projectiles.webp';
import greenwoodAir from './images/enemies/greenwood-air-bird-variants-4x6.webp';
import greenwoodGround from './images/enemies/greenwood-ground-6x2.webp';
import simma from './images/simma.webp';
import skyMotion from './images/sky-enemies-motion.webp';
import skyEnemies from './images/sky-enemies.webp';
// Generated lossless WebP atlases, imported so Vite can hash them (dist/) or inline them (dist-single/).
import portraits from './images/portraits.webp';
import props from './images/props.webp';
import projectile from './images/projectile.webp';
import impact from './images/impact.webp';
import utility from './images/utility.webp';
import heroRun from './images/hero-run.webp';
import heroFly from './images/hero-fly.webp';
import npcPortraits from './images/npc-portraits.webp';
import skillIcons from './images/skill-icons.webp';
import titleArt from './images/title-art.webp';
import world from './images/world.webp';
import mobs from './images/mobs.webp';
import bosses from './images/bosses.webp';

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
  'greenwood-air': greenwoodAir,
  'greenwood-ground': greenwoodGround,
};

// Pictures for one character each (see images/characters/README.md): every WebP in images/characters is registered
// as 'characters/<file name without .webp>', so adding a character's art needs no edit here.
const characterArt = import.meta.glob('./images/characters/*.webp', { eager: true, import: 'default' }) as Record<
  string,
  string
>;
for (const [path, url] of Object.entries(characterArt))
  IMG['characters/' + path.slice(path.lastIndexOf('/') + 1, -'.webp'.length)] = url;

const heroineArt = import.meta.glob('./images/heroines/*.webp', { eager: true, import: 'default' }) as Record<
  string,
  string
>;
for (const [path, url] of Object.entries(heroineArt))
  IMG['heroines/' + path.slice(path.lastIndexOf('/') + 1, -'.webp'.length)] = url;
