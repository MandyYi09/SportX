import {dynamicReferenceDuration as capturedDuration,dynamicReferenceAt as rowingReferenceAt} from '../src/rowing-reference-cycle.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadCapturedMotions} from '../src/captured-motion.mjs';
import {} from '../src/rowing-correction.mjs';
import {dynamicReference,alignDynamicFrames} from '../src/rowing-dynamic.mjs';
import {scoreTake} from '../src/rowing-takes.mjs';
import {movementPhaseEvidence} from '../src/rowing-motion-phase.mjs';
const saved=globalThis.fetch;globalThis.fetch=async url=>{const b=await fs.readFile(new URL(url));return {ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
await loadCapturedMotions();globalThis.fetch=saved;
const id='rowing-full',duration=capturedDuration(id),yaw=1.3,experts=dynamicReference(id,yaw);
function fixture({delay=0,pause=0,offset=0,fraction=1,translation=0,phaseOffset=0}={}){
 const frames=[],speed=1.5,end=delay+duration*speed*fraction+pause;
 for(let t=0;t<=end;t+=.25){
  const elapsed=Math.max(0,t-delay),source=Math.min(duration*fraction,Math.max(0,elapsed-Math.min(pause,Math.max(0,elapsed-duration*speed*.5)))/speed);
  const ref=rowingReferenceAt(id,(2.4+phaseOffset+source)%duration,1,yaw),pose=Array.from({length:33},(_,i)=>ref[i]?{x:.5+ref[i].x*.3,y:.78+ref[i].y*.4,visibility:i>=25?0:.99}:{x:0,y:0,visibility:0});
  for(const i of [15,16])pose[i].y+=offset;
  frames.push({t:t+translation,pose,world:null,width:960,height:720});
 }
 return frames;
}
function score(frames){const rows=alignDynamicFrames(id,frames,experts,yaw);return scoreTake(id,rows,{start:frames[0].t,end:frames.at(-1).t,referenceCount:experts.length,referenceDuration:duration});}
const base=score(fixture()),shifted=score(fixture({translation:3})),reaction=score(fixture({delay:2})),form=score(fixture({offset:.04})),paused=score(fixture({pause:1})),partial=score(fixture({fraction:.25}));
const outOfPhase=score(fixture({phaseOffset:1.1}));assert.ok(outOfPhase.completeness>=.95);assert.ok(outOfPhase.timing>=95,'The expert starting on a different phase is not poor user rhythm');
assert.equal(base.completeness,1);assert.ok(base.timing>=95);
assert.equal(shifted.timing,base.timing,'Recording timestamp offset is not a timing error');assert.equal(shifted.completeness,base.completeness);
assert.ok(reaction.completeness>=.95);assert.ok(reaction.timing>=90,'Initial reaction delay must be aligned automatically: '+JSON.stringify({base,reaction}));
assert.ok(form.pose<base.pose);assert.ok(form.timing>=95,'Form deviations must not become bad timing');assert.equal(form.completeness,1);
assert.ok(paused.pose>=90);assert.ok(paused.completeness>=.95);assert.ok(paused.timing>=60&&paused.timing<base.timing,'A transition pause affects rhythm, not pose or completion');
assert.ok(partial.total===null||partial.total<60,'A forcibly cropped quarter movement cannot get a full-take score');
const contextFrames=fixture({pause:1}),contextRows=alignDynamicFrames(id,contextFrames,experts,yaw),evidence=movementPhaseEvidence(contextFrames,experts);
const resolved=contextRows.filter((r,i)=>r.phaseReliable&&evidence.costs[i].some((cost,j)=>{
 const chosen=r.phase%experts.length,distance=Math.abs(j-chosen);
 return cost!==null&&Math.min(distance,experts.length-distance)>experts.length*.15&&cost<=evidence.costs[i][chosen]+.08;
}));
assert.ok(resolved.length>=3,'Continuous direction must resolve similar single-frame phases');
assert.ok(contextRows.every(r=>r.phaseReliable===false||r.phaseConfidenceMethod==='sequence-path-margin'));
const missing=fixture();for(let i=12;i<=15;i++){missing[i].pose=null;missing[i].world=null;}
const missingRows=alignDynamicFrames(id,missing,experts,yaw);
assert.ok(missingRows.filter(r=>!r.pose).every(r=>!r.phaseReliable),'Sequence context must not fabricate evidence across tracking loss');
const held=Array.from({length:40},(_,i)=>({...contextFrames[0],t:i*.25}));
assert.ok(alignDynamicFrames(id,held,experts,yaw).filter(r=>r.phaseReliable).length<=1,'A static hold without directional history must remain ambiguous');
console.log('PASS: sequence context resolves '+resolved.length+' locally ambiguous samples; tracking loss and an unanchored hold remain unconfirmed.');
console.log('PASS: frontal visible motion, automatic phase/clock offset, initial reaction delay, form/timing separation, transition pause and incomplete take. '+JSON.stringify({baselineTiming:base.timing,reactionTiming:reaction.timing,formPose:form.pose,formTiming:form.timing,pauseTiming:paused.timing,completion:paused.completeness,partialTotal:partial.total}));
