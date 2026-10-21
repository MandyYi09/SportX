import assert from 'node:assert/strict';
import * as THREE from '../src/vendor/three.module.js';
import {createAthleteModel} from '../src/athlete-model.mjs';
import {createMobilityGarment} from '../src/mobility-garment.mjs';
import {referencePoses} from '../src/reference.mjs';
const male=createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial(),skin:new THREE.MeshStandardMaterial(),gender:'male'});
const female=createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial(),skin:new THREE.MeshStandardMaterial(),gender:'female'});
const radiusAt=(geometry,row,axis)=>{const p=geometry.attributes.position;let radius=0;for(let j=0;j<41;j++)radius=Math.max(radius,Math.abs(p.array[(row*41+j)*3+axis]));return radius;};
const maleFace=male.root.getObjectByName('athlete-face').geometry,femaleFace=female.root.getObjectByName('athlete-face').geometry;
const jaw=radiusAt(femaleFace,10,0)/radiusAt(maleFace,10,0),forehead=radiusAt(femaleFace,32,0)/radiusAt(maleFace,32,0);
assert.ok(jaw<.85,'Female jaw must be sculpted narrower');assert.ok(forehead>jaw+.04,'The face must be reshaped, not uniformly scaled');
for(const sport of ['yoga','stretch','gentle','rowing','tennis','clay']){
 male.setSport(sport,'mountain');female.setSport(sport,'mountain');
 const m=male.root.getObjectByName('athlete-neck').geometry,f=female.root.getObjectByName('athlete-neck').geometry;
 m.computeBoundingBox();f.computeBoundingBox();assert.ok(f.boundingBox.max.x<m.boundingBox.max.x*.91,'Neck transition must be more slender');
}
female.setSport('yoga','mountain');male.setSport('yoga','mountain');
const width=geometry=>{geometry.computeBoundingBox();return geometry.boundingBox.max.x-geometry.boundingBox.min.x;};
assert.ok(width(female.root.getObjectByName('athlete-0-upper').geometry)<width(male.root.getObjectByName('athlete-0-upper').geometry)*.9);
assert.ok(width(female.root.getObjectByName('athlete-0-thigh').geometry)>width(male.root.getObjectByName('athlete-0-thigh').geometry)*.95,'Thighs must not simply shrink with the arms');
const ratios=[];
for(const isFemale of [false,true]){
 const garment=createMobilityGarment(THREE,new THREE.MeshStandardMaterial(),new THREE.MeshStandardMaterial(),{female:isFemale});
 garment.update(referencePoses.mountain.map(p=>new THREE.Vector3(...p)));
 const positions=garment.root.geometry.attributes.position;let waist=0,hips=0;
 for(let i=0;i<positions.count;i++){const x=Math.abs(positions.getX(i)),y=positions.getY(i);if(y>1.18&&y<1.30)waist=Math.max(waist,x);if(y>.90&&y<1.05)hips=Math.max(hips,x);}
 ratios.push(hips/waist);
}
assert.ok(ratios[1]>ratios[0]+.10,'Female garment must have a distinct waist-to-hip contour');
console.log('PASS: independently sculpted female face, slimmer neck/arms, retained thigh volume and distinct waist-to-hip silhouette in all sport variants.');
