import {metricLimb} from './rowing-feedback.mjs';
import {metricEvidenceWeight} from './rowing-pose-evidence.mjs';
export const visibleAlignmentText={en:'All visible parts are well-aligned.',zh:'所有可见部位均已对齐。'};
export function visiblePartsAligned(assessment){
 const measured=assessment.metrics.filter(m=>!m.estimated&&!m.depthUncertain);
 return !assessment.small&&!assessment.metrics.some(m=>m.depthUncertain)&&measured.some(m=>!m.guidanceOnly)&&measured.every(m=>m.close);
}
export class VisibleAlignmentCue{
 constructor({holdMs=350,cooldownMs=10000}={}){this.holdMs=holdMs;this.cooldownMs=cooldownMs;this.reset();}
 reset(){this.since=null;this.last=null;this.announced=false;this.lastSaid=-Infinity;}
 update(assessment,valid,now){
  if(this.last!==null&&now-this.last>500){this.since=null;this.announced=false;}this.last=now;
  const aligned=valid&&visiblePartsAligned(assessment);
  if(!aligned){this.since=null;this.announced=false;return {aligned:false,announce:false};}
  this.since??=now;
  const announce=!this.announced&&now-this.since>=this.holdMs&&now-this.lastSaid>=this.cooldownMs;
  if(announce){this.announced=true;this.lastSaid=now;}
  return {aligned:true,announce};
 }
}

// Show persistent errors; only briefly flash a part that has just been corrected.
export class DynamicRowingFeedback{
 constructor({errorMs=250,flashMs=600}={}){this.errorMs=errorMs;this.flashMs=flashMs;this.reset();}
 reset(){this.states=new Map();this.last=null;}
 update(assessment,valid,now){
  if(!valid||this.last!==null&&now-this.last>500)this.states.clear();this.last=now;
  if(!valid)return {errors:[],resolved:[]};
  const measured=assessment.metrics.filter(m=>!m.estimated&&!m.depthUncertain),keys=new Set(measured.map(m=>m.key));
  for(const key of this.states.keys())if(!keys.has(key))this.states.delete(key);
  const errors=[],resolved=[];
  for(const m of measured){
   let s=this.states.get(m.key);
   if(!m.close){
    if(!s||s.since===null)s={since:now,shown:false,until:0};
    if(now-s.since>=this.errorMs){s.shown=true;errors.push(m);}s.until=0;
   }else if(s){
    if(s.shown){s.until=now+this.flashMs;s.shown=false;}s.since=null;
    if(s.until>now)resolved.push(m);
   }
   if(s)this.states.set(m.key,s);
  }
  return {errors,resolved};
 }
}
export function metricMatchScore(m){
 return Math.max(0,100*(1-Math.pow(m.delta/m.tolerance,2)/9));
}
export function scoreDynamicRows(id,rows){
 const definitions=[['left-arm',2],['right-arm',2],...(id==='rowing-arms'?[]:[['left-leg',id==='rowing-full'?2:1],['right-leg',id==='rowing-full'?2:1]])];
 const parts=new Map(definitions.map(([key,expected])=>[key,{key,expected,sum:0,weight:0,unweightedWeight:0,inferredWeight:0,possible:0,seconds:0}]));
 for(let i=0;i<rows.length;i++){
  const row=rows[i],next=rows[i+1],elapsed=next?Math.max(0,next.t-row.t):0,dt=elapsed<=.5?elapsed:0;
  for(const p of parts.values())p.possible+=elapsed*p.expected;
  if(!row.valid||row.phaseReliable===false||row.assessment.referenceTransition||row.assessment.small)continue;
  const metrics=row.assessment.metrics.filter(m=>metricEvidenceWeight(m)>0&&Number.isFinite(m.delta)&&m.tolerance>0),seen=new Set();
  for(const m of metrics){const p=parts.get(metricLimb(m));if(!p)continue;const weight=metricEvidenceWeight(m)*dt;p.sum+=metricMatchScore(m)*weight;p.weight+=weight;p.unweightedWeight+=dt;if(m.estimated)p.inferredWeight+=weight;seen.add(p.key);}
  for(const key of seen)parts.get(key).seconds+=dt;
 }
 const result=[...parts.values()].map(p=>({key:p.key,score:p.seconds>=.5&&p.weight?Math.round(p.sum/p.weight):null,coverage:p.possible?Math.min(1,p.weight/p.possible):0,seconds:p.seconds,inferredShare:p.weight?p.inferredWeight/p.weight:0,evidenceWeight:p.unweightedWeight?p.weight/p.unweightedWeight:0}));
 const scored=result.filter(p=>p.score!==null),possible=[...parts.values()].reduce((s,p)=>s+p.possible,0),weight=[...parts.values()].reduce((s,p)=>s+p.weight,0);
 const totalEvidence=scored.reduce((s,p)=>s+p.evidenceWeight,0);
 return {total:totalEvidence?Math.round(scored.reduce((s,p)=>s+p.score*p.evidenceWeight,0)/totalEvidence):null,coverage:possible?Math.min(1,weight/possible):0,inferredShare:weight?[...parts.values()].reduce((s,p)=>s+p.inferredWeight,0)/weight:0,parts:result};
}
