export type PixelEffectId =
  | 'impacts/hit-spark'
  | 'impacts/crit-hit'
  | 'impacts/parry'
  | 'impacts/shield-block'
  | 'holy/feather-burst'
  | 'pickups/collect-burst'
  | 'arcane/mana-burst'
  | 'explosions/plasma-explosion';
export interface PixelEffectModule {
  meta: { size: [number, number]; origin: [number, number]; duration: number; loop?: boolean; fps?: number };
}
export const EFFECTS: Record<PixelEffectId, PixelEffectModule>;
