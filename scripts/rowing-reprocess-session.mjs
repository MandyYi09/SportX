import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
const [dataPath,sourcePath]=process.argv.slice(2);if(!dataPath||!sourcePath)throw Error('Usage: node scripts/rowing-reprocess-session.mjs data.json source.webm');
const data=JSON.parse(await fs.readFile(dataPath,'utf8')),source=await fs.readFile(sourcePath),root=path.resolve('src'),out=path.resolve('artifacts',`session-${data.sessionId}`);await fs.mkdir(out,{recursive:true});
const port=5196,debug=9236,origin=`http://127.0.0.1:${port}`;
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,origin);if(url.pathname==='/session-data'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;}
 if(url.pathname==='/session-source'){res.setHeader('Content-Type',data.recording.sourceMime);res.end(source);return;}
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="zh"><meta charset="utf-8"><link rel="stylesheet" href="/rowing-correction.css"><body style="background:#15212a"></body></html>');return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(port,'127.0.0.1',r));
const chrome=spawn((process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'),['--headless=new','--mute-audio','--no-first-run',`--remote-debugging-port=${debug}`,'--user-data-dir='+process.cwd()+'/.local/reprocess-browser',origin],{windowsHide:true,stdio:'ignore'});let ws;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let pages;for(let i=0;i<80;i++){try{pages=await(await fetch(`http://127.0.0.1:${debug}/json/list`)).json();if(pages.some(p=>p.type==='page'))break;}catch{}await wait(250);}assert.ok(pages,'Chrome must start');ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
 let seq=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const run=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:out});for(let i=0;i<80;i++){if(await run(`location.origin==='${origin}'&&document.readyState==='complete'`))break;await wait(150);}
 const summary=await run(`(async()=>{
  const {loadCapturedMotions}=await import('./captured-motion.mjs');await loadCapturedMotions();const {createRowingDynamicUI}=await import('./rowing-dynamic-ui.mjs'),{createRowingExpertOverlay}=await import('./rowing-expert-overlay.mjs');
  const d=await(await fetch('/session-data')).json(),blob=await(await fetch('/session-source')).blob();globalThis.__session=d;
  const dialog=document.createElement('dialog');dialog.className='rowing-correction';dialog.id='rowing-correction';dialog.innerHTML='<div class="rowing-header"><div><small></small><h2></h2></div></div><nav></nav><div class="rowing-voice-bar"></div><div class="rowing-feed"><video playsinline muted></video><canvas></canvas><svg class="rowing-arrows"></svg><span class="rowing-legend"></span><div class="rowing-result"></div></div><div class="rowing-progress"></div><div class="rowing-angle-details"></div><div class="rowing-instruction"></div><div class="rowing-settings"><label><input data-opacity value="0.2"></label></div>';document.body.append(dialog);dialog.showModal();
  const video=dialog.querySelector('video'),canvas=dialog.querySelector('canvas');canvas.width=d.frames[0].width;canvas.height=d.frames[0].height;const renderer=createRowingExpertOverlay();
  globalThis.__ui=createRowingDynamicUI({dialog,video,canvas,arrowsLayer:dialog.querySelector('svg'),id:d.movement,getLanguage:()=> 'zh',getGender:()=>d.view.gender,getYaw:()=>d.view.yaw,getStream:()=>null,getOverlay:()=>renderer,isSpeechEnabled:()=>false});
  globalThis.__result=await __ui.loadRecordedSession(d,blob,{preserveSelectedRange:true});return {score:__result.selectedTake.score,start:__result.selectedTake.start,end:__result.selectedTake.end};
 })()`);console.log('REPROCESSED',JSON.stringify(summary));
 await fs.writeFile(path.join(out,'reprocessed-summary.json'),JSON.stringify(summary,null,2));
 await run(`__ui.exportVideo()`);
 const exported=await run(`(async()=>{const a=document.querySelector('[data-download]');if(a.hidden)throw Error(document.querySelector('.rowing-dynamic').dataset.exportError);const blob=await(await fetch(a.href)).blob();return await new Promise(r=>{const reader=new FileReader();reader.onload=()=>r({type:blob.type,data:reader.result});reader.readAsDataURL(blob);});})()`);
 const output=path.join(out,exported.type.includes('mp4')?'corrected-take.mp4':'corrected-take.webm');await fs.writeFile(output,Buffer.from(exported.data.split(',')[1],'base64'));
 await run(`document.querySelector('[data-export-data]').click()`);const debugText=await run(`fetch(document.querySelector('[data-debug-download]').href).then(r=>r.text())`);await fs.writeFile(path.join(out,'corrected-data.json'),debugText);
 const probe=spawnSync((process.env.FFPROBE_PATH||'ffprobe'),['-v','error','-show_entries','format=duration:stream=codec_name,width,height,avg_frame_rate','-of','json',output],{windowsHide:true,encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);console.log('PASS: original source and exact pose predictions reprocessed, same UI exported corrected video. '+probe.stdout);
}finally{ws?.close();chrome.kill();server.close();}
