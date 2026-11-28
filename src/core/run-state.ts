import { createHeroHealth, BASE_HEALTH } from './hero-health';
import type { Meta } from '../data/meta';
import { BASELINE } from '../data/baseline';
import type { RunState, Player, Enemy, Shot, HeroHealth } from './state-types';

export function createRunState(meta: Meta): RunState {
  return {
    heroHealth: createHeroHealth(),
    score: 0,
    distance: 0,
    coins: 0,
    kills: 0,
    /** 필살기: one at the start of a run, no maximum (운학's trait and gear add more) */
    bombs: 1,
    hyper: 0,
    /** seconds left of 자석 and 점수 두 배 (in-play items) */
    magnet: 0,
    double: 0,
    dual: 0,
    hyperDrops: 0,
    /** items and 보물상자 that came this run (for the balance measurements) */
    drops: { hyper: 0, magnet: 0, double: 0, dual: 0, chest: 0 },
    combo: 0,
    comboTimer: 0,
    stage: 1,
    stageTime: 0,
    phase: 'flight',
    phaseTimer: 0,
    rowTimer: 0.8,
    /** the first 운석 (then BASELINE.meteor.every) */
    meteorTimer: 25,
    showerSteps: [],
    elapsed: 0,
    cleared: 0,
    trailTimer: 0,
    stepTimer: 0,
    ghostTimer: 0,
    runPhase: 0,
    jumpPhase: 0,
    skills: [],
    quest: null,
    path: [],
    grazes: 0,
    blasting: false,
    spearTimer: 1.5,
    victory: false,
    hero: 'pungun',
    lastHurt: -9,
    /** the first 조짐 comes BASELINE.meet.first s into the flight (systems/encounter.ts) */
    meetTimer: BASELINE.meet.first,
    meetWait: BASELINE.meet.first,
    /** the score at the end of the run before the end-of-run bonuses (for the measurements) */
    baseScore: 0,
    meetReady: false,
    pickReady: false,
    encounters: 0,
    resonances: 0,
    spent: 0,
    meta,
  };
}
export function createPlayer(W: number, PLAYER_Y: number, getHealth: () => HeroHealth): Player {
  return {
    x: W / 2,
    target: W / 2,
    y: PLAYER_Y,
    targetY: PLAYER_Y,
    get hp() {
      return getHealth().hp;
    },
    set hp(value: number) {
      const h = getHealth();
      if (!h.fallen) h.hp = Math.max(0, value);
    },
    get maxHp() {
      return getHealth().maxHp;
    },
    set maxHp(value: number) {
      const h = getHealth();
      h.maxHp = Math.max(BASE_HEALTH, value);
      h.hp = Math.min(h.hp, h.maxHp);
    },
    inv: 2,
    fire: 0,
    tilt: 0,
    muzzle: 0,
    step: 0,
    stepDir: 1,
    swing: 0,
    swingCount: 0,
  };
}
/** Fresh transient values, shared by startup and restart. Persistent assets and scroll stay outside. */
export function createRunTransient() {
  return {
    time: 0,
    lastHitSound: 0,
    lastBoom: -1,
    shake: 0,
    flash: 0,
    hitstop: 0,
    toastTimer: 0,
    enemies: [] as Enemy[],
    shots: [] as Shot[],
    hazards: [] as any[],
    pickups: [] as any[],
    particles: [] as any[],
    labels: [] as any[],
    rings: [] as any[],
    wrecks: [] as any[],
    impacts: [] as any[],
    contactFX: [] as any[],
    paintedFX: [] as any[],
    bossTrails: [] as any[],
    bossIntro: null as any,
    finisher: null as any,
    rows: new Map<number, { remaining: number; missed: boolean }>(),
    afterimages: [] as any[],
    footprints: [] as any[],
    rowId: 0,
    heartCache: -1,
    hudClock: 0,
    strikes: [] as any[],
    skillsKey: '',
  };
}
