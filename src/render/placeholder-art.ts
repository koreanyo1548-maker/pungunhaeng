// Stand-in art until Codex delivers the real pictures (docs/codex-art-handoff.md): tinted copies of tier 4 for tiers
// 5 and 6. Chest and dual-shot now use core/battle-item-art. Made once, cached; cosmetic only.
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
