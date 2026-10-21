// Arrow targets use the same projected reference as the expert mesh.
export function rowingMovementArrow(metric,actual,reference,width,height){
 if(metric.close)return null;
 let joint,pivot,target;
 if(metric.kind==='position'){
  joint=metric.joint;pivot=metric.ids[0];target=metric.targetPoint;
 }else{
  pivot=metric.ids[1];joint=metric.key.startsWith('hip')?metric.ids[0]:metric.ids[2];
  const a=actual[pivot],b=actual[joint],r=reference[joint],rp=reference[pivot];if(!a||!b||!r||!rp)return null;
  const dx=r.x-rp.x,dy=r.y-rp.y,l=Math.hypot(dx,dy),live=Math.hypot(b.x-a.x,b.y-a.y);if(l<4||live<8)return null;
  target={x:a.x+dx/l*live,y:a.y+dy/l*live};
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
