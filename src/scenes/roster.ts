// 영웅: who has joined, how to meet the rest, and each hero's mastery. Opened from the title screen.
// Read only: heroes join by meeting their condition in a run, and mastery grows by clearing gates.
import { heroPictures } from '../core/assets';
import { $ } from '../core/dom';
import { profile } from '../core/profile';
import { HEROES } from '../data/heroes';
import { HERO_IDS, MASTERY_MAX, MASTERY_STEPS, UNLOCKS, masteryLevel, masteryStars } from '../data/meta';
import type { HeroId } from '../data/meta';
import { openCollection } from '../ui/collection';
import type { Collection, Detail, Tile } from '../ui/collection';

const ROLE = { mukyoung: '회피', unhak: '필살' };
const road = (id: HeroId) => (HEROES[id].terrain === 'ground' ? '땅' : '하늘');

/** [mastery now, mastery needed for the next level] (the last level counts as full) */
function toNext(id: HeroId): [number, number] {
  const m = profile.heroes[id].mastery,
    level = masteryLevel(m);
  return level >= MASTERY_MAX ? [1, 1] : [m - MASTERY_STEPS[level], MASTERY_STEPS[level + 1] - MASTERY_STEPS[level]];
}

function tile(id: HeroId): Tile {
  const h = HEROES[id],
    hero = profile.heroes[id];
  if (!hero.owned) {
    const [now, goal] = UNLOCKS[id]!.progress(profile.records);
    return {
      id,
      name: h.name,
      image: heroPictures[id],
      color: h.color,
      locked: true,
      note: `${now} / ${goal}`,
      progress: [now, goal],
    };
  }
  return {
    id,
    name: h.name,
    image: heroPictures[id],
    color: h.color,
    grade: masteryStars(masteryLevel(hero.mastery)),
    note: road(id) + '의 고수',
    progress: toNext(id),
  };
}

function detail(id: HeroId): Detail {
  const h = HEROES[id],
    hero = profile.heroes[id],
    level = masteryLevel(hero.mastery),
    caption = `${road(id)}의 고수 · ${ROLE[id] ?? '공격'}`;
  const sections = [
    { title: `특성 「${h.trait}」`, body: h.traitDesc(hero.owned ? level : 0) },
    { title: `교체 기술 「${h.tag}」`, body: h.tagDesc },
  ];
  if (!hero.owned) {
    const u = UNLOCKS[id]!,
      [now, goal] = u.progress(profile.records);
    return {
      name: h.name,
      image: heroPictures[id],
      color: h.color,
      caption,
      grade: '잠김',
      locked: true,
      progress: { label: '합류 조건', text: `${u.text} (${now} / ${goal})`, now, goal },
      sections,
    };
  }
  const [now, goal] = toNext(id);
  return {
    name: h.name,
    image: heroPictures[id],
    color: h.color,
    caption,
    grade: `${masteryStars(level)} 숙련 ${level + 1}단계`,
    progress: {
      label: '숙련',
      text: level >= MASTERY_MAX ? '최고 단계' : `다음 단계까지 관문 ${goal - now}개`,
      now,
      goal,
    },
    sections,
    track: {
      title: '숙련 단계 · 편대에 넣고 관문을 돌파하면 오른다',
      steps: MASTERY_STEPS.map((need, i) => ({
        label: `★${i + 1}`,
        text: `${i ? `관문 ${need}개` : '합류'} · ${h.traitDesc(i)}`,
        state: i < level ? 'done' : i === level ? 'current' : 'next',
      })),
    },
  };
}

const ROSTER: Collection = {
  eyebrow: '함께 강호를 걷는 이들',
  title: '영웅',
  summary: () =>
    `합류한 영웅 <b>${HERO_IDS.filter(id => profile.heroes[id].owned).length} / ${HERO_IDS.length}</b> · 눌러서 자세히 보기`,
  // joined heroes first, the rest in roster order
  tiles: () =>
    [...HERO_IDS].sort((a, b) => Number(profile.heroes[b].owned) - Number(profile.heroes[a].owned)).map(tile),
  detail: id => detail(id as HeroId),
};

export const openRoster = () => openCollection(ROSTER);
$('openRoster').onclick = openRoster;
