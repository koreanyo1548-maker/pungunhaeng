import { G } from '../core/context';
import { projectileArt, propArt } from '../core/assets';
import { ctx, reduced } from '../core/dom';
import { BR } from '../data/branches';

export function blade(x,y,angle,length,color){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-length*.65);ctx.lineTo(5,-length*.28);ctx.lineTo(3,length*.35);ctx.lineTo(-3,length*.35);ctx.lineTo(-5,-length*.28);ctx.closePath();ctx.fill();ctx.strokeStyle='#f7ffe5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-length*.56);ctx.lineTo(0,length*.2);ctx.stroke();ctx.fillStyle='#d1a45c';ctx.fillRect(-7,length*.25,14,3);ctx.fillRect(-2,length*.28,4,7);ctx.restore();
}
export function drawMartialShots(){
 for(const s of G.shots){ // Positive vx rotates upward-facing art clockwise.
 const rot=Math.atan2(s.vx,s.vy??900),idx={qi:0,sword:1,knife:2,gang:3,orb:4}[s.kind]??1;
 const size=s.kind==='gang'?Math.max(70,(s.w||8)*5):s.kind==='sword'?48:s.kind==='knife'?34:s.kind==='orb'?32:36;
 if(s.kind==='orb'&&!reduced)drawVfxSprite(projectileArt[idx],s.x-s.vx*.018,s.y+(s.vy??900)*.018,size*.75,size*.75,rot,.22);
 drawVfxSprite(projectileArt[idx],s.x,s.y,size,size,rot);
 }
}
export function drawMartialHazard(h){
 if(h.dead)return;
 if(h.kind==='bullet'||h.kind==='meteor'||(h.kind==='spear'&&h.skin==='wind')){const idx=h.kind==='meteor'?6:h.skin==='wind'?7:h.foe?6:5;const size=h.kind==='meteor'?65:h.kind==='spear'?55:h.r*3.8;drawVfxSprite(projectileArt[idx],h.x,h.y,size,size,Math.atan2(h.vy||1,h.vx||0)+Math.PI/2);return}

 if(h.kind==='spear'&&h.skin==='wind'){blade(h.x,h.y,Math.PI,52,'#e2f6ff');if(h.grazed){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle=BR.yu.color;ctx.beginPath();ctx.arc(h.x,h.y,16,0,Math.PI*2);ctx.stroke();ctx.restore()}return}
 if(h.kind==='spear'&&h.skin!=='wind'){drawVfxSprite(propArt[2],h.x,h.y-19,27,86);if(h.grazed){ctx.save();ctx.strokeStyle=BR.yu.color;ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(h.x,h.y,16,0,Math.PI*2);ctx.stroke();ctx.restore()}return}
 if(h.kind==='spear'){ctx.save();ctx.translate(h.x,h.y);ctx.strokeStyle='#7fb46a';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-62);ctx.lineTo(0,10);ctx.stroke();ctx.strokeStyle='#cfe9a8';ctx.lineWidth=2;for(const y of [-45,-22])ctx.beginPath(),ctx.moveTo(-4,y),ctx.lineTo(4,y),ctx.stroke();ctx.fillStyle='#e9f5cf';ctx.beginPath();ctx.moveTo(-4,8);ctx.lineTo(0,24);ctx.lineTo(4,8);ctx.fill();if(h.grazed){ctx.globalAlpha=.6;ctx.strokeStyle=BR.yu.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.stroke()}ctx.restore();return}
 if(h.color&&h.kind==='bullet'&&h.foe){ctx.save();ctx.fillStyle=h.color;ctx.shadowColor=h.color;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,Math.PI*2);ctx.fill();ctx.restore();return}
 if(h.kind==='meteor'){ctx.save();ctx.strokeStyle='#ffd69a88';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(h.x,h.y-85);ctx.lineTo(h.x,h.y-20);ctx.stroke();blade(h.x,h.y,Math.PI,65,'#e29570');ctx.restore()}
 else{ctx.save();ctx.translate(h.x,h.y);ctx.rotate(Math.atan2(h.vy,h.vx||0)-Math.PI/2);ctx.shadowColor='#d26745';ctx.shadowBlur=6;ctx.fillStyle='#e8b67b';ctx.strokeStyle='#6d342c';ctx.lineWidth=1.5;ctx.fillRect(-6,-12,12,24);ctx.strokeRect(-6,-12,12,24);ctx.beginPath();ctx.moveTo(-3,-7);ctx.lineTo(3,-3);ctx.lineTo(-3,1);ctx.lineTo(3,6);ctx.stroke();ctx.restore()}
}
export function drawPickup(p){ctx.save();ctx.translate(p.x,p.y);if(p.kind==='coin'){ctx.scale(Math.max(.22,Math.abs(Math.cos(G.time*6+p.phase))),1);drawVfxSprite(propArt[3],0,0,18,18)}else{ctx.rotate(Math.sin(G.time*3+p.phase)*.08);const idx=p.kind==='power'?4:5;drawVfxSprite(propArt[idx],0,0,44,44)}ctx.restore()}
export function drawVfxSprite(im,x,y,w,h=w,angle=0,alpha=1){if(!im)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
