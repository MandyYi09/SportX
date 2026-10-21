import assert from 'node:assert/strict';
import * as THREE from '../src/vendor/three.module.js';
import {createAthleteModel} from '../src/athlete-model.mjs';
import {referencePoses} from '../src/reference.mjs';
const models=['male','female'].map(gender=>createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial(),skin:new THREE.MeshStandardMaterial(),gender}));
const width=g=>{g.computeBoundingBox();return g.boundingBox.max.x-g.boundingBox.min.x;};
const anchors={head:new THREE.Object3D(),pelvis:new THREE.Object3D(),feet:[new THREE.Object3D(),new THREE.Object3D()]};
anchors.head.position.set(0,1.75,0);
anchors.head.quaternion.setFromEuler(new THREE.Euler(.22,.3,.12));
const originalAnchor=anchors.head.quaternion.clone();
for(const sport of ['stretch','gentle','yoga','rowing','tennis','clay']){
 for(const [index,model] of models.entries()){
  model.setSport(sport,'mountain');
  const head=model.root.getObjectByName('athlete-head');
  assert.equal(model.root.getObjectByName('tied-back-hair').visible,index===1,'One tied hairstyle across female outfits');
  assert.equal(model.root.getObjectByName('shoulder-length-hair'),undefined,'Remove paired hanging hair blocks');
  assert.equal(head.children[3].visible,!['rowing','clay'].includes(sport),'Restore original neutral eyes');
  assert.equal(head.children[4].visible,sport==='clay','White eyes remain specific to aiming');
  assert.equal(model.root.getObjectByName('female-wellness-outfit').visible,index===1&&sport==='yoga');
  const coords=referencePoses.mountain.map(p=>new THREE.Vector3(...p)),before=coords.map(p=>p.toArray());
  model.update(coords,null,anchors);
  assert.deepEqual(coords.map(p=>p.toArray()),before,'Display tailoring cannot modify source joints');
  assert.ok(head.position.distanceTo(anchors.head.position)<1e-12);
  if(sport==='rowing'){
   assert.ok(Math.abs(new THREE.Vector3(0,0,1).applyQuaternion(head.quaternion).y)<1e-12,'Rowing gaze must be level');
   assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(head.quaternion).distanceTo(new THREE.Vector3(0,1,0))<1e-12,'Sunglasses must not roll');
   assert.ok(Math.abs(head.scale.y/head.scale.x-.89)<1e-12,'Shorten rowing face for both variants');
  }else assert.ok(head.quaternion.angleTo(originalAnchor)<1e-7,'Other head orientations remain unchanged');
  assert.ok(anchors.head.quaternion.angleTo(originalAnchor)<1e-7,'Never mutate captured head anchors');
 }
 assert.deepEqual(models[0].root.getObjectByName('athlete-head').children[0].geometry.attributes.position.array,models[1].root.getObjectByName('athlete-head').children[0].geometry.attributes.position.array,'Restore original face geometry');
 if(['yoga','stretch','gentle'].includes(sport))assert.ok(width(models[1].root.getObjectByName('athlete-0-upper').geometry)<width(models[0].root.getObjectByName('athlete-0-upper').geometry)*.9,'Slimmer wellness arms');
}
const tail=models[1].root.getObjectByName('single-ponytail');
assert.equal(tail.children.filter(m=>m.name.startsWith('ponytail-lock-')).length,9,'Use overlapping locks rather than a conical tube');
const p=tail.getObjectByName('ponytail-volume').geometry.attributes.position;
const ring=row=>{const center=new THREE.Vector3();for(let j=0;j<24;j++)center.add(new THREE.Vector3().fromBufferAttribute(p,row*25+j));center.multiplyScalar(1/24);let radius=0;for(let j=0;j<24;j++)radius+=center.distanceTo(new THREE.Vector3().fromBufferAttribute(p,row*25+j))/24;return {center,radius};};
assert.ok(ring(16).radius>ring(0).radius*2,'Gathered hair expands below the tie');
assert.ok(ring(32).radius>ring(16).radius*.8,'Keep volume through the middle instead of forming a cone');
const ends=tail.children.filter(m=>m.name.startsWith('ponytail-lock-')).map(m=>{m.geometry.computeBoundingBox();return m.geometry.boundingBox.min.y;});
assert.ok(Math.max(...ends)-Math.min(...ends)>.05,'Layered ends should have different lengths');
assert.ok(Math.min(...ends)<-.34,'Ponytail should extend below the nape');
tail.traverse(m=>{if(m.isMesh)for(const key of ['position','normal'])assert.ok(m.geometry.attributes[key].array.every(Number.isFinite));});
console.log('PASS: wellness silhouette, restored face/eyes, unchanged source anchors, level rowing gaze and one gathered ponytail with full middle and layered ends.');
