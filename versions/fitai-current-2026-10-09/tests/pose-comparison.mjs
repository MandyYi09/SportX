import {prepareLandmarks,isSidePose} from '../src/tracking-view.mjs';
import assert from 'node:assert/strict';
import {poses} from '../src/exercises.mjs';
import {getReference,landmarkIds} from '../src/reference.mjs';
import {comparePose,normalizedLive} from '../src/comparison.mjs';
import {evaluate} from '../src/pose-rules.mjs';
import {matchQuality} from '../src/match-quality.mjs';
import {PosePresence} from '../src/pose-presence.mjs';
assert.equal(poses.length,48);assert.equal(new Set(poses.map(p=>p.id)).size,48);
for(const pose of poses)for(const flipped of [false,true]){
 const ref=getReference(pose.id,flipped);assert.equal(ref.length,12);
 let p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.99}));
 ref.forEach((v,i)=>p[landmarkIds[i]]={x:.5-v[0]*.18,y:.85-v[1]*.18,visibility:.99});
 p=prepareLandmarks(pose.id,p);
 const r=comparePose(pose.id,p,1000,1000,flipped);
 if(pose.demoOnly){assert.equal(r,null,pose.id+' must not produce a technique score');assert.ok(ref.flat().every(Number.isFinite));continue;}
 assert.ok(r,pose.id);assert.equal(r.quality.band,'green',pose.id);assert.ok(r.metrics.every(m=>m.delta<.001),pose.id);
 assert.notEqual(evaluate(pose.id,p).state,'unknown',pose.id);
 assert.ok(normalizedLive(pose.id,p,1000,1000).filter(Boolean).flat().every(Number.isFinite));
 const elbow=r.metrics.find(m=>m.label==='Left elbow'||m.label==='Right elbow'); const side=elbow.label.startsWith('Left')?0:1;const wrist=15+side,shoulder=11+side,joint=13+side;
 p[wrist]=elbow.actual>90?{...p[shoulder]}:{x:2*p[joint].x-p[shoulder].x,y:2*p[joint].y-p[shoulder].y,visibility:.99};
 assert.notEqual(comparePose(pose.id,p,1000,1000,flipped)?.quality.band,'green',pose.id);
 p[wrist].visibility=.1;assert.equal(evaluate(pose.id,p).state,'unknown');
}
assert.equal(matchQuality([{delta:0,close:true}]).band,'green');assert.equal(matchQuality([{delta:25,close:false}]).band,'orange');assert.equal(matchQuality([{delta:80,close:false}]).band,'red');assert.equal(matchQuality([{delta:NaN,close:false}]),null);
const presence=new PosePresence();assert.equal(presence.update(true,0),false);assert.equal(presence.update(true,600),true);assert.equal(presence.update(false,700),true);assert.equal(presence.update(false,2200),false);presence.update(true,2300);assert.equal(presence.update(true,2900),true);presence.dismiss();assert.equal(presence.update(true,4000),false);

// Side-on tracking accepts one clear body side but never invents visible far-side joints.
let sidePose=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));
getReference('plank').forEach((v,i)=>sidePose[landmarkIds[i]]={x:.5-v[0]*.18,y:.8-v[1]*.18,visibility:i%2===0?.95:.1});
sidePose=prepareLandmarks('plank',sidePose);
assert.notEqual(evaluate('plank',sidePose).state,'unknown');
assert.equal(comparePose('plank',sidePose,1000,1000).quality.band,'green');
assert.equal(normalizedLive('plank',sidePose,1000,1000).filter(Boolean).length,6);
sidePose[13].visibility=.1;assert.equal(evaluate('plank',sidePose).state,'unknown');

// Seated upper-body practice works with legs outside the frame, without inventing them.
for(const pose of poses.filter(p=>p.tracking==='upper')){
 let raw=Array.from({length:33},()=>({x:.5,y:.5,visibility:.99}));
 getReference(pose.id).forEach((v,i)=>raw[landmarkIds[i]]={x:.5-v[0]*.18,y:.85-v[1]*.18,visibility:.99});
 for(const i of [25,26,27,28])raw[i]={x:2,y:2,visibility:.05};
 const prepared=prepareLandmarks(pose.id,raw);
 assert.notEqual(evaluate(pose.id,prepared).state,'unknown',pose.id);
 const result=comparePose(pose.id,prepared,1000,1000);
 assert.equal(result.quality.band,'green');
 assert.equal(result.metrics.length,5);
 assert.ok(result.metrics.every(m=>m.joints.every(i=>i<25)));
 assert.equal(normalizedLive(pose.id,prepared,1000,1000).filter(Boolean).length,8);
 prepared[23].visibility=.1;assert.equal(evaluate(pose.id,prepared).state,'unknown');
 prepared[23].visibility=.99;prepared[13].x=NaN;assert.equal(evaluate(pose.id,prepared).state,'unknown');
}
console.log('PASS: 48 unique movements, 96 mirrored references, demo score exclusion, upper-body and side-view confidence gating, corrections, color states and fullscreen acquisition/loss.');
