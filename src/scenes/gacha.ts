import { ambientPictures } from '../core/ambient-art';
// 뽑기 screen: draw hero pieces once or ten times with banked 엽전, and see what came out. Opened from the title and the
// result screen. Also holds the save code (export / import), which lived in the old 수련 screen.
import { heroPictures } from '../core/assets';
import { chime, tone } from '../core/audio';
import { $ } from '../core/dom';
import { fmt } from '../core/math';
import { exportCode, importCode, profile } from '../core/profile';
import { HEROES } from '../data/heroes';
import { DRAW_COST, DRAW_TEN_COST, PIECE_STEPS, starText } from '../data/meta';
import { draw, drawable } from '../systems/gacha';
import type { Drawn } from '../systems/gacha';
import { showBank, showBest } from '../ui/hud';
import { BOX_ODDS, GEAR_BOX_COST, gearFactors, gearName } from '../data/gear';
import type { Gear } from '../data/gear';
import { factorText } from '../data/factors';
import { gearPicture, GRADE_COLORS } from '../render/gear-art';
import { buyBoxes } from '../systems/gear';

/** a 장비 상자 result: the piece, its 등급 and what it gives */
function gearResult(g: Gear) {
  return `<div class="tile draw-result${g.grade >= 3 ? ' up' : ''}" style="--c:${GRADE_COLORS[g.grade - 1]}"><span class="tile-art"><img alt="" src="${gearPicture(g.item, g.grade)}" draggable="false"></span><b>${gearName(g)}</b><small class="draw-what">${gearFactors(
    g,
  )
    .map(f => factorText(f.factor, f.value))
    .join(' · ')}</small></div>`;
}

function result(d: Drawn) {
  const h = HEROES[d.id],
    next = PIECE_STEPS[d.to];
  const what = d.from === 0 ? '새 영웅 합류' : d.to > d.from ? `★${d.to} 달성` : '조각 +1';
  return `<div class="tile draw-result${d.to > d.from ? ' up' : ''}" style="--c:${h.color}"><span class="tile-art"><img alt="" src="${heroPictures[d.id]}" draggable="false"></span><b>${h.name}</b><span class="tile-grade">${starText(d.to)}</span><small class="draw-what">${what}</small><small class="piece-count"><img class="piece-icon" src="${ambientPictures['hero-piece']}" alt="" draggable="false">영웅 조각 ${d.pieces}${next ? ' / ' + next : ''}</small></div>`;
}

function render() {
  $('gachaBank').innerHTML = `지닌 엽전 <b>${fmt(profile.coins)}냥</b>`;
  const one = drawable(1) >= 1,
    ten = drawable(10) >= 10 && profile.coins >= DRAW_TEN_COST;
  ($('drawOne') as HTMLButtonElement).disabled = !one;
  ($('drawTen') as HTMLButtonElement).disabled = !ten;
  ($('boxOne') as HTMLButtonElement).disabled = profile.coins < GEAR_BOX_COST;
  ($('boxTen') as HTMLButtonElement).disabled = profile.coins < GEAR_BOX_COST * 10;
  ($('saveCode') as HTMLTextAreaElement).value = exportCode();
}
function showGear(got: Gear[] | null) {
  if (!got) {
    tone(140, 0.12, 'square', 0.06, 90);
    return;
  }
  chime();
  $('gachaResults').innerHTML = got.map(gearResult).join('');
  $('gachaResults').classList.remove('hidden');
  render();
}
function show(drawn: Drawn[] | null) {
  if (!drawn) {
    tone(140, 0.12, 'square', 0.06, 90);
    return;
  }
  chime();
  $('gachaResults').innerHTML = drawn.map(result).join('');
  $('gachaResults').classList.toggle('hidden', !drawn.length);
  render();
}

export function openGacha() {
  $('saveMsg').textContent = '';
  $('gachaResults').innerHTML = '';
  $('gachaResults').classList.add('hidden');
  $('gachaRates').textContent =
    '영웅 조각 · 최고 성급(★5)인 영웅은 나오지 않음 · 인연은 판에서 의뢰를 따르면 호감도가 오른다';
  $('drawOne').innerHTML = `1회 뽑기<small>${fmt(DRAW_COST)}냥</small>`;
  $('drawTen').innerHTML = `10회 뽑기<small>${fmt(DRAW_TEN_COST)}냥</small>`;
  const odds = BOX_ODDS.shop.map((p, i) => `★${i + 1} ${Math.round(p * 100)}%`).join(' · ');
  $('boxRates').textContent = `장비 상자 · 무기·의복·장신구·비급 중 하나 · ${odds} · 정예 적 상자는 더 좋다`;
  $('boxOne').innerHTML = `장비 상자 1개<small>${fmt(GEAR_BOX_COST)}냥</small>`;
  $('boxTen').innerHTML = `장비 상자 10개<small>${fmt(GEAR_BOX_COST * 10)}냥</small>`;
  render();
  $('gacha').classList.remove('hidden');
  $('gacha').querySelector('.panel').scrollTop = 0;
}
function closeGacha() {
  $('gacha').classList.add('hidden');
  showBank();
}

$('drawOne').onclick = () => show(draw(1));
$('drawTen').onclick = () => show(draw(10, DRAW_TEN_COST));
$('boxOne').onclick = () => showGear(buyBoxes(1));
$('boxTen').onclick = () => showGear(buyBoxes(10));
$('openGacha').onclick = openGacha;
$('gachaClose').onclick = closeGacha;
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
