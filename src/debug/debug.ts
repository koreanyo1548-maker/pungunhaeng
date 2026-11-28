import { syncHUD } from '../ui/hud';
import { runSeed } from '../core/rng';
import { G } from '../core/context';
import { hitEnemy, kill } from '../entities/enemies';
import { loadProfile, profile } from '../core/profile';
import { eliteStep } from '../systems/elite';
import { learn, trig } from '../systems/abilities';
import { damagePlayer } from '../entities/player';
import { questEvent, questTarget } from '../systems/quest';
import { candidates, rollChoices } from '../systems/resonance';
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
    /** hit an enemy for this damage, as a shot would (critical hits apply) */
    hitEnemy,
    /** the row gap (seconds) at a distance into a stage of a length (systems/score.ts) */
    rowGap,
    questEvent,
    /** a 조짐 condition's target (정요란 cuts it) */
    questTarget,
    /** 공명: learn a 공명 기술, or raise one held a level (systems/abilities.ts) */
    learn,
    /** what a 공명 could give now, and the offers of one (gameplay random) */
    candidates,
    rollChoices,
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
    /** the tier step a 정예 적 comes in for these rolls (systems/elite.ts) */
    eliteStep,
    /** run the rest of the stage's distance at once (the boss comes next step) */
    skipFlight() {
      // no 운석 소나기 on the way (the boss comes next step)
      G.state.showerSteps = [1, 2, 3, 4, 5, 6];
      G.state.shower = undefined;
      G.state.distance = Math.max(G.state.distance, stageDistance());
    },
    /** make a 조짐 due: its card opens at the end of the next step (as its time would) */
    readyMeet() {
      G.state.meetReady = true;
    },
    /** open a 조짐 card now; with a condition (graze, step, nearKill, rowClear, combo), it asks for that */
    meet(t?: string) {
      if (t) G.state.forceSign = t;
      go('encounter');
    },
    /** open a 공명 choice now (as a met 조짐 would) */
    resonate() {
      go('resonance');
    },
    /** metres to the boss on this stage */
    get stageDistance() {
      return stageDistance();
    },
    /** attack, tier health (tiers 1 to 6) and the boss's health (docs/balance-baseline.md) */
    get stats() {
      return { attack: shotPower(), tiers: [1, 2, 3, 4, 5, 6].map(enemyHealth), boss: bossHealth() };
    },
    /** a stage's 기준 점수 (systems/score.ts) */
    referenceScore,
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
    /** fell the hero, as a lethal hit would (the run ends) */
    fell() {
      G.player.inv = 0;
      G.state.hyper = 0;
      G.player.hp = 1;
      damagePlayer();
    },
  };
