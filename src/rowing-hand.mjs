import {rowingHandSurface} from './rowing-hand-surface.mjs';
// Sculling-specific grasp. Local Y is the shaft, with the butt at -buttOffset.
// A continuous wrist/palm shell and tapered digits replace detached ring fingers.
export function createRowingHand(THREE,material,side,spec){
 const root=new THREE.Group();root.name='rowing-anatomical-hand';
 const digits=[];
 function digit(name,points,radii,width=1,finger=false){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',finger?.12:.5);
  const steps=64,samples=[];
  for(let j=0;j<=steps;j++){
   const t=j/steps,center=curve.getPoint(t);
   const f=Math.min(t/.90,1)*(radii.length-2),a=Math.min(radii.length-3,Math.floor(f));
   let r=THREE.MathUtils.lerp(radii[a],radii[a+1],f-a);
   if(finger){
    // Phalange shafts narrow between PIP/DIP joints; the pads are flattened.
    const profile=[[0,1.12],[.16,1.06],[.30,.86],[.40,1.02],[.48,.86],[.61,.76],[.70,.89],[.78,.76],[.90,.72],[1,.72]];
    let n=0;while(n<profile.length-2&&t>profile[n+1][0])n++;
    const [a,ra]=profile[n],[b,rb]=profile[n+1];
    r=radii[0]*THREE.MathUtils.lerp(ra,rb,(t-a)/(b-a));
   }
   if(t>.90)r*=Math.sqrt(Math.max(0,1-((t-.90)/.10)**2));
   if(j%4===0)samples.push({point:center.toArray(),radius:r});

  }
  const segments=samples.slice(1).map((b,i)=>{const a=samples[i],d=b.point.map((v,j)=>v-a.point[j]);return {a:a.point,d,length2:d.reduce((s,v)=>s+v*v,0),r0:a.radius,r1:b.radius};});
  digits.push({segments,width,depth:finger?.76:1,finger});
  if(finger){
   const t=.81,center=curve.getPoint(t),along=curve.getTangent(t).normalize();
   const lateral=new THREE.Vector3(0,1,0).addScaledVector(along,-along.y).normalize();
   const outward=new THREE.Vector3().crossVectors(lateral,along).normalize();
   if(outward.dot(new THREE.Vector3(center.x,0,center.z))<0)outward.negate();
   const nailMaterial=material.clone();nailMaterial.color.lerp(new THREE.Color('#dfbca6'),.36);nailMaterial.roughness=.65;
   const nail=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),nailMaterial);
   nail.name=name+'-nail';nail.scale.set(radii[0]*.52,.0045,.0008);
   nail.position.copy(center).addScaledVector(outward,radii[0]*.55);
   const normal=new THREE.Vector3().crossVectors(lateral,along).normalize();
   nail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(lateral,along,normal));root.add(nail);
  }
 }
 // Fingers emerge from the knuckles, bend over the grip, then tuck underneath.
 // Different lengths/radii keep a readable index-to-little-finger silhouette.
 for(const [i,y]of [-.028,-.009,.011,.026].entries()){
  const r=spec.radius+.007,tipAngle=[-.45,-.78,-.65,-.12][i];
  const spread=[-.001,0,.001,.002][i],base=[-.039,-.035,-.037,-.029][i];
  // MCP to proximal shaft, PIP bend, middle shaft, DIP bend, distal pad.
  const points=[[base,y,side*.012],[-.025,y,side*.027],[-.012,y+spread,side*.031],[.009,y+spread,side*.032],[.026,y+spread,side*.022],[r,y+spread,side*.004],[r*Math.cos(tipAngle),y+spread,side*r*Math.sin(tipAngle)]];
  const size=[.010,.0105,.0098,.0083][i];
  digit(['index','middle','ring','little'][i],points,[size,size,0],1.03,true);
 }
 // Thenar mound joins the thumb to the palm. Its pad lies on the butt face.
 digit('thumb',[
  [-.058,-.014,side*.008],[-.049,-.030,side*.017],[-.030,-.046,side*.027],[-.017,-spec.buttOffset-.009,side*.018],[-.003,-spec.buttOffset-.010,side*.004],[.005,-spec.buttOffset-.010,0]
 ],[.013,.012,.011,.010,.009,0],.95);
 const skin=rowingHandSurface(THREE,side,spec,digits).clone();
 const skinMesh=new THREE.Mesh(skin,material);skinMesh.name='continuous-hand-skin';root.add(skinMesh);
 root.userData.thumbContact=[0,-spec.buttOffset,0];
 // Bend only the wrist transition toward the actual incoming forearm.
 const basePositions=skin.attributes.position.array.slice(),baseNormals=skin.attributes.normal.array.slice();
 const wrist=new THREE.Vector3(...spec.wrist),axis=new THREE.Vector3(-1,0,0),last=new THREE.Vector3();
 function setForearm(frame){
  if(!frame.forearm)return;
  const d=new THREE.Vector3(...frame.forearm);
  const local=new THREE.Vector3(d.dot(new THREE.Vector3(...frame.x)),d.dot(new THREE.Vector3(...frame.y)),d.dot(new THREE.Vector3(...frame.z))*(frame.mirrored?-1:1)).normalize();
  if(local.distanceToSquared(last)<1e-10)return;last.copy(local);
  const rotation=new THREE.Quaternion().setFromUnitVectors(axis,local),q=new THREE.Quaternion(),p=new THREE.Vector3(),n=new THREE.Vector3();
  for(let i=0;i<basePositions.length;i+=3){
   const t=THREE.MathUtils.clamp((-.065-basePositions[i])/.020,0,1);if(t===0)continue;
   q.identity().slerp(rotation,t*t*(3-2*t));
   p.fromArray(basePositions,i).sub(wrist).applyQuaternion(q).add(wrist);n.fromArray(baseNormals,i).applyQuaternion(q);
   skin.attributes.position.setXYZ(i/3,p.x,p.y,p.z);skin.attributes.normal.setXYZ(i/3,n.x,n.y,n.z);
  }
  skin.attributes.position.needsUpdate=skin.attributes.normal.needsUpdate=true;skin.computeBoundingSphere();
 }
 return {root,setForearm};
}
