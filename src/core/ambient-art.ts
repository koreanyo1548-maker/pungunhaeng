import catalog from '../assets/images/ambient/catalog.json';
import neutral from '../assets/images/ambient/passers-neutral.png';
import grateful from '../assets/images/ambient/passers-grateful.png';
import items from '../assets/images/ambient/inn-collection.png';

export const ambientPictures: Record<string, string> = {};
const urls = { 'passers-neutral.png': neutral, 'passers-grateful.png': grateful, 'inn-collection.png': items };
/** Slice by the actual atlas cells, not by the older character sheet's dimensions. */
export async function loadAmbientArt() {
  const sheets = new Map<string, HTMLImageElement>();
  await Promise.all(
    Object.entries(urls).map(
      ([name, src]) =>
        new Promise<void>((resolve, reject) => {
          const im = new Image();
          im.onload = () => {
            sheets.set(name, im);
            resolve();
          };
          im.onerror = () => reject(new Error('Failed to load ambient art: ' + name));
          im.src = src;
        }),
    ),
  );
  for (const [id, cell] of Object.entries(catalog.entries)) {
    const spec = catalog.sheets[cell.file],
      im = sheets.get(cell.file)!;
    if (im.width !== spec.width || im.height !== spec.height) throw new Error('Unexpected atlas size: ' + cell.file);
    const canvas = document.createElement('canvas');
    canvas.width = spec.cellWidth;
    canvas.height = spec.cellHeight;
    canvas
      .getContext('2d')!
      .drawImage(
        im,
        cell.col * canvas.width,
        cell.row * canvas.height,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    ambientPictures[id] = canvas.toDataURL();
  }
}
