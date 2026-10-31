import {createVoiceControl,voiceCommands} from './voice-control.mjs';
import {readSetting} from './settings.mjs';

export function createVoiceControls({getLanguage,onCommand,onAnnouncement=()=>{},onAvailability=()=>{},onInterrupt=()=>{},onSpeechStart=()=>{}}){
 const mounts=new Set(),tr=(en,zh)=>getLanguage()==='zh'?zh:en;
 let utterance=null,finishAnnouncement=null,disposed=false,announcementVersion=0,recognitionLanguage=getLanguage();
 const saved=readSetting('speech-language');if(saved==='en'||saved==='zh')recognitionLanguage=saved;
 const controller=createVoiceControl({getLanguage:()=>recognitionLanguage,onSpeechStart,onInterrupt:()=>{
  announcementVersion++;finishAnnouncement?.();onAnnouncement(false);onInterrupt();
 },onCommand:async command=>{
  const version=++announcementVersion;onAnnouncement(true);
  try{
   const message=await onCommand(command);
   // Command acknowledgments do not block recognition of the next command.
   if(message)void announce(message).finally(()=>{if(version===announcementVersion)onAnnouncement(false);});
   else if(version===announcementVersion)onAnnouncement(false);
  }catch(error){if(version===announcementVersion)onAnnouncement(false);throw error;}
 },onState:render});
 const labels={off:['Voice control off','语音控制已关闭'],unsupported:['Voice control unavailable in this browser','此浏览器不支持语音控制'],starting:['Preparing microphone…','正在准备麦克风…'],listening:['Listening','正在听'],speaking:['Listening · you can interrupt the coach','正在听 · 可以打断播报'],executing:['Executing command','正在执行指令'],hidden:['Listening paused','已暂停聆听'],permission:['Allow microphone access, then retry','请允许麦克风权限后重试'],network:['Speech service unavailable · tap to retry','语音服务连接失败 · 点击重试'],language:['Speech language unavailable','此识别服务暂不支持所选语言'],error:['Microphone unavailable · tap to retry','麦克风不可用 · 点击重试'],retry:['Listening stopped · tap to retry','聆听已停止 · 点击重试'],unrecognized:['Command not recognized','未识别到指令'],'command-error':['Command failed · try again','指令未完成，请重试']};
 const setText=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
 function render(){
  const state=controller.state();
  onAvailability(state.enabled);
  for(const root of mounts){
   const button=root.querySelector('[data-voice-control]');button.disabled=!state.supported;button.setAttribute('aria-pressed',String(state.enabled));
   setText(button,tr(state.enabled?'Stop voice control':'Enable voice control',state.enabled?'关闭语音控制':'开启语音控制'));
   const status=root.querySelector('[data-voice-state]');status.hidden=state.status==='off';setText(status,tr(...(labels[state.status]||labels.off)));
   setText(root.querySelector('[data-speech-label]'),tr('Speech:','识别语言：'));root.querySelector('[data-speech-language]').value=recognitionLanguage;
   setText(root.querySelector('summary'),tr('Voice commands','语音指令'));
   setText(root.querySelector('[data-voice-help]'),tr('Start / pause / resume / end correction; show demonstration; repeat instruction; next / previous stage; next / previous movement; lock direction; reposition; turn on / off camera; switch camera; flip camera; enable / disable mirror.','开始／暂停／继续／结束纠错；查看示范；再示范一次；重复提示；下一个／上一个阶段；下一套／上一套动作；锁定朝向；重新定位；打开／关闭摄像头；切换摄像头；翻转镜头；打开／关闭镜像。'));
   setText(root.querySelector('[data-voice-service]'),tr('Choose the language you speak. During playback, try “Coach, next step”. Browser recognition may use an online service.','请选择实际说话的语言。播报期间可说“教练，下一步”。使用浏览器识别，可能连接在线服务。'));
   const interpreted=voiceCommands.find(([id])=>id===state.interpretation)?.[1].find(phrase=>/[\u3400-\u9fff]/.test(phrase)===(getLanguage()==='zh'));
   const heard=root.querySelector('[data-voice-heard]');heard.hidden=!state.lastText;setText(heard,tr('Heard: ','听到：')+state.lastText+(interpreted?' → '+interpreted:''));
  }
 }
 function announce(text){
  if(disposed||!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)return Promise.resolve();
  finishAnnouncement?.();
  return new Promise(resolve=>{
   const item=new SpeechSynthesisUtterance(text);utterance=item;item.lang=getLanguage()==='zh'?'zh-CN':'en-US';item.rate=.95;
   controller.setSpeaking('confirmation',true,text);
   let done=false;const timeout=setTimeout(()=>{speechSynthesis.cancel();finish();},12000);
   function finish(){if(done)return;done=true;clearTimeout(timeout);item.onend=item.onerror=null;if(utterance===item){utterance=null;finishAnnouncement=null;}controller.setSpeaking('confirmation',false);resolve();}
   finishAnnouncement=()=>{speechSynthesis.cancel();finish();};item.onend=item.onerror=finish;
   try{speechSynthesis.speak(item);}catch{finish();}
  });
 }
 function mount(parent){
  for(const root of mounts)if(!root.isConnected)mounts.delete(root);
  const root=document.createElement('section');root.className='voice-controls';
  root.innerHTML='<div class="voice-control-line"><button type="button" data-voice-control aria-pressed="false"></button><label class="speech-language"><span data-speech-label></span><select data-speech-language aria-label="Speech recognition language"><option value="en">English</option><option value="zh">中文</option></select></label><span data-voice-state role="status" aria-live="polite"></span></div><p data-voice-heard hidden></p><details><summary></summary><p data-voice-help></p><small data-voice-service></small></details>';
  parent.append(root);mounts.add(root);root.querySelector('button').onclick=()=>{if(controller.state().enabled){controller.disable();finishAnnouncement?.();}else controller.enable();};render();
  root.querySelector('select').onchange=event=>{recognitionLanguage=event.target.value;try{localStorage.setItem('sportx-speech-language',recognitionLanguage);}catch{}controller.languageChanged();render();};
 }
 const languageObserver=new MutationObserver(render);languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 const visibility=()=>{controller.setVisible(!document.hidden);if(document.hidden)finishAnnouncement?.();};document.addEventListener('visibilitychange',visibility);
 return {mount,setSpeaking:controller.setSpeaking,disable(){controller.disable();},dispose(){disposed=true;controller.dispose();finishAnnouncement?.();languageObserver.disconnect();document.removeEventListener('visibilitychange',visibility);}};
}
