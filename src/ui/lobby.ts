// The lobby (title screen, docs/meta-progression-plan.md): the last run's hero (empty before the first run) and the
// stage card, turned with the arrows. It shows the stages opened and the next locked
// one; it opens on the highest open stage. 강호에 나서기 sets out to the stage on the card (systems/flow.ts start).
import { $ } from '../core/dom';
import { heroPictures } from '../core/assets';
import { fmt } from '../core/math';
import { loadProfile, profile } from '../core/profile';
import { showBank, showBest } from './hud';
import { STAGES, STAGE_COUNT } from '../data/stages';

let shown = 1;

/** the stage on the lobby card (1 to 6) */
export const lobbyStage = () => shown;
/** the stage on the card is open (강호에 나서기 can set out) */
export const lobbyStageOpen = () => shown <= profile.stages;
/** the last stage the arrows reach: the opened ones and the next locked one */
const lastShown = () => Math.min(STAGE_COUNT, profile.stages + 1);

function draw() {
  const st = STAGES[shown - 1],
    locked = !lobbyStageOpen();
  $('stageCard').classList.toggle('locked', locked);
  $('stageCard').innerHTML =
    (locked ? `<span class="stage-lock">잠김 · S${shown - 1} 보스를 잡으면 열림</span>` : '') +
    `<span class="stage-no">S${shown} · ${st.world === 2 ? '하늘' : '땅'}</span><h3>${st.name}</h3><p>보스 <b>${st.boss}</b> · ${fmt(st.distance)}m</p>`;
  ($('stagePrev') as HTMLButtonElement).disabled = shown <= 1;
  ($('stageNext') as HTMLButtonElement).disabled = shown >= lastShown();
  $('stageDots').innerHTML = Array.from(
    { length: lastShown() },
    (_, i) => `<i class="${i + 1 === shown ? 'on' : ''}"></i>`,
  ).join('');
  const start = $('start') as HTMLButtonElement;
  start.disabled = locked;
  start.classList.toggle('off', locked);
}

/** The lobby as it opens: the last hero's portrait and the highest open stage. */
export function showLobby() {
  shown = Math.min(profile.stages, STAGE_COUNT);
  // the last run's hero (one a run since 2026-11; the second portrait of the old 편대 stays hidden)
  const hero = profile.formation[0],
    img = $('heroArt') as HTMLImageElement;
  img.hidden = !hero;
  if (hero) img.src = heroPictures[hero];
  ($('heroArt2') as HTMLImageElement).hidden = true;
  draw();
}

$('stagePrev').onclick = () => {
  if (shown > 1) shown--;
  draw();
};
$('stageNext').onclick = () => {
  if (shown < lastShown()) shown++;
  draw();
};

// 데이터 초기화: the first tap asks (the button says so for 3 s), the second wipes the profile (엽전, heroes, levels,
// 호감도, stages, best score and party) back to a new save.
let resetArmed = 0;
$('resetData').onclick = () => {
  const button = $('resetData');
  if (!resetArmed) {
    button.textContent = '정말 초기화? 한 번 더';
    button.classList.add('armed');
    resetArmed = window.setTimeout(() => {
      resetArmed = 0;
      button.textContent = '데이터 초기화';
      button.classList.remove('armed');
    }, 3000);
    return;
  }
  clearTimeout(resetArmed);
  resetArmed = 0;
  button.textContent = '데이터 초기화';
  button.classList.remove('armed');
  loadProfile({});
  showBest();
  showBank();
  showLobby();
};
