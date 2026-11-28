// 공명 (2026-11, docs/resonance-plan.md): what a met 조짐 gives. Three 공명 기술 are offered (CHOICES): a skill not
// held yet (while a slot is free, SKILL_SLOTS) or the next level of one held (up to SKILL_LEVEL_MAX). Which three
// is rolled from the gameplay stream, so a seed replays the same offers.
import { G } from '../core/context';
import { random } from '../core/rng';
import { SKILLS, SKILL_IDS, SKILL_LEVEL_MAX, SKILL_SLOTS } from '../data/skills';
import type { SkillId } from '../data/skills';

/** how many 공명 기술 a 공명 offers */
export const CHOICES = 3;

/** Every skill a 공명 could give now: new ones while a slot is free, and the next level of those held. */
export function candidates(): SkillId[] {
  const held = G.state.skills,
    free = held.length < SKILL_SLOTS;
  return SKILL_IDS.filter(id => {
    const s = held.find(x => x.id === id);
    return s ? s.level < SKILL_LEVEL_MAX : free;
  });
}

/** The offers of this 공명 (gameplay random): up to CHOICES of the candidates, in roster order. */
export function rollChoices(): SkillId[] {
  const pool = candidates(),
    out: SkillId[] = [];
  while (out.length < CHOICES && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out.sort((a, b) => SKILL_IDS.indexOf(a) - SKILL_IDS.indexOf(b));
}

/** "새 기술" or "Lv 1 → 2" for an offer */
export function offerStep(id: SkillId) {
  const s = G.state.skills.find(x => x.id === id);
  return s ? { from: s.level, to: s.level + 1 } : { from: 0, to: 1 };
}
export const skillName = (id: SkillId) => SKILLS[id].name;
