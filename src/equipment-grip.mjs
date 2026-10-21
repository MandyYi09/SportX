// Geometry-only attachments for the visual rowing and clay demonstrations.
export const rowingGrip={radius:.023,wrist:[-.085,-.012,0],oarLength:2.25};
export const clayGrip={radius:.035,wrist:[-.097,-.012,0],spacing:.52,rear:[-.09,-.06,0]};
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const unit=a=>mul(a,1/(Math.hypot(...a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function perpendicular(direction,axis){
 let v=sub(direction,mul(axis,dot(direction,axis)));
 if(Math.hypot(...v)<1e-6)v=cross(axis,Math.abs(axis[1])<.9?[0,1,0]:[1,0,0]);
 return unit(v);
}
function frame(center,x,y,spec){
 const z=unit(cross(x,y));
 return {center,x,y,z,wrist:add(add(center,mul(x,spec.wrist[0])),mul(y,spec.wrist[1])),mirrored:false};
}

export function rowingAttachment(wrist,side,pivotOverride=null) {
 // The palm stays above the handle instead of rolling into an underhand fist
 // when the elbow drops below the wrist near the end of the stroke.
 const pivot=pivotOverride||[-.13,1,side*.64],direction=[-1,-.4,0];
 let center=add(wrist,mul(unit(direction),.085));
 // Solve the hand and oar together: the shaft passes through the grasp center
 // and the fixed oarlock, while the model wrist stays attached to the palm.
 for(let i=0;i<32;i++){
  const y=unit(sub(pivot,center)),x=perpendicular(direction,y);
  center=sub(sub(wrist,mul(x,rowingGrip.wrist[0])),mul(y,rowingGrip.wrist[1]));
 }
 const y=unit(sub(pivot,center)),x=perpendicular(direction,y);
 const hand=frame(center,x,y,rowingGrip);
 const start=sub(center,mul(y,.075)),end=add(start,mul(y,rowingGrip.oarLength));
 return {hand,pivot,start,end,axis:y};
}

export function clayAttachment(rear,axis) {
 const gunX=unit(axis),gunY=perpendicular([0,1,0],gunX),gunZ=unit(cross(gunX,gunY));
 const hands=[frame(add(rear,mul(gunX,clayGrip.spacing)),gunY,gunX,clayGrip),frame(rear,gunY,gunX,clayGrip)];
 const origin=sub(sub(rear,mul(gunX,clayGrip.rear[0])),mul(gunY,clayGrip.rear[1]));
 return {hands,origin,x:gunX,y:gunY,z:gunZ,mirrored:false};
}
