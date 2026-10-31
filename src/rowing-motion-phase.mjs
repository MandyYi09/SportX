import {jointEvidenceWeight} from './rowing-pose-evidence.mjs';
import {jointAngle,jointAngle3D,rowingMetricDefinitions,rowingIds} from './rowing-correction.mjs';

// Phase evidence describes movement shape, not whether the pose is correct.
// Normalize each trajectory separately so body proportions, camera scale and
// reduced range of motion cannot masquerade as a slower or incomplete cycle.
const quantile=(values,q)=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.round((a.length-1)*q)]:NaN;};
function vector(points,usable){
 const result=[];
 for(const side of [0,1])for(const [a,b,axis] of [[15,11,'x'],[15,11,'y'],[13,11,'x'],[13,11,'y'],[11,23,'x'],[11,23,'y']])result.push(usable(a+side)&&usable(b+side)?points[a+side][axis]-points[b+side][axis]:null);
 return result;
}
function smooth(values,cyclic=false){return values.map((v,i)=>{if(!Number.isFinite(v))return null;return quantile([-1,0,1].map(d=>values[cyclic?(i+d+values.length)%values.length:i+d]),.5);});}
function normalize(values,minimumRange,cyclic=false,weights=null){
 const filtered=smooth(values,cyclic),calibration=weights?filtered.map((v,i)=>weights[i]===1?v:null):filtered,low=quantile(calibration,.1),high=quantile(calibration,.9),range=high-low;
 if(!Number.isFinite(range)||range<minimumRange||filtered.filter(Number.isFinite).length<Math.max(5,values.length*.3))return null;
 return filtered.map(v=>Number.isFinite(v)?Math.max(-.5,Math.min(1.5,(v-low)/range)):null);
}
export function movementPhaseEvidence(frames,experts){
 const student=frames.map(f=>vector(f.pose??[],i=>jointEvidenceWeight(f.pose?.[i])>0));
 const evidence=frames.map(f=>{const a=[];for(const side of [0,1])for(const [i,j]of [[15,11],[15,11],[13,11],[13,11],[11,23],[11,23]])a.push(Math.min(jointEvidenceWeight(f.pose?.[i+side]),jointEvidenceWeight(f.pose?.[j+side])));return a;});
 const reference=experts.map(e=>vector(e.ref,i=>!!e.ref[i]));
 const hasLegEvidence=frames.filter(f=>[0,1].some(s=>[23+s,25+s,27+s].every(i=>jointEvidenceWeight(f.pose?.[i])===1))).length>frames.length*.4;
 const channels=[];
 for(let k=0;k<12;k++){
  const weights=evidence.map(v=>v[k]),a=normalize(student.map(v=>v[k]),.025,false,weights),b=normalize(reference.map(v=>v[k]),.035,true);
  if(a&&b)channels.push({a,b,weights,importance:1});
 }
 // Bend/extension timing is independent of absolute pose accuracy. Use one
 // consistent angle space per trajectory and normalize its range, rather than
 // letting torso translation delay an already observed arm pull.
 for(const d of rowingMetricDefinitions('rowing-full')){
  const weights=frames.map(f=>Math.min(...d.ids.map(i=>jointEvidenceWeight(f.pose?.[i]))));
  const worldValues=frames.map((f,i)=>weights[i]&&d.ids.every(j=>!f.pose[j].inferred&&f.world?.[j]&&[f.world[j].x,f.world[j].y,f.world[j].z].every(Number.isFinite))?jointAngle3D(...d.ids.map(j=>f.world[j])):null);
  const world=worldValues.filter(Number.isFinite).length>=Math.max(5,frames.length*.4);
  // End-on image angles are not reliable phase anchors without usable depth.
  const projected=experts.filter(e=>[0,1].every(k=>{const p=e.source[rowingIds.indexOf(d.ids[k])],q=e.source[rowingIds.indexOf(d.ids[k+1])],a=e.ref[d.ids[k]],b=e.ref[d.ids[k+1]];return Math.hypot(b.x-a.x,b.y-a.y)/Math.hypot(...p.map((v,j)=>v-q[j]))>=.45;})).length/experts.length;
  if(!world&&projected<.7)continue;
  const actual=world?worldValues:frames.map((f,i)=>weights[i]?jointAngle(...d.ids.map(j=>({x:f.pose[j].x*f.width,y:f.pose[j].y*f.height}))):null);
  const target=experts.map(e=>world?jointAngle3D(...d.ids.map(j=>{const p=e.source[rowingIds.indexOf(j)];return {x:p[0],y:p[1],z:p[2]};})):jointAngle(...d.ids.map(j=>e.ref[j])));
  const a=normalize(actual,12,false,weights),b=normalize(target,12,true);
  if(a&&b)channels.push({a,b,weights:weights.map((w,i)=>Number.isFinite(actual[i])?w:0),importance:d.key.startsWith('elbow')?(world?(hasLegEvidence?3:5):1.5):1});
 }
 const costs=student.map((_,i)=>reference.map((__,j)=>{
  let sum=0,count=0,weight=0;
  for(const {a,b,weights,importance}of channels){if(!Number.isFinite(a[i])||!Number.isFinite(b[j])||!weights[i])continue;
   const w=weights[i]*importance;sum+=Math.min(2,Math.abs(a[i]-b[j]))*w;count++;weight+=w;
   const before=a[i-1],after=a[i+1],left=b[(j+b.length-1)%b.length],right=b[(j+1)%b.length];
   if([before,after,left,right].every(Number.isFinite)){
    const userDirection=after-before,expertDirection=right-left;
    if(Math.abs(userDirection)>.04&&Math.abs(expertDirection)>.015&&userDirection*expertDirection<0)sum+=.35*w;
   }
  }
  return count>=2&&weight>=.5?sum/weight:null;
 }));
 const active=student.map((_,i)=>channels.filter(({a})=>Number.isFinite(a[i-1])&&Number.isFinite(a[i+1])&&Math.abs(a[i+1]-a[i-1])>.025).length>=2);
 const observed=student.map((_,i)=>channels.filter(({a,weights})=>Number.isFinite(a[i])&&weights[i]===1).length>=2);
 return {costs,channels:channels.length,active,observed};
}
