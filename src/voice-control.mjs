// Explicit commands only: recognition never evaluates code or calls a remote API.
export const voiceCommands = [
 ['start',['开始','开始录制','开始动态练习','start','start recording','开始纠错','开始矫正','start correction','start correcting','start the correction']],
 ['end',['结束','结束录制','停止录制','finish','stop recording','结束纠错','退出纠错','end correction','stop correction']],
 ['pause',['暂停纠错','暂停练习','pause correction','pause practice','pause']],
 ['resume',['继续纠错','继续练习','resume correction','continue correction','resume','continue']],
 ['review',['查看示范','查看教练','看示范','show demonstration','show coach']],
 ['repeat-demo',['再示范一次','重新示范','repeat demonstration']],
 ['repeat',['重复提示','再说一次','我哪里不对','repeat instruction','what should i adjust']],
 ['next-stage',['下一个阶段','下一阶段','下一步','next stage','next step','next phase','next pose','next position']],
 ['previous-stage',['上一个阶段','上一阶段','上一步','previous stage','previous step','previous phase','previous pose','previous position']],
 ['next-movement',['下一套动作','下一个动作','next movement']],
 ['previous-movement',['上一套动作','上一个动作','previous movement']],
 ['lock',['锁定朝向','锁定姿势','lock direction','lock position']],
 ['reposition',['重新定位','调整姿势','reposition']],
 ['camera-on',['打开摄像头','开启摄像头','打开相机','turn on camera','open camera','open the camera','turn the camera on','turn on the camera','camera on']],
 ['camera-off',['关闭摄像头','关闭相机','turn off camera','close camera','close the camera','turn the camera off','turn off the camera','camera off']],
 ['camera-next',['切换摄像头','切换镜头','switch camera','next lens']],
 ['camera-flip',['翻转镜头','翻转摄像头','flip camera']],
 ['mirror-on',['打开镜像模式','开启镜像模式','打开镜像','开启镜像','turn on mirror','enable mirror','mirror on']],
 ['mirror-off',['关闭镜像模式','关闭镜像','turn off mirror','disable mirror','mirror off']],
 ['voice-off',['关闭语音控制','stop voice control','disable voice control']],
];
const normalize = text => text.toLowerCase().normalize('NFKC').replace(/[，。！？、,.!?；;：:]/g,'').replace(/\s+/g,' ').trim();
const negated=text=>/(?:\b(?:not|don't|dont|never|no)\b|不要|别|不想)/i.test(text);
function editDistance(a,b){
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;
 }
 return row[b.length];
}
function compatibleIntent(id,text){
 // Fuzzy spelling may repair the object, but must not guess on/off polarity.
 const positive=id==='camera-on'||id==='mirror-on',negative=id==='camera-off'||id==='mirror-off';
 if(positive&&!/(?:\b(?:on|open|enable)\b|打开|开启)/i.test(text))return false;
 if(negative&&!/(?:\b(?:off|close|disable)\b|关闭)/i.test(text))return false;
 if(positive&&/(?:\b(?:off|close|disable)\b|关闭)/i.test(text))return false;
 if(negative&&/(?:\b(?:on|open|enable)\b|打开|开启)/i.test(text))return false;
 if(id==='start'&&/(?:\b(?:stop|end)\b|结束|退出)/i.test(text))return false;
 if(id==='end'&&/(?:\bstart\b|开始)/i.test(text))return false;
 return true;
}
export function parseVoiceCommand(text,{exactOnly=false}={}){
 const clean=normalize(text).replace(/^(?:教练[，, ]*|coach\s+)/,'').replace(/^please\s+/,'').replace(/\s+please$/,'');
 if(negated(clean))return null;
 const exact=voiceCommands.find(([,phrases])=>phrases.some(phrase=>normalize(phrase)===clean));if(exact)return exact[0];
 if(exactOnly)return null;
 const compact=clean.replace(/\s/g,''),chinese=/[\u3400-\u9fff]/.test(clean);
 if(compact.length<(chinese?4:7))return null;
 if(!chinese&&clean.split(' ').length<2)return null;
 const scores=voiceCommands.filter(([id])=>compatibleIntent(id,clean)).map(([id,phrases])=>{
  const candidates=phrases.filter(phrase=>/[\u3400-\u9fff]/.test(phrase)===chinese).map(phrase=>{
   const target=normalize(phrase).replace(/\s/g,''),length=Math.max(target.length,compact.length),distance=editDistance(compact,target);
   return {score:distance/length,distance,length};
  }).sort((a,b)=>a.score-b.score);
  return {id,...candidates[0]};
 }).filter(candidate=>Number.isFinite(candidate.score)).sort((a,b)=>a.score-b.score);
 const [best,runner]=scores;if(!best)return null;
 const maxEdits=chinese?1:Math.min(3,Math.max(2,Math.floor(best.length*.25)));
 if(best.distance>maxEdits||best.score>.25)return null;
 // Ambiguous alternatives such as "st correction" need another utterance.
 if(runner&&runner.score-best.score<.07)return null;
 return best.id;
}

export function createVoiceControl({Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition,getLanguage,onCommand,onInterrupt=()=>{},onSpeechStart=()=>{},onState=()=>{},now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}){
 let enabled=false,visible=true,disposed=false,recognition=null,timer=null,busy=false,failures=0,status=Recognition?'off':'unsupported',lastText='',lastCommand=null,lastCommandAt=-Infinity,interpretation=null;
 const speakers=new Map(),recentSpeech=[];
 const state=()=>({supported:!!Recognition,enabled,status,lastText,interpretation});
 const emit=()=>onState(state());
 function clearTimer(){if(timer!==null)cancel(timer);timer=null;}
 function stopRecognition(){clearTimer();const old=recognition;recognition=null;if(old){old.onresult=old.onerror=old.onend=old.onstart=old.onspeechstart=null;try{old.abort();}catch{}}}
 const canListen=()=>enabled&&visible&&!disposed;
 const listeningStatus=()=>speakers.size?'speaking':'listening';
 function isEcho(text){
  while(recentSpeech.length&&recentSpeech[0].until<now())recentSpeech.shift();
  const input=normalize(text);if(!input)return false;
  const command=parseVoiceCommand(input),phrases=voiceCommands.find(([id])=>id===command)?.[1]||[];
  return [...speakers.values(),...recentSpeech].some(item=>{
   if(!item.text)return false;const output=normalize(item.text);
   if(output.includes(input))return true;
   // A user-added address distinguishes an interruption from a quoted command.
   if(/^(?:coach\s+|教练)/.test(input))return false;
   // Also reject imperfect transcripts of commands contained in our own audio.
   return phrases.some(phrase=>output.includes(normalize(phrase)));
  });
 }
 function queue(delay=450){clearTimer();if(canListen())timer=schedule(()=>{timer=null;start();},delay);}
 function fail(reason){enabled=false;status=reason;stopRecognition();emit();}
 function start(){
  if(!Recognition||!canListen()||recognition)return;
  let instance;try{instance=new Recognition();}catch{fail('retry');return;}
  recognition=instance;const started=now();
  instance.lang=getLanguage()==='zh'?'zh-CN':'en-US';instance.continuous=true;instance.interimResults=true;instance.maxAlternatives=3;
  status='starting';emit();
  instance.onstart=()=>{if(recognition===instance){status=listeningStatus();emit();}};
  instance.onspeechstart=()=>{if(recognition===instance){lastCommand=null;onSpeechStart(now());}};
  instance.onerror=event=>{
   if(recognition!==instance)return;
   if(event.error==='no-speech'||event.error==='aborted')return;
   fail(event.error==='not-allowed'||event.error==='service-not-allowed'?'permission':event.error==='network'?'network':event.error==='language-not-supported'?'language':'error');
  };
  instance.onend=()=>{
   if(recognition!==instance)return;recognition=null;
   failures=now()-started<1500?failures+1:0;
   if(failures>=3){fail('retry');return;}
   status='starting';emit();queue(700);
  };
  instance.onresult=event=>{
   if(recognition!==instance||!canListen()||busy)return;
   for(let i=event.resultIndex??0;i<event.results.length;i++){
    const result=event.results[i],top=result[0].transcript;
    // Never let a lower-ranked alternative turn a negated sentence into an action.
    if(negated(top))continue;
    const alternatives=Array.from(result).filter(item=>!isEcho(item.transcript));
    const match=alternatives.find(item=>parseVoiceCommand(item.transcript,{exactOnly:true}))||alternatives.find(item=>parseVoiceCommand(item.transcript));
    if(!match){if(result.isFinal&&!isEcho(top)){lastText=top;interpretation=null;status='unrecognized';emit();}continue;}
    const text=match.transcript,command=parseVoiceCommand(text);lastText=text;
    if(command===lastCommand&&now()-lastCommandAt<1500)continue;
    if(!result.isFinal){if(speakers.size)onInterrupt();continue;}
    lastCommand=command;interpretation=command;lastCommandAt=now();failures=0;busy=true;onInterrupt();status='executing';emit();
    Promise.resolve().then(()=>onCommand(command)).catch(()=>{status='command-error';emit();}).finally(()=>{
     busy=false;if(enabled&&!disposed){status=visible?(recognition?listeningStatus():'starting'):'hidden';emit();if(!recognition)queue();}
    });
    break;
   }
  };
  try{instance.start();}catch{fail('retry');}
 }
 return {state,
  enable(){if(!Recognition||disposed)return;enabled=true;failures=0;lastCommand=null;stopRecognition();status=speakers.size?'speaking':visible?'starting':'hidden';emit();start();},
  disable(){enabled=false;stopRecognition();status=Recognition?'off':'unsupported';emit();},
  setSpeaking(source,active,text=''){
   const previous=speakers.get(source);if(previous&&(!active||previous.text!==text))recentSpeech.push({...previous,until:now()+1800});
   if(recentSpeech.length>16)recentSpeech.splice(0,recentSpeech.length-16);
   if(active)speakers.set(source,{text});else speakers.delete(source);
   if(!enabled||busy)return;status=visible?(recognition?listeningStatus():'starting'):'hidden';emit();if(!recognition)queue();
  },
  setVisible(value){visible=value;stopRecognition();if(enabled){status=visible?'starting':'hidden';emit();queue();}},
  languageChanged(){stopRecognition();lastCommand=null;if(enabled){status='starting';emit();queue();}},
  dispose(){disposed=true;enabled=false;stopRecognition();},
 };
}
