import assert from 'node:assert/strict';
import {createRowingSpeech,adjustmentSpeechId,checkpointSpeechIds,missingSpeechId} from '../src/rowing-speech.mjs';
import {rowingSpeechById} from '../src/rowing-speech-catalog.mjs';
let time=0,lang='en',seq=0;const timers=new Map(),plays=[];
const audio={src:'',pause(){this.paused=true;},removeAttribute(){this.src='';},load(){},play(){this.paused=false;plays.push(this.src);return Promise.resolve();}};
const voice=createRowingSpeech({getLanguage:()=>lang,audio,now:()=>time,schedule:(fn,delay)=>{const id=++seq;timers.set(id,{fn,at:time+delay});return id;},cancel:id=>timers.delete(id)});
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
const advance=async delta=>{time+=delta;for(const[id,t]of [...timers])if(t.at<=time){timers.delete(id);t.fn();}await flush();};
voice.request('setup-ready',{delay:0,repeatMs:Infinity});await advance(100);assert.equal(plays.length,0,'Must wait for a browser gesture');
voice.unlock();await flush();await advance(0);assert.ok(plays.at(-1).endsWith('/en/setup-ready.mp3'));
await flush();audio.onended();await advance(30000);assert.equal(plays.filter(x=>x.endsWith('setup-ready.mp3')).length,1,'Once-only cues must not repeat on every frame');
voice.request('adjust-right-elbow-lower',{delay:500});await advance(300);voice.request('tracking-left-elbow',{delay:1800});await advance(500);assert.ok(!plays.some(x=>x.endsWith('adjust-right-elbow-lower.mp3')),'Stale pending instructions must be cancelled');
voice.request('adjust-right-elbow-lower',{delay:0});await advance(0);assert.ok(plays.at(-1).endsWith('/en/adjust-right-elbow-lower.mp3'));
const previousEnd=audio.onended;voice.request('confirmed-right-arm',{delay:0,repeatMs:Infinity});await advance(0);assert.ok(plays.at(-1).endsWith('/en/confirmed-right-arm.mp3'));previousEnd();assert.equal(timers.size,0,'Late events from interrupted clips must not revive stale instructions');
lang='zh';voice.request('adjust-right-elbow-lower',{delay:0});await advance(0);assert.ok(plays.at(-1).endsWith('/zh/adjust-right-elbow-lower.mp3'),'Language changes must switch MP3 assets');
const before=plays.length;voice.setEnabled(false);voice.request('aligned',{delay:0});await advance(1000);assert.equal(plays.length,before);assert.equal(audio.paused,true);
voice.setEnabled(true);await flush();voice.request('aligned',{delay:0,repeatMs:Infinity});await advance(0);assert.ok(plays.at(-1).endsWith('/zh/aligned.mp3'));
voice.reset();assert.equal(audio.paused,true);assert.equal(timers.size,0);voice.dispose();voice.request('hold');await advance(20000);assert.equal(timers.size,0);
let rejected=true;const blockedAudio={...audio,play:()=>rejected?Promise.reject(Error('NotAllowedError')):Promise.resolve()};
const recovery=createRowingSpeech({getLanguage:()=>lang,audio:blockedAudio});recovery.unlock();await flush();assert.equal(recovery.state().blocked,true);rejected=false;recovery.unlock();await flush();assert.equal(recovery.state().blocked,false);recovery.dispose();
for(const key of ['height','elbow','knee','trunk','hip'])for(const side of [0,1])for(const open of [true,false]){
 const id=adjustmentSpeechId({key:`${key}-${side}`,actual:open?1:2,target:open?2:1,direction:open?'down':'up'});assert.ok(rowingSpeechById[id],id);
}
for(const ids of Object.values(checkpointSpeechIds))for(const id of ids)assert.ok(rowingSpeechById[`checkpoint-${id}`]);
assert.equal(missingSpeechId({id:16}),'framing-right-wrist');assert.equal(missingSpeechId({id:13}),'tracking-left-elbow');
console.log('PASS: prerecorded speech unlock, EN/ZH paths, debouncing, stale cancellation, once-only cues, correction interruption, mute, reset, blocked playback recovery and cue mappings.');
