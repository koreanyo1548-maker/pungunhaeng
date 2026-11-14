import { createRunState, createPlayer, createRunTransient } from '../core/run-state';
import { clearSkillAnimations } from '../render/skill-animation';
import { clearCallouts } from '../render/callout';
import { currentGate, isFinal } from './run-plan';
import { setPhase } from './stage-phases';
import { go } from './scene-flow';
import { seedRun } from '../core/rng';
import { G } from '../core/context';
import { metaSnapshot, profile, saveProfile } from '../core/profile';
import { chime, initAudio, tone } from '../core/audio';
import { $, PLAYER_Y, W } from '../core/dom';
import { fmt, rnd } from '../core/math';
import { COURSES } from '../data/courses';
import { HEROES } from '../data/heroes';
import { VIRTUE_CAP, settle } from '../data/meta';
import { hoechunBlocks } from '../data/skills';
import { TUNE } from '../data/tune';
import { dominantTitle, runSummary } from '../scenes/result';
import { hasSkill } from './skill-state';
import { closeQuest } from './quest';
import { announce, showBank, showBest, syncHUD } from '../ui/hud';
import { clearPfx } from '../render/pfx';

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
  G.pointer = null;
  G.keys.clear();
  Object.assign(G, createRunTransient());
  clearPfx();
  clearSkillAnimations();
  clearCallouts();
  // Everything a run takes from the profile, fixed for the whole run (see core/profile.ts).
  const meta = metaSnapshot();
  G.state = createRunState(meta, rnd(48, 62));
  G.player = createPlayer(W, PLAYER_Y, () => G.state.heroHealth[G.state.formation[G.state.active]]);
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
  const record = G.state.score > profile.best;
  if (record) profile.best = Math.floor(G.state.score);
  // 정산: what is left of this run's 엽전 goes to the bank.
  const banked = settle(G.state.coins, victory, G.state.virtue),
    base = settle(G.state.coins, victory);
  profile.coins += banked;
  saveProfile();
  $('settle').innerHTML =
    `남은 엽전 <b>${fmt(G.state.coins)}냥</b>` +
    (base > G.state.coins ? ` + 완주 <b>${fmt(base - G.state.coins)}냥</b>` : '') +
    (banked > base ? ` + 덕 ${Math.min(VIRTUE_CAP, G.state.virtue)} <b>${fmt(banked - base)}냥</b>` : '') +
    ` 보관 · 지닌 엽전 <b>${fmt(profile.coins)}냥</b>`;
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
  showBank();
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
  G.state.negateLeft = hoechunBlocks();
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
