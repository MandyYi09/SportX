// Horizontal body orientation only. MediaPipe depth is an estimate, not camera calibration.
const TAU=Math.PI*2;
export const wrapYaw=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
export const yawDistance=(a,b)=>Math.abs(wrapYaw(a-b));
const finite3=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const seen=p=>p&&Number.isFinite(p.visibility)&&p.visibility>=.55&&p.x>.015&&p.x<.985&&p.y>.015&&p.y<.985;
const normalize=v=>{const d=Math.hypot(...v);return d>1e-5?v.map(x=>x/d):null;};
export function sourceLateral(coords){
 const s=[coords[1][0]-coords[0][0],coords[1][2]-coords[0][2]];
 const h=[coords[7][0]-coords[6][0],coords[7][2]-coords[6][2]];
 const a=normalize(s),b=normalize(h);
 return normalize([a[0]+b[0]*.5,a[1]+b[1]*.5]);
}
export function estimateRowingYaw(p,world,lateral){
 if(![11,12].every(i=>seen(p?.[i])&&finite3(world?.[i])))return null;
 const axis=(a,b)=>{
  // Image x points right, world z points away; our renderer's z points toward the camera.
  const d=[world[b].x-world[a].x,-(world[b].z-world[a].z)],length=Math.hypot(...d);
  if(length<.10||length>.75||length<Math.abs(world[b].y-world[a].y)*1.4)return null;
  return normalize(d);
 };
 const shoulder=axis(11,12);if(!shoulder)return null;
 let target=shoulder;
 if([23,24].every(i=>seen(p?.[i])&&finite3(world?.[i]))){
  const hips=axis(23,24);
  if(hips){
   const disagreement=Math.acos(Math.max(-1,Math.min(1,shoulder[0]*hips[0]+shoulder[1]*hips[1])));
   if(disagreement>Math.PI/4)return null;
   target=normalize([shoulder[0]+hips[0]*.5,shoulder[1]+hips[1]*.5]);
  }
 }
 // A visible, broad shoulder line cannot agree with a reconstructed edge-on shoulder axis.
 const screenDx=p[12].x-p[11].x;
 if(Math.abs(screenDx)>.055&&Math.sign(screenDx)!==Math.sign(target[0]))return null;
 const yaw=wrapYaw(Math.atan2(lateral[1],lateral[0])-Math.atan2(target[1],target[0]));
 return {yaw};
}
export class RowingOrientation {
 constructor(){this.reset();}
 reset(){this.yaw=null;this.lockedYaw=null;this.ready=false;this.samples=[];this.movedSince=null;this.reposition=false;this.lastSeen=null;}
 update(estimate,now){
  if(!estimate||!Number.isFinite(estimate.yaw)){
   this.samples=[];this.ready=false;if(this.lockedYaw===null)this.movedSince=null;
   return this.read();
  }
  const raw=wrapYaw(estimate.yaw);
  if(this.lastSeen===null||now-this.lastSeen>600)this.yaw=raw;
  else this.yaw=wrapYaw(this.yaw+wrapYaw(raw-this.yaw)*.3);
  this.lastSeen=now;
  this.samples.push({yaw:raw,time:now});this.samples=this.samples.filter(s=>now-s.time<=850);
  const stable=this.samples.length>=5&&now-this.samples[0].time>=500&&this.samples.every(s=>yawDistance(s.yaw,raw)<Math.PI/18);
  this.ready=stable;
  if(this.lockedYaw!==null){
   if(yawDistance(raw,this.lockedYaw)>Math.PI/7){this.movedSince??=now;if(now-this.movedSince>=650)this.reposition=true;}
   else{this.movedSince=null;this.reposition=false;}
  }
  return this.read();
 }
 lock(){if(!this.ready||this.yaw===null)return false;this.lockedYaw=this.yaw;this.reposition=false;return true;}
 read(){return {yaw:this.lockedYaw??this.yaw??0,liveYaw:this.yaw,ready:this.ready,locked:this.lockedYaw!==null,offAxis:this.movedSince!==null,reposition:this.reposition};}
}
