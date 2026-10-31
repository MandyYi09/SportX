import {rowingCheckpoints} from './rowing-correction.mjs';
import {metricMatchScore,scoreDynamicRows} from './rowing-dynamic-feedback.mjs';
import {metricEvidenceWeight} from './rowing-pose-evidence.mjs';

export function formatTakeTime(value){const seconds=Math.max(0,value||0);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${(seconds%60).toFixed(1).padStart(4,'0')}`;}
export function stretchedExpertTime(rows,time,duration){
 if(!rows.length)return null;let lo=0,hi=rows.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].t<time)lo=mid+1;else hi=mid;}
 const b=rows[lo],a=rows[lo-1];
 if(!a||time>=b.t||!a.valid||!b.valid||b.t-a.t>.5)return b.expert.time;
 const delta=(b.expert.time-a.expert.time+duration)%duration;
 if(delta>duration*.25)return a.expert.time;
 return (a.expert.time+delta*Math.max(0,Math.min(1,(time-a.t)/(b.t-a.t))))%duration;
}
export function scoreTake(id,rows,{start,end,referenceCount,referenceDuration}={}){
 const selected=rows.filter(r=>r.t>=start&&r.t<=end),scores=scoreDynamicRows(id,selected),valid=selected.filter(r=>r.valid);
 const observed=valid.filter(r=>r.phaseObserved!==false),first=observed[0],last=observed.at(-1),progress=first&&last?Math.max(0,last.phase-first.phase):0;
 const gaps=selected.slice(1).map((r,i)=>r.t-selected[i].t).filter(g=>g>0&&g<=.5).sort((a,b)=>a-b),sampleGap=gaps[Math.floor(gaps.length/2)]??0;
 const completionTolerance=Math.min(.08,Math.max(2,Math.ceil(sampleGap*referenceCount/Math.max(.001,referenceDuration)))/Math.max(1,referenceCount));
 const cycleSpan=progress/Math.max(1,referenceCount),quantizedComplete=cycleSpan>=1-completionTolerance-1e-9&&cycleSpan<=1.15;
 const phaseCoverage=quantizedComplete?1:Math.min(1,cycleSpan)*Math.min(1,1.15/Math.max(1.15,cycleSpan));
 const seconds=end-start;
 const hasEvidence=selected.some(r=>typeof r.phaseReliable==='boolean'),anchors=valid.filter(r=>!hasEvidence||r.phaseReliable&&r.phaseObserved!==false);
 let reliableSeconds=0,observedSeconds=0;
 for(let i=0;i<selected.length-1;i++){const dt=Math.min(.5,Math.max(0,selected[i+1].t-selected[i].t));observedSeconds+=dt;if(selected[i].valid&&selected[i].phaseReliable&&selected[i].phaseObserved!==false)reliableSeconds+=dt;}
 const phaseBins=new Set(anchors.map(r=>Math.floor(((r.phase%referenceCount)+referenceCount)%referenceCount/referenceCount*8)));
 const alignmentReliable=!hasEvidence||(anchors.length>=3&&phaseBins.size>=3&&reliableSeconds>=Math.max(.5,seconds*.15)&&observedSeconds>=seconds*.6);
 const completeness=alignmentReliable?phaseCoverage:null;
 const moving=selected.filter(r=>r.motionActive),motionStart=moving[0]?.t??-Infinity,motionEnd=moving.at(-1)?.t??Infinity;
 const timingRows=(hasEvidence?anchors:valid).filter(r=>r.t>=motionStart&&r.t<=motionEnd),anchorFirst=timingRows[0],anchorLast=timingRows.at(-1),anchorProgress=anchorFirst&&anchorLast?anchorLast.phase-anchorFirst.phase:0,anchorSeconds=anchorFirst&&anchorLast?anchorLast.t-anchorFirst.t:0;
 const expectedSeconds=referenceDuration*anchorProgress/Math.max(1,referenceCount),tempoRatio=expectedSeconds>0?anchorSeconds/expectedSeconds:1;
 let residual=0,weight=0;
 if(anchorProgress>0&&anchorSeconds>0)for(let i=0;i<timingRows.length-1;i++){
  const row=timingRows[i],dt=Math.min(.5,Math.max(0,timingRows[i+1].t-row.t));
  residual+=Math.abs((row.t-anchorFirst.t)/anchorSeconds-(row.phase-anchorFirst.phase)/anchorProgress)*dt;weight+=dt;
 }
 const stretchPenalty=Math.max(0,Math.abs(Math.log(Math.max(.01,tempoRatio)))-Math.log(2))*25;
 const timing=alignmentReliable&&timingRows.length>=3&&anchorProgress>1?Math.round(Math.max(0,100-(weight?residual/weight:0)*250-stretchPenalty)):null;
 const total=scores.total===null||completeness===null||timing===null?null:Math.round((scores.total*.8+timing*.2)*completeness);
 return {...scores,pose:scores.total,timing,total,completeness,completionTolerance,phaseCoverage,alignmentReliable,phaseEvidence:observedSeconds?reliableSeconds/observedSeconds:0,cycleSpan,tempoRatio,seconds};
}
export function takeKeyframes(id,rows,start,end,experts){
 const selected=rows.filter(r=>r.valid&&r.phaseObserved!==false&&r.t>=start&&r.t<=end);if(!selected.length)return [];
 const n=experts.length,result=[];
 for(let index=0;index<rowingCheckpoints[id].length;index++){
  const key=rowingCheckpoints[id][index];let phase=0,difference=Infinity;
  experts.forEach((e,i)=>{const d=Math.abs(e.time-key.time);if(d<difference){phase=i;difference=d;}});
  for(let cycle=Math.floor(selected[0].phase/n)-1;cycle<=Math.floor(selected.at(-1).phase/n)+1;cycle++){
   const target=cycle*n+phase;if(target<selected[0].phase-1||target>selected.at(-1).phase+1)continue;
   const row=selected.reduce((best,r)=>Math.abs(r.phase-target)<Math.abs(best.phase-target)?r:best,selected[0]);
   if(Math.abs(row.phase-target)<=Math.max(2,n*.07))result.push({index,t:row.t,en:key.en,zh:key.zh});
  }
 }
 return result.sort((a,b)=>a.t-b.t);
}
export function buildRowingTakes(id,analysis,experts,referenceDuration){
 const rows=analysis.rows;if(!rows.length)return [];
 const options={referenceCount:experts.length,referenceDuration},ranges=[];
 let cursor=rows[0].t;
 for(const cycle of analysis.cycles){
  if(cycle.start-cursor>=.5)ranges.push({start:cursor,end:cycle.start,detectedComplete:false});
  ranges.push({...cycle,detectedComplete:true});cursor=cycle.end;
 }
 if(rows.at(-1).t-cursor>=.5)ranges.push({start:cursor,end:rows.at(-1).t,detectedComplete:false});
 if(!ranges.length)ranges.push({start:rows[0].t,end:rows.at(-1).t,detectedComplete:false});
 return ranges.filter(r=>r.end-r.start>=.3).map((range,i)=>({id:`take-${i+1}`,number:i+1,...range,score:scoreTake(id,rows,{...options,...range}),keyframes:takeKeyframes(id,rows,range.start,range.end,experts)}));
}
export function bestRowingTake(takes){return takes.reduce((best,take)=>!best||(take.score.total??-1)>(best.score.total??-1)||(take.score.total===null&&best.score.total===null&&(take.score.pose??-1)>(best.score.pose??-1))?take:best,null);}
export function rowDeductions(row){
 if(!row?.valid||row.phaseReliable===false||row.assessment.referenceTransition)return [];
 return row.assessment.metrics.filter(m=>metricEvidenceWeight(m)>0&&Number.isFinite(m.delta)&&m.tolerance>0&&100-metricMatchScore(m)>=.1).map(m=>({metric:m,points:Math.round((100-metricMatchScore(m))*10)/10,evidenceWeight:metricEvidenceWeight(m)}));
}
// Constant-size state, using the existing phase matcher only at a cycle boundary.
export class RowingTakeClock{
 constructor(duration,{speed=1,startTime=0,maxWait=2.5}={}){this.duration=duration;this.speed=speed;this.startTime=startTime;this.maxWait=maxWait;this.elapsed=0;this.last=null;this.take=1;this.waitSince=null;this.studentOrigin=null;}
 update(now,match,referenceCount){
  if(match?.phaseObserved===false)match=null;
  const dt=this.last===null?0:Math.max(0,Math.min(.25,(now-this.last)/1000));this.last=now;
  if(match?.valid&&Number.isFinite(match.phase)&&this.studentOrigin===null)this.studentOrigin=match.phase;
  const progress=match?.valid&&this.studentOrigin!==null?(match.phase-this.studentOrigin)/referenceCount:null;
  let next=this.elapsed+dt*this.speed;
  const boundary=this.take*this.duration,behind=progress!==null&&progress<this.take-.12;
  if(next>=boundary&&behind){
   this.waitSince??=now;
   if(now-this.waitSince<this.maxWait*1000)next=boundary-.025;
   else{this.take++;this.waitSince=null;}
  }else if(next>=boundary){this.take++;this.waitSince=null;}
  else if(this.waitSince!==null&&!behind){next=boundary;this.take++;this.waitSince=null;}
  this.elapsed=next;return {take:this.take,time:(this.startTime+this.elapsed)%this.duration,waiting:this.waitSince!==null};
 }
}
export function paintTakeScorecard(ctx,take,width,height,language='en'){
 const zh=language==='zh',tr=(en,cn)=>zh?cn:en,s=take.score,show=n=>n===null?'—':`${n}/100`;
 ctx.save();ctx.fillStyle='#15212a';ctx.fillRect(0,0,width,height);ctx.textAlign='left';ctx.textBaseline='top';
 const x=width*.08,top=height*.08,line=height*.075;
 ctx.fillStyle='#edf5f8';ctx.font=`600 ${Math.round(height*.055)}px sans-serif`;ctx.fillText(`Take ${take.number}`,x,top);
 ctx.fillStyle='#b8efc7';ctx.font=`700 ${Math.round(height*.075)}px sans-serif`;ctx.fillText(`${tr('Total','总分')} ${show(s.total)}`,x,top+line);
 ctx.font=`${Math.round(height*.035)}px sans-serif`;ctx.fillStyle='#edf5f8';
 const labels={'left-arm':tr('Left arm','左臂'),'right-arm':tr('Right arm','右臂'),'left-leg':tr('Left leg / hip','左腿／髋'),'right-leg':tr('Right leg / hip','右腿／髋')};
 const lines=[`${tr('Pose','姿态')} ${show(s.pose)} · ${tr('Timing','时间对齐')} ${show(s.timing)}`,`${tr('Completion','动作完成度')} ${s.completeness===null?tr('unconfirmed','待确认'):`${Math.round(s.completeness*100)}%`} · ${tr('Observable','可判断率')} ${Math.round(s.coverage*100)}%`,...s.parts.map(p=>`${labels[p.key]}  ${show(p.score)}`),`${formatTakeTime(take.start)} – ${formatTakeTime(take.end)}`,s.alignmentReliable===false?tr('Phase alignment uncertain; timing and total withheld.','阶段对齐不确定；时间分与总分暂不评定。'):tr('Hidden parts are unscored.','不可见部位不计分。')];
 lines.forEach((text,i)=>ctx.fillText(text,x,top+line*(2.4+i*.72),width-x*2));ctx.restore();
}
