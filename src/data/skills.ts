import { changePartyMaxHealth } from '../core/hero-health';
import { G } from '../core/context';
import { rnd } from '../core/math';
import { BR } from './branches';
import { strongestEnemy } from '../entities/enemies';
import { ring } from '../render/fx';
import { D, aoe, column, fan, fireShot } from '../systems/combat';
import { cardRank } from '../systems/relationship';
import { hasSkill } from '../systems/skill-state';

// 인연 단계 skills (docs/ability-redesign-plan.md, 4.6). Each 인연 has two, one per level (data/npcs.ts `levels`):
// 1단계 a projectile skill, 2단계 their signature skill (the three boss skills moved here). They are learned in a
// run when the 인연's 의뢰 is met, and last for that run. (2026-11: the old 1단계 number skills were removed; the old
// 2단계 and 3단계 are now 1단계 and 2단계.)
// An 인연 card raises the numbers: every card level above 1 adds a step (`r - 1`, 0 to 4), read from the
// run's snapshot. All numbers are provisional (balance pass).
// D() is the damage of one basic shot; a skill's projectile hits at least twice as hard (see docs/terms.md).

/** damage multiplier an 인연 card gives that 인연's skills: +10% per card level above 1 */
export const cardBoost = (npc: string, r = cardRank(npc)) => 1 + 0.1 * Math.max(0, r - 1);
const pct = (n: number) => Math.round(n * 100) + '%';
const plusPct = (n: number) => '+' + Math.round((n - 1) * 100) + '%';

// ---- timers that a card shortens or lengthens
/** 회춘단: seconds between blocks */
export const hoechunCooldown = (r = cardRank('yakseon')) => 30 - 2 * Math.max(0, r - 1);
/** how long the player is safe after 회춘단 blocks a hit */
export const hoechunSeconds = () => 1.3;
const cheolgapCooldown = (r = cardRank('monk')) => 10 - 0.5 * Math.max(0, r - 1);
/** How long 검우's rain of swords lasts, in seconds. */
export const rainSeconds = (r = cardRank('milsa')) => 1.5 + 0.25 * Math.max(0, r - 1);

export interface SkillDef {
  npc: string;
  /** 1 or 2: the 인연 단계 that gives it */
  level: number;
  br: string;
  name: string;
  /** what it does, worded for an 인연 card level */
  effect: (r: number) => string;
  trig: 'passive' | 'tick' | 'step' | 'graze' | 'nearKill' | 'rowClear' | 'blast';
  /** seconds between two uses (a tick skill's period) */
  cd?: number | (() => number);
  fx?: (d: any, s: any) => void;
  gain?: () => void;
}

export const SKILLS: Record<string, SkillDef> = {
  // 떠돌이 약선 (정파)
  gitan: {
    npc: 'yakseon',
    level: 1,
    br: 'gi',
    name: '기탄',
    effect: r => `추적 기탄 발사 · 위력 ${pct(2.4 * cardBoost('yakseon', r))}`,
    trig: 'tick',
    cd: 0.85,
    fx: () =>
      fireShot(G.player.x, G.player.y - 30, rnd(-200, 200), D() * 2.4 * cardBoost('yakseon'), {
        kind: 'orb',
        color: BR.gi.color,
        homing: true,
        vy: 650,
      }),
  },
  hoechun: {
    npc: 'yakseon',
    level: 2,
    br: 'gi',
    name: '회춘단',
    effect: r => `${hoechunCooldown(r)}초마다 피격 1회 무효`,
    trig: 'tick',
    cd: () => hoechunCooldown(),
    fx: () => {
      if (G.state.negate) return;
      G.state.negate = true;
    },
  },
  // 청운 도인 (정파)
  yusu: {
    npc: 'dosa',
    level: 1,
    br: 'yu',
    name: '유수파',
    effect: r => `스칠 때 그 자리에 청기 파동 · 위력 ${pct(3.5 * cardBoost('dosa', r))}`,
    trig: 'graze',
    cd: 0.12,
    fx: d => aoe(d.x, d.y - 20, 80, D() * 3.5 * cardBoost('dosa'), BR.yu.color),
  },
  taeguk: {
    npc: 'dosa',
    level: 2,
    br: 'yu',
    name: '태극운검',
    effect: r => `스친 탄을 추적탄으로 되돌려 보냄 · 위력 ${pct(3 * cardBoost('dosa', r))}`,
    trig: 'graze',
    fx: d => {
      if (d.h) d.h.dead = true;
      fireShot(d.x, d.y, 0, D() * 3 * cardBoost('dosa'), { kind: 'orb', color: BR.yu.color, homing: true, vy: 700 });
    },
  },
  // 철벽 노승 (정파)
  bungsan: {
    npc: 'monk',
    level: 1,
    br: 'gang',
    name: '붕산권',
    effect: r => `근접 처치한 자리에 충격파 · 위력 ${pct(5 * cardBoost('monk', r))}`,
    trig: 'nearKill',
    cd: 0.1,
    fx: d => aoe(d.e.x, d.e.y, 95, D() * 5 * cardBoost('monk'), BR.gang.color),
  },
  art_cheolgap: {
    npc: 'monk',
    level: 2,
    br: 'art',
    name: '철갑공',
    effect: r => `${cheolgapCooldown(r)}초마다 피격 1회를 막는 보호막 (최대 1개)`,
    trig: 'tick',
    cd: () => cheolgapCooldown(),
    fx: () => {
      if (!G.player.shield) {
        G.player.shield = 1;
        ring(G.player.x, G.player.y, BR.art.color, 10, 70, 0.4);
      }
    },
  },
  // 비연 낭자 (사파)
  janyoung: {
    npc: 'yeonhyeop',
    level: 1,
    br: 'yu',
    name: '잔영검',
    effect: r => `좌우 전환할 때 잔상이 검기 2발 발사 · 위력 ${pct(2.2 * cardBoost('yeonhyeop', r))}`,
    trig: 'step',
    cd: 0.22,
    fx: d => {
      for (const o of [-9, 9])
        fireShot(d.x + o, G.player.y - 25, 0, D() * 2.2 * cardBoost('yeonhyeop'), { kind: 'qi', color: BR.yu.color });
    },
  },
  mancheon: {
    npc: 'yeonhyeop',
    level: 2,
    br: 'yu',
    name: '만천화우',
    effect: r => `좌우 전환할 때 비도 3자루를 부채꼴로 투척 · 위력 ${pct(3 * cardBoost('yeonhyeop', r))}`,
    trig: 'step',
    cd: 0.26,
    fx: () => fan(3, 0.32, D() * 3 * cardBoost('yeonhyeop'), '#bdf7ea', 'knife', 'mancheon'),
  },
  // 녹림 의적 (사파)
  uihyeop: {
    npc: 'uijeok',
    level: 1,
    br: 'gang',
    name: '의협난도',
    effect: r => `한 줄 전멸 때 5방향 관통 도기 · 위력 ${pct(5 * cardBoost('uijeok', r))}`,
    trig: 'rowClear',
    cd: 0.2,
    fx: () => {
      for (const vx of [-320, -160, 0, 160, 320])
        fireShot(G.player.x, G.player.y - 40, vx, D() * 5 * cardBoost('uijeok'), {
          kind: 'gang',
          pierce: true,
          w: 8,
          color: '#ffb38f',
        });
    },
  },
  art_dobeop: {
    npc: 'uijeok',
    level: 2,
    br: 'art',
    name: '녹림도법',
    effect: r => `1.4초마다 7방향 도기 · 위력 ${pct(2.5 * cardBoost('uijeok', r))}`,
    trig: 'tick',
    cd: 1.4,
    fx: () => fan(7, 0.2, D() * 2.5 * cardBoost('uijeok'), '#ffc179', 'knife', 'dobeop'),
  },
  // 혈마 밀사 (사파)
  geomu: {
    npc: 'milsa',
    level: 1,
    br: 'gi',
    name: '검우',
    effect: r => `필살기를 쓰면 ${rainSeconds(r)}초간 검의 비`,
    trig: 'blast',
    fx: () => {
      G.state.rain = rainSeconds();
      G.state.rainTimer = 0;
    },
  },
  art_cheonma: {
    npc: 'milsa',
    level: 2,
    br: 'art',
    name: '천마군림',
    effect: r => `3초마다 가장 강한 적에게 천마 검강 · 위력 ${pct(9 * cardBoost('milsa', r))}`,
    trig: 'tick',
    cd: 3,
    fx: () => {
      const e = strongestEnemy();
      if (e) column(e.x, D() * 9 * cardBoost('milsa'), '#f6bc83', 36, 'cheonma');
    },
  },
};

/** A skill's period or cooldown in seconds. */
export const cooldown = (d: SkillDef) => (typeof d.cd === 'function' ? d.cd() : d.cd || 0);

/** A skill's 효과 line, worded for the 인연 card level (the run's, or the one given). */
export function skillEffect(id: string, rank = cardRank(SKILLS[id].npc)): string {
  return SKILLS[id].effect(rank);
}
