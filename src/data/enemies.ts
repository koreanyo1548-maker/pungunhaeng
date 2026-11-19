// Enemy ranks: looks and size of tiers 1 to 6 (rank = tier − 1). Health comes from the tier ladder
// (data/baseline.ts `tierHealth`). Tiers 5 and 6 reuse tier 4's art with a `tint` until their own art comes
// (docs/codex-art-handoff.md).
export const RANKS: { type: number; size: number; r: number; color: string; tint?: string }[] = [
  { type: 1, size: 80, r: 22, color: '#ffb58e' },
  { type: 2, size: 90, r: 25, color: '#cf9cff' },
  { type: 4, size: 100, r: 28, color: '#9de6ff' },
  { type: 5, size: 112, r: 30, color: '#ffdb75' },
  { type: 5, size: 120, r: 32, color: '#ff8a8a', tint: '#ff3b3b' },
  { type: 5, size: 128, r: 34, color: '#c9a2ff', tint: '#8a3bff' },
];
