import { syncHUD } from '../ui/hud';
import { runSeed } from '../core/rng';
import { G } from '../core/context';
import { hitEnemy } from '../entities/enemies';
import { loadProfile, profile } from '../core/profile';
import { learn, trig } from '../systems/abilities';
import { damagePlayer } from '../entities/player';
import { questEvent, raiseBond } from '../systems/quest';
import { moveAlign } from '../systems/alignment';
import { go } from '../systems/scene-flow';
import { stageDistance } from '../systems/flow';

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
    /** move the 선·악 저울 (unlocks as play would) */
    moveAlign,
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
