// Contoured surfaces follow the existing measured joints; animation data stays untouched.
export function createAthleteModel(THREE, {body, skin}) {
 const root=new THREE.Group();root.name='athlete';
 const fabric=new THREE.MeshStandardMaterial({color:0x56694e,roughness:.9});
 const trim=new THREE.MeshStandardMaterial({color:0xcbd2bf,roughness:.85});
 const shoe=new THREE.MeshStandardMaterial({color:0xe8e5d9,roughness:.85});
 const sole=new THREE.MeshStandardMaterial({color:0xa4ac9a,roughness:.95});
 const hair=new THREE.MeshStandardMaterial({color:0x354039,roughness:1});
 const face=new THREE.MeshStandardMaterial({color:0x4b5549,roughness:.8});
 const matrix=new THREE.Matrix4();
 const v=()=>new THREE.Vector3();

 // Cubic interpolation gives a sculpted silhouette instead of stacked cones.
 function profileGeometry(profile,rows=48,segments=40) {
  const positions=[],indices=[];
  for(let row=0;row<=rows;row++){
   const t=row/rows;let k=0;while(k<profile.length-2&&t>profile[k+1][0])k++;
   const p=profile[k],q=profile[k+1],u=(t-p[0])/(q[0]-p[0]);
   const radius=axis=>{
    const prev=profile[Math.max(0,k-1)],next=profile[Math.min(profile.length-1,k+2)];
    const m0=(q[axis]-prev[axis])/(q[0]-prev[0])*(q[0]-p[0]);
    const m1=(next[axis]-p[axis])/(next[0]-p[0])*(q[0]-p[0]);
    return Math.max(.0001,(2*u**3-3*u*u+1)*p[axis]+(u**3-2*u*u+u)*m0+(-2*u**3+3*u*u)*q[axis]+(u**3-u*u)*m1);
   };
   const rx=radius(1),rz=radius(2);
   for(let j=0;j<=segments;j++){
    const a=j/segments*Math.PI*2;positions.push(rx*Math.cos(a),t,rz*Math.sin(a));
    if(row<rows&&j<segments){const i=row*(segments+1)+j;indices.push(i,i+segments+1,i+1,i+1,i+segments+1,i+segments+2);}
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
 }
 function mesh(geometry,material,parent=root){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function volume(parent,material,position,scale){const m=mesh(new THREE.SphereGeometry(1,32,24),material,parent);m.position.set(...position);m.scale.set(...scale);return m;}
 function surface(profile,material,parent=root){return mesh(profileGeometry(profile),material,parent);}
 function segment(a,b,m,forward){
  const y=b.clone().sub(a),length=y.length();y.normalize();
  const z=forward.clone().addScaledVector(y,-forward.dot(y));
  if(z.lengthSq()<1e-8)z.set(0,0,1).addScaledVector(y,-y.z);
  if(z.lengthSq()<1e-8)z.set(1,0,0).addScaledVector(y,-y.x);
  z.normalize();const x=v().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
  m.position.copy(a);m.quaternion.setFromRotationMatrix(matrix.makeBasis(x,y,z));m.scale.y=length;
 }
 const torso=surface([[0,.16,.105],[.12,.175,.115],[.30,.146,.098],[.50,.163,.112],[.73,.205,.127],[.88,.221,.115],[.96,.181,.094],[1,.064,.058]],body);
 // A separate pelvis volume overlaps the waist and follows hip rotation.
 const pelvis=surface([[0,.002,.002],[.12,.119,.079],[.35,.174,.113],[.64,.181,.12],[.90,.162,.106],[1,.153,.10]],fabric);
 const neck=surface([[0,.065,.059],[.25,.059,.055],[.75,.048,.046],[1,.059,.052]],skin);
 const head=new THREE.Group();root.add(head);
 const skull=surface([[0,.025,.035],[.06,.052,.063],[.19,.078,.079],[.40,.092,.09],[.64,.096,.093],[.83,.085,.083],[.96,.049,.052],[1,.001,.001]],skin,head);
 skull.position.y=-.115;skull.scale.y=.27;
 for(const side of [-1,1]){
  volume(head,skin,[side*.094,.015,0],[.018,.029,.015]);
  volume(head,trim,[side*.102,.015,.009],[.007,.017,.005]);
  volume(head,face,[side*.037,.035,.085],[.013,.005,.004]);
  const brow=volume(head,hair,[side*.037,.054,.083],[.019,.003,.005]);brow.rotation.z=-side*.08;
  volume(head,skin,[side*.043,-.010,.070],[.031,.025,.010]);
 }
 volume(head,skin,[0,.006,.090],[.012,.022,.019]);
 volume(head,face,[0,-.054,.079],[.023,.0025,.003]);
 const hairCap=surface([[0,.092,.087],[.23,.096,.093],[.54,.083,.084],[.83,.050,.055],[1,.001,.001]],hair,head);hairCap.position.y=.068;hairCap.scale.y=.094;
 // Raglan sleeves cover the deltoid; forearms narrow naturally into the wrists.
 const armProfile=[[0,.048,.048],[.06,.071,.069],[.22,.073,.067],[.48,.062,.061],[.76,.047,.046],[1,.038,.039]];
 const forearmProfile=[[0,.039,.040],[.16,.051,.047],[.38,.050,.042],[.66,.037,.033],[.88,.027,.025],[1,.025,.024]];
 const thighProfile=[[0,.083,.091],[.14,.097,.103],[.40,.092,.098],[.68,.075,.077],[.90,.057,.057],[1,.052,.052]];
 const calfProfile=[[0,.051,.052],[.15,.055,.059],[.36,.064,.070],[.56,.056,.057],[.81,.035,.036],[1,.029,.030]];
 const limbs=[0,1].map(()=>({
  upper:surface(armProfile,skin),sleeve:surface([[0,.050,.050],[.10,.077,.075],[.38,.079,.074],[.82,.071,.066],[1,.069,.064]],body),
  lower:surface(forearmProfile,skin),thigh:surface(thighProfile,fabric),calf:surface(calfProfile,fabric),
  elbow:volume(root,skin,[0,0,0],[.040,.040,.040]),knee:volume(root,fabric,[0,0,0],[.053,.055,.053]),
  foot:new THREE.Group(),
 }));
 for(const limb of limbs){
  root.add(limb.foot);
  volume(limb.foot,sole,[0,-.047,.053],[.058,.022,.134]);
  volume(limb.foot,shoe,[0,-.020,.048],[.056,.039,.127]);
  volume(limb.foot,fabric,[0,.006,-.018],[.038,.042,.054]);
  for(let i=0;i<4;i++){const lace=volume(limb.foot,trim,[0,.015-i*.004,.032+i*.017],[.030,.0035,.0035]);lace.rotation.y=i%2?.13:-.13;}
 }
 const shoulder=v(),hip=v(),axis=v(),lateral=v(),forward=v();
 return {root,update(coords,sample,anchors){
  shoulder.copy(coords[0]).add(coords[1]).multiplyScalar(.5);hip.copy(coords[6]).add(coords[7]).multiplyScalar(.5);
  axis.copy(shoulder).sub(hip).normalize();lateral.copy(coords[1]).sub(coords[0]).normalize();forward.crossVectors(lateral,axis).normalize();lateral.crossVectors(axis,forward).normalize();
  const width=coords[0].distanceTo(coords[1])/.42;
  const top=shoulder.clone().addScaledVector(axis,.065),bottom=hip.clone().addScaledVector(axis,-.01);
  segment(bottom,top,torso,forward);torso.scale.x=width;torso.scale.z=Math.min(1.15,Math.max(.8,width));
  pelvis.position.copy(hip).addScaledVector(axis,-.115);pelvis.quaternion.copy(anchors.pelvis.quaternion);pelvis.scale.set(coords[6].distanceTo(coords[7])/.28,.23,1);
  head.position.copy(anchors.head.position);head.quaternion.copy(anchors.head.quaternion);
  const neckTop=head.position.clone().add(new THREE.Vector3(0,-.09,0).applyQuaternion(head.quaternion));segment(shoulder,neckTop,neck,forward);
  limbs.forEach((part,i)=>{
   segment(coords[i],coords[i+2],part.upper,forward);
   const sleeveEnd=coords[i].clone().lerp(coords[i+2],.44);segment(coords[i],sleeveEnd,part.sleeve,forward);
   segment(coords[i+2],coords[i+4],part.lower,forward);
   segment(coords[i+6],coords[i+8],part.thigh,forward);segment(coords[i+8],coords[i+10],part.calf,forward);
   part.elbow.position.copy(coords[i+2]);part.knee.position.copy(coords[i+8]);
   part.foot.position.copy(coords[i+10]);part.foot.quaternion.copy(anchors.feet[i].quaternion);
  });
 }};
}
