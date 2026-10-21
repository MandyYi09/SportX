import {sampleCapturedMotion} from './captured-motion.mjs';
import {motionById} from './motion-catalog.mjs';
import {tennisGrip,gripFrame,mirrorGrip} from './tennis-grip.mjs';
import {rowingAttachment,clayAttachment} from './equipment-grip.mjs?v=22';

// Video-fitted animation, NOT recovered motion-capture transforms.
// Times refer to the original MP4. Keep the same track for full strokes and slices.
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const length=a=>Math.hypot(...a);
const unit=a=>mul(a,1/(length(a)||1));
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>Object.fromEntries(Object.keys(a).map(k=>[k,Array.isArray(a[k])?lerp(a[k],b[k],t):a[k]+(b[k]-a[k])*t]));

// Two-bone IK preserves segment lengths, including between reviewed keyframes.
export function solveLimb(root,target,pole,a,b) {
 const delta=sub(target,root),axis=unit(length(delta)>1e-8?delta:[0,-1,0]);
 const d=clamp(length(delta),Math.abs(a-b)+1e-5,a+b-1e-5);
 const end=add(root,mul(axis,d));
 let bend=sub(sub(pole,root),mul(axis,dot(sub(pole,root),axis)));
 if(length(bend)<1e-6)bend=cross(axis,Math.abs(axis[1])<.9?[0,1,0]:[1,0,0]);
 const along=(a*a-b*b+d*d)/(2*d),height=Math.sqrt(Math.max(0,a*a-along*along));
 return [add(add(root,mul(axis,along)),mul(unit(bend),height)),end];
}

const ready={yaw:0,hipYaw:0,lean:.09,hip:[0,.89,0],right:[.19,1.12,.35],left:[.03,1.19,.40],racket:[.12,.92,.37],leftFoot:[-.24,.10,.08],rightFoot:[.24,.10,-.08]};
const f=(changes)=>({...ready,...changes});
const forehand=[
 [1.3,f({})],
 [1.8,f({yaw:.75,hipYaw:.45,right:[.43,1.28,.02],left:[.20,1.30,.35],racket:[.15,.98,-.10]})],
 [2.5,f({yaw:1.35,hipYaw:.85,lean:.06,right:[.52,1.29,-.25],left:[-.22,1.28,.48],racket:[.10,.95,-.28]})],
 [3.0,f({yaw:1.35,hipYaw:.85,lean:.06,right:[.52,1.29,-.25],left:[-.22,1.28,.48],racket:[.10,.95,-.28]})],
 [3.6,f({yaw:1.20,hipYaw:.60,hip:[0,.85,0],right:[.53,1.13,-.28],left:[-.25,1.25,.48],racket:[.25,.45,-.85]})],
 [4.0,f({yaw:.55,hipYaw:.15,hip:[-.03,.88,.03],right:[.50,.98,.02],left:[-.30,1.25,.40],racket:[.20,-.60,-.77],rightFoot:[.25,.15,-.10]})],
 [4.15,f({yaw:.12,hipYaw:-.12,hip:[-.04,.92,.05],right:[.38,1.12,.53],left:[-.27,1.29,.25],racket:[.85,.35,.25],rightFoot:[.27,.21,-.13]})],
 [4.36,f({yaw:-.55,hipYaw:-.35,lean:.06,hip:[-.04,.93,.05],right:[-.26,1.48,.40],left:[-.31,1.37,.24],racket:[-.75,.45,-.48],rightFoot:[.28,.22,-.12]})],
 [4.7,f({yaw:-.60,hipYaw:-.35,lean:.06,hip:[-.03,.92,.04],right:[-.28,1.48,.29],left:[-.30,1.36,.25],racket:[-.38,.20,-.90],rightFoot:[.26,.16,-.09]})],
 [5.1,f({yaw:-.10,hipYaw:-.05,right:[.02,1.24,.36],left:[-.10,1.24,.40],racket:[-.25,.90,.25]})],
 [5.5,f({})],
];
const b=(changes)=>({...ready,...changes});
const backhand=[
 [2.6,b({})],
 [3.2,b({yaw:-.8,hipYaw:-.45,right:[-.22,1.17,.18],racket:[-.50,.83,-.20]})],
 [3.8,b({yaw:-1.3,hipYaw:-.80,lean:.06,right:[-.45,1.15,-.04],racket:[-.50,.83,-.20]})],
 [4.9,b({yaw:-1.3,hipYaw:-.80,lean:.06,right:[-.45,1.15,-.04],racket:[-.50,.83,-.20]})],
 [5.3,b({yaw:-1.15,hipYaw:-.55,hip:[0,.85,0],right:[-.47,.98,-.02],racket:[-.88,-.32,-.30]})],
 [5.6,b({yaw:-.7,hipYaw:-.20,hip:[.03,.88,.02],right:[-.44,.91,.10],racket:[-.65,-.67,-.36],leftFoot:[-.25,.15,.04]})],
 [5.8,b({yaw:-.1,hipYaw:.12,hip:[.04,.92,.05],right:[-.16,1.10,.58],racket:[-.80,.35,.30],leftFoot:[-.27,.22,-.10]})],
 [6.02,b({yaw:.50,hipYaw:.35,hip:[.04,.93,.05],right:[.32,1.48,.32],racket:[.65,.60,-.47],leftFoot:[-.27,.22,-.12]})],
 [6.5,b({yaw:.55,hipYaw:.35,hip:[.03,.92,.04],right:[.31,1.48,.26],racket:[.35,.25,-.90],leftFoot:[-.25,.17,-.09]})],
 [7.15,b({yaw:.1,hipYaw:.05,right:[.20,1.30,.28],racket:[.10,.95,.29]})],
 [7.7,b({})],
];

function interpolateTrack(track,time) {
 if(time<=track[0][0])return track[0][1];
 for(let i=1;i<track.length;i++)if(time<=track[i][0]){
  const [t0,a]=track[i-1],[t1,b]=track[i];
  const t=(time-t0)/(t1-t0);
  // A shared curve means slices and a full stroke agree at every source time.
  return mix(a,b,t*t*(3-2*t));
 }
 return track.at(-1)[1];
}
function skeleton(state,{twoHands=false,rowing=false,tennis=false,clay=false}={}) {
 const {hip,yaw,hipYaw,lean}=state;
 const right=[Math.cos(yaw),0,-Math.sin(yaw)],forward=[Math.sin(yaw),0,Math.cos(yaw)];
 const up=add([0,Math.cos(lean),0],mul(forward,Math.sin(lean)));
 const shoulder=add(hip,mul(up,.54)),hipRight=[Math.cos(hipYaw),0,-Math.sin(hipYaw)];
 const coords=Array.from({length:12},()=>[0,0,0]);
 coords[0]=add(shoulder,mul(right,-.21));coords[1]=add(shoulder,mul(right,.21));
 coords[6]=add(hip,mul(hipRight,-.14));coords[7]=add(hip,mul(hipRight,.14));
 const racketDirection=unit(state.racket),gripOffset=mul(racketDirection,.075);
 let handRight=[...state.right];
 const makeGrips=()=>[
  twoHands?gripFrame(add(handRight,mul(racketDirection,tennisGrip.spacing)),racketDirection,coords[0],forward):null,
  gripFrame(handRight,racketDirection,coords[1],forward),
 ];
 if(twoHands){
  // Move the shared handle as one object; wrist offsets are radial to it,
  // rather than putting both forearms lengthwise through the handle.
  for(let pass=0;pass<32;pass++)for(let side=0;side<2;side++){
   const delta=sub(makeGrips()[side].wrist,coords[side]);
   if(length(delta)>.635)handRight=sub(handRight,mul(unit(delta),length(delta)-.635));
  }
 }
 const tennisHands=tennis?makeGrips():null;
 let clayProp=null;
 if(clay){
  const axis=sub(state.left,state.right);
  let rear=[...state.right];
  for(let pass=0;pass<32;pass++)for(let side=0;side<2;side++){
   const delta=sub(clayAttachment(rear,axis).hands[side].wrist,coords[side]);
   if(length(delta)>.635)rear=sub(rear,mul(unit(delta),length(delta)-.635));
  }
  clayProp=clayAttachment(rear,axis);
 }
 const handLeft=twoHands?add(handRight,mul(racketDirection,tennisGrip.spacing)):state.left;
 for(let side=0;side<2;side++){
  const hand=side?handRight:handLeft;
  const wrist=clay?clayProp.hands[side].wrist:tennis?(tennisHands[side]?.wrist||hand):rowing?hand:sub(hand,gripOffset);
  const elbowPole=add(add(shoulder,mul(right,side?.50:-.50)),add(mul(forward,-.25),[0,-.30,0]));
  [coords[2+side],coords[4+side]]=solveLimb(coords[side],wrist,elbowPole,.33,.31);
  const foot=side?state.rightFoot:state.leftFoot;
  const kneePole=add(coords[6+side],rowing?add(mul(forward,.1),[0,.6,0]):add(mul(forward,.5),[0,-.15,0]));
  [coords[8+side],coords[10+side]]=solveLimb(coords[6+side],foot,kneePole,.43,.43);
 }
 if(tennis)for(let side=0;side<2;side++){
  const grip=tennisHands[side];if(!grip)continue;
  // A one-handed target can exceed reach: move its attached racket with the
  // solved wrist, never leave the mesh behind at the unreachable target.
  grip.center=add(grip.center,sub(coords[4+side],grip.wrist));
  grip.wrist=[...coords[4+side]];
 }
 const racketPosition=tennis?sub(tennisHands[1].center,mul(racketDirection,tennisGrip.buttToLowerHand)):add(coords[5],gripOffset);
 const oars=rowing?[-1,1].map((side,i)=>rowingAttachment(coords[4+i],side)):null;
 const equipmentHands=clay?clayProp.hands:oars?.map(oar=>oar.hand)||null;
 return {coords,racketDirection,racketPosition,tennisHands,equipmentHands,oars,clayProp,headAxis:up,bodyForward:forward};
}
function rowingState(clip,t) {
 const half=clip.track==='rowing-half',full=clip.track==='rowing-full';
 const timeline=full?[.3,1.2,3.4,4.6,6.4,8.1,10.6]:half?[.3,1.1,3.6,5.1,7.3,9.0,12.2]:[.8,2.0,3.6,4.8,6.4,7.8,9.8];
 // Fit the modest slide visible in these recordings; do not invent a deeper catch.
 const lean=full?.55:half?.40:.03,slide=full?.16:half?.06:0;
 const make=(reach,tilt,shift,handHeight=1.0)=>({
  yaw:-Math.PI/2,hipYaw:-Math.PI/2,lean:tilt,hip:[.25-shift,.65,0],
  right:[reach,handHeight,.10],left:[reach,handHeight+.035,-.10],racket:[0,0,1],
  leftFoot:[-.53,.47,-.13],rightFoot:[-.53,.47,.13],
 });
 const finish=make(.13,-.14,0),away=make(-.40,.02,0,.97),catchPose=make(-.66,lean,slide,1.02);
 const track=[[timeline[0],finish],[timeline[1],finish],[timeline[2],catchPose],[timeline[3],make(-.48,full?.10:.02,0,1.02)],[timeline[4],finish],[timeline[5],make(.12,-.08,0,.92)],[timeline[6],make(.13,-.14,0)]];
 if(!full&&!half)track[2][1]=make(-.40,.03,0,1.03);
 // A hands-away interval before the body and seat move forward.
 track.splice(2,0,[(timeline[1]+timeline[2])*.5,away]);
 return interpolateTrack(track,t);
}
function clayState(clip,t) {
 const low=f({yaw:.25,hipYaw:.18,right:[.25,.85,.20],left:[-.05,.95,.38],racket:[-.25,-.9,.1]});
 const readyHold=f({yaw:.25,hipYaw:.18,right:[.22,1.15,.24],left:[-.18,1.25,.50],racket:[-.2,.2,.9]});
 const raised=f({yaw:.25,hipYaw:.18,lean:.14,right:[.18,1.40,.20],left:[-.18,1.39,.53],racket:[-.2,.1,.9]});
 // Exterior animation study only. No ballistics, sight alignment or firing simulation.
 const tracks={
  'clay-ready':[[1.8,low],[2.7,readyHold],[6.3,readyHold]],
  'clay-mount':[[1.5,low],[2.3,readyHold],[3.7,raised],[7.8,raised]],
  'clay-lower':[[10.5,raised],[11.5,raised],[12.7,low],[13.3,low]],
  'clay-full':[[.5,low],[2,readyHold],[4.8,raised],[9,{...raised,yaw:.40}],[14,{...raised,yaw:-.15}],[18.5,raised],[20.3,low],[21.5,low]],
 };
 return interpolateTrack(tracks[clip.track],t);
}
export function sampleMotion(id,elapsed=0,flipped=false) {
 const captured=sampleCapturedMotion(id,elapsed,flipped);if(captured)return captured;
 const clip=motionById[id];if(!clip)return null;
 const t=clip.sourceStart+clamp(Number.isFinite(elapsed)?elapsed:0,0,clip.sourceEnd-clip.sourceStart);
 const state=clip.type==='tennis'?interpolateTrack(clip.track==='forehand'?forehand:backhand,t):clip.type==='rowing'?rowingState(clip,t):clayState(clip,t);
 const result=skeleton(state,{twoHands:clip.track==='backhand',rowing:clip.type==='rowing',tennis:clip.type==='tennis',clay:clip.type==='clay'});
 if(flipped){
  result.coords=result.coords.map((_,i)=>{const q=result.coords[i%2===0?i+1:i-1];return [-q[0],q[1],q[2]];});
  for(const key of ['racketDirection','racketPosition','headAxis','bodyForward'])result[key]=[-result[key][0],result[key][1],result[key][2]];
  if(result.tennisHands)result.tennisHands=[mirrorGrip(result.tennisHands[1]),mirrorGrip(result.tennisHands[0])];
  if(result.equipmentHands)result.equipmentHands=[mirrorGrip(result.equipmentHands[1]),mirrorGrip(result.equipmentHands[0])];
  const reflect=v=>[-v[0],v[1],v[2]];
  if(result.oars)result.oars=result.oars.slice().reverse().map(oar=>({...oar,hand:mirrorGrip(oar.hand),pivot:reflect(oar.pivot),start:reflect(oar.start),end:reflect(oar.end),axis:reflect(oar.axis)}));
  if(result.clayProp)result.clayProp={...result.clayProp,hands:result.equipmentHands,origin:reflect(result.clayProp.origin),x:reflect(result.clayProp.x),y:reflect(result.clayProp.y),z:mul(reflect(result.clayProp.z),-1),mirrored:true};
 }
 return {...result,sourceTime:t};
}
