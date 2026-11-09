import { done } from '../systems/scene-flow';
import { G } from '../core/context';
import { skillImage } from '../core/assets';
import { rnd } from '../core/math';
import { BR, TRIG_NAME } from '../data/branches';
import { NPCS } from '../data/npcs';
import { SKILLS } from '../data/skills';
import { TUNE } from '../data/tune';
import { openChoice } from './choice';
import { learn } from '../systems/abilities';

export function openDono() {
  const q = G.state.quest,
    n = NPCS[q.npc],
    owned = new Set(G.state.skills.map(s => s.id));
  const pool = Object.keys(SKILLS).filter(id => SKILLS[id].br === q.br && !SKILLS[id].npc && !owned.has(id)),
    opts = [];
  const sasa = q.mode === 'follow' && (G.state.rel[q.npc] || 0) >= TUNE.sasaRel && !owned.has(n.unique);
  if (sasa) opts.push(n.unique);
  const want = G.state.meditate ? 3 : 2;
  G.state.meditate = false;
  while (opts.length < want && pool.length) opts.push(pool.splice(Math.floor(rnd(0, pool.length)), 1)[0]);
  if (!opts.length) {
    done('dono');
    return;
  }
  openChoice({
    eyebrow: '의뢰 성공 · ' + BR[q.br].name + ' 계열',
    title: '기술 선택',
    reward: true,
    sub: sasa
      ? n.name + '이(가) 그대를 제자로 받아들였다. <b>인연의 고유 기술</b>을 전수받을 수 있다.'
      : '의뢰를 이뤘다. 기술 하나를 골라 배운다.',
    cards: opts.map(id => {
      const d = SKILLS[id];
      return {
        image: skillImage(id),
        artClass: 'skill-choice-art',
        color: BR[d.br].color,
        tag: d.npc ? '전수 · ' + NPCS[d.npc].name + '의 고유 기술' : BR[d.br].name + ' 계열 · ' + TRIG_NAME[d.trig],
        title: d.name,
        desc: d.desc,
        footer: d.npc ? '인연의 고유 기술' : '새 기술 · ' + TRIG_NAME[d.trig],
        onPick: () => {
          learn(id);
          done('dono');
        },
      };
    }),
  });
}
