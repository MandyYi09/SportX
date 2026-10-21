// One connected surface from the neckline through a rounded hip bend to both hems.
export function createYogaGarment(THREE,material){
 const segments=48,legRows=20,bodyRows=64,vertices=[],indices=[],legs=[[],[]],seam=new Map();
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
 const body=[Array.from({length:segments},(_,j)=>legs[Math.cos(j/segments*Math.PI*2)<0?0:1][0][j])];
 for(let row=1;row<=bodyRows;row++){
  body[row]=[];
  for(let j=0;j<segments;j++){
   body[row][j]=vertices.length;vertices.push({body:true,row,a:j/segments*Math.PI*2});
  }
  for(let j=0;j<segments;j++){
   const k=(j+1)%segments,a=body[row-1][j],b=body[row-1][k],c=body[row][j],d=body[row][k];
   indices.push(a,c,b,b,c,d);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(vertices.length*3),3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const root=new THREE.Mesh(geometry,material);root.name='continuous-yoga-outfit';root.castShadow=root.receiveShadow=true;root.visible=false;
 const widthKeys=[[0,.18,.12],[.30,.16,.108],[.52,.157,.108],[.76,.210,.128],[.89,.214,.128],[.96,.207,.120],[1,.20,.115]];
 function radius(t){let i=0;while(i<widthKeys.length-2&&t>widthKeys[i+1][0])i++;const p=widthKeys[i],q=widthKeys[i+1],u=THREE.MathUtils.smoothstep(t,p[0],q[0]);return [p[1]+(q[1]-p[1])*u,p[2]+(q[2]-p[2])*u];}
 return {root,update(coords){
  const hip=coords[6].clone().add(coords[7]).multiplyScalar(.5),shoulder=coords[0].clone().add(coords[1]).multiplyScalar(.5);
  const axis=shoulder.clone().sub(hip).normalize(),lateral=coords[1].clone().sub(coords[0]).normalize();
  lateral.addScaledVector(axis,-axis.dot(lateral)).normalize();
  const down=coords[8].clone().add(coords[9]).multiplyScalar(.5).sub(hip).normalize(),up=down.clone().negate();
  const pelvisX=lateral.clone().addScaledVector(up,-lateral.dot(up)).normalize(),pelvisZ=new THREE.Vector3().crossVectors(pelvisX,up).normalize();
  const waist=hip.clone().addScaledVector(down,.16),bendEnd=hip.clone().addScaledVector(axis,.20),top=shoulder.clone().addScaledVector(axis,.065),width=coords[0].distanceTo(coords[1])/.42;
  const frames=[0,1].map(side=>{const y=coords[6+side].clone().sub(coords[8+side]).normalize(),x=lateral.clone().addScaledVector(y,-lateral.dot(y)).normalize();return {x,z:new THREE.Vector3().crossVectors(x,y).normalize()};});
  const point=new THREE.Vector3();
  vertices.forEach((vertex,id)=>{
   const {a,row,side,inner}=vertex,c=Math.cos(a),s=Math.sin(a);
   if(vertex.body){
    const x=Math.abs(c),edge=Math.min(.985,.76+.10*(1-x)+.19*Math.exp(-(((x-.62)/.25)**2))+(s<0?.035:0)),t=row/bodyRows*edge;
    let center,tangent;
    if(t<.30){const u=t/.30;center=waist.clone().multiplyScalar((1-u)**2).addScaledVector(hip,2*u*(1-u)).addScaledVector(bendEnd,u*u);tangent=hip.clone().sub(waist).multiplyScalar(1-u).addScaledVector(bendEnd.clone().sub(hip),u).normalize();}
    else {const u=(t-.30)/.70;center=bendEnd.clone().lerp(top,u);tangent=axis;}
    const bx=lateral.clone().addScaledVector(tangent,-lateral.dot(tangent)).normalize(),bz=new THREE.Vector3().crossVectors(bx,tangent).normalize(),r=radius(t);
    point.copy(center).addScaledVector(bx,c*r[0]*width).addScaledVector(bz,s*r[1]);
   }else{
    const saddle=Math.abs(s)**12;
    const start=waist.clone().addScaledVector(pelvisX,inner?0:.18*width*c).addScaledVector(pelvisZ,.12*s).addScaledVector(down,inner?.07*(1-saddle):0);
    const t=row/legRows,along=.32+t*.23,r=.087-t*.006;
    const end=coords[6+side].clone().lerp(coords[8+side],along).addScaledVector(frames[side].x,c*r).addScaledVector(frames[side].z,s*(r+.008));
    point.copy(start).lerp(end,THREE.MathUtils.smoothstep(t,0,.35));
   }
   geometry.attributes.position.setXYZ(id,point.x,point.y,point.z);
  });
  geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 }};
}
