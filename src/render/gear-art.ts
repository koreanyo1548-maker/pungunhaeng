// Pictures of 장비 drawn in code until Codex draws them (docs/codex-art-handoff.md): a tile framed by the 등급
// with a shape for the slot (검, 옷, 패, 책) in the item's color. Cached as data URLs for the DOM screens.
import { GEAR_ITEMS } from '../data/gear';
import type { GearItemId, Slot } from '../data/gear';

/** frame colors of ★1 / ★2 / ★3 */
export const GRADE_COLORS = ['#9aa7b4', '#6fd6c2', '#ffcf6a'];
const cache = new Map<string, string>();

function shape(c: CanvasRenderingContext2D, slot: Slot, color: string) {
  c.fillStyle = color;
  c.strokeStyle = 'rgba(20,16,12,.85)';
  c.lineWidth = 3;
  c.lineJoin = 'round';
  c.beginPath();
  if (slot === 'weapon') {
    // a sword, point up and to the right
    c.save();
    c.translate(48, 50);
    c.rotate(Math.PI / 4);
    c.moveTo(-5, 14);
    c.lineTo(-5, -30);
    c.lineTo(0, -38);
    c.lineTo(5, -30);
    c.lineTo(5, 14);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.rect(-14, 14, 28, 6);
    c.rect(-3, 20, 6, 14);
    c.fillStyle = '#6b4a2c';
    c.fill();
    c.stroke();
    c.restore();
  } else if (slot === 'robe') {
    // a robe: shoulders, wide sleeves, a crossed collar
    c.moveTo(34, 20);
    c.lineTo(62, 20);
    c.lineTo(80, 38);
    c.lineTo(70, 46);
    c.lineTo(64, 40);
    c.lineTo(66, 78);
    c.lineTo(30, 78);
    c.lineTo(32, 40);
    c.lineTo(26, 46);
    c.lineTo(16, 38);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(38, 20);
    c.lineTo(52, 46);
    c.moveTo(58, 20);
    c.lineTo(44, 46);
    c.stroke();
  } else if (slot === 'charm') {
    // a round 패 on a cord, with a square hole like a coin
    c.moveTo(48, 12);
    c.lineTo(48, 26);
    c.stroke();
    c.beginPath();
    c.arc(48, 52, 24, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.rect(41, 45, 14, 14);
    c.fillStyle = 'rgba(20,16,12,.85)';
    c.fill();
  } else {
    // a bound book (비급) with a title strip
    c.rect(24, 18, 48, 62);
    c.fill();
    c.stroke();
    c.beginPath();
    c.rect(52, 26, 12, 40);
    c.fillStyle = '#f4ead4';
    c.fill();
    c.stroke();
    c.beginPath();
    for (const y of [28, 44, 60]) {
      c.moveTo(24, y);
      c.lineTo(30, y);
    }
    c.stroke();
  }
}

/** A tile picture of an item at a 등급 (0: no grade frame, an empty slot). */
export function gearPicture(item: GearItemId | null, grade: number, slot?: Slot): string {
  const key = `${item ?? slot}:${grade}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const c = canvas.getContext('2d');
  if (!c) return '';
  const frame = grade ? GRADE_COLORS[grade - 1] : '#5b5247';
  c.fillStyle = '#211b16';
  c.strokeStyle = frame;
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(4, 4, 88, 88, 14);
  c.fill();
  c.stroke();
  if (grade) {
    const glow = c.createRadialGradient(48, 48, 6, 48, 48, 44);
    glow.addColorStop(0, frame + '55');
    glow.addColorStop(1, frame + '00');
    c.fillStyle = glow;
    c.fill();
  }
  const s = item ? GEAR_ITEMS[item].slot : slot!;
  c.globalAlpha = item ? 1 : 0.28;
  shape(c, s, item ? GEAR_ITEMS[item].color : '#d6cdbd');
  c.globalAlpha = 1;
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}
/** an empty slot's picture */
export const slotPicture = (slot: Slot) => gearPicture(null, 0, slot);
