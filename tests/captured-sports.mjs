import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Vector3,Quaternion} from '../src/vendor/three.module.js';
import {loadCapturedMotions,sampleCapturedMotion,capturedDuration,capturedWindow} from '../src/captured-motion.mjs';
import {captureTracks,captureWindows,captureReferences} from '../src/capture-catalog.mjs';
import {sampleMotion} from '../src/motion-rig.mjs';
import {tennisGrip} from '../src/tennis-grip.mjs';
import {shootingGrip as clayGrip,shootingRearGrip,shootingStockOutline} from '../src/shooting-model.mjs';
import {measureShootingClearance} from '../src/shooting-clearance.mjs';
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{const bytes=await fs.readFile(new URL(url));return {ok:true,json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
const metadata=await loadCapturedMotions();globalThis.fetch=originalFetch;
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const links=[[0,2],[2,4],[1,3],[3,5],[6,8],[8,10],[7,9],[9,11]];
function checkHand(hand,sample,side,spec){
 if(!hand)return;
 if(hand.gripRole==='rear')spec=shootingRearGrip;
 near(distance(hand.wrist,sample.coords[side+4]),0);
 const offset=hand.wristOffset??spec.wrist;
 const wrist=hand.center.map((v,i)=>v+hand.x[i]*offset[0]+hand.y[i]*offset[1]);
 near(distance(wrist,hand.wrist),0);
 near(Math.hypot(...hand.x),1);near(Math.hypot(...hand.y),1);near(Math.hypot(...hand.z),1);
 near(hand.x.reduce((sum,v,i)=>sum+v*hand.y[i],0),0);
}
// Independently reconstruct exact stored BVH samples (no prop/IK code) to verify provenance.
for(const track of captureTracks.filter(id=>!id.startsWith('rowing'))){
 const meta=metadata.find(m=>m.id===track),data=new Float32Array(await fs.readFile(new URL(`../src/assets/mocap/${meta.binary}`,import.meta.url)).then(b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)));
 assert.equal(meta.removedFrames,1);assert.equal(meta.units,'metres');assert.match(meta.sourceSha256,/^[a-f0-9]{64}$/);near(meta.frameTime,1/120,1e-8);
 assert.ok(!/wangqiu_(02|08)_/.test(meta.source));
 const id=Object.keys(captureWindows).find(id=>captureWindows[id].track===track),window=capturedWindow(id);
 const frame=Math.ceil((window.start+.3)/meta.frameTime),p=[],q=[],global=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),meta.alignment.yaw);
 for(let i=0;i<meta.names.length;i++){
  const local=new Quaternion().fromArray(data,frame*meta.stride+3+i*4),parent=meta.parents[i];
  if(parent<0){p[i]=new Vector3().fromArray(data,frame*meta.stride).applyQuaternion(global).add(new Vector3(...meta.alignment.translation));q[i]=global.clone().multiply(local);}
  else{p[i]=new Vector3(...meta.offsets[i]).applyQuaternion(q[parent]).add(p[parent]);q[i]=q[parent].clone().multiply(local);}
 }
 const names=['LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'];
 const sample=sampleCapturedMotion(id,frame*meta.frameTime-window.start);
 sample.coords.forEach((point,i)=>near(distance(point,p[meta.names.indexOf(names[i])].toArray()),0));
}
for(const id of Object.keys(captureWindows).filter(id=>!id.startsWith('rowing'))){
 const duration=capturedDuration(id),initial=sampleCapturedMotion(id,0);
 const lengths=links.map(([a,b])=>distance(initial.coords[a],initial.coords[b]));let previous=null,maxStep=0;
 for(let time=0;time<=duration;time+=1/120){
  const sample=sampleMotion(id,time),mirrored=sampleMotion(id,time,true);assert.ok(sample.captured);
  for(const s of [sample,mirrored]){
   assert.ok(s.coords.flat().every(Number.isFinite));links.forEach(([a,b],i)=>near(distance(s.coords[a],s.coords[b]),lengths[i]));
   const hands=s.tennisHands??s.equipmentHands;hands.forEach((hand,side)=>checkHand(hand,s,side,s.tennisHands?tennisGrip:clayGrip));
   if(s.racketRotation){
    const axis=new Vector3(0,1,0).applyQuaternion(new Quaternion(...s.racketRotation));near(distance(axis.toArray(),s.racketDirection),0);
    for(const hand of hands.filter(Boolean)){
     const offset=new Vector3(...hand.center).sub(new Vector3(...s.racketPosition)),along=offset.dot(axis);
     near(offset.addScaledVector(axis,-along).length(),0);assert.ok(along>.03&&along<.28,'Captured grip must fit the rigid racket handle');
    }

   }
   if(s.clayProp){
    const p=s.clayProp;near(Math.hypot(...p.x),1);near(Math.hypot(...p.y),1);
    for(const hand of hands.filter(Boolean)){
     if(hand.gripRole==='rear')assert.ok(new Vector3(...hand.wrist).sub(new Vector3(...hand.center)).dot(new Vector3(...p.z))*(p.mirrored?-1:1)>.10,'The rear forearm must remain outside the stock from the ready position onward');
     const delta=new Vector3(...hand.center).sub(new Vector3(...p.origin));
     near(delta.dot(new Vector3(...p.y)),clayGrip.rear[1]);near(delta.dot(new Vector3(...p.z)),0);
    }
    if(hands.every(Boolean)){
     const clearance=measureShootingClearance(s.coords.map(v=>new Vector3(...v)),p,{includeUpper:false});
     assert.ok(clearance.every(h=>h.max<.002),`${id} ${time}: gun/arm overlap ${JSON.stringify(clearance)}`);
    }
    // Check the actual photographed-prop stock outline in world space.
    // The distant muzzle can point upward; the stock stays below the upper head.
    for(const [x,y]of shootingStockOutline)for(const dz of [-.030,.030]){
     const stock=new Vector3(...p.origin).addScaledVector(new Vector3(...p.x),x).addScaledVector(new Vector3(...p.y),y).addScaledVector(new Vector3(...p.z),dz);
     assert.ok(stock.y<s.headPosition[1]+.025,`${id} ${time}: gunstock lifted into the upper head by ${stock.y-s.headPosition[1]-.025}`);
    }
   }
  }
  sample.coords.forEach((_,i)=>near(distance(mirrored.coords[i],[-sample.coords[i^1][0],sample.coords[i^1][1],sample.coords[i^1][2]]),0));
  if(previous)maxStep=Math.max(maxStep,...sample.coords.map((p,i)=>distance(p,previous.coords[i])));previous=sample;
 }
 assert.ok(maxStep<.15,`${id}: capture discontinuity ${maxStep}`);
 assert.deepEqual(sampleMotion(id,-1).coords,initial.coords);assert.deepEqual(sampleMotion(id,duration+1).coords,sampleMotion(id,duration).coords);
 console.log(id,JSON.stringify({duration,maxStepAt120Hz:maxStep,source:initial.source}));
}
for(const name of ['forehand','backhand']){
 const full=`tennis-${name}-full`,fullWindow=capturedWindow(full),slices=['backswing','drop','swing'].map(p=>`tennis-${name}-${p}`);
 near(capturedWindow(slices[0]).start,fullWindow.start);near(capturedWindow(slices[2]).end,fullWindow.end);
 for(let i=1;i<slices.length;i++)near(capturedWindow(slices[i-1]).end,capturedWindow(slices[i]).start);
 for(const slice of slices)for(let time=0;time<capturedDuration(slice);time+=.037){
  const a=sampleMotion(slice,time),b=sampleMotion(full,capturedWindow(slice).start-fullWindow.start+time);
  a.coords.forEach((p,i)=>near(distance(p,b.coords[i]),0));near(distance(a.racketPosition,b.racketPosition),0);
 }
}
const fourth=metadata.find(m=>m.id==='clay-lower');
assert.equal(capturedWindow('clay-lower').start,0);
near(capturedDuration('clay-lower'),fourth.duration);
assert.equal(captureReferences['clay-lower'].cameraMountedAt,5);
assert.equal(sampleMotion('clay-lower',4.49).gazeReferenceActive,false);
assert.equal(sampleMotion('clay-lower',4.5).gazeReferenceActive,true);
assert.ok(distance(sampleMotion('clay-lower',4.5).coords[4],sampleMotion('clay-lower',8).coords[4])>.01,'Full action must not be replaced by a frozen hold');
console.log('PASS: original BVH reconstruction, captured tennis/clay proportions, mirroring, rigid equipment, exact full/slice agreement and complete study 4.');
