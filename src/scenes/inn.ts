import { isFinal } from '../systems/run-plan';
import { done } from '../systems/scene-flow';
import { G } from '../core/context';
import { npcPictures, skillPictures } from '../core/assets';
import { chime } from '../core/audio';
import { josa, josaRo } from '../core/math';
import { NPCS, NPC_LINK } from '../data/npcs';
import { TUNE } from '../data/tune';
import { openChoice } from './choice';
import { hasCard, nextNpcOf } from '../systems/relationship';

export function innAlternative() {
  const last = G.state.path[G.state.path.length - 1];
  if (!last || !last.npc || isFinal()) return null;
  const cur = last.result === '미달' ? last.npc : nextNpcOf(last.npc, last.mode);
  const alt =
    last.result === '미달' ? NPC_LINK[last.npc] : nextNpcOf(last.npc, last.mode === 'follow' ? 'defy' : 'follow');
  // only an 인연 with a card can be sought out
  return alt && alt !== cur && hasCard(alt) ? { cur, alt } : null;
}
export function openInn() {
  const alt = innAlternative(),
    c = G.state.coins;
  const items = [
    {
      title: '약주와 휴식',
      desc: '체력 +1',
      image: skillPictures[11],
      cost: TUNE.innHeal,
      ok: G.player.hp < G.player.maxHp,
      buy: () => {
        G.player.hp++;
      },
    },
    {
      title: '필살 단약',
      desc: '필살기 +1회',
      image: skillPictures[8],
      cost: TUNE.innQi,
      ok: G.state.bombs < G.state.maxBombs,
      buy: () => {
        G.state.bombs++;
        if (G.state.bombs >= G.state.maxBombs) G.state.charge = 100;
      },
    },
    {
      title: '명상',
      desc: '다음 기술 선택지가 3개로 늘어난다',
      image: skillPictures[15],
      cost: TUNE.innMeditate,
      done: G.state.meditate,
      ok: !G.state.meditate && !isFinal(),
      buy: () => {
        G.state.meditate = true;
      },
    },
    alt && {
      title: '수소문',
      desc: hasCard(alt.cur)
        ? '다음 인연을 ' + NPCS[alt.cur].name + ' 대신 ' + josaRo(NPCS[alt.alt].name) + ' 바꾼다'
        : '행인 대신 ' + josa(NPCS[alt.alt].name, '을', '를') + ' 만난다',
      image: npcPictures[alt.alt],
      cost: TUNE.innScout,
      done: G.state.forceNpc === alt.alt,
      ok: G.state.forceNpc !== alt.alt,
      buy: () => {
        G.state.forceNpc = alt.alt;
      },
    },
  ].filter(Boolean);
  openChoice({
    eyebrow: '관문 ' + (G.state.stage - 1) + ' 돌파 후 · 객잔',
    title: '객잔',
    sub: '지닌 엽전 <b style="color:#ffd77a">' + c + '냥</b>. 필요한 것을 사고 길을 나선다.',
    cards: [
      ...items.map(it => ({
        image: it.image,
        artClass: 'skill-choice-art',
        color: '#ffd77a',
        tag:
          it.cost + '냥' + (it.done ? ' · 구매함' : !it.ok ? ' · 지금은 필요 없음' : c < it.cost ? ' · 엽전 부족' : ''),
        title: it.title,
        desc: it.desc,
        disabled: !it.ok || c < it.cost,
        onPick: () => {
          G.state.coins -= it.cost;
          it.buy();
          G.state.spent = (G.state.spent || 0) + it.cost;
          chime();
          openInn();
        },
      })),
      {
        color: '#a6c8bf',
        tag: '출발',
        title: '길을 나선다',
        desc: isFinal() ? '최종 관문으로 향한다' : '다음 인연을 만나러 간다',
        onPick: () => done('inn'),
      },
    ],
  });
}
