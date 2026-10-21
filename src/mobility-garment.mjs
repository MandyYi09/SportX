import {createWellnessPants} from './wellness-pants.mjs';
// A welded waist/crotch and two continuous trouser legs. The shirt shares the
// waistband vertices, so side bends cannot pull open a gap between separate shells.
export function createMobilityGarment(THREE,shirt,pants,{female=false}={}){
 if(female)return createWellnessPants(THREE,[pants,shirt,shirt],{upperBody:'casual',waistHeight:.07,waistRadius:.145,name:'continuous-mobility-outfit'});
 const segments=48,legRows=48,bodyRows=48,vertices=[],indices=[],legs=[[],[]],seam=new Map();
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
 const pantsCount=indices.length;
 const body=[Array.from({length:segments},(_,j)=>legs[Math.cos(j/segments*Math.PI*2)<0?0:1][0][j])];
 for(let row=1;row<=bodyRows;row++){
  body[row]=[];
  for(let j=0;j<segments;j++){body[row][j]=vertices.length;vertices.push({body:true,row,a:j/segments*Math.PI*2});}
  for(let j=0;j<segments;j++){
   const k=(j+1)%segments,a=body[row-1][j],b=body[row-1][k],c=body[row][j],d=body[row][k];
   indices.push(a,c,b,b,c,d);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(vertices.length*3),3));geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.addGroup(0,pantsCount,1);geometry.addGroup(pantsCount,indices.length-pantsCount,0);
 const root=new THREE.Mesh(geometry,[shirt,pants]);root.name='continuous-mobility-outfit';root.castShadow=root.receiveShadow=true;root.visible=false;
 const v=()=>new THREE.Vector3(),point=v();
 function frame(up,front){
  const z=front.clone().addScaledVector(up,-front.dot(up));
  if(z.lengthSq()<1e-8)z.set(0,1,0).addScaledVector(up,-up.y);
  z.normalize();return {x:up.clone().cross(z).normalize(),z};
 }
 return {root,update(coords){
  const hip=coords[6].clone().add(coords[7]).multiplyScalar(.5),shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5);
  const axis=shoulder.clone().sub(hip).normalize(),lateral=coords[1].clone().sub(coords[0]).normalize();
  lateral.addScaledVector(axis,-axis.dot(lateral)).normalize();
  const pelvisX=coords[7].clone().sub(coords[6]).normalize(),pelvisUp=new THREE.Vector3(0,1,0).addScaledVector(pelvisX,-pelvisX.y).normalize();
  const pelvisFront=pelvisX.clone().cross(pelvisUp).normalize(),front=lateral.clone().cross(axis).normalize();
  const width=coords[0].distanceTo(coords[1])/.46*(female?.94:1),waist=hip.clone().addScaledVector(pelvisUp,.04);
  const bendEnd=hip.clone().addScaledVector(axis,.20),top=shoulder.clone().addScaledVector(axis,.065);
  const frames=[0,1].map(side=>({thigh:frame(coords[6+side].clone().sub(coords[8+side]).normalize(),pelvisFront),shin:frame(coords[8+side].clone().sub(coords[10+side]).normalize(),pelvisFront)}));
  vertices.forEach(({body,row,side,a,inner},id)=>{
   const c=Math.cos(a),s=Math.sin(a);
   if(body){
    const t=row/bodyRows;
    let center,tangent;
    if(t<.3){const u=t/.3;center=waist.clone().multiplyScalar((1-u)**2).addScaledVector(hip.clone().addScaledVector(pelvisUp,.10),2*u*(1-u)).addScaledVector(bendEnd,u*u);tangent=pelvisUp.clone().lerp(axis,u).normalize();}
    else{center=bendEnd.clone().lerp(top,(t-.3)/.7);tangent=axis;}
    const f=frame(tangent,front),shoulderRadius=.17+.035*THREE.MathUtils.smoothstep(t,.3,.82);
    const neckline=THREE.MathUtils.smoothstep(t,.93,1),rx=(shoulderRadius*(1-neckline)+.063*neckline)*width,rz=(.12+.008*Math.sin(t*Math.PI))*(1-neckline)+.056*neckline;
    point.copy(center).addScaledVector(f.x,c*rx).addScaledVector(f.z,s*rz);
   }else{
    const f=frames[side],t=row/legRows;
    const start=waist.clone().addScaledVector(pelvisX,inner?0:.17*width*c).addScaledVector(pelvisFront,.12*s).addScaledVector(pelvisUp,inner?-.14*(1-Math.abs(s)**4):0);
    if(t<=.20){
     const ring=coords[6+side].clone().lerp(coords[8+side],.30).addScaledVector(f.thigh.x,c*.086*width).addScaledVector(f.thigh.z,s*.095);
     point.copy(start).lerp(ring,THREE.MathUtils.smoothstep(t,0,.20));
    }else if(t<=.56){
     const u=(t-.20)/.36,along=.30+.70*u,rx=(.086-.034*u)*width,rz=.095-.04*u;
     point.copy(coords[6+side]).lerp(coords[8+side],along).addScaledVector(f.thigh.x,c*rx).addScaledVector(f.thigh.z,s*rz);
    }else{
     const u=(t-.56)/.44,blend=THREE.MathUtils.smoothstep(u,0,.22),x=f.thigh.x.clone().lerp(f.shin.x,blend).normalize(),z=f.thigh.z.clone().lerp(f.shin.z,blend).normalize();
     const radius=(.052+.008*Math.sin(u*Math.PI)-.023*u)*width;
     point.copy(coords[8+side]).lerp(coords[10+side],u).addScaledVector(x,c*radius).addScaledVector(z,s*(radius+.003));
    }
   }
   geometry.attributes.position.setXYZ(id,point.x,point.y,point.z);
  });
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }};
}
