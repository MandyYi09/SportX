import {Vector3,Matrix4,Quaternion} from './vendor/three.module.js';
import {tennisGrip,mirrorGrip} from './tennis-grip.mjs';
import {shootingGrip,shootingRearGrip} from './shooting-model.mjs';
import {measureShootingClearance} from './shooting-clearance.mjs';

const vec=a=>new Vector3(...a);
function radial(axis,direction){
 const x=direction.clone().addScaledVector(axis,-direction.dot(axis));
 if(x.lengthSq()<1e-8){x.set(0,1,0).addScaledVector(axis,-axis.y);}
 if(x.lengthSq()<1e-8){x.set(0,0,1).addScaledVector(axis,-axis.z);}
 return x.normalize();
}
function handFrame(wrist,x,y,spec){
 // Solve the illustrative palm around the measured wrist; never move the wrist.
 const center=vec(wrist).addScaledVector(x,-spec.wrist[0]).addScaledVector(y,-spec.wrist[1]);
 return {center:center.toArray(),wrist:[...wrist],x:x.toArray(),y:y.toArray(),z:new Vector3().crossVectors(x,y).normalize().toArray(),mirrored:false};
}
export function capturedTennis(coords,rightRotation,localShaft,twoHands){
 const extension=new Vector3(-1,0,0).applyQuaternion(rightRotation);
 const axis=twoHands?vec(coords[4]).sub(vec(coords[5])).normalize():localShaft.clone().applyQuaternion(rightRotation).normalize();
 const x=radial(axis,extension),right=handFrame(coords[5],x,axis,tennisGrip);
 const left=twoHands?handFrame(coords[4],x,axis,tennisGrip):null;
 const rotation=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,axis,vec(right.z)));
 return {tennisHands:[left,right],racketDirection:axis.toArray(),racketRotation:rotation.toArray(),racketPosition:vec(right.center).addScaledVector(axis,-tennisGrip.buttToLowerHand).toArray()};
}
export function capturedClay(coords,bodyUp,rightRotation,localShaft){
 const distance=vec(coords[4]).distanceTo(vec(coords[5]));
 // Wrist joints are not the grip centres: the rear palm sits beside the stock,
 // while the forward palm is underneath the fore-end. Solve the prop between
 // those two distinct palm offsets without changing a single captured joint.
 const rearDirection=(up,side)=>side.clone().negate();
 const supportDirection=(up,side)=>up.clone().multiplyScalar(Math.cos(Math.PI/6)).addScaledVector(side,.5);
 // After the support hand releases, the rear hand carries the same rigid prop.
 const release=Math.max(0,Math.min(1,(distance-.48)/.12));
 const carried=localShaft.clone().applyQuaternion(rightRotation).normalize();
 const vectors=coords.map(vec),bodyAxis=bodyUp.clone().normalize(),delta=vec(coords[4]).sub(vec(coords[5])),height=delta.dot(bodyAxis);
 function attachment(rearDistance){
  const spec={...shootingRearGrip,wrist:[-rearDistance,shootingRearGrip.wrist[1],0]};
  const verticalOffset=-shootingGrip.wrist[0]*Math.cos(Math.PI/6),sideOffset=rearDistance-shootingGrip.wrist[0]*.5;
  const horizontal=delta.clone().addScaledVector(bodyAxis,-height),horizontalSquared=horizontal.lengthSq()-sideOffset*sideOffset;
  const alongSquared=delta.lengthSq()-verticalOffset*verticalOffset-sideOffset*sideOffset;
  const attached=horizontalSquared>0&&alongSquared>0&&distance<=.48,axis=carried.clone();
  if(horizontalSquared>0&&alongSquared>0){
   const along=Math.sqrt(alongSquared),horizontalAlong=Math.sqrt(horizontalSquared);
   const heading=horizontal.normalize().applyAxisAngle(bodyAxis,-Math.atan2(sideOffset,horizontalAlong));
   const pitch=Math.atan2(verticalOffset,along)+Math.atan2(height,horizontalAlong);
   axis.copy(heading.multiplyScalar(Math.cos(pitch)).addScaledVector(bodyAxis,Math.sin(pitch)).normalize());
   axis.lerp(carried,release*release*(3-2*release)).normalize();
  }
  const up=radial(axis,bodyUp),side=new Vector3().crossVectors(axis,up).normalize();
  const rear=handFrame(coords[5],rearDirection(up,side),axis,spec);rear.gripRole='rear';rear.wristOffset=spec.wrist;
  const support=attached?handFrame(coords[4],supportDirection(up,side),axis,shootingGrip):null;
  const origin=vec(rear.center).addScaledVector(axis,-shootingGrip.rear[0]).addScaledVector(up,-shootingGrip.rear[1]);
  const prop={origin:origin.toArray(),x:axis.toArray(),y:up.toArray(),z:side.toArray(),hands:[support,rear],mirrored:false};
  const hits=measureShootingClearance(vectors,prop,{includeUpper:false});
  return {prop,score:Math.max(...hits.map(h=>h.max)),distance:rearDistance};
 }
 // Place the stock on the torso side of the unchanged forearm, including the
 // ready phase. Only prop/finger offsets vary; no captured joint is retargeted.
 let best=attachment(.11);
 for(let r=.12;best.score>.001&&r<=.2401;r+=.01){const candidate=attachment(r);if(candidate.score<best.score)best=candidate;}
 return {equipmentHands:best.prop.hands,clayProp:best.prop};
}
export function reflectCaptured(sample){
 const reflect=v=>[-v[0],v[1],v[2]],rotation=q=>[q[0],-q[1],-q[2],q[3]];
 sample.coords=sample.coords.map((_,i)=>reflect(sample.coords[i%2===0?i+1:i-1]));
 for(const key of ['headPosition','neckPosition','racketPosition','racketDirection'])if(sample[key])sample[key]=reflect(sample[key]);
 sample.spine=sample.spine.map(reflect);sample.toePositions=sample.toePositions.slice().reverse().map(reflect);
 for(const key of ['headRotation','torsoRotation','pelvisRotation'])sample[key]=rotation(sample[key]);
 if(sample.racketRotation){
  const hand=mirrorGrip(sample.tennisHands[1]);
  sample.racketRotation=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(vec(hand.x),vec(hand.y),vec(hand.z))).toArray();
 }
 if(sample.tennisHands)sample.tennisHands=[mirrorGrip(sample.tennisHands[1]),mirrorGrip(sample.tennisHands[0])];
 if(sample.equipmentHands)sample.equipmentHands=[mirrorGrip(sample.equipmentHands[1]),mirrorGrip(sample.equipmentHands[0])];
 if(sample.clayProp){const p=sample.clayProp;sample.clayProp={...p,origin:reflect(p.origin),x:reflect(p.x),y:reflect(p.y),z:reflect(p.z).map(v=>-v),hands:sample.equipmentHands,mirrored:true};}
 return sample;
}
