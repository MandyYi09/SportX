import assert from 'node:assert/strict';
import * as THREE from '../src/vendor/three.module.js';
import {createAthleteModel} from '../src/athlete-model.mjs';
import {sampleMotion} from '../src/motion-rig.mjs';
import {motionClips} from '../src/motion-catalog.mjs';

const model=createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial(),skin:new THREE.MeshStandardMaterial()});
const anchors={head:new THREE.Object3D(),pelvis:new THREE.Object3D(),feet:[new THREE.Object3D(),new THREE.Object3D()]};
const geometries=new Set();
model.root.traverse(m=>{if(m.isMesh){geometries.add(m.geometry);assert.ok(m.geometry.attributes.normal.array.every(Number.isFinite));}});
for(const clip of motionClips)for(const mirrored of [false,true])for(const time of [0,.5,2,4]){
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
// Profile surfaces must face outward, so back-face culling cannot hollow the body.
const torso=model.root.children.find(m=>m.isMesh),geometry=torso.geometry;
const normal=new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal,20*41);
assert.ok(normal.x>0,'Torso winding must face outward');
console.log('PASS: contoured athlete surfaces, outward normals, finite animation and mirrored transforms, reusable geometry.');
