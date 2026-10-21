import assert from 'node:assert/strict';
import * as THREE from '../src/vendor/three.module.js';
import {poses} from '../src/exercises.mjs';
import {getReference,referencePoses} from '../src/reference.mjs';
import {createAthleteModel} from '../src/athlete-model.mjs';
import {fitMobilityArms,orientMobilityHand} from '../src/mobility-proportions.mjs';
import {createRelaxedHand} from '../src/tennis-hand.mjs';
const before=JSON.stringify(referencePoses),targets=poses.filter(p=>['stretch','gentle'].includes(p.type));
const models=['male','female'].map(gender=>createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial(),skin:new THREE.MeshStandardMaterial(),gender}));
const anchors={head:new THREE.Object3D(),pelvis:new THREE.Object3D(),feet:[new THREE.Object3D(),new THREE.Object3D()]};
for(const model of models){
 const garment=model.root.getObjectByName('continuous-mobility-outfit'),geometry=garment.geometry;
 const initialGeometry=geometry;
 for(const pose of targets)for(const flipped of [false,true]){
  const coords=getReference(pose.id,flipped).map(p=>new THREE.Vector3(...p)),fixed=coords.slice(6).map(p=>p.clone());
  fitMobilityArms(coords,pose.id,flipped);
  coords.slice(6).forEach((p,i)=>assert.ok(p.distanceTo(fixed[i])<1e-12,'Display fitting must keep pelvis and legs anchored'));
  const shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5),hip=coords[6].clone().add(coords[7]).multiplyScalar(.5),up=shoulder.clone().sub(hip).normalize();
  const across=coords[1].clone().sub(coords[0]).normalize(),front=across.clone().cross(up).normalize();
  across.crossVectors(up,front).normalize();
  anchors.head.position.copy(shoulder).addScaledVector(up,.21);anchors.head.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,up,front));
  if(pose.id==='triceps'){anchors.head.position.addScaledVector(across,flipped?-.02:.02);anchors.head.rotateZ(flipped?.06:-.06);}
  model.setSport(pose.type,pose.id);model.update(coords,null,anchors);model.root.updateMatrixWorld(true);
  assert.equal(garment.visible,true);assert.equal(garment.geometry,initialGeometry,'Reuse the connected garment geometry');
  assert.equal(model.root.getObjectByName('female-leggings').visible,false);
  assert.equal(model.root.getObjectByName('continuous-yoga-outfit').visible,false);
  for(const key of ['position','normal'])assert.ok(geometry.attributes[key].array.every(Number.isFinite),`${pose.id}: finite ${key}`);
  model.root.traverse(m=>assert.ok(m.matrixWorld.elements.every(Number.isFinite),`${pose.id}: finite transforms`));
  if(pose.id==='triceps'){
   const active=flipped?1:0,support=active^1;
   assert.ok(shoulder.z<-.035,'Shoulders and chest must extend backward with the overhead stretch');
   assert.ok(coords[active+4].clone().sub(shoulder).dot(front)<-.13,'Active hand rests on the upper back');
   assert.ok(coords[support+2].clone().sub(shoulder).dot(front)<-.08,'Supporting elbow must go behind the head');
   assert.ok(coords[support+4].clone().sub(coords[active+2]).dot(up)>.045,'Supporting palm cups the raised elbow');
   assert.ok(coords[active+2].clone().sub(shoulder).dot(up)>.36,'Raised elbow must clear the crown');
   for(const [a,b]of [[0,2],[2,4],[1,3],[3,5]])for(let t=.15;t<1;t+=.05){
    const p=coords[a].clone().lerp(coords[b],t).sub(anchors.head.position).applyQuaternion(anchors.head.quaternion.clone().invert());
    const expanded=(p.x/.13)**2+(p.y/.17)**2+(p.z/.13)**2;
    assert.ok(expanded>1,`${flipped}: arm segment ${a}/${b} must clear the head`);
   }
   for(const side of [0,1]){
    const hand=createRelaxedHand(THREE,new THREE.MeshStandardMaterial(),side===0?-1:1);
    assert.ok(orientMobilityHand(THREE,hand,coords,pose.id,side,flipped));
    const fingers=new THREE.Vector3(1,0,0).applyQuaternion(hand.root.quaternion);
    if(side===active)assert.ok(fingers.dot(up)<-.95,'Fingers must lie down the upper back');
   }
  }
  if(pose.id==='cross-body'){
   const active=flipped?1:0;
   for(let t=.65;t<=1;t+=.1){
    const p=coords[active].clone().lerp(coords[active+2],t).sub(shoulder);
    assert.ok(p.dot(front)>.16,'Cross-body upper arm must clear the shirt front');
   }
  }
 }
 // Only a neck opening and two ankle cuffs; no open waist, crotch or hip seams.
 const edges=new Map(),adjacency=new Map();
 for(let i=0;i<geometry.index.count;i+=3){const tri=[0,1,2].map(j=>geometry.index.getX(i+j));for(let j=0;j<3;j++){
  const a=tri[j],b=tri[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');edges.set(key,(edges.get(key)||0)+1);
  if(!adjacency.has(a))adjacency.set(a,new Set());adjacency.get(a).add(b);
 }}
 assert.ok([...edges.values()].every(n=>n<=2),'Outfit must have no non-manifold seam');
 assert.equal([...edges.values()].filter(n=>n===1).length,48*3,'Only neckline and ankle cuffs may remain open');
 const seen=new Set(),queue=[0];while(queue.length){const id=queue.pop();if(seen.has(id))continue;seen.add(id);queue.push(...adjacency.get(id));}
 assert.equal(seen.size,geometry.attributes.position.count,'Shirt, waist, crotch and both legs must form one connected surface');
 model.setSport('yoga','mountain');assert.equal(garment.visible,false,'Other sports must hide the casual outfit');
}
assert.equal(JSON.stringify(referencePoses),before,'Display fitting must not change scoring references');
console.log('PASS: all Mobility poses and mirrors, both models, connected shirt/trousers, stable pelvis/legs, head clearance, rear support-arm path, back-facing palm and linked thoracic extension.');
