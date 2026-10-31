import {Quaternion,Vector3} from './vendor/three.module.js';
import {rowingAttachment} from './equipment-grip.mjs';
import {captureTracks,captureWindows,captureReferences} from './capture-catalog.mjs';
import {capturedTennis,capturedClay,reflectCaptured} from './captured-props.mjs';
const cache=new Map();
const landmarkNames=['LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'];
export async function loadCapturedMotions(){
 const ids=captureTracks;
 await Promise.all(ids.map(async id=>{
  const base=new URL(`./assets/mocap/${id}`,import.meta.url);
  const metadata=await fetch(`${base}.json`);if(!metadata.ok)throw Error(`Missing motion metadata: ${id}`);
  const meta=await metadata.json(),response=await fetch(new URL(meta.binary,base));
  if(!response.ok)throw Error(`Missing motion samples: ${id}`);
  const data=new Float32Array(await response.arrayBuffer());
  if(data.length!==meta.frames*meta.stride)throw Error(`Invalid motion samples: ${id}`);
  const track=makeTrack(meta,data);
  evaluateTrack(track,meta.sport==='clay'?3:0);
  const {positions,rotations,indices}=track;
  const axis=positions[indices.LeftHand].clone().sub(positions[indices.RightHand]).normalize();
  track.localShaft=axis.applyQuaternion(rotations[indices.RightHand].clone().invert());
  if(meta.sport==='clay'){
   // Calibrate only the prop's carry axis. Stored samples and body transforms
   // remain untouched; the rigid prop follows RightHand when the other releases.
   const coords=landmarkNames.map(name=>positions[indices[name]].toArray());
   const bodyUp=new Vector3(0,1,0).applyQuaternion(rotations[indices.Spine3]);
   const fitted=capturedClay(coords,bodyUp,rotations[indices.RightHand],track.localShaft);
   track.localShaft=new Vector3(...fitted.clayProp.x).applyQuaternion(rotations[indices.RightHand].clone().invert());
  }
  evaluateTrack(track,0);track.pivotHeight=(positions[indices.LeftHand].y+positions[indices.RightHand].y)/2;
  if(meta.sport==='rowing'){
   evaluateTrack(track,captureWindows[id]?.start??0);
   track.rowingAnchor={feet:positions[indices.LeftFoot].clone().add(positions[indices.RightFoot]).multiplyScalar(.5),hipY:(positions[indices.LeftUpLeg].y+positions[indices.RightUpLeg].y)/2};
  }
  cache.set(id,track);
 }));
 return ids.map(id=>cache.get(id).meta);
}
function makeTrack(meta,data){
 const count=meta.names.length,indices=Object.fromEntries(meta.names.map((name,i)=>[name,i]));
 return {meta,data,indices,positions:Array.from({length:count},()=>new Vector3()),rotations:Array.from({length:count},()=>new Quaternion()),
  local:new Quaternion(),other:new Quaternion(),offset:new Vector3(),global:new Quaternion().setFromAxisAngle(new Vector3(0,1,0),meta.alignment.yaw),translation:new Vector3(...meta.alignment.translation)};
}
export function capturedWindow(id){
 const window=captureWindows[id],track=window&&cache.get(window.track);if(!track)return null;
 const start=Math.max(0,Math.min(window.start,track.meta.duration));
 return {...window,start,end:Math.max(start,Math.min(window.end??track.meta.duration,track.meta.duration)),frameRate:1/track.meta.frameTime};
}
export function capturedDuration(id){const window=capturedWindow(id);return window?window.end-window.start:null;}
function evaluateTrack(track,time){
 const {meta,data,positions,rotations,indices,local,other,offset,global,translation}=track;
 const fraction=Math.max(0,Math.min(meta.duration,time))/meta.frameTime;
 const a=Math.min(meta.frames-1,Math.floor(fraction)),b=Math.min(meta.frames-1,a+1),alpha=fraction-a;
 for(let i=0;i<meta.names.length;i++){
  const parent=meta.parents[i],ia=a*meta.stride+3+i*4,ib=b*meta.stride+3+i*4;
  local.fromArray(data,ia);other.fromArray(data,ib);local.slerp(other,alpha).normalize();
  if(parent<0){
   positions[i].fromArray(data,a*meta.stride);offset.fromArray(data,b*meta.stride);positions[i].lerp(offset,alpha).applyQuaternion(global).add(translation);
   rotations[i].copy(global).multiply(local);
  }else{
   positions[i].fromArray(meta.offsets[i]).applyQuaternion(rotations[parent]).add(positions[parent]);
   rotations[i].copy(rotations[parent]).multiply(local);
  }
 }
}
export function sampleCapturedMotion(id,elapsed=0,flipped=false){
 const window=capturedWindow(id);if(!window)return null;
 const track=cache.get(window.track),{meta,positions,rotations,indices}=track;
 const time=window.start+Math.max(0,Math.min(window.end-window.start,Number.isFinite(elapsed)?elapsed:0));
 evaluateTrack(track,time);
 const coords=landmarkNames.map(name=>positions[indices[name]].toArray());
 const point=name=>positions[indices[name]].toArray();
 // Body joints are measured; equipment and fingers are explicitly illustrative.
 let result={coords,headPosition:point('Head'),neckPosition:point('Neck'),spine:['Spine','Spine1','Spine2','Spine3','Neck'].map(point),toePositions:[point('LeftToeBase'),point('RightToeBase')],
  headRotation:rotations[indices.Head].toArray(),torsoRotation:rotations[indices.Spine3].toArray(),pelvisRotation:rotations[indices.Hips].toArray(),captured:true,sourceTime:time+meta.frameTime,captureTime:time,gazeReferenceActive:!!captureReferences[id]&&time>=captureReferences[id].captureMountedAt,frameRate:1/meta.frameTime,source:meta.source};
 if(window.track.startsWith('rowing')){
  // Express the measured pose in the boat frame: the foot stretcher and
  // rail height are fixed. A rigid translation preserves all joint angles
  // and bone lengths while recovering slide travel from the moving feet.
  const anchor=track.rowingAnchor;
  const shift=[anchor.feet.x-(coords[10][0]+coords[11][0])/2,anchor.hipY-(coords[6][1]+coords[7][1])/2,anchor.feet.z-(coords[10][2]+coords[11][2])/2];
  const translate=p=>p.map((v,i)=>v+shift[i]);
  result.coords=coords.map(translate);
  for(const key of ['headPosition','neckPosition'])result[key]=translate(result[key]);
  result.spine=result.spine.map(translate);result.toePositions=result.toePositions.map(translate);
  result.rowingSeat=[(result.coords[6][0]+result.coords[7][0])/2,anchor.hipY-.085,anchor.feet.z];
  const oars=[1,-1].map((side,i)=>rowingAttachment(result.coords[4+i],side,[-.13,track.pivotHeight,side*.64],result.coords[2+i]));
  Object.assign(result,{oars,equipmentHands:oars.map(o=>o.hand)});
 }else if(meta.sport==='tennis'){
  Object.assign(result,capturedTennis(coords,rotations[indices.RightHand],track.localShaft,window.track.startsWith('tennis-backhand')));
 }else if(meta.sport==='clay'){
  const up=new Vector3(0,1,0).applyQuaternion(rotations[indices.Spine3]);
  Object.assign(result,capturedClay(coords,up,rotations[indices.RightHand],track.localShaft));
 }
 if(flipped){
  result=reflectCaptured(result);
  if(result.oars){
   const reflect=p=>[-p[0],p[1],p[2]];
   result.oars=result.oars.slice().reverse().map((o,i)=>({...o,pivot:reflect(o.pivot),start:reflect(o.start),end:reflect(o.end),axis:reflect(o.axis),hand:result.equipmentHands[i]}));
   result.rowingSeat=reflect(result.rowingSeat);
  }
 }
 return result;
}
