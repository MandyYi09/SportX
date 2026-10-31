import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadCapturedMotions,capturedDuration} from '../src/captured-motion.mjs';
import {rowingCheckpoints,rowingReference,assessRowing,fitRowingReference,inferRowingFacing,chooseRowingSide} from '../src/rowing-correction.mjs';
const original=globalThis.fetch;
globalThis.fetch=async u=>{const b=await fs.readFile(new URL(u));return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}};
await loadCapturedMotions();globalThis.fetch=original;
function live(ref){return Array.from({length:33},(_,i)=>ref[i]?{x:.5+ref[i].x*.4,y:.75+ref[i].y*.4,visibility:.99}:{x:0,y:0,visibility:0});}
for(const[id,keys]of Object.entries(rowingCheckpoints)){
 assert.ok(keys.length>=2&&keys.length<=5);
 for(let i=0;i<keys.length;i++)for(const facing of [1,-1]){
  assert.ok(keys[i].time<=capturedDuration(id));const ref=rowingReference(id,i,facing),p=live(ref),a=assessRowing(id,p,ref,1000,1000);
  assert.ok(a.metrics.length>=4);assert.ok(a.metrics.every(m=>m.delta<1e-5),'Reference must match itself');
  const fitted=fitRowingReference(ref,a.actual,1000,1000,a.side);assert.ok(Object.values(fitted).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  for(const n of [12,14,16,24,26,28])p[n].visibility=0;
  const partial=assessRowing(id,p,ref,1000,1000);assert.ok(partial.metrics.some(m=>m.key==='elbow-0'));assert.ok(partial.metrics.every(m=>!m.key.endsWith('-1')));assert.equal(partial.missing[0].en,'right shoulder');
  p[15].x+=.1;p[15].y-=.1;const changed=assessRowing(id,p,ref,1000,1000);assert.ok(changed.metrics.some(m=>m.delta>5));
 }
 const empty=assessRowing(id,undefined,rowingReference(id),1000,600);assert.equal(empty.metrics.length,0);assert.ok(Object.values(fitRowingReference(rowingReference(id),{},1000,600)).every(p=>p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=600));
}
const ref=rowingReference('rowing-arms',0),p=live(ref);
const endOn=Array.from({length:33},()=>({x:0,y:0,visibility:0})),depth=[];
for(const [id,x,y,z]of [[11,0,0,0],[13,0,.05,.3],[15,.2,.1,.6]]){
 endOn[id]={x:.3+x,y:.3+y,visibility:1};depth[id]={x,y,z};
}
const guarded=assessRowing('rowing-arms',endOn,ref,1000,1000,{world:depth,source:(await import('../src/captured-motion.mjs')).sampleCapturedMotion('rowing-arms',1.6).coords,yaw:1.2,preferWorld:true,conservativeDepth:true});
assert.ok(guarded.metrics.some(m=>m.key==='elbow-0'&&m.depthUncertain&&m.guidanceOnly),'A visible but foreshortened limb must not become a certain depth correction');
for(const n of [23,24,25,26,27,28])p[n].visibility=0;
assert.equal(assessRowing('rowing-arms',p,ref,1000,1000).metrics.length,2,'Arms must work without hips or legs');
p[15]={x:NaN,y:.5,visibility:1};assert.equal(assessRowing('rowing-arms',p,ref,1000,1000).metrics.length,1);
assert.equal(inferRowingFacing(undefined,0,1000,600),null);assert.equal(chooseRowingSide(undefined,1),1);
console.log('PASS: rowing checkpoints, mirrored projection, missing limbs, arm-only without hips, altered arm, invalid joints, fallback ghost.');
