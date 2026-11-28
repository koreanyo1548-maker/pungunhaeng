// 공명 choice (2026-11, docs/resonance-plan.md): a met 조짐 opens it at the next safe step (systems/encounter.ts).
// Three 공명 기술 (systems/resonance.ts rollChoices): a new one or the next level of one held. One tap picks it; the
// fight waits until then (no countdown: it is a decision).
import { G } from '../core/context';
import { skillImage } from '../core/assets';
import { BR } from '../data/branches';
import { SKILLS, SKILL_LEVEL_MAX, SKILL_SLOTS, skillEffect } from '../data/skills';
import { openChoice } from './choice';
import { region } from '../systems/flow';
import { learn } from '../systems/abilities';
import { offerStep, rollChoices } from '../systems/resonance';
import { done } from '../systems/scene-flow';

export function openResonance() {
  const offers = rollChoices();
  if (!offers.length) return done('resonance');
  openChoice({
    eyebrow: `S${G.state.stage} ${region().name} · 공명 ${G.state.resonances}`,
    title: '공명',
    sub: `기술 하나를 고른다 · 기술 ${G.state.skills.length} / ${SKILL_SLOTS}`,
    cards: offers.map(id => {
      const d = SKILLS[id],
        step = offerStep(id);
      return {
        image: skillImage(id),
        artClass: 'skill-choice-art',
        color: BR[d.br].color,
        tag: step.from ? `Lv ${step.from} → ${step.to}${step.to >= SKILL_LEVEL_MAX ? ' (최고)' : ''}` : '새 기술',
        title: d.name,
        desc: `${skillEffect(id, step.to)}<br><small>${d.axis} 성장</small>`,
        onPick: () => {
          learn(id);
          done('resonance');
        },
      };
    }),
  });
}
