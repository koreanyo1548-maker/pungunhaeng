import { G } from '../core/context';

/** This 인연's level from 호감도 for the current run (0 to 5), from the snapshot taken when the run started. */
export const cardRank = (id: string): number => G.state?.meta?.cards?.[id] ?? 0;
/** An 인연's level in this run: 0 (not yet) to 3. */
export const bondLevel = (id: string): number => G.state?.bond?.[id] ?? 0;
