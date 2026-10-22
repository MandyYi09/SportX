import assert from 'node:assert/strict';
import {voiceCommands,parseVoiceCommand,createVoiceControl} from '../src/voice-control.mjs';
for(const [id,phrases] of voiceCommands)for(const phrase of phrases)assert.equal(parseVoiceCommand(phrase),id);
for(const text of ['不要关闭摄像头','我说的是下一个阶段吗','please do not turn off camera','不要开启镜像','下一步再打开摄像头'])assert.equal(parseVoiceCommand(text),null,text);
assert.equal(parseVoiceCommand('教练，下一步！'),'next-stage');assert.equal(parseVoiceCommand('Coach, NEXT STEP!'),'next-stage');
for(const text of ['art correction','star correction','start corection','start collection','please art correction'])assert.equal(parseVoiceCommand(text),'start',text);
assert.equal(parseVoiceCommand('top correction'),'end');assert.equal(parseVoiceCommand('next fase'),'next-stage');
assert.equal(parseVoiceCommand('turn on camra'),'camera-on');assert.equal(parseVoiceCommand('关闭摄像投'),'camera-off');
for(const text of ['st correction','correction','turn camera','别开始纠错','do not art correction','open kitchen','we are talking about art correction today'])assert.equal(parseVoiceCommand(text),null,text);
assert.equal(parseVoiceCommand('stop correction'),'end');assert.equal(parseVoiceCommand('turn off camera'),'camera-off');
let time=0,sequence=0,lang='zh';const timers=new Map(),instances=[],commands=[];let interruptions=0;
class Recognition{
 constructor(){instances.push(this);}
 start(){this.onstart?.();}
 abort(){this.aborted=true;}
 input(text,final=true){this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:final})]});}
}
const controller=createVoiceControl({Recognition,getLanguage:()=>lang,onCommand:async id=>commands.push(id),onInterrupt:()=>interruptions++,now:()=>time,schedule:(fn,delay)=>{const key=++sequence;timers.set(key,{fn,at:time+delay});return key;},cancel:key=>timers.delete(key)});
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const advance=async delta=>{time+=delta;for(const [key,timer]of [...timers])if(timer.at<=time){timers.delete(key);timer.fn();}await flush();};
controller.enable();let current=instances.at(-1);assert.equal(current.lang,'zh-CN');assert.equal(controller.state().status,'listening');
current.input('下一步',false);current.input('不要关闭摄像头');assert.equal(commands.length,0);
current.input('下一步');await flush();assert.deepEqual(commands,['next-stage']);assert.ok(!current.aborted,'Commands do not tear down a healthy recognition session');
await advance(500);current=instances.at(-1);current.input('下一步');await flush();assert.equal(commands.length,1,'Repeated final results must not skip stages');
controller.setSpeaking('rowing',true,'Say next step when you are ready.');
const count=instances.length;await advance(3000);assert.equal(instances.length,count,'TTS must not restart the recognizer');assert.ok(!current.aborted,'Continue listening during prerecorded TTS');
const beforeEcho=commands.length;current.input('next step');await flush();assert.equal(commands.length,beforeEcho,'Ignore commands quoted by the current TTS');
controller.setSpeaking('rowing',true,'Start correction when ready.');current.input('art correction');await flush();assert.equal(commands.length,beforeEcho,'Fuzzy transcripts of our own TTS must also be rejected');
current.input('coach art correction');await flush();assert.equal(commands.at(-1),'start','A user-addressed fuzzy command can interrupt a quoted instruction');
controller.setSpeaking('rowing',true,'Say next step when you are ready.');
const beforePause=commands.length;
const beforeInterim=interruptions;current.input('coach pause',false);assert.equal(interruptions,beforeInterim+1,'A distinct interim command can silence TTS');assert.equal(commands.length,beforePause,'Interim text must not execute an action');
current.input('coach pause');await flush();assert.equal(commands.at(-1),'pause','Final user commands execute during playback');
controller.setSpeaking('confirmation',true,'Please resume correction when ready.');
current.input('resume correction');await flush();assert.equal(commands.at(-1),'pause','Ignore a second source quoting another command');
controller.setSpeaking('rowing',false);await advance(500);current.input('next step');await flush();assert.equal(commands.at(-1),'pause','Reject delayed transcripts of the preceding clip');
controller.setSpeaking('confirmation',false);await advance(2000);current.input('next pose');await flush();assert.equal(commands.at(-1),'next-stage');
current.onresult({resultIndex:0,results:[Object.assign([{transcript:'next stays'},{transcript:'previous phase'}],{isFinal:true})]});await flush();assert.equal(commands.at(-1),'previous-stage','Use a known command in recognition alternatives');
current.onresult({resultIndex:0,results:[Object.assign([{transcript:'do not open the camera'},{transcript:'open camera'}],{isFinal:true})]});await flush();assert.equal(commands.at(-1),'previous-stage','Negated top result cannot execute a lower-ranked alternative');
lang='en';controller.languageChanged();await advance(500);assert.equal(instances.at(-1).lang,'en-US');
controller.setVisible(false);await advance(5000);assert.equal(controller.state().status,'hidden');controller.setVisible(true);await advance(500);
instances.at(-1).onerror({error:'network'});assert.equal(controller.state().enabled,false);await advance(5000);assert.equal(controller.state().status,'network','Do not endlessly retry failed services');
controller.enable();instances.at(-1).onerror({error:'not-allowed'});assert.equal(controller.state().status,'permission');
controller.enable();for(let i=0;i<3;i++){instances.at(-1).onend();await advance(700);}assert.equal(controller.state().status,'retry');assert.equal(controller.state().enabled,false);
controller.dispose();await advance(5000);assert.equal(timers.size,0);
const unsupported=createVoiceControl({Recognition:null,getLanguage:()=>lang,onCommand:()=>{}});unsupported.enable();assert.equal(unsupported.state().supported,false);unsupported.dispose();
console.log('PASS: all bilingual command aliases, negation rejection, final-result gating, command deduplication, simultaneous listening, TTS interruption, current/recent transcript echo filtering, recognition alternatives, language switching, visibility, permission/network failures, bounded restarts and unsupported browsers.');
