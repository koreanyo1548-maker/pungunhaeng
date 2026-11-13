// 인연 카드: each 인연's card level, pieces, and what the card does to their unique skill. Opened from the title.
// Read only: pieces come from 의뢰 and cleared final gates (systems/meta.ts).
import { npcPictures } from '../core/assets';
import { $ } from '../core/dom';
import { profile } from '../core/profile';
import { BR } from '../data/branches';
import { CARD_EASE, CARD_HELP, CARD_MAX, CARD_STEPS, NPC_IDS, cardLevel } from '../data/meta';
import { NPCS } from '../data/npcs';
import { SKILLS, skillEffect } from '../data/skills';

/** What reaching this level adds (1 to 5). */
export function cardGain(id: string, level: number): string {
  const boost = NPCS[id].card,
    skill = SKILLS[NPCS[id].unique].name;
  return ['인연 카드 등록', `${skill} 강화 · ${boost[0]}`, CARD_EASE, `${skill} 강화 · ${boost[1]}`, CARD_HELP][
    level - 1
  ];
}

function render() {
  $('cardList').innerHTML = NPC_IDS.map(id => {
    const n = NPCS[id],
      pieces = profile.cards[id],
      level = cardLevel(pieces),
      max = level >= CARD_MAX;
    const pips = '●'.repeat(level) + '○'.repeat(CARD_MAX - level);
    const count = max ? '최고 단계' : `조각 ${pieces} / ${CARD_STEPS[level]}`;
    const next = max ? '' : `<small class="next"><b>${level + 1}단계</b> ${cardGain(id, level + 1)}</small>`;
    return `<div class="hero-row${level ? '' : ' locked'}" style="--c:${BR[n.br].color}"><img alt="" src="${npcPictures[id]}"><div class="stat-info"><span class="stat-head"><b>${n.name}</b><span class="stat-value">${level ? `인연 카드 <b>${level}단계</b>` : '카드 없음'}</span></span><span class="mastery"><i class="stars">${pips}</i> ${count}</span><small><b>고유 기술 「${SKILLS[n.unique].name}」</b> ${skillEffect(n.unique, level)}</small>${next}</div></div>`;
  }).join('');
}

export function openCards() {
  render();
  $('cards').classList.remove('hidden');
  $('cards').querySelector('.panel').scrollTop = 0;
}
$('openCards').onclick = openCards;
$('cardsClose').onclick = () => $('cards').classList.add('hidden');
