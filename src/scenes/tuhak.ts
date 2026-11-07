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
import { nextStage, region } from '../systems/flow';

export function openTuhak() {
  const r = region(),
    art = ARTS[r.type],
    cards = [],
    finish = () => {
      G.mode = 'play';
      nextStage();
    };
  for (const s of G.state.skills) {
    const d = SKILLS[s.id];
    if (d.trig === 'passive' || s.mod) continue;
    cards.push({
      image: skillImage(s.id),
      artClass: 'skill-choice-art',
      color: BR[d.br].color,
      tag: '조합 · 지닌 깨달음에 섞는다',
      title: d.name + ' + ' + art.name,
      desc: d.desc + '.<br><b>더해짐:</b> ' + art.combo,
      onPick: () => {
        s.mod = r.type;
        label('조합 · ' + d.name + ' + ' + art.name, 240, 400, BR.art.color, 20);
        finish();
      },
    });
  }
  if (!G.state.skills.length)
    cards.push({
      image: skillImage(art.solo),
      artClass: 'skill-choice-art',
      color: BR.art.color,
      tag: '습득 · 지닌 깨달음이 없어 그대로 익힌다',
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
    tag: '재화 · 무공 대신 노자를 챙긴다',
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
    eyebrow: '偸學 · ' + art.from + '의 무공',
    title: '투학',
    sub:
      josa(art.from, '을', '를') +
      ' 쓰러뜨리며 그 무공 「' +
      art.name +
      '」을 엿보았다. 지닌 깨달음에 섞거나, 무공 대신 엽전을 챙긴다.',
    cards,
  });
}
