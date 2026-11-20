import { lobbyStage, lobbyStageOpen, showLobby } from '../ui/lobby';
import { createRunState, createPlayer, createRunTransient } from '../core/run-state';
import { clearSkillAnimations } from '../render/skill-animation';
import { clearCallouts } from '../render/callout';
import { go } from './scene-flow';
import { seedRun } from '../core/rng';
import { G } from '../core/context';
import { metaSnapshot, openNextStage, profile, saveProfile } from '../core/profile';
import { chime, initAudio, tone } from '../core/audio';
import { $, PLAYER_Y, W } from '../core/dom';
import { clamp, fmt, josa } from '../core/math';
import { settle } from '../data/meta';
import { STAGES, STAGE_COUNT } from '../data/stages';
import { BASELINE, tierHealth } from '../data/baseline';
import { TUNE } from '../data/tune';
import { runSummary } from '../scenes/result';
import { closeQuest } from './quest';
import { VICTORY_SCORE, runBonus } from './score';
import { VIRTUE_BONUS } from './alignment';
import { announce, showBank, showBest, syncHUD } from '../ui/hud';
import { clearPfx } from '../render/pfx';
import { prepareGlows } from '../render/glows';

export function movementTier() {
  return G.state && G.mode !== 'title' ? region().world : 0;
}
export function movementName() {
  return ['질주', '경공', '어검'][movementTier()];
}
/** the current stage's data (stage 1 before one is picked) */
export function region() {
  return STAGES[clamp(G.state?.stage ?? 1, 1, STAGE_COUNT) - 1];
}
/** a 운해 stage: ground heroes ride a sword, enemies fly (movement stays left-right, TUNE.freeFlight) */
export const skyStage = () => !!G.state && G.mode !== 'title' && region().world === 2;
/** stage number as difficulty: 0 on stage 1, about 1.8 on stage 6 */
export function difficulty() {
  return Math.log2(G.state.stage + 1) - 1;
}
/** metres to run before the boss */
export function stageDistance() {
  return region().distance;
}
/** health of an enemy tier (1 to 6): the shots of the reference growth (Lv1, no 인연) × its attack. No distance
 *  multiplier: health grows only with the tier ladder (systems/ladder.ts). */
export const enemyHealth = (tier: number) => tierHealth(tier, TUNE.attack);
/** the boss's health: BASELINE.bossSeconds of the reference basic attack (one shot a volley) */
export function bossHealth() {
  return Math.round((BASELINE.bossSeconds * TUNE.attack) / BASELINE.fireInterval);
}
export function start() {
  if (!G.loaded || !lobbyStageOpen()) return;
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
  G.state = createRunState(meta);
  G.player = createPlayer(W, PLAYER_Y, () => G.state.heroHealth[G.state.formation[G.state.active]]);
  $('toast').classList.remove('show');
  showBest();
  syncHUD();
  tone(440, 0.2, 'triangle', 0.2, 880);
  // the stage on the lobby card, then the 편대 screen
  G.state.stage = lobbyStage();
  go('formation');
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
  if (victory) G.state.score += VICTORY_SCORE;
  closeQuest();
  // 정산 (systems/score.ts): 정 adds to the score; 사 and the share of the 기준 점수 add to the 엽전 left, which go to
  // the bank with the clear bonus; beating the boss opens the next stage.
  G.state.baseScore = Math.round(G.state.score);
  const b = runBonus(G.state.score, G.state.stage, G.state.good, G.state.evil);
  G.state.score = Math.round(G.state.score * (1 + b.scoreBonus));
  const record = G.state.score > profile.best;
  if (record) profile.best = Math.floor(G.state.score);
  const kept = settle(G.state.coins, false, b.coinBonus),
    banked = settle(G.state.coins, victory, b.coinBonus),
    opened = victory && openNextStage(G.state.stage),
    r = region(),
    pct = (v: number) => Math.round(v * 100) + '%';
  profile.coins += banked;
  saveProfile();
  $('settle').innerHTML =
    `기준 점수 ${fmt(b.max)}의 <b>${pct(b.share)}</b>` +
    (b.scoreBonus ? ` · 정 ${G.state.good} 점수 +${pct(b.scoreBonus)}` : '') +
    `<br>남은 엽전 <b>${fmt(G.state.coins)}냥</b>` +
    (b.coinBonus
      ? ` + <b>${fmt(kept - G.state.coins)}냥</b> (` +
        [
          b.tier ? `달성 +${pct(b.tier)}` : '',
          G.state.evil ? `사 ${G.state.evil} +${pct(G.state.evil * VIRTUE_BONUS)}` : '',
        ]
          .filter(Boolean)
          .join(' · ') +
        ')'
      : '') +
    (banked > kept ? ` + 보스 처치 <b>${fmt(banked - kept)}냥</b>` : '') +
    ` 보관 · 지닌 엽전 <b>${fmt(profile.coins)}냥</b>`;
  $('resultTitle').textContent = victory ? r.name + ' 돌파' : '강호행 종료';
  $('resultEyebrow').textContent =
    `S${G.state.stage} ${r.name} · ` +
    (victory
      ? r.boss + ' 처치' + (opened ? ` · S${G.state.stage + 1} ${STAGES[G.state.stage].name} 열림` : '')
      : `만남 ${G.state.encounters}번 · ${fmt(Math.min(G.state.distance, stageDistance()))} / ${fmt(stageDistance())} m`);
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
  showLobby();
}
export function beginStage() {
  const r = region();
  // the looping glows behind 죽창, 운석, 엽전 and items are rendered to frames once (render/glows.ts)
  prepareGlows();
  announce('S' + G.state.stage + ' · ' + r.name, josa(r.boss, '을', '를') + ' 찾아서', r.hint, r.color, 2.4);
  chime();
  syncHUD();
}
