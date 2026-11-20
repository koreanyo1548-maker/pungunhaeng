// 만남 (docs/ability-redesign-plan.md, 4.2–4.5): opened by its timing (systems/encounter.ts).
// An 인연 who can come (unlocked by 선·악 points) brings an 의뢰; otherwise a passer-by comes.
import { ambientPictures } from '../core/ambient-art';
import { G } from '../core/context';
import { npcPictures } from '../core/assets';
import { rnd } from '../core/math';
import { BR, COND } from '../data/branches';
import { NPCS, SIDE_NAME } from '../data/npcs';
import { SKILLS, skillEffect } from '../data/skills';
import { openChoice } from './choice';
import { BASELINE } from '../data/baseline';
import { region } from '../systems/flow';
import { alignText, candidates, moveText } from '../systems/alignment';
import { BOND_MAX, acceptQuest, alignMove, closeQuest, questReward, questTarget } from '../systems/quest';
import { bondLevel } from '../systems/relationship';
import { PASSER_ACTS, meetPasser, passerNow } from '../systems/virtue';

const eyebrow = () => `S${G.state.stage} ${region().name} · 만남 ${G.state.encounters}`;

export function openEncounter() {
  const s = G.state;
  s.encounters++;
  // an 의뢰 still open fails (its time or its success opened this 만남, so this is only a safeguard)
  closeQuest();
  let id = s.forceNpc;
  s.forceNpc = null;
  if (!id) {
    const list = candidates();
    if (list.length) id = list[Math.floor(rnd(0, list.length))];
  }
  if (id) openBond(id);
  else openPasser();
}

function rewardText(id: string, mode: string) {
  const r = questReward(id, mode);
  if (!r.level) return `성공: 엽전 ${r.coins}냥`;
  const skill = NPCS[id].levels[r.level - 1];
  return `성공: ${r.level}단계 「${SKILLS[skill].name}」 ${skillEffect(skill)}`;
}

function openBond(id: string) {
  const n = NPCS[id],
    met = G.state.met[id] || 0,
    q = n.quests[met % n.quests.length],
    level = bondLevel(id);
  const act = (label: string, c, mode: string) => ({
    color: BR[COND[c.t].br].color,
    html: `<b>${label}</b> · ${COND[c.t].label} ${questTarget(c, met)}${c.say ? `<small>“${c.say}”</small>` : ''}<small>${moveText(alignMove(id, mode))}${mode === 'follow' ? ' · 호감도 +1' : ''} · ${rewardText(id, mode)}</small>`,
    onPick: () => acceptQuest(id, mode),
  });
  openChoice({
    eyebrow: eyebrow(),
    title: '인연',
    sub: `<b>${alignText()}</b>. 의뢰는 ${BASELINE.meet.quest}초 안에 이뤄야 한다. 이루면 곧 다음 만남이 온다. 실패해도 선·악은 오르지만 보상은 없다.`,
    cards: [
      {
        image: npcPictures[id],
        artClass: 'npc-choice-art',
        color: BR[n.br].color,
        tag: `${SIDE_NAME[n.side]} · ${n.title} · ${level ? `${level}단계` : '첫 만남'}${level >= BOND_MAX ? ' (최고)' : ''}`,
        title: n.name,
        quote: q.say,
        acts: [act('따른다', q.follow, 'follow'), act('거스른다', q.defy, 'defy')],
      },
    ],
  });
}

/** A passer-by instead of an 인연: no 의뢰, the choice only moves the scale (level 2: and costs 엽전). */
function openPasser() {
  const { who, level } = passerNow(),
    poor = G.state.coins < PASSER_ACTS[2][0].cost;
  openChoice({
    eyebrow: eyebrow(),
    title: '행인',
    sub: `<b>${alignText()}</b>. 길에서 만날 인연이 아직 없다. 선·악이 1·3·5에 닿으면 그쪽 인연이 열린다. 판 끝에 선 1마다 점수, 악 1마다 엽전 +5%.`,
    cards: [
      {
        image: ambientPictures[who.art + '-neutral'],
        artClass: 'npc-choice-art',
        color: '#d9c58f',
        tag: who.title,
        title: who.name,
        quote: level === 1 ? who.ask : who.say,
        acts: PASSER_ACTS[level].map((a, i) => {
          const off = a.cost > 0 && poor;
          return {
            color: a.move > 0 ? '#ffd77a' : '#a6c8bf',
            html:
              `<b>${a.label}</b>${a.cost ? ` · ${a.cost}냥` : ''}<small>${moveText(a.move)}</small>` +
              (a.cost ? `<small>${off ? '엽전 부족 · ' : ''}지닌 엽전 ${G.state.coins}냥</small>` : ''),
            disabled: off,
            onPick: () => meetPasser(i),
          };
        }),
      },
    ],
  });
}
