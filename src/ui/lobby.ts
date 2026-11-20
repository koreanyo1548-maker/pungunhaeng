// The lobby (title screen, docs/meta-progression-plan.md): the party's portraits (선봉 in front, 후발 behind; empty
// before the first run) and the stage card, turned with the arrows. It shows the stages opened and the next locked
// one; it opens on the highest open stage. 강호에 나서기 sets out to the stage on the card (systems/flow.ts start).
import { $ } from '../core/dom';
import { heroPictures } from '../core/assets';
import { fmt } from '../core/math';
import { profile } from '../core/profile';
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

/** The lobby as it opens: the party's portraits and the highest open stage. */
export function showLobby() {
  shown = Math.min(profile.stages, STAGE_COUNT);
  const [first, second] = profile.formation;
  for (const [id, hero] of [
    ['heroArt', first],
    ['heroArt2', second],
  ] as const) {
    const img = $(id) as HTMLImageElement;
    img.hidden = !hero;
    if (hero) img.src = heroPictures[hero];
  }
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
