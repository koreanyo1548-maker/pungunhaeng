// Generated original art: art/originals/gear.png, 4 columns × 5 rows (docs/gear-ui.md).
import atlasUrl from '../assets/images/gear.webp';
import { loadImage } from '../core/image';
import { GEAR_ITEM_IDS } from '../data/gear';
import type { GearItemId, Slot } from '../data/gear';

export const GRADE_COLORS = ['#9aa7b4', '#6fd6c2', '#ffcf6a'];
const pictures: string[] = [];
/** the 장비 상자 cell, kept as a canvas to draw in play (render/elite-art.ts) */
let boxCanvas: HTMLCanvasElement | null = null;
export async function loadGearArt() {
  const atlas = await loadImage(atlasUrl);
  for (let i = 0; i < 20; i++) {
    const c = document.createElement('canvas');
    c.width = c.height = 144;
    c.getContext('2d')!.drawImage(
      atlas,
      ((i % 4) * atlas.width) / 4,
      (Math.floor(i / 4) * atlas.height) / 5,
      atlas.width / 4,
      atlas.height / 5,
      0,
      0,
      144,
      144,
    );
    pictures[i] = c.toDataURL();
    if (i === 15) boxCanvas = c;
  }
}
export function gearPicture(item: GearItemId | null, _grade: number, slot?: Slot): string {
  return item ? pictures[GEAR_ITEM_IDS.indexOf(item)] : slotPicture(slot!);
}
export const slotPicture = (slot: Slot) => pictures[16 + ['weapon', 'robe', 'charm', 'manual'].indexOf(slot)];
export const gearBoxPicture = () => pictures[15];
/** the 장비 상자 for the canvas (null until the sheet is loaded) */
export const gearBoxImage = () => boxCanvas;
