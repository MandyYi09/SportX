import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {motionClips,excludedMotionSources} from '../src/motion-catalog.mjs';
import {loadCapturedMotions,capturedWindow,sampleCapturedMotion} from '../src/captured-motion.mjs';
import {sequenceFor} from '../src/practice-modes.mjs';
import {createMotionPlayer} from '../src/motion-player.mjs';
const realFetch=globalThis.fetch;
globalThis.fetch=async url=>{const bytes=await fs.readFile(new URL(url));return {ok:true,json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
const metadata=await loadCapturedMotions();globalThis.fetch=realFetch;
const expected=[
 ['tennis-combined-full','wangqiu_01_012',0,8],
 ['tennis-forehand-backswing-study','wangqiu_03_015',0,4],
 ['tennis-forehand-full','wangqiu_04_016',0,6],
 ['tennis-backhand-full','wangqiu_06_020',0,8],
 ['tennis-forehand-ready','wangqiu_07_023',0,5],
 ['tennis-forehand-drop-study','wangqiu_12_030',1,5],
 ['tennis-backhand-alternate','wangqiu_09_026',0,8],
 ['rowing-arms','huachuan_01_Mandy_043',2,6],
 ['rowing-half','huachuan_02_Mandy_045',0,9],
 ['rowing-full','huachuan_03_Mandy_046',0,8],
 ['clay-full','sheji_01_006',1,22],
 ['clay-ready','sheji_02_008',2,5],
 ['clay-mount','sheji_03_009',1,6],
 ['clay-lower','sheji_04_010',1,13],
];
const originals=Object.fromEntries(['performance','document','window','matchMedia','requestAnimationFrame'].map(key=>[key,globalThis[key]]));
let now=0,tick;
const nodes=new Map();
const $=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='motion-speed'?'1':'0',dataset:{},setAttribute(name,value){this[name]=value;}});return nodes.get(id);};
globalThis.performance={now:()=>now};
globalThis.document={getElementById:$,hidden:false,addEventListener(){}};
globalThis.window={addEventListener(){}};
globalThis.matchMedia=()=>({matches:true});
globalThis.requestAnimationFrame=fn=>{tick=fn;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
try{
 const player=createMotionPlayer();
 const completeStart=sampleCapturedMotion('clay-lower',0),completeMounted=sampleCapturedMotion('clay-lower',2.5),completeEnd=sampleCapturedMotion('clay-lower',1000);
 assert.ok(completeMounted.coords[5][1]-completeStart.coords[5][1]>.35,'Second complete action must retain raising from the starting position');
 assert.ok(completeMounted.coords[5][1]-completeEnd.coords[5][1]>.35,'Second complete action must retain the final lowering');
 assert.ok(capturedWindow('clay-lower').start<3&&capturedWindow('clay-lower').end>13,'Preserve preparation, mount, holding and return');
 const dropStart=sampleCapturedMotion('tennis-forehand-drop-study',0),dropEnd=sampleCapturedMotion('tennis-forehand-drop-study',1000);
 assert.ok(dropStart.coords[5][1]-dropEnd.coords[5][1]>.15,'The standalone drop must show the wrist descending');
 assert.ok(capturedWindow('tennis-forehand-drop-study').start>2,'Exclude backswing from standalone drop');

 assert.equal(motionClips.length,20);
 assert.ok(excludedMotionSources.includes('wangqiu_11_028.mp4'));
 for(const side of ['forehand','backhand']){
  const full=motionClips.find(c=>c.id===`tennis-${side}-full`);
  assert.equal(sequenceFor(full.id).length,4,`${side} must retain all four original views`);
  for(const phase of ['backswing','drop','swing']){
   const id=`tennis-${side}-${phase}`,clip=motionClips.find(c=>c.id===id);
   assert.ok(clip,`Original breakdown must remain available: ${id}`);
   assert.equal(clip.sequence,full.sequence);
   assert.equal(capturedWindow(id).track,capturedWindow(full.id).track);
   for(const elapsed of [0,.25,capturedWindow(id).end-capturedWindow(id).start]){
    const a=sampleCapturedMotion(id,elapsed),b=sampleCapturedMotion(full.id,capturedWindow(id).start-capturedWindow(full.id).start+elapsed);
    a.coords.forEach((point,i)=>point.forEach((v,j)=>near(v,b.coords[i][j])));
   }
   player.select(id);near(Number($('motion-seek').min),0);near(Number($('motion-seek').max),capturedWindow(id).end-capturedWindow(id).start);
  }
 }
 for(const [id,source,start,end]of expected){
  const clip=motionClips.find(clip=>clip.id===id),window=capturedWindow(id),meta=metadata.find(meta=>meta.id===window.track);
  assert.ok(clip.sourceFile.startsWith(source));assert.ok(meta.source.startsWith(source),'Every study must use its own corresponding BVH');
  assert.equal(clip.sourceStart,start);assert.equal(clip.sourceEnd,end);
  const actualStart=window.start,actualEnd=window.end;
  player.select(id);
  assert.equal(Number($('motion-seek').min),0);near(Number($('motion-seek').max),actualEnd-actualStart);
  near(player.sample().captureTime,actualStart);
  for(const [input,target]of [[-100,actualStart],[10000,actualEnd],[(actualEnd-actualStart)/2,(actualStart+actualEnd)/2]]){
   $('motion-seek').value=String(input);$('motion-seek').oninput();
   near(player.sample().captureTime,target);near(Number($('motion-seek').value),target-actualStart);
   const actual=player.sample().coords,expected=sampleCapturedMotion(id,target-actualStart).coords;
   actual.forEach((point,i)=>point.forEach((v,j)=>near(v,expected[i][j])));
  }
  $('motion-restart').onclick();near(player.sample().captureTime,actualStart);
  now+=100000;tick(now);near(player.sample().captureTime,window.end);
  assert.equal($('motion-play').textContent,'Play','Playback must stop at the interval end');
  $('motion-play').onclick();near(player.sample().captureTime,actualStart);
  $('motion-speed').value='.25';$('motion-speed').oninput();now+=1000;near(player.sample().captureTime,actualStart+.25);
  $('motion-speed').value='1';$('motion-speed').oninput();
 }
}finally{for(const [key,value]of Object.entries(originals))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
console.log('PASS: all 14 reference hints and reviewed action intervals, source/BVH correspondence, slider bounds, rejected out-of-range seeks, restart, end hold, replay, speed and preserved original breakdowns.');
