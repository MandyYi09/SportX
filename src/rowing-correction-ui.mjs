import {RowingRenderBudget} from './rowing-render-budget.mjs';
import {createRowingSpeech,adjustmentSpeechId,checkpointSpeechIds,missingSpeechId} from './rowing-speech.mjs';
import {rowingMovementArrow,renderRowingArrows} from './rowing-arrows.mjs';
import {RowingFeedbackCycle,RowingLimbFeedback,rowingAdjustmentCue,rowingFeedbackSegments} from './rowing-feedback.mjs';
import {createRowingExpertOverlay} from './rowing-expert-overlay.mjs';
import {rowingCheckpoints,rowingReference,assessRowing,fitRowingReference,rowingCheckpointComplete} from './rowing-correction.mjs';
import {createRowingDynamicUI} from './rowing-dynamic-ui.mjs';
import {sampleCapturedMotion} from './captured-motion.mjs';
import {RowingOrientation,estimateRowingYaw,sourceLateral} from './rowing-orientation.mjs';
import {RowingPoseTracker,paintInferredArms} from './rowing-pose-tracker.mjs';
import {createPosePerformanceHUD} from './pose-performance.mjs';
import {createRowingPoseDetector} from './rowing-pose-client.mjs';

let detectorPromise;
function getDetector(){
 return detectorPromise??=(async()=>{
  if(globalThis.Worker&&globalThis.createImageBitmap){
   try{return await createRowingPoseDetector();}catch(error){console.warn('Background pose inference unavailable; using main thread.',error);}
  }
  const {FilesetResolver,PoseLandmarker}=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs');
  const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
  const model=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5});
  return {backend:'main-thread',detectForVideo:(...args)=>model.detectForVideo(...args),close:()=>model.close()};
 })().catch(error=>{detectorPromise=null;throw error;});
}
const connections=[[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]];
export function createRowingCorrection({beforeOpen,getLanguage,getGender=()=>"male",onDirection=()=>{},onPlayback=()=>{},onControls=()=>{},onCameraStop=()=>{},onCameraStart=async()=>null}){
 const dialog=document.createElement('dialog');dialog.id='rowing-correction';dialog.className='rowing-correction';document.body.append(dialog);
 const orientation=new RowingOrientation(),preparation=new RowingOrientation(),feedbackCycle=new RowingFeedbackCycle(),limbFeedback=new RowingLimbFeedback();
 const poseTracker=new RowingPoseTracker(),renderBudget=new RowingRenderBudget();let preparationPerformance=null,correctionPerformance=null,recalibrating=false;
 const previewCanvas=document.createElement('canvas');previewCanvas.id='rowing-preview-skeleton';previewCanvas.className='rowing-preview-skeleton';previewCanvas.hidden=true;
 previewCanvas.setAttribute('aria-label','Live detected skeleton');document.querySelector('.demo-camera-feed').append(previewCanvas);
 function previewSkeleton(p){
  const v=document.getElementById('demo-video'),w=v.videoWidth||960,h=v.videoHeight||540;
  if(previewCanvas.width!==w)previewCanvas.width=w;if(previewCanvas.height!==h)previewCanvas.height=h;
  const ctx=previewCanvas.getContext('2d');ctx.clearRect(0,0,w,h);previewCanvas.hidden=!rowActive;
  previewCanvas.style.transform=mirrored?'scaleX(-1)':'none';
  const points=Object.fromEntries([11,12,13,14,15,16,23,24,25,26,27,28].filter(i=>{const point=p?.[i];return point&&point.visibility>=.55&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=.015&&point.x<=.985&&point.y>=.015&&point.y<=.985;}).map(i=>[i,{x:p[i].x*w,y:p[i].y*h}]));
  let count=0;ctx.lineCap='round';
  for(const[a,b]of [...connections,[11,12],[23,24]]){
   if(!points[a]||!points[b]||p[a].inferred||p[b].inferred)continue;
   ctx.beginPath();ctx.moveTo(points[a].x,points[a].y);ctx.lineTo(points[b].x,points[b].y);
   ctx.strokeStyle='#12212bdd';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#a7f3b8';ctx.lineWidth=3;ctx.stroke();count++;
  }
  for(const [i,point]of Object.entries(points)){
   ctx.beginPath();ctx.arc(point.x,point.y,5,0,Math.PI*2);ctx.fillStyle=p[i].inferred?'#9ed4ff':'#a7f3b8';ctx.fill();ctx.strokeStyle='#12212b';ctx.lineWidth=2;ctx.stroke();
  }
  const inferred=Object.keys(points).map(Number).filter(i=>p[i].inferred);paintInferredArms(ctx,points,inferred);
  previewCanvas.dataset.segments=String(count);previewCanvas.dataset.joints=String(Object.keys(points).length);previewCanvas.dataset.inferredJoints=inferred.join(',');
 }
 let flashes=[],activeErrors=[],feedbackBadge,arrowsLayer,chosenCue=null,cueSince=0;
 const preparationBar=document.createElement('div');preparationBar.id='rowing-preparation';preparationBar.className='rowing-progress';preparationBar.hidden=true;
 preparationBar.innerHTML='<div role="status" aria-live="polite"><strong></strong><span></span></div><button data-preparation-retry hidden></button><button type="button" data-rowing-voice class="rowing-voice" aria-pressed="true"></button><button type="button" data-rowing-mirror class="rowing-mirror" aria-pressed="false"></button>';
 document.getElementById('stage-layout').before(preparationBar);
 let prepStream=null,prepId=null,prepFrame=0,prepGeneration=0,returnStream=null,disposing=false;
 let preparedPose=null,preparedWorld=null,mirrored=true,rowActive=false;
 let stream=null,generation=0,frame=0,id,index=0,detector=null,lastTime=-1,lastDetect=0,lastUi=0,lateral,inferenceMs=0;
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en;
 let video,canvas,status,metrics,steps,help,retry,opacityControl,expertOverlay,lastPose=null,lastWorld=null,modelFailed=false;
 let relocate,phaseTitle,phaseNote,lastAssessment;
 const speech=createRowingSpeech({getLanguage,onState:syncVoice,onPlayback});
 let reviewMode=null,awaitingReturn=false,returnSince=null,speechHeld=false,quietUntil=0;
 let speechContext='',entryDemo=true,dynamic=null,completionSince=null,completionLast=null,completed=new Set();
 function syncVoice(){
  const {enabled,blocked}=speech.state();
  for(const button of document.querySelectorAll('[data-rowing-voice]')){
   button.disabled=false;button.setAttribute('aria-pressed',String(enabled));
   const label=blocked?tr('Tap for voice','点此启用播报'):tr(enabled?'Speech · On':'Speech · Off',enabled?'播报 · 开':'播报 · 关');
   if(button.textContent!==label)button.textContent=label;
   button.title=tr('Spoken guidance · no microphone required','语音播报 · 无需开启麦克风');
   button.onclick=()=>{speechContext='';if(blocked)speech.unlock();else speech.setEnabled(!enabled);dynamic?.syncSpeech();};
  }
 }
 const hasCamera=()=>rowActive&&!!(dialog.open?returnStream:prepStream)?.getVideoTracks().some(track=>track.readyState==='live');
 function say(id,options={}){if(document.hidden||!hasCamera()||speechHeld||performance.now()<quietUntil||reviewMode||awaitingReturn){speech.stop();return;}speech.request(id,options);}
 const gesture=e=>{if(e.target.closest('#camera,[data-voice-control]')||hasCamera()&&e.target.closest('#start-rowing-correction,#start-rowing-dynamic,[data-preparation-retry],[data-pose],[data-language],[data-rowing-voice]'))speech.unlock();};
 document.addEventListener('click',gesture,true);
 const languageObserver=new MutationObserver(()=>{speech.stop();speechContext='';syncVoice();syncPause();});
 languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 syncVoice();
 function phase(key,en,zh,noteEn,noteZh){
  dialog.dataset.phase=key;
  const title=tr(en,zh),note=tr(noteEn,noteZh);
  if(phaseTitle.textContent!==title)phaseTitle.textContent=title;
  if(phaseNote.textContent!==note)phaseNote.textContent=note;
 }
 // Flip display layers together; inference keeps raw coordinates and anatomical labels.
 function syncMirror(){
  const transform=mirrored?'scaleX(-1)':'none';
  if(rowActive){document.getElementById('demo-video').style.transform=transform;document.getElementById('three').style.transform=transform;}
  else document.getElementById('three').style.transform='';
  if(video)video.style.transform=transform;
  if(canvas)canvas.style.transform=transform;
  if(arrowsLayer)arrowsLayer.style.transform=transform;
  previewCanvas.style.transform=transform;
  for(const button of document.querySelectorAll('[data-rowing-mirror]')){
   button.setAttribute('aria-pressed',String(mirrored));
   button.textContent=tr(mirrored?'Mirror · On':'Mirror · Off',mirrored?'镜像 · 开':'镜像 · 关');
   button.title=tr('Mirror camera, expert and joints together','同步镜像相机、专家模型与关节点');
   button.onclick=()=>{mirrored=!mirrored;syncMirror();};
  }
 }
 function stopStream(){stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});stream=null;if(video)video.srcObject=null;}
 function releaseCorrectionCamera(){generation++;cancelAnimationFrame(frame);stopStream();returnStream?.getTracks().forEach(t=>{t.onended=null;t.stop();});returnStream=null;cancelPreparation();onCameraStop();}
 async function ensureCorrectionCamera(){
  if(stream?.active)return stream;
  const source=await onCameraStart();if(!dialog.open){source?.getTracks().forEach(t=>t.stop());onCameraStop();return null;}
  if(!source?.active)return null;returnStream=source;await startLockedCamera(source);return stream;
 }
 function close({keepCamera=false}={}){
  correctionPerformance?.dispose();correctionPerformance=null;
  dynamic?.dispose();dynamic=null;completionSince=null;completionLast=null;
  reviewMode=null;awaitingReturn=false;returnSince=null;
  speech.reset();speechContext='';
  const wasOpen=dialog.open,resume=returnStream;returnStream=null;
  generation++;cancelAnimationFrame(frame);stopStream();orientation.reset();feedbackCycle.reset();limbFeedback.reset();flashes=[];dialog.close();
  if(keepCamera&&wasOpen&&!disposing&&resume?.active)void prepare(id,resume);
  else{resume?.getTracks().forEach(t=>{t.onended=null;t.stop();});cancelPreparation();onCameraStop();}
 }
 function prepPhase(key,en,zh,noteEn,noteZh){
  preparationBar.dataset.phase=key;
  const title=preparationBar.querySelector('strong'),note=preparationBar.querySelector('span');
  if(title.textContent!==tr(en,zh))title.textContent=tr(en,zh);
  if(note.textContent!==tr(noteEn,noteZh))note.textContent=tr(noteEn,noteZh);
  if(key==='ready')say('setup-ready',{delay:300,repeatMs:Infinity});
  else if(key==='locating')say('setup-shoulders',{delay:1800,repeatMs:15000});
  else if(key==='error')say('tracking-lost',{delay:1200,repeatMs:15000});
 }
 function readyButton(){for(const key of ['start-rowing-correction','start-rowing-dynamic']){const b=document.getElementById(key);if(b)b.disabled=!preparation.read().ready;}}
 function cancelPreparation(){
  previewCanvas.hidden=true;previewCanvas.getContext('2d').clearRect(0,0,previewCanvas.width,previewCanvas.height);
  preparationPerformance?.dispose();preparationPerformance=null;poseTracker.reset();
  speech.reset();speechContext='';
  prepGeneration++;cancelAnimationFrame(prepFrame);prepStream=null;preparedPose=null;preparedWorld=null;preparation.reset();readyButton();
  preparationBar.querySelector('[data-preparation-retry]').hidden=true;
  prepPhase('off','Enable camera to find your direction','开启相机，识别朝向','The expert will follow you before correction starts.','专家模型会在开始纠错前跟随你的朝向。');
 }
 async function prepare(poseId,externalStream){
  cancelPreparation();if(!rowingCheckpoints[poseId]||!externalStream?.active)return;
  prepId=poseId;prepStream=externalStream;rowActive=true;syncMirror();const token=prepGeneration;
  const v=document.getElementById('demo-video');let lastVideo=-1,lastDetection=0;
  preparationPerformance=createPosePerformanceHUD(document.getElementById('demo-camera'),v);
  const axis=sourceLateral(sampleCapturedMotion(poseId,rowingCheckpoints[poseId][0].time).coords);
  prepPhase('loading','Preparing tracking','正在准备识别','Your camera preview is ready.','相机画面已就绪。');
  document.querySelector('#demo-camera .demo-camera-heading strong').textContent=tr('Your camera','你的相机');
  document.querySelector('#demo-camera > p').textContent=tr('The expert follows your horizontal direction.','专家模型正在跟随你的水平朝向。');
  let model;
  let timeout;try{model=await Promise.race([getDetector(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Tracking model timeout')),20000);})]);}catch{
   if(token!==prepGeneration)return;
   prepPhase('error','Tracking unavailable','暂时无法识别','Check your connection and retry.','请检查网络后重试。');preparationBar.querySelector('[data-preparation-retry]').hidden=false;return;
  }finally{clearTimeout(timeout);}
  if(token!==prepGeneration)return;
  async function tick(now){
   if(token!==prepGeneration||!externalStream.active||dialog.open)return;
   if(v.readyState>=2&&v.currentTime!==lastVideo&&now-lastDetection>(model.backend==='worker'?66:Math.max(66,inferenceMs*2.5))){
    lastVideo=v.currentTime;lastDetection=now;
    try{
     const inferenceStart=performance.now(),result=await model.detectForVideo(v,now);
     if(token!==prepGeneration||dialog.open||!externalStream.active)return;
     const tracked=poseTracker.update(result.landmarks[0],result.worldLandmarks?.[0]||null,now,v.videoWidth||960,v.videoHeight||540);
     const elapsed=result.inferenceMs??performance.now()-inferenceStart;inferenceMs=inferenceMs*.8+elapsed*.2;renderBudget.observeInference(result.roundTripMs??elapsed);preparationPerformance?.markInference(elapsed);preparedPose=tracked.pose;preparedWorld=tracked.world;
     preparationBar.dataset.inferenceBackend=model.backend;
     previewSkeleton(preparedPose);
     // Calibration uses corresponding raw image/world coordinates. Limb smoothing
     // is for correction and must not change the sign check against current depth.
     const estimate=estimateRowingYaw(result.landmarks[0],result.worldLandmarks?.[0],axis);
     const view=preparation.update(estimate,now);
     if(view.liveYaw!==null){onDirection(view.yaw);preparationBar.dataset.yaw=String(view.yaw);}
     if(view.ready)prepPhase('ready','Direction ready','朝向已就绪','Start correction to lock this direction.','点击开始纠错，锁定当前朝向。');
     else if(estimate)prepPhase('locating','Stabilizing direction','正在稳定朝向','Shoulders detected. Hold briefly while direction settles.','已识别双肩，请稍作停留，正在稳定朝向。');
     else{
      const shoulders=[11,12].every(i=>{const p=result.landmarks[0]?.[i];return p&&p.visibility>=.55&&p.x>.015&&p.x<.985&&p.y>.015&&p.y<.985;});
      prepPhase('locating',shoulders?'Checking shoulder depth':'Finding your shoulders',shoulders?'正在确认肩部深度':'正在寻找双肩',shoulders?'Shoulders are visible; waiting for a consistent direction estimate.':'Keep both shoulders in view.',shoulders?'双肩已在画面内，正在等待一致的朝向估计。':'请让双肩入镜。');
     }
     readyButton();
    }catch{
     if(token!==prepGeneration||dialog.open)return;
     preparation.reset();readyButton();prepPhase('error','Tracking paused','识别已暂停','Retry to find your direction.','请重试朝向识别。');preparationBar.querySelector('[data-preparation-retry]').hidden=false;return;
    }
   }
   prepFrame=requestAnimationFrame(tick);
  }
  prepFrame=requestAnimationFrame(tick);
 }
 preparationBar.querySelector('[data-preparation-retry]').textContent=tr('Retry','重试');
 preparationBar.querySelector('[data-preparation-retry]').onclick=()=>{if(prepStream)void prepare(prepId,prepStream);};
 function selectCheckpoint(i){
  if(dynamic&&dynamic.state()!=='off')return;
  completionSince=null;completionLast=null;
  reviewMode=null;awaitingReturn=false;returnSince=null;syncPause();
  speech.reset();speechContext='';entryDemo=true;
  feedbackCycle.reset();limbFeedback.reset();flashes=[];activeErrors=[];chosenCue=null;
  index=i;steps.querySelectorAll('button').forEach((b,n)=>b.setAttribute('aria-pressed',String(i===n)));
  say(`checkpoint-${checkpointSpeechIds[id][index]}`,{delay:0,repeatMs:Infinity});
  speechContext='demonstrate';
  const key=rowingCheckpoints[id][index];help.textContent=tr(key.en,key.zh);
  lastAssessment=draw(lastPose);if(detector&&stream)update(lastAssessment);
 }
 function draw(p,now=performance.now(),advance=false){
  correctionPerformance?.markRender();
  const w=video.videoWidth||960,h=video.videoHeight||540;
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  const ctx=canvas.getContext('2d'),view=orientation.read(),yaw=view.yaw;ctx.clearRect(0,0,w,h);
  const source=sampleCapturedMotion(id,rowingCheckpoints[id][index].time).coords;
  const ref=rowingReference(id,index,1,yaw),assessment=assessRowing(id,p,ref,w,h,{world:lastWorld,source,yaw});
  const ghost=fitRowingReference(ref,assessment.actual,w,h,assessment.side);
  const line=(a,b,color,width)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();};
  lastPose=p;
  const observed=assessment.metrics.filter(m=>!m.estimated);
  const valid=!reviewMode&&!awaitingReturn&&view.locked&&!view.offAxis&&!assessment.small&&observed.length>0&&!modelFailed;
  const anyError=observed.some(m=>!m.close),allClose=!anyError;
  const cycle=advance?feedbackCycle.update(now,{valid,close:allClose}):feedbackCycle.read();
  if(advance){flashes=limbFeedback.update(observed,valid&&cycle.showHints,now);activeErrors=limbFeedback.errors(observed,valid&&cycle.showHints,now);}
  const displayHints=valid&&cycle.showHints;
  const emphasize=reviewMode==='review'||cycle.mode==='demonstrate';
  const opacity=emphasize?.95:Number(opacityControl.value);
  const split=dynamic?.isLiveSplit();video.style.opacity=!split&&emphasize?'.30':'1';
  dialog.dataset.feedback=cycle.mode;canvas.dataset.expertOpacity=String(split?1:opacity);
  if(!modelFailed)try{
   expertOverlay??=createRowingExpertOverlay();
   const expertStarted=performance.now();const rendered=split?dynamic.drawStaticExpert({time:rowingCheckpoints[id][index].time,yaw,width:w,height:h,gender:getGender()}):expertOverlay.draw(ctx,{id,index,yaw,ghost,width:w,height:h,gender:getGender(),opacity,...renderBudget.read(now)});
   if(rendered.rendered){renderBudget.observeRender(performance.now()-expertStarted);correctionPerformance?.markExpert();}
   canvas.dataset.expertModel=rendered.gender;canvas.dataset.expertTriangles=String(rendered.meshes);
  }catch{modelFailed=true;canvas.dataset.expertModel='unavailable';}
  canvas.dataset.expertYaw=String(yaw);dialog.dataset.locked=String(view.locked);
  const errors=displayHints?activeErrors:[];
  const resolved=displayHints?flashes.flatMap(f=>f.metrics):[];
  const segments=rowingFeedbackSegments(connections,errors,resolved),points=new Map();
  for(const{a,b,state}of segments){
   if(!assessment.actual[a]||!assessment.actual[b])continue;
   line(assessment.actual[a],assessment.actual[b],state==='error'?'#ffbd77':'#a7f3b8',Math.max(3,h*.006));
   for(const i of [a,b])if(!points.has(i)||state==='error')points.set(i,state);
  }
  for(const[i,state]of points){const p=assessment.actual[i];ctx.beginPath();ctx.arc(p.x,p.y,Math.max(4,h*.008),0,Math.PI*2);ctx.fillStyle=state==='error'?'#ffbd77':'#a7f3b8';ctx.fill();}
  canvas.dataset.errorSegments=String(segments.filter(s=>s.state==='error').length);canvas.dataset.resolvedSegments=String(segments.filter(s=>s.state==='resolved').length);
  const arrowRows=[...errors].sort((a,b)=>(b.key.startsWith('height')?1:0)-(a.key.startsWith('height')?1:0)||b.delta/b.tolerance-a.delta/a.tolerance);
  const drawn=new Set(),arrows=[];
  for(const m of arrowRows){const limb=m.key.endsWith('-1')?'right':'left';if(drawn.has(limb))continue;const arrow=rowingMovementArrow(m,assessment.actual,ghost,w,h);if(arrow){arrows.push(arrow);drawn.add(limb);}if(arrows.length>=2)break;}
  renderRowingArrows(arrowsLayer,arrows,w,h);
  paintInferredArms(ctx,assessment.actual,assessment.inferred);
  return assessment;
 }
 function update(assessment){
  if(reviewMode||awaitingReturn){
   phase(reviewMode==='review'?'review':reviewMode?'paused':'returning',reviewMode==='review'?'View the expert':reviewMode?'Correction paused':'Return to your position',reviewMode==='review'?'查看专家示范':reviewMode?'纠错已暂停':'请回到练习位置',reviewMode?'Direction and stage saved. Resume when ready.':'Waiting for your joints; direction stays locked.',reviewMode?'朝向与阶段已保留，准备好后继续纠错。':'正在等待关节入镜，朝向保持锁定。');
   metrics.replaceChildren();feedbackBadge.hidden=true;status.hidden=true;relocate.hidden=true;return;
  }
  const view=orientation.read(),available=assessment.metrics.filter(m=>!m.estimated),cycle=feedbackCycle.read();
  const valid=view.locked&&!view.offAxis&&!assessment.small&&available.length>0&&!modelFailed;
  const canConfirm=available.some(m=>!m.guidanceOnly);
  const partial=assessment.missing.length>0||assessment.occluded.length>0||assessment.inferred?.length>0||available.length<(id==='rowing-arms'?4:id==='rowing-half'?6:8);
  feedbackBadge.hidden=true;feedbackBadge.dataset.state='neutral';
  relocate.hidden=false;
  metrics.replaceChildren();
  if(view.offAxis){
   phase(view.reposition?'moved':'checking','Direction changed','朝向发生变化',view.reposition?'Return to preparation to set your new direction.':'Checking your direction; comparison paused.',view.reposition?'请返回准备页面，重新定位。':'正在确认变化，已暂停比较。');
  }else if(cycle.mode==='demonstrate'){
   phase('demonstrate','Watch the expert first','先看清专家动作','Then match the normal overlay.','稍后恢复正常叠加，再跟随模型调整。');
  }else if(!Object.keys(assessment.actual).length){
   phase('unclear','Looking for your joints','正在寻找关节','Move back into view; your direction stays locked.','请回到画面中；朝向仍保持锁定。');
  }else if(available.length&&!canConfirm&&available.every(m=>m.close)){
   phase('limited',cycle.mode==='aligned'?'✓ Upper-arm height aligned':'Hold the arm height',cycle.mode==='aligned'?'✓ 上臂高度已对齐':'保持上臂高度','Keep this height. Elbow bend cannot be measured from this view.','保持这个高度即可；当前机位无法测量屈肘角度。');
  }else if(cycle.mode==='aligned'&&valid){
   phase('aligned','All visible parts are well-aligned.','所有可见部位均已对齐。','Hold this position.','保持这个姿势。');
  }else if(valid){
   const failed=available.filter(m=>!m.close).sort((a,b)=>(b.key.startsWith('height')?1:0)-(a.key.startsWith('height')?1:0)||b.delta/b.tolerance-a.delta/a.tolerance);
   if(failed.length){
    if(!chosenCue||!failed.some(m=>m.key===chosenCue)||performance.now()-cueSince>1400){chosenCue=failed[0].key;cueSince=performance.now();}
    const cue=rowingAdjustmentCue(failed.find(m=>m.key===chosenCue)||failed[0]);
    phase('correcting','Adjust one part at a time','一次调整一个部位',cue.en,cue.zh);
   }else phase('holding','Hold for a moment','保持片刻','Checking that your visible joints stay aligned.','正在确认可见关节是否稳定对齐。');
  }else phase('unclear','Looking for clearer joints','正在寻找清晰关节','Keep a shoulder, elbow and wrist visible.','请让同一侧肩、肘、腕清晰入镜。');
  if(!view.offAxis&&Object.keys(assessment.actual).length&&!assessment.small){
   if(cycle.mode==='demonstrate'){
    feedbackBadge.textContent=tr('Watch the expert','先看专家')+' · '+Math.ceil(cycle.remainingMs/1000)+'s';feedbackBadge.hidden=false;
   }else if(valid&&flashes.length){
    const labels={ 'left-arm':['Left arm corrected','左臂已调整'],'right-arm':['Right arm corrected','右臂已调整'],'left-leg':['Left leg corrected','左腿已调整'],'right-leg':['Right leg corrected','右腿已调整']};
    feedbackBadge.textContent='✓ '+flashes.map(f=>f.metrics.every(m=>m.guidanceOnly)?tr(f.key.startsWith('right')?'Right arm height corrected':'Left arm height corrected',f.key.startsWith('right')?'右臂高度已调整':'左臂高度已调整'):tr(...labels[f.key])).join(tr(' · ','、'));feedbackBadge.dataset.state='good';feedbackBadge.hidden=false;
   }else if(valid&&cycle.mode==='aligned'){
    feedbackBadge.textContent=!canConfirm?tr('✓ Upper-arm height aligned','✓ 上臂高度已对齐'):tr('All visible parts are well-aligned.','所有可见部位均已对齐。');feedbackBadge.dataset.state='good';feedbackBadge.hidden=false;
   }
  }
  let note='';
  if(modelFailed)note=tr('Expert model unavailable. Reload with WebGL enabled.','专家模型无法显示，请启用 WebGL 后刷新。');
  else if(view.locked&&assessment.small)note=tr('Move a little closer so your joints are clearer.','请稍微靠近，让关节更清晰。');
  else if(view.locked&&assessment.occluded.length&&!available.some(m=>!m.close))note=tr('Visible joints are tracked; depth prevents some angle measurements.','可见关节已识别；部分角度因朝向镜头而无法测量。');
  else if(assessment.inferred?.length)note=tr('Blue dashed limbs are short-term estimates; they are not scored.','蓝色虚线为短时推断的肢体，不据此判错或计分。');
  else if(assessment.missing.length)note=tr('Not clear: ','尚未看清：')+assessment.missing.map(p=>tr(p.en,p.zh)+(p.reason==='outside'?tr(' (estimated outside view)','（估计位置在画外）'):'')).join(tr(', ','、'));
  else if(!view.locked)note=tr('The expert follows your horizontal direction.','专家模型正在跟随你的水平朝向。');
  status.textContent=note;status.hidden=!note;
  syncVoice();
  if(view.offAxis){say('direction-changed',{delay:700,repeatMs:15000});speechContext='moved';}
  else if(cycle.mode==='demonstrate'){
   if(speechContext!=='demonstrate'){
    say(entryDemo?`checkpoint-${checkpointSpeechIds[id][index]}`:'watch-again',{delay:0,repeatMs:5000});speechContext='demonstrate';
   }
  }else if(valid&&flashes.length){
   const flash=flashes[0],heightOnly=flash.metrics.every(m=>m.guidanceOnly);
   say(`confirmed-${flash.key}${heightOnly?'-height':''}`,{delay:0,repeatMs:Infinity});speechContext='confirmed';
  }else if(valid&&cycle.mode==='aligned'&&canConfirm){
   say(partial?'aligned-visible':'aligned',{delay:0,repeatMs:Infinity});speechContext='aligned';
  }else if(valid&&activeErrors.length){
   const metric=activeErrors.find(m=>m.key===chosenCue)||activeErrors[0];
   say(adjustmentSpeechId(metric),{delay:300,repeatMs:10000});speechContext='adjustment';
  }else if(valid&&available.some(m=>!m.close)){
   // Keep an instruction silent until the same error has persisted long enough.
   if(speechContext==='demonstrate'){say('follow-overlay',{delay:0,repeatMs:Infinity});speechContext='follow';entryDemo=false;}
   else if(speechContext==='adjustment')say(null);
  }else if(!Object.keys(assessment.actual).length){say('tracking-lost',{delay:1800,repeatMs:15000});speechContext='tracking';}
  else if(!valid||!canConfirm){
   const missing=assessment.missing.find(m=>m.id===15||m.id===16)||assessment.missing[0];
   say(missingSpeechId(missing),{delay:1800,repeatMs:15000});speechContext='tracking';
  }else if(speechContext==='demonstrate'){
   say('follow-overlay',{delay:0,repeatMs:Infinity});speechContext='follow';entryDemo=false;
  }else if(speechContext==='adjustment'||speechContext==='tracking')say(null);
  if(cycle.mode!=='demonstrate')entryDemo=false;

  if(valid&&cycle.showHints)for(const m of available){
   const row=document.createElement('div');row.className='rowing-metric';row.textContent=`${tr(m.part,m.zh)} · ${m.kind==='position'?tr(m.close?'Height matches':'Adjust height',m.close?'高度接近':'需要调整高度'):`${Math.round(m.actual)}° / ${Math.round(m.target)}°`} ${m.close?'≈':'↗'}`;metrics.append(row);
  }
 }
 async function track(now,token){
  if(token!==generation||!dialog.open||!stream)return;
  if(recalibrating){frame=requestAnimationFrame(t=>track(t,token));return;}
  if(dynamic&&['review','exporting','processing','preparing'].includes(dynamic.state())){frame=requestAnimationFrame(t=>track(t,token));return;}
  if(reviewMode){feedbackCycle.pause();limbFeedback.pause();update(lastAssessment);frame=requestAnimationFrame(t=>track(t,token));return;}
  if(video.readyState>=2&&video.currentTime!==lastTime&&now-lastDetect>(detector.backend==='worker'?66:Math.max(66,inferenceMs*2.5))){
   lastTime=video.currentTime;lastDetect=now;
   try{
    const inferenceStart=performance.now(),cameraTime=video.currentTime,result=await detector.detectForVideo(video,now);
    if(token!==generation||!dialog.open||!stream)return;
    if(dynamic&&['review','exporting','processing'].includes(dynamic.state())){frame=requestAnimationFrame(t=>track(t,token));return;}
    const tracked=poseTracker.update(result.landmarks[0],result.worldLandmarks?.[0]||null,now,video.videoWidth||960,video.videoHeight||540),p=tracked.pose;lastWorld=tracked.world;
    const elapsed=result.inferenceMs??performance.now()-inferenceStart;inferenceMs=inferenceMs*.8+elapsed*.2;renderBudget.observeInference(result.roundTripMs??elapsed);correctionPerformance?.markInference(elapsed);dialog.dataset.inferenceBackend=detector.backend;
    if(awaitingReturn){
     const visible=p&&[11,12].some(s=>[s,s+2].every(j=>(p[j]?.visibility??0)>.65&&p[j].x>.02&&p[j].x<.98&&p[j].y>.02&&p[j].y<.98));
     if(!visible)returnSince=null;else returnSince??=now;
     if(returnSince===null||now-returnSince<600){update(lastAssessment);frame=requestAnimationFrame(t=>track(t,token));return;}
     awaitingReturn=false;returnSince=null;orientation.movedSince=null;orientation.reposition=false;
    }
    orientation.update(estimateRowingYaw(p,lastWorld,lateral),now);
    if(dynamic&&dynamic.state()!=='off'){
     dynamic.consume(now,p,lastWorld,{rawPose:result.landmarks[0]??null,rawWorld:result.worldLandmarks?.[0]??null,inference:{timestampMs:now,startedAtMs:inferenceStart,completedAtMs:performance.now(),latencyMs:elapsed,captureMs:result.captureMs??null,roundTripMs:result.roundTripMs??null,cameraTimeSeconds:cameraTime,backend:detector.backend}});frame=requestAnimationFrame(t=>track(t,token));return;
    }
    lastAssessment=draw(p,now,true);
    const view=orientation.read();
    const complete=!awaitingReturn&&!view.offAxis&&view.locked&&feedbackCycle.read().showHints&&rowingCheckpointComplete(id,lastAssessment);
    if(!complete||completionLast===null||now-completionLast>500)completionSince=null;
    completionLast=now;
    if(complete){
     completionSince??=now;
     if(now-completionSince>=1000){
      steps.children[index]?.setAttribute('data-complete','true');completed.add(index);completionSince=null;
      if(completed.size<rowingCheckpoints[id].length){
       const next=rowingCheckpoints[id].findIndex((_,i)=>i>index&&!completed.has(i));
       selectCheckpoint(next>=0?next:rowingCheckpoints[id].findIndex((_,i)=>!completed.has(i)));
      }
      else{speech.reset();reviewMode=null;dynamic.enter();frame=requestAnimationFrame(t=>track(t,token));return;}
     }
    }
    // Clear stale metrics immediately when direction or tracking becomes invalid.
    if(orientation.read().offAxis||!p)metrics.replaceChildren();
    if(now-lastUi>200){lastUi=now;update(lastAssessment);}
   }catch{if(token!==generation||!dialog.open)return;speech.stop();phase('error','Tracking paused','识别已暂停','Retry tracking below.','请重试识别。');metrics.replaceChildren();feedbackBadge.hidden=true;feedbackCycle.pause();limbFeedback.pause();flashes=[];draw(null);retry.hidden=false;return;}
  }
  frame=requestAnimationFrame(t=>track(t,token));
 }
 async function startLockedCamera(sourceStream){
  const token=++generation;cancelAnimationFrame(frame);stopStream();lastTime=-1;lastWorld=preparedWorld;lastPose=preparedPose;
  try{
   stream=sourceStream.clone();video.srcObject=stream;await video.play();
   if(token!==generation||!dialog.open)return;
   stream.getVideoTracks()[0].onended=()=>{if(token===generation){speech.stop();metrics.replaceChildren();phase('error','Camera disconnected','相机已断开','Return to preparation to reconnect.','请返回准备页面重新连接。');feedbackBadge.hidden=true;feedbackCycle.pause();limbFeedback.pause();flashes=[];draw(null);retry.hidden=false;}};
   detector=await getDetector();if(token!==generation||!stream)return;
   if(dynamic&&dynamic.state()!=='off')dynamic.consume(performance.now(),lastPose,lastWorld);
   else{lastAssessment=draw(lastPose);update(lastAssessment);}
   frame=requestAnimationFrame(t=>track(t,token));
  }catch{if(token===generation){phase('error','Camera unavailable','相机暂不可用','Return to preparation to reconnect.','请返回准备页面重新连接。');retry.hidden=false;}}
 }
 async function repositionDynamic(){
  if(!dialog.open||!stream?.active||recalibrating)return false;
  recalibrating=true;poseTracker.reset();const token=generation,calibration=new RowingOrientation(),deadline=performance.now()+10000;
  let previous=-1;
  try{
   const model=await getDetector();
   while(performance.now()<deadline&&token===generation&&dialog.open){
    if(video.readyState>=2&&video.currentTime!==previous){
     previous=video.currentTime;const now=performance.now(),result=await model.detectForVideo(video,now);
     if(token!==generation||!dialog.open)return false;
     const view=calibration.update(estimateRowingYaw(result.landmarks[0],result.worldLandmarks?.[0],lateral),now);
     if(view.ready){orientation.reset();orientation.yaw=view.yaw;orientation.ready=true;orientation.lock();onDirection(view.yaw);return true;}
    }
    await new Promise(resolve=>setTimeout(resolve,75));
   }
   return false;
  }finally{recalibrating=false;}
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){speech.stop();speechContext='';feedbackCycle.pause();limbFeedback.pause();flashes=[];if(feedbackBadge)feedbackBadge.hidden=true;}});
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 window.addEventListener('pagehide',()=>{disposing=true;cancelPreparation();close();speech.dispose();languageObserver.disconnect();document.removeEventListener('click',gesture,true);expertOverlay?.dispose();expertOverlay=null;});
 function syncPause(){
  dialog.dataset.review=reviewMode||'';
  const button=dialog.querySelector('[data-rowing-pause]');if(button)button.textContent=tr(reviewMode?'Resume correction':'Pause correction',reviewMode?'继续纠错':'暂停纠错');
  const review=dialog.querySelector('[data-rowing-review]');if(review)review.textContent=tr('View demonstration','查看示范');
 }
 function pause(mode='paused'){
  if(dynamic&&dynamic.state()!=='off')return false;
  if(!dialog.open)return false;
  reviewMode=mode;awaitingReturn=false;returnSince=null;speech.reset();speechContext='';feedbackCycle.pause();limbFeedback.pause();flashes=[];activeErrors=[];syncPause();draw(lastPose);update(lastAssessment);return true;
 }
 function resume(){
  if(dynamic&&dynamic.state()!=='off')return false;
  if(!dialog.open)return false;
  reviewMode=null;awaitingReturn=true;returnSince=null;speechContext='';feedbackCycle.pause();limbFeedback.pause();syncPause();draw(lastPose);update(lastAssessment);return true;
 }
 return {prepare,cancelPreparation,isReady:()=>preparation.read().ready,
  isOpen:()=>dialog.open,pause,resume,
  dynamicState:()=>dynamic?.state()??'off',
  startDynamic:()=>dynamic?.begin()??false,
  finishDynamic:options=>dynamic?.finish(options)??false,
  repositionDynamic:()=>dynamic?.reposition(),
  noteSpeechStart:time=>dynamic?.noteSpeechStart(time),
  holdSpeech(value){speechHeld=value;if(value)speech.stop();else quietUntil=0;speechContext='';},
  interruptSpeech(){quietUntil=performance.now()+1800;speech.stop();speechContext='';},
  mirror(value){mirrored=value;syncMirror();},
  nextStage(delta=1){if(!dialog.open)return null;selectCheckpoint((index+delta+rowingCheckpoints[id].length)%rowingCheckpoints[id].length);return rowingCheckpoints[id][index];},
  repeat(){speech.reset();speechContext='';},
  repeatDemo(){if(!dialog.open)return false;selectCheckpoint(index);return true;},
 setPose(poseId,externalStream){
  rowActive=!!rowingCheckpoints[poseId];preparationBar.hidden=!rowActive;syncMirror();syncVoice();
  for(const key of ['start-rowing-correction','start-rowing-dynamic']){const b=document.getElementById(key);if(b)preparationBar.append(b);}
  if(externalStream&&rowingCheckpoints[poseId])void prepare(poseId,externalStream);else cancelPreparation();
 },
 open(poseId,{dynamicOnly=false}={}){
  if(!rowingCheckpoints[poseId]||prepId!==poseId||!prepStream?.active||!preparation.read().ready)return;
  const external=prepStream,lockedYaw=preparation.read().yaw,pose=preparedPose,world=preparedWorld;
  preparationPerformance?.dispose();preparationPerformance=null;
  prepGeneration++;cancelAnimationFrame(prepFrame);preparation.ready=false;readyButton();
  beforeOpen();id=poseId;index=0;completed=new Set();lastUi=0;lastPose=pose;lastWorld=world;detector=null;modelFailed=false;orientation.reset();
  orientation.yaw=lockedYaw;orientation.ready=true;orientation.lock();returnStream=external;
  lateral=sourceLateral(sampleCapturedMotion(id,rowingCheckpoints[id][0].time).coords);
  dialog.innerHTML=`<div class="rowing-header"><div><small>${tr('ROWING · STATIC CORRECTION','赛艇 · 静态纠错')}</small><h2>${tr('Find your position','找到你的姿态')}</h2></div><button type="button" data-close>${tr('Close ×','关闭 ×')}</button></div><nav class="rowing-checkpoints" aria-label="${tr('Static checkpoints','静态关键姿态')}"></nav><div class="rowing-progress"><div role="status" aria-live="polite"><strong data-phase-title></strong><span data-phase-note></span></div><button data-relocate hidden>${tr('Reposition','重新定位')}</button></div><div class="rowing-voice-bar"><button type="button" data-rowing-voice class="rowing-voice" aria-pressed="true"></button></div><div class="rowing-feed"><video autoplay playsinline muted></video><canvas></canvas><svg class="rowing-arrows" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg><button type="button" data-rowing-mirror class="rowing-mirror rowing-feed-mirror" aria-pressed="false"></button><div class="rowing-result" role="status" aria-live="polite" hidden></div><span class="rowing-legend">${tr('Expert model / Adjust these parts','专家模型 / 待调整部位')}</span></div><p class="rowing-instruction"></p><p class="rowing-status" hidden></p><details class="rowing-angle-details"><summary>${tr('Angle details','角度详情')}</summary><div class="rowing-metrics"></div></details><details class="rowing-settings"><summary>${tr('Camera & display','相机与显示设置')}</summary><div class="rowing-options"><label>${tr('Expert opacity','专家模型不透明度')}<input data-opacity type="range" min="0" max="1" step="0.05" value="0.7" aria-label="${tr('Expert opacity','专家模型不透明度')}"></label></div><p class="rowing-setup">${tr('Keep the camera level. If framing is too narrow, try a wider lens or your phone. Horizontal direction is estimated automatically.','保持相机水平。取景太窄时可换广角镜头或使用手机；系统会自动估计水平朝向。')}</p></details><button data-retry hidden>${tr('Return to preparation','返回准备页面')}</button>`;
  video=dialog.querySelector('video');canvas=dialog.querySelector('canvas');status=dialog.querySelector('.rowing-status');metrics=dialog.querySelector('.rowing-metrics');steps=dialog.querySelector('nav');help=dialog.querySelector('.rowing-instruction');retry=dialog.querySelector('[data-retry]');opacityControl=dialog.querySelector('[data-opacity]');feedbackBadge=dialog.querySelector('.rowing-result');arrowsLayer=dialog.querySelector('.rowing-arrows');
  relocate=dialog.querySelector('[data-relocate]');phaseTitle=dialog.querySelector('[data-phase-title]');phaseNote=dialog.querySelector('[data-phase-note]');
  correctionPerformance=createPosePerformanceHUD(dialog.querySelector('.rowing-feed'),video);
  dynamic=createRowingDynamicUI({dialog,video,canvas,arrowsLayer,id,getLanguage,getGender,renderBudget,getYaw:()=>orientation.read().yaw,getStream:()=>stream,getOverlay:()=>expertOverlay??=createRowingExpertOverlay(),onPlayback,isSpeechEnabled:()=>speech.state().enabled,onRender:()=>correctionPerformance?.markRender(),onExpert:()=>correctionPerformance?.markExpert(),onReposition:repositionDynamic,onReleaseCamera:releaseCorrectionCamera,onEnsureCamera:ensureCorrectionCamera,onShowFPS:value=>{correctionPerformance?.setVisible(value);const control=dialog.querySelector('[data-static-fps]');if(control)control.checked=value;},onLiveLayout:()=>{if(dynamic?.state()==='off'){lastAssessment=draw(lastPose);update(lastAssessment);}},onAligned:active=>{if(active)say('aligned-visible',{delay:0,repeatMs:10000});else speech.stop();},onPerformance:(action,time)=>{if(action==='begin')correctionPerformance?.beginRecording();else if(action==='finish')return correctionPerformance?.finishRecording();else if(action==='seek')return correctionPerformance?.showRecordedTime(time);else correctionPerformance?.resumeLive();}});
  const fpsOption=document.createElement('label');fpsOption.innerHTML=tr('<input data-static-fps type="checkbox"> Show FPS (debug)','<input data-static-fps type="checkbox"> \u663e\u793a FPS\uff08\u8c03\u8bd5\uff09');dialog.querySelector('.rowing-options').append(fpsOption);fpsOption.querySelector('input').onchange=e=>dynamic.setFPS(e.target.checked);
  opacityControl.oninput=()=>{lastAssessment=draw(lastPose);};
  syncMirror();syncVoice();
  dialog.querySelector('[data-close]').onclick=close;
  retry.onclick=relocate.onclick=()=>close({keepCamera:true});
  rowingCheckpoints[id].forEach((key,i)=>{const b=document.createElement('button');b.type='button';b.textContent=`${i+1}. ${tr(key.en,key.zh)}`;b.onclick=()=>selectCheckpoint(i);steps.append(b);});
  dialog.showModal();selectCheckpoint(0);update(lastAssessment);void startLockedCamera(external);
  const bar=dialog.querySelector('.rowing-voice-bar');
  for(const[action,en,zh,handler]of [['pause','Pause correction','暂停纠错',()=>reviewMode?resume():pause()],['review','View demonstration','查看示范',()=>pause('review')]]){
   const button=document.createElement('button');button.type='button';button.className='rowing-voice';button.setAttribute(`data-rowing-${action}`,'');button.textContent=tr(en,zh);button.onclick=handler;bar.append(button);
  }
  onControls(bar);
  if(dynamicOnly){speech.reset();speechContext='';dynamic.enter();}
 },close};
}
