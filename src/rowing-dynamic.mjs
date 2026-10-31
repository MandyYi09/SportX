import {capturedDuration,sampleCapturedMotion} from './captured-motion.mjs';
import {rowingIds,rowingCheckpoints,rowingReferenceAt,assessRowing,rowingMetricDefinitions,jointAngle,jointAngle3D,visible} from './rowing-correction.mjs';
import {movementPhaseEvidence} from './rowing-motion-phase.mjs';
import {metricEvidenceWeight,jointEvidenceWeight} from './rowing-pose-evidence.mjs';
import {dynamicReferenceDuration,dynamicMotionSample,dynamicReferenceAt} from './rowing-reference-cycle.mjs';

export function dynamicReference(id,yaw=0){
 const duration=dynamicReferenceDuration(id),start=rowingCheckpoints[id][0].time;
 if(!duration)throw Error('Expert capture unavailable');
 const count=Math.ceil(duration*10);
 return Array.from({length:count},(_,i)=>{
  const time=(start+i*duration/count)%duration,sample=dynamicMotionSample(id,time);
  return {time,ref:dynamicReferenceAt(id,time,1,yaw),source:sample.coords,referenceTransition:sample.referenceTransition};
 });
}
export function assessDynamicFrame(id,frame,expert,yaw=0){
 const assessment=assessRowing(id,frame.pose,expert.ref,frame.width,frame.height,{world:frame.world,source:expert.source,yaw,conservativeDepth:true,preferWorld:Math.abs(Math.sin(yaw))>.65});
 if(expert.referenceTransition){assessment.referenceTransition=true;for(const m of assessment.metrics){m.guidanceOnly=true;m.referenceTransition=true;}}
 return assessment;
}
export function rowingPhaseObservable(id,frame){
 return rowingMetricDefinitions(id).some(d=>d.ids.every(i=>visible(frame.pose?.[i])&&!frame.pose[i].inferred));
}
export function rowingSequenceObservable(id,frame){
 return id!=='rowing-full'||[0,1].some(s=>[11+s,23+s,25+s,27+s].every(i=>visible(frame.pose?.[i])&&!frame.pose[i].inferred));
}
export function alignmentCost(assessment){
 const metrics=assessment.metrics.filter(m=>metricEvidenceWeight(m)>0);
 if(!metrics.length||assessment.small)return null;
 // One observable angle may bridge an end-on phase, but never means all joints passed.
 const weight=metrics.reduce((s,m)=>s+metricEvidenceWeight(m),0);
 return metrics.reduce((n,m)=>n+Math.min(4,m.delta/m.tolerance)*metricEvidenceWeight(m),0)/weight+.12*Math.max(0,2-weight);
}
// Causal phase matching for live hints; final analysis still uses the whole recording.
export class LiveRowingMatcher{
 constructor(id,{yaw=0,speed=1,experts=dynamicReference(id,yaw)}={}){
  this.id=id;this.yaw=yaw;this.speed=speed;this.experts=experts;this.definitions=rowingMetricDefinitions(id);
  this.targets=experts.map(e=>this.definitions.map(d=>{
   const coords=d.ids.map(i=>e.source[rowingIds.indexOf(i)]),full=coords.map(c=>({x:c[0],y:c[1],z:c[2]}));
   const projected=[0,1].every(k=>{const a=coords[k],b=coords[k+1],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];return Math.hypot(dx*Math.cos(yaw)+dz*Math.sin(yaw),dy)/Math.hypot(dx,dy,dz)>=.4;});
   return {image:jointAngle(...d.ids.map(i=>e.ref[i])),world:jointAngle3D(...full),projected};
  }));this.reset();
 }
 reset(){this.beam=[];this.last=null;this.phase=null;}
 update(frame){
  // Measure the user's angles once, rather than rebuilding ~80 full assessments per frame.
  const actual=this.definitions.map(d=>{
   if(!d.ids.every(i=>visible(frame.pose?.[i])))return null;
   const weight=Math.min(...d.ids.map(i=>jointEvidenceWeight(frame.pose[i])));if(weight<.25)return null;
   const points=d.ids.map(i=>({x:frame.pose[i].x*frame.width,y:frame.pose[i].y*frame.height})),image=jointAngle(...points);
   const worldOK=d.ids.every(i=>!frame.pose[i]?.inferred&&frame.world?.[i]&&!frame.world[i].inferred&&[frame.world[i].x,frame.world[i].y,frame.world[i].z].every(Number.isFinite))&&[0,1].every(k=>{
    const a=frame.world[d.ids[k]],b=frame.world[d.ids[k+1]],p=points[k],q=points[k+1],dx=b.x-a.x,dy=b.y-a.y,x=q.x-p.x,y=q.y-p.y,l=Math.hypot(dx,dy)*Math.hypot(x,y),length=Math.hypot(dx,dy,b.z-a.z);
    return length>.04&&length<.9&&(l>1e-5?(dx*x+dy*y)/l>.7:Math.hypot(x,y)<frame.height*.03);
   });
   const world=worldOK?jointAngle3D(...d.ids.map(i=>frame.world[i])):NaN;
   const projected=!worldOK||[0,1].every(k=>{const a=frame.world[d.ids[k]],b=frame.world[d.ids[k+1]];return Math.hypot(b.x-a.x,b.y-a.y)/Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)>=.4;});
   return {image,world,projected,weight};
  });
  const costs=this.targets.map(target=>{
   let cost=0,count=0;for(let i=0;i<target.length;i++){
    const a=actual[i],b=target[i];if(!a)continue;
    const world=Math.abs(Math.sin(this.yaw))>.65||!a.projected||!b.projected,value=world?a.world:a.image,reference=world?b.world:b.image;
    if(!Number.isFinite(value)||!Number.isFinite(reference))continue;cost+=Math.min(4,Math.abs(value-reference)/18)*a.weight;count+=a.weight;
   }return count?cost/count+.12*Math.max(0,2-count):null;
  }),n=this.experts.length,gap=this.last===null?0:frame.t-this.last;
  this.last=frame.t;
  if(!costs.some(c=>c!==null)){this.beam=[];this.phase=null;return {valid:false,assessment:assessDynamicFrame(this.id,frame,this.experts[0],this.yaw),expert:this.experts[0]};}
  if(!this.beam.length||gap>.5||gap<0){
   this.beam=costs.flatMap((cost,j)=>cost===null?[]:[{j,cost}]);this.phase=null;
  }else{
   const expected=Math.max(.1,gap*10*this.speed),limit=Math.min(12,Math.ceil(Math.max(1,gap*10)*2.5)),next=new Map();
   for(const b of this.beam)for(let step=0;step<=limit;step++){
    const j=b.j+step,cost=b.cost+(costs[j%n]??1.2)+Math.abs(step-expected)/Math.max(1,expected)*.09;
    if(!next.has(j)||cost<next.get(j).cost)next.set(j,{j,cost});
   }
   this.beam=[...next.values()];
  }
  this.beam.sort((a,b)=>a.cost-b.cost);this.beam=this.beam.slice(0,96);
  const best=this.beam.find(b=>this.phase===null||b.j>=this.phase)??this.beam[0],minimum=this.beam[0].cost;
  this.beam.forEach(b=>{b.cost-=minimum;});this.phase=best.j;
  // Live confidence must include the observed history: a single frame can look
  // like both halves of a stroke even after its direction has been established.
  const chosen=best.j%n,expert=this.experts[chosen],phaseReliable=!expert.referenceTransition&&!this.beam.some(b=>{
   const distance=Math.abs(b.j%n-chosen);return Math.min(distance,n-distance)>n*.15&&b.cost<=best.cost+.08;
  });
  return {valid:costs[chosen]!==null,phase:best.j,phaseReliable,phaseObserved:rowingPhaseObservable(this.id,frame),sequenceObservable:rowingSequenceObservable(this.id,frame),expert,assessment:assessDynamicFrame(this.id,frame,expert,this.yaw)};
 }
}
// Monotonic cyclic DTW. A beam bounds memory and prevents arbitrary phase jumps.
// Missing frames cannot advance the expert or create a completed stroke.
export function alignDynamicFrames(id,frames,experts,yaw=0){
 if(!frames.length)return [];
 // Do not turn a longer reaction hold into expert phase advancement. Retain
 // the first pose and two hold samples for alignment, then restore every raw
 // timestamp as ungraded preparation evidence in the returned timeline.
 let hold=0;
 for(let i=1;i<frames.length;i++){
  const distances=rowingIds.flatMap(j=>jointEvidenceWeight(frames[0].pose?.[j])===1&&jointEvidenceWeight(frames[i].pose?.[j])===1?[Math.hypot(frames[0].pose[j].x-frames[i].pose[j].x,frames[0].pose[j].y-frames[i].pose[j].y)]:[]).sort((a,b)=>a-b);
  if(frames[i].t-frames[i-1].t>.5||distances.length<3||distances[Math.floor(distances.length*.8)]>.002)break;hold=i;
 }
 if(hold>2&&frames[hold].t-frames[0].t>=.6){
  const from=hold-1,step=frames[hold].t-frames[from].t;
  const reduced=[{...frames[0],t:frames[from].t-step,_recordedTime:frames[0].t},...frames.slice(from)];
  const aligned=alignDynamicFrames(id,reduced,experts,yaw),first=aligned[0];if(!first)return [];
  const restored=aligned.map(r=>{const {_recordedTime,...rest}=r;return {...rest,t:_recordedTime??r.t};});
  const preparation=frames.slice(1,from).map(f=>({...first,...f,phaseReliable:false,phaseUncertaintyReason:'preparation-hold',motionActive:false,preparationHold:true,assessment:assessDynamicFrame(id,f,first.expert,yaw)}));
  return [...restored,...preparation].sort((a,b)=>a.t-b.t);
 }
 const count=experts.length,phaseCosts=[],lattice=[],motion=movementPhaseEvidence(frames,experts);let beam=[],previousTime=null;
 for(let i=0;i<frames.length;i++){
  const f=frames[i],assessments=experts.map(e=>assessDynamicFrame(id,f,e,yaw));
  const costs=assessments.map((assessment,j)=>motion.costs[i][j]??alignmentCost(assessment));
  const valid=(rowingPhaseObservable(id,f)||motion.costs[i].some(c=>c!==null))&&costs.some(c=>c!==null);
  phaseCosts[i]=costs;
  if(!beam.length){
   if(!valid)continue;
   beam=costs.flatMap((cost,j)=>cost===null?[]:[{j,cost,node:{i,j,valid:true,parent:null}}]);
  }else{
   const gap=f.t-previousTime,expected=Math.max(1,gap*10),prior=motion.channels&&!motion.active[i]?0:expected;
   const steps=valid&&gap<=.5?Array.from({length:Math.min(12,Math.ceil(expected*2.5))+1},(_,i)=>i):[0],next=new Map();
   lattice[i]={limit:steps.at(-1),expected,prior,valid};
   for(const b of beam)for(const step of steps){
    const j=b.j+step,local=costs[j%count];
    const cost=b.cost+(valid?(local??1.2):0)+(valid?Math.abs(step-prior)/expected*(prior===0?.09:.03):0);
    if(!next.has(j)||cost<next.get(j).cost)next.set(j,{j,cost,node:{i,j,valid:valid&&local!==null&&gap<=.5,parent:b.node}});
   }
   beam=[...next.values()];
  }
  beam.sort((a,b)=>a.cost-b.cost);beam=beam.slice(0,96);previousTime=f.t;
  lattice[i]={...lattice[i],states:beam.map(b=>({j:b.j,cost:b.cost}))};
 }
 if(!beam.length)return [];
 // Min-cost forward/backward paths use both movement directions and the
 // observed holds. A remote phase is ambiguous only if a whole competing
 // monotonic trajectory supports it, not merely a similar single frame.
 let suffix=new Map(lattice.at(-1).states.map(s=>[s.j,0]));
 const margins=[];
 for(let i=lattice.length-1;i>=0;i--){
  if(!lattice[i]?.states)continue;
  const states=lattice[i].states;
  margins[i]=states.map(s=>({j:s.j,cost:s.cost+(suffix.get(s.j)??Infinity)}));
  const previous=lattice[i-1]?.states,transition=lattice[i];if(!previous)continue;
  const nextSuffix=new Map();
  for(const a of previous){let best=Infinity;for(const b of states){
   const step=b.j-a.j;if(step<0||step>transition.limit)continue;
   const local=phaseCosts[i][b.j%count];
   const cost=(transition.valid?(local??1.2):0)+(transition.valid?Math.abs(step-transition.prior)/transition.expected*(transition.prior===0?.09:.03):0)+(suffix.get(b.j)??Infinity);
   best=Math.min(best,cost);
  }nextSuffix.set(a.j,best);}suffix=nextSuffix;
 }
 const result=[];for(let node=beam[0].node;node;node=node.parent){
  const frame=frames[node.i],expert=experts[node.j%count];
  const costs=phaseCosts[node.i],chosen=node.j%count;
  // A good pose fit is not evidence of a unique movement phase. In frontal
  // views several distant phases can have the same visible arm angles.
  const phaseObserved=motion.channels?motion.observed[node.i]:rowingPhaseObservable(id,frame);
  const candidates=margins[node.i]??[],bestCost=Math.min(...candidates.map(c=>c.cost));
  const alternative=Math.min(...candidates.filter(c=>{const d=Math.abs(c.j%count-chosen);return Math.min(d,count-d)>count*.15;}).map(c=>c.cost));
  const phaseMargin=alternative-bestCost,localFit=costs[chosen]-Math.min(...costs.filter(c=>c!==null));
  const phaseUncertaintyReason=!node.valid?'tracking-invalid':!motion.channels?'no-motion-context':!phaseObserved?'no-measured-phase-evidence':expert.referenceTransition?'visual-reference-transition':phaseMargin<=.15?'competing-sequence':localFit>=.35?'local-motion-conflict':null;
  const phaseReliable=phaseUncertaintyReason===null;
  result.push({...frame,phase:node.j,phaseReliable,phaseMargin:Number.isFinite(phaseMargin)?phaseMargin:null,phaseAlternativeRetained:Number.isFinite(alternative),phaseLocalFit:localFit,phaseUncertaintyReason,phaseConfidenceMethod:'sequence-path-margin',phaseObserved,motionActive:motion.active[node.i],motionChannels:motion.channels,expert,valid:node.valid,sequenceObservable:rowingSequenceObservable(id,frame),assessment:assessDynamicFrame(id,frame,expert,yaw)});
 }
 return result.reverse();
}
export function dynamicIssues(rows){
 const issues=[],active=new Map();
 function finish(key){const item=active.get(key);if(item&&item.end-item.start>=.3)issues.push(item);active.delete(key);}
 for(const r of rows){
  const errors=r.valid&&r.phaseReliable!==false?r.assessment.metrics.filter(m=>!m.close&&!m.guidanceOnly&&!m.estimated):[];
  const keys=new Set(errors.map(m=>m.key));
  for(const key of active.keys())if(key!=='early-arms'&&(!keys.has(key)||r.t-active.get(key).end>.5))finish(key);
  for(const m of errors){
   if(!active.has(m.key))active.set(m.key,{key:m.key,start:r.t,end:r.t,metric:m,kind:'pose'});
   const item=active.get(m.key);item.end=r.t;if(m.delta>item.metric.delta)item.metric=m;
  }
  // Sequence cue is separate from an arrow: bending while the leg drive is incomplete.
  const metrics=r.assessment.metrics.filter(m=>!m.estimated&&!m.guidanceOnly);
  const early=r.valid&&r.phaseReliable!==false&&r.sequenceObservable!==false&&metrics.some(m=>m.key.startsWith('elbow')&&m.target>150&&m.actual<135)&&
   metrics.some(m=>m.key.startsWith('knee')&&m.actual<145);
  const key='early-arms';if(early){if(active.has(key)&&r.t-active.get(key).end>.5)finish(key);if(!active.has(key))active.set(key,{key,start:r.t,end:r.t,kind:'sequence'});active.get(key).end=r.t;}else finish(key);
 }
 for(const key of [...active.keys()])finish(key);
 return issues.sort((a,b)=>a.start-b.start);
}
export function analyzeDynamic(id,frames,{yaw=0,cutoff=Infinity,trim=true,experts=dynamicReference(id,yaw)}={}){
 const usable=frames.filter(f=>f.t<=cutoff);
 const rows=alignDynamicFrames(id,usable,experts,yaw),n=experts.length;
 const boundaries=[];
 let previousValid=null;
 for(const row of rows)if(row.valid&&row.phaseObserved!==false){if(previousValid&&row.t-previousValid.t<=.75&&Math.floor(row.phase/n)>Math.floor(previousValid.phase/n))boundaries.push(row.t);previousValid=row;}
 if(rows[0]?.valid&&rows[0].phaseObserved!==false&&rows[0].phase<=2)boundaries.unshift(rows[0].t);
 const cycles=boundaries.slice(1).map((end,i)=>({start:boundaries[i],end})).filter(c=>{
  const segment=rows.filter(r=>r.t>=c.start&&r.t<=c.end);
  return c.end-c.start>=1&&segment.filter(r=>r.valid).length>=segment.length*.7&&segment.every((r,i)=>!i||r.t-segment[i-1].t<=.5);
 });
 const start=trim&&cycles.length?cycles[0].start:(rows[0]?.t??usable[0]?.t??0);
 const end=trim&&cycles.length?cycles.at(-1).end:(rows.at(-1)?.t??usable.at(-1)?.t??0);
 const selected=rows.filter(r=>r.t>=start&&r.t<=end);
 const coverage=selected.length?selected.filter(r=>r.valid&&r.assessment.missing.length===0&&r.assessment.occluded.length===0).length/selected.length:0;
 return {rows,issues:dynamicIssues(selected),cycles,start,end,coverage};
}
export function closestDynamicRow(rows,time){
 let lo=0,hi=rows.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].t<time)lo=mid+1;else hi=mid;}
 const a=rows[lo],b=rows[lo-1];return b&&Math.abs(b.t-time)<Math.abs(a.t-time)?b:a;
}
export function clonePose(pose){return pose?.map(p=>({...p}))??null;}
export {rowingIds};
