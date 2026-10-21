// Retarget the illustrative standing/seated arms without changing scoring references.
// Contact poses keep their support points; moving a wrist there would break the pose.
const contactPoses=new Set(['down-dog','plank','forearm-plank','cobra','sphinx','child','tabletop','staff']);
export function fitYogaArms(coords,pose){
 if(contactPoses.has(pose))return;
 const shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5);
 const hip=coords[6].clone().add(coords[7]).multiplyScalar(.5);
 const torso=shoulder.distanceTo(hip);
 for(let side=0;side<2;side++){
  const upper=coords[side+2].clone().sub(coords[side]).normalize();
  const lower=coords[side+4].clone().sub(coords[side+2]).normalize();
  coords[side+2].copy(coords[side]).addScaledVector(upper,torso*.46);
  coords[side+4].copy(coords[side+2]).addScaledVector(lower,torso*.45);
 }
 if(pose==='tree'){
  const axis=shoulder.clone().sub(hip).normalize(),lateral=coords[1].clone().sub(coords[0]).normalize();
  const forward=lateral.clone().cross(axis).normalize();
  for(let side=0;side<2;side++){
   const sign=side===0?-1:1;
   const wrist=shoulder.clone().addScaledVector(axis,-torso*.25).addScaledVector(forward,.205).addScaledVector(lateral,sign*.027);
   const reach=wrist.clone().sub(coords[side]),distance=reach.length();reach.normalize();
   const a=torso*.46,b=torso*.45,along=(a*a-b*b+distance*distance)/(2*distance);
   const bend=axis.clone().negate().addScaledVector(lateral,sign*.5);bend.addScaledVector(reach,-bend.dot(reach)).normalize();
   coords[side+2].copy(coords[side]).addScaledVector(reach,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
   coords[side+4].copy(wrist);
  }
 }
}
