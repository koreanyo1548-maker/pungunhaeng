import type { HeroId } from '../data/roster';
import { ctx, reduced } from '../core/dom';

// Local outlines point upward. Each weapon has its own edge, engraving and evolved silhouette.
type Ink = [string, string, string, string];
const weapons: Record<HeroId, Ink> = {
  pungun: [
    '#54dcb0',
    'M-19 6 Q-14 -12 0 -18 Q14 -12 19 6 Q6 -3 0 2 Q-6 -3 -19 6Z',
    'M-12 0 Q0 -17 12 0',
    'M-20 5 Q-18 16 -6 18 Q-15 11 -12 5 M20 5 Q18 16 6 18 Q15 11 12 5',
  ],
  cheolhyeol: [
    '#efaa55',
    'M-13 7 L-16 -8 -11 -14 -6 -13 -2 -17 3 -15 8 -15 14 -10 14 2 8 14 -6 17Z',
    'M-10 -9 L-7 -2 M-2 -11 L0 -3 M6 -10 L8 -4',
    'M-15 -4 L-20 -14 -19 5 -10 12 M15 -4 L20 -14 19 5 10 12',
  ],
  mukyoung: [
    '#b28cd9',
    'M0 -20 Q3 -9 13 -10 L6 -2 19 5 Q7 5 6 16 L0 8 -15 15 Q-9 5 -19 -2 L-7 -4Z',
    'M0 -7 L5 0 0 5 -5 0Z',
    'M-19 7 Q-11 21 3 19 M4 -19 Q17 -17 20 -6',
  ],
  bicheon: [
    '#79cffa',
    'M0 -24 L6 -10 4 9 11 10 11 13 2 13 2 22 -2 22 -2 13 -11 13 -11 10 -4 9 -6 -10Z',
    'M0 -18 L0 8',
    'M-7 -12 L-14 3 -10 10 M7 -12 L14 3 10 10',
  ],
  unhak: [
    '#b4eddf',
    'M10 -23 Q16 -1 6 7 L7 2 -1 13 -1 8 -13 19 Q-14 -8 10 -23Z',
    'M-13 19 Q1 -3 9 -19',
    'M-6 5 Q-22 2 -21 -12 Q-9 -10 -6 5 M4 4 Q20 -3 19 -16 Q7 -9 4 4',
  ],
  hongryeon: [
    '#ff845e',
    'M8 -23 Q15 -5 2 6 L1 11 -6 13 -12 21 -15 17 -8 7 -9 2 Q3 0 8 -23Z',
    'M7 -15 Q8 -2 -4 5',
    'M-4 9 Q-22 5 -17 -11 Q-13 0 -4 1 M3 11 Q18 5 18 -6 Q10 2 3 2',
  ],
  yeoncheong: [
    '#79e0d3',
    'M0 -25 L5 -3 3 13 7 18 0 23 -7 18 -3 13 -5 -3Z',
    'M0 -16 L0 12 M-3 18 L0 15 3 18 0 21Z',
    'M-6 -8 Q-18 4 -5 12 Q7 20 12 8 Q15 0 5 -4',
  ],
  cheongwan: [
    '#73bdf3',
    'M0 -25 L10 -4 5 -6 3 3 9 14 2 10 1 23 -2 23 -3 9 -10 14 -4 2 -5 -6 -10 -4Z',
    'M0 -18 L0 2',
    'M-8 -3 Q-19 4 3 10 Q15 14 5 19 M8 -14 L14 -4 10 2',
  ],
  seolyeong: [
    '#cb8aef',
    'M8 -23 Q-20 -17 -3 -1 Q11 11 -12 19 Q16 17 7 1 Q-8 -11 8 -23Z',
    'M2 -17 Q-10 -9 2 1',
    'M-2 -18 L-8 -24 -13 -15 -8 -10 M7 5 Q20 14 -1 22',
  ],
  soun: ['#bcd9ff', 'M10 -24 L3 1 -6 10 -3 2 -14 18 -7 -2Z', 'M6 -14 L-4 4', 'M-14 -10 L13 7 9 9 -16 -5Z'],
  yoran: [
    '#e2bbff',
    'M0 -22 L11 -4 7 6 0 15 -7 6 -11 -4Z',
    'M0 -12 L5 -3 0 5 -5 -3Z',
    'M-14 -7 L-18 0 -9 10 M14 -7 L18 0 9 10 M0 12 L4 17 0 22 -4 17Z',
  ],
  ayeong: [
    '#f5d176',
    'M0 -24 L11 -8 3 -11 2 10 8 6 7 16 0 22 -7 16 -8 6 -2 10 -3 -11 -11 -8Z',
    'M0 -16 L0 14',
    'M-3 4 Q-13 -8 -21 -7 L-15 3 -9 4 -12 8 -3 12 M3 4 Q13 -8 21 -7 L15 3 9 4 12 8 3 12',
  ],
};
const cache = new Map<string, HTMLCanvasElement>();
function stamp(hero: HeroId, stage: number) {
  const key = hero + stage;
  let sprite = cache.get(key);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = 128;
  const c = sprite.getContext('2d')!;
  c.translate(64, 64);
  c.scale(2, 2);
  const [color, shape, detail, evolution] = weapons[hero];
  const body = new Path2D(shape);
  const metallic = c.createLinearGradient(-12, -4, 12, 8);
  metallic.addColorStop(0, '#fff7de');
  metallic.addColorStop(0.38, color);
  metallic.addColorStop(0.55, '#fffbea');
  metallic.addColorStop(1, color);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = '#192838';
  c.lineWidth = 3;
  c.stroke(body);
  c.fillStyle = metallic;
  c.fill(body);
  c.strokeStyle = '#37545e';
  c.lineWidth = 1.4;
  c.stroke(new Path2D(detail));
  if (stage >= 2) {
    const accent = new Path2D(evolution);
    c.strokeStyle = '#20313a';
    c.lineWidth = 4;
    c.stroke(accent);
    c.strokeStyle = color;
    c.lineWidth = 2.2;
    c.stroke(accent);
  }
  if (stage === 3) {
    c.strokeStyle = '#fff6c4';
    c.lineWidth = 1.5;
    c.stroke(body);
  }
  cache.set(key, sprite);
  return sprite;
}
export function drawHeroShot(hero: HeroId, stage: number, x: number, y: number, angle: number, age: number) {
  const sprite = stamp(hero, stage);
  const size = [0, 74, 86, 98][stage];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (stage === 3 && !reduced) {
    ctx.globalAlpha *= 0.24;
    ctx.drawImage(sprite, -size * 0.4, -size * 0.4 + 12, size * 0.8, size * 0.8);
    ctx.globalAlpha /= 0.24;
  }
  if (hero === 'mukyoung' && !reduced) ctx.rotate(age * 12);
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  ctx.restore();
}
