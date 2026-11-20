// 만남 (docs/ability-redesign-plan.md, 4.2–4.5): opened by its timing (systems/encounter.ts). Who comes is rolled by
// the run's 정·사 odds (systems/alignment.ts): a passer-by or an 인연 of the side rolled. Both bring an 의뢰.
import { ambientPictures } from '../core/ambient-art';
import { G } from '../core/context';
import { npcPictures } from '../core/assets';
import { random } from '../core/rng';
import type { Quest } from '../core/state-types';
import { BR, COND } from '../data/branches';
import { NPCS, SIDE_NAME } from '../data/npcs';
import { SKILLS, skillEffect } from '../data/skills';
import { openChoice } from './choice';
import { BASELINE } from '../data/baseline';
import { region } from '../systems/flow';
import { alignText, meetChances, moveText, rollMeet } from '../systems/alignment';
import {
  BOND_MAX,
  acceptQuest,
  alignMove,
  closeQuest,
  offerQuest,
  questReward,
  questTarget,
  rewardName,
} from '../systems/quest';
import { bondLevel } from '../systems/relationship';
import { PASSER_QUESTS, passerNow, passerOffer } from '../systems/virtue';

const eyebrow = () => `S${G.state.stage} ${region().name} · 만남 ${G.state.encounters}`;
/** "정 3 · 사 2. 만남 확률 행인 10% · 정파 50% · 사파 40%" */
const oddsText = () => {
  const [p, g, e] = meetChances();
  return `<b>${alignText()}</b> · 행인 ${p}% · 정파 ${g}% · 사파 ${e}%`;
};
const rule = `의뢰는 ${BASELINE.meet.quest}초 안에 이뤄야 한다. 이루면 곧 다음 만남이 온다. 실패해도 정·사는 오르지만 보상은 없다.`;

export function openEncounter() {
  const s = G.state;
  s.encounters++;
  // an 의뢰 still open fails (its time or its success opened this 만남, so this is only a safeguard)
  closeQuest();
  // debug: forceNpc brings that 인연, or a passer-by for 'passer'
  const forced = s.forceNpc;
  s.forceNpc = null;
  const id = forced === 'passer' ? null : forced || rollMeet();
  if (id) openBond(id);
  else openPasser();
}

/** the line under an 의뢰: its point and its reward */
const rewardLine = (q: Quest) => {
  const r = questReward(q);
  return `${moveText(q.move)}${q.mode === 'follow' ? ' · 호감도 +1' : ''} · 성공: ${rewardName(q)}${r.level ? ' ' + skillEffect(NPCS[q.npc as string].levels[r.level - 1]) : ''}`;
};

function openBond(id: string) {
  const n = NPCS[id],
    met = G.state.met[id] || 0,
    q = n.quests[met % n.quests.length],
    level = bondLevel(id);
  const offer = (['follow', 'defy'] as const).map(mode => {
    const c = q[mode];
    return offerQuest({ npc: id, mode, move: alignMove(id, mode), t: c.t, target: questTarget(c, random() * 2 - 1) });
  });
  G.state.offer = offer;
  const act = (label: string, o: Quest, say?: string) => ({
    color: BR[COND[o.t].br].color,
    html: `<b>${label}</b> · ${COND[o.t].label} ${o.target}${say ? `<small>“${say}”</small>` : ''}<small>${rewardLine(o)}</small>`,
    onPick: () => acceptQuest(o),
  });
  openChoice({
    eyebrow: eyebrow(),
    title: '인연',
    sub: `${oddsText()}. ${rule}`,
    cards: [
      {
        image: npcPictures[id],
        artClass: 'npc-choice-art',
        color: BR[n.br].color,
        tag: `${SIDE_NAME[n.side]} · ${n.title} · ${level ? `${level}단계` : '첫 만남'}${level >= BOND_MAX ? ' (최고)' : ''}`,
        title: n.name,
        quote: q.say,
        acts: [act('따른다', offer[0]), act('거스른다', offer[1], q.defy.say)],
      },
    ],
  });
}

/** A passer-by: 돕는다 (kills → 엽전) or 무시한다 (엽전 taken → 점수 두 배); one adds 정, the other 사. */
function openPasser() {
  const who = passerNow(),
    offer = passerOffer();
  G.state.offer = offer;
  openChoice({
    eyebrow: eyebrow(),
    title: '행인',
    sub: `${oddsText()}. ${rule} 판 끝에 정 1마다 점수, 사 1마다 엽전 +5%.`,
    cards: [
      {
        image: ambientPictures[who.art + '-neutral'],
        artClass: 'npc-choice-art',
        color: '#d9c58f',
        tag: who.title,
        title: who.name,
        quote: who.ask,
        acts: offer.map(o => ({
          color: o.move > 0 ? '#ffd77a' : '#a6c8bf',
          html: `<b>${PASSER_QUESTS[o.mode].label}</b> · ${COND[o.t].label} ${o.target}<small>${rewardLine(o)}</small>`,
          onPick: () => acceptQuest(o),
        })),
      },
    ],
  });
}
