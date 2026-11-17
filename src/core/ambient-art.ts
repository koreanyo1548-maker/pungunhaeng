import imageDimensions from '../assets/image-dimensions.json';
import { loadImage, cropProp } from './image';
import catalog from '../assets/images/ambient/catalog.json';
import neutral from '../assets/images/ambient/passers-neutral.webp';
import grateful from '../assets/images/ambient/passers-grateful.webp';
import items from '../assets/images/ambient/inn-collection.webp';

export const ambientPictures: Record<string, string> = {};
const urls = { 'passers-neutral.webp': neutral, 'passers-grateful.webp': grateful, 'inn-collection.webp': items };
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
    const dimensions = imageDimensions['ambient/' + cell.file];
    if (im.width !== dimensions.runtime[0] || im.height !== dimensions.runtime[1])
      throw new Error('Unexpected atlas size: ' + cell.file);
    const canvas = cropProp(
      im,
      [cell.col * spec.cellWidth, cell.row * spec.cellHeight, spec.cellWidth, spec.cellHeight],
      [spec.width, spec.height],
    );
    ambientPictures[id] = canvas.toDataURL();
  }
}
