import { G } from '../core/context';

/** 인연 card level of this 인연 for the current run (0 to 5), from the snapshot taken when the run started. */
export const cardRank = (id: string): number => G.state?.meta?.cards?.[id] ?? 0;
/** True when the run started with this 인연's card: only then can the 인연 come to a 만남. */
export const hasCard = (id: string): boolean => cardRank(id) >= 1;
/** An 인연's level in this run: 0 (not yet) to 3. */
export const bondLevel = (id: string): number => G.state?.bond?.[id] ?? 0;
