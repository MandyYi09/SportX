// Adapt only the expert display. Pose input resolution/frequency and camera
// recording are independent of this budget. Final exports bypass it entirely.
const levels=[{maxFps:20,maxWidth:720},{maxFps:12,maxWidth:480},{maxFps:8,maxWidth:360}];
export class RowingRenderBudget{
 constructor(){this.reset();}
 reset(){this.inference=0;this.render=0;this.frameGap=0;this.previous=null;this.level=0;this.recoverSince=null;}
 observeInference(ms){if(Number.isFinite(ms)&&ms>=0)this.inference=this.inference?this.inference*.7+ms*.3:ms;}
 observeRender(ms){if(Number.isFinite(ms)&&ms>=0)this.render=this.render?this.render*.7+ms*.3:ms;}
 observeFrame(now){if(this.previous!==null){const gap=now-this.previous;if(gap>0&&gap<1000)this.frameGap=this.frameGap?this.frameGap*.85+gap*.15:gap;}this.previous=now;}
 read(now=performance.now()){
  const requested=this.inference>180||this.render>25||this.frameGap>65?2:this.inference>110||this.render>12||this.frameGap>38?1:0;
  if(requested>this.level){this.level=requested;this.recoverSince=null;}
  else if(requested<this.level){this.recoverSince??=now;if(now-this.recoverSince>=3000){this.level--;this.recoverSince=null;}}
  else this.recoverSince=null;
  return {...levels[this.level],level:this.level};
 }
}
