import { done } from '../systems/scene-flow';
import { G } from '../core/context';
import { heroPictures } from '../core/assets';
import { COURSES } from '../data/courses';
import { HEROES } from '../data/heroes';
import { openChoice } from './choice';

export function openCourseSelect() {
  openChoice({
    eyebrow: '스테이지 모드',
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
export function heroCard(id, slot) {
  const h = HEROES[id],
    ok = h.terrain === G.state.course;
  return {
    image: heroPictures[id],
    artClass: 'hero-choice-art',
    color: h.color,
    tag: (h.terrain === 'ground' ? '땅' : '하늘') + '의 고수' + (ok ? ' · 이 길에 맞음' : ' · 이 길에서는 특성 미발동'),
    title: h.name,
    desc: `<b>특성 「${h.trait}」</b> ${h.traitDesc}<br><b>교대 초식 「${h.tag}」</b> ${h.tagDesc}`,
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
    .sort((a, b) => Number(HEROES[b].terrain === G.state.course) - Number(HEROES[a].terrain === G.state.course));
  openChoice({
    eyebrow: '편대 편성 · ' + (slot + 1) + ' / 2',
    title: slot === 0 ? '선봉' : '후위',
    sub:
      slot === 0
        ? '먼저 나설 고수를 고른다. 깨달음과 무공은 편대가 함께 나눈다.'
        : '교대로 들어올 고수를 고른다. <b>Q · Shift</b> 또는 교대 버튼으로 바꾼다. 맞은 직후나 보스의 빈틈에 바꾸면 교대 초식이 두 배로 강해진다.',
    cards: ids.map(id => heroCard(id, slot)),
  });
}
