import { G } from '../core/context';
import { skillImage } from '../core/assets';
import { rnd } from '../core/math';
import { BR, TRIG_NAME } from '../data/branches';
import { NPCS } from '../data/npcs';
import { SKILLS } from '../data/skills';
import { TUNE } from '../data/tune';
import { openChoice, resumePlay } from './choice';
import { learn } from '../systems/abilities';

export function openDono(){
 const q=G.state.quest,n=NPCS[q.npc],owned=new Set(G.state.skills.map(s=>s.id));
 const pool=Object.keys(SKILLS).filter(id=>SKILLS[id].br===q.br&&!SKILLS[id].npc&&!owned.has(id)),opts=[];
 const sasa=q.mode==='follow'&&(G.state.rel[q.npc]||0)>=TUNE.sasaRel&&!owned.has(n.unique);if(sasa)opts.push(n.unique);
 const want=G.state.meditate?3:2;G.state.meditate=false;while(opts.length<want&&pool.length)opts.push(pool.splice(Math.floor(rnd(0,pool.length)),1)[0]);
 if(!opts.length){resumePlay();return}
 openChoice({eyebrow:'頓悟 · '+BR[q.br].name+'('+BR[q.br].hanja+')의 깨달음',title:'돈오',sub:sasa?n.name+'이(가) 그대를 제자로 받아들였다. <b>사사(師事)의 절기</b>가 열렸다.':'화두를 이룬 순간, 두 갈래의 깨달음이 스친다. 하나만 붙잡을 수 있다.',
  cards:opts.map(id=>{const d=SKILLS[id];return{image:skillImage(id),artClass:'skill-choice-art',color:BR[d.br].color,tag:d.npc?'사사 · '+NPCS[d.npc].name+'의 절기':BR[d.br].name+'('+BR[d.br].hanja+') · '+TRIG_NAME[d.trig],title:d.name,desc:d.desc,onPick:()=>{learn(id);resumePlay()}}})});
}
