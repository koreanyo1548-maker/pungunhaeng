// 수련: spend banked 엽전 on base stats that last between runs. Opened from the title and the result screen.
// It only edits the profile; a run picks the new values up when it starts (see core/profile.ts).
import { chime, tone } from '../core/audio';
import { $ } from '../core/dom';
import { fmt } from '../core/math';
import { buyStat, exportCode, importCode, profile, statCost } from '../core/profile';
import { STATS, STAT_IDS } from '../data/meta';
import type { StatId } from '../data/meta';
import { showBank, showBest } from '../ui/hud';

function render() {
  $('trainingBank').innerHTML = `지닌 엽전 <b>${fmt(profile.coins)}냥</b>`;
  $('statList').innerHTML = STAT_IDS.map(id => {
    const s = STATS[id],
      level = profile.stats[id],
      max = s.costs.length,
      cost = statCost(id),
      short = cost !== null && profile.coins < cost;
    const pips = '●'.repeat(level) + '○'.repeat(max - level);
    const value = cost === null ? `<b>${s.show(level)}</b>` : `${s.show(level)} <i>→</i> <b>${s.show(level + 1)}</b>`;
    const button =
      cost === null
        ? '<button class="stat-buy" disabled>최고 단계</button>'
        : `<button class="stat-buy" data-id="${id}"${short ? ' disabled' : ''}>${fmt(cost)}냥</button>`;
    return `<div class="stat-row${cost === null ? ' max' : ''}"><div class="stat-info"><span class="stat-head"><b>${s.name}</b><span class="stat-value">${value}</span></span><span class="pips" aria-label="${level} / ${max} 단계">${pips}</span><small>${s.per}</small></div>${button}</div>`;
  }).join('');
  $('saveCode').value = exportCode();
}

export function openTraining() {
  $('saveMsg').textContent = '';
  render();
  $('training').classList.remove('hidden');
  $('training').querySelector('.panel').scrollTop = 0;
}
export function closeTraining() {
  $('training').classList.add('hidden');
  showBank();
}

$('statList').addEventListener('click', e => {
  const id = (e.target as HTMLElement).closest<HTMLElement>('.stat-buy')?.dataset.id as StatId | undefined;
  if (!id) return;
  if (buyStat(id)) chime();
  else tone(140, 0.12, 'square', 0.06, 90);
  render();
});
$('openTraining').onclick = openTraining;
$('resultTraining').onclick = openTraining;
$('trainingClose').onclick = closeTraining;
$('saveCopy').onclick = async () => {
  const box = $('saveCode') as HTMLTextAreaElement;
  box.value = exportCode();
  box.select();
  try {
    await navigator.clipboard.writeText(box.value);
    $('saveMsg').textContent = '복사했어요.';
  } catch {
    $('saveMsg').textContent = '복사가 막혀 있어요. 위 코드를 직접 길게 눌러 복사하세요.';
  }
};
$('saveLoad').onclick = () => {
  const ok = importCode(($('saveCode') as HTMLTextAreaElement).value);
  $('saveMsg').textContent = ok ? '불러왔어요.' : '이 게임의 저장 코드가 아니에요.';
  if (ok) {
    showBest();
    render();
  }
};
