// 영웅: who has joined, each hero's 성급 and level. Opened from the title screen.
// Heroes join and rise in 성급 through pieces from 뽑기 (systems/gacha.ts); each 성급 opens ten levels, raised here
// with banked 엽전 (레벨업). A level raises the attack and, at 10 and 20, the shots per volley.
import { heroPictures } from '../core/assets';
import { $ } from '../core/dom';
import { heroLevelCap, heroOwned, heroStars, levelUp, levelUpCost, profile } from '../core/profile';
import { fmt } from '../core/math';
import { showBank } from '../ui/hud';
import { HEROES } from '../data/heroes';
import { HERO_IDS, LEVEL_MAX, LEVELS_PER_STAR, PIECE_STEPS, starText, weaponStage } from '../data/meta';
import { TUNE } from '../data/tune';
import type { HeroId } from '../data/meta';
import { openCollection } from '../ui/collection';
import type { Collection, Detail, Tile } from '../ui/collection';
import { LOCKED_HOW } from './setup';

const attackAt = (level: number) => TUNE.attack + level - 1;

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
    grade: `${starText(heroStars(id))} Lv ${profile.levels[id]}`,
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
  const level = profile.levels[id],
    cap = heroLevelCap(id);
  const sections = [
    {
      title: `레벨 ${level} / ${cap}`,
      body:
        `공격력 ${attackAt(level)} · 공격 단계 ${weaponStage(level)} (한 번에 ${weaponStage(level) + 1}발)` +
        `<br>레벨마다 공격력 +1, 10레벨에 공격 단계 2, 20레벨에 3. 성급이 오를 때마다 최대 레벨 +${LEVELS_PER_STAR}.`,
    },
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
        `조각 ${need}개 · ${i ? '' : '합류 · '}최대 Lv ${(i + 1) * LEVELS_PER_STAR} · ${h.trait.desc(i)}` +
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
    actions: [levelAction(id)],
  };
}

/** The 레벨업 button: the next level's price, or why it cannot go up. */
function levelAction(id: HeroId) {
  const cost = levelUpCost(id),
    level = profile.levels[id];
  if (cost === null)
    return { label: '최대 레벨', note: heroStars(id) < LEVEL_MAX ? '성급을 올리면 열린다' : '', disabled: true };
  return {
    label: `레벨업 · ${fmt(cost)}냥`,
    note: `Lv ${level} → ${level + 1} · 공격력 ${attackAt(level)} → ${attackAt(level + 1)} · 지닌 엽전 ${fmt(profile.coins)}냥`,
    disabled: profile.coins < cost,
    onClick: () => {
      if (levelUp(id)) showBank();
    },
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
$('resultRoster').onclick = openRoster;
