// Offline review artifact: real source atlas frames, no exported/modified image files.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const groups = [
  ['signature', ['만천화우', '유수파', '철갑공', '천마군림']],
  ['movement', ['잔영검', '비연보', '무영신법', '회선비검']],
  ['attack', ['붕산권', '파진검강', '연환격', '의협난도']],
  ['passive', ['철골', '쇄갑', '축기', '만류귀종']],
  ['energy', ['검우', '기탄', '회기', '태극운검']],
  ['secret', ['혈마해방', '금강부동', '회춘단', '녹림도법']],
  ['flight', ['꽃잎 비도 · 비행', '쌍검기 · 비행', '관통 검강 · 비행', '도기 · 비행', '기탄 · 비행', '태극 · 비행']],
  ['swap-poses', ['풍운객 · 교체', '철혈 · 교체', '묵영 · 교체', '비천 · 교체', '운학 · 교체', '홍련 · 교체']],
];
const sheets = await Promise.all(
  groups.map(async ([file, names]) => ({
    file,
    names,
    url: 'data:image/png;base64,' + (await readFile(`src/assets/images/skills/${file}.png`)).toString('base64'),
  })),
);
const out = process.argv[2] || '/workspace/artifacts/skill-animation-gallery.html';
await mkdir(out.slice(0, out.lastIndexOf('/')), { recursive: true });
await writeFile(
  out,
  `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>풍운행 · 기술 애니메이션 검토</title><style>
body{margin:0;background:#0c1c20;color:#e5eee8;font:16px system-ui}header{position:sticky;top:0;padding:18px 5%;background:#10262bf5;z-index:1;border-bottom:1px solid #47645d}h1{font-size:22px;margin:0 0 10px}p{line-height:1.6;font-size:14px;color:#bacdc5}button,select{padding:8px;background:#23473e;color:white;border:1px solid #648e7b;border-radius:6px;margin-right:12px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;padding:24px 5%}article{border:1px solid #34554e;border-radius:12px;overflow:hidden;background:#152b2b}h2{font-size:15px;margin:14px}canvas{display:block;width:100%;aspect-ratio:1}small{display:block;padding:0 14px 14px;color:#a1b9ae}input{vertical-align:middle;width:120px}</style>
<header><h1>풍운행 · 기술 애니메이션 1차</h1><p>24개 기술 효과 · 6종 발사체 반복 동작 · 6명 교체 자세. 실제 전투 타이밍은 게임 빌드에서 확인합니다.</p><button id="play">일시정지</button><label>속도 <select id="speed"><option value=".5">0.5배</option><option selected value="1">1배</option><option value="1.5">1.5배</option></select></label><label>프레임 <input id="frame" type="range" min="0" max="5" value="0"></label><button id="bg">밝은 배경으로</button></header><main id="grid"></main>
<script>const data=${JSON.stringify(sheets)};let playing=true,bright=false,time=0,last=performance.now(),manual=0;const cards=[];
for(const s of data){s.im=new Image;s.im.src=s.url;s.names.forEach((name,row)=>{const article=document.createElement('article');const h=document.createElement('h2');h.textContent=name;const c=document.createElement('canvas');c.width=c.height=256;const small=document.createElement('small');small.textContent=s.file==='swap-poses'?'4프레임 · 교체 동작':s.file==='flight'?'6프레임 · 반복 비행':'6프레임 · 전개부터 소멸';article.append(h,c,small);grid.append(article);cards.push({s,row,c,ctx:c.getContext('2d')})})}
play.onclick=()=>{playing=!playing;play.textContent=playing?'일시정지':'재생'};frame.oninput=()=>{playing=false;play.textContent='재생';manual=+frame.value};bg.onclick=()=>{bright=!bright;bg.textContent=bright?'어두운 배경으로':'밝은 배경으로'};
function render(now){if(playing)time+=(now-last)/1000*+speed.value;last=now;for(const {s,row,c,ctx}of cards){ctx.globalCompositeOperation='source-over';ctx.fillStyle=bright?'#68786f':'#152b2b';ctx.fillRect(0,0,256,256);if(!s.im.complete||!s.im.naturalWidth)continue;const cols=s.file==='swap-poses'?4:6;const f=playing?Math.floor(time*(cols===4?8:12))%cols:Math.min(cols-1,manual);const w=s.im.width/cols,h=s.im.height/s.names.length;ctx.globalCompositeOperation=s.file==='swap-poses'?'source-over':'screen';ctx.drawImage(s.im,f*w+2,row*h+2,w-4,h-4,16,16,224,224)}requestAnimationFrame(render)}requestAnimationFrame(render);</script></html>`,
);
console.log(out);
