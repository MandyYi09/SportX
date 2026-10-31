import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=process.argv.includes('--calibration-only')?5192:5191,debug=process.argv.includes('--calibration-only')?9230:9229,origin=`http://127.0.0.1:${port}`;
const movement=process.argv.includes('--full')?'rowing-full':'rowing-arms';
const direct=process.argv.includes('--direct');
const calibrationOnly=process.argv.includes('--calibration-only');
const server=spawn(process.execPath,['scripts/preview.mjs','--port',String(port),'--host','127.0.0.1'],{windowsHide:true,stdio:'ignore'});
const chrome=spawn((process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'),['--headless=new','--mute-audio','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${debug}`,'--user-data-dir='+process.cwd()+'/.local/dynamic-browser-'+port,'--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',origin],{windowsHide:true,stdio:'ignore'});
let ws;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let pages;for(let i=0;i<80;i++){try{pages=await(await fetch(`http://127.0.0.1:${debug}/json/list`)).json();if(pages.some(p=>p.type==='page'))break;}catch{}await wait(250);}
 assert.ok(pages,'Chrome must start');ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map(),errors=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 ws.onmessage=async e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Fetch.requestPaused'){
  const body=`export const FilesetResolver={forVisionTasks:async()=>({})};export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>{if(globalThis.__slowPose){const end=performance.now()+350;while(performance.now()<end){}}globalThis.__updatePose?.();return {landmarks:globalThis.__pose?[__pose]:[],worldLandmarks:globalThis.__world?[__world]:[]};}})};`;
  await send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(body).toString('base64')});
 }};
 const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 async function until(expression,ms=15000){for(let i=0;i<ms/150;i++){if(await run(expression))return;await wait(150);}throw Error('Timed out: '+expression+' '+JSON.stringify(await run(`({phase:{...document.querySelector('#rowing-correction')?.dataset},prep:{...document.querySelector('#rowing-preparation')?.dataset},status:document.querySelector('[data-dynamic-status]')?.textContent,exportError:document.querySelector('.rowing-dynamic')?.dataset.exportError,title:document.querySelector('[data-phase-title]')?.textContent,note:document.querySelector('[data-phase-note]')?.textContent,metrics:document.querySelector('.rowing-metrics')?.textContent,errors:${JSON.stringify(errors)}})`)));}
 await fs.mkdir('artifacts/browser-downloads',{recursive:true});await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:process.cwd()+'/artifacts/browser-downloads'});
 await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*vision_bundle.mjs*',requestStage:'Request'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`
 globalThis.__cameraStreams=[];const cloneStream=MediaStream.prototype.clone;MediaStream.prototype.clone=function(){const s=cloneStream.call(this);__cameraStreams.push(s);return s;};
 globalThis.__recognitions=[];globalThis.SpeechRecognition=class{constructor(){__recognitions.push(this);}start(){this.active=true;queueMicrotask(()=>this.onstart?.());}abort(){this.active=false;}input(text){this.onspeechstart?.();this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:true})]});}};
 Object.defineProperty(globalThis,'speechSynthesis',{value:{speak(u){setTimeout(()=>u.onend?.(),20);},cancel(){}}});
 globalThis.__alignmentAudio=[];const mediaPlay=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this instanceof HTMLAudioElement&&this.src.includes('aligned-visible.mp3'))__alignmentAudio.push(this.src);return mediaPlay.call(this);};
 const post=Worker.prototype.postMessage;Worker.prototype.postMessage=function(data){globalThis.__analysisInput=data;this.addEventListener('message',e=>globalThis.__analysisResult=e.data);return post.call(this,data);};
 const NativeWorker=Worker;globalThis.Worker=function(url,options){
  if(String(url).includes('rowing-pose-worker.js'))return new class{
   stopped=false;postMessage(message){
    if(message.type==='init'){queueMicrotask(()=>this.onmessage?.({data:{type:'ready'}}));return;}
    globalThis.__updatePose?.();const landmarks=globalThis.__pose?structuredClone([__pose]):[],worldLandmarks=globalThis.__world?structuredClone([__world]):[];
    message.bitmap?.close();const delay=globalThis.__slowPose?350:5;
    setTimeout(()=>{if(!this.stopped)this.onmessage?.({data:{type:'result',id:message.id,landmarks,worldLandmarks,inferenceMs:delay}});},delay);
   }terminate(){this.stopped=true;}
  };
  return new NativeWorker(url,options);
 };
 navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=960;c.height=720;const ctx=c.getContext('2d'),stream=c.captureStream(15);__cameraStreams.push(stream);setInterval(()=>{ctx.fillStyle='#253b49';ctx.fillRect(0,0,960,720);ctx.fillStyle='#fff';ctx.font='24px sans-serif';ctx.fillText('Simulated rowing camera '+Date.now(),30,60);},60);return stream;};
 navigator.mediaDevices.enumerateDevices=async()=>[{kind:'videoinput',deviceId:'test',label:'Test camera'}];
 `});
 await send('Emulation.setDeviceMetricsOverride',{width:1365,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.reload',{ignoreCache:true});
 await until(`!!document.getElementById('start-rowing-correction')`);
 assert.deepEqual(await run(`[...document.querySelectorAll('[data-filter]')].map(b=>b.dataset.filter)`),['rowing','tennis','yoga','mobility']);
 const categoryLayout=await run(`[...document.querySelectorAll('[data-filter]')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y};})`);
 assert.equal(categoryLayout[0].y,categoryLayout[1].y);assert.equal(categoryLayout[2].y,categoryLayout[3].y);assert.ok(categoryLayout[2].y>categoryLayout[0].y);assert.equal(categoryLayout[0].x,categoryLayout[2].x);
 for(const category of ['tennis','yoga','mobility','rowing']){
  await run(`document.querySelector('[data-filter="${category}"]').click()`);assert.ok(await run(`document.querySelectorAll('.pose-card').length>0`));
 }
 assert.equal(await run(`document.querySelector('[data-rowing-voice]').disabled`),false,'Speech works without microphone opt-in');
 await run(`document.querySelector('[data-language="zh"]').click();document.querySelector('[data-pose="${movement}"]').click();document.getElementById('camera').click()`);
 await run(`(async()=>{
 const {rowingIds,rowingCheckpoints}=await import('./rowing-correction.mjs');const {dynamicReferenceAt:rowingReferenceAt,dynamicMotionSample:sampleCapturedMotion,dynamicReferenceDuration:capturedDuration}=await import('./rowing-reference-cycle.mjs');
 globalThis.__motion=false;globalThis.__motionAt=0;globalThis.__bad=false;globalThis.__slowPose=${calibrationOnly};
 globalThis.__updatePose=()=>{
  const pressed=document.querySelector('.rowing-checkpoints [aria-pressed=true]');const index=pressed?[...pressed.parentNode.children].indexOf(pressed):0;
  const id='${movement}',time=__motion?(rowingCheckpoints[id][0].time+(performance.now()-__motionAt)/1000)%capturedDuration(id):rowingCheckpoints[id][index].time,yaw=globalThis.__yaw??${movement==='rowing-full'?0:.8};
  const ref=rowingReferenceAt(id,time,1,yaw),source=sampleCapturedMotion(id,time).coords;
  globalThis.__pose=Array.from({length:33},(_,i)=>ref[i]?{x:.5+ref[i].x*.3,y:.78+ref[i].y*.4,visibility:.99}:{x:0,y:0,visibility:0});
  globalThis.__world=Array.from({length:33},()=>({x:0,y:0,z:0}));rowingIds.forEach((i,j)=>{const c=source[j];__world[i]={x:c[0]*Math.cos(yaw)+c[2]*Math.sin(yaw),y:-c[1],z:c[0]*Math.sin(yaw)-c[2]*Math.cos(yaw)};});
  if(__bad){__pose[15].y-=.16;__pose[16].y-=.16;__world[15].y-=.4;__world[16].y-=.4;}
  if(globalThis.__occluded){__pose[13].visibility=.1;__pose[16]={x:2,y:-1,visibility:.99};}
  if(${calibrationOnly})[__world[23],__world[24]]=[__world[24],__world[23]];
 };__updatePose();})()`);
 await until(`!document.getElementById('start-rowing-correction').disabled`);
 assert.equal(await run(`document.querySelector('#rowing-preparation').dataset.inferenceBackend`),'worker');
 assert.ok(await run(`Number(document.querySelector('#rowing-preview-skeleton').dataset.segments)>0`),'Preview must show detected skeleton before starting correction');
 assert.equal(await run(`document.querySelector('#rowing-preview-skeleton').hidden`),false);
 if(calibrationOnly){
  await run(`document.getElementById('start-rowing-correction').click()`);
  assert.equal(await run(`document.getElementById('rowing-correction').open`),true,'Normal correction opens despite slow inference and inconsistent seated hip depth');
  assert.equal(await run(`document.querySelectorAll('.rowing-checkpoints button').length`),movement==='rowing-full'?4:2);
  await run(`(()=>{const s=document.querySelector('[data-live-layout-static]');s.value='split';s.dispatchEvent(new Event('change'));})()`);await wait(150);
  assert.ok(await run(`document.querySelector('.rowing-review-columns').classList.contains('is-review')&&!document.querySelector('.rowing-expert-pane').hidden`),'Static correction supports live side-by-side expert');
  assert.equal(await run(`document.querySelector('#rowing-correction video').style.opacity`),'1');
  await run(`(()=>{const s=document.querySelector('[data-live-layout-static]');s.value='overlay';s.dispatchEvent(new Event('change'));})()`);
  assert.equal(await run(`document.querySelector('.rowing-expert-pane').hidden`),true,'Static correction can return to overlay');
  await run(`document.querySelector('#rowing-correction [data-close]').click()`);
  assert.equal(await run(`__cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))`),true,'Closing static correction releases source and clone');
  assert.equal(await run(`document.getElementById('start-rowing-correction').disabled`),true);
  await run(`document.getElementById('camera').click()`);
  await until(`!document.getElementById('start-rowing-correction').disabled`,15000);
  await run(`document.getElementById('start-rowing-dynamic').click();const s=document.querySelector('[data-live-layout]');s.value='split';s.dispatchEvent(new Event('change'));document.querySelector('[data-record]').click()`);await wait(150);
  const fixedGuide=await run(`Number(document.querySelector('#rowing-correction canvas').dataset.guideTime)`);await wait(1200);
  assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.guideTime)`),fixedGuide,'Side-by-side countdown holds the starting pose');assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.expertOpacity)`),1);
  await until(`document.getElementById('rowing-correction').dataset.dynamic==='recording'`,10000);await wait(1200);await run(`document.querySelector('[data-stop]').click()`);
  await until(`document.getElementById('rowing-correction').dataset.dynamic==='review'`,20000);
  assert.equal(await run(`__cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))`),true,'Finish releases camera hardware');
  await run(`document.querySelector('[data-reposition]').click()`);await until(`!document.querySelector('[data-reposition]').disabled&&document.querySelector('#rowing-correction video').srcObject===null`,20000);
  assert.ok(await run(`__cameraStreams.some(s=>s.active)`),'Dynamic reposition reacquires the camera');
  await run(`document.querySelector('[data-restart]').click()`);await until(`document.getElementById('rowing-correction').dataset.dynamic==='countdown'`);
  await run(`document.querySelector('#rowing-correction [data-close]').click()`);
  assert.equal(await run(`__cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))`),true,'Closing after restart releases all camera streams');
  await run(`document.getElementById('camera').click()`);await until(`!document.getElementById('start-rowing-correction').disabled`,15000);
  await run(`document.getElementById('start-rowing-correction').click();document.querySelector('[data-relocate]').click()`);
  assert.ok(await run(`__cameraStreams.some(s=>s.active)`),'Reposition keeps the camera available');
  await until(`!document.getElementById('start-rowing-correction').disabled`,15000);
  assert.deepEqual(errors,[]);console.log('PASS: static close and dynamic finish stop source/cloned cameras; static Reposition retains camera; dynamic reposition/restart reacquire it; close releases all tracks under slow inference.');
  process.exitCode=0;
 }else{
 await run(`document.getElementById('${direct?'start-rowing-dynamic':'start-rowing-correction'}').click()`);
 await until(`document.getElementById('rowing-correction').dataset.dynamic==='ready'`,35000);
 assert.equal(await run(`document.querySelector('[data-alpha]').value`),'0.7');
 assert.equal(await run(`document.querySelector('#rowing-correction [data-rowing-mirror]').getAttribute('aria-pressed')`),'true');
 assert.equal(await run(`document.querySelectorAll('.rowing-checkpoints [data-complete=true]').length`),direct?0:movement==='rowing-full'?4:2,direct?'Direct recording must skip static checkpoints':'All static frames advance automatically');
 await until(`Number(document.querySelector('#rowing-correction .pose-performance').dataset.poseFps)>0`);
 assert.ok(await run(`document.querySelector('#rowing-correction .pose-performance').textContent.includes('FPS')`));
 await run(`__occluded=true`);await wait(250);
 assert.ok(await run(`document.querySelector('#rowing-correction canvas').dataset.inferredJoints?.includes('13')`),'A briefly missing upper arm must remain as a marked inference');
 await run(`__occluded=false`);await wait(500);
 await run(`document.querySelector('[data-ghost]').click()`);assert.equal(await run(`document.querySelector('[data-ghost]').checked`),false);
 await run(`document.querySelector('#rowing-correction [data-voice-control]').click();__recognitions.at(-1).input('开始')`);
 await until(`document.getElementById('rowing-correction').dataset.dynamic==='countdown'`);
 const countdownProof=await run(`(async()=>{const c=document.querySelector('#rowing-correction canvas'),v=document.querySelector('#rowing-correction video'),origin=performance.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms)),sample=()=>({time:Number(c.dataset.guideTime),alpha:Number(c.dataset.expertOpacity)});await sleep(120);const start=sample(),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let visible=0;for(let i=0;i<p.length;i+=4)if(p[i]>p[i+1]*1.4&&p[i]>p[i+2]*1.2&&p[i+3]>180)visible++;const proof=document.createElement('canvas');proof.width=c.width;proof.height=c.height;const ctx=proof.getContext('2d');ctx.drawImage(v,0,0,c.width,c.height);ctx.drawImage(c,0,0);const image=proof.toDataURL();await sleep(Math.max(0,1050-(performance.now()-origin)));const middle=sample();await sleep(Math.max(0,2100-(performance.now()-origin)));return {start,middle,end:sample(),visible,image};})()`);
 assert.ok(countdownProof.visible>500,'The countdown expert must actually be visible at 90% opacity');assert.equal(countdownProof.start.time,countdownProof.middle.time);assert.equal(countdownProof.start.time,countdownProof.end.time);assert.equal(countdownProof.start.alpha,.9);assert.equal(countdownProof.middle.alpha,.9);assert.ok(Math.abs(countdownProof.end.alpha-.7)<.001);
 await fs.writeFile('artifacts/countdown-expert-90.png',Buffer.from(countdownProof.image.split(',')[1],'base64'));
 await run(`document.querySelector('[data-ghost]').click()`);
 await until(`document.getElementById('rowing-correction').dataset.dynamic==='recording'`,8000);
 const guideStart=await run(`Number(document.querySelector('#rowing-correction canvas').dataset.guideTime)`);await wait(400);
 const guideLater=await run(`Number(document.querySelector('#rowing-correction canvas').dataset.guideTime)`);
 assert.ok(guideLater>guideStart,'Expert guide must keep moving even while student pose is held');
 await run(`(()=>{const s=document.querySelector('[data-live-layout]');s.value='split';s.dispatchEvent(new Event('change'));})()`);await wait(200);assert.equal(await run(`document.querySelector('.rowing-expert-pane').hidden`),false);assert.equal(await run(`document.querySelector('[data-alpha]').closest('label').hidden`),true);
 await run(`(()=>{const s=document.querySelector('[data-live-layout]');s.value='overlay';s.dispatchEvent(new Event('change'));})()`);assert.equal(await run(`document.querySelector('.rowing-expert-pane').hidden`),true);
 await run(`__occluded=true`);await wait(250);await run(`__occluded=false`);
 await until(`document.querySelector('#rowing-correction canvas').dataset.visibleAligned==='true'`,5000);
 await until(`__alignmentAudio.length>0`,5000);
 assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.errorSegments)`),0,'Positive cue must not restore the full visible skeleton');
 await run(`__motion=true;__motionAt=performance.now()`);await wait(5000);
 if(movement==='rowing-full')assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.errorSegments)`),0,'Correct live pose must not show all visible bones');
 await run(`__bad=true`);await wait(movement==='rowing-full'?4000:2500);
 if(movement==='rowing-full'){
  const live=await run(`({...document.querySelector('#rowing-correction canvas').dataset})`);
  assert.ok(Number(live.errorSegments)>0,'Recording must show orange error bones immediately');
  assert.ok(Number(live.arrowCount)>0,'Recording must show correction arrows before finishing');
  assert.equal(live.arrowStyle,'dashed');assert.ok(live.arrowDirections);
  assert.equal(live.deductionCount,'0','Live practice must never show numeric deductions');
  assert.ok(await run(`document.querySelector('.rowing-take-badge').textContent.includes('Take')`));
 }
 await run(`__bad=false`);await wait(movement==='rowing-full'?15500:5500);
 await run(`__recognitions.at(-1).input('结束')`);
 await until(`document.getElementById('rowing-correction').dataset.dynamic==='review'`,30000);
 assert.equal(await run(`__cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))`),true,'Finish stops both source and cloned camera tracks');
 await until(`document.querySelector('#rowing-correction video').readyState>=2&&Math.abs(document.querySelector('#rowing-correction video').currentTime-Number(document.querySelector('[data-trim-start]').value))<.2`,10000);
 await wait(200);
 await run(`document.querySelector('.rowing-debug-tools').open=true`);
 assert.equal(await run(`document.querySelector('#rowing-correction .pose-performance').hidden`),true,'FPS is debug-only and defaults off');
 assert.equal(await run(`document.querySelector('[data-export-source]').closest('details')===null`),true,'Original video download is a normal function');
 await run(`document.querySelector('[data-show-fps]').click()`);assert.equal(await run(`document.querySelector('#rowing-correction .pose-performance').hidden`),false,'Debug FPS switch controls settlement');
 assert.equal(await run(`document.querySelector('[data-complete-skeleton]').checked`),false,'Complete skeleton is debug-only and defaults off');
 await run(`document.querySelector('[data-complete-skeleton]').click()`);await wait(150);
 assert.ok(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.skeletonSegments)>0`));
 await run(`document.querySelector('[data-complete-skeleton]').click()`);await wait(100);
 assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.skeletonSegments)`),0);
 await run(`document.querySelector('[data-export-source]').click()`);
 const source=await run(`(async()=>{const a=document.querySelector('[data-debug-download]'),b=await(await fetch(a.href)).blob(),v=document.querySelector('#rowing-correction video');return {name:a.download,type:b.type,size:b.size,same:a.href===v.src};})()`);
 assert.ok(source.same&&source.size>1000&&source.name.includes('-source.'),'Original export must download the untouched camera recording');
 await run(`document.querySelector('[data-export-data]').click()`);
 const debugText=await run(`fetch(document.querySelector('[data-debug-download]').href).then(r=>r.text())`),debugData=JSON.parse(debugText);
 assert.equal(debugData.schema,'sportx.rowing.debug');assert.equal(debugData.recording.sourceFilename,source.name);
 assert.ok(debugData.frames.some(f=>f.rawModelPose?.length===33&&f.trackedPose?.length===33&&f.inference.latencyMs>0));
 assert.ok(debugData.frames.some(f=>f.inferredJoints.length>0),'Debug export must retain raw and reconstructed occlusion evidence');
 assert.ok(debugData.frames.some(f=>f.evaluation?.assessment.metrics.some(m=>Number.isFinite(m.scoreWeight))));
 assert.equal(debugData.takes.length,await run(`document.querySelector('[data-take]').options.length`));
 await fs.writeFile('artifacts/rowing-debug-data.json',debugText);
 const summary=await run(`document.querySelector('[data-summary]').textContent`);
 const performanceSummary=await run(`({...document.querySelector('#rowing-correction .pose-performance').dataset})`);
 assert.equal(performanceSummary.measurement,'recording-timeline');assert.ok(Number(performanceSummary.poseFps)>=0);assert.ok(Number(performanceSummary.seconds)>10);
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/rowing-dynamic-analysis.json',JSON.stringify(await run(`({input:__analysisInput,result:__analysisResult})`)));
 assert.ok(await run(`document.querySelector('[data-take]').options.length>=2`),'Continuous recording must produce multiple take selections');
 if(movement==='rowing-full'){
  const scores=await run(`({total:Number(document.querySelector('[data-total-score]').dataset.totalScore),parts:document.querySelectorAll('[data-score-part]').length})`);
  assert.equal(scores.parts,4);assert.ok(scores.total>=0&&scores.total<=100);
  const choices=await run(`[...document.querySelector('[data-take]').options].map(o=>({id:o.value,score:Number(o.dataset.score)}))`);
  assert.ok(await run(`[...document.querySelectorAll('[data-take-markers] button')].every(b=>/^Take [0-9]+$/.test(b.textContent))`),'Take buttons must contain only their number');
  assert.ok(await run(`[...document.querySelector('[data-take]').options].every(o=>o.children.length===0&&o.textContent.startsWith('Take ')&&!o.textContent.includes('· Adjust')&&!/[0-9]s ·/.test(o.textContent))`),'Take option titles must remain plain short labels after issue rendering');
  assert.equal(await run(`document.querySelectorAll('select[data-take] [data-issues]').length`),0,'Issue-list selector must never match a Take option');
  assert.ok(choices.length>=2);const selected=await run(`document.querySelector('[data-take]').value`);assert.equal(choices.find(t=>t.id===selected).score,Math.max(...choices.map(t=>t.score)),'Highest score take selected by default');
  assert.ok(await run(`document.querySelectorAll('[data-keyframes] button').length>0`));
 }
 assert.ok(await run(`document.querySelector('#rowing-correction video').srcObject===null`));
 await run(`document.querySelector('[data-play]').click()`);await wait(1000);await run(`document.querySelector('[data-play]').click()`);
 assert.equal(await run(`document.querySelector('#rowing-correction .pose-performance').dataset.seconds`),performanceSummary.seconds,'Replay must use this recording, not playback performance');
 await run(`(()=>{const s=document.querySelector('[data-timeline]');s.value=1.2;s.dispatchEvent(new Event('input'));})()`);await wait(200);
 const firstSample=await run(`({...document.querySelector('#rowing-correction .pose-performance').dataset})`);
 assert.ok(Number(firstSample.sampleStart)<=1.2&&Number(firstSample.sampleEnd)>1.2);
 assert.ok(Number(firstSample.expertFps)>=0&&Number(firstSample.expertFps)<=32,'Prepared expert playback must stay within the 30 FPS display cadence');
 await run(`(()=>{const s=document.querySelector('[data-timeline]');s.value=3.2;s.dispatchEvent(new Event('input'));})()`);await wait(200);
 const laterSample=await run(`({...document.querySelector('#rowing-correction .pose-performance').dataset})`);
 assert.ok(Number(laterSample.sampleStart)<=3.2&&Number(laterSample.sampleEnd)>3.2);assert.notEqual(laterSample.sampleStart,firstSample.sampleStart);
 await run(`(()=>{const s=document.querySelector('[data-timeline]');s.value=1.2;s.dispatchEvent(new Event('input'));})()`);await wait(200);
 assert.equal(await run(`document.querySelector('#rowing-correction .pose-performance').dataset.poseFps`),firstSample.poseFps,'Backward seek must restore original recorded FPS');
 if(movement==='rowing-full'){
  await run(`(()=>{const s=document.querySelector('[data-take]'),o=[...s.options].find(o=>Number(o.dataset.issueCount)>0);if(o){s.value=o.value;s.dispatchEvent(new Event('change'));}})()`);
  assert.ok(await run(`document.querySelectorAll('ol[data-issues] button').length>0`),'Injected elbow errors must be reported');
  await run(`document.querySelector('ol[data-issues] button').click()`);await wait(500);
  assert.ok(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.arrowCount)>0`),'Paused review shows direction arrows');
  await run(`document.querySelector('[data-play]').click()`);await wait(200);
  assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.arrowCount)`),0,'Playing review hides direction arrows');
  assert.equal(await run(`document.querySelector('[data-show-arrows-playing]').checked`),false);
  await run(`document.querySelector('[data-show-arrows-playing]').click()`);await wait(100);
  assert.ok(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.arrowCount)>0`),'Playback checkbox keeps arrows visible');
  await run(`document.querySelector('[data-show-arrows-playing]').click()`);await wait(100);
  assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.arrowCount)`),0,'Unchecking restores pause-only arrows');
  await run(`document.querySelector('[data-issues] button').click()`);await wait(250);
  assert.ok(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.arrowCount)>0`),'Pausing at the issue restores direction arrows');
  assert.ok(await run(`document.querySelector('[data-current-advice-items] [data-advice-metric]')!==null`),'The current replay frame must explain its local deductions in the correction panel');
  assert.ok(await run(`document.querySelector('[data-play]').getBoundingClientRect().bottom<=document.querySelector('[data-review-feedback]').getBoundingClientRect().top`),'Playback controls must precede changing advice');
  const stableLayout=await run(`(async()=>{const panel=document.querySelector('[data-review-feedback]'),items=document.querySelector('[data-current-advice-items]'),play=document.querySelector('[data-play]'),clone=items.cloneNode(true),samples=[];for(const count of [0,12,1,30,0]){items.replaceChildren();for(let i=0;i<count;i++){const li=document.createElement('li');li.textContent='Long correction instruction with angle values and deductions '.repeat(4);items.append(li);}await new Promise(r=>requestAnimationFrame(r));samples.push({top:play.getBoundingClientRect().top,height:panel.getBoundingClientRect().height});}items.replaceChildren(...clone.childNodes);return samples;})()`);
  assert.ok(stableLayout.every(s=>Math.abs(s.top-stableLayout[0].top)<1&&s.height===240),'Advice changes must not move the Play/Pause button: '+JSON.stringify(stableLayout));
  assert.ok(await run(`!/[°→−]|角度扣分/.test(document.querySelector('[data-current-advice-items]').textContent)`),'Advice must contain instructions without angles or score deductions');
  assert.ok(await run(`(()=>{const c=document.querySelector('#rowing-correction canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]===255&&p[i+1]===207&&p[i+2]===129&&p[i+3]>240)n++;return n>20;})()`),'Error replay must draw actual correction arrows');
 }
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/rowing-dynamic-replay.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 assert.equal(await run(`document.querySelector('[data-alpha]').closest('label').hidden`),true,'Opacity is live-only');
 assert.equal(await run(`document.querySelector('#rowing-correction video').srcObject`),null);
 assert.ok(await run(`document.querySelector('.rowing-review-columns').classList.contains('is-review')`));
 assert.ok(await run(`document.querySelector('[data-play]').getBoundingClientRect().top>document.querySelector('[data-take]').getBoundingClientRect().bottom`),'Long Take selector has its own row');
 assert.ok(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.deductionCount)>0`),'Review shows localized numeric deductions');
 let exported;
 if(process.argv.includes('--controls-only')){console.log('PASS: short Take labels, pause-only arrows, playback checkbox, stable controls and camera release.');}else{
 await run(`document.querySelector('[data-trim-start]').value=${movement==='rowing-full'?5.3:1};document.querySelector('[data-trim-end]').value=${movement==='rowing-full'?7.3:3};document.querySelector('[data-trim]').click()`);
 await until(`document.getElementById('rowing-correction').dataset.dynamic==='review'&&document.querySelector('[data-take]').value==='custom-take'`,20000);
 assert.ok(await run(`document.querySelector('[data-scores]').textContent.includes('动作完成度')`));
 await run(`document.querySelector('[data-complete-skeleton]').click()`);await wait(150);
 assert.ok(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.skeletonSegments)>0`),'Enabled debug skeleton must enter the annotated export');
 // Capture the settlement at an exact planned export frame, including the same
 // ghost/opacity/mirror/arrows/deductions. The recorded FPS label is export-only.
 const settlementFrame=await run(`(async()=>{const v=document.querySelector('#rowing-correction video');v.pause();await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=Number(document.querySelector('[data-trim-start]').value)+.8;});await new Promise(r=>setTimeout(r,150));const {reviewDimensions,paintReviewFrame}=await import('./rowing-review-layout.mjs'),overlay=document.querySelector('#rowing-correction canvas'),expert=document.querySelector('.rowing-expert-pane canvas'),c=document.createElement('canvas');Object.assign(c,reviewDimensions(overlay.width,overlay.height));paintReviewFrame(c.getContext('2d'),{video:v,overlay,expert,mirrored:v.style.transform==='scaleX(-1)',language:'zh'});globalThis.__settlementPixels=c;return c.toDataURL();})()`);
 await fs.writeFile('artifacts/settlement-expected-frame.png',Buffer.from(settlementFrame.split(',')[1],'base64'));
 await run(`document.querySelector('[data-export]').click()`);
 await until(`Number(document.querySelector('[data-export-bar]').value)>0`,10000);
 assert.equal(await run(`document.querySelector('[data-export-progress]').hidden`),false);
 await until(`!document.querySelector('[data-download]').hidden`,120000);
 assert.equal(await run(`document.querySelector('[data-export-bar]').value`),100);
 exported=await run(`(async()=>{const b=await(await fetch(document.querySelector('[data-download]').href)).blob();return {size:b.size,type:b.type};})()`);assert.ok(exported.size>1000,JSON.stringify(exported));
 const mp4=await run(`MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E')||MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42001E')||MediaRecorder.isTypeSupported('video/mp4')`);
 if(mp4){assert.ok(exported.type.includes('mp4'));assert.ok(await run(`document.querySelector('[data-download]').download.endsWith('.mp4')`));assert.equal(await run(`(async()=>{const bytes=new Uint8Array(await(await fetch(document.querySelector('[data-download]').href)).arrayBuffer());return new TextDecoder().decode(bytes.slice(4,8));})()`),'ftyp','MP4 must be an actual MP4 container');}
 const fpsFrame=await run(`(async()=>{const v=document.createElement('video');v.muted=true;v.src=document.querySelector('[data-download]').href;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;v.load();});v.style.cssText='position:fixed;width:1px;height:1px;left:0;top:0';document.body.append(v);await v.play();await new Promise(resolve=>v.requestVideoFrameCallback? v.requestVideoFrameCallback(resolve):setTimeout(resolve,150));v.pause();const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');ctx.drawImage(v,0,0);const pixels=ctx.getImageData(15,55,300,23).data;let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>150&&pixels[i+1]>170&&pixels[i+2]>175)count++;v.remove();return {count,image:c.toDataURL(),width:c.width,height:c.height};})()`);
 await fs.writeFile('artifacts/export-fps-frame.png',Buffer.from(fpsFrame.image.split(',')[1],'base64'));assert.ok(fpsFrame.count>20,'Exported FPS label: '+JSON.stringify({...fpsFrame,image:undefined}));
 const encodedData=await run(`(async()=>{const blob=await(await fetch(document.querySelector('[data-download]').href)).blob();return new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result);reader.readAsDataURL(blob);});})()`);
 const encodedFile='artifacts/rowing-dual-column-export.'+(exported.type.includes('mp4')?'mp4':'webm');await fs.writeFile(encodedFile,Buffer.from(encodedData.split(',')[1],'base64'));
 const ffmpeg=(process.env.FFMPEG_PATH||'ffmpeg');
 const decoded=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-ss','0.8','-i',encodedFile,'-frames:v','1','-y','artifacts/export-matched-frame.png'],{windowsHide:true,encoding:'utf8'});assert.equal(decoded.status,0,decoded.stderr);
 const pixels=file=>{const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-i',file,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{windowsHide:true,maxBuffer:64000000});assert.equal(r.status,0,String(r.stderr));return r.stdout;};
 const actualPixels=pixels('artifacts/export-matched-frame.png'),expectedPixels=pixels('artifacts/settlement-expected-frame.png');assert.equal(actualPixels.length,expectedPixels.length);
 let pixelLoss=0,pixelCount=0;for(let y=0;y<fpsFrame.height;y+=2)for(let x=0;x<fpsFrame.width;x+=2){if(y<155&&x<380)continue;const i=(y*fpsFrame.width+x)*3;for(let k=0;k<3;k++){pixelLoss+=Math.abs(actualPixels[i+k]-expectedPixels[i+k]);pixelCount++;}}
 const meanError=pixelLoss/pixelCount;assert.ok(meanError<12,'Export must match the settlement frame: '+meanError);console.log('Settlement/export pixel mean error:',meanError);
 const ending=await run(`(async()=>{const v=document.createElement('video');v.muted=true;v.style.cssText='position:fixed;width:1px;height:1px;left:0;top:0';v.src=document.querySelector('[data-download]').href;document.body.append(v);await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=j;v.load();});await v.play();await new Promise(r=>v.requestVideoFrameCallback(r));v.pause();await new Promise(r=>{v.onseeked=r;v.currentTime=3.8;});await v.play();await new Promise(r=>v.requestVideoFrameCallback(r));v.pause();const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d');ctx.drawImage(v,0,0);const pixel=[...ctx.getImageData(20,20,1,1).data];const seconds=v.duration;v.remove();return {pixel,seconds,image:c.toDataURL()};})()`);
 assert.ok(ending.seconds>=4.2,'Export includes the 2.5-second final scorecard');assert.ok(Math.abs(ending.pixel[0]-21)<10&&Math.abs(ending.pixel[1]-33)<10,'Ending frame is the scorecard, not the camera frame');
 await fs.writeFile('artifacts/rowing-take-scorecard.png',Buffer.from(ending.image.split(',')[1],'base64'));
 assert.equal(await run(`document.querySelector('#rowing-correction .pose-performance').dataset.seconds`),performanceSummary.seconds,'Export must not overwrite the recorded performance timeline');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const mobileCategoryRows=await run(`[...document.querySelectorAll('[data-filter]')].map(b=>b.getBoundingClientRect().y)`);assert.equal(mobileCategoryRows[0],mobileCategoryRows[1]);assert.equal(mobileCategoryRows[2],mobileCategoryRows[3]);assert.ok(mobileCategoryRows[2]>mobileCategoryRows[0]);
 assert.equal(await run(`document.querySelector('#rowing-correction').scrollWidth<=document.querySelector('#rowing-correction').clientWidth+2`),true,'Mobile controls must fit');
 const savedTake=await run(`document.querySelector('[data-take]').value`);await run(`__yaw=.4;document.querySelector('[data-reposition]').click()`);
 await until(`!document.querySelector('[data-reposition]').disabled&&document.querySelector('#rowing-correction video').srcObject===null`,20000);
 assert.equal(await run(`document.querySelector('[data-take]').value`),savedTake,'Reposition preserves the existing settlement');
 assert.ok(await run(`__cameraStreams.some(s=>s.active)`),'Explicit reposition reopens the camera');
 await run(`document.querySelector('[data-restart]').click()`);await until(`document.getElementById('rowing-correction').dataset.dynamic==='countdown'`);await run(`document.querySelector('[data-stop]').click()`);assert.equal(await run(`document.getElementById('rowing-correction').dataset.dynamic`),'ready');
 await run(`document.querySelector('#rowing-correction [data-close]').click()`);assert.equal(await run(`document.querySelector('#rowing-correction').open`),false);
 assert.equal(await run(`__cameraStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))`),true,'Closing dynamic correction releases every camera track');
 }
 assert.deepEqual(errors,[]);if(!process.argv.includes('--controls-only'))console.log('PASS: best-take selection, take/keyframe timestamps, review-only deductions, custom rescoring, time stretching, scorecard export and existing recording workflows. '+summary+' '+JSON.stringify(exported));
 }
}finally{ws?.close();chrome.kill();server.kill();}
