import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=9226','--user-data-dir='+process.cwd()+'/.local/rowing-browser','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','http://127.0.0.1:5187'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 let pages;for(let i=0;i<60;i++){try{pages=await(await fetch('http://127.0.0.1:9226/json/list')).json();if(pages.some(p=>p.type==='page'))break;}catch{}await new Promise(r=>setTimeout(r,250));}
 const page=pages.find(p=>p.type==='page');ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let seq=0;const pending=new Map(),errors=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 ws.onmessage=async e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Fetch.requestPaused'){
  const body='export const FilesetResolver={forVisionTasks:async()=>({})}; export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:globalThis.__rowPose?[globalThis.__rowPose]:[],worldLandmarks:globalThis.__rowWorld?[globalThis.__rowWorld]:[]})})};';
  await send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(body).toString('base64')});
 }};
 const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 await send('Browser.grantPermissions',{permissions:['videoCapture'],origin:'http://127.0.0.1:5187'});await send('Emulation.setDeviceMetricsOverride',{width:1365,height:960,deviceScaleFactor:1,mobile:false});await send('Runtime.enable');await send('Page.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*vision_bundle.mjs*',requestStage:'Request'}]});await send('Page.reload',{ignoreCache:true});
 for(let i=0;i<80;i++){if(await run(`!!document.getElementById('start-rowing-correction')`))break;await wait(250);}
 await run(`(()=>{document.querySelector('[data-gender="male"]').click();navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=960;c.height=540;const ctx=c.getContext('2d');const stream=c.captureStream(12);const timer=setInterval(()=>{if(stream.getTracks().every(t=>t.readyState==='ended')){clearInterval(timer);return;}ctx.fillStyle='#253b49';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#617a8a';ctx.fillText('Simulated camera · '+Date.now(),20,30);},80);return stream;};navigator.mediaDevices.enumerateDevices=async()=>[{kind:'videoinput',deviceId:'test-camera',label:'Simulated camera'}];document.getElementById('camera').click();})()`);
 assert.equal(await run(`document.getElementById('rowing-correction').open`),false,'Preparation must stay outside the correction dialog');
 await run(`(async()=>{
  const {rowingReference,rowingIds,rowingCheckpoints}=await import('./rowing-correction.mjs');
  const {sampleCapturedMotion}=await import('./captured-motion.mjs');
  globalThis.__setRowAngle=degrees=>{
   const yaw=degrees*Math.PI/180,ref=rowingReference('rowing-arms',0,1,yaw),source=sampleCapturedMotion('rowing-arms',rowingCheckpoints['rowing-arms'][0].time).coords;
   globalThis.__rowPose=Array.from({length:33},(_,i)=>ref[i]?{x:.5+ref[i].x*.30,y:.8+ref[i].y*.30,visibility:.99}:{x:0,y:0,visibility:0});
   globalThis.__rowWorld=Array.from({length:33},()=>({x:0,y:0,z:0}));
   rowingIds.forEach((i,j)=>{const c=source[j];__rowWorld[i]={x:c[0]*Math.cos(yaw)+c[2]*Math.sin(yaw),y:-c[1],z:c[0]*Math.sin(yaw)-c[2]*Math.cos(yaw)};});
   // Leave both shoulders for calibration; hide one elbow/wrist and all hips/legs.
   for(const i of [14,16,23,24,25,26,27,28])__rowPose[i].visibility=0;
  };
  __setRowAngle(37);
 })()`);
 for(let i=0;i<80;i++){if(await run(`document.getElementById('rowing-preparation').dataset.phase==='ready'`))break;await wait(150);}
 assert.equal(await run(`document.getElementById('rowing-correction').open`),false,'Ready state must still be outside');
 const preparedYaw=await run(`Number(document.getElementById('rowing-preparation').dataset.yaw)`);assert.ok(Math.abs(preparedYaw-37*Math.PI/180)<.03,'Must follow an arbitrary 37 degree direction');
 await run(`document.querySelector('#rowing-preparation [data-rowing-mirror]').click()`);
 const mirroredOutside=await run(`({pressed:document.querySelector('#rowing-preparation [data-rowing-mirror]').getAttribute('aria-pressed'),camera:document.getElementById('demo-video').style.transform,model:document.getElementById('three').style.transform,ready:document.getElementById('rowing-preparation').dataset.phase})`);
 assert.deepEqual(mirroredOutside,{pressed:'true',camera:'scaleX(-1)',model:'scaleX(-1)',ready:'ready'},'Mirror must synchronize outside layers without invalidating calibration');
 await fs.writeFile('artifacts/rowing-preparation-desktop.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await run(`document.getElementById('start-rowing-correction').click()`);await wait(600);
 assert.equal(await run(`document.getElementById('rowing-correction').open`),true,'Ready outside, lock immediately on entry');
 await wait(600);
 assert.equal(await run(`document.querySelectorAll('.rowing-checkpoints button').length`),2);
 assert.equal(await run(`document.getElementById('rowing-correction').dataset.feedback`),'demonstrate');assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.expertOpacity)`),.95);assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.errorSegments)`),0);
 await fs.writeFile('artifacts/rowing-expert-demonstration.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 for(let i=0;i<60;i++){if(await run(`document.getElementById('rowing-correction').dataset.feedback!=='demonstrate'`))break;await wait(150);}
 await wait(1000);
 assert.equal(await run(`document.querySelector('.rowing-result').dataset.state`),'good','Aligned pose must have a concise green confirmation');
 assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.errorSegments`),'0','Initially aligned limbs must be hidden');
 assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.expertModel`),'male','Must render the clothed athlete model');assert.ok(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.expertTriangles)>1000`),'Must render a surface mesh');
 const alphaCheck=await run(`(()=>{const c=document.querySelector('#rowing-correction canvas'),slider=document.querySelector('[data-opacity]');slider.value='.2';slider.dispatchEvent(new Event('input'));const low=c.toDataURL();slider.value='.8';slider.dispatchEvent(new Event('input'));const high=c.toDataURL();slider.value='.45';slider.dispatchEvent(new Event('input'));return low!==high;})()`);assert.equal(alphaCheck,true,'Opacity must change the actual model overlay');

 assert.ok(Math.abs(await run(`Number(document.getElementById('three').dataset.trackingYaw)`)-preparedYaw)<.03,'The outside model must follow the prepared angle');
 assert.equal(await run(`document.getElementById('rowing-correction').dataset.locked`),'true');
 const mirrorInside=await run(`(()=>{const d=document.getElementById('rowing-correction');return {pressed:d.querySelector('[data-rowing-mirror]').getAttribute('aria-pressed'),camera:d.querySelector('video').style.transform,overlay:d.querySelector('canvas').style.transform};})()`);
 assert.deepEqual(mirrorInside,{pressed:'true',camera:'scaleX(-1)',overlay:'scaleX(-1)'},'Mirror selection must carry into correction');
 const beforeMirror=await run(`({yaw:document.querySelector('#rowing-correction canvas').dataset.expertYaw,metrics:document.querySelector('.rowing-metrics').textContent})`);
 await run(`document.querySelector('#rowing-correction [data-rowing-mirror]').click()`);
 assert.equal(await run(`document.querySelector('#rowing-correction video').style.transform`),'none');assert.equal(await run(`document.querySelector('#rowing-correction canvas').style.transform`),'none');
 assert.deepEqual(await run(`({yaw:document.querySelector('#rowing-correction canvas').dataset.expertYaw,metrics:document.querySelector('.rowing-metrics').textContent})`),beforeMirror,'Mirror must not alter locked yaw, anatomy or correction values');
 await run(`document.querySelector('#rowing-correction [data-rowing-mirror]').click()`);
 const partial=await run(`({status:document.querySelector('.rowing-status').textContent,metrics:document.querySelector('.rowing-metrics').textContent,active:document.querySelector('#rowing-correction video').srcObject?.active,overflow:document.querySelector('#rowing-correction').scrollWidth>document.querySelector('#rowing-correction').clientWidth})`);
 assert.ok(partial.metrics.includes('Left elbow'),'Partial arm must compare: '+JSON.stringify(partial));assert.ok(partial.status.includes('right wrist'));assert.equal(partial.active,true);assert.equal(partial.overflow,false);
 // Bend only the visible left elbow without rotating the shoulders or camera.
 await run(`globalThis.__goodWrist={...__rowPose[15]};__rowPose[15].y-=.16;`);await wait(1800);
 assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.errorSegments`),'2','Only the erroneous arm should be drawn');
 assert.ok(await run(`document.querySelector('[data-phase-note]').textContent.includes('elbow')`),'Explain the correction in words');
 await fs.writeFile('artifacts/rowing-correction-error.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 for(let i=0;i<100;i++){if(await run(`document.getElementById('rowing-correction').dataset.feedback==='demonstrate'`))break;await wait(150);}
 assert.equal(await run(`document.getElementById('rowing-correction').dataset.feedback`),'demonstrate','Persistent errors must restart the observation interval');assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.errorSegments`),'0');
 await run(`document.querySelectorAll('.rowing-checkpoints button')[1].click()`);assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.expertOpacity`),'0.95','Checkpoint changes reset expert emphasis');
 await run(`document.querySelectorAll('.rowing-checkpoints button')[0].click()`);
 for(let i=0;i<60;i++){if(await run(`document.getElementById('rowing-correction').dataset.feedback!=='demonstrate'`))break;await wait(150);}
 await wait(1600);
 await run(`__rowPose[15]={...__goodWrist};`);await wait(850);
 assert.ok(await run(`document.querySelector('.rowing-result').textContent.includes('Left arm corrected')`),'A corrected limb needs a brief confirmation');assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.resolvedSegments`),'2');
 await wait(1700);assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.resolvedSegments`),'0','Corrected limb skeleton must disappear');assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.errorSegments`),'0');
 await run(`__setRowAngle(90)`);await wait(1700);
 assert.equal(await run(`document.getElementById('rowing-correction').dataset.phase`),'moved');
 assert.equal(await run(`document.querySelector('.rowing-metrics').textContent`),'','No scoring from a changed direction');
 assert.equal(await run(`Number(document.querySelector('#rowing-correction canvas').dataset.expertYaw)`),preparedYaw,'Model must not rotate while locked');
 await run(`document.querySelector('[data-relocate]').click()`);assert.equal(await run(`document.getElementById('rowing-correction').open`),false,'Reposition must return outside');await wait(1400);
 const frontYaw=await run(`Number(document.getElementById('rowing-preparation').dataset.yaw)`);assert.ok(Math.abs(frontYaw-Math.PI/2)<.03,'Frontal view must rotate the model');
 await run(`document.getElementById('start-rowing-correction').click()`);await wait(600);
 assert.equal(await run(`document.querySelector('.rowing-metrics').textContent`),'','End-on arm projection must not be scored');
 await fs.writeFile('artifacts/rowing-correction-front.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await run(`__rowPose[14].visibility=.99;__rowPose[14].y-=.22;__rowPose[16]={x:__rowPose[14].x,y:-.15,visibility:.99};`);
 await wait(4400);
 assert.ok(await run(`document.querySelector('[data-phase-note]').textContent.includes('right elbow')`),'A cropped wrist must not suppress the visible right upper arm');
 assert.equal(await run(`document.querySelector('#rowing-correction .rowing-motion-arrow').dataset.direction`),'down','Raised right arm must get a downward arrow');
 assert.equal(await run(`document.querySelector('#rowing-correction .rowing-motion-arrow').dataset.joint`),'14');
 assert.ok(await run(`document.querySelector('.rowing-status').textContent.includes('right wrist (out of frame)')`),'Explain precisely which joint is missing');
 assert.equal(await run(`document.getElementById('rowing-correction').dataset.phase`),'correcting','Do not demand repositioning for a visible raised arm');
 const animation=await run(`(()=>{const t=document.querySelector('.rowing-arrow-tip');return {name:getComputedStyle(t).animationName,path:getComputedStyle(t).offsetPath,mirrored:document.querySelector('.rowing-arrows').style.transform};})()`);
 assert.ok(await run(`document.querySelector('.rowing-arrow-end').getAttribute('transform').startsWith('translate(')`),'The direction arrowhead must remain visible between animation pulses');
 assert.equal(animation.name,'rowing-arrow-travel');assert.ok(animation.path.startsWith('path('));assert.equal(animation.mirrored,'scaleX(-1)');
 await fs.writeFile('artifacts/rowing-raised-right-arm.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await run(`document.querySelector('[data-relocate]').click();__setRowAngle(37)`);await wait(1400);await run(`document.getElementById('start-rowing-correction').click()`);await wait(4200);
 await fs.writeFile('artifacts/rowing-correction-desktop.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(400);
 assert.equal(await run(`document.querySelector('#rowing-correction').scrollWidth>document.querySelector('#rowing-correction').clientWidth`),false);
 await fs.writeFile('artifacts/rowing-correction-mobile.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 await run(`globalThis.__testStream=document.querySelector('#rowing-correction video').srcObject;document.querySelector('#rowing-correction [data-close]').click()`);
 assert.equal(await run(`__testStream.getTracks().every(t=>t.readyState==='ended')`),true,'Close releases camera');
 for(const[id,count]of [['rowing-half',3],['rowing-full',4]]){
  await run(`document.querySelector('[data-pose="${id}"]').click()`);await wait(1300);await run(`document.getElementById('start-rowing-correction').click()`);assert.equal(await run(`document.querySelectorAll('.rowing-checkpoints button').length`),count);await run(`document.querySelector('#rowing-correction [data-close]').click()`);
 }
 await wait(1300);await run(`document.querySelector('[data-gender="female"]').click();document.querySelector('[data-language="zh"]').click();document.getElementById('start-rowing-correction').click()`);assert.equal(await run(`document.querySelector('#rowing-correction canvas').dataset.expertModel`),'female');assert.equal(await run(`document.querySelector('#rowing-correction h2').textContent`),'找到你的姿态');await run(`document.querySelector('#rowing-correction [data-close]').click()`);
 await run(`document.getElementById('camera').click()`);await run(`document.querySelector('[data-filter="tennis"]').click()`);assert.equal(await run(`document.getElementById('three').style.transform`),'','Rowing mirror must not affect other sports');await run(`document.querySelector('[data-filter="rowing"]').click()`);assert.equal(await run(`document.getElementById('three').style.transform`),'scaleX(-1)','Rowing mirror preference must survive movement changes');assert.equal(await run(`document.getElementById('start-rowing-correction').disabled`),true,'Stopping camera clears outside calibration');
 await run(`navigator.mediaDevices.getUserMedia=async()=>{throw Object.assign(new Error('Denied'),{name:'NotAllowedError'})};document.getElementById('camera').click()`);await wait(300);assert.equal(await run(`document.getElementById('rowing-correction').open`),false,'Camera failure must stay outside');
 console.log('PASS: cropped-wrist right-arm feedback, animated downward arrow, expert emphasis before overlay, expert-first demonstration/retry cycle, concise alignment confirmation, error-only arm overlay, corrected-arm flash then hide, synchronized outside/inside mirror, preserved locked yaw and correction values, sport isolation, outside preparation + main model rotation, immediate locked entry, explicit lock, yaw drift pause, reposition, front-view projection, end-on feedback exclusion, translucent clothed expert model, opacity, model gender, immediate modal, mocked inference + canvas video stream, partial arm feedback, desktop/mobile fit, checkpoints, localization, pending-start cancellation and stream release.');console.log('PARTIAL',partial);assert.equal(errors.length,0,JSON.stringify(errors));
 await send('Browser.close');
}finally{ws?.close();chrome.kill();}
