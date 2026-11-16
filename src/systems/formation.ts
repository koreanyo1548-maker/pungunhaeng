import { queueHeroAction, clearHeroActions } from './hero-actions';
import { heroCanFight } from '../core/hero-health';
import { skillCue, skillAura, startSwapPose } from '../render/skill-animation';
import { withSkill } from '../core/skill-context';
import { G } from '../core/context';
import { heroAnimations } from '../core/assets';
import { chime, tone } from '../core/audio';
import { HEROES } from '../data/heroes';
import { TUNE } from '../data/tune';
import { burst, label, ring } from '../render/fx';
import { pfx, ramp } from '../render/pfx';
import { syncHUD } from '../ui/hud';

export const heroTintCache = {};
export function activeHeroId() {
  return G.state && G.mode !== 'title' ? G.state.formation[G.state.active] : 'pungun';
}
export function activeFrames() {
  return heroAnimations[activeHeroId()] || G.heroFrames;
}
/** Seconds between swaps. */
export function swapCooldown() {
  return TUNE.swapCd;
}
/** The hero's 성급 minus one (0 = ★1 to 4 = ★5), as the run started with it. */
export function heroLevel(id = activeHeroId()) {
  return G.state.meta.heroes[id] ?? 0;
}
// A trait's strength at the active hero's 성급, or its neutral value when the trait is off.
// The per-level steps match the text in data/heroes.ts.
export const traitPower = () =>
  traitOn('cheolhyeol') || traitOn('bicheon') ? TUNE.traitPower + 0.04 * heroLevel() : 1 + heroineTrait('power');
export const traitCharge = () =>
  traitOn('unhak') ? TUNE.traitCharge + 0.05 * heroLevel() : 1 + heroineTrait('charge');
export const traitGraze = () =>
  traitOn('mukyoung') ? TUNE.traitGraze + 0.05 * heroLevel() : 1 + heroineTrait('graze');
export const traitFire = () => (traitOn('hongryeon') ? TUNE.traitFire + 0.03 * heroLevel() : 1 + heroineTrait('fire'));
/** 풍운객: 필살기 충전 for a close kill, or 0 when the trait is off. */
export const traitNearCharge = () => (traitOn('pungun') ? 5 + heroLevel() : 0);
export function traitOn(id) {
  return !!G.state && G.state.formation?.[G.state.active] === id && HEROES[id].terrain === G.state.course;
}
/** Manual swap never selects a fallen reserve. */
export function hasLivingReserve() {
  return !!G.state && heroCanFight(G.state, G.state.formation[1 - G.state.active]);
}
export function swapHero() {
  if (
    G.mode !== 'play' ||
    !['flight', 'boss', 'warning'].includes(G.state.phase) ||
    G.time < G.state.swapReady ||
    !hasLivingReserve()
  )
    return;
  enterReserve(false);
}
/** Lethal damage bypasses the manual cooldown and does not award a doubled rescue attack. */
export function replaceFallenHero(): boolean {
  if (G.mode !== 'play' || !G.state.heroHealth[activeHeroId()].fallen || G.player.hp > 0 || !hasLivingReserve())
    return false;
  enterReserve(true);
  return true;
}
function enterReserve(automatic: boolean) {
  const boss = G.enemies.find(e => e.boss && !e.dead),
    rescue = G.time - G.state.lastHurt < 1.5,
    opening = !!boss && boss.action === 'recover',
    m = !automatic && (rescue || opening) ? 2 : 1;
  clearHeroActions();
  G.afterimages = [];
  G.state.active = 1 - G.state.active;
  G.state.swapReady = G.time + swapCooldown();
  const h = HEROES[G.state.formation[G.state.active]];
  G.player.inv = Math.max(G.player.inv, 0.5);
  if (!pfx('collect', G.player.x, G.player.y + 40, { palette: ramp(h.color) })) {
    ring(G.player.x, G.player.y, h.color, 10, m > 1 ? 190 : 110, 0.45);
    burst(G.player.x, G.player.y, h.color, m > 1 ? 30 : 16, 220);
  }
  startSwapPose(activeHeroId());
  const id = activeHeroId(),
    level = heroLevel();
  if ('cast' in h.art && h.art.cast) queueHeroAction(id, 0.16, () => h.fx(m, level));
  else withSkill(id, () => h.fx(m, level));
  skillCue(activeHeroId(), G.player.x, G.player.y - 30, m > 1 ? 170 : 125);
  if (activeHeroId() === 'mukyoung') skillAura('mukyoung', 0.6 * m + 0.2);

  label(
    (automatic ? '자동 교체 · ' : m > 1 ? (rescue ? '위기 교체 ×2 · ' : '제때 교체 ×2 · ') : '교체 · ') +
      h.name +
      ' 「' +
      h.tag +
      '」',
    240,
    470,
    h.color,
    m > 1 ? 24 : 19,
  );
  if (m > 1) {
    G.flash = 0.12;
    chime();
  } else tone(520, 0.12, 'triangle', 0.1, 780);
  if (h.terrain !== G.state.course) label('적성 아님 · 특성 미발동', 240, 505, '#c8bfae', 14);
  G.state.swaps = (G.state.swaps || 0) + 1;
  if (m > 1) G.state.combos2 = (G.state.combos2 || 0) + 1;
  syncHUD();
}

const heroineTraits: Record<string, Partial<Record<'power' | 'charge' | 'graze' | 'fire', [number, number]>>> = {
  yeoncheong: { fire: [0.12, 0.02], charge: [0.15, 0.03] },
  cheongwan: { power: [0.2, 0.04] },
  seolyeong: { graze: [0.25, 0.04], power: [0.1, 0.02] },
  soun: { fire: [0.2, 0.03] },
  yoran: { charge: [0.3, 0.05] },
  ayeong: { power: [0.15, 0.03], fire: [0.08, 0.01] },
};
function heroineTrait(kind: 'power' | 'charge' | 'graze' | 'fire') {
  const id = activeHeroId(),
    value = heroineTraits[id]?.[kind];
  return value && traitOn(id) ? value[0] + value[1] * heroLevel() : 0;
}
