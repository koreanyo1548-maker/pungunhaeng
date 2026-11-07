// usage: node tests/equivalence/compare-styles.mjs <a.json> <b.json> [comma-separated element paths to ignore]
import fs from 'fs';
const [, , a, b] = process.argv;
const A = JSON.parse(fs.readFileSync(a, 'utf8')),
  B = JSON.parse(fs.readFileSync(b, 'utf8'));
// values driven by a running CSS animation depend on wall-clock time; compare their declarations, not their frame
const ANIMATED = new Set(['transform', 'opacity', 'box-shadow', 'filter', 'background-color', 'color']);
const ignore = new Set((process.argv[4] || '').split(',').filter(Boolean));
const diffs = [];
for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
  if ([...ignore].some(i => k.includes(i))) continue;
  if (!A[k] || !B[k]) {
    diffs.push(`${k}: only in ${A[k] ? 'A' : 'B'}`);
    continue;
  }
  for (const p of new Set([...Object.keys(A[k]), ...Object.keys(B[k])]))
    if (
      A[k][p] !== B[k][p] &&
      !(ANIMATED.has(p) && A[k]['animation-name'] !== 'none' && A[k]['animation-name'] === B[k]['animation-name'])
    )
      diffs.push(`${k} { ${p}: ${A[k][p]} -> ${B[k][p]} }`);
}
console.log(
  diffs.length
    ? diffs.slice(0, 60).join('\n') + `\n... ${diffs.length} differences`
    : `IDENTICAL (${Object.keys(A).length} element states)`,
);
process.exit(diffs.length ? 1 : 0);
