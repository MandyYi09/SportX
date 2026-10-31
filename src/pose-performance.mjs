export class PosePerformanceStats{
 constructor(){this.start=null;this.end=null;this.frames=0;this.inferences=0;this.renders=0;this.cost=0;}
 begin(now){this.start=now;this.end=null;this.frames=0;this.inferences=0;this.renders=0;this.cost=0;this.experts=0;this.samples=[];this.previous={at:now,frames:0,inferences:0,renders:0,experts:0,cost:0};}
 mark(kind,value=0){if(this.start===null||this.end!==null)return;this[kind]++;if(kind==='inferences')this.cost+=value;}
 snapshot(now){
  const seconds=this.start===null?0:Math.max(0,((this.end??now)-this.start)/1000);
  return {seconds,cameraFps:seconds?this.frames/seconds:0,poseFps:seconds?this.inferences/seconds:0,overlayFps:seconds?this.renders/seconds:0,expertFps:seconds?(this.experts??0)/seconds:0,inferenceMs:this.inferences?this.cost/this.inferences:null};
 }
 sample(now){
  if(this.start===null||this.end!==null||now<=this.previous.at)return;
  const p=this.previous,seconds=(now-p.at)/1000,count=this.inferences-p.inferences;
  this.samples.push({start:(p.at-this.start)/1000,end:(now-this.start)/1000,seconds,cameraFps:(this.frames-p.frames)/seconds,poseFps:count/seconds,overlayFps:(this.renders-p.renders)/seconds,expertFps:(this.experts-p.experts)/seconds,inferenceMs:count?(this.cost-p.cost)/count:null});
  this.previous={at:now,frames:this.frames,inferences:this.inferences,renders:this.renders,experts:this.experts,cost:this.cost};
 }
 finish(now){if(this.start!==null&&this.end===null){this.sample(now);this.end=now;}return this.snapshot(now);}
 report(now){return {...this.finish(now),samples:this.samples.map(s=>({...s}))};}
}
export function recordedPerformanceAt(report,time){
 if(!report?.samples?.length)return report;
 const t=Math.max(0,Math.min(report.seconds,time));
 const sample=report.samples.find(s=>t>=s.start&&t<s.end)??report.samples.at(-1);
 return {...sample,atTime:t,recordingSeconds:report.seconds};
}
export function paintRecordingPerformance(ctx,sample,width,{language='en'}={}){
 if(!sample)return;
 const zh=language==='zh',format=n=>Number.isFinite(n)?n.toFixed(1):'—';
 const timeline=Number.isFinite(sample.atTime);
 const lines=[timeline?(zh?`录制时刻 ${sample.atTime.toFixed(1)} 秒 · 区间实测`:`Recorded at ${sample.atTime.toFixed(1)} s · sampled FPS`):(zh?`录制期间平均 · ${sample.seconds.toFixed(1)} 秒`:`Recording average · ${sample.seconds.toFixed(1)} s`),
  `${zh?'画面':'Camera'} ${format(sample.cameraFps)} FPS · ${zh?'识别':'Pose'} ${format(sample.poseFps)} FPS`,
  `${zh?'叠加':'Overlay'} ${format(sample.overlayFps)} FPS · ${zh?'专家':'Expert'} ${format(sample.expertFps)} FPS`,
  `${zh?'识别耗时':'Inference'} ${format(sample.inferenceMs)} ms`];
 const size=Math.max(14,Math.round(width/60)),line=size*1.5,padding=size*.6;
 ctx.save();ctx.font=`600 ${size}px sans-serif`;ctx.textBaseline='top';
 const box=Math.min(width-20,Math.max(...lines.map(text=>ctx.measureText(text).width))+padding*2);
 ctx.fillStyle='#101b28e8';ctx.fillRect(10,10,box,line*lines.length+padding*2);ctx.fillStyle='#d8ebfa';
 lines.forEach((text,i)=>ctx.fillText(text,10+padding,10+padding+i*line,width-20-padding*2));ctx.restore();
}
export function createPosePerformanceHUD(host,video){
 const badge=document.createElement('output');badge.className='pose-performance';badge.hidden=true;badge.setAttribute('aria-label','Camera and pose performance');host.append(badge);
 let frames=0,inferences=0,renders=0,experts=0,cost=0,start=performance.now(),callback=null,disposed=false,frozen=null,selected=null;
 const recording=new PosePerformanceStats();
 let lastDisplay='';
 function cameraFrame(){if(disposed)return;if(!frozen){frames++;recording.mark('frames');}callback=video.requestVideoFrameCallback(cameraFrame);}
 if(video.requestVideoFrameCallback)callback=video.requestVideoFrameCallback(cameraFrame);
 let lastTotal=video.getVideoPlaybackQuality?.().totalVideoFrames??0;
 function captureFallback(){
  const total=video.getVideoPlaybackQuality?.().totalVideoFrames??lastTotal;
  const count=Math.max(0,total-lastTotal);lastTotal=total;
  if(!video.requestVideoFrameCallback){frames+=count;if(recording.start!==null&&recording.end===null)recording.frames+=count;}
 }
 function render(sample,summary=false){
  const zh=document.documentElement.lang.startsWith('zh'),format=n=>Number.isFinite(n)?n.toFixed(1):'—';
  const signature=[zh,summary,Number.isFinite(sample.atTime)?sample.atTime.toFixed(1):'',sample.start,sample.end,sample.cameraFps,sample.poseFps,sample.expertFps,sample.overlayFps,sample.inferenceMs].join('|');
  if(signature===lastDisplay)return;lastDisplay=signature;
  const timeline=Number.isFinite(sample.atTime);
  const prefix=timeline?(zh?`录制 ${sample.atTime.toFixed(1)} 秒（区间实测）`:`Recorded ${sample.atTime.toFixed(1)} s (sampled)`):summary?(zh?`本次录制平均（${sample.seconds.toFixed(1)} 秒）`:`Recording average (${sample.seconds.toFixed(1)} s)`):(zh?'实时':'Live');
  badge.textContent=`${prefix} · ${zh?'画面':'Camera'} ${format(sample.cameraFps)} FPS · ${zh?'识别':'Pose'} ${format(sample.poseFps)} FPS · ${zh?'识别耗时':'Inference'} ${format(sample.inferenceMs)} ms · ${zh?'叠加':'Overlay'} ${format(sample.overlayFps)} FPS · ${zh?'专家':'Expert'} ${format(sample.expertFps)} FPS`;
  badge.dataset.cameraFps=String(sample.cameraFps);badge.dataset.poseFps=String(sample.poseFps);badge.dataset.expertFps=String(sample.expertFps);badge.dataset.measurement=timeline?'recording-timeline':summary?'recording':'live';badge.dataset.seconds=String(sample.recordingSeconds??sample.seconds);badge.dataset.atTime=String(sample.atTime??'');
  badge.dataset.sampleStart=String(sample.start??'');badge.dataset.sampleEnd=String(sample.end??'');
 }
 function resetLive(){frames=0;inferences=0;renders=0;experts=0;cost=0;start=performance.now();lastTotal=video.getVideoPlaybackQuality?.().totalVideoFrames??0;}
 const timer=setInterval(()=>{
  if(frozen){render(selected??frozen,true);return;}
  captureFallback();const now=performance.now(),seconds=(now-start)/1000;
  recording.sample(now);
  render({seconds,cameraFps:frames/seconds,poseFps:inferences/seconds,overlayFps:renders/seconds,expertFps:experts/seconds,inferenceMs:inferences?cost/inferences:null});
  frames=0;inferences=0;renders=0;experts=0;cost=0;start=now;
 },1000);
 return {
  setVisible(value){badge.hidden=!value;},
  markInference(ms){if(frozen)return;inferences++;cost+=ms;recording.mark('inferences',ms);},
  markRender(){if(frozen)return;renders++;recording.mark('renders');},
  markExpert(){if(frozen)return;experts++;recording.mark('experts');},
  beginRecording(){frozen=null;selected=null;resetLive();recording.begin(performance.now());},
  finishRecording(){captureFallback();frozen=recording.report(performance.now());selected=null;render(frozen,true);return frozen;},
  showRecordedTime(time){if(frozen){selected=recordedPerformanceAt(frozen,time);render(selected,true);}return selected;},
  resumeLive(){frozen=null;selected=null;recording.start=null;resetLive();},
  dispose(){disposed=true;clearInterval(timer);if(callback!==null)video.cancelVideoFrameCallback?.(callback);badge.remove();},
 };
}
