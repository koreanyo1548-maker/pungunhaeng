import { G } from '../core/context';
import { rnd } from '../core/math';
import { BR } from './branches';
import { nearestEnemy, strongestEnemy } from '../entities/enemies';
import { label, paintFX, ring } from '../render/fx';
import { D, aoe, clearBullets, column, fan, fireShot } from '../systems/combat';

export const SKILLS = {
  janyoung: {
    br: 'yu',
    name: '잔영검',
    desc: '좌우 전환할 때마다 잔상이 기본 공격 2발을 쏜다',
    trig: 'step',
    cd: 0.22,
    fx: d => {
      for (const o of [-9, 9]) fireShot(d.x + o, G.player.y - 25, 0, D() * 1.1, { kind: 'qi', color: BR.yu.color });
    },
  },
  yusu: {
    br: 'yu',
    name: '유수파',
    desc: '적이나 적 탄을 스치면 그 자리에 청기 파동이 퍼진다',
    trig: 'graze',
    cd: 0.12,
    fx: d => aoe(d.x, d.y - 20, 80, D() * 3.5, BR.yu.color),
  },
  biyeon: { br: 'yu', name: '비연보', desc: '스침 판정이 넓어지고, 스친 탄은 절반 속도로 느려진다', trig: 'passive' },
  muyoung: {
    br: 'yu',
    name: '무영신법',
    desc: '좌우 전환하는 순간 0.3초간 몸이 사라진다',
    trig: 'step',
    cd: 1.1,
    fx: () => {
      G.player.inv = Math.max(G.player.inv, 0.3);
      ring(G.player.x, G.player.y, BR.yu.color, 6, 50, 0.25);
    },
  },
  hoeseon: {
    br: 'yu',
    name: '회선비검',
    desc: '움직인 거리만큼 몸 주위를 도는 비검이 생긴다 (최대 3자루, 탄을 막는다)',
    trig: 'passive',
  },
  bungsan: {
    br: 'gang',
    name: '붕산권',
    desc: '근접 처치한 자리에서 충격파가 터진다',
    trig: 'nearKill',
    cd: 0.1,
    fx: d => aoe(d.e.x, d.e.y, 95, D() * 5, BR.gang.color),
  },
  pajin: {
    br: 'gang',
    name: '파진검강',
    desc: '한 줄을 전멸시키면 관통 검강을 내지른다',
    trig: 'rowClear',
    cd: 0.2,
    fx: () =>
      fireShot(G.player.x, G.player.y - 40, 0, D() * 8, { kind: 'gang', pierce: true, w: 16, color: BR.gang.color }),
  },
  cheolgol: {
    br: 'gang',
    name: '철골',
    desc: '최대 체력 +1, 즉시 1 회복',
    trig: 'passive',
    gain: () => {
      G.player.maxHp++;
      G.player.hp++;
    },
    lose: () => {
      G.player.maxHp--;
      G.player.hp = Math.min(G.player.hp, G.player.maxHp);
    },
  },
  yeonhwan: {
    br: 'gang',
    name: '연환격',
    desc: '연속 10회 처치마다 관통 대검기 3줄기를 날린다',
    trig: 'combo10',
    cd: 0.2,
    fx: () => {
      for (const vx of [-170, 0, 170])
        fireShot(G.player.x, G.player.y - 40, vx, D() * 4, { kind: 'gang', pierce: true, w: 9, color: BR.gang.color });
    },
  },
  swaegap: { br: 'gang', name: '쇄갑', desc: '바위·장갑 적·보스에게 주는 피해 +40%', trig: 'passive' },
  chukgi: { br: 'gi', name: '축기', desc: '필살기 충전량 +50%', trig: 'passive' },
  geomu: {
    br: 'gi',
    name: '검우',
    desc: '필살기 사용 뒤 1.5초간 검의 비가 쏟아진다',
    trig: 'blast',
    fx: () => {
      G.state.rain = 1.5;
      G.state.rainTimer = 0;
    },
  },
  manryu: {
    br: 'gi',
    name: '만류귀종',
    desc: '필살기 최대 횟수 +1, 즉시 1회 충전',
    trig: 'passive',
    gain: () => {
      G.state.maxBombs++;
      G.state.bombs++;
    },
    lose: () => {
      G.state.maxBombs--;
      G.state.bombs = Math.min(G.state.bombs, G.state.maxBombs);
    },
  },
  gitan: {
    br: 'gi',
    name: '기탄',
    desc: '필살기를 2회 이상 모아 두면 추적 기탄을 자동으로 쏜다',
    trig: 'tick',
    cd: 0.85,
    when: () => G.state.bombs >= 2,
    fx: () =>
      fireShot(G.player.x, G.player.y - 30, rnd(-200, 200), D() * 2.4, {
        kind: 'orb',
        color: BR.gi.color,
        homing: true,
        vy: 650,
      }),
  },
  hoegi: {
    br: 'gi',
    name: '회기',
    desc: '필살기 사용 시 체력 1 회복 (관문당 1회)',
    trig: 'blast',
    fx: (d, s) => {
      if (s.used || G.player.hp >= G.player.maxHp) return;
      s.used = true;
      G.player.hp++;
      paintFX(7, G.player.x, G.player.y, 90, 0.45);
      label('회기 +1', G.player.x, G.player.y - 60, BR.gi.color, 20);
    },
  },
  // 사사(師事): 관계가 깊어진 인연만 전해 주는 고유 절기
  taeguk: {
    br: 'yu',
    npc: 'dosa',
    name: '태극운검',
    desc: '스친 탄과 기세를 되돌려 적에게 날려 보낸다',
    trig: 'graze',
    fx: d => {
      if (d.h) d.h.dead = true;
      fireShot(d.x, d.y, 0, D() * 3, { kind: 'orb', color: BR.yu.color, homing: true, vy: 700 });
    },
  },
  hyeolma: {
    br: 'gi',
    npc: 'milsa',
    name: '혈마해방',
    desc: '필살기 사용 뒤 2초간 무아지경에 든다',
    trig: 'blast',
    fx: () => {
      G.state.hyper = Math.max(G.state.hyper, 2);
      G.player.inv = Math.max(G.player.inv, 2.4);
    },
  },
  geumgang: {
    br: 'gang',
    npc: 'monk',
    name: '금강부동',
    desc: '근접 처치 시 짧은 무적과 큰 충격파',
    trig: 'nearKill',
    cd: 0.35,
    fx: d => {
      G.player.inv = Math.max(G.player.inv, 0.45);
      aoe(d.e.x, d.e.y, 140, D() * 7, '#ffd2a8');
    },
  },
  mancheon: {
    br: 'yu',
    npc: 'yeonhyeop',
    name: '만천화우',
    desc: '좌우 전환할 때마다 비도 3자루를 부채꼴로 던진다',
    trig: 'step',
    cd: 0.26,
    fx: () => {
      fan(3, 0.32, D() * 1.6, '#bdf7ea', 'knife', 'mancheon');
    },
  },
  hoechun: {
    br: 'gi',
    npc: 'yakseon',
    name: '회춘단',
    desc: '관문마다 첫 피격을 무효로 하고 필살기 1회를 얻는다',
    trig: 'passive',
    gain: () => {
      G.state.negate = true;
    },
  },
  uihyeop: {
    br: 'gang',
    npc: 'uijeok',
    name: '의협난도',
    desc: '한 줄을 전멸시키면 5방향 관통 도기를 날린다',
    trig: 'rowClear',
    cd: 0.2,
    fx: () => {
      for (const vx of [-320, -160, 0, 160, 320])
        fireShot(G.player.x, G.player.y - 40, vx, D() * 5, { kind: 'gang', pierce: true, w: 8, color: '#ffb38f' });
    },
  },
  // 투학(偸學) 변경·습득: 보스의 무공을 그대로 익힌다
  art_dobeop: {
    br: 'art',
    name: '녹림도법',
    desc: '1.4초마다 7방향 도기를 뿌린다',
    trig: 'tick',
    cd: 1.4,
    fx: () => fan(7, 0.2, D() * 1.6, '#ffc179', 'knife', 'dobeop'),
  },
  art_cheolgap: {
    br: 'art',
    name: '철갑공',
    desc: '피격 1회를 막는 보호막, 10초마다 재생',
    trig: 'tick',
    cd: 10,
    fx: () => {
      if (!G.player.shield) {
        G.player.shield = 1;
        ring(G.player.x, G.player.y, BR.art.color, 10, 70, 0.4);
      }
    },
  },
  art_cheonma: {
    br: 'art',
    name: '천마군림',
    desc: '3초마다 가장 강한 적에게 천마 검강을 내리꽂는다',
    trig: 'tick',
    cd: 3,
    fx: () => {
      const e = strongestEnemy();
      if (e) column(e.x, D() * 9, '#f6bc83', 36, 'cheonma');
    },
  },
};
export const ARTS = {
  3: {
    name: '녹림도법',
    from: '녹림 채주',
    solo: 'art_dobeop',
    combo: '발동할 때마다 5방향 도기를 함께 뿌린다',
    fx: () => fan(5, 0.24, D() * 1.3, '#ffc179', 'knife', 'dobeop'),
  },
  6: {
    name: '철갑공',
    from: '철갑 권승',
    solo: 'art_cheolgap',
    combo: '발동할 때마다 0.5초 무적, 주변 탄을 지운다',
    fx: () => {
      G.player.inv = Math.max(G.player.inv, 0.5);
      clearBullets(G.player.x, G.player.y, 95);
      ring(G.player.x, G.player.y, BR.art.color, 8, 95, 0.3);
    },
  },
  7: {
    name: '천마군림',
    from: '천마 교주',
    solo: 'art_cheonma',
    combo: '발동할 때마다 가까운 적에게 천마 검강이 떨어진다',
    fx: () => {
      const e = nearestEnemy(G.player.x, G.player.y);
      if (e) column(e.x, D() * 6, '#f6bc83', 30, 'cheonma');
    },
  },
};
