import {createRowingExpertOverlay} from './rowing-expert-overlay.mjs';
import {rowingCheckpoints,rowingReference,assessRowing,fitRowingReference} from './rowing-correction.mjs';
import {sampleCapturedMotion} from './captured-motion.mjs';
import {RowingOrientation,estimateRowingYaw,sourceLateral} from './rowing-orientation.mjs';

let detectorPromise;
function getDetector(){
 return detectorPromise??=(async()=>{
  const {FilesetResolver,PoseLandmarker}=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs');
  const files=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
  return PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5});
 })().catch(error=>{detectorPromise=null;throw error;});
}
const connections=[[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]];
export function createRowingCorrection({beforeOpen,getLanguage,getGender=()=>"male",onDirection=()=>{}}){
 const dialog=document.createElement('dialog');dialog.id='rowing-correction';dialog.className='rowing-correction';document.body.append(dialog);
 const orientation=new RowingOrientation(),preparation=new RowingOrientation();
 const preparationBar=document.createElement('div');preparationBar.id='rowing-preparation';preparationBar.className='rowing-progress';preparationBar.hidden=true;
 preparationBar.innerHTML='<div role="status" aria-live="polite"><strong></strong><span></span></div><button data-preparation-retry hidden></button><button type="button" data-rowing-mirror class="rowing-mirror" aria-pressed="false"></button>';
 document.getElementById('stage-layout').before(preparationBar);
 let prepStream=null,prepId=null,prepFrame=0,prepGeneration=0,returnStream=null,disposing=false;
 let preparedPose=null,preparedWorld=null,mirrored=false,rowActive=false;
 let stream=null,generation=0,frame=0,id,index=0,detector=null,lastTime=-1,lastDetect=0,lastUi=0,lateral;
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en;
 let video,canvas,status,metrics,steps,help,retry,opacityControl,expertOverlay,lastPose=null,lastWorld=null,modelFailed=false;
 let relocate,phaseTitle,phaseNote,lastAssessment;
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
  for(const button of document.querySelectorAll('[data-rowing-mirror]')){
   button.setAttribute('aria-pressed',String(mirrored));
   button.textContent=tr(mirrored?'Mirror · On':'Mirror · Off',mirrored?'镜像 · 开':'镜像 · 关');
   button.title=tr('Mirror camera, expert and joints together','同步镜像相机、专家模型与关节点');
   button.onclick=()=>{mirrored=!mirrored;syncMirror();};
  }
 }
 function stopStream(){stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});stream=null;if(video)video.srcObject=null;}
 function close(){
  const wasOpen=dialog.open,resume=returnStream;returnStream=null;
  generation++;cancelAnimationFrame(frame);stopStream();orientation.reset();dialog.close();
  if(wasOpen&&!disposing&&resume?.active)void prepare(id,resume);
 }
 function prepPhase(key,en,zh,noteEn,noteZh){
  preparationBar.dataset.phase=key;
  const title=preparationBar.querySelector('strong'),note=preparationBar.querySelector('span');
  if(title.textContent!==tr(en,zh))title.textContent=tr(en,zh);
  if(note.textContent!==tr(noteEn,noteZh))note.textContent=tr(noteEn,noteZh);
 }
 function readyButton(){const b=document.getElementById('start-rowing-correction');if(b)b.disabled=!preparation.read().ready;}
 function cancelPreparation(){
  prepGeneration++;cancelAnimationFrame(prepFrame);prepStream=null;preparedPose=null;preparedWorld=null;preparation.reset();readyButton();
  preparationBar.querySelector('[data-preparation-retry]').hidden=true;
  prepPhase('off','Enable camera to find your direction','开启相机，识别朝向','The expert will follow you before correction starts.','专家模型会在开始纠错前跟随你的朝向。');
 }
 async function prepare(poseId,externalStream){
  cancelPreparation();if(!rowingCheckpoints[poseId]||!externalStream?.active)return;
  prepId=poseId;prepStream=externalStream;rowActive=true;syncMirror();const token=prepGeneration;
  const v=document.getElementById('demo-video');let lastVideo=-1,lastDetection=0;
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
  function tick(now){
   if(token!==prepGeneration||!externalStream.active||dialog.open)return;
   if(v.readyState>=2&&v.currentTime!==lastVideo&&now-lastDetection>100){
    lastVideo=v.currentTime;lastDetection=now;
    try{
     const result=model.detectForVideo(v,now);preparedPose=result.landmarks[0];preparedWorld=result.worldLandmarks?.[0]||null;
     const view=preparation.update(estimateRowingYaw(preparedPose,preparedWorld,axis),now);
     if(view.liveYaw!==null){onDirection(view.yaw);preparationBar.dataset.yaw=String(view.yaw);}
     if(view.ready)prepPhase('ready','Direction ready','朝向已就绪','Start correction to lock this direction.','点击开始纠错，锁定当前朝向。');
     else prepPhase('locating','Finding your direction','正在识别朝向','Keep your shoulders visible for a moment.','请让双肩入镜，稍作停留。');
     readyButton();
    }catch{
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
  index=i;steps.querySelectorAll('button').forEach((b,n)=>b.setAttribute('aria-pressed',String(i===n)));
  const key=rowingCheckpoints[id][index];help.textContent=tr(key.en,key.zh);
  lastAssessment=draw(lastPose);if(detector&&stream)update(lastAssessment);
 }
 function draw(p){
  const w=canvas.width=video.videoWidth||960,h=canvas.height=video.videoHeight||540,ctx=canvas.getContext('2d'),view=orientation.read(),yaw=view.yaw;
  const source=sampleCapturedMotion(id,rowingCheckpoints[id][index].time).coords;
  const ref=rowingReference(id,index,1,yaw),assessment=assessRowing(id,p,ref,w,h,{world:lastWorld,source,yaw});
  const ghost=fitRowingReference(ref,assessment.actual,w,h,assessment.side);
  const line=(a,b,color,width)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();};
  lastPose=p;
  if(!modelFailed)try{
   expertOverlay??=createRowingExpertOverlay();
   const rendered=expertOverlay.draw(ctx,{id,index,yaw,ghost,width:w,height:h,gender:getGender(),opacity:Number(opacityControl.value)});
   canvas.dataset.expertModel=rendered.gender;canvas.dataset.expertTriangles=String(rendered.meshes);
  }catch{modelFailed=true;canvas.dataset.expertModel='unavailable';}
  canvas.dataset.expertYaw=String(yaw);dialog.dataset.locked=String(view.locked);
  const scored=view.locked&&!view.offAxis&&!assessment.small;
  const failed=new Set(scored?assessment.metrics.filter(m=>!m.close).flatMap(m=>m.ids):[]);
  for(const[a,b]of connections)if(assessment.actual[a]&&assessment.actual[b])line(assessment.actual[a],assessment.actual[b],failed.has(a)||failed.has(b)?'#ffbd77':'#d1f598',Math.max(3,h*.006));
  for(const p of Object.values(assessment.actual)){ctx.beginPath();ctx.arc(p.x,p.y,Math.max(4,h*.008),0,Math.PI*2);ctx.fillStyle='#edffd5';ctx.fill();}
  return assessment;
 }
 function update(assessment){
  const view=orientation.read(),available=assessment.metrics;
  relocate.hidden=false;
  metrics.replaceChildren();
  if(view.offAxis){
   phase(view.reposition?'moved':'checking','Direction changed','朝向发生变化',view.reposition?'Return to preparation to set your new direction.':'Checking your direction; comparison paused.',view.reposition?'请返回准备页面，重新定位。':'正在确认变化，已暂停比较。');
  }else if(!Object.keys(assessment.actual).length){
   phase('unclear','Looking for your joints','正在寻找关节','Move back into view; your direction stays locked.','请回到画面中；朝向仍保持锁定。');
  }else if(!available.length&&assessment.occluded.length){
   phase('limited','Preview · direction locked','当前预览 · 朝向已锁定','Turn slightly, then reposition for clearer arm angles.','可稍微侧转，再点重新定位，看清手臂角度。');
  }else{
   phase('correcting','Correcting · direction locked','正在纠错 · 朝向已锁定','Follow the expert; reposition if you move the camera.','跟随专家模型；移动相机后请重新定位。');
  }
  let note='';
  if(modelFailed)note=tr('Expert model unavailable. Reload with WebGL enabled.','专家模型无法显示，请启用 WebGL 后刷新。');
  else if(view.locked&&assessment.small)note=tr('Move a little closer so your joints are clearer.','请稍微靠近，让关节更清晰。');
  else if(view.locked&&assessment.occluded.length)note=tr('Some joints point toward the camera; comparing only clear segments.','部分肢段朝向镜头，仅比较能看清的部位。');
  else if(assessment.missing.length)note=tr('Not clear: ','尚未看清：')+assessment.missing.map(p=>tr(p.en,p.zh)).join(tr(', ','、'));
  else if(!view.locked)note=tr('The expert follows your horizontal direction.','专家模型正在跟随你的水平朝向。');
  status.textContent=note;status.hidden=!note;
  if(view.locked&&!view.offAxis&&!assessment.small)for(const m of available){
   const row=document.createElement('div');row.className='rowing-metric';row.textContent=`${tr(m.part,m.zh)} · ${Math.round(m.actual)}° / ${Math.round(m.target)}° ${m.close?'≈':'↗'}`;metrics.append(row);
  }
 }
 function track(now,token){
  if(token!==generation||!dialog.open||!stream)return;
  if(video.readyState>=2&&video.currentTime!==lastTime&&now-lastDetect>100){
   lastTime=video.currentTime;lastDetect=now;
   try{
    const result=detector.detectForVideo(video,now),p=result.landmarks[0];lastWorld=result.worldLandmarks?.[0]||null;
    orientation.update(estimateRowingYaw(p,lastWorld,lateral),now);
    lastAssessment=draw(p);
    // Clear stale metrics immediately when direction or tracking becomes invalid.
    if(orientation.read().offAxis||!p)metrics.replaceChildren();
    if(now-lastUi>200){lastUi=now;update(lastAssessment);}
   }catch{phase('error','Tracking paused','识别已暂停','Retry tracking below.','请重试识别。');metrics.replaceChildren();retry.hidden=false;return;}
  }
  frame=requestAnimationFrame(t=>track(t,token));
 }
 async function startLockedCamera(sourceStream){
  const token=++generation;cancelAnimationFrame(frame);stopStream();lastTime=-1;lastWorld=preparedWorld;lastPose=preparedPose;
  try{
   stream=sourceStream.clone();video.srcObject=stream;await video.play();
   if(token!==generation||!dialog.open)return;
   stream.getVideoTracks()[0].onended=()=>{if(token===generation){metrics.replaceChildren();phase('error','Camera disconnected','相机已断开','Return to preparation to reconnect.','请返回准备页面重新连接。');retry.hidden=false;}};
   detector=await getDetector();if(token!==generation||!stream)return;
   lastAssessment=draw(lastPose);update(lastAssessment);
   frame=requestAnimationFrame(t=>track(t,token));
  }catch{if(token===generation){phase('error','Camera unavailable','相机暂不可用','Return to preparation to reconnect.','请返回准备页面重新连接。');retry.hidden=false;}}
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 window.addEventListener('pagehide',()=>{disposing=true;cancelPreparation();close();expertOverlay?.dispose();expertOverlay=null;});
 return {prepare,cancelPreparation,isReady:()=>preparation.read().ready,
 setPose(poseId,externalStream){
  rowActive=!!rowingCheckpoints[poseId];preparationBar.hidden=!rowActive;syncMirror();
  const b=document.getElementById('start-rowing-correction');if(b)preparationBar.append(b);
  if(externalStream&&rowingCheckpoints[poseId])void prepare(poseId,externalStream);else cancelPreparation();
 },
 open(poseId){
  if(!rowingCheckpoints[poseId]||prepId!==poseId||!prepStream?.active||!preparation.read().ready)return;
  const external=prepStream,lockedYaw=preparation.read().yaw,pose=preparedPose,world=preparedWorld;
  prepGeneration++;cancelAnimationFrame(prepFrame);preparation.ready=false;readyButton();
  beforeOpen();id=poseId;index=0;lastUi=0;lastPose=pose;lastWorld=world;detector=null;modelFailed=false;orientation.reset();
  orientation.yaw=lockedYaw;orientation.ready=true;orientation.lock();returnStream=external;
  lateral=sourceLateral(sampleCapturedMotion(id,rowingCheckpoints[id][0].time).coords);
  dialog.innerHTML=`<div class="rowing-header"><div><small>${tr('ROWING · STATIC CORRECTION','赛艇 · 静态纠错')}</small><h2>${tr('Find your position','找到你的姿态')}</h2></div><button type="button" data-close>${tr('Close ×','关闭 ×')}</button></div><nav class="rowing-checkpoints" aria-label="${tr('Static checkpoints','静态关键姿态')}"></nav><div class="rowing-progress"><div role="status" aria-live="polite"><strong data-phase-title></strong><span data-phase-note></span></div><button data-relocate hidden>${tr('Reposition','重新定位')}</button></div><div class="rowing-feed"><video autoplay playsinline muted></video><canvas></canvas><button type="button" data-rowing-mirror class="rowing-mirror rowing-feed-mirror" aria-pressed="false"></button><span class="rowing-legend">${tr('Expert model / Your joints','专家模型 / 你的关节点')}</span></div><p class="rowing-instruction"></p><p class="rowing-status" hidden></p><div class="rowing-metrics"></div><details class="rowing-settings"><summary>${tr('Camera & display','相机与显示设置')}</summary><div class="rowing-options"><label>${tr('Expert opacity','专家模型透明度')}<input data-opacity type="range" min="0.2" max="0.8" step="0.05" value="0.45" aria-label="${tr('Expert opacity','专家模型透明度')}"></label></div><p class="rowing-setup">${tr('Keep the camera level. If framing is too narrow, try a wider lens or your phone. Horizontal direction is estimated automatically.','保持相机水平。取景太窄时可换广角镜头或使用手机；系统会自动估计水平朝向。')}</p></details><button data-retry hidden>${tr('Return to preparation','返回准备页面')}</button>`;
  video=dialog.querySelector('video');canvas=dialog.querySelector('canvas');status=dialog.querySelector('.rowing-status');metrics=dialog.querySelector('.rowing-metrics');steps=dialog.querySelector('nav');help=dialog.querySelector('.rowing-instruction');retry=dialog.querySelector('[data-retry]');opacityControl=dialog.querySelector('[data-opacity]');
  relocate=dialog.querySelector('[data-relocate]');phaseTitle=dialog.querySelector('[data-phase-title]');phaseNote=dialog.querySelector('[data-phase-note]');
  opacityControl.oninput=()=>{lastAssessment=draw(lastPose);};
  syncMirror();
  dialog.querySelector('[data-close]').onclick=close;
  retry.onclick=relocate.onclick=()=>close();
  rowingCheckpoints[id].forEach((key,i)=>{const b=document.createElement('button');b.type='button';b.textContent=`${i+1}. ${tr(key.en,key.zh)}`;b.onclick=()=>selectCheckpoint(i);steps.append(b);});
  dialog.showModal();selectCheckpoint(0);phase('correcting','Correcting · direction locked','正在纠错 · 朝向已锁定','Follow the expert; reposition if you move the camera.','跟随专家模型；移动相机后请重新定位。');void startLockedCamera(external);
 },close};
}
