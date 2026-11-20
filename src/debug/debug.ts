import { syncHUD } from '../ui/hud';
import { runSeed } from '../core/rng';
import { G } from '../core/context';
import { hitEnemy, kill } from '../entities/enemies';
import { NPCS } from '../data/npcs';
import { loadProfile, profile } from '../core/profile';
import { learn, trig } from '../systems/abilities';
import { damagePlayer } from '../entities/player';
import { questEvent, questTarget, raiseBond } from '../systems/quest';
import { moveAlign, rollMeet } from '../systems/alignment';
import { referenceScore, rowGap } from '../systems/score';
import { addPickup, pickItem } from '../entities/pickups';
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
    pickItem,
    /** kill an enemy as a hit would (score, drops) */
    kill,
    /** the 인연 data (data/npcs.ts) */
    npcs: NPCS,
    /** the row gap (seconds) at a distance into a stage of a length (systems/score.ts) */
    rowGap,
    questEvent,
    /** an 의뢰 condition's target for the met-th 의뢰 of its 인연 (정요란 cuts it) */
    questTarget,
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
      // no 운석 소나기 on the way (the boss comes next step)
      G.state.showerSteps = [1, 2, 3, 4, 5, 6];
      G.state.shower = undefined;
      G.state.distance = Math.max(G.state.distance, stageDistance());
    },
    /** make a 만남 due: it opens at the end of the next step (as its time would) */
    readyMeet() {
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
    /** add 정 (positive) or 사 (negative) points (moves the 만남 odds as play would) */
    moveAlign,
    /** who the next 만남 brings by the run's odds (an 인연's id, or null for a passer-by; uses gameplay random) */
    rollMeet,
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
