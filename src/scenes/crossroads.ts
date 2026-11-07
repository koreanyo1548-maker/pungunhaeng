import { G } from '../core/context';
import { npcPictures } from '../core/assets';
import { relText } from '../core/math';
import { BR, COND } from '../data/branches';
import { NPCS } from '../data/npcs';
import { TUNE } from '../data/tune';
import { openChoice } from './choice';
import { region } from '../systems/flow';
import { acceptQuest, questTarget } from '../systems/quest';
import { nextNpcOf, pickNpc } from '../systems/relationship';

export function openCrossroads() {
  const r = region();
  const { id, why } = pickNpc(),
    n = NPCS[id],
    met = G.state.met[id] || 0,
    q = n.quests[Math.min(met, 1)],
    rel = G.state.rel[id] || 0;
  const act = (label, c, qm) => {
    const br = COND[c.t].br,
      next = NPCS[nextNpcOf(id, qm)];
    return {
      color: BR[br].color,
      html: `<b>${label}</b> · ${COND[c.t].label} ${questTarget(c)}${c.say ? `<small>“${c.say}”</small>` : ''}<small>${BR[br].name}의 깨달음 · ${qm === 'follow' ? '관계 +1' : '관계 −1 · ' + NPCS[n.rival].name + ' +1'}</small><small>다음 인연 → ${next.name}</small>`,
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
      '(' +
      BR[r.branch].hanja +
      ')</b>의 길이 수월하다. 화두를 이루지 못하면 같은 인연이 다시 찾아온다.',
    cards: [
      {
        image: npcPictures[id],
        artClass: 'npc-choice-art',
        color: BR[n.br].color,
        tag:
          (met ? '재회 · ' : '') +
          n.title +
          ' · 관계 ' +
          relText(rel) +
          (rel >= TUNE.sasaRel - 1 ? ' · 사사 가능' : ''),
        title: n.name,
        quote: q.say,
        acts: [act('따른다', q.follow, 'follow'), act('거스른다', q.defy, 'defy')],
      },
    ],
  });
}
