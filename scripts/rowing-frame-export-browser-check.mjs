import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import http from 'node:http';
const port=5193,debug=9231,origin=`http://127.0.0.1:${port}`;
const server=http.createServer(async(req,res)=>{if(req.url==='/rowing-frame-export.mjs'){res.setHeader('Content-Type','text/javascript');res.end(await fs.readFile('src/rowing-frame-export.mjs'));}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Export check</title><body></body>');}});
await new Promise(r=>server.listen(port,'127.0.0.1',r));
const chrome=spawn((process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'),['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${debug}`,'--user-data-dir='+process.cwd()+'/.local/frame-export-browser',origin],{windowsHide:true,stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
 let pages;for(let i=0;i<80;i++){try{pages=await(await fetch(`http://127.0.0.1:${debug}/json/list`)).json();if(pages.some(p=>p.type==='page'))break;}catch{}await wait(250);}
 assert.ok(pages,'Chrome must start');ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
 const run=expression=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve:r=>r.exceptionDetails?reject(Error(JSON.stringify(r.exceptionDetails))):resolve(r.result.value),reject});ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
 for(let i=0;i<80;i++){if(await run(`location.origin==='${origin}'&&document.readyState==='complete'`))break;await wait(150);}
 await fs.mkdir('artifacts/frame-export-review',{recursive:true});
 for(const fallback of [false,true]){
  const result=await run(`(async()=>{
   const {encodeFrameVideo,exportFramePlan}=await import('${origin}/rowing-frame-export.mjs');
   const c=document.createElement('canvas');c.width=320;c.height=240;const ctx=c.getContext('2d'),plan=exportFramePlan(0,1,{cardSeconds:.2});let count=0;
   try{
    const blob=await encodeFrameVideo({canvas:c,plan,mime:${fallback}?'video/webm;codecs=vp8':'video/mp4',active:()=>true,progress:()=>{},render:async f=>{
     if(count===4||count===12)await new Promise(r=>setTimeout(r,350));count++;
     ctx.fillStyle=f.card?'rgb(21,33,42)':'rgb('+Math.round(40+f.sourceTime*160)+',90,150)';ctx.fillRect(0,0,320,240);
     ctx.fillStyle='#fff';ctx.fillRect(20+Math.round(f.sourceTime*180),100,20,20);
    }});
    const v=document.createElement('video');v.muted=true;v.style.cssText='position:fixed;width:1px;height:1px';document.body.append(v);v.src=URL.createObjectURL(blob);
    await new Promise((r,j)=>{v.onloadeddata=r;v.onerror=j;});
    const pixels=[];
    for(const t of [.08,.32,.64,1.08]){await new Promise(r=>{v.onseeked=r;v.currentTime=t;});ctx.drawImage(v,0,0);pixels.push([...ctx.getImageData(10,10,1,1).data]);}
    const duration=v.duration;v.remove();const buffer=new Uint8Array(await blob.arrayBuffer());let binary='';for(const b of buffer)binary+=String.fromCharCode(b);
    return {type:blob.type,base64:btoa(binary),pixels,duration,count};
   }finally{}
  })()`);
  const ext=fallback?'webm':'mp4',file=`artifacts/frame-export-review/stall-test.${ext}`;await fs.writeFile(file,Buffer.from(result.base64,'base64'));
  assert.ok(result.type.includes(ext),result.type);assert.equal(result.count,30);
  const probe=spawnSync((process.env.FFPROBE_PATH||'ffprobe'),['-v','error','-show_entries','format=duration:frame=best_effort_timestamp_time','-of','json',file],{encoding:'utf8',windowsHide:true});assert.equal(probe.status,0,probe.stderr);
  const metadata=JSON.parse(probe.stdout),times=metadata.frames.map(f=>Number(f.best_effort_timestamp_time)),duration=Number(metadata.format.duration),maxGap=Math.max(...times.slice(1).map((t,i)=>t-times[i]));
  assert.ok(Math.abs(duration-1.2)<.2,`${ext} duration ${duration}`);assert.ok(maxGap<.12,`${ext} encoded gap ${maxGap}`);
  for(const [i,target] of [53,91,142,21].entries())assert.ok(Math.abs(result.pixels[i][0]-target)<14,`${ext} frame ${i}: ${result.pixels[i]}`);
  console.log(`PASS: ${ext} stalled rendering retains source colors, duration ${duration}s, max encoded gap ${maxGap.toFixed(3)}s, ${times.length} frames.`);
 }
}finally{ws?.close();chrome.kill();server.close();}
