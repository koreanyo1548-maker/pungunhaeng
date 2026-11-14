import strike from '../assets/icons/strike.svg';
import dodge from '../assets/icons/dodge.svg';
import energy from '../assets/icons/energy.svg';
import { done } from '../systems/scene-flow';
import { G } from '../core/context';
import { heroPictures, heroAnimations } from '../core/assets';
import { COURSES } from '../data/courses';
import { heroOwned, profile } from '../core/profile';
import { HEROES } from '../data/heroes';
import { HERO_IDS, LEVEL_MAX, PIECE_STEPS, pieceLevel, starText } from '../data/meta';
import type { HeroId } from '../data/meta';
import { openChoice } from './choice';

export function openCourseSelect() {
  openChoice({
    eyebrow: '관문 모드',
    title: '길을 고르라',
    sub: '땅과 하늘, 두 갈래 길이 있다. 무한 모드(땅과 하늘을 오가는 길)는 준비 중이다.',
    cards: Object.entries(COURSES).map(([id, c]) => ({
      color: id === 'sky' ? '#9fe5ff' : '#ffc179',
      tag: c.name + ' · 관문 3개 + ' + c.regions[3].name,
      title: c.label,
      desc: c.desc,
      onPick: () => {
        G.state.course = id;
        done('course');
      },
    })),
  });
}
/** "★★☆☆☆ 성급 2 · 다음 성급까지 조각 2개" for a hero's 성급 (raised by pieces from 뽑기). */
export function starLine(id: HeroId) {
  const pieces = profile.heroes[id],
    stars = pieceLevel(pieces);
  const next = stars >= LEVEL_MAX ? '최고 성급' : `다음 성급까지 조각 ${PIECE_STEPS[stars] - pieces}개`;
  return `<span class="mastery"><i class="stars">${starText(stars)}</i> 성급 ${stars} · ${next}</span>`;
}
export const LOCKED_HOW = '뽑기에서 이 영웅의 조각을 얻으면 합류한다';
export function heroCard(id, slot) {
  const h = HEROES[id],
    ok = h.terrain === G.state.course,
    locked = !heroOwned(id),
    level = G.state.meta.heroes[id];
  if (locked)
    return {
      image: heroPictures[id],
      artClass: 'hero-choice-art',
      color: h.color,
      locked: true,
      tag: '잠김 · ' + (h.terrain === 'ground' ? '땅' : '하늘') + '의 고수',
      title: h.name,
      fullArt: heroAnimations[id][0].toDataURL(),
      detail: `<b>합류</b> ${LOCKED_HOW}<br><b>특성 「${h.trait}」</b> ${h.traitDesc(0)}<br><b>교체 기술 「${h.tag}」</b> ${h.tagDesc}`,
      onPick: () => {},
    };
  return {
    image: heroPictures[id],
    artClass: 'hero-choice-art',
    color: h.color,
    tag: (h.terrain === 'ground' ? '땅' : '하늘') + '의 고수' + (ok ? ' · 이 길에 맞음' : ' · 이 길에서는 특성 미발동'),
    title: h.name,
    desc: `<span class="hero-role"><img alt="" src="${id === 'mukyoung' ? dodge : id === 'unhak' ? energy : strike}">${id === 'mukyoung' ? '회피' : id === 'unhak' ? '필살' : '공격'}</span>${h.traitDesc(level)}`,
    fullArt: heroAnimations[id][0].toDataURL(),
    detail: `${starLine(id)}<b>특성 「${h.trait}」</b> ${h.traitDesc(level)}<br><b>교체 기술 「${h.tag}」</b> ${h.tagDesc}`,
    onPick: () => {
      G.state.formation[slot] = id;
      if (slot === 1) G.state.active = 0;
      done('formation', slot);
    },
  };
}
export function openFormation(slot) {
  const ids = [...HERO_IDS]
    .filter(id => slot === 0 || id !== G.state.formation[0])
    // owned heroes first, then the ones that fit this road (the sort is stable, so ties keep the roster order)
    .sort(
      (a, b) =>
        Number(heroOwned(b)) - Number(heroOwned(a)) ||
        Number(HEROES[b].terrain === G.state.course) - Number(HEROES[a].terrain === G.state.course),
    );
  openChoice({
    confirm: (slot === 0 ? '출전으로' : '대기로') + ' 선택',
    eyebrow: '편대 편성 · ' + (slot + 1) + ' / 2',
    title: slot === 0 ? '출전' : '대기',
    sub:
      slot === 0
        ? '먼저 나설 고수를 고른다. 얻은 기술은 편대가 함께 쓴다.'
        : '교체로 들어올 고수를 고른다. 교체 버튼으로 바꾼다. 맞은 직후나 보스의 빈틈에 바꾸면 교체 기술이 두 배로 강해진다.',
    cards: ids.map(id => heroCard(id, slot)),
  });
}
