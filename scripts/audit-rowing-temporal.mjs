import fs from 'node:fs/promises';
import {loadCapturedMotions,capturedDuration} from '../src/captured-motion.mjs';
import {rowingReferenceAt} from '../src/rowing-correction.mjs';
import {dynamicReference,alignDynamicFrames} from '../src/rowing-dynamic.mjs';
import {scoreTake} from '../src/rowing-takes.mjs';
const saved=globalThis.fetch;globalThis.fetch=async url=>{const b=await fs.readFile(new URL(url));return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
await loadCapturedMotions();globalThis.fetch=saved;
const id='rowing-full',duration=capturedDuration(id),results=[];
for(const yaw of [.3,1.3])for(const gap of [false,true])for(const wristOffset of [0,.02,.04]){
 const experts=dynamicReference(id,yaw),frames=[];
 for(let t=0;t<=duration*1.5;t+=.25){
  if(gap&&((t>2&&t<3)||(t>6&&t<7)))continue;
  const ref=rowingReferenceAt(id,(2.4+t/1.5)%duration,1,yaw),pose=Array.from({length:33},(_,i)=>ref[i]?{x:.5+ref[i].x*.3,y:.78+ref[i].y*.4,visibility:i>=25?0:.99}:{x:0,y:0,visibility:0});
  for(const i of [15,16])pose[i].y+=wristOffset;
  frames.push({t,pose,world:null,width:960,height:720});
 }
 const rows=alignDynamicFrames(id,frames,experts,yaw),score=scoreTake(id,rows,{start:frames[0].t,end:frames.at(-1).t,referenceCount:experts.length,referenceDuration:duration});
 results.push({yaw,gap,wristOffset,knownActualCycles:(frames.at(-1).t/1.5)/duration,frames:frames.length,valid:rows.filter(r=>r.valid).length,...score});
}
await fs.writeFile('artifacts/take-1-new-review/alignment-counterfactual.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(({parts,...r})=>r),null,2));
