import { G } from './context';
import { $ } from './dom';

export function initAudio(){try{G.audio??=new(window.AudioContext||window.webkitAudioContext)();if(!G.mix){G.mix=G.audio.createGain();G.mix.gain.value=.22;G.mix.connect(G.audio.destination)}if(G.audio.state==='suspended')G.audio.resume()}catch{}}
export function tone(f,d=.08,type='sine',gain=.1,end=f){if(!G.audio||G.muted)return;const o=G.audio.createOscillator(),g=G.audio.createGain(),t=G.audio.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+d);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(G.mix);o.start();o.stop(t+d+.01)}
export function boom(big=false){if(!G.audio||G.muted)return;const len=big?.42:.16,buffer=G.audio.createBuffer(1,G.audio.sampleRate*len,G.audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**2;const source=G.audio.createBufferSource(),filter=G.audio.createBiquadFilter(),g=G.audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=big?600:1800;g.gain.value=big?.55:.18;source.connect(filter);filter.connect(g);g.connect(G.mix);source.start();tone(big?95:150,len,'sine',.3,30)}
export function chime(){tone(660,.13,'sine',.2,880);setTimeout(()=>tone(990,.18,'sine',.15,1320),70)}
export function soundToggle(){G.muted=!G.muted;if(!G.muted)initAudio();for(const id of ['soundIntro','soundPause'])$(id).textContent=G.muted?'♪ 소리 꺼짐':'♪ 소리 켜짐'}
