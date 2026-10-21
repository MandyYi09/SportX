// A circular waistband and a rounded pelvis precede the leg split. The groin
// saddle is below the hips, rather than forming a V at the top of the trousers.
export function createWellnessPants(THREE,material,{waistHeight=.14,waistRadius=.151,upperBody=null,name='wellness-leggings'}={}){
 const segments=48,pelvisRows=20,legRows=48,vertices=[],indices=[],legs=[[],[]],seam=new Map();
 for(let side=0;side<2;side++)for(let row=0;row<=legRows;row++){
  legs[side][row]=[];
  for(let j=0;j<segments;j++){
   const a=j/segments*Math.PI*2,inner=(side===0?-1:1)*Math.cos(a)<-1e-8;
   const key=row===0&&(inner||Math.abs(Math.cos(a))<1e-8)?Math.sin(a).toFixed(6):null;
   let id=key===null?undefined:seam.get(key);
   if(id===undefined){id=vertices.length;vertices.push({side,row,a,inner});if(key!==null)seam.set(key,id);}
   legs[side][row][j]=id;
  }
 }
 for(let side=0;side<2;side++)for(let row=0;row<legRows;row++)for(let j=0;j<segments;j++){
  const k=(j+1)%segments,a=legs[side][row][j],b=legs[side][row][k],c=legs[side][row+1][j],d=legs[side][row+1][k];
  indices.push(a,b,c,b,d,c);
 }
 const pelvis=[Array.from({length:segments},(_,j)=>legs[Math.cos(j/segments*Math.PI*2)<0?0:1][0][j])];
 for(let row=1;row<=pelvisRows;row++){
  pelvis[row]=[];
  for(let j=0;j<segments;j++){pelvis[row][j]=vertices.length;vertices.push({pelvis:true,row,a:j/segments*Math.PI*2});}
  for(let j=0;j<segments;j++){
   const k=(j+1)%segments,a=pelvis[row-1][j],b=pelvis[row-1][k],c=pelvis[row][j],d=pelvis[row][k];
   indices.push(a,c,b,b,c,d);
  }
 }
 const lowerCount=indices.length,bodyRows=56,body=[pelvis[pelvisRows]];
 const groups=[{start:0,count:lowerCount,materialIndex:0}];
 if(upperBody)for(let row=1;row<=bodyRows;row++){
  body[row]=[];for(let j=0;j<segments;j++){body[row][j]=vertices.length;vertices.push({body:true,row,a:j/segments*Math.PI*2});}
  const start=indices.length;
  for(let j=0;j<segments;j++){const k=(j+1)%segments,a=body[row-1][j],b=body[row-1][k],c=body[row][j],d=body[row][k];indices.push(a,c,b,b,c,d);}
  groups.push({start,count:indices.length-start,materialIndex:upperBody==='yoga'&&row/bodyRows<=.25?1:2});
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(vertices.length*3),3));geometry.setIndex(indices);geometry.computeVertexNormals();
 if(upperBody)for(const group of groups)geometry.addGroup(group.start,group.count,group.materialIndex);
 const root=new THREE.Mesh(geometry,material);root.name=name;root.visible=false;root.castShadow=root.receiveShadow=true;
 function frame(up,front){
  const z=front.clone().addScaledVector(up,-front.dot(up));
  if(z.lengthSq()<1e-8)z.set(0,1,0).addScaledVector(up,-up.y);
  z.normalize();return {x:up.clone().cross(z).normalize(),z};
 }
 const point=new THREE.Vector3();
 return {root,update(coords){
  const hip=coords[6].clone().add(coords[7]).multiplyScalar(.5),shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5);
  const axis=shoulder.clone().sub(hip).normalize(),lateral=coords[7].clone().sub(coords[6]).normalize();
  const down=coords[8].clone().add(coords[9]).multiplyScalar(.5).sub(hip).normalize();
  const up=axis.clone().multiplyScalar(.65).addScaledVector(down,-.35).normalize();up.addScaledVector(lateral,-up.dot(lateral)).normalize();
  const front=lateral.clone().cross(up).normalize(),width=coords[6].distanceTo(coords[7])/.2304;
  const frames=[0,1].map(side=>({thigh:frame(coords[6+side].clone().sub(coords[8+side]).normalize(),front),shin:frame(coords[8+side].clone().sub(coords[10+side]).normalize(),front)}));
  const waist=hip.clone().addScaledVector(up,waistHeight),top=shoulder.clone().addScaledVector(axis,.065),height=waist.distanceTo(top);
  const torsoFront=coords[1].clone().sub(coords[0]).cross(axis).normalize();
  const profile=[[0,waistRadius,.106],[.20,.130,.094],[.40,.142,.103],[.65,.169,.125],[.83,.178,.112],[.91,.180,.100],[.97,.109,.065],[1,.052,.047]];
  function radius(t){let i=0;while(i<profile.length-2&&t>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],u=THREE.MathUtils.smoothstep(t,a[0],b[0]);return [a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];}
  vertices.forEach(({body,pelvis,row,side,a,inner},id)=>{
   const c=Math.cos(a),s=Math.sin(a);
   if(body){
    const t=row/bodyRows,t2=t*t,t3=t2*t;
    const center=waist.clone().multiplyScalar(2*t3-3*t2+1).addScaledVector(up,height*(t3-2*t2+t)).addScaledVector(top,-2*t3+3*t2).addScaledVector(axis,height*(t3-t2));
    const tangent=waist.clone().multiplyScalar(6*t2-6*t).addScaledVector(up,height*(3*t2-4*t+1)).addScaledVector(top,-6*t2+6*t).addScaledVector(axis,height*(3*t2-2*t)).normalize();
    const f=frame(tangent,front.clone().lerp(torsoFront,THREE.MathUtils.smoothstep(t,0,1))),r=radius(t);
    const chest=s>0?.012*Math.exp(-(((t-.66)/.16)**2))*s:0;
    point.copy(center).addScaledVector(f.x,c*r[0]*width).addScaledVector(f.z,s*r[1]+chest);
   }else if(pelvis){
    const t=row/pelvisRows,y=-.045+(.045+waistHeight)*t;
    const rx=(.208-(.208-waistRadius)*THREE.MathUtils.smoothstep(t,.20,1))*width,rz=.135-.029*THREE.MathUtils.smoothstep(t,.18,1);
    point.copy(hip).addScaledVector(up,y).addScaledVector(lateral,c*rx).addScaledVector(front,s*rz);
   }else{
    const t=row/legRows,f=frames[side];
    const start=hip.clone().addScaledVector(up,-.045-(inner?.075*(1-s*s):0)).addScaledVector(lateral,inner?0:.208*width*c).addScaledVector(front,.135*s);
    if(t<.20){
     const ring=coords[6+side].clone().lerp(coords[8+side],.22).addScaledVector(f.thigh.x,c*.090).addScaledVector(f.thigh.z,s*.096);
     const control=start.clone().lerp(ring,.5).addScaledVector(lateral,(side===0?-1:1)*Math.max(0,(side===0?-1:1)*c)*.012);
     const u=t/.20;point.copy(start).multiplyScalar((1-u)**2).addScaledVector(control,2*u*(1-u)).addScaledVector(ring,u*u);
    }else if(t<.56){
     const u=(t-.20)/.36,r=.090-.045*u;
     point.copy(coords[6+side]).lerp(coords[8+side],.22+.78*u).addScaledVector(f.thigh.x,c*r).addScaledVector(f.thigh.z,s*(r+.006*(1-u)));
    }else{
     const u=(t-.56)/.44,blend=THREE.MathUtils.smoothstep(u,0,.20),x=f.thigh.x.clone().lerp(f.shin.x,blend).normalize(),z=f.thigh.z.clone().lerp(f.shin.z,blend).normalize();
     const r=.045+.006*Math.sin(u*Math.PI)-.021*u;
     point.copy(coords[8+side]).lerp(coords[10+side],u).addScaledVector(x,c*r).addScaledVector(z,s*(r+.002));
    }
   }
   geometry.attributes.position.setXYZ(id,point.x,point.y,point.z);
  });
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }};
}
