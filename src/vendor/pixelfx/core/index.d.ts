// Minimal typings for the parts of pixelfx core the game calls.
export interface PixelFrame {
  w: number;
  h: number;
  ox: number;
  oy: number;
  color: Uint32Array<ArrayBuffer>;
  light: Uint32Array<ArrayBuffer>;
}
export interface PixelFx {
  readonly t: number;
  update(dt: number): void;
  draw(frame: PixelFrame, layer?: 'back' | 'front'): void;
  stop(): void;
  done(): boolean;
}
export function createFrame(w: number, h: number, ox?: number, oy?: number): PixelFrame;
export function clearFrame(frame: PixelFrame): PixelFrame;
export function createFx(mod: unknown, options?: Record<string, unknown>): PixelFx;
export function composite(
  frame: PixelFrame,
  out: Uint8ClampedArray,
  bg?: number | Uint32Array | null,
  lightK?: number,
): Uint8ClampedArray;
