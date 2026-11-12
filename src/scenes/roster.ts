// 영웅: who has joined, how to meet the rest, and each hero's mastery. Opened from the title screen.
// Read only: heroes join by meeting their condition in a run, and mastery grows by clearing gates.
import { heroPictures } from '../core/assets';
import { $ } from '../core/dom';
import { profile } from '../core/profile';
import { HEROES } from '../data/heroes';
import { HERO_IDS, masteryLevel } from '../data/meta';
import { masteryLine, unlockLine } from './setup';

function render() {
  const owned = HERO_IDS.filter(id => profile.heroes[id].owned);
  $('rosterCount').innerHTML = `합류한 영웅 <b>${owned.length} / ${HERO_IDS.length}</b>`;
  $('rosterList').innerHTML = [...owned, ...HERO_IDS.filter(id => !owned.includes(id))]
    .map(id => {
      const h = HEROES[id],
        has = profile.heroes[id].owned,
        level = masteryLevel(profile.heroes[id].mastery),
        road = h.terrain === 'ground' ? '땅' : '하늘';
      const body = has
        ? `${masteryLine(id)}<small><b>특성 「${h.trait}」</b> ${h.traitDesc(level)}</small><small><b>교체 기술 「${h.tag}」</b> ${h.tagDesc}</small>`
        : `<small class="unlock"><b>합류 조건</b> ${unlockLine(id)}</small><small><b>특성 「${h.trait}」</b> ${h.traitDesc(0)}</small>`;
      return `<div class="hero-row${has ? '' : ' locked'}" style="--c:${h.color}"><img alt="" src="${heroPictures[id]}"><div class="stat-info"><span class="stat-head"><b>${h.name}</b><span class="stat-value">${has ? road + '의 고수' : '잠김 · ' + road + '의 고수'}</span></span>${body}</div></div>`;
    })
    .join('');
}

export function openRoster() {
  render();
  $('roster').classList.remove('hidden');
  $('roster').querySelector('.panel').scrollTop = 0;
}
$('openRoster').onclick = openRoster;
$('rosterClose').onclick = () => $('roster').classList.add('hidden');
