import fs from 'node:fs/promises';
const pages=await(await fetch('http://127.0.0.1:9226/json/list')).json();
const page=pages.find(p=>p.type==='page');
if(!page)throw Error('Athlete preview unavailable');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let id=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:5191'});await delay(6000);
console.log('PAGE',await run('document.body.innerText.slice(0,300)'));
await run(`document.querySelectorAll('dialog[open]').forEach(d=>d.close())`);
await run(`document.querySelector('[data-filter="all"]').click()`);
await fs.mkdir('artifacts',{recursive:true});
for(const pose of ['rowing-full','tennis-forehand-full','clay-full']){
 await run(`document.querySelector('[data-pose="${pose}"]').click();document.getElementById('motion-seek').value='3';document.getElementById('motion-seek').dispatchEvent(new Event('input'));`);
 await delay(900);
 await fs.writeFile(`artifacts/athlete-${pose}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 console.log(pose,await run(`({canvas:document.querySelectorAll('#three canvas').length,note:document.getElementById('stage-note').textContent,time:document.getElementById('motion-time').textContent})`));
}
await run(`document.querySelector('[data-pose="tennis-forehand-full"]').click();document.getElementById('reset-view').click();document.getElementById('motion-seek').value='0';document.getElementById('motion-seek').dispatchEvent(new Event('input'));`);
await delay(900);await fs.writeFile('artifacts/athlete-front.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
console.log('BROWSER_ERRORS',JSON.stringify(errors));ws.close();if(errors.length)process.exitCode=1;
