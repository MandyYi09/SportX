import * as THREE from './vendor/three.module.js';
import {createAthleteModel} from './athlete-model.mjs';
import {sampleCapturedMotion} from './captured-motion.mjs';
import {createWrappedHand,placeTennisHand} from './tennis-hand.mjs';
import {rowingGrip} from './equipment-grip.mjs';
import {rowingCheckpoints,rowingReference,rowingIds} from './rowing-correction.mjs';

// Render the existing clothed athlete into a transparent layer, then composite once.
// Whole-layer alpha avoids making back-facing body surfaces show through the skin.
export function createRowingExpertOverlay(){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 renderer.setClearColor(0x000000,0);renderer.setPixelRatio(1);
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
 scene.add(new THREE.HemisphereLight(0xffffff,0x7992a4,2.6));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-3,5,6);scene.add(light);
 const camera=new THREE.OrthographicCamera(0,960,540,0,.1,20000);camera.position.set(0,0,10000);camera.lookAt(0,0,0);
 const models=new Map();let model,genderKey,lastKey='',sample,w=0,h=0;
 const anchors={head:new THREE.Object3D(),pelvis:new THREE.Object3D(),feet:[new THREE.Object3D(),new THREE.Object3D()]};
 function select(id,index,gender){
  const key=`${id}:${index}:${gender}`;if(lastKey===key)return;lastKey=key;
  if(!models.has(gender)){
   const athlete=createAthleteModel(THREE,{body:new THREE.MeshStandardMaterial({color:0xc72032}),skin:new THREE.MeshStandardMaterial({color:0xae805f}),gender});
   const material=new THREE.MeshStandardMaterial({color:0xae805f,roughness:.8});
   const hands=[-1,1].map(side=>createWrappedHand(THREE,material,side,rowingGrip));hands.forEach(hand=>athlete.root.add(hand.root));
   models.set(gender,{athlete,hands});root.add(athlete.root);
  }
  model=models.get(gender);genderKey=gender;
  for(const[g,m]of models)m.athlete.root.visible=g===gender;
  sample=sampleCapturedMotion(id,rowingCheckpoints[id][index].time);
  const coords=sample.coords.map(p=>new THREE.Vector3(...p));
  anchors.head.position.fromArray(sample.headPosition);anchors.head.quaternion.fromArray(sample.headRotation);
  anchors.pelvis.quaternion.fromArray(sample.pelvisRotation);
  anchors.feet.forEach((foot,i)=>{const toe=new THREE.Vector3(...sample.toePositions[i]);foot.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),toe.sub(coords[10+i]).normalize());});
  model.athlete.setSport('rowing',id);model.athlete.update(coords,sample,anchors);
  model.hands.forEach((hand,i)=>placeTennisHand(THREE,hand,sample.equipmentHands[i]));
 }
 return {
  draw(ctx,{id,index,facing=1,yaw=0,ghost,width,height,gender='male',opacity=.46}){
   select(id,index,gender);
   if(w!==width||h!==height){w=width;h=height;renderer.setSize(Math.min(width,1280),Math.round(height*Math.min(1,1280/width)),false);camera.right=width;camera.top=height;camera.updateProjectionMatrix();}
   const ref=rowingReference(id,index,facing,yaw);
   const pairs=[[11,23],[11,12],[11,13],[12,14],[23,27]];
   const [a,b]=pairs.find(([a,b])=>Math.hypot(ref[a].x-ref[b].x,ref[a].y-ref[b].y)>.09);
   const scale=Math.hypot(ghost[a].x-ghost[b].x,ghost[a].y-ghost[b].y)/Math.hypot(ref[a].x-ref[b].x,ref[a].y-ref[b].y);
   root.scale.set(facing*scale,scale,scale);root.rotation.y=yaw;
   root.position.set(ghost[a].x-ref[a].x*scale,height-ghost[a].y+ref[a].y*scale,0);
   renderer.render(scene,camera);
   ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(renderer.domElement,0,0,width,height);ctx.restore();
   return {gender:genderKey,meshes:renderer.info.render.triangles};
  },
  dispose(){
   const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
   geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();models.clear();
  },
 };
}
