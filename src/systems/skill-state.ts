import { G } from '../core/context';
// Read-only 공명 기술 ownership, independent of execution and rendering (data/skills.ts, systems/abilities.ts).

/** skills on for part of a cycle: `on` seconds of every `period` at levels 1 to 3 (Lv3: always on). Provisional. */
export const WINDOWS = {
  hongryeonhwa: { period: 12, on: [6, 9, 12] },
  grimja: { period: 10, on: [5, 7.5, 10] },
};

export function hasSkill(id: string): boolean {
  return !!G.state?.skills?.some(s => s.id === id);
}
/** the level of a held skill, 0 when not held */
export function skillLevel(id: string): number {
  return G.state?.skills?.find(s => s.id === id)?.level ?? 0;
}
/** Whether a window skill (WINDOWS) is on now: its clock runs only while the stage fights (systems/abilities.ts). */
export function windowOn(id: keyof typeof WINDOWS): boolean {
  const s = G.state?.skills?.find(x => x.id === id);
  if (!s) return false;
  const w = WINDOWS[id],
    on = w.on[Math.min(w.on.length, s.level) - 1];
  return on >= w.period || (s.clock ?? 0) % w.period < on;
}
