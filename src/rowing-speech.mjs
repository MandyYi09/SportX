import {rowingSpeechById} from './rowing-speech-catalog.mjs';

export function adjustmentSpeechId(metric){
 const side=metric.key.endsWith('-1')?'right':'left',open=metric.actual<metric.target;
 const action=metric.key.startsWith('height')?`elbow-${metric.direction==='down'?'lower':'raise'}`:metric.key.startsWith('elbow')?`elbow-${open?'straighten':'bend'}`:metric.key.startsWith('knee')?`knee-${open?'straighten':'bend'}`:metric.key.startsWith('trunk')?`arm-torso-${open?'open':'close'}`:`hip-${open?'open':'close'}`;
 return `adjust-${side}-${action}`;
}
export const checkpointSpeechIds={
 'rowing-arms':['arms-extended','arms-drawn-in'],
 'rowing-half':['draw-finish','hands-away','body-forward'],
 'rowing-full':['catch','leg-drive','draw-finish','recovery'],
};
export function missingSpeechId(joint){
 const map={11:'left-shoulder',12:'right-shoulder',13:'left-elbow',14:'right-elbow',15:'left-wrist',16:'right-wrist',23:'left-hip',24:'right-hip',25:'left-knee',26:'right-knee',27:'left-ankle',28:'right-ankle'};
 const name=map[joint?.id];if(!name)return null;
 return name.endsWith('wrist')?`framing-${name}`:`tracking-${name}`;
}
// A single current intent replaces stale speech. There is no growing playback queue.
export function createRowingSpeech({getLanguage,audio=new Audio(),now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,onState=()=>{}}){
 let enabled=true,unlocked=false,blocked=false,language=getLanguage(),intent=null,timer=null,playing=null,token=0,disposed=false;
 const last=new Map();audio.preload='auto';
 const state=()=>({enabled,blocked});
 function halt(){token++;if(timer!==null)cancel(timer);timer=null;audio.pause();audio.removeAttribute('src');audio.load();playing=null;}
 function stop(){halt();intent=null;}
 function notify(){onState(state());}
 function arm(){
  if(disposed||!enabled||!unlocked||blocked||!intent||playing)return;
  if(timer!==null)cancel(timer);
  const wait=Math.max(0,intent.since+intent.delay-now(),last.has(`${language}:${intent.id}`)?last.get(`${language}:${intent.id}`)+intent.repeatMs-now():0);
  if(!Number.isFinite(wait))return;
  timer=schedule(()=>{timer=null;play();},wait);
 }
 function play(){
  if(!intent||!enabled||blocked||disposed)return;
  const active=intent,stamp=++token;playing=active.id;
  audio.src=new URL(`./assets/audio/rowing/${language}/${active.id}.mp3`,import.meta.url).href;
  audio.onended=()=>{if(stamp!==token)return;playing=null;arm();};
  audio.onerror=()=>{if(stamp!==token)return;playing=null;blocked=true;notify();};
  let promise;try{promise=audio.play();}catch(e){promise=Promise.reject(e);}
  Promise.resolve(promise).then(()=>{if(stamp===token)last.set(`${language}:${active.id}`,now());}).catch(()=>{if(stamp!==token)return;playing=null;blocked=true;notify();});
 }
 function request(id,{delay=600,repeatMs=10000}={}){
  if(disposed)return;
  const currentLanguage=getLanguage()==='zh'?'zh':'en';
  if(currentLanguage!==language){language=currentLanguage;stop();}
  if(!id||!rowingSpeechById[id]){if(intent||playing)stop();return;}
  if(intent?.id===id){arm();return;}
  halt();intent={id,delay,repeatMs,since:now()};arm();
 }
 // Run on a real user click so mobile browsers can authorize this audio element.
 function unlock(){
  if(disposed||!enabled)return;
  if(unlocked&&!blocked){arm();return;}
  const stamp=++token;blocked=false;unlocked=true;
  audio.src='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==';
  let promise;try{promise=audio.play();}catch(e){promise=Promise.reject(e);}
  Promise.resolve(promise).then(()=>{if(stamp!==token)return;audio.pause();playing=null;notify();arm();}).catch(()=>{if(stamp!==token)return;blocked=true;unlocked=false;notify();});
 }
 return {request,stop,unlock,state,
  setEnabled(next){enabled=next;stop();notify();if(next)unlock();},
  reset(){stop();last.clear();},
  dispose(){disposed=true;stop();audio.onended=audio.onerror=null;},
 };
}
