import {tennisGrip} from './tennis-grip.mjs';
import {createRowingHand} from './rowing-hand.mjs';

export function createTennisHand(THREE,material,side) {
 return createWrappedHand(THREE,material,side,tennisGrip);
}

export function createWrappedHand(THREE,material,side,spec=tennisGrip) {
 if(spec.thumbAtButt)return createRowingHand(THREE,material,side,spec);
 const root=new THREE.Group();
 const extra=spec.radius-.023;
 const palm=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);
 palm.scale.set(.030,.038,.031+extra);palm.position.set(-.052-extra,0,0);root.add(palm);
 function tube(points,radius) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,20,radius,8,false),material);root.add(mesh);
  for(const p of [points[0],points.at(-1)]){
   const end=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),material);end.position.set(...p);root.add(end);
  }
 }
 // Four fingers curl across the handle, with separate axial positions.
 for(const [i,y]of [-.028,-.010,.009,.027].entries()){
  const r=spec.radius+.009;
  const points=Array.from({length:8},(_,j)=>{
   const angle=-2.35+j/7*4.15;
   return [r*Math.cos(angle),y+(i===3?.004:0)*j/7,side*r*Math.sin(angle)];
  });
  tube(points,i===0?.008:.009);
 }
 // Opposing thumb closes diagonally over the finger bases.
 tube([[-.065-extra,.032,side*(.026+extra)],[-.042-extra,.043,side*(.034+extra)],[-.012,.032,side*(.038+extra)],[.012,.013,side*(.034+extra)]],.012);
 const wristLink=new THREE.Mesh(new THREE.CylinderGeometry(.024,.024,1,12),material);root.add(wristLink);
 const wristCap=new THREE.Mesh(new THREE.SphereGeometry(.024,12,8),material);root.add(wristCap);
 const defaultWrist=[...spec.wrist],palmEnd=new THREE.Vector3(-.066-extra,-.006,0);
 function setWristOffset(offset=defaultWrist){
  const start=new THREE.Vector3(...offset),axis=palmEnd.clone().sub(start),length=axis.length();
  wristCap.position.copy(start);wristLink.position.copy(start).lerp(palmEnd,.5);
  wristLink.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());wristLink.scale.y=length;
 }
 setWristOffset();
 return {root,setWristOffset};
}

export function placeTennisHand(THREE,hand,frame) {
 hand.setWristOffset?.(frame.wristOffset);
 hand.setForearm?.(frame);
 hand.root.position.fromArray(frame.center);
 hand.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  new THREE.Vector3(...frame.x),new THREE.Vector3(...frame.y),new THREE.Vector3(...frame.z)));
 hand.root.scale.set(1,1,frame.mirrored?-1:1);
}

export function createRelaxedHand(THREE,material,side) {
 const root=new THREE.Group();
 const palm=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),material);
 palm.scale.set(.045,.022,.038);palm.position.x=.04;root.add(palm);
 for(const [i,z]of [-.028,-.009,.010,.028].entries()){
  const length=[.048,.065,.060,.044][i];
  const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.009,length,4,10),material);
  finger.rotation.z=-Math.PI/2+.12;finger.position.set(.075+length/2,-.008,z);root.add(finger);
 }
 const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.012,.040,4,10),material);
 thumb.rotation.z=-.65;thumb.position.set(.042,-.010,side*.045);root.add(thumb);
 return {root,grip:new THREE.Vector3()};
}
