// Shared dimensions for the hand mesh, wrist IK and racket attachment.
export const tennisGrip = {radius:.0185,spacing:.095,buttToLowerHand:.05,wrist:[-.085,-.012,0]};
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=a=>mul(a,1/(Math.hypot(...a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

export function gripFrame(center,axis,shoulder,forward) {
 const y=unit(axis),toward=sub(center,shoulder);
 let radial=sub(toward,mul(y,dot(toward,y)));
 if(Math.hypot(...radial)<1e-6)radial=sub(forward,mul(y,dot(forward,y)));
 if(Math.hypot(...radial)<1e-6)radial=cross(y,Math.abs(y[0])<.9?[1,0,0]:[0,0,1]);
 const x=unit(radial),z=unit(cross(x,y));
 const offset=add(mul(x,tennisGrip.wrist[0]),mul(y,tennisGrip.wrist[1]));
 return {center:[...center],x,y,z,wrist:add(center,offset),mirrored:false};
}

export function mirrorGrip(frame) {
 if(!frame)return null;
 const reflect=v=>[-v[0],v[1],v[2]];
 // Keep a proper rotation; reflect the mesh's local Z separately.
 return {...frame,...(frame.forearm?{forearm:reflect(frame.forearm)}:{}),center:reflect(frame.center),wrist:reflect(frame.wrist),
  x:reflect(frame.x),y:reflect(frame.y),z:mul(reflect(frame.z),-1),mirrored:!frame.mirrored};
}
