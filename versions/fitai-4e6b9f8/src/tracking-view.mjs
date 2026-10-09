import {poses} from './exercises.mjs';
export const isSidePose=id=>poses.find(p=>p.id===id)?.cameraView==='side';
const chains=[[11,13,15,23,25,27],[12,14,16,24,26,28]];
export function prepareLandmarks(id,raw){
 if(!raw||!isSidePose(id))return raw;
 const confidence=chain=>Math.min(...chain.map(i=>raw[i]?.visibility??0));
 const side=confidence(chains[0])>=confidence(chains[1])?0:1;
 const p=raw.map(v=>({...v}));
 for(let i=0;i<6;i++)p[chains[1-side][i]]={...p[chains[side][i]],visibility:0};
 return p;
}
export function requiredLandmarks(id,p){
 if(!isSidePose(id))return chains.flat();
 return chains.find(chain=>chain.every(i=>(p?.[i]?.visibility??0)>=.65))||chains[0];
}
