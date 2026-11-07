export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a);
export const fmt=n=>Math.floor(n).toLocaleString('ko-KR');
export function relText(v){return v>0?'+'+v:v<0?'−'+(-v):'0'}
export function josa(word,a,b){const c=word.charCodeAt(word.length-1)-0xAC00;return word+(c>=0&&c<11172&&c%28?a:b)}
