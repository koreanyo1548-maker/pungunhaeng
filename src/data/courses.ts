export const COURSES={
 ground:{name:'땅',label:'땅의 길',desc:'산길과 대숲을 달리고 뛴다. 좌우로만 움직인다.',regions:[
  {name:'풍운객잔 · 산길',boss:'녹림 채주',type:3,color:'#ffc179',branch:'gang',terrain:'rock',world:0,hint:'바위가 길을 막는다 · 부수며 나아가라',patterns:['fan','dive','lanes']},
  {name:'청죽림 · 절벽',boss:'철갑 권승',type:6,color:'#9fe5dd',branch:'yu',terrain:'bamboo',world:1,hint:'죽창이 쏟아진다 · 스치며 흘려라',patterns:['lanes','fan','dive']},
  {name:'폐사 · 향로전',boss:'천마 교주',type:7,color:'#f6bc83',branch:'gi',terrain:'cloud',world:0,hint:'향로의 기운이 짙다 · 내공이 빠르게 찬다',patterns:['dive','lanes','fan']},
  {name:'검총',boss:'심마',type:8,color:'#c9a6ff',branch:null,terrain:'gate',world:1,hint:'칼들의 무덤 · 지나온 인연이 모인다',patterns:['fan','lanes','dive'],final:true,
   intro:'꽂힌 칼들 사이에 그대의 그림자, 심마(心魔)가 서 있다. 지나온 길에서 맺은 인연이 이곳에 모인다.',enter:'검총으로 들어선다',win:'검총 제패',winLine:'땅의 끝을 밟았다'}]},
 sky:{name:'하늘',label:'하늘의 길',desc:'검을 타고 운해를 가른다. 상하좌우로 움직인다.',regions:[
  {name:'운해 · 유운봉',boss:'철갑 권승',type:6,color:'#9fe5dd',branch:'yu',terrain:'bamboo',skin:'wind',world:2,hint:'바람 칼날이 떨어진다 · 스치며 흘려라',patterns:['lanes','fan','dive']},
  {name:'운해 · 부유암',boss:'녹림 채주',type:3,color:'#ffc179',branch:'gang',terrain:'rock',world:2,hint:'떠다니는 바위섬 · 부수며 나아가라',patterns:['fan','dive','lanes']},
  {name:'운해 · 천마성',boss:'천마 교주',type:7,color:'#f6bc83',branch:'gi',terrain:'cloud',world:2,hint:'기류가 거세다 · 내공이 빠르게 찬다',patterns:['dive','lanes','fan']},
  {name:'천문',boss:'심마',type:8,color:'#c9a6ff',branch:null,terrain:'gate',skin:'wind',world:2,hint:'하늘 끝 문 · 지나온 인연이 모인다',patterns:['fan','lanes','dive'],final:true,
   intro:'하늘 끝 문 앞에 그대의 그림자, 심마(心魔)가 서 있다. 지나온 길에서 맺은 인연이 이곳에 모인다.',enter:'천문으로 오른다',win:'천문 등정',winLine:'하늘 끝에 닿았다'}]}
};
