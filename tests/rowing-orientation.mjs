import assert from 'node:assert/strict';
import {RowingOrientation,estimateRowingYaw,sourceLateral,yawDistance} from '../src/rowing-orientation.mjs';
import {rowingIds,rowingCheckpoints,rowingReference,assessRowing,fitRowingReference} from '../src/rowing-correction.mjs';
import {loadCapturedMotions,sampleCapturedMotion} from '../src/captured-motion.mjs';
import fs from 'node:fs/promises';
const fetchOriginal=globalThis.fetch;
globalThis.fetch=async u=>{const b=await fs.readFile(new URL(u));return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
await loadCapturedMotions();globalThis.fetch=fetchOriginal;
for(const[id,keys]of Object.entries(rowingCheckpoints))for(let n=0;n<keys.length;n++)for(const degrees of [0,17,37,63,90,123,179,221,270,317,359]){
 const yaw=degrees*Math.PI/180,sample=sampleCapturedMotion(id,keys[n].time),source=sample.coords,lateral=sourceLateral(source),ref=rowingReference(id,n,1,yaw);
 const world=Array.from({length:33},()=>({x:0,y:0,z:0})),p=Array.from({length:33},()=>({x:0,y:0,visibility:0}));
 rowingIds.forEach((i,j)=>{const c=source[j];world[i]={x:c[0]*Math.cos(yaw)+c[2]*Math.sin(yaw),y:-c[1],z:c[0]*Math.sin(yaw)-c[2]*Math.cos(yaw)};p[i]={x:.5+ref[i].x*.30,y:.8+ref[i].y*.30,visibility:.99};});
 const estimate=estimateRowingYaw(p,world,lateral);assert.ok(estimate,`${id}, ${degrees}: estimate missing`);assert.ok(yawDistance(estimate.yaw,yaw)<1e-6,`${id}, ${degrees}: angle mismatch`);
 const assessment=assessRowing(id,p,ref,1000,1000,{world,source,yaw});
 if(degrees===90&&id==='rowing-arms'&&n===0)assert.equal(assessment.small,false,'End-on projection is not a small body');
 assert.ok(assessment.metrics.every(m=>m.delta<1e-5),'Comparison must use rotated targets');
 const ghost=fitRowingReference(ref,assessment.actual,1000,1000,assessment.side);assert.ok(Object.values(ghost).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 // Missing hips must not prevent shoulder-only direction estimation.
 p[23].visibility=p[24].visibility=0;
 const shouldersOnly=estimateRowingYaw(p,world,sourceLateral([source[0],source[1],...source.slice(2,6),source[0],source[1],...source.slice(8)]));
 assert.ok(shouldersOnly);
}
const tracker=new RowingOrientation();assert.equal(tracker.lock(),false);
for(let t=0;t<=700;t+=100)tracker.update({yaw:.65},t);
assert.equal(tracker.read().ready,true);assert.equal(tracker.lock(),true);const locked=tracker.read().yaw;
for(let t=800;t<=1800;t+=100)tracker.update({yaw:1.65},t);
assert.equal(tracker.read().yaw,locked,'Correction must lock yaw');assert.equal(tracker.read().reposition,true);assert.equal(tracker.read().offAxis,true);
tracker.update(null,1900);assert.equal(tracker.read().yaw,locked);assert.equal(tracker.read().offAxis,true,'Lost joints must not clear a pending reposition');
tracker.reset();assert.equal(tracker.read().locked,false);assert.equal(tracker.read().ready,false);
for(let t=0;t<=700;t+=100)tracker.update({yaw:t%200===0?Math.PI-.01:-Math.PI+.01},t);
assert.equal(tracker.read().ready,true,'Circular smoothing must handle +/-180 degrees');
tracker.update(null,800);assert.equal(tracker.read().ready,false);assert.equal(tracker.lock(),false);
for(let t=900;t<=1600;t+=100)tracker.update({yaw:t%200===0?0:1},t);assert.equal(tracker.read().ready,false,'Unstable estimates must not enable Start');
assert.equal(estimateRowingYaw(null,null,[0,1]),null);
console.log('PASS: continuous 360-degree yaw, 17/37/63-degree views, all checkpoints, rotated comparison, partial calibration, stability, lock, drift, missing data and circular smoothing.');
