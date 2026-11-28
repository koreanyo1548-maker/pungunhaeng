import { G } from '../core/context';
import { BR } from './branches';
import { strongestEnemy, hitEnemy } from '../entities/enemies';
import { D, aoe, column, fan, fireShot } from '../systems/combat';
import { WINDOWS } from '../systems/skill-state';
import { visualSkill } from '../core/skill-context';

// 공명 기술 (2026-11, docs/resonance-plan.md): what the protagonist's 공명 gives in a run. A met 공명의 조짐 offers
// three of these (a new one, or the next level of one held); a run holds SKILL_SLOTS of them, each up to
// SKILL_LEVEL_MAX. Each grows along one way (`axis`): projectiles, power, reach, cooldown or time on.
// They came from the 인연 skills (기탄, 태극운검, 녹림도법, 잔영검, 붕산권, 천마군림) and the old entry skills of 비천,
// 홍련, 묵영 and 목청완 (어검진, 홍련화, 그림자 분신, 관창), which went with the party (편대).
// All numbers are provisional (docs/workflow.md 8장: balance is set by play). D() is one basic shot's damage.
// (The 인연 skills not kept — 회춘단, 유수파, 철갑공, 만천화우, 의협난도, 검우 — were removed with the 인연 levels.)

export const SKILL_IDS = [
  'gitan',
  'taeguk',
  'art_dobeop',
  'janyoung',
  'bungsan',
  'art_cheonma',
  'eogeom',
  'hongryeonhwa',
  'grimja',
  'gwanchang',
] as const;
export type SkillId = (typeof SKILL_IDS)[number];
/** skills a run can hold, and the highest level of one */
export const SKILL_SLOTS = 3;
export const SKILL_LEVEL_MAX = 3;

export type SkillAxis = '발사체' | '공격력' | '범위' | '쿨타임' | '지속 시간';
export interface SkillDef {
  name: string;
  /** only colours the skill (chip, callout) */
  br: string;
  axis: SkillAxis;
  /** tick: every `cd`; graze, step, nearKill: on that event, at most once a `cd`; aura: every frame;
   *  window: on for part of a cycle (systems/skill-state.ts WINDOWS), read where the game uses it */
  trig: 'tick' | 'graze' | 'step' | 'nearKill' | 'aura' | 'window';
  /** seconds between two uses at a level */
  cd?: (L: number) => number;
  fx?: (d: any, L: number, s: { angle?: number }) => void;
  /** what it does at a level (1 to SKILL_LEVEL_MAX) */
  effect: (L: number) => string;
}

/** a level's value (L is 1 to SKILL_LEVEL_MAX) */
const at = <T>(list: readonly T[], L: number) => list[Math.max(1, Math.min(list.length, L)) - 1];
const pct = (n: number) => Math.round(n * 100) + '%';

// ---- per-level numbers (provisional)
const GITAN = { shots: [2, 3, 4], power: 2, every: 1 };
const TAEGUK = { power: [4, 6, 8], gap: 0.6 };
const DOBEOP = { blades: [5, 7, 9], power: 1.7, every: 1.2, spread: 0.12 };
const JANYOUNG = { shots: [2, 3, 4], power: 2, gap: 0.6 };
const BUNGSAN = { radius: [80, 100, 120], power: 5 };
const CHEONMA = { every: [3, 2, 1.5], power: 9 };
const EOGEOM = { swords: [3, 4, 5], power: 1.4, radius: 62, again: 0.22 };
const GWANCHANG = { every: [1.2, 0.8, 0.6], power: 4.8 };

/** 어검진: where the swords circling the hero are now (`angle` turns with time) */
export function swordPositions(L: number, angle: number) {
  const n = at(EOGEOM.swords, L);
  return Array.from({ length: n }, (_, i) => {
    const a = angle + (i * Math.PI * 2) / n;
    return {
      x: G.player.x + Math.cos(a) * EOGEOM.radius,
      y: G.player.y - 10 + Math.sin(a) * EOGEOM.radius,
      a,
    };
  });
}

export const SKILLS: Record<SkillId, SkillDef> = {
  gitan: {
    name: '기탄',
    br: 'gi',
    axis: '발사체',
    trig: 'tick',
    cd: () => GITAN.every,
    effect: L => `${GITAN.every}초마다 추적 기탄 ${at(GITAN.shots, L)}발 · 위력 ${pct(GITAN.power)}`,
    fx: (_, L) => {
      const n = at(GITAN.shots, L);
      for (let i = 0; i < n; i++)
        fireShot(G.player.x, G.player.y - 30, (i - (n - 1) / 2) * 160, D() * GITAN.power, {
          kind: 'orb',
          color: BR.gi.color,
          homing: true,
          vy: 650,
        });
    },
  },
  taeguk: {
    name: '태극운검',
    br: 'yu',
    axis: '공격력',
    trig: 'graze',
    cd: () => TAEGUK.gap,
    effect: L => `스칠 때 추적탄 · 위력 ${pct(at(TAEGUK.power, L))} (${TAEGUK.gap}초에 한 번)`,
    fx: (_, L) =>
      fireShot(G.player.x, G.player.y - 30, 0, D() * at(TAEGUK.power, L), {
        kind: 'orb',
        color: BR.yu.color,
        homing: true,
        vy: 700,
      }),
  },
  art_dobeop: {
    name: '녹림도법',
    br: 'art',
    axis: '발사체',
    trig: 'tick',
    cd: () => DOBEOP.every,
    effect: L => `${DOBEOP.every}초마다 ${at(DOBEOP.blades, L)}방향 도기 · 위력 ${pct(DOBEOP.power)}`,
    fx: (_, L) => fan(at(DOBEOP.blades, L), DOBEOP.spread, D() * DOBEOP.power, '#ffc179', 'knife', 'dobeop'),
  },
  janyoung: {
    name: '잔영검',
    br: 'yu',
    axis: '발사체',
    trig: 'step',
    cd: () => JANYOUNG.gap,
    effect: L =>
      `좌우로 움직일 때 검기 ${at(JANYOUNG.shots, L)}발 · 위력 ${pct(JANYOUNG.power)} (${JANYOUNG.gap}초에 한 번)`,
    fx: (d, L) => {
      const n = at(JANYOUNG.shots, L);
      for (let i = 0; i < n; i++)
        fireShot(d.x + (i - (n - 1) / 2) * 12, G.player.y - 25, 0, D() * JANYOUNG.power, {
          kind: 'qi',
          color: BR.yu.color,
        });
    },
  },
  bungsan: {
    name: '붕산권',
    br: 'gang',
    axis: '범위',
    trig: 'nearKill',
    cd: () => 0.1,
    effect: L => `근접 처치한 자리에 충격파 · 반경 ${at(BUNGSAN.radius, L)} · 위력 ${pct(BUNGSAN.power)}`,
    fx: (d, L) => aoe(d.e.x, d.e.y, at(BUNGSAN.radius, L), D() * BUNGSAN.power, BR.gang.color),
  },
  art_cheonma: {
    name: '천마군림',
    br: 'art',
    axis: '쿨타임',
    trig: 'tick',
    cd: L => at(CHEONMA.every, L),
    effect: L => `${at(CHEONMA.every, L)}초마다 가장 강한 적에게 천마 검강 · 위력 ${pct(CHEONMA.power)}`,
    fx: () => {
      const e = strongestEnemy();
      if (e) column(e.x, D() * CHEONMA.power, '#f6bc83', 36, 'cheonma');
    },
  },
  eogeom: {
    name: '어검진',
    br: 'yu',
    axis: '발사체',
    trig: 'aura',
    effect: L => `비검 ${at(EOGEOM.swords, L)}자루가 주위를 돌며 닿는 적을 벤다 · 위력 ${pct(EOGEOM.power)}`,
    fx: (dt: number, L, s) => {
      s.angle = (s.angle ?? 0) + dt * 4.2;
      for (const p of swordPositions(L, s.angle))
        for (const e of [...G.enemies]) {
          if (e.dead || (e.orbHit || 0) > G.time) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) < (e.boss ? 60 : e.r) + 10) {
            e.orbHit = G.time + EOGEOM.again;
            hitEnemy(e, D() * EOGEOM.power, visualSkill);
          }
        }
    },
  },
  hongryeonhwa: {
    name: '홍련화',
    br: 'gang',
    axis: '지속 시간',
    trig: 'window',
    effect: L => {
      const w = WINDOWS.hongryeonhwa,
        on = at(w.on, L);
      return on >= w.period
        ? '모든 공격이 늘 치명타 (피해 2배)'
        : `${w.period}초 중 ${on}초 동안 모든 공격이 치명타 (피해 2배)`;
    },
  },
  grimja: {
    name: '그림자 분신',
    br: 'yu',
    axis: '지속 시간',
    trig: 'window',
    effect: L => {
      const w = WINDOWS.grimja,
        on = at(w.on, L);
      return on >= w.period
        ? '분신 2개가 늘 기본 공격을 따라 쏜다'
        : `${w.period}초 중 ${on}초 동안 분신 2개가 기본 공격을 따라 쏜다`;
    },
  },
  gwanchang: {
    name: '관창',
    br: 'gang',
    axis: '쿨타임',
    trig: 'tick',
    cd: L => at(GWANCHANG.every, L),
    effect: L => `${at(GWANCHANG.every, L)}초마다 정면으로 관통 창 · 위력 ${pct(GWANCHANG.power)}`,
    fx: () =>
      fireShot(G.player.x, G.player.y - 42, 0, D() * GWANCHANG.power, {
        kind: 'gang',
        pierce: true,
        w: 16,
        vy: 1100,
        color: '#e8ae88',
      }),
  },
};

/** A skill's period or cooldown in seconds at a level. */
export const cooldown = (d: SkillDef, L: number) => d.cd?.(L) ?? 0;

/** A skill's 효과 line at a level (1 to SKILL_LEVEL_MAX). */
export function skillEffect(id: SkillId, level: number): string {
  return SKILLS[id].effect(level);
}
