import { G } from '../core/context';
import { coinImage, skillImage } from '../core/assets';
import { chime } from '../core/audio';
import { josa } from '../core/math';
import { BR } from '../data/branches';
import { ARTS, SKILLS } from '../data/skills';
import { TUNE } from '../data/tune';
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
      tag: '강화 · 지닌 기술에 효과를 더한다',
      title: d.name + ' + ' + art.name,
      desc: art.combo,
      footer: '지닌 기술 「' + d.name + '」 강화',
      onPick: () => {
        s.mod = r.type;
        label('강화 · ' + d.name + ' + ' + art.name, 240, 400, BR.art.color, 20);
        finish();
      },
    });
  }
  if (!G.state.skills.length)
    cards.push({
      image: skillImage(art.solo),
      artClass: 'skill-choice-art',
      color: BR.art.color,
      tag: '새로 배우기 · 강화할 기술이 없어 그대로 배운다',
      title: art.name,
      desc: SKILLS[art.solo].desc,
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
      '」을 엿보았다. 새로 배우거나 지닌 기술을 강화한다. 기술 대신 엽전을 챙길 수도 있다.',
    cards,
  });
}
