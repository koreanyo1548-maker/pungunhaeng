import imageDimensions from './image-dimensions.json';
import { IMG } from './manifest';
import { loadImage } from '../core/image';
import signature from './images/skills/signature.webp';
import movement from './images/skills/movement.webp';
import attack from './images/skills/attack.webp';
import passive from './images/skills/passive.webp';
import energy from './images/skills/energy.webp';
import secret from './images/skills/secret.webp';
import flight from './images/skills/flight.webp';
import swapPoses from './images/skills/swap-poses.webp';

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
const sourceKeys = [
  'skills/signature.webp',
  'skills/movement.webp',
  'skills/attack.webp',
  'skills/passive.webp',
  'skills/energy.webp',
  'skills/secret.webp',
  'skills/flight.webp',
  'skills/swap-poses.webp',
  ...Object.keys(heroineSkillSheets).map(id => `heroines/skill-${id}.webp`),
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
    [sourceWidth, sourceHeight] = imageDimensions[sourceKeys[sheet]].source,
    scaleX = im.width / sourceWidth,
    scaleY = im.height / sourceHeight,
    w = sourceWidth / cols,
    h = sourceHeight / rows;
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      const c = document.createElement('canvas');
      c.width = Math.round((w - 4) * scaleX);
      c.height = Math.round((h - 4) * scaleY);
      if (sheet >= 8) {
        const x = Math.round(col * w),
          y = Math.round(row * h);
        const width = Math.round((col + 1) * w) - x,
          height = Math.round((row + 1) * h) - y;
        c.width = Math.round(width * scaleX);
        c.height = Math.round(height * scaleY);
        c.getContext('2d').drawImage(
          im,
          x * scaleX,
          y * scaleY,
          width * scaleX,
          height * scaleY,
          0,
          0,
          c.width,
          c.height,
        );
        return c;
      }
      const dx = sheet === FLIGHT ? FLIGHT_DX[col] : 0;
      c.getContext('2d').drawImage(
        im,
        (col * w + 2 + dx) * scaleX,
        (row * h + 2) * scaleY,
        (w - 4) * scaleX,
        (h - 4) * scaleY,
        0,
        0,
        c.width,
        c.height,
      );
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
