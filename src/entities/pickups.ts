import { G } from '../core/context';
import { chime, tone } from '../core/audio';
import { rnd } from '../core/math';
import { burst, impact, label, ring } from '../render/fx';
import { announce } from '../ui/hud';

export function addPickup(kind,x,y){G.pickups.push({kind,x,y,r:kind==='coin'?7:17,life:10,phase:rnd(0,6),vx:rnd(-35,35)})}
export function collect(p){
 p.dead=true;if(p.kind==='coin'){G.state.coins++;G.state.score+=10;if(G.state.coins%3===0)tone(1400+G.state.coins%5*100,.045,'sine',.045,1800);burst(p.x,p.y,'#ffdf87',3,60)}
 else if(p.kind==='power'){G.player.weapon=Math.min(3,G.player.weapon+1);G.state.score+=150;ring(G.player.x,G.player.y,'#a7ffff',5,100,.5);impact(G.player.x,G.player.y,'#cafff3',70);label('무공 강화',G.player.x,G.player.y-65,'#affff2',22);chime()}
 else{G.state.hyper=4.2;G.player.inv=4.8;G.hazards=[];G.flash=.22;ring(G.player.x,G.player.y,'#c5f9ff',10,200,.45);announce('無我之境','무아지경','내공이 한계를 넘어 흐릅니다','#c5ffff',1.5);tone(160,.65,'sawtooth',.14,700)}
}
