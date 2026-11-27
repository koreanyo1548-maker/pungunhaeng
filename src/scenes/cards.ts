// 인연: each 인연's 호감도 and level. Opened from the title. Read only: 호감도 rises by 1 every time the 인연's 의뢰 is
// followed in a run (core/profile.ts addBond). The level (1·3·6·10·15 호감도) strengthens their three skills.
import { npcPictures } from '../core/assets';
import { $ } from '../core/dom';
import { profile } from '../core/profile';
import { BR } from '../data/branches';
import { LEVEL_MAX, NPC_IDS, PIECE_STEPS, pieceLevel, pipText } from '../data/meta';
import type { NpcId } from '../data/meta';
import { NPCS } from '../data/npcs';
import { SKILLS, skillEffect } from '../data/skills';
import { openCollection } from '../ui/collection';
import type { Collection, Detail, Tile } from '../ui/collection';

/** What reaching this level adds (1 to 5). */
export function bondGain(level: number): string {
  return level === 1 ? '인연 1단계 · 기본 위력' : '1·2단계 기술 수치 강화 (위력 +10%)';
}

/** [호감도 toward the next level, 호감도 that level needs] (the last level counts as full) */
function toNext(id: NpcId): [number, number] {
  const points = profile.bonds[id],
    level = pieceLevel(points);
  return level >= LEVEL_MAX ? [1, 1] : [points, PIECE_STEPS[level]];
}

function tile(id: NpcId): Tile {
  const n = NPCS[id],
    level = pieceLevel(profile.bonds[id]),
    [now, goal] = toNext(id);
  return {
    id,
    name: n.name,
    image: npcPictures[id],
    color: BR[n.br].color,
    grade: pipText(level),
    note: level >= LEVEL_MAX ? '최고 단계' : `호감도 ${now} / ${goal}`,
    progress: [now, goal],
  };
}

function detail(id: NpcId): Detail {
  const n = NPCS[id],
    points = profile.bonds[id],
    level = pieceLevel(points),
    [now, goal] = toNext(id),
    shown = Math.max(1, level);
  return {
    name: n.name,
    image: npcPictures[id],
    color: BR[n.br].color,
    caption: n.title,
    grade: `${pipText(level)} 인연 ${level}단계`,
    progress: {
      label: '호감도',
      text: level >= LEVEL_MAX ? `${points} · 최고 단계` : `${now} / ${goal} · 다음 단계까지 ${goal - now}`,
      now,
      goal,
    },
    sections: n.levels.map((skill, i) => ({
      title: `${i + 1}단계 「${SKILLS[skill].name}」`,
      body: skillEffect(skill, shown),
    })),
    track: {
      title: '인연 단계 · 호감도로 오른다',
      steps: PIECE_STEPS.map((need, i) => ({
        label: `${i + 1}단계`,
        text: `호감도 ${need} · ${bondGain(i + 1)}`,
        state: i + 1 <= level ? 'done' : i === level ? 'current' : 'next',
      })),
    },
  };
}

const BONDS: Collection = {
  eyebrow: '',
  title: '인연',
  summary: () => `호감도 합계 <b>${NPC_IDS.reduce((a, id) => a + profile.bonds[id], 0)}</b> · 눌러서 자세히 보기`,
  tiles: () => NPC_IDS.map(tile),
  detail: id => detail(id as NpcId),
};

export const openCards = () => openCollection(BONDS);
$('openCards').onclick = openCards;
