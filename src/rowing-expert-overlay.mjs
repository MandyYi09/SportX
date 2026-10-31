import * as THREE from './vendor/three.module.js';
import {createAthleteModel} from './athlete-model.mjs';
import {sampleCapturedMotion} from './captured-motion.mjs';
import {createWrappedHand,placeTennisHand} from './tennis-hand.mjs';
import {rowingGrip} from './equipment-grip.mjs';
import {rowingCheckpoints,rowingReferenceAt,rowingIds} from './rowing-correction.mjs';
import {dynamicMotionSample,dynamicReferenceAt,dynamicReferenceDuration} from './rowing-reference-cycle.mjs';

// Render the existing clothed athlete into a transparent layer, then composite once.
// Whole-layer alpha avoids making back-facing body surfaces show through the skin.
export function createRowingExpertOverlay(){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 // Reading a WebGL canvas into a 2D canvas can synchronize GPU/CPU. Snapshot
 // once per new expert frame; subsequent display frames copy the 2D surface.
 const surface=document.createElement('canvas'),surfaceContext=surface.getContext('2d');
 renderer.setClearColor(0x000000,0);renderer.setPixelRatio(1);
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
 scene.add(new THREE.HemisphereLight(0xffffff,0x7992a4,2.6));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,5,6);scene.add(light);
 const camera=new THREE.OrthographicCamera(0,960,540,0,.1,20000);camera.position.set(0,0,10000);camera.lookAt(0,0,0);
 const models=new Map();let model,genderKey,lastKey='',sample,w=0,h=0,lastRender='',lastRenderAt=-Infinity;
 let cycle=null,preparing=false,lastCycleIndex=-1;
 const cycleKey=(id,yaw,gender,facing)=>`${id}:${yaw.toFixed(3)}:${gender}:${facing}`;
 function clearCycle(){cycle?.frames.forEach(f=>f.close());cycle=null;lastCycleIndex=-1;}
 const anchors={head:new THREE.Object3D(),pelvis:new THREE.Object3D(),feet:[new THREE.Object3D(),new THREE.Object3D()]};
 function select(id,time,gender,dynamicCycle=false){
  const key=`${id}:${time}:${gender}:${dynamicCycle}`;if(lastKey===key)return;lastKey=key;
  if(!models.has(gender)){
   const athlete=createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial({color:0xc72032}),skin:new THREE.MeshStandardMaterial({color:0xae805f}),gender});
   const material=new THREE.MeshStandardMaterial({color:0xae805f,roughness:.8});
   const hands=[-1,1].map(side=>createWrappedHand(THREE,material,side,rowingGrip));hands.forEach(hand=>athlete.root.add(hand.root));
   models.set(gender,{athlete,hands});root.add(athlete.root);
  }
  model=models.get(gender);genderKey=gender;
  for(const[g,m]of models)m.athlete.root.visible=g===gender;
  sample=dynamicCycle?dynamicMotionSample(id,time):sampleCapturedMotion(id,time);
  const coords=sample.coords.map(p=>new THREE.Vector3(...p));
  anchors.head.position.fromArray(sample.headPosition);anchors.head.quaternion.fromArray(sample.headRotation);
  anchors.pelvis.quaternion.fromArray(sample.pelvisRotation);
  anchors.feet.forEach((foot,i)=>{const toe=new THREE.Vector3(...sample.toePositions[i]);foot.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),toe.sub(coords[10+i]).normalize());});
  model.athlete.setSport('rowing',id);model.athlete.update(coords,sample,anchors);
  model.hands.forEach((hand,i)=>placeTennisHand(THREE,hand,sample.equipmentHands[i]));
 }
 return {
  async prepareCycle({id,yaw=0,gender='male',facing=1,cancel=()=>false,onProgress=()=>{}}){
   const key=cycleKey(id,yaw,gender,facing);if(cycle?.key===key)return true;
   clearCycle();preparing=true;const frames=[],placements=[],duration=dynamicReferenceDuration(id),count=Math.ceil(duration*30);
   // Crop transparent margins instead of stretching a small full-frame image.
   // Bound decoded memory while retaining 30 distinct frames per second.
   const bounds=Array.from({length:count},(_,i)=>{
    const time=i*duration/count,s=dynamicMotionSample(id,time),ref=dynamicReferenceAt(id,time,facing,yaw);
    const points=[...s.coords,s.headPosition,...s.toePositions,...s.equipmentHands.map(h=>h.center)].map(p=>({x:(p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw))*facing,y:-p[1]}));
    return {time,ref,x:Math.min(...points.map(p=>p.x))-.16,y:Math.min(...points.map(p=>p.y))-.16,right:Math.max(...points.map(p=>p.x))+.16,bottom:Math.max(...points.map(p=>p.y))+.16};
   });
   const area=bounds.reduce((a,b)=>a+(b.right-b.x)*(b.bottom-b.y),0),scale=Math.floor(Math.min(400,Math.sqrt(192*1024*1024*.98/(4*area))));
   const target=document.createElement('canvas'),context=target.getContext('2d');
   try{
    for(let i=0;i<count;i++){
     if(cancel())return false;
     const b=bounds[i],{time,ref}=b,width=Math.ceil((b.right-b.x)*scale),height=Math.ceil((b.bottom-b.y)*scale);
     target.width=width;target.height=height;
     const ghost=Object.fromEntries(Object.entries(ref).map(([j,p])=>[j,{x:(p.x-b.x)*scale,y:(p.y-b.y)*scale}]));
     this.draw(context,{id,time,yaw,gender,facing,ghost,width,height,opacity:1,maxWidth:width,dynamicCycle:true});
     frames.push(await createImageBitmap(target));placements.push(ghost[23]);onProgress((i+1)/count);
     if(i%2===1)await new Promise(r=>setTimeout(r,0));
    }
    if(cancel())return false;
    cycle={key,frames,placements,duration,scale};return true;
   }finally{preparing=false;if(cycle?.frames!==frames)frames.forEach(f=>f.close());}
  },
  draw(ctx,{id,index=0,time=rowingCheckpoints[id][index].time,facing=1,yaw=0,ghost,width,height,gender='male',opacity=.46,maxFps=Infinity,maxWidth=1280,dynamicCycle=false,usePrepared=false}){
   if(usePrepared&&!preparing&&dynamicCycle&&cycle?.key===cycleKey(id,yaw,gender,facing)){
    const t=((time%cycle.duration)+cycle.duration)%cycle.duration,i=Math.floor(t/cycle.duration*cycle.frames.length)%cycle.frames.length;
    const ref=dynamicReferenceAt(id,time,facing,yaw),[a,b]=[[11,23],[11,12],[11,13],[12,14],[23,27]].find(([a,b])=>Math.hypot(ref[a].x-ref[b].x,ref[a].y-ref[b].y)>.09);
    const scale=Math.hypot(ghost[a].x-ghost[b].x,ghost[a].y-ghost[b].y)/Math.hypot(ref[a].x-ref[b].x,ref[a].y-ref[b].y),ratio=scale/cycle.scale;
    const image=cycle.frames[i],anchor=cycle.placements[i];
    ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(image,ghost[23].x-anchor.x*ratio,ghost[23].y-anchor.y*ratio,image.width*ratio,image.height*ratio);ctx.restore();
    const rendered=i!==lastCycleIndex;lastCycleIndex=i;return {gender,meshes:0,rendered,cached:true,sourceWidth:image.width,sourceHeight:image.height};
   }
   let rendered=false;const now=performance.now();
   if(!lastRender||w!==width||h!==height||genderKey!==gender||now-lastRenderAt>=1000/maxFps){
   select(id,time,gender,dynamicCycle);
   const renderWidth=Math.min(width,maxWidth),renderHeight=Math.round(height*Math.min(1,maxWidth/width));
   if(w!==width||h!==height||renderer.domElement.width!==renderWidth){w=width;h=height;renderer.setSize(renderWidth,renderHeight,false);camera.right=width;camera.top=height;camera.updateProjectionMatrix();}
   const ref=dynamicCycle?dynamicReferenceAt(id,time,facing,yaw):rowingReferenceAt(id,time,facing,yaw);
   const pairs=[[11,23],[11,12],[11,13],[12,14],[23,27]];
   const [a,b]=pairs.find(([a,b])=>Math.hypot(ref[a].x-ref[b].x,ref[a].y-ref[b].y)>.09);
   const scale=Math.hypot(ghost[a].x-ghost[b].x,ghost[a].y-ghost[b].y)/Math.hypot(ref[a].x-ref[b].x,ref[a].y-ref[b].y);
   root.scale.set(facing*scale,scale,scale);root.rotation.y=yaw;
   root.position.set(ghost[a].x-ref[a].x*scale,height-ghost[a].y+ref[a].y*scale,0);
   const renderKey=`${lastKey}:${yaw}:${facing}:${scale}:${root.position.x}:${root.position.y}:${width}:${height}:${renderWidth}`;
   if(renderKey!==lastRender){
    renderer.render(scene,camera);
    if(surface.width!==renderWidth)surface.width=renderWidth;if(surface.height!==renderHeight)surface.height=renderHeight;
    surfaceContext.clearRect(0,0,renderWidth,renderHeight);surfaceContext.drawImage(renderer.domElement,0,0);
    lastRender=renderKey;rendered=true;
   }lastRenderAt=now;
   }
   ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(surface,0,0,width,height);ctx.restore();
   return {gender:genderKey,meshes:renderer.info.render.triangles,rendered};
  },
  preparedInfo(){return cycle?{frames:cycle.frames.length,pixelsPerMeter:cycle.scale,bytes:cycle.frames.reduce((n,f)=>n+f.width*f.height*4,0),minHeight:Math.min(...cycle.frames.map(f=>f.height))}:null;},
  dispose(){
   clearCycle();
   const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();models.clear();
  },
 };
}
