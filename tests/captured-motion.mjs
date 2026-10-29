import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadCapturedMotions,sampleCapturedMotion,capturedDuration} from '../src/captured-motion.mjs';
import {createMotionClock} from '../src/motion-clock.mjs';
const realFetch=globalThis.fetch;
globalThis.fetch=async url=>{const bytes=await fs.readFile(new URL(url));return {ok:true,json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
await loadCapturedMotions();globalThis.fetch=realFetch;
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const ids=['rowing-arms','rowing-half','rowing-full'];
for(const id of ids){
 const duration=capturedDuration(id);let previous=null,maxStep=0,minY=Infinity,maxVelocity=0;const initial=sampleCapturedMotion(id,0);let moving=0;const seatXs=[];
 const lengths=[[0,2],[2,4],[1,3],[3,5],[6,8],[8,10],[7,9],[9,11]].map(([a,b])=>dist(initial.coords[a],initial.coords[b]));
 for(let t=0;t<=duration;t+=1/240){
  const s=sampleCapturedMotion(id,t);assert.ok(s.captured);assert.ok(s.coords.flat().every(Number.isFinite));
  [[0,2],[2,4],[1,3],[3,5],[6,8],[8,10],[7,9],[9,11]].forEach(([a,b],i)=>assert.ok(Math.abs(dist(s.coords[a],s.coords[b])-lengths[i])<1e-6,'Source bone length changed'));
  minY=Math.min(minY,...s.coords.map(p=>p[1]));
  if(previous){const delta=Math.max(...s.coords.map((p,i)=>dist(p,previous.coords[i])));maxStep=Math.max(maxStep,delta);if(delta>1e-7)moving++;}
  seatXs.push(s.rowingSeat[0]);
  assert.ok(Math.abs(s.rowingSeat[0]-(s.coords[6][0]+s.coords[7][0])/2)<1e-9,'Seat follows pelvis along the rail');
  assert.deepEqual(s.rowingSeat.slice(1),initial.rowingSeat.slice(1),'Seat stays on a fixed rail');
  for(const axis of [0,2])assert.ok(Math.abs((s.coords[10][axis]+s.coords[11][axis])/2-(initial.coords[10][axis]+initial.coords[11][axis])/2)<1e-9,'Foot stretcher stays fixed');
  const mirrored=sampleCapturedMotion(id,t,true);
  assert.deepEqual(mirrored.rowingSeat,[-s.rowingSeat[0],s.rowingSeat[1],s.rowingSeat[2]]);
  for(const [i,oar]of mirrored.oars.entries())assert.deepEqual(oar.hand,mirrored.equipmentHands[i]);
  s.equipmentHands.forEach((hand,i)=>assert.ok(dist(hand.wrist,s.coords[4+i])<1e-6));
  s.oars.forEach((oar,i)=>assert.deepEqual(oar.pivot,initial.oars[i].pivot,'Oarlocks must stay fixed'));
  for(const sample of [s,sampleCapturedMotion(id,t,true)]){
   const shoulderZ=(sample.coords[0][2]+sample.coords[1][2])/2;
   sample.oars.forEach((oar,i)=>assert.ok((oar.pivot[2]-shoulderZ)*(sample.coords[i][2]-shoulderZ)>0,'Each hand must connect to the oar on its own anatomical side'));
  }
  previous=s;
 }
 if(id==='rowing-full')assert.ok(Math.max(...seatXs)-Math.min(...seatXs)>.07,'Full stroke must visibly slide with the measured leg motion');
 assert.ok(moving>duration*200,'Unexpected freezes');assert.ok(maxStep<.08,'Unexpected source discontinuity');
 assert.deepEqual(sampleCapturedMotion(id,-1).coords,initial.coords);assert.deepEqual(sampleCapturedMotion(id,duration+1).coords,sampleCapturedMotion(id,duration).coords);
 console.log(id,JSON.stringify({duration,frames:Math.round(duration*120)+1,maxStepAt240Hz:maxStep,minY,moving}));
}
let now=0;const clock=createMotionClock(()=>now);clock.select(capturedDuration(ids[0]));clock.setSpeed(.25);now=4000;assert.ok(Math.abs(clock.read().elapsed-1)<1e-8);clock.pause();now=10000;assert.equal(clock.read().elapsed,1);
assert.deepEqual(sampleCapturedMotion(ids[0],clock.read().elapsed).coords,sampleCapturedMotion(ids[0],1).coords);
console.log('PASS: real motion at 240 Hz sampling, constant measured bone lengths, fixed oarlocks, continuous fractional-frame interpolation, source clamping and 0.25x clock.');
