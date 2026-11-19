// Effects the game uses, by pixelfx id. Keep in sync with src/render/pfx.ts and src/render/glows.ts.
import * as hitSpark from './fx/impacts/hit-spark.js';
import * as critHit from './fx/impacts/crit-hit.js';
import * as parry from './fx/impacts/parry.js';
import * as shieldBlock from './fx/impacts/shield-block.js';
import * as featherBurst from './fx/holy/feather-burst.js';
import * as collectBurst from './fx/pickups/collect-burst.js';
import * as manaBurst from './fx/arcane/mana-burst.js';
import * as plasmaExplosion from './fx/explosions/plasma-explosion.js';
import * as fireball from './fx/fire/fireball.js';
import * as laserBolt from './fx/projectiles/laser-bolt.js';
import * as sunburst from './fx/holy/sunburst.js';

export const EFFECTS = {
  'impacts/hit-spark': hitSpark,
  'impacts/crit-hit': critHit,
  'impacts/parry': parry,
  'impacts/shield-block': shieldBlock,
  'holy/feather-burst': featherBurst,
  'pickups/collect-burst': collectBurst,
  'arcane/mana-burst': manaBurst,
  'explosions/plasma-explosion': plasmaExplosion,
  // looping glows behind hazards and pickups, rendered to frames once (src/render/glows.ts)
  'fire/fireball': fireball,
  'projectiles/laser-bolt': laserBolt,
  'holy/sunburst': sunburst,
};
