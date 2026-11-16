import { IMG } from './manifest';
import { loadImage } from '../core/image';
import signature from './images/skills/signature.png';
import movement from './images/skills/movement.png';
import attack from './images/skills/attack.png';
import passive from './images/skills/passive.png';
import energy from './images/skills/energy.png';
import secret from './images/skills/secret.png';
import flight from './images/skills/flight.png';
import swapPoses from './images/skills/swap-poses.png';

export const heroineSkillSheets: Record<string, number> = Object.fromEntries(
  ['yeoncheong', 'cheongwan', 'seolyeong', 'soun', 'yoran', 'ayeong'].map((id, i) => [id, 8 + i]),
);
const sheets = [
  signature,
  movement,
  attack,
  passive,
  energy,
  secret,
  flight,
  swapPoses,
  ...Object.keys(heroineSkillSheets).map(id => IMG[`heroines/skill-${id}`]),
];
// [columns, rows] of each sheet, in the order above
const grids = [
  [6, 4],
  [6, 4],
  [6, 4],
  [6, 4],
  [6, 4],
  [6, 4],
  [6, 6],
  [4, 6],
  ...Object.keys(heroineSkillSheets).map(() => [6, 3]),
];
// The generated flight sheet is not on an exact grid: its columns sit this many source pixels right of their
// cell centres (measured; the same in every row). Cropping with it keeps a looping projectile from wobbling.
export const FLIGHT = 6;
const FLIGHT_DX = [20, 13, 5, 1, -7, -10];
/**
 * frames[sheet][row][column]: every frame cut into its own small canvas when the art loads. Drawing straight
 * from the 1536x1024 sheets made each call hold the whole decoded sheet until the frame was flushed, which
 * forced several mid-frame flushes once a few skills were active.
 */
export const frames: HTMLCanvasElement[][][] = [];
function slice(im: HTMLImageElement, sheet: number) {
  const [cols, rows] = grids[sheet],
    w = im.width / cols,
    h = im.height / rows;
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      const c = document.createElement('canvas');
      c.width = Math.round(w - 4);
      c.height = Math.round(h - 4);
      if (sheet >= 8) {
        const x = Math.round(col * w),
          y = Math.round(row * h);
        c.width = Math.round((col + 1) * w) - x;
        c.height = Math.round((row + 1) * h) - y;
        c.getContext('2d').drawImage(im, x, y, c.width, c.height, 0, 0, c.width, c.height);
        return c;
      }
      const dx = sheet === FLIGHT ? FLIGHT_DX[col] : 0;
      c.getContext('2d').drawImage(im, col * w + 2 + dx, row * h + 2, w - 4, h - 4, 0, 0, c.width, c.height);
      return c;
    }),
  );
}

export async function loadSkillArt() {
  await Promise.all(
    sheets.map(async (src, i) => {
      frames[i] = slice(await loadImage(src), i);
    }),
  );
}
