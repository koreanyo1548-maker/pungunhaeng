// Hero traits and entry skills (docs/ability-redesign-plan.md, 3장 and 7장).
//   Traits: on while their hero fights; the two support heroes (scope 'party') work for the whole party while
//   they stand. Numbers come from data/heroes.ts.
//   Entry skills: a timed effect that starts when the second hero enters after the first falls. Time is game
//   time, so pauses and choice screens stop it. 풍운객 casts the fallen hero's entry skill instead of his own.
// Gameplay rolls (critical hits) use the gameplay stream (rnd); looks use the effect stream.
import { G } from '../core/context';
import { W } from '../core/dom';
import { rnd } from '../core/math';
import { visualSkill, withSkill } from '../core/skill-context';
import { HEROES } from '../data/heroes';
import { TUNE } from '../data/tune';
import type { HeroId } from '../data/roster';
import { hitEnemy } from '../entities/enemies';
import { burst, label, ring } from '../render/fx';
import { skillAura, skillCue } from '../render/skill-animation';
import { D, aoe, clearBullets, fireShot } from './combat';
import { activeHeroId, heroLevel } from './formation';
import { factor, heroGearFactor } from './factors';

// ---------------------------------------------------------------- traits

const fallen = (id: HeroId) => !!G.state?.heroHealth[id]?.fallen;

/** Whether a hero's trait is on right now. */
export function traitActive(id: HeroId): boolean {
  if (!G.state || G.mode === 'title') return false;
  if (HEROES[id].trait.scope === 'party') return G.state.formation.includes(id) && !fallen(id);
  if (activeHeroId() === id) return true;
  // 풍운객 ★5: after 계승 he also carries the fallen vanguard's trait
  return G.state.inheritTrait === id && activeHeroId() === 'pungun';
}
/** The trait's number when it is on, or undefined when it is off. */
export function traitValue(id: HeroId): number | undefined {
  if (!traitActive(id)) return undefined;
  return HEROES[id].trait.value?.(heroLevel(id));
}

/** graze reach multiplier: 묵영's trait, and the 스침 범위 factor (gear) */
export const grazeReach = () => (traitValue('mukyoung') ?? 1) * (1 + factor('grazePct'));
/** reach of the 자석 item (the same scale as 황연청's trait: 엽전 within 150 px × reach, items within 65 px × reach) */
export const MAGNET_ITEM_REACH = 2;
/** How far pickups are pulled in: 0 without a magnet. 황연청 in the party is a magnet of her own; the 자석 item is
 *  another (the larger counts). */
export const magnetReach = () =>
  Math.max(traitValue('yeoncheong') ?? 0, G.state.magnet > 0 ? MAGNET_ITEM_REACH : 0) * (1 + factor('magnetPct'));
/** 한소운: 무아지경 item duration multiplier. */
export const hyperItemScale = () => 1 + (traitValue('soun') ?? 0);
/** seconds of a 무아지경 item: the base × 한소운, + the 무아지경 시간 factor (gear) */
export const hyperSeconds = (base: number) => base * hyperItemScale() + factor('hyperSeconds');
/** The fighting hero's level, as the run started with it (core/profile.ts levels). */
export const fighterLevel = () => G.state?.meta?.levels?.[activeHeroId()] ?? 1;
/** The attack of the fighting hero: the base attack plus one per level above 1 (docs/combat-stats.md). */
export const heroAttack = () => TUNE.attack + fighterLevel() - 1;
/** Attack bonus in %: the 공격력 factor (아영's trait, gear), and 매의 눈 ★5 adds to it. */
export function attackBonus() {
  return factor('attackPct') + (effectOn('ayeong') && G.state.effect.level >= 4 ? 0.1 : 0);
}

/** Traits that act once, when the party is set: 철혈's health, 운학's 필살기. */
export function applyStartTraits() {
  const s = G.state;
  for (const id of s.formation) {
    if (id === 'cheolhyeol') {
      const h = s.heroHealth.cheolhyeol;
      h.maxHp = h.hp = 1 + HEROES.cheolhyeol.trait.value(heroLevel('cheolhyeol'));
    }
    if (id === 'unhak') {
      s.bombs += HEROES.unhak.trait.value(heroLevel('unhak'));
    }
    // 최대 체력 and 필살기 from the hero's own gear (what each of the two brings)
    const more = heroGearFactor(id, 'maxHp');
    if (more) {
      const h = s.heroHealth[id];
      h.maxHp += more;
      h.hp += more;
    }
    s.bombs += heroGearFactor(id, 'bombs');
  }
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
let noCrit = false;
/** Damage after a possible critical hit, with its feedback. */
export function critical(e, damage: number): number {
  if (noCrit || G.state.blasting) return damage;
  const all = effectOn('hongryeon'),
    chance = all ? 1 : factor('critChance');
  if (chance <= 0 || (chance < 1 && rnd(0, 1) >= chance)) return damage;
  const L = all ? G.state.effect.level : 0,
    // ×2 (홍련화 ★3: ×2.5), + the 치명타 피해 factor (gear)
    mult = (all && L >= 2 ? 2.5 : 2) + factor('critDamage');
  if (G.time - (G.state.critLabel ?? -1) > 0.12) {
    G.state.critLabel = G.time;
    label('치명', e.x, e.y - 30, '#ff8fb0', 15);
  }
  if (all && L >= 4) {
    // ★5: a burst of flame where the critical hit lands (its own hits cannot crit again)
    noCrit = true;
    aoe(e.x, e.y, 60, D() * 1.5, '#ff8fb0', false);
    noCrit = false;
    burst(e.x, e.y, '#ff8fb0', 6, 120);
  }
  return damage * mult;
}

// ---------------------------------------------------------------- entry skills

export interface HeroEffect {
  /** whose entry skill this is (for 계승, the fallen vanguard's) */
  hero: HeroId;
  /** the 성급 level that sets its strength (for 계승, 풍운객's) */
  level: number;
  left: number;
  total: number;
  /** repeating actions (spears, needles, veil damage) */
  timer: number;
  angle: number;
  /** 풍운객 when the skill came through 계승 */
  via?: HeroId;
}

export function effectOn(id: HeroId): boolean {
  return !!G.state?.effect && G.state.effect.hero === id && G.state.effect.left > 0;
}

/** The second hero enters: start their entry skill (풍운객: the fallen vanguard's). */
export function startEntry(id: HeroId, vanguard: HeroId) {
  const s = G.state,
    level = heroLevel(id);
  let hero = id,
    scale = 1,
    via: HeroId | undefined;
  if (id === 'pungun') {
    hero = vanguard;
    via = 'pungun';
    scale = level >= 2 ? 1.5 : 1;
    if (level >= 4) s.inheritTrait = vanguard;
  }
  const seconds = HEROES[hero].entry.seconds(level) * scale;
  s.effect = { hero, level, left: seconds, total: seconds, timer: 0, angle: 0, via };
  const name = HEROES[hero].entry.name;
  label((via ? '계승 · ' : '') + name, G.player.x, G.player.y - 90, HEROES[hero].color, 22);
  if (hero === 'soun') {
    s.hyper = Math.max(s.hyper, seconds);
    G.player.inv = Math.max(G.player.inv, seconds + 0.4);
  }
  if (hero === 'mukyoung') skillAura('mukyoung', 0.8);
  withSkill(id, () => skillCue(id, G.player.x, G.player.y - 30, 150));
}

function endEffect() {
  const fx = G.state.effect;
  if (fx.hero === 'cheolhyeol' && fx.level >= 4 && !fallen(activeHeroId())) {
    // 불굴 ★5: one more health point when it ends
    const h = G.state.heroHealth[activeHeroId()];
    h.maxHp += 1;
    h.hp += 1;
    label('체력 +1', G.player.x, G.player.y - 60, HEROES.cheolhyeol.color, 18);
  }
  if (fx.hero === 'soun' && fx.level >= 4) clearBullets(W / 2, 0, 9999);
  G.state.effect = null;
}

/** Per step while fighting: count down, and run the repeating parts. */
export function updateHeroEffect(dt: number) {
  const fx = G.state?.effect;
  if (!fx) return;
  fx.left -= dt;
  fx.timer -= dt;
  fx.angle += dt * 4.2;
  const L = fx.level,
    x = G.player.x,
    y = G.player.y;
  withSkill(fx.via ?? fx.hero, () => {
    switch (fx.hero) {
      case 'bicheon':
        orbitSwords(L);
        break;
      case 'cheongwan':
        if (fx.timer <= 0) {
          fx.timer = L >= 4 ? 0.4 : 0.6;
          for (const o of L >= 2 ? [-14, 14] : [0])
            fireShot(x + o, y - 42, 0, D() * 10, { kind: 'gang', pierce: true, w: 16, vy: 1100, color: '#e8ae88' });
        }
        break;
      case 'unhak': {
        const r = veilRadius(L);
        clearBullets(x, y, r);
        if (L >= 4 && fx.timer <= 0) {
          fx.timer = 0.5;
          aoe(x, y, r, D() * 2, '#ffd77a', false);
        }
        break;
      }
      case 'yeoncheong':
        if (fx.timer <= 0) {
          fx.timer = 0.5;
          for (const o of L >= 2 ? [-12, 12] : [0])
            fireShot(x + o, y - 30, 0, D() * 2, {
              kind: 'knife',
              homing: true,
              vy: 760,
              color: '#9ddca8',
              erase: L >= 4,
            });
        }
        break;
      case 'yoran':
        reflect(L);
        break;
    }
  });
  if (fx.left <= 0) endEffect();
}

/** 학의 장막 radius. */
export const veilRadius = (L: number) => (L >= 2 ? 150 : 110);

/** 어검진: swords circling the hero block hazards and cut enemies. */
export function swordCount(L: number) {
  return L >= 2 ? 5 : 3;
}
export function swordPositions() {
  const fx = G.state.effect,
    n = swordCount(fx.level);
  return Array.from({ length: n }, (_, i) => {
    const a = fx.angle + (i * Math.PI * 2) / n;
    return { x: G.player.x + Math.cos(a) * 62, y: G.player.y - 10 + Math.sin(a) * 62, a };
  });
}
function orbitSwords(L: number) {
  for (const p of swordPositions()) {
    for (const e of [...G.enemies]) {
      if (e.dead || (e.orbHit || 0) > G.time) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < (e.boss ? 60 : e.r) + 10) {
        e.orbHit = G.time + 0.22;
        hitEnemy(e, D() * 1.4 * (L >= 4 ? 2 : 1), visualSkill);
      }
    }
    for (const h of G.hazards) {
      if (!h.warn && !h.dead && Math.hypot(h.x - p.x, h.y - p.y) < h.r + 10) {
        h.dead = true;
        burst(h.x, h.y, '#7fe6cf', 5, 90);
      }
    }
  }
}

/** 정심반사: hazards about to hit come back as homing shots. */
function reflect(L: number) {
  const r = L >= 4 ? 100 : 80;
  for (const h of G.hazards) {
    if (h.warn > 0 || h.dead) continue;
    if (L < 4 && h.y > G.player.y + 10) continue; // only from the front before ★5
    if (Math.hypot(h.x - G.player.x, h.y - G.player.y) > r) continue;
    h.dead = true;
    fireShot(h.x, h.y, 0, D() * 3 * (L >= 2 ? 2 : 1), { kind: 'orb', homing: true, vy: 700, color: '#eee5c7' });
    burst(h.x, h.y, '#eee5c7', 4, 90);
  }
}

/** 불굴: a hit while it lasts costs no health and answers with a shockwave. Returns true when it took the hit. */
export function unbowedHit(): boolean {
  if (!effectOn('cheolhyeol')) return false;
  const L = G.state.effect.level;
  withSkill('cheolhyeol', () => aoe(G.player.x, G.player.y - 20, L >= 2 ? 180 : 140, D() * 6, '#ff6b57'));
  G.player.inv = Math.max(G.player.inv, 0.5);
  G.shake = Math.max(G.shake, 6);
  label('불굴', G.player.x, G.player.y - 60, '#ff6b57', 20);
  return true;
}

/** 음풍: how fast hazards move (1 = normal) and, from ★3, enemies. */
export function hazardSpeed() {
  return effectOn('seolyeong') ? (G.state.effect.level >= 4 ? 1 / 3 : 0.5) : 1;
}
export function enemySpeed() {
  return effectOn('seolyeong') && G.state.effect.level >= 2 ? 0.7 : 1;
}

/** 그림자 분신: x offsets of the clones that copy each basic attack. */
export function cloneOffsets(): number[] {
  if (!effectOn('mukyoung')) return [];
  const L = G.state.effect.level;
  return [56, -56, 104].slice(0, L >= 4 ? 3 : L >= 2 ? 2 : 1);
}

/** Extra properties of a basic shot from traits and effects (aim, pierce, bullet erasing). */
export function basicShotOptions() {
  const aim = effectOn('ayeong'),
    pierce = (traitValue('cheongwan') ?? 0) + factor('pierce') + (aim && G.state.effect.level >= 2 ? 1 : 0);
  return {
    homing: aim || undefined,
    pierceLeft: pierce || undefined,
  };
}
