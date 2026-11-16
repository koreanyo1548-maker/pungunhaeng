import type { Cell, NpcId } from './roster';

// 인연 (docs/ability-redesign-plan.md, 4.3–4.6). Each 인연 belongs to a side of the 선·악 저울 (정파 good, 사파
// evil) and is unlocked when the scale reaches `unlock` on that side. Meeting them brings an 의뢰; following it
// and succeeding raises the 인연 one level (1단계 a number, 2단계 a projectile skill, 3단계 their signature skill).
// `levels` are the skill ids of those levels (data/skills.ts). `br` only colours their screens.
export type Side = 'good' | 'evil';
export const SIDE_NAME: Record<Side, string> = { good: '정파', evil: '사파' };

export const NPCS = {
  dosa: {
    art: { sheet: 'npc-portraits', col: 0, row: 0 },
    name: '청운 도인',
    title: '구름을 따라 떠도는 도사',
    br: 'yu',
    side: 'good' as Side,
    unlock: 3,
    levels: ['biyeon', 'yusu', 'taeguk'],
    quests: [
      {
        say: '바람을 거스르지 말게.',
        follow: { t: 'graze', n: 24 },
        defy: { t: 'nearKill', n: 22, say: '바람째 베어 버리겠소.' },
      },
      {
        say: '물처럼 흐르게. 막히면 돌아가면 그만이네.',
        follow: { t: 'step', n: 90 },
        defy: { t: 'combo', n: 40, say: '물길은 단숨에 뚫는 법이오.' },
      },
    ],
  },
  milsa: {
    art: { sheet: 'npc-portraits', col: 1, row: 0 },
    name: '혈마 밀사',
    title: '천마신교의 그림자',
    br: 'gi',
    side: 'evil' as Side,
    unlock: 5,
    levels: ['manryu', 'geomu', 'art_cheonma'],
    quests: [
      {
        say: '피를 두려워 마라. 한 줄씩 쓸어 버려라.',
        follow: { t: 'rowClear', n: 4 },
        defy: { t: 'graze', n: 24, say: '살기는 흘려보내겠소.' },
      },
      {
        say: '숨 돌릴 틈 없이 베어라. 피가 끓을 때까지.',
        follow: { t: 'combo', n: 40 },
        defy: { t: 'step', n: 90, say: '물러설 줄 아는 것도 검이오.' },
      },
    ],
  },
  monk: {
    art: { sheet: 'npc-portraits', col: 2, row: 0 },
    name: '철벽 노승',
    title: '산문을 지키는 노승',
    br: 'gang',
    side: 'good' as Side,
    unlock: 5,
    levels: ['swaegap', 'bungsan', 'art_cheolgap'],
    quests: [
      {
        say: '한 걸음도 물러서지 마시게.',
        follow: { t: 'nearKill', n: 24 },
        defy: { t: 'step', n: 90, say: '물러서는 것도 보법이오.' },
      },
      {
        say: '끊김 없이 이어 가시게.',
        follow: { t: 'combo', n: 40 },
        defy: { t: 'graze', n: 24, say: '흘려 넘기는 것도 버팀이오.' },
      },
    ],
  },
  yeonhyeop: {
    art: { sheet: 'npc-portraits', col: 0, row: 1 },
    name: '비연 낭자',
    title: '암기를 쓰는 여협',
    br: 'yu',
    side: 'evil' as Side,
    unlock: 1,
    levels: ['muyoung', 'janyoung', 'mancheon'],
    quests: [
      {
        say: '발끝으로 춤춰 봐요. 서 있으면 죽어요.',
        follow: { t: 'step', n: 90 },
        defy: { t: 'rowClear', n: 4, say: '한 줄씩 끝내겠소.' },
      },
      {
        say: '칼날 사이로 지나가 봐요.',
        follow: { t: 'graze', n: 26 },
        defy: { t: 'combo', n: 40, say: '칼날보다 빨리 베겠소.' },
      },
    ],
  },
  yakseon: {
    art: { sheet: 'npc-portraits', col: 1, row: 1 },
    name: '떠돌이 약선',
    title: '산을 떠도는 의원',
    br: 'gi',
    side: 'good' as Side,
    unlock: 1,
    levels: ['cheolgol', 'gitan', 'hoechun'],
    quests: [
      {
        say: '독은 피하는 것이 약이네.',
        follow: { t: 'graze', n: 24 },
        defy: { t: 'nearKill', n: 22, say: '독은 맞서 베겠소.' },
      },
      {
        say: '발을 가볍게 놀려 기혈을 돌려 보게.',
        follow: { t: 'step', n: 90 },
        defy: { t: 'rowClear', n: 4, say: '몸으로 익히겠소.' },
      },
    ],
  },
  uijeok: {
    art: { sheet: 'npc-portraits', col: 2, row: 1 },
    name: '녹림 의적',
    title: '채주를 등진 산적',
    br: 'gang',
    side: 'evil' as Side,
    unlock: 3,
    levels: ['yeonhwan', 'uihyeop', 'art_dobeop'],
    quests: [
      {
        say: '한 놈도 놓치지 마라.',
        follow: { t: 'rowClear', n: 4 },
        defy: { t: 'graze', n: 24, say: '싸우지 않고 지나가겠소.' },
      },
      {
        say: '붙어서 베어라. 멀리서 쏘는 건 겁쟁이다.',
        follow: { t: 'nearKill', n: 24 },
        defy: { t: 'combo', n: 40, say: '끊김 없이 베어 증명하겠소.' },
      },
    ],
  },
} satisfies Record<
  NpcId,
  { name: string; side: Side; unlock: number; levels: string[]; art: Cell; [key: string]: unknown }
>;
