import {capturedDuration,sampleCapturedMotion} from './captured-motion.mjs';
import {rowingAttachment} from './equipment-grip.mjs';
import {Quaternion} from './vendor/three.module.js';
const ids=[11,12,13,14,15,16,23,24,25,26,27,28];
// The capture's 7.55s window includes an extra partial recovery. End the dynamic
// cycle near the matching finish, with a short visual-only loop closure.
export function dynamicReferenceDuration(id){return id==='rowing-full'?Math.min(6.6,capturedDuration(id)??0):capturedDuration(id);}
const lerp=(a,b,t)=>Array.isArray(a)?a.map((x,i)=>lerp(x,b[i],t)):a+(b-a)*t;
export function dynamicMotionSample(id,time){
 const duration=dynamicReferenceDuration(id);if(!duration)return null;
 const t=time>=0&&time<duration?time:((time%duration)+duration)%duration,a=sampleCapturedMotion(id,t);
 if(id!=='rowing-full'||t<duration-.35)return {...a,referenceTransition:false};
 const b=sampleCapturedMotion(id,0),u=(t-(duration-.35))/.35,blend=u*u*(3-2*u),sample={...a,referenceTransition:true,referenceBlend:blend,referenceSourceTimes:[a.sourceTime,b.sourceTime]};
 for(const key of ['coords','headPosition','neckPosition','spine','toePositions'])sample[key]=lerp(a[key],b[key],blend);
 for(const key of ['headRotation','torsoRotation','pelvisRotation'])sample[key]=new Quaternion(...a[key]).slerp(new Quaternion(...b[key]),blend).toArray();
 sample.oars=[1,-1].map((side,i)=>rowingAttachment(sample.coords[4+i],side,a.oars[i].pivot));sample.equipmentHands=sample.oars.map(o=>o.hand);
 return sample;
}
export function dynamicReferenceAt(id,time,facing=1,yaw=0){const sample=dynamicMotionSample(id,time);return Object.fromEntries(ids.map((n,i)=>[n,{x:(sample.coords[i][0]*Math.cos(yaw)+sample.coords[i][2]*Math.sin(yaw))*facing,y:-sample.coords[i][1]}]));}
export function countdownExpertOpacity(now,deadline,normalOpacity,split=false){
 if(split)return 1;
 const elapsed=now-(deadline-3000);if(elapsed<=1500)return .9;
 const t=Math.max(0,Math.min(1,(elapsed-1500)/250));return .9+(normalOpacity-.9)*t;
}
