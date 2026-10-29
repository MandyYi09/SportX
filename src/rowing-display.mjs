import {sampleCapturedMotion,capturedDuration} from './captured-motion.mjs';
import {solveLimb} from './motion-rig.mjs';
import {rowingAttachment} from './equipment-grip.mjs';

const calibrations=new Map();
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const hipX=s=>(s.coords[6][0]+s.coords[7][0])/2;
export const fullStrokeTravel=.40;
export const halfStrokeTravel=.20;
function calibration(id){
 if(calibrations.has(id))return calibrations.get(id);
 const duration=capturedDuration(id),initial=sampleCapturedMotion(id,0);
 if(!initial)return null;
 let min=Infinity,max=-Infinity;
 for(let i=0;i<=240;i++){const x=hipX(sampleCapturedMotion(id,duration*i/240));min=Math.min(min,x);max=Math.max(max,x);}
 const value={min,max,initial};calibrations.set(id,value);return value;
}

// Presentation-only retargeting. The recording contains a small seated leg
// excursion; expand that same timing into the selected slide length on the demonstration.
// Correction/scoring continues to use the unmodified captured joint angles.
export function rowingDisplaySample(sample,id,flipped=false){
 if(!['rowing-arms','rowing-half','rowing-full'].includes(id)||!sample?.captured)return sample;
 if(id==='rowing-arms'){
  const initial=sampleCapturedMotion(id,0,flipped);
  return {...sample,rowingSeat:[...initial.rowingSeat]};
 }
 const travel=id==='rowing-half'?halfStrokeTravel:fullStrokeTravel;
 const c=calibration(id);if(!c||c.max-c.min<1e-5)return sample;
 const sign=flipped?-1:1,sourceX=sign*hipX(sample);
 const progress=Math.max(0,Math.min(1,(c.max-sourceX)/(c.max-c.min)));
 const dx=sign*(c.max-.02-travel*progress)-hipX(sample);
 const translate=p=>[p[0]+dx,p[1],p[2]];
 const coords=sample.coords.map(p=>[...p]);
 for(let i=0;i<8;i++)coords[i]=translate(coords[i]);
 const initial=flipped?sampleCapturedMotion(id,0,true):c.initial;
 const toes=[];
 for(let side=0;side<2;side++){
  const h=6+side,k=8+side,f=10+side;
  const foot=[...initial.coords[f]],hip=coords[h];
  const pole=[hip[0]-sign*.15,hip[1]+1,hip[2]];
  const [knee,end]=solveLimb(hip,foot,pole,distance(sample.coords[h],sample.coords[k]),distance(sample.coords[k],sample.coords[f]));
  coords[k]=knee;coords[f]=end;
  toes.push(initial.toePositions[side].map((v,i)=>v+end[i]-foot[i]));
 }
 const oars=sample.oars.map((o,i)=>rowingAttachment(coords[4+i],Math.sign(o.pivot[2]),o.pivot,coords[2+i]));
 // Reflected anatomical hand meshes use the same mirrored winding as capture.
 if(flipped)for(const o of oars){o.hand.mirrored=true;}
 return {...sample,coords,headPosition:translate(sample.headPosition),neckPosition:translate(sample.neckPosition),spine:sample.spine.map(translate),toePositions:toes,
  rowingSeat:[hipX({coords}),sample.rowingSeat[1],sample.rowingSeat[2]],oars,equipmentHands:oars.map(o=>o.hand),displayRetargeted:true};
}
