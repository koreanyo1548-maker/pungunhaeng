import { skillCue, queueSkillLearn } from '../render/skill-animation';
import { withSkill } from '../core/skill-context';
import { skillCallout } from '../render/callout';
import { on } from '../core/events';
import { G } from '../core/context';
import { W } from '../core/dom';
import { rnd } from '../core/math';
import { BR } from '../data/branches';
import { SKILLS, cooldown } from '../data/skills';
import { targetable } from '../entities/enemies';
import { D, column } from './combat';
import { syncHUD } from '../ui/hud';

// 인연 단계 skills at work (definitions in data/skills.ts). Action skills fire from combat events, tick skills on
// their period while the stage fights, passive ones are read where the game uses them.
export { hasSkill } from './skill-state';
export function trig(type, data = {}) {
  if (!G.state) return;
  for (const s of [...G.state.skills]) {
    const d = SKILLS[s.id];
    if (d.trig !== type || G.time < (s.ready || 0)) continue;
    executeSkill(s, cooldown(d), () => d.fx?.(data, s));
  }
}
export function updateSkills(dt) {
  for (const s of G.strikes) s.life -= dt;
  G.strikes = G.strikes.filter(s => s.life > 0);
  const active = ['flight', 'boss'].includes(G.state.phase);
  for (const s of [...G.state.skills]) {
    const d = SKILLS[s.id];
    if (d.trig !== 'tick' || !active || G.time < (s.ready || 0)) continue;
    executeSkill(s, cooldown(d), () => d.fx(null, s));
  }
  if (G.state.rain > 0) {
    G.state.rain -= dt;
    G.state.rainTimer -= dt;
    if (G.state.rainTimer <= 0) {
      G.state.rainTimer = 0.16;
      const list = G.enemies.filter(targetable);
      const t = list.length ? list[Math.floor(rnd(0, list.length))] : null;
      column(t ? t.x : rnd(40, W - 40), D() * 4, BR.gi.color, 26, 'rain');
    }
  }
}
/** An 인연 teaches a skill (their next level): it lasts for the run. The 의뢰 success banner names it. */
export function learn(id) {
  G.state.skills.push({ id });
  SKILLS[id].gain?.();
  queueSkillLearn(id);
  syncHUD();
}

// Skills with an action trigger fire from combat events (tick skills run in updateSkills).
export function registerAbilityListeners() {
  on('blast', d => trig('blast', d));
  on('graze', d => trig('graze', d));
  on('step', d => trig('step', d));
  on('rowClear', () => trig('rowClear'));
  on('nearKill', d => trig('nearKill', d));
}

/** Visuals are emitted only for actual effects; the gameplay callback still always runs. False when it did nothing. */
function performSkill(s, fn): boolean {
  const id = s.id,
    shield = G.player.shield,
    negate = G.state.negate;
  const hasTarget = G.enemies.some(targetable);
  withSkill(id, fn);
  // a shield or a 회춘단 block is named when it actually forms
  if (id === 'art_cheolgap') {
    if (G.player.shield && !shield) skillCallout(s);
    return !shield;
  }
  if (id === 'hoechun') {
    if (G.state.negate && !negate) skillCallout(s);
    return !negate;
  }
  if (id === 'art_cheonma' && !hasTarget) return false;
  skillCallout(s);
  if (!['yusu', 'bungsan', 'art_cheonma'].includes(id)) skillCue(id, G.player.x, G.player.y - 45, 115);
  return true;
}

/** Called only after each trigger's own eligibility checks; keep execution order identical. */
function executeSkill(s, cooldown: number, effect: () => void) {
  s.ready = G.time + cooldown;
  // the HUD chip lights only when the skill did something
  if (performSkill(s, effect)) s.flash = G.time;
}
