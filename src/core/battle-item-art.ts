// Six chest states and one dual-shot pickup, generated art/originals/battle-items.png.
// Cell order/registration: docs/battle-item-art.md. Runtime cropping leaves originals intact.
import url from '../assets/images/battle-items.webp';
import { loadImage, makeWhite } from './image';

const frames: HTMLCanvasElement[] = [];
let white: HTMLCanvasElement;
export const CHEST_ORIGIN_Y = 0.62;
export async function loadBattleItemArt() {
  const sheet = await loadImage(url);
  for (let i = 0; i < 7; i++) {
    const col = i % 4,
      row = Math.floor(i / 4);
    const x = Math.round((col * sheet.width) / 4),
      y = Math.round((row * sheet.height) / 2);
    const w = Math.round(((col + 1) * sheet.width) / 4) - x,
      h = Math.round(((row + 1) * sheet.height) / 2) - y;
    const frame = document.createElement('canvas');
    frame.width = frame.height = 256;
    // The pickup uses less of its cell than the chest; trim its authored outer padding
    // so 56px has the same visible weight as the existing item icons.
    const inset = i === 6 ? 0.1 : 0;
    frame
      .getContext('2d')!
      .drawImage(sheet, x + w * inset, y + h * inset, w * (1 - inset * 2), h * (1 - inset * 2), 0, 0, 256, 256);
    frames.push(frame);
  }
  white = makeWhite(frames[0]);
}
export const battleChestArt = () => ({ image: frames[0], white });
export const battleChestFrame = (index: number) => frames[index];
export const dualShotArt = () => frames[6];
