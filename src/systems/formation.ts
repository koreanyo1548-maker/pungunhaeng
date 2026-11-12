import { withSkill, skillCue, skillAura, startSwapPose } from '../render/skill-animation';
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
/** Seconds between swaps: the base, shortened by 교체 숙련. */
export function swapCooldown() {
  return TUNE.swapCd - 0.5 * G.state.meta.stats.swap;
}
/** Mastery level (0 to 4) the run started with for this hero. */
export function heroLevel(id = activeHeroId()) {
  return G.state.meta.heroes[id] ?? 0;
}
// A trait's strength at the active hero's mastery level, or its neutral value when the trait is off.
// The per-level steps match the text in data/heroes.ts.
export const traitPower = () =>
  traitOn('cheolhyeol') || traitOn('bicheon') ? TUNE.traitPower + 0.04 * heroLevel() : 1;
export const traitCharge = () => (traitOn('unhak') ? TUNE.traitCharge + 0.05 * heroLevel() : 1);
export const traitGraze = () => (traitOn('mukyoung') ? TUNE.traitGraze + 0.05 * heroLevel() : 1);
export const traitFire = () => (traitOn('hongryeon') ? TUNE.traitFire + 0.03 * heroLevel() : 1);
/** 풍운객: 필살기 충전 for a close kill, or 0 when the trait is off. */
export const traitNearCharge = () => (traitOn('pungun') ? 5 + heroLevel() : 0);
export function traitOn(id) {
  return !!G.state && G.state.formation?.[G.state.active] === id && HEROES[id].terrain === G.state.course;
}
export function swapHero() {
  if (G.mode !== 'play' || !['flight', 'boss', 'warning'].includes(G.state.phase) || G.time < G.state.swapReady) return;
  const boss = G.enemies.find(e => e.boss && !e.dead),
    rescue = G.time - G.state.lastHurt < 1.5,
    opening = !!boss && boss.action === 'recover',
    m = rescue || opening ? 2 : 1;
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
  withSkill(activeHeroId(), () => h.fx(m, heroLevel()));
  skillCue(activeHeroId(), G.player.x, G.player.y - 30, m > 1 ? 170 : 125);
  if (activeHeroId() === 'mukyoung') skillAura('mukyoung', 0.6 * m + 0.2);

  label(
    (m > 1 ? (rescue ? '위기 교체 ×2 · ' : '제때 교체 ×2 · ') : '교체 · ') + h.name + ' 「' + h.tag + '」',
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
