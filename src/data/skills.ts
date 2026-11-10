import { G } from '../core/context';
import { rnd } from '../core/math';
import { BR } from './branches';
import { nearestEnemy, strongestEnemy } from '../entities/enemies';
import { label, paintFX, ring } from '../render/fx';
import { D, aoe, clearBullets, column, fan, fireShot } from '../systems/combat';

// D() is the damage of one basic shot. A skill's projectile is a reward for meeting its condition, so each one
// hits at least twice as hard as a basic shot (see docs/terms.md).
export const SKILLS = {
  janyoung: {
    br: 'yu',
    name: '잔영검',
    effect: '잔상이 검기 2발 발사',
    trig: 'step',
    cd: 0.22,
    fx: d => {
      for (const o of [-9, 9]) fireShot(d.x + o, G.player.y - 25, 0, D() * 2.2, { kind: 'qi', color: BR.yu.color });
    },
  },
  yusu: {
    br: 'yu',
    name: '유수파',
    effect: '그 자리에 청기 파동',
    trig: 'graze',
    cd: 0.12,
    fx: d => aoe(d.x, d.y - 20, 80, D() * 3.5, BR.yu.color),
  },
  biyeon: { br: 'yu', name: '비연보', effect: '스침 판정이 넓어지고, 스친 탄이 절반 속도로 느려짐', trig: 'passive' },
  muyoung: {
    br: 'yu',
    name: '무영신법',
    effect: '0.3초간 몸이 사라져 무적',
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
    effect: '몸 주위를 도는 비검 생성 (최대 3자루, 탄을 막음)',
    cond: '움직이는 동안',
    trig: 'passive',
  },
  bungsan: {
    br: 'gang',
    name: '붕산권',
    effect: '그 자리에 충격파',
    trig: 'nearKill',
    cd: 0.1,
    fx: d => aoe(d.e.x, d.e.y, 95, D() * 5, BR.gang.color),
  },
  pajin: {
    br: 'gang',
    name: '파진검강',
    effect: '관통 검강 발사',
    trig: 'rowClear',
    cd: 0.2,
    fx: () =>
      fireShot(G.player.x, G.player.y - 40, 0, D() * 8, { kind: 'gang', pierce: true, w: 16, color: BR.gang.color }),
  },
  cheolgol: {
    br: 'gang',
    name: '철골',
    effect: '최대 체력 +1, 즉시 1 회복',
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
    effect: '관통 대검기 3줄기 발사',
    trig: 'combo10',
    cd: 0.2,
    fx: () => {
      for (const vx of [-170, 0, 170])
        fireShot(G.player.x, G.player.y - 40, vx, D() * 4, { kind: 'gang', pierce: true, w: 9, color: BR.gang.color });
    },
  },
  swaegap: { br: 'gang', name: '쇄갑', effect: '바위·장갑 적·보스에게 주는 피해 +40%', trig: 'passive' },
  chukgi: { br: 'gi', name: '축기', effect: '필살기 충전량 +50%', trig: 'passive' },
  geomu: {
    br: 'gi',
    name: '검우',
    effect: '1.5초간 검의 비',
    trig: 'blast',
    fx: () => {
      G.state.rain = 1.5;
      G.state.rainTimer = 0;
    },
  },
  manryu: {
    br: 'gi',
    name: '만류귀종',
    effect: '필살기 최대 횟수 +1, 즉시 1회 충전',
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
    effect: '추적 기탄 발사',
    cond: '필살기를 2회 이상 모았을 때 0.85초마다',
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
    effect: '체력 1 회복 (관문당 1회)',
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
    effect: '스친 탄을 추적탄으로 되돌려 보냄',
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
    effect: '2초간 무아지경',
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
    effect: '짧은 무적과 큰 충격파',
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
    effect: '비도 3자루를 부채꼴로 투척',
    trig: 'step',
    cd: 0.26,
    fx: () => {
      fan(3, 0.32, D() * 3, '#bdf7ea', 'knife', 'mancheon');
    },
  },
  hoechun: {
    br: 'gi',
    npc: 'yakseon',
    name: '회춘단',
    effect: '관문마다 첫 피격 무효, 필살기 +1회',
    trig: 'passive',
    gain: () => {
      G.state.negate = true;
    },
  },
  uihyeop: {
    br: 'gang',
    npc: 'uijeok',
    name: '의협난도',
    effect: '5방향 관통 도기 발사',
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
    effect: '7방향 도기 발사',
    trig: 'tick',
    cd: 1.4,
    fx: () => fan(7, 0.2, D() * 2.5, '#ffc179', 'knife', 'dobeop'),
  },
  art_cheolgap: {
    br: 'art',
    name: '철갑공',
    effect: '피격 1회를 막는 보호막 생성',
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
    effect: '가장 강한 적에게 천마 검강',
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
    plus: '5방향 도기 추가',
    fx: () => fan(5, 0.24, D() * 2, '#ffc179', 'knife', 'dobeop'),
  },
  6: {
    name: '철갑공',
    from: '철갑 권승',
    solo: 'art_cheolgap',
    plus: '0.5초 무적, 주변 탄 제거',
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
    plus: '가까운 적에게 천마 검강 추가',
    fx: () => {
      const e = nearestEnemy(G.player.x, G.player.y);
      if (e) column(e.x, D() * 6, '#f6bc83', 30, 'cheonma');
    },
  },
};

/** When a skill goes off, in the player's words (the 발동 line on cards). */
const WHEN = {
  step: '좌우 전환할 때',
  graze: '적이나 탄을 스칠 때',
  nearKill: '근접 처치할 때',
  rowClear: '한 줄을 전멸시킬 때',
  combo10: '연속 10회 처치마다',
  blast: '필살기를 쓸 때',
  passive: '항상',
};
export function skillWhen(id: string): string {
  const d = SKILLS[id];
  return d.cond || (d.trig === 'tick' ? d.cd + '초마다' : WHEN[d.trig]);
}
/** ★ for a skill as learned, ★★ once a boss skill has been added to it. */
export function skillStars(mod?: unknown): string {
  return mod ? '★★' : '★';
}
/** The fixed three lines of a skill card: 발동 (when), 효과 (what), and the ★★ addition if there is one. */
export function skillLines(id: string, mod?: string | number): string {
  const row = (k: string, v: string, cls = '') => `<span class="skill-line${cls}"><b>${k}</b>${v}</span>`;
  return (
    row('발동', skillWhen(id)) +
    row('효과', SKILLS[id].effect) +
    (mod ? row('★★ 강화', '발동할 때마다 ' + ARTS[mod].plus, ' plus') : '')
  );
}
