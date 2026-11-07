import { G } from '../core/context';
import { npcPictures, skillPictures } from '../core/assets';
import { chime } from '../core/audio';
import { NPCS, NPC_LINK } from '../data/npcs';
import { TUNE } from '../data/tune';
import { openChoice } from './choice';
import { openCrossroads } from './crossroads';
import { region } from '../systems/flow';
import { nextNpcOf } from '../systems/relationship';

export function innAlternative(){
 const last=G.state.path[G.state.path.length-1];if(!last||region().final)return null;
 const cur=last.result==='미달'?last.npc:nextNpcOf(last.npc,last.mode);
 const alt=last.result==='미달'?NPC_LINK[last.npc]:nextNpcOf(last.npc,last.mode==='follow'?'defy':'follow');
 return alt&&alt!==cur?{cur,alt}:null;
}
export function openInn(){
 const alt=innAlternative(),c=G.state.coins;
 const items=[
  {title:'약주와 휴식',desc:'체력 +1',image:skillPictures[11],cost:TUNE.innHeal,ok:G.player.hp<G.player.maxHp,buy:()=>{G.player.hp++}},
  {title:'내공 단약',desc:'내공 +1',image:skillPictures[8],cost:TUNE.innQi,ok:G.state.bombs<G.state.maxBombs,buy:()=>{G.state.bombs++;if(G.state.bombs>=G.state.maxBombs)G.state.charge=100}},
  {title:'명상',desc:'다음 돈오에서 깨달음 3개 중 하나를 고른다',image:skillPictures[15],cost:TUNE.innMeditate,done:G.state.meditate,ok:!G.state.meditate&&!region().final,buy:()=>{G.state.meditate=true}},
  alt&&{title:'수소문',desc:'다음 인연을 '+NPCS[alt.cur].name+' 대신 '+NPCS[alt.alt].name+'(으)로 바꾼다',image:npcPictures[alt.alt],cost:TUNE.innScout,done:G.state.forceNpc===alt.alt,ok:G.state.forceNpc!==alt.alt,buy:()=>{G.state.forceNpc=alt.alt}}
 ].filter(Boolean);
 openChoice({eyebrow:'관문 '+(G.state.stage-1)+' 돌파 후 · 객잔',title:'객잔',sub:'지닌 엽전 <b style="color:#ffd77a">'+c+'냥</b>. 필요한 것을 사고 길을 나선다.',
  cards:[...items.map(it=>({image:it.image,artClass:'skill-choice-art',color:'#ffd77a',tag:it.cost+'냥'+(it.done?' · 구매함':!it.ok?' · 지금은 필요 없음':c<it.cost?' · 엽전 부족':''),title:it.title,desc:it.desc,disabled:!it.ok||c<it.cost,
   onPick:()=>{G.state.coins-=it.cost;it.buy();G.state.spent=(G.state.spent||0)+it.cost;chime();openInn()}})),
   {color:'#a6c8bf',tag:'출발',title:'길을 나선다',desc:region().final?'최종 관문으로 향한다':'다음 인연을 만나러 간다',onPick:()=>openCrossroads()}]});
}
