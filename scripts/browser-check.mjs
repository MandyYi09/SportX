import fs from 'node:fs/promises';
const pages=await (await fetch('http://127.0.0.1:9224/json/list')).json();const page=pages.find(p=>p.type==='page'&&p.url.includes('5188'));
if(!page)throw Error('Preview page unavailable');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let seq=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
await send('Runtime.enable');await send('Page.enable');await send('Page.reload',{ignoreCache:true});
await new Promise(r=>setTimeout(r,2500));
console.log('INITIAL',await run(`({title:document.title,pose:document.getElementById('pose-name').textContent,canvas:document.querySelectorAll('canvas').length,note:document.getElementById('stage-note').textContent,hidden:document.getElementById('stage-note').hidden,time:document.getElementById('motion-time').textContent,reference:document.getElementById('reference-label').textContent})`));
await run(`document.getElementById('motion-seek').value='3';document.getElementById('motion-seek').dispatchEvent(new Event('input'));`);
await new Promise(r=>setTimeout(r,500));
await fs.writeFile('artifacts/mocap-preview.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
console.log('SAMPLE',await run(`(async()=>{const {sampleCapturedMotion}=await import('./captured-motion.mjs');const s=sampleCapturedMotion('rowing-arms',3);return {coords:s.coords,head:s.headPosition,source:s.source};})()`));

const checks=[];
for(const [id,duration] of [['rowing-arms',8.44],['rowing-half',12.48],['rowing-full',11.12]]){
 const state=await run(`(()=>{document.querySelector('[data-pose="${id}"]').click();document.getElementById('motion-seek').value='2';document.getElementById('motion-seek').dispatchEvent(new Event('input'));return {duration:Number(document.getElementById('motion-seek').max),label:document.getElementById('pose-name').textContent};})()`);
 if(Math.abs(state.duration-duration)>.01)throw Error('Incorrect captured duration');checks.push(state);
 const before=await run(`document.getElementById('motion-time').textContent`);await new Promise(r=>setTimeout(r,180));const after=await run(`document.getElementById('motion-time').textContent`);if(before!==after)throw Error('Pause did not hold');
}
await run(`document.querySelector('[data-pose="rowing-full"]').click();document.getElementById('motion-seek').value='5';document.getElementById('motion-seek').dispatchEvent(new Event('input'));`);
await new Promise(r=>setTimeout(r,500));await fs.writeFile('artifacts/mocap-full-preview.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
await run(`document.getElementById('grip-detail').click()`);await new Promise(r=>setTimeout(r,700));await fs.writeFile('artifacts/mocap-hand-preview.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
await run(`document.getElementById('grip-detail').click();document.getElementById('motion-speed').value='.25';document.getElementById('motion-speed').value='0.25';document.getElementById('motion-speed').dispatchEvent(new Event('change'));document.getElementById('motion-play').click();`);
const performanceCheck=await run(`new Promise(resolve=>{const deltas=[];let start=performance.now(),last=start;function frame(now){deltas.push(now-last);last=now;if(now-start<2000)requestAnimationFrame(frame);else{deltas.sort((a,b)=>a-b);resolve({frames:deltas.length,meanMs:deltas.reduce((a,b)=>a+b,0)/deltas.length,p95Ms:deltas[Math.floor(deltas.length*.95)]});}}requestAnimationFrame(frame);})`);
console.log('CHECKS',JSON.stringify(checks));console.log('FRAME_TIMING',JSON.stringify(performanceCheck));
console.log('ERRORS',JSON.stringify(errors));if(errors.length)throw Error('Browser exceptions');await send('Browser.close');ws.close();
