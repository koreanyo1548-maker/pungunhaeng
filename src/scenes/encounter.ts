// 만남 (docs/ability-redesign-plan.md, 4.2–4.5): opened by its timing (systems/encounter.ts). Who comes is rolled by
// the run's 정·사 odds (systems/alignment.ts): a passer-by or an 인연 of the side rolled. Both bring one 의뢰, shown
// on one card and taken with a tap anywhere, or by itself after TAP_SECONDS (2026-11: no more choice of two).
import { ambientPictures } from '../core/ambient-art';
import { G } from '../core/context';
import { npcPictures, skillImage, coinImage } from '../core/assets';
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
import { passerNow, passerOffer } from '../systems/virtue';

const eyebrow = () => `S${G.state.stage} ${region().name} · 만남 ${G.state.encounters}`;
/** "정 3 · 사 2. 만남 확률 행인 10% · 정파 50% · 사파 40%" */
const oddsText = () => {
  const [p, g, e] = meetChances();
  return `<b>${alignText()}</b> · 행인 ${p}% · 정파 ${g}% · 사파 ${e}%`;
};
const rule = `의뢰는 ${BASELINE.meet.quest}초 안에 이뤄야 한다. 이루면 곧 다음 만남이 온다. 정·사는 받을 때 오르고, 실패하면 보상은 없다.`;

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

/** The 의뢰 of a 만남: the promised reward, the task, and the point it gives at once. */
function act(o: Quest) {
  const reward = questReward(o);
  const skill = reward.level ? NPCS[o.npc!].levels[reward.level - 1] : null;
  const image = skill ? skillImage(skill) : coinImage();
  const effect = skill ? skillEffect(skill) : '이번 판에서 사용할 엽전을 얻습니다.';
  return {
    color: BR[COND[o.t].br].color,
    html: '',
    detail: `<div class="encounter-reward"><img src="${image}" alt=""><div><small>의뢰 성공 보상</small><h4>${rewardName(o)}</h4><p>${effect}</p></div></div><div class="encounter-task"><small>수행 의뢰</small><b>${COND[o.t].label} ${o.target}</b><span>${BASELINE.meet.quest}초 이내</span></div><p class="encounter-immediate">받으면 바로 · ${moveText(o.move)}${o.npc ? ' · 성공하면 호감도 +1' : ''}</p>`,
    onPick: () => acceptQuest(o),
  };
}

const rules = (passer = false) => `${oddsText()}. ${rule}${passer ? ' 판 끝에 정 1마다 점수, 사 1마다 엽전 +5%.' : ''}`;
/** seconds the 의뢰 card waits before it is taken by itself (a tap takes it at once) */
const TAP_SECONDS = 10;

function openBond(id: string) {
  const n = NPCS[id],
    met = G.state.met[id] || 0,
    q = n.quests[met % n.quests.length],
    level = bondLevel(id),
    c = q.follow;
  const offer = offerQuest({
    npc: id,
    mode: 'follow',
    move: alignMove(id),
    t: c.t,
    target: questTarget(c, random() * 2 - 1),
  });
  G.state.offer = offer;
  openChoice({
    eyebrow: eyebrow(),
    title: '강호의 만남',
    sub: '의뢰를 이루면 약속한 보상을 받습니다.',
    encounter: true,
    tap: { seconds: TAP_SECONDS },
    rules: rules(),
    cards: [
      {
        image: npcPictures[id],
        artClass: 'npc-choice-art',
        color: BR[n.br].color,
        tag: `${SIDE_NAME[n.side]} · ${n.title} · ${level ? `${level}단계` : '첫 만남'}${level >= BOND_MAX ? ' (최고)' : ''}`,
        title: n.name,
        quote: q.say,
        acts: [act(offer)],
      },
    ],
  });
}

/** A passer-by: kills for 엽전; 정 or 사 is rolled for each passer-by. */
function openPasser() {
  const who = passerNow(),
    offer = passerOffer();
  G.state.offer = offer;
  openChoice({
    eyebrow: eyebrow(),
    title: '강호의 만남',
    sub: '의뢰를 이루면 약속한 보상을 받습니다.',
    encounter: true,
    tap: { seconds: TAP_SECONDS },
    rules: rules(true),
    cards: [
      {
        image: ambientPictures[who.art + '-neutral'],
        artClass: 'npc-choice-art',
        color: '#d9c58f',
        tag: who.title,
        title: who.name,
        quote: who.ask,
        acts: [act(offer)],
      },
    ],
  });
}
