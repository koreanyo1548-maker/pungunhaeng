/** Image decoding and atlas geometry; no gameplay or renderer dependencies. */
export function atlasCell(atlas, cols, rows, col, row, sourceSize = [atlas.width, atlas.height]) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const cc = c.getContext('2d'),
    [sourceWidth, sourceHeight] = sourceSize,
    scaleX = atlas.width / sourceWidth,
    scaleY = atlas.height / sourceHeight,
    w = sourceWidth / cols,
    h = sourceHeight / rows,
    k = 248 / Math.max(w, h);
  // Source padding is authored in original pixels; destination geometry stays unchanged.
  cc.drawImage(
    atlas,
    (col * w + 1) * scaleX,
    (row * h + 1) * scaleY,
    (w - 2) * scaleX,
    (h - 2) * scaleY,
    128 - (w * k) / 2,
    128 - (h * k) / 2,
    w * k,
    h * k,
  );
  return c;
}
export function makeWhite(im) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const cc = c.getContext('2d');
  cc.drawImage(im, 0, 0);
  cc.globalCompositeOperation = 'source-in';
  cc.fillStyle = '#fff';
  cc.fillRect(0, 0, 256, 256);
  return c;
}
const decodedImages = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = decodedImages.get(src);
  if (cached) return cached;
  const promise = decodeImage(src).catch(error => {
    decodedImages.delete(src);
    throw error;
  });
  decodedImages.set(src, promise);
  return promise;
}
function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}
export function cropProp(im, rect, sourceSize = [im.width, im.height]) {
  const [x, y, w, h] = rect,
    scaleX = im.width / sourceSize[0],
    scaleY = im.height / sourceSize[1],
    c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scaleX));
  c.height = Math.max(1, Math.round(h * scaleY));
  c.getContext('2d').drawImage(im, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, c.width, c.height);
  return c;
}
export function cropArt(im, cols, rows, col, row) {
  const c = document.createElement('canvas');
  c.width = Math.round(im.width / cols);
  c.height = Math.round(im.height / rows);
  c.getContext('2d').drawImage(
    im,
    (col * im.width) / cols,
    (row * im.height) / rows,
    im.width / cols,
    im.height / rows,
    0,
    0,
    c.width,
    c.height,
  );
  return c;
}
