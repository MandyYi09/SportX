import {prepareLandmarks,isSidePose,isUpperPose,requiredLandmarks} from './tracking-view.mjs';
import { PosePresence } from './pose-presence.mjs';
import { createFocusView } from './focus-view.mjs';
import { evaluate } from './pose-rules.mjs';
import { getReference, landmarkIds } from './reference.mjs';
import { comparePose, projectReference, normalizedLive } from './comparison.mjs';
const $ = id => document.getElementById(id);
import { poses } from './exercises.mjs';
import { categoryLabels, practiceModes, sequenceFor } from './practice-modes.mjs';
import {createHand, orientHand, createWristDetail, wristExamples} from './hand-guide.mjs';
import {setLanguage, registerPoseTranslations, startLocalization, refreshLocalization} from './i18n.mjs';
const selectedPose = () => poses.find(p => p.id === current);
const framing = id => isUpperPose(id) ? 'Face the camera with shoulders, elbows, wrists and hips visible. Feet can stay out of frame.' : isSidePose(id) ? 'Turn side-on with your whole body visible.' : 'Face the camera with your whole body visible.';
const presence = new PosePresence();
const focusView = createFocusView($('stage'),()=>{presence.dismiss();focusView.setExpanded(false);});
let lastPoseFrame=0;
let flipped = false;
let wristMode = 'aligned';
let guideUnavailable = false;
let mobilityMode = 'stretch';
const activeCategory = () => filter === 'mobility' ? mobilityMode : filter;
let current = 'reach', filter = 'all', stream = null, landmarker = null, starting = false, runId = 0, lastVideo = -1, lastDetect = 0, lastFeedback = 0, remaining = 30, timerId = null, sceneApi = null;
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
 const category=activeCategory();
 document.documentElement.dataset.theme=filter==='all'?'all':filter==='mobility'?'mobility':category;
 sceneApi?.setTheme();
 const shown=poses.filter(p => category === 'all' || p.type === category);
 $('mobility-modes').hidden=filter!=='mobility';
 document.querySelectorAll('[data-mobility]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mobility===mobilityMode)));
 $('movement-count').textContent=`${shown.length} movements`;
 $('category-intro').hidden=!practiceModes[category];
 $('category-intro').textContent=practiceModes[category]?.title || '';
 $('poses').innerHTML=shown.map(p => `<button class="pose-card ${p.id === current ? 'active' : ''}" data-pose="${p.id}" aria-pressed="${p.id === current}"><span class="pose-icon" aria-hidden="true">${p.icon}</span><span><strong>${p.name}</strong><small>${categoryLabels[p.type]} · ${p.demoOnly ? 'Demo' : (p.hold || 30)+' sec'}</small></span><span class="arrow">↗</span></button>`).join('');
 document.querySelectorAll('[data-pose]').forEach(b => b.onclick=() => selectPose(b.dataset.pose));
}
function selectPose(id, keepSide=false) {
 const p=poses.find(p=>p.id===id); if(!p)throw Error('Unknown movement');
 if(stream && selectedPose().demoOnly !== p.demoOnly)stopCamera();
 if(!p.wristStudy || !selectedPose().wristStudy)wristMode='aligned';
 current=id; if(!keepSide)flipped=false; stopTimer(); remaining=p.hold || 30; updateTimer();
 $('hold-duration').textContent=p.demoOnly ? 'Step by step' : remaining+' sec';
 $('duration-label').textContent=p.demoOnly ? 'At your own pace' : p.type==='gentle' ? 'Optional practice time' : 'Suggested hold';
 $('pose-tag').textContent=`${categoryLabels[p.type].toUpperCase()} · ${p.area}`;
 $('pose-name').textContent=p.name; $('pose-description').textContent=p.description;
 $('pose-level').textContent=p.level || 'Easy';
 $('angle-label').textContent=p.demoOnly ? '↔ Rotate to explore this step' : isUpperPose(id) ? '↔ Front camera · upper body' : isSidePose(id) ? '↔ Side-on camera · full body' : '↔ Face your camera';
 $('camera-setup').textContent=p.demoOnly ? 'Place your camera where your body and hands are visible. Live preview only; no technique scoring.' : 'Camera setup: '+framing(id);
 $('stage-note').hidden=!guideUnavailable || !!stream;
 $('reference-label').textContent=p.demoOnly ? 'Illustrative 3D movement study' : isUpperPose(id) ? '3D reference · upper-body estimate' : '3D reference · 2D pose estimate';
 $('cues').innerHTML=p.cues.map((c,i)=>`<div class="cue"><span>${i+1}</span>${c}</div>`).join('');
 $('wrist-study').hidden=!p.wristStudy;
 $('cue-heading').textContent=p.demoOnly ? 'Explore this step' : 'Move comfortably';
 const mode=practiceModes[p.type]; $('practice-note').hidden=!mode;
 $('practice-note-text').textContent=mode?.note || ''; $('practice-source').textContent=mode?.sourceLabel || ''; $('practice-source').hidden=!mode?.source; if(mode?.source)$('practice-source').href=mode.source;
 const sequence=sequenceFor(id); $('sequence').hidden=!sequence.length;
 $('sequence-title').textContent=mode?.title || ''; $('sequence-count').textContent=sequence.length ? `${sequence.findIndex(x=>x.id===id)+1} / ${sequence.length}` : '';
 $('sequence-steps').replaceChildren();
 sequence.forEach((step,i)=>{const b=document.createElement('button'); b.textContent=`${i+1}. ${step.name}`;b.setAttribute('aria-pressed',String(step.id===id));b.onclick=()=>{selectPose(step.id,true);$('sequence-steps').children[i].focus({preventScroll:true});};$('sequence-steps').append(b);});
 $('timer-panel').hidden=$('timer-note').hidden=!!p.demoOnly;
 $('timer-label').textContent=p.type==='gentle' ? 'MOVE AT YOUR PACE' : 'COMFORTABLE HOLD';
 $('timer-note').textContent=p.type==='gentle' ? 'An optional timer. Move slowly and rest whenever you need to.' : 'A manual timer. Release sooner if you need to.';
 $('camera').disabled=starting; $('camera').textContent=stream ? 'Stop camera' : '▣ Enable camera';
 $('camera-title').textContent=p.demoOnly ? 'Practice with a live preview.' : 'Your space. Your pace.';
 $('camera-sub').textContent=p.demoOnly ? stream ? 'Your camera is beside the 3D guide. No technique scoring.' : 'Enable camera to see yourself beside the 3D guide. No technique scoring.' : stream ? framing(id) : 'Enable your camera for an approximate body-shape comparison.';
 $('show-camera').hidden=document.querySelector('.comparison-panel').hidden=!!p.demoOnly;
 drawCards();sceneApi?.setPose(id);setWristMode(wristMode); $('switch-side').hidden=!(p.asymmetric || ['side','warrior'].includes(id));
 clearComparison();
 setFeedback({state:'unknown',title:p.demoOnly ? stream ? 'Live preview · no score' : 'Movement study' : stream ? 'Find your starting position' : 'Ready when you are',text:p.demoOnly ? stream ? 'Use the live preview to observe yourself. The illustrated guide does not assess your technique.' : 'Use the numbered steps to inspect each position. You can enable camera for self-observation without scoring.' : stream ? framing(id) : 'You can follow the guide without a camera, or enable it for body-shape feedback.'});
}
function setFeedback(r) { $('focus-feedback').textContent=r.title+' — '+r.text; document.querySelector('.feedback').className = `feedback ${r.state}`; $('feedback-title').textContent = r.title; $('feedback-text').textContent = r.text; $('feedback-icon').textContent = r.state === 'good' ? '✓' : r.state === 'warning' ? '↗' : '◌'; }
document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => {
 filter=b.dataset.filter;
 document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});
 const category=activeCategory();
 if(category!=='all' && selectedPose().type!==category)selectPose(poses.find(p=>p.type===category).id);else drawCards();
});
document.querySelectorAll('[data-mobility]').forEach(button=>button.onclick=()=>{
 mobilityMode=button.dataset.mobility;
 if(selectedPose().type!==mobilityMode)selectPose(poses.find(p=>p.type===mobilityMode).id);else drawCards();
});
$('help').onclick = () => $('help-dialog').showModal(); $('close-help').onclick = $('got-it').onclick = () => $('help-dialog').close();
function updateTimer() { $('time').textContent = `00:${String(remaining).padStart(2, '0')}`; }
function stopTimer() { clearInterval(timerId); timerId = null; $('timer').textContent = '▶'; $('timer').setAttribute('aria-label', 'Start hold timer'); }
$('timer').onclick = () => { if (timerId) { stopTimer(); return } if (!remaining) remaining = poses.find(p=>p.id===current)?.hold || 30; $('timer').textContent = 'Ⅱ'; $('timer').setAttribute('aria-label', 'Pause hold timer'); timerId = setInterval(() => { remaining--; updateTimer(); if (!remaining) { stopTimer(); setFeedback({ state: 'unknown', title: 'Take a breath', text: 'Release gently. Rest or switch sides when you’re ready.' }) } }, 1000); };
function stopCamera() {
 presence.reset(); focusView.setExpanded(false); runId++;
 stream?.getTracks().forEach(track => track.stop()); stream = null;
 $('tracking-video').pause();
 $('tracking-video').srcObject = $('video').srcObject = $('demo-video').srcObject = null;
 $('video').hidden = $('overlay').hidden = true;
 $('demo-camera').hidden = true; $('stage-layout').classList.remove('with-preview');
 $('three').hidden = false; $('stage-note').hidden = !guideUnavailable; $('rotate').hidden = false;
 $('stage').classList.remove('live'); $('show-camera').disabled = true; $('camera-dialog').close();
 clearComparison(); $('mode').textContent = '○   REFERENCE PREVIEW'; $('camera').textContent = '▣   Enable camera';
 $('camera-title').textContent = selectedPose().demoOnly ? 'Practice with a live preview.' : 'Your space. Your pace.';
 $('camera-sub').textContent = selectedPose().demoOnly ? 'Enable camera to see yourself beside the 3D guide. No technique scoring.' : 'Enable your camera to get live alignment cues.';
 stopTimer(); setFeedback({state:'unknown',title:'Camera is off',text:'Your reference guide is ready. You can restart whenever you like.'});
}
$('camera').onclick = async () => {
    if (stream) { stopCamera(); return } if (starting) return;
    const openingDemo = !!selectedPose().demoOnly;
    starting = true; $('camera').disabled = true; $('camera').textContent = 'Connecting…';
    try {
        if (!navigator.mediaDevices?.getUserMedia) throw Error('Camera access requires HTTPS or localhost in a supported browser.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
        if (openingDemo !== !!selectedPose().demoOnly) { stopCamera(); return; }
        stream.getVideoTracks()[0].onended = () => { if (stream) stopCamera(); };
        if (openingDemo) {
            $('demo-video').srcObject = stream; await $('demo-video').play();
            if (!stream || !selectedPose().demoOnly) { stopCamera(); return; }
            $('demo-camera').hidden = false; $('stage-layout').classList.add('with-preview');
            $('camera').textContent = 'Stop camera'; $('camera-title').textContent = 'Practice with a live preview.';
            $('camera-sub').textContent = 'Your camera is beside the 3D guide. No technique scoring.';
            setFeedback({state:'unknown',title:'Live preview · no score',text:'Observe your movement beside the illustration. Ask your coach to review technique.'});
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
        $('camera').textContent = 'Stop camera'; $('camera-title').textContent = 'Make yourself comfortable.'; $('camera-sub').textContent = framing(current);
        lastVideo = -1; const token = ++runId; requestAnimationFrame(t => track(t, token));
    } catch (e) {
        stopCamera();
        const msg = e.name === 'NotAllowedError' ? 'Camera permission was declined. Allow access in your browser and try again.' : e.name === 'NotFoundError' ? 'No camera was found. Connect a camera and try again.' : e.message || 'Could not start tracking. Check your connection and try again.';
        $('camera-sub').textContent = msg; setFeedback({state:'warning',title:'Camera could not start',text:msg});
    } finally { starting = false; $('camera').disabled = false; }
};
$('demo-camera-stop').onclick = stopCamera;
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
 $('match-status').textContent=selectedPose().type==='rowing' && wristMode!=='aligned' ? 'Comparison example · not a target' : selectedPose().demoOnly ? 'Demonstration · no score' : result?.quality?.label || 'Waiting for a clear pose';
 $('comparison-status').textContent=result ? 'Your angles / reference angles' : isUpperPose(current) ? 'Upper-body tracking needed to compare' : 'Full-body tracking needed to compare';
 $('comparison-metrics').replaceChildren();
 for(const row of result?.metrics || []) {
  const el=document.createElement('div');el.className='metric '+(row.close?'close-match':'adjust');
  const label=document.createElement('span');label.textContent=row.label;
  const value=document.createElement('strong');value.textContent=`${Math.round(row.actual)}° / ${Math.round(row.target)}° ${row.close?'✓':'↗'}`;
  el.append(label,value);$('comparison-metrics').append(el);
 }
}
$('focus-camera').onclick=()=>$('camera-dialog').showModal();
$('focus-stop').onclick=()=>stopCamera();
setInterval(()=>{if(stream && performance.now()-lastPoseFrame>500){focusView.setExpanded(presence.update(false,performance.now()));sceneApi?.setLive(null);renderComparison(null);}},250);
$('show-camera').onclick=()=>$('camera-dialog').showModal();
$('close-camera').onclick=()=>$('camera-dialog').close();
$('switch-side').onclick=()=>{flipped=!flipped;sceneApi?.setPose(current);clearComparison();};
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
document.querySelectorAll('[data-language]').forEach(button => button.onclick = () => {
 setLanguage(button.dataset.language);
 document.querySelectorAll('[data-language]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
 refreshLocalization();
});
selectPose('reach');
startLocalization();
async function initThree() {
    try {
        const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'); const host = $('three'); const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(34, 1, .1, 100); camera.position.set(0, 1.65, 6.8); camera.lookAt(0, 1.15, 0); const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; host.append(renderer.domElement); scene.add(new THREE.HemisphereLight(0xffffff, 0x6f7d59, 2.5)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-3, 5, 4); scene.add(light); const group = new THREE.Group(); scene.add(group); const mat = new THREE.MeshStandardMaterial({ color: 0x6c8058, roughness: .65, metalness: .05 }); const jointmat = new THREE.MeshStandardMaterial({ color: 0xd8ecad, roughness: .55 }); const headmat = new THREE.MeshStandardMaterial({ color: 0x869974, roughness: .55 }); const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 80), new THREE.MeshBasicMaterial({ color: 0xafbda1, transparent: true, opacity: .28 })); floor.rotation.x = -Math.PI / 2; floor.position.y = .02; scene.add(floor); const rings = new THREE.Mesh(new THREE.RingGeometry(1.18, 1.19, 100), new THREE.MeshBasicMaterial({ color: 0x96aa81, side: THREE.DoubleSide, transparent: true, opacity: .5 })); rings.rotation.x = -Math.PI / 2; rings.position.y = .03; scene.add(rings);
        const links = [[0, 1], [0, 2], [2, 4], [1, 3], [3, 5], [0, 6], [1, 7], [6, 7], [6, 8], [8, 10], [7, 9], [9, 11]]; let target = getReference(current, flipped), neutralCoords = target.map(p => new THREE.Vector3(...p)), coords = neutralCoords.map(p=>p.clone()); const joints = coords.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(.075, 20, 16), jointmat); group.add(m); return m }); const bones = links.map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.058, .067, 1, 16), mat); group.add(m); return m }); const head = new THREE.Mesh(new THREE.SphereGeometry(.145, 32, 24), headmat); head.scale.y = 1.18; group.add(head); const neck = new THREE.Mesh(new THREE.CylinderGeometry(.055, .07, .18, 16), mat); group.add(neck); const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat); torso.scale.set(.22, .35, .12); group.add(torso); const liveGroup=new THREE.Group();group.add(liveGroup);liveGroup.visible=false;
        const liveBones=links.map(()=>{const material=new THREE.MeshBasicMaterial({color:0x243950,depthTest:false});const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,1,10),material);mesh.renderOrder=3;liveGroup.add(mesh);return mesh;});
        const liveJoints=landmarkIds.map(()=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.038,12,10),new THREE.MeshBasicMaterial({color:0x243950,depthTest:false}));mesh.renderOrder=4;liveGroup.add(mesh);return mesh;});
        const handMaterial=new THREE.MeshStandardMaterial({color:0x91a979,roughness:.65});
        const wristMaterial=new THREE.MeshStandardMaterial({color:0xd8ecad,roughness:.55});
        const hands=[-1,1].map(side=>{const hand=createHand(THREE,handMaterial,side);group.add(hand.root);return {...hand,side,gripPoint:new THREE.Vector3()};});
        const wristDetail=createWristDetail(THREE,$('wrist-detail'));wristDetail.setMode(wristMode);
        const propMaterial=new THREE.MeshStandardMaterial({color:0x9c8060,roughness:.8});
        const chairGroup=new THREE.Group();group.add(chairGroup);
        const seat=new THREE.Mesh(new THREE.BoxGeometry(.67,.07,.62),propMaterial);seat.position.set(0,.64,.08);chairGroup.add(seat);
        const back=new THREE.Mesh(new THREE.BoxGeometry(.67,.49,.055),propMaterial);back.position.set(0,1.03,-.23);chairGroup.add(back);
        for(const x of [-.27,.27])for(const z of [-.18,.32]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.59,10),propMaterial);leg.position.set(x,.32,z);chairGroup.add(leg);}
        const sculls=[-1,1].map(side=>{
            const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,1,12),propMaterial);group.add(shaft);
            const blade=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),new THREE.MeshStandardMaterial({color:side<0?0xc2d8e1:0xe7d9b7,roughness:.6}));blade.scale.set(.23,.055,.12);group.add(blade);
            return {side,shaft,blade,end:new THREE.Vector3()};
        });
        const hull=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),new THREE.MeshStandardMaterial({color:0x9cb5ae,roughness:.8}));hull.scale.set(1.05,.08,.21);hull.position.set(-.2,.52,0);group.add(hull);
        const racket=new THREE.Group();group.add(racket);
        const grip=new THREE.Mesh(new THREE.CylinderGeometry(.026,.026,.28,12),propMaterial);grip.position.y=.14;racket.add(grip);
        const rim=new THREE.Mesh(new THREE.TorusGeometry(.18,.014,8,36),mat);rim.scale.y=1.3;rim.position.y=.5;racket.add(rim);
        const strings=new THREE.Mesh(new THREE.CircleGeometry(.165,24),new THREE.MeshBasicMaterial({color:0x7c8e70,transparent:true,opacity:.22,side:THREE.DoubleSide}));strings.scale.y=1.3;strings.position.y=.5;racket.add(strings);
        // Stylized exterior prop only; no working mechanism or aiming simulation.
        const shotgun=new THREE.Group();group.add(shotgun);
        const gunWood=new THREE.MeshStandardMaterial({color:0x95633f,roughness:.75});
        const gunMetal=new THREE.MeshStandardMaterial({color:0x49545c,roughness:.48,metalness:.25});
        const gunPart=(geometry,material,x,y=0)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,0);shotgun.add(mesh);return mesh;};
        const stock=gunPart(new THREE.BoxGeometry(.42,.16,.085),gunWood,-.27,-.025);stock.rotation.z=.1;
        gunPart(new THREE.BoxGeometry(.035,.18,.1),gunMetal,-.49,-.045);
        gunPart(new THREE.BoxGeometry(.25,.10,.085),gunMetal,.04);
        gunPart(new THREE.BoxGeometry(.38,.08,.105),gunWood,.52,-.025);
        for(const y of [.025,.073]){const barrel=gunPart(new THREE.CylinderGeometry(.023,.023,1.02,16),gunMetal,.76,y);barrel.rotation.z=Math.PI/2;}
        function updateProps(){
            const type=selectedPose().type;chairGroup.visible=type==='gentle';hull.visible=type==='rowing';racket.visible=type==='tennis';
            shotgun.visible=type==='clay';
            for(const hand of hands){
                const w=hand.side<0?4:5,e=hand.side<0?2:3;
                const showHands=type==='rowing'||type==='clay';
                hand.root.visible=showHands;joints[w].scale.setScalar(showHands?.6:1);
                joints[w].material=showHands?wristMaterial:jointmat;
                if(!showHands)continue;
                const direction=coords[w].clone().sub(coords[e]);
                if(type==='rowing' && wristExamples[wristMode].keepGrip){
                    const neutralDirection=neutralCoords[w].clone().sub(neutralCoords[e]).normalize();
                    direction.copy(neutralCoords[w]).addScaledVector(neutralDirection,.16).sub(coords[w]);
                }
                hand.gripPoint.copy(orientHand(THREE,hand,coords[w],direction));
            }
            if(shotgun.visible){
                const rear=hands[flipped?0:1].gripPoint,front=hands[flipped?1:0].gripPoint;
                const x=front.clone().sub(rear),length=x.length();x.normalize();
                const up=Math.abs(x.y)>.95?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0);
                const z=new THREE.Vector3().crossVectors(x,up).normalize(),y=new THREE.Vector3().crossVectors(z,x).normalize();
                shotgun.position.copy(rear);shotgun.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
                shotgun.scale.set(length/.52,1,1);
            }
            wristMaterial.color.set(wristMode==='aligned'?0xd8ecad:0xe6b878);
            for(const item of sculls){
                item.shaft.visible=item.blade.visible=type==='rowing';
                if(type!=='rowing')continue;
                const hand=hands[item.side<0?0:1].gripPoint;
                const handleStart=hand.clone().add(new THREE.Vector3(0,0,-item.side*.09));
                // These visual oars are illustrative props, not tracked blade positions.
                const lift=current==='rowing-recovery'?.2:current==='rowing-finish'?.06:-.2;
                item.end.copy(hand).add(new THREE.Vector3(-.22,lift,item.side*1.48));
                const d=item.end.clone().sub(handleStart);
                item.shaft.position.copy(handleStart).add(item.end).multiplyScalar(.5);
                item.shaft.scale.y=d.length();
                item.shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
                item.blade.position.copy(item.end);
            }
            const wrist=flipped?4:5,elbow=flipped?2:3;
            racket.position.copy(coords[wrist]);racket.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),coords[wrist].clone().sub(coords[elbow]).normalize());
        }
        const savedViews=new Map();
        let rotation=0;
        function chooseView(view){savedViews.set(current,view);const native=isSidePose(current)?'side':'front';rotation=view==='three-quarter'?Math.PI/4:view===native?0:Math.PI/2;document.querySelectorAll('[data-model-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.modelView===view)));}
        document.querySelectorAll('[data-model-view]').forEach(b=>b.onclick=()=>chooseView(b.dataset.modelView));
        $('rotate').onclick=()=>{rotation+=Math.PI/4;document.querySelectorAll('[data-model-view]').forEach(b=>b.setAttribute('aria-pressed','false'));};
        chooseView(isSidePose(current)?'side':'front');
        function setModelTheme(){
            const css=getComputedStyle(document.documentElement),color=key=>css.getPropertyValue(key).trim();
            mat.color.set(liveGroup.visible?'#dde5d6':color('--figure-body'));
            jointmat.color.set(liveGroup.visible?'#f0f4e9':color('--figure-joint'));
            headmat.color.set(liveGroup.visible?'#e5ebdf':color('--figure-head'));
            handMaterial.color.set(color('--figure-head'));floor.material.color.set(color('--figure-body'));rings.material.color.set(color('--figure-joint'));
        }
        sceneApi = { setTheme:setModelTheme, setWristMode(mode){wristDetail.setMode(mode);}, setPose(id) { target = getReference(id, flipped);chooseView(savedViews.get(id)||(['rowing','clay'].includes(selectedPose().type)?'three-quarter':isSidePose(id)?'side':'front')); }, setLive(values,adjust=[]) {
            liveGroup.visible=!!values;setModelTheme();if(!values)return;
            const pts=values.map(v=>v?new THREE.Vector3(...v):null);liveJoints.forEach((m,i)=>{m.visible=!!pts[i];if(pts[i])m.position.copy(pts[i]);});
            links.forEach(([a,b],i)=>{const m=liveBones[i];m.visible=!!pts[a]&&!!pts[b];if(!m.visible)return;const d=pts[b].clone().sub(pts[a]);m.position.copy(pts[a]).add(pts[b]).multiplyScalar(.5);m.scale.y=d.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.material.color.set(adjust.includes(landmarkIds[a])||adjust.includes(landmarkIds[b])?0x854316:0x243950);});
        } }; setModelTheme(); new ResizeObserver(() => { const { width, height } = host.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.position.z = Math.max(6.8, 4.6 / camera.aspect); camera.updateProjectionMatrix(); }).observe(host);
        renderer.setAnimationLoop(() => { if (document.hidden || host.hidden) return; neutralCoords.forEach((v,i)=>v.lerp(new THREE.Vector3(...target[i]),.08));
            coords.forEach((v,i)=>v.copy(neutralCoords[i]));
            if(selectedPose().type==='rowing'){
                const example=wristExamples[wristMode];
                for(const i of [4,5])coords[i].y+=example.wristLift;
                for(const i of [2,3])coords[i].y+=example.elbowLift;
            }
            coords.forEach((v,i)=>joints[i].position.copy(v)); links.forEach(([a, b], i) => { const d = new THREE.Vector3().subVectors(coords[b], coords[a]); bones[i].position.copy(coords[a]).add(coords[b]).multiplyScalar(.5); bones[i].scale.y = d.length(); bones[i].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()) }); const shoulder = coords[0].clone().add(coords[1]).multiplyScalar(.5); const hip=coords[6].clone().add(coords[7]).multiplyScalar(.5);const axis=shoulder.clone().sub(hip).normalize();head.position.copy(shoulder).addScaledVector(axis,.31);neck.position.copy(shoulder).addScaledVector(axis,.12);head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);neck.quaternion.copy(head.quaternion); torso.position.copy(shoulder).add(coords[6].clone().add(coords[7]).multiplyScalar(.5)).multiplyScalar(.5); torso.rotation.z = -Math.atan2((coords[0].x+coords[1].x-coords[6].x-coords[7].x)/2,(coords[0].y+coords[1].y-coords[6].y-coords[7].y)/2); group.rotation.y += (rotation - group.rotation.y) * .06;updateProps();
            const boundPoints=[...coords,head.position.clone().add(new THREE.Vector3(0,.2,0))];
            if(shotgun.visible)for(const x of [-.52,1.30])for(const y of [-.15,.13])boundPoints.push(new THREE.Vector3(x,y,0).multiply(shotgun.scale).applyQuaternion(shotgun.quaternion).add(shotgun.position));
            if(racket.visible)boundPoints.push(new THREE.Vector3(0,.75,0).applyQuaternion(racket.quaternion).add(racket.position));
            if(hull.visible)for(const item of sculls)for(const sign of [-1,1])boundPoints.push(item.end.clone().add(new THREE.Vector3(.24*sign,.06*sign,.13*sign)));
            const minY=Math.min(...boundPoints.map(v=>v.y))-.12,maxY=Math.max(...boundPoints.map(v=>v.y))+.12;
            const projected=boundPoints.map(v=>v.x*Math.cos(group.rotation.y)+v.z*Math.sin(group.rotation.y));
            const minX=Math.min(...projected)-.18,maxX=Math.max(...projected)+.18;
            const full=$('stage').classList.contains('focus-active');
            const area=host.getBoundingClientRect();
            const usableHeight=Math.max(.3,1-(full?230:190)/Math.max(area.height,1));
            const usableWidth=full?.88:.85;
            const nearDepth=Math.max(0,...boundPoints.map(v=>-v.x*Math.sin(group.rotation.y)+v.z*Math.cos(group.rotation.y)));
            const distance=Math.max((maxY-minY)/(2*Math.tan(34*Math.PI/360)*usableHeight),(maxX-minX)/(2*Math.tan(34*Math.PI/360)*camera.aspect*usableWidth))+nearDepth+.12;
            const centerY=(minY+maxY)/2;
            camera.position.lerp(new THREE.Vector3((minX+maxX)/2,centerY,distance),.12);camera.lookAt(camera.position.x,centerY,0);
            renderer.render(scene, camera) });
    } catch (e) { guideUnavailable = true; $('stage-note').hidden = false; $('stage-note').innerHTML = '3D guide could not load.<small>You can still follow the written cues or enable your camera.</small>'; $('rotate').disabled = true; }
}
initThree();
const lifecycle = new AbortController(); if (document.modelContext?.registerTool) { try { Promise.resolve(document.modelContext.registerTool({ name: 'select_stretch', description: 'Select a movement reference without activating the camera.', inputSchema: { type: 'object', properties: { id: { type: 'string', enum: poses.map(p => p.id) } }, required: ['id'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (!input || typeof input.id !== 'string' || !poses.some(p => p.id === input.id)) throw Error('Unknown movement'); selectPose(input.id); return { selected: current, cameraActive: !!stream } } }, { signal: lifecycle.signal })).catch(() => { }); } catch { } } window.addEventListener('pagehide', () => lifecycle.abort());
