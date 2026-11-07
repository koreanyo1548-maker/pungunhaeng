export const NPCS={
 dosa:{name:'청운 도인',title:'구름을 따라 떠도는 도사',br:'yu',rival:'milsa',unique:'taeguk',quests:[
  {say:'바람을 거스르지 말게.',follow:{t:'graze',n:24},defy:{t:'nearKill',n:22,say:'바람째 베어 버리겠소.'}},
  {say:'물처럼 흐르게. 막히면 돌아가면 그만이네.',follow:{t:'step',n:90},defy:{t:'blast',n:3,say:'둑을 터뜨리는 것도 물이오.'}}]},
 milsa:{name:'혈마 밀사',title:'천마신교의 그림자',br:'gi',rival:'dosa',unique:'hyeolma',quests:[
  {say:'피를 두려워 마라. 한꺼번에 쓸어 버려라.',follow:{t:'blastKill',n:2},defy:{t:'graze',n:24,say:'살기는 흘려보내겠소.'}},
  {say:'기를 끝까지 채워 봐라. 넘칠 때까지.',follow:{t:'fullCharge',n:2},defy:{t:'rowClear',n:4,say:'검으로 증명하겠소.'}}]},
 monk:{name:'철벽 노승',title:'산문을 지키는 노승',br:'gang',rival:'yeonhyeop',unique:'geumgang',quests:[
  {say:'한 걸음도 물러서지 마시게.',follow:{t:'nearKill',n:24},defy:{t:'step',n:90,say:'물러서는 것도 보법이오.'}},
  {say:'끊김 없이 이어 가시게.',follow:{t:'combo',n:40},defy:{t:'blast',n:3,say:'한 번에 끝내겠소.'}}]},
 yeonhyeop:{name:'비연 낭자',title:'암기를 쓰는 여협',br:'yu',rival:'monk',unique:'mancheon',quests:[
  {say:'발끝으로 춤춰 봐요. 서 있으면 죽어요.',follow:{t:'step',n:90},defy:{t:'rowClear',n:4,say:'한 줄씩 끝내겠소.'}},
  {say:'칼날 사이로 지나가 봐요.',follow:{t:'graze',n:26},defy:{t:'combo',n:40,say:'칼날보다 빨리 베겠소.'}}]},
 yakseon:{name:'떠돌이 약선',title:'산을 떠도는 의원',br:'gi',rival:'uijeok',unique:'hoechun',quests:[
  {say:'기는 아껴 모으는 것이네.',follow:{t:'fullCharge',n:2},defy:{t:'nearKill',n:22,say:'쓰라고 있는 것이 기요.'}},
  {say:'몸 안의 기를 한 바퀴 돌려 보게.',follow:{t:'charge',n:200},defy:{t:'rowClear',n:4,say:'몸으로 익히겠소.'}}]},
 uijeok:{name:'녹림 의적',title:'채주를 등진 산적',br:'gang',rival:'yakseon',unique:'uihyeop',quests:[
  {say:'한 놈도 놓치지 마라.',follow:{t:'rowClear',n:4},defy:{t:'graze',n:24,say:'싸우지 않고 지나가겠소.'}},
  {say:'붙어서 베어라. 멀리서 쏘는 건 겁쟁이다.',follow:{t:'nearKill',n:24},defy:{t:'blastKill',n:2,say:'기로 한 번에 끝내겠소.'}}]}
};
export const NPC_LINK={dosa:'monk',monk:'yakseon',yakseon:'dosa',milsa:'uijeok',uijeok:'yeonhyeop',yeonhyeop:'milsa'};
