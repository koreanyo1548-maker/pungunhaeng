// Hero traits (docs/ability-redesign-plan.md, 3장): on while their hero fights (the run has one hero). Numbers come
// from data/heroes.ts. Also the parts of the basic shot and of hits that 공명 기술 change (홍련화, 그림자 분신).
// (2026-11: the entry skills went with the party of two; 어검진, 홍련화, 그림자 분신 and 관창 became 공명 기술.)
// Gameplay rolls (critical hits) use the gameplay stream (rnd); looks use the effect stream.
import { G } from '../core/context';
import { rnd } from '../core/math';
import { HEROES } from '../data/heroes';
import { TUNE } from '../data/tune';
import { BASELINE } from '../data/baseline';
import type { HeroId } from '../data/roster';
import { burst, label, ring } from '../render/fx';
import { D, aoe, clearBullets, fireShot } from './combat';
import { activeHeroId, heroLevel } from './formation';
import { factor, heroGearFactor } from './factors';
import { windowOn } from './skill-state';

// ---------------------------------------------------------------- traits

/** Whether a hero's trait is on right now: the hero of the run. */
export function traitActive(id: HeroId): boolean {
  return !!G.state && G.mode !== 'title' && activeHeroId() === id;
}
/** The trait's number when it is on, or undefined when it is off. */
export function traitValue(id: HeroId): number | undefined {
  if (!traitActive(id)) return undefined;
  return HEROES[id].trait.value?.(heroLevel(id));
}

/** graze reach multiplier: 묵영's trait, and the 스침 범위 factor (gear) */
export const grazeReach = () => (traitValue('mukyoung') ?? 1) * (1 + factor('grazePct'));

/** How far 엽전 are pulled in from: 0 without a magnet. 황연청's trait and the 자석 item are the same magnet:
 *  BASELINE.magnet.graze × the 스침 거리, raised by the 자석 범위 factor. */
export const magnetReach = () =>
  traitValue('yeoncheong') || G.state.magnet > 0
    ? TUNE.grazeRadius * BASELINE.magnet.graze * (1 + factor('magnetPct'))
    : 0;
/** 한소운: 무아지경 item duration multiplier. */
export const hyperItemScale = () => 1 + (traitValue('soun') ?? 0);
/** seconds of a 무아지경 item: the base × 한소운, + the 무아지경 시간 factor (gear) */
export const hyperSeconds = (base: number) => base * hyperItemScale() + factor('hyperSeconds');
/** The fighting hero's level, as the run started with it (core/profile.ts levels). */
export const fighterLevel = () => G.state?.meta?.levels?.[activeHeroId()] ?? 1;
/** The attack of the fighting hero: the base attack plus one per level above 1 (docs/combat-stats.md). */
export const heroAttack = () => TUNE.attack + fighterLevel() - 1;
/** Attack bonus in %: the 공격력 factor (아영's trait, gear). */
export function attackBonus() {
  return factor('attackPct');
}

/** Traits that act once, when the hero is set: 철혈's health, 운학's 필살기, and the hero's gear. */
export function applyStartTraits() {
  const s = G.state,
    id = s.hero;
  if (id === 'cheolhyeol') {
    const h = s.heroHealth.cheolhyeol;
    h.maxHp = h.hp = 1 + HEROES.cheolhyeol.trait.value(heroLevel('cheolhyeol'));
  }
  if (id === 'unhak') s.bombs += HEROES.unhak.trait.value(heroLevel('unhak'));
  // 최대 체력 and 필살기 from the hero's own gear
  const more = heroGearFactor(id, 'maxHp');
  if (more) {
    const h = s.heroHealth[id];
    h.maxHp += more;
    h.hp += more;
  }
  s.bombs += heroGearFactor(id, 'bombs');
}

/** 엽전 a kill drops: one */
export const KILL_COINS = 1;
/** How many coins a kill drops: one, plus the bonus share (매설영's trait, the 엽전 획득 factor) carried between
 *  kills. */
export function coinsForKill(): number {
  const bonus = (traitValue('seolyeong') ?? 0) + factor('coinPct');
  if (!bonus) return KILL_COINS;
  const s = G.state;
  s.coinFrac = (s.coinFrac ?? 0) + KILL_COINS * bonus;
  const extra = Math.floor(s.coinFrac + 1e-9);
  s.coinFrac -= extra;
  return KILL_COINS + extra;
}

/** 비천: every Nth kill of a combo sends a flying sword at the nearest enemy. A broken combo starts over. */
export function onComboKill() {
  const n = traitValue('bicheon');
  if (n === undefined || G.state.combo % n !== 0) return;
  fireShot(G.player.x, G.player.y - 40, 0, D() * 4, {
    kind: 'sword',
    homing: true,
    vy: 760,
    color: HEROES.bicheon.color,
  });
  ring(G.player.x, G.player.y - 20, HEROES.bicheon.color, 6, 46, 0.25);
}

/** 풍운객: a close kill clears the bullets around him. */
export function onNearKill() {
  const r = traitValue('pungun');
  if (r === undefined) return;
  clearBullets(G.player.x, G.player.y, r);
  ring(G.player.x, G.player.y, HEROES.pungun.color, 8, r, 0.3);
}

// Critical hits: 홍련's trait rolls a chance, 홍련화 makes every hit critical. 필살기 never crits.
/** Damage after a possible critical hit, with its feedback. */
export function critical(e, damage: number): number {
  if (G.state.blasting) return damage;
  // 홍련화 (a 공명 기술) makes every hit critical while it is on
  const all = windowOn('hongryeonhwa'),
    chance = all ? 1 : factor('critChance');
  if (chance <= 0 || (chance < 1 && rnd(0, 1) >= chance)) return damage;
  // ×2, + the 치명타 피해 factor (gear)
  const mult = 2 + factor('critDamage');
  if (G.time - (G.state.critLabel ?? -1) > 0.12) {
    G.state.critLabel = G.time;
    label('치명', e.x, e.y - 30, '#ff8fb0', 15);
  }
  return damage * mult;
}

/** 그림자 분신 (a 공명 기술): x offsets of the clones that copy each basic attack while it is on. */
export function cloneOffsets(): number[] {
  return windowOn('grimja') ? [56, -56] : [];
}

/** Extra properties of a basic shot: piercing (목청완's trait, the 관통 factor). */
export function basicShotOptions() {
  const pierce = (traitValue('cheongwan') ?? 0) + factor('pierce');
  return { pierceLeft: pierce || undefined };
}
