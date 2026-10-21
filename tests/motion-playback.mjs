import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createMotionClock} from '../src/motion-clock.mjs';
import {tennisGrip} from '../src/tennis-grip.mjs';
import {rowingGrip,clayGrip} from '../src/equipment-grip.mjs';
import {motionClips,motionById,excludedMotionSources} from '../src/motion-catalog.mjs';
import {sampleMotion} from '../src/motion-rig.mjs';
import {practicePoses,sequenceFor} from '../src/practice-modes.mjs';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const nearFrame=(a,b)=>a.forEach((p,i)=>p.forEach((v,j)=>near(v,b[i][j])));
const limbs=[[0,2,.33],[2,4,.31],[1,3,.33],[3,5,.31],[6,8,.43],[8,10,.43],[7,9,.43],[9,11,.43]];
assert.equal(motionClips.length,14);
for(const clip of motionClips){
 assert.ok(clip.sourceEnd>clip.sourceStart);
 assert.ok(!excludedMotionSources.includes(clip.sourceFile));
 assert.ok(practicePoses.find(p=>p.id===clip.id)?.demoOnly);
 assert.ok(!('video' in clip)&&!('poster' in clip),'Demonstrations must not depend on media');
 let previous,previousHands,previousEquipment;
 const duration=clip.sourceEnd-clip.sourceStart;
 for(let t=0;t<=duration;t+=.01){
  const a=sampleMotion(clip.id,t),b=sampleMotion(clip.id,t,true);
  assert.ok(a.coords.flat().every(Number.isFinite));
  for(const [root,tip,len]of limbs)near(distance(a.coords[root],a.coords[tip]),len);
  if(clip.type==='tennis'){
   if(clip.track==='backhand')near(distance(a.tennisHands[0].center,a.tennisHands[1].center),tennisGrip.spacing,.00001);
   for(const sample of [a,b])sample.tennisHands.forEach((hand,side)=>{
    if(!hand)return;
    near(distance(hand.wrist,sample.coords[4+side]),0);
    const reconstructed=hand.center.map((v,i)=>v+hand.x[i]*tennisGrip.wrist[0]+hand.y[i]*tennisGrip.wrist[1]);
    near(distance(reconstructed,hand.wrist),0,.00001);
    const delta=hand.center.map((v,i)=>v-sample.racketPosition[i]);
    const along=delta.reduce((s,v,i)=>s+v*sample.racketDirection[i],0);
    const radial=delta.map((v,i)=>v-along*sample.racketDirection[i]);
    near(Math.hypot(...radial),0,.00001);
    assert.ok(along>.03&&along<.19,'Both palms must remain on the handle');
    near(Math.hypot(...hand.x),1);near(Math.hypot(...hand.y),1);near(Math.hypot(...hand.z),1);
    near(hand.x.reduce((s,v,i)=>s+v*hand.y[i],0),0);
   });
   a.tennisHands.forEach((hand,side)=>{
    if(!hand||!previousHands?.[side])return;
    assert.ok(hand.x.reduce((s,v,i)=>s+v*previousHands[side].x[i],0)>.8,'Grip must not flip between frames');
   });
   previousHands=a.tennisHands;
  }
  if(clip.type==='rowing')for(const side of [0,1]){
   assert.ok(a.coords[8+side][1]>a.coords[6+side][1],'Seated knees must bend above the seat');
   near(a.coords[10+side][0],-.53);near(a.coords[10+side][1],.47);
  }
  if(a.equipmentHands)for(const sample of [a,b]){
   const spec=clip.type==='rowing'?rowingGrip:clayGrip;
   sample.equipmentHands.forEach((hand,side)=>{
    near(distance(hand.wrist,sample.coords[4+side]),0,1e-6);
    const wrist=hand.center.map((v,i)=>v+hand.x[i]*spec.wrist[0]+hand.y[i]*spec.wrist[1]);
    near(distance(wrist,sample.coords[4+side]),0,1e-6);
    near(Math.hypot(...hand.x),1);near(Math.hypot(...hand.y),1);
    if(clip.type==='rowing')assert.ok(hand.wrist[1]>hand.center[1],'Rowing palms must remain above the handles');
   });
   if(sample.oars)for(const oar of sample.oars){
    near(distance(oar.start,oar.end),rowingGrip.oarLength);
    for(const point of [oar.hand.center,oar.pivot]){
     const delta=point.map((v,i)=>v-oar.start[i]);
     const along=delta.reduce((sum,v,i)=>sum+v*oar.axis[i],0);
     near(Math.hypot(...delta.map((v,i)=>v-along*oar.axis[i])),0,1e-6);
     assert.ok(along>0&&along<rowingGrip.oarLength);
    }
   }
   if(sample.clayProp){
    const prop=sample.clayProp;
    const positions=sample===a?[clayGrip.rear[0]+clayGrip.spacing,clayGrip.rear[0]]:[clayGrip.rear[0],clayGrip.rear[0]+clayGrip.spacing];
    sample.equipmentHands.forEach((hand,side)=>{
     const contact=prop.origin.map((v,i)=>v+prop.x[i]*positions[side]+prop.y[i]*clayGrip.rear[1]);
     near(distance(hand.center,contact),0,1e-6);
    });
    near(distance(...sample.equipmentHands.map(hand=>hand.center)),clayGrip.spacing);
   }
  }
  if(a.equipmentHands){
   a.equipmentHands.forEach((hand,side)=>{
    if(previousEquipment)assert.ok(hand.x.reduce((sum,v,i)=>sum+v*previousEquipment[side].x[i],0)>.8,'Equipment hand orientation must remain continuous');
   });
   previousEquipment=a.equipmentHands;
  }
  b.coords.forEach((p,i)=>{const q=a.coords[i%2===0?i+1:i-1];near(p[0],-q[0]);near(p[1],q[1]);near(p[2],q[2]);});
  near(a.racketDirection[0],-b.racketDirection[0]);near(a.racketDirection[1],b.racketDirection[1]);
  if(previous)for(let i=0;i<12;i++)assert.ok(distance(a.coords[i],previous[i])<.12,clip.id+' discontinuity');
  previous=a.coords;
 }
 nearFrame(sampleMotion(clip.id,-1).coords,sampleMotion(clip.id,0).coords);
 nearFrame(sampleMotion(clip.id,duration+10).coords,sampleMotion(clip.id,duration).coords);
}
assert.equal(practicePoses.find(p=>p.id==='clay-lower').zh[0],'下枪');
assert.equal(practicePoses.find(p=>p.id==='rowing-half').zh[0],'1/2 划');
assert.equal(sampleMotion('reach',0),null);
let now=0;
const clock=createMotionClock(()=>now);
assert.equal(clock.read().speed,1);clock.setSpeed(.5);
clock.select(5);now=2000;near(clock.read().elapsed,1);
clock.pause();now=7000;near(clock.read().elapsed,1);
clock.play();now=9000;clock.setSpeed(1);near(clock.read().elapsed,2);
now=10000;near(clock.read().elapsed,3);
clock.seek(4);now=12000;near(clock.read().elapsed,4);assert.equal(clock.read().playing,false);
clock.play();now=15000;near(clock.read().elapsed,5);assert.equal(clock.read().playing,false);
clock.play();near(clock.read().elapsed,0);assert.equal(clock.read().playing,true);
clock.select(2);near(clock.read().elapsed,0);now=16000;near(clock.read().elapsed,1);
clock.restart();near(clock.read().elapsed,0);assert.equal(clock.read().playing,true);
clock.select(2,false);now=20000;near(clock.read().elapsed,0);assert.equal(clock.read().playing,false);
clock.seek(99);near(clock.read().elapsed,2);clock.seek(-5);near(clock.read().elapsed,0);
clock.select(0);clock.play();assert.equal(clock.read().playing,false);
const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
assert.ok(!/id="motion-(video|source|download)"/.test(html));
const publicFiles=await readdir(new URL('../src/',import.meta.url),{recursive:true});
assert.ok(!publicFiles.some(file=>/\.(mp4|mov|webm)$/i.test(file)),'Recordings must stay outside public files');
console.log('PASS: 14 standalone 3D movements, media-free public files, playback clock, independent tennis studies, fixed bone lengths, hand attachments, oar pivots, rigid clay contacts, mirroring and animation continuity.');
