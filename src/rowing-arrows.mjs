import {jointAngle} from './rowing-correction.mjs';
// Arrow targets use the same projected reference as the expert mesh.
export function rowingMovementArrow(metric,actual,reference,width,height){
 if(metric.close||metric.estimated||metric.screenArrow===false)return null;
 let joint,pivot,target;
 if(metric.kind==='position'){
  joint=metric.joint;pivot=metric.ids[0];target=metric.targetPoint;
 }else{
  pivot=metric.ids[1];joint=metric.key.startsWith('hip')?metric.ids[0]:metric.ids[2];
  const a=actual[pivot],b=actual[joint],r=reference[joint],rp=reference[pivot];if(!a||!b||!r||!rp)return null;
  const dx=r.x-rp.x,dy=r.y-rp.y,l=Math.hypot(dx,dy),live=Math.hypot(b.x-a.x,b.y-a.y);if(l<4||live<8)return null;
  target={x:a.x+dx/l*live,y:a.y+dy/l*live};
  if(metric.key.startsWith('elbow')||metric.key.startsWith('knee')){
   const proximal=actual[metric.ids[0]];if(!proximal)return null;
   const angle=(metric.imageTarget??jointAngle(...metric.ids.map(i=>reference[i])))*Math.PI/180;
   const base=Math.atan2(proximal.y-a.y,proximal.x-a.x),current=Math.atan2(b.y-a.y,b.x-a.x);
   const options=[base+angle,base-angle],difference=t=>Math.abs(Math.atan2(Math.sin(t-current),Math.cos(t-current)));
   const chosen=difference(options[0])<=difference(options[1])?options[0]:options[1];
   target={x:a.x+Math.cos(chosen)*live,y:a.y+Math.sin(chosen)*live};
  }
 }
 const start=actual[joint];if(!start||!target)return null;
 const dx=target.x-start.x,dy=target.y-start.y,distance=Math.hypot(dx,dy);if(distance<height*.025)return null;
 const length=Math.min(distance,height*.28),ux=dx/distance,uy=dy/distance;
 const offset=Math.max(12,height*.035),padding=18;
 const clamp=(n,max)=>Math.max(padding,Math.min(max-padding,n));
 const from={x:clamp(start.x-uy*offset,width),y:clamp(start.y+ux*offset,height)};
 const to={x:clamp(from.x+ux*length,width),y:clamp(from.y+uy*length,height)};
 const bend=Math.min(height*.07,length*.25),control={x:(from.x+to.x)/2-uy*bend,y:(from.y+to.y)/2+ux*bend};
 const path=`M ${from.x.toFixed(2)} ${from.y.toFixed(2)} Q ${control.x.toFixed(2)} ${control.y.toFixed(2)} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
 return {key:metric.key,joint,from,to,control,path,direction:Math.abs(dy)>=Math.abs(dx)?(dy>0?'down':'up'):(dx>0?'right':'left')};
}
export function renderRowingArrows(host,arrows,width,height){
 host.setAttribute('viewBox',`0 0 ${width} ${height}`);host.style.setProperty('--rowing-arrow-width',String(Math.max(3,height*.006)));
 const signature=arrows.map(a=>a.key).join('|');
 const nodes=[...host.querySelectorAll('.rowing-motion-arrow')];
 if(host.dataset.keys!==signature||nodes.length!==arrows.length){
  host.innerHTML=arrows.map(()=>'<g class="rowing-motion-arrow"><path class="rowing-arrow-shadow"/><path class="rowing-arrow-line"/><path class="rowing-arrow-end" d="M -13 -9 L 0 0 L -13 9"/><path class="rowing-arrow-tip" d="M -15 -10 L 1 0 L -15 10"/></g>').join('');
  host.dataset.keys=signature;
 }
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 host.querySelectorAll('.rowing-motion-arrow').forEach((node,i)=>{
  const a=arrows[i];node.dataset.direction=a.direction;node.dataset.joint=String(a.joint);
  node.querySelector('.rowing-arrow-shadow').setAttribute('d',a.path);node.querySelector('.rowing-arrow-line').setAttribute('d',a.path);
  const angle=Math.atan2(a.to.y-a.control.y,a.to.x-a.control.x)*180/Math.PI;
  node.querySelector('.rowing-arrow-end').setAttribute('transform',`translate(${a.to.x} ${a.to.y}) rotate(${angle})`);
  const tip=node.querySelector('.rowing-arrow-tip');
  // CSS motion follows the curve without restarting its animation on each tracking frame.
  tip.style.offsetPath=`path("${a.path}")`;tip.style.offsetDistance=reduced?'100%':'';
 });
 host.dataset.count=String(arrows.length);
}
// Canvas equivalent of the static SVG, also baked into exported video frames.
export function paintRowingArrows(ctx,arrows,{time=0,reduced=false}={}){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 for(const a of arrows){
  const curve=()=>{ctx.beginPath();ctx.moveTo(a.from.x,a.from.y);ctx.quadraticCurveTo(a.control.x,a.control.y,a.to.x,a.to.y);};
  ctx.setLineDash([]);curve();ctx.strokeStyle='#12212be0';ctx.lineWidth=11;ctx.stroke();
  curve();ctx.strokeStyle='#ffcf81';ctx.lineWidth=5;ctx.setLineDash([12,8]);ctx.lineDashOffset=reduced?0:-time*.02;ctx.stroke();
  ctx.setLineDash([]);ctx.lineDashOffset=0;ctx.strokeStyle='#fff0c2';
  const tip=(x,y,angle)=>{ctx.beginPath();ctx.moveTo(x-13*Math.cos(angle-.6),y-13*Math.sin(angle-.6));ctx.lineTo(x,y);ctx.lineTo(x-13*Math.cos(angle+.6),y-13*Math.sin(angle+.6));ctx.stroke();};
  tip(a.to.x,a.to.y,Math.atan2(a.to.y-a.control.y,a.to.x-a.control.x));
  if(!reduced){const t=(time%1600)/1600,u=1-t,x=u*u*a.from.x+2*u*t*a.control.x+t*t*a.to.x,y=u*u*a.from.y+2*u*t*a.control.y+t*t*a.to.y;
   ctx.globalAlpha=Math.min(1,t*7,(1-t)*7);tip(x,y,Math.atan2(u*(a.control.y-a.from.y)+t*(a.to.y-a.control.y),u*(a.control.x-a.from.x)+t*(a.to.x-a.control.x)));ctx.globalAlpha=1;
  }
 }
 ctx.restore();
}
