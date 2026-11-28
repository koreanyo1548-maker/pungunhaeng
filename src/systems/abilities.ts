import { skillCue, queueSkillLearn } from '../render/skill-animation';
import { withSkill } from '../core/skill-context';
import { resetCallout, skillCallout } from '../render/callout';
import { on } from '../core/events';
import { G } from '../core/context';
import { SKILLS, SKILL_LEVEL_MAX, cooldown } from '../data/skills';
import type { SkillId } from '../data/skills';
import { targetable } from '../entities/enemies';
import { syncHUD } from '../ui/hud';
import type { SkillInstance } from '../core/state-types';

// 공명 기술 at work (definitions in data/skills.ts). Event skills fire from combat events, tick skills on their
// period while the stage fights, aura skills every frame, and window skills (systems/skill-state.ts) are read
// where the game uses them; their clock only runs while the stage fights.
export { hasSkill } from './skill-state';
const fighting = () => ['flight', 'boss'].includes(G.state.phase);

export function trig(type, data = {}) {
  if (!G.state) return;
  for (const s of [...G.state.skills]) {
    const d = SKILLS[s.id];
    if (d.trig !== type || G.time < (s.ready || 0)) continue;
    executeSkill(s, cooldown(d, s.level), () => d.fx?.(data, s.level, s));
  }
}
export function updateSkills(dt) {
  for (const s of G.strikes) s.life -= dt;
  G.strikes = G.strikes.filter(s => s.life > 0);
  if (!fighting()) return;
  for (const s of [...G.state.skills]) {
    const d = SKILLS[s.id];
    if (d.trig === 'window') {
      s.clock = (s.clock ?? 0) + dt;
      continue;
    }
    if (d.trig === 'aura') {
      withSkill(s.id, () => d.fx(dt, s.level, s));
      continue;
    }
    if (d.trig !== 'tick' || G.time < (s.ready || 0)) continue;
    executeSkill(s, cooldown(d, s.level), () => d.fx(null, s.level, s));
  }
}
/** 공명: a new skill (level 1), or the next level of one held. It lasts for the run. */
export function learn(id: SkillId) {
  const held = G.state.skills.find(s => s.id === id);
  if (held) {
    held.level = Math.min(SKILL_LEVEL_MAX, held.level + 1);
    resetCallout(held);
  } else G.state.skills.push({ id, level: 1 });
  queueSkillLearn(id);
  syncHUD();
}

// Skills with an action trigger fire from combat events (tick skills run in updateSkills).
export function registerAbilityListeners() {
  on('graze', d => trig('graze', d));
  on('step', d => trig('step', d));
  on('nearKill', d => trig('nearKill', d));
}

/** Visuals are emitted only for actual effects; the gameplay callback still always runs. False when it did nothing. */
function performSkill(s: SkillInstance, fn): boolean {
  const id = s.id,
    hasTarget = G.enemies.some(targetable);
  withSkill(id, fn);
  if (id === 'art_cheonma' && !hasTarget) return false;
  skillCallout(s);
  if (!['bungsan', 'art_cheonma'].includes(id)) skillCue(id, G.player.x, G.player.y - 45, 115);
  return true;
}

/** Called only after each trigger's own eligibility checks; keep execution order identical. */
function executeSkill(s: SkillInstance, cooldown: number, effect: () => void) {
  s.ready = G.time + cooldown;
  // the HUD chip lights only when the skill did something
  if (performSkill(s, effect)) s.flash = G.time;
}
