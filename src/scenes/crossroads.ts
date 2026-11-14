import { G } from '../core/context';
import { npcPictures } from '../core/assets';
import { relText } from '../core/math';
import { BR, COND } from '../data/branches';
import { NPCS } from '../data/npcs';
import { openChoice } from './choice';
import { region } from '../systems/flow';
import { acceptQuest, questTarget } from '../systems/quest';
import { hasCard, nextNpcOf, pickNpc, sasaNeed } from '../systems/relationship';
import { meetPasser, passerOf, virtueBonus } from '../systems/virtue';
import { ALMS, ALMS_VIRTUE, VIRTUE_CAP, VIRTUE_RATE } from '../data/meta';

export function openCrossroads() {
  const r = region();
  const { id, why } = pickNpc();
  if (!id) return openPasser(why);
  const n = NPCS[id],
    met = G.state.met[id] || 0,
    q = n.quests[Math.min(met, 1)],
    rel = G.state.rel[id] || 0;
  const act = (label, c, qm) => {
    const br = COND[c.t].br,
      next = NPCS[nextNpcOf(id, qm)];
    return {
      color: BR[br].color,
      html: `<b>${label}</b> · ${COND[c.t].label} ${questTarget(c)}${c.say ? `<small>“${c.say}”</small>` : ''}<small>${BR[br].name} 계열 기술 · ${qm === 'follow' ? '호감도 +1' : '호감도 −1 · ' + NPCS[n.rival].name + ' 호감도 +1'}</small><small>다음 인연 → ${next.name}${hasCard(nextNpcOf(id, qm)) ? '' : ' (카드 없음 · 행인)'}</small>`,
      onPick: () => acceptQuest(id, qm),
    };
  };
  openChoice({
    eyebrow: '관문 ' + G.state.stage + ' · ' + r.name,
    title: '인연',
    sub:
      why +
      '<br>이 지형에서는 <b style="color:' +
      BR[r.branch].color +
      '">' +
      BR[r.branch].name +
      ' 계열</b> 의뢰가 수월하다. 의뢰에 실패하면 같은 인연이 다시 찾아온다.',
    cards: [
      {
        image: npcPictures[id],
        artClass: 'npc-choice-art',
        color: BR[n.br].color,
        tag:
          (met ? '재회 · ' : '') +
          n.title +
          ' · 호감도 ' +
          relText(rel) +
          (rel >= sasaNeed(id) - 1 ? ' · 고유 기술 전수 가능' : ''),
        title: n.name,
        quote: q.say,
        acts: [act('따른다', q.follow, 'follow'), act('거스른다', q.defy, 'defy')],
      },
    ],
  });
}

/** A passer-by instead of an 인연: give 엽전 for 덕, or walk on. No 의뢰, so no 기술 선택 at this gate. */
function openPasser(why: string) {
  const r = region(),
    who = passerOf(G.state.stage),
    { v, percent } = virtueBonus(),
    after = Math.round(Math.min(VIRTUE_CAP, G.state.virtue + ALMS_VIRTUE) * VIRTUE_RATE * 100),
    poor = G.state.coins < ALMS;
  openChoice({
    eyebrow: '관문 ' + G.state.stage + ' · ' + r.name,
    title: '행인',
    sub: why + '<br>인연 카드가 있는 인연만 길에서 만난다. 행인에게 베푼 덕은 판이 끝날 때 보관하는 엽전을 늘린다.',
    cards: [
      {
        color: '#d9c58f',
        tag: who.title + ` · 지금 덕 ${v} (보관 엽전 +${percent}%)`,
        title: who.name,
        quote: who.say,
        acts: [
          {
            color: '#ffd77a',
            html: `<b>베푼다</b> · ${ALMS}냥<small>덕 +${ALMS_VIRTUE} → 보관 엽전 +${after}%</small><small>${poor ? `엽전 부족 (지닌 엽전 ${G.state.coins}냥)` : `지닌 엽전 ${G.state.coins}냥`}</small>`,
            disabled: poor,
            onPick: () => meetPasser(true),
          },
          {
            color: '#a6c8bf',
            html: '<b>지나간다</b><small>아무 일도 없다</small>',
            onPick: () => meetPasser(false),
          },
        ],
      },
    ],
  });
}
