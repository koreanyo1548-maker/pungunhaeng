import { currentGate, isFinal } from './run-plan';
import { setPhase } from './stage-phases';
import { go } from './scene-flow';
import { seedRun } from '../core/rng';
import { G } from '../core/context';
import { chime, initAudio, tone } from '../core/audio';
import { $, PLAYER_Y, W } from '../core/dom';
import { fmt, rnd } from '../core/math';
import { COURSES } from '../data/courses';
import { TUNE } from '../data/tune';
import { dominantTitle, runSummary } from '../scenes/result';
import { hasSkill } from './abilities';
import { closeQuest } from './quest';
import { announce, showBest, syncHUD } from '../ui/hud';

export function movementTier() {
  return G.state && G.mode !== 'title' ? region().world : 0;
}
export function movementName() {
  return ['질주', '경공', '어검'][movementTier()];
}
/** region data of the current gate (see run-plan.ts) */
export function region() {
  return currentGate().region;
}
export function difficulty() {
  return Math.log2(G.state.stage + 1) - 1;
}
export function stageDuration() {
  return isFinal() ? TUNE.finalFlight : 34 + Math.min(8, G.state.stage - 1);
}
export function start() {
  if (!G.loaded) return;
  seedRun();
  initAudio();
  for (const id of ['intro', 'result', 'pausePanel']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden');
  G.mode = 'play';
  G.time = 0;
  G.lastHitSound = 0;
  G.lastBoom = -1;
  G.shake = 0;
  G.flash = 0;
  G.hitstop = 0;
  G.toastTimer = 0;
  G.pointer = null;
  G.keys.clear();
  G.enemies = [];
  G.shots = [];
  G.hazards = [];
  G.particles = [];
  G.pickups = [];
  G.labels = [];
  G.rings = [];
  G.wrecks = [];
  G.impacts = [];
  G.paintedFX = [];
  G.bossTrails = [];
  G.bossIntro = null;
  G.finisher = null;
  G.rows = new Map();
  G.afterimages = [];
  G.footprints = [];
  G.rowId = 0;
  G.heartCache = -1;
  G.hudClock = 0;
  G.state = {
    score: 0,
    distance: 0,
    coins: 0,
    kills: 0,
    charge: 0,
    bombs: 2,
    hyper: 0,
    hyperCooldown: rnd(48, 62),
    hyperDrops: 0,
    combo: 0,
    comboTimer: 0,
    stage: 1,
    stageTime: 0,
    phase: 'flight',
    phaseTimer: 0,
    rowTimer: 0.8,
    meteorTimer: 8,
    powerTimer: 8,
    elapsed: 0,
    cleared: 0,
    trailTimer: 0,
    stepTimer: 0,
    ghostTimer: 0,
    runPhase: 0,
    jumpPhase: 0,
    ascend: 0,
    previousTier: 0,
    maxBombs: 3,
    skills: [],
    rel: {},
    met: {},
    quest: null,
    path: [],
    grazes: 0,
    moveAcc: 0,
    orbs: 0,
    orbAngle: 0,
    rain: 0,
    rainTimer: 0,
    negate: false,
    donoDelay: 0,
    allyTimer: 3,
    foeTimer: 4.5,
    blasting: false,
    spearTimer: 1.5,
    victory: false,
    course: 'ground',
    formation: ['pungun', 'cheolhyeol'],
    active: 0,
    swapReady: 0,
    lastHurt: -9,
    meditate: false,
    forceNpc: null,
    spent: 0,
  };
  G.strikes = [];
  G.skillsKey = '';
  G.player = {
    x: W / 2,
    target: W / 2,
    y: PLAYER_Y,
    targetY: PLAYER_Y,
    hp: 3,
    maxHp: 3,
    shield: 0,
    inv: 2,
    fire: 0,
    weapon: 1,
    tilt: 0,
    muzzle: 0,
    step: 0,
    stepDir: 1,
    swing: 0,
    swingCount: 0,
  };
  $('toast').classList.remove('show');
  showBest();
  syncHUD();
  tone(440, 0.2, 'triangle', 0.2, 880);
  go('course');
}
export function pause() {
  if (G.mode === 'play') {
    G.mode = 'pause';
    G.keys.clear();
    G.pointer = null;
    $('pauseSummary').innerHTML = runSummary();
    $('pausePanel').classList.remove('hidden');
    syncHUD();
  }
}
export function resume() {
  if (G.mode === 'pause') {
    G.mode = 'play';
    $('pausePanel').classList.add('hidden');
    syncHUD();
    initAudio();
  }
}
export function end(victory = false) {
  if (G.mode !== 'play') return;
  G.mode = 'result';
  G.banner = null;
  G.state.victory = victory;
  if (victory) G.state.score += 20000;
  closeQuest();
  const record = G.state.score > G.best;
  if (record) {
    G.best = Math.floor(G.state.score);
    try {
      localStorage.setItem('wuxia-best', String(G.best));
    } catch {}
  }
  $('resultTitle').textContent = victory ? region().win : '강호행 종료';
  $('resultEyebrow').textContent = victory
    ? dominantTitle()
    : COURSES[G.state.course].label +
      ' · ' +
      (isFinal() ? region().name : '관문 ' + G.state.stage) +
      ' · ' +
      G.state.cleared +
      '개 관문 돌파';
  $('summary').innerHTML = runSummary();
  $('newRecord').classList.toggle('hidden', !record);
  $('finalScore').textContent = fmt(G.state.score);
  $('finalDistance').textContent = fmt(G.state.distance) + ' m';
  $('finalKills').textContent = G.state.kills;
  $('finalCoins').textContent = G.state.coins;
  $('result').classList.remove('hidden');
  $('toast').classList.remove('show');
  showBest();
  syncHUD();
  G.keys.clear();
  G.pointer = null;
  tone(190, 0.4, 'triangle', 0.3, 65);
}
export function home() {
  G.mode = 'title';
  G.scene = 'title';
  G.banner = null;
  $('result').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('intro').classList.remove('hidden');
  showBest();
}
export function nextStage() {
  const oldTier = movementTier();
  G.state.stage++;
  G.state.swapReady = Math.min(G.state.swapReady, G.time + 1);
  G.state.previousTier = oldTier;
  G.state.ascend = movementTier() !== oldTier ? 2.6 : 0;
  G.state.stageTime = 0;
  setPhase('flight');
  G.state.phaseTimer = 0;
  G.state.rowTimer = 1.3;
  G.state.meteorTimer = 6;
  G.state.powerTimer = 9;
  G.state.spearTimer = 1.5;
  G.state.hyper = 0;
  G.enemies = [];
  G.hazards = [];
  G.shots = [];
  G.rows.clear();
  G.pickups = [];
  G.player.inv = Math.max(G.player.inv, 2);
  G.player.hp = Math.min(G.player.maxHp, G.player.hp + 1);
  G.player.weapon = Math.min(3, G.player.weapon + 1);
  G.state.bombs = Math.min(G.state.maxBombs, G.state.bombs + 1);
  if (G.state.bombs === G.state.maxBombs) G.state.charge = 100;
  for (const s of G.state.skills) s.used = false;
  G.state.negate = hasSkill('hoechun');
  syncHUD();
}
export function beginStage() {
  const r = region(),
    tierUp = G.state.ascend > 0 && movementTier() > G.state.previousTier;
  announce(
    isFinal()
      ? '최종 관문'
      : G.state.stage === 1
        ? COURSES[G.state.course].label
        : tierUp
          ? ['', '경공 개방', '어검 개방'][movementTier()]
          : '제 ' + G.state.stage + ' 관',
    tierUp ? ['', '대숲을 딛고 솟아오르다', '검 위에서 운해를 가르다'][movementTier()] : r.name,
    r.hint,
    r.color,
    2.4,
  );
  chime();
  syncHUD();
}
