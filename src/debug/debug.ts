import { syncHUD } from '../ui/hud';
import { runSeed } from '../core/rng';
import { G } from '../core/context';
import { hitEnemy } from '../entities/enemies';
import { loadProfile, profile } from '../core/profile';
import { learn, trig } from '../systems/abilities';
import { damagePlayer } from '../entities/player';
import { questEvent } from '../systems/quest';

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
    skipFlight() {
      G.state.stageTime = 999;
    },
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
