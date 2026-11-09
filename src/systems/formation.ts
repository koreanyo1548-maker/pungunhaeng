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
  G.state.swapReady = G.time + TUNE.swapCd;
  const h = HEROES[G.state.formation[G.state.active]];
  G.player.inv = Math.max(G.player.inv, 0.5);
  if (!pfx('collect', G.player.x, G.player.y + 40, { palette: ramp(h.color) })) {
    ring(G.player.x, G.player.y, h.color, 10, m > 1 ? 190 : 110, 0.45);
    burst(G.player.x, G.player.y, h.color, m > 1 ? 30 : 16, 220);
  }
  startSwapPose(activeHeroId());
  withSkill(activeHeroId(), () => h.fx(m));
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
