// 뽑기 screen: draw once or ten times with banked 엽전, and see what came out. Opened from the title and the
// result screen. Also holds the save code (export / import), which lived in the old 수련 screen.
import { heroPictures, npcPictures } from '../core/assets';
import { chime, tone } from '../core/audio';
import { $ } from '../core/dom';
import { fmt } from '../core/math';
import { exportCode, importCode, profile } from '../core/profile';
import { BR } from '../data/branches';
import { HEROES } from '../data/heroes';
import { DRAW_COST, DRAW_TEN_COST, HERO_SHARE, PIECE_STEPS, pipText, starText } from '../data/meta';
import { NPCS } from '../data/npcs';
import { draw, drawable } from '../systems/gacha';
import type { Drawn } from '../systems/gacha';
import { showBank, showBest } from '../ui/hud';

function result(d: Drawn) {
  const hero = d.kind === 'hero',
    name = hero ? HEROES[d.id].name : NPCS[d.id].name,
    image = hero ? heroPictures[d.id] : npcPictures[d.id],
    color = hero ? HEROES[d.id].color : BR[NPCS[d.id].br].color,
    next = PIECE_STEPS[d.to];
  const what =
    d.from === 0
      ? hero
        ? '새 영웅 합류'
        : '새 인연 카드'
      : d.to > d.from
        ? hero
          ? `★${d.to} 달성`
          : `${d.to}단계 달성`
        : '조각 +1';
  const grade = hero ? starText(d.to) : pipText(d.to);
  return `<div class="tile draw-result${d.to > d.from ? ' up' : ''}" style="--c:${color}"><span class="tile-art"><img alt="" src="${image}" draggable="false"></span><b>${name}</b><span class="tile-grade">${grade}</span><small class="draw-what">${what}</small><small>${hero ? '영웅' : '인연'} 조각 ${d.pieces}${next ? ' / ' + next : ''}</small></div>`;
}

function render() {
  $('gachaBank').innerHTML = `지닌 엽전 <b>${fmt(profile.coins)}냥</b>`;
  const one = drawable(1) >= 1,
    ten = drawable(10) >= 10 && profile.coins >= DRAW_TEN_COST;
  ($('drawOne') as HTMLButtonElement).disabled = !one;
  ($('drawTen') as HTMLButtonElement).disabled = !ten;
  ($('saveCode') as HTMLTextAreaElement).value = exportCode();
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
    `영웅 조각 ${Math.round(HERO_SHARE * 100)}% · 인연 카드 조각 ${Math.round((1 - HERO_SHARE) * 100)}% · 다 모은 것은 나오지 않음`;
  $('drawOne').innerHTML = `1회 뽑기<small>${fmt(DRAW_COST)}냥</small>`;
  $('drawTen').innerHTML = `10회 뽑기<small>${fmt(DRAW_TEN_COST)}냥</small>`;
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
$('openGacha').onclick = openGacha;
$('resultGacha').onclick = openGacha;
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
