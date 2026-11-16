// 영웅: who has joined and each hero's 성급. Opened from the title screen.
// Read only: heroes join and rise in 성급 through pieces from 뽑기 (systems/gacha.ts).
import { heroPictures } from '../core/assets';
import { $ } from '../core/dom';
import { heroOwned, heroStars, profile } from '../core/profile';
import { HEROES } from '../data/heroes';
import { HERO_IDS, LEVEL_MAX, PIECE_STEPS, starText } from '../data/meta';
import type { HeroId } from '../data/meta';
import { openCollection } from '../ui/collection';
import type { Collection, Detail, Tile } from '../ui/collection';
import { LOCKED_HOW } from './setup';

/** [pieces held, pieces the next 성급 needs] (the last 성급 counts as full) */
function toNext(id: HeroId): [number, number] {
  const pieces = profile.heroes[id],
    stars = heroStars(id);
  return stars >= LEVEL_MAX ? [1, 1] : [pieces, PIECE_STEPS[stars]];
}

function tile(id: HeroId): Tile {
  const h = HEROES[id];
  if (!heroOwned(id))
    return { id, name: h.name, image: heroPictures[id], color: h.color, locked: true, note: '뽑기에서 획득' };
  const [now, goal] = toNext(id);
  return {
    id,
    name: h.name,
    image: heroPictures[id],
    color: h.color,
    grade: starText(heroStars(id)),
    note: heroStars(id) >= LEVEL_MAX ? '최고 성급' : `조각 ${now} / ${goal}`,
    progress: [now, goal],
  };
}

function detail(id: HeroId): Detail {
  const h = HEROES[id],
    stars = heroStars(id),
    L = Math.max(0, stars - 1),
    caption = `${h.projectile} · ${h.trait.scope === 'party' ? '지원형 (특성이 편대 전체에)' : '특성은 싸우는 동안'}`;
  const seconds = h.entry.seconds(L);
  const sections = [
    {
      title: `특성 「${h.trait.name}」`,
      body: h.trait.desc(L) + (h.trait.pending ? ` (${h.trait.pending})` : ''),
    },
    {
      title: `등장 기술 「${h.entry.name}」 · 후발로 나설 때`,
      body: (seconds ? seconds + '초 · ' : '') + h.entry.desc(L),
    },
  ];
  const track = {
    title: '성급 · 뽑기에서 같은 영웅의 조각을 모으면 오른다 (★3·★5에서 등장 기술 모양이 바뀜)',
    steps: PIECE_STEPS.map((need, i) => ({
      label: `★${i + 1}`,
      text:
        `조각 ${need}개 · ${i ? '' : '합류 · '}${h.trait.desc(i)}` +
        (h.entry.seconds(i) ? ` · 등장 ${h.entry.seconds(i)}초` : '') +
        (i === 2 || i === 4 ? ` · ${h.entry.name} 강화` : ''),
      state: (i + 1 < stars ? 'done' : i + 1 === stars ? 'current' : 'next') as 'done' | 'current' | 'next',
    })),
  };
  if (!stars)
    return {
      name: h.name,
      image: heroPictures[id],
      color: h.color,
      caption,
      grade: '잠김',
      locked: true,
      progress: { label: '합류', text: LOCKED_HOW, now: 0, goal: 1 },
      sections,
      track,
    };
  const [now, goal] = toNext(id);
  return {
    name: h.name,
    image: heroPictures[id],
    color: h.color,
    caption,
    grade: `${starText(stars)} 성급 ${stars}`,
    progress: {
      label: '조각',
      text: stars >= LEVEL_MAX ? `${now}개 · 최고 성급` : `${now} / ${goal} · 다음 성급까지 ${goal - now}개`,
      now,
      goal,
    },
    sections,
    track,
  };
}

const ROSTER: Collection = {
  eyebrow: '함께 강호를 걷는 이들',
  title: '영웅',
  summary: () => `합류한 영웅 <b>${HERO_IDS.filter(heroOwned).length} / ${HERO_IDS.length}</b> · 눌러서 자세히 보기`,
  // joined heroes first, the rest in roster order
  tiles: () => [...HERO_IDS].sort((a, b) => Number(heroOwned(b)) - Number(heroOwned(a))).map(tile),
  detail: id => detail(id as HeroId),
};

export const openRoster = () => openCollection(ROSTER);
$('openRoster').onclick = openRoster;
