import { G } from '../core/context';
import { boom, chime, tone } from '../core/audio';
import { BR } from '../data/branches';
import { TUNE } from '../data/tune';
import { hitEnemy } from '../entities/enemies';
import { burst, impact, label, paintFX, ring } from '../render/fx';
import { hasSkill, trig } from './abilities';
import { difficulty, region } from './flow';
import { traitOn } from './formation';
import { questEvent } from './quest';
import { notify, syncHUD } from '../ui/hud';

export function shotPower(){return 1.3*(1+.12*difficulty())*(traitOn('cheolhyeol')||traitOn('bicheon')?TUNE.traitPower:1)}
export function gainCharge(n){
 n*=(hasSkill('chukgi')?1.5:1)*(traitOn('unhak')?TUNE.traitCharge:1)*(region().terrain==='cloud'?TUNE.cloudCharge:1);
 if(G.state.bombs>=G.state.maxBombs){G.state.charge=100;return}questEvent('charge',n);G.state.charge+=n;
 while(G.state.charge>=100&&G.state.bombs<G.state.maxBombs){G.state.charge-=100;G.state.bombs++;notify('내공 충전!',1);chime();if(G.state.bombs>=G.state.maxBombs){G.state.charge=100;questEvent('fullCharge')}}
}
export function blast(){
 if(G.mode!=='play'||G.state.bombs<=0||['clear','warning'].includes(G.state.phase))return;G.state.bombs--;if(G.state.charge===100)G.state.charge=0;G.hazards=[];const before=G.state.kills;G.state.blasting=true;for(const e of G.enemies)hitEnemy(e,e.boss?170*(1+.12*difficulty()):e.hp+1);G.state.blasting=false;
 const killed=G.state.kills-before;questEvent('blast');if(killed>=6)questEvent('blastKill');if(killed>=6)label(killed+'명 일소',240,300,BR.gi.color,22);trig('blast',{killed});
 paintFX(3,G.player.x,G.player.y-25,330,.65);paintFX(3,240,330,380,.6,0,.12,.45);ring(G.player.x,G.player.y,'#abfff0',20,950,.65);ring(G.player.x,G.player.y,'#fff5c4',10,750,.5);impact(G.player.x,G.player.y,'#d5ffed',130);burst(G.player.x,G.player.y,'#beffeb',40,420);G.player.inv=Math.max(G.player.inv,1.5);G.shake=10;G.flash=.2;boom(true);notify('내공 해방',.8);syncHUD();
}
export const D=()=>shotPower()*1.8;
export function fireShot(x,y,vx,dmg,o={}){G.shots.push({x,y,prevY:y,vx,damage:dmg,r:5,kind:o.kind||'knife',phase:G.time,color:o.color,pierce:o.pierce,w:o.w,vy:o.vy,homing:o.homing})}
export function fan(n,spread,dmg,color,kind='knife'){for(let i=0;i<n;i++){const a=(i-(n-1)/2)*spread;fireShot(G.player.x,G.player.y-30,Math.sin(a)*820,dmg,{kind,color,vy:Math.cos(a)*820})}}
export function aoe(x,y,r,dmg,color){for(const e of [...G.enemies]){if(e.dead)continue;if(Math.hypot(e.x-x,e.y-y)<r+(e.boss?40:e.r*.5))hitEnemy(e,dmg)}paintFX(color===BR.yu.color?4:2,x,y,r*2,.38,0,0,.72);ring(x,y,color,10,r,.35)}
export function column(x,dmg,color,w=36){for(const e of [...G.enemies]){if(e.dead)continue;if(Math.abs(e.x-x)<w+(e.boss?40:e.r*.5))hitEnemy(e,dmg)}G.strikes.push({x,w,color,life:.32,total:.32});tone(180,.18,'sawtooth',.05,90)}
export function clearBullets(x,y,r){for(const h of G.hazards)if(!h.warn&&!h.dead&&Math.hypot(h.x-x,h.y-y)<r){h.dead=true;burst(h.x,h.y,BR.art.color,4,80)}}
export function graze(h){
 h.grazed=true;G.state.grazes++;gainCharge(TUNE.grazeCharge);burst((h.x+G.player.x)/2,(h.y+G.player.y)/2,BR.yu.color,5,120);
 if(hasSkill('biyeon')){h.vx=(h.vx||0)*.5;h.vy*=.5}
 if(G.time-(G.state.lastGraze||-1)>.06){tone(1500,.04,'sine',.04,2100);G.state.lastGraze=G.time}
 questEvent('graze');trig('graze',{h,x:h.x,y:h.y});
}
export function grazeEnemy(e){G.state.grazes++;gainCharge(TUNE.grazeCharge);burst((e.x+G.player.x)/2,G.player.y,BR.yu.color,5,120);if(G.time-(G.state.lastGraze||-1)>.06){tone(1500,.04,'sine',.04,2100);G.state.lastGraze=G.time}questEvent('graze');trig('graze',{x:e.x,y:e.y,e})}
