import assert from 'node:assert/strict';
import * as THREE from '../src/vendor/three.module.js';
import {createAthleteModel} from '../src/athlete-model.mjs';
import {sampleMotion} from '../src/motion-rig.mjs';
import {createShootingProp,shootingEnvelope} from '../src/shooting-model.mjs';
import {createTennisRacket,racketEnvelope} from '../src/tennis-racket.mjs';
import {motionClips} from '../src/motion-catalog.mjs';
import fs from 'node:fs/promises';
import {loadCapturedMotions,sampleCapturedMotion,capturedDuration} from '../src/captured-motion.mjs';
import {referencePoses} from '../src/reference.mjs';
import {fitYogaArms} from '../src/yoga-proportions.mjs';
import {poses} from '../src/exercises.mjs';

const model=createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial(),skin:new THREE.MeshStandardMaterial()});
const anchors={head:new THREE.Object3D(),pelvis:new THREE.Object3D(),feet:[new THREE.Object3D(),new THREE.Object3D()]};
const geometries=new Set();
model.setSport('clay');
model.root.traverse(m=>{if(m.isMesh){geometries.add(m.geometry);}});
model.setSport('rowing');
model.root.traverse(m=>{if(m.isMesh){geometries.add(m.geometry);}});
model.setSport('tennis');
model.root.traverse(m=>{if(m.isMesh){geometries.add(m.geometry);assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));}});
for(const clip of motionClips)for(const mirrored of [false,true])for(const time of [0,.5,2,4]){
 model.setSport(clip.type);
 assert.equal(model.root.getObjectByName('capture-cap').visible,clip.type==='clay');
 assert.equal(model.root.getObjectByName('rowing-singlet').visible,clip.type==='rowing');
 assert.equal(model.root.getObjectByName('rowing-sunglasses').visible,clip.type==='rowing');
 assert.equal(model.root.getObjectByName('tennis-white-cap').visible,clip.type==='tennis');
 assert.equal(model.root.getObjectByName('continuous-tennis-shorts').visible,clip.type==='tennis');
 const sample=sampleMotion(clip.id,time,mirrored),coords=sample.coords.map(p=>new THREE.Vector3(...p));
 anchors.head.position.copy(coords[0]).add(coords[1]).multiplyScalar(.5).add(new THREE.Vector3(0,.31,0));
 model.update(coords,sample,anchors);model.root.updateMatrixWorld(true);
 model.root.traverse(m=>{
  assert.ok(m.matrixWorld.elements.every(Number.isFinite),`${clip.id}: invalid transform`);
  if(m.isMesh)assert.ok(geometries.has(m.geometry),'Playback must reuse geometry');
 });
 const bounds=new THREE.Box3().setFromObject(model.root);
 assert.ok(!bounds.isEmpty()&&bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite));
}
const prop=createShootingProp(THREE).root;prop.updateMatrixWorld(true);
const propBounds=new THREE.Box3().setFromObject(prop);
assert.ok(propBounds.max.x-propBounds.min.x<1.30,'Reference prop must not return to the oversized original');
propBounds.min.toArray().forEach((v,i)=>assert.ok(v>=shootingEnvelope.min[i]-.003));
propBounds.max.toArray().forEach((v,i)=>assert.ok(v<=shootingEnvelope.max[i]+.003));
model.setSport('clay');
const armDiameter=key=>{
 const g=model.root.getObjectByName(`athlete-0-${key}`).geometry;g.computeBoundingBox();
 return g.boundingBox.max.x-g.boundingBox.min.x;
};
const stockHeight=new THREE.Box3().setFromObject(prop.getObjectByName('shooting-stock')).getSize(new THREE.Vector3()).y;
assert.ok(stockHeight>armDiameter('lower')&&stockHeight<armDiameter('upper'),'Stock silhouette must be thicker than the forearm and thinner than the upper arm');

const racket=createTennisRacket(THREE).root;racket.updateMatrixWorld(true);
const racketBounds=new THREE.Box3().setFromObject(racket);
racketBounds.min.toArray().forEach((v,i)=>assert.ok(v>=racketEnvelope.min[i]-1e-6));
racketBounds.max.toArray().forEach((v,i)=>assert.ok(v<=racketEnvelope.max[i]+1e-6));
assert.equal(racket.getObjectByName('racket-string-grid').geometry.attributes.position.count,70);

// Profile surfaces must face outward, so back-face culling cannot hollow the body.
const torso=model.root.children.find(m=>m.isMesh),geometry=torso.geometry;
const normal=new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,20*41);
assert.ok(normal.x>0,'Torso winding must face outward');
// Trousers are one connected surface, with only the waist and two ankle openings.
const trousers=model.root.getObjectByName('continuous-shooting-trousers').geometry;
const edges=new Map(),adjacency=new Map();
for(let i=0;i<trousers.index.count;i+=3){
 const tri=[0,1,2].map(j=>trousers.index.getX(i+j));
 for(let j=0;j<3;j++){
  const a=tri[j],b=tri[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');edges.set(key,(edges.get(key)||0)+1);
  if(!adjacency.has(a))adjacency.set(a,new Set());adjacency.get(a).add(b);
  if(!adjacency.has(b))adjacency.set(b,new Set());adjacency.get(b).add(a);
 }
}
assert.ok([...edges.values()].every(n=>n===1||n===2),'Nonmanifold trouser seam');
assert.equal([...edges.values()].filter(n=>n===1).length,120,'Unexpected open hip/thigh seam');
const seen=new Set(),pending=[0];while(pending.length){const i=pending.pop();if(seen.has(i))continue;seen.add(i);pending.push(...adjacency.get(i));}
assert.equal(seen.size,trousers.attributes.position.count,'Pelvis and legs must form one connected mesh');
// The rowing model must retain the actual measured knees, ankles and wrists in seated poses.
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{const b=await fs.readFile(new URL(url));return {ok:true,json:async()=>JSON.parse(b.toString()),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
await loadCapturedMotions();globalThis.fetch=originalFetch;model.setSport('rowing');
for(const id of ['rowing-arms','rowing-half','rowing-full','tennis-forehand-full','tennis-backhand-full','clay-full','clay-ready','clay-mount','clay-lower'])for(const mirrored of [false,true])for(let time=0;time<=capturedDuration(id);time+=.7){
 model.setSport(id.startsWith('tennis')?'tennis':id.startsWith('clay')?'clay':'rowing');
 const sample=sampleCapturedMotion(id,time,mirrored),coords=sample.coords.map(p=>new THREE.Vector3(...p));
 const original=JSON.stringify(sample.coords);
 anchors.head.position.fromArray(sample.headPosition);anchors.head.quaternion.fromArray(sample.headRotation);anchors.pelvis.quaternion.fromArray(sample.pelvisRotation);
 model.update(coords,sample,anchors);model.root.updateMatrixWorld(true);
 assert.equal(JSON.stringify(sample.coords),original,'Rendering must not alter capture data');
 for(let i=0;i<2;i++)for(const [key,end]of [['upper',2],['lower',4],['thigh',8],['calf',10]]){
  const mesh=model.root.getObjectByName(`athlete-${i}-${key}`),tip=new THREE.Vector3(0,1,0).applyMatrix4(mesh.matrixWorld);
  assert.ok(tip.distanceTo(coords[end+i])<1e-6,`${id}: rendered ${key} moved off the measured joint`);
 }
 const shorts=model.root.getObjectByName(id.startsWith('tennis')?'continuous-tennis-shorts':'continuous-rowing-shorts');
 assert.ok(shorts.geometry.attributes.position.array.every(Number.isFinite),'Invalid seated short surface');
 assert.ok(shorts.geometry.attributes.normal.array.every(Number.isFinite),'Invalid seated garment normals');
}
// Exercise the separate yoga garments in standing, folded and seated configurations.
model.setSport('yoga');
for(const id of ['mountain','warrior','easy-seat','tree','gate','down-dog','plank','forearm-plank','cobra','sphinx','child','tabletop','chair']){
 model.setSport('yoga',id);
 const coords=referencePoses[id].map(p=>new THREE.Vector3(...p));
 const source=JSON.stringify(referencePoses[id]),before=coords.map(p=>p.clone());
 fitYogaArms(coords,id);
 assert.equal(JSON.stringify(referencePoses[id]),source,'Visual arm fitting must not change scoring references');
 if(['mountain','warrior','easy-seat','tree','gate','chair'].includes(id)){
  const torso=coords[0].clone().add(coords[1]).multiplyScalar(.5).distanceTo(coords[6].clone().add(coords[7]).multiplyScalar(.5));
  for(let side=0;side<2;side++){
   assert.ok(Math.abs(coords[side].distanceTo(coords[side+2])/torso-.46)<1e-8);
   assert.ok(Math.abs(coords[side+2].distanceTo(coords[side+4])/torso-.45)<1e-8);
   const oldDirection=before[side+4].clone().sub(before[side+2]).normalize();
   if(id!=='tree')assert.ok(oldDirection.dot(coords[side+4].clone().sub(coords[side+2]).normalize())>.999999);
  }
 }else coords.forEach((p,i)=>assert.ok(p.distanceTo(before[i])<1e-8,'Support contacts must remain fixed'));
 const shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5),hip=coords[6].clone().add(coords[7]).multiplyScalar(.5);
 const axis=shoulder.clone().sub(hip).normalize(),lateral=coords[1].clone().sub(coords[0]).normalize(),forward=new THREE.Vector3().crossVectors(lateral,axis).normalize();
 lateral.crossVectors(axis,forward).normalize();
 anchors.head.position.copy(shoulder).addScaledVector(axis,.21);
 anchors.head.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(lateral,axis,forward));
 model.update(coords,null,anchors);model.root.updateMatrixWorld(true);
 const dedicated=['down-dog','plank','forearm-plank','cobra','sphinx','child','tabletop','chair'].includes(id);
 assert.equal(model.root.getObjectByName('continuous-yoga-outfit').visible,dedicated);
 assert.equal(model.root.getObjectByName('yoga-tank').visible,!dedicated);
 assert.ok(model.root.getObjectByName('yoga-bare-foot').visible);
 const shorts=model.root.getObjectByName(dedicated?'continuous-yoga-outfit':'continuous-yoga-shorts');assert.ok(shorts.visible);
 assert.ok(shorts.geometry.attributes.position.array.every(Number.isFinite),`${id}: invalid yoga shorts`);
 assert.ok(shorts.geometry.attributes.normal.array.every(Number.isFinite),`${id}: invalid yoga normals`);
 const neck=model.root.getObjectByName('athlete-neck');
 if(id==='tree')for(let side=0;side<2;side++)assert.ok(coords[side+4].clone().sub(shoulder).dot(forward)>.20,'Tree palms must clear the shirt front');
 assert.ok(neck.scale.y<.14&&neck.scale.y>.10,`${id}: neck must remain short along the torso axis`);
 model.root.traverse(m=>assert.ok(m.matrixWorld.elements.every(Number.isFinite),`${id}: invalid yoga transform`));
}
model.setSport('tennis');
assert.equal(model.root.getObjectByName('continuous-yoga-outfit').visible,false);
assert.equal(model.root.getObjectByName('yoga-bare-foot').visible,false);
assert.equal(model.root.getObjectByName('athlete-head').scale.x,1);
// Downward dog must keep the chest toward the mat and the back continuous with the arms.
const dog=referencePoses['down-dog'].map(p=>new THREE.Vector3(...p));
const dogAxis=dog[0].clone().sub(dog[6]).normalize(),dogLateral=dog[1].clone().sub(dog[0]).normalize();
assert.ok(new THREE.Vector3().crossVectors(dogLateral,dogAxis).y<-.5,'Dog chest must face down');
assert.ok(dog[4].x>dog[0].x&&dog[10].x<dog[6].x,'Dog must match reference hand/foot direction');
for(let side=0;side<2;side++){
 const upper=dog[side+2].clone().sub(dog[side]).normalize(),lower=dog[side+4].clone().sub(dog[side+2]).normalize();
 assert.ok(upper.dot(lower)>.999,'Dog elbows must stay extended');
 assert.ok(upper.clone().setZ(0).normalize().dot(dogAxis.clone().setZ(0).normalize())>.999,'Dog back and arms must form one line in side view');
 assert.ok(dog[side].distanceTo(dog[side+2])<.32,'Dog upper arms must not stretch');
 assert.equal(dog[side+4].y,.05,'Dog palms must reach the mat');
}
const female=createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial(),skin:new THREE.MeshStandardMaterial(),gender:'female'});
for(const pose of poses){
 female.setSport(pose.type,pose.id);
 const sample=pose.motion?sampleMotion(pose.motion,1):null;
 const coords=(sample?.coords??referencePoses[pose.id]).map(p=>new THREE.Vector3(...p));
 if(pose.type==='yoga')fitYogaArms(coords,pose.id);
 if(sample){anchors.head.position.fromArray(sample.headPosition);anchors.head.quaternion.fromArray(sample.headRotation);anchors.pelvis.quaternion.fromArray(sample.pelvisRotation);}
 else{anchors.head.position.copy(coords[0]).add(coords[1]).multiplyScalar(.5).add(new THREE.Vector3(0,.21,0));anchors.head.quaternion.identity();}
 const source=coords.map(p=>p.toArray());female.update(coords,sample,anchors);female.root.updateMatrixWorld(true);
 assert.deepEqual(coords.map(p=>p.toArray()),source,'Variant must not alter joint coordinates');
 assert.ok(female.root.getObjectByName('athlete-head').position.distanceTo(anchors.head.position)<1e-9,'Variant must preserve the captured head anchor');
 assert.equal(female.root.getObjectByName('female-leggings').visible,!['clay','rowing','tennis','stretch','gentle'].includes(pose.type));
 female.root.traverse(m=>{assert.ok(m.matrixWorld.elements.every(Number.isFinite),`${pose.id}: female transform`);if(m.isMesh&&m.visible)assert.ok(m.geometry.attributes.position.array.every(Number.isFinite),`${pose.id}: female surface`);});
}
console.log('PASS: contoured athlete surfaces, outward normals, finite animation, yoga garments, both model variants across all movements, preserved anchors and reusable geometry.');
