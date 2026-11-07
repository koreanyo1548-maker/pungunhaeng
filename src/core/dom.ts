export const $=id=>document.getElementById(id);
export const canvas=$('canvas'),ctx=canvas.getContext('2d',{alpha:false});
export const W=480,H=800,PLAYER_Y=654,BOSS_Y=310;
export const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
