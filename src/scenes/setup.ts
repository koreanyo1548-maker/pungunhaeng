import strike from '../assets/icons/strike.svg';
import dodge from '../assets/icons/dodge.svg';
import energy from '../assets/icons/energy.svg';
import { done } from '../systems/scene-flow';
import { G } from '../core/context';
import { heroPictures, heroAnimations } from '../core/assets';
import { STAGES } from '../data/stages';
import { fmt } from '../core/math';
import { heroOwned, profile } from '../core/profile';
import { HEROES } from '../data/heroes';
import { HERO_IDS, LEVEL_MAX, PIECE_STEPS, pieceLevel, starText } from '../data/meta';
import type { HeroId } from '../data/meta';
import { openChoice } from './choice';

/** Stage select: six stages opened in order; beating a stage's boss opens the next (profile.stages). */
export function openStageSelect() {
  openChoice({
    eyebrow: '스테이지',
    title: '어디로 갈까',
    sub: '보스를 잡으면 다음 스테이지가 열린다. 적을 처치해 게이지를 채우면 인연이나 행인을 만난다.',
    cards: STAGES.map((st, i) => {
      const n = i + 1,
        locked = n > profile.stages;
      return {
        color: st.color,
        disabled: locked,
        tag: locked ? `잠김 · S${n - 1} 보스를 잡으면 열림` : `S${n} · ${st.world === 2 ? '하늘' : '땅'}`,
        title: st.name,
        desc: `보스 <b>${st.boss}</b> · ${fmt(st.distance)}m<br>${st.hint}`,
        onPick: () => done('stageSelect', n),
      };
    }),
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
/** "특성 「질풍」 근접 처치 시 …" with its scope; a trait that waits for a later step says so. */
export function traitText(id: HeroId, L: number) {
  const t = HEROES[id].trait;
  return `<b>특성 「${t.name}」</b> ${t.desc(L)}${t.pending ? ` <i>(${t.pending})</i>` : ''}`;
}
/** "등장 기술 「불굴」 15초 · …": what the hero does when entering as the second of the party. */
export function entryText(id: HeroId, L: number) {
  const e = HEROES[id].entry,
    s = e.seconds(L);
  return `<b>등장 기술 「${e.name}」</b> ${s ? s + '초 · ' : ''}${e.desc(L)}`;
}
const scopeLabel = (id: HeroId) => (HEROES[id].trait.scope === 'party' ? '지원 · 편대 전체' : '싸우는 동안');
export function heroCard(id: HeroId, slot: number) {
  const h = HEROES[id],
    locked = !heroOwned(id),
    level = G.state.meta.heroes[id];
  if (locked)
    return {
      image: heroPictures[id],
      artClass: 'hero-choice-art',
      color: h.color,
      locked: true,
      tag: '잠김 · ' + h.projectile,
      title: h.name,
      fullArt: heroAnimations[id][0].toDataURL(),
      detail: `<b>합류</b> ${LOCKED_HOW}<br>${traitText(id, 0)}<br>${entryText(id, 0)}`,
      onPick: () => {},
    };
  return {
    image: heroPictures[id],
    artClass: 'hero-choice-art',
    color: h.color,
    tag: h.projectile + ' · 특성 ' + scopeLabel(id),
    title: h.name,
    desc: `<span class="hero-role"><img alt="" src="${h.trait.scope === 'party' ? energy : strike}">${h.trait.scope === 'party' ? '지원' : '특성'}</span>${h.trait.desc(level)}`,
    fullArt: heroAnimations[id][0].toDataURL(),
    detail: `${starLine(id)}${traitText(id, level)}<br>${entryText(id, level)}`,
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
    // owned heroes first (the sort is stable, so ties keep the roster order)
    .sort((a, b) => Number(heroOwned(b)) - Number(heroOwned(a)));
  openChoice({
    confirm: (slot === 0 ? '선봉으로' : '후발로') + ' 선택',
    eyebrow: '편대 편성 · ' + (slot + 1) + ' / 2',
    title: slot === 0 ? '선봉' : '후발',
    sub:
      slot === 0
        ? '먼저 싸울 고수를 고른다. 특성은 싸우는 동안 켜진다. 각 영웅은 체력 1로 시작하고, 인연에게 얻은 기술은 편대가 함께 쓴다.'
        : '선봉이 쓰러지면 나설 고수를 고른다. 나서는 순간 등장 기술이 펼쳐진다. 지원형의 특성은 대기 중에도 편대 전체에 켜진다.',
    cards: ids.map(id => heroCard(id, slot)),
  });
}
