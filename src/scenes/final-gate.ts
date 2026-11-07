import { G } from '../core/context';
import { relText } from '../core/math';
import { BR } from '../data/branches';
import { NPCS } from '../data/npcs';
import { openChoice, resumePlay } from './choice';
import { beginStage, region } from '../systems/flow';

export function openFinalGate(){
 const pick=s=>Object.keys(G.state.rel).filter(k=>s*G.state.rel[k]>0),list=a=>a.length?a.map(k=>`<b style="color:${BR[NPCS[k].br].color}">${NPCS[k].name}</b> (${relText(G.state.rel[k])})`).join(', '):'없음';
 openChoice({eyebrow:'최종 관문',title:region().name,sub:region().intro,
  cards:[{color:'#c9a6ff',tag:'인연의 결산',title:region().enter,desc:'<b>조력:</b> '+list(pick(1))+'<br><b>방해:</b> '+list(pick(-1)),onPick:()=>{resumePlay();beginStage()}}]});
}
