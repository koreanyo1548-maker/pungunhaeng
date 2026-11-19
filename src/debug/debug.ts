import { syncHUD } from '../ui/hud';
import { runSeed } from '../core/rng';
import { G } from '../core/context';
import { hitEnemy, kill } from '../entities/enemies';
import { NPCS } from '../data/npcs';
import { loadProfile, profile } from '../core/profile';
import { learn, trig } from '../systems/abilities';
import { damagePlayer } from '../entities/player';
import { questEvent, raiseBond } from '../systems/quest';
import { moveAlign } from '../systems/alignment';
import { referenceScore, rowGap } from '../systems/score';
import { addPickup } from '../entities/pickups';
import { go } from '../systems/scene-flow';
import { bossHealth, enemyHealth, region, stageDistance } from '../systems/flow';
import { shotPower } from '../systems/combat';

if (location.hash.includes('debug'))
  window.__g = {
    get state() {
      return G.state;
    },
    get player() {
      return G.player;
    },
    get mode() {
      return G.mode;
    },
    get seed() {
      return runSeed;
    },
    get scene() {
      return G.scene;
    },
    /** start recording every scene entered (read back with sceneLog) */
    traceScenes() {
      G.sceneLog = [];
    },
    get sceneLog() {
      return G.sceneLog;
    },
    get enemies() {
      return G.enemies;
    },
    get hazards() {
      return G.hazards;
    },
    get pickups() {
      return G.pickups;
    },
    /** the floating score and combat labels on screen */
    get labels() {
      return G.labels;
    },
    /** drop a pickup ('coin', 'hyper', 'magnet', 'double') at (x, y), as a kill would */
    addPickup,
    /** kill an enemy as a hit would (score, gauge, drops) */
    kill,
    /** the 인연 data (data/npcs.ts) */
    npcs: NPCS,
    /** the row gap (seconds) at a distance into a stage of a length (systems/score.ts) */
    rowGap,
    questEvent,
    learn,
    /** fire the skills bound to a trigger, as combat would (tests count what they shoot) */
    trig,
    get shots() {
      return G.shots;
    },
    /** the saved profile (meta progression); loadProfile replaces it, for tests */
    get profile() {
      return profile;
    },
    loadProfile,
    /** run the rest of the stage's distance at once (the boss comes next step) */
    skipFlight() {
      G.state.distance = Math.max(G.state.distance, stageDistance());
    },
    /** fill the 처치 게이지: the 만남 opens at the end of the next step (as kills would) */
    fillGauge() {
      G.state.meetReady = true;
    },
    /** open a 만남 now; with an id, that 인연 comes (whatever the scale) */
    meet(id?: string) {
      if (id) G.state.forceNpc = id;
      go('encounter');
    },
    /** metres to the boss on this stage */
    get stageDistance() {
      return stageDistance();
    },
    /** attack, tier health (tiers 1 to 6) and the boss's health (docs/balance-baseline.md) */
    get stats() {
      return { attack: shotPower(), tiers: [1, 2, 3, 4, 5, 6].map(enemyHealth), boss: bossHealth() };
    },
    /** add 선 (positive) or 악 (negative) points (unlocks as play would) */
    moveAlign,
    /** a stage's 기준 점수 (systems/score.ts) */
    referenceScore,
    /** raise an 인연 one level (teaches the skill), as a met 의뢰 would */
    raiseBond,
    killBoss() {
      const b = G.enemies.find(e => e.boss && !e.dead);
      if (b) {
        b.action = 'recover';
        hitEnemy(b, 1e7);
      }
    },
    god() {
      for (const health of Object.values(G.state.heroHealth)) {
        health.fallen = false;
        health.maxHp = health.hp = 99;
      }
    },
    /** the running entry skill (systems/hero-effects.ts), for tests */
    get effect() {
      return G.state?.effect ?? null;
    },
    /** fell the hero who is fighting, as a lethal hit would (the second hero enters) */
    fell() {
      G.player.inv = 0;
      G.state.hyper = 0;
      G.state.effect = null;
      G.player.shield = 0;
      G.state.negate = false;
      G.player.hp = 1;
      damagePlayer();
    },
  };
