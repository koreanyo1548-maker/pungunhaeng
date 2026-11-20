// Stand-in art until Codex delivers the real pictures (docs/codex-art-handoff.md): tinted copies of tier 4 for tiers
// 5 and 6, a drawn 보물상자, a drawn 보석 and a drawn 듀얼샷 item. Made once, cached; cosmetic only.
type Canvas = HTMLCanvasElement;
const tintCache = new Map<CanvasImageSource, Map<string, Canvas>>();

/** `image` with `color` laid over its opaque pixels (`strength` 0 to 1), cached. */
export function tinted(image: CanvasImageSource & { width: number; height: number }, color: string, strength = 0.5) {
  let byColor = tintCache.get(image);
  if (!byColor) tintCache.set(image, (byColor = new Map()));
  const key = color + strength;
  let c = byColor.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.drawImage(image, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = strength;
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    byColor.set(key, c);
  }
  return c;
}

let chest: Canvas | null = null,
  chestWhite: Canvas | null = null;
/** a wooden 보물상자 with gold bands and a lock (96×84), and its white hit silhouette */
export function chestArt() {
  if (!chest) {
    chest = document.createElement('canvas');
    chest.width = 96;
    chest.height = 84;
    const g = chest.getContext('2d') as CanvasRenderingContext2D;
    g.lineJoin = 'round';
    // lid and body
    g.fillStyle = '#7a3f1d';
    g.strokeStyle = '#2b1408';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(10, 34);
    g.quadraticCurveTo(48, 6, 86, 34);
    g.lineTo(86, 76);
    g.lineTo(10, 76);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#9a5528';
    g.fillRect(14, 40, 68, 32);
    // gold bands, the lid's edge and the lock
    g.fillStyle = '#f2c14e';
    g.fillRect(10, 34, 76, 7);
    g.fillRect(22, 18, 8, 58);
    g.fillRect(66, 18, 8, 58);
    g.strokeStyle = '#6b4a10';
    g.lineWidth = 2;
    g.strokeRect(10, 34, 76, 7);
    g.fillStyle = '#ffe08a';
    g.fillRect(40, 38, 16, 18);
    g.strokeRect(40, 38, 16, 18);
    g.fillStyle = '#3a2508';
    g.fillRect(46, 45, 4, 7);
    chestWhite = tinted(chest, '#ffffff', 1);
  }
  return { image: chest, white: chestWhite as Canvas };
}

/** draws a 보석 (a cut ruby, about 26 px) at the origin */
export function drawGem(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(12, -4);
  ctx.lineTo(0, 14);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fillStyle = '#e8304f';
  ctx.fill();
  ctx.strokeStyle = '#5a0716';
  ctx.lineWidth = 2;
  ctx.stroke();
  // facets and a glint
  ctx.fillStyle = '#ff8fa3';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(6, -4);
  ctx.lineTo(0, 2);
  ctx.lineTo(-6, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-5, -9, 3, 3);
}

/** draws the 듀얼샷 item (two qi bolts side by side, about 44 px) at the origin */
export function drawDualIcon(ctx: CanvasRenderingContext2D) {
  for (const x of [-9, 9]) {
    const g = ctx.createLinearGradient(0, 20, 0, -22);
    g.addColorStop(0, '#ff9a7a00');
    g.addColorStop(0.55, '#ffb59a');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, -22);
    ctx.quadraticCurveTo(x + 6, -8, x + 3, 20);
    ctx.lineTo(x - 3, 20);
    ctx.quadraticCurveTo(x - 6, -8, x, -22);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = "900 11px 'Noto Serif KR', 'Batang', serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('雙', 0, 4);
}
