import { runSeed } from '../core/rng';
import { G } from '../core/context';
import { hitEnemy } from '../entities/enemies';
import { loadProfile, profile } from '../core/profile';
import { learn } from '../systems/abilities';
import { swapHero } from '../systems/formation';
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
      G.player.hp = 99;
      G.player.maxHp = 99;
    },
    swapHero,
    setSwap() {
      G.state.swapReady = 0;
    },
  };
