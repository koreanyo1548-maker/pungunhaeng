// DOM lookup by id. Typed loosely on purpose: callers use element-specific props (src, disabled, dataset…).
export const $ = (id: string): any => document.getElementById(id);
export const canvas: HTMLCanvasElement = $('canvas'),
  ctx = canvas.getContext('2d', { alpha: false });
export const W = 480,
  H = 800,
  PLAYER_Y = 654,
  BOSS_Y = 310;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
