import { G } from '../core/context';
/** Read-only skill ownership, independent of execution and rendering. */
export function hasSkill(id: string): boolean {
  return !!G.state?.skills?.some(s => s.id === id);
}
