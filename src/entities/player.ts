import { G } from '../core/context';
import { boom, chime, tone } from '../core/audio';
import { reduced } from '../core/dom';
import { rnd } from '../core/math';
import { BR } from '../data/branches';
import { HEROES } from '../data/heroes';
import { burst, impact, label, paintFX, ring } from '../render/fx';
import { trig } from '../systems/abilities';
import { clearBullets, shotPower } from '../systems/combat';
import { end, movementTier } from '../systems/flow';
import { activeHeroId } from '../systems/formation';
import { questEvent } from '../systems/quest';

export function damagePlayer(){
 if(G.player.inv>0||G.state.hyper>0||G.state.phase==='clear')return;
 if(G.player.shield>0){G.player.shield=0;paintFX(6,G.player.x,G.player.y,112,.32);G.player.inv=1;ring(G.player.x,G.player.y,BR.art.color,10,110,.45);burst(G.player.x,G.player.y,BR.art.color,18,200);label('철갑공',G.player.x,G.player.y-55,BR.art.color,20);tone(300,.18,'square',.12,120);clearBullets(G.player.x,G.player.y,120);return}
 if(G.state.negate){G.state.negate=false;paintFX(7,G.player.x,G.player.y,100,.5);G.player.inv=1.3;G.state.bombs=Math.min(G.state.maxBombs,G.state.bombs+1);ring(G.player.x,G.player.y,BR.gi.color,10,110,.45);label('회춘단',G.player.x,G.player.y-55,BR.gi.color,20);chime();return}
 G.player.hp--;G.state.combo=0;G.state.lastHurt=G.time;G.player.inv=1.9;G.state.combo=0;G.state.comboTimer=0;G.shake=11;G.flash=.2;impact(G.player.x,G.player.y,'#c3ffff',85);burst(G.player.x,G.player.y,'#b4ffff',25,220);ring(G.player.x,G.player.y,'#b4ffff',10,100,.4);boom(true);if(navigator.vibrate)navigator.vibrate(40);if(G.player.hp<=0)end();else label('피격',G.player.x,G.player.y-55,'#ffac96',21);
}
export function shoot(){
 G.player.muzzle=.09;G.player.swing=1;G.player.swingCount++;if(G.player.swingCount%3===0)paintFX(1,G.player.x+15,G.player.y-35,82,.22,-.55,0,.5);
 const offsets=G.player.weapon===1?[-9,9]:G.player.weapon===2?[-18,0,18]:[-27,-9,9,27];
 for(const x of offsets)G.shots.push({x:G.player.x+x,y:G.player.y-34,prevY:G.player.y-34,vx:G.player.weapon===3?x*1.5:0,damage:shotPower()*1.8,r:5,kind:G.player.weapon===2&&x!==0?'knife':G.player.weapon===3?'sword':'qi',phase:G.time});
 if(G.state.hyper<=0)tone(850,.065,'sine',.035,250);
}
export function borrowedSword(){return G.state?.course==='sky'&&HEROES[activeHeroId()].terrain==='ground'}
export function heroPose(){if(reduced||borrowedSword())return 0;const airborne=HEROES[activeHeroId()].terrain==='sky';if(airborne)return Math.abs(G.player.tilt)>.045?(G.player.tilt<0?2:3):Math.floor(G.time*4)%2;return Math.floor(G.state.runPhase/1.8)%4}
export function updateMartialMotion(dt,oldX){
 const tier=movementTier(),speed=Math.abs(G.player.x-oldX)/Math.max(.001,dt);
 G.state.ascend=Math.max(0,G.state.ascend-dt);G.state.runPhase+=dt*18;G.state.jumpPhase+=dt*5;
 G.player.step=Math.max(0,G.player.step-dt);G.player.swing=Math.max(0,G.player.swing-dt*7);G.state.stepTimer-=dt;G.state.ghostTimer-=dt;
 // Repeated short steps preserve control, rather than locking movement into a dash.
 if(speed>90&&G.state.stepTimer<=0){G.player.step=.19;G.player.stepDir=Math.sign(G.player.x-oldX)||1;G.state.stepTimer=.21;
  if(['flight','boss'].includes(G.state.phase)){if(G.player.stepDir!==G.state.lastStepDir&&G.time-(G.state.lastStepTime||-9)<.5)questEvent('step');G.state.lastStepDir=G.player.stepDir;G.state.lastStepTime=G.time;trig('step',{x:oldX})}
  burst(G.player.x,G.player.y+31,tier===0?'#d7bd8b':'#adf4e7',tier===0?6:4,85);
  if(!reduced)G.afterimages.push({x:oldX,y:G.player.y,pose:heroPose(),angle:G.player.tilt,life:.22,total:.22});
 }
 if((speed>80||G.state.hyper>0)&&G.state.ghostTimer<=0&&!reduced){G.state.ghostTimer=.065;G.afterimages.push({x:oldX,y:G.player.y+5,pose:heroPose(),angle:G.player.tilt,life:.24,total:.24})}
 if(G.afterimages.length>8)G.afterimages.splice(0,G.afterimages.length-8);
 G.state.trailTimer-=dt;
 if(G.state.trailTimer<=0){G.state.trailTimer=tier===0?.18:tier===1?.1:.055;
  if(tier===0){G.footprints.push({x:G.player.x+(Math.floor(G.state.runPhase/Math.PI)%2?9:-9),y:G.player.y+39,life:.5,total:.5,tier:0});burst(G.player.x,G.player.y+39,'#d7c89e',2,35)}
  else if(tier===2||G.state.hyper>0)G.particles.push({x:G.player.x+rnd(-9,9),y:G.player.y+40,vx:rnd(-12,12),vy:G.state.hyper>0?260:95,life:.35,max:.35,r:2,color:'#bffff0'});
 }
 if(tier===1&&Math.sin(G.state.jumpPhase)>=0&&Math.sin(G.state.jumpPhase-dt*5)<0){G.footprints.push({x:G.player.x,y:G.player.y+40,life:.9,total:.9,tier:1});ring(G.player.x,G.player.y+35,'#ddffe6',5,42,.32);burst(G.player.x,G.player.y+35,'#bcdfcc',6,65)}
}
