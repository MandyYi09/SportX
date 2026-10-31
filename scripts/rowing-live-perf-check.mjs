import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const source=process.argv[2],before=process.argv[3];assert.ok(source,'Pass a source WebM; optional second argument is a saved previous overlay module.');
const origin='http://127.0.0.1:5198',root=path.resolve('src');
const server=createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,origin).pathname);
 if(name==='/bench'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body style="margin:0;background:#111"></body>');return;}
 const file=name==='/source.webm'?path.resolve(source):name==='/before-overlay.mjs'&&before?path.resolve(before):path.resolve(root,'.'+name);
 if(!['/source.webm','/before-overlay.mjs'].includes(name)&&!file.startsWith(root+path.sep))throw Error('Path');
 res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.webm')?'video/webm':'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(5198,'127.0.0.1',r));
const chrome=spawn((process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'),['--headless=new','--mute-audio','--autoplay-policy=no-user-gesture-required','--no-first-run','--no-default-browser-check','--remote-debugging-port=9238','--user-data-dir='+process.cwd()+'/.local/live-perf-browser',origin+'/bench'],{windowsHide:true,stdio:'ignore'});
let ws;
try{
 let pages;for(let i=0;i<100;i++){try{pages=await(await fetch('http://127.0.0.1:9238/json')).json();if(pages.some(p=>p.type==='page'))break;}catch{}await new Promise(r=>setTimeout(r,200));}
 assert.ok(pages,'Chrome must start');ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result);}};
 const run=expression=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve:r=>r.exceptionDetails?reject(Error(JSON.stringify(r.exceptionDetails))):resolve(r.result.value),reject});ws.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));});
 for(let i=0;i<100;i++){if(await run(`location.origin==='${origin}'&&document.readyState==='complete'`))break;await new Promise(r=>setTimeout(r,100));}
 const result=await run(`(async()=>{
 const {loadCapturedMotions}=await import('./captured-motion.mjs');await loadCapturedMotions();
 const {createRowingExpertOverlay}=await import('./rowing-expert-overlay.mjs'),{dynamicReferenceAt}=await import('./rowing-reference-cycle.mjs'),{RowingRenderBudget}=await import('./rowing-render-budget.mjs');
 const oldFactory=${before?"(await import('./before-overlay.mjs')).createRowingExpertOverlay":"null"};
 const {createRowingPoseDetector}=await import('./rowing-pose-client.mjs');
 const detector=await createRowingPoseDetector({timeoutMs:45000});
 const video=document.createElement('video');video.muted=true;video.loop=true;video.src='/source.webm';video.style.width='640px';document.body.append(video);await video.play();
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;document.body.append(canvas);const ctx=canvas.getContext('2d');
 const glSurfaces=new WeakSet(),getContext=HTMLCanvasElement.prototype.getContext,drawImage=CanvasRenderingContext2D.prototype.drawImage;
 let copies=0;HTMLCanvasElement.prototype.getContext=function(type,...args){const c=getContext.call(this,type,...args);if(type==='webgl'||type==='webgl2')glSurfaces.add(this);return c;};
 CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(glSurfaces.has(source))copies++;return drawImage.call(this,source,...args);};
 const results=[];try{
 // Warm the identical pose model before comparing rendering strategies.
 for(let i=0;i<3;i++)await detector.detectForVideo(video,performance.now());
 for(const kind of oldFactory?['before','after','before','after']:['after']){
 const overlay=(kind==='before'?oldFactory:createRowingExpertOverlay)(),budget=new RowingRenderBudget();
 const ref=dynamicReferenceAt('rowing-full',2.4,1,1.13),ghost=Object.fromEntries(Object.entries(ref).map(([id,p])=>[id,{x:320+p.x*150,y:370+p.y*150}]));
 // Shader/material initialization is excluded from steady-state measurements.
 overlay.draw(ctx,{id:'rowing-full',time:2.4,yaw:1.13,ghost,width:640,height:480,dynamicCycle:true});
 const preparing=performance.now();if(kind==='after')await overlay.prepareCycle({id:'rowing-full',yaw:1.13,gender:'male'});const prepareMs=performance.now()-preparing,prepared=overlay.preparedInfo?.();if(prepared&&prepared.bytes>192*1024*1024)throw Error('Expert cache exceeded memory budget');
 let alignmentError=null;
 if(kind==='after'){
 const r=dynamicReferenceAt('rowing-full',2.4,1,1.13),g=Object.fromEntries(Object.entries(r).map(([i,p])=>[i,{x:320+(p.x-r[23].x)*150,y:240+(p.y-r[23].y)*150}]));
 const options={id:'rowing-full',time:2.4,yaw:1.13,ghost:g,width:640,height:480,opacity:1,dynamicCycle:true};
 ctx.clearRect(0,0,640,480);overlay.draw(ctx,{...options,usePrepared:false});const original=ctx.getImageData(0,0,640,480).data;
 ctx.clearRect(0,0,640,480);overlay.draw(ctx,{...options,usePrepared:true});const cached=ctx.getImageData(0,0,640,480).data;
 let error=0;for(let i=0;i<original.length;i++)error+=Math.abs(original[i]-cached[i]);alignmentError=error/original.length;
 if(alignmentError>5)throw Error('Prepared expert placement differs from direct rendering: '+alignmentError);
 }
 await new Promise(r=>setTimeout(r,100));copies=0;
 const start=performance.now();let active=true,ticks=0,draws=0,expertFrames=0,drawMs=0,last=0,poseCount=0,cost=0,previousVideo=-1,raf;
 function frame(now){if(!active)return;budget.observeFrame(now);ticks++;if(now-last>=32){last=now;const time=(2.4+(now-start)/1000)%6.6,options=kind==='before'?{maxFps:20,maxWidth:720}:budget.read(now),t=performance.now();ctx.clearRect(0,0,640,480);const output=overlay.draw(ctx,{id:'rowing-full',time,yaw:1.13,ghost,width:640,height:480,dynamicCycle:true,usePrepared:kind==='after',...options});const ms=performance.now()-t;drawMs+=ms;draws++;if(output.rendered){expertFrames++;budget.observeRender(ms);}}raf=requestAnimationFrame(frame);}
 raf=requestAnimationFrame(frame);
 while(performance.now()-start<6000){if(previousVideo!==video.currentTime){previousVideo=video.currentTime;const r=await detector.detectForVideo(video,performance.now());poseCount++;cost+=r.inferenceMs;budget.observeInference(r.inferenceMs);}else await new Promise(r=>setTimeout(r,5));}
 active=false;cancelAnimationFrame(raf);const seconds=(performance.now()-start)/1000;
 results.push({kind,prepareMs,prepared,alignmentError,seconds,poseFps:poseCount/seconds,inferenceMs:cost/poseCount,uiFps:ticks/seconds,overlayFps:draws/seconds,expertFps:expertFrames/seconds,meanDrawMs:drawMs/draws,webglCopies:copies,expertFrames,budget:budget.read()});overlay.dispose();
 }
 }finally{detector.close();video.pause();HTMLCanvasElement.prototype.getContext=getContext;CanvasRenderingContext2D.prototype.drawImage=drawImage;}
 return results;})()`);
 for(const r of result.filter(r=>r.kind==='after'))assert.equal(r.webglCopies,0,'Prepared playback must do no WebGL readback during inference');
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/rowing-live-performance.json',JSON.stringify(result,null,2));console.log('PASS: real video + real model + expert; single-readback cache. '+JSON.stringify(result));
}finally{ws?.close();chrome.kill();server.close();}
