// 만남 (docs/ability-redesign-plan.md, 4.2–4.5): opened by its timing (systems/encounter.ts). Who comes is rolled by
// the run's 정·사 odds (systems/alignment.ts): a passer-by or an 인연 of the side rolled. Both bring an 의뢰.
import { ambientPictures } from '../core/ambient-art';
import { G } from '../core/context';
import { npcPictures, skillImage, coinImage, propArt } from '../core/assets';
import { random } from '../core/rng';
import type { Quest } from '../core/state-types';
import { BR, COND } from '../data/branches';
import { NPCS, SIDE_NAME } from '../data/npcs';
import { skillEffect } from '../data/skills';
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
  // who comes was rolled and announced (systems/encounter.ts); debug: forceNpc brings that 인연, 'passer' a passer-by
  const arrived = s.meetArrive,
    forced = s.forceNpc;
  s.meetArrive = undefined;
  s.forceNpc = null;
  const id = arrived ? arrived.id : forced === 'passer' ? null : forced || rollMeet();
  if (id) openBond(id);
  else openPasser();
}

/** An offer separates the promised reward from the task and immediate alignment change. */
function act(label: string, o: Quest, say?: string) {
  const reward = questReward(o);
  const skill = reward.level ? NPCS[o.npc!].levels[reward.level - 1] : null;
  const image = skill ? skillImage(skill) : reward.double ? propArt[7].toDataURL() : coinImage();
  const effect = skill
    ? skillEffect(skill)
    : reward.double
      ? '발동 후 획득 점수가 두 배가 됩니다.'
      : '이번 판에서 사용할 엽전을 얻습니다.';
  return {
    color: BR[COND[o.t].br].color,
    html: label,
    detail: `<div class="encounter-reward"><img src="${image}" alt=""><div><small>의뢰 성공 보상</small><h4>${rewardName(o)}</h4><p>${effect}</p></div></div><div class="encounter-task"><small>수행 의뢰</small><b>${COND[o.t].label} ${o.target}</b><span>${BASELINE.meet.quest}초 이내</span></div>${say ? `<p class="encounter-answer">“${say}”</p>` : ''}<p class="encounter-immediate">선택 즉시 · ${moveText(o.move)}${o.mode === 'follow' ? ' · 호감도 +1' : ''}</p>`,
    onPick: () => acceptQuest(o),
  };
}

const rules = (passer = false) => `${oddsText()}. ${rule}${passer ? ' 판 끝에 정 1마다 점수, 사 1마다 엽전 +5%.' : ''}`;

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
  openChoice({
    eyebrow: eyebrow(),
    title: '강호의 만남',
    sub: '의뢰를 이루면 약속한 보상을 받습니다.',
    encounter: true,
    rules: rules() + (q.defy.say ? `<br>거스른다: “${q.defy.say}”` : ''),
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
    title: '강호의 만남',
    sub: '의뢰를 이루면 약속한 보상을 받습니다.',
    encounter: true,
    rules: rules(true),
    cards: [
      {
        image: ambientPictures[who.art + '-neutral'],
        artClass: 'npc-choice-art',
        color: '#d9c58f',
        tag: who.title,
        title: who.name,
        quote: who.ask,
        acts: offer.map(o => act(PASSER_QUESTS[o.mode].label, o)),
      },
    ],
  });
}
