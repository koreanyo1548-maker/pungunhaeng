import batsUrl from '../assets/images/slime-battle/bat-wings.webp';
import heroUrl from '../assets/images/slime-battle/hero-hover.webp';
import shotUrl from '../assets/images/slime-battle/shot.webp';
import worldUrl from '../assets/images/slime-battle/world.webp';
import { cropArt, loadImage, makeWhite } from './image';

/** Presentation only: six ranks share one draw size, independent of their hit radii. */
export const BAT_DRAW_SIZE = 96;
export const SLIME_SHOT_SIZE = 80;
export const SLIME_HOVER_FPS = 5;
export const BAT_WING_FPS = 7;
export const WORLD_OVERLAP = 0.06;
export const batFrames: HTMLCanvasElement[][] = [];
export const batWhites: HTMLCanvasElement[][] = [];
export let slimeFrames: HTMLCanvasElement[] = [];
export let slimeShot: HTMLImageElement;
export let gothicWorld: HTMLCanvasElement;

export async function loadSlimeBattleArt() {
  const [bats, hero, shot, world] = await Promise.all([batsUrl, heroUrl, shotUrl, worldUrl].map(loadImage));
  slimeFrames = [0, 1, 2, 3].map(col => cropArt(hero, 4, 1, col, 0));
  slimeShot = shot;
  for (let rank = 0; rank < 6; rank++) {
    batFrames[rank] = [0, 1, 2, 3].map(col => cropArt(bats, 4, 6, col, rank));
    batWhites[rank] = batFrames[rank].map(makeWhite);
  }
  // Fade the top of each upright tile over the previous tile's bottom. Cache once;
  // scrolling uses the original speed and never flips the architecture upside down.
  gothicWorld = document.createElement('canvas');
  gothicWorld.width = world.width;
  gothicWorld.height = world.height;
  const g = gothicWorld.getContext('2d')!;
  g.drawImage(world, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const fade = g.createLinearGradient(0, 0, 0, world.height * WORLD_OVERLAP);
  fade.addColorStop(0, 'transparent');
  fade.addColorStop(1, '#fff');
  g.fillStyle = fade;
  g.fillRect(0, 0, world.width, world.height);
}
