// 인연 카드: each 인연's card level, pieces, and what the card does to their unique skill. Opened from the title.
// Read only: pieces come from 뽑기 (systems/gacha.ts). Only 인연 with a card appear in runs.
import { npcPictures } from '../core/assets';
import { $ } from '../core/dom';
import { profile } from '../core/profile';
import { BR } from '../data/branches';
import {
  CARD_EASE,
  CARD_HELP,
  LEVEL_MAX as CARD_MAX,
  NPC_IDS,
  PIECE_STEPS as CARD_STEPS,
  pieceLevel as cardLevel,
  pipText,
} from '../data/meta';
import type { NpcId } from '../data/meta';
import { NPCS } from '../data/npcs';
import { SKILLS, skillEffect, skillWhen } from '../data/skills';
import { openCollection } from '../ui/collection';
import type { Collection, Detail, Tile } from '../ui/collection';

/** What reaching this level adds (1 to 5). */
export function cardGain(id: string, level: number): string {
  const boost = NPCS[id].card,
    skill = SKILLS[NPCS[id].unique].name;
  return ['인연 카드 등록', `${skill} 강화 · ${boost[0]}`, CARD_EASE, `${skill} 강화 · ${boost[1]}`, CARD_HELP][
    level - 1
  ];
}
const pips = pipText;

/** [pieces toward the next level, pieces that level needs in total] (a full card counts as full) */
function toNext(id: NpcId): [number, number] {
  const pieces = profile.cards[id],
    level = cardLevel(pieces);
  return level >= CARD_MAX ? [1, 1] : [pieces, CARD_STEPS[level]];
}

function tile(id: NpcId): Tile {
  const n = NPCS[id],
    level = cardLevel(profile.cards[id]),
    [now, goal] = toNext(id);
  return {
    id,
    name: n.name,
    image: npcPictures[id],
    color: BR[n.br].color,
    locked: !level,
    lockText: '카드 없음',
    grade: pips(level),
    note: level >= CARD_MAX ? '최고 단계' : `조각 ${now} / ${goal}`,
    progress: [now, goal],
  };
}

function detail(id: NpcId): Detail {
  const n = NPCS[id],
    pieces = profile.cards[id],
    level = cardLevel(pieces),
    [now, goal] = toNext(id),
    skill = SKILLS[n.unique];
  return {
    name: n.name,
    image: npcPictures[id],
    color: BR[n.br].color,
    caption: n.title,
    grade: level ? `${pips(level)} 인연 카드 ${level}단계` : '카드 없음',
    locked: !level,
    progress: {
      label: '조각',
      text: level >= CARD_MAX ? `${pieces}개 · 최고 단계` : `${now} / ${goal} · 다음 단계까지 ${goal - now}개`,
      now,
      goal,
    },
    sections: [
      { title: `고유 기술 「${skill.name}」`, body: `${skillWhen(n.unique)} · ${skillEffect(n.unique, level)}` },
      {
        title: '조각 얻는 법',
        body: '뽑기. 카드가 생기면 이 인연이 판에 나타나고, 카드가 없으면 그 자리에 행인이 나온다.',
      },
    ],
    track: {
      title: '카드 단계 · 오른 단계는 다음 판부터 적용',
      steps: CARD_STEPS.map((need, i) => ({
        label: `${i + 1}단계`,
        text: `조각 ${need}개 · ${cardGain(id, i + 1)}`,
        state: i + 1 <= level ? 'done' : i === level ? 'current' : 'next',
      })),
    },
  };
}

const CARDS: Collection = {
  eyebrow: '강호에서 맺은 인연',
  title: '인연 카드',
  summary: () =>
    `가진 카드 <b>${NPC_IDS.filter(id => profile.cards[id] > 0).length} / ${NPC_IDS.length}</b> · 눌러서 자세히 보기`,
  // cards held first, the rest in 인연 order
  tiles: () => [...NPC_IDS].sort((a, b) => Number(profile.cards[b] > 0) - Number(profile.cards[a] > 0)).map(tile),
  detail: id => detail(id as NpcId),
};

export const openCards = () => openCollection(CARDS);
$('openCards').onclick = openCards;
