// Run plan: the ordered list of gates a run goes through. The flow (scene-flow.ts) and the rules that differ on
// the final gate ask the plan, not the region data, so a different kind of run only has to build a different plan.
//   kind 'gate'  인연 → stage → 투학 → 객잔
//   kind 'final' 최종 관문 → stage → 결과
// Stage mode: the course's fixed list (3 gates + final). An endless mode would build or extend the plan as it goes.
import { G } from '../core/context';
import { COURSES } from '../data/courses';

export type GateKind = 'gate' | 'final';
export interface PlannedGate {
  kind: GateKind;
  region: any;
}

export function buildStagePlan(course: string): PlannedGate[] {
  return COURSES[course].regions.map(region => ({ kind: region.final ? 'final' : 'gate', region }));
}

// before a course is picked (title, course select) the screens still draw a region: use the default course's plan
const previewPlans: Record<string, PlannedGate[]> = {};
function plan(): PlannedGate[] {
  if (G.state?.plan) return G.state.plan;
  const course = G.state?.course || 'ground';
  return (previewPlans[course] ??= buildStagePlan(course));
}

/** the gate for the current stage (stage 1 = first entry) */
export function currentGate(): PlannedGate {
  const p = plan();
  return p[Math.min(G.state.stage, p.length) - 1];
}

/** true on the last gate of a stage-mode run (최종 관문: 심마, 인연의 결산, no 화두) */
export const isFinal = (): boolean => currentGate().kind === 'final';
