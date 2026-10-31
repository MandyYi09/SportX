import {rowingViewFeedback} from './rowing-view-feedback.mjs';
import {RowingRenderBudget} from './rowing-render-budget.mjs';
import {capturedDuration,sampleCapturedMotion} from './captured-motion.mjs';
import {rowingReferenceAt,assessRowing,fitRowingReference,rowingCheckpoints} from './rowing-correction.mjs';
import {rowingMovementArrow,paintRowingArrows} from './rowing-arrows.mjs';
import {rowingAdjustmentCue,rowingFeedbackSegments,metricLimb} from './rowing-feedback.mjs';
import {closestDynamicRow,clonePose,dynamicIssues,dynamicReference,LiveRowingMatcher} from './rowing-dynamic.mjs';
import {DynamicRowingFeedback,scoreDynamicRows,visiblePartsAligned,visibleAlignmentText,VisibleAlignmentCue} from './rowing-dynamic-feedback.mjs';
import {paintInferredArms} from './rowing-pose-tracker.mjs';
import {paintRecordingPerformance,recordedPerformanceAt} from './pose-performance.mjs';
import {preferredExportMime} from './rowing-video-export.mjs';
import {exportFramePlan,seekDecodedFrame,encodeFrameVideo} from './rowing-frame-export.mjs';
import {reviewDimensions,paintReviewFrame} from './rowing-review-layout.mjs';
import {paintCompleteSkeleton,rowingDebugData} from './rowing-debug.mjs';
import {dynamicReferenceDuration,dynamicMotionSample,dynamicReferenceAt,countdownExpertOpacity} from './rowing-reference-cycle.mjs';
import {buildRowingTakes,bestRowingTake,scoreTake,takeKeyframes,rowDeductions,formatTakeTime,stretchedExpertTime,RowingTakeClock,paintTakeScorecard} from './rowing-takes.mjs';

const bones=[[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]];
export function createRowingDynamicUI({dialog,video,canvas,arrowsLayer,id,getLanguage,getGender,getYaw,getStream,getOverlay,onPlayback=()=>{},isSpeechEnabled=()=>true,onRender=()=>{},onExpert=()=>{},onPerformance=()=>{},onAligned=()=>{},onReposition=async()=>false,onReleaseCamera=()=>{},onEnsureCamera=async()=>getStream(),onShowFPS=()=>{},onLiveLayout=()=>{},renderBudget=new RowingRenderBudget()}){
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en;
 const panel=document.createElement('section');panel.className='rowing-dynamic';panel.hidden=true;
 panel.innerHTML=`<h3>${tr('Dynamic practice','动态练习')}</h3><p data-dynamic-status role="status" aria-live="polite"></p>
 <div class="rowing-dynamic-actions"><button data-record>${tr('Start · 3, 2, 1','开始 · 3、2、1')}</button><button data-stop hidden>${tr('Finish','结束')}</button><button data-reposition>${tr('Reposition','重新定位')}</button>
 <label data-live-setting>${tr('Expert view','专家显示')} <select data-live-layout><option value="overlay">${tr('Overlay','重叠')}</option><option value="split">${tr('Side by side','双栏')}</option></select></label>
 <label data-live-setting><input data-ghost type="checkbox" checked> ${tr('Expert overlay','专家蒙版')}</label>
 <label data-live-setting>${tr('Opacity','不透明度')} <input data-alpha type="range" min="0" max="1" step="0.05" value="0.7"></label>
 <label data-live-setting>${tr('Expert start','专家起点')} <input data-expert-time type="range" min="0" step="0.05" value="0"></label>
 <label data-live-setting>${tr('Speed','速度')} <select data-speed><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option></select></label></div>
 <details data-live-debug><summary>${tr('Debug tools','调试工具')}</summary><label><input data-show-fps-live type="checkbox"> ${tr('Show FPS','显示 FPS')}</label></details>
 <div data-review hidden><div class="rowing-take-selection"><label>Take <select data-take></select></label></div>

 <div class="rowing-dynamic-actions rowing-playback-controls" data-playback-controls><button data-restart>${tr('Start again','重新开始')}</button><button data-play>${tr('Play / pause','播放／暂停')}</button><label>${tr('Slow motion','慢放')} <select data-replay-speed><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option></select></label><label><input data-loop type="checkbox" checked> ${tr('Loop selection','循环选区')}</label><label><input data-show-arrows-playing type="checkbox"> ${tr('Show arrows during playback','播放时显示方向箭头')}</label></div>
 <div data-take-markers class="rowing-take-markers"></div><output data-current-time class="rowing-current-time"></output><small>${tr('Key moments','动作关键帧')}</small><div data-keyframes class="rowing-keyframes"></div>
 <label class="rowing-dynamic-timeline">${tr('Replay','回放')} <input data-timeline type="range" min="0" step="0.01" value="0" list="rowing-take-ticks"></label><datalist id="rowing-take-ticks" data-timeline-ticks></datalist>
 <section class="rowing-review-feedback" data-review-feedback aria-label="${tr('Feedback','动作建议')}"><h4>${tr('This frame','当前画面')}</h4><p data-current-advice></p><ul data-current-advice-items></ul><h4>${tr('What to work on','需要注意的地方')}</h4><p data-issues-empty></p><ol data-issues></ol><div data-view-advice></div></section>
 <div class="rowing-dynamic-actions"><label>${tr('Trim start (s)','开始时间（秒）')} <input data-trim-start type="number" min="0" step="0.1"></label><label>${tr('Trim end (s)','结束时间（秒）')} <input data-trim-end type="number" min="0" step="0.1"></label><button data-trim>${tr('Rescore selection','重新评分')}</button><button data-export>${tr('Download take','下载本次视频')}</button><a data-download hidden></a></div>
 <details class="rowing-debug-tools"><summary>${tr('Debug tools','调试工具')}</summary><label><input data-complete-skeleton type="checkbox"> ${tr('Show complete skeleton','完整骨骼')}</label><label><input data-show-fps type="checkbox"> ${tr('Show FPS (also in download)','显示 FPS（含下载）')}</label><div class="rowing-dynamic-actions"><button data-export-data>${tr('Export as data (JSON)','导出数据（JSON）')}</button><a data-debug-download hidden></a></div><small>${tr('Data covers the full recording. Skeleton and FPS switches also apply to the annotated download.','数据包含整次录制。完整骨骼和 FPS 开关也会应用到纠错视频下载。')}</small></details>
 <p data-export-note></p><div data-export-progress class="rowing-export-progress" hidden><progress data-export-bar max="100" value="0" aria-label="${tr('Video export progress','视频导出进度')}"></progress><span data-export-percent role="status" aria-live="polite">0%</span></div>
 <p data-summary></p><section data-scores class="rowing-scores" aria-label="${tr('Movement scores','动作评分')}"></section></div>`;
 dialog.dataset.dynamic='off';dialog.append(panel);
 const feed=dialog.querySelector('.rowing-feed'),columns=document.createElement('div');columns.className='rowing-review-columns';feed.before(columns);columns.append(feed);
 const userTitle=document.createElement('strong');userTitle.className='rowing-column-title';userTitle.hidden=true;userTitle.textContent=tr('Your movement','你的动作');feed.append(userTitle);
 const expertPane=document.createElement('section');expertPane.className='rowing-expert-pane';expertPane.hidden=true;expertPane.innerHTML=`<strong class="rowing-column-title">${tr('Expert movement','专家动作')}</strong><canvas aria-label="${tr('Synchronized expert movement','同步专家动作')}"></canvas>`;columns.append(expertPane);
 const expertCanvas=expertPane.querySelector('canvas');let expertLayout=null,connecting=false;
 const staticLayoutControl=document.createElement('label');staticLayoutControl.className='rowing-live-layout';staticLayoutControl.innerHTML=`${tr('Expert view','专家显示')} <select data-live-layout-static><option value="overlay">${tr('Overlay','重叠')}</option><option value="split">${tr('Side by side','双栏')}</option></select>`;dialog.querySelector('.rowing-voice-bar').append(staticLayoutControl);
 const quickStop=document.createElement('button');quickStop.type='button';quickStop.className='rowing-quick-stop';quickStop.hidden=true;quickStop.textContent=tr('Finish','结束');dialog.querySelector('.rowing-feed').append(quickStop);
 const takeBadge=document.createElement('output');takeBadge.className='rowing-take-badge';takeBadge.hidden=true;dialog.querySelector('.rowing-feed').append(takeBadge);
 const $=s=>panel.querySelector(s==='issues'?'ol[data-issues]':`[data-${s}]`),duration=dynamicReferenceDuration(id);
 const originalButton=document.createElement('button');originalButton.dataset.exportSource='';originalButton.textContent=tr('Download original video','下载原视频');$('export').after(originalButton);
 function showFPS(value){$('show-fps').checked=$('show-fps-live').checked=value;onShowFPS(value);}
 $('show-fps').onchange=()=>showFPS($('show-fps').checked);$('show-fps-live').onchange=()=>showFPS($('show-fps-live').checked);
 showFPS(false);
 const exportMime=globalThis.MediaRecorder?preferredExportMime(t=>MediaRecorder.isTypeSupported(t)):null;
 $('export-note').textContent=tr('Download includes the replay and final scores.','下载视频包含动作回放和结尾成绩。');
 $('expert-time').max=String(duration);$('expert-time').value=String(rowingCheckpoints[id][0].time);
 let mode='off',frames=[],analysis=null,lastFrame=null,started=0,countdown=0,recorder=null,chunks=[],url=null,exportUrl=null;
 let raf=0,lastRender=0,disposed=false,version=0,utterance=null,speechOnset=null,worker=null,cancelAnalysis=null;
 let expertOrigin=performance.now(),recordDuration=0,recordingPerformance=null,exportSettings=null,sessionId=null,recordedAt=null,sourceMime=null,dataUrl=null,reanalysis=null;
 let liveMatcher=null,liveMatch=null,liveFeedback={errors:[],resolved:[]},liveUpdated=0;
 let guideAnchor=null,overlayCost=0,liveLayout='overlay';
 let takes=[],selectedTake=null,sourceRows=[],experts=null,analysisYaw=0,takeClock=null,takeClockState=null,repositioning=false;
 const feedback=new DynamicRowingFeedback(),reviewBudget=new RowingRenderBudget();
 const alignmentCue=new VisibleAlignmentCue();let alignmentSpeaking=false;
 const message=text=>{if($('dynamic-status').textContent!==text)$('dynamic-status').textContent=text;};
 let lastAdviceKey='';
 const state=()=>mode;
 function applyComparisonLayout(){
  const review=['review','exporting'].includes(mode),split=review||liveLayout==='split';columns.classList.toggle('is-review',split);expertPane.hidden=!split;userTitle.hidden=!split;staticLayoutControl.hidden=mode!=='off';dialog.querySelector('.rowing-legend').hidden=split;
  for(const control of panel.querySelectorAll('[data-live-setting]'))control.hidden=review||mode==='processing';
  for(const key of ['ghost','alpha'])$(key).closest('label').hidden=review||mode==='processing'||split;
  dialog.querySelector('[data-opacity]').closest('label').hidden=split;
  dialog.dataset.expertLayout=liveLayout;
 }
 function setLiveLayout(value){liveLayout=value==='split'?'split':'overlay';$('live-layout').value=liveLayout;staticLayoutControl.querySelector('select').value=liveLayout;guideAnchor=null;applyComparisonLayout();onLiveLayout(liveLayout);}
 $('live-layout').onchange=()=>setLiveLayout($('live-layout').value);staticLayoutControl.querySelector('select').onchange=e=>setLiveLayout(e.target.value);
 function prepareSideCanvas(width,height){columns.style.setProperty('--rowing-review-aspect',`${width} / ${height}`);if(expertCanvas.width!==width)expertCanvas.width=width;if(expertCanvas.height!==height)expertCanvas.height=height;expertCanvas.style.transform=video.style.transform;const context=expertCanvas.getContext('2d');context.fillStyle='#101b28';context.fillRect(0,0,width,height);}
 function sideGhost(time,yaw,width,height){
  const key=`${yaw}:${width}:${height}`;
  if(expertLayout?.key!==key){const points=dynamicReference(id,yaw).flatMap(e=>Object.values(e.ref)),xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys)-.35,bottom=Math.max(...ys)+.15;expertLayout={key,cx:(left+right)/2,cy:(top+bottom)/2,scale:Math.min(width*.8/Math.max(.1,right-left),height*.85/Math.max(.1,bottom-top))};}
  const a=expertLayout;return Object.fromEntries(Object.entries((mode==='off'?rowingReferenceAt:dynamicReferenceAt)(id,time,1,yaw)).map(([i,p])=>[i,{x:width*.5+(p.x-a.cx)*a.scale,y:height*.5+(p.y-a.cy)*a.scale}]));
 }
 function drawStaticExpert({time,yaw,width,height,gender}){prepareSideCanvas(width,height);return getOverlay().draw(expertCanvas.getContext('2d'),{id,time,yaw,ghost:sideGhost(time,yaw,width,height),width,height,gender,opacity:1,...renderBudget.read()});}
 function announce(text){
  if(!isSpeechEnabled()||!globalThis.speechSynthesis)return;
  if(utterance){speechSynthesis.cancel();onPlayback(false,'');}
  utterance=new SpeechSynthesisUtterance(text);utterance.lang=getLanguage()==='zh'?'zh-CN':'en-US';
  utterance.onend=utterance.onerror=()=>{utterance=null;onPlayback(false,'');};onPlayback(true,text);speechSynthesis.speak(utterance);
 }
 function setMode(next){
  if(next!=='recording'&&alignmentSpeaking){onAligned(false);alignmentSpeaking=false;}
  if(next==='recording')onPerformance('begin');
  else if(next==='processing')recordingPerformance=onPerformance('finish');
  else if(next==='countdown'||next==='ready')onPerformance('live');
  mode=next;dialog.dataset.dynamic=mode;panel.hidden=next==='off';
  const review=['review','exporting'].includes(next);applyComparisonLayout();
  $('live-debug').hidden=review||next==='processing';
  quickStop.hidden=!['countdown','recording'].includes(next);
  if(next!=='off'){
   dialog.querySelector('.rowing-header small').textContent=tr('ROWING · DYNAMIC PRACTICE','赛艇 · 动态练习');
   dialog.querySelector('.rowing-header h2').textContent=tr(['review','exporting'].includes(next)?'Movement review':'Continuous rowing practice',['review','exporting'].includes(next)?'动作纠错回放':'连续划船练习');
  }
  $('record').hidden=next!=='ready';$('stop').hidden=!['countdown','recording'].includes(next);
  $('record').textContent=tr(next==='review'?'Record again':'Start · 3, 2, 1',next==='review'?'重新录制':'开始 · 3、2、1');
  $('review').hidden=!['review','exporting'].includes(next);
  for(const key of ['expert-time','speed'])$(key).disabled=next!=='ready';
  for(const key of ['play','replay-speed','loop','timeline','trim-start','trim-end','trim','export','take','restart','reposition','complete-skeleton','show-fps','show-fps-live','show-arrows-playing','export-source','export-data'])$(key).disabled=next==='exporting'||next==='processing'||next==='preparing';
  for(const button of panel.querySelectorAll('[data-take-markers] button,[data-keyframes] button'))button.disabled=next==='exporting';
  takeBadge.hidden=!['recording','review','exporting'].includes(next);
  for(const key of ['ghost','alpha'])$(key).disabled=next==='exporting';
  for(const button of dialog.querySelectorAll('[data-rowing-mirror]'))button.disabled=next==='exporting';
  $('reposition').title=tr('Finish and preserve an active recording, then recalibrate direction.','录制中会先结束并保留结算，再重新定位朝向。');
  if(next==='ready')message(tr('Ready to record. Start the countdown, practice about three strokes, then finish. Video stays on this device.','准备录制。点击或说“开始”进入倒计时，建议连续练习三次，再点击或说“结束”。视频仅保留在本机。'));
 }
 function enter(){
  if(disposed)return;expertOrigin=performance.now();setMode('ready');
  dialog.querySelector('nav').hidden=true;dialog.querySelector('.rowing-angle-details').hidden=true;
  dialog.querySelector('.rowing-progress').hidden=true;dialog.querySelector('.rowing-instruction').hidden=true;
  dialog.querySelector('.rowing-result').hidden=true;dialog.querySelector('.rowing-status').hidden=true;arrowsLayer.replaceChildren();
  dialog.querySelector('.rowing-settings').hidden=true;
  dialog.querySelector('.rowing-legend').textContent=tr('Expert overlay / Your pose','专家蒙版 / 你的姿态');
  for(const key of ['pause','review'])dialog.querySelector(`[data-rowing-${key}]`)?.setAttribute('hidden','');
  panel.scrollIntoView({block:'nearest'});raf=requestAnimationFrame(loop);
 }
 function consume(now,pose,world,metadata={}){
  if(mode==='recording'&&now<started)return;
  renderBudget.observeInference(metadata.inference?.roundTripMs??metadata.inference?.latencyMs);
  lastFrame={t:mode==='recording'?(now-started)/1000:0,pose:clonePose(pose),world:clonePose(world),rawPose:metadata.rawPose?clonePose(metadata.rawPose):null,rawWorld:metadata.rawWorld?clonePose(metadata.rawWorld):null,inference:metadata.inference??null,width:video.videoWidth||960,height:video.videoHeight||540};
  if(mode==='recording'){
   liveMatch=liveMatcher.update(lastFrame);liveUpdated=now;
   liveFeedback=feedback.update(liveMatch.assessment,liveMatch.valid&&liveMatch.phaseReliable!==false,now);
   const cue=alignmentCue.update(liveMatch.assessment,liveMatch.valid&&(liveMatch.phaseReliable!==false||visiblePartsAligned(liveMatch.assessment)),now);
   lastFrame.liveEvaluation={valid:liveMatch.valid,phase:liveMatch.phase,phaseReliable:liveMatch.phaseReliable,phaseObserved:liveMatch.phaseObserved,expertTime:liveMatch.expert?.time,assessment:liveMatch.assessment,errorKeys:liveFeedback.errors.map(m=>m.key),aligned:cue.aligned,liveLayout,expertRenderBudget:renderBudget.read(now),guide:takeClockState?{...takeClockState}:null};
   if(cue.announce){onAligned(true);alignmentSpeaking=true;}
   else if(!cue.aligned&&alignmentSpeaking){onAligned(false);alignmentSpeaking=false;}
   frames.push(lastFrame);
   if(lastFrame.t>=120)void finish();
  }
 }
 async function begin(){
  if(!['ready','review'].includes(mode)||disposed)return false;
  if(typeof MediaRecorder==='undefined'){message(tr('Video recording is unavailable in this browser.','此浏览器不支持视频录制。'));return false;}
  if(connecting)return false;
  if(!getStream()?.active){connecting=true;message(tr('Connecting camera…','正在连接相机…'));try{await onEnsureCamera();}catch{message(tr('Camera connection failed. Please retry.','相机连接失败，请重试。'));return false;}finally{connecting=false;}if(disposed||!getStream()?.active)return false;}
  $('export-progress').hidden=true;
  alignmentCue.reset();
  if(mode==='review'){video.onloadedmetadata=null;video.pause();video.removeAttribute('src');video.srcObject=getStream();video.play().catch(()=>{});}
  version++;reanalysis=null;frames=[];analysis=null;chunks=[];speechOnset=null;recordDuration=0;liveMatch=null;liveMatcher=null;guideAnchor=null;takes=[];selectedTake=null;sourceRows=[];analysisYaw=getYaw();takeClock=null;takeClockState=null;feedback.reset();liveFeedback={errors:[],resolved:[]};$('download').hidden=true;video.playbackRate=1;
  const token=version;setMode('preparing');message(tr('Preparing expert playback…','正在准备专家动作…'));
  try{await getOverlay().prepareCycle({id,yaw:getYaw(),gender:getGender(),cancel:()=>disposed||version!==token,onProgress:p=>message(tr('Preparing expert playback ','正在准备专家动作 ')+Math.round(p*100)+'%')});}catch{message(tr('Using live expert rendering.','使用实时专家画面。'));}
  if(disposed||version!==token)return false;
  countdown=performance.now()+3000;setMode('countdown');message('3');announce('3');return true;
 }
 function startRecording(now){
  try{
   const mime=['video/webm;codecs=vp8','video/mp4','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
   recorder=new MediaRecorder(getStream(),mime?{mimeType:mime}:{});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onerror=()=>{if(!disposed){setMode('ready');message(tr('Recording interrupted. Please try again.','录制被中断，请重试。'));}};
   liveMatcher=new LiveRowingMatcher(id,{yaw:getYaw(),speed:Number($('speed').value)});
   takeClock=new RowingTakeClock(duration,{speed:Number($('speed').value),startTime:Number($('expert-time').value)});takeClock.update(now,null,liveMatcher.experts.length);
   started=now;expertOrigin=now;recordedAt=new Date().toISOString();sessionId=String(Date.now());recorder.start(250);setMode('recording');announce(tr('Record','录制'));
  }catch{recorder=null;setMode('ready');message(tr('Recording could not start. Please retry.','录制未能开始，请重试。'));}
 }
 function noteSpeechStart(now=performance.now()){if(mode==='recording')speechOnset=now;}
 function runAnalysis(inputFrames,options){
  return new Promise((resolve,reject)=>{
   worker=new Worker(new URL('./rowing-dynamic-worker.mjs',import.meta.url),{type:'module'});
   cancelAnalysis=()=>{worker?.terminate();worker=null;cancelAnalysis=null;resolve(null);};
   worker.onmessage=e=>{worker?.terminate();worker=null;cancelAnalysis=null;e.data.error?reject(Error(e.data.error)):resolve(e.data.result);};
   worker.onerror=e=>{worker?.terminate();worker=null;cancelAnalysis=null;reject(Error(e.message));};
   worker.postMessage({id,frames:inputFrames,options});
  });
 }
 async function finish({voice=false}={}){
  if(mode==='countdown'){version++;setMode('ready');return true;}
  if(mode!=='recording')return false;
  const token=version,cutoff=(voice&&speechOnset!==null&&performance.now()-speechOnset<15000?speechOnset:performance.now())-started;
  recordDuration=(performance.now()-started)/1000;setMode('processing');message(tr('Matching movement phases…','正在匹配动作阶段…'));
  const stopped=recorder;
  if(stopped.state!=='inactive')await new Promise(resolve=>{stopped.onstop=resolve;stopped.stop();});
  if(disposed||token!==version)return true;
  recorder=null;
  onReleaseCamera();
  try{
   // Yield once so processing state paints before bounded DTW work.
   await new Promise(resolve=>setTimeout(resolve,30));if(disposed||token!==version)return true;
   const yaw=analysisYaw;experts=dynamicReference(id,yaw);
   analysis=await runAnalysis(frames,{yaw,cutoff:Math.max(0,cutoff/1000),experts});
   if(disposed||token!==version)return true;
   sourceRows=analysis.rows;
   takes=buildRowingTakes(id,analysis,experts,duration);
   if(!takes.length){const range={start:analysis.start,end:analysis.end};takes=[{id:'take-1',number:1,...range,detectedComplete:false,score:scoreTake(id,sourceRows,{...range,referenceCount:experts.length,referenceDuration:duration}),keyframes:[]}];}
   if(url)URL.revokeObjectURL(url);sourceMime=stopped.mimeType;url=URL.createObjectURL(new Blob(chunks,{type:sourceMime}));chunks=[];
   video.pause();video.srcObject=null;video.src=url;video.autoplay=false;video.loop=false;video.load();
   setMode('review');$('timeline').max=String(recordDuration);$('trim-start').max=$('trim-end').max=String(recordDuration);
   renderTakeChoices();selectTake(bestRowingTake(takes).id,false);
   video.onloadedmetadata=()=>{video.onloadedmetadata=null;if(!disposed){video.currentTime=selectedTake.start;video.pause();}};
   message(tr('Best take selected.','已选中得分最高的一次。'));
  }catch{if(!disposed&&token===version){setMode('ready');video.removeAttribute('src');video.srcObject=getStream();void video.play();message(tr('Analysis failed. Please record again.','分析未完成，请重新录制。'));}}
  return true;
 }
 function issueText(issue){
  if(issue.kind==='sequence')return tr('Arms bend before leg drive finishes — keep the arms long.','蹬腿未完成就提前屈肘，应先保持伸臂。');
  const cue=rowingAdjustmentCue(issue.metric);return tr(cue.en,cue.zh);
 }
 // Developer replay path: re-run the exact recorded predictions through current
 // alignment/scoring without camera access or another round of pose inference.
 async function loadRecordedSession(data,sourceBlob,{preserveSelectedRange=false}={}){
  if(disposed||data.movement!==id||!Array.isArray(data.frames)||!sourceBlob?.size)throw Error('Invalid recorded session');
  const token=++version;frames=data.frames.map(f=>({t:f.t,width:f.width,height:f.height,pose:f.trackedPose,world:f.trackedWorld,rawPose:f.rawModelPose,rawWorld:f.rawModelWorld,inference:f.inference,liveEvaluation:f.liveEvaluation}));
  reanalysis={sourceSessionId:data.sessionId,sourceScoringVersion:data.scoring?.version,sourceReferenceDuration:data.reference?.durationSeconds,rangePreserved:preserveSelectedRange};analysisYaw=data.view.yaw;recordDuration=data.recording.durationSeconds;sessionId=data.sessionId;recordedAt=data.recordedAt;sourceMime=data.recording.sourceMime;
  setMode('processing');recordingPerformance=data.performance;experts=dynamicReference(id,analysisYaw);
  analysis=await runAnalysis(frames,{yaw:analysisYaw,trim:false,experts});if(disposed||token!==version)return null;
  sourceRows=analysis.rows;takes=buildRowingTakes(id,analysis,experts,duration);
  if(!takes.length)throw Error('No analyzable recorded take');
  const original=data.takes?.find(t=>t.id===data.selectedTakeId);let preferred=data.selectedTakeId;
  if(preserveSelectedRange&&original){const range={start:original.start,end:original.end},take={id:'reprocessed-original-selection',number:original.number,custom:true,importedRange:true,...range,score:scoreTake(id,sourceRows,{...range,referenceCount:experts.length,referenceDuration:duration}),rows:sourceRows,keyframes:takeKeyframes(id,sourceRows,range.start,range.end,experts)};takes.push(take);preferred=take.id;}
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(sourceBlob);video.pause();video.srcObject=null;video.autoplay=false;video.loop=false;video.style.transform=data.view.mirrored?'scaleX(-1)':'none';canvas.style.transform=video.style.transform;
  await new Promise((resolve,reject)=>{video.onloadedmetadata=()=>{video.onloadedmetadata=null;resolve();};video.onerror=()=>reject(Error('Original recording could not be decoded'));video.src=url;video.load();});
  if(disposed||token!==version)return null;
  setMode('review');renderTakeChoices();selectTake(takes.find(t=>t.id===preferred)?.id??bestRowingTake(takes).id);
  $('complete-skeleton').checked=!!data.view.fullSkeleton;showFPS(false);raf=requestAnimationFrame(loop);
  return {takes,selectedTake,analysis};
 }
 function renderTakeChoices(){
  $('take').replaceChildren();$('take-markers').replaceChildren();$('timeline-ticks').replaceChildren();
  const best=bestRowingTake(takes);
  for(const take of takes){
   const label=`Take ${take.number} · ${take.score.total??'—'}${tr(' pts','分')}${take===best?' ★':''}`;
   const option=document.createElement('option');option.value=take.id;option.textContent=label;option.dataset.start=String(take.start);option.dataset.end=String(take.end);option.dataset.score=String(take.score.total??-1);option.dataset.issueCount=String(dynamicIssues((take.rows??sourceRows).filter(r=>r.t>=take.start&&r.t<=take.end)).length);$('take').append(option);
   const button=document.createElement('button');button.type='button';button.textContent=`Take ${take.number}`;button.title=`${formatTakeTime(take.start)}–${formatTakeTime(take.end)}`;button.dataset.takeId=take.id;button.onclick=()=>selectTake(take.id);$('take-markers').append(button);
   if(!take.custom)for(const tick of [{t:take.start,en:`Take ${take.number}`,zh:`Take ${take.number}`},...take.keyframes]){const o=document.createElement('option');o.value=String(tick.t);o.label=`${formatTakeTime(tick.t)} · ${tr(tick.en,tick.zh)}`;$('timeline-ticks').append(o);}
  }
 }
 function selectTake(takeId,seek=true){
  const take=takes.find(t=>t.id===takeId);if(!take)return;
  selectedTake=take;analysis.rows=take.rows??sourceRows;analysis.start=take.start;analysis.end=take.end;analysis.scores=take.score;
  $('take').value=take.id;$('trim-start').value=take.start.toFixed(2);$('trim-end').value=take.end.toFixed(2);
  for(const b of $('take-markers').children)b.setAttribute('aria-pressed',String(b.dataset.takeId===take.id));
  $('keyframes').replaceChildren();
  for(const key of take.keyframes){const b=document.createElement('button');b.type='button';b.dataset.checkpoint=String(key.index);b.textContent=`${formatTakeTime(key.t)} · ${tr(key.en,key.zh)}`;b.onclick=()=>{video.pause();video.currentTime=key.t;};$('keyframes').append(b);}
  if(seek){video.pause();video.currentTime=take.start;}
  showIssues();updateCurrentTime();
 }
 function updateCurrentTime(){
  const take=selectedTake;if(!take)return;
  const text=`${formatTakeTime(video.currentTime)} / ${formatTakeTime(recordDuration)} · Take ${take.number} · +${formatTakeTime(video.currentTime-take.start)}`;
  if($('current-time').textContent!==text)$('current-time').textContent=text;
  const badge=`Take ${take.number}`;if(takeBadge.textContent!==badge)takeBadge.textContent=badge;
 }
 function seekRecording(time){
  const take=selectedTake?.custom&&time>=selectedTake.start&&time<=selectedTake.end?selectedTake:takes.find(t=>!t.custom&&time>=t.start&&time<t.end)??(time===takes.at(-1)?.end?takes.at(-1):null);
  if(take&&take.id!==selectedTake?.id)selectTake(take.id,false);
  video.pause();video.currentTime=time;updateCurrentTime();
 }
 function showIssues(){
  const selected=analysis.rows.filter(r=>r.t>=analysis.start&&r.t<=analysis.end);
  analysis.issues=dynamicIssues(selected);
  analysis.scores=selectedTake?.score??scoreDynamicRows(id,selected);
  const scores=analysis.scores,labels={'left-arm':['Left arm','左臂'],'right-arm':['Right arm','右臂'],'left-leg':['Left leg / hip','左腿／髋'],'right-leg':['Right leg / hip','右腿／髋']};
  $('scores').replaceChildren();
  const total=document.createElement('strong');total.dataset.totalScore=scores.total===null?'unknown':String(scores.total);
  total.textContent=tr('Total ','总分 ')+(scores.total===null?tr('Not scored','暂不评分'):`${scores.total} / 100`);$('scores').append(total);
  const completion=scores.completeness===null?tr('unconfirmed','待确认'):`${Math.round(scores.completeness*100)}%`;
  const note=document.createElement('p');note.textContent=tr(`Pose ${scores.pose??'—'}/100 · Rhythm ${scores.timing??'—'}/100 · Completion ${completion}`,`姿态 ${scores.pose??'—'}/100 · 节奏 ${scores.timing??'—'}/100 · 动作完成度 ${completion}`);$('scores').append(note);
  if(scores.alignmentReliable===false){const reason=document.createElement('p');reason.textContent=tr('Phase alignment incomplete. Overall score unavailable.','阶段未对齐，暂无总分。');$('scores').append(reason);}
  const table=document.createElement('table'),head=document.createElement('thead'),body=document.createElement('tbody');
  const headings=document.createElement('tr');for(const text of [tr('Part','部位'),tr('Score','得分'),tr('Observable','可判断率')]){const th=document.createElement('th');th.scope='col';th.textContent=text;headings.append(th);}head.append(headings);
  for(const part of scores.parts){const row=document.createElement('tr');row.dataset.scorePart=part.key;for(const text of [tr(...labels[part.key]),part.score===null?tr('Not enough data','数据不足'):`${part.score} / 100`,`${Math.round(part.coverage*100)}%`]){const td=document.createElement('td');td.textContent=text;row.append(td);}body.append(row);}
  table.append(head,body);$('scores').append(table);
  const complete=analysis.cycles.filter(c=>c.start>=analysis.start-.1&&c.end<=analysis.end+.1);
  const coverage=selected.length?selected.filter(r=>r.valid&&r.assessment.missing.length===0&&r.assessment.occluded.length===0).length/selected.length:0;
  $('summary').textContent=!selected.some(r=>r.valid)?tr('Not enough tracking data to review this take.','本次识别数据不足，暂时无法评价动作。'):analysis.issues.length?tr(`${analysis.issues.length} sustained errors. Click an item above to replay it.`,`有 ${analysis.issues.length} 处持续偏差，点击上方条目可回看。`):tr('No sustained errors found in the scored segments.','已评分片段中未发现持续偏差。');
  $('issues').replaceChildren();$('issues-empty').hidden=analysis.issues.length>0;
  $('issues-empty').textContent=tr('No sustained errors found. Scrub the replay for individual adjustments.','未发现持续偏差。拖动进度条可查看各时刻的调整建议。');
  $('view-advice').replaceChildren();for(const advice of rowingViewFeedback(selected)){const p=document.createElement('p');p.textContent=tr(advice.en,advice.zh);$('view-advice').append(p);}
  lastAdviceKey='';
  for(const issue of analysis.issues){
   const li=document.createElement('li'),button=document.createElement('button');button.type='button';
   const cycle=analysis.cycles.findIndex(c=>issue.start>=c.start&&issue.start<=c.end);
   button.textContent=`${cycle>=0?tr(`Stroke ${cycle+1} · `,`第 ${cycle+1} 次 · `):''}${issue.start.toFixed(1)}–${issue.end.toFixed(1)}s · ${issueText(issue)}`;
   button.onclick=()=>{video.pause();video.currentTime=Math.max(analysis.start,issue.start);};li.append(button);$('issues').append(li);
  }
  $('timeline').min='0';$('timeline').max=String(recordDuration);
 }
 function renderCurrentAdvice(row){
  const key=`${selectedTake?.id}:${row?.t}:${getLanguage()}`;if(key===lastAdviceKey)return;lastAdviceKey=key;
  const list=$('current-advice-items');list.replaceChildren();
  const prefix=row?`${formatTakeTime(row.t)} · `:'';
  let status;
  if(!row?.valid)status=tr('Not enough tracking data here. No deduction.','此处未识别清楚，不扣分。');
  else if(row.assessment.referenceTransition)status=tr('Expert loop transition. No deduction.','专家动作衔接中，不扣分。');
  else if(row.phaseReliable===false)status=tr('Not aligned yet. No deduction here.','此处暂未对齐，不扣分。');
  else{
   const aligned=visiblePartsAligned(row.assessment);
   status=aligned?tr(visibleAlignmentText.en,visibleAlignmentText.zh):tr('Try these adjustments.','可以这样调整：');
   for(const {metric,points}of rowDeductions(row).filter(d=>d.points>=1||!d.metric.close).sort((a,b)=>b.points-a.points)){
    const li=document.createElement('li'),cue=rowingAdjustmentCue(metric);li.dataset.adviceMetric=metric.key;
    li.textContent=(metric.close?tr('Fine adjustment: ','微调：'):'')+tr(cue.en,cue.zh);list.append(li);
   }
  }
  if(row?.valid&&row.phaseReliable!==false&&!row.assessment.referenceTransition&&!list.children.length&&!visiblePartsAligned(row.assessment))status=row.assessment.metrics.some(m=>m.depthUncertain)?tr('Arm depth is unclear from this view.','这个机位看不清手臂深度。'):tr('No adjustment to show here.','此处暂无调整建议。');
  $('current-advice').textContent=prefix+status;
 }
 function draw(now){
  onRender();
  if(repositioning){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);return;}
  const replay=['review','exporting'].includes(mode);
  let row=replay?closestDynamicRow(analysis?.rows??[],video.currentTime):null;
  if(replay&&!row){const captured=closestDynamicRow(frames,video.currentTime);if(captured)row={...captured,valid:false,expert:{time:(Number($('expert-time').value)+captured.t*Number($('speed').value))%duration}};}
  if(replay)onPerformance('seek',video.currentTime);
  if(replay){updateCurrentTime();if(mode==='review')renderCurrentAdvice(row);}
  if(mode==='recording'&&takeClock){
   takeClockState=takeClock.update(now,now-liveUpdated<600?liveMatch:null,liveMatcher.experts.length);
   const badge=`Take ${takeClockState.take}${takeClockState.waiting?tr(' · waiting for your finish',' · 等待完成当前动作'):''}`;if(takeBadge.textContent!==badge)takeBadge.textContent=badge;
  }
  const f=replay?row:lastFrame,w=video.videoWidth||960,h=video.videoHeight||540,ctx=canvas.getContext('2d');
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  columns.style.setProperty('--rowing-review-aspect',`${w} / ${h}`);
  const split=replay||liveLayout==='split';if(split)prepareSideCanvas(w,h);
  video.style.opacity='1';ctx.clearRect(0,0,w,h);
  canvas.dataset.errorSegments='0';canvas.dataset.resolvedSegments='0';canvas.dataset.arrowCount='0';canvas.dataset.arrowDirections='';canvas.dataset.visibleAligned='false';
  canvas.dataset.skeletonSegments='0';
  const expertTime=replay?row?.expert.time:mode==='countdown'?Number($('expert-time').value):mode==='recording'&&liveMatch?liveMatch.expert.time:(Number($('expert-time').value)+(now-expertOrigin)/1000*Number($('speed').value))%duration;
  let assessment,ghost;
  if(Number.isFinite(expertTime)){
   const yaw=replay?analysisYaw:getYaw(),ref=dynamicReferenceAt(id,expertTime,1,yaw),source=dynamicMotionSample(id,expertTime).coords;
   assessment=replay&&row?.assessment?row.assessment:mode==='recording'&&liveMatch?liveMatch.assessment:assessRowing(id,f?.pose,ref,w,h,{world:f?.world,source,yaw});ghost=fitRowingReference(ref,assessment.actual,w,h,assessment.side);
   if(split||mode==='countdown'||((exportSettings?.ghost??$('ghost').checked)&&(exportSettings?.alpha??Number($('alpha').value))>0))try{
    const guideTime=replay?(stretchedExpertTime(analysis.rows,video.currentTime,duration)??expertTime):mode==='countdown'?Number($('expert-time').value):mode==='recording'&&takeClockState?takeClockState.time:(Number($('expert-time').value)+(now-expertOrigin)/1000*Number($('speed').value))%duration;
    const guideRef=guideTime===expertTime?ref:dynamicReferenceAt(id,guideTime,1,yaw);
    let guideGhost=fitRowingReference(guideRef,assessment.actual,w,h,assessment.side);
    if(split)guideGhost=sideGhost(guideTime,yaw,w,h);
    if(!split){
     if(!guideAnchor){
      const pair=[[11,23],[12,24],[11,12]].find(([a,b])=>assessment.actual[a]&&assessment.actual[b]&&Math.hypot(guideRef[a].x-guideRef[b].x,guideRef[a].y-guideRef[b].y)>.09);
      if(pair){const[a,b]=pair,scale=Math.hypot(guideGhost[a].x-guideGhost[b].x,guideGhost[a].y-guideGhost[b].y)/Math.hypot(guideRef[a].x-guideRef[b].x,guideRef[a].y-guideRef[b].y),anchor=assessment.actual[27]?27:assessment.actual[23]?23:11;guideAnchor={scale,anchor,x:guideGhost[anchor].x,y:guideGhost[anchor].y};}
     }
     if(guideAnchor){const a=guideAnchor;guideGhost=Object.fromEntries(Object.entries(guideRef).map(([i,p])=>[i,{x:a.x+(p.x-guideRef[a.anchor].x)*a.scale,y:a.y+(p.y-guideRef[a.anchor].y)*a.scale}]));}
    }
    const normalOpacity=exportSettings?.alpha??Number($('alpha').value),opacity=mode==='countdown'?countdownExpertOpacity(now,countdown,normalOpacity,split):split?1:normalOpacity;
    const budget=replay?reviewBudget:renderBudget,fullQuality=mode==='exporting'||replay&&video.paused;
    const before=performance.now(),rendered=getOverlay().draw(split?expertCanvas.getContext('2d'):ctx,{id,time:guideTime,yaw,ghost:guideGhost,width:w,height:h,gender:exportSettings?.gender??getGender(),opacity,...(fullQuality?{maxFps:Infinity,maxWidth:720}:budget.read(now)),dynamicCycle:true,usePrepared:!fullQuality});
    canvas.dataset.expertOpacity=String(opacity);canvas.dataset.expertPlayback=rendered.cached?'prepared':'live';
    if(rendered.rendered){overlayCost=overlayCost*.8+(performance.now()-before)*.2;if(!fullQuality)budget.observeRender(performance.now()-before);onExpert();}
    canvas.dataset.guideTime=String(guideTime);canvas.dataset.expertBudgetFps=String(rendered.cached?30:fullQuality?Infinity:budget.read(now).maxFps);canvas.dataset.expertBudgetWidth=String(rendered.cached?rendered.sourceWidth:fullQuality?720:budget.read(now).maxWidth);
   }catch{message(tr('Expert rendering unavailable; pose analysis remains available.','专家模型暂无法显示，仍可分析姿势。'));}
  }
  if(replay&&(exportSettings?.fullSkeleton??$('complete-skeleton').checked))canvas.dataset.skeletonSegments=String(paintCompleteSkeleton(ctx,f?.pose,w,h));
  const recent=f&&(replay?Math.abs(f.t-video.currentTime)<.3:now-(started+f.t*1000)<600||mode!=='recording');
  if(assessment&&recent){
   const live=mode==='recording'&&now-liveUpdated<500;
   const issues=replay?rowDeductions(row).filter(d=>!d.metric.close).map(d=>({kind:'pose',key:d.metric.key,metric:d.metric})).concat(analysis.issues.filter(i=>i.kind==='sequence'&&row.t>=i.start&&row.t<=i.end)):live?liveFeedback.errors.map(metric=>({kind:'pose',metric})):[];
   const keys=new Set(issues.filter(i=>i.kind==='pose').map(i=>i.key));
   const errors=replay&&row.valid&&row.phaseReliable!==false?assessment.metrics.filter(m=>keys.has(m.key)&&!m.close):live?liveFeedback.errors:[];
   const resolved=live?liveFeedback.resolved:[];
   const segments=rowingFeedbackSegments(bones,errors,resolved);
   canvas.dataset.errorSegments=String(segments.filter(s=>s.state==='error').length);canvas.dataset.resolvedSegments=String(segments.filter(s=>s.state==='resolved').length);
   for(const{a,b,state}of segments){const p=assessment.actual[a],q=assessment.actual[b];if(!p||!q)continue;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=state==='error'?'#ffbd77':'#a7f3b8';ctx.lineWidth=Math.max(3,h*.006);ctx.stroke();
    for(const point of [p,q]){ctx.beginPath();ctx.arc(point.x,point.y,4,0,Math.PI*2);ctx.fillStyle=ctx.strokeStyle;ctx.fill();}
   }
   const arrowParts=new Set(),arrows=[],reviewArrows=mode==='review'&&(video.paused||$('show-arrows-playing').checked);
   const positionHints=reviewArrows&&row?.valid&&row.phaseReliable!==false&&!row.assessment.referenceTransition?assessment.metrics.filter(m=>m.kind==='position'&&!m.close&&!m.estimated):[];
   const arrowMetrics=mode==='review'&&!reviewArrows?[]:[...errors,...positionHints];
   for(const m of arrowMetrics.toSorted((a,b)=>b.delta/b.tolerance-a.delta/a.tolerance)){
    const part=reviewArrows?`${metricLimb(m)}:${m.key.startsWith('elbow')||m.key.startsWith('knee')?'bend':'position'}`:metricLimb(m);if(arrowParts.has(part))continue;
    const arrow=rowingMovementArrow(m,assessment.actual,ghost,w,h);if(arrow){arrows.push(arrow);arrowParts.add(part);}if(!reviewArrows&&arrows.length===2)break;
   }
   canvas.dataset.arrowCount=String(arrows.length);canvas.dataset.arrowStyle='dashed';canvas.dataset.arrowDirections=arrows.map(a=>a.direction).join(',');
   paintRowingArrows(ctx,arrows,{time:replay?video.currentTime*1000:now,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});
   if(reviewArrows){
    canvas.dataset.arrowKeys=arrows.map(a=>a.key).join(',');ctx.save();const mirrored=video.style.transform==='scaleX(-1)';if(mirrored){ctx.translate(w,0);ctx.scale(-1,1);}ctx.font='600 13px sans-serif';
    for(const a of arrows){const right=a.key.endsWith('-1'),elbow=a.key.startsWith('elbow'),leg=a.key.startsWith('knee')||a.key.startsWith('hip'),label=tr((right?'Right ':'Left ')+(elbow?'elbow':leg?'leg':'upper arm'),(right?'右':'左')+(elbow?'肘':leg?'腿':'上臂')),x=Math.max(4,Math.min(w-100,mirrored?w-a.from.x:a.from.x)),y=Math.max(20,a.from.y-14);ctx.fillStyle='#15212aee';ctx.fillRect(x-3,y-15,ctx.measureText(label).width+6,20);ctx.fillStyle='#fff0c2';ctx.fillText(label,x,y);}
    ctx.restore();
   }
   paintInferredArms(ctx,assessment.actual,assessment.inferred);
   if(replay&&row){
    const deductions=rowDeductions({...row,assessment});canvas.dataset.deductionCount=String(deductions.length);
    ctx.save();ctx.font=`700 ${Math.max(16,Math.round(w/42))}px sans-serif`;
    for(const {metric,points}of deductions){const joint=metric.ids[1],point=assessment.actual[joint];if(!point)continue;let x=Math.max(4,Math.min(w-110,point.x+12)),y=Math.max(30,Math.min(h-110,point.y-12));
     ctx.save();if(video.style.transform==='scaleX(-1)'){ctx.translate(w,0);ctx.scale(-1,1);x=w-x-100;}
     const text=`${metric.estimated?'≈ ':''}−${points.toFixed(1)}`;ctx.fillStyle='#15212aed';ctx.fillRect(x-4,y-23,ctx.measureText(text).width+8,29);ctx.fillStyle=metric.estimated?'#9ed4ff':'#ffcf81';ctx.fillText(text,x,y);ctx.restore();
    }ctx.restore();
   }else canvas.dataset.deductionCount='0';
   canvas.dataset.inferredJoints=(assessment.inferred??[]).join(',');
   const badView=(replay||live)&&((replay?!row.valid:!liveMatch.valid)||assessment.missing.length||assessment.occluded.length);
   const aligned=(replay?row.valid&&row.phaseReliable!==false:live&&liveMatch.valid)&&visiblePartsAligned(assessment);canvas.dataset.visibleAligned=String(!!aligned);
   const texts=replay&&row.assessment.referenceTransition?[tr('Expert loop transition — no pose deductions','参考动作循环过渡，此时不扣姿态分')]:replay&&row.phaseReliable===false?[tr('Phase alignment uncertain — no pose deductions','阶段对齐尚不确定，此时不扣姿态分')]:aligned?[tr(visibleAlignmentText.en,visibleAlignmentText.zh)]:issues.slice(0,2).map(issueText);if(!aligned&&!errors.length&&resolved.length)texts.push(tr('✓ Position corrected','✓ 已调整准确'));if(assessment.inferred?.length&&texts.length<2)texts.push(tr('Arm tracking uncertain','手臂暂未跟稳'));else if(!aligned&&badView&&texts.length<2)texts.push(tr('Comparing visible parts only','仅比较已识别的部位'));
   if(texts.length){
    ctx.save();if(video.style.transform==='scaleX(-1)'){ctx.translate(w,0);ctx.scale(-1,1);}
    ctx.font=`600 ${Math.max(16,Math.round(w/40))}px sans-serif`;ctx.fillStyle='#15212aed';ctx.fillRect(10,h-35-texts.length*34,w-20,25+texts.length*34);ctx.fillStyle=aligned||!errors.length&&resolved.length?'#a7f3b8':'#fff0c2';texts.forEach((text,i)=>ctx.fillText(text,24,h-25-(texts.length-1-i)*34,w-48));ctx.restore();
   }
  }
  if(mode==='recording')message(tr(`Recording · ${((now-started)/1000).toFixed(1)}s · Finish after your strokes` ,`录制中 · ${((now-started)/1000).toFixed(1)} 秒 · 完成后点击或说“结束”`));
 }
 function loop(now){
  if(disposed||mode==='off')return;
  if(mode==='review'&&!video.paused)reviewBudget.observeFrame(now);else if(!['review','exporting','processing'].includes(mode))renderBudget.observeFrame(now);
  if(mode==='countdown'){
   const remaining=Math.ceil((countdown-now)/1000);
   if(remaining<=0)startRecording(now);
   else if($('dynamic-status').textContent!==String(remaining)){message(String(remaining));announce(String(remaining));}
  }
  if(mode==='review'&&analysis&&!video.paused&&video.currentTime>=analysis.end){
   if($('loop').checked)video.currentTime=analysis.start;else video.pause();
  }
  if(mode!=='exporting'&&mode!=='processing'&&mode!=='preparing'&&now-lastRender>32){lastRender=now;draw(now);if(mode==='review')$('timeline').value=String(video.currentTime);}
  raf=requestAnimationFrame(loop);
 }
 $('record').onclick=begin;$('stop').onclick=()=>void finish();
 $('restart').onclick=begin;$('take').onchange=()=>selectTake($('take').value);
 $('reposition').onclick=async()=>{
  if(repositioning||['processing','exporting'].includes(mode))return;
  if(mode==='recording')await finish();else if(mode==='countdown')await finish();
  if(disposed)return;const token=version,review=mode==='review',saved=video.currentTime;video.pause();repositioning=true;$('reposition').disabled=true;$('record').disabled=true;$('restart').disabled=true;
  video.onloadedmetadata=null;message(tr('Repositioning. Keep your shoulders visible briefly.','重新定位中，请让双肩入镜并稍作停留。'));
  try{
   await onEnsureCamera();if(disposed||token!==version)return;video.srcObject=getStream();
   await video.play();const success=await onReposition();if(disposed||token!==version)return;
   guideAnchor=null;liveMatcher=null;
   message(success?tr('Direction updated. Start again when ready; the existing take keeps its original view.','朝向已更新。准备好后重新开始；已有 Take 保留原来的视角。'):tr('Direction not stable yet. Reposition and retry.','朝向尚未稳定，请调整后重试。'));
  }catch{if(!disposed)message(tr('Reposition failed. Please retry.','重新定位未完成，请重试。'));}
  finally{
   repositioning=false;if(!disposed&&token===version){$('reposition').disabled=false;$('record').disabled=false;$('restart').disabled=false;
    if(review){video.pause();video.srcObject=null;video.src=url;video.onloadedmetadata=()=>{video.onloadedmetadata=null;video.currentTime=saved;video.pause();};video.load();}
   }
  }
 };
 quickStop.onclick=()=>void finish();
 $('expert-time').oninput=()=>{expertOrigin=performance.now();};$('speed').onchange=()=>{expertOrigin=performance.now();};
 $('play').onclick=()=>{if(video.paused){if(video.currentTime>=analysis.end||video.currentTime<analysis.start)video.currentTime=analysis.start;void video.play();}else video.pause();};
 $('timeline').oninput=()=>seekRecording(Number($('timeline').value));
 $('replay-speed').onchange=()=>{video.playbackRate=Number($('replay-speed').value);};
 $('trim').onclick=async()=>{
  const start=Number($('trim-start').value),end=Number($('trim-end').value);
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>recordDuration||end-start<.3){message(tr('Choose a valid range of at least 0.3 seconds.','请选择至少 0.3 秒、且在视频内的裁剪范围。'));return;}
  const token=version;video.pause();setMode('processing');message(tr('Realigning and rescoring this range as one take…','正在将选区作为一个 Take 重新对齐、评分…'));
  try{
   const result=await runAnalysis(frames.filter(f=>f.t>=start&&f.t<=end),{yaw:analysisYaw,trim:false,experts});if(disposed||token!==version||!result)return;
   const take={id:'custom-take',number:takes.filter(t=>!t.custom).length+1,custom:true,start,end,rows:result.rows,score:scoreTake(id,result.rows,{start,end,referenceCount:experts.length,referenceDuration:duration}),keyframes:takeKeyframes(id,result.rows,start,end,experts)};
   takes=takes.filter(t=>!t.custom);takes.push(take);setMode('review');renderTakeChoices();selectTake(take.id);
   message(tr('Range rescored. Incomplete motion reduces the take score even if marked as a full take.','选区已重新评分；即使作为完整 Take，动作未完成的部分仍会影响得分。'));
  }catch{if(!disposed){setMode('review');message(tr('Could not rescore. Please retry.','重新评分未完成，请重试。'));}}
 };
 async function exportVideo(){
  if(mode!=='review'||analysis.end-analysis.start<.3)return;
  if(!globalThis.VideoEncoder){message(tr('This browser cannot encode individual video frames. Use a current Chrome or Edge browser.','当前浏览器不支持逐帧视频编码，请使用新版 Chrome 或 Edge。'));return;}
  const token=version,exportTake=selectedTake,output=document.createElement('canvas');Object.assign(output,reviewDimensions(canvas.width,canvas.height));
  panel.dataset.exportError='';
  const cardSeconds=2.5;
  const ctx=output.getContext('2d'),savedTime=video.currentTime,savedRate=video.playbackRate;
  exportSettings={ghost:$('ghost').checked,alpha:Number($('alpha').value),gender:getGender(),fullSkeleton:$('complete-skeleton').checked,showFps:$('show-fps').checked};
  const mirrored=video.style.transform==='scaleX(-1)';
  $('download').hidden=true;$('export-progress').hidden=false;$('export-bar').value=0;$('export-percent').textContent='0%';
  setMode('exporting');message(tr('Exporting… Keep this page visible.','正在导出…请保持页面可见。'));
  const progress=value=>{$('export-bar').value=value;if($('export-percent').textContent!==`${value}%`)$('export-percent').textContent=`${value}%`;};
  try{
   video.pause();video.playbackRate=1;
   const plan=exportFramePlan(exportTake.start,exportTake.end,{cardSeconds});
   const exported=await encodeFrameVideo({canvas:output,plan,mime:exportMime,
    active:()=>!disposed&&version===token,
    progress:value=>progress(Math.floor(value)),
    render:async frame=>{
     if(frame.card){paintTakeScorecard(ctx,exportTake,output.width,output.height,getLanguage());return;}
     await seekDecodedFrame(video,frame.sourceTime);
     if(disposed||version!==token)throw Error('Export cancelled');
     draw(frame.sourceTime*1000);
     paintReviewFrame(ctx,{video,overlay:canvas,expert:expertCanvas,mirrored,language:getLanguage(),paintPerformance:(context,width)=>{if(exportSettings.showFps)paintRecordingPerformance(context,recordedPerformanceAt(recordingPerformance,frame.sourceTime),width,{language:getLanguage()});}});
    }});
   if(disposed||version!==token)return;
   if(exportUrl)URL.revokeObjectURL(exportUrl);exportUrl=URL.createObjectURL(exported);
   progress(100);
   const link=$('download');link.href=exportUrl;link.download=`sportx-${id}-take-${exportTake.number}${exportTake.custom?'-custom':''}.${exported.type.includes('mp4')?'mp4':'webm'}`;link.textContent=tr(`Download Take ${exportTake.number}`,`下载 Take ${exportTake.number}`);link.hidden=false;link.click();message(tr('Take video and final scorecard ready.','Take 视频和结尾成绩页已生成。'));
  }catch(error){if(!disposed){panel.dataset.exportError=error.message;console.error('Take export failed',error);message(tr('Export failed. You can retry from the replay.','导出未完成，可以从回放重试。'));$('export-percent').textContent=tr('Failed · retry','失败 · 请重试');}}
  finally{
   exportSettings=null;
   if(!disposed&&token===version){video.pause();video.playbackRate=savedRate;video.currentTime=savedTime;setMode('review');}
  }
 }
 $('export').onclick=()=>void exportVideo();
 function sourceFilename(){return `sportx-${id}-${sessionId}-source.${sourceMime?.includes('mp4')?'mp4':'webm'}`;}
 $('export-source').onclick=()=>{if(mode!=='review'||!url)return;const link=$('debug-download');link.href=url;link.download=sourceFilename();link.click();};
 $('export-data').onclick=()=>{
  if(mode!=='review'||!analysis)return;
  const data=rowingDebugData({id,sessionId,recordedAt,recordDuration,sourceFilename:sourceFilename(),sourceMime,yaw:analysisYaw,gender:getGender(),mirrored:video.style.transform==='scaleX(-1)',fullSkeleton:$('complete-skeleton').checked,showFps:$('show-fps').checked,liveLayout,frames,rows:sourceRows,takes,selectedTake,experts,referenceDuration:duration,performance:recordingPerformance,reanalysis});
  if(dataUrl)URL.revokeObjectURL(dataUrl);dataUrl=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link=$('debug-download');link.href=dataUrl;link.download=`sportx-${id}-${sessionId}-data.json`;link.click();
 };
 function dispose(){
  if(alignmentSpeaking)onAligned(false);
  disposed=true;version++;cancelAnimationFrame(raf);video.onloadedmetadata=null;cancelAnalysis?.();worker?.terminate();worker=null;
  if(recorder?.state!=='inactive')recorder?.stop();
  if(utterance){speechSynthesis.cancel();onPlayback(false,'');}if(url)URL.revokeObjectURL(url);if(exportUrl)URL.revokeObjectURL(exportUrl);if(dataUrl)URL.revokeObjectURL(dataUrl);
  video.pause();video.removeAttribute('src');panel.remove();quickStop.remove();takeBadge.remove();userTitle.remove();staticLayoutControl.remove();columns.before(feed);columns.remove();
 }
 function syncSpeech(){if(!isSpeechEnabled()&&utterance){speechSynthesis.cancel();utterance=null;onPlayback(false,'');}}
 return {enter,consume,state,begin,finish,noteSpeechStart,dispose,syncSpeech,reposition:()=>$('reposition').onclick(),isLiveSplit:()=>liveLayout==='split',drawStaticExpert,setFPS:showFPS,loadRecordedSession,exportVideo};
}
