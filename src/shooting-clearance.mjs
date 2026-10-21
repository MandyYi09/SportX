import {Vector3} from './vendor/three.module.js';
import {shootingStockOutline} from './shooting-model.mjs';

function polygonDistance(x,y,points){
 let inside=false,distance=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside?0:distance;
}
const receiver=[[-.025,-.031],[-.025,.031],[.160,.031],[.202,.017],[.202,-.030],[.056,-.036]];
function gunDistance(p){
 const stock=Math.hypot(polygonDistance(p.x,p.y,shootingStockOutline),Math.max(0,Math.abs(p.z)-.041));
 const action=Math.hypot(polygonDistance(p.x,p.y,receiver),Math.max(0,Math.abs(p.z)-.035));
 const foreEnd=Math.hypot(Math.max(0,Math.abs(p.x-.328)-.141),Math.max(0,Math.hypot(p.y+.035,p.z)-.034));
 const barrels=Math.min(...[.014,-.012].map(y=>Math.hypot(Math.max(0,.211-p.x,p.x-.904),Math.max(0,Math.hypot(p.y-y,p.z)-.013))));
 return Math.min(stock,action,foreEnd,barrels);
}
const upperProfile=[[0,.048],[.06,.071],[.22,.073],[.48,.062],[.76,.047],[1,.039]];
const lowerProfile=[[0,.040],[.16,.051],[.38,.050],[.66,.037],[.88,.027],[1,.025]];
function radius(t,profile){let i=0;while(i<profile.length-2&&t>profile[i+1][0])i++;const a=profile[i],b=profile[i+1];return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]);}
function localPoint(point,frame){const d=point.clone().sub(frame.origin);return new Vector3(d.dot(frame.x),d.dot(frame.y),d.dot(frame.z));}
function penetration(shoulder,elbow,wrist,frame,includeUpper){
 let max=0,sum=0,location=null;
 const segments=includeUpper?[[shoulder,elbow,upperProfile],[elbow,wrist,lowerProfile]]:[[elbow,wrist,lowerProfile]];
 for(const [a,b,profile]of segments)for(let i=2;i<=18;i++){
  const t=i/20,p=localPoint(a.clone().lerp(b,t),frame);
  const depth=Math.max(0,radius(t,profile)+.003-gunDistance(p));
  if(depth>max){max=depth;location={part:profile===upperProfile?'upper':'lower',t,point:p.toArray()};}sum+=depth*depth;
 }
 return {max,sum,location};
}
// Read-only surface clearance measurement; never moves a joint or a prop.
export function measureShootingClearance(coords,prop,{includeUpper=true}={}){
 if(!prop)return [];
 const frame=Object.fromEntries(['origin','x','y','z'].map(k=>[k,new Vector3(...prop[k])]));
 const results=[];
 for(let side=0;side<2;side++){
  results.push(penetration(coords[side],coords[side+2],coords[side+4],frame,includeUpper));
 }
 return results;
}
