import { G } from '../core/context';
import { coinImage, skillImage } from '../core/assets';
import { chime } from '../core/audio';
import { josa } from '../core/math';
import { BR } from '../data/branches';
import { ARTS, SKILLS, skillLines } from '../data/skills';
import { TUNE } from '../data/tune';
import { resetCallout } from '../render/callout';
import { label } from '../render/fx';
import { openChoice } from './choice';
import { learn } from '../systems/abilities';
import { region } from '../systems/flow';
import { done } from '../systems/scene-flow';

export function openTuhak() {
  const r = region(),
    art = ARTS[r.type],
    cards = [],
    finish = () => done('tuhak');
  for (const s of G.state.skills) {
    const d = SKILLS[s.id];
    if (d.trig === 'passive' || s.mod) continue;
    cards.push({
      image: skillImage(s.id),
      artClass: 'skill-choice-art',
      color: BR[d.br].color,
      tag: '지닌 기술 강화',
      title: d.name,
      stars: 2,
      starsFrom: true,
      desc: skillLines(s.id, r.type),
      footer: art.from + '의 「' + art.name + '」을 더한다',
      onPick: () => {
        s.mod = r.type;
        resetCallout(s);
        label(d.name + ' ★★ 강화', 240, 400, '#ffd77a', 22);
        finish();
      },
    });
  }
  const upgradable = cards.length > 0;
  if (!G.state.skills.length)
    cards.push({
      image: skillImage(art.solo),
      artClass: 'skill-choice-art',
      color: BR.art.color,
      tag: '새 기술 · 강화할 기술이 없어 그대로 배운다',
      title: art.name,
      stars: 1,
      desc: skillLines(art.solo),
      onPick: () => {
        learn(art.solo);
        finish();
      },
    });
  cards.push({
    image: coinImage(),
    artClass: 'skill-choice-art',
    color: '#ffd77a',
    tag: '엽전 · 기술 대신 노자를 챙긴다',
    title: '엽전 ' + TUNE.tuhakCoins + '냥',
    desc: art.from + '의 전대를 털어 엽전을 얻는다. 다음 객잔에서 쓴다.<br><b>지닌 엽전:</b> ' + G.state.coins + '냥',
    onPick: () => {
      G.state.coins += TUNE.tuhakCoins;
      label('엽전 +' + TUNE.tuhakCoins, 240, 400, '#ffd77a', 22);
      chime();
      finish();
    },
  });
  openChoice({
    eyebrow: '보스 기술 · ' + art.from,
    title: '보스 기술',
    reward: true,
    sub:
      josa(art.from, '을', '를') +
      ' 쓰러뜨리며 그 기술 「' +
      art.name +
      '」을 엿보았다. ' +
      (upgradable
        ? '지닌 기술 하나를 골라 ★★로 강화하거나, 기술 대신 엽전을 챙긴다.'
        : !G.state.skills.length
          ? '새 기술로 배우거나, 기술 대신 엽전을 챙긴다.'
          : '지금 지닌 기술에는 더할 수 없어 엽전을 챙긴다.'),
    cards,
  });
}
