import { G } from '../core/context';
import { targetable } from '../entities/enemies';
import { ring } from '../render/fx';
import { D, aoe, clearBullets, column, fan, fireShot, gainCharge } from '../systems/combat';

export const HEROES={
 pungun:{name:'풍운객',terrain:'ground',tint:null,color:'#ff8f6e',trait:'질풍',traitDesc:'근접 격파 시 내공 +5',tag:'풍운검',tagDesc:'전방으로 관통 검강 3줄기',fx:m=>{for(const vx of [-150,0,150])fireShot(G.player.x,G.player.y-40,vx,D()*5*m,{kind:'gang',pierce:true,w:10+4*m,color:'#ff8f6e'})}},
 cheolhyeol:{name:'철혈',terrain:'ground',tint:'rgba(150,28,18,.42)',color:'#ff6b57',trait:'철혈',traitDesc:'공격력 +25%',tag:'붕천각',tagDesc:'주변에 큰 충격파',fx:m=>aoe(G.player.x,G.player.y-40,120+50*m,D()*6*m,'#ff6b57')},
 mukyoung:{name:'묵영',terrain:'ground',tint:'rgba(8,12,30,.55)',color:'#a7b3d6',trait:'묵영보',traitDesc:'스침 판정 +40%',tag:'암영',tagDesc:'잠깐 몸을 감추고 주변 탄을 지운다',fx:m=>{G.player.inv=Math.max(G.player.inv,.6*m+.2);clearBullets(G.player.x,G.player.y,130*m+20)}},
 bicheon:{name:'비천',terrain:'sky',tint:'rgba(30,190,180,.36)',color:'#7fe6cf',trait:'비천',traitDesc:'공격력 +25%',tag:'비천어검',tagDesc:'검의 비가 강한 적들에게 꽂힌다',fx:m=>{const l=G.enemies.filter(targetable).sort((a,b)=>b.hp-a.hp).slice(0,4*m);for(const e of l)column(e.x,D()*5,'#7fe6cf',28);if(!l.length)column(G.player.x,D()*5,'#7fe6cf',28)}},
 unhak:{name:'운학',terrain:'sky',tint:'rgba(245,238,214,.5)',color:'#ffd77a',trait:'운학',traitDesc:'내공 충전 +40%',tag:'학익진',tagDesc:'내공을 즉시 채운다',fx:m=>{gainCharge(45*m);ring(G.player.x,G.player.y,'#ffd77a',10,120,.4)}},
 hongryeon:{name:'홍련',terrain:'sky',tint:'rgba(210,50,105,.4)',color:'#ff8fb0',trait:'홍련',traitDesc:'기본 공격 속도 +20%',tag:'홍련비도',tagDesc:'부채꼴로 비도를 흩뿌린다',fx:m=>fan(5+4*m,.15,D()*1.8,'#ff8fb0')}
};
