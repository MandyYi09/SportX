import {createRowingCorrection} from './rowing-correction-ui.mjs';
import {createVoiceControls} from './voice-controls-ui.mjs';
import {readSetting} from './settings.mjs';
import {loadCapturedMotions} from './captured-motion.mjs';
try { await loadCapturedMotions(); } catch(error) { document.getElementById('stage-note').hidden=false; document.getElementById('stage-note').textContent='Movement demonstration could not load. Please reload.'; throw error; }
import {prepareLandmarks,isSidePose,isUpperPose,requiredLandmarks} from './tracking-view.mjs';
import { PosePresence } from './pose-presence.mjs';
import {createCameraControls,preferredRearLens,cameraDirection,sameDirectionDevices,setCameraIcon} from './camera-controls.mjs';
import { createFocusView } from './focus-view.mjs';
import { evaluate } from './pose-rules.mjs';
import { getReference, landmarkIds } from './reference.mjs';
import { comparePose, projectReference, normalizedLive } from './comparison.mjs';
import {createMotionPlayer} from './motion-player.mjs?v=29';
const $ = id => document.getElementById(id);
const motionPlayer=createMotionPlayer();
import { poses } from './exercises.mjs';
import { categoryLabels, practiceModes, sequenceFor } from './practice-modes.mjs';
import {createHand, orientHand, createWristDetail, wristExamples} from './hand-guide.mjs';
import {createTennisHand,createWrappedHand,placeTennisHand,createRelaxedHand} from './tennis-hand.mjs';
import {createTennisRacket,racketEnvelope} from './tennis-racket.mjs';
import {createAthleteModel} from './athlete-model.mjs';
import {fitYogaArms} from './yoga-proportions.mjs';
import {fitMobilityArms,orientMobilityHand} from './mobility-proportions.mjs';
import {createShootingProp,shootingGrip,shootingRearGrip,shootingEnvelope} from './shooting-model.mjs';
import {rowingGrip} from './equipment-grip.mjs';
import {getLanguage, setLanguage, registerPoseTranslations, startLocalization, refreshLocalization} from './i18n.mjs?v=49';
const selectedPose = () => poses.find(p => p.id === current);
let voiceControls=null;
const rowingCorrection=createRowingCorrection({getLanguage,getGender:()=>modelGender,onDirection:yaw=>sceneApi?.setTrackingYaw(yaw),beforeOpen:()=>{motionPlayer.pause();},onCameraStop:()=>stopCamera(),onCameraStart:async()=>{if(!stream?.active){stream=await navigator.mediaDevices.getUserMedia({video:cameraDeviceId?{deviceId:{exact:cameraDeviceId}}:{facingMode:{ideal:cameraFacing}},audio:false});stream.getVideoTracks()[0].onended=()=>{if(stream)stopCamera();};setCameraButton('Stop camera');}return stream;},onPlayback:(active,text)=>voiceControls?.setSpeaking('rowing',active,text),onControls:parent=>voiceControls?.mount(parent)});
const correctionButton=document.createElement('button');correctionButton.className='primary';correctionButton.id='start-rowing-correction';correctionButton.textContent='Start correction';correctionButton.disabled=true;correctionButton.onclick=()=>rowingCorrection.open(current);$('camera').before(correctionButton);
const dynamicButton=document.createElement('button');dynamicButton.className='primary';dynamicButton.id='start-rowing-dynamic';dynamicButton.textContent='Dynamic recording';dynamicButton.disabled=true;dynamicButton.onclick=()=>rowingCorrection.open(current,{dynamicOnly:true});correctionButton.after(dynamicButton);
const framing = id => isUpperPose(id) ? 'Face the camera with shoulders, elbows, wrists and hips visible. Feet can stay out of frame.' : isSidePose(id) ? 'Turn side-on with your whole body visible.' : 'Face the camera with your whole body visible.';
const presence = new PosePresence();
const focusView = createFocusView($('stage'),()=>{presence.dismiss();focusView.setExpanded(false);});
let lastPoseFrame=0;
let flipped = false;
let wristMode = 'aligned';
let viewZoom = 1;
let guideUnavailable = false;
let mobilityMode = 'stretch';
const activeCategory = () => filter === 'mobility' ? mobilityMode : filter;
let current = 'reach', filter = 'rowing', stream = null, landmarker = null, starting = false, runId = 0, lastVideo = -1, lastDetect = 0, lastFeedback = 0, remaining = 30, timerId = null, sceneApi = null;
let modelGender='male';
modelGender=readSetting('model-gender')==='female'?'female':'male';
let cameraFacing='user',cameraDeviceId=null,switchingCamera=false;
const cameraSwitchButtons=()=>[$('demo-camera-switch'),$('camera-switch')];
const cameraFlipButtons=[];
for(const button of cameraSwitchButtons()){
    setCameraIcon(button,'switch','Next lens on this side');
    const flip=document.createElement('button');flip.type='button';flip.hidden=true;
    setCameraIcon(flip,'flip','Flip front / back camera');
    button.before(flip);cameraFlipButtons.push(flip);
    flip.onclick=()=>switchCamera(null,true);
}
setCameraIcon($('demo-camera-stop'),'stop','Stop camera');
const dialogStop=document.createElement('button');dialogStop.type='button';
setCameraIcon(dialogStop,'stop','Stop camera');dialogStop.onclick=()=>stopCamera();
$('close-camera').before(dialogStop);
function setCameraButton(label){
    if(label==='Stop camera'){setCameraIcon($('camera'),'stop','Stop camera');}
    else{$('camera').textContent=label;$('camera').classList.remove('camera-icon-button');delete $('camera').dataset.cameraIcon;$('camera').removeAttribute('title');$('camera').removeAttribute('aria-label');}
}
const cameraControls=createCameraControls([$('demo-camera'),$('camera-dialog')],deviceId=>switchCamera(deviceId));
voiceControls=createVoiceControls({getLanguage,onCommand:executeVoiceCommand,onAnnouncement:active=>rowingCorrection.holdSpeech(active),onInterrupt:()=>rowingCorrection.interruptSpeech(),onSpeechStart:time=>rowingCorrection.noteSpeechStart(time)});
const voicePanel=document.createElement('div');document.querySelector('.camera-actions').after(voicePanel);voiceControls.mount(voicePanel);
window.addEventListener('pagehide',()=>voiceControls.dispose());
async function executeVoiceCommand(command){
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en;
 if(command==='voice-off'){voiceControls.disable();return tr('Voice control off.','语音控制已关闭。');}
 if(command==='camera-on'){
  if(stream)return tr('Camera already on.','摄像头已开启。');
  await $('camera').onclick();return tr(stream?'Camera on.':'Camera could not start. Check camera permission.',stream?'摄像头已开启。':'摄像头未能开启，请检查相机权限。');
 }
 if(command==='camera-off'){rowingCorrection.close();stopCamera();return tr('Camera off. Voice control is still listening.','摄像头已关闭，语音控制继续聆听。');}
 if(command==='camera-next'||command==='camera-flip'){
  if(!stream)return tr('Open the camera first.','请先打开摄像头。');
  if(starting||switchingCamera)return tr('Camera switch in progress.','正在切换摄像头。');
  if(command==='camera-next'){
   const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
   if(sameDirectionDevices(devices,stream.getVideoTracks()[0].getSettings()).length<2)return tr('No other lens on this side. Try flip camera.','当前方向没有其他镜头，可以说翻转镜头。');
  }
  rowingCorrection.close({keepCamera:true});await switchCamera(null,command==='camera-flip');return tr('Camera updated. Find your direction again.','摄像头已更新，请重新确定朝向。');
 }
 if(command==='next-movement'||command==='previous-movement'){
  const ids=['rowing-arms','rowing-half','rowing-full'],offset=command==='next-movement'?1:-1;
  const at=ids.indexOf(current),next=ids[at<0?0:(at+offset+ids.length)%ids.length];
  rowingCorrection.close();filter='rowing';document.querySelectorAll('[data-filter]').forEach(button=>button.classList.toggle('selected',button.dataset.filter==='rowing'));selectPose(next);
  return tr('Selected '+selectedPose().name+'. Set your direction, then say start correction.','已选择'+(selectedPose().zh?.[0]||{'rowing-arms':'出手划','rowing-half':'半桨划','rowing-full':'全桨划'}[next])+'。确定朝向后，说开始纠错。');
 }
 if(selectedPose().type!=='rowing')return tr('Select a rowing movement first.','请先选择赛艇动作。');
 if(command==='mirror-on'||command==='mirror-off'){rowingCorrection.mirror(command==='mirror-on');return tr(command==='mirror-on'?'Mirror on.':'Mirror off.',command==='mirror-on'?'镜像已开启。':'镜像已关闭。');}
 if(command==='start'||command==='lock'){
  if(command==='start'&&['ready','review'].includes(rowingCorrection.dynamicState())){rowingCorrection.startDynamic();return null;}
  if(rowingCorrection.isOpen())return tr('Direction already locked.','朝向已经锁定。');
  if(!rowingCorrection.isReady())return tr(stream?'Keep both shoulders visible until your direction is ready.':'Open the camera first.',stream?'请让双肩入镜，等待朝向就绪。':'请先打开摄像头。');
  rowingCorrection.open(current);return null;
 }
 if(command==='reposition'){
  if(rowingCorrection.isOpen()&&rowingCorrection.dynamicState()!=='off'){await rowingCorrection.repositionDynamic();return null;}
  if(!stream)return tr('Open the camera first.','请先打开摄像头。');
  if(rowingCorrection.isOpen())rowingCorrection.close({keepCamera:true});else void rowingCorrection.prepare(current,stream);
  return tr('Finding your direction. Keep both shoulders visible.','正在重新定位，请让双肩入镜。');
 }
 if(!rowingCorrection.isOpen())return tr('Say start correction first.','请先说开始纠错。');
 if(command==='end'){
  if(['countdown','recording'].includes(rowingCorrection.dynamicState())){await rowingCorrection.finishDynamic({voice:true});return null;}
  rowingCorrection.close();return tr('Correction ended.','纠错已结束。');
 }
 if(command==='pause'){rowingCorrection.pause();return tr('Correction paused. Your direction and stage are saved.','纠错已暂停，朝向和阶段已保留。');}
 if(command==='review'){rowingCorrection.pause('review');return tr('Correction paused. Come back to view the expert, then say resume correction.','纠错已暂停。可以返回手机查看教练，准备好后说继续纠错。');}
 if(command==='resume'){rowingCorrection.resume();return tr('Return to your position. Your direction stays locked.','请回到练习位置，朝向保持锁定。');}
 if(command==='next-stage'||command==='previous-stage'){rowingCorrection.nextStage(command==='next-stage'?1:-1);return null;}
 if(command==='repeat-demo'){rowingCorrection.repeatDemo();return null;}
 if(command==='repeat'){rowingCorrection.repeat();return null;}
}
async function updateCameraDevices(){
    let devices=[];
    try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');}catch{}
    const settings=stream?.getVideoTracks()[0].getSettings() || {};
    const count=sameDirectionDevices(devices,settings).length;
    cameraSwitchButtons().forEach(button=>{button.hidden=!stream||count<2;button.disabled=switchingCamera;});
    const direction=settings.facingMode || cameraDirection(devices.find(d=>d.deviceId===settings.deviceId)) || cameraFacing;
    const opposite=direction==='user'?'environment':'user';
    let canFlip=devices.some(d=>cameraDirection(d)===opposite);
    try{canFlip ||= stream?.getVideoTracks()[0].getCapabilities?.().facingMode?.includes(opposite);}catch{}
    cameraFlipButtons.forEach(button=>{button.hidden=!stream||!canFlip;button.disabled=switchingCamera;});
    dialogStop.hidden=!stream;
}
function setWristMode(mode) {
 wristMode = selectedPose().wristStudy && wristExamples[mode] ? mode : 'aligned';
 document.querySelectorAll('[data-wrist]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wrist===wristMode)));
 $('wrist-explanation').textContent=wristExamples[wristMode].text;
 $('wrist-detail').setAttribute('aria-label',wristExamples[wristMode].text);
 sceneApi?.setWristMode(wristMode);
 if(selectedPose().type==='rowing')renderComparison(null);
}
document.querySelectorAll('[data-wrist]').forEach(b=>b.onclick=()=>setWristMode(b.dataset.wrist));
function drawCards() {
 const listScroll=$('poses').scrollLeft;
 const category=activeCategory();
 document.documentElement.dataset.theme=filter==='mobility'?'mobility':category;
 sceneApi?.setTheme();
 const shown=poses.filter(p => p.type!=='clay'&&p.type===category);
 $('mobility-modes').hidden=filter!=='mobility';
 document.querySelectorAll('[data-mobility]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mobility===mobilityMode)));
 $('movement-count').textContent=`${shown.length} movements`;
 $('category-intro').hidden=!practiceModes[category];
 $('category-intro').textContent=practiceModes[category]?.title || '';
 $('poses').innerHTML=shown.map(p => `<button class="pose-card ${p.id === current ? 'active' : ''}" data-pose="${p.id}" aria-pressed="${p.id === current}"><span class="pose-icon" aria-hidden="true">${p.icon}</span><span><strong>${p.name}</strong><small>${categoryLabels[p.type]} · ${p.demoOnly ? 'Demo' : (p.hold || 30)+' sec'}</small></span><span class="arrow" aria-hidden="true">↗</span></button>`).join('');
 document.querySelectorAll('[data-pose]').forEach(b => b.onclick=() => selectPose(b.dataset.pose));
 $('poses').scrollLeft=listScroll;
 if(matchMedia('(max-width: 700px)').matches){
  const card=$('poses').querySelector('.active');
  if(card){const list=$('poses').getBoundingClientRect(),rect=card.getBoundingClientRect();if(rect.left<list.left||rect.right>list.right)$('poses').scrollLeft+=rect.left-list.left;}
 }
}
function selectPose(id, keepSide=false) {
 const p=poses.find(p=>p.id===id); if(!p)throw Error('Unknown movement');
 if(p.type==='clay')return;
 if(stream && selectedPose().demoOnly !== p.demoOnly)stopCamera();
 if(!p.wristStudy || !selectedPose().wristStudy)wristMode='aligned';
 current=id; $('demo-video').style.transform=p.type==='rowing'||cameraFacing==='environment'?'none':'scaleX(-1)';correctionButton.hidden=p.type!=='rowing'; if(!keepSide)flipped=false; stopTimer(); remaining=p.hold || 30; updateTimer();
 viewZoom=1;
 document.querySelector('.studio').classList.toggle('motion-study',!!p.motion);
 document.querySelector('.workspace').classList.toggle('motion-workspace',!!p.motion);
 $('pose-facts').hidden=!!p.demoOnly;
 $('hold-duration').textContent=remaining+' sec';
 $('duration-label').textContent=p.type==='gentle' ? 'Practice time' : 'Suggested hold';
 $('pose-tag').textContent=p.demoOnly ? categoryLabels[p.type] : `${categoryLabels[p.type]} · ${p.area}`;
 $('pose-name').textContent=p.name; $('pose-description').textContent=p.description; $('pose-description').hidden=!!p.demoOnly;
 $('pose-level').textContent=p.level || 'Easy';
 $('angle-label').textContent=p.demoOnly ? '↔ Drag to rotate · scroll to zoom' : isUpperPose(id) ? '↔ Front camera · upper body' : isSidePose(id) ? '↔ Side-on camera · full body' : '↔ Face your camera';
 $('camera-setup').textContent=p.demoOnly ? 'Place your camera where your body and hands are visible.' : 'Camera setup: '+framing(id);
 $('stage-note').hidden=!guideUnavailable || !!stream;
 $('reference-label').textContent=p.motion ? 'Expert demonstration' : p.demoOnly ? 'Illustrative 3D movement study' : isUpperPose(id) ? '3D reference · upper body' : '3D pose reference';
 $('cues').innerHTML=p.cues.map((c,i)=>`<div class="cue"><span>${i+1}</span>${c}</div>`).join('');
 $('wrist-study').hidden=!p.wristStudy;
 $('cue-heading').textContent=p.demoOnly ? 'Playback controls' : 'Movement cues';
 const mode=practiceModes[p.type]; $('practice-note').hidden=!mode?.note || !!p.demoOnly; $('practice-note').open=false;
 $('practice-note-text').textContent=mode?.note || ''; $('practice-source').textContent=mode?.sourceLabel || ''; $('practice-source').hidden=!mode?.source; if(mode?.source)$('practice-source').href=mode.source;
 const sequence=sequenceFor(id); $('sequence').hidden=!sequence.length;
 $('sequence-title').textContent=p.groupTitle || mode?.title || ''; $('sequence-count').textContent=sequence.length ? `${sequence.findIndex(x=>x.id===id)+1} / ${sequence.length}` : '';
 $('sequence-steps').replaceChildren();
 sequence.forEach((step,i)=>{const b=document.createElement('button'); b.textContent=`${i+1}. ${step.name}`;b.setAttribute('aria-pressed',String(step.id===id));b.onclick=()=>{selectPose(step.id,true);$('sequence-steps').children[i].focus({preventScroll:true});};$('sequence-steps').append(b);});
 $('timer-panel').hidden=$('timer-note').hidden=!!p.demoOnly;
 $('timer-label').textContent=p.type==='gentle' ? 'PRACTICE TIMER' : 'HOLD TIMER';
 $('timer-note').textContent='Start or pause the timer.';
 $('camera').disabled=starting; setCameraButton(stream ? 'Stop camera' : '▣ Enable camera');
 $('camera-title').textContent='Camera preview';
 $('camera-sub').textContent=p.demoOnly ? stream ? 'Your camera is beside the 3D guide.' : 'Enable camera to see yourself beside the 3D guide.' : stream ? framing(id) : 'Enable your camera to compare your pose.';
 $('show-camera').hidden=document.querySelector('.comparison-panel').hidden=!!p.demoOnly;
 motionPlayer.select(id);motionPlayer.mirror(flipped);
 drawCards();sceneApi?.setPose(id);rowingCorrection.setPose(id,stream);setWristMode(wristMode); $('switch-side').hidden=!(p.asymmetric || ['side','warrior'].includes(id));
 clearComparison();
 setFeedback({state:'unknown',title:p.demoOnly ? stream ? 'Live preview' : 'Movement study' : stream ? 'Find your starting position' : 'Camera off',text:p.demoOnly ? stream ? 'Compare your movement with the 3D demonstration.' : 'Select a numbered step, then enable the camera to compare your movement.' : stream ? framing(id) : 'You can follow the guide without a camera, or enable it for body-shape feedback.'});
}
function setFeedback(r) { document.querySelector('.feedback').hidden=!!selectedPose().demoOnly && !stream; $('focus-feedback').textContent=r.title+' — '+r.text; document.querySelector('.feedback').className = `feedback ${r.state}`; $('feedback-title').textContent = r.title; $('feedback-text').textContent = r.text; $('feedback-icon').textContent = r.state === 'good' ? '✓' : r.state === 'warning' ? '↗' : '◌'; }
document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
 filter=b.dataset.filter;
 document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});
 const category=activeCategory();
 if(selectedPose().type!==category)selectPose(category==='rowing'?'rowing-full':poses.find(p=>p.type===category).id);else drawCards();
});
document.querySelectorAll('[data-mobility]').forEach(button=>button.onclick=()=>{
 mobilityMode=button.dataset.mobility;
 if(selectedPose().type!==mobilityMode)selectPose(poses.find(p=>p.type===mobilityMode).id);else drawCards();
});
$('help').onclick = () => $('help-dialog').showModal(); $('close-help').onclick = $('got-it').onclick = () => $('help-dialog').close();
function updateTimer() { $('time').textContent = `00:${String(remaining).padStart(2, '0')}`; }
function stopTimer() { clearInterval(timerId); timerId = null; $('timer').textContent = '▶'; $('timer').setAttribute('aria-label', 'Start hold timer'); }
$('timer').onclick = () => { if (timerId) { stopTimer(); return } if (!remaining) remaining = poses.find(p=>p.id===current)?.hold || 30; $('timer').textContent = 'Ⅱ'; $('timer').setAttribute('aria-label', 'Pause hold timer'); timerId = setInterval(() => { remaining--; updateTimer(); if (!remaining) { stopTimer(); setFeedback({ state: 'unknown', title: 'Timer complete', text: 'Repeat the movement or switch sides.' }) } }, 1000); };
function releaseCameraStream() {
 rowingCorrection.cancelPreparation();
 runId++;
 const previousStream=stream;stream=null;
 previousStream?.getTracks().forEach(track=>{track.onended=null;track.stop();});
 $('tracking-video').pause();
}
function stopCamera({keepDialogOpen=false}={}) {
 cameraControls.reset();
 presence.reset(); focusView.setExpanded(false);
 releaseCameraStream();
 [...cameraSwitchButtons(),...cameraFlipButtons,dialogStop].forEach(button=>button.hidden=true);
 $('tracking-video').srcObject = $('video').srcObject = $('demo-video').srcObject = null;
 $('video').hidden = $('overlay').hidden = true;
 $('demo-camera').hidden = true; $('stage-layout').classList.remove('with-preview');
 $('three').hidden = false; $('stage-note').hidden = !guideUnavailable; $('rotate').hidden = false;
 $('stage').classList.remove('live'); $('show-camera').disabled = true;
 if(!keepDialogOpen)$('camera-dialog').close();
 clearComparison(); $('mode').textContent = '○   REFERENCE PREVIEW'; setCameraButton('▣   Enable camera');
 $('camera-title').textContent = 'Camera preview';
 $('camera-sub').textContent = selectedPose().demoOnly ? 'Enable camera to see yourself beside the 3D guide.' : 'Enable your camera to get live alignment cues.';
 stopTimer(); setFeedback({state:'unknown',title:'Camera is off',text:'Your reference guide is ready. You can restart whenever you like.'});
}
$('camera').onclick = async () => {
    if (stream) { stopCamera(); return } if (starting) return;
    const openingDemo = !!selectedPose().demoOnly;
    starting = true; $('camera').disabled = true; correctionButton.disabled=true;
    if(!switchingCamera)setCameraButton('Connecting…');
    try {
        if (!window.isSecureContext) throw Error('Camera requires a trusted HTTPS connection. Open the HTTPS version of this site and allow camera access.');
        if (!navigator.mediaDevices?.getUserMedia) throw Error('Camera is unavailable in this browser. Open this page in Safari or Chrome and allow camera access.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { resizeMode: {ideal:'none'}, ...(cameraDeviceId?{deviceId:{exact:cameraDeviceId}}:{facingMode:{ideal:cameraFacing}}) }, audio: false });
        // A rear-facing request can select a telephoto lens on multi-camera phones.
        // Prefer explicitly labelled wide lenses, while respecting a manual choice.
        if(!cameraDeviceId && (cameraFacing==='environment'||stream.getVideoTracks()[0].getSettings().facingMode==='environment')){
            let rearLens;
            try{rearLens=preferredRearLens((await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'));}catch{}
            const originalId=stream.getVideoTracks()[0].getSettings().deviceId;
            if(rearLens && originalId && rearLens.deviceId!==originalId){
                stream.getTracks().forEach(track=>track.stop());stream=null;
                const openLens=deviceId=>navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:deviceId},resizeMode:{ideal:'none'}},audio:false});
                try{stream=await openLens(rearLens.deviceId);}catch{stream=await openLens(originalId);}
            }
        }
        if (openingDemo !== !!selectedPose().demoOnly) { stopCamera(); return; }
        stream.getVideoTracks()[0].onended = () => { if (stream) stopCamera(); };
        const actualFacing=stream.getVideoTracks()[0].getSettings().facingMode;
        if(actualFacing)cameraFacing=actualFacing;
        for(const id of ['video','demo-video','overlay'])$(id).style.transform=cameraFacing==='environment'?'none':'scaleX(-1)';
        await updateCameraDevices();
        let devices=[];
        try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');}catch{}
        if(!stream){return;}
        await cameraControls.configure(stream.getVideoTracks()[0],devices);
        if(!stream){return;}
        if (openingDemo) {
            $('demo-camera').hidden = false; $('stage-layout').classList.add('with-preview');
            $('demo-video').srcObject = stream; await $('demo-video').play();
            if (!stream || !selectedPose().demoOnly) { stopCamera(); return; }
            $('demo-camera').hidden = false; $('stage-layout').classList.add('with-preview');
            setCameraButton('Stop camera'); $('camera-title').textContent = 'Camera preview';
            $('camera-sub').textContent = 'Your camera is beside the 3D guide.';
            setFeedback({state:'unknown',title:'Live preview',text:'Compare your movement with the 3D demonstration.'});
            if(selectedPose().type==='rowing'){$('demo-video').style.transform='none';void rowingCorrection.prepare(current,stream);$('camera-sub').textContent='The expert follows your horizontal direction.';}
            return;
        }
        $('camera-sub').textContent = 'Preparing on-device pose tracking…';
        if (!landmarker) { const { FilesetResolver, PoseLandmarker } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs'); const files = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'); landmarker = await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6 }); }
        if (!stream || selectedPose().demoOnly) { stopCamera(); return; }
        // Keep the inference source outside the optional, normally closed preview dialog.
        $('tracking-video').srcObject = $('video').srcObject = stream;
        await $('tracking-video').play();
        if (!stream || selectedPose().demoOnly) { stopCamera(); return; }
        $('video').hidden = $('overlay').hidden = false; $('three').hidden = false; $('stage-note').hidden = true; $('rotate').hidden = false;
        $('stage').classList.add('live'); $('show-camera').disabled = false; $('mode').textContent = '●   LIVE · ON DEVICE';
        setCameraButton('Stop camera'); $('camera-title').textContent = 'Camera on'; $('camera-sub').textContent = framing(current);
        lastVideo = -1; const token = ++runId; requestAnimationFrame(t => track(t, token));
    } catch (e) {
        if(switchingCamera)releaseCameraStream();
        else stopCamera();
        const msg = e.name === 'NotAllowedError' ? 'Camera permission was declined. Allow access in your browser and try again.' : e.name === 'NotFoundError' ? 'No camera was found. Connect a camera and try again.' : e.message || 'Could not start tracking. Check your connection and try again.';
        $('camera-sub').textContent = msg; setFeedback({state:'warning',title:'Camera could not start',text:msg});
    } finally { starting = false; $('camera').disabled = false; correctionButton.disabled=selectedPose().type==='rowing'?!rowingCorrection.isReady():false; }
};
$('demo-camera-stop').onclick = stopCamera;
async function switchCamera(deviceId=null,flip=false){
    if(!stream||starting||switchingCamera)return;
    switchingCamera=true;[...cameraSwitchButtons(),...cameraFlipButtons].forEach(button=>button.disabled=true);
    const previous={deviceId:stream.getVideoTracks()[0].getSettings().deviceId || cameraDeviceId,facing:cameraFacing};
    try{
        const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
        const settings=stream.getVideoTracks()[0].getSettings();
        if(flip){
            const direction=settings.facingMode || cameraDirection(devices.find(d=>d.deviceId===settings.deviceId)) || cameraFacing;
            cameraFacing=direction==='environment'?'user':'environment';cameraDeviceId=null;
            const opposite=devices.filter(d=>cameraDirection(d)===cameraFacing);
            const preferred=cameraFacing==='environment'?preferredRearLens(opposite):null;
            if(opposite.length)cameraDeviceId=(preferred || opposite[0]).deviceId;
        }else{
            const sameSide=sameDirectionDevices(devices,settings);
            if(deviceId){if(!sameSide.some(d=>d.deviceId===deviceId))return;cameraDeviceId=deviceId;}
            else{if(sameSide.length<2)return;const index=sameSide.findIndex(d=>d.deviceId===settings.deviceId);cameraDeviceId=sameSide[(index+1)%sameSide.length].deviceId;}
        }
        // iOS requires releasing the current camera before opening the other lens.
        // Release the hardware without resetting the preview, controls or layout.
        releaseCameraStream();await $('camera').onclick();
        if(!stream){cameraDeviceId=previous.deviceId;cameraFacing=previous.facing;await $('camera').onclick();}
        if($('camera-dialog').open&&stream&&!selectedPose().demoOnly){await $('video').play();}
    }catch(error){$('camera-sub').textContent=error.message||'Could not switch camera.';}
    finally{
        switchingCamera=false;
        if(!stream)setCameraButton('▣ Enable camera');
        await updateCameraDevices();
    }
}
for(const button of cameraSwitchButtons())button.onclick=()=>switchCamera();
const connections = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
function track(t, token) {
    if (token !== runId || !stream) return; try {
        const v = $('tracking-video'); if (v.readyState >= 2 && v.currentTime !== lastVideo && t - lastDetect > 85) {
            lastVideo = v.currentTime; lastDetect = t; const result = landmarker.detectForVideo(v, t); const c = $('overlay'); c.width = v.videoWidth; c.height = v.videoHeight; const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); const p = prepareLandmarks(current,result.landmarks[0]);
            const assessment = evaluate(current, p, v.videoWidth, v.videoHeight);
            lastPoseFrame=t;
            const comparison = assessment.state === 'unknown' ? null : comparePose(current, p, c.width, c.height, flipped);
            focusView.setExpanded(presence.update(!!comparison && !!sceneApi,t));
            drawComparison(ctx, p, comparison, c.width, c.height);
            sceneApi?.setLive(comparison ? normalizedLive(current,p,c.width,c.height,flipped) : null,comparison?.adjustJoints || []);
            if (t - lastFeedback > 650) {
                lastFeedback = t;
                renderComparison(comparison);
                setFeedback(assessment.state === 'unknown' ? assessment : comparison?.feedback || {state:'unknown',title:'Adjust your camera view',text:'Some joints overlap. Move the camera slightly so each limb is visible.'});
            }
        } requestAnimationFrame(t => track(t, token));
    } catch (e) { stopCamera(); setFeedback({ state: 'warning', title: 'Tracking paused', text: 'Pose tracking encountered a problem. Restart the camera to try again.' }); }
}

function clearComparison() {
 const canvas=$('overlay'); canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
 renderComparison(null); sceneApi?.setLive(null); lastFeedback=0;
}
function renderComparison(result) {
 $('stage').dataset.match=result?.quality?.band || 'neutral';
 $('match-status').textContent=selectedPose().type==='rowing' && wristMode!=='aligned' ? 'Comparison example · not a target' : selectedPose().demoOnly ? 'Demonstration' : result?.quality?.label || 'Waiting for a clear pose';
 $('comparison-status').textContent=result ? 'Your angles / reference angles' : isUpperPose(current) ? 'Upper-body tracking needed to compare' : 'Full-body tracking needed to compare';
 $('comparison-metrics').replaceChildren();
 for(const row of result?.metrics || []) {
  const el=document.createElement('div');el.className='metric '+(row.close?'close-match':'adjust');
  const label=document.createElement('span');label.textContent=row.label;
  const value=document.createElement('strong');value.textContent=`${Math.round(row.actual)}° / ${Math.round(row.target)}° ${row.close?'✓':'↗'}`;
  el.append(label,value);$('comparison-metrics').append(el);
 }
}
$('focus-camera').onclick=()=>{$('camera-dialog').showModal();$('video').play().catch(()=>{});};
$('focus-stop').onclick=()=>stopCamera();
setInterval(()=>{if(stream && performance.now()-lastPoseFrame>500){focusView.setExpanded(presence.update(false,performance.now()));sceneApi?.setLive(null);renderComparison(null);}},250);
$('show-camera').onclick=()=>{$('camera-dialog').showModal();$('video').play().catch(()=>{});};
$('close-camera').onclick=()=>$('camera-dialog').close();
$('switch-side').onclick=()=>{flipped=!flipped;motionPlayer.mirror(flipped);sceneApi?.setPose(current);clearComparison();};
function drawComparison(ctx, p, result, width, height) {
 if(!p)return;
 const ghost=result ? projectReference(current,p,width,height,flipped) : null;
 const line=(a,b,color,dashed=false)=>{ctx.strokeStyle=color;ctx.lineWidth=5;ctx.setLineDash(dashed?[12,9]:[]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
 const allowed=requiredLandmarks(current,p);
 if(ghost)for(const[a,b]of connections)if(allowed.includes(a)&&allowed.includes(b))line(ghost[a],ghost[b],'#9ed4ff',true);
 for(const[a,b]of connections){if((p[a]?.visibility??0)<.65||(p[b]?.visibility??0)<.65)continue;const highlight=result?.adjustJoints.includes(a)||result?.adjustJoints.includes(b);line({x:p[a].x*width,y:p[a].y*height},{x:p[b].x*width,y:p[b].y*height},highlight?'#ffbe70':'#d9f6a0');}
 ctx.setLineDash([]);ctx.fillStyle='#f7ffe9';for(const i of landmarkIds){if((p[i]?.visibility??0)<.65)continue;ctx.beginPath();ctx.arc(p[i].x*width,p[i].y*height,5,0,Math.PI*2);ctx.fill();}
}

document.addEventListener('visibilitychange', () => { if (document.hidden) { stopTimer(); } }); window.addEventListener('pagehide', stopCamera);
registerPoseTranslations(poses);
document.querySelectorAll('[data-gender]').forEach(button=>{
 button.setAttribute('aria-pressed',String(button.dataset.gender===modelGender));
 button.onclick=()=>{modelGender=button.dataset.gender;try{localStorage.setItem('sportx-model-gender',modelGender);}catch{}
  document.querySelectorAll('[data-gender]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));sceneApi?.setGender();};
});
document.querySelectorAll('[data-language]').forEach(button => button.onclick = () => {
 setLanguage(button.dataset.language);
 document.querySelectorAll('[data-language]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
 refreshLocalization();
});
const entryParams=new URLSearchParams(location.search);
const entryMovement=entryParams.get('movement');
const entryPose=poses.find(p=>p.id===entryMovement&&p.type!=='clay')||poses.find(p=>p.id==='rowing-full');
if(['zh','en'].includes(entryParams.get('lang')))setLanguage(entryParams.get('lang'));
filter=['stretch','gentle'].includes(entryPose.type)?'mobility':entryPose.type;if(filter==='mobility')mobilityMode=entryPose.type;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});selectPose(entryPose.id);
startLocalization();
async function initThree() {
    try {
        const THREE = await import('./vendor/three.module.js'); const host = $('three'); const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(34, 1, .1, 100); camera.position.set(0, 1.65, 6.8); camera.lookAt(0, 1.15, 0); const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; host.append(renderer.domElement); scene.add(new THREE.HemisphereLight(0xffffff, 0x6f7d59, 2.5)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-3, 5, 4); scene.add(light); const group = new THREE.Group(); scene.add(group); const mat = new THREE.MeshStandardMaterial({ color: 0x6c8058, roughness: .65, metalness: .05 }); const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 80), new THREE.MeshBasicMaterial({ color: 0xafbda1, transparent: true, opacity: .28 })); floor.rotation.x = -Math.PI / 2; floor.position.y = .02; scene.add(floor); const rings = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.19, 100), new THREE.MeshBasicMaterial({ color: 0x96aa81, side: THREE.DoubleSide, transparent: true, opacity: .5 })); rings.rotation.x = -Math.PI / 2; rings.position.y = .03; scene.add(rings);
        const links = [[0, 1], [0, 2], [2, 4], [1, 3], [3, 5], [0, 6], [1, 7], [6, 7], [6, 8], [8, 10], [7, 9], [9, 11]]; let target = getReference(current, flipped), neutralCoords = target.map(p => new THREE.Vector3(...p)), coords = neutralCoords.map(p=>p.clone()); const head=new THREE.Object3D(); const liveGroup=new THREE.Group();group.add(liveGroup);liveGroup.visible=false;
        const liveBones=links.map(()=>{const material=new THREE.MeshBasicMaterial({color:0x243950,depthTest:false});const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,1,10),material);mesh.renderOrder=3;liveGroup.add(mesh);return mesh;});
        const liveJoints=landmarkIds.map(()=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.038,12,10),new THREE.MeshBasicMaterial({color:0x243950,depthTest:false}));mesh.renderOrder=4;liveGroup.add(mesh);return mesh;});
        const skinMaterial=new THREE.MeshStandardMaterial({color:0xc9b79f,roughness:.85});
        const handMaterial=new THREE.MeshStandardMaterial({color:0xc9b79f,roughness:.8});
        const hands=[-1,1].map(side=>{const hand=createHand(THREE,handMaterial,side);group.add(hand.root);return {...hand,side,gripPoint:new THREE.Vector3()};});
        const tennisHands=[-1,1].map(side=>{const hand=createTennisHand(THREE,handMaterial,side);group.add(hand.root);return hand;});
        const relaxedHands=[-1,1].map(side=>{const hand=createRelaxedHand(THREE,handMaterial,side);group.add(hand.root);return hand;});
        const equipmentHands=Object.fromEntries([['rowing',rowingGrip],['clay',shootingGrip]].map(([type,spec])=>[type,[-1,1].map(side=>{
            const hand=createWrappedHand(THREE,handMaterial,side,type==='clay'&&side===1?shootingRearGrip:spec);group.add(hand.root);return hand;
        })]));
        const wristDetail=createWristDetail(THREE,$('wrist-detail'));wristDetail.setMode(wristMode);
        const propMaterial=new THREE.MeshStandardMaterial({color:0x9c8060,roughness:.8});
        const chairGroup=new THREE.Group();group.add(chairGroup);
        const seat=new THREE.Mesh(new THREE.BoxGeometry(.67,.07,.62),propMaterial);seat.position.set(0,.64,.08);chairGroup.add(seat);
        const back=new THREE.Mesh(new THREE.BoxGeometry(.67,.49,.055),propMaterial);back.position.set(0,1.03,-.23);chairGroup.add(back);
        for(const x of [-.27,.27])for(const z of [-.18,.32]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.59,10),propMaterial);leg.position.set(x,.32,z);chairGroup.add(leg);}
        const sculls=[-1,1].map(side=>{
            const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,1,12),propMaterial);group.add(shaft);
            const handle=new THREE.Mesh(new THREE.CylinderGeometry(rowingGrip.radius,rowingGrip.radius,.15,16),propMaterial);group.add(handle);
            const blade=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),new THREE.MeshStandardMaterial({color:side<0?0xc2d8e1:0xe7d9b7,roughness:.6}));blade.scale.set(.23,.055,.12);group.add(blade);
            return {side,shaft,handle,blade,end:new THREE.Vector3()};
        });
        const hull=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),new THREE.MeshStandardMaterial({color:0x9cb5ae,roughness:.8}));hull.scale.set(1.05,.08,.21);hull.position.set(-.2,.52,0);group.add(hull);
        const racket=createTennisRacket(THREE).root;group.add(racket);
        const shotgun=createShootingProp(THREE).root;group.add(shotgun);
        let motionSample=null;
        const feet=[new THREE.Object3D(),new THREE.Object3D()],pelvis=new THREE.Object3D();
        const athletes=Object.fromEntries(['male','female'].map(gender=>{const model=createAthleteModel(THREE,{body:mat,skin:skinMaterial,gender});group.add(model.root);model.root.visible=gender===modelGender;return [gender,model];}));
        let athlete=athletes[modelGender];
        const boatSeat=new THREE.Mesh(new THREE.BoxGeometry(.25,.055,.35),propMaterial);group.add(boatSeat);
        const seatRails=new THREE.Group();group.add(seatRails);
        for(const z of [-.12,.12]){
            const rail=new THREE.Mesh(new THREE.BoxGeometry(.78,.025,.025),propMaterial);
            rail.position.set(.04,.515,z);seatRails.add(rail);
        }
        const oarlocks=sculls.map(item=>{
            const root=new THREE.Group();group.add(root);
            const pivot=new THREE.Vector3(-.13,1.0,item.side*.64);
            const ring=new THREE.Mesh(new THREE.TorusGeometry(.045,.012,8,16),propMaterial);ring.position.copy(pivot);root.add(ring);
            const support=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1,10),propMaterial);
            const base=new THREE.Vector3(-.13,.54,item.side*.20),d=pivot.clone().sub(base);
            support.position.copy(base).add(pivot).multiplyScalar(.5);support.scale.y=d.length();
            support.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());root.add(support);
            return {root,pivot};
        });
        function updateProps(){
            const type=selectedPose().type;chairGroup.visible=type==='gentle';hull.visible=type==='rowing';racket.visible=type==='tennis';
            boatSeat.visible=seatRails.visible=type==='rowing';boatSeat.position.copy(coords[6]).add(coords[7]).multiplyScalar(.5);boatSeat.position.y-=motionSample?.captured?.075:.09;seatRails.position.y=boatSeat.position.y-.045-.515;hull.position.y=motionSample?.captured?.08:.52;
            oarlocks.forEach((lock,i)=>{lock.root.visible=type==='rowing';if(type==='rowing'&&motionSample?.captured){lock.root.position.fromArray(motionSample.oars[i].pivot).sub(lock.pivot);}else lock.root.position.set(0,0,0);});
            shotgun.visible=type==='clay';
            for(const hand of hands){
                const w=hand.side<0?4:5,e=hand.side<0?2:3;
                const showHands=type==='rowing'||type==='clay'||type==='tennis';
                const side=hand.side<0?0:1,tennis=type==='tennis'&&!!motionSample,equipped=!!motionSample?.equipmentHands?.[side];
                hand.root.visible=showHands&&!tennis&&!equipped&&!motionSample?.captured;
                const gripFrame=motionSample?.tennisHands?.[side];
                const meshSide=flipped?1-side:side;
                tennisHands[meshSide].root.visible=tennis&&!!gripFrame;
                relaxedHands[meshSide].root.visible=(tennis&&!gripFrame)||!showHands||(motionSample?.captured&&!tennis&&!equipped);
                relaxedHands[meshSide].root.scale.setScalar(type==='yoga'?1.18:['stretch','gentle'].includes(type)?1.08:1);
                for(const [sport,models]of Object.entries(equipmentHands))models[meshSide].root.visible=equipped&&type===sport;
                if(equipped){
                    const frame=motionSample.equipmentHands[side];
                    placeTennisHand(THREE,equipmentHands[type][meshSide],frame);
                    hand.gripPoint.fromArray(frame.center);
                    continue;
                }
                if(tennis){
                    // Reflections swap which anatomical hand is dominant.
                    if(gripFrame)placeTennisHand(THREE,tennisHands[meshSide],gripFrame);
                    else {
                        orientHand(THREE,relaxedHands[meshSide],coords[w],coords[w].clone().sub(coords[e]));
                        relaxedHands[meshSide].root.scale.z=flipped?-1:1;
                    }
                    continue;
                }
                if(!showHands||(motionSample?.captured&&!equipped)){
                    const direction=coords[w].clone().sub(coords[e]);
                    if(type==='yoga'&&current==='down-dog')direction.copy(coords[w]).sub(coords[10+side]).setY(0);
                    if(type==='yoga'&&current==='tree')direction.copy(coords[0]).add(coords[1]).sub(coords[6]).sub(coords[7]).normalize();
                    if(!(['stretch','gentle'].includes(type)&&orientMobilityHand(THREE,relaxedHands[meshSide],coords,current,side,flipped)))orientHand(THREE,relaxedHands[meshSide],coords[w],direction);
                    if(type==='yoga'&&current==='tree')relaxedHands[meshSide].root.rotateX((side===0?-1:1)*Math.PI/2);
                    continue;
                }
                const direction=coords[w].clone().sub(coords[e]);
                if(type==='rowing' && wristExamples[wristMode].keepGrip){
                    const neutralDirection=neutralCoords[w].clone().sub(neutralCoords[e]).normalize();
                    direction.copy(neutralCoords[w]).addScaledVector(neutralDirection,.16).sub(coords[w]);
                }
                hand.gripPoint.copy(orientHand(THREE,hand,coords[w],direction));
            }
            if(shotgun.visible&&motionSample?.clayProp){
                const prop=motionSample.clayProp;
                shotgun.position.fromArray(prop.origin);
                shotgun.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...prop.x),new THREE.Vector3(...prop.y),new THREE.Vector3(...prop.z)));
                shotgun.scale.set(1,1,prop.mirrored?-1:1);
            }else if(shotgun.visible){
                const rear=hands[flipped?0:1].gripPoint,front=hands[flipped?1:0].gripPoint;
                const x=front.clone().sub(rear),length=x.length();x.normalize();
                const up=Math.abs(x.y)>.95?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0);
                const z=new THREE.Vector3().crossVectors(x,up).normalize(),y=new THREE.Vector3().crossVectors(z,x).normalize();
                shotgun.position.copy(rear);shotgun.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
                shotgun.scale.setScalar(1);
            }
            for(const item of sculls){
                item.shaft.visible=item.handle.visible=item.blade.visible=type==='rowing';
                if(type!=='rowing')continue;
                const attachment=motionSample?.oars?.[item.side<0?0:1];
                if(attachment){
                    const start=new THREE.Vector3(...attachment.start);
                    item.end.fromArray(attachment.end);
                    item.shaft.position.copy(start).add(item.end).multiplyScalar(.5);
                    item.shaft.scale.y=rowingGrip.oarLength;
                    item.shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...attachment.axis));
                    item.handle.position.fromArray(attachment.hand.center);
                    item.handle.quaternion.copy(item.shaft.quaternion);
                    item.blade.position.copy(item.end);
                    continue;
                }
                const hand=hands[item.side<0?0:1].gripPoint;
                const handleStart=hand.clone().add(new THREE.Vector3(0,0,-item.side*.09));
                // Fixed oar length and pivot; this is a geometric approximation, not a measured blade track.
                const lock=oarlocks[item.side<0?0:1].pivot;
                item.end.copy(handleStart).addScaledVector(lock.clone().sub(handleStart).normalize(),2.25);
                const d=item.end.clone().sub(handleStart);
                item.shaft.position.copy(handleStart).add(item.end).multiplyScalar(.5);
                item.shaft.scale.y=d.length();
                item.shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
                item.blade.position.copy(item.end);
            }
            const wrist=flipped?4:5,elbow=flipped?2:3;
            if(type==='tennis'&&motionSample){
                racket.position.fromArray(motionSample.racketPosition);
                if(motionSample.racketRotation)racket.quaternion.fromArray(motionSample.racketRotation);
                else racket.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...motionSample.racketDirection));
            }else{
                racket.position.copy(coords[wrist]);racket.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),coords[wrist].clone().sub(coords[elbow]).normalize());
            }
        }
        let hostSize={width:host.clientWidth,height:host.clientHeight};
        let rotation=0,tilt=0,cameraTilt=0,drag=null,pinch=null;
        const pointers=new Map();
        let staticCamera=false,staticFrame=null;
        const staticCameraAvailable=()=>['rowing','tennis','clay'].includes(selectedPose().type);
        const updateStaticCameraButton=()=>{
            $('static-camera').hidden=!staticCameraAvailable();
            $('static-camera').setAttribute('aria-pressed',String(staticCamera));
            $('static-camera').textContent=staticCamera?'Static camera · On':'Static camera · Off';
        };
        $('static-camera').onclick=()=>{staticCamera=!staticCamera;staticFrame=null;updateStaticCameraButton();};
        updateStaticCameraButton();
        const canvas=renderer.domElement;
        canvas.style.touchAction='none';
        canvas.setAttribute('aria-label','Drag to rotate, drag vertically to tilt, scroll to zoom, double-click to reset the view');
        canvas.addEventListener('wheel',event=>{
            event.preventDefault();
            // Normalize mouse wheels (lines/pages) and trackpads (pixels).
            const unit=event.deltaMode===1?16:event.deltaMode===2?Math.max(hostSize.height,1):1;
            const pixels=THREE.MathUtils.clamp(event.deltaY*unit,-240,240);
            viewZoom=THREE.MathUtils.clamp(viewZoom*Math.exp(pixels*.0018),.18,4);
            if(pixels!==0)$('reset-view').hidden=false;
        },{passive:false});
        canvas.addEventListener('dblclick',resetView);
        canvas.addEventListener('pointerdown',event=>{
            if(event.pointerType==='touch'){
                pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
                canvas.setPointerCapture(event.pointerId);
                if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:viewZoom};drag=null;canvas.classList.remove('dragging');event.preventDefault();return;}
            }
            if(!event.isPrimary||event.button!==0)return;
            drag={id:event.pointerId,x:event.clientX,y:event.clientY};
            canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');event.preventDefault();
        });
        canvas.addEventListener('pointermove',event=>{
            if(pointers.has(event.pointerId))pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
            if(pinch&&pointers.size>=2){
                const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
                if(distance>0&&pinch.distance>0)viewZoom=THREE.MathUtils.clamp(pinch.zoom*pinch.distance/distance,.18,4);
                $('reset-view').hidden=false;event.preventDefault();return;
            }
            if(!drag||event.pointerId!==drag.id)return;
            if(event.clientX!==drag.x||event.clientY!==drag.y)$('reset-view').hidden=false;
            rotation+=(event.clientX-drag.x)*Math.PI*2/Math.max(hostSize.width,1);
            tilt=THREE.MathUtils.clamp(tilt+(event.clientY-drag.y)*Math.PI/Math.max(hostSize.height,1),-Math.PI/2+.08,Math.PI/2-.08);
            drag.x=event.clientX;drag.y=event.clientY;
            event.preventDefault();
        });
        const endDrag=event=>{
            pointers.delete(event.pointerId);if(pointers.size<2)pinch=null;
            if(drag&&event.pointerId===drag.id){drag=null;canvas.classList.remove('dragging');}
            if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
        };
        for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,endDrag);
        function resetView(){
            viewZoom=1;tilt=0;
            staticFrame=null;updateStaticCameraButton();
            rotation=['rowing','clay'].includes(selectedPose().type)?Math.PI/4:0;
            $('reset-view').hidden=true;
        }
        $('reset-view').onclick=resetView;
        $('rotate').onclick=()=>{rotation+=Math.PI/4;$('reset-view').hidden=false;};
        resetView();
        function setModelTheme(){
            const css=getComputedStyle(document.documentElement),color=key=>css.getPropertyValue(key).trim();
            mat.color.set(liveGroup.visible?'#dde5d6':color('--figure-body'));
            athlete.setSport(selectedPose().type,current);
            handMaterial.color.set(['yoga','stretch','gentle'].includes(selectedPose().type)?'#c0987b':selectedPose().type==='clay'?'#252b2d':selectedPose().type==='rowing'?'#ae805f':selectedPose().type==='tennis'?'#cba68e':liveGroup.visible?'#ded9ce':'#c9b79f');floor.material.color.set(color('--figure-body'));rings.material.color.set(color('--figure-joint'));
        }
        sceneApi = { setTrackingYaw(yaw){rotation=yaw;staticFrame=null;host.dataset.trackingYaw=String(yaw);}, setGender(){athlete=athletes[modelGender];Object.entries(athletes).forEach(([gender,model])=>{model.root.visible=gender===modelGender;});setModelTheme();}, setTheme:setModelTheme, setWristMode(mode){wristDetail.setMode(mode);}, setPose(id) { target = getReference(id, flipped);resetView();setModelTheme(); }, setLive(values,adjust=[]) {
            liveGroup.visible=!!values;setModelTheme();if(!values)return;
            const pts=values.map(v=>v?new THREE.Vector3(...v):null);liveJoints.forEach((m,i)=>{m.visible=!!pts[i];if(pts[i])m.position.copy(pts[i]);});
            links.forEach(([a,b],i)=>{const m=liveBones[i];m.visible=!!pts[a]&&!!pts[b];if(!m.visible)return;const d=pts[b].clone().sub(pts[a]);m.position.copy(pts[a]).add(pts[b]).multiplyScalar(.5);m.scale.y=d.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.material.color.set(adjust.includes(landmarkIds[a])||adjust.includes(landmarkIds[b])?0x854316:0x243950);});
        } }; setModelTheme(); new ResizeObserver(() => { const { width, height } = host.getBoundingClientRect();hostSize={width,height}; if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.position.z = Math.max(6.8, 4.6 / camera.aspect); camera.updateProjectionMatrix(); }).observe(host);
        let previousRender=performance.now(),lastCameraPreviewRender=-Infinity;
        renderer.setAnimationLoop(() => {const now=performance.now();if (document.hidden || host.hidden || $('rowing-correction')?.open){previousRender=now;return;}
            // During camera calibration the background demonstration must leave
            // CPU/GPU time for live inference; it has no correction work to do.
            if(stream&&selectedPose().type==='rowing'&&now-lastCameraPreviewRender<50)return;
            lastCameraPreviewRender=now;const delta=Math.min(.1,(now-previousRender)/1000);previousRender=now;
            motionSample=motionPlayer.sample();
            if(motionSample)neutralCoords.forEach((v,i)=>v.fromArray(motionSample.coords[i]));
            else neutralCoords.forEach((v,i)=>v.lerp(new THREE.Vector3(...target[i]),1-Math.exp(-10*delta)));
            coords.forEach((v,i)=>v.copy(neutralCoords[i]));
            if(selectedPose().type==='yoga')fitYogaArms(coords,current);
            if(['stretch','gentle'].includes(selectedPose().type))fitMobilityArms(coords,current,flipped);
            if(selectedPose().type==='rowing'&&!motionSample?.captured){
                const example=wristExamples[wristMode];
                for(const i of [4,5])coords[i].y+=example.wristLift;
                for(const i of [2,3])coords[i].y+=example.elbowLift;
            }
            const shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5);
            const hip=coords[6].clone().add(coords[7]).multiplyScalar(.5);
            const axis=shoulder.clone().sub(hip).normalize();
            const lateral=coords[1].clone().sub(coords[0]).normalize();
            const forward=new THREE.Vector3().crossVectors(lateral,axis).normalize();
            lateral.crossVectors(axis,forward).normalize();
            head.position.copy(shoulder).addScaledVector(axis,['yoga','stretch','gentle'].includes(selectedPose().type)?.21:.31);
            head.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(lateral,axis,forward));
            if(selectedPose().type==='stretch'&&current==='triceps'){head.position.addScaledVector(lateral,flipped?-.02:.02);head.rotateZ(flipped?.06:-.06);}
            if(motionSample?.captured){
                head.position.fromArray(motionSample.headPosition);head.quaternion.fromArray(motionSample.headRotation);
            }
            pelvis.visible=!!motionSample;pelvis.position.copy(hip);
            const hipLateral=coords[7].clone().sub(coords[6]).normalize(),hipForward=new THREE.Vector3().crossVectors(hipLateral,new THREE.Vector3(0,1,0)).normalize();
            pelvis.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(hipLateral,new THREE.Vector3(0,1,0),hipForward));if(motionSample?.captured)pelvis.quaternion.fromArray(motionSample.pelvisRotation);
            feet.forEach((foot,i)=>{foot.visible=!!motionSample;foot.position.copy(coords[10+i]).addScaledVector(hipForward,.06);foot.position.y-=.03;foot.quaternion.copy(pelvis.quaternion);if(motionSample?.toePositions){const toe=new THREE.Vector3(...motionSample.toePositions[i]);foot.position.copy(coords[10+i]).lerp(toe,.5);const direction=toe.sub(coords[10+i]).normalize();foot.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);}});
            const viewBlend=drag||(staticCamera&&staticCameraAvailable())?1:1-Math.exp(-8*delta);
            group.rotation.y += (rotation - group.rotation.y) * viewBlend;cameraTilt+=(tilt-cameraTilt)*viewBlend;updateProps();
            athlete.update(coords,motionSample,{head,pelvis,feet});
            let boundPoints=[...coords,head.position.clone().add(new THREE.Vector3(0,.2,0))];
            if(shotgun.visible)for(const x of [shootingEnvelope.min[0],shootingEnvelope.max[0]])for(const y of [shootingEnvelope.min[1],shootingEnvelope.max[1]])boundPoints.push(new THREE.Vector3(x,y,0).multiply(shotgun.scale).applyQuaternion(shotgun.quaternion).add(shotgun.position));
            if(racket.visible)for(const x of [racketEnvelope.min[0],racketEnvelope.max[0]])boundPoints.push(new THREE.Vector3(x,racketEnvelope.max[1],0).applyQuaternion(racket.quaternion).add(racket.position));
            if(hull.visible&&!motionSample?.captured)for(const item of sculls)for(const sign of [-1,1])boundPoints.push(item.end.clone().add(new THREE.Vector3(.24*sign,.06*sign,.13*sign)));
            // Fit in camera space so changing elevation cannot clip the head or hands.
            const yaw=group.rotation.y,cy=Math.cos(yaw),sy=Math.sin(yaw);
            // Freeze the framing points, while keeping manual orbit and zoom available.
            // Pose changes/reset recapture the frame; playback and seeking do not.
            const fixed=staticCamera&&staticCameraAvailable();
            if(fixed&&!staticFrame)staticFrame=boundPoints.map(p=>p.clone());
            const world=(fixed?staticFrame:boundPoints).map(p=>new THREE.Vector3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy));
            const bounds=new THREE.Box3().setFromPoints(world).expandByScalar(.16),center=bounds.getCenter(new THREE.Vector3());
            const full=$('stage').classList.contains('focus-active'),area=hostSize;
            const usableHeight=Math.max(.3,1-(full?230:190)/Math.max(area.height,1)),usableWidth=full?.88:.85;
            const ct=Math.cos(cameraTilt),st=Math.sin(cameraTilt),tan=Math.tan(34*Math.PI/360);
            let distance=.3;
            for(const point of [bounds.min,bounds.max,...world]){
                const x=point.x-center.x,y=point.y-center.y,z=point.z-center.z;
                const screenY=y*ct-z*st,depth=y*st+z*ct;
                distance=Math.max(distance,depth+Math.abs(x)/(tan*camera.aspect*usableWidth),depth+Math.abs(screenY)/(tan*usableHeight));
            }
            const desired=center.clone().add(new THREE.Vector3(0,st,ct).multiplyScalar(Math.max(.35,(distance+.12)*viewZoom)));
            if(fixed)camera.position.copy(desired);
            else camera.position.lerp(desired,drag?1:1-Math.exp(-8*delta));
            camera.lookAt(center);
            renderer.render(scene, camera) });
    } catch (e) { guideUnavailable = true; $('stage-note').hidden = false; $('stage-note').innerHTML = '3D guide could not load.<small>You can still follow the written cues or enable your camera.</small>'; $('rotate').disabled = true; }
}
initThree();
const lifecycle = new AbortController(); if (document.modelContext?.registerTool) { try { Promise.resolve(document.modelContext.registerTool({ name: 'select_stretch', description: 'Select a movement reference without activating the camera.', inputSchema: { type: 'object', properties: { id: { type: 'string', enum: poses.filter(p=>p.type!=='clay').map(p => p.id) } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (!input || typeof input.id !== 'string' || !poses.some(p => p.id === input.id&&p.type!=='clay')) throw Error('Unknown movement'); selectPose(input.id); return { selected: current, cameraActive: !!stream } } }, { signal: lifecycle.signal })).catch(() => { }); } catch { } } window.addEventListener('pagehide', () => lifecycle.abort());
