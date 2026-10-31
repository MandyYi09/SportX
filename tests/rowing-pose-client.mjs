import assert from 'node:assert/strict';
import {createRowingPoseDetector} from '../src/rowing-pose-client.mjs';
const original=globalThis.createImageBitmap;
let bitmaps=0,closed=0;
globalThis.createImageBitmap=async()=>{bitmaps++;return {close(){closed++;}};};
class FakeWorker{
 active=0;maximum=0;terminated=false;
 postMessage(message){
  if(message.type==='init'){queueMicrotask(()=>this.onmessage?.({data:{type:'ready'}}));return;}
  this.active++;this.maximum=Math.max(this.maximum,this.active);
  setTimeout(()=>{message.bitmap.close();this.active--;if(!this.terminated)this.onmessage?.({data:{type:'result',id:message.id,landmarks:[],worldLandmarks:[],inferenceMs:10}});},10);
 }
 terminate(){this.terminated=true;}
}
try{
 const worker=new FakeWorker(),detector=await createRowingPoseDetector({workerFactory:()=>worker});
 const results=await Promise.all([detector.detectForVideo({width:1280,height:720},1),detector.detectForVideo({width:1280,height:720},2)]);
 assert.equal(worker.maximum,1,'Never send a second frame while the first is in flight');
 assert.equal(results.length,2);assert.equal(bitmaps,2);assert.equal(closed,2);
 const pending=detector.detectForVideo({width:640,height:480},3);await Promise.resolve();await Promise.resolve();detector.close();
 await assert.rejects(pending,/closed/);assert.equal(worker.terminated,true);
 await assert.rejects(detector.detectForVideo({width:640,height:480},4),/closed/);
 const neverReady={postMessage(){},terminate(){this.terminated=true;}};
 await assert.rejects(createRowingPoseDetector({workerFactory:()=>neverReady,timeoutMs:5}),/initialization timeout/);
 assert.equal(neverReady.terminated,true);
 console.log('PASS: worker single-frame backpressure, bitmap lifecycle, concurrent callers, close cancellation and startup timeout.');
}finally{globalThis.createImageBitmap=original;}
