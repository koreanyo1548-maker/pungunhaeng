import { actionCallout } from '../render/callout';
import { skillCue, skillBurst } from '../render/skill-animation';
import { visualSkill } from '../core/skill-context';
import { emit } from '../core/events';
import { G } from '../core/context';
import { TUNE } from '../data/tune';
import { boom, chime, tone } from '../core/audio';
import { BR } from '../data/branches';
import { hitEnemy } from '../entities/enemies';
import { burst, impact, label, paintFX, ring } from '../render/fx';
import { pfx, ramp } from '../render/pfx';
import { hasSkill } from './skill-state';
import { bondPower } from '../data/skills';
import { attackBonus, heroAttack } from './hero-effects';
import { notify, syncHUD } from '../ui/hud';

const BLAST = ramp('#7fe6cf'),
  GRAZE = ramp(BR.yu.color);

/** damage scale of one basic shot: the stage, and 녹림 의적 1단계 */
/** one basic shot's damage: the fighting hero's attack (a whole number), times %-bonuses (녹림 의적 1단계, 아영) */
export function shotPower() {
  return heroAttack() * bondPower() * (1 + attackBonus());
}
export function blast() {
  if (G.mode !== 'play' || G.state.bombs <= 0 || ['clear', 'warning'].includes(G.state.phase)) return;
  G.state.bombs--;
  actionCallout('blast');
  G.hazards = [];
  const before = G.state.kills;
  G.state.blasting = true;
  for (const e of G.enemies) hitEnemy(e, e.boss ? TUNE.attack * TUNE.blastBoss : e.hp + 1);
  G.state.blasting = false;
  const killed = G.state.kills - before;
  if (killed > 0) {
    label(killed + '명 처치 · ' + G.state.combo + '연속', 240, 280, BR.gi.color, 20);
    G.labels[G.labels.length - 1].delay = 0.75;
  }
  emit('blast', { killed });
  skillBurst('blast', G.player.x, G.player.y - 40, 460, 0.85, '#7fe6cf');
  paintFX(3, G.player.x, G.player.y - 25, 270, 0.45);
  paintFX(3, 240, 330, 300, 0.4, 0, 0.12, 0.25);
  ring(G.player.x, G.player.y, '#abfff0', 20, 950, 0.65);
  ring(G.player.x, G.player.y, '#fff5c4', 10, 750, 0.5);
  if (!pfx('mana', G.player.x, G.player.y + 30, { palette: BLAST })) {
    impact(G.player.x, G.player.y, '#d5ffed', 130);
    burst(G.player.x, G.player.y, '#beffeb', 18, 320);
  }
  G.player.inv = Math.max(G.player.inv, 1.5);
  G.shake = 10;
  G.flash = 0.2;
  boom(true);
  notify('필살기', 0.8);
  syncHUD();
}
/** the damage of one basic shot; skills hit for multiples of it */
export const D = () => shotPower();
export interface ShotOptions {
  kind?: string;
  art?: string;
  color?: string;
  pierce?: boolean;
  w?: number;
  vy?: number;
  homing?: boolean;
  erase?: boolean;
}
export function fireShot(x, y, vx, dmg, o: ShotOptions = {}) {
  G.shots.push({
    x,
    y,
    prevY: y,
    vx,
    damage: dmg,
    r: 5,
    art: o.art,
    skill: visualSkill,
    kind: o.kind || 'knife',
    phase: G.time,
    color: o.color,
    pierce: o.pierce,
    w: o.w,
    vy: o.vy,
    homing: o.homing,
    erase: o.erase,
  });
}
export function fan(n, spread, dmg, color, kind = 'knife', art?: string) {
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * spread;
    fireShot(G.player.x, G.player.y - 30, Math.sin(a) * 820, dmg, { kind, art, color, vy: Math.cos(a) * 820 });
  }
}
/** Area burst is optional when the caller paints a separate swing; real hits always keep their impact cue. */
export function aoe(x, y, r, dmg, color, areaBurst = true) {
  for (const e of [...G.enemies]) {
    if (e.dead) continue;
    if (Math.hypot(e.x - x, e.y - y) < r + (e.boss ? 40 : e.r * 0.5)) hitEnemy(e, dmg, visualSkill);
  }
  if (areaBurst && (!visualSkill || !skillCue(visualSkill, x, y, r * 2, true, false, true))) {
    paintFX(color === BR.yu.color ? 4 : 2, x, y, r * 2, 0.38, 0, 0, 0.72);
    ring(x, y, color, 10, r, 0.35);
  }
}
export function column(x, dmg, color, w = 36, art = 'generic') {
  for (const e of [...G.enemies]) {
    if (e.dead) continue;
    if (Math.abs(e.x - x) < w + (e.boss ? 40 : e.r * 0.5)) hitEnemy(e, dmg, visualSkill);
  }
  const skill = visualSkill || (art === 'rain' ? 'geomu' : art === 'cheonma' ? 'art_cheonma' : undefined);
  const target = G.enemies.find(e => Math.abs(e.x - x) < w + e.r && e.y > 0);
  // How long the strike stays on screen (display only; the damage above is already done).
  const show = art === 'rain' ? 0.6 : art === 'cheonma' ? 0.55 : 0.32;
  G.strikes.push({ x, y: target?.y ?? 280, skill, w, color, art, life: show, total: show });
  tone(180, 0.18, 'sawtooth', 0.05, 90);
}
export function clearBullets(x, y, r) {
  for (const h of G.hazards)
    if (!h.warn && !h.dead && Math.hypot(h.x - x, h.y - y) < r) {
      h.dead = true;
      burst(h.x, h.y, BR.art.color, 4, 80);
    }
}
export function graze(h) {
  h.grazed = true;
  G.state.grazes++;
  const gx = (h.x + G.player.x) / 2,
    gy = (h.y + G.player.y) / 2;
  if (!pfx('hit', gx, gy, { palette: GRAZE })) burst(gx, gy, BR.yu.color, 5, 120);
  if (hasSkill('biyeon')) skillCue('biyeon', h.x, h.y, 65);
  if (G.time - (G.state.lastGraze || -1) > 0.06) {
    tone(1500, 0.04, 'sine', 0.04, 2100);
    G.state.lastGraze = G.time;
  }
  emit('graze', { h, x: h.x, y: h.y });
}
export function grazeEnemy(e) {
  if (hasSkill('biyeon')) skillCue('biyeon', G.player.x, G.player.y, 80);
  G.state.grazes++;
  const gx = (e.x + G.player.x) / 2;
  if (!pfx('hit', gx, G.player.y, { palette: GRAZE })) burst(gx, G.player.y, BR.yu.color, 5, 120);
  if (G.time - (G.state.lastGraze || -1) > 0.06) {
    tone(1500, 0.04, 'sine', 0.04, 2100);
    G.state.lastGraze = G.time;
  }
  emit('graze', { x: e.x, y: e.y, e });
}
