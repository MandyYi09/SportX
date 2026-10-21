import {Quaternion,Vector3} from './vendor/three.module.js';
import {rowingAttachment} from './equipment-grip.mjs';
const cache=new Map();
const landmarkNames=['LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'];
export async function loadCapturedMotions(){
 const ids=['rowing-arms','rowing-half','rowing-full'];
 await Promise.all(ids.map(async id=>{
  const base=new URL(`./assets/mocap/${id}`,import.meta.url);
  const metadata=await fetch(`${base}.json`);if(!metadata.ok)throw Error(`Missing motion metadata: ${id}`);
  const meta=await metadata.json(),response=await fetch(new URL(meta.binary,base));
  if(!response.ok)throw Error(`Missing motion samples: ${id}`);
  const data=new Float32Array(await response.arrayBuffer());
  if(data.length!==meta.frames*meta.stride)throw Error(`Invalid motion samples: ${id}`);
  cache.set(id,makeTrack(meta,data));sampleCapturedMotion(id,0);
 }));
 return ids.map(id=>cache.get(id).meta);
}
function makeTrack(meta,data){
 const count=meta.names.length,indices=Object.fromEntries(meta.names.map((name,i)=>[name,i]));
 return {meta,data,indices,positions:Array.from({length:count},()=>new Vector3()),rotations:Array.from({length:count},()=>new Quaternion()),
  local:new Quaternion(),other:new Quaternion(),offset:new Vector3(),global:new Quaternion().setFromAxisAngle(new Vector3(0,1,0),meta.alignment.yaw),translation:new Vector3(...meta.alignment.translation)};
}
export function capturedDuration(id){return cache.get(id)?.meta.duration??null;}
export function sampleCapturedMotion(id,elapsed=0,flipped=false){
 const track=cache.get(id);if(!track)return null;
 const {meta,data,positions,rotations,indices,local,other,offset,global,translation}=track;
 const time=Math.max(0,Math.min(meta.duration,elapsed)),fraction=time/meta.frameTime;
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
 const coords=landmarkNames.map(name=>positions[indices[name]].toArray());
 const point=name=>positions[indices[name]].toArray();
 const oarHeight=track.pivotHeight??=(coords[4][1]+coords[5][1])/2;
 // In this BVH alignment anatomical left is +Z, unlike the authored rig.
 const oars=[1,-1].map((side,i)=>rowingAttachment(coords[4+i],side,[-.13,oarHeight,side*.64]));
 // Body joints are measured. Finger wrap and oarlocks retain the illustrative UI geometry.
 const result={coords,oars,equipmentHands:oars.map(o=>o.hand),racketDirection:[0,1,0],racketPosition:coords[5],
  headPosition:point('Head'),neckPosition:point('Neck'),spine:['Spine','Spine1','Spine2','Spine3','Neck'].map(point),toePositions:[point('LeftToeBase'),point('RightToeBase')],
  headRotation:rotations[indices.Head].toArray(),torsoRotation:rotations[indices.Spine3].toArray(),pelvisRotation:rotations[indices.Hips].toArray(),captured:true,sourceTime:time+meta.frameTime,frameRate:1/meta.frameTime,source:meta.source};
 if(flipped){
  const reflect=v=>[-v[0],v[1],v[2]];
  result.coords=result.coords.map((_,i)=>reflect(coords[i%2===0?i+1:i-1]));
  result.headPosition=reflect(result.headPosition);result.neckPosition=reflect(result.neckPosition);result.spine=result.spine.map(reflect);result.toePositions=result.toePositions.slice().reverse().map(reflect);
  result.oars=[-1,1].map((side,i)=>rowingAttachment(result.coords[4+i],side,[.13,oarHeight,side*.64]));result.equipmentHands=result.oars.map(o=>o.hand);
 }
 return result;
}
