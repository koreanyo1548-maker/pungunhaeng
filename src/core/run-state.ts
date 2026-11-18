import { createHeroHealth, BASE_HEALTH } from './hero-health';
import type { Meta } from '../data/meta';
import type { RunState, Player, Enemy, Shot, HeroHealth } from './state-types';

export function createRunState(meta: Meta, hyperCooldown: number): RunState {
  return {
    heroHealth: createHeroHealth(),
    score: 0,
    distance: 0,
    coins: 0,
    kills: 0,
    /** 필살기: one at the start of a run, no maximum (운학 and 혈마 밀사 add more) */
    bombs: 1,
    hyper: 0,
    hyperCooldown: hyperCooldown,
    hyperDrops: 0,
    combo: 0,
    comboTimer: 0,
    stage: 1,
    stageTime: 0,
    phase: 'flight',
    phaseTimer: 0,
    rowTimer: 0.8,
    meteorTimer: 8,
    elapsed: 0,
    cleared: 0,
    trailTimer: 0,
    stepTimer: 0,
    ghostTimer: 0,
    runPhase: 0,
    jumpPhase: 0,
    skills: [],
    met: {},
    quest: null,
    path: [],
    grazes: 0,
    rain: 0,
    rainTimer: 0,
    negate: false,
    blasting: false,
    spearTimer: 1.5,
    victory: false,
    formation: ['pungun', 'cheolhyeol'],
    active: 0,
    effect: null,
    lastHurt: -9,
    forceNpc: null,
    align: 0,
    unlocked: [],
    bond: {},
    gauge: 0,
    meetReady: false,
    encounters: 0,
    passers: 0,
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
    shield: 0,
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
