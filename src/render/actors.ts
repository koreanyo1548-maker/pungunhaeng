import { G } from '../core/context';
import { projectileArt, propArt, rockHitArt } from '../core/assets';
import { ctx } from '../core/dom';
import { borrowedSword, heroPose } from '../entities/player';
import { drawBossSeal } from './fx';
import { blade, drawVfxSprite } from './projectiles';
import { enemyFrameIndex } from './util';
import { movementTier, region } from '../systems/flow';
import { activeFrames, activeHeroId } from '../systems/formation';

export function drawActor(type,x,y,size,pose=0,angle=0,hit=0,sx=1,sy=1){
 const im=G.enemyFrames[type]?.[pose]||G.sprite[type];if(!im)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(sx,sy);ctx.drawImage(im,-size/2,-size/2,size,size);
 if(hit>0){ctx.globalAlpha*=Math.min(.65,(hit/.055)**2*.65);ctx.drawImage(G.enemyWhites[type]?.[pose]||G.whiteSprite[type],-size/2,-size/2,size,size)}ctx.restore();
}
export function drawEnemy(e){
 if(e.rock){drawRock(e);return}
 const pose=enemyFrameIndex(e),recoil=(e.recoil||0)/.12,pulse=Math.sin(G.time*4+(e.phase||0)),cast=(e.cast||0)/.32;
 const angle=e.boss?(e.action==='recover'?pulse*.035:e.action==='attack'?Math.sin(G.time*16)*.015:0):Math.sin(G.time*7+e.phase)*.035;
 const bob=e.boss?pulse*2:Math.abs(Math.sin(G.time*10+e.phase))*2;
 let sx=1-recoil*.045,sy=1+recoil*.035;
 if(e.boss&&e.action==='telegraph'){sx*=1.015;sy*=.98}else if(e.boss&&e.action==='attack'){sx*=1+cast*.035;sy*=1-cast*.025}
 drawActor(e.type,e.x,e.y+bob-recoil*5,e.size,pose,angle,e.hit,sx,sy);
}
export function drawHeroSprite(pose,x,y,angle=0,alpha=1,ghost=false){
 const im=activeFrames()[pose];if(!im)return;ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(angle);
 if(ghost){ctx.globalCompositeOperation='screen';ctx.filter='sepia(1) hue-rotate(100deg)'}
 // Fixed atlas cells keep feet and body scale stable; cloth motion is painted into each frame.
 ctx.drawImage(im,-57,-57,114,114);ctx.restore();
}
export function drawMartialPlayer(){
 if(G.player.hp<=0)return;const tier=movementTier(),hop=tier===1?Math.max(0,Math.sin(G.state.jumpPhase))*12:0,bob=tier===0?Math.sin(G.state.runPhase*2)*1.5:Math.sin(G.time*5)*2;
 ctx.save();ctx.fillStyle=tier===2?'#14364133':'#1a322951';ctx.beginPath();ctx.ellipse(G.player.x,G.player.y+40,22-hop*.45,7-hop*.12,0,0,Math.PI*2);ctx.fill();ctx.restore();
 for(const a of G.afterimages)drawHeroSprite(a.pose,a.x,a.y,a.angle,a.life/a.total*.32,true);
 ctx.save();if(G.player.inv>0&&G.state.hyper<=0)ctx.globalAlpha=.6+Math.abs(Math.sin(G.time*20))*.4;
 if(tier===1){ctx.save();ctx.strokeStyle='#e1fdd6';ctx.globalAlpha*=.36*(1-hop/16);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(G.player.x,G.player.y+39,29,9,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
 if(tier===2){ctx.save();ctx.strokeStyle='#c9fff1';ctx.globalAlpha*=.5;ctx.lineWidth=2;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(G.player.x+side*14,G.player.y+20);ctx.quadraticCurveTo(G.player.x+side*27,G.player.y+60,G.player.x+side*12+Math.sin(G.time*8)*7,G.player.y+95);ctx.stroke()}ctx.restore()}
 if(G.state.hyper>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#ffdf8b';ctx.lineWidth=3;ctx.shadowColor='#ffe7a1';ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(G.player.x,G.player.y,53,72,Math.sin(G.time*3)*.2,0,Math.PI*2);ctx.stroke();ctx.restore()}
 // The red sash arcs out on a lateral step and decays after acceleration.
 if(activeHeroId()==='pungun'&&G.player.step>0){const force=G.player.step/.19;ctx.strokeStyle='#b64b3e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(G.player.x,G.player.y+8);ctx.quadraticCurveTo(G.player.x-G.player.stepDir*30*force,G.player.y+26,G.player.x-G.player.stepDir*48*force,G.player.y+36);ctx.stroke()}
 if(borrowedSword()){ctx.save();ctx.shadowColor='#bff8ea';ctx.shadowBlur=14;drawVfxSprite(projectileArt[1],G.player.x,G.player.y+46,50,156,Math.PI/2+G.player.tilt*.4,1);ctx.restore();ctx.save();ctx.globalAlpha*=.35;ctx.strokeStyle='#c9fff1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(G.player.x-50,G.player.y+46);ctx.lineTo(G.player.x+50,G.player.y+46);ctx.stroke();ctx.restore()}
 drawHeroSprite(heroPose(),G.player.x,G.player.y+ bob-hop,G.player.tilt*(tier===2?.65:1.5));
 if(G.player.swing>0){const t=1-G.player.swing;ctx.save();ctx.translate(G.player.x,G.player.y-hop-20);ctx.rotate(-.5+t*.9);ctx.globalAlpha*=G.player.swing*.8;ctx.strokeStyle='#f8ffe2';ctx.shadowColor='#7cebd1';ctx.shadowBlur=12;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,43,24,0,Math.PI*1.05,Math.PI*1.95);ctx.stroke();ctx.restore()}
 // Center marker keeps the hit area readable through airborne poses.
 ctx.fillStyle='#fff7cc';ctx.beginPath();ctx.arc(G.player.x,G.player.y,2.3,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function drawEnemyAura(e){
 ctx.save();if(!e.boss){ctx.fillStyle='#16292d44';ctx.beginPath();ctx.ellipse(e.x,e.y+e.size*.39,e.r*.7,5,0,0,Math.PI*2);ctx.fill()}
 if(movementTier()===2&&!e.boss){ctx.strokeStyle='#b5ecde';ctx.globalAlpha=.5;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(e.x,e.y+e.size*.39,e.r*.85,7,0,0,Math.PI*2);ctx.stroke()}
 if(e.boss){drawBossSeal(e)}
 if(e.boss){ctx.strokeStyle=e.boss?region().color:e.color;ctx.globalAlpha=.4;ctx.lineWidth=2;const radius=e.boss?82:43;ctx.beginPath();ctx.ellipse(e.x,e.y+8,radius,radius*.6,0,0,Math.PI*2);ctx.stroke();if(e.boss){for(let i=0;i<5;i++){const a=G.time*.35+i*Math.PI*.4;blade(e.x+Math.cos(a)*radius,e.y+Math.sin(a)*radius*.6,a+Math.PI/2,29,region().color)}}}ctx.restore();
}
export function drawRock(e){const index=e.baseX<240?0:1,size=(e.r+6)*2;drawVfxSprite(propArt[index],e.x,e.y,size,size,Math.sin(e.phase)*.06);if(e.hit>0)drawVfxSprite(rockHitArt[index],e.x,e.y,size,size,Math.sin(e.phase)*.06,Math.min(.7,e.hit/.055))}
