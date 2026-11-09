import { fxRandom, random } from './rng';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** gameplay random in [a, b) */
export const rnd = (a, b) => a + random() * (b - a);
/** cosmetic random in [a, b) — never affects gameplay */
export const fxRnd = (a, b) => a + fxRandom() * (b - a);
export const fmt = n => Math.floor(n).toLocaleString('ko-KR');
export function relText(v) {
  return v > 0 ? '+' + v : v < 0 ? '−' + -v : '0';
}
export function josa(word, a, b) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (c >= 0 && c < 11172 && c % 28 ? a : b);
}
/** word + 으로/로: 로 after a vowel or ㄹ, 으로 after any other final consonant. */
export function josaRo(word) {
  const c = word.charCodeAt(word.length - 1) - 0xac00,
    fin = c >= 0 && c < 11172 ? c % 28 : 0;
  return word + (fin && fin !== 8 ? '으로' : '로');
}
