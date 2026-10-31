import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5194',mock=process.argv.includes('--mock');
const server=spawn(process.execPath,['scripts/preview.mjs','--port','5194','--host','127.0.0.1'],{windowsHide:true,stdio:'ignore'});
const chrome=spawn((process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'),['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=9234','--user-data-dir='+process.cwd()+'/.local/pose-worker-browser','about:blank'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 let pages;for(let i=0;i<100;i++){try{pages=await(await fetch('http://127.0.0.1:9234/json')).json();if(pages.some(p=>p.type==='page'))break;}catch{}await new Promise(r=>setTimeout(r,200));}
 assert.ok(pages,'Chrome must start');ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 await send('Page.enable');await send('Page.navigate',{url:origin});await new Promise(r=>setTimeout(r,1200));
 const mockModule='data:text/javascript,'+encodeURIComponent(`export const FilesetResolver={forVisionTasks:async()=>({})};export const PoseLandmarker={createFromOptions:async()=>({detectForVideo(){const end=performance.now()+200;while(performance.now()<end){}return {landmarks:[[{x:.5,y:.5,z:0,visibility:1}]],worldLandmarks:[[{x:0,y:0,z:0}]]};}})};`);
 const imagePath=process.argv.slice(2).find(a=>!a.startsWith('--'));if(!mock&&!imagePath)throw Error('Pass a sample image path, or use --mock.');
 const frame=imagePath?(await fs.readFile(imagePath)).toString('base64'):null;
 const response=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{
  const {createRowingPoseDetector}=await import('./rowing-pose-client.mjs');
  const {rowingPhaseObservable}=await import('./rowing-dynamic.mjs');
  const detector=await createRowingPoseDetector(${mock?`{moduleUrl:${JSON.stringify(mockModule)}}`:process.argv.includes('--gpu')?"{timeoutMs:45000,delegate:'GPU'}":'{timeoutMs:45000}'});
  const image=${frame?`new Image()`: `document.createElement('canvas')`};${frame?`image.src='data:image/jpeg;base64,${frame}';await image.decode();`:`image.width=640;image.height=480;`}
  let ticks=0;const timer=setInterval(()=>ticks++,10);let results=[];
  try{for(let i=0;i<3;i++){const r=await detector.detectForVideo(image,performance.now());results.push({inferenceMs:r.inferenceMs,people:r.landmarks.length,joints:r.landmarks[0]?.length,fullStrokeObservable:rowingPhaseObservable('rowing-full',{pose:r.landmarks[0]})});}return {backend:detector.backend,ticks,results};}
  finally{clearInterval(timer);detector.close();}
 })()`});
 if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));
 const result=response.result.value;assert.equal(result.backend,'worker');assert.ok(result.ticks>5,'Main thread must keep running during inference');assert.ok(result.results.every(r=>r.people===1),'Uploaded sample must produce a pose');
 if(mock)assert.ok(result.results.every(r=>r.inferenceMs>=195));
 if(!mock)assert.ok(result.results.some(r=>r.fullStrokeObservable===true),'Visible upper-body joints in full stroke must remain assessable');
 console.log('PASS: '+(mock?'200 ms blocking inference fixture':'actual MediaPipe on provided video frame')+' runs in a real worker; UI heartbeat continues. '+JSON.stringify(result));
}finally{ws?.close();chrome.kill();server.kill();}
