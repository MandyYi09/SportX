// Timers advance only with recent visible frames; lost tracking never counts as failure.
export class RowingFeedbackCycle {
 constructor({demonstrateMs=3000,retryMs=9000,alignedMs=800}={}){this.demonstrateMs=demonstrateMs;this.retryMs=retryMs;this.alignedMs=alignedMs;this.reset();}
 reset(){this.mode='demonstrate';this.elapsed=0;this.bad=0;this.good=0;this.last=null;}
 update(now,{valid=false,close=false}={}){
  const gap=this.last===null?0:now-this.last;this.last=now;
  const dt=gap>=0&&gap<=500?gap:0;
  if(gap>500){this.bad=0;this.good=0;if(this.mode==='aligned')this.mode='guide';}
  if(this.mode==='demonstrate'){
   this.elapsed+=dt;
   if(this.elapsed>=this.demonstrateMs){this.mode='guide';this.bad=0;this.good=0;}
  }else if(!valid){this.bad=0;this.good=0;if(this.mode==='aligned')this.mode='guide';}
  else if(close){this.good=gap>500?0:this.good+dt;if(this.good>=this.alignedMs){this.mode='aligned';this.bad=0;}}
  else{
   this.good=0;this.mode='guide';this.bad=gap>500?0:this.bad+dt;
   if(this.bad>=this.retryMs){this.mode='demonstrate';this.elapsed=0;this.bad=0;}
  }
  return this.read();
 }
 pause(){this.last=null;this.bad=0;this.good=0;if(this.mode==='aligned')this.mode='guide';}
 read(){return {mode:this.mode,remainingMs:this.mode==='demonstrate'?Math.max(0,this.demonstrateMs-this.elapsed):0,showHints:this.mode!=='demonstrate'};}
}
export const metricLimb=m=>`${m.key.endsWith('-1')?'right':'left'}-${m.key.startsWith('elbow')||m.key.startsWith('trunk')||m.key.startsWith('height')?'arm':'leg'}`;
// Confirm a previously wrong limb before briefly highlighting its correction.
export class RowingLimbFeedback {
 constructor({holdMs=600,flashMs=1400}={}){this.holdMs=holdMs;this.flashMs=flashMs;this.reset();}
 reset(){this.states=new Map();this.errorTimes=new Map();this.last=null;}
 pause(){this.last=null;this.errorTimes.clear();for(const s of this.states.values()){s.since=null;s.until=0;}}
 errors(metrics,valid,now){
  if(!valid){this.errorTimes.clear();return [];}
  const failed=metrics.filter(m=>!m.close),keys=new Set(failed.map(m=>m.key));
  for(const key of this.errorTimes.keys())if(!keys.has(key))this.errorTimes.delete(key);
  return failed.filter(m=>{if(!this.errorTimes.has(m.key))this.errorTimes.set(m.key,now);return now-this.errorTimes.get(m.key)>=1200;});
 }
 update(metrics,valid,now){
  const gap=this.last===null?0:now-this.last;this.last=now;
  const groups=new Map();
  for(const m of metrics){const key=metricLimb(m);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
  for(const[key,state]of this.states)if(!valid||!groups.has(key)||gap>500){state.since=null;state.until=0;}
  if(valid)for(const[key,rows]of groups){
   let state=this.states.get(key);const failed=rows.filter(m=>!m.close);
   if(failed.length){
    state??={wrong:true,failed:new Set(),since:null,until:0};
    state.wrong=true;state.since=null;state.until=0;failed.forEach(m=>state.failed.add(m.key));this.states.set(key,state);
   }else if(state?.wrong){
    if([...state.failed].every(k=>rows.some(m=>m.key===k&&m.close))){
     state.since??=now;
     if(now-state.since>=this.holdMs){state.wrong=false;state.until=now+this.flashMs;state.failed.clear();}
    }else state.since=null;
   }
  }
  return valid?[...this.states].filter(([key,s])=>s.until>now&&groups.has(key)).map(([key])=>({key,metrics:groups.get(key)})):[];
 }
}
export function rowingAdjustmentCue(metric){
 const right=metric.key.endsWith('-1'),open=metric.actual<metric.target;
 if(metric.key.startsWith('height'))return {en:`${metric.direction==='down'?'Lower':'Raise'} your ${right?'right':'left'} elbow`,zh:`${right?'右':'左'}肘${metric.direction==='down'?'放低':'抬高'}一点`};
 if(metric.key.startsWith('elbow'))return {en:`${open?'Straighten':'Bend'} your ${right?'right':'left'} elbow a little`,zh:`${right?'右':'左'}肘再${open?'伸直':'弯曲'}一点`};
 if(metric.key.startsWith('knee'))return {en:`${open?'Straighten':'Bend'} your ${right?'right':'left'} knee a little`,zh:`${right?'右':'左'}膝再${open?'伸直':'弯曲'}一点`};
 if(metric.key.startsWith('trunk'))return {en:`${open?'Open':'Narrow'} the angle between your ${right?'right':'left'} upper arm and torso`,zh:`${right?'右':'左'}上臂与躯干的夹角再${open?'打开':'收小'}一点`};
 return {en:`${open?'Open':'Narrow'} the angle between your torso and ${right?'right':'left'} thigh`,zh:`上身与${right?'右':'左'}大腿的夹角再${open?'打开':'收小'}一点`};
}
export function rowingFeedbackSegments(connections,errors,resolved){
 const matching=(rows,a,b)=>rows.some(m=>m.ids.includes(a)&&m.ids.includes(b));
 return connections.flatMap(([a,b])=>matching(errors,a,b)?[{a,b,state:'error'}]:matching(resolved,a,b)?[{a,b,state:'resolved'}]:[]);
}
