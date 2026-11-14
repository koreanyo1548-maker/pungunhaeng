import { loadImage, cropProp } from './image';
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
    Object.entries(urls).map(async ([name, src]) => {
      sheets.set(name, await loadImage(src));
    }),
  );
  for (const [id, cell] of Object.entries(catalog.entries)) {
    const spec = catalog.sheets[cell.file],
      im = sheets.get(cell.file)!;
    if (im.width !== spec.width || im.height !== spec.height) throw new Error('Unexpected atlas size: ' + cell.file);
    const canvas = cropProp(im, [
      cell.col * spec.cellWidth,
      cell.row * spec.cellHeight,
      spec.cellWidth,
      spec.cellHeight,
    ]);
    ambientPictures[id] = canvas.toDataURL();
  }
}
