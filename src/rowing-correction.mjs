import {sampleCapturedMotion} from './captured-motion.mjs';
import {jointEvidenceWeight} from './rowing-pose-evidence.mjs';

// Reviewed static instants within the current captured windows (seconds, not video timecodes).
// Half stroke in this recording is predominantly arms + body, with almost straight knees.
export const rowingCheckpoints={
 'rowing-arms':[
  {time:1.6,en:'Arms extended',zh:'伸臂前送'},
  {time:3.9,en:'Arms drawn in',zh:'屈肘收桨'},
 ],
 'rowing-half':[
  {time:6.2,en:'Draw finish',zh:'收桨结束'},
  {time:1.2,en:'Hands away',zh:'双手前送'},
  {time:2.4,en:'Body rocked forward',zh:'躯干前倾'},
 ],
 'rowing-full':[
  {time:2.4,en:'Catch position',zh:'入水准备'},
  {time:4.4,en:'Legs extending · arms long',zh:'蹬腿展开 · 手臂伸长'},
  {time:5.5,en:'Draw finish',zh:'收桨结束'},
  {time:1.6,en:'Recovery · body forward',zh:'回桨 · 躯干前倾'},
 ],
};
export const rowingIds=[11,12,13,14,15,16,23,24,25,26,27,28];
export const visible=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.visibility)&&p.visibility>=.55&&p.x>=.015&&p.x<=.985&&p.y>=.015&&p.y<=.985;
const chains=[[11,13,15,23,25,27],[12,14,16,24,26,28]];
export function chooseRowingSide(p,previous=0){
 const score=s=>chains[s].reduce((n,i)=>n+(visible(p?.[i])?1:0),0);
 return score(1-previous)>score(previous)+1?1-previous:previous;
}
export function jointAngle(a,b,c){
 if(!a||!b||!c)return NaN;
 const u=[a.x-b.x,a.y-b.y],v=[c.x-b.x,c.y-b.y],d=Math.hypot(...u)*Math.hypot(...v);
 return d>1e-8?Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/d)))*180/Math.PI:NaN;
}
export function jointAngle3D(a,b,c){
 if(![a,b,c].every(p=>p&&[p.x,p.y,p.z].every(Number.isFinite)))return NaN;
 const u=[a.x-b.x,a.y-b.y,a.z-b.z],v=[c.x-b.x,c.y-b.y,c.z-b.z],length=Math.hypot(...u)*Math.hypot(...v);
 return length>1e-8?Math.acos(Math.max(-1,Math.min(1,u.reduce((s,n,i)=>s+n*v[i],0)/length)))*180/Math.PI:NaN;
}
export function rowingMetricDefinitions(id){
 return [0,1].flatMap(s=>[
  {key:`elbow-${s}`,part:s?'Right elbow':'Left elbow',zh:s?'右肘':'左肘',ids:[11+s,13+s,15+s],tolerance:18},
  {key:`trunk-${s}`,part:s?'Right arm / torso':'Left arm / torso',zh:s?'右臂与躯干':'左臂与躯干',ids:[23+s,11+s,13+s],tolerance:18},
  ...(id==='rowing-arms'?[]:[{key:`hip-${s}`,part:s?'Right hip':'Left hip',zh:s?'右髋':'左髋',ids:[11+s,23+s,25+s],tolerance:18}]),
  ...(id==='rowing-full'?[{key:`knee-${s}`,part:s?'Right knee':'Left knee',zh:s?'右膝':'左膝',ids:[23+s,25+s,27+s],tolerance:18}]:[]),
 ]);
}
export function rowingReference(id,index=0,facing=1,yaw=0){
 const key=rowingCheckpoints[id]?.[index];if(!key)throw Error('Unknown rowing checkpoint');
 return rowingReferenceAt(id,key.time,facing,yaw);
}
export function rowingReferenceAt(id,time=0,facing=1,yaw=0){
 const sample=sampleCapturedMotion(id,time);if(!sample)throw Error('Rowing capture unavailable');
 return Object.fromEntries(rowingIds.map((n,i)=>[n,{x:(sample.coords[i][0]*Math.cos(yaw)+sample.coords[i][2]*Math.sin(yaw))*facing,y:-sample.coords[i][1]}]));
}
// Completion requires every required joint and angle in this same observation.
export function rowingCheckpointComplete(id,assessment){
 const required=id==='rowing-arms'?4:id==='rowing-half'?6:8;
 return !assessment.small&&!assessment.missing.length&&!assessment.occluded.length&&!(assessment.inferred?.length)&&
  assessment.metrics.filter(m=>!m.guidanceOnly).length===required&&assessment.metrics.every(m=>m.close);
}
export function inferRowingFacing(p,side,width,height){
 const s=p?.[11+side],a=p?.[27+side];
 if(visible(s)&&visible(a)&&Math.abs(a.x-s.x)*width>height*.08)return a.x<s.x?1:-1;
 const e=p?.[13+side],w=p?.[15+side];
 if([s,e,w].every(visible)&&jointAngle(s,e,w)>145&&Math.abs(w.x-s.x)*width>height*.1)return w.x<s.x?1:-1;
 return null;
}
export function assessRowing(id,p,ref,width,height,{world=null,source=null,yaw=0,preferWorld=false,conservativeDepth=false}={}){
 const actual=Object.fromEntries(rowingIds.filter(i=>visible(p?.[i])).map(i=>[i,{x:p[i].x*width,y:p[i].y*height}]));
 const definitions=rowingMetricDefinitions(id);
 const worldConsistent=(a,b)=>{
  const u=world?.[a],v=world?.[b],p=actual[a],q=actual[b];if(!u||!v||!p||!q)return false;
  const dx=v.x-u.x,dy=v.y-u.y,x=q.x-p.x,y=q.y-p.y,length=Math.hypot(dx,dy)*Math.hypot(x,y);
  return length>1e-5?(dx*x+dy*y)/length>.7:Math.hypot(x,y)<height*.03;
 };
 const observable=ids=>{
  if(!source)return true; // Existing callers use the original side-view rules.
  for(let k=0;k<2;k++){
   const a=ids[k],b=ids[k+1],i=rowingIds.indexOf(a),j=rowingIds.indexOf(b);
   const dx=source[j][0]-source[i][0],dy=source[j][1]-source[i][1],dz=source[j][2]-source[i][2];
   if(Math.hypot(dx*Math.cos(yaw)+dz*Math.sin(yaw),dy)/Math.hypot(dx,dy,dz)<.40)return false;
   if(world?.[a]&&world?.[b]&&worldConsistent(a,b)){
    const u=world[a],v=world[b],full=Math.hypot(v.x-u.x,v.y-u.y,v.z-u.z);
    if(!Number.isFinite(full)||full<.02||Math.hypot(v.x-u.x,v.y-u.y)/full<.40)return false;
   }
  }
  return true;
 };
 const metrics=[],occluded=[];
 for(const d of definitions){
  if(!d.ids.every(i=>actual[i]))continue;
  const projected=observable(d.ids),estimated=d.ids.some(i=>p[i]?.inferred);
  let a=jointAngle(...d.ids.map(i=>actual[i])),target=jointAngle(...d.ids.map(i=>ref[i])),depthUncertain=false;
  const imageAngle=a,imageTarget=target;
  if(!projected||preferWorld&&world){
   const reliable=source&&!estimated&&[0,1].every(k=>worldConsistent(d.ids[k],d.ids[k+1]))&&d.ids.every(i=>world?.[i]&&!world[i].inferred&&[world[i].x,world[i].y,world[i].z].every(Number.isFinite))&&
    [0,1].every(k=>{const u=world[d.ids[k]],v=world[d.ids[k+1]],length=Math.hypot(u.x-v.x,u.y-v.y,u.z-v.z);return length>.04&&length<.9;});
   if(!reliable){occluded.push(d);continue;}
   a=jointAngle3D(...d.ids.map(i=>world[i]));target=jointAngle3D(...d.ids.map(i=>{const c=source[rowingIds.indexOf(i)];return {x:c[0],y:c[1],z:c[2]};}));
   // Model-provided depth has no calibrated confidence. A foreshortened bone
   // or a large image/depth disagreement cannot justify a certain correction.
   depthUncertain=conservativeDepth&&(Math.abs(a-imageAngle)>35||[0,1].some(k=>{
    const u=world[d.ids[k]],v=world[d.ids[k+1]];return Math.hypot(v.x-u.x,v.y-u.y)/Math.hypot(v.x-u.x,v.y-u.y,v.z-u.z)<.45;
   }));
  }
  if(Number.isFinite(a)&&Number.isFinite(target))metrics.push({...d,actual:a,target,imageAngle,imageTarget,delta:Math.abs(a-target),close:Math.abs(a-target)<=d.tolerance,space:!projected||preferWorld&&world?'world':'image',screenArrow:projected&&!depthUncertain&&(!(preferWorld&&world)||(imageAngle-imageTarget)*(a-target)>0),estimated,depthUncertain,guidanceOnly:estimated||depthUncertain});
 }
 // Elevation remains observable when a wrist is cropped or the target arm points
 // into the lens. It is a screen-space cue, not an inferred elbow bend.
 const positionMetrics=[];
 if(source){
  // Calibrate height from the torso/shoulders, never from the arm being corrected.
  // Scaling by that arm makes its target move when the user raises the elbow.
  const scales=[];
  for(const [a,b]of [[11,23],[12,24],[11,12]]){
   if(!actual[a]||!actual[b])continue;
   const projected=Math.hypot(ref[a].x-ref[b].x,ref[a].y-ref[b].y);
   const full=Math.hypot(...source[rowingIds.indexOf(a)].map((v,i)=>v-source[rowingIds.indexOf(b)][i]));
   const live=Math.hypot(actual[a].x-actual[b].x,actual[a].y-actual[b].y);
   if(projected>.09&&projected/full>=.45&&live>=height*.045)scales.push(live/projected);
  }
  scales.sort((a,b)=>a-b);const middle=Math.floor(scales.length/2);
  const scale=scales.length?(scales.length%2?scales[middle]:(scales[middle-1]+scales[middle])/2):0;
  for(const side of [0,1]){
   const shoulder=11+side,elbow=13+side,a=actual[shoulder],b=actual[elbow];if(!a||!b||!scale)continue;
   const length=Math.hypot(...source[2+side].map((v,i)=>v-source[side][i]))*scale;
   const targetOffset=(ref[elbow].y-ref[shoulder].y)*scale,offset=b.y-a.y;
   const tolerance=Math.max(height*.028,length*.30),difference=offset-targetOffset;
   positionMetrics.push({key:`height-${side}`,part:side?'Right upper-arm height':'Left upper-arm height',zh:side?'右上臂高度':'左上臂高度',ids:[shoulder,elbow],kind:'position',guidanceOnly:true,actual:offset,target:targetOffset,delta:Math.abs(difference),tolerance,close:Math.abs(difference)<=tolerance,
    direction:difference<0?'down':'up',joint:elbow,targetPoint:{x:b.x,y:a.y+targetOffset}});
  }
 }
 metrics.push(...positionMetrics);
 for(const m of metrics)if(m.key.startsWith('trunk')){
  const height=positionMetrics.find(h=>h.key.endsWith(m.key.slice(-2)));
  m.movementDirection=height&&!height.close?height.direction:null;
 }
 const inferred=rowingIds.filter(i=>p?.[i]?.inferred&&actual[i]);
 for(const metric of metrics)if(metric.ids.some(i=>p?.[i]?.inferred)){metric.estimated=true;metric.inferenceWeight=Math.min(...metric.ids.map(i=>jointEvidenceWeight(p[i])));metric.guidanceOnly=metric.kind==='position'||metric.inferenceWeight<.25;}
 const missing=[];
 const names={11:['left shoulder','左肩'],12:['right shoulder','右肩'],13:['left elbow','左肘'],14:['right elbow','右肘'],15:['left wrist','左腕'],16:['right wrist','右腕'],23:['left hip','左髋'],24:['right hip','右髋'],25:['left knee','左膝'],26:['right knee','右膝'],27:['left ankle','左踝'],28:['right ankle','右踝']};
 const required=id==='rowing-arms'?[11,12,13,14,15,16]:id==='rowing-half'?[11,12,13,14,15,16,23,24,25,26]:Object.keys(names).map(Number);
 for(const i of required)if(!actual[i]){
  const v=p?.[i],outside=v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&(v.x<.015||v.x>.985||v.y<.015||v.y>.985);
  missing.push({id:i,en:names[i][0],zh:names[i][1],reason:outside?'outside':'uncertain'});
 }
 const side=chooseRowingSide(p),s=actual[11+side],e=actual[13+side],hip=actual[23+side];
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 // A short projected arm may point into the lens; it does not mean the body is distant.
 const small=!!(s&&e&&distance(s,e)<height*.055&&(!hip||distance(s,hip)<height*.10)&&(!actual[11]||!actual[12]||distance(actual[11],actual[12])<height*.08));
 return {actual,metrics,missing,small,side,occluded,inferred};
}
// Align by one visible bone, preserving reference angles. Missing hips never block arm feedback.
export function fitRowingReference(ref,actual,width,height,side=0){
 const pairs=[[11+side,23+side],[11,12],[11+side,13+side],[12-side,14-side]];
 for(const[a,b]of pairs)if(actual[a]&&actual[b]){
  const length=Math.hypot(actual[a].x-actual[b].x,actual[a].y-actual[b].y),base=Math.hypot(ref[a].x-ref[b].x,ref[a].y-ref[b].y);
  if(length<height*.045||base<.09)continue;
  const scale=length/base;
  return Object.fromEntries(rowingIds.map(i=>[i,{x:actual[a].x+(ref[i].x-ref[a].x)*scale,y:actual[a].y+(ref[i].y-ref[a].y)*scale}]));
 }
 const xs=Object.values(ref).map(p=>p.x),ys=Object.values(ref).map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
 const scale=Math.min(width*.72/(Math.max(...xs)-Math.min(...xs)),height*.72/(Math.max(...ys)-Math.min(...ys)));
 return Object.fromEntries(rowingIds.map(i=>[i,{x:width/2+(ref[i].x-cx)*scale,y:height/2+(ref[i].y-cy)*scale}]));
}
