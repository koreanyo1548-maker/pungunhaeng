import strike from '../assets/icons/strike.svg';
import dodge from '../assets/icons/dodge.svg';
import energy from '../assets/icons/energy.svg';
import { done } from '../systems/scene-flow';
import { G } from '../core/context';
import { heroPictures, heroAnimations } from '../core/assets';
import { COURSES } from '../data/courses';
import { profile } from '../core/profile';
import { HEROES } from '../data/heroes';
import { MASTERY_MAX, MASTERY_STEPS, UNLOCKS, masteryLevel, masteryStars } from '../data/meta';
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
/** "★★☆☆☆ 숙련 2단계 · 다음 단계까지 관문 3개" for a hero's mastery (gates cleared while in the formation). */
export function masteryLine(id) {
  const mastery = profile.heroes[id].mastery,
    level = masteryLevel(mastery);
  const next = level >= MASTERY_MAX ? '최고 단계' : `다음 단계까지 관문 ${MASTERY_STEPS[level + 1] - mastery}개`;
  return `<span class="mastery"><i class="stars">${masteryStars(level)}</i> 숙련 ${level + 1}단계 · ${next}</span>`;
}
/** "땅의 길 관문 2 돌파 (1 / 2)" for a hero not yet owned. */
export function unlockLine(id) {
  const u = UNLOCKS[id];
  if (!u) return '';
  const [now, goal] = u.progress(profile.records);
  return `${u.text} <i>(${now} / ${goal})</i>`;
}
export function heroCard(id, slot) {
  const h = HEROES[id],
    ok = h.terrain === G.state.course,
    locked = !profile.heroes[id].owned,
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
      detail: `<b>합류 조건</b> ${unlockLine(id)}<br><b>특성 「${h.trait}」</b> ${h.traitDesc(0)}<br><b>교체 기술 「${h.tag}」</b> ${h.tagDesc}`,
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
    detail: `${masteryLine(id)}<b>특성 「${h.trait}」</b> ${h.traitDesc(level)}<br><b>교체 기술 「${h.tag}」</b> ${h.tagDesc}`,
    onPick: () => {
      G.state.formation[slot] = id;
      if (slot === 1) G.state.active = 0;
      done('formation', slot);
    },
  };
}
export function openFormation(slot) {
  const ids = Object.keys(HEROES)
    .filter(id => slot === 0 || id !== G.state.formation[0])
    // owned heroes first, then the ones that fit this road (the sort is stable, so ties keep the roster order)
    .sort(
      (a, b) =>
        Number(profile.heroes[b].owned) - Number(profile.heroes[a].owned) ||
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
