import {fitYogaArms} from './yoga-proportions.mjs';

// Display fitting only. Camera scoring continues to use the original references.
export function fitMobilityArms(coords,pose,flipped=false){
 if(pose==='triceps'){
  const center=coords[0].clone().add(coords[1]).multiplyScalar(.5),hip=coords[6].clone().add(coords[7]).multiplyScalar(.5);
  const up=center.clone().sub(hip).normalize(),front=coords[1].clone().sub(coords[0]).cross(up).normalize(),length=center.distanceTo(hip);
  // A raised shoulder girdle and mild thoracic extension move the whole upper body.
  for(const i of [0,1])coords[i].addScaledVector(front,-length*.07).addScaledVector(up,length*.012);
 }
 if(pose==='cross-body'){
  const up=coords[0].clone().add(coords[1]).sub(coords[6]).sub(coords[7]).normalize();
  const front=coords[1].clone().sub(coords[0]).cross(up).normalize();
  coords[flipped?1:0].addScaledVector(front,.025);
 }
 fitYogaArms(coords,pose);
 if(pose!=='cross-body'&&pose!=='triceps')return;
 const shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5);
 const hip=coords[6].clone().add(coords[7]).multiplyScalar(.5);
 const torso=shoulder.distanceTo(hip),up=shoulder.clone().sub(hip).normalize();
 const across=coords[1].clone().sub(coords[0]).normalize();
 const front=across.clone().cross(up).normalize();
 const active=flipped?1:0,other=active^1,inward=active===0?1:-1;
 const elbow=coords[active+2],wrist=coords[active+4],support=coords[other+4];
 if(pose==='cross-body'){
  // The stretched arm passes in front of the shirt, rather than through the chest.
  elbow.copy(coords[active]).addScaledVector(across,inward*torso*.246).addScaledVector(up,-torso*.085).addScaledVector(front,torso*.423);
  wrist.copy(elbow).addScaledVector(across,inward*torso*.43).addScaledVector(up,torso*.038).addScaledVector(front,.01);
  support.copy(elbow).addScaledVector(front,.078).addScaledVector(up,-.025);
 }else{
  // The reference folds one hand onto the upper back. The other arm arches
  // behind the crown, with its palm cupping the raised elbow from above/back.
  elbow.copy(coords[active]).addScaledVector(up,torso*.58).addScaledVector(across,inward*.02).addScaledVector(front,-.025);
  wrist.copy(shoulder).addScaledVector(up,torso*.12).addScaledVector(front,-.145).addScaledVector(across,-inward*.02);
  support.copy(elbow).addScaledVector(up,.065).addScaledVector(front,-.055).addScaledVector(across,inward*.085);
 }
 const start=coords[other],reach=support.clone().sub(start),distance=reach.length();reach.normalize();
 const a=torso*(pose==='triceps'?.58:.46),b=torso*(pose==='triceps'?.47:.45);
 const along=(a*a-b*b+distance*distance)/(2*distance);
 const bend=pose==='triceps'?up.clone().addScaledVector(front,-.35):up.clone().negate().addScaledVector(across,-inward*.35);
 bend.addScaledVector(reach,-bend.dot(reach)).normalize();
 coords[other+2].copy(start).addScaledVector(reach,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
}

// Hands follow the same torso frame: fingers rest down the back or cup the elbow.
export function orientMobilityHand(THREE,hand,coords,pose,side,flipped=false){
 if(pose!=='triceps')return false;
 const shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5),hip=coords[6].clone().add(coords[7]).multiplyScalar(.5);
 const up=shoulder.sub(hip).normalize(),across=coords[1].clone().sub(coords[0]).normalize(),front=across.clone().cross(up).normalize();
 const active=flipped?1:0,inward=active===0?1:-1;
 const x=side===active?up.clone().negate().addScaledVector(across,inward*.08):across.clone().multiplyScalar(-inward*.8).addScaledVector(up,-.4).addScaledVector(front,.4);
 x.normalize();const y=(side===active?front.clone().negate():up.clone().addScaledVector(front,-.4));y.addScaledVector(x,-x.dot(y)).normalize();
 const z=x.clone().cross(y).normalize();
 hand.root.position.copy(coords[side+4]);hand.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
 return true;
}
