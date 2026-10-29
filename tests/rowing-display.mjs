import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadCapturedMotions,sampleCapturedMotion,capturedDuration} from '../src/captured-motion.mjs';
import {rowingDisplaySample,fullStrokeTravel,halfStrokeTravel} from '../src/rowing-display.mjs';
import {rowingGrip} from '../src/equipment-grip.mjs';
import {createWrappedHand} from '../src/tennis-hand.mjs';
import * as THREE from '../src/vendor/three.module.js';
globalThis.fetch=async url=>{const b=await fs.readFile(new URL(url));return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
await loadCapturedMotions();
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const [id,travel]of [['rowing-full',fullStrokeTravel],['rowing-half',halfStrokeTravel]]){
const initial=sampleCapturedMotion(id,0),xs=[];let previous;
for(let t=0;t<=capturedDuration(id);t+=1/120){
 const raw=sampleCapturedMotion(id,t),saved=JSON.stringify(raw),s=rowingDisplaySample(raw,id);
 assert.equal(JSON.stringify(raw),saved,'Display must not mutate scoring sample');
 xs.push(s.rowingSeat[0]);near(s.rowingSeat[0],(s.coords[6][0]+s.coords[7][0])/2);
 for(const side of [0,1]){
  near(dist(s.coords[10+side],initial.coords[10+side]),0);
  for(const [a,b] of [[6+side,8+side],[8+side,10+side],[side,2+side],[2+side,4+side]])near(dist(s.coords[a],s.coords[b]),dist(raw.coords[a],raw.coords[b]));
  near(dist(s.equipmentHands[side].wrist,s.coords[4+side]),0);
  const o=s.oars[side];near(dist(o.start,o.hand.center),rowingGrip.buttOffset);
 }
 if(previous)assert.ok(Math.max(...s.coords.map((p,i)=>dist(p,previous.coords[i])))<.03,'No frame jumps');
 const mirrored=rowingDisplaySample(sampleCapturedMotion(id,t,true),id,true);
 for(let i=0;i<12;i++)near(dist(mirrored.coords[i],[-s.coords[i^1][0],s.coords[i^1][1],s.coords[i^1][2]]),0);
 previous=s;
}
assert.ok(Math.max(...xs)-Math.min(...xs)>travel-.002);
assert.ok(Math.max(...xs)-Math.min(...xs)<=travel+1e-6);
}
for(const flipped of [false,true]){
 const initial=sampleCapturedMotion('rowing-arms',0,flipped);
 for(let t=0;t<=capturedDuration('rowing-arms');t+=1/60){
  const raw=sampleCapturedMotion('rowing-arms',t,flipped),s=rowingDisplaySample(raw,'rowing-arms',flipped);
  assert.deepEqual(s.rowingSeat,initial.rowingSeat,'Arms-only seat must remain completely stationary');
  assert.deepEqual(s.coords,raw.coords,'Arms-only body motion is unchanged');
 }
}
for(const side of [-1,1]){
 const hand=createWrappedHand(THREE,new THREE.MeshBasicMaterial(),side,rowingGrip);
 assert.equal(hand.root.name,'rowing-anatomical-hand');
 assert.deepEqual(hand.root.children.filter(m=>!m.name.endsWith('-nail')).map(m=>m.name),['continuous-hand-skin']);
 assert.equal(hand.root.children.filter(m=>m.name.endsWith('-nail')).length,4);
 for(const m of hand.root.children){
  m.updateMatrix();
  const p=m.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));
   const point=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrix);
   if(point.y>=-rowingGrip.buttOffset)assert.ok(Math.hypot(point.x,point.z)>=rowingGrip.radius+.0005,'Hand must stay outside the solid handle');
  }
 }
 const geometry=hand.root.getObjectByName('continuous-hand-skin').geometry;
 const gapMesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));gapMesh.updateMatrixWorld();
 for(const gapY of [-.019,.0015,.020])for(const x of [-.010,.005,.020]){
  const ray=new THREE.Raycaster(new THREE.Vector3(x,gapY,.1),new THREE.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(gapMesh).length,0,'Finger web spaces must stay open beyond the knuckles');
 }
 const parent=Array.from({length:geometry.attributes.position.count},(_,i)=>i);
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 for(let i=0;i<geometry.index.count;i+=3){const a=find(geometry.index.getX(i));parent[find(geometry.index.getX(i+1))]=a;parent[find(geometry.index.getX(i+2))]=a;}
 assert.equal(new Set(parent.map((_,i)=>find(i))).size,1,'Palm and all five digits must form one connected skin');
 // Every rowing frame bends the cuff into the incoming forearm without
 // altering the grip or producing non-finite skin vertices.
 for(const id of ['rowing-arms','rowing-half','rowing-full'])for(const flipped of [false,true])for(let t=0;t<capturedDuration(id);t+=.5){
  const sample=rowingDisplaySample(sampleCapturedMotion(id,t,flipped),id,flipped);
  const frame=sample.equipmentHands[side===-1?0:1];hand.setForearm(frame);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),'Wrist deformation must stay finite');
 }
 const thumb=hand.root.getObjectByName('continuous-hand-skin').geometry.attributes.position;
 let contact=Infinity;
 for(let i=0;i<thumb.count;i++)if(Math.hypot(thumb.getX(i),thumb.getZ(i))<rowingGrip.radius)contact=Math.min(contact,Math.abs(thumb.getY(i)+rowingGrip.buttOffset));
 assert.ok(contact<.003,'Thumb pad should rest against the handle end');
}
console.log('PASS: 40 cm full / 20 cm half slide, stationary arms-only seat, planted feet, connected fixed-length legs, source isolation, mirrored continuity and thumb/end-cap contact.');
