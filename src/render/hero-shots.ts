import type { HeroId } from '../data/roster';
import { ctx, reduced } from '../core/dom';
import { loadImage } from '../core/image';
import evolution01 from '../assets/images/hero-shots/evolution-01.webp';
import evolution02 from '../assets/images/hero-shots/evolution-02.webp';
import evolution03 from '../assets/images/hero-shots/evolution-03.webp';

const sheets = [evolution01, evolution02, evolution03];
const groups: HeroId[][] = [
  ['pungun', 'cheolhyeol', 'mukyoung', 'bicheon'],
  ['unhak', 'hongryeon', 'yeoncheong', 'cheongwan'],
  ['seolyeong', 'soun', 'yoran', 'ayeong'],
];
// Authored source row edges: the final row has extra room for the tall sword/arrow tips.
const rowEdges = [0, 256, 512, 736, 1024];
// Visible artwork boxes in game pixels, independent of collision geometry and source padding.
const sizes: Record<HeroId, [number, number]> = {
  pungun: [30, 30],
  cheolhyeol: [28, 32],
  mukyoung: [28, 28],
  bicheon: [22, 36],
  unhak: [26, 34],
  hongryeon: [22, 34],
  yeoncheong: [20, 32],
  cheongwan: [24, 38],
  seolyeong: [24, 34],
  soun: [24, 34],
  yoran: [24, 34],
  ayeong: [24, 36],
};
const growth = [1, 1.16, 1.32];
type Sprite = { image: HTMLCanvasElement; width: number; height: number };
const sprites = new Map<string, Sprite>();

/** Decode once and cache 36 tight alpha cutouts; drawing never scans pixels or retains a full atlas. */
export async function loadHeroShotArt() {
  await Promise.all(
    sheets.map(async (url, sheet) => {
      const atlas = await loadImage(url);
      for (let row = 0; row < 4; row++)
        for (let stage = 1; stage <= 3; stage++) {
          const left = Math.round(((stage - 1) * atlas.width) / 3);
          const right = Math.round((stage * atlas.width) / 3);
          const top = Math.round((rowEdges[row] * atlas.height) / 1024);
          const bottom = Math.round((rowEdges[row + 1] * atlas.height) / 1024);
          const cell = document.createElement('canvas');
          cell.width = right - left;
          cell.height = bottom - top;
          const c = cell.getContext('2d')!;
          c.drawImage(atlas, left, top, cell.width, cell.height, 0, 0, cell.width, cell.height);
          const pixels = c.getImageData(0, 0, cell.width, cell.height).data;
          let x0 = cell.width,
            y0 = cell.height,
            x1 = -1,
            y1 = -1;
          for (let y = 0; y < cell.height; y++)
            for (let x = 0; x < cell.width; x++) {
              if (pixels[(y * cell.width + x) * 4 + 3] < 32) continue;
              x0 = Math.min(x0, x);
              y0 = Math.min(y0, y);
              x1 = Math.max(x1, x);
              y1 = Math.max(y1, y);
            }
          if (x1 < x0) throw new Error(`Empty hero projectile: ${sheet}/${row}/${stage}`);
          const padding = 3;
          x0 = Math.max(0, x0 - padding);
          y0 = Math.max(0, y0 - padding);
          x1 = Math.min(cell.width - 1, x1 + padding);
          y1 = Math.min(cell.height - 1, y1 + padding);
          const image = document.createElement('canvas');
          image.width = x1 - x0 + 1;
          image.height = y1 - y0 + 1;
          image.getContext('2d')!.drawImage(cell, x0, y0, image.width, image.height, 0, 0, image.width, image.height);
          const hero = groups[sheet][row],
            [width, height] = sizes[hero],
            scale = growth[stage - 1];
          sprites.set(hero + stage, { image, width: width * scale, height: height * scale });
        }
    }),
  );
}

export function drawHeroShot(
  hero: HeroId,
  stage: number,
  x: number,
  y: number,
  angle: number,
  age: number,
  target: CanvasRenderingContext2D = ctx,
) {
  const sprite = sprites.get(hero + stage);
  if (!sprite) return;
  const { image, width, height } = sprite;
  target.save();
  target.translate(x, y);
  target.rotate(angle);
  if (stage === 3 && !reduced) {
    target.save();
    target.globalAlpha *= 0.2;
    target.drawImage(image, -width * 0.4, -height * 0.4 + 10, width * 0.8, height * 0.8);
    target.restore();
  }
  if (hero === 'mukyoung' && !reduced) target.rotate(age * 12);
  target.drawImage(image, -width / 2, -height / 2, width, height);
  target.restore();
}

/** Art diagnostics for the visual regression harness; never used by gameplay. */
export function heroShotArtSnapshot() {
  return [...sprites].map(([id, s]) => ({
    id,
    width: s.width,
    height: s.height,
    pixels: [s.image.width, s.image.height],
  }));
}
