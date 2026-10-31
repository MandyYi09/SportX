const arms=[[11,13,15],[12,14,16]],joints=[11,12,13,14,15,16,23,24,25,26,27,28];
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const measured=p=>finite(p)&&p.visibility>=.55&&p.x>=.015&&p.x<=.985&&p.y>=.015&&p.y<=.985;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Short occlusions use only the user's own recent limb geometry, never the expert pose.
export class RowingPoseTracker{
 constructor({holdMs=450}={}){this.holdMs=holdMs;this.reset();}
 reset(){this.history=new Map();this.last=null;}
 update(input,world,now,width=960,height=540){
  if(this.last!==null&&(now-this.last>700||now<this.last))this.reset();this.last=now;
  if(!input)return {pose:null,world:null};
  const pose=input.map(p=>({...p})),reconstructed=[];
  const aspect=width/height,toPlane=p=>({x:p.x*aspect,y:p.y}),fromPlane=p=>({x:p.x/aspect,y:p.y});
  // Fit the model's 3D projection to current reliable body anchors. This also
  // supplies an explicitly inferred limb on a cold start, without an expert prior.
  const anchors=[11,12,23,24].filter(i=>measured(pose[i])&&world?.[i]&&[world[i].x,world[i].y,world[i].z].every(Number.isFinite));
  let projectWorld=null;
  if(anchors.length>=3){
   const center=anchors.reduce((c,i)=>({x:c.x+world[i].x/anchors.length,y:c.y+world[i].y/anchors.length}),{x:0,y:0});
   const screen=anchors.reduce((c,i)=>{const p=toPlane(pose[i]);return {x:c.x+p.x/anchors.length,y:c.y+p.y/anchors.length};},{x:0,y:0});
   let dot=0,square=0;for(const i of anchors){const a=world[i],b=toPlane(pose[i]);dot+=(a.x-center.x)*(b.x-screen.x)+(a.y-center.y)*(b.y-screen.y);square+=(a.x-center.x)**2+(a.y-center.y)**2;}
   const scale=dot/square;
   const project=p=>({x:screen.x+(p.x-center.x)*scale,y:screen.y+(p.y-center.y)*scale});
   const residual=anchors.reduce((sum,i)=>sum+distance(project(world[i]),toPlane(pose[i]))**2,0)/anchors.length;
   if(scale>.08&&scale<4&&residual<.0025)projectWorld=i=>{
    const p=world?.[i];if(!p||![p.x,p.y,p.z].every(Number.isFinite))return null;
    const candidate=fromPlane(project(p));return candidate.x>.015&&candidate.x<.985&&candidate.y>.015&&candidate.y<.985?candidate:null;
   };
  }
  for(const [shoulder,elbow,wrist]of arms){
   const s=pose[shoulder],e=pose[elbow],w=pose[wrist],anchor=measured(s)?s:null;
   if(!anchor)continue;
   const old=this.history.get(elbow),oldW=this.history.get(wrist),oldS=this.history.get(shoulder);
   const displacement=oldS?{x:s.x-oldS.point.x,y:s.y-oldS.point.y}:{x:0,y:0};
   const predict=i=>{
    const h=this.history.get(i);if(!h||now-h.time>this.holdMs)return null;
    return {...h.point,x:h.point.x+displacement.x,y:h.point.y+displacement.y,visibility:.6,inferred:true,inferenceAge:now-h.time,inferenceMethod:'temporal-continuity',inferenceConfidence:.6*Math.exp(-(now-h.time)/450),inferenceAnchors:[shoulder]};
   };
   // Reject isolated teleports and arm-length explosions while the shoulder stays stable.
   for(const i of [elbow,wrist]){
    const h=this.history.get(i),point=pose[i],prior=predict(i);
    if(!prior){
     if(!measured(point)&&projectWorld){
      const chain=i===elbow?[shoulder,elbow]:[elbow,wrist],a=world?.[chain[0]],b=world?.[chain[1]],length=a&&b?Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z):0,candidate=projectWorld(i);
      if(candidate&&length>.08&&length<.65){pose[i]={...point,...candidate,visibility:.6,inferred:true,inferenceAge:0,inferenceMethod:'world-projection',inferenceConfidence:.4,inferenceAnchors:anchors.slice()};reconstructed.push(i);}
     }continue;
    }
    const jump=finite(point)?distance(toPlane(point),toPlane(prior)):Infinity;
    if(!measured(point)||jump>.22&&now-h.time<250){pose[i]=prior;reconstructed.push(i);}
   }
   // A newly displaced elbow is not trustworthy when its wrist is already
   // reconstructed. Do not turn that incomplete chain into a certain height cue.
   if(pose[wrist]?.inferred&&!pose[elbow]?.inferred&&old&&oldS&&now-old.time<250){
    const prior=predict(elbow);
    if(prior&&distance(toPlane(pose[elbow]),toPlane(prior))>.08){
     pose[elbow]={...prior,inferenceMethod:'incomplete-chain-continuity'};reconstructed.push(elbow);
    }
   }
   // If only the elbow drops out, solve the two measured arm-length circles.
   if(pose[elbow]?.inferred&&measured(pose[wrist])&&!pose[wrist].inferred&&old&&oldW&&oldS){
    const a=toPlane(s),b=toPlane(pose[wrist]),c=toPlane(pose[elbow]);
    const r=distance(toPlane(old.point),toPlane(oldS.point)),q=distance(toPlane(old.point),toPlane(oldW.point)),d=distance(a,b);
    if(r>.02&&q>.02&&d>.01&&d<r+q&&d>Math.abs(r-q)){
     const x=(r*r-q*q+d*d)/(2*d),h=Math.sqrt(Math.max(0,r*r-x*x)),ux=(b.x-a.x)/d,uy=(b.y-a.y)/d;
     const candidates=[1,-1].map(sign=>({x:a.x+x*ux-sign*h*uy,y:a.y+x*uy+sign*h*ux}));
     candidates.sort((u,v)=>distance(u,c)-distance(v,c));Object.assign(pose[elbow],fromPlane(candidates[0]),{inferenceMethod:'two-bone-ik',inferenceConfidence:.75*(1-Math.min(1,(now-old.time)/this.holdMs)*.5),inferenceAnchors:[shoulder,wrist]});
    }
   }
  }
  for(const i of joints){
   const point=pose[i];if(!measured(point)||point.inferred)continue;
   const previous=this.history.get(i);
   // Light smoothing only for measured coordinates; do not freeze fast strokes.
   if(previous&&now-previous.time<250){const blend=.8;point.x=previous.point.x+(point.x-previous.point.x)*blend;point.y=previous.point.y+(point.y-previous.point.y)*blend;}
   this.history.set(i,{point:{...point},time:now});
  }
  const outputWorld=world?.map(p=>({...p}))??null;
  if(outputWorld)for(const i of reconstructed)outputWorld[i]={...outputWorld[i],inferred:true};
  return {pose,world:outputWorld};
 }
}
export function paintInferredArms(ctx,actual,inferred=[]){
 const ids=new Set(inferred);ctx.save();ctx.strokeStyle='#9ed4ff';ctx.lineWidth=3;ctx.setLineDash([5,7]);
 for(const[s,e,w]of arms)for(const[a,b]of [[s,e],[e,w]]){
  if(!ids.has(a)&&!ids.has(b)||!actual[a]||!actual[b])continue;
  ctx.beginPath();ctx.moveTo(actual[a].x,actual[a].y);ctx.lineTo(actual[b].x,actual[b].y);ctx.stroke();
 }
 ctx.restore();
}
